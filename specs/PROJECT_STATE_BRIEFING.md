# RetireStrong Pro — Project State Briefing
## Updated April 29, 2026 — 26 commits from baseline

---

## How to start a new session

Paste this document as your first message, then describe what
you want to build next. The specs/ folder has full specs and
mockups for reference.

---

## Stack
React 18 + Vite (port 5273) · Express/Node.js (port 3101) ·
PostgreSQL · Recharts · Lucide React
GitHub: scott7337-wq/retirestrong-pro
Directory: ~/retirestrong-pro

---

## What is actually built and working

### Infrastructure (all complete, committed)
- Email-only auth (AuthContext, LoginScreen, localStorage session)
- 5-step onboarding wizard (birth year, balances, SS, spending,
  first plan view)
- Multi-user scaffolding (4 test households, demo plans,
  user_id middleware on all /api routes)
- Engine extracted to src/engine/ (cashflow, montecarlo, tax,
  social-security, roth, market, format, constants, levers)
- Engine accepts spendingPolicy and leverOverlays as optional
  parameters — applyLeversToInp and computeYearSpending wired
- Database migration 001 applied: conversation_turns,
  chat_sessions, user_preferences tables; scenarios extended
  with applied_levers, spending_policy, is_working columns
- Vite proxy: /api/* → localhost:3101

### UI (all complete, committed)
- 3-column cockpit: sidebar / main content (8 tabs) / AI rail
- Tabs: Overview, Portfolio, Plan, Stress Test, Spending,
  Income & Tax, Roth Conversion, Assumptions
- All tabs have real data, real charts, real engine output
- Primary/Spouse naming (Scott/Stacey hardcoding removed)
- Design tokens in src/styles/tokens.css

### AI Rail — Phase A (complete, working)
- Real conversation replacing static refresh content
- Tool calling wired: read_plan, run_projection (stub),
  query_irmaa_headroom, explain_mechanism
- Agentic tool loop (up to 5 rounds) — Claude calls tools
  until it has enough to answer
- Session tracking in chat_sessions table
- Turn storage in conversation_turns table
- Token budget: warns at 20k tokens, soft limit at 30k
- Chip suggestions after every AI response
- Tool disclosure row (collapsed by default)
- "This is education, not investment advice." on every response
- System prompt: concise (3-5 sentences), no filler phrases,
  tab-aware context, chips format enforced

---

## Known gaps (next to build)

### Brief 8 — Wire real engine server-side (COMPLETE)
- server-adapter.cjs built, engine runs in Node context
- run_projection returns real cashflow, success rate,
  peak balance, MAGI
- query_irmaa_headroom returns precise dollar headroom
- 89% success rate, $1.677M portfolio verified against
  Scott's actual data

### Brief 9 — propose_change tool (ephemeral scenarios)
- AI can tentatively modify plan inputs for what-if
- Working scenario stored in scenarios table (is_working=true)
- Diff strip in UI shows what changed
- This is Phase B entry point

### Brief 10 — Phase B layout (two-pane)
- Adopt mockup layout from specs/mockups/chat-explore.html
- Explore mode: 42% chat / 58% plan
- Commit mode: 32% chat / 68% plan
- Working scenario tab with dashed border
- Pin flow modal

---

## Known issues
1. Briefing commit count is 24 (not 22 as stated in header)
2. Milestone dates in Overview ribbon out of chronological order
3. Monthly spending actuals may not persist between sessions
   for non-Scott users

---

## File structure (key files)
src/
  App.jsx                     — 2920 lines, main shell
  engine/                     — pure math modules
    cashflow.js, montecarlo.js, tax.js, social-security.js,
    roth.js, market.js, format.js, constants.js, levers.js
  context/
    PlanContext.jsx            — stub, state still in App.jsx
    AuthContext.jsx            — real, working
  components/
    shell/                    — AppShell, Sidebar, AIInsightsRail
    overview/                 — OverviewPage + sub-components
    tabs/                     — all 8 tab components
    onboarding/               — 5-step wizard
    auth/                     — LoginScreen
  styles/tokens.css           — design tokens
  data/
    demo-plans.js, planSchema.js, fieldMap.js, planAdapter.js
server.cjs                    — Express + AI chat endpoint
migrations/
  001_lever_framework.sql     — applied
specs/
  01-product-context.md       — product brief
  02-levers-spec.md           — lever framework spec
  04-lever-evaluation-spec.md — evaluation pipeline spec
  mockups/                    — Perplexity UI prototypes
    chat-explore.html         — Phase B two-pane layout target
    compare.html              — Phase B.2 compare view target

---

## Design tokens
--rs-sidebar-bg:     #F5F3EF
--rs-bg-card:        #FFFFFF
--rs-border:         #E8E4DC
--rs-teal-dark:      #0A4D54
--rs-teal-mid:       #4A9E8E
--rs-text-primary:   #1A1A1A
--rs-text-secondary: #374151
--rs-text-muted:     #6B7280
--rs-amber:          #8A5515    ← working scenario color
--rs-green:          #3D6337
--rs-red:            #8B3528

---

## Git log (most recent)
99b7251 fix(chat): scroll to AI response not chips, add MAGI estimate to read_plan, remove filler phrases
3a10ef3 fix(chat): agentic tool loop, IRMAA tiers query fix
d316349 fix(chat): add Vite proxy, relative URL in chat fetch
e2944c2 feat(chat): Phase A — real AI conversation, tool calling
7c4cd08 docs(mockups): Perplexity UI prototypes
4feb3ac feat(db): migration 001 — lever framework tables
d4a6c48 feat(engine): spendingPolicy + leverOverlays params
910a42b fix(ss): guard against null birthYear overflow
f69c076 refactor: remove Scott/Stacey hardcoding
e4b302b refactor(app): fmt helpers from engine/format.js
9896074 feat(ui): shell, overview, tabs, shared components
[+ 12 earlier commits: auth, onboarding, multiuser, engine]

---

## Connectors available
- Figma (connected) — design file: NAxbsmuWha9OVUQOZevUMw
- Claude in Chrome (connected)
- Google Drive, Gmail, Google Calendar, Slack (connected)
- NetSuite AI Connector (connected)
