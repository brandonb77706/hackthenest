import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { pushWorkerSource } from "./pushWorker";
import { GET } from "@/app/notifications/sw.js/route";

function worker(windows: object[] = []) {
  const handlers: Record<string, (event: object) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  runInNewContext(pushWorkerSource, { URL, self: {
    addEventListener: (name: string, callback: (event: object) => void) => { handlers[name] = callback; },
    location: { origin: "http://localhost:3000" },
    registration: { showNotification },
    clients: { matchAll: vi.fn().mockResolvedValue(windows), openWindow },
  } });
  return { handlers, showNotification, openWindow };
}
describe("push worker", () => {
  it("displays only the fixed generic notification, even with an arbitrary payload", async () => {
    const { handlers, showNotification } = worker();
    const waitUntil = vi.fn();
    handlers.push({ data: { json: () => ({ title: "private details" }) }, waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(showNotification).toHaveBeenCalledWith("Bridge check-in", { body: "Open Bridge to check in.", tag: "bridge-local-test" });
  });
  it("opens the local test page when no tab exists", async () => {
    const { handlers, openWindow } = worker();
    const waitUntil = vi.fn(); const close = vi.fn();
    handlers.notificationclick({ notification: { close }, waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(close).toHaveBeenCalledOnce();
    expect(openWindow).toHaveBeenCalledWith("http://localhost:3000/notifications/test");
  });
  it("focuses the test tab rather than opening a duplicate", async () => {
    const focus = vi.fn();
    const { handlers, openWindow } = worker([{ url: "http://localhost:3000/notifications/test", focus }]);
    const waitUntil = vi.fn();
    handlers.notificationclick({ notification: { close: vi.fn() }, waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(focus).toHaveBeenCalledOnce(); expect(openWindow).not.toHaveBeenCalled();
  });
  it("serves JavaScript without caching only on localhost", async () => {
    const result = GET(new Request("http://localhost:3000/notifications/sw.js"));
    expect(result.headers.get("Content-Type")).toContain("application/javascript");
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(await result.text()).toBe(pushWorkerSource);
    expect(GET(new Request("https://example.com/notifications/sw.js")).status).toBe(404);
  });
});
