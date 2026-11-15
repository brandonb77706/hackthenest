import { purchaseProblemText } from "@/features/rewards/shop";
import { buyBuddy } from "@/features/rewards/shopService";
import { getCurrentUserId } from "@/lib/db";

/** Buys a shop Buddy with tokens and puts it on: POST { avatar_id } */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { avatar_id?: unknown } | null;
  if (typeof body?.avatar_id !== "string") return Response.json({ error: "Bad request" }, { status: 400 });
  const result = await buyBuddy(await getCurrentUserId(), body.avatar_id);
  if (result.ok) return Response.json({ buddy_name: result.name, tokens: result.tokens });
  if ("reason" in result) return Response.json({ error: "Buddy not found" }, { status: 404 });
  return Response.json(
    { error: purchaseProblemText(result.check, result.name), reason: result.check.reason },
    { status: result.check.reason === "not_enough" ? 402 : 409 },
  );
}
