import React from 'react';
import '../../styles/tokens.css';
import AIInsightsRail from './AIInsightsRail.jsx';

/**
 * AppShell — 3-column layout
 *
 * Layout: [Sidebar 200px] | [AIInsightsRail 300px] | [main content flex-1]
 *
 * When activeTab === 'coach', the rail is hidden because CoachTab
 * renders its own full-page chat experience.
 *
 * Props:
 *   sidebar   — pre-rendered <Sidebar> from App.jsx
 *   activeTab — current tab, forwarded to AIInsightsRail; hides rail on 'coach'
 *   children  — tab content rendered in the main pane
 */
export default function AppShell({ sidebar, activeTab, children }) {
  const showRail = activeTab !== 'coach';

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      fontFamily: "'Source Sans 3', sans-serif",
    }}>
      {sidebar}

      {showRail && (
        <AIInsightsRail activeTab={activeTab} />
      )}

      <main style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--rs-bg-page)',
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}
