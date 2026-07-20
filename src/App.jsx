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



function Dashboard({lotes,costos,lotesFino,maquilas,blendsTostado,blends,blendsFino}){
  const [tabDash,setTabDash]=useState("central");const [filtroMesDash,setFiltroMesDash]=useState("todos");const [filtroMesBM,setFiltroMesBM]=useState("todos");const [filtroMesCF,setFiltroMesCF]=useState("todos");const [tabBlends,setTabBlends]=useState("blend");const [filtroMesBlend,setFiltroMesBlend]=useState("todos");const [filtroMesBlendf,setFiltroMesBlendf]=useState("todos");
  // ── Central de Procesos — solo lotes de recepción real (excluye carga masiva) ──
  const lotesCP=lotes.filter(l=>l.origen_lote!=="carga_directa"&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual");
  const lotesCPFilt=filtroMesDash==="todos"?lotesCP:lotesCP.filter(l=>l.mes===filtroMesDash);
  const tkq=lotesCPFilt.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const tp=lotesCPFilt.reduce((s,l)=>s+(l.kg_producto||0),0);
  const tc=lotesCPFilt.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  const tex=lotesCP.filter(l=>l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const ep=lotesCP.filter(l=>!["Finalizado","Cerrado"].includes(l.estado)).length;
  const tcos=costos.reduce((s,c)=>s+c.valor,0);
  const enBodega=lotesCP.filter(l=>l.estado==="Bodega");
  const kgBodega=enBodega.reduce((s,l)=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);return s+(l.kg_producto-sal);},0);
  const pf={};lotesCPFilt.forEach(l=>l.cereza.forEach(c=>{pf[c.finca]=(pf[c.finca]||0)+c.kg;}));
  const mf=Math.max(...Object.values(pf),1);
  const pe={};lotes.forEach(l=>{pe[l.estado]=(pe[l.estado]||0)+1;});
  const tr=[18380,25000,45687,80314,91189,92000,95000,88000,103000,110000,118000,125000];
  const mt=Math.max(...tr);const ml=["E","F","M","A","M","J","J","A","S","O","N","D"];
  const ing=tex*1250000;const mg=ing-tc-tcos;
  // ── Bodega Milan ──
  const lotesBM=lotes.filter(l=>l.kg_producto>0&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual");
  const lotesBMFilt=filtroMesBM==="todos"?lotesBM:lotesBM.filter(l=>l.mes===filtroMesBM);
  const bmDetalle=lotesBMFilt.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);const cst=calcCosto(l,costos,lotes);const ck=cst?cst.total:0;return{...l,_stock:l.kg_producto-sal,_salTot:sal,_costoKg:ck,_costoTotal:ck*l.kg_producto};});
  const bmConStock=bmDetalle.filter(l=>l._stock>0);
  const bmKgEnt=bmDetalle.reduce((s,l)=>s+l.kg_producto,0);
  const bmValEnt=bmDetalle.reduce((s,l)=>s+l._costoTotal,0);
  const bmStockKg=bmDetalle.reduce((s,l)=>s+l._stock,0);
  const bmSalidasKg=bmDetalle.reduce((s,l)=>s+l._salTot,0);
  const bmValSalidas=lotesBMFilt.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  const bmValStock=bmDetalle.reduce((s,l)=>s+l._stock*l._costoKg,0);
  const bmPorProd={};bmDetalle.forEach(l=>{const p=l.producto||"Sin Producto";if(!bmPorProd[p])bmPorProd[p]={kgEnt:0,costoTot:0,kgSal:0,kgStock:0};bmPorProd[p].kgEnt+=l.kg_producto;bmPorProd[p].costoTot+=l._costoTotal;bmPorProd[p].kgSal+=l._salTot;bmPorProd[p].kgStock+=l._stock;});
  const bmProdData=Object.entries(bmPorProd).sort((a,b)=>b[1].kgEnt-a[1].kgEnt).map(([prod,d])=>({prod,kgEnt:d.kgEnt,costoUk:d.kgEnt>0?d.costoTot/d.kgEnt:0,kgSal:d.kgSal,kgStock:d.kgStock}));
  // ── Trilla ──
  const lotesTrilla=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const triExcelso=lotesTrilla.reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const triEntrada=lotesTrilla.reduce((s,l)=>s+(l.trilla.entrada_usada||l.kg_producto||0),0);
  const triMerma=lotesTrilla.reduce((s,l)=>s+(l.trilla.merma||0),0);
  const triRend=triEntrada>0?((triExcelso/triEntrada)*100).toFixed(1):0;
  // ── Bodega CF ──
  const lotesBCF=(lotesFino||[]).filter(l=>!l.para_trilladora);
  const lotesBCFFilt=filtroMesCF==="todos"?lotesBCF:lotesBCF.filter(l=>l.mes===filtroMesCF);
  const bcfDetalle=lotesBCFFilt.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);const ck=l.costo_compra_kg||0;return{...l,_stock:l.kg_producto-sal,_salTot:sal,_costoKg:ck,_costoTotal:ck*l.kg_producto};});
  const bcfEntradas=bcfDetalle.reduce((s,l)=>s+l.kg_producto,0);
  const bcfValEnt=bcfDetalle.reduce((s,l)=>s+l._costoTotal,0);
  const bcfSalidas=bcfDetalle.reduce((s,l)=>s+l._salTot,0);
  const bcfValSalidas=lotesBCFFilt.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  const bcfStock=bcfEntradas-bcfSalidas;
  const bcfValStock=bcfDetalle.reduce((s,l)=>s+l._stock*l._costoKg,0);
  const bcfPorProd={};bcfDetalle.forEach(l=>{const p=l.producto||"Sin Producto";if(!bcfPorProd[p])bcfPorProd[p]={kgEnt:0,costoTot:0,kgSal:0,kgStock:0};bcfPorProd[p].kgEnt+=l.kg_producto;bcfPorProd[p].costoTot+=l._costoTotal;bcfPorProd[p].kgSal+=l._salTot;bcfPorProd[p].kgStock+=l._stock;});
  const bcfProdData=Object.entries(bcfPorProd).sort((a,b)=>b[1].kgEnt-a[1].kgEnt).map(([prod,d])=>({prod,kgEnt:d.kgEnt,costoUk:d.kgEnt>0?d.costoTot/d.kgEnt:0,kgSal:d.kgSal,kgStock:d.kgStock}));
  // ── Trilladora CF ──
  const lotesTCF=(lotesFino||[]).filter(l=>l.para_trilladora);
  const tcfExcelso=lotesTCF.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const tcfSalidas=lotesTCF.reduce((s,l)=>s+(l.salidas_trilladora||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const tcfStock=tcfExcelso-tcfSalidas;
  // ── Maquila ──
  const maqAll=maquilas||[];
  const maqActivas=maqAll.filter(m=>m.estado_pipeline!=="entregado");
  const maqKg=maqAll.reduce((s,m)=>s+(m.kg_recibidos||0),0);
  // ── Blends ──
  const _stockB=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const blendsAll=blends||[];
  const blendsFilt=filtroMesBlend==="todos"?blendsAll:blendsAll.filter(b=>mesDe(b.fecha)===filtroMesBlend);
  const blendsKgTotal=blendsFilt.reduce((s,b)=>s+b.kg_total,0);
  const blendsValTotal=blendsFilt.reduce((s,b)=>s+(b.valor_total||0),0);
  const blendsStockKg=blendsFilt.reduce((s,b)=>s+_stockB(b),0);
  const blendsKgSal=blendsFilt.reduce((s,b)=>s+(b.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const blendsValSal=blendsFilt.reduce((s,b)=>s+(b.salidas||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  const blendsPorProd={};blendsFilt.forEach(b=>{const p=b.producto_comercial||b.nombre||"Sin Nombre";if(!blendsPorProd[p])blendsPorProd[p]={count:0,kgTotal:0,valTotal:0,kgSal:0,kgStock:0};blendsPorProd[p].count++;blendsPorProd[p].kgTotal+=b.kg_total;blendsPorProd[p].valTotal+=(b.valor_total||0);blendsPorProd[p].kgSal+=(b.salidas||[]).reduce((a,si)=>a+si.peso_salida,0);blendsPorProd[p].kgStock+=_stockB(b);});
  const blendsProdData=Object.entries(blendsPorProd).sort((a,b)=>b[1].kgTotal-a[1].kgTotal).map(([prod,d])=>({prod,count:d.count,kgTotal:d.kgTotal,costoUk:d.kgTotal>0?d.valTotal/d.kgTotal:0,kgSal:d.kgSal,kgStock:d.kgStock}));
  // ── Blends Cafe Fino ──
  const _stockBF=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const blendsFAll=blendsFino||[];
  const blendsFfilt=filtroMesBlendf==="todos"?blendsFAll:blendsFAll.filter(b=>mesDe(b.fecha)===filtroMesBlendf);
  const blendsFKgTotal=blendsFfilt.reduce((s,b)=>s+b.kg_total,0);
  const blendsFValTotal=blendsFfilt.reduce((s,b)=>s+(b.valor_total||0),0);
  const blendsFStockKg=blendsFfilt.reduce((s,b)=>s+_stockBF(b),0);
  const blendsFKgSal=blendsFfilt.reduce((s,b)=>s+(b.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const blendsFValSal=blendsFfilt.reduce((s,b)=>s+(b.salidas||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  const blendsFPorProd={};blendsFfilt.forEach(b=>{const p=b.producto_comercial||b.nombre||"Sin Nombre";if(!blendsFPorProd[p])blendsFPorProd[p]={count:0,kgTotal:0,valTotal:0,kgSal:0,kgStock:0};blendsFPorProd[p].count++;blendsFPorProd[p].kgTotal+=b.kg_total;blendsFPorProd[p].valTotal+=(b.valor_total||0);blendsFPorProd[p].kgSal+=(b.salidas||[]).reduce((a,si)=>a+si.peso_salida,0);blendsFPorProd[p].kgStock+=_stockBF(b);});
  const blendsFProdData=Object.entries(blendsFPorProd).sort((a,b)=>b[1].kgTotal-a[1].kgTotal).map(([prod,d])=>({prod,count:d.count,kgTotal:d.kgTotal,costoUk:d.kgTotal>0?d.valTotal/d.kgTotal:0,kgSal:d.kgSal,kgStock:d.kgStock}));
  // ── UBA Tostado ──
  const tostAll=blendsTostado||[];
  const tostKg=tostAll.reduce((s,t)=>s+(t.kg_tostado||0),0);
  const tostSal=tostAll.reduce((s,t)=>s+(t.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const tostStock=tostKg-tostSal;
  const tostRend=tostAll.length>0?((tostAll.reduce((s,t)=>{const ka=t.kg_a_tostar||0;return s+(ka>0?(t.kg_tostado||0)/ka*100:0);},0)/tostAll.length).toFixed(1)):0;
  // ── Central de Procesos — datos para gráficos (solo lotes reales) ──
  const cerezaMes={};lotesCPFilt.forEach(l=>{const m=l.mes||mesDe(l.fecha_proceso||l.fecha_recibo)||"otros";cerezaMes[m]=(cerezaMes[m]||0)+l.cereza.reduce((a,c)=>a+c.kg,0);});
  const mesMostrar=MESES.filter(m=>cerezaMes[m]).map(m=>({mes:m,kg:cerezaMes[m]}));
  const fincaData=Object.entries(pf).sort((a,b)=>b[1]-a[1]);
  const byProd={};lotesCPFilt.forEach(l=>{const p=l.producto||"Sin Producto";if(!byProd[p])byProd[p]={cereza:0,terminado:0,lotes:0};byProd[p].cereza+=l.cereza.reduce((a,c)=>a+c.kg,0);byProd[p].terminado+=l.kg_producto||0;byProd[p].lotes++;});
  const prodData=Object.entries(byProd).sort((a,b)=>b[1].cereza-a[1].cereza);
  const INS_KEYS=[["jugo","Jugo"],["panela","Panela"],["harina","Harina"],["levadura","Levadura"]];
  const insumosData=INS_KEYS.map(([k,nombre])=>{const qty=lotesCPFilt.reduce((s,l)=>s+(l.insumos?.[k]||0),0);const val=lotesCPFilt.reduce((s,l)=>{const ins=l.insumos||{};return s+(ins[k]||0)*(ins["vr_"+k]||0);},0);return{nombre,qty,val};});
  const totalInsCP=insumosData.reduce((s,d)=>s+d.val,0);
  const cbCosFiltrados=costos.filter(c=>c.centro==="Central de Beneficio"&&(filtroMesDash==="todos"||c.mes===filtroMesDash));
  const cbPorTipo={};cbCosFiltrados.forEach(c=>{cbPorTipo[c.tipo]=(cbPorTipo[c.tipo]||0)+c.valor;});
  const cbPieTotal=Object.values(cbPorTipo).reduce((s,v)=>s+v,0);
  const cbPieData=Object.entries(cbPorTipo).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>({tipo,val,pct:cbPieTotal>0?((val/cbPieTotal)*100).toFixed(1):"0.0"}));
  const promA=tp>0?tc/tp:0;
  const promB=tp>0?totalInsCP/tp:0;
  const promC=tp>0?cbPieTotal/tp:0;
  const promTotal=promA+promB+promC;
  const TABS_DASH=[["central","Central de Procesos"],["bodega_milan","Bodega Milan"],["trilla","Trilla"],["bodega_cf","Bodega Cafe Fino"],["trilladora_cf","Trilladora CF"],["blends","Blends"],["maquila","Maquila"],["uba_tostado","UBA Tostado"]];
  return(<div>
    <div style={{marginBottom:16}}><div style={{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PLAN MILAN - CENTRAL DE BENEFICIO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Dashboard Ejecutivo</div><div style={{color:C.textDim,fontSize:12,marginTop:3}}>{new Date().toLocaleDateString("es-CO",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div></div>
    <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {TABS_DASH.map(([k,v])=>(<button key={k} onClick={()=>setTabDash(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:tabDash===k?700:400,color:tabDash===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tabDash===k?"3px solid "+C.accent:"3px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{v}</button>))}
    </div>
    {tabDash==="central"&&(<>
      {/* ── Filtro global por mes ── */}
      {(()=>{const mesesDisp=MESES.filter(m=>lotesCP.some(l=>l.mes===m)||costos.some(c=>c.centro==="Central de Beneficio"&&c.mes===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
          {["todos",...mesesDisp].map(m=>(<button key={m} onClick={()=>setFiltroMesDash(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesDash===m?C.navy:C.border),background:filtroMesDash===m?C.navy:"transparent",color:filtroMesDash===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesDash===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
        </div>
        {filtroMesDash!=="todos"&&<span style={{fontSize:11,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.accentBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesDash.charAt(0).toUpperCase()+filtroMesDash.slice(1)}</span>}
      </div>);})()}
      {/* ── KPI Cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10,marginBottom:18}}>
        {[{label:"Cereza Recibida",value:fmt(tkq)+" kg",sub:lotesCPFilt.length+" lotes",col:C.teal,icon:"☕"},{label:"Producto Terminado",value:fmt(tp)+" kg",sub:"café seco / pergamino",col:C.accent,icon:"📦"},{label:"Lotes Procesados",value:lotesCPFilt.filter(l=>l.kg_producto>0).length,sub:"con producto terminado",col:C.navy,icon:"🔢"},{label:"Valor Materia Prima",value:fmtCOP(tc),sub:"costo total cereza",col:C.gold,icon:"💰"},{label:"Costo Insumos",value:fmtCOP(totalInsCP),sub:"jugo·panela·harina·lev",col:C.purple,icon:"🧪"},{label:"Total Costos CB",value:fmtCOP(cbPieTotal),sub:"costos registrados CB",col:C.orange,icon:"📊",fs:15}].map(k=>(
          <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
              <span style={{fontSize:14}}>{k.icon}</span>
            </div>
            <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
            <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
          </div>
        ))}
      </div>
      {/* ── Tarea 2 y 3: Gráficos ── */}
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16,marginBottom:20}}>
        {/* Gráfico Cereza por Mes */}
        <div style={{...S.card,minHeight:260}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Cereza Recibida por Mes</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Suma kg acumulada</div></div>
            <div style={{background:C.tealBg,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700,color:C.teal}}>{fmt(tkq)} kg total</div>
          </div>
          {mesMostrar.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",paddingTop:40}}>Sin datos de recepcion.</div>:(()=>{
            const W=520,H=190,pt=20,pr=10,pb=40,pl=52;
            const cW=W-pl-pr,cH=H-pt-pb;
            const maxV=Math.max(...mesMostrar.map(d=>d.kg),1);
            const bStep=cW/mesMostrar.length;
            const bW=Math.min(38,bStep*0.62);
            const ticks=4;
            return(<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{overflow:"visible",display:"block"}}>
              {Array.from({length:ticks+1},(_,i)=>{const y=pt+cH-(cH*i/ticks);const v=maxV*i/ticks;return(<g key={i}><line x1={pl} y1={y} x2={pl+cW} y2={y} stroke={C.border} strokeWidth={i===0?"1.5":"0.6"} strokeDasharray={i===0?"":"5 3"}/><text x={pl-8} y={y+4} textAnchor="end" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{v>=1000?(v/1000).toFixed(0)+"k":Math.round(v)}</text></g>);})}
              {mesMostrar.map((d,i)=>{
                const x=pl+bStep*i+(bStep-bW)/2;
                const bH=Math.max(2,cH*(d.kg/maxV));
                const y=pt+cH-bH;
                const isMax=d.kg===Math.max(...mesMostrar.map(x=>x.kg));
                return(<g key={d.mes}>
                  <rect x={x} y={y} width={bW} height={bH} fill={isMax?C.navy:C.teal} rx="3" opacity={isMax?1:0.82}/>
                  <text x={x+bW/2} y={pt+cH+14} textAnchor="middle" fontSize="8.5" fill={C.textDim} fontFamily="Inter,sans-serif">{d.mes.slice(0,3).toUpperCase()}</text>
                  <text x={x+bW/2} y={Math.max(y-5,pt+9)} textAnchor="middle" fontSize="8" fill={isMax?C.navy:C.teal} fontWeight="700" fontFamily="Inter,sans-serif">{d.kg>=1000?(d.kg/1000).toFixed(1)+"k":Math.round(d.kg)}</text>
                </g>);
              })}
              <line x1={pl} y1={pt} x2={pl} y2={pt+cH} stroke={C.border} strokeWidth="1.5"/>
              <line x1={pl} y1={pt+cH} x2={pl+cW} y2={pt+cH} stroke={C.border} strokeWidth="1.5"/>
            </svg>);
          })()}
        </div>
        {/* Gráfico Cereza por Finca */}
        <div style={{...S.card,minHeight:260}}>
          <div style={{marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Cereza por Finca</div>
            <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{fincaData.length} fincas proveedoras</div>
          </div>
          {fincaData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",paddingTop:40}}>Sin datos de fincas.</div>:(()=>{
            const COLS=[C.navy,C.accent,C.teal,C.green,C.purple,C.gold,C.orange];
            const W=380,rowH=30,pt=4,pl=115,pr=52,pb=4;
            const H=pt+pb+fincaData.length*rowH;
            const maxV=fincaData[0][1];
            const barZone=W-pl-pr;
            return(<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{overflow:"visible",display:"block"}}>
              {fincaData.map(([finca,kg],i)=>{
                const y=pt+i*rowH;
                const bW=Math.max(3,(kg/maxV)*barZone);
                const col=COLS[i%COLS.length];
                const label=finca.length>16?finca.slice(0,15)+"…":finca;
                return(<g key={finca}>
                  <text x={pl-8} y={y+rowH/2+4} textAnchor="end" fontSize="10" fill={C.text} fontFamily="Inter,sans-serif">{label}</text>
                  <rect x={pl} y={y+5} width={bW} height={rowH-12} fill={col} rx="3" opacity="0.88"/>
                  <text x={pl+bW+5} y={y+rowH/2+4} fontSize="9" fill={col} fontWeight="700" fontFamily="Inter,sans-serif">{kg>=1000?(kg/1000).toFixed(1)+"k":Math.round(kg)}</text>
                </g>);
              })}
            </svg>);
          })()}
        </div>
      </div>
      {/* ── Tarea 4: Tablas por Producto e Insumos ── */}
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:16,alignItems:"start"}}>
        {/* Tabla Resumen por Producto */}
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Cereza recibida vs. café seco obtenido</div></div>
            <div style={{fontSize:11,color:C.textDim,background:C.accentBg,borderRadius:8,padding:"4px 10px"}}>Conversión = kg cereza / kg seco</div>
          </div>
          {prodData.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin datos.</div>:(
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
              <thead><tr>
                <th style={S.th}>Producto</th>
                <th style={S.th}>Lotes</th>
                <th style={S.th}>Cereza (kg)</th>
                <th style={S.th}>Café Seco (kg)</th>
                <th style={S.th}>Conversión</th>
                <th style={S.th}>%</th>
              </tr></thead>
              <tbody>{prodData.map(([prod,d])=>{
                const conv=d.terminado>0?(d.cereza/d.terminado).toFixed(2):"—";
                const pct=tkq>0?((d.cereza/tkq)*100).toFixed(1):"0.0";
                const barW=tkq>0?(d.cereza/tkq)*100:0;
                return(<tr key={prod}>
                  <td style={{...S.td,fontWeight:700,color:C.navy}}><Bdg label={prod} col={C.teal} bg={C.tealBg}/></td>
                  <td style={{...S.td,textAlign:"center",color:C.textDim}}>{d.lotes}</td>
                  <td style={{...S.td,fontWeight:700,color:C.teal,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmt(d.cereza)}</td>
                  <td style={{...S.td,fontWeight:700,color:C.accent,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{d.terminado>0?fmt(d.terminado):"—"}</td>
                  <td style={{...S.td,textAlign:"center"}}>{d.terminado>0?(<span style={{background:C.accentBg,color:C.accent,borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700}}>{conv}:1</span>):"—"}</td>
                  <td style={{...S.td,minWidth:90}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{flex:1,height:7,background:C.bg,borderRadius:4,overflow:"hidden",border:"1px solid "+C.border}}>
                        <div style={{width:barW+"%",height:"100%",background:C.teal,borderRadius:4}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:C.teal,minWidth:30,textAlign:"right"}}>{pct}%</span>
                    </div>
                  </td>
                </tr>);
              })}
              <tr style={{background:C.accentBg}}>
                <td style={{...S.td,fontWeight:800,color:C.navy}} colSpan={2}>TOTAL</td>
                <td style={{...S.td,fontWeight:800,color:C.teal,textAlign:"right"}}>{fmt(tkq)}</td>
                <td style={{...S.td,fontWeight:800,color:C.accent,textAlign:"right"}}>{fmt(tp)}</td>
                <td style={{...S.td,textAlign:"center"}}>{tp>0?(<span style={{background:C.navy,color:C.white,borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700}}>{(tkq/tp).toFixed(2)}:1</span>):"—"}</td>
                <td style={{...S.td,fontWeight:700,color:C.navy}}>100%</td>
              </tr>
              </tbody>
            </table></TablaScrollV>
          )}
        </div>
        {/* Tabla Insumos de Proceso */}
        <div style={S.card}>
          <div style={{marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Insumos de Proceso</div>
            <div style={{fontSize:11,color:C.textDim,marginTop:2}}>Etapa fermentación / proceso</div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={S.th}>Insumo</th>
              <th style={{...S.th,textAlign:"right"}}>Cantidad Total</th>
              <th style={{...S.th,textAlign:"right"}}>Valor Total</th>
              <th style={{...S.th,textAlign:"right"}}>%</th>
            </tr></thead>
            <tbody>
              {insumosData.map(d=>{
                const pct=totalInsCP>0?((d.val/totalInsCP)*100).toFixed(1):"0.0";
                const barW=totalInsCP>0?(d.val/totalInsCP)*100:0;
                return(<tr key={d.nombre}>
                  <td style={{...S.td,fontWeight:600}}><Bdg label={d.nombre} col={C.purple} bg={C.purpleBg}/></td>
                  <td style={{...S.td,textAlign:"right",color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{fmt(d.qty)} u</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.purple,fontVariantNumeric:"tabular-nums"}}>{fmtCOP(d.val)}</td>
                  <td style={{...S.td,minWidth:70}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{flex:1,height:7,background:C.bg,borderRadius:4,overflow:"hidden",border:"1px solid "+C.border}}>
                        <div style={{width:barW+"%",height:"100%",background:C.purple,borderRadius:4,opacity:0.8}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:C.purple,minWidth:28,textAlign:"right"}}>{pct}%</span>
                    </div>
                  </td>
                </tr>);
              })}
              <tr style={{background:C.purpleBg}}>
                <td style={{...S.td,fontWeight:800,color:C.navy}} colSpan={2}>TOTAL INSUMOS</td>
                <td style={{...S.td,fontWeight:800,color:C.purple,textAlign:"right"}}>{fmtCOP(totalInsCP)}</td>
                <td style={{...S.td,fontWeight:700,color:C.navy}}>100%</td>
              </tr>
            </tbody>
          </table>
          {totalInsCP===0&&<div style={{color:C.textFaint,fontSize:12,marginTop:12,textAlign:"center"}}>Sin insumos registrados.</div>}
        </div>
      </div>
      {/* ── Distribución CB + Costo promedio / unidad ── */}
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,alignItems:"start",marginTop:20}}>
        {/* Pastel: Distribución costos CB */}
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Distribución de Costos — Central de Beneficio</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>% por rubro · {filtroMesDash==="todos"?"todos los meses":filtroMesDash.charAt(0).toUpperCase()+filtroMesDash.slice(1)}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:C.textDim}}>Total</div><div style={{fontSize:14,fontWeight:800,color:C.orange}}>{fmtCOP(cbPieTotal)}</div></div>
          </div>
          {cbPieData.length===0
            ?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"40px 0"}}>Sin costos registrados para Central de Beneficio.</div>
            :(()=>{
              const PCOLS=[C.navy,C.teal,C.accent,C.green,C.purple,C.gold,C.orange,"#e11d48","#0369a1","#7c3aed","#059669","#b45309"];
              const cx=105,cy=105,r=88;
              if(cbPieData.length===1){
                const d=cbPieData[0];const col=PCOLS[0];
                return(<svg viewBox="0 0 420 215" width="100%" style={{display:"block",overflow:"visible"}}>
                  <circle cx={cx} cy={cy} r={r} fill={col} stroke={C.panel} strokeWidth="2" opacity="0.93"/>
                  <text x={cx} y={cy+6} textAnchor="middle" fontSize="20" fill="#fff" fontWeight="800" fontFamily="Inter,sans-serif">100%</text>
                  <rect x="218" y="15" width="13" height="13" fill={col} rx="2"/><text x="236" y="25" fontSize="10.5" fill={C.text} fontFamily="Inter,sans-serif">{(d.tipo||"Sin tipo").length>19?(d.tipo||"Sin tipo").slice(0,18)+"…":(d.tipo||"Sin tipo")}</text>
                  <text x="302" y="25" textAnchor="end" fontSize="10.5" fill={col} fontWeight="700" fontFamily="Inter,sans-serif">100%</text>
                  <text x="418" y="25" textAnchor="end" fontSize="10" fill={C.textDim} fontFamily="Inter,sans-serif">{fmtCOP(d.val)}</text>
                </svg>);
              }
              let cum=0;
              const slices=cbPieData.map((d,i)=>{
                const frac=cbPieTotal>0?d.val/cbPieTotal:0;
                const s0=cum*2*Math.PI;cum+=frac;const s1=cum*2*Math.PI;
                const x1=cx+r*Math.cos(s0-Math.PI/2),y1=cy+r*Math.sin(s0-Math.PI/2);
                const x2=cx+r*Math.cos(s1-Math.PI/2),y2=cy+r*Math.sin(s1-Math.PI/2);
                const path=`M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${(s1-s0)>Math.PI?1:0} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
                const mid=(s0+s1)/2-Math.PI/2;
                return{...d,path,col:PCOLS[i%PCOLS.length],frac,mid};
              });
              const vH=Math.max(215,30+cbPieData.length*22+20);
              return(<svg viewBox={`0 0 420 ${vH}`} width="100%" style={{display:"block",overflow:"visible"}}>
                <circle cx={cx} cy={cy} r={r+3} fill={C.bg} stroke={C.border} strokeWidth="1"/>
                {slices.map(s=>(
                  <g key={s.tipo}>
                    <path d={s.path} fill={s.col} stroke={C.panel} strokeWidth="2.5" opacity="0.93"/>
                    {s.frac>0.055&&(<text x={(cx+(r*0.62)*Math.cos(s.mid)).toFixed(2)} y={(cy+(r*0.62)*Math.sin(s.mid)+4).toFixed(2)} textAnchor="middle" fontSize="9.5" fill="#fff" fontWeight="700" fontFamily="Inter,sans-serif">{s.pct}%</text>)}
                  </g>
                ))}
                {slices.map((s,i)=>{
                  const ry=25+i*22;
                  const tipo=s.tipo&&s.tipo.length>19?s.tipo.slice(0,18)+"…":(s.tipo||"Sin tipo");
                  return(<g key={s.tipo+"_l"}>
                    <rect x="218" y={ry-10} width="13" height="13" fill={s.col} rx="2" opacity="0.9"/>
                    <text x="236" y={ry} fontSize="10.5" fill={C.text} fontFamily="Inter,sans-serif">{tipo}</text>
                    <text x="302" y={ry} textAnchor="end" fontSize="10.5" fill={s.col} fontWeight="700" fontFamily="Inter,sans-serif">{s.pct}%</text>
                    <text x="418" y={ry} textAnchor="end" fontSize="10" fill={C.textDim} fontFamily="Inter,sans-serif">{fmtCOP(s.val)}</text>
                  </g>);
                })}
              </svg>);
            })()
          }
        </div>
        {/* Tabla costo promedio / unidad */}
        <div style={S.card}>
          <div style={{marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Costo Promedio por Unidad</div>
            <div style={{fontSize:11,color:C.textDim,marginTop:2}}>Costo por kg de producto terminado</div>
          </div>
          {[{label:"Costo MP / unidad",val:promA,col:C.gold,icon:"🌱"},{label:"Costo Insumos / unidad",val:promB,col:C.purple,icon:"🧪"},{label:"Costo MO Admin / unidad",val:promC,col:C.orange,icon:"⚙️"},{label:"Costo Total / unidad",val:promTotal,col:C.navy,icon:"💰",bold:true}].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",marginBottom:8,borderRadius:10,background:r.bold?C.navy:C.bg,border:"1px solid "+(r.bold?C.navy:C.border),borderLeft:"4px solid "+r.col}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:15}}>{r.icon}</span>
                <span style={{fontSize:12,fontWeight:r.bold?700:500,color:r.bold?"#fff":C.text}}>{r.label}</span>
              </div>
              <div style={{fontSize:15,fontWeight:800,color:r.bold?"#fff":r.col,fontVariantNumeric:"tabular-nums",fontFamily:"Inter,sans-serif"}}>{fmtCOP(r.val)}</div>
            </div>
          ))}
          <div style={{marginTop:8,padding:"8px 12px",background:C.accentBg,borderRadius:8,fontSize:11,color:C.textDim,textAlign:"center"}}>{lotesCPFilt.filter(l=>l.kg_producto>0).length} lotes · {fmt(tp)} kg totales</div>
        </div>
      </div>
    </>)}
    {tabDash==="bodega_milan"&&(<>
      {/* ── Filtro por mes ── */}
      {(()=>{const mesesBM=MESES.filter(m=>lotesBM.some(l=>l.mes===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
          {["todos",...mesesBM].map(m=>(<button key={m} onClick={()=>setFiltroMesBM(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesBM===m?C.navy:C.border),background:filtroMesBM===m?C.navy:"transparent",color:filtroMesBM===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesBM===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
        </div>
        {filtroMesBM!=="todos"&&<span style={{fontSize:11,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.accentBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesBM.charAt(0).toUpperCase()+filtroMesBM.slice(1)}</span>}
      </div>);})()}
      {/* ── 7 KPI Cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:10,marginBottom:18}}>
        {[{label:"Lotes Entrada",value:bmDetalle.length,sub:lotesBM.length+" lotes total",col:C.navy,icon:"📥"},{label:"kg Entrada",value:fmt(bmKgEnt)+" kg",sub:"café pergamino",col:C.teal,icon:"⚖️"},{label:"Valor Entrada",value:fmtCOP(bmValEnt),sub:"costo total entrada",col:C.gold,icon:"💰",fs:14},{label:"kg Salidas",value:fmt(bmSalidasKg)+" kg",sub:"transferido / vendido",col:C.orange,icon:"📤"},{label:"Valor Salidas",value:fmtCOP(bmValSalidas),sub:"valor total salidas",col:C.accent,icon:"💸",fs:14},{label:"kg Stock",value:fmt(bmStockKg)+" kg",sub:"disponible en bodega",col:C.green,icon:"🏪"},{label:"Valor Stock",value:fmtCOP(bmValStock),sub:"valorización a costo",col:C.purple,icon:"📊",fs:14}].map(k=>(
          <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
              <span style={{fontSize:14}}>{k.icon}</span>
            </div>
            <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
            <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
          </div>
        ))}
      </div>
      {/* ── Tabla resumen por producto ── */}
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{bmProdData.length} productos · {bmDetalle.length} lotes en total</div></div>
          <div style={{display:"flex",gap:18,fontSize:11,color:C.textDim}}>
            <span>Entrada: <strong style={{color:C.teal}}>{fmt(bmKgEnt)} kg</strong></span>
            <span>Salidas: <strong style={{color:C.orange}}>{fmt(bmSalidasKg)} kg</strong></span>
            <span>Stock: <strong style={{color:C.green}}>{fmt(bmStockKg)} kg</strong></span>
          </div>
        </div>
        {bmProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin lotes registrados para el periodo seleccionado.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
            <thead><tr>{["Producto","kg Entrada","Valor Unitario","kg Salidas","kg Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
            <tbody>
              {bmProdData.map(d=>(
                <tr key={d.prod}>
                  <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.teal} bg={C.tealBg}/></td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgEnt)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoUk>0?fmtCOP(d.costoUk):"—"}</td>
                  <td style={{...S.td,textAlign:"right",color:C.orange,fontVariantNumeric:"tabular-nums"}}>{d.kgSal>0?fmt(d.kgSal)+" kg":"—"}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}><span style={{color:d.kgStock>0?C.green:C.textDim}}>{fmt(d.kgStock)} kg</span></td>
                </tr>
              ))}
              <tr style={{background:C.navy}}>
                <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
                <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(bmKgEnt)} kg</td>
                <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{bmSalidasKg>0?fmt(bmSalidasKg)+" kg":"—"}</td>
                <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(bmStockKg)} kg</td>
              </tr>
            </tbody>
          </table></TablaScrollV>
        )}
      </div>
    </>)}
    {tabDash==="trilla"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Lotes Trillados" value={lotesTrilla.length} col={C.green}/>
        <KPI label="Excelso Total" value={fmt(triExcelso)+" kg"} col={C.navy}/>
        <KPI label="Merma Total" value={fmt(triMerma)+" kg"} col={C.red}/>
        <KPI label="Rendimiento Prom." value={triRend+"%"} col={C.teal}/>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Registros de Trilla</div>
        {lotesTrilla.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin trillas registradas.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr>{["Corte/Lote","Mes","Producto","Entrada kg","Excelso kg","Merma kg","Rendimiento","P.Elec","Cat.Dens"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{[...lotesTrilla].sort((a,b)=>(b.trilla?.fecha_trilla||"").localeCompare(a.trilla?.fecha_trilla||"")).map(l=>{
            const t=l.trilla;const ent=t.entrada_usada||l.kg_producto||0;const rend=ent>0?((t.kg_excelso/ent)*100).toFixed(1):0;
            return(<tr key={l.id}>
              <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.green,fontSize:11}}>{t.nombre_trillado||l.codigo}</td>
              <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
              <td style={S.td}><Bdg label={l.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
              <td style={{...S.td,color:C.navy}}>{fmt(ent)} kg</td>
              <td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(t.kg_excelso)} kg</td>
              <td style={{...S.td,color:C.red}}>{fmt(t.merma||0)} kg</td>
              <td style={{...S.td,color:C.accent,fontWeight:600}}>{rend}%</td>
              <td style={S.td}>{fmt(t.pasilla_elec||0)} kg</td>
              <td style={S.td}>{fmt(t.catadora_dens||0)} kg</td>
            </tr>);
          })}</tbody></table></TablaScrollV>
        )}
      </div>
    </>)}
    {tabDash==="bodega_cf"&&(<>
      {/* ── Filtro por mes ── */}
      {(()=>{const mesesCF=MESES.filter(m=>lotesBCF.some(l=>l.mes===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
          {["todos",...mesesCF].map(m=>(<button key={m} onClick={()=>setFiltroMesCF(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesCF===m?C.green:C.border),background:filtroMesCF===m?C.green:"transparent",color:filtroMesCF===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesCF===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
        </div>
        {filtroMesCF!=="todos"&&<span style={{fontSize:11,color:C.green,fontWeight:700,whiteSpace:"nowrap",background:C.greenBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesCF.charAt(0).toUpperCase()+filtroMesCF.slice(1)}</span>}
      </div>);})()}
      {/* ── 7 KPI Cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:10,marginBottom:18}}>
        {[{label:"Lotes Entrada",value:bcfDetalle.length,sub:lotesBCF.length+" lotes total",col:C.navy,icon:"📥"},{label:"kg Entrada",value:fmt(bcfEntradas)+" kg",sub:"café fino",col:C.teal,icon:"⚖️"},{label:"Valor Entrada",value:fmtCOP(bcfValEnt),sub:"costo total entrada",col:C.gold,icon:"💰",fs:14},{label:"kg Salidas",value:fmt(bcfSalidas)+" kg",sub:"transferido / vendido",col:C.orange,icon:"📤"},{label:"Valor Salidas",value:fmtCOP(bcfValSalidas),sub:"valor total salidas",col:C.accent,icon:"💸",fs:14},{label:"kg Stock",value:fmt(bcfStock)+" kg",sub:"disponible en bodega",col:C.green,icon:"🏪"},{label:"Valor Stock",value:fmtCOP(bcfValStock),sub:"valorización a costo",col:C.purple,icon:"📊",fs:14}].map(k=>(
          <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
              <span style={{fontSize:14}}>{k.icon}</span>
            </div>
            <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
            <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
          </div>
        ))}
      </div>
      {/* ── Tabla resumen por producto ── */}
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{bcfProdData.length} productos · {bcfDetalle.length} lotes en total</div></div>
          <div style={{display:"flex",gap:18,fontSize:11,color:C.textDim}}>
            <span>Entrada: <strong style={{color:C.teal}}>{fmt(bcfEntradas)} kg</strong></span>
            <span>Salidas: <strong style={{color:C.orange}}>{fmt(bcfSalidas)} kg</strong></span>
            <span>Stock: <strong style={{color:C.green}}>{fmt(bcfStock)} kg</strong></span>
          </div>
        </div>
        {bcfProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin lotes registrados para el periodo seleccionado.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
            <thead><tr>{["Producto","kg Entrada","Valor Unitario","kg Salidas","kg Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
            <tbody>
              {bcfProdData.map(d=>(
                <tr key={d.prod}>
                  <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.green} bg={C.greenBg}/></td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgEnt)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoUk>0?fmtCOP(d.costoUk):"—"}</td>
                  <td style={{...S.td,textAlign:"right",color:C.orange,fontVariantNumeric:"tabular-nums"}}>{d.kgSal>0?fmt(d.kgSal)+" kg":"—"}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}><span style={{color:d.kgStock>0?C.green:C.textDim}}>{fmt(d.kgStock)} kg</span></td>
                </tr>
              ))}
              <tr style={{background:C.navy}}>
                <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
                <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(bcfEntradas)} kg</td>
                <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{bcfSalidas>0?fmt(bcfSalidas)+" kg":"—"}</td>
                <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(bcfStock)} kg</td>
              </tr>
            </tbody>
          </table></TablaScrollV>
        )}
      </div>
    </>)}
    {tabDash==="trilladora_cf"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Lotes" value={lotesTCF.length} col={C.green}/>
        <KPI label="Excelso Total" value={fmt(tcfExcelso)+" kg"} col={C.navy}/>
        <KPI label="Salidas Excelso" value={fmt(tcfSalidas)+" kg"} col={C.orange}/>
        <KPI label="Stock Excelso" value={fmt(tcfStock)+" kg"} col={C.teal}/>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Lotes Trilladora Cafe Fino</div>
        {lotesTCF.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin lotes registrados.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}><thead><tr>{["Corte/Trillado","Mes","Producto","Excelso kg","Salidas kg","Stock kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{lotesTCF.map(l=>{const t=l.trilla||{};const sal=(l.salidas_trilladora||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=(t.kg_excelso||0)-sal;return(<tr key={l.id}>
            <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.green,fontSize:11}}>{t.nombre_trillado||l.codigo}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
            <td style={S.td}><Bdg label={l.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
            <td style={{...S.td,color:C.navy,fontWeight:600}}>{fmt(t.kg_excelso||0)} kg</td>
            <td style={{...S.td,color:C.orange}}>{fmt(sal)} kg</td>
            <td style={S.td}><span style={{color:stock>0?C.green:C.textDim,fontWeight:700}}>{fmt(stock)} kg</span></td>
          </tr>);})}
          </tbody></table></TablaScrollV>
        )}
      </div>
    </>)}
    {tabDash==="blends"&&(<>
      {/* ── Sub-tabs Blend / Blend Cafe Fino ── */}
      <div style={{display:"flex",gap:6,marginBottom:20,borderBottom:"2px solid "+C.border}}>
        {[["blend","Blend"],["blend_fino","Blend Cafe Fino"]].map(([k,v])=>(<button key={k} onClick={()=>setTabBlends(k)} style={{padding:"7px 18px",cursor:"pointer",fontSize:12,fontWeight:tabBlends===k?700:400,color:tabBlends===k?C.purple:C.textDim,background:"transparent",border:"none",borderBottom:tabBlends===k?"3px solid "+C.purple:"3px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{v}</button>))}
      </div>
      {/* ── Subsección Blend ── */}
      {tabBlends==="blend"&&(<>
        {/* Filtro mes */}
        {(()=>{const mesesB=MESES.filter(m=>blendsAll.some(b=>mesDe(b.fecha)===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
            {["todos",...mesesB].map(m=>(<button key={m} onClick={()=>setFiltroMesBlend(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesBlend===m?C.purple:C.border),background:filtroMesBlend===m?C.purple:"transparent",color:filtroMesBlend===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesBlend===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
          </div>
          {filtroMesBlend!=="todos"&&<span style={{fontSize:11,color:C.purple,fontWeight:700,whiteSpace:"nowrap",background:C.purpleBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesBlend.charAt(0).toUpperCase()+filtroMesBlend.slice(1)}</span>}
        </div>);})()}
        {/* KPI Cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10,marginBottom:18}}>
          {[{label:"Blends Creados",value:blendsFilt.length,sub:"periodo seleccionado",col:C.navy,icon:"🔀"},{label:"kg Producidos",value:fmt(blendsKgTotal)+" kg",sub:"acumulado",col:C.teal,icon:"⚖️"},{label:"Valor Producido",value:fmtCOP(blendsValTotal),sub:"costo total",col:C.gold,icon:"💰",fs:14},{label:"kg Salidas",value:fmt(blendsKgSal)+" kg",sub:"despachado",col:C.orange,icon:"📤"},{label:"Valor Salidas",value:fmtCOP(blendsValSal),sub:"facturado salidas",col:C.accent,icon:"💸",fs:14},{label:"kg en Stock",value:fmt(blendsStockKg)+" kg",sub:"disponible",col:C.green,icon:"🏪"}].map(k=>(
            <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
                <span style={{fontSize:14}}>{k.icon}</span>
              </div>
              <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
              <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
            </div>
          ))}
        </div>
        {/* Gráfico dona + Tabla */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16,marginBottom:0}}>
          <div style={S.card}>
            <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>Participación por Producto</div>
            <div style={{fontSize:11,color:C.textDim,marginBottom:14}}>% sobre kg producidos</div>
            {blendsProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"30px 0"}}>Sin datos</div>:(()=>{
              const PCOLS=[C.purple,C.navy,C.teal,C.accent,C.green,C.gold,C.orange,"#e11d48","#0369a1","#059669"];
              const cx=90,cy=90,ro=72,ri=38;
              const total=blendsProdData.reduce((s,d)=>s+d.kgTotal,0);
              if(total===0)return<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"30px 0"}}>Sin datos</div>;
              if(blendsProdData.length===1){const col=PCOLS[0];const d=blendsProdData[0];return(<svg viewBox="0 0 340 195" width="100%" style={{display:"block"}}>
                <circle cx={cx} cy={cy} r={ro} fill={col} opacity="0.9"/>
                <circle cx={cx} cy={cy} r={ri} fill={C.panel}/>
                <text x={cx} y={cy-6} textAnchor="middle" fontSize="11" fill={col} fontWeight="800" fontFamily="Inter,sans-serif">100%</text>
                <text x={cx} y={cy+8} textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(d.kgTotal)} kg</text>
                <rect x="195" y="15" width="11" height="11" fill={col} rx="2"/>
                <text x="211" y="24" fontSize="10" fill={C.text} fontFamily="Inter,sans-serif">{d.prod.length>20?d.prod.slice(0,19)+"…":d.prod}</text>
                <text x="336" y="24" textAnchor="end" fontSize="10" fill={col} fontWeight="700" fontFamily="Inter,sans-serif">100%</text>
              </svg>);}
              let cum=0;
              const slices=blendsProdData.map((d,i)=>{const frac=d.kgTotal/total;const s0=cum*2*Math.PI;cum+=frac;const s1=cum*2*Math.PI;const x1=cx+ro*Math.cos(s0-Math.PI/2),y1=cy+ro*Math.sin(s0-Math.PI/2);const x2=cx+ro*Math.cos(s1-Math.PI/2),y2=cy+ro*Math.sin(s1-Math.PI/2);const xi1=cx+ri*Math.cos(s1-Math.PI/2),yi1=cy+ri*Math.sin(s1-Math.PI/2);const xi2=cx+ri*Math.cos(s0-Math.PI/2),yi2=cy+ri*Math.sin(s0-Math.PI/2);const path=`M${x1.toFixed(2)},${y1.toFixed(2)} A${ro},${ro} 0 ${(s1-s0)>Math.PI?1:0} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi1.toFixed(2)},${yi1.toFixed(2)} A${ri},${ri} 0 ${(s1-s0)>Math.PI?1:0} 0 ${xi2.toFixed(2)},${yi2.toFixed(2)} Z`;const mid=(s0+s1)/2-Math.PI/2;const pct=((frac)*100).toFixed(1);return{...d,path,col:PCOLS[i%PCOLS.length],frac,mid,pct};});
              const vH=Math.max(195,40+blendsProdData.length*22);
              return(<svg viewBox={`0 0 340 ${vH}`} width="100%" style={{display:"block"}}>
                <circle cx={cx} cy={cy} r={ro+2} fill={C.bg} stroke={C.border} strokeWidth="1"/>
                {slices.map(s=>(<path key={s.prod} d={s.path} fill={s.col} stroke={C.panel} strokeWidth="2" opacity="0.92"/>))}
                {slices.map(s=>s.frac>0.05&&(<text key={s.prod+"t"} x={(cx+(ro*0.63)*Math.cos(s.mid)).toFixed(2)} y={(cy+(ro*0.63)*Math.sin(s.mid)+4).toFixed(2)} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="800" fontFamily="Inter,sans-serif">{s.pct}%</text>))}
                <text x={cx} y={cy-5} textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(total)}</text>
                <text x={cx} y={cy+7} textAnchor="middle" fontSize="8" fill={C.textFaint} fontFamily="Inter,sans-serif">kg total</text>
                {slices.map((s,i)=>{const ry=22+i*22;const label=s.prod.length>18?s.prod.slice(0,17)+"…":s.prod;return(<g key={s.prod+"l"}>
                  <rect x="195" y={ry-9} width="11" height="11" fill={s.col} rx="2" opacity="0.9"/>
                  <text x="211" y={ry} fontSize="9.5" fill={C.text} fontFamily="Inter,sans-serif">{label}</text>
                  <text x="336" y={ry} textAnchor="end" fontSize="9.5" fill={s.col} fontWeight="700" fontFamily="Inter,sans-serif">{s.pct}%</text>
                </g>);})}
              </svg>);
            })()}
          </div>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{blendsProdData.length} productos · {blendsFilt.length} blends</div></div>
              <div style={{display:"flex",gap:14,fontSize:11,color:C.textDim}}>
                <span>Stock: <strong style={{color:C.green}}>{fmt(blendsStockKg)} kg</strong></span>
              </div>
            </div>
            {blendsProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin blends registrados.</div>:(
              <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Producto Comercial","Blends","kg Producidos","Costo/kg","kg Salidas","kg Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
                <tbody>
                  {blendsProdData.map(d=>(<tr key={d.prod}>
                    <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.purple} bg={C.purpleBg}/></td>
                    <td style={{...S.td,textAlign:"center",color:C.textDim}}>{d.count}</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgTotal)} kg</td>
                    <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoUk>0?fmtCOP(d.costoUk):"—"}</td>
                    <td style={{...S.td,textAlign:"right",color:C.orange,fontVariantNumeric:"tabular-nums"}}>{d.kgSal>0?fmt(d.kgSal)+" kg":"—"}</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}><span style={{color:d.kgStock>0?C.green:C.textDim}}>{fmt(d.kgStock)} kg</span></td>
                  </tr>))}
                  <tr style={{background:C.navy}}>
                    <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
                    <td style={{...S.td,textAlign:"center",color:"rgba(255,255,255,0.5)"}}>{blendsFilt.length}</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(blendsKgTotal)} kg</td>
                    <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{blendsKgSal>0?fmt(blendsKgSal)+" kg":"—"}</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(blendsStockKg)} kg</td>
                  </tr>
                </tbody>
              </table></TablaScrollV>
            )}
          </div>
        </div>
      </>)}
      {/* ── Subsección Blend Cafe Fino ── */}
      {tabBlends==="blend_fino"&&(<>
        {/* Filtro mes */}
        {(()=>{const mesesBF2=MESES.filter(m=>blendsFAll.some(b=>mesDe(b.fecha)===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
            {["todos",...mesesBF2].map(m=>(<button key={m} onClick={()=>setFiltroMesBlendf(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesBlendf===m?C.green:C.border),background:filtroMesBlendf===m?C.green:"transparent",color:filtroMesBlendf===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesBlendf===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
          </div>
          {filtroMesBlendf!=="todos"&&<span style={{fontSize:11,color:C.green,fontWeight:700,whiteSpace:"nowrap",background:C.greenBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesBlendf.charAt(0).toUpperCase()+filtroMesBlendf.slice(1)}</span>}
        </div>);})()}
        {/* KPI Cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10,marginBottom:18}}>
          {[{label:"Blends Creados",value:blendsFfilt.length,sub:"periodo seleccionado",col:C.navy,icon:"🔀"},{label:"kg Producidos",value:fmt(blendsFKgTotal)+" kg",sub:"acumulado",col:C.teal,icon:"⚖️"},{label:"Valor Producido",value:fmtCOP(blendsFValTotal),sub:"costo total",col:C.gold,icon:"💰",fs:14},{label:"kg Salidas",value:fmt(blendsFKgSal)+" kg",sub:"despachado",col:C.orange,icon:"📤"},{label:"Valor Salidas",value:fmtCOP(blendsFValSal),sub:"facturado salidas",col:C.accent,icon:"💸",fs:14},{label:"kg en Stock",value:fmt(blendsFStockKg)+" kg",sub:"disponible",col:C.green,icon:"🏪"}].map(k=>(
            <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
                <span style={{fontSize:14}}>{k.icon}</span>
              </div>
              <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
              <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
            </div>
          ))}
        </div>
        {/* Gráfico dona + Tabla */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16}}>
          <div style={S.card}>
            <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>Participación por Producto</div>
            <div style={{fontSize:11,color:C.textDim,marginBottom:14}}>% sobre kg producidos</div>
            {blendsFProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"30px 0"}}>Sin datos</div>:(()=>{
              const PCOLS=[C.green,C.teal,C.navy,C.purple,C.accent,C.gold,C.orange,"#e11d48","#0369a1","#059669"];
              const cx=90,cy=90,ro=72,ri=38;
              const total=blendsFProdData.reduce((s,d)=>s+d.kgTotal,0);
              if(total===0)return<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"30px 0"}}>Sin datos</div>;
              if(blendsFProdData.length===1){const col=PCOLS[0];const d=blendsFProdData[0];return(<svg viewBox="0 0 340 195" width="100%" style={{display:"block"}}>
                <circle cx={cx} cy={cy} r={ro} fill={col} opacity="0.9"/>
                <circle cx={cx} cy={cy} r={ri} fill={C.panel}/>
                <text x={cx} y={cy-6} textAnchor="middle" fontSize="11" fill={col} fontWeight="800" fontFamily="Inter,sans-serif">100%</text>
                <text x={cx} y={cy+8} textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(d.kgTotal)} kg</text>
                <rect x="195" y="15" width="11" height="11" fill={col} rx="2"/>
                <text x="211" y="24" fontSize="10" fill={C.text} fontFamily="Inter,sans-serif">{d.prod.length>20?d.prod.slice(0,19)+"…":d.prod}</text>
                <text x="336" y="24" textAnchor="end" fontSize="10" fill={col} fontWeight="700" fontFamily="Inter,sans-serif">100%</text>
              </svg>);}
              let cum=0;
              const slices=blendsFProdData.map((d,i)=>{const frac=d.kgTotal/total;const s0=cum*2*Math.PI;cum+=frac;const s1=cum*2*Math.PI;const x1=cx+ro*Math.cos(s0-Math.PI/2),y1=cy+ro*Math.sin(s0-Math.PI/2);const x2=cx+ro*Math.cos(s1-Math.PI/2),y2=cy+ro*Math.sin(s1-Math.PI/2);const xi1=cx+ri*Math.cos(s1-Math.PI/2),yi1=cy+ri*Math.sin(s1-Math.PI/2);const xi2=cx+ri*Math.cos(s0-Math.PI/2),yi2=cy+ri*Math.sin(s0-Math.PI/2);const path=`M${x1.toFixed(2)},${y1.toFixed(2)} A${ro},${ro} 0 ${(s1-s0)>Math.PI?1:0} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi1.toFixed(2)},${yi1.toFixed(2)} A${ri},${ri} 0 ${(s1-s0)>Math.PI?1:0} 0 ${xi2.toFixed(2)},${yi2.toFixed(2)} Z`;const mid=(s0+s1)/2-Math.PI/2;const pct=((frac)*100).toFixed(1);return{...d,path,col:PCOLS[i%PCOLS.length],frac,mid,pct};});
              const vH=Math.max(195,40+blendsFProdData.length*22);
              return(<svg viewBox={`0 0 340 ${vH}`} width="100%" style={{display:"block"}}>
                <circle cx={cx} cy={cy} r={ro+2} fill={C.bg} stroke={C.border} strokeWidth="1"/>
                {slices.map(s=>(<path key={s.prod} d={s.path} fill={s.col} stroke={C.panel} strokeWidth="2" opacity="0.92"/>))}
                {slices.map(s=>s.frac>0.05&&(<text key={s.prod+"t"} x={(cx+(ro*0.63)*Math.cos(s.mid)).toFixed(2)} y={(cy+(ro*0.63)*Math.sin(s.mid)+4).toFixed(2)} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="800" fontFamily="Inter,sans-serif">{s.pct}%</text>))}
                <text x={cx} y={cy-5} textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(total)}</text>
                <text x={cx} y={cy+7} textAnchor="middle" fontSize="8" fill={C.textFaint} fontFamily="Inter,sans-serif">kg total</text>
                {slices.map((s,i)=>{const ry=22+i*22;const label=s.prod.length>18?s.prod.slice(0,17)+"…":s.prod;return(<g key={s.prod+"l"}>
                  <rect x="195" y={ry-9} width="11" height="11" fill={s.col} rx="2" opacity="0.9"/>
                  <text x="211" y={ry} fontSize="9.5" fill={C.text} fontFamily="Inter,sans-serif">{label}</text>
                  <text x="336" y={ry} textAnchor="end" fontSize="9.5" fill={s.col} fontWeight="700" fontFamily="Inter,sans-serif">{s.pct}%</text>
                </g>);})}
              </svg>);
            })()}
          </div>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{blendsFProdData.length} productos · {blendsFfilt.length} blends</div></div>
              <div style={{display:"flex",gap:14,fontSize:11,color:C.textDim}}>
                <span>Stock: <strong style={{color:C.green}}>{fmt(blendsFStockKg)} kg</strong></span>
              </div>
            </div>
            {blendsFProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin blends registrados.</div>:(
              <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Producto Comercial","Blends","kg Producidos","Costo/kg","kg Salidas","kg Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
                <tbody>
                  {blendsFProdData.map(d=>(<tr key={d.prod}>
                    <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.green} bg={C.greenBg}/></td>
                    <td style={{...S.td,textAlign:"center",color:C.textDim}}>{d.count}</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgTotal)} kg</td>
                    <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoUk>0?fmtCOP(d.costoUk):"—"}</td>
                    <td style={{...S.td,textAlign:"right",color:C.orange,fontVariantNumeric:"tabular-nums"}}>{d.kgSal>0?fmt(d.kgSal)+" kg":"—"}</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}><span style={{color:d.kgStock>0?C.green:C.textDim}}>{fmt(d.kgStock)} kg</span></td>
                  </tr>))}
                  <tr style={{background:C.navy}}>
                    <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
                    <td style={{...S.td,textAlign:"center",color:"rgba(255,255,255,0.5)"}}>{blendsFfilt.length}</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(blendsFKgTotal)} kg</td>
                    <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{blendsFKgSal>0?fmt(blendsFKgSal)+" kg":"—"}</td>
                    <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(blendsFStockKg)} kg</td>
                  </tr>
                </tbody>
              </table></TablaScrollV>
            )}
          </div>
        </div>
      </>)}
    </>)}
    {tabDash==="maquila"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Total Maquilas" value={maqAll.length} col={C.accent}/>
        <KPI label="En Proceso" value={maqActivas.length} col={C.orange}/>
        <KPI label="kg Recibidos" value={fmt(maqKg)+" kg"} col={C.navy}/>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Registros de Maquila</div>
        {maqAll.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin maquilas registradas.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}><thead><tr>{["Codigo","Mes","Cliente","kg Recibidos","Servicio","Estado"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{[...maqAll].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map(m=>(<tr key={m.id}>
            <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.accent,fontSize:11}}>{m.codigo||"—"}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{m.mes||mesDe(m.fecha)}</td>
            <td style={{...S.td,fontWeight:600}}>{m.cliente}</td>
            <td style={{...S.td,color:C.navy,fontWeight:600}}>{fmt(m.kg_recibidos||0)} kg</td>
            <td style={S.td}>{m.servicio||"—"}</td>
            <td style={S.td}><Bdg label={m.estado_pipeline||m.estado||"—"} col={C.teal} bg={C.tealBg}/></td>
          </tr>))}
          </tbody></table></TablaScrollV>
        )}
      </div>
    </>)}
    {tabDash==="uba_tostado"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Tostaciones" value={tostAll.length} col={C.purple}/>
        <KPI label="kg Tostado" value={fmt(tostKg)+" kg"} col={C.navy}/>
        <KPI label="Salidas kg" value={fmt(tostSal)+" kg"} col={C.orange}/>
        <KPI label="Stock kg" value={fmt(tostStock)+" kg"} col={C.green}/>
        <KPI label="Rend. Promedio" value={tostRend+"%"} col={C.teal}/>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Registros de Tostacion</div>
        {tostAll.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin registros de tostacion.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:750}}><thead><tr>{["Codigo","Mes","Producto","kg a Tostar","kg Tostado","Rend.","Stock kg","Responsable"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{[...tostAll].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map(t=>{const sal=(t.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=(t.kg_tostado||0)-sal;const rend=(t.kg_a_tostar||0)>0?((t.kg_tostado||0)/(t.kg_a_tostar)*100).toFixed(1):0;return(<tr key={t.id}>
            <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.purple,fontSize:11}}>{t.codigo||"—"}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{mesDe(t.fecha)}</td>
            <td style={{...S.td,fontWeight:600}}>{t.nombre_producto||"—"}</td>
            <td style={{...S.td,color:C.navy}}>{fmt(t.kg_a_tostar||0)} kg</td>
            <td style={{...S.td,color:C.purple,fontWeight:700}}>{fmt(t.kg_tostado||0)} kg</td>
            <td style={{...S.td,color:C.accent}}>{rend}%</td>
            <td style={S.td}><span style={{color:stock>0?C.green:C.textDim,fontWeight:700}}>{fmt(stock)} kg</span></td>
            <td style={S.td}>{t.responsable||"—"}</td>
          </tr>);})}
          </tbody></table></TablaScrollV>
        )}
      </div>
    </>)}
  </div>);
}








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
