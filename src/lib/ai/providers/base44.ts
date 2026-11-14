import type { AIProvider } from "../types";
import type { ProviderConfig } from "./index";

/**
 * Base44 AI provider. Not connected yet: the team connects Base44 after the
 * features work (see docs/architecture.md).
 *
 * When connecting, install @base44/sdk and call:
 *   base44.integrations.Core.InvokeLLM({ prompt, response_json_schema, file_urls, model })
 */
export function createBase44Provider(config: ProviderConfig): AIProvider {
  const notConnected = () =>
    Promise.reject(
      new Error(
        `Base44 isn't connected yet (feature: ${config.feature}). ` +
          `Set this feature's provider to "mock" in src/lib/ai/models.ts until it is.`,
      ),
    );

  return {
    generateText: notConnected,
    generateJSON: notConnected,
  };
}
