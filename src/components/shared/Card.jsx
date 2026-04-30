import React from 'react';

/**
 * Shared card primitives — used across all tabs for visual consistency.
 *
 * <Card>                      — standard white card, consistent shadow + radius
 * <Card priority>             — teal border + elevated shadow
 * <Card accent="success">     — colored top border (success/warning/danger/info)
 * <Card padding="sm|none">    — smaller padding or none (for chart cards)
 *
 * <CardHeader title="…" subtitle="…" action={<button/>} />
 * <SectionLabel>LABEL TEXT</SectionLabel>
 * <StatusBadge status="success|warning|danger">text</StatusBadge>
 */

var ACCENT_COLORS = {
  success: 'var(--rs-success)',
  warning: 'var(--rs-warning)',
  danger:  'var(--rs-danger)',
  info:    '#0A4D54',
};

export function Card({ children, priority, accent, padding, style, ...props }) {
  var borderTop = accent
    ? '3px solid ' + (ACCENT_COLORS[accent] || accent)
    : priority
    ? 'var(--rs-card-priority-top)'
    : undefined;
  var pd = padding === 'none'
    ? 0
    : padding === 'sm'
    ? 'var(--rs-card-padding-sm)'
    : 'var(--rs-card-padding)';

  return (
    <div
      style={Object.assign({
        background: 'var(--rs-bg-card)',
        border: priority ? 'var(--rs-card-priority-border)' : 'var(--rs-card-border)',
        borderTop: borderTop,
        borderRadius: 'var(--rs-card-radius)',
        boxShadow: priority ? 'var(--rs-card-priority-shadow)' : 'var(--rs-card-shadow)',
        padding: pd,
      }, style || {})}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
      <div>
        <div style={{
          fontSize: 'var(--rs-text-xs)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--rs-text-muted)',
          marginBottom: subtitle ? 3 : 0,
        }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 'var(--rs-text-small)', color: 'var(--rs-text-muted)' }}>{subtitle}</div>
        )}
      </div>
      {action || null}
    </div>
  );
}

export function SectionLabel({ children, style }) {
  return (
    <div style={Object.assign({
      fontSize: 'var(--rs-text-xs)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: 'var(--rs-text-muted)',
      marginBottom: 10,
    }, style || {})}>
      {children}
    </div>
  );
}

export function StatusBadge({ status, children }) {
  var COLORS = {
    success: { bg: 'var(--rs-success-bg)', color: 'var(--rs-success)' },
    warning: { bg: 'var(--rs-warning-bg)', color: 'var(--rs-warning)' },
    danger:  { bg: 'var(--rs-danger-bg)',  color: 'var(--rs-danger)'  },
    neutral: { bg: 'var(--rs-neutral-bg)', color: 'var(--rs-neutral)' },
  };
  var c = COLORS[status] || COLORS.neutral;
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 9px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/** Standard page header used by every tab */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--rs-font-display)',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--rs-text-primary)',
          margin: '0 0 3px',
        }}>{title}</h1>
        {subtitle && (
          <div style={{ fontSize: 13, color: 'var(--rs-text-muted)' }}>{subtitle}</div>
        )}
      </div>
      {action || null}
    </div>
  );
}
