import{useState,useMemo}from"react";
import{C,S}from"../../theme";
import{NORMAS,MESES}from"../../data/constants";
import{fmtCOP,fmt,today,genId,dateToCode,fmtFecha}from"../../lib/format";
import{semanaISO,mesDe}from"../../lib/dates";
import{calcCosto,calcCostoTri}from"../../lib/costing";
import{pesoATrilladora}from"../../lib/stock";
import{Bdg,Fld,KPI,Modal,AutoFitText,TablaScrollV}from"../ui";
export function Trilla({lotes,setLotes,costos,subprodVerde,setSubprodVerde}){
  const blankFormTrilla=()=>({excelso:"",pasilla_elec:"",catadora_dens:"",inferiores:"",cisco:"",humedad:"",norma:NORMAS[0],fecha_trilla:"",codigo_corte:"",con_proceso:"Con Proceso",obs:""});
  const blankManual=()=>({fecha:today(),codigo:"",producto:"",kg:"",valor_unitario:"",notas:""});
  const [selArr,setSelArr]=useState([]);
  const [modalManual,setModalManual]=useState(false);
  const [formManual,setFormManual]=useState(blankManual());
  const [isEditing,setIsEditing]=useState(false);
  const [form,setForm]=useState(blankFormTrilla());
  const [errTrilla,setErrTrilla]=useState("");
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tabTrilla,setTabTrilla]=useState("registro");
  const disp=lotes.filter(l=>pesoATrilladora(l)>0&&!l.trilla?.kg_excelso);
  const mesesD=[...new Set(disp.map(l=>l.mes).filter(Boolean))].sort();
  const productosD=[...new Set(disp.map(l=>l.producto).filter(Boolean))].sort();
  const dispFiltrados=disp.filter(l=>{
    if(filtroMes&&l.mes!==filtroMes)return false;
    if(filtroProducto&&l.producto!==filtroProducto)return false;
    if(busqueda&&!l.codigo.toLowerCase().includes(busqueda.toLowerCase()))return false;
    return true;
  });
  const tril=lotes.filter(l=>l.trilla?.kg_excelso>0);

  const MAX_LOTES_TRILLA=8;
  const toggleSel=(l)=>{
    if(isEditing)return;
    setSelArr(prev=>{
      if(prev.some(x=>x.id===l.id))return prev.filter(x=>x.id!==l.id);
      if(prev.length>=MAX_LOTES_TRILLA)return prev;
      return [...prev,l];
    });
    setForm(blankFormTrilla());
    setErrTrilla("");
  };
  const limpiarSeleccion=()=>{setSelArr([]);setIsEditing(false);setForm(blankFormTrilla());setErrTrilla("");};

  // FIX 2: Codigo trillado = corte-producto-fecha(DDMMYYYY)
  const genNombreTrillado=()=>{
    if(!selArr.length)return"";
    const corte=form.codigo_corte||"";
    const producto=[...new Set(selArr.map(l=>l.producto).filter(Boolean))].join("+");
    const fecha=form.fecha_trilla?dateToCode(form.fecha_trilla):"";
    if(corte&&producto&&fecha)return`${corte}-${producto}-${fecha}`;
    if(corte&&fecha)return`${corte}-${fecha}`;
    return`${producto}-${fecha}`;
  };

  // FIX 9: la entrada es el peso realmente movido a Trilladora (puede ser menor al kg_producto total del lote)
  const ent=selArr.reduce((s,l)=>s+pesoATrilladora(l),0);
  const mermaCalc=(+form.cisco||0);
  const pasillasCalc=(+form.pasilla_elec||0)+(+form.catadora_dens||0)+(+form.inferiores||0);
  const pctMerma=ent>0?(mermaCalc/ent*100).toFixed(1):0;
  const totalSal=(+form.excelso||0)+mermaCalc+pasillasCalc;
  const diff=ent-totalSal;
  const factorIndustrial=(ent>0&&+form.excelso>0)?(ent/(+form.excelso)*70):null;
  const conPretrilla=selArr.filter(l=>l.pretrilla?.factor_pretrilla);
  const pesoConPretrilla=conPretrilla.reduce((s,l)=>s+pesoATrilladora(l),0);
  const factorPretrillaPonderado=pesoConPretrilla>0?conPretrilla.reduce((s,l)=>s+pesoATrilladora(l)*l.pretrilla.factor_pretrilla,0)/pesoConPretrilla:null;
  const diferenciaFactor=(factorIndustrial!=null&&factorPretrillaPonderado!=null)?(factorIndustrial-factorPretrillaPonderado):null;

  const splitProporcional=(total,pesos)=>{
    const sumPesos=pesos.reduce((a,b)=>a+b,0);
    if(sumPesos<=0)return pesos.map(()=>0);
    const partes=pesos.map(p=>Math.round(total*p/sumPesos));
    const diffR=total-partes.reduce((a,b)=>a+b,0);
    partes[partes.length-1]+=diffR;
    return partes;
  };

  const abrirEditarGrupo=(l)=>{
    const grupo=[l,...lotes.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
    setSelArr(grupo);
    setIsEditing(true);
    setErrTrilla("");
    const sum=(k)=>grupo.reduce((s,x)=>s+(x.trilla?.[k]||0),0);
    setForm({excelso:sum("kg_excelso"),pasilla_elec:sum("pasilla_elec"),catadora_dens:sum("catadora_dens"),inferiores:sum("inferiores"),cisco:sum("cisco"),humedad:l.trilla.humedad_salida||"",norma:l.trilla.norma||NORMAS[0],fecha_trilla:l.trilla.fecha_trilla||"",codigo_corte:l.trilla.codigo_corte||"",con_proceso:l.trilla.con_proceso||"Con Proceso",obs:l.trilla.obs||""});
  };

  const reg=()=>{
    if(!selArr.length)return;
    if(!form.fecha_trilla||!form.codigo_corte){setErrTrilla("Fecha de Trilla y Codigo de Corte son obligatorios: todo lote trillado debe quedar con su codigo trillado completo.");return;}
    setErrTrilla("");
    const pesos=selArr.map(l=>pesoATrilladora(l));
    const excelsoParts=splitProporcional(+form.excelso||0,pesos);
    const mermaParts=splitProporcional(mermaCalc,pesos);
    const pasillaElecParts=splitProporcional(+form.pasilla_elec||0,pesos);
    const catadoraParts=splitProporcional(+form.catadora_dens||0,pesos);
    const inferioresParts=splitProporcional(+form.inferiores||0,pesos);
    const ciscoParts=splitProporcional(+form.cisco||0,pesos);
    const pasillasParts=splitProporcional(pasillasCalc,pesos);
    const nombreTr=genNombreTrillado();
    const idsGrupo=selArr.map(l=>l.id);
    // Arrastrar valor unitario (costo/kg excelso) y valor total al objeto trilla (punto 4)
    const costoTotalGrupo=selArr.reduce((s,l)=>{const cl=calcCosto(l,costos,lotes);return s+(cl?cl.total*pesoATrilladora(l):0);},0);
    const excelsoTotal=+form.excelso||0;
    const D=calcCostoTri(selArr[0]?.mes||"",costos,lotes).costoTriKg;
    const costoKgExGrupo=excelsoTotal>0?Math.round(costoTotalGrupo/excelsoTotal)+Math.round(D):0;
    setLotes(p=>p.map(l=>{
      const idx=selArr.findIndex(x=>x.id===l.id);
      if(idx===-1)return l;
      return{...l,estado:"Cerrado",trilla:{
        kg_excelso:excelsoParts[idx],kg_merma:mermaParts[idx],kg_pasillas:pasillasParts[idx],
        pasilla_elec:pasillaElecParts[idx],catadora_dens:catadoraParts[idx],inferiores:inferioresParts[idx],cisco:ciscoParts[idx],
        humedad_salida:+form.humedad,norma:form.norma,fecha_trilla:form.fecha_trilla,codigo_corte:form.codigo_corte,con_proceso:form.con_proceso,
        nombre_trillado:nombreTr,obs:form.obs,
        lotes_combinados:idsGrupo.filter(id=>id!==l.id),
        factor_pretrilla_ponderado:factorPretrillaPonderado,
        factor_industrial:factorIndustrial,
        costo_kg_excelso:costoKgExGrupo,
        valor_total:costoKgExGrupo*excelsoParts[idx],
      }};
    }));
    // Auto-crear/actualizar subproducto verde
    const prodSub=[...new Set(selArr.map(l=>l.producto).filter(Boolean))].join("+");
    const lotesOrigCodigos=selArr.map(l=>l.codigo);
    const subEntry={
      id:genId(),codigo:`${form.codigo_corte}-${prodSub}`,
      fecha:form.fecha_trilla,mes:mesDe(form.fecha_trilla),semana:semanaISO(form.fecha_trilla),
      nombre_trillado:nombreTr,producto:prodSub,corte:form.codigo_corte,lotes_origen:lotesOrigCodigos,
      pasilla_elec:+form.pasilla_elec||0,catadora_dens:+form.catadora_dens||0,
      inferiores:+form.inferiores||0,cisco:+form.cisco||0,
      total_subproductos:(+form.pasilla_elec||0)+(+form.catadora_dens||0)+(+form.inferiores||0)+(+form.cisco||0),
    };
    if(isEditing){
      setSubprodVerde(p=>{
        const idx=p.findIndex(sp=>sp.lotes_origen&&sp.lotes_origen.length===lotesOrigCodigos.length&&lotesOrigCodigos.every(c=>sp.lotes_origen.includes(c)));
        if(idx>=0)return p.map((sp,i)=>i===idx?{...sp,...subEntry,id:sp.id}:sp);
        return[subEntry,...p];
      });
    }else{setSubprodVerde(p=>[subEntry,...p]);}
    limpiarSeleccion();
  };
  const valorTotalManual=(+formManual.kg||0)*(+formManual.valor_unitario||0);
  const regManual=()=>{
    const kg=+formManual.kg;const vu=+formManual.valor_unitario;
    if(!formManual.codigo||kg<=0){return;}
    const sid=genId();
    const nuevo={id:genId(),fecha_proceso:formManual.fecha,fecha_recibo:formManual.fecha,semana:semanaISO(formManual.fecha),mes:mesDe(formManual.fecha),tipo:"Manual",producto:formManual.producto||"Manual",codigo:formManual.codigo,estado:"Bodega",origen_lote:"trilla_directa",cereza:[{finca:"Externo",kg,valor_kg:vu,flote:0,kg_proceso:kg}],kg_producto:kg,bultos:0,humedad:"",conversion:1,notas:formManual.notas||"",insumos:{jugo:0,panela:0,harina:0,levadura:0,vr_jugo:0,vr_panela:0,vr_harina:0,vr_levadura:0},equipo_ferm:"",equipo_secado:"",fecha_lavado:null,fecha_fin_secado:null,salidas_bodega:[{id:sid,fecha:formManual.fecha,factura:"MANUAL",remision:"",cliente:"Trilla",destino_key:"trilla",peso_salida:kg,valor_kg:vu,valor_total:kg*vu}],trilla:null,salidas_trilladora:[],pretrilla:null};
    setLotes(p=>[nuevo,...p]);
    setModalManual(false);setFormManual(blankManual());
  };

  const mesTri=selArr[0]?.mes||"";
  const {costosTri,kgEx,costoTriKg}=useMemo(()=>calcCostoTri(mesTri,costos,lotes),[mesTri,costos,lotes]);
  const totalKgExcelso=tril.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);

  // FIX 10: consolidar el historico en una sola fila por grupo de lotes trillados juntos
  const gruposVistos=new Set();
  const gruposHistorico=[];
  tril.forEach(l=>{
    if(gruposVistos.has(l.id))return;
    const grupo=[l,...lotes.filter(x=>(l.trilla.lotes_combinados||[]).includes(x.id))];
    grupo.forEach(x=>gruposVistos.add(x.id));
    gruposHistorico.push(grupo);
  });

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACION 04</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Trilla - Excelso / Merma / Pasillas</div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Excelso Total" value={fmt(totalKgExcelso)+" kg"} col={C.green}/>
      <KPI label="Merma Total" value={fmt(tril.reduce((s,l)=>s+(l.trilla?.kg_merma||0),0))+" kg"} col={C.red}/>
      <KPI label="Pasillas" value={fmt(tril.reduce((s,l)=>s+(l.trilla?.kg_pasillas||0),0))+" kg"} col={C.orange}/>
      <KPI label="Pendientes" value={disp.length} col={C.gold}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["registro","Registro"],["subproductos","Subproductos Verde"]].map(([k,v])=>(<button key={k} onClick={()=>setTabTrilla(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tabTrilla===k?600:400,color:tabTrilla===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tabTrilla===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>

    {tabTrilla==="registro"&&<>
    {/* FIX 7: Panel costo trilladora por mes */}
    <div style={{...S.card,marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>Costo Trilladora por Mes</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr>{["Mes","Costos Trilladora","kg Excelso Producido","Costo Trilladora / kg Excelso"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{MESES.filter(m=>{const cb=(costos||[]).filter(c=>c.centro==="Trilladora"&&c.mes===m).reduce((s,c)=>s+c.valor,0);return cb>0;}).map(m=>{
        const {costosTri:ct,kgEx:ke,costoTriKg:ck}=calcCostoTri(m,costos,lotes);
        return(<tr key={m}><td style={{...S.td,textTransform:"capitalize",fontWeight:600}}>{m}</td><td style={{...S.td,color:C.orange,fontWeight:600}}>{fmtCOP(ct)}</td><td style={{...S.td,color:C.green,fontWeight:600}}>{fmt(ke)} kg</td><td style={{...S.td,color:C.purple,fontWeight:700,fontSize:14}}>{ke>0?fmtCOP(Math.round(ck)):"Sin excelso registrado"}</td></tr>);
      })}</tbody></table></TablaScrollV>
      {(costos||[]).filter(c=>c.centro==="Trilladora").length===0&&<div style={{color:C.textFaint,fontSize:12,padding:8}}>Registra costos de Trilladora en el modulo de Costos para ver este calculo.</div>}
    </div>

    <div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesD.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosD.map(p=>(<option key={p}>{p}</option>))}</select>
      <button style={{...S.btn,background:C.orange,borderColor:C.orange,whiteSpace:"nowrap"}} onClick={()=>{setFormManual(blankManual());setModalManual(true);}}>+ Lote Manual</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16}}>
      <div>{dispFiltrados.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes disponibles. Los lotes con salida a Trilladora Milan apareceran aqui automaticamente.</div>}
        <div style={{color:C.textFaint,fontSize:11,marginBottom:8}}>Selecciona de 1 a {MAX_LOTES_TRILLA} lotes para trillar juntos (mezcla).</div>
        {dispFiltrados.map(l=>{const salT=(l.salidas_bodega||[]).filter(s=>s.destino_key==="trilla");const pesoTri=salT.reduce((s,x)=>s+x.peso_salida,0);const isSel=selArr.some(x=>x.id===l.id);return(<div key={l.id} onClick={()=>toggleSel(l)} style={{...S.card,cursor:isEditing?"default":"pointer",opacity:isEditing&&!isSel?0.5:1,marginBottom:10,borderLeft:"3px solid "+(isSel?C.green:C.border),borderColor:isSel?C.green:C.border}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={isSel} readOnly style={{width:16,height:16,accentColor:C.green,cursor:"pointer",flexShrink:0}}/><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</span></div>
            <span style={{color:C.gold,fontSize:12,fontWeight:600}}>{l.humedad?l.humedad+"%":"?"}</span>
          </div>
          <div style={{color:C.textDim,fontSize:12,marginBottom:4}}>{l.producto} - {[...new Set(l.cereza.map(c=>c.finca))].join(", ")}</div>
          <div style={{color:C.green,fontSize:12,fontWeight:600}}>{fmt(l.kg_producto)} kg{pesoTri>0?" | Enviado: "+fmt(pesoTri)+" kg":""}</div>
          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}><Bdg label={l.producto} col={C.navy} bg={C.accentBg}/>{l.origen_lote==="trilla_directa"&&<Bdg label="MANUAL" col={C.orange} bg={C.orangeBg}/>}{l.equipo_ferm&&<Bdg label={l.equipo_ferm} col={C.purple} bg={C.purpleBg}/>}{l.equipo_secado&&<Bdg label={l.equipo_secado} col={C.teal} bg={C.tealBg}/>}{l.pretrilla?.factor_pretrilla?<Bdg label={"FP: "+fmt(l.pretrilla.factor_pretrilla,1)} col={C.gold} bg={C.goldBg}/>:null}</div>
        </div>);})}
      </div>
      <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontWeight:600,fontSize:13,color:C.navy}}>{isEditing?"Editar Registro de Trilla":"Registro de Trilla"}</div>{selArr.length>0&&<button style={S.btnG} onClick={limpiarSeleccion}>Limpiar</button>}</div>
        {!selArr.length?(<div style={{color:C.textFaint,fontSize:13}}>Selecciona de 1 a {MAX_LOTES_TRILLA} lotes</div>):(
          <><div style={{background:C.greenBg,border:"1px solid "+C.green+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
            {selArr.map(l=>(<div key={l.id} style={{marginBottom:4}}><span style={{color:C.green,fontWeight:700}}>{l.codigo}</span><span style={{color:C.textDim,fontSize:12}}> — Pergamino: {fmt(l.kg_producto)} kg | H:{l.humedad}% | {l.equipo_ferm} / {l.equipo_secado}{l.pretrilla?.factor_pretrilla?" | FP: "+fmt(l.pretrilla.factor_pretrilla,1):""}</span></div>))}
            <div style={{color:C.navy,fontWeight:700,fontSize:13,marginTop:4}}>Entrada Total: {fmt(ent)} kg</div>
          </div>
          {/* FIX 1: Fecha de trilla y codigo de corte */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>Fecha de Trilla</label><input style={S.input} type="date" value={form.fecha_trilla} onChange={e=>setForm(p=>({...p,fecha_trilla:e.target.value}))}/></div>
            <div><label style={S.lbl}>Codigo de Corte</label><input style={S.input} placeholder="Ej: M-540" value={form.codigo_corte} onChange={e=>setForm(p=>({...p,codigo_corte:e.target.value}))}/></div>
          </div>
          {/* FIX 2: Nombre modificado automático */}
          {(form.fecha_trilla||form.codigo_corte)&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:12}}><span style={{color:C.textDim}}>Codigo Trillado: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{genNombreTrillado()}</span></div>)}
          <div style={{fontWeight:600,fontSize:12,color:C.navy,marginBottom:8}}>Resultado de la Trilla</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>kg Excelso</label><input style={S.input} type="number" value={form.excelso} onChange={e=>setForm(p=>({...p,excelso:e.target.value}))}/>{form.excelso&&<div style={{color:C.green,fontSize:10,marginTop:3}}>Rend: {((+form.excelso/ent)*100).toFixed(1)}% | FI: {factorIndustrial!=null?fmt(factorIndustrial,1):"?"}</div>}</div>
            <div><label style={S.lbl}>kg Merma Total (auto = Cisco)</label><input style={{...S.input,background:C.panel2,color:C.textDim}} value={fmt(mermaCalc)} readOnly/><div style={{color:C.red,fontSize:10,marginTop:3}}>% Merma: {pctMerma}%</div></div>
            <div><label style={S.lbl}>kg Pasillas (auto = suma)</label><input style={{...S.input,background:C.panel2,color:C.textDim}} value={fmt(pasillasCalc)} readOnly/></div>
            <div><label style={S.lbl}>Proceso</label><select style={S.select} value={form.con_proceso} onChange={e=>setForm(p=>({...p,con_proceso:e.target.value}))}><option>Con Proceso</option><option>Sin Proceso</option></select></div>
            <div><label style={S.lbl}>Humedad Salida %</label><input style={S.input} type="number" step="0.1" value={form.humedad} onChange={e=>setForm(p=>({...p,humedad:e.target.value}))}/></div>
          </div>
          <div style={{fontWeight:600,fontSize:12,color:C.navy,marginBottom:8}}>Detalle de Merma</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>Pasilla Electronica kg</label><input style={S.input} type="number" placeholder="0" value={form.pasilla_elec} onChange={e=>setForm(p=>({...p,pasilla_elec:e.target.value}))}/></div>
            <div><label style={S.lbl}>Catadora Densimetrica kg</label><input style={S.input} type="number" placeholder="0" value={form.catadora_dens} onChange={e=>setForm(p=>({...p,catadora_dens:e.target.value}))}/></div>
            <div><label style={S.lbl}>Inferiores kg</label><input style={S.input} type="number" placeholder="0" value={form.inferiores} onChange={e=>setForm(p=>({...p,inferiores:e.target.value}))}/></div>
            <div><label style={S.lbl}>Cisco kg</label><input style={S.input} type="number" placeholder="0" value={form.cisco} onChange={e=>setForm(p=>({...p,cisco:e.target.value}))}/></div>
          </div>
          <Fld label="Norma de Produccion"><select style={S.select} value={form.norma} onChange={e=>setForm(p=>({...p,norma:e.target.value}))}>{NORMAS.map(n=>(<option key={n}>{n}</option>))}</select></Fld>
          {totalSal>0&&(<div style={{background:C.bg,borderRadius:6,padding:12,marginBottom:12,border:"1px solid "+C.border}}>
            <div style={{color:C.textDim,fontSize:11,fontWeight:600,marginBottom:8}}>BALANCE</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,textAlign:"center"}}>{[{l:"Entrada",v:ent,c:C.navy},{l:"Excelso",v:+form.excelso,c:C.green},{l:"Merma",v:mermaCalc,c:C.red},{l:"Pasillas",v:pasillasCalc,c:C.orange}].map(x=>(<div key={x.l} style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>{x.l}</div><div style={{color:x.c,fontWeight:700,fontSize:14}}>{fmt(x.v)}</div></div>))}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8,padding:"8px 10px",background:C.panel2,borderRadius:6}}>
              <div style={{textAlign:"center"}}><div style={{color:C.textDim,fontSize:10}}>% Merma</div><div style={{color:C.red,fontWeight:700,fontSize:15}}>{pctMerma}%</div></div>
              <div style={{textAlign:"center"}}><div style={{color:C.textDim,fontSize:10}}>Factor Indust.</div><div style={{color:C.green,fontWeight:700,fontSize:15}}>{factorIndustrial!=null?fmt(factorIndustrial,1):"?"}</div></div>
              <div style={{textAlign:"center"}}><div style={{color:C.textDim,fontSize:10}}>Diferencia</div><div style={{color:Math.abs(diff)<5?C.gold:C.red,fontWeight:700,fontSize:15}}>{fmt(diff)}</div></div>
            </div>
          </div>)}
          {factorPretrillaPonderado!=null&&(<div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:12,marginBottom:12}}>
            <div style={{color:C.purple,fontSize:11,fontWeight:700,marginBottom:8}}>COMPARATIVO FACTOR PRE-TRILLA (Bodega Milan)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>FP Ponderado</div><div style={{color:C.purple,fontWeight:700,fontSize:14}}>{fmt(factorPretrillaPonderado,1)}</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>FI Real</div><div style={{color:C.green,fontWeight:700,fontSize:14}}>{factorIndustrial!=null?fmt(factorIndustrial,1):"?"}</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>Diferencia</div><div style={{color:diferenciaFactor!=null&&Math.abs(diferenciaFactor)<3?C.gold:C.red,fontWeight:700,fontSize:14}}>{diferenciaFactor!=null?fmt(diferenciaFactor,1):"?"}</div></div>
            </div>
          </div>)}
          {errTrilla&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errTrilla}</div>)}
          <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))}/></Fld>
          <button style={{...S.btn,background:C.green,width:"100%"}} onClick={reg}>{isEditing?"Guardar Cambios":"Registrar Trilla"}</button></>
        )}
      </div>
    </div>

    {/* FIX 6,10: Historico consolidado (una fila por grupo de lotes trillados juntos) */}
    {gruposHistorico.length>0&&(<div style={{...S.card,marginTop:4}}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Historico Trilla</div><TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}><thead><tr>{["Fecha Trilla","Mes","Corte","Lotes","Producto","Cod. Trillado","Proceso","Perg. kg (a trilladora)","Excelso kg","Merma kg","P.Elec","Cat.Dens","Inf.","Cisco","% Merma","FI","Dif. vs FP","Rend.","Costo /kg Ex",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
    <tbody>{gruposHistorico.map(grupo=>{
      const repr=grupo[0];const t=repr.trilla;
      const entrada=grupo.reduce((s,x)=>s+pesoATrilladora(x),0);
      const excelso=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
      const merma=grupo.reduce((s,x)=>s+(x.trilla?.kg_merma||0),0);
      const pElec=grupo.reduce((s,x)=>s+(x.trilla?.pasilla_elec||0),0);
      const catDens=grupo.reduce((s,x)=>s+(x.trilla?.catadora_dens||0),0);
      const inf=grupo.reduce((s,x)=>s+(x.trilla?.inferiores||0),0);
      const cisco=grupo.reduce((s,x)=>s+(x.trilla?.cisco||0),0);
      const costoTotalGrupo=grupo.reduce((s,x)=>{const cl=calcCosto(x,costos,lotes);return s+(cl?cl.total*pesoATrilladora(x):0);},0);
      const costoEx=excelso>0?Math.round(costoTotalGrupo/excelso):null;
      const dif=(t.factor_industrial!=null&&t.factor_pretrilla_ponderado!=null)?(t.factor_industrial-t.factor_pretrilla_ponderado):null;
      return(<tr key={repr.id}>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(t.fecha_trilla)}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{repr.mes}</td>
        <td style={S.td}><Bdg label={t.codigo_corte||"—"} col={C.accent}/></td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[...new Set(grupo.map(x=>x.producto))].map(p=>(<Bdg key={p} label={p} col={C.navy} bg={C.accentBg}/>))}</div></td>
        <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:C.green,fontWeight:600,maxWidth:160}}><AutoFitText text={t.nombre_trillado||"—"}/></td>
        <td style={S.td}><Bdg label={t.con_proceso||"—"} col={t.con_proceso==="Sin Proceso"?C.orange:C.teal}/></td>
        <td style={{...S.td,fontWeight:600}}>{fmt(entrada)}</td>
        <td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(excelso)}</td>
        <td style={{...S.td,color:C.red}}>{fmt(merma)}</td>
        <td style={S.td}>{fmt(pElec)}</td>
        <td style={S.td}>{fmt(catDens)}</td>
        <td style={S.td}>{fmt(inf)}</td>
        <td style={S.td}>{fmt(cisco)}</td>
        <td style={{...S.td,color:C.red,fontWeight:600}}>{entrada?((merma/entrada)*100).toFixed(1)+"%":"?"}</td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{t.factor_industrial!=null?fmt(t.factor_industrial,1):"?"}</td>
        <td style={{...S.td,color:dif!=null&&Math.abs(dif)<3?C.gold:C.red,fontWeight:600}}>{dif!=null?fmt(dif,1):"—"}</td>
        <td style={{...S.td,color:C.green,fontWeight:600}}>{entrada?((excelso/entrada)*100).toFixed(1)+"%":"?"}</td>
        <td style={{...S.td,color:C.purple,fontWeight:700}}>{costoEx?fmtCOP(costoEx):"?"}</td>
        <td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarGrupo(repr)}>Editar</button></td>
      </tr>);
    })}
    </tbody></table></TablaScrollV></div>)}

    {modalManual&&(<Modal title="Nuevo Lote Manual para Trilla" onClose={()=>setModalManual(false)}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={formManual.fecha} onChange={e=>setFormManual(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Codigo" half><input style={S.input} placeholder="Ej: LVD-EXT-04072026" value={formManual.codigo} onChange={e=>setFormManual(p=>({...p,codigo:e.target.value}))}/></Fld>
        <Fld label="Producto" half><input style={S.input} placeholder="Ej: Natural, Lavado..." value={formManual.producto} onChange={e=>setFormManual(p=>({...p,producto:e.target.value}))}/></Fld>
        <Fld label="kg a Trillar" half><input style={S.input} type="number" min="0" step="0.1" placeholder="kg" value={formManual.kg} onChange={e=>setFormManual(p=>({...p,kg:e.target.value}))}/></Fld>
        <Fld label="Valor Unitario ($/kg)" half><input style={S.input} type="number" min="0" step="1" placeholder="$/kg" value={formManual.valor_unitario} onChange={e=>setFormManual(p=>({...p,valor_unitario:e.target.value}))}/></Fld>
        <Fld label="Valor Total (calculado)" half><input style={{...S.input,background:C.panel2,color:C.textDim}} value={valorTotalManual>0?fmtCOP(valorTotalManual):""} readOnly/></Fld>
        <Fld label="Notas"><input style={S.input} placeholder="Opcional" value={formManual.notas} onChange={e=>setFormManual(p=>({...p,notas:e.target.value}))}/></Fld>
      </div>
      <div style={{marginTop:16,display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button style={S.btnG} onClick={()=>setModalManual(false)}>Cancelar</button>
        <button style={{...S.btn,background:C.orange,borderColor:C.orange}} onClick={regManual}>Registrar Lote Manual</button>
      </div>
    </Modal>)}
    </>}

    {tabTrilla==="subproductos"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
        <KPI label="Registros" value={subprodVerde.length} col={C.green}/>
        <KPI label="Total Pasilla Elec" value={fmt(subprodVerde.reduce((s,sp)=>s+sp.pasilla_elec,0))+" kg"} col={C.orange}/>
        <KPI label="Total Cat. Densim." value={fmt(subprodVerde.reduce((s,sp)=>s+sp.catadora_dens,0))+" kg"} col={C.purple}/>
        <KPI label="Total Inferiores" value={fmt(subprodVerde.reduce((s,sp)=>s+sp.inferiores,0))+" kg"} col={C.teal}/>
        <KPI label="Total Cisco" value={fmt(subprodVerde.reduce((s,sp)=>s+sp.cisco,0))+" kg"} col={C.red}/>
        <KPI label="Total Subproductos" value={fmt(subprodVerde.reduce((s,sp)=>s+sp.total_subproductos,0))+" kg"} col={C.gold}/>
      </div>
      {subprodVerde.length===0?(
        <div style={{...S.card,color:C.textFaint,fontSize:13}}>Los subproductos verde se generan automaticamente al registrar una trilla. Realiza tu primer registro en la pestana Registro.</div>
      ):(
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Inventario Subproductos Verde</div>
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:950}}><thead><tr>
            {["Fecha Trilla","Mes","Corte","Codigo Subproducto","Producto","Lotes Origen","Pas. Electronica kg","Cat. Densimetrica kg","Inferiores kg","Cisco kg","Total kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
          </tr></thead>
          <tbody>{[...subprodVerde].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map(sp=>(
            <tr key={sp.id}>
              <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(sp.fecha)}</td>
              <td style={{...S.td,textTransform:"capitalize"}}>{sp.mes}</td>
              <td style={S.td}><Bdg label={sp.corte||"—"} col={C.accent}/></td>
              <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.green,fontSize:11}}>{sp.codigo}</td>
              <td style={S.td}><Bdg label={sp.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
              <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{(sp.lotes_origen||[]).map(c=>(<Bdg key={c} label={c} col={C.navy} bg={C.accentBg}/>))}</div></td>
              <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(sp.pasilla_elec)} kg</td>
              <td style={{...S.td,color:C.purple,fontWeight:600}}>{fmt(sp.catadora_dens)} kg</td>
              <td style={{...S.td,color:C.teal,fontWeight:600}}>{fmt(sp.inferiores)} kg</td>
              <td style={{...S.td,color:C.red,fontWeight:600}}>{fmt(sp.cisco)} kg</td>
              <td style={{...S.td,color:C.gold,fontWeight:800,fontSize:15}}>{fmt(sp.total_subproductos)} kg</td>
            </tr>
          ))}</tbody></table></TablaScrollV>
        </div>
      )}
    </>)}
  </div>);
}
