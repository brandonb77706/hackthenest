// Checks a photo sent to /api/scan. Shared by the browser and the server.

import type { ImageInput } from "@/lib/ai/types";

/** Matches the Base44 function's limit. The browser shrinks photos well under this. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const TYPES: ImageInput["mime"][] = ["image/jpeg", "image/png", "image/webp"];
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Bytes in a base64 string, without decoding it. */
export function base64Bytes(data: string): number {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.floor((data.length * 3) / 4) - padding;
}

export type ScanImageCheck = { ok: true; image: ImageInput } | { ok: false; error: "not_image" | "too_big" };

export function readScanImage(body: unknown): ScanImageCheck {
  const image = (body as { image?: { data?: unknown; mime?: unknown } } | null)?.image;
  if (!image || typeof image.data !== "string" || !TYPES.includes(image.mime as ImageInput["mime"])) {
    return { ok: false, error: "not_image" };
  }
  const data = image.data.replace(/^data:[^,]*,/, "");
  if (!data || data.length % 4 !== 0 || !BASE64.test(data)) return { ok: false, error: "not_image" };
  if (base64Bytes(data) > MAX_IMAGE_BYTES) return { ok: false, error: "too_big" };
  return { ok: true, image: { data, mime: image.mime as ImageInput["mime"] } };
}
