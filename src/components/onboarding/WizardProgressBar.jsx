import React from 'react';

var TEAL = '#0A4D54';
var TEAL_LIGHT = '#A7D9D4';

export default function WizardProgressBar({ step, totalSteps }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, position: 'relative' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
          width: (totalSteps - 1) * 48 + 'px',
          height: 2,
          background: '#E8E4DC',
          zIndex: 0,
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
          width: Math.max(0, (step - 1) / (totalSteps - 1)) * ((totalSteps - 1) * 48) + 'px',
          height: 2,
          background: TEAL,
          zIndex: 0,
          transition: 'width 0.3s ease',
        }} />
        {Array.from({ length: totalSteps }, function(_, i) {
          var s = i + 1;
          var done = s < step;
          var active = s === step;
          return (
            <div key={s} style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: done ? TEAL : active ? TEAL : '#FFFFFF',
              border: '2px solid ' + (done || active ? TEAL : '#D1D5DB'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: done || active ? '#FFFFFF' : '#9CA3AF',
              zIndex: 1,
              position: 'relative',
              flexShrink: 0,
              margin: '0 10px',
              transition: 'background 0.2s, border-color 0.2s',
            }}>
              {done ? '✓' : s}
            </div>
          );
        })}
      </div>
    </div>
  );
}
