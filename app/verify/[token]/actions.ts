"use server";

import { db } from "@/lib/db";
import { calculateScore, type QuarterInput } from "@/lib/score";
import { tierFor } from "@/lib/tier";
import { sendVerificationResult } from "@/lib/email";
import { revalidatePath } from "next/cache";

export type VerifyActionResult =
  | { ok: true; approved: boolean }
  | { ok: false; error: string };

/** Verifier confirms — all the periods in the request get verified=true. */
export async function approveVerification(token: string): Promise<VerifyActionResult> {
  const request = await db.verificationRequest.findUnique({
    where: { token },
    include: { card: { include: { user: true, quarters: true } } },
  });
  if (!request) return { ok: false, error: "This link isn't valid." };
  if (request.status !== "PENDING") {
    return { ok: false, error: "This request has already been responded to." };
  }
  if (request.expiresAt < new Date()) {
    await db.verificationRequest.update({
      where: { id: request.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, error: "This verification link expired." };
  }

  const periods = request.quarterPeriods;
  const verifiedAt = new Date();

  // Mark each quarter verified
  await db.quarter.updateMany({
    where: {
      cardId: request.cardId,
      period: { in: periods },
    },
    data: {
      verified: true,
      verifiedByEmail: request.verifierEmail,
      verifiedByName: request.verifierName,
      verifiedAt,
    },
  });

  // Record the approval
  await db.verificationRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      approvedKpis: periods,
      respondedAt: verifiedAt,
    },
  });

  // Recalculate the card's score with newly-verified quarters
  await recalculateScore(request.cardId);

  // Notify the rep
  const rep = request.card.user;
  if (rep.email) {
    try {
      await sendVerificationResult({
        repEmail: rep.email,
        repName: rep.name || rep.email,
        verifierName: request.verifierName,
        verifierEmail: request.verifierEmail,
        approved: true,
        approvedPeriods: periods,
        cardUrl: `${baseUrl()}/dashboard`,
      });
    } catch (err) {
      console.error("[approveVerification] notify rep failed:", err);
      // non-fatal
    }
  }

  revalidatePath(`/verify/${token}`);
  revalidatePath(`/dashboard`);
  return { ok: true, approved: true };
}

/** Verifier flags the request as incorrect (optional reason). */
export async function rejectVerification(token: string, reason?: string): Promise<VerifyActionResult> {
  const request = await db.verificationRequest.findUnique({
    where: { token },
    include: { card: { include: { user: true } } },
  });
  if (!request) return { ok: false, error: "This link isn't valid." };
  if (request.status !== "PENDING") {
    return { ok: false, error: "This request has already been responded to." };
  }
  if (request.expiresAt < new Date()) {
    await db.verificationRequest.update({
      where: { id: request.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, error: "This verification link expired." };
  }

  await db.verificationRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      rejectionReason: reason?.trim() || null,
      respondedAt: new Date(),
    },
  });

  const rep = request.card.user;
  if (rep.email) {
    try {
      await sendVerificationResult({
        repEmail: rep.email,
        repName: rep.name || rep.email,
        verifierName: request.verifierName,
        verifierEmail: request.verifierEmail,
        approved: false,
        rejectionReason: reason?.trim() || null,
        approvedPeriods: [],
        cardUrl: `${baseUrl()}/dashboard`,
      });
    } catch (err) {
      console.error("[rejectVerification] notify rep failed:", err);
    }
  }

  revalidatePath(`/verify/${token}`);
  revalidatePath(`/dashboard`);
  return { ok: true, approved: false };
}

async function recalculateScore(cardId: string): Promise<void> {
  const card = await db.card.findUnique({
    where: { id: cardId },
    include: { user: true, quarters: true },
  });
  if (!card) return;

  const role = card.user.role ?? "AE";
  const inputs: QuarterInput[] = card.quarters.map(q => ({
    period: q.period,
    closedWonDollars:     q.closedWonDollars     ? Number(q.closedWonDollars)     : null,
    quotaAttainmentPct:   q.quotaAttainmentPct,
    winRatePct:           q.winRatePct,
    pipelineDollars:      q.pipelineDollars      ? Number(q.pipelineDollars)      : null,
    avgDealSizeDollars:   q.avgDealSizeDollars   ? Number(q.avgDealSizeDollars)   : null,
    agentPipelineDollars: q.agentPipelineDollars ? Number(q.agentPipelineDollars) : null,
    agentsManaged:        q.agentsManaged,
    verified:             q.verified,
  }));
  const result = calculateScore(role, inputs, card.percentile ?? 50);
  const tier = tierFor(result.score);
  await db.card.update({
    where: { id: cardId },
    data: {
      score: result.score,
      tier: tier.label,
    },
  });
}

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL || "https://app.salescard.ai").replace(/\/$/, "");
}
