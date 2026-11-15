import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeScreen } from "./MeScreen";
import type { MeSummary } from "./summary";

const jordan: MeSummary = {
  name: "Jordan",
  tokens: 25,
  buddyName: "Fox",
  nextReward: { label: "Next reward: Astronaut cat", percent: 25, detail: "75 tokens more to get Astronaut cat." },
};

describe("MeScreen", () => {
  it("shows the name, tokens and Buddy", () => {
    render(<MeScreen summary={jordan} />);
    expect(screen.getByRole("heading", { level: 1, name: "Jordan" })).toBeInTheDocument();
    expect(screen.getByText("25 tokens · Buddy: Fox")).toBeInTheDocument();
  });

  it("shows progress to the next reward", () => {
    render(<MeScreen summary={jordan} />);
    const bar = screen.getByRole("progressbar", { name: "Next reward: Astronaut cat" });
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("75 tokens more to get Astronaut cat.")).toBeInTheDocument();
  });

  it("leaves out the next reward and the Buddy when there are none", () => {
    render(<MeScreen summary={{ name: "Jordan", tokens: 0, buddyName: null, nextReward: null }} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("0 tokens", { selector: "p" })).toBeInTheDocument();
  });

  it("still has a heading before the profile exists", () => {
    render(<MeScreen summary={{ name: "", tokens: 0, buddyName: null, nextReward: null }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Me" })).toBeInTheDocument();
  });
});
