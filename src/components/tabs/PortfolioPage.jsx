import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChevronRight, Plus, Edit2, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

// ── Style constants ───────────────────────────────────────────────────────────
var CARD = {
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  marginBottom: 16,
};

// ── Color maps ────────────────────────────────────────────────────────────────
var COMP_COLORS = {
  'Cash & Near-Cash': '#4A9E8E',
  'TIPS / Inflation':  '#2C5F5A',
  'Dividend/REIT':     '#8A5515',
  'Equity ETF':        '#C8A882',
  'International':     '#6B8FA8',
  'Roth Assets':       '#553C9A',
  'Other':             '#6B7280',
};

var BUCKET_CFG = [
  { id: 1, label: 'Bucket 1', sub: 'Cash & Equivalents',   horizon: '0–3 years spending horizon',  color: '#4A9E8E' },
  { id: 2, label: 'Bucket 2', sub: 'Bonds & Fixed Income',  horizon: '3–10 years spending horizon', color: '#2C5F5A' },
  { id: 3, label: 'Bucket 3', sub: 'Growth Equity',         horizon: '10+ years spending horizon',  color: '#C8A882' },
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
    <div style={Object.assign({}, CARD, { padding: 0, overflow: 'hidden' })}>
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
            color: '#6B7280', display: 'flex',
          }}>
            <ChevronRight size={16} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{title}</span>
        </div>
        {right}
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #E5E7EB' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Table header ──────────────────────────────────────────────────────────────
function TH({ children, align }) {
  return (
    <th style={{
      padding: '8px 12px', textAlign: align || 'left',
      background: '#F9FAFB', color: '#6B7280',
      fontSize: 11, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      borderBottom: '1px solid #E5E7EB',
      whiteSpace: 'nowrap',
    }}>{children}</th>
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
    <div style={CARD}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20 }}>Asset Composition</div>
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
                stroke="#FFFFFF"
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
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{fmtShort(total)}</div>
            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>total</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1 }}>
          {coloured.map(function(d) {
            return (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{d.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmtShort(d.amount)}</span>
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
        border: '1px solid #D1D5DB', color: '#374151', background: 'transparent',
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
                padding: '10px 20px 8px', borderBottom: '1px solid #E5E7EB',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{displayName}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{fmtShort(acctTotal)}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                      <tr key={a.id || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{a.name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{fmtShort(a.amount)}</td>
                        <td style={{ padding: '8px 12px', color: '#6B7280' }}>
                          {bc
                            ? <span style={{ fontSize: 11, background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 4, padding: '2px 6px', color: '#065F46', fontWeight: 600 }}>B{bc.id}</span>
                            : <span style={{ color: '#9CA3AF' }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={function() { openEditAsset && openEditAsset(a); }}
                              style={{ border: '1px solid #E5E7EB', color: '#6B7280', background: '#F9FAFB', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
                            ><Edit2 size={10} /></button>
                            <button
                              onClick={function() { setMoveAssetId && setMoveAssetId(a.id); }}
                              style={{ border: '1px solid #D1D5DB', color: '#374151', background: 'transparent', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
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
    { id: 1, label: 'B1 — Cash',   years: '0–3 yrs',  color: '#4A9E8E', maxYrs: 3  },
    { id: 2, label: 'B2 — Bonds',  years: '3–10 yrs', color: '#2C5F5A', maxYrs: 7  },
    { id: 3, label: 'B3 — Growth', years: '10+ yrs',  color: '#C8A882', maxYrs: 15 },
  ];

  return (
    <div style={CARD}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Bucket Funding Timeline</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>How each bucket covers your spending over time</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {lanes.map(function(lane) {
          var b = (buckets || []).find(function(x) { return x.id === lane.id; }) || {};
          var current = b.current || 0;
          var target = b.target || 1;
          var yearsHeld = annualExp > 0 ? current / annualExp : 0;
          var fillPct = Math.min((current / target) * 100, 100);
          var needsTopUp = fillPct < 60;

          return (
            <div key={lane.id} style={{
              background: '#FFFFFF', border: '1px solid #E5E7EB',
              borderRadius: '8px', padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: lane.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{lane.label}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{lane.years}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {annualExp > 0 && (
                    <span style={{ fontSize: 12, color: '#374151' }}>{yearsHeld.toFixed(1)} yrs coverage</span>
                  )}
                  {needsTopUp && (
                    <span style={{
                      background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                      padding: '2px 8px', borderRadius: '4px', fontSize: 12,
                    }}>Needs top-up</span>
                  )}
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: fillPct + '%', background: lane.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                <span style={{ color: '#6B7280' }}>{fillPct.toFixed(0)}% of target</span>
                {current < target && (
                  <span style={{ color: '#DC2626' }}>-{fmtShort(target - current)} needed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Refill Logic */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Annual Refill Logic</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>Good Markets</div>
            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
              Sell B3 growth gains → replenish B2. Move B2 maturing bonds → top up B1. B1 covers year's spending.
            </div>
          </div>
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>Down Markets</div>
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
function BucketAllocation({ buckets, totalPort, fmtFull, assets }) {
  var cfg = BUCKET_CFG;
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Bucket Allocation</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>How each bucket covers your spending over time</div>
      </div>

      {cfg.map(function(bc) {
        var b = (buckets || []).find(function(x) { return x.id === bc.id; }) || {};
        var current = b.current || 0;
        var target = b.target || 1;
        var pct = Math.min((current / target) * 100, 100);
        var over = current >= target;
        var diff = Math.abs(current - target);
        var portPct = totalPort > 0 ? ((current / totalPort) * 100).toFixed(1) : '0.0';
        var covYrs = 0; // calculated per bucket from target
        var holdings = (assets || []).filter(function(a) { return a.bucket === bc.id; });

        return (
          <div key={bc.id} style={{
            background: '#FFFFFF', border: '1px solid #E5E7EB',
            borderRadius: '8px', padding: '16px 20px', marginBottom: 12,
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: bc.color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{bc.label} — {bc.sub}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{bc.horizon}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{fmtShort(current)}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{portPct}% of portfolio</div>
              </div>
            </div>

            {/* Target + needs top-up badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>Target: {fmtShort(target)}</span>
              {!over && (
                <span style={{
                  background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                  padding: '2px 8px', borderRadius: '4px', fontSize: 12,
                }}>Needs top-up</span>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: pct + '%', background: bc.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>

            {/* Pct + deficit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 }}>
              <span style={{ color: '#6B7280' }}>{pct.toFixed(0)}% of target</span>
              {!over && <span style={{ color: '#DC2626' }}>-{fmtShort(diff)} needed</span>}
              {over  && <span style={{ color: '#059669' }}>+{fmtShort(diff)} above target</span>}
            </div>

            {/* Holdings sub-section */}
            <div style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB',
              borderRadius: '6px', padding: '12px', marginTop: 4,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Holdings</div>
              {holdings.length === 0 ? (
                <div style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic' }}>No holdings assigned. Add now →</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {holdings.map(function(a) {
                    return (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <span style={{ color: '#374151' }}>{a.name}</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{fmtShort(a.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Total row */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px',
        padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Total Portfolio</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{fmtShort(totalPort)}</span>
      </div>
    </div>
  );
}

// ── Section 4: What's in Each Bucket ─────────────────────────────────────────
function BucketHoldings({ assets }) {
  var cfg = BUCKET_CFG;
  return (
    <Collapsible title="What's in Each Bucket">
      <div style={{ padding: '0 0 8px' }}>
        {cfg.map(function(bc) {
          var holdings = (assets || []).filter(function(a) { return a.bucket === bc.id; });
          var total = holdings.reduce(function(s, a) { return s + (a.amount || 0); }, 0);
          return (
            <div key={bc.id} style={{ marginBottom: 4 }}>
              <div style={{ padding: '10px 20px 8px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  {bc.label} — {bc.sub}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{fmtShort(total)}</span>
              </div>
              {holdings.length === 0 ? (
                <div style={{ padding: '12px 20px', fontSize: 13, color: '#9CA3AF' }}>No holdings assigned · Add one →</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                        <tr key={a.id || i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 12px', color: '#374151' }}>{a.name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{fmtShort(a.amount)}</td>
                          <td style={{ padding: '8px 12px', color: '#6B7280', fontSize: 12 }}>{a.type || '—'}</td>
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
  var authCtx = useAuth();
  var authUser = authCtx ? authCtx.user : null;
  var planLabel = (authUser && authUser.name) ? authUser.name : 'Your Plan';

  return (
    <div style={{ padding: '24px 28px', background: '#F9FAFB', minHeight: '100%' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: '#111827', margin: '0 0 3px' }}>Portfolio</h1>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          {planLabel} · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          {(unassigned || []).length > 0 && (
            <span style={{ marginLeft: 12, color: '#DC2626', fontWeight: 500 }}>
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
      <BucketAllocation buckets={buckets} totalPort={totalPort} fmtFull={fmt} assets={assets} />

      {/* 4. What's in Each Bucket */}
      <BucketHoldings assets={assets} />
    </div>
  );
}
