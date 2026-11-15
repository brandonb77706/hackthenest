import { describe, expect, it } from "vitest";
import { stepIcon } from "./stepIcon";

describe("stepIcon", () => {
  it.each([
    ["Take your morning pill", "pill"],
    ["Brush your teeth", "tooth"],
    ["Get dressed", "shirt"],
    ["Eat breakfast", "bowl"],
    ["Walk to the pharmacy counter", "walk"],
    ["Plug in your phone", "phone"],
    ["Turn off the lights", "moon"],
  ])("%s → %s", (text, icon) => {
    expect(stepIcon(text)).toBe(icon);
  });

  it("uses a check mark when nothing matches", () => {
    expect(stepIcon("Water the plants")).toBe("check");
  });
});
