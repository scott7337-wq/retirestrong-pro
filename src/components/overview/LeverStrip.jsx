import React from 'react';
import { getRMDStartAge } from '../../engine/constants.js';

function computeLevers(inp, inpWithAssets, successRate, cashFlow) {
  var sr = parseFloat(successRate) || 0;
  var curYear = 2026;
  var result = [];

  var monthlyExp = inpWithAssets.monthlyExpenses || inp.monthlyExpenses || 0;
  var annualExp  = monthlyExp * 12;
  var totalPort  = (inpWithAssets.taxableBal || 0)
    + (inpWithAssets.iraBalCash || 0)
    + (inpWithAssets.iraBalTips || 0)
    + (inpWithAssets.iraBalDividend || 0)
    + (inpWithAssets.iraBalGrowth || 0)
    + (inpWithAssets.rothBal || 0);
  var wr = totalPort > 0 ? annualExp / totalPort : 0;

  // 1 — Spending Level (always)
  result.push({
    id: 'spending',
    icon: '💰',
    title: 'Spending Level',
    description: wr > 0.05
      ? (wr * 100).toFixed(1) + '% withdrawal rate — above the 5% caution zone. Even $500/mo less meaningfully improves success.'
      : wr > 0.035
      ? (wr * 100).toFixed(1) + '% withdrawal rate — watch the trend. Consider a small buffer for market volatility.'
      : (wr * 100).toFixed(1) + '% withdrawal rate — in the safe zone. Maintain discipline through downturns.',
    impact: wr > 0.05 ? 'high' : wr > 0.035 ? 'medium' : 'medium',
    actionLabel: 'Model spending scenarios',
    action: 'What happens to my success rate if I reduce monthly spending by $500? Show the impact on my portfolio over time.',
  });

  // 2 — Withdrawal Sequencing (always)
  result.push({
    id: 'order',
    icon: '🔄',
    title: 'Withdrawal Sequencing',
    description: 'Tax-smart ordering — taxable first, then IRA, then Roth — can reduce lifetime taxes and extend portfolio life by 2–4 years.',
    impact: 'medium',
    actionLabel: 'Review draw order',
    action: 'What is the optimal withdrawal order from my taxable, IRA, and Roth accounts to minimize taxes over my retirement? Show year-by-year guidance.',
  });

  // 3 — Roth Conversions (if in window)
  var birthYr    = inpWithAssets.birthYear || inp.birthYear;
  var currentAge = inpWithAssets.currentAge || inp.currentAge || 66;
  var rmdStartAge = getRMDStartAge(birthYr);
  var yearsToRMD  = rmdStartAge - currentAge;
  var iraTotal    = (inpWithAssets.iraBalCash || 0) + (inpWithAssets.iraBalTips || 0)
    + (inpWithAssets.iraBalDividend || 0) + (inpWithAssets.iraBalGrowth || 0);
  if (yearsToRMD > 0 && yearsToRMD < 15 && iraTotal > 50000) {
    result.push({
      id: 'roth',
      icon: '📊',
      title: 'Roth Conversions',
      description: yearsToRMD + ' years until RMDs begin at ' + rmdStartAge + '. Convert IRA to Roth now to fill lower brackets before they widen.',
      impact: iraTotal > 500000 ? 'high' : 'medium',
      actionLabel: 'Plan conversions',
      action: 'How much should I convert from IRA to Roth each year before RMDs start at age ' + rmdStartAge + '? Which tax bracket should I fill to?',
    });
  } else {
    // Still show as lower-priority lever if IRA exists but window is longer
    if (iraTotal > 100000) {
      result.push({
        id: 'roth',
        icon: '📊',
        title: 'Roth Conversions',
        description: 'IRA-to-Roth conversions reduce future RMD amounts and Medicare IRMAA surcharges. Best done in low-income years before SS begins.',
        impact: 'medium',
        actionLabel: 'Plan conversions',
        action: 'Should I do Roth conversions now, and if so how much? What brackets should I target to avoid IRMAA surcharges?',
      });
    }
  }

  // 4 — SS Timing (if not yet claimed and < 70)
  var ssAge = inpWithAssets.ssAge || inp.ssAge || 70;
  var ssFRA = inpWithAssets.ssFRA || inp.ssFRA || 0;
  var ssClaimYear = birthYr ? birthYr + ssAge : curYear + (ssAge - currentAge);
  var ssNotYetClaimed = ssClaimYear > curYear;
  if (ssNotYetClaimed && ssFRA > 0) {
    var delayMonthlyGain = ssAge < 70
      ? Math.round(ssFRA * 0.08 * (70 - ssAge))
      : 0;
    result.push({
      id: 'ss',
      icon: '🏛️',
      title: 'SS Timing',
      description: ssAge < 70
        ? 'Delaying to 70 adds ~$' + delayMonthlyGain.toLocaleString() + '/mo for life. Reduces sequence-of-returns risk in early retirement.'
        : 'Claiming at 70 maximizes your benefit. Ensure early-year cash flow is covered by Bucket 1 while waiting.',
      impact: delayMonthlyGain > 300 ? 'high' : 'medium',
      actionLabel: 'Model SS delay',
      action: 'What is the lifetime value of delaying Social Security to age 70? Show the breakeven age and impact on portfolio longevity.',
    });
  }

  // 5 — Work Longer / Part-time (if within 3 years of retirement)
  var retireAge = inpWithAssets.retirementAge || inp.retirementAge || 67;
  var yearsToRetire = retireAge - currentAge;
  if (yearsToRetire >= 0 && yearsToRetire <= 3) {
    result.push({
      id: 'work',
      icon: '⏰',
      title: 'Work Longer',
      description: yearsToRetire <= 0
        ? 'Even part-time income of $20K/yr in early retirement dramatically reduces early sequence-of-returns risk.'
        : 'Working ' + yearsToRetire + ' more year' + (yearsToRetire !== 1 ? 's' : '') + ' or adding part-time income in early retirement can add 5–8 percentage points to success rate.',
      impact: sr < 85 ? 'high' : 'medium',
      actionLabel: 'Model extra income',
      action: 'What is the impact of working part-time for 2–3 years in early retirement, earning around $20,000 per year? How does it change my success rate and portfolio longevity?',
    });
  }

  // 6 — Spending Policy Shape (always — fill slot if < 6 levers)
  result.push({
    id: 'spending-policy',
    icon: '📐',
    title: 'Spending Shape',
    description: 'Smile-shaped or guardrails spending cuts sequence risk vs flat real spending. Small early reductions protect the portfolio when it matters most.',
    impact: sr < 85 ? 'high' : 'medium',
    actionLabel: 'Compare spending policies',
    action: 'What is the difference between smile-shaped spending, guardrails spending, and flat real spending for my plan? Which one gives the best outcome?',
  });

  // De-duplicate by id, keep first occurrence
  var seen = {};
  var deduped = result.filter(function(lv) {
    if (seen[lv.id]) return false;
    seen[lv.id] = true;
    return true;
  });

  return deduped.slice(0, 6);
}

export default function LeverStrip({ inp, inpWithAssets, successRate, cashFlow, setActiveTab }) {
  var levers = computeLevers(inp || {}, inpWithAssets || {}, successRate, cashFlow);

  function navigateCoach(question) {
    try { sessionStorage.setItem('coachAutoMessage', question); } catch (e) {}
    setActiveTab('coach');
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Levers to Improve Your Plan</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          Use these strategies to increase your success rate and extend portfolio longevity
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
      }}>
        {levers.map(function(lv) {
          return (
            <LeverCard key={lv.id} lv={lv} onNavigateCoach={navigateCoach} />
          );
        })}
      </div>
    </div>
  );
}

function LeverCard({ lv, onNavigateCoach }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      padding: '16px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Icon */}
      <div style={{ fontSize: 18, marginBottom: 8 }}>{lv.icon}</div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{lv.title}</div>

      {/* Description */}
      <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, marginBottom: 10, flex: 1 }}>{lv.description}</div>

      {/* Impact text */}
      <div style={{
        fontSize: 12, fontWeight: 500, marginBottom: 12,
        color: lv.impact === 'high' ? '#DC2626' : '#6B7280',
      }}>
        {lv.impact === 'high' ? '↑ High impact' : '→ Medium impact'}
      </div>

      {/* Action button */}
      <button
        onClick={function() { onNavigateCoach(lv.action); }}
        onMouseEnter={function(e) { e.currentTarget.style.background = '#F9FAFB'; }}
        onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
        style={{
          background: 'transparent',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          padding: '6px 14px',
          fontSize: 13,
          color: '#374151',
          cursor: 'pointer',
          fontFamily: 'inherit',
          width: '100%',
          textAlign: 'center',
        }}
      >{lv.actionLabel} →</button>
    </div>
  );
}
