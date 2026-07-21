import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmtCOP,fmt}from"../../../lib/format";
import{calcCosto}from"../../../lib/costing";
import{Bdg,TablaScrollV}from"../../ui";
export function DashboardBodegaMilan({lotes,costos}){
  const [filtroMesBM,setFiltroMesBM]=useState("todos");
  const lotesBM=lotes.filter(l=>l.kg_producto>0&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual");
  const lotesBMFilt=filtroMesBM==="todos"?lotesBM:lotesBM.filter(l=>l.mes===filtroMesBM);
  const bmDetalle=lotesBMFilt.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);const cst=calcCosto(l,costos,lotes);const ck=cst?cst.total:0;return{...l,_stock:l.kg_producto-sal,_salTot:sal,_costoKg:ck,_costoTotal:ck*l.kg_producto};});
  const bmKgEnt=bmDetalle.reduce((s,l)=>s+l.kg_producto,0);
  const bmValEnt=bmDetalle.reduce((s,l)=>s+l._costoTotal,0);
  const bmStockKg=bmDetalle.reduce((s,l)=>s+l._stock,0);
  const bmSalidasKg=bmDetalle.reduce((s,l)=>s+l._salTot,0);
  const bmValSalidas=lotesBMFilt.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  const bmValStock=bmDetalle.reduce((s,l)=>s+l._stock*l._costoKg,0);
  const bmPorProd={};bmDetalle.forEach(l=>{const p=l.producto||"Sin Producto";if(!bmPorProd[p])bmPorProd[p]={kgEnt:0,costoTot:0,kgSal:0,kgStock:0};bmPorProd[p].kgEnt+=l.kg_producto;bmPorProd[p].costoTot+=l._costoTotal;bmPorProd[p].kgSal+=l._salTot;bmPorProd[p].kgStock+=l._stock;});
  const bmProdData=Object.entries(bmPorProd).sort((a,b)=>b[1].kgEnt-a[1].kgEnt).map(([prod,d])=>({prod,kgEnt:d.kgEnt,costoUk:d.kgEnt>0?d.costoTot/d.kgEnt:0,kgSal:d.kgSal,kgStock:d.kgStock}));
  return(<>
    {(()=>{const mesesBM=MESES.filter(m=>lotesBM.some(l=>l.mes===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
      <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
        {["todos",...mesesBM].map(m=>(<button key={m} onClick={()=>setFiltroMesBM(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesBM===m?C.navy:C.border),background:filtroMesBM===m?C.navy:"transparent",color:filtroMesBM===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesBM===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
      </div>
      {filtroMesBM!=="todos"&&<span style={{fontSize:11,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.accentBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesBM.charAt(0).toUpperCase()+filtroMesBM.slice(1)}</span>}
    </div>);})()}
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:10,marginBottom:18}}>
      {[{label:"Lotes Entrada",value:bmDetalle.length,sub:lotesBM.length+" lotes total",col:C.navy,icon:"📥"},{label:"kg Entrada",value:fmt(bmKgEnt)+" kg",sub:"café pergamino",col:C.teal,icon:"⚖️"},{label:"Valor Entrada",value:fmtCOP(bmValEnt),sub:"costo total entrada",col:C.gold,icon:"💰",fs:14},{label:"kg Salidas",value:fmt(bmSalidasKg)+" kg",sub:"transferido / vendido",col:C.orange,icon:"📤"},{label:"Valor Salidas",value:fmtCOP(bmValSalidas),sub:"valor total salidas",col:C.accent,icon:"💸",fs:14},{label:"kg Stock",value:fmt(bmStockKg)+" kg",sub:"disponible en bodega",col:C.green,icon:"🏪"},{label:"Valor Stock",value:fmtCOP(bmValStock),sub:"valorización a costo",col:C.purple,icon:"📊",fs:14}].map(k=>(
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
        <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{bmProdData.length} productos · {bmDetalle.length} lotes en total</div></div>
        <div style={{display:"flex",gap:18,fontSize:11,color:C.textDim}}>
          <span>Entrada: <strong style={{color:C.teal}}>{fmt(bmKgEnt)} kg</strong></span>
          <span>Salidas: <strong style={{color:C.orange}}>{fmt(bmSalidasKg)} kg</strong></span>
          <span>Stock: <strong style={{color:C.green}}>{fmt(bmStockKg)} kg</strong></span>
        </div>
      </div>
      {bmProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin lotes registrados para el periodo seleccionado.</div>:(
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
          <thead><tr>{["Producto","kg Entrada","Valor Unitario","kg Salidas","kg Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>
            {bmProdData.map(d=>(
              <tr key={d.prod}>
                <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.teal} bg={C.tealBg}/></td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgEnt)} kg</td>
                <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoUk>0?fmtCOP(d.costoUk):"—"}</td>
                <td style={{...S.td,textAlign:"right",color:C.orange,fontVariantNumeric:"tabular-nums"}}>{d.kgSal>0?fmt(d.kgSal)+" kg":"—"}</td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}><span style={{color:d.kgStock>0?C.green:C.textDim}}>{fmt(d.kgStock)} kg</span></td>
              </tr>
            ))}
            <tr style={{background:C.navy}}>
              <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(bmKgEnt)} kg</td>
              <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{bmSalidasKg>0?fmt(bmSalidasKg)+" kg":"—"}</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(bmStockKg)} kg</td>
            </tr>
          </tbody>
        </table></TablaScrollV>
      )}
    </div>
  </>);
}
