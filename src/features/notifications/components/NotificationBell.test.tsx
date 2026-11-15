import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { addToInbox, resetInboxCache } from "../inbox";
import { NotificationBell } from "./NotificationBell";

beforeEach(() => {
  localStorage.clear();
  resetInboxCache();
});

describe("NotificationBell", () => {
  it("shows how many are new, lists them, and marks them read", async () => {
    addToInbox({ id: "a", routineId: "r1", title: "Medicine at 8:00 AM", body: "Starts in 10 minutes.", at: new Date().toISOString() });
    addToInbox({ id: "b", routineId: "r2", title: "Time for Bedtime", body: "No rush.", at: new Date().toISOString() });
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: "Notifications, 2 new" }));
    const dialog = screen.getByRole("dialog", { name: "Notifications" });
    const links = within(dialog).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/play/r2", "/play/r1"]);
    expect(links[1]).toHaveTextContent("Medicine at 8:00 AM");

    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("explains reminders when there are none yet", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText(/No reminders yet/)).toBeInTheDocument();
  });
});
