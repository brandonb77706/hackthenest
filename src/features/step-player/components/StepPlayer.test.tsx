import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const play = vi.fn<(text: string) => Promise<void>>(async () => {});
vi.mock("@/lib/voice/player", () => ({ play: (text: string) => play(text), stop: vi.fn() }));

import { StepPlayer } from "./StepPlayer";

const routine = {
  id: "r1",
  user_id: "u1",
  title: "Morning routine",
  goal: "",
  days: ["mon"],
  start_time: "08:00",
  active: true,
  tone: "gold",
  remind: true,
  steps: [
    { id: "s1", routine_id: "r1", user_id: "u1", order: 1, text: "Take your morning pill", minutes: 1, image_url: null, audio_url: null },
    { id: "s2", routine_id: "r1", user_id: "u1", order: 2, text: "Brush your teeth", minutes: 2, image_url: null, audio_url: null },
    { id: "s3", routine_id: "r1", user_id: "u1", order: 3, text: "Eat breakfast", minutes: 15, image_url: null, audio_url: null },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;
let doneStatus = 204;
beforeEach(() => {
  doneStatus = 204;
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return new Response(null, { status: doneStatus });
    if (url === "/api/routines/r1") return new Response(JSON.stringify({ routine }), { status: 200 });
    return new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const posts = () =>
  fetchMock.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")
    .map(([url, init]) => ({ url, body: JSON.parse((init as RequestInit).body as string) }));

describe("StepPlayer", () => {
  it("shows one step at a time and reads it out loud", async () => {
    render(<StepPlayer routineId="r1" />);
    expect(await screen.findByRole("heading", { name: "Take your morning pill" })).toBeInTheDocument();
    expect(screen.getByText("Morning routine · Step 1 of 3 steps")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Steps done" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("1/3")).toBeInTheDocument();
    await waitFor(() => expect(play).toHaveBeenCalledWith("Take your morning pill"));
  });

  it("Done saves the step and moves to the next one", async () => {
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    await screen.findByRole("heading", { name: "Take your morning pill" });
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(await screen.findByRole("heading", { name: "Brush your teeth" })).toBeInTheDocument();
    expect(posts()).toEqual([{ url: "/api/routines/r1/steps/s1/done", body: { used_help: false } }]);
    await waitFor(() => expect(play).toHaveBeenCalledWith("Brush your teeth"));
  });

  it("Back goes to the step before, and is off on the first step", async () => {
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    await screen.findByRole("heading", { name: "Take your morning pill" });
    expect(screen.getByRole("button", { name: "Back one step" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Done" }));
    await screen.findByRole("heading", { name: "Brush your teeth" });
    await user.click(screen.getByRole("button", { name: "Back one step" }));
    expect(screen.getByRole("heading", { name: "Take your morning pill" })).toBeInTheDocument();
  });

  it("'Say it again' reads the step again", async () => {
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    await screen.findByRole("heading", { name: "Take your morning pill" });
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Say it again" }));
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("shows the results after the last step", async () => {
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    await screen.findByRole("heading", { name: "Take your morning pill" });
    await user.click(screen.getByRole("button", { name: "Done" }));
    await screen.findByRole("heading", { name: "Brush your teeth" });
    await user.click(screen.getByRole("button", { name: "Done" }));
    await screen.findByRole("heading", { name: "Eat breakfast" });
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(await screen.findByRole("heading", { name: "Morning routine done" })).toBeInTheDocument();
    expect(screen.getByText("steps").previousSibling).toHaveTextContent("3");
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", "/");
    expect(posts()).toHaveLength(3);
  });

  it("stays on the step and explains when saving fails", async () => {
    doneStatus = 500;
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    await screen.findByRole("heading", { name: "Take your morning pill" });
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't save that step/);
    expect(screen.getByRole("heading", { name: "Take your morning pill" })).toBeInTheDocument();
  });

  it("opens on a later step for 'Keep going'", async () => {
    render(<StepPlayer routineId="r1" startStep={3} />);
    expect(await screen.findByRole("heading", { name: "Eat breakfast" })).toBeInTheDocument();
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  it("'I need help with this step' goes to the Help tab", async () => {
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    await screen.findByRole("heading", { name: "Take your morning pill" });
    await user.click(screen.getByRole("button", { name: "I need help with this step" }));
    expect(push).toHaveBeenCalledWith("/get-help");
  });

  it("has a way out when the routine can't be found", async () => {
    render(<StepPlayer routineId="missing" />);
    expect(await screen.findByRole("heading", { name: "I can't find that routine." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Today" })).toHaveAttribute("href", "/");
  });

  it("has a way to leave at any time", async () => {
    render(<StepPlayer routineId="r1" />);
    await screen.findByRole("heading", { name: "Take your morning pill" });
    expect(screen.getByRole("link", { name: "Leave routine" })).toHaveAttribute("href", "/");
  });
});
