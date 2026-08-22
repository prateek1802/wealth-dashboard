-- Wealth Dashboard — SAFE-TO-RERUN schema sync.
-- =========================================================================
-- Run this any time you're not sure your Supabase project's schema matches
-- the current app — after pulling a patch that touched supabase/schema.sql,
-- for instance. Every statement here is idempotent: tables use
-- IF NOT EXISTS, columns use ADD COLUMN IF NOT EXISTS, indexes use
-- IF NOT EXISTS, and policies are dropped-then-recreated (Postgres has no
-- CREATE POLICY IF NOT EXISTS). Running this on a project that's already
-- fully up to date is a safe no-op.
--
-- For a brand-new project, schema.sql and this file do the same thing —
-- use whichever's convenient. This file exists for projects that were set
-- up before later changes to schema.sql.
-- =========================================================================

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---- assets ----
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table assets add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table assets add column if not exists symbol text not null default '';
alter table assets add column if not exists name text not null default '';
alter table assets add column if not exists asset_type text not null default 'other';
alter table assets add column if not exists currency text not null default 'INR';
alter table assets add column if not exists exchange text;
alter table assets add column if not exists sector text;
alter table assets add column if not exists country text;
alter table assets add column if not exists isin text;
alter table assets add column if not exists current_price numeric(18,4);
alter table assets add column if not exists current_price_updated_at timestamptz;
alter table assets add column if not exists is_active boolean not null default true;
alter table assets add column if not exists notes text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'assets_asset_type_check') then
    alter table assets add constraint assets_asset_type_check
      check (asset_type in ('stock_in', 'stock_us', 'etf', 'mutual_fund', 'mutual_fund_debt', 'bond', 'crypto', 'cash', 'other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assets_symbol_asset_type_key') then
    alter table assets add constraint assets_symbol_asset_type_key unique (symbol, asset_type);
  end if;
end $$;
create unique index if not exists assets_isin_unique on assets (isin) where isin is not null;
create index if not exists assets_is_active_idx on assets (is_active);
create index if not exists assets_user_id_idx on assets (user_id);
drop trigger if exists assets_set_updated_at on assets;
create trigger assets_set_updated_at before update on assets for each row execute function set_updated_at();

-- ---- transactions ----
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table transactions add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table transactions add column if not exists asset_id uuid references assets(id) on delete cascade;
alter table transactions add column if not exists transaction_type text not null default 'BUY';
alter table transactions add column if not exists quantity numeric(18,6) not null default 0;
alter table transactions add column if not exists price numeric(18,4) not null default 0;
alter table transactions add column if not exists fees numeric(18,4) not null default 0;
alter table transactions add column if not exists taxes numeric(18,4) not null default 0;
alter table transactions add column if not exists transaction_date date not null default current_date;
alter table transactions add column if not exists broker text;
alter table transactions add column if not exists notes text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_transaction_type_check') then
    alter table transactions add constraint transactions_transaction_type_check check (transaction_type in ('BUY', 'SELL'));
  end if;
end $$;
create index if not exists transactions_asset_date_idx on transactions (asset_id, transaction_date);
create index if not exists transactions_user_id_idx on transactions (user_id);
drop trigger if exists transactions_set_updated_at on transactions;
create trigger transactions_set_updated_at before update on transactions for each row execute function set_updated_at();

-- ---- portfolio_snapshots ----
create table if not exists portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table portfolio_snapshots add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table portfolio_snapshots add column if not exists snapshot_date date not null default current_date;
alter table portfolio_snapshots add column if not exists net_worth numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists invested_capital numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists securities_value numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists realized_pnl numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists unrealized_pnl numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists fd_value numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists nps_value numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists ppf_value numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists cash_value numeric(18,4) not null default 0;
alter table portfolio_snapshots add column if not exists allocation_snapshot jsonb not null default '{}'::jsonb;
-- Fix: this used to be globally unique on snapshot_date alone (a bug from
-- before multi-user support) — needs to be unique PER USER instead.
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'portfolio_snapshots_snapshot_date_key') then
    alter table portfolio_snapshots drop constraint portfolio_snapshots_snapshot_date_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'portfolio_snapshots_user_date_key') then
    alter table portfolio_snapshots add constraint portfolio_snapshots_user_date_key unique (user_id, snapshot_date);
  end if;
end $$;
create index if not exists portfolio_snapshots_date_idx on portfolio_snapshots (snapshot_date);
create index if not exists portfolio_snapshots_user_id_idx on portfolio_snapshots (user_id);

-- ---- goals ----
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table goals add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table goals add column if not exists name text not null default '';
alter table goals add column if not exists target_amount numeric(18,4) not null default 0;
alter table goals add column if not exists current_amount numeric(18,4) not null default 0;
alter table goals add column if not exists target_date date;
alter table goals add column if not exists category text;
alter table goals add column if not exists description text;
create index if not exists goals_user_id_idx on goals (user_id);
drop trigger if exists goals_set_updated_at on goals;
create trigger goals_set_updated_at before update on goals for each row execute function set_updated_at();

-- ---- fixed_deposits ----
create table if not exists fixed_deposits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table fixed_deposits add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table fixed_deposits add column if not exists institution text not null default '';
alter table fixed_deposits add column if not exists principal numeric(18,4) not null default 0;
alter table fixed_deposits add column if not exists interest_rate numeric(9,4) not null default 0;
alter table fixed_deposits add column if not exists start_date date not null default current_date;
alter table fixed_deposits add column if not exists maturity_date date not null default current_date;
alter table fixed_deposits add column if not exists tenure_months integer not null default 12;
alter table fixed_deposits add column if not exists payout_type text not null default 'cumulative';
alter table fixed_deposits add column if not exists maturity_amount numeric(18,4);
alter table fixed_deposits add column if not exists status text not null default 'active';
alter table fixed_deposits add column if not exists withdrawal_date date;
alter table fixed_deposits add column if not exists withdrawal_amount numeric(18,4);
alter table fixed_deposits add column if not exists notes text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fixed_deposits_status_check') then
    alter table fixed_deposits add constraint fixed_deposits_status_check check (status in ('active', 'withdrawn'));
  end if;
end $$;
create index if not exists fixed_deposits_maturity_idx on fixed_deposits (maturity_date);
create index if not exists fixed_deposits_user_id_idx on fixed_deposits (user_id);
drop trigger if exists fixed_deposits_set_updated_at on fixed_deposits;
create trigger fixed_deposits_set_updated_at before update on fixed_deposits for each row execute function set_updated_at();

-- ---- nps_accounts / nps_contributions ----
create table if not exists nps_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table nps_accounts add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table nps_accounts add column if not exists tier text not null default 'Tier I';
alter table nps_accounts add column if not exists pension_fund_manager text;
alter table nps_accounts add column if not exists scheme_preference text;
alter table nps_accounts add column if not exists pran text;
alter table nps_accounts add column if not exists current_corpus numeric(18,4) not null default 0;
alter table nps_accounts add column if not exists expected_annual_return numeric(9,4);
alter table nps_accounts add column if not exists monthly_contribution numeric(18,4);
alter table nps_accounts add column if not exists annual_contribution_increase numeric(9,4);
alter table nps_accounts add column if not exists retirement_year integer;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'nps_accounts_tier_check') then
    alter table nps_accounts add constraint nps_accounts_tier_check check (tier in ('Tier I', 'Tier II'));
  end if;
end $$;
create index if not exists nps_accounts_user_id_idx on nps_accounts (user_id);
drop trigger if exists nps_accounts_set_updated_at on nps_accounts;
create trigger nps_accounts_set_updated_at before update on nps_accounts for each row execute function set_updated_at();

create table if not exists nps_contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table nps_contributions add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table nps_contributions add column if not exists nps_account_id uuid references nps_accounts(id) on delete cascade;
alter table nps_contributions add column if not exists contribution_date date not null default current_date;
alter table nps_contributions add column if not exists employee_amount numeric(18,4) not null default 0;
alter table nps_contributions add column if not exists employer_amount numeric(18,4) not null default 0;
alter table nps_contributions add column if not exists notes text;
create index if not exists nps_contributions_account_date_idx on nps_contributions (nps_account_id, contribution_date);
create index if not exists nps_contributions_user_id_idx on nps_contributions (user_id);

-- ---- nps_scheme_holdings / nps_scheme_transactions ----
create table if not exists nps_scheme_holdings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table nps_scheme_holdings add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table nps_scheme_holdings add column if not exists nps_account_id uuid references nps_accounts(id) on delete cascade;
alter table nps_scheme_holdings add column if not exists scheme text;
alter table nps_scheme_holdings add column if not exists units_held numeric(18,4) not null default 0;
alter table nps_scheme_holdings add column if not exists last_nav numeric(12,4);
alter table nps_scheme_holdings add column if not exists last_nav_date date;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'nps_scheme_holdings_account_scheme_key') then
    alter table nps_scheme_holdings add constraint nps_scheme_holdings_account_scheme_key unique (nps_account_id, scheme);
  end if;
end $$;
drop trigger if exists nps_scheme_holdings_set_updated_at on nps_scheme_holdings;
create trigger nps_scheme_holdings_set_updated_at before update on nps_scheme_holdings
  for each row execute function set_updated_at();

create table if not exists nps_scheme_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table nps_scheme_transactions add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table nps_scheme_transactions add column if not exists nps_account_id uuid references nps_accounts(id) on delete cascade;
alter table nps_scheme_transactions add column if not exists scheme text;
alter table nps_scheme_transactions add column if not exists transaction_date date;
alter table nps_scheme_transactions add column if not exists transaction_type text;
alter table nps_scheme_transactions add column if not exists amount numeric(18,4);
alter table nps_scheme_transactions add column if not exists nav numeric(12,4);
alter table nps_scheme_transactions add column if not exists units numeric(18,4);
alter table nps_scheme_transactions add column if not exists employee_amount numeric(18,4);
alter table nps_scheme_transactions add column if not exists employer_amount numeric(18,4);
alter table nps_scheme_transactions add column if not exists linked_transaction_id uuid references nps_scheme_transactions(id);
alter table nps_scheme_transactions add column if not exists description text;
create index if not exists nps_scheme_transactions_account_date_idx
  on nps_scheme_transactions (nps_account_id, transaction_date);
create index if not exists nps_scheme_transactions_user_id_idx on nps_scheme_transactions (user_id);
-- Idempotent-import dedup key (see Part 8 of the NPS rewrite spec).
create unique index if not exists nps_scheme_transactions_dedup_idx
  on nps_scheme_transactions (nps_account_id, scheme, transaction_date, description, units);

-- ---- bank_accounts ----
create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table bank_accounts add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table bank_accounts add column if not exists bank_name text not null default '';
alter table bank_accounts add column if not exists account_type text not null default 'savings';
alter table bank_accounts add column if not exists current_balance numeric(18,4) not null default 0;
alter table bank_accounts add column if not exists notes text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bank_accounts_account_type_check') then
    alter table bank_accounts add constraint bank_accounts_account_type_check check (account_type in ('savings', 'current', 'salary', 'nre_nro', 'other'));
  end if;
end $$;
create index if not exists bank_accounts_user_id_idx on bank_accounts (user_id);
drop trigger if exists bank_accounts_set_updated_at on bank_accounts;
create trigger bank_accounts_set_updated_at before update on bank_accounts for each row execute function set_updated_at();

-- ---- ppf_accounts ----
create table if not exists ppf_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table ppf_accounts add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table ppf_accounts add column if not exists account_number text;
alter table ppf_accounts add column if not exists current_balance numeric(18,4) not null default 0;
alter table ppf_accounts add column if not exists total_contributed numeric(18,4) not null default 0;
alter table ppf_accounts add column if not exists total_withdrawn numeric(18,4) not null default 0;
alter table ppf_accounts add column if not exists interest_rate numeric(9,4) not null default 0;
alter table ppf_accounts add column if not exists open_date date not null default current_date;
alter table ppf_accounts add column if not exists yearly_contribution numeric(18,4);
alter table ppf_accounts add column if not exists notes text;
create index if not exists ppf_accounts_user_id_idx on ppf_accounts (user_id);
drop trigger if exists ppf_accounts_set_updated_at on ppf_accounts;
create trigger ppf_accounts_set_updated_at before update on ppf_accounts for each row execute function set_updated_at();

-- ---- price_history ----
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table price_history add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table price_history add column if not exists asset_id uuid references assets(id) on delete cascade;
alter table price_history add column if not exists price numeric(18,4) not null default 0;
alter table price_history add column if not exists recorded_date date not null default current_date;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'price_history_asset_id_recorded_date_key') then
    alter table price_history add constraint price_history_asset_id_recorded_date_key unique (asset_id, recorded_date);
  end if;
end $$;
create index if not exists price_history_asset_date_idx on price_history (asset_id, recorded_date);
create index if not exists price_history_user_id_idx on price_history (user_id);

-- ---- liabilities ----
create table if not exists liabilities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table liabilities add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table liabilities add column if not exists name text not null default '';
alter table liabilities add column if not exists liability_type text not null default 'other';
alter table liabilities add column if not exists amount_owed numeric(18,4) not null default 0;
alter table liabilities add column if not exists interest_rate numeric(9,4);
alter table liabilities add column if not exists notes text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'liabilities_liability_type_check') then
    alter table liabilities add constraint liabilities_liability_type_check check (liability_type in ('credit_card', 'personal_loan', 'home_loan', 'vehicle_loan', 'other'));
  end if;
end $$;
create index if not exists liabilities_user_id_idx on liabilities (user_id);
drop trigger if exists liabilities_set_updated_at on liabilities;
create trigger liabilities_set_updated_at before update on liabilities for each row execute function set_updated_at();

-- ---- watchlist_items ----
create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table watchlist_items add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table watchlist_items add column if not exists asset_id uuid references assets(id) on delete cascade;
alter table watchlist_items add column if not exists target_price numeric(18,4);
alter table watchlist_items add column if not exists stop_loss numeric(18,4);
alter table watchlist_items add column if not exists note text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'watchlist_items_asset_id_key') then
    alter table watchlist_items add constraint watchlist_items_asset_id_key unique (asset_id);
  end if;
end $$;
create index if not exists watchlist_items_user_id_idx on watchlist_items (user_id);
drop trigger if exists watchlist_items_set_updated_at on watchlist_items;
create trigger watchlist_items_set_updated_at before update on watchlist_items for each row execute function set_updated_at();

-- ---- Row Level Security (drop + recreate policies for idempotency — Postgres has no CREATE POLICY IF NOT EXISTS) ----
do $$
declare
  t text;
begin
  foreach t in array array['assets','transactions','portfolio_snapshots','goals','fixed_deposits','nps_accounts','nps_contributions','nps_scheme_holdings','nps_scheme_transactions','bank_accounts','ppf_accounts','price_history','watchlist_items','liabilities']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner_only" on %I', t);
    execute format('create policy "owner_only" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
