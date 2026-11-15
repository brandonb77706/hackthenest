import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  checkRedeem,
  expiresText,
  formatCode,
  linkSides,
  makeCode,
  normalizeCode,
  redeemProblemText,
} from "./codes";

const NOW = new Date("2026-11-15T12:00:00Z");
const later = (h: number) => new Date(NOW.getTime() + h * 3600_000).toISOString();

describe("makeCode", () => {
  it("makes 6 easy-to-read characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = makeCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    }
  });
  it("never uses look-alike characters", () => {
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });
  it("skips bytes that would make some letters more likely", () => {
    let calls = 0;
    const bytes = (n: number) => new Uint8Array(n).fill(calls++ === 0 ? 255 : 0);
    expect(makeCode(bytes)).toBe("AAAAAA");
  });
});

describe("normalizeCode", () => {
  it("accepts lower case, spaces and dashes", () => {
    expect(normalizeCode("k7p 2qx")).toBe("K7P2QX");
    expect(normalizeCode("K7P-2QX")).toBe("K7P2QX");
  });
  it("rejects wrong lengths and characters", () => {
    for (const v of ["K7P2Q", "K7P2QXZ", "K7P2Q0", "", null, 123]) expect(normalizeCode(v)).toBeNull();
  });
});

it("formatCode splits the code in two", () => {
  expect(formatCode("K7P2QX")).toBe("K7P 2QX");
});

describe("checkRedeem", () => {
  const code = { from_role: "user" as const, created_by: "jordan", expires_at: later(5), used_at: null };

  it("lets the other side use a fresh code", () => {
    expect(checkRedeem(code, { id: "sam", role: "guardian" }, NOW)).toEqual({ ok: true });
  });
  it("refuses missing, used, expired and own codes", () => {
    expect(checkRedeem(null, { id: "sam", role: "guardian" }, NOW)).toEqual({ ok: false, problem: "not_found" });
    expect(checkRedeem({ ...code, used_at: later(-1) }, { id: "sam", role: "guardian" }, NOW)).toEqual({ ok: false, problem: "used" });
    expect(checkRedeem({ ...code, expires_at: later(0) }, { id: "sam", role: "guardian" }, NOW)).toEqual({ ok: false, problem: "expired" });
    expect(checkRedeem(code, { id: "jordan", role: "user" }, NOW)).toEqual({ ok: false, problem: "own_code" });
  });
  it("refuses a code from the same side, so two users can't link", () => {
    expect(checkRedeem(code, { id: "taylor", role: "user" }, NOW)).toEqual({ ok: false, problem: "wrong_side" });
    expect(checkRedeem({ ...code, from_role: "guardian" }, { id: "sam2", role: "guardian" }, NOW)).toEqual({
      ok: false,
      problem: "wrong_side",
    });
  });
});

describe("linkSides", () => {
  it("works out who is the user and who is the guardian", () => {
    expect(linkSides({ from_role: "user", created_by: "jordan" }, "sam")).toEqual({ user_id: "jordan", guardian_id: "sam" });
    expect(linkSides({ from_role: "guardian", created_by: "sam" }, "jordan")).toEqual({ user_id: "jordan", guardian_id: "sam" });
  });
});

it("explains each problem in plain words", () => {
  expect(redeemProblemText("expired", "user")).toBe("That code is too old. Ask for a new one.");
  expect(redeemProblemText("wrong_side", "guardian")).toMatch(/Me tab/);
  expect(redeemProblemText("bad_format", "user")).toMatch(/6 letters and numbers/);
});

it("expiresText counts down in hours", () => {
  expect(expiresText(later(24), NOW)).toBe("Works once, for 24 more hours.");
  expect(expiresText(later(1.5), NOW)).toBe("Works once, for 1 more hour.");
  expect(expiresText(later(0.2), NOW)).toBe("Works once, for a few more minutes.");
});
