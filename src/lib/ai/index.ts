// The AI layer. Use it from server code only (route handlers in src/app/api/),
// because real providers hold secret keys.
//
//   const raw = await ai.forFeature("routineBuilder").generateJSON({ prompt, schema });
//   const result = parseRoutine(raw, supportLevel);

import { AI_CONFIG, type AIFeature } from "./models";
import { PROVIDERS } from "./providers";
import type { AIProvider } from "./types";

export const ai = {
  forFeature(feature: AIFeature): AIProvider {
    const { provider, model } = AI_CONFIG[feature];
    return PROVIDERS[provider]({ feature, model });
  },
};

export type { AIFeature } from "./models";
export type { AIProvider, JSONInput, TextInput } from "./types";
