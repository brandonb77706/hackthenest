import type { CameraHelpResponse } from "@/lib/ai/prompts/cameraHelp";

export interface ExplainerScene { heading: string; text: string; }

/** Present the existing scan result without adding claims or dropping deadlines. */
export function makeScenes(result: CameraHelpResponse): ExplainerScene[] {
  const scenes: ExplainerScene[] = [
    { heading: "What this is", text: result.what_it_is },
    { heading: "What it means", text: result.summary },
  ];
  if (!result.confident) scenes.push({ heading: "Check the picture", text: "I couldn't read all of it. Check the paper or try another picture." });
  for (const action of result.actions) scenes.push({ heading: "What to do", text: action });
  for (const deadline of result.deadlines) scenes.push({ heading: "Important date", text: `${deadline.title}: ${deadline.date}` });
  return scenes;
}
