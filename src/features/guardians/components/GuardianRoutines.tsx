"use client";

// Guardian Routines, from the design: the person's routines (when shared) and
// "+ New" to help add one. The person can change or delete it in their own app.

import { useState, type FormEvent } from "react";
import { br } from "@/components/bridge/styles";
import { formatStepCount, formatTime } from "@/features/routine-builder/format";
import { LIMITS } from "@/features/routine-builder/routineInput";
import { WEEKDAYS } from "@/lib/types";
import { statusLabel } from "../day";
import { usePersonDay } from "./usePersonDay";

/** One step per line; blank lines skipped. */
export function stepsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function GuardianRoutines({ personId, name }: { personId: string; name: string }) {
  const { day, error, reload } = usePersonDay(personId);
  const who = day?.name || name;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("08:00");
  const [steps, setSteps] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setProblem(null);
    const list = stepsFromText(steps);
    if (!title.trim()) return setProblem("Add a name for this routine.");
    if (list.length === 0) return setProblem("Add at least one step, one per line.");
    if (list.length > LIMITS.stepsMax) return setProblem(`Use ${LIMITS.stepsMax} steps or fewer.`);
    setBusy(true);
    try {
      const res = await fetch(`/api/guardian/people/${personId}/routines`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          goal: "",
          days: WEEKDAYS,
          start_time: time,
          steps: list.map((text) => ({ text, minutes: 5 })),
          tone: "teal",
          remind: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { errors?: Record<string, unknown> };
        const errs = body.errors ?? {};
        throw new Error(
          (typeof errs.title === "string" && errs.title) ||
            (typeof errs.start_time === "string" && errs.start_time) ||
            (errs.step ? `Each step needs ${LIMITS.stepTextMax} letters or fewer.` : "") ||
            "Couldn't add it. Try again.",
        );
      }
      setNote(`Added ${title.trim()} to ${who}'s routines. ${who} can change it in their app.`);
      setTitle("");
      setSteps("");
      setOpen(false);
      void reload();
    } catch (err) {
      setProblem(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn't add it. Check your internet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5 px-4 pb-[120px] pt-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 font-display text-[32px] font-bold">Routines</h1>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            setProblem(null);
          }}
          className={`${br.ghost} h-12 rounded-[14px] px-4 text-[17px]`}
        >
          {open ? "Close" : "+ New"}
        </button>
      </div>
      {note && (
        <p role="status" className="m-0 rounded-2xl bg-go-soft px-4 py-3 text-[17px] font-bold">
          {note}
        </p>
      )}

      {open && (
        <form onSubmit={add} className="flex flex-col gap-2.5 rounded-[20px] border-2 border-dashed border-cta bg-surface p-4">
          <label htmlFor="g-routine" className={`${br.label} -mb-1`}>
            Routine name
          </label>
          <input
            id="g-routine"
            maxLength={LIMITS.titleMax}
            placeholder="e.g. Laundry day"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={br.input}
          />
          <label htmlFor="g-time" className={`${br.label} -mb-1`}>
            Time
          </label>
          <input id="g-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={br.input} />
          <label htmlFor="g-steps" className={`${br.label} -mb-1`}>
            Steps, one per line
          </label>
          <textarea
            id="g-steps"
            rows={4}
            placeholder={"Sort the clothes\nPut them in the washer\nAdd one scoop of soap"}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className={`${br.input} py-3`}
          />
          <p className="m-0 text-[15px] text-ink2">Every day, 5 minutes a step. {who} can change it.</p>
          {problem && (
            <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
              {problem}
            </p>
          )}
          <button type="submit" disabled={busy} className={`${br.cta} min-h-[54px] rounded-[14px] text-[18px]`}>
            {busy ? "Adding…" : `Add to ${who}'s routines`}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="m-0 rounded-[14px] bg-danger-soft px-4 py-3 text-[17px] font-bold text-danger-text">
          Couldn&apos;t load routines. Check your internet.
        </p>
      )}
      {day && !day.routines && (
        <p className="m-0 rounded-2xl bg-primary-soft px-4 py-3.5 text-[17px]">
          {who} hasn&apos;t shared their routines, so you can&apos;t see them. You can still add one.
        </p>
      )}
      {day?.routines?.length === 0 && <p className="m-0 rounded-2xl bg-sunken px-4 py-3.5">No routines yet.</p>}
      {day?.routines?.map((r) => (
        <div
          key={r.id}
          className={`tone-${r.tone} flex flex-col overflow-hidden rounded-[20px] border-2 border-tone-edge bg-surface shadow-[0_4px_0_var(--t-edge)]`}
        >
          <span className="flex items-center justify-between gap-2.5 bg-tone px-4 py-3.5 text-tone-ink">
            <strong className="font-display text-[21px]">{r.title}</strong>
            <span className="shrink-0 text-[15px] font-bold">{formatTime(r.start_time)}</span>
          </span>
          <span className="flex items-center justify-between px-4 py-3 text-[16px]">
            <span className="text-ink2">{formatStepCount(r.step_count)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[15px] font-bold ${r.status === "done" ? "bg-go-soft" : "bg-sunken"}`}>
              {statusLabel(r)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
