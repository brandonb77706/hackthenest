"use client";

// Asks before placing a call. Nothing dials until the person taps "Yes, call".

import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";

interface Props {
  /** The question, like "Call 911 now?" */
  question: string;
  /** What's under the question, like "Sam, your brother" */
  detail?: string;
  /** The number to dial */
  number: string;
  /** Red for emergencies */
  urgent?: boolean;
  onCancel: () => void;
}

export function ConfirmCall({
  question,
  detail,
  number,
  urgent = false,
  onCancel,
}: Props) {
  return (
    <div
      role="alertdialog"
      aria-label={question}
      className={`flex flex-col gap-3 rounded-[20px] border-[3px] p-[18px] ${urgent ? "border-danger bg-danger-soft" : "border-switch-on bg-primary-soft"}`}
    >
      <p className="m-0 font-display text-[22px] font-bold">{question}</p>
      {detail && <p className="m-0 text-ink2">{detail}</p>}
      <a
        href={`tel:${number}`}
        className={`br-press flex h-14 items-center justify-center gap-2 rounded-2xl font-display text-[20px] font-bold no-underline ${
          urgent
            ? "border-0 bg-danger text-on-danger shadow-[0_5px_0_var(--br-danger-edge)]"
            : br.cta
        }`}
      >
        <Icon name="phone" size={22} strokeWidth={2.2} />
        Yes, call
      </a>
      <button
        type="button"
        onClick={onCancel}
        className={`${br.ghost} h-14 rounded-2xl text-[19px]`}
      >
        No, go back
      </button>
    </div>
  );
}
