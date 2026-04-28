/**
 * levers.js — Lever overlay system
 *
 * Levers are tagged plain objects that modify an inp snapshot.
 * applyLeversToInp takes an inp object and an array of lever overlays,
 * returns a new inp with all overlays applied in order.
 * The original inp is never mutated.
 *
 * Lever types (v1):
 *   workLonger        — delay retirement, add contributions
 *   expenseAdjustment — cut or increase expenses by % or absolute
 *   socialSecurityTiming — change SS claim age(s)
 *   supplementalIncome   — add income stream for a date range
 *   spendingPolicy       — handled separately via computeYearSpending
 */

export function applyLeversToInp(inp, leverOverlays) {
  if (!leverOverlays || leverOverlays.length === 0) return inp;

  // Clone inp — never mutate the original
  let derived = Object.assign({}, inp);

  for (const lever of leverOverlays) {
    switch (lever.type) {

      case 'workLonger':
        derived = applyWorkLonger(derived, lever);
        break;

      case 'expenseAdjustment':
        derived = applyExpenseAdjustment(derived, lever);
        break;

      case 'socialSecurityTiming':
        derived = applySocialSecurityTiming(derived, lever);
        break;

      case 'supplementalIncome':
        derived = applySupplementalIncome(derived, lever);
        break;

      default:
        // Unknown lever type — log and skip, don't crash
        console.warn('applyLeversToInp: unknown lever type', lever.type);
    }
  }

  return derived;
}

// ── Individual lever implementations ────────────────────────────────────────

function applyWorkLonger(inp, lever) {
  const additionalYears = lever.additionalYears || 0;
  const derived = Object.assign({}, inp);

  // Push retirement age out
  derived.retirementAge = (inp.retirementAge || inp.currentAge) + additionalYears;

  // Continue contributions if flagged (default true)
  if (lever.continueContributions !== false) {
    derived.partTimeIncome = inp.partTimeIncome || 0;
    derived.partTimeYears  = (inp.partTimeYears || 0) + additionalYears;
  }

  // Optionally delay SS claiming
  if (lever.delaySsTo && lever.delaySsTo > inp.ssAge) {
    derived.ssAge = lever.delaySsTo;
  }

  return derived;
}

function applyExpenseAdjustment(inp, lever) {
  const derived = Object.assign({}, inp);

  if (lever.adjustmentType === 'percentage') {
    // amount is a decimal: 0.10 = 10% cut, -0.05 = 5% increase
    derived.monthlyExpenses = inp.monthlyExpenses * (1 - lever.amount);
  } else if (lever.adjustmentType === 'absolute') {
    // amount is annual dollar change (negative = cut)
    derived.monthlyExpenses = inp.monthlyExpenses + (lever.amount / 12);
  }

  // Floor at $500/month — never produce nonsense
  derived.monthlyExpenses = Math.max(500, derived.monthlyExpenses);

  return derived;
}

function applySocialSecurityTiming(inp, lever) {
  const derived = Object.assign({}, inp);

  if (lever.primaryClaimAge) {
    derived.ssAge = lever.primaryClaimAge;
  }

  if (lever.spouseClaimAge && inp.hasSpouse) {
    derived.spouseSSAge = lever.spouseClaimAge;
  }

  return derived;
}

function applySupplementalIncome(inp, lever) {
  const derived = Object.assign({}, inp);

  // Map supplemental income onto the existing partTimeIncome/partTimeYears fields.
  // These fields are already consumed by the cashflow engine.
  // yearRange: [startAge, endAge] — for now we use the duration
  if (lever.yearRange && lever.annualAmount) {
    const years = lever.yearRange[1] - lever.yearRange[0];
    derived.partTimeIncome = (inp.partTimeIncome || 0) + lever.annualAmount;
    derived.partTimeYears  = Math.max(inp.partTimeYears || 0, years);
  }

  return derived;
}

/**
 * computeYearSpending — spending policy hook
 *
 * Called once per projection year to get the spending amount for that year.
 * When no policy is provided, falls back to flat real (current behavior).
 *
 * @param {object} policy  — spending policy object (or null for flat real)
 * @param {number} age     — user's age in this projection year
 * @param {number} year    — projection year index (0 = current year)
 * @param {object} inp     — the full inp object (for base expense amounts)
 * @param {number} infMult — inflation multiplier for this year
 * @returns {number} annual spending amount (nominal dollars)
 */
export function computeYearSpending(policy, age, year, inp, infMult) {
  if (!policy || policy.type === 'flatReal') {
    // Current behavior — unchanged
    return inp.monthlyExpenses * 12 * infMult;
  }

  if (policy.type === 'smile') {
    return computeSmileSpending(policy, age, inp, infMult);
  }

  if (policy.type === 'guardrailsSimple') {
    // Guardrails requires market state — returns base for now,
    // market-aware version added in a future brief
    return inp.monthlyExpenses * 12 * infMult;
  }

  // Unknown policy — fall back to flat real, log warning
  console.warn('computeYearSpending: unknown policy type', policy.type);
  return inp.monthlyExpenses * 12 * infMult;
}

function computeSmileSpending(policy, age, inp, infMult) {
  const goGoEnd   = policy.goGoEndAge   || 75;
  const slowGoEnd = policy.slowGoEndAge || 84;

  // Base amounts — use policy amounts or derive from inp
  const goGoBase   = policy.goGoAmount   || inp.monthlyExpenses * 12;
  const slowGoBase = policy.slowGoAmount || goGoBase * 0.80;
  const noGoBase   = policy.noGoAmount   || goGoBase * 0.85;

  let baseSpend;
  if (age <= goGoEnd)        baseSpend = goGoBase;
  else if (age <= slowGoEnd) baseSpend = slowGoBase;
  else                       baseSpend = noGoBase;

  return baseSpend * infMult;
}
