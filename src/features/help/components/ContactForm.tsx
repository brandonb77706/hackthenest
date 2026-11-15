"use client";

// Add or change a trusted contact. Every sharing setting starts off.

import { useState } from "react";
import { Switch } from "@/components/bridge/Switch";
import { br } from "@/components/bridge/styles";
import {
  DEFAULT_CONTACT_PERMISSIONS,
  type ContactMethod,
  type TrustedContact,
} from "@/lib/types";
import {
  checkContact,
  type ContactErrors,
  type ContactInput,
} from "../contactInput";

interface Props {
  existing?: TrustedContact;
  onSaved: (contact: TrustedContact) => void;
  onDeleted?: () => void;
  onCancel: () => void;
}

const METHODS: { value: ContactMethod; label: string; hint: string }[] = [
  { value: "sms", label: "Phone", hint: "Phone number" },
  { value: "email", label: "Email", hint: "Email address" },
  { value: "telegram", label: "Telegram", hint: "Telegram username" },
];

const SHARING: {
  key: keyof typeof DEFAULT_CONTACT_PERMISSIONS;
  label: string;
  sub: string;
}[] = [
  {
    key: "can_get_lost_alerts",
    label: "Where I am, when I tap I'm lost",
    sub: "Only then. Never in the background",
  },
  {
    key: "can_get_stuck_alerts",
    label: "When I'm stuck on a step",
    sub: "If I ask for help twice",
  },
  {
    key: "can_see_routines",
    label: "When I finish a routine",
    sub: "A short note, no details",
  },
];

export function ContactForm({ existing, onSaved, onDeleted, onCancel }: Props) {
  const [form, setForm] = useState<ContactInput>({
    name: existing?.name ?? "",
    method: existing?.method ?? "sms",
    contact: existing?.contact ?? "",
    relation: existing?.relation ?? "",
    can_see_routines:
      existing?.can_see_routines ??
      DEFAULT_CONTACT_PERMISSIONS.can_see_routines,
    can_get_lost_alerts:
      existing?.can_get_lost_alerts ??
      DEFAULT_CONTACT_PERMISSIONS.can_get_lost_alerts,
    can_get_stuck_alerts:
      existing?.can_get_stuck_alerts ??
      DEFAULT_CONTACT_PERMISSIONS.can_get_stuck_alerts,
  });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const method = METHODS.find((m) => m.value === form.method) ?? METHODS[0];

  const set = (patch: Partial<ContactInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors({});
    setMessage("");
  };

  async function save() {
    const checked = checkContact(form);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        existing ? `/api/contacts/${existing.id}` : "/api/contacts",
        {
          method: existing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checked.value),
        },
      );
      if (!response.ok) throw new Error(String(response.status));
      onSaved(((await response.json()) as { contact: TrustedContact }).contact);
    } catch {
      setMessage("Couldn't save. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    const response = await fetch(`/api/contacts/${existing.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);
    if (response && (response.ok || response.status === 404)) onDeleted?.();
    else setMessage("Couldn't remove them. Check your internet and try again.");
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="m-0 -mt-1 text-ink2">
        Someone you trust, like family or a friend. You choose what they get.
      </p>

      <label htmlFor="contact-name" className={`${br.label} -mb-2`}>
        Their name
      </label>
      <input
        id="contact-name"
        value={form.name}
        maxLength={40}
        placeholder="Sam"
        onChange={(e) => set({ name: e.target.value })}
        className={br.input}
        aria-invalid={Boolean(errors.name)}
      />
      {errors.name && (
        <p className="m-0 -mt-1 font-bold text-danger-text">{errors.name}</p>
      )}

      <label htmlFor="contact-relation" className={`${br.label} -mb-2`}>
        Who they are <span className="font-normal text-ink2">(optional)</span>
      </label>
      <input
        id="contact-relation"
        value={form.relation}
        maxLength={40}
        placeholder="Your brother"
        onChange={(e) => set({ relation: e.target.value })}
        className={br.input}
      />

      <span className={br.label}>How to reach them</span>
      <div
        role="radiogroup"
        aria-label="How to reach them"
        className="-mt-1 grid grid-cols-3 gap-2"
      >
        {METHODS.map((m) => {
          const on = form.method === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set({ method: m.value })}
              className={`min-h-[52px] rounded-[14px] p-1 font-display text-[16px] font-semibold ${on ? br.choiceOn : br.choiceOff}`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <label htmlFor="contact-value" className={`${br.label} -mb-2`}>
        {method.hint}
      </label>
      <input
        id="contact-value"
        type={
          form.method === "sms"
            ? "tel"
            : form.method === "email"
              ? "email"
              : "text"
        }
        inputMode={
          form.method === "sms"
            ? "tel"
            : form.method === "email"
              ? "email"
              : "text"
        }
        value={form.contact}
        onChange={(e) => set({ contact: e.target.value })}
        className={br.input}
        aria-invalid={Boolean(errors.contact)}
      />
      {errors.contact && (
        <p className="m-0 -mt-1 font-bold text-danger-text">{errors.contact}</p>
      )}

      <h3 className="m-0 mt-1.5 font-display text-[20px] font-bold">
        What {form.name.trim() || "they"} can get
      </h3>
      <p className="m-0 -mt-2 text-[16px] text-ink2">
        Everything starts off. You can change this any time.
      </p>
      <div className="flex flex-col gap-2.5">
        {SHARING.map((s) => (
          <Switch
            key={s.key}
            checked={form[s.key]}
            onChange={(on) => set({ [s.key]: on })}
          >
            <span>{s.label}</span>
            <span className="text-[15px] text-ink2">{s.sub}</span>
          </Switch>
        ))}
      </div>

      {message && (
        <p role="alert" className="m-0 font-bold text-danger-text">
          {message}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className={`${br.cta} mt-1 h-[58px] rounded-2xl text-[20px]`}
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={`${br.ghost} h-[52px] rounded-2xl text-[17px]`}
      >
        Cancel
      </button>

      {existing &&
        onDeleted &&
        (confirmDelete ? (
          <div
            role="group"
            aria-label="Remove this contact?"
            className="flex flex-col gap-3 rounded-[20px] border-[3px] border-danger bg-danger-soft p-[18px]"
          >
            <p className="m-0 font-display text-[20px] font-bold">
              Remove {existing.name}? They won&apos;t get anything from Bridge.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="br-press h-14 rounded-2xl border-0 bg-danger font-display text-[19px] font-bold text-on-danger shadow-[0_5px_0_var(--br-danger-edge)]"
            >
              Yes, remove them
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className={`${br.ghost} h-14 rounded-2xl text-[19px]`}
            >
              Keep them
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="min-h-12 self-center border-0 bg-transparent px-2 font-display text-[17px] font-semibold text-danger-text"
          >
            Remove this contact
          </button>
        ))}
    </div>
  );
}
