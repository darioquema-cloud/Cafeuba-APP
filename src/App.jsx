import{useState,useMemo,useEffect,useRef,useLayoutEffect}from"react";
import*as XLSX from"xlsx";
import{auth}from"./firebase";
import{signInWithPopup,GoogleAuthProvider,onAuthStateChanged,signOut as fbSignOut,signInWithEmailAndPassword,sendPasswordResetEmail,createUserWithEmailAndPassword,getAuth as fbGetAuth}from"firebase/auth";
import{initializeApp as fbInitApp,deleteApp as fbDeleteApp}from"firebase/app";
import{cfg}from"./firebase";
import{useFirestoreList}from"./useFirestoreList";
import{C,S,tg}from"./theme";
import{FINCAS,VARIEDADES,TIPOS,ABREV,NORMAS,MESES,EQUIPOS_FERM,EQUIPOS_SECADO,TIPOS_COSTO,CENTROS,CENTRO_COL,CENTRO_BG,ECOL,EBG,USERS_SEED,seedL,seedC,SEED_COSTOS_TRI,PERMISOS,PERMISOS_SEED,NAV,TIPOS_TOSTION}from"./data/constants";
import{fmtCOP,fmt,numVal,today,genId,dateToCode,fmtFecha}from"./lib/format";
import{semanaISO,mesDe,diasEntre}from"./lib/dates";
import{getSeedCostoTri,calcCosto,calcCostoTri}from"./lib/costing";
import{pesoATrilladora,pesoATrilladoraCafeFino,pesoOtrosBodega}from"./lib/stock";
import{Bdg,Fld,KPI,KPIDoble,Bar,Modal,AutoFitText,TablaScrollV,SelectDestino,destinoLabel}from"./components/ui";
import{LoginForm}from"./components/Login/LoginForm";
import{Costos}from"./components/Costos/Costos";
import{Usuarios}from"./components/Usuarios/Usuarios";
import{Trazabilidad}from"./components/Trazabilidad/Trazabilidad";
import{Procesamiento}from"./components/Procesamiento/Procesamiento";
import{Bodega}from"./components/Bodega/Bodega";
import{BodegaTrilladora}from"./components/BodegaTrilladora/BodegaTrilladora";
import{BodegaFino}from"./components/BodegaFino/BodegaFino";
import{BodegaTrilladoraFino}from"./components/BodegaTrilladoraFino/BodegaTrilladoraFino";
import{TrilladoraFino}from"./components/TrilladoraFino/TrilladoraFino";
import{Trilla}from"./components/Trilla/Trilla";
import{Blend}from"./components/Blend/Blend";
import{BlendFino}from"./components/BlendFino/BlendFino";
import{Maquila}from"./components/Maquila/Maquila";
import{BulkLoader}from"./components/BulkLoader/BulkLoader";
import{Ventas}from"./components/Ventas/Ventas";
import{Dashboard}from"./components/Dashboard/Dashboard";











function UbaTostado({blendsTostado,setBlendsTostado,blendsFino,lotesFino,setLotesFino,setBlendsFino}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankForm=()=>({fecha:today(),nombre_producto:"",kg_origen:"",kg_a_tostar:"",valor_unitario:"",valor_total:"",temperatura:"",tiempo:"",tipo_tostion:TIPOS_TOSTION[0],kg_cafe_tostado:"",catacion:"",responsable:"",codigo_lote_origen:"",fecha_proceso:"",fecha_trilla:"",fecha_secado:"",fuentes:[]});
  const [form,setForm]=useState(blankForm());
  const abrirNuevo=()=>{setEditId(null);setForm(blankForm());setModal(true);};
  const abrirEditar=(t)=>{setEditId(t.id);setForm({fecha:t.fecha,nombre_producto:t.nombre_producto||"",kg_origen:t.kg_origen||"",kg_a_tostar:t.kg_a_tostar,valor_unitario:t.valor_unitario,valor_total:t.valor_total,temperatura:t.temperatura||"",tiempo:t.tiempo||"",tipo_tostion:t.tipo_tostion||TIPOS_TOSTION[0],kg_cafe_tostado:t.kg_cafe_tostado||"",catacion:t.catacion||"",responsable:t.responsable||"",codigo_lote_origen:t.codigo_lote_origen||"",fecha_proceso:t.fecha_proceso||"",fecha_trilla:t.fecha_trilla||"",fecha_secado:t.fecha_secado||"",fuentes:t.fuentes||[]});setModal(true);};

  // item 6: accion de salida sobre el cafe tostado resultante
  const stockTostado=(t)=>(t.kg_cafe_tostado||0)-(t.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const [modalSalidaUBA,setModalSalidaUBA]=useState(false);
  const [selTost,setSelTost]=useState(null);
  const [formSalidaUBA,setFormSalidaUBA]=useState({fecha:today(),peso_salida:"",valor_kg:"",valor_total:"",cliente:"",observaciones:""});
  const [errSalidaUBA,setErrSalidaUBA]=useState("");
  const [errReg,setErrReg]=useState("");
  const abrirSalidaUBA=(t)=>{setSelTost(t);const vkgRef=t.valor_unitario_tostado||(t.kg_cafe_tostado&&t.valor_total?Math.round(t.valor_total/t.kg_cafe_tostado):0);setFormSalidaUBA({fecha:today(),peso_salida:"",valor_kg:vkgRef||"",valor_total:"",cliente:"",observaciones:""});setErrSalidaUBA("");setModalSalidaUBA(true);};
  const regSalidaUBA=()=>{
    const peso=numVal(formSalidaUBA.peso_salida);
    if(!selTost||!(peso>0)){setErrSalidaUBA("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockTostado(selTost);
    if(peso>stockBase){setErrSalidaUBA("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaUBA.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalidaUBA.valor_total||0);
    setBlendsTostado(p=>p.map(t=>t.id===selTost.id?{...t,salidas:[...(t.salidas||[]),{id:genId(),fecha:formSalidaUBA.fecha,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,cliente:formSalidaUBA.cliente,observaciones:formSalidaUBA.observaciones}]}:t));
    setModalSalidaUBA(false);setErrSalidaUBA("");
  };
  const reg=()=>{
    if(!form.nombre_producto){setErrReg("El Nombre Producto Comercial es obligatorio.");return;}
    if(!form.kg_a_tostar||!form.fecha)return;
    if(!editId&&form.fuentes.length>0){
      for(const f of form.fuentes){if(!(numVal(f.kg_tomados)>0)){setErrReg("Ingresa kg válidos (>0) en cada lote de origen.");return;}const pool=poolHistorico.find(p=>p.salidaId===f.salidaId);if(pool&&numVal(f.kg_tomados)>pool.kg_a_tostar+0.01){setErrReg("El lote "+f.blendCodigo+" solo tiene "+fmt(pool.kg_a_tostar)+" kg disponibles.");return;}}
    }
    setErrReg("");
    const kgTotal=form.fuentes.length>0?form.fuentes.reduce((s,f)=>s+numVal(f.kg_tomados),0):numVal(form.kg_a_tostar);
    const vtTotal=form.fuentes.length>0?form.fuentes.reduce((s,f)=>s+(f.valor_total_fuente||0),0):kgTotal*numVal(form.valor_unitario);
    const vunit=kgTotal>0?Math.round(vtTotal/kgTotal):numVal(form.valor_unitario);
    const codOrigen=form.fuentes.length>0?form.fuentes.map(f=>f.blendCodigo).join(", "):form.codigo_lote_origen;
    const lotesBld=form.fuentes.length>0?[...new Set(form.fuentes.flatMap(f=>f.lotes_blend||[]))]:[];
    const kgOrig=numVal(form.kg_origen)||kgTotal;
    const kgCafeTostado=numVal(form.kg_cafe_tostado);
    const vutostado=kgCafeTostado>0?Math.round(vtTotal/kgCafeTostado):0;
    if(editId){
      setBlendsTostado(p=>p.map(t=>t.id===editId?{...t,fecha:form.fecha,mes:mesDe(form.fecha),nombre_producto:form.nombre_producto,kg_origen:kgOrig,kg_a_tostar:kgTotal,valor_unitario:vunit,valor_total:vtTotal,temperatura:form.temperatura,tiempo:form.tiempo,tipo_tostion:form.tipo_tostion,kg_cafe_tostado:numVal(form.kg_cafe_tostado)||0,catacion:form.catacion,responsable:form.responsable,codigo_lote_origen:codOrigen,fecha_proceso:form.fecha_proceso,fecha_trilla:form.fecha_trilla,fecha_secado:form.fecha_secado,valor_unitario_tostado:vutostado,fuentes:form.fuentes,lotes_blend:lotesBld.length>0?lotesBld:t.lotes_blend||[]}:t));
    }else{
      const cod="UBA-"+form.nombre_producto.replace(/\s+/g,"")+"-"+dateToCode(form.fecha);
      setBlendsTostado(p=>[{id:genId(),codigo:cod,fecha:form.fecha,mes:mesDe(form.fecha),nombre_producto:form.nombre_producto,kg_origen:kgOrig,kg_a_tostar:kgTotal,valor_unitario:vunit,valor_total:vtTotal,temperatura:form.temperatura,tiempo:form.tiempo,tipo_tostion:form.tipo_tostion,kg_cafe_tostado:numVal(form.kg_cafe_tostado)||0,catacion:form.catacion,responsable:form.responsable,codigo_lote_origen:codOrigen,fecha_proceso:form.fecha_proceso,fecha_trilla:form.fecha_trilla,fecha_secado:form.fecha_secado,valor_unitario_tostado:vutostado,fuentes:form.fuentes,lotes_blend:lotesBld},...p]);
    }
    setModal(false);
  };
  const eliminarTueste=(t)=>{
    if((t.salidas||[]).length>0){alert("Este tueste tiene "+t.salidas.length+" salida(s) registrada(s). Elimina primero las salidas para poder borrar el tueste.");return;}
    if(!window.confirm("¿Eliminar el tueste "+t.codigo+"? El lote volverá a 'Lotes Listos para Tostar'."))return;
    if(t.origen_tipo&&t.origen_salida_id){
      if(t.origen_tipo==="bodega_fino"){setLotesFino(p=>p.map(l=>({...l,salidas_bodega:(l.salidas_bodega||[]).filter(s=>s.id!==t.origen_salida_id)})));}
      else if(t.origen_tipo==="bodega_tri_fino"){setLotesFino(p=>p.map(l=>({...l,salidas_trilladora:(l.salidas_trilladora||[]).filter(s=>s.id!==t.origen_salida_id)})));}
      else if(t.origen_tipo==="blend_fino"){setBlendsFino(p=>p.map(b=>({...b,salidas:(b.salidas||[]).filter(s=>s.id!==t.origen_salida_id)})));}
    }
    setBlendsTostado(p=>p.filter(x=>x.id!==t.id));
  };
  const totalKgTostar=blendsTostado.reduce((s,t)=>s+(t.kg_a_tostar||0),0);
  const totalKgTostado=blendsTostado.reduce((s,t)=>s+(t.kg_cafe_tostado||0),0);
  const rendProm=totalKgTostar>0?((totalKgTostado/totalKgTostar)*100).toFixed(1):0;
  const pendientes=blendsTostado.filter(t=>t.kg_a_tostar>0&&(!t.kg_cafe_tostado||t.kg_cafe_tostado===0));
  const parciales=blendsTostado.filter(t=>t.kg_cafe_tostado>0&&(t.kg_origen!=null&&t.kg_origen!==""?t.kg_origen:t.kg_a_tostar)>(t.kg_a_tostar||0));
  const abrirNuevoBatch=(t)=>{const kgOrigen=(t.kg_origen!=null&&t.kg_origen!=="")?t.kg_origen:t.kg_a_tostar;const kgRest=kgOrigen-(t.kg_a_tostar||0);setEditId(null);setForm({fecha:today(),nombre_producto:t.nombre_producto||"",kg_origen:kgRest,kg_a_tostar:kgRest,valor_unitario:t.valor_unitario||"",valor_total:Math.round(kgRest*(t.valor_unitario||0))||"",temperatura:"",tiempo:"",tipo_tostion:t.tipo_tostion||TIPOS_TOSTION[0],kg_cafe_tostado:"",catacion:"",responsable:"",codigo_lote_origen:t.codigo_lote_origen||t.codigo,fecha_proceso:t.fecha_proceso||"",fecha_trilla:t.fecha_trilla||"",fecha_secado:t.fecha_secado||""});setModal(true);};
  const poolHistorico=useMemo(()=>{const items=[];(blendsFino||[]).forEach(b=>{(b.salidas||[]).filter(s=>s.destino_key==="uba_tostado").forEach(s=>{const consumido=blendsTostado.reduce((sum,t)=>{if((t.fuentes||[]).length>0){const f=t.fuentes.find(x=>x.salidaId===s.id);return sum+(f?numVal(f.kg_tomados):0);}if(t.codigo_lote_origen===b.codigo){return sum+((t.kg_origen!=null&&t.kg_origen!=="")?+t.kg_origen:+t.kg_a_tostar||0);}return sum;},0);const kgDisp=(s.peso_salida||0)-consumido;if(kgDisp>0.5){items.push({salidaId:s.id,blendCodigo:b.codigo,nombre_producto:b.producto_comercial||b.nombre||b.codigo,kg_a_tostar:Math.round(kgDisp*100)/100,valor_unitario:s.valor_kg||Math.round(b.costo_kg)||0,valor_total:Math.round(kgDisp*(s.valor_kg||b.costo_kg||0)),fecha:s.fecha,lotes_blend:(b.items||[]).map(it=>it.codigo),codigo_lote_origen:b.codigo});}});});return items;},[blendsFino,blendsTostado]);
  const abrirHistorico=(item)=>{const vt0=Math.round(item.kg_a_tostar*(item.valor_unitario||0));const fuenteInicial=[{salidaId:item.salidaId,blendCodigo:item.blendCodigo,nombre_producto:item.nombre_producto,kg_tomados:item.kg_a_tostar,valor_unitario:item.valor_unitario,valor_total_fuente:vt0,lotes_blend:item.lotes_blend||[]}];setEditId(null);setForm({fecha:item.fecha||today(),nombre_producto:item.nombre_producto,kg_origen:item.kg_a_tostar,kg_a_tostar:item.kg_a_tostar,valor_unitario:item.valor_unitario,valor_total:vt0,temperatura:"",tiempo:"",tipo_tostion:TIPOS_TOSTION[0],kg_cafe_tostado:"",catacion:"",responsable:"",codigo_lote_origen:item.codigo_lote_origen,fecha_proceso:"",fecha_trilla:"",fecha_secado:"",fuentes:fuenteInicial});setModal(true);};
  const _salidaIdsOk=new Set(blendsTostado.filter(t=>t.origen_salida_id).map(t=>t.origen_salida_id));
  const _codigosOk=new Set(blendsTostado.map(t=>t.codigo_lote_origen).filter(Boolean));
  const salidasHuerfanas=[];
  (lotesFino||[]).forEach(lote=>{
    (lote.salidas_bodega||[]).forEach(s=>{if(s.destino_key==="uba_tostado"&&!_salidaIdsOk.has(s.id)&&!_codigosOk.has(lote.codigo)){salidasHuerfanas.push({...s,lote_codigo:lote.codigo,lote_id:lote.id,tipo_salida:"bodega"});}});
    (lote.salidas_trilladora||[]).forEach(s=>{if(s.destino_key==="uba_tostado"&&!_salidaIdsOk.has(s.id)&&!_codigosOk.has(lote.codigo)){salidasHuerfanas.push({...s,lote_codigo:lote.codigo,lote_id:lote.id,tipo_salida:"trilladora"});}});
  });
  const revertirPendiente=(t)=>{
    if(!window.confirm("¿Revertir el lote pendiente '"+t.nombre_producto+"'? Los kg volverán al módulo de origen."))return;
    if(t.origen_tipo==="bodega_fino"){setLotesFino(p=>p.map(l=>({...l,salidas_bodega:(l.salidas_bodega||[]).filter(s=>s.id!==t.origen_salida_id)})));}
    else if(t.origen_tipo==="bodega_tri_fino"){setLotesFino(p=>p.map(l=>({...l,salidas_trilladora:(l.salidas_trilladora||[]).filter(s=>s.id!==t.origen_salida_id)})));}
    else if(t.origen_tipo==="blend_fino"){setBlendsFino(p=>p.map(b=>({...b,salidas:(b.salidas||[]).filter(s=>s.id!==t.origen_salida_id)})));}
    setBlendsTostado(p=>p.filter(x=>x.id!==t.id));
  };
  const revertirSalidaHuerfana=(s)=>{
    if(!window.confirm("¿Revertir los "+s.peso_salida+" kg del lote "+s.lote_codigo+"? Los kg volverán a Bodega Café Fino."))return;
    if(s.tipo_salida==="bodega"){setLotesFino(p=>p.map(l=>l.id!==s.lote_id?l:{...l,salidas_bodega:(l.salidas_bodega||[]).filter(x=>x.id!==s.id)}));}
    else{setLotesFino(p=>p.map(l=>l.id!==s.lote_id?l:{...l,salidas_trilladora:(l.salidas_trilladora||[]).filter(x=>x.id!==s.id)}));}
  };
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.purple,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PROCESO DE TUESTE</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>UBA Tostado</div></div><button style={{...S.btn,background:C.orange}} onClick={abrirNuevo}>+ Nuevo Lote Tostado</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Tuestes" value={blendsTostado.length} col={C.navy}/>
      <KPI label="Pendientes Tostar" value={pendientes.length+parciales.length+poolHistorico.length} col={C.orange}/>
      <KPI label="kg Cafe Tostado" value={fmt(totalKgTostado,1)+" kg"} col={C.green}/>
      <KPI label="Rendimiento Prom." value={rendProm+"%"} col={C.gold}/>
    </div>
    {(pendientes.length>0||parciales.length>0||poolHistorico.length>0||salidasHuerfanas.length>0)&&(<div style={{...S.card,marginBottom:16,borderLeft:"3px solid "+C.orange}}>
      <div style={{fontWeight:700,fontSize:13,color:C.orange,marginBottom:12}}>Lotes Listos para Tostar ({pendientes.length+parciales.length+poolHistorico.length+salidasHuerfanas.length})</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {pendientes.map(t=>(<div key={t.id} style={{background:C.orangeBg,border:"1px solid "+C.orange+"40",borderRadius:8,padding:"12px 14px",minWidth:210,maxWidth:270}}>
          <div style={{color:C.orange,fontWeight:700,fontSize:11,fontFamily:"monospace"}}>{t.codigo}</div>
          <div style={{color:C.navy,fontWeight:700,fontSize:14,marginTop:4}}>{t.nombre_producto||"—"}</div>
          <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{color:C.accent,fontWeight:700,fontSize:13}}>{fmt(t.kg_a_tostar,1)} kg</span>
            {t.valor_unitario>0&&<span style={{color:C.gold,fontSize:12}}>{fmtCOP(t.valor_unitario)}/kg</span>}
          </div>
          {(t.lotes_blend||[]).length>0&&<div style={{color:C.purple,fontSize:11,marginTop:4}}>Blend: {t.lotes_blend.join(", ")}</div>}
          {t.codigo_lote_origen&&<div style={{color:C.textDim,fontSize:11,marginTop:2}}>Origen: {t.codigo_lote_origen}</div>}
          <button style={{...S.btn,background:C.orange,fontSize:11,padding:"7px 12px",marginTop:10,width:"100%"}} onClick={()=>abrirEditar(t)}>Registrar Tueste</button>
          {t.origen_tipo&&t.origen_salida_id&&<button style={{...S.btnG,fontSize:11,padding:"7px 12px",marginTop:4,width:"100%",color:C.red,borderColor:C.red+"60"}} onClick={()=>revertirPendiente(t)}>Revertir salida</button>}
        </div>))}
        {parciales.map(t=>{const kgOrigen=(t.kg_origen!=null&&t.kg_origen!=="")?t.kg_origen:t.kg_a_tostar;const kgRest=kgOrigen-(t.kg_a_tostar||0);return(<div key={"p"+t.id} style={{background:C.orangeBg,border:"2px solid "+C.orange,borderRadius:8,padding:"12px 14px",minWidth:210,maxWidth:270}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
            <div style={{color:C.orange,fontWeight:700,fontSize:11,fontFamily:"monospace"}}>{t.codigo}</div>
            <Bdg label="Parcial" col={C.orange} bg={C.orangeBg}/>
          </div>
          <div style={{color:C.navy,fontWeight:700,fontSize:14,marginTop:4}}>{t.nombre_producto||"—"}</div>
          <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{color:C.green,fontWeight:700,fontSize:13}}>{fmt(kgRest,1)} kg disponibles</span>
          </div>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Este batch: {fmt(t.kg_a_tostar,1)} kg · Tostado: {fmt(t.kg_cafe_tostado,1)} kg</div>
          {t.codigo_lote_origen&&<div style={{color:C.textDim,fontSize:11,marginTop:2}}>Origen: {t.codigo_lote_origen}</div>}
          <button style={{...S.btn,background:C.orange,fontSize:11,padding:"7px 12px",marginTop:10,width:"100%"}} onClick={()=>abrirNuevoBatch(t)}>Nuevo Batch de Tueste</button>
        </div>);})}

        {poolHistorico.map(item=>(<div key={item.salidaId} style={{background:C.orangeBg,border:"2px dashed "+C.orange+"80",borderRadius:8,padding:"12px 14px",minWidth:210,maxWidth:270}}>
          <div style={{color:C.orange,fontWeight:700,fontSize:11,fontFamily:"monospace"}}>{item.blendCodigo}</div>
          <div style={{color:C.navy,fontWeight:700,fontSize:14,marginTop:4}}>{item.nombre_producto||"—"}</div>
          <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{color:C.accent,fontWeight:700,fontSize:13}}>{fmt(item.kg_a_tostar,1)} kg</span>
            {item.valor_unitario>0&&<span style={{color:C.gold,fontSize:12}}>{fmtCOP(item.valor_unitario)}/kg</span>}
          </div>
          {(item.lotes_blend||[]).length>0&&<div style={{color:C.purple,fontSize:11,marginTop:4}}>Blend: {item.lotes_blend.join(", ")}</div>}
          <div style={{color:C.textDim,fontSize:10,marginTop:4,fontStyle:"italic"}}>Salida: {fmtFecha(item.fecha)}</div>
          <button style={{...S.btn,background:C.orange,fontSize:11,padding:"7px 12px",marginTop:10,width:"100%"}} onClick={()=>abrirHistorico(item)}>Iniciar Tueste</button>
        </div>))}
        {salidasHuerfanas.map(s=>(<div key={"orph_"+s.id} style={{background:"#fff8e1",border:"2px dashed #f59e0b",borderRadius:8,padding:"12px 14px",minWidth:210,maxWidth:270}}>
          <div style={{color:"#92400e",fontWeight:700,fontSize:10,fontFamily:"monospace",marginBottom:2}}>&#9888; SIN REGISTRO DE TUESTE</div>
          <div style={{color:C.navy,fontWeight:700,fontSize:14}}>{s.lote_codigo}</div>
          <div style={{marginTop:6}}><span style={{color:C.accent,fontWeight:700,fontSize:13}}>{fmt(s.peso_salida,1)} kg</span></div>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Salida hacia UBA Tostado sin lote asignado · {s.tipo_salida==="bodega"?"Bodega":"Trilladora"}</div>
          <button style={{...S.btnG,fontSize:11,padding:"7px 12px",marginTop:10,width:"100%",color:C.red,borderColor:C.red+"60"}} onClick={()=>revertirSalidaHuerfana(s)}>Revertir salida</button>
        </div>))}
      </div>
    </div>)}
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Registros de Tueste</div><TablaScrollV minWidth={1600}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1600}}><thead><tr>{["Codigo","Fecha","Mes","Producto","Trazabilidad","kg a Tostar","Valor Unit.","Valor Total","Temp.","Tiempo","Tipo Tostión","kg Tostado","Por Tostar","Valor/kg Tostado","Rend.","Stock kg","Catacion","Responsable","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{blendsTostado.filter(t=>t.kg_cafe_tostado>0).map(t=>{const stock=stockTostado(t);const vkgTostado=t.valor_unitario_tostado||(t.kg_cafe_tostado&&t.valor_total?Math.round(t.valor_total/t.kg_cafe_tostado):null);return(<tr key={t.id}>
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
        <td style={S.td}>{t.temperatura?t.temperatura+"°C":"-"}</td>
        <td style={S.td}>{t.tiempo||"-"}</td>
        <td style={S.td}><Bdg label={t.tipo_tostion||"-"} col={C.orange} bg={C.orangeBg}/></td>
        <td style={{...S.td,color:C.green,fontWeight:700}}>{t.kg_cafe_tostado?fmt(t.kg_cafe_tostado,1)+" kg":<Bdg label="Pendiente" col={C.orange} bg={C.orangeBg}/>}</td>
        <td style={S.td}>{(()=>{const kgO=(t.kg_origen!=null&&t.kg_origen!=="")?t.kg_origen:t.kg_a_tostar;const r=kgO-(t.kg_a_tostar||0);return r>0?<span style={{color:C.orange,fontWeight:700}}>{fmt(r,1)} kg</span>:<span style={{color:C.textFaint}}>—</span>;})()}</td>
        <td style={{...S.td,color:C.purple,fontWeight:700}}>{vkgTostado?fmtCOP(vkgTostado):<span style={{color:C.textFaint}}>—</span>}</td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{t.kg_a_tostar&&t.kg_cafe_tostado?((t.kg_cafe_tostado/t.kg_a_tostar)*100).toFixed(1)+"%":"-"}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.textFaint,fontWeight:700}}>{fmt(stock,1)} kg</span></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.catacion||"-"}</td>
        <td style={S.td}>{t.responsable||"-"}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{t.kg_cafe_tostado>0&&<button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaUBA(t)}>+ Salida</button>}<button style={{...S.btnG,fontSize:11,...(!t.kg_cafe_tostado?{color:C.orange,borderColor:C.orange+"60",fontWeight:700}:{})}} onClick={()=>abrirEditar(t)}>{t.kg_cafe_tostado?"Editar":"Completar"}</button><button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"60"}} onClick={()=>eliminarTueste(t)}>Eliminar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {blendsTostado.filter(t=>t.kg_cafe_tostado>0).length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin tuestes registrados todavia.</div>}
    </div>

    {modalSalidaUBA&&selTost&&(<Modal title={"Salida de Cafe Tostado - "+selTost.codigo} onClose={()=>{setModalSalidaUBA(false);setErrSalidaUBA("");}}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selTost.codigo} - {selTost.nombre_producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockTostado(selTost),1)} kg</b></div>
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
        <div style={{width:"100%",background:C.panel,borderRadius:8,border:"1px solid "+C.border,padding:"12px 14px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:13,color:C.navy}}>Lotes de Origen del Tueste</div>
            {form.fuentes.length>1&&<div style={{color:C.green,fontWeight:700,fontSize:12}}>Total: {fmt(form.fuentes.reduce((s,f)=>s+(+f.kg_tomados||0),0),1)} kg · {fmtCOP(form.fuentes.reduce((s,f)=>s+(f.valor_total_fuente||0),0))}</div>}
          </div>
          {form.fuentes.map((f,i)=>(<div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,background:C.purpleBg,borderRadius:6,padding:"8px 10px",border:"1px solid "+C.purple+"30"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:C.purple,fontWeight:700,fontSize:11,fontFamily:"monospace"}}>{f.blendCodigo}</div>
              <div style={{color:C.textDim,fontSize:10,marginTop:1}}>{f.nombre_producto}</div>
            </div>
            <input style={{...S.input,width:72,padding:"4px 6px",textAlign:"right"}} type="number" value={f.kg_tomados} onChange={e=>{const kg=e.target.value;const vt=Math.round((+kg||0)*(f.valor_unitario||0));setForm(p=>{const nf=[...p.fuentes];nf[i]={...f,kg_tomados:kg,valor_total_fuente:vt};const tk=nf.reduce((s,x)=>s+(+x.kg_tomados||0),0);const tv=nf.reduce((s,x)=>s+(x.valor_total_fuente||0),0);return{...p,fuentes:nf,kg_a_tostar:tk||"",kg_origen:tk||"",valor_total:tv||"",valor_unitario:tk>0?Math.round(tv/tk):p.valor_unitario,codigo_lote_origen:nf.map(x=>x.blendCodigo).join(", ")};});}}/>
            <span style={{color:C.textDim,fontSize:11}}>kg</span>
            <span style={{color:C.gold,fontSize:10,minWidth:70,textAlign:"right"}}>{fmtCOP(f.valor_unitario)}/kg</span>
            <button style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontWeight:900,fontSize:15,padding:"0 4px",lineHeight:1}} onClick={()=>setForm(p=>{const nf=p.fuentes.filter((_,j)=>j!==i);const tk=nf.reduce((s,x)=>s+(+x.kg_tomados||0),0);const tv=nf.reduce((s,x)=>s+(x.valor_total_fuente||0),0);return{...p,fuentes:nf,...(nf.length>0?{kg_a_tostar:tk,kg_origen:tk,valor_total:tv,valor_unitario:tk>0?Math.round(tv/tk):p.valor_unitario,codigo_lote_origen:nf.map(x=>x.blendCodigo).join(", ")}:{})};})}>×</button>
          </div>))}
          {(pendientes.length>0||parciales.length>0)&&(<div style={{marginBottom:8}}>
            <div style={{color:C.orange,fontSize:11,fontWeight:600,marginBottom:5}}>Lotes pendientes de tostar (click para registrar tueste):</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {pendientes.map(t=>(<button key={t.id} style={{...S.btnG,fontSize:11,color:C.orange,borderColor:C.orange+"60",padding:"5px 10px"}} onClick={()=>abrirEditar(t)}>&#9654; {t.nombre_producto||t.codigo} &middot; {fmt(t.kg_a_tostar,1)} kg</button>))}
              {parciales.map(t=>{const kgOrigen=(t.kg_origen!=null&&t.kg_origen!=="")?t.kg_origen:t.kg_a_tostar;const kgRest=kgOrigen-(t.kg_a_tostar||0);return(<button key={"par_"+t.id} style={{...S.btnG,fontSize:11,color:C.orange,borderColor:C.orange+"60",padding:"5px 10px"}} onClick={()=>abrirNuevoBatch(t)}>&#9654; {t.nombre_producto||t.codigo} &middot; {fmt(kgRest,1)} kg restantes</button>);})}
            </div>
          </div>)}
          {poolHistorico.filter(p=>!form.fuentes.some(f=>f.salidaId===p.salidaId)).length>0&&(<div style={{marginTop:(pendientes.length>0||parciales.length>0||form.fuentes.length>0)?8:0}}>
            {(pendientes.length===0&&parciales.length===0&&form.fuentes.length===0)&&<div style={{color:C.textDim,fontSize:11,marginBottom:6}}>Selecciona lotes para agregar al tueste:</div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {poolHistorico.filter(p=>!form.fuentes.some(f=>f.salidaId===p.salidaId)).map(item=>(<button key={item.salidaId} style={{...S.btnG,fontSize:11,color:C.accent,borderColor:C.accent+"60",padding:"5px 10px"}} onClick={()=>setForm(p=>{const vt=Math.round(item.kg_a_tostar*(item.valor_unitario||0));const nf=[...p.fuentes,{salidaId:item.salidaId,blendCodigo:item.blendCodigo,nombre_producto:item.nombre_producto,kg_tomados:item.kg_a_tostar,valor_unitario:item.valor_unitario,valor_total_fuente:vt,lotes_blend:item.lotes_blend||[]}];const tk=nf.reduce((s,f)=>s+(+f.kg_tomados||0),0);const tv=nf.reduce((s,f)=>s+(f.valor_total_fuente||0),0);return{...p,fuentes:nf,kg_a_tostar:tk||"",kg_origen:tk||"",valor_total:tv||"",valor_unitario:tk>0?Math.round(tv/tk):p.valor_unitario,codigo_lote_origen:nf.map(f=>f.blendCodigo).join(", ")};})}>+ {item.blendCodigo} · {fmt(item.kg_a_tostar,1)} kg</button>))}
            </div>
          </div>)}
          {poolHistorico.length===0&&pendientes.length===0&&parciales.length===0&&form.fuentes.length===0&&<div style={{color:C.textFaint,fontSize:11,fontStyle:"italic"}}>Sin lotes disponibles. Completa el codigo de lote de origen manualmente.</div>}
        </div>
        <Fld label="kg a Tostar (este batch)" half>{form.fuentes.length>0?<div style={{...S.input,background:C.panel2,color:C.accent,fontWeight:700,display:"flex",alignItems:"center"}}>{fmt(+form.kg_a_tostar||0,1)} kg<span style={{color:C.textFaint,fontSize:10,marginLeft:8}}>{form.fuentes.length} {form.fuentes.length===1?"lote":"lotes"}</span></div>:<input style={S.input} type="number" value={form.kg_a_tostar} onChange={e=>setForm(p=>({...p,kg_a_tostar:e.target.value,valor_total:(+e.target.value||0)*(+p.valor_unitario||0)||""}))}/>}{!form.fuentes.length&&form.kg_origen&&+form.kg_origen>0&&+form.kg_origen!=+form.kg_a_tostar&&<div style={{color:C.teal,fontSize:11,marginTop:4}}>Disponible del lote: <b>{fmt(+form.kg_origen,1)} kg</b></div>}</Fld>
        <Fld label="Valor Unitario ($/kg)" half><input style={S.input} type="number" value={form.valor_unitario} onChange={e=>setForm(p=>({...p,valor_unitario:e.target.value,valor_total:(+form.kg_a_tostar||0)*(+e.target.value||0)||""}))}/></Fld>
        <Fld label="Valor Total" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={form.valor_total} onChange={e=>setForm(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="Temperatura (°C)" half><input style={S.input} type="number" value={form.temperatura} onChange={e=>setForm(p=>({...p,temperatura:e.target.value}))}/></Fld>
        <Fld label="Tiempo (min)" half><input style={S.input} type="number" value={form.tiempo} onChange={e=>setForm(p=>({...p,tiempo:e.target.value}))}/></Fld>
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



const exportarTodoExcel=(lotes,costos,blends,lotesFino,blendsFino,maquilas,blendsTostado)=>{
  const wb=XLSX.utils.book_new();
  const addSheet=(name,data)=>{if(!data||!data.length)data=[{"Sin datos":""}];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),name);};
  // 1. Procesamiento
  addSheet("Procesamiento",lotes.map(l=>({Codigo:l.codigo,Fecha_Proceso:l.fecha_proceso||"",Mes:l.mes||"",Semana:l.semana||"",Tipo:l.tipo||"",Producto:l.producto||"",Estado:l.estado||"",Fincas:[...new Set((l.cereza||[]).map(c=>c.finca))].join(", "),kg_Cereza:(l.cereza||[]).reduce((a,c)=>a+(c.kg||0),0),Valor_Cereza:(l.cereza||[]).reduce((a,c)=>a+(c.kg||0)*(c.valor_kg||0),0),kg_Pergamino:l.kg_producto||0,Conversion:l.conversion||"",Reactor:l.equipo_ferm||"",Silo:l.equipo_secado||"",Fecha_Inicio_Secado:l.fecha_lavado||"",Fecha_Fin_Secado:l.fecha_fin_secado||"",Humedad_pct:l.humedad||"",Notas:l.notas||""})));
  // 2. Bodega Milan - Salidas
  addSheet("BodegaMilan_Salidas",lotes.flatMap(l=>(l.salidas_bodega||[]).map(s=>({Lote:l.codigo,Fecha:s.fecha,Factura:s.factura||"",Remision:s.remision||"",Cliente_Destino:s.cliente||"",Destino_Key:s.destino_key||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  // 3. Trilla
  addSheet("Trilla",lotes.filter(l=>l.trilla?.kg_excelso>0).map(l=>({Lote:l.codigo,Fecha_Trilla:l.trilla.fecha_trilla||"",Corte:l.trilla.codigo_corte||"",Cod_Trillado:l.trilla.nombre_trillado||"",Proceso:l.trilla.con_proceso||"",Perg_kg:l.trilla.entrada_usada||0,Excelso_kg:l.trilla.kg_excelso||0,Merma_kg:l.trilla.kg_merma||0,Pct_Merma:l.trilla.entrada_usada>0?+((l.trilla.kg_merma/l.trilla.entrada_usada)*100).toFixed(1):0,Factor_Industrial:l.trilla.factor_industrial!=null?+l.trilla.factor_industrial.toFixed(2):"",FP_Ponderado:l.trilla.factor_pretrilla_ponderado!=null?+l.trilla.factor_pretrilla_ponderado.toFixed(2):"",Pasilla_Elec:l.trilla.pasilla_elec||0,Catadora_Dens:l.trilla.catadora_dens||0,Inferiores:l.trilla.inferiores||0,Cisco:l.trilla.cisco||0,Humedad_pct:l.trilla.humedad_salida||"",Norma:l.trilla.norma||""})));
  // 4. Bodega Trilladora - Salidas
  addSheet("BodegaTri_Salidas",lotes.filter(l=>l.trilla?.kg_excelso>0).flatMap(l=>(l.salidas_trilladora||[]).map(s=>({Lote:l.codigo,Cod_Trillado:l.trilla?.nombre_trillado||"",Fecha:s.fecha,Cliente_Destino:s.cliente||"",Destino_Key:s.destino_key||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  // 5. Blend
  addSheet("Blend",blends.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+(s.peso_salida||0),0);return{Codigo:b.codigo,Nombre:b.nombre,Producto_Comercial:b.producto_comercial||"",Fecha:b.fecha,Lotes:(b.items||[]).map(it=>it.codigo+" ("+it.kg_usado+"kg)").join(", "),kg_Total:b.kg_total||0,Costo_kg:b.costo_kg?+b.costo_kg.toFixed(0):0,Valor_Total:b.valor_total||0,kg_Salidas:salKg,Stock_kg:+((b.kg_total||0)-salKg).toFixed(1)};}));
  // 6. Blend - Salidas
  addSheet("Blend_Salidas",blends.flatMap(b=>(b.salidas||[]).map(s=>({Blend:b.codigo,Fecha:s.fecha,Cliente:s.cliente||"",Factura:s.factura||"",Remision:s.remision||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0,Observaciones:s.observaciones||""}))));
  // 7. Bodega Cafe Fino
  const stockBCF=l=>((l.kg_producto||0)-(l.salidas_bodega||[]).reduce((a,s)=>a+(s.peso_salida||0),0));
  addSheet("BodegaCafeFino",lotesFino.map(l=>({Codigo:l.codigo,Fecha:l.fecha,Mes:l.mes||"",Semana:l.semana||"",Producto:l.producto||"",Proveedor:l.proveedor||"",kg_Entrada:l.kg_producto||0,kg_Salidas:(l.salidas_bodega||[]).reduce((a,s)=>a+(s.peso_salida||0),0),Stock_kg:stockBCF(l),Costo_Compra_kg:l.costo_compra_kg||0,Valor_Stock:+(stockBCF(l)*(l.costo_compra_kg||0)).toFixed(0),FP_Factor:l.pretrilla?.factor_pretrilla?+l.pretrilla.factor_pretrilla.toFixed(2):"",FP_Merma_pct:l.pretrilla?.pct_merma?+l.pretrilla.pct_merma.toFixed(1):"",Lote_Origen:l.trazabilidad?.codigo_lote_origen||"",Fecha_Proceso:l.trazabilidad?.fecha_proceso||"",Fecha_Secado:l.trazabilidad?.fecha_secado||"",Notas:l.notas||""})));
  // 8. Bodega CF - Salidas
  addSheet("BodegaCF_Salidas",lotesFino.flatMap(l=>(l.salidas_bodega||[]).map(s=>({Lote:l.codigo,Fecha:s.fecha,Factura:s.factura||"",Remision:s.remision||"",Cliente_Destino:s.cliente||"",Destino_Key:s.destino_key||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  // 9. Trilladora Cafe Fino
  addSheet("TrilladoraCF",lotesFino.filter(l=>l.trilla?.kg_excelso>0).map(l=>({Lote:l.codigo,Fecha_Trilla:l.trilla.fecha_trilla||"",Corte:l.trilla.codigo_corte||"",Cod_Trillado:l.trilla.nombre_trillado||"",Proceso:l.trilla.con_proceso||"",Perg_kg:l.trilla.entrada_usada||0,Excelso_kg:l.trilla.kg_excelso||0,Merma_kg:l.trilla.kg_merma||0,Pct_Merma:l.trilla.entrada_usada>0?+((l.trilla.kg_merma/l.trilla.entrada_usada)*100).toFixed(1):0,Factor_Industrial:l.trilla.factor_industrial!=null?+l.trilla.factor_industrial.toFixed(2):"",FP_Ponderado:l.trilla.factor_pretrilla_ponderado!=null?+l.trilla.factor_pretrilla_ponderado.toFixed(2):"",Pasilla_Elec:l.trilla.pasilla_elec||0,Catadora_Dens:l.trilla.catadora_dens||0,Inferiores:l.trilla.inferiores||0,Cisco:l.trilla.cisco||0,Stock_Excelso:(l.trilla.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,s)=>a+(s.peso_salida||0),0),Lote_Origen:l.trazabilidad?.codigo_lote_origen||""})));
  // 10. Trilladora CF - Salidas
  addSheet("TrilladoraCF_Salidas",lotesFino.flatMap(l=>(l.salidas_trilladora||[]).map(s=>({Lote:l.codigo,Cod_Trillado:l.trilla?.nombre_trillado||"",Fecha:s.fecha,Cliente_Destino:s.cliente||"",Destino_Key:s.destino_key||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  // 11. Blend Cafe Fino
  addSheet("BlendCafeFino",blendsFino.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+(s.peso_salida||0),0);return{Codigo:b.codigo,Nombre:b.nombre||"",Producto_Comercial:b.producto_comercial||"",Fecha:b.fecha,Lotes:(b.items||[]).map(it=>it.codigo+" ("+it.kg_usado+"kg)").join(", "),kg_Total:b.kg_total||0,Costo_kg:b.costo_kg?+b.costo_kg.toFixed(0):0,Valor_Total:b.valor_total||0,kg_Salidas:salKg,Stock_kg:+((b.kg_total||0)-salKg).toFixed(1)};}));
  // 12. Blend CF - Salidas
  addSheet("BlendCF_Salidas",blendsFino.flatMap(b=>(b.salidas||[]).map(s=>({Blend:b.codigo,Fecha:s.fecha,Cliente:s.cliente||"",Factura:s.factura||"",Remision:s.remision||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  // 13. Maquila
  addSheet("Maquila",maquilas.map(m=>({Codigo:m.codigo||"",Fecha:m.fecha,Mes:m.mes||"",Semana:m.semana||"",Cliente:m.cliente||"",Telefono:m.telefono||"",kg_Recibidos:m.kg_recibidos||0,Servicio:m.servicio||"",Observaciones:m.observaciones||"",kg_Salidas:(m.salidas||[]).reduce((a,s)=>a+(s.kg_salida||0),0)})));
  // 14. Maquila - Salidas
  addSheet("Maquila_Salidas",maquilas.flatMap(m=>(m.salidas||[]).map(s=>({Maquila:m.codigo||m.cliente,Fecha:s.fecha,Cliente_Destino:s.cliente_destino||"",Destino_Key:s.destino_key||"",kg_Salida:s.kg_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0,Observaciones:s.observaciones||""}))));
  // 15. UBA Tostado
  addSheet("UBA_Tostado",blendsTostado.map(t=>({Codigo:t.codigo||"",Fecha:t.fecha,Mes:t.mes||"",Producto:t.nombre_producto||"",kg_a_Tostar:t.kg_a_tostar||0,Valor_kg:t.valor_unitario||0,Valor_Total:t.valor_total||0,Temperatura_C:t.temperatura||"",Tiempo_min:t.tiempo||"",Tipo_Tostion:t.tipo_tostion||"",kg_Tostado:t.kg_cafe_tostado||0,Rendimiento_pct:t.kg_a_tostar&&t.kg_cafe_tostado?+((t.kg_cafe_tostado/t.kg_a_tostar)*100).toFixed(1):0,Stock_kg:(t.kg_cafe_tostado||0)-(t.salidas||[]).reduce((a,s)=>a+(s.peso_salida||0),0),Catacion:t.catacion||"",Responsable:t.responsable||""})));
  // 16. UBA Tostado - Salidas
  addSheet("UBA_Salidas",blendsTostado.flatMap(t=>(t.salidas||[]).map(s=>({Producto:t.codigo||t.nombre_producto,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  // 17. Costos
  addSheet("Costos",costos.map(c=>({Fecha:c.fecha,Mes:c.mes||"",Centro:c.centro||"",Tipo:c.tipo||"",Descripcion:c.descripcion||"",Valor:c.valor||0})));
  XLSX.writeFile(wb,"CafeUba-"+dateToCode(today())+".xlsx");
};

export default function App(){
  const [authReady,setAuthReady]=useState(false);const [fbUser,setFbUser]=useState(null);const [notAuthorized,setNotAuthorized]=useState(false);
  const [loggedIn,setLoggedIn]=useState(false);const [user,setUser]=useState(null);const [view,setView]=useState("dashboard");
  const [usuarios,setUsuarios,usuariosReady]=useFirestoreList("usuarios",USERS_SEED);
  const [lotes,setLotes]=useFirestoreList("lotes",seedL());
  const [costos,setCostos]=useFirestoreList("costos",seedC());
  const [blends,setBlends]=useFirestoreList("blends",[]);
  const [lotesFino,setLotesFino]=useFirestoreList("lotesFino",[]);
  const [blendsFino,setBlendsFino]=useFirestoreList("blendsFino",[]);
  const [maquilas,setMaquilas]=useFirestoreList("maquilas",[]);
  const [blendsTostado,setBlendsTostado]=useFirestoreList("blendsTostado",[]);
  const [subprodVerde,setSubprodVerde]=useFirestoreList("subprodVerde",[]);
  const [subprodPerg,setSubprodPerg]=useFirestoreList("subprodPerg",[]);
  const [permisosConfig,setPermisosConfig]=useFirestoreList("permisosConfig",PERMISOS_SEED);
  useEffect(()=>{return onAuthStateChanged(auth,fu=>{setFbUser(fu);setAuthReady(true);if(!fu){setLoggedIn(false);setUser(null);setNotAuthorized(false);}});},[]);
  useEffect(()=>{
    if(!authReady||!fbUser||!usuariosReady)return;
    const email=fbUser.email?.toLowerCase();
    const match=usuarios.find(u=>u.email?.toLowerCase()===email&&u.activo!==false);
    if(match){setUser({...match,nombre:fbUser.displayName||match.nombre,foto:fbUser.photoURL||null});setLoggedIn(true);setNotAuthorized(false);}
    else if(usuarios.length===0){const nu={id:genId(),nombre:fbUser.displayName||email,email:fbUser.email,rol:"Gerente",activo:true};setUsuarios(p=>[...p,nu]);setUser({...nu,foto:fbUser.photoURL||null});setLoggedIn(true);setNotAuthorized(false);}
    else{setLoggedIn(false);setNotAuthorized(true);}
  },[fbUser,usuarios,authReady,usuariosReady]);
  if(!authReady||(fbUser&&!usuariosReady))return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg,flexDirection:"column",gap:16}}><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/><div style={{width:40,height:40,border:"4px solid "+C.border,borderTop:"4px solid "+C.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><div style={{color:C.textDim,fontSize:13}}>Cargando plataforma...</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>);
  if(!loggedIn)return(<><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/><LoginForm notAuthorized={notAuthorized}/></>);
  const VIEWS={dashboard:()=><Dashboard lotes={lotes} costos={costos} lotesFino={lotesFino} maquilas={maquilas} blendsTostado={blendsTostado} blends={blends} blendsFino={blendsFino}/>,procesamiento:()=><Procesamiento lotes={lotes} setLotes={setLotes} costos={costos} lotesFino={lotesFino} setLotesFino={setLotesFino}/>,bodega:()=><Bodega lotes={lotes} setLotes={setLotes} costos={costos} setLotesFino={setLotesFino} subprodPerg={subprodPerg} setSubprodPerg={setSubprodPerg}/>,trilla:()=><Trilla lotes={lotes} setLotes={setLotes} costos={costos} subprodVerde={subprodVerde} setSubprodVerde={setSubprodVerde}/>,bodega_tri:()=><BodegaTrilladora lotes={lotes} setLotes={setLotes} costos={costos} setLotesFino={setLotesFino}/>,blend:()=><Blend lotes={lotes} setLotes={setLotes} blends={blends} setBlends={setBlends} costos={costos} setLotesFino={setLotesFino}/>,bodega_fino:()=><BodegaFino lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsFino={setBlendsFino} setBlendsTostado={setBlendsTostado} lotes={lotes}/>,trilladora_fino:()=><TrilladoraFino lotesFino={lotesFino} setLotesFino={setLotesFino} lotes={lotes} costos={costos}/>,bodega_tri_fino:()=><BodegaTrilladoraFino lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsTostado={setBlendsTostado}/>,blend_fino:()=><BlendFino lotesFino={lotesFino} setLotesFino={setLotesFino} blendsFino={blendsFino} setBlendsFino={setBlendsFino} setBlendsTostado={setBlendsTostado}/>,maquila:()=><Maquila maquilas={maquilas} setMaquilas={setMaquilas} setLotesFino={setLotesFino}/>,uba_tostado:()=><UbaTostado blendsTostado={blendsTostado} setBlendsTostado={setBlendsTostado} blendsFino={blendsFino} lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsFino={setBlendsFino}/>,ventas:()=><Ventas lotes={lotes} lotesFino={lotesFino} blends={blends} blendsFino={blendsFino}/>,trazabilidad:()=><Trazabilidad lotes={lotes} costos={costos} blends={blends}/>,costos:()=><Costos costos={costos} setCostos={setCostos}/>,usuarios:()=><Usuarios usuarios={usuarios} setUsuarios={setUsuarios} permisosConfig={permisosConfig} setPermisosConfig={setPermisosConfig}/>,carga_inicial:()=><BulkLoader lotes={lotes} setLotes={setLotes} blends={blends} setBlends={setBlends} setCostos={setCostos} lotesFino={lotesFino} setLotesFino={setLotesFino} blendsFino={blendsFino} setBlendsFino={setBlendsFino} setMaquilas={setMaquilas} setBlendsTostado={setBlendsTostado} setUsuarios={setUsuarios}/>};
  const permisosMapE=Object.fromEntries((permisosConfig.length?permisosConfig:PERMISOS_SEED).map(p=>[p.id,{views:p.views||[],readOnly:p.readOnly||[]}]));
  const permiso=permisosMapE[user?.rol]||permisosMapE["Gerente"]||{views:["dashboard"],readOnly:[]};
  const navFiltrado=NAV.filter(item=>item.sep||permiso.views.includes(item.k));
  const viewEfectiva=permiso.views.includes(view)?view:(permiso.views[0]||"dashboard");
  const esReadOnly=permiso.readOnly.includes(viewEfectiva);
  const View=VIEWS[viewEfectiva]||VIEWS.dashboard;
  return(<><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <div style={S.app}>
      <div style={S.topbar}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:34,height:34,borderRadius:"50%",background:C.white,display:"flex",alignItems:"center",justifyContent:"center",padding:4,flexShrink:0}}><img src="/logo-cafeuba.png" alt="CafeUba" style={{width:"100%",height:"100%",objectFit:"contain"}}/></div><div><div style={{color:C.white,fontWeight:700,fontSize:14}}>CafeUba</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:9,letterSpacing:1}}>CENTRAL DE BENEFICIO</div></div></div>
        <div style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:500}}>Dashboard Gerencial - Plan Milan</div>
        <div style={{display:"flex",alignItems:"center",gap:14}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:"#4ADE80"}}/><span style={{color:"rgba(255,255,255,0.7)",fontSize:11,fontWeight:500}}>EN VIVO</span></div><div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>{new Date().toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}</div><button onClick={()=>exportarTodoExcel(lotes,costos,blends,lotesFino,blendsFino,maquilas,blendsTostado)} style={{background:"#166534",border:"1px solid #22c55e55",borderRadius:6,color:"#4ADE80",fontSize:11,fontWeight:700,padding:"5px 12px",cursor:"pointer",letterSpacing:0.5}}>⬇ Excel</button></div>
      </div>
      <div style={S.sidebar}>
        <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>{navFiltrado.map((item)=>item.sep?(<div key={item.k} style={{height:1,background:C.border,margin:"6px 6px"}}/>):(<div key={item.k} onClick={()=>setView(item.k)} style={{padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderRadius:6,marginBottom:2,background:viewEfectiva===item.k?C.accentBg:"transparent",color:viewEfectiva===item.k?C.navy:C.textDim,fontSize:13,fontWeight:viewEfectiva===item.k?600:400,borderLeft:viewEfectiva===item.k?"3px solid "+C.accent:"3px solid transparent"}}><span dangerouslySetInnerHTML={{__html:item.icon}} style={{fontSize:14,width:18,textAlign:"center"}}/>{item.l}</div>))}</nav>
        <div style={{padding:"12px 14px",borderTop:"1px solid "+C.border}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:34,height:34,borderRadius:"50%",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.white,flexShrink:0}}>{user?.nombre?.charAt(0)}</div><div style={{overflow:"hidden"}}><div style={{color:C.navy,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.nombre}</div><div style={{color:C.textDim,fontSize:10}}>{user?.rol}</div></div></div><button style={{...S.btnG,width:"100%",textAlign:"center",fontSize:12}} onClick={()=>{fbSignOut(auth);setLoggedIn(false);setUser(null);}}>Cerrar Sesion</button></div>
      </div>
      <div style={S.main}>{esReadOnly&&(<div style={{background:C.goldBg,border:"1px solid "+C.gold+"50",borderRadius:8,padding:"9px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:15}}>&#128065;</span><span style={{color:C.gold,fontWeight:700,fontSize:13}}>Solo lectura</span><span style={{color:C.gold,fontSize:12,opacity:0.85}}> — Puedes consultar este módulo pero no tienes permisos para modificar datos.</span></div>)}<View/></div>
    </div>
  </>);
}
