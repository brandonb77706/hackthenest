"use client";

import { useEffect, useState } from "react";
import { Buddy } from "@/components/bridge/Buddy";
import { br } from "@/components/bridge/styles";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import type { CameraHelpResponse } from "@/lib/ai/prompts/cameraHelp";
import { stop } from "@/lib/voice/player";
import { makeScenes } from "./scenes";

export function ScanExplainer({ result, onExit }: { result: CameraHelpResponse; onExit: () => void }) {
  const scenes = makeScenes(result);
  const [index, setIndex] = useState(0);
  const scene = scenes[index];
  useEffect(() => () => stop(), []);
  function move(next: number) { stop(); setIndex(next); }
  return <div className="fixed inset-0 z-40 mx-auto flex w-full max-w-[480px] flex-col gap-5 overflow-y-auto bg-canvas p-4 text-ink">
    <div className="flex items-center justify-between"><h1 className={br.h1}>Your explanation</h1><button type="button" className={`${br.ghost} min-h-12 rounded-[14px] px-4`} onClick={() => { stop(); onExit(); }}>Close</button></div>
    <p className="m-0 text-[18px] text-ink2">Part {index + 1} of {scenes.length}</p>
    <div key={index} className="motion-safe:animate-[pulse_1s_ease-in-out_1] flex flex-col items-center gap-4 rounded-[22px] border-2 border-line bg-surface p-5 text-center">
      <Buddy size={110} />
      <div aria-live="polite"><h2 className={`${br.h2} mb-3`}>{scene.heading}</h2><p className="m-0 whitespace-pre-wrap text-[19px] leading-relaxed">{scene.text}</p></div>
      <ReadAloudButton text={`${scene.heading}. ${scene.text}`} label="Read this part aloud" />
    </div>
    <div className="flex gap-3"><button type="button" className={`${br.ghost} min-h-14 flex-1 rounded-2xl px-4 text-[18px]`} disabled={index === 0} onClick={() => move(index - 1)}>Back</button>
      {index < scenes.length - 1 ? <button type="button" className={`${br.cta} min-h-14 flex-1 rounded-2xl px-4 text-[18px]`} onClick={() => move(index + 1)}>Next</button> : <button type="button" className={`${br.cta} min-h-14 flex-1 rounded-2xl px-4 text-[18px]`} onClick={() => { stop(); onExit(); }}>Done</button>}</div>
  </div>;
}
