import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronRight, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChatSession } from '../../hooks/useChatSession.js';

// Token values (matching tokens.css). Hardcoded to keep the rail self-contained.
const COLORS = {
  bg:           '#F5F3EF',
  border:       '#E8E4DC',
  cardBg:       '#FFFFFF',
  tealDark:     '#0A4D54',
  tealMid:      '#4A9E8E',
  tealLight:    '#E8F5F2',
  textPrimary:  '#1A1A1A',
  textSecondary:'#6B7280',
  textMuted:    '#9CA3AF',
  amber:        '#D97706',
  amberLight:   '#FEF3C7',
  working:      '#8A5515',
  workingBg:    '#FEF3C7',
};

// ── Tool-call disclosure row ────────────────────────────────────────────────
function ToolCallsRow({ toolCalls }) {
  const [open, setOpen] = useState(false);
  if (!toolCalls || toolCalls.length === 0) return null;
  const names = toolCalls.map((t) => t.name).join(' · ');
  return (
    <div style={{ marginTop: 6, fontSize: 11, color: COLORS.textMuted }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 11, color: COLORS.textMuted, fontFamily: 'inherit',
        }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span>&lt;tool&gt; {names}</span>
      </button>
      {open && (
        <div style={{ marginTop: 4, paddingLeft: 12 }}>
          {toolCalls.map((tc, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <div style={{ fontWeight: 600, color: COLORS.textSecondary }}>{tc.name}</div>
              <pre style={{
                fontSize: 10, color: COLORS.textMuted, margin: '2px 0', padding: 4,
                background: COLORS.bg, borderRadius: 3, overflow: 'auto', maxHeight: 100,
                fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{JSON.stringify(tc.result, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single chat message ─────────────────────────────────────────────────────
function ChatMessage({ msg, onChipClick }) {
  const isUser = msg.role === 'user';
  return (
    <div data-role={isUser ? 'user' : 'assistant'} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{ maxWidth: '95%' }}>
        <div style={{
          background: isUser ? COLORS.tealDark : COLORS.cardBg,
          color: isUser ? '#FFFFFF' : COLORS.textPrimary,
          border: isUser ? 'none' : '1px solid ' + COLORS.border,
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 13,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          textAlign: 'left',
        }}>{msg.content}</div>

        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <ToolCallsRow toolCalls={msg.toolCalls} />
        )}

        {!isUser && msg.chips && msg.chips.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {msg.chips.map((chip, i) => (
              <button
                key={i}
                onClick={() => onChipClick(chip)}
                style={{
                  fontSize: 11, padding: '4px 8px',
                  background: COLORS.tealLight, color: COLORS.tealDark,
                  border: '1px solid ' + COLORS.tealDark + '40',
                  borderRadius: 999, cursor: 'pointer', textAlign: 'left',
                  lineHeight: 1.3,
                }}
              >{chip}</button>
            ))}
          </div>
        )}

        {!isUser && !msg.isGreeting && (
          <div style={{
            marginTop: 6, fontSize: 10, fontStyle: 'italic',
            color: COLORS.textMuted, lineHeight: 1.4,
          }}>This is education, not investment advice.</div>
        )}
      </div>
    </div>
  );
}

// ── Loading dots ────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', fontSize: 13, color: COLORS.textSecondary }}>
      <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
      <span>Thinking…</span>
    </div>
  );
}

// ── Diff strip ──────────────────────────────────────────────────────────────
function DiffStrip({ workingScenario, onDiscard, onPin }) {
  if (!workingScenario) return null;
  return (
    <div style={{
      flexShrink: 0,
      padding: '7px 12px',
      background: COLORS.workingBg,
      borderBottom: '1px solid ' + COLORS.border,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: COLORS.working, flexShrink: 0, display: 'inline-block',
          animation: 'rsPulse 1.6s infinite',
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.working, flexShrink: 0 }}>Working</span>
        <span style={{
          fontSize: 11, color: COLORS.textSecondary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{workingScenario.description}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={onDiscard} style={{
          fontSize: 11, padding: '3px 8px',
          background: 'transparent', border: '1px solid ' + COLORS.border,
          borderRadius: 4, cursor: 'pointer', color: COLORS.textSecondary,
        }}>Discard</button>
        <button onClick={onPin} style={{
          fontSize: 11, padding: '3px 8px',
          background: COLORS.tealDark, border: 'none',
          borderRadius: 4, cursor: 'pointer', color: '#fff', fontWeight: 600,
        }}>Pin</button>
      </div>
    </div>
  );
}

// ── Pin modal ───────────────────────────────────────────────────────────────
function PinModal({ workingScenario, onConfirm, onCancel }) {
  const [name, setName] = useState(workingScenario?.description || 'My scenario');
  const [note, setNote] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(40,37,29,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div style={{
        background: COLORS.cardBg, borderRadius: 14, padding: 24,
        width: 420, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Pin this scenario</h3>
        <p style={{ margin: '0 0 18px', color: COLORS.textMuted, fontSize: 12 }}>
          Give it a name to keep it for comparison.
        </p>
        <label style={{ display: 'block', marginBottom: 14, fontSize: 12, color: COLORS.textMuted }}>
          <span style={{ display: 'block', marginBottom: 4 }}>Scenario name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            style={{
              width: '100%', padding: '7px 10px',
              border: '1px solid ' + COLORS.border, borderRadius: 6,
              fontSize: 13, fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 18, fontSize: 12, color: COLORS.textMuted }}>
          <span style={{ display: 'block', marginBottom: 4 }}>Note (optional)</span>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Why you're keeping this scenario..."
            rows={2}
            style={{
              width: '100%', padding: '7px 10px',
              border: '1px solid ' + COLORS.border, borderRadius: 6,
              fontSize: 12, fontFamily: 'inherit', outline: 'none',
              resize: 'none', boxSizing: 'border-box',
            }}
          />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{
            background: 'transparent', border: '1px solid ' + COLORS.border,
            borderRadius: 6, padding: '7px 14px', fontSize: 12, cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={() => onConfirm(name, note)}
            disabled={!name.trim()}
            style={{
              background: COLORS.tealDark, border: 'none',
              borderRadius: 6, padding: '7px 14px',
              fontSize: 12, fontWeight: 600, color: '#fff',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              opacity: name.trim() ? 1 : 0.5,
            }}
          >Pin scenario</button>
        </div>
      </div>
    </div>
  );
}

// ── InsightCard ─────────────────────────────────────────────────────────────
function InsightCard({ title, items, action, onAction, priority }) {
  return (
    <div style={{
      background: COLORS.cardBg,
      border: priority ? '2px solid ' + COLORS.tealDark : '1px solid ' + COLORS.border,
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
      {action && (
        <button onClick={onAction} style={{
          background: COLORS.tealDark, color: 'white', border: 'none',
          borderRadius: 7, padding: '8px 12px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left', marginTop: 2,
        }}>{action} →</button>
      )}
    </div>
  );
}

// ── Tab-specific starter chips ───────────────────────────────────────────────
const TAB_CHIPS = {
  dashboard: [
    'How healthy is my plan?',
    'What is my IRMAA headroom?',
    'Am I on track to retire?',
  ],
  buckets: [
    'How much cash should I hold?',
    'When should I refill Bucket 1?',
    'How does sequence risk affect me?',
  ],
  cashflow: [
    'When do income gaps start?',
    'What is my optimal Roth conversion?',
    'How does SS timing affect my cash flow?',
  ],
  monte: [
    'What stress tests matter most?',
    'What if I add guardrails?',
    'What levers improve my success rate?',
  ],
  incometax: [
    'What is my IRMAA headroom?',
    'How much should I convert to Roth?',
    'Explain the two-year IRMAA lookback',
  ],
  roth: [
    'How much should I convert this year?',
    'Should I pay conversion taxes from IRA or taxable?',
    'What is the survivor tax cliff?',
  ],
  settings: [
    'Which assumption matters most?',
    'What if inflation is 4%?',
    'How sensitive is my plan to spending?',
  ],
  spending: [
    'What if I spend $500 less/month?',
    "What's my safe withdrawal rate?",
    'Model smile-shaped spending',
  ],
};

// ── Data-driven rail content per tab ────────────────────────────────────────
function buildRailContent(activeTab, ctx, sendMessage) {
  const cf = ctx?.cashFlow || [];
  const inp = ctx?.inp || {};
  const fmt = ctx?.fmtC || (v => '$' + Math.round(v).toLocaleString());
  const successRate = ctx?.successRate || 0;
  const totalPort = ctx?.totalPort || 0;

  const srColor = successRate >= 85 ? '#3D6337' : successRate >= 70 ? '#D97706' : '#8B3528';
  const firstGap = cf.find(r => (r.gap || 0) > 0);
  const yr0 = cf[0] || {};

  switch (activeTab) {
    case 'dashboard': return [
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
          { text: 'Monthly expenses: ' + fmt(inp.monthlyExpenses || 0) },
          { text: yr0.rothConv ? 'Roth conversion: ' + fmt(yr0.rothConv) : 'No Roth conversion planned yet' },
          { text: 'IRMAA headroom available — check Income & Tax tab' },
        ],
        action: 'Ask about IRMAA headroom',
        onAction: () => sendMessage('What is my IRMAA headroom this year?'),
      },
    ];

    case 'buckets': return [
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
        onAction: () => sendMessage('How does my plan hold up in a bad sequence?'),
      },
    ];

    case 'cashflow': {
      const gapYears = cf.filter(r => (r.gap || 0) > 0);
      return [
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
          onAction: () => sendMessage('What is my optimal Roth conversion strategy?'),
        },
      ];
    }

    case 'monte': return [
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
        onAction: () => sendMessage('What if I add Guyton-Klinger guardrails to my spending?'),
      },
    ];

    case 'spending': return [
      {
        title: 'Spending Health', priority: true,
        items: [
          { text: 'Budget: ' + fmt(inp.monthlyExpenses || 0) + '/mo', highlight: true, dot: true },
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
        onAction: () => sendMessage('What if I reduce spending by $500/month?'),
      },
    ];

    case 'incometax': return [
      {
        title: 'Tax Efficiency', priority: true,
        items: [
          { text: 'IRMAA Tier 1 threshold: $212,000 MAGI', highlight: true, dot: true },
          { text: '22% bracket ceiling: ~$201,000 MFJ', dot: true },
          { text: 'Roth conversions count toward MAGI', dot: true, dotColor: '#D97706' },
        ],
        action: 'Calculate my headroom',
        onAction: () => sendMessage('What is my IRMAA headroom this year?'),
      },
      {
        title: "This Year's Priority",
        items: [
          { text: 'Convert up to IRMAA ceiling first' },
          { text: 'IRA draws + conversions = MAGI' },
          { text: 'Two-year lookback: 2026 income affects 2028 premiums' },
        ],
      },
    ];

    case 'roth': return [
      {
        title: 'Conversion Window', priority: true,
        items: [
          { text: 'Window closes when RMDs begin at 73', highlight: true, dot: true },
          { text: (73 - (inp.currentAge || 66)) + ' years remaining', dot: true, dotColor: '#D97706' },
          { text: 'Survivor tax cliff makes conversions urgent', dot: true },
        ],
        action: 'What should I convert?',
        onAction: () => sendMessage('How much should I convert to Roth this year?'),
      },
      {
        title: 'Strategy',
        items: [
          { text: 'Convert to top of 22% bracket each year' },
          { text: 'Stay under IRMAA Tier 1 ($212k MAGI)' },
          { text: 'Pay taxes from taxable account if possible' },
        ],
      },
    ];

    case 'settings': return [
      {
        title: 'Key Assumptions', priority: true,
        items: [
          { text: 'Monthly expenses: ' + fmt(inp.monthlyExpenses || 0) + ' — drives all projections', highlight: true, dot: true },
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
    ];

    default: return [
      {
        title: 'RetireStrong',
        items: [
          { text: 'Ask me anything about your plan below' },
          { text: 'I have full context and can run projections' },
        ],
      },
    ];
  }
}

// ── Main rail component ─────────────────────────────────────────────────────
// Props:
//   activeTab — current plan tab (string), sent to server for context
//   ctx       — tabCtx from App.jsx for data-driven insight cards
export default function AIInsightsRail({ activeTab = 'overview', ctx }) {
  const { user: authUser } = useAuth();

  const {
    messages, inputText, setInputText, isLoading,
    workingScenario, setWorkingScenario, tokenWarning,
    chatLogRef, sendMessage, clearSession,
  } = useChatSession({ activeTab, userId: authUser?.user_id });

  const textareaRef = useRef(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinToast, setPinToast]         = useState(false);

  const hasUserMessage = messages.some(m => m.role === 'user');

  // Auto-resize textarea (1-3 lines)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 84) + 'px';
  }, [inputText]);

  async function handleDiscard() {
    if (!authUser?.user_id) return;
    try {
      await fetch('/api/scenarios/working?user_id=' + authUser.user_id, { method: 'DELETE' });
    } catch (e) {
      console.error('Discard failed:', e);
    }
    setWorkingScenario(null);
  }

  async function handlePin(name, note) {
    if (!authUser?.user_id) return;
    try {
      await fetch('/api/scenarios/pin?user_id=' + authUser.user_id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, note }),
      });
    } catch (e) {
      console.error('Pin failed:', e);
    }
    setWorkingScenario(null);
    setShowPinModal(false);
    setPinToast(true);
    setTimeout(() => setPinToast(false), 2500);
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div style={{
      width: 300,
      minWidth: 300,
      flexShrink: 0,
      background: COLORS.bg,
      borderLeft: '1px solid ' + COLORS.border,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <style>{`@keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} }`}</style>

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '14px 16px',
        borderBottom: '2px solid rgba(10,77,84,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.tealDark }}>
          {hasUserMessage ? '✦ Ask RetireStrong' : '✦ Insights'}
        </span>
        <div title={isLoading ? 'Working…' : 'Ready'} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: isLoading ? COLORS.amber : COLORS.tealMid,
        }} />
      </div>

      {/* Working scenario strip */}
      <DiffStrip
        workingScenario={workingScenario}
        onDiscard={handleDiscard}
        onPin={() => setShowPinModal(true)}
      />

      {/* Static insights or chat log */}
      {!hasUserMessage ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {buildRailContent(activeTab, ctx, sendMessage).map((card, i) => (
            <InsightCard
              key={i}
              title={card.title}
              items={card.items}
              action={card.action}
              onAction={card.onAction}
              priority={card.priority}
            />
          ))}
          {(TAB_CHIPS[activeTab] || []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Quick questions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {(TAB_CHIPS[activeTab] || []).map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(chip)}
                    style={{
                      fontSize: 11.5, padding: '5px 9px',
                      background: COLORS.cardBg, color: COLORS.tealDark,
                      border: '1px solid ' + COLORS.tealDark + '50',
                      borderRadius: 999, cursor: 'pointer', textAlign: 'left',
                      lineHeight: 1.3,
                    }}
                  >{chip}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{
            padding: '10px 12px', background: '#F2F1EC', borderRadius: 8,
            fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5,
          }}>
            Ask me anything — I have full context and can run projections.
          </div>
        </div>
      ) : (
        <div ref={chatLogRef} style={{
          flex: 1, overflowY: 'auto', padding: '12px 14px',
        }}>
          {tokenWarning && (
            <div style={{
              background: COLORS.amberLight, border: '1px solid ' + COLORS.amber,
              borderRadius: 6, padding: 8, marginBottom: 10,
              fontSize: 11, color: '#78350F', lineHeight: 1.4,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Long conversation</div>
              <div>Start fresh for best results.</div>
              <button
                onClick={clearSession}
                style={{
                  marginTop: 6, fontSize: 11, padding: '3px 8px',
                  background: COLORS.tealDark, color: '#FFFFFF',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}
              >New chat</button>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatMessage key={i} msg={m} onChipClick={text => { sendMessage(text); }} />
          ))}

          {isLoading && <LoadingDots />}
        </div>
      )}

      {/* Composer */}
      <div style={{
        flexShrink: 0, borderTop: '1px solid ' + COLORS.border,
        padding: '10px 12px', background: COLORS.cardBg,
        display: 'flex', gap: 6, alignItems: 'flex-end',
      }}>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Working…' : 'Ask anything…'}
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1, fontSize: 13, fontFamily: 'inherit',
            border: '1px solid ' + COLORS.border, borderRadius: 6,
            padding: '6px 8px', resize: 'none', outline: 'none',
            background: isLoading ? COLORS.bg : COLORS.cardBg,
            color: COLORS.textPrimary,
            minHeight: 28, maxHeight: 84,
            lineHeight: 1.4, boxSizing: 'border-box',
          }}
        />
        <button
          onClick={() => { sendMessage(inputText); setInputText(''); }}
          disabled={isLoading || !inputText.trim()}
          style={{
            flexShrink: 0,
            background: (isLoading || !inputText.trim()) ? COLORS.border : COLORS.tealDark,
            color: '#FFFFFF', border: 'none', borderRadius: 6,
            padding: '8px 10px', cursor: (isLoading || !inputText.trim()) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Send"
        ><Send size={13} /></button>
      </div>

      {/* Pin modal */}
      {showPinModal && (
        <PinModal
          workingScenario={workingScenario}
          onConfirm={handlePin}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {/* Pin toast */}
      {pinToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: COLORS.tealDark, color: '#fff',
          padding: '10px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 300,
        }}>
          Scenario pinned ✓
        </div>
      )}
    </div>
  );
}
