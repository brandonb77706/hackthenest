// Shared class names for the Bridge design: chunky buttons with a bottom edge,
// cards, headings. Colors come from the tokens in src/app/globals.css.

export const br = {
  /** Main action: blue fill with a darker bottom edge */
  cta: "br-press border-2 border-cta-edge bg-cta text-cta-ink shadow-[0_5px_0_var(--br-cta-edge)] font-display font-bold disabled:opacity-60",
  /** Secondary action: white with a grey bottom edge */
  ghost:
    "br-press border-2 border-line bg-surface text-ink shadow-[0_4px_0_var(--br-line)] font-display font-semibold disabled:opacity-60",
  card: "border-2 border-line bg-surface",
  /** Text button, e.g. "Type it instead" */
  link: "min-h-12 border-0 bg-transparent px-2 font-display text-[17px] font-semibold text-primary-text",
  h1: "m-0 font-display text-[28px] font-bold leading-[1.15]",
  h2: "m-0 font-display text-[20px] font-bold",
  input:
    "box-border min-h-[54px] w-full rounded-[14px] border-2 border-line bg-surface px-4 text-[18px] text-ink placeholder:text-ink2",
  label: "font-display text-[16px] font-semibold",
  /** Selected and unselected choices in a group (days, time, size) */
  choiceOn: "border-[3px] border-switch-on bg-primary-soft text-ink",
  choiceOff: "border-[3px] border-line bg-surface text-ink",
} as const;

/** A square icon button, 44px, like the step controls. */
export const iconButton = `${br.ghost} flex size-11 shrink-0 items-center justify-center rounded-xl p-0`;
