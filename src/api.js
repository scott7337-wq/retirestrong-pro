// src/api.js — RetireStrong API client
export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3101';

function getUserId() {
  return localStorage.getItem('rs_user_id') || import.meta.env.VITE_USER_ID || '';
}

export async function fetchHoldings(userId) {
  // Prefer the explicitly-passed userId (from props/auth state) over localStorage
  // to avoid the VITE_USER_ID fallback accidentally fetching the wrong user's data.
  const uid = userId || getUserId();
  const url = uid ? `${BASE}/api/holdings?user_id=${encodeURIComponent(uid)}` : `${BASE}/api/holdings`;
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
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
