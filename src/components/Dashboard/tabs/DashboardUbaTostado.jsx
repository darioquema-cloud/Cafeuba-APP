import{C,S}from"../../../theme";
import{fmt}from"../../../lib/format";
import{mesDe}from"../../../lib/dates";
import{KPI,TablaScrollV}from"../../ui";
export function DashboardUbaTostado({blendsTostado}){
  const tostAll=blendsTostado||[];
  const tostKg=tostAll.reduce((s,t)=>s+(t.kg_tostado||0),0);
  const tostSal=tostAll.reduce((s,t)=>s+(t.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const tostStock=tostKg-tostSal;
  const tostRend=tostAll.length>0?((tostAll.reduce((s,t)=>{const ka=t.kg_a_tostar||0;return s+(ka>0?(t.kg_tostado||0)/ka*100:0);},0)/tostAll.length).toFixed(1)):0;
  return(<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
      <KPI label="Tostaciones" value={tostAll.length} col={C.purple}/>
      <KPI label="kg Tostado" value={fmt(tostKg)+" kg"} col={C.navy}/>
      <KPI label="Salidas kg" value={fmt(tostSal)+" kg"} col={C.orange}/>
      <KPI label="Stock kg" value={fmt(tostStock)+" kg"} col={C.green}/>
      <KPI label="Rend. Promedio" value={tostRend+"%"} col={C.teal}/>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Registros de Tostacion</div>
      {tostAll.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin registros de tostacion.</div>:(
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:750}}><thead><tr>{["Codigo","Mes","Producto","kg a Tostar","kg Tostado","Rend.","Stock kg","Responsable"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{[...tostAll].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map(t=>{const sal=(t.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=(t.kg_tostado||0)-sal;const rend=(t.kg_a_tostar||0)>0?((t.kg_tostado||0)/(t.kg_a_tostar)*100).toFixed(1):0;return(<tr key={t.id}>
          <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.purple,fontSize:11}}>{t.codigo||"—"}</td>
          <td style={{...S.td,textTransform:"capitalize"}}>{mesDe(t.fecha)}</td>
          <td style={{...S.td,fontWeight:600}}>{t.nombre_producto||"—"}</td>
          <td style={{...S.td,color:C.navy}}>{fmt(t.kg_a_tostar||0)} kg</td>
          <td style={{...S.td,color:C.purple,fontWeight:700}}>{fmt(t.kg_tostado||0)} kg</td>
          <td style={{...S.td,color:C.accent}}>{rend}%</td>
          <td style={S.td}><span style={{color:stock>0?C.green:C.textDim,fontWeight:700}}>{fmt(stock)} kg</span></td>
          <td style={S.td}>{t.responsable||"—"}</td>
        </tr>);})}
        </tbody></table></TablaScrollV>
      )}
    </div>
  </>);
}
