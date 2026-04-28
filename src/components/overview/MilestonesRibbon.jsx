import React, { useState } from 'react';
import { Calendar, DollarSign, Heart, BarChart2 } from 'lucide-react';

var TOOLTIPS = {
  retirement: 'Retirement begins — living on portfolio + SS income. B1 cash buffer active.',
  ss:         'Social Security benefits start. Scott\'s monthly benefit locks in based on claim age.',
  medicare:   'Stacey turns 65 and enrolls in Medicare. Healthcare costs shift from Phase 1 to Phase 2 rates.',
  rmd:        'Required Minimum Distributions begin at age 73 (SECURE 2.0). Must withdraw IRA minimums annually.',
};

function Milestone({ year, label, icon: Icon, isPast, tooltip, isLast }) {
  var hovered = useState(false);
  var isHovered = hovered[0];
  var setHovered = hovered[1];

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 }}
      onMouseEnter={function() { setHovered(true); }}
      onMouseLeave={function() { setHovered(false); }}
    >
      {/* Tooltip */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1A1A1A',
          color: '#fff',
          fontSize: 11,
          borderRadius: 8,
          padding: '8px 12px',
          width: 200,
          zIndex: 10,
          lineHeight: 1.5,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {tooltip}
          <div style={{
            position: 'absolute',
            top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1A1A1A',
          }}/>
        </div>
      )}

      {/* Circle */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: isPast ? '#1A4A44' : '#fff',
        border: isPast ? 'none' : '2px solid #D1D5DB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'transform 0.15s',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      }}>
        <Icon size={16} color={isPast ? '#fff' : '#9CA3AF'} />
      </div>

      {/* Year */}
      <div style={{ fontSize: 14, fontWeight: isPast ? 700 : 400, color: isPast ? '#1A4A44' : '#6B7280', marginBottom: 2 }}>{year}</div>
      {/* Label */}
      <div style={{ fontSize: 11, color: isPast ? '#374151' : '#9CA3AF', textAlign: 'center', maxWidth: 90 }}>{label}</div>
    </div>
  );
}

export default function MilestonesRibbon({ milestones }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8E5E0',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Retirement Milestones</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
        {/* Connector line */}
        <div style={{
          position: 'absolute',
          top: 20,
          left: '10%',
          right: '10%',
          height: 2,
          background: '#E8E5E0',
          zIndex: 0,
        }} />
        {milestones.map(function(m, i) {
          return (
            <Milestone
              key={m.key}
              year={m.year}
              label={m.label}
              icon={m.icon}
              isPast={m.isPast}
              tooltip={TOOLTIPS[m.key] || m.label}
              isLast={i === milestones.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}
