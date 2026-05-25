// Shared logic for the Birthdays auto-send loop.
//
// Used by BOTH the daily cron (app/api/cron/birthdays/route.ts) and the manual
// "email me the approval draft" action, so the approval-first flow lives in one
// place. This is a plain server module (no "use server") — safe to import from
// route handlers and server actions, never from client components.

import { db } from "@/lib/db";
import { sendBirthdayApprovalEmail, sendBirthdayGreetingEmail } from "@/lib/email";
import {
  GROUP_LABEL,
  toGroupKey,
  birthdayMessage,
  formatBirthday,
  DEFAULT_GIFT_LABEL,
  APPROVAL_LEAD_DAYS,
  birthdayOccurrence,
  bdayDateForYear,
  todayInTz,
  relativeDayLabel,
} from "@/lib/birthday";
import type { BirthdayContact, User, BirthdayDispatch } from "@prisma/client";

export type ContactWithUser = BirthdayContact & { user: User };

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL || "https://app.salescard.ai").replace(/\/$/, "");
}

function businessTz(): string {
  return process.env.BIRTHDAY_TZ || "America/New_York";
}

// Find (or create) the single dispatch row for a contact's birthday in a given
// year. The @@unique([contactId, year]) constraint guarantees one per year, so
// the rep is never double-emailed.
export async function ensureDispatch(
  contact: ContactWithUser,
  year: number,
): Promise<{ dispatch: BirthdayDispatch; created: boolean }> {
  const existing = await db.birthdayDispatch.findUnique({
    where: { contactId_year: { contactId: contact.id, year } },
  });
  if (existing) return { dispatch: existing, created: false };

  const groupKey = toGroupKey(contact.group);
  const dispatch = await db.birthdayDispatch.create({
    data: {
      contactId: contact.id,
      userId: contact.userId,
      year,
      message: birthdayMessage(groupKey, contact.name),
      group: contact.group,
      includeGift: contact.includeGift,
      includeCartoon: contact.includeCartoon,
      giftLabel: contact.includeGift ? DEFAULT_GIFT_LABEL : null,
      status: "PENDING_APPROVAL",
    },
  });
  return { dispatch, created: true };
}

// Email the rep the approval draft for a dispatch (with a tokenized approve link).
export async function sendApprovalEmailFor(
  dispatch: BirthdayDispatch,
  contact: ContactWithUser,
  whenLabel?: string,
): Promise<void> {
  const groupKey = toGroupKey(contact.group);
  await sendBirthdayApprovalEmail({
    repEmail: contact.user.email,
    repName: contact.user.name ?? contact.user.email,
    contactName: contact.name,
    contactEmail: contact.email,
    birthdayLabel: formatBirthday(contact.birthday) || "their birthday",
    whenLabel,
    group: GROUP_LABEL[groupKey],
    message: dispatch.message,
    includeGift: dispatch.includeGift,
    includeCartoon: dispatch.includeCartoon,
    giftLabel: dispatch.giftLabel ?? DEFAULT_GIFT_LABEL,
    approveUrl: `${baseUrl()}/birthday/${dispatch.token}`,
  });
  await db.birthdayDispatch.update({
    where: { id: dispatch.id },
    data: { approvalSentAt: new Date() },
  });
}

// Send the actual birthday greeting to the recipient and mark the dispatch SENT.
// Returns false (and marks FAILED) on error so the caller can keep going.
export async function sendGreetingFor(
  dispatch: BirthdayDispatch,
  contact: ContactWithUser,
): Promise<boolean> {
  try {
    await sendBirthdayGreetingEmail({
      recipientEmail: contact.email,
      recipientName: contact.name,
      repName: contact.user.name ?? contact.user.email,
      repEmail: contact.user.email,
      message: dispatch.message,
    });
    await db.birthdayDispatch.update({
      where: { id: dispatch.id },
      data: { status: "SENT", sentAt: new Date(), failReason: null },
    });
    return true;
  } catch (err) {
    console.error(`[birthday-job] greeting failed for dispatch ${dispatch.id}:`, err);
    await db.birthdayDispatch.update({
      where: { id: dispatch.id },
      data: { status: "FAILED", failReason: String(err).slice(0, 500) },
    });
    return false;
  }
}

export interface DailyJobSummary {
  contactsProcessed: number;
  approvalsRequested: number;
  greetingsSent: number;
  missedSkipped: number;
  errors: number;
  tz: string;
  today: string;
}

// The daily job. Runs three stages per contact:
//   A. Within the lead window (<= APPROVAL_LEAD_DAYS) and no dispatch yet for
//      that birthday-year -> create one + email the rep to approve.
//   B. An APPROVED dispatch whose birthday is today (or 1-2 days late, e.g. a
//      missed run) and not yet sent -> send the greeting to the recipient.
//   C. A PENDING_APPROVAL dispatch whose birthday already passed -> mark SKIPPED
//      (the rep never approved, so nothing sends — the guarantee holds).
export async function runDailyBirthdayJob(): Promise<DailyJobSummary> {
  const tz = businessTz();
  const today = todayInTz(tz);
  const todayUTC = Date.UTC(today.year, today.month0, today.day);

  const contacts = await db.birthdayContact.findMany({
    where: { birthday: { not: null } },
    include: { user: true, dispatches: true },
  });

  let approvalsRequested = 0;
  let greetingsSent = 0;
  let missedSkipped = 0;
  let errors = 0;

  for (const c of contacts) {
    try {
      if (!c.birthday) continue;
      const occ = birthdayOccurrence(c.birthday, today);

      // Stage A — request approval inside the lead window (includes day-of).
      if (occ.daysUntil <= APPROVAL_LEAD_DAYS) {
        const alreadyHasDispatch = c.dispatches.some((d) => d.year === occ.occYear);
        if (!alreadyHasDispatch) {
          const { dispatch } = await ensureDispatch(c, occ.occYear);
          await sendApprovalEmailFor(dispatch, c, relativeDayLabel(occ.daysUntil));
          approvalsRequested++;
        }
      }

      // Stage B / C — act on existing dispatches relative to their own year.
      for (const d of c.dispatches) {
        const dDate = bdayDateForYear(c.birthday, d.year);
        const lateDays = Math.round((todayUTC - dDate) / 86_400_000); // >0 = passed

        if (d.status === "APPROVED" && !d.sentAt) {
          if (lateDays >= 0 && lateDays <= 2) {
            const ok = await sendGreetingFor(d, c);
            if (ok) greetingsSent++;
            else errors++;
          }
        } else if (d.status === "PENDING_APPROVAL" && lateDays > 0) {
          await db.birthdayDispatch.update({
            where: { id: d.id },
            data: { status: "SKIPPED" },
          });
          missedSkipped++;
        }
      }
    } catch (err) {
      errors++;
      console.error(`[birthday-job] contact ${c.id} failed:`, err);
    }
  }

  return {
    contactsProcessed: contacts.length,
    approvalsRequested,
    greetingsSent,
    missedSkipped,
    errors,
    tz,
    today: `${today.year}-${String(today.month0 + 1).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`,
  };
}
