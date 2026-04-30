import React, { useState, useRef } from 'react';
import { getRMDStartAge } from '../../engine/constants.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
         ResponsiveContainer, ReferenceLine } from 'recharts';

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
          <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source of Funds</div>
          <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 5 }}>
            {ssPct > 0 && <div style={{ width: ssPct + '%', background: '#0A4D54', borderRadius: 4 }}/>}
            {otherPct > 0 && <div style={{ width: otherPct + '%', background: '#60a5fa', borderRadius: 4 }}/>}
            {portPct > 0 && <div style={{ width: portPct + '%', background: '#f59e0b', borderRadius: 4 }}/>}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#6B7280' }}>
            {ssPct > 0 && <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#0A4D54', marginRight: 3 }}/>SS/Pension {ssPct.toFixed(0)}%</span>}
            {otherPct > 0 && <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#60a5fa', marginRight: 3 }}/>Other {otherPct.toFixed(0)}%</span>}
            {portPct > 0 && <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#f59e0b', marginRight: 3 }}/>Portfolio {portPct.toFixed(0)}%</span>}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
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

  // Compute critical years from cashFlow data
  var criticalYears = (function() {
    if (!cashFlow || cashFlow.length === 0) return [];
    var cards = [];

    // Sequence Risk: first year with significant portfolio draw
    for (var i = 0; i < Math.min(cashFlow.length, 8); i++) {
      var r = cashFlow[i];
      var draw = (r.fromIRA || 0) + (r.fromRoth || 0) + (r.fromTaxable || 0);
      var tot = (r.expenses || 0) + (r.healthcare || 0);
      if (draw > 0 && tot > 0 && draw / tot > 0.15) {
        cards.push({ year: r.year, label: 'Sequence Risk', sub: 'High portfolio draw — volatility hurts most here', color: '#8B3528', bg: '#FEF2F2', border: '#FECACA' });
        break;
      }
    }

    // SS/Medicare Start: first year primarySS > 0
    for (var j = 0; j < cashFlow.length; j++) {
      if ((cashFlow[j].primarySS || 0) > 0) {
        cards.push({ year: cashFlow[j].year, label: 'SS / Medicare', sub: 'Income floor activates · Watch IRMAA brackets', color: '#0A4D54', bg: '#E8F5F2', border: '#A7D9D4' });
        break;
      }
    }

    // RMD Trigger: age 73, derived from currentAge + first cashFlow year
    var currentAge = (inp && inp.currentAge) ? Number(inp.currentAge) : 62;
    var firstYear = cashFlow[0].year;
    var lastYear = cashFlow[cashFlow.length - 1].year;
    var rmdStartAge = getRMDStartAge(inp && inp.birthYear);
    var rmdYear = firstYear + Math.max(0, rmdStartAge - currentAge);
    if (rmdYear <= lastYear) {
      cards.push({ year: rmdYear, label: 'RMD Trigger', sub: 'Required minimum distributions begin at ' + rmdStartAge, color: '#3D6337', bg: '#F0FDF4', border: '#BBF7D0' });
    }

    return cards;
  })();

  return (
    <div style={{ padding: '24px 28px', background: '#F5F3EF', minHeight: '100%' }}>
      <h2 style={{ fontFamily: 'var(--rs-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--rs-text-primary)', marginBottom: 3, marginTop: 0 }}>Cash Flow Projection</h2>
      <p style={{ fontSize: 13, color: 'var(--rs-text-muted)', marginBottom: 20 }}>Year-by-year projections · Jan 1 balances · Withdrawal sourcing · IRMAA tracking</p>

      {/* Chart */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderTop: '3px solid #0A4D54', borderRadius: '12px', padding: '20px 16px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={cashFlow} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
            <defs>
              {[['gb','#0A4D54'],['gi','#3D6337'],['ge','#8B3528']].map(function(g) {
                return (
                  <linearGradient key={g[0]} id={g[0]} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={g[1]} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={g[1]} stopOpacity={0.02}/>
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
            <XAxis dataKey="year" stroke={BORDER2} tick={{ fontSize: 10, fill: TXT3 }}/>
            <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{ fontSize: 10, fill: TXT3 }}/>
            <Tooltip content={<TTip/>}/>
            <Legend wrapperStyle={{ fontSize: 11, color: '#6B7280' }}/>
            <ReferenceLine x={2029} stroke="#3D6337" strokeDasharray="4 4" label={{ value: 'SS starts', position: 'top', fontSize: 9, fill: '#3D6337' }}/>
            <Area type="monotone" dataKey="balance"     stroke="#0A4D54" fill="url(#gb)" strokeWidth={2.5} name="Total Balance" fillOpacity={1} isAnimationActive={false}/>
            <Area type="monotone" dataKey="iraBalance"  stroke="#3D6337" fill="url(#gi)" strokeWidth={1.5} name="IRA Balance"   fillOpacity={1} isAnimationActive={false}/>
            <Area type="monotone" dataKey="rothBalance" stroke="#7C3AED" fill="none" strokeWidth={1.5} strokeDasharray="4 3" name="Roth Balance" isAnimationActive={false}/>
            <Area type="monotone" dataKey="expenses"    stroke="#8B3528" fill="url(#ge)" strokeWidth={1.5} name="Expenses"      fillOpacity={1} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Critical Years strip */}
      {criticalYears.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {criticalYears.map(function(card) {
            return (
              <button
                key={card.year}
                onClick={function() { jumpToYear(card.year); }}
                style={{
                  flex: 1, minWidth: 160,
                  background: card.bg, border: '1px solid ' + card.border,
                  borderRadius: 10, padding: '10px 14px',
                  textAlign: 'left', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 3,
                  transition: 'opacity 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: card.color }}>{card.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: card.color }}>{card.year}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{card.sub}</div>
                <div style={{ fontSize: 10, color: card.color, marginTop: 2 }}>→ Click to expand in table</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Year-by-Year Detail table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderTop: '3px solid #0A4D54', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E4DC', display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A' }}>Year-by-Year Detail</span>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Click any year for income &amp; portfolio detail</span>
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
                      color: '#374151',
                      fontSize: 13,
                      fontWeight: 600,
                      background: '#F0EDE8',
                      borderBottom: '2px solid #E8E4DC',
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
                var rowBg = isExpanded ? '#EFF9F7' : (i % 2 === 0 ? '#FFFFFF' : '#FAFAF8');

                return (
                  React.createElement(React.Fragment, { key: row.year },
                    React.createElement('tr', {
                      ref: function(el) { rowRefs.current[row.year] = el; },
                      onClick: function() { toggleRow(row.year); },
                      style: {
                        borderBottom: isExpanded ? 'none' : '1px solid #F0EDE8',
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
                          color: '#6B7280',
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
                      React.createElement('td', { style: { padding: '11px 14px', textAlign: 'right', color: income > 0 ? '#3D6337' : '#9CA3AF', fontSize: 14, fontWeight: 500 }},
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
                          : React.createElement('span', { style: { color: '#9CA3AF' }}, '—')
                      )
                    ),
                    isExpanded && React.createElement('tr', {
                      style: { background: '#EFF9F7', borderBottom: '1px solid #E8E4DC' },
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
