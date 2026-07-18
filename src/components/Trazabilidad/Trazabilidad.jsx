import{useState,useMemo}from"react";
import{C,S}from"../../theme";
import{Bdg,TablaScrollV}from"../ui";
import{ECOL,EBG}from"../../data/constants";
import{fmt,fmtCOP,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{calcCosto,calcCostoTri}from"../../lib/costing";
import{pesoATrilladora}from"../../lib/stock";
import{XD}from"../../data/xd";
// FIX 3: Trazabilidad con fecha secado, reactor, silo, humedad
export function Trazabilidad({lotes,costos,blends}){
  const [tab,setTab]=useState("lotes");
  const [q,setQ]=useState("");
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroTipo,setFiltroTipo]=useState("");
  const [filtroMesOp,setFiltroMesOp]=useState("");
  const [filtroProductoOp,setFiltroProductoOp]=useState("");
  const [filtroProductoComercialOp,setFiltroProductoComercialOp]=useState("");
  const PASOS=["Recepcion","Proceso","Secado","Bodega","Finalizado","Cerrado"];
  const productosDeBlendTz=(b)=>[...new Set(b.items.map(it=>lotes.find(x=>x.id===it.reprId)?.producto).filter(Boolean))];
  const mesesOp=[...new Set(lotes.map(l=>l.mes).filter(Boolean))].sort();
  const productosOp=[...new Set(lotes.map(l=>l.producto).filter(Boolean))].sort();
  const productosComercialesOp=[...new Set((blends||[]).map(b=>b.producto_comercial).filter(Boolean))].sort();
  const lotesOpFiltrados=lotes.filter(l=>{
    if(filtroMesOp&&l.mes!==filtroMesOp)return false;
    if(filtroProductoOp&&l.producto!==filtroProductoOp)return false;
    return true;
  });
  const blendsOpFiltrados=(blends||[]).filter(b=>{
    if(filtroMesOp&&mesDe(b.fecha)!==filtroMesOp)return false;
    if(filtroProductoComercialOp&&b.producto_comercial!==filtroProductoComercialOp)return false;
    if(filtroProductoOp&&!productosDeBlendTz(b).includes(filtroProductoOp))return false;
    return true;
  });
  const meses=[...new Set([...XD.lotes.map(l=>l.mes),...lotes.map(l=>l.mes)].filter(Boolean))].sort();
  const tipos=[...new Set([...XD.lotes.map(l=>l.tipo),...lotes.map(l=>l.tipo)].filter(Boolean))].sort();
  const xlotesF=useMemo(()=>XD.lotes.filter(l=>{if(filtroMes&&l.mes!==filtroMes)return false;if(filtroTipo&&l.tipo!==filtroTipo)return false;if(q){const fincas=(l.fin||[]).map(f=>f.f||"").join(" ").toLowerCase();if(!(l.cod||"").toLowerCase().includes(q.toLowerCase())&&!fincas.includes(q.toLowerCase())&&!(l.prod||"").toLowerCase().includes(q.toLowerCase()))return false;}return true;}),[q,filtroMes,filtroTipo]);

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>TRAZABILIDAD & COSTOS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Seguimiento en Tiempo Real</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>{XD.lotes.length} lotes del Excel + {lotes.length} lotes operativos</div></div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["lotes","Lotes Excel"],["costos","Analisis Costos"],["lotes_op","Lotes Operativos"],["blend_op","Blends"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {(tab==="lotes"||tab==="costos")&&(<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      <input style={{...S.input,flex:1,minWidth:200}} placeholder="Buscar codigo, finca, producto..." value={q} onChange={e=>setQ(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{meses.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}><option value="">Todos los tipos</option>{tipos.map(t=>(<option key={t}>{t}</option>))}</select>
      <span style={{color:C.textDim,fontSize:12,alignSelf:"center"}}>{xlotesF.length} lotes</span>
    </div>)}

    {(tab==="lotes_op"||tab==="blend_op")&&(<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      <select style={{...S.select,width:150}} value={filtroMesOp} onChange={e=>setFiltroMesOp(e.target.value)}><option value="">Todos los meses</option>{mesesOp.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProductoOp} onChange={e=>setFiltroProductoOp(e.target.value)}><option value="">Todos los productos</option>{productosOp.map(p=>(<option key={p}>{p}</option>))}</select>
      {tab==="blend_op"&&<select style={{...S.select,width:180}} value={filtroProductoComercialOp} onChange={e=>setFiltroProductoComercialOp(e.target.value)}><option value="">Todo producto comercial</option>{productosComercialesOp.map(p=>(<option key={p}>{p}</option>))}</select>}
      <span style={{color:C.textDim,fontSize:12,alignSelf:"center"}}>{tab==="lotes_op"?lotesOpFiltrados.length:blendsOpFiltrados.length} resultados</span>
    </div>)}

    {/* FIX 3: Lotes Excel con fecha secado, reactor, silo, humedad */}
    {tab==="lotes"&&(<div style={S.card}><TablaScrollV minWidth={1100}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}><thead><tr>{["Codigo","Mes","Fincas","kg Cereza","kg Seco","Conv.","Fecha Sec.","Reactor","Silo","Humedad","Producto","a) MP/kg","b) Ins/kg","c) CB/kg","Total/kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{xlotesF.map((l,i)=>(<tr key={i}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{l.cod}</td>
        <td style={{...S.td,color:C.textDim,textTransform:"capitalize"}}>{l.mes}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{(l.fin||[]).map((f,j)=>(<span key={j} style={{background:C.tealBg,border:"1px solid "+C.teal+"30",borderRadius:3,color:C.teal,fontSize:10,padding:"1px 5px"}}>{f.f}</span>))}</div></td>
        <td style={{...S.td,fontWeight:600}}>{fmt(l.tkg)}</td>
        <td style={{...S.td,fontWeight:600,color:C.green}}>{l.kgp?fmt(l.kgp):"?"}</td>
        <td style={{...S.td,color:C.textDim}}>{l.conv?fmt(l.conv,2):"?"}</td>
        {/* FIX 3: fecha secado */}
        <td style={{...S.td,color:C.textDim,fontSize:11}}>{l.fs||"?"}</td>
        {/* FIX 3: reactor y silo - no en Excel data, mostrar "?" */}
        <td style={S.td}><span style={{color:C.textFaint,fontSize:11}}>-</span></td>
        <td style={S.td}><span style={{color:C.textFaint,fontSize:11}}>-</span></td>
        <td style={{...S.td,color:C.gold}}>{l.hum!=null?(+l.hum*100<1?fmt(+l.hum*100,1):fmt(l.hum,1))+"%":"?"}</td>
        <td style={S.td}><span style={{background:C.tealBg,border:"1px solid "+C.teal+"30",borderRadius:3,color:C.teal,fontSize:11,padding:"2px 7px",fontWeight:600}}>{l.prod}</span></td>
        <td style={{...S.td,color:C.orange}}>{fmtCOP(l.a)}</td>
        <td style={{...S.td,color:C.red}}>{fmtCOP(l.b)}</td>
        <td style={{...S.td,color:C.purple}}>{fmtCOP(l.c)}</td>
        <td style={{...S.td,fontWeight:700,color:l.tot?(l.tot>50000?C.red:C.green):C.textFaint}}>{fmtCOP(l.tot)}</td>
      </tr>))}</tbody></table></TablaScrollV></div>)}

    {tab==="lotes_op"&&(<div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:12}}>
      {lotesOpFiltrados.map(l=>{
        const kg=l.cereza.reduce((a,c)=>a+c.kg,0);const ei=PASOS.indexOf(l.estado);const cl=calcCosto(l,costos,lotes);
        const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=l.kg_producto-sal;
        const stockExcelso=(l.trilla?.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0);
        return(<div key={l.id} style={{...S.card,marginBottom:0,borderLeft:"3px solid "+(ECOL[l.estado]||C.border)}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{l.codigo}</div><div style={{color:C.textDim,fontSize:11,marginTop:2}}>{l.tipo} - {l.producto}</div></div><Bdg label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{[...new Set(l.cereza.map(c=>c.finca))].map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div>
          {/* FIX 3: reactor, silo, fecha secado, humedad */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
            {[{l:"Reactor",v:l.equipo_ferm||"-",c:C.purple},{l:"Silo",v:l.equipo_secado||"-",c:C.teal},{l:"Fecha Secado",v:l.fecha_fin_secado||"-",c:C.textDim},{l:"Humedad",v:l.humedad?l.humedad+"%":"-",c:C.gold},{l:"kg Cereza Recibido",v:fmt(kg)+" kg",c:C.navy},{l:"kg Pergamino Producido",v:l.kg_producto?fmt(l.kg_producto)+" kg":"-",c:C.navy},{l:"Stock Bodega (Pergamino)",v:stock>0?fmt(stock)+" kg":"-",c:C.green},{l:"Excelso Trillado",v:l.trilla?.kg_excelso?fmt(l.trilla.kg_excelso)+" kg":"-",c:C.green},{l:"Stock Excelso",v:l.trilla?.kg_excelso?fmt(stockExcelso)+" kg":"-",c:stockExcelso>0?C.green:C.textFaint},{l:"Costo Final Excelso/kg",v:(()=>{const t=l.trilla;if(!cl||!(t?.kg_excelso>0))return"-";const D=calcCostoTri(l.mes,costos,lotes).costoTriKg;return fmtCOP(Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D));})(),c:C.purple}].map(d=>(<div key={d.l} style={{background:C.panel2,borderRadius:4,padding:"6px 8px"}}><div style={{color:C.textDim,fontSize:9,textTransform:"uppercase",marginBottom:1}}>{d.l}</div><div style={{color:d.c,fontWeight:600,fontSize:12}}>{d.v}</div></div>))}
          </div>
          {cl&&<div style={{background:C.goldBg,border:"1px solid "+C.gold+"30",borderRadius:6,padding:"8px 10px"}}><div style={{color:C.gold,fontWeight:700,fontSize:11,marginBottom:3}}>Costo por kg de Pergamino</div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><span style={{fontSize:11,color:C.textDim}}>Materia Prima: <b style={{color:C.navy}}>{fmtCOP(cl.a)}</b></span><span style={{fontSize:11,color:C.textDim}}>Insumos: <b style={{color:C.navy}}>{fmtCOP(cl.b)}</b></span><span style={{fontSize:11,color:C.textDim}}>Central Beneficio: <b style={{color:C.navy}}>{fmtCOP(cl.c)}</b></span><span style={{fontSize:11,color:C.textDim}}>Total: <b style={{color:C.gold,fontSize:13}}>{fmtCOP(cl.total)}</b></span></div></div>}
          <div style={{display:"flex",alignItems:"center",marginTop:12}}>{PASOS.map((p,i)=>{const done=i<=ei;const act=i===ei;const col=done?(ECOL[p]||C.accent):C.textFaint;return(<div key={p} style={{display:"flex",alignItems:"center",flex:1}}><div style={{width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:done?col:C.bg,border:"2px solid "+(done?col:C.border),fontSize:8,fontWeight:700,color:done?C.white:C.textFaint,flexShrink:0,boxShadow:act?"0 0 0 3px "+col+"30":"none"}}>{done?"v":i+1}</div>{i<PASOS.length-1&&<div style={{flex:1,height:2,background:i<ei?C.accent:C.border,margin:"0 2px"}}/>}</div>);})}</div>
        </div>);
      })}
    </div></div>)}

    {tab==="blend_op"&&(<div>
      {blendsOpFiltrados.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>{(blends||[]).length===0?"Sin blends registrados todavia.":"Ningun blend coincide con el filtro."}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:12}}>
        {blendsOpFiltrados.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=b.kg_total-salKg;return(
          <div key={b.id} style={{...S.card,marginBottom:0,borderLeft:"3px solid "+C.purple}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{b.codigo}</div><div style={{color:C.textDim,fontSize:11,marginTop:2}}>{b.nombre} - Fecha Blend: {fmtFecha(b.fecha)}</div></div><Bdg label={fmt(stock)+" kg stock"} col={stock>0?C.green:C.red} bg={stock>0?C.greenBg:C.redBg}/></div>
            <div style={{fontWeight:600,fontSize:11,color:C.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Lotes Usados</div>
            {b.items.map(it=>{const loteRef=lotes.find(x=>x.id===it.reprId);const kgCereza=loteRef?loteRef.cereza.reduce((a,c)=>a+c.kg,0):null;return(<div key={it.key} style={{padding:"6px 0",borderBottom:"1px solid "+C.border,fontSize:12}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{it.codigo}</span>
                <span style={{color:C.textDim}}>{fmt(it.kg_usado)} kg</span>
                <span style={{color:C.gold}}>{fmtCOP(it.valor_kg)}/kg</span>
                <span style={{fontWeight:600}}>{fmtCOP(it.valor_total)}</span>
              </div>
              {loteRef&&(<div style={{display:"flex",gap:10,flexWrap:"wrap",color:C.textFaint,fontSize:10,marginTop:3}}>
                <span>Cereza: {fmt(kgCereza)} kg</span>
                <span>Pergamino: {fmt(loteRef.kg_producto)} kg</span>
                <span>F.Proceso: {loteRef.fecha_proceso||"—"}</span>
                <span>F.Secado: {loteRef.fecha_fin_secado||"—"}</span>
                <span>F.Trilla: {loteRef.trilla?.fecha_trilla||"—"}</span>
              </div>)}
            </div>);})}
            <div style={{background:C.navy,borderRadius:6,padding:"10px 12px",marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"rgba(255,255,255,0.8)",fontSize:12}}>kg Total: {fmt(b.kg_total)} | Costo Final/kg</span>
              <span style={{color:C.white,fontWeight:800,fontSize:16}}>{fmtCOP(Math.round(b.costo_kg))}</span>
            </div>
          </div>
        );})}
      </div>
    </div>)}

    {tab==="costos"&&(<div>{xlotesF.filter(l=>l.a).map((l,i)=>{const maxV=Math.max(l.a||0,l.b||0,l.c||0,1);return(<div key={i} style={{...S.card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div><div style={{fontFamily:"monospace",fontWeight:700,color:C.accent,fontSize:14}}>{l.cod}</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>{l.tipo} | {l.prod} | {l.mes}</div><div style={{marginTop:5,display:"flex",gap:3,flexWrap:"wrap"}}>{(l.fin||[]).map((f,j)=>(<span key={j} style={{background:C.tealBg,border:"1px solid "+C.teal+"30",borderRadius:3,color:C.teal,fontSize:11,padding:"2px 6px"}}>{f.f}</span>))}</div></div>
        <div style={{textAlign:"right"}}><div style={{color:C.textDim,fontSize:11}}>kg secos | Hum: {l.hum!=null?l.hum:"?"}</div><div style={{fontSize:20,fontWeight:700,color:C.navy}}>{fmt(l.kgp)} kg</div><div style={{color:C.textDim,fontSize:11}}>Fec. secado: {l.fs||"?"}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div style={{background:C.panel2,borderRadius:6,padding:"10px 12px"}}><div style={{color:C.textDim,fontSize:10,textTransform:"uppercase",marginBottom:3}}>Cereza Total</div><div style={{color:C.navy,fontWeight:700,fontSize:13}}>{fmtCOP(l.tcp)}</div></div>
        <div style={{background:C.panel2,borderRadius:6,padding:"10px 12px"}}><div style={{color:C.textDim,fontSize:10,textTransform:"uppercase",marginBottom:3}}>Insumos Total</div><div style={{color:C.navy,fontWeight:700,fontSize:13}}>{fmtCOP(l.tip)}</div></div>
        <div style={{background:C.panel2,borderRadius:6,padding:"10px 12px"}}><div style={{color:C.textDim,fontSize:10,textTransform:"uppercase",marginBottom:3}}>Conversion</div><div style={{color:C.navy,fontWeight:700,fontSize:13}}>{fmt(l.conv,2)}:1</div></div>
      </div>
      <div style={{background:C.panel2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px"}}>
        <div style={{fontWeight:600,color:C.navy,fontSize:12,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}}>Costo por kg de Cafe Seco</div>
        {[{lbl:"a) Materia Prima (Cereza)",v:l.a,col:C.orange},{lbl:"b) Insumos de Proceso",v:l.b,col:C.red},{lbl:"c) Central de Beneficio ("+l.mes+")",v:l.c,col:C.purple}].map((row,j)=>(<div key={j} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:C.textDim,fontSize:12}}>{row.lbl}</span><span style={{color:row.col,fontWeight:700,fontSize:13}}>{fmtCOP(row.v)}</span></div>
          <div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:row.col,width:maxV?(Math.min(100,(row.v||0)/maxV*100)):0+"%",height:"100%",borderRadius:4}}/></div>
        </div>))}
        <div style={{background:C.navy,borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600}}>a + b + c</span><span style={{color:C.white,fontWeight:800,fontSize:22}}>{fmtCOP(l.tot)}</span></div>
      </div>
    </div>);})}
    </div>)}

  </div>);
}
