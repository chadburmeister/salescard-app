import { SalesCardFront } from "@/components/salescard/SalesCardFront";
import { SalesCardBack, type QuarterRow } from "@/components/salescard/SalesCardBack";
import { calculateScore, type QuarterInput } from "@/lib/score";
import { fmtMoney, fmtPct, fmtCount } from "@/lib/format";
import { tierFor } from "@/lib/tier";
import type { Card, Quarter, User, SalesRole } from "@prisma/client";
import Link from "next/link";

interface Props {
  user: User;
  card: Card & { quarters: Quarter[] };
}

export function CardView({ user, card }: Props) {
  const role = (user.role ?? "AE") as SalesRole;
  const name = user.name ?? user.email.split("@")[0];
  const score = card.score ?? 0;
  const tier = tierFor(score);

  // Compute sub-grades for the front of the card
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

  // Format the 8 quarters for the back-of-card table (oldest → newest)
  const sortedQuarters = [...card.quarters].sort((a, b) => {
    if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
    return a.fiscalQuarter - b.fiscalQuarter;
  });

  const quarterRows: QuarterRow[] = sortedQuarters.map(q => ({
    period:    q.period,
    closedWon: fmtMoney(q.closedWonDollars),
    quota:     fmtPct(q.quotaAttainmentPct),
    winRate:   fmtPct(q.winRatePct),
    pipeline:  fmtMoney(q.pipelineDollars),
    avgDeal:   fmtMoney(q.avgDealSizeDollars),
    agents:    fmtCount(q.agentsManaged),
    agentPipe: fmtMoney(q.agentPipelineDollars),
  }));

  // Totals (sums where appropriate, avgs for percentages)
  const totals: QuarterRow = (() => {
    const num = (v: bigint | null | undefined) => (v ? Number(v) : 0);
    const sumWon  = sortedQuarters.reduce((a, q) => a + num(q.closedWonDollars), 0);
    const sumPipe = sortedQuarters.reduce((a, q) => a + num(q.pipelineDollars), 0);
    const sumAgentPipe = sortedQuarters.reduce((a, q) => a + num(q.agentPipelineDollars), 0);
    const sumDeal = sortedQuarters.reduce((a, q) => a + num(q.avgDealSizeDollars), 0);
    const dealCount = sortedQuarters.filter(q => q.avgDealSizeDollars).length;
    const avgDeal = dealCount > 0 ? sumDeal / dealCount : 0;
    const quotaVals = sortedQuarters.map(q => q.quotaAttainmentPct).filter((x): x is number => x != null);
    const winVals = sortedQuarters.map(q => q.winRatePct).filter((x): x is number => x != null);
    const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    const latestAgents = [...sortedQuarters].reverse().find(q => q.agentsManaged != null)?.agentsManaged ?? null;
    return {
      period:    "TOTAL",
      closedWon: fmtMoney(sumWon),
      quota:     fmtPct(avg(quotaVals)),
      winRate:   fmtPct(avg(winVals)),
      pipeline:  fmtMoney(sumPipe),
      avgDeal:   fmtMoney(avgDeal),
      agents:    fmtCount(latestAgents),
      agentPipe: fmtMoney(sumAgentPipe),
    };
  })();

  const verifiedCount = sortedQuarters.filter(q => q.verified).length;
  const totalQuarters = sortedQuarters.length;

  const scoutReport = `${firstName(name)}'s ${totalQuarters}-quarter record shows a ${tier.label.toLowerCase()} performance tier with verified track record. ${verifiedCount} of ${totalQuarters} quarters carry full weight.`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-1">Your SalesCard</div>
            <h1 className="text-3xl font-black tracking-tight">Welcome back, {firstName(name)}.</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/edit"
              className="inline-flex items-center gap-2 text-gray-700 hover:bg-gray-100 font-semibold px-5 py-2.5 rounded-full transition"
            >
              Edit my stats
            </Link>
            <Link
              href={`/u/${card.username}`}
              className="inline-flex items-center gap-2 bg-[#3478C0] hover:bg-[#1E5A9C] text-white font-semibold px-5 py-2.5 rounded-full transition"
            >
              View public card →
            </Link>
          </div>
        </div>

        {/* Score banner */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-10 flex items-center gap-6 flex-wrap">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-3xl"
            style={{ background: `#${tier.color}`, color: tier.textColorOn === "DARK" ? "#0F0F0F" : "#FFFFFF" }}
          >
            {score}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs tracking-widest font-bold text-gray-500 uppercase">SalesCard Score</div>
            <div className="text-2xl font-black tracking-tight">
              {score} <span className="text-gray-400 font-bold text-base">/ 100</span>
              <span className="ml-3 px-3 py-1 rounded-full text-xs font-black tracking-widest"
                    style={{ background: `#${tier.color}20`, color: `#${tier.color}` }}>
                {tier.label}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {verifiedCount}/{totalQuarters} quarters verified · placeholder peer percentile (live percentile activates once we have enough peers)
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Card URL</div>
            <code className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">app.salescard.ai/u/{card.username}</code>
          </div>
        </div>

        {/* The card */}
        <div className="text-center text-sm font-bold tracking-widest text-gray-400 uppercase mb-6">
          Your card · front + back
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
              company={user.currentCompany ?? "—"}
              segment="—"
              region="—"
              startedQuarter={sortedQuarters[0]?.period ?? "—"}
              verifiedCount={verifiedCount}
              totalCount={totalQuarters}
              quarters={quarterRows}
              totals={totals}
              scoutReport={scoutReport}
              percentileText={`TOP ${100 - (card.percentile ?? 50)}% ${roleLabel(role).toUpperCase()}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

function roleLabel(role: SalesRole): string {
  switch (role) {
    case "AE":  return "Account Executive";
    case "BDR": return "BDR";
    case "SDR": return "SDR";
    default:    return "Rep";
  }
}
