// What the Me screen shows. Plain functions, no database and no UI, so they are easy to test.

import type { Avatar, ID } from "@/lib/types";

export interface NextReward {
  label: string;
  /** 0 to 100, how full the progress bar is */
  percent: number;
  detail: string;
}

export interface MeSummary {
  /** Empty until the profile exists */
  name: string;
  tokens: number;
  /** Name of the equipped avatar, or null if none is equipped */
  buddyName: string | null;
  nextReward: NextReward | null;
}

type ShopAvatar = Pick<Avatar, "id" | "name" | "price">;

/** "1 token", "25 tokens" */
export function formatTokens(tokens: number): string {
  return `${tokens} ${tokens === 1 ? "coin" : "coins"}`;
}

/**
 * The cheapest shop Buddy the user doesn't have yet, and how close their tokens are to its price.
 * Null when the shop has nothing left for them.
 */
export function nextReward(tokens: number, shop: ShopAvatar[], ownedAvatarIds: ID[]): NextReward | null {
  const owned = new Set(ownedAvatarIds);
  const next = shop
    .filter((avatar): avatar is ShopAvatar & { price: number } => avatar.price !== null && avatar.price > 0)
    .filter((avatar) => !owned.has(avatar.id))
    .sort((a, b) => a.price - b.price)[0];
  if (!next) return null;

  const have = Math.max(0, tokens);
  const missing = next.price - have;
  return {
    label: `Next reward: ${next.name}`,
    percent: Math.min(100, Math.round((have / next.price) * 100)),
    detail:
      missing > 0
        ? `${formatTokens(missing)} more to get ${next.name}.`
        : `You have enough coins for ${next.name}.`,
  };
}

export interface BuddyChoice {
  id: ID;
  name: string;
  unlock_type: Avatar["unlock_type"];
  price: number | null;
  streak_required: number | null;
  owned: boolean;
  equipped: boolean;
  /** Starter Buddies are free to pick; others must be unlocked first (rewards). */
  can_choose: boolean;
}

type CatalogAvatar = Pick<Avatar, "id" | "name" | "unlock_type" | "price" | "streak_required">;

/** The Buddy picker: starters first, then the shop by price, then streak Buddies by streak length. */
export function buddyChoices(catalog: CatalogAvatar[], ownedAvatarIds: ID[], equippedId: ID | null): BuddyChoice[] {
  const owned = new Set(ownedAvatarIds);
  const rank = { starter: 0, shop: 1, streak: 2 } as const;
  return [...catalog]
    .sort(
      (a, b) =>
        rank[a.unlock_type] - rank[b.unlock_type] ||
        (a.price ?? a.streak_required ?? 0) - (b.price ?? b.streak_required ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .map((a) => ({
      ...a,
      owned: owned.has(a.id),
      equipped: a.id === equippedId,
      can_choose: owned.has(a.id) || a.unlock_type === "starter",
    }));
}

/** What a Buddy card says under its name. */
export function buddyTag(choice: BuddyChoice): string {
  if (choice.equipped) return "Your Buddy";
  if (choice.can_choose) return "Choose";
  if (choice.unlock_type === "shop" && choice.price) return formatTokens(choice.price);
  if (choice.unlock_type === "streak" && choice.streak_required) return `${choice.streak_required}-day streak`;
  return "Locked";
}
