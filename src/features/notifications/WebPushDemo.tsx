"use client";

import { useState } from "react";
import { enablePush } from "./pushClient";

export function WebPushDemo() {
  const [subscription, setSubscription] = useState("");
  const [status, setStatus] = useState("Notifications are off until you choose Enable notifications.");
  const [busy, setBusy] = useState(false);
  async function enable() {
    setBusy(true);
    try {
      const sub = await enablePush(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "");
      setSubscription(JSON.stringify(sub.toJSON(), null, 2));
      setStatus("Ready. Copy your subscription and save it using the README commands.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not enable notifications. Try again.");
    } finally { setBusy(false); }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(subscription);
      setStatus("Copied. Save the clipboard to .local/push-subscription.json, then close this tab.");
    } catch {
      setStatus("Copy was blocked. Select all text in the subscription box and copy it manually.");
    }
  }
  return (
    <section aria-labelledby="push-heading" style={{ fontSize: 18, lineHeight: 1.6, padding: 24, background: "white", color: "#172033", maxWidth: 720, margin: "auto" }}>
      <h1 id="push-heading">Bridge push test</h1>
      <p>Use Chrome or Edge. Keep the Bridge server running after closing this tab. On Android, open the test link directly in Chrome.</p>
      <button type="button" disabled={busy} onClick={enable} style={{ minHeight: 48, padding: 12, border: "2px solid", font: "inherit" }}>Enable notifications</button>
      <p role="status">{status}</p>
      {subscription && <>
        <label htmlFor="push-subscription">Your test subscription (keep this private)</label>
        <textarea id="push-subscription" readOnly value={subscription} rows={8} style={{ width: "100%", fontSize: 18 }} />
        <button type="button" onClick={copy} style={{ minHeight: 48, padding: 12, border: "2px solid", font: "inherit" }}>Copy test subscription</button>
        <p>Send from your second terminal after closing this tab. The notification says “Bridge check-in”.</p>
      </>}
    </section>
  );
}
