"use client";

// Shrinks a phone photo before upload: at most 1600px on the long side, as a
// JPEG. Text on a letter stays readable and the upload is usually under 500 KB.

import type { ImageInput } from "@/lib/ai/types";

const MAX_SIDE = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<ImageInput> {
  if (!file.type.startsWith("image/")) throw new Error("not_image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no_canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), mime: "image/jpeg" };
}
