import { afterEach, describe, expect, it, vi } from "vitest";
import { enablePush } from "./pushClient";

const publicKey = "B" + "A".repeat(86);
function setup(permission = "granted", existing: object | null = null) {
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("PushManager", {});
  const requestPermission = vi.fn().mockResolvedValue(permission);
  vi.stubGlobal("Notification", { requestPermission });
  const subscribe = vi.fn().mockResolvedValue({ endpoint: "test" });
  const register = vi.fn().mockResolvedValue({ active: {}, pushManager: { getSubscription: vi.fn().mockResolvedValue(existing), subscribe } });
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  return { register, subscribe, requestPermission };
}
afterEach(() => vi.unstubAllGlobals());
describe("desktop push opt-in", () => {
  it("requests permission and subscribes with the scoped worker", async () => {
    const { register, subscribe } = setup();
    await enablePush(publicKey);
    expect(register).toHaveBeenCalledWith("/notifications/sw.js", { scope: "/notifications/", updateViaCache: "none" });
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) });
  });
  it("does not register or subscribe when permission is denied", async () => {
    const { register } = setup("denied");
    await expect(enablePush(publicKey)).rejects.toThrow("not allowed");
    expect(register).not.toHaveBeenCalled();
  });
  it("reuses an existing subscription with the same application key", async () => {
    const key = Uint8Array.from(atob(publicKey + "="), c => c.charCodeAt(0));
    const existing = { options: { applicationServerKey: key.buffer } };
    const { subscribe } = setup("granted", existing);
    expect(await enablePush(publicKey)).toBe(existing);
    expect(subscribe).not.toHaveBeenCalled();
  });
  it("rejects a rotated application key without replacing the subscription", async () => {
    const { subscribe } = setup("granted", { options: { applicationServerKey: new Uint8Array(65).buffer } });
    await expect(enablePush(publicKey)).rejects.toThrow("different key");
    expect(subscribe).not.toHaveBeenCalled();
  });
  it("rejects missing configuration before permission is requested", async () => {
    const { requestPermission } = setup();
    await expect(enablePush("")).rejects.toThrow("NEXT_PUBLIC");
    expect(requestPermission).not.toHaveBeenCalled();
  });
  it("rejects an insecure context", async () => {
    setup(); vi.stubGlobal("isSecureContext", false);
    await expect(enablePush(publicKey)).rejects.toThrow("localhost");
  });
});
