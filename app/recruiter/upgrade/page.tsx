import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { RECRUITER_TIERS, type RecruiterTier } from "@/lib/stripe";
import { getOrgContext } from "@/lib/org";
import { recruiterHasAccess } from "@/lib/recruiter-access";
import { startCheckout, openBillingPortal } from "./actions";

const ORDER: RecruiterTier[] = ["basic", "pro", "charter_annual", "charter_2yr"];

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const me = await db.user.findUnique({ where: { id: session.user.id } });
  if (!me) redirect("/sign-in");

  const ctx = await getOrgContext(me.id);
  const hasAccess = recruiterHasAccess(me.email, ctx);
  const sp = await searchParams;

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/recruiter" className="text-sm font-semibold text-gray-500 hover:text-[#0A66C2]">
          ← Back to search
        </Link>
        <div className="text-xs tracking-widest font-bold text-[#0A66C2] uppercase mb-1 mt-4">
          Recruiter plans
        </div>
        <h1 className="text-3xl font-black tracking-tight">Unlock the verified talent pool.</h1>
        <p className="text-gray-600 mt-1">
          Scores are always public. A plan unlocks names, full profiles, and verifier contact details.
        </p>
      </div>

      {sp.canceled && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Checkout canceled — no charge was made. Pick a plan whenever you're ready.
        </div>
      )}

      {hasAccess && (
        <div className="mb-6 rounded-2xl border border-[#10B981]/30 bg-[#10B981]/5 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-gray-900">Your plan is active.</div>
            <p className="text-sm text-gray-600">You have full access to the talent pool.</p>
          </div>
          <form action={openBillingPortal}>
            <button
              type="submit"
              className="text-sm font-bold text-white bg-[#0A66C2] hover:bg-[#1E5A9C] px-4 py-2.5 rounded-xl transition whitespace-nowrap"
            >
              Manage billing
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ORDER.map((key) => {
          const t = RECRUITER_TIERS[key];
          return (
            <div
              key={t.tier}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
                t.highlight ? "border-[#0A66C2] shadow-lg ring-1 ring-[#0A66C2]/20" : "border-gray-200"
              }`}
            >
              {t.badge && (
                <span className="absolute -top-3 left-6 rounded-full bg-[#0A66C2] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                  {t.badge}
                </span>
              )}
              <div className="font-black text-lg tracking-tight">{t.name}</div>
              <p className="text-sm text-gray-500 mt-0.5 min-h-[40px]">{t.blurb}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tight">{t.priceLabel}</span>
                <span className="text-sm font-semibold text-gray-500">{t.cadence}</span>
              </div>
              <ul className="mt-5 space-y-2.5 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#10B981]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <form action={startCheckout.bind(null, t.tier)} className="mt-6">
                <button
                  type="submit"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    t.highlight
                      ? "bg-[#0A66C2] text-white hover:bg-[#1E5A9C]"
                      : "border border-gray-300 text-gray-900 hover:border-[#0A66C2] hover:text-[#0A66C2]"
                  }`}
                >
                  {t.cta}
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6 max-w-2xl">
        Charter plans are a one-time, prepaid founding rate — they don't auto-renew. Monthly plans
        renew automatically and can be canceled anytime from the billing portal. Payments are processed securely by Stripe.
      </p>
    </main>
  );
}
