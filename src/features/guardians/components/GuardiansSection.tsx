"use client";

// Me tab: the user's guardians. Add one with a code, choose what each can see,
// or remove them. Sharing starts off.

import { useEffect, useState } from "react";
import { Dialog } from "@/components/bridge/Dialog";
import { Icon } from "@/components/bridge/Icon";
import { Switch } from "@/components/bridge/Switch";
import { br } from "@/components/bridge/styles";
import { SHARING, sharingSummary } from "@/features/me/sharing";
import type { TrustedContactPermissions } from "@/lib/types";
import type { LinkedPerson, NewCode } from "../service";
import { CodeCard } from "./CodeCard";
import { EnterCode } from "./EnterCode";

type Popup = { kind: "code" } | { kind: "enter" } | { kind: "guardian"; id: string } | { kind: "remove"; id: string } | null;

export function GuardiansSection() {
  const [links, setLinks] = useState<LinkedPerson[] | null>(null);
  const [popup, setPopup] = useState<Popup>(null);
  const [code, setCode] = useState<NewCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/links", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setLinks(((await res.json()) as { links: LinkedPerson[] }).links);
    } catch {
      setLinks([]);
      setError("Couldn't load your helpers. Check your internet.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads once when Me opens
    void load();
  }, []);

  async function showCode() {
    setPopup({ kind: "code" });
    setCode(null);
    setError(null);
    try {
      const res = await fetch("/api/links/codes", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error();
      setCode((await res.json()) as NewCode);
    } catch {
      setError("Couldn't make a code. Check your internet.");
    }
  }

  async function share(person: LinkedPerson, key: keyof TrustedContactPermissions, on: boolean) {
    const before = links;
    setLinks((ls) => ls?.map((l) => (l.link_id === person.link_id ? { ...l, [key]: on } : l)) ?? null);
    const res = await fetch(`/api/links/${person.link_id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: on }),
    }).catch(() => null);
    if (!res?.ok) {
      setLinks(before);
      setError("Couldn't save that. Check your internet.");
    }
  }

  async function remove(person: LinkedPerson) {
    const res = await fetch(`/api/links/${person.link_id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError("Couldn't remove them. Check your internet.");
      return;
    }
    setLinks((ls) => ls?.filter((l) => l.link_id !== person.link_id) ?? null);
    setPopup(null);
    setNote(`${person.name || "Your helper"} is no longer linked.`);
  }

  const selected = popup && "id" in popup ? links?.find((l) => l.link_id === popup.id) : undefined;
  const errorLine = error && (
    <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
      {error}
    </p>
  );

  return (
    <>
      <h2 className="m-0 mt-2.5 font-display text-[22px] font-bold">Helpers</h2>
      <p className="m-0 -mt-1.5 text-[16px] text-ink2">
        Someone you trust, like a parent or job coach, with their own Bridge account. They see only what you turn on.
      </p>
      {note && (
        <p role="status" className="m-0 rounded-2xl bg-go-soft px-4 py-3 text-[17px] font-bold">
          {note}
        </p>
      )}
      {links === null ? (
        <p className="m-0 text-ink2">Loading…</p>
      ) : links.length === 0 ? (
        <p className="m-0 rounded-2xl bg-sunken px-4 py-3.5">No helper yet.</p>
      ) : (
        <ul className={`${br.card} m-0 flex list-none flex-col overflow-hidden rounded-[18px] p-0`}>
          {links.map((g, i) => (
            <li key={g.link_id} className={i > 0 ? "border-t-2 border-line" : ""}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPopup({ kind: "guardian", id: g.link_id });
                }}
                aria-haspopup="dialog"
                aria-label={`${g.name}, helper. ${sharingSummary(g)}. Change what they can see.`}
                className="flex min-h-[72px] w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left text-ink"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-[19px] font-bold text-primary-text"
                >
                  {(g.name || "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 grow flex-col">
                  <span className="font-display text-[18px] font-bold leading-tight">
                    {g.name || g.email}
                    <span className="font-normal text-ink2"> · Helper</span>
                  </span>
                  <span className="text-[15px] text-ink2">{sharingSummary(g)}</span>
                </span>
                <Icon name="forward" size={20} strokeWidth={2.4} className="shrink-0 text-ink2" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={showCode} className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px]`}>
        + Add a helper
      </button>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setPopup({ kind: "enter" });
        }}
        className={br.link}
      >
        I have a code from my helper
      </button>

      {popup?.kind === "code" && (
        <Dialog title="Add a helper" onClose={() => setPopup(null)}>
          <p className="m-0 text-[17px] text-ink2">
            Give this code to your helper. They sign in on the Parent / guardian side and enter it.
          </p>
          {code ? <CodeCard code={code.code} expiresAt={code.expires_at} /> : !error && <p className="m-0">Making a code…</p>}
          {errorLine}
          <p className="m-0 text-[16px] text-ink2">They won&apos;t see anything until you turn it on here.</p>
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
        </Dialog>
      )}

      {popup?.kind === "enter" && (
        <Dialog title="Enter a code" onClose={() => setPopup(null)}>
          <EnterCode
            hint="Your helper can make a code when they set up Bridge for you."
            onLinked={(linked) => {
              setPopup(null);
              setNote(`You're linked with ${linked.other_name || "your helper"}. They see nothing until you turn it on.`);
              void load();
            }}
          />
        </Dialog>
      )}

      {popup?.kind === "guardian" && selected && (
        <Dialog title={`What ${selected.name || "your helper"} can see`} onClose={() => setPopup(null)}>
          {selected.email && <p className="m-0 -mt-2 text-ink2">{selected.email}</p>}
          <p className="m-0 text-[16px] text-ink2">Everything starts off. Nothing is shared unless you turn it on.</p>
          <div className="flex flex-col gap-2.5">
            {SHARING.map((s) => (
              <Switch key={s.key} checked={selected[s.key]} onChange={(on) => share(selected, s.key, on)}>
                {s.label}
              </Switch>
            ))}
          </div>
          {errorLine}
          <button
            type="button"
            onClick={() => setPopup({ kind: "remove", id: selected.link_id })}
            className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px] text-danger-text`}
          >
            Remove helper
          </button>
          <button type="button" onClick={() => setPopup(null)} className={`${br.cta} min-h-[58px] rounded-2xl text-[20px]`}>
            Done
          </button>
        </Dialog>
      )}

      {popup?.kind === "remove" && selected && (
        <Dialog title={`Remove ${selected.name || "this helper"}?`} onClose={() => setPopup({ kind: "guardian", id: selected.link_id })}>
          <p className="m-0 text-[17px]">They won&apos;t be linked to you anymore. You can add them again with a new code.</p>
          {errorLine}
          <button
            type="button"
            onClick={() => remove(selected)}
            className="br-press min-h-[58px] rounded-2xl border-2 border-danger-edge bg-danger font-display text-[20px] font-bold text-on-danger shadow-[0_5px_0_var(--br-danger-edge)]"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => setPopup({ kind: "guardian", id: selected.link_id })}
            className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px]`}
          >
            Keep them
          </button>
        </Dialog>
      )}
    </>
  );
}
