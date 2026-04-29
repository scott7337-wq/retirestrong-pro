import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TopBar({ mode, onModeChange }) {
  const { user: authUser } = useAuth();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      background: 'var(--rs-bg-card)',
      borderBottom: '1px solid var(--rs-border)',
      height: '56px',
      flexShrink: 0,
      gap: '16px',
    }}>
      {/* Left: logo + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="24" height="24" viewBox="0 0 32 32"
             style={{ color: 'var(--rs-teal-dark)', flexShrink: 0 }}>
          <circle cx="16" cy="16" r="14" fill="none"
                  stroke="currentColor" strokeWidth="2"/>
          <path d="M9 20 L14 13 L19 17 L23 11" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{
          fontWeight: 700, fontSize: '15px',
          letterSpacing: '-0.01em',
          color: 'var(--rs-text-primary)',
        }}>RetireStrong</span>
        {authUser?.display_name && (
          <span style={{
            fontSize: '12px',
            color: 'var(--rs-text-muted)',
            paddingLeft: '10px',
            borderLeft: '1px solid var(--rs-border)',
            marginLeft: '2px',
          }}>{authUser.display_name}</span>
        )}
      </div>

      {/* Center: mode toggle */}
      <div style={{
        display: 'flex',
        background: 'var(--rs-surface-3)',
        borderRadius: '10px',
        padding: '3px',
        gap: '2px',
      }}>
        {[
          { id: 'explore', icon: '◇', label: 'Explore', hint: 'Chat-first · ephemeral' },
          { id: 'commit',  icon: '●', label: 'Commit',  hint: 'Plan-first · operational' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              background: mode === m.id ? 'var(--rs-mode-active-bg)' : 'transparent',
              border: 'none',
              padding: '5px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              minWidth: '130px',
              boxShadow: mode === m.id ? 'var(--rs-mode-active-shadow)' : 'none',
              transition: 'all 140ms ease',
            }}
          >
            <span style={{
              fontSize: '13px',
              fontWeight: mode === m.id ? 600 : 400,
              color: mode === m.id ? 'var(--rs-text-primary)' : 'var(--rs-text-muted)',
            }}>
              <span style={{ marginRight: '6px', fontSize: '11px' }}>{m.icon}</span>
              {m.label}
            </span>
            <span style={{
              fontSize: '11px',
              color: mode === m.id ? 'var(--rs-text-muted)' : '#BAB9B4',
              marginTop: '1px',
            }}>{m.hint}</span>
          </button>
        ))}
      </div>

      {/* Right: tone pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '12px',
          background: '#E6F0F1',
          color: 'var(--rs-teal-dark)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontWeight: 500,
        }}>Coach mode</span>
      </div>
    </header>
  );
}
