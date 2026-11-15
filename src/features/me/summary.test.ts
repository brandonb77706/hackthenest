import { describe, expect, it } from "vitest";
import { formatTokens, nextReward } from "./summary";

const shop = [
  { id: "bear", name: "Chef bear", price: 150 },
  { id: "cat", name: "Astronaut cat", price: 100 },
  { id: "owl", name: "Skater owl", price: 300 },
];

describe("formatTokens", () => {
  it("uses the singular for exactly one coin", () => {
    expect(formatTokens(1)).toBe("1 coin");
    expect(formatTokens(0)).toBe("0 coins");
    expect(formatTokens(25)).toBe("25 coins");
  });
});

describe("nextReward", () => {
  it("picks the cheapest shop Buddy and shows how far along the user is", () => {
    expect(nextReward(25, shop, [])).toEqual({
      label: "Next reward: Astronaut cat",
      percent: 25,
      detail: "75 coins more to get Astronaut cat.",
    });
  });

  it("skips Buddies the user already has", () => {
    expect(nextReward(0, shop, ["cat"])?.label).toBe("Next reward: Chef bear");
  });

  it("says so when the user has enough coins, and never goes past 100%", () => {
    expect(nextReward(120, shop, [])).toEqual({
      label: "Next reward: Astronaut cat",
      percent: 100,
      detail: "You have enough coins for Astronaut cat.",
    });
  });

  it("uses the singular when one coin is missing", () => {
    expect(nextReward(99, shop, [])?.detail).toBe("1 coin more to get Astronaut cat.");
  });

  it("returns null when there is nothing left in the shop", () => {
    expect(nextReward(500, shop, ["cat", "bear", "owl"])).toBeNull();
    expect(nextReward(500, [], [])).toBeNull();
  });

  it("ignores avatars without a price (starter and streak ones)", () => {
    expect(nextReward(0, [{ id: "fox", name: "Fox", price: null }], [])).toBeNull();
  });

  it("treats a negative balance as zero", () => {
    expect(nextReward(-10, shop, [])?.percent).toBe(0);
  });
});

import { buddyChoices, buddyTag } from "./summary";

const catalog = [
  { id: "phoenix", name: "Gold phoenix", unlock_type: "streak" as const, price: null, streak_required: 30 },
  { id: "owl", name: "Skater owl", unlock_type: "shop" as const, price: 300, streak_required: null },
  { id: "robot", name: "Robot", unlock_type: "starter" as const, price: null, streak_required: null },
  { id: "fox", name: "Fox", unlock_type: "starter" as const, price: null, streak_required: null },
  { id: "cat", name: "Astronaut cat", unlock_type: "shop" as const, price: 100, streak_required: null },
  { id: "star", name: "Bronze star buddy", unlock_type: "streak" as const, price: null, streak_required: 7 },
];

describe("buddyChoices", () => {
  it("lists starters first, then the shop by price, then streak Buddies by length", () => {
    expect(buddyChoices(catalog, [], null).map((b) => b.id)).toEqual(["fox", "robot", "cat", "owl", "star", "phoenix"]);
  });

  it("lets the user pick any starter, or anything they own, and marks the equipped one", () => {
    const choices = buddyChoices(catalog, ["fox", "owl"], "fox");
    const byId = Object.fromEntries(choices.map((b) => [b.id, b]));
    expect(byId.fox).toMatchObject({ owned: true, equipped: true, can_choose: true });
    expect(byId.robot).toMatchObject({ owned: false, can_choose: true });
    expect(byId.owl).toMatchObject({ owned: true, can_choose: true });
    expect(byId.cat).toMatchObject({ owned: false, can_choose: false });
    expect(byId.star.can_choose).toBe(false);
  });
});

describe("buddyTag", () => {
  const [fox, robot, cat, , star] = buddyChoices(catalog, ["fox"], "fox");
  it("says what each card means", () => {
    expect(buddyTag(fox)).toBe("Your Buddy");
    expect(buddyTag(robot)).toBe("Choose");
    expect(buddyTag(cat)).toBe("100 coins");
    expect(buddyTag(star)).toBe("7-day streak");
  });
});
