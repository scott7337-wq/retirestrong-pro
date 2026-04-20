import { RMD_TABLE, MFJ, SGL, STD_DED } from './constants.js';

export const getRMD = function(age) { return RMD_TABLE[Math.min(age,90)] || 12.2; };

// v12: resolve filing status — survivorMode overrides to single
export function resolveStatus(inp) {
  return inp.survivorMode ? 'single' : (inp.filingStatus || 'married');
}

export function marginalRate(gross, status) {
  var ded = STD_DED[status] || 29200;
  var taxable = Math.max(0, gross - ded);
  var brackets = status === 'married' ? MFJ : SGL;
  var rate = 0.10;
  for (var bi = 0; bi < brackets.length; bi++) {
    if (taxable <= brackets[bi][0]) { rate = brackets[bi][1]; break; }
    rate = brackets[bi][1];
  }
  return rate;
}

export function effectiveTax(gross, status) {
  var ded = STD_DED[status] || 29200;
  var taxable = Math.max(0, gross - ded);
  var brackets = status === 'married' ? MFJ : SGL;
  var tax = 0; var prev = 0;
  for (var bi = 0; bi < brackets.length; bi++) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, brackets[bi][0]) - prev) * brackets[bi][1];
    prev = brackets[bi][0];
  }
  return tax;
}

// v12: Total tax including AZ state (applies to non-SS taxable income)
export function totalTaxWithState(gross, status, stateTaxRate, ssIncome) {
  var fedTax = effectiveTax(gross, status);
  // AZ flat tax applies to taxable income minus SS (AZ doesn't tax SS)
  var stateGross = Math.max(0, gross - (ssIncome || 0));
  var stateDed = STD_DED[status] || 29200;
  var stateTaxable = Math.max(0, stateGross - stateDed);
  var stateTax = stateTaxable * (stateTaxRate / 100);
  return fedTax + stateTax;
}

// v12: Combined marginal rate (federal + state)
export function combinedMarginalRate(gross, status, stateTaxRate) {
  return marginalRate(gross, status) + (stateTaxRate / 100);
}
