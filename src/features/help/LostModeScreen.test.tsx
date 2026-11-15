import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { LocationResult } from "./location";
import { LostModeScreen } from "./LostModeScreen";

// A fake "find my location" so tests never use a real GPS or permission prompt.
const found = async (): Promise<LocationResult> => ({ ok: true, coords: { latitude: 40.7128, longitude: -74.006 } });
const denied = async (): Promise<LocationResult> => ({ ok: false, reason: "denied" });

describe("LostModeScreen", () => {
  // Required safety behavior: 911 is on screen before anything is pressed.
  it("shows Call 911 right away", () => {
    render(<LostModeScreen locate={found} />);
    expect(screen.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911");
  });

  it("shows the calm steps after pressing I'm lost", async () => {
    render(<LostModeScreen locate={found} />);
    await userEvent.click(screen.getByRole("button", { name: "I'm lost" }));
    expect(screen.getByText("Stay where you are.")).toBeInTheDocument();
    expect(screen.getByText("Find a safe place to sit.")).toBeInTheDocument();
    expect(screen.getByText("Help is coming.")).toBeInTheDocument();
  });

  it("shows a maps link and the message preview when the location is found", async () => {
    render(<LostModeScreen userName="Sam" locate={found} />);
    await userEvent.click(screen.getByRole("button", { name: "I'm lost" }));
    expect(await screen.findByRole("link", { name: "Open in Maps" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps?q=40.7128,-74.006",
    );
    expect(screen.getByText(/Sam says they're lost/)).toBeInTheDocument();
  });

  it("shows a calm message, the steps, and 911 when location is denied", async () => {
    render(<LostModeScreen locate={denied} />);
    await userEvent.click(screen.getByRole("button", { name: "I'm lost" }));
    expect(await screen.findByText(/Location is turned off/)).toBeInTheDocument();
    expect(screen.getByText("Stay where you are.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call 911" })).toBeInTheDocument();
  });

  it("lets the user try again after a failure", async () => {
    let calls = 0;
    const failThenFind = async (): Promise<LocationResult> =>
      ++calls === 1 ? { ok: false, reason: "timeout" } : found();
    render(<LostModeScreen locate={failThenFind} />);
    await userEvent.click(screen.getByRole("button", { name: "I'm lost" }));
    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: "Open in Maps" })).toBeInTheDocument();
  });
});
