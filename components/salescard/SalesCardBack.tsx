import { tierFor } from "@/lib/tier";

export interface QuarterRow {
  period: string;
  target: string;
  conversations: string;
  meetings: string;
  pipeOpps: string;
  pipeline: string;
  closedWon: string;
  quota: string;
}

interface Props {
  name: string;
  role: string;
  score: number;
  company: string;
  segment: string;
  region: string;
  startedQuarter: string;
  verifiedCount: number;
  totalCount: number;
  quarters: QuarterRow[];
  totals: QuarterRow;
  scoutReport?: string;
  percentileText?: string;
}

export function SalesCardBack({
  name,
  role,
  score,
  company,
  segment,
  region,
  startedQuarter,
  verifiedCount,
  totalCount,
  quarters,
  totals,
  scoutReport,
  percentileText,
}: Props) {
  const tier = tierFor(score);
  const tierBg = `#${tier.color}`;
  const tierText = tier.textColorOn === "DARK" ? "#0F0F0F" : "#FFFFFF";

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-[#F5F5EE]"
      style={{ fontFeatureSettings: "'tnum' 1" }}
    >
      <div className="relative bg-[#0F0F0F] text-white">
        <div className="h-2" style={{ background: tierBg }} />
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <div className="text-[11px] font-black tracking-[0.25em] text-[#F5B739]">
            VERIFIED · SERIES 1
          </div>
          <div className="font-black text-lg tracking-tight">
            <span style={{ color: "#5294E0" }}>Sales</span>
            <span style={{ color: "#10B981" }}>Card</span>
          </div>
        </div>
      </div>

      <div className="bg-white px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
          <div>
            <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-1">REP</div>
            <div className="font-black text-xl tracking-tight">{name}</div>
            <div className="text-sm text-gray-600 font-semibold">{role}</div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-2xl"
              style={{ background: tierBg, color: tierText }}
            >
              {score}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Tier</div>
              <div className="text-xs font-black uppercase tracking-wider" style={{ color: tierBg }}>
                {tier.name}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Meta label="Company"  value={company} />
          <Meta label="Segment"  value={segment} />
          <Meta label="Region"   value={region} />
          <Meta label="Started"  value={startedQuarter} />
        </div>
      </div>

      <div className="bg-white">
        <table className="w-full text-[11px] tabular-nums table-fixed">
          <colgroup>
            <col style={{ width: "11%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <Th className="text-left">Qtr</Th>
              <Th>Target</Th>
              <Th>Conv</Th>
              <Th>Mtgs</Th>
              <Th>Opps</Th>
              <Th>Pipe $</Th>
              <Th>Won $</Th>
              <Th>Quota</Th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q) => (
              <tr key={q.period} className="border-b border-gray-100 hover:bg-gray-50/60">
                <Td className="text-left font-bold text-gray-900">{q.period}</Td>
                <Td>{q.target}</Td>
                <Td>{q.conversations}</Td>
                <Td>{q.meetings}</Td>
                <Td>{q.pipeOpps}</Td>
                <Td>{q.pipeline}</Td>
                <Td>{q.closedWon}</Td>
                <Td>{q.quota}</Td>
              </tr>
            ))}
            <tr className="bg-gray-900 text-white">
              <Td className="text-left font-black tracking-widest">{totals.period}</Td>
              <Td className="text-gray-400">—</Td>
              <Td className="text-gray-400">—</Td>
              <Td className="text-gray-400">—</Td>
              <Td className="font-bold">{totals.pipeOpps}</Td>
              <Td className="font-bold">{totals.pipeline}</Td>
              <Td className="font-bold">{totals.closedWon}</Td>
              <Td className="font-bold" style={{ color: "#F5B739" }}>{totals.quota}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white px-5 py-3 border-t border-b border-gray-200 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-700 font-bold">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {verifiedCount} of {totalCount} quarters verified
        </div>
        {percentileText ? (
          <div className="font-black tracking-widest text-[#3478C0] text-[11px]">
            {percentileText}
          </div>
        ) : null}
      </div>

      {scoutReport ? (
        <div className="bg-[#F5F5EE] px-5 py-4">
          <div className="text-[10px] font-black tracking-widest text-gray-500 uppercase mb-1.5">
            Scout Report
          </div>
          <p className="text-[13px] leading-relaxed text-gray-800 italic">
            &ldquo;{scoutReport}&rdquo;
          </p>
        </div>
      ) : null}

      <div className="relative bg-[#0F0F0F] text-white">
        <div className="h-1.5" style={{ background: tierBg }} />
        <div className="px-5 py-3 flex items-center justify-between gap-3">
          <div className="text-[10px] tracking-widest font-bold text-gray-400">app.salescard.ai</div>
          <div className="text-[10px] font-black tracking-widest" style={{ color: "#F5B739" }}>
            {tier.name.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-0.5">{label}</div>
      <div className="font-semibold text-gray-900 truncate">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-1.5 py-2 font-black tracking-wider uppercase text-[9px] text-right whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td className={`px-1.5 py-2 text-right whitespace-nowrap ${className}`} style={style}>
      {children}
    </td>
  );
}
