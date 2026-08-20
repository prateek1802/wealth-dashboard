# Wealth Dashboard — Project Status (paste this into a new chat to continue)

**Repo:** github.com/prateek1802/wealth-dashboard · Next.js + Supabase, deployed on Vercel
**Local dev:** `npm run dev`. Demo mode (no `.env.local`) needs no login. Real mode requires Supabase env vars — auth is then required.

## Workflow (important — say this to Claude in the new chat)
> "Continue work on this project. For every change, apply a **single git patch file** (not a zip) — I'll run `git apply <file>.patch` then `npm run dev`. Only tell me to run `npm install` if a dependency actually changed. Verify with `tsc`, `eslint`, `vitest`, and `next build` before giving me the patch."

## Architecture (unchanged since V1)
- `src/lib/calculations/*` — pure financial math (FIFO realized P&L kept separate from weighted-avg cost; XIRR; CAGR; growth projection)
- `src/lib/database/repositories/*` — only layer touching Supabase; each has a demo-mode in-memory fallback
- `src/lib/services/*` — orchestration; `portfolio.service.ts` is the one aggregation point for cross-asset-class views (dashboard, analytics)
- `src/features/*` — per-screen components + Server Actions
- Auth: Supabase Auth + `proxy.ts` (renamed from `middleware.ts` via official Next 16 codemod) + Row Level Security on every table (`user_id uuid default auth.uid()`)
- Two SQL files in `supabase/`: `schema.sql` (fresh installs) and `sync-schema.sql` (idempotent — safe to rerun on the existing deployed DB any time schema drifts)

## Feature checklist
✅ Core: dashboard, portfolio (grouped by asset class, separate sidebar link per class held), transactions, analytics, goals, watchlist
✅ Asset classes: stocks/ETF/MF/crypto/bonds, Bank Accounts, Fixed Deposits (+edit, +withdraw), NPS (multi-account, Tier I/II), PPF (+withdraw, principal/interest split), Liabilities (credit cards/loans, subtracted from net worth)
✅ CSV import/export for transactions; full JSON backup/restore (Backup page)
✅ Live price refresh (Yahoo/CoinGecko/mfapi.in) + symbol search autocomplete
✅ Historical price charts (accumulate from Refresh Prices, never fabricated)
✅ XIRR-based growth projections (per-asset + portfolio), with a floor: holdings <1yr old don't get a misleading 10yr compound
✅ Maturity/reminder bell (FD, PPF's real 15yr rule, NPS retirement year, goal dates)
✅ Transaction edit
✅ Asset display fix: mutual funds show real name, not scheme code (cards/tables/detail/activity)
✅ Zero-quantity (fully sold-out) holdings no longer appear on Portfolio — realized P&L still counted in totals
✅ FD edit + FD card icon-overlap UI fix — user-confirmed working

## Known issues — NOT yet fixed (from user's running list)
- **#11 Window resize not responsive** — needs a screenshot to diagnose, not yet investigated
- **#12 Category-wise XIRR** (group by asset class, not just per-asset) — not started
- **#14 Table view should show XIRR instead of % allocation** — not started (had one false start this session, cleanly reverted — see below)
- Portfolio performance graph reflects snapshot-recording dates, not real historical transaction dates — **this is a documented limitation, not a bug** (no historical price data source exists to compute true past values)

## Just-shipped patch (confirmed applied and working)
`liabilities-fd-edit-txn-edit-zero-holdings.patch` — Liabilities section, FD edit, transaction edit, zero-quantity holdings no longer appear on Portfolio. **User confirmed: zero-holding fix and FD UI/edit fix both working.** This is the last commit — your project and any new chat should treat this as the current baseline.

## In-progress, reverted (not delivered — redo from scratch in new chat)
Was mid-way through: Portfolio page → fetch `getHoldingsWithXIRR()` instead of `getHoldings()`, then swap the table's "Allocation %" column for XIRR (issue #14). Only the page.tsx fetch call was touched, then reverted — **no code was left in a half-done state**, nothing to clean up. Start this fresh.

## Deliberately deferred (explain why if asked)
- Push notifications / email — no infra for it yet, in-app bell only
- Multi-currency conversion — not implemented
