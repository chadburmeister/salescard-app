"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SalesRole } from "@prisma/client";
import { saveKpis } from "./actions";

// ===========================================================================
// KpiForm — 8 quarters of inputs with the new column set.
// Columns (one card per quarter):
//   Target · Conversations · Meetings · Pipe Opps · Pipe $ · Closed/Won $ · % of Quota
// AGT and AGT $ are gone.
// ===========================================================================

const TARGET_OPTIONS = ["SMB", "Mid-Market", "Enterprise", "PubSec", "Other"] as const;
const RANGE_OPTIONS  = ["<50", "50-100", "100-250", "250+"] as const;

type TargetOpt = (typeof TARGET_OPTIONS)[number] | "";
type RangeOpt  = (typeof RANGE_OPTIONS)[number]  | "";

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
  pipeOpps:           string;  // numeric string for controlled input
  pipelineDollars:    string;
  closedWonDollars:   string;
  quotaAttainmentPct: string;
}

interface Props {
  quarters: QuarterDescriptor[];
  initialRole: SalesRole;
  /** Optional pre-populated values for editing an existing card. */
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
      {/* Role selector */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="text-xs font-black tracking-widest text-[#3478C0] uppercase mb-3">Your role</div>
        <div className="flex flex-wrap gap-2">
          {(["AE", "BDR", "SDR"] as SalesRole[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm transition border ${
                role === r
                  ? "bg-[#3478C0] text-white border-[#3478C0]"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Quarter rows */}
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={row.period} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0F0F0F] text-[#F5B739] flex items-center justify-center font-black text-sm">
                  {row.fiscalQuarter}
                </div>
                <div>
                  <div className="text-lg font-black tracking-tight">{row.period}</div>
                  <div className="text-xs text-gray-500">Quarter {i + 1} of {rows.length}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Leave blank if you don&apos;t have the number.</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Target segment">
                <select
                  value={row.targetSegment}
                  onChange={e => update(i, { targetSegment: e.target.value as TargetOpt })}
                  className="form-select"
                >
                  <option value="">—</option>
                  {TARGET_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <Field label="Conversations / qtr">
                <select
                  value={row.conversationsRange}
                  onChange={e => update(i, { conversationsRange: e.target.value as RangeOpt })}
                  className="form-select"
                >
                  <option value="">—</option>
                  {RANGE_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <Field label="Meetings / qtr">
                <select
                  value={row.meetingsRange}
                  onChange={e => update(i, { meetingsRange: e.target.value as RangeOpt })}
                  className="form-select"
                >
                  <option value="">—</option>
                  {RANGE_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <Field label="Pipe opps">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={row.pipeOpps}
                  onChange={e => update(i, { pipeOpps: e.target.value })}
                  placeholder="0"
                  className="form-input"
                />
              </Field>

              <Field label="Pipe $">
                <CurrencyInput
                  value={row.pipelineDollars}
                  onChange={(v) => update(i, { pipelineDollars: v })}
                />
              </Field>

              <Field label="Closed/Won $">
                <CurrencyInput
                  value={row.closedWonDollars}
                  onChange={(v) => update(i, { closedWonDollars: v })}
                />
              </Field>

              <Field label="% of Quota">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="numeric"
                    value={row.quotaAttainmentPct}
                    onChange={e => update(i, { quotaAttainmentPct: e.target.value })}
                    placeholder="100"
                    className="form-input pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
              </Field>
            </div>
          </div>
        ))}
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
        :global(.form-input),
        :global(.form-select) {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          background: white;
          color: #111827;
          transition: border-color .12s ease;
          font-family: inherit;
        }
        :global(.form-input):focus,
        :global(.form-select):focus {
          outline: none;
          border-color: #3478c0;
        }
        :global(.form-select) {
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 14px;
          padding-right: 32px;
        }
      `}</style>
    </form>
  );
}

// ---------- helpers ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-black tracking-widest text-gray-500 uppercase mb-1.5">
        {label}
      </div>
      {children}
    </label>
  );
}

function CurrencyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">$</span>
      <input
        type="number"
        min={0}
        step="1"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="form-input"
        style={{ paddingLeft: "28px" }}
      />
    </div>
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
