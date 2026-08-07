import{useState}from"react";
import{C,S}from"../../theme";
import{Pipeline}from"../Pipeline/Pipeline";
import{Muestras}from"../Muestras/Muestras";
import{Visitas}from"../Visitas/Visitas";
const TABS=[["embudo","Embudo"],["muestras","Muestras"],["visitas","Visitas"]];
export function CRM({oportunidades,setOportunidades,muestras,setMuestras,visitas,setVisitas,user}){
  const [tab,setTab]=useState("embudo");
  return(<div>
    <div style={{marginBottom:16}}>
      <div style={{color:C.accent,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>RELACIÓN CON CLIENTES</div>
      <div style={{color:C.navy,fontSize:22,fontWeight:700}}>CRM</div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {TABS.map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:tab===k?700:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"3px solid "+C.accent:"3px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{v}</button>))}
    </div>
    {tab==="embudo"&&<Pipeline oportunidades={oportunidades} setOportunidades={setOportunidades} user={user}/>}
    {tab==="muestras"&&<Muestras muestras={muestras} setMuestras={setMuestras} oportunidades={oportunidades} user={user}/>}
    {tab==="visitas"&&<Visitas visitas={visitas} setVisitas={setVisitas} oportunidades={oportunidades} user={user}/>}
  </div>);
}
