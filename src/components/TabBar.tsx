// The bottom tab bar from the design mockups. Needs a className="bridge" wrapper
// (see bridge-theme.css) for its colors.
//
// Only screens that exist are listed. When Scan is built, add it between
// Routines and Help.

import Link from "next/link";
import type { ReactNode } from "react";

export type TabId = "today" | "routines" | "help" | "me";

const TABS: { id: TabId; label: string; href: string; icon: ReactNode }[] = [
  {
    id: "today",
    label: "Today",
    href: "/",
    icon: (
      <>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </>
    ),
  },
  {
    id: "routines",
    label: "Routines",
    href: "/routines",
    icon: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3" />
      </>
    ),
  },
  {
    id: "help",
    label: "Help",
    href: "/help",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" />
        <path d="M12 17h.01" />
      </>
    ),
  },
  {
    id: "me",
    label: "Me",
    href: "/me",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>
    ),
  },
];

export function TabBar({ current }: { current: TabId }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-(--br-tab-border) bg-(--br-surface)"
    >
      <ul className="mx-auto grid h-[81px] max-w-[480px] grid-cols-4 px-1.5 py-2">
        {TABS.map((tab) => {
          const on = tab.id === current;
          // Help stays red so it's easy to find from any screen.
          const iconInk = on ? "text-(--br-primary-text)" : tab.id === "help" ? "text-(--br-danger)" : "text-(--br-ink2)";
          return (
            <li key={tab.id} className="flex">
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] no-underline ${
                  on ? "text-(--br-ink)" : "text-(--br-ink2)"
                }`}
              >
                <span
                  className={`flex h-10 w-[58px] items-center justify-center rounded-[14px] ${iconInk} ${
                    on ? "bg-(--br-tab-active-bg) shadow-[inset_0_0_0_2px_var(--br-tab-active-ring)]" : ""
                  }`}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {tab.icon}
                  </svg>
                </span>
                <span className={`br-display text-[15px] leading-tight ${on ? "font-semibold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
