import { createCode } from "@/features/guardians/service";
import { requireUser } from "@/lib/auth/session";

/** Makes a setup code: POST { name? }. A guardian can include the person's name. */
export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name : null;
  return Response.json(await createCode(user, name), { headers: { "Cache-Control": "no-store" } });
}
