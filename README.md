# Wealth — Personal Investment Dashboard

A card-first, Material-inspired personal investment and wealth-tracking web
application, covering the full spread of Indian personal finance in one
place: stocks/ETFs/mutual funds/crypto/bonds, Bank Accounts, Fixed Deposits,
NPS (real per-scheme E/C/G/A tracking), PPF, Liabilities, Goals, and a
Watchlist.

**Live:** https://wealth-dashboard-rouge.vercel.app/

Single-user, cloud-first. Authentication is on (Supabase Auth + Row Level
Security on every table) — see [ARCHITECTURE.md](./ARCHITECTURE.md) for the
full reasoning.

## Stack

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · Recharts · Framer-Motion-ready · Radix UI primitives
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Validation:** Zod
- **Testing:** Vitest (77+ tests — calculation layer, including real-world edge cases)
- **Deployment:** Vercel + GitHub

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **No setup required** —
without a `.env.local`, the app runs in **demo mode**: an in-memory seed
dataset (fictional data) so every screen is explorable immediately, no login
needed. Demo mode data resets on server restart; it is a development
convenience, not a second production data path.

To connect a real Supabase project so your data persists (and auth is
required), see [SETUP.md](./SETUP.md).

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run start    # run the production build
npm run test     # run the Vitest suite (calculation layer)
npm run lint     # ESLint
```

## Features

- **Holdings hub** (`/holdings`) — every asset category as a sorted-by-value card, routing to its own detail page
- **Dashboard** — net worth, day change, top holdings, allocation, maturity/reminder bell, "Refresh all" live prices
- **Portfolio** — grouped by asset class, per-asset XIRR
- **Transactions** — paginated table, CSV import/export, inline edit
- **Analytics** — pooled portfolio XIRR/CAGR, risk metrics (volatility/Sharpe/Sortino), growth projections
- **NPS** — real per-scheme (E/C/G/A) unit × NAV tracking, statement import (NSDL/Protean `.xlsx`), live NAV via npsnav.in
- **PPF** — principal/interest split, 15-year maturity rule
- **Fixed Deposits** — maturity tracking, edit, partial withdrawal
- **Bank Accounts / Liabilities** — liabilities subtracted from net worth
- **Goals** and **Watchlist**
- **Tax-loss harvesting** (`/tax-harvesting`) — Indian capital-gains classification (short/long-term, flat-rate crypto/VDA under Section 115BBH); informational only, not tax advice
- **Backup/Restore** — JSON export/import of your data
- Live price refresh across Yahoo/CoinGecko/mfapi.in/npsnav.in, with a demo-mode in-memory fallback on every data layer

See `PROJECT-STATUS.md` for what's still open/in progress and known gaps.

## Project structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full folder-by-folder
breakdown, data-flow diagrams, and the reasoning behind each architectural
decision. In short:

```
src/
  app/            Next.js routes (thin — compose features + fetch data)
  features/       Screen-specific components, Server Actions, hooks
                  (holdings, portfolio, transactions, analytics, nps, ppf,
                  goals, watchlist, fixed-deposits, bank-accounts,
                  liabilities, backup, auth, notifications, search, dashboard)
  components/     ui (primitives) / shared (cross-feature) / layout / charts
  lib/            calculations (pure) / database (Supabase) / services /
                  market-data / import / validation / utils
  types/          Domain models + database row types
  constants/      Asset types, routes, chart periods
```

## Database

See [DATABASE.md](./DATABASE.md) for the full schema, relationships,
constraints, and indexes. Schema and seed data live in `supabase/`
(`schema.sql` for fresh installs, `sync-schema.sql` — idempotent, safe to
rerun any time — for keeping an existing deployed DB in sync).

## What this app is not

This is a tracking and analytics tool — **not a financial advisor**. It
never generates investment recommendations or guaranteed-return claims;
projections (NPS corpus, FD maturity) are always labeled as estimates
built on assumptions you control. Tax-related output (tax-loss harvesting)
is informational only — verify anything consequential with a CA before
acting on it.
