import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Fld,Modal,Bdg}from"../ui";
import{fmtCOP,numVal,today,genId,fmtFecha}from"../../lib/format";

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
    });
    setErr("");setModal(true);
  };

  const guardar=()=>{
    if(!form.cliente.trim()){setErr("Ingresa el nombre del cliente.");return;}
    if(!form.producto_interes.trim()){setErr("Ingresa el producto de interes.");return;}
    const datos={
      cliente:form.cliente.trim(),contacto:form.contacto.trim(),cargo:form.cargo.trim(),pais:form.pais.trim(),
      email:form.email.trim(),telefono:form.telefono.trim(),tipo_cliente:form.tipo_cliente,canal_entrada:form.canal_entrada,
      responsable:form.responsable.trim(),producto_interes:form.producto_interes.trim(),
      kg_estimado:numVal(form.kg_estimado),valor_estimado:numVal(form.valor_estimado),
      prioridad:form.prioridad,potencial_estrategico:form.potencial_estrategico,
      proxima_accion:form.proxima_accion.trim(),fecha_proxima_accion:form.fecha_proxima_accion,notas:form.notas,
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
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>
          {["Cliente","Tipo Cliente","Etapa","Prioridad","Proxima Accion","Fecha Proxima Accion","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
        </tr></thead>
        <tbody>{activasFiltradas.map(op=>{
          const idx=ETAPAS.findIndex(e=>e.key===etapaKeyEfectiva(op));
          const vencida=op.fecha_proxima_accion&&op.fecha_proxima_accion<today();
          return(<tr key={op.id}>
            <td style={{...S.td,fontWeight:600}}>{op.cliente}</td>
            <td style={{...S.td,color:C.textDim}}>{op.tipo_cliente||"—"}</td>
            <td style={S.td}>{etapaInfo(etapaKeyEfectiva(op)).label}</td>
            <td style={S.td}>{op.prioridad?<Bdg label={op.prioridad} col={PRIORIDAD_COL[op.prioridad]||C.gray}/>:"—"}</td>
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
