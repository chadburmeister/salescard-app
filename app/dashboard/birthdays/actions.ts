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
  birthdayOccurrence,
  todayInTz,
  relativeDayLabel,
} from "@/lib/birthday";
import {
  ensureDispatch,
  sendApprovalEmailFor,
  type ContactWithUser,
} from "@/lib/birthday-dispatch";
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
    includeCartoon: c.includeCartoon,
    photoUrl: c.photoUrl,
    cartoonUrl: c.cartoonUrl,
    cardMessage: c.cardMessage,
    cartoonStyle: c.cartoonStyle,
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
  opts: { includeCartoon?: boolean },
): Promise<void> {
  const userId = await requireUserId();
  await db.birthdayContact.updateMany({
    where: { id, userId },
    data: {
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
  const contact = await db.birthdayContact.findFirst({
    where: { id, userId },
    include: { user: true },
  });
  if (!contact) throw new Error("Contact not found.");
  const user = contact.user;

  // With a birthday on file, create/reuse the dispatch for the next occurrence
  // and send the tokenized approval email — the same path the daily cron uses,
  // so approving straight from this email actually schedules the send.
  if (contact.birthday) {
    const today = todayInTz(process.env.BIRTHDAY_TZ || "America/New_York");
    const occ = birthdayOccurrence(contact.birthday, today);
    const { dispatch } = await ensureDispatch(contact as ContactWithUser, occ.occYear);
    await sendApprovalEmailFor(dispatch, contact as ContactWithUser, relativeDayLabel(occ.daysUntil));
    revalidatePath("/dashboard/birthdays");
    return { ok: true, to: user.email };
  }

  // No birthday on file yet — send a plain preview (nothing is scheduled). The
  // CTA points back to the dashboard so the rep can add a date to enable auto-send.
  const groupKey = toGroupKey(contact.group);
  await sendBirthdayApprovalEmail({
    repEmail: user.email,
    repName: user.name ?? user.email,
    contactName: contact.name,
    contactEmail: contact.email,
    birthdayLabel: "their birthday",
    group: GROUP_LABEL[groupKey],
    message: contact.cardMessage?.trim() || birthdayMessage(groupKey, contact.name),
    cartoonUrl: contact.cartoonUrl ?? undefined,
  });
  return { ok: true, to: user.email };
}
