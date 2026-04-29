import { useState, useRef, useCallback } from 'react';

export function useChatSession({ activeTab, userId }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Your plan is loaded. What do you want to think through today?',
    chips: [
      "How's my plan looking?",
      'Roth conversion this year?',
      'What if I retire later?'
    ],
    isGreeting: true
  }]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [workingScenario, setWorkingScenario] = useState(null);
  const [tokenWarning, setTokenWarning] = useState(false);
  const chatLogRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (!chatLogRef.current) return;
    const aiMessages = chatLogRef.current.querySelectorAll(
      '[data-role="assistant"]'
    );
    if (aiMessages.length > 0) {
      aiMessages[aiMessages.length - 1].scrollIntoView({
        behavior: 'smooth', block: 'start'
      });
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Build message history for API (exclude greeting)
    const apiMessages = newMessages
      .filter(m => !m.isGreeting)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId,
          activeTab,
          user_id: userId
        })
      });

      const data = await res.json();

      if (data.budgetExceeded) {
        setTokenWarning(true);
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.reply || '',
        chips: data.chips || [],
        toolCalls: data.toolCallsMade || []
      };

      setMessages(prev => [...prev, assistantMsg]);
      setSessionId(data.sessionId);

      if (data.workingScenario !== undefined) {
        setWorkingScenario(data.workingScenario);
      }

      if ((data.tokensUsed || 0) > 20000) {
        setTokenWarning(true);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        chips: [],
        toolCalls: []
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, sessionId, activeTab, userId, isLoading, scrollToBottom]);

  const clearSession = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: 'Your plan is loaded. What do you want to think through today?',
      chips: [
        "How's my plan looking?",
        'Roth conversion this year?',
        'What if I retire later?'
      ],
      isGreeting: true
    }]);
    setSessionId(null);
    setTokenWarning(false);
    setWorkingScenario(null);
  }, []);

  return {
    messages,
    inputText,
    setInputText,
    sessionId,
    isLoading,
    workingScenario,
    setWorkingScenario,
    tokenWarning,
    chatLogRef,
    sendMessage,
    clearSession
  };
}
