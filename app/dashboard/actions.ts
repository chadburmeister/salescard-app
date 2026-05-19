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

// ===========================================================================
// SAVE KPIs
// ===========================================================================

export interface KpiSubmission {
  role: SalesRole;
  quarters: Array<{
    period: string;
    fiscalYear: number;
    fiscalQuarter: number;
    targetSegment:      string | null;
    conversationsRange: string | null;
    meetingsRange:      string | null;
    pipeOpps:           number | null;
    pipelineDollars:    number | null;
    closedWonDollars:   number | null;
    quotaAttainmentPct: number | null;
  }>;
}

export async function saveKpis(submission: KpiSubmission) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in." };
  const userId = session.user.id;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { card: { include: { quarters: true } } },
    });
    if (!user) return { ok: false as const, error: "User not found." };

    await db.user.update({ where: { id: userId }, data: { role: submission.role } });

    let card = user.card;
    if (!card) {
      const username = await uniqueUsername(user.name || user.email);
      card = await db.card.create({
        data: { userId, username, visibility: "UNLISTED" },
        include: { quarters: true },
      });
    }

    // Upsert each submitted period
    for (const q of submission.quarters) {
      const pipelineBig  = q.pipelineDollars   != null ? BigInt(Math.round(q.pipelineDollars))   : null;
      const closedWonBig = q.closedWonDollars  != null ? BigInt(Math.round(q.closedWonDollars))  : null;
      await db.quarter.upsert({
        where: { cardId_period: { cardId: card.id, period: q.period } },
        create: {
          cardId: card.id,
          period: q.period,
          fiscalYear: q.fiscalYear,
          fiscalQuarter: q.fiscalQuarter,
          targetSegment: q.targetSegment,
          conversationsRange: q.conversationsRange,
          meetingsRange: q.meetingsRange,
          pipeOpps: q.pipeOpps,
          pipelineDollars: pipelineBig,
          closedWonDollars: closedWonBig,
          quotaAttainmentPct: q.quotaAttainmentPct,
          verified: false,
        },
        update: {
          targetSegment: q.targetSegment,
          conversationsRange: q.conversationsRange,
          meetingsRange: q.meetingsRange,
          pipeOpps: q.pipeOpps,
          pipelineDollars: pipelineBig,
          closedWonDollars: closedWonBig,
          quotaAttainmentPct: q.quotaAttainmentPct,
        },
      });
    }

    // Cleanup: remove any quarters on this card whose period isn't in the
    // submitted list (sweeps old periods like "Q3 24" out of the DB).
    const submittedPeriods = submission.quarters.map(q => q.period);
    if (submittedPeriods.length > 0) {
      await db.quarter.deleteMany({
        where: {
          cardId: card.id,
          period: { notIn: submittedPeriods },
        },
      });
    }

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
      pipeOpps:             q.pipeOpps,
      conversationsRange:   q.conversationsRange,
      meetingsRange:        q.meetingsRange,
      targetSegment:        q.targetSegment,
      agentsManaged:        q.agentsManaged,
      agentPipelineDollars: q.agentPipelineDollars ? Number(q.agentPipelineDollars) : null,
      verified:             q.verified,
    }));

    const result = calculateScore(submission.role, scoreInputs, 50);
    const tier = tierFor(result.scoreOutOf100);

    await db.card.update({
      where: { id: card.id },
      data: { score: result.scoreOutOf100, tier: tier.name, percentile: 50 },
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[saveKpis] error:", err);
    return { ok: false as const, error: "Couldn't save your stats. Try again." };
  }
}

function isRedirectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { digest?: string };
  return typeof e.digest === "string" && e.digest.startsWith("NEXT_REDIRECT");
}

// ===========================================================================
// SET CARD BACKGROUND
// ===========================================================================

export async function setCardBackground(themeIdOrUrl: string | null) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in." };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { card: true },
  });
  if (!user?.card) return { ok: false as const, error: "Build your card first." };

  await db.card.update({
    where: { id: user.card.id },
    data: { cardBackground: themeIdOrUrl },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/u/${user.card.username}`);
  return { ok: true as const };
}

// ===========================================================================
// SET CURRENT COMPANY
// ===========================================================================

export async function setCurrentCompany(company: string | null) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in." };

  const clean = (company || "").trim().slice(0, 200) || null;

  await db.user.update({
    where: { id: session.user.id },
    data: { currentCompany: clean },
  });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { card: true },
  });
  revalidatePath("/dashboard");
  if (user?.card) revalidatePath(`/u/${user.card.username}`);
  return { ok: true as const };
}

// ===========================================================================
// VERIFICATION REQUEST
// ===========================================================================

export interface VerificationFormInput {
  verifierEmail: string;
  verifierName?: string;
  relationship?: string;
  periods: string[];
}

export type RequestVerificationResult =
  | { ok: true; verifierEmail: string }
  | { ok: false; error: string };

export async function requestVerification(input: VerificationFormInput): Promise<RequestVerificationResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const userId = session.user.id;

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

  const validPeriods = new Set(card.quarters.map(q => q.period));
  const periods = input.periods.filter(p => validPeriods.has(p));
  if (periods.length === 0) return { ok: false, error: "None of those quarters exist on your card." };

  if (verifierEmail === user.email.toLowerCase()) {
    return { ok: false, error: "You can't verify your own card." };
  }

  const token = randomBytes(18).toString("base64url");
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

  const periodsForEmail = card.quarters
    .filter(q => periods.includes(q.period))
    .sort((a, b) => a.fiscalYear !== b.fiscalYear ? a.fiscalYear - b.fiscalYear : a.fiscalQuarter - b.fiscalQuarter)
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
    return { ok: false, error: "Saved the request, but the email didn't send. We'll surface a retry button shortly." };
  }

  revalidatePath("/dashboard");
  return { ok: true, verifierEmail };
}
