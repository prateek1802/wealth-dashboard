# WEALTH DASHBOARD
## Consolidated Product & Engineering Review + Recommended Roadmap

**Assessment basis:** Latest consolidated status report  
**Current state:** Trust/correctness backlog closed; Active SIPs and Portfolio History partially complete; automation infrastructure operational.

---

# 1. EXECUTIVE VERDICT

The Wealth Dashboard has reached an important milestone.

The project is no longer primarily a "bug-fixing / foundation" project. The core financial-data architecture, auditability, error handling, backup/restore visibility, XIRR calculations, NPS handling, decimal-safe money calculations and production monitoring are now substantially mature.

The next stage should therefore NOT be:

> "Add as many features as possible."

It should be:

> **Turn the existing reliable wealth ledger into a complete personal Wealth Operating System.**

### Overall assessment

| Area | Assessment |
|---|---|
| Financial data integrity | **Excellent** |
| Transaction architecture | **Excellent** |
| NPS modelling | **Excellent** |
| Error handling | **Strong** |
| Backup / restore | **Strong — now closed** |
| Production infrastructure | **Strong** |
| Analytics foundation | **Strong** |
| Current UX/product completeness | **Good** |
| Automation | **Early** |
| Portfolio intelligence | **Moderate** |
| Financial planning | **Early** |
| External data integration | **Major opportunity** |

### Recommended priority

**Reliability → Complete existing features → Benchmarking → Planning/FIRE → Automation → Intelligence**

Do not reverse this order.

---

# 2. WHAT IS NOW COMPLETE

The trust/correctness backlog is reported as fully closed.

This includes:

- DB-level audit trail
- RLS-controlled read-only audit access
- Restore capability
- Idempotent CSV import
- Analytics risk-metric outlier correction
- CAGR zero-snapshot correction
- Goals overlap/edit functionality
- Watchlist pricing/refresh
- Backup/restore completeness
- Backup error visibility
- Error boundaries
- loading states
- Vercel Analytics / Speed Insights
- server-side error logging
- category-wise XIRR
- analytics XIRR pooling correction
- MF NAV/unit display corrections
- floating-point quantity display correction
- NPS refresh scope correction
- chart code splitting
- decimal-safe money calculations

This is a very significant milestone.

The report explicitly confirms that backup/restore error visibility — the last lingering piece of that saga — has now been addressed. 

### Recommendation

**Freeze this area.**

Do not keep refactoring already-stable financial calculations merely because there are theoretically cleaner implementations.

Instead, create regression tests around them and move development effort elsewhere.

---

# 3. NPS — CONSIDER THIS FEATURE COMPLETE

The NPS implementation is one of the strongest parts of the application.

It now covers:

- schema
- classification
- statement import
- live NAV
- XIRR pooling
- employer contribution field
- idempotent re-upload
- lifecycle-fund switches
- real statement validation

The lifecycle-switch investigation is particularly important.

The classification correctly prioritizes explicit "switch in/out" descriptions before the units-matching heuristic, preventing a large lifecycle switch from being incorrectly interpreted as a Multiple NAV Framework reissuance event.

One low-probability identical-date/identical-amount pairing issue remains theoretically possible, but the report appropriately treats it as an edge case rather than pretending it does not exist.

### Important product issue

The displayed lifecycle label does not automatically update after a real-world lifecycle change.

Current behaviour:

> Real NPS lifecycle changes → user must manually update displayed assumption.

### Recommendation

Add:

**"Sync from latest statement"**

If the imported statement clearly establishes the current lifecycle fund, the app should:

1. detect the current scheme,
2. show the detected scheme,
3. ask for confirmation,
4. update the displayed assumption.

Do NOT silently change it.

---

# 4. ACTIVE SIPs — FINISH THIS NOW

This is currently the clearest example of a feature that is technically built but not product-complete.

The backend is done:

- table exists
- audit trigger exists
- RLS exists
- calculation engine exists
- projections use SIPs
- holding-level SIPs work
- portfolio-level SIPs work
- stopped SIPs are excluded

But there is no UI for adding or stopping a SIP.

Therefore:

> **Active SIPs should be the next feature completed.**

### Required UI

Add an Active SIP section to Growth Projection.

Each SIP should display:

- Investment / holding
- Monthly amount
- Start date
- Status
- Expected annual return
- Projected value
- Stop/Edit action

### Add SIP flow

Fields:

**Investment**  
**Monthly amount**  
**Start date**  
**Expected return**  
**Status**

### Stop SIP flow

Do not delete the SIP.

Change:

> Active → Stopped

This preserves history and keeps historical projections explainable.

### Additional recommendation

Add:

> **"Projected corpus from existing holdings + future SIPs"**

with a visual separation between:

- current wealth
- projected growth of current wealth
- future SIP contributions
- growth generated by future SIPs

This will make the projection substantially more understandable.

---

# 5. PORTFOLIO HISTORY — CONTINUE, BUT CHANGE THE PRIORITY

Step 1 — FD historical accrual — is complete.

The implementation correctly uses quarterly accrual mathematics and matches the existing maturity convention.

However, it has exposed an important conceptual inconsistency:

**FD "today value" currently has two definitions.**

The history graph uses accrued value, while the FD cards/dashboard use flat principal according to the existing service convention.

This should NOT be ignored.

### Recommendation

Before completing all remaining historical asset types, define one canonical concept:

## "Current Value"

For every asset, decide whether current value means:

- market value,
- accrued value,
- redemption value,
- principal,
- or estimated value.

Then use that definition consistently across:

- dashboard
- portfolio
- history
- net worth
- allocation
- analytics

### Suggested hierarchy

**Marketable assets**

Current market value.

**FD**

Accrued maturity/redemption value as of the selected date.

**PPF**

Accrued balance as of the selected date.

**Bank**

Actual balance.

**NPS**

NAV × units.

**Property**

Latest manually entered valuation.

This becomes a foundational financial-data rule.

---

# 6. PORTFOLIO HISTORY — RECOMMENDED BUILD ORDER

Continue with the existing roadmap:

### Step 2 — Mutual funds

Use historical NAV data.

### Step 3 — Stocks

Use historical market-price data.

### Step 4 — Crypto

Use historical crypto-price data.

### Step 5 — PPF + bank accounts

Build date-specific balance/accrual functions.

### Step 6 — Visual semantics

The graph should distinguish:

**Solid line**

Actual/reconstructed historical value.

**Dashed line**

Estimated/interpolated/assumption-based value.

This is extremely important.

Never make an estimated historical value visually indistinguishable from an actual recorded value.

---

# 7. DASHBOARD PERFORMANCE — RE-VERIFY BEFORE TOUCHING

The report says dashboard `computeHoldings()` calls were previously observed at 9 independent locations, but the exact count was not re-checked in this pass.

Therefore:

> **Do not spend development time refactoring this yet.**

First measure.

### Required action

Instrument/inspect the dashboard and determine:

- number of computeHoldings calls
- duplicate calls
- server/client boundary
- repeated database requests
- repeated calculations
- render-triggered recalculations

Then decide whether to:

- memoize,
- centralize,
- cache,
- or restructure the data-loading layer.

### Priority

**P1 if it affects real performance.**

Otherwise:

**P2.**

---

# 8. PRICE FRESHNESS — ADD THIS TO THE CORE UX

The report identifies a remaining gap:

> Freshness indicators exist conceptually for NPS/FD but not consistently for stocks, mutual funds and crypto.

This should be fixed.

Every market-sensitive value should answer:

> **"As of when?"**

### Example

**Tata Motors**  
₹XXX  
+2.1%

`Price as of 3:30 PM · 12 Sep 2026`

Or:

`Price delayed · last updated 4h ago`

For crypto:

`BTC ₹XX · updated 11:07 AM`

### Add freshness states

🟢 Fresh  
🟡 Delayed  
🔴 Stale

This is more important than adding another chart.

---

# 9. LIABILITIES — DIAGNOSE FROM PRODUCTION EVIDENCE

The report correctly says the liabilities-not-loading issue needs a real console/Vercel diagnosis.

Do NOT keep performing static code review.

### Required process

1. Reproduce the issue.
2. Capture browser console.
3. Capture Vercel/server log.
4. Identify request.
5. Identify database/API failure.
6. Fix.
7. Add regression test.
8. Verify production.

This should follow the same production-evidence methodology that successfully caught the market-close cron `null user_id` problem.

That production debugging approach should become the project's standard.

---

# 10. MARKET-CLOSE CRON — KEEP THE CURRENT ARCHITECTURE

The market-close cron is a major success.

The original production failure was:

> service-role client + `auth.uid()` default → null user_id

The fix explicitly resolves and passes the real user ID.

Production testing returned:

> `{"ok":true,"updated":16,"skipped":[]}`

The NPS refresh was also correctly implemented using the admin client rather than blindly reusing a cookie-based service function that would have silently returned zero rows in a cron context.

### Recommendation

Adopt a project rule:

> **Every background job must be tested in the same authentication context in which it actually runs.**

For every future cron:

- test authenticated request
- test sessionless execution
- test service-role execution
- test RLS interaction
- test empty data
- test partial API failure
- test rate limits
- test duplicate execution

This will prevent an entire class of bugs.

---

# 11. BENCHMARKING — NEXT MAJOR PRODUCT FEATURE

This is one of the highest-value missing features.

Currently analytics can tell the user:

> "My portfolio returned X."

The more useful question is:

> **"Was X good?"**

### Add benchmarks

At minimum:

- Nifty 50
- Nifty 500
- Sensex

Potentially later:

- asset-class-specific benchmarks
- gold
- debt benchmark

### Display

**Portfolio**

+18.4%

**Nifty 50**

+16.7%

**Alpha**

+1.7%

### Better version

Show:

- 1M
- 3M
- 6M
- 1Y
- 3Y
- Since inception

and compare portfolio vs benchmark.

---

# 12. PORTFOLIO ATTRIBUTION — HIGH-VALUE ANALYTICS

Once benchmarking exists, build attribution.

Answer:

> **Why did my portfolio perform the way it did?**

For example:

**Performance this year**

Equity contribution: +₹X  
NPS contribution: +₹X  
MF contribution: +₹X  
FD interest: +₹X  
Crypto contribution: −₹X  
Net contributions: +₹X

Then distinguish:

**Money added**

vs.

**Investment return**

This is a very powerful distinction.

---

# 13. ALLOCATION DRIFT & REBALANCING

This should be P1.

Allow the user to define:

**Target allocation**

Example:

| Asset | Target | Actual | Drift |
|---|---:|---:|---:|
| Equity | 70% | 76% | +6% |
| Debt | 20% | 17% | −3% |
| Gold | 10% | 7% | −3% |

Then:

> **Portfolio is 6% overweight equity.**

Eventually:

> "To return to target, direct the next ₹X of investments toward debt/gold."

Avoid automatic trading recommendations initially.

Keep it informational.

---

# 14. GOLD AND PROPERTY SHOULD BECOME FIRST-CLASS ASSETS

The backlog correctly identifies gold/property as missing first-class asset types.

Add:

### Gold

- physical gold
- digital gold
- ETF
- SGB

Fields could include:

- quantity
- purchase price
- purchase date
- current price
- valuation source
- purity

### Property

- purchase value
- purchase date
- current estimated value
- loan/liability
- rental income
- valuation date

Property should support:

> **manual valuation**

with a clearly labelled:

`Estimated value — manually updated`

Do not pretend the valuation is market-verified.

---

# 15. CASH FLOW FORECAST

This is another natural extension.

The app already knows:

- investments
- SIPs
- income
- expenses
- liabilities
- FDs
- maturity dates

Use this to show:

### Next 12 months

**Expected inflows**

Salary  
FD maturities  
Interest  
Other income

**Expected outflows**

SIPs  
EMIs  
Expenses  
Insurance  
Tax

Then:

> **Expected surplus: ₹X**

This turns the app from a historical tracker into a planning system.

---

# 16. FIRE — MAKE THIS A MAJOR MODULE

The report already reviewed actual expense/income data:

**2024**

Expenses: ₹5,58,887  
Savings rate: 35.2%

**2025**

Expenses: ₹6,02,224  
Savings rate: 38.4%

This is enough to begin specifying the feature.

### FIRE dashboard

**Current net worth**

₹XX

**Annual expenses**

₹XX

**FIRE target**

₹XX

**Progress**

XX%

**Projected FIRE year**

20XX

### Inputs

- current age
- annual expenses
- inflation
- expected portfolio return
- current corpus
- annual investment
- salary growth
- desired withdrawal rate

### Outputs

- FIRE corpus
- projected FIRE year
- savings required
- effect of higher savings
- effect of higher/lower returns
- coast-FIRE possibility

### Critical principle

Show a **range**, not a single magic number.

Example:

**Conservative**

FIRE: 2044

**Base**

FIRE: 2040

**Optimistic**

FIRE: 2037

This avoids false precision.

---

# 17. WEEKLY RECAP — VERY HIGH UX VALUE

Add an automated weekly summary.

Example:

## Your Week in Money

**Net worth**

+₹42,300

**Equity**

+₹31,500

**NPS**

+₹7,800

**Cash**

−₹5,000

**Biggest mover**

ABC Ltd +8.2%

**Portfolio allocation**

Equity now 74.2%

**Action**

Equity is 4.2% above target allocation.

This feature makes the app something the user actually returns to.

---

# 18. ACCOUNT AGGREGATOR — THE BIGGEST LONG-TERM OPPORTUNITY

This remains the single biggest differentiator identified in the report.

The ultimate workflow should become:

**Bank accounts**

↓

**Brokerages**

↓

**Mutual funds**

↓

**NPS**

↓

**FDs**

↓

**Wealth Dashboard**

instead of:

**User manually maintains everything.**

This should be treated as a dedicated project rather than a small feature.

### Important architectural principle

External integrations should never directly modify the core wealth state without reconciliation.

Instead:

**External source**

↓

**Raw imported data**

↓

**Normalization**

↓

**Duplicate detection**

↓

**Reconciliation**

↓

**User confirmation where necessary**

↓

**Canonical transaction ledger**

This preserves the trust model already established by the project.

---

# 19. TAX INTELLIGENCE — NEXT LEVEL

Tax-loss harvesting already exists.

The next step is a broader tax centre.

Potential features:

- realized gains
- unrealized gains
- holding period
- STCG/LTCG classification
- tax-lot view
- harvested losses
- available loss carry-forward
- tax-year summaries
- dividend income
- interest income
- capital gains report

### Especially useful

A tax-year dashboard:

**FY 2026–27**

Realized STCG: ₹X  
Realized LTCG: ₹X  
Interest: ₹X  
Dividend: ₹X  
Tax-loss harvesting available: ₹X

This would make the application genuinely useful at tax time.

---

# 20. CORPORATE ACTIONS

This should eventually be P1 for equity accuracy.

Support:

- stock splits
- bonuses
- mergers
- demergers
- rights issues
- buybacks
- dividends

Otherwise transaction-derived cost basis can eventually become inaccurate.

The app should have a corporate-action adjustment layer rather than forcing the user to manually reconstruct history.

---

# 21. DATA RECONCILIATION — BUILD THIS AS A CORE FEATURE

One of the best future features would be:

## "Reconcile Portfolio"

The application compares:

**Broker/CAS statement**

vs.

**Internal ledger**

and reports:

🟢 100% matched

or:

### Differences found

ABC Ltd  
Expected: 100 shares  
App: 95 shares  
Difference: 5

MF XYZ  
Expected units: 1,254.82  
App: 1,254.80  
Difference: 0.02

This will become essential once automated imports are introduced.

---

# 22. BACKUP SHOULD BECOME A SELF-TESTING SYSTEM

Although backup/restore is now considered closed, it should be protected permanently.

Implement a validation step:

### Backup verification

After creating backup:

- verify file exists
- verify schema/version
- verify record counts
- verify checksums
- verify critical financial totals

After restore:

**Pre-restore net worth:** ₹XX  
**Post-restore net worth:** ₹XX  
**Difference:** ₹0

The system should fail loudly if reconciliation isn't exact.

---

# 23. SECURITY RECOMMENDATIONS

The project should maintain a strict separation between:

### Client-safe configuration

Public Supabase URL  
Anon/public key

and:

### Server-only secrets

Service-role key  
Cron secret  
External API credentials

Do not package `.env.local` in distributable project archives.

Maintain:

`.env.example`

instead.

Also perform a one-time secret scan across:

- Git history
- ZIP
- source
- deployment configuration
- logs

---

# 24. DOCUMENTATION SHOULD NOW BE UPDATED

The report itself reveals that the application has evolved beyond portions of its earlier documentation.

This is a normal consequence of rapid development, but now is the right time to synchronize:

- database documentation
- architecture documentation
- authentication model
- RLS model
- cron architecture
- calculation conventions
- asset valuation conventions
- backup/restore format
- import behaviour

### Create one document:

# ARCHITECTURE.md

Sections:

1. System overview
2. Data model
3. Source of truth
4. Transaction lifecycle
5. Calculation engine
6. Authentication
7. RLS
8. Background jobs
9. External APIs
10. Import/export
11. Backup/restore
12. Error handling
13. Financial calculation conventions

This will dramatically reduce future development friction.

---

# 25. TESTING STRATEGY — MOVE FROM FEATURE TESTING TO FINANCIAL INVARIANTS

The project already has 26 test files.

The next level is testing invariants.

Examples:

### Invariant 1

Transaction ledger → holdings must always reconcile.

### Invariant 2

Units × NAV = displayed MF/NPS valuation within defined precision.

### Invariant 3

Backup → restore must preserve net worth.

### Invariant 4

Importing the same CSV twice must not duplicate transactions.

### Invariant 5

Stopped SIPs must not affect future projection.

### Invariant 6

Corporate actions must preserve economic ownership.

### Invariant 7

Historical portfolio value should not unexpectedly change when today's price changes.

These tests are more valuable than simply increasing the test count.

---

# 26. RECOMMENDED DEVELOPMENT PRIORITY

## P0 — Do before major new features

### 1. Complete Active SIP UI

Backend is already ready.

### 2. Resolve liabilities loading

Use production evidence.

### 3. Define canonical asset valuation rules

Especially FD current value.

### 4. Verify dashboard computation count

Measure before optimizing.

### 5. Add price freshness indicators

Low complexity, high trust value.

---

# 27. P1 — Product expansion

### 6. Finish Portfolio History

MF → stocks → crypto → PPF/bank → visual distinction.

### 7. Benchmarking

Nifty 50 / Nifty 500 / Sensex.

### 8. Allocation drift

Targets + drift + rebalance guidance.

### 9. FIRE

Full planning module.

### 10. Tax centre

Beyond harvesting.

### 11. Corporate actions

Protect long-term portfolio accuracy.

---

# 28. P2 — Intelligence layer

### 12. Weekly recap

### 13. Cash-flow forecasting

### 14. Portfolio attribution

### 15. Goal probability / scenario analysis

### 16. Smart alerts

Examples:

- allocation drift
- stale prices
- FD maturity approaching
- SIP failure
- unusually large drawdown
- portfolio concentration
- tax-loss harvesting opportunity

---

# 29. P3 — TRANSFORMATION

## Account Aggregator + automated reconciliation

This is where the application changes category.

Current:

> **Personal Wealth Dashboard**

Future:

> **Personal Wealth Operating System**

The app should eventually wake up and know:

- what you own
- what changed
- what earned money
- what lost money
- where your cash went
- whether allocation drifted
- whether taxes need attention
- whether you are on track for FIRE
- what actions deserve consideration

without requiring manual data entry.

---

# 30. RECOMMENDED FINAL PRODUCT ARCHITECTURE

The long-term product can be thought of as five layers.

### Layer 1 — Ledger

Transactions  
Accounts  
Holdings  
Liabilities

### Layer 2 — Valuation

Market prices  
NAV  
FD accrual  
NPS NAV  
Property valuation

### Layer 3 — Analytics

XIRR  
CAGR  
Returns  
Risk  
Benchmarking  
Attribution  
Allocation

### Layer 4 — Planning

Goals  
FIRE  
Cash flow  
SIPs  
Rebalancing  
Tax planning

### Layer 5 — Intelligence

Alerts  
Weekly recap  
Recommendations  
Anomaly detection  
Automated reconciliation

This is a much cleaner product direction than continuing to add isolated screens.

---

# 31. THE MOST IMPORTANT PRODUCT PRINCIPLE

The application should always distinguish between:

### FACT

"Broker statement says 125 shares."

### CALCULATION

"Your current value is ₹X."

### ASSUMPTION

"Property estimated at ₹X."

### PROJECTION

"At 10% returns, corpus could reach ₹X."

### RECOMMENDATION

"Your equity allocation is above target."

These should never be visually or semantically mixed.

This principle will become increasingly important as AI features are introduced.

---

# 32. WHAT I WOULD NOT BUILD YET

Avoid spending time on:

- excessive dashboard animations
- dozens of new charts
- AI chatbot inside the app
- stock-picking recommendations
- complicated social features
- F&O/P&L engines
- elaborate gamification
- excessive customization
- cosmetic redesigns

The core wealth engine is already valuable.

Make it **more accurate, automated and actionable** before making it more decorative.

---

# 33. FINAL ROADMAP

## NOW

**Finish**

1. Active SIP UI
2. Liabilities diagnosis
3. FD valuation convention
4. Dashboard performance verification
5. Price freshness

↓

## NEXT

**Build**

6. Portfolio history
7. Benchmarking
8. Allocation drift
9. FIRE
10. Tax centre
11. Corporate actions

↓

## THEN

**Build intelligence**

12. Weekly recap
13. Cash-flow forecast
14. Attribution
15. Alerts
16. Scenario analysis

↓

## FINALLY

**Automate**

17. Account Aggregator
18. Broker integrations
19. CAS/MF reconciliation
20. Automatic transaction ingestion

---

# 34. FINAL VERDICT

The project is now past the stage where the primary question is:

> "Does the app work?"

The more important question is:

> **"How do we make this the single source of truth for the user's entire financial life?"**

The foundation is sufficiently mature to pursue that goal.

The strongest existing characteristics are:

**financial correctness + transaction-derived architecture + auditability + NPS depth + production observability.**

The largest weaknesses are:

**manual data entry + incomplete planning layer + missing benchmarking + incomplete historical valuation + incomplete automation.**

Therefore the strategic direction should be:

> **Trust → Completeness → Context → Planning → Automation → Intelligence**

If that sequence is followed, this can evolve from a very good personal portfolio dashboard into a genuinely sophisticated **personal wealth management system**.