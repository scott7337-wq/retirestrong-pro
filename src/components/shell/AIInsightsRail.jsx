import React from 'react';

// ── Card type → icon + color ──────────────────────────────────────────────────
var CARD_TYPES = {
  status:  { icon: 'ℹ',  color: '#3B82F6' },
  risk:    { icon: '⚠',  color: '#EF4444' },
  warn:    { icon: '⚠',  color: '#F59E0B' },
  action:  { icon: '✓',  color: '#10B981' },
  default: { icon: '↗',  color: '#6B7280' },
};

// ── InsightCard ──────────────────────────────────────────────────────────────
function InsightCard({ title, items, action, onAction, cardType }) {
  var t = CARD_TYPES[cardType] || CARD_TYPES.default;
  var isAction = cardType === 'action';
  var isRisk   = cardType === 'risk';

  return (
    <div style={{
      background: '#FCFBF8',
      border: '1px solid #D4D1C5',
      borderRadius: '8px',
      padding: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 15, color: t.color, fontWeight: 700, lineHeight: 1 }}>{t.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#222222' }}>{title}</span>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(function(item, i) {
          if (isAction) {
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 20, height: 20, minWidth: 20, borderRadius: '50%',
                  background: '#222222', color: '#FFFFFF',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ fontSize: 13, color: '#222222', lineHeight: 1.5 }}>{item.text}</span>
              </div>
            );
          }
          return (
            <div key={i} style={{
              display: 'flex', gap: 6, alignItems: 'flex-start',
              fontSize: 13,
              color: item.highlight ? '#111827' : '#374151',
              fontWeight: item.highlight ? 600 : 400,
              lineHeight: 1.5,
            }}>
              {item.dot && (
                <span style={{ color: item.dotColor || t.color, flexShrink: 0, marginTop: 1 }}>•</span>
              )}
              <span>{item.text}</span>
            </div>
          );
        })}
      </div>

      {/* Action */}
      {action && onAction && (
        isRisk ? (
          <button onClick={onAction} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#EF4444', fontSize: 13, padding: '8px 0 0',
            textAlign: 'left', display: 'block',
          }}>→ {action}</button>
        ) : (
          <button onClick={onAction} style={{
            background: 'none', border: '1px solid #D1D5DB', borderRadius: 6,
            padding: '6px 12px', fontSize: 12, color: '#222222',
            cursor: 'pointer', marginTop: 8,
          }}>{action} →</button>
        )
      )}
    </div>
  );
}

// ── Tab-specific content ──────────────────────────────────────────────────────
function buildRailContent(activeTab, ctx, navigateCoach) {
  const cf          = ctx?.cashFlow || [];
  const inp         = ctx?.inp || {};
  const fmt         = ctx?.fmtC || (v => '$' + Math.round(v).toLocaleString());
  const successRate = ctx?.successRate || 0;
  const totalPort   = ctx?.totalPort   || 0;
  const srColor     = successRate >= 85 ? '#10B981' : successRate >= 70 ? '#D97706' : '#EF4444';
  const firstGap    = cf.find(r => (r.gap || 0) > 0);
  const yr0         = cf[0] || {};

  switch (activeTab) {
    case 'dashboard': {
      const buckets = ctx?.buckets || [];
      const b1 = buckets[0] || {};
      const annualExp = (inp.monthlyExpenses || 0) * 12;
      const b1CovYears = annualExp > 0 && b1.current ? b1.current / annualExp : null;
      const hasBucketRisk = b1CovYears !== null && b1CovYears < 2.0;

      const criticalRiskText = successRate < 70
        ? 'Success rate below 70% — spending may be too high relative to portfolio. Consider a $500/mo spending reduction.'
        : hasBucketRisk
        ? 'Bucket 1 cash runway is ' + b1CovYears.toFixed(1) + ' years — below the 2-year minimum. Sequence risk is elevated.'
        : 'IRMAA watch: keep 2026 income under $206K to avoid Medicare surcharges starting 2028.';

      return {
        cards: [
          {
            title: 'Plan Status', cardType: 'status',
            items: [
              { text: successRate + '% success rate (500 MC runs)', highlight: true, dot: true, dotColor: srColor },
              { text: totalPort ? fmt(totalPort) + ' total portfolio' : 'Portfolio loaded', dot: true },
              firstGap
                ? { text: 'First income gap at age ' + firstGap.age, dot: true, dotColor: '#D97706' }
                : { text: 'No income gaps projected', dot: true, dotColor: '#10B981' },
            ],
          },
          {
            title: 'Critical Risk', cardType: 'risk',
            items: [
              { text: criticalRiskText },
            ],
            action: successRate < 70 ? 'Model a spending cut' : hasBucketRisk ? 'Refill cash bucket before year-end' : 'Review IRMAA headroom',
            onAction: successRate < 70
              ? () => navigateCoach('What happens if I reduce spending by $500/month? Show the impact on success rate.')
              : hasBucketRisk
              ? () => navigateCoach('How do I refill Bucket 1 before year-end and avoid sequence-of-returns risk?')
              : () => navigateCoach('What is my IRMAA headroom this year?'),
          },
          {
            title: 'Next Action', cardType: 'action',
            items: [
              { text: yr0.rothConv ? 'Execute Roth conversion of ' + fmt(yr0.rothConv) + ' — window is open' : 'Review Roth conversion headroom before year-end' },
              { text: hasBucketRisk ? 'Refill Bucket 1 — current runway below 2-year target' : 'Confirm Bucket 1 cash runway covers 2+ years of spending' },
              { text: 'Review IRMAA headroom in Income & Tax tab' },
            ],
          },
          {
            title: 'Other Opportunities', cardType: 'default',
            items: [
              { text: 'Model SS timing impact — delay to 70 adds ~8%/yr', dot: true },
              { text: 'Withdrawal sequencing: taxable → IRA → Roth saves taxes', dot: true },
              { text: 'Smile-shaped spending reduces early portfolio draw', dot: true },
            ],
          },
        ],
        quickLinks: [
          { text: 'What\'s my biggest risk right now?', question: 'What is the single biggest risk to my retirement plan right now?' },
          { text: 'Model a spending change',            question: 'What happens if I reduce monthly spending by $500? Show the impact on success rate and portfolio longevity.' },
          { text: 'Run a stress test',                  question: 'Run a "bad first five years" stress test on my plan and show how the bucket strategy helps.' },
        ],
      };
    }

    case 'buckets':
    case 'portfolio': return {
      cards: [
        {
          title: 'Bucket Status', cardType: 'status',
          items: [
            { text: 'Bucket 1 (Cash): Review runway above', dot: true },
            { text: 'Bucket 2 (Bonds/TIPS): Intermediate buffer', dot: true },
            { text: 'Bucket 3 (Growth): Long-term engine', dot: true },
          ],
        },
        {
          title: 'Sequence Risk', cardType: 'warn',
          items: [
            { text: '2–3 years cash in B1 protects against early downturns' },
            { text: 'Refill B1 from dividends in good years' },
            { text: 'Avoid selling growth assets in down markets' },
          ],
          action: 'Stress test my plan',
          onAction: () => navigateCoach('How does my plan hold up in a bad sequence of returns?'),
        },
      ],
      quickLinks: [
        { text: 'How much cash should I hold?',    question: 'How much should I keep in Bucket 1 (cash) given my monthly expenses and risk tolerance?' },
        { text: 'When should I refill Bucket 1?',  question: 'When and how should I refill Bucket 1? What triggers should I use?' },
        { text: 'Explain sequence-of-returns risk', question: 'Explain sequence-of-returns risk and how the bucket strategy protects me from it.' },
      ],
    };

    case 'cashflow':
    case 'plan': {
      const gapYears    = cf.filter(r => (r.gap || 0) > 0);
      const fundingYrs  = cf.length;
      const firstDraw   = cf.find(r => ((r.fromIRA || 0) + (r.fromRoth || 0) + (r.fromTaxable || 0)) > 0);
      const lastDraw    = [...cf].reverse().find(r => ((r.fromIRA || 0) + (r.fromRoth || 0) + (r.fromTaxable || 0)) > 0);
      const drawBefore  = firstDraw ? fmt((firstDraw.fromIRA || 0) + (firstDraw.fromRoth || 0) + (firstDraw.fromTaxable || 0)) : null;
      const drawAfter   = firstGap  ? fmt(firstGap.gap || 0) : null;

      return {
        cards: [
          {
            title: 'Plan Status', cardType: 'status',
            items: [
              {
                text: 'Your retirement timeline shows ' + fundingYrs + ' years of funding with a strategic withdrawal approach.',
                highlight: true,
              },
              { text: 'Chart shows balance projection through retirement', dot: true },
              drawBefore && drawAfter
                ? { text: 'Withdrawals drop from ' + drawBefore + ' → ' + drawAfter + ' after SS starts', dot: true }
                : { text: firstGap ? 'First income gap at age ' + firstGap.age : 'No income gaps projected', dot: true, dotColor: firstGap ? '#D97706' : '#10B981' },
              { text: 'Critical years highlight key milestones', dot: true },
            ].filter(Boolean),
          },
          {
            title: 'Withdrawal Strategy', cardType: 'default',
            items: [
              { text: 'Bucket approach protects from forced selling in downturns.', highlight: true },
              { text: 'Bucket 1: Cash for years 1–3', dot: true },
              { text: 'Bucket 2: Bonds refill Bucket 1 annually', dot: true },
              { text: 'Bucket 3: Growth stays invested long-term', dot: true },
            ],
          },
          {
            title: 'Next Actions', cardType: 'action',
            items: [
              { text: 'Refill Bucket 1 from maturing CDs' },
              { text: 'Fill bond ladder gaps in Bucket 2' },
              { text: 'Model SS delay to 70 for maximum benefit' },
            ],
          },
        ],
        quickLinks: [
          { text: 'When do income gaps start?', question: 'When do income gaps start in my plan and what is the best way to cover them?' },
          { text: 'Optimize SS timing',          question: 'How does SS timing affect my annual cash flow? Show the difference between claiming at 67 vs 70.' },
          { text: 'Model early retirement',      question: 'What happens to my cash flow if I retire 2 years earlier than planned?' },
        ],
      };
    }

    case 'monte': return {
      cards: [
        {
          title: 'Scenario Analysis', cardType: 'status',
          items: [
            { text: 'Base case: ' + successRate + '% success', highlight: true, dot: true, dotColor: srColor },
            { text: 'Bad First Five Years is your key stress test', dot: true },
            { text: 'Guardrails can add 10–15% success rate', dot: true },
          ],
        },
        {
          title: 'Key Levers', cardType: 'action',
          items: [
            { text: 'Spending 10% less adds ~8–12% success rate' },
            { text: 'Delaying SS to 70 adds longevity protection' },
            { text: 'One more year of work often moves the needle most' },
          ],
          action: 'What if I add guardrails?',
          onAction: () => navigateCoach('What if I add Guyton-Klinger guardrails to my spending? Show the impact on success rate.'),
        },
      ],
      quickLinks: [
        { text: 'What stress tests matter most?',    question: 'Which stress test scenarios matter most for my specific plan? Rank them by impact.' },
        { text: 'What levers improve success rate?', question: 'What are the top 3 changes I can make to meaningfully improve my Monte Carlo success rate?' },
        { text: 'Model a 2008-style crash',          question: 'What happens to my plan if the market drops 40% in year 1 of retirement? Show the outcome with and without the bucket strategy.' },
      ],
    };

    case 'spending': return {
      cards: [
        {
          title: 'Spending Health', cardType: 'status',
          items: [
            { text: 'Budget: $' + (inp.monthlyExpenses || 0).toLocaleString() + '/mo', highlight: true, dot: true },
            { text: 'Essential expenses should match guaranteed income' },
            { text: 'Discretionary is your main adjustment lever' },
          ],
        },
        {
          title: 'What-If', cardType: 'action',
          items: [
            { text: 'Cutting $500/mo adds roughly 2–3% success rate' },
            { text: 'Smile-shaped spending reduces early withdrawals' },
            { text: 'Healthcare costs typically peak at 75–80' },
          ],
          action: 'Model a spending change',
          onAction: () => navigateCoach('What if I reduce spending by $500/month? Show the impact on success rate and portfolio balance over time.'),
        },
      ],
      quickLinks: [
        { text: 'What\'s my safe withdrawal rate?', question: 'What is my safe withdrawal rate given my portfolio and time horizon? How does it compare to the 4% rule?' },
        { text: 'Model smile-shaped spending',       question: 'What is smile-shaped spending and how would it apply to my plan? Compare it to flat real spending.' },
        { text: 'Which expenses are essential?',     question: 'Help me categorize my expenses into essential vs discretionary and identify the best places to cut if needed.' },
      ],
    };

    case 'incometax': return {
      cards: [
        {
          title: 'Tax Efficiency', cardType: 'status',
          items: [
            { text: 'IRMAA Tier 1 threshold: $212,000 MAGI', highlight: true, dot: true },
            { text: '22% bracket ceiling: ~$201,000 MFJ', dot: true },
            { text: 'Roth conversions count toward MAGI', dot: true, dotColor: '#D97706' },
          ],
          action: 'Calculate my headroom',
          onAction: () => navigateCoach('What is my exact IRMAA headroom this year? How much can I convert without triggering a surcharge?'),
        },
        {
          title: "This Year's Priority", cardType: 'action',
          items: [
            { text: 'Convert up to IRMAA ceiling first' },
            { text: 'IRA draws + conversions = MAGI' },
            { text: 'Two-year lookback: 2026 income affects 2028 premiums' },
          ],
        },
      ],
      quickLinks: [
        { text: 'What is my IRMAA headroom?',          question: 'What is my IRMAA headroom this year? Give me the exact dollar amount I can convert or withdraw without hitting the next tier.' },
        { text: 'Explain IRMAA two-year lookback',     question: 'Explain how the Medicare IRMAA two-year lookback works and how to use it in planning Roth conversions.' },
        { text: 'How much should I convert?',          question: 'How much should I convert to Roth this year to stay under IRMAA Tier 1 and fill the 22% bracket?' },
      ],
    };

    case 'roth': return {
      cards: [
        {
          title: 'Conversion Window', cardType: 'status',
          items: [
            { text: 'Window closes when RMDs begin', highlight: true, dot: true },
            { text: 'Survivor tax cliff makes conversions urgent', dot: true },
            { text: 'Each year of delay = higher future RMD burden', dot: true },
          ],
          action: 'Plan my conversions',
          onAction: () => navigateCoach('How much should I convert to Roth each year before RMDs begin? Give me a year-by-year plan.'),
        },
        {
          title: 'Strategy', cardType: 'action',
          items: [
            { text: 'Convert to top of 22% bracket each year' },
            { text: 'Stay under IRMAA Tier 1 ($212k MAGI)' },
            { text: 'Pay taxes from taxable account if possible' },
          ],
        },
      ],
      quickLinks: [
        { text: 'How much should I convert this year?',    question: 'How much should I convert from IRA to Roth this year? Factor in my IRMAA headroom and bracket position.' },
        { text: 'Should I pay taxes from IRA or taxable?', question: 'Should I pay Roth conversion taxes from my IRA or taxable account? What\'s the math?' },
        { text: 'What is the survivor tax cliff?',         question: 'Explain the survivor tax cliff and why it makes Roth conversions more urgent for married couples.' },
      ],
    };

    case 'settings': return {
      cards: [
        {
          title: 'Key Assumptions', cardType: 'status',
          items: [
            { text: 'Monthly expenses: $' + (inp.monthlyExpenses || 0).toLocaleString() + '/mo — drives all projections', highlight: true, dot: true },
            { text: 'Inflation: 3.0% (conservative)', dot: true },
            { text: 'CAPE-based return estimates applied', dot: true },
          ],
        },
        {
          title: 'Sensitivity', cardType: 'default',
          items: [
            { text: 'Expenses have 3× the impact of return assumptions' },
            { text: 'Spending is your most controllable variable' },
            { text: 'Stress test with lower returns in the Stress Test tab' },
          ],
        },
      ],
      quickLinks: [
        { text: 'Which assumption matters most?', question: 'Which assumption in my plan has the largest impact on success rate? Rank them by sensitivity.' },
        { text: 'What if inflation is 4%?',        question: 'What happens to my plan if inflation runs at 4% instead of 3%? Show the success rate impact.' },
        { text: 'How sensitive am I to returns?',  question: 'How sensitive is my success rate to equity returns? What if returns are 1-2% lower than expected?' },
      ],
    };

    default: return {
      cards: [
        {
          title: 'RetireStrong', cardType: 'status',
          items: [
            { text: 'Navigate to a tab to see context-aware insights', dot: true },
            { text: 'Open Coach for personalized Q&A', dot: true },
          ],
        },
      ],
      quickLinks: [
        { text: 'How healthy is my plan?',   question: 'Give me a complete health check of my retirement plan. What are the top 3 things I should address?' },
        { text: 'What should I do this year?', question: 'What are the most important financial moves I should make this year for my retirement plan?' },
        { text: 'Ask me anything',             question: null },
      ],
    };
  }
}

// ── Main rail component ───────────────────────────────────────────────────────
export default function AIInsightsRail({ activeTab = 'dashboard', ctx, setActiveTab }) {
  function navigateCoach(question) {
    if (question) {
      try { sessionStorage.setItem('coachAutoMessage', question); } catch(e) {}
    }
    if (setActiveTab) setActiveTab('coach');
  }

  const { cards = [], quickLinks = [] } = buildRailContent(activeTab, ctx, navigateCoach);

  return (
    <div style={{
      width: 280,
      minWidth: 280,
      flexShrink: 0,
      background: '#F5F3EF',
      borderLeft: '1px solid #D4D1C5',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        padding: '16px 16px 12px',
        borderBottom: '1px solid #D4D1C5',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          color: '#222222', textTransform: 'uppercase',
        }}>
          AI INSIGHTS
        </span>
      </div>

      {/* Cards + quick links */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 12px 8px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {cards.map(function(card, i) {
          return (
            <InsightCard
              key={i}
              title={card.title}
              items={card.items}
              action={card.action}
              onAction={card.onAction}
              cardType={card.cardType}
            />
          );
        })}

        {quickLinks.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#5F6368',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
            }}>
              Quick questions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {quickLinks.map(function(lnk, i) {
                return (
                  <button
                    key={i}
                    onClick={function() { navigateCoach(lnk.question); }}
                    style={{
                      background: 'none', border: 'none', padding: '4px 0',
                      cursor: 'pointer', textAlign: 'left',
                      fontSize: 12, color: '#0A4D54', lineHeight: 1.4,
                    }}
                  >→ {lnk.text}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0, borderTop: '1px solid #D4D1C5',
        padding: '12px', background: '#FFFFFF',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <button
          onClick={function() { navigateCoach(null); }}
          style={{
            background: '#222222', color: '#FFFFFF',
            border: 'none', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', width: '100%', textAlign: 'center',
          }}
        >
          Open Coach for Q&amp;A →
        </button>
        <div style={{ fontSize: 10, color: '#5F6368', textAlign: 'center', lineHeight: 1.4 }}>
          This is education, not investment advice.
        </div>
      </div>
    </div>
  );
}
