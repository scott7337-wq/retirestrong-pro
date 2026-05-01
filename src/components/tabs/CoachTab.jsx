import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronDown, ChevronRight, Loader } from 'lucide-react';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function renderMarkdown(text) {
  if (!text) return '';
  // Strip tool call citations before rendering
  var html = text
    .replace(/\(`[^`]+`\)/g, '')
    .replace(/\(per `[^`]+`\)/g, '')
    .replace(/\(from `[^`]+`\)/g, '')
    .replace(/\(via `[^`]+`\)/g, '')
    .replace(/`[a-z_]+`\s*\)/g, ')')
    .replace(/\s+\(\s*\)/g, '')
    // Bold: **text** → <strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Tables: detect header separator rows (e.g. |---|---| )
    .replace(/^\|[-| :]+\|$/gm, '')
    // Table rows: | cell | cell | → <tr><td>...</td></tr>
    .replace(/^\|(.+)\|$/gm, function(match) {
      var cells = match.split('|').filter(function(c) { return c.trim() !== ''; });
      return '<tr>' + cells.map(function(c) {
        return '<td style="padding:4px 8px;border:1px solid #E8E4DC;text-align:left">' + c.trim() + '</td>';
      }).join('') + '</tr>';
    })
    // Wrap consecutive <tr> in <table>
    .replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, function(m) {
      return '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0">' + m + '</table>';
    })
    // Bullet: "- text"
    .replace(/^- (.*)/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span>•</span><span>$1</span></div>')
    // Double newline → paragraph break
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    // Single newline → <br>
    .replace(/\n/g, '<br/>');
  return html;
}

function successRateColor(rate) {
  if (rate >= 85) return 'var(--rs-green, #3D6337)';
  if (rate >= 70) return 'var(--rs-amber, #D97706)';
  return 'var(--rs-red, #8B3528)';
}
function successRateBg(rate) {
  if (rate >= 85) return '#E6F1DD';
  if (rate >= 70) return '#FEF3C7';
  return '#F8E4D8';
}
import { useAuth } from '../../context/AuthContext.jsx';
import { useChatSession } from '../../hooks/useChatSession.js';

const COLORS = {
  bg:           '#F5F3EF',
  border:       '#D4D1C5',
  cardBg:       '#FCFBF8',
  tealDark:     '#0A4D54',
  tealMid:      '#4A9E8E',
  tealLight:    '#E8F5F2',
  textPrimary:  '#1A1A1A',
  textSecondary:'#374151',
  textMuted:    '#9CA3AF',
  amber:        '#D97706',
  amberLight:   '#FEF3C7',
  working:      '#8A5515',
  workingBg:    '#FEF3C7',
  green:        '#3D6337',
};

const CARD        = { background: '#FCFBF8', border: '1px solid #D4D1C5', borderTop: '3px solid #0A4D54', borderRadius: '8px', padding: '20px', marginBottom: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const CARD_OK     = Object.assign({}, CARD, { borderTop: '3px solid #3D6337' });
const CARD_WARN   = Object.assign({}, CARD, { borderTop: '3px solid #8A5515' });
const CARD_DANGER = Object.assign({}, CARD, { borderTop: '3px solid #8B3528' });

// ── Tool disclosure row ─────────────────────────────────────────────────────
function ToolCallsRow({ toolCalls }) {
  const [open, setOpen] = useState(false);
  if (!toolCalls || toolCalls.length === 0) return null;
  const names = toolCalls.map(t => t.name).join(' · ');
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
                background: COLORS.bg, borderRadius: 3, overflow: 'auto', maxHeight: 120,
                fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{JSON.stringify(tc.result, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chat message ────────────────────────────────────────────────────────────
function ChatMessage({ msg, onChipClick }) {
  const isUser = msg.role === 'user';
  return (
    <div data-role={isUser ? 'user' : 'assistant'} style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 14,
    }}>
      <div style={{ maxWidth: '80%' }}>
        <div style={{
          background: isUser ? COLORS.tealDark : COLORS.cardBg,
          color: isUser ? '#fff' : COLORS.textPrimary,
          border: isUser ? 'none' : '1px solid ' + COLORS.border,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          wordBreak: 'break-word',
        }}
        {...(!isUser ? { dangerouslySetInnerHTML: { __html: renderMarkdown(msg.content) } } : {})}
        >{isUser ? msg.content : null}</div>

        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <ToolCallsRow toolCalls={msg.toolCalls} />
        )}

        {!isUser && msg.chips && msg.chips.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {msg.chips.map((chip, i) => (
              <button
                key={i}
                onClick={() => onChipClick(chip)}
                style={{
                  fontSize: 12, padding: '5px 12px',
                  background: COLORS.tealLight, color: COLORS.tealDark,
                  border: '1px solid ' + COLORS.tealDark + '40',
                  borderRadius: 999, cursor: 'pointer', lineHeight: 1.3,
                }}
              >{chip}</button>
            ))}
          </div>
        )}

        {!isUser && !msg.isGreeting && (
          <div style={{
            marginTop: 6, fontSize: 11, fontStyle: 'italic',
            color: COLORS.textMuted,
          }}>This is education, not investment advice.</div>
        )}
      </div>
    </div>
  );
}

// ── Working scenario strip ──────────────────────────────────────────────────
function WorkingStrip({ workingScenario, onDiscard, onPin }) {
  if (!workingScenario) return null;
  return (
    <div style={{
      padding: '8px 20px',
      background: COLORS.workingBg,
      borderBottom: '1px solid ' + COLORS.border,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: COLORS.working, display: 'inline-block',
          animation: 'rsPulse 1.6s infinite',
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.working }}>Working scenario</span>
        <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{workingScenario.description}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onDiscard} style={{
          fontSize: 12, padding: '4px 10px',
          background: 'transparent', border: '1px solid ' + COLORS.border,
          borderRadius: 4, cursor: 'pointer', color: COLORS.textMuted,
        }}>Discard</button>
        <button onClick={onPin} style={{
          fontSize: 12, padding: '4px 10px',
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
        width: 440, maxWidth: '90vw',
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

// ── Scenario tab bar ────────────────────────────────────────────────────────
function ScenarioTabBar({ activeScenarioId, onSelect, workingScenario, namedScenarios }) {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      padding: '12px 16px',
      borderBottom: '1px solid ' + COLORS.border,
      flexWrap: 'wrap',
      flexShrink: 0,
      background: COLORS.cardBg,
    }}>
      {/* Base plan */}
      <button
        onClick={() => onSelect('base')}
        style={{
          background: activeScenarioId === 'base' ? '#E6F0F1' : COLORS.cardBg,
          border: '1px solid',
          borderColor: activeScenarioId === 'base' ? COLORS.tealDark : COLORS.border,
          borderRadius: 6,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: activeScenarioId === 'base' ? 600 : 400,
          color: activeScenarioId === 'base' ? COLORS.tealDark : COLORS.textMuted,
          cursor: 'pointer',
        }}
      >Base plan</button>

      {/* Working scenario */}
      {workingScenario && (
        <button
          onClick={() => onSelect('working')}
          style={{
            background: activeScenarioId === 'working' ? COLORS.workingBg : COLORS.cardBg,
            border: '1px dashed',
            borderColor: COLORS.working,
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.working,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: COLORS.working, display: 'inline-block',
          }} />
          {workingScenario.description}
        </button>
      )}

      {/* Named scenarios */}
      {namedScenarios.map(s => (
        <button
          key={s.scenario_id}
          onClick={() => onSelect(s.scenario_id)}
          style={{
            background: activeScenarioId === s.scenario_id ? '#E6F0F1' : COLORS.cardBg,
            border: '1px solid',
            borderColor: activeScenarioId === s.scenario_id ? COLORS.tealDark : COLORS.border,
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: activeScenarioId === s.scenario_id ? 600 : 400,
            color: activeScenarioId === s.scenario_id ? COLORS.tealDark : COLORS.textMuted,
            cursor: 'pointer',
          }}
        >{s.name}</button>
      ))}

      {/* Compare button */}
      {namedScenarios.length >= 1 && (
        <button style={{
          background: 'transparent',
          border: '1px dashed ' + COLORS.border,
          borderRadius: 6,
          padding: '6px 14px',
          fontSize: 12,
          color: COLORS.textMuted,
          cursor: 'pointer',
          marginLeft: 'auto',
        }}>Compare →</button>
      )}
    </div>
  );
}

// ── Context panel (right pane) ──────────────────────────────────────────────
function ContextPanel({ ctx, activeScenarioId, workingScenario, namedScenarios, onSelectScenario }) {
  if (!ctx) return null;
  const { successRate, totalPort, inp, fmtC, cashFlow } = ctx;

  const retireYear = inp?.retireYear || null;
  const currentYear = new Date().getFullYear();
  const yearsToRetire = retireYear ? Math.max(0, retireYear - currentYear) : null;
  const monthlySpend = inp?.desiredSpending ? Math.round(inp.desiredSpending / 12) : null;

  const scoreColor = successRate >= 80 ? COLORS.green
    : successRate >= 60 ? COLORS.amber
    : '#8B3528';

  const chartData = cashFlow
    ? cashFlow.map(r => ({
        age: r.age,
        total: Math.round((r.balance || 0) / 1000),
        ira:   Math.round((r.iraBalance || 0) / 1000),
        roth:  Math.round((r.rothBalance || 0) / 1000),
      }))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Scenario tabs */}
      <ScenarioTabBar
        activeScenarioId={activeScenarioId}
        onSelect={onSelectScenario}
        workingScenario={workingScenario}
        namedScenarios={namedScenarios}
      />

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Plan at a glance
        </div>

        {/* Success rate */}
        <div style={Object.assign({}, CARD, { borderTop: '3px solid ' + scoreColor, padding: '16px 18px' })}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>Monte Carlo success rate</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {successRate != null ? successRate + '%' : '—'}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
            {successRate >= 80 ? 'Plan is on track' : successRate >= 60 ? 'Some adjustments may help' : 'Plan needs attention'}
          </div>
        </div>

        {/* Key numbers */}
        <div style={Object.assign({}, CARD, { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 })}>
          {totalPort != null && (
            <KeyRow label="Portfolio" value={fmtC ? fmtC(totalPort) : '$' + Math.round(totalPort / 1000) + 'k'} />
          )}
          {monthlySpend != null && (
            <KeyRow label="Monthly spending" value={fmtC ? fmtC(monthlySpend) : '$' + monthlySpend.toLocaleString()} />
          )}
          {retireYear && (
            <KeyRow label="Target retirement" value={retireYear + (yearsToRetire > 0 ? ' (' + yearsToRetire + ' yrs)' : ' (this year)')} />
          )}
          {inp?.ssAge && (
            <KeyRow label="SS claim age" value={inp.ssAge} />
          )}
        </div>

        {/* Portfolio trajectory chart */}
        {chartData.length > 0 && (
          <div style={Object.assign({}, CARD, { padding: '16px' })}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: 12,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary }}>
                  Portfolio Trajectory
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  Total · IRA · Roth · real $
                </div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: successRateColor(successRate),
                background: successRateBg(successRate),
                padding: '3px 8px', borderRadius: 20,
              }}>{successRate}% success</div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
              >
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false} axisLine={false} interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => '$' + v + 'k'} width={44}
                />
                <Tooltip
                  formatter={(v, name) => ['$' + v + 'k', name === 'total' ? 'Total' : name === 'ira' ? 'IRA' : 'Roth']}
                  labelFormatter={l => 'Age ' + l}
                  contentStyle={{
                    fontSize: 11, border: '1px solid ' + COLORS.border,
                    borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                />
                <Area type="monotone" dataKey="total"
                  stroke="#8A5515" fill="#8A5515" fillOpacity={1}
                  strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                <Area type="monotone" dataKey="ira"
                  stroke="#3D6337" fill="#3D6337" fillOpacity={1}
                  strokeWidth={2} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
                <Area type="monotone" dataKey="roth"
                  stroke="#4A9E8E" fill="#4A9E8E" fillOpacity={1}
                  strokeWidth={2} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{
              display: 'flex', gap: 14, marginTop: 8,
              paddingTop: 8, borderTop: '1px solid ' + COLORS.border,
            }}>
              {[
                { color: '#8A5515', label: 'Taxable', dash: false },
                { color: '#3D6337', label: 'IRA',     dash: false },
                { color: '#4A9E8E', label: 'Roth',    dash: false },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="16" height="4">
                    <line x1="0" y1="2" x2="16" y2="2"
                      stroke={l.color} strokeWidth={l.dash ? 1.5 : 2.5}
                      strokeDasharray={l.dash ? '4 2' : 'none'} />
                  </svg>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KeyRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: COLORS.textMuted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{value}</span>
    </div>
  );
}

// ── Main CoachTab ───────────────────────────────────────────────────────────
export default function CoachTab({ ctx }) {
  const { user: authUser } = useAuth();

  const {
    messages, inputText, setInputText, isLoading,
    workingScenario, setWorkingScenario, tokenWarning,
    chatLogRef, sendMessage, clearSession,
  } = useChatSession({ activeTab: 'coach', userId: authUser?.user_id });

  const textareaRef = useRef(null);
  const [showPinModal, setShowPinModal]     = useState(false);
  const [pinToast, setPinToast]             = useState(false);
  const [namedScenarios, setNamedScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState('base');

  const refreshScenarios = useCallback(async () => {
    if (!authUser?.user_id) return;
    try {
      const res = await fetch('/api/scenarios?user_id=' + authUser.user_id);
      const data = await res.json();
      if (data.scenarios) {
        setNamedScenarios(data.scenarios.filter(s => !s.is_working));
      }
    } catch (e) {}
  }, [authUser?.user_id]);

  // Load named scenarios on mount and when workingScenario changes
  useEffect(() => {
    refreshScenarios();
  }, [authUser?.user_id, refreshScenarios]);

  // Auto-send message pre-populated from another tab (e.g. Spending What-If cards)
  useEffect(() => {
    const msg = sessionStorage.getItem('coachAutoMessage');
    if (msg) {
      sessionStorage.removeItem('coachAutoMessage');
      setTimeout(() => sendMessage(msg), 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
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
    console.log('[handlePin] starting — user_id:', authUser.user_id, 'name:', name, 'working:', workingScenario?.scenario_id);
    try {
      const res = await fetch('/api/scenarios/pin?user_id=' + authUser.user_id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, note }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[handlePin] response status:', res.status, 'body:', data);
    } catch (e) {
      console.error('Pin failed:', e);
    }
    setWorkingScenario(null);
    setShowPinModal(false);
    await refreshScenarios();
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
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
      background: COLORS.bg,
    }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* ── Left pane: chat ── */}
      <div style={{
        flex: '0 0 60%',
        maxWidth: '60%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid ' + COLORS.border,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0,
          padding: '18px 24px',
          background: COLORS.cardBg,
          borderBottom: '1px solid ' + COLORS.border,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.tealDark }}>
              ✦ RetireStrong Coach
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              Deep-dive planning session
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tokenWarning && (
              <button onClick={clearSession} style={{
                fontSize: 12, padding: '5px 12px',
                background: COLORS.amberLight, color: '#78350F',
                border: '1px solid ' + COLORS.amber,
                borderRadius: 6, cursor: 'pointer',
              }}>New chat</button>
            )}
            <div title={isLoading ? 'Working…' : 'Ready'} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isLoading ? COLORS.amber : COLORS.tealMid,
            }} />
          </div>
        </div>

        {/* Working scenario strip */}
        <WorkingStrip
          workingScenario={workingScenario}
          onDiscard={handleDiscard}
          onPin={() => setShowPinModal(true)}
        />

        {/* Messages */}
        <div ref={chatLogRef} style={{
          flex: 1, overflowY: 'auto', padding: '20px 24px',
        }}>
          {messages.map((m, i) => (
            <ChatMessage key={i} msg={m} onChipClick={text => { sendMessage(text); }} />
          ))}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontSize: 13 }}>
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Thinking…</span>
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{
          flexShrink: 0,
          padding: '16px 24px',
          background: COLORS.cardBg,
          borderTop: '1px solid ' + COLORS.border,
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Working…' : 'Ask anything about your plan…'}
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1, fontSize: 14, fontFamily: 'inherit',
              border: '1px solid ' + COLORS.border, borderRadius: 8,
              padding: '10px 12px', resize: 'none', outline: 'none',
              background: isLoading ? COLORS.bg : COLORS.cardBg,
              color: COLORS.textPrimary,
              minHeight: 40, maxHeight: 120,
              lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => { sendMessage(inputText); setInputText(''); }}
            disabled={isLoading || !inputText.trim()}
            style={{
              flexShrink: 0,
              background: (isLoading || !inputText.trim()) ? COLORS.border : COLORS.tealDark,
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 14px', cursor: (isLoading || !inputText.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Send"
          ><Send size={15} /></button>
        </div>
      </div>

      {/* ── Right pane: plan context ── */}
      <div style={{
        flex: '0 0 40%',
        maxWidth: '40%',
        background: COLORS.bg,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <ContextPanel
          ctx={ctx}
          activeScenarioId={activeScenarioId}
          workingScenario={workingScenario}
          namedScenarios={namedScenarios}
          onSelectScenario={setActiveScenarioId}
        />
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
