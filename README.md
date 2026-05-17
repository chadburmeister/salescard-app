# SalesCard App

The actual app behind [salescard.ai](https://salescard.ai). Reps sign in with LinkedIn, upload their last 8 quarters of KPIs, and get a verified SalesCard.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **NextAuth v5** with LinkedIn OAuth
- **Prisma 7** + **Vercel Postgres** (Neon)
- **Resend** for transactional email
- **Zod** for input validation
- **React Hook Form** for forms

## Status

Foundation scaffolded:

- Project structure (Next.js 16 + Tailwind + TypeScript)
- Prisma schema (User, Card, Quarter, Employment, VerificationRequest, NextAuth tables)
- Score calculation logic (`lib/score.ts`)
- Tier color/label logic (`lib/tier.ts`)
- Quarter generation helpers (`lib/quarters.ts`)
- Money/percent formatters (`lib/format.ts`)
- SalesCard React components (`components/salescard/`)
- NextAuth config skeleton (`lib/auth.ts`)
- Prisma client singleton (`lib/db.ts`)

To wire up (needs credentials):

- LinkedIn OAuth (sign-in flow)
- Database connection (Vercel Postgres)
- Email sending (Resend)
- Onboarding multi-step form
- KPI upload page
- Dashboard page
- Public profile route `/u/[username]`
- Verification request flow
- Verifier click-to-approve page `/verify/[token]`
- Peer percentile (with seed data)
- Deploy to `app.salescard.ai`

## Local setup

```bash
# 1. Install dependencies (already done in scaffold)
npm install

# 2. Copy env template and fill in your values
cp .env.example .env.local

# 3. Generate the Prisma client
npx prisma generate

# 4. Push the schema to your database (only needed once per DB reset)
npx prisma db push

# 5. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the placeholder home with a sample card render.

## Environment variables you need

See `.env.example` for the full list. Short version:

- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_LINKEDIN_ID` + `AUTH_LINKEDIN_SECRET` — from linkedin.com/developers
- `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING` — auto-injected by Vercel Postgres
- `RESEND_API_KEY` — from resend.com
- `EMAIL_FROM` — sender address (e.g. `verify@salescard.ai`)

## Deploying

This app is deployed to `app.salescard.ai` as a separate Vercel project from the landing page. To deploy:

1. Push to GitHub repo `salescard-app`
2. Connect the repo to Vercel via the dashboard (New Project → Import)
3. In project settings, add the environment variables above
4. Attach `app.salescard.ai` as a custom domain (it'll appear on Vercel's DNS since `salescard.ai` already delegates to Vercel)
5. Run `npx prisma migrate deploy` once after first deploy to apply migrations

## Routes (planned)

| Route | Purpose |
|-------|---------|
| `/` | Landing (placeholder) |
| `/sign-in` | LinkedIn OAuth entry point |
| `/onboarding` | Multi-step: role → company history → KPI upload |
| `/dashboard` | Your card + edit + verification requests |
| `/u/[username]` | Public profile page |
| `/verify/[token]` | Click-to-approve for verifiers (no login) |
| `/api/auth/[...nextauth]` | NextAuth handlers |
| `/api/kpis` | Save/update KPIs |
| `/api/verify` | Send verification request |
| `/api/card/[username]/svg` | Card as SVG (for OG images / sharing) |
