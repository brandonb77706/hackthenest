"use client";

// Guardian Me: what the person can change in their own app. Both start on.
// Turning one off never stops them doing their routines or choosing what
// contacts see.

import { useState } from "react";
import { Switch } from "@/components/bridge/Switch";
import { br } from "@/components/bridge/styles";

type Key = "user_can_edit_routines" | "user_can_edit_contacts";

interface Props {
  linkId: string;
  name: string;
  initial: Record<Key, boolean>;
}

export function GuardianControls({ linkId, name, initial }: Props) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function change(key: Key, on: boolean) {
    const before = values;
    setValues({ ...values, [key]: on });
    setError(null);
    const res = await fetch(`/api/links/${linkId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: on }),
    }).catch(() => null);
    if (!res?.ok) {
      setValues(before);
      setError("Couldn't save that. Check your internet.");
    }
  }

  const rows: { key: Key; label: string; sub: string }[] = [
    {
      key: "user_can_edit_routines",
      label: `${name} can make and change routines`,
      sub: `Off: you add routines for ${name}. They can still do them.`,
    },
    {
      key: "user_can_edit_contacts",
      label: `${name} can add and change trusted contacts`,
      sub: `Off: you add contacts for ${name}. They still choose what each one sees.`,
    },
  ];

  return (
    <>
      <h2 className={`${br.h2} mt-2 text-[22px]`}>What {name} can change</h2>
      <div className={`${br.card} flex flex-col overflow-hidden rounded-[18px]`}>
        {rows.map((r, i) => (
          <Switch
            key={r.key}
            checked={values[r.key]}
            onChange={(on) => change(r.key, on)}
            className={`rounded-none border-0 ${i > 0 ? "border-t-2 border-line" : ""}`}
          >
            <span>{r.label}</span>
            <span className="text-[15px] text-ink2">{r.sub}</span>
          </Switch>
        ))}
      </div>
      {error && (
        <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
          {error}
        </p>
      )}
    </>
  );
}
