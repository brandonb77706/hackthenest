"use client";

import type { ReactNode } from "react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}

/** A full-width on/off row, like "Every day" and "Remind me" in the design. */
export function Switch({ checked, onChange, children, className = "" }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-[58px] w-full items-center justify-between gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-2 text-left text-[17px] text-ink ${className}`}
    >
      <span className="flex flex-col">{children}</span>
      <span
        aria-hidden="true"
        className={`box-border flex h-8 w-14 shrink-0 items-center rounded-full p-[3px] ${checked ? "justify-end bg-switch-on" : "justify-start bg-line"}`}
      >
        <span className="size-[26px] rounded-full bg-knob" />
      </span>
    </button>
  );
}
