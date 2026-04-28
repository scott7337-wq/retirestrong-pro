import React, { useState } from 'react';
import WizardNavigation from './WizardNavigation.jsx';

var TEAL = '#0A4D54';
var TEAL_LIGHT = '#E8F5F2';

function YearInput({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#374151',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 8,
      }}>{label}</label>
      <input
        type="number"
        min={1940}
        max={1975}
        placeholder={placeholder || 'e.g. 1958'}
        value={value || ''}
        onChange={function(e) { onChange(e.target.value ? parseInt(e.target.value, 10) : null); }}
        style={{
          width: '100%',
          fontSize: 20,
          padding: '14px 16px',
          border: '1.5px solid #D1D5DB',
          borderRadius: 8,
          outline: 'none',
          boxSizing: 'border-box',
          color: '#1A1A1A',
          background: '#FFFFFF',
          transition: 'border-color 0.15s',
        }}
        onFocus={function(e) { e.target.style.borderColor = TEAL; }}
        onBlur={function(e) { e.target.style.borderColor = '#D1D5DB'; }}
      />
    </div>
  );
}

export default function Step1Identity({ draft, onUpdate, onNext }) {
  var [localBirth, setLocalBirth] = useState(draft.birthYear);
  var [hasSpouse, setHasSpouse] = useState(draft.hasSpouse || false);
  var [localSpouseBirth, setLocalSpouseBirth] = useState(draft.spouseBirthYear);

  var canNext = localBirth && localBirth >= 1940 && localBirth <= 1975
    && (!hasSpouse || (localSpouseBirth && localSpouseBirth >= 1940 && localSpouseBirth <= 1975));

  function handleNext() {
    onUpdate({
      birthYear: localBirth,
      hasSpouse: hasSpouse,
      spouseBirthYear: hasSpouse ? localSpouseBirth : null,
      currentAge: new Date().getFullYear() - localBirth,
    });
    onNext();
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A', margin: '0 0 10px' }}>
        Let's build your retirement plan.
      </h1>
      <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 32px', lineHeight: 1.5 }}>
        We'll start with just a few basics and get you to your first result fast.
      </p>

      <YearInput
        label="Your birth year"
        value={localBirth}
        onChange={setLocalBirth}
        placeholder="e.g. 1958"
      />

      {/* Spouse toggle */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 12,
        }}>Planning with a partner?</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['Yes', true], ['No', false]].map(function(opt) {
            var active = hasSpouse === opt[1];
            return (
              <button
                key={opt[0]}
                onClick={function() { setHasSpouse(opt[1]); }}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  border: '1.5px solid ' + (active ? TEAL : '#D1D5DB'),
                  borderRadius: 8,
                  background: active ? TEAL_LIGHT : '#FFFFFF',
                  color: active ? TEAL : '#6B7280',
                  fontSize: 15,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >{opt[0]}</button>
            );
          })}
        </div>
      </div>

      {hasSpouse && (
        <YearInput
          label="Partner's birth year"
          value={localSpouseBirth}
          onChange={setLocalSpouseBirth}
          placeholder="e.g. 1963"
        />
      )}

      <WizardNavigation
        step={1}
        onNext={handleNext}
        canNext={!!canNext}
        nextLabel="Let's go →"
      />
    </div>
  );
}
