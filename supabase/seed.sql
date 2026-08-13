-- Development seed data — FICTIONAL, not real financial information.
-- Mirrors src/lib/database/demo-data.ts (the in-memory fallback used when
-- no Supabase project is configured) so a freshly connected real project
-- looks the same as the zero-config demo mode.
--
-- Run with: psql "$DATABASE_URL" -f supabase/seed.sql
-- (or paste into the Supabase SQL editor)

insert into assets (id, symbol, name, asset_type, currency, exchange, sector, country, isin, current_price, current_price_updated_at)
values
  ('11111111-1111-1111-1111-111111111001', 'HDFCBANK', 'HDFC Bank Ltd', 'stock_in', 'INR', 'NSE', 'Financial Services', 'India', 'INE040A01034', 1725.40, now()),
  ('11111111-1111-1111-1111-111111111002', 'INFY', 'Infosys Ltd', 'stock_in', 'INR', 'NSE', 'Information Technology', 'India', 'INE009A01021', 1842.15, now()),
  ('11111111-1111-1111-1111-111111111003', 'AAPL', 'Apple Inc.', 'stock_us', 'USD', 'NASDAQ', 'Technology', 'United States', 'US0378331005', 231.20, now()),
  ('11111111-1111-1111-1111-111111111004', 'NIFTYBEES', 'Nippon India ETF Nifty BeES', 'etf', 'INR', 'NSE', null, 'India', 'INF204KB14I2', 268.90, now()),
  ('11111111-1111-1111-1111-111111111005', 'PARAGFLEXI', 'Parag Parikh Flexi Cap Fund', 'mutual_fund', 'INR', null, null, 'India', null, 82.35, now()),
  ('11111111-1111-1111-1111-111111111006', 'BTC', 'Bitcoin', 'crypto', 'INR', null, null, null, null, 8650000, now()),
  ('11111111-1111-1111-1111-111111111007', 'ETH', 'Ethereum', 'crypto', 'INR', null, null, null, null, 310000, now()),
  ('11111111-1111-1111-1111-111111111008', 'TCS', 'Tata Consultancy Services', 'stock_in', 'INR', 'NSE', 'Information Technology', 'India', 'INE467B01029', 4120.00, now());

insert into transactions (asset_id, transaction_type, quantity, price, fees, taxes, transaction_date, broker, notes)
values
  ('11111111-1111-1111-1111-111111111001', 'BUY', 30, 1420, 45, 12, current_date - interval '390 days', 'Zerodha', null),
  ('11111111-1111-1111-1111-111111111001', 'BUY', 20, 1550, 32, 9, current_date - interval '250 days', 'Zerodha', null),
  ('11111111-1111-1111-1111-111111111001', 'SELL', 15, 1680, 28, 8, current_date - interval '60 days', 'Zerodha', 'Partial profit booking'),
  ('11111111-1111-1111-1111-111111111002', 'BUY', 40, 1510, 40, 11, current_date - interval '340 days', 'Zerodha', null),
  ('11111111-1111-1111-1111-111111111002', 'BUY', 20, 1690, 22, 6, current_date - interval '120 days', 'Zerodha', null),
  ('11111111-1111-1111-1111-111111111003', 'BUY', 12, 178.5, 5, 0, current_date - interval '300 days', 'IBKR', null),
  ('11111111-1111-1111-1111-111111111003', 'BUY', 8, 205.2, 4, 0, current_date - interval '150 days', 'IBKR', null),
  ('11111111-1111-1111-1111-111111111004', 'BUY', 500, 220, 60, 15, current_date - interval '330 days', 'Zerodha', null),
  ('11111111-1111-1111-1111-111111111004', 'BUY', 300, 245, 38, 10, current_date - interval '180 days', 'Zerodha', null),
  ('11111111-1111-1111-1111-111111111005', 'BUY', 2500, 62.4, 0, 0, current_date - interval '480 days', 'Direct - MFU', 'SIP lumpsum top-up'),
  ('11111111-1111-1111-1111-111111111005', 'BUY', 800, 74.1, 0, 0, current_date - interval '90 days', 'Direct - MFU', null),
  ('11111111-1111-1111-1111-111111111006', 'BUY', 0.08, 5400000, 400, 0, current_date - interval '280 days', 'CoinDCX', null),
  ('11111111-1111-1111-1111-111111111006', 'BUY', 0.04, 7100000, 250, 0, current_date - interval '100 days', 'CoinDCX', null),
  ('11111111-1111-1111-1111-111111111007', 'BUY', 1.2, 210000, 300, 0, current_date - interval '260 days', 'CoinDCX', null),
  ('11111111-1111-1111-1111-111111111008', 'BUY', 10, 3850, 30, 8, current_date - interval '150 days', 'Zerodha', null);

insert into goals (name, target_amount, current_amount, target_date, category, description)
values
  ('Emergency Fund', 600000, 420000, current_date + interval '180 days', 'Safety', '6 months of expenses in a liquid fund'),
  ('Japan Trip', 350000, 140000, current_date + interval '300 days', 'Travel', null),
  ('Down Payment', 4000000, 900000, current_date + interval '1100 days', 'Home', '2BHK down payment target');

insert into fixed_deposits (institution, principal, interest_rate, start_date, maturity_date, tenure_months, payout_type, notes)
values
  ('HDFC Bank', 300000, 7.10, current_date - interval '400 days', current_date + interval '330 days', 24, 'cumulative', null),
  ('SBI', 150000, 6.80, current_date - interval '200 days', current_date + interval '165 days', 12, 'cumulative', null),
  ('ICICI Bank', 200000, 7.25, current_date - interval '60 days', current_date + interval '1005 days', 36, 'cumulative', null);

insert into nps_accounts (id, tier, pension_fund_manager, current_corpus, expected_annual_return, monthly_contribution, annual_contribution_increase, retirement_year)
values ('22222222-2222-2222-2222-222222222001', 'Tier I', 'HDFC Pension Fund', 480000, 10, 8000, 8, extract(year from current_date)::int + 25);

insert into nps_contributions (nps_account_id, contribution_date, employee_amount, employer_amount)
values
  ('22222222-2222-2222-2222-222222222001', current_date - interval '30 days', 4000, 4000),
  ('22222222-2222-2222-2222-222222222001', current_date - interval '60 days', 4000, 4000),
  ('22222222-2222-2222-2222-222222222001', current_date - interval '90 days', 4000, 4000);

insert into watchlist_items (asset_id, target_price, note)
values ('11111111-1111-1111-1111-111111111008', 3600, 'Add on dips below 3600');

insert into ppf_accounts (current_balance, total_contributed, total_withdrawn, interest_rate, open_date, yearly_contribution)
values (540000, 450000, 0, 7.1, current_date - interval '1800 days', 150000);

insert into bank_accounts (bank_name, account_type, current_balance)
values
  ('HDFC Bank', 'savings', 85000),
  ('ICICI Bank', 'salary', 35000);
