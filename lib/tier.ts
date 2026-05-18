// SalesCard tier system
//
// Reps get a SalesCard Score between 0 and 100. Each score falls into one of
// five named tiers, each with a description used in share copy and on the card.
//
// Backwards-compatible: `tierFor(score)` returns the same object as
// `getSalescardTier(score)`, and exposes `.label`, `.color`, `.textColorOn`
// for existing UI code that hasn't migrated to `.name`, `.description` yet.

export interface SalescardTier {
  id: string;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
  /** Hex color (no leading "#"). Used as a CSS color via `#${tier.color}`. */
  color: string;
  /** Whether to put DARK or LIGHT text on top of `color`. */
  textColorOn: "DARK" | "LIGHT";
  /** Legacy alias of `name` for components that still read tier.label. */
  label: string;
}

export const SALESCARD_TIERS: SalescardTier[] = [
  {
    id: "prospector",
    name: "The Prospector",
    description: "Just getting the reps in, building the foundation, and dialing.",
    minScore: 0,
    maxScore: 49,
    color: "9CA3AF",
    textColorOn: "LIGHT",
    label: "The Prospector",
  },
  {
    id: "pipeline_builder",
    name: "Pipeline Builder",
    description: "Generating real momentum and keeping the top of the funnel full.",
    minScore: 50,
    maxScore: 69,
    color: "F59E0B",
    textColorOn: "DARK",
    label: "Pipeline Builder",
  },
  {
    id: "objection_slayer",
    name: "Objection Slayer",
    description: "Navigating \"no\" with ease, flipping the script, and booking meetings.",
    minScore: 70,
    maxScore: 79,
    color: "3478C0",
    textColorOn: "LIGHT",
    label: "Objection Slayer",
  },
  {
    id: "rainmaker",
    name: "The Rainmaker",
    description: "Bringing in massive revenue drops and making it look easy.",
    minScore: 80,
    maxScore: 94,
    color: "10B981",
    textColorOn: "LIGHT",
    label: "The Rainmaker",
  },
  {
    id: "whale_hunter",
    name: "Whale Hunter",
    description: "Closing the absolute biggest deals. The top 1% of the 1%.",
    minScore: 95,
    maxScore: 100,
    color: "F5B739",
    textColorOn: "DARK",
    label: "Whale Hunter",
  },
];

/**
 * Returns the SalesCard tier for a given score. Scores below 0 are clamped to
 * 0 (Prospector); scores above 100 are clamped to 100 (Whale Hunter). Non-
 * finite or NaN values fall back to Prospector.
 */
export function getSalescardTier(score: number): SalescardTier {
  const safe = Number.isFinite(score) ? score : 0;
  const clamped = Math.max(0, Math.min(100, Math.round(safe)));
  return (
    SALESCARD_TIERS.find((t) => clamped >= t.minScore && clamped <= t.maxScore) ??
    SALESCARD_TIERS[0]
  );
}

/**
 * Legacy alias kept for existing imports: `import { tierFor } from "@/lib/tier"`.
 */
export function tierFor(score: number): SalescardTier {
  return getSalescardTier(score);
}
