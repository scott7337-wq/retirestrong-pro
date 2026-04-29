import React from 'react';
import '../../styles/tokens.css';
import AIInsightsRail from './AIInsightsRail.jsx';

/**
 * AppShell — 3-column layout
 *
 * Layout: [Sidebar 200px] | [main content flex-1] | [AIInsightsRail 300px]
 *
 * When activeTab === 'coach', the rail is hidden because CoachTab
 * renders its own full-page chat experience.
 *
 * Props:
 *   sidebar   — pre-rendered <Sidebar> from App.jsx
 *   activeTab — current tab, forwarded to AIInsightsRail; hides rail on 'coach'
 *   ctx       — tabCtx from App.jsx, forwarded to AIInsightsRail for data-driven cards
 *   children  — tab content rendered in the main pane
 */
export default function AppShell({ sidebar, activeTab, ctx, children }) {
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

      <main style={{
        flex: 1,
        overflowY: activeTab === 'coach' ? 'hidden' : 'auto',
        overflow: activeTab === 'coach' ? 'hidden' : undefined,
        background: 'var(--rs-bg-page)',
        minWidth: 0,
        minHeight: 0,
        display: activeTab === 'coach' ? 'flex' : 'block',
        flexDirection: activeTab === 'coach' ? 'column' : undefined,
      }}>
        {children}
      </main>

      {showRail && (
        <AIInsightsRail activeTab={activeTab} ctx={ctx} />
      )}
    </div>
  );
}
