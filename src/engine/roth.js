// ── RetireStrong Engine: Roth Conversions & RMD ───────────────────────────────
import { getRMD } from './constants.js';
import { effectiveTax, resolveStatus } from './tax.js';

export { getRMD };

export function rothConvForYear(inp, calYear) {
  var schedule = {
    2027: inp.conv2027, 2028: inp.conv2028, 2029: inp.conv2029,
    2030: inp.conv2030, 2031: inp.conv2031
  };
  return schedule[calYear] || 0;
}

// Apply Roth conversion — sources growth first, then dividend, then cash
// Returns updated { iraGrowth, iraDividend, iraCash, roth }
export function applyRothConversion(convAmt, iraGrowth, iraDividend, iraCash, roth) {
  var fromGrowth = Math.min(iraGrowth, convAmt);
  var remain = convAmt - fromGrowth;
  var fromDiv = Math.min(iraDividend, remain);
  remain -= fromDiv;
  var fromCash = Math.min(iraCash, remain);
  return {
    iraGrowth:   iraGrowth   - fromGrowth,
    iraDividend: iraDividend - fromDiv,
    iraCash:     iraCash     - fromCash,
    roth:        roth        + fromGrowth + fromDiv + fromCash
  };
}

// Compute conversion tax using bracket math (federal + state)
export function conversionTax(income, convAmt, status, stateTaxRate) {
  if (convAmt <= 0) return 0;
  return (effectiveTax(income + convAmt, status) - effectiveTax(income, status))
       + convAmt * (stateTaxRate / 100);
}

// Apply QCDs — sources IRA cash first, then IRA dividend
// Returns updated { iraCash, iraDividend }
export function applyQCD(age, inp, iraCash, iraDividend, iraSum) {
  if (age < inp.qcdStartAge) return { iraCash, iraDividend };
  var qcd = Math.min(inp.qcdAmount, iraSum * 0.05);
  var fromCash = Math.min(iraCash, qcd);
  var fromDiv  = Math.min(iraDividend, qcd - fromCash);
  return {
    iraCash:     iraCash     - fromCash,
    iraDividend: iraDividend - fromDiv
  };
}
