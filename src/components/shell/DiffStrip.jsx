import React from 'react';

export default function DiffStrip({ workingScenario, onDiscard, onPin }) {
  if (!workingScenario) return null;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '9px 20px',
      background: 'var(--rs-working-bg)',
      borderBottom: '1px solid var(--rs-border)',
      animation: 'rsSlideDown 240ms cubic-bezier(.2,.7,.3,1)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          width: '8px', height: '8px',
          borderRadius: '50%',
          background: 'var(--rs-working)',
          display: 'inline-block',
          animation: 'rsPulse 1.6s infinite',
        }}/>
        <span style={{
          fontWeight: 600,
          color: 'var(--rs-working)',
          fontSize: '13px',
        }}>Working scenario</span>
        <span style={{
          color: 'var(--rs-text-secondary)',
          fontSize: '13px',
        }}>{workingScenario.description}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onDiscard} style={{
          background: 'transparent',
          border: '1px solid var(--rs-border)',
          borderRadius: '6px',
          padding: '5px 12px',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--rs-text-muted)',
          cursor: 'pointer',
        }}>Discard</button>
        <button onClick={onPin} style={{
          background: 'var(--rs-teal-dark)',
          border: 'none',
          borderRadius: '6px',
          padding: '5px 12px',
          fontSize: '12px',
          fontWeight: 600,
          color: 'white',
          cursor: 'pointer',
        }}>Pin as named scenario</button>
      </div>
    </div>
  );
}
