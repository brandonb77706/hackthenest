import { expect, it } from "vitest";
import { makeScenes } from "./scenes";
it("preserves uncertainty, actions and every deadline without inventing details", () => {
  expect(makeScenes({ what_it_is: "A letter", summary: "Read it.", confident: false, actions: ["Call the office"], deadlines: [{ title: "Reply", date: "2026-12-01" }] })).toEqual([
    { heading: "What this is", text: "A letter" },
    { heading: "What it means", text: "Read it." },
    { heading: "Check the picture", text: "I couldn't read all of it. Check the paper or try another picture." },
    { heading: "What to do", text: "Call the office" },
    { heading: "Important date", text: "Reply: 2026-12-01" },
  ]);
});
