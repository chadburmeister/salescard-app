// Background theme presets for the SalesCard front.
// The value stored in Card.cardBackground is either a theme key (e.g. "navy")
// or a public URL pointing at a custom-uploaded image.

export interface CardTheme {
  key: string;
  name: string;
  bgFill: string;
  bgGradient?: { from: string; to: string };
  accentLine: string;
  silhouetteBg: string;
  silhouetteFg: string;
  swatch: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    key: "classic",
    name: "Classic",
    bgFill: "#F5F7FB",
    accentLine: "#10B981",
    silhouetteBg: "#E5E7EB",
    silhouetteFg: "#9CA3AF",
    swatch: "#F5F7FB",
  },
  {
    key: "cream",
    name: "Cream",
    bgFill: "#FAF5EA",
    accentLine: "#C98E18",
    silhouetteBg: "#EAE0CB",
    silhouetteFg: "#8B7355",
    swatch: "#FAF5EA",
  },
  {
    key: "navy",
    name: "Navy",
    bgFill: "#0B1B2E",
    accentLine: "#F5B739",
    silhouetteBg: "#1E3A5F",
    silhouetteFg: "#A0B4CC",
    swatch: "#0B1B2E",
  },
  {
    key: "forest",
    name: "Forest",
    bgFill: "#0E2B25",
    accentLine: "#10B981",
    silhouetteBg: "#1F4A40",
    silhouetteFg: "#A8D4C8",
    swatch: "#0E2B25",
  },
  {
    key: "sunset",
    name: "Sunset",
    bgFill: "#FF6B35",
    bgGradient: { from: "#FF6B35", to: "#F7931E" },
    accentLine: "#FFFFFF",
    silhouetteBg: "#FFFFFF",
    silhouetteFg: "#FF6B35",
    swatch: "#FF6B35",
  },
  {
    key: "midnight",
    name: "Midnight",
    bgFill: "#1A1A1A",
    accentLine: "#3478C0",
    silhouetteBg: "#2A2A2A",
    silhouetteFg: "#6B7280",
    swatch: "#1A1A1A",
  },
];

export type ResolvedBackground =
  | { kind: "theme"; theme: CardTheme }
  | { kind: "image"; url: string; theme: CardTheme };

export function resolveCardBackground(value: string | null | undefined): ResolvedBackground {
  if (!value) return { kind: "theme", theme: CARD_THEMES[0] };
  if (/^https?:\/\//.test(value)) {
    return { kind: "image", url: value, theme: CARD_THEMES[0] };
  }
  const theme = CARD_THEMES.find(t => t.key === value);
  if (theme) return { kind: "theme", theme };
  return { kind: "theme", theme: CARD_THEMES[0] };
}
