import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

var TEAL_DARK = '#0A4D54';
var GREEN     = '#3D6337';
var TEAL_MID  = '#4A9E8E';
var BORDER    = '#E8E4DC';
var MUTED     = '#9CA3AF';

function srColor(rate) {
  if (rate >= 85) return '#3D6337';
  if (rate >= 70) return '#D97706';
  return '#8B3528';
}
function srBg(rate) {
  if (rate >= 85) return '#E6F1DD';
  if (rate >= 70) return '#FEF3C7';
  return '#F8E4D8';
}

export default function PortfolioSparkline({ cashFlow, setActiveTab, successRate }) {
  if (!cashFlow || cashFlow.length === 0) return null;

  var data = cashFlow.map(function(r) {
    return {
      age:   r.age  || r.year,
      total: Math.round((r.balance     || 0) / 1000),
      ira:   Math.round((r.iraBalance  || 0) / 1000),
      roth:  Math.round((r.rothBalance || 0) / 1000),
    };
  });

  // Find age when SS income first appears
  var ssRow = cashFlow.find(function(r) { return (r.ssIncome || 0) > 0; });
  var ssAge = ssRow ? (ssRow.age || null) : null;

  var sr = parseFloat(successRate) || 0;

  return (
    <div style={{ background: 'var(--rs-bg-card)', border: 'var(--rs-card-border)', borderRadius: 'var(--rs-card-radius)', padding: '16px 20px 12px', boxShadow: 'var(--rs-card-shadow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Portfolio Trajectory</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Total · IRA · Roth · real $</div>
        </div>
        {sr > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, color: srColor(sr), background: srBg(sr), padding: '3px 8px', borderRadius: 20 }}>
            {sr}% success
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={TEAL_DARK} stopOpacity={0.15} />
              <stop offset="95%" stopColor={TEAL_DARK} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="iraGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={GREEN} stopOpacity={0.12} />
              <stop offset="95%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} interval={4} />
          <YAxis
            tick={{ fontSize: 10, fill: '#6B7280' }}
            tickLine={false} axisLine={false} width={44}
            tickFormatter={function(v) { return '$' + v + 'k'; }}
          />
          <Tooltip
            formatter={function(v, name) {
              return ['$' + v + 'k', name === 'total' ? 'Total' : name === 'ira' ? 'IRA' : 'Roth'];
            }}
            labelFormatter={function(l) { return 'Age ' + l; }}
            contentStyle={{ fontSize: 11, border: '1px solid ' + BORDER, borderRadius: 6 }}
          />
          <Area type="monotone" dataKey="total" stroke={TEAL_DARK} strokeWidth={2.5}
            fill="url(#totalGrad)" dot={false} activeDot={{ r: 4 }} />
          <Area type="monotone" dataKey="ira" stroke={GREEN} strokeWidth={1.5}
            strokeDasharray="4 2" fill="url(#iraGrad)" dot={false} activeDot={{ r: 3 }} />
          <Area type="monotone" dataKey="roth" stroke={TEAL_MID} strokeWidth={1.5}
            strokeDasharray="2 3" fill="none" dot={false} activeDot={{ r: 3 }} />
          {ssAge && (
            <ReferenceLine
              x={ssAge}
              stroke={GREEN}
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: 'SS', position: 'top', fontSize: 9, fill: GREEN }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid ' + BORDER }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { color: TEAL_DARK, label: 'Total', dash: false },
            { color: GREEN,     label: 'IRA',   dash: true },
            { color: TEAL_MID,  label: 'Roth',  dash: true },
          ].map(function(l) {
            return (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="16" height="4">
                  <line x1="0" y1="2" x2="16" y2="2"
                    stroke={l.color} strokeWidth={l.dash ? 1.5 : 2.5}
                    strokeDasharray={l.dash ? '4 2' : 'none'} />
                </svg>
                <span style={{ fontSize: 11, color: MUTED }}>{l.label}</span>
              </div>
            );
          })}
        </div>
        <button
          onClick={function() { setActiveTab('cashflow'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: TEAL_DARK, fontWeight: 500 }}
        >
          Full projection →
        </button>
      </div>
    </div>
  );
}
