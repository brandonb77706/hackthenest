import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RoutineLocked } from "@/features/guardians/components/RoutineLocked";
import { getEditRules } from "@/features/guardians/service";
import { Builder } from "@/features/routine-builder/components/Builder";
import { getCurrentUserId } from "@/lib/db";

export const metadata: Metadata = { title: "New routine · Bridge" };

export default function NewRoutinePage() {
  return (
    <Suspense fallback={<p className="px-4 py-8">Loading…</p>}>
      <NewRoutine />
    </Suspense>
  );
}

async function NewRoutine() {
  await connection();
  // A guardian can turn off making routines; then they add them for the user.
  const rule = (await getEditRules(await getCurrentUserId())).routines;
  if (!rule.allowed) return <RoutineLocked rule={rule} />;
  return <Builder />;
}
