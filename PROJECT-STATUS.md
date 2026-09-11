# Wealth Dashboard — Project Status (paste this into a new chat to continue)

**Repo:** github.com/prateek1802/wealth-dashboard · Next.js + Supabase, deployed on Vercel
**Live:** https://wealth-dashboard-rouge.vercel.app/ — hosted and working
**Local dev:** `npm run dev`. Demo mode (no `.env.local`) needs no login. Real mode requires Supabase env vars — auth is then required.

## Workflow (say this to Claude in a new chat)
> "Continue work on this project. For every change, apply a **single git patch file** (not a zip) — I'll run `git apply <file>.patch` then `npm run dev`. Only tell me to run `npm install` if a dependency actually changed. Verify with `tsc`, `eslint`, `vitest`, and `next build` before giving me the patch."

**Recurring gotcha to watch for:** patches that touch `supabase/schema.sql` or `supabase/sync-schema.sql` must be followed by running the full `sync-schema.sql` in the Supabase SQL Editor before testing — it's idempotent, safe to run in full every time.

## Architecture
- `src/lib/calculations/*` — pure financial math: FIFO realized P&L, XIRR, CAGR, growth projections, NPS statement classification, risk metrics (volatility/Sharpe/Sortino), `tax-harvesting.ts` (Indian capital-gains classification: short/long-term, flat-rate VDA/crypto under Section 115BBH, unsupported for bonds; informational only, not tax advice)
- `src/lib/utils/money.ts` — Decimal.js-backed decimal-safe math (add/subtract/multiply/divide, number-in-number-out). Deliberately zero consumers yet — adopt-going-forward foundation, not a retrofit of already-correct existing calculations.
- `src/lib/import/*` — `nps-statement-parser.ts`: reads real NSDL/Protean exports (SheetJS for the multi-sheet `.xlsx` consolidated format, verified end-to-end; best-effort CSV parser for the single-period format, still unverified — no real sample available)
- `src/lib/market-data/live-provider.ts` — Yahoo/CoinGecko/mfapi.in for securities; `fetchNPSNAVQuote()` for NPS via npsnav.in's **Simple** endpoint (known weak point — see Open issue #2 below)
- `src/lib/database/repositories/*` — only layer touching Supabase; each has a demo-mode in-memory fallback
- `src/lib/services/*` — orchestration; `portfolio.service.ts` is the one aggregation point for cross-asset-class views; `nps.service.ts` owns scheme-level import/derivation logic; `backup.service.ts` handles JSON export/import (see Open issue #3 — restore currently broken)
- `src/features/*` — per-screen components + Server Actions
- **Holdings hub** (`src/features/holdings/`, route `/holdings`) — replaced the old per-asset-class sidebar dropdown; that old logic was fully removed, confirmed clean, from both desktop and mobile nav. Every category card routes to its own detail page; Liabilities card always shows now (previously hidden at zero value, which turned into a navigation dead-end once the sidebar dropdown was removed — fixed).
- Auth: Supabase Auth + `proxy.ts` (renamed from `middleware.ts`) + Row Level Security on every table (`user_id uuid default auth.uid()`), verified zero RLS gaps
- Two SQL files in `supabase/`: `schema.sql` (fresh installs) and `sync-schema.sql` (idempotent, safe to rerun any time)
- **NPS data model:** `nps_accounts` (has `scheme_preference`) → `nps_scheme_holdings` (one row per E/C/G/A scheme, `units_held` + `last_nav` + `last_nav_date` + optional `npsnav_scheme_code`) → `nps_scheme_transactions` (real, dated, signed ledger). `nps_accounts.current_corpus` is a fallback only, for accounts never imported (`npsService.getEffectiveCorpus()`).
- Audit trail: database-level trigger on every real financial-record table, read-only to the user via RLS (can't be tampered with even from the user's own session), with a UI page to view history — and it now supports restoring a deleted record, safely scoped to deletes only.
- 30 production dependencies, 12 dev — not bloated. TypeScript strict mode on. 25 test files covering real-world edge cases, not just happy path.

## Feature checklist (done)
✅ Core: dashboard, Holdings hub (`/holdings`), portfolio, transactions (paginated, "View more"), analytics (fully redesigned — see below), goals (now with edit), watchlist (now with price + refresh), tax-loss harvesting (`/tax-harvesting`)
✅ Asset classes: stocks/ETF/MF/crypto/bonds, Bank Accounts, Fixed Deposits, NPS (real per-scheme E/C/G/A tracking), PPF (principal/interest split), Liabilities (subtracted from net worth)
✅ CSV import/export for transactions, correctly non-idempotent by design (manual entries can legitimately duplicate every field); JSON backup export is complete (priceHistory + portfolioSnapshots included) — **restore is currently broken, see Open issue #3**
✅ Live price refresh: per-asset/class/portfolio + dashboard "Refresh all", which now genuinely covers NPS too (merges securities refresh + `refreshAllLiveNAVs()` into one honest toast count)
✅ FIFO-based average cost for stocks/MF; historical price charts; XIRR growth projections with a <1yr floor
✅ Portfolio-wide pooled XIRR, consistent across Dashboard and Analytics (including Analytics' own tile, which had quietly drifted securities-only again — re-fixed)
✅ Category-wise XIRR — finer per-asset-TYPE breakdown (not just Equity/Debt/Crypto), one row per NPS scheme, switches excluded, currently-held only
✅ NPS full rewrite (all 8 parts), validated to the paisa against a real subscriber statement (₹7,70,430 invested / ₹8,82,252 corpus); idempotent import; switch pairing on amount + date window (real settlement lag ~2 days, not same-day); import UI surfaces unrecognized rows/unmatched switches
✅ NPS live NAV via npsnav.in — search-and-confirm only, never auto-guessed PFM→scheme mapping
✅ Analytics redesign — trend chart with period toggles (server-prefetched), collapsed Advanced/Risk section, customizable XIRR selector (all-selected default is byte-identical to the pre-existing pooled XIRR), concentration card removed, risk-metric outlier bug fixed (configurable cutoff date + ±30% outlier-return exclusion)
✅ MF-specific terminology ("Units", "Avg. NAV", "Present NAV") rolled out across portfolio, transactions, investment detail, tax-harvesting lot table; floating-point quantity display bug fixed (`formatQuantity()`, display-only)
✅ Error boundaries (`error.tsx`, scoped to `(app)` route group) + `global-error.tsx` + route-level `loading.tsx`; server-side error logging (`logServerError()`) across all feature action files including NPS; Vercel Analytics + Speed Insights installed
✅ Maturity/reminder bell, transaction edit (main table + per-asset history), asset display fix (MF real name not scheme code), zero-quantity holdings hidden but counted in realized P&L, card icon-overlap fix now applied everywhere including Goals, responsive tables, Dashboard Day Change bug fixed
✅ Chart code-splitting via `next/dynamic` (`ssr:false` where appropriate)
✅ Decimal-safe money math foundation shipped (see architecture note above)

## Open issues, ranked (source of truth: `Bugs/CONSOLIDATED-STATUS-REPORT.txt` in the repo — every item re-verified against the latest zip, not carried forward on trust; also has 3 ready-to-send patch-spec prompts verbatim)

1. **Backup restore is confirmed broken** (found this pass — screenshot evidence: 775 asset failures, 0 assets/transactions imported, every other table succeeded). Two stacked, confirmed bugs, both about error *visibility* rather than the true root cause yet: (a) `backup.service.ts`'s `importAll()` checks `err instanceof Error`, but Supabase's `PostgrestError` is a plain object — so the real DB error is always discarded and replaced with the bare word "failed"; (b) `importAll()` swallows every row-level error internally and always returns `ok:true`, so the outer action's `logServerError()` never fires either — no server log trail exists. 0 transactions failing is a direct consequence of 0 assets succeeding (transaction import resolves assets via an old-id→new-id map built only from successful inserts), not a second bug. **Fix spec'd and ready to send** (Section 4F of the consolidated report): fix the error-shape check + add `logServerError()` inside every catch in `importAll()`, then re-run the import once to finally see the real error text — needed before the true cause can be diagnosed.
2. **NPS "as of" timestamp is fetch time, not the NAV's real publication date** — spec'd, not built. This already caused a real 2+ day debugging session in production: npsnav.in's own upstream data was stuck/stale, confirmed directly on their site, but the app kept showing "as of today" throughout because the timestamp was never the true NAV date; root cause is fully diagnosed as external, not app-side. **Fix spec'd** (Section 4B): switch `fetchNPSNAVQuote()` to npsnav.in's "Detailed" endpoint (re-confirm response shape against current docs first), store the real last-updated date in `nps_scheme_holdings.last_nav_date` instead of fetch time, add a visible staleness warning (amber, >~2 days old) on the NPS page, apply the same check to `refreshAllLiveNAVs()`'s toast/summary. Add a boundary test (exactly 2 vs 3 days old).
3. **CAGR permanently stuck on this account** — `firstSnapshot = sortedSnapshots[0]` picks the chronologically-first snapshot with no regard for value, and this account's real first two snapshots (2026-08-14, 2026-08-15) legitimately have `netWorth = 0` (recorded before real holdings existed on this deployment); `calculateCAGR()` correctly refuses a zero base, so it's stuck forever even though data from Aug 16 onward is good. Not data loss (full 16-entry snapshot history confirmed intact via a real backup file). **Fix fully written, ready to send as-is** (Section 4A of the consolidated report): skip leading `netWorth <= 0` snapshots when picking CAGR's starting point, recompute years from that adjusted date, add a test for a series that starts with zero-value entries.
4. **Dashboard redundant data fetching — confirmed worse, not better, since the last check.** `computeHoldings()` is now called independently **9 times** per Dashboard load (up from 7), because each new feature (category-wise XIRR, Analytics redesign) added its own independent call instead of sharing one result — the exact "compounds as features get built" risk, now directly observed. Fix unchanged: one shared `getDashboardData()` that computes holdings once. Worth doing before the SIP feature (below) adds a 10th call.
5. **Liabilities reported as not loading** — page/service/repository/schema/RLS all re-checked internally consistent in source every time; this looks like a live/deployment issue (schema drift, auth session, transient error) rather than a static code bug. Needs a real browser console error or Vercel log to progress further.
6. No `useMemo` on transactions/portfolio tables (low priority, not currently felt as slow).
7. No auto-refresh at market close — needs genuine new infra (Vercel Cron + protected API route), not a code-only patch.
8. No undo window on deletes — confirm dialog only, no reversible-delete pattern anywhere (audit trail's new delete-restore capability is a related but separate feature).
9. No freshness indicator for securities prices in the UI (`currentPriceUpdatedAt` exists in the data model, just not rendered; NPS already does this correctly via `last_nav_date`).

**Not yet built, spec'd, ready to hand off:**
- **Active SIPs for projections** (Section 5B of the consolidated report, full spec in `ACTIVE-SIPS-PROMPT.txt` referenced there). Root gap confirmed: `projectFutureValue()` is a pure lump-sum compound formula, no concept of ongoing contributions — understates future wealth for anyone actively SIP-investing. Mirrors the pattern NPS already uses (`monthlyContribution` feeding its own projection). Decisions locked in: projections only, no reminders (separate idea, deliberately not bundled); a SIP continues indefinitely until explicitly marked stopped, not a future end-date field. Spec includes a new `active_sips` table (added to the existing audit-trigger loop for free history), a `projectFutureValueWithSIP()` calculation requiring validation against a hand-checked reference case before shipping (this project has a history of subtle financial-formula bugs), and a compact management UI reusing existing asset/holdings utilities.
- **FIRE calculator** — discussed, not yet spec'd as a buildable prompt. Real progress on the data side: two years of actual categorized expense/income data reviewed (Money Manager app exports) — 2024: ₹5,58,887 expenses / ₹8,63,129 income / 35.2% savings rate; 2025: ₹6,02,224 expenses / ₹9,78,377 income / 38.4% savings rate (trending up). Proposed approach: parse this export format (mirroring the NPS statement-importer pattern), store only annual summaries — not every transaction, deliberately avoiding turning this into a full budgeting app — and feed real expense/savings-rate data into a FIRE Number / years-to-FIRE calculator.

**Confirmed NOT bugs, worth knowing:**
- Net worth itself is consistent everywhere (single source, verified)
- XIRR is consistent Dashboard vs Analytics (after the Analytics-tile re-fix above)
- DB indexes are thorough (18, all RLS columns + real query patterns)
- `computeHoldings()` is correctly batched, not N+1 — the redundancy issue (#4 above) is about call *count*, not per-call efficiency
- Price refresh is deliberately sequential to avoid bursting rate-limited free APIs
- All page.tsx files use Server Components correctly
- No `dangerouslySetInnerHTML` anywhere (no XSS risk found)
- Secrets handling clean
- Analytics/CAGR's zero-starting-value edge case is handled correctly in the new trend-summary line (returns null %, doesn't crash) — the CAGR bug (#3) is isolated to the dedicated CAGR calculation path, not this one

## Deliberately deferred (explain why if asked)
- Push notifications / email — no infra for it yet, in-app bell only
- Multi-currency conversion — not implemented
- FD/PPF/cash not included in pooled portfolio XIRR — each has its own modeling questions worth a separate pass
- SIP reminders — deliberately kept separate from the Active SIPs projection feature above

## Features worth adding

No new infra needed:
- Allocation drift / rebalancing alerts
- Gold/property as first-class asset types
- Portfolio benchmarking vs. Nifty/Sensex
- Rules-based weekly "what changed" recap
- Cash-flow forecast from existing maturity data

Needs new infra:
- Index benchmarking data source
- Push/email delivery
- An interactive scenario / "fast forward" planner

Biggest single differentiator, its own project:
- Account Aggregator (RBI framework) auto-sync

Deliberately low fit, skip unless asked:
- Full budgeting/expense categorization
- Deep crypto wallet/DeFi scanning
- Estate planning/legacy handoff

## Full detail
This file is the condensed working view. `Bugs/CONSOLIDATED-STATUS-REPORT.txt` in the repo root is the source of truth — it supersedes any older `All_Issues.txt`/`MASTER-REPORT.txt` and has the full source-level audit plus 3 ready-to-hand-off patch-spec prompts verbatim (backup-restore error visibility, CAGR zero-snapshot fix, NPS Detailed-endpoint + staleness warning). Paste the relevant spec alongside this file when starting a session focused on any of the three.
