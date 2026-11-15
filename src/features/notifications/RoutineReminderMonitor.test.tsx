import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSettingsCache, updateSettings } from "@/lib/settings";
import { getInbox, resetInboxCache } from "./inbox";
import { RoutineReminderMonitor } from "./RoutineReminderMonitor";

const before = { id: "r1:2026-11-14:0800:before", routineId: "r1", title: "Medicine", stage: "before", dueAt: "2026-11-14T12:50:00Z", startTime: "08:00", stepCount: 3 };
const late = { ...before, id: "r1:2026-11-14:0800:late", stage: "late" };
const answer = (reminders: unknown[]) => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reminders }) });

beforeEach(() => {
  localStorage.clear();
  resetSettingsCache();
  resetInboxCache();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RoutineReminderMonitor (Nati's reminders, in the design's banner)", () => {
  it("shows a due reminder, remembers delivery across remount, and dismisses it with Later", async () => {
    const fetch = answer([before]);
    vi.stubGlobal("fetch", fetch);
    const first = render(<RoutineReminderMonitor />);
    const banner = await screen.findByRole("region", { name: "Routine reminder" });
    expect(banner).toHaveTextContent("Medicine at 8:00 AM");
    expect(banner).toHaveTextContent("Starts in 10 minutes. Ready when you are. It has 3 steps.");
    expect(screen.getByRole("link", { name: "Start now" })).toHaveAttribute("href", "/play/r1");

    await userEvent.setup().click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByRole("region", { name: "Routine reminder" })).not.toBeInTheDocument();
    first.unmount();

    render(<RoutineReminderMonitor />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(localStorage.getItem("bridge:routine-reminders:delivered:v1")).toContain(before.id);
    expect(screen.queryByRole("region", { name: "Routine reminder" })).not.toBeInTheDocument();
  });

  it("sends the person's time zone and what was already shown", async () => {
    const fetch = answer([]);
    vi.stubGlobal("fetch", fetch);
    render(<RoutineReminderMonitor />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(String(fetch.mock.calls[0][0])).toMatch(/\/api\/notifications\/due\?delivered=&tz=/);
  });

  it("uses gentle words for a late nudge", async () => {
    vi.stubGlobal("fetch", answer([late]));
    render(<RoutineReminderMonitor />);
    const banner = await screen.findByRole("region", { name: "Routine reminder" });
    expect(banner).toHaveTextContent("Time for Medicine");
    expect(banner).toHaveTextContent("No rush. Want to start now, or get help?");
  });

  it("adds each reminder to the bell's list", async () => {
    vi.stubGlobal("fetch", answer([before]));
    render(<RoutineReminderMonitor />);
    await screen.findByRole("region", { name: "Routine reminder" });
    expect(getInbox()).toEqual([expect.objectContaining({ id: before.id, title: "Medicine at 8:00 AM", read: false })]);
  });

  it("skips late nudges when they're turned off, and stops checking when all reminders are off", async () => {
    updateSettings({ lateNudges: false });
    const fetch = answer([late]);
    vi.stubGlobal("fetch", fetch);
    const view = render(<RoutineReminderMonitor />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: "Routine reminder" })).not.toBeInTheDocument();
    view.unmount();

    updateSettings({ reminders: false, lateNudges: false });
    const quiet = answer([before]);
    vi.stubGlobal("fetch", quiet);
    render(<RoutineReminderMonitor />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(quiet).not.toHaveBeenCalled();
  });

  it("checks again every 30 seconds while the tab is visible", async () => {
    vi.useFakeTimers();
    const fetch = answer([]);
    vi.stubGlobal("fetch", fetch);
    render(<RoutineReminderMonitor />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
