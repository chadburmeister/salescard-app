import { db } from "@/lib/db";
import { fmtMoney, fmtPct, fmtCount } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VerifierActions } from "./VerifierActions";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function VerifyTokenPage({ params }: PageProps) {
  const { token } = await params;

  const request = await db.verificationRequest.findUnique({
    where: { token },
    include: {
      card: {
        include: {
          user: true,
          quarters: {
            orderBy: [{ fiscalYear: "asc" }, { fiscalQuarter: "asc" }],
          },
        },
      },
    },
  });

  if (!request) notFound();

  const card = request.card;
  const rep = card.user;
  const repName = rep.name || rep.email.split("@")[0];

  // Only show the quarters this request asked about
  const requestedSet = new Set(request.quarterPeriods);
  const quartersToShow = card.quarters.filter(q => requestedSet.has(q.period));

  const isExpired = request.expiresAt < new Date();
  const alreadyResponded = request.status !== "PENDING";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* brand header */}
        <div className="text-center mb-10">
          <Link href="/" className="font-black text-2xl tracking-tight">
            <span className="text-[#0A66C2]">Sales</span>
            <span className="text-[#10B981]">Card</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {alreadyResponded || isExpired ? (
            <RespondedOrExpired
              status={request.status}
              isExpired={isExpired}
              repName={repName}
              periods={request.quarterPeriods}
            />
          ) : (
            <>
              <div className="text-xs tracking-widest font-bold text-[#0A66C2] uppercase mb-2">
                Verification request
              </div>
              <h1 className="text-2xl font-black tracking-tight mb-2">
                Do these numbers look right for {repName}?
              </h1>
              <p className="text-gray-700 text-[15px] mb-6">
                {repName} is building a SalesCard — a verified record of their sales performance — and listed you as a
                {request.relationship ? ` ${describeRelationship(request.relationship)}` : " trusted contact"} who can confirm their numbers.
                You&apos;re seeing exactly what they entered.
              </p>

              {/* Quarters table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-bold">Quarter</th>
                      <th className="text-right px-3 py-2.5 font-bold">Closed-won</th>
                      <th className="text-right px-3 py-2.5 font-bold">Quota</th>
                      <th className="text-right px-3 py-2.5 font-bold">Win rate</th>
                      <th className="text-right px-3 py-2.5 font-bold">Pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quartersToShow.map(q => (
                      <tr key={q.period} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 font-bold text-gray-900">{q.period}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{q.closedWonDollars ? fmtMoney(Number(q.closedWonDollars)) : "—"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{q.quotaAttainmentPct != null ? fmtPct(q.quotaAttainmentPct) : "—"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{q.winRatePct != null ? fmtPct(q.winRatePct) : "—"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{q.pipelineDollars ? fmtMoney(Number(q.pipelineDollars)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <VerifierActions token={token} repName={repName} />
            </>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center mt-6 max-w-md mx-auto">
          By confirming, you&apos;re attesting that — to the best of your knowledge — these numbers are accurate for the quarters shown.
          Your name and email will appear on {repName}&apos;s card as the verifier of these quarters.
        </p>
      </div>
    </main>
  );
}

function RespondedOrExpired({
  status, isExpired, repName, periods,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  isExpired: boolean;
  repName: string;
  periods: string[];
}) {
  if (isExpired || status === "EXPIRED") {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h2 className="text-xl font-black tracking-tight mb-2">This link expired</h2>
        <p className="text-gray-700">Ask {repName} to send a fresh verification link.</p>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-xl font-black tracking-tight mb-2">Already verified</h2>
        <p className="text-gray-700">
          You confirmed {periods.length} quarter{periods.length === 1 ? "" : "s"} for {repName}.
          Nothing more to do — their card has been updated.
        </p>
      </div>
    );
  }
  // REJECTED
  return (
    <div className="text-center py-6">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
      </div>
      <h2 className="text-xl font-black tracking-tight mb-2">Already flagged</h2>
      <p className="text-gray-700">{repName} has been notified.</p>
    </div>
  );
}

function describeRelationship(r: string): string {
  const lower = r.toLowerCase();
  if (lower.includes("manager")) return "manager";
  if (lower.includes("peer"))    return "peer";
  if (lower.includes("ops") || lower.includes("rev")) return "RevOps partner";
  return r;
}
