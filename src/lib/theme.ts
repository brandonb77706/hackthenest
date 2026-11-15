// Bridge color schemes, from the "Bridge Mockups" design. The colors live in
// src/app/themes.css; this lists each scheme for the picker on the Me tab.

export const COLOR_SCHEMES = [
  {
    id: "blue",
    name: "Baby blue",
    who: "Everyone (default)",
    description: "Soft baby blue with peach, sunshine yellow and mint.",
    swatches: ["#8ED1F2", "#FFB48A", "#FFD866", "#5FCCA8"],
    preview: {
      canvas: "#F7FBFE",
      ink: "#0F3550",
      ink2: "#4A6478",
      hero: "#8ED1F2",
      heroInk: "#0F3550",
    },
  },
  {
    id: "autism",
    name: "Autism acceptance",
    who: "Autism",
    description:
      "Gold is the autism acceptance color (Au). Soft blue and sea green go with it.",
    swatches: ["#FFC94D", "#A9CBF2", "#FFE38F", "#86D6C6"],
    preview: {
      canvas: "#FFFCF4",
      ink: "#1F2D3D",
      ink2: "#4E5A66",
      hero: "#FFC94D",
      heroInk: "#1F2D3D",
    },
  },
  {
    id: "adhd",
    name: "ADHD focus",
    who: "ADHD",
    description:
      "Orange is the ADHD awareness color. Calm blue balances it, so only one thing stands out at a time.",
    swatches: ["#FFB066", "#8FC0EA", "#FFD866", "#94D9AE"],
    preview: {
      canvas: "#FFFBF7",
      ink: "#22303C",
      ink2: "#52606B",
      hero: "#FFB066",
      heroInk: "#22303C",
    },
  },
  {
    id: "down",
    name: "Sunny blue",
    who: "Down syndrome",
    description:
      "Yellow and blue are the Down syndrome awareness colors. Bright, friendly and easy to tell apart.",
    swatches: ["#FFE070", "#93C6F2", "#FFE9A3", "#9DDAB6"],
    preview: {
      canvas: "#FFFEF6",
      ink: "#1C2F4A",
      ink2: "#4B5A6E",
      hero: "#FFE070",
      heroInk: "#1C2F4A",
    },
  },
  {
    id: "dyslexia",
    name: "Dyslexia friendly",
    who: "Dyslexia and reading",
    description:
      "A cream page cuts glare, text is a softer dark brown, and letters and words get a little more space.",
    swatches: ["#BCD9B6", "#F5C29B", "#F2D27A", "#A8D5C9"],
    preview: {
      canvas: "#FBF6E9",
      ink: "#2E2A24",
      ink2: "#5C5446",
      hero: "#BCD9B6",
      heroInk: "#2E2A24",
    },
  },
  {
    id: "epilepsy",
    name: "Still lavender",
    who: "Epilepsy and seizures",
    description:
      "Lavender is the epilepsy awareness color. All movement and flashing are turned off.",
    swatches: ["#CDB8F0", "#A8DCCB", "#F5DB8E", "#A8DCCB"],
    preview: {
      canvas: "#FBF9FE",
      ink: "#2A2340",
      ink2: "#5A5370",
      hero: "#CDB8F0",
      heroInk: "#2A2340",
    },
  },
  {
    id: "colorblind",
    name: "Color-blind safe",
    who: "Color blindness",
    description:
      "Blue and orange stay easy to tell apart for most kinds of color blindness. Done and warning also differ in lightness.",
    swatches: ["#7CC4F0", "#F2A65A", "#F0E46A", "#9ED4F5"],
    preview: {
      canvas: "#F8FBFE",
      ink: "#102A43",
      ink2: "#47596B",
      hero: "#7CC4F0",
      heroInk: "#102A43",
    },
  },
  {
    id: "calm",
    name: "Calm",
    who: "Sensory sensitivity",
    description:
      "Muted colors and a navy header for people who find bright color overwhelming.",
    swatches: ["#16213E", "#B54708", "#8F6200", "#0B6E5B"],
    preview: {
      canvas: "#F4F6FA",
      ink: "#16213E",
      ink2: "#4A5571",
      hero: "#16213E",
      heroInk: "#FFFFFF",
    },
  },
  {
    id: "contrast",
    name: "High contrast",
    who: "Low vision",
    description: "Black and white with yellow buttons. The strongest contrast.",
    swatches: ["#000000", "#FFFFFF", "#FFD60A", "#FF8A6B"],
    preview: {
      canvas: "#000000",
      ink: "#FFFFFF",
      ink2: "#E8E8E8",
      hero: "#000000",
      heroInk: "#FFFFFF",
    },
  },
] as const;

export type ColorSchemeId = (typeof COLOR_SCHEMES)[number]["id"];

export const COLOR_SCHEME_IDS = COLOR_SCHEMES.map(
  (s) => s.id,
) as ColorSchemeId[];

export const DEFAULT_COLOR_SCHEME: ColorSchemeId = "blue";

export function isColorScheme(value: unknown): value is ColorSchemeId {
  return (
    typeof value === "string" && (COLOR_SCHEME_IDS as string[]).includes(value)
  );
}
