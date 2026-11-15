"use client";

import { useCallback, useEffect, useState } from "react";
import type { SpeakPhrase, TrustedContact } from "@/lib/types";

interface Loaded {
  contacts: TrustedContact[];
  phrases: SpeakPhrase[];
  error: string;
}

export interface HelpData extends Loaded {
  loading: boolean;
  refresh: () => Promise<void>;
  setPhrases: (phrases: SpeakPhrase[]) => void;
}

async function load(): Promise<Loaded> {
  try {
    const [c, p] = await Promise.all([fetch("/api/contacts", { cache: "no-store" }), fetch("/api/phrases", { cache: "no-store" })]);
    if (!c.ok || !p.ok) throw new Error("load");
    return {
      contacts: ((await c.json()) as { contacts: TrustedContact[] }).contacts,
      phrases: ((await p.json()) as { phrases: SpeakPhrase[] }).phrases,
      error: "",
    };
  } catch {
    return { contacts: [], phrases: [], error: "Couldn't load your contacts and messages. Check your internet." };
  }
}

/** Trusted contacts and saved messages for the Help tab. */
export function useHelpData(): HelpData {
  const [data, setData] = useState<Loaded | null>(null);

  const refresh = useCallback(async () => {
    const next = await load();
    setData(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void load().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    contacts: data?.contacts ?? [],
    phrases: data?.phrases ?? [],
    error: data?.error ?? "",
    loading: data === null,
    refresh,
    setPhrases: (phrases) => setData((d) => (d ? { ...d, phrases } : { contacts: [], phrases, error: "" })),
  };
}
