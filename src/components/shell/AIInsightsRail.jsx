import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, List, TrendingUp, Loader } from 'lucide-react';
import { fetchAiInsights as apiFetchAiInsights } from '../../api.js';

function SkeletonBar({ width }) {
  return (
    <div style={{
      width: width || '100%', height: 12,
      background: 'linear-gradient(90deg,#E8E4DC 25%,#F0EDE8 50%,#E8E4DC 75%)',
      backgroundSize: '200% 100%',
      animation: 'rail-pulse 1.4s ease-in-out infinite',
      borderRadius: 4, marginBottom: 5,
    }} />
  );
}

// ── Card with new anatomy: takeaway + bullets (+ optional action) ─────────────
// Falls back to rendering `body` string when AI live mode fills it in.
function InsightCard({ title, body, takeaway, bullets, action, onAction, icon: Icon, iconColor, priority, loading }) {
  var isPriority = priority === 'high';
  return (
    <div style={{
      background: '#FFFFFF',
      border: isPriority ? '2px solid #0A4D54' : '1px solid #E8E4DC',
      borderRadius: 8, padding: 12, marginBottom: 10,
      boxShadow: isPriority ? '0 2px 8px rgba(10,77,84,0.12)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={14} color={iconColor} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: isPriority ? 14 : 13, fontWeight: isPriority ? 700 : 600, color: '#1A1A1A', lineHeight: 1.2 }}>{title}</span>
      </div>

      {loading ? (
        <div><SkeletonBar width="100%" /><SkeletonBar width="85%" /><SkeletonBar width="70%" /></div>
      ) : body ? (
        /* AI live mode — render plain text response */
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap', textAlign: 'left' }}>{body}</div>
      ) : (
        /* Static mode — new anatomy */
        <div>
          {takeaway && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 6, lineHeight: 1.3, textAlign: 'left' }}>{takeaway}</div>
          )}
          {bullets && bullets.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 14, listStyle: 'disc' }}>
              {bullets.slice(0, 3).map(function(b, i) {
                return <li key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 2, textAlign: 'left' }}>{b}</li>;
              })}
            </ul>
          )}
          {action && onAction && (
            <button
              onClick={onAction}
              style={{
                marginTop: 8, fontSize: 11, fontWeight: 600,
                color: '#0A4D54', background: '#E8F5F2',
                border: '1px solid #A7D9D4', borderRadius: 4,
                padding: '3px 8px', cursor: 'pointer',
              }}
            >{action.label}</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Build static content (bullet-anatomy) ────────────────────────────────────
function buildStaticContent(props) {
  var activeTab     = props.activeTab || 'dashboard';
  var inpWithAssets = props.inpWithAssets || {};
  var successRate   = props.successRate || '—';
  var totalPort     = props.totalPort || 0;
  var buckets       = props.buckets || [];
  var rothWindow    = props.rothWindow || {};
  var dynTaxRate    = props.dynTaxRate || 0;
  var cashFlow      = props.cashFlow || [];
  var activeScen    = props.activeScen || 'Base Case';
  var fmtC          = props.fmtC || function(v) { return '$' + Math.round(v).toLocaleString(); };

  var sr          = parseFloat(successRate) || 0;
  var annualExp   = (inpWithAssets.monthlyExpenses || 8000) * 12;
  var b1Current   = buckets[0] ? buckets[0].current : 0;
  var b2Current   = buckets[1] ? buckets[1].current : 0;
  var b3Current   = buckets[2] ? buckets[2].current : 0;
  var b1CovYears  = annualExp > 0 ? (b1Current / annualExp).toFixed(1) : '—';
  var b1Low       = parseFloat(b1CovYears) < 2.0;
  var rw          = rothWindow || {};
  var nextConv    = rw.yearByYear && rw.yearByYear[0];
  var rothAmt     = nextConv ? fmtC(nextConv.recommended) : fmtC(rw.conservative || 0);
  var rothRate    = nextConv ? nextConv.taxRate : '22%';
  var magi        = nextConv ? nextConv.magi : 0;
  var irmaaSafe   = rw.irmaaSafe || 206000;
  var ssAge       = inpWithAssets.ssAge || 70;
  var curAge      = inpWithAssets.currentAge || 66;
  var ssMonthsAway = Math.max(0, (ssAge - curAge) * 12);
  var lifeExp     = inpWithAssets.lifeExpectancy || 90;
  var b2Target    = buckets[1] ? (buckets[1].target || 1) : 1;
  var b3Target    = buckets[2] ? (buckets[2].target || 1) : 1;
  var b2Pct       = Math.round(b2Current / b2Target * 100);
  var b3Pct       = Math.round(b3Current / b3Target * 100);

  // ── Portfolio tab ──────────────────────────────────────────────────────────
  if (activeTab === 'buckets') {
    return [
      {
        key: 'plan_status', icon: CheckCircle, iconColor: '#0A4D54', priority: 'high',
        title: 'Portfolio Overview',
        takeaway: fmtC(totalPort) + ' across 3 time-based buckets.',
        bullets: [
          'B1 Cash: ' + b1CovYears + ' yrs coverage',
          'B2 Income: ' + b2Pct + '% of target',
          'B3 Growth: ' + b3Pct + '% of target',
        ],
      },
      {
        key: 'critical_risk', icon: AlertTriangle, iconColor: b1Low ? '#8B3528' : '#3D6337', priority: 'high',
        title: 'Bucket 1 Coverage',
        takeaway: b1Low ? 'B1 below 2-year floor — refill needed.' : 'B1 at target — 2.5-yr coverage.',
        bullets: [
          'Current: ' + fmtC(b1Current) + ' / ' + fmtC(annualExp * 2.5) + ' target',
          b1Low ? 'Refill from dividends or B2' : 'Auto-transfer from B2 dividends active',
          'Bear rule: use B2 only, hold B3 in downturns',
        ],
      },
      {
        key: 'next_actions', icon: List, iconColor: '#0A4D54', priority: 'normal',
        title: 'Next Actions',
        takeaway: 'Three allocation actions this week.',
        bullets: [
          b1Low ? 'Refill B1 — move from dividends' : 'Verify B1 auto-transfer is active',
          'Confirm B2 dividend yield is flowing',
          'Trim B3 if equity exceeds target',
        ],
        action: { label: '→ View Plan', tab: 'cashflow' },
      },
      {
        key: 'opportunities', icon: TrendingUp, iconColor: '#3D6337', priority: 'normal',
        title: 'Allocation Notes',
        takeaway: 'Tax location drives long-run efficiency.',
        bullets: [
          'Growth assets → Roth (no RMDs)',
          'Bonds → IRA (deferred, lower risk)',
          'SCHD/VNQ dividends refill B1 annually',
        ],
      },
    ];
  }

  // ── Cash Flow / Plan tab ───────────────────────────────────────────────────
  if (activeTab === 'cashflow') {
    var gapRows      = cashFlow.filter(function(r) { return r.gap > 0; });
    var firstGapRow  = gapRows[0];
    var totalGap     = gapRows.reduce(function(s, r) { return s + (r.gap || 0); }, 0);
    var ssRow        = cashFlow.find(function(r) { return r.scottSS > 0; });
    var nextRothRow  = cashFlow.find(function(r) { return r.rothConv > 0; });
    return [
      {
        key: 'plan_status', icon: CheckCircle, iconColor: gapRows.length > 0 ? '#8A5515' : '#0A4D54', priority: 'high',
        title: 'Cash Flow Summary',
        takeaway: gapRows.length > 0
          ? gapRows.length + ' gap years — ' + fmtC(totalGap) + ' total shortfall.'
          : 'No gap years — income covers all spending.',
        bullets: [
          'Projections through age ' + lifeExp,
          gapRows.length > 0 ? 'Portfolio draws cover all gaps' : 'SS + income fully covers expenses',
          ssRow ? 'SS starts ' + ssRow.year + ' — gap narrows' : 'SS in ' + (new Date().getFullYear() + ssMonthsAway / 12 | 0),
        ],
      },
      {
        key: 'critical_risk', icon: AlertTriangle, iconColor: firstGapRow ? '#8B3528' : '#3D6337', priority: 'high',
        title: 'Income Gap Risk',
        takeaway: firstGapRow
          ? 'First gap year ' + firstGapRow.year + ' — ' + fmtC(firstGapRow.gap) + ' shortfall.'
          : 'No income gaps through age ' + lifeExp + '.',
        bullets: [
          firstGapRow ? 'Portfolio draws cover shortfall' : 'Income covers all spending',
          'Sequence risk highest in first 5 years',
          'B1 cash provides ' + b1CovYears + ' yrs of buffer',
        ],
      },
      {
        key: 'next_actions', icon: List, iconColor: '#0A4D54', priority: 'normal',
        title: 'Next Actions',
        takeaway: 'Three cash flow decisions this year.',
        bullets: [
          ssRow ? 'Verify SS claiming age ' + ssAge : 'Confirm SS strategy before ' + ssAge,
          nextRothRow ? 'Roth conversion ' + nextRothRow.year + ' — ' + fmtC(nextRothRow.rothConv) : 'No Roth conversions this year',
          'Healthcare Phase 1 — confirm ' + fmtC(inpWithAssets.healthPhase1Annual || 27896) + '/yr',
        ],
        action: { label: '→ Roth Optimizer', tab: 'roth' },
      },
      {
        key: 'opportunities', icon: TrendingUp, iconColor: '#3D6337', priority: 'normal',
        title: 'Income Optimization',
        takeaway: rw.years > 0 ? rw.years + '-yr Roth window still open.' : 'RMDs approaching — act soon.',
        bullets: [
          ssAge < 70 ? 'Delay SS to 70: +' + Math.round((inpWithAssets.ssFRA || 3445) * 0.32 * 12 / 1000) + 'K/yr lifetime' : 'SS age 70 — maximized',
          rw.years > 0 ? 'Convert before RMDs at 73' : 'RMDs start soon',
          magi > 0 && magi < irmaaSafe ? fmtC(irmaaSafe - magi) + ' IRMAA headroom' : 'Near IRMAA — watch income',
        ].filter(Boolean),
      },
    ];
  }

  // ── Stress Test tab ────────────────────────────────────────────────────────
  if (activeTab === 'monte') {
    var onTrackM = sr >= 80;
    return [
      {
        key: 'plan_status', icon: CheckCircle, iconColor: onTrackM ? '#0A4D54' : '#8B3528', priority: 'high',
        title: sr >= 80 ? 'Scenario: Passing' : 'Scenario: At Risk',
        takeaway: activeScen + ' — ' + sr + '% success rate.',
        bullets: [
          fmtC(totalPort) + ' starting portfolio',
          'Age ' + curAge + ' → ' + lifeExp + ', 500 simulations',
          sr >= 80 ? 'Plan survives worst 10% of markets' : 'Below 80% — consider adjustments',
        ],
      },
      {
        key: 'critical_risk', icon: AlertTriangle, iconColor: '#8B3528', priority: 'high',
        title: 'Downside Exposure',
        takeaway: sr >= 50 ? 'Worst 10% survive with B1 cushion.' : 'Bottom 10% face portfolio depletion.',
        bullets: [
          'B1 covers ' + b1CovYears + ' yrs of draws',
          'Down markets: use B2 only, hold B3',
          'Sequence risk highest years 1-5',
        ],
      },
      {
        key: 'next_actions', icon: List, iconColor: '#0A4D54', priority: 'normal',
        title: 'Stress Test Actions',
        takeaway: 'Three steps to stress-proof the plan.',
        bullets: [
          'Compare Base Case vs stress scenarios',
          b1Low ? 'B1 low — increase cash buffer' : 'B1 at target — SORR protection active',
          'Review TIPS allocation — absorbs equity swings',
        ],
        action: { label: '→ Adjust Assumptions', tab: 'settings' },
      },
      {
        key: 'opportunities', icon: TrendingUp, iconColor: '#3D6337', priority: 'normal',
        title: 'Improve Resilience',
        takeaway: 'Small changes add 3-5 pts to success.',
        bullets: [
          sr < 90 ? '$5K/yr less spending → ~3 pts gain' : 'Already at strong success rate',
          'Delay SS to 70 — cuts early draws',
          b1Low ? 'B1 target: ' + fmtC(annualExp * 2.5) + ' (2.5 yrs)' : 'B1 buffer adequate for sequence risk',
        ].filter(Boolean),
      },
    ];
  }

  // ── Roth tab ───────────────────────────────────────────────────────────────
  if (activeTab === 'roth') {
    var taxPct       = Math.round((dynTaxRate || 0) * 100);
    var irmaaSurplus = irmaaSafe - magi;
    var irmaaRisk    = magi > 0 && irmaaSurplus < 20000;
    return [
      {
        key: 'plan_status', icon: CheckCircle, iconColor: '#0A4D54', priority: 'high',
        title: 'Roth Conversion Window',
        takeaway: rw.years > 0 ? rw.years + ' years to convert before RMDs.' : 'RMD window — conversions reduce future RMDs.',
        bullets: [
          rothAmt + ' headroom at ' + rothRate + ' this year',
          'Convert by Dec 31 — bracket locks',
          'Roth: no RMDs, tax-free growth',
        ],
      },
      {
        key: 'critical_risk', icon: AlertTriangle, iconColor: irmaaRisk ? '#8B3528' : '#8A5515', priority: 'high',
        title: irmaaRisk ? 'IRMAA Risk' : 'Tax Bracket Watch',
        takeaway: magi > 0
          ? (irmaaRisk ? 'MAGI only ' + fmtC(irmaaSurplus) + ' below IRMAA tier.' : 'MAGI ' + fmtC(magi) + ' — ' + fmtC(irmaaSurplus) + ' IRMAA room.')
          : 'Effective rate ' + taxPct + '% — ' + rothRate + ' bracket.',
        bullets: [
          'IRMAA threshold: ' + fmtC(irmaaSafe) + '/yr (MFJ)',
          irmaaRisk ? 'Conversion may trigger Medicare surcharge' : 'Safe to convert up to ' + rothAmt,
          'Watch 2-year look-back for Medicare',
        ],
      },
      {
        key: 'next_actions', icon: List, iconColor: '#0A4D54', priority: 'normal',
        title: 'Next Actions',
        takeaway: 'Convert now — window is limited.',
        bullets: [
          rothAmt + ' this year fills ' + rothRate + ' bracket',
          irmaaRisk ? 'Stay below ' + fmtC(irmaaSafe) + ' MAGI' : 'IRMAA safe — ' + fmtC(irmaaSurplus) + ' headroom',
          'Review IRA — ' + fmtC(inpWithAssets.iraBalGrowth || 0) + ' in growth assets',
        ],
        action: { label: '→ Income & Tax', tab: 'incometax' },
      },
      {
        key: 'opportunities', icon: TrendingUp, iconColor: '#3D6337', priority: 'normal',
        title: 'Tax Opportunities',
        takeaway: rw.years > 0 ? rw.years + '-yr ladder beats waiting for RMDs.' : 'Act before RMDs force higher brackets.',
        bullets: [
          rw.years > 0 ? rothAmt + '/yr × ' + rw.years + ' yrs before RMDs' : null,
          taxPct < 22 ? 'Effective rate ' + taxPct + '% — favorable now' : null,
          'Heirs inherit Roth tax-free, no RMDs',
        ].filter(Boolean),
      },
    ];
  }

  // ── Spending tab ───────────────────────────────────────────────────────────
  if (activeTab === 'spending') {
    var monthlyExp  = inpWithAssets.monthlyExpenses || 8000;
    var ssMonthly   = inpWithAssets.ssFRA || 3445;
    var spendWR     = totalPort > 0 ? (monthlyExp * 12 / totalPort * 100).toFixed(1) : '—';
    var postSSGap   = Math.max(0, monthlyExp - ssMonthly);
    var suggested   = Math.round(totalPort * 0.04 / 12);
    return [
      {
        key: 'plan_status', icon: CheckCircle, iconColor: '#0A4D54', priority: 'high',
        title: 'Spending Summary',
        takeaway: fmtC(monthlyExp) + '/mo budget = ' + spendWR + '% withdrawal rate.',
        bullets: [
          fmtC(monthlyExp * 12) + '/yr of ' + fmtC(totalPort) + ' portfolio',
          '4% guideline: ' + fmtC(suggested) + '/mo',
          spendWR > 5 ? 'Rate exceeds 4% — monitor sustainability' : 'Rate within manageable range',
        ],
      },
      {
        key: 'critical_risk', icon: AlertTriangle, iconColor: '#8A5515', priority: 'high',
        title: 'Budget vs. Income',
        takeaway: fmtC(monthlyExp) + '/mo gap — portfolio-funded now.',
        bullets: [
          'SS starts in ' + ssMonthsAway + ' months',
          'Post-SS gap: ' + fmtC(postSSGap) + '/mo',
          'Sequence risk highest during gap years',
        ],
      },
      {
        key: 'next_actions', icon: List, iconColor: '#0A4D54', priority: 'normal',
        title: 'Spending Actions',
        takeaway: 'Track actuals against ' + fmtC(monthlyExp) + '/mo target.',
        bullets: [
          'Healthcare review — ' + fmtC(inpWithAssets.healthPhase1Annual || 28000) + '/yr estimate',
          '$5K/yr less = ~3 funded years added',
          'Front-load travel in go-go years (66-75)',
        ],
        action: { label: '→ Assumptions', tab: 'settings' },
      },
      {
        key: 'opportunities', icon: TrendingUp, iconColor: '#3D6337', priority: 'normal',
        title: 'Spending Levers',
        takeaway: 'Small reductions compound significantly.',
        bullets: [
          '$10K/yr less → +' + Math.round(10000 / (monthlyExp * 12) * 24) + ' funded months',
          'Go-go years (66-75): spend more while healthy',
          'Healthcare rises 2× after Medicare gap',
        ],
      },
    ];
  }

  // ── Overview (default) ─────────────────────────────────────────────────────
  var onTrack = sr >= 80;
  return [
    {
      key: 'plan_status', icon: CheckCircle, iconColor: '#0A4D54', priority: 'high',
      title: onTrack ? 'Your plan is on track' : 'Your plan needs attention',
      takeaway: sr + '% success through age ' + lifeExp + '.',
      bullets: [
        fmtC(totalPort) + ' supports ' + fmtC(annualExp) + '/yr spending',
        ssMonthsAway > 0 ? 'SS begins in ' + ssMonthsAway + ' months' : 'SS income active this year',
        b1Low ? 'B1 cash below target — refill needed' : 'B1 cash at 2.5-yr target',
      ],
    },
    {
      key: 'critical_risk', icon: AlertTriangle, iconColor: '#8B3528', priority: 'high',
      title: 'Critical Risk',
      takeaway: 'Sequence risk highest in first 5 years.',
      bullets: [
        'B1 cash: ' + b1CovYears + ' yrs of coverage',
        'Market drop now = permanent reduction',
        b1Low ? 'Refill B1 before year-end' : 'Bear rule: use B2, hold B3 in downturns',
      ],
    },
    {
      key: 'next_actions', icon: List, iconColor: '#0A4D54', priority: 'normal',
      title: 'Next Actions',
      takeaway: 'Three time-sensitive steps this year.',
      bullets: [
        'Roth conversion — ' + rothAmt + ' at ' + rothRate,
        b1Low ? 'Refill B1 from dividends' : 'Verify dividend auto-transfer active',
        'Healthcare Phase 1 — ' + fmtC(inpWithAssets.healthPhase1Annual || 27896) + '/yr',
      ],
      action: { label: '→ View Plan', tab: 'cashflow' },
    },
    {
      key: 'opportunities', icon: TrendingUp, iconColor: '#3D6337', priority: 'normal',
      title: 'Other Opportunities',
      takeaway: 'Three optimizations available now.',
      bullets: [
        ssAge < 70 ? 'Delay SS to 70: +' + Math.round((inpWithAssets.ssFRA || 3445) * 0.32 * 12 / 1000) + 'K/yr lifetime' : 'SS age 70 locked in',
        rw.years > 0 ? rw.years + '-yr Roth window before RMDs at 73' : 'RMDs approaching soon',
        magi > 0 && magi < irmaaSafe ? fmtC(irmaaSafe - magi) + ' IRMAA headroom this year' : 'Near IRMAA — watch income',
      ].filter(Boolean),
    },
  ];
}

// ── Parse AI text response ─────────────────────────────────────────────────
function parseAIResponse(text) {
  var sections = { PLAN_STATUS: '', CRITICAL_RISK: '', NEXT_ACTIONS: '', OPPORTUNITIES: '' };
  var keys = Object.keys(sections);
  keys.forEach(function(key, i) {
    var start = text.indexOf(key + ':');
    if (start === -1) return;
    start += key.length + 1;
    var end = text.length;
    for (var j = i + 1; j < keys.length; j++) {
      var next = text.indexOf(keys[j] + ':');
      if (next !== -1 && next < end) end = next;
    }
    sections[key] = text.slice(start, end).trim();
  });
  return sections;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AIInsightsRail(props) {
  var activeTab = props.activeTab;

  var modeState = useState('static');
  var aiMode = modeState[0]; var setAiMode = modeState[1];

  var contentState = useState(null);
  var aiContent = contentState[0]; var setAiContent = contentState[1];

  var errorState = useState(null);
  var aiError = errorState[0]; var setAiError = errorState[1];

  var spendAlertState = useState(null);
  var spendingAlert = spendAlertState[0]; var setSpendingAlert = spendAlertState[1];
  var prevSpendingRef = useRef(props.inpWithAssets && props.inpWithAssets.monthlyExpenses);

  // Detect significant spending changes (>10%)
  useEffect(function() {
    var current = props.inpWithAssets && props.inpWithAssets.monthlyExpenses;
    var prev = prevSpendingRef.current;
    if (prev && current && Math.abs(current - prev) / prev > 0.1) {
      var wr = props.totalPort > 0 ? (current * 12) / props.totalPort : 0;
      setSpendingAlert({ prev: prev, current: current, withdrawalRate: wr });
    }
    prevSpendingRef.current = current;
  }, [props.inpWithAssets && props.inpWithAssets.monthlyExpenses]);

  // Reset to static when tab changes
  useEffect(function() {
    setAiMode('static');
    setAiContent(null);
    setAiError(null);
  }, [activeTab]);

  var staticCards = buildStaticContent(props);

  function handleRefresh() {
    setAiMode('loading');
    setAiError(null);

    var inpWithAssets = props.inpWithAssets || {};
    var fmtC = props.fmtC || function(v) { return '$' + Math.round(v || 0).toLocaleString(); };
    var buckets = props.buckets || [];
    var rw = props.rothWindow || {};
    var nextConv = rw.yearByYear && rw.yearByYear[0];
    var b1Current = buckets[0] ? buckets[0].current : 0;
    var b1CovYears = (inpWithAssets.monthlyExpenses || 8000) > 0
      ? (b1Current / ((inpWithAssets.monthlyExpenses || 8000) * 12)).toFixed(1) : '—';
    var b2Total = buckets[1] ? buckets[1].current : 0;
    var b3Total = buckets[2] ? buckets[2].current : 0;
    var b2Target = buckets[1] ? (buckets[1].target || 569000) : 569000;
    var b3Target = buckets[2] ? (buckets[2].target || 820500) : 820500;
    var isPortfolio = activeTab === 'buckets';

    var prompt = 'You are a retirement planning assistant. Analyze this retirement plan and provide 4 brief, specific insights. Use actual numbers from the data provided. Never use the word "recommend" — frame everything as observations and questions.\n\n' +
      'PLAN DATA:\n' +
      '- Success rate: ' + props.successRate + '% (Monte Carlo, 500 runs)\n' +
      '- Portfolio: ' + fmtC(props.totalPort) + '\n' +
      '- Monthly spending: ' + fmtC(inpWithAssets.monthlyExpenses || 8000) + '\n' +
      '- B1 Cash: ' + fmtC(b1Current) + ' (' + b1CovYears + ' yrs coverage, target 2.5 yrs)\n' +
      '- B2 Income: ' + fmtC(b2Total) + ' (' + Math.round(b2Total / b2Target * 100) + '% of target)\n' +
      '- B3 Growth: ' + fmtC(b3Total) + ' (' + Math.round(b3Total / b3Target * 100) + '% of target)\n' +
      '- Tax rate: ' + Math.round((props.dynTaxRate || 0) * 100) + '%\n' +
      '- Roth conversion headroom: ' + (nextConv ? fmtC(nextConv.recommended) : fmtC(rw.conservative || 0)) + ' at ' + (nextConv ? nextConv.taxRate : '22%') + '\n' +
      '- SS claiming age: ' + (inpWithAssets.ssAge || 70) + ' (' + fmtC(inpWithAssets.ssMonthly || 3445) + '/mo)\n' +
      (isPortfolio
        ? '\nPORTFOLIO BREAKDOWN:\n- Total: ' + fmtC(props.totalPort) + '\n- B1: ' + fmtC(b1Current) + ' / ' + fmtC(buckets[0] ? buckets[0].target : 0) + ' target\n- B2: ' + fmtC(b2Total) + ' / ' + fmtC(b2Target) + ' target\n- B3: ' + fmtC(b3Total) + ' / ' + fmtC(b3Target) + ' target\n'
        : '- Current tab: ' + (activeTab || 'overview') + '\n') +
      '\nRespond in EXACTLY this format:\n\nPLAN_STATUS: [1-2 sentences. Start with the success rate.]\n\nCRITICAL_RISK: [1-2 sentences. Most pressing risk right now.]\n\nNEXT_ACTIONS: [3 numbered action items. Format: "1. [Action] — [specific detail]"]\n\nOPPORTUNITIES: [2-3 bullet points starting with "•".]';

    apiFetchAiInsights(prompt)
      .then(function(data) {
        var text = (data.content || []).filter(function(b) { return b.type === 'text'; }).map(function(b) { return b.text; }).join('');
        if (!text) throw new Error(data.error ? data.error.message : 'Empty response');
        setAiContent(parseAIResponse(text));
        setAiMode('live');
      })
      .catch(function(err) {
        setAiError('AI refresh failed: ' + (err.message || 'Unknown error'));
        setAiMode('static');
      });
  }

  var isLoading = aiMode === 'loading';

  // Merge static with AI content in live mode
  var cards = staticCards.map(function(card) {
    if (aiMode === 'live' && aiContent) {
      var keyMap = { plan_status: 'PLAN_STATUS', critical_risk: 'CRITICAL_RISK', next_actions: 'NEXT_ACTIONS', opportunities: 'OPPORTUNITIES' };
      var aiKey = keyMap[card.key];
      if (aiKey && aiContent[aiKey]) return Object.assign({}, card, { body: aiContent[aiKey] });
    }
    return card;
  });

  return (
    <div style={{ width: 240, minWidth: 240, flexShrink: 0, background: '#F5F3EF', borderLeft: '1px solid #E8E4DC', height: '100vh', overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes rail-pulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid rgba(10,77,84,0.2)', paddingBottom: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#0A4D54', textTransform: 'uppercase' }}>AI Insights</span>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: isLoading ? '#9CA3AF' : '#0A4D54', background: 'transparent', border: '1px solid ' + (isLoading ? '#E8E4DC' : '#0A4D54'), borderRadius: 4, padding: '3px 8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
        >
          {isLoading
            ? React.createElement(React.Fragment, null, React.createElement(Loader, { size: 10, style: { animation: 'spin 1s linear infinite' } }), ' Analyzing…')
            : '✦ Refresh'}
        </button>
      </div>

      {aiError && (
        <div style={{ fontSize: 11, color: '#8B3528', background: '#FFF5F4', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 10px', marginBottom: 12, lineHeight: 1.4 }}>{aiError}</div>
      )}

      {/* Spending change alert */}
      {spendingAlert && (
        <div style={{ background: spendingAlert.withdrawalRate > 0.05 ? '#FEE2E2' : '#FEF3C7', border: '1px solid ' + (spendingAlert.withdrawalRate > 0.05 ? '#8B3528' : '#8A5515'), borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: spendingAlert.withdrawalRate > 0.05 ? '#8B3528' : '#8A5515' }}>
            {spendingAlert.withdrawalRate > 0.05 ? '⚠ High Spending Rate' : '↑ Spending Increased'}
          </div>
          <div style={{ fontSize: 12, color: '#374151', marginTop: 4, textAlign: 'left' }}>
            Expenses changed from ${spendingAlert.prev.toLocaleString()} to ${spendingAlert.current.toLocaleString()}.
            Rate now {(spendingAlert.withdrawalRate * 100).toFixed(1)}%/yr.
            {spendingAlert.withdrawalRate > 0.05 ? ' Sustainability at risk.' : ' Run a Refresh.'}
          </div>
          <button onClick={function() { setSpendingAlert(null); }} style={{ fontSize: 11, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, padding: 0 }}>Dismiss</button>
        </div>
      )}

      {/* Insight cards */}
      {cards.map(function(card) {
        return (
          <InsightCard
            key={card.key}
            title={card.title}
            body={card.body}
            takeaway={card.takeaway}
            bullets={card.bullets}
            action={card.action}
            onAction={card.action && props.setActiveTab ? function() { props.setActiveTab(card.action.tab); } : null}
            icon={card.icon}
            iconColor={card.iconColor}
            priority={card.priority}
            loading={isLoading}
          />
        );
      })}

      {/* Footer */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid #E8E4DC', paddingTop: 12, marginTop: 8 }}>
        <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
          For informational and educational purposes only. Not financial, tax, or investment advice.
        </p>
      </div>
    </div>
  );
}
