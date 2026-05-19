// SalesCard Score
//
// Inputs: 8 quarters of self-reported KPIs (some verified, some not).
// Output: a 0-100 score, plus four sub-grades on a 0-10 scale for the card front.
//
// Weights (sum = 100). Quota attainment is the dominant signal.
//   Quota %          50
//   Closed-won $     20
//   Pipeline $       10
//   Pipe Opps         5
//   Activity ratio    5
//   Peer percentile  10
//
// Verified quarters carry full weight. Unverified quarters carry half weight.
//
// The QUOTA sub-grade and quota-component-of-score use a banded scale:
//   >=120% → 10 · 110-119% → 9 · 100-109% → 8 · 90-99% → 7
//   80-89%  →  6 · 50-79%   → 5 · 1-49%     → 2 · 0/none → 0

import type { SalesRole } from "@prisma/client";

export interface QuarterInput {
  period: string;
  closedWonDollars: number | null;
  quotaAttainmentPct: number | null;
  winRatePct: number | null;
  pipelineDollars: number | null;
  avgDealSizeDollars: number | null;
  pipeOpps?: number | null;
  conversationsRange?: string | null;
  meetingsRange?: string | null;
  targetSegment?: string | null;
  agentsManaged?: number | null;
  agentPipelineDollars?: number | null;
  verified: boolean;
}

export interface SubGradesTen {
  QUOTA: number;
  PIPELINE: number;
  WIN_RATE: number;
  TENURE: number;
}

export interface ScoreResult {
  scoreOutOf100: number;
  subGradesTenScale: SubGradesTen;
}

const W_QUOTA      = 50;
const W_CLOSED_WON = 20;
const W_PIPELINE   = 10;
const W_PIPE_OPPS  = 5;
const W_ACTIVITY   = 5;
const W_PERCENTILE = 10;

function anchors(role: SalesRole | null | undefined) {
  if (role === "SDR" || role === "BDR") {
    return { closedWon: 200_000, pipeline: 500_000, pipeOpps: 60 };
  }
  return { closedWon: 1_000_000, pipeline: 3_000_000, pipeOpps: 30 };
}

function rangeMidpoint(range: string | null | undefined): number | null {
  if (!range) return null;
  const r = range.trim();
  if (r === "<50") return 25;
  if (r === "50-100") return 75;
  if (r === "100-250") return 175;
  if (r === "250+") return 350;
  const n = parseFloat(r);
  return Number.isFinite(n) ? n : null;
}

function wAvg(quarters: QuarterInput[], pick: (q: QuarterInput) => number | null): number {
  let sum = 0;
  let w = 0;
  for (const q of quarters) {
    const v = pick(q);
    if (v == null || !Number.isFinite(v)) continue;
    const weight = q.verified ? 1 : 0.5;
    sum += v * weight;
    w += weight;
  }
  return w > 0 ? sum / w : 0;
}

/**
 * Banded quota score on a 0-10 scale.
 *   >=120% → 10
 *   110-119.99% → 9
 *   100-109.99% → 8
 *   90-99.99% → 7
 *   80-89.99% → 6
 *   50-79.99% → 5
 *   1-49.99% → 2
 *   0 / none → 0
 */
function quotaBand(avgQuotaPct: number): number {
  if (!Number.isFinite(avgQuotaPct) || avgQuotaPct <= 0) return 0;
  if (avgQuotaPct >= 120) return 10;
  if (avgQuotaPct >= 110) return 9;
  if (avgQuotaPct >= 100) return 8;
  if (avgQuotaPct >= 90)  return 7;
  if (avgQuotaPct >= 80)  return 6;
  if (avgQuotaPct >= 50)  return 5;
  if (avgQuotaPct >= 1)   return 2;
  return 0;
}

export function calculateScore(
  role: SalesRole | string | null | undefined,
  quarters: QuarterInput[],
  percentile: number
): ScoreResult {
  if (!quarters || quarters.length === 0) {
    return {
      scoreOutOf100: 0,
      subGradesTenScale: { QUOTA: 0, PIPELINE: 0, WIN_RATE: 0, TENURE: 0 },
    };
  }

  const r = (role as SalesRole) ?? "AE";
  const a = anchors(r);

  // ──── Quota (banded) ────
  const avgQuotaPct = wAvg(quarters, q => q.quotaAttainmentPct);
  const quotaTen = quotaBand(avgQuotaPct);
  const quotaScore = quotaTen * 10; // 0-100 contribution

  // ──── Closed-won $ ────
  const wonScore = clamp(
    wAvg(quarters, q => q.closedWonDollars != null ? (q.closedWonDollars / a.closedWon) * 100 : null),
    0, 100
  );

  // ──── Pipeline $ ────
  const pipeScore = clamp(
    wAvg(quarters, q => q.pipelineDollars != null ? (q.pipelineDollars / a.pipeline) * 100 : null),
    0, 100
  );

  // ──── Pipe opps count ────
  const oppsScore = clamp(
    wAvg(quarters, q => q.pipeOpps != null ? (q.pipeOpps / a.pipeOpps) * 100 : null),
    0, 100
  );

  // ──── Activity ratio: pipe opps ÷ meetings; 30% → 100 points ────
  const activityScore = clamp(
    wAvg(quarters, q => {
      const meetings = rangeMidpoint(q.meetingsRange);
      const opps = q.pipeOpps;
      if (!meetings || meetings <= 0 || opps == null) return null;
      const ratio = (opps / meetings) * 100;
      return Math.min(100, (ratio / 30) * 100);
    }),
    0, 100
  );

  // ──── Peer percentile placeholder ────
  const percentileScore = clamp(Number.isFinite(percentile) ? percentile : 50, 0, 100);

  // Weighted total
  const weighted =
    quotaScore      * W_QUOTA +
    wonScore        * W_CLOSED_WON +
    pipeScore       * W_PIPELINE +
    oppsScore       * W_PIPE_OPPS +
    activityScore   * W_ACTIVITY +
    percentileScore * W_PERCENTILE;

  const scoreOutOf100 = Math.round(clamp(weighted / 100, 0, 100));

  const tenure = Math.min(10, quarters.length * 1.25);
  return {
    scoreOutOf100,
    subGradesTenScale: {
      QUOTA:    quotaTen,
      PIPELINE: Math.round(pipeScore / 10),
      WIN_RATE: Math.round(activityScore / 10),
      TENURE:   Math.round(tenure),
    },
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
