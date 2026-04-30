import React from 'react';
import { primarySSForYear, spouseSSForYear } from '../../engine/social-security.js';
import { effectiveTax } from '../../engine/tax.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function IncomeTaxTab({ ctx }) {
  var { inp, inpWithAssets, thisYear, updateThisYear, setField, fmtC, fmtFull,
        BORDER, BORDER2, TTip } = ctx;
  var authCtx = useAuth();
  var authUser = authCtx ? authCtx.user : null;
  var planLabel = (authUser && authUser.name) ? authUser.name : 'Your Plan';

  var CARD     = { background: '#FFFFFF', border: '1px solid #E8E4DC', borderTop: '3px solid #0A4D54', borderRadius: '12px', padding: '18px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' };
  var CARD_TAX = { background: '#FFFFFF', border: '1px solid #E8E4DC', borderTop: '3px solid #8A5515', borderRadius: '12px', padding: '18px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' };
  var CARD_RED = { background: '#FFFFFF', border: '1px solid #E8E4DC', borderTop: '3px solid #8B3528', borderRadius: '12px', padding: '18px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' };

  return (
    <div style={{ padding: '24px 28px', background: '#F5F3EF', minHeight: '100%' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--rs-font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--rs-text-primary)', margin: '0 0 3px' }}>Income &amp; Tax</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {planLabel} · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Year:</label>
          <select
            value={inp.trackingYear || 2026}
            onChange={function(e) { setField('trackingYear', e.target.value); }}
            style={{ background: '#F8F7F4', border: '1px solid #E8E4DC', borderRadius: 7, padding: '7px 12px', color: '#1A1A1A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {Array.from({ length: 15 }, function(_, i) { return 2026 + i; }).map(function(yr) {
              return <option key={yr} value={yr}>{yr}</option>;
            })}
          </select>
        </div>
      </div>

      {(function() {
        var tYear = inp.trackingYear || 2026;
        var is2026 = tYear === 2026;
        var incFields = is2026 ? [
          { label: 'W-2 Income (Jan-Apr 10)', key: 'incW2',        color: '#3D6337' },
          { label: 'Severance (Net)',          key: 'incSeverance', color: '#0A4D54' },
          { label: 'IRA Distributions',        key: 'incIRA',       color: '#8A5515' },
          { label: 'Roth Conversions',         key: 'incRothConv',  color: '#5B6FA6' },
          { label: 'Other Taxable Income',     key: 'incOther',     color: '#6B7280' },
        ] : [
          { label: 'IRA Distributions',              key: 'incIRA',       color: '#8A5515' },
          { label: 'Roth Conversions',               key: 'incRothConv',  color: '#5B6FA6' },
          { label: 'Taxable Interest/Dividends',     key: 'incDividends', color: '#0A4D54' },
          { label: 'Other Taxable Income',           key: 'incOther',     color: '#6B7280' },
        ];

        var totalIncome = incFields.reduce(function(s, f) { return s + (parseFloat(thisYear[f.key]) || 0); }, 0);
        var primarySS = primarySSForYear(inpWithAssets, tYear);
        var spouseSS = spouseSSForYear(inpWithAssets, tYear);
        var ssTaxable = (primarySS + spouseSS) * 0.85;
        var grossTaxable = totalIncome + ssTaxable;
        var stdDed = 29200;
        var taxableInc = Math.max(0, grossTaxable - stdDed);

        var brackets = [
          { name: '10%', top: 23200,  color: '#3D6337' },
          { name: '12%', top: 94300,  color: '#0A4D54' },
          { name: '22%', top: 201050, color: '#8A5515' },
          { name: '24%', top: 383900, color: '#8B3528' },
        ];

        var currentBracket = '10%';
        for (var bi = brackets.length - 1; bi >= 0; bi--) {
          if (taxableInc > (bi > 0 ? brackets[bi - 1].top : 0)) { currentBracket = brackets[bi].name; break; }
        }

        var room12 = Math.max(0, 94300 - taxableInc);
        var room22 = Math.max(0, 201050 - taxableInc);
        var irmaaSafe = Math.max(0, 212000 - grossTaxable);
        var safeConv = Math.min(room22, irmaaSafe);

        var estFedTax = effectiveTax(grossTaxable, 'married');
        var estStateTax = Math.max(0, (totalIncome - stdDed)) * 0.025;

        // MAGI-equivalent bracket thresholds (taxable income top + std deduction)
        var magiThresholds = [
          { name: '10%', top: 52400,  color: '#3D6337' },
          { name: '12%', top: 123500, color: '#0A4D54' },
          { name: '22%', top: 230250, color: '#8A5515' },
          { name: '24%', top: 413100, color: '#8B3528' },
        ];
        var magiMax = 260000;
        var magiPct = Math.min((grossTaxable / magiMax) * 100, 100);
        var irmaaPct = Math.min((212000 / magiMax) * 100, 100);
        var currentMagiBracket = magiThresholds[0];
        for (var mi = magiThresholds.length - 1; mi >= 0; mi--) {
          if (grossTaxable > (mi > 0 ? magiThresholds[mi - 1].top : 0)) {
            currentMagiBracket = magiThresholds[mi];
            break;
          }
        }

        return (
          <div>
            {/* Tax Bracket Thermometer */}
            <div style={CARD_TAX}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', margin: 0 }}>Tax Position — {tYear}</h2>
                <span style={{ fontSize: 12, color: '#6B7280' }}>MAGI view · bracket segments show gross thresholds</span>
              </div>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: 6 }}>
                MAGI <strong style={{ color: currentMagiBracket.color }}>{(fmtFull || fmtC)(Math.round(grossTaxable))}</strong>
                {' '}· Current bracket: <strong style={{ color: currentMagiBracket.color }}>{currentMagiBracket.name}</strong>
                {grossTaxable > 212000 && <span style={{ color: '#8B3528', marginLeft: 8 }}>⚠ IRMAA triggered</span>}
              </p>

              {/* Bracket bar */}
              <div style={{ position: 'relative', height: 52, background: '#F0EDE8', borderRadius: 10, overflow: 'visible', marginBottom: 28 }}>
                {/* Bracket segments */}
                {magiThresholds.map(function(b, bi) {
                  var prevTop = bi > 0 ? magiThresholds[bi - 1].top : 0;
                  var left = (prevTop / magiMax) * 100;
                  var width = Math.min(((b.top - prevTop) / magiMax) * 100, 100 - left);
                  return (
                    <div key={b.name} style={{
                      position: 'absolute', left: left + '%', width: width + '%', height: '100%',
                      background: b.color + '20', borderRight: '2px solid ' + b.color + '50',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 10, color: b.color, fontWeight: 700 }}>{b.name}</span>
                    </div>
                  );
                })}
                {/* IRMAA threshold line */}
                <div style={{ position: 'absolute', left: irmaaPct + '%', top: 0, height: '100%', width: 2, background: '#f59e0b', opacity: 0.8 }}/>
                <div style={{ position: 'absolute', left: irmaaPct + '%', top: '100%', transform: 'translateX(-50%)', fontSize: 9, color: '#f59e0b', fontWeight: 700, whiteSpace: 'nowrap', marginTop: 4 }}>IRMAA $212K</div>
                {/* You are here indicator */}
                <div style={{ position: 'absolute', left: magiPct + '%', top: 0, height: '100%', width: 3, background: '#8B3528', borderRadius: 2, zIndex: 10 }}/>
                <div style={{ position: 'absolute', left: magiPct + '%', top: '100%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', marginTop: 4 }}>
                  <div style={{ background: '#8B3528', color: 'white', borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700, textAlign: 'center' }}>
                    You are here
                  </div>
                  <div style={{ fontSize: 10, color: '#8B3528', textAlign: 'center', marginTop: 2 }}>{(fmtFull || fmtC)(Math.round(grossTaxable))}</div>
                </div>
              </div>

              {/* 3 stat boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ background: currentMagiBracket.color + '10', border: '1px solid ' + currentMagiBracket.color + '30', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>MAGI</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: currentMagiBracket.color }}>{(fmtFull || fmtC)(Math.round(grossTaxable))}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Gross taxable income</div>
                </div>
                <div style={{ background: irmaaSafe > 0 ? '#3D633710' : '#8B352810', border: '1px solid ' + (irmaaSafe > 0 ? '#3D637330' : '#8B352830'), borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>IRMAA Headroom</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: irmaaSafe > 0 ? '#3D6337' : '#8B3528' }}>{irmaaSafe > 0 ? (fmtFull || fmtC)(Math.round(irmaaSafe)) : 'Over limit'}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Until $212K threshold</div>
                </div>
                <div style={{ background: safeConv > 5000 ? '#0A4D5410' : '#9CA3AF10', border: '1px solid ' + (safeConv > 5000 ? '#0A4D5430' : '#9CA3AF30'), borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Optimal Conversion</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: safeConv > 5000 ? '#0A4D54' : '#9CA3AF' }}>{safeConv > 5000 ? (fmtFull || fmtC)(Math.round(safeConv)) : 'None this yr'}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Stay in 22% + IRMAA safe</div>
                </div>
              </div>
            </div>

            {/* Income entry */}
            <div style={CARD}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 16, marginTop: 0 }}>
                Income Sources — {tYear}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
                {incFields.map(function(f) {
                  return (
                    <div key={f.key} style={{ background: f.color + '10', border: '1px solid ' + f.color + '25', borderRadius: 10, padding: 12 }}>
                      <label style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5, fontWeight: 600 }}>
                        {f.label}
                      </label>
                      <input
                        type="number"
                        step={500}
                        value={thisYear[f.key] || ''}
                        placeholder="0"
                        onChange={function(e) { updateThisYear(f.key, e.target.value); }}
                        style={{ width: '100%', background: '#F8F7F4', border: '1px solid #E8E4DC', borderRadius: 6, padding: '7px 10px', color: f.color, fontSize: 15, fontWeight: 700, boxSizing: 'border-box' }}
                      />
                    </div>
                  );
                })}
                {(primarySS > 0 || spouseSS > 0) && (
                  <div style={{ background: '#E8F5F2', border: '1px solid #A7D9D4', borderRadius: 10, padding: 12 }}>
                    <label style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5, fontWeight: 600 }}>
                      Social Security (auto)
                    </label>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0A4D54', padding: '7px 0' }}>
                      {(fmtFull || fmtC)(Math.round(primarySS + spouseSS))}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>Primary: {fmtC(primarySS)} · Spouse: {fmtC(spouseSS)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Tax bracket position */}
            <div style={CARD_TAX}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 6, marginTop: 0 }}>
                Tax Bracket Position — {tYear}
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                Taxable income after ${stdDed.toLocaleString()} standard deduction:{' '}
                <strong style={{ color: '#1A1A1A' }}>{(fmtFull || fmtC)(Math.round(taxableInc))}</strong>
                {' '}· Current bracket:{' '}
                <strong style={{ color: currentBracket === '12%' ? '#0A4D54' : '#8A5515' }}>{currentBracket}</strong>
              </p>
              <div style={{ position: 'relative', height: 36, background: '#F0EDE8', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                {brackets.map(function(b, bi) {
                  var prevTop = bi > 0 ? brackets[bi - 1].top : 0;
                  var maxVis = 250000;
                  var left = (prevTop / maxVis) * 100;
                  var width = ((b.top - prevTop) / maxVis) * 100;
                  return (
                    <div key={b.name} style={{
                      position: 'absolute', left: left + '%', width: Math.min(width, 100 - left) + '%',
                      height: '100%', background: b.color + '20', borderRight: '2px solid ' + b.color + '60',
                    }} title={b.name + ' bracket: up to $' + b.top.toLocaleString()}/>
                  );
                })}
                <div style={{ position: 'absolute', left: Math.min((taxableInc / 250000) * 100, 100) + '%', top: 0, height: '100%', width: 3, background: '#8B3528', borderRadius: 2, zIndex: 10 }}/>
                <div style={{ position: 'absolute', left: Math.min((taxableInc / 250000) * 100, 100) + '%', top: -2, transform: 'translateX(-50%)', background: '#8B3528', color: 'white', borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, zIndex: 11, whiteSpace: 'nowrap' }}>
                  {fmtC(taxableInc)}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280' }}>
                {brackets.map(function(b) {
                  return <span key={b.name} style={{ color: b.color, fontWeight: 600 }}>{b.name}: ${(b.top / 1000).toFixed(0)}K</span>;
                })}
              </div>
            </div>

            {/* Headroom + Tax estimate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={Object.assign({}, CARD, { marginBottom: 0 })}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 14, marginTop: 0 }}>Conversion / Pull Headroom</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[
                    { label: 'Stay in 12%',       value: fmtC(Math.round(room12)),   color: '#0A4D54' },
                    { label: 'Stay in 22%',       value: fmtC(Math.round(room22)),   color: '#8A5515' },
                    { label: 'IRMAA-Safe Room',   value: fmtC(Math.round(irmaaSafe)), color: irmaaSafe > 0 ? '#3D6337' : '#8B3528' },
                    { label: 'Safe to Pull/Convert', value: safeConv > 5000 ? fmtC(Math.round(safeConv)) : '$0', color: safeConv > 5000 ? '#3D6337' : '#8B3528' },
                  ].map(function(item) {
                    return (
                      <div key={item.label} style={{ background: '#F8F7F4', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 20, color: item.color, fontWeight: 700 }}>{item.value}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                  {safeConv > 50000 ? 'Room for a meaningful Roth conversion or IRA pull this year.' :
                   safeConv > 5000 ? 'Limited headroom — small conversion possible, watch IRMAA.' :
                   'No conversion room — income already fills the bracket. Pull from Roth or taxable only.'}
                </div>
              </div>

              <div style={Object.assign({}, CARD_RED, { marginBottom: 0 })}>
                <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 14, marginTop: 0 }}>Estimated Tax — {tYear}</h2>
                {[
                  ['Gross Taxable Income', (fmtFull || fmtC)(Math.round(grossTaxable)), '#3D6337'],
                  ['Standard Deduction',   '-' + (fmtFull || fmtC)(stdDed),             '#0A4D54'],
                  ['Taxable Income',       (fmtFull || fmtC)(Math.round(taxableInc)),   '#1A1A1A'],
                  ['Est Federal Tax',      (fmtFull || fmtC)(Math.round(estFedTax)),    '#8B3528'],
                  ['Est AZ State Tax',     (fmtFull || fmtC)(Math.round(estStateTax)),  '#8A5515'],
                  ['Total Estimated Tax',  (fmtFull || fmtC)(Math.round(estFedTax + estStateTax)), '#8B3528'],
                ].map(function(r) {
                  return (
                    <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0EDE8' }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>{r[0]}</span>
                      <span style={{ fontSize: 14, color: r[2], fontWeight: 600 }}>{r[1]}</span>
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, background: '#F8F7F4', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#6B7280' }}>
                  <strong style={{ color: '#8A5515' }}>IRMAA:</strong>{' '}
                  {tYear} income affects {tYear + 2} Medicare premiums. MAGI: {(fmtFull || fmtC)(Math.round(grossTaxable))}{' '}
                  {grossTaxable > 212000 ? '⚠ Over $212K threshold' : '✓ Under $212K'}
                </div>
              </div>
            </div>

            {/* Where to Pull From */}
            <div style={CARD}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#1A1A1A', marginBottom: 6, marginTop: 0 }}>Where Should You Pull From?</h2>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Based on your {tYear} bracket position and available headroom:</p>
              {(function() {
                var recs = [];
                if (safeConv > 50000) recs.push({ text: 'Room to pull from IRA or do a Roth conversion up to ' + fmtC(Math.round(safeConv)) + ' and stay under IRMAA.', color: '#3D6337', icon: '✓' });
                else if (safeConv > 0) recs.push({ text: 'Limited IRA room (' + fmtC(Math.round(safeConv)) + '). Consider pulling from taxable brokerage instead to preserve headroom.', color: '#8A5515', icon: '⚠' });
                else recs.push({ text: 'No IRA/conversion room this year. Pull from taxable brokerage or Roth (tax-free).', color: '#8B3528', icon: '↩' });
                if (room12 > 0) recs.push({ text: 'You have ' + fmtC(Math.round(room12)) + ' of room left in the 12% bracket before jumping to 22%.', color: '#0A4D54', icon: '↗' });
                recs.push({ text: 'Reserve taxable cash for Roth conversion taxes in future years (2027-2031).', color: '#6B7280', icon: '→' });
                return recs.map(function(r, i) {
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, background: r.color + '08', border: '1px solid ' + r.color + '20', borderRadius: 8, padding: '10px 14px' }}>
                      <span style={{ fontSize: 16, flexShrink: 0, color: r.color }}>{r.icon}</span>
                      <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{r.text}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
