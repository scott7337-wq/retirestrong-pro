// ── RetireStrong Engine: Bucket-Aware Monte Carlo Simulation ──────────────────
import { ssIncomeForYear } from './social-security.js';
import { getRMD, getRMDStartAge } from './constants.js';
import { rothConvForYear } from './roth.js';
import { resolveStatus, effectiveTax } from './tax.js';
import { applyLeversToInp, computeYearSpending } from './levers.js';

/**
 * runMonteCarlo(inpWithAssets, er, derivedTotals, options)
 * Runs 500 simulations of the bucket-aware withdrawal strategy.
 * Pure function — no side effects. Called from App.jsx inside a useMemo.
 *
 * Bucket discipline:
 *   B1 (cash/CD): covers expenses. Refilled from B2 dividends + TIPS maturity,
 *     and from B3 trim in up years (≤5% of B3).
 *   B2 (TIPS + dividends): TIPS mature at scheduled years → B1.
 *     Dividends sweep to B1 annually. Principal tapped only if B1 exhausted.
 *   B3 (growth + Roth): untouched in bear/stress years. Trimmed in up years.
 *   Bear year (growth < -10%): live on B1 only — no B2/B3 equity sales.
 *
 * @param {object} inpWithAssets  - merged inp + asset balances
 * @param {object} er             - { inflation, ... } from capeBased()
 * @param {object} derivedTotals  - { taxable, iraCash, iraTips, iraDividend, iraGrowth, roth }
 * @param {object} [options]      - { spendingPolicy?, leverOverlays? }
 *                                  Default {} — no behavior change vs. old 3-arg form.
 * @returns {Array<{total, b1, b2, b3}>} - one entry per simulation
 */
export function runMonteCarlo(inpWithAssets, er, derivedTotals, options = {}) {
  // Apply lever overlays to produce a derived inp — never mutates the original.
  // When leverOverlays is empty, applyLeversToInp returns the same reference.
  const { spendingPolicy = null, leverOverlays = [] } = options;
  const derived = applyLeversToInp(inpWithAssets, leverOverlays);

  var years  = derived.lifeExpectancy - derived.currentAge;
  var results = [];
  var cR    = derived.cashReturnRate    / 100;
  var tR    = er.inflation + derived.tipsRealReturn / 100;
  var dvR   = derived.dividendReturnRate / 100;
  var grR   = derived.growthReturnRate   / 100;
  var roR   = derived.rothReturnRate     / 100;
  var stockVol = derived.stockVol / 100;
  var divVol   = stockVol * 0.55;
  var tipsVol  = 0.03;
  var retireY  = derived.retirementAge - derived.currentAge;

  // TIPS maturity schedule — ratios represent a 3-tranche ladder (Apr 2028 / Jul 2031 / Jul 2034).
  // The 107/103/105 split reflects the reference household's actual TIPS ladder proportions.
  // For households without real TIPS data (e.g. wizard starters), iraTips is treated as
  // a single block and these ratios just spread it evenly across three maturity buckets.
  // TODO: make this configurable per-asset when TIPS holdings have explicit maturity dates.
  var tipsMat = {};
  tipsMat[retireY + 2] = derivedTotals.iraTips * (107000 / 315000);
  tipsMat[retireY + 5] = derivedTotals.iraTips * (103000 / 315000);
  tipsMat[retireY + 8] = derivedTotals.iraTips * (105000 / 315000);

  for (var sim = 0; sim < 500; sim++) {
    var taxable  = derivedTotals.taxable;
    var b1cash   = derivedTotals.iraCash;
    var b2tips   = derivedTotals.iraTips;
    var b2div    = derivedTotals.iraDividend;
    var b3growth = derivedTotals.iraGrowth;
    var roth     = derivedTotals.roth;

    var bals   = [Math.max(0, taxable + b1cash + b2tips + b2div + b3growth + roth)];
    var b1bals = [b1cash];
    var b2bals = [b2tips + b2div];
    var b3bals = [b3growth + roth];

    for (var y = 1; y <= years; y++) {
      var age2    = derived.currentAge + y;
      var calYear2 = 2026 + y;

      // Box-Muller random returns
      var u1 = Math.random(), u2 = Math.random();
      var z  = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-9))) * Math.cos(2 * Math.PI * u2);
      var zd = Math.sqrt(-2 * Math.log(Math.max(Math.random(), 1e-9))) * Math.cos(2 * Math.PI * Math.random());
      var zt = Math.sqrt(-2 * Math.log(Math.max(Math.random(), 1e-9))) * Math.cos(2 * Math.PI * Math.random());

      var retCash  = cR;
      var retTips  = tR  + tipsVol * zt;
      var retDiv   = dvR + divVol  * zd;
      var stressYrs  = derived.seqStressYears     || 0;
      var stressDrop = derived.seqStressEquityDrop || 0.15;
      var meanGrowth = (stressYrs > 0 && y <= stressYrs) ? (grR - stressDrop) : grR;
      var retGrowth  = meanGrowth + stockVol * z;
      var retRoth    = (meanGrowth * 1.0) + stockVol * z * 1.05;
      var marketUp   = retGrowth > 0;
      var bearYear   = retGrowth < -0.10;
      var stressType    = derived.seqStressType || 'market';
      var stressYear    = stressYrs > 0 && y <= stressYrs;
      var protectedYear = bearYear || (stressYear && stressType === 'market');

      // Income
      var inc2 = ssIncomeForYear(derived, calYear2);
      if (age2 >= derived.pensionStartAge) inc2 += derived.pensionMonthly * 12;

      // Expenses
      var inflStressYrs = derived.seqStressInflationYears || 0;
      var inflAdd       = derived.seqStressInflationAdd   || 0;
      var effInfl = (inflStressYrs > 0 && y <= inflStressYrs) ? er.inflation + inflAdd : er.inflation;
      var infMult2 = Math.pow(1 + effInfl, y);
      var hcMC = (age2 < derived.healthPhase1EndAge)
        ? derived.healthPhase1Annual * Math.pow(1 + derived.healthInflation, y)
        : derived.healthPhase2Annual * Math.pow(1 + derived.healthInflation, y);
      var exp2     = computeYearSpending(spendingPolicy, age2, y, derived, infMult2) + hcMC;
      var oneYrExp = computeYearSpending(spendingPolicy, age2, y, derived, infMult2);

      // RMDs
      var iraSum2 = b1cash + b2tips + b2div + b3growth;
      var rmd2    = (age2 >= getRMDStartAge(derived.birthYear) && iraSum2 > 0) ? iraSum2 / getRMD(age2) : 0;
      var need    = Math.max(Math.max(0, exp2 - inc2), rmd2);

      // STEP 1: Sweep dividends from B2 → B1
      var divSweep = b2div * dvR;
      b2div  = Math.max(0, b2div - divSweep);
      b1cash = b1cash + divSweep;

      // STEP 2: TIPS maturity → B1
      if (tipsMat[y]) {
        var matAmt = Math.min(b2tips, tipsMat[y] * Math.pow(1 + tR, y));
        b2tips = Math.max(0, b2tips - matAmt);
        b1cash = b1cash + matAmt;
      }

      // STEP 3: Cover gap from B1 first
      var withdrawn = 0;
      var wdFrom = function(avail, skip) {
        if (withdrawn >= need || avail <= 0 || skip) return avail;
        var amt = Math.min(avail, need - withdrawn);
        withdrawn += amt;
        return avail - amt;
      };
      taxable = wdFrom(taxable, false);
      b1cash  = wdFrom(b1cash,  false);

      // STEP 4: Tap B2 if still short
      b2tips = wdFrom(b2tips, false);
      b2div  = wdFrom(b2div,  false);

      // STEP 5: Tap B3 only if market up or last resort
      b3growth = wdFrom(b3growth, protectedYear);
      roth     = wdFrom(roth,     protectedYear);
      if (withdrawn < need) {
        b3growth = wdFrom(b3growth, false);
        roth     = wdFrom(roth,     false);
      }

      // STEP 6: Refill B1 from B3 in up years
      if (marketUp && !protectedYear && b1cash < oneYrExp && (b3growth + roth) > 0) {
        var refill = Math.min(oneYrExp - b1cash, (b3growth + roth) * 0.05);
        var fromG  = Math.min(b3growth, refill * 0.6);
        var fromR  = Math.min(roth,     refill * 0.4);
        b3growth -= fromG; roth -= fromR;
        b1cash   += fromG + fromR;
      }

      // STEP 7: Roth conversions
      var rothConv2       = rothConvForYear(derived, calYear2);
      var mcConvFromGrowth = Math.min(b3growth, rothConv2);
      var mcConvRemain    = rothConv2 - mcConvFromGrowth;
      var mcConvFromDiv   = Math.min(b2div, mcConvRemain);
      mcConvRemain       -= mcConvFromDiv;
      var mcConvFromCash  = Math.min(b1cash, mcConvRemain);
      b3growth -= mcConvFromGrowth; b2div -= mcConvFromDiv; b1cash -= mcConvFromCash;
      roth     += mcConvFromGrowth + mcConvFromDiv + mcConvFromCash;
      var mcStatus  = resolveStatus(derived);
      var mcConvTax = rothConv2 > 0
        ? (effectiveTax(inc2 + rothConv2, mcStatus) - effectiveTax(inc2, mcStatus)) + rothConv2 * (derived.stateTaxRate / 100)
        : 0;
      taxable = Math.max(0, taxable - mcConvTax);

      // STEP 8: QCD from IRA
      var qcd2         = (age2 >= derived.qcdStartAge) ? Math.min(derived.qcdAmount, iraSum2 * 0.05) : 0;
      var qcd2FromCash = Math.min(b1cash, qcd2);
      var qcd2FromDiv  = Math.min(b2div, qcd2 - qcd2FromCash);
      b1cash -= qcd2FromCash;
      b2div  -= qcd2FromDiv;

      // STEP 9: Grow remaining balances
      taxable  = Math.max(0, taxable  * (1 + cR * 0.5 + retDiv * 0.5));
      b1cash   = Math.max(0, b1cash   * (1 + retCash));
      b2tips   = Math.max(0, b2tips   * (1 + retTips));
      b2div    = Math.max(0, b2div    * (1 + retDiv));
      b3growth = Math.max(0, b3growth * (1 + retGrowth));
      roth     = Math.max(0, roth     * (1 + retRoth));

      var totalBal = Math.max(0, taxable + b1cash + b2tips + b2div + b3growth + roth);
      bals.push(totalBal);
      b1bals.push(Math.max(0, b1cash));
      b2bals.push(Math.max(0, b2tips + b2div));
      b3bals.push(Math.max(0, b3growth + roth));
      if (totalBal <= 0) break;
    }
    results.push({ total: bals, b1: b1bals, b2: b2bals, b3: b3bals });
  }
  return results;
}
