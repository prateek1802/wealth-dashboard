# Wealth Dashboard — Project Status (paste this into a new chat to continue)

**Repo:** github.com/prateek1802/wealth-dashboard · Next.js + Supabase, deployed on Vercel
**Local dev:** `npm run dev`. Demo mode (no `.env.local`) needs no login. Real mode requires Supabase env vars — auth is then required.

## Workflow (say this to Claude in a new chat)
> "Continue work on this project. For every change, apply a **single git patch file** (not a zip) — I'll run `git apply <file>.patch` then `npm run dev`. Only tell me to run `npm install` if a dependency actually changed. Verify with `tsc`, `eslint`, `vitest`, and `next build` before giving me the patch."

**Critical recurring gotcha this session:** several patches added or changed Supabase schema, and more than once the code shipped before the DB migration was actually run — causing real crashes (`Could not find column/table`). **After applying any patch that touches `supabase/schema.sql` or `supabase/sync-schema.sql`, always run the full `sync-schema.sql` in the Supabase SQL Editor before testing.** It's idempotent — safe to run in full, every time, even if some of it is already applied.

## Architecture (updated)
- `src/lib/calculations/*` — pure financial math: FIFO realized P&L (kept separate from weighted-avg cost), XIRR, CAGR, growth projections, NPS statement classification, risk metrics (volatility/Sharpe/Sortino)
- `src/lib/import/*` — **new this session.** `nps-statement-parser.ts`: reads real NSDL/Protean exports (SheetJS for the multi-sheet `.xlsx` consolidated format; a best-effort, unverified CSV parser for the single-period format), classifies each row, pairs scheme switches, plans idempotent import.
- `src/lib/database/repositories/*` — only layer touching Supabase; each has a demo-mode in-memory fallback
- `src/lib/services/*` — orchestration; `portfolio.service.ts` is the one aggregation point for cross-asset-class views (dashboard, analytics); `nps.service.ts` now also owns scheme-level import/derivation logic
- `src/features/*` — per-screen components + Server Actions
- Auth: Supabase Auth + `proxy.ts` (renamed from `middleware.ts` via official Next 16 codemod) + Row Level Security on every table (`user_id uuid default auth.uid()`)
- Two SQL files in `supabase/`: `schema.sql` (fresh installs) and `sync-schema.sql` (idempotent — safe to rerun on the existing deployed DB any time schema drifts)
- **New NPS data model:** `nps_accounts` (existing, now with `scheme_preference`) → `nps_scheme_holdings` (one row per E/C/G/A scheme actually held, `units_held` + `last_nav` + optional `npsnav_scheme_code`) → `nps_scheme_transactions` (the real, dated, signed ledger — contribution/switch_in/switch_out/fee/withdrawal). `nps_accounts.current_corpus` is now a **fallback only**, used solely for accounts that have never had a statement imported (see `npsService.getEffectiveCorpus()`).

## Feature checklist
✅ Core: dashboard, portfolio (grouped by asset class, separate sidebar link per class held, table view shows XIRR not allocation %), transactions (paginated, 50/page with "View more"), analytics, goals, watchlist
✅ Asset classes: stocks/ETF/MF (labels shortened to "Equity MF" / "Debt MF")/crypto/bonds, Bank Accounts, Fixed Deposits (+edit, +withdraw), NPS (see dedicated section below), PPF (+withdraw, principal/interest split), Liabilities (credit cards/loans, subtracted from net worth)
✅ CSV import/export for transactions; full JSON backup/restore (Backup page)
✅ Live price refresh: per-asset, per-asset-class, portfolio-wide, and a dashboard-level "Refresh all" — Yahoo/CoinGecko/mfapi.in, correctly skips zero-holding assets
✅ FIFO-based average cost for stocks/MF (fixed a bug where an offsetting same-day buy+sell shifted displayed average cost)
✅ Historical price charts (accumulate from Refresh Prices, never fabricated)
✅ XIRR-based growth projections (per-asset + portfolio), with a floor: holdings <1yr old don't get a misleading 10yr compound
✅ Portfolio-wide XIRR is pooled (securities + NPS) and **consistent between Dashboard and Analytics** — both call the same `npsService.getCashflows()` now
✅ Maturity/reminder bell (FD, PPF's real 15yr rule, NPS retirement year, goal dates)
✅ Transaction edit (was built but unreachable — now wired into both the main Transactions table and per-asset history)
✅ Asset display fix: mutual funds show real name, not scheme code (cards/tables/detail/activity)
✅ Zero-quantity (fully sold-out) holdings no longer appear on Portfolio — realized P&L still counted in totals
✅ Card icon-overlap UI fix — applied to FD (active + withdrawn sections), Bank Accounts, and NPS account cards (all the same absolute-positioned-button pattern)
✅ Responsive tables (Transactions, Portfolio, Analytics growth projection) — `min-w` added so they scroll instead of squishing on narrow viewports
✅ Dashboard "Day Change" bug fixed — was diffing today's net worth against the snapshot it had just written for itself, always showing ~₹0
✅ Risk metrics (Volatility/Sharpe/Sortino) — annualization factor is now derived from actual snapshot-date gaps instead of a hardcoded `Math.sqrt(252)` (see **Open issue** below — user reports this still isn't producing expected results, not yet resolved)

## NPS — full rewrite this session (was the single largest body of work)
Real NPS is 3–4 separate sub-funds (E/C/G/A), each with its own unit balance and NAV — not one lump-sum number. This was rebuilt from the ground up, validated against a real subscriber's actual 193-row, 3-scheme consolidated statement at every stage (exact match to the paisa: ₹7,70,430.00 invested, ₹8,82,252.12 corpus).

- **Schema:** `nps_scheme_holdings` + `nps_scheme_transactions` tables, `scheme_preference` + PFM dropdown on `nps_accounts`
- **Classification** (`lib/calculations/nps-classification.ts`): pure, tested function that sorts real statement rows into contribution/switch_in/switch_out/fee/withdrawal, and correctly skips one-off unit-reissuance events (e.g. PFRDA's "Multiple NAV Framework" migration) via a units-match heuristic — not a hardcoded string match, so it should survive future differently-worded reissuance events too
- **Import parser** (`lib/import/nps-statement-parser.ts`): reads the real multi-sheet `.xlsx` export via SheetJS (validated end-to-end against real data); a `.csv` single-period parser exists but is **unverified** — no real sample was available to test against
- **Switch pairing:** found and corrected a wrong assumption in the original spec — a switch-out and its matching switch-in are **not same-day** in real data, they're ~2 calendar days apart (settlement lag). Pairing matches by amount + a date window instead.
- **Idempotent import:** re-uploading the same or an overlapping statement never duplicates rows (dedup by exact date+description+units); switch pairs get correctly re-linked even when their two legs arrive in separate imports
- **Import UI:** "Import statement" button per account, drag/click upload, surfaces unrecognized rows and unmatched switches rather than silently swallowing them
- **XIRR consistency:** scheme-tracked accounts now feed real dated contribution/withdrawal cash flows into the pooled portfolio XIRR (switches and fees correctly excluded — they're not new money); accounts without an imported statement still use the old contribution-log + "untracked gap" heuristic as a fallback
- **UI:** per-scheme (E/C/G/A) value breakdown on each account card; employer contribution field (was hardcoded to 0)
- **Live NAV refresh** (`npsnav.in`, real & verified API): deliberately built as **search-and-confirm, never auto-matched** — PFM name to scheme_code mapping isn't reliable enough to guess without risking a silently-wrong NAV attached to the wrong fund. User searches and picks once per scheme; refresh only fires for confirmed mappings. `npsnav.in`'s dataset is CC BY-NC 4.0 (personal/non-commercial use) — fine for this app, worth knowing.
- **New dependency:** `xlsx` (SheetJS), npm-registry version — has two known, unpatched vulnerabilities (prototype pollution, ReDoS). Low real risk here (only ever parses the user's own uploaded file, server-side), but flagged and not silently accepted. A patched version exists on SheetJS's own CDN if this ever matters more.
- **Known limitation, by design:** if an imported statement doesn't cover an account's entire history, XIRR can still overstate itself the same way the old model needed correcting for — there's no equivalent "untracked gap" correction once an account is on scheme-level tracking. Import the full consolidated statement, not just recent years.
- **Observed in real use (not a code bug):** small residual (~0.1%) differences between this app's corpus/NAV figures and Protean's own live app, even after connecting live NAV — verified this app's DB precision (`numeric(18,4)`/`numeric(12,4)`) matches the source data exactly, so this looks like inherent cross-source noise between `npsnav.in`'s feed and Protean's internal figures, not something further code changes can fully close.

## Open issue — NOT resolved, needs next session
- **Risk metric annualization fix didn't work as intended.** The fix (deriving the annualization factor from actual snapshot-date gaps instead of hardcoding `Math.sqrt(252)`) was shipped and unit-tested (confirmed the math scales correctly in isolated tests), but the user reports it "didn't work" in the live app. Needs a fresh look — check what real snapshot dates/gaps actually look like in the live DB, and whether something about how `analytics/page.tsx` calls the updated functions isn't behaving as expected in practice.

## Known issues — NOT yet fixed
- Portfolio performance graph reflects snapshot-recording dates, not real historical transaction dates — **documented limitation, not a bug** (no historical price data source exists to compute true past values)
- NPS `.csv` (single-period Format A) import — unverified against a real sample
- The old (pre-scheme-tracking) NPS withdrawal path still doesn't log a dated ledger event — only matters for accounts that haven't imported a statement yet
- `npsnav.in`'s "as of" date shown in the UI is stamped at fetch time, not the NAV's true declared date (their lightweight endpoint doesn't return one) — can be misleading if you refresh before the day's NAV is actually published

## Deliberately deferred (explain why if asked)
- Push notifications / email — no infra for it yet, in-app bell only
- Multi-currency conversion — not implemented
- FD/PPF/cash are not included in the pooled portfolio XIRR — each has its own modeling questions worth a separate pass

## This session's patches, in order
`fifo-average-cost-fix` → `refresh-scoping-fix` → `per-asset-refresh` → `bank-account-card-overlap-fix` → `transaction-edit-wiring` → `responsive-table-fix` → `table-xirr-column` → `nps-part1-sync-fix` → `nps-part2-3-schema-classification` → `nps-part4-import-parser` → `nps-part8-persistence-import` → `nps-part9-import-ui` → `nps-part6-xirr-consistency` → `nps-part7-ui-gaps` → `nps-part5-live-nav` → `dashboard-xirr-refresh-split` → `dashboard-day-change-fix` → `mf-label-shorten` → `transaction-history-pagination` → `risk-annualization-fix` (shipped, not yet confirmed working)

20 patches this session. All verified with `tsc` + `eslint` + `vitest` + `next build` before delivery; the NPS rewrite specifically validated against a real subscriber's actual statement data at multiple stages, not just synthetic test fixtures.
