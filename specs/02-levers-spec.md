# Levers Framework — Implementation Spec

This is the engineering spec for RetireStrong's levers framework. Read 01-product-context.md first; this assumes that context. This spec covers what to build, how it should behave, and the language the back end should use. Treat the naming as load-bearing — the AI will speak this vocabulary in user-facing copy, so the names need to be both technically precise and human-legible.

## How this lands in the existing codebase

The current engine lives at `src/engine/` with pure JS modules. The relevant entry points for levers are:

- `engine/cashflow.js` exports `buildCashFlow(inp, er)` — the deterministic year-by-year projection.
- `engine/montecarlo.js` exports `runMonteCarlo(inp, er, ...)` — the stochastic projection.
- The engine consumes a flat `inp` object derived from `planSchema.js` via `data/planAdapter.js`.

Levers extend these entry points by adding two optional parameters: `spendingPolicy` and `leverOverlays`. They do not replace `inp` — they layer on top of it. This preserves backward compatibility with the existing UI tabs that call the engine directly.

Scenarios and scenario_overrides tables already exist in Postgres. The lever framework extends scenario_overrides to store applied levers as structured records, not just flat key/value overrides. See "Database changes" section below.

## What the levers framework is

A lever is a parameterized intervention that modifies a plan or scenario to improve a specific outcome metric. Levers are the prescription side of the diagnose-and-prescribe pattern. When the projection engine returns a fragile result, the AI's first move is to evaluate the available levers, rank them by impact and pain, and present the top options for conversation.

Levers are first-class objects in the system, not ad-hoc parameters. They have a name, a description, a parameter space, an applicability rule, and a way to be evaluated against a scenario.

## The five core levers (v1)

Build these five first. They cover the highest-impact decisions for almost every retiree.

### 1. WorkLongerLever

Delay retirement by N years. Effects compound: more contributions to retirement accounts during the delay, fewer years drawing from the portfolio, larger SS check if claiming is also delayed, fewer years of healthcare gap before Medicare.

Parameters:
- `additional_years` — integer, typically 1 to 5
- `continue_contributions` — boolean, default true
- `delay_ss_to` — optional integer age, default null (separate decision)
- `bridge_health_insurance_cost` — optional dollar amount, default uses plan assumption

Applicability: user is currently working or has not yet retired. If already retired, this lever is not applicable; suggest part-time supplemental income instead.

### 2. SpendingPolicyLever

Change the spending policy applied to the plan. This is the lever that swaps in smile-shaped spending, guardrails, or custom curves in place of flat real spending.

Parameters:
- `policy` — enum: `flat_real`, `smile`, `guardrails_guyton_klinger`, `guardrails_simple`, `custom_curve`
- Policy-specific parameters (see Spending Policies section below)

Applicability: always applicable. The default plan starts with `flat_real`; this lever is how the user explores alternatives.

### 3. SocialSecurityTimingLever

Change the SS claiming age for one or both spouses. For couples, the higher-earner-delays strategy is often the highest-impact single timing decision in the plan.

Parameters:
- `primary_claim_age` — integer 62-70
- `spouse_claim_age` — optional integer 62-70
- `bridge_strategy` — enum: `portfolio_draw`, `part_time_income`, `mixed`, default `portfolio_draw`

Applicability: user has not yet claimed, or one spouse has not yet claimed. Flag if the user is past full retirement age for relevant warnings.

### 4. ExpenseAdjustmentLever

Reduce planned expenses by a percentage or dollar amount, optionally only in specific year ranges. Different from SpendingPolicyLever — this is a level shift, not a policy change.

Parameters:
- `adjustment_type` — enum: `percentage`, `absolute`
- `amount` — number (percentage as decimal, e.g. 0.10 for 10%; or dollar amount)
- `year_range` — optional tuple (start_age, end_age), default applies to all retirement years
- `categories` — optional list of expense categories if the plan models expenses by category

Applicability: always applicable. The AI should be cautious about suggesting this lever in isolation — it should usually pair with a question about which expenses are flexible.

### 5. SupplementalIncomeLever

Add part-time work, consulting, rental income, or other supplemental income for a defined period. Highest-leverage in the early retirement years where it triple-duties as income, withdrawal deferral, and SS deferral enabler.

Parameters:
- `annual_amount` — dollar amount
- `year_range` — tuple (start_age, end_age)
- `income_type` — enum: `earned`, `passive`, `rental`, `consulting` (affects tax treatment and SS earnings test)
- `tax_treatment` — enum: `w2`, `self_employed`, `passive`, derived from income_type by default

Applicability: always applicable, but the AI should reality-check feasibility — proposing $80k/year of consulting income to someone with no consulting history is an unrealistic lever.

## Spending Policies (referenced by SpendingPolicyLever)

Spending policies are a sub-system of the engine, not a separate lever type. Each policy is a function that takes (year, plan_state, market_state) and returns the spending amount for that year.

### FlatRealPolicy

Default. Constant real (inflation-adjusted) spending each year. Parameter: `base_amount`.

### SmilePolicy

Spending follows the empirically-observed retirement spending curve: high in go-go years (60s through early 70s), declining in slow-go years (mid-70s to early 80s), bumping back up for healthcare in no-go years (mid-80s+).

Parameters:
- `go_go_amount` — annual real spending in go-go phase
- `slow_go_amount` — annual real spending in slow-go phase
- `no_go_amount` — annual real spending in no-go phase
- `go_go_end_age` — default 75
- `slow_go_end_age` — default 84
- `healthcare_uplift` — optional explicit healthcare spending increase in no-go phase

Default shape if amounts not specified: slow_go is ~80% of go_go, no_go is ~85% of go_go (the bump back up reflects healthcare).

### GuardrailsGuytonKlinger Policy

Guyton-Klinger guardrails. Spending starts at an initial withdrawal rate; if the current withdrawal rate exceeds an upper guardrail, spending is cut by a fixed percentage; if it falls below a lower guardrail, spending is increased by a fixed percentage. Includes inflation rule and portfolio management rule.

Parameters:
- `initial_withdrawal_rate` — default 0.054
- `upper_guardrail` — default 0.06 (cut spending if WR exceeds this)
- `lower_guardrail` — default 0.04 (increase spending if WR drops below this)
- `cut_percentage` — default 0.10
- `raise_percentage` — default 0.10
- `prosperity_rule_enabled` — boolean, default true

### GuardrailsSimplePolicy

Simpler guardrails for users who don't want full Guyton-Klinger complexity. Cut spending by a fixed percentage in years following a portfolio decline of more than X percent.

Parameters:
- `decline_threshold` — default 0.15 (15% portfolio decline triggers cut)
- `cut_percentage` — default 0.10
- `cut_duration_years` — default 1
- `recovery_rule` — enum: `automatic`, `manual_review`

### CustomCurvePolicy

User-defined or AI-proposed annual spending curve. Useful for specific scenarios like "we want to spend $120k/year for the first decade traveling, then drop to $70k/year." This is the policy the AI uses when the user describes a specific spending shape in conversation.

Parameters:
- `annual_amounts` — list of (age, real_amount) tuples, interpolated linearly between points

## The lever evaluation pipeline

When a scenario produces a fragile result (success rate below a threshold, e.g. 70%, or the user explicitly asks "how do I fix this"), the engine runs the lever evaluation pipeline:

1. **Filter to applicable levers** — the SocialSecurityTimingLever does not apply if both spouses have already claimed, etc.

2. **Generate candidate parameterizations** for each applicable lever. For WorkLongerLever, candidates might be 1, 2, and 3 additional years. For SpendingPolicyLever, candidates are switching to smile or guardrails. The candidate set should be limited (3-5 per lever) to keep computation bounded.

3. **Run the projection for each candidate** — same Monte Carlo, same time horizon, same market assumptions. Compute the delta in success rate, P10 ending balance, lifetime spend, and any other tracked metrics.

4. **Score each candidate** along two axes:
   - **Impact** — how much the metric of interest improves (e.g., delta in success rate)
   - **Pain** — a heuristic for how much the user is giving up. Working two more years is high pain; switching from flat to smile spending is low pain because most users would have done it anyway. Pain scores are coarse (low/medium/high) and partly subjective; document the reasoning.

5. **Rank by impact-per-unit-pain** and return the top candidates. The AI uses these to drive the conversation.

The output of the pipeline is a structured object the AI can read:

```
LeverEvaluation:
  triggering_metric: "success_rate"
  baseline_value: 0.18
  candidates:
    - lever: WorkLongerLever(additional_years=2)
      result_value: 0.71
      delta: +0.53
      pain: medium
      summary: "Two more years of work raises success from 18% to 71%."
    - lever: SpendingPolicyLever(policy=guardrails_guyton_klinger)
      result_value: 0.62
      delta: +0.44
      pain: low
      summary: "Guardrails spending raises success to 62% with cuts only in bad sequences."
    ...
```

## Tool surface for levers

Two new tools, plus extensions to existing tools:

### evaluate_levers

Inputs: scenario_id, optional metric_of_interest (default: success_rate), optional lever_filter (subset of lever types to consider).

Outputs: LeverEvaluation object as above.

Used by the AI when the user asks "what would fix this" or when the projection returns a fragile result.

### apply_lever

Inputs: scenario_id, lever_type, lever_parameters.

Outputs: a new working scenario with the lever applied, including derivation history so the user can see the chain of decisions.

Used when the user says "let's try delaying two years" or "what if we use guardrails instead."

### Extensions to existing tools

`run_projection` and `run_monte_carlo` should accept an optional `spending_policy` parameter and `lever_overlays` parameter so the projection engine can be invoked with arbitrary policies and overlays without going through the scenario-creation flow.

`compare_scenarios` should be able to surface which levers differ between two scenarios in its output, so the AI can say "Retire-67 differs from base by: WorkLongerLever(2), SocialSecurityTimingLever(70)."

## Naming and language conventions

The AI will speak this vocabulary in user-facing copy. Names need to be precise enough for engineering and human enough for conversation.

Internal naming follows the existing engine convention (lowerCamelCase function names, plain object shapes — not classes). Levers are tagged plain objects with a `type` discriminator, not class instances. This matches how `inp`, scenarios, and engine modules already work.

- Type tag: `workLonger`. User-facing phrasing: "work two more years," "delay retirement to 67."
- Type tag: `spendingPolicy`. User-facing phrasing: "switch to guardrails spending," "model smile-shaped spending."
- Type tag: `socialSecurityTiming`. User-facing phrasing: "delay Social Security to 70."
- Type tag: `expenseAdjustment`. User-facing phrasing: "cut expenses 10%," "trim discretionary spending in years 67-72."
- Type tag: `supplementalIncome`. User-facing phrasing: "add $30k of consulting income for three years."

Pain scores in user-facing copy: "low impact on lifestyle," "moderate tradeoff," "significant change to plan." Never use the word "pain" in user-facing copy.

## Data model

Levers are tagged plain objects matching the existing engine style. JS shapes:

```js
// Levers
{ type: 'workLonger', additionalYears, continueContributions, delaySsTo, bridgeHealthInsuranceCost }
{ type: 'spendingPolicy', policy: <SpendingPolicy> }
{ type: 'socialSecurityTiming', primaryClaimAge, spouseClaimAge, bridgeStrategy }
{ type: 'expenseAdjustment', adjustmentType: 'percentage'|'absolute', amount, yearRange: [startAge, endAge], categories }
{ type: 'supplementalIncome', annualAmount, yearRange: [startAge, endAge], incomeType, taxTreatment }

// Spending policies (used inside spendingPolicy lever)
{ type: 'flatReal', baseAmount }
{ type: 'smile', goGoAmount, slowGoAmount, noGoAmount, goGoEndAge, slowGoEndAge, healthcareUplift }
{ type: 'guardrailsGuytonKlinger', initialWithdrawalRate, upperGuardrail, lowerGuardrail, cutPercentage, raisePercentage, prosperityRuleEnabled }
{ type: 'guardrailsSimple', declineThreshold, cutPercentage, cutDurationYears, recoveryRule }
{ type: 'customCurve', annualAmounts: [[age, realAmount], ...] }

// Evaluation output
{
  triggeringMetric: 'successRate',
  baselineValue: 0.18,
  candidates: [
    {
      lever: { type: 'workLonger', additionalYears: 2, continueContributions: true },
      resultValue: 0.71,
      delta: 0.53,
      pain: 'medium',
      summary: 'Two more years of work raises success from 18% to 71%.'
    },
    ...
  ]
}
```

Scenarios store their applied levers as a JSON array, not just flat overrides, so derivation history is preserved. See database changes section.

## Database changes

The existing `scenarios` table holds scenario metadata (name, is_active, is_default). The existing `scenario_overrides` table is a flat key-value store of parameter overrides. The lever framework adds:

```sql
ALTER TABLE scenarios ADD COLUMN applied_levers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scenarios ADD COLUMN spending_policy JSONB DEFAULT NULL;
ALTER TABLE scenarios ADD COLUMN derived_from_scenario_id INTEGER REFERENCES scenarios(scenario_id);
ALTER TABLE scenarios ADD COLUMN is_working BOOLEAN DEFAULT false;
ALTER TABLE scenarios ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
```

`applied_levers` is the canonical list of levers stacked on top of the base plan to produce this scenario. Loading a scenario means: read base plan, apply each lever in order, return the resulting `inp` object.

`spending_policy` is stored separately because every scenario has exactly one spending policy (default is flatReal); no need to put it inside the lever array.

`is_working` flags the ephemeral working scenario. There is at most one per user. When the user pins it, this flag is cleared and the scenario gets a name.

## Build order within this spec

1. **Engine generalization.** Add optional `spendingPolicy` and `leverOverlays` parameters to `buildCashFlow` and `runMonteCarlo`. Default to `{ type: 'flatReal', baseAmount: inp.monthlyExpenses * 12 }` and `[]` respectively to preserve current behavior. Implement a `applyLeversToInp(inp, leverOverlays)` helper that returns a derived `inp` with overlays applied, so the engine internals don't need to know about lever types directly.

2. **First two levers.** Implement `workLonger` and `expenseAdjustment` first. These are the simplest because they only modify the existing `inp` shape (retirementAge, partTimeIncome, partTimeYears, monthlyExpenses) — no new engine logic.

3. **Spending policy plumbing.** Replace the hardcoded `inp.monthlyExpenses * 12 * infMult + extra + healthcare` expression in the engine with a `computeYearSpending(policy, year, age, planContext)` function. Implement `flatReal` (current behavior) and `smile` first.

4. **Guardrails policies.** Implement `guardrailsGuytonKlinger` (full Guyton-Klinger rules) and `guardrailsSimple`. These require the engine to track market-state context per year for the decision rules to fire — confirm the existing engine surfaces enough state for this, or extend it.

5. **Remaining levers.** Implement `socialSecurityTiming` and `supplementalIncome`. These need engine logic changes — SS timing already exists in the projection, the lever just sets parameters; supplemental income needs to add income streams in a parameterized way.

6. **Evaluation pipeline.** Implement `evaluateLevers(scenarioId, options)` once at least three lever types exist. This is the function that ranks candidates by impact-per-pain.

7. **Scenario integration.** Add `applyLever(scenarioId, lever)` that creates or modifies the working scenario by appending to `applied_levers`. Wire to the existing scenario read/write API.

8. **AI tool registration.** Register `evaluateLevers` and `applyLever` as tools the AI can call via the Claude tool-calling API. This requires extending the `/v1/messages` proxy to handle tool_use blocks rather than just passing through.

## What to ask before implementing

- Read `engine/cashflow.js` and `engine/montecarlo.js` end-to-end before writing any lever code. The exact place where year-by-year spending is computed is where the spending policy hook needs to slot in.
- Confirm whether the existing `scenario_overrides` table is actively used by any scenario in production, or if it's safe to deprecate in favor of the new `applied_levers` column. If in use, both need to coexist for a migration period.
- Confirm the threshold for "fragile" plans that should auto-trigger lever evaluation. Default suggestion: success_rate below 0.70, or P10 ending balance below a user-defined floor.
- Confirm where the projection should run for AI tool calls — client-side passing results back, or server-side with the engine modules imported into Node. Client-side is faster to ship; server-side is required for any AI workflow that doesn't have a live browser session (scheduled checks, async analysis).
