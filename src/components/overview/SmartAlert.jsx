import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function SmartAlert({ borderColor, iconBg, icon: Icon, iconColor, title, body, actionLabel, onAction }) {
  var dismissed = useState(false);
  var isDismissed = dismissed[0];
  var setDismissed = dismissed[1];

  if (isDismissed) return null;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E8E5E0',
      borderLeft: '3px solid ' + borderColor,
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
      position: 'relative',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, marginBottom: actionLabel ? 10 : 0 }}>{body}</div>
        {actionLabel && (
          <button
            onClick={onAction}
            style={{
              background: borderColor,
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >{actionLabel}</button>
        )}
      </div>
      <button
        onClick={function() { setDismissed(true); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, flexShrink: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
