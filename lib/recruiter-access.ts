import type { OrgContext } from "@/lib/org";

// Recruiter paywall access. Phase 1 has no billing yet, so access comes from a
// comp allowlist (the founder + any emails in RECRUITER_COMP_EMAILS). Phase 2
// wires Stripe, which sets Organization.subscriptionStatus to active/trialing.

const FOUNDER_COMP = ["chadburmeister@gmail.com"];
const ACTIVE_STATUSES = new Set(["active", "trialing", "comp"]);

function compEmails(): string[] {
  const env = (process.env.RECRUITER_COMP_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...FOUNDER_COMP, ...env];
}

/** Full recruiter access (search results, profiles, contact) — comped or subscribed. */
export function recruiterHasAccess(
  email: string | null | undefined,
  org: OrgContext | null,
): boolean {
  if (email && compEmails().includes(email.toLowerCase())) return true;
  if (org?.subscriptionStatus && ACTIVE_STATUSES.has(org.subscriptionStatus)) {
    // For prepaid Charters (and as a backstop for subscriptions), respect the
    // paid-through date. Active Stripe subscriptions always keep this in the
    // future; a lapsed Charter falls out of access automatically.
    if (!org.currentPeriodEnd) return true;
    return org.currentPeriodEnd.getTime() > Date.now();
  }
  return false;
}
