"use client";

// Guardian Contacts, from the design: help add someone the person can reach
// from Help, and change or remove the ones you added. The person's own contact
// list isn't shown (it isn't shared), and what each contact can see is always
// the person's choice.

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Dialog } from "@/components/bridge/Dialog";
import { br } from "@/components/bridge/styles";
import type { TrustedContact } from "@/lib/types";

const EMPTY = { name: "", relation: "", phone: "" };

export function GuardianContacts({ personId, name }: { personId: string; name: string }) {
  const base = `/api/guardian/people/${personId}/contacts`;
  const [contacts, setContacts] = useState<TrustedContact[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<TrustedContact | null>(null);
  const [errors, setErrors] = useState<{ name?: string; contact?: string; other?: string }>({});
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setContacts(((await res.json()) as { contacts: TrustedContact[] }).contacts);
    } catch {
      setContacts([]);
      setErrors({ other: "Couldn't load contacts. Check your internet." });
    }
  }, [base]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads once when the tab opens
    void load();
  }, [load]);

  function startEdit(c: TrustedContact) {
    setEditingId(c.id);
    setForm({ name: c.name, relation: c.relation, phone: c.contact });
    setErrors({});
    setNote(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setNote(null);
    setBusy(true);
    try {
      const res = await fetch(editingId ? `${base}/${editingId}` : base, {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.name, relation: form.relation, contact: form.phone, method: "sms" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { errors?: { name?: string; contact?: string } };
        setErrors(body.errors ?? { other: "Couldn't save. Try again." });
        return;
      }
      setNote(
        editingId
          ? `Saved ${form.name.trim()}.`
          : `Added ${form.name.trim()}. ${name} chooses what they can see on their Me tab. Everything starts off.`,
      );
      setEditingId(null);
      setForm(EMPTY);
      void load();
    } catch {
      setErrors({ other: "Couldn't save. Check your internet." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: TrustedContact) {
    const res = await fetch(`${base}/${c.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setErrors({ other: "Couldn't remove them. Check your internet." });
      return;
    }
    setRemoving(null);
    if (editingId === c.id) cancelEdit();
    setNote(`Removed ${c.name}.`);
    void load();
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-[120px] pt-7">
      <h1 className="m-0 font-display text-[32px] font-bold">Trusted contacts</h1>
      <p className="m-0 -mt-2 text-[17px] text-ink2">People {name} can reach from the Help tab. You see the ones you added.</p>

      {note && (
        <p role="status" className="m-0 rounded-2xl bg-go-soft px-4 py-3 text-[17px] font-bold">
          {note}
        </p>
      )}

      {contacts && contacts.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {contacts.map((c) => (
            <li key={c.id} className={`${br.card} flex items-center gap-3 rounded-[18px] p-3.5`}>
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-[20px] font-bold text-primary-text"
              >
                {c.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="flex min-w-0 grow flex-col">
                <strong className="text-[18px]">{c.name}</strong>
                <span className="text-[15px] text-ink2">
                  {c.relation || "Trusted contact"} · {c.contact}
                </span>
              </span>
              <button
                type="button"
                onClick={() => startEdit(c)}
                aria-label={`Change ${c.name}`}
                className={`${br.ghost} min-h-12 shrink-0 rounded-xl px-3 text-[16px]`}
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => setRemoving(c)}
                aria-label={`Remove ${c.name}`}
                className={`${br.ghost} min-h-12 shrink-0 rounded-xl px-3 text-[16px]`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={save} className="flex flex-col gap-2.5 rounded-[22px] border-2 border-dashed border-cta bg-surface p-[18px]">
        <h2 className={`${br.h2} text-[21px]`}>{editingId ? "Change contact" : "Add a contact"}</h2>
        <label htmlFor="g-name" className={`${br.label} -mb-1`}>
          Name
        </label>
        <input
          id="g-name"
          placeholder="e.g. Aunt Maria"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "g-name-error" : undefined}
          className={br.input}
        />
        {errors.name && (
          <p id="g-name-error" className="m-0 text-[16px] font-bold text-danger-text">
            {errors.name}
          </p>
        )}
        <label htmlFor="g-rel" className={`${br.label} -mb-1`}>
          How they know {name}
        </label>
        <input
          id="g-rel"
          maxLength={40}
          placeholder="e.g. Aunt, job coach, neighbor"
          value={form.relation}
          onChange={(e) => setForm({ ...form, relation: e.target.value })}
          className={br.input}
        />
        <label htmlFor="g-phone" className={`${br.label} -mb-1`}>
          Phone
        </label>
        <input
          id="g-phone"
          type="tel"
          autoComplete="off"
          placeholder="(555) 555-0100"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          aria-invalid={Boolean(errors.contact)}
          aria-describedby={errors.contact ? "g-phone-error" : undefined}
          className={br.input}
        />
        {errors.contact && (
          <p id="g-phone-error" className="m-0 text-[16px] font-bold text-danger-text">
            {errors.contact}
          </p>
        )}
        {errors.other && (
          <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
            {errors.other}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${br.cta} min-h-[54px] rounded-[14px] text-[18px]`}>
          {busy ? "Saving…" : editingId ? "Save changes" : "+ Add contact"}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit} className={`${br.ghost} min-h-12 rounded-[14px] text-[17px]`}>
            Cancel
          </button>
        )}
      </form>

      {removing && (
        <Dialog title={`Remove ${removing.name}?`} onClose={() => setRemoving(null)}>
          <p className="m-0 text-[17px]">{name} won&apos;t be able to reach them from Help anymore.</p>
          <button
            type="button"
            onClick={() => remove(removing)}
            className="br-press min-h-[58px] rounded-2xl border-2 border-danger-edge bg-danger font-display text-[20px] font-bold text-on-danger shadow-[0_5px_0_var(--br-danger-edge)]"
          >
            Remove
          </button>
          <button type="button" onClick={() => setRemoving(null)} className={`${br.ghost} min-h-[54px] rounded-2xl text-[17px]`}>
            Keep them
          </button>
        </Dialog>
      )}
    </div>
  );
}
