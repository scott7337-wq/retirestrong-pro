import React, { useMemo, useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import { ssIncomeForYear } from '../../engine/social-security.js';

function drawGauge(canvas, pct, color) {
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  var W = 110, H = 66;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  var cx = W / 2, cy = H - 6, r = 44;
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke();
  var fill = Math.min(pct, 1.1);
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * (1 + fill), false);
  ctx.strokeStyle = color; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(Math.round(pct * 100) + '%', cx, cy - 18);
}

export default function DashboardTab({ ctx }) {
  var { derivedTotals, bucketCfg, totalPort, assets, successRate,
        mcPercentiles, cashFlow, inp, dataSource, setActiveTab } = ctx;

  var donutRef = useRef(null);
  var gauge1Ref = useRef(null);
  var gauge2Ref = useRef(null);
  var gauge3Ref = useRef(null);
  var mcRef = useRef(null);
  var cfRef = useRef(null);
  var donutChartRef = useRef(null);
  var mcChartRef = useRef(null);
  var cfChartRef = useRef(null);

  var byClass = useMemo(function() {
    var cash = 0, tips = 0, div = 0, equity = 0, intl = 0;
    assets.forEach(function(a) {
      var t = a.type || '';
      if (t === 'Cash' || t === 'CD' || t === 'T-Note' || t === 'T-Bill' || t === 'I-Bond') cash += a.amount;
      else if (t === 'TIPS' || t === 'Bond ETF') tips += a.amount;
      else if (t === 'Dividend ETF' || t === 'REIT ETF') div += a.amount;
      else if (t === 'Equity ETF') equity += a.amount;
      else if (t === 'Intl Equity') intl += a.amount;
    });
    return { cash, tips, div, equity, intl };
  }, [assets]);

  var byAccount = useMemo(function() {
    var taxable = 0, ira = 0, roth = 0;
    assets.forEach(function(a) {
      var acct = a.account || '';
      if (acct === 'Taxable') taxable += a.amount;
      else if (acct === 'IRA') ira += a.amount;
      else if (acct === 'Roth IRA' || acct === 'Roth 401k') roth += a.amount;
    });
    return { taxable, ira, roth };
  }, [assets]);

  var b1cfg = bucketCfg.find(function(b) { return b.id === 1; }) || { target: 259000 };
  var b2cfg = bucketCfg.find(function(b) { return b.id === 2; }) || { target: 569000 };
  var b3cfg = bucketCfg.find(function(b) { return b.id === 3; }) || { target: 820500 };
  var b1actual = assets.filter(function(a) { return a.bucket === 1; }).reduce(function(s, a) { return s + a.amount; }, 0);
  var b2actual = assets.filter(function(a) { return a.bucket === 2; }).reduce(function(s, a) { return s + a.amount; }, 0);
  var b3actual = assets.filter(function(a) { return a.bucket === 3; }).reduce(function(s, a) { return s + a.amount; }, 0);
  var b1pct = b1cfg.target > 0 ? b1actual / b1cfg.target : 0;
  var b2pct = b2cfg.target > 0 ? b2actual / b2cfg.target : 0;
  var b3pct = b3cfg.target > 0 ? b3actual / b3cfg.target : 0;

  var currentMagi = useMemo(function() {
    var ss = ssIncomeForYear(inp, 2026) * 0.85;
    var ira = Math.max(0, inp.monthlyExpenses * 12 - ssIncomeForYear(inp, 2026));
    return Math.round(ss + ira);
  }, [inp]);
  var irmaaLimit = 212000;
  var irmaaHeadroom = Math.max(0, irmaaLimit - currentMagi);
  var irmaaSafe = currentMagi < irmaaLimit;

  var cf2026 = cashFlow.find(function(r) { return r.year === 2026; });

  var monthlyNeed = inp.monthlyExpenses;
  var monthlyHC = Math.round((inp.healthPhase1Annual || 27896) / 12);
  var monthlyTotal = monthlyNeed + monthlyHC;
  var spaxx = assets.find(function(a) { return a.name && a.name.includes('SPAXX') && a.account === 'Taxable'; });
  var spaxxBal = spaxx ? Math.round(spaxx.amount) : 33589;

  var srNum = parseFloat(successRate);
  var srColor = srNum >= 85 ? '#059669' : srNum >= 75 ? '#f59e0b' : '#e24b4a';
  var srBg = srNum >= 85 ? '#fff7ed' : srNum >= 75 ? '#fef3c7' : '#fff1f2';
  var srBorder = srNum >= 85 ? '#fed7aa' : srNum >= 75 ? '#fde68a' : '#fecdd3';

  function fmtK(v) { return '$' + (v >= 1000000 ? (v / 1000000).toFixed(2) + 'M' : v >= 1000 ? Math.round(v / 1000) + 'K' : Math.round(v)); }
  function pillStyle(type) {
    if (type === 'green') return { display:'inline-block', fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#d1fae5', color:'#065f46' };
    if (type === 'amber') return { display:'inline-block', fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#fef3c7', color:'#92400e' };
    if (type === 'red')   return { display:'inline-block', fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#fee2e2', color:'#991b1b' };
    if (type === 'blue')  return { display:'inline-block', fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:'#dbeafe', color:'#1e40af' };
    return {};
  }

  useEffect(function() {
    if (!donutRef.current) return;
    var ex = Chart.getChart(donutRef.current); if (ex) ex.destroy();
    if (donutChartRef.current) { donutChartRef.current.destroy(); donutChartRef.current = null; }
    donutChartRef.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [byClass.cash, byClass.tips, byClass.div, byClass.equity, byClass.intl],
          backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#f97316', '#ec4899'],
          borderWidth: 3, borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '65%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return ' ' + fmtK(c.parsed); } } } }
      }
    });
    return function() { if (donutChartRef.current) { donutChartRef.current.destroy(); donutChartRef.current = null; } };
  }, [byClass]);

  useEffect(function() {
    drawGauge(gauge1Ref.current, b1pct, '#10b981');
    drawGauge(gauge2Ref.current, b2pct, '#059669');
    drawGauge(gauge3Ref.current, b3pct, '#0d9488');
  }, [b1pct, b2pct, b3pct]);

  useEffect(function() {
    if (!mcRef.current || !mcPercentiles) return;
    var ex = Chart.getChart(mcRef.current); if (ex) ex.destroy();
    if (mcChartRef.current) { mcChartRef.current.destroy(); mcChartRef.current = null; }
    var gridC = 'rgba(0,0,0,0.06)', txtC = '#64748b';
    mcChartRef.current = new Chart(mcRef.current, {
      type: 'line',
      data: {
        labels: mcPercentiles.labels,
        datasets: [
          { data: mcPercentiles.p90, fill: false, borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { data: mcPercentiles.p75, fill: '-1', backgroundColor: 'rgba(139,92,246,0.22)', borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { data: mcPercentiles.p50, fill: '-1', backgroundColor: 'rgba(99,102,241,0.18)', borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { label: 'Median', data: mcPercentiles.p50, fill: false, borderColor: '#10b981', borderWidth: 2, pointRadius: 0, tension: 0.4 },
          { data: mcPercentiles.p25, fill: false, borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { data: mcPercentiles.p10, fill: '-1', backgroundColor: 'rgba(226,75,74,0.15)', borderColor: 'transparent', pointRadius: 0, tension: 0.4 },
          { label: '25th', data: mcPercentiles.p25, fill: false, borderColor: '#f97316', borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, tension: 0.4 },
          { label: '10th', data: mcPercentiles.p10, fill: false, borderColor: '#e24b4a', borderWidth: 1.5, pointRadius: 0, tension: 0.4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: function(c) { if (['Median', '25th', '10th'].includes(c.dataset.label)) return c.dataset.label + ': $' + c.parsed.y + 'K'; return null; } } } },
        scales: {
          x: { grid: { color: gridC }, ticks: { color: txtC, font: { size: 9 } }, title: { display: true, text: 'Age', color: txtC, font: { size: 9 } } },
          y: { grid: { color: gridC }, ticks: { color: txtC, font: { size: 9 }, callback: function(v) { return '$' + v + 'K'; } }, min: 0 }
        }
      }
    });
    return function() { if (mcChartRef.current) { mcChartRef.current.destroy(); mcChartRef.current = null; } };
  }, [mcPercentiles]);

  useEffect(function() {
    if (!cfRef.current || !cashFlow || cashFlow.length === 0) return;
    var ex = Chart.getChart(cfRef.current); if (ex) ex.destroy();
    if (cfChartRef.current) { cfChartRef.current.destroy(); cfChartRef.current = null; }
    var gridC = 'rgba(0,0,0,0.06)', txtC = '#64748b';
    var labels = cashFlow.map(function(r) { return String(r.year); });
    var iraData = cashFlow.map(function(r) { return Math.round(r.iraBalance / 1000); });
    var rothData = cashFlow.map(function(r) { return Math.round(r.rothBalance / 1000); });
    var expData = cashFlow.map(function(r) { return Math.round(r.expenses / 1000); });
    var totalData = cashFlow.map(function(r) { return Math.round(r.balance / 1000); });
    cfChartRef.current = new Chart(cfRef.current, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Expenses', data: expData, borderColor: '#e24b4a', borderWidth: 1.5, fill: false, pointRadius: 0, tension: 0.4 },
          { label: 'IRA', data: iraData, borderColor: '#6366f1', borderWidth: 2, fill: false, pointRadius: 0, tension: 0.4 },
          { label: 'Roth', data: rothData, borderColor: '#8b5cf6', borderWidth: 1.5, fill: true, backgroundColor: 'rgba(139,92,246,0.07)', pointRadius: 0, tension: 0.4 },
          { label: 'Total', data: totalData, borderColor: '#10b981', borderWidth: 2.5, fill: false, pointRadius: 0, tension: 0.4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: function(c) { return c.dataset.label + ': $' + c.parsed.y + 'K'; } } } },
        scales: {
          x: { grid: { color: gridC }, ticks: { color: txtC, font: { size: 9 }, maxTicksLimit: 8, autoSkip: true } },
          y: { grid: { color: gridC }, ticks: { color: txtC, font: { size: 9 }, callback: function(v) { return '$' + v + 'K'; } }, min: 0 }
        }
      }
    });
    return function() { if (cfChartRef.current) { cfChartRef.current.destroy(); cfChartRef.current = null; } };
  }, [cashFlow]);

  var card = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '13px 15px' };
  var lbl = { fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 7px' };

  return (
    <div style={{ fontFamily: "'Source Sans 3', sans-serif" }}>

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#0f172a' }}>Dashboard</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>Scott &amp; Stacey · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={pillStyle('green')}>{dataSource === 'database' ? 'Live from DB' : 'Offline defaults'}</span>
        </div>
      </div>

      {/* ── ROW 1: Asset donut + Bucket gauges ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: 10, marginBottom: 10 }}>

        {/* Asset class donut */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
            <p style={lbl}>Portfolio composition</p>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#059669' }}>{fmtK(totalPort)}</span>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>{assets.length} holdings · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 110, height: 110, flexShrink: 0 }}>
              <canvas ref={donutRef} style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Cash & Near-Cash', byClass.cash, '#10b981'],
                ['TIPS / Inflation', byClass.tips, '#6366f1'],
                ['Dividend / REIT', byClass.div, '#f59e0b'],
                ['Equity ETF', byClass.equity, '#f97316'],
                ['International', byClass.intl, '#ec4899'],
              ].map(function(item) {
                return (
                  <div key={item[0]} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: item[2], display: 'inline-block', flexShrink: 0 }}></span>
                      {item[0]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{fmtK(item[1])}</span>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 4, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#64748b' }}>IRA {fmtK(byAccount.ira)}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Roth {fmtK(byAccount.roth)}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Taxable {fmtK(byAccount.taxable)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bucket gas gauges */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ ...lbl, margin: 0 }}>Bucket health — vs targets</p>
            <span style={{ fontSize: 10, color: '#64748b' }}>Bear rule active · use B1 only</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 8 }}>
            {[
              { label: 'B1 · Cash', ref: gauge1Ref, actual: b1actual, target: b1cfg.target, pct: b1pct, color: '#10b981', sub: Math.round(b1actual / (inp.monthlyExpenses * 12 + (inp.healthPhase1Annual || 27896)) * 10) / 10 + ' yrs' },
              { label: 'B2 · Income', ref: gauge2Ref, actual: b2actual, target: b2cfg.target, pct: b2pct, color: '#059669', sub: 'SCHD sweeping' },
              { label: 'B3 · Growth', ref: gauge3Ref, actual: b3actual, target: b3cfg.target, pct: b3pct, color: '#0d9488', sub: 'VTI + VXUS' },
            ].map(function(g) {
              var pillType = g.pct >= 0.9 ? 'green' : g.pct >= 0.75 ? 'amber' : 'red';
              return (
                <div key={g.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g.label}</div>
                  <canvas ref={g.ref} style={{ display: 'block', margin: '0 auto' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{fmtK(g.actual)}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>target {fmtK(g.target)}</div>
                  <span style={{ ...pillStyle(pillType), marginTop: 4, display: 'inline-block' }}>{Math.round(g.pct * 100)}%</span>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{g.sub}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: '#991b1b', background: '#fee2e2', borderRadius: 6, padding: '6px 10px' }}>
            Bear market rule active — draw from B1 cash only. Do not sell B2/B3 equity in down market.
          </div>
        </div>
      </div>

      {/* ── ROW 2: Monte Carlo + Tax/IRMAA ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)', gap: 10, marginBottom: 10 }}>

        {/* Monte Carlo */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <p style={{ ...lbl, margin: 0 }}>Monte Carlo simulation</p>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 7 }}>500 simulations · bucket strategy · market-condition-aware</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6, marginBottom: 8 }}>
            {[
              { val: successRate + '%', label: 'Success rate', bg: srBg, border: srBorder, color: srColor },
              { val: cf2026 ? fmtK(cashFlow[Math.floor(cashFlow.length / 2)].balance) : '—', label: 'Median final', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
              { val: mcPercentiles ? fmtK(mcPercentiles.p90[mcPercentiles.p90.length - 1] * 1000) : '—', label: '90th pct', bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed' },
              { val: mcPercentiles ? fmtK(mcPercentiles.p10[mcPercentiles.p10.length - 1] * 1000) : '—', label: '10th pct', bg: '#fff1f2', border: '#fecdd3', color: '#e11d48' },
            ].map(function(t) {
              return (
                <div key={t.label} style={{ background: t.bg, border: '1px solid ' + t.border, borderRadius: 8, padding: '7px 9px' }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: t.color }}>{t.val}</div>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.color, opacity: 0.7, marginTop: 1 }}>{t.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 148 }}>
            <canvas ref={mcRef} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {[['#e24b4a','10th %ile'],['#f97316','25th %ile'],['#6366f1','75th %ile'],['#8b5cf6','90th %ile'],['#10b981','Median']].map(function(d) {
              return <span key={d[1]} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d[0], display: 'inline-block' }}></span>{d[1]}</span>;
            })}
          </div>
          <button onClick={function() { setActiveTab('monte'); }} style={{ marginTop: 6, fontSize: 10, padding: '4px 9px', cursor: 'pointer', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b' }}>Explore Monte Carlo tab →</button>
        </div>

        {/* Tax / IRMAA */}
        <div style={{ ...card, border: '1px solid #6ee7b7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ ...lbl, margin: 0 }}>Tax &amp; IRMAA · {new Date().getFullYear()}</p>
            <span style={pillStyle(irmaaSafe ? 'green' : 'red')}>{irmaaSafe ? 'Safe zone' : 'IRMAA risk'}</span>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', height: 16, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: '14%', background: '#bbf7d0' }}></div>
              <div style={{ width: '24%', background: '#34d399' }}></div>
              <div style={{ width: '22%', background: '#059669' }}></div>
              <div style={{ width: '20%', background: '#0f766e' }}></div>
              <div style={{ width: '20%', background: '#d1d5db' }}></div>
            </div>
            <div style={{ display: 'flex', fontSize: 9, color: '#64748b', marginTop: 2, justifyContent: 'space-between' }}>
              <span>10%</span><span>12%</span><span>22%</span><span>24%</span><span>32%+</span>
            </div>
          </div>
          <div style={{ position: 'relative', height: 22, marginBottom: 8 }}>
            <div style={{ position: 'absolute', left: '29%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 2, height: 12, background: '#1e293b', borderRadius: 1 }}></div>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', marginTop: 1 }}>You {fmtK(currentMagi)}</span>
            </div>
            <div style={{ position: 'absolute', left: '73%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 2, height: 12, background: '#e24b4a', borderRadius: 1, opacity: 0.7 }}></div>
              <span style={{ fontSize: 9, color: '#991b1b', whiteSpace: 'nowrap', marginTop: 1 }}>IRMAA $212K</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {[
              { label: 'Est. MAGI', val: fmtK(currentMagi), color: '#0f172a' },
              { label: 'Headroom', val: fmtK(irmaaHeadroom), color: '#059669' },
              { label: 'Bracket', val: '22% fed', color: '#0f172a' },
              { label: '2027 conv.', val: '$100K fits', color: '#059669' },
            ].map(function(t) {
              return (
                <div key={t.label} style={{ background: '#f8fafc', borderRadius: 7, padding: '7px 9px' }}>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{t.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: t.color }}>{t.val}</div>
                </div>
              );
            })}
          </div>
          <button onClick={function() { setActiveTab('roth'); }} style={{ marginTop: 8, fontSize: 10, padding: '4px 9px', cursor: 'pointer', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', width: '100%' }}>Optimize 2027 conversion →</button>
        </div>
      </div>

      {/* ── ROW 3: Cash flow + Monthly withdrawal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 10, marginBottom: 10 }}>

        {/* Cash flow mini chart */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ ...lbl, margin: 0 }}>Cash flow projection · 2026–{2026 + (inp.lifeExpectancy - inp.currentAge)}</p>
            <button onClick={function() { setActiveTab('cashflow'); }} style={{ fontSize: 10, padding: '3px 8px', cursor: 'pointer', borderRadius: 5, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b' }}>Full tab →</button>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>IRA · Roth · Total balance trajectories to age {inp.lifeExpectancy}</div>
          <div style={{ position: 'relative', height: 130 }}>
            <canvas ref={cfRef} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
            {[['#e24b4a','Expenses'],['#6366f1','IRA'],['#8b5cf6','Roth'],['#10b981','Total']].map(function(d) {
              return <span key={d[1]} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d[0], display: 'inline-block' }}></span>{d[1]}</span>;
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 8 }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>2026</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Age {inp.currentAge}</span>
              </div>
              <div style={{ fontSize: 10, color: '#374151', marginTop: 3, lineHeight: 1.5 }}>No conversion. W-2 fills bracket. Fund gap from B1 cash.</div>
            </div>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>2027</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>Age {inp.currentAge + 1}</span>
              </div>
              <div style={{ fontSize: 10, color: '#374151', marginTop: 3, lineHeight: 1.5 }}>Prime conversion year. $100K at 22%. MAGI under $212K.</div>
            </div>
          </div>
        </div>

        {/* Monthly withdrawal decision */}
        <div style={{ ...card, border: '1px solid #93c5fd' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <p style={{ ...lbl, margin: 0 }}>This month · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <span style={pillStyle('blue')}>Decision</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 7 }}>
            Need: <strong style={{ color: '#0f172a' }}>{fmtK(monthlyNeed)}</strong> + <strong style={{ color: '#0f172a' }}>{fmtK(monthlyHC)}</strong> HC = <strong style={{ color: '#0f172a' }}>{fmtK(monthlyTotal)}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
            <div style={{ border: '1.5px solid #059669', borderRadius: 7, padding: '7px 10px', background: '#f0fdf4' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46' }}>Use B1 liquid cash</div>
              <div style={{ fontSize: 10, color: '#059669', marginTop: 1 }}>SPAXX {fmtK(spaxxBal)} · B1 {Math.round(b1pct * 100)}% funded</div>
              <span style={{ ...pillStyle('green'), marginTop: 3, display: 'inline-block' }}>Recommended now</span>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>Trim B3 if VTI &gt; prior peak</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>Only in up market — check B3 gauge before selling</div>
              <span style={{ ...pillStyle('amber'), marginTop: 3, display: 'inline-block' }}>Market-conditional</span>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>SCHD dividend sweep</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>~{fmtK(Math.round(derivedTotals.iraDividend * 0.038 / 12))} auto to B1 this month</div>
              <span style={{ ...pillStyle('blue'), marginTop: 3, display: 'inline-block' }}>Auto</span>
            </div>
          </div>
          <button onClick={function() { setActiveTab('cashflow'); }} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 14 }}>?</span> Go to Cash Flow tab for details →
          </button>
        </div>
      </div>

      {/* ── ROW 4: Risks + Opportunities + Next Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>

        {/* Risks */}
        <div style={card}>
          <p style={lbl}>Risks</p>
          {[
            { dot: '#e24b4a', title: 'ACA premiums', sub: '$27.9k/yr until Medicare · 2 yrs' },
            { dot: '#f59e0b', title: 'Sequence-of-returns', sub: 'B1 buffer covers ~' + Math.round(b1actual / (inp.monthlyExpenses * 12 + (inp.healthPhase1Annual || 27896)) * 10) / 10 + ' yrs' },
            { dot: '#f59e0b', title: 'RMD at age 73', sub: '2032: forced IRA withdrawal · IRMAA exposure' },
          ].map(function(r) {
            return (
              <div key={r.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, display: 'inline-block', flexShrink: 0, marginTop: 3 }}></span>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{r.title}</div><div style={{ fontSize: 10, color: '#64748b' }}>{r.sub}</div></div>
              </div>
            );
          })}
          <button onClick={function() { setActiveTab('monte'); }} style={{ marginTop: 7, fontSize: 10, padding: '4px 9px', cursor: 'pointer', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', width: '100%' }}>See stress tests →</button>
        </div>

        {/* Opportunities */}
        <div style={card}>
          <p style={lbl}>Opportunities</p>
          {[
            { dot: '#059669', title: '2027 Roth conversion', sub: '$100K at 22% · ' + fmtK(irmaaHeadroom) + ' IRMAA room' },
            { dot: '#059669', title: 'CD maturities 2026', sub: 'Toyota $50K + Wells $25K · reinvest or use' },
            { dot: '#0ea5e9', title: 'QCDs start at 70', sub: '$15K/yr from IRA · offsets RMD + cuts taxes' },
          ].map(function(r) {
            return (
              <div key={r.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, display: 'inline-block', flexShrink: 0, marginTop: 3 }}></span>
                <div><div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{r.title}</div><div style={{ fontSize: 10, color: '#64748b' }}>{r.sub}</div></div>
              </div>
            );
          })}
          <button onClick={function() { setActiveTab('roth'); }} style={{ marginTop: 7, fontSize: 10, padding: '4px 9px', cursor: 'pointer', borderRadius: 6, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', width: '100%' }}>See conversion optimizer →</button>
        </div>

        {/* Next actions */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <p style={lbl}>Next actions</p>
            {[
              { color: '#059669', title: '2027 Roth conversion', sub: '$100K · 8 months · ~$24K tax cost' },
              { color: '#0ea5e9', title: 'CD reinvestment', sub: 'Toyota $50K matures Aug · 4 months' },
              { color: '#d1d5db', title: 'Medicare enrollment', sub: 'Nov 2027 · 19 months away' },
            ].map(function(r) {
              return (
                <div key={r.title} style={{ borderLeft: '3px solid ' + r.color, paddingLeft: 9, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{r.sub}</div>
                </div>
              );
            })}
          </div>
          <button onClick={function() { setActiveTab('summary'); }} style={{ marginTop: 10, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span>★</span> Get full AI analysis →
          </button>
        </div>
      </div>

    </div>
  );
}
