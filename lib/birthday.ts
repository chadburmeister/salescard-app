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

export const DEFAULT_GIFT_LABEL = "$25 Amazon gift card";

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
  includeGift: boolean;
  includeCartoon: boolean;
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
