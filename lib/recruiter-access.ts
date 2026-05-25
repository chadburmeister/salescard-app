import type { OrgContext } from "@/lib/org";

// Recruiter paywall access. Phase 1 has no billing yet, so access comes from a
// comp allowlist (the founder + any emails in RECRUITER_COMP_EMAILS). Phase 2
// wires Stripe, which sets Organization.subscriptionStatus to active/trialing.

const FOUNDER_COMP = ["chadburmeister@gmail.com"];
const ACTIVE_STATUSES = new Set(["active", "trialing", "comp"]);
const CHARTER_PLANS = new Set(["charter_annual", "charter_2yr"]);

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
  if (!org?.subscriptionStatus || !ACTIVE_STATUSES.has(org.subscriptionStatus)) return false;
  // Charters are prepaid for a fixed term — enforce the paid-through date.
  if (org.plan && CHARTER_PLANS.has(org.plan)) {
    return !!org.currentPeriodEnd && org.currentPeriodEnd.getTime() > Date.now();
  }
  // Recurring subscriptions: access for as long as Stripe reports active/trialing.
  return true;
}
