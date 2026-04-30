// ── RetireStrong Engine: Year-by-Year Cash Flow Projection ────────────────────
// primarySSForYear / spouseSSForYear — person-agnostic SS calculations.
import { primarySSForYear, spouseSSForYear } from './social-security.js';
import { getRMD, getRMDStartAge } from './constants.js';
import { rothConvForYear } from './roth.js';
import { resolveStatus, effectiveTax, combinedMarginalRate } from './tax.js';
import { applyLeversToInp, computeYearSpending } from './levers.js';

/**
 * buildCashFlow(inpWithAssets, er, options)
 * Pure function — takes plan inputs and expected-return object, returns the
 * year-by-year projection array. Called from App.jsx inside a useMemo.
 *
 * @param {object} inpWithAssets - merged inp + asset balances
 * @param {object} er            - { inflation, equityReturn, ... } from capeBased()
 * @param {object} [options]     - { spendingPolicy?, leverOverlays? }
 *                                 Default {} — no behavior change vs. old 2-arg form.
 * @returns {Array<object>}      - one row per year from currentAge to lifeExpectancy
 */
export function buildCashFlow(inpWithAssets, er, options = {}) {
  // Apply lever overlays to produce a derived inp — never mutates the original.
  // When leverOverlays is empty, applyLeversToInp returns the same reference.
  const { spendingPolicy = null, leverOverlays = [] } = options;
  const derived = applyLeversToInp(inpWithAssets, leverOverlays);

  var data = [];
  var taxable    = derived.taxableBal + (derived.severanceNet || 0);
  var iraCash    = derived.iraBalCash;
  var iraTips    = derived.iraBalTips;
  var iraDividend = derived.iraBalDividend;
  var iraGrowth  = derived.iraBalGrowth;
  var roth       = derived.rothBal;
  var years      = derived.lifeExpectancy - derived.currentAge;
  var inf   = er.inflation;
  var cR    = derived.cashReturnRate    / 100;
  var tR    = inf + derived.tipsRealReturn / 100;
  var dvR   = derived.dividendReturnRate / 100;
  var grR   = derived.growthReturnRate   / 100;
  var roR   = derived.rothReturnRate     / 100;
  var status = resolveStatus(derived);
  var stRate = derived.stateTaxRate || 2.5;

  for (var y = 0; y <= years; y++) {
    var age     = derived.currentAge + y;
    var calYear = 2026 + y;
    var infMult = Math.pow(1 + inf, y);
    var extra   = (calYear === 2027 ? derived.extraSpend2027 : 0)
                + (calYear === 2028 ? derived.extraSpend2028 : 0);
    var hcInflMult = Math.pow(1 + derived.healthInflation, y);
    var healthcare = (age < derived.healthPhase1EndAge)
      ? derived.healthPhase1Annual * hcInflMult
      : derived.healthPhase2Annual * hcInflMult;
    var livingBase = computeYearSpending(spendingPolicy, age, y, derived, infMult);
    if (calYear === 2026) livingBase = livingBase * (8.7 / 12);
    var expenses = livingBase + extra + healthcare;

    var primarySS = primarySSForYear(derived, calYear);
    var spouseSS  = spouseSSForYear(derived, calYear);
    var ssIncome  = primarySS + spouseSS;
    var income   = ssIncome;
    if (age >= derived.pensionStartAge && derived.pensionMonthly > 0) income += derived.pensionMonthly * 12;
    if (y < derived.partTimeYears && derived.partTimeIncome > 0) income += derived.partTimeIncome;

    var gap    = Math.max(0, expenses - income);
    var iraSum = iraCash + iraTips + iraDividend + iraGrowth;
    var rmd    = (age >= getRMDStartAge(derived.birthYear) && iraSum > 0) ? iraSum / getRMD(age) : 0;
    var need   = Math.max(gap, rmd);
    var mRate  = combinedMarginalRate(income + need, status, stRate);

    var withdrawn = 0; var taxes = 0;
    var fromTaxable = 0, fromIRA = 0, fromRoth = 0;
    var preTaxable = taxable, preIraCash = iraCash, preIraTips = iraTips;
    var preIraDividend = iraDividend, preIraGrowth = iraGrowth, preRoth = roth;
    var wd = function(avail, rate) {
      if (withdrawn >= need || avail <= 0) return avail;
      var amt = Math.min(avail, need - withdrawn);
      withdrawn += amt; taxes += amt * rate;
      return avail - amt;
    };
    taxable      = wd(taxable,      0.15 + stRate / 100);
    fromTaxable  = preTaxable - taxable;
    iraCash      = wd(iraCash,      mRate);
    iraTips      = wd(iraTips,      mRate);
    iraDividend  = wd(iraDividend,  mRate);
    iraGrowth    = wd(iraGrowth,    mRate);
    fromIRA      = (preIraCash - iraCash) + (preIraTips - iraTips)
                 + (preIraDividend - iraDividend) + (preIraGrowth - iraGrowth);
    roth         = wd(roth,         0);
    fromRoth     = preRoth - roth;

    var rothConv      = rothConvForYear(derived, calYear);
    var convFromGrowth = Math.min(iraGrowth, rothConv);
    var convRemain    = rothConv - convFromGrowth;
    var convFromDiv   = Math.min(iraDividend, convRemain);
    convRemain       -= convFromDiv;
    var convFromCash  = Math.min(iraCash, convRemain);
    iraGrowth   -= convFromGrowth; iraDividend -= convFromDiv; iraCash -= convFromCash;
    roth        += convFromGrowth + convFromDiv + convFromCash;

    var convGross = income + rothConv;
    var convTax   = rothConv > 0
      ? (effectiveTax(convGross, status) - effectiveTax(income, status)) + rothConv * (stRate / 100)
      : 0;
    taxable = Math.max(0, taxable - convTax);

    var ssTaxable = ssIncome * 0.85;
    var magi      = ssTaxable + fromIRA + rothConv + (derived.pensionMonthly * 12);
    var irmaaHit  = magi > 212000;

    var qcd = (age >= derived.qcdStartAge) ? Math.min(derived.qcdAmount, iraSum * 0.05) : 0;
    var qcdFromCash = Math.min(iraCash, qcd);
    var qcdFromDiv  = Math.min(iraDividend, qcd - qcdFromCash);
    iraCash     -= qcdFromCash;
    iraDividend -= qcdFromDiv;

    var estTax = Math.round(taxes + convTax + effectiveTax(income, status));
    var total  = Math.max(0, taxable + iraCash + iraTips + iraDividend + iraGrowth + roth);
    data.push({
      year: calYear, age, balance: total,
      iraBalance:     Math.round(iraCash + iraTips + iraDividend + iraGrowth),
      rothBalance:    Math.round(roth),
      taxableBalance: Math.round(taxable),
      primarySS: Math.round(primarySS), spouseSS: Math.round(spouseSS),
      income:   Math.round(income),   ssIncome: Math.round(ssIncome),
      expenses: Math.round(expenses), healthcare: Math.round(healthcare),
      living:   Math.round(livingBase + extra),
      gap:      Math.round(gap),
      fromTaxable: Math.round(fromTaxable), fromIRA: Math.round(fromIRA), fromRoth: Math.round(fromRoth),
      rothConv: Math.round(rothConv), convTax: Math.round(convTax),
      estTax, irmaaHit, magi: Math.round(magi),
      rmd:      Math.round(rmd), shortfall: Math.max(0, need - withdrawn),
      margRate: Math.round(mRate * 100),
      taxes:    Math.round(taxes),
    });

    taxable     = Math.max(0, taxable     * (1 + cR * 0.5 + dvR * 0.5));
    iraCash     = Math.max(0, iraCash     * (1 + cR));
    iraTips     = Math.max(0, iraTips     * (1 + tR));
    iraDividend = Math.max(0, iraDividend * (1 + dvR));
    iraGrowth   = Math.max(0, iraGrowth   * (1 + grR));
    roth        = Math.max(0, roth        * (1 + roR));
  }
  return data;
}
