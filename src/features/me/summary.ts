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
  return `${tokens} ${tokens === 1 ? "token" : "tokens"}`;
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
        : `You have enough tokens for ${next.name}.`,
  };
}
