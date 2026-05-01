import React, { useState, useRef } from 'react';
import { getRMDStartAge } from '../../engine/constants.js';
import {
  ComposedChart, BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

var CARD = {
  background: '#FCFBF8',
  border: '1px solid #D4D1C5',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  marginBottom: 20,
};

function fmtShort(v) {
  if (!v && v !== 0) return '—';
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return '$' + Math.round(v).toLocaleString();
}

function DetailSection({ row, fmtC }) {
  var fmt = fmtC || fmtShort;

  // Source-of-funds stacked bar
  var ssIncome = (row.primarySS || 0) + (row.spouseSS || 0) + (row.pension || 0);
  var otherInc = (row.otherIncome || 0);
  var portDraw = (row.fromIRA || 0) + (row.fromRoth || 0) + (row.fromTaxable || 0);
  var totalNeeds = (row.expenses || 0) + (row.healthcare || 0);
  var base = Math.max(totalNeeds, ssIncome + otherInc + portDraw) || 1;
  var ssPct = (ssIncome / base) * 100;
  var otherPct = (otherInc / base) * 100;
  var portPct = (portDraw / base) * 100;

  var incomeItems = [];
  if (row.primarySS > 0) incomeItems.push('Primary SS ' + fmt(row.primarySS));
  if (row.spouseSS > 0) incomeItems.push('Spouse SS ' + fmt(row.spouseSS));
  if (row.pension > 0) incomeItems.push('Pension ' + fmt(row.pension));
  if (row.otherIncome > 0) incomeItems.push('Other ' + fmt(row.otherIncome));

  var drawItems = [];
  if (row.fromIRA > 0) drawItems.push('IRA ' + fmt(row.fromIRA));
  if (row.fromRoth > 0) drawItems.push('Roth ' + fmt(row.fromRoth));
  if (row.fromTaxable > 0) drawItems.push('Taxable ' + fmt(row.fromTaxable));

  var expParts = ['Living ' + fmt(row.expenses)];
  if (row.healthcare > 0) expParts.push('Healthcare ' + fmt(row.healthcare));

  var taxParts = [row.irmaaHit ? '⚠ IRMAA' : 'IRMAA Safe'];
  if (row.rothConv > 0) taxParts.push('Roth conv ' + fmt(row.rothConv));

  var items = [
    ['Income', incomeItems.length > 0 ? incomeItems.join(' · ') : 'None this year'],
    ['Expenses', expParts.join(' · ')],
    ['Portfolio', drawItems.length > 0 ? drawItems.join(' · ') : 'No draws'],
    ['Tax', taxParts.join(' · ')],
  ];

  return (
    <div>
      {/* Source-of-funds bar */}
      {(ssPct + otherPct + portPct) > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: '#5F6368', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source of Funds</div>
          <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 5 }}>
            {ssPct > 0 && <div style={{ width: ssPct + '%', background: '#0A4D54', borderRadius: 4 }}/>}
            {otherPct > 0 && <div style={{ width: otherPct + '%', background: '#60a5fa', borderRadius: 4 }}/>}
            {portPct > 0 && <div style={{ width: portPct + '%', background: '#f59e0b', borderRadius: 4 }}/>}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#5F6368' }}>
            {ssPct > 0 && <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#0A4D54', marginRight: 3 }}/>SS/Pension {ssPct.toFixed(0)}%</span>}
            {otherPct > 0 && <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#60a5fa', marginRight: 3 }}/>Other {otherPct.toFixed(0)}%</span>}
            {portPct > 0 && <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#f59e0b', marginRight: 3 }}/>Portfolio {portPct.toFixed(0)}%</span>}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: 12, color: '#5F6368', lineHeight: 1.6 }}>
        {items.map(function(item) {
          return (
            <div key={item[0]}>
              <strong style={{ color: '#374151' }}>{item[0]}:</strong>{' '}{item[1]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CashFlowTab({ ctx }) {
  var { cashFlow, inp, fmtC, BORDER, BORDER2, TXT3, TTip } = ctx;
  var expandedState = useState(null);
  var expandedYear = expandedState[0];
  var setExpandedYear = expandedState[1];
  var rowRefs = useRef({});
  var tableContainerRef = useRef(null);

  function toggleRow(year) {
    setExpandedYear(expandedYear === year ? null : year);
  }

  function jumpToYear(year) {
    setExpandedYear(year);
    setTimeout(function() {
      var el = rowRefs.current[year];
      if (el && tableContainerRef.current) {
        var container = tableContainerRef.current;
        var elTop = el.offsetTop;
        container.scrollTo({ top: elTop - 60, behavior: 'smooth' });
      }
    }, 60);
  }

  // Dynamic subtitle: funded through age X
  var cf = cashFlow || [];
  var currentAge = (inp && inp.currentAge) ? Number(inp.currentAge) : 66;
  var firstYear = cf.length > 0 ? cf[0].year : 2026;
  var lastYear  = cf.length > 0 ? cf[cf.length - 1].year : 2055;
  var fundedAge = currentAge + (lastYear - firstYear);

  // Compute critical years
  var criticalYears = (function() {
    if (cf.length === 0) return [];
    var cards = [];

    // Sequence Risk: first year with significant portfolio draw
    var seqYear = firstYear;
    for (var i = 0; i < Math.min(cf.length, 8); i++) {
      var r = cf[i];
      var draw = (r.fromIRA || 0) + (r.fromRoth || 0) + (r.fromTaxable || 0);
      var tot = (r.expenses || 0) + (r.healthcare || 0);
      if (draw > 0 && tot > 0 && draw / tot > 0.15) {
        seqYear = r.year;
        break;
      }
    }

    // SS Start: birthYear + ssAge
    var birthYr = inp && inp.birthYear ? Number(inp.birthYear) : (2026 - currentAge);
    var ssAge   = inp && inp.ssAge    ? Number(inp.ssAge)    : 70;
    var ssYear  = birthYr + ssAge;
    var ssAge70 = currentAge + (ssYear - firstYear);

    // RMD Trigger
    var rmdStartAge = getRMDStartAge(inp && inp.birthYear);
    var rmdYear = firstYear + Math.max(0, rmdStartAge - currentAge);
    var rmdAge  = currentAge + (rmdYear - firstYear);

    cards.push({
      type: 'seq',
      year: seqYear,
      age: currentAge + (seqYear - firstYear),
      title: 'Peak Sequence Risk',
      body: 'First 2 years: portfolio most vulnerable to downturn',
    });
    cards.push({
      type: 'ss',
      year: ssYear,
      age: ssAge70,
      title: 'SS & Medicare Start',
      body: 'Income floor begins, healthcare costs drop 60%',
    });
    if (rmdYear <= lastYear) {
      cards.push({
        type: 'rmd',
        year: rmdYear,
        age: rmdAge,
        title: 'RMD Trigger Year',
        body: 'Required distributions may push to 24% tax bracket',
      });
    }
    return cards;
  })();

  // Chart data: enrich with withdrawal fields
  var chartData = cf.map(function(row) {
    var portfolioWithdrawal = (row.fromIRA || 0) + (row.fromRoth || 0) + (row.fromTaxable || 0);
    var ssIncome = (row.primarySS || 0) + (row.spouseSS || 0);
    return Object.assign({}, row, {
      portfolioWithdrawal: portfolioWithdrawal,
      ssIncome: ssIncome,
    });
  });

  // Withdrawal sourcing chart data (bucket split)
  var sourcingData = cf.map(function(row) {
    var b1 = row.fromTaxable || 0;
    var b2 = row.fromIRA     || 0;
    var b3 = row.fromRoth    || 0;
    // If all zero, fall back to proportional split of total draw
    if (b1 === 0 && b2 === 0 && b3 === 0) {
      var total = (row.fromIRA || 0) + (row.fromRoth || 0) + (row.fromTaxable || 0);
      b1 = total * 0.30;
      b2 = total * 0.50;
      b3 = total * 0.20;
    }
    return { year: row.year, b1: b1, b2: b2, b3: b3 };
  });

  return (
    <div style={{ padding: '24px 28px', background: '#F5F3EF', minHeight: '100%' }}>

      {/* Page Header */}
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#222222', margin: '0 0 4px', fontFamily: "'Source Serif 4', Georgia, serif" }}>Plan</h1>
      <p style={{ fontSize: 14, color: '#5F6368', marginBottom: 24 }}>
        {'Your retirement is funded through age ' + fundedAge + ' with strategic bucket withdrawals and Social Security.'}
      </p>

      {/* Main Chart — Retirement Timeline & Balance Projection */}
      <div style={Object.assign({}, CARD)}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#222222', marginBottom: 4 }}>
          Retirement Timeline &amp; Balance Projection
        </div>
        <div style={{ fontSize: 12, color: '#5F6368', marginBottom: 16 }}>
          Portfolio balance vs. annual withdrawals
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 48, bottom: 4, left: 8 }}>
            <defs>
              <linearGradient id="cfBalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0A4D54" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="#0A4D54" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#5F6368' }} stroke="#D4D1C5"/>
            <YAxis yAxisId="left"  tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#5F6368' }} stroke="#D4D1C5" width={56}/>
            <YAxis yAxisId="right" orientation="right" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#5F6368' }} stroke="#D4D1C5" width={52}/>
            <Tooltip formatter={function(value, name) { return [fmtShort(value), name]; }}/>
            <Legend wrapperStyle={{ fontSize: 11, color: '#5F6368', paddingTop: 8 }}/>
            <Bar yAxisId="right" dataKey="portfolioWithdrawal" name="Portfolio Withdrawal" fill="#8A5515" maxBarSize={18} isAnimationActive={false}/>
            <Bar yAxisId="right" dataKey="ssIncome"            name="Social Security"      fill="#3D6337" maxBarSize={18} isAnimationActive={false}/>
            <Area yAxisId="left" type="monotone" dataKey="balance" name="Total Balance"
              stroke="#0A4D54" fill="url(#cfBalGrad)" strokeWidth={2.5}
              fillOpacity={1} isAnimationActive={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Critical Years Section */}
      {criticalYears.length > 0 && (
        <div style={{
          border: '1px solid #FCD34D',
          borderRadius: '8px',
          padding: '20px',
          background: '#FFFBEB',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#92400E', marginBottom: 16 }}>
            ⚠ Critical Years in Your Plan
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {criticalYears.map(function(card) {
              var isSS   = card.type === 'ss';
              var accent = isSS ? '#0D9488' : '#EF4444';
              var border = isSS ? '1px solid #5EEAD4' : '1px solid #FCA5A5';
              var icon   = isSS ? '◎' : '⚠';
              return (
                <button
                  key={card.type}
                  onClick={function() { jumpToYear(card.year); }}
                  style={{
                    background: '#FFFFFF',
                    border: border,
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* Icon circle */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: accent + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, color: accent, marginBottom: 4,
                  }}>{icon}</div>
                  {/* Year */}
                  <div style={{ fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>{card.year}</div>
                  {/* Age */}
                  <div style={{ fontSize: 11, color: '#5F6368' }}>Age {card.age}</div>
                  {/* Title */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#222222' }}>{card.title}</div>
                  {/* Body */}
                  <div style={{ fontSize: 12, color: '#5F6368', lineHeight: 1.5 }}>{card.body}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Withdrawal Sourcing Chart */}
      <div style={Object.assign({}, CARD)}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#222222', marginBottom: 4 }}>
          Withdrawal Sourcing by Bucket
        </div>
        <div style={{ fontSize: 12, color: '#5F6368', marginBottom: 16 }}>
          Annual draws from each bucket layer
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sourcingData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#5F6368' }} stroke="#D4D1C5"/>
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#5F6368' }} stroke="#D4D1C5" width={52}/>
            <Tooltip formatter={function(value, name) { return [fmtShort(value), name]; }}/>
            <Legend wrapperStyle={{ fontSize: 11, color: '#5F6368', paddingTop: 8 }}/>
            <Bar dataKey="b1" name="B1 Cash"   stackId="s" fill="#4A9E8E" isAnimationActive={false}/>
            <Bar dataKey="b2" name="B2 Bonds"  stackId="s" fill="#3D6337" isAnimationActive={false}/>
            <Bar dataKey="b3" name="B3 Growth" stackId="s" fill="#8A5515" isAnimationActive={false}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Year-by-Year Detail table */}
      <div style={{
        background: '#FCFBF8',
        border: '1px solid #D4D1C5',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4D1C5', display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#222222' }}>Year-by-Year Detail</span>
          <span style={{ fontSize: 12, color: '#5F6368', fontStyle: 'italic' }}>Click any year for income &amp; portfolio detail</span>
        </div>
        <div ref={tableContainerRef} style={{ overflowY: 'auto', maxHeight: 560 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 90 }}/>
              <col style={{ width: 140 }}/>
              <col style={{ width: 120 }}/>
              <col style={{ width: 120 }}/>
              <col/>
            </colgroup>
            <thead>
              <tr>
                {[
                  { label: 'YEAR',     align: 'left'  },
                  { label: 'BALANCE',  align: 'right' },
                  { label: 'INCOME',   align: 'right' },
                  { label: 'EXPENSES', align: 'right' },
                  { label: 'GAP',      align: 'right' },
                ].map(function(h) {
                  return (
                    <th key={h.label} style={{
                      padding: '12px 14px',
                      textAlign: h.align,
                      color: '#5F6368',
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#F5F3EF',
                      borderBottom: '1px solid #D4D1C5',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      whiteSpace: 'nowrap',
                    }}>{h.label}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(cashFlow || []).map(function(row, i) {
                var income = (row.primarySS || 0) + (row.spouseSS || 0) + (row.pension || 0) + (row.otherIncome || 0);
                var totalExp = (row.expenses || 0) + (row.healthcare || 0);
                var gap = totalExp - income;
                var gapPct = totalExp > 0 ? gap / totalExp : 0;
                var dotColor = gapPct < 0.2 ? '#3D6337' : gapPct < 0.7 ? '#8A5515' : '#8B3528';
                var isExpanded = expandedYear === row.year;
                var rowBg = isExpanded ? '#F0FDF4' : (i % 2 === 0 ? '#FFFFFF' : '#FAFAFA');

                return (
                  React.createElement(React.Fragment, { key: row.year },
                    React.createElement('tr', {
                      ref: function(el) { rowRefs.current[row.year] = el; },
                      onClick: function() { toggleRow(row.year); },
                      style: {
                        borderBottom: isExpanded ? 'none' : '1px solid #F3F4F6',
                        background: rowBg,
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      },
                    },
                      /* YEAR */
                      React.createElement('td', { style: { padding: '11px 14px', whiteSpace: 'nowrap' } },
                        React.createElement('span', { style: {
                          display: 'inline-block',
                          marginRight: 6,
                          fontSize: 9,
                          color: '#5F6368',
                          transition: 'transform 0.18s',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}, '▶'),
                        React.createElement('span', { style: { fontSize: 15, fontWeight: 700, color: '#0A4D54' }}, row.year)
                      ),
                      /* BALANCE */
                      React.createElement('td', { style: { padding: '11px 14px', textAlign: 'right', color: '#0A4D54', fontSize: 14, fontWeight: 500 }},
                        (fmtC || fmtShort)(row.balance)
                      ),
                      /* INCOME */
                      React.createElement('td', { style: { padding: '11px 14px', textAlign: 'right', color: income > 0 ? '#3D6337' : '#5F6368', fontSize: 14, fontWeight: 500 }},
                        income > 0 ? (fmtC || fmtShort)(income) : '—'
                      ),
                      /* EXPENSES */
                      React.createElement('td', { style: { padding: '11px 14px', textAlign: 'right', color: '#8B3528', fontSize: 14, fontWeight: 500 }},
                        (fmtC || fmtShort)(totalExp)
                      ),
                      /* GAP */
                      React.createElement('td', { style: { padding: '11px 14px', textAlign: 'right', fontSize: 14 }},
                        gap > 0
                          ? React.createElement('span', { style: { color: '#8A5515', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }},
                              React.createElement('span', { style: { width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }}),
                              '↓ ' + (fmtC || fmtShort)(gap)
                            )
                          : gap < 0
                          ? React.createElement('span', { style: { color: '#3D6337', fontWeight: 500 }}, '↑ ' + (fmtC || fmtShort)(Math.abs(gap)))
                          : React.createElement('span', { style: { color: '#5F6368' }}, '—')
                      )
                    ),
                    isExpanded && React.createElement('tr', {
                      style: { background: '#F0FDF4', borderBottom: '1px solid #D4D1C5' },
                    },
                      React.createElement('td', {
                        colSpan: 5,
                        style: { padding: '8px 14px 14px 36px' },
                      },
                        React.createElement(DetailSection, { row: row, fmtC: fmtC })
                      )
                    )
                  )
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
