import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmtCOP,fmt}from"../../../lib/format";
import{semanaISO,mesTrillaDe}from"../../../lib/dates";
import{calcCosto}from"../../../lib/costing";
import{pesoATrilladoraCafeFino}from"../../../lib/stock";
import{Bdg,TablaScrollV}from"../../ui";
import{DonutChart}from"../../ui/DonutChart";

// Replica local de calcCostoTri (lib/costing.js) pero para el centro "Bodega Cafe Fino" —
// calcCostoTri esta fija al centro "Trilladora" (Linea Verde), no se toca esa funcion compartida.
const calcCostoTriCF=(mes,costos,lotesFino)=>{
  const costosTri=(costos||[]).filter(c=>c.centro==="Bodega Cafe Fino"&&c.mes===mes).reduce((s,c)=>s+c.valor,0);
  const kgEx=lotesFino.filter(l=>l.para_trilladora&&mesTrillaDe(l)===mes&&l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  return{costosTri,kgEx,costoTriKg:kgEx>0?costosTri/kgEx:0};
};

export function DashboardTrilladoraCF({lotesFino,costos}){
  const [filtroMesTR,setFiltroMesTR]=useState("todos");
  const lotesTrillaCF=(lotesFino||[]).filter(l=>l.para_trilladora&&l.trilla?.kg_excelso>0);
  const mesesTR=MESES.filter(m=>lotesTrillaCF.some(l=>mesTrillaDe(l)===m));
  const lotesTF=filtroMesTR==="todos"?lotesTrillaCF:lotesTrillaCF.filter(l=>mesTrillaDe(l)===filtroMesTR);

  const triExcelso=lotesTF.reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const triEntrada=lotesTF.reduce((s,l)=>s+pesoATrilladoraCafeFino(l),0);
  const triMerma=lotesTF.reduce((s,l)=>s+(l.trilla.kg_merma||0),0);
  const triPasillas=lotesTF.reduce((s,l)=>s+(l.trilla.kg_pasillas||0),0);
  const lotesConMerma=lotesTF.filter(l=>pesoATrilladoraCafeFino(l)>0);
  const pctMermaProm=lotesConMerma.length>0?lotesConMerma.reduce((s,l)=>s+((l.trilla.kg_merma||0)/pesoATrilladoraCafeFino(l)*100),0)/lotesConMerma.length:0;

  // Excelso producido por producto (con costo/kg incluyendo D = costo Bodega Cafe Fino prorrateado del mes real de cada lote)
  const porProd={};
  lotesTF.forEach(l=>{
    const p=l.producto||"Sin Producto";
    if(!porProd[p])porProd[p]={kgExcelso:0,costoTotal:0};
    const kgEx=l.trilla.kg_excelso||0;
    const cl=calcCosto(l,costos,lotesFino);
    const costoProduccion=cl?cl.total*pesoATrilladoraCafeFino(l):0;
    const D=calcCostoTriCF(mesTrillaDe(l),costos,lotesFino).costoTriKg;
    porProd[p].kgExcelso+=kgEx;
    porProd[p].costoTotal+=costoProduccion+D*kgEx;
  });
  const prodData=Object.entries(porProd).sort((a,b)=>b[1].kgExcelso-a[1].kgExcelso).map(([prod,d])=>({prod,kgExcelso:d.kgExcelso,costoKg:d.kgExcelso>0?d.costoTotal/d.kgExcelso:0,valorTotal:d.costoTotal}));
  const totalKgExProd=prodData.reduce((s,d)=>s+d.kgExcelso,0);
  const totalValorProd=prodData.reduce((s,d)=>s+d.valorTotal,0);

  // Factor Pretrilla Ponderado vs Factor Industrial Ponderado (ponderados por pesoATrilladoraCafeFino(l))
  const esPlaceholderCarga=(l)=>l.trilla?.factor_industrial===0&&l.trilla?.factor_pretrilla_ponderado===0;
  const ponderar=(arr,campo)=>{
    const con=arr.filter(l=>!esPlaceholderCarga(l)&&l.trilla?.[campo]!=null);
    const peso=con.reduce((s,l)=>s+pesoATrilladoraCafeFino(l),0);
    return peso>0?con.reduce((s,l)=>s+pesoATrilladoraCafeFino(l)*l.trilla[campo],0)/peso:null;
  };
  const fiPonderado=ponderar(lotesTF,"factor_industrial");
  const fpPonderado=ponderar(lotesTF,"factor_pretrilla_ponderado");
  const difFactores=(fiPonderado!=null&&fpPonderado!=null)?(fiPonderado-fpPonderado):null;

  // Tendencia semanal: semana calculada EN VIVO desde trilla.fecha_trilla
  const semanaKey=(f)=>{if(!f)return null;const y=new Date(f+"T00:00:00").getFullYear();return y+"-S"+String(semanaISO(f)).padStart(2,"0");};
  const porSemana={};
  lotesTF.forEach(l=>{
    const key=semanaKey(l.trilla?.fecha_trilla);
    if(!key)return;
    if(!porSemana[key])porSemana[key]=[];
    porSemana[key].push(l);
  });
  const semanasData=Object.entries(porSemana).sort((a,b)=>a[0].localeCompare(b[0])).map(([key,arr])=>({
    key,label:key.slice(-3),
    fi:ponderar(arr,"factor_industrial"),
    fp:ponderar(arr,"factor_pretrilla_ponderado"),
  }));

  // Costo/kg Excelso Trilladora: calcCostoTriCF (local, centro "Bodega Cafe Fino") ya existente para un mes
  // especifico; para "todos" se suma el costo del centro de todos los meses y se divide entre el total de kg excelso.
  const costoTriFiltrado=(costos||[]).filter(c=>c.centro==="Bodega Cafe Fino"&&(filtroMesTR==="todos"||c.mes===filtroMesTR)).reduce((s,c)=>s+c.valor,0);
  const costoTriKgDash=triExcelso>0?costoTriFiltrado/triExcelso:0;

  // Valor Total por Tipo — mismo patron que DashboardTrilla.jsx, aplicado al centro "Bodega Cafe Fino"
  const triCosFiltrados=(costos||[]).filter(c=>c.centro==="Bodega Cafe Fino"&&(filtroMesTR==="todos"||c.mes===filtroMesTR));
  const triPorTipo={};triCosFiltrados.forEach(c=>{triPorTipo[c.tipo]=(triPorTipo[c.tipo]||0)+c.valor;});
  const triPieTotal=Object.values(triPorTipo).reduce((s,v)=>s+v,0);
  const triPieData=Object.entries(triPorTipo).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>({tipo,val,pct:triPieTotal>0?((val/triPieTotal)*100).toFixed(1):"0.0"}));

  const tiles=[
    {label:"Kg Trillados",value:fmt(triEntrada)+" kg",sub:"pergamino real a trilladora",col:C.navy,icon:"🌾"},
    {label:"Excelso Total",value:fmt(triExcelso)+" kg",sub:"café excelso producido",col:C.green,icon:"📦"},
    {label:"Merma Total",value:fmt(triMerma)+" kg",sub:"cisco",col:C.red,icon:"🔥"},
    {label:"Peso Subproductos",value:fmt(triPasillas)+" kg",sub:"pasilla elec.+cat.dens.+inferiores",col:C.orange,icon:"♻️"},
    {label:"Promedio % Merma",value:pctMermaProm.toFixed(1)+"%",sub:"promedio simple por lote",col:C.gold,icon:"📉"},
    {label:"Costo/kg Excelso Trilladora",value:costoTriKgDash>0?fmtCOP(Math.round(costoTriKgDash)):"—",sub:"costo centro Bodega Cafe Fino / kg excelso",col:C.purple,icon:"⚙️",fs:15},
  ];

  return(<>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
      <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
        {["todos",...mesesTR].map(m=>(<button key={m} onClick={()=>setFiltroMesTR(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesTR===m?C.navy:C.border),background:filtroMesTR===m?C.navy:"transparent",color:filtroMesTR===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesTR===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
      </div>
      {filtroMesTR!=="todos"&&<span style={{fontSize:11,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.accentBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesTR.charAt(0).toUpperCase()+filtroMesTR.slice(1)}</span>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10,marginBottom:18}}>
      {tiles.map(k=>(
        <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
            <span style={{fontSize:14}}>{k.icon}</span>
          </div>
          <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
          <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
        </div>
      ))}
    </div>

    <div style={{...S.card,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Excelso Producido por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Costo/kg incluye costo Bodega Cafe Fino prorrateado (D) del mes real de cada lote</div></div>
        <div style={{fontSize:11,color:C.textDim}}>Total: <strong style={{color:C.green}}>{fmt(totalKgExProd)} kg</strong></div>
      </div>
      {prodData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin lotes trillados para el periodo seleccionado.</div>:(
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
          <thead><tr>{["Producto","kg Excelso","Costo/kg (con D)","Valor Total"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>
            {prodData.map(d=>(
              <tr key={d.prod}>
                <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.teal} bg={C.tealBg}/></td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgExcelso)} kg</td>
                <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoKg>0?fmtCOP(Math.round(d.costoKg)):"—"}</td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.purple,fontVariantNumeric:"tabular-nums"}}>{fmtCOP(Math.round(d.valorTotal))}</td>
              </tr>
            ))}
            <tr style={{background:C.navy}}>
              <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(totalKgExProd)} kg</td>
              <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmtCOP(Math.round(totalValorProd))}</td>
            </tr>
          </tbody>
        </table></TablaScrollV>
      )}
    </div>

    <div style={{...S.card,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:2}}>Factor Pretrilla Ponderado vs Factor Industrial Ponderado</div>
      <div style={{fontSize:11,color:C.textDim,marginBottom:14}}>Ponderado por kg reales movidos a trilladora — {lotesTF.length} lotes en el periodo</div>
      {(fiPonderado==null&&fpPonderado==null)?(
        <div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin datos de factor para este periodo.</div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"center"}}>
          <div style={{background:C.purpleBg,borderRadius:8,padding:"14px 10px",border:"1px solid "+C.purple+"30"}}><div style={{color:C.textDim,fontSize:10,marginBottom:4}}>FP Ponderado</div><div style={{color:C.purple,fontWeight:800,fontSize:fpPonderado!=null?20:11}}>{fpPonderado!=null?fmt(fpPonderado,1):"Sin datos"}</div></div>
          <div style={{background:C.greenBg,borderRadius:8,padding:"14px 10px",border:"1px solid "+C.green+"30"}}><div style={{color:C.textDim,fontSize:10,marginBottom:4}}>FI Ponderado</div><div style={{color:C.green,fontWeight:800,fontSize:fiPonderado!=null?20:11}}>{fiPonderado!=null?fmt(fiPonderado,1):"Sin datos"}</div></div>
          <div style={{background:C.bg,borderRadius:8,padding:"14px 10px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:10,marginBottom:4}}>Diferencia</div><div style={{color:difFactores!=null&&Math.abs(difFactores)<3?C.gold:C.red,fontWeight:800,fontSize:difFactores!=null?20:11}}>{difFactores!=null?fmt(difFactores,1):"Sin datos"}</div></div>
        </div>
      )}
    </div>

    <div style={{...S.card,marginBottom:16,minHeight:260}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Tendencia Semanal: Factor Industrial vs Factor Ponderado</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Semana ISO calculada desde la fecha real de trilla</div></div>
        <div style={{display:"flex",gap:12,fontSize:11}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:C.green,display:"inline-block"}}/>FI Ponderado</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:C.purple,display:"inline-block"}}/>FP Ponderado</span>
        </div>
      </div>
      {semanasData.every(d=>d.fi==null&&d.fp==null)?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",paddingTop:40}}>Sin datos de factor para este periodo.</div>:(()=>{
        const W=760,H=200,pt=20,pr=16,pb=32,pl=42;
        const cW=W-pl-pr,cH=H-pt-pb;
        const valores=semanasData.flatMap(d=>[d.fi,d.fp]).filter(v=>v!=null);
        const rawMax=valores.length?Math.max(...valores):100;
        const rawMin=valores.length?Math.min(...valores):0;
        const maxV=rawMax*1.08;
        const minV=Math.max(0,rawMin*0.9);
        const xStep=semanasData.length>1?cW/(semanasData.length-1):0;
        const yOf=v=>pt+cH-((v-minV)/((maxV-minV)||1))*cH;
        const xOf=i=>semanasData.length>1?pl+xStep*i:pl+cW/2;
        const linePts=(campo)=>semanasData.map((d,i)=>d[campo]!=null?`${xOf(i).toFixed(1)},${yOf(d[campo]).toFixed(1)}`:null).filter(Boolean).join(" ");
        const ticks=4;
        return(<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{overflow:"visible",display:"block"}}>
          {Array.from({length:ticks+1},(_,i)=>{const v=minV+(maxV-minV)*i/ticks;const y=yOf(v);return(<g key={i}><line x1={pl} y1={y} x2={pl+cW} y2={y} stroke={C.border} strokeWidth={i===0?"1.5":"0.6"} strokeDasharray={i===0?"":"5 3"}/><text x={pl-8} y={y+3} textAnchor="end" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{v.toFixed(0)}</text></g>);})}
          <polyline points={linePts("fi")} fill="none" stroke={C.green} strokeWidth="2.2"/>
          <polyline points={linePts("fp")} fill="none" stroke={C.purple} strokeWidth="2.2"/>
          {semanasData.map((d,i)=>(<g key={d.key}>
            {d.fi!=null&&<circle cx={xOf(i)} cy={yOf(d.fi)} r="3.2" fill={C.green}/>}
            {d.fp!=null&&<circle cx={xOf(i)} cy={yOf(d.fp)} r="3.2" fill={C.purple}/>}
            <text x={xOf(i)} y={pt+cH+16} textAnchor="middle" fontSize="8.5" fill={C.textDim} fontFamily="Inter,sans-serif">{d.label}</text>
          </g>))}
          <line x1={pl} y1={pt} x2={pl} y2={pt+cH} stroke={C.border} strokeWidth="1.5"/>
          <line x1={pl} y1={pt+cH} x2={pl+cW} y2={pt+cH} stroke={C.border} strokeWidth="1.5"/>
        </svg>);
      })()}
    </div>

    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Valor Total por Tipo — Bodega Café Fino</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>% por rubro · {filtroMesTR==="todos"?"todos los meses":filtroMesTR.charAt(0).toUpperCase()+filtroMesTR.slice(1)}</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:10,color:C.textDim}}>Total</div><div style={{fontSize:14,fontWeight:800,color:C.orange}}>{fmtCOP(triPieTotal)}</div></div>
      </div>
      {triPieData.length===0
        ?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"40px 0"}}>Sin costos registrados para Bodega Cafe Fino en este periodo.</div>
        :<DonutChart data={triPieData} labelKey="tipo" valueKey="val" centerLabel="valor total"/>
      }
    </div>
  </>);
}
