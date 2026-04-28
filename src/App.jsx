import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Chart, ArcElement, DoughnutController, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip as ChartTooltip } from 'chart.js';
Chart.register(ArcElement, DoughnutController, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, ChartTooltip);
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, LineChart, Line, ReferenceLine } from 'recharts';
import { TrendingUp, DollarSign, Activity, FileText, Settings, BarChart3, Coins, AlertCircle, CheckCircle, Layers, Grid, Save, RefreshCw, Zap, Plus, Trash2, Edit2, X, MoveRight, Sparkles, Loader, Heart, Target, ArrowDownUp, Calendar } from 'lucide-react';
import SettingsTab from './components/tabs/Settings';
import AssetsTab from './components/tabs/Assets';
import { fetchHoldings, fetchAiInsights as apiFetchAiInsights } from './api.js';
import { RMD_TABLE, getRMD, MFJ, SGL, STD_DED, ASSET_TYPES, RISK_LEVELS, ACCOUNT_TYPES, RISK_C, TYPE_C, DEFAULT_ASSETS, DEFAULT_BUCKET_CONFIG, DEFAULTS } from './engine/constants.js';
import { resolveStatus, marginalRate, effectiveTax, totalTaxWithState, combinedMarginalRate, capeBased } from './engine/tax.js';
import { ssBenefitFactor, ssIncomeForYear, primarySSForYear, spouseSSForYear } from './engine/social-security.js';
import { rothConvForYear, applyRothConversion, conversionTax, applyQCD } from './engine/roth.js';
import { buildCashFlow } from './engine/cashflow.js';
import { runMonteCarlo } from './engine/montecarlo.js';
import { fmtC, fmtFull, fmtPct } from './engine/format.js';
import { flattenPlan, buildPlan } from './data/planAdapter.js';
import { saveAllDurable, saveProfile, saveSocialSecurity, saveRothPlan, saveHealthcare, saveExpenses, saveQCD } from './data/domainSave.js';
import MonteCarloTab    from './components/tabs/MonteCarlo.jsx';
import CashFlowTab      from './components/tabs/CashFlow.jsx';
import RothConversionsTab from './components/tabs/RothConversions.jsx';
import SCENARIO_PRESETS from './data/scenarioPresets.js';
import PortfolioPage from './components/tabs/PortfolioPage.jsx';
import SpendingTab from './components/tabs/SpendingTab.jsx';
import AppShell from './components/shell/AppShell.jsx';
import Sidebar from './components/shell/Sidebar.jsx';
import AIInsightsRail from './components/shell/AIInsightsRail.jsx';
import OverviewPage from './components/overview/OverviewPage.jsx';
import OnboardingWizard from './components/onboarding/OnboardingWizard.jsx';
import { useAuth } from './context/AuthContext.jsx';

var PF = "'Playfair Display', serif";
var SS_FONT = "'Source Sans 3', sans-serif";

// ── Light theme tokens ─────────────────────────────────────────────────────────
var BG       = '#e8edf3';       // page background
var SURFACE  = '#ffffff';       // card / panel surface
var SURFACE2 = '#f1f5f9';       // secondary surface
var BORDER   = '#cbd5e1';       // subtle border
var BORDER2  = '#94a3b8';       // stronger border
var TXT1     = '#000000';       // primary text
var TXT2     = '#111111';       // secondary text
var TXT3     = '#333333';       // muted text
var ACCENT   = '#059669';       // emerald green primary
var ACCENT2  = '#d1fae5';       // light emerald tint
var SHADOW   = '0 2px 6px rgba(0,0,0,.15), 0 4px 20px rgba(0,0,0,.12)';

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
  var spouseClaimAge = inp.spouseEarlyClaim ? 63 : (inp.spouseSSAge || 67);
  var spouseMonthly = inp.spouseEarlyClaim ? (inp.spouseSSAt63 || 1472) : (inp.spouseSSAt67 || 1879);
  var status = resolveStatus(inp);
  var stRate = inp.stateTaxRate || 2.5;
  var ssStartYear = (inp.birthYear || 1959) + ssClaimAge;
  var spouseStartYear = (inp.spouseBirthYear || 1962) + spouseClaimAge;
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
    // v13: SS with birth-year-based start and partial first year
    if (calYear === ssStartYear) {
      income += ssMonthlyAtAge * 2; // Nov+Dec
    } else if (calYear > ssStartYear) {
      var ssColaYrs = calYear - ssStartYear;
      income += ssMonthlyAtAge * Math.pow(1 + ssCola, ssColaYrs) * 12;
    }
    // v13: Spouse SS with actual net figures
    if (inp.hasSpouse && !inp.survivorMode) {
      if (calYear === spouseStartYear) income += spouseMonthly * 5;
      else if (calYear > spouseStartYear) {
        var spCola = calYear - spouseStartYear;
        income += spouseMonthly * Math.pow(1 + ssCola, spCola) * 12;
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
  var spouseBridgeMonthly = inp.spouseEarlyClaim ? (inp.spouseSSAt63 || 1472) : (inp.spouseSSAt67 || 1879);
  var spouseBridgeClaimAge = inp.spouseEarlyClaim ? 63 : (inp.spouseSSAge || 67);
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
    // v13: SS with birth-year-based start
    var calYrBridge = 2026 + y;
    var ssStartYear = (inp.birthYear || 1959) + ssBridgeAge;
    var ssInc = 0;
    if (calYrBridge === ssStartYear) ssInc = ss70Monthly * 2;
    else if (calYrBridge > ssStartYear) {
      var ssColaYrs = calYrBridge - ssStartYear;
      ssInc = ss70Monthly * Math.pow(1 + ssCola, ssColaYrs) * 12;
    }
    // v13: Spouse SS with actual net figures
    var spouseStartYear = (inp.spouseBirthYear || 1962) + spouseBridgeClaimAge;
    var spSS = 0;
    if (inp.hasSpouse && !inp.survivorMode) {
      if (calYrBridge === spouseStartYear) spSS = spouseBridgeMonthly * 5;
      else if (calYrBridge > spouseStartYear) {
        var spColaYrs2 = calYrBridge - spouseStartYear;
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

// ── Dashboard helper: draw a semicircle gas gauge on a canvas ──────────────
function drawGauge(canvas, pct, color) {
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  var W = 110, H = 66;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  var cx = W / 2, cy = H - 6, r = 44;
  // Track
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke();
  // Fill (cap at 110% visually)
  var fill = Math.min(pct, 1.1);
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * (1 + fill), false);
  ctx.strokeStyle = color; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke();
  // Label
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(Math.round(pct * 100) + '%', cx, cy - 18);
}

// ── DashboardTab component ────────────────────────────────────────────────
function DashboardTab(props) {
  var authCtx = useAuth();
  var authUser = authCtx ? authCtx.user : null;
  var planLabel = (authUser && authUser.name) ? authUser.name : 'Your Plan';
  var derivedTotals = props.derivedTotals;
  var bucketCfg = props.bucketCfg;
  var totalPort = props.totalPort;
  var assets = props.assets;
  var successRate = props.successRate;
  var mcPercentiles = props.mcPercentiles;
  var cashFlow = props.cashFlow;
  var inp = props.inp;
  var dataSource = props.dataSource;
  var setActiveTab = props.setActiveTab;

  // Canvas refs
  var donutRef = useRef(null);
  var gauge1Ref = useRef(null);
  var gauge2Ref = useRef(null);
  var gauge3Ref = useRef(null);
  var mcRef = useRef(null);
  var cfRef = useRef(null);
  var donutChartRef = useRef(null);
  var mcChartRef = useRef(null);
  var cfChartRef = useRef(null);

  // Asset class totals from actual holdings
  var byClass = useMemo(function() {
    var cash = 0, tips = 0, div = 0, equity = 0, intl = 0;
    assets.forEach(function(a) {
      var t = a.type || '';
      if (t === 'Cash' || t === 'CD' || t === 'T-Note' || t === 'T-Bill' || t === 'I-Bond') cash += a.amount;
      else if (t === 'TIPS' || t === 'Bond ETF') tips += a.amount;
      else if (t === 'Dividend ETF' || t === 'REIT ETF') div += a.amount;
      else if (t === 'Equity ETF') equity += a.amount;
      else if (t === 'Intl Equity') intl += a.amount;
    });
    return { cash, tips, div, equity, intl };
  }, [assets]);

  // Account totals
  var byAccount = useMemo(function() {
    var taxable = 0, ira = 0, roth = 0;
    assets.forEach(function(a) {
      var acct = a.account || '';
      if (acct === 'Taxable') taxable += a.amount;
      else if (acct === 'IRA') ira += a.amount;
      else if (acct === 'Roth IRA' || acct === 'Roth 401k') roth += a.amount;
    });
    return { taxable, ira, roth };
  }, [assets]);

  // Bucket targets from bucketCfg
  var b1cfg = bucketCfg.find(function(b) { return b.id === 1; }) || { target: 259000 };
  var b2cfg = bucketCfg.find(function(b) { return b.id === 2; }) || { target: 569000 };
  var b3cfg = bucketCfg.find(function(b) { return b.id === 3; }) || { target: 820500 };
  var b1actual = assets.filter(function(a) { return a.bucket === 1; }).reduce(function(s, a) { return s + a.amount; }, 0);
  var b2actual = assets.filter(function(a) { return a.bucket === 2; }).reduce(function(s, a) { return s + a.amount; }, 0);
  var b3actual = assets.filter(function(a) { return a.bucket === 3; }).reduce(function(s, a) { return s + a.amount; }, 0);
  var b1pct = b1cfg.target > 0 ? b1actual / b1cfg.target : 0;
  var b2pct = b2cfg.target > 0 ? b2actual / b2cfg.target : 0;
  var b3pct = b3cfg.target > 0 ? b3actual / b3cfg.target : 0;

  // IRMAA / tax calcs for current year
  var currentMagi = useMemo(function() {
    var ss = ssIncomeForYear(inp, 2026) * 0.85;
    var ira = Math.max(0, inp.monthlyExpenses * 12 - ssIncomeForYear(inp, 2026));
    return Math.round(ss + ira);
  }, [inp]);
  var irmaaLimit = 212000;
  var irmaaHeadroom = Math.max(0, irmaaLimit - currentMagi);
  var irmaaSafe = currentMagi < irmaaLimit;

  // Cash flow year cards (first two years)
  var cf2026 = cashFlow.find(function(r) { return r.year === 2026; });
  var cf2027 = cashFlow.find(function(r) { return r.year === 2027; });

  // Monthly withdrawal decision
  var monthlyNeed = inp.monthlyExpenses;
  var monthlyHC = Math.round((inp.healthPhase1Annual || 27896) / 12);
  var monthlyTotal = monthlyNeed + monthlyHC;
  var spaxx = assets.find(function(a) { return a.name && a.name.includes('SPAXX') && a.account === 'Taxable'; });
  var spaxxBal = spaxx ? Math.round(spaxx.amount) : 33589;

  // Success rate color
  var srNum = parseFloat(successRate);
  var srColor = srNum >= 85 ? '#059669' : srNum >= 75 ? '#f59e0b' : '#e24b4a';
  var srBg = srNum >= 85 ? '#fff7ed' : srNum >= 75 ? '#fef3c7' : '#fff1f2';
  var srBorder = srNum >= 85 ? '#fed7aa' : srNum >= 75 ? '#fde68a' : '#fecdd3';

  function fmtK(v) { return '$' + (v >= 1000000 ? (v / 1000000).toFixed(2) + 'M' : v >= 1000 ? Math.round(v / 1000) + 'K' : Math.round(v)); }
  function pillStyle(type) {
    if (type === 'green') return { display:'inline-block', fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#d1fae5', color:'#065f46' };
    if (type === 'amber') return { display:'inline-block', fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#fef3c7', color:'#92400e' };
    if (type === 'red')   return { display:'inline-block', fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#fee2e2', color:'#991b1b' };
    if (type === 'blue')  return { display:'inline-block', fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#dbeafe', color:'#1e40af' };
    return {};
  }

  // Draw donut chart
  useEffect(function() {
    if (!donutRef.current) return;
    var ex = Chart.getChart(donutRef.current); if (ex) ex.destroy();
    if (donutChartRef.current) { donutChartRef.current.destroy(); donutChartRef.current = null; }
    donutChartRef.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [byClass.cash, byClass.tips, byClass.div, byClass.equity, byClass.intl],
          backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#f97316', '#ec4899'],
          borderWidth: 3, borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return ' ' + fmtK(c.parsed); } } } }
      }
    });
    return function() { if (donutChartRef.current) { donutChartRef.current.destroy(); donutChartRef.current = null; } };
  }, [byClass]);

  // Draw gauge canvases
  useEffect(function() {
    drawGauge(gauge1Ref.current, b1pct, '#10b981');
    drawGauge(gauge2Ref.current, b2pct, '#059669');
    drawGauge(gauge3Ref.current, b3pct, '#0d9488');
  }, [b1pct, b2pct, b3pct]);

  // Draw Monte Carlo fan chart
  useEffect(function() {
    if (!mcRef.current || !mcPercentiles) return;
    var ex = Chart.getChart(mcRef.current); if (ex) ex.destroy();
    if (mcChartRef.current) { mcChartRef.current.destroy(); mcChartRef.current = null; }
    var gridC = 'rgba(0,0,0,0.06)', txtC = '#64748b';
    mcChartRef.current = new Chart(mcRef.current, {
      type: 'line',
      data: {
        labels: mcPercentiles.labels,
        datasets: [
          { data: mcPercentiles.p90, fill: false, borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { data: mcPercentiles.p75, fill: '-1', backgroundColor: 'rgba(139,92,246,0.22)', borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { data: mcPercentiles.p50, fill: '-1', backgroundColor: 'rgba(99,102,241,0.18)', borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { label: 'Median', data: mcPercentiles.p50, fill: false, borderColor: '#10b981', borderWidth: 2, pointRadius: 0, tension: 0.4 },
          { data: mcPercentiles.p25, fill: false, borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { data: mcPercentiles.p10, fill: '-1', backgroundColor: 'rgba(226,75,74,0.15)', borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { label: '25th', data: mcPercentiles.p25, fill: false, borderColor: '#f97316', borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, tension: 0.4 },
          { label: '10th', data: mcPercentiles.p10, fill: false, borderColor: '#e24b4a', borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: function(c) { if (['Median', '25th', '10th'].includes(c.dataset.label)) return c.dataset.label + ': $' + c.parsed.y + 'K'; return null; } } } },
        scales: {
          x: { grid: { color: gridC }, ticks: { color: txtC, font: { size: 9 } }, title: { display: true, text: 'Age', color: txtC, font: { size: 9 } } },
          y: { grid: { color: gridC }, ticks: { color: txtC, font: { size: 9 }, callback: function(v) { return '$' + v + 'K'; } }, min: 0 }
        }
      }
    });
    return function() { if (mcChartRef.current) { mcChartRef.current.destroy(); mcChartRef.current = null; } };
  }, [mcPercentiles]);

  // Draw cash flow chart
  useEffect(function() {
    if (!cfRef.current || !cashFlow || cashFlow.length === 0) return;
    var ex = Chart.getChart(cfRef.current); if (ex) ex.destroy();
    if (cfChartRef.current) { cfChartRef.current.destroy(); cfChartRef.current = null; }
    var gridC = 'rgba(0,0,0,0.06)', txtC = '#64748b';
    var labels = cashFlow.map(function(r) { return String(r.year); });
    var iraData = cashFlow.map(function(r) { return Math.round(r.iraBalance / 1000); });
    var rothData = cashFlow.map(function(r) { return Math.round(r.rothBalance / 1000); });
    var expData = cashFlow.map(function(r) { return Math.round(r.expenses / 1000); });
    var totalData = cashFlow.map(function(r) { return Math.round(r.balance / 1000); });
    cfChartRef.current = new Chart(cfRef.current, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Expenses', data: expData, borderColor: '#e24b4a', borderWidth: 1.5, fill: false, pointRadius: 0, tension: 0.4 },
          { label: 'IRA', data: iraData, borderColor: '#6366f1', borderWidth: 2, fill: false, pointRadius: 0, tension: 0.4 },
          { label: 'Roth', data: rothData, borderColor: '#8b5cf6', borderWidth: 1.5, fill: true, backgroundColor: 'rgba(139,92,246,0.07)', pointRadius: 0, tension: 0.4 },
          { label: 'Total', data: totalData, borderColor: '#10b981', borderWidth: 2.5, fill: false, pointRadius: 0, tension: 0.4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: function(c) { return c.dataset.label + ': $' + c.parsed.y + 'K'; } } } },
        scales: {
          x: { grid: { color: gridC }, ticks: { color: txtC, font: { size: 9 }, maxTicksLimit: 8, autoSkip: true } },
          y: { grid: { color: gridC }, ticks: { color: txtC, font: { size: 9 }, callback: function(v) { return '$' + v + 'K'; } }, min: 0 }
        }
      }
    });
    return function() { if (cfChartRef.current) { cfChartRef.current.destroy(); cfChartRef.current = null; } };
  }, [cashFlow]);

  var card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '13px 15px' };
  var lbl = { fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 7px' };

  return (
    <div style={{ fontFamily: "'Source Sans 3', sans-serif" }}>

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#0f172a' }}>Dashboard</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>{planLabel} · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={pillStyle('green')}>{dataSource === 'database' ? 'Live from DB' : 'Offline defaults'}</span>
        </div>
      </div>

      {/* ── ROW 1: Asset donut + Bucket gauges ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: 10, marginBottom: 10 }}>

        {/* Asset class donut */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
            <p style={lbl}>Portfolio composition</p>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#059669' }}>{fmtK(totalPort)}</span>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>{assets.length} holdings · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 110, height: 110, flexShrink: 0 }}>
              <canvas ref={donutRef} style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Cash & Near-Cash', byClass.cash, '#10b981'],
                ['TIPS / Inflation', byClass.tips, '#6366f1'],
                ['Dividend / REIT', byClass.div, '#f59e0b'],
                ['Equity ETF', byClass.equity, '#f97316'],
                ['International', byClass.intl, '#ec4899'],
              ].map(function(item) {
                return (
                  <div key={item[0]} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: item[2], display: 'inline-block', flexShrink: 0 }}></span>
                      {item[0]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{fmtK(item[1])}</span>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 4, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#64748b' }}>IRA {fmtK(byAccount.ira)}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Roth {fmtK(byAccount.roth)}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Taxable {fmtK(byAccount.taxable)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bucket gas gauges */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ ...lbl, margin: 0 }}>Bucket health — vs targets</p>
            <span style={{ fontSize: 10, color: '#64748b' }}>Bear rule active · use B1 only</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 8 }}>
            {[
              { label: 'B1 · Cash', ref: gauge1Ref, actual: b1actual, target: b1cfg.target, pct: b1pct, color: '#10b981', sub: Math.round(b1actual / (inp.monthlyExpenses * 12 + (inp.healthPhase1Annual || 27896)) * 10) / 10 + ' yrs' },
              { label: 'B2 · Income', ref: gauge2Ref, actual: b2actual, target: b2cfg.target, pct: b2pct, color: '#059669', sub: 'SCHD sweeping' },
              { label: 'B3 · Growth', ref: gauge3Ref, actual: b3actual, target: b3cfg.target, pct: b3pct, color: '#0d9488', sub: 'VTI + VXUS' },
            ].map(function(g) {
              var pillType = g.pct >= 0.9 ? 'green' : g.pct >= 0.75 ? 'amber' : 'red';
              return (
                <div key={g.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g.label}</div>
                  <canvas ref={g.ref} style={{ display: 'block', margin: '0 auto' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{fmtK(g.actual)}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>target {fmtK(g.target)}</div>
                  <span style={{ ...pillStyle(pillType), marginTop: 4, display: 'inline-block' }}>{Math.round(g.pct * 100)}%</span>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{g.sub}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: '#991b1b', background: '#fee2e2', borderRadius: 6, padding: '6px 10px' }}>
            Bear market rule active — draw from B1 cash only. Do not sell B2/B3 equity in down market.
          </div>
        </div>
      </div>

      {/* ── ROW 2: Monte Carlo + Tax/IRMAA ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)', gap: 10, marginBottom: 10 }}>

        {/* Monte Carlo */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <p style={{ ...lbl, margin: 0 }}>Monte Carlo simulation</p>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 7 }}>500 simulations · bucket strategy · market-condition-aware</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6, marginBottom: 8 }}>
            {[
              { val: successRate + '%', label: 'Success rate', bg: srBg, border: srBorder, color: srColor },
              { val: cf2026 ? fmtK(cashFlow[Math.floor(cashFlow.length / 2)].balance) : '—', label: 'Median final', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
              { val: mcPercentiles ? fmtK(mcPercentiles.p90[mcPercentiles.p90.length - 1] * 1000) : '—', label: '90th pct', bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed' },
              { val: mcPercentiles ? fmtK(mcPercentiles.p10[mcPercentiles.p10.length - 1] * 1000) : '—', label: '10th pct', bg: '#fff1f2', border: '#fecdd3', color: '#e11d48' },
            ].map(function(t) {
              return (
                <div key={t.label} style={{ background: t.bg, border: '1px solid ' + t.border, borderRadius: 8, padding: '7px 9px' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: t.color }}>{t.val}</div>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.color, opacity: 0.7, marginTop: 1 }}>{t.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 148 }}>
            <canvas ref={mcRef} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {[['#e24b4a','10th %ile'],['#f97316','25th %ile'],['#6366f1','75th %ile'],['#8b5cf6','90th %ile'],['#10b981','Median']].map(function(d) {
              return <span key={d[1]} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d[0], display: 'inline-block' }}></span>{d[1]}</span>;
            })}
          </div>
          <button onClick={function() { setActiveTab('monte'); }} style={{ marginTop: 6, fontSize: 10, padding: '4px 9px', cursor: 'pointer', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b' }}>Explore Monte Carlo tab →</button>
        </div>

        {/* Tax / IRMAA */}
        <div style={{ ...card, border: '1px solid #6ee7b7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ ...lbl, margin: 0 }}>Tax &amp; IRMAA · {new Date().getFullYear()}</p>
            <span style={pillStyle(irmaaSafe ? 'green' : 'red')}>{irmaaSafe ? 'Safe zone' : 'IRMAA risk'}</span>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', height: 16, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: '14%', background: '#bbf7d0' }}></div>
              <div style={{ width: '24%', background: '#34d399' }}></div>
              <div style={{ width: '22%', background: '#059669' }}></div>
              <div style={{ width: '20%', background: '#0f766e' }}></div>
              <div style={{ width: '20%', background: '#d1d5db' }}></div>
            </div>
            <div style={{ display: 'flex', fontSize: 9, color: '#64748b', marginTop: 2, justifyContent: 'space-between' }}>
              <span>10%</span><span>12%</span><span>22%</span><span>24%</span><span>32%+</span>
            </div>
          </div>
          <div style={{ position: 'relative', height: 22, marginBottom: 8 }}>
            <div style={{ position: 'absolute', left: '29%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 2, height: 12, background: '#1e293b', borderRadius: 1 }}></div>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', marginTop: 1 }}>You {fmtK(currentMagi)}</span>
            </div>
            <div style={{ position: 'absolute', left: '73%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 2, height: 12, background: '#e24b4a', borderRadius: 1, opacity: 0.7 }}></div>
              <span style={{ fontSize: 9, color: '#991b1b', whiteSpace: 'nowrap', marginTop: 1 }}>IRMAA $212K</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {[
              { label: 'Est. MAGI', val: fmtK(currentMagi), color: '#0f172a' },
              { label: 'Headroom', val: fmtK(irmaaHeadroom), color: '#059669' },
              { label: 'Bracket', val: '22% fed', color: '#0f172a' },
              { label: '2027 conv.', val: '$100K fits', color: '#059669' },
            ].map(function(t) {
              return (
                <div key={t.label} style={{ background: '#f8fafc', borderRadius: 7, padding: '7px 9px' }}>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{t.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: t.color }}>{t.val}</div>
                </div>
              );
            })}
          </div>
          <button onClick={function() { setActiveTab('roth'); }} style={{ marginTop: 8, fontSize: 10, padding: '4px 9px', cursor: 'pointer', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', width: '100%' }}>Optimize 2027 conversion →</button>
        </div>
      </div>

      {/* ── ROW 3: Cash flow + Monthly withdrawal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 10, marginBottom: 10 }}>

        {/* Cash flow mini chart */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ ...lbl, margin: 0 }}>Cash flow projection · 2026–{2026 + (inp.lifeExpectancy - inp.currentAge)}</p>
            <button onClick={function() { setActiveTab('cashflow'); }} style={{ fontSize: 10, padding: '3px 8px', cursor: 'pointer', borderRadius: 5, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b' }}>Full tab →</button>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>IRA · Roth · Total balance trajectories to age {inp.lifeExpectancy}</div>
          <div style={{ position: 'relative', height: 130 }}>
            <canvas ref={cfRef} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
            {[['#e24b4a','Expenses'],['#6366f1','IRA'],['#8b5cf6','Roth'],['#10b981','Total']].map(function(d) {
              return <span key={d[1]} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d[0], display: 'inline-block' }}></span>{d[1]}</span>;
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 8 }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>2026</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Age {inp.currentAge}</span>
              </div>
              <div style={{ fontSize: 10, color: '#374151', marginTop: 3, lineHeight: 1.5 }}>No conversion. W-2 fills bracket. Fund gap from B1 cash.</div>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>2027</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Age {inp.currentAge + 1}</span>
              </div>
              <div style={{ fontSize: 10, color: '#374151', marginTop: 3, lineHeight: 1.5 }}>Prime conversion year. $100K at 22%. MAGI under $212K.</div>
            </div>
          </div>
        </div>

        {/* Monthly withdrawal decision */}
        <div style={{ ...card, border: '1px solid #93c5fd' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <p style={{ ...lbl, margin: 0 }}>This month · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <span style={pillStyle('blue')}>Decision</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 7 }}>
            Need: <strong style={{ color: '#0f172a' }}>{fmtK(monthlyNeed)}</strong> + <strong style={{ color: '#0f172a' }}>{fmtK(monthlyHC)}</strong> HC = <strong style={{ color: '#0f172a' }}>{fmtK(monthlyTotal)}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
            <div style={{ border: '1.5px solid #059669', borderRadius: 7, padding: '7px 10px', background: '#f0fdf4' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46' }}>Use B1 liquid cash</div>
              <div style={{ fontSize: 10, color: '#059669', marginTop: 1 }}>SPAXX {fmtK(spaxxBal)} · B1 {Math.round(b1pct * 100)}% funded</div>
              <span style={{ ...pillStyle('green'), marginTop: 3, display: 'inline-block' }}>Recommended now</span>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>Trim B3 if VTI &gt; prior peak</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>Only in up market — check B3 gauge before selling</div>
              <span style={{ ...pillStyle('amber'), marginTop: 3, display: 'inline-block' }}>Market-conditional</span>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>SCHD dividend sweep</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>~{fmtK(Math.round(derivedTotals.iraDividend * 0.038 / 12))} auto to B1 this month</div>
              <span style={{ ...pillStyle('blue'), marginTop: 3, display: 'inline-block' }}>Auto</span>
            </div>
          </div>
          <button onClick={function() { setActiveTab('cashflow'); }} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 14 }}>?</span> Go to Cash Flow tab for details →
          </button>
        </div>
      </div>

      {/* ── ROW 4: Risks + Opportunities + Next Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>

        {/* Risks */}
        <div style={card}>
          <p style={lbl}>Risks</p>
          {[
            { dot: '#e24b4a', title: 'ACA premiums', sub: '$27.9k/yr until Medicare · 2 yrs' },
            { dot: '#f59e0b', title: 'Sequence-of-returns', sub: 'B1 buffer covers ~' + Math.round(b1actual / (inp.monthlyExpenses * 12 + (inp.healthPhase1Annual || 27896)) * 10) / 10 + ' yrs' },
            { dot: '#f59e0b', title: 'RMD at age 73', sub: '2032: forced IRA withdrawal · IRMAA exposure' },
          ].map(function(r) {
            return (
              <div key={r.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, display: 'inline-block', flexShrink: 0, marginTop: 3 }}></span>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{r.title}</div><div style={{ fontSize: 10, color: '#64748b' }}>{r.sub}</div></div>
              </div>
            );
          })}
          <button onClick={function() { setActiveTab('monte'); }} style={{ marginTop: 7, fontSize: 10, padding: '4px 9px', cursor: 'pointer', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', width: '100%' }}>See stress tests →</button>
        </div>

        {/* Opportunities */}
        <div style={card}>
          <p style={lbl}>Opportunities</p>
          {[
            { dot: '#059669', title: '2027 Roth conversion', sub: '$100K at 22% · ' + fmtK(irmaaHeadroom) + ' IRMAA room' },
            { dot: '#059669', title: 'CD maturities 2026', sub: 'Toyota $50K + Wells $25K · reinvest or use' },
            { dot: '#0ea5e9', title: 'QCDs start at 70', sub: '$15K/yr from IRA · offsets RMD + cuts taxes' },
          ].map(function(r) {
            return (
              <div key={r.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, display: 'inline-block', flexShrink: 0, marginTop: 3 }}></span>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{r.title}</div><div style={{ fontSize: 10, color: '#64748b' }}>{r.sub}</div></div>
              </div>
            );
          })}
          <button onClick={function() { setActiveTab('roth'); }} style={{ marginTop: 7, fontSize: 10, padding: '4px 9px', cursor: 'pointer', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', width: '100%' }}>See conversion optimizer →</button>
        </div>

        {/* Next actions */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={lbl}>Next actions</p>
            {[
              { color: '#059669', title: '2027 Roth conversion', sub: '$100K · 8 months · ~$24K tax cost' },
              { color: '#0ea5e9', title: 'CD reinvestment', sub: 'Toyota $50K matures Aug · 4 months' },
              { color: '#d1d5db', title: 'Medicare enrollment', sub: 'Nov 2027 · 19 months away' },
            ].map(function(r) {
              return (
                <div key={r.title} style={{ borderLeft: '3px solid ' + r.color, paddingLeft: 9, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{r.sub}</div>
                </div>
              );
            })}
          </div>
          <button onClick={function() { setActiveTab('summary'); }} style={{ marginTop: 10, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span>★</span> Get full AI analysis →
          </button>
        </div>
      </div>

    </div>
  );
}

// Onboarding wizard defaults — single canonical source used by wizard steps and handleWizardComplete.
// Keep in sync with INITIAL_DRAFT in OnboardingWizard.jsx.
var WIZARD_DEFAULTS = {
  ssFRA: 3445,          // median SS benefit at FRA — update when ssa.gov medians change
  ssAge: 67,            // Full Retirement Age
  spouseSSAt67: 1879,
  spouseSSAge: 67,
  monthlyExpenses: 8000,
  retirementAge: 67,
};

export default function RetireStrongPlanner({ userId }) {
  var authCtx = useAuth();
  var authUser = authCtx ? authCtx.user : null;
  var authLogout = authCtx ? authCtx.logout : null;
  var markOnboardingComplete = authCtx ? authCtx.markOnboardingComplete : null;

  var tabState = useState('dashboard');
  var activeTab = tabState[0]; var setActiveTab = tabState[1];

  var inputState = useState(function() { return flattenPlan({}); });
  var inp = inputState[0]; var setInp = inputState[1];

  var rawState = useState(function() {
    var r = {};
    Object.keys(DEFAULTS).forEach(function(k) { r[k] = typeof DEFAULTS[k] === 'number' ? String(DEFAULTS[k]) : DEFAULTS[k]; });
    return r;
  });
  var raw = rawState[0]; var setRaw = rawState[1];

  // ── Editable asset list ──────────────────────────────────────────────────────
  var assetsState = useState(DEFAULT_ASSETS);
  var assets = assetsState[0]; var setAssets = assetsState[1];

  // ── DB data source indicator ──────────────────────────────────────────────
  var dataSourceState = useState('defaults');
  var dataSource = dataSourceState[0]; var setDataSource = dataSourceState[1];

  // ── Onboarding wizard gate ────────────────────────────────────────────────
  // Source of truth: users.onboarding_complete on the server. Returned as part
  // of the auth user object. No localStorage. Survives across browsers/incognito.
  var wizardDone = !!(authUser && authUser.onboarding_complete);

  // Hydrate inp from the saved wizard draft (onboarding_data) once per user.
  // Holdings are loaded separately via /api/holdings.
  useEffect(function() {
    if (!authUser || !authUser.onboarding_data) return;
    var d = authUser.onboarding_data;
    var birthYear = d.birthYear || null;
    var patch = {};
    if (birthYear) {
      patch.birthYear = birthYear;
      patch.currentAge = new Date().getFullYear() - birthYear;
    }
    if (d.hasSpouse !== undefined) patch.hasSpouse = !!d.hasSpouse;
    if (d.spouseBirthYear) patch.spouseBirthYear = d.spouseBirthYear;
    if (d.ssFRA) patch.ssFRA = d.ssFRA;
    if (d.ssAge) patch.ssAge = d.ssAge;
    if (d.spouseSSAt67) patch.spouseSSAt67 = d.spouseSSAt67;
    if (d.spouseSSAge) patch.spouseSSAge = d.spouseSSAge;
    if (d.monthlyExpenses) patch.monthlyExpenses = d.monthlyExpenses;
    if (Object.keys(patch).length === 0) return;
    setInp(function(prev) { return Object.assign({}, prev, patch); });
    setRaw(function(prev) {
      var next = Object.assign({}, prev);
      Object.keys(patch).forEach(function(k) {
        next[k] = typeof patch[k] === 'number' ? String(patch[k]) : patch[k];
      });
      return next;
    });
  }, [authUser ? authUser.user_id : null]);

  // ── Load live holdings from DB on mount (falls back to DEFAULT_ASSETS) ────
  // API base comes from VITE_API_URL in .env (Personal → 3001, Pro → 3101).
  // If unset, we skip the fetch and stay on defaults rather than silently
  // hitting the wrong backend.
  var API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';
  useEffect(function() {
    if (!API_BASE) {
      console.warn('VITE_API_URL not set — using DEFAULT_ASSETS. Add it to .env to load live holdings.');
      setDataSource('defaults');
      return;
    }
    fetchHoldings(userId)
      .then(function(data) {
        // Accept both shapes: Personal returns { holdings: [...raw DB rows] },
        // Pro returns a bare array of already-mapped records.
        var rows = Array.isArray(data) ? data : (data && data.holdings) ? data.holdings : [];
        if (rows.length === 0) { setDataSource('offline'); return; }

        // Detect which shape we got. Pro rows already have `account` in
        // frontend form ('Taxable', 'IRA', ...); Personal rows have raw
        // `account_type` ('ira', 'roth_ira', ...) that needs mapping.
        var alreadyMapped = rows[0] && typeof rows[0].account === 'string' && !rows[0].account_type;

        var dbAssets = alreadyMapped ? rows.map(function(h, i) {
          return {
            id: h.id != null ? String(h.id) : 'db' + i,
            name: h.name || h.symbol || 'Unknown',
            amount: parseFloat(h.amount) || 0,
            type: h.type || 'Other',
            account: h.account || 'Taxable',
            maturity: h.maturity || 'Ongoing',
            yld: h.yld || '—',
            risk: h.risk || '—',
            bucket: h.bucket != null ? h.bucket : null
          };
        }) : rows.map(function(h, i) {
          var acct = h.account_type === 'ira' ? 'IRA'
                   : h.account_type === 'roth_ira' ? 'Roth IRA'
                   : h.account_type === 'roth_401k' ? 'Roth 401k'
                   : 'Taxable';
          var mat = h.maturity_date
                   ? new Date(h.maturity_date).toLocaleDateString('en-US',{month:'short',year:'numeric'})
                   : 'Ongoing';
          return {
            id: 'db' + i,
            name: h.symbol + ' ' + h.name.substring(0,30),
            amount: parseFloat(h.current_value) || 0,
            type: h.asset_type || 'Other',
            account: acct,
            maturity: mat,
            yld: '—',
            risk: h.risk_level || '—',
            bucket: h.bucket || null
          };
        });
        setAssets(dbAssets);
        setDataSource('database');
      })
      .catch(function() { setDataSource('offline'); });
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

  var scenState = useState(function() {
    return [{
      name: 'Base Case',
      data: DEFAULTS,
      plan: buildPlan(DEFAULTS, DEFAULT_ASSETS, DEFAULT_BUCKET_CONFIG, { activeScenario: 'Base Case' }),
      assets: DEFAULT_ASSETS,
      bucketCfg: DEFAULT_BUCKET_CONFIG,
      date: new Date().toLocaleDateString()
    }];
  });
  var scenarios = scenState[0]; var setScenarios = scenState[1];

  var activeScenState = useState('Base Case');
  var activeScen = activeScenState[0]; var setActiveScen = activeScenState[1];

  var modalState = useState(false);
  var showModal = modalState[0]; var setShowModal = modalState[1];
  // ── DB sync status (Phase 2B) ─────────────────────────────────────────────
  var saveStatusState = useState('idle');
  var saveStatus = saveStatusState[0]; var setSaveStatus = saveStatusState[1];
  var saveErrorState = useState(null);
  var saveError = saveErrorState[0]; var setSaveError = saveErrorState[1];

  // ── Profile autosave (Phase 2C) ───────────────────────────────────────────
  // Debounce timer ref — no state, never causes re-renders
  var profileSaveTimer = useRef(null);
  // The exact 6 fields saveProfile writes — checked in setField
  var PROFILE_AUTOSAVE_FIELDS = useRef(new Set([
    'lifeExpectancy', 'filingStatus', 'stateTaxRate',
    'survivorMode', 'monthlyExpenses', 'inflationRate'
  ]));

  // ── Social Security autosave (Phase 2D) ───────────────────────────────────
  var ssSaveTimer = useRef(null);
  // 7 durable SS config fields that saveSocialSecurity writes to DB.
  // spouseSSAt63 is excluded — it is a scenario-only what-if input, not persisted.
  var SS_AUTOSAVE_FIELDS = useRef(new Set([
    'ssFRA', 'ssAge', 'ssCola',
    'spouseSSAge', 'spouseSSMonthly', 'spouseSSAt67', 'spouseSSIsSpousal'
  ]));

  // ── Roth autosave (Phase 2E) ───────────────────────────────────────────────
  var rothSaveTimer = useRef(null);
  // 5 durable Roth conversion fields (conv2027–conv2031). All write to DB.
  var ROTH_AUTOSAVE_FIELDS = useRef(new Set([
    'conv2027', 'conv2028', 'conv2029', 'conv2030', 'conv2031'
  ]));

  // ── Healthcare autosave (Phase 2F) ────────────────────────────────────────
  var healthcareSaveTimer = useRef(null);
  // 4 durable healthcare fields. saveHealthcare normalizes healthInflation 0.05→5.
  var HEALTHCARE_AUTOSAVE_FIELDS = useRef(new Set([
    'healthPhase1Annual', 'healthPhase1EndAge', 'healthPhase2Annual', 'healthInflation'
  ]));

  // ── Expenses autosave (Phase 2F) ──────────────────────────────────────────
  var expensesSaveTimer = useRef(null);
  // 5 durable monthly expense fields. saveExpenses fires 5 category PUTs in parallel.
  var EXPENSES_AUTOSAVE_FIELDS = useRef(new Set([
    'housingMonthly', 'foodMonthly', 'transportMonthly', 'travelMonthly', 'otherMonthly'
  ]));

  // ── QCD autosave (Phase 2F) ───────────────────────────────────────────────
  var qcdSaveTimer = useRef(null);
  // 2 durable QCD config fields.
  var QCD_AUTOSAVE_FIELDS = useRef(new Set([
    'qcdAmount', 'qcdStartAge'
  ]));

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

  // ── v13: Monthly Spend tracker state ──────────────────────────────────────────
  var monthlySpendState = useState({
    jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0
  });
  var monthlySpend = monthlySpendState[0]; var setMonthlySpend = monthlySpendState[1];
  var updateMonthSpend = useCallback(function(month, val) {
    setMonthlySpend(function(p) { var n = Object.assign({}, p); n[month] = parseFloat(val) || 0; return n; });
  }, []);

  // ── v13: This Year income tracker state ───────────────────────────────────────
  var thisYearState = useState({
    w2Ytd: 0,            // W-2 income through April 10
    severanceGross: 0,   // Gross severance
    severanceNet: 0,     // Net severance after tax + garnishment
    otherIncome: 0,      // Any other 2026 income
    fedWithheld: 0,      // Federal tax already withheld
    stateWithheld: 0,    // State tax already withheld
  });
  var thisYear = thisYearState[0]; var setThisYear = thisYearState[1];
  var updateThisYear = useCallback(function(key, val) {
    setThisYear(function(p) { var n = Object.assign({}, p); n[key] = parseFloat(val) || 0; return n; });
  }, []);

  // ── v13: Quarterly balance ledger state ───────────────────────────────────────
  var ledgerState = useState([]);
  var ledger = ledgerState[0]; var setLedger = ledgerState[1];
  var addLedgerEntry = useCallback(function(entry) {
    setLedger(function(prev) { return prev.concat([Object.assign({id:'L'+Date.now()}, entry)]); });
  }, []);
  var removeLedgerEntry = useCallback(function(id) {
    setLedger(function(prev) { return prev.filter(function(e) { return e.id !== id; }); });
  }, []);

  // ── Domain autosave helper (Phase 2E refactor) ────────────────────────────
  // Encapsulates the debounce/save pattern for any domain.
  // Does nothing if key is not in fieldsRef.current (O(1) Set check).
  function scheduleDomainSave(key, next, fieldsRef, timerRef, saveFn, label) {
    if (!fieldsRef.current.has(key)) return;
    clearTimeout(timerRef.current);
    setSaveStatus('saving');
    timerRef.current = setTimeout(function() {
      saveFn(next)
        .then(function(result) {
          if (result.ok) {
            setSaveStatus('saved');
            setTimeout(function() { setSaveStatus('idle'); }, 2000);
          } else {
            setSaveStatus('error');
            setSaveError(label + ': ' + result.error);
          }
        })
        .catch(function(e) {
          setSaveStatus('error');
          setSaveError(label + ': ' + (e.message || 'Unknown error'));
        });
    }, 1500);
  }

  var setField = useCallback(function(k, v) {
    setRaw(function(p) { var n = Object.assign({}, p); n[k] = v; return n; });
    var num = v === '' ? 0 : parseFloat(v);
    setInp(function(p) {
      var next = Object.assign({}, p);
      next[k] = isNaN(num) ? p[k] : num;
      scheduleDomainSave(k, next, PROFILE_AUTOSAVE_FIELDS,    profileSaveTimer,    saveProfile,       'Profile');
      scheduleDomainSave(k, next, SS_AUTOSAVE_FIELDS,         ssSaveTimer,         saveSocialSecurity,'SS');
      scheduleDomainSave(k, next, ROTH_AUTOSAVE_FIELDS,       rothSaveTimer,       saveRothPlan,      'Roth');
      scheduleDomainSave(k, next, HEALTHCARE_AUTOSAVE_FIELDS, healthcareSaveTimer, saveHealthcare,    'Healthcare');
      scheduleDomainSave(k, next, EXPENSES_AUTOSAVE_FIELDS,   expensesSaveTimer,   saveExpenses,      'Expenses');
      scheduleDomainSave(k, next, QCD_AUTOSAVE_FIELDS,        qcdSaveTimer,        saveQCD,           'QCD');
      return next;
    });
  }, []);

  var loadScen = useCallback(function(s) {
    // Cancel any pending autosave timers for the outgoing scenario
    clearTimeout(profileSaveTimer.current);
    clearTimeout(ssSaveTimer.current);
    clearTimeout(rothSaveTimer.current);
    clearTimeout(healthcareSaveTimer.current);
    clearTimeout(expensesSaveTimer.current);
    clearTimeout(qcdSaveTimer.current);
    setSaveStatus('idle');
    // Canonical path: scenario has a .plan object → go through flattenPlan
    // Legacy path: scenario only has flat .data → use it directly (backward compat)
    var resolved = s.plan ? flattenPlan(s.plan) : s.data;
    setInp(resolved);
    var r = {};
    Object.keys(resolved).forEach(function(k) { r[k] = typeof resolved[k] === 'number' ? String(resolved[k]) : resolved[k]; });
    setRaw(r);
    // assets: prefer plan.assets if non-empty, fall back to s.assets
    var resolvedAssets = (s.plan && s.plan.assets && s.plan.assets.length > 0) ? s.plan.assets : s.assets;
    // bucketCfg: prefer plan.bucketConfig if non-empty, fall back to s.bucketCfg
    var resolvedBuckets = (s.plan && s.plan.bucketConfig && s.plan.bucketConfig.length > 0) ? s.plan.bucketConfig : s.bucketCfg;
    if (resolvedAssets && resolvedAssets.length > 0) setAssets(resolvedAssets);
    if (resolvedBuckets && resolvedBuckets.length > 0) setBucketCfg(resolvedBuckets);
    setActiveScen(s.name);
  }, []);

  // Preset scenario creation
  var createPresetScenario = useCallback(function(preset) {
    var baseScen = scenarios.find(function(s) { return s.name === 'Base Case'; });
    var sourcePlan = baseScen ? Object.assign({}, baseScen.data) : Object.assign({}, inp);
    var sourceAssets = baseScen ? baseScen.assets.slice() : assets.slice();
    var sourceBucketCfg = baseScen ? baseScen.bucketCfg.slice() : bucketCfg.slice();
    var newPlan = preset.apply(sourcePlan);
    if (preset.scenarioInsight) { newPlan.scenarioInsight = preset.scenarioInsight; }
    var baseName = preset.defaultName;
    var existingNames = scenarios.map(function(s) { return s.name; });
    var finalName = baseName;
    var counter = 2;
    while (existingNames.indexOf(finalName) !== -1) {
      finalName = baseName + ' (' + counter + ')';
      counter++;
    }
    var newScenario = {
      name: finalName,
      data: newPlan,
      plan: buildPlan(newPlan, sourceAssets, sourceBucketCfg, { activeScenario: finalName }),
      assets: sourceAssets,
      bucketCfg: sourceBucketCfg,
      date: new Date().toLocaleDateString(),
      presetId: preset.id,
    };
    setScenarios(function(prev) { return prev.concat([newScenario]); });
    loadScen(newScenario);
  }, [scenarios, inp, assets, bucketCfg, loadScen]);

  var saveScen = useCallback(function() {
    var name = scenName.trim() || ('Scenario ' + (scenarios.length + 1));
    setScenarios(function(prev) {
      var filtered = prev.filter(function(s) { return s.name !== name; });
      return filtered.concat([{
        name: name,
        data: Object.assign({}, inp),
        plan: buildPlan(inp, assets, bucketCfg, { activeScenario: name }),
        assets: assets.slice(),
        bucketCfg: bucketCfg.slice(),
        date: new Date().toLocaleDateString()
      }]);
    });
    setActiveScen(name);
    setScenName('');
    setShowModal(false);
  }, [scenName, scenarios, inp, assets, bucketCfg]);

  // ── Toast state ────────────────────────────────────────────────────────────
  var toastState = useState(null);
  var toastMsg = toastState[0]; var setToastMsg = toastState[1];

  // ── Silent save to current scenario (no prompt) ────────────────────────────
  // IMPORTANT: This saves to the in-memory `scenarios` React state only.
  // It does NOT persist to the DB or localStorage — a page refresh will lose it.
  // To persist to the DB, use syncToDB (Sync button) or rely on domain autosave.
  var saveSilently = useCallback(function() {
    var name = activeScen || 'Base Case';
    setScenarios(function(prev) {
      var filtered = prev.filter(function(s) { return s.name !== name; });
      return filtered.concat([{
        name: name,
        data: Object.assign({}, inp),
        plan: buildPlan(inp, assets, bucketCfg, { activeScenario: name }),
        assets: assets.slice(),
        bucketCfg: bucketCfg.slice(),
        date: new Date().toLocaleDateString()
      }]);
    });
    setToastMsg('Saved ✓');
    setTimeout(function() { setToastMsg(null); }, 2000);
  }, [activeScen, inp, assets, bucketCfg]);

  // ── Phase 2B: Explicit DB sync ────────────────────────────────────────────
  var syncToDB = useCallback(async function() {
    setSaveStatus('saving');
    setSaveError(null);
    try {
      var results = await saveAllDurable(inp);
      var failed = results.filter(function(r) { return !r.ok; });
      if (failed.length > 0) {
        setSaveStatus('error');
        setSaveError(failed.map(function(r) { return r.domain + ': ' + r.error; }).join(' | '));
      } else {
        setSaveStatus('saved');
        setTimeout(function() { setSaveStatus('idle'); }, 2000);
      }
    } catch (e) {
      setSaveStatus('error');
      setSaveError(e.message || 'Unknown error');
    }
  }, [inp]);

  // ── Phase 2A: Round-trip verification (dev/test helper) ─────────────────────
  // Verifies that current state → buildPlan → flattenPlan produces identical inp.
  // Call window.verifyRoundTrip() in the browser console to run.
  useEffect(function() {
    window.verifyRoundTrip = function() {
      var builtPlan = buildPlan(inp, assets, bucketCfg);
      var reloaded = flattenPlan(builtPlan);
      var mismatches = [];
      Object.keys(inp).forEach(function(k) {
        if (inp[k] !== reloaded[k]) {
          mismatches.push({ key: k, original: inp[k], reloaded: reloaded[k] });
        }
      });
      // Check assets round-trip
      var assetsMatch = JSON.stringify(assets) === JSON.stringify(builtPlan.assets);
      var bucketsMatch = JSON.stringify(bucketCfg) === JSON.stringify(builtPlan.bucketConfig);
      var result = {
        inpMismatches: mismatches,
        assetsMatch: assetsMatch,
        bucketsMatch: bucketsMatch,
        passed: mismatches.length === 0 && assetsMatch && bucketsMatch
      };
      console.log('Round-trip result:', result);
      return result;
    };
  }, [inp, assets, bucketCfg]);

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
    setAssets(function(prev) {
      if (editAssetIsNew) return prev.concat([a]);
      return prev.map(function(x) { return x.id === a.id ? a : x; });
    });
    setEditAsset(null);
  }, [editAsset, editAssetIsNew]);

  var deleteAsset = useCallback(function(id) {
    setAssets(function(prev) { return prev.filter(function(a) { return a.id !== id; }); });
  }, []);

  var moveAssetToBucket = useCallback(function(assetId, bucketId) {
    setAssets(function(prev) {
      return prev.map(function(a) { return a.id === assetId ? Object.assign({}, a, {bucket: bucketId}) : a; });
    });
    setMoveAssetId(null);
  }, []);

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
      if (a.type === 'Cash' || a.type === 'CD' || a.type === 'T-Bill') cat = 'Cash & Near-Cash';
      else if (a.type === 'TIPS' || a.type === 'I-Bond') cat = 'TIPS / Inflation';
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

  var cashFlow = useMemo(function() { return buildCashFlow(inpWithAssets, er); }, [inpWithAssets, er]);


  // ── Bucket-aware Monte Carlo with realistic refill discipline ────────────────
  // Bucket 1 (cash): covers expenses. Refilled by: dividends always, TIPS at maturity,
  //   equity trim only when market is up and B1 < 1yr expenses.
  // Bucket 2 (TIPS + dividends): TIPS mature in sequence (2028, 2031, 2034) flowing to B1.
  //   Dividends sweep to B1 annually. Principal only tapped if B1 exhausted.
  // Bucket 3 (growth + Roth): untouched in down years. Trimmed to refill B1 in up years.
  // Bear market (growth < -10%): live on B1 cash only. No B2/B3 equity sales.
  // Up year (growth > 0%): trim B3 up to 5% to refill B1 if below 1yr expenses.
  var mcData = useMemo(function() { return runMonteCarlo(inpWithAssets, er, derivedTotals); }, [inpWithAssets, er, derivedTotals]);


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

  var mcPercentiles = useMemo(function() {
    // Re-run a lightweight version to get percentile bands for the dashboard chart
    var years = inpWithAssets.lifeExpectancy - inpWithAssets.currentAge;
    var er = capeBased(inpWithAssets.capeRatio, inpWithAssets.tenYrTreasury, inpWithAssets.tipsYield);
    var stockVol = inpWithAssets.stockVol / 100;
    var grR = inpWithAssets.growthReturnRate / 100;
    var roR = inpWithAssets.rothReturnRate / 100;
    var allPaths = [];
    for (var sim = 0; sim < 200; sim++) {
      var bal = derivedTotals.taxable + derivedTotals.iraCash + derivedTotals.iraTips + derivedTotals.iraDividend + derivedTotals.iraGrowth + derivedTotals.roth;
      var path = [bal];
      for (var y = 1; y <= years; y++) {
        var u1 = Math.random(), u2 = Math.random();
        var z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-9))) * Math.cos(2 * Math.PI * u2);
        var ret = grR + stockVol * z;
        var inc = ssIncomeForYear(inpWithAssets, 2026 + y);
        var exp2 = inpWithAssets.monthlyExpenses * 12 * Math.pow(1 + er.inflation, y);
        var hc = (inpWithAssets.currentAge + y < inpWithAssets.healthPhase1EndAge)
          ? inpWithAssets.healthPhase1Annual * Math.pow(1 + inpWithAssets.healthInflation, y)
          : inpWithAssets.healthPhase2Annual * Math.pow(1 + inpWithAssets.healthInflation, y);
        var gap = Math.max(0, exp2 + hc - inc);
        bal = Math.max(0, bal * (1 + ret * 0.6) - gap);
        path.push(Math.round(bal));
      }
      allPaths.push(path);
    }
    var labels = [];
    for (var a = 0; a <= years; a++) labels.push(inpWithAssets.currentAge + a);
    var pct = function(arr, p) {
      var s = arr.slice().sort(function(a, b) { return a - b; });
      return s[Math.floor(s.length * p / 100)] || 0;
    };
    var p10 = [], p25 = [], p50 = [], p75 = [], p90 = [];
    for (var i = 0; i <= years; i++) {
      var col = allPaths.map(function(path) { return path[i] || 0; });
      p10.push(Math.round(pct(col, 10) / 1000));
      p25.push(Math.round(pct(col, 25) / 1000));
      p50.push(Math.round(pct(col, 50) / 1000));
      p75.push(Math.round(pct(col, 75) / 1000));
      p90.push(Math.round(pct(col, 90) / 1000));
    }
    return { labels, p10, p25, p50, p75, p90 };
  }, [inpWithAssets, derivedTotals]);

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
      inpWithAssets.hasSpouse?'• Spouse (age '+(inpWithAssets.spouseCurrentAge||63)+') SS: '+(inpWithAssets.spouseEarlyClaim?'Claiming at 63 = $1,472/mo net':'Waiting to 67 = $1,879/mo net')+' (after garnishment)':'',
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

    apiFetchAiInsights(prompt)
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

  var bucketPctData = pctData.map(function(d) { return { year: d.year, b1: d.b1med, b2: d.b2med, b3: d.b3med }; });

  var SS_COLORS_CTX = ['#f87171','#fbbf24','#fb923c','#34d399','#60a5fa','#a78bfa','#e879f9','#22d3ee','#10b981'];

  // Shared context object passed to extracted tab components
  var tabCtx = {
    // Data
    cashFlow, pctData, bucketPctData, successRate, successColor,
    rothWindow, derivedTotals, totalPort, assets, bucketCfg,
    inp, inpWithAssets, er, mcPercentiles,
    dataSource, insights, aiInsights, aiLoading, aiError,
    // Tax/income derived
    dynTaxRate, iraTotal,
    // Income tracker state
    thisYear, updateThisYear,
    // Spending tracker state
    monthlySpend, updateMonthSpend,
    // Bucket state
    buckets, unassigned, moveAssetToBucket, setMoveAssetId, moveAssetId,
    // SS state + data
    ssCompareAge, setSsCompareAge, be6770, projA, proj70,
    ssCompData, SS_COLORS: SS_COLORS_CTX, cumSsChart, portCompChart, projRothBridge,
    // Scenario management
    scenarios, activeScen, loadScen, createPresetScenario,
    // Setters
    setField, setActiveTab, fetchAiInsights,
    // Formatters
    fmtC, fmtFull, fmtPct,
    // Theme tokens
    PF, SS_FONT, BG, SURFACE, SURFACE2, BORDER, BORDER2,
    TXT1, TXT2, TXT3, ACCENT, ACCENT2, SHADOW, CARD,
    // Helper components
    TTip,
  };

  function TTip(props) {
    if (!props.active || !props.payload || !props.payload.length) return null;
    return React.createElement('div', {style:{background:SURFACE,border:'1px solid '+BORDER,borderRadius:8,padding:'10px 14px'}},
      React.createElement('p', {style:{color:TXT3,marginBottom:4,fontSize:11}}, props.label),
      props.payload.map(function(p,i){return React.createElement('p',{key:i,style:{color:p.color,margin:'2px 0',fontSize:12}},p.name+': '+(typeof p.value==='number'?fmtC(p.value):p.value));})
    );
  }

  var TABS = [
    {id:'dashboard',name:'Dashboard',Icon:BarChart3},
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

  // ── Asset Editor Modal ───────────────────────────────────────────────────────
  function AssetEditorModal() {
    if (!editAsset) return null;
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
              <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Holding Name</label>
              <input value={a.name} onChange={function(e){upd('name',e.target.value);}} placeholder="e.g. SCHD, CD Aug 2026" style={INP_STYLE} />
            </div>
            <div>
              <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Amount ($)</label>
              <input type="number" value={a.amount} onChange={function(e){upd('amount',e.target.value);}} style={INP_STYLE} />
            </div>
            <div>
              <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Account</label>
              <select value={a.account} onChange={function(e){upd('account',e.target.value);}} style={SEL_STYLE}>
                {ACCOUNT_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}
              </select>
            </div>
            <div>
              <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Asset Type</label>
              <select value={a.type} onChange={function(e){upd('type',e.target.value);}} style={SEL_STYLE}>
                {ASSET_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}
              </select>
            </div>
            <div>
              <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Risk Level</label>
              <select value={a.risk} onChange={function(e){upd('risk',e.target.value);}} style={SEL_STYLE}>
                {RISK_LEVELS.map(function(t){return <option key={t} value={t}>{t}</option>;})}
              </select>
            </div>
            <div>
              <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Maturity / Horizon</label>
              <input value={a.maturity} onChange={function(e){upd('maturity',e.target.value);}} placeholder="e.g. Aug 2026, Ongoing" style={INP_STYLE} />
            </div>
            <div>
              <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Yield / Return</label>
              <input value={a.yld} onChange={function(e){upd('yld',e.target.value);}} placeholder="e.g. ~4.5%, Real +1.8%" style={INP_STYLE} />
            </div>
            <div>
              <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Assign to Bucket</label>
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
  }

  // ── Move-to-Bucket Modal ─────────────────────────────────────────────────────
  function MoveBucketModal() {
    if (!moveAssetId) return null;
    var a = assets.find(function(x){return x.id===moveAssetId;});
    if (!a) return null;
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:16,padding:28,width:'100%',maxWidth:400}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 style={{fontFamily:PF,fontSize:16,color:TXT1,margin:0,fontWeight:600}}>Move to Bucket</h3>
            <button onClick={function(){setMoveAssetId(null);}} style={{background:'none',border:'none',cursor:'pointer',color:TXT2}}><X size={18}/></button>
          </div>
          <div style={{background:SURFACE2,borderRadius:8,padding:'10px 14px',marginBottom:18}}>
            <div style={{fontSize:13,color:TXT1,fontWeight:600}}>{a.name}</div>
            <div style={{fontSize:12,color:TXT2,marginTop:2}}>{fmtFull(a.amount)} · {a.account} · {a.type}</div>
            {a.bucket && <div style={{fontSize:11,color:TXT3,marginTop:4}}>Currently in {bucketCfg.find(function(b){return b.id===a.bucket;})||{label:'—'}}.label</div>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
            {bucketCfg.map(function(b) {
              var isCur = a.bucket === b.id;
              return (
                <button key={b.id} onClick={function(){moveAssetToBucket(a.id,b.id);}}
                  style={{background:isCur?b.bg:SURFACE2,border:'2px solid '+(isCur?b.color:BORDER2),borderRadius:10,padding:'12px 16px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:12,transition:'all .15s'}}>
                  <div style={{width:10,height:10,borderRadius:2,background:b.color,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,color:isCur?b.color:TXT1,fontWeight:700}}>{b.label}</div>
                    <div style={{fontSize:11,color:TXT2}}>{b.sub}</div>
                  </div>
                  {isCur && <span style={{marginLeft:'auto',fontSize:10,color:b.color,fontWeight:700}}>Current</span>}
                </button>
              );
            })}
            <button onClick={function(){moveAssetToBucket(a.id,null);}}
              style={{background:SURFACE2,border:'2px solid '+BORDER2,borderRadius:10,padding:'12px 16px',cursor:'pointer',textAlign:'left',color:TXT2,fontSize:13}}>
              — Remove from all buckets (unassign)
            </button>
          </div>
        </div>
      </div>
    );
  }

  var overviewProps = {inp,inpWithAssets,successRate,cashFlow,mcPercentiles,derivedTotals,totalPort,buckets,rothWindow,dynTaxRate,er,activeScen,setActiveTab,fmtC,fmtFull};

  function handleWizardComplete(draft) {
    var birthYear = draft.birthYear || null;
    var currentAge = birthYear ? new Date().getFullYear() - birthYear : null;
    var merged = Object.assign({}, flattenPlan({}), {
      birthYear: birthYear,
      currentAge: currentAge,
      hasSpouse: draft.hasSpouse || false,
      spouseBirthYear: draft.spouseBirthYear || null,
      ssFRA: draft.ssFRA || WIZARD_DEFAULTS.ssFRA,
      ssAge: draft.ssAge || WIZARD_DEFAULTS.ssAge,
      spouseSSAt67: draft.spouseSSAt67 || DEFAULTS.spouseSSAt67,
      spouseSSAge: draft.spouseSSAge || DEFAULTS.spouseSSAge,
      monthlyExpenses: draft.monthlyExpenses || WIZARD_DEFAULTS.monthlyExpenses,
      onboardingComplete: true,
    });
    var newRaw = {};
    Object.keys(merged).forEach(function(k) { newRaw[k] = typeof merged[k] === 'number' ? String(merged[k]) : merged[k]; });
    // Starter placeholder assets — one per account type. Skip any with $0 amount.
    var placeholderAssets = [
      { id: 'w1', name: 'IRA/401k (starter)', amount: draft.ira || 0, account: 'IRA', bucket: 2, type: 'Bond', maturity: 'Ongoing', yld: '', risk: 'Medium' },
      { id: 'w2', name: 'Roth (starter)', amount: draft.roth || 0, account: 'Roth IRA', bucket: 3, type: 'Equity ETF', maturity: 'Ongoing', yld: '', risk: 'Medium' },
      { id: 'w3', name: 'Taxable (starter)', amount: draft.taxable || 0, account: 'Taxable', bucket: 1, type: 'Cash', maturity: 'Liquid', yld: '', risk: 'Low' },
    ].filter(function(a) { return (a.amount || 0) > 0; });

    setInp(merged);
    setRaw(newRaw);
    setAssets(placeholderAssets);
    setActiveTab('dashboard');

    // Persist placeholder holdings to DB so they survive reload.
    var apiBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';
    var holdingsPersist = apiBase
      ? Promise.all(placeholderAssets.map(function(a) {
          return fetch(apiBase + '/api/holdings?user_id=' + encodeURIComponent(userId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              account: a.account, name: a.name, symbol: a.name,
              amount: a.amount, type: a.type, bucket: a.bucket, risk: a.risk,
            }),
          }).catch(function(e) { console.warn('holdings POST failed:', e); });
        }))
      : Promise.resolve();

    // Mark complete on the server. Only after both finish do we let the gate
    // close (the auth user state update flips wizardDone to true).
    holdingsPersist.then(function() {
      if (markOnboardingComplete) {
        markOnboardingComplete(draft).catch(function(e) {
          console.error('Failed to mark onboarding complete:', e);
        });
      }
    });
  }

  if (!wizardDone) {
    return <OnboardingWizard onComplete={handleWizardComplete} />;
  }

  return (
    <>
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
        .rs-nav-item:hover{background:rgba(255,255,255,0.08)!important;color:rgba(255,255,255,0.85)!important}
      `}</style>
      <AppShell
        sidebar={
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeScen={activeScen}
            successRate={successRate}
            saveStatus={saveStatus}
            syncToDB={syncToDB}
            saveSilently={saveSilently}
            setShowModal={setShowModal}
            dataSource={dataSource}
            user={authUser}
            logout={authLogout}
          />
        }
        rail={
          <AIInsightsRail
            inp={inp}
            inpWithAssets={inpWithAssets}
            successRate={successRate}
            cashFlow={cashFlow}
            derivedTotals={derivedTotals}
            totalPort={totalPort}
            buckets={buckets}
            rothWindow={rothWindow}
            dynTaxRate={dynTaxRate}
            activeScen={activeScen}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            fmtC={fmtC}
          />
        }
      >
        <AssetEditorModal />
        <MoveBucketModal />

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

      {activeTab === 'dashboard'
        ? <OverviewPage {...overviewProps} />
        : <div style={{background:SURFACE,borderRadius:16,padding:28,border:'1px solid '+BORDER,boxShadow:SHADOW,margin:'0 0 0 0'}}>

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
                  <span style={{fontSize:10,color:TXT3,marginLeft:4,background:ACCENT2,borderRadius:4,padding:'2px 7px',color:'#059669'}}>Based on your actual holdings</span>
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
                    <div style={{fontSize:9,color:TXT2,letterSpacing:1.2,textTransform:'uppercase',marginTop:4}}>{item[0]}</div>
                  </div>
                );
              })}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={CARD}>
                <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:14,fontWeight:600}}>Market Fundamentals</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:14}}>
                  {[['CAPE',inpWithAssets.capeRatio],['10Y Treasury',inpWithAssets.tenYrTreasury+'%'],['TIPS Yield',inpWithAssets.tipsYield+'%']].map(function(item){
                    return <div key={item[0]} style={{textAlign:'center'}}><div style={{fontFamily:PF,fontSize:18,color:TXT1,fontWeight:600}}>{item[1]}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
                  })}
                </div>
                <div style={{borderTop:'1px solid '+BORDER,paddingTop:12,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                  {[['Stocks',fmtPct(er.stock),'#34d399'],['Bonds',fmtPct(er.bond),'#60a5fa'],['Inflation',fmtPct(er.inflation),'#fbbf24']].map(function(item){
                    return <div key={item[0]} style={{textAlign:'center',background:item[2]+'15',borderRadius:7,padding:'8px 4px'}}><div style={{fontFamily:PF,fontSize:16,color:item[2],fontWeight:700}}>{item[1]}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
                  })}
                </div>
              </div>
              <div style={CARD}>
                <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:14,fontWeight:600}}>Dynamic Tax Profile</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  {[['Marginal Rate',(dynTaxRate*100).toFixed(0)+'%','#fbbf24'],['Filing Status',inpWithAssets.filingStatus==='married'?'MFJ':'Single','#60a5fa'],['IRA Balance',fmtC(iraTotal),'#f87171'],['Roth Balance',fmtC(derivedTotals.roth),'#a78bfa']].map(function(item){
                    return <div key={item[0]} style={{background:item[2]+'15',borderRadius:7,padding:'9px 11px'}}><div style={{fontFamily:PF,fontSize:16,color:item[2],fontWeight:700}}>{item[1]}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
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
                  <div style={{fontSize:10,color:'#fb923c',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>Healthcare Costs Included</div>
                  <div style={{display:'flex',gap:18,flexWrap:'wrap'}}>
                    <div><span style={{fontSize:12,color:TXT1,fontWeight:600}}>Phase 1: </span><span style={{fontSize:12,color:'#fb923c',fontWeight:700}}>{fmtC(inpWithAssets.healthPhase1Annual)}/yr</span><span style={{fontSize:11,color:TXT2}}> through age {inpWithAssets.healthPhase1EndAge}</span></div>
                    <div><span style={{fontSize:12,color:TXT1,fontWeight:600}}>Phase 2: </span><span style={{fontSize:12,color:'#fb923c',fontWeight:700}}>{fmtC(inpWithAssets.healthPhase2Annual)}/yr</span><span style={{fontSize:11,color:TXT2}}> inflating {(inpWithAssets.healthInflation*100).toFixed(0)}%/yr</span></div>
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:PF,fontSize:20,color:'#fb923c',fontWeight:700}}>{fmtC(cashFlow.reduce(function(s,r){return s+(r.healthcare||0);},0))}</div>
                  <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>Lifetime HC total</div>
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
                    <span style={{background:'#2dd4bf',color:'white',borderRadius:3,padding:'1px 5px',fontSize:8,fontWeight:700}}>v13</span>
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
                    <span style={{background:'#a78bfa',color:'white',borderRadius:3,padding:'1px 5px',fontSize:8,fontWeight:700}}>v13</span>
                  </div>
                  <div style={{fontSize:11,color:TXT3}}>Estate projections, legacy goal tracker, Roth inheritance advantage</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── INCOME & TAX TAB — v13 ────────────────────────────────────────────── */}
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
                {label:'W-2 Income (Jan-Apr 10)',key:'incW2',color:'#34d399'},
                {label:'Severance (Net)',key:'incSeverance',color:'#60a5fa'},
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
              var primarySS = primarySSForYear(inpWithAssets, tYear);
              var spouseSS = spouseSSForYear(inpWithAssets, tYear);
              var ssTaxable = (primarySS + spouseSS) * 0.85;
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
                          <label style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:5}}>{f.label}</label>
                          <input type="number" step={500} value={thisYear[f.key]||''} placeholder="0"
                            onChange={function(e){updateThisYear(f.key, e.target.value);}}
                            style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:6,padding:'7px 10px',color:f.color,fontSize:15,fontFamily:PF,fontWeight:700,boxSizing:'border-box'}}/>
                        </div>
                      );
                    })}
                    {(primarySS > 0 || spouseSS > 0) && (
                      <div style={{background:'rgba(52,211,153,.08)',border:'1px solid rgba(52,211,153,.2)',borderRadius:10,padding:12}}>
                        <label style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,display:'block',marginBottom:5}}>Social Security (auto)</label>
                        <div style={{fontSize:15,fontFamily:PF,fontWeight:700,color:'#34d399',padding:'7px 0'}}>{fmtFull(Math.round(primarySS + spouseSS))}</div>
                        <div style={{fontSize:9,color:TXT3}}>Primary: {fmtC(primarySS)} · Spouse: {fmtC(spouseSS)}</div>
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
                      <div style={{position:'absolute',left:Math.min((taxableInc/250000)*100,100)+'%',top:-2,transform:'translateX(-50%)',background:'#f87171',color:'white',borderRadius:4,padding:'1px 6px',fontSize:9,fontWeight:700,zIndex:11,whiteSpace:'nowrap'}}>{fmtC(taxableInc)}</div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:TXT3}}>
                      {brackets.map(function(b){return <span key={b.name} style={{color:b.color,fontWeight:600}}>{b.name}: ${(b.top/1000).toFixed(0)}K</span>;})}
                    </div>
                  </div>

                  {/* Headroom + Tax Summary side by side */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                    <div style={{...CARD}}>
                      <h3 style={{fontFamily:PF,fontSize:14,color:TXT1,marginBottom:12,fontWeight:600}}>Conversion / Pull Headroom</h3>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <div style={{background:'rgba(96,165,250,.08)',borderRadius:8,padding:12,textAlign:'center'}}>
                          <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Stay in 12%</div>
                          <div style={{fontFamily:PF,fontSize:20,color:'#60a5fa',fontWeight:700}}>{fmtC(Math.round(room12))}</div>
                        </div>
                        <div style={{background:'rgba(251,191,36,.08)',borderRadius:8,padding:12,textAlign:'center'}}>
                          <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Stay in 22%</div>
                          <div style={{fontFamily:PF,fontSize:20,color:'#fbbf24',fontWeight:700}}>{fmtC(Math.round(room22))}</div>
                        </div>
                        <div style={{background:'rgba(248,113,113,.08)',borderRadius:8,padding:12,textAlign:'center'}}>
                          <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>IRMAA-Safe Room</div>
                          <div style={{fontFamily:PF,fontSize:20,color:irmaaSafe>0?'#34d399':'#f87171',fontWeight:700}}>{fmtC(Math.round(irmaaSafe))}</div>
                        </div>
                        <div style={{background:safeConv>5000?'rgba(52,211,153,.08)':'rgba(248,113,113,.08)',borderRadius:8,padding:12,textAlign:'center'}}>
                          <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Safe to Pull/Convert</div>
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
                      <div style={{marginTop:10,background:'rgba(251,191,36,.06)',borderRadius:6,padding:'8px 10px',fontSize:10,color:TXT3}}>
                        <strong style={{color:'#fbbf24'}}>IRMAA:</strong> {tYear} income affects {tYear+2} Medicare premiums. MAGI: {fmtFull(Math.round(grossTaxable))} {grossTaxable > 212000 ? '⚠️ Over $212K threshold' : '✓ Under $212K'}
                      </div>
                    </div>
                  </div>

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

        {activeTab === 'spending' && <SpendingTab ctx={tabCtx} />}

        {activeTab === 'assets' && (
          <AssetsTab
            assets={assets}
            bucketCfg={bucketCfg}
            openAddAsset={openAddAsset}
            openEditAsset={openEditAsset}
            deleteAsset={deleteAsset}
            setMoveAssetId={setMoveAssetId}
            derivedTotals={derivedTotals}
            iraTotal={iraTotal}
            unassigned={unassigned}
            composition={composition}
            totalPort={totalPort}
            inpWithAssets={inpWithAssets}
            fmtC={fmtC}
            fmtFull={fmtFull}
            PF={PF}
            SURFACE={SURFACE}
            SURFACE2={SURFACE2}
            BORDER={BORDER}
            TXT1={TXT1}
            TXT2={TXT2}
            TXT3={TXT3}
            CARD={CARD}
            TYPE_C={TYPE_C}
            RISK_C={RISK_C}
          />
        )}
        {activeTab === 'buckets' && (
          <PortfolioPage
            assets={assets}
            buckets={buckets}
            bucketCfg={bucketCfg}
            totalPort={totalPort}
            composition={composition}
            unassigned={unassigned}
            openAddAsset={openAddAsset}
            openEditAsset={openEditAsset}
            deleteAsset={deleteAsset}
            setMoveAssetId={setMoveAssetId}
            moveAssetToBucket={moveAssetToBucket}
            fmtC={fmtC}
            fmtFull={fmtFull}
            inp={inp}
          />
        )}
        {false && activeTab === 'buckets_legacy' && (
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
                                style={{background:b.color+'20',border:'1px solid '+b.color+'40',borderRadius:5,padding:'4px 8px',cursor:'pointer',color:b.color,fontSize:10,fontWeight:700}}>
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
                        <div style={{fontSize:10,color:TXT2}}>target {fmtFull(b.target)}</div>
                      </div>
                      <div style={{background:over?'rgba(52,211,153,.15)':'rgba(251,191,36,.15)',border:'1px solid '+(over?'rgba(52,211,153,.3)':'rgba(251,191,36,.3)'),borderRadius:5,padding:'3px 8px'}}>
                        <span style={{fontSize:10,color:over?'#34d399':'#fbbf24',fontWeight:700}}>{over?'+'+fmtFull(b.current-b.target)+' over':fmtFull(b.target-b.current)+' to goal'}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{height:4,background:SURFACE,borderRadius:3,marginBottom:16,overflow:'hidden'}}>
                    <div style={{height:4,width:Math.min((b.current/b.target)*100,100)+'%',background:b.color,borderRadius:3}}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1.1fr 1fr',gap:16}}>
                    <div>
                      <h4 style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginBottom:8,fontWeight:700}}>Holdings ({b.holdings.length})</h4>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead><tr>{['Asset','Amount','Account',''].map(function(h){return <th key={h} style={{padding:'3px 6px',textAlign:h==='Amount'?'right':'left',color:TXT2,fontSize:9,fontWeight:700,textTransform:'uppercase',borderBottom:'1px solid '+b.border}}>{h}</th>;})}</tr></thead>
                        <tbody>
                          {b.holdings.map(function(h,i){
                            // Find full asset to get id for move button
                            var fullA = assets.find(function(a){return a.name===h.name&&a.account===h.account;});
                            return (
                              <tr key={i}>
                                <td style={{padding:'4px 6px',color:TXT1}}>{h.name}</td>
                                <td style={{padding:'4px 6px',textAlign:'right',color:b.color,fontWeight:700}}>{fmtFull(h.amount)}</td>
                                <td style={{padding:'4px 6px'}}><span style={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:3,padding:'1px 4px',fontSize:9,color:TXT3}}>{h.account}</span></td>
                                <td style={{padding:'4px 6px'}}>
                                  {fullA && <button onClick={function(){setMoveAssetId(fullA.id);}} className="mbtn" style={{background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',borderRadius:4,padding:'2px 5px',cursor:'pointer',color:'#a78bfa',fontSize:9,transition:'background .15s'}}>Move</button>}
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{borderTop:'1px solid '+b.border}}><td style={{padding:'5px 6px',fontWeight:700,color:TXT1}}>Total</td><td style={{padding:'5px 6px',textAlign:'right',color:b.color,fontWeight:700}}>{fmtFull(b.current)}</td><td/><td/></tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h4 style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginBottom:8,fontWeight:700}}>Strategy</h4>
                      <p style={{fontSize:12,color:TXT3,lineHeight:1.6,marginBottom:10}}>{b.purpose}</p>
                      <div style={{background:SURFACE2,borderRadius:7,padding:10,border:'1px solid '+BORDER}}>
                        <p style={{fontSize:11,color:TXT2,lineHeight:1.6,margin:0}}>{b.strategy}</p>
                      </div>
                      <div style={{marginTop:10}}><span style={{background:b.color+'22',color:b.color,border:'1px solid '+b.color+'44',borderRadius:4,padding:'2px 7px',fontSize:10,fontWeight:700}}>{b.risk}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {activeTab === 'cashflow' && <CashFlowTab ctx={tabCtx} />}
        {activeTab === 'monte' && <MonteCarloTab ctx={tabCtx} />}

        {/* ── ROTH CONVERSIONS TAB — v13 ────────────────────────────────────────── */}
        {activeTab === 'roth' && <RothConversionsTab ctx={tabCtx} />}

        {/* ── SS STRATEGY TAB — v13 ─────────────────────────────────────────────── */}
        {activeTab === 'ss' && (
          <div>
            <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Social Security Strategy</h2>
            <p style={{fontSize:12,color:TXT2,marginBottom:16}}>Claiming age comparison · Spouse early-claim toggle · Roth Bridge analysis · Portfolio impact</p>

            {/* Spouse SS Toggle */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.2)',borderRadius:10,padding:'10px 16px'}}>
              <span style={{fontSize:12,color:TXT2,fontWeight:600}}>Spouse SS:</span>
              <button onClick={function(){setField('spouseEarlyClaim',inp.spouseEarlyClaim?0:1);}}
                style={{background:inp.spouseEarlyClaim?'#a78bfa':'rgba(167,139,250,.15)',border:'1px solid #a78bfa',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:inp.spouseEarlyClaim?'white':'#a78bfa',fontSize:11,fontWeight:700}}>
                Age 63 — $1,472/mo
              </button>
              <button onClick={function(){setField('spouseEarlyClaim',inp.spouseEarlyClaim?0:1);}}
                style={{background:!inp.spouseEarlyClaim?'#60a5fa':'rgba(96,165,250,.15)',border:'1px solid #60a5fa',borderRadius:6,padding:'5px 12px',cursor:'pointer',color:!inp.spouseEarlyClaim?'white':'#60a5fa',fontSize:11,fontWeight:700}}>
                Age 67 — $1,879/mo
              </button>
              <span style={{fontSize:11,color:TXT3,marginLeft:8}}>
                {inp.spouseEarlyClaim ? 'Lower benefit · Immediate income' : 'Higher benefit · Larger gap years'}
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
                  <div style={{fontSize:10,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:4}}>Breakeven Age<br/>67 → 70</div>
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
                    <div style={{textAlign:'center'}}><div style={{fontFamily:PF,fontSize:16,color:'#fbbf24',fontWeight:700}}>{fmtC(projA[projA.length-1]?.balance)}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5}}>Age {ssCompareAge}</div></div>
                    <div style={{textAlign:'center'}}><div style={{fontFamily:PF,fontSize:16,color:'#a78bfa',fontWeight:700}}>{fmtC(proj70[proj70.length-1]?.balance)}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5}}>Age 70</div></div>
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
                      return <th key={h} style={{padding:'8px 11px',textAlign:h==='Claim Age'||h==='Note'?'left':'right',color:TXT2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,borderBottom:'1px solid '+BORDER,whiteSpace:'nowrap'}}>{h}</th>;
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
                            {isSelected&&<span style={{background:'rgba(16,185,129,.15)',color:'#34d399',border:'1px solid rgba(16,185,129,.3)',borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:700,whiteSpace:'nowrap'}}>Your Setting</span>}
                            {is70&&!isSelected&&<span style={{background:'rgba(167,139,250,.15)',color:'#a78bfa',border:'1px solid rgba(167,139,250,.3)',borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:700}}>Recommended</span>}
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
                  <XAxis dataKey="age" stroke={BORDER2} tick={{fontSize:10,fill:TXT3}}/>
                  <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:10,fill:TXT3}}/>
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
                  <XAxis dataKey="age" stroke={BORDER2} tick={{fontSize:10,fill:TXT3}}/>
                  <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:10,fill:TXT3}}/>
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
                    <div style={{fontSize:10,color:TXT3,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>{m.label}</div>
                    <div style={{fontFamily:PF,fontSize:18,color:m.color,fontWeight:700}}>{m.val}</div>
                    <div style={{fontSize:10,color:TXT2,marginTop:3}}>{m.sub}</div>
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
                        return <th key={h} style={{padding:'6px 8px',textAlign:'right',color:TXT3,fontWeight:600,fontSize:10,textTransform:'uppercase',letterSpacing:0.3,whiteSpace:'nowrap'}}>{h}</th>;
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
                      <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{item.label}</div>
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
                  <XAxis dataKey="age" stroke={BORDER2} tick={{fontSize:10,fill:TXT3}}/>
                  <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{fontSize:10,fill:TXT3}}/>
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
                      <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginTop:2}}>{m[0]}</div>
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
          <SettingsTab
            inp={inp}
            raw={raw}
            setField={setField}
            setActiveTab={setActiveTab}
            scenarios={scenarios}
            setScenarios={setScenarios}
            createPresetScenario={createPresetScenario}
            activeScen={activeScen}
            setShowModal={setShowModal}
            loadScen={loadScen}
            syncToDB={syncToDB}
            saveStatus={saveStatus}
            saveError={saveError}
            derivedTotals={derivedTotals}
            totalPort={totalPort}
            fmtC={fmtC}
            PF={PF}
            SURFACE2={SURFACE2}
            BORDER={BORDER}
            TXT1={TXT1}
            TXT2={TXT2}
            TXT3={TXT3}
            DEFAULTS={DEFAULTS}
            DEFAULT_ASSETS={DEFAULT_ASSETS}
            DEFAULT_BUCKET_CONFIG={DEFAULT_BUCKET_CONFIG}
          />
        )}




      </div>}
      </AppShell>

      {/* Toast notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#0A4D54', color: '#FFFFFF',
          borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999,
          pointerEvents: 'none',
        }}>{toastMsg}</div>
      )}
    </>
  );
}