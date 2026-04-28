'use strict';

/**
 * server-adapter.cjs
 * Loads the ES module engine via dynamic import() and exposes
 * it to CommonJS server.cjs.
 * Also builds inpWithAssets from DB profile + holdings rows.
 */

// Cache the loaded engine modules
let _engine = null;

async function getEngine() {
  if (_engine) return _engine;
  // Dynamic import works for ES modules from CommonJS
  _engine = await import('./index.js');
  return _engine;
}

/**
 * Build the inp object from DB profile row.
 * Maps DB column names → engine field names.
 */
function buildInpFromProfile(profile) {
  const currentAge = parseInt(profile.current_age) || 66;
  const birthYear = parseInt(profile.birth_year) || 1959;
  const spouseBirthYear = profile.has_spouse
    ? (2026 - (parseInt(profile.spouse_current_age) || 63))
    : null;

  return {
    // Identity
    currentAge,
    birthYear,
    spouseBirthYear,
    hasSpouse: !!profile.has_spouse,
    survivorMode: !!profile.survivor_mode,
    filingStatus: profile.filing_status || 'married',

    // Retirement timing
    retirementAge: parseInt(profile.retirement_age) || currentAge + 1,
    lifeExpectancy: parseInt(profile.life_expectancy) || 90,

    // Spending
    monthlyExpenses: parseFloat(profile.monthly_expenses) || 8000,

    // Rates
    inflationRate: parseFloat(profile.inflation_rate) || 3.0,
    ssCola: 2.5,
    stateTaxRate: 2.5,
    healthInflation: 0.05,

    // SS — primary
    ssFRA: parseFloat(profile.ss_monthly) || 3445,
    ssMonthly: parseFloat(profile.ss_monthly) || 3445,
    ssAge: parseInt(profile.ss_age) || 70,

    // SS — spouse
    spouseSSAge: parseInt(profile.spouse_ss_age) || 67,
    spouseSSMonthly: parseFloat(profile.spouse_ss_monthly) || 1879,
    spouseSSAt67: parseFloat(profile.spouse_ss_monthly) || 1879,
    spouseSSAt63: Math.round((parseFloat(profile.spouse_ss_monthly) || 1879) * 0.783),
    spouseEarlyClaim: false,

    // Healthcare
    healthPhase1Annual: 27896,
    healthPhase1EndAge: 68,
    healthPhase2Annual: 14873,

    // Return rates
    cashReturnRate: 4.8,
    tipsRealReturn: 1.8,
    dividendReturnRate: 6.0,
    growthReturnRate: 7.0,
    rothReturnRate: 7.0,
    capeRatio: 28.5,
    tenYrTreasury: 4.2,
    tipsYield: 1.8,

    // MC volatility
    stockVol: 18.0,
    bondVol: 6.0,
    correlation: 0.15,

    // Roth conversions (defaults)
    conv2027: 100000,
    conv2028: 100000,
    conv2029: 100000,
    conv2030: 50000,
    conv2031: 50000,

    // QCD
    qcdAmount: 15000,
    qcdStartAge: 70,

    // Part-time income
    partTimeIncome: 0,
    partTimeYears: 0,

    // Extra spend
    extraSpend2027: 0,
    extraSpend2028: 0,

    // Pension
    pensionMonthly: 0,
    pensionStartAge: 67,

    // Legacy
    legacyGoal: 500000,

    // Tracking
    trackingYear: 2026,
    spendYear: 2026,
  };
}

/**
 * Build account balances from holdings rows.
 * Maps DB account_type + asset_type → engine bucket fields.
 * DB account types: 'brokerage', 'ira', 'roth_ira', 'roth_401k'
 */
function buildBalancesFromHoldings(holdings) {
  let taxableBal = 0;
  let iraBalCash = 0;
  let iraBalTips = 0;
  let iraBalDividend = 0;
  let iraBalGrowth = 0;
  let rothBal = 0;

  for (const h of holdings) {
    const val = parseFloat(h.current_value) || 0;
    const acct = (h.account_type || '').toLowerCase();
    const type = (h.asset_type || '').toLowerCase();

    if (acct === 'brokerage' || acct === 'taxable') {
      taxableBal += val;
    } else if (acct === 'roth_ira' || acct === 'roth_401k') {
      rothBal += val;
    } else if (acct === 'ira' || acct === '401k') {
      // Classify by asset type into engine buckets
      if (type.includes('cash') || type.includes('cd') ||
          type.includes('t-bill') || type.includes('t-note') ||
          type.includes('money market')) {
        iraBalCash += val;
      } else if (type.includes('tips') || type.includes('i-bond')) {
        iraBalTips += val;
      } else if (type.includes('dividend') || type.includes('reit')) {
        iraBalDividend += val;
      } else {
        // equity, growth, international, bond etf, other → growth bucket
        iraBalGrowth += val;
      }
    }
  }

  return { taxableBal, iraBalCash, iraBalTips, iraBalDividend, iraBalGrowth, rothBal };
}

/**
 * Build derivedTotals for runMonteCarlo.
 * IMPORTANT: MC reads derivedTotals.taxable (not .taxableBal).
 */
function buildDerivedTotals(balances) {
  return {
    taxable:     balances.taxableBal,
    iraCash:     balances.iraBalCash,
    iraTips:     balances.iraBalTips,
    iraDividend: balances.iraBalDividend,
    iraGrowth:   balances.iraBalGrowth,
    roth:        balances.rothBal,
    totalPortfolio:
      balances.taxableBal + balances.iraBalCash + balances.iraBalTips +
      balances.iraBalDividend + balances.iraBalGrowth + balances.rothBal,
  };
}

/**
 * Compute summary stats from the raw MC results array.
 * Each result is { total: [balance_per_year], b1, b2, b3 }.
 */
function summarizeMC(results) {
  const finals = results
    .map(r => r.total[r.total.length - 1] || 0)
    .sort((a, b) => a - b);
  const n = finals.length;
  const successRate = Math.round((finals.filter(v => v > 0).length / n) * 100);
  const p10 = finals[Math.floor(n * 0.10)] || 0;
  const median = finals[Math.floor(n * 0.50)] || 0;
  const p90 = finals[Math.floor(n * 0.90)] || 0;
  return { successRate, medianEndingBalance: Math.round(median), p10EndingBalance: Math.round(p10), p90EndingBalance: Math.round(p90) };
}

/**
 * Run the full projection for a user.
 * Returns cashflow rows + MC summary.
 */
async function runProjectionForUser(profile, holdings, leverOverlays, spendingPolicy) {
  const engine = await getEngine();

  const inp = buildInpFromProfile(profile);
  const balances = buildBalancesFromHoldings(holdings);
  const inpWithAssets = Object.assign({}, inp, balances);
  const derivedTotals = buildDerivedTotals(balances);

  // er only needs inflation — engine reads return rates from inpWithAssets
  const er = engine.capeBased(inp.capeRatio, inp.tenYrTreasury, inp.tipsYield);

  const options = {
    leverOverlays: leverOverlays || [],
    spendingPolicy: spendingPolicy || null,
  };

  // Run deterministic projection
  const cashflow = engine.buildCashFlow(inpWithAssets, er, options);

  // Run Monte Carlo (500 runs)
  const mcRaw = engine.runMonteCarlo(inpWithAssets, er, derivedTotals, options);
  const mc = summarizeMC(mcRaw);

  // Summarize cashflow for AI consumption
  const lastRow = cashflow[cashflow.length - 1];
  const firstGapYear = cashflow.find(r => r.gap > 0);
  const peakRow = cashflow.reduce((a, b) => (b.balance > a.balance ? b : a), cashflow[0]);

  // Year 0 fields (current year)
  const year0 = cashflow[0] || {};

  return {
    // Key metrics
    successRate: mc.successRate,
    medianEndingBalance: mc.medianEndingBalance,
    p10EndingBalance: mc.p10EndingBalance,
    p90EndingBalance: mc.p90EndingBalance,
    portfolioTotal: derivedTotals.totalPortfolio,

    // Cashflow highlights
    peakBalance: peakRow.balance,
    peakAge: peakRow.age,
    balanceAtLifeExpectancy: lastRow.balance,
    firstGapAge: firstGapYear ? firstGapYear.age : null,

    // Current year
    currentYearExpenses: year0.expenses,
    currentYearIncome: year0.income,
    currentYearGap: year0.gap,
    estimatedMAGI: year0.magi || 0,

    // For IRMAA headroom
    ssAnnualIncome: year0.ssIncome || 0,
    iraDrawsThisYear: year0.fromIRA || 0,
    rothConvThisYear: year0.rothConv || 0,

    // Lever context
    leverOverlaysApplied: leverOverlays || [],
    spendingPolicyApplied: spendingPolicy || { type: 'flatReal' },

    // Full cashflow for detailed questions (first 10 years)
    cashflowSummary: cashflow.slice(0, 10).map(r => ({
      age:      r.age,
      balance:  Math.round(r.balance),
      income:   Math.round(r.income || 0),
      expenses: Math.round(r.expenses || 0),
      gap:      Math.round(r.gap || 0),
      magi:     Math.round(r.magi || 0),
    })),
  };
}

module.exports = {
  runProjectionForUser,
  buildInpFromProfile,
  buildBalancesFromHoldings,
  buildDerivedTotals,
};
