import{C,S}from"../../../theme";
import{fmt}from"../../../lib/format";
import{KPI,Bdg,TablaScrollV}from"../../ui";
export function DashboardTrilla({lotes}){
  const lotesTrilla=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const triExcelso=lotesTrilla.reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const triEntrada=lotesTrilla.reduce((s,l)=>s+(l.trilla.entrada_usada||l.kg_producto||0),0);
  const triMerma=lotesTrilla.reduce((s,l)=>s+(l.trilla.merma||0),0);
  const triRend=triEntrada>0?((triExcelso/triEntrada)*100).toFixed(1):0;
  return(<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
      <KPI label="Lotes Trillados" value={lotesTrilla.length} col={C.green}/>
      <KPI label="Excelso Total" value={fmt(triExcelso)+" kg"} col={C.navy}/>
      <KPI label="Merma Total" value={fmt(triMerma)+" kg"} col={C.red}/>
      <KPI label="Rendimiento Prom." value={triRend+"%"} col={C.teal}/>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Registros de Trilla</div>
      {lotesTrilla.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin trillas registradas.</div>:(
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr>{["Corte/Lote","Mes","Producto","Entrada kg","Excelso kg","Merma kg","Rendimiento","P.Elec","Cat.Dens"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{[...lotesTrilla].sort((a,b)=>(b.trilla?.fecha_trilla||"").localeCompare(a.trilla?.fecha_trilla||"")).map(l=>{
          const t=l.trilla;const ent=t.entrada_usada||l.kg_producto||0;const rend=ent>0?((t.kg_excelso/ent)*100).toFixed(1):0;
          return(<tr key={l.id}>
            <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.green,fontSize:11}}>{t.nombre_trillado||l.codigo}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
            <td style={S.td}><Bdg label={l.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
            <td style={{...S.td,color:C.navy}}>{fmt(ent)} kg</td>
            <td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(t.kg_excelso)} kg</td>
            <td style={{...S.td,color:C.red}}>{fmt(t.merma||0)} kg</td>
            <td style={{...S.td,color:C.accent,fontWeight:600}}>{rend}%</td>
            <td style={S.td}>{fmt(t.pasilla_elec||0)} kg</td>
            <td style={S.td}>{fmt(t.catadora_dens||0)} kg</td>
          </tr>);
        })}</tbody></table></TablaScrollV>
      )}
    </div>
  </>);
}
