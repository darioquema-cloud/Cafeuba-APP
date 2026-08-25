import{useState,useEffect}from"react";
import{C,S}from"../../theme";
import{TIPOS_TOSTION}from"../../data/constants";
import{fmtCOP,fmt,numVal,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{Bdg,Fld,KPI,KPIDoble,Modal,TablaScrollV,SelectDestino}from"../ui";
import*as XLSX from"xlsx";
import{jsPDF}from"jspdf";
import autoTable from"jspdf-autotable";
const grupoDeFino=(lotesFino,l)=>[l,...lotesFino.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
const poolBlendFino=(lotesFino,blendsFino,editId)=>{
  const pool=[];
  lotesFino.filter(l=>l.trilla?.kg_excelso>0).forEach(l=>{
    (l.salidas_trilladora||[]).filter(s=>s.destino_key==="blend_cf").forEach(s=>{
      pool.push({key:"finolote:sal:"+s.id,salidaId:s.id,reprId:l.id,codigo:l.trilla.nombre_trillado||l.codigo,producto:l.producto,kg_total:s.peso_salida,valor_kg:s.valor_kg,fecha:s.fecha,tipo:"finolote"});
    });
  });
  lotesFino.filter(l=>!l.para_trilladora&&!l.trilla?.kg_excelso).forEach(l=>{
    (l.salidas_bodega||[]).filter(s=>s.destino_key==="blend_cf").forEach(s=>{
      pool.push({key:"bodegabf:sal:"+s.id,salidaId:s.id,reprId:l.id,codigo:l.codigo,producto:l.producto,kg_total:s.peso_salida,valor_kg:s.valor_kg,fecha:s.fecha,tipo:"bodegabf"});
    });
  });
  (blendsFino||[]).filter(b=>b.id!==editId).forEach(b=>{
    const stock=b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
    if(stock>0){
      pool.push({key:"finoblend:"+b.id,reprId:b.id,codigo:b.codigo,producto:b.producto_comercial||b.nombre,kg_total:stock,valor_kg:Math.round(b.costo_kg)||0,fecha:b.fecha,tipo:"finoblend"});
    }
  });
  return pool;
};
export function BlendFino({lotesFino,setLotesFino,blendsFino,setBlendsFino,setBlendsTostado,inventariosMensuales,setInventariosMensuales}){
  const [filMesBF,setFilMesBF]=useState("");
  const [filNomComBF,setFilNomComBF]=useState("");
  const [busqBF,setBusqBF]=useState("");
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [nombre,setNombre]=useState("");
  const [fecha,setFecha]=useState(today());
  const [productoComercial,setProductoComercial]=useState("");
  const [items,setItems]=useState([]);
  const [errBlendForm,setErrBlendForm]=useState("");
  const [modalSalidaB,setModalSalidaB]=useState(false);
  const [selBlend,setSelBlend]=useState(null);
  const [formSalidaB,setFormSalidaB]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",observaciones:"",nombre_producto_tostado:""});
  const [errB,setErrB]=useState("");
  const [editSalidaBId,setEditSalidaBId]=useState(null);
  const [tab,setTab]=useState("inventario");
  const [hBusqBF,setHBusqBF]=useState("");const [hMesBF,setHMesBF]=useState("");const [hProdBF,setHProdBF]=useState("");

  const stockBlend=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);

  // ═══ Inventario Mensual (mismo patron de Bodega Milan / Trilladora / Blend / Bodega CF / Trilladora CF) ═══
  // La entidad del arqueo es el BLEND (1:1, sin agrupacion), identificada por b.codigo.
  // Al cerrar se genera una salida sintetica en b.salidas del blend contado
  // (destino_key:"ajuste_inventario"), misma logica de signo: peso_salida=-diferencia_kg.
  const [modalNuevoInv,setModalNuevoInv]=useState(false);
  const [formNuevoInv,setFormNuevoInv]=useState({fecha_conteo:today(),usuario_conteo:""});
  const [selInvId,setSelInvId]=useState(null);
  const semaforoDe=(pct)=>{const a=Math.abs(pct);if(a<=2)return"verde";if(a<=5)return"amarillo";return"rojo";};
  const SEM_COL={verde:C.green,amarillo:C.gold,rojo:C.red};
  const SEM_BG={verde:C.greenBg,amarillo:C.goldBg,rojo:C.redBg};
  const SEM_LABEL={verde:"OK",amarillo:"Revisar",rojo:"Critico"};
  const inventariosBlendCF=(inventariosMensuales||[]).filter(i=>i.modulo==="blend_cf");
  const invActivo=inventariosBlendCF.find(i=>i.id===selInvId)||null;
  const [detalleLocal,setDetalleLocal]=useState(null);
  const [busquedaInv,setBusquedaInv]=useState("");
  useEffect(()=>{setDetalleLocal(invActivo?invActivo.detalle:null);setBusquedaInv("");},[invActivo?.id]);
  const guardarDetalle=()=>{
    if(!invActivo||!detalleLocal)return;
    setInventariosMensuales(p=>p.map(x=>x.id===invActivo.id?{...x,detalle:detalleLocal}:x));
  };
  const crearInventario=()=>{
    if(!formNuevoInv.fecha_conteo||!formNuevoInv.usuario_conteo.trim())return;
    const detalle=blendsFino.map(b=>({lote_id:b.id,lote_codigo:b.codigo,producto:b.producto_comercial||b.nombre||"",stock_teorico:stockBlend(b),stock_fisico:null,diferencia_kg:0,diferencia_pct:0,estado_semaforo:null,nota_justificacion:"",fecha_conteo:formNuevoInv.fecha_conteo}));
    const nuevo={id:genId(),modulo:"blend_cf",mes:mesDe(formNuevoInv.fecha_conteo),anio:new Date(formNuevoInv.fecha_conteo+"T00:00:00").getFullYear(),seccion:"blend_cf",fecha_conteo:formNuevoInv.fecha_conteo,usuario_conteo:formNuevoInv.usuario_conteo.trim(),estado:"borrador",detalle};
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
    if(pendientes.length>0){alert("Faltan "+pendientes.length+" blend(s) por contar antes de cerrar.");return;}
    const sinJustificar=inv.detalle.filter(d=>d.estado_semaforo!=="verde"&&!d.nota_justificacion?.trim());
    if(sinJustificar.length>0){alert("Hay "+sinJustificar.length+" blend(s) con diferencia significativa (amarillo/rojo) sin nota de justificacion. Agrega la nota antes de cerrar.");return;}
    if(!window.confirm("¿Cerrar este inventario? Se generara un ajuste de stock en Blend Cafe Fino para cada blend con diferencia, y ya no se podra editar salvo que lo reabras."))return;
    const fechaCierre=today();
    const mesNum=String(new Date(inv.fecha_conteo+"T00:00:00").getMonth()+1).padStart(2,"0");
    const factura="AJUSTE-INV-"+mesNum+"-"+inv.anio;
    const ajustesPorBlend={};
    inv.detalle.forEach(d=>{if(d.diferencia_kg!==0)ajustesPorBlend[d.lote_id]=d.diferencia_kg;});
    setBlendsFino(p=>p.map(b=>{
      if(!(b.id in ajustesPorBlend))return b;
      const pesoAjuste=-ajustesPorBlend[b.id];
      const nuevaSalida={id:genId(),fecha:fechaCierre,factura,remision:"",cliente:"Ajuste de Inventario",destino_key:"ajuste_inventario",peso_salida:pesoAjuste,valor_kg:0,valor_total:0,observaciones:""};
      return{...b,salidas:[...(b.salidas||[]),nuevaSalida]};
    }));
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,detalle:inv.detalle,estado:"cerrado",fecha_cierre:fechaCierre}:x));
  };
  // Exporta la planilla de conteo en blanco (Excel) para diligenciar en campo
  const exportarPlanillaExcel=(inv)=>{
    const data=inv.detalle.map(d=>({"Codigo Blend":d.lote_codigo,"Producto":d.producto||"","Stock Teorico (kg)":+d.stock_teorico.toFixed(1),"Stock Fisico (kg)":""}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),"Planilla Conteo");
    XLSX.writeFile(wb,"Planilla-Inventario-BlendCF-"+(inv.mes||"")+"-"+inv.anio+".xlsx");
  };
  // Exporta el Acta de Inventario (PDF) una vez cerrado. Valor unitario = b.costo_kg (el mismo
  // Costo/kg que ya muestra la tabla principal de Blend Cafe Fino), ponderado por blend.
  const exportarActaPDF=(inv)=>{
    const detalle=inv.detalle;
    const kgFisicoTotal=detalle.reduce((s,d)=>s+(d.stock_fisico||0),0);
    const kgTeoricoTotal=detalle.reduce((s,d)=>s+d.stock_teorico,0);
    const difTotalKg=kgFisicoTotal-kgTeoricoTotal;
    const valorTotal=detalle.reduce((s,d)=>{
      const b=blendsFino.find(x=>x.id===d.lote_id);
      return s+((b?.costo_kg||0)*(d.stock_fisico||0));
    },0);
    const significativos=detalle.filter(d=>d.estado_semaforo&&d.estado_semaforo!=="verde");
    const porProducto={};
    detalle.forEach(d=>{const p=d.producto||"Sin Producto";porProducto[p]=(porProducto[p]||0)+(d.stock_fisico||0);});
    const mesLabel=(inv.mes||"").charAt(0).toUpperCase()+(inv.mes||"").slice(1);

    const doc=new jsPDF();
    doc.setFont("helvetica","bold");doc.setFontSize(16);
    doc.text("CafeUba — Blend Cafe Fino",14,18);
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
    doc.text("Kilos totales en stock fisico: "+fmt(kgFisicoTotal,1)+" kg",14,69);
    doc.text("Total kg ajustados (neto): "+(difTotalKg>=0?"+":"")+fmt(difTotalKg,1)+" kg",14,75);

    let y=85;
    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("Diferencias Significativas (Amarillo/Rojo)",14,y);
    if(significativos.length===0){
      doc.setFont("helvetica","normal");doc.setFontSize(10);
      doc.text("Sin diferencias significativas — todos los blends dentro del margen aceptable (<=2%).",14,y+7);
      y+=16;
    }else{
      autoTable(doc,{
        startY:y+4,
        head:[["Codigo Blend","Producto","Teorico kg","Fisico kg","Dif. kg","Dif. %","Nota"]],
        body:significativos.map(d=>[d.lote_codigo,d.producto||"—",fmt(d.stock_teorico,1),fmt(d.stock_fisico,1),fmt(d.diferencia_kg,1),d.diferencia_pct.toFixed(1)+"%",d.nota_justificacion||"—"]),
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
      body:Object.entries(porProducto).map(([p,kg])=>[p,fmt(kg,1)]),
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

    doc.save("Acta-Inventario-BlendCF-"+(inv.mes||"")+"-"+inv.anio+".pdf");
  };
  // Reabrir NO revierte el ajuste de stock ya generado al cerrar — solo vuelve el documento a
  // "borrador" para poder corregir datos. Si se vuelve a cerrar, se genera un ajuste ADICIONAL.
  const reabrirInventario=(inv)=>{
    if(!window.confirm("Este inventario ya genero un ajuste de stock. Reabrir y volver a cerrar generara un ajuste ADICIONAL, no un reemplazo. ¿Continuar?"))return;
    setInventariosMensuales(p=>p.map(x=>x.id===inv.id?{...x,estado:"borrador"}:x));
  };

  const poolAll=poolBlendFino(lotesFino,blendsFino,editId);
  const kgUsadoDeKey=(key)=>blendsFino.filter(b=>b.id!==editId).reduce((s,b)=>s+b.items.filter(it=>it.key===key).reduce((a,it)=>a+it.kg_usado,0),0);
  const pool=poolAll.map(p=>({...p,kg_disponible:p.kg_total-kgUsadoDeKey(p.key)})).filter(p=>p.kg_disponible>0||items.some(it=>it.key===p.key));
  const totalKgDisponiblePool=pool.reduce((s,p)=>s+Math.max(0,p.kg_disponible),0);

  const codigoBlend=(nombre&&fecha)?(nombre.trim().replace(/\s+/g,"")+"-"+dateToCode(fecha)):"";
  const kgTotalBlend=items.reduce((s,it)=>s+(+it.kg_usado||0),0);
  const valorTotalBlend=items.reduce((s,it)=>s+(+it.kg_usado||0)*(+it.valor_kg||0),0);
  const costoKgBlend=kgTotalBlend>0?valorTotalBlend/kgTotalBlend:0;

  const abrirNuevo=()=>{setEditId(null);setNombre("");setFecha(today());setProductoComercial("");setItems([]);setErrBlendForm("");setModal(true);};
  const abrirEditar=(b)=>{setEditId(b.id);setNombre(b.nombre);setFecha(b.fecha);setProductoComercial(b.producto_comercial||"");setItems(b.items.map(it=>({...it})));setErrBlendForm("");setModal(true);};
  const cerrarModal=()=>setModal(false);
  const addItem=(p)=>{if(items.some(it=>it.key===p.key))return;setItems(prev=>[...prev,{key:p.key,salidaId:p.salidaId||null,reprId:p.reprId,codigo:p.codigo,valor_kg:p.valor_kg,kg_usado:"",tipo:p.tipo}]);};
  const setItemKg=(key,kg)=>setItems(prev=>prev.map(it=>it.key===key?{...it,kg_usado:kg}:it));
  const rmItem=(key)=>setItems(prev=>prev.filter(it=>it.key!==key));
  const guardar=()=>{
    const v=items.filter(it=>+it.kg_usado>0);
    if(!v.length||!nombre||!fecha)return;
    for(const it of v){
      const p=pool.find(x=>x.key===it.key);
      const maxKg=(p?.kg_disponible||0)+(+it.kg_usado||0);
      if(+it.kg_usado>maxKg){setErrBlendForm("ALERTA: "+it.codigo+" usa "+fmt(+it.kg_usado,1)+" kg pero solo hay "+fmt(maxKg,1)+" kg disponibles.");return;}
    }
    setErrBlendForm("");
    const itemsFinal=v.map(it=>{
      const kgU=+it.kg_usado;
      const salidaId=it.salidaId||genId();
      return{...it,kg_usado:kgU,valor_total:kgU*(+it.valor_kg||0),salidaId,key:it.tipo+":sal:"+salidaId};
    });
    const itemsLote=itemsFinal.filter(it=>it.tipo==="finolote");
    const itemsBlendOrigen=itemsFinal.filter(it=>it.tipo==="finoblend");
    if(itemsLote.length){
      setLotesFino(p=>p.map(l=>{
        const its=itemsLote.filter(it=>it.reprId===l.id);
        if(!its.length)return l;
        let sal=l.salidas_trilladora||[];
        its.forEach(it=>{
          const existente=sal.find(s=>s.id===it.salidaId);
          if(existente){if(existente.auto_blend){sal=sal.map(s=>s.id===it.salidaId?{...s,peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total}:s);}}
          else{sal=[...sal,{id:it.salidaId,fecha:today(),cliente:"Blend Fino",peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total,observaciones:"Generado automaticamente desde Blend Fino "+(codigoBlend||nombre),auto_blend:true}];}
        });
        return{...l,salidas_trilladora:sal};
      }));
    }
    if(itemsBlendOrigen.length){
      setBlendsFino(p=>p.map(b=>{
        const its=itemsBlendOrigen.filter(it=>it.reprId===b.id);
        if(!its.length)return b;
        let sal=b.salidas||[];
        its.forEach(it=>{
          const existente=sal.find(s=>s.id===it.salidaId);
          if(existente){if(existente.auto_blend){sal=sal.map(s=>s.id===it.salidaId?{...s,peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total}:s);}}
          else{sal=[...sal,{id:it.salidaId,fecha:today(),cliente:"Blend Fino "+(codigoBlend||nombre),peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total,observaciones:"Usado como insumo del blend "+(codigoBlend||nombre),auto_blend:true}];}
        });
        return{...b,salidas:sal};
      }));
    }
    const kgT=itemsFinal.reduce((s,it)=>s+it.kg_usado,0);
    const valT=itemsFinal.reduce((s,it)=>s+it.valor_total,0);
    if(editId){
      setBlendsFino(p=>p.map(b=>b.id===editId?{...b,nombre,fecha,codigo:codigoBlend,producto_comercial:productoComercial,items:itemsFinal,kg_total:kgT,valor_total:valT,costo_kg:kgT>0?valT/kgT:0}:b));
    }else{
      setBlendsFino(p=>[{id:genId(),nombre,fecha,codigo:codigoBlend,producto_comercial:productoComercial,items:itemsFinal,kg_total:kgT,valor_total:valT,costo_kg:kgT>0?valT/kgT:0,salidas:[]},...p]);
    }
    setModal(false);
  };

  const abrirSalidaB=(b)=>{setSelBlend(b);setEditSalidaBId(null);setFormSalidaB({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:Math.round(b.costo_kg)||"",valor_total:"",observaciones:"",nombre_producto_tostado:""});setErrB("");setModalSalidaB(true);};
  const abrirEditarSalidaB=(b,s)=>{setSelBlend(b);setEditSalidaBId(s.id);setFormSalidaB({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total,observaciones:s.observaciones||"",nombre_producto_tostado:""});setErrB("");setModalSalidaB(true);};
  const regSalidaB=()=>{
    const peso=numVal(formSalidaB.peso_salida);
    if(!selBlend||!(peso>0)){setErrB("Ingresa un peso de salida válido (mayor a 0).");return;}
    const stockBase=stockBlend(selBlend)+(editSalidaBId?(selBlend.salidas||[]).find(x=>x.id===editSalidaBId)?.peso_salida||0:0);
    if(peso>stockBase){setErrB("ERROR: El peso de salida ("+fmt(peso,1)+" kg) supera el stock disponible ("+fmt(stockBase,1)+" kg).");return;}
    const vkg=+formSalidaB.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalidaB.valor_total||0);
    const nuevaSalidaBId=editSalidaBId||genId();
    setBlendsFino(p=>p.map(b=>{
      if(b.id!==selBlend.id)return b;
      let sal;
      if(editSalidaBId){sal=(b.salidas||[]).map(s=>s.id===editSalidaBId?{...s,fecha:formSalidaB.fecha,factura:formSalidaB.factura,remision:formSalidaB.remision,cliente:formSalidaB.cliente,destino_key:formSalidaB.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaB.observaciones}:s);}
      else{sal=[...(b.salidas||[]),{id:nuevaSalidaBId,fecha:formSalidaB.fecha,factura:formSalidaB.factura,remision:formSalidaB.remision,cliente:formSalidaB.cliente,destino_key:formSalidaB.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaB.observaciones}];}
      return{...b,salidas:sal};
    }));
    setModalSalidaB(false);setEditSalidaBId(null);setErrB("");
  };

  const eliminarSalidaB=(b,salidaId)=>{
    const s=(b.salidas||[]).find(x=>x.id===salidaId);
    if(!s)return;
    if(!window.confirm("¿Eliminar salida de "+fmt(s.peso_salida,1)+" kg del blend "+b.codigo+"? Los kg regresarán al stock."))return;
    setBlendsFino(p=>p.map(x=>x.id!==b.id?x:{...x,salidas:(x.salidas||[]).filter(s=>s.id!==salidaId)}));
  };

  const mesesBF=[...new Set(blendsFino.map(b=>mesDe(b.fecha)).filter(Boolean))].sort();
  const nomComesBF=[...new Set(blendsFino.map(b=>b.producto_comercial).filter(Boolean))].sort();
  const blendsFiltrados=blendsFino.filter(b=>{
    if(filMesBF&&mesDe(b.fecha)!==filMesBF)return false;
    if(filNomComBF&&b.producto_comercial!==filNomComBF)return false;
    if(busqBF){const q=busqBF.toLowerCase();if(!b.nombre?.toLowerCase().includes(q)&&!b.codigo?.toLowerCase().includes(q)&&!b.producto_comercial?.toLowerCase().includes(q))return false;}
    return true;
  });
  const hayFiltroBF=!!(filMesBF||filNomComBF||busqBF);
  const sumBFKgT=blendsFiltrados.reduce((s,b)=>s+b.kg_total,0);
  const sumBFValT=blendsFiltrados.reduce((s,b)=>s+b.valor_total,0);
  // Excluye "ajuste_inventario" de las salidas "reales" — el ajuste corrige el stock pero no es
  // una salida/venta real, no debe mezclarse en los KPIs de Kg/Valor Salidas.
  const sumBFKgSal=blendsFiltrados.reduce((s,b)=>s+(b.salidas||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,x)=>a+x.peso_salida,0),0);
  const sumBFValSal=blendsFiltrados.reduce((s,b)=>s+(b.salidas||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,x)=>a+(x.valor_total||0),0),0);
  const sumBFStk=blendsFiltrados.reduce((s,b)=>s+stockBlend(b),0);
  const totalKgBlends=blendsFino.reduce((s,b)=>s+b.kg_total,0);
  const totalValBlends=blendsFino.reduce((s,b)=>s+b.valor_total,0);
  const totalValSalidasB=blendsFino.reduce((s,b)=>s+(b.salidas||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,x)=>a+(x.valor_total||0),0),0);
  const totalKgSalidasB=blendsFino.reduce((s,b)=>s+(b.salidas||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,x)=>a+(x.peso_salida||0),0),0);
  const totalKgStockB=blendsFino.reduce((s,b)=>s+stockBlend(b),0);
  const totalValStockB=blendsFino.reduce((s,b)=>s+stockBlend(b)*(b.costo_kg||0),0);
  const poolExterno=poolAll.filter(p=>p.tipo==="finolote"||p.tipo==="bodegabf");

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.purple,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>MEZCLAS CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Blend Cafe Fino</div></div><button style={{...S.btn,background:C.purple}} onClick={abrirNuevo}>+ Nuevo Blend</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Blends Creados" value={blendsFino.length} col={C.navy}/>
      <KPIDoble label="Entradas (Mezclado)" kgVal={fmt(totalKgBlends,1)+" kg"} valorVal={fmtCOP(totalValBlends)} col={C.green}/>
      <KPIDoble label="Salidas" kgVal={fmt(totalKgSalidasB,1)+" kg"} valorVal={fmtCOP(totalValSalidasB)} col={C.orange}/>
      <KPIDoble label="Stock Actual" kgVal={fmt(totalKgStockB,1)+" kg"} valorVal={fmtCOP(totalValStockB)} col={C.gold}/>
      <KPI label="Pool Disponible" value={fmt(totalKgDisponiblePool,1)+" kg"} col={C.teal}/>
    </div>
    {poolExterno.length>0&&(<div style={{...S.card,marginBottom:16,borderLeft:"3px solid "+C.teal}}>
      <div style={{fontWeight:600,fontSize:13,color:C.teal,marginBottom:10}}>Insumos disponibles para Blend (desde Bodega CF y Trilladora CF)</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{poolExterno.map(p=>{const kgDisp=p.kg_total-kgUsadoDeKey(p.key);if(kgDisp<=0)return null;return(<div key={p.key} style={{background:p.tipo==="bodegabf"?C.accentBg:C.greenBg,border:"1px solid "+(p.tipo==="bodegabf"?C.accent:C.green)+"40",borderRadius:6,padding:"8px 12px",minWidth:180}}>
        <div style={{color:p.tipo==="bodegabf"?C.accent:C.green,fontWeight:700,fontSize:12,fontFamily:"monospace"}}>{p.codigo}</div>
        <div style={{color:C.textDim,fontSize:11,marginTop:2}}>{p.tipo==="bodegabf"?"Desde Bodega":"Desde Trilladora"} | {p.producto||"—"}</div>
        <div style={{color:C.navy,fontWeight:700,fontSize:13,marginTop:4}}>{fmt(kgDisp,1)} kg | {fmtCOP(p.valor_kg)}/kg</div>
      </div>);})}</div>
    </div>)}
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"],["inventario_mensual","Inventario Mensual"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<div style={S.card}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <input style={{...S.input,maxWidth:200,marginBottom:0,flex:"1 1 150px"}} placeholder="Buscar nombre, código..." value={busqBF} onChange={e=>setBusqBF(e.target.value)}/>
        <select style={{...S.select,flex:"1 1 130px",maxWidth:160}} value={filMesBF} onChange={e=>setFilMesBF(e.target.value)}><option value="">Todos los meses</option>{mesesBF.map(m=>(<option key={m} value={m} style={{textTransform:"capitalize"}}>{m}</option>))}</select>
        <select style={{...S.select,flex:"1 1 160px",maxWidth:200}} value={filNomComBF} onChange={e=>setFilNomComBF(e.target.value)}><option value="">Todos los productos com.</option>{nomComesBF.map(n=>(<option key={n}>{n}</option>))}</select>
        {hayFiltroBF&&<button style={{...S.btnG,fontSize:11,padding:"6px 10px",color:C.red,borderColor:C.red+"40"}} onClick={()=>{setBusqBF("");setFilMesBF("");setFilNomComBF("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12,marginLeft:4}}>{blendsFiltrados.length} de {blendsFino.length}</span>
      </div>
      {hayFiltroBF&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>BLENDS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{blendsFiltrados.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG TOTAL</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumBFKgT,1)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumBFStk,1)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR TOTAL</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(sumBFValT)}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumBFKgSal,1)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumBFValSal)}</div></div>
      </div>)}
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Blends Registrados</div>
      <TablaScrollV minWidth={1000}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>{["Codigo Blend","Nombre","Producto Comercial","Fecha","Mes","Lotes Usados","kg Total","Costo/kg","Valor Total","Salidas kg","Stock kg","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{blendsFiltrados.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=stockBlend(b);return(<tr key={b.id}>
        <td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{b.codigo}</td>
        <td style={{...S.td,fontWeight:600}}>{b.nombre}</td>
        <td style={S.td}>{b.producto_comercial?<Bdg label={b.producto_comercial} col={C.gold} bg={C.goldBg}/>:"—"}</td>
        <td style={{...S.td,color:C.textDim}}>{fmtFecha(b.fecha)}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{mesDe(b.fecha)}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{b.items.map(it=>(<Bdg key={it.key} label={it.codigo+" ("+fmt(it.kg_usado,1)+"kg)"} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(b.kg_total,1)} kg</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(Math.round(b.costo_kg))}</td>
        <td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(b.valor_total)}</td>
        <td style={{...S.td,color:C.orange}}>{fmt(salKg,1)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock,1)} kg</span></td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaB(b)}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(b)}>Editar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {blendsFiltrados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{hayFiltroBF?"Sin blends que coincidan con los filtros.":"Sin blends registrados todavia."}</div>}
    </div>)}
    {tab==="historico"&&(()=>{const todasHBF=blendsFino.flatMap(b=>(b.salidas||[]).map(s=>({...s,codigo:b.codigo,nombreProd:b.producto_comercial||b.nombre||b.codigo,blendRef:b}))).sort((a,b)=>b.fecha.localeCompare(a.fecha));const mesesHBF=[...new Set(todasHBF.map(s=>mesDe(s.fecha)).filter(Boolean))].sort();const prodsHBF=[...new Set(todasHBF.map(s=>s.nombreProd).filter(Boolean))].sort();const filtHBF=todasHBF.filter(s=>{if(hMesBF&&mesDe(s.fecha)!==hMesBF)return false;if(hProdBF&&s.nombreProd!==hProdBF)return false;if(hBusqBF){const q=hBusqBF.toLowerCase();if(!s.codigo?.toLowerCase().includes(q)&&!s.cliente?.toLowerCase().includes(q)&&!(s.factura||"").toLowerCase().includes(q)&&!s.nombreProd?.toLowerCase().includes(q))return false;}return true;});return todasHBF.length===0?(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>):(<div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontWeight:600,fontSize:14,color:C.navy}}>Historico de Salidas</span><span style={{color:C.textFaint,fontSize:12}}>{filtHBF.length} de {todasHBF.length} salidas</span></div><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}><input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar blend, cliente, factura..." value={hBusqBF} onChange={e=>setHBusqBF(e.target.value)}/><select style={{...S.select,width:140}} value={hMesBF} onChange={e=>setHMesBF(e.target.value)}><option value="">Todos los meses</option>{mesesHBF.map(m=>(<option key={m}>{m}</option>))}</select><select style={{...S.select,width:180}} value={hProdBF} onChange={e=>setHProdBF(e.target.value)}><option value="">Todos los productos</option>{prodsHBF.map(p=>(<option key={p}>{p}</option>))}</select>{(hBusqBF||hMesBF||hProdBF)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setHBusqBF("");setHMesBF("");setHProdBF("");}}>✕ Limpiar</button>}</div>{(hBusqBF||hMesBF||hProdBF)&&filtHBF.length>0&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>SALIDAS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{filtHBF.length}</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(filtHBF.reduce((s,x)=>s+x.peso_salida,0),1)} kg</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(filtHBF.reduce((s,x)=>s+(x.valor_total||0),0))}</div></div></div>)}<TablaScrollV minWidth={900}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Blend","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{filtHBF.map(s=>(<tr key={s.id}><td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida,1)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={S.btnG} onClick={()=>abrirEditarSalidaB(s.blendRef,s)}>Editar</button><button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminarSalidaB(s.blendRef,s.id)}>Eliminar</button></div></td></tr>))}</tbody></table></TablaScrollV></div>);})()}

    {tab==="inventario_mensual"&&(<>
      {!invActivo?(<>
        <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Inventario Mensual — Blend Cafe Fino</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Arqueo de existencias: compara el stock teorico del sistema contra el conteo fisico</div></div>
          <button style={S.btn} onClick={()=>{setFormNuevoInv({fecha_conteo:today(),usuario_conteo:""});setModalNuevoInv(true);}}>+ Nuevo Inventario Mensual</button>
        </div>
        {inventariosBlendCF.length===0?(
          <div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin inventarios mensuales registrados todavia. Usa el boton para crear el primer arqueo.</div>
        ):(
          <div style={S.card}>
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr>
              {["Mes","Fecha Conteo","Usuario","Estado","Blends","Contados","Rojo/Amarillo",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}
            </tr></thead>
            <tbody>{[...inventariosBlendCF].sort((a,b)=>(b.fecha_conteo||"").localeCompare(a.fecha_conteo||"")).map(inv=>{
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
            <KPI label="Stock Teorico" value={fmt(kgTeoricoTotal,1)+" kg"} col={C.teal}/>
            <KPI label="Stock Fisico" value={fmt(kgFisicoTotal,1)+" kg"} col={C.accent}/>
            <KPI label="Diferencia" value={fmt(difTotalKg,1)+" kg"} col={Math.abs(difTotalPct)<=2?C.green:Math.abs(difTotalPct)<=5?C.gold:C.red}/>
            <KPI label="Diferencia %" value={difTotalPct.toFixed(1)+"%"} col={Math.abs(difTotalPct)<=2?C.green:Math.abs(difTotalPct)<=5?C.gold:C.red}/>
            <KPI label="Rojo/Amarillo" value={rojos+" / "+amarillos} col={rojos>0?C.red:amarillos>0?C.gold:C.green}/>
          </div>
          <div style={{...S.card,display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
            <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de blend..." value={busquedaInv} onChange={e=>setBusquedaInv(e.target.value)}/>
            <span style={{color:C.textFaint,fontSize:12,whiteSpace:"nowrap"}}>{detalleFiltrado.length} de {detalleView.length} blends</span>
          </div>
          <div style={S.card}>
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>
              {["Codigo Blend","Producto","Stock Teorico kg","Stock Fisico kg","Diferencia kg","Diferencia %","Estado","Nota Justificacion"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
            </tr></thead>
            <tbody>{detalleFiltrado.map(d=>(
              <tr key={d.lote_id}>
                <td style={{...S.td,fontWeight:700,color:C.purple,fontFamily:"monospace"}}>{d.lote_codigo}</td>
                <td style={S.td}><Bdg label={d.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
                <td style={{...S.td,textAlign:"right",color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{fmt(d.stock_teorico,1)} kg</td>
                <td style={S.td}>{bloqueado?(<span style={{fontWeight:700}}>{d.stock_fisico!=null?fmt(d.stock_fisico,1)+" kg":"—"}</span>):(<input style={{...S.input,width:110,padding:"6px 8px"}} type="number" step="0.1" placeholder="kg" value={d.stock_fisico??""} onChange={e=>actualizarDetalleInv(d.lote_id,"stock_fisico",e.target.value)} onBlur={guardarDetalle}/>)}</td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,color:d.stock_fisico==null?C.textFaint:d.diferencia_kg===0?C.textDim:d.diferencia_kg>0?C.green:C.red,fontVariantNumeric:"tabular-nums"}}>{d.stock_fisico!=null?fmt(d.diferencia_kg,1):"—"}</td>
                <td style={{...S.td,textAlign:"right",color:d.stock_fisico==null?C.textFaint:C.textDim,fontVariantNumeric:"tabular-nums"}}>{d.stock_fisico!=null?d.diferencia_pct.toFixed(1)+"%":"—"}</td>
                <td style={S.td}>{d.estado_semaforo?(<Bdg label={SEM_LABEL[d.estado_semaforo]} col={SEM_COL[d.estado_semaforo]} bg={SEM_BG[d.estado_semaforo]}/>):(<span style={{color:C.textFaint,fontSize:11}}>Pendiente</span>)}</td>
                <td style={S.td}>{bloqueado?(<span style={{color:C.textDim,fontSize:12}}>{d.nota_justificacion||"—"}</span>):(<input style={{...S.input,minWidth:180}} placeholder={d.estado_semaforo&&d.estado_semaforo!=="verde"?"Obligatorio: explica la diferencia":"Opcional"} value={d.nota_justificacion} onChange={e=>actualizarDetalleInv(d.lote_id,"nota_justificacion",e.target.value)} onBlur={guardarDetalle}/>)}</td>
              </tr>
            ))}</tbody></table></TablaScrollV>
          </div>
        </>);
      })()}
      {modalNuevoInv&&(<Modal title="Nuevo Inventario Mensual" onClose={()=>setModalNuevoInv(false)}>
        <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.textDim}}>Se creara un borrador con el stock teorico actual de los {blendsFino.length} blends registrados. El conteo fisico y las notas se completan despues.</div>
        <Fld label="Fecha de Conteo"><input style={S.input} type="date" value={formNuevoInv.fecha_conteo} onChange={e=>setFormNuevoInv(p=>({...p,fecha_conteo:e.target.value}))}/></Fld>
        <Fld label="Usuario que Cuenta"><input style={S.input} placeholder="Nombre de quien realiza el conteo" value={formNuevoInv.usuario_conteo} onChange={e=>setFormNuevoInv(p=>({...p,usuario_conteo:e.target.value}))}/></Fld>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
          <button style={S.btnG} onClick={()=>setModalNuevoInv(false)}>Cancelar</button>
          <button style={S.btn} onClick={crearInventario}>Crear Borrador</button>
        </div>
      </Modal>)}
    </>)}

    {modal&&(<Modal title={editId?"Editar Blend Fino":"Nuevo Blend Fino"} onClose={cerrarModal} wide>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Nombre / Codigo Blend" half><input style={S.input} value={nombre} onChange={e=>setNombre(e.target.value)}/></Fld>
        <Fld label="Fecha de Realizacion" half><input style={S.input} type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/></Fld>
        <Fld label="Nombre de Producto Comercial"><input style={S.input} value={productoComercial} onChange={e=>setProductoComercial(e.target.value)}/></Fld>
      </div>
      {codigoBlend&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14}}><span style={{color:C.textDim,fontSize:12}}>Codigo generado: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:14}}>{codigoBlend}</span></div>)}
      <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Lotes y Blends Disponibles</div>
      <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,border:"1px solid "+C.border}}>
        {pool.filter(p=>!items.some(it=>it.key===p.key)).length===0&&<div style={{color:C.textFaint,fontSize:12}}>No hay excelso disponible. Trilla un lote en Trilladora Cafe Fino.</div>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{pool.filter(p=>!items.some(it=>it.key===p.key)).map(p=>(<button key={p.key} style={{...S.btnG,fontSize:11,padding:"6px 10px",borderColor:p.tipo==="finoblend"?C.purple:C.border2,color:p.tipo==="finoblend"?C.purple:C.textDim}} onClick={()=>addItem(p)}>+ {p.codigo} ({fmt(p.kg_disponible,1)} kg)</button>))}</div>
      </div>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Lotes Seleccionados</div>
      {errBlendForm&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errBlendForm}</div>)}
      <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,overflowX:"auto",border:"1px solid "+C.border}}>
        {items.length===0&&<div style={{color:C.textFaint,fontSize:12}}>Agrega al menos un lote del listado de arriba.</div>}
        {items.length>0&&(<table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}><thead><tr>{["Lote","kg a Usar","kg Disponible","Valor/kg","Subtotal",""].map(h=>(<th key={h} style={{...S.th,fontSize:10,padding:"6px 8px"}}>{h}</th>))}</tr></thead>
        <tbody>{items.map(it=>{const p=pool.find(x=>x.key===it.key);const kgTotalItem=(p?.kg_disponible||0)+(+it.kg_usado||0);const restante=kgTotalItem-(+it.kg_usado||0);return(<tr key={it.key}>
          <td style={{padding:"4px 8px",color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{it.codigo}</td>
          <td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={it.kg_usado} onChange={e=>setItemKg(it.key,e.target.value)}/></td>
          <td style={{padding:"4px 8px",fontSize:12,fontWeight:700,color:restante<0?C.red:C.green}}>{fmt(restante,1)} kg</td>
          <td style={{padding:"4px 8px",fontSize:12,color:C.gold}}>{fmtCOP(it.valor_kg)}</td>
          <td style={{padding:"4px 8px",fontSize:12,color:C.gold,fontWeight:700}}>{fmtCOP((+it.kg_usado||0)*(+it.valor_kg||0))}</td>
          <td style={{padding:"4px"}}><button style={{...S.btnG,padding:"5px 8px"}} onClick={()=>rmItem(it.key)}>x</button></td>
        </tr>);})}</tbody></table>)}
      </div>
      <div style={{background:C.navy,borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600}}>kg Total: {fmt(kgTotalBlend,1)} | Valor Total: {fmtCOP(valorTotalBlend)}</span>
        <span style={{color:C.white,fontWeight:800,fontSize:18}}>Costo/kg Blend: {fmtCOP(Math.round(costoKgBlend))}</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button style={S.btnG} onClick={cerrarModal}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={guardar}>{editId?"Guardar Cambios":"Crear Blend"}</button></div>
    </Modal>)}

    {modalSalidaB&&selBlend&&(<Modal title={(editSalidaBId?"Editar Salida - ":"Registrar Salida - ")+selBlend.codigo} onClose={()=>{setModalSalidaB(false);setEditSalidaBId(null);setErrB("");}}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selBlend.codigo} - {selBlend.nombre}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockBlend(selBlend),1)} kg</b></div>
      </div>
      {errB&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errB}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalidaB.fecha} onChange={e=>setFormSalidaB(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Venta/Salida" half><input style={{...S.input,borderColor:errB?C.red:C.border2}} type="number" value={formSalidaB.peso_salida} onChange={e=>{setFormSalidaB(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalidaB.valor_kg||0)||""}));setErrB("");}}/></Fld>
        <Fld label="Precio por Unidad (kg COP)" half><input style={S.input} type="number" value={formSalidaB.valor_kg} onChange={e=>setFormSalidaB(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalidaB.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total Salida" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={formSalidaB.valor_total} onChange={e=>setFormSalidaB(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalidaB.factura} onChange={e=>setFormSalidaB(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalidaB.remision} onChange={e=>setFormSalidaB(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalidaB.cliente} destinoKey={formSalidaB.destino_key} onChange={(v,k)=>setFormSalidaB(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formSalidaB.observaciones} onChange={e=>setFormSalidaB(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      {formSalidaB.destino_key==="uba_tostado"&&(<>
        <div style={{background:C.orangeBg,border:"1px solid "+C.orange+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.orange,fontWeight:600,marginBottom:10}}>&#8505; Este lote quedara disponible en UBA Tostado para tostarse en uno o varios batches.</div>
        <Fld label="Nombre de Producto Tostado (opcional)"><input style={S.input} placeholder="Ej: Espresso Milan" value={formSalidaB.nombre_producto_tostado} onChange={e=>setFormSalidaB(p=>({...p,nombre_producto_tostado:e.target.value}))}/></Fld>
      </>)}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalidaB(false);setEditSalidaBId(null);setErrB("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaB}>{editSalidaBId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}
  </div>);
}
