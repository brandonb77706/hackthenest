import type { AIFeature } from "../models";
import type { AIProvider, ProviderName } from "../types";
import { createBase44Provider } from "./base44";
import { createMockProvider } from "./mock";

export interface ProviderConfig {
  feature: AIFeature;
  model: string;
}

export type ProviderFactory = (config: ProviderConfig) => AIProvider;

/** Add a provider: write providers/<name>.ts, add its name to ProviderName, register it here. */
export const PROVIDERS: Record<ProviderName, ProviderFactory> = {
  mock: createMockProvider,
  base44: createBase44Provider,
};
