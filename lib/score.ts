/**
 * SalesCard Score (1-100) calculation.
 *
 *   Score = 0.70 × Outcomes Index  +  0.30 × Peer Percentile
 *
 * For now, peer percentile defaults to 50 (median) if we don't have enough peers
 * in the same role+segment. As the database grows, this becomes more meaningful.
 *
 * Sub-grade weights (separate, used to display 4 categories on the card front):
 *
 * For AE:
 *   PIPELINE — Closed-won $ + Pipeline $    (40% of outcomes index)
 *   WIN RATE — Win rate + Meetings → Opps   (15%)
 *   QUOTA    — Quota attainment %            (35%)
 *   TENURE   — Quarter-over-quarter consistency (10%)
 *
 * For BDR/SDR:
 *   PIPELINE — Pipeline $ + Opps created    (45%)
 *   WIN RATE — Meetings → Opps + Activity   (25%)
 *   QUOTA    — Pipeline $ / pipeline goal   (20%)
 *   TENURE   — QoQ consistency               (10%)
 *
 * Verified KPIs weighted 1.0×.  Unverified weighted 0.5× (until verified).
 */

import type { SalesRole } from "@prisma/client";

export interface QuarterInput {
  period: string;
  // BDR/SDR
  dials?: number | null;
  connects?: number | null;
  conversations?: number | null;
  // shared
  meetingsBooked?: number | null;
  opportunitiesCreated?: number | null;
  pipelineDollars?: number | null;     // $
  // AE
  closedWonDollars?: number | null;
  quotaAttainmentPct?: number | null;  // 100 = met quota
  winRatePct?: number | null;          // 31 = 31%
  avgDealSizeDollars?: number | null;
  // agent-managed
  agentsManaged?: number | null;
  agentPipelineDollars?: number | null;
  // verification
  verified: boolean;
}

export interface SubGrades {
  PIPELINE: number;
  WIN_RATE: number;
  QUOTA: number;
  TENURE: number;
}

export interface ScoreResult {
  score: number;        // 0-100 rounded
  outcomesIndex: number; // 0-100
  peerPercentile: number;// 0-100
  subGrades: SubGrades;
  // sub-grade values rounded to 1 decimal, like Beckett (1-10 scale)
  subGradesTenScale: SubGrades;
}

// === Reference benchmarks (placeholder — replace with seed data later) ===
//   These are the "100" point for each KPI: hit it = full marks.
//   We'll calibrate from real data once we have it.
const AE_BENCHMARKS = {
  closedWonPerQuarter: 1_000_000,   // $1M
  pipelinePerQuarter: 2_500_000,     // $2.5M
  quotaAttainmentPct: 150,           // 150% = full marks
  winRatePct: 30,                    // 30% = full marks
  agentPipelinePerQuarter: 500_000,  // $500K
} as const;

const BDR_BENCHMARKS = {
  pipelinePerQuarter: 2_000_000,      // $2M
  meetingsBooked: 40,                 // 40 meetings / Q
  opportunitiesCreated: 25,           // 25 opps / Q
  dialsToConvoRatio: 0.10,            // 10% connect rate
  agentPipelinePerQuarter: 500_000,
} as const;

// pull a kpi value × verification weight (verified=1.0×, unverified=0.5×)
function w(value: number | null | undefined, verified: boolean): number {
  if (value == null) return 0;
  return value * (verified ? 1.0 : 0.5);
}

// score 0-100 against a benchmark, capped
function pct(value: number, benchmark: number): number {
  if (benchmark <= 0) return 0;
  return Math.max(0, Math.min(100, (value / benchmark) * 100));
}

export function calculateScore(
  role: SalesRole,
  quarters: QuarterInput[],
  peerPercentile: number = 50,
): ScoreResult {
  // average per-quarter values, weighted by verification
  const n = quarters.length || 1;
  const avg = <K extends keyof QuarterInput>(key: K): number => {
    let sum = 0;
    let weightSum = 0;
    for (const q of quarters) {
      const v = q[key] as number | null | undefined;
      if (v == null) continue;
      const weight = q.verified ? 1.0 : 0.5;
      sum += v * weight;
      weightSum += weight;
    }
    return weightSum > 0 ? sum / weightSum : 0;
  };

  let sub: SubGrades;
  if (role === "AE") {
    const closedWon = avg("closedWonDollars");
    const pipeline = avg("pipelineDollars");
    const quotaPct = avg("quotaAttainmentPct");
    const winRate = avg("winRatePct");
    const agentPipe = avg("agentPipelineDollars");

    sub = {
      PIPELINE: Math.round(
        (pct(closedWon, AE_BENCHMARKS.closedWonPerQuarter) * 0.6 +
         pct(pipeline,  AE_BENCHMARKS.pipelinePerQuarter)  * 0.4)
      ),
      WIN_RATE: Math.round(pct(winRate, AE_BENCHMARKS.winRatePct)),
      QUOTA:    Math.round(pct(quotaPct, AE_BENCHMARKS.quotaAttainmentPct)),
      TENURE:   Math.round(consistencyScore(quarters, "closedWonDollars")),
    };
  } else {
    // BDR / SDR
    const pipeline = avg("pipelineDollars");
    const meetings = avg("meetingsBooked");
    const opps = avg("opportunitiesCreated");
    const agentPipe = avg("agentPipelineDollars");

    sub = {
      PIPELINE: Math.round(
        (pct(pipeline, BDR_BENCHMARKS.pipelinePerQuarter) * 0.65 +
         pct(opps,     BDR_BENCHMARKS.opportunitiesCreated) * 0.35)
      ),
      WIN_RATE: Math.round(pct(meetings, BDR_BENCHMARKS.meetingsBooked)),
      QUOTA:    Math.round(pct(pipeline, BDR_BENCHMARKS.pipelinePerQuarter)),
      TENURE:   Math.round(consistencyScore(quarters, "pipelineDollars")),
    };
  }

  // outcomes index = weighted avg of 4 sub-grades
  const outcomesIndex =
    sub.PIPELINE * 0.40 +
    sub.WIN_RATE * 0.20 +
    sub.QUOTA    * 0.30 +
    sub.TENURE   * 0.10;

  // final score blends outcomes (70%) and peer percentile (30%)
  const score = Math.round(outcomesIndex * 0.7 + peerPercentile * 0.3);

  // sub-grades on Beckett-style 1-10 scale (for the card front)
  const toTen = (n: number) => Math.round(n / 10 * 10) / 10;
  const subGradesTenScale: SubGrades = {
    PIPELINE: toTen(sub.PIPELINE),
    WIN_RATE: toTen(sub.WIN_RATE),
    QUOTA:    toTen(sub.QUOTA),
    TENURE:   toTen(sub.TENURE),
  };

  return {
    score,
    outcomesIndex: Math.round(outcomesIndex),
    peerPercentile,
    subGrades: sub,
    subGradesTenScale,
  };
}

// QoQ consistency: how steady is the rep's output across the 8 quarters?
//   100 = all quarters within ±10% of mean
//   0   = wild variance
function consistencyScore<K extends keyof QuarterInput>(
  quarters: QuarterInput[],
  key: K,
): number {
  const vals: number[] = [];
  for (const q of quarters) {
    const v = q[key] as number | null | undefined;
    if (v != null && Number.isFinite(v)) vals.push(v);
  }
  if (vals.length < 2) return 50; // not enough data, give them middle
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return 50;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  const stddev = Math.sqrt(variance);
  const cv = stddev / Math.abs(mean); // coefficient of variation
  // cv of 0 → 100, cv of 0.5+ → 0
  return Math.max(0, Math.min(100, 100 - cv * 200));
}
