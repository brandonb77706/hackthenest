import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutineInput } from "../routineInput";
import { TellBridge } from "./TellBridge";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const draft = (texts: string[], overrides: Partial<RoutineInput> = {}): RoutineInput => ({
  title: "Take medicine",
  goal: "take my medicine",
  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  start_time: "08:00",
  steps: texts.map((text) => ({ text, minutes: 2 })),
  ...overrides,
});

const ok = (routine: RoutineInput, supportLevel = "high") =>
  new Response(JSON.stringify({ routine, supportLevel }), { status: 200 });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const stepTexts = () => (screen.getAllByLabelText(/^Step \d+$/) as HTMLInputElement[]).map((i) => i.value);
const bodyOf = (call: number) => JSON.parse((fetchMock.mock.calls[call] as [string, RequestInit])[1].body as string);

describe("TellBridge", () => {
  it("drafts steps from what the person typed and opens them for review", async () => {
    fetchMock.mockResolvedValue(ok(draft(["Get your pill box", "Take your pill"])));
    const user = userEvent.setup();
    render(<TellBridge />);

    await user.type(screen.getByLabelText("What do you need to do?"), "take my medicine");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));

    expect(await screen.findByRole("heading", { name: "Check your steps" })).toBeInTheDocument();
    expect(stepTexts()).toEqual(["Get your pill box", "Take your pill"]);
    expect(fetchMock).toHaveBeenCalledWith("/api/routines/draft", expect.objectContaining({ method: "POST" }));
    expect(bodyOf(0)).toEqual({ goal: "take my medicine" });
  });

  it("asks for something before calling the AI", async () => {
    const user = userEvent.setup();
    render(<TellBridge />);
    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    expect(screen.getByText("Tell me what you need first.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a friendly way out when the AI can't make steps", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 502 }));
    const user = userEvent.setup();
    render(<TellBridge />);
    await user.type(screen.getByLabelText("What do you need to do?"), "something odd");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));

    expect(await screen.findByRole("heading", { name: "I couldn't make steps for that." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Use a quick start" })).toHaveAttribute("href", "/routines/new");
    expect(screen.getByRole("link", { name: "Make it myself" })).toHaveAttribute("href", "/routines/new/blank");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByLabelText("What do you need to do?")).toHaveValue("something odd");
  });

  it("'Smaller steps' asks again with more support and replaces the steps", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(draft(["Take your pill"]), "medium"))
      .mockResolvedValueOnce(ok(draft(["Get your pill box", "Open it", "Take your pill"]), "high"));
    const user = userEvent.setup();
    render(<TellBridge />);
    await user.type(screen.getByLabelText("What do you need to do?"), "take my medicine");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    await screen.findByRole("heading", { name: "Check your steps" });

    await user.click(screen.getByRole("button", { name: "Smaller steps" }));

    await waitFor(() => expect(stepTexts()).toEqual(["Get your pill box", "Open it", "Take your pill"]));
    expect(bodyOf(1)).toEqual({ goal: "take my medicine", supportLevel: "high" });
    expect(screen.getByRole("button", { name: "Smaller steps" })).toBeDisabled();
  });

  it("keeps the current steps if asking again fails", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(draft(["Take your pill"]), "medium"))
      .mockResolvedValueOnce(new Response("{}", { status: 502 }));
    const user = userEvent.setup();
    render(<TellBridge />);
    await user.type(screen.getByLabelText("What do you need to do?"), "pills");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    await screen.findByRole("heading", { name: "Check your steps" });

    await user.click(screen.getByRole("button", { name: "Bigger steps" }));

    expect(await screen.findByText(/couldn't make new steps/)).toBeInTheDocument();
    expect(stepTexts()).toEqual(["Take your pill"]);
  });

  it("saves the reviewed draft like any other routine", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(draft(["Take your pill"])))
      .mockResolvedValueOnce(new Response(JSON.stringify({ routine: { id: "r1" } }), { status: 201 }));
    const user = userEvent.setup();
    render(<TellBridge />);
    await user.type(screen.getByLabelText("What do you need to do?"), "take my medicine");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    await screen.findByRole("heading", { name: "Check your steps" });

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/routines"));
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("/api/routines");
    expect(JSON.parse(init.body as string)).toMatchObject({ goal: "take my medicine", title: "Take medicine" });
  });

  describe("talking instead of typing", () => {
    it("hides the mic when the browser can't do speech", () => {
      render(<TellBridge />);
      expect(screen.queryByRole("button", { name: /Talk instead/ })).not.toBeInTheDocument();
    });

    it("fills in what the person said", async () => {
      const instances: { onresult: ((e: unknown) => void) | null; onend: (() => void) | null }[] = [];
      class FakeRecognition {
        lang = "";
        interimResults = false;
        continuous = false;
        onresult: ((e: unknown) => void) | null = null;
        onerror = null;
        onend: (() => void) | null = null;
        start = vi.fn();
        stop = vi.fn();
        abort = vi.fn();
        constructor() {
          instances.push(this);
        }
      }
      vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
      const user = userEvent.setup();
      render(<TellBridge />);

      await user.click(screen.getByRole("button", { name: "🎤 Talk instead" }));
      expect(screen.getByText("Listening… say what you need.")).toBeInTheDocument();

      act(() => {
        instances[0].onresult?.({ results: [[{ transcript: "take my medicine" }]] });
        instances[0].onend?.();
      });

      expect(screen.getByLabelText("What do you need to do?")).toHaveValue("take my medicine");
      expect(screen.getByRole("button", { name: "🎤 Talk instead" })).toBeInTheDocument();
    });
  });
});
