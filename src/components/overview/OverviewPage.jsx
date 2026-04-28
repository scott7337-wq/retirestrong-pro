import React, { useState } from 'react';
import { TrendingUp, Calendar, Shield, Clock, DollarSign, ShieldAlert } from 'lucide-react';
import { CalendarDays, BarChart2, Heart } from 'lucide-react';
import SmartAlert from './SmartAlert.jsx';
import KPICard from './KPICard.jsx';
import StatusPill from './StatusPill.jsx';
import MilestonesRibbon from './MilestonesRibbon.jsx';
import PortfolioSparkline from './PortfolioSparkline.jsx';
import QuickWhatIf from './QuickWhatIf.jsx';

function fmtShort(v) {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return '$' + Math.round(v || 0).toLocaleString();
}

function fmtMonthly(v) {
  return '$' + Math.round(v || 0).toLocaleString() + '/mo';
}

export default function OverviewPage({
  inp, inpWithAssets, successRate, cashFlow, mcPercentiles,
  derivedTotals, totalPort, buckets, rothWindow, dynTaxRate, er,
  activeScen, setActiveTab, fmtC, fmtFull,
}) {
  var sr = parseFloat(successRate) || 0;

  var annualExp = (inpWithAssets.monthlyExpenses || 8000) * 12;

  // Years funded from cashFlow
  var lastFunded = 0;
  if (cashFlow && cashFlow.length) {
    var funded = cashFlow.filter(function(r) { return (r.balance || 0) > 0; });
    lastFunded = funded.length ? funded[funded.length - 1].year : 0;
  }
  var yearsFunded = lastFunded ? lastFunded - 2026 : (inpWithAssets.lifeExpectancy - inpWithAssets.currentAge);

  // B1 coverage
  var b1Current = (buckets && buckets[0]) ? buckets[0].current : 0;
  var b1Target = (buckets && buckets[0]) ? (buckets[0].target || 259000) : 259000;
  var b1CovYears = annualExp > 0 ? b1Current / annualExp : 0;

  // Roth alert
  var rw = rothWindow || {};
  var showRothAlert = rw.years > 0 && (rw.totalRecommended || 0) > 0;
  var rothYear = 2027;
  var rothMonthsLeft = Math.max(0, 12 - 4); // April → Dec
  var rothHeadroom = rw.yearByYear && rw.yearByYear[0] ? rw.yearByYear[0].recommended : (rw.conservative || 0);
  var rothRate = rw.yearByYear && rw.yearByYear[0] ? rw.yearByYear[0].taxRate : '12%';

  // B1 alert
  var showB1Alert = b1CovYears < 2.0;

  // Status pills
  var planHealth = sr >= 85 ? { text: 'Strong', color: 'green' } : sr >= 70 ? { text: 'Watch', color: 'amber' } : { text: 'At Risk', color: 'red' };

  // Tax efficiency — use MAGI from rothWindow if available
  var magi2027 = rw.yearByYear && rw.yearByYear[0] ? rw.yearByYear[0].magi : 0;
  var taxEfficiency = magi2027 < 180000
    ? { text: 'Optimized', color: 'green' }
    : magi2027 < 212000
    ? { text: 'Review Needed', color: 'amber' }
    : { text: 'IRMAA Risk', color: 'red' };

  // Bucket status — check if all within 10% of target
  var bucketsBalanced = (buckets || []).every(function(b) {
    if (!b.target || b.target === 0) return true;
    return Math.abs(b.current - b.target) / b.target <= 0.10;
  });
  var bucketStatus = bucketsBalanced
    ? { text: 'Well Balanced', color: 'green' }
    : { text: 'Rebalance Needed', color: 'amber' };

  // Milestones
  var curAge = inpWithAssets.currentAge || 66;
  var retAge = inpWithAssets.retirementAge || 67;
  var ssAge  = inpWithAssets.ssAge || 70;
  var spouseAge = inpWithAssets.spouseCurrentAge || 63;
  var retirementYear   = 2026 + Math.max(0, retAge - curAge);
  var ssYear           = 2026 + Math.max(0, ssAge - curAge);
  var staceyMedicare   = 2026 + Math.max(0, 65 - spouseAge);
  var rmdYear          = 2026 + Math.max(0, 73 - curAge);

  var milestones = [
    { key: 'retirement', year: retirementYear, label: 'Retirement Start', icon: CalendarDays,  isPast: retirementYear <= 2026 },
    { key: 'ss',         year: ssYear,          label: 'Social Security',  icon: DollarSign,    isPast: ssYear <= 2026 },
    { key: 'medicare',   year: staceyMedicare,  label: 'Stacey Medicare', icon: Heart,          isPast: staceyMedicare <= 2026 },
    { key: 'rmd',        year: rmdYear,          label: 'RMDs Begin',      icon: BarChart2,      isPast: rmdYear <= 2026 },
  ];

  // Last updated timestamp
  var now = new Date();
  var timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  var monthStr = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // This Month's Draw card
  var drawDismissedState = useState(function() {
    try { return localStorage.getItem('rsDrawCardDismissed') === 'true'; } catch(e) { return false; }
  });
  var drawDismissed = drawDismissedState[0];
  var setDrawDismissed = drawDismissedState[1];
  var currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  var firstRow = (cashFlow && cashFlow[0]) ? cashFlow[0] : {};
  var monthlyAmt = inpWithAssets.monthlyExpenses || inp.monthlyExpenses || 8000;
  var drawSource = firstRow.fromTaxable > 0
    ? 'Taxable account (B1 sweep)'
    : firstRow.fromIRA > 0
    ? 'IRA distribution'
    : firstRow.fromRoth > 0
    ? 'Roth IRA (tax-free)'
    : 'Portfolio (B1)';
  var taxImpact = firstRow.fromTaxable > 0
    ? '~$0 (return of basis)'
    : firstRow.fromIRA > 0
    ? '~' + fmtShort(monthlyAmt * 0.22) + ' est. (22% bracket)'
    : firstRow.fromRoth > 0
    ? '$0 (tax-free)'
    : '~$0';
  var irmaaOk = magi2027 < 206000;
  var irmaaText = irmaaOk ? 'Safe ✓' : '⚠ Watch';
  var irmaaColor = irmaaOk ? '#3D6337' : '#8A5515';

  // Spending vs. Income bar card
  var cfYear = firstRow.year || 2026;
  var cfAnnualSpend = firstRow.expenses || annualExp;
  var cfAnnualIncome = (firstRow.scottSS || 0) + (firstRow.staceySS || 0);
  var cfGap = Math.max(0, cfAnnualSpend - cfAnnualIncome);
  var incomeBarPct = cfAnnualSpend > 0 ? Math.min((cfAnnualIncome / cfAnnualSpend) * 100, 100) : 0;

  return (
    <div style={{ padding: '24px 28px', background: '#F5F3EF', minHeight: '100%' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px', fontFamily: "'Source Sans 3', sans-serif" }}>Overview</h1>
          <div style={{ fontSize: 14, color: '#6B7280' }}>Scott & Stacey · {monthStr}</div>
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>Last updated: Today at {timeStr}</div>
      </div>

      {/* KPI Strip — always first after header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard
          icon={TrendingUp}
          iconColor="#0F766E"
          topBorderColor="#0F766E"
          label="Total Portfolio"
          value={fmtShort(totalPort)}
          sub="All accounts combined"
        />
        <KPICard
          icon={Calendar}
          iconColor="#2563EB"
          topBorderColor="#2563EB"
          label="Monthly Income"
          value={fmtMonthly(inpWithAssets.monthlyExpenses || inp.monthlyExpenses || 8000)}
          sub="Monthly spending target"
        />
        <KPICard
          icon={Shield}
          iconColor="#059669"
          topBorderColor="#059669"
          label="Success Rate"
          value={successRate + '%'}
          sub="Monte Carlo · 500 runs"
        />
        <KPICard
          icon={Clock}
          iconColor="#D97706"
          topBorderColor="#D97706"
          label="Years Funded"
          value={yearsFunded + ' yrs'}
          sub="Current trajectory"
        />
      </div>

      {/* Smart Alerts — below KPIs */}
      {(showRothAlert || showB1Alert) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {showRothAlert && (
            <SmartAlert
              borderColor="#0F766E"
              iconBg="#CCFBF1"
              icon={DollarSign}
              iconColor="#0F766E"
              title="Roth Conversion Window Closing"
              body={'Your ' + rothYear + ' tax window for optimal conversions closes in ' + rothMonthsLeft + ' months. Current headroom: ' + (fmtC || fmtShort)(rothHeadroom) + ' at ' + rothRate + ' rate.'}
              actionLabel="Review Tax Strategy →"
              onAction={function() { setActiveTab('roth'); }}
            />
          )}
          {showB1Alert && (
            <SmartAlert
              borderColor="#D97706"
              iconBg="#FEF3C7"
              icon={ShieldAlert}
              iconColor="#D97706"
              title="Bucket 1 Coverage Below Target"
              body={'Current B1 coverage: ' + b1CovYears.toFixed(1) + ' years vs. 2.5-year target. Consider refilling before year-end.'}
              actionLabel="View Portfolio →"
              onAction={function() { setActiveTab('buckets'); }}
            />
          )}
        </div>
      )}

      {/* This Month's Draw card */}
      {!drawDismissed && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E8E4DC',
          borderLeft: '3px solid #0A4D54',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              THIS MONTH'S DRAW · {currentMonthYear}
            </span>
            <button
              onClick={function() {
                setDrawDismissed(true);
                try { localStorage.setItem('rsDrawCardDismissed', 'true'); } catch(e) {}
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
            >×</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: '#0A4D54' }}>{(fmtC || fmtShort)(monthlyAmt)}</span>
            <span style={{ fontSize: 14, color: '#374151' }}>From: {drawSource}</span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            <span style={{ color: '#6B7280' }}>Est. tax impact: {taxImpact}</span>
            <span style={{ color: irmaaColor, fontWeight: 500 }}>IRMAA: {irmaaText}</span>
          </div>
        </div>
      )}

      {/* Spending vs. Income bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          SPENDING VS. INCOME · {cfYear}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: '#374151' }}>Expenses</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#8B3528' }}>{fmtShort(cfAnnualSpend)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#F0EDE8', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: '#8B3528', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: '#374151' }}>Income (SS + other)</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#3D6337' }}>{fmtShort(cfAnnualIncome)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#F0EDE8', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: incomeBarPct + '%', background: '#3D6337', borderRadius: 4 }} />
          </div>
        </div>
        {cfGap > 0 && (
          <div style={{ fontSize: 13, color: '#8A5515', fontWeight: 500 }}>
            → Gap of {fmtShort(cfGap)} funded from portfolio
          </div>
        )}
        {cfGap === 0 && cfAnnualIncome > 0 && (
          <div style={{ fontSize: 13, color: '#3D6337', fontWeight: 500 }}>
            ✓ Income covers spending — no portfolio draw needed
          </div>
        )}
      </div>

      {/* Status Pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <StatusPill label="Plan Health"    statusText={planHealth.text}    color={planHealth.color} />
        <StatusPill label="Tax Efficiency" statusText={taxEfficiency.text} color={taxEfficiency.color} />
        <StatusPill label="Bucket Status"  statusText={bucketStatus.text}  color={bucketStatus.color} />
      </div>

      {/* Milestones */}
      <div style={{ marginBottom: 20 }}>
        <MilestonesRibbon milestones={milestones} />
      </div>

      {/* Sparkline + What-If side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <PortfolioSparkline cashFlow={cashFlow} setActiveTab={setActiveTab} />
        <QuickWhatIf setActiveTab={setActiveTab} />
      </div>

    </div>
  );
}
