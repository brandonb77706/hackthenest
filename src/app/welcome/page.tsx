import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { WelcomeScreen } from "@/features/onboarding/components/WelcomeScreen";
import { getWelcome } from "@/features/onboarding/service";
import { homeFor } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Welcome · Bridge" };

export default function WelcomePage() {
  return (
    <Suspense fallback={<p className="px-5 pt-8 text-[18px]">Getting things ready…</p>}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  await connection();
  const user = await requireUser();
  if (user.role === "guardian") redirect(homeFor("guardian"));
  const data = await getWelcome(user);
  if (data.done) redirect("/");
  return <WelcomeScreen data={data} />;
}
