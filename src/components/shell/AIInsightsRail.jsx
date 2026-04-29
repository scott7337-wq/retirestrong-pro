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

// ── Tab-specific static insights (shown before first user message) ──────────
const TAB_INSIGHTS = {
  dashboard: {
    title: 'Plan Status',
    bullets: [
      'Check your success rate and years funded above.',
      'IRMAA headroom and bracket room update monthly.',
      'Ask me anything about your plan below.',
    ],
    action: null,
  },
  buckets: {
    title: 'Portfolio Health',
    bullets: [
      'Bucket 1 should cover 2–3 years of spending.',
      'Rebalance signals appear when allocations drift >5%.',
      'Dividend and TIPS holdings reduce sequence risk.',
    ],
    action: null,
  },
  cashflow: {
    title: 'Cash Flow',
    bullets: [
      'The gap years before SS are your sequence risk window.',
      'Roth conversions in these years reduce future RMDs.',
      'Click any year in the table to see source-of-funds detail.',
    ],
    action: null,
  },
  monte: {
    title: 'Stress Testing',
    bullets: [
      'Bad First Five Years is your most relevant stress test.',
      'A 15% spending cut in a downturn often saves the plan.',
      'Guardrails strategies automate this adjustment.',
    ],
    action: null,
  },
  spending: {
    title: 'Spending',
    bullets: [
      'Essential expenses should be covered by guaranteed income.',
      'Discretionary spending is your primary adjustment lever.',
      'YTD actual vs budget trend shows if you\'re on track.',
    ],
    action: null,
  },
  incometax: {
    title: 'Tax Efficiency',
    bullets: [
      'IRMAA headroom is your most actionable number right now.',
      'Convert to the top of your bracket before RMDs begin.',
      'IRA draws count toward MAGI — sequence matters.',
    ],
    action: { label: 'Ask about conversions', text: 'How much should I convert this year?' },
  },
  roth: {
    title: 'Roth Window',
    bullets: [
      'Your conversion window closes when RMDs begin at 73.',
      'The survivor tax cliff makes conversions more valuable now.',
      'IRMAA Tier 1 at $212k MAGI is your binding constraint.',
    ],
    action: { label: 'Calculate my optimal conversion', text: 'What is my optimal Roth conversion this year?' },
  },
  settings: {
    title: 'Assumptions',
    bullets: [
      'Monthly expenses drive every projection — get this right.',
      'Return assumptions use CAPE-based estimates.',
      'Inflation at 3% is conservative — adjust if needed.',
    ],
    action: null,
  },
};

// ── Main rail component ─────────────────────────────────────────────────────
// Props:
//   activeTab — current plan tab (string), sent to server for context
export default function AIInsightsRail({ activeTab = 'overview' }) {
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {(() => {
            const insight = TAB_INSIGHTS[activeTab] || TAB_INSIGHTS.dashboard;
            return (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: COLORS.textMuted, marginBottom: 10,
                }}>{insight.title}</div>
                <ul style={{
                  listStyle: 'none', padding: 0, margin: '0 0 16px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {insight.bullets.map((b, i) => (
                    <li key={i} style={{
                      fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5,
                      paddingLeft: 12, borderLeft: '2px solid ' + COLORS.border,
                    }}>{b}</li>
                  ))}
                </ul>
                {insight.action && (
                  <button
                    onClick={() => sendMessage(insight.action.text)}
                    style={{
                      width: '100%', background: COLORS.tealDark, color: 'white',
                      border: 'none', borderRadius: 8, padding: '9px 14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                    }}
                  >{insight.action.label} →</button>
                )}
                <div style={{
                  marginTop: 16, padding: '10px 12px',
                  background: '#F2F1EC', borderRadius: 8,
                  fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5,
                }}>
                  Ask me anything about your plan — I have full context and can run projections.
                </div>
              </>
            );
          })()}
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
