export const TEST_PATH = "/notifications/test";

export async function enablePush(publicKey: string): Promise<PushSubscription> {
  const tunnel = process.env.NEXT_PUBLIC_PUSH_TUNNEL_TEST === "true" && window.location.protocol === "https:" && window.location.hostname.endsWith(".trycloudflare.com");
  if ((window.location.hostname !== "localhost" && !tunnel) || !window.isSecureContext) {
    throw new Error("Open this test on localhost or the enabled HTTPS test tunnel.");
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("This browser does not support web push. Use Chrome directly.");
  }
  if (!/^[A-Za-z0-9_-]{87}$/.test(publicKey)) {
    throw new Error("Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env, then restart Bridge.");
  }
  const key = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "="), (c) => c.charCodeAt(0));
  if (key[0] !== 4) throw new Error("The VAPID public key is invalid.");
  // Called directly from the Enable button, before asynchronous registration.
  if (await Notification.requestPermission() !== "granted") {
    throw new Error("Notifications were not allowed. Change this site's notification permission in browser settings to retry.");
  }
  const registration = await navigator.serviceWorker.register("/notifications/sw.js", {
    scope: "/notifications/", updateViaCache: "none",
  });
  if (!registration.active) {
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing ?? registration.waiting;
      if (!worker) return reject(new Error("Worker installation failed. Reload and try again."));
      const timer = window.setTimeout(() => finish(new Error("Worker activation timed out. Reload and try again.")), 15000);
      function finish(error?: Error) {
        window.clearTimeout(timer);
        worker?.removeEventListener("statechange", changed);
        if (error) reject(error); else resolve();
      }
      function changed() {
        if (worker?.state === "activated") finish();
        if (worker?.state === "redundant") finish(new Error("Worker installation failed. Reload and try again."));
      }
      worker.addEventListener("statechange", changed);
      changed();
    });
  }
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const oldKey = existing.options.applicationServerKey;
    if (!oldKey || new Uint8Array(oldKey).some((value, i) => value !== key[i]) || oldKey.byteLength !== key.length) {
      throw new Error("The saved subscription uses a different key. Clear localhost site data, reload, and enable again.");
    }
    return existing;
  }
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}
