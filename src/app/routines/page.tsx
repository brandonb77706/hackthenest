import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { RoutineList } from "@/features/routine-builder/components/RoutineList";
import { listRoutines } from "@/features/routine-builder/service";
import { ui } from "@/features/routine-builder/ui";
import { getCurrentUserId } from "@/lib/db";
import { RoutineReminderMonitor } from "@/features/notifications/RoutineReminderMonitor";

export default function RoutinesPage() {
  return (
    <main className={`${ui.page} space-y-6`}>
      <h1 className={ui.h1}>My routines</h1>
      <Link href="/routines/new" className={ui.primary}>
        + New routine
      </Link>
      <RoutineReminderMonitor />
      <Suspense fallback={<p>Loading your routines…</p>}>
        <Routines />
      </Suspense>
    </main>
  );
}

async function Routines() {
  await connection();
  const routines = await listRoutines(await getCurrentUserId());
  return <RoutineList routines={routines} />;
}
