import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Bdg,Fld,Modal,TablaScrollV,SelectDestino}from"../ui";
import{fmt,fmtCOP,numVal,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{semanaISO,mesDe}from"../../lib/dates";
import{calcCosto,calcCostoTri,getSeedCostoTri}from"../../lib/costing";
import{pesoATrilladora}from"../../lib/stock";
/* FIX 1: Bodega Trilladora - nueva seccion */
export function BodegaTrilladora({lotes,setLotes,costos,setLotesFino}){
  const [selLoteT,setSelLoteT]=useState(null);
  const [modalSalidaT,setModalSalidaT]=useState(false);
  const [formSalidaT,setFormSalidaT]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",observaciones:""});
  const [errSalidaT,setErrSalidaT]=useState("");
  const [editSalidaTId,setEditSalidaTId]=useState(null);
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const [hBusqT,setHBusqT]=useState("");const [hMesT,setHMesT]=useState("");const [hProdT,setHProdT]=useState("");
  const trilledLotes=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const mesesT=[...new Set(trilledLotes.map(l=>l.mes).filter(Boolean))].sort();
  const productosT=[...new Set(trilledLotes.map(l=>l.producto).filter(Boolean))].sort();
  const grupoDe=(l)=>[l,...lotes.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
  const stockGrupoDe=(l)=>{
    const grupo=grupoDe(l);
    const excelsoTotal=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
    const salTotal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
    return excelsoTotal-salTotal;
  };
  const construirGruposT=(arr)=>{
    const vistos=new Set();const grupos=[];
    arr.forEach(l=>{if(vistos.has(l.id))return;const grupo=grupoDe(l);grupo.forEach(x=>vistos.add(x.id));grupos.push(grupo);});
    return grupos;
  };
  const gruposTFiltrados=construirGruposT(trilledLotes).filter(grupo=>{
    if(filtroMes&&!grupo.some(l=>l.mes===filtroMes))return false;
    if(filtroProducto&&!grupo.some(l=>l.producto===filtroProducto))return false;
    if(busqueda&&!grupo.some(l=>l.codigo.toLowerCase().includes(busqueda.toLowerCase())))return false;
    return true;
  });
  const costoKgExDe=(l)=>{const cl=calcCosto(l,costos,lotes);const t=l.trilla;const D=calcCostoTri(l.mes,costos,lotes).costoTriKg;return cl&&t?.kg_excelso>0?Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D):0;};
  const stockTrilladora=(l)=>(l.trilla?.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0);
  const totalExcelso=trilledLotes.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const totalValorSalidasT=trilledLotes.reduce((s,l)=>s+(l.salidas_trilladora||[]).reduce((a,b)=>a+(b.valor_total||0),0),0);
  const stockActual=trilledLotes.reduce((s,l)=>{const stock=stockTrilladora(l);const costoKg=costoKgExDe(l);return {kg:s.kg+stock,val:s.val+(costoKg*stock)};},{kg:0,val:0});

  const abrirSalidaT=(l)=>{
    const stock=stockGrupoDe(l);
    if(stock<=0)return;
    setSelLoteT(l);
    setEditSalidaTId(null);
    setFormSalidaT({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:costoKgExDe(l)||"",valor_total:"",observaciones:""});
    setErrSalidaT("");
    setModalSalidaT(true);
  };
  const abrirEditarSalidaT=(l,s)=>{
    setSelLoteT(l);
    setEditSalidaTId(s.id);
    setFormSalidaT({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total,observaciones:s.observaciones||""});
    setErrSalidaT("");
    setModalSalidaT(true);
  };
  const regSalidaT=()=>{
    const peso=numVal(formSalidaT.peso_salida);
    if(!selLoteT||!(peso>0)){setErrSalidaT("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockGrupoDe(selLoteT)+(editSalidaTId?(selLoteT.salidas_trilladora||[]).find(x=>x.id===editSalidaTId)?.peso_salida||0:0);
    if(peso>stockBase){setErrSalidaT("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaT.valor_kg||0;
    const vtotal=vkg>0?peso*vkg:(+formSalidaT.valor_total||0);
    setLotes(p=>p.map(l=>{
      if(l.id!==selLoteT.id)return l;
      let sal;
      if(editSalidaTId){sal=(l.salidas_trilladora||[]).map(s=>s.id===editSalidaTId?{...s,fecha:formSalidaT.fecha,factura:formSalidaT.factura,remision:formSalidaT.remision,cliente:formSalidaT.cliente,destino_key:formSalidaT.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaT.observaciones}:s);}
      else{sal=[...(l.salidas_trilladora||[]),{id:genId(),fecha:formSalidaT.fecha,factura:formSalidaT.factura,remision:formSalidaT.remision,cliente:formSalidaT.cliente,destino_key:formSalidaT.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaT.observaciones}];}
      return{...l,salidas_trilladora:sal};
    }));
    // Auto-transferencia a Bodega Café Fino cuando destino = "café fino" — conserva el codigo original (item 3) y trazabilidad (item 5)
    if(formSalidaT.destino_key==="bodega_cf"){
      const fSalT=formSalidaT.fecha||today();
      setLotesFino(p=>[{id:genId(),codigo:selLoteT?.codigo||("CF-"+dateToCode(fSalT)),fecha:fSalT,mes:mesDe(fSalT),semana:semanaISO(fSalT),producto:selLoteT?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:vkg||0,valor_total:vtotal,notas:"Transferido desde Bodega Trilladora — "+selLoteT?.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],trazabilidad:{codigo_lote_origen:selLoteT?.codigo||"",fecha_proceso:selLoteT?.fecha_proceso||"",fecha_trilla:selLoteT?.trilla?.fecha_trilla||"",fecha_secado:selLoteT?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    setModalSalidaT(false);setEditSalidaTId(null);setErrSalidaT("");
  };

  return(<div>
    <div style={{marginBottom:22}}>
      <div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO</div>
      <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Bodega Trilladora - Excelso</div>
      <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Inventario de cafe excelso con costo total de produccion</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Excelso Total kg" value={fmt(totalExcelso)+" kg"} col={C.green}/>
      <KPI label="Stock Disponible kg" value={fmt(stockActual.kg)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock Disponible" value={fmtCOP(stockActual.val)} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidasT)} col={C.purple}/>
      <KPI label="Costo Prom/kg Ex" value={stockActual.kg>0?fmtCOP(Math.round(stockActual.val/stockActual.kg)):"—"} col={C.teal}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesT.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosT.map(p=>(<option key={p}>{p}</option>))}</select>
      {(filtroMes||filtroProducto||busqueda)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMes("");setFiltroProducto("");setBusqueda("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{gruposTFiltrados.length} de {construirGruposT(trilledLotes).length} grupos</span>
    </div>
    {(filtroMes||filtroProducto||busqueda)&&(()=>{
      const sumTExc=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.trilla?.kg_excelso||0),0),0);
      const sumTSal=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+c.peso_salida,0),0),0);
      const sumTStk=sumTExc-sumTSal;
      const sumTValSal=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+(c.valor_total||0),0),0),0);
      const sumTValStk=gruposTFiltrados.reduce((s,g)=>{
        const excelsoG=g.reduce((a,x)=>a+(x.trilla?.kg_excelso||0),0);
        const salG=g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+c.peso_salida,0),0);
        const stk=excelsoG-salG;
        const costoTG=g.reduce((a,x)=>{const cl=calcCosto(x,costos,lotes);return a+(cl?cl.total*pesoATrilladora(x):0);},0);
        const D=calcCostoTri(g[0].mes,costos,lotes).costoTriKg;
        const costoKgEx=excelsoG>0?Math.round(costoTG/excelsoG)+Math.round(D):0;
        return s+(stk*costoKgEx);
      },0);
      return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>GRUPOS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{gruposTFiltrados.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG EXCELSO</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumTExc)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumTStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR STOCK</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumTValStk))}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumTSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumTValSal)}</div></div>
      </div>);
    })()}
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Inventario por Lote</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>
        {["Codigo Lote","Cod. Trillado","Fecha Trilla","Corte","Mes","Producto","Fincas","kg Excelso","Costo MP/kg","Costo Trilladora/kg (D)","Costo Total/kg","Valor Total Lote","Salidas kg","Stock kg","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
      </tr></thead>
      <tbody>{gruposTFiltrados.map(grupo=>{
        const repr=grupo[0];
        const t=repr.trilla;
        const excelsoGrupo=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
        const efPeso=(x)=>pesoATrilladora(x)||(x.trilla?.kg_excelso||0);
        const efCostoKg=(x)=>{const p=pesoATrilladora(x);const cl=calcCosto(x,costos,lotes);if(p>0&&cl?.total>0)return cl.total;const stored=x.trilla?.costo_kg_excelso||0;return stored>0?stored:getSeedCostoTri(x.codigo,x.kg_producto);};
        const pesoEf=grupo.reduce((s,x)=>s+efPeso(x),0);
        const costoTotalGrupo=grupo.reduce((s,x)=>s+efCostoKg(x)*efPeso(x),0);
        const aProm=pesoEf>0?costoTotalGrupo/pesoEf:null;
        const D=calcCostoTri(repr.mes,costos,lotes).costoTriKg;
        const costoKgEx=excelsoGrupo>0?Math.round(costoTotalGrupo/excelsoGrupo)+Math.round(D):0;
        const fi=[...new Set(grupo.flatMap(x=>x.cereza.map(c=>c.finca)))];
        const salGrupo=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
        const stock=excelsoGrupo-salGrupo;
        return(<tr key={repr.id}>
          <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.accent} bg={C.accentBg}/>))}</div></td>
          <td style={{...S.td,color:C.green,fontWeight:600,fontFamily:"monospace",fontSize:11}}>{t.nombre_trillado||"—"}</td>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(t.fecha_trilla)}</td>
          <td style={S.td}><Bdg label={t.codigo_corte||"—"} col={C.accent}/></td>
          <td style={{...S.td,textTransform:"capitalize"}}>{repr.mes}</td>
          <td style={S.td}><Bdg label={repr.producto} col={C.teal} bg={C.tealBg}/></td>
          <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td>
          <td style={{...S.td,fontWeight:700,color:C.green,fontSize:15}}>{fmt(excelsoGrupo)} kg</td>
          <td style={{...S.td,color:C.orange}}>{aProm!=null?fmtCOP(Math.round(aProm)):"—"}</td>
          <td style={{...S.td,color:C.teal,fontWeight:600}}>{D?fmtCOP(Math.round(D)):"—"}</td>
          <td style={{...S.td,color:C.gold,fontWeight:700,fontSize:13}}>{fmtCOP(costoKgEx)}</td>
          <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(costoKgEx*excelsoGrupo)}</td>
          <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(salGrupo)}</td>
          <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
          <td style={S.td}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaT(repr)}>+ Salida</button></td>
        </tr>);
      })}</tbody></table></TablaScrollV>
    </div></>)}
    {tab==="historico"&&(()=>{const todasHT=trilledLotes.flatMap(l=>(l.salidas_trilladora||[]).map(s=>({...s,codigo:l.codigo,producto:l.producto,loteRef:l}))).sort((a,b)=>b.fecha.localeCompare(a.fecha));const mesesHT=[...new Set(todasHT.map(s=>mesDe(s.fecha)).filter(Boolean))].sort();const prodsHT=[...new Set(todasHT.map(s=>s.producto).filter(Boolean))].sort();const filtHT=todasHT.filter(s=>{if(hMesT&&mesDe(s.fecha)!==hMesT)return false;if(hProdT&&s.producto!==hProdT)return false;if(hBusqT){const q=hBusqT.toLowerCase();if(!s.codigo?.toLowerCase().includes(q)&&!s.cliente?.toLowerCase().includes(q)&&!(s.factura||"").toLowerCase().includes(q))return false;}return true;});return todasHT.length===0?(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>):(<div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontWeight:600,fontSize:14,color:C.navy}}>Historico de Salidas - Trilladora</span><span style={{color:C.textFaint,fontSize:12}}>{filtHT.length} de {todasHT.length} salidas</span></div><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}><input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar lote, cliente, factura..." value={hBusqT} onChange={e=>setHBusqT(e.target.value)}/><select style={{...S.select,width:140}} value={hMesT} onChange={e=>setHMesT(e.target.value)}><option value="">Todos los meses</option>{mesesHT.map(m=>(<option key={m}>{m}</option>))}</select><select style={{...S.select,width:160}} value={hProdT} onChange={e=>setHProdT(e.target.value)}><option value="">Todos los productos</option>{prodsHT.map(p=>(<option key={p}>{p}</option>))}</select>{(hBusqT||hMesT||hProdT)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setHBusqT("");setHMesT("");setHProdT("");}}>✕ Limpiar</button>}</div>{(hBusqT||hMesT||hProdT)&&filtHT.length>0&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>SALIDAS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{filtHT.length}</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(filtHT.reduce((s,x)=>s+x.peso_salida,0))} kg</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(filtHT.reduce((s,x)=>s+(x.valor_total||0),0))}</div></div></div>)}<TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{filtHT.map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaT(s.loteRef,s)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV></div>);})()}

    {modalSalidaT&&selLoteT&&(<Modal title={(editSalidaTId?"Editar Salida Trilladora - ":"Registrar Salida Trilladora - ")+selLoteT.codigo} onClose={()=>{setModalSalidaT(false);setEditSalidaTId(null);setErrSalidaT("");}}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selLoteT.codigo} - {selLoteT.producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockGrupoDe(selLoteT))} kg</b></div>
      </div>
      {errSalidaT&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalidaT}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalidaT.fecha} onChange={e=>setFormSalidaT(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Venta/Salida" half>
          <input style={{...S.input,borderColor:errSalidaT?C.red:C.border2}} type="number" value={formSalidaT.peso_salida} onChange={e=>{setFormSalidaT(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalidaT.valor_kg||0)||""}));setErrSalidaT("");}}/>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Max: {fmt(stockGrupoDe(selLoteT))} kg</div>
        </Fld>
        <Fld label="Precio por Unidad (kg COP)" half><input style={S.input} type="number" value={formSalidaT.valor_kg} onChange={e=>setFormSalidaT(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalidaT.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total Salida" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" placeholder="Calculado automatico" value={formSalidaT.valor_total} onChange={e=>setFormSalidaT(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalidaT.factura} placeholder="FAC-001" onChange={e=>setFormSalidaT(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalidaT.remision} placeholder="REM-001" onChange={e=>setFormSalidaT(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalidaT.cliente} destinoKey={formSalidaT.destino_key} onChange={(v,k)=>setFormSalidaT(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formSalidaT.observaciones} onChange={e=>setFormSalidaT(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      {formSalidaT.destino_key==="blend"&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Destino Blend: este excelso quedara disponible para usar en la seccion Blend</div>)}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalidaT(false);setEditSalidaTId(null);setErrSalidaT("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaT}>{editSalidaTId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}
  </div>);
}
