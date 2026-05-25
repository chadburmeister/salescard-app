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

export type CartoonResult = { ok: true; url: string } | { ok: false; error: string };
export type WordsResult = { ok: true; message: string } | { ok: false; error: string };

// Light family-friendly guard for the free-text "Something else" description.
// The image prompt and Google's own safety filters are the main backstops; this
// just catches obvious attempts and gives a kind, clear message.
const BLOCKED_TERMS = [
  "nude", "naked", "nsfw", "porn", "explicit", "erotic", "sexual", " sex ",
  "fetish", "lingerie", "gore", "bloody", "decapitat", "mutilat",
];

/** Generate (or regenerate) the cartoon for a contact and save it. */
export async function generateCartoonForContact(input: {
  contactId: string;
  style: string;
  scene: string;
  customPrompt?: string;
}): Promise<CartoonResult> {
  try {
    const userId = await requireUserId();
    const contact = await ownContact(input.contactId, userId);
    if (!contact.photoUrl) return { ok: false, error: "Upload a photo first." };

    // "Original photo" — use the uploaded image as-is, no AI generation.
    if (input.style === "original") {
      await db.birthdayContact.update({
        where: { id: input.contactId },
        data: { cartoonUrl: contact.photoUrl, cartoonStyle: "original", includeCartoon: true },
      });
      await db.birthdayDispatch.updateMany({
        where: { contactId: input.contactId, status: "PENDING_APPROVAL" },
        data: { cartoonUrl: contact.photoUrl },
      });
      revalidatePath(`/dashboard/birthdays/studio/${input.contactId}`);
      revalidatePath("/dashboard/birthdays");
      return { ok: true, url: contact.photoUrl };
    }

    const custom = (input.customPrompt || "").trim();
    if (input.scene === "custom") {
      if (!custom) return { ok: false, error: "Describe what you'd like the picture to be." };
      const padded = ` ${custom.toLowerCase()} `;
      if (BLOCKED_TERMS.some((t) => padded.includes(t))) {
        return {
          ok: false,
          error: "Let's keep birthday cards friendly — please describe something family-appropriate.",
        };
      }
    }

    const url = await generateCartoon({
      photoUrl: contact.photoUrl,
      style: input.style,
      scene: input.scene,
      customPrompt: custom || undefined,
      ownerId: userId,
      contactId: input.contactId,
    });

    await db.birthdayContact.update({
      where: { id: input.contactId },
      data: { cartoonUrl: url, cartoonStyle: input.style, includeCartoon: true },
    });
    // Keep any not-yet-approved birthday in sync with the new image.
    await db.birthdayDispatch.updateMany({
      where: { contactId: input.contactId, status: "PENDING_APPROVAL" },
      data: { cartoonUrl: url },
    });
    revalidatePath(`/dashboard/birthdays/studio/${input.contactId}`);
    revalidatePath("/dashboard/birthdays");
    return { ok: true, url };
  } catch (err) {
    console.error("[generateCartoonForContact]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't generate the image." };
  }
}

/** Draft card words with the AI greeting-card writer (does not save). */
export async function generateCardWordsForContact(input: {
  contactId: string;
  tone: CardTone;
  notes?: string;
}): Promise<WordsResult> {
  try {
    const userId = await requireUserId();
    const contact = await ownContact(input.contactId, userId);
    const message = await writeCardWords({
      recipientName: contact.name,
      group: toGroupKey(contact.group),
      tone: input.tone,
      notes: input.notes,
    });
    return { ok: true, message };
  } catch (err) {
    console.error("[generateCardWordsForContact]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't write the words." };
  }
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
