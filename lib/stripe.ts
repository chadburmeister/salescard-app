// Stripe integration for the recruiter subscription (Phase 2).
//
// Required env vars (set in Vercel → salescard-app → Settings → Environment Variables):
//   STRIPE_SECRET_KEY       — sk_live_... (server-side secret; never exposed to the client)
//   STRIPE_WEBHOOK_SECRET   — whsec_...   (from the webhook endpoint you create in Stripe)
// Optional overrides (the live Price IDs are baked in as defaults so checkout works
// without extra env setup; set these only if you rotate prices or test in test mode):
//   STRIPE_PRICE_BASIC, STRIPE_PRICE_PRO, STRIPE_PRICE_CHARTER_ANNUAL, STRIPE_PRICE_CHARTER_2YR

import Stripe from "stripe";

let _client: Stripe | null = null;

/** Lazily-initialised Stripe client. Throws if the secret key is missing. */
export function getStripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  _client = new Stripe(key);
  return _client;
}

export type RecruiterTier = "basic" | "pro" | "charter_annual" | "charter_2yr";

export interface RecruiterTierDef {
  tier: RecruiterTier;
  name: string;
  priceId: string;
  mode: "subscription" | "payment"; // subscription = recurring; payment = one-time charter
  seats: number;
  termMonths: number | null; // only for one-time charters
  priceLabel: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: string;
  badge?: string;
  highlight?: boolean;
}

export const RECRUITER_TIERS: Record<RecruiterTier, RecruiterTierDef> = {
  basic: {
    tier: "basic",
    name: "Basic",
    priceId: process.env.STRIPE_PRICE_BASIC || "price_1Tb7581pt6fn1tgaxAj3jFRr",
    mode: "subscription",
    seats: 1,
    termMonths: null,
    priceLabel: "$149",
    cadence: "/month",
    blurb: "For an individual recruiter.",
    features: [
      "1 recruiter seat",
      "Full access to verified rep profiles",
      "See verifier contact details",
      "Cancel anytime",
    ],
    cta: "Subscribe",
  },
  pro: {
    tier: "pro",
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO || "price_1Tb75q1pt6fn1tga91bZ1Jyf",
    mode: "subscription",
    seats: 3,
    termMonths: null,
    priceLabel: "$249",
    cadence: "/month",
    blurb: "For a small recruiting team.",
    features: [
      "3 recruiter seats",
      "Everything in Basic",
      "Team analytics",
      "Cancel anytime",
    ],
    cta: "Subscribe",
    badge: "Most popular",
    highlight: true,
  },
  charter_annual: {
    tier: "charter_annual",
    name: "Charter — 1 year",
    priceId: process.env.STRIPE_PRICE_CHARTER_ANNUAL || "price_1Tb76g1pt6fn1tga0De125A9",
    mode: "payment",
    seats: 3,
    termMonths: 12,
    priceLabel: "$999",
    cadence: "billed once · 1 year",
    blurb: "Founding rate, prepaid for a year.",
    features: [
      "3 recruiter seats",
      "Everything in Pro",
      "Locks in the founding rate",
      "12 months, prepaid",
    ],
    cta: "Get the founding rate",
    badge: "Founding",
  },
  charter_2yr: {
    tier: "charter_2yr",
    name: "Charter — 2 years",
    priceId: process.env.STRIPE_PRICE_CHARTER_2YR || "price_1Tb78b1pt6fn1tga9uhcwmw2",
    mode: "payment",
    seats: 3,
    termMonths: 24,
    priceLabel: "$2,499",
    cadence: "billed once · 2 years",
    blurb: "Best value — lock the founding rate for two years.",
    features: [
      "3 recruiter seats",
      "Everything in Pro",
      "Locks the founding rate for 2 years",
      "24 months, prepaid",
    ],
    cta: "Get the founding rate",
    badge: "Best value",
    highlight: true,
  },
};

/** Reverse lookup: which tier owns a given Stripe Price ID (used in the webhook). */
export function tierForPriceId(priceId: string | null | undefined): RecruiterTier | undefined {
  if (!priceId) return undefined;
  return (Object.keys(RECRUITER_TIERS) as RecruiterTier[]).find(
    (t) => RECRUITER_TIERS[t].priceId === priceId,
  );
}
