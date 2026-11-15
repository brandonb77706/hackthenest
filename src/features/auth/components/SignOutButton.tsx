"use client";

import { useState } from "react";
import { br } from "@/components/bridge/styles";
import { authClient } from "@/lib/auth/client";

/** Signs out on this phone and goes back to the login page. */
export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    // A full page load, so nothing from this account stays on screen.
    window.location.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={`${br.ghost} min-h-14 w-full rounded-2xl text-[18px]`}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
