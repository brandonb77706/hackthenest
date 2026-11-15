import type { Metadata } from "next";
import { PlaceholderTab } from "@/features/home/components/PlaceholderTab";

export const metadata: Metadata = { title: "Me · Bridge" };

// Profile, badges, Buddy, and color schemes (rewards: Nati). Replace this placeholder with the real screen.
export default function MePage() {
  return (
    <PlaceholderTab
      title="Me"
      icon="me"
      lead="Your badges, your Buddy, and your colors."
      owner="Nati"
    />
  );
}
