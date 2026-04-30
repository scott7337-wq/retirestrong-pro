import React, { useState } from 'react';
import WizardNavigation from './WizardNavigation.jsx';

var TEAL = '#0A4D54';

function parseDollar(str) {
  var n = parseFloat(String(str).replace(/[$,]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
}

function WithdrawalCheck({ monthly, totalPort }) {
  if (!monthly || !totalPort) return null;
  var annual = monthly * 12;
  var wr = totalPort > 0 ? annual / totalPort : 0;
  var pct = (wr * 100).toFixed(1);

  if (wr < 0.035) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: 13, fontWeight: 500 }}>
        <span style={{ fontSize: 16 }}>✓</span> Sustainable rate for your portfolio ({pct}%)
      </div>
    );
  } else if (wr <= 0.05) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#D97706', fontSize: 13, fontWeight: 500 }}>
        <span style={{ fontSize: 16 }}>⚠</span> Moderately elevated — watch this ({pct}%)
      </div>
    );
  } else {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', fontSize: 13, fontWeight: 500 }}>
        <span style={{ fontSize: 16 }}>✗</span> High rate — plan may need adjustment ({pct}%)
      </div>
    );
  }
}

export default function Step4Spending({ draft, onUpdate, onNext, onBack }) {
  var [monthly, setMonthly] = useState(draft.monthlyExpenses || 0);
  var [raw, setRaw] = useState(draft.monthlyExpenses > 0 ? String(draft.monthlyExpenses) : '');
  var totalPort = (draft.ira || 0) + (draft.roth || 0) + (draft.taxable || 0);

  function handleChange(e) {
    setRaw(e.target.value);
    setMonthly(parseDollar(e.target.value));
  }

  function handleNext() {
    onUpdate({ monthlyExpenses: monthly || 0 });
    onNext();
  }

  function handleSkip() {
    onUpdate({ monthlyExpenses: 5000 });
    onNext();
  }

  var annual = monthly * 12;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A', margin: '0 0 10px' }}>
        One number that drives everything.
      </h1>
      <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 32px', lineHeight: 1.5 }}>
        How much do you plan to spend each month in retirement? This single number has more impact on your plan than almost anything else.
      </p>

      {/* Big centered input */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
          <span style={{
            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
            fontSize: 36, color: monthly > 0 ? TEAL : '#D1D5DB', pointerEvents: 'none',
            fontWeight: 700,
          }}>$</span>
          <input
            type="text"
            inputMode="numeric"
            value={raw}
            placeholder="8,000"
            onChange={handleChange}
            style={{
              width: '100%',
              fontSize: 36,
              fontWeight: 700,
              padding: '18px 20px 18px 52px',
              border: '2px solid ' + (monthly > 0 ? TEAL : '#D1D5DB'),
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
              color: TEAL,
              background: monthly > 0 ? '#FAFFFE' : '#FFFFFF',
              textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
            onFocus={function(e) { e.target.style.borderColor = TEAL; }}
            onBlur={function(e) { e.target.style.borderColor = monthly > 0 ? TEAL : '#D1D5DB'; }}
          />
        </div>
      </div>

      {monthly > 0 && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 8 }}>
            = <strong style={{ color: '#374151' }}>${annual.toLocaleString()}/year</strong>
          </div>
          <WithdrawalCheck monthly={monthly} totalPort={totalPort} />
        </div>
      )}

      <WizardNavigation
        step={4}
        onNext={handleNext}
        onBack={onBack}
        onSkip={handleSkip}
        canNext={monthly > 0}
        nextLabel="See my plan →"
        skipLabel="Use $5,000/mo →"
      />
    </div>
  );
}
