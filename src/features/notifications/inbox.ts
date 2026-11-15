// The reminders shown on this device, newest first, for the bell on Today.
// Kept on the device; there's no server copy yet.

export interface InboxItem {
  id: string;
  routineId: string;
  title: string;
  body: string;
  /** ISO time it was shown */
  at: string;
  read: boolean;
}

const KEY = "bridge:notifications:inbox:v1";
const MAX = 30;
const listeners = new Set<() => void>();
let cached: InboxItem[] | null = null;
const EMPTY: InboxItem[] = [];

function read(): InboxItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((i): i is InboxItem => !!i && typeof i.id === "string" && typeof i.title === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

function write(items: InboxItem[]) {
  cached = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage off: still works for this visit.
  }
  listeners.forEach((l) => l());
}

export function getInbox(): InboxItem[] {
  if (typeof window === "undefined") return EMPTY;
  cached ??= read();
  return cached;
}

export function getServerInbox(): InboxItem[] {
  return EMPTY;
}

export function subscribeInbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addToInbox(item: Omit<InboxItem, "read">): void {
  const rest = getInbox().filter((i) => i.id !== item.id);
  write([{ ...item, read: false }, ...rest].slice(0, MAX));
}

export function markAllRead(): void {
  const items = getInbox();
  if (items.some((i) => !i.read)) write(items.map((i) => ({ ...i, read: true })));
}

export function unreadCount(items: InboxItem[]): number {
  return items.filter((i) => !i.read).length;
}

/** "now", "5 min ago", "2:15 PM", or "Yesterday" */
export function whenLabel(at: string, now = new Date()): string {
  const then = new Date(at);
  const minutes = Math.round((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min ago`;
  const sameDay = then.toDateString() === now.toDateString();
  if (sameDay) return then.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return "Yesterday";
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** For tests. */
export function resetInboxCache(): void {
  cached = null;
}
