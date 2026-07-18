import{useState,useMemo}from"react";
import{C,S}from"../../theme";
import{KPI,Fld,Bdg}from"../ui";
import{EQUIPOS_SECADO,ECOL,EBG}from"../../data/constants";
import{fmt,fmtCOP,today,fmtFecha}from"../../lib/format";
import{diasEntre}from"../../lib/dates";
import{calcCosto}from"../../lib/costing";
import{RecepcionTab}from"../Recepcion/RecepcionTab";
export function Procesamiento({lotes,setLotes,costos,lotesFino,setLotesFino}){
  const [tab,setTab]=useState("recepcion");
  const [selP,setSelP]=useState(null);
  const [formP,setFormP]=useState({canecas:"",jugo:"",panela:"",harina:"",levadura:"",vr_jugo:"",vr_panela:"",vr_harina:"",vr_levadura:"",notas:""});
  const dispP=lotes.filter(l=>l.estado==="Recepcion");
  const tiP=(+formP.jugo||0)*(+formP.vr_jugo||0)+(+formP.panela||0)*(+formP.vr_panela||0)+(+formP.harina||0)*(+formP.vr_harina||0)+(+formP.levadura||0)*(+formP.vr_levadura||0);
  const avanzar=()=>{if(!selP)return;setLotes(p=>p.map(l=>l.id===selP.id?{...l,estado:"Proceso",canecas:+formP.canecas||l.canecas,insumos:{jugo:+formP.jugo,panela:+formP.panela,harina:+formP.harina,levadura:+formP.levadura,vr_jugo:+formP.vr_jugo,vr_panela:+formP.vr_panela,vr_harina:+formP.vr_harina,vr_levadura:+formP.vr_levadura},notas:formP.notas}:l));setSelP(null);};

  const [selS,setSelS]=useState(null);
  const [formS,setFormS]=useState({fecha_fin:"",kg_producto:"",bultos:"",humedad:"",equipo_secado:EQUIPOS_SECADO[0],notas:""});
  const enS=lotes.filter(l=>l.estado==="Secado");
  const cerrar=()=>{
    if(!selS)return;
    const kgC=selS.cereza.reduce((a,c)=>a+c.kg,0);
    const conv=+(kgC/(+formS.kg_producto||1)).toFixed(2);
    const nota="Lote "+selS.codigo+" terminado el "+(formS.fecha_fin||today())+": "+fmt(+formS.kg_producto)+" kg de pergamino (conversion "+conv+":1), humedad "+formS.humedad+"%, "+fmt(+formS.bultos)+" bultos. Pasa a Bodega Milan.";
    setLotes(p=>p.map(l=>l.id===selS.id?{...l,fecha_fin_secado:formS.fecha_fin||null,kg_producto:+formS.kg_producto,bultos:+formS.bultos,humedad:formS.humedad,equipo_secado:formS.equipo_secado,conversion:conv,notas:formS.notas,nota_terminado:nota,estado:"Bodega"}:l));
    setSelS(null);
  };
  const cl=selS?calcCosto({...selS,kg_producto:+formS.kg_producto||selS.kg_producto},costos,lotes):null;

  const historico=lotes.filter(l=>l.nota_terminado).sort((a,b)=>(b.fecha_fin_secado||"").localeCompare(a.fecha_fin_secado||""));
  const [filtroMesH,setFiltroMesH]=useState("");
  const [filtroProductoH,setFiltroProductoH]=useState("");
  const [busquedaH,setBusquedaH]=useState("");
  const mesesH=[...new Set(historico.map(l=>l.mes).filter(Boolean))].sort();
  const productosH=[...new Set(historico.map(l=>l.producto).filter(Boolean))].sort();
  const historicoFiltrado=useMemo(()=>historico.filter(l=>{
    if(filtroMesH&&l.mes!==filtroMesH)return false;
    if(filtroProductoH&&l.producto!==filtroProductoH)return false;
    if(busquedaH){const q=busquedaH.toLowerCase();const fi=[...new Set(l.cereza.map(c=>c.finca))];if(!l.codigo.toLowerCase().includes(q)&&!(l.producto||"").toLowerCase().includes(q)&&!fi.some(f=>f.toLowerCase().includes(q)))return false;}
    return true;
  }),[historico,filtroMesH,filtroProductoH,busquedaH]);
  const abrirEditarHistorico=(l)=>{setSelS(l);setFormS({fecha_fin:l.fecha_fin_secado||"",kg_producto:l.kg_producto||"",bultos:l.bultos||"",humedad:l.humedad||"",equipo_secado:l.equipo_secado||EQUIPOS_SECADO[0],notas:l.notas||""});setTab("secado");};
  const procesoStats=useMemo(()=>{const enP=lotes.filter(l=>l.estado==="Proceso");return{count:enP.length,kg:enP.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0),valor:enP.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0)};},[lotes]);

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACION 01-03</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Procesamiento - Recepcion, Fermentacion y Secado</div></div>
    <div style={{display:"flex",gap:8,marginBottom:20,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["recepcion","Recepcion"],["proceso","En Proceso"],["secado","En Secado"],["historico","Historico"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="recepcion"&&<RecepcionTab lotes={lotes} setLotes={setLotes} lotesFino={lotesFino} setLotesFino={setLotesFino}/>}

    {tab==="proceso"&&(<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:16}}><KPI label="Lotes en Proceso" value={procesoStats.count} col={C.orange}/><KPI label="kg Cereza en Proceso" value={fmt(procesoStats.kg)+" kg"} col={C.teal}/><KPI label="Valor Cereza en Proceso" value={fmtCOP(procesoStats.valor)} col={C.gold}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:16}}>
      <div><div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>Lotes para Procesar</div>{dispP.length===0&&<div style={{color:C.textFaint,fontSize:13}}>Sin lotes.</div>}{dispP.map(l=>{const kg=l.cereza.reduce((a,c)=>a+c.kg,0);return(<div key={l.id} onClick={()=>setSelP(l)} style={{...S.card2,marginBottom:8,cursor:"pointer",borderLeft:"3px solid "+(selP?.id===l.id?C.orange:C.border)}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{l.codigo}</span><span style={{color:C.textDim,fontSize:11}}>{fmtFecha(l.fecha_recibo)}</span></div><div style={{color:C.orange,fontSize:12,marginBottom:6}}>{l.tipo} - {l.producto}</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{[...new Set(l.cereza.map(c=>c.finca))].map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}<Bdg label={l.equipo_ferm} col={C.purple} bg={C.purpleBg}/><Bdg label={fmt(kg)+" kg"} col={C.gold} bg={C.goldBg}/></div></div>);})}</div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>En Proceso Activo</div>{lotes.filter(l=>l.estado==="Proceso").map(l=>(<div key={l.id} style={{...S.card2,marginBottom:8,borderLeft:"3px solid "+C.orange}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{l.codigo}</span><Bdg label="En Proceso" col={C.orange} bg={C.orangeBg}/></div><div style={{color:C.textDim,fontSize:11,marginBottom:8}}>{l.tipo} - {l.canecas} canecas - {l.equipo_ferm}</div><div style={{display:"flex",gap:6}}><button style={{...S.btn,background:C.orange,flex:1,fontSize:12}} onClick={()=>setLotes(p=>p.map(x=>x.id===l.id?{...x,estado:"Secado"}:x))}>Mover a Secado</button><button style={{...S.btnG,fontSize:12}} onClick={()=>{setSelP(l);setFormP({canecas:l.canecas||"",jugo:l.insumos?.jugo||"",panela:l.insumos?.panela||"",harina:l.insumos?.harina||"",levadura:l.insumos?.levadura||"",vr_jugo:l.insumos?.vr_jugo||"",vr_panela:l.insumos?.vr_panela||"",vr_harina:l.insumos?.vr_harina||"",vr_levadura:l.insumos?.vr_levadura||"",notas:l.notas||""});}}>Editar</button>{l.kg_producto===0&&(l.salidas_bodega||[]).length===0&&(<button style={{...S.btnG,fontSize:12,color:C.red,borderColor:C.red+"40"}} onClick={()=>{if(window.confirm("¿Eliminar el lote "+l.codigo+"? Esta accion no se puede deshacer."))setLotes(p=>p.filter(x=>x.id!==l.id));}}>Eliminar</button>)}</div></div>))}</div></div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registrar Proceso e Insumos</div>
        {!selP?(<div style={{color:C.textFaint,fontSize:13,padding:20}}>Selecciona un lote</div>):(
          <><div style={{background:C.orangeBg,border:"1px solid "+C.orange+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}><div style={{color:C.orange,fontWeight:700}}>{selP.codigo}</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>{selP.tipo} | {fmt(selP.cereza.reduce((a,c)=>a+c.kg,0))} kg | {selP.equipo_ferm}</div></div>
          <Fld label="N Canecas"><input style={S.input} type="number" step="0.1" value={formP.canecas} onChange={e=>setFormP(p=>({...p,canecas:e.target.value}))}/></Fld>
          <div style={{background:C.panel2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px",marginBottom:14}}><div style={{fontWeight:600,fontSize:12,color:C.navy,marginBottom:12}}>Insumos de Fermentacion</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Insumo","Cantidad","Valor Unit. COP","Total COP"].map(h=>(<th key={h} style={{...S.th,fontSize:10,padding:"6px 10px"}}>{h}</th>))}</tr></thead>
            <tbody>{[{k:"jugo",kv:"vr_jugo",l:"Jugo"},{k:"panela",kv:"vr_panela",l:"Panela"},{k:"harina",kv:"vr_harina",l:"Harina"},{k:"levadura",kv:"vr_levadura",l:"Levadura"}].map(ins=>(<tr key={ins.k}><td style={{...S.td,fontWeight:600,color:C.navy}}>{ins.l}</td><td style={S.td}><input style={{...S.input,padding:"6px 10px",fontSize:12}} type="number" step="0.01" placeholder="0" value={formP[ins.k]} onChange={e=>setFormP(p=>({...p,[ins.k]:e.target.value}))}/></td><td style={S.td}><input style={{...S.input,padding:"6px 10px",fontSize:12}} type="number" placeholder="0" value={formP[ins.kv]} onChange={e=>setFormP(p=>({...p,[ins.kv]:e.target.value}))}/></td><td style={{...S.td,color:C.gold,fontWeight:700,whiteSpace:"nowrap"}}>{fmtCOP((+formP[ins.k]||0)*(+formP[ins.kv]||0))}</td></tr>))}</tbody></table>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:10,padding:"8px 10px",background:C.goldBg,borderRadius:6}}><span style={{color:C.textDim,fontSize:12}}>Total Insumos: </span><span style={{color:C.gold,fontWeight:700,fontSize:14,marginLeft:8}}>{fmtCOP(tiP)}</span></div>
          </div>
          <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formP.notas} onChange={e=>setFormP(p=>({...p,notas:e.target.value}))}/></Fld>
          <button style={{...S.btn,background:C.orange,width:"100%"}} onClick={avanzar}>{selP.estado==="Proceso"?"Guardar Cambios":"Iniciar Proceso"}</button></>
        )}
      </div>
    </div></>)}

    {tab==="secado"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1.3fr",gap:16}}>
      <div>{enS.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes en secado activo.</div>}
        {enS.map(l=>{const dias=Math.max(0,Math.round((Date.now()-new Date(l.fecha_proceso))/86400000));const p=Math.min(100,(dias/20)*100);return(<div key={l.id} style={{...S.card,cursor:"pointer",marginBottom:10,borderLeft:"3px solid "+(selS?.id===l.id?C.gold:C.border)}} onClick={()=>{setSelS(l);setFormS({fecha_fin:"",kg_producto:"",bultos:"",humedad:"",equipo_secado:l.equipo_secado||EQUIPOS_SECADO[0],notas:""});}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</span>{l.kg_producto>0?<Bdg label="Listo" col={C.green} bg={C.greenBg}/>:<Bdg label={dias+"d secando"} col={C.gold} bg={C.goldBg}/>}</div>
          <div style={{color:C.textDim,fontSize:12,marginBottom:6}}>{l.producto} - {[...new Set(l.cereza.map(c=>c.finca))].join(", ")}</div>
          {l.fecha_lavado&&<div style={{color:C.textFaint,fontSize:11,marginBottom:6}}>Recepcion - Lavado: {diasEntre(l.fecha_recibo,l.fecha_lavado)} dias</div>}
          {l.equipo_secado&&<div style={{marginBottom:6}}><Bdg label={l.equipo_secado} col={C.teal} bg={C.tealBg}/></div>}
          <div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:p>85?C.red:C.gold,width:p+"%",height:"100%",borderRadius:4}}/></div>
        </div>);})}
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registrar Salida de Secado</div>
        {!selS?(<div style={{color:C.textFaint,fontSize:13}}>Selecciona un lote</div>):(
          <><div style={{background:C.goldBg,border:"1px solid "+C.gold+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}><div style={{color:C.gold,fontWeight:700}}>{selS.codigo}</div><div style={{color:C.textDim,fontSize:12}}>Entrada: {fmt(selS.cereza.reduce((a,c)=>a+c.kg,0))} kg cereza | Reactor: {selS.equipo_ferm}</div>{selS.fecha_lavado&&<div style={{color:C.textDim,fontSize:12,marginTop:2}}>Recepcion - Lavado: {diasEntre(selS.fecha_recibo,selS.fecha_lavado)} dias</div>}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
            <Fld label="Fecha Fin Secado" half><input style={S.input} type="date" value={formS.fecha_fin} onChange={e=>setFormS(p=>({...p,fecha_fin:e.target.value}))}/>{formS.fecha_fin&&<div style={{color:C.accent,fontSize:11,marginTop:4}}>Recepcion - Secado: {diasEntre(selS.fecha_recibo,formS.fecha_fin)} dias</div>}</Fld>
            <Fld label="Equipo de Secado" half><select style={S.select} value={formS.equipo_secado} onChange={e=>setFormS(p=>({...p,equipo_secado:e.target.value}))}>{EQUIPOS_SECADO.map(eq=>(<option key={eq}>{eq}</option>))}</select></Fld>
            <Fld label="kg Producto Terminado" half><input style={S.input} type="number" value={formS.kg_producto} onChange={e=>setFormS(p=>({...p,kg_producto:e.target.value}))}/>{formS.kg_producto&&<div style={{color:C.accent,fontSize:11,marginTop:4}}>Conv: {(selS.cereza.reduce((a,c)=>a+c.kg,0)/(+formS.kg_producto)).toFixed(2)}:1</div>}</Fld>
            <Fld label="Humedad Final %" half><input style={S.input} type="number" step="0.1" value={formS.humedad} onChange={e=>setFormS(p=>({...p,humedad:e.target.value}))}/></Fld>
            <Fld label="N Bultos"><input style={S.input} type="number" value={formS.bultos} onChange={e=>setFormS(p=>({...p,bultos:e.target.value}))}/></Fld>
          </div>
          {cl&&formS.kg_producto&&(<div style={{background:C.panel2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px",marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:12,color:C.navy,marginBottom:12}}>ANALISIS DE COSTO DEL LOTE (Central de Beneficio)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[{l:"Total Cereza",v:fmtCOP(cl.totalCereza),c:C.navy},{l:"Total Insumos",v:fmtCOP(cl.totalIns),c:C.orange},{l:"a) Costo cereza/kg seco",v:fmtCOP(cl.a),c:C.red},{l:"b) Costo insumos/kg seco",v:fmtCOP(cl.b),c:C.orange},{l:"c) Costo proceso CB/kg",v:fmtCOP(cl.c),c:C.purple},{l:"Costos CB "+selS.mes,v:fmtCOP((costos||[]).filter(x=>x.centro==="Central de Beneficio"&&x.mes===selS.mes).reduce((s,x)=>s+x.valor,0)),c:C.textDim}].map(x=>(<div key={x.l} style={{background:C.panel,borderRadius:6,padding:"10px 12px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:10,textTransform:"uppercase",marginBottom:3}}>{x.l}</div><div style={{color:x.c,fontWeight:700,fontSize:14}}>{x.v}</div></div>))}
            </div>
            <div style={{background:C.navy,borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600}}>a + b + c = Costo total / kg seco</span><span style={{color:C.white,fontWeight:800,fontSize:22}}>{fmtCOP(cl.total)}</span></div>
          </div>)}
          <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formS.notas} onChange={e=>setFormS(p=>({...p,notas:e.target.value}))}/></Fld>
          <button style={{...S.btn,background:C.gold,width:"100%"}} onClick={cerrar}>Cerrar Secado - Mover a Bodega</button></>
        )}
      </div>
    </div>)}

    {tab==="historico"&&(<div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Historico de Lotes Procesados</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar por codigo, producto, finca..." value={busquedaH} onChange={e=>setBusquedaH(e.target.value)}/>
        <select style={{...S.select,width:150}} value={filtroMesH} onChange={e=>setFiltroMesH(e.target.value)}><option value="">Todos los meses</option>{mesesH.map(m=>(<option key={m}>{m}</option>))}</select>
        <select style={{...S.select,width:160}} value={filtroProductoH} onChange={e=>setFiltroProductoH(e.target.value)}><option value="">Todos los productos</option>{productosH.map(p=>(<option key={p}>{p}</option>))}</select>
        {(filtroMesH||filtroProductoH||busquedaH)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMesH("");setFiltroProductoH("");setBusquedaH("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{historicoFiltrado.length} de {historico.length} lotes</span>
      </div>
      {(filtroMesH||filtroProductoH||busquedaH)&&(()=>{
        const sumPC=historicoFiltrado.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
        const sumPP=historicoFiltrado.reduce((s,l)=>s+(l.kg_producto||0),0);
        const convProm=sumPP>0?sumPC/sumPP:0;
        const sumKgSalP=historicoFiltrado.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0),0);
        const sumValSalP=historicoFiltrado.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),0),0);
        const stkP=sumPP-sumKgSalP;
        return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>LOTES</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{historicoFiltrado.length}</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG CEREZA</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumPC)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG PERGAMINO</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumPP)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>CONV PROM</div><div style={{color:"#fde68a",fontWeight:700,fontSize:15}}>{convProm>0?convProm.toFixed(2)+":1":"—"}</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK PERG</div><div style={{color:"#34d399",fontWeight:700,fontSize:15}}>{fmt(stkP)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumKgSalP)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumValSalP)}</div></div>
        </div>);
      })()}
      {historicoFiltrado.length===0&&<div style={{color:C.textFaint,fontSize:13}}>{historico.length===0?"Aun no hay lotes terminados.":"Sin resultados para los filtros aplicados."}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:12}}>
        {historicoFiltrado.map(l=>{const clH=calcCosto(l,costos,lotes);const kgCereza=l.cereza.reduce((a,c)=>a+c.kg,0);const fincasL=[...new Set(l.cereza.map(c=>c.finca))];return(
          <div key={l.id} style={{...S.card,marginBottom:0,borderLeft:"3px solid "+C.gold}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{l.codigo}</span><Bdg label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></div>
            <div style={{color:C.textDim,fontSize:12,marginBottom:8,lineHeight:1.5}}>{l.nota_terminado}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{fincasL.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
              {[{l:"kg Cereza",v:fmt(kgCereza)+" kg",c:C.navy},{l:"Costo Total MP",v:clH?fmtCOP(clH.totalCereza):"-",c:C.red},{l:"Costo Total Insumos",v:clH?fmtCOP(clH.totalIns):"-",c:C.orange}].map(d=>(<div key={d.l} style={{background:C.panel2,borderRadius:4,padding:"6px 8px"}}><div style={{color:C.textDim,fontSize:9,textTransform:"uppercase",marginBottom:1}}>{d.l}</div><div style={{color:d.c,fontWeight:600,fontSize:12}}>{d.v}</div></div>))}
            </div>
            {clH&&(<div style={{background:C.goldBg,border:"1px solid "+C.gold+"30",borderRadius:6,padding:"8px 10px",marginBottom:8}}>
              <div style={{color:C.gold,fontWeight:700,fontSize:11,marginBottom:3}}>Costo Central de Beneficio / kg</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:11}}><span style={{color:C.textDim}}>MP: <b style={{color:C.navy}}>{fmtCOP(clH.a)}</b></span><span style={{color:C.textDim}}>Insumos: <b style={{color:C.navy}}>{fmtCOP(clH.b)}</b></span><span style={{color:C.textDim}}>CB: <b style={{color:C.navy}}>{fmtCOP(clH.c)}</b></span><span style={{color:C.textDim}}>Total: <b style={{color:C.gold,fontSize:13}}>{fmtCOP(clH.total)}</b></span></div>
            </div>)}
            <button style={S.btnG} onClick={()=>abrirEditarHistorico(l)}>Editar</button>
          </div>
        );})}
      </div>
    </div>)}
  </div>);
}
