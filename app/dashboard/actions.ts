"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

import { calculateScore, type QuarterInput } from "@/lib/score";
import { tierFor } from "@/lib/tier";
import { uniqueUsername } from "@/lib/slug";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SalesRole } from "@prisma/client";

export interface KpiSubmission {
  role: SalesRole;
  agentsManaged: number | null;          // current count, applied to latest quarter
  quarters: Array<{
    period: string;
    fiscalYear: number;
    fiscalQuarter: number;
    closedWonDollars: number | null;
    quotaAttainmentPct: number | null;
    winRatePct: number | null;
    pipelineDollars: number | null;
    avgDealSizeDollars: number | null;
    agentPipelineDollars: number | null;
  }>;
}

/**
 * Save the rep's 8 quarters of KPIs, calculate the score, and persist.
 * Creates Card record on first submission (with an auto-generated username slug).
 */
export async function saveKpis(submission: KpiSubmission) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not signed in.");
  }
  const userId = session.user.id;

  // load the user (we need their display name for the card slug)
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { card: { include: { quarters: true } } },
  });
  if (!user) throw new Error("User not found.");

  // update the user's role
  await db.user.update({
    where: { id: userId },
    data: { role: submission.role },
  });

  // ensure a Card exists with a unique slug
  let card = user.card;
  if (!card) {
    const username = await uniqueUsername(user.name || user.email);
    card = await db.card.create({
      data: { userId, username, visibility: "UNLISTED" },
      include: { quarters: true },
    });
  }

  // upsert each of the 8 quarters
  for (const q of submission.quarters) {
    // Apply the rep's current agents count to the most recent quarter as a snapshot.
    // Later we'll let users edit per-quarter agent counts directly.
    const isLatest = q === submission.quarters[submission.quarters.length - 1];
    const agentsForThisQuarter = isLatest ? submission.agentsManaged : null;

    await db.quarter.upsert({
      where: { cardId_period: { cardId: card.id, period: q.period } },
      create: {
        cardId: card.id,
        period: q.period,
        fiscalYear: q.fiscalYear,
        fiscalQuarter: q.fiscalQuarter,
        closedWonDollars:    q.closedWonDollars     != null ? BigInt(Math.round(q.closedWonDollars))    : null,
        quotaAttainmentPct:  q.quotaAttainmentPct,
        winRatePct:          q.winRatePct,
        pipelineDollars:     q.pipelineDollars      != null ? BigInt(Math.round(q.pipelineDollars))     : null,
        avgDealSizeDollars:  q.avgDealSizeDollars   != null ? BigInt(Math.round(q.avgDealSizeDollars))  : null,
        agentPipelineDollars:q.agentPipelineDollars != null ? BigInt(Math.round(q.agentPipelineDollars)): null,
        agentsManaged:       agentsForThisQuarter,
        verified: false,
      },
      update: {
        closedWonDollars:    q.closedWonDollars     != null ? BigInt(Math.round(q.closedWonDollars))    : null,
        quotaAttainmentPct:  q.quotaAttainmentPct,
        winRatePct:          q.winRatePct,
        pipelineDollars:     q.pipelineDollars      != null ? BigInt(Math.round(q.pipelineDollars))     : null,
        avgDealSizeDollars:  q.avgDealSizeDollars   != null ? BigInt(Math.round(q.avgDealSizeDollars))  : null,
        agentPipelineDollars:q.agentPipelineDollars != null ? BigInt(Math.round(q.agentPipelineDollars)): null,
        agentsManaged:       agentsForThisQuarter,
      },
    });
  }

  // re-load quarters for score calc
  const quarters = await db.quarter.findMany({
    where: { cardId: card.id },
    orderBy: [{ fiscalYear: "asc" }, { fiscalQuarter: "asc" }],
  });

  const scoreInputs: QuarterInput[] = quarters.map(q => ({
    period: q.period,
    closedWonDollars:     q.closedWonDollars     ? Number(q.closedWonDollars)     : null,
    quotaAttainmentPct:   q.quotaAttainmentPct,
    winRatePct:           q.winRatePct,
    pipelineDollars:      q.pipelineDollars      ? Number(q.pipelineDollars)      : null,
    avgDealSizeDollars:   q.avgDealSizeDollars   ? Number(q.avgDealSizeDollars)   : null,
    agentPipelineDollars: q.agentPipelineDollars ? Number(q.agentPipelineDollars) : null,
    agentsManaged:        q.agentsManaged,
    verified: q.verified,
  }));

  const result = calculateScore(submission.role, scoreInputs, 50 /* placeholder percentile until we seed peer data */);
  const tier = tierFor(result.score);

  await db.card.update({
    where: { id: card.id },
    data: {
      score: result.score,
      tier: tier.label,
      percentile: result.peerPercentile,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}


