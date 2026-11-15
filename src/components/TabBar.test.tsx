import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buddyArt } from "./BuddyAvatar";
import { TabBar } from "./TabBar";

describe("TabBar", () => {
  it("links to each screen and marks the current one", () => {
    render(<TabBar current="me" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Me" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Me" })).toHaveAttribute("href", "/me");
    expect(within(nav).getByRole("link", { name: "Routines" })).toHaveAttribute("href", "/routines");
    expect(within(nav).getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
    expect(within(nav).getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  });
});

describe("buddyArt", () => {
  it("matches a drawing by a whole word in the avatar name", () => {
    expect(buddyArt("Fox")).toBe("fox");
    expect(buddyArt("Skater owl")).toBe("owl");
    expect(buddyArt("Astronaut cat")).toBe("cat");
  });

  it("returns null when there is no drawing, so the first letter shows instead", () => {
    expect(buddyArt("Robot")).toBeNull();
    expect(buddyArt("Catfish")).toBeNull();
  });
});
