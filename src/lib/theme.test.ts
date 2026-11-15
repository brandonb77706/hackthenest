// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_SCHEMES, DEFAULT_COLOR_SCHEME, isColorScheme } from "./theme";

const css = readFileSync(resolve(__dirname, "../app/themes.css"), "utf8");

function block(id: string): string {
  const start = css.indexOf(`[data-theme="${id}"] {`);
  return css.slice(start, css.indexOf("}", start));
}
const names = (text: string) => [...text.matchAll(/(--br-[a-z0-9-]+):/g)].map((m) => m[1]).sort();

describe("color schemes", () => {
  it("has the 9 schemes from the design, with baby blue as the default", () => {
    expect(COLOR_SCHEMES.map((s) => s.id)).toEqual(["blue", "autism", "adhd", "down", "dyslexia", "epilepsy", "colorblind", "calm", "contrast"]);
    expect(DEFAULT_COLOR_SCHEME).toBe("blue");
  });

  it("every scheme sets the same colors in themes.css, so nothing falls back to the wrong scheme", () => {
    const expected = names(block("blue"));
    expect(expected.length).toBeGreaterThan(40);
    for (const s of COLOR_SCHEMES) expect(names(block(s.id)), s.id).toEqual(expected);
  });

  it("checks scheme ids", () => {
    expect(isColorScheme("contrast")).toBe(true);
    expect(isColorScheme("purple")).toBe(false);
    expect(isColorScheme(undefined)).toBe(false);
  });

  it("turns off motion for epilepsy and adds letter spacing for dyslexia", () => {
    expect(css).toMatch(/\[data-theme="epilepsy"\] \*[\s\S]*animation: none !important/);
    expect(css).toMatch(/\[data-theme="dyslexia"\] body \{[\s\S]*letter-spacing/);
  });
});
