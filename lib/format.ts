/** Compact $ formatter: $580K, $1.6M, $11.8M */
export function fmtMoney(cents: number | bigint | null | undefined): string {
  if (cents == null) return "—";
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

/** Percentage formatter: 138% */
export function fmtPct(pct: number | null | undefined, digits = 0): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  return `${pct.toFixed(digits)}%`;
}

/** Integer formatter with commas: 1,234 */
export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US");
}

/** Tiny string formatter: "0" or "4" or "—". */
export function fmtCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "—";
  return String(n);
}
