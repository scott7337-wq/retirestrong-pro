// ── RetireStrong Engine — barrel re-export ─────────────────────────────────────
export { ssBenefitFactor, ssIncomeForYear, primarySSForYear, spouseSSForYear } from './social-security.js';
export { marginalRate, effectiveTax, resolveStatus, totalTaxWithState, combinedMarginalRate, capeBased } from './tax.js';
export { getRMD, RMD_TABLE, DEFAULTS, ASSET_TYPES, RISK_LEVELS, ACCOUNT_TYPES, RISK_C, TYPE_C, DEFAULT_ASSETS, DEFAULT_BUCKET_CONFIG, MFJ, SGL, STD_DED } from './constants.js';
export { rothConvForYear, applyRothConversion, conversionTax, applyQCD } from './roth.js';
export { buildCashFlow } from './cashflow.js';
export { runMonteCarlo } from './montecarlo.js';
