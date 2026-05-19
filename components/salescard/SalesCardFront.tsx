"use client";

import { tierFor } from "@/lib/tier";
import { resolveCardBackground } from "@/lib/cardThemes";

export interface SalesCardFrontProps {
  name: string;
  role: string;
  score: number;
  linkedinHandle?: string;
  photoUrl?: string;
  themeId?: string | null;
  subGrades?: { PIPELINE: number; WIN_RATE: number; QUOTA: number; TENURE: number };
  certNo?: string;
  className?: string;
}

export function SalesCardFront({
  name,
  role,
  score,
  linkedinHandle,
  photoUrl,
  themeId,
  subGrades = { PIPELINE: 9.4, WIN_RATE: 9.0, QUOTA: 9.6, TENURE: 8.8 },
  certNo,
  className,
}: SalesCardFrontProps) {
  const tier = tierFor(score);
  const tierColor = `#${tier.color}`;
  const tierTextOnBar = tier.textColorOn === "DARK" ? "#0F0F0F" : "#FFFFFF";
  const cert = certNo ?? `00${String(score).padStart(2, "0")}9201`;
  const handle = (linkedinHandle ?? slug(name)).replace(/^@/, "");
  const linkedinUrl = `https://www.linkedin.com/in/${handle}`;
  const clipId = `photoClip-${handle}`;
  const bgImageId = `bgImage-${handle}`;

  const { theme, customImageUrl } = resolveCardBackground(themeId);
  const photoZoneBg = theme?.photoBg ?? "#F5F7FB";
  const photoZoneAccent = theme?.accent ?? tierColor;

  return (
    <svg
      className={className}
      viewBox="0 0 460 640"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`SalesCard for ${name}, ${tier.name} ${score}`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="230" cy="365" r="104" />
        </clipPath>
        {customImageUrl ? (
          <pattern id={bgImageId} patternUnits="userSpaceOnUse" x="30" y="220" width="400" height="290">
            <image href={customImageUrl} x="0" y="0" width="400" height="290" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        ) : null}
      </defs>

      <rect x="0" y="0" width="460" height="640" rx="18" fill="#DDDCD3" stroke="#B8B6AC" strokeWidth="2" />
      <rect x="14" y="14" width="432" height="612" rx="6" fill="#FFFFFF" stroke="#D0D0D0" strokeWidth="0.5" />
      <rect x="14" y="14" width="432" height="9" fill={tierColor} />
      <rect x="14" y="23" width="432" height="124" fill="#0F0F0F" />

      <text x="30" y="44" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fontWeight="700" fill="#F5B739" letterSpacing="0.5">
        2024 SALESCARD VERIFIED · SERIES 1
      </text>
      <text x="30" y="66" fontFamily="Inter, system-ui, sans-serif" fontSize="15" fontWeight="900" fill="#FFFFFF">
        #SC {name.toUpperCase()}
      </text>

      <g fontFamily="Inter, system-ui, sans-serif" fontSize="11" fontWeight="700">
        <text x="30" y="90" fill="#B8B8B8" letterSpacing="0.4">PIPELINE</text>
        <text x="116" y="90" fill="#FFFFFF">{subGrades.PIPELINE.toFixed(1)}</text>
        <text x="150" y="90" fill="#B8B8B8" letterSpacing="0.4">WIN RATE</text>
        <text x="232" y="90" fill="#FFFFFF">{subGrades.WIN_RATE.toFixed(1)}</text>
        <text x="30" y="112" fill="#B8B8B8" letterSpacing="0.4">QUOTA</text>
        <text x="116" y="112" fill="#FFFFFF">{subGrades.QUOTA.toFixed(1)}</text>
        <text x="150" y="112" fill="#B8B8B8" letterSpacing="0.4">TENURE</text>
        <text x="232" y="112" fill="#FFFFFF">{subGrades.TENURE.toFixed(1)}</text>
      </g>
      <text x="30" y="136" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#888888">
        {cert}
      </text>

      <rect x="285" y="34" width="78" height="102" fill={tierColor} />
      <text x="324" y="84" fontFamily="Inter, system-ui, sans-serif" fontSize="38" fontWeight="900" fill={tierTextOnBar} textAnchor="middle">
        {score}
      </text>
      <text x="324" y="116" fontFamily="Inter, system-ui, sans-serif" fontSize="9" fontWeight="900" fill={tierTextOnBar} textAnchor="middle" textLength="68" lengthAdjust="spacingAndGlyphs">
        {tier.name.toUpperCase()}
      </text>

      <rect x="370" y="34" width="60" height="102" fill="#F5B739" />
      <text x="400" y="58" fontFamily="Inter, system-ui, sans-serif" fontSize="9" fontWeight="900" fill="#0F0F0F" textAnchor="middle" letterSpacing="0.6">
        VERIFIED
      </text>
      <text x="400" y="104" fontFamily="Inter, system-ui, sans-serif" fontSize="32" fontWeight="900" fill="#0F0F0F" textAnchor="middle">
        10
      </text>
      <text x="400" y="126" fontFamily="Inter, system-ui, sans-serif" fontSize="7" fontWeight="900" fill="#0F0F0F" textAnchor="middle" letterSpacing="0.4">
        GRADE
      </text>

      <text x="30" y="184" fontFamily="Inter, system-ui, sans-serif" fontSize="22" fontWeight="900">
        <tspan fill="#3478C0">Sales</tspan>
        <tspan fill={tierColor}>Card</tspan>
      </text>
      <text x="30" y="204" fontFamily="Inter, system-ui, sans-serif" fontSize="10" fontWeight="800" fill="#6B7280" letterSpacing="1.5">
        CHROME · VERIFIED
      </text>

      <rect x="30" y="220" width="400" height="290" fill={customImageUrl ? `url(#${bgImageId})` : photoZoneBg} />
      {!customImageUrl ? (
        <>
          <rect x="30" y="220" width="400" height="3" fill={photoZoneAccent} opacity="0.35" />
          <rect x="30" y="507" width="400" height="3" fill={photoZoneAccent} opacity="0.35" />
        </>
      ) : null}

      <circle cx="230" cy="365" r="112" fill={tierColor} />
      <circle cx="230" cy="365" r="106" fill="#FFFFFF" />

      {photoUrl ? (
        <image
          href={photoUrl}
          x="125"
          y="260"
          width="210"
          height="210"
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <>
          <circle cx="230" cy="365" r="104" fill="#E5E7EB" />
          <circle cx="230" cy="338" r="32" fill="#9CA3AF" />
          <path d="M 162 460 C 162 412, 196 388, 230 388 C 264 388, 298 412, 298 460 Z" fill="#9CA3AF" />
        </>
      )}

      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
        <g transform="translate(30, 522)">
          <rect width="20" height="20" rx="3" fill="#0A66C2" />
          <text x="10" y="14" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fontWeight="900" fill="white" textAnchor="middle">
            in
          </text>
        </g>
        <text x="60" y="538" fontFamily="Inter, system-ui, sans-serif" fontSize="14" fontWeight="600" fill="#1F2937" fontStyle="italic" style={{ textDecoration: "underline" }}>
          linkedin.com/in/{handle}
        </text>
      </a>

      <rect x="14" y="566" width="432" height="60" fill="#0F0F0F" />
      <rect x="14" y="566" width="432" height="6" fill={tierColor} />
      <text x="230" y="600" fontFamily="Inter, system-ui, sans-serif" fontSize="22" fontWeight="900" fill="#FFFFFF" textAnchor="middle">
        {name.toUpperCase()}
      </text>
      <text x="230" y="618" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fontWeight="900" fill="#F5B739" textAnchor="middle" letterSpacing="2">
        {role.toUpperCase()}
      </text>
    </svg>
  );
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
