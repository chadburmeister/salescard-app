// Card background themes — the photo-zone fill on the front of the card.
//
// Card.cardBackground stores either:
//   - a theme id like "midnight"
//   - or a full custom image URL (https://...)

export interface CardBackgroundTheme {
  id: string;
  name: string;
  description: string;
  /** Photo-zone background color (hex with # prefix). */
  photoBg: string;
  /** Optional accent color used for decorative stripes. */
  accent?: string;
  /** Whether dark or light text reads well on top of photoBg. */
  textOnBg: "DARK" | "LIGHT";
}

export const CARD_BACKGROUND_THEMES: CardBackgroundTheme[] = [
  {
    id: "stadium",
    name: "Stadium",
    description: "Classic, clean white-on-cream.",
    photoBg: "#F5F7FB",
    accent: "#3478C0",
    textOnBg: "DARK",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep navy with steel accents.",
    photoBg: "#0F1B2E",
    accent: "#5294E0",
    textOnBg: "LIGHT",
  },
  {
    id: "champion",
    name: "Champion",
    description: "Gold leaf for top performers.",
    photoBg: "#FFF7DC",
    accent: "#F5B739",
    textOnBg: "DARK",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep green, grounded.",
    photoBg: "#0E2B25",
    accent: "#10B981",
    textOnBg: "LIGHT",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange-pink fade.",
    photoBg: "#FFE5D1",
    accent: "#FF6B35",
    textOnBg: "DARK",
  },
  {
    id: "frost",
    name: "Frost",
    description: "Icy blue-silver palette.",
    photoBg: "#E8F0F5",
    accent: "#3478C0",
    textOnBg: "DARK",
  },
];

export const DEFAULT_CARD_BACKGROUND = CARD_BACKGROUND_THEMES[0];

export interface ResolvedCardBackground {
  theme: CardBackgroundTheme | null;
  customImageUrl: string | null;
}

export function resolveCardBackground(
  value: string | null | undefined
): ResolvedCardBackground {
  if (!value) return { theme: DEFAULT_CARD_BACKGROUND, customImageUrl: null };
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return { theme: null, customImageUrl: value };
  }
  const theme =
    CARD_BACKGROUND_THEMES.find((t) => t.id === value) ?? DEFAULT_CARD_BACKGROUND;
  return { theme, customImageUrl: null };
}
