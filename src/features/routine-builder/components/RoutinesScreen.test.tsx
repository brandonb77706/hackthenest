import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TodayRoutine } from "@/features/home/today";
import { RoutinesScreen } from "./RoutinesScreen";

const routine = (id: string, title: string, status: TodayRoutine["status"], overrides: Partial<TodayRoutine> = {}): TodayRoutine => ({
  id,
  title,
  tone: "teal",
  start_time: "08:00",
  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  step_count: 3,
  steps_done: 0,
  status,
  ...overrides,
});

function serve(routines: TodayRoutine[] | null, extra: Record<string, unknown> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      routines
        ? new Response(JSON.stringify({ name: "Jordan", streak: 0, tokens: 0, routines, ...extra }), { status: 200 })
        : new Response("{}", { status: 500 }),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("RoutinesScreen", () => {
  it("lists every routine with its time, steps, days, and today's status", async () => {
    serve([
      routine("a", "Morning routine", "done"),
      routine("b", "Pick up prescription", "next", { start_time: "14:00", step_count: 4 }),
      routine("c", "Laundry", "not_today", { days: ["sun"], step_count: 1 }),
    ]);
    render(<RoutinesScreen />);

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Done")).toBeInTheDocument();
    expect(within(items[1]).getByText("2:00 PM · 4 steps")).toBeInTheDocument();
    expect(within(items[1]).getByText("Next")).toBeInTheDocument();
    expect(within(items[2]).getByText("Not today")).toBeInTheDocument();
    expect(within(items[2]).getByText("8:00 AM · 1 step")).toBeInTheDocument();
    expect(within(items[2]).getByText("Sunday")).toBeInTheDocument();
  });

  it("starts a routine from its card and edits it from the Edit link", async () => {
    serve([routine("b", "Pick up prescription", "next")]);
    render(<RoutinesScreen />);
    expect(await screen.findByRole("link", { name: "Start Pick up prescription" })).toHaveAttribute("href", "/play/b");
    expect(screen.getByRole("link", { name: "Edit Pick up prescription" })).toHaveAttribute("href", "/routines/b/edit");
  });

  it("has a New button that opens the routine maker", async () => {
    serve([]);
    render(<RoutinesScreen />);
    expect(screen.getByRole("link", { name: "Make a new routine" })).toHaveAttribute("href", "/routines/new");
    expect(await screen.findByText(/don't have any routines yet/)).toBeInTheDocument();
  });

  it("explains when it can't load", async () => {
    serve(null);
    render(<RoutinesScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't load/);
  });

  it("hides New and Edit when a guardian manages routines, but routines can still be started", async () => {
    serve([routine("a", "Morning routine", "next")], {
      edit: { routines: { allowed: false, managedBy: ["Sam"] }, contacts: { allowed: true, managedBy: [] } },
    });
    render(<RoutinesScreen />);
    expect(await screen.findByText("Sam manages your routines. Ask Sam to make changes.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Make a new routine" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Edit Morning routine" })).toBeNull();
    expect(screen.getByRole("link", { name: "Start Morning routine" })).toBeInTheDocument();
  });
});
