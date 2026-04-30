import React from 'react';

export default function KPICard({ icon: Icon, iconColor, topBorderColor, label, value, sub }) {
  return (
    <div style={{
      background: 'var(--rs-bg-card)',
      border: '1px solid var(--rs-border)',
      borderRadius: 12,
      borderTop: '3px solid ' + topBorderColor,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      boxShadow: 'var(--rs-card-shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={16} color={iconColor} />
        <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{
        fontSize: 26,
        fontWeight: 700,
        color: '#1A1A1A',
        lineHeight: 1.1,
        fontFamily: 'var(--rs-font-display)',
        letterSpacing: '-0.01em',
      }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</div>
    </div>
  );
}
