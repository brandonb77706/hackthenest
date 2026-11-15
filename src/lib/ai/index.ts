// The AI layer. Use it from server code only (route handlers in src/app/api/),
// because real providers hold secret keys.
//
//   const raw = await ai.forFeature("routineBuilder").generateJSON({ prompt, schema });
//   const result = parseRoutine(raw);

import { AI_CONFIG, type AIFeature } from "./models";
import { PROVIDERS } from "./providers";
import { base44AppId } from "./providers/base44";
import type { AIProvider, ProviderName } from "./types";

const warned = new Set<AIFeature>();

/** The provider a feature really uses right now: Base44 falls back to the mock when it isn't set up. */
export function activeProvider(feature: AIFeature): ProviderName {
  const { provider } = AI_CONFIG[feature];
  if (provider === "base44" && !base44AppId()) {
    if (!warned.has(feature)) {
      warned.add(feature);
      console.warn(`[ai] ${feature}: Base44 isn't set up (no NEXT_PUBLIC_BASE44_APP_ID), so using sample answers.`);
    }
    return "mock";
  }
  return provider;
}

export const ai = {
  forFeature(feature: AIFeature): AIProvider {
    const provider = activeProvider(feature);
    const { model } = AI_CONFIG[feature];
    return PROVIDERS[provider]({ feature, model: provider === "mock" ? "mock" : model });
  },
};

export type { AIFeature } from "./models";
export type { AIProvider, JSONInput, TextInput } from "./types";
