// SalesCard Score
//
// New formula (sum = 100):
//   80  Avg quota attainment across all quarters
//   10  Quota attainment of the most recent quarter
//   10  Pipe opps per quarter (banded)
//
// Quota bands (0-10 scale used for both sub-grade and score component):
//   >=120 = 10, 110-119 = 9, 100-109 = 8, 90-99 = 7,
//   80-89 = 6,  50-79   = 5, 1-49    = 2, 0 = 0
//
// Opps bands:
//   >24 = 10, 18-24 = 9, 11-17 = 7, <=10 = 5, 0/none = 0
//
// Verified quarters carry full weight. Unverified quarters carry half weight.
// The `quarters` array is expected oldest → newest (the dashboard already sorts).

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

const W_AVG_QUOTA    = 80;
const W_LATEST_QUOTA = 10;
const W_OPPS         = 10;

function quotaBand(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  if (pct >= 120) return 10;
  if (pct >= 110) return 9;
  if (pct >= 100) return 8;
  if (pct >= 90)  return 7;
  if (pct >= 80)  return 6;
  if (pct >= 50)  return 5;
  if (pct >= 1)   return 2;
  return 0;
}

function oppsBand(avgOpps: number): number {
  if (!Number.isFinite(avgOpps) || avgOpps <= 0) return 0;
  if (avgOpps > 24)  return 10;
  if (avgOpps >= 18) return 9;
  if (avgOpps >= 11) return 7;
  return 5;
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

export function calculateScore(
  _role: SalesRole | string | null | undefined,
  quarters: QuarterInput[],
  _percentile: number
): ScoreResult {
  void _role;
  void _percentile;
  if (!quarters || quarters.length === 0) {
    return {
      scoreOutOf100: 0,
      subGradesTenScale: { QUOTA: 0, PIPELINE: 0, WIN_RATE: 0, TENURE: 0 },
    };
  }

  // ──── 1. Avg quota (80) ────
  const avgQuotaPct = wAvg(quarters, (q) => q.quotaAttainmentPct);
  const avgQuotaTen = quotaBand(avgQuotaPct);
  const avgQuotaScore = avgQuotaTen * 10;

  // ──── 2. Latest-quarter quota (10) ────
  const latestQ = quarters[quarters.length - 1];
  const latestQuotaPct = latestQ?.quotaAttainmentPct ?? 0;
  const latestQuotaTen = quotaBand(latestQuotaPct);
  const latestQuotaScore = latestQuotaTen * 10;

  // ──── 3. Opps banded (10) ────
  const avgOpps = wAvg(quarters, (q) => (q.pipeOpps != null ? q.pipeOpps : null));
  const oppsTen = oppsBand(avgOpps);
  const oppsScore = oppsTen * 10;

  const weighted =
    avgQuotaScore    * W_AVG_QUOTA +
    latestQuotaScore * W_LATEST_QUOTA +
    oppsScore        * W_OPPS;

  const scoreOutOf100 = Math.round(clamp(weighted / 100, 0, 100));

  const tenure = Math.min(10, quarters.length * 1.25);
  // Note: PIPELINE & WIN_RATE sub-grades on the card front are now decorative;
  // they no longer factor into the overall score. PIPELINE shows the opps band
  // (since opps is the only non-quota signal in the new formula), and WIN_RATE
  // shows the latest-quarter quota band (proxy for recency).
  return {
    scoreOutOf100,
    subGradesTenScale: {
      QUOTA:    avgQuotaTen,
      PIPELINE: oppsTen,
      WIN_RATE: latestQuotaTen,
      TENURE:   Math.round(tenure),
    },
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
