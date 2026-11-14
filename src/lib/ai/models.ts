import type { ProviderName } from "./types";

/**
 * The only place that says which provider and model each feature uses.
 *
 * Everything uses "mock" until a real provider is connected, so the app runs
 * with sample answers and no keys. To switch a feature, change its provider
 * here. For Base44, pick a model from
 * node_modules/@base44/sdk/dist/modules/integrations.types.d.ts once the SDK
 * is installed. Don't guess model names.
 */
export const AI_CONFIG = {
  routineBuilder: { provider: "mock", model: "mock" },
  cameraHelp: { provider: "mock", model: "mock" },
  stuckHelp: { provider: "mock", model: "mock" },
  speakForMe: { provider: "mock", model: "mock" },
} as const satisfies Record<string, { provider: ProviderName; model: string }>;

export type AIFeature = keyof typeof AI_CONFIG;
