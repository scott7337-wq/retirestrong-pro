import React from 'react';

export default function KPICard({ icon: Icon, iconColor, topBorderColor, label, value, sub }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8E5E0',
      borderRadius: 12,
      borderTop: '3px solid ' + topBorderColor,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={20} color={iconColor} />
        <span style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6B7280' }}>{sub}</div>
    </div>
  );
}
