import Link from "next/link";
import { br } from "@/components/bridge/styles";
import type { AreaRule } from "../editRules";
import { ManagedNote } from "./ManagedNote";

/** Shown instead of the routine builder when a guardian manages routines. */
export function RoutineLocked({ rule }: { rule: AreaRule }) {
  return (
    <div className="flex flex-col gap-4 px-5 pt-10">
      <h1 className={br.h1}>Routines are managed for you</h1>
      <ManagedNote area="routines" rule={rule} />
      <p className="m-0 text-[18px] text-ink2">You can still start and finish your routines.</p>
      <Link href="/routines" className={`${br.cta} flex min-h-[58px] items-center justify-center rounded-2xl text-[20px] no-underline`}>
        Back to Routines
      </Link>
    </div>
  );
}
