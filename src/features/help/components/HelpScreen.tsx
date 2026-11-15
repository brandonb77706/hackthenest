"use client";

// The Help tab from the design: Call, I'm lost, Speak for me, quick
// messages, and Emergency. Every call asks first. Nothing is sent until
// the person taps.

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import type { TrustedContact } from "@/lib/types";
import { play } from "@/lib/voice/player";
import { ConfirmCall } from "./ConfirmCall";
import { ContactForm } from "./ContactForm";
import { LostMode } from "./LostMode";
import { SpeakForMe } from "./SpeakForMe";
import { useHelpData } from "../useHelpData";

type View =
  | { kind: "home" }
  | { kind: "lost" }
  | { kind: "speak" }
  | { kind: "contacts" }
  | { kind: "contact"; existing?: TrustedContact };

/** "pick" = choosing who to call; a contact = asking before calling them. */
type Confirm = "pick" | TrustedContact | "911" | "988" | null;

const TITLES: Record<Exclude<View["kind"], "home" | "contact">, string> = {
  lost: "I'm lost",
  speak: "Speak for me",
  contacts: "Trusted contacts",
};

interface Props {
  userName?: string;
}

export function HelpScreen({ userName = "" }: Props) {
  const data = useHelpData();
  const [view, setView] = useState<View>({ kind: "home" });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = data.contacts[0] ?? null;
  // Only contacts with a phone number can be called.
  const callable = data.contacts.filter((c) => c.method === "sms");
  const only = callable.length === 1 ? callable[0] : null;
  const calling =
    confirm !== null && typeof confirm === "object" ? confirm : null;
  const lostRecipients = data.contacts.filter((c) => c.can_get_lost_alerts);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [view.kind]);

  function go(next: View) {
    setConfirm(null);
    setView(next);
  }

  if (view.kind !== "home") {
    const title =
      view.kind === "contact"
        ? view.existing
          ? `Change ${view.existing.name}`
          : "Add a trusted contact"
        : TITLES[view.kind];
    return (
      <div className="flex flex-col gap-3.5 px-4 pb-[130px] pt-[18px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              go(
                view.kind === "contact"
                  ? { kind: "contacts" }
                  : { kind: "home" },
              )
            }
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
            {title}
          </h1>
        </div>

        {view.kind === "lost" && (
          <LostMode userName={userName} contacts={data.contacts} />
        )}
        {view.kind === "speak" && (
          <SpeakForMe
            phrases={data.phrases}
            onPhrasesChange={data.setPhrases}
          />
        )}
        {view.kind === "contacts" && (
          <div className="flex flex-col gap-3">
            <p className="m-0 -mt-1 text-ink2">
              People Bridge can reach for you. You choose what each one gets.
            </p>
            {data.contacts.length === 0 && (
              <p className="m-0 rounded-2xl bg-sunken px-4 py-3.5">
                No one yet.
              </p>
            )}
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {data.contacts.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => go({ kind: "contact", existing: c })}
                    className={`${br.card} flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-ink`}
                  >
                    <span className="flex flex-col">
                      <span className="font-display text-[19px] font-bold">
                        {c.name}
                      </span>
                      <span className="text-[15px] text-ink2">
                        {[c.relation, c.contact].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="font-display text-[16px] font-semibold text-primary-text">
                      Change
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => go({ kind: "contact" })}
              className={`${br.cta} h-14 rounded-2xl text-[18px]`}
            >
              + Add a trusted contact
            </button>
          </div>
        )}
        {view.kind === "contact" && (
          <ContactForm
            existing={view.existing}
            onSaved={async () => {
              await data.refresh();
              go({ kind: "contacts" });
            }}
            onDeleted={
              view.existing
                ? async () => {
                    await data.refresh();
                    go({ kind: "contacts" });
                  }
                : undefined
            }
            onCancel={() => go({ kind: "contacts" })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-[130px] pt-7">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="m-0 font-display text-[32px] font-bold"
      >
        Get help
      </h1>
      <p className="m-0 -mt-1.5 text-ink2">Nothing is sent until you tap.</p>
      {data.error && (
        <p
          role="alert"
          className="m-0 rounded-2xl bg-danger-soft px-4 py-3 font-bold text-danger-text"
        >
          {data.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {callable.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              const open = confirm === "pick" || calling !== null;
              setConfirm(open ? null : (only ?? "pick"));
            }}
            aria-expanded={confirm === "pick" || calling !== null}
            className="tone-sea br-press flex min-h-[140px] flex-col items-start gap-1.5 rounded-[20px] border-0 bg-tone p-4 text-left text-ink shadow-[0_5px_0_var(--t-edge)]"
          >
            <Icon name="phone" size={32} />
            <span className="font-display text-[21px] font-bold">
              {only ? `Call ${only.name}` : "Call a trusted contact"}
            </span>
            <span className="text-[16px]">
              {only
                ? only.relation || "Your trusted contact"
                : `Pick who to call (${callable.length} people)`}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              go(first ? { kind: "contacts" } : { kind: "contact" })
            }
            className="tone-sea br-press flex min-h-[140px] flex-col items-start gap-1.5 rounded-[20px] border-0 bg-tone p-4 text-left text-ink shadow-[0_5px_0_var(--t-edge)]"
          >
            <Icon name="phone" size={32} />
            <span className="font-display text-[21px] font-bold">
              {first ? "Call someone" : "Add a contact"}
            </span>
            <span className="text-[16px]">
              {first
                ? "Add a phone number to a trusted contact"
                : "Someone Bridge can call for you"}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => go({ kind: "lost" })}
          className="tone-teal br-press flex min-h-[140px] flex-col items-start gap-1.5 rounded-[20px] border-0 bg-tone p-4 text-left text-ink shadow-[0_5px_0_var(--t-edge)]"
        >
          <Icon name="location" size={32} />
          <span className="font-display text-[21px] font-bold">
            I&apos;m lost
          </span>
          <span className="text-[16px]">
            {lostRecipients.length === 1
              ? `Send ${lostRecipients[0].name} where you are`
              : lostRecipients.length > 1
                ? "Send your contacts where you are"
                : "Find where you are"}
          </span>
        </button>
      </div>

      {confirm === "pick" && (
        <div
          role="group"
          aria-label="Who do you want to call?"
          className="flex flex-col gap-2.5 rounded-[20px] border-[3px] border-switch-on bg-primary-soft p-4"
        >
          <p className="m-0 font-display text-[20px] font-bold">
            Who do you want to call?
          </p>
          {callable.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setConfirm(c)}
              className={`${br.ghost} flex min-h-[60px] items-center gap-3 rounded-2xl px-4 text-left`}
            >
              <Icon name="phone" size={22} className="shrink-0" />
              <span className="flex flex-col">
                <span className="font-display text-[19px] font-bold">
                  {c.name}
                </span>
                {c.relation && (
                  <span className="text-[15px] font-normal text-ink2">
                    {c.relation}
                  </span>
                )}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setConfirm(null)}
            className={`${br.link} self-center`}
          >
            Never mind
          </button>
        </div>
      )}

      {calling && (
        <ConfirmCall
          question={`Call ${calling.name} now?`}
          detail={calling.relation || undefined}
          number={calling.contact}
          onCancel={() => setConfirm(only ? null : "pick")}
        />
      )}

      <button
        type="button"
        onClick={() => go({ kind: "speak" })}
        className="tone-orange br-press flex min-h-[84px] items-center gap-3.5 rounded-[20px] border-0 bg-tone px-[18px] py-3.5 text-left text-ink shadow-[0_5px_0_var(--t-edge)]"
      >
        <Icon name="speakerLoud" size={34} className="shrink-0" />
        <span className="flex flex-col">
          <span className="font-display text-[21px] font-bold">
            Speak for me
          </span>
          <span className="text-[16px]">
            Type or pick a message. Your phone reads it out loud.
          </span>
        </span>
      </button>

      <h2 className="m-0 mt-2.5 font-display text-[24px] font-bold">
        Quick messages
      </h2>
      <div className="flex flex-col gap-2.5">
        {data.phrases.slice(0, 2).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => void play(p.text)}
            className={`${br.card} flex min-h-[60px] items-center gap-3 rounded-2xl px-4 py-3 text-left text-[17px] text-ink`}
          >
            <Icon name="speaker" size={22} className="shrink-0" />
            <span>{p.text}</span>
          </button>
        ))}
        {!data.loading && data.phrases.length === 0 && (
          <p className="m-0 text-ink2">
            Save a message in Speak for me and it shows up here.
          </p>
        )}
      </div>

      <h2 className="m-0 mt-2.5 font-display text-[24px] font-bold">
        Emergency
      </h2>
      {confirm === "911" ? (
        <ConfirmCall
          question="Call 911 now?"
          detail="For danger or a medical emergency."
          number="911"
          urgent
          onCancel={() => setConfirm(null)}
        />
      ) : confirm === "988" ? (
        <ConfirmCall
          question="Call 988, the crisis line?"
          detail="Free, private help any time, if you feel unsafe or very upset."
          number="988"
          urgent
          onCancel={() => setConfirm(null)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setConfirm("911")}
            className="br-press h-[60px] rounded-2xl border-0 bg-danger font-display text-[21px] font-bold text-white shadow-[0_5px_0_var(--br-danger-edge)]"
          >
            Call 911
          </button>
          <button
            type="button"
            onClick={() => setConfirm("988")}
            className={`${br.ghost} h-[60px] rounded-2xl text-[19px]`}
          >
            Crisis line 988
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => go({ kind: "contacts" })}
        className={`${br.link} mt-2 self-start px-0`}
      >
        {data.contacts.length > 0
          ? "Trusted contacts"
          : "Add a trusted contact"}
      </button>
    </div>
  );
}
