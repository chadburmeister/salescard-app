"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateCartoon } from "@/lib/cartoon";
import { writeCardWords } from "@/lib/card-writer";
import { toGroupKey, type CardTone } from "@/lib/birthday";
import type { BirthdayContact } from "@prisma/client";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");
  return session.user.id;
}

async function ownContact(id: string, userId: string): Promise<BirthdayContact> {
  const contact = await db.birthdayContact.findFirst({ where: { id, userId } });
  if (!contact) throw new Error("Contact not found.");
  return contact;
}

/** Generate (or regenerate) the cartoon for a contact and save it. */
export async function generateCartoonForContact(
  contactId: string,
  style: string,
): Promise<{ url: string }> {
  const userId = await requireUserId();
  const contact = await ownContact(contactId, userId);
  if (!contact.photoUrl) throw new Error("Upload a photo first.");

  const url = await generateCartoon({
    photoUrl: contact.photoUrl,
    style,
    ownerId: userId,
    contactId,
  });

  await db.birthdayContact.update({
    where: { id: contactId },
    data: { cartoonUrl: url, cartoonStyle: style, includeCartoon: true },
  });
  // Keep any not-yet-approved birthday in sync with the new cartoon.
  await db.birthdayDispatch.updateMany({
    where: { contactId, status: "PENDING_APPROVAL" },
    data: { cartoonUrl: url },
  });
  revalidatePath(`/dashboard/birthdays/studio/${contactId}`);
  revalidatePath("/dashboard/birthdays");
  return { url };
}

/** Draft card words with the AI greeting-card writer (does not save). */
export async function generateCardWordsForContact(input: {
  contactId: string;
  tone: CardTone;
  notes?: string;
}): Promise<{ message: string }> {
  const userId = await requireUserId();
  const contact = await ownContact(input.contactId, userId);
  const message = await writeCardWords({
    recipientName: contact.name,
    group: toGroupKey(contact.group),
    tone: input.tone,
    notes: input.notes,
  });
  return { message };
}

/** Persist the finished card (words + whether to include the cartoon). */
export async function saveCard(
  contactId: string,
  data: { cardMessage?: string | null; includeCartoon?: boolean },
): Promise<{ ok: true }> {
  const userId = await requireUserId();
  await ownContact(contactId, userId);
  await db.birthdayContact.updateMany({
    where: { id: contactId, userId },
    data: {
      ...(data.cardMessage !== undefined ? { cardMessage: data.cardMessage?.trim() || null } : {}),
      ...(data.includeCartoon !== undefined ? { includeCartoon: data.includeCartoon } : {}),
    },
  });
  // If the rep edited the words, push them onto any pending (un-approved) birthday.
  const trimmed = data.cardMessage?.trim();
  if (trimmed) {
    await db.birthdayDispatch.updateMany({
      where: { contactId, status: "PENDING_APPROVAL" },
      data: { message: trimmed },
    });
  }
  revalidatePath("/dashboard/birthdays");
  revalidatePath(`/dashboard/birthdays/studio/${contactId}`);
  return { ok: true };
}
