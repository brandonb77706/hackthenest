import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { challengeStatus } from "../challenges";
import { ChallengeDone } from "./ChallengeDone";
import { ChallengesCard } from "./ChallengesCard";

const challenges = challengeStatus({
  routinesToday: 3,
  routinesDoneToday: 2,
  scansToday: 3,
  routinesMadeToday: 0,
  canMakeRoutines: true,
  claimed: ["scans"],
});

describe("ChallengesCard", () => {
  it("lists today's challenges with progress and what each pays", () => {
    render(<ChallengesCard challenges={challenges} />);
    const card = screen.getByRole("region", { name: "Today's challenges" });
    expect(within(card).getByText("1 of 3 done")).toBeInTheDocument();
    expect(within(card).getByRole("progressbar", { name: "Finish all of today's routines: 2 of 3 routines" })).toHaveAttribute("aria-valuenow", "67");
    expect(within(card).getByText("Done today")).toBeInTheDocument();
    expect(within(card).getByLabelText("Earned 40 coins")).toBeInTheDocument();
    expect(within(card).getByLabelText("Earns 30 coins")).toBeInTheDocument();
  });

  it("shows nothing without challenges", () => {
    const { container } = render(<ChallengesCard challenges={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

it("ChallengeDone celebrates each challenge just finished", () => {
  render(<ChallengeDone challenges={[{ id: "all_routines", title: "Finish all of today's routines", tokens: 50 }]} />);
  expect(screen.getByRole("status")).toHaveTextContent("Challenge booster! Finish all of today's routines: +50 coins.");
  expect(screen.getByRole("button", { name: "Dismiss challenge notification" })).toBeInTheDocument();
});
