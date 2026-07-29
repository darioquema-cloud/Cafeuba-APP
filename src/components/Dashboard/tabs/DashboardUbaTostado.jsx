import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmt,fmtCOP}from"../../../lib/format";
import{KPI}from"../../ui";
import{DonutChart}from"../../ui/DonutChart";
export function DashboardUbaTostado({blendsTostado,empaques}){
  const [filtroMesDash,setFiltroMesDash]=useState("todos");
  const tostAll=(blendsTostado||[]).filter(t=>filtroMesDash==="todos"||t.mes===filtroMesDash);
  const emp=empaques||[];
  const kgATostar=tostAll.reduce((s,t)=>s+(t.kg_a_tostar||0),0);
  const kgTostado=tostAll.reduce((s,t)=>s+(t.kg_cafe_tostado||0),0);
  const kgSalidas=tostAll.reduce((s,t)=>s+(t.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const kgEmpacado=emp.reduce((s,e)=>s+(e.kg_cafe_total||0),0);
  const kgStockGranel=Math.max(0,kgTostado-kgSalidas-kgEmpacado);
  const pendientes=tostAll.filter(t=>(t.kg_a_tostar||0)>0&&(!t.kg_cafe_tostado||t.kg_cafe_tostado===0));
  const valorTotalProducido=tostAll.reduce((s,t)=>s+(t.valor_total||0),0);
  const rendProm=tostAll.length>0?(tostAll.reduce((s,t)=>{const ka=t.kg_a_tostar||0;return s+(ka>0?(t.kg_cafe_tostado||0)/ka*100:0);},0)/tostAll.length).toFixed(1):0;
  const donutTostado=[
    {label:"Stock en Granel",valor:kgStockGranel},
    {label:"Empacado",valor:kgEmpacado},
    {label:"Salidas Directas",valor:kgSalidas},
  ].filter(d=>d.valor>0);
  const porProducto={};
  tostAll.forEach(t=>{
    const prod=t.nombre_producto||"Sin Producto";
    if(!porProducto[prod])porProducto[prod]={kg:0,valorTotal:0};
    porProducto[prod].kg+=t.kg_cafe_tostado||0;
    porProducto[prod].valorTotal+=t.valor_total||0;
  });
  const filaProductos=Object.entries(porProducto).map(([prod,d])=>({prod,kg:d.kg,valorTotal:d.valorTotal,valorUnit:d.kg>0?d.valorTotal/d.kg:0})).filter(f=>f.kg>0).sort((a,b)=>b.kg-a.kg);
  return(<>
    {(()=>{const mesesDisp=MESES.filter(m=>(blendsTostado||[]).some(t=>t.mes===m));return(
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
          {["todos",...mesesDisp].map(m=>(<button key={m} onClick={()=>setFiltroMesDash(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesDash===m?C.navy:C.border),background:filtroMesDash===m?C.navy:"transparent",color:filtroMesDash===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesDash===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
        </div>
        {filtroMesDash!=="todos"&&<span style={{fontSize:11,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.accentBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesDash.charAt(0).toUpperCase()+filtroMesDash.slice(1)}</span>}
      </div>
    );})()}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
      <KPI label="Tostaciones" value={tostAll.length} col={C.purple} icon="☕" autoFit/>
      <KPI label="Kg a Tostar" value={fmt(kgATostar)+" kg"} col={C.textDim} icon="📥" autoFit/>
      <KPI label="Kg Café Tostado" value={fmt(kgTostado)+" kg"} col={C.navy} icon="🔥" autoFit/>
      <KPI label="Rend. Promedio" value={rendProm+"%"} col={C.teal} icon="📊" autoFit/>
      <KPI label="Kg Empacado" value={fmt(kgEmpacado)+" kg"} col={C.accent} icon="📦" autoFit/>
      <KPI label="Stock en Granel" value={fmt(kgStockGranel)+" kg"} col={C.green} icon="🗄️" autoFit/>
      <KPI label="Pendientes de Tostar" value={pendientes.length} col={C.orange} icon="⏳" autoFit/>
      <KPI label="Valor Total Producido" value={fmtCOP(valorTotalProducido)} col={C.gold} icon="💰" autoFit/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16,marginBottom:20,alignItems:"start"}}>
      <div style={S.card}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Distribución del Café Tostado</div>
        <DonutChart data={donutTostado} labelKey="label" valueKey="valor" centerLabel="kg tostado"/>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Tostado por Producto</div>
        {filaProductos.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin registros de tostacion.</div>:(
          <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Producto","Kg Tostado","Valor Unitario Prom.","Valor Total"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{filaProductos.map(f=>(<tr key={f.prod}>
            <td style={{...S.td,fontWeight:600}}>{f.prod}</td>
            <td style={{...S.td,color:C.purple,fontWeight:700}}>{fmt(f.kg)} kg</td>
            <td style={{...S.td,color:C.gold}}>{fmtCOP(f.valorUnit)}</td>
            <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(f.valorTotal)}</td>
          </tr>))}
          </tbody></table>
        )}
      </div>
    </div>
  </>);
}
