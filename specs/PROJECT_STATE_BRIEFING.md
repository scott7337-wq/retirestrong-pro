# RetireStrong Pro — Project State Briefing
## Handoff document for next conversation · April 28, 2026

---

## What this document is

This is the complete state-of-the-project briefing to start a new Claude conversation
without losing any context. Paste this as your first message, then say what you want
to build next.

---

## Project overview

**RetireStrong Pro** is a retirement cockpit web app for sophisticated DIY retirees
(target: 55-75 year olds). Currently running as a local prototype at `localhost:5273`.

**GitHub:** `scott7337-wq/retirestrong-pro`
**Project directory:** `~/retirestrong-pro`
**Stack:** React 18 + Vite, Express/Node.js backend, PostgreSQL, Recharts, Lucide React

**Vercel deployment:** `retire-strong-pro.vercel.app` (generic demo data version)

---

## Current app state — what is built and working

### Three-column cockpit layout
- **Left sidebar** (200px): Logo + "RetireStrong" wordmark, nav groups (PLANNING /
  OPERATIONS / SETTINGS), cream background `#F5F3EF`, dark teal active pill `#0A4D54`,
  silent Save + "Save as new scenario" dropdown, "Live from DB" status dot
- **Main content** (flex-1): Warm off-white `#F8F7F4`, white cards, `1px solid #E8E4DC`
- **AI Insights rail** (240px): Same cream background, persistent ✦ Refresh button,
  tab-specific content, real Anthropic API on refresh

### Navigation (left sidebar, in order)
**PLANNING:** Overview → Portfolio → Plan → Stress Test
**OPERATIONS:** Spending → Income & Tax → Roth Conversion
**SETTINGS:** Assumptions

### Tab-by-tab status

**Overview** ✅ Complete
- KPI strip (Total Portfolio / Monthly Income / Success Rate / Years Funded)
- SmartAlerts (Roth Conversion Window, dismissible)
- This Month's Draw card (account source + tax impact + IRMAA status)
- Spending vs. Income horizontal bar chart
- Status pills (Plan Health / Tax Efficiency / Bucket Status)
- Retirement Milestones ribbon (2027→2030→2028→2033 clickable)
- Portfolio sparkline + Quick What-If scenarios
- AI rail: plan status, sequence risk, next actions, opportunities

**Portfolio** ✅ Complete
- Asset Composition donut chart (warm color scheme)
- Holdings Detail collapsible (default collapsed, account-type grouped, + Add Holding)
- Bucket Funding Timeline: 3 horizontal lanes + Annual Refill Logic (Good/Down markets)
- Bucket Allocation progress bars (matching Image 2 spec with variance pills)
- Bucket Holdings collapsible
- AI rail: portfolio-specific content, Refresh fires portfolio prompt

**Plan** ✅ Complete
- Cash Flow Projection chart (Total Balance, IRA Balance, Roth Balance, Expenses)
- Critical Years strip: 3 color-coded cards (Sequence Risk/red, SS+Medicare/teal,
  RMD Trigger/green) — clicking scrolls to + expands that year in the table
- Year-by-Year Detail table: 5 columns (YEAR / BALANCE / INCOME / EXPENSES / GAP)
  with traffic light dots, expandable rows showing source-of-funds stacked bar
- AI rail: cash flow summary, income gap risk, next actions

**Stress Test** ✅ Complete
- Scenario pills at top: Base Case, Bad First Five Years, Recession, Stagflation,
  Healthcare Shock, Spend Heavy — active pill in dark teal, success % shown inline
- Percentile Bands chart + Median Bucket Trajectories chart below
- AI rail: scenario-specific content updates when scenario changes

**Spending** ✅ Complete
- Essential/Discretionary cards with teal/amber left borders, 24px/700 amounts
- Monthly Totals grid (Jan-Dec inputs)
- Actual vs. Budget trend chart
- Summary KPIs (YTD / vs Budget / Avg Monthly / Budget/Month)
- Bucket 1 Cash Runway bar
- "What if spending changes?" strip (4 scenarios)
- AI rail: spending-specific content

**Income & Tax** ✅ Complete
- Tax Bracket Thermometer at top: 4-bracket bar, "You are here" indicator,
  3 stat boxes (MAGI / IRMAA headroom / Optimal conversion)
- Income inputs (W-2, severance, IRA distributions, Roth conversions, other)
- Conversion/Pull Headroom card + Estimated Tax card
- "Where Should You Pull From?" guidance section
- AI rail: Roth conversion window content

**Roth Conversion** ✅ Complete
- Named correctly (was "Tax" — renamed)
- Full Roth conversion window analysis
- 2026 working year logic
- KPI strip (Conv Window / Years Available / IRMAA Safe MAGI / Total Convertible)
- IRMAA hidden tax explainer card
- How Your Bracket Is Calculated explainer
- AI rail: conversion window + IRMAA risk

**Assumptions** ✅ Complete
- High-Impact Assumptions section at top (teal border, 4 key fields with impact statements)
- Monthly Expenses field: live withdrawal rate warning (green/amber/red), 4% guideline,
  annual equivalent in label, "this drives all projections" helper text
- AI rail fires spending change alert when expenses change >10%

### AI Rail — all tabs
- New anatomy: bold takeaway sentence + max 3 bullets + optional action button
- Tab-specific static content for all 8 tabs
- ✦ Refresh button fires real Anthropic API call, returns structured 4-section response
- Spending change alert fires reactively when monthlyExpenses changes >10%
- Legal footer always visible

### Save behavior
- Silent save: no scenario naming prompt, toast notification "Saved ✓"
- Split button: [💾 Save][▾] — dropdown has "Save as new scenario..."
- Sidebar shows "Base Case · 90.8%" (not "Scenario 2")

---

## Architecture review — completed

Three briefs were written and are in `/mnt/user-data/outputs/`:
- `BRIEF_1_architecture_review.md`
- `BRIEF_2_onboarding_wizard.md`
- `BRIEF_3_multiuser_scaffolding.md`

### Architecture review (Brief 1) — STATUS: COMPLETE
All 6 fixes shipped:
- Duplicate `addV14Routes` registration removed from server.cjs
- Engine extracted to `src/engine/` (ss.js, tax.js, cashflow.js, montecarlo.js, rmd.js)
- SS functions generalized (birthYear/spouseBirthYear from profile, not hardcoded)
- PlanContext created (`src/context/PlanContext.jsx`)
- DB_NAME in .env, server uses it
- user_id middleware on all /api routes
- Save flow documented

### Onboarding wizard (Brief 2) — STATUS: COMPLETE
5-step wizard:
1. Who are you? (birth year, spouse toggle)
2. Your money (IRA/Roth/Taxable balances, running total)
3. Income plan (SS FRA, claim age picker with live benefit preview)
4. Spending (monthly expenses, withdrawal rate feedback)
5. Your first plan (success rate, key risk, first action, "Explore full plan →")

Gates on `inp.onboardingComplete` — shows once, then never again.
Skip links on steps 2-4.

### Multi-user scaffolding (Brief 3) — STATUS: COMPLETE
- Email-only login (private beta, no passwords)
- AuthContext with localStorage session persistence
- LoginScreen component
- 4 test households: scott@test.com, demo1@test.com, demo2@test.com, demo3@test.com
- User menu in sidebar (name + sign out)
- Demo plan data in `src/data/demo-plans.js`
- SECURITY.md documenting gaps before public launch
- Regression test checklist in project knowledge (RetireStrong_Pro_login_regression_test.docx)

---

## Known issues / things to watch

1. **Scott-specific hardcoding** — despite engine extraction, some labels still reference
   "Scott SS" and "Stacey SS" in the Plan table and other places. These need to become
   generic "Primary SS" and "Spouse SS" before showing to other users.

2. **Income & Tax thermometer MAGI** — shows $0 when no W-2 income is entered because
   the fields start at 0. This is correct but looks empty on first view for demo users.
   Consider showing estimated MAGI from engine (gap funding draws) as a starting point.

3. **Spending tab** — monthly actuals grid zeroes out between sessions if not saved.
   The save flow for spending actuals hits `/api/spending` — verify this is wiring
   correctly to the spending_actuals table for non-Scott users.

4. **Milestone dates** — the Milestones ribbon shows 2027/2030/2028/2033 (out of order)
   instead of chronological order. The dates are correct but the sort order is broken.

---

## Design system tokens

```css
--rs-sidebar-bg:       #F5F3EF;
--rs-bg-page:          #F5F3EF;
--rs-rail-bg:          #F5F3EF;
--rs-bg-card:          #FFFFFF;
--rs-border:           #E8E4DC;
--rs-sidebar-active:   #0A4D54;
--rs-teal-dark:        #0A4D54;
--rs-teal-mid:         #4A9E8E;
--rs-text-primary:     #1A1A1A;
--rs-text-secondary:   #374151;
--rs-text-muted:       #6B7280;
--rs-chart-primary:    #0A4D54;
--rs-chart-income:     #3D6337;
--rs-chart-expense:    #8B3528;
--rs-chart-gap:        #8A5515;
--rs-amber:            #8A5515;
--rs-green:            #3D6337;
--rs-red:              #8B3528;
```

**Typography:** 17px minimum body text, 14px labels, 28px page titles
**Cards:** white on cream, `1px solid #E8E4DC`, 12px border-radius
**AI rail:** bold takeaway + 3-bullet max anatomy, left-aligned

---

## Key files to know

```
~/retirestrong-pro/
├── src/
│   ├── App.jsx                         # Shell ~800 lines (after extraction)
│   ├── engine/                         # Pure math
│   │   ├── ss.js                       # SS calculations, generalized
│   │   ├── tax.js                      # Brackets, IRMAA, effective tax
│   │   ├── cashflow.js                 # Year-by-year projection
│   │   ├── montecarlo.js               # MC simulation
│   │   └── rmd.js                      # RMD table + calculations
│   ├── context/
│   │   ├── PlanContext.jsx             # Plan state, recompute, save
│   │   └── AuthContext.jsx             # User session, login, logout
│   ├── components/
│   │   ├── shell/
│   │   │   ├── AppShell.jsx            # 3-column layout (200 / flex / 240)
│   │   │   ├── Sidebar.jsx             # Left nav, logo, save, DB status
│   │   │   └── AIInsightsRail.jsx      # Right rail, Refresh, tab-specific
│   │   ├── overview/                   # Overview page components
│   │   ├── portfolio/                  # PortfolioPage.jsx
│   │   ├── onboarding/                 # 5-step wizard
│   │   ├── auth/                       # LoginScreen.jsx
│   │   └── shared/                     # RetireStrongLogo.jsx, etc.
│   ├── styles/
│   │   └── tokens.css                  # CSS custom properties
│   └── data/
│       ├── demo-plans.js               # 3 demo household configs
│       └── api.js                      # All fetch/save functions
├── server.cjs                          # Express + PostgreSQL + AI proxy
├── retirestrong-v14-routes.js          # 17 GET endpoints
├── retirestrong-v14-writes.cjs         # 18 write endpoints
└── SECURITY.md                         # Auth gaps before public launch
```

---

## PRD summary (what's in project knowledge)

The full PRD is in `RetireStrong-PRD-Consolidated.md` in the project files.
Key sections:
- **Section 3:** V1 product scope (MVP features, deferred features)
- **Section 5:** AI strategy + guardrails + system prompt
- **Section 6:** Target architecture (Vercel + Railway + Supabase)
- **Section 7:** Legal & compliance (LLC, ToS, Privacy Policy, Insurance)
- **Section 8:** Current state + database schema (25 tables)
- **Section 9:** Business model ($0 Free / $12/mo Pro / $29/mo Premium)

---

## What's next (your priority order)

You said you have multiple specs to bring in. The project is in a clean state for:

1. **More feature specs** — the app is architecturally sound, add what you have
2. **Infrastructure move** — when ready to show external users:
   - Supabase for auth + Postgres (or Clerk for auth)
   - Railway for Express API
   - Vercel already exists for frontend
3. **Legal setup** — Arizona LLC + ToS + Privacy Policy before accepting payment

---

## How to start the next conversation

Start with:
> "I'm continuing work on RetireStrong Pro. The project state briefing is above.
> Here are the new specs I want to add: [paste your specs]"

Claude Code is the worker — use this Claude.ai chat for architecture decisions,
briefs, and coordination. Paste Claude Code briefs into your terminal session.

The project files (App.jsx, server.cjs, etc.) are in the project knowledge and
will be read automatically. The retirestrong skill has Scott's personal parameters.

---

## Connectors available

- **Figma** (connected) — design file: `NAxbsmuWha9OVUQOZevUMw`
- **Claude in Chrome** (connected) — for live browser testing at localhost:5273
- **Google Drive, Gmail, Google Calendar, Slack** (connected)
- **NetSuite AI Connector** (connected)
