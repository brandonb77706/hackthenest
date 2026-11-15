import { connection } from "next/server";
import { Suspense } from "react";
import { MeScreen } from "@/features/me/MeScreen";
import { getMeSummary } from "@/features/me/service";
import { getCurrentUserId } from "@/lib/db";

export default function MePage() {
  return (
    <Suspense fallback={<p>Loading your page…</p>}>
      <Me />
    </Suspense>
  );
}

async function Me() {
  await connection();
  const summary = await getMeSummary(await getCurrentUserId());
  return <MeScreen summary={summary} />;
}
