// Shared helpers for the Birthdays feature — used by both the server actions
// and the client UI so message/format logic lives in one place.

import type { BirthdayGroup } from "@prisma/client";

export type GroupKey = "business" | "personal" | "family";

export const GROUP_KEYS: GroupKey[] = ["business", "personal", "family"];

export const GROUP_LABEL: Record<GroupKey, string> = {
  business: "Business",
  personal: "Personal",
  family: "Family",
};

export function toGroupKey(g: BirthdayGroup): GroupKey {
  return g.toLowerCase() as GroupKey;
}

export function toGroupEnum(k: GroupKey): BirthdayGroup {
  return k.toUpperCase() as BirthdayGroup;
}

export interface BirthdayContactDTO {
  id: string;
  name: string;
  email: string;
  company: string | null;
  birthday: string | null;
  group: GroupKey;
  includeCartoon: boolean;
  photoUrl: string | null;
  cartoonUrl: string | null;
  cardMessage: string | null;
  cartoonStyle: string | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatBirthday(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function birthdayMonth(d: Date | string | null | undefined): number {
  if (!d) return -1;
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return -1;
  return date.getUTCMonth();
}

export function firstName(name: string): string {
  const f = name.trim().split(/\s+/)[0] || name;
  return f.replace(/[^A-Za-z'.-].*$/, "") || f;
}

export function birthdayMessage(group: GroupKey, name: string): string {
  const f = firstName(name);
  if (group === "business") {
    return `Hi ${f}, wishing you a very happy birthday! It's a pleasure working with you — here's to a great year ahead. Warm regards.`;
  }
  if (group === "family") {
    return `Happy birthday, ${f}! Sending you so much love today. Can't wait to celebrate together soon.`;
  }
  return `Happy birthday, ${f}! Hope your day is full of good food, good people, and a little bit of chaos. Celebrate big!`;
}

// =========================================================================
// Scheduling helpers for the daily auto-send job (lib/birthday-dispatch.ts)
// Pure + client-safe (no node-only imports) so the client UI can reuse them.
// =========================================================================

// How many days before a birthday we email the rep to approve. Gives them a
// comfortable window to review/edit before the greeting goes out on the day.
export const APPROVAL_LEAD_DAYS = 3;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// The contact's birthday day-of-month, clamped for Feb 29 in non-leap years.
function clampedDay(month0: number, day: number, year: number): number {
  if (month0 === 1 && day === 29 && !isLeapYear(year)) return 28;
  return day;
}

// UTC-midnight timestamp (ms) of a contact's birthday in a given calendar year.
// Birthdays are stored/displayed in UTC (see formatBirthday), so we stay in UTC.
export function bdayDateForYear(birthday: Date | string, year: number): number {
  const d = typeof birthday === "string" ? new Date(birthday) : birthday;
  const m = d.getUTCMonth();
  const day = clampedDay(m, d.getUTCDate(), year);
  return Date.UTC(year, m, day);
}

export interface TodayYMD {
  year: number;
  month0: number; // 0-11
  day: number;
}

// "Today" as a calendar date in a business time zone (default US Eastern,
// override with BIRTHDAY_TZ). Uses Intl so there's no date-lib dependency.
export function todayInTz(tz: string, now: Date = new Date()): TodayYMD {
  // en-CA renders as YYYY-MM-DD, which is trivial to parse.
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return { year: y, month0: m - 1, day: d };
}

export interface BirthdayOccurrence {
  occYear: number; // calendar year the next birthday falls in
  daysUntil: number; // whole days from today to that birthday (>= 0)
  occDate: Date; // UTC-midnight Date of that birthday
}

// Next upcoming occurrence of a birthday relative to `today` (today counts as 0).
export function birthdayOccurrence(birthday: Date | string, today: TodayYMD): BirthdayOccurrence {
  const todayUTC = Date.UTC(today.year, today.month0, today.day);
  let occYear = today.year;
  let occ = bdayDateForYear(birthday, occYear);
  if (occ < todayUTC) {
    occYear += 1;
    occ = bdayDateForYear(birthday, occYear);
  }
  const daysUntil = Math.round((occ - todayUTC) / 86_400_000);
  return { occYear, daysUntil, occDate: new Date(occ) };
}

// Friendly relative label for the approval email ("today" / "tomorrow" / "in 3 days").
export function relativeDayLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

// =========================================================================
// Cartoon styles (client-safe — labels only; prompts live in lib/cartoon.ts)
// =========================================================================

export type CartoonStyle = "cartoon" | "pixar" | "original" | "watercolor";

export const CARTOON_STYLES: { key: CartoonStyle; label: string }[] = [
  { key: "cartoon", label: "Friendly cartoon" },
  { key: "pixar", label: "Pixar-style 3D" },
  { key: "original", label: "Original photo" },
  { key: "watercolor", label: "Watercolor" },
];

export const DEFAULT_CARTOON_STYLE: CartoonStyle = "cartoon";

// =========================================================================
// Card tones (client-safe — used by the Card Studio writer controls)
// =========================================================================

export type CardTone = "warm" | "funny" | "heartfelt" | "professional";

export const CARD_TONES: { key: CardTone; label: string }[] = [
  { key: "warm", label: "Warm" },
  { key: "funny", label: "Funny" },
  { key: "heartfelt", label: "Heartfelt" },
  { key: "professional", label: "Professional" },
];

export const DEFAULT_CARD_TONE: CardTone = "warm";

// =========================================================================
// Cartoon "scene" — what the picture should be (client-safe labels)
// =========================================================================

export type CartoonScene = "portrait" | "silhouette" | "silhouette-cake" | "custom";

export const CARTOON_SCENES: { key: CartoonScene; label: string }[] = [
  { key: "portrait", label: "Cartoon portrait" },
  { key: "silhouette", label: "Silhouette" },
  { key: "silhouette-cake", label: "Silhouette + cake" },
  { key: "custom", label: "Something else…" },
];

export const DEFAULT_CARTOON_SCENE: CartoonScene = "portrait";
