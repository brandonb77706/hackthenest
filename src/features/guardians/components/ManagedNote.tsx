import { lockedText, type AreaRule, type EditArea } from "../editRules";

/** "Sam manages your routines. Ask Sam to make changes." Shown where New or Edit would be. */
export function ManagedNote({ area, rule }: { area: EditArea; rule: AreaRule }) {
  return <p className="m-0 rounded-2xl bg-primary-soft px-4 py-3.5 text-[17px]">{lockedText(area, rule)}</p>;
}
