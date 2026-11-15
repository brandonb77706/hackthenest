"use client";

import { useState, type FormEvent } from "react";
import { br } from "@/components/bridge/styles";
import { CODE_LENGTH } from "../codes";

export interface Linked {
  link_id: string;
  /** Name of the person on the other side */
  other_name: string;
  /** The name a guardian gave when setting Bridge up, if any */
  name: string | null;
}

/** Type a setup code from the other person and link the accounts. */
export function EnterCode({ onLinked, hint }: { onLinked: (linked: Linked) => void; hint: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/links/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<Linked> & { error?: string };
      if (!res.ok) throw new Error(body.error || "That code didn't work. Try again.");
      onLinked({ link_id: body.link_id ?? "", other_name: body.other_name ?? "", name: body.name ?? null });
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't check the code. Check your internet.");
    } finally {
      setBusy(false);
    }
  }

  const ready = code.replace(/[\s-]/g, "").length === CODE_LENGTH;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="m-0 text-[17px] text-ink2">{hint}</p>
      <label htmlFor="setup-code" className={`${br.label} -mb-1`}>
        Code
      </label>
      <input
        id="setup-code"
        autoComplete="one-time-code"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={CODE_LENGTH + 2}
        placeholder="ABC 234"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        className={`${br.input} font-mono text-[24px] tracking-[0.12em]`}
      />
      {error && (
        <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
          {error}
        </p>
      )}
      <button type="submit" disabled={!ready || busy} className={`${br.cta} min-h-[58px] rounded-2xl text-[20px]`}>
        {busy ? "Checking…" : "Link"}
      </button>
    </form>
  );
}
