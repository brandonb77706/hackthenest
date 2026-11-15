import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { GuardianHome } from "@/features/guardians/components/GuardianHome";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Guardian · Bridge" };

// The guardian's page. The full guardian view (Today, Routines, Contacts, Me) comes next.
export default function GuardianPage() {
  return (
    <div className="br-root mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 bg-canvas px-5 pb-8 pt-8 text-ink">
      <Suspense fallback={<p className="text-[18px]">Loading…</p>}>
        <Guardian />
      </Suspense>
    </div>
  );
}

async function Guardian() {
  await connection();
  const user = await requireUser();
  if (user.role !== "guardian") redirect("/");
  return (
    <>
      <GuardianHome name={user.name} />
      <div className="mt-6">
        <SignOutButton />
      </div>
    </>
  );
}
