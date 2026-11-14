"use client";

import { useRouter } from "next/navigation";
import type { RoutineInput } from "../routineInput";
import { RoutineEditor, type SaveResult } from "./RoutineEditor";

interface Props {
  initial: RoutineInput;
  heading: string;
  /** Set when editing a saved routine */
  routineId?: string;
}

/** Connects the editor to the routines API and goes back to the list after saving. */
export function RoutineEditorPage({ initial, heading, routineId }: Props) {
  const router = useRouter();

  function backToList() {
    router.push("/routines");
    router.refresh();
  }

  async function save(routine: RoutineInput): Promise<SaveResult> {
    const response = await fetch(routineId ? `/api/routines/${routineId}` : "/api/routines", {
      method: routineId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(routine),
    });
    if (response.ok) {
      backToList();
      return { ok: true };
    }
    const body = (await response.json().catch(() => ({}))) as { errors?: SaveResult extends { errors?: infer E } ? E : never };
    if (response.status === 404) return { ok: false, message: "This routine was deleted." };
    return { ok: false, errors: body.errors };
  }

  async function remove() {
    if (!routineId) return;
    const response = await fetch(`/api/routines/${routineId}`, { method: "DELETE" });
    if (response.ok || response.status === 404) backToList();
  }

  return <RoutineEditor initial={initial} heading={heading} onSave={save} onDelete={routineId ? remove : undefined} />;
}
