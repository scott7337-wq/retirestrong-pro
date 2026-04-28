import React, { useState } from 'react';
import WizardProgressBar from './WizardProgressBar.jsx';
import Step1Identity from './Step1Identity.jsx';
import Step2Portfolio from './Step2Portfolio.jsx';
import Step3Income from './Step3Income.jsx';
import Step4Spending from './Step4Spending.jsx';
import Step5Results from './Step5Results.jsx';

var TOTAL_STEPS = 5;

// Canonical wizard defaults — keep in sync with WIZARD_DEFAULTS in App.jsx.
// These are the values used when the user skips a step or leaves a field blank.
// ssFRA: median SS benefit at FRA (ssa.gov 2024). ssAge: Full Retirement Age.
var WIZARD_DEFAULTS = {
  ssFRA: 3445,
  ssAge: 67,
  spouseSSAt67: 1879,
  spouseSSAge: 67,
  monthlyExpenses: 8000,
};

var INITIAL_DRAFT = {
  birthYear: null,
  hasSpouse: false,
  spouseBirthYear: null,
  ira: 0,
  roth: 0,
  taxable: 0,
  ssFRA: WIZARD_DEFAULTS.ssFRA,
  ssAge: WIZARD_DEFAULTS.ssAge,
  spouseSSAt67: WIZARD_DEFAULTS.spouseSSAt67,
  spouseSSAge: WIZARD_DEFAULTS.spouseSSAge,
  monthlyExpenses: 0,
};

export default function OnboardingWizard({ onComplete }) {
  var [step, setStep] = useState(1);
  var [draft, setDraft] = useState(INITIAL_DRAFT);

  function updateDraft(patch) {
    setDraft(function(prev) { return Object.assign({}, prev, patch); });
  }

  function goNext() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function goBack() {
    if (step > 1) setStep(step - 1);
  }

  function handleExplore() {
    onComplete(Object.assign({}, draft, { monthlyExpenses: draft.monthlyExpenses || 8000 }));
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F3EF',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '48px 16px 64px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 640,
        background: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: 12,
        padding: '36px 40px 40px',
        boxSizing: 'border-box',
      }}>
        <WizardProgressBar step={step} totalSteps={TOTAL_STEPS} />

        {step === 1 && (
          <Step1Identity
            draft={draft}
            onUpdate={updateDraft}
            onNext={goNext}
          />
        )}
        {step === 2 && (
          <Step2Portfolio
            draft={draft}
            onUpdate={updateDraft}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 3 && (
          <Step3Income
            draft={draft}
            onUpdate={updateDraft}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 4 && (
          <Step4Spending
            draft={draft}
            onUpdate={updateDraft}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {step === 5 && (
          <Step5Results
            draft={draft}
            onExplore={handleExplore}
            onAdjust={function() { setStep(1); }}
          />
        )}
      </div>
    </div>
  );
}
