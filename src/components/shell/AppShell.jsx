import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/tokens.css';
import TopBar from './TopBar.jsx';
import DiffStrip from './DiffStrip.jsx';
import PinModal from './PinModal.jsx';
import AIInsightsRail from './AIInsightsRail.jsx';

/**
 * AppShell — Phase B two-pane layout
 *
 * Layout (outer → inner):
 *   column: TopBar / DiffStrip / [row: Sidebar | grid: Chat | Plan]
 *
 * Props:
 *   sidebar   — pre-rendered <Sidebar> from App.jsx (unchanged)
 *   activeTab — current tab, forwarded to AIInsightsRail
 *   children  — tab content rendered in the plan pane
 */
export default function AppShell({ sidebar, activeTab, children }) {
  const { user: authUser } = useAuth();
  const userId = authUser?.user_id || null;

  const [mode, setMode]                       = useState('explore');
  const [workingScenario, setWorkingScenario] = useState(null);
  const [showPinModal, setShowPinModal]       = useState(false);
  const [pinToast, setPinToast]               = useState(false);

  const chatWidth = mode === 'explore' ? '420px' : '320px';

  async function handleDiscard() {
    if (!userId) return;
    try {
      await fetch('/api/scenarios/working?user_id=' + userId, { method: 'DELETE' });
    } catch (e) {
      console.error('Discard failed:', e);
    }
    setWorkingScenario(null);
  }

  async function handlePin(name, note) {
    if (!userId) return;
    try {
      await fetch('/api/scenarios/pin?user_id=' + userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, note }),
      });
    } catch (e) {
      console.error('Pin failed:', e);
    }
    setWorkingScenario(null);
    setShowPinModal(false);
    setPinToast(true);
    setTimeout(() => setPinToast(false), 2500);
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: "'Source Sans 3', sans-serif",
    }}>
      <TopBar mode={mode} onModeChange={setMode} />

      <DiffStrip
        workingScenario={workingScenario}
        onDiscard={handleDiscard}
        onPin={() => setShowPinModal(true)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebar}

        <div style={{
          display: 'grid',
          gridTemplateColumns: chatWidth + ' 1fr',
          flex: 1,
          overflow: 'hidden',
          transition: 'grid-template-columns 200ms ease',
        }}>
          <AIInsightsRail
            activeTab={activeTab}
            workingScenario={workingScenario}
            onWorkingScenarioChange={setWorkingScenario}
          />

          <main style={{
            overflowY: 'auto',
            background: 'var(--rs-bg-page)',
            minWidth: 0,
          }}>
            {children}
          </main>
        </div>
      </div>

      {showPinModal && (
        <PinModal
          workingScenario={workingScenario}
          onConfirm={handlePin}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {pinToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#0A4D54', color: '#fff',
          padding: '10px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          animation: 'rsFadeIn 200ms ease',
          zIndex: 300,
        }}>
          Scenario pinned ✓
        </div>
      )}
    </div>
  );
}
