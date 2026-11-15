import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutineInput } from "../routineInput";
import { Builder } from "./Builder";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const draft = (texts: string[], overrides: Partial<RoutineInput> = {}): RoutineInput => ({
  title: "Morning dog walk",
  goal: "walk the dog every morning",
  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  start_time: "08:00",
  tone: "teal",
  remind: true,
  steps: texts.map((text) => ({ text, minutes: 2 })),
  ...overrides,
});
const drafted = (routine: RoutineInput, supportLevel = "medium") =>
  new Response(JSON.stringify({ routine, supportLevel }), { status: 200 });
const saved = (id = "r1") => new Response(JSON.stringify({ routine: { id } }), { status: 201 });

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
const call = (n: number) => {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit];
  return { url, method: init.method, body: JSON.parse(init.body as string) };
};

describe("Builder: choosing how to start", () => {
  it("offers Say it, Type it, Build it myself, and the quick starts", () => {
    render(<Builder />);
    expect(screen.getByRole("heading", { name: "Make a new routine" })).toBeInTheDocument();
    for (const name of [/Say it/, /Type it/, /Build it myself/]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    for (const name of ["Take medicine", "Morning", "Get ready for work", "Bedtime"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Grocery shopping" })).toHaveAttribute("href", "/groceries");
    expect(screen.getByRole("progressbar")).toHaveAccessibleName("Making your routine, part 1 of 3");
  });

  it("a quick start opens ready-made steps without asking the AI", async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: "Take medicine" }));
    expect(screen.getByRole("heading", { name: "Check your steps" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Take medicine");
    expect(stepTexts()).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Want different steps?")).not.toBeInTheDocument();
  });

  it("Build it myself starts with one empty step", async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Build it myself/ }));
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(stepTexts()).toEqual([""]);
  });
});

describe("Builder: Tell Bridge", () => {
  it("types a sentence, shows Making your steps, then the AI's steps to check", async () => {
    let finish: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Type it/ }));
    await user.type(screen.getByLabelText("What do you need to do?"), "walk the dog every morning");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));

    expect(screen.getByRole("heading", { name: "Making your steps…" })).toBeInTheDocument();
    expect(screen.getByText(/Fox is breaking “walk the dog every morning” into small, clear steps/)).toBeInTheDocument();

    await act(async () => finish(drafted(draft(["Find the dog leash", "Walk around the block"]))));

    expect(await screen.findByRole("heading", { name: "Check your steps" })).toBeInTheDocument();
    expect(stepTexts()).toEqual(["Find the dog leash", "Walk around the block"]);
    expect(screen.getByText("2 steps · about 4 min")).toBeInTheDocument();
    expect(call(0)).toMatchObject({ url: "/api/routines/draft", body: { goal: "walk the dog every morning" } });
  });

  it("an example fills in the sentence", async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Type it/ }));
    await user.click(screen.getByRole("button", { name: "Do laundry on Sunday" }));
    expect(screen.getByLabelText("What do you need to do?")).toHaveValue("Do laundry on Sunday");
  });

  it("asks for something before calling the AI", async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Type it/ }));
    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Type or say what you need to do first.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("comes back with a friendly message when the AI can't make steps", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 502 }));
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Type it/ }));
    await user.type(screen.getByLabelText("What do you need to do?"), "something odd");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't make steps/);
    expect(screen.getByLabelText("What do you need to do?")).toHaveValue("something odd");
  });

  it("falls back to typing when the browser can't listen", async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Say it/ }));
    expect(screen.getByRole("heading", { name: "Type it" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Talking isn't available/);
  });

  it("listens, shows what was said, and makes steps from it", async () => {
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
    fetchMock.mockResolvedValue(drafted(draft(["Find the dog leash"])));
    const user = userEvent.setup();
    render(<Builder />);

    await user.click(screen.getByRole("button", { name: /Say it/ }));
    expect(screen.getByRole("heading", { name: "Tell Bridge" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop listening" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Listening…")).toBeInTheDocument();

    act(() => {
      instances[0].onresult?.({ results: [[{ transcript: "walk the dog every morning" }]] });
      instances[0].onend?.();
    });
    expect(screen.getByText("walk the dog every morning")).toBeInTheDocument();
    expect(screen.getByText("Got it. Tap Make my steps.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    expect(await screen.findByRole("heading", { name: "Check your steps" })).toBeInTheDocument();
  });

  it("'Smaller steps' asks again with more support and keeps the color and days", async () => {
    fetchMock
      .mockResolvedValueOnce(drafted(draft(["Walk the dog"]), "medium"))
      .mockResolvedValueOnce(drafted(draft(["Find the leash", "Clip it on", "Walk the dog"]), "high"));
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Type it/ }));
    await user.type(screen.getByLabelText("What do you need to do?"), "walk the dog every morning");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    await screen.findByRole("heading", { name: "Check your steps" });

    expect(screen.getByRole("radio", { name: "Just right" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Smaller steps" }));

    await waitFor(() => expect(stepTexts()).toEqual(["Find the leash", "Clip it on", "Walk the dog"]));
    expect(call(1).body).toEqual({ goal: "walk the dog every morning", supportLevel: "high" });
    expect(screen.getByRole("radio", { name: "Smaller steps" })).toBeChecked();
  });

  it("keeps the steps if asking again fails", async () => {
    fetchMock
      .mockResolvedValueOnce(drafted(draft(["Walk the dog"]), "medium"))
      .mockResolvedValueOnce(new Response("{}", { status: 502 }));
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Type it/ }));
    await user.type(screen.getByLabelText("What do you need to do?"), "walk the dog");
    await user.click(screen.getByRole("button", { name: "Make my steps" }));
    await screen.findByRole("heading", { name: "Check your steps" });
    await user.click(screen.getByRole("radio", { name: "Bigger steps" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't make new steps/);
    expect(stepTexts()).toEqual(["Walk the dog"]);
  });
});

describe("Builder: checking steps", () => {
  async function openMedicine() {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: "Take medicine" }));
    return user;
  }

  it("adds, edits, moves, and deletes steps", async () => {
    const user = await openMedicine();
    const [first] = stepTexts();
    await user.click(screen.getByRole("button", { name: "+ Add a step" }));
    await user.type(screen.getAllByLabelText(/^Step \d+$/)[3], "Put the box away");
    await user.click(screen.getByRole("button", { name: "Move Put the box away up" }));
    expect(stepTexts()[2]).toBe("Put the box away");
    await user.click(screen.getByRole("button", { name: `Delete ${first}` }));
    expect(stepTexts()).toHaveLength(3);
    expect(stepTexts()).not.toContain(first);
  });

  it("changes minutes with the plus and minus buttons, never below 1", async () => {
    const user = await openMedicine();
    const group = screen.getByRole("group", { name: "Minutes for step 1" });
    expect(within(group).getByText("1 min")).toBeInTheDocument();
    await user.click(within(group).getByRole("button", { name: "One minute more" }));
    expect(within(group).getByText("2 min")).toBeInTheDocument();
    await user.click(within(group).getByRole("button", { name: "One minute less" }));
    await user.click(within(group).getByRole("button", { name: "One minute less" }));
    expect(within(group).getByText("1 min")).toBeInTheDocument();
  });

  it("explains what's missing instead of moving on", async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: /Build it myself/ }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add a name for this routine.");
    await user.type(screen.getByLabelText("Name"), "Chores");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add at least one step.");
    expect(screen.queryByRole("heading", { name: "When do you do this?" })).not.toBeInTheDocument();
  });
});

describe("Builder: when, saving, and ready", () => {
  it("picks days, time, color, and reminder, saves, and offers to start", async () => {
    fetchMock.mockResolvedValue(saved("new1"));
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: "Take medicine" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("heading", { name: "When do you do this?" })).toHaveFocus();
    expect(screen.getByRole("switch", { name: "Every day" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Sunday" }));
    expect(screen.getByRole("switch", { name: "Every day" })).not.toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Evening/ }));
    await user.click(screen.getByRole("radio", { name: "Orange" }));
    await user.click(screen.getByRole("switch", { name: /Remind me/ }));
    await user.click(screen.getByRole("button", { name: "Save routine" }));

    expect(await screen.findByRole("heading", { name: "Take medicine is ready" })).toBeInTheDocument();
    expect(screen.getByText("3 steps · Monday, Tuesday, Wednesday, Thursday, Friday, Saturday at 9:00 PM")).toBeInTheDocument();
    expect(call(0)).toMatchObject({
      url: "/api/routines",
      method: "POST",
      body: { title: "Take medicine", days: ["mon", "tue", "wed", "thu", "fri", "sat"], start_time: "21:00", tone: "orange", remind: false },
    });

    await user.click(screen.getByRole("button", { name: "Start it now" }));
    expect(push).toHaveBeenCalledWith("/play/new1");
  });

  it("leaves empty steps out when saving", async () => {
    fetchMock.mockResolvedValue(saved());
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: "Take medicine" }));
    await user.click(screen.getByRole("button", { name: "+ Add a step" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Save routine" }));
    await screen.findByRole("heading", { name: "Take medicine is ready" });
    expect(call(0).body.steps).toHaveLength(3);
  });

  it("needs at least one day", async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: "Take medicine" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("switch", { name: "Every day" }));
    await user.click(screen.getByRole("button", { name: "Save routine" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick at least one day.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a friendly message when saving fails, and keeps the work", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: "Take medicine" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Save routine" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't save/);
    await user.click(screen.getByRole("button", { name: "Back to steps" }));
    expect(stepTexts()).toHaveLength(3);
  });
});

describe("Builder: editing a saved routine", () => {
  const existing = draft(["Get your pill box", "Take your pill"], { title: "Take medicine", tone: "sea" });
  const withIds: RoutineInput = { ...existing, steps: existing.steps.map((s, i) => ({ ...s, id: `s${i + 1}` })) };

  it("opens on the steps, saves with PATCH keeping step ids, and goes back to the list", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ routine: { id: "r9" } }), { status: 200 }));
    const user = userEvent.setup();
    render(<Builder routineId="r9" initial={withIds} />);
    expect(screen.getByRole("heading", { name: "Edit your routine" })).toBeInTheDocument();
    expect(stepTexts()).toEqual(["Get your pill box", "Take your pill"]);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Save routine" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/routines"));
    expect(call(0)).toMatchObject({ url: "/api/routines/r9", method: "PATCH" });
    expect(call(0).body.steps.map((s: { id: string }) => s.id)).toEqual(["s1", "s2"]);
  });

  it("asks before deleting", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    render(<Builder routineId="r9" initial={withIds} />);
    await user.click(screen.getByRole("button", { name: "Delete this routine" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete this routine" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete it" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/routines"));
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe("DELETE");
  });

  it("doesn't offer delete while making a new routine", async () => {
    const user = userEvent.setup();
    render(<Builder />);
    await user.click(screen.getByRole("button", { name: "Take medicine" }));
    expect(screen.queryByRole("button", { name: "Delete this routine" })).not.toBeInTheDocument();
  });
});

describe("Builder: a guardian making a routine for someone", () => {
  const forPerson = { name: "Jordan", api: "/api/guardian/people/u1/routines", back: "/guardian/u1/routines" };

  it("says who it's for, has no grocery shortcut, saves to the guardian API, and goes back", async () => {
    fetchMock.mockResolvedValue(saved("r5"));
    const user = userEvent.setup();
    render(<Builder forPerson={forPerson} />);
    expect(screen.getByRole("heading", { name: "Make a routine for Jordan" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Grocery shopping" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Close without saving" })).toHaveAttribute("href", "/guardian/u1/routines");

    await user.click(screen.getByRole("button", { name: "Take medicine" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Save routine" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/guardian/u1/routines"));
    expect(call(0)).toMatchObject({ url: "/api/guardian/people/u1/routines", method: "POST" });
    expect(screen.queryByRole("button", { name: "Start it now" })).not.toBeInTheDocument();
  });

  it("edits and deletes through the guardian API", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    render(<Builder routineId="r9" initial={draft(["Wake up"])} forPerson={forPerson} />);
    await user.click(screen.getByRole("button", { name: "Delete this routine" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete it" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/guardian/u1/routines"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/guardian/people/u1/routines/r9");
  });
});
