// Whether a user can change their own routines and contacts. A guardian can
// turn this off; with several guardians, any one turning it off is enough.
// Doing routines, checking off steps and choosing what contacts see are never limited.
// Plain functions, no database, so they are easy to test.

export type EditArea = "routines" | "contacts";

export interface AreaRule {
  allowed: boolean;
  /** Names of the guardians who turned it off */
  managedBy: string[];
}

export type EditRules = Record<EditArea, AreaRule>;

export const ALL_ALLOWED: EditRules = {
  routines: { allowed: true, managedBy: [] },
  contacts: { allowed: true, managedBy: [] },
};

interface LinkRules {
  guardianName: string;
  user_can_edit_routines: boolean;
  user_can_edit_contacts: boolean;
}

export function editRules(links: LinkRules[]): EditRules {
  const area = (key: "user_can_edit_routines" | "user_can_edit_contacts"): AreaRule => {
    const managedBy = links.filter((l) => l[key] === false).map((l) => l.guardianName || "Your guardian");
    return { allowed: managedBy.length === 0, managedBy };
  };
  return { routines: area("user_can_edit_routines"), contacts: area("user_can_edit_contacts") };
}

function names(list: string[]): string {
  if (list.length <= 1) return list[0] ?? "Your guardian";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** "Sam manages your routines. Ask Sam to make changes." */
export function lockedText(area: EditArea, rule: AreaRule): string {
  const who = names(rule.managedBy);
  const what = area === "routines" ? "routines" : "trusted contacts";
  const ask = rule.managedBy.length === 1 ? who : "them";
  return `${who} ${rule.managedBy.length > 1 ? "manage" : "manages"} your ${what}. Ask ${ask} to make changes.`;
}

/** Only the sharing switches changed, which the user can always do. */
export function onlySharingChanged(
  before: { name: string; method: string; contact: string; relation: string },
  after: { name: string; method: string; contact: string; relation: string },
): boolean {
  return (
    before.name === after.name &&
    before.method === after.method &&
    before.contact === after.contact &&
    before.relation === after.relation
  );
}
