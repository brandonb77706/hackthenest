import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CheckInDemo } from "./CheckInDemo";

describe("local check-in delivery", () => {
  it("starts quiet and delivers an accessible nudge on keyboard activation", async () => {
    const user = userEvent.setup();
    render(<CheckInDemo />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "Dismiss check-in" })).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", { name: "Send test check-in" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("Check-in 1: Time to check your morning routine. Put on your shoes.");
  });

  it("supports repeat delivery, dismissal, and resets on remount", async () => {
    const user = userEvent.setup();
    const view = render(<CheckInDemo />);
    const send = screen.getByRole("button", { name: "Send test check-in" });
    await user.click(send);
    await user.click(send);
    expect(screen.getByRole("status")).toHaveTextContent("Check-in 2:");
    await user.click(screen.getByRole("button", { name: "Dismiss check-in" }));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(send);
    expect(screen.getByRole("status")).toHaveTextContent("Check-in 3:");
    view.unmount();
    render(<CheckInDemo />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("delivers without network requests or browser notification permission", async () => {
    const fetch = vi.fn(() => { throw new Error("Unexpected external delivery"); });
    const requestPermission = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("Notification", { requestPermission });
    try {
      const user = userEvent.setup();
      render(<CheckInDemo />);
      await user.click(screen.getByRole("button", { name: "Send test check-in" }));
      expect(screen.getByRole("status")).toHaveTextContent("Check-in 1:");
      expect(fetch).not.toHaveBeenCalled();
      expect(requestPermission).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
