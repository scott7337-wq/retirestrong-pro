// ── RetireStrong Engine: Tax Calculations ─────────────────────────────────────
import { MFJ, SGL, STD_DED } from './constants.js';

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

export function totalTaxWithState(gross, status, stateTaxRate, ssIncome) {
  var fedTax = effectiveTax(gross, status);
  var stateGross = Math.max(0, gross - (ssIncome || 0));
  var stateDed = STD_DED[status] || 29200;
  var stateTaxable = Math.max(0, stateGross - stateDed);
  var stateTax = stateTaxable * (stateTaxRate / 100);
  return fedTax + stateTax;
}

export function combinedMarginalRate(gross, status, stateTaxRate) {
  return marginalRate(gross, status) + (stateTaxRate / 100);
}

export function capeBased(cape, tenYr, tips) {
  return {
    stock: (1 / cape) + 0.02,
    bond: tenYr / 100,
    inflation: Math.max(0.015, tenYr / 100 - tips / 100)
  };
}
