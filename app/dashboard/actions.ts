"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateScore, type QuarterInput } from "@/lib/score";
import { tierFor } from "@/lib/tier";
import { uniqueUsername } from "@/lib/slug";
import { sendVerificationRequest } from "@/lib/email";
import { fmtMoney, fmtPct } from "@/lib/format";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SalesRole } from "@prisma/client";
import { randomBytes } from "crypto";

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

// =========================================================================
// VERIFICATION REQUEST
// =========================================================================

export interface VerificationFormInput {
  verifierEmail: string;
  verifierName?: string;
  relationship?: string;       // "manager" | "peer" | "ops" | "other"
  periods: string[];           // ["Q3 24", "Q4 24", ...] — the quarters to verify
}

export type RequestVerificationResult =
  | { ok: true; verifierEmail: string }
  | { ok: false; error: string };

/**
 * Rep clicks "Request verification" on dashboard → this creates a
 * VerificationRequest record and emails the verifier a link to /verify/[token].
 */
export async function requestVerification(
  input: VerificationFormInput,
): Promise<RequestVerificationResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userId = session.user.id;

  // validate inputs
  const verifierEmail = (input.verifierEmail || "").trim().toLowerCase();
  if (!verifierEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(verifierEmail)) {
    return { ok: false, error: "Please provide a valid verifier email." };
  }
  if (!input.periods || input.periods.length === 0) {
    return { ok: false, error: "Pick at least one quarter to verify." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { card: { include: { quarters: true } } },
  });
  if (!user?.card) return { ok: false, error: "Build your card before requesting verification." };
  const card = user.card;

  // restrict to quarters that actually exist on the card
  const validPeriods = new Set(card.quarters.map(q => q.period));
  const periods = input.periods.filter(p => validPeriods.has(p));
  if (periods.length === 0) {
    return { ok: false, error: "None of those quarters exist on your card." };
  }

  // disallow asking the rep to verify themselves
  if (verifierEmail === user.email.toLowerCase()) {
    return { ok: false, error: "You can't verify your own card." };
  }

  // generate a URL-safe random token (24 chars, ~144 bits of entropy)
  const token = randomBytes(18).toString("base64url");

  // expires 30 days from now
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.verificationRequest.create({
    data: {
      cardId: card.id,
      token,
      verifierEmail,
      verifierName: input.verifierName?.trim() || null,
      relationship: input.relationship?.trim() || null,
      quarterPeriods: periods,
      status: "PENDING",
      expiresAt,
    },
  });

  // assemble the email payload — include current values so verifier can sanity-check
  const periodsForEmail = card.quarters
    .filter(q => periods.includes(q.period))
    .sort((a, b) =>
      a.fiscalYear !== b.fiscalYear ? a.fiscalYear - b.fiscalYear : a.fiscalQuarter - b.fiscalQuarter,
    )
    .map(q => ({
      period: q.period,
      closedWon: q.closedWonDollars ? fmtMoney(Number(q.closedWonDollars)) : null,
      quota:     q.quotaAttainmentPct != null ? fmtPct(q.quotaAttainmentPct) : null,
      winRate:   q.winRatePct != null ? fmtPct(q.winRatePct) : null,
      pipeline:  q.pipelineDollars ? fmtMoney(Number(q.pipelineDollars)) : null,
    }));

  try {
    await sendVerificationRequest({
      verifierEmail,
      verifierName: input.verifierName?.trim() || null,
      repName: user.name || user.email,
      repEmail: user.email,
      relationship: input.relationship?.trim() || null,
      quarters: periodsForEmail,
      token,
    });
  } catch (err) {
    console.error("[requestVerification] email send failed:", err);
    // we already created the DB row; let the user know we couldn't email but the request exists
    return {
      ok: false,
      error: "Saved the request, but the email didn't send. We'll surface a retry button shortly.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true, verifierEmail };
}

