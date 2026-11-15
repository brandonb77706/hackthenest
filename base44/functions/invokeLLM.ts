// Base44 backend function: invokeLLM
//
// Paste this into the Base44 app as a backend function named "invokeLLM".
// Base44 doesn't let outside apps call InvokeLLM directly, so our Next.js
// server calls this function, and this function calls the AI with the app's
// service role.
//
// It only answers requests that send the shared secret, so nobody else can
// spend the app's AI credits. Set the same value in two places:
//   - Base44 app secrets:  BRIDGE_FUNCTION_SECRET
//   - our .env.local:      BASE44_FUNCTION_SECRET
//
// This file runs on Base44 (Deno), not in our app, so it's excluded from our
// TypeScript and lint checks.

import { createClientFromRequest } from "npm:@base44/sdk";

const MAX_PROMPT_CHARS = 20000;

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { secret, prompt, response_json_schema, model, file_urls } = body ?? {};

    const expected = Deno.env.get("BRIDGE_FUNCTION_SECRET");
    if (!expected || secret !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
      return Response.json({ error: "Bad prompt" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      ...(response_json_schema ? { response_json_schema } : {}),
      ...(model ? { model } : {}),
      ...(Array.isArray(file_urls) && file_urls.length ? { file_urls } : {}),
    });

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
