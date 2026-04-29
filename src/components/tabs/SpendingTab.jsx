import React from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';

export default function SpendingTab({ ctx }) {
  var { inp, setField, fmtC, fmtFull,
        inpWithAssets, monthlySpend, updateMonthSpend, derivedTotals,
        BORDER, BORDER2, TTip, setActiveTab } = ctx;
  var authCtx = useAuth();
  var authUser = authCtx ? authCtx.user : null;
  var planLabel = (authUser && authUser.name) ? authUser.name : 'Your Plan';

  var CARD = { background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 12, padding: '20px 24px', marginBottom: 16 };

  // Compute totalPort from derivedTotals for withdrawal rate calcs
  var totalPort = Object.values(derivedTotals || {}).reduce(function(s, v) { return s + (v || 0); }, 0);
  var monthlyBudget = inpWithAssets.monthlyExpenses || 0;

  // Essential vs discretionary — use sub-fields if entered, else 60/40 fallback
  var totalMonthly = inp.monthlyExpenses || 8000;
  var hasSubFields = (inp.housingMonthly || 0) + (inp.foodMonthly || 0) +
                     (inp.transportMonthly || 0) + (inp.travelMonthly || 0) +
                     (inp.otherMonthly || 0) > 0;
  var essential = hasSubFields
    ? (inp.housingMonthly || 0) + (inp.foodMonthly || 0) + (inp.transportMonthly || 0)
    : Math.round(totalMonthly * 0.60);
  var discretionary = hasSubFields
    ? (inp.travelMonthly || 0) + (inp.otherMonthly || 0)
    : Math.round(totalMonthly * 0.40);
  var breakdown = essential + discretionary;
  var essentialPct = breakdown > 0 ? (essential / breakdown) * 100 : 0;
  var discPct = breakdown > 0 ? (discretionary / breakdown) * 100 : 0;

  return (
    <div style={{ padding: '24px 28px', background: '#F5F3EF', minHeight: '100%' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px' }}>Spending</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {planLabel} · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Year:</label>
          <select
            value={inp.spendYear || 2026}
            onChange={function(e) { setField('spendYear', e.target.value); }}
            style={{ background: '#F8F7F4', border: '1px solid #E8E4DC', borderRadius: 7, padding: '7px 12px', color: '#1A1A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {Array.from({ length: 15 }, function(_, i) { return 2026 + i; }).map(function(yr) {
              return <option key={yr} value={yr}>{yr}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Essential / Discretionary breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#FFFFFF', borderLeft: '4px solid #0A4D54', border: '1px solid #E8E4DC', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Essential Spending{!hasSubFields && <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'none', marginLeft: 4 }}>(est. 60%)</span>}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0A4D54' }}>{fmtC(essential)}<span style={{ fontSize: 13, color: '#6B7280', fontWeight: 400 }}>/mo</span></div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Housing · Food · Transport &nbsp;·&nbsp; {essentialPct.toFixed(0)}%
          </div>
          <div style={{ height: 6, background: '#E8E4DC', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: essentialPct + '%', background: '#0A4D54', borderRadius: 3 }}/>
          </div>
        </div>
        <div style={{ background: '#FFFFFF', borderLeft: '4px solid #8A5515', border: '1px solid #E8E4DC', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Discretionary{!hasSubFields && <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'none', marginLeft: 4 }}>(est. 40%)</span>}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#8A5515' }}>{fmtC(discretionary)}<span style={{ fontSize: 13, color: '#6B7280', fontWeight: 400 }}>/mo</span></div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Travel · Other &nbsp;·&nbsp; {discPct.toFixed(0)}%
          </div>
          <div style={{ height: 6, background: '#E8E4DC', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: discPct + '%', background: '#8A5515', borderRadius: 3 }}/>
          </div>
        </div>
      </div>

      {/* Monthly entry grid */}
      <div style={CARD}>
        <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 16, marginTop: 0 }}>
          Monthly Totals — {inp.spendYear || 2026}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(function(m, mi) {
            var labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            var val = monthlySpend[m] || 0;
            var budget = inpWithAssets.monthlyExpenses;
            var over = val > budget && val > 0;
            return (
              <div key={m} style={{
                background: val > 0 ? (over ? 'rgba(139,53,40,.04)' : 'rgba(61,99,55,.04)') : 'transparent',
                border: '1px solid ' + (val > 0 ? (over ? 'rgba(139,53,40,.2)' : 'rgba(61,99,55,.2)') : '#E8E4DC'),
                borderRadius: 8, padding: 8,
              }}>
                <label style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                  {labels[mi]}
                </label>
                <input
                  type="number"
                  step={100}
                  value={val || ''}
                  placeholder="0"
                  onChange={function(e) { updateMonthSpend(m, e.target.value); }}
                  style={{ width: '100%', background: '#F8F7F4', border: '1px solid #E8E4DC', borderRadius: 5, padding: '5px 7px', color: over ? '#8B3528' : '#3D6337', fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }}
                />
                {val > 0 && (
                  <div style={{ fontSize: 11, color: over ? '#8B3528' : '#3D6337', marginTop: 3, fontWeight: 600 }}>
                    {over ? '+' : ''}{fmtC(val - budget)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(function() {
        var months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        var labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var entered = months.filter(function(m) { return monthlySpend[m] > 0; });
        var ytdTotal = entered.reduce(function(s, m) { return s + monthlySpend[m]; }, 0);
        var ytdBudget = entered.length * inpWithAssets.monthlyExpenses;
        var avgMonthly = entered.length > 0 ? ytdTotal / entered.length : 0;
        var chartData = months.map(function(m, i) {
          return { month: labels[i], actual: monthlySpend[m] || 0, budget: inpWithAssets.monthlyExpenses };
        }).filter(function(d) { return d.actual > 0; });

        var underBudget = ytdTotal <= ytdBudget;

        return (
          <div>
            {/* Chart first — moved above KPIs */}
            {chartData.length > 0 && (
              <div style={CARD}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 16, marginTop: 0 }}>Actual vs Budget</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
                    <XAxis dataKey="month" stroke={BORDER2} tick={{ fontSize: 11, fill: '#6B7280' }}/>
                    <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{ fontSize: 11, fill: '#6B7280' }}/>
                    <Tooltip content={<TTip/>}/>
                    <Legend wrapperStyle={{ fontSize: 12 }}/>
                    <Bar dataKey="actual" fill="#0A4D54"             name="Actual" radius={[3,3,0,0]}/>
                    <Bar dataKey="budget" fill="rgba(148,163,184,0.3)" name="Budget" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* YTD summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'YTD Actual (' + entered.length + ' mo)', value: fmtC(ytdTotal), color: '#0A4D54' },
                { label: 'vs Budget', value: (underBudget ? '-' : '+') + fmtC(Math.abs(ytdTotal - ytdBudget)), color: underBudget ? '#3D6337' : '#8B3528' },
                { label: 'Avg Monthly', value: avgMonthly > 0 ? fmtC(avgMonthly) : '—', color: '#8A5515' },
                { label: 'Budget/Month', value: fmtC(inpWithAssets.monthlyExpenses), color: '#6B7280' },
              ].map(function(item) {
                return (
                  <div key={item.label} style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, color: item.color, fontWeight: 700 }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{item.label}</div>
                  </div>
                );
              })}
            </div>

            {/* What If spending changes strip */}
            {monthlyBudget > 0 && (
              <div style={Object.assign({}, CARD, { marginBottom: 16 })}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 14, marginTop: 0 }}>What If Spending Changes?</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[-500, -200, 200, 500].map(function(delta) {
                    var base = inp.monthlyExpenses || 8000;
                    var newMonthly = base + delta;
                    var newAnnual = newMonthly * 12;
                    var newWR = totalPort > 0 ? ((newAnnual / totalPort) * 100).toFixed(1) : '—';
                    var currentWR = totalPort > 0 ? ((base * 12 / totalPort) * 100).toFixed(1) : '—';
                    var wrDeltaNum = totalPort > 0 ? parseFloat(newWR) - parseFloat(currentWR) : 0;
                    var isGood = delta < 0;
                    var color = isGood ? '#3D6337' : '#8B3528';
                    var bg = isGood ? '#F0FDF4' : '#FEF2F2';
                    var border = isGood ? '#BBF7D0' : '#FECACA';
                    var fmtExact = function(v) { return '$' + v.toLocaleString(); };
                    var question = 'What if I spend ' + fmtExact(newMonthly) + ' per month instead of ' + fmtExact(base) + '?';
                    return (
                      <button
                        key={delta}
                        onClick={function() {
                          sessionStorage.setItem('coachAutoMessage', question);
                          if (setActiveTab) setActiveTab('coach');
                        }}
                        style={{ background: bg, border: '1px solid ' + border, borderRadius: 8, padding: '12px 14px', textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: color, marginBottom: 6 }}>
                          {delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString()}/mo
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', lineHeight: 1.1 }}>
                          {fmtExact(newMonthly)}
                        </div>
                        <div style={{ fontSize: 11, color: '#6B7280', margin: '3px 0 8px' }}>
                          {fmtExact(newAnnual)}/yr
                        </div>
                        {totalPort > 0 && (
                          <div style={{ borderTop: '1px solid ' + border, paddingTop: 7, marginTop: 2 }}>
                            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Withdrawal rate</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: color }}>
                              {newWR}%&nbsp;
                              <span style={{ fontSize: 11, fontWeight: 400 }}>
                                ({wrDeltaNum > 0 ? '+' : ''}{wrDeltaNum.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: color, marginTop: 8, fontWeight: 600 }}>Ask Coach →</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* B1 Runway */}
            <div style={CARD}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 12, marginTop: 0 }}>Bucket 1 Cash Runway</h2>
              {(function() {
                var b1Cash = derivedTotals.taxable + derivedTotals.iraCash + (inpWithAssets.severanceNet || 0);
                var burn = avgMonthly > 0 ? avgMonthly : inpWithAssets.monthlyExpenses;
                var runwayMo = Math.round(b1Cash / burn);
                var pct = Math.min(100, (runwayMo / 36) * 100);
                var color = runwayMo >= 24 ? '#3D6337' : runwayMo >= 12 ? '#8A5515' : '#8B3528';
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>
                        Cash: <strong style={{ color: '#0A4D54' }}>{(fmtFull || fmtC)(b1Cash)}</strong> ÷ {fmtC(burn)}/mo
                      </span>
                      <span style={{ fontSize: 16, color, fontWeight: 700 }}>{runwayMo} months</span>
                    </div>
                    <div style={{ height: 12, background: '#F0EDE8', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: 12, width: pct + '%', background: color, borderRadius: 6 }}/>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF' }}>
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
  );
}
