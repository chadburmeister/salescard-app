"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getStripe, RECRUITER_TIERS, type RecruiterTier } from "@/lib/stripe";

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL || "https://app.salescard.ai").replace(/\/$/, "");
}

/**
 * Every recruiter subscription is attached to an Organization (so seats + billing
 * live in one place). A recruiter who hasn't created a team yet gets one created
 * automatically on first checkout, mirroring createOrg in /recruiter/team/actions.
 */
async function ensureOrg(userId: string, fallbackName: string) {
  const membership = await db.orgMembership.findFirst({
    where: { userId },
    include: { org: true },
  });
  if (membership) return membership.org;

  const org = await db.organization.create({
    data: {
      name: fallbackName,
      ownerId: userId,
      memberships: { create: { userId, role: "OWNER" } },
    },
  });
  await db.user.update({ where: { id: userId }, data: { isRecruiter: true } });
  return org;
}

/** Start a Stripe Checkout session for the chosen plan and redirect to it. */
export async function startCheckout(tier: RecruiterTier) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;
  const me = await db.user.findUnique({ where: { id: userId } });
  if (!me) redirect("/sign-in");

  const def = RECRUITER_TIERS[tier];
  if (!def) throw new Error("Unknown plan.");

  const fallbackName =
    me.currentCompany?.trim() || (me.name ? `${me.name}'s Team` : "My Recruiting Team");
  const org = await ensureOrg(userId, fallbackName);

  const stripe = getStripe();

  // Reuse the org's Stripe customer, or create one the first time.
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: me.email,
      name: org.name,
      metadata: { orgId: org.id, userId },
    });
    customerId = customer.id;
    await db.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: def.mode,
    customer: customerId,
    line_items: [{ price: def.priceId, quantity: 1 }],
    client_reference_id: org.id,
    metadata: { orgId: org.id, tier },
    allow_promotion_codes: true,
    ...(def.mode === "subscription"
      ? { subscription_data: { metadata: { orgId: org.id, tier } } }
      : {}),
    success_url: `${baseUrl()}/recruiter/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/recruiter/upgrade?canceled=1`,
  });

  if (!checkout.url) throw new Error("Could not start checkout.");
  redirect(checkout.url);
}

/** Open the Stripe billing portal so the recruiter can manage or cancel. */
export async function openBillingPortal() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const membership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    include: { org: true },
  });
  const customerId = membership?.org.stripeCustomerId;
  if (!customerId) redirect("/recruiter/upgrade");

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl()}/recruiter`,
  });
  redirect(portal.url);
}
