import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { MeScreen } from "@/features/me/components/MeScreen";
import { getMe } from "@/features/me/service";
import { getCurrentUserId } from "@/lib/db";

export const metadata: Metadata = { title: "Me · Bridge" };

export default function MePage() {
  return (
    <Suspense fallback={<p className="px-4 pt-7">Loading your page…</p>}>
      <Me />
    </Suspense>
  );
}

async function Me() {
  await connection();
  const data = await getMe(await getCurrentUserId());
  return <MeScreen data={data} />;
}
