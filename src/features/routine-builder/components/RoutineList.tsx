import Link from "next/link";
import { formatDays, formatStepCount, formatTime } from "../format";
import type { RoutineSummary } from "../service";
import { ui } from "../ui";

export function RoutineList({ routines }: { routines: RoutineSummary[] }) {
  if (routines.length === 0) {
    return <p className="text-lg">You don&apos;t have any routines yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {routines.map((routine) => (
        <li key={routine.id} className={ui.card}>
          <h2 className={ui.h2}>{routine.title}</h2>
          <p className="mt-1">
            {formatTime(routine.start_time)} · {formatDays(routine.days)}
          </p>
          <p>{formatStepCount(routine.step_count)}</p>
          <Link href={`/routines/${routine.id}/edit`} className={`${ui.secondary} mt-3 w-full`}>
            Edit<span className="sr-only"> {routine.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
