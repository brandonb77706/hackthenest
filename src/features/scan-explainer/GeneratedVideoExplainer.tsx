"use client";

import { useEffect, useState } from "react";
import { br } from "@/components/bridge/styles";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import type { CameraHelpResponse } from "@/lib/ai/prompts/cameraHelp";

function spokenExplanation(result: CameraHelpResponse): string {
  return [
    result.what_it_is,
    result.summary,
    result.actions.length ? `Next steps: ${result.actions.join(". ")}` : "",
    result.deadlines.length ? `Important dates: ${result.deadlines.map((date) => `${date.title}, ${date.date}`).join(". ")}` : "",
  ].filter(Boolean).join(" ");
}

export function GeneratedVideoExplainer({ result, onExit }: {
  result: CameraHelpResponse;
  onExit: () => void;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"consent" | "generating" | "ready" | "error">("consent");

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  async function createVideo() {
    setStatus("generating");
    try {
      const response = await fetch("/api/scan-explainer/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      if (!response.ok) throw new Error("video_request_failed");
      const blob = await response.blob();
      if (blob.type !== "video/mp4" || blob.size === 0) throw new Error("invalid_video");
      setVideoUrl(URL.createObjectURL(blob));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-40 mx-auto flex w-full max-w-[480px] flex-col gap-4 overflow-y-auto bg-canvas p-4 text-ink">
      <div className="flex items-center justify-between gap-3">
        <h1 className={`${br.h1} m-0`}>Video explanation</h1>
        <button type="button" className={`${br.ghost} min-h-12 shrink-0 rounded-[14px] px-4`} onClick={onExit}>Close</button>
      </div>

      {status === "consent" && (
        <section className={`${br.card} flex flex-col gap-4 rounded-[22px] p-5`} aria-labelledby="video-consent-heading">
          <h2 id="video-consent-heading" className={`${br.h2} m-0`}>Before making the video</h2>
          <p className="m-0 text-[18px] leading-relaxed">
            Bridge will send the scan explanation to Google Gemini to make a short animation. The picture is not sent again.
            The animation may leave out or misrepresent details. Check the original document for important information.
            Bridge won&apos;t save the generated video.
          </p>
          {!result.confident && <p className="m-0 rounded-xl bg-sunken p-3 text-[17px]" role="status">Bridge could not read everything clearly. The video may be incomplete.</p>}
          <button type="button" className={`${br.cta} min-h-[56px] rounded-2xl px-4 text-[18px]`} onClick={() => void createVideo()}>
            Send picture and create video
          </button>
          <button type="button" className={`${br.ghost} min-h-[52px] rounded-2xl px-4 text-[18px]`} onClick={onExit}>Cancel</button>
        </section>
      )}

      {status === "generating" && <p className="m-0 rounded-2xl bg-surface p-5 text-[18px]" role="status" aria-live="polite">Making your video. This may take a little while. Keep this screen open.</p>}

      {status === "error" && (
        <section className="flex flex-col gap-3" aria-live="polite">
          <p className="m-0 rounded-2xl bg-danger-soft p-4 text-[18px] text-danger-text" role="alert">I couldn&apos;t make the video. Your scan is still here. Try again, or close this screen.</p>
          <button type="button" className={`${br.cta} min-h-[56px] rounded-2xl px-4 text-[18px]`} onClick={() => void createVideo()}>Try again</button>
        </section>
      )}

      {status === "ready" && videoUrl && (
        <>
          <video className="w-full rounded-2xl bg-black" controls playsInline preload="metadata" aria-label="Generated animated explanation">
            <source src={videoUrl} type="video/mp4" />Your browser cannot play this video. Read the explanation below instead.
          </video>
          <p className="m-0 text-[16px] text-ink2">This animation is a visual aid. Use the text below for the exact scan result and next steps.</p>
          <section className={`${br.card} flex flex-col gap-3 rounded-[22px] p-5`} aria-labelledby="exact-explanation-heading">
            <h2 id="exact-explanation-heading" className={`${br.h2} m-0`}>{result.what_it_is}</h2>
            <p className="m-0 text-[18px]">{result.summary}</p>
            {result.actions.length > 0 && <>
              <h3 className="m-0 font-display text-[19px] font-semibold">Next steps</h3>
              <ol className="m-0 flex flex-col gap-2 pl-6 text-[18px]">{result.actions.map((action, index) => <li key={`${index}-${action}`}>{action}</li>)}</ol>
            </>}
            {result.deadlines.length > 0 && <>
              <h3 className="m-0 font-display text-[19px] font-semibold">Important dates</h3>
              <ul className="m-0 flex flex-col gap-2 pl-6 text-[18px]">{result.deadlines.map((date) => <li key={`${date.title}-${date.date}`}>{date.title}: {date.date}</li>)}</ul>
            </>}
            <ReadAloudButton text={spokenExplanation(result)} label="Read the exact explanation aloud" />
          </section>
          <button type="button" className={`${br.ghost} min-h-14 rounded-2xl px-4 text-[18px]`} onClick={onExit}>Back to scan result</button>
        </>
      )}
    </div>
  );
}
