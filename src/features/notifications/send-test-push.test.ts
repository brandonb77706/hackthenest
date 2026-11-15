import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { readSubscription, sendTestPush } from "./send-test-push.mjs";

const subscription = { endpoint: "https://fcm.googleapis.com/test", keys: { p256dh: "B" + "A".repeat(86), auth: "A".repeat(22) } };
describe("local sender", () => {
  it("loads in native Node without sending or reading a subscription", () => {
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", "await import('./src/features/notifications/send-test-push.mjs'); console.log('loaded');"], { cwd: process.cwd(), encoding: "utf8" });
    expect(output.trim()).toBe("loaded");
  });
  it("reads the browser JSON including Windows UTF-8 BOM", () => {
    expect(readSubscription("\uFEFF" + JSON.stringify(subscription))).toEqual(subscription);
  });
  it.each(["not json", "{}", JSON.stringify({ ...subscription, keys: {} }), JSON.stringify({ ...subscription, endpoint: "http://localhost/test" }), JSON.stringify({ ...subscription, endpoint: "https://fcm.googleapis.com.evil.example/test" })])("rejects invalid subscription input", (input) => {
    expect(() => readSubscription(input)).toThrow();
  });
  it("sends once with a short TTL and generic content", async () => {
    const send = vi.fn().mockResolvedValue({ statusCode: 201 });
    await sendTestPush(subscription, { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_KEY: "private", VAPID_SUBJECT: "mailto:test@example.com" }, send);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][1]).toBe('{"title":"Bridge check-in"}');
    expect(send.mock.calls[0][2]).toMatchObject({ TTL: 60, timeout: 10000 });
  });
  it("does not send without VAPID configuration", async () => {
    const send = vi.fn();
    await expect(sendTestPush(subscription, {}, send)).rejects.toThrow("Fill");
    expect(send).not.toHaveBeenCalled();
  });
  it("propagates provider rejection to the CLI handler", async () => {
    const send = vi.fn().mockRejectedValue({ statusCode: 410 });
    await expect(sendTestPush(subscription, { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public", VAPID_PRIVATE_KEY: "private", VAPID_SUBJECT: "mailto:test@example.com" }, send)).rejects.toEqual({ statusCode: 410 });
  });
});
