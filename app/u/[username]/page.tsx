import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SalesCardFront } from "@/components/salescard/SalesCardFront";
import { SalesCardBack, type QuarterRow } from "@/components/salescard/SalesCardBack";
import { calculateScore, type QuarterInput } from "@/lib/score";
import { fmtMoney, fmtPct } from "@/lib/format";
import { tierFor } from "@/lib/tier";
import type { SalesRole, VerificationRequest } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const card = await db.card.findUnique({
    where: { username },
    include: { user: true },
  });

  if (!card || card.visibility === "PRIVATE") {
    return {
      title: "SalesCard",
      description: "The verified sales record that follows every SDR, BDR, and AE between jobs.",
    };
  }

  const name = card.user.name || card.user.email.split("@")[0];
  const role = roleLabel((card.user.role ?? "AE") as SalesRole);
  const score = card.score ?? 0;
  const tier = tierFor(score);

  const title = `${name} — SalesCard Score ${score} (${tier.name})`;
  const description = `${name} is a verified ${role} with a SalesCard Score of ${score}. See the full eight-quarter record.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `https://app.salescard.ai/u/${username}`,
      siteName: "SalesCard",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const card = await db.card.findUnique({
    where: { username },
    include: {
      user: true,
      quarters: { orderBy: [{ fiscalYear: "asc" }, { fiscalQuarter: "asc" }] },
      verifications: {
        where: { status: "APPROVED" },
        orderBy: { respondedAt: "desc" },
      },
    },
  });

  if (!card || card.visibility === "PRIVATE") {
    notFound();
  }

  const user = card.user;
  const role = (user.role ?? "AE") as SalesRole;
  const name = user.name ?? user.email.split("@")[0];
  const score = card.score ?? 0;

  // Sub-grades
  const scoreInputs: QuarterInput[] = card.quarters.map(q => ({
    period:               q.period,
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
  const computed = calculateScore(role, scoreInputs, card.percentile ?? 50);

  // New column set
  const quarterRows: QuarterRow[] = card.quarters.map(q => ({
    period:        q.period,
    target:        q.targetSegment      ?? "—",
    conversations: q.conversationsRange ?? "—",
    meetings:      q.meetingsRange      ?? "—",
    pipeOpps:      q.pipeOpps != null ? String(q.pipeOpps) : "—",
    pipeline:      card.showRawKpis ? fmtMoney(q.pipelineDollars)  : "—",
    closedWon:     card.showRawKpis ? fmtMoney(q.closedWonDollars) : "—",
    quota:         fmtPct(q.quotaAttainmentPct),
  }));

  const totals: QuarterRow = (() => {
    const num = (v: bigint | null | undefined) => (v ? Number(v) : 0);
    const sumPipe = card.quarters.reduce((a, q) => a + num(q.pipelineDollars),  0);
    const sumWon  = card.quarters.reduce((a, q) => a + num(q.closedWonDollars), 0);
    const sumOpps = card.quarters.reduce((a, q) => a + (q.pipeOpps ?? 0), 0);
    const quotaVals = card.quarters.map(q => q.quotaAttainmentPct).filter((x): x is number => x != null);
    const avgQuota = quotaVals.length ? quotaVals.reduce((a, b) => a + b, 0) / quotaVals.length : null;
    return {
      period:        "TOTAL",
      target:        "—",
      conversations: "—",
      meetings:      "—",
      pipeOpps:      sumOpps > 0 ? String(sumOpps) : "—",
      pipeline:      card.showRawKpis ? fmtMoney(sumPipe) : "—",
      closedWon:     card.showRawKpis ? fmtMoney(sumWon)  : "—",
      quota:         fmtPct(avgQuota),
    };
  })();

  const verifiedCount = card.quarters.filter(q => q.verified).length;
  const totalQuarters = card.quarters.length;

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <Link href="/" className="font-black text-xl tracking-tight">
            <span className="text-[#3478C0]">Sales</span>
            <span className="text-[#10B981]">Card</span>
          </Link>
        </div>

        {/* Profile photo + identity header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-lg bg-gray-50 mb-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#3478C0] to-[#10B981] text-white font-black flex items-center justify-center text-3xl">
                {getInitials(name)}
              </div>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">{name}</h1>
          <p className="text-gray-600 mt-1">{roleLabel(role)}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="text-xs font-bold tracking-widest text-gray-400 mb-3 text-center">FRONT</div>
            <SalesCardFront
              name={name}
              role={roleLabel(role)}
              score={score}
              linkedinHandle={card.username}
              subGrades={computed.subGradesTenScale}
            />
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-gray-400 mb-3 text-center">BACK</div>
            <SalesCardBack
              name={name}
              role={roleLabel(role)}
              score={score}
              company={card.showEmployer ? (user.currentCompany ?? "—") : "—"}
              segment="—"
              region="—"
              startedQuarter={card.quarters[0]?.period ?? "—"}
              verifiedCount={verifiedCount}
              totalCount={totalQuarters}
              quarters={quarterRows}
              totals={totals}
              percentileText={`TOP ${100 - (card.percentile ?? 50)}% ${roleLabel(role).toUpperCase()}`}
            />
          </div>
        </div>

        {card.verifications.length > 0 && (
          <VerificationRecord verifications={card.verifications} repName={name} />
        )}

        <div className="text-center text-sm text-gray-500 mt-12">
          This is <strong>{name}</strong>&apos;s public SalesCard.
          {" "}
          <Link href="/sign-in" className="text-[#3478C0] hover:underline">Claim your own →</Link>
        </div>
      </div>
    </main>
  );
}

function roleLabel(role: SalesRole): string {
  switch (role) {
    case "AE":  return "Account Executive";
    case "BDR": return "BDR";
    case "SDR": return "SDR";
    default:    return "Rep";
  }
}

// =========================================================================
// VerificationRecord — list of approved verifiers shown on the public page
// =========================================================================

function VerificationRecord({
  verifications,
  repName,
}: {
  verifications: VerificationRequest[];
  repName: string;
}) {
  const verifierCount = new Set(verifications.map(v => v.verifierEmail.toLowerCase())).size;
  const allPeriods = new Set<string>();
  for (const v of verifications) for (const p of v.quarterPeriods) allPeriods.add(p);

  return (
    <section className="mt-16 max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className="text-xs tracking-widest font-bold text-emerald-600 uppercase">
          Verified record
        </span>
      </div>
      <h2 className="text-2xl md:text-3xl font-black tracking-tight text-center mb-2">
        Verified by {verifierCount} {verifierCount === 1 ? "person" : "people"}
      </h2>
      <p className="text-center text-gray-600 text-sm mb-8">
        {allPeriods.size} of {repName}&apos;s quarters carry full-weight verification from independent contacts.
      </p>

      <div className="space-y-3">
        {verifications.map(v => (
          <VerifierRow key={v.id} v={v} />
        ))}
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        Verifiers attest these numbers are accurate to their knowledge. Verified quarters carry full weight in the SalesCard Score; unverified quarters carry half.
      </p>
    </section>
  );
}

function VerifierRow({ v }: { v: VerificationRequest }) {
  const displayName = v.verifierName?.trim() || maskEmail(v.verifierEmail);
  const initials = getInitials(v.verifierName || v.verifierEmail);
  const rel = v.relationship ? capitalize(v.relationship) : "Contact";
  const date = v.respondedAt ? new Date(v.respondedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  const periods = v.quarterPeriods.join(" · ");

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4">
      <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900 truncate">{displayName}</div>
        <div className="text-xs text-gray-500">{rel} · verified {periods}</div>
      </div>
      <div className="hidden sm:block text-right text-xs text-gray-500 whitespace-nowrap">
        <div className="flex items-center gap-1 text-emerald-600 font-bold justify-end mb-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Verified
        </div>
        <div>{date}</div>
      </div>
    </div>
  );
}

function getInitials(s: string): string {
  const cleaned = (s || "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "Anonymous verifier";
  const shown = user.slice(0, Math.min(2, user.length));
  return `${shown}${user.length > 2 ? "•••" : ""}@${domain}`;
}

function capitalize(s: string): string {
  if (!s) return s;
  const lower = s.toLowerCase();
  if (lower.includes("manager")) return "Manager";
  if (lower.includes("peer"))    return "Peer rep";
  if (lower.includes("ops") || lower.includes("rev")) return "RevOps partner";
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}
