import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { trailingEightQuarters } from "@/lib/quarters";
import { KpiForm } from "../KpiForm";
import Link from "next/link";
import type { SalesRole } from "@prisma/client";

/** Edit-existing-data view. Pre-fills the KPI form with whatever the rep has saved. */
export default async function EditPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { card: { include: { quarters: true } } },
  });
  if (!user) redirect("/sign-in");

  // If no card yet, redirect to /dashboard which shows the form
  if (!user.card || user.card.quarters.length === 0) {
    redirect("/dashboard");
  }

  const quarters = trailingEightQuarters();

  // Match each visible quarter slot to an existing DB record (if present)
  const byPeriod = new Map(user.card.quarters.map(q => [q.period, q]));
  const rows = quarters.map(qr => {
    const q = byPeriod.get(qr.period);
    return {
      closedWonRaw: q?.closedWonDollars     != null ? humanMoney(Number(q.closedWonDollars))     : "",
      quotaPctRaw:  q?.quotaAttainmentPct   != null ? String(q.quotaAttainmentPct)                : "",
      winRateRaw:   q?.winRatePct           != null ? String(q.winRatePct)                        : "",
      pipelineRaw:  q?.pipelineDollars      != null ? humanMoney(Number(q.pipelineDollars))      : "",
      dealSizeRaw:  q?.avgDealSizeDollars   != null ? humanMoney(Number(q.avgDealSizeDollars))   : "",
      agentPipeRaw: q?.agentPipelineDollars != null ? humanMoney(Number(q.agentPipelineDollars)) : "",
    };
  });

  // latest agents count
  const sorted = [...user.card.quarters].sort((a, b) => {
    if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear - b.fiscalYear;
    return a.fiscalQuarter - b.fiscalQuarter;
  });
  const initialAgents = sorted[sorted.length - 1]?.agentsManaged != null
    ? String(sorted[sorted.length - 1].agentsManaged)
    : "";

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#3478C0]">← Back to dashboard</Link>
        <h1 className="text-3xl font-black tracking-tight mt-3 mb-2">Edit your stats</h1>
        <p className="text-gray-600 mb-8">Update any quarter. We&apos;ll recalculate your score on save.</p>
        <KpiForm
          quarters={quarters}
          initialRole={(user.role ?? "AE") as SalesRole}
          defaultRows={rows}
          initialAgents={initialAgents}
        />
      </div>
    </main>
  );
}

/** Convert raw dollar amount to a compact human form to pre-populate the input. */
function humanMoney(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}
