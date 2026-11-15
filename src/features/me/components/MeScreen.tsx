"use client";

// The Me tab from the design (started by Adrian): who you are, your Buddy,
// rewards, trusted contacts, color scheme, the Buddy on the tab bar, and
// reminder settings. Badges, levels, and sign-out are in the design but have
// nothing behind them yet, so they aren't here.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BuddyAvatar } from "@/components/bridge/BuddyAvatar";
import { Dialog } from "@/components/bridge/Dialog";
import { Icon } from "@/components/bridge/Icon";
import { SchemeCard } from "@/components/bridge/SchemeCard";
import { Switch } from "@/components/bridge/Switch";
import { br } from "@/components/bridge/styles";
import {
  getServerSettings,
  getSettings,
  subscribeSettings,
  syncSettings,
  updateSettings,
} from "@/lib/settings";
import { COLOR_SCHEMES, type ColorSchemeId } from "@/lib/theme";
import type { TrustedContact, TrustedContactPermissions } from "@/lib/types";
import { ContactForm } from "@/features/help/components/ContactForm";
import { GuardiansSection } from "@/features/guardians/components/GuardiansSection";
import { ManagedNote } from "@/features/guardians/components/ManagedNote";
import { SHARING, sharingSummary } from "../sharing";
import { BadgesCard, RewardsView } from "./Rewards";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
export { sharingSummary } from "../sharing";
import type { MeData } from "../service";
import { buddyTag, formatTokens, type BuddyChoice } from "../summary";

type View =
  | { kind: "home" }
  | { kind: "buddy" }
  | { kind: "schemes" }
  | { kind: "rewards" }
  | { kind: "contact"; existing?: TrustedContact };

const byName = (a: TrustedContact, b: TrustedContact) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

async function send(
  url: string,
  method: string,
  body: unknown,
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function MeScreen({ data }: { data: MeData }) {
  // A guardian can turn off adding and changing contacts. Choosing what each can see stays the user's.
  const contactRule = data.edit?.contacts;
  const canEditContacts = contactRule?.allowed !== false;
  const [view, setView] = useState<View>({ kind: "home" });
  /** Whose sharing popup is open */
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [buddies, setBuddies] = useState(data.buddies);
  const [buddyName, setBuddyName] = useState(data.summary.buddyName);
  const [contacts, setContacts] = useState(data.contacts);
  const [scheme, setScheme] = useState<ColorSchemeId>(
    data.settings.color_scheme,
  );
  const [showBuddy, setShowBuddy] = useState(data.settings.show_buddy);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { name, tokens, nextReward } = data.summary;
  const device = useSyncExternalStore(
    subscribeSettings,
    getSettings,
    getServerSettings,
  );

  // This device catches up with the profile (color scheme, Buddy).
  useEffect(() => {
    syncSettings(data.settings);
  }, [data.settings]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [view.kind]);

  function go(next: View) {
    setSharingId(null);
    setError("");
    setView(next);
  }

  async function choose(b: BuddyChoice) {
    if (!b.can_choose || b.equipped) return;
    const before = buddies;
    setBuddies(
      buddies.map((x) => ({
        ...x,
        equipped: x.id === b.id,
        owned: x.owned || x.id === b.id,
      })),
    );
    setBuddyName(b.name);
    updateSettings({ buddyName: b.name });
    if (!(await send("/api/me/buddy", "PUT", { avatar_id: b.id }))) {
      setBuddies(before);
      setBuddyName(data.summary.buddyName);
      updateSettings({ buddyName: data.summary.buddyName ?? "Fox" });
      setError("Couldn't change your Buddy. Check your internet.");
    }
  }

  async function pickScheme(id: ColorSchemeId) {
    const before = scheme;
    setScheme(id);
    updateSettings({ colorScheme: id });
    if (!(await send("/api/me/settings", "PATCH", { color_scheme: id }))) {
      setScheme(before);
      updateSettings({ colorScheme: before });
      setError("Couldn't save your colors. Check your internet.");
    }
  }

  async function toggleBuddy(on: boolean) {
    setShowBuddy(on);
    updateSettings({ showBuddy: on });
    if (!(await send("/api/me/settings", "PATCH", { show_buddy: on }))) {
      setShowBuddy(!on);
      updateSettings({ showBuddy: !on });
      setError("Couldn't save that. Check your internet.");
    }
  }

  async function share(
    contact: TrustedContact,
    key: keyof TrustedContactPermissions,
    on: boolean,
  ) {
    const updated = { ...contact, [key]: on };
    setContacts((list) => list.map((c) => (c.id === contact.id ? updated : c)));
    const {
      name: n,
      method,
      contact: value,
      relation,
      can_see_routines,
      can_get_lost_alerts,
      can_get_stuck_alerts,
    } = updated;
    const ok = await send(`/api/contacts/${contact.id}`, "PATCH", {
      name: n,
      method,
      contact: value,
      relation,
      can_see_routines,
      can_get_lost_alerts,
      can_get_stuck_alerts,
    });
    if (!ok) {
      setContacts((list) =>
        list.map((c) => (c.id === contact.id ? contact : c)),
      );
      setError("Couldn't save that. Check your internet.");
    }
  }

  const errorLine = error && (
    <p
      role="alert"
      className="m-0 rounded-2xl bg-danger-soft px-4 py-3 font-bold text-danger-text"
    >
      {error}
    </p>
  );

  const sharingFor = contacts.find((c) => c.id === sharingId) ?? null;

  if (view.kind === "contact") {
    const existing = view.existing;
    return (
      <div className="flex flex-col gap-3.5 px-4 pb-[130px] pt-[18px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go({ kind: "home" })}
            aria-label="Back"
            className={`${br.ghost} flex size-12 items-center justify-center rounded-[14px] p-0`}
          >
            <Icon name="back" size={24} strokeWidth={2.4} />
          </button>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 font-display text-[28px] font-bold"
          >
            {existing ? `Change ${existing.name}` : "Add a trusted contact"}
          </h1>
        </div>
        <ContactForm
          existing={existing}
          onSaved={(saved) => {
            setContacts((list) =>
              list.some((c) => c.id === saved.id)
                ? list.map((c) => (c.id === saved.id ? saved : c))
                : [...list, saved],
            );
            go({ kind: "home" });
          }}
          onDeleted={
            existing
              ? () => {
                  setContacts((list) =>
                    list.filter((c) => c.id !== existing.id),
                  );
                  go({ kind: "home" });
                }
              : undefined
          }
          onCancel={() => go({ kind: "home" })}
        />
      </div>
    );
  }

  if (view.kind !== "home") {
    return (
      <div className="flex flex-col gap-3.5 px-4 pb-[130px] pt-[18px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go({ kind: "home" })}
            aria-label="Back"
            className={`${br.ghost} flex size-12 items-center justify-center rounded-[14px] p-0`}
          >
            <Icon name="back" size={24} strokeWidth={2.4} />
          </button>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 font-display text-[28px] font-bold"
          >
            {view.kind === "buddy" ? "Choose your Buddy" : view.kind === "rewards" ? "Badges and rewards" : "Color scheme"}
          </h1>
        </div>
        {errorLine}

        {view.kind === "rewards" && <RewardsView tokens={tokens} nextReward={nextReward} badges={data.badges ?? []} />}

        {view.kind === "buddy" && (
          <>
            <p className="m-0 -mt-1 text-ink2">
              Your Buddy holds the tab bar and gives tips when you tap it.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {buddies.map((b) => {
                const locked = !b.can_choose;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => choose(b)}
                    aria-pressed={b.equipped}
                    aria-disabled={locked}
                    aria-label={`${b.name}, ${b.equipped ? "your Buddy" : locked ? `locked, ${buddyTag(b)}` : "tap to choose"}`}
                    className={`br-press flex flex-col items-center gap-1.5 rounded-[22px] border-[3px] px-2.5 pb-3.5 pt-4 text-ink ${
                      b.equipped
                        ? "border-switch-on bg-primary-soft shadow-[0_4px_0_var(--br-switch-on)]"
                        : "border-line bg-surface shadow-[0_4px_0_var(--br-line)]"
                    }`}
                  >
                    <span
                      className={`flex size-[104px] items-end justify-center overflow-hidden rounded-full bg-primary-soft ${locked ? "opacity-40" : ""}`}
                    >
                      <BuddyAvatar name={b.name} size={96} />
                    </span>
                    <span className="font-display text-[18px] font-bold">
                      {b.name}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[15px] font-bold ${
                        b.equipped
                          ? "bg-switch-on text-knob"
                          : locked
                            ? "bg-sunken text-ink"
                            : "bg-go-soft text-ink"
                      }`}
                    >
                      {locked && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <rect x="5" y="11" width="14" height="10" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      )}
                      {buddyTag(b)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view.kind === "schemes" && (
          <>
            <p className="m-0 -mt-1 text-ink2">
              Each scheme uses colors that go together. Pick what feels best for
              you. You can change it any time.
            </p>
            <div
              role="radiogroup"
              aria-label="Color scheme"
              className="flex flex-col gap-3.5"
            >
              {COLOR_SCHEMES.map((s) => (
                <SchemeCard key={s.id} scheme={s} selected={s.id === scheme} onPick={pickScheme} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  const current =
    COLOR_SCHEMES.find((s) => s.id === scheme) ?? COLOR_SCHEMES[0];
  const facts = [formatTokens(tokens), buddyName ? `Buddy: ${buddyName}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-[130px] pt-6">
      <div className="flex items-center gap-4">
        <span className="flex size-[84px] shrink-0 items-end justify-center overflow-hidden rounded-full border-[3px] border-cta bg-primary-soft">
          <BuddyAvatar name={buddyName ?? "Fox"} size={78} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="m-0 break-words font-display text-[30px] font-bold leading-none"
          >
            {name || "Me"}
          </h1>
          <p className="m-0 text-[16px] text-ink2">{facts}</p>
          <button
            type="button"
            onClick={() => go({ kind: "buddy" })}
            className={`${br.link} self-start px-0`}
          >
            Change Buddy
          </button>
        </div>
      </div>
      {errorLine}

      <BadgesCard badges={data.badges ?? []} nextReward={nextReward} onOpen={() => go({ kind: "rewards" })} />

      <h2 className="m-0 mt-2.5 font-display text-[22px] font-bold">
        Trusted contacts
      </h2>
      <p className="m-0 -mt-1.5 text-[16px] text-ink2">
        You choose what each person can see. You can change this any time.
      </p>
      {contacts.length === 0 ? (
        <p className="m-0 rounded-2xl bg-sunken px-4 py-3.5">
          No one yet. Add someone you trust, like family or a friend.
        </p>
      ) : (
        <ul
          className={`${br.card} m-0 flex list-none flex-col overflow-hidden rounded-[18px] p-0`}
        >
          {[...contacts].sort(byName).map((c, i) => (
            <li key={c.id} className={i > 0 ? "border-t-2 border-line" : ""}>
              <button
                type="button"
                onClick={() => setSharingId(c.id)}
                aria-haspopup="dialog"
                aria-label={`${c.name}${c.relation ? `, ${c.relation}` : ""}. ${sharingSummary(c)}. Change what they can see.`}
                className="flex min-h-[72px] w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left text-ink"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-[19px] font-bold text-primary-text"
                >
                  {c.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 grow flex-col">
                  <span className="font-display text-[18px] font-bold leading-tight">
                    {c.name}
                    {c.relation ? (
                      <span className="font-normal text-ink2">
                        {" "}
                        · {c.relation}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[15px] text-ink2">
                    {sharingSummary(c)}
                  </span>
                </span>
                <Icon
                  name="forward"
                  size={20}
                  strokeWidth={2.4}
                  className="shrink-0 text-ink2"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      {canEditContacts ? (
        <button
          type="button"
          onClick={() => go({ kind: "contact" })}
          className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px]`}
        >
          + Add a trusted contact
        </button>
      ) : (
        contactRule && <ManagedNote area="contacts" rule={contactRule} />
      )}

      {sharingFor && (
        <Dialog
          title={`What ${sharingFor.name} can see`}
          onClose={() => setSharingId(null)}
        >
          {sharingFor.relation && (
            <p className="m-0 -mt-2 text-ink2">{sharingFor.relation}</p>
          )}
          <p className="m-0 text-[16px] text-ink2">
            Everything starts off. Nothing is shared unless you turn it on.
          </p>
          <div className="flex flex-col gap-2.5">
            {SHARING.map((s) => (
              <Switch
                key={s.key}
                checked={sharingFor[s.key]}
                onChange={(on) => share(sharingFor, s.key, on)}
              >
                {s.label}
              </Switch>
            ))}
          </div>
          {errorLine}
          {canEditContacts && (
            <button
              type="button"
              onClick={() => go({ kind: "contact", existing: sharingFor })}
              className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px]`}
            >
              Change name or number
            </button>
          )}
          <button
            type="button"
            onClick={() => setSharingId(null)}
            className={`${br.cta} min-h-[58px] rounded-2xl text-[20px]`}
          >
            Done
          </button>
        </Dialog>
      )}

      <GuardiansSection />

      <h2 className="m-0 mt-2.5 font-display text-[22px] font-bold">
        Color scheme
      </h2>
      <button
        type="button"
        onClick={() => go({ kind: "schemes" })}
        className={`${br.ghost} flex min-h-[72px] items-center gap-3.5 rounded-[18px] px-4 py-3 text-left`}
      >
        <span aria-hidden="true" className="flex shrink-0">
          {current.swatches.map((c) => (
            <span
              key={c}
              className="-mr-1.5 size-[26px] rounded-full border-2 border-surface"
              style={{ background: c }}
            />
          ))}
        </span>
        <span className="ml-1.5 flex min-w-0 grow flex-col">
          <strong className="font-display text-[18px]">{current.name}</strong>
          <span className="text-[15px] font-normal text-ink2">
            For: {current.who}
          </span>
        </span>
        <span className="shrink-0 font-display text-[16px] font-semibold text-primary-text">
          Change
        </span>
      </button>

      <Switch checked={showBuddy} onChange={toggleBuddy}>
        Show my Buddy on the tab bar
      </Switch>

      <h2 className="m-0 mt-2.5 font-display text-[22px] font-bold">
        Reminders
      </h2>
      <p className="m-0 -mt-1.5 text-[16px] text-ink2">
        While Bridge is open on this phone. Each routine can also turn reminders
        off.
      </p>
      <div
        className={`${br.card} flex flex-col overflow-hidden rounded-[18px]`}
      >
        {(
          [
            {
              key: "reminders",
              label: "Routine reminders",
              sub: "10 minutes before each routine",
            },
            {
              key: "lateNudges",
              label: "Check-in nudges",
              sub: "A gentle hello if a routine is late",
            },
            { key: "chime", label: "Sound", sub: "Play a soft chime" },
          ] as const
        ).map((r, i) => (
          <Switch
            key={r.key}
            checked={device[r.key]}
            onChange={(on) => updateSettings({ [r.key]: on })}
            className={`rounded-none border-0 ${i > 0 ? "border-t-2 border-line" : ""}`}
          >
            <span>{r.label}</span>
            <span className="text-[15px] text-ink2">{r.sub}</span>
          </Switch>
        ))}
      </div>

      <div className="mt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
