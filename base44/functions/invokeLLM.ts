// Base44 backend function: invokeLLM
//
// Paste this into the Base44 app as a backend function named "invokeLLM".
// Base44 doesn't let outside apps call InvokeLLM or upload files directly, so
// our Next.js server calls this function, and this function does both with
// the app's service role.
//
// It only answers requests that send the shared secret, so nobody else can
// spend the app's AI credits. Set the same value in two places:
//   - Base44 app secrets:  BRIDGE_FUNCTION_SECRET
//   - our .env.local:      BASE44_FUNCTION_SECRET
//
// Photos (camera help): send `images: [{ data: "<base64>", mime: "image/jpeg" }]`.
// Each one is stored as a PRIVATE file (bills and letters are personal) and the
// AI reads it through a signed link that expires in 5 minutes.
//
// This file runs on Base44 (Deno), not in our app, so it's excluded from our
// TypeScript and lint checks.

import { createClientFromRequest } from "npm:@base44/sdk";

const MAX_PROMPT_CHARS = 20000;
const MAX_IMAGES = 2;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function decodeImage(image, index) {
  if (!image || typeof image.data !== "string" || !IMAGE_TYPES.includes(image.mime)) {
    throw new Error("Bad image");
  }
  const bytes = Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0));
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image too big");
  const ext = image.mime.split("/")[1];
  return new File([bytes], `scan-${Date.now()}-${index}.${ext}`, { type: image.mime });
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { secret, prompt, response_json_schema, model, file_urls, images } = body ?? {};

    const expected = Deno.env.get("BRIDGE_FUNCTION_SECRET");
    if (!expected || secret !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS) {
      return Response.json({ error: "Bad prompt" }, { status: 400 });
    }
    if (images !== undefined && (!Array.isArray(images) || images.length > MAX_IMAGES)) {
      return Response.json({ error: "Bad images" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const core = base44.asServiceRole.integrations.Core;

    const urls = Array.isArray(file_urls) ? [...file_urls] : [];
    for (const [i, image] of (images ?? []).entries()) {
      let file;
      try {
        file = decodeImage(image, i);
      } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      const { file_uri } = await core.UploadPrivateFile({ file });
      const { signed_url } = await core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
      urls.push(signed_url);
    }

    const result = await core.InvokeLLM({
      prompt,
      ...(response_json_schema ? { response_json_schema } : {}),
      ...(model ? { model } : {}),
      ...(urls.length ? { file_urls: urls } : {}),
    });

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
