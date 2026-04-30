import React from 'react';

var STATUS_COLORS = {
  green:  { text: '#059669', dot: '#059669', bg: '#F0FDF4' },
  amber:  { text: '#D97706', dot: '#D97706', bg: '#FFFBEB' },
  red:    { text: '#DC2626', dot: '#DC2626', bg: '#FEF2F2' },
};

export default function StatusPill({ label, status, statusText, color }) {
  var c = STATUS_COLORS[color] || STATUS_COLORS.green;
  return (
    <div style={{
      background: c.bg,
      border: '1px solid var(--rs-border)',
      borderLeft: '3px solid ' + c.dot,
      borderRadius: 10,
      padding: '12px 16px',
      flex: 1,
      minWidth: 0,
      boxShadow: 'var(--rs-card-shadow)',
    }}>
      <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: c.text }}>{statusText}</span>
      </div>
    </div>
  );
}
