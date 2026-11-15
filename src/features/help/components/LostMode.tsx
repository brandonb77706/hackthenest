"use client";

// I'm lost: find where you are, then send it to a trusted contact who has
// lost alerts turned on. Nothing is sent until the person taps Send.
// There's no messaging service yet, so Send opens the phone's own texting
// or email app with the message filled in. (George's lost mode logic.)

import { useState } from "react";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import type { TrustedContact } from "@/lib/types";
import { ConfirmCall } from "./ConfirmCall";
import {
  getCurrentLocation,
  LOCATION_FAILURE_MESSAGES,
  type LocationResult,
} from "../location";
import {
  buildLostMessage,
  buildMapsLink,
  LOST_STEPS,
  lostAlertRecipients,
} from "../lostMode";

interface Props {
  userName: string;
  contacts: TrustedContact[];
  /** Tests pass a fake. The real screen uses the browser's location. */
  locate?: () => Promise<LocationResult>;
}

type Status =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "found"; result: LocationResult }
  | { kind: "sent" };

/** A link that opens the phone's texting or email app with the message filled in. */
export function sendLink(
  contact: TrustedContact,
  message: string,
): string | null {
  if (contact.method === "sms")
    return `sms:${contact.contact}?&body=${encodeURIComponent(message)}`;
  if (contact.method === "email")
    return `mailto:${contact.contact}?subject=${encodeURIComponent("I'm lost")}&body=${encodeURIComponent(message)}`;
  return null;
}

export function LostMode({
  userName,
  contacts,
  locate = getCurrentLocation,
}: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirmCall, setConfirmCall] = useState(false);
  const [confirm911, setConfirm911] = useState(false);
  const recipients = lostAlertRecipients(contacts);
  const recipient = recipients[0] ?? null;
  const names = recipients.map((c) => c.name).join(" and ");

  async function findMe() {
    setStatus({ kind: "locating" });
    const result = await locate();
    setStatus({ kind: "found", result });
  }

  const found = status.kind === "found" ? status.result : null;
  const coords = found?.ok ? found.coords : null;
  const message = buildLostMessage({ userName, coords });

  return (
    <div className="flex flex-col gap-3.5">
      {status.kind === "idle" && (
        <>
          <p className="m-0 -mt-1 text-[19px]">
            {recipient
              ? `${names} will get a message with where you are. Nothing is sent until you tap.`
              : "Add a trusted contact with lost alerts on, and Bridge can send them where you are."}
          </p>
          <button
            type="button"
            onClick={findMe}
            className={`${br.cta} flex h-[62px] items-center justify-center gap-2.5 rounded-2xl text-[21px]`}
          >
            <Icon name="location" size={24} strokeWidth={2.2} />
            I&apos;m lost
          </button>
        </>
      )}

      {status.kind !== "idle" && (
        <ol className="m-0 flex list-decimal flex-col gap-2 rounded-2xl bg-go-soft py-4 pl-10 pr-4 text-[20px] font-bold">
          {LOST_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}

      <div aria-live="polite" className="flex flex-col gap-3.5">
        {status.kind === "locating" && (
          <p className="m-0 font-display text-[19px] font-semibold">
            Finding where you are…
          </p>
        )}

        {found?.ok === false && (
          <div className={`${br.card} flex flex-col gap-3 rounded-[20px] p-4`}>
            <p className="m-0">{LOCATION_FAILURE_MESSAGES[found.reason]}</p>
            <button
              type="button"
              onClick={findMe}
              className={`${br.ghost} h-14 rounded-2xl text-[18px]`}
            >
              Try again
            </button>
          </div>
        )}

        {coords && status.kind === "found" && (
          <>
            <a
              href={buildMapsLink(coords)}
              target="_blank"
              rel="noreferrer"
              className={`${br.ghost} flex h-14 items-center justify-center gap-2 rounded-2xl text-[18px] no-underline`}
            >
              <Icon name="location" size={22} />
              Open where I am in Maps
            </a>
            {recipient ? (
              <>
                <p className="m-0 text-[17px] text-ink2">
                  <span className="font-bold text-ink">{names} will get: </span>
                  {message}
                </p>
                {(() => {
                  const href = sendLink(recipient, message);
                  return href ? (
                    <a
                      href={href}
                      onClick={() => setStatus({ kind: "sent" })}
                      className={`${br.cta} flex h-[62px] items-center justify-center gap-2.5 rounded-2xl text-[21px] no-underline`}
                    >
                      Send my location to {recipient.name}
                    </a>
                  ) : (
                    <p className="m-0 rounded-2xl bg-sunken px-4 py-3">
                      Bridge can&apos;t message {recipient.name} on Telegram
                      yet. Show them the map link above.
                    </p>
                  );
                })()}
              </>
            ) : (
              <p className="m-0 rounded-2xl bg-sunken px-4 py-3">
                No one has lost alerts turned on, so nothing is sent. Show
                someone the map link above.
              </p>
            )}
          </>
        )}

        {status.kind === "sent" && recipient && (
          <>
            <div
              role="status"
              className="flex items-start gap-3 rounded-[18px] bg-go-soft p-4"
            >
              <Icon
                name="check"
                size={28}
                strokeWidth={3}
                className="shrink-0 text-go-edge"
              />
              <span>
                <strong className="font-display text-[19px]">
                  Message ready for {recipient.name}.
                </strong>
                <br />
                Stay where you are. {recipient.name} will call you.
              </span>
            </div>
            {recipient.method === "sms" &&
              (confirmCall ? (
                <ConfirmCall
                  question={`Call ${recipient.name} now?`}
                  detail={recipient.relation || undefined}
                  number={recipient.contact}
                  onCancel={() => setConfirmCall(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCall(true)}
                  className={`${br.cta} h-[58px] rounded-2xl text-[20px]`}
                >
                  Call {recipient.name}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setStatus({ kind: "idle" })}
              className={`${br.ghost} h-[54px] rounded-2xl text-[18px]`}
            >
              Done
            </button>
          </>
        )}
      </div>

      {/* 911 is always on screen, whatever else is showing. It asks first. */}
      {confirm911 ? (
        <ConfirmCall
          question="Call 911 now?"
          detail="For danger or a medical emergency."
          number="911"
          urgent
          onCancel={() => setConfirm911(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setConfirm911(true)}
          className="br-press mt-1 h-[60px] rounded-2xl border-0 bg-danger font-display text-[21px] font-bold text-on-danger shadow-[0_5px_0_var(--br-danger-edge)]"
        >
          Call 911
        </button>
      )}
    </div>
  );
}
