import { describe, expect, it } from "vitest";
import { formatTokens, nextReward } from "./summary";

const shop = [
  { id: "bear", name: "Chef bear", price: 150 },
  { id: "cat", name: "Astronaut cat", price: 100 },
  { id: "owl", name: "Skater owl", price: 300 },
];

describe("formatTokens", () => {
  it("uses the singular for exactly one token", () => {
    expect(formatTokens(1)).toBe("1 token");
    expect(formatTokens(0)).toBe("0 tokens");
    expect(formatTokens(25)).toBe("25 tokens");
  });
});

describe("nextReward", () => {
  it("picks the cheapest shop Buddy and shows how far along the user is", () => {
    expect(nextReward(25, shop, [])).toEqual({
      label: "Next reward: Astronaut cat",
      percent: 25,
      detail: "75 tokens more to get Astronaut cat.",
    });
  });

  it("skips Buddies the user already has", () => {
    expect(nextReward(0, shop, ["cat"])?.label).toBe("Next reward: Chef bear");
  });

  it("says so when the user has enough tokens, and never goes past 100%", () => {
    expect(nextReward(120, shop, [])).toEqual({
      label: "Next reward: Astronaut cat",
      percent: 100,
      detail: "You have enough tokens for Astronaut cat.",
    });
  });

  it("uses the singular when one token is missing", () => {
    expect(nextReward(99, shop, [])?.detail).toBe("1 token more to get Astronaut cat.");
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
