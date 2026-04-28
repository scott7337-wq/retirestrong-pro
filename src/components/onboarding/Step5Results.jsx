import React, { useMemo } from 'react';
import { DEFAULTS } from '../../engine/constants.js';
import { capeBased } from '../../engine/tax.js';
import { buildCashFlow } from '../../engine/cashflow.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';

var TEAL = '#0A4D54';

function buildWizardInp(draft) {
  var birthYear = draft.birthYear || 1959;
  var currentAge = new Date().getFullYear() - birthYear;
  var derivedTotals = {
    taxable: draft.taxable || 0,
    iraCash: 0,
    iraTips: draft.ira || 0,
    iraDividend: 0,
    iraGrowth: 0,
    roth: draft.roth || 0,
  };
  var inp = Object.assign({}, DEFAULTS, {
    birthYear: birthYear,
    currentAge: currentAge,
    hasSpouse: draft.hasSpouse || false,
    spouseBirthYear: draft.spouseBirthYear || (draft.hasSpouse ? 1962 : null),
    ssFRA: draft.ssFRA || 3445,
    ssAge: draft.ssAge || 67,
    spouseSSAt67: draft.spouseSSAt67 || 1879,
    spouseSSAge: draft.spouseSSAge || 67,
    monthlyExpenses: draft.monthlyExpenses || 8000,
  });
  var inpWithAssets = Object.assign({}, inp, {
    taxableBal: derivedTotals.taxable,
    iraBalCash: derivedTotals.iraCash,
    iraBalTips: derivedTotals.iraTips,
    iraBalDividend: derivedTotals.iraDividend,
    iraBalGrowth: derivedTotals.iraGrowth,
    rothBal: derivedTotals.roth,
  });
  return { inpWithAssets, derivedTotals };
}

function fmtDollar(v) {
  if (!v) return '$0';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + Math.round(v / 1000) + 'K';
  return '$' + Math.round(v).toLocaleString();
}

function SuccessArc({ rate }) {
  var num = parseFloat(rate) || 0;
  var color = num >= 85 ? '#059669' : num >= 70 ? '#D97706' : '#DC2626';
  var R = 60, cx = 70, cy = 75;
  var startAngle = Math.PI;
  var endAngle = Math.PI + (num / 100) * Math.PI;
  var x1 = cx + R * Math.cos(startAngle);
  var y1 = cy + R * Math.sin(startAngle);
  var x2 = cx + R * Math.cos(endAngle);
  var y2 = cy + R * Math.sin(endAngle);
  var largeArc = num > 50 ? 1 : 0;

  return (
    <svg width={140} height={85} style={{ display: 'block', margin: '0 auto' }}>
      {/* Track */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke="#E8E4DC"
        strokeWidth={12}
        strokeLinecap="round"
      />
      {/* Fill */}
      {num > 0 && (
        <path
          d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={28} fontWeight={700} fill={color}>
        {num.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={10} fill="#6B7280">
        success rate
      </text>
    </svg>
  );
}

export default function Step5Results({ draft, onExplore, onAdjust }) {
  var computed = useMemo(function() {
    var built = buildWizardInp(draft);
    var inpWithAssets = built.inpWithAssets;
    var derivedTotals = built.derivedTotals;
    var er = capeBased(inpWithAssets.capeRatio, inpWithAssets.tenYrTreasury, inpWithAssets.tipsYield);
    var cashFlow = buildCashFlow(inpWithAssets, er);
    var mcData = runMonteCarlo(inpWithAssets, er, derivedTotals);
    var survived = mcData.filter(function(r) { return (r.total[r.total.length - 1] || 0) > 0; }).length;
    var successRate = mcData.length > 0 ? (survived / mcData.length * 100).toFixed(1) : '0.0';
    var totalPort = (draft.ira || 0) + (draft.roth || 0) + (draft.taxable || 0);
    var b1Years = totalPort > 0
      ? Math.round((derivedTotals.taxable) / (inpWithAssets.monthlyExpenses * 12 + (inpWithAssets.healthPhase1Annual || 27896)) * 10) / 10
      : 0;
    var irmaaLimit = 212000;
    var annualExpenses = inpWithAssets.monthlyExpenses * 12;
    var currentMagi = Math.round(annualExpenses * 0.85);
    var irmaaClose = irmaaLimit - currentMagi < 30000 && currentMagi < irmaaLimit;
    return { successRate, cashFlow, totalPort, b1Years, irmaaClose, er, inpWithAssets };
  }, [draft]);

  var sr = parseFloat(computed.successRate);
  var srColor = sr >= 85 ? '#059669' : sr >= 70 ? '#D97706' : '#DC2626';

  // Dynamic headline — framed as a first estimate, not a verdict.
  // Uses rough estimates; real data will refine these numbers.
  var headline = sr >= 85
    ? 'Strong start — your rough numbers look good.'
    : sr >= 70
    ? 'A workable starting point. A few things to refine.'
    : 'Good to know early. Some assumptions to revisit.';

  // Key risk card
  var keyRisk;
  if (computed.b1Years < 2 && computed.totalPort > 0) {
    keyRisk = {
      title: 'Bucket 1 needs attention',
      body: 'Only ' + computed.b1Years + ' years of cash coverage. Aim for 2-3 years to weather downturns.',
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
    };
  } else if (sr < 75) {
    keyRisk = {
      title: 'Sequence risk in early years',
      body: 'Market drops in years 1-3 of retirement are your biggest threat. The bucket strategy helps, but spending matters more.',
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
    };
  } else if (computed.irmaaClose) {
    keyRisk = {
      title: 'IRMAA surcharge risk',
      body: "You're close to the Medicare premium threshold. Roth conversions and QCDs can help manage MAGI.",
      color: '#7C3AED',
      bg: '#F5F3FF',
      border: '#DDD6FE',
    };
  } else {
    keyRisk = {
      title: 'Sequence of returns risk',
      body: 'Market drops in years 1-3 matter most. Your bucket strategy addresses this — maintain B1 with 2+ years of cash.',
      color: '#0A4D54',
      bg: '#F0FDFA',
      border: '#A7D9D4',
    };
  }

  // First action card
  var firstAction;
  var annualExpenses = computed.inpWithAssets.monthlyExpenses * 12;
  var wr = computed.totalPort > 0 ? annualExpenses / computed.totalPort : 0;
  var ssDelayBenefit = draft.ssAge && draft.ssAge < 70 && draft.ssFRA
    ? Math.round(draft.ssFRA * 0.08 * (70 - draft.ssAge) * 12)
    : 0;

  if (sr < 75 && wr > 0.05) {
    firstAction = {
      title: 'Reduce spending or extend income',
      body: 'Your ' + (wr * 100).toFixed(1) + '% withdrawal rate is high. Even $500/mo less in spending meaningfully improves your success rate.',
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
    };
  } else if (ssDelayBenefit > 10000 && draft.ssAge < 70) {
    firstAction = {
      title: 'Consider delaying SS to 70',
      body: 'Claiming at 70 vs ' + draft.ssAge + ' adds ~' + fmtDollar(ssDelayBenefit) + '/year and reduces sequence risk in early years.',
      color: '#059669',
      bg: '#F0FDF4',
      border: '#A7F3D0',
    };
  } else {
    firstAction = {
      title: 'Refill Bucket 1 annually',
      body: 'Move dividends and TIPS income to cash before year-end. The bucket strategy is your primary defense against bad timing.',
      color: TEAL,
      bg: '#F0FDFA',
      border: '#A7D9D4',
    };
  }

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px', lineHeight: 1.2 }}>
        {headline}
      </h1>
      <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 28px' }}>
        First estimate based on rough inputs · Monte Carlo · 500 simulations
      </p>

      {/* Three cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {/* Card 1: Success rate */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E8E4DC',
          borderRadius: 10,
          padding: '20px 12px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Success Rate
          </div>
          <SuccessArc rate={computed.successRate} />
        </div>

        {/* Card 2: Key risk */}
        <div style={{
          background: keyRisk.bg,
          border: '1px solid ' + keyRisk.border,
          borderRadius: 10,
          padding: '16px 14px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Key Risk
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: keyRisk.color, marginBottom: 6 }}>
            {keyRisk.title}
          </div>
          <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
            {keyRisk.body}
          </div>
        </div>

        {/* Card 3: First action */}
        <div style={{
          background: firstAction.bg,
          border: '1px solid ' + firstAction.border,
          borderRadius: 10,
          padding: '16px 14px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            First Action
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: firstAction.color, marginBottom: 6 }}>
            {firstAction.title}
          </div>
          <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
            {firstAction.body}
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onExplore}
          style={{
            flex: 1,
            height: 48,
            background: TEAL,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Explore your full plan →
        </button>
        <button
          onClick={onAdjust}
          style={{
            flex: 1,
            height: 48,
            background: '#FFFFFF',
            color: TEAL,
            border: '1.5px solid ' + TEAL,
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Adjust assumptions
        </button>
      </div>

      <div style={{
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 1.6,
        padding: '12px 0 0',
        borderTop: '1px solid #E8E4DC',
      }}>
        First estimate only — based on the rough numbers you provided. These results
        will improve as you add real holdings and refine your assumptions.
        For informational purposes only — not financial advice.
      </div>
    </div>
  );
}
