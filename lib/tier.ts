/**
 * Tier color + label by SalesCard score.
 *   95-100 → Gold "PRISTINE"
 *   90-94  → Green "ELITE"
 *   80-89  → Blue "PRO"
 *   <80    → Red "DEV"
 */

export type Tier = "PRISTINE" | "ELITE" | "PRO" | "DEV";

export interface TierMeta {
  label: Tier;
  color: string;       // hex without #
  textColorOn: "DARK" | "LIGHT"; // foreground color choice on tier panel
}

export function tierFor(score: number | null | undefined): TierMeta {
  const s = score ?? 0;
  if (s >= 95) return { label: "PRISTINE", color: "F5B739", textColorOn: "DARK" };
  if (s >= 90) return { label: "ELITE",    color: "10B981", textColorOn: "DARK" };
  if (s >= 80) return { label: "PRO",      color: "3B82F6", textColorOn: "LIGHT" };
  return            { label: "DEV",        color: "EF4444", textColorOn: "LIGHT" };
}
