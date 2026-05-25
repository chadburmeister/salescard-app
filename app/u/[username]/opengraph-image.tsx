// Dynamic Open Graph image for a public SalesCard.
// Renders at /u/[username]/opengraph-image — Next.js App Router picks this up
// automatically as the og:image (and twitter:image) for the matching page.
//
// 1200×630 PNG, generated on-demand the first time the URL is hit, then cached.

import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { tierFor } from "@/lib/tier";

// Use Node runtime so we can hit Prisma. Edge would be faster but Prisma
// doesn't support it without a separate accelerate connection.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SalesCard — verified sales record";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function Image({ params }: Props) {
  const { username } = await params;

  const card = await db.card.findUnique({
    where: { username },
    include: { user: true },
  });

  // Card not found or private → return a generic SalesCard branded image so
  // links don't 500 on the social crawler.
  if (!card || card.visibility === "PRIVATE") {
    return new ImageResponse(GenericFallback(), { ...size });
  }

  const name = card.user.name || card.user.email.split("@")[0];
  const role = roleLabel(card.user.role ?? "AE");
  const score = card.score ?? 0;
  const tier = tierFor(score);
  const tierBg = `#${tier.color}`;
  const tierText = tier.textColorOn === "DARK" ? "#0F0F0F" : "#FFFFFF";
  const scoreFontSize = score >= 100 ? 240 : 320;

  // Tier names are longer than the old labels (e.g. "Pipeline Builder"), so
  // size them dynamically.
  const tierName = tier.name.toUpperCase();
  const tierFontSize =
    tierName.length > 15 ? 26 :
    tierName.length > 12 ? 30 :
                            34;
  const tierLetterSpacing = tierName.length > 15 ? 4 : 6;

  // Approved verifier count for the badge.
  const verifierCount = await db.verificationRequest.count({
    where: { cardId: card.id, status: "APPROVED" },
  }).catch(() => 0);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          backgroundColor: "#FFFFFF",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* ============ LEFT: tier color block with score ============ */}
        <div
          style={{
            width: 520,
            height: "100%",
            background: tierBg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            position: "relative",
          }}
        >
          {/* Top stripe */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 14,
              background: "rgba(0,0,0,0.20)",
            }}
          />
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: tierText,
              letterSpacing: 6,
              opacity: 0.75,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            SalesCard Score
          </div>
          <div
            style={{
              fontSize: scoreFontSize,
              fontWeight: 900,
              color: tierText,
              lineHeight: 1,
              letterSpacing: -8,
            }}
          >
            {score}
          </div>
          <div
            style={{
              fontSize: tierFontSize,
              fontWeight: 900,
              color: tierText,
              letterSpacing: tierLetterSpacing,
              marginTop: 16,
              textTransform: "uppercase",
              textAlign: "center",
              maxWidth: 460,
            }}
          >
            {tierName}
          </div>
        </div>

        {/* ============ RIGHT: details ============ */}
        <div
          style={{
            flex: 1,
            height: "100%",
            padding: "54px 64px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Logo + verified badge row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, display: "flex" }}>
              <span style={{ color: "#0A66C2" }}>Sales</span>
              <span style={{ color: "#10B981" }}>Card</span>
            </div>
            {verifierCount > 0 ? (
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#10B981",
                  border: "2px solid #10B981",
                  borderRadius: 999,
                  padding: "7px 16px",
                  letterSpacing: 2,
                  display: "flex",
                }}
              >
                ✓ VERIFIED · {verifierCount}
              </div>
            ) : null}
          </div>

          {/* Name + role */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 76,
                fontWeight: 900,
                color: "#0F0F0F",
                lineHeight: 1.02,
                letterSpacing: -2.5,
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: "#6B7280",
                marginTop: 14,
              }}
            >
              {role}
            </div>
          </div>

          {/* Footer URL */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#9CA3AF",
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            <span style={{ display: "flex" }}>app.salescard.ai/u/{username}</span>
            <span style={{ display: "flex", fontWeight: 700, color: "#0A66C2" }}>
              The verified sales record →
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function GenericFallback() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: "linear-gradient(135deg, #0A66C2 0%, #10B981 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        color: "white",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ fontSize: 140, fontWeight: 900, letterSpacing: -5, display: "flex" }}>
        SalesCard
      </div>
      <div style={{ fontSize: 34, marginTop: 24, opacity: 0.9, display: "flex" }}>
        The verified sales record.
      </div>
    </div>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "AE":
      return "Account Executive";
    case "BDR":
      return "BDR";
    case "SDR":
      return "SDR";
    case "SDR_BDR_LEADER":
      return "SDR/BDR Leader";
    default:
      return "Sales Rep";
  }
}
