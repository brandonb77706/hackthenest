import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/features/auth/components/LoginScreen";
import { googleEnabled } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Sign in · Bridge" };

export default function LoginPage() {
  return (
    // The form reads ?next= and ?as= from the address.
    <Suspense>
      <LoginScreen google={googleEnabled()} />
    </Suspense>
  );
}
