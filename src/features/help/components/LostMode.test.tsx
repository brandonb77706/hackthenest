import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TrustedContact } from "@/lib/types";
import type { LocationResult } from "../location";
import { LostMode, sendLink } from "./LostMode";

const sam: TrustedContact = {
  id: "c1",
  user_id: "u1",
  name: "Sam",
  method: "sms",
  contact: "+15550100142",
  relation: "Your brother",
  can_see_routines: false,
  can_get_lost_alerts: true,
  can_get_stuck_alerts: false,
};
const found: LocationResult = { ok: true, coords: { latitude: 42.3314, longitude: -83.0458 } };

describe("I'm lost", () => {
  it("shows calm steps, finds the location, and sends only when tapped", async () => {
    const user = userEvent.setup();
    const locate = vi.fn(async () => found);
    render(<LostMode userName="Jordan" contacts={[sam]} locate={locate} />);
    expect(screen.getByText(/Sam will get a message/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /I'm lost/ }));
    expect(screen.getByText("Stay where you are.")).toBeInTheDocument();
    expect(locate).toHaveBeenCalledOnce();

    const send = await screen.findByRole("link", { name: "Send my location to Sam" });
    const href = send.getAttribute("href")!;
    expect(href.startsWith("sms:+15550100142?&body=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Jordan says they're lost. Location: https://www.google.com/maps?q=42.3314,-83.0458");
    expect(screen.getByRole("link", { name: /Open where I am in Maps/ })).toHaveAttribute("href", "https://www.google.com/maps?q=42.3314,-83.0458");
  });

  it("after sending, offers to call, and asks first", async () => {
    const user = userEvent.setup();
    render(<LostMode userName="Jordan" contacts={[sam]} locate={async () => found} />);
    await user.click(screen.getByRole("button", { name: /I'm lost/ }));
    await user.click(await screen.findByRole("link", { name: "Send my location to Sam" }));
    expect(screen.getByRole("status")).toHaveTextContent("Message ready for Sam.");

    await user.click(screen.getByRole("button", { name: "Call Sam" }));
    const dialog = screen.getByRole("alertdialog", { name: "Call Sam now?" });
    expect(within(dialog).getByRole("link", { name: "Yes, call" })).toHaveAttribute("href", "tel:+15550100142");
  });

  it("sends to nobody when no contact has lost alerts on", async () => {
    const user = userEvent.setup();
    render(<LostMode userName="Jordan" contacts={[{ ...sam, can_get_lost_alerts: false }]} locate={async () => found} />);
    expect(screen.getByText(/Add a trusted contact with lost alerts on/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /I'm lost/ }));
    expect(await screen.findByText(/No one has lost alerts turned on/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Send my location/ })).not.toBeInTheDocument();
  });

  it("explains when it can't find you, with a way to try again", async () => {
    const user = userEvent.setup();
    const locate = vi.fn(async (): Promise<LocationResult> => ({ ok: false, reason: "denied" }));
    render(<LostMode userName="Jordan" contacts={[sam]} locate={locate} />);
    await user.click(screen.getByRole("button", { name: /I'm lost/ }));
    expect(await screen.findByText(/Location is turned off/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(locate).toHaveBeenCalledTimes(2);
  });

  it("always has Call 911, and asks first", async () => {
    const user = userEvent.setup();
    render(<LostMode userName="Jordan" contacts={[]} locate={async () => found} />);
    await user.click(screen.getByRole("button", { name: "Call 911" }));
    expect(within(screen.getByRole("alertdialog", { name: "Call 911 now?" })).getByRole("link", { name: "Yes, call" })).toHaveAttribute("href", "tel:911");
  });
});

describe("sendLink", () => {
  it("opens texting for phones and email for email, nothing for Telegram", () => {
    expect(sendLink(sam, "hi there")).toBe("sms:+15550100142?&body=hi%20there");
    expect(sendLink({ ...sam, method: "email", contact: "sam@example.com" }, "hi")).toBe("mailto:sam@example.com?subject=I'm%20lost&body=hi");
    expect(sendLink({ ...sam, method: "telegram", contact: "@sam" }, "hi")).toBeNull();
  });
});
