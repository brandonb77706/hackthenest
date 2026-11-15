"use client";

// The guardian's tab bar from the design: Today, Routines, Contacts, Me.
// No Help or Scan: those are for the person using Bridge.

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/bridge/Icon";

const TABS: { path: string; label: string; icon: IconName }[] = [
  { path: "", label: "Today", icon: "today" },
  { path: "/routines", label: "Routines", icon: "routines" },
  { path: "/contacts", label: "Contacts", icon: "people" },
  { path: "/me", label: "Me", icon: "me" },
];

export function GuardianTabBar() {
  const { personId } = useParams<{ personId: string }>();
  const pathname = usePathname() ?? "";
  const base = `/guardian/${personId}`;
  const current = [...TABS].reverse().find((t) => (t.path === "" ? pathname === base : pathname.startsWith(base + t.path))) ?? TABS[0];

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-1/2 z-10 box-border grid h-[84px] w-full max-w-[480px] -translate-x-1/2 grid-cols-4 border-t-[3px] border-tab-border bg-surface px-1.5 py-2"
    >
      {TABS.map((tab) => {
        const on = tab === current;
        return (
          <Link
            key={tab.label}
            href={base + tab.path}
            aria-current={on ? "page" : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 no-underline ${on ? "text-ink" : "text-ink2"}`}
          >
            <span
              className={`flex h-10 w-[58px] items-center justify-center rounded-[14px] ${
                on ? "bg-primary-soft text-primary-text shadow-[inset_0_0_0_2px_var(--br-cta)]" : "text-ink2"
              }`}
            >
              <Icon name={tab.icon} size={28} />
            </span>
            <span className={`font-display text-[15px] ${on ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
