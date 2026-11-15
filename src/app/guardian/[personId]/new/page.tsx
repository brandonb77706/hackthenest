import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { requirePerson } from "@/features/guardians/person";
import { Builder } from "@/features/routine-builder/components/Builder";

export const metadata: Metadata = { title: "New routine · Bridge" };

/** A guardian makes a routine for someone, with the same builder they use. */
export default function Page({ params }: PageProps<"/guardian/[personId]/new">) {
  return (
    <div className="br-root relative mx-auto min-h-dvh w-full max-w-[480px] bg-canvas text-ink">
      <Suspense fallback={<p className="px-4 py-8">Loading…</p>}>
        <New params={params} />
      </Suspense>
    </div>
  );
}

async function New({ params }: { params: PageProps<"/guardian/[personId]/new">["params"] }) {
  await connection();
  const { personId } = await params;
  const { person } = await requirePerson(personId);
  return (
    <Builder
      forPerson={{
        name: person.name || "them",
        api: `/api/guardian/people/${person.id}/routines`,
        back: `/guardian/${person.id}/routines`,
      }}
    />
  );
}
