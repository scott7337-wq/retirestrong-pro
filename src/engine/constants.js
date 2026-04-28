// ── RetireStrong Engine: Constants, Defaults, Lookup Tables ──────────────────

export const RMD_TABLE = {
  73:26.5, 74:25.5, 75:24.6, 76:23.7, 77:22.9, 78:22.0, 79:21.1,
  80:20.2, 81:19.4, 82:18.5, 83:17.7, 84:16.8, 85:16.0, 86:15.2,
  87:14.4, 88:13.7, 89:12.9, 90:12.2
};

export function getRMD(age) {
  return RMD_TABLE[Math.min(age, 90)] || 12.2;
}

export const MFJ = [
  [23200,0.10],[94300,0.12],[201050,0.22],
  [383900,0.24],[487450,0.32],[731200,0.35],[1e12,0.37]
];

export const SGL = [
  [11600,0.10],[47150,0.12],[100525,0.22],
  [191950,0.24],[243725,0.32],[609350,0.35],[1e12,0.37]
];

export const STD_DED = { married: 29200, single: 14600 };

export const IRMAA_LIMIT_MFJ = 212000;

export var ASSET_TYPES = [
  'Cash','CD','T-Bill','TIPS','Dividend ETF','REIT ETF',
  'Equity ETF','Intl Equity','Growth Stocks','Equity',
  'Bond','I-Bond','Annuity','Other'
];

export var RISK_LEVELS = ['Low','Medium','Med-High','High'];

export var ACCOUNT_TYPES = ['Taxable','IRA','Roth IRA','Roth 401k','401k','HSA'];

export var RISK_C = {
  Low:'#34d399', Medium:'#60a5fa', 'Med-High':'#fbbf24', High:'#f87171'
};

export var TYPE_C = {
  Cash:'#34d399', CD:'#2dd4bf', 'T-Bill':'#22d3ee', TIPS:'#60a5fa',
  'Dividend ETF':'#fbbf24', 'REIT ETF':'#fb923c', 'Equity ETF':'#f97316',
  'Intl Equity':'#e879f9', 'Growth Stocks':'#a78bfa', Equity:'#818cf8',
  Bond:'#60a5fa', 'I-Bond':'#34d399', Annuity:'#f59e0b', Other:'#94a3b8'
};

export var DEFAULT_ASSETS = [
  {id:'a1',  name:'Money Market',         amount:33000,  type:'Cash',         account:'Taxable',   maturity:'Liquid',        yld:'~4.5%',      risk:'Low',      bucket:1},
  {id:'a2',  name:'CD',                   amount:50000,  type:'CD',           account:'Taxable',   maturity:'Aug 2026',      yld:'~5.0%',      risk:'Low',      bucket:1},
  {id:'a3',  name:'Money Market (IRA)',   amount:1000,   type:'Cash',         account:'IRA',       maturity:'Liquid',        yld:'~4.5%',      risk:'Low',      bucket:1},
  {id:'a4',  name:'CD (Aug 2026)',        amount:25000,  type:'CD',           account:'IRA',       maturity:'Aug 2026',      yld:'~5.0%',      risk:'Low',      bucket:1},
  {id:'a5',  name:'CD (Jan 2027)',        amount:25000,  type:'CD',           account:'IRA',       maturity:'Jan 2027',      yld:'~5.0%',      risk:'Low',      bucket:1},
  {id:'a6',  name:'CD (Aug 2027)',        amount:25000,  type:'CD',           account:'IRA',       maturity:'Aug 2027',      yld:'~5.0%',      risk:'Low',      bucket:1},
  {id:'a7',  name:'T-Bills (5 tranches)',amount:100000, type:'T-Bill',       account:'IRA',       maturity:'Jan 27-Jan 28', yld:'~4.8%',      risk:'Low',      bucket:1},
  {id:'a8',  name:'TIPS (Apr 2028)',      amount:107000, type:'TIPS',         account:'IRA',       maturity:'Apr 2028',      yld:'Real +1.8%', risk:'Low',      bucket:2},
  {id:'a9',  name:'TIPS (Jul 2031)',      amount:103000, type:'TIPS',         account:'IRA',       maturity:'Jul 2031',      yld:'Real +1.8%', risk:'Low',      bucket:2},
  {id:'a10', name:'TIPS (Jul 2034)',      amount:105000, type:'TIPS',         account:'IRA',       maturity:'Jul 2034',      yld:'Real +1.8%', risk:'Low',      bucket:2},
  {id:'a11', name:'SCHD',                amount:192000, type:'Dividend ETF', account:'IRA',       maturity:'Ongoing',       yld:'~3.8%',      risk:'Medium',   bucket:2},
  {id:'a12', name:'VNQ',                 amount:62000,  type:'REIT ETF',     account:'IRA',       maturity:'Ongoing',       yld:'~3.8%',      risk:'Medium',   bucket:2},
  {id:'a13', name:'VTI',                 amount:211000, type:'Equity ETF',   account:'IRA',       maturity:'Ongoing',       yld:'Growth',     risk:'Medium',   bucket:3},
  {id:'a14', name:'VXUS',                amount:190000, type:'Intl Equity',  account:'IRA',       maturity:'Ongoing',       yld:'Growth',     risk:'Med-High', bucket:3},
  {id:'a15', name:'VTI (Roth IRA)',      amount:347000, type:'Equity ETF',   account:'Roth IRA',  maturity:'Ongoing',       yld:'Growth',     risk:'Medium',   bucket:3},
  {id:'a16', name:'VXUS (Roth IRA)',     amount:69000,  type:'Intl Equity',  account:'Roth IRA',  maturity:'Ongoing',       yld:'Growth',     risk:'Med-High', bucket:3},
  {id:'a17', name:'VTI (Roth 401k)',     amount:2800,   type:'Equity ETF',   account:'Roth 401k', maturity:'Ongoing',       yld:'Growth',     risk:'Medium',   bucket:3},
  {id:'a18', name:'VXUS (Roth 401k)',    amount:700,    type:'Intl Equity',  account:'Roth 401k', maturity:'Ongoing',       yld:'Growth',     risk:'Med-High', bucket:3},
];

export var DEFAULT_BUCKET_CONFIG = [
  {id:1, label:'Bucket 1', sub:'Short-Term (Years 1-3)',   target:259000,  color:'#34d399', bg:'rgba(52,211,153,0.06)',   border:'rgba(52,211,153,0.25)',  purpose:'Cash buffer - cover expenses without selling investments during market downturns.',       risk:'Capital Preservation',     strategy:'Refill annually from dividends and income. Never sell equities during bear markets.'},
  {id:2, label:'Bucket 2', sub:'Medium-Term (Years 4-10)', target:569000,  color:'#60a5fa', bg:'rgba(96,165,250,0.06)',   border:'rgba(96,165,250,0.25)',  purpose:'Income bridge with inflation protection. SCHD+VNQ dividends ~$9K/yr refill Bucket 1.', risk:'Income + Moderate Growth', strategy:'TIPS mature in sequence. Dividends flow automatically to Bucket 1.'},
  {id:3, label:'Bucket 3', sub:'Long-Term (Years 11+)',    target:820500,  color:'#a78bfa', bg:'rgba(167,139,250,0.06)', border:'rgba(167,139,250,0.25)', purpose:'Maximum growth. VTI + VXUS across IRA, Roth IRA, and Roth 401k.',                      risk:'Long-Term Growth',         strategy:'Untouched for 11+ years. Rebalance into Bucket 2 after strong market years.'},
];

export var DEFAULTS = {
  currentAge:66, retirementAge:67, lifeExpectancy:90,
  birthYear: null, spouseBirthYear: null,
  taxableBal:83000,
  iraBalCash:176000,
  iraBalTips:315000,
  iraBalDividend:254000,
  iraBalGrowth:401000,
  rothBal:419500,
  monthlyExpenses:8000,
  inflationRate:3.0,
  ssCola:2.5,
  ssAge:70,
  ssFRA:3445,
  ssMonthly:3445,
  spouseCurrentAge:63,
  spouseSSAge:67,
  spouseSSMonthly:1879,
  spouseSSAt63:1472,
  spouseSSAt67:1879,
  spouseSSIsSpousal:false,
  spouseEarlyClaim:false,
  hasSpouse:true,
  pensionMonthly:0, pensionStartAge:67,
  partTimeIncome:0, partTimeYears:0,
  extraSpend2027:0,
  extraSpend2028:0,
  severanceNet:0,
  conv2027:100000, conv2028:100000, conv2029:100000,
  conv2030:50000, conv2031:50000,
  qcdAmount:15000, qcdStartAge:70,
  filingStatus:'married',
  survivorMode:false,
  stateTaxRate:2.5,
  healthPhase1Annual:27896,
  healthPhase1EndAge:68,
  healthPhase2Annual:14873,
  healthInflation:0.05,
  cashReturnRate:4.8,
  tipsRealReturn:1.8,
  dividendReturnRate:6.0,
  growthReturnRate:7.0,
  rothReturnRate:7.0,
  capeRatio:28.5, tenYrTreasury:4.2, tipsYield:1.8,
  stockVol:18.0, bondVol:6.0, correlation:0.15,
  seqStressYears:0, seqStressEquityDrop:0.15,
  seqStressInflationYears:0, seqStressInflationAdd:0,
  seqStressType:'market',
  scenarioInsight:'',
  housingMonthly:2200, foodMonthly:1200, transportMonthly:600, travelMonthly:1200, otherMonthly:2800,
  legacyGoal:500000,
  trackingYear:2026,
  spendYear:2026
};
