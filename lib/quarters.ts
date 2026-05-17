/**
 * Quarter period helpers.
 * Periods are stored as "Q3 24" style strings.
 * We always think in terms of the trailing 8 quarters.
 */

export interface QuarterRef {
  period: string;       // "Q3 24"
  fiscalYear: number;   // 2024
  fiscalQuarter: number;// 1-4
}

/** Get the calendar quarter (1-4) and year (e.g. 2026) for a given date. */
export function currentQuarter(date = new Date()): QuarterRef {
  const m = date.getUTCMonth(); // 0-11
  const q = Math.floor(m / 3) + 1;
  const fullYear = date.getUTCFullYear();
  return {
    period: `Q${q} ${String(fullYear).slice(-2)}`,
    fiscalYear: fullYear,
    fiscalQuarter: q,
  };
}

/** Returns the previous quarter relative to a given QuarterRef. */
export function prevQuarter(ref: QuarterRef): QuarterRef {
  let q = ref.fiscalQuarter - 1;
  let y = ref.fiscalYear;
  if (q < 1) {
    q = 4;
    y -= 1;
  }
  return {
    period: `Q${q} ${String(y).slice(-2)}`,
    fiscalYear: y,
    fiscalQuarter: q,
  };
}

/** Returns the trailing 8 quarters (oldest → newest), ending at the quarter *before* `now`
 * (since you can't have stats for the current quarter that hasn't ended yet). */
export function trailingEightQuarters(now = new Date()): QuarterRef[] {
  // step back from current to most-recent-completed
  let cur = prevQuarter(currentQuarter(now));
  const out: QuarterRef[] = [];
  for (let i = 0; i < 8; i++) {
    out.push(cur);
    cur = prevQuarter(cur);
  }
  return out.reverse(); // oldest first
}

/** Parse a period string back into a QuarterRef. */
export function parsePeriod(period: string): QuarterRef | null {
  const m = period.match(/^Q(\d)\s+(\d{2})$/);
  if (!m) return null;
  const q = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  // assume 2000+ for 00-89, 1900+ for 90-99 (good enough for the next 65 years)
  const fy = yy < 90 ? 2000 + yy : 1900 + yy;
  return { period, fiscalYear: fy, fiscalQuarter: q };
}
