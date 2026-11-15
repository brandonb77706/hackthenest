import type { AIProvider, JSONInput } from "@/lib/ai/types";

/** Server-side Gemini adapter for drafting a routine from the user's goal. */
export function geminiDraftProvider(): AIProvider {
  return {
    async generateText() { throw new Error("Text generation is not supported"); },
    async generateJSON<T>(input: JSONInput): Promise<T> {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("Routine drafting is not configured");
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: input.prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseJsonSchema: input.schema },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error("Routine drafting failed");
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
      if (!text) throw new Error("Routine drafting returned no answer");
      return JSON.parse(text) as T;
    },
  };
}
