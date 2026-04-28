import { DEFAULTS } from '../engine/constants.js';

// Demo Household A: Early retiree, age 60, aggressive spending, solo
var DEMO_A = Object.assign({}, DEFAULTS, {
  currentAge: 60,
  retirementAge: 60,
  birthYear: 1964,
  hasSpouse: false,
  monthlyExpenses: 10000,
  ssAge: 70,
  ssFRA: 2800,
  spouseSSAt67: 0,
  spouseSSAge: 67,
  taxableBal: 150000,
  iraBalCash: 50000,
  iraBalTips: 150000,
  iraBalDividend: 200000,
  iraBalGrowth: 400000,
  rothBal: 200000,
  housingMonthly: 2800,
  foodMonthly: 1400,
  transportMonthly: 700,
  travelMonthly: 2000,
  otherMonthly: 3100,
  healthPhase1Annual: 30000,
  healthPhase1EndAge: 65,
});

// Demo Household B: Conservative couple, age 68, high savings, low spending
var DEMO_B = Object.assign({}, DEFAULTS, {
  currentAge: 68,
  retirementAge: 67,
  birthYear: 1956,
  hasSpouse: true,
  spouseBirthYear: 1958,
  spouseCurrentAge: 66,
  monthlyExpenses: 7000,
  ssAge: 70,
  ssFRA: 4200,
  spouseSSAt67: 2800,
  spouseSSAge: 70,
  taxableBal: 300000,
  iraBalCash: 200000,
  iraBalTips: 600000,
  iraBalDividend: 700000,
  iraBalGrowth: 1000000,
  rothBal: 500000,
  housingMonthly: 1800,
  foodMonthly: 900,
  transportMonthly: 400,
  travelMonthly: 1500,
  otherMonthly: 2400,
});

// Demo Household C: Widowed, high pre-Medicare healthcare, age 65
var DEMO_C = Object.assign({}, DEFAULTS, {
  currentAge: 65,
  retirementAge: 65,
  birthYear: 1959,
  hasSpouse: false,
  survivorMode: false,
  monthlyExpenses: 8500,
  ssAge: 67,
  ssFRA: 2200,
  spouseSSAt67: 0,
  spouseSSAge: 67,
  taxableBal: 50000,
  iraBalCash: 80000,
  iraBalTips: 200000,
  iraBalDividend: 250000,
  iraBalGrowth: 420000,
  rothBal: 180000,
  healthPhase1Annual: 45000,
  healthPhase1EndAge: 65,
  healthPhase2Annual: 18000,
  housingMonthly: 2200,
  foodMonthly: 1000,
  transportMonthly: 500,
  travelMonthly: 800,
  otherMonthly: 4000,
});

export var DEMO_PLANS = {
  'demo1@test.com': DEMO_A,
  'demo2@test.com': DEMO_B,
  'demo3@test.com': DEMO_C,
};

export var DEMO_ASSETS = {
  'demo1@test.com': [
    { id: 'd1a1', name: 'IRA/401k', amount: 800000, account: 'IRA', bucket: 2, type: 'Bond', maturity: 'Ongoing', yld: '', risk: 'Medium' },
    { id: 'd1a2', name: 'Roth IRA', amount: 200000, account: 'Roth IRA', bucket: 3, type: 'Equity ETF', maturity: 'Ongoing', yld: '', risk: 'Medium' },
    { id: 'd1a3', name: 'Taxable', amount: 150000, account: 'Taxable', bucket: 1, type: 'Cash', maturity: 'Liquid', yld: '', risk: 'Low' },
  ],
  'demo2@test.com': [
    { id: 'd2a1', name: 'IRA/401k', amount: 2500000, account: 'IRA', bucket: 2, type: 'Bond', maturity: 'Ongoing', yld: '', risk: 'Low' },
    { id: 'd2a2', name: 'Roth IRA', amount: 500000, account: 'Roth IRA', bucket: 3, type: 'Equity ETF', maturity: 'Ongoing', yld: '', risk: 'Medium' },
    { id: 'd2a3', name: 'Taxable', amount: 300000, account: 'Taxable', bucket: 1, type: 'Cash', maturity: 'Liquid', yld: '', risk: 'Low' },
  ],
  'demo3@test.com': [
    { id: 'd3a1', name: 'IRA/401k', amount: 950000, account: 'IRA', bucket: 2, type: 'Bond', maturity: 'Ongoing', yld: '', risk: 'Medium' },
    { id: 'd3a2', name: 'Roth IRA', amount: 180000, account: 'Roth IRA', bucket: 3, type: 'Equity ETF', maturity: 'Ongoing', yld: '', risk: 'Medium' },
    { id: 'd3a3', name: 'Taxable', amount: 50000, account: 'Taxable', bucket: 1, type: 'Cash', maturity: 'Liquid', yld: '', risk: 'Low' },
  ],
};
