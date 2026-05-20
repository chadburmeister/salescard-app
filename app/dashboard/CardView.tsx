import { SalesCardFront } from "@/components/salescard/SalesCardFront";
import { SalesCardBack, type QuarterRow } from "@/components/salescard/SalesCardBack";
import { calculateScore, type QuarterInput } from "@/lib/score";
import { fmtMoney, fmtPct } from "@/lib/format";
import { tierFor } from "@/lib/tier";
import type { Card, Quarter, User, SalesRole, VerificationRequest } from "@prisma/client";
import Link from "next/link";
import { RequestVerificationDialog } from "./RequestVerificationDialog";
import { ShareDialog } from "./ShareDialog";
import { PhotoUploadDialog } from "./PhotoUploadDialog";
import { CardThemeDialog } from "./CardThemeDialog";
import { EditCompanyDialog } from "./EditCompanyDialog";

interface Props {
  user: User;
  card: Card & {
    quarters: Quarter[];
    verifications?: VerificationRequest[];
  };
}

export function CardView({ user, card }: Props) {
  const role = (user.role ?? "AE") as SalesRole;
  const name = user.name ?? user.email.split("@")[0];
  const score = card.score ?? 0;
  const tier = tierFor(score);

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

  const sortedQuarters = [...card.quarters].sort((a, b) => {
    if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
    return a.fiscalQuarter - b.fiscalQuarter;
  });

  const quarterRows: QuarterRow[] = sortedQuarters.map(q => ({
    period:        q.period,
    target:        q.targetSegment      ?? "—",
    conversations: q.conversationsRange ?? "—",
    meetings:      q.meetingsRange      ?? "—",
    pipeOpps:      q.pipeOpps != null ? String(q.pipeOpps) : "—",
    pipeline:      fmtMoney(q.pipelineDollars),
    closedWon:     fmtMoney(q.closedWonDollars),
    quota:         fmtPct(q.quotaAttainmentPct),
  }));

  const totals: QuarterRow = (() => {
    const num = (v: bigint | null | undefined) => (v ? Number(v) : 0);
    const sumPipe = sortedQuarters.reduce((a, q) => a + num(q.pipelineDollars),  0);
    const sumWon  = sortedQuarters.reduce((a, q) => a + num(q.closedWonDollars), 0);
    const sumOpps = sortedQuarters.reduce((a, q) => a + (q.pipeOpps ?? 0), 0);
    const quotaVals = sortedQuarters.map(q => q.quotaAttainmentPct).filter((x): x is number => x != null);
    const avgQuota = quotaVals.length ? quotaVals.reduce((a, b) => a + b, 0) / quotaVals.length : null;
    return {
      period:        "TOTAL",
      target:        "—",
      conversations: "—",
      meetings:      "—",
      pipeOpps:      sumOpps > 0 ? String(sumOpps) : "—",
      pipeline:      fmtMoney(sumPipe),
      closedWon:     fmtMoney(sumWon),
      quota:         fmtPct(avgQuota),
    };
  })();

  const verifiedCount = sortedQuarters.filter(q => q.verified).length;
  const totalQuarters = sortedQuarters.length;
  const scoutReport = `${firstName(name)}'s ${totalQuarters}-quarter record places them in the ${tier.name} tier. ${verifiedCount} of ${totalQuarters} quarters carry full-weight verification.`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <PhotoUploadDialog currentImage={user.image ?? null} userName={name} />
            <div>
              <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-1">Your SalesCard</div>
              <h1 className="text-3xl font-black tracking-tight">Welcome back, {firstName(name)}.</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/dashboard/edit" className="inline-flex items-center gap-2 text-gray-700 hover:bg-gray-100 font-semibold px-5 py-2.5 rounded-full transition">
              Edit my stats
            </Link>
            <RequestVerificationDialog
              quarterPeriods={sortedQuarters.map(q => q.period)}
              alreadyVerified={sortedQuarters.filter(q => q.verified).map(q => q.period)}
            />
            <Link href={`/u/${card.username}`} className="inline-flex items-center gap-2 text-gray-700 hover:bg-gray-100 font-semibold px-5 py-2.5 rounded-full transition">
              View public card
            </Link>
            <ShareDialog
              repName={name}
              score={score}
              tierLabel={tier.name}
              tierDescription={tier.description}
              username={card.username}
            />
          </div>
        </div>

        {card.verifications && card.verifications.length > 0 && (
          <VerificationStatusPanel verifications={card.verifications} />
        )}

        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-10 flex items-center gap-6 flex-wrap">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-3xl"
            style={{ background: `#${tier.color}`, color: tier.textColorOn === "DARK" ? "#0F0F0F" : "#FFFFFF" }}
          >
            {score}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs tracking-widest font-bold text-gray-500 uppercase">SalesCard Score</div>
            <div className="text-2xl font-black tracking-tight flex items-center gap-3 flex-wrap">
              <span>{score} <span className="text-gray-400 font-bold text-base">/ 100</span></span>
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest"
                    style={{ background: `#${tier.color}20`, color: `#${tier.color}` }}>
                {tier.name.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-700 mt-1 italic">{tier.description}</div>
            <div className="text-sm text-gray-500 mt-0.5">
              {verifiedCount}/{totalQuarters} quarters verified · placeholder peer percentile (live percentile activates once we have enough peers)
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Card URL</div>
            <code className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">app.salescard.ai/u/{card.username}</code>
          </div>
        </div>

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
              photoUrl={user.image ?? undefined}
              linkedinHandle={linkedinHandleFor(user)}
              themeId={card.cardBackground}
              subGrades={computed.subGradesTenScale}
            />
            <div className="mt-4 flex justify-center gap-2 flex-wrap">
              <PhotoUploadDialog
                currentImage={user.image ?? null}
                userName={name}
                variant="button"
                buttonLabel="Change my card photo"
              />
              <CardThemeDialog currentTheme={card.cardBackground} />
            </div>
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
            <div className="mt-4 flex justify-center">
              <EditCompanyDialog currentCompany={user.currentCompany ?? null} />
            </div>
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
    case "AE":             return "Account Executive";
    case "BDR":            return "BDR";
    case "SDR":            return "SDR";
    case "SDR_BDR_LEADER": return "SDR/BDR Leader";
    default:               return "Rep";
  }
}

function linkedinHandleFor(u: User): string {
  if (u.linkedinUrl) {
    const m = u.linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
    if (m) return m[1];
    if (!/[\/.]/.test(u.linkedinUrl)) return u.linkedinUrl;
  }
  return u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
}

function VerificationStatusPanel({ verifications }: { verifications: VerificationRequest[] }) {
  const sorted = [...verifications].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  const pending  = sorted.filter(v => v.status === "PENDING");
  const approved = sorted.filter(v => v.status === "APPROVED");
  const rejected = sorted.filter(v => v.status === "REJECTED");
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8">
      <div className="text-xs tracking-widest font-bold text-gray-500 uppercase mb-3">Verification activity</div>
      <div className="space-y-2">
        {pending.map(v => (<Row key={v.id} v={v} variant="pending" />))}
        {approved.map(v => (<Row key={v.id} v={v} variant="approved" />))}
        {rejected.map(v => (<Row key={v.id} v={v} variant="rejected" />))}
      </div>
    </div>
  );
}

function Row({ v, variant }: { v: VerificationRequest; variant: "pending" | "approved" | "rejected" }) {
  const label = v.verifierName ? `${v.verifierName} <${v.verifierEmail}>` : v.verifierEmail;
  const periods = v.quarterPeriods.join(", ");
  const meta = {
    pending:  { color: "bg-amber-100 text-amber-700",       text: "Pending"  },
    approved: { color: "bg-emerald-100 text-emerald-700",   text: "Verified" },
    rejected: { color: "bg-red-100 text-red-700",           text: "Flagged"  },
  }[variant];
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="text-sm">
        <span className="font-semibold text-gray-900">{label}</span>
        <span className="text-gray-500"> · {periods}</span>
      </div>
      <span className={`text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full ${meta.color}`}>
        {meta.text}
      </span>
    </div>
  );
}
