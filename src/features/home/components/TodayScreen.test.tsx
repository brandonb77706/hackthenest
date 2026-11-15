import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TodayResponse } from "../service";
import type { TodayRoutine } from "../today";
import { TodayScreen } from "./TodayScreen";

const routine = (id: string, title: string, status: TodayRoutine["status"], overrides: Partial<TodayRoutine> = {}): TodayRoutine => ({
  id,
  title,
  tone: "gold",
  start_time: "08:00",
  days: ["mon"],
  step_count: 4,
  steps_done: status === "done" ? 4 : 0,
  status,
  ...overrides,
});

function serve(today: Partial<TodayResponse> | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      today
        ? new Response(JSON.stringify({ name: "Jordan", streak: 4, tokens: 30, routines: [], ...today }), { status: 200 })
        : new Response("{}", { status: 500 }),
    ),
  );
}

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.unstubAllGlobals());

describe("TodayScreen", () => {
  it("greets the person and shows how much is done today", async () => {
    serve({
      routines: [
        routine("a", "Morning routine", "done"),
        routine("b", "Pick up prescription", "next", { start_time: "14:00" }),
        routine("c", "Evening routine", "later", { start_time: "21:00" }),
      ],
    });
    render(<TodayScreen />);
    expect(await screen.findByRole("heading", { name: "1 of 3 done today" })).toBeInTheDocument();
    expect(screen.getByText(/^Good (morning|afternoon|evening), Jordan$/)).toBeInTheDocument();
    expect(screen.getByText("4 days")).toBeInTheDocument();
    expect(screen.getByText("30 coins")).toBeInTheDocument();
  });

  it("makes the next routine the main action, with a Start link to the step player", async () => {
    serve({ routines: [routine("b", "Pick up prescription", "next", { start_time: "14:00" })] });
    render(<TodayScreen />);
    expect(await screen.findByRole("heading", { name: "Pick up prescription" })).toBeInTheDocument();
    expect(screen.getByText("2:00 PM")).toBeInTheDocument();
    expect(screen.getByText("4 steps")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Pick up prescription" })).toHaveAttribute("href", "/play/b");
  });

  it("offers to keep going from the next step when a routine is partly done", async () => {
    serve({ routines: [routine("b", "Morning routine", "next", { steps_done: 2 })] });
    render(<TodayScreen />);
    expect(await screen.findByRole("link", { name: "Keep going Morning routine" })).toHaveAttribute("href", "/play/b?step=3");
    expect(screen.getByText("2 of 4 steps done")).toBeInTheDocument();
  });

  it("shows done routines as done and later ones with their time", async () => {
    serve({
      routines: [
        routine("a", "Morning routine", "done"),
        routine("b", "Lunch", "next", { start_time: "12:00" }),
        routine("c", "Evening routine", "later", { start_time: "21:00" }),
      ],
    });
    render(<TodayScreen />);
    await screen.findByRole("heading", { name: "1 of 3 done today" });
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("9:00 PM")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Evening routine" })).toHaveAttribute("href", "/play/c");
  });

  it("leaves out routines that aren't on today", async () => {
    serve({ routines: [routine("a", "Weekend chores", "not_today"), routine("b", "Morning routine", "next")] });
    render(<TodayScreen />);
    expect(await screen.findByRole("heading", { name: "0 of 1 done today" })).toBeInTheDocument();
    expect(screen.queryByText("Weekend chores")).not.toBeInTheDocument();
  });

  it("celebrates when everything is done", async () => {
    serve({ routines: [routine("a", "Morning routine", "done")] });
    render(<TodayScreen />);
    expect(await screen.findByText("Everything for today is done. Nice work.")).toBeInTheDocument();
  });

  it("invites making a routine when nothing is planned", async () => {
    serve({ routines: [] });
    render(<TodayScreen />);
    expect(await screen.findByText(/Nothing is planned for today/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Make a new routine" })).toHaveAttribute("href", "/routines/new");
  });

  it("explains when it can't load", async () => {
    serve(null);
    render(<TodayScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't load your day/);
  });
});
