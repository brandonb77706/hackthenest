"use client";

// One color scheme as a choice card, drawn in its own colors. Used on Me and on Welcome.
// Put it inside an element with role="radiogroup".

import type { COLOR_SCHEMES, ColorSchemeId } from "@/lib/theme";

interface Props {
  scheme: (typeof COLOR_SCHEMES)[number];
  selected: boolean;
  onPick: (id: ColorSchemeId) => void;
  /** Badge on the selected card */
  selectedLabel?: string;
}

export function SchemeCard({ scheme: s, selected, onPick, selectedLabel = "In use" }: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onPick(s.id)}
      className={`br-press flex flex-col overflow-hidden rounded-[20px] p-0 text-left ${selected ? "border-[3px] border-switch-on" : "border-2 border-line"}`}
      style={{ background: s.preview.canvas, color: s.preview.ink }}
    >
      <span
        className="box-border flex w-full items-center justify-between gap-2.5 px-4 py-3.5"
        style={{ background: s.preview.hero, color: s.preview.heroInk }}
      >
        <strong className="font-display text-[19px] font-bold leading-tight">{s.name}</strong>
        <span aria-hidden="true" className="flex shrink-0 gap-[5px]">
          {s.swatches.map((c) => (
            <span
              key={c}
              className="size-[22px] rounded-full border-2 border-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
              style={{ background: c }}
            />
          ))}
        </span>
      </span>
      <span className="flex flex-col gap-1 px-4 pb-3.5 pt-3">
        <span className="text-[15px] font-bold">For: {s.who}</span>
        <span className="text-[15px] leading-[1.35]" style={{ color: s.preview.ink2 }}>
          {s.description}
        </span>
        {selected && (
          <span className="mt-1 self-start rounded-full bg-switch-on px-2.5 py-0.5 text-[15px] font-bold text-knob">
            {selectedLabel}
          </span>
        )}
      </span>
    </button>
  );
}
