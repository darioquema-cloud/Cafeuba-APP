import{useState}from"react";
import{C,S}from"../../theme";
import{NORMAS}from"../../data/constants";
import{fmtCOP,fmt,numVal,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{mesDe,semanaISO}from"../../lib/dates";
import{Bdg,Fld,KPI,Modal,TablaScrollV,SelectDestino}from"../ui";
const poolBlend=(lotes,costos)=>{
  const pool=[];
  lotes.forEach(l=>(l.salidas_trilladora||[]).forEach(s=>{
    if(s.destino_key==="blend"){
      pool.push({key:"sal:"+s.id,salidaId:s.id,reprId:l.id,codigo:l.codigo,producto:l.producto,kg_total:s.peso_salida,valor_kg:s.valor_kg,fecha:s.fecha,esStockDirecto:false});
    }
  }));
  return pool;
};
export function Blend({lotes,setLotes,blends,setBlends,costos,setLotesFino}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [nombre,setNombre]=useState("");
  const [fecha,setFecha]=useState(today());
  const [productoComercial,setProductoComercial]=useState("");
  const [items,setItems]=useState([]);
  const [errBlendForm,setErrBlendForm]=useState("");
  const [modalSalidaB,setModalSalidaB]=useState(false);
  const [selBlend,setSelBlend]=useState(null);
  const [formSalidaB,setFormSalidaB]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",observaciones:""});
  const [errB,setErrB]=useState("");
  const [editSalidaBId,setEditSalidaBId]=useState(null);
  const [modalEmb,setModalEmb]=useState(false);
  const [formEmb,setFormEmb]=useState({fecha:today(),prueba_taza:"",norma:NORMAS[0],observaciones:""});
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [filtroNomCom,setFiltroNomCom]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const [poolSel,setPoolSel]=useState([]);
  const [busquedaBH,setBusquedaBH]=useState("");
  const [filtroMesBH,setFiltroMesBH]=useState("");
  const [filtroProductoBH,setFiltroProductoBH]=useState("");
  const [filtroDestinoBH,setFiltroDestinoBH]=useState("");

  const stockBlend=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const poolAll=[
    ...poolBlend(lotes,costos).map(p=>({...p,tipo:"lote"})),
    ...blends.filter(b=>b.id!==editId&&stockBlend(b)>0).map(b=>({key:"blendstock:"+b.id,salidaId:null,reprId:b.id,codigo:b.codigo,producto:b.producto_comercial||b.nombre,kg_total:stockBlend(b),valor_kg:Math.round(b.costo_kg)||0,fecha:b.fecha,esStockDirecto:true,tipo:"blend"})),
  ];
  const kgUsadoDeKey=(key)=>blends.filter(b=>b.id!==editId).reduce((s,b)=>s+b.items.filter(it=>it.key===key).reduce((a,it)=>a+it.kg_usado,0),0);
  const pool=poolAll.map(p=>({...p,kg_disponible:p.kg_total-kgUsadoDeKey(p.key)})).filter(p=>p.kg_disponible>0||items.some(it=>it.key===p.key));
  const totalKgDisponiblePool=pool.reduce((s,p)=>s+Math.max(0,p.kg_disponible),0);

  const codigoBlend=(nombre&&fecha)?(nombre.trim().replace(/\s+/g,"")+"-"+dateToCode(fecha)):"";
  const kgTotalBlend=items.reduce((s,it)=>s+(+it.kg_usado||0),0);
  const valorTotalBlend=items.reduce((s,it)=>s+(+it.kg_usado||0)*(+it.valor_kg||0),0);
  const costoKgBlend=kgTotalBlend>0?valorTotalBlend/kgTotalBlend:0;

  const abrirNuevo=()=>{setEditId(null);setNombre("");setFecha(today());setProductoComercial("");setItems([]);setErrBlendForm("");setModal(true);};
  const abrirNuevoDesdePool=()=>{setEditId(null);setNombre("");setFecha(today());setProductoComercial("");setItems(poolSel.map(key=>{const p=pool.find(x=>x.key===key);return p?{key:p.key,salidaId:p.salidaId,reprId:p.reprId,codigo:p.codigo,valor_kg:p.valor_kg,kg_usado:"",esStockDirecto:p.esStockDirecto,tipo:p.tipo||"lote"}:null;}).filter(Boolean));setErrBlendForm("");setPoolSel([]);setModal(true);};
  const abrirEditar=(b)=>{setEditId(b.id);setNombre(b.nombre);setFecha(b.fecha);setProductoComercial(b.producto_comercial||"");setItems(b.items.map(it=>({...it})));setErrBlendForm("");setModal(true);};
  const cerrarModal=()=>setModal(false);
  const addItem=(p)=>{if(items.some(it=>it.key===p.key))return;setItems(prev=>[...prev,{key:p.key,salidaId:p.salidaId,reprId:p.reprId,codigo:p.codigo,valor_kg:p.valor_kg,kg_usado:"",esStockDirecto:p.esStockDirecto,tipo:p.tipo||"lote"}]);};
  const setItemKg=(key,kg)=>setItems(prev=>prev.map(it=>it.key===key?{...it,kg_usado:kg}:it));
  const rmItem=(key)=>setItems(prev=>prev.filter(it=>it.key!==key));
  const guardar=()=>{
    const v=items.filter(it=>+it.kg_usado>0);
    if(!v.length||!nombre||!fecha)return;
    for(const it of v){
      const p=pool.find(x=>x.key===it.key);
      const maxKg=(p?.kg_disponible||0)+(+it.kg_usado||0);
      if(+it.kg_usado>maxKg){setErrBlendForm("ALERTA: el lote "+it.codigo+" usa "+fmt(+it.kg_usado)+" kg pero solo hay "+fmt(maxKg)+" kg disponibles.");return;}
    }
    setErrBlendForm("");
    const itemsFinal=v.map(it=>{
      const kgU=+it.kg_usado;
      const salidaId=it.salidaId||genId();
      return{...it,kg_usado:kgU,valor_total:kgU*(+it.valor_kg||0),salidaId,key:"sal:"+salidaId,esStockDirecto:false};
    });
    const itemsLote=itemsFinal.filter(it=>it.tipo!=="blend");
    const itemsBlendOrigen=itemsFinal.filter(it=>it.tipo==="blend");
    if(itemsLote.length){
      setLotes(p=>p.map(l=>{
        const itemsDeEsteLote=itemsLote.filter(it=>it.reprId===l.id);
        if(!itemsDeEsteLote.length)return l;
        let sal=l.salidas_trilladora||[];
        itemsDeEsteLote.forEach(it=>{
          const existente=sal.find(s=>s.id===it.salidaId);
          if(existente){
            if(existente.auto_blend){sal=sal.map(s=>s.id===it.salidaId?{...s,peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total}:s);}
          }else{
            sal=[...sal,{id:it.salidaId,fecha:today(),factura:"",remision:"",cliente:"Blend",peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total,observaciones:"Generado automaticamente desde Blend "+(codigoBlend||nombre),auto_blend:true}];
          }
        });
        return{...l,salidas_trilladora:sal};
      }));
    }
    if(itemsBlendOrigen.length){
      setBlends(p=>p.map(b=>{
        const itemsDeEsteBlend=itemsBlendOrigen.filter(it=>it.reprId===b.id);
        if(!itemsDeEsteBlend.length)return b;
        let sal=b.salidas||[];
        itemsDeEsteBlend.forEach(it=>{
          const existente=sal.find(s=>s.id===it.salidaId);
          if(existente){
            if(existente.auto_blend){sal=sal.map(s=>s.id===it.salidaId?{...s,peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total}:s);}
          }else{
            sal=[...sal,{id:it.salidaId,fecha:today(),factura:"",remision:"",cliente:"Blend "+(codigoBlend||nombre),peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total,observaciones:"Usado como insumo del blend "+(codigoBlend||nombre),auto_blend:true}];
          }
        });
        return{...b,salidas:sal};
      }));
    }
    const kgT=itemsFinal.reduce((s,it)=>s+it.kg_usado,0);
    const valT=itemsFinal.reduce((s,it)=>s+it.valor_total,0);
    if(editId){
      setBlends(p=>p.map(b=>b.id===editId?{...b,nombre,fecha,codigo:codigoBlend,producto_comercial:productoComercial,items:itemsFinal,kg_total:kgT,valor_total:valT,costo_kg:kgT>0?valT/kgT:0}:b));
    }else{
      setBlends(p=>[{id:genId(),nombre,fecha,codigo:codigoBlend,producto_comercial:productoComercial,items:itemsFinal,kg_total:kgT,valor_total:valT,costo_kg:kgT>0?valT/kgT:0,salidas:[]},...p]);
    }
    setModal(false);
  };

  const abrirSalidaB=(b)=>{setSelBlend(b);setEditSalidaBId(null);setFormSalidaB({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:Math.round(b.costo_kg)||"",valor_total:"",observaciones:""});setErrB("");setModalSalidaB(true);};
  const abrirEditarSalidaB=(b,s)=>{setSelBlend(b);setEditSalidaBId(s.id);setFormSalidaB({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total,observaciones:s.observaciones||""});setErrB("");setModalSalidaB(true);};
  const regSalidaB=()=>{
    const peso=numVal(formSalidaB.peso_salida);
    if(!selBlend||!(peso>0)){setErrB("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockBlend(selBlend)+(editSalidaBId?(selBlend.salidas||[]).find(x=>x.id===editSalidaBId)?.peso_salida||0:0);
    if(peso>stockBase){setErrB("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaB.valor_kg||0;
    const vtotal=vkg>0?peso*vkg:(+formSalidaB.valor_total||0);
    setBlends(p=>p.map(b=>{
      if(b.id!==selBlend.id)return b;
      let sal;
      if(editSalidaBId){sal=(b.salidas||[]).map(s=>s.id===editSalidaBId?{...s,fecha:formSalidaB.fecha,factura:formSalidaB.factura,remision:formSalidaB.remision,cliente:formSalidaB.cliente,destino_key:formSalidaB.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaB.observaciones}:s);}
      else{sal=[...(b.salidas||[]),{id:genId(),fecha:formSalidaB.fecha,factura:formSalidaB.factura,remision:formSalidaB.remision,cliente:formSalidaB.cliente,destino_key:formSalidaB.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaB.observaciones}];}
      return{...b,salidas:sal};
    }));
    if(formSalidaB.destino_key==="bodega_cf"){
      setLotesFino(p=>[{id:genId(),codigo:selBlend?.codigo||("CF-BL-"+dateToCode(today())),fecha:today(),mes:mesDe(today()),semana:semanaISO(today()),producto:selBlend?.producto_comercial||selBlend?.nombre||"",proveedor:"Blend",kg_producto:peso,costo_compra_kg:vkg||0,notas:"Auto-transferido desde Blend",salidas_bodega:[],trilla:null,salidas_trilladora:[],trazabilidad:{codigo_lote_origen:selBlend?.codigo||"",fecha_proceso:"",fecha_trilla:"",fecha_secado:"",lotes_blend:(selBlend?.items||[]).map(it=>it.codigo)}},...p]);
    }
    setModalSalidaB(false);setEditSalidaBId(null);setErrB("");
  };

  const abrirEmb=(b)=>{setSelBlend(b);setFormEmb(b.pre_embarque?{...b.pre_embarque}:{fecha:today(),prueba_taza:"",norma:NORMAS[0],observaciones:""});setModalEmb(true);};
  const guardarEmb=()=>{
    if(!selBlend)return;
    setBlends(p=>p.map(b=>b.id===selBlend.id?{...b,pre_embarque:{fecha:formEmb.fecha,prueba_taza:formEmb.prueba_taza,norma:formEmb.norma,observaciones:formEmb.observaciones}}:b));
    setModalEmb(false);
  };

  const productosDeBlend=(b)=>[...new Set(b.items.map(it=>lotes.find(x=>x.id===it.reprId)?.producto).filter(Boolean))];
  const mesesBlend=[...new Set(blends.map(b=>mesDe(b.fecha)).filter(Boolean))].sort();
  const productosBlend=[...new Set(blends.flatMap(b=>productosDeBlend(b)))].sort();
  const nomComBlend=[...new Set(blends.map(b=>b.producto_comercial).filter(Boolean))].sort();
  const blendsFiltrados=blends.filter(b=>{
    if(filtroMes&&mesDe(b.fecha)!==filtroMes)return false;
    if(filtroProducto&&!productosDeBlend(b).includes(filtroProducto))return false;
    if(filtroNomCom&&b.producto_comercial!==filtroNomCom)return false;
    if(busqueda){
      const q=busqueda.toLowerCase();
      const enCodigos=b.codigo.toLowerCase().includes(q)||b.items.some(it=>it.codigo.toLowerCase().includes(q));
      if(!enCodigos)return false;
    }
    return true;
  });
  const totalKgBlends=blends.reduce((s,b)=>s+b.kg_total,0);
  const totalValBlends=blends.reduce((s,b)=>s+b.valor_total,0);
  const totalValSalidasB=blends.reduce((s,b)=>s+(b.salidas||[]).reduce((a,x)=>a+(x.valor_total||0),0),0);
  const DESTI_LABEL_BL={trilla:"Trilla",blend:"Blend",bodega_cf:"Cafe Fino",trilla_cf:"Trilla CF",blend_cf:"Blend CF",uba_tostado:"Tostado",muestras:"Muestras",otro:"Otro"};
  const todasSalidasBl=blends.flatMap(b=>(b.salidas||[]).filter(s=>!s.auto_blend).map(s=>({...s,codigo:b.codigo,blendRef:b}))).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const mesesSalBl=[...new Set(todasSalidasBl.map(s=>mesDe(s.fecha||"")).filter(Boolean))].sort();
  const nomComSalBl=[...new Set(todasSalidasBl.map(s=>s.blendRef.producto_comercial).filter(Boolean))].sort();
  const destiSalBl=[...new Set(todasSalidasBl.map(s=>s.destino_key).filter(Boolean))];
  const salidasBlFiltradas=todasSalidasBl.filter(s=>{
    if(filtroMesBH&&mesDe(s.fecha||"")!==filtroMesBH)return false;
    if(filtroProductoBH&&s.blendRef.producto_comercial!==filtroProductoBH)return false;
    if(filtroDestinoBH&&s.destino_key!==filtroDestinoBH)return false;
    if(busquedaBH){const q=busquedaBH.toLowerCase();if(!s.codigo.toLowerCase().includes(q)&&!(s.cliente||"").toLowerCase().includes(q)&&!(s.factura||"").toLowerCase().includes(q))return false;}
    return true;
  });

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.purple,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>MEZCLAS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Blend</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>Combina excelso de varios lotes en un blend nuevo</div></div><button style={{...S.btn,background:C.purple}} onClick={abrirNuevo}>+ Nuevo Blend</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Blends Creados" value={blends.length} col={C.navy}/>
      <KPI label="kg Disponibles (Stock)" value={fmt(totalKgDisponiblePool)+" kg"} col={C.teal}/>
      <KPI label="kg en Blends (Salida)" value={fmt(totalKgBlends)+" kg"} col={C.accent}/>
      <KPI label="Valor en Blends" value={fmtCOP(totalValBlends)} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValSalidasB)} col={C.green}/>
    </div>
    <div style={{...S.card,marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:10}}>Pool de Excelso Disponible</div>
      {pool.length===0?(<div style={{color:C.textFaint,fontSize:13}}>Sin excelso disponible para blend.</div>):(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {pool.map(p=>{const sel=poolSel.includes(p.key);return(<label key={p.key} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"6px 10px",borderRadius:6,border:"1.5px solid "+(sel?C.accent:C.border),background:sel?C.accentBg:"transparent",fontSize:12}}>
            <input type="checkbox" checked={sel} onChange={e=>setPoolSel(prev=>e.target.checked?[...prev,p.key]:prev.filter(k=>k!==p.key))} style={{accentColor:C.accent}}/>
            <span style={{fontFamily:"monospace",fontWeight:700,color:C.accent}}>{p.codigo}</span>
            <Bdg label={p.producto} col={C.teal} bg={C.tealBg}/>
            <span style={{color:C.green,fontWeight:600}}>{fmt(p.kg_disponible)} kg</span>
            {p.tipo==="blend"&&<Bdg label="Blend" col={C.purple} bg={C.purpleBg}/>}
          </label>);})}
        </div>
      )}
      {poolSel.length>0&&(<button style={{...S.btn,background:C.purple}} onClick={abrirNuevoDesdePool}>+ Nuevo Blend con seleccion ({poolSel.length})</button>)}
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote o blend..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesBlend.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosBlend.map(p=>(<option key={p}>{p}</option>))}</select>
      <select style={{...S.select,width:180}} value={filtroNomCom} onChange={e=>setFiltroNomCom(e.target.value)}><option value="">Todos los nombres comerciales</option>{nomComBlend.map(n=>(<option key={n}>{n}</option>))}</select>
      {(filtroMes||filtroProducto||filtroNomCom||busqueda)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMes("");setFiltroProducto("");setFiltroNomCom("");setBusqueda("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{blendsFiltrados.length} de {blends.length} blends</span>
    </div>
    {(filtroMes||filtroProducto||filtroNomCom||busqueda)&&(()=>{
      const sumBKgT=blendsFiltrados.reduce((s,b)=>s+b.kg_total,0);
      const sumBValT=blendsFiltrados.reduce((s,b)=>s+b.valor_total,0);
      const sumBKgSal=blendsFiltrados.reduce((s,b)=>(b.salidas||[]).reduce((a,x)=>a+x.peso_salida,s),0);
      const sumBValSal=blendsFiltrados.reduce((s,b)=>(b.salidas||[]).reduce((a,x)=>a+(x.valor_total||0),s),0);
      const sumBStk=blendsFiltrados.reduce((s,b)=>s+stockBlend(b),0);
      return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>BLENDS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{blendsFiltrados.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG TOTAL</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumBKgT)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR TOTAL</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumBValT))}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumBStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumBKgSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumBValSal)}</div></div>
      </div>);
    })()}
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Blends Registrados</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>{["Codigo Blend","Producto Comercial","Fecha","Mes","Lotes Usados","kg Total","Costo/kg","Valor Total","Salidas kg","Stock kg","Analisis Pre-Embarque","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{blendsFiltrados.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=stockBlend(b);return(<tr key={b.id}>
        <td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{b.codigo}</td>
        <td style={S.td}>{b.producto_comercial?<Bdg label={b.producto_comercial} col={C.gold} bg={C.goldBg}/>:"—"}</td>
        <td style={{...S.td,color:C.textDim}}>{fmtFecha(b.fecha)}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{mesDe(b.fecha)}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{b.items.map(it=>(<Bdg key={it.key} label={it.codigo+" ("+fmt(it.kg_usado)+"kg)"} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(b.kg_total)} kg</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(Math.round(b.costo_kg))}</td>
        <td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(b.valor_total)}</td>
        <td style={{...S.td,color:C.orange}}>{fmt(salKg)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={S.td}>{b.pre_embarque?(<div><div style={{color:C.teal,fontWeight:600,fontSize:11}}>{fmtFecha(b.pre_embarque.fecha)}</div><div style={{color:C.textDim,fontSize:11}}>{b.pre_embarque.norma}</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirEmb(b)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirEmb(b)}>+ Pre-Embarque</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaB(b)}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(b)}>Editar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {blendsFiltrados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{blends.length===0?'Sin blends registrados. El excelso debe salir de Bodega Trilladora con destino "Blend" para estar disponible aqui.':"Ningun blend coincide con el filtro."}</div>}
    </div></>)}

    {tab==="historico"&&(blends.some(b=>(b.salidas||[]).filter(s=>!s.auto_blend).length>0)?(<div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Historico de Salidas - Blend</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
        <input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar por blend, cliente, factura..." value={busquedaBH} onChange={e=>setBusquedaBH(e.target.value)}/>
        <select style={{...S.select,width:140}} value={filtroMesBH} onChange={e=>setFiltroMesBH(e.target.value)}><option value="">Todos los meses</option>{mesesSalBl.map(m=>(<option key={m}>{m}</option>))}</select>
        <select style={{...S.select,width:180}} value={filtroProductoBH} onChange={e=>setFiltroProductoBH(e.target.value)}><option value="">Todos los productos</option>{nomComSalBl.map(p=>(<option key={p}>{p}</option>))}</select>
        <select style={{...S.select,width:150}} value={filtroDestinoBH} onChange={e=>setFiltroDestinoBH(e.target.value)}><option value="">Todos los destinos</option>{destiSalBl.map(d=>(<option key={d} value={d}>{DESTI_LABEL_BL[d]||d}</option>))}</select>
        {(busquedaBH||filtroMesBH||filtroProductoBH||filtroDestinoBH)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setBusquedaBH("");setFiltroMesBH("");setFiltroProductoBH("");setFiltroDestinoBH("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12}}>{salidasBlFiltradas.length} de {todasSalidasBl.length} salidas</span>
      </div>
      {(busquedaBH||filtroMesBH||filtroProductoBH||filtroDestinoBH)&&salidasBlFiltradas.length>0&&(()=>{const sumKgBH=salidasBlFiltradas.reduce((s,x)=>s+x.peso_salida,0);const sumValBH=salidasBlFiltradas.reduce((s,x)=>s+(x.valor_total||0),0);return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>SALIDAS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{salidasBlFiltradas.length}</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumKgBH)} kg</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR TOTAL</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumValBH))}</div></div></div>);})()}
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Blend","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{salidasBlFiltradas.map(s=>(<tr key={s.id}><td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaB(s.blendRef,s)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV>
    </div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

    {modal&&(<Modal title={editId?"Editar Blend":"Nuevo Blend"} onClose={cerrarModal} wide>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Nombre / Codigo Blend" half><input style={S.input} value={nombre} onChange={e=>setNombre(e.target.value)}/></Fld>
        <Fld label="Fecha de Realizacion" half><input style={S.input} type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/></Fld>
        <Fld label="Nombre de Producto Comercial"><input style={S.input} placeholder="Ej: Reserva Especial, Blend Premium..." value={productoComercial} onChange={e=>setProductoComercial(e.target.value)}/></Fld>
      </div>
      {codigoBlend&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14}}><span style={{color:C.textDim,fontSize:12}}>Codigo generado: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:14}}>{codigoBlend}</span></div>)}
      <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Lotes y Blends Disponibles (en stock o ya transferidos a Blend)</div>
      <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,border:"1px solid "+C.border}}>
        {pool.filter(p=>!items.some(it=>it.key===p.key)).length===0&&<div style={{color:C.textFaint,fontSize:12}}>No hay excelso disponible. Trilla un lote o registra una salida en Bodega Trilladora.</div>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{pool.filter(p=>!items.some(it=>it.key===p.key)).map(p=>(<button key={p.key} style={{...S.btnG,fontSize:11,padding:"6px 10px",borderColor:p.tipo==="blend"?C.purple:C.border2,color:p.tipo==="blend"?C.purple:C.textDim}} onClick={()=>addItem(p)}>+ {p.codigo} ({fmt(p.kg_disponible)} kg {p.tipo==="blend"?"blend en stock":p.esStockDirecto?"en stock":"transferido"})</button>))}</div>
      </div>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Lotes Seleccionados</div>
      {errBlendForm&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errBlendForm}</div>)}
      <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,overflowX:"auto",border:"1px solid "+C.border}}>
        {items.length===0&&<div style={{color:C.textFaint,fontSize:12}}>Agrega al menos un lote del listado de arriba.</div>}
        {items.length>0&&(<table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}><thead><tr>{["Lote","kg a Usar","kg Disponible","Valor/kg","Subtotal",""].map(h=>(<th key={h} style={{...S.th,fontSize:10,padding:"6px 8px"}}>{h}</th>))}</tr></thead>
        <tbody>{items.map(it=>{const p=pool.find(x=>x.key===it.key);const kgExcelsoLoteBlend=(p?.kg_disponible||0)+(+it.kg_usado||0);const restante=kgExcelsoLoteBlend-(+it.kg_usado||0);return(<tr key={it.key}>
          <td style={{padding:"4px 8px",color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{it.codigo}</td>
          <td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={it.kg_usado} onChange={e=>setItemKg(it.key,e.target.value)}/></td>
          <td style={{padding:"4px 8px",fontSize:12,fontWeight:700,color:restante<0?C.red:C.green}}>{fmt(restante)} kg</td>
          <td style={{padding:"4px 8px",fontSize:12,color:C.gold}}>{fmtCOP(it.valor_kg)}</td>
          <td style={{padding:"4px 8px",fontSize:12,color:C.gold,fontWeight:700}}>{fmtCOP((+it.kg_usado||0)*(+it.valor_kg||0))}</td>
          <td style={{padding:"4px"}}><button style={{...S.btnG,padding:"5px 8px"}} onClick={()=>rmItem(it.key)}>x</button></td>
        </tr>);})}</tbody></table>)}
      </div>
      <div style={{background:C.navy,borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600}}>kg Total: {fmt(kgTotalBlend)} | Valor Total: {fmtCOP(valorTotalBlend)}</span>
        <span style={{color:C.white,fontWeight:800,fontSize:18}}>Costo/kg Blend: {fmtCOP(Math.round(costoKgBlend))}</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button style={S.btnG} onClick={cerrarModal}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={guardar}>{editId?"Guardar Cambios":"Crear Blend"}</button></div>
    </Modal>)}

    {modalSalidaB&&selBlend&&(<Modal title={(editSalidaBId?"Editar Salida Blend - ":"Registrar Salida Blend - ")+selBlend.codigo} onClose={()=>{setModalSalidaB(false);setEditSalidaBId(null);setErrB("");}}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selBlend.codigo} - {selBlend.nombre}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockBlend(selBlend))} kg</b></div>
      </div>
      {errB&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errB}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalidaB.fecha} onChange={e=>setFormSalidaB(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Venta/Salida" half>
          <input style={{...S.input,borderColor:errB?C.red:C.border2}} type="number" value={formSalidaB.peso_salida} onChange={e=>{setFormSalidaB(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalidaB.valor_kg||0)||""}));setErrB("");}}/>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Max: {fmt(stockBlend(selBlend))} kg</div>
        </Fld>
        <Fld label="Precio por Unidad (kg COP)" half><input style={S.input} type="number" value={formSalidaB.valor_kg} onChange={e=>setFormSalidaB(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalidaB.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total Salida" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" placeholder="Calculado automatico" value={formSalidaB.valor_total} onChange={e=>setFormSalidaB(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalidaB.factura} placeholder="FAC-001" onChange={e=>setFormSalidaB(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalidaB.remision} placeholder="REM-001" onChange={e=>setFormSalidaB(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalidaB.cliente} destinoKey={formSalidaB.destino_key} onChange={(v,k)=>setFormSalidaB(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formSalidaB.observaciones} onChange={e=>setFormSalidaB(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalidaB(false);setEditSalidaBId(null);setErrB("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaB}>{editSalidaBId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}

    {modalEmb&&selBlend&&(<Modal title={"Analisis Pre-Embarque - "+selBlend.codigo} onClose={()=>setModalEmb(false)}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selBlend.codigo} - {selBlend.nombre}</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Analisis" half><input style={S.input} type="date" value={formEmb.fecha} onChange={e=>setFormEmb(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Prueba de Taza" half><input style={S.input} value={formEmb.prueba_taza} onChange={e=>setFormEmb(p=>({...p,prueba_taza:e.target.value}))}/></Fld>
        <Fld label="Norma"><select style={S.select} value={formEmb.norma} onChange={e=>setFormEmb(p=>({...p,norma:e.target.value}))}>{NORMAS.map(n=>(<option key={n}>{n}</option>))}</select></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formEmb.observaciones} onChange={e=>setFormEmb(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModalEmb(false)}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={guardarEmb}>Guardar Analisis</button></div>
    </Modal>)}
  </div>);
}
