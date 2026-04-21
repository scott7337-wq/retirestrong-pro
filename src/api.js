// src/api.js — RetireStrong API client
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3101';

export async function fetchHoldings() {
  const res = await fetch(`${BASE}/api/holdings`, { signal: AbortSignal.timeout(3000) });
  return res.json();
}

export async function fetchAiInsights(prompt) {
  const res = await fetch(`${BASE}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  return res.json();
}
