/**
 * Hand-written row types mirroring supabase/schema.sql. In a real Supabase
 * project these would be regenerated with `supabase gen types typescript`
 * once the project exists — kept hand-written here so the app is fully
 * typed before any live project is connected.
 */

export interface AssetRow {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  currency: string;
  exchange: string | null;
  sector: string | null;
  country: string | null;
  isin: string | null;
  current_price: number | null;
  current_price_updated_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  asset_id: string;
  transaction_type: string;
  quantity: number;
  price: number;
  fees: number;
  taxes: number;
  transaction_date: string;
  broker: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSnapshotRow {
  id: string;
  snapshot_date: string;
  net_worth: number;
  invested_capital: number;
  securities_value: number;
  realized_pnl: number;
  unrealized_pnl: number;
  fd_value: number;
  nps_value: number;
  ppf_value: number;
  cash_value: number;
  allocation_snapshot: Record<string, number>;
  created_at: string;
}

export interface GoalRow {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FixedDepositRow {
  id: string;
  institution: string;
  principal: number;
  interest_rate: number;
  start_date: string;
  maturity_date: string;
  tenure_months: number;
  payout_type: string;
  maturity_amount: number | null;
  status: string;
  withdrawal_date: string | null;
  withdrawal_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NPSAccountRow {
  id: string;
  tier: string;
  pension_fund_manager: string | null;
  scheme_preference: string | null;
  pran: string | null;
  current_corpus: number;
  expected_annual_return: number | null;
  monthly_contribution: number | null;
  annual_contribution_increase: number | null;
  retirement_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface NPSContributionRow {
  id: string;
  nps_account_id: string;
  contribution_date: string;
  employee_amount: number;
  employer_amount: number;
  notes: string | null;
  created_at: string;
}

export interface NPSSchemeHoldingRow {
  id: string;
  nps_account_id: string;
  scheme: string;
  units_held: number;
  last_nav: number | null;
  last_nav_date: string | null;
  npsnav_scheme_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface NPSSchemeTransactionRow {
  id: string;
  nps_account_id: string;
  scheme: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  nav: number;
  units: number;
  employee_amount: number | null;
  employer_amount: number | null;
  linked_transaction_id: string | null;
  description: string | null;
  created_at: string;
}

export interface PPFAccountRow {
  id: string;
  account_number: string | null;
  current_balance: number;
  total_contributed: number;
  total_withdrawn: number;
  interest_rate: number;
  open_date: string;
  yearly_contribution: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccountRow {
  id: string;
  bank_name: string;
  account_type: string;
  current_balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceHistoryRow {
  id: string;
  asset_id: string;
  price: number;
  recorded_date: string;
  created_at: string;
}

export interface WatchlistItemRow {
  id: string;
  asset_id: string;
  target_price: number | null;
  stop_loss: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiabilityRow {
  id: string;
  name: string;
  liability_type: string;
  amount_owed: number;
  interest_rate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_at: string;
}
