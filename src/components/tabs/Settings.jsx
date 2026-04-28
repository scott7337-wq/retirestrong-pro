import React from 'react';
import { Save, RefreshCw, Edit2, Activity, AlertCircle, Loader } from 'lucide-react';
import SCENARIO_PRESETS from '../../data/scenarioPresets.js';

// ── Settings tab ──────────────────────────────────────────────────────────────
// Extracted from App.jsx (Pro refactor, follows commit a896abb engine extraction).
// Pure UI — no logic changes. All state and helpers flow in as props.
export default function Settings(props) {
  var inp = props.inp;
  var raw = props.raw;
  var setField = props.setField;
  var setActiveTab = props.setActiveTab;
  var scenarios = props.scenarios;
  var setScenarios = props.setScenarios;
  var createPresetScenario = props.createPresetScenario;
  var activeScen = props.activeScen;
  var setShowModal = props.setShowModal;
  var loadScen = props.loadScen;
  var syncToDB = props.syncToDB;
  var saveStatus = props.saveStatus;
  var saveError = props.saveError;
  var derivedTotals = props.derivedTotals;
  var totalPort = props.totalPort;
  var fmtC = props.fmtC;

  // Theme constants (passed in rather than imported to stay consistent with App.jsx)
  var PF = props.PF;
  var SURFACE2 = props.SURFACE2;
  var BORDER = props.BORDER;
  var TXT1 = props.TXT1;
  var TXT2 = props.TXT2;
  var TXT3 = props.TXT3;

  // Defaults for the Reset button
  var DEFAULTS = props.DEFAULTS;
  var DEFAULT_ASSETS = props.DEFAULT_ASSETS;
  var DEFAULT_BUCKET_CONFIG = props.DEFAULT_BUCKET_CONFIG;

  return (
    <div>
      <h2 style={{fontFamily:PF,fontSize:22,color:'#000000',marginBottom:20,fontWeight:800}}>Plan Settings</h2>
      <div style={{background:'rgba(96,165,250,.07)',border:'1px solid rgba(96,165,250,.2)',borderRadius:10,padding:'11px 16px',marginBottom:20,fontSize:12,color:TXT3}}>
        <strong style={{color:'#60a5fa'}}>Note:</strong> Portfolio balances below are auto-calculated from your asset holdings on the Assets tab. To change individual holdings, use the <button onClick={function(){setActiveTab('assets');}} style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',textDecoration:'underline',fontSize:12,padding:0}}>Current Assets tab</button>.
      </div>
      {/* ── High-Impact Assumptions ──────────────────────────────────── */}
      <div style={{border:'2px solid #A7D9D4',borderRadius:12,padding:'16px 18px',marginBottom:24,background:'#FAFFFE'}}>
        <div style={{fontSize:10,color:'#0A4D54',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:14}}>High-Impact Assumptions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
          {[
            {
              key:'monthlyExpenses',label:'Monthly Expenses',step:100,
              impact:'Every $500/mo change shifts your success rate by ~3–5 pts',
              impactColor:'#8A5515',
            },
            {
              key:'ssAge',label:'Your SS Claim Age',step:1,
              impact:'Delaying SS from 62→67 adds ~40% to your monthly benefit',
              impactColor:'#0A4D54',
            },
            {
              key:'growthReturnRate',label:'Growth Equity Return %',step:0.1,
              impact:'A 1% return improvement adds ~$150K over a 20-year horizon',
              impactColor:'#0A4D54',
            },
            {
              key:'healthPhase1Annual',label:'Healthcare Phase 1 Annual $',step:500,
              impact:'Healthcare is the #1 retirement wildcard — model conservatively',
              impactColor:'#8A5515',
            },
          ].map(function(f) {
            var isExp = f.key === 'monthlyExpenses';
            var annualSpending = (inp.monthlyExpenses || 0) * 12;
            var wr = totalPort > 0 ? annualSpending / totalPort : 0;
            var suggestedMonthly = Math.round(totalPort * 0.04 / 12);
            var lifeExp = inp.lifeExpectancy || 90;
            return (
              <div key={f.key} style={{background:'#FFFFFF',border:'1px solid #E8E4DC',borderRadius:8,padding:'12px 14px'}}>
                <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>
                  {isExp ? 'Monthly Expenses · Annual: $' + ((inp.monthlyExpenses || 0) * 12).toLocaleString() : f.label}
                </label>
                <input type="number" step={f.step} className="ri"
                  value={raw[f.key]!==undefined?raw[f.key]:inp[f.key]}
                  onChange={function(e){setField(f.key,e.target.value);}}
                  onBlur={function(e){if(e.target.value===''||e.target.value==='-')setField(f.key,'0');}}
                  style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:7,padding:'8px 11px',color:TXT1,fontSize:12,boxSizing:'border-box',transition:'border-color .2s',marginBottom:6}}/>
                {isExp && wr > 0 && wr < 0.035 && (
                  <div style={{color:'#3D6337',fontSize:11,marginBottom:4,textAlign:'left'}}>✓ Sustainable withdrawal rate ({(wr*100).toFixed(1)}%/yr)</div>
                )}
                {isExp && wr >= 0.035 && wr < 0.05 && (
                  <div style={{color:'#8A5515',fontSize:11,marginBottom:4,textAlign:'left'}}>⚠ Elevated withdrawal rate ({(wr*100).toFixed(1)}%/yr). 4% guideline: ${suggestedMonthly.toLocaleString()}/mo</div>
                )}
                {isExp && wr >= 0.05 && (
                  <div style={{color:'#8B3528',fontSize:11,marginBottom:4,textAlign:'left'}}>✗ High withdrawal rate ({(wr*100).toFixed(1)}%/yr) — may not last to {lifeExp}. 4% suggests ${suggestedMonthly.toLocaleString()}/mo</div>
                )}
                <div style={{fontSize:11,color:f.impactColor,fontStyle:'italic',lineHeight:1.4}}>{f.impact}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:24}}>
        {[
          {title:'Personal',fields:[['Current Age','currentAge',1],['Retirement Age','retirementAge',1],['Life Expectancy','lifeExpectancy',1]]},
          {title:'Portfolio Summary',isPortfolioSummary:true},
          {title:'Income',fields:[['Your SS FRA (age 67)','ssFRA',50],['SS COLA %','ssCola',0.1],['Spouse Current Age','spouseCurrentAge',1],['Stacey SS at 63 (net)','spouseSSAt63',50],['Stacey SS at 67 (net)','spouseSSAt67',50],['Spouse SS Age','spouseSSAge',1],['Pension Monthly','pensionMonthly',50],['Part-Time Income/yr','partTimeIncome',1000],['Part-Time Years','partTimeYears',1],['Severance Net','severanceNet',500]]},
          {title:'Tax Strategy',fields:[['Conv 2027','conv2027',5000],['Conv 2028','conv2028',5000],['Conv 2029','conv2029',5000],['Conv 2030','conv2030',5000],['Conv 2031','conv2031',5000],['QCD/yr','qcdAmount',500],['QCD Start Age','qcdStartAge',1],['State Tax Rate %','stateTaxRate',0.1]]},
          {title:'Healthcare',fields:[['Phase 1 End Age','healthPhase1EndAge',1],['Phase 2 Annual $','healthPhase2Annual',500],['HC Inflation %','healthInflation',0.01]]},
          {title:'Return Rates',fields:[['Cash/CD/T-Bill %','cashReturnRate',0.1],['TIPS Real Return %','tipsRealReturn',0.1],['Dividend ETF Total %','dividendReturnRate',0.1],['Roth Growth %','rothReturnRate',0.1],['CAPE Ratio','capeRatio',0.5],['10Y Treasury %','tenYrTreasury',0.1],['TIPS Yield %','tipsYield',0.1]]},
          {title:'Expense Breakdown',fields:[['Housing/HOA Monthly','housingMonthly',50],['Food Monthly','foodMonthly',50],['Transport Monthly','transportMonthly',25],['Travel Monthly','travelMonthly',50],['Other Monthly','otherMonthly',50]]},
          {title:'Legacy & Estate',fields:[['Legacy Goal $','legacyGoal',10000],['Extra Spend 2027','extraSpend2027',1000],['Extra Spend 2028','extraSpend2028',1000]]}
        ].map(function(section){
          return (
            <div key={section.title}>
              <h3 style={{fontSize:10,color:'#10b981',marginBottom:12,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{section.title}</h3>
              {section.title==='Tax Strategy'&&(
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.5}}>Filing Status</label>
                  <select value={inp.filingStatus} onChange={function(e){setField('filingStatus',e.target.value);}} style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:7,padding:'8px 11px',color:TXT1,fontSize:12,boxSizing:'border-box'}}>
                    <option value="married">Married Filing Jointly</option>
                    <option value="single">Single</option>
                  </select>
                  <div style={{marginTop:10,background:inp.survivorMode?'rgba(248,113,113,.08)':'rgba(96,165,250,.05)',border:'1px solid '+(inp.survivorMode?'rgba(248,113,113,.3)':'rgba(96,165,250,.15)'),borderRadius:8,padding:'10px 12px'}}>
                    <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                      <input type="checkbox" checked={!!inp.survivorMode} onChange={function(e){setField('survivorMode',e.target.checked?1:0);}} style={{accentColor:'#f87171'}}/>
                      <div>
                        <div style={{fontSize:12,color:inp.survivorMode?'#f87171':'#60a5fa',fontWeight:700}}>Survivor Mode (Widow's Penalty)</div>
                        <div style={{fontSize:10,color:TXT3,marginTop:2}}>Uses Single brackets, survivor gets higher of the two SS benefits only. Models post-spouse scenario.</div>
                      </div>
                    </label>
                  </div>
                  <div style={{marginTop:10,background:inp.staceySS63?'rgba(167,139,250,.08)':'rgba(96,165,250,.05)',border:'1px solid '+(inp.staceySS63?'rgba(167,139,250,.3)':'rgba(96,165,250,.15)'),borderRadius:8,padding:'10px 12px'}}>
                    <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                      <input type="checkbox" checked={!!inp.staceySS63} onChange={function(e){setField('staceySS63',e.target.checked?1:0);}} style={{accentColor:'#a78bfa'}}/>
                      <div>
                        <div style={{fontSize:12,color:inp.staceySS63?'#a78bfa':'#60a5fa',fontWeight:700}}>Stacey Claims SS at 63 ($1,472/mo net)</div>
                        <div style={{fontSize:10,color:TXT3,marginTop:2}}>If unchecked, Stacey waits to 67 ($1,879/mo net). Toggle to compare impact on cash flow and long-range projections.</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              {section.isPortfolioSummary ? (
                <div>
                  <div style={{background:SURFACE2,border:'1px solid #1e3a5f',borderRadius:10,padding:14,marginBottom:8}}>
                    {[['Taxable',derivedTotals.taxable,'#34d399'],['IRA Cash/CD',derivedTotals.iraCash,'#34d399'],['IRA TIPS',derivedTotals.iraTips,'#60a5fa'],['IRA Dividend',derivedTotals.iraDividend,'#fbbf24'],['IRA Growth',derivedTotals.iraGrowth,'#a78bfa'],['Roth',derivedTotals.roth,'#a78bfa']].map(function(item){
                      return (
                        <div key={item[0]} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                          <span style={{fontSize:11,color:TXT2}}>{item[0]}</span>
                          <span style={{fontSize:12,color:item[2],fontWeight:700}}>{fmtC(item[1])}</span>
                        </div>
                      );
                    })}
                    <div style={{borderTop:'1px solid #1e3a5f',paddingTop:8,display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontSize:11,color:TXT2,fontWeight:700}}>Total</span>
                      <span style={{fontFamily:PF,fontSize:15,color:'#10b981',fontWeight:700}}>{fmtC(totalPort)}</span>
                    </div>
                  </div>
                  <button onClick={function(){setActiveTab('assets');}} style={{width:'100%',background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.3)',borderRadius:7,padding:'9px',color:'#34d399',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    <Edit2 size={12}/> Edit Holdings on Assets Tab
                  </button>
                </div>
              ) : section.fields ? section.fields.map(function(f) {
                return (
                  <div key={f[1]} style={{marginBottom:11}}>
                    <label style={{fontSize:9,color:TXT2,display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:0.5}}>{f[0]}</label>
                    <input type="number" step={f[2]} className="ri"
                      value={raw[f[1]]!==undefined?raw[f[1]]:inp[f[1]]}
                      onChange={function(e){setField(f[1],e.target.value);}}
                      onBlur={function(e){if(e.target.value===''||e.target.value==='-')setField(f[1],'0');}}
                      style={{width:'100%',background:SURFACE2,border:'1px solid '+BORDER,borderRadius:7,padding:'8px 11px',color:TXT1,fontSize:12,boxSizing:'border-box'}}/>
                  </div>
                );
              }) : null}
            </div>
          );
        })}
      </div>
      <div style={{marginTop:24,display:'flex',gap:10,flexWrap:'wrap'}}>
        <button onClick={function(){setShowModal(true);}} style={{display:'flex',alignItems:'center',gap:6,background:'#065f46',border:'none',borderRadius:8,padding:'10px 18px',color:'#34d399',cursor:'pointer',fontSize:12,fontWeight:600}}><Save size={13}/> Save Scenario</button>
        <button onClick={function(){loadScen({name:'Base Case',data:DEFAULTS,assets:DEFAULT_ASSETS,bucketCfg:DEFAULT_BUCKET_CONFIG,date:new Date().toLocaleDateString()});}} style={{display:'flex',alignItems:'center',gap:6,background:'#374151',border:'none',borderRadius:8,padding:'10px 18px',color:TXT3,cursor:'pointer',fontSize:12,fontWeight:600}}><RefreshCw size={13}/> Reset to Defaults</button>
        <button onClick={syncToDB} disabled={saveStatus==='saving'} style={{display:'flex',alignItems:'center',gap:6,background:saveStatus==='error'?'rgba(248,113,113,.15)':'rgba(96,165,250,.15)',border:'1px solid '+(saveStatus==='error'?'rgba(248,113,113,.4)':'rgba(96,165,250,.4)'),borderRadius:8,padding:'10px 18px',color:saveStatus==='error'?'#f87171':'#60a5fa',cursor:saveStatus==='saving'?'not-allowed':'pointer',fontSize:12,fontWeight:600,opacity:saveStatus==='saving'?0.6:1}}>
          {saveStatus==='saving'
            ? React.createElement(React.Fragment,null,React.createElement(Loader,{size:13,style:{animation:'spin 1s linear infinite'}}),' Syncing…')
            : saveStatus==='error'
            ? React.createElement(React.Fragment,null,React.createElement(AlertCircle,{size:13}),' Sync Failed — Retry')
            : React.createElement(React.Fragment,null,React.createElement(Activity,{size:13}),' Sync to DB')}
        </button>
      </div>

      {/* Preset Scenarios */}
            <div style={{marginBottom:28}}>
              <div style={{fontSize:10,color:'#10b981',marginBottom:6,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Start from a scenario preset</div>
              <p style={{fontSize:11,color:'#64748b',marginBottom:14,lineHeight:1.6}}>Choose a starting point instead of changing dozens of settings by hand. You can edit every scenario after it is created.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:8}}>
                {SCENARIO_PRESETS.map(function(preset) {
                  return (
                    <div key={preset.id} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:14,display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:10,height:10,borderRadius:'50%',background:preset.accentColor,flexShrink:0}}/>
                        <span style={{fontSize:13,color:'#0f172a',fontWeight:700}}>{preset.label}</span>
                      </div>
                      <p style={{fontSize:11,color:'#64748b',margin:0,lineHeight:1.5,flexGrow:1}}>{preset.description}</p>
                      <button
                        onClick={function() { createPresetScenario(preset); }}
                        style={{background:preset.accentColor+'18',border:'1px solid '+preset.accentColor+'55',borderRadius:6,padding:'7px 10px',color:preset.accentColor,cursor:'pointer',fontSize:11,fontWeight:700}}
                      >{preset.buttonLabel}</button>
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic'}}>Presets clone from your saved Base Case. Base Case is never modified.</div>
            </div>

            {/* ── Scenarios (merged) ─────────────────────────── */}
      <div style={{marginTop:28}}>
        <h3 style={{fontSize:10,color:'#10b981',marginBottom:12,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Saved Scenarios</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,marginBottom:12}}>
          {scenarios.map(function(s){
            return (
              <div key={s.name} style={{background:activeScen===s.name?'rgba(5,150,105,.08)':SURFACE2,border:'1px solid '+(activeScen===s.name?'rgba(5,150,105,.4)':BORDER),borderRadius:10,padding:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontSize:13,color:activeScen===s.name?'#34d399':TXT1,fontWeight:600}}>{s.name}</span>
                  {activeScen===s.name&&<span style={{background:'rgba(16,185,129,.2)',color:'#34d399',borderRadius:4,padding:'1px 6px',fontSize:9,fontWeight:700}}>Active</span>}
                </div>
                {s.data&&s.data.scenarioInsight?(
                  <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginBottom:6,lineHeight:1.5}}>{s.data.scenarioInsight}</div>
                ):s.plan&&s.plan.returns&&s.plan.returns.scenarioInsight?(
                  <div style={{fontSize:10,color:'#94a3b8',fontStyle:'italic',marginBottom:6,lineHeight:1.5}}>{s.plan.returns.scenarioInsight}</div>
                ):null}
                <div style={{display:'flex',gap:6}}>
                  <button onClick={function(){loadScen(s);}} style={{flex:1,background:'#065f46',border:'none',borderRadius:6,padding:'6px',color:'#34d399',cursor:'pointer',fontSize:11,fontWeight:600}}>Load</button>
                  {s.name!=='Base Case'&&<button onClick={function(){setScenarios(function(prev){return prev.filter(function(x){return x.name!==s.name;});});}} style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:6,padding:'6px 10px',color:'#f87171',cursor:'pointer',fontSize:11}}>Del</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
