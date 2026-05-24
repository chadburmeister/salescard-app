"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendBirthdayApprovalEmail } from "@/lib/email";
import {
  type GroupKey,
  type BirthdayContactDTO,
  GROUP_LABEL,
  toGroupKey,
  toGroupEnum,
  birthdayMessage,
  formatBirthday,
  DEFAULT_GIFT_LABEL,
} from "@/lib/birthday";
import type { BirthdayContact } from "@prisma/client";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  return session.user.id;
}

function toDTO(c: BirthdayContact): BirthdayContactDTO {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    company: c.company,
    birthday: c.birthday ? c.birthday.toISOString() : null,
    group: toGroupKey(c.group),
    includeGift: c.includeGift,
    includeCartoon: c.includeCartoon,
  };
}

function parseBirthday(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export interface AddContactInput {
  name: string;
  email: string;
  company?: string | null;
  birthday?: string | null;
  group: GroupKey;
}

export async function addBirthdayContact(input: AddContactInput): Promise<BirthdayContactDTO> {
  const userId = await requireUserId();
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name || !email) throw new Error("Name and email are required.");

  const created = await db.birthdayContact.create({
    data: {
      userId,
      name,
      email,
      company: input.company?.trim() || null,
      birthday: parseBirthday(input.birthday),
      group: toGroupEnum(input.group),
    },
  });
  revalidatePath("/dashboard/birthdays");
  return toDTO(created);
}

export interface ImportRow {
  name: string;
  email: string;
  company?: string | null;
  birthday?: string | null;
}

export async function importBirthdayContacts(
  rows: ImportRow[],
  group: GroupKey,
): Promise<BirthdayContactDTO[]> {
  const userId = await requireUserId();
  const g = toGroupEnum(group);

  const clean = rows
    .map((r) => ({
      name: (r.name || "").trim(),
      email: (r.email || "").trim(),
      company: (r.company || "").trim() || null,
      birthday: parseBirthday(r.birthday),
    }))
    .filter((r) => r.name && r.email);

  const created: BirthdayContactDTO[] = [];
  for (const r of clean) {
    const row = await db.birthdayContact.create({
      data: { userId, name: r.name, email: r.email, company: r.company, birthday: r.birthday, group: g },
    });
    created.push(toDTO(row));
  }
  if (created.length) revalidatePath("/dashboard/birthdays");
  return created;
}

export async function removeBirthdayContact(id: string): Promise<void> {
  const userId = await requireUserId();
  await db.birthdayContact.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard/birthdays");
}

export async function updateBirthdayOptions(
  id: string,
  opts: { includeGift?: boolean; includeCartoon?: boolean },
): Promise<void> {
  const userId = await requireUserId();
  await db.birthdayContact.updateMany({
    where: { id, userId },
    data: {
      ...(opts.includeGift !== undefined ? { includeGift: opts.includeGift } : {}),
      ...(opts.includeCartoon !== undefined ? { includeCartoon: opts.includeCartoon } : {}),
    },
  });
  revalidatePath("/dashboard/birthdays");
}

export async function moveBirthdayContact(id: string, group: GroupKey): Promise<void> {
  const userId = await requireUserId();
  await db.birthdayContact.updateMany({
    where: { id, userId },
    data: { group: toGroupEnum(group) },
  });
  revalidatePath("/dashboard/birthdays");
}

export async function sendApprovalDraft(id: string): Promise<{ ok: true; to: string }> {
  const userId = await requireUserId();
  const [user, contact] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.birthdayContact.findFirst({ where: { id, userId } }),
  ]);
  if (!user) throw new Error("User not found.");
  if (!contact) throw new Error("Contact not found.");

  const groupKey = toGroupKey(contact.group);
  await sendBirthdayApprovalEmail({
    repEmail: user.email,
    repName: user.name ?? user.email,
    contactName: contact.name,
    contactEmail: contact.email,
    birthdayLabel: formatBirthday(contact.birthday) || "their birthday",
    group: GROUP_LABEL[groupKey],
    message: birthdayMessage(groupKey, contact.name),
    includeGift: contact.includeGift,
    includeCartoon: contact.includeCartoon,
    giftLabel: DEFAULT_GIFT_LABEL,
  });

  return { ok: true, to: user.email };
}
