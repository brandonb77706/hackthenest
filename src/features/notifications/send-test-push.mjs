import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sendNotification } from "web-push";

export function readSubscription(text) {
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch { throw new Error("Subscription file is not valid JSON. Copy it again from the test page."); }
  let endpoint;
  try { endpoint = new URL(value?.endpoint); } catch { throw new Error("Subscription endpoint is missing or invalid."); }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.port ||
      !(endpoint.hostname === "fcm.googleapis.com" || endpoint.hostname.endsWith(".notify.windows.com"))) {
    throw new Error("Expected a Chrome or Edge HTTPS push-service endpoint.");
  }
  if (!/^[A-Za-z0-9_-]{87}$/.test(value?.keys?.p256dh ?? "") || !/^[A-Za-z0-9_-]{22}$/.test(value?.keys?.auth ?? "")) {
    throw new Error("Subscription encryption keys are missing or invalid.");
  }
  return { endpoint: endpoint.href, keys: { p256dh: value.keys.p256dh, auth: value.keys.auth } };
}

export async function sendTestPush(subscription, env, send = sendNotification) {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("Fill NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT in .env.");
  if (!/^mailto:[^\s@]+@[^\s@]+$/.test(subject)) throw new Error("VAPID_SUBJECT must be mailto: followed by your contact email.");
  return send(subscription, JSON.stringify({ title: "Bridge check-in" }), {
    vapidDetails: { publicKey, privateKey, subject }, TTL: 60, urgency: "high", timeout: 10000,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const subscription = readSubscription(readFileSync(resolve(".local/push-subscription.json"), "utf8"));
    await sendTestPush(subscription, process.env);
    console.log("Push service accepted the test. Check the desktop notification; acceptance does not confirm delivery.");
  } catch (error) {
    // Do not print provider errors: they can include the private subscription URL.
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      console.error("Subscription expired. Clear localhost site data, enable again, and replace the saved file.");
    } else if (error?.code === "ENOENT") {
      console.error("Save the copied subscription to .local/push-subscription.json first.");
    } else {
      console.error("Push was not sent. Check the subscription JSON, matching VAPID keys, mailto subject, and internet connection. No credentials were logged.");
    }
    process.exitCode = 1;
  }
}
