import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmtCOP,fmt}from"../../../lib/format";
import{Bdg,TablaScrollV}from"../../ui";
export function DashboardBodegaCF({lotesFino}){
  const [filtroMesCF,setFiltroMesCF]=useState("todos");
  const lotesBCF=(lotesFino||[]).filter(l=>!l.para_trilladora);
  const lotesBCFFilt=filtroMesCF==="todos"?lotesBCF:lotesBCF.filter(l=>l.mes===filtroMesCF);
  const bcfDetalle=lotesBCFFilt.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);const ck=l.costo_compra_kg||0;return{...l,_stock:l.kg_producto-sal,_salTot:sal,_costoKg:ck,_costoTotal:ck*l.kg_producto};});
  const bcfEntradas=bcfDetalle.reduce((s,l)=>s+l.kg_producto,0);
  const bcfValEnt=bcfDetalle.reduce((s,l)=>s+l._costoTotal,0);
  const bcfSalidas=bcfDetalle.reduce((s,l)=>s+l._salTot,0);
  const bcfValSalidas=lotesBCFFilt.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  const bcfStock=bcfEntradas-bcfSalidas;
  const bcfValStock=bcfDetalle.reduce((s,l)=>s+l._stock*l._costoKg,0);
  const bcfPorProd={};bcfDetalle.forEach(l=>{const p=l.producto||"Sin Producto";if(!bcfPorProd[p])bcfPorProd[p]={kgEnt:0,costoTot:0,kgSal:0,kgStock:0};bcfPorProd[p].kgEnt+=l.kg_producto;bcfPorProd[p].costoTot+=l._costoTotal;bcfPorProd[p].kgSal+=l._salTot;bcfPorProd[p].kgStock+=l._stock;});
  const bcfProdData=Object.entries(bcfPorProd).sort((a,b)=>b[1].kgEnt-a[1].kgEnt).map(([prod,d])=>({prod,kgEnt:d.kgEnt,costoUk:d.kgEnt>0?d.costoTot/d.kgEnt:0,kgSal:d.kgSal,kgStock:d.kgStock}));
  return(<>
    {(()=>{const mesesCF=MESES.filter(m=>lotesBCF.some(l=>l.mes===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
      <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
        {["todos",...mesesCF].map(m=>(<button key={m} onClick={()=>setFiltroMesCF(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesCF===m?C.green:C.border),background:filtroMesCF===m?C.green:"transparent",color:filtroMesCF===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesCF===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
      </div>
      {filtroMesCF!=="todos"&&<span style={{fontSize:11,color:C.green,fontWeight:700,whiteSpace:"nowrap",background:C.greenBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesCF.charAt(0).toUpperCase()+filtroMesCF.slice(1)}</span>}
    </div>);})()}
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:10,marginBottom:18}}>
      {[{label:"Lotes Entrada",value:bcfDetalle.length,sub:lotesBCF.length+" lotes total",col:C.navy,icon:"📥"},{label:"kg Entrada",value:fmt(bcfEntradas)+" kg",sub:"café fino",col:C.teal,icon:"⚖️"},{label:"Valor Entrada",value:fmtCOP(bcfValEnt),sub:"costo total entrada",col:C.gold,icon:"💰",fs:14},{label:"kg Salidas",value:fmt(bcfSalidas)+" kg",sub:"transferido / vendido",col:C.orange,icon:"📤"},{label:"Valor Salidas",value:fmtCOP(bcfValSalidas),sub:"valor total salidas",col:C.accent,icon:"💸",fs:14},{label:"kg Stock",value:fmt(bcfStock)+" kg",sub:"disponible en bodega",col:C.green,icon:"🏪"},{label:"Valor Stock",value:fmtCOP(bcfValStock),sub:"valorización a costo",col:C.purple,icon:"📊",fs:14}].map(k=>(
        <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
            <span style={{fontSize:14}}>{k.icon}</span>
          </div>
          <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
          <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
        </div>
      ))}
    </div>
    <div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{bcfProdData.length} productos · {bcfDetalle.length} lotes en total</div></div>
        <div style={{display:"flex",gap:18,fontSize:11,color:C.textDim}}>
          <span>Entrada: <strong style={{color:C.teal}}>{fmt(bcfEntradas)} kg</strong></span>
          <span>Salidas: <strong style={{color:C.orange}}>{fmt(bcfSalidas)} kg</strong></span>
          <span>Stock: <strong style={{color:C.green}}>{fmt(bcfStock)} kg</strong></span>
        </div>
      </div>
      {bcfProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin lotes registrados para el periodo seleccionado.</div>:(
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
          <thead><tr>{["Producto","kg Entrada","Valor Unitario","kg Salidas","kg Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>
            {bcfProdData.map(d=>(
              <tr key={d.prod}>
                <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.green} bg={C.greenBg}/></td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgEnt)} kg</td>
                <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoUk>0?fmtCOP(d.costoUk):"—"}</td>
                <td style={{...S.td,textAlign:"right",color:C.orange,fontVariantNumeric:"tabular-nums"}}>{d.kgSal>0?fmt(d.kgSal)+" kg":"—"}</td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}><span style={{color:d.kgStock>0?C.green:C.textDim}}>{fmt(d.kgStock)} kg</span></td>
              </tr>
            ))}
            <tr style={{background:C.navy}}>
              <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(bcfEntradas)} kg</td>
              <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{bcfSalidas>0?fmt(bcfSalidas)+" kg":"—"}</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(bcfStock)} kg</td>
            </tr>
          </tbody>
        </table></TablaScrollV>
      )}
    </div>
  </>);
}
