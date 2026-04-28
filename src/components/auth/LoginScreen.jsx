import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import RetireStrongLogo from '../shared/RetireStrongLogo.jsx';

var TEAL = '#0A4D54';
var TEAL_LIGHT = '#E8F5F2';

export default function LoginScreen() {
  var { login } = useAuth();
  var [email, setEmail] = useState('');
  var [error, setError] = useState('');
  var [loading, setLoading] = useState(false);

  function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    login(email.trim().toLowerCase())
      .catch(function() {
        setError('No account found for that email address.');
      })
      .finally(function() {
        setLoading(false);
      });
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F3EF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: 12,
        padding: '48px 40px 40px',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: TEAL_LIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <RetireStrongLogo size={32} />
        </div>

        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#1A1A1A',
          margin: '0 0 8px',
        }}>
          RetireStrong Pro
        </h1>
        <p style={{
          fontSize: 15,
          color: '#6B7280',
          margin: '0 0 32px',
          lineHeight: 1.5,
        }}>
          Private beta — enter your email to continue.
        </p>

        {/* Email input */}
        <div style={{ marginBottom: 12, textAlign: 'left' }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 6,
          }}>Email address</label>
          <input
            type="email"
            value={email}
            onChange={function(e) { setEmail(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="your@email.com"
            autoFocus
            style={{
              width: '100%',
              fontSize: 16,
              padding: '13px 16px',
              border: '1.5px solid ' + (error ? '#DC2626' : '#D1D5DB'),
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
              color: '#1A1A1A',
              background: '#FFFFFF',
              transition: 'border-color 0.15s',
            }}
            onFocus={function(e) { e.target.style.borderColor = TEAL; }}
            onBlur={function(e) { e.target.style.borderColor = error ? '#DC2626' : '#D1D5DB'; }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 13,
            color: '#991B1B',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 12,
            textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim()}
          style={{
            width: '100%',
            height: 48,
            background: email.trim() && !loading ? TEAL : '#D1D5DB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: email.trim() && !loading ? 'pointer' : 'not-allowed',
            marginBottom: 24,
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Checking…' : 'Continue →'}
        </button>

        <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
          This is a private beta. Contact{' '}
          <a href="mailto:scott7337@gmail.com" style={{ color: TEAL, textDecoration: 'none' }}>
            scott7337@gmail.com
          </a>{' '}
          to request access.
        </div>
      </div>
    </div>
  );
}
