import{C,S}from"../../../theme";
import{fmt}from"../../../lib/format";
import{mesDe}from"../../../lib/dates";
import{KPI,Bdg,TablaScrollV}from"../../ui";
export function DashboardMaquila({maquilas}){
  const maqAll=maquilas||[];
  const maqActivas=maqAll.filter(m=>m.estado_pipeline!=="entregado");
  const maqKg=maqAll.reduce((s,m)=>s+(m.kg_recibidos||0),0);
  return(<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
      <KPI label="Total Maquilas" value={maqAll.length} col={C.accent}/>
      <KPI label="En Proceso" value={maqActivas.length} col={C.orange}/>
      <KPI label="kg Recibidos" value={fmt(maqKg)+" kg"} col={C.navy}/>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Registros de Maquila</div>
      {maqAll.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin maquilas registradas.</div>:(
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}><thead><tr>{["Codigo","Mes","Cliente","kg Recibidos","Servicio","Estado"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{[...maqAll].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map(m=>(<tr key={m.id}>
          <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.accent,fontSize:11}}>{m.codigo||"—"}</td>
          <td style={{...S.td,textTransform:"capitalize"}}>{m.mes||mesDe(m.fecha)}</td>
          <td style={{...S.td,fontWeight:600}}>{m.cliente}</td>
          <td style={{...S.td,color:C.navy,fontWeight:600}}>{fmt(m.kg_recibidos||0)} kg</td>
          <td style={S.td}>{m.servicio||"—"}</td>
          <td style={S.td}><Bdg label={m.estado_pipeline||m.estado||"—"} col={C.teal} bg={C.tealBg}/></td>
        </tr>))}
        </tbody></table></TablaScrollV>
      )}
    </div>
  </>);
}
