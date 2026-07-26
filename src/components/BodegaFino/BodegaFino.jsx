import{useState,useEffect}from"react";
import{C,S}from"../../theme";
import{KPI,Bdg,Fld,Modal,TablaScrollV,SelectDestino}from"../ui";
import{fmt,fmtCOP,numVal,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{semanaISO,mesDe}from"../../lib/dates";
import*as XLSX from"xlsx";
import{jsPDF}from"jspdf";
import autoTable from"jspdf-autotable";
// ══════════════════════════════════════════════════════════════════════════
// CAFE FINO: linea paralela de procesamiento para pergamino comprado/ingresado
// directamente (sin pasar por Recepcion/Procesamiento). Misma logica de
// diseno que Bodega Milan / Trilla / Blend, con costo de compra en vez de
// costo de produccion (a+b+c).
// ══════════════════════════════════════════════════════════════════════════
export function BodegaFino({lotesFino,setLotesFino,setBlendsFino,setBlendsTostado,lotes,inventariosMensuales,setInventariosMensuales}){
  const fincasDeOrigen=(l)=>{if(!lotes||!l.trazabilidad?.codigo_lote_origen)return[];const orig=lotes.find(x=>x.codigo===l.trazabilidad.codigo_lote_origen);return orig?[...new Set(orig.cereza.map(c=>c.finca))]:[];};
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankForm=()=>({fecha:today(),producto:"",tipo_ingreso:"Pergamino",proveedor:"",kg_producto:"",costo_compra_kg:"",notas:""});
  const [form,setForm]=useState(blankForm());
  const [selLote,setSelLote]=useState(null);
  const [modalSalida,setModalSalida]=useState(false);
  const [formSalida,setFormSalida]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",nombre_producto_tostado:""});
  const [errSalida,setErrSalida]=useState("");
  const [editSalidaId,setEditSalidaId]=useState(null);
  const [tab,setTab]=useState("inventario");
  const [hBusqF,setHBusqF]=useState("");const [hMesF,setHMesF]=useState("");const [hProdF,setHProdF]=useState("");
  const [filMesB,setFilMesB]=useState("");
  const [filProdB,setFilProdB]=useState("");
  const [busqB,setBusqB]=useState("");

  // Pre-Trilla (item 2: comparacion con factor pretrilla en Trilladora Cafe Fino)
  const [modalPre,setModalPre]=useState(false);
  const [formPre,setFormPre]=useState({fecha:today(),perfil_taza:"",peso_muestra:"",almendra_sana:"",granos_brocados:"",granos_inmaduros:"",inferiores:"",gr_merma:""});
  const totalPasillaPre=(+formPre.granos_brocados||0)+(+formPre.granos_inmaduros||0)+(+formPre.inferiores||0);
  const factorPre=(+formPre.almendra_sana)>0?((+formPre.peso_muestra||0)/(+formPre.almendra_sana))*70:0;
  const pctMermaPre=(+formPre.peso_muestra)>0?((+formPre.gr_merma||0)/(+formPre.peso_muestra))*100:0;
  const sumaComponentesPre=(+formPre.almendra_sana||0)+(+formPre.granos_brocados||0)+(+formPre.granos_inmaduros||0)+(+formPre.inferiores||0)+(+formPre.gr_merma||0);
  const alertaPesosPre=(+formPre.peso_muestra)>0&&sumaComponentesPre>(+formPre.peso_muestra);
  const abrirPre=(l)=>{setSelLote(l);setFormPre(l.pretrilla?{fecha:l.pretrilla.fecha,perfil_taza:l.pretrilla.perfil_taza,peso_muestra:l.pretrilla.peso_muestra,almendra_sana:l.pretrilla.almendra_sana,granos_brocados:l.pretrilla.granos_brocados,granos_inmaduros:l.pretrilla.granos_inmaduros,inferiores:l.pretrilla.inferiores,gr_merma:l.pretrilla.gr_merma}:{fecha:today(),perfil_taza:"",peso_muestra:"",almendra_sana:"",granos_brocados:"",granos_inmaduros:"",inferiores:"",gr_merma:""});setModalPre(true);};
  const guardarPre=()=>{
    if(!selLote)return;
    setLotesFino(p=>p.map(l=>l.id===selLote.id?{...l,pretrilla:{fecha:formPre.fecha,perfil_taza:formPre.perfil_taza,peso_muestra:+formPre.peso_muestra||0,almendra_sana:+formPre.almendra_sana||0,granos_brocados:+formPre.granos_brocados||0,granos_inmaduros:+formPre.granos_inmaduros||0,inferiores:+formPre.inferiores||0,gr_merma:+formPre.gr_merma||0,total_pasilla:totalPasillaPre,factor_pretrilla:factorPre,pct_merma:pctMermaPre}}:l));
    setModalPre(false);
  };

  const stockDe=(l)=>l.kg_producto-(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);
  const esUbaTostado=formSalida.destino_key==="uba_tostado";
  const esBlendFino=formSalida.destino_key==="blend_cf";
  const esTrilladoraFino=formSalida.destino_key==="trilla_cf";
  const alertaTipoIngreso=(esUbaTostado||esBlendFino)&&selLote?.tipo_ingreso&&selLote.tipo_ingreso!=="Excelso";
  const genCod=()=>{const[y,m,d]=form.fecha.split("-");return "CF-"+(form.producto||"GEN")+"-"+d+m+y;};
  const abrirNuevo=()=>{setEditId(null);setForm(blankForm());setModal(true);};
  const abrirEditar=(l)=>{setEditId(l.id);setForm({fecha:l.fecha,producto:l.producto,tipo_ingreso:l.tipo_ingreso||"Pergamino",proveedor:l.proveedor||"",kg_producto:l.kg_producto,costo_compra_kg:l.costo_compra_kg,notas:l.notas||""});setModal(true);};
  const reg=()=>{
    if(!form.kg_producto||!form.costo_compra_kg)return;
    if(editId){
      setLotesFino(p=>p.map(l=>l.id===editId?{...l,fecha:form.fecha,producto:form.producto,tipo_ingreso:form.tipo_ingreso,proveedor:form.proveedor,kg_producto:+form.kg_producto,costo_compra_kg:+form.costo_compra_kg,notas:form.notas}:l));
    }else{
      setLotesFino(p=>[{id:genId(),codigo:genCod(),fecha:form.fecha,mes:mesDe(form.fecha),semana:semanaISO(form.fecha),producto:form.producto,tipo_ingreso:form.tipo_ingreso,proveedor:form.proveedor,kg_producto:+form.kg_producto,costo_compra_kg:+form.costo_compra_kg,notas:form.notas,salidas_bodega:[],trilla:null,salidas_trilladora:[]},...p]);
    }
    setModal(false);
  };
  const abrirEditarSalida=(l,s)=>{setSelLote(l);setEditSalidaId(s.id);setFormSalida({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total});setErrSalida("");setModalSalida(true);};
  const regSalida=()=>{
    const peso=numVal(formSalida.peso_salida);
    if(!selLote||!(peso>0)){setErrSalida("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockDe(selLote)+(editSalidaId?(selLote.salidas_bodega||[]).find(x=>x.id===editSalidaId)?.peso_salida||0:0);
    if(peso>stockBase){setErrSalida("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalida.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalida.valor_total||0);
    const nuevaSalidaId=editSalidaId||genId();
    setLotesFino(p=>p.map(l=>{if(l.id!==selLote.id)return l;
      let sal;
      if(editSalidaId){sal=(l.salidas_bodega||[]).map(s=>s.id===editSalidaId?{...s,fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}:s);}
      else{sal=[...(l.salidas_bodega||[]),{id:nuevaSalidaId,fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}];}
      return{...l,salidas_bodega:sal};
    }));
    if(esTrilladoraFino){
      setLotesFino(p=>[{id:genId(),codigo:selLote.codigo,fecha:formSalida.fecha,mes:mesDe(formSalida.fecha),semana:semanaISO(formSalida.fecha),producto:selLote.producto||"",proveedor:"Bodega Café Fino",kg_producto:peso,costo_compra_kg:vkg||selLote.costo_compra_kg||0,notas:"Trasladado desde Bodega CF — "+selLote.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,trazabilidad:{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:"",fecha_trilla:"",fecha_secado:"",lotes_blend:[]},para_trilladora:true},...p]);
    }
    setModalSalida(false);setEditSalidaId(null);setErrSalida("");
    setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",nombre_producto_tostado:""});
  };

  const lotesBodega=lotesFino.filter(l=>!l.para_trilladora);
  const mesesB=[...new Set(lotesBodega.map(l=>l.mes).filter(Boolean))].sort();
  const productosB=[...new Set(lotesBodega.map(l=>l.producto).filter(Boolean))].sort();
  const lotesFiltradosB=lotesBodega.filter(l=>{
    if(filMesB&&l.mes!==filMesB)return false;
    if(filProdB&&l.producto!==filProdB)return false;
    if(busqB){const q=busqB.toLowerCase();if(!l.codigo?.toLowerCase().includes(q)&&!l.proveedor?.toLowerCase().includes(q)&&!l.producto?.toLowerCase().includes(q)&&!l.notas?.toLowerCase().includes(q))return false;}
    return true;
  });
  const hayFiltroB=!!(filMesB||filProdB||busqB);
  const sumBEnt=lotesFiltradosB.reduce((s,l)=>s+l.kg_producto,0);
  const sumBStk=lotesFiltradosB.reduce((s,l)=>s+stockDe(l),0);
  const sumBValStk=lotesFiltradosB.reduce((s,l)=>s+stockDe(l)*(l.costo_compra_kg||0),0);
  // Excluye "ajuste_inventario" de las salidas "reales" — el ajuste corrige el stock pero no es
  // una salida/venta real, no debe mezclarse en los KPIs de Kg/Valor Salidas.
  const sumBKgSal=lotesFiltradosB.reduce((s,l)=>s+(l.salidas_bodega||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,b)=>a+b.peso_salida,0),0);
  const sumBValSal=lotesFiltradosB.reduce((s,l)=>s+(l.salidas_bodega||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,b)=>a+(b.valor_total||0),0),0);
  const totalKg=lotesBodega.reduce((s,l)=>s+stockDe(l),0);
  const totalValor=lotesBodega.reduce((s,l)=>s+stockDe(l)*(l.costo_compra_kg||0),0);
  const totalSalidas=lotesBodega.reduce((s,l)=>s+(l.salidas_bodega||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,b)=>a+b.peso_salida,0),0);
  const totalValorSalidas=lotesBodega.reduce((s,l)=>s+(l.salidas_bodega||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,b)=>a+(b.valor_total||0),0),0);

  // ═══ Inventario Mensual (mismo patron de Bodega Milan / Bodega Trilladora / Blend) ═══
  // La entidad del arqueo es el LOTE individual (identificado por l.codigo), igual que en
  // Bodega Milan. Solo se auditan los lotes que aparecen en la tabla de Inventario normal
  // (lotesBodega=lotesFino sin los ya trasladados a Trilladora Cafe Fino) para que el stock
  // teorico del arqueo coincida kg-por-kg con esa tabla.
  const [modalNuevoInv,setModalNuevoInv]=useState(false);
  const [formNuevoInv,setFormNuevoInv]=useState({fecha_conteo:today(),usuario_conteo:""});
  const [selInvId,setSelInvId]=useState(null);
  const semaforoDe=(pct)=>{const a=Math.abs(pct);if(a<=2)return"verde";if(a<=5)return"amarillo";return"rojo";};
  const SEM_COL={verde:C.green,amarillo:C.gold,rojo:C.red};
  const SEM_BG={verde:C.greenBg,amarillo:C.goldBg,rojo:C.redBg};
  const SEM_LABEL={verde:"OK",amarillo:"Revisar",rojo:"Critico"};
  const inventariosCF=(inventariosMensuales||[]).filter(i=>i.modulo==="bodega_cf");
  const invActivo=inventariosCF.find(i=>i.id===selInvId)||null;
  const [detalleLocal,setDetalleLocal]=useState(null);
  const [busquedaInv,setBusquedaInv]=useState("");
  useEffect(()=>{setDetalleLocal(invActivo?invActivo.detalle:null);setBusquedaInv("");},[invActivo?.id]);
  const guardarDetalle=()=>{
    if(!invActivo||!detalleLocal)return;
    setInventariosMensuales(p=>p.map(x=>x.id===invActivo.id?{...x,detalle:detalleLocal}:x));
  };
  const crearInventario=()=>{
    if(!formNuevoInv.fecha_conteo||!formNuevoInv.usuario_conteo.trim())return;
    const detalle=lotesBodega.map(l=>({lote_id:l.id,lote_codigo:l.codigo,producto:l.producto||"",stock_teorico:stockDe(l),stock_fisico:null,diferencia_kg:0,diferencia_pct:0,estado_semaforo:null,nota_justificacion:"",fecha_conteo:formNuevoInv.fecha_conteo}));
    const nuevo={id:genId(),modulo:"bodega_cf",mes:mesDe(formNuevoInv.fecha_conteo),anio:new Date(formNuevoInv.fecha_conteo+"T00:00:00").getFullYear(),seccion:"bodega_cf",fecha_conteo:formNuevoInv.fecha_conteo,usuario_conteo:formNuevoInv.usuario_conteo.trim(),estado:"borrador",detalle};
    setInventariosMensuales(p=>[nuevo,...(p||[])]);
    setSelInvId(nuevo.id);
    setModalNuevoInv(false);
    setFormNuevoInv({fecha_conteo:today(),usuario_conteo:""});
  };
  const actualizarDetalleInv=(loteId,campo,valor)=>{
    setDetalleLocal(prev=>(prev||[]).map(d=>{
      if(d.lote_id!==loteId)return d;
      if(campo==="stock_fisico"){
        const sf=valor===""?null:+valor;
        const dif=sf!=null?sf-d.stock_teorico:0;
        const pct=sf!=null&&d.stock_teorico>0?(dif/d.stock_teorico)*100:0;
        return{...d,stock_fisico:sf,diferencia_kg:dif,diferencia_pct:pct,estado_semaforo:sf!=null?semaforoDe(pct):null};
      }
      return{...d,[campo]:valor};
    }));
  };
  const cerrarInventario=(inv)=>{
    const pendientes=inv.detalle.filter(d=>d.stock_fisico==null);
    if(pendientes.length>0){alert("Faltan "+pendientes.length+" lote(s) por contar antes de cerrar.");return;}
    const sinJustificar=inv.detalle.filter(d=>d.estado_semaforo!=="verde"&&!d.nota_justificacion?.trim());
    if(sinJustificar.length>0){alert("Hay "+sinJustificar.length+" lote(s) con diferencia significativa (amarillo/rojo) sin nota de justificacion. Agrega la nota antes de cerrar.");return;}
    if(!window.confirm("¿Cerrar este inventario? Se generara un ajuste de stock en Bodega Cafe Fino para cada lote con diferencia, y ya no se podra editar salvo que lo reabras."))return;
    const fechaCierre=today();
    const mesNum=String(new Date(inv.fecha_conteo+"T00:00:00").getMonth()+1).padStart(2,"0");
    const factura="AJUSTE-INV-"+mesNum+"-"+inv.anio;
    const ajustesPorLote={};
    inv.detalle.forEach(d=>{if(d.diferencia_kg!==0)ajustesPorLote[d.lote_id]=d.diferencia_kg;});
    setLotesFino(p=>p.map(l=>{
      if(!(l.id in ajustesPorLote))return l;
      const pesoAjuste=-ajustesPorLote[l.id];
      const nuevaSalida={id:genId(),fecha:fechaCierre,factura,remision:"",cliente:"Ajuste de Inventario",destino_key:"ajuste_inventario",peso_salida:pesoAjuste,valor_kg:0,valor_total:0};
      return{...l,salidas_bodega:[...(l.salidas_bodega||[]),nuevaSalida]};
    }));
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,detalle:inv.detalle,estado:"cerrado",fecha_cierre:fechaCierre}:x));
  };
  // Exporta la planilla de conteo en blanco (Excel) para diligenciar en campo
  const exportarPlanillaExcel=(inv)=>{
    const data=inv.detalle.map(d=>({"Codigo":d.lote_codigo,"Producto":d.producto||"","Stock Teorico (kg)":+d.stock_teorico.toFixed(1),"Stock Fisico (kg)":""}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),"Planilla Conteo");
    XLSX.writeFile(wb,"Planilla-Inventario-BodegaCF-"+(inv.mes||"")+"-"+inv.anio+".xlsx");
  };
  // Exporta el Acta de Inventario (PDF) una vez cerrado. Valor unitario = l.costo_compra_kg
  // (el mismo costo/kg que ya muestra la tabla principal de Bodega Cafe Fino).
  const exportarActaPDF=(inv)=>{
    const detalle=inv.detalle;
    const kgFisicoTotal=detalle.reduce((s,d)=>s+(d.stock_fisico||0),0);
    const kgTeoricoTotal=detalle.reduce((s,d)=>s+d.stock_teorico,0);
    const difTotalKg=kgFisicoTotal-kgTeoricoTotal;
    const valorTotal=detalle.reduce((s,d)=>{
      const l=lotesFino.find(x=>x.id===d.lote_id);
      return s+((l?.costo_compra_kg||0)*(d.stock_fisico||0));
    },0);
    const significativos=detalle.filter(d=>d.estado_semaforo&&d.estado_semaforo!=="verde");
    const porProducto={};
    detalle.forEach(d=>{const p=d.producto||"Sin Producto";porProducto[p]=(porProducto[p]||0)+(d.stock_fisico||0);});
    const mesLabel=(inv.mes||"").charAt(0).toUpperCase()+(inv.mes||"").slice(1);

    const doc=new jsPDF();
    doc.setFont("helvetica","bold");doc.setFontSize(16);
    doc.text("CafeUba — Bodega Cafe Fino",14,18);
    doc.setFont("helvetica","normal");doc.setFontSize(12);
    doc.text("Acta de Inventario Mensual",14,26);
    doc.setFontSize(10);
    doc.text("Periodo: "+mesLabel+" "+inv.anio,14,34);
    doc.text("Fecha de cierre: "+fmtFecha(inv.fecha_cierre||inv.fecha_conteo),14,40);
    doc.text("Responsable del conteo: "+(inv.usuario_conteo||"—"),14,46);

    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("Resumen Ejecutivo",14,56);
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    doc.text("Valor total del inventario (fisico, costo ponderado): "+fmtCOP(Math.round(valorTotal)),14,63);
    doc.text("Kilos totales en stock fisico: "+fmt(kgFisicoTotal)+" kg",14,69);
    doc.text("Total kg ajustados (neto): "+(difTotalKg>=0?"+":"")+fmt(difTotalKg)+" kg",14,75);

    let y=85;
    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("Diferencias Significativas (Amarillo/Rojo)",14,y);
    if(significativos.length===0){
      doc.setFont("helvetica","normal");doc.setFontSize(10);
      doc.text("Sin diferencias significativas — todos los lotes dentro del margen aceptable (<=2%).",14,y+7);
      y+=16;
    }else{
      autoTable(doc,{
        startY:y+4,
        head:[["Codigo","Producto","Teorico kg","Fisico kg","Dif. kg","Dif. %","Nota"]],
        body:significativos.map(d=>[d.lote_codigo,d.producto||"—",fmt(d.stock_teorico),fmt(d.stock_fisico),fmt(d.diferencia_kg),d.diferencia_pct.toFixed(1)+"%",d.nota_justificacion||"—"]),
        styles:{fontSize:8},
        headStyles:{fillColor:[30,58,95]},
      });
      y=doc.lastAutoTable.finalY+12;
    }

    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("Desglose por Producto (kg fisico)",14,y);
    autoTable(doc,{
      startY:y+4,
      head:[["Producto","kg Fisico"]],
      body:Object.entries(porProducto).map(([p,kg])=>[p,fmt(kg)]),
      styles:{fontSize:9},
      headStyles:{fillColor:[30,58,95]},
    });
    y=doc.lastAutoTable.finalY+30;

    if(y>260){doc.addPage();y=30;}
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    doc.text("_________________________________",14,y);
    doc.text("Gerente de Produccion",14,y+6);
    doc.text("_________________________________",120,y);
    doc.text("Gerente Financiero",120,y+6);

    doc.save("Acta-Inventario-BodegaCF-"+(inv.mes||"")+"-"+inv.anio+".pdf");
  };
  // Reabrir NO revierte el ajuste de stock ya generado al cerrar — solo vuelve el documento a
  // "borrador" para poder corregir datos. Si se vuelve a cerrar, se genera un ajuste ADICIONAL.
  const reabrirInventario=(inv)=>{
    if(!window.confirm("Este inventario ya genero un ajuste de stock. Reabrir y volver a cerrar generara un ajuste ADICIONAL, no un reemplazo. ¿Continuar?"))return;
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,estado:"borrador"}:x));
  };

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.navy,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Bodega Cafe Fino</span><button style={S.btn} onClick={abrirNuevo}>+ Nuevo Lote</button></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Lotes en Bodega" value={lotesBodega.length} col={C.navy}/>
      <KPI label="Stock Total" value={fmt(totalKg)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock" value={fmtCOP(totalValor)} col={C.gold}/>
      <KPI label="kg con Salida" value={fmt(totalSalidas)+" kg"} col={C.orange}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidas)} col={C.green}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"],["inventario_mensual","Inventario Mensual"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<div style={S.card}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <input style={{...S.input,maxWidth:200,marginBottom:0,flex:"1 1 150px"}} placeholder="Buscar código, proveedor..." value={busqB} onChange={e=>setBusqB(e.target.value)}/>
        <select style={{...S.select,flex:"1 1 130px",maxWidth:160}} value={filMesB} onChange={e=>setFilMesB(e.target.value)}><option value="">Todos los meses</option>{mesesB.map(m=>(<option key={m} value={m} style={{textTransform:"capitalize"}}>{m}</option>))}</select>
        <select style={{...S.select,flex:"1 1 140px",maxWidth:180}} value={filProdB} onChange={e=>setFilProdB(e.target.value)}><option value="">Todos los productos</option>{productosB.map(p=>(<option key={p}>{p}</option>))}</select>
        {hayFiltroB&&<button style={{...S.btnG,fontSize:11,padding:"6px 10px",color:C.red,borderColor:C.red+"40"}} onClick={()=>{setBusqB("");setFilMesB("");setFilProdB("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12,marginLeft:4}}>{lotesFiltradosB.length} de {lotesBodega.length}</span>
      </div>
      {hayFiltroB&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>LOTES</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{lotesFiltradosB.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG ENTRADA</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumBEnt)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumBStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR STOCK</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(sumBValStk)}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumBKgSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumBValSal)}</div></div>
      </div>)}
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Inventario por Lote</div><TablaScrollV minWidth={1280}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1280}}><thead><tr>{["Codigo","Mes","Finca","Producto","Tipo","Proveedor","Fecha","Entrada kg","Salidas kg","Stock kg","Costo Compra/kg","Valor Stock","Pre-Trilla","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{lotesFiltradosB.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=stockDe(l);const fi=fincasDeOrigen(l);return(<tr key={l.id}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{fi.length>0?fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>)):<span style={{color:C.textFaint,fontSize:11}}>—</span>}</div></td>
        <td style={S.td}><Bdg label={l.producto||"-"} col={C.teal} bg={C.tealBg}/></td>
        <td style={S.td}>{(()=>{const ti=l.tipo_ingreso||"Pergamino";const cols={Excelso:C.accent,Natural:C.green,Pergamino:C.gold};const bgs={Excelso:C.accentBg,Natural:C.greenBg,Pergamino:C.goldBg};return<Bdg label={ti} col={cols[ti]||C.gold} bg={bgs[ti]||C.goldBg}/>;})()}</td>
        <td style={{...S.td,color:C.textDim}}>{l.proveedor||"-"}</td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(l.fecha)}</td>
        <td style={{...S.td,fontWeight:600}}>{fmt(l.kg_producto)}</td>
        <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(sal)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(l.costo_compra_kg)}</td>
        <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(stock*(l.costo_compra_kg||0))}</td>
        <td style={S.td}>{l.pretrilla?(<div><div style={{color:C.purple,fontWeight:700,fontSize:12}}>FP: {fmt(l.pretrilla.factor_pretrilla,1)}</div><div style={{color:C.red,fontSize:11}}>Merma: {fmt(l.pretrilla.pct_merma,1)}%</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirPre(l)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirPre(l)}>+ Pre-Trilla</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>{setSelLote(l);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:l.costo_compra_kg||"",valor_total:""});setErrSalida("");setModalSalida(true);}}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(l)}>Editar</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px",color:C.red,borderColor:C.red+"40"}} disabled={!!(l.trilla?.kg_excelso)} title={l.trilla?.kg_excelso?"No se puede eliminar: ya fue trillado":""} onClick={()=>{if(window.confirm("¿Eliminar el lote "+l.codigo+" de Bodega Cafe Fino? Esta accion no se puede deshacer.")){setLotesFino(p=>p.filter(x=>x.id!==l.id));}}}>Eliminar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {lotesFiltradosB.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{hayFiltroB?"Sin lotes que coincidan con los filtros.":"Sin lotes registrados todavia."}</div>}
    </div>)}
    {tab==="historico"&&(()=>{const todasHF=lotesBodega.flatMap(l=>(l.salidas_bodega||[]).map(s=>({...s,codigo:l.codigo,producto:l.producto,loteRef:l}))).sort((a,b)=>b.fecha.localeCompare(a.fecha));const mesesHF=[...new Set(todasHF.map(s=>mesDe(s.fecha)).filter(Boolean))].sort();const prodsHF=[...new Set(todasHF.map(s=>s.producto).filter(Boolean))].sort();const filtHF=todasHF.filter(s=>{if(hMesF&&mesDe(s.fecha)!==hMesF)return false;if(hProdF&&s.producto!==hProdF)return false;if(hBusqF){const q=hBusqF.toLowerCase();if(!s.codigo?.toLowerCase().includes(q)&&!s.cliente?.toLowerCase().includes(q)&&!(s.factura||"").toLowerCase().includes(q))return false;}return true;});return todasHF.length===0?(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>):(<div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontWeight:600,fontSize:14,color:C.navy}}>Historico de Salidas</span><span style={{color:C.textFaint,fontSize:12}}>{filtHF.length} de {todasHF.length} salidas</span></div><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}><input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar lote, cliente, factura..." value={hBusqF} onChange={e=>setHBusqF(e.target.value)}/><select style={{...S.select,width:140}} value={hMesF} onChange={e=>setHMesF(e.target.value)}><option value="">Todos los meses</option>{mesesHF.map(m=>(<option key={m}>{m}</option>))}</select><select style={{...S.select,width:160}} value={hProdF} onChange={e=>setHProdF(e.target.value)}><option value="">Todos los productos</option>{prodsHF.map(p=>(<option key={p}>{p}</option>))}</select>{(hBusqF||hMesF||hProdF)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setHBusqF("");setHMesF("");setHProdF("");}}>✕ Limpiar</button>}</div>{(hBusqF||hMesF||hProdF)&&filtHF.length>0&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>SALIDAS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{filtHF.length}</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(filtHF.reduce((s,x)=>s+x.peso_salida,0))} kg</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(filtHF.reduce((s,x)=>s+(x.valor_total||0),0))}</div></div></div>)}<TablaScrollV minWidth={900}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote","Fecha","Factura","Remision","Cliente","Peso Salida","Valor/kg","Valor Total",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{filtHF.map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalida(s.loteRef,s)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV></div>);})()}

    {tab==="inventario_mensual"&&(<>
      {!invActivo?(<>
        <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Inventario Mensual — Bodega Cafe Fino</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Arqueo de existencias: compara el stock teorico del sistema contra el conteo fisico</div></div>
          <button style={S.btn} onClick={()=>{setFormNuevoInv({fecha_conteo:today(),usuario_conteo:""});setModalNuevoInv(true);}}>+ Nuevo Inventario Mensual</button>
        </div>
        {inventariosCF.length===0?(
          <div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin inventarios mensuales registrados todavia. Usa el boton para crear el primer arqueo.</div>
        ):(
          <div style={S.card}>
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr>
              {["Mes","Fecha Conteo","Usuario","Estado","Lotes","Contados","Rojo/Amarillo",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}
            </tr></thead>
            <tbody>{[...inventariosCF].sort((a,b)=>(b.fecha_conteo||"").localeCompare(a.fecha_conteo||"")).map(inv=>{
              const contados=inv.detalle.filter(d=>d.stock_fisico!=null).length;
              const rojos=inv.detalle.filter(d=>d.estado_semaforo==="rojo").length;
              const amarillos=inv.detalle.filter(d=>d.estado_semaforo==="amarillo").length;
              return(<tr key={inv.id}>
                <td style={{...S.td,textTransform:"capitalize",fontWeight:700,color:C.navy}}>{inv.mes} {inv.anio}</td>
                <td style={{...S.td,color:C.textDim}}>{fmtFecha(inv.fecha_conteo)}</td>
                <td style={S.td}>{inv.usuario_conteo}</td>
                <td style={S.td}><Bdg label={inv.estado==="cerrado"?"Cerrado":"Borrador"} col={inv.estado==="cerrado"?C.green:C.gold} bg={inv.estado==="cerrado"?C.greenBg:C.goldBg}/></td>
                <td style={{...S.td,textAlign:"center"}}>{inv.detalle.length}</td>
                <td style={{...S.td,textAlign:"center"}}>{contados}/{inv.detalle.length}</td>
                <td style={{...S.td,textAlign:"center"}}>{(rojos+amarillos)>0?(<span style={{color:rojos>0?C.red:C.gold,fontWeight:700}}>{rojos>0&&rojos+" rojo"}{rojos>0&&amarillos>0&&" · "}{amarillos>0&&amarillos+" amarillo"}</span>):(<span style={{color:C.green}}>—</span>)}</td>
                <td style={S.td}><button style={S.btnG} onClick={()=>setSelInvId(inv.id)}>{inv.estado==="cerrado"?"Ver":"Continuar"}</button></td>
              </tr>);
            })}</tbody></table></TablaScrollV>
          </div>
        )}
      </>):(()=>{
        const detalleView=detalleLocal||invActivo.detalle;
        const kgTeoricoTotal=detalleView.reduce((s,d)=>s+d.stock_teorico,0);
        const kgFisicoTotal=detalleView.reduce((s,d)=>s+(d.stock_fisico||0),0);
        const difTotalKg=kgFisicoTotal-kgTeoricoTotal;
        const difTotalPct=kgTeoricoTotal>0?(difTotalKg/kgTeoricoTotal)*100:0;
        const contados=detalleView.filter(d=>d.stock_fisico!=null).length;
        const rojos=detalleView.filter(d=>d.estado_semaforo==="rojo").length;
        const amarillos=detalleView.filter(d=>d.estado_semaforo==="amarillo").length;
        const bloqueado=invActivo.estado==="cerrado";
        const detalleFiltrado=busquedaInv?detalleView.filter(d=>d.lote_codigo.toLowerCase().includes(busquedaInv.toLowerCase())):detalleView;
        return(<>
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div>
              <button style={{...S.btnG,marginBottom:8}} onClick={()=>setSelInvId(null)}>← Volver al listado</button>
              <div style={{fontWeight:700,fontSize:14,color:C.navy,textTransform:"capitalize"}}>{invActivo.mes} {invActivo.anio} <Bdg label={bloqueado?"Cerrado":"Borrador"} col={bloqueado?C.green:C.gold} bg={bloqueado?C.greenBg:C.goldBg}/></div>
              <div style={{fontSize:11,color:C.textDim,marginTop:2}}>Conteo: {fmtFecha(invActivo.fecha_conteo)} · {invActivo.usuario_conteo}</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {!bloqueado&&<button style={S.btnG} onClick={()=>exportarPlanillaExcel({...invActivo,detalle:detalleView})}>⬇ Exportar Planilla</button>}
              {bloqueado&&<button style={S.btnG} onClick={()=>exportarActaPDF(invActivo)}>⬇ Exportar PDF</button>}
              {bloqueado?(<button style={S.btnG} onClick={()=>reabrirInventario(invActivo)}>Reabrir</button>):(<button style={{...S.btn,background:C.green}} onClick={()=>cerrarInventario({...invActivo,detalle:detalleView})}>Cerrar Inventario</button>)}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
            <KPI label="Contados" value={contados+"/"+detalleView.length} col={C.navy}/>
            <KPI label="Stock Teorico" value={fmt(kgTeoricoTotal)+" kg"} col={C.teal}/>
            <KPI label="Stock Fisico" value={fmt(kgFisicoTotal)+" kg"} col={C.accent}/>
            <KPI label="Diferencia" value={fmt(difTotalKg)+" kg"} col={Math.abs(difTotalPct)<=2?C.green:Math.abs(difTotalPct)<=5?C.gold:C.red}/>
            <KPI label="Diferencia %" value={difTotalPct.toFixed(1)+"%"} col={Math.abs(difTotalPct)<=2?C.green:Math.abs(difTotalPct)<=5?C.gold:C.red}/>
            <KPI label="Rojo/Amarillo" value={rojos+" / "+amarillos} col={rojos>0?C.red:amarillos>0?C.gold:C.green}/>
          </div>
          <div style={{...S.card,display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
            <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo..." value={busquedaInv} onChange={e=>setBusquedaInv(e.target.value)}/>
            <span style={{color:C.textFaint,fontSize:12,whiteSpace:"nowrap"}}>{detalleFiltrado.length} de {detalleView.length} lotes</span>
          </div>
          <div style={S.card}>
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>
              {["Codigo","Producto","Stock Teorico kg","Stock Fisico kg","Diferencia kg","Diferencia %","Estado","Nota Justificacion"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
            </tr></thead>
            <tbody>{detalleFiltrado.map(d=>(
              <tr key={d.lote_id}>
                <td style={{...S.td,fontWeight:700,color:C.accent,fontFamily:"monospace"}}>{d.lote_codigo}</td>
                <td style={S.td}><Bdg label={d.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
                <td style={{...S.td,textAlign:"right",color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{fmt(d.stock_teorico)} kg</td>
                <td style={S.td}>{bloqueado?(<span style={{fontWeight:700}}>{d.stock_fisico!=null?fmt(d.stock_fisico)+" kg":"—"}</span>):(<input style={{...S.input,width:110,padding:"6px 8px"}} type="number" step="0.1" placeholder="kg" value={d.stock_fisico??""} onChange={e=>actualizarDetalleInv(d.lote_id,"stock_fisico",e.target.value)} onBlur={guardarDetalle}/>)}</td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,color:d.stock_fisico==null?C.textFaint:d.diferencia_kg===0?C.textDim:d.diferencia_kg>0?C.green:C.red,fontVariantNumeric:"tabular-nums"}}>{d.stock_fisico!=null?fmt(d.diferencia_kg):"—"}</td>
                <td style={{...S.td,textAlign:"right",color:d.stock_fisico==null?C.textFaint:C.textDim,fontVariantNumeric:"tabular-nums"}}>{d.stock_fisico!=null?d.diferencia_pct.toFixed(1)+"%":"—"}</td>
                <td style={S.td}>{d.estado_semaforo?(<Bdg label={SEM_LABEL[d.estado_semaforo]} col={SEM_COL[d.estado_semaforo]} bg={SEM_BG[d.estado_semaforo]}/>):(<span style={{color:C.textFaint,fontSize:11}}>Pendiente</span>)}</td>
                <td style={S.td}>{bloqueado?(<span style={{color:C.textDim,fontSize:12}}>{d.nota_justificacion||"—"}</span>):(<input style={{...S.input,minWidth:180}} placeholder={d.estado_semaforo&&d.estado_semaforo!=="verde"?"Obligatorio: explica la diferencia":"Opcional"} value={d.nota_justificacion} onChange={e=>actualizarDetalleInv(d.lote_id,"nota_justificacion",e.target.value)} onBlur={guardarDetalle}/>)}</td>
              </tr>
            ))}</tbody></table></TablaScrollV>
          </div>
        </>);
      })()}
      {modalNuevoInv&&(<Modal title="Nuevo Inventario Mensual" onClose={()=>setModalNuevoInv(false)}>
        <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.textDim}}>Se creara un borrador con el stock teorico actual de los {lotesBodega.length} lotes activos de Bodega Cafe Fino. El conteo fisico y las notas se completan despues.</div>
        <Fld label="Fecha de Conteo"><input style={S.input} type="date" value={formNuevoInv.fecha_conteo} onChange={e=>setFormNuevoInv(p=>({...p,fecha_conteo:e.target.value}))}/></Fld>
        <Fld label="Usuario que Cuenta"><input style={S.input} placeholder="Nombre de quien realiza el conteo" value={formNuevoInv.usuario_conteo} onChange={e=>setFormNuevoInv(p=>({...p,usuario_conteo:e.target.value}))}/></Fld>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
          <button style={S.btnG} onClick={()=>setModalNuevoInv(false)}>Cancelar</button>
          <button style={S.btn} onClick={crearInventario}>Crear Borrador</button>
        </div>
      </Modal>)}
    </>)}

    {modal&&(<Modal title={editId?"Editar Lote Cafe Fino":"Nuevo Lote Cafe Fino"} onClose={()=>setModal(false)}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Producto" half><input style={S.input} value={form.producto} onChange={e=>setForm(p=>({...p,producto:e.target.value}))}/></Fld>
        <Fld label="Tipo de Ingreso" half><select style={S.select} value={form.tipo_ingreso} onChange={e=>setForm(p=>({...p,tipo_ingreso:e.target.value}))}><option>Pergamino</option><option>Natural</option><option>Excelso</option></select></Fld>
        <Fld label="Proveedor / Origen" half><input style={S.input} value={form.proveedor} onChange={e=>setForm(p=>({...p,proveedor:e.target.value}))}/></Fld>
        <Fld label="kg Recibidos" half><input style={S.input} type="number" value={form.kg_producto} onChange={e=>setForm(p=>({...p,kg_producto:e.target.value}))}/></Fld>
        <Fld label="Costo de Compra / kg COP"><input style={S.input} type="number" value={form.costo_compra_kg} onChange={e=>setForm(p=>({...p,costo_compra_kg:e.target.value}))}/></Fld>
      </div>
      {!editId&&<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14}}><span style={{color:C.textDim,fontSize:12}}>Codigo generado: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:14}}>{genCod()}</span></div>}
      <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Fld>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button><button style={S.btn} onClick={reg}>{editId?"Guardar Cambios":"Registrar Lote"}</button></div>
    </Modal>)}

    {modalSalida&&selLote&&(<Modal title={(editSalidaId?"Editar Salida - ":"Registrar Salida - ")+selLote.codigo} onClose={()=>{setModalSalida(false);setEditSalidaId(null);setErrSalida("");}}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selLote.codigo} - {selLote.producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockDe(selLote))} kg</b></div>
      </div>
      {errSalida&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalida}</div>)}
      {alertaTipoIngreso&&(<div style={{background:C.goldBg,border:"2px solid "+C.gold,borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.navy,fontWeight:600,fontSize:13}}>&#9888; Este lote es <b>{selLote.tipo_ingreso}</b> (no Excelso). Los lotes {esBlendFino?"para Blend Café Fino":"para UBA Tostado"} deberían ser Excelso — normalmente este tipo pasa primero por Trilladora Café Fino. Puedes continuar si es un caso excepcional.</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalida.fecha} onChange={e=>setFormSalida(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Peso de Salida (kg)" half><input style={{...S.input,borderColor:errSalida?C.red:C.border2}} type="number" value={formSalida.peso_salida} onChange={e=>{setFormSalida(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalida.valor_kg||0)||""}));setErrSalida("");}}/></Fld>
        <Fld label="Valor por kg COP (auto)" half><input style={S.input} type="number" value={formSalida.valor_kg} onChange={e=>setFormSalida(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalida.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total COP" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={formSalida.valor_total} onChange={e=>setFormSalida(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalida.factura} onChange={e=>setFormSalida(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalida.remision} onChange={e=>setFormSalida(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalida.cliente} destinoKey={formSalida.destino_key} onChange={(v,k)=>setFormSalida(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        {esUbaTostado&&<Fld label="Nombre Producto Comercial Tostado (opcional)"><input style={{...S.input,borderColor:C.border2}} value={formSalida.nombre_producto_tostado} placeholder="Ej: Reserva Especial Tostado..." onChange={e=>setFormSalida(p=>({...p,nombre_producto_tostado:e.target.value}))}/></Fld>}
      </div>
      {esTrilladoraFino&&<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Este lote quedara disponible en Trilladora Cafe Fino para ser procesado.</div>}
      {esBlendFino&&<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Se creara automaticamente un lote disponible en Blend Cafe Fino.</div>}
      {esUbaTostado&&<div style={{background:C.orangeBg,border:"1px solid "+C.orange+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.orange,fontWeight:600,marginBottom:10}}>&#8505; Este lote quedara disponible en UBA Tostado para tostarse en uno o varios batches.</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalida(false);setEditSalidaId(null);setErrSalida("");setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",peso_salida:"",valor_kg:"",valor_total:"",nombre_producto_tostado:""});}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalida}>{editSalidaId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}

    {modalPre&&selLote&&(<Modal title={"Pre-Trilla - "+selLote.codigo} onClose={()=>setModalPre(false)}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selLote.codigo} - {selLote.producto}</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={formPre.fecha} onChange={e=>setFormPre(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Perfil de Taza" half><input style={S.input} value={formPre.perfil_taza} onChange={e=>setFormPre(p=>({...p,perfil_taza:e.target.value}))}/></Fld>
        <Fld label="Peso Muestra (gr)" half><input style={S.input} type="number" value={formPre.peso_muestra} onChange={e=>setFormPre(p=>({...p,peso_muestra:e.target.value}))}/></Fld>
        <Fld label="Almendra Sana (gr)" half><input style={S.input} type="number" value={formPre.almendra_sana} onChange={e=>setFormPre(p=>({...p,almendra_sana:e.target.value}))}/></Fld>
        <Fld label="Granos Brocados (gr)" half><input style={S.input} type="number" value={formPre.granos_brocados} onChange={e=>setFormPre(p=>({...p,granos_brocados:e.target.value}))}/></Fld>
        <Fld label="Granos Inmaduros/Reventados (gr)" half><input style={S.input} type="number" value={formPre.granos_inmaduros} onChange={e=>setFormPre(p=>({...p,granos_inmaduros:e.target.value}))}/></Fld>
        <Fld label="Inferiores (gr)" half><input style={S.input} type="number" value={formPre.inferiores} onChange={e=>setFormPre(p=>({...p,inferiores:e.target.value}))}/></Fld>
        <Fld label="Gr Merma" half><input style={S.input} type="number" value={formPre.gr_merma} onChange={e=>setFormPre(p=>({...p,gr_merma:e.target.value}))}/></Fld>
      </div>
      {alertaPesosPre&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; Revisar pesos: la suma de almendra sana + brocados + inmaduros/reventados + inferiores + merma ({fmt(sumaComponentesPre)} gr) supera el peso de la muestra ({fmt(+formPre.peso_muestra||0)} gr).</div>)}
      <div style={{background:C.bg,borderRadius:6,padding:12,marginTop:4,border:"1px solid "+C.border}}>
        <div style={{color:C.textDim,fontSize:11,fontWeight:600,marginBottom:8}}>CALCULOS AUTOMATICOS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
          <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>Total Pasilla</div><div style={{color:C.orange,fontWeight:700,fontSize:14}}>{fmt(totalPasillaPre)} gr</div></div>
          <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>Factor Pre-Trilla</div><div style={{color:C.green,fontWeight:700,fontSize:14}}>{fmt(factorPre,1)}</div></div>
          <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>% Merma</div><div style={{color:C.red,fontWeight:700,fontSize:14}}>{fmt(pctMermaPre,1)}%</div></div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:14}}><button style={S.btnG} onClick={()=>setModalPre(false)}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={guardarPre}>Guardar Pre-Trilla</button></div>
    </Modal>)}
  </div>);
}
