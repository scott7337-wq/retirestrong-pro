import { createContext, useContext, useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3101';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user shape: { user_id, email, name, onboarding_complete, onboarding_data }
  var [user, setUser] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var saved = localStorage.getItem('rs_user_id');
    if (saved) {
      fetch(BASE + '/api/auth/me?user_id=' + encodeURIComponent(saved))
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(u) { setUser(u); setLoading(false); })
        .catch(function() { setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  function login(email) {
    return fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email }),
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Login failed');
        return res.json();
      })
      .then(function(u) {
        localStorage.setItem('rs_user_id', u.user_id);
        setUser(u);
        return u;
      });
  }

  function logout() {
    localStorage.removeItem('rs_user_id');
    setUser(null);
  }

  // Mark this user's onboarding as complete on the server and update local state.
  // `draft` is the wizard draft JSON; it gets stored in users.onboarding_data and
  // hydrated back into `inp` on subsequent loads.
  function markOnboardingComplete(draft) {
    if (!user) return Promise.reject(new Error('Not logged in'));
    return fetch(BASE + '/api/auth/complete_onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.user_id, draft: draft || null }),
    })
      .then(function(r) { if (!r.ok) throw new Error('Failed to mark onboarding'); return r.json(); })
      .then(function(updated) { setUser(updated); return updated; });
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, markOnboardingComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
