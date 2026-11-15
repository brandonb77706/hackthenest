"use client";

import { useEffect, useState } from "react";
import { syncSettings } from "@/lib/settings";
import { localNow } from "@/lib/time";
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
    let sequence = 0;
    let loadedDay = "";
    async function load() {
      const request = ++sequence;
      const zone = timeZone();
      const requestDay = localNow(new Date(), zone).date;
      try {
        const response = await fetch(`/api/today?tz=${encodeURIComponent(zone)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const today = (await response.json()) as TodayResponse;
        if (cancelled || request !== sequence) return;
        if (localNow(new Date(), timeZone()).date !== requestDay) { void load(); return; }
        if (today.settings) syncSettings(today.settings);
        loadedDay = `${zone}:${requestDay}`;
        setState({ today, loading: false, error: "", hour: new Date().getHours() });
      } catch {
        if (!cancelled && request === sequence) {
          setState({
            today: null,
            loading: false,
            error: "Couldn't load your day. Check your internet and try again.",
            hour: new Date().getHours(),
          });
        }
      }
    }
    function refreshIfDayChanged() {
      const zone = timeZone();
      if (`${zone}:${localNow(new Date(), zone).date}` !== loadedDay) {
        setState((current) => ({ ...current, today: null, loading: true, error: "" }));
        void load();
      }
    }
    void load();
    const timer = window.setInterval(refreshIfDayChanged, 30000);
    window.addEventListener("focus", refreshIfDayChanged);
    document.addEventListener("visibilitychange", refreshIfDayChanged);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshIfDayChanged);
      document.removeEventListener("visibilitychange", refreshIfDayChanged);
    };
  }, []);

  return state;
}
