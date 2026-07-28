import{useState,useEffect}from"react";
import{C,S}from"../../theme";
import{KPI,Bdg,Fld,Modal,TablaScrollV,SelectDestino}from"../ui";
import{fmt,fmtCOP,numVal,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{semanaISO,mesDe,mesTrillaDe}from"../../lib/dates";
import{calcCosto,calcCostoTri,getSeedCostoTri}from"../../lib/costing";
import{pesoATrilladora}from"../../lib/stock";
import*as XLSX from"xlsx";
import{jsPDF}from"jspdf";
import autoTable from"jspdf-autotable";
/* FIX 1: Bodega Trilladora - nueva seccion */
export function BodegaTrilladora({lotes,setLotes,costos,setLotesFino,inventariosMensuales,setInventariosMensuales}){
  const [selLoteT,setSelLoteT]=useState(null);
  const [modalSalidaT,setModalSalidaT]=useState(false);
  const [formSalidaT,setFormSalidaT]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",observaciones:""});
  const [errSalidaT,setErrSalidaT]=useState("");
  const [editSalidaTId,setEditSalidaTId]=useState(null);
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const [hBusqT,setHBusqT]=useState("");const [hMesT,setHMesT]=useState("");const [hProdT,setHProdT]=useState("");
  const trilledLotes=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const mesesT=[...new Set(trilledLotes.map(l=>mesTrillaDe(l)).filter(Boolean))].sort();
  const productosT=[...new Set(trilledLotes.map(l=>l.producto).filter(Boolean))].sort();
  const grupoDe=(l)=>[l,...lotes.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
  const stockGrupoDe=(l)=>{
    const grupo=grupoDe(l);
    const excelsoTotal=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
    const salTotal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
    return excelsoTotal-salTotal;
  };
  const construirGruposT=(arr)=>{
    const vistos=new Set();const grupos=[];
    arr.forEach(l=>{if(vistos.has(l.id))return;const grupo=grupoDe(l);grupo.forEach(x=>vistos.add(x.id));grupos.push(grupo);});
    return grupos;
  };
  const gruposTFiltrados=construirGruposT(trilledLotes).filter(grupo=>{
    if(filtroMes&&!grupo.some(l=>mesTrillaDe(l)===filtroMes))return false;
    if(filtroProducto&&!grupo.some(l=>l.producto===filtroProducto))return false;
    if(busqueda&&!grupo.some(l=>l.codigo.toLowerCase().includes(busqueda.toLowerCase())))return false;
    return true;
  });
  const costoKgExDe=(l)=>{const cl=calcCosto(l,costos,lotes);const t=l.trilla;const D=calcCostoTri(mesTrillaDe(l),costos,lotes).costoTriKg;return cl&&t?.kg_excelso>0?Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D):0;};
  const stockTrilladora=(l)=>(l.trilla?.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0);
  const totalExcelso=trilledLotes.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  // Excluye "ajuste_inventario" de las salidas "reales" — el ajuste corrige el stock pero no es
  // una salida/venta real, no debe mezclarse en el KPI de Valor Salidas.
  const totalValorSalidasT=trilledLotes.reduce((s,l)=>s+(l.salidas_trilladora||[]).filter(b=>b.destino_key!=="ajuste_inventario").reduce((a,b)=>a+(b.valor_total||0),0),0);
  const stockActual=trilledLotes.reduce((s,l)=>{const stock=stockTrilladora(l);const costoKg=costoKgExDe(l);return {kg:s.kg+stock,val:s.val+(costoKg*stock)};},{kg:0,val:0});
  // Costo Total/kg ponderado del grupo (mismo calculo usado en la tabla principal) — se reutiliza
  // tal cual en el Acta de Inventario (PDF) para que el valor no se recalcule con otra formula.
  const costoKgGrupoDe=(grupo)=>{
    const repr=grupo[0];
    const excelsoGrupo=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
    const efPeso=(x)=>pesoATrilladora(x)||(x.trilla?.kg_excelso||0);
    const efCostoKg=(x)=>{const p=pesoATrilladora(x);const cl=calcCosto(x,costos,lotes);if(p>0&&cl?.total>0)return cl.total;const stored=x.trilla?.costo_kg_excelso||0;return stored>0?stored:getSeedCostoTri(x.codigo,x.kg_producto);};
    const pesoEf=grupo.reduce((s,x)=>s+efPeso(x),0);
    const costoTotalGrupo=grupo.reduce((s,x)=>s+efCostoKg(x)*efPeso(x),0);
    const D=calcCostoTri(mesTrillaDe(repr),costos,lotes).costoTriKg;
    return excelsoGrupo>0?Math.round(costoTotalGrupo/excelsoGrupo)+Math.round(D):0;
  };

  // Accion manual de una sola vez: recalcula costo_kg_excelso/valor_total de TODOS los cortes
  // ya trillados usando el mes real de fecha_trilla (mesTrillaDe) en vez del mes de recepcion
  // de cereza (l.mes) que se usaba antes por error al llamar calcCostoTri.
  const recalcularCostosTrilla=()=>{
    if(!window.confirm("¿Recalcular el Costo Trilladora/kg de TODOS los cortes ya trillados usando el mes real de la fecha de trilla? Esto sobrescribe el costo guardado de cada lote trillado."))return;
    const grupos=construirGruposT(trilledLotes);
    setLotes(prev=>{
      const efPeso=(x)=>pesoATrilladora(x)||(x.trilla?.kg_excelso||0);
      const efCostoKg=(x)=>{const p=pesoATrilladora(x);const cl=calcCosto(x,costos,lotes);if(p>0&&cl?.total>0)return cl.total;const stored=x.trilla?.costo_kg_excelso||0;return stored>0?stored:getSeedCostoTri(x.codigo,x.kg_producto);};
      let next=[...prev];
      grupos.forEach(grupo=>{
        const repr=grupo[0];
        const costoTotalGrupo=grupo.reduce((s,x)=>s+efCostoKg(x)*efPeso(x),0);
        const excelsoGrupo=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
        const D=calcCostoTri(mesTrillaDe(repr),costos,lotes).costoTriKg;
        const costoKgEx=excelsoGrupo>0?Math.round(costoTotalGrupo/excelsoGrupo)+Math.round(D):0;
        next=next.map(l=>grupo.some(g=>g.id===l.id)?{...l,trilla:{...l.trilla,costo_kg_excelso:costoKgEx,valor_total:costoKgEx*(l.trilla?.kg_excelso||0)}}:l);
      });
      return next;
    });
    alert("Costos de Trilladora recalculados con el mes correcto.");
  };

  const abrirSalidaT=(l)=>{
    const stock=stockGrupoDe(l);
    if(stock<=0)return;
    setSelLoteT(l);
    setEditSalidaTId(null);
    setFormSalidaT({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:costoKgExDe(l)||"",valor_total:"",observaciones:""});
    setErrSalidaT("");
    setModalSalidaT(true);
  };
  const abrirEditarSalidaT=(l,s)=>{
    setSelLoteT(l);
    setEditSalidaTId(s.id);
    setFormSalidaT({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total,observaciones:s.observaciones||""});
    setErrSalidaT("");
    setModalSalidaT(true);
  };
  const eliminarSalidaT=(loteId,salidaId)=>{
    if(!window.confirm("¿Eliminar esta salida? Esta acción no se puede deshacer."))return;
    setLotes(p=>p.map(l=>l.id===loteId?{...l,salidas_trilladora:(l.salidas_trilladora||[]).filter(s=>s.id!==salidaId)}:l));
  };
  const regSalidaT=()=>{
    const peso=numVal(formSalidaT.peso_salida);
    if(!selLoteT||!(peso>0)){setErrSalidaT("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockGrupoDe(selLoteT)+(editSalidaTId?(selLoteT.salidas_trilladora||[]).find(x=>x.id===editSalidaTId)?.peso_salida||0:0);
    if(peso>stockBase){setErrSalidaT("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaT.valor_kg||0;
    const vtotal=vkg>0?peso*vkg:(+formSalidaT.valor_total||0);
    setLotes(p=>p.map(l=>{
      if(l.id!==selLoteT.id)return l;
      let sal;
      if(editSalidaTId){sal=(l.salidas_trilladora||[]).map(s=>s.id===editSalidaTId?{...s,fecha:formSalidaT.fecha,factura:formSalidaT.factura,remision:formSalidaT.remision,cliente:formSalidaT.cliente,destino_key:formSalidaT.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaT.observaciones}:s);}
      else{sal=[...(l.salidas_trilladora||[]),{id:genId(),fecha:formSalidaT.fecha,factura:formSalidaT.factura,remision:formSalidaT.remision,cliente:formSalidaT.cliente,destino_key:formSalidaT.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaT.observaciones}];}
      return{...l,salidas_trilladora:sal};
    }));
    // Auto-transferencia a Bodega Café Fino cuando destino = "café fino" — conserva el codigo original (item 3) y trazabilidad (item 5)
    if(formSalidaT.destino_key==="bodega_cf"){
      const fSalT=formSalidaT.fecha||today();
      setLotesFino(p=>[{id:genId(),codigo:selLoteT?.codigo||("CF-"+dateToCode(fSalT)),fecha:fSalT,mes:mesDe(fSalT),semana:semanaISO(fSalT),producto:selLoteT?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:vkg||0,valor_total:vtotal,notas:"Transferido desde Bodega Trilladora — "+selLoteT?.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],trazabilidad:{codigo_lote_origen:selLoteT?.codigo||"",fecha_proceso:selLoteT?.fecha_proceso||"",fecha_trilla:selLoteT?.trilla?.fecha_trilla||"",fecha_secado:selLoteT?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    setModalSalidaT(false);setEditSalidaTId(null);setErrSalidaT("");
  };

  // ═══ Inventario Mensual (mismo patron de Bodega Milan, adaptado a grupos combinados) ═══
  // La entidad del arqueo es el GRUPO (lote representante + sus lotes_combinados), no el lote
  // individual — se cuenta el excelso combinado del grupo, igual que la tabla principal.
  // Al cerrar el inventario se genera una salida sintetica en salidas_trilladora del lote
  // REPRESENTANTE del grupo (destino_key:"ajuste_inventario"), misma logica de signo que
  // Bodega Milan: peso_salida=-diferencia_kg.
  const [modalNuevoInv,setModalNuevoInv]=useState(false);
  const [formNuevoInv,setFormNuevoInv]=useState({fecha_conteo:today(),usuario_conteo:""});
  const [selInvId,setSelInvId]=useState(null);
  const semaforoDe=(pct)=>{const a=Math.abs(pct);if(a<=2)return"verde";if(a<=5)return"amarillo";return"rojo";};
  const SEM_COL={verde:C.green,amarillo:C.gold,rojo:C.red};
  const SEM_BG={verde:C.greenBg,amarillo:C.goldBg,rojo:C.redBg};
  const SEM_LABEL={verde:"OK",amarillo:"Revisar",rojo:"Critico"};
  const inventariosT=(inventariosMensuales||[]).filter(i=>i.modulo==="trilladora");
  const invActivo=inventariosT.find(i=>i.id===selInvId)||null;
  const [detalleLocal,setDetalleLocal]=useState(null);
  const [busquedaInv,setBusquedaInv]=useState("");
  useEffect(()=>{setDetalleLocal(invActivo?invActivo.detalle:null);setBusquedaInv("");},[invActivo?.id]);
  const guardarDetalle=()=>{
    if(!invActivo||!detalleLocal)return;
    setInventariosMensuales(p=>p.map(x=>x.id===invActivo.id?{...x,detalle:detalleLocal}:x));
  };
  const crearInventario=()=>{
    if(!formNuevoInv.fecha_conteo||!formNuevoInv.usuario_conteo.trim())return;
    const gruposActivos=construirGruposT(trilledLotes); // todos los grupos, sin filtro de busqueda
    const detalle=gruposActivos.map(grupo=>{
      const repr=grupo[0];
      const t=repr.trilla;
      return {
        grupo_repr_id:repr.id,
        lote_codigo:t.nombre_trillado||repr.codigo,
        producto:repr.producto||"",
        stock_teorico:stockGrupoDe(repr),
        stock_fisico:null,
        diferencia_kg:0,
        diferencia_pct:0,
        estado_semaforo:null,
        nota_justificacion:"",
        fecha_conteo:formNuevoInv.fecha_conteo
      };
    });
    const nuevo={id:genId(),modulo:"trilladora",mes:mesDe(formNuevoInv.fecha_conteo),anio:new Date(formNuevoInv.fecha_conteo+"T00:00:00").getFullYear(),seccion:"trilladora",fecha_conteo:formNuevoInv.fecha_conteo,usuario_conteo:formNuevoInv.usuario_conteo.trim(),estado:"borrador",detalle};
    setInventariosMensuales(p=>[nuevo,...(p||[])]);
    setSelInvId(nuevo.id);
    setModalNuevoInv(false);
    setFormNuevoInv({fecha_conteo:today(),usuario_conteo:""});
  };
  const actualizarDetalleInv=(grupoReprId,campo,valor)=>{
    setDetalleLocal(prev=>(prev||[]).map(d=>{
      if(d.grupo_repr_id!==grupoReprId)return d;
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
    if(pendientes.length>0){alert("Faltan "+pendientes.length+" grupo(s) por contar antes de cerrar.");return;}
    const sinJustificar=inv.detalle.filter(d=>d.estado_semaforo!=="verde"&&!d.nota_justificacion?.trim());
    if(sinJustificar.length>0){alert("Hay "+sinJustificar.length+" grupo(s) con diferencia significativa (amarillo/rojo) sin nota de justificacion. Agrega la nota antes de cerrar.");return;}
    if(!window.confirm("¿Cerrar este inventario? Se generara un ajuste de stock en Bodega Trilladora para cada grupo con diferencia, y ya no se podra editar salvo que lo reabras."))return;
    const fechaCierre=today();
    const mesNum=String(new Date(inv.fecha_conteo+"T00:00:00").getMonth()+1).padStart(2,"0");
    const factura="AJUSTE-INV-"+mesNum+"-"+inv.anio;
    const ajustesPorGrupo={};
    inv.detalle.forEach(d=>{if(d.diferencia_kg!==0)ajustesPorGrupo[d.grupo_repr_id]=d.diferencia_kg;});
    setLotes(p=>p.map(l=>{
      if(!(l.id in ajustesPorGrupo))return l;
      const pesoAjuste=-ajustesPorGrupo[l.id];
      const nuevaSalida={id:genId(),fecha:fechaCierre,factura,remision:"",cliente:"Ajuste de Inventario",destino_key:"ajuste_inventario",peso_salida:pesoAjuste,valor_kg:0,valor_total:0};
      return{...l,salidas_trilladora:[...(l.salidas_trilladora||[]),nuevaSalida]};
    }));
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,detalle:inv.detalle,estado:"cerrado",fecha_cierre:fechaCierre}:x));
  };
  // Exporta la planilla de conteo en blanco (Excel) para diligenciar en campo
  const exportarPlanillaExcel=(inv)=>{
    const data=inv.detalle.map(d=>({"Codigo Trillado":d.lote_codigo,"Producto":d.producto||"","Stock Teorico (kg)":+d.stock_teorico.toFixed(1),"Stock Fisico (kg)":""}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),"Planilla Conteo");
    XLSX.writeFile(wb,"Planilla-Inventario-Trilladora-"+(inv.mes||"")+"-"+inv.anio+".xlsx");
  };
  // Exporta el Acta de Inventario (PDF) una vez cerrado. Valor unitario = costoKgGrupoDe(grupo),
  // el mismo Costo Total/kg ponderado que ya muestra la tabla principal de Bodega Trilladora.
  const exportarActaPDF=(inv)=>{
    const detalle=inv.detalle;
    const kgFisicoTotal=detalle.reduce((s,d)=>s+(d.stock_fisico||0),0);
    const kgTeoricoTotal=detalle.reduce((s,d)=>s+d.stock_teorico,0);
    const difTotalKg=kgFisicoTotal-kgTeoricoTotal;
    const gruposActuales=construirGruposT(trilledLotes);
    const valorTotal=detalle.reduce((s,d)=>{
      const grupo=gruposActuales.find(g=>g[0].id===d.grupo_repr_id);
      const costoKg=grupo?costoKgGrupoDe(grupo):0;
      return s+(costoKg*(d.stock_fisico||0));
    },0);
    const significativos=detalle.filter(d=>d.estado_semaforo&&d.estado_semaforo!=="verde");
    const porProducto={};
    detalle.forEach(d=>{const p=d.producto||"Sin Producto";porProducto[p]=(porProducto[p]||0)+(d.stock_fisico||0);});
    const mesLabel=(inv.mes||"").charAt(0).toUpperCase()+(inv.mes||"").slice(1);

    const doc=new jsPDF();
    doc.setFont("helvetica","bold");doc.setFontSize(16);
    doc.text("CafeUba — Bodega Trilladora",14,18);
    doc.setFont("helvetica","normal");doc.setFontSize(12);
    doc.text("Acta de Inventario Mensual - Excelso",14,26);
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
      doc.text("Sin diferencias significativas — todos los grupos dentro del margen aceptable (<=2%).",14,y+7);
      y+=16;
    }else{
      autoTable(doc,{
        startY:y+4,
        head:[["Codigo Trillado","Producto","Teorico kg","Fisico kg","Dif. kg","Dif. %","Nota"]],
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

    doc.save("Acta-Inventario-Trilladora-"+(inv.mes||"")+"-"+inv.anio+".pdf");
  };
  // Reabrir NO revierte el ajuste de stock ya generado al cerrar — solo vuelve el documento a
  // "borrador" para poder corregir datos. Si se vuelve a cerrar, se genera un ajuste ADICIONAL.
  const reabrirInventario=(inv)=>{
    if(!window.confirm("Este inventario ya genero un ajuste de stock. Reabrir y volver a cerrar generara un ajuste ADICIONAL, no un reemplazo. ¿Continuar?"))return;
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,estado:"borrador"}:x));
  };

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO</div>
        <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Bodega Trilladora - Excelso</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Inventario de cafe excelso con costo total de produccion</div>
      </div>
      <button style={{...S.btnG,fontSize:12}} onClick={recalcularCostosTrilla}>↻ Recalcular Costos de Trilla (mes correcto)</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Excelso Total kg" value={fmt(totalExcelso)+" kg"} col={C.green}/>
      <KPI label="Stock Disponible kg" value={fmt(stockActual.kg)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock Disponible" value={fmtCOP(stockActual.val)} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidasT)} col={C.purple}/>
      <KPI label="Costo Prom/kg Ex" value={stockActual.kg>0?fmtCOP(Math.round(stockActual.val/stockActual.kg)):"—"} col={C.teal}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"],["inventario_mensual","Inventario Mensual"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesT.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosT.map(p=>(<option key={p}>{p}</option>))}</select>
      {(filtroMes||filtroProducto||busqueda)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMes("");setFiltroProducto("");setBusqueda("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{gruposTFiltrados.length} de {construirGruposT(trilledLotes).length} grupos</span>
    </div>
    {(filtroMes||filtroProducto||busqueda)&&(()=>{
      const sumTExc=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.trilla?.kg_excelso||0),0),0);
      const sumTSalTodas=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+c.peso_salida,0),0),0);
      const sumTSal=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).filter(b=>b.destino_key!=="ajuste_inventario").reduce((b,c)=>b+c.peso_salida,0),0),0);
      const sumTStk=sumTExc-sumTSalTodas;
      const sumTValSal=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).filter(b=>b.destino_key!=="ajuste_inventario").reduce((b,c)=>b+(c.valor_total||0),0),0),0);
      const sumTValStk=gruposTFiltrados.reduce((s,g)=>{
        const excelsoG=g.reduce((a,x)=>a+(x.trilla?.kg_excelso||0),0);
        const salG=g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+c.peso_salida,0),0);
        const stk=excelsoG-salG;
        const costoTG=g.reduce((a,x)=>{const cl=calcCosto(x,costos,lotes);return a+(cl?cl.total*pesoATrilladora(x):0);},0);
        const D=calcCostoTri(mesTrillaDe(g[0]),costos,lotes).costoTriKg;
        const costoKgEx=excelsoG>0?Math.round(costoTG/excelsoG)+Math.round(D):0;
        return s+(stk*costoKgEx);
      },0);
      return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>GRUPOS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{gruposTFiltrados.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG EXCELSO</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumTExc)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumTStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR STOCK</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumTValStk))}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumTSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumTValSal)}</div></div>
      </div>);
    })()}
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Inventario por Lote</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>
        {["Codigo Lote","Cod. Trillado","Fecha Trilla","Corte","Mes","Producto","Fincas","kg Excelso","Costo MP/kg","Costo Trilladora/kg (D)","Costo Total/kg","Valor Total Lote","Salidas kg","Stock kg","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
      </tr></thead>
      <tbody>{gruposTFiltrados.map(grupo=>{
        const repr=grupo[0];
        const t=repr.trilla;
        const excelsoGrupo=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
        const efPeso=(x)=>pesoATrilladora(x)||(x.trilla?.kg_excelso||0);
        const efCostoKg=(x)=>{const p=pesoATrilladora(x);const cl=calcCosto(x,costos,lotes);if(p>0&&cl?.total>0)return cl.total;const stored=x.trilla?.costo_kg_excelso||0;return stored>0?stored:getSeedCostoTri(x.codigo,x.kg_producto);};
        const pesoEf=grupo.reduce((s,x)=>s+efPeso(x),0);
        const costoTotalGrupo=grupo.reduce((s,x)=>s+efCostoKg(x)*efPeso(x),0);
        const aProm=pesoEf>0?costoTotalGrupo/pesoEf:null;
        const D=calcCostoTri(mesTrillaDe(repr),costos,lotes).costoTriKg;
        const costoKgEx=excelsoGrupo>0?Math.round(costoTotalGrupo/excelsoGrupo)+Math.round(D):0;
        const fi=[...new Set(grupo.flatMap(x=>x.cereza.map(c=>c.finca)))];
        const salGrupo=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
        const stock=excelsoGrupo-salGrupo;
        return(<tr key={repr.id}>
          <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.accent} bg={C.accentBg}/>))}</div></td>
          <td style={{...S.td,color:C.green,fontWeight:600,fontFamily:"monospace",fontSize:11}}>{t.nombre_trillado||"—"}</td>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(t.fecha_trilla)}</td>
          <td style={S.td}><Bdg label={t.codigo_corte||"—"} col={C.accent}/></td>
          <td style={{...S.td,textTransform:"capitalize"}}>{mesTrillaDe(repr)}</td>
          <td style={S.td}><Bdg label={repr.producto} col={C.teal} bg={C.tealBg}/></td>
          <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td>
          <td style={{...S.td,fontWeight:700,color:C.green,fontSize:15}}>{fmt(excelsoGrupo)} kg</td>
          <td style={{...S.td,color:C.orange}}>{aProm!=null?fmtCOP(Math.round(aProm)):"—"}</td>
          <td style={{...S.td,color:C.teal,fontWeight:600}}>{D?fmtCOP(Math.round(D)):"—"}</td>
          <td style={{...S.td,color:C.gold,fontWeight:700,fontSize:13}}>{fmtCOP(costoKgEx)}</td>
          <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(costoKgEx*excelsoGrupo)}</td>
          <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(salGrupo)}</td>
          <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
          <td style={S.td}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaT(repr)}>+ Salida</button></td>
        </tr>);
      })}</tbody></table></TablaScrollV>
    </div></>)}
    {tab==="historico"&&(()=>{const todasHT=trilledLotes.flatMap(l=>(l.salidas_trilladora||[]).map(s=>({...s,codigo:l.codigo,producto:l.producto,loteRef:l}))).sort((a,b)=>b.fecha.localeCompare(a.fecha));const mesesHT=[...new Set(todasHT.map(s=>mesDe(s.fecha)).filter(Boolean))].sort();const prodsHT=[...new Set(todasHT.map(s=>s.producto).filter(Boolean))].sort();const filtHT=todasHT.filter(s=>{if(hMesT&&mesDe(s.fecha)!==hMesT)return false;if(hProdT&&s.producto!==hProdT)return false;if(hBusqT){const q=hBusqT.toLowerCase();if(!s.codigo?.toLowerCase().includes(q)&&!s.cliente?.toLowerCase().includes(q)&&!(s.factura||"").toLowerCase().includes(q))return false;}return true;});return todasHT.length===0?(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>):(<div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontWeight:600,fontSize:14,color:C.navy}}>Historico de Salidas - Trilladora</span><span style={{color:C.textFaint,fontSize:12}}>{filtHT.length} de {todasHT.length} salidas</span></div><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}><input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar lote, cliente, factura..." value={hBusqT} onChange={e=>setHBusqT(e.target.value)}/><select style={{...S.select,width:140}} value={hMesT} onChange={e=>setHMesT(e.target.value)}><option value="">Todos los meses</option>{mesesHT.map(m=>(<option key={m}>{m}</option>))}</select><select style={{...S.select,width:160}} value={hProdT} onChange={e=>setHProdT(e.target.value)}><option value="">Todos los productos</option>{prodsHT.map(p=>(<option key={p}>{p}</option>))}</select>{(hBusqT||hMesT||hProdT)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setHBusqT("");setHMesT("");setHProdT("");}}>✕ Limpiar</button>}</div>{(hBusqT||hMesT||hProdT)&&filtHT.length>0&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>SALIDAS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{filtHT.length}</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(filtHT.reduce((s,x)=>s+x.peso_salida,0))} kg</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(filtHT.reduce((s,x)=>s+(x.valor_total||0),0))}</div></div></div>)}<TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{filtHT.map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaT(s.loteRef,s)}>Editar</button> <button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminarSalidaT(s.loteRef.id,s.id)}>Eliminar</button></td></tr>))}</tbody></table></TablaScrollV></div>);})()}
    {tab==="inventario_mensual"&&(<>
      {!invActivo?(<>
        <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Inventario Mensual — Bodega Trilladora</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Arqueo de existencias: compara el stock teorico del sistema (por grupo) contra el conteo fisico</div></div>
          <button style={S.btn} onClick={()=>{setFormNuevoInv({fecha_conteo:today(),usuario_conteo:""});setModalNuevoInv(true);}}>+ Nuevo Inventario Mensual</button>
        </div>
        {inventariosT.length===0?(
          <div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin inventarios mensuales registrados todavia. Usa el boton para crear el primer arqueo.</div>
        ):(
          <div style={S.card}>
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr>
              {["Mes","Fecha Conteo","Usuario","Estado","Grupos","Contados","Rojo/Amarillo",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}
            </tr></thead>
            <tbody>{[...inventariosT].sort((a,b)=>(b.fecha_conteo||"").localeCompare(a.fecha_conteo||"")).map(inv=>{
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
            <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo trillado..." value={busquedaInv} onChange={e=>setBusquedaInv(e.target.value)}/>
            <span style={{color:C.textFaint,fontSize:12,whiteSpace:"nowrap"}}>{detalleFiltrado.length} de {detalleView.length} grupos</span>
          </div>
          <div style={S.card}>
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>
              {["Codigo Trillado","Producto","Stock Teorico kg","Stock Fisico kg","Diferencia kg","Diferencia %","Estado","Nota Justificacion"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
            </tr></thead>
            <tbody>{detalleFiltrado.map(d=>(
              <tr key={d.grupo_repr_id}>
                <td style={{...S.td,fontWeight:700,color:C.accent,fontFamily:"monospace"}}>{d.lote_codigo}</td>
                <td style={S.td}><Bdg label={d.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
                <td style={{...S.td,textAlign:"right",color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{fmt(d.stock_teorico)} kg</td>
                <td style={S.td}>{bloqueado?(<span style={{fontWeight:700}}>{d.stock_fisico!=null?fmt(d.stock_fisico)+" kg":"—"}</span>):(<input style={{...S.input,width:110,padding:"6px 8px"}} type="number" step="0.1" placeholder="kg" value={d.stock_fisico??""} onChange={e=>actualizarDetalleInv(d.grupo_repr_id,"stock_fisico",e.target.value)} onBlur={guardarDetalle}/>)}</td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,color:d.stock_fisico==null?C.textFaint:d.diferencia_kg===0?C.textDim:d.diferencia_kg>0?C.green:C.red,fontVariantNumeric:"tabular-nums"}}>{d.stock_fisico!=null?fmt(d.diferencia_kg):"—"}</td>
                <td style={{...S.td,textAlign:"right",color:d.stock_fisico==null?C.textFaint:C.textDim,fontVariantNumeric:"tabular-nums"}}>{d.stock_fisico!=null?d.diferencia_pct.toFixed(1)+"%":"—"}</td>
                <td style={S.td}>{d.estado_semaforo?(<Bdg label={SEM_LABEL[d.estado_semaforo]} col={SEM_COL[d.estado_semaforo]} bg={SEM_BG[d.estado_semaforo]}/>):(<span style={{color:C.textFaint,fontSize:11}}>Pendiente</span>)}</td>
                <td style={S.td}>{bloqueado?(<span style={{color:C.textDim,fontSize:12}}>{d.nota_justificacion||"—"}</span>):(<input style={{...S.input,minWidth:180}} placeholder={d.estado_semaforo&&d.estado_semaforo!=="verde"?"Obligatorio: explica la diferencia":"Opcional"} value={d.nota_justificacion} onChange={e=>actualizarDetalleInv(d.grupo_repr_id,"nota_justificacion",e.target.value)} onBlur={guardarDetalle}/>)}</td>
              </tr>
            ))}</tbody></table></TablaScrollV>
          </div>
        </>);
      })()}
      {modalNuevoInv&&(<Modal title="Nuevo Inventario Mensual" onClose={()=>setModalNuevoInv(false)}>
        <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.textDim}}>Se creara un borrador con el stock teorico actual de los {construirGruposT(trilledLotes).length} grupos activos de Bodega Trilladora. El conteo fisico y las notas se completan despues.</div>
        <Fld label="Fecha de Conteo"><input style={S.input} type="date" value={formNuevoInv.fecha_conteo} onChange={e=>setFormNuevoInv(p=>({...p,fecha_conteo:e.target.value}))}/></Fld>
        <Fld label="Usuario que Cuenta"><input style={S.input} placeholder="Nombre de quien realiza el conteo" value={formNuevoInv.usuario_conteo} onChange={e=>setFormNuevoInv(p=>({...p,usuario_conteo:e.target.value}))}/></Fld>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
          <button style={S.btnG} onClick={()=>setModalNuevoInv(false)}>Cancelar</button>
          <button style={S.btn} onClick={crearInventario}>Crear Borrador</button>
        </div>
      </Modal>)}
    </>)}

    {modalSalidaT&&selLoteT&&(<Modal title={(editSalidaTId?"Editar Salida Trilladora - ":"Registrar Salida Trilladora - ")+selLoteT.codigo} onClose={()=>{setModalSalidaT(false);setEditSalidaTId(null);setErrSalidaT("");}}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selLoteT.codigo} - {selLoteT.producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockGrupoDe(selLoteT))} kg</b></div>
      </div>
      {errSalidaT&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalidaT}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalidaT.fecha} onChange={e=>setFormSalidaT(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Venta/Salida" half>
          <input style={{...S.input,borderColor:errSalidaT?C.red:C.border2}} type="number" value={formSalidaT.peso_salida} onChange={e=>{setFormSalidaT(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalidaT.valor_kg||0)||""}));setErrSalidaT("");}}/>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Max: {fmt(stockGrupoDe(selLoteT))} kg</div>
        </Fld>
        <Fld label="Precio por Unidad (kg COP)" half><input style={S.input} type="number" value={formSalidaT.valor_kg} onChange={e=>setFormSalidaT(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalidaT.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total Salida" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" placeholder="Calculado automatico" value={formSalidaT.valor_total} onChange={e=>setFormSalidaT(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalidaT.factura} placeholder="FAC-001" onChange={e=>setFormSalidaT(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalidaT.remision} placeholder="REM-001" onChange={e=>setFormSalidaT(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalidaT.cliente} destinoKey={formSalidaT.destino_key} onChange={(v,k)=>setFormSalidaT(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formSalidaT.observaciones} onChange={e=>setFormSalidaT(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      {formSalidaT.destino_key==="blend"&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Destino Blend: este excelso quedara disponible para usar en la seccion Blend</div>)}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalidaT(false);setEditSalidaTId(null);setErrSalidaT("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaT}>{editSalidaTId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}
  </div>);
}
