import { describe, expect, it } from "vitest";
import { base64Bytes, MAX_IMAGE_BYTES, readScanImage } from "./scanInput";

describe("base64Bytes", () => {
  it("counts the bytes a base64 string holds", () => {
    expect(base64Bytes(btoa("hello"))).toBe(5);
    expect(base64Bytes(btoa("hi"))).toBe(2);
    expect(base64Bytes(btoa("abc"))).toBe(3);
  });
});

describe("readScanImage", () => {
  it("accepts a JPEG, PNG, or WebP photo", () => {
    for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
      expect(readScanImage({ image: { data: btoa("photo"), mime } })).toEqual({ ok: true, image: { data: btoa("photo"), mime } });
    }
  });

  it("removes a data: prefix", () => {
    const result = readScanImage({ image: { data: `data:image/jpeg;base64,${btoa("photo")}`, mime: "image/jpeg" } });
    expect(result.ok && result.image.data).toBe(btoa("photo"));
  });

  it("rejects things that aren't photos", () => {
    expect(readScanImage(null)).toEqual({ ok: false, error: "not_image" });
    expect(readScanImage({ image: { data: btoa("x"), mime: "application/pdf" } })).toEqual({ ok: false, error: "not_image" });
    expect(readScanImage({ image: { data: "not base64!", mime: "image/jpeg" } })).toEqual({ ok: false, error: "not_image" });
    expect(readScanImage({ image: { data: "", mime: "image/jpeg" } })).toEqual({ ok: false, error: "not_image" });
  });

  it("rejects photos over the size limit", () => {
    const big = "A".repeat(Math.ceil((MAX_IMAGE_BYTES + 3) / 3) * 4);
    expect(readScanImage({ image: { data: big, mime: "image/jpeg" } })).toEqual({ ok: false, error: "too_big" });
  });
});
