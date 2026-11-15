import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Builder } from "@/features/routine-builder/components/Builder";
import { getRoutine } from "@/features/routine-builder/service";
import { getCurrentUserId } from "@/lib/db";

export default function EditRoutinePage(props: PageProps<"/routines/[id]/edit">) {
  return (
    <Suspense fallback={<p className="px-4 py-8">Loading your routine…</p>}>
      <EditRoutine params={props.params} />
    </Suspense>
  );
}

async function EditRoutine({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const routine = await getRoutine(await getCurrentUserId(), id);
  if (!routine) notFound();

  const initial = {
    title: routine.title,
    goal: routine.goal,
    days: routine.days,
    start_time: routine.start_time,
    tone: routine.tone,
    remind: routine.remind,
    steps: routine.steps.map((s) => ({ id: s.id, text: s.text, minutes: s.minutes })),
  };
  return <Builder routineId={routine.id} initial={initial} />;
}
