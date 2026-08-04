import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Bdg,Fld,Modal,TablaScrollV}from"../ui";
import{fmt,numVal,today,genId,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";

const ESTADOS=[
  {key:"enviada",label:"Enviada",col:C.teal},
  {key:"en_espera",label:"En Espera",col:C.gold},
  {key:"convertida",label:"Convertida",col:C.green},
  {key:"sin_respuesta",label:"Sin Respuesta",col:C.red},
  {key:"rechazada",label:"Rechazada",col:C.gray},
];
const estadoInfo=(key)=>ESTADOS.find(e=>e.key===key)||ESTADOS[0];

export function Muestras({muestras,setMuestras,oportunidades,user}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [cliente,setCliente]=useState("");
  const [producto,setProducto]=useState("");
  const [cantidadGr,setCantidadGr]=useState("");
  const [fechaEnvio,setFechaEnvio]=useState(today());
  const [estado,setEstado]=useState("enviada");
  const [oportunidadId,setOportunidadId]=useState("");
  const [fechaRespuesta,setFechaRespuesta]=useState("");
  const [notas,setNotas]=useState("");
  const [err,setErr]=useState("");

  const [fBusqueda,setFBusqueda]=useState("");
  const [fEstado,setFEstado]=useState("todos");
  const [mesFiltro,setMesFiltro]=useState("todos");

  const abrirNuevo=()=>{
    setEditId(null);setCliente("");setProducto("");setCantidadGr("");setFechaEnvio(today());
    setEstado("enviada");setOportunidadId("");setFechaRespuesta("");setNotas("");setErr("");setModal(true);
  };
  const abrirEditar=(m)=>{
    setEditId(m.id);setCliente(m.cliente);setProducto(m.producto);setCantidadGr(m.cantidad_gr||"");
    setFechaEnvio(m.fecha_envio||today());setEstado(m.estado||"enviada");setOportunidadId(m.oportunidad_id||"");
    setFechaRespuesta(m.fecha_respuesta||"");setNotas(m.notas||"");setErr("");setModal(true);
  };

  const guardar=()=>{
    if(!cliente.trim()){setErr("Ingresa el nombre del cliente.");return;}
    if(!producto.trim()){setErr("Ingresa el producto.");return;}
    if(!(numVal(cantidadGr)>0)){setErr("Ingresa una cantidad valida (mayor a 0).");return;}
    if(!fechaEnvio){setErr("Ingresa la fecha de envio.");return;}
    if(editId){
      setMuestras(list=>list.map(m=>m.id===editId?{...m,cliente:cliente.trim(),producto:producto.trim(),cantidad_gr:numVal(cantidadGr),fecha_envio:fechaEnvio,estado,oportunidad_id:oportunidadId||null,fecha_respuesta:fechaRespuesta||"",notas}:m));
    }else{
      const nueva={
        id:genId(),fecha_registro:today(),cliente:cliente.trim(),producto:producto.trim(),
        cantidad_gr:numVal(cantidadGr),fecha_envio:fechaEnvio,estado,
        oportunidad_id:oportunidadId||null,fecha_respuesta:fechaRespuesta||"",notas,
        usuario_registro:user?.nombre||user?.email||"",
      };
      setMuestras(list=>[nueva,...list]);
    }
    setModal(false);
  };

  const eliminar=(id)=>{
    if(!window.confirm("¿Eliminar esta muestra? Esta accion no se puede deshacer."))return;
    setMuestras(list=>list.filter(m=>m.id!==id));
  };

  const mesesDisponibles=[...new Set(muestras.map(m=>mesDe(m.fecha_envio)).filter(Boolean))];
  const mesActual=mesDe(today());
  const periodoLabel=mesFiltro==="todos"?mesActual:mesFiltro;
  const dataPeriodo=muestras.filter(m=>mesDe(m.fecha_envio)===periodoLabel);
  const convertidasPeriodo=dataPeriodo.filter(m=>m.estado==="convertida").length;
  const tasaConversion=dataPeriodo.length?Math.round(convertidasPeriodo/dataPeriodo.length*100):0;
  const sinRespuestaPeriodo=dataPeriodo.filter(m=>m.estado==="sin_respuesta").length;

  const oportunidadDe=(id)=>oportunidades.find(o=>o.id===id);

  const muestrasFiltradas=muestras.filter(m=>{
    if(mesFiltro!=="todos"&&mesDe(m.fecha_envio)!==mesFiltro)return false;
    if(fEstado!=="todos"&&m.estado!==fEstado)return false;
    if(fBusqueda){
      const q=fBusqueda.toLowerCase();
      if(!m.cliente.toLowerCase().includes(q)&&!m.producto.toLowerCase().includes(q))return false;
    }
    return true;
  }).sort((a,b)=>(b.fecha_envio||"").localeCompare(a.fecha_envio||""));

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{color:C.navy,fontSize:15,fontWeight:700}}>Muestras</div>
      <button style={S.btn} onClick={abrirNuevo}>+ Nueva Muestra</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Muestras Este Mes" value={dataPeriodo.length} col={C.accent}/>
      <KPI label="Convertidas" value={convertidasPeriodo} col={C.green}/>
      <KPI label="Tasa de Conversion" value={tasaConversion+"%"} col={C.gold}/>
      <KPI label="Sin Respuesta" value={sinRespuestaPeriodo} col={sinRespuestaPeriodo>=3?C.red:C.orange}/>
    </div>

    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      {["todos",...mesesDisponibles].map(m=>(<button key={m} style={{...S.btnG,background:mesFiltro===m?C.navy:"transparent",color:mesFiltro===m?C.white:C.textDim,fontSize:11,padding:"4px 10px",textTransform:"capitalize"}} onClick={()=>setMesFiltro(m)}>{m==="todos"?"Todos":m}</button>))}
    </div>

    <div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por cliente o producto..." value={fBusqueda} onChange={e=>setFBusqueda(e.target.value)}/>
      <select style={{...S.select,width:170}} value={fEstado} onChange={e=>setFEstado(e.target.value)}>
        <option value="todos">Todos los estados</option>
        {ESTADOS.map(e=>(<option key={e.key} value={e.key}>{e.label}</option>))}
      </select>
      {(fBusqueda||fEstado!=="todos"||mesFiltro!=="todos")&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFBusqueda("");setFEstado("todos");setMesFiltro("todos");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{muestrasFiltradas.length} de {muestras.length} muestras</span>
    </div>

    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Muestras Registradas</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:950}}><thead><tr>
        {["Cliente","Producto","Cantidad (gr)","Fecha Envio","Estado","Oportunidad Vinculada","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
      </tr></thead>
      <tbody>{muestrasFiltradas.map(m=>{
        const op=m.oportunidad_id?oportunidadDe(m.oportunidad_id):null;
        const ei=estadoInfo(m.estado);
        return(<tr key={m.id}>
          <td style={{...S.td,fontWeight:600}}>{m.cliente}</td>
          <td style={S.td}>{m.producto}</td>
          <td style={S.td}>{fmt(m.cantidad_gr)} g</td>
          <td style={{...S.td,color:C.textDim}}>{fmtFecha(m.fecha_envio)}</td>
          <td style={S.td}><Bdg label={ei.label} col={ei.col}/></td>
          <td style={S.td}>{op?op.cliente:<span style={{color:C.textFaint}}>—</span>}</td>
          <td style={S.td}><div style={{display:"flex",gap:6}}>
            <button style={{...S.btnG,fontSize:11,padding:"5px 10px"}} onClick={()=>abrirEditar(m)}>Editar</button>
            <button style={{...S.btnG,fontSize:11,padding:"5px 10px",color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminar(m.id)}>Eliminar</button>
          </div></td>
        </tr>);
      })}</tbody></table></TablaScrollV>
      {muestrasFiltradas.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{muestras.length===0?"Sin muestras registradas todavia.":"Ninguna muestra coincide con el filtro."}</div>}
    </div>

    {modal&&(<Modal title={editId?"Editar Muestra":"Nueva Muestra"} onClose={()=>setModal(false)}>
      {err&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {err}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Cliente" half><input style={S.input} value={cliente} onChange={e=>setCliente(e.target.value)}/></Fld>
        <Fld label="Producto" half><input style={S.input} value={producto} onChange={e=>setProducto(e.target.value)}/></Fld>
        <Fld label="Cantidad (gr)" half><input style={S.input} type="number" value={cantidadGr} onChange={e=>setCantidadGr(e.target.value)}/></Fld>
        <Fld label="Fecha de Envio" half><input style={S.input} type="date" value={fechaEnvio} onChange={e=>setFechaEnvio(e.target.value)}/></Fld>
        <Fld label="Estado" half>
          <select style={S.select} value={estado} onChange={e=>setEstado(e.target.value)}>
            {ESTADOS.map(e=>(<option key={e.key} value={e.key}>{e.label}</option>))}
          </select>
        </Fld>
        <Fld label="Oportunidad Vinculada (opcional)" half>
          <select style={S.select} value={oportunidadId} onChange={e=>setOportunidadId(e.target.value)}>
            <option value="">Ninguna</option>
            {oportunidades.map(o=>(<option key={o.id} value={o.id}>{o.cliente+" — "+o.producto_interes}</option>))}
          </select>
        </Fld>
        <Fld label="Fecha de Respuesta (opcional)" half><input style={S.input} type="date" value={fechaRespuesta} onChange={e=>setFechaRespuesta(e.target.value)}/></Fld>
        <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={notas} onChange={e=>setNotas(e.target.value)}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={S.btn} onClick={guardar}>{editId?"Guardar Cambios":"Guardar Muestra"}</button>
      </div>
    </Modal>)}
  </div>);
}
