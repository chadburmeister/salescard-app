"use client";

import { useState } from "react";
import { saveKpis, type KpiSubmission } from "./actions";
import type { SalesRole } from "@prisma/client";

interface QuarterRef {
  period: string;
  fiscalYear: number;
  fiscalQuarter: number;
}

interface QuarterRow {
  closedWonRaw: string;
  quotaPctRaw: string;
  winRateRaw: string;
  pipelineRaw: string;
  dealSizeRaw: string;
  agentPipeRaw: string;
}

const EMPTY_ROW: QuarterRow = {
  closedWonRaw: "",
  quotaPctRaw: "",
  winRateRaw: "",
  pipelineRaw: "",
  dealSizeRaw: "",
  agentPipeRaw: "",
};

export function KpiForm({
  quarters,
  initialRole = "AE",
  defaultRows,
  initialAgents = "",
}: {
  quarters: QuarterRef[];
  initialRole?: SalesRole;
  defaultRows?: QuarterRow[];
  initialAgents?: string;
}) {
  const [role, setRole] = useState<SalesRole>(initialRole);
  const [agentsManagedRaw, setAgentsManagedRaw] = useState<string>(initialAgents);
  const [rows, setRows] = useState<QuarterRow[]>(
    defaultRows && defaultRows.length === 8 ? defaultRows : quarters.map(() => ({ ...EMPTY_ROW }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (i: number, field: keyof QuarterRow, value: string) => {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate: require at least one filled quarter
      const anyFilled = rows.some(r =>
        r.closedWonRaw.trim() || r.pipelineRaw.trim() || r.quotaPctRaw.trim()
      );
      if (!anyFilled) {
        setError("Add at least one quarter's data before generating your card.");
        setSubmitting(false);
        return;
      }

      const submission: KpiSubmission = {
        role,
        agentsManaged: parseInt(agentsManagedRaw, 10) || null,
        quarters: quarters.map((q, i) => ({
          period: q.period,
          fiscalYear: q.fiscalYear,
          fiscalQuarter: q.fiscalQuarter,
          closedWonDollars:     parseMoney(rows[i].closedWonRaw),
          quotaAttainmentPct:   parsePct(rows[i].quotaPctRaw),
          winRatePct:           parsePct(rows[i].winRateRaw),
          pipelineDollars:      parseMoney(rows[i].pipelineRaw),
          avgDealSizeDollars:   parseMoney(rows[i].dealSizeRaw),
          agentPipelineDollars: parseMoney(rows[i].agentPipeRaw),
        })),
      };

      await saveKpis(submission);
      // saveKpis() ends with redirect("/dashboard") — we won't reach here on success
    } catch (err) {
      // NEXT_REDIRECT errors from server action are thrown but handled by the runtime
      const msg = (err as Error)?.message || "Something went wrong. Try again?";
      if (/redirect/i.test(msg)) {
        // server action successfully redirected — let Next.js handle it
        return;
      }
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Role + agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <div className="text-sm font-bold text-gray-700 mb-1.5">Your role</div>
          <select
            value={role}
            onChange={e => setRole(e.target.value as SalesRole)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:outline-none focus:border-[#3478C0] bg-white"
          >
            <option value="AE">Account Executive (AE)</option>
            <option value="BDR">Business Development Rep (BDR)</option>
            <option value="SDR">Sales Development Rep (SDR)</option>
          </select>
        </label>
        <label className="block">
          <div className="text-sm font-bold text-gray-700 mb-1.5">
            AI agents under management <span className="text-gray-400 font-normal">(current count)</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={agentsManagedRaw}
            onChange={e => setAgentsManagedRaw(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:outline-none focus:border-[#3478C0]"
          />
        </label>
      </div>

      {/* Quarters table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-bold sticky left-0 bg-gray-50 z-10">Quarter</th>
                <th className="text-right px-3 py-3 font-bold">Closed-won $</th>
                <th className="text-right px-3 py-3 font-bold">Quota %</th>
                <th className="text-right px-3 py-3 font-bold">Win rate %</th>
                <th className="text-right px-3 py-3 font-bold">Pipeline $</th>
                <th className="text-right px-3 py-3 font-bold text-gray-400">Avg deal $</th>
                <th className="text-right px-3 py-3 font-bold text-gray-400">Agent pipe $</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((q, i) => (
                <tr key={q.period} className="border-t border-gray-100 hover:bg-blue-50/30">
                  <td className="px-4 py-2.5 font-bold text-gray-900 sticky left-0 bg-white whitespace-nowrap">
                    {q.period}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="580K"
                      value={rows[i].closedWonRaw}
                      onChange={e => updateRow(i, "closedWonRaw", e.target.value)}
                      className="w-24 text-right px-2 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:border-[#3478C0]"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="88"
                      value={rows[i].quotaPctRaw}
                      onChange={e => updateRow(i, "quotaPctRaw", e.target.value)}
                      className="w-20 text-right px-2 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:border-[#3478C0]"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="24"
                      value={rows[i].winRateRaw}
                      onChange={e => updateRow(i, "winRateRaw", e.target.value)}
                      className="w-20 text-right px-2 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:border-[#3478C0]"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="1.6M"
                      value={rows[i].pipelineRaw}
                      onChange={e => updateRow(i, "pipelineRaw", e.target.value)}
                      className="w-24 text-right px-2 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:border-[#3478C0]"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="72K"
                      value={rows[i].dealSizeRaw}
                      onChange={e => updateRow(i, "dealSizeRaw", e.target.value)}
                      className="w-20 text-right px-2 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:border-[#3478C0]"
                    />
                  </td>
                  <td className="px-2 py-1.5 pr-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={rows[i].agentPipeRaw}
                      onChange={e => updateRow(i, "agentPipeRaw", e.target.value)}
                      className="w-20 text-right px-2 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:border-[#3478C0]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          Hint: type values like <code className="text-gray-700">580K</code>, <code className="text-gray-700">1.6M</code>, or <code className="text-gray-700">580000</code>. Percentages don&apos;t need the % sign. Leave blank for any quarter you don&apos;t have data for.
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500 max-w-md">
          We&apos;ll calculate your <strong>SalesCard Score</strong> from these numbers. You can edit them anytime, and you control whether your card is private, unlisted, or recruiter-visible.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-[#3478C0] hover:bg-[#1E5A9C] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-7 py-3.5 rounded-full transition"
        >
          {submitting ? "Generating..." : "Generate my SalesCard →"}
        </button>
      </div>
    </form>
  );
}

// === parsers ===

/** Parse "580K", "$1,200,000", "1.6M", "580000" → number or null. */
function parseMoney(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = input.trim().toLowerCase().replace(/[$,\s_]/g, "");
  if (!s) return null;
  let mult = 1;
  let numStr = s;
  if (s.endsWith("b")) { mult = 1_000_000_000; numStr = s.slice(0, -1); }
  else if (s.endsWith("m")) { mult = 1_000_000; numStr = s.slice(0, -1); }
  else if (s.endsWith("k")) { mult = 1_000; numStr = s.slice(0, -1); }
  const n = parseFloat(numStr);
  if (!Number.isFinite(n)) return null;
  return n * mult;
}

/** Parse "88", "88%", "138" → number or null. */
function parsePct(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = input.trim().replace(/%/g, "").replace(/,/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return n;
}
