"use client";

import Link from "next/link";
import { useState } from "react";
import { Buddy } from "@/components/bridge/Buddy";
import { br } from "@/components/bridge/styles";

type Message = { role: "user" | "buddy"; text: string; emergency?: boolean };
export function BuddyChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setMessages((items) => [...items, { role: "user", text: message }]);
    setInput(""); setBusy(true); setError("");
    try {
      const response = await fetch("/api/buddy-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await response.json();
      if (!response.ok || typeof data.reply !== "string") throw new Error("request failed");
      setMessages((items) => [...items, { role: "buddy", text: data.reply, emergency: data.emergency === true }]);
    } catch { setError("Buddy couldn't answer right now. Please try again."); setInput(message); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 bg-canvas p-4 pb-32 text-ink">
    <div className="flex items-center gap-3"><Link href="/" className={`${br.ghost} flex min-h-12 items-center rounded-xl px-4 no-underline`}>Back</Link><h1 className={br.h1}>Chat with Buddy</h1></div>
    <div className={`${br.card} flex items-center gap-4 rounded-2xl p-4`}><Buddy size={72} /><p className="m-0 text-[18px]">Hi! I&apos;m Buddy, an AI helper. Ask me how you&apos;re doing this week.</p></div>
    <p className="m-0 text-[16px] text-ink2">Your message and a summary of your last 7 days of check-ins are sent to Google Gemini. Chat is not saved by Bridge.</p>
    <div role="log" aria-live="polite" aria-label="Conversation" className="flex flex-col gap-3">{messages.map((item, index) => <div key={index} className="flex items-start gap-3">
      {item.role === "buddy" && <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-line bg-primary-soft"><Buddy size={42} /></div>}
      <div className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface p-4 text-[18px]"><strong>{item.role === "user" ? "You" : "Buddy"}</strong><p className="mb-0 whitespace-pre-wrap break-words">{item.text}</p>{item.emergency && <div className="mt-3 flex flex-wrap gap-3"><a className={`${br.cta} rounded-xl p-3`} href="tel:911">Call 911</a><a className={`${br.ghost} rounded-xl p-3`} href="tel:988">Call 988</a></div>}</div>
    </div>)}</div>
    {busy && <p role="status">Buddy is thinking…</p>}{error && <p role="alert" className="text-danger-text">{error}</p>}
    <form onSubmit={send} className="flex flex-col gap-2"><label htmlFor="buddy-message" className="font-display text-[18px] font-semibold">Your message</label><textarea id="buddy-message" className={br.input} rows={3} maxLength={1000} value={input} onChange={(event) => setInput(event.target.value)} /><button type="submit" disabled={busy || !input.trim()} className={`${br.cta} min-h-14 rounded-2xl text-[18px]`}>Send</button></form>
  </div>;
}
