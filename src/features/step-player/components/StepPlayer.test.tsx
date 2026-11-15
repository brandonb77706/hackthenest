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
let doneStatus = 200;
/** What each Done tap earns, in order (the server decides this) */
let doneReplies: object[] = [];
beforeEach(() => {
  doneStatus = 200;
  doneReplies = [];
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      const reply = doneReplies.shift() ?? { earned: 0, awards: [], finished_routine: false, streak: null, unlocked: [] };
      return doneStatus === 200 ? new Response(JSON.stringify(reply), { status: 200 }) : new Response(null, { status: doneStatus });
    }
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
    .map(([url, init]) => ({ url: String(url).split("?")[0], body: JSON.parse((init as RequestInit).body as string) }));

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

  it("sends the time zone, so once a day means the person's day", async () => {
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    await screen.findByRole("heading", { name: "Take your morning pill" });
    await user.click(screen.getByRole("button", { name: "Done" }));
    await screen.findByRole("heading", { name: "Brush your teeth" });
    const url = String(fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "POST")![0]);
    expect(url).toMatch(/\/done\?tz=.+/);
  });

  it("shows and says the tokens earned, the streak, and an unlocked Buddy", async () => {
    doneReplies = [
      { earned: 5, awards: [{ amount: 5, reason: "step" }], finished_routine: false, streak: null, unlocked: [] },
      { earned: 5, awards: [{ amount: 5, reason: "step" }], finished_routine: false, streak: null, unlocked: [] },
      {
        earned: 75,
        awards: [
          { amount: 5, reason: "step" },
          { amount: 20, reason: "routine" },
          { amount: 50, reason: "streak" },
        ],
        finished_routine: true,
        streak: 7,
        unlocked: ["Turtle"],
        challenges: [{ id: "all_routines", title: "Finish all of today's routines", tokens: 50, done: true, progress: "", percent: 100 }],
      },
    ];
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    for (const step of ["Take your morning pill", "Brush your teeth", "Eat breakfast"]) {
      await screen.findByRole("heading", { name: step });
      await user.click(screen.getByRole("button", { name: "Done" }));
    }
    expect(await screen.findByRole("heading", { name: "Morning routine done" })).toBeInTheDocument();
    expect(screen.getByText("+85")).toBeInTheDocument();
    expect(screen.getByText("7-day streak. Keep it going!")).toBeInTheDocument();
    expect(screen.getByText("You unlocked Turtle! Pick it on the Me tab.")).toBeInTheDocument();
    expect(screen.getByText(/Challenge done!/).closest("p")).toHaveTextContent("Finish all of today's routines. +50 tokens");
    await waitFor(() => expect(play).toHaveBeenCalledWith("Morning routine done. Nice work. You earned 85 tokens."));
  });

  it("says a repeat earns nothing more, without making it sound bad", async () => {
    const user = userEvent.setup();
    render(<StepPlayer routineId="r1" />);
    for (const step of ["Take your morning pill", "Brush your teeth", "Eat breakfast"]) {
      await screen.findByRole("heading", { name: step });
      await user.click(screen.getByRole("button", { name: "Done" }));
    }
    expect(await screen.findByText("+0")).toBeInTheDocument();
    expect(screen.getByText("You already did this one today. Doing it again is great practice.")).toBeInTheDocument();
  });
});
