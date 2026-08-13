# Database

PostgreSQL via Supabase. Full DDL lives in [`supabase/schema.sql`](./supabase/schema.sql);
fictional development seed data lives in [`supabase/seed.sql`](./supabase/seed.sql)
(mirrors `src/lib/database/demo-data.ts`, the in-memory fallback used when no
Supabase project is configured).

## Conventions

- **Primary keys:** `uuid default gen_random_uuid()` everywhere.
- **Monetary values:** `numeric(18,4)` — never `float`/`double`, to avoid
  floating-point drift in P&L math. 4 decimal places covers fractional
  crypto/mutual-fund units.
- **Percentages that are persisted** (e.g. `interest_rate`): `numeric(9,4)`.
  Most percentages (allocation %, return %) are *computed*, not stored.
- **Timestamps:** `created_at` / `updated_at` as `timestamptz`, the latter
  maintained by a trigger (`set_updated_at()`).
- **No `users` table, no `user_id` column anywhere.** V1 is single-user by
  design — see "Adding authentication later" below.

## Tables

### `assets`
Securities and crypto (stocks, ETFs, mutual funds, crypto, cash). Fixed
deposits and NPS are **not** rows here — see "Why FD/NPS are separate
tables" below. Five metadata columns (`exchange`, `sector`, `country`,
`isin`, `currency`) are nullable and unused by V1 logic — reserved for
future analytics without a schema migration.

### `transactions`
**The source of truth for traded assets.** Holdings, weighted-average cost,
and realized/unrealized P&L are always *derived* from this table on read —
never stored, never manually edited. `quantity`, `price`, `fees`, `taxes`
are the actual inputs a broker statement gives you; gross trade value and
net cash flow are computed from these (see `lib/calculations/cashflow.ts`),
never stored redundantly.

### `portfolio_snapshots`
A **unified net-worth snapshot** — securities + FD + NPS + cash — at most
one per calendar date (`snapshot_date unique`). Written by
`snapshot.service.ts`, which calls the same Portfolio Aggregation service
the dashboard reads from, so this can never drift from what's shown live.
`invested_capital` specifically means securities+crypto cost basis (matches
`calculateInvestedAmount`) — FD/NPS capital lives inside `fd_value`/`nps_value`
instead, not folded into `invested_capital`.

### `goals`, `fixed_deposits`, `nps_accounts`, `nps_contributions`, `watchlist_items`
Standalone tables for their respective features. `watchlist_items` has a
FK to `assets` (reusing the same row shape) but is otherwise independent —
holding status is derived from whether transactions exist against that
asset, not stored as a flag, so the same asset can be both held and watched.

## Why FD/NPS are separate tables, not rows in `assets`

Their fields (interest rate, tenure, PRAN, employer contributions) don't
fit the `assets` shape — forcing them in would mean a wide, mostly-null
table. The trade-off: the dashboard's Asset Allocation card has to union
three sources (`assets`+`transactions`, `fixed_deposits`, `nps_accounts`)
rather than one query. This union happens in
`lib/services/portfolio.service.ts`, the single aggregation point for
cross-asset-class views — no UI code does this unioning itself.

## Indexes

- `assets (symbol, asset_type)` unique — find-or-create on transaction entry
- `assets.isin` unique where not null
- `assets.is_active` — filtering out soft-deleted assets
- `transactions (asset_id, transaction_date)` — per-asset history in date order
- `portfolio_snapshots.snapshot_date` — range queries for performance charts
- `fixed_deposits.maturity_date` — upcoming-maturity queries
- `nps_contributions (nps_account_id, contribution_date)`

## Adding authentication later

V1 intentionally has no `users` table, no `user_id` column, and no RLS.
When authentication is introduced:

1. Add a nullable `user_id uuid references auth.users(id)` to every table
   above, backfill it, then make it `NOT NULL`.
2. Enable RLS on every table; add policies scoping rows to `auth.uid() = user_id`.
3. Update every repository in `src/lib/database/repositories/*` to filter
   by the current user. **This is the only layer that needs to change** —
   services, calculations, and UI components never talk to Supabase
   directly, so they're untouched by this migration.
