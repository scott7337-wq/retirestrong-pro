import React, { useState } from 'react';
import { TrendingUp, Calendar, Shield, Clock, DollarSign, ShieldAlert } from 'lucide-react';
import SmartAlert from './SmartAlert.jsx';
import StatusPill from './StatusPill.jsx';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';

// ── Style constants ──────────────────────────────────────────────────────────
var CARD = {
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

// ── Static data ──────────────────────────────────────────────────────────────
var LEVERS = [
  {
    id: 'spending', icon: '💰', title: 'Spending Level', tab: 'spending', impact: 'high',
    description: 'Your withdrawal rate is the single biggest lever in your control. Even $500/mo less meaningfully improves success rate.',
  },
  {
    id: 'roth', icon: '📊', title: 'Roth Conversions', tab: 'roth', impact: 'high',
    description: 'Convert IRA to Roth before RMDs begin. Fill lower tax brackets and reduce future Medicare IRMAA surcharges.',
  },
  {
    id: 'ss', icon: '🏛️', title: 'SS Timing', tab: 'ss', impact: 'medium',
    description: 'Delaying Social Security to age 70 maximizes your benefit and reduces early portfolio draw — strong SORR protection.',
  },
];

var WHAT_IF = [
  { id: 'ss70',         label: 'What if I delay Social Security to 70?',  tabTarget: 'ss'       },
  { id: 'reduce_spend', label: 'What if I reduce spending by $10K/year?', tabTarget: 'spending' },
  { id: 'market_drop',  label: 'What if markets drop 30% in year 1?',     tabTarget: 'monte'    },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtShort(v) {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return '$' + Math.round(v || 0).toLocaleString();
}

function fmtMonthly(v) {
  return '$' + Math.round(v || 0).toLocaleString() + '/mo';
}

// ── Component ────────────────────────────────────────────────────────────────
export default function OverviewPage({
  inp, inpWithAssets, successRate, cashFlow, mcPercentiles,
  derivedTotals, totalPort, buckets, rothWindow, dynTaxRate, er,
  activeScen, setActiveTab, fmtC, fmtFull,
}) {
  var authCtx = useAuth();
  var authUser = authCtx ? authCtx.user : null;
  var planLabel = (authUser && authUser.name) ? authUser.name : 'Your Plan';
  var sr = parseFloat(successRate) || 0;

  var annualExp = (inpWithAssets.monthlyExpenses || 0) * 12;

  // Years funded from cashFlow
  var lastFunded = 0;
  if (cashFlow && cashFlow.length) {
    var funded = cashFlow.filter(function(r) { return (r.balance || 0) > 0; });
    lastFunded = funded.length ? funded[funded.length - 1].year : 0;
  }
  var yearsFunded = lastFunded ? lastFunded - 2026 : (inpWithAssets.lifeExpectancy - inpWithAssets.currentAge);

  // B1 coverage
  var b1Current = (buckets && buckets[0]) ? buckets[0].current : 0;
  var b1Target  = (buckets && buckets[0]) ? (buckets[0].target || 259000) : 259000;
  var b1CovYears = annualExp > 0 ? b1Current / annualExp : 0;

  // Roth alert
  var rw = rothWindow || {};
  var showRothAlert = rw.years > 0 && (rw.totalRecommended || 0) > 0;
  var rothYear = new Date().getFullYear();
  var rothMonthsLeft = Math.max(0, 12 - 4);
  var rothHeadroom = rw.yearByYear && rw.yearByYear[0] ? rw.yearByYear[0].recommended : (rw.conservative || 0);
  var rothRate = rw.yearByYear && rw.yearByYear[0] ? rw.yearByYear[0].taxRate : '12%';

  // B1 alert
  var hasBucketData = (buckets && buckets[0] && (buckets[0].current > 0 || (buckets[0].target > 0 && buckets[0].target !== 259000)));
  var showB1Alert = hasBucketData && b1CovYears < 2.0;

  // Status pills
  var planHealth = sr >= 85 ? { text: 'Strong', color: 'green' } : sr >= 70 ? { text: 'Watch', color: 'amber' } : { text: 'At Risk', color: 'red' };

  // Tax efficiency
  var magi2027 = rw.yearByYear && rw.yearByYear[0] ? rw.yearByYear[0].magi : 0;
  var taxEfficiency = magi2027 < 180000
    ? { text: 'Optimized',     color: 'green' }
    : magi2027 < 212000
    ? { text: 'Review Needed', color: 'amber' }
    : { text: 'IRMAA Risk',    color: 'red'   };

  // Bucket status
  var bucketsBalanced = (buckets || []).every(function(b) {
    if (!b.target || b.target === 0) return true;
    return Math.abs(b.current - b.target) / b.target <= 0.10;
  });
  var bucketStatus = bucketsBalanced
    ? { text: 'Well Balanced',    color: 'green' }
    : { text: 'Rebalance Needed', color: 'amber' };

  var now = new Date();
  var timeStr  = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  var monthStr = now.toLocaleDateString('en-US',  { month: 'short', year: 'numeric' });

  // This Month's Draw
  var drawDismissedState = useState(function() {
    try { return localStorage.getItem('rsDrawCardDismissed') === 'true'; } catch(e) { return false; }
  });
  var drawDismissed    = drawDismissedState[0];
  var setDrawDismissed = drawDismissedState[1];
  var currentMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  var firstRow   = (cashFlow && cashFlow[0]) ? cashFlow[0] : {};
  var monthlyAmt = inpWithAssets.monthlyExpenses || inp.monthlyExpenses || 0;
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
  var irmaaOk    = magi2027 < 206000;
  var irmaaText  = irmaaOk ? 'Safe ✓' : '⚠ Watch';
  var irmaaColor = irmaaOk ? '#059669' : '#D97706';

  // Spending vs. Income
  var cfYear        = firstRow.year || 2026;
  var cfAnnualSpend  = firstRow.expenses || annualExp;
  var cfAnnualIncome = (firstRow.primarySS || 0) + (firstRow.spouseSS || 0);
  var cfGap          = Math.max(0, cfAnnualSpend - cfAnnualIncome);
  var incomeBarPct   = cfAnnualSpend > 0 ? Math.min((cfAnnualIncome / cfAnnualSpend) * 100, 100) : 0;

  // Stacked area chart data — taxable + ira + roth per year
  var chartData = (cashFlow || []).map(function(r) {
    var total   = Math.round((r.balance     || 0) / 1000);
    var ira     = Math.round((r.iraBalance  || 0) / 1000);
    var roth    = Math.round((r.rothBalance || 0) / 1000);
    var taxable = Math.max(0, total - ira - roth);
    return { year: r.year, taxable: taxable, ira: ira, roth: roth };
  });

  return (
    <div style={{ padding: '24px 28px', background: '#F9FAFB', minHeight: '100%' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Overview</h1>
          <div style={{ fontSize: 14, color: '#6B7280' }}>{planLabel} · {monthStr}</div>
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>Last updated: Today at {timeStr}</div>
      </div>

      {/* 1 — KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { Icon: TrendingUp, iconColor: '#0F766E', label: 'Total Portfolio',  value: fmtShort(totalPort),                                                  sub: 'All accounts combined'   },
          { Icon: Calendar,   iconColor: '#2563EB', label: 'Monthly Spending', value: fmtMonthly(inpWithAssets.monthlyExpenses || inp.monthlyExpenses || 0), sub: 'Monthly spending target'  },
          { Icon: Shield,     iconColor: '#059669', label: 'Success Rate',     value: successRate + '%',                                                    sub: 'Monte Carlo · 500 runs'  },
          { Icon: Clock,      iconColor: '#D97706', label: 'Years Funded',     value: yearsFunded + ' yrs',                                                  sub: 'Current trajectory'      },
        ].map(function(card) {
          return (
            <div key={card.label} style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <card.Icon size={16} color={card.iconColor} />
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: '#6B7280', textTransform: 'uppercase' }}>{card.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* 2 — Portfolio Trajectory (stacked area) */}
      {chartData.length > 0 && (
        <div style={Object.assign({}, CARD, { marginBottom: 20 })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Portfolio Trajectory</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Taxable · IRA · Roth · real $</div>
            </div>
            {sr > 0 && (
              <div style={{
                fontSize: 12, fontWeight: 700,
                color:      sr >= 85 ? '#059669' : sr >= 70 ? '#D97706' : '#DC2626',
                background: sr >= 85 ? '#D1FAE5' : sr >= 70 ? '#FEF3C7' : '#FEE2E2',
                padding: '4px 10px', borderRadius: 20,
              }}>{sr}% success</div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                width={54}
                tickFormatter={function(v) { return '$' + v + 'k'; }}
              />
              <Tooltip
                formatter={function(v, name) {
                  var lbl = name === 'taxable' ? 'Taxable' : name === 'ira' ? 'IRA' : 'Roth';
                  return ['$' + v + 'k', lbl];
                }}
                labelFormatter={function(l) { return 'Year ' + l; }}
                contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              />
              <Area type="monotone" dataKey="taxable" stackId="s" stroke="none" fill="#C8A882" isAnimationActive={false} />
              <Area type="monotone" dataKey="ira"     stackId="s" stroke="none" fill="#6B8FA8" isAnimationActive={false} />
              <Area type="monotone" dataKey="roth"    stackId="s" stroke="none" fill="#7A9E7E" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend + nav link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
            {[
              { color: '#C8A882', label: 'Taxable / Cash'   },
              { color: '#6B8FA8', label: 'IRA / Traditional' },
              { color: '#7A9E7E', label: 'Roth'              },
            ].map(function(l) {
              return (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{l.label}</span>
                </div>
              );
            })}
            <button
              onClick={function() { setActiveTab('cashflow'); }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0A4D54', fontWeight: 500 }}
            >Full projection →</button>
          </div>
        </div>
      )}

      {/* 3 — Levers Section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Levers to Improve Your Plan</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Key actions to strengthen your retirement outcome</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {LEVERS.map(function(lv) {
            return (
              <div key={lv.id} style={Object.assign({}, CARD, { display: 'flex', flexDirection: 'column' })}>
                <div style={{ fontSize: 20, marginBottom: 10 }}>{lv.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{lv.title}</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, marginBottom: 10, flex: 1 }}>{lv.description}</div>
                <div style={{ fontSize: 12, color: lv.impact === 'high' ? '#DC2626' : '#6B7280', fontWeight: 500, marginBottom: 12 }}>
                  {lv.impact === 'high' ? '↑ High impact' : '↗ Medium impact'}
                </div>
                <button
                  onClick={function() { setActiveTab(lv.tab); }}
                  onMouseEnter={function(e) { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
                  style={{
                    background: 'transparent', border: '1px solid #D1D5DB',
                    borderRadius: '6px', padding: '6px 16px',
                    fontSize: 13, color: '#374151', cursor: 'pointer', width: '100%',
                  }}
                >Explore →</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 — Quick What-If */}
      <div style={Object.assign({}, CARD, { marginBottom: 20, padding: 0, overflow: 'hidden' })}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Quick What-If Scenarios</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>See instant impact of common changes</div>
            </div>
          </div>
        </div>
        {WHAT_IF.map(function(s) {
          return (
            <button
              key={s.id}
              onClick={function() { setActiveTab(s.tabTarget); }}
              onMouseEnter={function(e) { e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '14px 20px',
                background: 'transparent', border: 'none', borderBottom: '1px solid #E5E7EB',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 13, color: '#374151' }}>{s.label}</span>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>→</span>
            </button>
          );
        })}
      </div>

      {/* 5 — This Month's Draw */}
      {!drawDismissed && monthlyAmt > 0 && (
        <div style={Object.assign({}, CARD, { marginBottom: 16 })}>
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
            <span style={{ fontSize: 22, fontWeight: 600, color: '#111827' }}>${Math.round(monthlyAmt || 0).toLocaleString()}/mo</span>
            <span style={{ fontSize: 14, color: '#374151' }}>From: {drawSource}</span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            <span style={{ color: '#6B7280' }}>Est. tax impact: {taxImpact}</span>
            <span style={{ color: irmaaColor, fontWeight: 500 }}>IRMAA: {irmaaText}</span>
          </div>
        </div>
      )}

      {/* 6 — Spending vs. Income */}
      <div style={Object.assign({}, CARD, { marginBottom: 16 })}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          SPENDING VS. INCOME · {cfYear}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: '#374151' }}>Expenses</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>{fmtShort(cfAnnualSpend)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: '#DC2626', borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: '#374151' }}>Income (SS + other)</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#059669' }}>{fmtShort(cfAnnualIncome)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: incomeBarPct + '%', background: '#059669', borderRadius: 4 }} />
          </div>
        </div>
        {cfGap > 0 && (
          <div style={{ fontSize: 13, color: '#D97706', fontWeight: 500 }}>
            → Gap of {fmtShort(cfGap)} funded from portfolio
          </div>
        )}
        {cfGap === 0 && cfAnnualIncome > 0 && (
          <div style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>
            ✓ Income covers spending — no portfolio draw needed
          </div>
        )}
      </div>

      {/* 7 — Status Pills */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <StatusPill label="Plan Health"    statusText={planHealth.text}    color={planHealth.color} />
        <StatusPill label="Tax Efficiency" statusText={taxEfficiency.text} color={taxEfficiency.color} />
        <StatusPill label="Bucket Status"  statusText={bucketStatus.text}  color={bucketStatus.color} />
      </div>

      {/* 8 — Smart Alerts */}
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

    </div>
  );
}
