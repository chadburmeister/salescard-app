// Stripe webhook — keeps Organization.subscriptionStatus in sync with Stripe.
//
// Register this endpoint in Stripe → Developers → Webhooks:
//   URL:    https://app.salescard.ai/api/stripe/webhook
//   Events: checkout.session.completed,
//           customer.subscription.created, customer.subscription.updated,
//           customer.subscription.deleted
// Then copy the signing secret (whsec_...) into the STRIPE_WEBHOOK_SECRET env var.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, tierForPriceId, RECRUITER_TIERS, type RecruiterTier } from "@/lib/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!secret || !sig) throw new Error("Missing webhook secret or signature.");
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] handler error for ${event.type}:`, err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// --- helpers ---------------------------------------------------------------

function customerId(c: Stripe.Subscription["customer"] | Stripe.Checkout.Session["customer"]): string | null {
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

/** Read the period-end across Stripe API versions (top-level or on the first item). */
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
  const cust = customerId(sub.customer);
  if (cust) {
    const byCust = await db.organization.findFirst({
      where: { stripeCustomerId: cust },
      select: { id: true },
    });
    if (byCust) return byCust.id;
  }
  return null;
}

async function handleCheckoutCompleted(stripe: Stripe, s: Stripe.Checkout.Session): Promise<void> {
  const orgId = (s.metadata?.orgId as string | undefined) || s.client_reference_id || undefined;
  if (!orgId) {
    console.warn("[stripe/webhook] checkout.session.completed with no orgId");
    return;
  }

  if (s.mode === "subscription" && s.subscription) {
    const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subId);
    await handleSubscriptionChange(sub, orgId);
    return;
  }

  if (s.mode === "payment") {
    // One-time Charter: no Stripe subscription object, so set a fixed term ourselves.
    const tier = s.metadata?.tier as RecruiterTier | undefined;
    const def = tier ? RECRUITER_TIERS[tier] : undefined;
    const months = def?.termMonths ?? 12;
    const seats = def?.seats ?? 3;
    const end = new Date();
    end.setMonth(end.getMonth() + months);
    const cust = customerId(s.customer);
    await db.organization.update({
      where: { id: orgId },
      data: {
        subscriptionStatus: "active",
        currentPeriodEnd: end,
        plan: tier ?? "charter",
        seatLimit: seats,
        ...(cust ? { stripeCustomerId: cust } : {}),
      },
    });
  }
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription,
  orgIdHint?: string,
): Promise<void> {
  const orgId = await resolveOrgId(
    orgIdHint || (sub.metadata?.orgId as string | undefined),
    sub,
  );
  if (!orgId) {
    console.warn("[stripe/webhook] subscription change could not be matched to an org:", sub.id);
    return;
  }

  const priceId = sub.items?.data?.[0]?.price?.id;
  const tier = tierForPriceId(priceId);
  const def = tier ? RECRUITER_TIERS[tier] : undefined;
  const cust = customerId(sub.customer);

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
