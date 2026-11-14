"use client";

import { useState, type CSSProperties } from "react";

const buttonStyle: CSSProperties = {
  minHeight: 48,
  padding: "12px 20px",
  font: "inherit",
  borderRadius: 8,
  cursor: "pointer",
};

/** Local delivery only. A nudge is not a saved CheckIn or a token award. */
export function CheckInDemo() {
  const [sent, setSent] = useState(0);
  const [visible, setVisible] = useState(false);

  return (
    <section
      aria-labelledby="check-in-heading"
      style={{
        fontSize: 18,
        lineHeight: 1.6,
        color: "#172033",
        background: "#fff",
        padding: 24,
        maxWidth: 640,
        margin: "24px auto",
        borderRadius: 12,
      }}
    >
      <h1 id="check-in-heading">Check-in demo</h1>
      <p>Try a reminder for your morning routine.</p>
      <p>This demo stays on this page. Nothing is sent to a trusted contact. Refreshing clears it.</p>
      <button
        type="button"
        onClick={() => {
          setSent((count) => count + 1);
          setVisible(true);
        }}
        style={{ ...buttonStyle, background: "#163e85", color: "white" }}
      >
        Send test check-in
      </button>
      <div role="status" aria-live="polite" aria-atomic="true">
        {visible && <p>Check-in {sent}: Time to check your morning routine. Put on your shoes.</p>}
      </div>
      {visible && (
        <button
          type="button"
          onClick={() => setVisible(false)}
          style={{ ...buttonStyle, background: "white", color: "#172033", border: "2px solid #172033" }}
        >
          Dismiss check-in
        </button>
      )}
    </section>
  );
}
