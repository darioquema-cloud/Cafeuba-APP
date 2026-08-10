import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmt,fmtCOP}from"../../../lib/format";
import{KPI}from"../../ui";
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
  const kgTrillados=maqAll.reduce((s,m)=>s+(m.trilla_mq?.kg_excelso||0),0);
  const kgTostados=maqAll.reduce((s,m)=>s+(m.tostado_mq?.kg_cafe_tostado||0),0);
  const barrasMaquila=[
    {label:"Kg Recibidos",valor:maqKg,col:C.navy},
    {label:"Kg Trillados",valor:kgTrillados,col:C.orange},
    {label:"Kg Tostado",valor:kgTostados,col:C.purple},
  ];
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
      <div style={S.card}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Kg por Categoria</div>
        {maqAll.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin maquilas registradas.</div>:(()=>{
          const maxV=Math.max(...barrasMaquila.map(b=>b.valor),1);
          return(<div style={{display:"flex",flexDirection:"column",gap:14,paddingTop:6}}>
            {barrasMaquila.map(b=>(
              <div key={b.label}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                  <span style={{color:C.text,fontWeight:600}}>{b.label}</span>
                  <span style={{color:b.col,fontWeight:700}}>{fmt(b.valor)} kg</span>
                </div>
                <div style={{background:C.bg,borderRadius:6,height:18,overflow:"hidden"}}>
                  <div style={{width:(b.valor/maxV*100)+"%",height:"100%",background:b.col,borderRadius:6,transition:"width 0.3s"}}/>
                </div>
              </div>
            ))}
          </div>);
        })()}
      </div>
    </div>
  </>);
}
