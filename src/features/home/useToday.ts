"use client";

import { useEffect, useState } from "react";
import { syncSettings } from "@/lib/settings";
import type { TodayResponse } from "./service";

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export interface TodayState {
  today: TodayResponse | null;
  loading: boolean;
  /** Plain-language problem, e.g. no internet */
  error: string;
  /** The hour on the user's clock (0 to 23), known once loaded */
  hour: number | null;
}

/** Loads today's routines and progress for the current user. */
export function useToday(): TodayState {
  const [state, setState] = useState<TodayState>({ today: null, loading: true, error: "", hour: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/today?tz=${encodeURIComponent(timeZone())}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const today = (await response.json()) as TodayResponse;
        if (cancelled) return;
        if (today.settings) syncSettings(today.settings);
        setState({ today, loading: false, error: "", hour: new Date().getHours() });
      } catch {
        if (!cancelled) {
          setState({
            today: null,
            loading: false,
            error: "Couldn't load your day. Check your internet and try again.",
            hour: new Date().getHours(),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
