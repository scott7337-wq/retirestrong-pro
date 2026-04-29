import React, { useState } from 'react';

export default function PinModal({ workingScenario, onConfirm, onCancel }) {
  const [name, setName] = useState(workingScenario?.description || 'My scenario');
  const [note, setNote] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(40,37,29,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
      animation: 'rsFadeIn 180ms ease',
    }}>
      <div style={{
        background: 'var(--rs-bg-card)',
        borderRadius: '14px',
        padding: '24px',
        width: '460px',
        maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
          Pin this scenario
        </h3>
        <p style={{ margin: '0 0 20px', color: 'var(--rs-text-muted)', fontSize: '13px' }}>
          Give it a name to keep it for comparison.
        </p>

        <label style={{
          display: 'block', marginBottom: '16px',
          fontSize: '12px', fontWeight: 500, color: 'var(--rs-text-muted)',
        }}>
          <span style={{ display: 'block', marginBottom: '4px' }}>Scenario name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            style={{
              width: '100%', padding: '8px 10px',
              border: '1px solid var(--rs-border)', borderRadius: '6px',
              fontSize: '14px', fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label style={{
          display: 'block', marginBottom: '20px',
          fontSize: '12px', fontWeight: 500, color: 'var(--rs-text-muted)',
        }}>
          <span style={{ display: 'block', marginBottom: '4px' }}>Note (optional)</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Why you're keeping this scenario..."
            rows={2}
            style={{
              width: '100%', padding: '8px 10px',
              border: '1px solid var(--rs-border)', borderRadius: '6px',
              fontSize: '13px', fontFamily: 'inherit', outline: 'none',
              resize: 'none', boxSizing: 'border-box',
            }}
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onCancel} style={{
            background: 'transparent', border: '1px solid var(--rs-border)',
            borderRadius: '6px', padding: '8px 16px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={() => onConfirm(name, note)}
            disabled={!name.trim()}
            style={{
              background: 'var(--rs-teal-dark)', border: 'none',
              borderRadius: '6px', padding: '8px 16px',
              fontSize: '13px', fontWeight: 600, color: 'white',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              opacity: name.trim() ? 1 : 0.5,
            }}
          >Pin scenario</button>
        </div>
      </div>
    </div>
  );
}
