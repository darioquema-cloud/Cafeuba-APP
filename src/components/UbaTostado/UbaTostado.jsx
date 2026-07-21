import{useState}from"react";
import{C,S}from"../../theme";
import{TabTueste}from"./TabTueste";
import{TabEmpaque}from"./TabEmpaque";
import{TabVentasTostado}from"./TabVentasTostado";
const TABS=[["tueste","Tueste"],["empaque","Empaque"],["ventas","Ventas Tostado"]];
export function UbaTostado({blendsTostado,setBlendsTostado,blendsFino,lotesFino,setLotesFino,setBlendsFino,empaques,setEmpaques,ventasTostado,setVentasTostado,configEmpaque,setConfigEmpaque}){
  const [tab,setTab]=useState("tueste");
  return(<div>
    <div style={{marginBottom:16}}>
      <div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PROCESO DE TUESTE</div>
      <div style={{color:C.navy,fontSize:22,fontWeight:700}}>UBA Tostado</div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {TABS.map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:tab===k?700:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"3px solid "+C.orange:"3px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{v}</button>))}
    </div>
    {tab==="tueste"&&<TabTueste blendsTostado={blendsTostado} setBlendsTostado={setBlendsTostado} blendsFino={blendsFino} lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsFino={setBlendsFino} empaques={empaques}/>}
    {tab==="empaque"&&<TabEmpaque blendsTostado={blendsTostado} empaques={empaques} setEmpaques={setEmpaques} configEmpaque={configEmpaque} setConfigEmpaque={setConfigEmpaque}/>}
    {tab==="ventas"&&<TabVentasTostado empaques={empaques} ventasTostado={ventasTostado} setVentasTostado={setVentasTostado} configEmpaque={configEmpaque}/>}
  </div>);
}
