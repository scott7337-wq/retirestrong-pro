// ============================================================================
// RetireStrong — Domain Save Functions
// src/data/domainSave.js
//
// Explicit save functions, one per domain. All confirmed working against
// the live backend before implementation.
//
// Rules:
//   - Each function is independent. Failure in one never affects others.
//   - Each function returns { ok: true } or { ok: false, error: string }.
//   - Never called automatically — always triggered by explicit user action.
//   - Inputs come from inp (parsed numbers/booleans), never raw string state.
//   - Value normalization (filing_status, healthcare_inflation) happens here,
//     not in the engine or UI.
// ============================================================================

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── uid() — resolve the active user_id ────────────────────────────────────────
// Priority: localStorage (set by AuthContext on login) → VITE_USER_ID env var.
// VITE_USER_ID is a dev-only fallback; it will NOT be present for real logged-in
// users. Any save call made while no user is logged in returns an error rather
// than silently writing to the wrong account.
function uid() {
  return localStorage.getItem('rs_user_id') || import.meta.env.VITE_USER_ID || null;
}

// ── safeFetch ─────────────────────────────────────────────────────────────────
async function safeFetch(url, options) {
  try {
    var res = await fetch(url, options);
    var data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || ('HTTP ' + res.status) };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

// ── Value normalizers ─────────────────────────────────────────────────────────
// DB stores filing_status as 'mfj'/'single', app uses 'married'/'single'
function normFilingStatus(v) {
  return v === 'married' ? 'mfj' : 'single';
}
// DB stores healthcare_inflation as integer percentage (5), app uses decimal (0.05)
function normHcInflation(v) {
  return Math.round((v || 0) * 100);
}

// ── saveProfile ───────────────────────────────────────────────────────────────
export async function saveProfile(inp) {
  if (!uid()) return { ok: false, error: 'No user_id — log in or set VITE_USER_ID in .env' };
  return safeFetch(BASE + '/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id:           uid(),
      life_expectancy:   inp.lifeExpectancy,
      filing_status:     normFilingStatus(inp.filingStatus),
      state_tax_rate:    inp.stateTaxRate,
      survivor_mode:     !!inp.survivorMode,
      monthly_spending:  inp.monthlyExpenses,
      general_inflation: inp.inflationRate,
      pension_monthly:   inp.pensionMonthly,
      part_time_income:  inp.partTimeIncome,
      part_time_years:   inp.partTimeYears,
      legacy_goal:       inp.legacyGoal,
      extra_spend_2027:  inp.extraSpend2027,
      extra_spend_2028:  inp.extraSpend2028,
    })
  });
}

// ── saveSocialSecurity ────────────────────────────────────────────────────────
export async function saveSocialSecurity(inp) {
  if (!uid()) return { ok: false, error: 'No user_id — log in or set VITE_USER_ID in .env' };
  var [r1, r2] = await Promise.all([
    safeFetch(BASE + '/api/social_security/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:          uid(),
        fra_pia_monthly:  inp.ssFRA,
        claiming_age:     inp.ssAge,
        cola_rate:        inp.ssCola,
      })
    }),
    safeFetch(BASE + '/api/social_security/2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:          uid(),
        fra_pia_monthly:  inp.spouseSSAt67,
        claiming_age:     inp.spouseSSAge,
        cola_rate:        inp.ssCola,
      })
    }),
  ]);
  if (!r1.ok) return { ok: false, error: 'person1: ' + r1.error };
  if (!r2.ok) return { ok: false, error: 'person2: ' + r2.error };
  return { ok: true };
}

// ── saveRothPlan ──────────────────────────────────────────────────────────────
export async function saveRothPlan(inp) {
  if (!uid()) return { ok: false, error: 'No user_id — log in or set VITE_USER_ID in .env' };
  var years = [
    { year: 2027, amount: inp.conv2027 },
    { year: 2028, amount: inp.conv2028 },
    { year: 2029, amount: inp.conv2029 },
    { year: 2030, amount: inp.conv2030 },
    { year: 2031, amount: inp.conv2031 },
  ];
  var results = await Promise.all(years.map(function(y) {
    return safeFetch(BASE + '/api/roth_plan/' + y.year, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid(), planned_amount: y.amount })
    });
  }));
  var failed = results.filter(function(r) { return !r.ok; });
  if (failed.length > 0) return { ok: false, error: failed[0].error };
  return { ok: true };
}

// ── saveHealthcare ────────────────────────────────────────────────────────────
// Phase 1 row (ACA Bridge) = id 1, Phase 2 (Medicare) = id 2
export async function saveHealthcare(inp) {
  if (!uid()) return { ok: false, error: 'No user_id — log in or set VITE_USER_ID in .env' };
  var [r1, r2] = await Promise.all([
    safeFetch(BASE + '/api/healthcare/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:               uid(),
        annual_cost:           inp.healthPhase1Annual,
        age_end:               inp.healthPhase1EndAge,
        healthcare_inflation:  normHcInflation(inp.healthInflation),
      })
    }),
    safeFetch(BASE + '/api/healthcare/2', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:               uid(),
        annual_cost:           inp.healthPhase2Annual,
        healthcare_inflation:  normHcInflation(inp.healthInflation),
      })
    }),
  ]);
  if (!r1.ok) return { ok: false, error: 'phase1: ' + r1.error };
  if (!r2.ok) return { ok: false, error: 'phase2: ' + r2.error };
  return { ok: true };
}

// ── saveExpenses ──────────────────────────────────────────────────────────────
export async function saveExpenses(inp) {
  if (!uid()) return { ok: false, error: 'No user_id — log in or set VITE_USER_ID in .env' };
  var cats = [
    { cat: 'housing',        amount: inp.housingMonthly   },
    { cat: 'food',           amount: inp.foodMonthly      },
    { cat: 'transportation', amount: inp.transportMonthly },
    { cat: 'travel',         amount: inp.travelMonthly    },
    { cat: 'other',          amount: inp.otherMonthly     },
  ];
  var results = await Promise.all(cats.map(function(c) {
    return safeFetch(BASE + '/api/expenses/' + c.cat, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid(), monthly_amount: c.amount })
    });
  }));
  var failed = results.filter(function(r) { return !r.ok; });
  if (failed.length > 0) return { ok: false, error: failed[0].error };
  return { ok: true };
}

// ── saveQCD ───────────────────────────────────────────────────────────────────
export async function saveQCD(inp) {
  if (!uid()) return { ok: false, error: 'No user_id — log in or set VITE_USER_ID in .env' };
  return safeFetch(BASE + '/api/qcd_config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id:       uid(),
      annual_amount: inp.qcdAmount,
      start_age:     inp.qcdStartAge,
    })
  });
}

// ── saveMarketAssumptions ─────────────────────────────────────────────────────
export async function saveMarketAssumptions(inp) {
  if (!uid()) return { ok: false, error: 'No user_id — log in or set VITE_USER_ID in .env' };
  return safeFetch(BASE + '/api/market_assumptions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id:         uid(),
      cape_ratio:      inp.capeRatio,
      ten_yr_treasury: inp.tenYrTreasury,
      tips_yield:      inp.tipsYield,
      ss_cola_rate:    inp.ssCola,
    })
  });
}

// ── saveAllDurable ────────────────────────────────────────────────────────────
// Save all durable domains in parallel. Returns array of { domain, ok, error }.
export async function saveAllDurable(inp) {
  var domains = [
    { name: 'profile',           fn: saveProfile           },
    { name: 'socialSecurity',    fn: saveSocialSecurity    },
    { name: 'rothPlan',          fn: saveRothPlan          },
    { name: 'healthcare',        fn: saveHealthcare        },
    { name: 'expenses',          fn: saveExpenses          },
    { name: 'qcdConfig',         fn: saveQCD               },
    { name: 'marketAssumptions', fn: saveMarketAssumptions },
  ];
  var results = await Promise.all(domains.map(async function(d) {
    var r = await d.fn(inp);
    return { domain: d.name, ok: r.ok, error: r.error || null };
  }));
  return results;
}
