import{useState,useMemo,useEffect}from"react";
import{C,S}from"../../theme";
import{TIPOS_TOSTION,MESES}from"../../data/constants";
import{fmtCOP,fmt,numVal,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{calcCostoTuesteMes}from"../../lib/costing";
import{Bdg,Fld,KPI,KPIDoble,Modal,TablaScrollV,SelectDestino}from"../ui";
import*as XLSX from"xlsx";
import{jsPDF}from"jspdf";
import autoTable from"jspdf-autotable";
export function TabTueste({blendsTostado,setBlendsTostado,blendsFino,lotesFino,setLotesFino,setBlendsFino,empaques,inventariosMensuales,setInventariosMensuales,costos}){
  const filaCampo=(label,children)=>(
    <tr>
      <td style={{border:"1px solid "+C.border,padding:"6px 10px",fontSize:12,color:C.text,width:"38%",background:C.panel2,fontWeight:600}}>{label}</td>
      <td style={{border:"1px solid "+C.border,padding:2}}>{children}</td>
    </tr>
  );
  const [subTabTueste,setSubTabTueste]=useState("listos");
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
  const listosFiltrados=listosParaTostar.filter(r=>{
    const q=filtroProductoListos.toLowerCase();
    const coincide=!q||r.producto.toLowerCase().includes(q)||(r.codigo||"").toLowerCase().includes(q)||(r.origenLabel||"").toLowerCase().includes(q);
    return (filtroMesListos==="todos"||r.mes===filtroMesListos)&&coincide&&(filtroStockListos==="todos"||(filtroStockListos==="con_stock"?r.kg>0:r.kg<=0));
  });
  const [filtroProductoHist,setFiltroProductoHist]=useState("");
  const [filtroMesHist,setFiltroMesHist]=useState("todos");
  const [filtroProductoSelectHist,setFiltroProductoSelectHist]=useState("todos");
  const historico=blendsTostado.filter(t=>t.kg_cafe_tostado>0);
  const mesesHist=[...new Set(historico.map(t=>mesDe(t.fecha)).filter(Boolean))];
  const productosHist=[...new Set(historico.map(t=>t.nombre_producto).filter(Boolean))];
  const historicoFiltrado=historico.filter(t=>{
    const q=filtroProductoHist.toLowerCase();
    const coincide=!q||(t.nombre_producto||"").toLowerCase().includes(q)||(t.codigo_lote_origen||"").toLowerCase().includes(q)||(t.codigo||"").toLowerCase().includes(q);
    return (filtroMesHist==="todos"||mesDe(t.fecha)===filtroMesHist)&&coincide&&(filtroProductoSelectHist==="todos"||t.nombre_producto===filtroProductoSelectHist);
  });
  const kgDisponiblesTostar=listosParaTostar.filter(r=>r.kg>0).reduce((s,r)=>s+r.kg,0);
  const valorDisponiblesTostar=listosParaTostar.filter(r=>r.kg>0).reduce((s,r)=>s+r.kg*(r.valorUnit||0),0);
  const valorTotalTostado=blendsTostado.filter(t=>t.kg_cafe_tostado>0).reduce((s,t)=>s+(t.valor_total||0),0);
  const semaforoDe=(pct)=>{const a=Math.abs(pct);if(a<=2)return"verde";if(a<=5)return"amarillo";return"rojo";};
  const SEM_COL={verde:C.green,amarillo:C.gold,rojo:C.red};
  const SEM_BG={verde:C.greenBg,amarillo:C.goldBg,rojo:C.redBg};
  const SEM_LABEL={verde:"OK",amarillo:"Revisar",rojo:"Critico"};
  const [modalNuevoInvMP,setModalNuevoInvMP]=useState(false);
  const [formNuevoInvMP,setFormNuevoInvMP]=useState({fecha_conteo:today(),usuario_conteo:""});
  const [selInvMPId,setSelInvMPId]=useState(null);
  const inventariosMP=(inventariosMensuales||[]).filter(i=>i.modulo==="uba_tostado_pendiente");
  const invActivoMP=inventariosMP.find(i=>i.id===selInvMPId)||null;
  const [detalleLocalMP,setDetalleLocalMP]=useState(null);
  useEffect(()=>{setDetalleLocalMP(invActivoMP?invActivoMP.detalle:null);},[invActivoMP?.id]);
  const guardarDetalleMP=()=>{
    if(!invActivoMP||!detalleLocalMP)return;
    setInventariosMensuales(p=>p.map(x=>x.id===invActivoMP.id?{...x,detalle:detalleLocalMP}:x));
  };
  const crearInventarioMP=()=>{
    if(!formNuevoInvMP.fecha_conteo||!formNuevoInvMP.usuario_conteo.trim())return;
    const detalle=pendientes.map(t=>({pendiente_id:t.id,codigo:t.codigo,producto:t.nombre_producto||"",stock_teorico:t.kg_a_tostar||0,stock_fisico:null,diferencia_kg:0,diferencia_pct:0,estado_semaforo:null,nota_justificacion:"",fecha_conteo:formNuevoInvMP.fecha_conteo}));
    const nuevo={id:genId(),modulo:"uba_tostado_pendiente",mes:mesDe(formNuevoInvMP.fecha_conteo),anio:new Date(formNuevoInvMP.fecha_conteo+"T00:00:00").getFullYear(),seccion:"uba_tostado_pendiente",fecha_conteo:formNuevoInvMP.fecha_conteo,usuario_conteo:formNuevoInvMP.usuario_conteo.trim(),estado:"borrador",detalle};
    setInventariosMensuales(p=>[nuevo,...(p||[])]);
    setSelInvMPId(nuevo.id);
    setModalNuevoInvMP(false);
    setFormNuevoInvMP({fecha_conteo:today(),usuario_conteo:""});
  };
  const actualizarDetalleInvMP=(pendienteId,campo,valor)=>{
    setDetalleLocalMP(prev=>(prev||[]).map(d=>{
      if(d.pendiente_id!==pendienteId)return d;
      if(campo==="stock_fisico"){
        const sf=valor===""?null:+valor;
        const dif=sf!=null?sf-d.stock_teorico:0;
        const pct=sf!=null&&d.stock_teorico>0?(dif/d.stock_teorico)*100:0;
        return{...d,stock_fisico:sf,diferencia_kg:dif,diferencia_pct:pct,estado_semaforo:sf!=null?semaforoDe(pct):null};
      }
      return{...d,[campo]:valor};
    }));
  };
  const cerrarInventarioMP=(inv)=>{
    const pend=inv.detalle.filter(d=>d.stock_fisico==null);
    if(pend.length>0){alert("Faltan "+pend.length+" registro(s) por contar antes de cerrar.");return;}
    const sinJustificar=inv.detalle.filter(d=>d.estado_semaforo!=="verde"&&!d.nota_justificacion?.trim());
    if(sinJustificar.length>0){alert("Hay "+sinJustificar.length+" registro(s) con diferencia significativa sin nota de justificacion.");return;}
    if(!window.confirm("¿Cerrar este inventario? Se corregira el kg reservado de cada registro al valor contado, y ya no se podra editar salvo que lo reabras."))return;
    const fechaCierre=today();
    const correcciones={};
    inv.detalle.forEach(d=>{if(d.stock_fisico!=null)correcciones[d.pendiente_id]=d.stock_fisico;});
    setBlendsTostado(p=>p.map(t=>(t.id in correcciones)?{...t,kg_a_tostar:correcciones[t.id]}:t));
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,detalle:inv.detalle,estado:"cerrado",fecha_cierre:fechaCierre}:x));
  };
  const reabrirInventarioMP=(inv)=>{
    if(!window.confirm("Este inventario ya corrigio los kg reservados. Reabrir y volver a cerrar aplicara la nueva correccion sobre el valor actual (no la original). ¿Continuar?"))return;
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,estado:"borrador"}:x));
  };
  const [modalNuevoInvVT,setModalNuevoInvVT]=useState(false);
  const [formNuevoInvVT,setFormNuevoInvVT]=useState({fecha_conteo:today(),usuario_conteo:""});
  const [selInvVTId,setSelInvVTId]=useState(null);
  const inventariosVT=(inventariosMensuales||[]).filter(i=>i.modulo==="uba_tostado_granel");
  const invActivoVT=inventariosVT.find(i=>i.id===selInvVTId)||null;
  const [detalleLocalVT,setDetalleLocalVT]=useState(null);
  useEffect(()=>{setDetalleLocalVT(invActivoVT?invActivoVT.detalle:null);},[invActivoVT?.id]);
  const guardarDetalleVT=()=>{
    if(!invActivoVT||!detalleLocalVT)return;
    setInventariosMensuales(p=>p.map(x=>x.id===invActivoVT.id?{...x,detalle:detalleLocalVT}:x));
  };
  const crearInventarioVT=()=>{
    if(!formNuevoInvVT.fecha_conteo||!formNuevoInvVT.usuario_conteo.trim())return;
    const detalle=historico.map(t=>({tueste_id:t.id,codigo:t.codigo,producto:t.nombre_producto||"",stock_teorico:stockGranel(t),stock_fisico:null,diferencia_kg:0,diferencia_pct:0,estado_semaforo:null,nota_justificacion:"",fecha_conteo:formNuevoInvVT.fecha_conteo}));
    const nuevo={id:genId(),modulo:"uba_tostado_granel",mes:mesDe(formNuevoInvVT.fecha_conteo),anio:new Date(formNuevoInvVT.fecha_conteo+"T00:00:00").getFullYear(),seccion:"uba_tostado_granel",fecha_conteo:formNuevoInvVT.fecha_conteo,usuario_conteo:formNuevoInvVT.usuario_conteo.trim(),estado:"borrador",detalle};
    setInventariosMensuales(p=>[nuevo,...(p||[])]);
    setSelInvVTId(nuevo.id);
    setModalNuevoInvVT(false);
    setFormNuevoInvVT({fecha_conteo:today(),usuario_conteo:""});
  };
  const actualizarDetalleInvVT=(tuesteId,campo,valor)=>{
    setDetalleLocalVT(prev=>(prev||[]).map(d=>{
      if(d.tueste_id!==tuesteId)return d;
      if(campo==="stock_fisico"){
        const sf=valor===""?null:+valor;
        const dif=sf!=null?sf-d.stock_teorico:0;
        const pct=sf!=null&&d.stock_teorico>0?(dif/d.stock_teorico)*100:0;
        return{...d,stock_fisico:sf,diferencia_kg:dif,diferencia_pct:pct,estado_semaforo:sf!=null?semaforoDe(pct):null};
      }
      return{...d,[campo]:valor};
    }));
  };
  const cerrarInventarioVT=(inv)=>{
    const pend=inv.detalle.filter(d=>d.stock_fisico==null);
    if(pend.length>0){alert("Faltan "+pend.length+" tueste(s) por contar antes de cerrar.");return;}
    const sinJustificar=inv.detalle.filter(d=>d.estado_semaforo!=="verde"&&!d.nota_justificacion?.trim());
    if(sinJustificar.length>0){alert("Hay "+sinJustificar.length+" tueste(s) con diferencia significativa sin nota de justificacion.");return;}
    if(!window.confirm("¿Cerrar este inventario? Se generara un ajuste de stock para cada tueste con diferencia."))return;
    const fechaCierre=today();
    const mesNum=String(new Date(inv.fecha_conteo+"T00:00:00").getMonth()+1).padStart(2,"0");
    const factura="AJUSTE-INV-"+mesNum+"-"+inv.anio;
    const ajustesPorTueste={};
    inv.detalle.forEach(d=>{if(d.diferencia_kg!==0)ajustesPorTueste[d.tueste_id]=d.diferencia_kg;});
    setBlendsTostado(p=>p.map(t=>{
      const salidasSinAjusteViejo=(t.salidas||[]).filter(s=>!(s.destino_key==="ajuste_inventario"&&s.factura===factura));
      if(!(t.id in ajustesPorTueste))return{...t,salidas:salidasSinAjusteViejo};
      const pesoAjuste=-ajustesPorTueste[t.id];
      const nuevaSalida={id:genId(),fecha:fechaCierre,factura,cliente:"Ajuste de Inventario",destino_key:"ajuste_inventario",peso_salida:pesoAjuste,valor_kg:0,valor_total:0};
      return{...t,salidas:[...salidasSinAjusteViejo,nuevaSalida]};
    }));
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,detalle:inv.detalle,estado:"cerrado",fecha_cierre:fechaCierre}:x));
  };
  const reabrirInventarioVT=(inv)=>{
    if(!window.confirm("Este inventario ya genero un ajuste de stock. Reabrir y volver a cerrar REEMPLAZARA ese ajuste por el nuevo resultado del conteo. ¿Continuar?"))return;
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,estado:"borrador"}:x));
  };
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{color:C.navy,fontSize:15,fontWeight:700}}>Registros de Tueste</div>
      <button style={{...S.btn,background:C.orange}} onClick={abrirNuevo}>+ Nuevo Lote Tostado</button>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"1px solid "+C.border}}>
      <button style={{border:"none",borderBottom:subTabTueste==="listos"?"2px solid "+C.orange:"2px solid transparent",borderRadius:0,background:"transparent",padding:"10px 16px",fontSize:13,fontWeight:600,color:subTabTueste==="listos"?C.orange:C.textDim,cursor:"pointer"}} onClick={()=>setSubTabTueste("listos")}>Inventario de Materia Prima</button>
      <button style={{border:"none",borderBottom:subTabTueste==="historial"?"2px solid "+C.orange:"2px solid transparent",borderRadius:0,background:"transparent",padding:"10px 16px",fontSize:13,fontWeight:600,color:subTabTueste==="historial"?C.orange:C.textDim,cursor:"pointer"}} onClick={()=>setSubTabTueste("historial")}>Historial de Tuestes</button>
    </div>
    {subTabTueste==="listos"&&(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Kg Disponibles a Tostar" value={fmt(kgDisponiblesTostar,1)+" kg"} col={C.navy}/>
      <KPI label="Valor Kg Disponibles" value={fmtCOP(valorDisponiblesTostar)} col={C.orange}/>
    </div>)}
    {subTabTueste==="historial"&&(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Valor Total Tostado" value={fmtCOP(valorTotalTostado)} col={C.purple}/>
      <KPI label="kg Cafe Tostado" value={fmt(totalKgTostado,1)+" kg"} col={C.green}/>
      <KPI label="Rendimiento Prom." value={rendProm+"%"} col={C.gold}/>
    </div>)}
    {subTabTueste==="listos"&&(<>
    {(pendientes.length>0||poolDirecto.length>0)&&(<div style={{...S.card,marginBottom:16,borderLeft:"3px solid "+C.orange}}>
      <div style={{fontWeight:700,fontSize:13,color:C.orange,marginBottom:12}}>Lotes Listos para Tostar ({pendientes.length+poolDirecto.length})</div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={filtroProductoListos} onChange={e=>setFiltroProductoListos(e.target.value)} placeholder="Buscar por producto o código..." style={{...S.input,width:"auto",flex:1,minWidth:180,fontSize:12,padding:"6px 10px"}}/>
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
    <div style={{...S.card,marginTop:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Inventario Mensual — Materia Prima Pendiente</div>
        <button style={S.btn} onClick={()=>{setSelInvMPId(null);setModalNuevoInvMP(true);}}>+ Nuevo Conteo</button>
      </div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["Fecha","Responsable","Estado","Registros",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{inventariosMP.map(inv=>(<tr key={inv.id}>
          <td style={S.td}>{fmtFecha(inv.fecha_conteo)}</td>
          <td style={S.td}>{inv.usuario_conteo}</td>
          <td style={S.td}><Bdg label={inv.estado==="cerrado"?"Cerrado":"Borrador"} col={inv.estado==="cerrado"?C.green:C.gold} bg={inv.estado==="cerrado"?C.greenBg:C.goldBg}/></td>
          <td style={S.td}>{inv.detalle.length}</td>
          <td style={S.td}><button style={S.btnG} onClick={()=>setSelInvMPId(inv.id)}>{inv.estado==="cerrado"?"Ver":"Continuar"}</button></td>
        </tr>))}</tbody>
      </table></TablaScrollV>
      {inventariosMP.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin conteos registrados todavia.</div>}
      {invActivoMP&&detalleLocalMP&&(()=>{
        const bloqueado=invActivoMP.estado==="cerrado";
        return(<div style={{marginTop:16,borderTop:"1px solid "+C.border,paddingTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:700,color:C.navy}}>Detalle del conteo — {fmtFecha(invActivoMP.fecha_conteo)}</div>
            {bloqueado?(<button style={S.btnG} onClick={()=>reabrirInventarioMP(invActivoMP)}>Reabrir</button>):(<button style={{...S.btn,background:C.green}} onClick={()=>cerrarInventarioMP({...invActivoMP,detalle:detalleLocalMP})}>Cerrar Inventario</button>)}
          </div>
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Codigo","Producto","Teorico","Fisico","Dif. kg","Dif. %","Estado","Nota"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
            <tbody>{detalleLocalMP.map(d=>(<tr key={d.pendiente_id}>
              <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{d.codigo}</td>
              <td style={S.td}>{d.producto}</td>
              <td style={S.td}>{fmt(d.stock_teorico)} kg</td>
              <td style={S.td}>{bloqueado?fmt(d.stock_fisico)+" kg":<input type="number" style={{...S.input,width:90}} value={d.stock_fisico??""} onChange={e=>actualizarDetalleInvMP(d.pendiente_id,"stock_fisico",e.target.value)} onBlur={guardarDetalleMP}/>}</td>
              <td style={S.td}>{d.stock_fisico!=null?fmt(d.diferencia_kg):"—"}</td>
              <td style={S.td}>{d.stock_fisico!=null?d.diferencia_pct.toFixed(1)+"%":"—"}</td>
              <td style={S.td}>{d.estado_semaforo&&<Bdg label={SEM_LABEL[d.estado_semaforo]} col={SEM_COL[d.estado_semaforo]} bg={SEM_BG[d.estado_semaforo]}/>}</td>
              <td style={S.td}>{bloqueado?(d.nota_justificacion||"—"):<input style={{...S.input,width:140}} value={d.nota_justificacion} onChange={e=>actualizarDetalleInvMP(d.pendiente_id,"nota_justificacion",e.target.value)} onBlur={guardarDetalleMP}/>}</td>
            </tr>))}</tbody>
          </table></TablaScrollV>
        </div>);
      })()}
      {modalNuevoInvMP&&(<Modal title="Nuevo Conteo — Materia Prima Pendiente" onClose={()=>setModalNuevoInvMP(false)}>
        <Fld label="Fecha de Conteo" half><input style={S.input} type="date" value={formNuevoInvMP.fecha_conteo} onChange={e=>setFormNuevoInvMP(p=>({...p,fecha_conteo:e.target.value}))}/></Fld>
        <Fld label="Responsable del Conteo" half><input style={S.input} value={formNuevoInvMP.usuario_conteo} onChange={e=>setFormNuevoInvMP(p=>({...p,usuario_conteo:e.target.value}))}/></Fld>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
          <button style={S.btnG} onClick={()=>setModalNuevoInvMP(false)}>Cancelar</button>
          <button style={S.btn} onClick={crearInventarioMP}>Crear e Iniciar Conteo</button>
        </div>
      </Modal>)}
    </div>
    </>)}
    {subTabTueste==="historial"&&(<>
    <div style={{...S.card,marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>Costo Tueste por Mes</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr>{["Mes","Costos Tueste","kg Tostados","Costo Tueste / kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{MESES.filter(m=>{const ct=(costos||[]).filter(c=>c.centro==="Tostado"&&c.mes===m).reduce((s,c)=>s+c.valor,0);return ct>0;}).map(m=>{
        const{costosTueste:ct,kgTostado:kt,costoTuesteKg:ck}=calcCostoTuesteMes(m,costos,historico);
        return(<tr key={m}><td style={{...S.td,textTransform:"capitalize",fontWeight:600}}>{m}</td><td style={{...S.td,color:C.orange,fontWeight:600}}>{fmtCOP(ct)}</td><td style={{...S.td,color:C.green,fontWeight:600}}>{fmt(kt,1)} kg</td><td style={{...S.td,color:C.purple,fontWeight:700,fontSize:14}}>{kt>0?fmtCOP(Math.round(ck)):"Sin tueste registrado"}</td></tr>);
      })}</tbody></table></TablaScrollV>
      {(costos||[]).filter(c=>c.centro==="Tostado").length===0&&<div style={{color:C.textFaint,fontSize:12,padding:8}}>Registra costos del centro "Tostado" en el modulo de Costos para ver este calculo.</div>}
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historial de Tuestes</div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={filtroProductoHist} onChange={e=>setFiltroProductoHist(e.target.value)} placeholder="Buscar por producto o código..." style={{...S.input,width:"auto",flex:1,minWidth:180,fontSize:12,padding:"6px 10px"}}/>
        <select value={filtroMesHist} onChange={e=>setFiltroMesHist(e.target.value)} style={{...S.select,width:"auto",minWidth:130,fontSize:12,padding:"6px 10px"}}>
          <option value="todos">Todos los meses</option>
          {mesesHist.map(m=>(<option key={m} value={m} style={{textTransform:"capitalize"}}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>))}
        </select>
        <select value={filtroProductoSelectHist} onChange={e=>setFiltroProductoSelectHist(e.target.value)} style={{...S.select,width:"auto",minWidth:150,fontSize:12,padding:"6px 10px"}}>
          <option value="todos">Todos los productos</option>
          {productosHist.map(p=>(<option key={p} value={p}>{p}</option>))}
        </select>
        {(filtroProductoHist||filtroMesHist!=="todos"||filtroProductoSelectHist!=="todos")&&<button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroProductoHist("");setFiltroMesHist("todos");setFiltroProductoSelectHist("todos");}}>✕ Limpiar</button>}
        <span style={{fontSize:11,color:C.textFaint}}>{historicoFiltrado.length} de {historico.length}</span>
      </div>
      {(filtroProductoHist||filtroMesHist!=="todos"||filtroProductoSelectHist!=="todos")&&(()=>{
        const sumKg=historicoFiltrado.reduce((s,t)=>s+(t.kg_cafe_tostado||0),0);
        const sumValor=historicoFiltrado.reduce((s,t)=>s+(t.valor_total||0),0);
        return(<div style={{...S.card,display:"flex",gap:24,alignItems:"center",marginBottom:12,background:C.tealBg||C.bg}}>
          <div><div style={{fontSize:11,color:C.textDim,textTransform:"uppercase"}}>Kg Tostados (filtrado)</div><div style={{fontSize:18,fontWeight:700,color:C.navy}}>{fmt(sumKg,1)} kg</div></div>
          <div><div style={{fontSize:11,color:C.textDim,textTransform:"uppercase"}}>Valor Total (filtrado)</div><div style={{fontSize:18,fontWeight:700,color:C.gold}}>{fmtCOP(sumValor)}</div></div>
        </div>);
      })()}
      <TablaScrollV minWidth={1500}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1500}}><thead><tr>{["Codigo","Fecha","Mes","Producto","Trazabilidad","kg a Tostar","Valor Unit.","Valor Total","N° Baches","Tipo Tostión","kg Tostado","Costo Materia Prima /kg","Costo Tueste /kg","Costo Total Tostado /kg","Rend.","Stock Granel","Catacion","Responsable","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{historicoFiltrado.map(t=>{const stock=stockGranel(t);const vkgTostado=t.valor_unitario_tostado||(t.kg_cafe_tostado&&t.valor_total?Math.round(t.valor_total/t.kg_cafe_tostado):null);const costoTuesteKg=t.kg_cafe_tostado>0?calcCostoTuesteMes(mesDe(t.fecha),costos,historico).costoTuesteKg:0;const costoTotalTostado=(vkgTostado||0)+costoTuesteKg;return(<tr key={t.id}>
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
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{costoTuesteKg>0?fmtCOP(Math.round(costoTuesteKg)):<span style={{color:C.textFaint}}>—</span>}</td>
        <td style={{...S.td,color:C.navy,fontWeight:700}}>{costoTotalTostado>0?fmtCOP(Math.round(costoTotalTostado)):<span style={{color:C.textFaint}}>—</span>}</td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{t.kg_a_tostar&&t.kg_cafe_tostado?((t.kg_cafe_tostado/t.kg_a_tostar)*100).toFixed(1)+"%":"-"}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.textFaint,fontWeight:700}}>{fmt(stock,1)} kg</span></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.catacion||"-"}</td>
        <td style={S.td}>{t.responsable||"-"}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{t.kg_cafe_tostado>0&&<button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaUBA(t)}>+ Salida</button>}<button style={{...S.btnG,fontSize:11,...(!t.kg_cafe_tostado?{color:C.orange,borderColor:C.orange+"60",fontWeight:700}:{})}} onClick={()=>abrirEditar(t)}>{t.kg_cafe_tostado?"Editar":"Completar"}</button><button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"60"}} onClick={()=>eliminarTueste(t)}>Eliminar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {historicoFiltrado.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{historico.length===0?"Sin tuestes registrados todavia.":"Ningun tueste coincide con el filtro."}</div>}
    </div>
    <div style={{...S.card,marginTop:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Inventario Mensual — Volumen Tostado (Granel)</div>
        <button style={S.btn} onClick={()=>{setSelInvVTId(null);setModalNuevoInvVT(true);}}>+ Nuevo Conteo</button>
      </div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["Fecha","Responsable","Estado","Registros",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{inventariosVT.map(inv=>(<tr key={inv.id}>
          <td style={S.td}>{fmtFecha(inv.fecha_conteo)}</td>
          <td style={S.td}>{inv.usuario_conteo}</td>
          <td style={S.td}><Bdg label={inv.estado==="cerrado"?"Cerrado":"Borrador"} col={inv.estado==="cerrado"?C.green:C.gold} bg={inv.estado==="cerrado"?C.greenBg:C.goldBg}/></td>
          <td style={S.td}>{inv.detalle.length}</td>
          <td style={S.td}><button style={S.btnG} onClick={()=>setSelInvVTId(inv.id)}>{inv.estado==="cerrado"?"Ver":"Continuar"}</button></td>
        </tr>))}</tbody>
      </table></TablaScrollV>
      {inventariosVT.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin conteos registrados todavia.</div>}
      {invActivoVT&&detalleLocalVT&&(()=>{
        const bloqueado=invActivoVT.estado==="cerrado";
        return(<div style={{marginTop:16,borderTop:"1px solid "+C.border,paddingTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:700,color:C.navy}}>Detalle del conteo — {fmtFecha(invActivoVT.fecha_conteo)}</div>
            {bloqueado?(<button style={S.btnG} onClick={()=>reabrirInventarioVT(invActivoVT)}>Reabrir</button>):(<button style={{...S.btn,background:C.green}} onClick={()=>cerrarInventarioVT({...invActivoVT,detalle:detalleLocalVT})}>Cerrar Inventario</button>)}
          </div>
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Codigo","Producto","Teorico","Fisico","Dif. kg","Dif. %","Estado","Nota"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
            <tbody>{detalleLocalVT.map(d=>(<tr key={d.tueste_id}>
              <td style={{...S.td,fontFamily:"monospace",fontSize:11}}>{d.codigo}</td>
              <td style={S.td}>{d.producto}</td>
              <td style={S.td}>{fmt(d.stock_teorico)} kg</td>
              <td style={S.td}>{bloqueado?fmt(d.stock_fisico)+" kg":<input type="number" style={{...S.input,width:90}} value={d.stock_fisico??""} onChange={e=>actualizarDetalleInvVT(d.tueste_id,"stock_fisico",e.target.value)} onBlur={guardarDetalleVT}/>}</td>
              <td style={S.td}>{d.stock_fisico!=null?fmt(d.diferencia_kg):"—"}</td>
              <td style={S.td}>{d.stock_fisico!=null?d.diferencia_pct.toFixed(1)+"%":"—"}</td>
              <td style={S.td}>{d.estado_semaforo&&<Bdg label={SEM_LABEL[d.estado_semaforo]} col={SEM_COL[d.estado_semaforo]} bg={SEM_BG[d.estado_semaforo]}/>}</td>
              <td style={S.td}>{bloqueado?(d.nota_justificacion||"—"):<input style={{...S.input,width:140}} value={d.nota_justificacion} onChange={e=>actualizarDetalleInvVT(d.tueste_id,"nota_justificacion",e.target.value)} onBlur={guardarDetalleVT}/>}</td>
            </tr>))}</tbody>
          </table></TablaScrollV>
        </div>);
      })()}
      {modalNuevoInvVT&&(<Modal title="Nuevo Conteo — Volumen Tostado (Granel)" onClose={()=>setModalNuevoInvVT(false)}>
        <Fld label="Fecha de Conteo" half><input style={S.input} type="date" value={formNuevoInvVT.fecha_conteo} onChange={e=>setFormNuevoInvVT(p=>({...p,fecha_conteo:e.target.value}))}/></Fld>
        <Fld label="Responsable del Conteo" half><input style={S.input} value={formNuevoInvVT.usuario_conteo} onChange={e=>setFormNuevoInvVT(p=>({...p,usuario_conteo:e.target.value}))}/></Fld>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
          <button style={S.btnG} onClick={()=>setModalNuevoInvVT(false)}>Cancelar</button>
          <button style={S.btn} onClick={crearInventarioVT}>Crear e Iniciar Conteo</button>
        </div>
      </Modal>)}
    </div>
    </>)}
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
        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}><tbody>
          {filaCampo("Fecha",<input style={{...S.input,border:"none"}} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/>)}
          {filaCampo("Nombre Producto Comercial",<input style={{...S.input,border:"none"}} value={form.nombre_producto} onChange={e=>setForm(p=>({...p,nombre_producto:e.target.value}))}/>)}
          {filaCampo("Codigo de Lote Origen",<input style={{...S.input,border:"none"}} value={form.codigo_lote_origen} onChange={e=>setForm(p=>({...p,codigo_lote_origen:e.target.value}))}/>)}
        </tbody></table>
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
        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}><tbody>
          {filaCampo("kg a Tostar (este batch)",form.fuentes.length>0?<div style={{padding:"6px 8px",color:C.accent,fontWeight:700}}>{fmt(+form.kg_a_tostar||0,1)} kg<span style={{color:C.textFaint,fontSize:10,marginLeft:8}}>{form.fuentes.length} {form.fuentes.length===1?"lote":"lotes"}</span></div>:<input style={{...S.input,border:"none"}} type="number" value={form.kg_a_tostar} onChange={e=>setForm(p=>({...p,kg_a_tostar:e.target.value,valor_total:(+e.target.value||0)*(+p.valor_unitario||0)||""}))}/>)}
          {filaCampo("Valor Unitario ($/kg)",<input style={{...S.input,border:"none"}} type="number" value={form.valor_unitario} onChange={e=>setForm(p=>({...p,valor_unitario:e.target.value,valor_total:(+form.kg_a_tostar||0)*(+e.target.value||0)||""}))}/>)}
          {filaCampo("Valor Total",<input style={{...S.input,border:"none",color:C.gold,fontWeight:600}} type="number" value={form.valor_total} onChange={e=>setForm(p=>({...p,valor_total:e.target.value}))}/>)}
          {filaCampo("N° de Baches",<input style={{...S.input,border:"none"}} type="number" min="1" value={form.numero_baches} onChange={e=>setForm(p=>({...p,numero_baches:e.target.value}))}/>)}
          {filaCampo("Tipo de Tueste",<select style={{...S.select,border:"none"}} value={form.tipo_tostion} onChange={e=>setForm(p=>({...p,tipo_tostion:e.target.value}))}>{TIPOS_TOSTION.map(t=>(<option key={t}>{t}</option>))}</select>)}
          {filaCampo("kg Cafe Tostado (resultado)",<>
            <input style={{...S.input,border:"none"}} type="number" value={form.kg_cafe_tostado} onChange={e=>setForm(p=>({...p,kg_cafe_tostado:e.target.value}))}/>
            {form.kg_cafe_tostado&&form.kg_a_tostar&&<div style={{color:C.teal,fontSize:11,marginTop:4,paddingLeft:8}}>Rendimiento: {((+form.kg_cafe_tostado/+form.kg_a_tostar)*100).toFixed(1)}%</div>}
          </>)}
          {filaCampo("Responsable",<input style={{...S.input,border:"none"}} value={form.responsable} onChange={e=>setForm(p=>({...p,responsable:e.target.value}))}/>)}
        </tbody></table>
      </div>
      <Fld label="Catacion"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.catacion} onChange={e=>setForm(p=>({...p,catacion:e.target.value}))}/></Fld>
      {errReg&&<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:8,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errReg}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModal(false);setErrReg("");}}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={reg}>{editId?"Guardar Cambios":"Registrar Tueste"}</button></div>
    </Modal>)}
  </div>);
}
