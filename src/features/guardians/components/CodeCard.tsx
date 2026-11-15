"use client";

import { useState } from "react";
import { br } from "@/components/bridge/styles";
import { expiresText, formatCode } from "../codes";

/** A setup code, big and easy to read out, with a Copy button. */
export function CodeCard({ code, expiresAt }: { code: string; expiresAt: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard blocked (some phones over plain http): the code is still on screen.
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] border-[3px] border-switch-on bg-primary-soft px-4 py-5 text-center">
      <span className="text-[16px] font-bold text-ink2">Your code</span>
      <span
        aria-label={`Code: ${[...code].join(" ")}`}
        className="font-mono text-[40px] font-bold tracking-[0.12em] text-ink"
      >
        {formatCode(code)}
      </span>
      <span className="text-[16px] text-ink2">{expiresText(expiresAt)}</span>
      <button type="button" onClick={copy} className={`${br.ghost} mt-1 min-h-12 rounded-xl px-5 text-[17px]`}>
        {copied ? "Copied" : "Copy code"}
      </button>
    </div>
  );
}
