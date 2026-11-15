"use client";

// The Scan tab from the design: take a picture of a letter, bill, or form,
// and Bridge says what it is and what to do, out loud and on screen.

import { ChallengeDone } from "@/features/rewards/components/ChallengeDone";
import type { ChallengeStatus } from "@/features/rewards/challenges";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import { StepPlayer } from "@/features/step-player/components/StepPlayer";
import type { CameraHelpResponse } from "@/lib/ai/prompts/cameraHelp";
import type { ImageInput } from "@/lib/ai/types";
import { play, stop } from "@/lib/voice/player";
import { compressImage } from "../compressImage";
import { MAX_IMAGE_BYTES, base64Bytes } from "../scanInput";

type Stage =
  | { kind: "idle"; error?: string }
  | { kind: "reading" }
  | { kind: "done"; result: CameraHelpResponse }
  | { kind: "walkthrough"; result: CameraHelpResponse };

interface Props {
  /** Tests pass a fake. The real screen shrinks the photo in the browser. */
  prepare?: (file: File) => Promise<ImageInput>;
}

/** "2026-11-28" → "Nov 28" */
export function shortDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
}

/** Everything on the card, as one thing to read out loud. */
export function readAloudText(r: CameraHelpResponse): string {
  const steps = r.actions.map((a, i) => `${i + 1}. ${a}`).join(" ");
  const dates = r.deadlines
    .map((d) => `${d.title} by ${shortDate(d.date)}.`)
    .join(" ");
  return [
    r.what_it_is,
    r.summary,
    steps && `Here's what to do. ${steps}`,
    dates,
  ]
    .filter(Boolean)
    .join(" ");
}

export function ScanScreen({ prepare = compressImage }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  /** Daily challenges this scan finished */
  const [challengesDone, setChallengesDone] = useState<ChallengeStatus[]>([]);
  const cameraInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => stop(), []);

  // Move focus to the result so screen readers read it.
  useEffect(() => {
    if (stage.kind === "done") headingRef.current?.focus();
  }, [stage.kind]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStage({ kind: "reading" });
    let image: ImageInput;
    try {
      image = await prepare(file);
    } catch {
      setStage({
        kind: "idle",
        error: "That isn't a picture I can read. Try another one.",
      });
      return;
    }
    if (base64Bytes(image.data) > MAX_IMAGE_BYTES) {
      setStage({
        kind: "idle",
        error: "That picture is too big. Try another one.",
      });
      return;
    }
    try {
      // The time zone makes the scan challenge count the person's own day.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const response = await fetch(`/api/scan?tz=${encodeURIComponent(tz)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const { result, challenges } = (await response.json()) as {
        result: CameraHelpResponse;
        challenges?: ChallengeStatus[];
      };
      setChallengesDone(challenges ?? []);
      setStage({ kind: "done", result });
      void play(`${result.what_it_is} ${result.summary}`);
    } catch {
      setStage({
        kind: "idle",
        error:
          "I couldn't read that. Try again with more light, or hold the phone closer.",
      });
    }
  }

  function pick(input: HTMLInputElement | null) {
    if (!input) return;
    input.value = "";
    input.click();
  }

  if (stage.kind === "walkthrough") {
    return (
      <div className="fixed inset-0 z-40 mx-auto w-full max-w-[480px] overflow-y-auto bg-canvas">
        <StepPlayer
          walkthrough={{
            title: stage.result.what_it_is.replace(/[.!]+$/, ""),
            steps: stage.result.actions,
          }}
          onExit={() => setStage({ kind: "done", result: stage.result })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-[130px] pt-7">
      <h1 className="m-0 font-display text-[32px] font-bold">Scan</h1>

      {/* Hidden file pickers. "capture" opens the back camera on phones. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        data-testid="camera-input"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        hidden
        aria-hidden="true"
        tabIndex={-1}
        data-testid="photo-input"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      {stage.kind === "idle" && (
        <div className="flex flex-col items-center gap-3.5 text-center">
          <div className="box-border flex h-[230px] w-full items-center justify-center rounded-3xl border-[3px] border-dashed border-cta bg-primary-soft text-primary-text">
            <Icon name="doc" size={88} strokeWidth={1.5} />
          </div>
          <p className="m-0 mt-1.5 font-display text-[22px] font-semibold leading-tight">
            Take a picture of a letter, bill, or form.
          </p>
          <p className="m-0 text-ink2">
            You&apos;ll hear what it is and what to do next.
          </p>
          {stage.error && (
            <p
              role="alert"
              className="m-0 w-full rounded-2xl bg-danger-soft px-4 py-3 font-bold text-danger-text"
            >
              {stage.error}
            </p>
          )}
          <button
            type="button"
            onClick={() => pick(cameraInput.current)}
            className={`${br.cta} mt-1.5 flex h-[60px] w-full items-center justify-center gap-2.5 rounded-2xl text-[21px]`}
          >
            <Icon name="scan" size={26} strokeWidth={2.2} />
            Take picture
          </button>
          <button
            type="button"
            onClick={() => pick(photoInput.current)}
            className={`${br.ghost} h-[54px] w-full rounded-2xl text-[18px]`}
          >
            Choose a photo
          </button>
          <p className="m-0 text-[15px] text-ink2">
            Your picture stays private. It&apos;s only used to explain it to
            you.
          </p>
        </div>
      )}

      {stage.kind === "reading" && (
        <div className="flex flex-col items-center gap-4">
          <div
            aria-hidden="true"
            className="box-border flex h-[230px] w-full flex-col gap-3 rounded-3xl bg-sunken p-7"
          >
            <span className="h-3.5 w-3/5 rounded-full bg-line" />
            <span className="h-2.5 w-[90%] rounded-full bg-line" />
            <span className="h-2.5 w-4/5 rounded-full bg-line" />
            <span className="h-2.5 w-[85%] rounded-full bg-line" />
          </div>
          <p
            role="status"
            className="m-0 font-display text-[22px] font-semibold"
          >
            Reading it for you…
          </p>
        </div>
      )}

      {stage.kind === "done" && challengesDone.length > 0 && (
        <div className="px-4 pt-3">
          <ChallengeDone challenges={challengesDone} />
        </div>
      )}
      {stage.kind === "done" && (
        <Result
          result={stage.result}
          headingRef={headingRef}
          onWalk={() => setStage({ kind: "walkthrough", result: stage.result })}
          onAgain={() => {
            stop();
            setStage({ kind: "idle" });
          }}
        />
      )}
    </div>
  );
}

function Result({
  result: r,
  headingRef,
  onWalk,
  onAgain,
}: {
  result: CameraHelpResponse;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onWalk: () => void;
  onAgain: () => void;
}) {
  const [first, ...moreDates] = r.deadlines;
  return (
    <>
      <div className={`${br.card} flex flex-col gap-3.5 rounded-[22px] p-5`}>
        {first && (
          <span className="self-start rounded-full bg-danger-soft px-3 py-1 text-[16px] font-bold text-danger-text">
            Important · due {shortDate(first.date)}
          </span>
        )}
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="m-0 font-display text-[26px] font-bold leading-[1.15]"
        >
          {r.what_it_is}
        </h2>
        <p className="m-0 text-[19px]">{r.summary}</p>
        {!r.confident && (
          <p className="m-0 rounded-2xl bg-sunken px-4 py-3 text-[17px]">
            I couldn&apos;t read all of it. Check the paper, or try another
            picture.
          </p>
        )}
        {r.actions.length > 0 && (
          <>
            <h3 className="m-0 mt-1 font-display text-[19px] font-semibold">
              What to do
            </h3>
            <ol className="m-0 flex flex-col gap-2 pl-6">
              {r.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          </>
        )}
        {moreDates.length > 0 && (
          <>
            <h3 className="m-0 mt-1 font-display text-[19px] font-semibold">
              Other dates
            </h3>
            <ul className="m-0 flex flex-col gap-2 pl-6">
              {moreDates.map((d) => (
                <li key={`${d.title}-${d.date}`}>
                  {d.title}: {shortDate(d.date)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {r.actions.length > 0 && (
        <button
          type="button"
          onClick={onWalk}
          className={`${br.cta} h-[60px] w-full rounded-2xl text-[21px]`}
        >
          Walk me through it
        </button>
      )}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => void play(readAloudText(r))}
          className={`${br.ghost} flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[14px] text-[17px]`}
        >
          <Icon name="speaker" size={22} />
          Read it to me
        </button>
        <button
          type="button"
          onClick={onAgain}
          className={`${br.ghost} h-[54px] flex-1 rounded-[14px] text-[17px]`}
        >
          Scan another
        </button>
      </div>
    </>
  );
}
