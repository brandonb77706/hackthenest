import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { GuardianToday } from "@/features/guardians/components/GuardianToday";
import { requirePerson } from "@/features/guardians/person";

export const metadata: Metadata = { title: "Today · Bridge" };

export default function Page({ params }: PageProps<"/guardian/[personId]">) {
  return (
    <Suspense fallback={<p className="px-5 pt-8 text-[18px]">Loading…</p>}>
      <View params={params} />
    </Suspense>
  );
}

async function View({ params }: { params: PageProps<"/guardian/[personId]">["params"] }) {
  await connection();
  const { personId } = await params;
  const { person } = await requirePerson(personId);
  return <GuardianToday personId={person.id} name={person.name || "them"} />;
}
