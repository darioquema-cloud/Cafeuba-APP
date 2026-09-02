import{useState,Fragment}from"react";
import{C,S}from"../../theme";
import{KPI,Bdg,Fld,Modal,TablaScrollV}from"../ui";
import{fmt,fmtCOP,numVal,today,genId,fmtFecha}from"../../lib/format";
import{mesTrillaDe}from"../../lib/dates";
import{calcCosto,calcCostoTri,getSeedCostoTri}from"../../lib/costing";
import{pesoATrilladora}from"../../lib/stock";

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

const normProducto=(p)=>(p||"").trim().toUpperCase();

// Composicion Producto Comercial (Blend) -> Base(s) de Excelso, con su porcentaje. La mayoria
// usa 40% de una base especifica + 60% de Excelso regional generico (no verificado, se asume
// siempre disponible); NIU es la excepcion: 50% PP + 50% CC, sin componente regional.
const BASES_PRODUCTO={
  "CATURRA NITRO":[{base:"SD",pct:0.4}],
  "NG":[{base:"LYCHE",pct:0.4}],
  "AGI":[{base:"AGRAZ",pct:0.4}],
  "APRIL":[{base:"DR",pct:0.4}],
  "LOGAN":[{base:"AR",pct:0.4}],
  "TOFFEE":[{base:"BB",pct:0.4}],
  "TROPICAL":[{base:"NR",pct:0.4}],
  "MAYPOP":[{base:"MR",pct:0.4}],
  "NIU":[{base:"PP",pct:0.5},{base:"CC",pct:0.5}],
  "TOBACCO":[{base:"VAINILLA",pct:0.4}],
};

// Estimacion informativa de fecha de entrega cuando falta stock — solo excluye fines de
// semana (sin festivos colombianos por ahora), no bloquea ni reserva stock.
const sumarDiasHabiles=(fechaInicio,dias)=>{
  const f=new Date(fechaInicio);
  let restantes=dias;
  while(restantes>0){
    f.setDate(f.getDate()+1);
    const dow=f.getDay();
    if(dow!==0&&dow!==6)restantes--;
  }
  return f;
};

// ═══ Funciones de costo replicadas TAL CUAL (solo lectura) de BodegaTrilladoraFino.jsx
// (costoKgExFinoDe) — no vive exportada en ese archivo, asi que se copia aqui como funcion
// pura sin modificar su logica interna.
const costoKgExFinoDe=(grupo)=>{
  for(const x of grupo){if(x.trilla?.costo_kg_excelso>0)return x.trilla.costo_kg_excelso;}
  for(const x of grupo){if(x.costo_compra_kg>0)return x.costo_compra_kg;}
  return 0;
};

export function Pedidos({pedidos,setPedidos,lotes,lotesFino,blends,blendsFino,costos,user}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [cliente,setCliente]=useState("");
  const [productoComercial,setProductoComercial]=useState("");
  const [kgSolicitados,setKgSolicitados]=useState("");
  const [precioKg,setPrecioKg]=useState("");
  const [fechaEntrega,setFechaEntrega]=useState("");
  const [notas,setNotas]=useState("");
  const [err,setErr]=useState("");
  const [fCliente,setFCliente]=useState("");
  const [fEstado,setFEstado]=useState("todos");
  const [fProducto,setFProducto]=useState("");

  // ═══ Costo replicado TAL CUAL (solo lectura) de costoKgGrupoDe en BodegaTrilladora.jsx —
  // no vive exportada en ese archivo, asi que se copia aqui como closure sin modificar su
  // logica interna.
  const costoKgGrupoExcelso=(grupo)=>{
    const repr=grupo[0];
    const excelsoGrupo=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
    const efPeso=(x)=>pesoATrilladora(x)||(x.trilla?.kg_excelso||0);
    const efCostoKg=(x)=>{const p=pesoATrilladora(x);const cl=calcCosto(x,costos,lotes);if(p>0&&cl?.total>0)return cl.total;const stored=x.trilla?.costo_kg_excelso||0;return stored>0?stored:getSeedCostoTri(x.codigo,x.kg_producto);};
    const pesoEf=grupo.reduce((s,x)=>s+efPeso(x),0);
    const costoTotalGrupo=grupo.reduce((s,x)=>s+efCostoKg(x)*efPeso(x),0);
    const D=calcCostoTri(mesTrillaDe(repr),costos,lotes).costoTriKg;
    return excelsoGrupo>0?Math.round(costoTotalGrupo/excelsoGrupo)+Math.round(D):0;
  };

  // ═══ Lista unificada: combina las 4 fuentes de stock (excelso, excelso CF, blend, blend
  // CF) en una sola estructura plana, agrupable por producto_norm sin importar la seccion.
  const trilledLotes=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const gruposExcelso=construirGruposT(lotes,trilledLotes);
  const entExcelso=gruposExcelso.map(g=>{
    const repr=g[0];
    return{tipo:"excelso",seccion_label:"Excelso (Bodega Trilladora)",ref_id:repr.id,ref_codigo:repr.trilla?.nombre_trillado||repr.codigo,producto_original:repr.producto||"",producto_norm:normProducto(repr.producto),disponible:stockGrupoDe(lotes,repr),valor_unitario:costoKgGrupoExcelso(g)};
  });

  const trilledFino=lotesFino.filter(l=>l.trilla?.kg_excelso>0);
  const gruposFino=construirGruposBTF(lotesFino,trilledFino);
  const entExcelsoCF=gruposFino.map(g=>{
    const repr=g[0];
    return{tipo:"excelso_cf",seccion_label:"Excelso Fino (Bodega Trilladora Fino)",ref_id:repr.id,ref_codigo:repr.trilla?.nombre_trillado||repr.codigo,producto_original:repr.producto||"",producto_norm:normProducto(repr.producto),disponible:stockGrupoBTF(g),valor_unitario:costoKgExFinoDe(g)};
  });

  const entBlend=blends.map(b=>({tipo:"blend",seccion_label:"Blend",ref_id:b.id,ref_codigo:b.codigo,producto_original:b.producto_comercial||b.nombre||"",producto_norm:normProducto(b.producto_comercial||b.nombre),disponible:stockBlend(b),valor_unitario:Math.round(b.costo_kg)||0}));
  const entBlendCF=blendsFino.map(b=>({tipo:"blend_cf",seccion_label:"Blend Cafe Fino",ref_id:b.id,ref_codigo:b.codigo,producto_original:b.producto_comercial||b.nombre||"",producto_norm:normProducto(b.producto_comercial||b.nombre),disponible:stockBlend(b),valor_unitario:Math.round(b.costo_kg)||0}));

  const entidadesUnificadas=[...entExcelso,...entExcelsoCF,...entBlend,...entBlendCF];
  const productosUnicos=[...new Set(entidadesUnificadas.map(e=>e.producto_norm))].sort((a,b)=>a.localeCompare(b));

  const desgloseDe=(productoNorm)=>entidadesUnificadas.filter(e=>e.producto_norm===productoNorm);
  const desgloseSel=productoComercial?desgloseDe(productoComercial):[];
  const totalDisponibleSel=desgloseSel.reduce((s,e)=>s+e.disponible,0);
  const valorPromedioPonderado=totalDisponibleSel>0?
    desgloseSel.reduce((s,f)=>s+f.valor_unitario*f.disponible,0)/totalDisponibleSel
    :0;

  // Estimacion informativa de dias segun disponibilidad de la(s) base(s) de Excelso que
  // componen el blend faltante — no reserva stock, solo consulta entidadesUnificadas.
  const stockDisponibleDeBase=(nombreBase)=>{
    const nb=normProducto(nombreBase);
    return entidadesUnificadas
      .filter(e=>(e.tipo==="excelso"||e.tipo==="excelso_cf")&&e.producto_norm===nb)
      .reduce((s,e)=>s+e.disponible,0);
  };
  const calcularDiasBlend=(productoComercialNorm,faltanteKg)=>{
    const composicion=BASES_PRODUCTO[productoComercialNorm];
    if(!composicion)return 20;
    const todasAlcanzan=composicion.every(({base,pct})=>{
      const necesario=faltanteKg*pct;
      return stockDisponibleDeBase(base)>=necesario;
    });
    return todasAlcanzan?6:20;
  };

  const esBlendPredominante=desgloseSel.some(f=>f.tipo==="blend"||f.tipo==="blend_cf");
  const faltante=Math.max(0,(+kgSolicitados||0)-totalDisponibleSel);
  const diasEstimados=esBlendPredominante?calcularDiasBlend(productoComercial,faltante):20;
  const fechaEstimadaEntrega=faltante>0?sumarDiasHabiles(new Date(),diasEstimados):null;

  // Disponible recalculado en vivo para la tabla — no usa el snapshot congelado del registro.
  // Tolerante con pedidos viejos (estructura ref_id/tipo_producto suelto, sin producto_comercial).
  const disponibleDeProducto=(productoNorm)=>{
    if(!productoNorm)return null;
    const filas=desgloseDe(productoNorm);
    if(!filas.length)return null;
    return{total:filas.reduce((s,e)=>s+e.disponible,0),count:filas.length};
  };
  const stockActualLegacy=(pedido)=>{
    if(pedido.tipo_producto==="excelso"){const l=lotes.find(x=>x.id===pedido.ref_id);return l?stockGrupoDe(lotes,l):null;}
    if(pedido.tipo_producto==="excelso_cf"){const l=lotesFino.find(x=>x.id===pedido.ref_id);return l?stockGrupoBTF(grupoDeBTF(lotesFino,l)):null;}
    if(pedido.tipo_producto==="blend"){const b=blends.find(x=>x.id===pedido.ref_id);return b?stockBlend(b):null;}
    if(pedido.tipo_producto==="blend_cf"){const b=blendsFino.find(x=>x.id===pedido.ref_id);return b?stockBlend(b):null;}
    return null;
  };

  const abrirNuevo=()=>{
    setEditId(null);
    setCliente("");setProductoComercial("");setKgSolicitados("");setPrecioKg("");setFechaEntrega("");setNotas("");setErr("");setModal(true);
  };

  const abrirEditar=(p)=>{
    setEditId(p.id);
    setCliente(p.cliente);
    setProductoComercial(p.producto_comercial);
    setKgSolicitados(String(p.kg_solicitados));
    setPrecioKg(p.precio_kg?String(p.precio_kg):"");
    setFechaEntrega(p.fecha_entrega_esperada||"");
    setNotas(p.notas||"");
    setErr("");
    setModal(true);
  };

  const guardar=()=>{
    const kg=numVal(kgSolicitados);
    if(!cliente.trim()){setErr("Ingresa el nombre del cliente.");return;}
    if(!productoComercial){setErr("Selecciona el producto comercial.");return;}
    if(!(kg>0)){setErr("Ingresa un peso solicitado valido (mayor a 0).");return;}
    const precio=numVal(precioKg);
    const valor=precio>0?kg*precio:0;
    const desgloseActualizado=desgloseSel.map(e=>({tipo:e.tipo,seccion_label:e.seccion_label,ref_id:e.ref_id,ref_codigo:e.ref_codigo,disponible_al_momento:e.disponible,valor_unitario:e.valor_unitario}));
    const fechaSistema=fechaEstimadaEntrega?fechaEstimadaEntrega.toISOString().slice(0,10):null;
    if(editId){
      setPedidos(p=>p.map(x=>x.id===editId?{
        ...x,cliente:cliente.trim(),producto_comercial:productoComercial,desglose:desgloseActualizado,
        kg_solicitados:kg,precio_kg:precio,valor_estimado:valor,
        fecha_entrega_esperada:fechaEntrega,notas,
        faltante_kg:faltante>0?faltante:0,fecha_estimada_sistema:fechaSistema,
      }:x));
    }else{
      const nuevo={
        id:genId(),fecha_registro:today(),cliente:cliente.trim(),
        producto_comercial:productoComercial,desglose:desgloseActualizado,
        kg_solicitados:kg,precio_kg:precio,valor_estimado:valor,
        fecha_entrega_esperada:fechaEntrega,notas,entregado:false,
        faltante_kg:faltante>0?faltante:0,fecha_estimada_sistema:fechaSistema,
        usuario_registro:user?.nombre||user?.email||"",
      };
      setPedidos(p=>[nuevo,...p]);
    }
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
    if(fProducto){
      const q=fProducto.toLowerCase();
      const prodTexto=(p.producto_comercial||p.ref_codigo||"").toLowerCase();
      if(!prodTexto.includes(q))return false;
    }
    return true;
  }).sort((a,b)=>b.fecha_registro.localeCompare(a.fecha_registro));

  const [clienteExpandido,setClienteExpandido]=useState(null);
  const clientesAgrupados=(()=>{
    const map={};
    pedidosFiltrados.forEach(p=>{
      if(!map[p.cliente])map[p.cliente]={cliente:p.cliente,totalKg:0,count:0,pendientes:0,entregados:0,valorTotal:0,pedidos:[]};
      map[p.cliente].totalKg+=p.kg_solicitados||0;
      map[p.cliente].valorTotal+=p.valor_estimado||0;
      map[p.cliente].count++;
      if(p.entregado)map[p.cliente].entregados++;else map[p.cliente].pendientes++;
      map[p.cliente].pedidos.push(p);
    });
    return Object.values(map).sort((a,b)=>b.totalKg-a.totalKg);
  })();

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
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por producto comercial..." value={fProducto} onChange={e=>setFProducto(e.target.value)}/>
      <select style={{...S.select,width:150}} value={fEstado} onChange={e=>setFEstado(e.target.value)}>
        <option value="todos">Todos</option>
        <option value="pendientes">Pendientes</option>
        <option value="entregados">Entregados</option>
      </select>
      {(fCliente||fEstado!=="todos"||fProducto)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFCliente("");setFEstado("todos");setFProducto("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{pedidosFiltrados.length} de {pedidos.length} pedidos</span>
    </div>
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Pedidos Registrados</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
      <thead><tr>
        {["","Cliente","Total Kg","N° Pedidos","Pendientes","Entregados","Valor Total"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
      </tr></thead>
      <tbody>{clientesAgrupados.map(c=>{
        const expandido=clienteExpandido===c.cliente;
        return(<Fragment key={c.cliente}>
          <tr style={{cursor:"pointer",background:expandido?C.accentBg:"transparent"}} onClick={()=>setClienteExpandido(expandido?null:c.cliente)}>
            <td style={{...S.td,width:24,textAlign:"center",color:C.textDim}}>{expandido?"▾":"▸"}</td>
            <td style={{...S.td,fontWeight:700,color:C.navy}}>{c.cliente}</td>
            <td style={{...S.td,fontWeight:700}}>{fmt(c.totalKg)} kg</td>
            <td style={S.td}>{c.count}</td>
            <td style={{...S.td,color:c.pendientes>0?C.gold:C.textFaint,fontWeight:c.pendientes>0?700:400}}>{c.pendientes}</td>
            <td style={{...S.td,color:C.green,fontWeight:700}}>{c.entregados}</td>
            <td style={{...S.td,color:C.gold,fontWeight:700}}>{c.valorTotal>0?fmtCOP(c.valorTotal):"—"}</td>
          </tr>
          {expandido&&(<tr><td colSpan={7} style={{padding:"14px 20px",background:C.bg,borderBottom:"1px solid "+C.border}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>
              {["Fecha","Producto","Kg Solicitados","Disponible","Valor Estimado","Fecha Entrega","Entregado","Notas","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
            </tr></thead>
            <tbody>{c.pedidos.map(p=>{
              const dispInfo=p.producto_comercial?disponibleDeProducto(p.producto_comercial):null;
              const disponible=dispInfo?dispInfo.total:(p.producto_comercial?null:stockActualLegacy(p));
              const excede=disponible!=null&&p.kg_solicitados>disponible;
              return(<tr key={p.id}>
                <td style={{...S.td,color:C.textDim}}>{fmtFecha(p.fecha_registro)}</td>
                <td style={S.td}><Bdg label={p.producto_comercial||p.ref_codigo||"—"} col={C.gold} bg={C.goldBg}/></td>
                <td style={{...S.td,fontWeight:700,color:excede?C.red:C.navy}}>{fmt(p.kg_solicitados)} kg</td>
                <td style={S.td}>{disponible==null?(<span style={{color:C.textFaint}}>—</span>):(<span style={{color:excede?C.red:C.green,fontWeight:700}}>{fmt(disponible)} kg{excede&&" ⚠"}{dispInfo&&dispInfo.count>1&&(<span style={{color:C.textFaint,fontWeight:400,fontSize:11}}> ({dispInfo.count} lotes)</span>)}</span>)}</td>
                <td style={{...S.td,color:C.gold,fontWeight:700}}>{p.valor_estimado>0?fmtCOP(p.valor_estimado):"—"}</td>
                <td style={{...S.td,color:C.textDim}}>{p.fecha_entrega_esperada?fmtFecha(p.fecha_entrega_esperada):"—"}{p.faltante_kg>0&&p.fecha_estimada_sistema&&(<div style={{color:C.orange,fontSize:10,fontWeight:600,marginTop:2}}>Est. sistema: {fmtFecha(p.fecha_estimada_sistema)}</div>)}</td>
                <td style={S.td} onClick={e=>e.stopPropagation()}><label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={!!p.entregado} onChange={()=>toggleEntregado(p.id)} style={{accentColor:C.green}}/><span style={{color:p.entregado?C.green:C.red,fontWeight:700,fontSize:12}}>{p.entregado?"Entregado":"Pendiente"}</span></label></td>
                <td style={{...S.td,color:C.textDim,fontSize:12}}>{p.notas||"-"}</td>
                <td style={S.td} onClick={e=>e.stopPropagation()}>
                  <button style={{...S.btnG,marginRight:6}} onClick={()=>abrirEditar(p)}>Editar</button>
                  <button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminarPedido(p.id)}>Eliminar</button>
                </td>
              </tr>);
            })}</tbody></table>
          </td></tr>)}
        </Fragment>);
      })}</tbody></table></TablaScrollV>
      {clientesAgrupados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{pedidos.length===0?"Sin pedidos registrados todavia.":"Ningun pedido coincide con el filtro."}</div>}
    </div>

    {modal&&(<Modal title={editId?"Editar Pedido":"Nuevo Pedido"} onClose={()=>setModal(false)}>
      {err&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {err}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Cliente" half><input style={S.input} value={cliente} onChange={e=>setCliente(e.target.value)}/></Fld>
        <Fld label="Producto Comercial" half>
          <select style={S.select} value={productoComercial} onChange={e=>setProductoComercial(e.target.value)}>
            <option value="">Selecciona...</option>
            {productosUnicos.map(prod=>(<option key={prod} value={prod}>{prod||"(Sin Producto)"}</option>))}
          </select>
        </Fld>
      </div>
      {productoComercial&&(<div style={{...S.card,background:C.panel2,marginBottom:14,padding:12}}>
        <div style={{fontWeight:600,fontSize:12,color:C.navy,marginBottom:8}}>Desglose por seccion — {productoComercial||"(Sin Producto)"}</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
          {["Seccion","Codigo","Kg Disponibles","Valor Unitario"].map(h=>(<th key={h} style={{...S.th,fontSize:11}}>{h}</th>))}
        </tr></thead>
        <tbody>
          {desgloseSel.map((e,i)=>(<tr key={e.tipo+":"+e.ref_id+":"+i}>
            <td style={{...S.td,fontSize:12}}>{e.seccion_label}</td>
            <td style={{...S.td,fontFamily:"monospace",color:C.accent,fontWeight:600,fontSize:12}}>{e.ref_codigo}</td>
            <td style={{...S.td,color:C.green,fontWeight:600,fontSize:12}}>{fmt(e.disponible)} kg</td>
            <td style={{...S.td,color:C.gold,fontWeight:600,fontSize:12}}>{fmtCOP(e.valor_unitario)}</td>
          </tr>))}
          {desgloseSel.length===0&&(<tr><td colSpan={4} style={{...S.td,color:C.textFaint,fontSize:12}}>Sin stock disponible para este producto en ninguna seccion.</td></tr>)}
        </tbody>
        <tfoot><tr>
          <td style={{...S.td,fontWeight:700,fontSize:12}} colSpan={2}>Total disponible</td>
          <td style={{...S.td,fontWeight:800,fontSize:13,color:(numVal(kgSolicitados)>totalDisponibleSel)?C.red:C.green}}>{fmt(totalDisponibleSel)} kg{numVal(kgSolicitados)>totalDisponibleSel&&" — ⚠ Supera el stock disponible"}</td>
          <td style={{...S.td,fontWeight:800,fontSize:13,color:C.gold}}>{desgloseSel.length>0?("Prom: "+fmtCOP(valorPromedioPonderado)):"—"}</td>
        </tr></tfoot>
        </table>
        {faltante>0&&(
          <div style={{marginTop:10,padding:"10px 14px",background:C.orange+"15",border:"1px solid "+C.orange+"40",borderRadius:8,fontSize:12,color:C.navy}}>
            ⚠️ Faltan {fmt(faltante,1)} kg por producir. Tiempo estimado: {diasEstimados} días hábiles.
            Fecha estimada de entrega: <b>{fechaEstimadaEntrega?.toLocaleDateString("es-CO")}</b>
            {esBlendPredominante&&BASES_PRODUCTO[productoComercial]&&(
              <div style={{marginTop:4,fontSize:11,opacity:.8}}>
                Base(s) requerida(s): {BASES_PRODUCTO[productoComercial].map(b=>b.base+" ("+fmt(faltante*b.pct,1)+" kg)").join(", ")}
              </div>
            )}
          </div>
        )}
      </div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Kg Solicitados" half><input style={S.input} type="number" value={kgSolicitados} onChange={e=>setKgSolicitados(e.target.value)}/></Fld>
        <Fld label="Precio/kg (opcional)" half><input style={S.input} type="number" value={precioKg} onChange={e=>setPrecioKg(e.target.value)}/></Fld>
        <Fld label="Valor Estimado" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} readOnly value={precioKg>0&&kgSolicitados>0?fmtCOP(numVal(kgSolicitados)*numVal(precioKg)):""}/></Fld>
        <Fld label="Fecha de Entrega Esperada" half><input style={S.input} type="date" value={fechaEntrega} onChange={e=>setFechaEntrega(e.target.value)}/></Fld>
        <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={notas} onChange={e=>setNotas(e.target.value)}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={S.btn} onClick={guardar}>{editId?"Guardar Cambios":"Guardar Pedido"}</button>
      </div>
    </Modal>)}
  </div>);
}
