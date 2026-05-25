// Stripe sends the customer here right after a successful checkout. We confirm
// the session was actually paid (server-side, using the Stripe secret key) and
// unlock the recruiter's org — no webhook required.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { applyCheckoutSession } from "@/lib/recruiter-billing";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const { session_id } = await searchParams;

  if (session_id) {
    // Only ever unlock an org the current user actually belongs to.
    const membership = await db.orgMembership.findFirst({
      where: { userId: session.user.id },
      select: { orgId: true },
    });
    try {
      const stripe = getStripe();
      const s = await stripe.checkout.sessions.retrieve(session_id);
      const sessionOrgId =
        (s.metadata?.orgId as string | undefined) || s.client_reference_id || undefined;
      const paid = s.status === "complete" || s.payment_status === "paid";
      if (paid && sessionOrgId && membership?.orgId === sessionOrgId) {
        await applyCheckoutSession(stripe, s);
      }
    } catch (err) {
      console.error("[checkout success] could not confirm session:", err);
    }
  }

  redirect("/recruiter?upgraded=1");
}
