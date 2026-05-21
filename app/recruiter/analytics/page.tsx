import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { tierFor } from "@/lib/tier";
import Link from "next/link";
import type { SalesRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const ROLE_ORDER: SalesRole[] = ["AE", "BDR", "SDR", "SDR_BDR_LEADER"];

function roleLabel(role: SalesRole | null): string {
  switch (role) {
    case "AE": return "Account Executives";
    case "BDR": return "BDRs";
    case "SDR": return "SDRs";
    case "SDR_BDR_LEADER": return "SDR/BDR Leaders";
    default: return "Reps";
  }
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const ctx = await getOrgContext(session.user.id);
  if (!ctx) redirect("/recruiter/team");

  // Discoverable talent pool: opted-in, non-private cards.
  const pool = await db.card.findMany({
    where: { recruiterOptIn: true, visibility: { not: "PRIVATE" } },
    include: { user: true, quarters: true },
  });

  const total = pool.length;

  const scores = pool.map((c) => c.score ?? 0).filter((s) => s > 0);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const medianScore = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : 0;

  const verifiedReps = pool.filter((c) => c.quarters.some((q) => q.verified)).length;

  // Role breakdown
  const roleCounts: Record<string, number> = {};
  for (const c of pool) {
    const r = (c.user.role ?? "AE") as string;
    roleCounts[r] = (roleCounts[r] ?? 0) + 1;
  }
  const roleRows = ROLE_ORDER.map((r) => ({
    label: roleLabel(r),
    count: roleCounts[r] ?? 0,
  })).filter((r) => r.count > 0);

  // Tier mix (ordered by score band, high to low)
  const tierMap = new Map<string, { name: string; color: string; count: number; min: number }>();
  for (const c of pool) {
    const t = tierFor(c.score ?? 0);
    const existing = tierMap.get(t.name);
    if (existing) existing.count++;
    else tierMap.set(t.name, { name: t.name, color: t.color, count: 1, min: c.score ?? 0 });
  }
  const tierRows = Array.from(tierMap.values()).sort((a, b) => b.min - a.min);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8">
        <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-1">
          Analytics
        </div>
        <h1 className="text-3xl font-black tracking-tight">{ctx.name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Live snapshot of the verified talent pool and your team.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Discoverable reps" value={total} sub="opted into search" />
        <StatCard
          label="Avg SalesCard Score"
          value={total ? avgScore : "—"}
          sub={total ? `median ${medianScore}` : "no data yet"}
        />
        <StatCard
          label="Verified reps"
          value={verifiedReps}
          sub={total ? `of ${total} in pool` : "of 0 in pool"}
        />
        <StatCard
          label="Seats used"
          value={`${ctx.seatsUsed}/${ctx.seatLimit}`}
          sub={ctx.seatsReserved > 0 ? `${ctx.seatsReserved} pending` : "all assigned"}
        />
      </div>

      {total === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center mb-8">
          <h2 className="text-lg font-black tracking-tight mb-2">No reps are discoverable yet</h2>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            As sales reps flip on <span className="font-semibold">&ldquo;Show me to recruiters&rdquo;</span>{" "}
            from their dashboard, they&apos;ll appear here and in your{" "}
            <Link href="/recruiter" className="text-[#3478C0] hover:underline">talent search</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pool by role */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="text-sm font-bold text-gray-700 mb-4">Pool by role</div>
            <div className="space-y-3">
              {roleRows.map((r) => (
                <BarRow key={r.label} label={r.label} count={r.count} total={total} color="#3478C0" />
              ))}
            </div>
          </div>

          {/* Tier mix */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="text-sm font-bold text-gray-700 mb-4">Tier mix</div>
            <div className="space-y-3">
              {tierRows.map((t) => (
                <BarRow
                  key={t.name}
                  label={t.name}
                  count={t.count}
                  total={total}
                  color={`#${t.color}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team roster */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold text-gray-700">Team ({ctx.members.length})</div>
          <Link href="/recruiter/team" className="text-sm font-semibold text-[#3478C0] hover:underline">
            Manage team →
          </Link>
        </div>
        <div className="space-y-2">
          {ctx.members.map((m) => (
            <div
              key={m.membershipId}
              className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-black text-[11px] flex-shrink-0">
                {initials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate text-sm">{m.name}</div>
                <div className="text-xs text-gray-500 truncate">{m.email}</div>
              </div>
              <span className="text-[10px] font-black tracking-widest uppercase text-gray-400">
                {m.role}
              </span>
            </div>
          ))}
          {ctx.pendingInvites.length > 0 && (
            <div className="text-xs text-gray-500 pt-2">
              + {ctx.pendingInvites.length} pending invite
              {ctx.pendingInvites.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="text-xs font-bold tracking-wide text-gray-500 uppercase">{label}</div>
      <div className="text-3xl font-black tracking-tight mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function BarRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">
          {count} <span className="text-gray-400 font-normal">· {pct}%</span>
        </span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(pct, 2)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function initials(s: string): string {
  const parts = (s || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
