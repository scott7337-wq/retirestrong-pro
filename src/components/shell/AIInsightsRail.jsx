import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ChevronDown, ChevronRight, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

// Token tokens (matching tokens.css). Hardcoded to keep the rail self-contained
// and to match the existing app palette without inline CSS-var fallbacks.
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
  red:          '#DC2626',
};

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';

// Initial greeting — static, no API call. Brief Step 3 (3).
const INITIAL_GREETING = {
  role: 'assistant',
  content: 'Your plan is loaded. What do you want to think through today?',
  chips: [
    "How's my plan looking?",
    'Roth conversion this year?',
    'What if I retire later?',
  ],
  toolCalls: [],
  isInitial: true,
};

const TOKEN_WARN_THRESHOLD = 20000;

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
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
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

        {!isUser && !msg.isInitial && (
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

// ── Main rail component ─────────────────────────────────────────────────────
// Props: activeTab is consumed; other props are accepted for backward
// compatibility with App.jsx but unused (the static-cards model is gone).
export default function AIInsightsRail(props) {
  const activeTab = props.activeTab || 'overview';
  const authCtx = useAuth();
  const userId = authCtx?.user?.user_id || null;

  const [messages, setMessages]       = useState([INITIAL_GREETING]);
  const [inputText, setInputText]     = useState('');
  const [sessionId, setSessionId]     = useState(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [tokenWarning, setTokenWarning] = useState(false);

  const scrollRef    = useRef(null);
  const textareaRef  = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea (1-3 lines)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 84) + 'px'; // ~3 lines
  }, [inputText]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || isLoading) return;
    if (!userId) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'You need to be logged in to chat. Please sign in.',
        chips: [], toolCalls: [],
      }]);
      return;
    }

    // Build the conversation history for the API (drop chips/toolCalls/isInitial,
    // strip any stray initial greeting from the wire payload — Anthropic just
    // wants {role, content}).
    const historyForApi = [...messages, { role: 'user', content: trimmed }]
      .filter((m) => !m.isInitial)
      .map((m) => ({ role: m.role, content: m.content }));

    // Optimistically add user message, set loading
    setMessages((prev) => [...prev, {
      role: 'user', content: trimmed, chips: [], toolCalls: [],
    }]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch(API_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:  historyForApi,
          sessionId,
          activeTab,
          user_id:   userId,  // required by /api middleware
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || ('HTTP ' + res.status));
      }

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.reply || '(empty response)',
        chips: data.chips || [],
        toolCalls: data.toolCallsMade || [],
      }]);

      if (data.sessionId) setSessionId(data.sessionId);
      if (typeof data.tokensUsed === 'number' && data.tokensUsed > TOKEN_WARN_THRESHOLD) {
        setTokenWarning(true);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry — something went wrong. ' + (err.message || ''),
        chips: [], toolCalls: [],
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId, activeTab, userId, isLoading]);

  const startNewChat = useCallback(() => {
    setMessages([INITIAL_GREETING]);
    setSessionId(null);
    setTokenWarning(false);
    setInputText('');
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  return (
    <div style={{
      width: 240, minWidth: 240, flexShrink: 0,
      background: COLORS.bg, borderLeft: '1px solid ' + COLORS.border,
      height: '100vh', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`@keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} }`}</style>

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '14px 16px',
        borderBottom: '2px solid rgba(10,77,84,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.tealDark }}>✦ Ask RetireStrong</span>
        </div>
        <div title={isLoading ? 'Working…' : 'Ready'} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: isLoading ? COLORS.amber : COLORS.tealMid,
        }} />
      </div>

      {/* Chat log */}
      <div ref={scrollRef} style={{
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
              onClick={startNewChat}
              style={{
                marginTop: 6, fontSize: 11, padding: '3px 8px',
                background: COLORS.tealDark, color: '#FFFFFF',
                border: 'none', borderRadius: 4, cursor: 'pointer',
              }}
            >New chat</button>
          </div>
        )}

        {messages.map((m, i) => (
          <ChatMessage key={i} msg={m} onChipClick={sendMessage} />
        ))}

        {isLoading && <LoadingDots />}
      </div>

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
          onClick={() => sendMessage(inputText)}
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
    </div>
  );
}
