// ============================================================================
// RetireStrong — Canonical Frontend Plan Schema
// src/data/planSchema.js
//
// Single source of truth for every user-configurable field in a RetireStrong plan.
// The flat `inp` object the engine uses is derived from this via planAdapter.js.
//
// Rules:
//   - Each field: { type, default, required, label } only. Nothing else.
//   - No validation logic, no wizard steps, no UI behavior, no route metadata.
//   - Add new fields here first, then add to planAdapter.js and fieldMap.js.
//   - The six derived balance fields (taxableBal, iraBalCash, etc.) are intentionally
//     absent — they are computed from assets via derivedTotals, not stored here.
// ============================================================================

export const PLAN_VERSION = '1.0';

export const DEFAULT_PLAN = {

  // ── Profile ────────────────────────────────────────────────────────────────
  // Maps to DB: profiles table
  profile: {
    currentAge:     { type: 'number',  default: 66,        required: true,  label: 'Current age' },
    retirementAge:  { type: 'number',  default: 67,        required: true,  label: 'Retirement age' },
    lifeExpectancy: { type: 'number',  default: 90,        required: true,  label: 'Life expectancy' },
    filingStatus:   { type: 'string',  default: 'married', required: true,  label: 'Filing status' },
    stateTaxRate:   { type: 'number',  default: 2.5,       required: true,  label: 'State tax rate (%)' },
    survivorMode:   { type: 'boolean', default: false,     required: false, label: 'Survivor mode' },
    baseYear:       { type: 'number',  default: 2026,      required: false, label: 'Base year' },
  },

  // ── Household ──────────────────────────────────────────────────────────────
  // Maps to DB: profiles table (person2 fields)
  household: {
    hasSpouse:        { type: 'boolean', default: true,  required: false, label: 'Has spouse' },
    spouseCurrentAge: { type: 'number',  default: 63,    required: false, label: 'Spouse current age' },
    staceySS63:       { type: 'boolean', default: false, required: false, label: 'Stacey claims SS at 63' },
  },

  // ── Social Security ────────────────────────────────────────────────────────
  // Maps to DB: social_security table (two rows, person 1 and 2)
  socialSecurity: {
    person1: {
      ssFRA:     { type: 'number', default: 3445, required: true,  label: 'Scott FRA PIA at age 67 ($/mo)' },
      ssMonthly: { type: 'number', default: 3445, required: true,  label: 'SS monthly at claiming age ($/mo)' },
      ssAge:     { type: 'number', default: 70,   required: true,  label: 'Scott SS claim age' },
      ssCola:    { type: 'number', default: 2.5,  required: false, label: 'SS COLA rate (%)' },
    },
    person2: {
      spouseSSAge:       { type: 'number',  default: 67,   required: false, label: 'Stacey SS claim age' },
      spouseSSMonthly:   { type: 'number',  default: 1879, required: false, label: 'Stacey SS at FRA ($/mo net)' },
      spouseSSAt63:      { type: 'number',  default: 1472, required: false, label: 'Stacey SS at 63 ($/mo net)' },
      spouseSSAt67:      { type: 'number',  default: 1879, required: false, label: 'Stacey SS at 67 ($/mo net)' },
      spouseSSIsSpousal: { type: 'boolean', default: false, required: false, label: 'Use spousal benefit calc' },
    },
  },

  // ── Income ─────────────────────────────────────────────────────────────────
  // Maps to DB: profiles + income_tracking tables
  income: {
    pensionMonthly:  { type: 'number', default: 0,  required: false, label: 'Pension ($/mo)' },
    pensionStartAge: { type: 'number', default: 67, required: false, label: 'Pension start age' },
    partTimeIncome:  { type: 'number', default: 0,  required: false, label: 'Part-time income ($/yr)' },
    partTimeYears:   { type: 'number', default: 0,  required: false, label: 'Part-time years' },
    severanceNet:    { type: 'number', default: 0,  required: false, label: 'Net severance (adds to taxable)' },
    extraSpend2027:  { type: 'number', default: 0,  required: false, label: 'Extra spend 2027' },
    extraSpend2028:  { type: 'number', default: 0,  required: false, label: 'Extra spend 2028' },
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  // Maps to DB: expense_budget table + profiles (monthly_spending, general_inflation)
  expenses: {
    monthlyExpenses:  { type: 'number', default: 8000, required: true,  label: 'Total monthly expenses ($)' },
    housingMonthly:   { type: 'number', default: 2200, required: false, label: 'Housing / HOA ($/mo)' },
    foodMonthly:      { type: 'number', default: 1200, required: false, label: 'Food ($/mo)' },
    transportMonthly: { type: 'number', default: 600,  required: false, label: 'Transportation ($/mo)' },
    travelMonthly:    { type: 'number', default: 1200, required: false, label: 'Travel ($/mo)' },
    otherMonthly:     { type: 'number', default: 2800, required: false, label: 'Other ($/mo)' },
    inflationRate:    { type: 'number', default: 3.0,  required: false, label: 'General inflation rate (%)' },
    trackingYear:     { type: 'number', default: 2026, required: false, label: 'Income tracking year' },
    spendYear:        { type: 'number', default: 2026, required: false, label: 'Spending tracking year' },
  },

  // ── Healthcare ─────────────────────────────────────────────────────────────
  // Maps to DB: healthcare_plan table
  healthcare: {
    healthPhase1Annual: { type: 'number', default: 27896, required: false, label: 'ACA annual cost (Phase 1, $)' },
    healthPhase1EndAge: { type: 'number', default: 68,    required: false, label: 'ACA end age (Medicare starts)' },
    healthPhase2Annual: { type: 'number', default: 14873, required: false, label: 'Medicare annual cost (Phase 2, $)' },
    healthInflation:    { type: 'number', default: 0.05,  required: false, label: 'Healthcare inflation rate' },
  },

  // ── Tax ────────────────────────────────────────────────────────────────────
  // Maps to DB: qcd_config table
  // Note: filingStatus and stateTaxRate live in profile — no duplication here
  tax: {
    qcdAmount:   { type: 'number', default: 15000,  required: false, label: 'QCD annual amount ($)' },
    qcdStartAge: { type: 'number', default: 70,     required: false, label: 'QCD start age' },
    legacyGoal:  { type: 'number', default: 500000, required: false, label: 'Legacy / estate goal ($)' },
  },

  // ── Return Assumptions ─────────────────────────────────────────────────────
  // Maps to DB: return_assumptions + market_assumptions tables
  returns: {
    cashReturnRate:     { type: 'number', default: 4.8,  required: false, label: 'Cash / CD / T-Bill return (%)' },
    tipsRealReturn:     { type: 'number', default: 1.8,  required: false, label: 'TIPS real return above inflation (%)' },
    dividendReturnRate: { type: 'number', default: 6.0,  required: false, label: 'Dividend ETF total return (%)' },
    growthReturnRate:   { type: 'number', default: 7.0,  required: false, label: 'Growth equity return (%)' },
    rothReturnRate:     { type: 'number', default: 7.0,  required: false, label: 'Roth growth return (%)' },
    capeRatio:          { type: 'number', default: 28.5, required: false, label: 'CAPE ratio' },
    tenYrTreasury:      { type: 'number', default: 4.2,  required: false, label: '10-year Treasury yield (%)' },
    tipsYield:          { type: 'number', default: 1.8,  required: false, label: 'TIPS yield (%)' },
    stockVol:           { type: 'number', default: 18.0, required: false, label: 'Stock volatility (%)' },
    bondVol:            { type: 'number', default: 6.0,  required: false, label: 'Bond volatility (%)' },
    correlation:        { type: 'number', default: 0.15, required: false, label: 'Stock/bond correlation' },
  },

  // ── Roth Plan ──────────────────────────────────────────────────────────────
  // Maps to DB: roth_conversion_plan table (one row per year)
  rothPlan: {
    conv2027: { type: 'number', default: 100000, required: false, label: '2027 Roth conversion ($)' },
    conv2028: { type: 'number', default: 100000, required: false, label: '2028 Roth conversion ($)' },
    conv2029: { type: 'number', default: 100000, required: false, label: '2029 Roth conversion ($)' },
    conv2030: { type: 'number', default: 50000,  required: false, label: '2030 Roth conversion ($)' },
    conv2031: { type: 'number', default: 50000,  required: false, label: '2031 Roth conversion ($)' },
  },

  // ── Bucket Config ──────────────────────────────────────────────────────────
  // Array. Populated from constants.js DEFAULT_BUCKET_CONFIG.
  // Maps to DB: bucket_config table.
  bucketConfig: [],

  // ── Assets ─────────────────────────────────────────────────────────────────
  // Array. Loaded from DB on mount, falls back to DEFAULT_ASSETS.
  // Maps to DB: holdings + accounts tables.
  assets: [],

  // ── Settings ───────────────────────────────────────────────────────────────
  // Maps to DB: app_settings table
  settings: {
    defaultTab:     { type: 'string', default: 'dashboard', required: false, label: 'Default landing tab' },
    monteCarloRuns: { type: 'number', default: 500,         required: false, label: 'Monte Carlo simulations' },
  },

  // ── Meta ───────────────────────────────────────────────────────────────────
  // Runtime only — never persisted to DB
  meta: {
    activeScenario: null,
    loadedAt:       null,
    dirty:          false,
    sourceVersion:  null,
    dataSource:     'defaults',
  },
};

// ── Helper: extract plain default values from the schema descriptors ──────────
// Returns a flat object of { fieldName: defaultValue } for every leaf descriptor.
// Useful for tests and for quickly getting defaults without running flattenPlan.
export function extractDefaults(schema) {
  var out = {};
  function walk(node) {
    Object.keys(node).forEach(function(k) {
      var v = node[k];
      if (v !== null && typeof v === 'object' && 'default' in v) {
        out[k] = v.default;
      } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        walk(v);
      }
    });
  }
  walk(schema);
  return out;
}
