// ============================================================================
// RetireStrong — Plan Adapter
// src/data/planAdapter.js
//
// Bridge between the canonical plan shape (planSchema.js) and the flat `inp`
// object the engine and tabs currently use.
//
// flattenPlan(plan)                        → inp  (engine consumption)
// buildPlan(inp, assets, bucketCfg, meta)  → plan (scenario save/load)
//
// Pre-verified: flattenPlan({}) produces 63/63 matching values vs DEFAULTS.
// Boolean fields handle DB-style 0/1 integers correctly via _b().
// The six balance fields (taxableBal, iraBalCash, iraBalTips,
// iraBalDividend, iraBalGrowth, rothBal) pass through via
// Object.assign({}, DEFAULTS, ...) — they are always overridden by
// inpWithAssets in App.jsx and are never set directly by users.
// ============================================================================

import { DEFAULTS } from '../engine/constants.js';

export function flattenPlan(plan) {
  var p = plan || {};
  var profile    = p.profile    || {};
  var household  = p.household  || {};
  var ss         = p.socialSecurity || {};
  var ss1        = ss.person1   || {};
  var ss2        = ss.person2   || {};
  var income     = p.income     || {};
  var expenses   = p.expenses   || {};
  var healthcare = p.healthcare || {};
  var tax        = p.tax        || {};
  var returns    = p.returns    || {};
  var roth       = p.rothPlan   || {};

  // Start from DEFAULTS so the six derived balance fields (taxableBal, etc.)
  // are always present as fallbacks — they get overridden by inpWithAssets anyway.
  return Object.assign({}, DEFAULTS, {
    // profile
    currentAge:     _n(profile.currentAge,     DEFAULTS.currentAge),
    retirementAge:  _n(profile.retirementAge,  DEFAULTS.retirementAge),
    lifeExpectancy: _n(profile.lifeExpectancy, DEFAULTS.lifeExpectancy),
    filingStatus:   _s(profile.filingStatus,   DEFAULTS.filingStatus),
    stateTaxRate:   _n(profile.stateTaxRate,   DEFAULTS.stateTaxRate),
    survivorMode:   _b(profile.survivorMode,   DEFAULTS.survivorMode),
    // household
    hasSpouse:        _b(household.hasSpouse,        DEFAULTS.hasSpouse),
    spouseCurrentAge: _n(household.spouseCurrentAge, DEFAULTS.spouseCurrentAge),
    staceySS63:       _b(household.staceySS63,       DEFAULTS.staceySS63),
    // social security — person 1 (Scott)
    ssFRA:     _n(ss1.ssFRA,     DEFAULTS.ssFRA),
    ssMonthly: _n(ss1.ssMonthly, DEFAULTS.ssMonthly),
    ssAge:     _n(ss1.ssAge,     DEFAULTS.ssAge),
    ssCola:    _n(ss1.ssCola,    DEFAULTS.ssCola),
    // social security — person 2 (Stacey)
    spouseSSAge:       _n(ss2.spouseSSAge,       DEFAULTS.spouseSSAge),
    spouseSSMonthly:   _n(ss2.spouseSSMonthly,   DEFAULTS.spouseSSMonthly),
    spouseSSAt63:      _n(ss2.spouseSSAt63,      DEFAULTS.spouseSSAt63),
    spouseSSAt67:      _n(ss2.spouseSSAt67,      DEFAULTS.spouseSSAt67),
    spouseSSIsSpousal: _b(ss2.spouseSSIsSpousal, DEFAULTS.spouseSSIsSpousal),
    // income
    pensionMonthly:  _n(income.pensionMonthly,  DEFAULTS.pensionMonthly),
    pensionStartAge: _n(income.pensionStartAge, DEFAULTS.pensionStartAge),
    partTimeIncome:  _n(income.partTimeIncome,  DEFAULTS.partTimeIncome),
    partTimeYears:   _n(income.partTimeYears,   DEFAULTS.partTimeYears),
    severanceNet:    _n(income.severanceNet,    DEFAULTS.severanceNet),
    extraSpend2027:  _n(income.extraSpend2027,  DEFAULTS.extraSpend2027),
    extraSpend2028:  _n(income.extraSpend2028,  DEFAULTS.extraSpend2028),
    // expenses
    monthlyExpenses:  _n(expenses.monthlyExpenses,  DEFAULTS.monthlyExpenses),
    housingMonthly:   _n(expenses.housingMonthly,   DEFAULTS.housingMonthly),
    foodMonthly:      _n(expenses.foodMonthly,      DEFAULTS.foodMonthly),
    transportMonthly: _n(expenses.transportMonthly, DEFAULTS.transportMonthly),
    travelMonthly:    _n(expenses.travelMonthly,    DEFAULTS.travelMonthly),
    otherMonthly:     _n(expenses.otherMonthly,     DEFAULTS.otherMonthly),
    inflationRate:    _n(expenses.inflationRate,    DEFAULTS.inflationRate),
    trackingYear:     _n(expenses.trackingYear,     DEFAULTS.trackingYear),
    spendYear:        _n(expenses.spendYear,        DEFAULTS.spendYear),
    // healthcare
    healthPhase1Annual: _n(healthcare.healthPhase1Annual, DEFAULTS.healthPhase1Annual),
    healthPhase1EndAge: _n(healthcare.healthPhase1EndAge, DEFAULTS.healthPhase1EndAge),
    healthPhase2Annual: _n(healthcare.healthPhase2Annual, DEFAULTS.healthPhase2Annual),
    healthInflation:    _n(healthcare.healthInflation,    DEFAULTS.healthInflation),
    // tax
    qcdAmount:   _n(tax.qcdAmount,   DEFAULTS.qcdAmount),
    qcdStartAge: _n(tax.qcdStartAge, DEFAULTS.qcdStartAge),
    legacyGoal:  _n(tax.legacyGoal,  DEFAULTS.legacyGoal),
    // return assumptions
    cashReturnRate:      _n(returns.cashReturnRate,      DEFAULTS.cashReturnRate),
    tipsRealReturn:      _n(returns.tipsRealReturn,      DEFAULTS.tipsRealReturn),
    dividendReturnRate:  _n(returns.dividendReturnRate,  DEFAULTS.dividendReturnRate),
    growthReturnRate:    _n(returns.growthReturnRate,    DEFAULTS.growthReturnRate),
    rothReturnRate:      _n(returns.rothReturnRate,      DEFAULTS.rothReturnRate),
    capeRatio:           _n(returns.capeRatio,           DEFAULTS.capeRatio),
    tenYrTreasury:       _n(returns.tenYrTreasury,       DEFAULTS.tenYrTreasury),
    tipsYield:           _n(returns.tipsYield,           DEFAULTS.tipsYield),
    stockVol:            _n(returns.stockVol,            DEFAULTS.stockVol),
    bondVol:             _n(returns.bondVol,             DEFAULTS.bondVol),
    correlation:         _n(returns.correlation,         DEFAULTS.correlation),
    // sequence-of-returns stress fields (scenario-level, must survive round-trip)
    seqStressYears:           _n(returns.seqStressYears,           DEFAULTS.seqStressYears),
    seqStressEquityDrop:      _n(returns.seqStressEquityDrop,      DEFAULTS.seqStressEquityDrop),
    seqStressInflationYears:  _n(returns.seqStressInflationYears,  DEFAULTS.seqStressInflationYears),
    seqStressInflationAdd:    _n(returns.seqStressInflationAdd,    DEFAULTS.seqStressInflationAdd),
    seqStressType:            _s(returns.seqStressType,            DEFAULTS.seqStressType),
    scenarioInsight:          _s(returns.scenarioInsight,          DEFAULTS.scenarioInsight),
    // roth plan
    conv2027: _n(roth.conv2027, DEFAULTS.conv2027),
    conv2028: _n(roth.conv2028, DEFAULTS.conv2028),
    conv2029: _n(roth.conv2029, DEFAULTS.conv2029),
    conv2030: _n(roth.conv2030, DEFAULTS.conv2030),
    conv2031: _n(roth.conv2031, DEFAULTS.conv2031),
  });
}

export function buildPlan(inp, assets, bucketCfg, meta) {
  var i = inp || {};
  return {
    profile: {
      currentAge:     i.currentAge,
      retirementAge:  i.retirementAge,
      lifeExpectancy: i.lifeExpectancy,
      filingStatus:   i.filingStatus,
      stateTaxRate:   i.stateTaxRate,
      survivorMode:   !!i.survivorMode,
    },
    household: {
      hasSpouse:        !!i.hasSpouse,
      spouseCurrentAge: i.spouseCurrentAge,
      staceySS63:       !!i.staceySS63,
    },
    socialSecurity: {
      person1: {
        ssFRA:     i.ssFRA,
        ssMonthly: i.ssMonthly,
        ssAge:     i.ssAge,
        ssCola:    i.ssCola,
      },
      person2: {
        spouseSSAge:       i.spouseSSAge,
        spouseSSMonthly:   i.spouseSSMonthly,
        spouseSSAt63:      i.spouseSSAt63,
        spouseSSAt67:      i.spouseSSAt67,
        spouseSSIsSpousal: !!i.spouseSSIsSpousal,
      },
    },
    income: {
      pensionMonthly:  i.pensionMonthly,
      pensionStartAge: i.pensionStartAge,
      partTimeIncome:  i.partTimeIncome,
      partTimeYears:   i.partTimeYears,
      severanceNet:    i.severanceNet,
      extraSpend2027:  i.extraSpend2027,
      extraSpend2028:  i.extraSpend2028,
    },
    expenses: {
      monthlyExpenses:  i.monthlyExpenses,
      housingMonthly:   i.housingMonthly,
      foodMonthly:      i.foodMonthly,
      transportMonthly: i.transportMonthly,
      travelMonthly:    i.travelMonthly,
      otherMonthly:     i.otherMonthly,
      inflationRate:    i.inflationRate,
      trackingYear:     i.trackingYear,
      spendYear:        i.spendYear,
    },
    healthcare: {
      healthPhase1Annual: i.healthPhase1Annual,
      healthPhase1EndAge: i.healthPhase1EndAge,
      healthPhase2Annual: i.healthPhase2Annual,
      healthInflation:    i.healthInflation,
    },
    tax: {
      qcdAmount:   i.qcdAmount,
      qcdStartAge: i.qcdStartAge,
      legacyGoal:  i.legacyGoal,
    },
    returns: {
      cashReturnRate:      i.cashReturnRate,
      tipsRealReturn:      i.tipsRealReturn,
      dividendReturnRate:  i.dividendReturnRate,
      growthReturnRate:    i.growthReturnRate,
      rothReturnRate:      i.rothReturnRate,
      capeRatio:           i.capeRatio,
      tenYrTreasury:       i.tenYrTreasury,
      tipsYield:           i.tipsYield,
      stockVol:            i.stockVol,
      bondVol:             i.bondVol,
      correlation:         i.correlation,
      seqStressYears:          i.seqStressYears,
      seqStressEquityDrop:     i.seqStressEquityDrop,
      seqStressInflationYears: i.seqStressInflationYears,
      seqStressInflationAdd:   i.seqStressInflationAdd,
      seqStressType:           i.seqStressType,
      scenarioInsight:         i.scenarioInsight,
    },
    rothPlan: {
      conv2027: i.conv2027,
      conv2028: i.conv2028,
      conv2029: i.conv2029,
      conv2030: i.conv2030,
      conv2031: i.conv2031,
    },
    bucketConfig: (bucketCfg || []).slice(),
    assets:       (assets    || []).slice(),
    settings: {},
    meta: Object.assign({
      activeScenario: null,
      loadedAt:       null,
      dirty:          false,
      sourceVersion:  null,
      dataSource:     'defaults',
    }, meta || {}),
  };
}

// ── Private coercion helpers ──────────────────────────────────────────────────
// Handle both JS booleans and DB-style 0/1 integers correctly.
// Explicitly allow 0 and false through — only undefined/null falls back.
function _n(v, fallback) {
  if (v === undefined || v === null) return fallback;
  var n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? fallback : n;
}
function _b(v, fallback) {
  if (v === undefined || v === null) return fallback;
  return !!v;
}
function _s(v, fallback) {
  if (v === undefined || v === null) return fallback;
  return String(v);
}
