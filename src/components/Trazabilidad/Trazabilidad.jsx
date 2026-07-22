import{useState}from"react";
import{C,S}from"../../theme";
import{Bdg,TablaScrollV}from"../ui";
import{ECOL,EBG}from"../../data/constants";
import{fmt,fmtCOP,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{calcCosto,calcCostoTri}from"../../lib/costing";
import{pesoATrilladora}from"../../lib/stock";
export function Trazabilidad({lotes,costos,blends,blendsFino,lotesFino}){
  const [tab,setTab]=useState("lotes_op");
  const [filtroMesLotes,setFiltroMesLotes]=useState("");
  const [filtroProductoOp,setFiltroProductoOp]=useState("");
  const [filtroMesBlends,setFiltroMesBlends]=useState("");
  const [filtroProductoComercialOp,setFiltroProductoComercialOp]=useState("");
  const [filtroLinea,setFiltroLinea]=useState("");
  const [filtroStock,setFiltroStock]=useState("Todos");
  const PASOS=["Recepcion","Proceso","Secado","Bodega","Finalizado","Cerrado"];
  const mesesOp=[...new Set(lotes.map(l=>l.mes).filter(Boolean))].sort();
  const productosOp=[...new Set(lotes.map(l=>l.producto).filter(Boolean))].sort();
  const blendsUnificados=[...(blends||[]).map(b=>({...b,linea:"Verde"})),...(blendsFino||[]).map(b=>({...b,linea:"Café Fino"}))].sort((a,b2)=>(b2.fecha||"").localeCompare(a.fecha||""));
  const productosComercialesBlend=[...new Set(blendsUnificados.map(b=>b.producto_comercial).filter(Boolean))].sort();
  const mesesBlend=[...new Set(blendsUnificados.map(b=>mesDe(b.fecha)).filter(Boolean))].sort();
  const stockB=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const lotesOpFiltrados=lotes.filter(l=>{
    if(filtroMesLotes&&l.mes!==filtroMesLotes)return false;
    if(filtroProductoOp&&l.producto!==filtroProductoOp)return false;
    return true;
  });
  const blendsOpFiltrados=blendsUnificados.filter(b=>{
    if(filtroMesBlends&&mesDe(b.fecha)!==filtroMesBlends)return false;
    if(filtroProductoComercialOp&&b.producto_comercial!==filtroProductoComercialOp)return false;
    if(filtroLinea&&b.linea!==filtroLinea)return false;
    const stk=stockB(b);
    if(filtroStock==="En Stock"&&stk<=0)return false;
    if(filtroStock==="Vendidos"&&!(b.salidas||[]).filter(s=>!s.auto_blend).length)return false;
    return true;
  });
  const renderItemDetail=(b,it)=>{
    if(b.linea==="Verde"){
      const r=lotes.find(x=>x.id===it.reprId);
      if(!r)return null;
      const kgC=r.cereza.reduce((a,c)=>a+c.kg,0);
      return(<div style={{display:"flex",gap:10,flexWrap:"wrap",color:C.textFaint,fontSize:10,marginTop:3}}><span>Cereza: {fmt(kgC)} kg</span><span>Pergamino: {fmt(r.kg_producto)} kg</span><span>F.Proceso: {r.fecha_proceso||"—"}</span><span>F.Secado: {r.fecha_fin_secado||"—"}</span><span>F.Trilla: {r.trilla?.fecha_trilla||"—"}</span></div>);
    }
    if(it.tipo==="finoblend"){
      const r=(blendsFino||[]).find(x=>x.id===it.reprId);
      return r?(<div style={{display:"flex",gap:10,flexWrap:"wrap",color:C.textFaint,fontSize:10,marginTop:3}}><span>Origen blend: {r.codigo}</span><span>kg blend: {fmt(r.kg_total)} kg</span></div>):null;
    }
    const r=(lotesFino||[]).find(x=>x.id===it.reprId);
    if(!r)return null;
    return(<div style={{display:"flex",gap:10,flexWrap:"wrap",color:C.textFaint,fontSize:10,marginTop:3}}>{r.kg_producto?<span>kg Producto: {fmt(r.kg_producto)} kg</span>:null}{r.trilla?.kg_excelso?<span>Excelso: {fmt(r.trilla.kg_excelso)} kg</span>:null}{r.proveedor?<span>Proveedor: {r.proveedor}</span>:null}{r.trilla?.fecha_trilla?<span>F.Trilla: {r.trilla.fecha_trilla}</span>:null}</div>);
  };
  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>TRAZABILIDAD & COSTOS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Seguimiento en Tiempo Real</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>{lotes.length} lotes operativos · {blendsUnificados.length} blends ({(blends||[]).length} Verde + {(blendsFino||[]).length} Café Fino)</div></div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["lotes_op","Lotes Operativos"],["blend_op","Blends"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>

    {tab==="lotes_op"&&(<>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <select style={{...S.select,width:150}} value={filtroMesLotes} onChange={e=>setFiltroMesLotes(e.target.value)}><option value="">Todos los meses</option>{mesesOp.map(m=>(<option key={m}>{m}</option>))}</select>
        <select style={{...S.select,width:160}} value={filtroProductoOp} onChange={e=>setFiltroProductoOp(e.target.value)}><option value="">Todos los productos</option>{productosOp.map(p=>(<option key={p}>{p}</option>))}</select>
        <span style={{color:C.textDim,fontSize:12,alignSelf:"center"}}>{lotesOpFiltrados.length} resultados</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:12}}>
        {lotesOpFiltrados.map(l=>{
          const kg=l.cereza.reduce((a,c)=>a+c.kg,0);const ei=PASOS.indexOf(l.estado);const cl=calcCosto(l,costos,lotes);
          const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=l.kg_producto-sal;
          const stockExcelso=(l.trilla?.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0);
          return(<div key={l.id} style={{...S.card,marginBottom:0,borderLeft:"3px solid "+(ECOL[l.estado]||C.border)}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{l.codigo}</div><div style={{color:C.textDim,fontSize:11,marginTop:2}}>{l.tipo} - {l.producto}</div></div><Bdg label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{[...new Set(l.cereza.map(c=>c.finca))].map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
              {[{l:"Reactor",v:l.equipo_ferm||"-",c:C.purple},{l:"Silo",v:l.equipo_secado||"-",c:C.teal},{l:"Fecha Secado",v:l.fecha_fin_secado||"-",c:C.textDim},{l:"Humedad",v:l.humedad?l.humedad+"%":"-",c:C.gold},{l:"kg Cereza Recibido",v:fmt(kg)+" kg",c:C.navy},{l:"kg Pergamino Producido",v:l.kg_producto?fmt(l.kg_producto)+" kg":"-",c:C.navy},{l:"Stock Bodega (Pergamino)",v:stock>0?fmt(stock)+" kg":"-",c:C.green},{l:"Excelso Trillado",v:l.trilla?.kg_excelso?fmt(l.trilla.kg_excelso)+" kg":"-",c:C.green},{l:"Stock Excelso",v:l.trilla?.kg_excelso?fmt(stockExcelso)+" kg":"-",c:stockExcelso>0?C.green:C.textFaint},{l:"Costo Final Excelso/kg",v:(()=>{const t=l.trilla;if(!cl||!(t?.kg_excelso>0))return"-";const D=calcCostoTri(l.mes,costos,lotes).costoTriKg;return fmtCOP(Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D));})(),c:C.purple}].map(d=>(<div key={d.l} style={{background:C.panel2,borderRadius:4,padding:"6px 8px"}}><div style={{color:C.textDim,fontSize:9,textTransform:"uppercase",marginBottom:1}}>{d.l}</div><div style={{color:d.c,fontWeight:600,fontSize:12}}>{d.v}</div></div>))}
            </div>
            {cl&&<div style={{background:C.goldBg,border:"1px solid "+C.gold+"30",borderRadius:6,padding:"8px 10px"}}><div style={{color:C.gold,fontWeight:700,fontSize:11,marginBottom:3}}>Costo por kg de Pergamino</div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><span style={{fontSize:11,color:C.textDim}}>Materia Prima: <b style={{color:C.navy}}>{fmtCOP(cl.a)}</b></span><span style={{fontSize:11,color:C.textDim}}>Insumos: <b style={{color:C.navy}}>{fmtCOP(cl.b)}</b></span><span style={{fontSize:11,color:C.textDim}}>Central Beneficio: <b style={{color:C.navy}}>{fmtCOP(cl.c)}</b></span><span style={{fontSize:11,color:C.textDim}}>Total: <b style={{color:C.gold,fontSize:13}}>{fmtCOP(cl.total)}</b></span></div></div>}
            <div style={{display:"flex",alignItems:"center",marginTop:12}}>{PASOS.map((p,i)=>{const done=i<=ei;const act=i===ei;const col=done?(ECOL[p]||C.accent):C.textFaint;return(<div key={p} style={{display:"flex",alignItems:"center",flex:1}}><div style={{width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:done?col:C.bg,border:"2px solid "+(done?col:C.border),fontSize:8,fontWeight:700,color:done?C.white:C.textFaint,flexShrink:0,boxShadow:act?"0 0 0 3px "+col+"30":"none"}}>{done?"v":i+1}</div>{i<PASOS.length-1&&<div style={{flex:1,height:2,background:i<ei?C.accent:C.border,margin:"0 2px"}}/>}</div>);})}</div>
          </div>);
        })}
      </div>
    </>)}

    {tab==="blend_op"&&(<div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <select style={{...S.select,width:150}} value={filtroMesBlends} onChange={e=>setFiltroMesBlends(e.target.value)}><option value="">Todos los meses</option>{mesesBlend.map(m=>(<option key={m}>{m}</option>))}</select>
        <select style={{...S.select,width:190}} value={filtroProductoComercialOp} onChange={e=>setFiltroProductoComercialOp(e.target.value)}><option value="">Todo producto comercial</option>{productosComercialesBlend.map(p=>(<option key={p}>{p}</option>))}</select>
        <select style={{...S.select,width:155}} value={filtroLinea} onChange={e=>setFiltroLinea(e.target.value)}><option value="">Todas las líneas</option><option>Verde</option><option>Café Fino</option></select>
        <select style={{...S.select,width:140}} value={filtroStock} onChange={e=>setFiltroStock(e.target.value)}><option>Todos</option><option>En Stock</option><option>Vendidos</option></select>
        <span style={{color:C.textDim,fontSize:12,alignSelf:"center"}}>{blendsOpFiltrados.length} resultados</span>
      </div>
      {blendsOpFiltrados.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>{blendsUnificados.length===0?"Sin blends registrados todavia.":"Ningun blend coincide con los filtros."}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(390px,1fr))",gap:12}}>
        {blendsOpFiltrados.map(b=>{
          const stk=stockB(b);
          const lineaCol=b.linea==="Verde"?C.green:C.purple;
          const lineaBg=b.linea==="Verde"?C.greenBg:C.purpleBg;
          const ventasSalidas=(b.salidas||[]).filter(s=>!s.auto_blend);
          const mostrarHistorial=(filtroStock==="Vendidos"||filtroStock==="Todos")&&ventasSalidas.length>0;
          return(
            <div key={b.id} style={{...S.card,marginBottom:0,borderLeft:"3px solid "+lineaCol}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                    <div style={{color:lineaCol,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{b.codigo}</div>
                    <Bdg label={b.linea} col={lineaCol} bg={lineaBg}/>
                  </div>
                  <div style={{color:C.textDim,fontSize:11}}>{b.nombre}{b.nombre?" — ":""}{fmtFecha(b.fecha)}</div>
                </div>
                <Bdg label={fmt(stk)+" kg stock"} col={stk>0?C.green:C.red} bg={stk>0?C.greenBg:C.redBg}/>
              </div>
              <div style={{fontWeight:600,fontSize:11,color:C.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Lotes Usados</div>
              {b.items.map(it=>(<div key={it.key} style={{padding:"6px 0",borderBottom:"1px solid "+C.border,fontSize:12}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                  <span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{it.codigo}</span>
                  <span style={{color:C.textDim}}>{fmt(it.kg_usado)} kg</span>
                  <span style={{color:C.gold}}>{fmtCOP(it.valor_kg)}/kg</span>
                  <span style={{fontWeight:600}}>{fmtCOP(it.valor_total)}</span>
                </div>
                {renderItemDetail(b,it)}
              </div>))}
              <div style={{background:C.navy,borderRadius:6,padding:"10px 12px",marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"rgba(255,255,255,0.8)",fontSize:12}}>kg Total: {fmt(b.kg_total)} | Costo Final/kg</span>
                <span style={{color:C.white,fontWeight:800,fontSize:16}}>{fmtCOP(Math.round(b.costo_kg))}</span>
              </div>
              {mostrarHistorial&&(<div style={{marginTop:12}}>
                <div style={{fontWeight:600,fontSize:11,color:C.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Historial de Ventas ({ventasSalidas.length})</div>
                {ventasSalidas.map(s=>(<div key={s.id} style={{padding:"8px 10px",marginBottom:4,borderRadius:4,background:C.panel2,fontSize:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4,marginBottom:s.factura||s.remision?4:0}}>
                    <span style={{color:C.textDim,minWidth:70}}>{fmtFecha(s.fecha)}</span>
                    <span style={{fontWeight:600,flex:1,minWidth:80}}>{s.cliente||"—"}</span>
                    <span style={{color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</span>
                    <span style={{color:C.gold}}>{fmtCOP(s.valor_kg)}/kg</span>
                    <span style={{color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</span>
                  </div>
                  {(s.factura||s.remision)&&<div style={{color:C.textFaint,fontSize:10}}>{[s.factura?"Fact: "+s.factura:"",s.remision?"Rem: "+s.remision:""].filter(Boolean).join(" · ")}</div>}
                </div>))}
              </div>)}
            </div>
          );
        })}
      </div>
    </div>)}
  </div>);
}
