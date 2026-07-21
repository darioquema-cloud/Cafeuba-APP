import{useState}from"react";
import{C}from"../../theme";
import{DashboardCentral}from"./tabs/DashboardCentral";
import{DashboardBodegaMilan}from"./tabs/DashboardBodegaMilan";
import{DashboardTrilla}from"./tabs/DashboardTrilla";
import{DashboardBodegaCF}from"./tabs/DashboardBodegaCF";
import{DashboardTrilladoraCF}from"./tabs/DashboardTrilladoraCF";
import{DashboardBlends}from"./tabs/DashboardBlends";
import{DashboardMaquila}from"./tabs/DashboardMaquila";
import{DashboardUbaTostado}from"./tabs/DashboardUbaTostado";
const TABS_DASH=[["central","Central de Procesos"],["bodega_milan","Bodega Milan"],["trilla","Trilla"],["bodega_cf","Bodega Cafe Fino"],["trilladora_cf","Trilladora CF"],["blends","Blends"],["maquila","Maquila"],["uba_tostado","UBA Tostado"]];
export function Dashboard({lotes,costos,lotesFino,maquilas,blendsTostado,blends,blendsFino}){
  const [tabDash,setTabDash]=useState("central");
  return(<div>
    <div style={{marginBottom:16}}><div style={{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PLAN MILAN - CENTRAL DE BENEFICIO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Dashboard Ejecutivo</div><div style={{color:C.textDim,fontSize:12,marginTop:3}}>{new Date().toLocaleDateString("es-CO",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div></div>
    <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {TABS_DASH.map(([k,v])=>(<button key={k} onClick={()=>setTabDash(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:tabDash===k?700:400,color:tabDash===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tabDash===k?"3px solid "+C.accent:"3px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{v}</button>))}
    </div>
    {tabDash==="central"&&<DashboardCentral lotes={lotes} costos={costos}/>}
    {tabDash==="bodega_milan"&&<DashboardBodegaMilan lotes={lotes} costos={costos}/>}
    {tabDash==="trilla"&&<DashboardTrilla lotes={lotes}/>}
    {tabDash==="bodega_cf"&&<DashboardBodegaCF lotesFino={lotesFino}/>}
    {tabDash==="trilladora_cf"&&<DashboardTrilladoraCF lotesFino={lotesFino}/>}
    {tabDash==="blends"&&<DashboardBlends blends={blends} blendsFino={blendsFino}/>}
    {tabDash==="maquila"&&<DashboardMaquila maquilas={maquilas}/>}
    {tabDash==="uba_tostado"&&<DashboardUbaTostado blendsTostado={blendsTostado}/>}
  </div>);
}
