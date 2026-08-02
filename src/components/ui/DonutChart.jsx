import{C}from"../../theme";
import{fmt}from"../../lib/format";
const DEF_COLORS=[C.purple,C.navy,C.teal,C.accent,C.green,C.gold,C.orange,"#e11d48","#0369a1","#059669"];
export function DonutChart({
  data,labelKey,valueKey,colorKey,colors,
  cx=90,cy=90,ro=72,ri=38,
  centerLabel="kg total",
  fmtSecondary,
  legendRowH=22,
}){
  const pal=colors||DEF_COLORS;
  const getCol=(d,i)=>colorKey?d[colorKey]:pal[i%pal.length];
  const total=data.reduce((s,d)=>s+(+d[valueKey]||0),0);
  if(!data.length||total===0)return<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"30px 0"}}>Sin datos</div>;
  if(data.length===1){
    const d=data[0];const col=getCol(d,0);
    const lbl=String(d[labelKey]||"");
    return(<div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
      <svg viewBox={`0 0 ${cx*2} ${cy*2}`} width={cx*2} height={cy*2} style={{flexShrink:0}}>
        <circle cx={cx} cy={cy} r={ro} fill={col} opacity="0.9"/>
        <circle cx={cx} cy={cy} r={ri} fill={C.panel}/>
        <text x={cx} y={cy-6} textAnchor="middle" fontSize="11" fill={col} fontWeight="800" fontFamily="Inter,sans-serif">100%</text>
        <text x={cx} y={cy+8} textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(total)} {centerLabel}</text>
      </svg>
      <div style={{flex:1,minWidth:160}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+C.border}}>
          <span style={{width:10,height:10,borderRadius:2,background:col,flexShrink:0}}/>
          <span style={{fontSize:12,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{lbl}</span>
          <span style={{fontSize:12,fontWeight:700,color:col,minWidth:38,textAlign:"right",flexShrink:0}}>100%</span>
          {fmtSecondary&&<span style={{fontSize:11,color:C.textDim,minWidth:60,textAlign:"right",flexShrink:0}}>{fmtSecondary(d)}</span>}
        </div>
      </div>
    </div>);
  }
  let cum=0;
  const slices=data.map((d,i)=>{
    const col=getCol(d,i);
    const frac=total>0?(+d[valueKey]||0)/total:0;
    const s0=cum*2*Math.PI;cum+=frac;const s1=cum*2*Math.PI;
    const x1=cx+ro*Math.cos(s0-Math.PI/2),y1=cy+ro*Math.sin(s0-Math.PI/2);
    const x2=cx+ro*Math.cos(s1-Math.PI/2),y2=cy+ro*Math.sin(s1-Math.PI/2);
    const xi1=cx+ri*Math.cos(s1-Math.PI/2),yi1=cy+ri*Math.sin(s1-Math.PI/2);
    const xi2=cx+ri*Math.cos(s0-Math.PI/2),yi2=cy+ri*Math.sin(s0-Math.PI/2);
    const path=`M${x1.toFixed(2)},${y1.toFixed(2)} A${ro},${ro} 0 ${(s1-s0)>Math.PI?1:0} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi1.toFixed(2)},${yi1.toFixed(2)} A${ri},${ri} 0 ${(s1-s0)>Math.PI?1:0} 0 ${xi2.toFixed(2)},${yi2.toFixed(2)} Z`;
    const mid=(s0+s1)/2-Math.PI/2;
    const pct=(frac*100).toFixed(1);
    return{...d,_col:col,_frac:frac,_mid:mid,_pct:pct,_path:path};
  });
  return(<div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
    <svg viewBox={`0 0 ${cx*2} ${cy*2}`} width={cx*2} height={cy*2} style={{flexShrink:0}}>
      <circle cx={cx} cy={cy} r={ro+2} fill={C.bg} stroke={C.border} strokeWidth="1"/>
      {slices.map((s,i)=>(<path key={i} d={s._path} fill={s._col} stroke={C.panel} strokeWidth="2" opacity="0.92"/>))}
      {slices.map((s,i)=>s._frac>0.05&&(<text key={i+"t"} x={(cx+(ro*0.63)*Math.cos(s._mid)).toFixed(2)} y={(cy+(ro*0.63)*Math.sin(s._mid)+4).toFixed(2)} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="800" fontFamily="Inter,sans-serif">{s._pct}%</text>))}
      <text x={cx} y={cy-5} textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(total)}</text>
      <text x={cx} y={cy+7} textAnchor="middle" fontSize="8" fill={C.textFaint} fontFamily="Inter,sans-serif">{centerLabel}</text>
    </svg>
    <div style={{flex:1,minWidth:160}}>
      {slices.map((s,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+C.border}}>
          <span style={{width:10,height:10,borderRadius:2,background:s._col,flexShrink:0}}/>
          <span style={{fontSize:12,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{String(s[labelKey]||"")}</span>
          <span style={{fontSize:12,fontWeight:700,color:s._col,minWidth:38,textAlign:"right",flexShrink:0}}>{s._pct}%</span>
          {fmtSecondary&&<span style={{fontSize:11,color:C.textDim,minWidth:60,textAlign:"right",flexShrink:0}}>{fmtSecondary(s)}</span>}
        </div>
      ))}
    </div>
  </div>);
}
