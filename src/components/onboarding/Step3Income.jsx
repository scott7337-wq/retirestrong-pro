import React, { useState } from 'react';
import WizardNavigation from './WizardNavigation.jsx';
import { ssBenefitFactor } from '../../engine/social-security.js';

var TEAL = '#0A4D54';
var TEAL_LIGHT = '#E8F5F2';

var CLAIM_AGES = [62, 64, 66, 67, 68, 70];

function parseDollar(str) {
  var n = parseFloat(String(str).replace(/[$,]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
}

function ClaimAgePicker({ fraMonthly, value, onChange }) {
  var selectedFactor = ssBenefitFactor(value);
  var selectedMonthly = Math.round(fraMonthly * selectedFactor);
  var fraMonthlyRound = Math.round(fraMonthly * ssBenefitFactor(67));
  var pctVsFRA = Math.round((selectedFactor - ssBenefitFactor(67)) / ssBenefitFactor(67) * 100);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {CLAIM_AGES.map(function(age) {
          var active = value === age;
          return (
            <button
              key={age}
              onClick={function() { onChange(age); }}
              style={{
                flex: 1,
                minWidth: 44,
                padding: '10px 6px',
                border: '1.5px solid ' + (active ? TEAL : '#D1D5DB'),
                borderRadius: 8,
                background: active ? TEAL : '#FFFFFF',
                color: active ? '#FFFFFF' : '#374151',
                fontSize: 14,
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {age === 67 ? '67 FRA' : String(age)}
            </button>
          );
        })}
      </div>
      {fraMonthly > 0 && (
        <div style={{
          background: TEAL_LIGHT,
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 13,
          color: TEAL,
          fontWeight: 500,
        }}>
          At {value}: estimated <strong>${selectedMonthly.toLocaleString()}/mo</strong>
          {pctVsFRA !== 0 && (
            <span style={{ color: pctVsFRA > 0 ? '#059669' : '#DC2626' }}>
              {' '}({pctVsFRA > 0 ? '+' : ''}{pctVsFRA}% vs FRA)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Step3Income({ draft, onUpdate, onNext, onBack }) {
  var [ssFRAMonthly, setSsFRAMonthly] = useState(draft.ssFRA || 3445);
  var [ssAge, setSsAge] = useState(draft.ssAge || 67);
  var [spouseFRA, setSpouseFRA] = useState(draft.spouseSSAt67 || 1879);
  var [spouseAge, setSpouseAge] = useState(draft.spouseSSAge || 67);

  var [rawFRA, setRawFRA] = useState(ssFRAMonthly > 0 ? String(ssFRAMonthly) : '');
  var [rawSpouseFRA, setRawSpouseFRA] = useState(spouseFRA > 0 ? String(spouseFRA) : '');

  function handleNext() {
    onUpdate({
      ssFRA: ssFRAMonthly,
      ssAge: ssAge,
      spouseSSAt67: draft.hasSpouse ? spouseFRA : undefined,
      spouseSSAge: draft.hasSpouse ? spouseAge : undefined,
    });
    onNext();
  }

  function handleSkip() {
    // Uses canonical defaults from INITIAL_DRAFT: $3,445/mo at FRA (median 2024 SS benefit).
    // Update these in OnboardingWizard.jsx WIZARD_DEFAULTS when ssa.gov medians change.
    onUpdate({
      ssFRA: draft.ssFRA || 3445,
      ssAge: draft.ssAge || 67,
      spouseSSAt67: draft.hasSpouse ? (draft.spouseSSAt67 || 1879) : undefined,
      spouseSSAge: draft.hasSpouse ? (draft.spouseSSAge || 67) : undefined,
    });
    onNext();
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A', margin: '0 0 10px' }}>
        When does income kick in?
      </h1>
      <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 32px', lineHeight: 1.5 }}>
        Social Security is the biggest lever in most retirement plans.
      </p>

      <div style={{ marginBottom: 24 }}>
        <label style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 4,
        }}>Your Social Security at Full Retirement Age</label>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
          Find this on ssa.gov — it's your benefit at age 67. Not sure? Skip for now — we'll use a typical estimate.
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            fontSize: 20, color: '#9CA3AF', pointerEvents: 'none',
          }}>$</span>
          <input
            type="text"
            inputMode="numeric"
            value={rawFRA}
            placeholder="e.g. 3,445"
            onChange={function(e) {
              setRawFRA(e.target.value);
              var v = parseDollar(e.target.value);
              if (v > 0) setSsFRAMonthly(v);
            }}
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
        <label style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
        }}>When do you plan to claim?</label>
        <ClaimAgePicker fraMonthly={ssFRAMonthly} value={ssAge} onChange={setSsAge} />
      </div>

      {draft.hasSpouse && (
        <div style={{ marginBottom: 24, paddingTop: 20, borderTop: '1px solid #E8E4DC' }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 4,
          }}>Partner's SS at FRA</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              fontSize: 20, color: '#9CA3AF', pointerEvents: 'none',
            }}>$</span>
            <input
              type="text"
              inputMode="numeric"
              value={rawSpouseFRA}
              placeholder="e.g. 1,879"
              onChange={function(e) {
                setRawSpouseFRA(e.target.value);
                var v = parseDollar(e.target.value);
                if (v > 0) setSpouseFRA(v);
              }}
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
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}>Partner's claim age</label>
          <ClaimAgePicker fraMonthly={spouseFRA} value={spouseAge} onChange={setSpouseAge} />
        </div>
      )}

      <WizardNavigation
        step={3}
        onNext={handleNext}
        onBack={onBack}
        onSkip={handleSkip}
        canNext={true}
        nextLabel="Almost there →"
        skipLabel="Skip for now →"
      />
    </div>
  );
}
