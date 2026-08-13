# Architecture (as built)

This is the as-implemented record of the approved Revision 2 architecture.
For the original review documents, see the two architecture chat responses
this project was approved from; this file reflects what actually shipped.

## Layering

```
UI (Server + Client Components)
   ↓
Feature components (features/*/components)
   ↓
Hooks (client) / Server Actions (features/*/actions.ts)
   ↓
Services (lib/services/*) — business logic, orchestrates repositories + calculations
   ↓
Repositories (lib/database/repositories/*) — the ONLY layer that talks to Supabase
   ↓
Supabase client (lib/database/client.ts) → PostgreSQL
```

**Aggregation rule:** the dashboard, and any other cross-asset-class screen,
depends only on `lib/services/portfolio.service.ts` — never on
`fd.repository`, `nps.repository`, etc. directly. Feature-specific screens
(the FD and NPS pages themselves) use their own feature-scoped services.

## Folder structure

```
src/
  app/                          Next.js routes — thin, compose features + fetch data
    (app)/                      route group: dashboard, portfolio, transactions,
                                 analytics, goals, fixed-deposits, nps, watchlist
                                 (shares Sidebar/MobileNav/CommandPalette via layout.tsx)
    page.tsx                    landing page (outside the route group — no shell)
  features/                     one folder per screen/domain
    dashboard/  portfolio/  transactions/  analytics/  goals/
    fixed-deposits/  nps/  watchlist/  search/
    each has components/ + actions.ts (Server Actions) where mutations exist
  components/
    ui/                         shadcn-style primitives (Button, Card, Dialog, Select, Tabs, ...)
    shared/                     MetricCard, InvestmentCard, GoalCard, FDCard, ActivityCard,
                                 EmptyState, ConfirmDialog, CurrencyInput/PercentageInput/DateInput
    layout/                     Sidebar, TopBar, MobileNav, ThemeProvider
    charts/                     ChartCard, AllocationDonut, PerformanceLineChart, Sparkline
  lib/
    calculations/                pure functions, zero React/Next/Supabase imports
    database/                   client.ts (+ demo-mode fallback), repositories/*, demo-data.ts
    services/                   portfolio, transactions, fd, nps, snapshot
    market-data/                provider interface + manual + mock implementations
    validation/                  Zod schemas
    utils/                      cn, currency, date, csv-export
  types/
    domain/                     Asset, Transaction, Holding, Goal, FixedDeposit, NPS*, Snapshot
    database.ts                 hand-written row types mirroring supabase/schema.sql
  constants/                   asset-types, routes, chart-periods
```

## Calculation architecture — average cost vs. FIFO, kept separate

`lib/calculations/holdings.ts` computes **weighted-average cost** (what's
shown as "avg. cost", invested amount, unrealized P&L). `lib/calculations/lots.ts`
computes **FIFO lot matching**, used *only* for realized P&L. These never
feed into each other — a SELL reduces weighted-average cost proportionally
without touching the average of what remains, while FIFO tracks which
specific units were sold for realized P&L purposes. Both consume the same
`netCashFlow()` helper from `lib/calculations/cashflow.ts` so fee/tax
handling can never diverge between the two.

Every "insufficient data" case (XIRR with one cash flow, volatility with
too few snapshots) returns a typed `CalcResult<T>` —
`{ status: 'ok', value } | { status: 'insufficient_data', reason }` —
rather than `null`/`NaN`. `StatTile` (analytics) and `XIRRCard` (dashboard)
render the "not enough data yet" state directly from this, so there's no
ad-hoc null-checking scattered across components.

## Portfolio Valuation / Aggregation Service

`lib/services/portfolio.service.ts` unions securities, crypto, cash, fixed
deposits, and NPS into one financial picture:

```
getPortfolioSummary()      net worth, invested capital, current value, realized/unrealized P&L, day change
getHoldings()               all derived holdings, sorted by value
getTopHoldings(limit)
getNetWorth()
getAssetAllocation()        unions ALL asset classes into percentage slices
getPortfolioPerformance(period)   reads portfolio_snapshots, filtered by period
getRecentActivity(limit)    recent transactions across asset classes
```

The dashboard page (`app/(app)/dashboard/page.tsx`) calls only this
service (plus `fdService`/`goalsRepository` for the FD-maturities and
goals cards, which are single-asset-class widgets, not aggregation).

## Snapshots

`lib/services/snapshot.service.ts` writes today's `portfolio_snapshots` row
by calling `portfolioService.getPortfolioSummary()` and `getAssetAllocation()`
— the same functions the dashboard reads from — so the snapshot history can
never disagree with what's shown live. It's called opportunistically at the
top of the dashboard page render; there is no cron/scheduler in V1 (see
"Known trade-offs" below).

## Transaction accounting

`lib/calculations/cashflow.ts` is the single source of truth for fee/tax
handling:

```
grossValue   = quantity * price
netCashFlow  = BUY  → -(grossValue + fees + taxes)
               SELL →   grossValue - fees - taxes
```

`quantity`, `price`, `fees`, `taxes` are stored (they're the actual broker
statement inputs); gross value and net cash flow are always derived from
them, never stored redundantly.

## Edit Asset vs. Add/Edit Transaction

Two separate dialogs, two separate Server Action files:
- `features/portfolio/components/edit-asset-dialog.tsx` → `updateAssetMetadataAction`
  / `updateAssetPriceAction` — name, exchange/sector/country/ISIN, current
  price, notes. **Never touches quantity or cost basis.**
- `features/transactions/components/transaction-dialog.tsx` → `addInvestmentAction`
  (new asset + first transaction) / `addTransactionAction` (existing asset)
  — BUY/SELL history. **Never edits asset metadata.**

## Design system (as implemented)

- **Typography:** Fraunces (display/serif, big numbers) + Inter (UI/body,
  tabular figures via `font-tabular`) + IBM Plex Mono (symbols/tickers).
  Loaded via a runtime `<link>` in `app/layout.tsx`, not `next/font/google`
  — `next/font` fetches at *build* time, which fails in network-restricted
  build environments; a `<link>` defers the fetch to the browser and is
  functionally identical once deployed.
- **Palette:** warm-neutral surfaces (`--surface`, `--surface-raised`,
  `--surface-sunken`) + a muted gold accent (`--accent`). Gain/loss states
  use desaturated green/red (`--gain`, `--loss`), always paired with an
  icon and a +/- sign, never color alone.
- **Radius/elevation:** cards `rounded-2xl`, controls `rounded-lg`, flat
  surfaces with a 1px border rather than heavy shadows (Material 3 tonal
  style); shadow reserved for modals/popovers.
- **Light/dark:** `ThemeProvider` toggles a `.dark` class on `<html>`,
  persisted to `localStorage`; all tokens are CSS variables redefined
  under `.dark` in `globals.css`.
- **Dashboard bento layout:** implemented with explicit `md:col-span-*` /
  `lg:col-span-*` / `md:row-span-*` spans in `app/(app)/dashboard/page.tsx`
  — Net Worth and the Performance chart are the dominant cards, Top
  Holdings spans two rows, everything else is compact. Not a uniform
  `grid-auto-fit` grid.

## Market data abstraction

`lib/market-data/provider.ts` defines `MarketDataProvider` (`getQuote`,
`getHistoricalPrices`). V1 ships `manual-provider.ts` (reads whatever price
was last entered via Edit Asset — the real V1 behavior) and
`mock-provider.ts` (deterministic pseudo-random walk, **development only**,
labeled `source: "mock"` end-to-end, never used by any page). A real quote
API can be plugged in later without touching any calling code.

## Demo mode

`lib/database/client.ts` exports `isDemoMode()` — true whenever
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset. Every
repository checks this flag and falls back to the in-memory dataset in
`lib/database/demo-data.ts` instead of querying Supabase. This is a
development convenience so the app is fully explorable with zero setup —
not a second production data path. All eight `(app)` route pages are
`force-dynamic` (see below) so demo-mode mutations show up immediately.

## Why every data page is `force-dynamic`

Next.js statically prerenders pages with no dynamic APIs by default. Since
demo-mode data lives in mutable module state (and a real Supabase-backed
deployment needs fresh reads on every request regardless), every page in
`app/(app)/*` sets `export const dynamic = "force-dynamic"`. Only the
landing page (`app/page.tsx`) is genuinely static.

## Known trade-offs (unchanged from the approved architecture review)

1. `invested_capital` in `portfolio_snapshots` means securities+crypto cost
   basis only — FD/NPS capital lives inside `fd_value`/`nps_value` instead.
2. Snapshot cadence is "on dashboard view," not a cron job — freshness is
   bounded by how often you open the app. Acceptable for personal use.
3. FIFO lot matching and holdings are both recomputed on every read (no
   caching) — cheap at single-user transaction volumes; if this ever
   becomes perceptible, the fix is per-request memoization, not a schema
   change.
4. `portfolio.service.ts` is the required home for any future asset class
   (e.g. real estate) — new classes get a method added here, not a
   parallel ad-hoc aggregation elsewhere.
5. `exchange`/`sector`/`country`/`isin`/`currency` on `assets` are nullable
   and unenforced — schema-ready for V2 analytics, not feature-ready yet.

## V1 / V2 / Future boundary (as built)

**Shipped in V1:** dashboard (bento layout with Net Worth, XIRR, Allocation,
Portfolio Value, Top Holdings, Performance chart, Recent Activity, Goals,
FD Maturities), portfolio (card/table toggle, Add Investment), investment
detail (Edit Asset + Add Transaction as separate flows, transaction
history with delete), transactions (list + CSV export), analytics (Returns:
CAGR/XIRR/realized/unrealized; Risk: volatility/max drawdown/Sharpe/Sortino;
Portfolio: allocation + concentration), goals, fixed deposits, NPS (with
projection chart + editable assumptions), watchlist, Cmd+K search, manual
price entry + mock provider, light/dark mode, responsive layout, demo seed
data, Vitest coverage of the calculation layer.

**Designed for, not built:** a real `MarketDataProvider`, a `prices_history`
table for automatic historical snapshots, CSV import, authentication
(`user_id` + RLS — see DATABASE.md), rolling-return charts, contribution
analysis, an accrued-interest model for live FD valuation (V1 approximates
FD current value as principal).

**Not designed for yet:** brokerage integrations, multi-user/family
accounts, notifications, AI-assisted insights, portfolio optimization.
