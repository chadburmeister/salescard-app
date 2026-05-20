"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SalesRole } from "@prisma/client";
import { saveKpis } from "./actions";

const TARGET_OPTIONS = ["SMB", "Mid-Market", "Enterprise", "PubSec", "Other"] as const;
const RANGE_OPTIONS  = ["<50", "50-100", "100-250", "250+"] as const;

type TargetOpt = (typeof TARGET_OPTIONS)[number] | "";
type RangeOpt  = (typeof RANGE_OPTIONS)[number]  | "";

const ROLE_BUTTONS: { value: SalesRole; label: string }[] = [
  { value: "AE",              label: "AE" },
  { value: "BDR",             label: "BDR" },
  { value: "SDR",             label: "SDR" },
  { value: "SDR_BDR_LEADER",  label: "SDR/BDR Leader" },
];

interface QuarterDescriptor {
  period: string;
  fiscalYear: number;
  fiscalQuarter: number;
}

interface QuarterFormState {
  period: string;
  fiscalYear: number;
  fiscalQuarter: number;
  targetSegment:      TargetOpt;
  conversationsRange: RangeOpt;
  meetingsRange:      RangeOpt;
  pipeOpps:           string;
  pipelineDollars:    string;
  closedWonDollars:   string;
  quotaAttainmentPct: string;
}

interface Props {
  quarters: QuarterDescriptor[];
  initialRole: SalesRole;
  initialData?: Partial<QuarterFormState>[];
}

export function KpiForm({ quarters, initialRole, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [role, setRole] = useState<SalesRole>(initialRole);
  const [rows, setRows] = useState<QuarterFormState[]>(() =>
    quarters.map((q, i) => ({
      period:             q.period,
      fiscalYear:         q.fiscalYear,
      fiscalQuarter:      q.fiscalQuarter,
      targetSegment:      ((initialData?.[i]?.targetSegment      as TargetOpt) || ""),
      conversationsRange: ((initialData?.[i]?.conversationsRange as RangeOpt)  || ""),
      meetingsRange:      ((initialData?.[i]?.meetingsRange      as RangeOpt)  || ""),
      pipeOpps:            (initialData?.[i]?.pipeOpps          ?? "").toString(),
      pipelineDollars:     (initialData?.[i]?.pipelineDollars   ?? "").toString(),
      closedWonDollars:    (initialData?.[i]?.closedWonDollars  ?? "").toString(),
      quotaAttainmentPct:  (initialData?.[i]?.quotaAttainmentPct?? "").toString(),
    }))
  );
  const [error, setError] = useState<string | null>(null);

  const update = (idx: number, patch: Partial<QuarterFormState>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      role,
      quarters: rows.map(r => ({
        period:             r.period,
        fiscalYear:         r.fiscalYear,
        fiscalQuarter:      r.fiscalQuarter,
        targetSegment:      r.targetSegment      || null,
        conversationsRange: r.conversationsRange || null,
        meetingsRange:      r.meetingsRange      || null,
        pipeOpps:           parseIntSafe(r.pipeOpps),
        pipelineDollars:    parseIntSafe(r.pipelineDollars),
        closedWonDollars:   parseIntSafe(r.closedWonDollars),
        quotaAttainmentPct: parseFloatSafe(r.quotaAttainmentPct),
      })),
    };

    startTransition(async () => {
      try {
        const res = await saveKpis(payload);
        if (!res?.ok) {
          setError(res?.error || "Couldn't save your stats. Try again.");
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setError((err as Error).message || "Something went wrong. Try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="text-xs font-black tracking-widest text-[#3478C0] uppercase mb-3">Your role</div>
        <div className="flex flex-wrap gap-2">
          {ROLE_BUTTONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm transition border ${
                role === value
                  ? "bg-[#3478C0] text-white border-[#3478C0]"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs font-black tracking-widest text-[#3478C0] uppercase mb-0.5">Your stats</div>
            <div className="text-sm text-gray-600">Click any cell to edit. Leave blank if you don&apos;t have the number.</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 880 }}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[11px] tracking-wider uppercase text-gray-500">
                <th className="px-3 py-3 text-left font-black">Period</th>
                <th className="px-2 py-3 text-left font-black">Segment</th>
                <th className="px-2 py-3 text-left font-black">Conv / Qtr</th>
                <th className="px-2 py-3 text-left font-black">Mtgs / Qtr</th>
                <th className="px-2 py-3 text-left font-black">Pipe Opps</th>
                <th className="px-2 py-3 text-left font-black">Pipe $</th>
                <th className="px-2 py-3 text-left font-black">Closed/Won $</th>
                <th className="px-2 py-3 text-left font-black">% of Quota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.period} className={`border-b border-gray-100 last:border-b-0 ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                  <td className="px-3 py-2 font-black text-gray-900 whitespace-nowrap">{row.period}</td>
                  <td className="px-1.5 py-1">
                    <select
                      value={row.targetSegment}
                      onChange={(e) => update(i, { targetSegment: e.target.value as TargetOpt })}
                      className="cell-select"
                    >
                      <option value="">—</option>
                      {TARGET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-1.5 py-1">
                    <select
                      value={row.conversationsRange}
                      onChange={(e) => update(i, { conversationsRange: e.target.value as RangeOpt })}
                      className="cell-select"
                    >
                      <option value="">—</option>
                      {RANGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-1.5 py-1">
                    <select
                      value={row.meetingsRange}
                      onChange={(e) => update(i, { meetingsRange: e.target.value as RangeOpt })}
                      className="cell-select"
                    >
                      <option value="">—</option>
                      {RANGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-1.5 py-1">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.pipeOpps}
                      onChange={(e) => update(i, { pipeOpps: e.target.value })}
                      placeholder="—"
                      className="cell-input"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={row.pipelineDollars}
                        onChange={(e) => update(i, { pipelineDollars: e.target.value })}
                        placeholder="—"
                        className="cell-input"
                        style={{ paddingLeft: 18 }}
                      />
                    </div>
                  </td>
                  <td className="px-1.5 py-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={row.closedWonDollars}
                        onChange={(e) => update(i, { closedWonDollars: e.target.value })}
                        placeholder="—"
                        className="cell-input"
                        style={{ paddingLeft: 18 }}
                      />
                    </div>
                  </td>
                  <td className="px-1.5 py-1">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={row.quotaAttainmentPct}
                        onChange={(e) => update(i, { quotaAttainmentPct: e.target.value })}
                        placeholder="—"
                        className="cell-input"
                        style={{ paddingRight: 18 }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-[#3478C0] hover:bg-[#1E5A9C] disabled:opacity-60 text-white font-bold px-7 py-3.5 rounded-full transition"
        >
          {isPending ? "Saving…" : "Save & calculate my score →"}
        </button>
      </div>

      <style jsx>{`
        :global(.cell-input),
        :global(.cell-select) {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid transparent;
          border-radius: 6px;
          font-size: 13px;
          background: transparent;
          color: #111827;
          font-family: inherit;
          transition: border-color .1s ease, background .1s ease, box-shadow .1s ease;
        }
        :global(.cell-input):hover,
        :global(.cell-select):hover {
          border-color: #e5e7eb;
        }
        :global(.cell-input):focus,
        :global(.cell-select):focus {
          outline: none;
          border-color: #3478c0;
          background: white;
          box-shadow: 0 0 0 2px rgba(52, 120, 192, 0.12);
        }
        :global(.cell-select) {
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: right 4px center;
          background-size: 11px;
          padding-right: 20px;
        }
      `}</style>
    </form>
  );
}

function parseIntSafe(s: string): number | null {
  const v = s.trim();
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatSafe(s: string): number | null {
  const v = s.trim();
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
