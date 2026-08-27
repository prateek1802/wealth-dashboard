# Wealth Dashboard — Project Status (paste this into a new chat to continue)

**Repo:** github.com/prateek1802/wealth-dashboard · Next.js + Supabase, deployed on Vercel
**Live:** https://wealth-dashboard-rouge.vercel.app/ — hosted and working
**Local dev:** `npm run dev`. Demo mode (no `.env.local`) needs no login. Real mode requires Supabase env vars — auth is then required.

## Workflow (say this to Claude in a new chat)
> "Continue work on this project. For every change, apply a **single git patch file** (not a zip) — I'll run `git apply <file>.patch` then `npm run dev`. Only tell me to run `npm install` if a dependency actually changed. Verify with `tsc`, `eslint`, `vitest`, and `next build` before giving me the patch."

**Recurring gotcha to watch for:** patches that touch `supabase/schema.sql` or `supabase/sync-schema.sql` must be followed by running the full `sync-schema.sql` in the Supabase SQL Editor before testing — it's idempotent, safe to run in full every time.

## Architecture
- `src/lib/calculations/*` — pure financial math: FIFO realized P&L, XIRR, CAGR, growth projections, NPS statement classification, risk metrics (volatility/Sharpe/Sortino), and `tax-harvesting.ts` (new — Indian capital-gains classification: short/long-term, flat-rate VDA/crypto under Section 115BBH, unsupported for bonds; informational only, not tax advice)
- `src/lib/import/*` — `nps-statement-parser.ts`: reads real NSDL/Protean exports (SheetJS for the multi-sheet `.xlsx` consolidated format, verified end-to-end; a best-effort CSV parser for the single-period format, still unverified — no real sample available)
- `src/lib/market-data/live-provider.ts` — Yahoo/CoinGecko/mfapi.in for securities; `fetchNPSNAVQuote()` for NPS via npsnav.in's **Simple** endpoint (see Open issue #1 below — this is the known weak point)
- `src/lib/database/repositories/*` — only layer touching Supabase; each has a demo-mode in-memory fallback
- `src/lib/services/*` — orchestration; `portfolio.service.ts` is the one aggregation point for cross-asset-class views; `nps.service.ts` owns scheme-level import/derivation logic
- `src/features/*` — per-screen components + Server Actions
- **Holdings hub** (`src/features/holdings/`, route `/holdings`) — replaced the old per-asset-class sidebar dropdown. Every category (securities, cash, FDs, NPS, PPF, liabilities, watchlist) shown as a sorted-by-value clickable card routing to its own detail page. The old dropdown/collapsible sidebar logic was fully removed (not left dangling) from both desktop sidebar and mobile nav — confirmed clean. Correctly excludes zero-value liabilities, parallelized data fetch, `force-dynamic` set.
- Auth: Supabase Auth + `proxy.ts` (renamed from `middleware.ts`) + Row Level Security on every table (`user_id uuid default auth.uid()`), verified zero RLS gaps
- Two SQL files in `supabase/`: `schema.sql` (fresh installs) and `sync-schema.sql` (idempotent, safe to rerun any time)
- **NPS data model:** `nps_accounts` (has `scheme_preference`) → `nps_scheme_holdings` (one row per E/C/G/A scheme, `units_held` + `last_nav` + `last_nav_date` + optional `npsnav_scheme_code`) → `nps_scheme_transactions` (real, dated, signed ledger). `nps_accounts.current_corpus` is a fallback only, for accounts never imported (`npsService.getEffectiveCorpus()`).
- 25 production dependencies, 12 dev — not bloated. TypeScript strict mode on. 77+ tests, including real-world edge cases, not just happy path.

## Feature checklist (done)
✅ Core: dashboard, Holdings hub (`/holdings`), portfolio, transactions (paginated, "View more"), analytics, goals, watchlist, tax-loss harvesting (`/tax-harvesting`)
✅ Asset classes: stocks/ETF/MF/crypto/bonds, Bank Accounts, Fixed Deposits, NPS (real per-scheme E/C/G/A tracking), PPF (principal/interest split), Liabilities (subtracted from net worth)
✅ CSV import/export for transactions; JSON backup/restore (see Open issue #4 — incomplete)
✅ Live price refresh: per-asset/class/portfolio + dashboard "Refresh all" (Yahoo/CoinGecko/mfapi.in — see Open issue #2, doesn't include NPS)
✅ FIFO-based average cost for stocks/MF; historical price charts; XIRR growth projections with a <1yr floor
✅ Portfolio-wide pooled XIRR, consistent between Dashboard and Analytics (single source confirmed)
✅ NPS full rewrite (all 8 parts), validated to the paisa against a real subscriber statement (₹7,70,430 invested / ₹8,82,252 corpus); idempotent import; switch pairing on amount + date window (not same-day — real settlement lag ~2 days); import UI surfaces unrecognized rows/unmatched switches
✅ NPS live NAV via npsnav.in — search-and-confirm only, never auto-guessed PFM→scheme mapping
✅ Maturity/reminder bell, transaction edit (main table + per-asset history), asset display fix (MF real name not scheme code), zero-quantity holdings hidden but counted in realized P&L, card icon-overlap fix (FD/Bank/NPS), responsive tables, Dashboard Day Change bug fixed
✅ Risk metrics annualization now derived from real snapshot-date gaps — this surfaced a **new** bug, see Open issue #3

## Open issues, ranked (from a full source-level audit — see `Bugs/All Issues.txt` in the repo for complete detail on every item below, plus 2 fully-written patch specs)

1. **NPS "as of" timestamp is fetch time, not the NAV's real publication date** — spec'd, not built. This just caused a real 2+ day debugging session: npsnav.in's own upstream data was stuck/stale, but the app kept showing "as of today" the whole time because the timestamp was never the true NAV date. **Fix (fully spec'd in `Bugs/All Issues.txt` under NPS-DETAILED-ENDPOINT-PROMPT):** switch `fetchNPSNAVQuote()` to npsnav.in's "Detailed" endpoint (confirm exact response shape against their current docs first — not re-verified this session), store the real last-updated date in `nps_scheme_holdings.last_nav_date` instead of fetch time, add a visible staleness warning (amber state) on the NPS page if a scheme's data is >~2 days old, apply the same check to `refreshLiveNAVs()`'s toast/summary. Keep fail-soft error handling and the no-auto-guess design unchanged. Add a boundary test (exactly 2 days / 3 days old).
2. **Audit trail for edits/deletes** — no history kept anywhere. Highest real risk item: silent, irreversible data loss on financial records is currently possible.
3. **CSV transaction import isn't idempotent** — re-uploading duplicates rows silently. The dedup pattern already exists and is proven in the NPS importer; just needs porting here.
4. **Analytics risk-metric outlier bug** — Volatility/Sharpe/Sortino sometimes show implausible values (>500). Root cause: computed from variance across only ~8 snapshots, so one bad historical data point (from an NPS corpus-methodology change mid-transition, e.g. the old corpus-doubling bug) dominates the whole metric. Full redesign spec exists in `Bugs/All Issues.txt` (ANALYTICS-REDESIGN-PROMPT) — fix the outlier bug first (cutoff-date filtering + outlier-return exclusion + a test with a deliberately planted extreme snapshot) before building the nicer UI around it.
5. **"Refresh all" doesn't mean all** — Dashboard's button only refreshes securities, has zero awareness NPS live NAV refresh exists. Either wire NPS in or rename the button.
6. **Backup/Restore is incomplete** — silently excludes `price_history` and `portfolio_snapshots` (2 of 11 tables), despite being marketed as a full JSON backup.
7. **Liabilities reported as not loading** — page/service/repository/schema/RLS all checked internally consistent in source; this looks like a live/deployment issue (schema drift, auth session, transient error) rather than a static code bug. Needs a real browser console error or Vercel log to progress.
8. Goals: same card icon-overlap bug already fixed for Bank Accounts/FDs/NPS, never applied to `goals-view.tsx`.
9. Goals have no edit — only add/delete.
10. Watchlist shows no current price at all despite the data already existing on `Asset` — makes the target-price/stop-loss feature hard to use. Also no refresh capability reaches watchlist assets.
11. Category-wise XIRR (grouped by asset class) not implemented — the grouping key (`ASSET_TYPE_GROUP`) already exists.
12. MF holdings still show generic "Qty / Avg. Cost" instead of NAV/units terminology (card + table).
13. Dashboard fetches the same base data ~5x per page load (`getPortfolioSummary`/`getAssetAllocation`/`getTopHoldings`/`getSegregatedBreakdown` each independently recompute holdings). Not a current speed problem (runs concurrently in one `Promise.all`) but compounds as transaction count grows (267+ already). Fix: one shared `getDashboardData()`.
14. No error boundaries (`error.tsx`) or `loading.tsx` anywhere in the App Router.
15. No server-side error logging anywhere.
16. Vercel Analytics / Speed Insights not installed.
17. CAGR (and the risk metrics in #4) mix old- and new-methodology snapshots invisibly — could show an artificial jump that's really "the math got more correct," not real growth. Needs a caption or documented one-time distortion.
18. `recharts` not code-split via `next/dynamic` — ships in the initial bundle on every page with a chart.
19. No freshness indicator for securities prices in the UI (data exists via `currentPriceUpdatedAt`; NPS already does this correctly via `last_nav_date`).
20. Decimal-safe money math not adopted — plain JS `Number` throughout. Low risk at current volume, worth adopting going forward.
21. No undo window on deletes (confirm dialog only).
22. No auto-refresh at market close — needs real new infra (Vercel Cron + protected API route), not a code-only patch.

**Confirmed NOT bugs, worth knowing:**
- Net worth itself is consistent everywhere (single source, verified)
- XIRR is consistent Dashboard vs Analytics
- DB indexes are thorough (18, all RLS columns + real query patterns)
- `computeHoldings()` is correctly batched, not N+1
- Price refresh is deliberately sequential to avoid bursting rate-limited free APIs
- All 15 page.tsx files use Server Components correctly
- No `dangerouslySetInnerHTML` anywhere (no XSS risk found)
- Secrets handling clean

## Deliberately deferred (explain why if asked)
- Push notifications / email — no infra for it yet, in-app bell only
- Multi-currency conversion — not implemented
- FD/PPF/cash not included in pooled portfolio XIRR — each has its own modeling questions worth a separate pass

## Features worth adding

No new infra needed:
- Allocation drift / rebalancing alerts
- Gold/property as first-class asset types
- SIP reminder tracking
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
This file is the condensed working view. `Bugs/All Issues.txt` in the repo root has the full source-level audit (consistency bugs, performance findings, "what's already professional-grade" notes) plus two complete, ready-to-hand-off patch specs (NPS Detailed-endpoint fix, Analytics redesign) verbatim — paste the relevant spec alongside this file when starting a session focused on either.
