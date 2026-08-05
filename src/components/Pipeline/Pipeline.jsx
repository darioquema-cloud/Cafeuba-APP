import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Fld,Modal,Bdg}from"../ui";
import{fmt,fmtCOP,numVal,today,genId,fmtFecha}from"../../lib/format";
import{diasEntre}from"../../lib/dates";

const ETAPAS=[
  {key:"entrada_lead",label:"1. Entrada de Lead"},
  {key:"respuesta_inicial",label:"2. Respuesta Inicial"},
  {key:"calificacion",label:"3. Calificación del Cliente"},
  {key:"presentacion",label:"4. Presentación Comercial"},
  {key:"envio_muestras",label:"5. Envío de Muestras"},
  {key:"seguimiento_muestras",label:"6. Seguimiento de Muestras"},
  {key:"catacion",label:"7. Catación / Reunión"},
  {key:"negociacion",label:"8. Negociación"},
  {key:"confirmacion_compra",label:"9. Confirmación de Compra"},
  {key:"produccion_exportacion",label:"10. Producción y Exportación"},
  {key:"postventa",label:"11. Postventa"},
  {key:"recompra",label:"12. Recompra / Relación Largo Plazo"},
];
const ESTADOS=[
  {key:"activo",label:"Activo",col:C.teal},
  {key:"ganado",label:"Ganado",col:C.green},
  {key:"perdido",label:"Perdido",col:C.red},
  {key:"en_pausa",label:"En Pausa",col:C.gold},
];
const TIPOS_CLIENTE=["Distribuidor Internacional","Tostador Boutique","Tostador de Volumen","Cliente de Competencia","Importador Especializado","Cliente de Desarrollo"];
const CANALES_ENTRADA=["Instagram","WhatsApp","Correo electrónico","Página web","Referido","Feria internacional","Competencia de barismo","Networking de industria","Cliente actual","Visita a finca/planta"];
const PRIORIDADES=["Alta","Media","Baja"];
const POTENCIALES=["Alto","Medio","Bajo"];
const PRIORIDAD_COL={"Alta":C.red,"Media":C.gold,"Baja":C.teal};
const TIPOS_REUNION=["Virtual","Presencial","En finca/planta","En feria internacional"];
const INTERES_POST_MUESTRA=["Alto","Medio","Bajo","Sin interés"];
const INCOTERMS=["EXW","FOB","FCA","DAP","CPT"];
const ESTADOS_EXPORTACION=["Pendiente","En proceso","Embarcado","Entregado"];

// Compatibilidad con oportunidades del modelo viejo (5 etapas) — cualquier etapa que no
// coincida con una de las 12 nuevas se muestra como "1. Entrada de Lead" sin romper la UI.
const etapaKeyEfectiva=(op)=>ETAPAS.some(e=>e.key===op.etapa)?op.etapa:"entrada_lead";
const etapaInfo=(key)=>ETAPAS.find(e=>e.key===key)||ETAPAS[0];
const estadoInfo=(key)=>ESTADOS.find(e=>e.key===key)||ESTADOS[0];

const fechaUltimaEtapa=(op)=>{
  const h=op.historial_etapas||[];
  return h.length?h[h.length-1].fecha:op.fecha_registro;
};

const blankForm=()=>({
  cliente:"",contacto:"",cargo:"",pais:"",email:"",telefono:"",
  tipo_cliente:TIPOS_CLIENTE[0],canal_entrada:CANALES_ENTRADA[0],responsable:"",
  producto_interes:"",kg_estimado:"",valor_estimado:"",
  prioridad:PRIORIDADES[1],potencial_estrategico:POTENCIALES[1],
  proxima_accion:"",fecha_proxima_accion:"",notas:"",
  // Etapa 1-2
  fecha_respuesta_inicial:"",info_solicitada:"",
  // Etapa 3-5
  fecha_presentacion_enviada:"",muestra_enviada:"",fecha_envio_muestra:"",tamano_muestra:"",feedback_muestra:"",interes_post_muestra:"",
  // Etapa 6
  fecha_catacion_reunion:"",tipo_reunion:"",notas_reunion_negociacion:"",
  // Etapa 7-8
  incoterm:"",volumen_kg:"",precio_acordado_usd:"",condiciones_pago:"",fecha_confirmacion_compra:"",valor_total_confirmado_usd:"",
  // Etapa 9
  documentos:"",fecha_trilla:"",fecha_embarque:"",estado_exportacion:"",
  // Etapa 10-12
  fecha_seguimiento_postventa:"",feedback_postventa:"",fecha_ultima_recompra:"",n_compras_historico:"",valor_total_historico_cop:"",
});

export function Pipeline({oportunidades,setOportunidades,user}){
  const [tab,setTab]=useState("tablero");
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(blankForm());
  const [err,setErr]=useState("");
  const [perderId,setPerderId]=useState(null);
  const [motivo,setMotivo]=useState("");
  const [errPerder,setErrPerder]=useState("");
  const [fEtapa,setFEtapa]=useState("todas");
  const [fBusqueda,setFBusqueda]=useState("");

  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));

  const activas=oportunidades.filter(o=>o.estado==="activo"||!o.estado);
  const vencidos=activas.filter(o=>o.fecha_proxima_accion&&o.fecha_proxima_accion<today());
  const valorConfirmado=oportunidades.filter(o=>o.estado==="ganado").reduce((s,o)=>s+(o.valor_estimado||0),0);
  const perdidasPausa=oportunidades.filter(o=>o.estado==="perdido"||o.estado==="en_pausa").sort((a,b)=>fechaUltimaEtapa(b).localeCompare(fechaUltimaEtapa(a)));
  const ganadas=oportunidades.filter(o=>o.estado==="ganado").sort((a,b)=>fechaUltimaEtapa(b).localeCompare(fechaUltimaEtapa(a)));

  const abrirNuevo=()=>{
    setEditId(null);setForm(blankForm());setErr("");setModal(true);
  };
  const abrirEditar=(op)=>{
    setEditId(op.id);
    setForm({
      cliente:op.cliente||"",contacto:op.contacto||"",cargo:op.cargo||"",pais:op.pais||"",email:op.email||"",telefono:op.telefono||"",
      tipo_cliente:op.tipo_cliente||TIPOS_CLIENTE[0],canal_entrada:op.canal_entrada||CANALES_ENTRADA[0],responsable:op.responsable||"",
      producto_interes:op.producto_interes||"",kg_estimado:op.kg_estimado||"",valor_estimado:op.valor_estimado||"",
      prioridad:op.prioridad||PRIORIDADES[1],potencial_estrategico:op.potencial_estrategico||POTENCIALES[1],
      proxima_accion:op.proxima_accion||"",fecha_proxima_accion:op.fecha_proxima_accion||"",notas:op.notas||"",
      fecha_respuesta_inicial:op.fecha_respuesta_inicial||"",info_solicitada:op.info_solicitada||"",
      fecha_presentacion_enviada:op.fecha_presentacion_enviada||"",muestra_enviada:op.muestra_enviada||"",fecha_envio_muestra:op.fecha_envio_muestra||"",tamano_muestra:op.tamano_muestra||"",feedback_muestra:op.feedback_muestra||"",interes_post_muestra:op.interes_post_muestra||"",
      fecha_catacion_reunion:op.fecha_catacion_reunion||"",tipo_reunion:op.tipo_reunion||"",notas_reunion_negociacion:op.notas_reunion_negociacion||"",
      incoterm:op.incoterm||"",volumen_kg:op.volumen_kg||"",precio_acordado_usd:op.precio_acordado_usd||"",condiciones_pago:op.condiciones_pago||"",fecha_confirmacion_compra:op.fecha_confirmacion_compra||"",valor_total_confirmado_usd:op.valor_total_confirmado_usd||"",
      documentos:op.documentos||"",fecha_trilla:op.fecha_trilla||"",fecha_embarque:op.fecha_embarque||"",estado_exportacion:op.estado_exportacion||"",
      fecha_seguimiento_postventa:op.fecha_seguimiento_postventa||"",feedback_postventa:op.feedback_postventa||"",fecha_ultima_recompra:op.fecha_ultima_recompra||"",n_compras_historico:op.n_compras_historico||"",valor_total_historico_cop:op.valor_total_historico_cop||"",
    });
    setErr("");setModal(true);
  };

  const guardar=()=>{
    if(!form.cliente.trim()){setErr("Ingresa el nombre del cliente.");return;}
    if(!form.producto_interes.trim()){setErr("Ingresa el producto de interes.");return;}
    const opPrevia=editId?oportunidades.find(o=>o.id===editId):null;
    const fechaBaseRespuesta=opPrevia?opPrevia.fecha_registro:today();
    const tiempoRespuesta=form.fecha_respuesta_inicial?diasEntre(fechaBaseRespuesta,form.fecha_respuesta_inicial):null;
    const datos={
      cliente:form.cliente.trim(),contacto:form.contacto.trim(),cargo:form.cargo.trim(),pais:form.pais.trim(),
      email:form.email.trim(),telefono:form.telefono.trim(),tipo_cliente:form.tipo_cliente,canal_entrada:form.canal_entrada,
      responsable:form.responsable.trim(),producto_interes:form.producto_interes.trim(),
      kg_estimado:numVal(form.kg_estimado),valor_estimado:numVal(form.valor_estimado),
      prioridad:form.prioridad,potencial_estrategico:form.potencial_estrategico,
      proxima_accion:form.proxima_accion.trim(),fecha_proxima_accion:form.fecha_proxima_accion,notas:form.notas,
      fecha_respuesta_inicial:form.fecha_respuesta_inicial,info_solicitada:form.info_solicitada.trim(),tiempo_respuesta_dias:tiempoRespuesta,
      fecha_presentacion_enviada:form.fecha_presentacion_enviada,muestra_enviada:form.muestra_enviada,fecha_envio_muestra:form.fecha_envio_muestra,
      tamano_muestra:form.tamano_muestra.trim(),feedback_muestra:form.feedback_muestra.trim(),interes_post_muestra:form.interes_post_muestra,
      fecha_catacion_reunion:form.fecha_catacion_reunion,tipo_reunion:form.tipo_reunion,notas_reunion_negociacion:form.notas_reunion_negociacion.trim(),
      incoterm:form.incoterm,volumen_kg:numVal(form.volumen_kg),precio_acordado_usd:numVal(form.precio_acordado_usd),
      condiciones_pago:form.condiciones_pago.trim(),fecha_confirmacion_compra:form.fecha_confirmacion_compra,valor_total_confirmado_usd:numVal(form.valor_total_confirmado_usd),
      documentos:form.documentos.trim(),fecha_trilla:form.fecha_trilla,fecha_embarque:form.fecha_embarque,estado_exportacion:form.estado_exportacion,
      fecha_seguimiento_postventa:form.fecha_seguimiento_postventa,feedback_postventa:form.feedback_postventa.trim(),
      fecha_ultima_recompra:form.fecha_ultima_recompra,n_compras_historico:numVal(form.n_compras_historico),valor_total_historico_cop:numVal(form.valor_total_historico_cop),
    };
    if(editId){
      setOportunidades(list=>list.map(o=>o.id===editId?{...o,...datos}:o));
    }else{
      const nueva={
        id:genId(),fecha_registro:today(),...datos,
        etapa:"entrada_lead",estado:"activo",motivo_perdida:"",
        usuario_registro:user?.nombre||user?.email||"",
        historial_etapas:[{etapa:"entrada_lead",fecha:today()}],
      };
      setOportunidades(list=>[nueva,...list]);
    }
    setModal(false);
  };

  const avanzar=(op)=>{
    const idx=ETAPAS.findIndex(e=>e.key===etapaKeyEfectiva(op));
    if(idx<0||idx>=ETAPAS.length-1)return;
    const siguiente=ETAPAS[idx+1].key;
    setOportunidades(list=>list.map(o=>o.id===op.id?{...o,etapa:siguiente,historial_etapas:[...(o.historial_etapas||[]),{etapa:siguiente,fecha:today()}]}:o));
  };

  const marcarGanada=(id)=>{
    setOportunidades(list=>list.map(o=>o.id===id?{...o,estado:"ganado"}:o));
  };
  const ponerEnPausa=(id)=>{
    setOportunidades(list=>list.map(o=>o.id===id?{...o,estado:"en_pausa"}:o));
  };
  const reactivar=(id)=>{
    setOportunidades(list=>list.map(o=>o.id===id?{...o,estado:"activo"}:o));
  };

  const abrirPerder=(id)=>{setPerderId(id);setMotivo("");setErrPerder("");};
  const confirmarPerdida=()=>{
    if(!motivo.trim()){setErrPerder("Ingresa el motivo de la perdida.");return;}
    setOportunidades(list=>list.map(o=>o.id===perderId?{...o,estado:"perdido",motivo_perdida:motivo.trim()}:o));
    setPerderId(null);
  };

  const maxPorEtapa=Math.max(1,...ETAPAS.map(e=>activas.filter(o=>etapaKeyEfectiva(o)===e.key).length));

  const fechaBaseModal=editId?(oportunidades.find(o=>o.id===editId)?.fecha_registro||today()):today();

  const activasFiltradas=activas.filter(o=>{
    if(fEtapa!=="todas"&&etapaKeyEfectiva(o)!==fEtapa)return false;
    if(fBusqueda&&!o.cliente.toLowerCase().includes(fBusqueda.toLowerCase()))return false;
    return true;
  }).sort((a,b)=>(b.fecha_registro||"").localeCompare(a.fecha_registro||""));

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{color:C.navy,fontSize:15,fontWeight:700}}>Embudo de Oportunidades</div>
      <button style={S.btn} onClick={abrirNuevo}>+ Nueva Oportunidad</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Total Activos" value={activas.length} col={C.teal}/>
      <KPI label="Ganados" value={oportunidades.filter(o=>o.estado==="ganado").length} col={C.green}/>
      <KPI label="Perdidos / En Pausa" value={oportunidades.filter(o=>o.estado==="perdido"||o.estado==="en_pausa").length} col={C.red}/>
      <KPI label="Seguimientos Vencidos" value={vencidos.length} col={vencidos.length>0?C.red:C.teal}/>
      <KPI label="Valor Confirmado" value={fmtCOP(valorConfirmado)} col={C.gold}/>
    </div>

    <div style={{display:"flex",gap:8,marginBottom:16}}>
      <button style={tab==="tablero"?S.btn:S.btnG} onClick={()=>setTab("tablero")}>Tablero</button>
      <button style={tab==="perdidas"?S.btn:S.btnG} onClick={()=>setTab("perdidas")}>Perdidas / Pausa ({perdidasPausa.length})</button>
      <button style={tab==="ganadas"?S.btn:S.btnG} onClick={()=>setTab("ganadas")}>Ganadas ({ganadas.length})</button>
    </div>

    {tab==="tablero"&&(<div>
      <div style={{...S.card,marginBottom:16}}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Pipeline por Etapa</div>
        {ETAPAS.map(e=>{
          const count=activas.filter(o=>etapaKeyEfectiva(o)===e.key).length;
          const p=Math.min(100,(count/maxPorEtapa)*100)||0;
          return(<div key={e.key} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:12,color:C.text}}>{e.label}</span>
              <span style={{color:C.accent,fontSize:12,fontWeight:600}}>{count}</span>
            </div>
            <div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:C.accent,width:p+"%",height:"100%",borderRadius:4}}/></div>
          </div>);
        })}
      </div>

      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div style={{fontWeight:600,fontSize:14,color:C.navy}}>Clientes Activos</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <input style={{...S.input,width:"auto",minWidth:180,fontSize:12,padding:"6px 10px"}} placeholder="Buscar por cliente..." value={fBusqueda} onChange={e=>setFBusqueda(e.target.value)}/>
            <select style={{...S.select,width:"auto",minWidth:170,fontSize:12,padding:"6px 10px"}} value={fEtapa} onChange={e=>setFEtapa(e.target.value)}>
              <option value="todas">Todas las etapas</option>
              {ETAPAS.map(e=>(<option key={e.key} value={e.key}>{e.label}</option>))}
            </select>
            {(fEtapa!=="todas"||fBusqueda)&&<button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFEtapa("todas");setFBusqueda("");}}>✕ Limpiar</button>}
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:980}}><thead><tr>
          {["Cliente","Tipo Cliente","Etapa","Prioridad","Incoterm / Vol.","Proxima Accion","Fecha Proxima Accion","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
        </tr></thead>
        <tbody>{activasFiltradas.map(op=>{
          const idx=ETAPAS.findIndex(e=>e.key===etapaKeyEfectiva(op));
          const vencida=op.fecha_proxima_accion&&op.fecha_proxima_accion<today();
          const enNegociacionOMas=idx>=7;
          return(<tr key={op.id}>
            <td style={{...S.td,fontWeight:600}}>{op.cliente}</td>
            <td style={{...S.td,color:C.textDim}}>{op.tipo_cliente||"—"}</td>
            <td style={S.td}>{etapaInfo(etapaKeyEfectiva(op)).label}</td>
            <td style={S.td}>{op.prioridad?<Bdg label={op.prioridad} col={PRIORIDAD_COL[op.prioridad]||C.gray}/>:"—"}</td>
            <td style={{...S.td,color:C.textDim,fontSize:12}}>{enNegociacionOMas&&(op.incoterm||op.volumen_kg>0)?[op.incoterm,op.volumen_kg>0?fmt(op.volumen_kg)+" kg":null].filter(Boolean).join(" · "):"—"}</td>
            <td style={{...S.td,color:C.textDim}}>{op.proxima_accion||"—"}</td>
            <td style={{...S.td,color:vencida?C.red:C.textDim,fontWeight:vencida?700:400}}>{op.fecha_proxima_accion?fmtFecha(op.fecha_proxima_accion):"—"}{vencida&&" ⚠"}</td>
            <td style={S.td}><div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              <button style={{...S.btnG,fontSize:11,padding:"4px 8px"}} onClick={()=>abrirEditar(op)}>Editar</button>
              {idx<ETAPAS.length-1&&<button style={{...S.btnG,fontSize:11,padding:"4px 8px",color:C.accent,borderColor:C.accent+"40"}} onClick={()=>avanzar(op)}>Avanzar →</button>}
              <button style={{...S.btnG,fontSize:11,padding:"4px 8px",color:C.green,borderColor:C.green+"40"}} onClick={()=>marcarGanada(op.id)}>Ganada</button>
              <button style={{...S.btnG,fontSize:11,padding:"4px 8px",color:C.red,borderColor:C.red+"40"}} onClick={()=>abrirPerder(op.id)}>Perdida</button>
              <button style={{...S.btnG,fontSize:11,padding:"4px 8px",color:C.gold,borderColor:C.gold+"40"}} onClick={()=>ponerEnPausa(op.id)}>Pausa</button>
            </div></td>
          </tr>);
        })}</tbody></table>
        </div>
        {activasFiltradas.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{activas.length===0?"Sin oportunidades activas todavia.":"Ninguna oportunidad coincide con el filtro."}</div>}
      </div>
    </div>)}

    {tab==="perdidas"&&(
      <div style={S.card}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Oportunidades Perdidas / En Pausa</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
          {["Cliente","Producto","Valor Estimado","Estado","Motivo","Fecha","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
        </tr></thead>
        <tbody>{perdidasPausa.map(op=>(<tr key={op.id}>
          <td style={{...S.td,fontWeight:600}}>{op.cliente}</td>
          <td style={S.td}>{op.producto_interes}</td>
          <td style={{...S.td,color:C.gold,fontWeight:700}}>{op.valor_estimado>0?fmtCOP(op.valor_estimado):"—"}</td>
          <td style={S.td}><Bdg label={estadoInfo(op.estado).label} col={estadoInfo(op.estado).col}/></td>
          <td style={{...S.td,color:C.red}}>{op.motivo_perdida||"—"}</td>
          <td style={{...S.td,color:C.textDim}}>{fmtFecha(fechaUltimaEtapa(op))}</td>
          <td style={S.td}><button style={{...S.btnG,fontSize:11,padding:"4px 8px",color:C.teal,borderColor:C.teal+"40"}} onClick={()=>reactivar(op.id)}>Reactivar</button></td>
        </tr>))}</tbody></table>
        {perdidasPausa.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin oportunidades perdidas o en pausa todavia.</div>}
      </div>
    )}

    {tab==="ganadas"&&(
      <div style={S.card}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Oportunidades Ganadas</div>
        <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>
          {["Cliente","Tipo Cliente","Producto","Etapa","Valor Estimado","Incoterm","Vol. kg","Fecha","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
        </tr></thead>
        <tbody>{ganadas.map(op=>(<tr key={op.id}>
          <td style={{...S.td,fontWeight:600}}>{op.cliente}</td>
          <td style={S.td}>{op.tipo_cliente||"—"}</td>
          <td style={S.td}>{op.producto_interes}</td>
          <td style={S.td}>{etapaInfo(etapaKeyEfectiva(op)).label}</td>
          <td style={{...S.td,color:C.gold,fontWeight:700}}>{op.valor_estimado>0?fmtCOP(op.valor_estimado):"—"}</td>
          <td style={S.td}>{op.incoterm||"—"}</td>
          <td style={S.td}>{op.volumen_kg>0?fmt(op.volumen_kg):"—"}</td>
          <td style={{...S.td,color:C.textDim}}>{fmtFecha(fechaUltimaEtapa(op))}</td>
          <td style={S.td}><button style={{...S.btnG,fontSize:11,padding:"5px 10px"}} onClick={()=>abrirEditar(op)}>Ver/Editar</button></td>
        </tr>))}</tbody></table>
        </div>
        {ganadas.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin oportunidades ganadas todavia.</div>}
      </div>
    )}

    {modal&&(<Modal title={editId?"Editar Oportunidad":"Nueva Oportunidad"} onClose={()=>setModal(false)} wide>
      {err&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {err}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <div style={{width:"100%",fontWeight:700,fontSize:11,color:C.navy,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Identificación</div>
        <Fld label="Cliente" half><input style={S.input} value={form.cliente} onChange={e=>setF("cliente",e.target.value)}/></Fld>
        <Fld label="Contacto" half><input style={S.input} value={form.contacto} onChange={e=>setF("contacto",e.target.value)}/></Fld>
        <Fld label="Cargo" half><input style={S.input} value={form.cargo} onChange={e=>setF("cargo",e.target.value)}/></Fld>
        <Fld label="País / Mercado" half><input style={S.input} value={form.pais} onChange={e=>setF("pais",e.target.value)}/></Fld>
        <Fld label="Email" half><input style={S.input} type="email" value={form.email} onChange={e=>setF("email",e.target.value)}/></Fld>
        <Fld label="WhatsApp / Telefono" half><input style={S.input} value={form.telefono} onChange={e=>setF("telefono",e.target.value)}/></Fld>
        <Fld label="Tipo de Cliente" half>
          <select style={S.select} value={form.tipo_cliente} onChange={e=>setF("tipo_cliente",e.target.value)}>
            {TIPOS_CLIENTE.map(t=>(<option key={t} value={t}>{t}</option>))}
          </select>
        </Fld>
        <Fld label="Canal de Entrada" half>
          <select style={S.select} value={form.canal_entrada} onChange={e=>setF("canal_entrada",e.target.value)}>
            {CANALES_ENTRADA.map(c=>(<option key={c} value={c}>{c}</option>))}
          </select>
        </Fld>
        <Fld label="Responsable" half><input style={S.input} value={form.responsable} onChange={e=>setF("responsable",e.target.value)}/></Fld>

        <div style={{width:"100%",fontWeight:700,fontSize:11,color:C.navy,marginBottom:6,marginTop:6,textTransform:"uppercase",letterSpacing:.5}}>Comercial</div>
        <Fld label="Producto de Interes" half><input style={S.input} value={form.producto_interes} onChange={e=>setF("producto_interes",e.target.value)}/></Fld>
        <Fld label="Kg Estimado" half><input style={S.input} type="number" value={form.kg_estimado} onChange={e=>setF("kg_estimado",e.target.value)}/></Fld>
        <Fld label="Valor Estimado (opcional)" half><input style={S.input} type="number" value={form.valor_estimado} onChange={e=>setF("valor_estimado",e.target.value)}/></Fld>
        <Fld label="Prioridad" half>
          <select style={S.select} value={form.prioridad} onChange={e=>setF("prioridad",e.target.value)}>
            {PRIORIDADES.map(p=>(<option key={p} value={p}>{p}</option>))}
          </select>
        </Fld>
        <Fld label="Potencial Estrategico" half>
          <select style={S.select} value={form.potencial_estrategico} onChange={e=>setF("potencial_estrategico",e.target.value)}>
            {POTENCIALES.map(p=>(<option key={p} value={p}>{p}</option>))}
          </select>
        </Fld>

        <div style={{width:"100%",fontWeight:700,fontSize:11,color:C.navy,marginBottom:6,marginTop:6,textTransform:"uppercase",letterSpacing:.5}}>Seguimiento</div>
        <Fld label="Proxima Accion" half><input style={S.input} value={form.proxima_accion} onChange={e=>setF("proxima_accion",e.target.value)}/></Fld>
        <Fld label="Fecha Proxima Accion" half><input style={S.input} type="date" value={form.fecha_proxima_accion} onChange={e=>setF("fecha_proxima_accion",e.target.value)}/></Fld>

        <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.notas} onChange={e=>setF("notas",e.target.value)}/></Fld>
      </div>

      <details style={{marginTop:10,border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px"}}>
        <summary style={{cursor:"pointer",fontWeight:600,fontSize:12,color:C.navy}}>Etapa 1-2 · Entrada y Calificación</summary>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px",marginTop:10}}>
          <Fld label="Fecha Respuesta Inicial" half><input type="date" style={S.input} value={form.fecha_respuesta_inicial} onChange={e=>setF("fecha_respuesta_inicial",e.target.value)}/></Fld>
          <Fld label="Info Solicitada" half><input style={S.input} value={form.info_solicitada} onChange={e=>setF("info_solicitada",e.target.value)}/></Fld>
          {form.fecha_respuesta_inicial&&(<Fld label="Tiempo de Respuesta (dias)" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} readOnly value={diasEntre(fechaBaseModal,form.fecha_respuesta_inicial)+" dias"}/></Fld>)}
        </div>
      </details>

      <details style={{marginTop:10,border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px"}}>
        <summary style={{cursor:"pointer",fontWeight:600,fontSize:12,color:C.navy}}>Etapa 3-5 · Presentación y Muestras</summary>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px",marginTop:10}}>
          <Fld label="Fecha Presentación Enviada" half><input type="date" style={S.input} value={form.fecha_presentacion_enviada} onChange={e=>setF("fecha_presentacion_enviada",e.target.value)}/></Fld>
          <Fld label="Muestra Enviada" half>
            <select style={S.select} value={form.muestra_enviada} onChange={e=>setF("muestra_enviada",e.target.value)}>
              <option value="">Selecciona...</option>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
            </select>
          </Fld>
          <Fld label="Fecha Envío Muestra" half><input type="date" style={S.input} value={form.fecha_envio_muestra} onChange={e=>setF("fecha_envio_muestra",e.target.value)}/></Fld>
          <Fld label="Tamaño de Muestra" half><input style={S.input} value={form.tamano_muestra} onChange={e=>setF("tamano_muestra",e.target.value)}/></Fld>
          <Fld label="Feedback de Muestra"><input style={S.input} value={form.feedback_muestra} onChange={e=>setF("feedback_muestra",e.target.value)}/></Fld>
          <Fld label="Interes Post-Muestra" half>
            <select style={S.select} value={form.interes_post_muestra} onChange={e=>setF("interes_post_muestra",e.target.value)}>
              <option value="">Selecciona...</option>
              {INTERES_POST_MUESTRA.map(i=>(<option key={i} value={i}>{i}</option>))}
            </select>
          </Fld>
        </div>
      </details>

      <details style={{marginTop:10,border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px"}}>
        <summary style={{cursor:"pointer",fontWeight:600,fontSize:12,color:C.navy}}>Etapa 6 · Catación / Reunión</summary>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px",marginTop:10}}>
          <Fld label="Fecha Catación / Reunión" half><input type="date" style={S.input} value={form.fecha_catacion_reunion} onChange={e=>setF("fecha_catacion_reunion",e.target.value)}/></Fld>
          <Fld label="Tipo de Reunión" half>
            <select style={S.select} value={form.tipo_reunion} onChange={e=>setF("tipo_reunion",e.target.value)}>
              <option value="">Selecciona...</option>
              {TIPOS_REUNION.map(t=>(<option key={t} value={t}>{t}</option>))}
            </select>
          </Fld>
          <Fld label="Notas de Reunión / Negociación"><textarea style={{...S.input,minHeight:50,resize:"vertical"}} value={form.notas_reunion_negociacion} onChange={e=>setF("notas_reunion_negociacion",e.target.value)}/></Fld>
        </div>
      </details>

      <details style={{marginTop:10,border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px"}}>
        <summary style={{cursor:"pointer",fontWeight:600,fontSize:12,color:C.navy}}>Etapa 7-8 · Negociación</summary>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px",marginTop:10}}>
          <Fld label="Incoterm" half>
            <select style={S.select} value={form.incoterm} onChange={e=>setF("incoterm",e.target.value)}>
              <option value="">Selecciona...</option>
              {INCOTERMS.map(i=>(<option key={i} value={i}>{i}</option>))}
            </select>
          </Fld>
          <Fld label="Volumen (kg)" half><input type="number" style={S.input} value={form.volumen_kg} onChange={e=>setF("volumen_kg",e.target.value)}/></Fld>
          <Fld label="Precio Acordado (USD)" half><input type="number" style={S.input} value={form.precio_acordado_usd} onChange={e=>setF("precio_acordado_usd",e.target.value)}/></Fld>
          <Fld label="Condiciones de Pago" half><input style={S.input} value={form.condiciones_pago} onChange={e=>setF("condiciones_pago",e.target.value)}/></Fld>
          <Fld label="Fecha Confirmación de Compra" half><input type="date" style={S.input} value={form.fecha_confirmacion_compra} onChange={e=>setF("fecha_confirmacion_compra",e.target.value)}/></Fld>
          <Fld label="Valor Total Confirmado (USD)" half><input type="number" style={S.input} value={form.valor_total_confirmado_usd} onChange={e=>setF("valor_total_confirmado_usd",e.target.value)}/></Fld>
        </div>
      </details>

      <details style={{marginTop:10,border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px"}}>
        <summary style={{cursor:"pointer",fontWeight:600,fontSize:12,color:C.navy}}>Etapa 9 · Producción y Exportación</summary>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px",marginTop:10}}>
          <Fld label="Documentos" half><input style={S.input} value={form.documentos} onChange={e=>setF("documentos",e.target.value)}/></Fld>
          <Fld label="Fecha Trilla" half><input type="date" style={S.input} value={form.fecha_trilla} onChange={e=>setF("fecha_trilla",e.target.value)}/></Fld>
          <Fld label="Fecha Embarque" half><input type="date" style={S.input} value={form.fecha_embarque} onChange={e=>setF("fecha_embarque",e.target.value)}/></Fld>
          <Fld label="Estado de Exportación" half>
            <select style={S.select} value={form.estado_exportacion} onChange={e=>setF("estado_exportacion",e.target.value)}>
              <option value="">Selecciona...</option>
              {ESTADOS_EXPORTACION.map(e=>(<option key={e} value={e}>{e}</option>))}
            </select>
          </Fld>
        </div>
      </details>

      <details style={{marginTop:10,border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px"}}>
        <summary style={{cursor:"pointer",fontWeight:600,fontSize:12,color:C.navy}}>Etapa 10-12 · Postventa y Recompra</summary>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px",marginTop:10}}>
          <Fld label="Fecha Seguimiento Postventa" half><input type="date" style={S.input} value={form.fecha_seguimiento_postventa} onChange={e=>setF("fecha_seguimiento_postventa",e.target.value)}/></Fld>
          <Fld label="Feedback Postventa"><input style={S.input} value={form.feedback_postventa} onChange={e=>setF("feedback_postventa",e.target.value)}/></Fld>
          <Fld label="Fecha Última Recompra" half><input type="date" style={S.input} value={form.fecha_ultima_recompra} onChange={e=>setF("fecha_ultima_recompra",e.target.value)}/></Fld>
          <Fld label="N° Compras Histórico" half><input type="number" style={S.input} value={form.n_compras_historico} onChange={e=>setF("n_compras_historico",e.target.value)}/></Fld>
          <Fld label="Valor Total Histórico (COP)" half><input type="number" style={S.input} value={form.valor_total_historico_cop} onChange={e=>setF("valor_total_historico_cop",e.target.value)}/></Fld>
        </div>
      </details>

      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={S.btn} onClick={guardar}>{editId?"Guardar Cambios":"Guardar Oportunidad"}</button>
      </div>
    </Modal>)}

    {perderId&&(<Modal title="Marcar Oportunidad como Perdida" onClose={()=>setPerderId(null)}>
      {errPerder&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errPerder}</div>)}
      <Fld label="Motivo de la perdida"><textarea style={{...S.input,minHeight:70,resize:"vertical"}} value={motivo} onChange={e=>setMotivo(e.target.value)}/></Fld>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button style={S.btnG} onClick={()=>setPerderId(null)}>Cancelar</button>
        <button style={{...S.btn,background:C.red}} onClick={confirmarPerdida}>Confirmar Perdida</button>
      </div>
    </Modal>)}
  </div>);
}
