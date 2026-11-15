import { describe, expect, it } from "vitest";
import { checkPurchase, purchaseProblemText } from "./shop";

const owl = { unlock_type: "shop" as const, price: 200 };

describe("checkPurchase", () => {
  it("lets you buy a shop Buddy you can afford, and says what's left", () => {
    expect(checkPurchase({ avatar: owl, owned: false, balance: 200 })).toEqual({ ok: true, price: 200, left: 0 });
    expect(checkPurchase({ avatar: owl, owned: false, balance: 260 })).toEqual({ ok: true, price: 200, left: 60 });
  });

  it("says how many more tokens you need", () => {
    expect(checkPurchase({ avatar: owl, owned: false, balance: 140 })).toEqual({ ok: false, reason: "not_enough", missing: 60 });
    expect(checkPurchase({ avatar: owl, owned: false, balance: -5 })).toEqual({ ok: false, reason: "not_enough", missing: 200 });
  });

  it("never sells a Buddy you own, a starter, or a streak Buddy", () => {
    expect(checkPurchase({ avatar: owl, owned: true, balance: 999 })).toEqual({ ok: false, reason: "owned" });
    expect(checkPurchase({ avatar: { unlock_type: "starter", price: null }, owned: false, balance: 999 })).toEqual({ ok: false, reason: "not_for_sale" });
    expect(checkPurchase({ avatar: { unlock_type: "streak", price: null }, owned: false, balance: 999 })).toEqual({ ok: false, reason: "not_for_sale" });
  });
});

it("purchaseProblemText is plain and kind", () => {
  expect(purchaseProblemText({ ok: false, reason: "not_enough", missing: 1 }, "Owl")).toBe(
    "You need 1 more token for Owl. Finish routines to earn more.",
  );
  expect(purchaseProblemText({ ok: false, reason: "owned" }, "Owl")).toBe("You already have Owl.");
});
