import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

var SCENARIOS = [
  {
    id: 'ss70',
    label: 'What if I delay Social Security to 70?',
    tabTarget: 'ss',
    description: 'Compare SS claim age impact on lifetime income and portfolio draw.',
  },
  {
    id: 'reduce_spend',
    label: 'What if I reduce spending by $10K/year?',
    tabTarget: 'spending',
    description: 'Lower annual draw extends portfolio runway and improves success rate.',
  },
  {
    id: 'market_drop',
    label: 'What if markets drop 30% in year 1?',
    tabTarget: 'monte',
    description: 'Sequence-of-returns risk stress test: B1 coverage gap analysis.',
  },
];

export default function QuickWhatIf({ setActiveTab }) {
  var hoveredState = useState(null);
  var hovered = hoveredState[0];
  var setHovered = hoveredState[1];

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8E5E0',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #E8E5E0' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 2 }}>Quick What-If Scenarios</div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>See instant impact of common changes</div>
      </div>
      {SCENARIOS.map(function(s) {
        return (
          <button
            key={s.id}
            onClick={function() { setActiveTab(s.tabTarget); }}
            onMouseEnter={function() { setHovered(s.id); }}
            onMouseLeave={function() { setHovered(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '14px 20px',
              background: hovered === s.id ? '#F8F7F4' : 'transparent',
              border: 'none',
              borderBottom: '1px solid #E8E5E0',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 400 }}>{s.label}</div>
              {hovered === s.id && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{s.description}</div>
              )}
            </div>
            <ChevronRight size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}
