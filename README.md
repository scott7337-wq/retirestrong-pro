# RetireStrong Prompts & Specs

This folder contains the standing context and engineering specs for building RetireStrong's AI-native capabilities. Documents are numbered in the order they should be loaded into Claude or referenced during implementation.

## How to use

**For any new Claude or Claude Code session about RetireStrong:**

1. Always feed `01-product-context.md` as the system prompt or first message. This is the standing brief — who we're building for, what the voice is, what's non-negotiable.

2. For specific engineering work, also feed the relevant spec(s):
   - Building lever framework? → `02-levers-spec.md`
   - Building spending policies? → `03-spending-policies-spec.md`
   - Building lever evaluation? → `04-lever-evaluation-spec.md`
   - Building survivor/conversion math? → `05-survivor-and-conversion-spec.md` (also reference `research-survivor-mechanics.md` for verified numbers)

3. When in doubt, feed everything. These documents are designed to fit comfortably in Claude's context window together.

## Document index

| File | Purpose | Status |
|------|---------|--------|
| `01-product-context.md` | Standing product brief: user, tone, principles, architecture | Living document |
| `02-levers-spec.md` | The lever framework — what levers exist, how they apply | Spec |
| `03-spending-policies-spec.md` | Spending policy sub-system (smile, guardrails, custom) | Spec |
| `04-lever-evaluation-spec.md` | The evaluation pipeline that ranks levers by impact/pain | Spec |
| `05-survivor-and-conversion-spec.md` | Survivor scenarios, long-horizon Roth conversion math | Spec |
| `research-survivor-mechanics.md` | Verified 2026 tax/IRMAA/inheritance numbers with citations | Reference |

## Implementation order

The specs are written in dependency order. The recommended build sequence is:

1. **Engine generalization first** — `02` build step 1 only. Adds `spendingPolicy` and `leverOverlays` parameters to the engine entry points without changing behavior. Foundation for everything else.

2. **First two levers** — `02` build steps 2-3. `workLonger` and `expenseAdjustment`. These exercise the overlay mechanism without needing new engine logic.

3. **Spending policy plumbing** — `03` build steps 1-3. The `computeYearSpending` hook plus `flatReal` and `smile`. This is the next foundational piece because the remaining levers and the evaluation pipeline both depend on it.

4. **Tax primitive refactor** — `05` build steps 1-2. Filing status becomes a first-class parameter throughout the tax module. Required for survivor scenarios but also valuable on its own.

5. **Remaining levers + guardrails policies** — finish `02` and `03`.

6. **Evaluation pipeline** — `04` end-to-end.

7. **Survivor and conversion math** — `05` end-to-end.

8. **AI tool registration** — extend the `/v1/messages` proxy to handle Claude tool-calling. Wire `evaluateLevers`, `applyLever`, `optimizeConversions`, and the others as tools the AI can call. This is the moment the product becomes truly AI-native.

Steps 1-3 are roughly 4-6 weeks of part-time work and produce a meaningfully better product on their own. Steps 4-7 are another 6-10 weeks. Step 8 is the unlock that turns the engine into a coach.

## Working with these specs

The specs are intentionally written as if for a careful engineering collaborator, not as task tickets. They explain the why before the what, list cross-cutting concerns, and end each section with "what to ask before implementing" so the implementer doesn't guess.

When making changes, edit the specs first, then implement. The specs are the source of truth; the code is the realization. If the implementation reveals something the spec got wrong, update the spec.

Anything in 01 that becomes outdated should be updated immediately — that document is referenced by everything else, and stale context propagates.

## What's not yet specced

These remain open for future work:

- **Housing-as-allocation lever** — modeling the rent-vs-own decision as a portfolio rebalance with LTC optionality. Mentioned in product context but not specced.
- **Probabilistic survivor (mortality-weighted MC)** — currently survivor scenarios are scheduled. Probabilistic is a v2 enhancement.
- **Conversation log and memory system** — the persistent layer that lets the AI reference prior decisions. Architecturally defined but not specced.
- **Onboarding and empty states** — what new users see before they have a plan. UX work, not engine work.
- **Tone settings panel** — Calculator/Coach/Socratic toggle plus disclaimer verbosity. UX work.
- **Pin and named scenarios system** — the storage and retrieval pattern for scenarios beyond the working scenario. Mentioned in product context but not detailed.

Spec these as they become priorities. Each should follow the same shape: how it lands in the existing codebase, what it does, the data model, the build order, what to ask before implementing.
