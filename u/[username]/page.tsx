import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SalesCardFront } from "@/components/salescard/SalesCardFront";
import { SalesCardBack, type QuarterRow } from "@/components/salescard/SalesCardBack";
import { calculateScore, type QuarterInput } from "@/lib/score";
import { fmtMoney, fmtPct, fmtCount } from "@/lib/format";
import { tierFor } from "@/lib/tier";
import type { SalesRole } from "@prisma/client";
import Link from "next/link";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const card = await db.card.findUnique({
    where: { username },
    include: {
      user: true,
      quarters: { orderBy: [{ fiscalYear: "asc" }, { fiscalQuarter: "asc" }] },
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
  const computed = calculateScore(role, scoreInputs, card.percentile ?? 50);

  const quarterRows: QuarterRow[] = card.quarters.map(q => ({
    period:    q.period,
    closedWon: card.showRawKpis ? fmtMoney(q.closedWonDollars)     : "—",
    quota:                       fmtPct(q.quotaAttainmentPct),
    winRate:                     fmtPct(q.winRatePct),
    pipeline:  card.showRawKpis ? fmtMoney(q.pipelineDollars)      : "—",
    avgDeal:   card.showRawKpis ? fmtMoney(q.avgDealSizeDollars)   : "—",
    agents:                       fmtCount(q.agentsManaged),
    agentPipe: card.showRawKpis ? fmtMoney(q.agentPipelineDollars) : "—",
  }));

  const totals: QuarterRow = (() => {
    const num = (v: bigint | null | undefined) => (v ? Number(v) : 0);
    const sumWon  = card.quarters.reduce((a, q) => a + num(q.closedWonDollars), 0);
    const sumPipe = card.quarters.reduce((a, q) => a + num(q.pipelineDollars), 0);
    const sumAgentPipe = card.quarters.reduce((a, q) => a + num(q.agentPipelineDollars), 0);
    const sumDeal = card.quarters.reduce((a, q) => a + num(q.avgDealSizeDollars), 0);
    const dealCount = card.quarters.filter(q => q.avgDealSizeDollars).length;
    const avgDeal = dealCount > 0 ? sumDeal / dealCount : 0;
    const quotaVals = card.quarters.map(q => q.quotaAttainmentPct).filter((x): x is number => x != null);
    const winVals = card.quarters.map(q => q.winRatePct).filter((x): x is number => x != null);
    const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    const latestAgents = [...card.quarters].reverse().find(q => q.agentsManaged != null)?.agentsManaged ?? null;
    return {
      period:    "TOTAL",
      closedWon: card.showRawKpis ? fmtMoney(sumWon) : "—",
      quota:                       fmtPct(avg(quotaVals)),
      winRate:                     fmtPct(avg(winVals)),
      pipeline:  card.showRawKpis ? fmtMoney(sumPipe) : "—",
      avgDeal:   card.showRawKpis ? fmtMoney(avgDeal) : "—",
      agents:                       fmtCount(latestAgents),
      agentPipe: card.showRawKpis ? fmtMoney(sumAgentPipe) : "—",
    };
  })();

  const verifiedCount = card.quarters.filter(q => q.verified).length;
  const totalQuarters = card.quarters.length;

  const tier = tierFor(score);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <Link href="/" className="font-black text-xl tracking-tight">
            <span className="text-[#3478C0]">Sales</span>
            <span className="text-[#10B981]">Card</span>
          </Link>
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
