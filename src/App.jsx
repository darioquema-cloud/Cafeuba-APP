import{useState,useMemo,useEffect,useRef,useLayoutEffect,lazy,Suspense}from"react";
import*as XLSX from"xlsx";
import{auth}from"./firebase";
import{signInWithPopup,GoogleAuthProvider,onAuthStateChanged,signOut as fbSignOut,signInWithEmailAndPassword,sendPasswordResetEmail,createUserWithEmailAndPassword,getAuth as fbGetAuth}from"firebase/auth";
import{initializeApp as fbInitApp,deleteApp as fbDeleteApp}from"firebase/app";
import{cfg}from"./firebase";
import{useFirestoreList,setCurrentUserEmail}from"./useFirestoreList";
import{C,S,tg}from"./theme";
import{FINCAS,VARIEDADES,TIPOS,ABREV,NORMAS,MESES,EQUIPOS_FERM,EQUIPOS_SECADO,TIPOS_COSTO,CENTROS,CENTRO_COL,CENTRO_BG,ECOL,EBG,USERS_SEED,seedL,seedC,SEED_COSTOS_TRI,PERMISOS,PERMISOS_SEED,NAV,TIPOS_TOSTION,SEED_CONFIG_EMPAQUE}from"./data/constants";
import{fmtCOP,fmt,numVal,today,genId,dateToCode,fmtFecha}from"./lib/format";
import{semanaISO,mesDe,diasEntre}from"./lib/dates";
import{getSeedCostoTri,calcCosto,calcCostoTri}from"./lib/costing";
import{pesoATrilladora,pesoATrilladoraCafeFino,pesoOtrosBodega}from"./lib/stock";
import{Bdg,Fld,KPI,KPIDoble,Bar,Modal,AutoFitText,TablaScrollV,SelectDestino,destinoLabel}from"./components/ui";
import{CoffeeLoader}from"./components/ui/CoffeeLoader";
import{LoginForm}from"./components/Login/LoginForm";
const Costos=lazy(()=>import("./components/Costos/Costos").then(m=>({default:m.Costos})));
const Usuarios=lazy(()=>import("./components/Usuarios/Usuarios").then(m=>({default:m.Usuarios})));
const Trazabilidad=lazy(()=>import("./components/Trazabilidad/Trazabilidad").then(m=>({default:m.Trazabilidad})));
const Procesamiento=lazy(()=>import("./components/Procesamiento/Procesamiento").then(m=>({default:m.Procesamiento})));
const Bodega=lazy(()=>import("./components/Bodega/Bodega").then(m=>({default:m.Bodega})));
const BodegaTrilladora=lazy(()=>import("./components/BodegaTrilladora/BodegaTrilladora").then(m=>({default:m.BodegaTrilladora})));
const BodegaFino=lazy(()=>import("./components/BodegaFino/BodegaFino").then(m=>({default:m.BodegaFino})));
const BodegaTrilladoraFino=lazy(()=>import("./components/BodegaTrilladoraFino/BodegaTrilladoraFino").then(m=>({default:m.BodegaTrilladoraFino})));
const TrilladoraFino=lazy(()=>import("./components/TrilladoraFino/TrilladoraFino").then(m=>({default:m.TrilladoraFino})));
const Trilla=lazy(()=>import("./components/Trilla/Trilla").then(m=>({default:m.Trilla})));
const Blend=lazy(()=>import("./components/Blend/Blend").then(m=>({default:m.Blend})));
const BlendFino=lazy(()=>import("./components/BlendFino/BlendFino").then(m=>({default:m.BlendFino})));
const Maquila=lazy(()=>import("./components/Maquila/Maquila").then(m=>({default:m.Maquila})));
const Ventas=lazy(()=>import("./components/Ventas/Ventas").then(m=>({default:m.Ventas})));
const Dashboard=lazy(()=>import("./components/Dashboard/Dashboard").then(m=>({default:m.Dashboard})));
const UbaTostado=lazy(()=>import("./components/UbaTostado/UbaTostado").then(m=>({default:m.UbaTostado})));
const Pedidos=lazy(()=>import("./components/Pedidos/Pedidos").then(m=>({default:m.Pedidos})));
const CRM=lazy(()=>import("./components/CRM/CRM").then(m=>({default:m.CRM})));



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

const exportarLineaVerdeExcel=(lotes,blends)=>{
  const wb=XLSX.utils.book_new();
  const addSheet=(name,data)=>{if(!data||!data.length)data=[{"Sin datos":""}];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),name);};
  addSheet("Procesamiento",lotes.map(l=>({Codigo:l.codigo,Fecha_Proceso:l.fecha_proceso||"",Mes:l.mes||"",Semana:l.semana||"",Tipo:l.tipo||"",Producto:l.producto||"",Estado:l.estado||"",Fincas:[...new Set((l.cereza||[]).map(c=>c.finca))].join(", "),kg_Cereza:(l.cereza||[]).reduce((a,c)=>a+(c.kg||0),0),Valor_Cereza:(l.cereza||[]).reduce((a,c)=>a+(c.kg||0)*(c.valor_kg||0),0),kg_Pergamino:l.kg_producto||0,Conversion:l.conversion||"",Reactor:l.equipo_ferm||"",Silo:l.equipo_secado||"",Fecha_Inicio_Secado:l.fecha_lavado||"",Fecha_Fin_Secado:l.fecha_fin_secado||"",Humedad_pct:l.humedad||"",Notas:l.notas||""})));
  addSheet("BodegaMilan_Salidas",lotes.flatMap(l=>(l.salidas_bodega||[]).map(s=>({Lote:l.codigo,Fecha:s.fecha,Factura:s.factura||"",Remision:s.remision||"",Cliente_Destino:s.cliente||"",Destino_Key:s.destino_key||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  addSheet("Trilla",lotes.filter(l=>l.trilla?.kg_excelso>0).map(l=>({Lote:l.codigo,Fecha_Trilla:l.trilla.fecha_trilla||"",Corte:l.trilla.codigo_corte||"",Cod_Trillado:l.trilla.nombre_trillado||"",Proceso:l.trilla.con_proceso||"",Perg_kg:l.trilla.entrada_usada||0,Excelso_kg:l.trilla.kg_excelso||0,Merma_kg:l.trilla.kg_merma||0,Pct_Merma:l.trilla.entrada_usada>0?+((l.trilla.kg_merma/l.trilla.entrada_usada)*100).toFixed(1):0,Factor_Industrial:l.trilla.factor_industrial!=null?+l.trilla.factor_industrial.toFixed(2):"",FP_Ponderado:l.trilla.factor_pretrilla_ponderado!=null?+l.trilla.factor_pretrilla_ponderado.toFixed(2):"",Pasilla_Elec:l.trilla.pasilla_elec||0,Catadora_Dens:l.trilla.catadora_dens||0,Inferiores:l.trilla.inferiores||0,Cisco:l.trilla.cisco||0,Humedad_pct:l.trilla.humedad_salida||"",Norma:l.trilla.norma||""})));
  addSheet("BodegaTri_Salidas",lotes.filter(l=>l.trilla?.kg_excelso>0).flatMap(l=>(l.salidas_trilladora||[]).map(s=>({Lote:l.codigo,Cod_Trillado:l.trilla?.nombre_trillado||"",Fecha:s.fecha,Cliente_Destino:s.cliente||"",Destino_Key:s.destino_key||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  addSheet("Blend",blends.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+(s.peso_salida||0),0);return{Codigo:b.codigo,Nombre:b.nombre,Producto_Comercial:b.producto_comercial||"",Fecha:b.fecha,Lotes:(b.items||[]).map(it=>it.codigo+" ("+it.kg_usado+"kg)").join(", "),kg_Total:b.kg_total||0,Costo_kg:b.costo_kg?+b.costo_kg.toFixed(0):0,Valor_Total:b.valor_total||0,kg_Salidas:salKg,Stock_kg:+((b.kg_total||0)-salKg).toFixed(1)};}));
  addSheet("Blend_Salidas",blends.flatMap(b=>(b.salidas||[]).map(s=>({Blend:b.codigo,Fecha:s.fecha,Cliente:s.cliente||"",Factura:s.factura||"",Remision:s.remision||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0,Observaciones:s.observaciones||""}))));
  XLSX.writeFile(wb,"CafeUba-LineaVerde-"+dateToCode(today())+".xlsx");
};

const exportarCafeFinoExcel=(lotesFino,blendsFino)=>{
  const wb=XLSX.utils.book_new();
  const addSheet=(name,data)=>{if(!data||!data.length)data=[{"Sin datos":""}];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),name);};
  const stockBCF=l=>((l.kg_producto||0)-(l.salidas_bodega||[]).reduce((a,s)=>a+(s.peso_salida||0),0));
  addSheet("BodegaCafeFino",lotesFino.map(l=>({Codigo:l.codigo,Fecha:l.fecha,Mes:l.mes||"",Semana:l.semana||"",Producto:l.producto||"",Proveedor:l.proveedor||"",kg_Entrada:l.kg_producto||0,kg_Salidas:(l.salidas_bodega||[]).reduce((a,s)=>a+(s.peso_salida||0),0),Stock_kg:stockBCF(l),Costo_Compra_kg:l.costo_compra_kg||0,Valor_Stock:+(stockBCF(l)*(l.costo_compra_kg||0)).toFixed(0),FP_Factor:l.pretrilla?.factor_pretrilla?+l.pretrilla.factor_pretrilla.toFixed(2):"",FP_Merma_pct:l.pretrilla?.pct_merma?+l.pretrilla.pct_merma.toFixed(1):"",Lote_Origen:l.trazabilidad?.codigo_lote_origen||"",Fecha_Proceso:l.trazabilidad?.fecha_proceso||"",Fecha_Secado:l.trazabilidad?.fecha_secado||"",Notas:l.notas||""})));
  addSheet("BodegaCF_Salidas",lotesFino.flatMap(l=>(l.salidas_bodega||[]).map(s=>({Lote:l.codigo,Fecha:s.fecha,Factura:s.factura||"",Remision:s.remision||"",Cliente_Destino:s.cliente||"",Destino_Key:s.destino_key||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  addSheet("TrilladoraCF",lotesFino.filter(l=>l.trilla?.kg_excelso>0).map(l=>({Lote:l.codigo,Fecha_Trilla:l.trilla.fecha_trilla||"",Corte:l.trilla.codigo_corte||"",Cod_Trillado:l.trilla.nombre_trillado||"",Proceso:l.trilla.con_proceso||"",Perg_kg:l.trilla.entrada_usada||0,Excelso_kg:l.trilla.kg_excelso||0,Merma_kg:l.trilla.kg_merma||0,Pct_Merma:l.trilla.entrada_usada>0?+((l.trilla.kg_merma/l.trilla.entrada_usada)*100).toFixed(1):0,Factor_Industrial:l.trilla.factor_industrial!=null?+l.trilla.factor_industrial.toFixed(2):"",FP_Ponderado:l.trilla.factor_pretrilla_ponderado!=null?+l.trilla.factor_pretrilla_ponderado.toFixed(2):"",Pasilla_Elec:l.trilla.pasilla_elec||0,Catadora_Dens:l.trilla.catadora_dens||0,Inferiores:l.trilla.inferiores||0,Cisco:l.trilla.cisco||0,Stock_Excelso:(l.trilla.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,s)=>a+(s.peso_salida||0),0),Lote_Origen:l.trazabilidad?.codigo_lote_origen||""})));
  addSheet("TrilladoraCF_Salidas",lotesFino.flatMap(l=>(l.salidas_trilladora||[]).map(s=>({Lote:l.codigo,Cod_Trillado:l.trilla?.nombre_trillado||"",Fecha:s.fecha,Cliente_Destino:s.cliente||"",Destino_Key:s.destino_key||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  addSheet("BlendCafeFino",blendsFino.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+(s.peso_salida||0),0);return{Codigo:b.codigo,Nombre:b.nombre||"",Producto_Comercial:b.producto_comercial||"",Fecha:b.fecha,Lotes:(b.items||[]).map(it=>it.codigo+" ("+it.kg_usado+"kg)").join(", "),kg_Total:b.kg_total||0,Costo_kg:b.costo_kg?+b.costo_kg.toFixed(0):0,Valor_Total:b.valor_total||0,kg_Salidas:salKg,Stock_kg:+((b.kg_total||0)-salKg).toFixed(1)};}));
  addSheet("BlendCF_Salidas",blendsFino.flatMap(b=>(b.salidas||[]).map(s=>({Blend:b.codigo,Fecha:s.fecha,Cliente:s.cliente||"",Factura:s.factura||"",Remision:s.remision||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  XLSX.writeFile(wb,"CafeUba-CafeFino-"+dateToCode(today())+".xlsx");
};

const exportarTostadoMaquilaExcel=(maquilas,blendsTostado)=>{
  const wb=XLSX.utils.book_new();
  const addSheet=(name,data)=>{if(!data||!data.length)data=[{"Sin datos":""}];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),name);};
  addSheet("Maquila",maquilas.map(m=>({Codigo:m.codigo||"",Fecha:m.fecha,Mes:m.mes||"",Semana:m.semana||"",Cliente:m.cliente||"",Telefono:m.telefono||"",kg_Recibidos:m.kg_recibidos||0,Servicio:m.servicio||"",Observaciones:m.observaciones||"",kg_Salidas:(m.salidas||[]).reduce((a,s)=>a+(s.kg_salida||0),0)})));
  addSheet("Maquila_Salidas",maquilas.flatMap(m=>(m.salidas||[]).map(s=>({Maquila:m.codigo||m.cliente,Fecha:s.fecha,Cliente_Destino:s.cliente_destino||"",Destino_Key:s.destino_key||"",kg_Salida:s.kg_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0,Observaciones:s.observaciones||""}))));
  addSheet("UBA_Tostado",blendsTostado.map(t=>({Codigo:t.codigo||"",Fecha:t.fecha,Mes:t.mes||"",Producto:t.nombre_producto||"",kg_a_Tostar:t.kg_a_tostar||0,Valor_kg:t.valor_unitario||0,Valor_Total:t.valor_total||0,Temperatura_C:t.temperatura||"",Tiempo_min:t.tiempo||"",Tipo_Tostion:t.tipo_tostion||"",kg_Tostado:t.kg_cafe_tostado||0,Rendimiento_pct:t.kg_a_tostar&&t.kg_cafe_tostado?+((t.kg_cafe_tostado/t.kg_a_tostar)*100).toFixed(1):0,Stock_kg:(t.kg_cafe_tostado||0)-(t.salidas||[]).reduce((a,s)=>a+(s.peso_salida||0),0),Catacion:t.catacion||"",Responsable:t.responsable||""})));
  addSheet("UBA_Salidas",blendsTostado.flatMap(t=>(t.salidas||[]).map(s=>({Producto:t.codigo||t.nombre_producto,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))));
  XLSX.writeFile(wb,"CafeUba-TostadoMaquila-"+dateToCode(today())+".xlsx");
};

const exportarComercialExcel=(lotes,lotesFino,blends,blendsFino,blendsTostado,pedidos)=>{
  const wb=XLSX.utils.book_new();
  const addSheet=(name,data)=>{if(!data||!data.length)data=[{"Sin datos":""}];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),name);};
  const ventasConsolidadas=[
    ...lotes.flatMap(l=>(l.salidas_bodega||[]).map(s=>({Seccion:"Bodega Milan",Origen:l.codigo,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))),
    ...lotes.filter(l=>l.trilla?.kg_excelso>0).flatMap(l=>(l.salidas_trilladora||[]).map(s=>({Seccion:"Bodega Trilladora",Origen:l.trilla?.nombre_trillado||l.codigo,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))),
    ...blends.flatMap(b=>(b.salidas||[]).map(s=>({Seccion:"Blend",Origen:b.codigo,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))),
    ...lotesFino.flatMap(l=>(l.salidas_bodega||[]).map(s=>({Seccion:"Bodega Cafe Fino",Origen:l.codigo,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))),
    ...lotesFino.flatMap(l=>(l.salidas_trilladora||[]).map(s=>({Seccion:"Trilladora CF",Origen:l.trilla?.nombre_trillado||l.codigo,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))),
    ...blendsFino.flatMap(b=>(b.salidas||[]).map(s=>({Seccion:"Blend Cafe Fino",Origen:b.codigo,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))),
    ...blendsTostado.flatMap(t=>(t.salidas||[]).map(s=>({Seccion:"UBA Tostado",Origen:t.codigo||t.nombre_producto,Fecha:s.fecha,Cliente:s.cliente||"",kg_Salida:s.peso_salida,Valor_kg:s.valor_kg||0,Valor_Total:s.valor_total||0}))),
  ].filter(v=>v.Cliente!=="Ajuste de Inventario");
  addSheet("Ventas_Consolidadas",ventasConsolidadas);
  addSheet("Pedidos",(pedidos||[]).map(p=>({Cliente:p.cliente||"",Producto_Comercial:p.producto_comercial||p.ref_codigo||"",kg_Solicitados:p.kg_solicitados||0,Precio_kg:p.precio_kg||0,Valor_Estimado:p.valor_estimado||0,Fecha_Registro:p.fecha_registro||"",Fecha_Entrega_Esperada:p.fecha_entrega_esperada||"",Faltante_kg:p.faltante_kg||0,Fecha_Estimada_Sistema:p.fecha_estimada_sistema||"",Entregado:p.entregado?"Si":"No",Notas:p.notas||""})));
  XLSX.writeFile(wb,"CafeUba-Comercial-"+dateToCode(today())+".xlsx");
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
  const [empaques,setEmpaques]=useFirestoreList("empaques",[]);
  const [ventasTostado,setVentasTostado]=useFirestoreList("ventasTostado",[]);
  const [configEmpaque,setConfigEmpaque]=useFirestoreList("configEmpaque",SEED_CONFIG_EMPAQUE);
  const [subprodVerde,setSubprodVerde]=useFirestoreList("subprodVerde",[]);
  const [subprodPerg,setSubprodPerg]=useFirestoreList("subprodPerg",[]);
  const [permisosConfig,setPermisosConfig]=useFirestoreList("permisosConfig",PERMISOS_SEED);
  const [inventariosMensuales,setInventariosMensuales]=useFirestoreList("inventariosMensuales",[]);
  const [pedidos,setPedidos]=useFirestoreList("pedidos",[]);
  const [oportunidades,setOportunidades]=useFirestoreList("oportunidades",[]);
  const [muestras,setMuestras]=useFirestoreList("muestras",[]);
  const [visitas,setVisitas]=useFirestoreList("visitas",[]);
  useEffect(()=>{return onAuthStateChanged(auth,fu=>{setFbUser(fu);setAuthReady(true);if(!fu){setLoggedIn(false);setUser(null);setNotAuthorized(false);}});},[]);
  useEffect(()=>{
    if(!authReady||!fbUser||!usuariosReady)return;
    const email=fbUser.email?.toLowerCase();
    const match=usuarios.find(u=>u.email?.toLowerCase()===email&&u.activo!==false);
    if(match){setUser({...match,nombre:fbUser.displayName||match.nombre,foto:fbUser.photoURL||null});setLoggedIn(true);setNotAuthorized(false);}
    else if(usuarios.length===0){const nu={id:genId(),nombre:fbUser.displayName||email,email:fbUser.email,rol:"Gerente",activo:true};setUsuarios(p=>[...p,nu]);setUser({...nu,foto:fbUser.photoURL||null});setLoggedIn(true);setNotAuthorized(false);}
    else{setLoggedIn(false);setNotAuthorized(true);}
  },[fbUser,usuarios,authReady,usuariosReady]);
  useEffect(()=>{setCurrentUserEmail(user?.email||null);},[user]);
  if(!authReady||(fbUser&&!usuariosReady))return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg,flexDirection:"column",gap:16}}><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/><CoffeeLoader/><div style={{color:C.textDim,fontSize:13}}>Cargando plataforma...</div></div>);
  if(!loggedIn)return(<><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/><LoginForm notAuthorized={notAuthorized}/></>);
  const VIEWS={dashboard:<Dashboard lotes={lotes} costos={costos} lotesFino={lotesFino} maquilas={maquilas} blendsTostado={blendsTostado} blends={blends} blendsFino={blendsFino} empaques={empaques} subprodPerg={subprodPerg} subprodVerde={subprodVerde}/>,procesamiento:<Procesamiento lotes={lotes} setLotes={setLotes} costos={costos} lotesFino={lotesFino} setLotesFino={setLotesFino}/>,bodega:<Bodega lotes={lotes} setLotes={setLotes} costos={costos} setLotesFino={setLotesFino} subprodPerg={subprodPerg} setSubprodPerg={setSubprodPerg} inventariosMensuales={inventariosMensuales} setInventariosMensuales={setInventariosMensuales}/>,trilla:<Trilla lotes={lotes} setLotes={setLotes} costos={costos} subprodVerde={subprodVerde} setSubprodVerde={setSubprodVerde} subprodPerg={subprodPerg} setSubprodPerg={setSubprodPerg}/>,bodega_tri:<BodegaTrilladora lotes={lotes} setLotes={setLotes} costos={costos} setLotesFino={setLotesFino} inventariosMensuales={inventariosMensuales} setInventariosMensuales={setInventariosMensuales}/>,blend:<Blend lotes={lotes} setLotes={setLotes} blends={blends} setBlends={setBlends} costos={costos} setLotesFino={setLotesFino} inventariosMensuales={inventariosMensuales} setInventariosMensuales={setInventariosMensuales}/>,bodega_fino:<BodegaFino lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsFino={setBlendsFino} setBlendsTostado={setBlendsTostado} lotes={lotes} inventariosMensuales={inventariosMensuales} setInventariosMensuales={setInventariosMensuales}/>,trilladora_fino:<TrilladoraFino lotesFino={lotesFino} setLotesFino={setLotesFino} lotes={lotes} costos={costos}/>,bodega_tri_fino:<BodegaTrilladoraFino lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsTostado={setBlendsTostado} inventariosMensuales={inventariosMensuales} setInventariosMensuales={setInventariosMensuales}/>,blend_fino:<BlendFino lotesFino={lotesFino} setLotesFino={setLotesFino} blendsFino={blendsFino} setBlendsFino={setBlendsFino} setBlendsTostado={setBlendsTostado} inventariosMensuales={inventariosMensuales} setInventariosMensuales={setInventariosMensuales}/>,maquila:<Maquila maquilas={maquilas} setMaquilas={setMaquilas} setLotesFino={setLotesFino}/>,uba_tostado:<UbaTostado blendsTostado={blendsTostado} setBlendsTostado={setBlendsTostado} blendsFino={blendsFino} lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsFino={setBlendsFino} empaques={empaques} setEmpaques={setEmpaques} ventasTostado={ventasTostado} setVentasTostado={setVentasTostado} configEmpaque={configEmpaque} setConfigEmpaque={setConfigEmpaque}/>,ventas:<Ventas lotes={lotes} setLotes={setLotes} lotesFino={lotesFino} setLotesFino={setLotesFino} blends={blends} setBlends={setBlends} blendsFino={blendsFino} setBlendsFino={setBlendsFino} subprodVerde={subprodVerde} setSubprodVerde={setSubprodVerde}/>,pedidos:<Pedidos pedidos={pedidos} setPedidos={setPedidos} lotes={lotes} lotesFino={lotesFino} blends={blends} blendsFino={blendsFino} costos={costos} user={user}/>,crm:<CRM oportunidades={oportunidades} setOportunidades={setOportunidades} muestras={muestras} setMuestras={setMuestras} visitas={visitas} setVisitas={setVisitas} user={user}/>,trazabilidad:<Trazabilidad lotes={lotes} costos={costos} blends={blends} blendsFino={blendsFino} lotesFino={lotesFino}/>,costos:<Costos costos={costos} setCostos={setCostos}/>,usuarios:<Usuarios usuarios={usuarios} setUsuarios={setUsuarios} permisosConfig={permisosConfig} setPermisosConfig={setPermisosConfig}/>};
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
        <div style={{display:"flex",alignItems:"center",gap:14}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:"#4ADE80"}}/><span style={{color:"rgba(255,255,255,0.7)",fontSize:11,fontWeight:500}}>EN VIVO</span></div><div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>{new Date().toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button onClick={()=>exportarTodoExcel(lotes,costos,blends,lotesFino,blendsFino,maquilas,blendsTostado)} style={{background:"#166534",border:"1px solid #22c55e55",borderRadius:6,color:"#4ADE80",fontSize:11,fontWeight:700,padding:"5px 12px",cursor:"pointer",letterSpacing:0.5}}>⬇ Excel</button><button onClick={()=>exportarLineaVerdeExcel(lotes,blends)} style={{background:"#166534",border:"1px solid #22c55e55",borderRadius:6,color:"#4ADE80",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>⬇ Línea Verde</button><button onClick={()=>exportarCafeFinoExcel(lotesFino,blendsFino)} style={{background:"#166534",border:"1px solid #22c55e55",borderRadius:6,color:"#4ADE80",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>⬇ Café Fino</button><button onClick={()=>exportarTostadoMaquilaExcel(maquilas,blendsTostado)} style={{background:"#166534",border:"1px solid #22c55e55",borderRadius:6,color:"#4ADE80",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>⬇ Tostado y Maquila</button><button onClick={()=>exportarComercialExcel(lotes,lotesFino,blends,blendsFino,blendsTostado,pedidos)} style={{background:"#166534",border:"1px solid #22c55e55",borderRadius:6,color:"#4ADE80",fontSize:10,fontWeight:700,padding:"5px 10px",cursor:"pointer"}}>⬇ Comercial</button></div></div>
      </div>
      <div style={S.sidebar}>
        <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>{navFiltrado.map((item)=>item.sep?(<div key={item.k} style={{height:1,background:C.border,margin:"6px 6px"}}/>):(<div key={item.k} onClick={()=>setView(item.k)} style={{padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderRadius:6,marginBottom:2,background:viewEfectiva===item.k?C.accentBg:"transparent",color:viewEfectiva===item.k?C.navy:C.textDim,fontSize:13,fontWeight:viewEfectiva===item.k?600:400,borderLeft:viewEfectiva===item.k?"3px solid "+C.accent:"3px solid transparent"}}><span dangerouslySetInnerHTML={{__html:item.icon}} style={{fontSize:14,width:18,textAlign:"center"}}/>{item.l}</div>))}</nav>
        <div style={{padding:"12px 14px",borderTop:"1px solid "+C.border}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:34,height:34,borderRadius:"50%",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.white,flexShrink:0}}>{user?.nombre?.charAt(0)}</div><div style={{overflow:"hidden"}}><div style={{color:C.navy,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.nombre}</div><div style={{color:C.textDim,fontSize:10}}>{user?.rol}</div></div></div><button style={{...S.btnG,width:"100%",textAlign:"center",fontSize:12}} onClick={()=>{fbSignOut(auth);setLoggedIn(false);setUser(null);}}>Cerrar Sesion</button></div>
      </div>
      <div style={S.main}>{esReadOnly&&(<div style={{background:C.goldBg,border:"1px solid "+C.gold+"50",borderRadius:8,padding:"9px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:15}}>&#128065;</span><span style={{color:C.gold,fontWeight:700,fontSize:13}}>Solo lectura</span><span style={{color:C.gold,fontSize:12,opacity:0.85}}> — Puedes consultar este módulo pero no tienes permisos para modificar datos.</span></div>)}<Suspense fallback={<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}><CoffeeLoader/></div>}>{View}</Suspense></div>
    </div>
  </>);
}
