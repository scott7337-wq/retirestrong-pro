import React from 'react';
import { getRMDStartAge } from '../../engine/constants.js';

var TEAL = '#0A4D54';

function computeLevers(inp, inpWithAssets, successRate, cashFlow) {
  var sr = parseFloat(successRate) || 0;
  var curYear = 2026;
  var levers = [];

  // Spending lever — always shown, impact scales with SR gap
  var monthlyExp = inpWithAssets.monthlyExpenses || inp.monthlyExpenses || 0;
  var annualExp = monthlyExp * 12;
  var totalPort = (inpWithAssets.taxableBal || 0)
    + (inpWithAssets.iraBalCash || 0)
    + (inpWithAssets.iraBalTips || 0)
    + (inpWithAssets.iraBalDividend || 0)
    + (inpWithAssets.iraBalGrowth || 0)
    + (inpWithAssets.rothBal || 0);
  var wr = totalPort > 0 ? annualExp / totalPort : 0;
  var spendImpact = wr > 0.05 ? 'High' : wr > 0.035 ? 'Medium' : 'Low';
  levers.push({
    key: 'spending',
    label: 'Spending',
    headline: wr > 0.05
      ? 'Withdrawal rate ' + (wr * 100).toFixed(1) + '% — above safe range'
      : wr > 0.035
      ? (wr * 100).toFixed(1) + '% withdrawal rate — watch trend'
      : (wr * 100).toFixed(1) + '% withdrawal rate — in safe zone',
    action: 'Explore spending levers →',
    question: 'What happens to my success rate if I reduce spending by $500/month? Show me the impact.',
    impact: spendImpact,
    impactColor: spendImpact === 'High' ? '#DC2626' : spendImpact === 'Medium' ? '#D97706' : '#059669',
  });

  // SS timing lever — show if primary SS not yet claimed
  var birthYr = inpWithAssets.birthYear || inp.birthYear;
  var currentAge = inpWithAssets.currentAge || inp.currentAge || 66;
  var ssAge = inpWithAssets.ssAge || inp.ssAge || 70;
  var ssFRA = inpWithAssets.ssFRA || inp.ssFRA || 0;
  var ssClaimYear = birthYr ? birthYr + ssAge : curYear + (ssAge - currentAge);
  var ssNotYetClaimed = ssClaimYear > curYear;
  if (ssNotYetClaimed && ssFRA > 0 && ssAge < 70) {
    var delayGain = Math.round(ssFRA * 0.08 * (70 - ssAge) * 12);
    levers.push({
      key: 'ss',
      label: 'SS Timing',
      headline: 'Delay to 70 adds ~$' + Math.round(delayGain / 12).toLocaleString() + '/mo lifetime',
      action: 'Model SS delay →',
      question: 'What is the impact of delaying Social Security to age 70 vs my current plan? Show breakeven and lifetime benefit.',
      impact: delayGain > 50000 ? 'High' : 'Medium',
      impactColor: delayGain > 50000 ? '#059669' : '#D97706',
    });
  }

  // Roth conversion lever — show if years to RMD < 15 and IRA balance exists
  var rmdStartAge = getRMDStartAge(birthYr);
  var yearsToRMD = rmdStartAge - currentAge;
  var iraTotal = (inpWithAssets.iraBalCash || 0) + (inpWithAssets.iraBalTips || 0)
    + (inpWithAssets.iraBalDividend || 0) + (inpWithAssets.iraBalGrowth || 0);
  if (yearsToRMD > 0 && yearsToRMD < 15 && iraTotal > 50000) {
    levers.push({
      key: 'roth',
      label: 'Roth Conversions',
      headline: yearsToRMD + ' yrs to RMD — convert IRA before bracket widens',
      action: 'Plan conversions →',
      question: 'How much should I convert to Roth each year before RMDs begin at ' + rmdStartAge + '? What bracket should I fill to?',
      impact: iraTotal > 500000 ? 'High' : 'Medium',
      impactColor: iraTotal > 500000 ? '#DC2626' : '#D97706',
    });
  }

  // Withdrawal order lever — always useful
  levers.push({
    key: 'order',
    label: 'Withdrawal Order',
    headline: 'Tax-smart sequencing can extend portfolio by years',
    action: 'Review draw order →',
    question: 'What is the optimal withdrawal order from my accounts — taxable, IRA, and Roth — to minimize taxes over my retirement?',
    impact: 'Medium',
    impactColor: '#2563EB',
  });

  // Sort: High impact first, cap at 4
  var order = { High: 0, Medium: 1, Low: 2 };
  levers.sort(function(a, b) { return (order[a.impact] || 2) - (order[b.impact] || 2); });
  return levers.slice(0, 4);
}

export default function LeverStrip({ inp, inpWithAssets, successRate, cashFlow, setActiveTab }) {
  var levers = computeLevers(inp || {}, inpWithAssets || {}, successRate, cashFlow);

  function navigateCoach(question) {
    try { sessionStorage.setItem('coachAutoMessage', question); } catch (e) {}
    setActiveTab('coach');
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        TOP LEVERS TO IMPROVE YOUR PLAN
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + levers.length + ', 1fr)', gap: 10 }}>
        {levers.map(function(lv) {
          return (
            <div key={lv.key} style={{
              background: '#FFFFFF',
              border: '1px solid #E8E4DC',
              borderTop: '3px solid ' + lv.impactColor,
              borderRadius: 10,
              padding: '12px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {lv.label}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: lv.impactColor, background: lv.impactColor + '18', borderRadius: 4, padding: '2px 6px' }}>
                  {lv.impact}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.4, marginBottom: 10, minHeight: 36 }}>
                {lv.headline}
              </div>
              <button
                onClick={function() { navigateCoach(lv.question); }}
                style={{
                  width: '100%',
                  padding: '7px 0',
                  background: 'none',
                  border: '1px solid ' + TEAL,
                  borderRadius: 6,
                  color: TEAL,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {lv.action}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
