import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { br } from "@/components/bridge/styles";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Guardian · Bridge" };

// Placeholder until the guardian view (Today, Routines, Contacts, Me) is built.
export default function GuardianPage() {
  return (
    <div className="br-root mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 bg-canvas px-5 pt-8 text-ink">
      <Suspense fallback={<p>Loading…</p>}>
        <Guardian />
      </Suspense>
    </div>
  );
}

async function Guardian() {
  await connection();
  const user = await requireUser();
  return (
    <>
      <h1 className={br.h1}>Hi, {user.name}</h1>
      <p className="m-0 text-[18px] text-ink2">
        Soon you can link to someone&apos;s Bridge here with their setup code, see how their day is going, and help with
        routines and contacts.
      </p>
      <SignOutButton />
    </>
  );
}
