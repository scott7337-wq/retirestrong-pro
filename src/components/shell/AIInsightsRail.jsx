import React from 'react';

// Token values matching tokens.css
const COLORS = {
  bg:            '#F5F3EF',
  border:        '#E8E4DC',
  cardBg:        '#FFFFFF',
  tealDark:      '#0A4D54',
  tealMid:       '#4A9E8E',
  tealLight:     '#E8F5F2',
  textPrimary:   '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  amber:         '#D97706',
};

// ── InsightCard ──────────────────────────────────────────────────────────────
function InsightCard({ title, items, action, onAction, priority }) {
  return (
    <div style={{
      background: COLORS.cardBg,
      border: '1px solid ' + COLORS.border,
      borderTop: priority ? '3px solid ' + COLORS.tealDark : '3px solid ' + COLORS.tealMid,
      borderRadius: 10,
      padding: '12px 14px',
      boxShadow: priority ? '0 2px 8px rgba(10,77,84,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: COLORS.tealDark,
      }}>{title}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{
            fontSize: 12.5,
            color: item.highlight ? COLORS.textPrimary : COLORS.textSecondary,
            fontWeight: item.highlight ? 600 : 400,
            lineHeight: 1.5,
            display: 'flex', gap: 6, alignItems: 'flex-start',
          }}>
            {item.dot && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: item.dotColor || COLORS.tealMid,
                flexShrink: 0, marginTop: 6,
              }} />
            )}
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
      {action && onAction && (
        <button onClick={onAction} style={{
          background: COLORS.tealDark, color: 'white', border: 'none',
          borderRadius: 7, padding: '8px 12px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left', marginTop: 2,
        }}>{action} →</button>
      )}
    </div>
  );
}

// ── Tab-specific content ─────────────────────────────────────────────────────
function buildRailContent(activeTab, ctx, navigateCoach) {
  const cf   = ctx?.cashFlow || [];
  const inp  = ctx?.inp || {};
  const fmt  = ctx?.fmtC || (v => '$' + Math.round(v).toLocaleString());
  const successRate = ctx?.successRate || 0;
  const totalPort   = ctx?.totalPort   || 0;
  const srColor = successRate >= 85 ? '#3D6337' : successRate >= 70 ? '#D97706' : '#8B3528';
  const firstGap = cf.find(r => (r.gap || 0) > 0);
  const yr0 = cf[0] || {};

  switch (activeTab) {
    case 'dashboard': return {
      cards: [
        {
          title: 'Plan Health', priority: true,
          items: [
            { text: successRate + '% success rate (500 MC runs)', highlight: true, dot: true, dotColor: srColor },
            { text: totalPort ? fmt(totalPort) + ' total portfolio' : 'Portfolio loaded', dot: true },
            firstGap
              ? { text: 'First income gap at age ' + firstGap.age, dot: true, dotColor: '#D97706' }
              : { text: 'No income gaps projected', dot: true, dotColor: '#3D6337' },
          ],
        },
        {
          title: 'This Year',
          items: [
            { text: 'Monthly expenses: $' + (inp.monthlyExpenses || 0).toLocaleString() + '/mo' },
            { text: yr0.rothConv ? 'Roth conversion: ' + fmt(yr0.rothConv) : 'No Roth conversion planned yet' },
            { text: 'IRMAA headroom available — check Income & Tax tab' },
          ],
          action: 'Ask about IRMAA headroom',
          onAction: () => navigateCoach('What is my IRMAA headroom this year?'),
        },
      ],
      quickLinks: [
        { text: 'What\'s my biggest risk right now?', question: 'What is the single biggest risk to my retirement plan right now?' },
        { text: 'Model a spending change', question: 'What happens if I reduce monthly spending by $500? Show the impact on success rate and portfolio longevity.' },
        { text: 'Run a stress test', question: 'Run a "bad first five years" stress test on my plan and show how the bucket strategy helps.' },
      ],
    };

    case 'buckets': return {
      cards: [
        {
          title: 'Bucket Status', priority: true,
          items: [
            { text: 'Bucket 1 (Cash): Review runway above', dot: true },
            { text: 'Bucket 2 (Bonds/TIPS): Intermediate buffer', dot: true },
            { text: 'Bucket 3 (Growth): Long-term engine', dot: true },
          ],
        },
        {
          title: 'Sequence Risk',
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
        { text: 'How much cash should I hold?', question: 'How much should I keep in Bucket 1 (cash) given my monthly expenses and risk tolerance?' },
        { text: 'When should I refill Bucket 1?', question: 'When and how should I refill Bucket 1? What triggers should I use?' },
        { text: 'Explain sequence-of-returns risk', question: 'Explain sequence-of-returns risk and how the bucket strategy protects me from it.' },
      ],
    };

    case 'cashflow': {
      const gapYears = cf.filter(r => (r.gap || 0) > 0);
      return {
        cards: [
          {
            title: 'Cash Flow', priority: true,
            items: [
              {
                text: firstGap
                  ? 'Income gap starts at age ' + firstGap.age + ' — ' + fmt(firstGap.gap || 0) + '/yr'
                  : 'No income gaps in projection',
                highlight: true, dot: true, dotColor: firstGap ? '#D97706' : '#3D6337',
              },
              { text: gapYears.length + ' gap years total', dot: true },
              { text: 'SS income starts at age ' + (inp.ssAge || 70), dot: true },
            ],
          },
          {
            title: 'Roth Opportunity',
            items: [
              { text: 'Convert in gap years before SS starts' },
              { text: 'Each conversion year reduces future RMDs' },
              { text: 'Survivor benefit makes conversions more valuable' },
            ],
            action: 'Optimize my conversions',
            onAction: () => navigateCoach('What is my optimal Roth conversion strategy given my cash flow projection?'),
          },
        ],
        quickLinks: [
          { text: 'When do income gaps start?', question: 'When do income gaps start in my plan and what is the best way to cover them?' },
          { text: 'Optimize SS timing', question: 'How does SS timing affect my annual cash flow? Show the difference between claiming at 67 vs 70.' },
          { text: 'Model early retirement', question: 'What happens to my cash flow if I retire 2 years earlier than planned?' },
        ],
      };
    }

    case 'monte': return {
      cards: [
        {
          title: 'Scenario Analysis', priority: true,
          items: [
            { text: 'Base case: ' + successRate + '% success', highlight: true, dot: true, dotColor: srColor },
            { text: 'Bad First Five Years is your key stress test', dot: true },
            { text: 'Guardrails can add 10–15% success rate', dot: true },
          ],
        },
        {
          title: 'Key Levers',
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
        { text: 'What stress tests matter most?', question: 'Which stress test scenarios matter most for my specific plan? Rank them by impact.' },
        { text: 'What levers improve success rate?', question: 'What are the top 3 changes I can make to meaningfully improve my Monte Carlo success rate?' },
        { text: 'Model a 2008-style crash', question: 'What happens to my plan if the market drops 40% in year 1 of retirement? Show the outcome with and without the bucket strategy.' },
      ],
    };

    case 'spending': return {
      cards: [
        {
          title: 'Spending Health', priority: true,
          items: [
            { text: 'Budget: $' + (inp.monthlyExpenses || 0).toLocaleString() + '/mo', highlight: true, dot: true },
            { text: 'Essential expenses should match guaranteed income' },
            { text: 'Discretionary is your main adjustment lever' },
          ],
        },
        {
          title: 'What-If',
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
        { text: 'Model smile-shaped spending', question: 'What is smile-shaped spending and how would it apply to my plan? Compare it to flat real spending.' },
        { text: 'Which expenses are essential?', question: 'Help me categorize my expenses into essential vs discretionary and identify the best places to cut if needed.' },
      ],
    };

    case 'incometax': return {
      cards: [
        {
          title: 'Tax Efficiency', priority: true,
          items: [
            { text: 'IRMAA Tier 1 threshold: $212,000 MAGI', highlight: true, dot: true },
            { text: '22% bracket ceiling: ~$201,000 MFJ', dot: true },
            { text: 'Roth conversions count toward MAGI', dot: true, dotColor: '#D97706' },
          ],
          action: 'Calculate my headroom',
          onAction: () => navigateCoach('What is my exact IRMAA headroom this year? How much can I convert without triggering a surcharge?'),
        },
        {
          title: "This Year's Priority",
          items: [
            { text: 'Convert up to IRMAA ceiling first' },
            { text: 'IRA draws + conversions = MAGI' },
            { text: 'Two-year lookback: 2026 income affects 2028 premiums' },
          ],
        },
      ],
      quickLinks: [
        { text: 'What is my IRMAA headroom?', question: 'What is my IRMAA headroom this year? Give me the exact dollar amount I can convert or withdraw without hitting the next tier.' },
        { text: 'Explain IRMAA two-year lookback', question: 'Explain how the Medicare IRMAA two-year lookback works and how to use it in planning Roth conversions.' },
        { text: 'How much should I convert?', question: 'How much should I convert to Roth this year to stay under IRMAA Tier 1 and fill the 22% bracket?' },
      ],
    };

    case 'roth': return {
      cards: [
        {
          title: 'Conversion Window', priority: true,
          items: [
            { text: 'Window closes when RMDs begin', highlight: true, dot: true },
            { text: 'Survivor tax cliff makes conversions urgent', dot: true },
            { text: 'Each year of delay = higher future RMD burden', dot: true },
          ],
          action: 'Plan my conversions',
          onAction: () => navigateCoach('How much should I convert to Roth each year before RMDs begin? Give me a year-by-year plan.'),
        },
        {
          title: 'Strategy',
          items: [
            { text: 'Convert to top of 22% bracket each year' },
            { text: 'Stay under IRMAA Tier 1 ($212k MAGI)' },
            { text: 'Pay taxes from taxable account if possible' },
          ],
        },
      ],
      quickLinks: [
        { text: 'How much should I convert this year?', question: 'How much should I convert from IRA to Roth this year? Factor in my IRMAA headroom and bracket position.' },
        { text: 'Should I pay taxes from IRA or taxable?', question: 'Should I pay Roth conversion taxes from my IRA or taxable account? What\'s the math?' },
        { text: 'What is the survivor tax cliff?', question: 'Explain the survivor tax cliff and why it makes Roth conversions more urgent for married couples.' },
      ],
    };

    case 'settings': return {
      cards: [
        {
          title: 'Key Assumptions', priority: true,
          items: [
            { text: 'Monthly expenses: $' + (inp.monthlyExpenses || 0).toLocaleString() + '/mo — drives all projections', highlight: true, dot: true },
            { text: 'Inflation: 3.0% (conservative)', dot: true },
            { text: 'CAPE-based return estimates applied', dot: true },
          ],
        },
        {
          title: 'Sensitivity',
          items: [
            { text: 'Expenses have 3× the impact of return assumptions' },
            { text: 'Spending is your most controllable variable' },
            { text: 'Stress test with lower returns in the Stress Test tab' },
          ],
        },
      ],
      quickLinks: [
        { text: 'Which assumption matters most?', question: 'Which assumption in my plan has the largest impact on success rate? Rank them by sensitivity.' },
        { text: 'What if inflation is 4%?', question: 'What happens to my plan if inflation runs at 4% instead of 3%? Show the success rate impact.' },
        { text: 'How sensitive am I to returns?', question: 'How sensitive is my success rate to equity returns? What if returns are 1-2% lower than expected?' },
      ],
    };

    default: return {
      cards: [
        {
          title: 'RetireStrong', priority: true,
          items: [
            { text: 'Navigate to a tab to see context-aware insights', dot: true },
            { text: 'Open Coach for personalized Q&A', dot: true },
          ],
        },
      ],
      quickLinks: [
        { text: 'How healthy is my plan?', question: 'Give me a complete health check of my retirement plan. What are the top 3 things I should address?' },
        { text: 'What should I do this year?', question: 'What are the most important financial moves I should make this year for my retirement plan?' },
        { text: 'Ask me anything', question: null },
      ],
    };
  }
}

// ── Main rail component ──────────────────────────────────────────────────────
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
      background: COLORS.bg,
      borderLeft: '1px solid ' + COLORS.border,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        padding: '14px 16px',
        borderBottom: '2px solid rgba(10,77,84,0.15)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.tealDark }}>
          ✦ Insights
        </span>
      </div>

      {/* Cards + quick links */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.map(function(card, i) {
          return (
            <InsightCard
              key={i}
              title={card.title}
              items={card.items}
              action={card.action}
              onAction={card.onAction}
              priority={card.priority}
            />
          );
        })}

        {quickLinks.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Quick questions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {quickLinks.map(function(lnk, i) {
                return (
                  <button
                    key={i}
                    onClick={function() { navigateCoach(lnk.question); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 12,
                      color: COLORS.tealDark,
                      lineHeight: 1.4,
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
        flexShrink: 0,
        borderTop: '1px solid ' + COLORS.border,
        padding: '12px',
        background: COLORS.cardBg,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <button
          onClick={function() { navigateCoach(null); }}
          style={{
            background: COLORS.tealDark,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
          }}
        >
          Open Coach for Q&amp;A →
        </button>
        <div style={{ fontSize: 10, color: COLORS.textMuted, textAlign: 'center', lineHeight: 1.4 }}>
          This is education, not investment advice.
        </div>
      </div>
    </div>
  );
}
