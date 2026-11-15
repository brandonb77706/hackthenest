// What a trusted contact or guardian can see, in words. Every setting starts off.

import type { TrustedContactPermissions } from "@/lib/types";

export const SHARING: {
  key: keyof TrustedContactPermissions;
  label: string;
  short: string;
}[] = [
  {
    key: "can_get_lost_alerts",
    label: "My location, only when I tap I'm lost",
    short: "your location when you're lost",
  },
  {
    key: "can_get_stuck_alerts",
    label: "If I'm stuck on a step",
    short: "when you're stuck",
  },
  {
    key: "can_see_routines",
    label: "When I finish a routine",
    short: "finished routines",
  },
];

/** "Sees: your location when you're lost · when you're stuck", or "Sees nothing". */
export function sharingSummary(c: TrustedContactPermissions): string {
  const on = SHARING.filter((s) => c[s.key]).map((s) => s.short);
  return on.length ? `Sees: ${on.join(" · ")}` : "Sees nothing";
}
