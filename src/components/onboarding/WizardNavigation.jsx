import React from 'react';

var TEAL = '#0A4D54';

export default function WizardNavigation({ onNext, onBack, onSkip, nextLabel, skipLabel, canNext, step }) {
  return (
    <div style={{ marginTop: 32 }}>
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          width: '100%',
          height: 48,
          background: canNext ? TEAL : '#D1D5DB',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: canNext ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s, opacity 0.15s',
          opacity: canNext ? 1 : 0.7,
        }}
      >
        {nextLabel || 'Continue →'}
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        {step > 1 ? (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: '#9CA3AF',
              padding: 0,
            }}
          >← Back</button>
        ) : <span />}
        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: '#9CA3AF',
              padding: 0,
              textDecoration: 'none',
            }}
          >
            {skipLabel || 'Skip for now →'}
          </button>
        )}
      </div>
    </div>
  );
}
