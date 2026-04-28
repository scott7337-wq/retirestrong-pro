// ============================================================================
// RetireStrong — Field Map Registry
// src/data/fieldMap.js
//
// Lookup table: flat `inp` key → domain + planPath + apiRoute + apiField.
//
// Phase 1 purpose: documentation registry + three lightweight accessors.
// Phase 2 purpose: runtime auto-save will read apiRoute to know where to PUT.
//
// Note on the six excluded balance fields (taxableBal, iraBalCash, iraBalTips,
// iraBalDividend, iraBalGrowth, rothBal): these exist in DEFAULTS as fallbacks
// but are always overridden by inpWithAssets (computed from assets array).
// They are not user-editable and have no API route — correctly excluded here.
//
// Fields with apiRoute: null are recognized as not yet persisted to the DB.
// ============================================================================

export const FIELD_MAP = {
  // ── profile
  currentAge:     { domain: 'profile', planPath: 'profile.currentAge',     apiRoute: '/api/profile', apiField: null               },
  retirementAge:  { domain: 'profile', planPath: 'profile.retirementAge',  apiRoute: '/api/profile', apiField: null               },
  lifeExpectancy: { domain: 'profile', planPath: 'profile.lifeExpectancy', apiRoute: '/api/profile', apiField: 'life_expectancy'  },
  filingStatus:   { domain: 'profile', planPath: 'profile.filingStatus',   apiRoute: '/api/profile', apiField: 'filing_status'    },
  stateTaxRate:   { domain: 'profile', planPath: 'profile.stateTaxRate',   apiRoute: '/api/profile', apiField: 'state_tax_rate'   },
  survivorMode:   { domain: 'profile', planPath: 'profile.survivorMode',   apiRoute: '/api/profile', apiField: 'survivor_mode'    },
  // ── household
  hasSpouse:        { domain: 'household', planPath: 'household.hasSpouse',        apiRoute: '/api/profile', apiField: null },
  spouseCurrentAge: { domain: 'household', planPath: 'household.spouseCurrentAge', apiRoute: '/api/profile', apiField: null },
  staceySS63:       { domain: 'household', planPath: 'household.staceySS63',       apiRoute: '/api/profile', apiField: null },
  // ── social security — person 1 (Scott)
  ssFRA:     { domain: 'socialSecurity', planPath: 'socialSecurity.person1.ssFRA',     apiRoute: '/api/social_security/1', apiField: 'fra_pia_monthly' },
  ssMonthly: { domain: 'socialSecurity', planPath: 'socialSecurity.person1.ssMonthly', apiRoute: '/api/social_security/1', apiField: 'fra_pia_monthly' },
  ssAge:     { domain: 'socialSecurity', planPath: 'socialSecurity.person1.ssAge',     apiRoute: '/api/social_security/1', apiField: 'claiming_age'    },
  ssCola:    { domain: 'socialSecurity', planPath: 'socialSecurity.person1.ssCola',    apiRoute: '/api/social_security/1', apiField: 'cola_rate'       },
  // ── social security — person 2 (Stacey)
  spouseSSAge:       { domain: 'socialSecurity', planPath: 'socialSecurity.person2.spouseSSAge',       apiRoute: '/api/social_security/2', apiField: 'claiming_age'    },
  spouseSSMonthly:   { domain: 'socialSecurity', planPath: 'socialSecurity.person2.spouseSSMonthly',   apiRoute: '/api/social_security/2', apiField: 'fra_pia_monthly' },
  spouseSSAt63:      { domain: 'socialSecurity', planPath: 'socialSecurity.person2.spouseSSAt63',      apiRoute: '/api/social_security/2', apiField: null              },
  spouseSSAt67:      { domain: 'socialSecurity', planPath: 'socialSecurity.person2.spouseSSAt67',      apiRoute: '/api/social_security/2', apiField: null              },
  spouseSSIsSpousal: { domain: 'socialSecurity', planPath: 'socialSecurity.person2.spouseSSIsSpousal', apiRoute: '/api/social_security/2', apiField: 'benefit_type'    },
  // ── income
  pensionMonthly:  { domain: 'income', planPath: 'income.pensionMonthly',  apiRoute: '/api/profile',          apiField: null           },
  pensionStartAge: { domain: 'income', planPath: 'income.pensionStartAge', apiRoute: '/api/profile',          apiField: null           },
  partTimeIncome:  { domain: 'income', planPath: 'income.partTimeIncome',  apiRoute: null,                    apiField: null           },
  partTimeYears:   { domain: 'income', planPath: 'income.partTimeYears',   apiRoute: null,                    apiField: null           },
  severanceNet:    { domain: 'income', planPath: 'income.severanceNet',    apiRoute: '/api/income_tracking',  apiField: 'incSeverance' },
  extraSpend2027:  { domain: 'income', planPath: 'income.extraSpend2027',  apiRoute: null,                    apiField: null           },
  extraSpend2028:  { domain: 'income', planPath: 'income.extraSpend2028',  apiRoute: null,                    apiField: null           },
  // ── expenses
  monthlyExpenses:  { domain: 'expenses', planPath: 'expenses.monthlyExpenses',  apiRoute: '/api/profile',             apiField: 'monthly_spending' },
  housingMonthly:   { domain: 'expenses', planPath: 'expenses.housingMonthly',   apiRoute: '/api/expenses/housing',    apiField: 'monthly_amount'   },
  foodMonthly:      { domain: 'expenses', planPath: 'expenses.foodMonthly',      apiRoute: '/api/expenses/food',       apiField: 'monthly_amount'   },
  transportMonthly: { domain: 'expenses', planPath: 'expenses.transportMonthly', apiRoute: '/api/expenses/transport',  apiField: 'monthly_amount'   },
  travelMonthly:    { domain: 'expenses', planPath: 'expenses.travelMonthly',    apiRoute: '/api/expenses/travel',     apiField: 'monthly_amount'   },
  otherMonthly:     { domain: 'expenses', planPath: 'expenses.otherMonthly',     apiRoute: '/api/expenses/other',      apiField: 'monthly_amount'   },
  inflationRate:    { domain: 'expenses', planPath: 'expenses.inflationRate',    apiRoute: '/api/profile',             apiField: 'general_inflation'},
  trackingYear:     { domain: 'expenses', planPath: 'expenses.trackingYear',     apiRoute: null,                       apiField: null               },
  spendYear:        { domain: 'expenses', planPath: 'expenses.spendYear',        apiRoute: null,                       apiField: null               },
  // ── healthcare
  healthPhase1Annual: { domain: 'healthcare', planPath: 'healthcare.healthPhase1Annual', apiRoute: '/api/healthcare', apiField: 'annual_cost'          },
  healthPhase1EndAge: { domain: 'healthcare', planPath: 'healthcare.healthPhase1EndAge', apiRoute: '/api/healthcare', apiField: 'age_end'              },
  healthPhase2Annual: { domain: 'healthcare', planPath: 'healthcare.healthPhase2Annual', apiRoute: '/api/healthcare', apiField: 'annual_cost'          },
  healthInflation:    { domain: 'healthcare', planPath: 'healthcare.healthInflation',    apiRoute: '/api/healthcare', apiField: 'healthcare_inflation' },
  // ── tax
  qcdAmount:   { domain: 'tax', planPath: 'tax.qcdAmount',   apiRoute: '/api/qcd_config', apiField: 'annual_amount' },
  qcdStartAge: { domain: 'tax', planPath: 'tax.qcdStartAge', apiRoute: '/api/qcd_config', apiField: 'start_age'     },
  legacyGoal:  { domain: 'tax', planPath: 'tax.legacyGoal',  apiRoute: null,              apiField: null            },
  // ── return assumptions
  cashReturnRate:     { domain: 'returns', planPath: 'returns.cashReturnRate',     apiRoute: '/api/returns',            apiField: 'return_rate'     },
  tipsRealReturn:     { domain: 'returns', planPath: 'returns.tipsRealReturn',     apiRoute: '/api/returns',            apiField: 'return_rate'     },
  dividendReturnRate: { domain: 'returns', planPath: 'returns.dividendReturnRate', apiRoute: '/api/returns',            apiField: 'return_rate'     },
  growthReturnRate:   { domain: 'returns', planPath: 'returns.growthReturnRate',   apiRoute: '/api/returns',            apiField: 'return_rate'     },
  rothReturnRate:     { domain: 'returns', planPath: 'returns.rothReturnRate',     apiRoute: '/api/returns',            apiField: 'return_rate'     },
  capeRatio:          { domain: 'returns', planPath: 'returns.capeRatio',          apiRoute: '/api/market_assumptions', apiField: 'cape_ratio'      },
  tenYrTreasury:      { domain: 'returns', planPath: 'returns.tenYrTreasury',      apiRoute: '/api/market_assumptions', apiField: 'ten_yr_treasury' },
  tipsYield:          { domain: 'returns', planPath: 'returns.tipsYield',          apiRoute: '/api/market_assumptions', apiField: 'tips_yield'      },
  stockVol:           { domain: 'returns', planPath: 'returns.stockVol',           apiRoute: null,                      apiField: null              },
  bondVol:            { domain: 'returns', planPath: 'returns.bondVol',            apiRoute: null,                      apiField: null              },
  correlation:        { domain: 'returns', planPath: 'returns.correlation',        apiRoute: null,                      apiField: null              },
  // ── roth plan
  conv2027: { domain: 'rothPlan', planPath: 'rothPlan.conv2027', apiRoute: '/api/roth_plan', apiField: 'planned_amount' },
  conv2028: { domain: 'rothPlan', planPath: 'rothPlan.conv2028', apiRoute: '/api/roth_plan', apiField: 'planned_amount' },
  conv2029: { domain: 'rothPlan', planPath: 'rothPlan.conv2029', apiRoute: '/api/roth_plan', apiField: 'planned_amount' },
  conv2030: { domain: 'rothPlan', planPath: 'rothPlan.conv2030', apiRoute: '/api/roth_plan', apiField: 'planned_amount' },
  conv2031: { domain: 'rothPlan', planPath: 'rothPlan.conv2031', apiRoute: '/api/roth_plan', apiField: 'planned_amount' },
};

// ── Accessors ─────────────────────────────────────────────────────────────────

/** Get metadata for a single flat inp key. Returns null if not found. */
export function getFieldMeta(key) {
  return FIELD_MAP[key] || null;
}

/** Get all flat inp keys belonging to a domain. */
export function getFieldsByDomain(domain) {
  return Object.keys(FIELD_MAP).filter(function(k) {
    return FIELD_MAP[k].domain === domain;
  });
}

/** Get all flat inp keys that have a known API route (i.e. are persistable). */
export function getPersistableFields() {
  return Object.keys(FIELD_MAP).filter(function(k) {
    return FIELD_MAP[k].apiRoute !== null;
  });
}
