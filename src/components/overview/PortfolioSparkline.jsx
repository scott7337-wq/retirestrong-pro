import React from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function PortfolioSparkline({ cashFlow, setActiveTab }) {
  if (!cashFlow || cashFlow.length === 0) return null;

  var data = cashFlow.map(function(r) {
    return { year: r.year, portfolio: Math.round((r.balance || 0) / 1000) };
  });

  var maxVal = Math.max.apply(null, data.map(function(d) { return d.portfolio; }));
  var yMax = Math.ceil(maxVal / 500) * 500;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8E5E0',
      borderRadius: 12,
      padding: '16px 20px 12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Portfolio Projection</div>
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{data[0].year} – {data[data.length - 1].year}</div>
      </div>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <YAxis
              tickFormatter={function(v) { return v >= 1000 ? '$' + (v/1000).toFixed(0) + 'M' : '$' + v + 'K'; }}
              ticks={[0, Math.round(yMax * 0.33 / 500) * 500, Math.round(yMax * 0.66 / 500) * 500, yMax]}
              domain={[0, yMax]}
              width={40}
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={0} stroke="#E8E5E0" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="#0F766E"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ textAlign: 'right', marginTop: 4 }}>
        <button
          onClick={function() { setActiveTab('cashflow'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#0F766E', fontWeight: 500 }}
        >
          View full projection →
        </button>
      </div>
    </div>
  );
}
