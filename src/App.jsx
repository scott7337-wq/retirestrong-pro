import React, { useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, LineChart, Line, ReferenceLine } from 'recharts';
import { TrendingUp, DollarSign, Activity, FileText, Settings, BarChart3, Coins, AlertCircle, CheckCircle, Layers, Grid, Save, RefreshCw, Zap, Plus, Trash2, Edit2, X, Sparkles, Loader, Heart, Target, ArrowDownUp, Calendar } from 'lucide-react';
import { RMD_TABLE, MFJ, SGL, STD_DED } from './engine/constants';
import { getRMD, marginalRate, effectiveTax, totalTaxWithState, combinedMarginalRate, resolveStatus } from './engine/tax';
import { ssBenefitFactor, ssIncomeForYear, scottSSForYear, staceySSForYear } from './engine/social-security';
import { rothConvForYear } from './engine/roth';
import { capeBased } from './engine/market';
import { fmtC, fmtFull, fmtPct } from './engine/format';

// ── Available options for dropdowns ───────────────────────────────────────────
var ASSET_TYPES = ['Cash','CD','T-Bill','TIPS','Dividend ETF','REIT ETF','Equity ETF','Intl Equity','Growth Stocks','Equity','Bond','I-Bond','Annuity','Other'];
var RISK_LEVELS = ['Low','Medium','Med-High','High'];
var ACCOUNT_TYPES = ['Taxable','IRA','Roth IRA','Roth 401k','401k','HSA'];

var RISK_C = {Low:'#34d399',Medium:'#60a5fa','Med-High':'#fbbf24',High:'#f87171'};
var TYPE_C = {Cash:'#34d399',CD:'#2dd4bf','T-Bill':'#22d3ee',TIPS:'#60a5fa','Dividend ETF':'#fbbf24','REIT ETF':'#fb923c','Equity ETF':'#f97316','Intl Equity':'#e879f9','Growth Stocks':'#a78bfa',Equity:'#818cf8',Bond:'#60a5fa','I-Bond':'#34d399',Annuity:'#f59e0b',Other:'#94a3b8'};

// ── Default asset holdings (editable) ─────────────────────────────────────────
var DEFAULT_ASSETS = [
  // account: 'Taxable' | 'IRA' | 'Roth IRA' | 'Roth 401k'
  // bucket: 1 | 2 | 3 | null (unassigned)
  {id:'a1', name:'Money Market',          amount:33000,  type:'Cash',         account:'Taxable',  maturity:'Liquid',        yld:'~4.5%',      risk:'Low',     bucket:1},
  {id:'a2', name:'CD',                    amount:50000,  type:'CD',           account:'Taxable',  maturity:'Aug 2026',      yld:'~5.0%',      risk:'Low',     bucket:1},
  {id:'a3', name:'Money Market (IRA)',    amount:1000,   type:'Cash',         account:'IRA',      maturity:'Liquid',        yld:'~4.5%',      risk:'Low',     bucket:1},
  {id:'a4', name:'CD (Aug 2026)',         amount:25000,  type:'CD',           account:'IRA',      maturity:'Aug 2026',      yld:'~5.0%',      risk:'Low',     bucket:1},
  {id:'a5', name:'CD (Jan 2027)',         amount:25000,  type:'CD',           account:'IRA',      maturity:'Jan 2027',      yld:'~5.0%',      risk:'Low',     bucket:1},
  {id:'a6', name:'CD (Aug 2027)',         amount:25000,  type:'CD',           account:'IRA',      maturity:'Aug 2027',      yld:'~5.0%',      risk:'Low',     bucket:1},
  {id:'a7', name:'T-Bills (5 tranches)', amount:100000, type:'T-Bill',       account:'IRA',      maturity:'Jan 27-Jan 28', yld:'~4.8%',      risk:'Low',     bucket:1},
  {id:'a8', name:'TIPS (Apr 2028)',       amount:107000, type:'TIPS',         account:'IRA',      maturity:'Apr 2028',      yld:'Real +1.8%', risk:'Low',     bucket:2},
  {id:'a9', name:'TIPS (Jul 2031)',       amount:103000, type:'TIPS',         account:'IRA',      maturity:'Jul 2031',      yld:'Real +1.8%', risk:'Low',     bucket:2},
  {id:'a10',name:'TIPS (Jul 2034)',       amount:105000, type:'TIPS',         account:'IRA',      maturity:'Jul 2034',      yld:'Real +1.8%', risk:'Low',     bucket:2},
  {id:'a11',name:'SCHD',                 amount:192000, type:'Dividend ETF', account:'IRA',      maturity:'Ongoing',       yld:'~3.8%',      risk:'Medium',  bucket:2},
  {id:'a12',name:'VNQ',                  amount:62000,  type:'REIT ETF',     account:'IRA',      maturity:'Ongoing',       yld:'~3.8%',      risk:'Medium',  bucket:2},
  {id:'a13',name:'VTI',                  amount:211000, type:'Equity ETF',   account:'IRA',      maturity:'Ongoing',       yld:'Growth',     risk:'Medium',  bucket:3},
  {id:'a14',name:'VXUS',                 amount:190000, type:'Intl Equity',  account:'IRA',      maturity:'Ongoing',       yld:'Growth',     risk:'Med-High',bucket:3},
  {id:'a15',name:'VTI (Roth IRA)',       amount:347000, type:'Equity ETF',   account:'Roth IRA', maturity:'Ongoing',       yld:'Growth',     risk:'Medium',  bucket:3},
  {id:'a16',name:'VXUS (Roth IRA)',      amount:69000,  type:'Intl Equity',  account:'Roth IRA', maturity:'Ongoing',       yld:'Growth',     risk:'Med-High',bucket:3},
  {id:'a17',name:'VTI (Roth 401k)',      amount:2800,   type:'Equity ETF',   account:'Roth 401k',maturity:'Ongoing',       yld:'Growth',     risk:'Medium',  bucket:3},
  {id:'a18',name:'VXUS (Roth 401k)',     amount:700,    type:'Intl Equity',  account:'Roth 401k',maturity:'Ongoing',       yld:'Growth',     risk:'Med-High',bucket:3},
];

// ── Default bucket config ──────────────────────────────────────────────────────
var DEFAULT_BUCKET_CONFIG = [
  {id:1, label:'Bucket 1', sub:'Short-Term (Years 1-3)', target:259000, color:'#34d399', bg:'rgba(52,211,153,0.06)', border:'rgba(52,211,153,0.25)', purpose:'Cash buffer - cover expenses without selling investments during market downturns.', risk:'Capital Preservation', strategy:'Refill annually from dividends and income. Never sell equities during bear markets.'},
  {id:2, label:'Bucket 2', sub:'Medium-Term (Years 4-10)', target:569000, color:'#60a5fa', bg:'rgba(96,165,250,0.06)', border:'rgba(96,165,250,0.25)', purpose:'Income bridge with inflation protection. SCHD+VNQ dividends ~$9K/yr refill Bucket 1.', risk:'Income + Moderate Growth', strategy:'TIPS mature in sequence. Dividends flow automatically to Bucket 1.'},
  {id:3, label:'Bucket 3', sub:'Long-Term (Years 11+)', target:820500, color:'#a78bfa', bg:'rgba(167,139,250,0.06)', border:'rgba(167,139,250,0.25)', purpose:'Maximum growth. VTI + VXUS across IRA, Roth IRA, and Roth 401k. Tax-free Roth compounding with no RMDs.', risk:'Long-Term Growth', strategy:'Untouched for 11+ years. Rebalance into Bucket 2 after strong market years.'},
];

var DEFAULTS = {
  currentAge:66, retirementAge:67, lifeExpectancy:90,
  taxableBal:83000,
  iraBalCash:176000,
  iraBalTips:315000,
  iraBalDividend:254000,
  iraBalGrowth:401000,
  rothBal:419500,
  monthlyExpenses:8000,
  inflationRate:3.0,
  ssCola:2.5,  // v12: separate SS COLA rate (%)
  ssAge:70,    // delay to 70 confirmed as best strategy
  ssFRA:3445,  // v12: actual FRA (age 67) PIA from SSA — the true base
  ssMonthly:3445,  // FRA PIA; actual benefit computed via ssBenefitFactor(ssAge)
  spouseCurrentAge:63,  // v12: spouse actual age (turns 64 in 2026)
  spouseSSAge:67,
  spouseSSMonthly:1879,  // Stacey's actual net at FRA 67 (after ~15% garnishment)
  spouseSSAt63:1472,     // Stacey's actual net at 63 (after garnishment)
  spouseSSAt67:1879,     // Stacey's actual net at 67 (after garnishment)
  spouseSSIsSpousal:false,  // use actual net figures, not spousal calc
  staceySS63:false,      // toggle — true = claim at 63, false = wait to 67
  hasSpouse:true,
  pensionMonthly:0, pensionStartAge:67,
  partTimeIncome:0, partTimeYears:0,
  extraSpend2027:0,
  extraSpend2028:0,
  severanceNet:0,        // net severance check — adds to Taxable opening balance
  // Per-year Roth conversion schedule
  conv2027:100000, conv2028:100000, conv2029:100000,
  conv2030:50000, conv2031:50000,
  qcdAmount:15000, qcdStartAge:70,
  filingStatus:'married',
  survivorMode:false,  // v12: toggle for Single filing (widow's penalty)
  stateTaxRate:2.5,    // v12: Arizona flat rate (%) — applies to IRA/conv/RMD, not SS
  healthPhase1Annual:27896,
  healthPhase1EndAge:68,
  healthPhase2Annual:14873,
  healthInflation:0.05,
  cashReturnRate:4.8,
  tipsRealReturn:1.8,
  dividendReturnRate:6.0,
  growthReturnRate:7.0,
  rothReturnRate:7.0,  // same as growth (both VTI+VXUS)
  capeRatio:28.5, tenYrTreasury:4.2, tipsYield:1.8,
  stockVol:18.0, bondVol:6.0, correlation:0.15,
  housingMonthly:2200, foodMonthly:1200, transportMonthly:600, travelMonthly:1200, otherMonthly:2800,
  legacyGoal:500000,
  trackingYear:2026,
  spendYear:2026
};

var PF = "'Playfair Display', serif";
var SS_FONT = "'Source Sans 3', sans-serif";

// ── v14 Light theme tokens — clean, readable, modern ─────────────────────────
var BG       = '#f8fafc';       // page background
var SURFACE  = '#ffffff';       // card / panel surface
var SURFACE2 = '#f1f5f9';       // secondary surface
var BORDER   = '#e2e8f0';       // subtle border
var BORDER2  = '#94a3b8';       // stronger border
var TXT1     = '#1e293b';       // primary text (slate-800)
var TXT2     = '#475569';       // secondary text (slate-600)
var TXT3     = '#64748b';       // muted text (slate-500)
var ACCENT   = '#059669';       // emerald green primary
var ACCENT2  = '#d1fae5';       // light emerald tint
var SHADOW   = '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)';

var CARD = {background:SURFACE, border:'1px solid '+BORDER, borderRadius:12, padding:20, boxShadow:SHADOW, color:TXT1};

function projectForSsAge(inp, er, ssClaimAge) {
  var taxable = inp.taxableBal;
  var iraCash = inp.iraBalCash;
  var iraTips = inp.iraBalTips;
  var iraDividend = inp.iraBalDividend;
  var iraGrowth = inp.iraBalGrowth;
  var roth = inp.rothBal;
  var years = inp.lifeExpectancy - inp.currentAge;
  var inf = er.inflation;
  var cR  = inp.cashReturnRate / 100;
  var tR  = inf + inp.tipsRealReturn / 100;
  var dvR = inp.dividendReturnRate / 100;
  var grR = inp.growthReturnRate / 100;
  var roR = inp.rothReturnRate / 100;
  var ssCola = (inp.ssCola || 2.5) / 100;
  var fraMonthlyBase = inp.ssFRA || inp.ssMonthly || 3445;
  var ssMonthlyAtAge = Math.round(fraMonthlyBase * ssBenefitFactor(ssClaimAge));
  var staceyClaimAge = inp.staceySS63 ? 63 : (inp.spouseSSAge || 67);
  var staceyMonthly = inp.staceySS63 ? (inp.spouseSSAt63 || 1472) : (inp.spouseSSAt67 || 1879);
  var status = resolveStatus(inp);
  var stRate = inp.stateTaxRate || 2.5;
  var ssStartYear = 1959 + ssClaimAge; // Scott born 1959
  var staceyStartYear = 1962 + staceyClaimAge; // Stacey born 1962
  var data = [];
  for (var y = 0; y <= years; y++) {
    var age = inp.currentAge + y;
    var infMult = Math.pow(1 + inf, y);
    var extra = (y === 2 ? inp.extraSpend2027 : 0) + (y === 3 ? inp.extraSpend2028 : 0);
    var hcInflMult = Math.pow(1 + inp.healthInflation, y);
    var healthcare = (age < inp.healthPhase1EndAge) ? inp.healthPhase1Annual * hcInflMult : inp.healthPhase2Annual * hcInflMult;
    var expenses = inp.monthlyExpenses * 12 * infMult + extra + healthcare;
    var income = 0;
    var calYear = 2026 + y;
    // SS with birth-year-based start and partial first year
    if (calYear === ssStartYear) {
      income += ssMonthlyAtAge * 2; // Nov+Dec
    } else if (calYear > ssStartYear) {
      var ssColaYrs = calYear - ssStartYear;
      income += ssMonthlyAtAge * Math.pow(1 + ssCola, ssColaYrs) * 12;
    }
    // Stacey SS with actual net figures
    if (inp.hasSpouse && !inp.survivorMode) {
      if (calYear === staceyStartYear) income += staceyMonthly * 5;
      else if (calYear > staceyStartYear) {
        var spCola = calYear - staceyStartYear;
        income += staceyMonthly * Math.pow(1 + ssCola, spCola) * 12;
      }
    }
    if (age >= inp.pensionStartAge && inp.pensionMonthly > 0) income += inp.pensionMonthly * 12;
    var gap = Math.max(0, expenses - income);
    var iraSum = iraCash + iraTips + iraDividend + iraGrowth;
    var rmd = (age >= 73 && iraSum > 0) ? iraSum / getRMD(age) : 0;
    var need = Math.max(gap, rmd);
    var mRate = combinedMarginalRate(income + need, status, stRate);
    var withdrawn = 0;
    function wd(avail) {
      if (withdrawn >= need || avail <= 0) return avail;
      var amt = Math.min(avail, need - withdrawn);
      withdrawn += amt;
      return avail - amt;
    }
    taxable     = wd(taxable);
    iraCash     = wd(iraCash);
    iraTips     = wd(iraTips);
    iraDividend = wd(iraDividend);
    iraGrowth   = wd(iraGrowth);
    roth        = wd(roth);
    // v12: Roth conversion from growth first
    var rothConv = rothConvForYear(inp, calYear);
    var pfsConvG = Math.min(iraGrowth, rothConv);
    var pfsRemain = rothConv - pfsConvG;
    var pfsConvD = Math.min(iraDividend, pfsRemain);
    pfsRemain -= pfsConvD;
    var pfsConvC = Math.min(iraCash, pfsRemain);
    iraGrowth -= pfsConvG; iraDividend -= pfsConvD; iraCash -= pfsConvC;
    roth += pfsConvG + pfsConvD + pfsConvC;
    // v12: QCD from IRA
    var qcd = (age >= inp.qcdStartAge) ? Math.min(inp.qcdAmount, iraSum * 0.05) : 0;
    var qcdC = Math.min(iraCash, qcd);
    var qcdD = Math.min(iraDividend, qcd - qcdC);
    iraCash -= qcdC; iraDividend -= qcdD;
    var total = Math.max(0, taxable + iraCash + iraTips + iraDividend + iraGrowth + roth);
    var ssIncThisYear = 0;
    if (calYear === ssStartYear) ssIncThisYear = ssMonthlyAtAge * 2;
    else if (calYear > ssStartYear) ssIncThisYear = ssMonthlyAtAge * Math.pow(1+ssCola, calYear-ssStartYear) * 12;
    data.push({ age, balance: total, ssIncome: ssIncThisYear });
    taxable     = Math.max(0, taxable     * (1 + cR * 0.5 + dvR * 0.5));
    iraCash     = Math.max(0, iraCash     * (1 + cR));
    iraTips     = Math.max(0, iraTips     * (1 + tR));
    iraDividend = Math.max(0, iraDividend * (1 + dvR));
    iraGrowth   = Math.max(0, iraGrowth   * (1 + grR));
    roth        = Math.max(0, roth * (1 + roR));
  }
  return data;
}

// ── Roth Bridge Strategy projection ───────────────────────────────────────────
// SS delayed to 70. Proper bucket sequencing during bridge years 2027-2029:
//   1. B2 dividends (SCHD/VNQ ~$9K/yr) sweep into B1 cash each year
//   2. Bucket 1 cash covers expenses first (its intended purpose)
//   3. Roth covers any remaining gap, capped at $42K/yr + inflation
//   4. IRA draws kept minimal (~$15-20K) to maximize conversion room
//   5. Conversion taxes paid from taxable brokerage
function projectRothBridge(inp, er) {
  var taxable    = inp.taxableBal;
  var iraCash    = inp.iraBalCash;
  var iraTips    = inp.iraBalTips;
  var iraDividend= inp.iraBalDividend;
  var iraGrowth  = inp.iraBalGrowth;
  var roth       = inp.rothBal;
  var b1Cash     = 259000;
  var years      = inp.lifeExpectancy - inp.currentAge;
  var inf        = er.inflation;
  var cR         = inp.cashReturnRate / 100;
  var tR         = inf + inp.tipsRealReturn / 100;
  var dvR        = inp.dividendReturnRate / 100;
  var grR        = inp.growthReturnRate / 100;
  var roR        = inp.rothReturnRate / 100;
  var ssBridgeAge  = 70;
  var maxRothBridge = 42000;
  var b2DivSweep   = 9300;
  var fraMonthly  = inp.ssFRA || inp.ssMonthly || 3445;
  var ss70Monthly = Math.round(fraMonthly * ssBenefitFactor(70));
  var spouseBridgeMonthly = inp.staceySS63 ? (inp.spouseSSAt63 || 1472) : (inp.spouseSSAt67 || 1879);
  var spouseBridgeClaimAge = inp.staceySS63 ? 63 : (inp.spouseSSAge || 67);
  var ssCola      = (inp.ssCola || 2.5) / 100;
  var top22       = 206700;
  var irmaaLimit  = 212000;
  var stdDed      = 32000;
  var status      = resolveStatus(inp);
  var stRate      = inp.stateTaxRate || 2.5;
  var data = [];
  for (var y = 0; y <= years; y++) {
    var age      = inp.currentAge + y;
    var infMult  = Math.pow(1 + inf, y);
    var hcMult   = Math.pow(1 + inp.healthInflation, y);
    var hc       = (age < inp.healthPhase1EndAge) ? inp.healthPhase1Annual * hcMult : inp.healthPhase2Annual * hcMult;
    var expenses = inp.monthlyExpenses * 12 * infMult + hc;
    if (y === 2) expenses += inp.extraSpend2027;
    if (y === 3) expenses += inp.extraSpend2028;
    // SS with birth-year-based start
    var calYrBridge = 2026 + y;
    var ssStartYear = 1959 + ssBridgeAge; // Scott born 1959
    var ssInc = 0;
    if (calYrBridge === ssStartYear) ssInc = ss70Monthly * 2;
    else if (calYrBridge > ssStartYear) {
      var ssColaYrs = calYrBridge - ssStartYear;
      ssInc = ss70Monthly * Math.pow(1 + ssCola, ssColaYrs) * 12;
    }
    // Stacey SS with actual net figures
    var staceyStartYear = 1962 + spouseBridgeClaimAge;
    var spSS = 0;
    if (inp.hasSpouse && !inp.survivorMode) {
      if (calYrBridge === staceyStartYear) spSS = spouseBridgeMonthly * 5;
      else if (calYrBridge > staceyStartYear) {
        var spColaYrs2 = calYrBridge - staceyStartYear;
        spSS = spouseBridgeMonthly * Math.pow(1 + ssCola, spColaYrs2) * 12;
      }
    }
    var totalIncome = ssInc + spSS;
    var gap = Math.max(0, expenses - totalIncome);
    var iraSum = iraCash + iraTips + iraDividend + iraGrowth;
    var rmd = (age >= 73 && iraSum > 0) ? iraSum / getRMD(age) : 0;
    var isBridge = age < ssBridgeAge;
    b1Cash += b2DivSweep * infMult;
    var fromB1 = Math.min(b1Cash, gap);
    b1Cash -= fromB1;
    var remaining = gap - fromB1;
    var rothCap = isBridge ? maxRothBridge * infMult : 0;
    var rothDraw = Math.min(remaining, rothCap);
    roth = Math.max(0, roth - rothDraw);
    remaining = remaining - rothDraw;
    var iraTargetDraw = isBridge ? Math.min(Math.max(15000, remaining), 20000) : Math.max(gap, rmd);
    var ssTaxable  = totalIncome * 0.85;
    var baseIncome = iraTargetDraw + ssTaxable;
    var room22     = Math.max(0, top22 - Math.max(0, baseIncome - stdDed));
    var irmaaCap   = Math.max(0, irmaaLimit - baseIncome);
    var convAmt    = (calYrBridge >= 2027 && calYrBridge <= 2031) ? Math.min(room22, irmaaCap) : 0;
    // v12: bracket-based conversion tax (federal + state)
    var convTax = convAmt > 0 ? (effectiveTax(baseIncome + convAmt, status) - effectiveTax(baseIncome, status)) + convAmt * (stRate / 100) : 0;
    taxable = Math.max(0, taxable - convTax);
    var need = Math.max(iraTargetDraw, rmd);
    var withdrawn = 0;
    var wd = function(avail) {
      if (withdrawn >= need || avail <= 0) return avail;
      var amt = Math.min(avail, need - withdrawn);
      withdrawn += amt; return avail - amt;
    };
    iraCash     = wd(iraCash);
    iraTips     = wd(iraTips);
    iraDividend = wd(iraDividend);
    iraGrowth   = wd(iraGrowth);
    // v12: Roth conversion from GROWTH first
    var convFromGrowth2 = Math.min(iraGrowth, convAmt);
    var convRemain2 = convAmt - convFromGrowth2;
    var convFromDiv2 = Math.min(iraDividend, convRemain2);
    convRemain2 -= convFromDiv2;
    var convFromCash2 = Math.min(iraCash, convRemain2);
    iraGrowth   -= convFromGrowth2;
    iraDividend -= convFromDiv2;
    iraCash     -= convFromCash2;
    roth        += convFromGrowth2 + convFromDiv2 + convFromCash2;
    // v12: QCD from IRA (not Roth)
    var qcd = (age >= inp.qcdStartAge) ? Math.min(inp.qcdAmount, iraSum * 0.05) : 0;
    var qcdFC = Math.min(iraCash, qcd);
    var qcdFD = Math.min(iraDividend, qcd - qcdFC);
    iraCash -= qcdFC; iraDividend -= qcdFD;
    var total = Math.max(0, taxable + b1Cash + iraCash + iraTips + iraDividend + iraGrowth + roth);
    data.push({
      age, balance: total,
      ssIncome:  Math.round(totalIncome),
      expenses:  Math.round(expenses),
      fromB1:    Math.round(fromB1),
      rothDraw:  Math.round(rothDraw),
      iraDraw:   Math.round(withdrawn),
      convAmt:   Math.round(convAmt),
      convTax:   Math.round(convTax),
      rothBal:   Math.round(roth),
      iraBal:    Math.round(iraCash + iraTips + iraDividend + iraGrowth),
      b1Bal:     Math.round(b1Cash),
      taxableBal:Math.round(taxable),
      magi:      Math.round(baseIncome + convAmt)
    });
    b1Cash      = Math.max(0, b1Cash      * (1 + cR));
    taxable     = Math.max(0, taxable     * (1 + cR * 0.5 + dvR * 0.5));
    iraCash     = Math.max(0, iraCash     * (1 + cR));
    iraTips     = Math.max(0, iraTips     * (1 + tR));
    iraDividend = Math.max(0, iraDividend * (1 + dvR));
    iraGrowth   = Math.max(0, iraGrowth   * (1 + grR));
    roth        = Math.max(0, roth * (1 + roR));
  }
  return data;
}

// ── Blank asset template ───────────────────────────────────────────────────────
function newAsset() {
  return { id: 'a' + Date.now(), name: '', amount: 0, type: 'Cash', account: 'IRA', maturity: 'Ongoing', yld: '', risk: 'Medium', bucket: null };
}

export default function RetireStrongPlanner() {
  var tabState = useState('summary');
  var activeTab = tabState[0]; var setActiveTab = tabState[1];

  var inputState = useState(DEFAULTS);
  var inp = inputState[0]; var setInp = inputState[1];

  var rawState = useState(function() {
    var r = {};
    Object.keys(DEFAULTS).forEach(function(k) { r[k] = typeof DEFAULTS[k] === 'number' ? String(DEFAULTS[k]) : DEFAULTS[k]; });
    return r;
  });
  var raw = rawState[0]; var setRaw = rawState[1];

  // helper to update both inp and raw from DB data (keeps settings inputs in sync)
  var setFromDb = useCallback(function(updater) {
    setInp(function(prev) {
      var updated = typeof updater === 'function' ? updater(prev) : Object.assign({}, prev, updater);
      // Sync raw state so settings inputs show the DB values
      setRaw(function(prevRaw) {
        var newRaw = Object.assign({}, prevRaw);
        Object.keys(updated).forEach(function(k) {
          if (updated[k] !== prev[k]) {
            newRaw[k] = typeof updated[k] === 'number' ? String(updated[k]) : updated[k];
          }
        });
        return newRaw;
      });
      return updated;
    });
  }, []);

  // ── Editable asset list ──────────────────────────────────────────────────────
  var assetsState = useState(DEFAULT_ASSETS);
  var assets = assetsState[0]; var setAssets = assetsState[1];

  // ── Load live data from DB on mount ──────────────────────────────────────────
  var API = "http://localhost:3101/api";
  var USER_ID = "11111111-1111-1111-1111-111111111111";
  // dbStatus: 'loading' | 'live' | 'offline' | 'saving' | 'saved' | 'error'
  var dbStatusState = useState("loading"); var dbStatus = dbStatusState[0]; var setDbStatus = dbStatusState[1];
  var lastSaveErrState = useState(null); var lastSaveErr = lastSaveErrState[0]; var setLastSaveErr = lastSaveErrState[1];
  var healthcareIdsRef = React.useRef({ phase1: null, phase2: null });

  // ── Generic DB write-back helper ────────────────────────────────────────
  var dbSave = useCallback(function(opts) {
    var method = opts.method || 'PUT';
    var path = opts.path;
    var body = opts.body;
    var quiet = opts.quiet || false; // if true, don't flash 'saving' indicator
    if (!quiet) setDbStatus('saving');
    setLastSaveErr(null);
    return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 'user_id=' + USER_ID, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(j) { throw new Error(j.error || ('HTTP ' + r.status)); });
        return r.json();
      })
      .then(function(data) {
        setDbStatus('saved');
        setTimeout(function() {
          setDbStatus(function(cur) { return cur === 'saved' ? 'live' : cur; });
        }, 2000);
        return data;
      })
      .catch(function(err) {
        console.error('[dbSave] failed:', method, path, err);
        setDbStatus('error');
        setLastSaveErr(err.message || String(err));
      });
  }, []);
  React.useEffect(function() {
    // Set status after holdings load
    fetch(API + "/holdings")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (Array.isArray(data) && data.length > 0) {
          setAssets(data);
          setDbStatus("live");
        } else { setDbStatus("offline"); }
      })
      .catch(function() { setDbStatus("offline"); });

    // 2. Profile — merge into inp
    fetch(API + "/profile?user_id=" + USER_ID)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(p) {
        if (p) {
          setFromDb(function(prev) { return Object.assign({}, prev, {
            monthlyExpenses: parseFloat(p.monthly_spending) || prev.monthlyExpenses,
            inflationRate: parseFloat(p.general_inflation) || prev.inflationRate,
            stateTaxRate: parseFloat(p.state_tax_rate) || prev.stateTaxRate,
            lifeExpectancy: p.life_expectancy || prev.lifeExpectancy,
            filingStatus: p.filing_status === 'mfj' ? 'married' : 'single',
          }); });
        }
      })
      .catch(function() {});

    // 3. Social Security config
    fetch(API + "/social_security?user_id=" + USER_ID)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(ss) {
        if (Array.isArray(ss) && ss.length > 0) {
          var scott = ss.find(function(s) { return s.person === 1; });
          var stacey = ss.find(function(s) { return s.person === 2; });
          setFromDb(function(prev) { return Object.assign({}, prev, {
            ssFRA: scott ? parseFloat(scott.fra_pia_monthly) : prev.ssFRA,
            ssMonthly: scott ? parseFloat(scott.fra_pia_monthly) : prev.ssMonthly,
            ssAge: scott ? scott.claiming_age : prev.ssAge,
            ssCola: scott ? parseFloat(scott.cola_rate) : prev.ssCola,
            spouseSSAt67: stacey ? parseFloat(stacey.fra_pia_monthly) : prev.spouseSSAt67,
            spouseSSAge: stacey ? stacey.claiming_age : prev.spouseSSAge,
          }); });
        }
      })
      .catch(function() {});

    // 4. Roth conversion plan
    fetch(API + "/roth_plan?user_id=" + USER_ID)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(rp) {
        if (Array.isArray(rp) && rp.length > 0) {
          var convMap = {};
          rp.forEach(function(r) { convMap[r.year] = parseFloat(r.planned_amount) || 0; });
          setFromDb(function(prev) { return Object.assign({}, prev, {
            conv2027: convMap[2027] !== undefined ? convMap[2027] : prev.conv2027,
            conv2028: convMap[2028] !== undefined ? convMap[2028] : prev.conv2028,
            conv2029: convMap[2029] !== undefined ? convMap[2029] : prev.conv2029,
            conv2030: convMap[2030] !== undefined ? convMap[2030] : prev.conv2030,
            conv2031: convMap[2031] !== undefined ? convMap[2031] : prev.conv2031,
          }); });
        }
      })
      .catch(function() {});

    // 5. Return assumptions
    fetch(API + "/returns?user_id=" + USER_ID)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(ret) {
        if (Array.isArray(ret) && ret.length > 0) {
          var rMap = {};
          ret.forEach(function(r) { rMap[r.asset_class] = parseFloat(r.return_rate); });
          setFromDb(function(prev) { return Object.assign({}, prev, {
            cashReturnRate: rMap.cash_cd !== undefined ? rMap.cash_cd : prev.cashReturnRate,
            tipsRealReturn: rMap.tips !== undefined ? rMap.tips : prev.tipsRealReturn,
            dividendReturnRate: rMap.dividend !== undefined ? rMap.dividend : prev.dividendReturnRate,
            growthReturnRate: rMap.growth !== undefined ? rMap.growth : prev.growthReturnRate,
            rothReturnRate: rMap.roth !== undefined ? rMap.roth : prev.rothReturnRate,
          }); });
        }
      })
      .catch(function() {});

    // 6. Healthcare config
    fetch(API + "/healthcare?user_id=" + USER_ID)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(hc) {
        if (Array.isArray(hc) && hc.length > 0) {
          var phase1 = hc.find(function(h) { return h.phase_name.includes('ACA') || h.age_end; });
          var phase2 = hc.find(function(h) { return h.phase_name.includes('Medicare') || !h.age_end; });
          // Store the DB row IDs for write-back
          if (phase1) healthcareIdsRef.current.phase1 = phase1.id;
          if (phase2) healthcareIdsRef.current.phase2 = phase2.id;
          setFromDb(function(prev) { return Object.assign({}, prev, {
            healthPhase1Annual: phase1 ? parseFloat(phase1.annual_cost) : prev.healthPhase1Annual,
            healthPhase1EndAge: phase1 && phase1.age_end ? phase1.age_end + 1 : prev.healthPhase1EndAge,
            healthPhase2Annual: phase2 ? parseFloat(phase2.annual_cost) : prev.healthPhase2Annual,
            healthInflation: phase1 ? parseFloat(phase1.healthcare_inflation) / 100 : prev.healthInflation,
          }); });
        }
      })
      .catch(function() {});

    // 7. Expense budget
    fetch(API + "/expenses?user_id=" + USER_ID)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(exp) {
        if (Array.isArray(exp) && exp.length > 0) {
          var expMap = {};
          exp.forEach(function(e) { expMap[e.category] = parseFloat(e.monthly_amount); });
          setFromDb(function(prev) { return Object.assign({}, prev, {
            housingMonthly: expMap.housing !== undefined ? expMap.housing : prev.housingMonthly,
            foodMonthly: expMap.food !== undefined ? expMap.food : prev.foodMonthly,
            transportMonthly: expMap.transportation !== undefined ? expMap.transportation : prev.transportMonthly,
            travelMonthly: expMap.travel !== undefined ? expMap.travel : prev.travelMonthly,
            otherMonthly: expMap.other !== undefined ? expMap.other : prev.otherMonthly,
          }); });
        }
      })
      .catch(function() {});

    // 8. Income tracking (Phase 3)
    fetch(API + "/income_tracking?user_id=" + USER_ID + "&year=2026")
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && typeof data === 'object') {
          setThisYear(function(prev) { return Object.assign({}, prev, data); });
        }
      })
      .catch(function() {});

    // 9. Spending actuals (Phase 3)
    fetch(API + "/spending_actuals?user_id=" + USER_ID + "&year=2026")
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && typeof data === 'object') {
          setMonthlySpend(function(prev) { return Object.assign({}, prev, data); });
        }
      })
      .catch(function() {});

  }, []);


  // ── Editable bucket config ───────────────────────────────────────────────────
  var bucketCfgState = useState(DEFAULT_BUCKET_CONFIG);
  var bucketCfg = bucketCfgState[0]; var setBucketCfg = bucketCfgState[1];

  // ── Asset editor modal state ─────────────────────────────────────────────────
  var editAssetState = useState(null); // null | asset object being edited
  var editAsset = editAssetState[0]; var setEditAsset = editAssetState[1];
  var editAssetIsNewState = useState(false);
  var editAssetIsNew = editAssetIsNewState[0]; var setEditAssetIsNew = editAssetIsNewState[1];

  // ── Move-to-bucket modal ─────────────────────────────────────────────────────
  var moveAssetState = useState(null); // null | asset id
  var moveAssetId = moveAssetState[0]; var setMoveAssetId = moveAssetState[1];

  var scenState = useState([{name:'Base Case',data:DEFAULTS,assets:DEFAULT_ASSETS,bucketCfg:DEFAULT_BUCKET_CONFIG,date:new Date().toLocaleDateString()}]);
  var scenarios = scenState[0]; var setScenarios = scenState[1];

  var activeScenState = useState('Base Case');
  var activeScen = activeScenState[0]; var setActiveScen = activeScenState[1];

  var modalState = useState(false);
  var showModal = modalState[0]; var setShowModal = modalState[1];

  var scenNameState = useState('');
  var scenName = scenNameState[0]; var setScenName = scenNameState[1];

  var ssCompAgeState = useState(67);
  var ssCompareAge = ssCompAgeState[0]; var setSsCompareAge = ssCompAgeState[1];

  // ── AI Insights state ────────────────────────────────────────────────────────
  var aiInsightsState = useState(null);   // null = not yet fetched
  var aiInsights = aiInsightsState[0]; var setAiInsights = aiInsightsState[1];
  var aiLoadingState = useState(false);
  var aiLoading = aiLoadingState[0]; var setAiLoading = aiLoadingState[1];
  var aiErrorState = useState(null);
  var aiError = aiErrorState[0]; var setAiError = aiErrorState[1];

  // ── Monthly Spend tracker state (persisted to spending_actuals) ─────────
  var monthlySpendState = useState({
    jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0
  });
  var monthlySpend = monthlySpendState[0]; var setMonthlySpend = monthlySpendState[1];
  var spendTimersRef = React.useRef({});
  var updateMonthSpend = useCallback(function(month, val) {
    var num = parseFloat(val) || 0;
    setMonthlySpend(function(p) { var n = Object.assign({}, p); n[month] = num; return n; });
    // Debounced write-back (800ms)
    if (spendTimersRef.current[month]) clearTimeout(spendTimersRef.current[month]);
    spendTimersRef.current[month] = setTimeout(function() {
      var yr = parseInt(inp.spendYear || 2026, 10);
      console.log('[pro] saving spend:', month, '=', num, 'year=', yr);
      dbSave({ method:'PUT', path:'/spending_actuals/' + month, body:{ year: yr, amount: num } });
    }, 800);
  }, [dbSave, inp.spendYear]);

  // ── This Year income tracker state (persisted to income_tracking) ─────
  var thisYearState = useState({
    incW2: 0, incSeverance: 0, incIRA: 0, incRothConv: 0,
    incOther: 0, incDividends: 0,
    fedWithheld: 0, stateWithheld: 0,
  });
  var thisYear = thisYearState[0]; var setThisYear = thisYearState[1];
  var incTimersRef = React.useRef({});
  var updateThisYear = useCallback(function(key, val) {
    var num = parseFloat(val) || 0;
    setThisYear(function(p) { var n = Object.assign({}, p); n[key] = num; return n; });
    // Debounced write-back (800ms)
    if (incTimersRef.current[key]) clearTimeout(incTimersRef.current[key]);
    incTimersRef.current[key] = setTimeout(function() {
      var yr = parseInt(inp.trackingYear || 2026, 10);
      console.log('[pro] saving income:', key, '=', num, 'year=', yr);
      dbSave({ method:'PUT', path:'/income_tracking/' + key, body:{ year: yr, amount: num } });
    }, 800);
  }, [dbSave, inp.trackingYear]);

  // ── Quarterly balance ledger state ───────────────────────────────────────
  var ledgerState = useState([]);
  var ledger = ledgerState[0]; var setLedger = ledgerState[1];
  var addLedgerEntry = useCallback(function(entry) {
    setLedger(function(prev) { return prev.concat([Object.assign({id:'L'+Date.now()}, entry)]); });
  }, []);
  var removeLedgerEntry = useCallback(function(id) {
    setLedger(function(prev) { return prev.filter(function(e) { return e.id !== id; }); });
  }, []);

  // ── Field-to-DB mapping for settings write-back ─────────────────────────
  // Maps client field names → { path, bodyFn(fieldName, value, inp) }
  // Fields not in this map are UI-only and don't persist.
  var FIELD_DB_MAP = {
    // Profile table
    monthlyExpenses:  { path:'/profile', bodyKey:'monthly_spending' },
    inflationRate:    { path:'/profile', bodyKey:'general_inflation' },
    stateTaxRate:     { path:'/profile', bodyKey:'state_tax_rate' },
    lifeExpectancy:   { path:'/profile', bodyKey:'life_expectancy' },
    filingStatus:     { path:'/profile', bodyKey:'filing_status', transform: function(v){ return v === 'married' ? 'mfj' : 'single'; } },
    survivorMode:     { path:'/profile', bodyKey:'survivor_mode', transform: function(v){ return !!v; } },

    // Social Security — Scott (person 1)
    ssFRA:            { path:'/social_security/1', multi: function(v, inp){ return { fra_pia_monthly: v, claiming_age: inp.ssAge || 70, cola_rate: inp.ssCola || 2.5 }; }},
    ssAge:            { path:'/social_security/1', multi: function(v, inp){ return { fra_pia_monthly: inp.ssFRA || 3445, claiming_age: v, cola_rate: inp.ssCola || 2.5 }; }},
    ssCola:           { path:'/social_security/1', multi: function(v, inp){ return { fra_pia_monthly: inp.ssFRA || 3445, claiming_age: inp.ssAge || 70, cola_rate: v }; }},

    // Social Security — Stacey (person 2)
    spouseSSAt63:     { path:'/social_security/2', multi: function(v, inp){ return { fra_pia_monthly: inp.spouseSSAt67 || 1879, claiming_age: inp.staceySS63 ? 63 : (inp.spouseSSAge || 67), cola_rate: inp.ssCola || 2.5 }; }},
    spouseSSAt67:     { path:'/social_security/2', multi: function(v, inp){ return { fra_pia_monthly: v, claiming_age: inp.staceySS63 ? 63 : (inp.spouseSSAge || 67), cola_rate: inp.ssCola || 2.5 }; }},
    spouseSSAge:      { path:'/social_security/2', multi: function(v, inp){ return { fra_pia_monthly: inp.spouseSSAt67 || 1879, claiming_age: v, cola_rate: inp.ssCola || 2.5 }; }},
    staceySS63:       { path:'/social_security/2', multi: function(v, inp){ return { fra_pia_monthly: inp.spouseSSAt67 || 1879, claiming_age: v ? 63 : (inp.spouseSSAge || 67), cola_rate: inp.ssCola || 2.5 }; }},

    // Roth conversions
    conv2027:         { path:'/roth_plan/2027', bodyKey:'planned_amount' },
    conv2028:         { path:'/roth_plan/2028', bodyKey:'planned_amount' },
    conv2029:         { path:'/roth_plan/2029', bodyKey:'planned_amount' },
    conv2030:         { path:'/roth_plan/2030', bodyKey:'planned_amount' },
    conv2031:         { path:'/roth_plan/2031', bodyKey:'planned_amount' },

    // QCD
    qcdAmount:        { path:'/qcd_config', bodyKey:'annual_amount' },
    qcdStartAge:      { path:'/qcd_config', bodyKey:'start_age' },

    // Return assumptions
    cashReturnRate:   { path:'/returns/cash_cd', bodyKey:'return_rate' },
    tipsRealReturn:   { path:'/returns/tips', bodyKey:'return_rate' },
    dividendReturnRate:{ path:'/returns/dividend', bodyKey:'return_rate' },
    growthReturnRate: { path:'/returns/growth', bodyKey:'return_rate' },
    rothReturnRate:   { path:'/returns/roth', bodyKey:'return_rate' },

    // Market assumptions
    capeRatio:        { path:'/market_assumptions', bodyKey:'cape_ratio' },
    tenYrTreasury:    { path:'/market_assumptions', bodyKey:'ten_yr_treasury' },
    tipsYield:        { path:'/market_assumptions', bodyKey:'tips_yield' },

    // Healthcare (dynamic IDs loaded on mount)
    healthPhase1Annual: { pathFn: function(){ return '/healthcare/' + (healthcareIdsRef.current.phase1 || 1); }, bodyKey:'annual_cost' },
    healthPhase1EndAge: { pathFn: function(){ return '/healthcare/' + (healthcareIdsRef.current.phase1 || 1); }, bodyKey:'age_end' },
    healthPhase2Annual: { pathFn: function(){ return '/healthcare/' + (healthcareIdsRef.current.phase2 || 2); }, bodyKey:'annual_cost' },
    healthInflation:    { pathFn: function(){ return '/healthcare/' + (healthcareIdsRef.current.phase1 || 1); }, bodyKey:'healthcare_inflation', transform: function(v){ return v * 100; } },

    // Expense budget
    housingMonthly:   { path:'/expenses/housing', bodyKey:'monthly_amount' },
    foodMonthly:      { path:'/expenses/food', bodyKey:'monthly_amount' },
    transportMonthly: { path:'/expenses/transportation', bodyKey:'monthly_amount' },
    travelMonthly:    { path:'/expenses/travel', bodyKey:'monthly_amount' },
    otherMonthly:     { path:'/expenses/other', bodyKey:'monthly_amount' },
  };

  var settingsTimersRef = React.useRef({});

  var setField = useCallback(function(k, v) {
    setRaw(function(p) { var n = Object.assign({}, p); n[k] = v; return n; });
    var num = v === '' ? 0 : parseFloat(v);
    var parsedVal = isNaN(num) ? v : num;
    setInp(function(p) { var n = Object.assign({}, p); n[k] = isNaN(num) ? p[k] : num; return n; });

    // Auto-save to DB if this field has a mapping
    var mapping = FIELD_DB_MAP[k];
    if (mapping) {
      if (settingsTimersRef.current[k]) clearTimeout(settingsTimersRef.current[k]);
      settingsTimersRef.current[k] = setTimeout(function() {
        var body;
        if (mapping.multi) {
          // Field needs to send multiple columns (e.g. SS requires all 3 fields)
          body = mapping.multi(parsedVal, Object.assign({}, inp, {[k]: parsedVal}));
        } else {
          body = {};
          var val = mapping.transform ? mapping.transform(parsedVal) : parsedVal;
          body[mapping.bodyKey] = val;
        }
        console.log('[pro] saving setting:', k, '→', mapping.path || mapping.pathFn(), body);
        dbSave({ method:'PUT', path: mapping.pathFn ? mapping.pathFn() : mapping.path, body: body });
      }, 800);
    }
  }, [dbSave, inp]);

  var loadScen = useCallback(function(s) {
    setInp(s.data);
    var r = {};
    Object.keys(s.data).forEach(function(k) { r[k] = typeof s.data[k] === 'number' ? String(s.data[k]) : s.data[k]; });
    setRaw(r);
    if (s.assets) setAssets(s.assets);
    if (s.bucketCfg) setBucketCfg(s.bucketCfg);
    setActiveScen(s.name);
  }, []);

  var saveScen = useCallback(function() {
    var name = scenName.trim() || ('Scenario ' + (scenarios.length + 1));
    setScenarios(function(prev) {
      var filtered = prev.filter(function(s) { return s.name !== name; });
      return filtered.concat([{name:name,data:Object.assign({},inp),assets:assets.slice(),bucketCfg:bucketCfg.slice(),date:new Date().toLocaleDateString()}]);
    });
    setActiveScen(name);
    setScenName('');
    setShowModal(false);
  }, [scenName, scenarios, inp, assets, bucketCfg]);

  // ── Asset CRUD handlers ──────────────────────────────────────────────────────
  var openAddAsset = useCallback(function() {
    setEditAsset(newAsset());
    setEditAssetIsNew(true);
  }, []);

  var openEditAsset = useCallback(function(a) {
    setEditAsset(Object.assign({}, a));
    setEditAssetIsNew(false);
  }, []);

  var saveAsset = useCallback(function() {
    if (!editAsset) return;
    var a = Object.assign({}, editAsset, { amount: parseFloat(editAsset.amount) || 0 });

    if (editAssetIsNew) {
      // POST to create in DB, then update local state with the DB-assigned id
      dbSave({ method:'POST', path:'/holdings', body:{
        account: a.account, symbol: a.name, name: a.name,
        amount: a.amount, type: a.type, bucket: a.bucket,
        risk_level: a.risk
      }}).then(function(saved) {
        if (saved && saved.id) {
          // Replace the temp client id with the DB id
          a.id = saved.id;
        }
        setAssets(function(prev) { return prev.concat([a]); });
      });
    } else {
      // Existing holding — update local state immediately
      setAssets(function(prev) {
        return prev.map(function(x) { return x.id === a.id ? a : x; });
      });
      // If it's a DB holding (id starts with 'db'), persist
      if (typeof a.id === 'string' && a.id.indexOf('db') === 0) {
        var dbId = parseInt(a.id.replace('db', ''), 10);
        dbSave({ method:'PUT', path:'/holdings/' + dbId, body:{
          name: a.name, amount: a.amount, type: a.type,
          bucket: a.bucket, risk: a.risk
        }});
      }
    }
    setEditAsset(null);
  }, [editAsset, editAssetIsNew, dbSave]);

  var deleteAsset = useCallback(function(id) {
    setAssets(function(prev) { return prev.filter(function(a) { return a.id !== id; }); });
    // If it's a DB holding, delete from DB too
    if (typeof id === 'string' && id.indexOf('db') === 0) {
      var dbId = parseInt(id.replace('db', ''), 10);
      dbSave({ method:'DELETE', path:'/holdings/' + dbId, quiet: true });
    }
  }, [dbSave]);

  var moveAssetToBucket = useCallback(function(assetId, bucketId) {
    setAssets(function(prev) {
      return prev.map(function(a) { return a.id === assetId ? Object.assign({}, a, {bucket: bucketId}) : a; });
    });
    setMoveAssetId(null);
    // If it's a DB holding, persist the bucket change
    if (typeof assetId === 'string' && assetId.indexOf('db') === 0) {
      var dbId = parseInt(assetId.replace('db', ''), 10);
      dbSave({ method:'PUT', path:'/holdings/' + dbId + '/bucket', body:{ bucket: bucketId }, quiet: true });
    }
  }, [dbSave]);

  // ── Derived values from editable assets ─────────────────────────────────────
  var derivedTotals = useMemo(function() {
    var taxable = 0, iraCash = 0, iraTips = 0, iraDividend = 0, iraGrowth = 0, roth = 0;
    assets.forEach(function(a) {
      var amt = a.amount || 0;
      if (a.account === 'Taxable') { taxable += amt; return; }
      if (a.account === 'Roth IRA' || a.account === 'Roth 401k') { roth += amt; return; }
      // IRA — classify by type
      if (a.type === 'Cash' || a.type === 'CD' || a.type === 'T-Bill') { iraCash += amt; }
      else if (a.type === 'TIPS' || a.type === 'I-Bond' || a.type === 'Bond') { iraTips += amt; }
      else if (a.type === 'Dividend ETF' || a.type === 'REIT ETF') { iraDividend += amt; }
      else { iraGrowth += amt; }
    });
    return { taxable, iraCash, iraTips, iraDividend, iraGrowth, roth };
  }, [assets]);

  // Sync derived totals back into inp for calculations
  var inpWithAssets = useMemo(function() {
    return Object.assign({}, inp, {
      taxableBal: derivedTotals.taxable,
      iraBalCash: derivedTotals.iraCash,
      iraBalTips: derivedTotals.iraTips,
      iraBalDividend: derivedTotals.iraDividend,
      iraBalGrowth: derivedTotals.iraGrowth,
      rothBal: derivedTotals.roth,
    });
  }, [inp, derivedTotals]);

  // Derived bucket totals from asset assignments
  var buckets = useMemo(function() {
    return bucketCfg.map(function(bc) {
      var holdings = assets.filter(function(a) { return a.bucket === bc.id; }).map(function(a) { return {name:a.name, amount:a.amount, account:a.account}; });
      var current = holdings.reduce(function(s, h) { return s + (h.amount || 0); }, 0);
      return Object.assign({}, bc, {holdings: holdings, current: current});
    });
  }, [assets, bucketCfg]);

  var unassigned = useMemo(function() { return assets.filter(function(a) { return !a.bucket; }); }, [assets]);

  // Composition for pie chart - derived from assets
  var composition = useMemo(function() {
    var map = {};
    assets.forEach(function(a) {
      var cat;
      if (a.type === 'Cash' || a.type === 'CD' || a.type === 'T-Bill' || a.type === 'T-Note') cat = 'Cash & Near-Cash';
      else if (a.type === 'TIPS' || a.type === 'I-Bond' || a.type === 'Bond ETF') cat = 'TIPS / Inflation';
      else if (a.type === 'Dividend ETF' || a.type === 'REIT ETF') cat = 'Dividend/REIT';
      else if (a.type === 'Equity ETF') cat = 'Equity ETF';
      else if (a.type === 'Intl Equity') cat = 'International';
      else if (a.account === 'Roth IRA' || a.account === 'Roth 401k') cat = 'Roth Assets';
      else cat = 'Other';
      map[cat] = (map[cat] || 0) + (a.amount || 0);
    });
    var COMP_COLORS = {'Cash & Near-Cash':'#34d399','TIPS / Inflation':'#60a5fa','Dividend/REIT':'#fbbf24','Equity ETF':'#f97316','International':'#e879f9','Roth Assets':'#a78bfa','Other':'#94a3b8'};
    var total = Object.values(map).reduce(function(s,v){return s+v;},0) || 1;
    return Object.entries(map).map(function(e) { return {name:e[0], amount:e[1], pct:(e[1]/total*100).toFixed(1), color:COMP_COLORS[e[0]]||'#94a3b8'}; });
  }, [assets]);

  var totalPort = useMemo(function() {
    return assets.reduce(function(s,a){return s+(a.amount||0);},0);
  }, [assets]);

  var er = useMemo(function() { return capeBased(inpWithAssets.capeRatio, inpWithAssets.tenYrTreasury, inpWithAssets.tipsYield); }, [inpWithAssets]);
  var iraTotal = useMemo(function() { return derivedTotals.iraCash + derivedTotals.iraTips + derivedTotals.iraDividend + derivedTotals.iraGrowth; }, [derivedTotals]);

  var dynTaxRate = useMemo(function() {
    var status = resolveStatus(inpWithAssets);
    return combinedMarginalRate(inpWithAssets.monthlyExpenses * 12 + inpWithAssets.pensionMonthly * 12, status, inpWithAssets.stateTaxRate);
  }, [inpWithAssets]);

  var cashFlow = useMemo(function() {
    var data = [];
    var taxable = inpWithAssets.taxableBal + (inpWithAssets.severanceNet || 0); // severance adds to opening taxable
    var iraCash = inpWithAssets.iraBalCash;
    var iraTips = inpWithAssets.iraBalTips;
    var iraDividend = inpWithAssets.iraBalDividend;
    var iraGrowth = inpWithAssets.iraBalGrowth;
    var roth = inpWithAssets.rothBal;
    var years = inpWithAssets.lifeExpectancy - inpWithAssets.currentAge;
    var inf = er.inflation;
    var cR   = inpWithAssets.cashReturnRate   / 100;
    var tR   = inf + inpWithAssets.tipsRealReturn / 100;
    var dvR  = inpWithAssets.dividendReturnRate / 100;
    var grR  = inpWithAssets.growthReturnRate   / 100;
    var roR  = inpWithAssets.rothReturnRate     / 100;
    var status = resolveStatus(inpWithAssets);
    var stRate = inpWithAssets.stateTaxRate || 2.5;
    for (var y = 0; y <= years; y++) {
      var age = inpWithAssets.currentAge + y;
      var calYear = 2026 + y;
      var infMult = Math.pow(1 + inf, y);
      var extra = (calYear === 2027 ? inpWithAssets.extraSpend2027 : 0) + (calYear === 2028 ? inpWithAssets.extraSpend2028 : 0);
      var hcInflMult = Math.pow(1 + inpWithAssets.healthInflation, y);
      var healthcare = (age < inpWithAssets.healthPhase1EndAge) ? inpWithAssets.healthPhase1Annual * hcInflMult : inpWithAssets.healthPhase2Annual * hcInflMult;
      // 2026 partial year — retirement starts April 10, expenses = 8.7 months
      var livingBase = inpWithAssets.monthlyExpenses * 12 * infMult;
      if (calYear === 2026) livingBase = inpWithAssets.monthlyExpenses * 8.7 * infMult;
      var expenses = livingBase + extra + healthcare;
      // SS broken out separately
      var scottSS = scottSSForYear(inpWithAssets, calYear);
      var staceySS = staceySSForYear(inpWithAssets, calYear);
      var ssIncome = scottSS + staceySS;
      var income = ssIncome;
      if (age >= inpWithAssets.pensionStartAge && inpWithAssets.pensionMonthly > 0) income += inpWithAssets.pensionMonthly * 12;
      if (y < inpWithAssets.partTimeYears && inpWithAssets.partTimeIncome > 0) income += inpWithAssets.partTimeIncome;
      var gap = Math.max(0, expenses - income);
      var iraSum = iraCash + iraTips + iraDividend + iraGrowth;
      var rmd = (age >= 73 && iraSum > 0) ? iraSum / getRMD(age) : 0;
      var need = Math.max(gap, rmd);
      var mRate = combinedMarginalRate(income + need, status, stRate);
      // Track withdrawals by source
      var withdrawn = 0; var taxes = 0;
      var fromTaxable = 0, fromIRA = 0, fromRoth = 0;
      var preTaxable = taxable, preIraCash = iraCash, preIraTips = iraTips, preIraDividend = iraDividend, preIraGrowth = iraGrowth, preRoth = roth;
      var wd = function(avail, rate) {
        if (withdrawn >= need || avail <= 0) return avail;
        var amt = Math.min(avail, need - withdrawn);
        withdrawn += amt; taxes += amt * rate;
        return avail - amt;
      };
      taxable     = wd(taxable,     0.15 + stRate/100);
      fromTaxable = preTaxable - taxable;
      iraCash     = wd(iraCash,     mRate);
      iraTips     = wd(iraTips,     mRate);
      iraDividend = wd(iraDividend, mRate);
      iraGrowth   = wd(iraGrowth,   mRate);
      fromIRA     = (preIraCash - iraCash) + (preIraTips - iraTips) + (preIraDividend - iraDividend) + (preIraGrowth - iraGrowth);
      roth        = wd(roth,        0);
      fromRoth    = preRoth - roth;
      // Roth conversions — source from GROWTH first
      var rothConv = rothConvForYear(inpWithAssets, calYear);
      var convFromGrowth = Math.min(iraGrowth, rothConv);
      var convRemain = rothConv - convFromGrowth;
      var convFromDiv = Math.min(iraDividend, convRemain);
      convRemain -= convFromDiv;
      var convFromCash = Math.min(iraCash, convRemain);
      iraGrowth -= convFromGrowth; iraDividend -= convFromDiv; iraCash -= convFromCash;
      roth += convFromGrowth + convFromDiv + convFromCash;
      // Conversion tax — actual bracket math (federal + state)
      var convGross = income + rothConv;
      var convTax = rothConv > 0 ? (effectiveTax(convGross, status) - effectiveTax(income, status)) + rothConv * (stRate / 100) : 0;
      taxable = Math.max(0, taxable - convTax);
      // IRMAA check
      var ssTaxable = ssIncome * 0.85;
      var magi = ssTaxable + fromIRA + rothConv + (inpWithAssets.pensionMonthly * 12);
      var irmaaHit = magi > 212000;
      // QCD from IRA (not Roth)
      var qcd = (age >= inpWithAssets.qcdStartAge) ? Math.min(inpWithAssets.qcdAmount, iraSum * 0.05) : 0;
      var qcdFromCash = Math.min(iraCash, qcd);
      var qcdFromDiv = Math.min(iraDividend, qcd - qcdFromCash);
      iraCash -= qcdFromCash;
      iraDividend -= qcdFromDiv;
      // Estimated total tax
      var estTax = Math.round(taxes + convTax + effectiveTax(income, status));
      var total = Math.max(0, taxable + iraCash + iraTips + iraDividend + iraGrowth + roth);
      data.push({
        year: calYear, age, balance: total,
        iraBalance: Math.round(iraCash + iraTips + iraDividend + iraGrowth),
        rothBalance: Math.round(roth),
        taxableBalance: Math.round(taxable),
        scottSS: Math.round(scottSS), staceySS: Math.round(staceySS),
        income: Math.round(income), ssIncome: Math.round(ssIncome),
        expenses: Math.round(expenses), healthcare: Math.round(healthcare),
        living: Math.round(livingBase + extra),
        gap: Math.round(gap),
        fromTaxable: Math.round(fromTaxable), fromIRA: Math.round(fromIRA), fromRoth: Math.round(fromRoth),
        rothConv: Math.round(rothConv), convTax: Math.round(convTax),
        estTax: estTax, irmaaHit: irmaaHit, magi: Math.round(magi),
        rmd: Math.round(rmd), shortfall: Math.max(0, need - withdrawn),
        margRate: Math.round(mRate * 100),
        taxes: Math.round(taxes)
      });
      taxable     = Math.max(0, taxable     * (1 + cR * 0.5 + dvR * 0.5));
      iraCash     = Math.max(0, iraCash     * (1 + cR));
      iraTips     = Math.max(0, iraTips     * (1 + tR));
      iraDividend = Math.max(0, iraDividend * (1 + dvR));
      iraGrowth   = Math.max(0, iraGrowth   * (1 + grR));
      roth        = Math.max(0, roth * (1 + roR));
    }
    return data;
  }, [inpWithAssets, er]);

  // ── Bucket-aware Monte Carlo with realistic refill discipline ────────────────
  // Bucket 1 (cash): covers expenses. Refilled by: dividends always, TIPS at maturity,
  //   equity trim only when market is up and B1 < 1yr expenses.
  // Bucket 2 (TIPS + dividends): TIPS mature in sequence (2028, 2031, 2034) flowing to B1.
  //   Dividends sweep to B1 annually. Principal only tapped if B1 exhausted.
  // Bucket 3 (growth + Roth): untouched in down years. Trimmed to refill B1 in up years.
  // Bear market (growth < -10%): live on B1 cash only. No B2/B3 equity sales.
  // Up year (growth > 0%): trim B3 up to 5% to refill B1 if below 1yr expenses.
  var mcData = useMemo(function() {
    var years = inpWithAssets.lifeExpectancy - inpWithAssets.currentAge;
    var results = [];
    var cR  = inpWithAssets.cashReturnRate / 100;
    var tR  = er.inflation + inpWithAssets.tipsRealReturn / 100;
    var dvR = inpWithAssets.dividendReturnRate / 100;
    var grR = inpWithAssets.growthReturnRate / 100;
    var roR = inpWithAssets.rothReturnRate / 100;
    var stockVol = inpWithAssets.stockVol / 100;
    var divVol   = stockVol * 0.55;
    var tipsVol  = 0.03;
    var annualExp = inpWithAssets.monthlyExpenses * 12;
    var retireY = inpWithAssets.retirementAge - inpWithAssets.currentAge;
    // TIPS maturity schedule (year index relative to currentAge)
    var tipsMat = {};
    tipsMat[retireY + 2] = derivedTotals.iraTips * (107000/315000);
    tipsMat[retireY + 5] = derivedTotals.iraTips * (103000/315000);
    tipsMat[retireY + 8] = derivedTotals.iraTips * (105000/315000);

    for (var sim = 0; sim < 500; sim++) {
      var taxable  = derivedTotals.taxable;
      var b1cash   = derivedTotals.iraCash;
      var b2tips   = derivedTotals.iraTips;
      var b2div    = derivedTotals.iraDividend;
      var b3growth = derivedTotals.iraGrowth;
      var roth     = derivedTotals.roth;

      var bals   = [Math.max(0, taxable+b1cash+b2tips+b2div+b3growth+roth)];
      var b1bals = [b1cash];
      var b2bals = [b2tips+b2div];
      var b3bals = [b3growth+roth];

      for (var y = 1; y <= years; y++) {
        var age2 = inpWithAssets.currentAge + y;

        // Box-Muller random returns
        var u1 = Math.random(), u2 = Math.random();
        var z  = Math.sqrt(-2*Math.log(Math.max(u1,1e-9)))*Math.cos(2*Math.PI*u2);
        var zd = Math.sqrt(-2*Math.log(Math.max(Math.random(),1e-9)))*Math.cos(2*Math.PI*Math.random());
        var zt = Math.sqrt(-2*Math.log(Math.max(Math.random(),1e-9)))*Math.cos(2*Math.PI*Math.random());

        var retCash   = cR;
        var retTips   = tR  + tipsVol * zt;
        var retDiv    = dvR + divVol  * zd;
        var retGrowth = grR + stockVol * z;
        var retRoth   = roR + stockVol * z * 1.05;
        var marketUp  = retGrowth > 0;
        var bearYear  = retGrowth < -0.10;

        // Income
        var calYear2 = 2026 + y;
        var inc2 = ssIncomeForYear(inpWithAssets, calYear2);
        if (age2 >= inpWithAssets.pensionStartAge) inc2 += inpWithAssets.pensionMonthly * 12;

        // Expenses
        var hcMC = (age2 < inpWithAssets.healthPhase1EndAge)
          ? inpWithAssets.healthPhase1Annual * Math.pow(1+inpWithAssets.healthInflation,y)
          : inpWithAssets.healthPhase2Annual * Math.pow(1+inpWithAssets.healthInflation,y);
        var exp2     = inpWithAssets.monthlyExpenses * 12 * Math.pow(1+er.inflation,y) + hcMC;
        var oneYrExp = annualExp * Math.pow(1+er.inflation,y);

        // RMDs
        var iraSum2 = b1cash + b2tips + b2div + b3growth;
        var rmd2 = (age2 >= 73 && iraSum2 > 0) ? iraSum2 / getRMD(age2) : 0;
        var need = Math.max(Math.max(0, exp2 - inc2), rmd2);

        // STEP 1: Sweep SCHD/VNQ dividends from B2 into B1 (always, every year)
        var divSweep = b2div * dvR;
        b2div  = Math.max(0, b2div - divSweep);
        b1cash = b1cash + divSweep;

        // STEP 2: TIPS maturity — move maturing principal to B1
        if (tipsMat[y]) {
          var matAmt = Math.min(b2tips, tipsMat[y] * Math.pow(1+tR, y));
          b2tips = Math.max(0, b2tips - matAmt);
          b1cash = b1cash + matAmt;
        }

        // STEP 3: Cover gap from B1 first (always safe)
        var withdrawn = 0;
        var wdFrom = function(avail, skip) {
          if (withdrawn >= need || avail <= 0 || skip) return avail;
          var amt = Math.min(avail, need - withdrawn);
          withdrawn += amt;
          return avail - amt;
        };
        taxable = wdFrom(taxable, false);
        b1cash  = wdFrom(b1cash,  false);

        // STEP 4: If still short, tap B2 TIPS principal then B2 div principal
        b2tips = wdFrom(b2tips, false);
        b2div  = wdFrom(b2div,  false);

        // STEP 5: Tap B3 only if market up or last resort in bear year
        b3growth = wdFrom(b3growth, bearYear);
        roth     = wdFrom(roth,     bearYear);
        if (withdrawn < need) {
          b3growth = wdFrom(b3growth, false);
          roth     = wdFrom(roth,     false);
        }

        // STEP 6: Refill B1 from B3 in up years if B1 below 1yr expenses
        if (marketUp && b1cash < oneYrExp && (b3growth + roth) > 0) {
          var refill = Math.min(oneYrExp - b1cash, (b3growth + roth) * 0.05);
          var fromG  = Math.min(b3growth, refill * 0.6);
          var fromR  = Math.min(roth,     refill * 0.4);
          b3growth -= fromG; roth -= fromR;
          b1cash   += fromG + fromR;
        }

        // STEP 7: Roth conversions — v12: source from GROWTH first, bracket-based tax
        var rothConv2 = rothConvForYear(inpWithAssets, calYear2);
        var mcConvFromGrowth = Math.min(b3growth, rothConv2);
        var mcConvRemain = rothConv2 - mcConvFromGrowth;
        var mcConvFromDiv = Math.min(b2div, mcConvRemain);
        mcConvRemain -= mcConvFromDiv;
        var mcConvFromCash = Math.min(b1cash, mcConvRemain);
        b3growth -= mcConvFromGrowth; b2div -= mcConvFromDiv; b1cash -= mcConvFromCash;
        roth += mcConvFromGrowth + mcConvFromDiv + mcConvFromCash;
        // v12: bracket-based conversion tax (federal + state)
        var mcStatus = resolveStatus(inpWithAssets);
        var mcConvTax = rothConv2 > 0 ? (effectiveTax(inc2 + rothConv2, mcStatus) - effectiveTax(inc2, mcStatus)) + rothConv2 * (inpWithAssets.stateTaxRate / 100) : 0;
        taxable = Math.max(0, taxable - mcConvTax);

        // STEP 8: QCD — v12: from IRA (b1cash then b2div), not Roth
        var qcd2 = (age2 >= inpWithAssets.qcdStartAge) ? Math.min(inpWithAssets.qcdAmount, iraSum2 * 0.05) : 0;
        var qcd2FromCash = Math.min(b1cash, qcd2);
        var qcd2FromDiv = Math.min(b2div, qcd2 - qcd2FromCash);
        b1cash -= qcd2FromCash;
        b2div -= qcd2FromDiv;

        // STEP 9: Grow remaining balances
        taxable  = Math.max(0, taxable  * (1 + cR * 0.5 + retDiv * 0.5));
        b1cash   = Math.max(0, b1cash   * (1 + retCash));
        b2tips   = Math.max(0, b2tips   * (1 + retTips));
        b2div    = Math.max(0, b2div    * (1 + retDiv));
        b3growth = Math.max(0, b3growth * (1 + retGrowth));
        roth     = Math.max(0, roth * (1 + retRoth));

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
  }, [inpWithAssets, er, derivedTotals]);


  var pctData = useMemo(function() {
    var years = inpWithAssets.lifeExpectancy - inpWithAssets.currentAge;
    var pts = [];
    for (var y = 0; y <= years; y++) {
      var totals = mcData.map(function(r){return r.total[y]||0;}).sort(function(a,b){return a-b;});
      var b1s    = mcData.map(function(r){return r.b1[y]||0;}).sort(function(a,b){return a-b;});
      var b2s    = mcData.map(function(r){return r.b2[y]||0;}).sort(function(a,b){return a-b;});
      var b3s    = mcData.map(function(r){return r.b3[y]||0;}).sort(function(a,b){return a-b;});
      var n = totals.length;
      var p = function(arr, pct) { return arr[Math.floor(n*pct)] || 0; };
      pts.push({year:inpWithAssets.currentAge+y, p10:p(totals,0.1), p25:p(totals,0.25), p50:p(totals,0.5), p75:p(totals,0.75), p90:p(totals,0.9), b1med:p(b1s,0.5), b2med:p(b2s,0.5), b3med:p(b3s,0.5)});
    }
    return pts;
  }, [mcData, inpWithAssets]);

  var successRate = useMemo(function() {
    var survived = mcData.filter(function(r){return (r.total[r.total.length-1]||0)>0;}).length;
    return (survived/mcData.length*100).toFixed(1);
  }, [mcData]);

  var taxRows = useMemo(function() {
    var rows = [];
    var status = resolveStatus(inpWithAssets);
    var stRate = inpWithAssets.stateTaxRate || 2.5;
    // v12: Track projected IRA balance year-over-year instead of using starting balance
    var projIra = iraTotal;
    var inf = er.inflation;
    var grR = inpWithAssets.growthReturnRate / 100;
    for (var y = 0; y <= 30; y++) {
      var age = inpWithAssets.currentAge + y;
      var calYearTax = 2026 + y;
      // v12: RMD based on projected IRA balance, not starting
      var rmd = age >= 73 && projIra > 0 ? projIra / getRMD(age) : 0;
      var rc = rothConvForYear(inpWithAssets, calYearTax);
      var qcd = age >= inpWithAssets.qcdStartAge ? inpWithAssets.qcdAmount : 0;
      var taxableInc = Math.max(0, rmd + rc - qcd);
      // v12: ssIncomeForYear already returns correct nominal amount with COLA
      var ssInc = ssIncomeForYear(inpWithAssets, calYearTax);
      var ssTaxable = ssInc * 0.85;
      var gross = taxableInc + inpWithAssets.pensionMonthly * 12 + ssTaxable;
      // v12: total tax includes state
      var fedTax = effectiveTax(gross, status);
      var stateTaxable = Math.max(0, taxableInc + inpWithAssets.pensionMonthly * 12); // AZ doesn't tax SS
      var stDed = STD_DED[status] || 29200;
      var stateTax = Math.max(0, stateTaxable - stDed) * (stRate / 100);
      var taxes = fedTax + stateTax;
      rows.push({age, rmd:Math.round(rmd), rc, qcd, taxable:Math.round(taxableInc), taxes:Math.round(taxes), effRate:gross>0?(taxes/gross*100).toFixed(1):0});
      // v12: Project IRA balance forward (withdraw RMD + conversions, grow remainder)
      projIra = Math.max(0, (projIra - rmd - rc - qcd) * (1 + grR * 0.7)); // blended growth
    }
    return rows;
  }, [inpWithAssets, iraTotal, er]);

  var ssTable = useMemo(function() {
    var fraMonthly = inpWithAssets.ssFRA || inpWithAssets.ssMonthly || 3445;
    return [62,64,66,67,68,70].map(function(age) {
      var factor = ssBenefitFactor(age);
      var monthly = Math.round(fraMonthly * factor);
      return {age, monthly, annual:monthly*12, pct:Math.round(factor*100), isCurrent:age===inpWithAssets.ssAge};
    });
  }, [inpWithAssets.ssAge, inpWithAssets.ssMonthly]);

  var rothWindow = useMemo(function() {
    var curYear = 2026;
    var rmdAge = 73;
    var rmdYear = curYear + (rmdAge - inpWithAssets.retirementAge);
    var status = resolveStatus(inpWithAssets);
    var deduction = STD_DED[status] || 29200;
    var top12 = status === 'married' ? 94300 : 47150;
    var top22 = status === 'married' ? 201050 : 100525;
    var irmaaSafe = status === 'married' ? 206000 : 103000;
    var convStartYear = 2027;
    var convStartAge = inpWithAssets.retirementAge + (convStartYear - curYear);
    var convYrs = Math.max(0, rmdYear - convStartYear);
    var annualExpenses = inpWithAssets.monthlyExpenses * 12;
    var years = [];
    for (var y = 0; y < convYrs; y++) {
      var age = convStartAge + y;
      var year = convStartYear + y;
      var inf = Math.pow(1 + (inpWithAssets.inflationRate || 3) / 100, y);
      var ssIncome = ssIncomeForYear(inpWithAssets, year);
      var pension = inpWithAssets.pensionMonthly * 12;
      var totalSSI = ssIncome;
      var ssTaxable = Math.min(totalSSI * 0.85, totalSSI);
      var totalIncome = totalSSI + pension;
      var expensesInflated = annualExpenses * inf;
      var hcInflated = (age < inpWithAssets.healthPhase1EndAge) ? inpWithAssets.healthPhase1Annual * Math.pow(1+inpWithAssets.healthInflation,y) : inpWithAssets.healthPhase2Annual * Math.pow(1+inpWithAssets.healthInflation,y);
      var totalExpenses = expensesInflated + hcInflated;
      var iraWithdrawal = Math.max(0, totalExpenses - totalIncome);
      var baseIncome = ssTaxable + pension + iraWithdrawal;
      var taxableBeforeConv = Math.max(0, baseIncome - deduction);
      var room12 = Math.max(0, top12 - taxableBeforeConv);
      var room22 = Math.max(0, top22 - taxableBeforeConv);
      var irmaaSafeConv = Math.max(0, irmaaSafe - baseIncome);
      var recommended = Math.min(room22, irmaaSafeConv);
      var rec12only = Math.min(room12, irmaaSafeConv);
      var scheduledConv = rothConvForYear(inpWithAssets, year);
      var magi = baseIncome + scheduledConv;
      var effectiveRate = scheduledConv <= room12 ? '12%' : scheduledConv <= room22 ? '22%' : '24%+';
      years.push({year, age, ssIncome:Math.round(totalSSI), iraWithdrawal:Math.round(iraWithdrawal), baseIncome:Math.round(baseIncome), room12:Math.round(room12), room22:Math.round(room22), irmaaSafeConv:Math.round(irmaaSafeConv), recommended:Math.round(recommended), scheduledConv:Math.round(scheduledConv), taxRate:effectiveRate, irmaaStatus:magi<=irmaaSafe?'Safe ✓':'IRMAA Hit ⚠️', magi:Math.round(magi)});
    }
    var totalRecommended = years.reduce(function(s,r){return s+r.recommended;},0);
    var totalScheduled = years.reduce(function(s,r){return s+(r.scheduledConv||0);},0);
    var headroom = Math.max(0, top12 - Math.max(0, (inpWithAssets.pensionMonthly*12)-deduction));
    return {years:convYrs, rmdYear, rmdAge, yearByYear:years, totalRecommended, totalScheduled, irmaaSafe, headroom, conservative:Math.min(headroom*0.5,25000), moderate:Math.min(headroom,50000), aggressive:Math.min(irmaaSafe,100000)};
  }, [inpWithAssets]);

  var ssCompData = useMemo(function() {
    var fraMonthly = inpWithAssets.ssFRA || inpWithAssets.ssMonthly || 3445;
    return [62,63,64,65,66,67,68,69,70].map(function(age) {
      var monthly = Math.round(fraMonthly * ssBenefitFactor(age));
      var annual = monthly * 12;
      var fra67Monthly = Math.round(fraMonthly);
      var fra67Annual = fra67Monthly * 12;
      var yearsCollecting = Math.max(0, inpWithAssets.lifeExpectancy - age);
      var lifetime = annual * yearsCollecting;
      var foregone = age < 67 ? 0 : fra67Annual * (age - 67);
      var gainPerYear = annual - fra67Annual;
      var breakeven = gainPerYear > 0 ? Math.round((67 + foregone / gainPerYear) * 10) / 10 : null;
      return {age, monthly, annual, lifetime:Math.round(lifetime), breakeven, isCurrent:age===inpWithAssets.ssAge, gainVs67:annual-fra67Annual};
    });
  }, [inpWithAssets.ssAge, inpWithAssets.ssMonthly, inpWithAssets.lifeExpectancy]);

  var projA = useMemo(function(){return projectForSsAge(inpWithAssets,er,ssCompareAge);},[inpWithAssets,er,ssCompareAge]);
  var proj70 = useMemo(function(){return projectForSsAge(inpWithAssets,er,70);},[inpWithAssets,er]);
  var projCurrent = useMemo(function(){return projectForSsAge(inpWithAssets,er,inpWithAssets.ssAge);},[inpWithAssets,er]);
  var projRothBridge = useMemo(function(){return projectRothBridge(inpWithAssets,er);},[inpWithAssets,er]);

  var cumSsChart = useMemo(function() {
    var fraMonthly = inpWithAssets.ssFRA || inpWithAssets.ssMonthly || 3445;
    var ages = [ssCompareAge, 70];
    if (inpWithAssets.ssAge !== ssCompareAge && inpWithAssets.ssAge !== 70) ages = [ssCompareAge, inpWithAssets.ssAge, 70];
    var data = [];
    for (var age = 60; age <= inpWithAssets.lifeExpectancy; age++) {
      var row = {age};
      ages.forEach(function(ca) { var annual=Math.round(fraMonthly*ssBenefitFactor(ca))*12; row['ss'+ca]=Math.max(0,annual*(age-ca)); });
      data.push(row);
    }
    return {data, ages};
  }, [inpWithAssets.ssAge, inpWithAssets.ssMonthly, inpWithAssets.lifeExpectancy, ssCompareAge]);

  var portCompChart = useMemo(function() {
    var map = {};
    projA.forEach(function(r){if(!map[r.age])map[r.age]={};map[r.age]['balA']=r.balance;});
    proj70.forEach(function(r){if(!map[r.age])map[r.age]={};map[r.age]['bal70']=r.balance;});
    if(inpWithAssets.ssAge!==ssCompareAge&&inpWithAssets.ssAge!==70){projCurrent.forEach(function(r){if(!map[r.age])map[r.age]={};map[r.age]['balCur']=r.balance;});}
    projRothBridge.forEach(function(r){if(!map[r.age])map[r.age]={};map[r.age]['balBridge']=r.balance;});
    return Object.keys(map).sort(function(a,b){return a-b;}).map(function(age){return Object.assign({age:parseInt(age)},map[age]);});
  },[projA,proj70,projCurrent,projRothBridge,inpWithAssets.ssAge,ssCompareAge]);

  var be6770 = useMemo(function() {
    var fraMonthly = inpWithAssets.ssFRA || inpWithAssets.ssMonthly || 3445;
    var ann67 = fraMonthly * ssBenefitFactor(67) * 12;
    var ann70 = fraMonthly * ssBenefitFactor(70) * 12;
    var foregone = ann67 * 3;
    var gainPerYear = ann70 - ann67;
    return gainPerYear > 0 ? Math.round((70 + foregone / gainPerYear) * 10) / 10 : null;
  }, [inpWithAssets.ssMonthly, inpWithAssets.ssAge]);

  // Static quick-scan insights (always visible)
  var insights = useMemo(function() {
    var list = [];
    var sr = parseFloat(successRate);
    if (sr < 75) list.push({type:'warning',title:'Low Success Rate',msg:successRate+'% - consider reducing expenses or increasing income.',icon:AlertCircle});
    else if (sr >= 90) list.push({type:'success',title:'Strong Plan',msg:successRate+'% success rate — excellent foundation.',icon:CheckCircle});
    if (inpWithAssets.capeRatio > 25) list.push({type:'warning',title:'Elevated Valuations',msg:'CAPE '+inpWithAssets.capeRatio+' — modeled stock return '+fmtPct(er.stock)+' (below historical avg).',icon:TrendingUp});
    if (rothWindow.years > 0) list.push({type:'info',title:'Roth Conversion Window',msg:rothWindow.years+' yrs before RMDs (age '+rothWindow.rmdAge+'). Convert up to '+fmtC(rothWindow.totalRecommended/Math.max(1,rothWindow.years))+'/yr staying under IRMAA threshold.',icon:Coins});
    if (inpWithAssets.ssAge < 70) list.push({type:'warning',title:'SS Delay Opportunity',msg:'Claiming at '+inpWithAssets.ssAge+' vs 70 costs ~'+fmtC((ssTable[ssTable.length-1].annual)-((ssTable.find(function(s){return s.isCurrent;})||ssTable[0]).annual))+'/yr for life.',icon:TrendingUp});
    var lastBal = cashFlow.length > 0 ? cashFlow[cashFlow.length-1].balance : 0;
    if (lastBal > totalPort * 1.5) list.push({type:'success',title:'Legacy Potential',msg:'Portfolio on track to end at '+fmtC(lastBal)+'. Consider estate strategies.',icon:FileText});
    if (unassigned.length > 0) list.push({type:'warning',title:unassigned.length+' Unassigned Assets',msg:'Some holdings are not assigned to a bucket. Visit Bucket Strategy to assign them.',icon:Layers});
    return list;
  }, [successRate, inpWithAssets, er, rothWindow, ssTable, cashFlow, totalPort, unassigned]);

  // ── Fetch deep AI insights via Anthropic API ─────────────────────────────────
  var fetchAiInsights = useCallback(function() {
    setAiLoading(true);
    setAiError(null);

    // Build a sanitized portfolio context snapshot
    var bucketSummary = bucketCfg.map(function(b) {
      var total = assets.filter(function(a){return a.bucket===b.id;}).reduce(function(s,a){return s+a.amount;},0);
      return b.label+' ('+b.sub+'): '+fmtFull(total);
    }).join(' | ');

    var holdingNotes = {'VTI':'total US market ETF','VXUS':'total international ETF','SCHD':'dividend growth ETF ~3.8% yield','VNQ':'REIT ETF ~3.8% yield','TIPS (Apr 2028)':'inflation-protected, matures 2028','TIPS (Jul 2031)':'inflation-protected, matures 2031','TIPS (Jul 2034)':'inflation-protected, matures 2034'};
    var topHoldings = assets.slice().sort(function(a,b){return b.amount-a.amount;}).slice(0,10)
      .map(function(a){var note=holdingNotes[a.name]?(' — '+holdingNotes[a.name]):''; return a.name+' '+fmtFull(a.amount)+' ['+a.type+', '+a.account+note+']';}).join('; ');

    var ssAlt = ssTable[ssTable.length-1];
    var ssCurrentRow = ssTable.find(function(s){return s.isCurrent;}) || ssTable[0];

    var prompt = [
      "TODAY IS "+new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})+". All recommendations must reference future dates only. Do not suggest actions for past dates.",
      'You are a fee-only retirement planning advisor. Analyze this client portfolio and give SPECIFIC, NUMBERED recommendations in 6 categories. Be direct and quantitative. Use actual numbers from the data. IMPORTANT CONTEXT: This portfolio has been recently simplified — the Fidelity-managed Stock Portfolio and Diversification Sleeve have been liquidated and proceeds reinvested into VTI and VXUS ETFs across IRA, Roth IRA, and Roth 401k accounts. The portfolio is a clean two-fund equity core (VTI=total US market, VXUS=international) plus SCHD (dividend income), VNQ (REIT income), and a TIPS ladder. Do NOT suggest further simplification or flag diversification as a concern — the portfolio is intentionally structured this way.',
      '',
      'CLIENT PROFILE:',
      '• Age: '+inpWithAssets.currentAge+', retiring '+inpWithAssets.retirementAge+', life expectancy '+inpWithAssets.lifeExpectancy,
      '• Filing status: '+inpWithAssets.filingStatus+', monthly expenses: '+fmtFull(inpWithAssets.monthlyExpenses),
      '• Total portfolio: '+fmtFull(totalPort)+' | Monte Carlo success rate: '+successRate+'%',
      '• Net monthly gap before SS (age 70, delayed): expenses $8,000/mo + healthcare, offset by SS $4,500/mo starting Nov 2029; Bucket 1 fully covers gap during 2027–2029 bridge',
      '• CAPE ratio: '+inpWithAssets.capeRatio+', 10yr Treasury: '+inpWithAssets.tenYrTreasury+'%, TIPS yield: '+inpWithAssets.tipsYield+'%',
      '',
      'PORTFOLIO BUCKETS:',
      '• Equity (B3 VTI+VXUS across IRA/Roth/401k): '+fmtFull(assets.filter(function(a){return a.bucket===3;}).reduce(function(s,a){return s+a.amount;},0)),
      '• Income/Fixed (B2 TIPS+SCHD+VNQ): '+fmtFull(assets.filter(function(a){return a.bucket===2;}).reduce(function(s,a){return s+a.amount;},0)),
      '• Cash (B1 Money Market+CDs+T-Bills): '+fmtFull(assets.filter(function(a){return a.bucket===1;}).reduce(function(s,a){return s+a.amount;},0)),
      bucketSummary,
      '',
      'TOP HOLDINGS:',
      topHoldings,
      '',
      'SOCIAL SECURITY:',
      '• Current plan: claim at age '+inpWithAssets.ssAge+' = '+fmtFull(Math.round((inpWithAssets.ssFRA||3445)*ssBenefitFactor(inpWithAssets.ssAge)))+'/mo (FRA PIA: '+fmtFull(inpWithAssets.ssFRA||3445)+'/mo)',
      '• Delay to 70 = '+fmtFull(ssAlt.monthly)+'/mo (+'+fmtFull(ssAlt.monthly - ssCurrentRow.monthly)+'/mo)',
      '• Breakeven age for delay to 70: '+(ssAlt.breakeven||'N/A'),
      '• SS COLA: '+inpWithAssets.ssCola+'%/yr (separate from general inflation)',
      inpWithAssets.hasSpouse?'• Spouse Stacey (age '+(inpWithAssets.spouseCurrentAge||63)+') SS: '+(inpWithAssets.staceySS63?'Claiming at 63 = $1,472/mo net':'Waiting to 67 = $1,879/mo net')+' (after garnishment)':'',
      inpWithAssets.survivorMode?'• ⚠️ SURVIVOR MODE ACTIVE: Single filing, one SS benefit only':'',
      '',
      'ROTH CONVERSION:',
      '• Window: '+rothWindow.years+' years before RMDs (until age '+rothWindow.rmdAge+')',
      '• Scheduled plan: $100K/yr in 2027–2029, $50K/yr in 2030–2031',
      '• Total scheduled: '+fmtFull(rothWindow.totalScheduled)+' over 5 years',
      '• Conversions sourced from GROWTH assets first (maximize Roth compounding)',
      '• IRMAA-safe threshold: '+fmtFull(rothWindow.irmaaSafe)+' MAGI',
      '• Maximum conversion room (IRMAA-capped): '+fmtFull(rothWindow.totalRecommended),
      '• PORTFOLIO ALLOCATION (correct figures — do NOT say 50/30/20):',
      '  ~50% pure equity (VTI+VXUS), ~15% income ETFs (SCHD+VNQ), ~35% fixed income (TIPS+CDs+T-Bills+cash)',
      '',
      'TAX:',
      '• QCDs starting age '+inpWithAssets.qcdStartAge+': '+fmtFull(inpWithAssets.qcdAmount)+'/yr (sourced from IRA)',
      '• Federal marginal rate: '+(marginalRate(inpWithAssets.monthlyExpenses*12, resolveStatus(inpWithAssets))*100).toFixed(0)+'%',
      '• Arizona state tax: '+(inpWithAssets.stateTaxRate||2.5)+'% flat (no state SS tax)',
      '• Filing status: '+(inpWithAssets.survivorMode?'SINGLE (survivor mode)':inpWithAssets.filingStatus==='married'?'MFJ':'Single'),
      '',
      'RESPOND IN THIS EXACT FORMAT — use "##" before each category heading:',
      '## Portfolio Mix',
      '[2-3 specific sentences about asset allocation, diversification, concentration risk, or rebalancing]',
      '',
      '## Bucket Strategy',
      '[2-3 specific sentences about bucket sizing, refill strategy, SORR protection, or sequencing]',
      '',
      '## Social Security',
      '[2-3 specific sentences with actual $ amounts and breakeven analysis for this client]',
      '',
      '## Roth Conversions',
      '[2-3 specific sentences with optimal annual conversion amounts, tax bracket considerations, IRMAA guardrails]',
      '',
      '## Tax Optimization',
      '[2-3 specific sentences about QCDs, RMDs, bracket management, or tax-loss harvesting opportunities]',
      '',
      '## Key Risks & Action Items',
      '[2-3 specific action items ranked by priority with timeframes]'
    ].filter(Boolean).join('\n');

    fetch('http://localhost:3101/v1/messages', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{role:'user', content: prompt}]
      })
    })
    .then(function(r){return r.json();})
    .then(function(data) {
      var text = (data.content || []).filter(function(b){return b.type==='text';}).map(function(b){return b.text;}).join('');
      if (!text) throw new Error(data.error ? data.error.message : 'Empty response');
      // Parse sections by splitting on ## headers
      var sections = [];
      var iconMap = {'Portfolio Mix':TrendingUp,'Bucket Strategy':Layers,'Social Security':Coins,'Roth Conversions':Zap,'Tax Optimization':DollarSign,'Key Risks & Action Items':AlertCircle};
      var typeMap = {'Portfolio Mix':'info','Bucket Strategy':'success','Social Security':'warning','Roth Conversions':'info','Tax Optimization':'success','Key Risks & Action Items':'warning'};
      var parts = text.split('##').filter(function(p){return p.trim().length > 0;});
      parts.forEach(function(part) {
        var lines = part.trim().split('\n');
        var title = lines[0].trim();
        var body = lines.slice(1).join('\n').trim();
        if (title && body) {
          sections.push({title:title, msg:body, icon:iconMap[title]||Activity, type:typeMap[title]||'info'});
        }
      });
      setAiInsights(sections.length > 0 ? sections : [{title:'AI Analysis',msg:text,icon:Activity,type:'info'}]);
      setAiLoading(false);
    })
    .catch(function(err) {
      setAiError('Could not fetch AI insights: '+err.message);
      setAiLoading(false);
    });
  }, [inpWithAssets, assets, bucketCfg, totalPort, successRate, rothWindow, ssTable, dynTaxRate, er]);

  var successColor = parseFloat(successRate) >= 90 ? '#10b981' : parseFloat(successRate) >= 75 ? '#f59e0b' : '#ef4444';

  function TTip(props) {
    if (!props.active || !props.payload || !props.payload.length) return null;
    return React.createElement('div', {style:{background:SURFACE,border:'1px solid '+BORDER,borderRadius:8,padding:'10px 14px'}},
      React.createElement('p', {style:{color:TXT3,marginBottom:4,fontSize:11}}, props.label),
      props.payload.map(function(p,i){return React.createElement('p',{key:i,style:{color:p.color,margin:'2px 0',fontSize:12}},p.name+': '+(typeof p.value==='number'?fmtC(p.value):p.value));})
    );
  }

  var TABS = [
    {id:'summary',name:'AI Summary',Icon:Activity},
    {id:'incometax',name:'Income & Tax',Icon:DollarSign},
    {id:'spending',name:'Spending',Icon:Target},
    {id:'assets',name:'Current Assets',Icon:Grid},
    {id:'buckets',name:'Bucket Strategy',Icon:Layers},
    {id:'cashflow',name:'Cash Flow',Icon:TrendingUp},
    {id:'monte',name:'Monte Carlo',Icon:BarChart3},
    {id:'roth',name:'Roth Conversions',Icon:Zap},
    {id:'ss',name:'SS Strategy',Icon:Coins},
    {id:'legacy',name:'Legacy & Estate',Icon:Heart},
    {id:'settings',name:'Settings',Icon:Settings}
  ];

  var SS_COLORS = ['#f87171','#fbbf24','#fb923c','#34d399','#60a5fa','#a78bfa','#e879f9','#22d3ee','#10b981'];

  var INP_STYLE = {width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:7,padding:'8px 11px',color:TXT1,fontSize:12,boxSizing:'border-box'};
  var SEL_STYLE = Object.assign({},INP_STYLE,{cursor:'pointer'});

  // ── Asset Editor Modal (inline JSX — not a function, prevents focus loss) ───
  var assetEditorJSX = !editAsset ? null : (function() {
    var a = editAsset;
    var upd = function(k,v) { setEditAsset(function(p){return Object.assign({},p,{[k]:v});}); };
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:16,padding:28,width:'100%',maxWidth:540}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontFamily:PF,fontSize:18,color:TXT1,margin:0,fontWeight:600}}>{editAssetIsNew ? 'Add New Holding' : 'Edit Holding'}</h3>
            <button onClick={function(){setEditAsset(null);}} style={{background:'none',border:'none',cursor:'pointer',color:TXT2}}><X size={18}/></button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Holding Name</label>
              <input value={a.name} onChange={function(e){upd('name',e.target.value);}} placeholder="e.g. SCHD, CD Aug 2026" style={INP_STYLE} />
            </div>
            <div>
              <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Amount ($)</label>
              <input type="number" value={a.amount} onChange={function(e){upd('amount',e.target.value);}} style={INP_STYLE} />
            </div>
            <div>
              <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Account</label>
              <select value={a.account} onChange={function(e){upd('account',e.target.value);}} style={SEL_STYLE}>
                {ACCOUNT_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Asset Type</label>
              <select value={a.type} onChange={function(e){upd('type',e.target.value);}} style={SEL_STYLE}>
                {ASSET_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Risk Level</label>
              <select value={a.risk} onChange={function(e){upd('risk',e.target.value);}} style={SEL_STYLE}>
                {RISK_LEVELS.map(function(t){return <option key={t} value={t}>{t}</option>;})}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Maturity / Horizon</label>
              <input value={a.maturity} onChange={function(e){upd('maturity',e.target.value);}} placeholder="e.g. Aug 2026, Ongoing" style={INP_STYLE} />
            </div>
            <div>
              <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Yield / Return</label>
              <input value={a.yld} onChange={function(e){upd('yld',e.target.value);}} placeholder="e.g. ~4.5%, Real +1.8%" style={INP_STYLE} />
            </div>
            <div>
              <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Assign to Bucket</label>
              <select value={a.bucket || ''} onChange={function(e){upd('bucket',e.target.value?parseInt(e.target.value):null);}} style={SEL_STYLE}>
                <option value="">— Unassigned —</option>
                {bucketCfg.map(function(b){return <option key={b.id} value={b.id}>{b.label} ({b.sub})</option>;})}
              </select>
            </div>
          </div>
          <div style={{background:'rgba(96,165,250,.08)',border:'1px solid rgba(96,165,250,.2)',borderRadius:8,padding:'10px 12px',marginBottom:16,fontSize:11,color:TXT3,lineHeight:1.6}}>
            <strong style={{color:'#60a5fa'}}>Auto-classification:</strong> The asset type determines which sub-bucket return rate is used in projections. Cash/CD/T-Bill → cash rate. TIPS/Bond/I-Bond → inflation-protected rate. Dividend/REIT ETF → dividend rate. Equity → growth rate. Roth accounts always use the Roth growth rate.
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={saveAsset} style={{flex:1,background:'#059669',border:'none',borderRadius:8,padding:'11px',color:'white',cursor:'pointer',fontSize:13,fontWeight:600}}>{editAssetIsNew?'Add Holding':'Save Changes'}</button>
            <button onClick={function(){setEditAsset(null);}} style={{background:SURFACE2,border:'1px solid '+BORDER,borderRadius:8,padding:'11px 18px',color:TXT2,cursor:'pointer',fontSize:13}}>Cancel</button>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div style={{fontFamily:SS_FONT,background:BG,minHeight:'100vh',padding:24,color:TXT1,fontWeight:600}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600&display=swap');
        .rt:hover{background:#f0fdf4!important;color:#059669!important}
        .rr:hover{background:#f8fafc!important}
        .rc{transition:transform .15s,box-shadow .15s}
        .rc:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,.12)!important}
        .ri:focus{outline:none;border-color:#059669!important;box-shadow:0 0 0 2px rgba(5,150,105,.12)!important}
        .abtn:hover{background:#d1fae5!important}
        .ebtn:hover{background:#dbeafe!important}
        .mbtn:hover{background:#ede9fe!important}
        .dbtn:hover{background:#fee2e2!important}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:#94a3b8}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {assetEditorJSX}

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#059669 0%,#047857 100%)',borderRadius:16,padding:'20px 28px',marginBottom:16,border:'1px solid rgba(5,150,105,.2)',boxShadow:'0 4px 24px rgba(5,150,105,.25)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:48,height:48,background:'rgba(16,185,129,.2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(16,185,129,.4)'}}>
              <TrendingUp size={26} color="#10b981" />
            </div>
            <div>
              <h1 style={{fontFamily:PF,fontSize:24,fontWeight:700,color:'#ecfdf5',margin:0}}>RetireStrong</h1>
              <p style={{fontFamily:SS_FONT,fontSize:12,color:'#6ee7b7',margin:0,letterSpacing:2,textTransform:'uppercase'}}>RetireStrong Pro v1.0 · {activeScen}</p>
            </div>
          </div>
          <div style={{display:'flex',gap:22,alignItems:'center',flexWrap:'wrap'}}>
            {[['Success',successRate+'%',successColor],['Portfolio',fmtC(totalPort),'#e2e8f0'],['Holdings',assets.length+'','#60a5fa'],['Tax Rate',(dynTaxRate*100).toFixed(0)+'%','#fbbf24']].map(function(item){
              return (
                <div key={item[0]} style={{textAlign:'center'}}>
                  <div style={{fontFamily:PF,fontSize:22,fontWeight:700,color:item[2],lineHeight:1}}>{item[1]}</div>
                  <div style={{fontFamily:SS_FONT,fontSize:11,color:'#94a3b8',letterSpacing:1.5,textTransform:'uppercase',marginTop:3}}>{item[0]}</div>
                </div>
              );
            })}
            <button onClick={function(){setShowModal(true);}} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(16,185,129,.2)',border:'1px solid rgba(16,185,129,.4)',borderRadius:8,padding:'8px 14px',color:'#34d399',cursor:'pointer',fontSize:12,fontWeight:600}}>
              <Save size={13}/> Save
            </button>
          </div>
        </div>
      </div>

      {/* Save Scenario Modal */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:14,padding:28,width:360}}>
            <h3 style={{fontFamily:PF,fontSize:18,color:'#000000',marginBottom:16,fontWeight:800}}>Save Scenario</h3>
            <input className="ri" value={scenName} onChange={function(e){setScenName(e.target.value);}} placeholder="e.g. SS at 70, Conservative"
              style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:8,padding:'10px 13px',color:TXT1,fontSize:13,boxSizing:'border-box',marginBottom:16}} />
            <div style={{fontSize:11,color:TXT2,marginBottom:16}}>Saves all settings, holdings, and bucket assignments.</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={saveScen} style={{flex:1,background:'#059669',border:'none',borderRadius:8,padding:'10px',color:'white',cursor:'pointer',fontSize:13,fontWeight:600}}>Save</button>
              <button onClick={function(){setShowModal(false);}} style={{flex:1,background:SURFACE2,border:'1px solid '+BORDER,borderRadius:8,padding:'10px',color:TXT2,cursor:'pointer',fontSize:13}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{background:SURFACE,borderRadius:12,marginBottom:16,border:'1px solid '+BORDER,overflow:'hidden'}}>
        <div style={{display:'flex',overflowX:'auto'}}>
          {TABS.map(function(tab){
            var active = activeTab === tab.id;
            return (
              <button key={tab.id} className="rt" onClick={function(){setActiveTab(tab.id);}}
                style={{display:'flex',alignItems:'center',gap:6,padding:'11px 15px',whiteSpace:'nowrap',border:'none',cursor:'pointer',fontSize:11,fontWeight:600,letterSpacing:0.4,background:active?'#f0fdf4':'transparent',color:active?'#059669':'#64748b',borderBottom:active?'2px solid #059669':'2px solid transparent',transition:'all .2s'}}>
                <tab.Icon size={12}/>{tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{background:SURFACE,borderRadius:16,padding:28,border:'1px solid '+BORDER,boxShadow:SHADOW}}>

        {/* ── SUMMARY TAB ─────────────────────────────────────────────────────── */}

        {activeTab === 'summary' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
              <div>
                <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>AI-Powered Insights</h2>
                <p style={{fontSize:12,color:TXT2,margin:0}}>Quick-scan alerts always visible · click below for deep personalized analysis</p>
              </div>
              <button onClick={fetchAiInsights} disabled={aiLoading}
                style={{display:'flex',alignItems:'center',gap:8,background:aiLoading?SURFACE2:'#059669',border:'1px solid '+(aiLoading?BORDER:'#059669'),borderRadius:10,padding:'10px 18px',color:aiLoading?TXT3:'white',cursor:aiLoading?'default':'pointer',fontSize:13,fontWeight:600,transition:'all .2s',boxShadow:aiLoading?'none':'0 2px 8px rgba(5,150,105,.3)'}}>
                {aiLoading ? React.createElement(React.Fragment,null,React.createElement(Loader,{size:14,style:{animation:'spin 1s linear infinite'}}), ' Analyzing…') : React.createElement(React.Fragment,null,React.createElement(Sparkles,{size:14}), ' ', aiInsights ? 'Refresh AI Insights' : 'Get AI Insights')}
              </button>
            </div>

            {aiError && (
              <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:12,padding:'14px 18px',marginBottom:16,fontSize:13,color:'#dc2626'}}>{aiError}</div>
            )}

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:13,marginBottom:22}}>
              {insights.map(function(ins,i){
                var c = ins.type==='warning'?['rgba(245,158,11,.08)','rgba(245,158,11,.25)','#d97706']:ins.type==='success'?['rgba(16,185,129,.08)','rgba(16,185,129,.25)','#059669']:['rgba(59,130,246,.08)','rgba(59,130,246,.25)','#2563eb'];
                return (
                  <div key={i} className="rc" style={{background:c[0],border:'1px solid '+c[1],borderRadius:12,padding:16}}>
                    <div style={{display:'flex',gap:11}}>
                      <ins.icon size={16} style={{color:c[2],flexShrink:0,marginTop:2}}/>
                      <div>
                        <h3 style={{fontFamily:PF,fontSize:13,color:c[2],margin:'0 0 4px',fontWeight:600}}>{ins.title}</h3>
                        <p style={{fontSize:12,color:TXT2,margin:0,lineHeight:1.6}}>{ins.msg}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!aiInsights && !aiLoading && (
              <div style={{background:SURFACE2,border:'1px solid '+BORDER,borderRadius:12,padding:'20px 24px',marginBottom:22,textAlign:'center'}}>
                <div style={{marginBottom:8}}><Sparkles size={22} style={{color:'#059669'}}/></div>
                <p style={{fontSize:13,color:TXT2,margin:'0 0 4px',fontWeight:600}}>Get personalized recommendations for your exact portfolio</p>
                <p style={{fontSize:12,color:TXT3,margin:0}}>Covers portfolio mix, bucket sizing, Social Security timing, Roth conversion amounts, and tax optimization — all specific to your numbers.</p>
              </div>
            )}

            {aiInsights && (
              <div style={{marginBottom:22}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  <Sparkles size={15} style={{color:'#059669'}}/>
                  <h3 style={{fontFamily:PF,fontSize:15,color:TXT1,margin:0,fontWeight:600}}>Personalized AI Analysis</h3>
                  <span style={{fontSize:12,color:TXT3,marginLeft:4,background:ACCENT2,borderRadius:4,padding:'2px 7px',color:'#059669'}}>Based on your actual holdings</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
                  {aiInsights.map(function(ins,i){
                    var c = ins.type==='warning'?['rgba(245,158,11,.08)','rgba(245,158,11,.25)','#d97706']:ins.type==='success'?['rgba(16,185,129,.08)','rgba(16,185,129,.25)','#059669']:['rgba(59,130,246,.08)','rgba(59,130,246,.25)','#2563eb'];
                    var Icon = ins.icon || Activity;
                    return (
                      <div key={i} className="rc" style={{background:c[0],border:'1px solid '+c[1],borderRadius:12,padding:'16px 18px'}}>
                        <div style={{display:'flex',gap:10,marginBottom:8}}>
                          <Icon size={15} style={{color:c[2],flexShrink:0,marginTop:2}}/>
                          <h4 style={{fontFamily:PF,fontSize:13,color:c[2],margin:0,fontWeight:700}}>{ins.title}</h4>
                        </div>
                        <p style={{fontSize:12,color:TXT2,margin:0,lineHeight:1.7,whiteSpace:'pre-line'}}>{ins.msg}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              {[['Portfolio',fmtC(totalPort),'#10b981','rgba(16,185,129,.1)'],['Annual Expenses',fmtC(inpWithAssets.monthlyExpenses*12),'#f59e0b','rgba(245,158,11,.1)'],['Plan Horizon',(inpWithAssets.lifeExpectancy-inpWithAssets.currentAge)+' yrs','#818cf8','rgba(129,140,248,.1)'],['CAPE Return',fmtPct(er.stock),'#60a5fa','rgba(96,165,250,.1)']].map(function(item){
                return (
                  <div key={item[0]} className="rc" style={{background:item[3],border:'1px solid '+item[2]+'30',borderRadius:11,padding:16,textAlign:'center'}}>
                    <div style={{fontFamily:PF,fontSize:22,color:item[2],fontWeight:700}}>{item[1]}</div>
                    <div style={{fontSize:11,color:TXT2,letterSpacing:1.2,textTransform:'uppercase',marginTop:4}}>{item[0]}</div>
                  </div>
                );
              })}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={CARD}>
                <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:14,fontWeight:600}}>Market Fundamentals</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:14}}>
                  {[['CAPE',inpWithAssets.capeRatio],['10Y Treasury',inpWithAssets.tenYrTreasury+'%'],['TIPS Yield',inpWithAssets.tipsYield+'%']].map(function(item){
                    return <div key={item[0]} style={{textAlign:'center'}}><div style={{fontFamily:PF,fontSize:18,color:TXT1,fontWeight:600}}>{item[1]}</div><div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
                  })}
                </div>
                <div style={{borderTop:'1px solid '+BORDER,paddingTop:12,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                  {[['Stocks',fmtPct(er.stock),'#34d399'],['Bonds',fmtPct(er.bond),'#60a5fa'],['Inflation',fmtPct(er.inflation),'#fbbf24']].map(function(item){
                    return <div key={item[0]} style={{textAlign:'center',background:item[2]+'15',borderRadius:7,padding:'8px 4px'}}><div style={{fontFamily:PF,fontSize:16,color:item[2],fontWeight:700}}>{item[1]}</div><div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
                  })}
                </div>
              </div>
              <div style={CARD}>
                <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:14,fontWeight:600}}>Dynamic Tax Profile</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  {[['Marginal Rate',(dynTaxRate*100).toFixed(0)+'%','#fbbf24'],['Filing Status',inpWithAssets.filingStatus==='married'?'MFJ':'Single','#60a5fa'],['IRA Balance',fmtC(iraTotal),'#f87171'],['Roth Balance',fmtC(derivedTotals.roth),'#a78bfa']].map(function(item){
                    return <div key={item[0]} style={{background:item[2]+'15',borderRadius:7,padding:'9px 11px'}}><div style={{fontFamily:PF,fontSize:16,color:item[2],fontWeight:700}}>{item[1]}</div><div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
                  })}
                </div>
                <div style={{background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',borderRadius:8,padding:'9px 12px'}}>
                  <div style={{fontSize:11,color:'#a78bfa',fontWeight:600}}>Roth Window: {rothWindow.years} yrs to RMD (age {rothWindow.rmdAge})</div>
                  <div style={{fontSize:11,color:TXT2,marginTop:3}}>Convert ~{fmtC(Math.round(rothWindow.totalRecommended/Math.max(1,rothWindow.years)))}/yr, IRMAA-safe under ${(rothWindow.irmaaSafe).toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div style={{background:'rgba(251,146,60,.07)',border:'1px solid rgba(251,146,60,.25)',borderRadius:12,padding:16,marginTop:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{fontSize:12,color:'#fb923c',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>Healthcare Costs Included</div>
                  <div style={{display:'flex',gap:18,flexWrap:'wrap'}}>
                    <div><span style={{fontSize:12,color:TXT1,fontWeight:600}}>Phase 1: </span><span style={{fontSize:12,color:'#fb923c',fontWeight:700}}>{fmtC(inpWithAssets.healthPhase1Annual)}/yr</span><span style={{fontSize:11,color:TXT2}}> through age {inpWithAssets.healthPhase1EndAge}</span></div>
                    <div><span style={{fontSize:12,color:TXT1,fontWeight:600}}>Phase 2: </span><span style={{fontSize:12,color:'#fb923c',fontWeight:700}}>{fmtC(inpWithAssets.healthPhase2Annual)}/yr</span><span style={{fontSize:11,color:TXT2}}> inflating {(inpWithAssets.healthInflation*100).toFixed(0)}%/yr</span></div>
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:PF,fontSize:20,color:'#fb923c',fontWeight:700}}>{fmtC(cashFlow.reduce(function(s,r){return s+(r.healthcare||0);},0))}</div>
                  <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>Lifetime HC total</div>
                </div>
              </div>
            </div>

            {/* v11 New Features callout */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:14}}>
              <button onClick={function(){setActiveTab('withdrawal');}} style={{background:'linear-gradient(135deg,rgba(45,212,191,.08),rgba(96,165,250,.08))',border:'1px solid rgba(45,212,191,.3)',borderRadius:12,padding:'14px 18px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:36,height:36,borderRadius:8,background:'rgba(45,212,191,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <ArrowDownUp size={18} color="#2dd4bf"/>
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <span style={{fontSize:13,color:'#2dd4bf',fontWeight:700}}>Withdrawal Plan</span>
                    <span style={{background:'#2dd4bf',color:'white',borderRadius:3,padding:'1px 5px',fontSize:12,fontWeight:700}}>v11</span>
                  </div>
                  <div style={{fontSize:11,color:TXT3}}>Year-by-year sequencing roadmap + expense breakdown sliders</div>
                </div>
              </button>
              <button onClick={function(){setActiveTab('legacy');}} style={{background:'linear-gradient(135deg,rgba(167,139,250,.08),rgba(248,113,113,.06))',border:'1px solid rgba(167,139,250,.3)',borderRadius:12,padding:'14px 18px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:36,height:36,borderRadius:8,background:'rgba(167,139,250,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Heart size={18} color="#a78bfa"/>
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <span style={{fontSize:13,color:'#a78bfa',fontWeight:700}}>Legacy & Estate</span>
                    <span style={{background:'#a78bfa',color:'white',borderRadius:3,padding:'1px 5px',fontSize:12,fontWeight:700}}>v11</span>
                  </div>
                  <div style={{fontSize:11,color:TXT3}}>Estate projections, legacy goal tracker, Roth inheritance advantage</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── INCOME & TAX TAB ────────────────────────────────────────────── */}
        {activeTab === 'incometax' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Income & Tax Tracker</h2>
                <p style={{fontSize:12,color:TXT2,margin:0}}>Track income sources · Monitor tax bracket · Conversion headroom</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <label style={{fontSize:11,color:TXT2,fontWeight:600}}>Year:</label>
                <select value={inp.trackingYear||2026} onChange={function(e){setField('trackingYear',e.target.value);}}
                  style={{background:SURFACE2,border:'1px solid '+BORDER,borderRadius:7,padding:'7px 12px',color:TXT1,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  {Array.from({length:15},function(_,i){return 2026+i;}).map(function(yr){return <option key={yr} value={yr}>{yr}</option>;})}
                </select>
              </div>
            </div>

            {(function(){
              var tYear = inp.trackingYear || 2026;
              var is2026 = tYear === 2026;
              // Income inputs for selected year
              var incFields = is2026 ? [
                {label:'W-2 Income (Jan-Apr)',key:'incW2',color:'#34d399'},
                {label:'Severance (Gross Taxable)',key:'incSeverance',color:'#60a5fa'},
                {label:'Taxable Interest/Dividends',key:'incDividends',color:'#2dd4bf'},
                {label:'IRA Distributions',key:'incIRA',color:'#f97316'},
                {label:'Roth Conversions',key:'incRothConv',color:'#a78bfa'},
                {label:'Other Taxable Income',key:'incOther',color:'#fbbf24'},
              ] : [
                {label:'IRA Distributions',key:'incIRA',color:'#f97316'},
                {label:'Roth Conversions',key:'incRothConv',color:'#a78bfa'},
                {label:'Taxable Interest/Dividends',key:'incDividends',color:'#2dd4bf'},
                {label:'Other Taxable Income',key:'incOther',color:'#fbbf24'},
              ];

              var totalIncome = incFields.reduce(function(s,f){return s + (parseFloat(thisYear[f.key]) || 0);}, 0);
              var scottSS = scottSSForYear(inpWithAssets, tYear);
              var staceySS = staceySSForYear(inpWithAssets, tYear);
              var ssTaxable = (scottSS + staceySS) * 0.85;
              var grossTaxable = totalIncome + ssTaxable;
              var stdDed = 29200; // MFJ
              var taxableInc = Math.max(0, grossTaxable - stdDed);

              // Bracket boundaries (MFJ)
              var brackets = [
                {name:'10%',top:23200,color:'#34d399'},
                {name:'12%',top:94300,color:'#60a5fa'},
                {name:'22%',top:201050,color:'#fbbf24'},
                {name:'24%',top:383900,color:'#f97316'},
              ];

              var currentBracket = '10%';
              for (var bi = brackets.length-1; bi >= 0; bi--) {
                if (taxableInc > (bi > 0 ? brackets[bi-1].top : 0)) { currentBracket = brackets[bi].name; break; }
              }

              var room12 = Math.max(0, 94300 - taxableInc);
              var room22 = Math.max(0, 201050 - taxableInc);
              var irmaaSafe = Math.max(0, 212000 - grossTaxable);
              var safeConv = Math.min(room22, irmaaSafe);

              var estFedTax = effectiveTax(grossTaxable, 'married');
              var estStateTax = Math.max(0, (totalIncome - stdDed)) * 0.025;

              return (
                <div>
                  {/* Income entry */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:16}}>
                    {incFields.map(function(f){
                      return (
                        <div key={f.key} style={{background:f.color+'10',border:'1px solid '+f.color+'25',borderRadius:10,padding:12}}>
                          <label style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:5}}>{f.label}</label>
                          <input type="number" step={500} value={thisYear[f.key]||''} placeholder="0"
                            onChange={function(e){updateThisYear(f.key, e.target.value);}}
                            style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:6,padding:'7px 10px',color:f.color,fontSize:15,fontFamily:PF,fontWeight:700,boxSizing:'border-box'}}/>
                        </div>
                      );
                    })}
                    {(scottSS > 0 || staceySS > 0) && (
                      <div style={{background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.2)',borderRadius:10,padding:12}}>
                        <label style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:5}}>Social Security (auto)</label>
                        <div style={{fontSize:15,fontFamily:PF,fontWeight:700,color:'#34d399',padding:'7px 0'}}>{fmtFull(Math.round(scottSS + staceySS))}</div>
                        <div style={{fontSize:11,color:TXT3}}>Scott: {fmtC(scottSS)} · Stacey: {fmtC(staceySS)}</div>
                      </div>
                    )}
                  </div>

                  {/* Tax Bracket Progress Bar */}
                  <div style={{...CARD,marginBottom:16}}>
                    <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Tax Bracket Position — {tYear}</h3>
                    <p style={{fontSize:11,color:TXT2,marginBottom:14}}>Taxable income after ${stdDed.toLocaleString()} standard deduction: <strong style={{color:TXT1}}>{fmtFull(Math.round(taxableInc))}</strong> · Current bracket: <strong style={{color:currentBracket==='12%'?'#60a5fa':'#fbbf24'}}>{currentBracket}</strong></p>
                    <div style={{position:'relative',height:36,background:SURFACE2,borderRadius:8,overflow:'hidden',marginBottom:8}}>
                      {brackets.map(function(b,bi){
                        var prevTop = bi > 0 ? brackets[bi-1].top : 0;
                        var maxVis = 250000;
                        var left = (prevTop / maxVis) * 100;
                        var width = ((b.top - prevTop) / maxVis) * 100;
                        return <div key={b.name} style={{position:'absolute',left:left+'%',width:Math.min(width, 100-left)+'%',height:'100%',background:b.color+'20',borderRight:'2px solid '+b.color+'60'}} title={b.name+' bracket: up to $'+b.top.toLocaleString()}/>;
                      })}
                      <div style={{position:'absolute',left:Math.min((taxableInc/250000)*100,100)+'%',top:0,height:'100%',width:3,background:'#f87171',borderRadius:2,zIndex:10}}/>
                      <div style={{position:'absolute',left:Math.min((taxableInc/250000)*100,100)+'%',top:-2,transform:'translateX(-50%)',background:'#f87171',color:'white',borderRadius:4,padding:'1px 6px',fontSize:11,fontWeight:700,zIndex:11,whiteSpace:'nowrap'}}>{fmtC(taxableInc)}</div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:TXT3}}>
                      {brackets.map(function(b){return <span key={b.name} style={{color:b.color,fontWeight:600}}>{b.name}: ${(b.top/1000).toFixed(0)}K</span>;})}
                    </div>
                  </div>

                  {/* Headroom + Tax Summary side by side */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                    <div style={{...CARD}}>
                      <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:12,fontWeight:600}}>Conversion / Pull Headroom</h3>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <div style={{background:'rgba(96,165,250,.08)',borderRadius:8,padding:12,textAlign:'center'}}>
                          <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Stay in 12%</div>
                          <div style={{fontFamily:PF,fontSize:20,color:'#60a5fa',fontWeight:700}}>{fmtC(Math.round(room12))}</div>
                        </div>
                        <div style={{background:'rgba(251,191,36,.08)',borderRadius:8,padding:12,textAlign:'center'}}>
                          <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Stay in 22%</div>
                          <div style={{fontFamily:PF,fontSize:20,color:'#fbbf24',fontWeight:700}}>{fmtC(Math.round(room22))}</div>
                        </div>
                        <div style={{background:'rgba(248,113,113,.08)',borderRadius:8,padding:12,textAlign:'center'}}>
                          <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>IRMAA-Safe Room</div>
                          <div style={{fontFamily:PF,fontSize:20,color:irmaaSafe>0?'#34d399':'#f87171',fontWeight:700}}>{fmtC(Math.round(irmaaSafe))}</div>
                        </div>
                        <div style={{background:safeConv>5000?'rgba(52,211,153,.08)':'rgba(248,113,113,.08)',borderRadius:8,padding:12,textAlign:'center'}}>
                          <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Safe to Pull/Convert</div>
                          <div style={{fontFamily:PF,fontSize:20,color:safeConv>5000?'#10b981':'#f87171',fontWeight:700}}>{safeConv>5000?fmtC(Math.round(safeConv)):'$0'}</div>
                        </div>
                      </div>
                      <div style={{marginTop:12,fontSize:11,color:TXT2,lineHeight:1.7}}>
                        {safeConv > 50000 ? 'Room for a meaningful Roth conversion or IRA pull this year.' :
                         safeConv > 5000 ? 'Limited headroom — small conversion possible, watch IRMAA.' :
                         'No conversion room — income already fills the bracket. Pull from Roth or taxable only.'}
                      </div>
                    </div>
                    <div style={{...CARD}}>
                      <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:12,fontWeight:600}}>Estimated Tax — {tYear}</h3>
                      {[
                        ['Gross Taxable Income',fmtFull(Math.round(grossTaxable)),'#34d399'],
                        ['Standard Deduction','-'+fmtFull(stdDed),'#60a5fa'],
                        ['Taxable Income',fmtFull(Math.round(taxableInc)),TXT1],
                        ['Est Federal Tax',fmtFull(Math.round(estFedTax)),'#f87171'],
                        ['Est AZ State Tax',fmtFull(Math.round(estStateTax)),'#fb923c'],
                        ['Total Estimated Tax',fmtFull(Math.round(estFedTax+estStateTax)),'#fbbf24'],
                      ].map(function(r){return(
                        <div key={r[0]} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid '+BORDER}}>
                          <span style={{fontSize:11,color:TXT2}}>{r[0]}</span>
                          <span style={{fontSize:12,color:r[2],fontWeight:700}}>{r[1]}</span>
                        </div>
                      );})}
                      <div style={{marginTop:10,background:'rgba(251,191,36,.06)',borderRadius:6,padding:'8px 10px',fontSize:12,color:TXT3}}>
                        <strong style={{color:'#fbbf24'}}>IRMAA:</strong> {tYear} income affects {tYear+2} Medicare premiums. MAGI: {fmtFull(Math.round(grossTaxable))} {grossTaxable > 212000 ? '⚠️ Over $212K threshold' : '✓ Under $212K'}
                      </div>
                    </div>
                  </div>

                  {/* Withholding Tracker + Estimated Payment Need */}
                  {(function(){
                    var fedW = parseFloat(thisYear.fedWithheld) || 0;
                    var stW = parseFloat(thisYear.stateWithheld) || 0;
                    var totalWithheld = fedW + stW;
                    var totalEstTax = Math.round(estFedTax + estStateTax);
                    var fedGap = Math.round(estFedTax) - fedW;
                    var stGap = Math.round(estStateTax) - stW;
                    var totalGap = totalEstTax - totalWithheld;
                    return (
                      <div style={{...CARD,marginBottom:16}}>
                        <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Withholding vs. Estimated Tax — {tYear}</h3>
                        <p style={{fontSize:11,color:TXT2,marginBottom:14}}>Enter taxes already withheld from paychecks and severance to see if estimated payments are needed.</p>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                          <div style={{background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:10,padding:12}}>
                            <label style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:5}}>Federal Tax Withheld</label>
                            <input type="number" step={500} value={thisYear.fedWithheld||''} placeholder="0"
                              onChange={function(e){updateThisYear('fedWithheld', e.target.value);}}
                              style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:6,padding:'7px 10px',color:'#f87171',fontSize:15,fontFamily:PF,fontWeight:700,boxSizing:'border-box'}}/>
                          </div>
                          <div style={{background:'rgba(251,146,60,.06)',border:'1px solid rgba(251,146,60,.2)',borderRadius:10,padding:12}}>
                            <label style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:5}}>AZ State Tax Withheld</label>
                            <input type="number" step={100} value={thisYear.stateWithheld||''} placeholder="0"
                              onChange={function(e){updateThisYear('stateWithheld', e.target.value);}}
                              style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:6,padding:'7px 10px',color:'#fb923c',fontSize:15,fontFamily:PF,fontWeight:700,boxSizing:'border-box'}}/>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                          <div style={{background:fedGap>0?'rgba(248,113,113,.08)':'rgba(52,211,153,.08)',border:'1px solid '+(fedGap>0?'rgba(248,113,113,.25)':'rgba(52,211,153,.25)'),borderRadius:10,padding:12,textAlign:'center'}}>
                            <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Federal {fedGap>0?'Still Owe':'Overpaid'}</div>
                            <div style={{fontFamily:PF,fontSize:20,color:fedGap>0?'#f87171':'#34d399',fontWeight:700}}>{fmtC(Math.abs(fedGap))}</div>
                          </div>
                          <div style={{background:stGap>0?'rgba(251,146,60,.08)':'rgba(52,211,153,.08)',border:'1px solid '+(stGap>0?'rgba(251,146,60,.25)':'rgba(52,211,153,.25)'),borderRadius:10,padding:12,textAlign:'center'}}>
                            <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>AZ State {stGap>0?'Still Owe':'Overpaid'}</div>
                            <div style={{fontFamily:PF,fontSize:20,color:stGap>0?'#fb923c':'#34d399',fontWeight:700}}>{fmtC(Math.abs(stGap))}</div>
                          </div>
                          <div style={{background:totalGap>0?'rgba(251,191,36,.08)':'rgba(52,211,153,.08)',border:'1px solid '+(totalGap>0?'rgba(251,191,36,.25)':'rgba(52,211,153,.25)'),borderRadius:10,padding:12,textAlign:'center'}}>
                            <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Total {totalGap>0?'Remaining':'Overpaid'}</div>
                            <div style={{fontFamily:PF,fontSize:20,color:totalGap>0?'#fbbf24':'#34d399',fontWeight:700}}>{fmtC(Math.abs(totalGap))}</div>
                          </div>
                        </div>
                        {totalGap > 1000 && (
                          <div style={{marginTop:12,background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:TXT2,lineHeight:1.6}}>
                            <strong style={{color:'#f87171'}}>Estimated payment likely needed.</strong> You may owe ~{fmtC(Math.round(totalGap))} beyond withholding.
                            {fedGap > 1000 ? ' Consider making a quarterly estimated payment to avoid underpayment penalties.' : ''}
                          </div>
                        )}
                        {totalGap <= 0 && totalWithheld > 0 && (
                          <div style={{marginTop:12,background:'rgba(52,211,153,.06)',border:'1px solid rgba(52,211,153,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:TXT2,lineHeight:1.6}}>
                            <strong style={{color:'#34d399'}}>Withholding covers your estimated liability.</strong> No estimated payment needed based on current income.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Market Condition / Pull Decision */}
                  <div style={{...CARD}}>
                    <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Where Should You Pull From?</h3>
                    <p style={{fontSize:11,color:TXT2,marginBottom:12}}>Based on your {tYear} bracket position and available headroom:</p>
                    {(function(){
                      var recs = [];
                      if (safeConv > 50000) recs.push({text:'Room to pull from IRA or do a Roth conversion up to '+fmtC(Math.round(safeConv))+' and stay under IRMAA.',color:'#10b981',icon:'✓'});
                      else if (safeConv > 0) recs.push({text:'Limited IRA room ('+fmtC(Math.round(safeConv))+'). Consider pulling from taxable brokerage instead to preserve headroom.',color:'#f59e0b',icon:'⚠'});
                      else recs.push({text:'No IRA/conversion room this year. Pull from taxable brokerage or Roth (tax-free).',color:'#ef4444',icon:'🔴'});
                      if (room12 > 0) recs.push({text:'You have '+fmtC(Math.round(room12))+' of room left in the 12% bracket before jumping to 22%.',color:'#60a5fa',icon:'📊'});
                      recs.push({text:'Reserve taxable cash for Roth conversion taxes in future years (2027-2031).',color:'#a78bfa',icon:'💡'});
                      return recs.map(function(r,i){return(
                        <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:8,background:r.color+'08',border:'1px solid '+r.color+'20',borderRadius:8,padding:'10px 14px'}}>
                          <span style={{fontSize:16,flexShrink:0}}>{r.icon}</span>
                          <span style={{fontSize:12,color:TXT2,lineHeight:1.6}}>{r.text}</span>
                        </div>
                      );});
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── SPENDING TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'spending' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Spending Tracker</h2>
                <p style={{fontSize:12,color:TXT2,margin:0}}>Monthly actuals vs budget · YTD trend · Bucket 1 runway</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <label style={{fontSize:11,color:TXT2,fontWeight:600}}>Year:</label>
                <select value={inp.spendYear||2026} onChange={function(e){setField('spendYear',e.target.value);}}
                  style={{background:SURFACE2,border:'1px solid '+BORDER,borderRadius:7,padding:'7px 12px',color:TXT1,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  {Array.from({length:15},function(_,i){return 2026+i;}).map(function(yr){return <option key={yr} value={yr}>{yr}</option>;})}
                </select>
              </div>
            </div>

            {/* Monthly entry grid */}
            <div style={{...CARD,marginBottom:16}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:14,fontWeight:600}}>Monthly Totals — {inp.spendYear||2026}</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                {['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(function(m,mi){
                  var labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  var val = monthlySpend[m] || 0;
                  var budget = inpWithAssets.monthlyExpenses;
                  var over = val > budget && val > 0;
                  return (
                    <div key={m} style={{background:val>0?(over?'rgba(248,113,113,.05)':'rgba(52,211,153,.05)'):'transparent',border:'1px solid '+(val>0?(over?'rgba(248,113,113,.2)':'rgba(52,211,153,.2)'):BORDER),borderRadius:8,padding:8}}>
                      <label style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:4}}>{labels[mi]}</label>
                      <input type="number" step={100} value={val||''} placeholder="0"
                        onChange={function(e){updateMonthSpend(m, e.target.value);}}
                        style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:5,padding:'5px 7px',color:over?'#f87171':'#10b981',fontSize:13,fontFamily:PF,fontWeight:700,boxSizing:'border-box'}}/>
                      {val > 0 && <div style={{fontSize:12,color:over?'#f87171':'#34d399',marginTop:2,fontWeight:600}}>{over?'+':''}{fmtC(val - budget)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* YTD vs Budget Chart */}
            {(function(){
              var months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
              var labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              var entered = months.filter(function(m){return monthlySpend[m] > 0;});
              var ytdTotal = entered.reduce(function(s,m){return s + monthlySpend[m];}, 0);
              var ytdBudget = entered.length * inpWithAssets.monthlyExpenses;
              var avgMonthly = entered.length > 0 ? ytdTotal / entered.length : 0;
              var chartData = months.map(function(m,i){
                return {month:labels[i], actual:monthlySpend[m]||0, budget:inpWithAssets.monthlyExpenses};
              }).filter(function(d){return d.actual > 0;});

              return (
                <div>
                  {/* YTD Summary cards */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
                    <div style={{background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.25)',borderRadius:10,padding:14,textAlign:'center'}}>
                      <div style={{fontFamily:PF,fontSize:22,color:'#10b981',fontWeight:700}}>{fmtC(ytdTotal)}</div>
                      <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:4}}>YTD Actual ({entered.length} mo)</div>
                    </div>
                    <div style={{background:(ytdTotal<=ytdBudget?'rgba(52,211,153,.08)':'rgba(248,113,113,.08)'),border:'1px solid '+(ytdTotal<=ytdBudget?'rgba(52,211,153,.25)':'rgba(248,113,113,.25)'),borderRadius:10,padding:14,textAlign:'center'}}>
                      <div style={{fontFamily:PF,fontSize:22,color:ytdTotal<=ytdBudget?'#34d399':'#f87171',fontWeight:700}}>{ytdTotal<=ytdBudget?'-':'+' }{fmtC(Math.abs(ytdTotal - ytdBudget))}</div>
                      <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:4}}>vs Budget</div>
                    </div>
                    <div style={{background:'rgba(96,165,250,.08)',border:'1px solid rgba(96,165,250,.25)',borderRadius:10,padding:14,textAlign:'center'}}>
                      <div style={{fontFamily:PF,fontSize:22,color:'#60a5fa',fontWeight:700}}>{avgMonthly>0?fmtC(avgMonthly):'—'}</div>
                      <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:4}}>Avg Monthly</div>
                    </div>
                    <div style={{background:'rgba(167,139,250,.08)',border:'1px solid rgba(167,139,250,.25)',borderRadius:10,padding:14,textAlign:'center'}}>
                      <div style={{fontFamily:PF,fontSize:22,color:'#a78bfa',fontWeight:700}}>{fmtC(inpWithAssets.monthlyExpenses)}</div>
                      <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:4}}>Budget/Month</div>
                    </div>
                  </div>

                  {/* Spend vs Budget bar chart */}
                  {chartData.length > 0 && (
                    <div style={{...CARD,marginBottom:16}}>
                      <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:12,fontWeight:600}}>Actual vs Budget</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} margin={{top:5,right:20,left:20,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                          <XAxis dataKey="month" stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                          <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                          <Tooltip content={<TTip/>}/>
                          <Legend wrapperStyle={{fontSize:11}}/>
                          <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[3,3,0,0]}/>
                          <Bar dataKey="budget" fill="rgba(148,163,184,0.3)" name="Budget" radius={[3,3,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* B1 Runway */}
                  <div style={{...CARD}}>
                    <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:8,fontWeight:600}}>Bucket 1 Cash Runway</h3>
                    {(function(){
                      var b1Cash = derivedTotals.taxable + derivedTotals.iraCash + (inpWithAssets.severanceNet || 0);
                      var burn = avgMonthly > 0 ? avgMonthly : inpWithAssets.monthlyExpenses;
                      var runwayMo = Math.round(b1Cash / burn);
                      var pct = Math.min(100, (runwayMo / 36) * 100);
                      var color = runwayMo >= 24 ? '#10b981' : runwayMo >= 12 ? '#f59e0b' : '#ef4444';
                      return (
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                            <span style={{fontSize:12,color:TXT2}}>Cash: <strong style={{color:'#10b981'}}>{fmtFull(b1Cash)}</strong> ÷ {fmtC(burn)}/mo</span>
                            <span style={{fontSize:14,color:color,fontWeight:700}}>{runwayMo} months</span>
                          </div>
                          <div style={{height:16,background:SURFACE2,borderRadius:8,overflow:'hidden'}}>
                            <div style={{height:16,width:pct+'%',background:color,borderRadius:8}}/>
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',marginTop:3,fontSize:11,color:TXT3}}>
                            <span>0</span><span>12 mo</span><span>24 mo</span><span>36 mo target</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {activeTab === 'assets' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:14}}>
              <div>
                <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Current Asset Holdings</h2>
                <p style={{fontSize:13,color:TXT2,margin:0}}>{assets.length} holdings · {fmtFull(totalPort)} total portfolio</p>
              </div>
              <button onClick={openAddAsset} className="abtn"
                style={{display:'flex',alignItems:'center',gap:7,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.4)',borderRadius:9,padding:'10px 18px',color:'#34d399',cursor:'pointer',fontSize:13,fontWeight:600,transition:'background .15s'}}>
                <Plus size={15}/> Add Holding
              </button>
            </div>

            {/* Portfolio overview cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:22}}>
              {[
                {label:'Taxable',amount:derivedTotals.taxable,color:'#34d399'},
                {label:'IRA (total)',amount:iraTotal,color:'#60a5fa'},
                {label:'Roth',amount:derivedTotals.roth,color:'#a78bfa'},
                {label:'Unassigned',amount:unassigned.reduce(function(s,a){return s+a.amount;},0),color:unassigned.length>0?'#dc2626':TXT3,note:unassigned.length+' holdings'},
              ].map(function(item){
                return (
                  <div key={item.label} style={{background:item.color+'15',border:'1px solid '+item.color+'30',borderRadius:10,padding:'13px 15px',textAlign:'center'}}>
                    <div style={{fontFamily:PF,fontSize:18,color:item.color,fontWeight:700}}>{fmtC(item.amount)}</div>
                    <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:3}}>{item.label}</div>
                    {item.note && <div style={{fontSize:12,color:item.color,marginTop:2}}>{item.note}</div>}
                  </div>
                );
              })}
            </div>

            {/* Composition chart */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:16,marginBottom:22}}>
              <div style={CARD}>
                <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:12,fontWeight:600}}>Composition</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={composition} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="amount" paddingAngle={2}>
                      {composition.map(function(c,i){return <Cell key={i} fill={c.color}/>;} )}
                    </Pie>
                    <Tooltip formatter={function(v){return fmtC(v);}} contentStyle={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:8,fontSize:12}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={CARD}>
                <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:11,fontWeight:600}}>Breakdown</h3>
                <div style={{overflowY:'auto',maxHeight:220}}>
                  {composition.map(function(c,i){
                    var totalAmt = totalPort || 1;
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <div style={{width:8,height:8,borderRadius:2,background:c.color,flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',justifyContent:'space-between'}}>
                            <span style={{fontSize:11,color:TXT1,fontWeight:600}}>{c.name}</span>
                            <span style={{fontSize:11,color:c.color,fontWeight:700}}>{fmtC(c.amount)}</span>
                          </div>
                          <div style={{height:3,background:SURFACE,borderRadius:2,marginTop:3}}>
                            <div style={{height:3,width:Math.min((c.amount/totalAmt)*100*3.5,100)+'%',background:c.color,borderRadius:2,opacity:0.7}}/>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Holdings table by account */}
            {['Taxable','IRA','Roth IRA','Roth 401k','401k','HSA'].map(function(acct) {
              var acctAssets = assets.filter(function(a){return a.account===acct;});
              if (acctAssets.length === 0) return null;
              var acctTotal = acctAssets.reduce(function(s,a){return s+a.amount;},0);
              var acctColor = acct==='Taxable'?'#34d399':acct.startsWith('Roth')?'#a78bfa':'#60a5fa';
              return (
                <div key={acct} style={{marginBottom:22}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <h3 style={{fontFamily:PF,fontSize:14,color:acctColor,margin:0,fontWeight:600}}>{acct}</h3>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:13,color:acctColor,fontWeight:700}}>{fmtFull(acctTotal)}</span>
                    </div>
                  </div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <thead><tr style={{background:SURFACE2}}>
                        {['Holding','Amount','Type','Maturity','Yield','Risk','Bucket','Actions'].map(function(h){
                          return <th key={h} style={{padding:'6px 10px',textAlign:h==='Amount'?'right':'left',color:TXT2,fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:0.5,borderBottom:'1px solid '+BORDER,whiteSpace:'nowrap'}}>{h}</th>;
                        })}
                      </tr></thead>
                      <tbody>
                        {acctAssets.map(function(h){
                          var tc = TYPE_C[h.type]||'#64748b';
                          var rc2 = RISK_C[h.risk]||'#64748b';
                          var bkt = h.bucket ? bucketCfg.find(function(b){return b.id===h.bucket;}) : null;
                          return (
                            <tr key={h.id} className="rr" style={{borderBottom:'1px solid '+BORDER}}>
                              <td style={{padding:'7px 10px',color:TXT1,fontWeight:600}}>{h.name}</td>
                              <td style={{padding:'7px 10px',textAlign:'right',color:'#34d399',fontWeight:700}}>{fmtFull(h.amount)}</td>
                              <td style={{padding:'7px 10px'}}><span style={{background:tc+'22',color:tc,border:'1px solid '+tc+'44',borderRadius:3,padding:'1px 5px',fontSize:11,fontWeight:700}}>{h.type}</span></td>
                              <td style={{padding:'7px 10px',color:TXT3}}>{h.maturity}</td>
                              <td style={{padding:'7px 10px',color:'#fbbf24'}}>{h.yld}</td>
                              <td style={{padding:'7px 10px'}}><span style={{background:rc2+'22',color:rc2,border:'1px solid '+rc2+'44',borderRadius:3,padding:'1px 5px',fontSize:11,fontWeight:700}}>{h.risk}</span></td>
                              <td style={{padding:'7px 10px'}}>
                                {bkt ? <span style={{background:bkt.color+'22',color:bkt.color,border:'1px solid '+bkt.color+'44',borderRadius:3,padding:'1px 5px',fontSize:11,fontWeight:700}}>{bkt.label}</span>
                                  : <span style={{color:'#f87171',fontSize:11,fontWeight:700}}>Unassigned</span>}
                              </td>
                              <td style={{padding:'7px 10px'}}>
                                <div style={{display:'flex',gap:5}}>
                                  <button onClick={function(){openEditAsset(h);}} className="ebtn" style={{background:'rgba(96,165,250,.1)',border:'1px solid rgba(96,165,250,.2)',borderRadius:5,padding:'3px 7px',cursor:'pointer',color:'#60a5fa',display:'flex',alignItems:'center',gap:3,fontSize:12,transition:'background .15s'}}>
                                    <Edit2 size={10}/> Edit
                                  </button>
                                  <button onClick={function(){if(window.confirm('Delete '+h.name+'?'))deleteAsset(h.id);}} className="dbtn" style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:5,padding:'3px 7px',cursor:'pointer',color:'#f87171',display:'flex',alignItems:'center',gap:3,fontSize:12,transition:'background .15s'}}>
                                    <Trash2 size={10}/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* IRA sub-bucket summary */}
            <div style={{background:'rgba(96,165,250,.06)',border:'1px solid rgba(96,165,250,.2)',borderRadius:12,padding:16,marginTop:8}}>
              <h4 style={{fontSize:12,color:'#60a5fa',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>IRA Sub-Bucket Classification (used in projections)</h4>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                {[['Cash/CD/T-Bill',derivedTotals.iraCash,'#34d399',inpWithAssets.cashReturnRate+'%'],['TIPS/Bonds',derivedTotals.iraTips,'#60a5fa','Inf + '+inpWithAssets.tipsRealReturn+'%'],['Dividend/REIT',derivedTotals.iraDividend,'#fbbf24',inpWithAssets.dividendReturnRate+'%'],['Growth Equity',derivedTotals.iraGrowth,'#a78bfa',inpWithAssets.growthReturnRate+'%']].map(function(item){
                  return (
                    <div key={item[0]} style={{background:item[2]+'10',border:'1px solid '+item[2]+'25',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
                      <div style={{fontFamily:PF,fontSize:16,color:item[2],fontWeight:700}}>{fmtC(item[1])}</div>
                      <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginTop:3}}>{item[0]}</div>
                      <div style={{fontSize:12,color:item[2],marginTop:3}}>{item[3]} return</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'buckets' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:14}}>
              <div>
                <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Three-Bucket Strategy</h2>
                <p style={{fontSize:13,color:TXT2,margin:0}}>SORR Protection · {fmtFull(buckets.reduce(function(s,b){return s+b.current;},0))} assigned across buckets</p>
              </div>
              {unassigned.length > 0 && (
                <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',borderRadius:9,padding:'9px 14px',display:'flex',alignItems:'center',gap:8}}>
                  <AlertCircle size={14} color="#f87171"/>
                  <span style={{fontSize:12,color:'#f87171',fontWeight:600}}>{unassigned.length} unassigned {unassigned.length===1?'holding':'holdings'} — assign below or on Assets tab</span>
                </div>
              )}
            </div>

            {/* Allocation bar */}
            <div style={{...CARD,marginBottom:20,padding:20}}>
              <div style={{display:'flex',height:28,borderRadius:6,overflow:'hidden',marginBottom:10}}>
                {buckets.map(function(b){
                  var total = buckets.reduce(function(s,x){return s+x.current;},0)||1;
                  return <div key={b.id} style={{flex:Math.max(b.current,1),background:b.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white',minWidth:55}}>{fmtC(b.current)}</div>;
                })}
                {unassigned.length > 0 && (
                  <div style={{flex:unassigned.reduce(function(s,a){return s+a.amount;},0),background:BORDER2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:TXT2,minWidth:55,opacity:0.7}}>
                    {fmtC(unassigned.reduce(function(s,a){return s+a.amount;},0))}
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                {buckets.map(function(b){
                  var total = totalPort || 1;
                  return <div key={b.id} style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:b.color}}/><span style={{fontSize:11,color:TXT3}}>{b.label}: {((b.current/total)*100).toFixed(1)}%</span></div>;
                })}
                {unassigned.length > 0 && <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:BORDER2}}/><span style={{fontSize:11,color:TXT2}}>Unassigned: {unassigned.length} holdings</span></div>}
              </div>
            </div>

            {/* Unassigned assets quick-assign */}
            {unassigned.length > 0 && (
              <div style={{background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:12,padding:18,marginBottom:20}}>
                <h3 style={{fontFamily:PF,fontSize:14,color:'#f87171',marginBottom:12,fontWeight:600}}>Unassigned Holdings</h3>
                <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                  {unassigned.map(function(a){
                    return (
                      <div key={a.id} style={{background:SURFACE2,border:'1px solid '+BORDER,borderRadius:9,padding:'10px 14px',display:'flex',alignItems:'center',gap:12}}>
                        <div>
                          <div style={{fontSize:12,color:TXT1,fontWeight:600}}>{a.name}</div>
                          <div style={{fontSize:11,color:TXT2}}>{fmtFull(a.amount)} · {a.account}</div>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          {buckets.map(function(b){
                            return (
                              <button key={b.id} onClick={function(){moveAssetToBucket(a.id,b.id);}}
                                style={{background:b.color+'20',border:'1px solid '+b.color+'40',borderRadius:5,padding:'4px 8px',cursor:'pointer',color:b.color,fontSize:12,fontWeight:700}}>
                                {b.id}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bucket cards */}
            {buckets.map(function(b){
              var over = b.current > b.target;
              return (
                <div key={b.id} style={{background:b.bg,border:'1px solid '+b.border,borderRadius:13,padding:20,marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12,flexWrap:'wrap',gap:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:32,height:32,background:b.color+'30',border:'2px solid '+b.color,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:PF,fontSize:14,color:b.color,fontWeight:700}}>{b.id}</div>
                      <div>
                        <h3 style={{fontFamily:PF,fontSize:18,color:b.color,margin:0,fontWeight:700}}>{b.label}</h3>
                        <p style={{fontSize:11,color:TXT2,margin:0}}>{b.sub}</p>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:PF,fontSize:20,color:b.color,fontWeight:700}}>{fmtFull(b.current)}</div>
                        <div style={{fontSize:12,color:TXT2}}>target {fmtFull(b.target)}</div>
                      </div>
                      <div style={{background:over?'rgba(52,211,153,.15)':'rgba(251,191,36,.15)',border:'1px solid '+(over?'rgba(52,211,153,.3)':'rgba(251,191,36,.3)'),borderRadius:5,padding:'3px 8px'}}>
                        <span style={{fontSize:12,color:over?'#34d399':'#fbbf24',fontWeight:700}}>{over?'+'+fmtFull(b.current-b.target)+' over':fmtFull(b.target-b.current)+' to goal'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{height:4,background:SURFACE,borderRadius:3,marginBottom:16,overflow:'hidden'}}>
                    <div style={{height:4,width:Math.min((b.current/b.target)*100,100)+'%',background:b.color,borderRadius:3}}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1.1fr 1fr',gap:16}}>
                    <div>
                      <h4 style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginBottom:8,fontWeight:700}}>Holdings ({b.holdings.length})</h4>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead><tr>{['Asset','Amount','Account',''].map(function(h){return <th key={h} style={{padding:'3px 6px',textAlign:h==='Amount'?'right':'left',color:TXT2,fontSize:11,fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid '+b.border}}>{h}</th>;})}</tr></thead>
                        <tbody>
                          {b.holdings.map(function(h,i){
                            // Find full asset to get id for move button
                            var fullA = assets.find(function(a){return a.name===h.name&&a.account===h.account;});
                            return (
                              <tr key={i}>
                                <td style={{padding:'4px 6px',color:TXT1}}>{h.name}</td>
                                <td style={{padding:'4px 6px',textAlign:'right',color:b.color,fontWeight:700}}>{fmtFull(h.amount)}</td>
                                <td style={{padding:'4px 6px'}}><span style={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:3,padding:'1px 4px',fontSize:11,color:TXT3}}>{h.account}</span></td>
                                <td style={{padding:'4px 6px'}}>
                                  {fullA && <button onClick={function(){openEditAsset(fullA);}} className="ebtn" style={{background:'rgba(96,165,250,.1)',border:'1px solid rgba(96,165,250,.2)',borderRadius:4,padding:'2px 5px',cursor:'pointer',color:'#60a5fa',fontSize:11,transition:'background .15s'}}>Edit</button>}
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{borderTop:'1px solid '+b.border}}><td style={{padding:'5px 6px',fontWeight:700,color:TXT1}}>Total</td><td style={{padding:'5px 6px',textAlign:'right',color:b.color,fontWeight:700}}>{fmtFull(b.current)}</td><td/><td/></tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h4 style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginBottom:8,fontWeight:700}}>Strategy</h4>
                      <p style={{fontSize:12,color:TXT3,lineHeight:1.6,marginBottom:10}}>{b.purpose}</p>
                      <div style={{background:SURFACE2,borderRadius:7,padding:10,border:'1px solid '+BORDER}}>
                        <p style={{fontSize:11,color:TXT2,lineHeight:1.6,margin:0}}>{b.strategy}</p>
                      </div>
                      <div style={{marginTop:10}}><span style={{background:b.color+'22',color:b.color,border:'1px solid '+b.color+'44',borderRadius:4,padding:'2px 7px',fontSize:12,fontWeight:700}}>{b.risk}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {activeTab === 'cashflow' && (
          <div>
            <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:8,fontWeight:600}}>Cash Flow Projection</h2>
            <p style={{fontSize:12,color:TXT2,marginBottom:12}}>Every year · Jan 1 balances · Withdrawal sourcing · IRMAA tracking</p>

            {/* Stacey SS Toggle */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.2)',borderRadius:10,padding:'10px 16px'}}>
              <span style={{fontSize:12,color:TXT2,fontWeight:600}}>Stacey SS:</span>
              <button onClick={function(){setField('staceySS63',inp.staceySS63?0:1);}}
                style={{background:inp.staceySS63?'#a78bfa':'rgba(167,139,250,.15)',border:'1px solid #a78bfa',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:inp.staceySS63?'white':'#a78bfa',fontSize:11,fontWeight:700}}>
                Age 63 — $1,472/mo
              </button>
              <button onClick={function(){setField('staceySS63',inp.staceySS63?0:1);}}
                style={{background:!inp.staceySS63?'#60a5fa':'rgba(96,165,250,.15)',border:'1px solid #60a5fa',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:!inp.staceySS63?'white':'#60a5fa',fontSize:11,fontWeight:700}}>
                Age 67 — $1,879/mo
              </button>
              <span style={{fontSize:11,color:TXT3,marginLeft:8}}>
                {inp.staceySS63 ? 'Starts Aug 2025 · Lower benefit · Immediate income' : 'Starts Aug 2029 · Higher benefit · Larger gap years 2026–2029'}
              </span>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashFlow} margin={{top:10,right:20,left:20,bottom:0}}>
                <defs>
                  {[['gb','#10b981'],['gi','#60a5fa'],['gr','#a78bfa'],['ge','#f87171']].map(function(g){return <linearGradient key={g[0]} id={g[0]} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={g[1]} stopOpacity={0.3}/><stop offset="95%" stopColor={g[1]} stopOpacity={0.02}/></linearGradient>;})}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                <XAxis dataKey="year" stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                <Tooltip content={<TTip/>}/>
                <Legend wrapperStyle={{fontSize:11,color:TXT2}}/>
                <Area type="monotone" dataKey="balance" stroke="#10b981" fill="url(#gb)" strokeWidth={2} name="Total Balance"/>
                <Area type="monotone" dataKey="iraBalance" stroke="#60a5fa" fill="url(#gi)" strokeWidth={1.5} name="IRA"/>
                <Area type="monotone" dataKey="rothBalance" stroke="#a78bfa" fill="url(#gr)" strokeWidth={1.5} name="Roth"/>
                <Area type="monotone" dataKey="expenses" stroke="#f87171" fill="url(#ge)" strokeWidth={2} name="Expenses"/>
              </AreaChart>
            </ResponsiveContainer>

            {/* Recommendation Panel — Current + Next Year */}
            {cashFlow.length >= 2 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,margin:'16px 0'}}>
                {cashFlow.slice(0,2).map(function(row){
                  var yr = row.year;
                  var status = row.gap <= 0 ? 'success' : row.irmaaHit ? 'danger' : row.rmd > 0 ? 'warning' : 'info';
                  var colors = {success:['#10b981','rgba(16,185,129,.08)','rgba(16,185,129,.25)'],warning:['#f59e0b','rgba(245,158,11,.08)','rgba(245,158,11,.25)'],danger:['#ef4444','rgba(239,68,68,.08)','rgba(239,68,68,.25)'],info:['#3b82f6','rgba(59,130,246,.08)','rgba(59,130,246,.25)']};
                  var c = colors[status];
                  var advice = '';
                  if (yr === 2026) advice = 'Partial retirement year. No Roth conversions — W-2 + severance fills bracket. Fund gap from Bucket 1 cash.';
                  else if (yr === 2027) advice = 'Prime conversion year. Convert '+fmtC(rothConvForYear(inpWithAssets,2027))+' at 22%. Keep MAGI under $212K for IRMAA.';
                  else if (row.rmd > 0) advice = 'RMDs required: '+fmtC(row.rmd)+'. QCDs offset '+fmtC(Math.min(inpWithAssets.qcdAmount, row.rmd))+' tax-free.';
                  else if (row.gap > 0 && row.scottSS === 0) advice = 'Pre-SS gap year. Draw '+fmtC(row.gap)+' from Bucket 1. Preserve IRA for conversions.';
                  else advice = 'SS covers '+Math.round(row.income/Math.max(1,row.expenses)*100)+'% of expenses. Gap: '+fmtC(row.gap);
                  return (
                    <div key={yr} style={{background:c[1],border:'1px solid '+c[2],borderRadius:10,padding:'12px 16px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                        <span style={{fontFamily:PF,fontSize:16,color:c[0],fontWeight:700}}>{yr}</span>
                        <span style={{fontSize:12,color:TXT3}}>Age {row.age}</span>
                      </div>
                      <div style={{fontSize:12,color:TXT2,lineHeight:1.6}}>{advice}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Redesigned Table — every year, two conceptual sections per row */}
            <div style={{overflowX:'auto',marginTop:8}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:1200}}>
                <thead>
                  <tr style={{background:SURFACE2}}>
                    <th colSpan={2} style={{padding:'6px 8px',textAlign:'left',color:TXT1,fontWeight:800,fontSize:12,borderBottom:'2px solid '+BORDER,borderRight:'1px solid '+BORDER}}></th>
                    <th colSpan={4} style={{padding:'6px 8px',textAlign:'center',color:'#10b981',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:1,borderBottom:'2px solid '+BORDER,borderRight:'1px solid '+BORDER}}>Balances (Jan 1)</th>
                    <th colSpan={2} style={{padding:'6px 8px',textAlign:'center',color:'#34d399',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:1,borderBottom:'2px solid '+BORDER,borderRight:'1px solid '+BORDER}}>Income</th>
                    <th colSpan={2} style={{padding:'6px 8px',textAlign:'center',color:'#f87171',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:1,borderBottom:'2px solid '+BORDER,borderRight:'1px solid '+BORDER}}>Spending</th>
                    <th style={{padding:'6px 8px',textAlign:'center',color:'#fbbf24',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:1,borderBottom:'2px solid '+BORDER,borderRight:'1px solid '+BORDER}}>Gap</th>
                    <th colSpan={3} style={{padding:'6px 8px',textAlign:'center',color:'#60a5fa',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:1,borderBottom:'2px solid '+BORDER,borderRight:'1px solid '+BORDER}}>Draws From</th>
                    <th colSpan={3} style={{padding:'6px 8px',textAlign:'center',color:'#a78bfa',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:1,borderBottom:'2px solid '+BORDER}}>Optimization</th>
                  </tr>
                  <tr style={{background:SURFACE2}}>
                    {['Year','Age','Total','IRA','Roth','Taxable','Scott SS','Stacey SS','Expenses','HC','Gap','Taxable','IRA','Roth','Conv','Est Tax','IRMAA'].map(function(h,hi){
                      return <th key={h} style={{padding:'5px 6px',textAlign:hi<2?'left':'right',color:TXT2,fontWeight:700,fontSize:12,textTransform:'uppercase',letterSpacing:0.3,borderBottom:'1px solid '+BORDER,whiteSpace:'nowrap'}}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {cashFlow.map(function(row,i){
                    var isCurrentYear = row.year === 2026;
                    var hasRMD = row.rmd > 0;
                    var rowBg = isCurrentYear ? 'rgba(16,185,129,.04)' : i%2===0 ? SURFACE : SURFACE2;
                    return (
                      <tr key={i} style={{borderBottom:'1px solid '+BORDER,background:rowBg}}>
                        <td style={{padding:'5px 6px',color:isCurrentYear?ACCENT:TXT1,fontWeight:700,fontSize:11}}>{row.year}</td>
                        <td style={{padding:'5px 6px',color:TXT3,fontSize:10}}>{row.age}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#10b981',fontWeight:700}}>{fmtC(row.balance)}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#60a5fa'}}>{fmtC(row.iraBalance)}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#a78bfa'}}>{fmtC(row.rothBalance)}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#2dd4bf'}}>{fmtC(row.taxableBalance)}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:row.scottSS>0?'#34d399':TXT3}}>{row.scottSS>0?fmtC(row.scottSS):'—'}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:row.staceySS>0?'#34d399':TXT3}}>{row.staceySS>0?fmtC(row.staceySS):'—'}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#f87171'}}>{fmtC(row.expenses)}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#fb923c',fontSize:9}}>{fmtC(row.healthcare)}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:row.gap>0?'#fbbf24':TXT3,fontWeight:row.gap>0?700:400}}>{row.gap>0?fmtC(row.gap):'—'}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#2dd4bf'}}>{row.fromTaxable>0?fmtC(row.fromTaxable):'—'}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#60a5fa'}}>{row.fromIRA>0?fmtC(row.fromIRA):'—'}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#a78bfa'}}>{row.fromRoth>0?fmtC(row.fromRoth):'—'}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#c084fc',fontWeight:600}}>{row.rothConv>0?fmtC(row.rothConv):'—'}</td>
                        <td style={{padding:'5px 6px',textAlign:'right',color:'#fbbf24'}}>{row.estTax>0?fmtC(row.estTax):'—'}</td>
                        <td style={{padding:'5px 6px',textAlign:'center'}}>{row.irmaaHit?<span style={{background:'rgba(248,113,113,.15)',color:'#f87171',borderRadius:3,padding:'1px 5px',fontSize:12,fontWeight:700}}>HIT</span>:<span style={{color:'#34d399',fontSize:8}}>OK</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'monte' && (
          <div>
            <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Monte Carlo Simulation</h2>
            <p style={{fontSize:12,color:TXT2,marginBottom:20}}>500 simulations · full bucket strategy with dividend refill, TIPS-first sequencing, and market-condition-aware equity sales</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:22}}>
              {[['Success Rate',successRate+'%',successColor],['Median Final',fmtC(pctData.length>0?pctData[pctData.length-1].p50:0),'#2563eb'],['90th Pct',fmtC(pctData.length>0?pctData[pctData.length-1].p90:0),'#7c3aed'],['10th Pct',fmtC(pctData.length>0?pctData[pctData.length-1].p10:0),'#dc2626']].map(function(item){
                return <div key={item[0]} className="rc" style={{background:item[2]+'12',border:'1px solid '+item[2]+'30',borderRadius:10,padding:'14px 16px'}}><div style={{fontFamily:PF,fontSize:22,color:item[2],fontWeight:700}}>{item[1]}</div><div style={{fontSize:11,color:TXT3,textTransform:'uppercase',letterSpacing:1,marginTop:4}}>{item[0]}</div></div>
              })}
            </div>

            <div style={{...CARD,marginBottom:20}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Total Portfolio — Percentile Bands</h3>
              <p style={{fontSize:11,color:TXT3,marginBottom:14}}>Shaded bands show 10th–90th percentile range. Each simulation: SCHD/VNQ dividends refill Bucket 1 annually. Bear years (-10%+): cash + TIPS only, no equity sales. Good years (+10%+): trim equities, rebalance gains to Bucket 1. Neutral years: cash → TIPS → dividends → equities only if exhausted.</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={pctData} margin={{top:10,right:20,left:20,bottom:0}}>
                  <defs>
                    {[['gp90','#7c3aed'],['gp75','#2563eb'],['gp50','#059669'],['gp25','#d97706'],['gp10','#dc2626']].map(
                      function(g){return <linearGradient key={g[0]} id={g[0]} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={g[1]} stopOpacity={0.25}/><stop offset="95%" stopColor={g[1]} stopOpacity={0.02}/></linearGradient>;}
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                  <XAxis dataKey="year" stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <Tooltip content={<TTip/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:TXT2}}/>
                  {[['p90','#7c3aed','gp90','90th %ile'],['p75','#2563eb','gp75','75th %ile'],['p50','#059669','gp50','Median'],['p25','#d97706','gp25','25th %ile'],['p10','#dc2626','gp10','10th %ile']].map(function(s){
                    return <Area key={s[0]} type="monotone" dataKey={s[0]} stroke={s[1]} fill={'url(#'+s[2]+')'} strokeWidth={s[0]==='p50'?2.5:1.5} name={s[3]} fillOpacity={1}/>;
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{...CARD,marginBottom:20}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Median Bucket Trajectories</h3>
              <p style={{fontSize:11,color:TXT3,marginBottom:14}}>Median balance of each bucket — shows SORR protection in action. Bucket 1 depletes first, Bucket 3 grows longest.</p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={pctData} margin={{top:10,right:20,left:20,bottom:0}}>
                  <defs>
                    <linearGradient id="gb1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.3}/><stop offset="95%" stopColor="#059669" stopOpacity={0.02}/></linearGradient>
                    <linearGradient id="gb2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02}/></linearGradient>
                    <linearGradient id="gb3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                  <XAxis dataKey="year" stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <Tooltip content={<TTip/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:TXT2}}/>
                  <Area type="monotone" dataKey="b1med" stroke="#059669" fill="url(#gb1)" strokeWidth={2.5} name="Bucket 1 — Cash Buffer" fillOpacity={1}/>
                  <Area type="monotone" dataKey="b2med" stroke="#2563eb" fill="url(#gb2)" strokeWidth={2.5} name="Bucket 2 — Income Bridge" fillOpacity={1}/>
                  <Area type="monotone" dataKey="b3med" stroke="#7c3aed" fill="url(#gb3)" strokeWidth={2.5} name="Bucket 3 — Growth" fillOpacity={1}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{background:'rgba(37,99,235,.06)',border:'1px solid rgba(37,99,235,.2)',borderRadius:10,padding:'12px 16px',fontSize:12,color:TXT2,lineHeight:1.7}}>
              <strong style={{color:'#2563eb'}}>How this simulation works:</strong> Each bucket is tracked independently using its own return rate and volatility. Cash earns a steady rate with zero volatility. TIPS get a real yield plus small volatility. Dividend ETFs use ~55% of stock volatility. Growth and Roth use full stock volatility (correlated). In bad years (growth &lt;−10%), the simulation skips Bucket 2/3 withdrawals and uses cash first — this is the core SORR protection. All numbers flow directly from your current asset holdings.
            </div>

            {/* Inflation sensitivity grid */}
            <div style={{...CARD,marginTop:16}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Inflation Sensitivity Analysis</h3>
              <p style={{fontSize:11,color:TXT2,marginBottom:14}}>How different inflation scenarios affect your projected portfolio at age {inpWithAssets.lifeExpectancy}</p>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr style={{background:SURFACE2}}>
                      <th style={{padding:'7px 11px',textAlign:'left',color:TXT2,fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:0.5,borderBottom:'1px solid '+BORDER}}>Inflation Scenario</th>
                      {['2%','3% (Base)','4%','5%','6% (Stress)'].map(function(h){return <th key={h} style={{padding:'7px 11px',textAlign:'right',color:h.includes('Base')?'#34d399':h.includes('Stress')?'#f87171':TXT2,fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:0.5,borderBottom:'1px solid '+BORDER}}>{h}</th>;})}
                    </tr>
                  </thead>
                  <tbody>
                    {(function(){
                      var inflationRates = [0.02, 0.03, 0.04, 0.05, 0.06];
                      var rows2 = [
                        {label:'Annual Expenses at 80',fn:function(inf){return inpWithAssets.monthlyExpenses*12*Math.pow(1+inf,14);}},
                        {label:'Annual Expenses at 90',fn:function(inf){return inpWithAssets.monthlyExpenses*12*Math.pow(1+inf,24);}},
                        {label:'Lifetime HC Cost',fn:function(inf){var t=0;for(var y=0;y<=inpWithAssets.lifeExpectancy-inpWithAssets.currentAge;y++){var age2=inpWithAssets.currentAge+y;var hc=(age2<inpWithAssets.healthPhase1EndAge)?inpWithAssets.healthPhase1Annual*Math.pow(1+inpWithAssets.healthInflation,y):inpWithAssets.healthPhase2Annual*Math.pow(1+inpWithAssets.healthInflation,y);t+=hc;}return t;}},
                        {label:'Projected Balance at 90 (est)',fn:function(inf){var mult=1+(0.03-inf)*18;return Math.max(0,(cashFlow[cashFlow.length-1]||{balance:0}).balance*mult);}},
                      ];
                      return rows2.map(function(row,i){
                        var vals = inflationRates.map(row.fn);
                        var baseVal = vals[1];
                        return (
                          <tr key={i} style={{borderBottom:'1px solid '+BORDER,background:i%2===0?SURFACE:SURFACE2}}>
                            <td style={{padding:'8px 11px',color:TXT1,fontWeight:600}}>{row.label}</td>
                            {vals.map(function(v,j){
                              var diff = v - baseVal;
                              var isBase = j===1;
                              var c = isBase?TXT1:diff>0?'#f87171':'#34d399';
                              return <td key={j} style={{padding:'8px 11px',textAlign:'right',color:c,fontWeight:isBase?700:400}}>{fmtC(v)}{!isBase&&<span style={{fontSize:11,marginLeft:4,color:c}}>{diff>0?'+':''}{fmtC(diff)}</span>}</td>;
                            })}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              <div style={{marginTop:12,fontSize:11,color:TXT3,lineHeight:1.6}}>
                <strong style={{color:'#fbbf24'}}>Key insight:</strong> Every 1% increase in inflation above 3% erodes ~{fmtC(inpWithAssets.monthlyExpenses*12*14*0.01)} in cumulative real spending power by age 80. TIPS in Bucket 2 provide explicit inflation protection — this is why the TIPS ladder was built to cover years 4–10.
              </div>
            </div>
          </div>
        )}

        {/* ── ROTH CONVERSIONS TAB ────────────────────────────────────────── */}
        {activeTab === 'roth' && (
          <div>
            <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:20,fontWeight:600}}>Roth Conversion Strategy</h2>
            <div style={{background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.25)',borderRadius:13,padding:22,marginBottom:22}}>
              <h3 style={{fontFamily:PF,fontSize:16,color:'#a78bfa',marginBottom:4,fontWeight:600}}>Roth Conversion Window</h3>
              <p style={{fontSize:12,color:TXT2,marginBottom:16}}>
                <strong style={{color:'#f87171'}}>2026: Working year — no conversions.</strong> W-2 income pushes bracket too high.{' '}
                Window opens <strong style={{color:'#34d399'}}>Jan 2027</strong> and runs until RMDs begin at age {rothWindow.rmdAge} — <strong style={{color:'#a78bfa'}}>{rothWindow.years} years</strong>.
              </p>
              <div style={{background:'rgba(220,38,38,.06)',border:'1px solid rgba(220,38,38,.2)',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:18}}>🚫</span>
                <div>
                  <div style={{fontSize:12,color:'#f87171',fontWeight:700,marginBottom:2}}>2026 — No Roth Conversion (Working Year)</div>
                  <div style={{fontSize:11,color:TXT3}}>W-2 income + partial SS pushes bracket high. Use 2026 to plan, rebalance within IRAs, and max remaining 401k contributions instead.</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {[['Conv Window','2027–'+rothWindow.rmdYear,'#a78bfa'],['Years Available',rothWindow.years+' yrs','#34d399'],['IRMAA Safe MAGI',fmtC(rothWindow.irmaaSafe),'#fbbf24'],['Total Convertible',fmtC(rothWindow.totalRecommended),'#60a5fa']].map(function(item){
                  return <div key={item[0]} style={{background:item[2]+'15',border:'1px solid '+item[2]+'30',borderRadius:10,padding:14,textAlign:'center'}}><div style={{fontFamily:PF,fontSize:20,color:item[2],fontWeight:800}}>{item[1]}</div><div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:3}}>{item[0]}</div></div>;
                })}
              </div>
              <div style={{background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.25)',borderRadius:10,padding:14,marginBottom:18}}>
                <div style={{fontSize:11,color:'#fbbf24',fontWeight:700,marginBottom:6}}>⚠️ IRMAA: The Hidden Conversion Tax</div>
                <div style={{fontSize:11,color:TXT3,lineHeight:1.7}}>
                  Medicare uses income from <strong style={{color:TXT1}}>2 years ago</strong>. Convert too much in 2027 and you pay IRMAA surcharges in 2029.
                  Keep <strong style={{color:'#fbbf24'}}>MAGI under ${(rothWindow.irmaaSafe).toLocaleString()}</strong> (MFJ 2025) to avoid first surcharge tier of ~$594/yr per person.
                </div>
              </div>
              <div style={{background:'rgba(96,165,250,.06)',border:'1px solid rgba(96,165,250,.2)',borderRadius:10,padding:14,marginBottom:16}}>
                <div style={{fontSize:12,color:'#60a5fa',fontWeight:700,marginBottom:8}}>📊 How Your Bracket Is Calculated Each Year</div>
                <div style={{fontSize:11,color:TXT2,lineHeight:1.8}}>
                  <strong style={{color:TXT1}}>Base Income</strong> = IRA withdrawals (gap funding) + 85% of SS + pension — <em>all taxable before conversion</em><br/>
                  <strong style={{color:TXT1}}>Room 12%</strong> = space remaining in 12% bracket after base income &amp; standard deduction<br/>
                  <strong style={{color:TXT1}}>Recommended</strong> = convert up to 12% ceiling, capped by IRMAA-safe limit<br/>
                  <strong style={{color:'#f97316'}}>Key insight:</strong> Converting into the 22% bracket now is better than paying 24%+ on forced RMDs at 73. Taxes on conversions are paid from your taxable brokerage account (~$13K/yr), preserving IRA and Roth balances intact.
                </div>
              </div>
              <div style={{overflowX:'auto',marginBottom:16}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{background:SURFACE2}}>
                    {['Year','Age','SS Income','IRA Draw','Base Inc','IRMAA-Safe Max','Your Plan','Room Left','Rate','MAGI','IRMAA Status'].map(function(h){
                      return <th key={h} style={{padding:'7px 10px',textAlign:h==='Year'||h==='IRMAA Status'?'left':'right',color:TXT2,fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:0.4,borderBottom:'1px solid '+BORDER,whiteSpace:'nowrap'}}>{h}</th>;
                    })}
                  </tr></thead>
                  <tbody>
                    {rothWindow.yearByYear.map(function(row,i){
                      var safe = row.irmaaStatus.includes('Safe');
                      var roomLeft = Math.max(0, row.irmaaSafeConv - (row.scheduledConv||0));
                      return (
                        <tr key={i} className="rr" style={{borderBottom:'1px solid '+BORDER}}>
                          <td style={{padding:'8px 10px',color:TXT1,fontWeight:700}}>{row.year}</td>
                          <td style={{padding:'8px 10px',textAlign:'right',color:TXT3}}>{row.age}</td>
                          <td style={{padding:'8px 10px',textAlign:'right',color:'#34d399'}}>{row.ssIncome>0?fmtC(row.ssIncome):'—'}</td>
                          <td style={{padding:'8px 10px',textAlign:'right',color:'#f97316'}}>{fmtC(row.iraWithdrawal)}</td>
                          <td style={{padding:'8px 10px',textAlign:'right',color:TXT1}}>{fmtC(row.baseIncome)}</td>
                          <td style={{padding:'8px 10px',textAlign:'right',color:'#fbbf24',fontWeight:600}}>{fmtC(row.irmaaSafeConv)}</td>
                          <td style={{padding:'8px 10px',textAlign:'right',color:'#a78bfa',fontWeight:700}}>{row.scheduledConv>0?fmtC(row.scheduledConv):'—'}</td>
                          <td style={{padding:'8px 10px',textAlign:'right',color:roomLeft>0?'#60a5fa':TXT3,fontSize:11}}>{roomLeft>0?fmtC(roomLeft):'—'}</td>
                          <td style={{padding:'8px 10px',textAlign:'right'}}><span style={{background:row.taxRate==='12%'?'rgba(96,165,250,.15)':'rgba(167,139,250,.15)',color:row.taxRate==='12%'?'#60a5fa':'#a78bfa',border:'1px solid '+(row.taxRate==='12%'?'rgba(96,165,250,.3)':'rgba(167,139,250,.3)'),borderRadius:4,padding:'1px 6px',fontSize:12,fontWeight:700}}>{row.taxRate}</span></td>
                          <td style={{padding:'8px 10px',textAlign:'right',color:TXT1}}>{fmtC(row.magi)}</td>
                          <td style={{padding:'8px 10px'}}><span style={{background:safe?'rgba(52,211,153,.15)':'rgba(248,113,113,.15)',color:safe?'#34d399':'#f87171',border:'1px solid '+(safe?'rgba(52,211,153,.3)':'rgba(248,113,113,.3)'),borderRadius:4,padding:'1px 6px',fontSize:12,fontWeight:700}}>{row.irmaaStatus}</span></td>
                        </tr>
                      );
                    })}
                    <tr style={{borderTop:'2px solid #334155',background:'rgba(167,139,250,.05)'}}>
                      <td colSpan={6} style={{padding:'8px 10px',color:TXT2,fontSize:11,fontWeight:700}}>YOUR SCHEDULED CONVERSIONS (5-year total)</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:'#a78bfa',fontWeight:700,fontSize:13}}>{fmtC(rothWindow.totalScheduled)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:'#60a5fa',fontSize:11}}>{fmtC(rothWindow.totalRecommended - rothWindow.totalScheduled)} unused room</td>
                      <td colSpan={3} style={{padding:'8px 10px',color:TXT2,fontSize:10}}>Max IRMAA-safe: {fmtC(rothWindow.totalRecommended)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ── SS STRATEGY TAB ─────────────────────────────────────────────── */}
        {activeTab === 'ss' && (
          <div>
            <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Social Security Strategy</h2>
            <p style={{fontSize:12,color:TXT2,marginBottom:16}}>Claiming age comparison · Stacey SS toggle · Roth Bridge analysis · Portfolio impact</p>

            {/* Stacey SS Toggle */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.2)',borderRadius:10,padding:'10px 16px'}}>
              <span style={{fontSize:12,color:TXT2,fontWeight:600}}>Stacey SS:</span>
              <button onClick={function(){setField('staceySS63',inp.staceySS63?0:1);}}
                style={{background:inp.staceySS63?'#a78bfa':'rgba(167,139,250,.15)',border:'1px solid #a78bfa',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:inp.staceySS63?'white':'#a78bfa',fontSize:11,fontWeight:700}}>
                Age 63 — $1,472/mo
              </button>
              <button onClick={function(){setField('staceySS63',inp.staceySS63?0:1);}}
                style={{background:!inp.staceySS63?'#60a5fa':'rgba(96,165,250,.15)',border:'1px solid #60a5fa',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:!inp.staceySS63?'white':'#60a5fa',fontSize:11,fontWeight:700}}>
                Age 67 — $1,879/mo
              </button>
              <span style={{fontSize:11,color:TXT3,marginLeft:8}}>
                {inp.staceySS63 ? 'Started Aug 2025 · Lower benefit · Immediate income' : 'Starts Aug 2029 · Higher benefit · Larger gap years'}
              </span>
            </div>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:14,marginBottom:22}}>
              <div>
                <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>SS Claiming Age Comparison</h2>
                <p style={{fontSize:12,color:TXT2,margin:0}}>Compare lifetime SS income and portfolio outcomes for every claiming age</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,background:SURFACE2,border:'1px solid '+BORDER,borderRadius:10,padding:'10px 16px'}}>
                <span style={{fontSize:12,color:TXT3,fontWeight:600}}>Compare age</span>
                <select value={ssCompareAge} onChange={function(e){setSsCompareAge(parseInt(e.target.value));}}
                  style={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:7,padding:'6px 10px',color:TXT1,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  {[62,63,64,65,66,67,68,69].map(function(a){return <option key={a} value={a}>Age {a}</option>;})}
                </select>
                <span style={{fontSize:12,color:TXT2}}>vs</span>
                <span style={{fontSize:13,color:'#a78bfa',fontWeight:700,background:'rgba(167,139,250,.15)',border:'1px solid rgba(167,139,250,.3)',borderRadius:6,padding:'6px 10px'}}>Age 70</span>
                {inpWithAssets.ssAge!==ssCompareAge&&inpWithAssets.ssAge!==70&&(
                  <span style={{fontSize:12,color:'#34d399',fontWeight:600,background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.25)',borderRadius:6,padding:'6px 10px'}}>+ Age {inpWithAssets.ssAge} (yours)</span>
                )}
              </div>
            </div>
            {be6770&&(
              <div style={{background:'linear-gradient(135deg,rgba(167,139,250,.12) 0%,rgba(96,165,250,.08) 100%)',border:'1px solid rgba(167,139,250,.3)',borderRadius:13,padding:20,marginBottom:20,display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
                <div style={{textAlign:'center',minWidth:100}}>
                  <div style={{fontFamily:PF,fontSize:36,color:'#a78bfa',fontWeight:700,lineHeight:1}}>{be6770}</div>
                  <div style={{fontSize:12,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:4}}>Breakeven Age<br/>67 → 70</div>
                </div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontSize:13,color:TXT1,fontWeight:600,marginBottom:6}}>Waiting from 67 to 70 costs {fmtC((inpWithAssets.ssMonthly/ssBenefitFactor(inpWithAssets.ssAge))*ssBenefitFactor(67)*12*3)} in foregone benefits</div>
                  <div style={{fontSize:12,color:TXT3,lineHeight:1.6}}>
                    But pays <span style={{color:'#34d399',fontWeight:700}}>{fmtC(((inpWithAssets.ssMonthly/ssBenefitFactor(inpWithAssets.ssAge))*(ssBenefitFactor(70)-ssBenefitFactor(67))*12))}/yr more</span> for life.
                    Live past age <span style={{color:'#a78bfa',fontWeight:700}}>{be6770}</span> and age 70 wins permanently.
                  </div>
                </div>
                <div style={{textAlign:'center',minWidth:120}}>
                  <div style={{fontSize:11,color:TXT2,marginBottom:6}}>Portfolio at {inpWithAssets.lifeExpectancy}</div>
                  <div style={{display:'flex',gap:12,justifyContent:'center'}}>
                    <div style={{textAlign:'center'}}><div style={{fontFamily:PF,fontSize:16,color:'#fbbf24',fontWeight:700}}>{fmtC(projA[projA.length-1]?.balance)}</div><div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5}}>Age {ssCompareAge}</div></div>
                    <div style={{textAlign:'center'}}><div style={{fontFamily:PF,fontSize:16,color:'#a78bfa',fontWeight:700}}>{fmtC(proj70[proj70.length-1]?.balance)}</div><div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5}}>Age 70</div></div>
                  </div>
                </div>
              </div>
            )}
            <div style={{...CARD,marginBottom:20}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:14,fontWeight:600}}>Benefit at Every Claiming Age</h3>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{background:SURFACE2}}>
                    {['Claim Age','% of FRA','Monthly','Annual','Lifetime SS (to '+inpWithAssets.lifeExpectancy+')','vs Age 67','Breakeven vs 67','Note'].map(function(h){
                      return <th key={h} style={{padding:'8px 11px',textAlign:h==='Claim Age'||h==='Note'?'left':'right',color:TXT2,fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,borderBottom:'1px solid '+BORDER,whiteSpace:'nowrap'}}>{h}</th>;
                    })}
                  </tr></thead>
                  <tbody>
                    {ssCompData.map(function(row,i){
                      var c = SS_COLORS[i]||'#94a3b8';
                      var isSelected = row.age===inpWithAssets.ssAge;
                      var isCompare = row.age===ssCompareAge;
                      var is70 = row.age===70;
                      return (
                        <tr key={row.age} className="rr" style={{borderBottom:'1px solid '+BORDER,background:isSelected?'rgba(16,185,129,.07)':isCompare?'rgba(251,191,36,.05)':is70?'rgba(167,139,250,.07)':'transparent'}}>
                          <td style={{padding:'9px 11px',color:c,fontWeight:700,display:'flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:2,background:c,display:'inline-block',flexShrink:0}}/>Age {row.age}</td>
                          <td style={{padding:'9px 11px',textAlign:'right',color:TXT3}}>{Math.round(ssBenefitFactor(row.age)*100)}%</td>
                          <td style={{padding:'9px 11px',textAlign:'right',color:'#34d399',fontWeight:700}}>{fmtFull(row.monthly)}/mo</td>
                          <td style={{padding:'9px 11px',textAlign:'right',color:TXT1,fontWeight:600}}>{fmtFull(row.annual)}/yr</td>
                          <td style={{padding:'9px 11px',textAlign:'right',color:c,fontWeight:700}}>{fmtC(row.lifetime)}</td>
                          <td style={{padding:'9px 11px',textAlign:'right'}}>{row.age===67?<span style={{color:TXT3}}>—</span>:<span style={{color:row.gainVs67>0?'#34d399':'#f87171',fontWeight:700}}>{row.gainVs67>0?'+':''}{fmtFull(row.gainVs67)}/yr</span>}</td>
                          <td style={{padding:'9px 11px',textAlign:'right'}}>{row.age<=67?<span style={{color:TXT3}}>—</span>:<span style={{color:'#fbbf24',fontWeight:700}}>Age {row.breakeven}</span>}</td>
                          <td style={{padding:'9px 11px'}}>
                            {isSelected&&<span style={{background:'rgba(16,185,129,.15)',color:'#34d399',border:'1px solid rgba(16,185,129,.3)',borderRadius:4,padding:'2px 6px',fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>Your Setting</span>}
                            {is70&&!isSelected&&<span style={{background:'rgba(167,139,250,.15)',color:'#a78bfa',border:'1px solid rgba(167,139,250,.3)',borderRadius:4,padding:'2px 6px',fontSize:11,fontWeight:700}}>Recommended</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{...CARD,marginBottom:20}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Cumulative SS Received Over Your Lifetime</h3>
              <p style={{fontSize:11,color:TXT2,marginBottom:16}}>Lines cross at the breakeven age — after that, higher-age strategy wins permanently</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cumSsChart.data} margin={{top:5,right:20,left:20,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                  <XAxis dataKey="age" stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <Tooltip content={<TTip/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:TXT2}}/>
                  {be6770&&<ReferenceLine x={be6770} stroke="#fbbf24" strokeDasharray="5 3" label={{value:'Breakeven '+be6770,fill:'#fbbf24',fontSize:11,fontWeight:700}}/>}
                  {cumSsChart.ages.map(function(ca,i){
                    var colors2=['#fbbf24','#34d399','#a78bfa'];
                    return <Line key={ca} type="monotone" dataKey={'ss'+ca} stroke={colors2[i]||'#94a3b8'} dot={false} strokeWidth={ca===70?2.5:ca===inpWithAssets.ssAge?2:1.5} name={'Claim '+ca}/>;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={CARD}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Portfolio Balance: Claim Age {ssCompareAge} vs 70 vs Roth Bridge</h3>
              <p style={{fontSize:11,color:TXT2,marginBottom:16}}>Roth Bridge (orange) = SS delayed to 70 + maximize conversions + Roth-funded gap. Starts lower, ends significantly higher.</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={portCompChart} margin={{top:5,right:20,left:20,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                  <XAxis dataKey="age" stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <Tooltip content={<TTip/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:TXT2}}/>
                  <Line type="monotone" dataKey="balA" stroke="#fbbf24" dot={false} strokeWidth={2} name={'Claim '+ssCompareAge}/>
                  <Line type="monotone" dataKey="bal70" stroke="#a78bfa" dot={false} strokeWidth={2.5} name="Claim 70"/>
                  {inpWithAssets.ssAge!==ssCompareAge&&inpWithAssets.ssAge!==70&&
                    <Line type="monotone" dataKey="balCur" stroke="#34d399" dot={false} strokeWidth={2} name={'Claim '+inpWithAssets.ssAge+' (yours)'}/>
                  }
                  <Line type="monotone" dataKey="balBridge" stroke="#f97316" dot={false} strokeWidth={3} strokeDasharray="6 3" name="Roth Bridge (SS@70 + Max Conv)"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── ROTH BRIDGE STRATEGY PANEL ─────────────────────────────────── */}
            <div style={Object.assign({},CARD,{border:'2px solid rgba(249,115,22,0.4)',background:'rgba(249,115,22,0.03)'})}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <div style={{width:14,height:14,borderRadius:'50%',background:'#f97316'}}/>
                <h3 style={{fontFamily:PF,fontSize:16,color:'#f97316',fontWeight:700,margin:0}}>Roth Bridge Strategy: SS@70 + Maximize Conversions</h3>
              </div>
              <p style={{fontSize:12,color:TXT2,marginBottom:20,lineHeight:1.6}}>
                Delay SS to 70 (+24% benefit for life). Fund living expenses from your Roth during the 3-year gap (tax-free withdrawals).
                Keep IRA draws minimal to open maximum Roth conversion room — up to the IRMAA Tier 1 limit each year.
                Conversion taxes paid from taxable brokerage (~$23K/yr).
              </p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {[
                  {label:'SS Benefit at 70',val:'$'+Math.round((inpWithAssets.ssMonthly/ssBenefitFactor(inpWithAssets.ssAge))*ssBenefitFactor(70)).toLocaleString()+'/mo',sub:'vs $'+inpWithAssets.ssMonthly.toLocaleString()+' at '+inpWithAssets.ssAge,color:'#f97316'},
                  {label:'Roth at Age 90',val:fmtC(projRothBridge[projRothBridge.length-1]?.rothBal),sub:'vs '+fmtC(proj70[proj70.length-1]?.balance)+' (SS@70 only)',color:'#34d399'},
                  {label:'IRA at Age 73',val:fmtC(projRothBridge.find(function(r){return r.age===73;})?.iraBal||0),sub:'RMD ~'+fmtC((projRothBridge.find(function(r){return r.age===73;})?.iraBal||0)/26.5)+'/yr',color:'#60a5fa'},
                  {label:'Total at Age 90',val:fmtC(projRothBridge[projRothBridge.length-1]?.balance),sub:'Bridge advantage',color:'#a78bfa'},
                ].map(function(m){return(
                  <div key={m.label} style={{background:SURFACE2,border:'1px solid '+BORDER,borderRadius:10,padding:14,textAlign:'center'}}>
                    <div style={{fontSize:12,color:TXT3,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>{m.label}</div>
                    <div style={{fontFamily:PF,fontSize:18,color:m.color,fontWeight:700}}>{m.val}</div>
                    <div style={{fontSize:12,color:TXT2,marginTop:3}}>{m.sub}</div>
                  </div>
                );})}
              </div>

              {/* Year-by-year bridge table */}
              <h4 style={{fontFamily:PF,fontSize:13,color:TXT1,fontWeight:700,marginBottom:6}}>Bridge Period Detail (2027–2033)</h4>
              <p style={{fontSize:11,color:TXT2,marginBottom:10}}>Sequencing: Bucket 1 covers expenses first → Roth fills remainder (capped ~$42K/yr) → minimal IRA draw preserves conversion room</p>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid '+BORDER}}>
                      {['Year','Age','SS Income','Expenses','From B1','From Roth','IRA Draw','Conversion','Conv Tax','MAGI','IRMAA?','B1 Bal','Roth Bal','IRA Bal'].map(function(h){
                        return <th key={h} style={{padding:'6px 8px',textAlign:'right',color:TXT3,fontWeight:600,fontSize:12,textTransform:'uppercase',letterSpacing:0.3,whiteSpace:'nowrap'}}>{h}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {projRothBridge.filter(function(r){return r.age>=67&&r.age<=73;}).map(function(r,i){
                      var isBridge = r.age < 70;
                      var irmaaHit = r.magi > 212000;
                      return (
                        <tr key={r.age} style={{borderBottom:'1px solid '+BORDER,background:isBridge?'rgba(249,115,22,0.04)':i%2===0?SURFACE:SURFACE2}}>
                          <td style={{padding:'7px 8px',color:TXT2,fontWeight:600}}>{r.age+(2027-67)}</td>
                          <td style={{padding:'7px 8px',color:TXT2}}>{r.age}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:r.ssIncome>0?'#34d399':TXT3}}>{r.ssIncome>0?fmtC(r.ssIncome):'—'}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:TXT1}}>{fmtC(r.expenses)}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:'#34d399',fontWeight:600}}>{r.fromB1>0?fmtC(r.fromB1):'—'}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:r.rothDraw>0?'#f97316':TXT3,fontWeight:r.rothDraw>0?700:400}}>{r.rothDraw>0?fmtC(r.rothDraw):'—'}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:TXT2}}>{fmtC(r.iraDraw)}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:'#a78bfa',fontWeight:600}}>{r.convAmt>0?fmtC(r.convAmt):'—'}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:TXT2}}>{r.convTax>0?fmtC(r.convTax):'—'}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:irmaaHit?'#f87171':'#34d399',fontWeight:600}}>{fmtC(r.magi)}</td>
                          <td style={{padding:'7px 8px',textAlign:'center'}}><span style={{color:irmaaHit?'#f87171':'#34d399',fontWeight:700,fontSize:12}}>{irmaaHit?'⚠️ Hit':'✓ Safe'}</span></td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:'#2dd4bf'}}>{fmtC(r.b1Bal)}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:'#f97316',fontWeight:600}}>{fmtC(r.rothBal)}</td>
                          <td style={{padding:'7px 8px',textAlign:'right',color:'#60a5fa'}}>{fmtC(r.iraBal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tradeoff summary */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:16}}>
                <div style={{background:'rgba(52,211,153,0.06)',border:'1px solid rgba(52,211,153,0.25)',borderRadius:8,padding:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#34d399',marginBottom:6}}>✓ ADVANTAGES</div>
                  {['SS benefit +24% for life ($'+Math.round((inpWithAssets.ssMonthly/ssBenefitFactor(inpWithAssets.ssAge))*(ssBenefitFactor(70)-ssBenefitFactor(inpWithAssets.ssAge))*12).toLocaleString()+'/yr extra)',
                    'Spouse survivor benefit also elevated',
                    'IRA balance near zero by 73 — minimal RMDs',
                    'Roth grows tax-free with no RMDs ever',
                    'Breakeven ~age 82.5 — very achievable'].map(function(t){
                    return <div key={t} style={{fontSize:11,color:TXT1,marginBottom:3,display:'flex',gap:6}}><span style={{color:'#34d399',flexShrink:0}}>•</span>{t}</div>;
                  })}
                </div>
                <div style={{background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:8,padding:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#f87171',marginBottom:6}}>⚠ TRADEOFFS</div>
                  {['Roth drawn down ~$300K during bridge years (less early compounding)',
                    'Brokerage exhausted by ~age 71 paying conv taxes',
                    'Lower liquid cash 2027–2029 — tighter bridge period',
                    'Requires health to live past breakeven age 82',
                    'Less "feel rich early" if that\'s a priority'].map(function(t){
                    return <div key={t} style={{fontSize:11,color:TXT1,marginBottom:3,display:'flex',gap:6}}><span style={{color:'#f87171',flexShrink:0}}>•</span>{t}</div>;
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'legacy' && (
          <div>
            <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Legacy & Estate Planning</h2>
            <p style={{fontSize:12,color:TXT2,marginBottom:20}}>Projected estate value · Roth inheritance advantage · charitable giving potential</p>

            {/* Legacy goal tracker */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22}}>
              {(function(){
                var finalBal = cashFlow.length>0?cashFlow[cashFlow.length-1].balance:0;
                var finalRoth = cashFlow.length>0?cashFlow[cashFlow.length-1].rothBalance:0;
                var finalIRA = cashFlow.length>0?cashFlow[cashFlow.length-1].iraBalance:0;
                var legacyGoal = inpWithAssets.legacyGoal||500000;
                var onTrack = finalBal >= legacyGoal;
                return [
                  {label:'Projected Estate at '+inpWithAssets.lifeExpectancy,val:fmtC(finalBal),color:'#34d399',sub:'Total portfolio balance'},
                  {label:'Tax-Free Roth Inheritance',val:fmtC(finalRoth),color:'#a78bfa',sub:'No RMDs for inherited Roth*'},
                  {label:'Pre-Tax IRA to Heirs',val:fmtC(finalIRA),color:'#60a5fa',sub:'Heirs pay ordinary income tax'},
                  {label:'Legacy Goal',val:fmtC(legacyGoal),color:onTrack?'#34d399':'#f87171',sub:onTrack?'✓ On track':'⚠ Below goal'},
                  {label:'Estate Surplus / Gap',val:fmtC(Math.abs(finalBal-legacyGoal)),color:onTrack?'#34d399':'#f87171',sub:onTrack?'Above legacy goal':'Below legacy goal'},
                  {label:'Lifetime HC Burden',val:fmtC(cashFlow.reduce(function(s,r){return s+(r.healthcare||0);},0)),color:'#fb923c',sub:'Total inflated healthcare cost'},
                ].map(function(item){
                  return (
                    <div key={item.label} style={{background:item.color+'10',border:'1px solid '+item.color+'25',borderRadius:12,padding:16,textAlign:'center'}}>
                      <div style={{fontFamily:PF,fontSize:22,color:item.color,fontWeight:700,marginBottom:4}}>{item.val}</div>
                      <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{item.label}</div>
                      <div style={{fontSize:11,color:TXT3}}>{item.sub}</div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Legacy goal slider */}
            <div style={{...CARD,marginBottom:20}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:14,fontWeight:600}}>Set Your Legacy Goal</h3>
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:8}}>
                <input type="range" min={0} max={3000000} step={50000} value={inp.legacyGoal||500000}
                  onChange={function(e){setField('legacyGoal',e.target.value);}}
                  style={{flex:1,accentColor:'#a78bfa'}}/>
                <span style={{fontFamily:PF,fontSize:20,color:'#a78bfa',fontWeight:700,minWidth:90,textAlign:'right'}}>{fmtC(inp.legacyGoal||500000)}</span>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {[0,250000,500000,1000000,2000000].map(function(preset){
                  return <button key={preset} onClick={function(){setField('legacyGoal',String(preset));}} style={{background:SURFACE2,border:'1px solid '+BORDER,borderRadius:6,padding:'5px 12px',cursor:'pointer',fontSize:11,color:TXT2,fontWeight:600}}>{preset===0?'None':fmtC(preset)}</button>;
                })}
              </div>
            </div>

            {/* Estate balance chart */}
            <div style={{...CARD,marginBottom:20}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:4,fontWeight:600}}>Estate Value Over Time</h3>
              <p style={{fontSize:11,color:TXT2,marginBottom:14}}>Total, Roth (tax-free), and IRA (pre-tax) balance trajectories to age {inpWithAssets.lifeExpectancy}</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cashFlow} margin={{top:10,right:20,left:20,bottom:0}}>
                  <defs>
                    <linearGradient id="gleg1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/><stop offset="95%" stopColor="#34d399" stopOpacity={0.02}/></linearGradient>
                    <linearGradient id="gleg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/><stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02}/></linearGradient>
                    <linearGradient id="gleg3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25}/><stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                  <XAxis dataKey="age" stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:12,fill:TXT3}}/>
                  <Tooltip content={<TTip/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:TXT2}}/>
                  {(inp.legacyGoal||0)>0&&<ReferenceLine y={inp.legacyGoal||500000} stroke="#a78bfa" strokeDasharray="5 3" label={{value:'Legacy Goal',fill:'#a78bfa',fontSize:11,fontWeight:700}}/>}
                  <Area type="monotone" dataKey="balance" stroke="#34d399" fill="url(#gleg1)" strokeWidth={2.5} name="Total Estate"/>
                  <Area type="monotone" dataKey="rothBalance" stroke="#a78bfa" fill="url(#gleg2)" strokeWidth={2} name="Roth (Tax-Free)"/>
                  <Area type="monotone" dataKey="iraBalance" stroke="#60a5fa" fill="url(#gleg3)" strokeWidth={2} name="IRA (Pre-Tax)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Charitable giving / QCD strategy */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div style={{...CARD,border:'1px solid rgba(52,211,153,.25)',background:'rgba(52,211,153,.04)'}}>
                <h3 style={{fontFamily:PF,fontSize:14,color:'#34d399',marginBottom:12,fontWeight:600}}>QCD Strategy (Charitable)</h3>
                <div style={{fontSize:12,color:TXT2,lineHeight:1.7,marginBottom:12}}>
                  Qualified Charitable Distributions from your IRA at age {inpWithAssets.qcdStartAge}+ count toward RMDs and are <strong style={{color:'#34d399'}}>excluded from taxable income</strong> — better than a deduction.
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    ['QCD Per Year',fmtC(inpWithAssets.qcdAmount),'#34d399'],
                    ['Start Age',String(inpWithAssets.qcdStartAge),'#60a5fa'],
                    ['Lifetime QCDs',fmtC(inpWithAssets.qcdAmount*Math.max(0,inpWithAssets.lifeExpectancy-inpWithAssets.qcdStartAge)),'#a78bfa'],
                    ['Tax Avoided',fmtC(inpWithAssets.qcdAmount*Math.max(0,inpWithAssets.lifeExpectancy-inpWithAssets.qcdStartAge)*0.22),'#fbbf24'],
                  ].map(function(m){return(
                    <div key={m[0]} style={{background:m[2]+'15',borderRadius:7,padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontFamily:PF,fontSize:16,color:m[2],fontWeight:700}}>{m[1]}</div>
                      <div style={{fontSize:11,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginTop:2}}>{m[0]}</div>
                    </div>
                  );})}
                </div>
              </div>
              <div style={{...CARD,border:'1px solid rgba(167,139,250,.25)',background:'rgba(167,139,250,.04)'}}>
                <h3 style={{fontFamily:PF,fontSize:14,color:'#a78bfa',marginBottom:12,fontWeight:600}}>Inherited Roth Advantage</h3>
                <div style={{fontSize:12,color:TXT2,lineHeight:1.7,marginBottom:12}}>
                  Beneficiaries inherit Roth tax-free and have 10 years to distribute. IRA funds face ordinary income tax on all distributions. Maximizing Roth via conversions now creates a superior inheritance.
                </div>
                <div style={{background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.25)',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:12,color:'#a78bfa',fontWeight:700,marginBottom:4}}>After-Tax Value to Heirs (est.)</div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:11,color:TXT2}}>Roth ({fmtC(cashFlow.length>0?cashFlow[cashFlow.length-1].rothBalance:0)})</span>
                    <span style={{fontSize:12,color:'#a78bfa',fontWeight:700}}>{fmtC(cashFlow.length>0?cashFlow[cashFlow.length-1].rothBalance:0)} <span style={{fontSize:10}}>(100% tax-free)</span></span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,color:TXT2}}>IRA ({fmtC(cashFlow.length>0?cashFlow[cashFlow.length-1].iraBalance:0)})</span>
                    <span style={{fontSize:12,color:'#60a5fa',fontWeight:700}}>{fmtC((cashFlow.length>0?cashFlow[cashFlow.length-1].iraBalance:0)*0.78)} <span style={{fontSize:10}}>(~22% tax haircut)</span></span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{background:'rgba(251,146,60,.07)',border:'1px solid rgba(251,146,60,.25)',borderRadius:10,padding:'12px 16px',fontSize:12,color:TXT3,lineHeight:1.6}}>
              <strong style={{color:'#fb923c'}}>Estate Note:</strong> Balances shown are pre-tax IRA amounts. All IRA withdrawals by heirs are taxed as ordinary income. Consider consulting an estate attorney about beneficiary designations, trust structures, and the SECURE Act 10-year rule for inherited IRAs.
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div>
            <h2 style={{fontFamily:PF,fontSize:22,color:'#000000',marginBottom:20,fontWeight:800}}>Plan Settings</h2>
            <div style={{background:'rgba(96,165,250,.07)',border:'1px solid rgba(96,165,250,.2)',borderRadius:10,padding:'11px 16px',marginBottom:20,fontSize:12,color:TXT3}}>
              <strong style={{color:'#60a5fa'}}>Note:</strong> Portfolio balances below are auto-calculated from your asset holdings on the Assets tab. To change individual holdings, use the <button onClick={function(){setActiveTab('assets');}} style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',textDecoration:'underline',fontSize:12,padding:0}}>Current Assets tab</button>.
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:24}}>
              {[
                {title:'Personal',fields:[['Current Age','currentAge',1],['Retirement Age','retirementAge',1],['Life Expectancy','lifeExpectancy',1],['Monthly Expenses','monthlyExpenses',100]]},
                {title:'Portfolio Summary',isPortfolioSummary:true},
                {title:'Income',fields:[['Your SS FRA (age 67)','ssFRA',50],['Your SS Claim Age','ssAge',1],['SS COLA %','ssCola',0.1],['Spouse Current Age','spouseCurrentAge',1],['Stacey SS at 63 (net)','spouseSSAt63',50],['Stacey SS at 67 (net)','spouseSSAt67',50],['Spouse SS Age','spouseSSAge',1],['Pension Monthly','pensionMonthly',50],['Part-Time Income/yr','partTimeIncome',1000],['Part-Time Years','partTimeYears',1],['Severance Net','severanceNet',500]]},
                {title:'Tax Strategy',fields:[['Conv 2027','conv2027',5000],['Conv 2028','conv2028',5000],['Conv 2029','conv2029',5000],['Conv 2030','conv2030',5000],['Conv 2031','conv2031',5000],['QCD/yr','qcdAmount',500],['QCD Start Age','qcdStartAge',1],['State Tax Rate %','stateTaxRate',0.1]]},
                {title:'Healthcare',fields:[['Phase 1 Annual $','healthPhase1Annual',500],['Phase 1 End Age','healthPhase1EndAge',1],['Phase 2 Annual $','healthPhase2Annual',500],['HC Inflation %','healthInflation',0.01]]},
                {title:'Return Rates',fields:[['Cash/CD/T-Bill %','cashReturnRate',0.1],['TIPS Real Return %','tipsRealReturn',0.1],['Dividend ETF Total %','dividendReturnRate',0.1],['Growth Equity %','growthReturnRate',0.1],['Roth Growth %','rothReturnRate',0.1],['CAPE Ratio','capeRatio',0.5],['10Y Treasury %','tenYrTreasury',0.1],['TIPS Yield %','tipsYield',0.1]]},
                {title:'Expense Breakdown',fields:[['Housing/HOA Monthly','housingMonthly',50],['Food Monthly','foodMonthly',50],['Transport Monthly','transportMonthly',25],['Travel Monthly','travelMonthly',50],['Other Monthly','otherMonthly',50]]},
                {title:'Legacy & Estate',fields:[['Legacy Goal $','legacyGoal',10000],['Extra Spend 2027','extraSpend2027',1000],['Extra Spend 2028','extraSpend2028',1000]]}
              ].map(function(section){
                return (
                  <div key={section.title}>
                    <h3 style={{fontSize:12,color:'#10b981',marginBottom:12,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{section.title}</h3>
                    {section.title==='Tax Strategy'&&(
                      <div style={{marginBottom:12}}>
                        <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Filing Status</label>
                        <select value={inp.filingStatus} onChange={function(e){setField('filingStatus',e.target.value);}} style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:7,padding:'8px 11px',color:TXT1,fontSize:12,boxSizing:'border-box'}}>
                          <option value="married">Married Filing Jointly</option>
                          <option value="single">Single</option>
                        </select>
                        <div style={{marginTop:10,background:inp.survivorMode?'rgba(248,113,113,.08)':'rgba(96,165,250,.05)',border:'1px solid '+(inp.survivorMode?'rgba(248,113,113,.3)':'rgba(96,165,250,.15)'),borderRadius:8,padding:'10px 12px'}}>
                          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                            <input type="checkbox" checked={!!inp.survivorMode} onChange={function(e){setField('survivorMode',e.target.checked?1:0);}} style={{accentColor:'#f87171'}}/>
                            <div>
                              <div style={{fontSize:12,color:inp.survivorMode?'#f87171':'#60a5fa',fontWeight:700}}>Survivor Mode (Widow's Penalty)</div>
                              <div style={{fontSize:12,color:TXT3,marginTop:2}}>Uses Single brackets, survivor gets higher of the two SS benefits only. Models post-spouse scenario.</div>
                            </div>
                          </label>
                        </div>
                        <div style={{marginTop:10,background:inp.staceySS63?'rgba(167,139,250,.08)':'rgba(96,165,250,.05)',border:'1px solid '+(inp.staceySS63?'rgba(167,139,250,.3)':'rgba(96,165,250,.15)'),borderRadius:8,padding:'10px 12px'}}>
                          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                            <input type="checkbox" checked={!!inp.staceySS63} onChange={function(e){setField('staceySS63',e.target.checked?1:0);}} style={{accentColor:'#a78bfa'}}/>
                            <div>
                              <div style={{fontSize:12,color:inp.staceySS63?'#a78bfa':'#60a5fa',fontWeight:700}}>Stacey Claims SS at 63 ($1,472/mo net)</div>
                              <div style={{fontSize:12,color:TXT3,marginTop:2}}>If unchecked, Stacey waits to 67 ($1,879/mo net). Toggle to compare impact on cash flow and long-range projections.</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                    {section.isPortfolioSummary?(
                      <div>
                        <div style={{background:SURFACE2,border:'1px solid #1e3a5f',borderRadius:10,padding:14,marginBottom:8}}>
                          {[['Taxable',derivedTotals.taxable,'#34d399'],['IRA Cash/CD',derivedTotals.iraCash,'#34d399'],['IRA TIPS',derivedTotals.iraTips,'#60a5fa'],['IRA Dividend',derivedTotals.iraDividend,'#fbbf24'],['IRA Growth',derivedTotals.iraGrowth,'#a78bfa'],['Roth',derivedTotals.roth,'#a78bfa']].map(function(item){
                            return (
                              <div key={item[0]} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                                <span style={{fontSize:11,color:TXT2}}>{item[0]}</span>
                                <span style={{fontSize:12,color:item[2],fontWeight:700}}>{fmtC(item[1])}</span>
                              </div>
                            );
                          })}
                          <div style={{borderTop:'1px solid #1e3a5f',paddingTop:8,display:'flex',justifyContent:'space-between'}}>
                            <span style={{fontSize:11,color:TXT2,fontWeight:700}}>Total</span>
                            <span style={{fontFamily:PF,fontSize:15,color:'#10b981',fontWeight:700}}>{fmtC(totalPort)}</span>
                          </div>
                        </div>
                        <button onClick={function(){setActiveTab('assets');}} style={{width:'100%',background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.3)',borderRadius:7,padding:'9px',color:'#34d399',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                          <Edit2 size={12}/> Edit Holdings on Assets Tab
                        </button>
                      </div>
                    ):section.fields?section.fields.map(function(f){
                      return (
                        <div key={f[1]} style={{marginBottom:11}}>
                          <label style={{fontSize:11,color:TXT2,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{f[0]}</label>
                          <input type="number" step={f[2]} className="ri"
                            value={raw[f[1]]!==undefined?raw[f[1]]:inp[f[1]]}
                            onChange={function(e){setField(f[1],e.target.value);}}
                            onBlur={function(e){if(e.target.value===''||e.target.value==='-')setField(f[1],'0');}}
                            style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:7,padding:'8px 11px',color:TXT1,fontSize:12,boxSizing:'border-box',transition:'border-color .2s'}}/>
                        </div>
                      );
                    }):null}
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:24,display:'flex',gap:10}}>
              <button onClick={function(){setShowModal(true);}} style={{display:'flex',alignItems:'center',gap:6,background:'#065f46',border:'none',borderRadius:8,padding:'10px 18px',color:'#34d399',cursor:'pointer',fontSize:12,fontWeight:600}}><Save size={13}/> Save Scenario</button>
              <button onClick={function(){loadScen({name:'Base Case',data:DEFAULTS,assets:DEFAULT_ASSETS,bucketCfg:DEFAULT_BUCKET_CONFIG,date:new Date().toLocaleDateString()});}} style={{display:'flex',alignItems:'center',gap:6,background:'#374151',border:'none',borderRadius:8,padding:'10px 18px',color:TXT3,cursor:'pointer',fontSize:12,fontWeight:600}}><RefreshCw size={13}/> Reset to Defaults</button>
            </div>

            {/* ── Scenarios (merged) ─────────────────────────── */}
            <div style={{marginTop:28}}>
              <h3 style={{fontSize:12,color:'#10b981',marginBottom:12,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Saved Scenarios</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,marginBottom:12}}>
                {scenarios.map(function(s){
                  return (
                    <div key={s.name} style={{background:activeScen===s.name?'rgba(5,150,105,.08)':SURFACE2,border:'1px solid '+(activeScen===s.name?'rgba(5,150,105,.4)':BORDER),borderRadius:10,padding:14}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <span style={{fontSize:13,color:activeScen===s.name?'#34d399':TXT1,fontWeight:600}}>{s.name}</span>
                        {activeScen===s.name&&<span style={{background:'rgba(16,185,129,.2)',color:'#34d399',borderRadius:4,padding:'1px 6px',fontSize:11,fontWeight:700}}>Active</span>}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={function(){loadScen(s);}} style={{flex:1,background:'#065f46',border:'none',borderRadius:6,padding:'6px',color:'#34d399',cursor:'pointer',fontSize:11,fontWeight:600}}>Load</button>
                        {s.name!=='Base Case'&&<button onClick={function(){setScenarios(function(prev){return prev.filter(function(x){return x.name!==s.name;});});}} style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:6,padding:'6px 10px',color:'#f87171',cursor:'pointer',fontSize:11}}>Del</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}




      </div>

      <div style={{marginTop:16,textAlign:'center'}}>
        <p style={{fontSize:11,color:TXT3,margin:0}}>RetireStrong Pro v1.0 · {fmtC(totalPort)} · Active: {activeScen}{inp.survivorMode?' · ⚠️ SURVIVOR MODE':''}{inp.staceySS63?' · Stacey SS@63':''} · {(function(){
          if (dbStatus==='saving') return '🟡 Saving…';
          if (dbStatus==='saved')  return '✅ Saved';
          if (dbStatus==='error')  return '🔴 Save failed' + (lastSaveErr ? ' — '+lastSaveErr : '');
          if (dbStatus==='live')   return '🟢 Live DB';
          if (dbStatus==='loading')return '⏳ Loading…';
          return '🟡 Offline';
        })()}</p>
        <p style={{fontSize:12,color:'#94a3b8',marginTop:3}}>Planning tool only. Consult a financial advisor for personalized guidance.</p>
      </div>
    </div>
  );
}