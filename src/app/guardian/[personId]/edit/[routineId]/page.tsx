import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePerson } from "@/features/guardians/person";
import { getRoutineFor } from "@/features/guardians/support";
import { Builder } from "@/features/routine-builder/components/Builder";

export const metadata: Metadata = { title: "Edit routine · Bridge" };

/** A guardian changes or deletes a routine: any one if shared, or one they added. */
export default function Page({ params }: PageProps<"/guardian/[personId]/edit/[routineId]">) {
  return (
    <div className="br-root relative mx-auto min-h-dvh w-full max-w-[480px] bg-canvas text-ink">
      <Suspense fallback={<p className="px-4 py-8">Loading the routine…</p>}>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}

async function Edit({ params }: { params: PageProps<"/guardian/[personId]/edit/[routineId]">["params"] }) {
  await connection();
  const { personId, routineId } = await params;
  const { guardian, person } = await requirePerson(personId);
  const routine = await getRoutineFor(guardian, person.id, routineId);
  if (!routine) notFound();
  return (
    <Builder
      routineId={routine.id}
      initial={{
        title: routine.title,
        goal: routine.goal,
        days: routine.days,
        start_time: routine.start_time,
        tone: routine.tone,
        remind: routine.remind,
        steps: routine.steps.map((s) => ({ id: s.id, text: s.text, minutes: s.minutes })),
      }}
      forPerson={{
        name: person.name || "them",
        api: `/api/guardian/people/${person.id}/routines`,
        back: `/guardian/${person.id}/routines`,
      }}
    />
  );
}
