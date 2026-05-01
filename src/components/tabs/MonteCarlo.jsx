import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
         LineChart, Line } from 'recharts';
import SCENARIO_PRESETS from '../../data/scenarioPresets.js';

export default function MonteCarloTab({ ctx }) {
  var { pctData, bucketPctData, successRate, successColor, fmtC,
        BORDER, BORDER2, TTip,
        scenarios, activeScen, loadScen, createPresetScenario } = ctx;

  function handlePresetClick(preset) {
    var existing = (scenarios || []).find(function(s) {
      return s.name === preset.defaultName || s.name === preset.label;
    });
    if (existing) {
      loadScen(existing);
    } else {
      createPresetScenario(preset);
    }
  }

  var activePreset = SCENARIO_PRESETS.find(function(p) {
    return activeScen === p.label || activeScen === p.defaultName;
  });

  return (
    <div style={{ padding: '24px 28px', background: 'var(--rs-bg-page)', minHeight: '100%' }}>
      <h1 style={{ fontFamily: 'var(--rs-font-display)', fontSize: 28, color: '#222222', marginBottom: 4, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 0 }}>Stress Test</h1>
      <p style={{ fontSize: 12, color: '#5F6368', marginBottom: 20 }}>500 simulations · bucket strategy with dividend refill, TIPS-first sequencing, market-condition-aware equity sales</p>

      {/* Scenario selector */}
      <div style={{ background: '#FCFBF8', border: '1px solid #D4D1C5', borderTop: '3px solid #0A4D54', borderRadius: '8px', padding: '16px 20px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#5F6368', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Scenario</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: activePreset && activePreset.scenarioInsight ? 12 : 0 }}>
          {SCENARIO_PRESETS.map(function(preset) {
            var isActive = activeScen === preset.label || activeScen === preset.defaultName;
            return (
              <button
                key={preset.id}
                onClick={function() { handlePresetClick(preset); }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  border: isActive ? 'none' : '1px solid #D4D1C5',
                  background: isActive ? '#0A4D54' : '#F8F7F4',
                  color: isActive ? '#FFFFFF' : '#222222',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        {activePreset && activePreset.scenarioInsight && (
          <div style={{ fontSize: 13, color: '#5F6368', lineHeight: 1.5, borderTop: '1px solid #F0EDE8', paddingTop: 10 }}>
            {activePreset.scenarioInsight}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          ['Success Rate', successRate + '%', successColor],
          ['Median Final', fmtC(pctData.length > 0 ? pctData[pctData.length - 1].p50 : 0), '#0A4D54'],
          ['90th Pct',     fmtC(pctData.length > 0 ? pctData[pctData.length - 1].p90 : 0), '#3D6337'],
          ['10th Pct',     fmtC(pctData.length > 0 ? pctData[pctData.length - 1].p10 : 0), '#8B3528'],
        ].map(function(item) {
          return (
            <div key={item[0]} style={{ background: item[2] + '12', border: '1px solid ' + item[2] + '30', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 22, color: item[2], fontWeight: 700 }}>{item[1]}</div>
              <div style={{ fontSize: 9, color: '#5F6368', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{item[0]}</div>
            </div>
          );
        })}
      </div>

      {/* Total Portfolio percentile bands */}
      <div style={{ background: '#FCFBF8', border: '1px solid #D4D1C5', borderTop: '3px solid #0A4D54', borderRadius: '8px', padding: '20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 15, color: '#222222', marginBottom: 4, fontWeight: 600 }}>Total Portfolio — Percentile Bands</h3>
        <p style={{ fontSize: 12, color: '#5F6368', marginBottom: 14, lineHeight: 1.5 }}>Shaded bands show 10th–90th percentile range. Bear years: cash + TIPS only. Good years: trim equities, rebalance to Bucket 1.</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={pctData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <defs>
              {[['gp90','#4A9E8E'],['gp75','#3D6337'],['gp50','#0A4D54'],['gp25','#8A5515'],['gp10','#8B3528']].map(function(g) {
                return (
                  <linearGradient key={g[0]} id={g[0]} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={g[1]} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={g[1]} stopOpacity={0.02}/>
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
            <XAxis dataKey="year" stroke={BORDER2} tick={{ fontSize: 10, fill: '#5F6368' }}/>
            <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{ fontSize: 10, fill: '#5F6368' }}/>
            <Tooltip content={<TTip/>}/>
            <Legend wrapperStyle={{ fontSize: 11, color: '#5F6368' }}/>
            {[['p90','#4A9E8E','gp90','90th %ile'],['p75','#3D6337','gp75','75th %ile'],['p50','#0A4D54','gp50','Median'],['p25','#8A5515','gp25','25th %ile'],['p10','#8B3528','gp10','10th %ile']].map(function(s) {
              return <Area key={s[0]} type="monotone" dataKey={s[0]} stroke={s[1]} fill={'url(#' + s[2] + ')'} strokeWidth={s[0] === 'p50' ? 2.5 : 1.5} name={s[3]} fillOpacity={1} style={{ fillOpacity: 1 }} isAnimationActive={false}/>;
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Median Bucket Trajectories */}
      {bucketPctData && bucketPctData.length > 0 && (
        <div style={{ background: '#FCFBF8', border: '1px solid #D4D1C5', borderTop: '3px solid #0A4D54', borderRadius: '8px', padding: '20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: 15, color: '#222222', marginBottom: 4, fontWeight: 600 }}>Median Bucket Trajectories</h3>
          <p style={{ fontSize: 12, color: '#5F6368', marginBottom: 14, lineHeight: 1.5 }}>Median balance of each bucket — shows SORR protection in action. Bucket 1 depletes first, Bucket 3 grows longest.</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={bucketPctData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <defs>
                {[['gb1','#4A9E8E'],['gb2','#3D6337'],['gb3','#0A4D54']].map(function(g) {
                  return (
                    <linearGradient key={g[0]} id={g[0]} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={g[1]} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={g[1]} stopOpacity={0.02}/>
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER}/>
              <XAxis dataKey="year" stroke={BORDER2} tick={{ fontSize: 10, fill: '#5F6368' }}/>
              <YAxis tickFormatter={fmtC} stroke={BORDER2} tick={{ fontSize: 10, fill: '#5F6368' }}/>
              <Tooltip content={<TTip/>}/>
              <Legend wrapperStyle={{ fontSize: 11, color: '#5F6368' }}/>
              <Area type="monotone" dataKey="b1" stroke="#4A9E8E" fill="url(#gb1)" strokeWidth={2} name="Bucket 1 (Cash)"   fillOpacity={1} style={{ fillOpacity: 1 }} isAnimationActive={false}/>
              <Area type="monotone" dataKey="b2" stroke="#3D6337" fill="url(#gb2)" strokeWidth={2} name="Bucket 2 (Income)" fillOpacity={1} style={{ fillOpacity: 1 }} isAnimationActive={false}/>
              <Area type="monotone" dataKey="b3" stroke="#0A4D54" fill="url(#gb3)" strokeWidth={2} name="Bucket 3 (Growth)" fillOpacity={1} style={{ fillOpacity: 1 }} isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
