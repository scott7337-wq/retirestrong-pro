import React from 'react';

var TEAL     = '#0A4D54';
var GREEN    = '#3D6337';
var AMBER    = '#8A5515';
var RED      = '#8B3528';
var BORDER   = '#E8E4DC';
var MUTED    = '#6B7280';
var TEXT     = '#374151';
var TEXT_PRI = '#1A1A1A';

var CARD        = { background: '#FFFFFF', border: '1px solid #E8E4DC', borderTop: '3px solid #0A4D54', borderRadius: '12px', padding: '20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' };
var CARD_WARN   = Object.assign({}, CARD, { borderTop: '3px solid #8A5515' });
var CARD_DANGER = Object.assign({}, CARD, { borderTop: '3px solid #8B3528' });
var CARD_OK     = Object.assign({}, CARD, { borderTop: '3px solid #3D6337' });

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.07em', color: MUTED, marginBottom: 10,
    }}>{children}</div>
  );
}

export default function RothConversionsTab({ ctx }) {
  var { rothWindow, fmtC } = ctx;

  if (!rothWindow || !rothWindow.yearByYear || rothWindow.yearByYear.length === 0) {
    return (
      <div style={{ padding: '24px 28px', background: '#F5F3EF', minHeight: '100%' }}>
        <h1 style={{ fontFamily: 'var(--rs-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: TEXT_PRI, margin: '0 0 20px' }}>
          Roth Conversion Strategy
        </h1>
        <div style={CARD}>
          <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>No Roth conversion data available. Please complete your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: '#F5F3EF', minHeight: '100%' }}>
      <h1 style={{ fontFamily: 'var(--rs-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: TEXT_PRI, margin: '0 0 4px' }}>
        Roth Conversion Strategy
      </h1>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
        Optimize conversions before RMDs begin · IRMAA-aware · Year-by-year plan
      </p>

      {/* 2026 Working Year Notice */}
      <div style={CARD_DANGER}>
        <SectionLabel>2026 — Working Year</SectionLabel>
        <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>
          <strong style={{ color: RED }}>No Roth conversions in 2026.</strong>{' '}
          W-2 income pushes the bracket too high. Window opens{' '}
          <strong style={{ color: TEAL }}>January 2027</strong> and runs until RMDs
          begin at age {rothWindow.rmdAge} —{' '}
          <strong style={{ color: TEAL }}>{rothWindow.years} years</strong> of opportunity.
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Conv Window',       value: '2027–' + rothWindow.rmdYear,       accent: TEAL  },
          { label: 'Years Available',   value: rothWindow.years + ' yrs',           accent: GREEN },
          { label: 'IRMAA-Safe MAGI',   value: fmtC(rothWindow.irmaaSafe),         accent: AMBER },
          { label: 'Total Convertible', value: fmtC(rothWindow.totalRecommended),  accent: TEAL  },
        ].map(function(item) {
          return (
            <div key={item.label} style={{
              background: '#FFFFFF',
              border: '1px solid ' + BORDER,
              borderTop: '3px solid ' + item.accent,
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--rs-font-display)',
                fontSize: 20, fontWeight: 700,
                color: item.accent, letterSpacing: '-0.01em',
              }}>{item.value}</div>
              <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* IRMAA Warning */}
      <div style={CARD_WARN}>
        <SectionLabel>IRMAA: The Hidden Conversion Tax</SectionLabel>
        <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>
          Medicare uses income from <strong style={{ color: TEXT_PRI }}>2 years ago</strong>.
          Convert too much in 2027 and you pay IRMAA surcharges in 2029.
          Keep <strong style={{ color: AMBER }}>MAGI under {fmtC(rothWindow.irmaaSafe)}</strong>{' '}
          (MFJ) to avoid the first surcharge tier (~$594/yr per person).
        </div>
      </div>

      {/* How bracket is calculated */}
      <div style={CARD}>
        <SectionLabel>How Your Bracket Is Calculated Each Year</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Base Income',  color: TEAL,  desc: 'IRA withdrawals (gap funding) + 85% of SS + pension — all taxable before conversion' },
            { label: 'Room at 12%', color: GREEN, desc: 'Space remaining in 12% bracket after base income & standard deduction' },
            { label: 'Recommended', color: TEAL,  desc: 'Convert up to 12% ceiling, capped by IRMAA-safe limit' },
            { label: 'Key Insight', color: AMBER, desc: 'Converting into 22% now beats paying 24%+ on forced RMDs. Pay taxes from taxable account (~$13K/yr) to preserve IRA and Roth balances.' },
          ].map(function(r) {
            return (
              <div key={r.label} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: r.color + '08', border: '1px solid ' + r.color + '25',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: r.color,
                  minWidth: 84, flexShrink: 0,
                  textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2,
                }}>{r.label}</span>
                <span style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>{r.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Year-by-year table */}
      <div style={CARD}>
        <SectionLabel>Year-by-Year Conversion Plan</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8F7F4' }}>
                {['Year','Age','SS Income','IRA Draw','Base Inc','IRMAA-Safe Max','Your Plan','Room Left','Rate','MAGI','IRMAA'].map(function(h) {
                  return (
                    <th key={h} style={{
                      padding: '8px 10px',
                      textAlign: (h === 'Year' || h === 'IRMAA') ? 'left' : 'right',
                      color: MUTED, fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      borderBottom: '2px solid ' + BORDER, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rothWindow.yearByYear.map(function(row, i) {
                var safe = row.irmaaStatus && row.irmaaStatus.includes('Safe');
                var roomLeft = Math.max(0, (row.irmaaSafeConv || 0) - (row.scheduledConv || 0));
                return (
                  <tr key={i} style={{ borderBottom: '1px solid ' + BORDER, background: i % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                    <td style={{ padding: '8px 10px', color: TEXT_PRI, fontWeight: 700 }}>{row.year}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: MUTED }}>{row.age}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: GREEN }}>{row.ssIncome > 0 ? fmtC(row.ssIncome) : '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: AMBER }}>{fmtC(row.iraWithdrawal)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: TEXT }}>{fmtC(row.baseIncome)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: AMBER, fontWeight: 600 }}>{fmtC(row.irmaaSafeConv)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: TEAL, fontWeight: 700 }}>{row.scheduledConv > 0 ? fmtC(row.scheduledConv) : '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: roomLeft > 0 ? TEAL : MUTED, fontSize: 11 }}>{roomLeft > 0 ? fmtC(roomLeft) : '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <span style={{
                        background: row.taxRate === '12%' ? '#E6F1DD' : '#FEF3C7',
                        color: row.taxRate === '12%' ? GREEN : AMBER,
                        border: '1px solid ' + (row.taxRate === '12%' ? GREEN + '40' : AMBER + '40'),
                        borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700,
                      }}>{row.taxRate}</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: TEXT }}>{fmtC(row.magi)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        background: safe ? '#E6F1DD' : '#F8E4D8',
                        color: safe ? GREEN : RED,
                        border: '1px solid ' + (safe ? GREEN + '40' : RED + '40'),
                        borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700,
                      }}>{row.irmaaStatus}</span>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid ' + BORDER, background: '#F8F7F4' }}>
                <td colSpan={6} style={{ padding: '8px 10px', color: MUTED, fontSize: 11, fontWeight: 700 }}>SCHEDULED CONVERSIONS (5-year total)</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: TEAL, fontWeight: 700, fontSize: 13 }}>{fmtC(rothWindow.totalScheduled)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: TEAL, fontSize: 11 }}>{fmtC(rothWindow.totalRecommended - rothWindow.totalScheduled)} unused</td>
                <td colSpan={3} style={{ padding: '8px 10px', color: MUTED, fontSize: 10 }}>Max IRMAA-safe: {fmtC(rothWindow.totalRecommended)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
