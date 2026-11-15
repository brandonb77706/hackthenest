import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/bridge/Icon";
import { PlaceholderTab } from "@/features/home/components/PlaceholderTab";

export const metadata: Metadata = { title: "Get help · Bridge" };

// The Help tab (owner: George). Replace this placeholder with the real screen.
// George's lost mode lives at /help for now, so this links to it.
export default function GetHelpPage() {
  return (
    <PlaceholderTab
      title="Get help"
      icon="help"
      lead="Call someone, share where you are, or have your phone speak for you."
      owner="George"
    >
      <Link
        href="/help"
        className="tone-teal br-press flex min-h-[84px] items-center gap-3.5 rounded-[20px] bg-tone px-[18px] py-3.5 text-ink no-underline shadow-[0_5px_0_var(--t-edge)]"
      >
        <Icon name="location" size={34} className="shrink-0" />
        <span className="flex flex-col">
          <span className="font-display text-[21px] font-bold">I&apos;m lost</span>
          <span className="text-[16px]">Try lost mode. Nothing is sent until you tap.</span>
        </span>
      </Link>
    </PlaceholderTab>
  );
}
