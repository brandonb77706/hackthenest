"use client";

// The guardian's page for now: the people they support, setting Bridge up for
// someone new, and entering a code from someone. The full guardian view
// (Today, Routines, Contacts) comes next.

import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "@/components/bridge/Dialog";
import { br } from "@/components/bridge/styles";
import { sharingSummary } from "@/features/me/sharing";
import { cleanName, NAME_MAX } from "@/features/onboarding/welcome";
import type { LinkedPerson, NewCode } from "../service";
import { CodeCard } from "./CodeCard";
import { EnterCode } from "./EnterCode";

type Popup = { kind: "setup" } | { kind: "enter" } | { kind: "remove"; person: LinkedPerson } | null;

export function GuardianHome({ name }: { name: string }) {
  const [people, setPeople] = useState<LinkedPerson[] | null>(null);
  const [popup, setPopup] = useState<Popup>(null);
  const [personName, setPersonName] = useState("");
  const [code, setCode] = useState<NewCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/links", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setPeople(((await res.json()) as { links: LinkedPerson[] }).links);
    } catch {
      setPeople([]);
      setError("Couldn't load the people you support. Check your internet.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads once when the page opens
    void load();
  }, []);

  function open(next: Popup) {
    setError(null);
    setCode(null);
    setPersonName("");
    setPopup(next);
  }

  async function makeCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/links/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: cleanName(personName) }),
      });
      if (!res.ok) throw new Error();
      setCode((await res.json()) as NewCode);
    } catch {
      setError("Couldn't make a code. Check your internet.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(person: LinkedPerson) {
    const res = await fetch(`/api/links/${person.link_id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError("Couldn't remove the link. Check your internet.");
      return;
    }
    setPeople((ps) => ps?.filter((p) => p.link_id !== person.link_id) ?? null);
    setPopup(null);
    setNote(`You're no longer linked with ${person.name || "them"}.`);
  }

  const errorLine = error && (
    <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
      {error}
    </p>
  );
  const who = cleanName(personName);

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className={br.h1}>Hi, {name}</h1>
      <p className="m-0 -mt-1.5 text-[18px] text-ink2">Support without taking over.</p>
      {note && (
        <p role="status" className="m-0 rounded-2xl bg-go-soft px-4 py-3 text-[17px] font-bold">
          {note}
        </p>
      )}

      <h2 className="m-0 mt-2 font-display text-[22px] font-bold">People you support</h2>
      {people === null ? (
        <p className="m-0 text-ink2">Loading…</p>
      ) : people.length === 0 ? (
        <p className="m-0 rounded-2xl bg-sunken px-4 py-3.5">
          No one yet. Set up Bridge for someone, or enter the code from their Me tab.
        </p>
      ) : (
        <ul className={`${br.card} m-0 flex list-none flex-col overflow-hidden rounded-[18px] p-0`}>
          {people.map((p, i) => (
            <li key={p.link_id} className={`flex min-h-[72px] items-center gap-3 px-4 py-3 ${i > 0 ? "border-t-2 border-line" : ""}`}>
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-[19px] font-bold text-primary-text"
              >
                {(p.name || "?").trim().charAt(0).toUpperCase()}
              </span>
              <span className="flex min-w-0 grow flex-col">
                <span className="font-display text-[18px] font-bold leading-tight">{p.name || p.email}</span>
                <span className="text-[15px] text-ink2">{sharingSummary(p) === "Sees nothing" ? "Shares nothing yet" : sharingSummary(p).replace("Sees", "Shares")}</span>
              </span>
              <button
                type="button"
                onClick={() => open({ kind: "remove", person: p })}
                aria-label={`Remove link with ${p.name || p.email}`}
                className={`${br.ghost} min-h-12 shrink-0 rounded-xl px-3 text-[16px]`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={() => open({ kind: "setup" })} className={`${br.cta} min-h-[58px] rounded-2xl text-[20px]`}>
        Set up Bridge for someone
      </button>
      <button type="button" onClick={() => open({ kind: "enter" })} className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px]`}>
        Enter a code from someone
      </button>

      {popup?.kind === "setup" && (
        <Dialog title="Set up Bridge for someone" onClose={() => setPopup(null)}>
          {!code ? (
            <form onSubmit={makeCode} className="flex flex-col gap-3">
              <p className="m-0 text-[17px] text-ink2">
                They get their own account. You see only what they choose to share.
              </p>
              <label htmlFor="person-name" className={`${br.label} -mb-1`}>
                What should Bridge call them?
              </label>
              <input
                id="person-name"
                autoCapitalize="words"
                maxLength={NAME_MAX}
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className={br.input}
              />
              {errorLine}
              <button type="submit" disabled={!who || busy} className={`${br.cta} min-h-[58px] rounded-2xl text-[20px]`}>
                {busy ? "Making a code…" : "Get a setup code"}
              </button>
            </form>
          ) : (
            <>
              <ol className="m-0 flex flex-col gap-1.5 pl-6 text-[17px]">
                <li>On {who ?? "their"}&apos;s phone, open Bridge.</li>
                <li>Tap Create an account and sign up.</li>
                <li>Tap &ldquo;I have a code from my helper&rdquo; and enter this code.</li>
              </ol>
              <CodeCard code={code.code} expiresAt={code.expires_at} />
              <button
                type="button"
                onClick={() => {
                  setPopup(null);
                  void load();
                }}
                className={`${br.cta} min-h-[58px] rounded-2xl text-[20px]`}
              >
                Done
              </button>
            </>
          )}
        </Dialog>
      )}

      {popup?.kind === "enter" && (
        <Dialog title="Enter a code" onClose={() => setPopup(null)}>
          <EnterCode
            hint="They make a code by tapping Add a guardian on their Me tab."
            onLinked={(linked) => {
              setPopup(null);
              setNote(`You're linked with ${linked.other_name || "them"}. They choose what you can see.`);
              void load();
            }}
          />
        </Dialog>
      )}

      {popup?.kind === "remove" && (
        <Dialog title={`Remove link with ${popup.person.name || "them"}?`} onClose={() => setPopup(null)}>
          <p className="m-0 text-[17px]">You won&apos;t be linked anymore. Their account and routines stay as they are.</p>
          {errorLine}
          <button
            type="button"
            onClick={() => remove(popup.person)}
            className="br-press min-h-[58px] rounded-2xl border-2 border-danger-edge bg-danger font-display text-[20px] font-bold text-on-danger shadow-[0_5px_0_var(--br-danger-edge)]"
          >
            Remove
          </button>
          <button type="button" onClick={() => setPopup(null)} className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px]`}>
            Keep
          </button>
        </Dialog>
      )}
    </div>
  );
}
