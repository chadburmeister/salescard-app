// Period descriptors for the KPI form.
//
// Returns CY24 (annual rollup of calendar year 2024) plus each completed
// quarter from Q1 25 onward. "Completed" = today's date is past the end of
// the quarter (Q1 → Mar 31, Q2 → Jun 30, Q3 → Sep 30, Q4 → Dec 31).
//
// New quarters auto-appear as time advances. Q226 will show up starting
// July 1, 2026.

export interface QuarterDescriptor {
  period: string;        // "CY24" | "Q125" | "Q126" etc.
  fiscalYear: number;
  fiscalQuarter: number; // 0 = annual rollup, 1-4 = quarters
}

export function currentPeriods(): QuarterDescriptor[] {
  const today = new Date();
  const periods: QuarterDescriptor[] = [
    { period: "CY24", fiscalYear: 2024, fiscalQuarter: 0 },
  ];

  for (let year = 2025; year <= today.getFullYear() + 1; year++) {
    for (let q = 1; q <= 4; q++) {
      // End-of-quarter date: day 0 of (q*3 + 1) === last day of month q*3
      const endOfQuarter = new Date(year, q * 3, 0);
      if (today > endOfQuarter) {
        periods.push({
          period: `Q${q}${String(year).slice(2)}`,
          fiscalYear: year,
          fiscalQuarter: q,
        });
      }
    }
  }

  return periods;
}

// Kept for backwards-compat with existing imports — same data, new name above.
export function trailingEightQuarters(): QuarterDescriptor[] {
  return currentPeriods();
}
