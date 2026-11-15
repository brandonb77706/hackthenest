// Base44 AI provider. Server code only.
//
// Base44 doesn't let outside apps call InvokeLLM directly, so this calls our
// Base44 backend function "invokeLLM" (source: base44/functions/invokeLLM.ts),
// which calls InvokeLLM with the app's service role.
//
// Settings (in .env.local):
//   NEXT_PUBLIC_BASE44_APP_ID  the app's id (from the editor URL: /apps/<id>/editor). Not secret.
//   BASE44_FUNCTION_SECRET     shared secret the function checks. Secret. Must match
//                              BRIDGE_FUNCTION_SECRET in the Base44 app's secrets.

import { createClient, type Base44Client } from "@base44/sdk";
import type { AIProvider, ImageInput } from "../types";
import type { ProviderConfig } from "./index";

export const BASE44_FUNCTION = "invokeLLM";

let client: Base44Client | null = null;

export function base44AppId(): string | undefined {
  return process.env.BASE44_APP_ID || process.env.NEXT_PUBLIC_BASE44_APP_ID || undefined;
}

function getClient(): Base44Client {
  const appId = base44AppId();
  if (!appId) {
    throw new Error("Base44 isn't set up. Add NEXT_PUBLIC_BASE44_APP_ID to .env.local (see .env.example).");
  }
  client ??= createClient({ appId, analytics: { enabled: false } });
  return client;
}

/** For tests. */
export function resetBase44Client(): void {
  client = null;
}

async function invokeLLM(params: {
  prompt: string;
  model: string;
  response_json_schema?: object;
  files?: string[];
  images?: ImageInput[];
}): Promise<unknown> {
  const secret = process.env.BASE44_FUNCTION_SECRET;
  if (!secret) {
    throw new Error("BASE44_FUNCTION_SECRET is not set. Add it to .env.local (see base44/README.md).");
  }
  const response = await getClient().functions.invoke(BASE44_FUNCTION, {
    secret,
    prompt: params.prompt,
    // "default" (or empty) uses the model set in the Base44 app.
    ...(params.model && params.model !== "default" ? { model: params.model } : {}),
    ...(params.response_json_schema ? { response_json_schema: params.response_json_schema } : {}),
    ...(params.files?.length ? { file_urls: params.files } : {}),
    // The function stores photos privately and gives the AI a short-lived link.
    ...(params.images?.length ? { images: params.images } : {}),
  });
  const data = (response as { data?: { result?: unknown } } | undefined)?.data;
  if (!data || !("result" in data)) throw new Error("Base44 function returned no result");
  return data.result;
}

export function createBase44Provider(config: ProviderConfig): AIProvider {
  return {
    async generateText({ prompt, files, images }) {
      const result = await invokeLLM({ prompt, model: config.model, files, images });
      return typeof result === "string" ? result : JSON.stringify(result);
    },

    async generateJSON<T>({ prompt, schema, files, images }: { prompt: string; schema: object; files?: string[]; images?: ImageInput[] }) {
      const result = await invokeLLM({ prompt, model: config.model, response_json_schema: schema, files, images });
      // Usually an object. If a model returns JSON as text, read it; the feature's parser checks the shape.
      if (typeof result === "string") {
        try {
          return JSON.parse(result) as T;
        } catch {
          return result as T;
        }
      }
      return result as T;
    },
  };
}
