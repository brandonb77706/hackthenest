"use client";

// The user's Buddy, from their settings. The fox is the main Buddy.

import { useSyncExternalStore } from "react";
import { getServerSettings, getSettings, subscribeSettings } from "@/lib/settings";
import { BuddyAvatar } from "./BuddyAvatar";

interface Props {
  size?: number;
  /** Paws at the bottom, for when the Buddy holds the tab bar */
  paws?: boolean;
}

export function useBuddyName(): string {
  return useSyncExternalStore(subscribeSettings, getSettings, getServerSettings).buddyName;
}

export function Buddy({ size = 100, paws = false }: Props) {
  const name = useBuddyName();
  return <BuddyAvatar name={name} size={size} paws={paws} />;
}
