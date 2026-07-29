import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmt,fmtCOP,fmtFecha,today,dateToCode}from"../../../lib/format";
import{mesDe,mesTrillaDe}from"../../../lib/dates";
import{calcCostoTri}from"../../../lib/costing";
import{KPI}from"../../ui";
import{jsPDF}from"jspdf";
import autoTable from"jspdf-autotable";
export function DashboardInformeMensual({lotes,costos,lotesFino,blends,blendsFino,blendsTostado}){
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

  const esVentaReal=s=>s.destino_key!=="ajuste_inventario";
  const enMes=s=>filtroMes==="todos"||(mesDe(s.fecha)||"")===filtroMes;
  const valorExcelso=
    lotes.flatMap(l=>(l.salidas_trilladora||[]).filter(esVentaReal).filter(enMes)).reduce((s,x)=>s+(x.valor_total||0),0)
    +lotesFino.flatMap(l=>(l.salidas_trilladora||[]).filter(esVentaReal).filter(enMes)).reduce((s,x)=>s+(x.valor_total||0),0);
  const valorBlend=
    blends.flatMap(b=>(b.salidas||[]).filter(esVentaReal).filter(enMes)).reduce((s,x)=>s+(x.valor_total||0),0)
    +blendsFino.flatMap(b=>(b.salidas||[]).filter(esVentaReal).filter(enMes)).reduce((s,x)=>s+(x.valor_total||0),0);
  const valorTostado=blendsTostado.flatMap(t=>(t.salidas||[]).filter(esVentaReal).filter(enMes)).reduce((s,x)=>s+(x.valor_total||0),0);
  const valorTotalVendido=valorExcelso+valorBlend+valorTostado;

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
    doc.setFont("helvetica","bold");doc.setFontSize(16);
    doc.text("CafeUba — Central de Beneficio",14,18);
    doc.setFont("helvetica","normal");doc.setFontSize(12);
    doc.text("Informe Mensual — "+mesLabel,14,26);

    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("Resumen Ejecutivo",14,38);
    autoTable(doc,{
      startY:42,
      head:[["Indicador","Valor"]],
      body:[
        ["Kg Cereza Recibida",fmt(kgCereza,1)+" kg"],
        ["Kg Pergamino Producido",fmt(kgPergamino,1)+" kg"],
        ["Kg Excelso Producido",fmt(kgExcelsoTotal,1)+" kg"],
        ["Kg Café Tostado",fmt(kgTostado,1)+" kg"],
        ["Costo Total/kg (a+b+c)",fmtCOP(promTotal)],
        ["Valor Total Vendido",fmtCOP(valorTotalVendido)],
      ],
      styles:{fontSize:9},
      headStyles:{fillColor:[30,58,95]},
    });

    let y=doc.lastAutoTable.finalY+12;
    doc.setFont("helvetica","bold");doc.setFontSize(11);
    doc.text("Costos y Rentabilidad",14,y);
    autoTable(doc,{
      startY:y+4,
      head:[["Componente","Valor por kg","Descripción"]],
      body:[
        ["a",fmtCOP(promA),"Materia Prima"],
        ["b",fmtCOP(promB),"Insumos"],
        ["c",fmtCOP(promC),"Central de Beneficio"],
        ["D",fmtCOP(D)+(filtroMes==="todos"?" (prom. ponderado)":""),"Trilladora"],
        ["Total",fmtCOP(costoTotalConD),"Costo total por kg (a+b+c+D)"],
      ],
      styles:{fontSize:9},
      headStyles:{fillColor:[30,58,95]},
    });
    y=doc.lastAutoTable.finalY+16;

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

    <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:10}}>Resumen Ejecutivo</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:24}}>
      <KPI label="Kg Cereza Recibida" value={fmt(kgCereza)+" kg"} col={C.teal} icon="☕" autoFit/>
      <KPI label="Kg Pergamino Producido" value={fmt(kgPergamino)+" kg"} col={C.accent} icon="📦" autoFit/>
      <KPI label="Kg Excelso Producido" value={fmt(kgExcelsoTotal)+" kg"} col={C.navy} icon="⚙️" autoFit/>
      <KPI label="Kg Café Tostado" value={fmt(kgTostado)+" kg"} col={C.purple} icon="🔥" autoFit/>
      <KPI label="Costo Total/kg" value={fmtCOP(promTotal)} col={C.gold} icon="💰" autoFit/>
      <KPI label="Valor Total Vendido" value={fmtCOP(valorTotalVendido)} col={C.green} icon="💵" autoFit/>
    </div>

    <div style={S.card}>
      <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:14}}>Costos y Rentabilidad</div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["Componente","Valor por kg","Descripción"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>
          <tr><td style={{...S.td,fontWeight:700,color:C.gold}}>a</td><td style={{...S.td,fontWeight:600}}>{fmtCOP(promA)}</td><td style={S.td}>Materia Prima</td></tr>
          <tr><td style={{...S.td,fontWeight:700,color:C.purple}}>b</td><td style={{...S.td,fontWeight:600}}>{fmtCOP(promB)}</td><td style={S.td}>Insumos</td></tr>
          <tr><td style={{...S.td,fontWeight:700,color:C.orange}}>c</td><td style={{...S.td,fontWeight:600}}>{fmtCOP(promC)}</td><td style={S.td}>Central de Beneficio</td></tr>
          <tr><td style={{...S.td,fontWeight:700,color:C.teal}}>D</td><td style={{...S.td,fontWeight:600}}>{fmtCOP(D)}{filtroMes==="todos"&&<span style={{color:C.textFaint,fontSize:10}}> (prom. ponderado)</span>}</td><td style={S.td}>Trilladora</td></tr>
          <tr style={{background:C.accentBg}}><td style={{...S.td,fontWeight:800,color:C.navy}}>Total</td><td style={{...S.td,fontWeight:800,color:C.navy}}>{fmtCOP(costoTotalConD)}</td><td style={{...S.td,fontWeight:700,color:C.navy}}>Costo total por kg (a+b+c+D)</td></tr>
        </tbody>
      </table>
    </div>
  </div>);
}
