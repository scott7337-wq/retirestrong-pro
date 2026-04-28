import React, { useState } from 'react';
import WizardNavigation from './WizardNavigation.jsx';

var TEAL = '#0A4D54';

function fmtDollar(v) {
  if (!v) return '$0';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + Math.round(v / 1000) + 'K';
  return '$' + Math.round(v).toLocaleString();
}

function parseDollar(str) {
  var n = parseFloat(String(str).replace(/[$,]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
}

function BalanceInput({ label, helper, value, onChange }) {
  var [raw, setRaw] = useState(value > 0 ? String(value) : '');

  function handleChange(e) {
    setRaw(e.target.value);
    onChange(parseDollar(e.target.value));
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#374151',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 4,
      }}>{label}</label>
      {helper && (
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>{helper}</div>
      )}
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          fontSize: 20, color: '#9CA3AF', pointerEvents: 'none',
        }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={handleChange}
          placeholder="0"
          style={{
            width: '100%',
            fontSize: 20,
            padding: '14px 16px 14px 32px',
            border: '1.5px solid #D1D5DB',
            borderRadius: 8,
            outline: 'none',
            boxSizing: 'border-box',
            color: '#1A1A1A',
            background: '#FFFFFF',
          }}
          onFocus={function(e) { e.target.style.borderColor = TEAL; }}
          onBlur={function(e) { e.target.style.borderColor = '#D1D5DB'; }}
        />
      </div>
    </div>
  );
}

export default function Step2Portfolio({ draft, onUpdate, onNext, onBack }) {
  var [ira, setIra] = useState(draft.ira || 0);
  var [roth, setRoth] = useState(draft.roth || 0);
  var [taxable, setTaxable] = useState(draft.taxable || 0);

  var total = ira + roth + taxable;

  function handleNext() {
    onUpdate({ ira, roth, taxable });
    onNext();
  }

  function handleSkip() {
    onUpdate({ ira: 0, roth: 0, taxable: 0 });
    onNext();
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A', margin: '0 0 10px' }}>
        What are you working with?
      </h1>
      <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 32px', lineHeight: 1.5 }}>
        Rough estimates are fine. You can connect real data or update these later.
      </p>

      <BalanceInput
        label="Traditional IRA / 401k balance"
        helper="Tax-deferred accounts — IRA, 401k, 403b, etc."
        value={ira}
        onChange={setIra}
      />
      <BalanceInput
        label="Roth IRA / Roth 401k balance"
        helper="Tax-free accounts"
        value={roth}
        onChange={setRoth}
      />
      <BalanceInput
        label="Taxable / brokerage balance"
        helper="Regular investment accounts, brokerage, savings"
        value={taxable}
        onChange={setTaxable}
      />

      {/* Running total */}
      <div style={{
        textAlign: 'center',
        padding: '16px 0',
        borderTop: '1px solid #E8E4DC',
        marginBottom: 4,
      }}>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Total portfolio
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: TEAL }}>
          {fmtDollar(total)}
        </div>
      </div>

      <WizardNavigation
        step={2}
        onNext={handleNext}
        onBack={onBack}
        onSkip={handleSkip}
        canNext={true}
        nextLabel="Continue →"
        skipLabel="I'll add this later →"
      />
    </div>
  );
}
