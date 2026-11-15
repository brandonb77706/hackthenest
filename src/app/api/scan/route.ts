import { readScanImage } from "@/features/camera-help/scanInput";
import { scanPhoto } from "@/features/camera-help/scan";

/**
 * Explains a photo of a letter, bill, or form: POST { image: { data, mime } }.
 * The photo isn't saved by Bridge.
 */
export async function POST(request: Request) {
  const check = readScanImage(await request.json().catch(() => null));
  if (!check.ok) {
    return Response.json(
      { error: check.error === "too_big" ? "That picture is too big." : "That isn't a picture I can read." },
      { status: check.error === "too_big" ? 413 : 400 },
    );
  }
  const scan = await scanPhoto(check.image);
  if (!scan.ok) return Response.json({ error: "I couldn't read that.", reason: scan.reason }, { status: 502 });
  // Rewards (Nati): award camera tokens here. See docs/rewards.md.
  return Response.json({ result: scan.result }, { headers: { "Cache-Control": "no-store" } });
}
