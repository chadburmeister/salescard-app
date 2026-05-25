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

function Tick({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function SalesCardBack({
  name,
  role,
  company,
  verifiedCount,
  totalCount,
  quarters,
  totals,
  scoutReport,
  percentileText,
}: Props) {
  const companyLine = company && company !== "—" ? ` · ${company}` : "";
  return (
    <div className="bg-white border border-[#E2E2E2] rounded-xl overflow-hidden flex flex-col min-h-[500px] text-[#1B1F23]">
      <div className="h-[50px] bg-[#0A66C2] flex items-center justify-between px-4">
        <span className="text-white text-[13px] font-semibold">SalesCard</span>
        <span className="text-[#CFE0F5] text-xs">Verified record</span>
      </div>
      <div className="px-[18px] pt-[14px] pb-[18px]">
        <div className="flex items-center gap-1.5">
          <span className="text-[17px] font-semibold">{name}</span>
          <span className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full bg-[#0A66C2] text-white shrink-0">
            <Tick size={10} />
          </span>
        </div>
        <div className="text-[13px] text-[#666666] mt-0.5">{role}{companyLine}</div>
        {percentileText ? (
          <span className="inline-block text-[11px] font-semibold text-[#0A66C2] bg-[#E8F0FE] px-2 py-0.5 rounded mt-2">
            {percentileText}
          </span>
        ) : null}

        <div className="text-xs text-[#666666] font-semibold mt-[14px] mb-1">{totalCount}-quarter verified record</div>
        <table className="w-full border-collapse text-[12.5px]" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr className="text-[#666666] text-[11px]">
              <th className="text-left font-semibold py-1">Quarter</th>
              <th className="text-right font-semibold">Quota</th>
              <th className="text-right font-semibold">Closed-won</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q) => (
              <tr key={q.period} className="border-t border-[#EEEEEE]">
                <td className="py-[5px]">{q.period}</td>
                <td className="text-right">{q.quota}</td>
                <td className="text-right">{q.closedWon}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between text-[13px] font-semibold border-t-2 border-[#1B1F23] mt-0.5 pt-[7px]">
          <span>Total</span>
          <span>{totals.quota} avg · {totals.closedWon}</span>
        </div>

        <div className="flex items-center gap-[7px] text-[12.5px] text-[#666666] pt-3 pb-2.5">
          <span className="text-[#0A66C2]"><Tick size={15} /></span>
          Verified by {verifiedCount} of {totalCount} quarters
        </div>

        {scoutReport ? (
          <div className="bg-[#F3F6F8] border border-[#E2E2E2] rounded-lg px-3 py-[11px]">
            <div className="text-[11px] text-[#666666] font-semibold mb-0.5">Scout report</div>
            <div className="text-[12.5px] leading-[1.5]">{scoutReport}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
