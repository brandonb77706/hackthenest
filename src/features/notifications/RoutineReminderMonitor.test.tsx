import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RoutineReminderMonitor } from "./RoutineReminderMonitor";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });
it("shows a due reminder, remembers delivery across remount, and dismisses it", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reminders: [{ id: "r1:2026-11-14:before", routineId: "r1", title: "Medicine", stage: "before", dueAt: "2026-11-14T12:50:00Z" }] }) });
  vi.stubGlobal("fetch", fetch);
  const first = render(<RoutineReminderMonitor />);
  expect(await screen.findByText("Medicine starts in 10 minutes.")).toBeInTheDocument();
  await userClickDismiss();
  expect(screen.queryByRole("region", { name: "Routine reminder" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Dismiss reminder" })).not.toBeInTheDocument();
  first.unmount();
  render(<RoutineReminderMonitor />);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(localStorage.getItem("bridge:routine-reminders:delivered:v1")).toContain("r1:2026-11-14:before");
});
it("retries polling every 30 seconds while the tab is visible", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reminders: [] }) }));
  render(<RoutineReminderMonitor />);
  await act(async () => { await Promise.resolve(); });
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(30_000); await Promise.resolve(); });
  expect(fetch).toHaveBeenCalledTimes(2);
});
async function userClickDismiss() {
  const { default: userEvent } = await import("@testing-library/user-event");
  await userEvent.setup().click(screen.getByRole("button", { name: "Dismiss reminder" }));
}
