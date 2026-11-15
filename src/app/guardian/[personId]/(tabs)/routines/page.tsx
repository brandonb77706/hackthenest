import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { GuardianRoutines } from "@/features/guardians/components/GuardianRoutines";
import { requirePerson } from "@/features/guardians/person";

export const metadata: Metadata = { title: "Routines · Bridge" };

export default function Page({ params }: PageProps<"/guardian/[personId]/routines">) {
  return (
    <Suspense fallback={<p className="px-5 pt-8 text-[18px]">Loading…</p>}>
      <View params={params} />
    </Suspense>
  );
}

async function View({ params }: { params: PageProps<"/guardian/[personId]/routines">["params"] }) {
  await connection();
  const { personId } = await params;
  const { person } = await requirePerson(personId);
  return <GuardianRoutines personId={person.id} name={person.name || "them"} />;
}
