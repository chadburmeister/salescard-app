import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { tierFor } from "@/lib/tier";
import Link from "next/link";
import type { Prisma, SalesRole } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ role?: string; minScore?: string; segment?: string; q?: string }>;
}

const SEGMENTS = ["SMB", "Mid-Market", "Enterprise", "PubSec", "Other"];
const ROLES: { value: string; label: string }[] = [
  { value: "",               label: "All roles" },
  { value: "AE",             label: "AE" },
  { value: "BDR",            label: "BDR" },
  { value: "SDR",            label: "SDR" },
  { value: "SDR_BDR_LEADER", label: "SDR/BDR Leader" },
];

function roleLabel(role: string | null): string {
  switch (role) {
    case "AE":             return "Account Executive";
    case "BDR":            return "BDR";
    case "SDR":            return "SDR";
    case "SDR_BDR_LEADER": return "SDR/BDR Leader";
    default:               return "Sales Rep";
  }
}

function getInitials(s: string): string {
  const cleaned = (s || "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function RecruiterSearchPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const me = await db.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/sign-in");
  if (!me.isRecruiter) redirect("/dashboard");

  const sp = await searchParams;
  const role = sp.role || "";
  const minScore = sp.minScore ? parseInt(sp.minScore, 10) : null;
  const segment = sp.segment || "";
  const q = (sp.q || "").trim();

  const where: Prisma.CardWhereInput = {
    recruiterOptIn: true,
    visibility: { not: "PRIVATE" },
    score: minScore != null && Number.isFinite(minScore) ? { gte: minScore } : { not: null },
  };

  const userWhere: Prisma.UserWhereInput = {};
  if (role) userWhere.role = role as SalesRole;
  if (q) {
    userWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { currentCompany: { contains: q, mode: "insensitive" } },
    ];
  }
  if (Object.keys(userWhere).length) where.user = userWhere;
  if (segment) where.quarters = { some: { targetSegment: segment } };

  const cards = await db.card.findMany({
    where,
    include: { user: true },
    orderBy: { score: "desc" },
    take: 60,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/recruiter" className="font-black text-xl tracking-tight">
            <span className="text-[#0A66C2]">Sales</span><span className="text-[#10B981]">Card</span>
            <span className="ml-2 text-xs font-bold tracking-widest text-gray-400 uppercase">Recruiter</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">{me.name ?? me.email}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button type="submit" className="text-sm font-semibold text-gray-700 hover:text-[#0A66C2]">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-xs tracking-widest font-bold text-[#0A66C2] uppercase mb-1">Verified rep search</div>
          <h1 className="text-3xl font-black tracking-tight">Find verified sales talent.</h1>
          <p className="text-gray-600 mt-1">Every rep here has opted in and uploaded a verified record. Filter by role, score, and segment.</p>
        </div>

        {/* Filters (GET form) */}
        <form method="get" className="bg-white border border-gray-200 rounded-2xl p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <label className="block">
            <div className="text-[11px] font-black tracking-widest text-gray-500 uppercase mb-1.5">Role</div>
            <select name="role" defaultValue={role} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#0A66C2]">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-[11px] font-black tracking-widest text-gray-500 uppercase mb-1.5">Min score</div>
            <input type="number" name="minScore" defaultValue={minScore ?? ""} min={0} max={100} placeholder="0" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#0A66C2]" />
          </label>
          <label className="block">
            <div className="text-[11px] font-black tracking-widest text-gray-500 uppercase mb-1.5">Segment</div>
            <select name="segment" defaultValue={segment} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#0A66C2]">
              <option value="">Any segment</option>
              {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-[11px] font-black tracking-widest text-gray-500 uppercase mb-1.5">Name or company</div>
            <input type="text" name="q" defaultValue={q} placeholder="Search…" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#0A66C2]" />
          </label>
          <button type="submit" className="bg-[#0A66C2] hover:bg-[#1E5A9C] text-white font-bold px-5 py-2.5 rounded-xl transition">
            Search
          </button>
        </form>

        <div className="text-sm text-gray-500 mb-4">
          {cards.length} {cards.length === 1 ? "rep" : "reps"} found
        </div>

        {cards.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="text-lg font-bold text-gray-900 mb-1">No reps match yet.</div>
            <p className="text-gray-600 text-sm">Try widening your filters. The pool grows as more reps opt into search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => {
              const u = card.user;
              const name = u.name ?? u.email.split("@")[0];
              const score = card.score ?? 0;
              const tier = tierFor(score);
              return (
                <Link
                  key={card.id}
                  href={`/u/${card.username}`}
                  className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-gray-300 transition flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-50 flex-shrink-0">
                      {u.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.image} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0A66C2] to-[#10B981] text-white font-black flex items-center justify-center text-sm">
                          {getInitials(name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black tracking-tight truncate">{name}</div>
                      <div className="text-xs text-gray-500 truncate">{roleLabel(u.role)}{u.currentCompany ? ` · ${u.currentCompany}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center font-black text-xl"
                        style={{ background: `#${tier.color}`, color: tier.textColorOn === "DARK" ? "#0F0F0F" : "#FFFFFF" }}
                      >
                        {score}
                      </div>
                      <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: `#${tier.color}` }}>
                        {tier.name}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#0A66C2]">View card →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
