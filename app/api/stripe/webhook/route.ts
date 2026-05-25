// Stripe webhook — OPTIONAL. The post-checkout success page already unlocks
// accounts on its own, so payments work without this. Set it up later if you
// want cancellations/renewals/failed-payments to sync automatically.
//
// To enable: create a webhook endpoint in Stripe pointing at
//   https://app.salescard.ai/api/stripe/webhook
// (events: checkout.session.completed + customer.subscription.*), then put the
// signing secret in the STRIPE_WEBHOOK_SECRET env var.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { applyCheckoutSession, applySubscriptionToOrg } from "@/lib/recruiter-billing";

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
        await applyCheckoutSession(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscriptionToOrg(event.data.object as Stripe.Subscription);
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
