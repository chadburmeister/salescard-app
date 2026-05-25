"use client";

import { useState, type ReactNode } from "react";

/**
 * Click-to-flip card hero. Shows the front face by default; clicking the card
 * (or the Flip control) swaps to the back with a brief flip animation.
 * Honors prefers-reduced-motion by swapping instantly.
 */
export function CardFlip({ front, back }: { front: ReactNode; back: ReactNode }) {
  const [face, setFace] = useState<"front" | "back">("front");
  const [spin, setSpin] = useState(false);

  function flip() {
    if (spin) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFace((f) => (f === "front" ? "back" : "front"));
      return;
    }
    setSpin(true);
    window.setTimeout(() => setFace((f) => (f === "front" ? "back" : "front")), 150);
    window.setTimeout(() => setSpin(false), 300);
  }

  return (
    <div style={{ perspective: "1600px" }}>
      <div
        onClick={flip}
        className="cursor-pointer select-none"
        style={{
          transition: "transform 0.15s ease",
          transform: spin ? "rotateY(90deg)" : "rotateY(0deg)",
        }}
      >
        {face === "front" ? front : back}
      </div>
      <div className="mt-4 flex items-center justify-center">
        <button
          type="button"
          onClick={flip}
          aria-label={`Flip card to ${face === "front" ? "back" : "front"}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#0A66C2] transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          {face === "front" ? "Flip to back" : "Flip to front"}
        </button>
      </div>
    </div>
  );
}
