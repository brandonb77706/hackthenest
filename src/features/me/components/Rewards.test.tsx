import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { earnBadges, type BadgeFacts } from "../badges";
import { BadgesCard, RewardsView } from "./Rewards";

const routine: BadgeFacts["routines"][number] = {
  id: "a",
  title: "Morning",
  start_time: "08:00",
  days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  active: true,
  step_ids: ["s1"],
  added_by: null,
  created_on: "2026-11-01",
};
const badges = earnBadges({
  routines: [routine],
  done: [{ routine_id: "a", step_id: "s1", date: "2026-11-12" }],
  pickedColors: false,
  tokens: 0,
  buddiesOn: ["2026-11-01"],
});
const nextReward = { label: "Next reward: Frog", percent: 0, detail: "120 tokens more to get Frog." };

describe("BadgesCard", () => {
  it("shows the count and next reward, and opens the full screen", () => {
    const onOpen = vi.fn();
    render(<BadgesCard badges={badges} nextReward={nextReward} onOpen={onOpen} />);
    const card = screen.getByRole("button", { name: /Badges and rewards. 3 of 16 badges. Next reward: Frog. See all./ });
    expect(within(card).getByText("3 of 16 badges · Next reward: Frog")).toBeInTheDocument();
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalled();
  });

  it("encourages the first badge when there are none", () => {
    render(<BadgesCard badges={earnBadges({ routines: [], done: [], pickedColors: false, tokens: 0, buddiesOn: [] })} nextReward={null} onOpen={() => {}} />);
    expect(screen.getByText("Finish a routine to earn your first badge.")).toBeInTheDocument();
  });
});

describe("RewardsView", () => {
  it("groups every badge and says how many are earned in each", () => {
    render(<RewardsView tokens={0} nextReward={nextReward} badges={badges} />);
    expect(screen.getByRole("heading", { name: "Badges · 3 of 16 badges" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Routines · 2 of 6" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Skills · 1 of 4" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Next reward: Frog" })).toBeInTheDocument();
    expect(screen.getByText("0 tokens")).toBeInTheDocument();
  });

  it("shows when a badge was earned", () => {
    render(<RewardsView tokens={0} nextReward={null} badges={badges} />);
    fireEvent.click(screen.getByRole("button", { name: "First step, earned nov 12, 2026" }));
    const dialog = screen.getByRole("dialog", { name: "First step" });
    expect(within(dialog).getByText("Earned Nov 12, 2026")).toBeInTheDocument();
  });

  it("shows progress for a locked badge", () => {
    render(<RewardsView tokens={0} nextReward={null} badges={badges} />);
    fireEvent.click(screen.getByRole("button", { name: /^Early bird, locked/ }));
    const dialog = screen.getByRole("dialog", { name: "Early bird" });
    expect(within(dialog).getByText("Not earned yet")).toBeInTheDocument();
    expect(within(dialog).getByText("So far: 1 of 5 mornings.")).toBeInTheDocument();
  });
});
