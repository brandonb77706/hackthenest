import { readScanImage } from "@/features/camera-help/scanInput";
import { scanPhoto } from "@/features/camera-help/scan";
import { claimChallenges, recordScan } from "@/features/rewards/challengeService";
import type { ChallengeStatus } from "@/features/rewards/challenges";
import { getCurrentUserId } from "@/lib/db";

/**
 * Explains a photo of a letter, bill, or form: POST ?tz=America/Chicago { image: { data, mime } }.
 * The photo isn't saved by Bridge. Only that a scan happened is saved, for the daily challenge.
 */
export async function POST(request: Request) {
  const check = readScanImage(await request.json().catch(() => null));
  if (!check.ok) {
    return Response.json(
      { error: check.error === "too_big" ? "That picture is too big." : "That isn't a picture I can read." },
      { status: check.error === "too_big" ? 413 : 400 },
    );
  }
  const userId = await getCurrentUserId();
  const scan = await scanPhoto(check.image);
  if (!scan.ok) return Response.json({ error: "I couldn't read that.", reason: scan.reason }, { status: 502 });
  // Daily challenge: count the scan. A rewards problem never hides the answer.
  let challenges: ChallengeStatus[] = [];
  try {
    await recordScan(userId);
    challenges = await claimChallenges(userId, new URL(request.url).searchParams.get("tz") || "UTC");
  } catch (error) {
    console.error("[rewards] could not count the scan", error);
  }
  return Response.json({ result: scan.result, challenges }, { headers: { "Cache-Control": "no-store" } });
}
