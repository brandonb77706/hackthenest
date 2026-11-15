import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuddyAvatar, buddyArt } from "./BuddyAvatar";

// From Adrian's tests.
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

describe("BuddyAvatar", () => {
  it("draws the fox, hidden from screen readers", () => {
    const { container } = render(<BuddyAvatar name="Fox" size={74} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "74");
  });

  it("adds paws for the tab bar", () => {
    const withPaws = render(<BuddyAvatar name="Fox" size={74} paws />).container.querySelectorAll("ellipse").length;
    const without = render(<BuddyAvatar name="Fox" size={74} />).container.querySelectorAll("ellipse").length;
    expect(withPaws).toBe(without + 2);
  });

  it("shows the first letter for a Buddy with no drawing yet", () => {
    const { container } = render(<BuddyAvatar name="Robot" size={60} />);
    expect(container.textContent).toBe("R");
  });
});
