export function fmtC(v) {
  if (!v && v !== 0) return '$0';
  if (v >= 1e6) return '$' + (v/1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + (v/1000).toFixed(0) + 'K';
  return '$' + Math.round(v).toLocaleString();
}
export function fmtFull(v) { return '$' + Math.round(v||0).toLocaleString(); }
export function fmtPct(v) { return (v*100).toFixed(1) + '%'; }
