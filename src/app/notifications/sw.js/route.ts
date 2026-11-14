import { pushWorkerSource } from "@/features/notifications/pushWorker";

export function GET(request: Request) {
  if (new URL(request.url).hostname !== "localhost") return new Response("Localhost only", { status: 404 });
  return new Response(pushWorkerSource, {
    headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" },
  });
}
