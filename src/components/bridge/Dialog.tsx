"use client";

// A popup that slides up from the bottom, like the design's badge sheet.
// Focus moves into it when it opens and back to what opened it when it
// closes. Escape, the backdrop, or the close button closes it.

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ title, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // The latest onClose, so focus is set up once when the popup opens, not on every render.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      // Keep Tab inside the popup.
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>(
        "button, a[href], input, textarea, select, [tabindex='0']",
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 border-0 bg-black/40 p-0"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative box-border flex max-h-[85dvh] w-full max-w-[480px] flex-col gap-3.5 overflow-y-auto rounded-t-[28px] border-t-[3px] border-switch-on bg-surface px-4 pb-7 pt-5 text-ink shadow-[0_-14px_36px_rgba(0,0,0,0.22)]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="dialog-title"
            ref={heading}
            tabIndex={-1}
            className="m-0 font-display text-[24px] font-bold leading-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent p-0 text-ink2"
          >
            <Icon name="close" size={22} strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
