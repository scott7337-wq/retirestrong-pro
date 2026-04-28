# Lever Evaluation Pipeline — Implementation Spec

This spec details the evaluation pipeline that ranks levers when a plan is fragile or the user asks "how do I fix this." Read 01-product-context.md and 02-levers-spec.md first.

The evaluation pipeline is what turns the levers framework from a list of options into actual coaching. It's the diagnose-and-prescribe step: given a plan that has a problem, surface the highest-leverage corrective actions ranked by impact and pain. This is the function the AI calls when a user gets a scary result.

## What the pipeline does

```js
evaluateLevers(scenarioId, options) -> LeverEvaluation
```

Given a scenario, the pipeline:

1. Runs the baseline projection to establish the metric of interest (default: success rate from Monte Carlo).
2. Filters the lever catalog to those applicable to this user and scenario.
3. For each applicable lever, generates 2-4 candidate parameterizations.
4. Runs the projection for each candidate, computes the delta vs baseline.
5. Scores each candidate by impact and pain.
6. Ranks and returns the top N candidates.

The output is consumed by the AI to drive a conversation with the user. The AI does not interpret raw numbers — it reads the structured output, applies its voice, and presents the user with a real take.

## Inputs

```js
{
  scenarioId: string,                    // which scenario to evaluate against
  metricOfInterest: 'successRate'        // 'successRate' | 'p10EndingBalance' | 'lifetimeSpend' | 'medianEndingBalance'
                  | 'p10EndingBalance'
                  | 'lifetimeSpend'
                  | 'medianEndingBalance',
  leverFilter: ['workLonger', ...],      // optional; restrict to a subset
  topN: 5,                                // how many candidates to return (default 5)
  monteCarloRuns: 500,                    // override default MC runs for evaluation speed
  fragilityThreshold: 0.70                // success rate below this triggers "fragile" framing
}
```

## Outputs

```js
{
  triggeringMetric: 'successRate',
  baselineValue: 0.18,
  baselineStatus: 'fragile' | 'borderline' | 'healthy',
  evaluatedAt: '2026-04-28T13:48:00-07:00',
  candidates: [
    {
      lever: { type: 'workLonger', additionalYears: 2, continueContributions: true },
      resultValue: 0.71,
      delta: 0.53,
      pain: 'medium',
      painReason: 'Two additional years of work delays retirement lifestyle.',
      impactPerPain: 'high',
      summary: 'Two more years of work raises success from 18% to 71%.',
      explanation: 'Working through age 67 stacks three effects: two more years of contributions, two fewer years of withdrawal, and a roughly 16% larger SS check if you also delay claiming. The portfolio survives most stress sequences.',
      crossEffects: [
        { dimension: 'taxes', note: 'Adds 2 years of W-2 income; some Roth conversion room shifts.' },
        { dimension: 'irmaa', note: 'No effect during working years (employer coverage).' }
      ]
    },
    ...
  ],
  combinedRecommendation: {
    description: 'Pairing work-longer with smile spending recovers the plan with moderate lifestyle change.',
    levers: [
      { type: 'workLonger', additionalYears: 1 },
      { type: 'spendingPolicy', policy: { type: 'smile' } }
    ],
    resultValue: 0.83,
    delta: 0.65,
    pain: 'low'
  }
}
```

## The candidate generation step

For each applicable lever, the pipeline generates candidates that span the meaningful decision space without exploding. Specifications:

### workLonger candidates
- 1 additional year, contributions on, SS unchanged
- 2 additional years, contributions on, SS unchanged
- 3 additional years, contributions on, SS delayed to 70

If user is past their stated retirement age, this lever doesn't apply; emit no candidates.

### expenseAdjustment candidates
- Cut 5% across all years
- Cut 10% across all years
- Cut 10% in the first 10 retirement years only (the sequence-risk window)

If user has flagged certain expense categories as fixed (mortgage, healthcare), exclude those from cuts in candidate descriptions.

### spendingPolicy candidates
- Switch to `smile` with default multipliers
- Switch to `guardrailsSimple` (decline threshold 15%, cut 10%)
- Switch to `guardrailsGuytonKlinger` with default parameters

If current policy is already non-flat, emit candidates that show alternatives to the current policy.

### socialSecurityTiming candidates
- Delay primary to 70 (if currently <70)
- Delay spouse to FRA (if currently earlier)
- Delay both to 70 (if applicable)

If both spouses have already claimed, emit no candidates.

### supplementalIncome candidates
- $20k/year for 3 years, consulting
- $30k/year for 5 years, consulting
- $15k/year for 10 years, part-time

The AI should reality-check feasibility downstream — the pipeline emits candidates regardless.

## The pain scoring

Pain is a coarse heuristic, not a measurable quantity. We use three buckets — low, medium, high — applied via deterministic rules. The reasoning is encoded so the AI can communicate it without inventing.

### Pain rules

**Low pain:**
- `spendingPolicy` switching to smile (most retirees would do this anyway)
- `expenseAdjustment` cuts of 5% or less
- `socialSecurityTiming` delays of 1 year or less

**Medium pain:**
- `workLonger` of 1-2 years
- `expenseAdjustment` cuts of 6-15%
- `spendingPolicy` switching to guardrails (real lifestyle impact during bad sequences)
- `socialSecurityTiming` delays of 2-3 years
- `supplementalIncome` requiring active work in early retirement

**High pain:**
- `workLonger` of 3+ years
- `expenseAdjustment` cuts greater than 15%
- `socialSecurityTiming` delays of 4+ years
- `supplementalIncome` exceeding what the user has signaled is realistic

Edge cases (large supplemental income from passive sources, etc.) get downgraded by one tier — passive income is lower pain than active work.

The pain bucket is paired with a `painReason` string that explains the bucket. This is what the AI quotes back to the user.

## The impact-per-pain ranking

After candidates have impact (delta) and pain (low/medium/high), the pipeline ranks them. The simplest workable scoring:

```js
// pain weight: low=1, medium=2, high=3
// impact normalized to baseline gap: how much of the gap to "healthy" did this candidate close
const painWeight = { low: 1, medium: 2, high: 3 }[candidate.pain];
const gapToHealthy = max(0.7 - baselineValue, 0.1);  // floor at 10% to avoid div-by-zero
const gapClosed = candidate.delta / gapToHealthy;
candidate.impactPerPain = gapClosed / painWeight;
```

Then sort candidates by `impactPerPain` descending and take the top N.

This scoring is intentionally simple. We could get fancier, but the user-facing output only distinguishes "this is the best lever, this is second, etc." The relative ordering is what matters, not the absolute score.

The `impactPerPain` value itself is bucketed for the output: `high` (>0.5), `medium` (0.2-0.5), `low` (<0.2). This is what shows in the candidate object.

## The combined recommendation

A common real-world answer is "do two things, each less painful than one big thing." The pipeline always evaluates one combined recommendation: the lowest-pain combination of two levers that gets the plan to healthy (success rate ≥0.70).

Algorithm:
1. From the top candidates, pick the lowest-pain candidate that already gets to healthy. If found, return it solo.
2. Otherwise, take pairs of candidates (cartesian product of the top 5, deduplicated by lever type), apply both levers together, run the projection.
3. From those that get the plan to healthy, return the lowest combined pain.
4. If none get to healthy with two levers, return the highest-impact combination as a stretch recommendation, flagged as "still fragile but better."

The combined recommendation is the AI's "if you ask me for one piece of advice" answer. The individual candidates are for when the user wants to explore the decision space.

## Cross-effects

For each candidate, the pipeline annotates cross-effects on dimensions other than the primary metric. This is what makes the output usable for a real conversation.

Cross-effect dimensions to track (v1):
- **Taxes** — does this lever materially change lifetime tax? (Threshold: ±$50k difference)
- **IRMAA** — does this lever change which IRMAA tiers the household hits in any year?
- **Conversion room** — does this lever expand or compress the Roth conversion window?
- **Survivor outcome** — does this lever change the surviving spouse's plan health if applicable?
- **Heir outcome** — does this lever change the legacy / inheritance picture?

Each cross-effect is a `{ dimension, note }` pair. The note is a one-sentence human-readable summary computed from the projection deltas. The AI uses these to pre-empt the natural follow-up questions.

## Performance considerations

A naive implementation runs Monte Carlo for the baseline plus one MC per candidate plus one MC per combined-pair candidate. With 5 levers × 3 candidates each plus pair combinations, that's ~35 Monte Carlo runs per evaluation. At 500 paths × 30 years per run, this is real compute.

Optimizations:

**Reduce MC runs for evaluation.** Use 200 paths for evaluation (still statistically meaningful for ranking purposes), then re-run the chosen candidate at full 500-path resolution when it's applied.

**Parallelize.** The candidate evaluations are embarrassingly parallel. If running server-side in Node, use worker_threads. If running client-side, use Web Workers. Either way, don't block the UI thread.

**Cache.** A given (scenarioId, leverConfig) pair always produces the same projection. Cache results keyed on the hash of the inputs. Invalidate when the scenario changes.

**Streaming.** The AI tool call doesn't have to wait for all candidates. Stream candidates as they finish so the UI can show progress and the AI can begin composing a response on the highest-impact candidates first.

A reasonable target: 5 seconds for a full evaluation on commodity hardware, 10 seconds worst case. Anything over that needs a "thinking" UI affordance.

## Auto-trigger vs explicit invocation

The pipeline can be triggered two ways:

**Explicit** — the user (or AI) calls `evaluateLevers` directly. Used when the user asks "how do I fix this" or "what are my options."

**Auto-trigger** — when a scenario projection returns a fragile result (success rate < fragilityThreshold), the engine automatically runs lever evaluation and returns it alongside the projection. The AI sees both in the same tool response and can present them together.

Auto-trigger is the default behavior. The fragility threshold defaults to 0.70 success rate but is configurable per user (some users want to see levers any time success drops below 0.85; others only when below 0.50).

## Tool registration

This pipeline is exposed to the AI as the `evaluateLevers` tool:

```json
{
  "name": "evaluateLevers",
  "description": "Evaluate which levers (work longer, change spending, delay SS, cut expenses, add income) would most improve a fragile or failing plan. Returns ranked candidates with impact and pain scores. Call this whenever the user asks how to fix a plan, what their options are, or when a Monte Carlo result is concerning.",
  "input_schema": {
    "type": "object",
    "properties": {
      "scenarioId": { "type": "string" },
      "metricOfInterest": { "type": "string", "enum": ["successRate", "p10EndingBalance", "lifetimeSpend", "medianEndingBalance"] },
      "leverFilter": { "type": "array", "items": { "type": "string" } },
      "topN": { "type": "integer", "default": 5 }
    },
    "required": ["scenarioId"]
  }
}
```

The AI reads the structured response, picks 2-3 candidates to discuss based on which match the user's expressed concerns, and presents them in coach voice.

## Example AI use

User says: "I tried lower numbers and got a 1% chance of success. What do I do?"

AI calls `evaluateLevers(scenarioId: 'working', metricOfInterest: 'successRate')`.

Pipeline returns: baseline 0.01, top candidate `workLonger(2)` at 0.42, second `spendingPolicy(smile)` at 0.31, third `supplementalIncome(20k for 5y)` at 0.38, combined `workLonger(1) + smile` at 0.55.

AI response (rough shape, voice applied at runtime):

> A 1% result is a hard number, but the gap is closeable. Three things move it most for your situation, ordered by how much they help relative to the lifestyle change.
>
> [Top three candidates as discrete bullets, each with the candidate's summary and a one-sentence read on the tradeoff.]
>
> If I had to pick one direction: pairing one extra year of work with smile-shaped spending — meaning you accept that real spending will drift down in your late 70s as most retirees naturally do — gets you to 55% success. That's still fragile, but it's a real conversation rather than a wall.
>
> Want me to model any of these in detail, or talk through which feels most realistic for you?
>
> This is education, not investment advice.

The pipeline doesn't write that response — the AI does. The pipeline's job is to deliver the structured material that lets the AI write it without inventing numbers.

## Build order within this spec

1. Implement `evaluateLevers` core flow with `workLonger` and `expenseAdjustment` only. Three candidates each, one metric (successRate). Sequential MC runs.
2. Add pain scoring per the rules above. Verify the ranking matches intuition on at least three test plans.
3. Add `spendingPolicy` candidates (requires policy spec implemented).
4. Add cross-effect annotation. Tax delta and IRMAA tier crossings first.
5. Add combined recommendation. This requires being thoughtful about which pair combinations to evaluate to avoid combinatorial blowup.
6. Add `socialSecurityTiming` and `supplementalIncome` candidates.
7. Add caching layer.
8. Parallelize MC runs across candidates.
9. Wire as an AI tool through the Claude `/v1/messages` proxy.
10. Add auto-trigger on fragile results returned from `runMonteCarlo`.

## What to ask before implementing

- Read `engine/montecarlo.js` to understand the current MC structure and how success rate is computed. The pipeline calls this many times per evaluation, so the call signature matters.
- Confirm whether the current MC implementation supports running with arbitrary `inp` (with overlays applied) without state leakage. If there's hidden state, that needs to be cleaned up first.
- Decide the fragility threshold default. 0.70 is a defensible starting point but the team should agree.
- Decide whether evaluation runs server-side or client-side initially. Recommended: client-side to start (faster to ship, leverages user's own compute), with server-side as a follow-up for AI-initiated evaluations.
