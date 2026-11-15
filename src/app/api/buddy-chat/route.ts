import { getSignedInUser } from "@/lib/auth/session";
import { askGemini, isEmergency, weeklyProgress } from "@/features/buddy-chat/service";

export async function POST(request: Request) {
  const user = await getSignedInUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const body = await request.json().catch(() => null) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 1000) return Response.json({ error: "Please write a message under 1,000 characters." }, { status: 400 });
  if (isEmergency(message)) return Response.json({ reply: "I'm sorry you're going through this. If you are in immediate danger, call 911. You can also call or text 988 for crisis support.", emergency: true }, { headers: { "Cache-Control": "no-store" } });
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: "Buddy chat is not set up yet." }, { status: 503 });
  try {
    const progress = await weeklyProgress(user.id);
    const reply = await askGemini(message, progress);
    return Response.json({ reply, emergency: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Buddy couldn't answer right now. Please try again." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
