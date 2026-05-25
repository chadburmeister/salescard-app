// Shared logic that turns a paid Stripe Checkout into recruiter access on the
// Organization. Used by BOTH the post-checkout success page (no webhook needed)
// and the Stripe webhook (optional, for ongoing renewals/cancellations).

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { tierForPriceId, RECRUITER_TIERS, type RecruiterTier } from "@/lib/stripe";

function customerIdOf(
  c: Stripe.Subscription["customer"] | Stripe.Checkout.Session["customer"],
): string | null {
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

/** Read the period-end across Stripe API versions (top-level or on first item). */
function periodEndOf(sub: Stripe.Subscription): Date | null {
  const s = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

async function resolveOrgId(
  orgIdHint: string | undefined,
  sub: Stripe.Subscription,
): Promise<string | null> {
  if (orgIdHint) return orgIdHint;
  const bySub = await db.organization.findFirst({
    where: { stripeSubscriptionId: sub.id },
    select: { id: true },
  });
  if (bySub) return bySub.id;
  const cust = customerIdOf(sub.customer);
  if (cust) {
    const byCust = await db.organization.findFirst({
      where: { stripeCustomerId: cust },
      select: { id: true },
    });
    if (byCust) return byCust.id;
  }
  return null;
}

/** Sync an org's access from a Stripe Subscription (recurring Basic/Pro). */
export async function applySubscriptionToOrg(
  sub: Stripe.Subscription,
  orgIdHint?: string,
): Promise<void> {
  const orgId = await resolveOrgId(
    orgIdHint || (sub.metadata?.orgId as string | undefined),
    sub,
  );
  if (!orgId) return;

  const priceId = sub.items?.data?.[0]?.price?.id;
  const tier = tierForPriceId(priceId);
  const def = tier ? RECRUITER_TIERS[tier] : undefined;
  const cust = customerIdOf(sub.customer);

  await db.organization.update({
    where: { id: orgId },
    data: {
      subscriptionStatus: sub.status, // active | trialing | past_due | canceled | ...
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: periodEndOf(sub),
      ...(cust ? { stripeCustomerId: cust } : {}),
      ...(tier && def ? { plan: tier, seatLimit: def.seats } : {}),
    },
  });
}

/**
 * Unlock an org from a COMPLETED Checkout Session. Covers recurring subs and
 * one-time Charters. Returns the org id it applied to (or null if none found).
 */
export async function applyCheckoutSession(
  stripe: Stripe,
  s: Stripe.Checkout.Session,
): Promise<string | null> {
  const orgId = (s.metadata?.orgId as string | undefined) || s.client_reference_id || undefined;
  if (!orgId) return null;

  if (s.mode === "subscription" && s.subscription) {
    const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subId);
    await applySubscriptionToOrg(sub, orgId);
    return orgId;
  }

  if (s.mode === "payment") {
    // One-time Charter: no subscription object, so set a fixed prepaid term.
    const tier = s.metadata?.tier as RecruiterTier | undefined;
    const def = tier ? RECRUITER_TIERS[tier] : undefined;
    const months = def?.termMonths ?? 12;
    const seats = def?.seats ?? 3;
    const end = new Date();
    end.setMonth(end.getMonth() + months);
    const cust = customerIdOf(s.customer);
    await db.organization.update({
      where: { id: orgId },
      data: {
        subscriptionStatus: "active",
        currentPeriodEnd: end,
        plan: tier ?? "charter_annual",
        seatLimit: seats,
        ...(cust ? { stripeCustomerId: cust } : {}),
      },
    });
    return orgId;
  }

  return orgId;
}
