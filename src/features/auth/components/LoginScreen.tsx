"use client";

// The login page from the design (Login.dc.html): User or Parent / guardian,
// Continue with Google, or email and password. Each side can also create an account.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BuddyAvatar } from "@/components/bridge/BuddyAvatar";
import { br } from "@/components/bridge/styles";
import { authClient } from "@/lib/auth/client";
import { homeFor, placeholderName, safeNext, toRole, type Role } from "@/lib/auth/roles";
import { loginCopy, signInErrorText } from "../loginCopy";

export function LoginScreen({ google }: { google: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [role, setRole] = useState<Role>(params.get("as") === "guardian" ? "guardian" : "user");
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = loginCopy(role, creating);

  function pick(r: Role) {
    setRole(r);
    setError(null);
  }

  function done(userRole: unknown) {
    router.replace(next ?? homeFor(toRole(userRole)));
    router.refresh();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = creating
      ? await authClient.signUp.email({ email, password, name: placeholderName(email), role })
      : await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(signInErrorText(result.error, creating));
      setBusy(false);
      return;
    }
    done(result.data?.user.role);
  }

  async function withGoogle() {
    setError(null);
    setBusy(true);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: next ?? homeFor(role),
      errorCallbackURL: "/login",
    });
    if (result.error) {
      setError("Google sign-in didn't work. Try again, or use email.");
      setBusy(false);
    }
  }

  const tab = (r: Role, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={role === r}
      onClick={() => pick(r)}
      className={`min-h-[50px] rounded-[13px] border-0 font-display text-[17px] font-bold text-hero-ink ${
        role === r ? "bg-surface shadow-[0_3px_0_var(--br-hero-edge)]" : "bg-transparent"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="br-root mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-canvas text-ink">
      <header className="flex flex-col gap-[18px] rounded-b-[32px] bg-hero px-4 pt-[22px] text-hero-ink shadow-[inset_0_-5px_0_var(--br-hero-edge)]">
        <div
          role="tablist"
          aria-label="Who is signing in"
          className="grid grid-cols-2 gap-1.5 rounded-[18px] bg-white/55 p-1.5"
        >
          {tab("user", "User")}
          {tab("guardian", "Parent / guardian")}
        </div>
        <div className="flex items-end justify-between gap-2 px-2">
          <div className="flex flex-col gap-1 pb-[22px]">
            <span className="font-display text-[40px] font-bold leading-none">Bridge</span>
            <span className="text-[17px] font-bold">{copy.tagline}</span>
          </div>
          <div className="flex items-end">
            {role === "guardian" && <BuddyAvatar name="Owl" size={76} paws />}
            <BuddyAvatar name="Fox" size={92} paws />
          </div>
        </div>
      </header>

      <form onSubmit={submit} className="flex grow flex-col gap-3.5 px-5 pb-6 pt-[26px]">
        <h1 className={br.h1}>{copy.heading}</h1>
        <p className="m-0 -mt-1.5 mb-1 text-[17px] text-ink2">{copy.sub}</p>

        {google && (
          <>
            <button
              type="button"
              onClick={withGoogle}
              disabled={busy}
              className={`${br.ghost} flex min-h-[58px] items-center justify-center gap-3 rounded-2xl text-[18px]`}
            >
              <span
                aria-hidden="true"
                className="flex size-[30px] items-center justify-center rounded-full border-2 border-line font-display text-[17px] font-bold text-primary-text"
              >
                G
              </span>
              Continue with Google
            </button>
            <div aria-hidden="true" className="flex items-center gap-3 text-[15px] text-ink2">
              <span className="h-0.5 grow bg-line" />
              or
              <span className="h-0.5 grow bg-line" />
            </div>
          </>
        )}

        <label htmlFor="login-email" className={`${br.label} -mb-2`}>
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={copy.emailHint}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={br.input}
        />
        <label htmlFor="login-password" className={`${br.label} -mb-2`}>
          Password
        </label>
        <input
          id="login-password"
          type="password"
          required
          minLength={creating ? 8 : undefined}
          autoComplete={creating ? "new-password" : "current-password"}
          placeholder={creating ? "At least 8 characters" : "Your password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={br.input}
        />

        {error && (
          <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={`${br.cta} mt-1.5 min-h-[60px] rounded-2xl text-[21px]`}
        >
          {busy ? "One moment…" : copy.cta}
        </button>

        <p className="m-0 mt-auto pt-4 text-center text-[16px] text-ink2">
          {copy.footer}{" "}
          <button
            type="button"
            onClick={() => {
              setCreating(!creating);
              setError(null);
            }}
            className="min-h-12 border-0 bg-transparent p-0 font-bold text-primary-text underline"
          >
            {copy.footerLink}
          </button>
        </p>
      </form>
    </div>
  );
}
