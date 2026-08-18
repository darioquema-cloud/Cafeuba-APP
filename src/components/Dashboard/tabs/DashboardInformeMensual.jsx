import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmt,fmtCOP,fmtFecha,today,dateToCode}from"../../../lib/format";
import{mesDe,mesTrillaDe}from"../../../lib/dates";
import{calcCosto,calcCostoTri}from"../../../lib/costing";
import{pesoATrilladora}from"../../../lib/stock";
import{DonutChart}from"../../ui/DonutChart";
import{jsPDF}from"jspdf";
import autoTable from"jspdf-autotable";
const SeccionTitulo=({n,children})=>(
  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:24,marginBottom:10}}>
    <span style={{background:C.accentBg,color:C.accent,fontSize:11,fontWeight:700,width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{n}</span>
    <span style={{fontWeight:700,fontSize:14,color:C.navy}}>{children}</span>
  </div>
);

export function DashboardInformeMensual({lotes,costos,lotesFino,blends,blendsFino,blendsTostado,subprodPerg,subprodVerde}){
  const [filtroMes,setFiltroMes]=useState("todos");
  const mesesDisp=MESES.filter(m=>lotes.some(l=>l.mes===m));
  // Excluye cargas directas, trilla directa y registros manuales: no representan cereza
  // recibida real. Mismo criterio que lotesCP en DashboardCentral.jsx.
  const lotesCP=lotes.filter(l=>l.origen_lote!=="carga_directa"&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual");

  // ---- BLOQUE 1: Resumen Ejecutivo ----
  const lotesMes=lotesCP.filter(l=>filtroMes==="todos"||l.mes===filtroMes);
  const lotesTerminadosMes=lotesMes.filter(l=>(l.kg_producto||0)>0);
  const kgCereza=lotesMes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const kgPergamino=lotesTerminadosMes.reduce((s,l)=>s+(l.kg_producto||0),0);
  const kgExcelsoVerde=lotes.filter(l=>l.trilla?.kg_excelso>0&&(filtroMes==="todos"||mesTrillaDe(l)===filtroMes)).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const kgExcelsoFino=lotesFino.filter(l=>l.trilla?.kg_excelso>0&&(filtroMes==="todos"||mesTrillaDe(l)===filtroMes)).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const kgExcelsoTotal=kgExcelsoVerde+kgExcelsoFino;
  const kgTostado=blendsTostado.filter(t=>filtroMes==="todos"||t.mes===filtroMes).reduce((s,t)=>s+(t.kg_cafe_tostado||0),0);

  // ---- BLOQUE: Producción y Rendimientos ----
  const kgCerezaTerminados=lotesTerminadosMes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const relacionCerezaPergVerde=kgPergamino>0?kgCerezaTerminados/kgPergamino:0;
  const kgPergTrilladoVerde=lotes.filter(l=>l.trilla?.kg_excelso>0&&(filtroMes==="todos"||mesTrillaDe(l)===filtroMes)).reduce((s,l)=>s+pesoATrilladora(l),0);
  const pctMermaTrillaVerde=kgPergTrilladoVerde>0?(1-(kgExcelsoVerde/kgPergTrilladoVerde))*100:0;

  // Factor Rendimiento Industrial Ponderado y Desviación vs. Pretrilla — misma lógica que DashboardTrilla.jsx (líneas ~41-53)
  const lotesTrillaVerdeMes=lotes.filter(l=>l.trilla?.kg_excelso>0&&(filtroMes==="todos"||mesTrillaDe(l)===filtroMes));
  const esPlaceholderCargaIM=(l)=>l.trilla?.factor_industrial===0&&l.trilla?.factor_pretrilla_ponderado===0;
  const ponderarIM=(arr,campo)=>{
    const con=arr.filter(l=>!esPlaceholderCargaIM(l)&&l.trilla?.[campo]!=null);
    const peso=con.reduce((s,l)=>s+pesoATrilladora(l),0);
    return peso>0?con.reduce((s,l)=>s+pesoATrilladora(l)*l.trilla[campo],0)/peso:null;
  };
  const factorIndustrialPonderado=ponderarIM(lotesTrillaVerdeMes,"factor_industrial");
  const factorPretrillaPonderadoIM=ponderarIM(lotesTrillaVerdeMes,"factor_pretrilla_ponderado");
  const desviacionFactor=(factorIndustrialPonderado!=null&&factorPretrillaPonderadoIM!=null)?(factorIndustrialPonderado-factorPretrillaPonderadoIM):null;

  const kgPergTrilladoFino=lotesFino.filter(l=>l.trilla?.kg_excelso>0&&(filtroMes==="todos"||mesTrillaDe(l)===filtroMes)).reduce((s,l)=>s+(l.trilla.entrada_usada||0),0);
  const pctMermaTrillaFino=kgPergTrilladoFino>0?(1-(kgExcelsoFino/kgPergTrilladoFino))*100:0;
  const pctRendTrillaFino=kgPergTrilladoFino>0?(kgExcelsoFino/kgPergTrilladoFino)*100:0;

  // ---- BLOQUE: Subproductos ----
  // subprodPerg/subprodVerde guardan su propio campo "mes" (calculado con mesDe al registrarse,
  // igual que se muestra en la columna "Mes" de la tabla Subproductos Verde en Trilla.jsx) —
  // se filtra directo por sp.mes, sin pasar por mesTrillaDe (que espera un lote con l.trilla).
  const subprodPergMes=(subprodPerg||[]).filter(sp=>filtroMes==="todos"||sp.mes===filtroMes).reduce((s,sp)=>s+(sp.kg||0),0);
  const subprodVerdeConProcesoMes=(subprodVerde||[]).filter(sp=>(filtroMes==="todos"||sp.mes===filtroMes)&&sp.con_proceso==="Con Proceso").reduce((s,sp)=>s+(sp.total_subproductos||0),0);
  const subprodVerdeSinProcesoMes=(subprodVerde||[]).filter(sp=>(filtroMes==="todos"||sp.mes===filtroMes)&&sp.con_proceso==="Sin Proceso").reduce((s,sp)=>s+(sp.total_subproductos||0),0);

  // ---- BLOQUE: Inventarios ----
  // Stock al cierre del mes filtrado (histórico) — se asume el año actual para construir la
  // fecha de corte, ya que los meses se guardan como texto ("julio") sin año. Si el informe
  // se usa para un mes de un año distinto al actual, este cálculo quedaría desalineado.
  const anioActual=new Date().getFullYear();
  const idxMesFiltro=MESES.indexOf(filtroMes);
  const finDeMesCutoff=filtroMes==="todos"||idxMesFiltro<0?null:(()=>{
    const mesNum=idxMesFiltro+1;
    const ultimoDia=new Date(anioActual,mesNum,0).getDate();
    return `${anioActual}-${String(mesNum).padStart(2,"0")}-${String(ultimoDia).padStart(2,"0")}`;
  })();
  const kgHastaCutoff=(salidas)=>(salidas||[]).filter(s=>!finDeMesCutoff||s.fecha<=finDeMesCutoff).reduce((s,x)=>s+(x.peso_salida||0),0);

  const lotesConProductoIM=lotes.filter(l=>(l.kg_producto||0)>0);
  const stockBMkg=lotesConProductoIM.reduce((s,l)=>s+Math.max(0,(l.kg_producto||0)-kgHastaCutoff(l.salidas_bodega)),0);
  const stockBMvalor=lotesConProductoIM.reduce((s,l)=>{const stock=Math.max(0,(l.kg_producto||0)-kgHastaCutoff(l.salidas_bodega));const cl=calcCosto(l,costos,lotes);return s+stock*(cl?cl.total:0);},0);
  // Valor/kg Prom.: excluye lotes con stock<=0 o costo<=0 (dato roto/incompleto) del promedio ponderado.
  // stockBMkg/stockBMvalor NO cambian — siguen siendo el total real.
  const ponderadoValidoBM=lotesConProductoIM.reduce((s,l)=>{
    const stock=Math.max(0,(l.kg_producto||0)-kgHastaCutoff(l.salidas_bodega));
    const cl=calcCosto(l,costos,lotes);
    const costo=cl?cl.total:0;
    if(stock<=0||costo<=0)return s;
    return {kg:s.kg+stock,val:s.val+stock*costo};
  },{kg:0,val:0});
  const valorUnitBM=ponderadoValidoBM.kg>0?ponderadoValidoBM.val/ponderadoValidoBM.kg:0;

  const costoKgExDeIM=(l)=>{const cl=calcCosto(l,costos,lotes);const t=l.trilla;const D=calcCostoTri(mesTrillaDe(l),costos,lotes).costoTriKg;return cl&&t?.kg_excelso>0?Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D):0;};
  const lotesTrilladosIM=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const stockActualIM=lotesTrilladosIM.reduce((s,l)=>{
    const stock=(l.trilla?.kg_excelso||0)-kgHastaCutoff(l.salidas_trilladora);
    const costoKg=costoKgExDeIM(l);
    return {kg:s.kg+stock,val:s.val+(costoKg*stock)};
  },{kg:0,val:0});
  const stockBTkg=stockActualIM.kg;
  const stockBTvalor=stockActualIM.val;
  const ponderadoValidoBT=lotesTrilladosIM.reduce((s,l)=>{
    const stock=(l.trilla?.kg_excelso||0)-kgHastaCutoff(l.salidas_trilladora);
    const costoKg=costoKgExDeIM(l);
    if(stock<=0||costoKg<=0)return s;
    return {kg:s.kg+stock,val:s.val+stock*costoKg};
  },{kg:0,val:0});
  const valorUnitBT=ponderadoValidoBT.kg>0?ponderadoValidoBT.val/ponderadoValidoBT.kg:0;

  const stockBLkg=(blends||[]).reduce((s,b)=>s+Math.max(0,(b.kg_total||0)-kgHastaCutoff(b.salidas)),0);
  const stockBLvalor=(blends||[]).reduce((s,b)=>{const stock=Math.max(0,(b.kg_total||0)-kgHastaCutoff(b.salidas));return s+stock*(b.costo_kg||0);},0);
  const ponderadoValidoBL=(blends||[]).reduce((s,b)=>{
    const stock=Math.max(0,(b.kg_total||0)-kgHastaCutoff(b.salidas));
    const costo=b.costo_kg||0;
    if(stock<=0||costo<=0)return s;
    return {kg:s.kg+stock,val:s.val+stock*costo};
  },{kg:0,val:0});
  const valorUnitBL=ponderadoValidoBL.kg>0?ponderadoValidoBL.val/ponderadoValidoBL.kg:0;

  // Central de Beneficio: solo estado ACTUAL (no hay historial de cambios de estado por lote)
  const cbEnProceso=lotes.filter(l=>l.estado==="Proceso");
  const kgCBProceso=cbEnProceso.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const valorCBProceso=cbEnProceso.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  const cbEnSecado=lotes.filter(l=>l.estado==="Secado");
  const kgCBSecado=cbEnSecado.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const valorCBSecado=cbEnSecado.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);

  // Ingreso real facturado — replica esExterno de Ventas.jsx (mismas 7 fuentes, sin blendsTostado)
  const esExternoIM=s=>(!s.destino_key||s.destino_key===""||s.destino_key==="otro"||s.destino_key==="venta")&&!s.auto_blend;
  const enMesIM=s=>filtroMes==="todos"||(mesDe(s.fecha)||"")===filtroMes;
  const ingresoDeArrIM=(arr,campo)=>(arr||[]).flatMap(x=>(x[campo]||[]).filter(esExternoIM).filter(enMesIM)).reduce((s,sal)=>s+(sal.peso_salida||0)*(sal.precio_venta_kg||0),0);
  const ingresoRealMes=
    ingresoDeArrIM(lotes,"salidas_bodega")+
    ingresoDeArrIM(lotes,"salidas_trilladora")+
    ingresoDeArrIM(lotesFino,"salidas_bodega")+
    ingresoDeArrIM(lotesFino,"salidas_trilladora")+
    ingresoDeArrIM(blends,"salidas")+
    ingresoDeArrIM(blendsFino,"salidas")+
    ingresoDeArrIM(subprodVerde,"salidas");

  // ---- BLOQUE 2: Costos y Rentabilidad ----
  // Replica exacta de promA/promB/promC/promTotal de DashboardCentral.jsx (solo lotes terminados)
  const lotesCPFilt=lotesMes;
  const lotesTerminadosCP=lotesTerminadosMes;
  const tp=lotesCPFilt.reduce((s,l)=>s+(l.kg_producto||0),0);
  const tcTerminados=lotesTerminadosCP.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  const INS_KEYS=[["jugo","Jugo"],["panela","Panela"],["harina","Harina"],["levadura","Levadura"]];
  const totalInsTerminados=INS_KEYS.reduce((s,[k])=>s+lotesTerminadosCP.reduce((ss,l)=>{const ins=l.insumos||{};return ss+(ins[k]||0)*(ins["vr_"+k]||0);},0),0);
  const cbCosFiltrados=costos.filter(c=>c.centro==="Central de Beneficio"&&(filtroMes==="todos"||c.mes===filtroMes));
  const cbPorTipo={};cbCosFiltrados.forEach(c=>{cbPorTipo[c.tipo]=(cbPorTipo[c.tipo]||0)+c.valor;});
  const cbPieTotal=Object.values(cbPorTipo).reduce((s,v)=>s+v,0);
  const promA=tp>0?tcTerminados/tp:0;
  const promB=tp>0?totalInsTerminados/tp:0;
  const promC=tp>0?cbPieTotal/tp:0;
  const promTotal=promA+promB+promC;

  // Componente D (Trilladora): cuando hay un mes elegido, se usa calcCostoTri tal cual existe.
  // Cuando el filtro es "todos", no hay un unico mes valido para calcCostoTri (que exige un mes
  // exacto para casar costos de centro "Trilladora" con los kg de excelso de ese mes). En ese
  // caso se calcula un promedio ponderado real: se suma costosTri y kgEx de TODOS los meses que
  // tuvieron trilla (llamando a calcCostoTri por cada uno, sin reinventar su logica) y se divide
  // el total de costos entre el total de kg — evita elegir arbitrariamente el mes del primer lote.
  const mesesConTrilla=[...new Set(lotes.filter(l=>l.trilla?.kg_excelso>0).map(l=>mesTrillaDe(l)).filter(Boolean))];
  const D=filtroMes!=="todos"
    ?calcCostoTri(filtroMes,costos,lotes).costoTriKg
    :(()=>{
        const tot=mesesConTrilla.reduce((acc,m)=>{const r=calcCostoTri(m,costos,lotes);return{costos:acc.costos+r.costosTri,kg:acc.kg+r.kgEx};},{costos:0,kg:0});
        return tot.kg>0?tot.costos/tot.kg:0;
      })();
  const costoTotalConD=promTotal+D;

  const exportarInformePDF=()=>{
    const mesLabel=filtroMes==="todos"?"Todos los meses":filtroMes.charAt(0).toUpperCase()+filtroMes.slice(1);
    const doc=new jsPDF();
    doc.setFillColor(30,58,95);
    doc.rect(0,0,210,32,"F");
    doc.setTextColor(255,255,255);
    doc.setFont("helvetica","bold");doc.setFontSize(16);
    doc.text("CafeUba — Central de Beneficio",14,16);
    doc.setFont("helvetica","normal");doc.setFontSize(11);
    doc.text("Informe Mensual — "+mesLabel,14,25);
    doc.setTextColor(0,0,0);
    let y=42;

    doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(120,120,120);
    doc.text("COSTO TOTAL/KG",14,y);doc.text("VALOR VENDIDO",84,y);doc.text("KG EXCELSO PRODUCIDO",154,y);
    doc.setFont("helvetica","bold");doc.setFontSize(15);doc.setTextColor(30,58,95);
    doc.text(fmtCOP(costoTotalConD),14,y+8);
    doc.text(fmtCOP(ingresoRealMes),84,y+8);
    doc.text(fmt(kgExcelsoTotal)+" kg",154,y+8);
    doc.setTextColor(0,0,0);
    y+=20;

    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("1. Producción",14,y);
    autoTable(doc,{
      startY:y+4,
      head:[["Indicador","Valor"]],
      body:[
        ["Cereza Recibida",fmt(kgCereza,1)+" kg"],
        ["Pergamino Producido",fmt(kgPergamino,1)+" kg"],
        ["Trilla",fmt(kgPergTrilladoVerde,1)+" kg"],
        ["Café Tostado",fmt(kgTostado,1)+" kg"],
      ],
      styles:{fontSize:9},
      headStyles:{fillColor:[30,58,95]},
    });
    y=doc.lastAutoTable.finalY+14;

    if(y>250){doc.addPage();y=20;}
    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("2. Rendimientos vs. Referencia Cenicafé",14,y);
    autoTable(doc,{
      startY:y+4,
      head:[["Línea","Indicador","Valor"]],
      body:[
        ["Verde","Relación Cereza:Pergamino",relacionCerezaPergVerde.toFixed(1)+" : 1"],
        ["Verde","Factor Rendimiento Industrial Ponderado",factorIndustrialPonderado!=null?factorIndustrialPonderado.toFixed(2):"—"],
        ["Verde","% Merma en Trilla",pctMermaTrillaVerde.toFixed(1)+"%"],
        ["Verde","Desviación Factor Industrial vs. Pretrilla",desviacionFactor!=null?(desviacionFactor>0?"+":"")+desviacionFactor.toFixed(2):"—"],
        ["Café Fino","% Merma en Trilla",pctMermaTrillaFino.toFixed(1)+"%"],
        ["Café Fino","% Rendimiento en Trilla",pctRendTrillaFino.toFixed(1)+"%"],
      ],
      styles:{fontSize:9},
      headStyles:{fillColor:[30,58,95]},
    });
    y=doc.lastAutoTable.finalY+16;

    if(y>250){doc.addPage();y=20;}
    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("3. Subproductos",14,y);
    autoTable(doc,{
      startY:y+4,
      head:[["Indicador","Valor"]],
      body:[
        ["Subproductos Pergamino",fmt(subprodPergMes,1)+" kg"],
        ["Subproductos Verde Con Proceso",fmt(subprodVerdeConProcesoMes,1)+" kg"],
        ["Subproductos Verde Sin Proceso",fmt(subprodVerdeSinProcesoMes,1)+" kg"],
      ],
      styles:{fontSize:9},
      headStyles:{fillColor:[30,58,95]},
    });
    y=doc.lastAutoTable.finalY+16;

    if(y>250){doc.addPage();y=20;}
    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("4. Inventarios"+(filtroMes==="todos"?" (actual)":" (al cierre de "+filtroMes+")"),14,y);
    autoTable(doc,{
      startY:y+4,
      head:[["Etapa","Kg en Stock","Valor Total","Valor/kg Prom."]],
      body:[
        ["Bodega Milán",fmt(stockBMkg)+" kg",fmtCOP(stockBMvalor),fmtCOP(valorUnitBM)],
        ["Bodega Trilladora",fmt(stockBTkg)+" kg",fmtCOP(stockBTvalor),fmtCOP(valorUnitBT)],
        ["Blend",fmt(stockBLkg)+" kg",fmtCOP(stockBLvalor),fmtCOP(valorUnitBL)],
        ["Central Beneficio - En Proceso (actual)",fmt(kgCBProceso)+" kg",fmtCOP(valorCBProceso),"—"],
        ["Central Beneficio - En Secado (actual)",fmt(kgCBSecado)+" kg",fmtCOP(valorCBSecado),"—"],
      ],
      styles:{fontSize:9},
      headStyles:{fillColor:[30,58,95]},
    });
    y=doc.lastAutoTable.finalY+16;

    if(y>250){doc.addPage();y=20;}
    const totalBarra=promA+promB+promC+D;
    if(totalBarra>0){
      const anchoTotal=180;let xBarra=14;
      const partes=[[promA,[216,90,48]],[promB,[239,159,39]],[promC,[55,138,221]],[D,[29,158,117]]];
      partes.forEach(([val,[r,g,b]])=>{
        const w=(val/totalBarra)*anchoTotal;
        doc.setFillColor(r,g,b);
        doc.rect(xBarra,y,w,6,"F");
        xBarra+=w;
      });
      y+=12;
      doc.setFontSize(8);doc.setTextColor(100,100,100);
      doc.text("Materia Prima · Insumos · Central de Beneficio · Trilladora",14,y);
      doc.setTextColor(0,0,0);
      y+=10;
    }
    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("5. Costos y Rentabilidad",14,y);
    y+=16;

    if(y>270){doc.addPage();y=20;}
    doc.setFont("helvetica","normal");doc.setFontSize(9);
    doc.text("Generado el "+fmtFecha(today()),14,y);

    doc.save("CafeUba-InformeMensual-"+(filtroMes==="todos"?"Todos":filtroMes)+"-"+dateToCode(today())+".pdf");
  };

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
      <div><div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>DASHBOARD</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Informe Mensual</div></div>
      <button style={S.btn} onClick={exportarInformePDF}>⬇ Exportar PDF</button>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
      <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
        {["todos",...mesesDisp].map(m=>(<button key={m} onClick={()=>setFiltroMes(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMes===m?C.navy:C.border),background:filtroMes===m?C.navy:"transparent",color:filtroMes===m?"#fff":C.text,fontSize:11,fontWeight:filtroMes===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
      </div>
      {filtroMes!=="todos"&&<span style={{fontSize:11,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.accentBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMes.charAt(0).toUpperCase()+filtroMes.slice(1)}</span>}
    </div>

    <div style={{...S.card,marginBottom:20}}>
      <div style={{fontSize:11,color:C.textDim,marginBottom:10}}>📅 {filtroMes==="todos"?"Todos los meses":filtroMes.charAt(0).toUpperCase()+filtroMes.slice(1)}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:20}}>
        <div><div style={{fontSize:12,color:C.textDim,marginBottom:4}}>Costo Total/kg</div><div style={{fontSize:26,fontWeight:700,color:C.navy}}>{fmtCOP(costoTotalConD)}</div></div>
        <div><div style={{fontSize:12,color:C.textDim,marginBottom:4}}>Valor Vendido</div><div style={{fontSize:26,fontWeight:700,color:C.green}}>{fmtCOP(ingresoRealMes)}</div></div>
        <div><div style={{fontSize:12,color:C.textDim,marginBottom:4}}>Kg Excelso Producido</div><div style={{fontSize:26,fontWeight:700,color:C.navy}}>{fmt(kgExcelsoTotal)} kg</div></div>
      </div>
    </div>

    <SeccionTitulo n={1}>Producción</SeccionTitulo>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:24}}>
      {[["Cereza Recibida",kgCereza],["Pergamino Producido",kgPergamino],["Trilla",kgPergTrilladoVerde],["Café Tostado",kgTostado]].map(([label,val])=>(
        <div key={label} style={{background:C.panel,borderRadius:8,padding:10}}>
          <div style={{fontSize:11,color:C.textDim,marginBottom:3}}>{label}</div>
          <div style={{fontSize:16,fontWeight:700,color:C.navy}}>{fmt(val)} kg</div>
        </div>
      ))}
    </div>

    <SeccionTitulo n={2}>Rendimientos vs. Referencia Cenicafé</SeccionTitulo>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginBottom:24}}>
      <div style={S.card}>
        <div style={{fontWeight:700,fontSize:13,color:C.teal,marginBottom:12}}>Línea Verde</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Indicador","Valor"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>
            <tr><td style={S.td}>Relación Cereza:Pergamino</td><td style={{...S.td,fontWeight:700,color:C.navy}}>{relacionCerezaPergVerde.toFixed(1)} : 1</td></tr>
            <tr><td style={S.td}>Factor Rendimiento Industrial Ponderado</td><td style={{...S.td,fontWeight:700,color:C.navy}}>{factorIndustrialPonderado!=null?factorIndustrialPonderado.toFixed(2):"—"}</td></tr>
            <tr><td style={S.td}>% Merma en Trilla</td><td style={{...S.td,fontWeight:700,color:C.orange}}>{pctMermaTrillaVerde.toFixed(1)}%</td></tr>
            <tr><td style={S.td}>Desviación Factor Industrial vs. Pretrilla</td><td style={{...S.td,fontWeight:700,color:desviacionFactor!=null&&desviacionFactor>0?C.red:C.green}}>{desviacionFactor!=null?(desviacionFactor>0?"+":"")+desviacionFactor.toFixed(2):"—"}</td></tr>
          </tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={{fontWeight:700,fontSize:13,color:C.purple,marginBottom:12}}>Línea Café Fino</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Indicador","Valor"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>
            <tr><td style={S.td}>% Merma en Trilla</td><td style={{...S.td,fontWeight:700,color:C.orange}}>{pctMermaTrillaFino.toFixed(1)}%</td></tr>
            <tr><td style={S.td}>% Rendimiento en Trilla</td><td style={{...S.td,fontWeight:700,color:C.green}}>{pctRendTrillaFino.toFixed(1)}%</td></tr>
          </tbody>
        </table>
        <div style={{fontSize:11,color:C.textFaint,marginTop:10}}>Café Fino no pasa por etapa de cereza — compra directa de pergamino.</div>
      </div>
    </div>

    <SeccionTitulo n={3}>Subproductos</SeccionTitulo>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:24}}>
      {[["Pergamino",subprodPergMes],["Verde Con Proceso",subprodVerdeConProcesoMes],["Verde Sin Proceso",subprodVerdeSinProcesoMes]].map(([label,val])=>(
        <div key={label} style={{background:C.panel,borderRadius:8,padding:10}}>
          <div style={{fontSize:11,color:C.textDim,marginBottom:3}}>{label}</div>
          <div style={{fontSize:16,fontWeight:700,color:C.navy}}>{fmt(val)} kg</div>
        </div>
      ))}
    </div>

    <SeccionTitulo n={4}>Inventarios</SeccionTitulo>
    <div style={{fontSize:11,color:C.textFaint,marginBottom:10}}>{filtroMes==="todos"?"Stock actual":"Stock al cierre de "+filtroMes.charAt(0).toUpperCase()+filtroMes.slice(1)}</div>
    <div style={S.card}>
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
        <thead><tr>{["Etapa","Kg en Stock","Valor Total","Valor/kg Prom."].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>
          <tr><td style={S.td}>Bodega Milán</td><td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(stockBMkg)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(stockBMvalor)}</td><td style={{...S.td,color:C.textDim}}>{fmtCOP(valorUnitBM)}</td></tr>
          <tr><td style={S.td}>Bodega Trilladora</td><td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(stockBTkg)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(stockBTvalor)}</td><td style={{...S.td,color:C.textDim}}>{fmtCOP(valorUnitBT)}</td></tr>
          <tr><td style={S.td}>Blend</td><td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(stockBLkg)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(stockBLvalor)}</td><td style={{...S.td,color:C.textDim}}>{fmtCOP(valorUnitBL)}</td></tr>
        </tbody>
      </table>
      <div style={{borderTop:"1px solid "+C.border,paddingTop:10}}>
        <div style={{fontSize:12,fontWeight:600,color:C.navy,marginBottom:6}}>Central de Beneficio <span style={{fontWeight:400,color:C.textFaint,fontSize:11}}>(estado actual — sin historial de fechas disponible)</span></div>
        <div style={{fontSize:12,color:C.text}}>En Proceso: <b>{fmt(kgCBProceso)} kg</b> ({fmtCOP(valorCBProceso)}) &nbsp;·&nbsp; En Secado: <b>{fmt(kgCBSecado)} kg</b> ({fmtCOP(valorCBSecado)})</div>
      </div>
    </div>

    <SeccionTitulo n={5}>Costos por Kilogramo</SeccionTitulo>
    <div style={S.card}>
      <DonutChart data={[{tipo:"Materia Prima",val:promA},{tipo:"Insumos",val:promB},{tipo:"Central de Beneficio",val:promC},{tipo:"Trilladora",val:D}]} labelKey="tipo" valueKey="val" centerLabel="valor/kg" fmtSecondary={d=>fmtCOP(d.val)}/>
    </div>
  </div>);
}
