import{useState,useMemo}from"react";
import{C,S}from"../../theme";
import{TIPOS_TOSTION}from"../../data/constants";
import{fmtCOP,fmt,numVal,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{Bdg,Fld,KPI,Modal,TablaScrollV,SelectDestino}from"../ui";
export function TabTueste({blendsTostado,setBlendsTostado,blendsFino,lotesFino,setLotesFino,setBlendsFino,empaques}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankForm=()=>({fecha:today(),nombre_producto:"",kg_a_tostar:"",valor_unitario:"",valor_total:"",numero_baches:"",tipo_tostion:TIPOS_TOSTION[0],kg_cafe_tostado:"",catacion:"",responsable:"",codigo_lote_origen:"",fecha_proceso:"",fecha_trilla:"",fecha_secado:"",fuentes:[],origen_tipo:"",origen_salida_id:""});
  const [form,setForm]=useState(blankForm());
  const abrirNuevo=()=>{setEditId(null);setForm(blankForm());setModal(true);};
  const abrirEditar=(t)=>{setEditId(t.id);setForm({fecha:t.fecha,nombre_producto:t.nombre_producto||"",kg_a_tostar:t.kg_a_tostar,valor_unitario:t.valor_unitario,valor_total:t.valor_total,numero_baches:t.numero_baches||"",tipo_tostion:t.tipo_tostion||TIPOS_TOSTION[0],kg_cafe_tostado:t.kg_cafe_tostado||"",catacion:t.catacion||"",responsable:t.responsable||"",codigo_lote_origen:t.codigo_lote_origen||"",fecha_proceso:t.fecha_proceso||"",fecha_trilla:t.fecha_trilla||"",fecha_secado:t.fecha_secado||"",fuentes:t.fuentes||[],origen_tipo:t.origen_tipo||"",origen_salida_id:t.origen_salida_id||""});setModal(true);};
  const stockGranel=(t)=>(t.kg_cafe_tostado||0)-(t.salidas||[]).reduce((a,s)=>a+s.peso_salida,0)-empaques.filter(e=>e.lote_tostado_id===t.id).reduce((s,e)=>s+(e.kg_cafe_total||0),0);
  const [modalSalidaUBA,setModalSalidaUBA]=useState(false);
  const [selTost,setSelTost]=useState(null);
  const [formSalidaUBA,setFormSalidaUBA]=useState({fecha:today(),peso_salida:"",valor_kg:"",valor_total:"",cliente:"",observaciones:""});
  const [errSalidaUBA,setErrSalidaUBA]=useState("");
  const [errReg,setErrReg]=useState("");
  const abrirSalidaUBA=(t)=>{setSelTost(t);const vkgRef=t.valor_unitario_tostado||(t.kg_cafe_tostado&&t.valor_total?Math.round(t.valor_total/t.kg_cafe_tostado):0);setFormSalidaUBA({fecha:today(),peso_salida:"",valor_kg:vkgRef||"",valor_total:"",cliente:"",observaciones:""});setErrSalidaUBA("");setModalSalidaUBA(true);};
  const regSalidaUBA=()=>{
    const peso=numVal(formSalidaUBA.peso_salida);
    if(!selTost||!(peso>0)){setErrSalidaUBA("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockGranel(selTost);
    if(peso>stockBase){setErrSalidaUBA("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaUBA.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalidaUBA.valor_total||0);
    setBlendsTostado(p=>p.map(t=>t.id===selTost.id?{...t,salidas:[...(t.salidas||[]),{id:genId(),fecha:formSalidaUBA.fecha,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,cliente:formSalidaUBA.cliente,observaciones:formSalidaUBA.observaciones}]}:t));
    setModalSalidaUBA(false);setErrSalidaUBA("");
  };
  const reg=()=>{
    if(!form.nombre_producto){setErrReg("El Nombre Producto Comercial es obligatorio.");return;}
    if(!form.kg_a_tostar||!form.fecha)return;
    if(!editId&&form.fuentes.length>0){
      for(const f of form.fuentes){if(!(numVal(f.kg_tomados)>0)){setErrReg("Ingresa kg válidos (>0) en cada lote de origen.");return;}const pool=poolDirecto.find(p=>p.salidaId===f.salidaId);if(pool&&numVal(f.kg_tomados)>pool.kg_disponible+0.01){setErrReg("El lote "+f.blendCodigo+" solo tiene "+fmt(pool.kg_disponible)+" kg disponibles.");return;}}
    }
    setErrReg("");
    const kgTotal=form.fuentes.length>0?form.fuentes.reduce((s,f)=>s+numVal(f.kg_tomados),0):numVal(form.kg_a_tostar);
    const vtTotal=form.fuentes.length>0?form.fuentes.reduce((s,f)=>s+(f.valor_total_fuente||0),0):kgTotal*numVal(form.valor_unitario);
    const vunit=kgTotal>0?Math.round(vtTotal/kgTotal):numVal(form.valor_unitario);
    const codOrigen=form.fuentes.length>0?form.fuentes.map(f=>f.blendCodigo).join(", "):form.codigo_lote_origen;
    const lotesBld=form.fuentes.length>0?[...new Set(form.fuentes.flatMap(f=>f.lotes_blend||[]))]:(form.lotes_blend_directos||[]);
    const kgCafeTostado=numVal(form.kg_cafe_tostado);
    const vutostado=kgCafeTostado>0?Math.round(vtTotal/kgCafeTostado):0;
    const origenTipoFinal=form.fuentes.length>0?"":form.origen_tipo;
    const origenSalidaIdFinal=form.fuentes.length>0?"":form.origen_salida_id;
    if(editId){
      setBlendsTostado(p=>p.map(t=>t.id===editId?{...t,fecha:form.fecha,mes:mesDe(form.fecha),nombre_producto:form.nombre_producto,kg_a_tostar:kgTotal,valor_unitario:vunit,valor_total:vtTotal,numero_baches:form.numero_baches,tipo_tostion:form.tipo_tostion,kg_cafe_tostado:numVal(form.kg_cafe_tostado)||0,catacion:form.catacion,responsable:form.responsable,codigo_lote_origen:codOrigen,fecha_proceso:form.fecha_proceso,fecha_trilla:form.fecha_trilla,fecha_secado:form.fecha_secado,valor_unitario_tostado:vutostado,fuentes:form.fuentes,lotes_blend:lotesBld.length>0?lotesBld:t.lotes_blend||[],origen_tipo:form.fuentes.length>0?"":t.origen_tipo,origen_salida_id:form.fuentes.length>0?"":t.origen_salida_id}:t));
    }else{
      const cod="UBA-"+form.nombre_producto.replace(/\s+/g,"")+"-"+dateToCode(form.fecha);
      const newRec={id:genId(),codigo:cod,fecha:form.fecha,mes:mesDe(form.fecha),nombre_producto:form.nombre_producto,kg_a_tostar:kgTotal,valor_unitario:vunit,valor_total:vtTotal,numero_baches:form.numero_baches,tipo_tostion:form.tipo_tostion,kg_cafe_tostado:numVal(form.kg_cafe_tostado)||0,catacion:form.catacion,responsable:form.responsable,codigo_lote_origen:codOrigen,fecha_proceso:form.fecha_proceso,fecha_trilla:form.fecha_trilla,fecha_secado:form.fecha_secado,valor_unitario_tostado:vutostado,fuentes:form.fuentes,lotes_blend:lotesBld,origen_tipo:origenTipoFinal,origen_salida_id:origenSalidaIdFinal};
      setBlendsTostado(p=>[newRec,...p]);
    }
    setModal(false);
  };
  const eliminarTueste=(t)=>{
    if((t.salidas||[]).length>0){alert("Este tueste tiene "+t.salidas.length+" salida(s). Elimina primero las salidas.");return;}
    const kgEmpacado=empaques.filter(e=>e.lote_tostado_id===t.id).reduce((s,e)=>s+(e.kg_cafe_total||0),0);
    if(kgEmpacado>0){alert("Este tueste tiene "+fmt(kgEmpacado,1)+" kg empacados. Elimina primero los empaques.");return;}
    if(!window.confirm("¿Eliminar el batch "+t.codigo+"? El disponible del lote de origen se recalculará automáticamente."))return;
    setBlendsTostado(p=>p.filter(x=>x.id!==t.id));
  };
  const totalKgTostar=blendsTostado.reduce((s,t)=>s+(t.kg_a_tostar||0),0);
  const totalKgTostado=blendsTostado.reduce((s,t)=>s+(t.kg_cafe_tostado||0),0);
  const rendProm=totalKgTostar>0?((totalKgTostado/totalKgTostar)*100).toFixed(1):0;
  const pendientes=blendsTostado.filter(t=>t.kg_a_tostar>0&&(!t.kg_cafe_tostado||t.kg_cafe_tostado===0));
  // Formato actual: fuentes[i]={salidaId,kg_tomados,...} — cada fuente sabe a qué salida pertenece.
  // Formato legado: fuentes[i]={id,kg_a_tostar,kg_origen,kg_cafe_tostado} — sin salidaId propio; el
  // origen de TODAS las fuentes del registro es t.origen_salida_id (top-level). Ambos deben sumarse
  // para no perder consumo de registros viejos ni de los nuevos.
  const calcConsumido=(s,btList)=>btList.reduce((sum,t)=>{
    const fuentes=t.fuentes||[];
    if(fuentes.length>0){
      return fuentes.reduce((acc,f)=>{
        if(f.salidaId!=null)return f.salidaId===s.id?acc+numVal(f.kg_tomados):acc;
        if(f.id!=null&&(f.kg_a_tostar!=null||f.kg_origen!=null))return t.origen_salida_id===s.id?acc+numVal(f.kg_a_tostar):acc;
        console.warn("calcConsumido: fuente con formato no reconocido, se ignora en el cálculo de stock",{tuesteId:t.id,tuesteCodigo:t.codigo,fuente:f});
        return acc;
      },sum);
    }
    if(t.origen_salida_id===s.id)return sum+(t.kg_a_tostar||0);
    return sum;
  },0);
  const poolDirecto=useMemo(()=>{
    const items=[];
    (lotesFino||[]).forEach(lote=>{
      const scan=(salidas,origenTipo)=>{
        (salidas||[]).filter(s=>s.destino_key==="uba_tostado").forEach(s=>{
          const consumido=calcConsumido(s,blendsTostado);
          const kgDisp=(s.peso_salida||0)-consumido;
          items.push({salidaId:s.id,origen_tipo:origenTipo,lote_id:lote.id,lote_codigo:lote.codigo,nombre:lote.producto||lote.codigo,kg_disponible:Math.round(kgDisp*100)/100,kg_consumido:consumido,kg_original:s.peso_salida,valor_unitario:s.valor_kg||0,fecha:s.fecha,lotes_blend:[]});
        });
      };
      scan(lote.salidas_bodega,"bodega_fino");
      scan(lote.salidas_trilladora,"bodega_tri_fino");
    });
    (blendsFino||[]).forEach(b=>{
      (b.salidas||[]).filter(s=>s.destino_key==="uba_tostado").forEach(s=>{
        const consumido=calcConsumido(s,blendsTostado);
        const kgDisp=(s.peso_salida||0)-consumido;
        items.push({salidaId:s.id,origen_tipo:"blend_fino",lote_id:b.id,lote_codigo:b.codigo,nombre:b.producto_comercial||b.nombre||b.codigo,kg_disponible:Math.round(kgDisp*100)/100,kg_consumido:consumido,kg_original:s.peso_salida,valor_unitario:s.valor_kg||Math.round(b.costo_kg)||0,fecha:s.fecha,lotes_blend:(b.items||[]).map(it=>it.codigo)});
      });
    });
    return items;
  },[lotesFino,blendsFino,blendsTostado]);
  const abrirDirecto=(item)=>{
    setEditId(null);
    const vt=Math.round(item.kg_disponible*(item.valor_unitario||0));
    setForm({...blankForm(),fecha:item.fecha||today(),kg_a_tostar:item.kg_disponible,valor_unitario:item.valor_unitario,valor_total:vt||"",codigo_lote_origen:item.lote_codigo,fuentes:[{salidaId:item.salidaId,origen_tipo:item.origen_tipo,lote_id:item.lote_id,blendCodigo:item.lote_codigo,nombre_producto:item.nombre,kg_tomados:item.kg_disponible,valor_unitario:item.valor_unitario,valor_total_fuente:vt,lotes_blend:item.lotes_blend||[]}]});
    setModal(true);
  };
  const revertirSalidaDirecta=(item)=>{
    if(item.kg_consumido>0){alert("Hay "+fmt(item.kg_consumido,1)+" kg ya asignados a batches de tueste. Elimínalos primero.");return;}
    if(!window.confirm("¿Revertir la salida? Los "+fmt(item.kg_original,1)+" kg de "+item.lote_codigo+" volverán a su módulo de origen."))return;
    if(item.origen_tipo==="bodega_fino"){setLotesFino(p=>p.map(l=>l.id!==item.lote_id?l:{...l,salidas_bodega:(l.salidas_bodega||[]).filter(s=>s.id!==item.salidaId)}));}
    else if(item.origen_tipo==="bodega_tri_fino"){setLotesFino(p=>p.map(l=>l.id!==item.lote_id?l:{...l,salidas_trilladora:(l.salidas_trilladora||[]).filter(s=>s.id!==item.salidaId)}));}
    else if(item.origen_tipo==="blend_fino"){setBlendsFino(p=>p.map(b=>b.id!==item.lote_id?b:{...b,salidas:(b.salidas||[]).filter(s=>s.id!==item.salidaId)}));}
  };
  const listosParaTostar=[
    ...pendientes.map(t=>({
      id:t.id,tipo:"pendiente",codigo:t.codigo,producto:t.nombre_producto||"—",
      kg:t.kg_a_tostar,valorUnit:t.valor_unitario||0,mes:mesDe(t.fecha)||t.mes||"",
      origenLabel:t.codigo_lote_origen||(t.lotes_blend||[]).join(", ")||"—",
      _raw:t
    })),
    ...poolDirecto.map(item=>({
      id:item.origen_tipo+"_"+item.salidaId,tipo:"pool",codigo:item.lote_codigo,
      producto:item.nombre||"—",kg:item.kg_disponible,valorUnit:item.valor_unitario||0,
      mes:mesDe(item.fecha)||"",
      origenLabel:item.origen_tipo==="blend_fino"?"Blend CF":item.origen_tipo==="bodega_tri_fino"?"Trilladora CF":"Bodega CF",
      _raw:item
    })),
  ];
  const [filtroProductoListos,setFiltroProductoListos]=useState("");
  const [filtroMesListos,setFiltroMesListos]=useState("todos");
  const [filtroStockListos,setFiltroStockListos]=useState("todos");
  const mesesListos=[...new Set(listosParaTostar.map(r=>r.mes).filter(Boolean))];
  const listosFiltrados=listosParaTostar.filter(r=>
    (filtroMesListos==="todos"||r.mes===filtroMesListos)&&
    (!filtroProductoListos||r.producto.toLowerCase().includes(filtroProductoListos.toLowerCase()))&&
    (filtroStockListos==="todos"||(filtroStockListos==="con_stock"?r.kg>0:r.kg<=0))
  );
  const [filtroProductoHist,setFiltroProductoHist]=useState("");
  const [filtroMesHist,setFiltroMesHist]=useState("todos");
  const historico=blendsTostado.filter(t=>t.kg_cafe_tostado>0);
  const mesesHist=[...new Set(historico.map(t=>mesDe(t.fecha)).filter(Boolean))];
  const historicoFiltrado=historico.filter(t=>
    (filtroMesHist==="todos"||mesDe(t.fecha)===filtroMesHist)&&
    (!filtroProductoHist||(t.nombre_producto||"").toLowerCase().includes(filtroProductoHist.toLowerCase()))
  );
  const kgDisponiblesTostar=listosParaTostar.filter(r=>r.kg>0).reduce((s,r)=>s+r.kg,0);
  const valorDisponiblesTostar=listosParaTostar.filter(r=>r.kg>0).reduce((s,r)=>s+r.kg*(r.valorUnit||0),0);
  const valorTotalTostado=blendsTostado.filter(t=>t.kg_cafe_tostado>0).reduce((s,t)=>s+(t.valor_total||0),0);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{color:C.navy,fontSize:15,fontWeight:700}}>Registros de Tueste</div>
      <button style={{...S.btn,background:C.orange}} onClick={abrirNuevo}>+ Nuevo Lote Tostado</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Kg Disponibles a Tostar" value={fmt(kgDisponiblesTostar,1)+" kg"} col={C.navy}/>
      <KPI label="Valor Kg Disponibles" value={fmtCOP(valorDisponiblesTostar)} col={C.orange}/>
      <KPI label="Valor Total Tostado" value={fmtCOP(valorTotalTostado)} col={C.purple}/>
      <KPI label="kg Cafe Tostado" value={fmt(totalKgTostado,1)+" kg"} col={C.green}/>
      <KPI label="Rendimiento Prom." value={rendProm+"%"} col={C.gold}/>
    </div>
    {(pendientes.length>0||poolDirecto.length>0)&&(<div style={{...S.card,marginBottom:16,borderLeft:"3px solid "+C.orange}}>
      <div style={{fontWeight:700,fontSize:13,color:C.orange,marginBottom:12}}>Lotes Listos para Tostar ({pendientes.length+poolDirecto.length})</div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={filtroProductoListos} onChange={e=>setFiltroProductoListos(e.target.value)} placeholder="Buscar por producto..." style={{...S.input,width:"auto",flex:1,minWidth:180,fontSize:12,padding:"6px 10px"}}/>
        <select value={filtroMesListos} onChange={e=>setFiltroMesListos(e.target.value)} style={{...S.select,width:"auto",minWidth:130,fontSize:12,padding:"6px 10px"}}>
          <option value="todos">Todos los meses</option>
          {mesesListos.map(m=>(<option key={m} value={m} style={{textTransform:"capitalize"}}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>))}
        </select>
        <select value={filtroStockListos} onChange={e=>setFiltroStockListos(e.target.value)} style={{...S.select,width:"auto",minWidth:140,fontSize:12,padding:"6px 10px"}}>
          <option value="todos">Todos los lotes</option>
          <option value="con_stock">Con Stock (&gt;0)</option>
          <option value="consumido">Consumidos (=0)</option>
        </select>
        {(filtroProductoListos||filtroMesListos!=="todos"||filtroStockListos!=="todos")&&<button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroProductoListos("");setFiltroMesListos("todos");setFiltroStockListos("todos");}}>✕ Limpiar</button>}
        <span style={{fontSize:11,color:C.textFaint}}>{listosFiltrados.length} de {listosParaTostar.length}</span>
      </div>
      {(filtroProductoListos||filtroMesListos!=="todos"||filtroStockListos!=="todos")&&(()=>{
        const sumKg=listosFiltrados.reduce((s,r)=>s+(r.kg||0),0);
        const sumValor=listosFiltrados.reduce((s,r)=>s+(r.kg||0)*(r.valorUnit||0),0);
        return(<div style={{...S.card,display:"flex",gap:24,alignItems:"center",marginBottom:12,background:C.tealBg||C.bg}}>
          <div><div style={{fontSize:11,color:C.textDim,textTransform:"uppercase"}}>Kg (filtrado)</div><div style={{fontSize:18,fontWeight:700,color:C.navy}}>{fmt(sumKg,1)} kg</div></div>
          <div><div style={{fontSize:11,color:C.textDim,textTransform:"uppercase"}}>Valor Total (filtrado)</div><div style={{fontSize:18,fontWeight:700,color:C.gold}}>{fmtCOP(sumValor)}</div></div>
        </div>);
      })()}
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["Codigo","Producto","Tipo","Mes","kg","Valor/kg","Origen","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{listosFiltrados.map(r=>(<tr key={r.id}>
          <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.orange,fontSize:11}}>{r.codigo}</td>
          <td style={{...S.td,fontWeight:600}}>{r.producto}</td>
          <td style={S.td}>{r.tipo==="pendiente"?<Bdg label="Pendiente" col={C.orange} bg={C.orangeBg}/>:(r.kg<=0?<Bdg label="Consumido" col={C.textDim} bg={C.bg}/>:<Bdg label="Pool Directo" col={C.teal} bg={C.tealBg}/>)}</td>
          <td style={{...S.td,textTransform:"capitalize"}}>{r.mes||"—"}</td>
          <td style={{...S.td,color:C.accent,fontWeight:700}}>{fmt(r.kg,1)} kg</td>
          <td style={{...S.td,color:C.gold}}>{r.valorUnit>0?fmtCOP(r.valorUnit):"—"}</td>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{r.origenLabel}</td>
          <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {r.tipo==="pendiente"?(<>
              <button style={{...S.btn,background:C.orange,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirEditar(r._raw)}>Registrar Tueste</button>
              <button style={{...S.btnG,fontSize:11,padding:"6px 10px",color:C.red,borderColor:C.red+"60"}} onClick={()=>eliminarTueste(r._raw)}>Eliminar</button>
            </>):(<>
              <button style={{...S.btn,background:r.kg>0?C.orange:C.textFaint,fontSize:11,padding:"6px 10px",cursor:r.kg>0?"pointer":"not-allowed"}} disabled={r.kg<=0} onClick={()=>r.kg>0&&abrirDirecto(r._raw)}>Iniciar Batch</button>
              {r._raw.kg_consumido===0&&<button style={{...S.btnG,fontSize:11,padding:"6px 10px",color:C.red,borderColor:C.red+"60"}} onClick={()=>revertirSalidaDirecta(r._raw)}>Revertir</button>}
            </>)}
          </div></td>
        </tr>))}</tbody>
      </table></TablaScrollV>
      {listosFiltrados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin lotes que coincidan con el filtro.</div>}
    </div>)}
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historial de Tuestes</div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={filtroProductoHist} onChange={e=>setFiltroProductoHist(e.target.value)} placeholder="Buscar por producto..." style={{...S.input,width:"auto",flex:1,minWidth:180,fontSize:12,padding:"6px 10px"}}/>
        <select value={filtroMesHist} onChange={e=>setFiltroMesHist(e.target.value)} style={{...S.select,width:"auto",minWidth:130,fontSize:12,padding:"6px 10px"}}>
          <option value="todos">Todos los meses</option>
          {mesesHist.map(m=>(<option key={m} value={m} style={{textTransform:"capitalize"}}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>))}
        </select>
        {(filtroProductoHist||filtroMesHist!=="todos")&&<button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroProductoHist("");setFiltroMesHist("todos");}}>✕ Limpiar</button>}
        <span style={{fontSize:11,color:C.textFaint}}>{historicoFiltrado.length} de {historico.length}</span>
      </div>
      {(filtroProductoHist||filtroMesHist!=="todos")&&(()=>{
        const sumKg=historicoFiltrado.reduce((s,t)=>s+(t.kg_cafe_tostado||0),0);
        const sumValor=historicoFiltrado.reduce((s,t)=>s+(t.valor_total||0),0);
        return(<div style={{...S.card,display:"flex",gap:24,alignItems:"center",marginBottom:12,background:C.tealBg||C.bg}}>
          <div><div style={{fontSize:11,color:C.textDim,textTransform:"uppercase"}}>Kg Tostados (filtrado)</div><div style={{fontSize:18,fontWeight:700,color:C.navy}}>{fmt(sumKg,1)} kg</div></div>
          <div><div style={{fontSize:11,color:C.textDim,textTransform:"uppercase"}}>Valor Total (filtrado)</div><div style={{fontSize:18,fontWeight:700,color:C.gold}}>{fmtCOP(sumValor)}</div></div>
        </div>);
      })()}
      <TablaScrollV minWidth={1500}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1500}}><thead><tr>{["Codigo","Fecha","Mes","Producto","Trazabilidad","kg a Tostar","Valor Unit.","Valor Total","N° Baches","Tipo Tostión","kg Tostado","Valor/kg Tostado","Rend.","Stock Granel","Catacion","Responsable","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{historicoFiltrado.map(t=>{const stock=stockGranel(t);const vkgTostado=t.valor_unitario_tostado||(t.kg_cafe_tostado&&t.valor_total?Math.round(t.valor_total/t.kg_cafe_tostado):null);return(<tr key={t.id}>
        <td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{t.codigo||"-"}</td>
        <td style={{...S.td,color:C.textDim}}>{fmtFecha(t.fecha)}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{mesDe(t.fecha)}</td>
        <td style={{...S.td,fontWeight:600}}>{t.nombre_producto||"-"}</td>
        <td style={S.td}><div style={{display:"flex",flexDirection:"column",gap:2,fontSize:10}}>
          {(t.fuentes||[]).length>1?t.fuentes.map((f,i)=>(<span key={i} style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{f.blendCodigo}: {fmt(f.kg_tomados,1)} kg</span>)):(t.codigo_lote_origen&&<span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>Lote: {t.codigo_lote_origen}</span>)}
          {t.fecha_proceso&&<span style={{color:C.textDim}}>Proceso: {fmtFecha(t.fecha_proceso)}</span>}
          {t.fecha_trilla&&<span style={{color:C.textDim}}>Trilla: {fmtFecha(t.fecha_trilla)}</span>}
          {t.fecha_secado&&<span style={{color:C.textDim}}>Secado: {fmtFecha(t.fecha_secado)}</span>}
          {(t.lotes_blend||[]).length>0&&<span style={{color:C.purple}}>Blend: {t.lotes_blend.join(", ")}</span>}
          {!t.codigo_lote_origen&&!t.fecha_proceso&&!t.fecha_trilla&&!t.fecha_secado&&!(t.lotes_blend||[]).length&&"-"}
        </div></td>
        <td style={{...S.td,color:C.accent,fontWeight:600}}>{fmt(t.kg_a_tostar,1)} kg</td>
        <td style={{...S.td,color:C.gold}}>{fmtCOP(t.valor_unitario)}</td>
        <td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(t.valor_total)}</td>
        <td style={S.td}>{t.numero_baches||"-"}</td>
        <td style={S.td}><Bdg label={t.tipo_tostion||"-"} col={C.orange} bg={C.orangeBg}/></td>
        <td style={{...S.td,color:C.green,fontWeight:700}}>{t.kg_cafe_tostado?fmt(t.kg_cafe_tostado,1)+" kg":<Bdg label="Pendiente" col={C.orange} bg={C.orangeBg}/>}</td>
        <td style={{...S.td,color:C.purple,fontWeight:700}}>{vkgTostado?fmtCOP(vkgTostado):<span style={{color:C.textFaint}}>—</span>}</td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{t.kg_a_tostar&&t.kg_cafe_tostado?((t.kg_cafe_tostado/t.kg_a_tostar)*100).toFixed(1)+"%":"-"}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.textFaint,fontWeight:700}}>{fmt(stock,1)} kg</span></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.catacion||"-"}</td>
        <td style={S.td}>{t.responsable||"-"}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{t.kg_cafe_tostado>0&&<button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaUBA(t)}>+ Salida</button>}<button style={{...S.btnG,fontSize:11,...(!t.kg_cafe_tostado?{color:C.orange,borderColor:C.orange+"60",fontWeight:700}:{})}} onClick={()=>abrirEditar(t)}>{t.kg_cafe_tostado?"Editar":"Completar"}</button><button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"60"}} onClick={()=>eliminarTueste(t)}>Eliminar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {historicoFiltrado.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{historico.length===0?"Sin tuestes registrados todavia.":"Ningun tueste coincide con el filtro."}</div>}
    </div>
    {modalSalidaUBA&&selTost&&(<Modal title={"Salida Granel / Muestra - "+selTost.codigo} onClose={()=>{setModalSalidaUBA(false);setErrSalidaUBA("");}}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selTost.codigo} - {selTost.nombre_producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockGranel(selTost),1)} kg</b></div>
      </div>
      {errSalidaUBA&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalidaUBA}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalidaUBA.fecha} onChange={e=>setFormSalidaUBA(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Salida" half><input style={S.input} type="number" value={formSalidaUBA.peso_salida} onChange={e=>{setFormSalidaUBA(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+p.valor_kg||0)||""}));setErrSalidaUBA("");}}/></Fld>
        <Fld label="Valor por kg COP" half><input style={S.input} type="number" value={formSalidaUBA.valor_kg} onChange={e=>setFormSalidaUBA(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+p.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total COP" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={formSalidaUBA.valor_total} onChange={e=>setFormSalidaUBA(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalidaUBA.cliente} destinoKey={formSalidaUBA.destino_key} onChange={(v,k)=>setFormSalidaUBA(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formSalidaUBA.observaciones} onChange={e=>setFormSalidaUBA(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModalSalidaUBA(false)}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaUBA}>Registrar Salida</button></div>
    </Modal>)}
    {modal&&(<Modal title={editId?"Completar / Editar Tueste":"Nuevo Lote Tostado"} onClose={()=>setModal(false)} wide>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Nombre Producto Comercial" half><input style={S.input} value={form.nombre_producto} onChange={e=>setForm(p=>({...p,nombre_producto:e.target.value}))}/></Fld>
        <Fld label="Codigo de Lote Origen" half><input style={S.input} value={form.codigo_lote_origen} onChange={e=>setForm(p=>({...p,codigo_lote_origen:e.target.value}))}/></Fld>
        {(form.fecha_proceso||form.fecha_trilla||form.fecha_secado)&&(<div style={{width:"100%",background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:8,fontSize:12,display:"flex",gap:16,flexWrap:"wrap"}}>
          <span style={{color:C.textDim,fontWeight:600}}>Trazabilidad:</span>
          {form.fecha_proceso&&<span style={{color:C.textDim}}>Proceso: <b>{fmtFecha(form.fecha_proceso)}</b></span>}
          {form.fecha_trilla&&<span style={{color:C.textDim}}>Trilla: <b>{fmtFecha(form.fecha_trilla)}</b></span>}
          {form.fecha_secado&&<span style={{color:C.textDim}}>Secado: <b>{fmtFecha(form.fecha_secado)}</b></span>}
        </div>)}
        {(form.fuentes.length>0||poolDirecto.filter(p=>!form.fuentes.some(f=>f.salidaId===p.salidaId)).length>0)&&(<div style={{width:"100%",background:C.panel,borderRadius:8,border:"1px solid "+C.border,padding:"12px 14px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:13,color:C.navy}}>Lotes de Origen del Tueste</div>
            {form.fuentes.length>1&&<div style={{color:C.green,fontWeight:700,fontSize:12}}>Total: {fmt(form.fuentes.reduce((s,f)=>s+(+f.kg_tomados||0),0),1)} kg · {fmtCOP(form.fuentes.reduce((s,f)=>s+(f.valor_total_fuente||0),0))}</div>}
          </div>
          {form.fuentes.map((f,i)=>(<div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,background:C.purpleBg,borderRadius:6,padding:"8px 10px",border:"1px solid "+C.purple+"30"}}>
            <div style={{flex:1,minWidth:0}}><div style={{color:C.purple,fontWeight:700,fontSize:11,fontFamily:"monospace"}}>{f.blendCodigo}</div><div style={{color:C.textDim,fontSize:10,marginTop:1}}>{f.nombre_producto}</div></div>
            <input style={{...S.input,width:72,padding:"4px 6px",textAlign:"right"}} type="number" value={f.kg_tomados} onChange={e=>{const kg=e.target.value;const vt=Math.round((+kg||0)*(f.valor_unitario||0));setForm(p=>{const nf=[...p.fuentes];nf[i]={...f,kg_tomados:kg,valor_total_fuente:vt};const tk=nf.reduce((s,x)=>s+(+x.kg_tomados||0),0);const tv=nf.reduce((s,x)=>s+(x.valor_total_fuente||0),0);return{...p,fuentes:nf,kg_a_tostar:tk||"",valor_total:tv||"",valor_unitario:tk>0?Math.round(tv/tk):p.valor_unitario,codigo_lote_origen:nf.map(x=>x.blendCodigo).join(", ")};});}}/>
            <span style={{color:C.textDim,fontSize:11}}>kg</span>
            <span style={{color:C.gold,fontSize:10,minWidth:70,textAlign:"right"}}>{fmtCOP(f.valor_unitario)}/kg</span>
            <button style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontWeight:900,fontSize:15,padding:"0 4px",lineHeight:1}} onClick={()=>setForm(p=>{const nf=p.fuentes.filter((_,j)=>j!==i);const tk=nf.reduce((s,x)=>s+(+x.kg_tomados||0),0);const tv=nf.reduce((s,x)=>s+(x.valor_total_fuente||0),0);return{...p,fuentes:nf,...(nf.length>0?{kg_a_tostar:tk,valor_total:tv,valor_unitario:tk>0?Math.round(tv/tk):p.valor_unitario,codigo_lote_origen:nf.map(x=>x.blendCodigo).join(", ")}:{})};})}>×</button>
          </div>))}
          {poolDirecto.filter(p=>!form.fuentes.some(f=>f.salidaId===p.salidaId)).length>0&&(<div style={{marginTop:form.fuentes.length>0?8:0}}>
            {form.fuentes.length===0&&<div style={{color:C.textDim,fontSize:11,marginBottom:6}}>Selecciona lotes para agregar al tueste:</div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{poolDirecto.filter(p=>!form.fuentes.some(f=>f.salidaId===p.salidaId)).map(item=>(<button key={item.origen_tipo+"_"+item.salidaId} style={{...S.btnG,fontSize:11,color:C.accent,borderColor:C.accent+"60",padding:"5px 10px"}} onClick={()=>setForm(p=>{const vt=Math.round(item.kg_disponible*(item.valor_unitario||0));const nf=[...p.fuentes,{salidaId:item.salidaId,origen_tipo:item.origen_tipo,lote_id:item.lote_id,blendCodigo:item.lote_codigo,nombre_producto:item.nombre,kg_tomados:item.kg_disponible,valor_unitario:item.valor_unitario,valor_total_fuente:vt,lotes_blend:item.lotes_blend||[]}];const tk=nf.reduce((s,f)=>s+(+f.kg_tomados||0),0);const tv=nf.reduce((s,f)=>s+(f.valor_total_fuente||0),0);return{...p,fuentes:nf,kg_a_tostar:tk||"",valor_total:tv||"",valor_unitario:tk>0?Math.round(tv/tk):p.valor_unitario,codigo_lote_origen:nf.map(f=>f.blendCodigo).join(", ")};})}>+ {item.lote_codigo} · {fmt(item.kg_disponible,1)} kg</button>))}</div>
          </div>)}
        </div>)}
        <Fld label="kg a Tostar (este batch)" half>{form.fuentes.length>0?<div style={{...S.input,background:C.panel2,color:C.accent,fontWeight:700,display:"flex",alignItems:"center"}}>{fmt(+form.kg_a_tostar||0,1)} kg<span style={{color:C.textFaint,fontSize:10,marginLeft:8}}>{form.fuentes.length} {form.fuentes.length===1?"lote":"lotes"}</span></div>:<input style={S.input} type="number" value={form.kg_a_tostar} onChange={e=>setForm(p=>({...p,kg_a_tostar:e.target.value,valor_total:(+e.target.value||0)*(+p.valor_unitario||0)||""}))}/>}</Fld>
        <Fld label="Valor Unitario ($/kg)" half><input style={S.input} type="number" value={form.valor_unitario} onChange={e=>setForm(p=>({...p,valor_unitario:e.target.value,valor_total:(+form.kg_a_tostar||0)*(+e.target.value||0)||""}))}/></Fld>
        <Fld label="Valor Total" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={form.valor_total} onChange={e=>setForm(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N° de Baches"><input style={S.input} type="number" min="1" value={form.numero_baches} onChange={e=>setForm(p=>({...p,numero_baches:e.target.value}))}/></Fld>
        <Fld label="Tipo de Tueste" half><select style={S.select} value={form.tipo_tostion} onChange={e=>setForm(p=>({...p,tipo_tostion:e.target.value}))}>{TIPOS_TOSTION.map(t=>(<option key={t}>{t}</option>))}</select></Fld>
        <Fld label="kg Cafe Tostado (resultado)" half><input style={S.input} type="number" value={form.kg_cafe_tostado} onChange={e=>setForm(p=>({...p,kg_cafe_tostado:e.target.value}))}/>{form.kg_cafe_tostado&&form.kg_a_tostar&&<div style={{color:C.teal,fontSize:11,marginTop:4}}>Rendimiento: {((+form.kg_cafe_tostado/+form.kg_a_tostar)*100).toFixed(1)}%</div>}</Fld>
        <Fld label="Responsable" half><input style={S.input} value={form.responsable} onChange={e=>setForm(p=>({...p,responsable:e.target.value}))}/></Fld>
      </div>
      <Fld label="Catacion"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.catacion} onChange={e=>setForm(p=>({...p,catacion:e.target.value}))}/></Fld>
      {errReg&&<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:8,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errReg}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModal(false);setErrReg("");}}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={reg}>{editId?"Guardar Cambios":"Registrar Tueste"}</button></div>
    </Modal>)}
  </div>);
}
