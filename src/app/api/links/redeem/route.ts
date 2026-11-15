import { redeemProblemText } from "@/features/guardians/codes";
import { redeemCode } from "@/features/guardians/service";
import { requireUser } from "@/lib/auth/session";

/** Enters a setup code: POST { code }. Links the two accounts. */
export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const result = await redeemCode(user, body?.code);
  if (!result.ok) {
    const status = result.problem === "bad_format" ? 400 : result.problem === "not_found" ? 404 : 409;
    return Response.json({ error: redeemProblemText(result.problem, user.role) }, { status });
  }
  return Response.json(result);
}
