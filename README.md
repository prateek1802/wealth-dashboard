# Wealth — Personal Investment Dashboard

A card-first, Material-inspired personal investment and wealth-tracking web
application. Single-user, cloud-first, no authentication in V1 (see
[ARCHITECTURE.md](./ARCHITECTURE.md) for why and what changes later).

## Stack

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · Recharts · Framer-Motion-ready · Radix UI primitives
- **Backend:** Supabase (PostgreSQL)
- **Validation:** Zod
- **Testing:** Vitest
- **Deployment:** Vercel + GitHub

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **No setup required** —
without a `.env.local`, the app runs in **demo mode**: an in-memory seed
dataset (fictional data) so every screen is explorable immediately. Demo
mode data resets on server restart; it is a development convenience, not a
second production data path.

To connect a real Supabase project so your data persists, see
[SETUP.md](./SETUP.md).

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run start    # run the production build
npm run test     # run the Vitest suite (calculation layer)
npm run lint      # ESLint
```

## Project structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full folder-by-folder
breakdown, data-flow diagrams, and the reasoning behind each architectural
decision. In short:

```
src/
  app/            Next.js routes (thin — compose features + fetch data)
  features/       Screen-specific components, Server Actions, hooks
  components/      ui (primitives) / shared (cross-feature) / layout / charts
  lib/            calculations (pure) / database (Supabase) / services /
                  market-data / validation / utils
  types/          Domain models + database row types
  constants/      Asset types, routes, chart periods
```

## Database

See [DATABASE.md](./DATABASE.md) for the full schema, relationships,
constraints, and indexes. Schema and seed data live in `supabase/`.

## What this app is not

This is a tracking and analytics tool — **not a financial advisor**. It
never generates investment recommendations or guaranteed-return claims;
projections (NPS corpus, FD maturity) are always labeled as estimates
built on assumptions you control.
