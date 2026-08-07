import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Bdg,Fld,Modal,TablaScrollV}from"../ui";
import{today,genId,fmtFecha}from"../../lib/format";
import{mesDe,diasEntre}from"../../lib/dates";

const TIPOS_VISITA=["Presencial","Virtual","En finca/planta","En feria internacional"];
const TIPO_VISITA_COL={"Presencial":C.accent,"Virtual":C.teal,"En finca/planta":C.green,"En feria internacional":C.purple};

// Copia minima de las etapas del embudo (ver Pipeline.jsx) solo para mostrar la etapa
// actual de cada oportunidad en el selector "Oportunidad Vinculada" — Visitas solo LEE
// oportunidades, nunca las modifica, asi que no se importa nada de Pipeline.jsx.
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
const etapaKeyEfectiva=(op)=>ETAPAS.some(e=>e.key===op.etapa)?op.etapa:"entrada_lead";
const etapaInfo=(key)=>ETAPAS.find(e=>e.key===key)||ETAPAS[0];

const clienteKey=(s)=>(s||"").trim().toLowerCase();

export function Visitas({visitas,setVisitas,oportunidades,user}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [cliente,setCliente]=useState("");
  const [tipoVisita,setTipoVisita]=useState(TIPOS_VISITA[0]);
  const [fechaVisita,setFechaVisita]=useState(today());
  const [resultado,setResultado]=useState("");
  const [notas,setNotas]=useState("");
  const [proximaAccionSugerida,setProximaAccionSugerida]=useState("");
  const [oportunidadId,setOportunidadId]=useState("");
  const [err,setErr]=useState("");

  const [mesFiltro,setMesFiltro]=useState("todos");

  const abrirNuevo=()=>{
    setEditId(null);setCliente("");setTipoVisita(TIPOS_VISITA[0]);setFechaVisita(today());
    setResultado("");setNotas("");setProximaAccionSugerida("");setOportunidadId("");setErr("");setModal(true);
  };
  const abrirEditar=(v)=>{
    setEditId(v.id);setCliente(v.cliente);setTipoVisita(v.tipo_visita||TIPOS_VISITA[0]);
    setFechaVisita(v.fecha_visita||today());setResultado(v.resultado||"");setNotas(v.notas||"");
    setProximaAccionSugerida(v.proxima_accion_sugerida||"");setOportunidadId(v.oportunidad_id||"");setErr("");setModal(true);
  };

  const guardar=()=>{
    if(!cliente.trim()){setErr("Ingresa el nombre del cliente.");return;}
    if(!fechaVisita){setErr("Ingresa la fecha de la visita.");return;}
    if(editId){
      setVisitas(list=>list.map(v=>v.id===editId?{...v,cliente:cliente.trim(),tipo_visita:tipoVisita,fecha_visita:fechaVisita,resultado:resultado.trim(),notas,proxima_accion_sugerida:proximaAccionSugerida.trim(),oportunidad_id:oportunidadId||null}:v));
    }else{
      const nueva={
        id:genId(),fecha_registro:today(),cliente:cliente.trim(),tipo_visita:tipoVisita,
        fecha_visita:fechaVisita,resultado:resultado.trim(),notas,
        proxima_accion_sugerida:proximaAccionSugerida.trim(),oportunidad_id:oportunidadId||null,
        usuario_registro:user?.nombre||user?.email||"",
      };
      setVisitas(list=>[nueva,...list]);
    }
    setModal(false);
  };

  const eliminar=(id)=>{
    if(!window.confirm("¿Eliminar esta visita? Esta accion no se puede deshacer."))return;
    setVisitas(list=>list.filter(v=>v.id!==id));
  };

  const mesesDisponibles=[...new Set(visitas.map(v=>mesDe(v.fecha_visita)).filter(Boolean))];
  const mesActual=mesDe(today());
  const periodoLabel=mesFiltro==="todos"?mesActual:mesFiltro;
  const visitasEsteMes=visitas.filter(v=>mesDe(v.fecha_visita)===periodoLabel).length;
  const proximasProgramadas=visitas.filter(v=>v.fecha_visita&&v.fecha_visita>today()).length;

  const ultimaVisitaDe=(op)=>{
    const key=clienteKey(op.cliente);
    const fechas=visitas.filter(v=>v.oportunidad_id===op.id||clienteKey(v.cliente)===key).map(v=>v.fecha_visita).filter(Boolean).sort();
    return fechas.length?fechas[fechas.length-1]:null;
  };
  const clientesActivos=oportunidades.filter(o=>o.estado==="activo"||!o.estado);
  const clientesSinVisitar90=clientesActivos.filter(op=>{
    const ultima=ultimaVisitaDe(op);
    if(!ultima)return true;
    return diasEntre(ultima,today())>90;
  }).length;

  const oportunidadDe=(id)=>oportunidades.find(o=>o.id===id);

  const visitasFiltradas=visitas.filter(v=>{
    if(mesFiltro!=="todos"&&mesDe(v.fecha_visita)!==mesFiltro)return false;
    return true;
  }).sort((a,b)=>(b.fecha_visita||"").localeCompare(a.fecha_visita||""));

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{color:C.navy,fontSize:15,fontWeight:700}}>Visitas</div>
      <button style={S.btn} onClick={abrirNuevo}>+ Nueva Visita</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Visitas Este Mes" value={visitasEsteMes} col={C.accent}/>
      <KPI label="Clientes Sin Visitar +90 Días" value={clientesSinVisitar90} col={clientesSinVisitar90>0?C.red:C.teal}/>
      <KPI label="Próximas Programadas" value={proximasProgramadas} col={C.gold}/>
    </div>

    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      {["todos",...mesesDisponibles].map(m=>(<button key={m} style={{...S.btnG,background:mesFiltro===m?C.navy:"transparent",color:mesFiltro===m?C.white:C.textDim,fontSize:11,padding:"4px 10px",textTransform:"capitalize"}} onClick={()=>setMesFiltro(m)}>{m==="todos"?"Todos":m}</button>))}
    </div>

    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Visitas Registradas</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:850}}><thead><tr>
        {["Cliente","Tipo de Visita","Fecha","Resultado","Oportunidad Vinculada","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
      </tr></thead>
      <tbody>{visitasFiltradas.map(v=>{
        const op=v.oportunidad_id?oportunidadDe(v.oportunidad_id):null;
        return(<tr key={v.id}>
          <td style={{...S.td,fontWeight:600}}>{v.cliente}</td>
          <td style={S.td}><Bdg label={v.tipo_visita||"—"} col={TIPO_VISITA_COL[v.tipo_visita]||C.gray}/></td>
          <td style={{...S.td,color:C.textDim}}>{fmtFecha(v.fecha_visita)}</td>
          <td style={{...S.td,color:C.textDim}}>{v.resultado||"—"}</td>
          <td style={S.td}>{op?op.cliente:<span style={{color:C.textFaint}}>—</span>}</td>
          <td style={S.td}><div style={{display:"flex",gap:6}}>
            <button style={{...S.btnG,fontSize:11,padding:"5px 10px"}} onClick={()=>abrirEditar(v)}>Editar</button>
            <button style={{...S.btnG,fontSize:11,padding:"5px 10px",color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminar(v.id)}>Eliminar</button>
          </div></td>
        </tr>);
      })}</tbody></table></TablaScrollV>
      {visitasFiltradas.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{visitas.length===0?"Sin visitas registradas todavia.":"Ninguna visita coincide con el filtro."}</div>}
    </div>

    {modal&&(<Modal title={editId?"Editar Visita":"Nueva Visita"} onClose={()=>setModal(false)}>
      {err&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {err}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Cliente" half><input style={S.input} value={cliente} onChange={e=>setCliente(e.target.value)}/></Fld>
        <Fld label="Tipo de Visita" half>
          <select style={S.select} value={tipoVisita} onChange={e=>setTipoVisita(e.target.value)}>
            {TIPOS_VISITA.map(t=>(<option key={t} value={t}>{t}</option>))}
          </select>
        </Fld>
        <Fld label="Fecha de Visita" half><input style={S.input} type="date" value={fechaVisita} onChange={e=>setFechaVisita(e.target.value)}/></Fld>
        <Fld label="Resultado" half><input style={S.input} value={resultado} onChange={e=>setResultado(e.target.value)} placeholder="Ej: Interesado, Seguimiento..."/></Fld>
        <Fld label="Oportunidad Vinculada (opcional)" half>
          <select style={S.select} value={oportunidadId} onChange={e=>setOportunidadId(e.target.value)}>
            <option value="">Ninguna</option>
            {oportunidades.map(o=>(<option key={o.id} value={o.id}>{o.cliente+" — "+etapaInfo(etapaKeyEfectiva(o)).label}</option>))}
          </select>
        </Fld>
        <Fld label="Próxima Acción Sugerida" half><input style={S.input} value={proximaAccionSugerida} onChange={e=>setProximaAccionSugerida(e.target.value)}/></Fld>
        <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={notas} onChange={e=>setNotas(e.target.value)}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={S.btn} onClick={guardar}>{editId?"Guardar Cambios":"Guardar Visita"}</button>
      </div>
    </Modal>)}
  </div>);
}
