# RetireStrong — Product Context

You are helping build RetireStrong, a retirement planning product for self-directed retirees. Read this fully before doing any work. It is the source of truth for product decisions, voice, and architectural priorities.

## What RetireStrong is

RetireStrong is a conversational AI-native decumulation cockpit for self-directed retirees, primarily couples ages 58-72 with taxable, IRA, and Roth account complexity. The user comes to RetireStrong with a plan already roughly in place. They use it to make ongoing operational decisions during retirement: when to convert, when to draw, when to delay, what changed this month, what to do about it.

The product is not a calculator. It is not a comprehensive financial planner. It is a coach with full context and auditable math underneath, available at the moments when something has changed and the user needs to think it through.

## The defining moment

The product exists for the 6am Tuesday moment when something happened — a layoff, a market drop, a health event, a piece of news the user just read — and they need to know if they're still okay and what to do next. Most retirement software is built for the quarterly check-in. RetireStrong is built for the unscheduled hard moment. Every design decision should be evaluated against whether it serves that moment.

The user in that moment is often emotional, sometimes scared, and needs a friend who happens to know the math. Not a calculator. Not a chatbot. A coach who has full memory of their plan, their prior decisions, their stated values, and can give a real take grounded in real numbers.

## Competitive position

RetireStrong is not competing with Pralana or Boldin on feature breadth. Pralana is a power-user spreadsheet for hobbyist modelers; it will always model more knobs. Boldin is a polished web planner that will not ship opinionated AI coaching because their advisor channel makes it a regulatory and channel-conflict landmine. The big incumbents (Fidelity, Schwab, Empower) ship retirement planners as AUM funnels and cannot be opinionated without conflicting with their advisor revenue model.

RetireStrong's wedge is structural: it is the only product where a self-directed retiree can have a real conversation with their plan and get a take. This is a category, not a feature. The competitive moat is not technical — it is regulatory and business-model. Build like that's true.

## The user we are building for

The primary user is the self-directed retiree who reads retirement blogs at 6am, has accumulated meaningful assets across taxable, IRA, and Roth accounts, knows enough to know what they don't know, and is anxious about getting it wrong. They are not a FIRE optimizer who wants more knobs. They are a careful person who wants confidence grounded in math.

The secondary user is the same person's spouse, who often knows less of the mechanics and needs the product to be legible without a finance background.

Many of these users have been failed by the financial industry — sold annuities they didn't understand, told to see an advisor whose minimums or AUM fees don't match their situation, left to piece it together from forums. The product's purpose is to give them clarity at the moments that matter most.

## Product principles (non-negotiable)

**The AI never does math itself.** Every number that appears in a chat response traces to a deterministic tool call whose output is auditable. The moment one hallucinated number lands in front of a user making a real decision, trust is gone and does not come back. Every AI message that contains a number must show or be able to show the tool call that produced it.

**Every bad result comes with levers.** A 1% Monte Carlo result without guidance is worse than no result — it triggers panic without giving anywhere for the panic to go. Whenever the projection produces a fragile or failing plan, the AI must immediately surface the highest-impact corrective levers ranked by life impact. The diagnosis is incomplete without the prescription.

**Mechanical clarity over breadth.** Better to model ten things deeply with explanations a non-financial person actually understands than a hundred things shallowly. Standard examples of the depth bar: explaining why Roth conversions matter at 83 not 73 (survivor tax cliff, cumulative IRMAA, beneficiary tax cliff), modeling smile-shaped spending, modeling a house as a portfolio allocation with LTC optionality, modeling guardrails strategies.

**Tone is opinionated coaching with disclaimers.** The AI gives a take. It tells the user what it thinks, grounded in the math, and ends every response in coach mode with "This is education, not investment advice." It does not hedge into uselessness. It also does not recommend specific securities, give allocation advice, or stray outside the tax/sequencing/IRMAA/timing lane where it is explaining mechanics rather than picking products.

**Memory is full and persistent.** The AI has the user's plan state, every prior conversation, every prior decision, and the user's stated values and concerns. References to prior decisions should be specific and dated when relevant ("three weeks ago you were leaning toward delaying SS to 70").

**Scenarios are ephemeral by default.** When the user explores a what-if, a working scenario is created. The user can promote it to a named scenario when they want to keep it. Most working scenarios should disappear naturally; only the ones the user cares about persist.

## Voice and writing rules

- Never use markdown italic (asterisk text) formatting
- No emojis
- No exclamation points
- Never use the word "scrape"
- Use the user's first name occasionally, not in every message
- Be concrete with numbers from tool calls, not adjectives
- End coach-mode responses with "This is education, not investment advice."
- Reference prior decisions specifically when relevant
- Offer two or three follow-up suggestions as chips at the end of responses where the conversation has obvious next moves

## Architectural commitments

### Current stack (as of this writing)

- **Frontend**: React (App.jsx + tab components). Engine math lives in pure JS modules under `src/engine/` (cashflow.js, montecarlo.js, tax.js, social-security.js, roth.js, constants.js). Projections currently run client-side.
- **Plan model**: nested `planSchema.js` is the source of truth, flattened into a single `inp` object via `data/planAdapter.js` for the engine.
- **Backend**: Express (`server.cjs`) + Postgres. Existing tables include `users`, `accounts`, `holdings`, `profiles`, `social_security`, `roth_conversion_plan`, `expense_budget`, `bucket_config`, `healthcare_plan`, `scenarios`, `scenario_overrides`, `withdrawal_sequence`, `qcd_config`, `market_assumptions`, `return_assumptions`.
- **AI**: Claude proxied through `/v1/messages`. Tool-calling is not yet wired — adding it is a foundational item, not a feature.

### Target architecture

Three persisted layers and an orchestrator:

1. **Plan State** — the user's current accounts, balances, holdings, expected income streams, expenses, retirement timing, and plan-level assumptions. Postgres (mostly already exists; some normalization may be needed).
2. **Scenario Store** — base plan, working scenario, and any named scenarios. Each scenario is a delta against the plan plus a derivation history of applied levers. Postgres `scenarios` + `scenario_overrides` tables exist; the schema may need to extend to store applied levers as first-class records.
3. **Conversation Log** — every AI exchange with semantic search via vector index. Postgres + pgvector. Not yet built.
4. **AI Orchestrator** — Claude with tool calling. Never produces numbers itself; always calls tools. Currently the proxy passes messages through; tool-call routing needs to be added.

The tool surface (target ~13 tools at full build):

- read_plan, read_scenario, propose_change
- run_projection, run_monte_carlo, compare_scenarios
- evaluate_levers, apply_lever
- query_irmaa_headroom, recall_prior_decisions, pin_scenario
- remember_preference, explain_mechanism

### Engine integration principles

The engine modules under `src/engine/` are pure functions. New capabilities should preserve that purity — no I/O, no side effects, no global state. Levers and spending policies are added as additional parameters to the engine entry points, not as a separate parallel engine.

Projections will eventually need to run server-side as well as client-side (for AI tool calls). The engine modules should remain isomorphic JS that runs in both Node and browser contexts.

## Build philosophy

Sequencing matters. The current priority order is:

1. **Generalize the projection engine** to accept arbitrary spending policies and lever overlays as parameters. Unsexy plumbing, but every later feature depends on it.
2. **Ship the levers framework** as the headline capability. Diagnosis-with-prescription is what makes the product useful at all.
3. **Ship guardrails and smile-shaped spending** as policies the engine supports natively.
4. **Ship survivor/conversion math, housing-as-allocation, and other high-value scenario templates** that exercise the same plumbing.

At any point in this sequence the product is shippable. Build accordingly — engine first, capability second, templates third.

## What you should ask before building

If a request would compromise any of the non-negotiables above, surface that before writing code. If a feature seems to require the AI to do math directly, propose the tool surface that would make it deterministic. If a feature would broaden the product into recommendation territory beyond mechanics, flag the regulatory exposure.

If the user (Scott) gives a directive that conflicts with this document, ask which one to follow. The document is the standing intent; specific directives may override it intentionally or accidentally.
