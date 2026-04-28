import React from 'react';

export default function RothConversionsTab({ ctx }) {
  var { rothWindow, fmtC, CARD, PF, TXT1, TXT2, TXT3, BORDER, SURFACE2 } = ctx;

  return (
    <div>
      <h2 style={{fontFamily:PF,fontSize:22,color:TXT1,marginBottom:20,fontWeight:600}}>Roth Conversion Strategy</h2>
      <div style={{background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.25)',borderRadius:13,padding:22,marginBottom:22}}>
        <h3 style={{fontFamily:PF,fontSize:16,color:'#a78bfa',marginBottom:4,fontWeight:600}}>Roth Conversion Window</h3>
        <p style={{fontSize:12,color:TXT2,marginBottom:16}}>
          <strong style={{color:'#f87171'}}>2026: Working year — no conversions.</strong> W-2 income pushes bracket too high.{' '}
          Window opens <strong style={{color:'#34d399'}}>Jan 2027</strong> and runs until RMDs begin at age {rothWindow.rmdAge} — <strong style={{color:'#a78bfa'}}>{rothWindow.years} years</strong>.
        </p>
        <div style={{background:'rgba(220,38,38,.06)',border:'1px solid rgba(220,38,38,.2)',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:18}}>🚫</span>
          <div>
            <div style={{fontSize:12,color:'#f87171',fontWeight:700,marginBottom:2}}>2026 — No Roth Conversion (Working Year)</div>
            <div style={{fontSize:11,color:TXT3}}>W-2 income + partial SS pushes bracket high. Use 2026 to plan, rebalance within IRAs, and max remaining 401k contributions instead.</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[['Conv Window','2027–'+rothWindow.rmdYear,'#a78bfa'],['Years Available',rothWindow.years+' yrs','#34d399'],['IRMAA Safe MAGI',fmtC(rothWindow.irmaaSafe),'#fbbf24'],['Total Convertible',fmtC(rothWindow.totalRecommended),'#60a5fa']].map(function(item){
            return <div key={item[0]} style={{background:item[2]+'15',border:'1px solid '+item[2]+'30',borderRadius:10,padding:14,textAlign:'center'}}><div style={{fontFamily:PF,fontSize:20,color:item[2],fontWeight:800}}>{item[1]}</div><div style={{fontSize:9,color:TXT2,textTransform:'uppercase',letterSpacing:1,marginTop:3}}>{item[0]}</div></div>;
          })}
        </div>
        <div style={{background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.25)',borderRadius:10,padding:14,marginBottom:18}}>
          <div style={{fontSize:11,color:'#fbbf24',fontWeight:700,marginBottom:6}}>⚠️ IRMAA: The Hidden Conversion Tax</div>
          <div style={{fontSize:11,color:TXT3,lineHeight:1.7}}>
            Medicare uses income from <strong style={{color:TXT1}}>2 years ago</strong>. Convert too much in 2027 and you pay IRMAA surcharges in 2029.
            Keep <strong style={{color:'#fbbf24'}}>MAGI under ${(rothWindow.irmaaSafe).toLocaleString()}</strong> (MFJ 2025) to avoid first surcharge tier of ~$594/yr per person.
          </div>
        </div>
        <div style={{background:'rgba(96,165,250,.06)',border:'1px solid rgba(96,165,250,.2)',borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontSize:12,color:'#60a5fa',fontWeight:700,marginBottom:8}}>📊 How Your Bracket Is Calculated Each Year</div>
          <div style={{fontSize:11,color:TXT2,lineHeight:1.8}}>
            <strong style={{color:TXT1}}>Base Income</strong> = IRA withdrawals (gap funding) + 85% of SS + pension — <em>all taxable before conversion</em><br/>
            <strong style={{color:TXT1}}>Room 12%</strong> = space remaining in 12% bracket after base income &amp; standard deduction<br/>
            <strong style={{color:TXT1}}>Recommended</strong> = convert up to 12% ceiling, capped by IRMAA-safe limit<br/>
            <strong style={{color:'#f97316'}}>Key insight:</strong> Converting into the 22% bracket now is better than paying 24%+ on forced RMDs at 73. Taxes on conversions are paid from your taxable brokerage account (~$13K/yr), preserving IRA and Roth balances intact.
          </div>
        </div>
        <div style={{overflowX:'auto',marginBottom:16}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:SURFACE2}}>
              {['Year','Age','SS Income','IRA Draw','Base Inc','IRMAA-Safe Max','Your Plan','Room Left','Rate','MAGI','IRMAA Status'].map(function(h){
                return <th key={h} style={{padding:'7px 10px',textAlign:h==='Year'||h==='IRMAA Status'?'left':'right',color:TXT2,fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:0.4,borderBottom:'1px solid '+BORDER,whiteSpace:'nowrap'}}>{h}</th>;
              })}
            </tr></thead>
            <tbody>
              {rothWindow.yearByYear.map(function(row,i){
                var safe = row.irmaaStatus.includes('Safe');
                var roomLeft = Math.max(0, row.irmaaSafeConv - (row.scheduledConv||0));
                return (
                  <tr key={i} className="rr" style={{borderBottom:'1px solid '+BORDER}}>
                    <td style={{padding:'8px 10px',color:TXT1,fontWeight:700}}>{row.year}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:TXT3}}>{row.age}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:'#34d399'}}>{row.ssIncome>0?fmtC(row.ssIncome):'—'}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:'#f97316'}}>{fmtC(row.iraWithdrawal)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:TXT1}}>{fmtC(row.baseIncome)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:'#fbbf24',fontWeight:600}}>{fmtC(row.irmaaSafeConv)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:'#a78bfa',fontWeight:700}}>{row.scheduledConv>0?fmtC(row.scheduledConv):'—'}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:roomLeft>0?'#60a5fa':TXT3,fontSize:11}}>{roomLeft>0?fmtC(roomLeft):'—'}</td>
                    <td style={{padding:'8px 10px',textAlign:'right'}}><span style={{background:row.taxRate==='12%'?'rgba(96,165,250,.15)':'rgba(167,139,250,.15)',color:row.taxRate==='12%'?'#60a5fa':'#a78bfa',border:'1px solid '+(row.taxRate==='12%'?'rgba(96,165,250,.3)':'rgba(167,139,250,.3)'),borderRadius:4,padding:'1px 6px',fontSize:10,fontWeight:700}}>{row.taxRate}</span></td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:TXT1}}>{fmtC(row.magi)}</td>
                    <td style={{padding:'8px 10px'}}><span style={{background:safe?'rgba(52,211,153,.15)':'rgba(248,113,113,.15)',color:safe?'#34d399':'#f87171',border:'1px solid '+(safe?'rgba(52,211,153,.3)':'rgba(248,113,113,.3)'),borderRadius:4,padding:'1px 6px',fontSize:10,fontWeight:700}}>{row.irmaaStatus}</span></td>
                  </tr>
                );
              })}
              <tr style={{borderTop:'2px solid #334155',background:'rgba(167,139,250,.05)'}}>
                <td colSpan={6} style={{padding:'8px 10px',color:TXT2,fontSize:11,fontWeight:700}}>YOUR SCHEDULED CONVERSIONS (5-year total)</td>
                <td style={{padding:'8px 10px',textAlign:'right',color:'#a78bfa',fontWeight:700,fontSize:13}}>{fmtC(rothWindow.totalScheduled)}</td>
                <td style={{padding:'8px 10px',textAlign:'right',color:'#60a5fa',fontSize:11}}>{fmtC(rothWindow.totalRecommended - rothWindow.totalScheduled)} unused room</td>
                <td colSpan={3} style={{padding:'8px 10px',color:TXT2,fontSize:10}}>Max IRMAA-safe: {fmtC(rothWindow.totalRecommended)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
