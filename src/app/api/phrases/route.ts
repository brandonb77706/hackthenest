import { connection } from "next/server";
import { MAX_PHRASE_CHARS } from "@/features/help/phrases";
import { createPhrase, listPhrases } from "@/features/help/service";
import { getCurrentUserId } from "@/lib/db";

/** The user's saved messages for Speak for me. */
export async function GET() {
  await connection();
  const phrases = await listPhrases(await getCurrentUserId());
  return Response.json({ phrases }, { headers: { "Cache-Control": "no-store" } });
}

/** Saves a message: POST { text } */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  if (!text || text.length > MAX_PHRASE_CHARS) return Response.json({ error: "Write a short message first." }, { status: 400 });
  const phrase = await createPhrase(await getCurrentUserId(), text);
  return Response.json({ phrase }, { status: 201 });
}
