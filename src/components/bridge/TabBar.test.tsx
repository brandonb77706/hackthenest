import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
const play = vi.fn<(text: string) => Promise<void>>(async () => {});
const stop = vi.fn();
vi.mock("@/lib/voice/player", () => ({ play: (text: string) => play(text), stop: () => stop() }));

import { TabBar } from "./TabBar";

beforeEach(() => {
  pathname = "/";
});
afterEach(() => vi.clearAllMocks());

describe("TabBar", () => {
  it("has all five tabs as links", () => {
    render(<TabBar />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Today", "/"],
      ["Routines", "/routines"],
      ["Scan", "/scan"],
      ["Help", "/get-help"],
      ["Me", "/me"],
    ]);
  });

  it("marks the current tab for screen readers", () => {
    pathname = "/routines";
    render(<TabBar />);
    expect(screen.getByRole("link", { name: "Routines" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  });

  it("the Buddy gives a tip for the current tab, out loud and on screen", async () => {
    pathname = "/routines";
    const user = userEvent.setup();
    render(<TabBar />);
    await user.click(screen.getByRole("button", { name: /Fox, your Buddy/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Fox: Tap a card to start that routine.");
    expect(play).toHaveBeenCalledWith(expect.stringContaining("Tap a card to start that routine."));

    await user.click(screen.getByRole("button", { name: /Fox, your Buddy/ }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(stop).toHaveBeenCalled();
  });

  it("on a tab with no tip, the Buddy is just a picture", () => {
    pathname = "/me";
    render(<TabBar />);
    expect(screen.queryByRole("button", { name: /your Buddy/ })).not.toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();
  });
});
