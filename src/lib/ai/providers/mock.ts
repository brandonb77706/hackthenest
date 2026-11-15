import type { AIFeature } from "../models";
import type { AIProvider } from "../types";
import type { CameraHelpResponse } from "../prompts/cameraHelp";
import type { RoutineDraft } from "../prompts/routineBuilder";
import type { StuckHelpResponse } from "../prompts/stuckHelp";
import type { ProviderConfig } from "./index";

/** Sample answers so the app works end to end before a real provider is connected. */
export const MOCK_JSON: Partial<Record<AIFeature, unknown>> = {
  routineBuilder: {
    title: "Get ready for work",
    steps: [
      { order: 1, text: "Brush your teeth", minutes: 3 },
      { order: 2, text: "Put on your work shirt", minutes: 5 },
      { order: 3, text: "Eat a quick breakfast", minutes: 10 },
      { order: 4, text: "Pack your bag and keys", minutes: 3 },
    ],
    days: ["mon", "tue", "wed", "thu", "fri"],
    start_time: "08:00",
  } satisfies RoutineDraft,
  cameraHelp: {
    what_it_is: "This is an electric bill.",
    summary: "You owe $48.20 for electricity. The bill is due soon. Paying on time avoids a late fee.",
    actions: ["Check the amount is $48.20", "Pay online or by phone", "Keep this bill until it's paid"],
    deadlines: [{ title: "Pay electric bill", date: "2026-12-01" }],
    confident: true,
  } satisfies CameraHelpResponse,
  stuckHelp: {
    reply: "That's okay. Let's take it slow. First, put the shirt on the bed.",
    emergency: false,
    offer_contact: false,
  } satisfies StuckHelpResponse,
};

export const MOCK_TEXT: Partial<Record<AIFeature, string>> = {
  speakForMe: "Excuse me, could you help me find the bus stop?",
};

export function createMockProvider(config: ProviderConfig): AIProvider {
  return fakeProvider({
    json: MOCK_JSON[config.feature],
    text: MOCK_TEXT[config.feature] ?? "This is a sample reply.",
  });
}

/** For tests: a provider that returns exactly what you give it. */
export function fakeProvider(responses: { json?: unknown; text?: string }): AIProvider {
  return {
    async generateText() {
      return responses.text ?? "";
    },
    async generateJSON<T>() {
      // Copy so a caller changing the result doesn't change the next answer.
      return structuredClone(responses.json) as T;
    },
  };
}
