import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChevronRight, ChevronDown, Plus, Edit2, ArrowRightLeft } from 'lucide-react';

// ── Color maps ────────────────────────────────────────────────────────────────
var COMP_COLORS = {
  'Cash & Near-Cash': '#0A4D54',
  'TIPS / Inflation':  '#4A9E8E',
  'Dividend/REIT':     '#8A5515',
  'Equity ETF':        '#3D6337',
  'International':     '#8B3528',
  'Roth Assets':       '#5B6FA6',
  'Other':             '#9CA3AF',
};

var BUCKET_CFG = [
  { id: 1, label: 'Bucket 1', sub: 'Cash & Equivalents',   horizon: '0-3 years spending horizon',    color: '#3D6337' },
  { id: 2, label: 'Bucket 2', sub: 'Bonds & Fixed Income',  horizon: '3-10 years spending horizon',   color: '#0A4D54' },
  { id: 3, label: 'Bucket 3', sub: 'Growth Equity',         horizon: '10+ years spending horizon',    color: '#8A5515' },
];

var ACCOUNT_DISPLAY = {
  'Taxable':    'Taxable Brokerage',
  'IRA':        'Traditional IRA',
  'Roth IRA':   'Roth IRA',
  'Roth 401k':  'Roth 401k',
  '401k':       '401k',
  'HSA':        'HSA',
  '529':        '529 / Education',
  'Annuity':    'Annuity',
  'Real Estate':'Real Estate / Other',
  'Pension':    'Pension',
};

function fmtShort(v) {
  if (!v && v !== 0) return '$0';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return '$' + Math.round(v).toLocaleString();
}

// ── Collapsible section wrapper ───────────────────────────────────────────────
function Collapsible({ title, right, defaultOpen, children }) {
  var openState = useState(defaultOpen || false);
  var open = openState[0]; var setOpen = openState[1];

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E4DC', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      <button
        onClick={function() { setOpen(!open); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            color: '#6B7280',
            display: 'flex',
          }}>
            <ChevronRight size={16} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A' }}>{title}</span>
        </div>
        {right}
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #E8E4DC' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Section 1: Donut chart ────────────────────────────────────────────────────
function AssetComposition({ composition, totalPort }) {
  var data = (composition || []).filter(function(d) { return d.amount > 0; });
  var total = totalPort || data.reduce(function(s, d) { return s + d.amount; }, 0);
  var coloured = data.map(function(d) {
    return Object.assign({}, d, { fill: COMP_COLORS[d.name] || '#9CA3AF' });
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E4DC', borderRadius: 12, padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', marginBottom: 20 }}>Asset Composition</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {/* Donut */}
        <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={coloured}
                cx="50%" cy="50%"
                innerRadius={68} outerRadius={95}
                dataKey="amount"
                strokeWidth={2}
                stroke="#FCFBF8"
              >
                {coloured.map(function(entry, i) {
                  return <Cell key={i} fill={entry.fill} />;
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0A4D54', lineHeight: 1.1 }}>{fmtShort(total)}</div>
            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>total</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1 }}>
          {coloured.map(function(d) {
            return (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{d.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{fmtShort(d.amount)}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{d.pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Table header row ──────────────────────────────────────────────────────────
function TH({ children, align }) {
  return (
    <th style={{
      padding: '10px 12px', textAlign: align || 'left',
      background: '#F0EDE8', color: '#374151',
      fontSize: 13, fontWeight: 600,
      borderBottom: '1px solid #E8E4DC',
      whiteSpace: 'nowrap',
    }}>{children}</th>
  );
}

// ── Section 2: Holdings Detail ────────────────────────────────────────────────
function HoldingsDetail({ assets, bucketCfg, openAddAsset, openEditAsset, deleteAsset, setMoveAssetId, fmtFull }) {
  var byAccount = {};
  (assets || []).forEach(function(a) {
    var key = a.account || 'Other';
    if (!byAccount[key]) byAccount[key] = [];
    byAccount[key].push(a);
  });

  var accountOrder = ['Taxable', 'IRA', 'Roth IRA', 'Roth 401k', '401k', 'HSA', '529', 'Annuity', 'Real Estate', 'Pension'];
  var orderedAccounts = accountOrder.filter(function(k) { return byAccount[k]; })
    .concat(Object.keys(byAccount).filter(function(k) { return accountOrder.indexOf(k) === -1; }));

  var addBtn = (
    <button
      onClick={function(e) { e.stopPropagation(); openAddAsset && openAddAsset(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        border: '1px solid #0A4D54', color: '#0A4D54', background: 'transparent',
        borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
      }}
    >
      <Plus size={12} /> Add Holding
    </button>
  );

  return (
    <Collapsible title="Holdings Detail" right={addBtn}>
      <div style={{ padding: '0 0 8px' }}>
        {orderedAccounts.map(function(acct) {
          var holdings = byAccount[acct];
          var acctTotal = holdings.reduce(function(s, a) { return s + (a.amount || 0); }, 0);
          var displayName = ACCOUNT_DISPLAY[acct] || acct;
          return (
            <div key={acct} style={{ marginBottom: 4 }}>
              {/* Account section header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 20px 6px', background: '#FAFAF8',
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{displayName}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0A4D54' }}>{fmtShort(acctTotal)}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <TH>Asset</TH>
                    <TH align="right">Amount</TH>
                    <TH>Bucket</TH>
                    <TH></TH>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(function(a, i) {
                    var bc = (bucketCfg || []).find(function(b) { return b.id === a.bucket; });
                    return (
                      <tr key={a.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8', borderBottom: '1px solid #F0EDE8' }}>
                        <td style={{ padding: '10px 12px', color: '#1A1A1A' }}>{a.name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0A4D54' }}>{fmtShort(a.amount)}</td>
                        <td style={{ padding: '10px 12px', color: '#6B7280' }}>
                          {bc ? <span style={{ fontSize: 12, background: '#E8F5F2', border: '1px solid #A7D9D4', borderRadius: 4, padding: '2px 6px', color: '#0A4D54', fontWeight: 600 }}>B{bc.id}</span> : <span style={{ color: '#9CA3AF' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={function() { openEditAsset && openEditAsset(a); }}
                              style={{ border: '1px solid #E8E4DC', color: '#6B7280', background: '#F8F7F4', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
                            ><Edit2 size={10} /></button>
                            <button
                              onClick={function() { setMoveAssetId && setMoveAssetId(a.id); }}
                              style={{ border: '1px solid #0A4D54', color: '#0A4D54', background: 'transparent', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
                            ><ArrowRightLeft size={10} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
}

// ── Section 2b: Bucket Funding Timeline ───────────────────────────────────────
function BucketFundingTimeline({ buckets, inp }) {
  var monthlyExp = (inp && inp.monthlyExpenses) ? Number(inp.monthlyExpenses) : 0;
  var annualExp = monthlyExp * 12;

  var lanes = [
    { id: 1, label: 'B1 — Cash', years: '0–3 yrs', color: '#3D6337', bg: '#F0FDF4', maxYrs: 3 },
    { id: 2, label: 'B2 — Bonds', years: '3–10 yrs', color: '#0A4D54', bg: '#E8F5F2', maxYrs: 7 },
    { id: 3, label: 'B3 — Growth', years: '10+ yrs', color: '#8A5515', bg: '#FFFBEB', maxYrs: 15 },
  ];

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 12, padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>Bucket Funding Timeline</div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>How each bucket covers your spending over time</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {lanes.map(function(lane) {
          var b = (buckets || []).find(function(x) { return x.id === lane.id; }) || {};
          var current = b.current || 0;
          var target = b.target || 1;
          var yearsHeld = annualExp > 0 ? current / annualExp : 0;
          var fillPct = Math.min((current / target) * 100, 100);
          var statusColor = fillPct >= 90 ? '#3D6337' : fillPct >= 60 ? '#8A5515' : '#8B3528';
          var statusLabel = fillPct >= 90 ? 'Funded' : fillPct >= 60 ? 'Partial' : 'Needs Top-up';

          return (
            <div key={lane.id} style={{ background: lane.bg, border: '1px solid #E8E4DC', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: lane.color, flexShrink: 0 }}/>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{lane.label}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{lane.years}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {annualExp > 0 && (
                    <span style={{ fontSize: 12, color: '#374151' }}>{yearsHeld.toFixed(1)} yrs coverage</span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 600, color: statusColor, background: statusColor + '18', borderRadius: 10, padding: '2px 7px' }}>{statusLabel}</span>
                </div>
              </div>
              <div style={{ height: 10, borderRadius: 5, background: '#E8E4DC', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: fillPct + '%', background: lane.color, borderRadius: 5, transition: 'width 0.4s ease' }}/>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'right' }}>{fillPct.toFixed(0)}% of target</div>
            </div>
          );
        })}
      </div>

      {/* Refill Logic */}
      <div style={{ borderTop: '1px solid #E8E4DC', paddingTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Annual Refill Logic</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#E8F5F2', border: '1px solid #A7D9D4', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0A4D54', marginBottom: 4 }}>Good Markets</div>
            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
              Sell B3 growth gains → replenish B2. Move B2 maturing bonds → top up B1. B1 covers year's spending.
            </div>
          </div>
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8B3528', marginBottom: 4 }}>Down Markets</div>
            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
              Do not sell B3. Draw from B1 cash only. If B1 runs low, sell B2 bonds. Let B3 recover.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section 3: Bucket Allocation ──────────────────────────────────────────────
function BucketAllocation({ buckets, totalPort, fmtFull }) {
  var cfg = BUCKET_CFG;
  return (
    <div style={{ background: '#fff', border: '1px solid #E8E4DC', borderRadius: 12, padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', marginBottom: 20 }}>Bucket Allocation</div>

      {cfg.map(function(bc, idx) {
        var b = (buckets || []).find(function(x) { return x.id === bc.id; }) || {};
        var current = b.current || 0;
        var target = b.target || 1;
        var pct = Math.min((current / target) * 100, 100);
        var over = current >= target;
        var diff = Math.abs(current - target);
        var portPct = totalPort > 0 ? ((current / totalPort) * 100).toFixed(1) : '0.0';
        var isLast = idx === cfg.length - 1;

        return (
          <div key={bc.id} style={{ marginBottom: isLast ? 0 : 24 }}>
            {/* Row header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: bc.color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, lineHeight: 1.2 }}>
                    <strong style={{ color: '#1A1A1A' }}>{bc.label}</strong>
                    <span style={{ color: '#6B7280', marginLeft: 8 }}>{bc.sub}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{bc.horizon}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#0A4D54', lineHeight: 1.1 }}>{fmtShort(current)}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{portPct}% of portfolio</div>
              </div>
            </div>

            {/* Target row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingLeft: 28 }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Target: {fmtShort(target)}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, borderRadius: 10, padding: '2px 8px',
                background: over ? '#D1FAE5' : '#FEE2E2',
                color:      over ? '#065F46' : '#7F1D1D',
              }}>
                {over ? '+' : '-'}{fmtShort(diff)}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ paddingLeft: 28 }}>
              <div style={{ height: 8, borderRadius: 4, background: '#E8E4DC', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: pct + '%',
                  background: bc.color, borderRadius: 4,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {idx < cfg.length - 1 && <div style={{ borderBottom: '1px solid #F0EDE8', marginTop: 20 }} />}
          </div>
        );
      })}

      {/* Total row */}
      <div style={{ borderTop: '1px solid #E8E4DC', marginTop: 20, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>Total Portfolio</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: '#0A4D54' }}>{fmtShort(totalPort)}</span>
      </div>
    </div>
  );
}

// ── Section 4: Bucket Holdings ────────────────────────────────────────────────
function BucketHoldings({ assets }) {
  var cfg = BUCKET_CFG;
  return (
    <Collapsible title="What's in Each Bucket">
      <div style={{ padding: '0 0 8px' }}>
        {cfg.map(function(bc) {
          var holdings = (assets || []).filter(function(a) { return a.bucket === bc.id; });
          return (
            <div key={bc.id} style={{ marginBottom: 4 }}>
              <div style={{ padding: '10px 20px 6px', background: '#FAFAF8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: bc.color }}>
                  {bc.label} — {bc.sub}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A4D54' }}>
                  {fmtShort(holdings.reduce(function(s, a) { return s + (a.amount || 0); }, 0))}
                </span>
              </div>
              {holdings.length === 0 ? (
                <div style={{ padding: '12px 20px', fontSize: 13, color: '#9CA3AF' }}>No holdings assigned · Add one →</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr>
                      <TH>Asset</TH>
                      <TH align="right">Amount</TH>
                      <TH>Type</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(function(a, i) {
                      return (
                        <tr key={a.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAF8', borderBottom: '1px solid #F0EDE8' }}>
                          <td style={{ padding: '10px 12px', color: '#1A1A1A' }}>{a.name}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: bc.color }}>{fmtShort(a.amount)}</td>
                          <td style={{ padding: '10px 12px', color: '#6B7280', fontSize: 13 }}>{a.type || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </Collapsible>
  );
}

// ── Main PortfolioPage ────────────────────────────────────────────────────────
export default function PortfolioPage({
  assets, buckets, bucketCfg, totalPort, composition,
  unassigned, openAddAsset, openEditAsset, deleteAsset,
  setMoveAssetId, moveAssetToBucket, fmtC, fmtFull, inp,
}) {
  var fmt = fmtFull || fmtShort;

  return (
    <div style={{ padding: '24px 28px', background: '#F5F3EF', minHeight: '100%' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px' }}>Portfolio</h1>
        <div style={{ fontSize: 14, color: '#6B7280' }}>
          Scott &amp; Stacey · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          {(unassigned || []).length > 0 && (
            <span style={{ marginLeft: 12, color: '#8B3528', fontWeight: 500 }}>
              · {(unassigned || []).length} unassigned
            </span>
          )}
        </div>
      </div>

      {/* 1. Asset Composition */}
      <AssetComposition composition={composition} totalPort={totalPort} />

      {/* 2. Holdings Detail */}
      <HoldingsDetail
        assets={assets}
        bucketCfg={bucketCfg}
        openAddAsset={openAddAsset}
        openEditAsset={openEditAsset}
        deleteAsset={deleteAsset}
        setMoveAssetId={setMoveAssetId}
        fmtFull={fmt}
      />

      {/* 2b. Bucket Funding Timeline */}
      <BucketFundingTimeline buckets={buckets} inp={inp} />

      {/* 3. Bucket Allocation */}
      <BucketAllocation buckets={buckets} totalPort={totalPort} fmtFull={fmt} />

      {/* 4. Bucket Holdings */}
      <BucketHoldings assets={assets} />
    </div>
  );
}
