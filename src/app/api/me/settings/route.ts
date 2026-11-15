import { updateMeSettings } from "@/features/me/service";
import { getCurrentUserId } from "@/lib/db";
import { isColorScheme, type ColorSchemeId } from "@/lib/theme";

/** Saves look settings: PATCH { color_scheme?, show_buddy? } */
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as { color_scheme?: unknown; show_buddy?: unknown } | null;
  const patch: { color_scheme?: ColorSchemeId; show_buddy?: boolean } = {};
  if (body?.color_scheme !== undefined) {
    if (!isColorScheme(body.color_scheme)) return Response.json({ error: "Unknown color scheme" }, { status: 400 });
    patch.color_scheme = body.color_scheme;
  }
  if (body?.show_buddy !== undefined) {
    if (typeof body.show_buddy !== "boolean") return Response.json({ error: "show_buddy must be true or false" }, { status: 400 });
    patch.show_buddy = body.show_buddy;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: "Nothing to change" }, { status: 400 });
  await updateMeSettings(await getCurrentUserId(), patch);
  return Response.json(patch);
}
