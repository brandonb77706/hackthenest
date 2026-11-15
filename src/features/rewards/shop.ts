// Buying a Buddy with tokens. Plain rules, no database, so they are easy to test.
// From docs/rewards.md: only shop Buddies are for sale (starters are free, streak
// Buddies are earned), and you can only spend tokens you have.

import type { Avatar } from "@/lib/types";

export type PurchaseCheck =
  | { ok: true; price: number; left: number }
  | { ok: false; reason: "not_for_sale" | "owned" }
  | { ok: false; reason: "not_enough"; missing: number };

export function checkPurchase(input: {
  avatar: Pick<Avatar, "unlock_type" | "price">;
  owned: boolean;
  balance: number;
}): PurchaseCheck {
  const { avatar, owned, balance } = input;
  if (owned) return { ok: false, reason: "owned" };
  if (avatar.unlock_type !== "shop" || avatar.price === null || avatar.price <= 0) return { ok: false, reason: "not_for_sale" };
  const have = Math.max(0, balance);
  if (have < avatar.price) return { ok: false, reason: "not_enough", missing: avatar.price - have };
  return { ok: true, price: avatar.price, left: have - avatar.price };
}

/** Plain words for the screen. */
export function purchaseProblemText(check: Exclude<PurchaseCheck, { ok: true }>, name: string): string {
  switch (check.reason) {
    case "owned":
      return `You already have ${name}.`;
    case "not_for_sale":
      return `${name} can't be bought with coins.`;
    case "not_enough":
      return `You need ${check.missing} more ${check.missing === 1 ? "coin" : "coins"} for ${name}. Finish routines to earn more.`;
  }
}
