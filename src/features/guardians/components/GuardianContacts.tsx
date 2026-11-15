"use client";

// Guardian Contacts, from the design: help add someone the person can reach
// from Help. Sharing starts off; the person chooses on their Me tab. The
// person's own contact list isn't shown: they haven't shared it.

import { useState, type FormEvent } from "react";
import { br } from "@/components/bridge/styles";

export function GuardianContacts({ personId, name }: { personId: string; name: string }) {
  const [contactName, setContactName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; contact?: string; other?: string }>({});
  const [added, setAdded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const res = await fetch(`/api/guardian/people/${personId}/contacts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: contactName, relation, contact: phone, method: "sms" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { errors?: { name?: string; contact?: string } };
        setErrors(body.errors ?? { other: "Couldn't add them. Try again." });
        return;
      }
      setAdded((a) => [...a, contactName.trim()]);
      setContactName("");
      setRelation("");
      setPhone("");
    } catch {
      setErrors({ other: "Couldn't add them. Check your internet." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-[120px] pt-7">
      <h1 className="m-0 font-display text-[32px] font-bold">Trusted contacts</h1>
      <p className="m-0 -mt-2 text-[17px] text-ink2">Add someone {name} can reach from the Help tab.</p>

      {added.length > 0 && (
        <div role="status" className="flex flex-col gap-1 rounded-2xl bg-go-soft px-4 py-3">
          <strong className="text-[17px]">Added: {added.join(", ")}</strong>
          <span className="text-[16px]">
            {name} sees them on their Me tab and chooses what each one can see. Everything starts off.
          </span>
        </div>
      )}

      <form onSubmit={add} className="flex flex-col gap-2.5 rounded-[22px] border-2 border-dashed border-cta bg-surface p-[18px]">
        <h2 className={`${br.h2} text-[21px]`}>Add a contact</h2>
        <label htmlFor="g-name" className={`${br.label} -mb-1`}>
          Name
        </label>
        <input
          id="g-name"
          placeholder="e.g. Aunt Maria"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
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
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
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
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
          {busy ? "Adding…" : "+ Add contact"}
        </button>
      </form>
    </div>
  );
}
