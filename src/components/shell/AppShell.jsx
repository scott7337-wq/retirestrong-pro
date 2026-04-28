import React from 'react';
import '../../styles/tokens.css';

export default function AppShell({ sidebar, rail, children }) {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#F5F3EF',
      fontFamily: "'Source Sans 3', sans-serif",
    }}>
      {sidebar}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        minWidth: 0,
        position: 'relative',
      }}>
        {children}
      </main>
      {rail}
    </div>
  );
}
