import { generateScanExplanationVideo, VideoGenerationError } from "@/features/scan-explainer/generateVideo";
import { parseCameraHelp } from "@/lib/ai/prompts/cameraHelp";

/** Generate a one-off scan explanation clip; no image or video is persisted. */
export async function POST(request: Request) {
  // Prevent an accidentally enabled public endpoint from spending API credits.
  if (process.env.NODE_ENV === "production" && process.env.GEMINI_VIDEO_EXPLANATIONS_ENABLED !== "true") {
    return Response.json({ error: "Video explanations are not enabled." }, { status: 404 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "Video explanations are not configured yet." }, { status: 503 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 6 * 1024 * 1024) {
    return Response.json({ error: "That picture is too big." }, { status: 413 });
  }

  const body = await request.json().catch(() => null) as { image?: unknown; result?: unknown } | null;
  const checkedResult = parseCameraHelp(body?.result);
  if (!checkedResult.ok) return Response.json({ error: "The scan explanation is incomplete." }, { status: 400 });

  try {
    const video = await generateScanExplanationVideo(checkedResult.value);
    const bodyBytes = new ArrayBuffer(video.byteLength);
    new Uint8Array(bodyBytes).set(video);
    return new Response(bodyBytes, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'inline; filename="bridge-explanation.mp4"',
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof VideoGenerationError && error.reason === "not_configured") {
      return Response.json({ error: "Video explanations are not configured yet." }, { status: 503 });
    }
    return Response.json({ error: "I couldn't create the video. Please try again." }, { status: 502 });
  }
}
