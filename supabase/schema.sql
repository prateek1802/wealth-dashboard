-- Wealth Dashboard — PostgreSQL schema (Supabase)
-- See DATABASE.md for the full ERD write-up and rationale.
--
-- Conventions:
--   * All PKs are uuid, generated with gen_random_uuid().
--   * All monetary values use numeric(18,4) — never float/double — to avoid
--     floating-point drift in P&L math. Percentages that are persisted
--     (interest_rate) use numeric(9,4).
--   * created_at / updated_at are timestamptz, updated_at maintained by
--     the trigger below.
--   * No `users` table and no `user_id` column anywhere — V1 is single-user
--     (see ARCHITECTURE.md "Security" for what changes when auth is added).

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================================
-- assets
-- =========================================================================
create table assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text not null,
  asset_type text not null check (asset_type in ('stock_in', 'stock_us', 'etf', 'mutual_fund', 'mutual_fund_debt', 'bond', 'crypto', 'cash', 'other')),
  currency text not null default 'INR',
  -- Nullable metadata reserved for future analytics (sector/country/exchange
  -- breakdowns) — untouched by V1 logic, schema-ready rather than feature-ready.
  exchange text,
  sector text,
  country text,
  isin text,
  current_price numeric(18,4),
  current_price_updated_at timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (symbol, asset_type)
);
create unique index assets_isin_unique on assets (isin) where isin is not null;
create index assets_is_active_idx on assets (is_active);
create trigger assets_set_updated_at before update on assets
  for each row execute function set_updated_at();

-- =========================================================================
-- transactions — the source of truth for traded assets. Holdings, average
-- cost, and P&L are always DERIVED from this table, never stored.
-- =========================================================================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('BUY', 'SELL')),
  quantity numeric(18,6) not null check (quantity > 0),
  price numeric(18,4) not null check (price >= 0),
  fees numeric(18,4) not null default 0 check (fees >= 0),
  taxes numeric(18,4) not null default 0 check (taxes >= 0),
  transaction_date date not null,
  broker text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_asset_date_idx on transactions (asset_id, transaction_date);
create trigger transactions_set_updated_at before update on transactions
  for each row execute function set_updated_at();

-- =========================================================================
-- portfolio_snapshots — UNIFIED net-worth snapshot (securities + FD + NPS +
-- PPF + cash), at most one per calendar date. Written by snapshot.service.ts,
-- which calls the SAME aggregation service the dashboard reads from, so
-- this can never drift from what's shown live.
-- =========================================================================
create table portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  net_worth numeric(18,4) not null,
  invested_capital numeric(18,4) not null,   -- securities + crypto cost basis ONLY — see ARCHITECTURE.md trade-off #1
  securities_value numeric(18,4) not null,
  realized_pnl numeric(18,4) not null,
  unrealized_pnl numeric(18,4) not null,
  fd_value numeric(18,4) not null default 0,
  nps_value numeric(18,4) not null default 0,
  ppf_value numeric(18,4) not null default 0,
  cash_value numeric(18,4) not null default 0,
  allocation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index portfolio_snapshots_date_idx on portfolio_snapshots (snapshot_date);

-- =========================================================================
-- goals
-- =========================================================================
create table goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric(18,4) not null check (target_amount > 0),
  current_amount numeric(18,4) not null default 0 check (current_amount >= 0),
  target_date date,
  category text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger goals_set_updated_at before update on goals
  for each row execute function set_updated_at();

-- =========================================================================
-- fixed_deposits — a distinct asset class from `assets` (its fields don't
-- fit that shape well; see ARCHITECTURE.md concern #2).
-- =========================================================================
create table fixed_deposits (
  id uuid primary key default gen_random_uuid(),
  institution text not null,
  principal numeric(18,4) not null check (principal > 0),
  interest_rate numeric(9,4) not null check (interest_rate > 0),
  start_date date not null,
  maturity_date date not null,
  tenure_months integer not null check (tenure_months > 0),
  payout_type text not null check (payout_type in ('cumulative', 'monthly', 'quarterly', 'annual')),
  maturity_amount numeric(18,4),
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  withdrawal_date date,
  withdrawal_amount numeric(18,4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (maturity_date > start_date)
);
create index fixed_deposits_maturity_idx on fixed_deposits (maturity_date);
create trigger fixed_deposits_set_updated_at before update on fixed_deposits
  for each row execute function set_updated_at();

-- =========================================================================
-- nps_accounts / nps_contributions
-- =========================================================================
create table nps_accounts (
  id uuid primary key default gen_random_uuid(),
  tier text not null default 'Tier I' check (tier in ('Tier I', 'Tier II')),
  pension_fund_manager text,
  pran text,
  current_corpus numeric(18,4) not null default 0,
  expected_annual_return numeric(9,4),
  monthly_contribution numeric(18,4),
  annual_contribution_increase numeric(9,4),
  retirement_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger nps_accounts_set_updated_at before update on nps_accounts
  for each row execute function set_updated_at();

create table nps_contributions (
  id uuid primary key default gen_random_uuid(),
  nps_account_id uuid not null references nps_accounts(id) on delete cascade,
  contribution_date date not null,
  employee_amount numeric(18,4) not null default 0 check (employee_amount >= 0),
  employer_amount numeric(18,4) not null default 0 check (employer_amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index nps_contributions_account_date_idx on nps_contributions (nps_account_id, contribution_date);

-- =========================================================================
-- bank_accounts — cash, tracked as savings/current/salary accounts rather
-- than as a security. Feeds cash_value in portfolio_snapshots and the
-- "Cash" bucket in the segregated breakdown.
-- =========================================================================
create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_type text not null check (account_type in ('savings', 'current', 'salary', 'nre_nro', 'other')),
  current_balance numeric(18,4) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger bank_accounts_set_updated_at before update on bank_accounts
  for each row execute function set_updated_at();

-- =========================================================================
-- ppf_accounts — Public Provident Fund. A distinct asset class, not a row
-- in `assets` (statutory account, government-set rate, no market price).
-- =========================================================================
create table ppf_accounts (
  id uuid primary key default gen_random_uuid(),
  account_number text,
  current_balance numeric(18,4) not null default 0,
  total_contributed numeric(18,4) not null default 0,  -- principal — your own deposits; interest earned = current_balance + total_withdrawn - total_contributed, derived not stored
  total_withdrawn numeric(18,4) not null default 0,     -- running sum of partial withdrawals taken out over the account's life
  interest_rate numeric(9,4) not null,
  open_date date not null,
  yearly_contribution numeric(18,4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger ppf_accounts_set_updated_at before update on ppf_accounts
  for each row execute function set_updated_at();

-- =========================================================================
-- price_history — one row per asset per calendar date, written whenever a
-- price is actually updated (Edit Asset's manual entry, or Refresh Prices).
-- NEVER fabricated or backfilled — a gap in history just means the price
-- wasn't updated that day. This is what powers the per-asset performance
-- chart on the investment detail page.
-- =========================================================================
create table price_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  price numeric(18,4) not null,
  recorded_date date not null,
  created_at timestamptz not null default now(),
  unique (asset_id, recorded_date)
);
create index price_history_asset_date_idx on price_history (asset_id, recorded_date);

-- =========================================================================
-- watchlist_items — reuses `assets`; a watched asset is NOT a holding.
-- Holding status is derived from whether transactions exist, not stored.
-- =========================================================================
create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  target_price numeric(18,4),
  stop_loss numeric(18,4),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id)
);
create trigger watchlist_items_set_updated_at before update on watchlist_items
  for each row execute function set_updated_at();

-- =========================================================================
-- NOTE ON ROW LEVEL SECURITY
-- V1 is deliberately single-user and does NOT enable RLS (see MASTER PROMPT
-- "Security"). When authentication is introduced later:
--   1. Add a `user_id uuid references auth.users(id)` column to every table
--      above (nullable at first, backfilled, then made NOT NULL).
--   2. Enable RLS on every table and add policies scoping each row to
--      auth.uid() = user_id.
--   3. Update every repository in src/lib/database/repositories to filter
--      by the current user — this is the ONLY layer that needs to change;
--      services, calculations, and UI are untouched by this migration.
-- =========================================================================
