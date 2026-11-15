import type { IconName } from "@/components/bridge/Icon";

/** Picks a picture for a step from its words. Falls back to a check mark. */
const RULES: [RegExp, IconName][] = [
  [/\b(pill|pills|medicine|medication|meds|vitamin)\b/i, "pill"],
  [/\b(teeth|tooth|brush|floss)\b/i, "tooth"],
  [/\b(dress|dressed|clothes|shirt|pants|pajamas|shoes|socks|jacket|coat)\b/i, "shirt"],
  [/\b(eat|breakfast|lunch|dinner|snack|food|meal|cereal|cook)\b/i, "bowl"],
  [/\b(walk|go to|leave|drive|bus|commute|run)\b/i, "walk"],
  [/\b(phone|call|text|charge|plug)\b/i, "phone"],
  [/\b(letter|bill|form|paper|mail|read|sign)\b/i, "doc"],
  [/\b(bed|sleep|lights|night)\b/i, "moon"],
  [/\b(wake|morning|curtains)\b/i, "sun"],
];

export function stepIcon(text: string): IconName {
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? "check";
}
