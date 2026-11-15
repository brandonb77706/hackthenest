import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { GuardianHome } from "@/features/guardians/components/GuardianHome";
import { listLinks } from "@/features/guardians/service";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Guardian · Bridge" };

// The guardian's start page. With one person, it opens their view; with none or
// several (or ?manage=1), it lists them with ways to link more.
export default function GuardianPage({ searchParams }: PageProps<"/guardian">) {
  return (
    <div className="br-root mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 bg-canvas px-5 pb-8 pt-8 text-ink">
      <Suspense fallback={<p className="text-[18px]">Loading…</p>}>
        <Guardian searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Guardian({ searchParams }: { searchParams: PageProps<"/guardian">["searchParams"] }) {
  await connection();
  const user = await requireUser();
  if (user.role !== "guardian") redirect("/");
  const manage = (await searchParams).manage === "1";
  const people = await listLinks(user);
  if (!manage && people.length === 1) redirect(`/guardian/${people[0].id}`);
  return (
    <>
      <GuardianHome name={user.name} />
      <div className="mt-6">
        <SignOutButton />
      </div>
    </>
  );
}
