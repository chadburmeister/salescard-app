"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendGreetingFor, type ContactWithUser } from "@/lib/birthday-dispatch";
import { bdayDateForYear, todayInTz } from "@/lib/birthday";

export type BirthdayActionResult =
  | { ok: true; status: "APPROVED" | "SENT" | "SKIPPED" }
  | { ok: false; error: string };

function businessTz(): string {
  return process.env.BIRTHDAY_TZ || "America/New_York";
}

/**
 * Rep approves the message. Saves any edits, marks APPROVED, and — if the
 * birthday is today (or 1-2 days past, e.g. a missed cron run) — sends the
 * greeting immediately so approving on the day doesn't wait for tomorrow.
 */
export async function approveBirthday(
  token: string,
  editedMessage?: string,
): Promise<BirthdayActionResult> {
  const dispatch = await db.birthdayDispatch.findUnique({
    where: { token },
    include: { contact: { include: { user: true } } },
  });
  if (!dispatch) return { ok: false, error: "This link isn't valid." };
  if (dispatch.status === "SENT") return { ok: true, status: "SENT" };
  if (dispatch.status === "SKIPPED") {
    return { ok: false, error: "This birthday was skipped — nothing will be sent." };
  }

  const message = editedMessage && editedMessage.trim() ? editedMessage.trim() : dispatch.message;
  const updated = await db.birthdayDispatch.update({
    where: { id: dispatch.id },
    data: { status: "APPROVED", approvedAt: new Date(), message },
  });

  let finalStatus: "APPROVED" | "SENT" = "APPROVED";
  const contact = dispatch.contact as ContactWithUser;
  if (contact.birthday) {
    const today = todayInTz(businessTz());
    const todayUTC = Date.UTC(today.year, today.month0, today.day);
    const dDate = bdayDateForYear(contact.birthday, updated.year);
    const lateDays = Math.round((todayUTC - dDate) / 86_400_000);
    if (lateDays >= 0 && lateDays <= 2) {
      const ok = await sendGreetingFor(updated, contact);
      if (ok) finalStatus = "SENT";
    }
  }

  revalidatePath(`/birthday/${token}`);
  return { ok: true, status: finalStatus };
}

/** Rep skips this birthday — nothing is sent to the recipient. */
export async function skipBirthday(token: string): Promise<BirthdayActionResult> {
  const dispatch = await db.birthdayDispatch.findUnique({ where: { token } });
  if (!dispatch) return { ok: false, error: "This link isn't valid." };
  if (dispatch.status === "SENT") {
    return { ok: false, error: "This message was already sent." };
  }
  await db.birthdayDispatch.update({
    where: { id: dispatch.id },
    data: { status: "SKIPPED" },
  });
  revalidatePath(`/birthday/${token}`);
  return { ok: true, status: "SKIPPED" };
}
