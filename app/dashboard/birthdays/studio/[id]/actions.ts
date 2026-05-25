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

// Abuse guardrails for AI image generation (each call costs money). Tunable via
// env without a code change. "Original photo" is exempt (it makes no AI call).
const IMAGE_DAILY_LIMIT = Number(process.env.IMAGE_DAILY_LIMIT || "2");
const IMAGE_MONTHLY_LIMIT = Number(process.env.IMAGE_MONTHLY_LIMIT || "10");
const IMAGE_MIN_INTERVAL_MS = Number(process.env.IMAGE_MIN_INTERVAL_SECONDS || "5") * 1000;

async function enforceImageQuota(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = Date.now();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const recent = await db.imageGenLog.findMany({
    where: { userId, createdAt: { gte: monthAgo } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent.length >= IMAGE_MONTHLY_LIMIT) {
    return {
      ok: false,
      error: `You've reached your monthly limit of ${IMAGE_MONTHLY_LIMIT} AI images. Choose "Original photo" (no limit) in the meantime.`,
    };
  }
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const dayCount = recent.filter((r: { createdAt: Date }) => r.createdAt.getTime() >= dayAgo).length;
  if (dayCount >= IMAGE_DAILY_LIMIT) {
    return {
      ok: false,
      error: `You've reached today's limit of ${IMAGE_DAILY_LIMIT} AI images — it resets within 24 hours. Or choose "Original photo," which has no limit.`,
    };
  }
  if (recent[0] && now - recent[0].createdAt.getTime() < IMAGE_MIN_INTERVAL_MS) {
    return { ok: false, error: "Just a few seconds between images, please — try again in a moment." };
  }
  return { ok: true };
}

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

    const quota = await enforceImageQuota(userId);
    if (!quota.ok) return quota;

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
    await db.imageGenLog.create({ data: { userId } });
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
