"use client";

// The lost mode screen. Runs in the browser because it uses geolocation and button clicks.
// It does not send anything yet: it shows the message a trusted contact would get.

import { useState } from "react";
import { ui } from "@/features/routine-builder/ui";
import { getCurrentLocation, LOCATION_FAILURE_MESSAGES, type LocationResult } from "./location";
import { buildLostMessage, buildMapsLink, LOST_STEPS } from "./lostMode";

type Status = { kind: "idle" } | { kind: "locating" } | { kind: "done"; result: LocationResult };

interface Props {
  /** Shown in the message preview. */
  userName?: string;
  /** Tests pass a fake. The real screen uses the browser's location. */
  locate?: () => Promise<LocationResult>;
}

export function LostModeScreen({ userName = "", locate = getCurrentLocation }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleLost() {
    setStatus({ kind: "locating" });
    const result = await locate();
    setStatus({ kind: "done", result });
  }

  const started = status.kind !== "idle";
  const result = status.kind === "done" ? status.result : null;

  return (
    <section aria-labelledby="lost-heading" className="space-y-6">
      <h2 id="lost-heading" className={ui.h2}>
        I&apos;m lost
      </h2>

      {/* 911 is always on screen, before and after the button is pressed. */}
      <a href="tel:911" className={`${ui.danger} w-full`}>
        Call 911
      </a>

      {!started && (
        <button type="button" className={ui.primary} onClick={handleLost}>
          I&apos;m lost
        </button>
      )}

      {/* The calm steps show right away, even while we wait for the location. */}
      {started && (
        <ol className="list-decimal space-y-2 pl-6 text-xl font-semibold">
          {LOST_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}

      {/* aria-live makes screen readers announce each update. */}
      <div aria-live="polite" className="space-y-4">
        {status.kind === "locating" && <p>Finding where you are…</p>}

        {result?.ok === true && (
          <div className={`${ui.card} space-y-3`}>
            <p className="font-semibold">Found your location.</p>
            <a href={buildMapsLink(result.coords)} target="_blank" rel="noreferrer" className={ui.secondary}>
              Open in Maps
            </a>
            <p className="text-base">
              <span className="font-semibold">Your contact would get: </span>
              {buildLostMessage({ userName, coords: result.coords })}
            </p>
          </div>
        )}

        {result?.ok === false && (
          <div className={`${ui.card} space-y-3`}>
            <p>{LOCATION_FAILURE_MESSAGES[result.reason]}</p>
            <button type="button" className={ui.secondary} onClick={handleLost}>
              Try again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
