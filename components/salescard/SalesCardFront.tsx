import { tierFor } from "@/lib/tier";

export interface SalesCardFrontProps {
  name: string;
  role: string;
  score: number;
  linkedinHandle?: string;
  photoUrl?: string;
  themeId?: string | null;
  subGrades?: { PIPELINE: number; WIN_RATE: number; QUOTA: number; TENURE: number };
  certNo?: string;
  openToRoles?: boolean;
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "S";
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function Tick({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function SalesCardFront({
  name,
  role,
  score,
  linkedinHandle,
  photoUrl,
  subGrades = { PIPELINE: 9.4, WIN_RATE: 9.0, QUOTA: 9.6, TENURE: 8.8 },
  openToRoles = false,
  className,
}: SalesCardFrontProps) {
  const tier = tierFor(score);
  const initials = initialsOf(name);
  const handle = (linkedinHandle ?? slug(name)).replace(/^@/, "");
  const grades = [
    { label: "Pipeline", value: subGrades.PIPELINE },
    { label: "Win rate", value: subGrades.WIN_RATE },
    { label: "Quota", value: subGrades.QUOTA },
    { label: "Tenure", value: subGrades.TENURE },
  ];

  return (
    <div className={`bg-white border border-[#E2E2E2] rounded-xl overflow-hidden flex flex-col min-h-[500px] text-[#1B1F23] ${className ?? ""}`}>
      <div className="relative h-20 bg-[#0A66C2]">
        <span className="absolute top-2.5 right-4 text-white text-[13px] font-semibold">SalesCard</span>
      </div>
      <div className="px-[18px] pb-[18px]">
        <div className="relative w-[90px] h-[90px] -mt-[46px]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={name} className="w-[90px] h-[90px] rounded-full object-cover border-[3px] border-white" />
          ) : (
            <div className="w-[90px] h-[90px] rounded-full bg-[#E8F0FE] border-[3px] border-white flex items-center justify-center text-[28px] font-semibold text-[#0A66C2]">
              {initials}
            </div>
          )}
          <div className="absolute right-0 bottom-1 w-[25px] h-[25px] rounded-full bg-[#0A66C2] border-2 border-white flex items-center justify-center text-white">
            <Tick size={14} />
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-[21px] font-semibold leading-tight">{name}</span>
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#0A66C2] text-white shrink-0">
            <Tick size={11} />
          </span>
        </div>
        <div className="text-sm mt-0.5">{role}</div>
        <div className="text-[13px] text-[#666666] mt-0.5">Verified sales record</div>

        {openToRoles ? (
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#057642] bg-[#EAF5EE] border border-[#BFE0CC] px-2.5 py-1 rounded-full">
              <span className="w-[7px] h-[7px] rounded-full bg-[#057642]" />
              Open to roles
            </span>
          </div>
        ) : null}

        <div className="border-t border-[#E2E2E2] -mx-[18px] mt-[15px]" />

        <div className="flex items-center justify-between py-[13px]">
          <div>
            <div className="text-xs text-[#666666] font-semibold">SalesCard Score</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[38px] font-semibold leading-none">{score}</span>
              <span className="text-[15px] text-[#666666]">/ 100</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#915907] bg-[#FBF3E3] border border-[#EBD9B5] px-3 py-[5px] rounded-full">
            {tier.name}
          </span>
        </div>

        <div className="grid grid-cols-4 border-y border-[#E2E2E2]">
          {grades.map((g, i) => (
            <div key={g.label} className={`text-center py-[11px] ${i < 3 ? "border-r border-[#EEEEEE]" : ""}`}>
              <div className="text-[17px] font-semibold">{g.value.toFixed(1)}</div>
              <div className="text-[11px] text-[#666666]">{g.label}</div>
            </div>
          ))}
        </div>

        <div className="text-[12px] text-[#666666] pt-3">linkedin.com/in/{handle}</div>
      </div>
    </div>
  );
}
