import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Bdg,Fld,Modal,TablaScrollV}from"../ui";
import{fmt,fmtCOP,numVal,today,genId,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";

// ═══ Funciones de stock replicadas TAL CUAL (solo lectura) de BodegaTrilladora.jsx y
// BodegaTrilladoraFino.jsx — no viven exportadas en esos archivos, asi que se copian aqui
// como funciones puras sin modificar su logica interna. Este modulo nunca escribe stock.
const grupoDe=(lotes,l)=>[l,...lotes.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
const stockGrupoDe=(lotes,l)=>{
  const grupo=grupoDe(lotes,l);
  const excelsoTotal=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
  const salTotal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
  return excelsoTotal-salTotal;
};
const construirGruposT=(lotes,arr)=>{
  const vistos=new Set();const grupos=[];
  arr.forEach(l=>{if(vistos.has(l.id))return;const grupo=grupoDe(lotes,l);grupo.forEach(x=>vistos.add(x.id));grupos.push(grupo);});
  return grupos;
};
const grupoDeBTF=(lotesFino,l)=>[l,...lotesFino.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
const stockGrupoBTF=(grupo)=>{const exc=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);const sal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);return exc-sal;};
const construirGruposBTF=(lotesFino,arr)=>{const vistos=new Set();const gs=[];arr.forEach(l=>{if(vistos.has(l.id))return;const g=grupoDeBTF(lotesFino,l);g.forEach(x=>vistos.add(x.id));gs.push(g);});return gs;};
const stockBlend=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);

const TIPO_LABEL={excelso:"Excelso (Bodega Trilladora)",excelso_cf:"Excelso Fino (Bodega Trilladora Fino)",blend:"Blend",blend_cf:"Blend Cafe Fino"};

export function Pedidos({pedidos,setPedidos,lotes,lotesFino,blends,blendsFino,user}){
  const [modal,setModal]=useState(false);
  const [cliente,setCliente]=useState("");
  const [tipoProducto,setTipoProducto]=useState("excelso");
  const [refId,setRefId]=useState("");
  const [kgSolicitados,setKgSolicitados]=useState("");
  const [precioKg,setPrecioKg]=useState("");
  const [fechaEntrega,setFechaEntrega]=useState("");
  const [notas,setNotas]=useState("");
  const [err,setErr]=useState("");
  const [fCliente,setFCliente]=useState("");
  const [fEstado,setFEstado]=useState("todos");
  const [fTipo,setFTipo]=useState("");

  const trilledLotes=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const gruposExcelso=construirGruposT(lotes,trilledLotes);
  const opcionesExcelso=gruposExcelso.map(g=>{const repr=g[0];return{id:repr.id,codigo:repr.trilla?.nombre_trillado||repr.codigo,stock:stockGrupoDe(lotes,repr),producto:repr.producto||"Sin Producto"};});

  const trilledFino=lotesFino.filter(l=>l.trilla?.kg_excelso>0);
  const gruposFino=construirGruposBTF(lotesFino,trilledFino);
  const opcionesExcelsoCF=gruposFino.map(g=>{const repr=g[0];return{id:repr.id,codigo:repr.trilla?.nombre_trillado||repr.codigo,stock:stockGrupoBTF(g),producto:repr.producto||"Sin Producto"};});

  const opcionesBlend=blends.map(b=>({id:b.id,codigo:b.codigo,stock:stockBlend(b),producto:b.producto_comercial||b.nombre||"Sin Producto"}));
  const opcionesBlendCF=blendsFino.map(b=>({id:b.id,codigo:b.codigo,stock:stockBlend(b),producto:b.producto_comercial||b.nombre||"Sin Producto"}));

  const opcionesPorTipo={excelso:opcionesExcelso,excelso_cf:opcionesExcelsoCF,blend:opcionesBlend,blend_cf:opcionesBlendCF};
  const opcionSel=opcionesPorTipo[tipoProducto]?.find(o=>o.id===refId)||null;

  // Disponible recalculado en vivo para la tabla — no usa el valor congelado del registro
  const stockActualDe=(pedido)=>{
    if(pedido.tipo_producto==="excelso"){
      const l=lotes.find(x=>x.id===pedido.ref_id);
      return l?stockGrupoDe(lotes,l):null;
    }
    if(pedido.tipo_producto==="excelso_cf"){
      const l=lotesFino.find(x=>x.id===pedido.ref_id);
      return l?stockGrupoBTF(grupoDeBTF(lotesFino,l)):null;
    }
    if(pedido.tipo_producto==="blend"){
      const b=blends.find(x=>x.id===pedido.ref_id);
      return b?stockBlend(b):null;
    }
    if(pedido.tipo_producto==="blend_cf"){
      const b=blendsFino.find(x=>x.id===pedido.ref_id);
      return b?stockBlend(b):null;
    }
    return null;
  };

  const abrirNuevo=()=>{
    setCliente("");setTipoProducto("excelso");setRefId("");setKgSolicitados("");setPrecioKg("");setFechaEntrega("");setNotas("");setErr("");setModal(true);
  };

  const guardar=()=>{
    const kg=numVal(kgSolicitados);
    if(!cliente.trim()){setErr("Ingresa el nombre del cliente.");return;}
    if(!refId){setErr("Selecciona el producto especifico.");return;}
    if(!(kg>0)){setErr("Ingresa un peso solicitado valido (mayor a 0).");return;}
    const precio=numVal(precioKg);
    const valor=precio>0?kg*precio:0;
    const nuevo={
      id:genId(),fecha_registro:today(),cliente:cliente.trim(),tipo_producto:tipoProducto,
      ref_id:refId,ref_codigo:opcionSel?.codigo||"",
      kg_solicitados:kg,precio_kg:precio,valor_estimado:valor,
      fecha_entrega_esperada:fechaEntrega,notas,entregado:false,
      usuario_registro:user?.nombre||user?.email||"",
    };
    setPedidos(p=>[nuevo,...p]);
    setModal(false);
  };

  const toggleEntregado=(id)=>{
    setPedidos(p=>p.map(x=>x.id===id?{...x,entregado:!x.entregado}:x));
  };

  const eliminarPedido=(id)=>{
    if(!window.confirm("¿Eliminar este pedido? Esta accion no se puede deshacer."))return;
    setPedidos(p=>p.filter(x=>x.id!==id));
  };

  const pedidosFiltrados=pedidos.filter(p=>{
    if(fCliente&&!p.cliente.toLowerCase().includes(fCliente.toLowerCase()))return false;
    if(fEstado==="pendientes"&&p.entregado)return false;
    if(fEstado==="entregados"&&!p.entregado)return false;
    if(fTipo&&p.tipo_producto!==fTipo)return false;
    return true;
  }).sort((a,b)=>b.fecha_registro.localeCompare(a.fecha_registro));

  const totalPedidos=pedidos.length;
  const pendientes=pedidos.filter(p=>!p.entregado).length;
  const valorEstimadoPendientes=pedidos.filter(p=>!p.entregado).reduce((s,p)=>s+(p.valor_estimado||0),0);
  const mesActual=today().slice(0,7);
  const entregadosEsteMes=pedidos.filter(p=>p.entregado&&(p.fecha_entrega_esperada||"").slice(0,7)===mesActual).length;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{color:C.accent,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>COMERCIAL</div>
        <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Pedidos</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Registro informativo de pedidos/cotizaciones de clientes — no reserva stock ni genera salidas</div>
      </div>
      <button style={S.btn} onClick={abrirNuevo}>+ Nuevo Pedido</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Total Pedidos" value={totalPedidos} col={C.navy}/>
      <KPI label="Pendientes" value={pendientes} col={C.gold}/>
      <KPI label="Valor Estimado (Pendientes)" value={fmtCOP(valorEstimadoPendientes)} col={C.accent}/>
      <KPI label="Entregados Este Mes" value={entregadosEsteMes} col={C.green}/>
    </div>
    <div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por cliente..." value={fCliente} onChange={e=>setFCliente(e.target.value)}/>
      <select style={{...S.select,width:150}} value={fEstado} onChange={e=>setFEstado(e.target.value)}>
        <option value="todos">Todos</option>
        <option value="pendientes">Pendientes</option>
        <option value="entregados">Entregados</option>
      </select>
      <select style={{...S.select,width:220}} value={fTipo} onChange={e=>setFTipo(e.target.value)}>
        <option value="">Todos los productos</option>
        {Object.entries(TIPO_LABEL).map(([k,v])=>(<option key={k} value={k}>{v}</option>))}
      </select>
      {(fCliente||fEstado!=="todos"||fTipo)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFCliente("");setFEstado("todos");setFTipo("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{pedidosFiltrados.length} de {pedidos.length} pedidos</span>
    </div>
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Pedidos Registrados</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}><thead><tr>
        {["Fecha","Cliente","Producto/Codigo","Tipo","Kg Solicitados","Disponible","Valor Estimado","Fecha Entrega","Entregado","Notas","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
      </tr></thead>
      <tbody>{pedidosFiltrados.map(p=>{
        const disponible=stockActualDe(p);
        const excede=disponible!=null&&p.kg_solicitados>disponible;
        return(<tr key={p.id}>
          <td style={{...S.td,color:C.textDim}}>{fmtFecha(p.fecha_registro)}</td>
          <td style={{...S.td,fontWeight:600}}>{p.cliente}</td>
          <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{p.ref_codigo}</td>
          <td style={S.td}><Bdg label={TIPO_LABEL[p.tipo_producto]||p.tipo_producto} col={C.teal} bg={C.tealBg}/></td>
          <td style={{...S.td,fontWeight:700,color:excede?C.red:C.navy}}>{fmt(p.kg_solicitados)} kg</td>
          <td style={S.td}>{disponible==null?(<span style={{color:C.textFaint}}>—</span>):(<span style={{color:excede?C.red:C.green,fontWeight:700}}>{fmt(disponible)} kg{excede&&" ⚠"}</span>)}</td>
          <td style={{...S.td,color:C.gold,fontWeight:700}}>{p.valor_estimado>0?fmtCOP(p.valor_estimado):"—"}</td>
          <td style={{...S.td,color:C.textDim}}>{p.fecha_entrega_esperada?fmtFecha(p.fecha_entrega_esperada):"—"}</td>
          <td style={S.td}><label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={!!p.entregado} onChange={()=>toggleEntregado(p.id)} style={{accentColor:C.green}}/><span style={{color:p.entregado?C.green:C.textFaint,fontWeight:600,fontSize:12}}>{p.entregado?"Entregado":"Pendiente"}</span></label></td>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{p.notas||"-"}</td>
          <td style={S.td}><button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminarPedido(p.id)}>Eliminar</button></td>
        </tr>);
      })}</tbody></table></TablaScrollV>
      {pedidosFiltrados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{pedidos.length===0?"Sin pedidos registrados todavia.":"Ningun pedido coincide con el filtro."}</div>}
    </div>

    {modal&&(<Modal title="Nuevo Pedido" onClose={()=>setModal(false)}>
      {err&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {err}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Cliente" half><input style={S.input} value={cliente} onChange={e=>setCliente(e.target.value)}/></Fld>
        <Fld label="Tipo de Producto" half>
          <select style={S.select} value={tipoProducto} onChange={e=>{setTipoProducto(e.target.value);setRefId("");}}>
            {Object.entries(TIPO_LABEL).map(([k,v])=>(<option key={k} value={k}>{v}</option>))}
          </select>
        </Fld>
        <Fld label="Producto Especifico">
          <select style={S.select} value={refId} onChange={e=>setRefId(e.target.value)}>
            <option value="">Selecciona...</option>
            {(()=>{
              const listaEntidades=opcionesPorTipo[tipoProducto]||[];
              const grupos={};
              listaEntidades.forEach(e=>{
                const key=e.producto||"Sin Producto";
                if(!grupos[key])grupos[key]=[];
                grupos[key].push(e);
              });
              const productosOrdenados=Object.keys(grupos).sort((a,b)=>a.localeCompare(b));
              return productosOrdenados.map(prod=>(
                <optgroup key={prod} label={prod}>
                  {grupos[prod].sort((a,b)=>a.codigo.localeCompare(b.codigo)).map(e=>(
                    <option key={e.id} value={e.id}>{e.codigo} — {fmt(e.stock)} kg disponibles</option>
                  ))}
                </optgroup>
              ));
            })()}
          </select>
          {opcionSel&&(<div style={{marginTop:4,fontSize:12,fontWeight:600,color:(numVal(kgSolicitados)>opcionSel.stock)?C.red:C.green}}>
            Disponible: {fmt(opcionSel.stock)} kg{numVal(kgSolicitados)>opcionSel.stock&&" — ⚠ Supera el stock disponible"}
          </div>)}
        </Fld>
        <Fld label="Kg Solicitados" half><input style={S.input} type="number" value={kgSolicitados} onChange={e=>setKgSolicitados(e.target.value)}/></Fld>
        <Fld label="Precio/kg (opcional)" half><input style={S.input} type="number" value={precioKg} onChange={e=>setPrecioKg(e.target.value)}/></Fld>
        <Fld label="Valor Estimado" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} readOnly value={precioKg>0&&kgSolicitados>0?fmtCOP(numVal(kgSolicitados)*numVal(precioKg)):""}/></Fld>
        <Fld label="Fecha de Entrega Esperada" half><input style={S.input} type="date" value={fechaEntrega} onChange={e=>setFechaEntrega(e.target.value)}/></Fld>
        <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={notas} onChange={e=>setNotas(e.target.value)}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={S.btn} onClick={guardar}>Guardar Pedido</button>
      </div>
    </Modal>)}
  </div>);
}
