import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Bdg,Fld,Modal,TablaScrollV,SelectDestino}from"../ui";
import{fmt,fmtCOP,numVal,today,genId,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
export function BodegaTrilladoraFino({lotesFino,setLotesFino}){
  const [selGrupo,setSelGrupo]=useState(null);
  const [modalSalida,setModalSalida]=useState(false);
  const [formSalida,setFormSalida]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",observaciones:""});
  const [errSalida,setErrSalida]=useState("");
  const [editSalidaId,setEditSalidaId]=useState(null);
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const [hBusqTF,setHBusqTF]=useState("");const [hMesTF,setHMesTF]=useState("");const [hProdTF,setHProdTF]=useState("");
  const [editCostoId,setEditCostoId]=useState(null);
  const [editCostoVal,setEditCostoVal]=useState("");

  const trilledFino=lotesFino.filter(l=>l.trilla?.kg_excelso>0);
  const mesesBTF=[...new Set(trilledFino.map(l=>mesDe(l.trilla?.fecha_trilla||"")).filter(Boolean))].sort();
  const productosBTF=[...new Set(trilledFino.map(l=>l.producto).filter(Boolean))].sort();
  const grupoDeBTF=(l)=>[l,...lotesFino.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
  const stockGrupoBTF=(grupo)=>{const exc=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);const sal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);return exc-sal;};
  const construirGruposBTF=(arr)=>{const vistos=new Set();const gs=[];arr.forEach(l=>{if(vistos.has(l.id))return;const g=grupoDeBTF(l);g.forEach(x=>vistos.add(x.id));gs.push(g);});return gs;};
  const costoKgExFinoDe=(grupo)=>{for(const x of grupo){if(x.trilla?.costo_kg_excelso>0)return x.trilla.costo_kg_excelso;}for(const x of grupo){if(x.costo_compra_kg>0)return x.costo_compra_kg;}return 0;};
  const guardarCostoBTF=(grupo,val)=>{const c=+val||0;setLotesFino(p=>p.map(l=>grupo.some(g=>g.id===l.id)?{...l,trilla:{...l.trilla,costo_kg_excelso:c}}:l));setEditCostoId(null);setEditCostoVal("");};

  const todosGrupos=construirGruposBTF(trilledFino);
  const gruposFiltrados=todosGrupos.filter(grupo=>{
    if(filtroMes&&mesDe(grupo[0].trilla?.fecha_trilla||"")!==filtroMes)return false;
    if(filtroProducto&&!grupo.some(l=>l.producto===filtroProducto))return false;
    if(busqueda){const q=busqueda.toLowerCase();if(!grupo[0].trilla?.nombre_trillado?.toLowerCase().includes(q)&&!grupo.some(l=>l.codigo.toLowerCase().includes(q)))return false;}
    return true;
  });
  const totalExcelsoBTF=trilledFino.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const totalSalidasBTF=trilledFino.reduce((s,l)=>s+(l.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
  const stockTotalBTF=totalExcelsoBTF-totalSalidasBTF;
  const totalValorSalidasBTF=trilledFino.reduce((s,l)=>s+(l.salidas_trilladora||[]).reduce((a,b)=>a+(b.valor_total||0),0),0);
  const valorStockBTF=todosGrupos.reduce((s,g)=>s+costoKgExFinoDe(g)*stockGrupoBTF(g),0);

  const abrirSalidaBTF=(grupo)=>{
    const reprId=grupo[0].id;
    const reprFresh=lotesFino.find(l=>l.id===reprId)||grupo[0];
    const grupoFresh=[reprFresh,...lotesFino.filter(x=>(reprFresh.trilla?.lotes_combinados||[]).includes(x.id))];
    if(stockGrupoBTF(grupoFresh)<=0)return;
    const costoKg=costoKgExFinoDe(grupoFresh);
    const ultimaVenta=grupoFresh.flatMap(x=>x.salidas_trilladora||[]).filter(s=>s.valor_kg>0).slice(-1)[0]?.valor_kg||"";
    setSelGrupo(grupoFresh);setEditSalidaId(null);
    setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:costoKg||ultimaVenta,valor_total:"",observaciones:""});
    setErrSalida("");setModalSalida(true);
  };
  const abrirEditarSalidaBTF=(grupo,s)=>{
    setSelGrupo(grupo);setEditSalidaId(s.id);
    setFormSalida({fecha:s.fecha,factura:s.factura||"",remision:s.remision||"",cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total,observaciones:s.observaciones||""});
    setErrSalida("");setModalSalida(true);
  };
  const regSalidaBTF=()=>{
    const peso=numVal(formSalida.peso_salida);const reprId=selGrupo[0].id;
    if(!selGrupo||!(peso>0)){setErrSalida("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockGrupoBTF(selGrupo)+(editSalidaId?(selGrupo[0].salidas_trilladora||[]).find(x=>x.id===editSalidaId)?.peso_salida||0:0);
    if(peso>stockBase){setErrSalida("ERROR: El peso ("+fmt(peso)+" kg) supera el stock ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalida.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalida.valor_total||0);
    setLotesFino(p=>p.map(l=>{
      if(l.id!==reprId)return l;
      let sal;
      if(editSalidaId){sal=(l.salidas_trilladora||[]).map(s=>s.id===editSalidaId?{...s,fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalida.observaciones}:s);}
      else{sal=[...(l.salidas_trilladora||[]),{id:genId(),fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalida.observaciones}];}
      return{...l,salidas_trilladora:sal};
    }));
    setModalSalida(false);setEditSalidaId(null);setErrSalida("");
  };

  return(<div>
    <div style={{marginBottom:22}}>
      <div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO</div>
      <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Bodega Trilladora Cafe Fino</div>
      <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Inventario de cafe excelso fino trillado</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Excelso Total kg" value={fmt(totalExcelsoBTF)+" kg"} col={C.green}/>
      <KPI label="Stock Disponible kg" value={fmt(stockTotalBTF)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock Disponible" value={fmtCOP(Math.round(valorStockBTF))} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidasBTF)} col={C.purple}/>
      <KPI label="Costo Prom/kg Ex" value={stockTotalBTF>0?fmtCOP(Math.round(valorStockBTF/stockTotalBTF)):"—"} col={C.teal}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<>
      <div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo o corte..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
        <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesBTF.map(m=>(<option key={m} value={m} style={{textTransform:"capitalize"}}>{m}</option>))}</select>
        <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosBTF.map(p=>(<option key={p}>{p}</option>))}</select>
        {(filtroMes||filtroProducto||busqueda)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMes("");setFiltroProducto("");setBusqueda("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12}}>{gruposFiltrados.length} de {todosGrupos.length} grupos</span>
      </div>
      {(filtroMes||filtroProducto||busqueda)&&(()=>{
        const sumExc=gruposFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.trilla?.kg_excelso||0),0),0);
        const sumSal=gruposFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+c.peso_salida,0),0),0);
        const sumValSal=gruposFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+(c.valor_total||0),0),0),0);
        const sumValStk=gruposFiltrados.reduce((s,g)=>s+costoKgExFinoDe(g)*stockGrupoBTF(g),0);
        return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>GRUPOS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{gruposFiltrados.length}</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG EXCELSO</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumExc)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumExc-sumSal)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR STOCK</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumValStk))}</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumSal)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumValSal)}</div></div>
        </div>);
      })()}
      <div style={S.card}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Inventario por Lote</div>
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>
          {["Corte / Trillado","Lotes Origen","Fecha Trilla","Mes","Producto","kg Excelso","Salidas kg","Stock kg","Costo/kg Ex","Valor en Stock","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
        </tr></thead>
        <tbody>{gruposFiltrados.map(grupo=>{
          const repr=grupo[0];const t=repr.trilla;
          const excelso=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
          const salTotal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
          const stock=excelso-salTotal;
          const costoEx=costoKgExFinoDe(grupo);
          return(<tr key={repr.id}>
            <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:C.green,fontWeight:600}}>{t.nombre_trillado||repr.codigo}</td>
            <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.teal} bg={C.tealBg}/>))}</div></td>
            <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(t.fecha_trilla)}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{repr.mes}</td>
            <td style={S.td}><Bdg label={grupo.map(x=>x.producto).filter(Boolean).join("/")||"—"} col={C.navy} bg={C.accentBg}/></td>
            <td style={{...S.td,fontWeight:600}}>{fmt(excelso)} kg</td>
            <td style={{...S.td,color:C.orange}}>{salTotal>0?fmt(salTotal)+" kg":"—"}</td>
            <td style={S.td}><span style={{fontWeight:700,fontSize:14,color:stock>0?C.green:C.textFaint}}>{fmt(stock)} kg</span></td>
            <td style={{...S.td,color:C.purple,fontWeight:600}}>
              {editCostoId===repr.id
                ?(<input autoFocus type="number" style={{width:90,padding:"3px 6px",border:"1px solid "+C.accent,borderRadius:4,fontSize:12,color:C.purple}} value={editCostoVal} onChange={e=>setEditCostoVal(e.target.value)} onBlur={()=>guardarCostoBTF(grupo,editCostoVal)} onKeyDown={e=>{if(e.key==="Enter")guardarCostoBTF(grupo,editCostoVal);if(e.key==="Escape"){setEditCostoId(null);setEditCostoVal("");}}}/>)
                :(<span title="Clic para editar costo/kg" style={{cursor:"pointer",borderBottom:"1px dashed "+(costoEx?C.purple:C.orange),color:costoEx?C.purple:C.orange}} onClick={()=>{setEditCostoId(repr.id);setEditCostoVal(costoEx||"");}}>{costoEx?fmtCOP(costoEx):"✏ agregar costo"}</span>)}
            </td>
            <td style={{...S.td,color:C.gold,fontWeight:700}}>{stock>0&&costoEx?fmtCOP(Math.round(stock*costoEx)):"—"}</td>
            <td style={S.td}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaBTF(grupo)}>+ Salida</button></td>
          </tr>);
        })}{gruposFiltrados.length===0&&<tr><td colSpan={11} style={{...S.td,color:C.textFaint,textAlign:"center"}}>Sin lotes trillados registrados todavia.</td></tr>}</tbody></table></TablaScrollV>
      </div>
    </>)}
    {tab==="historico"&&(()=>{const todasHTF=trilledFino.flatMap(l=>(l.salidas_trilladora||[]).map(s=>({...s,corte:l.trilla?.nombre_trillado||l.codigo,loteRef:l,grupo:grupoDeBTF(l)}))).sort((a,b)=>b.fecha.localeCompare(a.fecha));const mesesHTF=[...new Set(todasHTF.map(s=>mesDe(s.fecha)).filter(Boolean))].sort();const prodsHTF=[...new Set(todasHTF.map(s=>s.corte).filter(Boolean))].sort();const filtHTF=todasHTF.filter(s=>{if(hMesTF&&mesDe(s.fecha)!==hMesTF)return false;if(hProdTF&&s.corte!==hProdTF)return false;if(hBusqTF){const q=hBusqTF.toLowerCase();if(!s.corte?.toLowerCase().includes(q)&&!s.cliente?.toLowerCase().includes(q)&&!(s.factura||"").toLowerCase().includes(q))return false;}return true;});return todasHTF.length===0?(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>):(<div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontWeight:600,fontSize:14,color:C.navy}}>Historico de Salidas</span><span style={{color:C.textFaint,fontSize:12}}>{filtHTF.length} de {todasHTF.length} salidas</span></div><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}><input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar corte, cliente, factura..." value={hBusqTF} onChange={e=>setHBusqTF(e.target.value)}/><select style={{...S.select,width:140}} value={hMesTF} onChange={e=>setHMesTF(e.target.value)}><option value="">Todos los meses</option>{mesesHTF.map(m=>(<option key={m}>{m}</option>))}</select><select style={{...S.select,width:160}} value={hProdTF} onChange={e=>setHProdTF(e.target.value)}><option value="">Todos los cortes</option>{prodsHTF.map(p=>(<option key={p}>{p}</option>))}</select>{(hBusqTF||hMesTF||hProdTF)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setHBusqTF("");setHMesTF("");setHProdTF("");}}>✕ Limpiar</button>}</div>{(hBusqTF||hMesTF||hProdTF)&&filtHTF.length>0&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>SALIDAS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{filtHTF.length}</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(filtHTF.reduce((s,x)=>s+x.peso_salida,0))} kg</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(filtHTF.reduce((s,x)=>s+(x.valor_total||0),0))}</div></div></div>)}<TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote/Corte","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{filtHTF.map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{s.corte}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaBTF(s.grupo,s)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV></div>);})()}
    {modalSalida&&selGrupo&&(<Modal title={(editSalidaId?"Editar Salida - ":"Registrar Salida - ")+(selGrupo[0].trilla?.nombre_trillado||selGrupo[0].codigo)} onClose={()=>{setModalSalida(false);setEditSalidaId(null);setErrSalida("");}}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selGrupo[0].trilla?.nombre_trillado||selGrupo[0].codigo}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockGrupoBTF(selGrupo))} kg</b></div>
      </div>
      {errSalida&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalida}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalida.fecha} onChange={e=>setFormSalida(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Venta/Salida" half>
          <input style={{...S.input,borderColor:errSalida?C.red:C.border2}} type="number" value={formSalida.peso_salida} onChange={e=>{setFormSalida(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalida.valor_kg||0)||""}));setErrSalida("");}}/>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Max: {fmt(stockGrupoBTF(selGrupo))} kg</div>
        </Fld>
        <Fld label="Precio por Unidad (kg COP)" half><input style={S.input} type="number" value={formSalida.valor_kg} onChange={e=>setFormSalida(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalida.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total Salida" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" placeholder="Calculado automatico" value={formSalida.valor_total} onChange={e=>setFormSalida(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalida.factura} placeholder="FAC-001" onChange={e=>setFormSalida(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalida.remision} placeholder="REM-001" onChange={e=>setFormSalida(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalida.cliente} destinoKey={formSalida.destino_key} onChange={(v,k)=>setFormSalida(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formSalida.observaciones} onChange={e=>setFormSalida(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      {formSalida.destino_key==="blend_cf"&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Este excelso quedara disponible en Blend Cafe Fino.</div>)}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalida(false);setEditSalidaId(null);setErrSalida("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaBTF}>{editSalidaId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}
  </div>);
}
