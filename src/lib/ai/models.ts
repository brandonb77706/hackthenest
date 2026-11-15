import type { ProviderName } from "./types";

/**
 * The only place that says which provider and model each feature uses.
 *
 * Providers: "base44" (Base44 AI, InvokeLLM) or "mock" (sample answers, no keys).
 * A feature set to "base44" uses the mock when NEXT_PUBLIC_BASE44_APP_ID isn't
 * set, so the app still runs on laptops without Base44 set up.
 *
 * Base44 models: "default" uses the model chosen in the Base44 app's settings.
 * To pin one, use a name from the InvokeLLM model list in
 * node_modules/@base44/sdk/dist/modules/integrations.types.d.ts. Don't guess names.
 */
export const AI_CONFIG = {
  routineBuilder: { provider: "base44", model: "default" },
  cameraHelp: { provider: "mock", model: "mock" },
  stuckHelp: { provider: "mock", model: "mock" },
  speakForMe: { provider: "mock", model: "mock" },
} as const satisfies Record<string, { provider: ProviderName; model: string }>;

export type AIFeature = keyof typeof AI_CONFIG;
