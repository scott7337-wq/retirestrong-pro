import React from 'react';
import { Home, TrendingUp, Activity, Layers, DollarSign, FileText, Receipt, Settings, Save, CheckCircle, Loader, AlertCircle, MessageSquare } from 'lucide-react';
import RetireStrongLogo from '../shared/RetireStrongLogo.jsx';

var NAV_GROUPS = [
  {
    label: 'PLANNING',
    items: [
      { id: 'dashboard',  label: 'Overview',    Icon: Home },
      { id: 'buckets',    label: 'Portfolio',    Icon: Layers },
      { id: 'cashflow',   label: 'Plan',         Icon: TrendingUp },
      { id: 'monte',      label: 'Stress Test',  Icon: Activity },
      { id: 'coach',      label: 'Coach',        Icon: MessageSquare },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { id: 'spending',   label: 'Spending',     Icon: DollarSign },
      { id: 'incometax',  label: 'Income & Tax', Icon: FileText },
      { id: 'roth',       label: 'Roth Conversion', Icon: Receipt },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { id: 'settings',   label: 'Assumptions',  Icon: Settings },
    ],
  },
];

/**
 * Save flow:
 * 1. Collect current inp (plan inputs) from App state via saveSilently callback
 * 2. Saves to the current scenario slot in localStorage (immediate, silent)
 * 3. Show "Saved ✓" toast for 2 seconds
 *
 * "Save as new scenario…" (▾ dropdown) → same flow but prompts for a name
 * first via setShowModal(true), then saves as a new named scenario row.
 *
 * syncToDB → POST /api/plan?user_id=... — persists current scenario to PostgreSQL.
 *
 * NOT saved: computed results (cashFlow, MC) — always recomputed from inp on load.
 * NOT saved: assets/holdings — managed separately via /api/holdings endpoints.
 */
export default function Sidebar({ activeTab, setActiveTab, activeScen, successRate, saveStatus, syncToDB, saveSilently, setShowModal, dataSource, user, logout }) {
  var hoveredState = React.useState(null);
  var hovered = hoveredState[0];
  var setHovered = hoveredState[1];

  var syncHoveredState = React.useState(false);
  var syncHovered = syncHoveredState[0];
  var setSyncHovered = syncHoveredState[1];

  var saveHoveredState = React.useState(false);
  var saveHovered = saveHoveredState[0];
  var setSaveHovered = saveHoveredState[1];

  var dropdownState = React.useState(false);
  var dropdownOpen = dropdownState[0];
  var setDropdownOpen = dropdownState[1];

  var scenarioDisplayName = (activeScen && !/^Scenario \d+$/.test(activeScen)) ? activeScen : 'Base Case';

  return (
    <div style={{
      width: 200,
      minWidth: 200,
      flexShrink: 0,
      background: '#FFFFFF',
      borderRight: '1px solid #D4D1C5',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo + wordmark */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #D4D1C5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: '#E8F5F2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <RetireStrongLogo size={24} />
          </div>
          <span style={{ color: '#0F5E66', fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>RetireStrong</span>
        </div>
        <div style={{ fontSize: 11, color: '#5F6368', paddingLeft: 2 }}>
          {scenarioDisplayName} · <span style={{ fontWeight: 600 }}>{successRate}%</span>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {NAV_GROUPS.map(function(group) {
          return (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11,
                color: '#5F6368',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                padding: '0 16px',
                marginBottom: 4,
                fontWeight: 600,
              }}>{group.label}</div>
              {group.items.map(function(item) {
                var active = activeTab === item.id;
                var isHovered = hovered === item.id && !active;
                return (
                  <button
                    key={item.id}
                    onClick={function() { setActiveTab(item.id); }}
                    onMouseEnter={function() { setHovered(item.id); }}
                    onMouseLeave={function() { setHovered(null); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: 'calc(100% - 16px)',
                      margin: '1px 8px',
                      padding: '8px 12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      textAlign: 'left',
                      background: active ? '#0A4D54' : isHovered ? '#F5F3EF' : 'transparent',
                      color: active ? '#FFFFFF' : '#222222',
                      borderRadius: 6,
                      borderLeft: 'none',
                      transition: 'background 0.12s',
                    }}
                  >
                    <item.Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #E8E4DC' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {/* Split save button */}
          <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
            <button
              onClick={saveSilently}
              onMouseEnter={function() { setSaveHovered(true); }}
              onMouseLeave={function() { setSaveHovered(false); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                background: saveHovered ? '#E8F5F2' : 'transparent',
                border: '1px solid #0A4D54',
                borderRight: 'none',
                borderRadius: '6px 0 0 6px',
                padding: '4px 8px',
                color: '#0A4D54',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
                transition: 'background 0.12s',
              }}
            >
              <Save size={11} /> Save
            </button>
            <button
              onClick={function() { setDropdownOpen(!dropdownOpen); }}
              onBlur={function() { setTimeout(function() { setDropdownOpen(false); }, 150); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: '1px solid #0A4D54',
                borderRadius: '0 6px 6px 0',
                padding: '4px 6px',
                color: '#0A4D54',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >▾</button>
            {dropdownOpen && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100,
                marginBottom: 4, overflow: 'hidden',
              }}>
                <button
                  onClick={function() { setDropdownOpen(false); setShowModal(true); }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, color: '#374151',
                  }}
                >Save as new scenario…</button>
              </div>
            )}
          </div>
          <button
            onClick={syncToDB}
            disabled={saveStatus === 'saving'}
            onMouseEnter={function() { setSyncHovered(true); }}
            onMouseLeave={function() { setSyncHovered(false); }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: saveStatus === 'error' ? 'rgba(220,38,38,0.08)' : syncHovered ? '#E8F5F2' : 'transparent',
              border: '1px solid ' + (saveStatus === 'error' ? '#DC2626' : '#0A4D54'),
              borderRadius: 6,
              padding: '4px 8px',
              color: saveStatus === 'error' ? '#DC2626' : '#0A4D54',
              cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: 500,
              opacity: saveStatus === 'saving' ? 0.6 : 1,
              transition: 'background 0.12s',
            }}
          >
            {saveStatus === 'saving'
              ? React.createElement(Loader, { size: 11, style: { animation: 'spin 1s linear infinite' } })
              : saveStatus === 'saved'
              ? React.createElement(CheckCircle, { size: 11 })
              : saveStatus === 'error'
              ? React.createElement(AlertCircle, { size: 11 })
              : 'Sync'
            }
          </button>
        </div>
        {user && (
          <div style={{
            paddingTop: 8,
            marginBottom: 8,
            borderTop: '1px solid #E8E4DC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 11, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {user.name || user.email}
            </div>
            {logout && (
              <button
                onClick={logout}
                style={{
                  fontSize: 10,
                  color: '#9CA3AF',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                Sign out
              </button>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#5F6368' }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: dataSource === 'database' ? '#10b981' : '#fbbf24',
            flexShrink: 0,
          }} />
          {dataSource === 'database' ? 'Live from DB' : 'Offline defaults'}
        </div>
      </div>
    </div>
  );
}
