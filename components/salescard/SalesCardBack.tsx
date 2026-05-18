"use client";

import { tierFor } from "@/lib/tier";

export interface QuarterRow {
  period: string;       // "Q3 24"
  closedWon: string;    // formatted "$580K"
  quota: string;        // formatted "88%"
  winRate: string;      // formatted "24%"
  pipeline: string;     // formatted "$1.6M"
  avgDeal: string;      // formatted "$72K"
  agents: string;       // formatted "0"
  agentPipe: string;    // formatted "—" or "$50K"
}

export interface SalesCardBackProps {
  name: string;
  role: string;
  score: number;
  company?: string;
  region?: string;
  segment?: string;
  startedQuarter?: string; // e.g. "Q3 24"
  verifiedCount?: number;  // e.g. 8
  totalCount?: number;     // e.g. 8
  quarters: QuarterRow[];  // expects exactly 8
  totals: QuarterRow;      // aggregated row
  scoutReport?: string;
  percentileText?: string; // e.g. "TOP 8% AE"
  className?: string;
}

/** SalesCard back-of-card: Topps-style 8-quarter table + scout report. */
export function SalesCardBack({
  name,
  role,
  score,
  company = "ACME CORP",
  region = "WEST",
  segment = "ENTERPRISE",
  startedQuarter = "Q3 24",
  verifiedCount = 8,
  totalCount = 8,
  quarters,
  totals,
  scoutReport,
  percentileText = "TOP 8% AE",
  className,
}: SalesCardBackProps) {
  const tier = tierFor(score);
  const tierColor = `#${tier.color}`;
  const tierTextOnBar = tier.textColorOn === "DARK" ? "#0F0F0F" : "#FFFFFF";

  // table layout (SVG-coordinate system, viewBox 460×640)
  const tblX = 20;
  const tblY = 156;
  const tblW = 420;
  const rowH = 26;
  // 8 columns with weighted widths
  const colRatios = [0.115, 0.130, 0.110, 0.085, 0.135, 0.120, 0.080, 0.225];
  const colW = colRatios.map(r => r * tblW);
  const colX: number[] = [];
  {
    let acc = tblX;
    for (const w of colW) { colX.push(acc); acc += w; }
  }
  const headers = ["Q", "WON $", "QUOTA", "WIN", "PIPE $", "DEAL $", "AGT", "AGT $"];

  const txt = (s: string) => (s == null || s === "" ? "—" : s);

  return (
    <svg
      className={className}
      viewBox="0 0 460 640"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`SalesCard back for ${name}, 8-quarter record`}
    >
      {/* slab */}
      <rect x="0" y="0" width="460" height="640" rx="18" fill="#DDDCD3" stroke="#B8B6AC" strokeWidth="2" />
      {/* body */}
      <rect x="14" y="14" width="432" height="612" rx="6" fill="#FFFFFF" stroke="#D0D0D0" strokeWidth="0.5" />
      {/* tier stripe */}
      <rect x="14" y="14" width="432" height="9" fill={tierColor} />
      {/* navy header */}
      <rect x="14" y="23" width="432" height="55" fill="#0A1F44" />
      {/* card # badge */}
      <rect x="24" y="34" width="62" height="36" fill="#F5B739" />
      <text x="55" y="59" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="900" fill="#06122B" textAnchor="middle">
        #{score}
      </text>
      <text x="100" y="58" fontFamily="Inter, system-ui, sans-serif" fontSize="17" fontWeight="900" fill="#FFFFFF">
        {name.toUpperCase()}
      </text>

      {/* bio row */}
      <rect x="14" y="78" width="432" height="34" fill="#F8F5EE" />
      <text x="30" y="100" fontFamily="Inter, system-ui, sans-serif" fontSize="8" fontWeight="900" fill="#0A1F44" letterSpacing="1">
        {role.toUpperCase()} · {company} · {segment} · {region}
      </text>
      <text x="430" y="100" fontFamily="Inter, system-ui, sans-serif" fontSize="8" fontWeight="900" fill="#0A1F44" letterSpacing="1" textAnchor="end">
        STARTED {startedQuarter} · {verifiedCount}/{totalCount} VERIFIED
      </text>

      {/* section header */}
      <rect x="14" y="112" width="432" height="30" fill="#0F0F0F" />
      <text x="30" y="132" fontFamily="Inter, system-ui, sans-serif" fontSize="10" fontWeight="900" fill="#F5B739" letterSpacing="1.5">
        VERIFIED 8-QUARTER RECORD
      </text>
      <text x="430" y="132" fontFamily="Inter, system-ui, sans-serif" fontSize="8" fontWeight="900" fill={tierColor} letterSpacing="1" fontStyle="italic" textAnchor="end">
        LEAGUE LEADER
      </text>

      {/* table header row */}
      <rect x={tblX} y={tblY - 22} width={tblW} height={22} fill="#0A1F44" />
      {headers.map((h, i) => {
        const isFirst = i === 0;
        const x = colX[i] + (isFirst ? 8 : colW[i] - 8);
        return (
          <text
            key={h}
            x={x}
            y={tblY - 8}
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="8"
            fontWeight="900"
            fill="#F5B739"
            textAnchor={isFirst ? "start" : "end"}
          >
            {h}
          </text>
        );
      })}

      {/* data rows */}
      {quarters.map((q, ri) => {
        const y = tblY + ri * rowH;
        const fillBg = ri % 2 === 0 ? "#FFFFFF" : "#F4F1E8";
        const vals = [q.period, q.closedWon, q.quota, q.winRate, q.pipeline, q.avgDeal, q.agents, q.agentPipe];
        return (
          <g key={q.period + ri}>
            <rect x={tblX} y={y} width={tblW} height={rowH} fill={fillBg} stroke="#E5E5E5" strokeWidth="0.5" />
            {vals.map((v, ci) => {
              const isFirst = ci === 0;
              const x = colX[ci] + (isFirst ? 8 : colW[ci] - 8);
              return (
                <text
                  key={ci}
                  x={x}
                  y={y + rowH / 2 + 3}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontSize="9.5"
                  fontWeight={isFirst ? "700" : "500"}
                  fill="#111827"
                  textAnchor={isFirst ? "start" : "end"}
                >
                  {txt(v)}
                </text>
              );
            })}
          </g>
        );
      })}

      {/* totals row */}
      {(() => {
        const y = tblY + quarters.length * rowH;
        const totVals = [totals.period, totals.closedWon, totals.quota, totals.winRate, totals.pipeline, totals.avgDeal, totals.agents, totals.agentPipe];
        return (
          <g>
            <rect x={tblX} y={y} width={tblW} height={rowH + 2} fill="#06122B" />
            {totVals.map((v, ci) => {
              const isFirst = ci === 0;
              const x = colX[ci] + (isFirst ? 8 : colW[ci] - 8);
              return (
                <text
                  key={ci}
                  x={x}
                  y={y + rowH / 2 + 3}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontSize="9.5"
                  fontWeight="900"
                  fill={isFirst ? "#FFFFFF" : "#F5B739"}
                  textAnchor={isFirst ? "start" : "end"}
                >
                  {txt(v)}
                </text>
              );
            })}
          </g>
        );
      })()}

      {/* scout report */}
      {scoutReport ? (
        <>
          <rect x="14" y="488" width="432" height="120" fill="#F8F5EE" />
          <rect x="14" y="488" width="8" height="120" fill={tierColor} />
          <text x="32" y="506" fontFamily="Inter, system-ui, sans-serif" fontSize="8" fontWeight="900" fill="#0A1F44" letterSpacing="1.5">
            SCOUT REPORT
          </text>
          <foreignObject x="32" y="512" width="404" height="92">
            <p
              style={{
                margin: 0,
                padding: 0,
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "10px",
                fontStyle: "italic",
                color: "#111827",
                lineHeight: 1.45,
              }}
            >
              {scoutReport}
            </p>
          </foreignObject>
        </>
      ) : null}

      {/* footer */}
      <rect x="14" y="608" width="432" height="18" fill="#06122B" />
      <rect x="14" y="608" width={432 * 0.42} height="18" fill={tierColor} />
      <text x="22" y="621" fontFamily="Inter, system-ui, sans-serif" fontSize="9" fontWeight="900" fill={tierTextOnBar} letterSpacing="1.5">
        SALESCARD SCORE
      </text>
      <text x="438" y="621" fontFamily="Inter, system-ui, sans-serif" fontSize="9" fontWeight="900" fill="#F5B739" textAnchor="end">
        {score} · {tier.label} · {percentileText}
      </text>
    </svg>
  );
}
