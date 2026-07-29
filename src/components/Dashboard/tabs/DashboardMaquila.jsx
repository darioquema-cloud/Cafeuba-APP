import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmt,fmtCOP}from"../../../lib/format";
import{mesDe}from"../../../lib/dates";
import{KPI,Bdg,TablaScrollV}from"../../ui";
import{DonutChart}from"../../ui/DonutChart";
export function DashboardMaquila({maquilas}){
  const [filtroMesDash,setFiltroMesDash]=useState("todos");
  const maqAll=(maquilas||[]).filter(m=>filtroMesDash==="todos"||m.mes===filtroMesDash);
  const maqActivas=maqAll.filter(m=>m.estado_pipeline!=="entregado");
  const maqEntregadas=maqAll.filter(m=>m.estado_pipeline==="entregado");
  const maqKg=maqAll.reduce((s,m)=>s+(m.kg_recibidos||0),0);
  const kgEntregadosDe=(m)=>(m.entregas_mq||[]).reduce((s,e)=>s+(e.kg_entregados||0),0);
  const kgEntregadoTotal=maqAll.reduce((s,m)=>s+kgEntregadosDe(m),0);
  const kgPendiente=Math.max(0,maqKg-kgEntregadoTotal);
  const valorTotalServicios=maqAll.reduce((s,m)=>s+(m.entregas_mq||[]).reduce((a,e)=>a+(e.valor_servicio||0),0),0);
  const donutMaquila=[
    {label:"Entregado",valor:kgEntregadoTotal},
    {label:"Pendiente",valor:kgPendiente},
  ].filter(d=>d.valor>0);
  return(<>
    {(()=>{const mesesDisp=MESES.filter(m=>(maquilas||[]).some(x=>x.mes===m));return(
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
          {["todos",...mesesDisp].map(m=>(<button key={m} onClick={()=>setFiltroMesDash(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesDash===m?C.navy:C.border),background:filtroMesDash===m?C.navy:"transparent",color:filtroMesDash===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesDash===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
        </div>
        {filtroMesDash!=="todos"&&<span style={{fontSize:11,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.accentBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesDash.charAt(0).toUpperCase()+filtroMesDash.slice(1)}</span>}
      </div>
    );})()}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
      <KPI label="Total Maquilas" value={maqAll.length} col={C.accent} icon="🔄" autoFit/>
      <KPI label="En Proceso" value={maqActivas.length} col={C.orange} icon="⏳" autoFit/>
      <KPI label="Entregadas" value={maqEntregadas.length} col={C.green} icon="✅" autoFit/>
      <KPI label="Kg Recibidos" value={fmt(maqKg)+" kg"} col={C.navy} icon="📥" autoFit/>
      <KPI label="Kg Entregados" value={fmt(kgEntregadoTotal)+" kg"} col={C.teal} icon="📤" autoFit/>
      <KPI label="Pendiente de Entrega" value={fmt(kgPendiente)+" kg"} col={C.gold} icon="⚖️" autoFit/>
      <KPI label="Valor Total Servicios" value={fmtCOP(valorTotalServicios)} col={C.purple} icon="💰" autoFit/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16,marginBottom:20,alignItems:"start"}}>
      <div style={S.card}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Recibido vs. Entregado</div>
        <DonutChart data={donutMaquila} labelKey="label" valueKey="valor" centerLabel="kg recibidos"/>
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
    </div>
  </>);
}
