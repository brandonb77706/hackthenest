"use client";

// The bell on Today, from the design: how many reminders are new, and a list
// of recent ones. Tapping one opens that routine.

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Dialog } from "@/components/bridge/Dialog";
import { Icon } from "@/components/bridge/Icon";
import { getInbox, getServerInbox, markAllRead, subscribeInbox, unreadCount, whenLabel } from "../inbox";

export function NotificationBell() {
  const items = useSyncExternalStore(subscribeInbox, getInbox, getServerInbox);
  const [open, setOpen] = useState(false);
  const unread = unreadCount(items);

  function openList() {
    setOpen(true);
    markAllRead();
  }

  return (
    <>
      <button
        type="button"
        onClick={openList}
        aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
        className="relative flex size-12 shrink-0 items-center justify-center rounded-[14px] border-0 bg-chip p-0 text-chip-ink"
      >
        <Icon name="bell" size={24} strokeWidth={2.2} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-danger px-1 text-[13px] font-bold text-on-danger"
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <Dialog title="Notifications" onClose={() => setOpen(false)}>
          {items.length === 0 ? (
            <p className="m-0 text-ink2">
              No reminders yet. When a routine is coming up, Bridge reminds you here, 10 minutes before it starts.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[20px] border-2 border-line p-0">
              {items.map((n, i) => (
                <li key={n.id} className={i > 0 ? "border-t-2 border-line" : ""}>
                  <Link
                    href={`/play/${n.routineId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3.5 text-ink no-underline"
                  >
                    <span
                      aria-hidden="true"
                      className="tone-teal flex size-10 shrink-0 items-center justify-center rounded-xl bg-tone text-tone-ink"
                    >
                      <Icon name="clock" size={22} strokeWidth={2.2} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <strong className="text-[17px] leading-tight">{n.title}</strong>
                      <span className="text-[15px] text-ink2">
                        {whenLabel(n.at)} · {n.body}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="br-press min-h-[58px] rounded-2xl border-2 border-cta-edge bg-cta font-display text-[20px] font-bold text-cta-ink shadow-[0_5px_0_var(--br-cta-edge)]"
          >
            Done
          </button>
        </Dialog>
      )}
    </>
  );
}
