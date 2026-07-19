import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,KPIDoble,Bdg,Fld,Modal,AutoFitText,TablaScrollV,SelectDestino}from"../ui";
import{EQUIPOS_SECADO}from"../../data/constants";
import{fmt,fmtCOP,numVal,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{semanaISO,mesDe}from"../../lib/dates";
import{calcCosto}from"../../lib/costing";
// FIX 1,2: Bodega con validacion stock negativo, valor salida y valor/kg
export function Bodega({lotes,setLotes,costos,setLotesFino,subprodPerg,setSubprodPerg}){
  const [selLote,setSelLote]=useState(null);
  const [modalSubPerg,setModalSubPerg]=useState(false);
  const [editSubPergId,setEditSubPergId]=useState(null);
  const [formSubPerg,setFormSubPerg]=useState({fecha:today(),codigo:"",kg:""});
  const guardarSubPerg=()=>{
    if(!formSubPerg.codigo||!formSubPerg.kg)return;
    const entry={fecha:formSubPerg.fecha,mes:mesDe(formSubPerg.fecha),semana:semanaISO(formSubPerg.fecha),codigo:formSubPerg.codigo,kg:+formSubPerg.kg};
    if(editSubPergId){setSubprodPerg(p=>p.map(sp=>sp.id===editSubPergId?{...sp,...entry}:sp));}
    else{setSubprodPerg(p=>[{id:genId(),...entry},...p]);}
    setModalSubPerg(false);setEditSubPergId(null);setFormSubPerg({fecha:today(),codigo:"",kg:""});
  };
  const [modalSalida,setModalSalida]=useState(false);
  const [formSalida,setFormSalida]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:""});
  const [errSalida,setErrSalida]=useState("");
  const [editSalidaId,setEditSalidaId]=useState(null);
  const abrirEditarSalida=(l,s)=>{setSelLote(l);setEditSalidaId(s.id);setFormSalida({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total});setErrSalida("");setModalSalida(true);};
  const eliminarSalida=(loteId,salidaId)=>{if(!window.confirm("¿Eliminar esta salida? Esta acción no se puede deshacer."))return;setLotes(p=>p.map(l=>l.id===loteId?{...l,salidas_bodega:(l.salidas_bodega||[]).filter(s=>s.id!==salidaId)}:l));};
  const [modalEditar,setModalEditar]=useState(false);
  const [formEditar,setFormEditar]=useState({kg_producto:"",bultos:"",humedad:"",fecha_fin_secado:"",equipo_secado:EQUIPOS_SECADO[0]});
  const [modalPre,setModalPre]=useState(false);
  const [formPre,setFormPre]=useState({fecha:today(),perfil_taza:"",peso_muestra:"",almendra_sana:"",granos_brocados:"",granos_inmaduros:"",inferiores:"",gr_merma:""});
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const [zoomTarget,setZoomTarget]=useState(null);
  const [busquedaSal,setBusquedaSal]=useState("");
  const [filtroMesSal,setFiltroMesSal]=useState("");
  const [filtroProdSal,setFiltroProdSal]=useState("");
  const [filtroDestinoSal,setFiltroDestinoSal]=useState("");
  const lotesB=lotes.filter(l=>l.kg_producto>0&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual");
  const mesesB=[...new Set(lotesB.map(l=>l.mes).filter(Boolean))].sort();
  const productosB=[...new Set(lotesB.map(l=>l.producto).filter(Boolean))].sort();
  const lotesBFiltrados=lotesB.filter(l=>{
    if(filtroMes&&l.mes!==filtroMes)return false;
    if(filtroProducto&&l.producto!==filtroProducto)return false;
    if(busqueda&&!l.codigo.toLowerCase().includes(busqueda.toLowerCase()))return false;
    return true;
  });
  const stockDisponible=(l)=>l.kg_producto-(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);
  const DESTI_LABEL_B={trilla:"Trilla",blend:"Blend",bodega_cf:"Cafe Fino",trilla_cf:"Trilla CF",blend_cf:"Blend CF",uba_tostado:"Tostado",muestras:"Muestras",otro:"Otro"};
  const todasSalidasB=lotes.flatMap(l=>(l.salidas_bodega||[]).map(s=>({...s,codigo:l.codigo,loteId:l.id,loteRef:l}))).sort((a,b)=>(a.loteRef.fecha_proceso||"").localeCompare(b.loteRef.fecha_proceso||"")||(a.fecha||"").localeCompare(b.fecha||""));
  const mesesSalB=[...new Set(todasSalidasB.map(s=>mesDe(s.fecha||"")).filter(Boolean))].sort();
  const prodsSalB=[...new Set(todasSalidasB.map(s=>s.loteRef.producto).filter(Boolean))].sort();
  const destiSalB=[...new Set(todasSalidasB.map(s=>s.destino_key).filter(Boolean))];
  const salidasBodFiltradas=todasSalidasB.filter(s=>{
    if(filtroMesSal&&mesDe(s.fecha||"")!==filtroMesSal)return false;
    if(filtroProdSal&&s.loteRef.producto!==filtroProdSal)return false;
    if(filtroDestinoSal&&s.destino_key!==filtroDestinoSal)return false;
    if(busquedaSal){const q=busquedaSal.toLowerCase();if(!s.codigo.toLowerCase().includes(q)&&!(s.cliente||"").toLowerCase().includes(q)&&!(s.factura||"").toLowerCase().includes(q))return false;}
    return true;
  });

  const abrirEditar=(l)=>{setSelLote(l);setFormEditar({kg_producto:l.kg_producto||"",bultos:l.bultos||"",humedad:l.humedad||"",fecha_fin_secado:l.fecha_fin_secado||"",equipo_secado:l.equipo_secado||EQUIPOS_SECADO[0]});setModalEditar(true);};
  const guardarEdicion=()=>{
    if(!selLote)return;
    const kgC=selLote.cereza.reduce((a,c)=>a+c.kg,0);
    setLotes(p=>p.map(l=>l.id===selLote.id?{...l,kg_producto:+formEditar.kg_producto||0,bultos:+formEditar.bultos||0,humedad:formEditar.humedad,fecha_fin_secado:formEditar.fecha_fin_secado||null,equipo_secado:formEditar.equipo_secado,conversion:+(kgC/(+formEditar.kg_producto||1)).toFixed(2)}:l));
    setModalEditar(false);
  };

  const totalPasillaPre=(+formPre.granos_brocados||0)+(+formPre.granos_inmaduros||0)+(+formPre.inferiores||0);
  const factorPre=(+formPre.almendra_sana)>0?((+formPre.peso_muestra||0)/(+formPre.almendra_sana))*70:0;
  const pctMermaPre=(+formPre.peso_muestra)>0?((+formPre.gr_merma||0)/(+formPre.peso_muestra))*100:0;
  const sumaComponentesPre=(+formPre.almendra_sana||0)+(+formPre.granos_brocados||0)+(+formPre.granos_inmaduros||0)+(+formPre.inferiores||0)+(+formPre.gr_merma||0);
  const alertaPesosPre=(+formPre.peso_muestra)>0&&sumaComponentesPre>(+formPre.peso_muestra);
  const abrirPre=(l)=>{setSelLote(l);setFormPre(l.pretrilla?{fecha:l.pretrilla.fecha,perfil_taza:l.pretrilla.perfil_taza,peso_muestra:l.pretrilla.peso_muestra,almendra_sana:l.pretrilla.almendra_sana,granos_brocados:l.pretrilla.granos_brocados,granos_inmaduros:l.pretrilla.granos_inmaduros,inferiores:l.pretrilla.inferiores,gr_merma:l.pretrilla.gr_merma}:{fecha:today(),perfil_taza:"",peso_muestra:"",almendra_sana:"",granos_brocados:"",granos_inmaduros:"",inferiores:"",gr_merma:""});setModalPre(true);};
  const guardarPre=()=>{
    if(!selLote)return;
    setLotes(p=>p.map(l=>l.id===selLote.id?{...l,pretrilla:{fecha:formPre.fecha,perfil_taza:formPre.perfil_taza,peso_muestra:+formPre.peso_muestra||0,almendra_sana:+formPre.almendra_sana||0,granos_brocados:+formPre.granos_brocados||0,granos_inmaduros:+formPre.granos_inmaduros||0,inferiores:+formPre.inferiores||0,gr_merma:+formPre.gr_merma||0,total_pasilla:totalPasillaPre,factor_pretrilla:factorPre,pct_merma:pctMermaPre}}:l));
    setModalPre(false);
  };

  const regSalida=()=>{
    const peso=numVal(formSalida.peso_salida);
    if(!selLote||!(peso>0)){setErrSalida("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockDisponible(selLote)+(editSalidaId?(selLote.salidas_bodega||[]).find(x=>x.id===editSalidaId)?.peso_salida||0:0);
    if(peso>stockBase){setErrSalida("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg). No se permite stock negativo.");return;}
    const vkg=+formSalida.valor_kg||0;
    // FIX 2: Registrar valor total y valor/kg
    const vtotal=vkg>0?peso*vkg:(+formSalida.valor_total||0);
    setLotes(p=>p.map(l=>{if(l.id!==selLote.id)return l;
      let sal;
      if(editSalidaId){sal=(l.salidas_bodega||[]).map(s=>s.id===editSalidaId?{...s,fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}:s);}
      else{sal=[...(l.salidas_bodega||[]),{id:genId(),fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}];}
      const stockNew=l.kg_producto-sal.reduce((s,x)=>s+x.peso_salida,0);
      return{...l,salidas_bodega:sal,estado:stockNew>0?"Bodega":"Finalizado"};}));
    if(formSalida.destino_key==="bodega_cf"){
      const fSal=formSalida.fecha||today();
      setLotesFino(p=>[{id:genId(),codigo:selLote?.codigo||("CF-"+dateToCode(fSal)),fecha:fSal,mes:mesDe(fSal),semana:semanaISO(fSal),producto:selLote?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:vkg||0,valor_total:vtotal,notas:"Transferido desde Bodega Milan — "+selLote?.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,trazabilidad:{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:selLote?.fecha_proceso||"",fecha_trilla:"",fecha_secado:selLote?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    if(formSalida.destino_key==="trilla_cf"){
      const fSal=formSalida.fecha||today();
      const ckTri=vkg||calcCosto(selLote,costos,lotes)?.total||0;
      setLotesFino(p=>[{id:genId(),codigo:selLote?.codigo||("CF-"+dateToCode(fSal)),fecha:fSal,mes:mesDe(fSal),semana:semanaISO(fSal),producto:selLote?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:ckTri,valor_total:vtotal,notas:"Trasladado desde Bodega Milan a Trilladora CF — "+selLote?.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,para_trilladora:true,trazabilidad:{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:selLote?.fecha_proceso||"",fecha_trilla:"",fecha_secado:selLote?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    setModalSalida(false);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:""});setErrSalida("");
  };

  const totalKgBodega=lotesB.reduce((s,l)=>s+stockDisponible(l),0);
  const totalValorBodega=lotesB.reduce((s,l)=>{const cl=calcCosto(l,costos,lotes);const stock=stockDisponible(l);return s+(stock*(cl?cl.total:0));},0);
  const totalEntradaKg=lotesB.reduce((s,l)=>s+l.kg_producto,0);
  const totalEntradaValor=lotesB.reduce((s,l)=>{const cl=calcCosto(l,costos,lotes);return s+(l.kg_producto*(cl?cl.total:0));},0);
  const totalSalidasKg=lotesB.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,s),0);
  const totalSalidasValor=lotesB.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),s),0);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.navy,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Bodega Milan - Inventario Cafe Seco</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(120px,160px) repeat(3,1fr)",gap:12,marginBottom:20,alignItems:"stretch"}}>
      <KPI label="Lotes en Bodega" value={lotesB.length} col={C.navy}/>
      <KPIDoble label="Entradas a Bodega" kgVal={fmt(totalEntradaKg)+" kg"} valorVal={fmtCOP(Math.round(totalEntradaValor))} col={C.green}/>
      <KPIDoble label="Salidas de Bodega" kgVal={fmt(totalSalidasKg)+" kg"} valorVal={fmtCOP(Math.round(totalSalidasValor))} col={C.orange}/>
      <KPIDoble label="Stock Actual" kgVal={fmt(totalKgBodega)+" kg"} valorVal={fmtCOP(Math.round(totalValorBodega))} col={C.gold}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"],["subproductos","Subproductos Pergamino"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesB.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosB.map(p=>(<option key={p}>{p}</option>))}</select>
      {(filtroMes||filtroProducto||busqueda)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMes("");setFiltroProducto("");setBusqueda("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{lotesBFiltrados.length} de {lotesB.length} lotes</span>
    </div>
    {(filtroMes||filtroProducto||busqueda)&&(()=>{
      const sumBMEnt=lotesBFiltrados.reduce((s,l)=>s+l.kg_producto,0);
      const sumBMSal=lotesBFiltrados.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,s),0);
      const sumBMStk=sumBMEnt-sumBMSal;
      const sumBMValSal=lotesBFiltrados.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),s),0);
      const sumBMValStk=lotesBFiltrados.reduce((s,l)=>{const cl=calcCosto(l,costos,lotes);const stk=stockDisponible(l);return s+(stk*(cl?cl.total:0));},0);
      return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>LOTES</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{lotesBFiltrados.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG ENTRADA</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumBMEnt)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumBMStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR STOCK</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumBMValStk))}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumBMSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumBMValSal)}</div></div>
      </div>);
    })()}
    <div style={zoomTarget==="inv"?{position:"fixed",inset:0,zIndex:600,background:"rgba(15,23,42,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}:{}}>
    <div style={zoomTarget==="inv"?{background:C.panel,borderRadius:12,padding:24,width:"98vw",maxHeight:"95vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}:S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:600,fontSize:14,color:C.navy}}>Inventario por Lote</span>
        <button style={S.btnG} onClick={()=>setZoomTarget(t=>t==="inv"?null:"inv")}>{zoomTarget==="inv"?"✕ Cerrar":"⛶ Ampliar"}</button>
      </div>
      <TablaScrollV botStyle={{maxHeight:zoomTarget==="inv"?"calc(95vh - 100px)":"450px",overflowY:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:1350}}><thead style={{position:"sticky",top:0,zIndex:2,background:C.panel2}}><tr>{["Codigo","Mes","Finca","Producto","Peso Cereza","Reactor","Silo","Fec. Secado","Humedad","Entrada kg","Salidas kg","Stock kg","MP/kg","Ins/kg","CB/kg","Total/kg","Valor Stock","Pre-Trilla","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{[...lotesBFiltrados].sort((a,b)=>(a.fecha_proceso||"").localeCompare(b.fecha_proceso||"")).map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=l.kg_producto-sal;const cl=calcCosto(l,costos,lotes);const costoKg=cl?cl.total:0;const fi=[...new Set(l.cereza.map(c=>c.finca))];const kgCereza=l.cereza.reduce((a,c)=>a+c.kg,0);return(<tr key={l.id}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",maxWidth:160}}><AutoFitText text={l.codigo}/></td>
        <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontWeight:600}}>{l.producto}</td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{fmt(kgCereza)} kg</td>
        {/* FIX 3: Mostrar reactor y silo */}
        <td style={S.td}><Bdg label={l.equipo_ferm||"-"} col={C.purple} bg={C.purpleBg}/></td>
        <td style={S.td}><Bdg label={l.equipo_secado||"-"} col={C.teal} bg={C.tealBg}/></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(l.fecha_fin_secado)}</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{l.humedad?l.humedad+"%":"-"}</td>
        <td style={{...S.td,fontWeight:600}}>{fmt(l.kg_producto)}</td>
        <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(sal)}</td>
        <td style={S.td}><div style={{color:stock>100?C.green:stock>0?C.gold:C.red,fontWeight:700,fontSize:14}}>{fmt(stock)} kg</div><div style={{background:C.bg,borderRadius:3,height:6,marginTop:4,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:stock>100?C.green:stock>0?C.gold:C.red,width:Math.min(100,l.kg_producto>0?(stock/l.kg_producto)*100:0)+"%",height:"100%",borderRadius:3}}/></div></td>
        <td style={{...S.td,color:C.orange}}>{cl?fmtCOP(Math.round(cl.a)):"—"}</td>
        <td style={{...S.td,color:C.red}}>{cl?fmtCOP(Math.round(cl.b)):"—"}</td>
        <td style={{...S.td,color:C.purple}}>{cl?fmtCOP(Math.round(cl.c)):"—"}</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(costoKg)}</td>
        <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(stock*costoKg)}</td>
        <td style={S.td}>{l.pretrilla?(<div><div style={{color:C.purple,fontWeight:700,fontSize:12}}>FP: {fmt(l.pretrilla.factor_pretrilla,1)}</div><div style={{color:C.red,fontSize:11}}>Merma: {fmt(l.pretrilla.pct_merma,1)}%</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirPre(l)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirPre(l)}>+ Pre-Trilla</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>{if(stock>0){setSelLote(l);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:cl?Math.round(cl.total):"",valor_total:""});setErrSalida("");setModalSalida(true);}}}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(l)}>Editar</button></div></td>
      </tr>);})}
      </tbody></table></TablaScrollV></div></div></>)}
    {tab==="subproductos"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
        <KPI label="Registros" value={(subprodPerg||[]).length} col={C.navy}/>
        <KPI label="Total kg" value={fmt((subprodPerg||[]).reduce((s,sp)=>s+sp.kg,0))+" kg"} col={C.green}/>
      </div>
      <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontWeight:600,fontSize:14,color:C.navy}}>Subproductos Pergamino</span>
        <button style={S.btn} onClick={()=>{setFormSubPerg({fecha:today(),codigo:"",kg:""});setEditSubPergId(null);setModalSubPerg(true);}}>+ Registrar Lote</button>
      </div>
      {(subprodPerg||[]).length===0?(
        <div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin subproductos pergamino registrados. Usa el boton para registrar el primer lote.</div>
      ):(
        <div style={S.card}>
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr>
            {["Fecha","Mes","Semana","Codigo Subproducto","kg Subproductos",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}
          </tr></thead>
          <tbody>{[...(subprodPerg||[])].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map(sp=>(
            <tr key={sp.id}>
              <td style={{...S.td,color:C.textDim}}>{fmtFecha(sp.fecha)}</td>
              <td style={{...S.td,textTransform:"capitalize"}}>{sp.mes}</td>
              <td style={S.td}><Bdg label={"S"+sp.semana} col={C.teal} bg={C.tealBg}/></td>
              <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{sp.codigo}</td>
              <td style={{...S.td,color:C.green,fontWeight:700,fontSize:15}}>{fmt(sp.kg)} kg</td>
              <td style={S.td}><button style={S.btnG} onClick={()=>{setEditSubPergId(sp.id);setFormSubPerg({fecha:sp.fecha,codigo:sp.codigo,kg:sp.kg});setModalSubPerg(true);}}>Editar</button></td>
            </tr>
          ))}</tbody></table></TablaScrollV>
        </div>
      )}
      {modalSubPerg&&(<Modal title={editSubPergId?"Editar Subproducto Pergamino":"Nuevo Subproducto Pergamino"} onClose={()=>{setModalSubPerg(false);setEditSubPergId(null);}}>
        <Fld label="Fecha"><input style={S.input} type="date" value={formSubPerg.fecha} onChange={e=>setFormSubPerg(p=>({...p,fecha:e.target.value}))}/></Fld>
        <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:12}}>
          <span style={{color:C.textDim}}>Mes: </span><b style={{color:C.navy}}>{mesDe(formSubPerg.fecha)}</b>
          <span style={{color:C.textDim,marginLeft:16}}>Semana ISO: </span><b style={{color:C.navy}}>S{semanaISO(formSubPerg.fecha)}</b>
        </div>
        <Fld label="Codigo Subproducto"><input style={S.input} placeholder="Ej: SUB-PERG-001" value={formSubPerg.codigo} onChange={e=>setFormSubPerg(p=>({...p,codigo:e.target.value}))}/></Fld>
        <Fld label="kg Subproductos"><input style={S.input} type="number" min="0" step="0.1" placeholder="kg" value={formSubPerg.kg} onChange={e=>setFormSubPerg(p=>({...p,kg:e.target.value}))}/></Fld>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
          <button style={S.btnG} onClick={()=>{setModalSubPerg(false);setEditSubPergId(null);}}>Cancelar</button>
          <button style={S.btn} onClick={guardarSubPerg}>{editSubPergId?"Guardar Cambios":"Registrar"}</button>
        </div>
      </Modal>)}
    </>)}
    {tab==="historico"&&(lotes.some(l=>(l.salidas_bodega||[]).length>0)?(
    <div style={zoomTarget==="sal"?{position:"fixed",inset:0,zIndex:600,background:"rgba(15,23,42,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}:{}}>
    <div style={zoomTarget==="sal"?{background:C.panel,borderRadius:12,padding:24,width:"98vw",maxHeight:"95vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}:S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontWeight:600,fontSize:14,color:C.navy}}>Historico de Salidas</span>
        <button style={S.btnG} onClick={()=>setZoomTarget(t=>t==="sal"?null:"sal")}>{zoomTarget==="sal"?"✕ Cerrar":"⛶ Ampliar"}</button>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
        <input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar por lote, cliente, factura..." value={busquedaSal} onChange={e=>setBusquedaSal(e.target.value)}/>
        <select style={{...S.select,width:140}} value={filtroMesSal} onChange={e=>setFiltroMesSal(e.target.value)}><option value="">Todos los meses</option>{mesesSalB.map(m=>(<option key={m}>{m}</option>))}</select>
        <select style={{...S.select,width:160}} value={filtroProdSal} onChange={e=>setFiltroProdSal(e.target.value)}><option value="">Todos los productos</option>{prodsSalB.map(p=>(<option key={p}>{p}</option>))}</select>
        <select style={{...S.select,width:150}} value={filtroDestinoSal} onChange={e=>setFiltroDestinoSal(e.target.value)}><option value="">Todos los destinos</option>{destiSalB.map(d=>(<option key={d} value={d}>{DESTI_LABEL_B[d]||d}</option>))}</select>
        {(busquedaSal||filtroMesSal||filtroProdSal||filtroDestinoSal)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setBusquedaSal("");setFiltroMesSal("");setFiltroProdSal("");setFiltroDestinoSal("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12}}>{salidasBodFiltradas.length} de {todasSalidasB.length} salidas</span>
      </div>
      {(busquedaSal||filtroMesSal||filtroProdSal||filtroDestinoSal)&&salidasBodFiltradas.length>0&&(()=>{const sumKgSal=salidasBodFiltradas.reduce((s,x)=>s+x.peso_salida,0);const sumValSal=salidasBodFiltradas.reduce((s,x)=>s+(x.valor_total||0),0);return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>SALIDAS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{salidasBodFiltradas.length}</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumKgSal)} kg</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR TOTAL</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumValSal))}</div></div></div>);})()}
      <TablaScrollV botStyle={{maxHeight:zoomTarget==="sal"?"calc(95vh - 200px)":"420px",overflowY:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead style={{position:"sticky",top:0,zIndex:2,background:C.panel2}}><tr>{["Lote","Fecha","Destino","Factura","Remision","Cliente","Peso Salida","Valor/kg","Valor Total",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{salidasBodFiltradas.map(s=>{
        const destiLabel=DESTI_LABEL_B[s.destino_key]||s.destino_key||"-";
        const destiCol={bodega_cf:C.green,trilla_cf:C.teal,muestras:C.purple,blend:C.gold,trilla:C.accent}[s.destino_key]||C.textDim;
        return(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={S.td}><Bdg label={destiLabel} col={destiCol}/></td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,display:"flex",gap:4}}><button style={S.btnG} onClick={()=>abrirEditarSalida(s.loteRef,s)}>Editar</button><button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminarSalida(s.loteId,s.id)}>Eliminar</button></td></tr>);})}
      </tbody></table></TablaScrollV></div></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

    {modalSalida&&selLote&&(<Modal title={(editSalidaId?"Editar Salida - ":"Registrar Salida - ")+selLote.codigo} onClose={()=>{setModalSalida(false);setEditSalidaId(null);setErrSalida("");}}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selLote.codigo} - {selLote.producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockDisponible(selLote))} kg</b></div>
        <div style={{color:C.textDim,fontSize:11,marginTop:2}}>Reactor: {selLote.equipo_ferm} | Silo: {selLote.equipo_secado} | Humedad: {selLote.humedad}%</div>
      </div>
      {errSalida&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalida}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalida.fecha} onChange={e=>setFormSalida(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Peso de Salida (kg)" half>
          <input style={{...S.input,borderColor:errSalida?C.red:C.border2}} type="number" value={formSalida.peso_salida} onChange={e=>{setFormSalida(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalida.valor_kg||0)||""}));setErrSalida("");}}/>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Max: {fmt(stockDisponible(selLote))} kg</div>
        </Fld>
        {/* FIX 2: Valor/kg y valor total */}
        <Fld label="Valor por kg COP (auto desde Bodega)" half><input style={S.input} type="number" placeholder="0" value={formSalida.valor_kg} onChange={e=>setFormSalida(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalida.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total COP" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" placeholder="Calculado automatico" value={formSalida.valor_total} onChange={e=>setFormSalida(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalida.factura} placeholder="FAC-001" onChange={e=>setFormSalida(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalida.remision} placeholder="REM-001" onChange={e=>setFormSalida(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalida.cliente} destinoKey={formSalida.destino_key} onChange={(v,k)=>setFormSalida(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
      </div>
      {formSalida.destino_key==="trilla"&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Destino Trilla: el lote pasara automaticamente a la seccion Trilla</div>)}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalida(false);setEditSalidaId(null);setErrSalida("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalida}>{editSalidaId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}

    {modalEditar&&selLote&&(<Modal title={"Editar Lote - "+selLote.codigo} onClose={()=>setModalEditar(false)}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selLote.codigo} - {selLote.producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Cereza: {fmt(selLote.cereza.reduce((a,c)=>a+c.kg,0))} kg</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="kg Producto Terminado (correccion)" half><input style={S.input} type="number" value={formEditar.kg_producto} onChange={e=>setFormEditar(p=>({...p,kg_producto:e.target.value}))}/>{formEditar.kg_producto&&<div style={{color:C.accent,fontSize:11,marginTop:4}}>Conv: {(selLote.cereza.reduce((a,c)=>a+c.kg,0)/(+formEditar.kg_producto)).toFixed(2)}:1</div>}</Fld>
        <Fld label="N Bultos" half><input style={S.input} type="number" value={formEditar.bultos} onChange={e=>setFormEditar(p=>({...p,bultos:e.target.value}))}/></Fld>
        <Fld label="Humedad Final %" half><input style={S.input} type="number" step="0.1" value={formEditar.humedad} onChange={e=>setFormEditar(p=>({...p,humedad:e.target.value}))}/></Fld>
        <Fld label="Equipo de Secado" half><select style={S.select} value={formEditar.equipo_secado} onChange={e=>setFormEditar(p=>({...p,equipo_secado:e.target.value}))}>{EQUIPOS_SECADO.map(eq=>(<option key={eq}>{eq}</option>))}</select></Fld>
        <Fld label="Fecha Fin Secado"><input style={S.input} type="date" value={formEditar.fecha_fin_secado} onChange={e=>setFormEditar(p=>({...p,fecha_fin_secado:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModalEditar(false)}>Cancelar</button><button style={S.btn} onClick={guardarEdicion}>Guardar Cambios</button></div>
    </Modal>)}

    {modalPre&&selLote&&(<Modal title={"Pre-Trilla - "+selLote.codigo} onClose={()=>setModalPre(false)}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selLote.codigo} - {selLote.producto}</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={formPre.fecha} onChange={e=>setFormPre(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Perfil de Taza" half><input style={S.input} value={formPre.perfil_taza} onChange={e=>setFormPre(p=>({...p,perfil_taza:e.target.value}))}/></Fld>
        <Fld label="Peso Muestra (gr)" half><input style={S.input} type="number" value={formPre.peso_muestra} onChange={e=>setFormPre(p=>({...p,peso_muestra:e.target.value}))}/></Fld>
        <Fld label="Almendra Sana (gr)" half><input style={S.input} type="number" value={formPre.almendra_sana} onChange={e=>setFormPre(p=>({...p,almendra_sana:e.target.value}))}/></Fld>
        <Fld label="Granos Brocados (gr)" half><input style={S.input} type="number" value={formPre.granos_brocados} onChange={e=>setFormPre(p=>({...p,granos_brocados:e.target.value}))}/></Fld>
        <Fld label="Granos Inmaduros/Reventados (gr)" half><input style={S.input} type="number" value={formPre.granos_inmaduros} onChange={e=>setFormPre(p=>({...p,granos_inmaduros:e.target.value}))}/></Fld>
        <Fld label="Inferiores (gr)" half><input style={S.input} type="number" value={formPre.inferiores} onChange={e=>setFormPre(p=>({...p,inferiores:e.target.value}))}/></Fld>
        <Fld label="Gr Merma" half><input style={S.input} type="number" value={formPre.gr_merma} onChange={e=>setFormPre(p=>({...p,gr_merma:e.target.value}))}/></Fld>
      </div>
      {alertaPesosPre&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; Revisar pesos: la suma de almendra sana + brocados + inmaduros/reventados + inferiores + merma ({fmt(sumaComponentesPre)} gr) supera el peso de la muestra ({fmt(+formPre.peso_muestra||0)} gr).</div>)}
      <div style={{background:C.bg,borderRadius:6,padding:12,marginTop:4,border:"1px solid "+C.border}}>
        <div style={{color:C.textDim,fontSize:11,fontWeight:600,marginBottom:8}}>CALCULOS AUTOMATICOS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
          <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>Total Pasilla</div><div style={{color:C.orange,fontWeight:700,fontSize:14}}>{fmt(totalPasillaPre)} gr</div></div>
          <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>Factor Pre-Trilla</div><div style={{color:C.green,fontWeight:700,fontSize:14}}>{fmt(factorPre,1)}</div></div>
          <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>% Merma</div><div style={{color:C.red,fontWeight:700,fontSize:14}}>{fmt(pctMermaPre,1)}%</div></div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:14}}><button style={S.btnG} onClick={()=>setModalPre(false)}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={guardarPre}>Guardar Pre-Trilla</button></div>
    </Modal>)}
  </div>);
}
