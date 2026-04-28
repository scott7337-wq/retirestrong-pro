import React from 'react';
import { Sparkles, Loader, Activity, ArrowDownUp, Heart } from 'lucide-react';

export default function SummaryTab({ ctx }) {
  var { cashFlow, inpWithAssets, er, derivedTotals, rothWindow, totalPort,
        dynTaxRate, iraTotal, insights, aiInsights, aiLoading, aiError,
        fetchAiInsights, setActiveTab,
        fmtC, fmtPct,
        PF, SURFACE, SURFACE2, BORDER, TXT1, TXT2, TXT3, ACCENT2, CARD, TTip } = ctx;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>AI-Powered Insights</h2>
          <p style={{fontSize:12,color:TXT2,margin:0}}>Quick-scan alerts always visible · click below for deep personalized analysis</p>
        </div>
        <button onClick={fetchAiInsights} disabled={aiLoading}
          style={{display:'flex',alignItems:'center',gap:8,background:aiLoading?SURFACE2:'#059669',border:'1px solid '+(aiLoading?BORDER:'#059669'),borderRadius:10,padding:'10px 18px',color:aiLoading?TXT3:'white',cursor:aiLoading?'default':'pointer',fontSize:13,fontWeight:600,transition:'all .2s',boxShadow:aiLoading?'none':'0 2px 8px rgba(5,150,105,.3)'}}>
          {aiLoading ? React.createElement(React.Fragment,null,React.createElement(Loader,{size:14,style:{animation:'spin 1s linear infinite'}}), ' Analyzing…') : React.createElement(React.Fragment,null,React.createElement(Sparkles,{size:14}), ' ', aiInsights ? 'Refresh AI Insights' : 'Get AI Insights')}
        </button>
      </div>

      {aiError && (
        <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:12,padding:'14px 18px',marginBottom:16,fontSize:13,color:'#dc2626'}}>{aiError}</div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:13,marginBottom:22}}>
        {insights.map(function(ins,i){
          var c = ins.type==='warning'?['rgba(245,158,11,.08)','rgba(245,158,11,.25)','#d97706']:ins.type==='success'?['rgba(16,185,129,.08)','rgba(16,185,129,.25)','#059669']:['rgba(59,130,246,.08)','rgba(59,130,246,.25)','#2563eb'];
          return (
            <div key={i} className="rc" style={{background:c[0],border:'1px solid '+c[1],borderRadius:12,padding:16}}>
              <div style={{display:'flex',gap:11}}>
                <ins.icon size={16} style={{color:c[2],flexShrink:0,marginTop:2}}/>
                <div>
                  <h3 style={{fontFamily:PF,fontSize:13,color:c[2],margin:'0 0 4px',fontWeight:600}}>{ins.title}</h3>
                  <p style={{fontSize:12,color:TXT2,margin:0,lineHeight:1.6}}>{ins.msg}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!aiInsights && !aiLoading && (
        <div style={{background:SURFACE2,border:'1px solid '+BORDER,borderRadius:12,padding:'20px 24px',marginBottom:22,textAlign:'center'}}>
          <div style={{marginBottom:8}}><Sparkles size={22} style={{color:'#059669'}}/></div>
          <p style={{fontSize:13,color:TXT2,margin:'0 0 4px',fontWeight:600}}>Get personalized recommendations for your exact portfolio</p>
          <p style={{fontSize:12,color:TXT3,margin:0}}>Covers portfolio mix, bucket sizing, Social Security timing, Roth conversion amounts, and tax optimization — all specific to your numbers.</p>
        </div>
      )}

      {aiInsights && (
        <div style={{marginBottom:22}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <Sparkles size={15} style={{color:'#059669'}}/>
            <h3 style={{fontFamily:PF,fontSize:15,color:TXT1,margin:0,fontWeight:600}}>Personalized AI Analysis</h3>
            <span style={{fontSize:10,color:TXT3,marginLeft:4,background:ACCENT2,borderRadius:4,padding:'2px 7px',color:'#059669'}}>Based on your actual holdings</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
            {aiInsights.map(function(ins,i){
              var c = ins.type==='warning'?['rgba(245,158,11,.08)','rgba(245,158,11,.25)','#d97706']:ins.type==='success'?['rgba(16,185,129,.08)','rgba(16,185,129,.25)','#059669']:['rgba(59,130,246,.08)','rgba(59,130,246,.25)','#2563eb'];
              var Icon = ins.icon || Activity;
              return (
                <div key={i} className="rc" style={{background:c[0],border:'1px solid '+c[1],borderRadius:12,padding:'16px 18px'}}>
                  <div style={{display:'flex',gap:10,marginBottom:8}}>
                    <Icon size={15} style={{color:c[2],flexShrink:0,marginTop:2}}/>
                    <h4 style={{fontFamily:PF,fontSize:13,color:c[2],margin:0,fontWeight:700}}>{ins.title}</h4>
                  </div>
                  <p style={{fontSize:12,color:TXT2,margin:0,lineHeight:1.7,whiteSpace:'pre-line'}}>{ins.msg}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[['Portfolio',fmtC(totalPort),'#10b981','rgba(16,185,129,.1)'],['Annual Expenses',fmtC(inpWithAssets.monthlyExpenses*12),'#f59e0b','rgba(245,158,11,.1)'],['Plan Horizon',(inpWithAssets.lifeExpectancy-inpWithAssets.currentAge)+' yrs','#818cf8','rgba(129,140,248,.1)'],['CAPE Return',fmtPct(er.stock),'#60a5fa','rgba(96,165,250,.1)']].map(function(item){
          return (
            <div key={item[0]} className="rc" style={{background:item[3],border:'1px solid '+item[2]+'30',borderRadius:11,padding:16,textAlign:'center'}}>
              <div style={{fontFamily:PF,fontSize:22,color:item[2],fontWeight:700}}>{item[1]}</div>
              <div style={{fontSize:9,color:TXT2,letterSpacing:1.2,textTransform:'uppercase',marginTop:4}}>{item[0]}</div>
            </div>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={CARD}>
          <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:14,fontWeight:600}}>Market Fundamentals</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:14}}>
            {[['CAPE',inpWithAssets.capeRatio],['10Y Treasury',inpWithAssets.tenYrTreasury+'%'],['TIPS Yield',inpWithAssets.tipsYield+'%']].map(function(item){
              return <div key={item[0]} style={{textAlign:'center'}}><div style={{fontFamily:PF,fontSize:18,color:TXT1,fontWeight:600}}>{item[1]}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
            })}
          </div>
          <div style={{borderTop:'1px solid '+BORDER,paddingTop:12,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[['Stocks',fmtPct(er.stock),'#34d399'],['Bonds',fmtPct(er.bond),'#60a5fa'],['Inflation',fmtPct(er.inflation),'#fbbf24']].map(function(item){
              return <div key={item[0]} style={{textAlign:'center',background:item[2]+'15',borderRadius:7,padding:'8px 4px'}}><div style={{fontFamily:PF,fontSize:16,color:item[2],fontWeight:700}}>{item[1]}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
            })}
          </div>
        </div>
        <div style={CARD}>
          <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:14,fontWeight:600}}>Dynamic Tax Profile</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            {[['Marginal Rate',(dynTaxRate*100).toFixed(0)+'%','#fbbf24'],['Filing Status',inpWithAssets.filingStatus==='married'?'MFJ':'Single','#60a5fa'],['IRA Balance',fmtC(iraTotal),'#f87171'],['Roth Balance',fmtC(derivedTotals.roth),'#a78bfa']].map(function(item){
              return <div key={item[0]} style={{background:item[2]+'15',borderRadius:7,padding:'9px 11px'}}><div style={{fontFamily:PF,fontSize:16,color:item[2],fontWeight:700}}>{item[1]}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{item[0]}</div></div>;
            })}
          </div>
          <div style={{background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',borderRadius:8,padding:'9px 12px'}}>
            <div style={{fontSize:11,color:'#a78bfa',fontWeight:600}}>Roth Window: {rothWindow.years} yrs to RMD (age {rothWindow.rmdAge})</div>
            <div style={{fontSize:11,color:TXT2,marginTop:3}}>Convert ~{fmtC(Math.round(rothWindow.totalRecommended/Math.max(1,rothWindow.years)))}/yr, IRMAA-safe under ${(rothWindow.irmaaSafe).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{background:'rgba(251,146,60,.07)',border:'1px solid rgba(251,146,60,.25)',borderRadius:12,padding:16,marginTop:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:10,color:'#fb923c',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>Healthcare Costs Included</div>
            <div style={{display:'flex',gap:18,flexWrap:'wrap'}}>
              <div><span style={{fontSize:12,color:TXT1,fontWeight:600}}>Phase 1: </span><span style={{fontSize:12,color:'#fb923c',fontWeight:700}}>{fmtC(inpWithAssets.healthPhase1Annual)}/yr</span><span style={{fontSize:11,color:TXT2}}> through age {inpWithAssets.healthPhase1EndAge}</span></div>
              <div><span style={{fontSize:12,color:TXT1,fontWeight:600}}>Phase 2: </span><span style={{fontSize:12,color:'#fb923c',fontWeight:700}}>{fmtC(inpWithAssets.healthPhase2Annual)}/yr</span><span style={{fontSize:11,color:TXT2}}> inflating {(inpWithAssets.healthInflation*100).toFixed(0)}%/yr</span></div>
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontFamily:PF,fontSize:20,color:'#fb923c',fontWeight:700}}>{fmtC(cashFlow.reduce(function(s,r){return s+(r.healthcare||0);},0))}</div>
            <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:2}}>Lifetime HC total</div>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:14}}>
        <button onClick={function(){setActiveTab('withdrawal');}} style={{background:'linear-gradient(135deg,rgba(45,212,191,.08),rgba(96,165,250,.08))',border:'1px solid rgba(45,212,191,.3)',borderRadius:12,padding:'14px 18px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:36,height:36,borderRadius:8,background:'rgba(45,212,191,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <ArrowDownUp size={18} color="#2dd4bf"/>
          </div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
              <span style={{fontSize:13,color:'#2dd4bf',fontWeight:700}}>Withdrawal Plan</span>
              <span style={{background:'#2dd4bf',color:'white',borderRadius:3,padding:'1px 5px',fontSize:8,fontWeight:700}}>v13</span>
            </div>
            <div style={{fontSize:11,color:TXT3}}>Year-by-year sequencing roadmap + expense breakdown sliders</div>
          </div>
        </button>
        <button onClick={function(){setActiveTab('legacy');}} style={{background:'linear-gradient(135deg,rgba(167,139,250,.08),rgba(248,113,113,.06))',border:'1px solid rgba(167,139,250,.3)',borderRadius:12,padding:'14px 18px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:36,height:36,borderRadius:8,background:'rgba(167,139,250,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Heart size={18} color="#a78bfa"/>
          </div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
              <span style={{fontSize:13,color:'#a78bfa',fontWeight:700}}>Legacy &amp; Estate</span>
              <span style={{background:'#a78bfa',color:'white',borderRadius:3,padding:'1px 5px',fontSize:8,fontWeight:700}}>v13</span>
            </div>
            <div style={{fontSize:11,color:TXT3}}>Estate projections, legacy goal tracker, Roth inheritance advantage</div>
          </div>
        </button>
      </div>
    </div>
  );
}
