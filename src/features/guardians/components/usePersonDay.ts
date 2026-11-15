"use client";

import { useCallback, useEffect, useState } from "react";
import type { PersonDay } from "../support";

/** Loads a linked person's day in this phone's time zone. */
export function usePersonDay(personId: string) {
  const [day, setDay] = useState<PersonDay | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const res = await fetch(`/api/guardian/people/${personId}/day?tz=${encodeURIComponent(tz)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setDay((await res.json()) as PersonDay);
      setError(false);
    } catch {
      setError(true);
    }
  }, [personId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads when the page opens
    void load();
  }, [load]);

  return { day, error, reload: load };
}
