import { beforeEach, describe, expect, it, vi } from "vitest";
import { addToInbox, getInbox, markAllRead, resetInboxCache, subscribeInbox, unreadCount, whenLabel } from "./inbox";

const item = (id: string) => ({ id, routineId: "r1", title: `Title ${id}`, body: "Body", at: "2026-11-14T12:50:00Z" });

beforeEach(() => {
  localStorage.clear();
  resetInboxCache();
});

describe("inbox", () => {
  it("keeps the newest first, without repeats, and tells listeners", () => {
    const listener = vi.fn();
    subscribeInbox(listener);
    addToInbox(item("a"));
    addToInbox(item("b"));
    addToInbox(item("a"));
    expect(getInbox().map((i) => i.id)).toEqual(["a", "b"]);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("counts unread and marks everything read", () => {
    addToInbox(item("a"));
    addToInbox(item("b"));
    expect(unreadCount(getInbox())).toBe(2);
    markAllRead();
    expect(unreadCount(getInbox())).toBe(0);
  });

  it("keeps at most 30", () => {
    for (let i = 0; i < 35; i++) addToInbox(item(String(i)));
    expect(getInbox()).toHaveLength(30);
  });

  it("survives a reload", () => {
    addToInbox(item("a"));
    resetInboxCache();
    expect(getInbox().map((i) => i.id)).toEqual(["a"]);
  });
});

describe("whenLabel", () => {
  const now = new Date("2026-11-14T15:00:00");
  it("says how long ago in plain words", () => {
    expect(whenLabel(new Date("2026-11-14T14:59:40").toISOString(), now)).toBe("now");
    expect(whenLabel(new Date("2026-11-14T14:45:00").toISOString(), now)).toBe("15 min ago");
    expect(whenLabel(new Date("2026-11-14T08:31:00").toISOString(), now)).toBe("8:31 AM");
    expect(whenLabel(new Date("2026-11-13T20:00:00").toISOString(), now)).toBe("Yesterday");
  });
});
