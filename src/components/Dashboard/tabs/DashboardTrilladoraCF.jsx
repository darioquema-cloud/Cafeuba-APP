import{C,S}from"../../../theme";
import{fmt}from"../../../lib/format";
import{KPI,Bdg,TablaScrollV}from"../../ui";
export function DashboardTrilladoraCF({lotesFino}){
  const lotesTCF=(lotesFino||[]).filter(l=>l.para_trilladora);
  const tcfExcelso=lotesTCF.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const tcfSalidas=lotesTCF.reduce((s,l)=>s+(l.salidas_trilladora||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const tcfStock=tcfExcelso-tcfSalidas;
  return(<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
      <KPI label="Lotes" value={lotesTCF.length} col={C.green}/>
      <KPI label="Excelso Total" value={fmt(tcfExcelso)+" kg"} col={C.navy}/>
      <KPI label="Salidas Excelso" value={fmt(tcfSalidas)+" kg"} col={C.orange}/>
      <KPI label="Stock Excelso" value={fmt(tcfStock)+" kg"} col={C.teal}/>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Lotes Trilladora Cafe Fino</div>
      {lotesTCF.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin lotes registrados.</div>:(
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}><thead><tr>{["Corte/Trillado","Mes","Producto","Excelso kg","Salidas kg","Stock kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{lotesTCF.map(l=>{const t=l.trilla||{};const sal=(l.salidas_trilladora||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=(t.kg_excelso||0)-sal;return(<tr key={l.id}>
          <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.green,fontSize:11}}>{t.nombre_trillado||l.codigo}</td>
          <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
          <td style={S.td}><Bdg label={l.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
          <td style={{...S.td,color:C.navy,fontWeight:600}}>{fmt(t.kg_excelso||0)} kg</td>
          <td style={{...S.td,color:C.orange}}>{fmt(sal)} kg</td>
          <td style={S.td}><span style={{color:stock>0?C.green:C.textDim,fontWeight:700}}>{fmt(stock)} kg</span></td>
        </tr>);})}
        </tbody></table></TablaScrollV>
      )}
    </div>
  </>);
}
