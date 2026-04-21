import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Plus, Edit2, MoveRight, Trash2 } from 'lucide-react';

// ── Current Assets tab ────────────────────────────────────────────────────────
// Extracted from App.jsx (Pro refactor). Pure UI — no logic changes.
// All state, handlers, derived values, and theme constants flow in as props.
export default function Assets(props) {
  var assets = props.assets;
  var bucketCfg = props.bucketCfg;
  var openAddAsset = props.openAddAsset;
  var openEditAsset = props.openEditAsset;
  var deleteAsset = props.deleteAsset;
  var setMoveAssetId = props.setMoveAssetId;

  var derivedTotals = props.derivedTotals;
  var iraTotal = props.iraTotal;
  var unassigned = props.unassigned;
  var composition = props.composition;
  var totalPort = props.totalPort;
  var inpWithAssets = props.inpWithAssets;

  var fmtC = props.fmtC;
  var fmtFull = props.fmtFull;

  // Theme / shared constants
  var PF = props.PF;
  var SURFACE = props.SURFACE;
  var SURFACE2 = props.SURFACE2;
  var BORDER = props.BORDER;
  var TXT1 = props.TXT1;
  var TXT2 = props.TXT2;
  var TXT3 = props.TXT3;
  var CARD = props.CARD;
  var TYPE_C = props.TYPE_C;
  var RISK_C = props.RISK_C;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:14}}>
        <div>
          <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:4,fontWeight:600}}>Current Asset Holdings</h2>
          <p style={{fontSize:13,color:TXT2,margin:0}}>{assets.length} holdings · {fmtFull(totalPort)} total portfolio</p>
        </div>
        <button onClick={openAddAsset} className="abtn"
          style={{display:'flex',alignItems:'center',gap:7,background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.4)',borderRadius:9,padding:'10px 18px',color:'#34d399',cursor:'pointer',fontSize:13,fontWeight:600,transition:'background .15s'}}>
          <Plus size={15}/> Add Holding
        </button>
      </div>

      {/* Portfolio overview cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:22}}>
        {[
          {label:'Taxable',amount:derivedTotals.taxable,color:'#34d399'},
          {label:'IRA (total)',amount:iraTotal,color:'#60a5fa'},
          {label:'Roth',amount:derivedTotals.roth,color:'#a78bfa'},
          {label:'Unassigned',amount:unassigned.reduce(function(s,a){return s+a.amount;},0),color:unassigned.length>0?'#dc2626':TXT3,note:unassigned.length+' holdings'},
        ].map(function(item){
          return (
            <div key={item.label} style={{background:item.color+'15',border:'1px solid '+item.color+'30',borderRadius:10,padding:'13px 15px',textAlign:'center'}}>
              <div style={{fontFamily:PF,fontSize:18,color:item.color,fontWeight:700}}>{fmtC(item.amount)}</div>
              <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:3}}>{item.label}</div>
              {item.note && <div style={{fontSize:10,color:item.color,marginTop:2}}>{item.note}</div>}
            </div>
          );
        })}
      </div>

      {/* Composition chart */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:16,marginBottom:22}}>
        <div style={CARD}>
          <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:12,fontWeight:600}}>Composition</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={composition} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="amount" paddingAngle={2}>
                {composition.map(function(c,i){return <Cell key={i} fill={c.color}/>;} )}
              </Pie>
              <Tooltip formatter={function(v){return fmtC(v);}} contentStyle={{background:SURFACE,border:'1px solid '+BORDER,borderRadius:8,fontSize:12}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={CARD}>
          <h3 style={{fontFamily:PF,fontSize:13,color:TXT1,marginBottom:11,fontWeight:600}}>Breakdown</h3>
          <div style={{overflowY:'auto',maxHeight:220}}>
            {composition.map(function(c,i){
              var totalAmt = totalPort || 1;
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <div style={{width:8,height:8,borderRadius:2,background:c.color,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontSize:11,color:TXT1,fontWeight:600}}>{c.name}</span>
                      <span style={{fontSize:11,color:c.color,fontWeight:700}}>{fmtC(c.amount)}</span>
                    </div>
                    <div style={{height:3,background:SURFACE,borderRadius:2,marginTop:3}}>
                      <div style={{height:3,width:Math.min((c.amount/totalAmt)*100*3.5,100)+'%',background:c.color,borderRadius:2,opacity:0.7}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Holdings table by account */}
      {['Taxable','IRA','Roth IRA','Roth 401k','401k','HSA'].map(function(acct) {
        var acctAssets = assets.filter(function(a){return a.account===acct;});
        if (acctAssets.length === 0) return null;
        var acctTotal = acctAssets.reduce(function(s,a){return s+a.amount;},0);
        var acctColor = acct==='Taxable'?'#34d399':acct.startsWith('Roth')?'#a78bfa':'#60a5fa';
        return (
          <div key={acct} style={{marginBottom:22}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <h3 style={{fontFamily:PF,fontSize:14,color:acctColor,margin:0,fontWeight:600}}>{acct}</h3>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:13,color:acctColor,fontWeight:700}}>{fmtFull(acctTotal)}</span>
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:SURFACE2}}>
                  {['Holding','Amount','Type','Maturity','Yield','Risk','Bucket','Actions'].map(function(h){
                    return <th key={h} style={{padding:'6px 10px',textAlign:h==='Amount'?'right':'left',color:TXT2,fontWeight:700,fontSize:9,textTransform:'uppercase',letterSpacing:0.5,borderBottom:'1px solid '+BORDER,whiteSpace:'nowrap'}}>{h}</th>;
                  })}
                </tr></thead>
                <tbody>
                  {acctAssets.map(function(h){
                    var tc = TYPE_C[h.type]||'#64748b';
                    var rc2 = RISK_C[h.risk]||'#64748b';
                    var bkt = h.bucket ? bucketCfg.find(function(b){return b.id===h.bucket;}) : null;
                    return (
                      <tr key={h.id} className="rr" style={{borderBottom:'1px solid '+BORDER}}>
                        <td style={{padding:'7px 10px',color:TXT1,fontWeight:600}}>{h.name}</td>
                        <td style={{padding:'7px 10px',textAlign:'right',color:'#34d399',fontWeight:700}}>{fmtFull(h.amount)}</td>
                        <td style={{padding:'7px 10px'}}><span style={{background:tc+'22',color:tc,border:'1px solid '+tc+'44',borderRadius:3,padding:'1px 5px',fontSize:9,fontWeight:700}}>{h.type}</span></td>
                        <td style={{padding:'7px 10px',color:TXT3}}>{h.maturity}</td>
                        <td style={{padding:'7px 10px',color:'#fbbf24'}}>{h.yld}</td>
                        <td style={{padding:'7px 10px'}}><span style={{background:rc2+'22',color:rc2,border:'1px solid '+rc2+'44',borderRadius:3,padding:'1px 5px',fontSize:9,fontWeight:700}}>{h.risk}</span></td>
                        <td style={{padding:'7px 10px'}}>
                          {bkt ? <span style={{background:bkt.color+'22',color:bkt.color,border:'1px solid '+bkt.color+'44',borderRadius:3,padding:'1px 5px',fontSize:9,fontWeight:700}}>{bkt.label}</span>
                            : <span style={{color:'#f87171',fontSize:9,fontWeight:700}}>Unassigned</span>}
                        </td>
                        <td style={{padding:'7px 10px'}}>
                          <div style={{display:'flex',gap:5}}>
                            <button onClick={function(){openEditAsset(h);}} className="ebtn" style={{background:'rgba(96,165,250,.1)',border:'1px solid rgba(96,165,250,.2)',borderRadius:5,padding:'3px 7px',cursor:'pointer',color:'#60a5fa',display:'flex',alignItems:'center',gap:3,fontSize:10,transition:'background .15s'}}>
                              <Edit2 size={10}/> Edit
                            </button>
                            <button onClick={function(){setMoveAssetId(h.id);}} className="mbtn" style={{background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',borderRadius:5,padding:'3px 7px',cursor:'pointer',color:'#a78bfa',display:'flex',alignItems:'center',gap:3,fontSize:10,transition:'background .15s'}}>
                              <MoveRight size={10}/> Move
                            </button>
                            <button onClick={function(){if(window.confirm('Delete '+h.name+'?'))deleteAsset(h.id);}} className="dbtn" style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:5,padding:'3px 7px',cursor:'pointer',color:'#f87171',display:'flex',alignItems:'center',gap:3,fontSize:10,transition:'background .15s'}}>
                              <Trash2 size={10}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* IRA sub-bucket summary */}
      <div style={{background:'rgba(96,165,250,.06)',border:'1px solid rgba(96,165,250,.2)',borderRadius:12,padding:16,marginTop:8}}>
        <h4 style={{fontSize:10,color:'#60a5fa',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>IRA Sub-Bucket Classification (used in projections)</h4>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[['Cash/CD/T-Bill',derivedTotals.iraCash,'#34d399',inpWithAssets.cashReturnRate+'%'],['TIPS/Bonds',derivedTotals.iraTips,'#60a5fa','Inf + '+inpWithAssets.tipsRealReturn+'%'],['Dividend/REIT',derivedTotals.iraDividend,'#fbbf24',inpWithAssets.dividendReturnRate+'%'],['Growth Equity',derivedTotals.iraGrowth,'#a78bfa',inpWithAssets.growthReturnRate+'%']].map(function(item){
            return (
              <div key={item[0]} style={{background:item[2]+'10',border:'1px solid '+item[2]+'25',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
                <div style={{fontFamily:PF,fontSize:16,color:item[2],fontWeight:700}}>{fmtC(item[1])}</div>
                <div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:0.5,marginTop:3}}>{item[0]}</div>
                <div style={{fontSize:10,color:item[2],marginTop:3}}>{item[3]} return</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
