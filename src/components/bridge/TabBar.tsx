"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { getServerSettings, getSettings, subscribeSettings } from "@/lib/settings";
import { play, stop } from "@/lib/voice/player";
import { Buddy } from "./Buddy";
import { Icon, type IconName } from "./Icon";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  /** What the Buddy says on this tab */
  tip: string;
}

export const TABS: Tab[] = [
  { href: "/", label: "Today", icon: "today", tip: "Tap Start when you're ready. I'll read each step to you." },
  { href: "/routines", label: "Routines", icon: "routines", tip: "Tap a card to start that routine. Tap New to make one." },
  { href: "/scan", label: "Scan", icon: "scan", tip: "Got a letter or a bill? Soon you can take a picture and I'll explain it." },
  { href: "/get-help", label: "Help", icon: "help", tip: "Pick what you need. Nothing gets sent until you tap." },
  { href: "/me", label: "Me", icon: "me", tip: "This is your page. More is coming soon." },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The bottom tab bar, with the Buddy sitting on it. Tap the Buddy for a tip. */
export function TabBar() {
  const pathname = usePathname() ?? "/";
  const current = TABS.find((t) => isActive(pathname, t.href)) ?? TABS[0];
  // The tip closes on its own when you change tabs.
  const [tipFor, setTipFor] = useState<string | null>(null);
  const tipOpen = tipFor === current.href;
  const { showBuddy, buddyName } = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);

  function toggleTip() {
    if (tipOpen) {
      setTipFor(null);
      stop();
    } else {
      setTipFor(current.href);
      void play(current.tip);
    }
  }

  return (
    <>
      {showBuddy && tipOpen && (
        <div
          role="status"
          className="fixed bottom-[172px] left-1/2 z-30 ml-[calc(min(100vw,480px)/2-266px)] w-[250px] rounded-[18px] border-2 border-line bg-surface px-4 py-3.5 text-[16px] text-ink shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
        >
          <strong className="font-display">{buddyName}:</strong> {current.tip}
          <Link href="/buddy-chat" onClick={() => { setTipFor(null); stop(); }} className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-primary-soft px-4 font-display text-[18px] font-bold text-primary-text">Chat with Buddy</Link>
        </div>
      )}

      {showBuddy && (
        <button
          type="button"
          onClick={toggleTip}
          aria-label={`${buddyName}, your Buddy. Tap for a tip.`}
          aria-expanded={tipOpen}
          className="br-hold fixed bottom-[77px] left-1/2 z-20 ml-[calc(min(100vw,480px)/2-96px)] size-[74px] border-0 bg-transparent p-0"
        >
          <Buddy size={74} paws />
        </button>
      )}

      <nav
        aria-label="Main"
        className="fixed bottom-0 left-1/2 z-10 box-border grid h-[84px] w-full max-w-[480px] -translate-x-1/2 grid-cols-5 border-t-[3px] border-tab-border bg-surface px-1.5 py-2"
      >
        {TABS.map((tab) => {
          const on = tab.href === current.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 no-underline ${on ? "text-ink" : "text-ink2"}`}
            >
              <span
                className={`flex h-10 w-[58px] items-center justify-center rounded-[14px] ${
                  on
                    ? "bg-primary-soft text-primary-text shadow-[inset_0_0_0_2px_var(--br-cta)]"
                    : tab.icon === "help"
                      ? "text-danger"
                      : "text-ink2"
                }`}
              >
                <Icon name={tab.icon} size={28} />
              </span>
              <span className={`font-display text-[15px] ${on ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
