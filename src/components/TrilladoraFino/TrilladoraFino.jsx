import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,KPIDoble,Bdg,Fld,TablaScrollV,AutoFitText}from"../ui";
import{NORMAS,MESES}from"../../data/constants";
import{fmt,fmtCOP,dateToCode}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{costoKgExDeCafeFino,construirGruposBTF,costoKgExFinoDe,calcCostoTriCF}from"../../lib/costing";
export function TrilladoraFino({lotesFino,setLotesFino,lotes,costos}){
  const MAX_LOTES=8;
  const blankForm=()=>({excelso:"",pasilla_elec:"",catadora_dens:"",inferiores:"",cisco:"",humedad:"",norma:NORMAS[0],fecha_trilla:"",codigo_corte:"",con_proceso:"Con Proceso",obs:"",costoKgExcelso:""});
  const [selArr,setSelArr]=useState([]);
  const [isEditing,setIsEditing]=useState(false);
  const [form,setForm]=useState(blankForm());
  const [errTrilla,setErrTrilla]=useState("");
  const stockDe=(l)=>l.kg_producto-(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);
  const disp=lotesFino.filter(l=>l.para_trilladora&&!l.trilla?.kg_excelso&&stockDe(l)>0);
  const tril=lotesFino.filter(l=>l.trilla?.kg_excelso>0);
  const gruposTrillados=construirGruposBTF(tril,lotesFino);
  const totalKgSalidasTF=tril.reduce((s,l)=>s+(l.salidas_trilladora||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,x)=>a+(x.peso_salida||0),0),0);
  const totalValorSalidasTF=tril.reduce((s,l)=>s+(l.salidas_trilladora||[]).filter(x=>x.destino_key!=="ajuste_inventario").reduce((a,x)=>a+(x.valor_total||0),0),0);
  const totalExcelsoTF=tril.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const totalValorEntradaTF=tril.reduce((s,l)=>s+(l.trilla?.kg_excelso||0)*costoKgExDeCafeFino(l,costos,lotesFino),0);
  const stockActualTF=tril.reduce((s,l)=>{
    const stock=(l.trilla?.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,x)=>a+(x.peso_salida||0),0);
    const costoKg=costoKgExDeCafeFino(l,costos,lotesFino);
    return {kg:s.kg+stock,val:s.val+(costoKg*stock)};
  },{kg:0,val:0});
  const totalKgTrillados=tril.reduce((s,l)=>s+stockDe(l),0);
  const totalKgExcelsoTrilla=tril.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);

  const toggleSel=(l)=>{
    if(isEditing)return;
    setSelArr(prev=>{
      if(prev.some(x=>x.id===l.id))return prev.filter(x=>x.id!==l.id);
      if(prev.length>=MAX_LOTES)return prev;
      return [...prev,l];
    });
    setForm(blankForm());setErrTrilla("");
  };
  const limpiarSeleccion=()=>{setSelArr([]);setIsEditing(false);setForm(blankForm());setErrTrilla("");};

  const genNombreTrillado=()=>{
    if(!selArr.length)return"";
    const corte=form.codigo_corte||"";
    const producto=[...new Set(selArr.map(l=>l.producto).filter(Boolean))].join("+");
    const fecha=form.fecha_trilla?dateToCode(form.fecha_trilla):"";
    if(corte&&producto&&fecha)return`${corte}-${producto}-${fecha}`;
    if(corte&&fecha)return`${corte}-${fecha}`;
    return`${producto}-${fecha}`;
  };

  const ent=selArr.reduce((s,l)=>s+stockDe(l),0);
  const mermaCalc=(+form.cisco||0);
  const pasillasCalc=(+form.pasilla_elec||0)+(+form.catadora_dens||0)+(+form.inferiores||0);
  const pctMerma=ent>0?(mermaCalc/ent*100).toFixed(1):0;
  const totalSal=(+form.excelso||0)+mermaCalc+pasillasCalc;
  const diff=ent-totalSal;
  const factorIndustrial=(ent>0&&+form.excelso>0)?(ent/(+form.excelso)*70):null;
  const conPretrilla=selArr.filter(l=>l.pretrilla?.factor_pretrilla);
  const pesoConPretrilla=conPretrilla.reduce((s,l)=>s+stockDe(l),0);
  const factorPretrillaPonderado=pesoConPretrilla>0?conPretrilla.reduce((s,l)=>s+stockDe(l)*l.pretrilla.factor_pretrilla,0)/pesoConPretrilla:null;
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
    const grupo=[l,...lotesFino.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
    setSelArr(grupo);setIsEditing(true);setErrTrilla("");
    const sum=(k)=>grupo.reduce((s,x)=>s+(x.trilla?.[k]||0),0);
    setForm({excelso:sum("kg_excelso"),pasilla_elec:sum("pasilla_elec"),catadora_dens:sum("catadora_dens"),inferiores:sum("inferiores"),cisco:sum("cisco"),humedad:l.trilla.humedad_salida||"",norma:l.trilla.norma||NORMAS[0],fecha_trilla:l.trilla.fecha_trilla||"",codigo_corte:l.trilla.codigo_corte||"",con_proceso:l.trilla.con_proceso||"Con Proceso",obs:l.trilla.obs||"",costoKgExcelso:l.trilla.costo_kg_excelso||""});
  };

  const reg=()=>{
    if(!selArr.length)return;
    if(!form.fecha_trilla||!form.codigo_corte){setErrTrilla("Fecha de Trilla y Codigo de Corte son obligatorios.");return;}
    setErrTrilla("");
    const pesos=selArr.map(l=>stockDe(l));
    const excelsoParts=splitProporcional(+form.excelso||0,pesos);
    const mermaParts=splitProporcional(mermaCalc,pesos);
    const pasillaElecParts=splitProporcional(+form.pasilla_elec||0,pesos);
    const catadoraParts=splitProporcional(+form.catadora_dens||0,pesos);
    const inferioresParts=splitProporcional(+form.inferiores||0,pesos);
    const ciscoParts=splitProporcional(+form.cisco||0,pesos);
    const pasillasParts=splitProporcional(pasillasCalc,pesos);
    const nombreTr=genNombreTrillado();
    const idsGrupo=selArr.map(l=>l.id);
    const costoManualTF=+form.costoKgExcelso||0;
    const costoTotalTF=selArr.reduce((s,l,i)=>{const ck=l.costo_compra_kg||(lotesFino.find(o=>!o.para_trilladora&&o.codigo===l.codigo)?.costo_compra_kg||0);return s+ck*pesos[i];},0);
    const excelsoTotalTF=+form.excelso||0;
    const costoKgExTF=costoManualTF>0?costoManualTF:(excelsoTotalTF>0?Math.round(costoTotalTF/excelsoTotalTF):0);
    setLotesFino(p=>p.map(l=>{
      const idx=selArr.findIndex(x=>x.id===l.id);
      if(idx===-1)return l;
      return{...l,trilla:{
        kg_excelso:excelsoParts[idx],kg_merma:mermaParts[idx],kg_pasillas:pasillasParts[idx],
        pasilla_elec:pasillaElecParts[idx],catadora_dens:catadoraParts[idx],inferiores:inferioresParts[idx],cisco:ciscoParts[idx],
        entrada_usada:pesos[idx],
        humedad_salida:+form.humedad,norma:form.norma,fecha_trilla:form.fecha_trilla,codigo_corte:form.codigo_corte,con_proceso:form.con_proceso,
        nombre_trillado:nombreTr,obs:form.obs,
        lotes_combinados:idsGrupo.filter(id=>id!==l.id),
        factor_industrial:factorIndustrial,
        factor_pretrilla_ponderado:factorPretrillaPonderado,
        costo_kg_excelso:costoKgExTF,
      }};
    }));
    limpiarSeleccion();
  };

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>TRILLA CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Trilladora Cafe Fino</div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
      <KPI label="Kg Trillados" value={fmt(totalKgTrillados)+" kg"} col={C.navy}/>
      <KPI label="Excelso Total" value={fmt(totalKgExcelsoTrilla)+" kg"} col={C.green}/>
      <KPI label="Merma Total" value={fmt(tril.reduce((s,l)=>s+(l.trilla?.kg_merma||0),0))+" kg"} col={C.red}/>
      <KPI label="Pasillas" value={fmt(tril.reduce((s,l)=>s+(l.trilla?.kg_pasillas||0),0))+" kg"} col={C.orange}/>
      <KPI label="Pendientes" value={disp.length} col={C.gold}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16}}>
      <div>{disp.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes disponibles en Bodega Cafe Fino.</div>}
        <div style={{color:C.textFaint,fontSize:11,marginBottom:8}}>Selecciona de 1 a {MAX_LOTES} lotes para trillar juntos.</div>
        {disp.map(l=>{const isSel=selArr.some(x=>x.id===l.id);return(<div key={l.id} onClick={()=>toggleSel(l)} style={{...S.card,cursor:isEditing?"default":"pointer",opacity:isEditing&&!isSel?0.5:1,marginBottom:10,borderLeft:"3px solid "+(isSel?C.green:C.border),borderColor:isSel?C.green:C.border}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</span><Bdg label={l.producto||"-"} col={C.navy} bg={C.accentBg}/></div>
          <div style={{color:C.green,fontSize:12,fontWeight:600}}>{fmt(stockDe(l))} kg disponibles{l.pretrilla?.factor_pretrilla?<Bdg label={"FP: "+fmt(l.pretrilla.factor_pretrilla,1)} col={C.gold} bg={C.goldBg}/>:null}</div>
        </div>);})}
      </div>
      <div>
      <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontWeight:600,fontSize:13,color:C.navy}}>{isEditing?"Editar Registro de Trilla":"Registro de Trilla"}</div>{selArr.length>0&&<button style={S.btnG} onClick={limpiarSeleccion}>Limpiar</button>}</div>
        {!selArr.length?(<div style={{color:C.textFaint,fontSize:13}}>Selecciona de 1 a {MAX_LOTES} lotes</div>):(
          <><div style={{background:C.greenBg,border:"1px solid "+C.green+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
            {selArr.map(l=>(<div key={l.id} style={{marginBottom:4}}><span style={{color:C.green,fontWeight:700}}>{l.codigo}</span><span style={{color:C.textDim,fontSize:12}}> — {fmt(stockDe(l))} kg{l.pretrilla?.factor_pretrilla?" | FP: "+fmt(l.pretrilla.factor_pretrilla,1):""}</span></div>))}
            <div style={{color:C.navy,fontWeight:700,fontSize:13,marginTop:4}}>Entrada Total: {fmt(ent)} kg</div>
          </div>
          {factorPretrillaPonderado!=null&&(<div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:12,marginBottom:12}}>
            <div style={{color:C.purple,fontSize:11,fontWeight:600,marginBottom:8}}>COMPARACION CON PRE-TRILLA</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>FP Ponderado</div><div style={{color:C.purple,fontWeight:700,fontSize:14}}>{fmt(factorPretrillaPonderado,1)}</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>FI Real</div><div style={{color:C.teal,fontWeight:700,fontSize:14}}>{factorIndustrial!=null?fmt(factorIndustrial,1):"?"}</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>Diferencia</div><div style={{color:diferenciaFactor>0?C.red:C.green,fontWeight:700,fontSize:14}}>{diferenciaFactor!=null?fmt(diferenciaFactor,1):"?"}</div></div>
            </div>
          </div>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>Fecha de Trilla</label><input style={S.input} type="date" value={form.fecha_trilla} onChange={e=>setForm(p=>({...p,fecha_trilla:e.target.value}))}/></div>
            <div><label style={S.lbl}>Codigo de Corte</label><input style={S.input} value={form.codigo_corte} onChange={e=>setForm(p=>({...p,codigo_corte:e.target.value}))}/></div>
          </div>
          {(form.fecha_trilla||form.codigo_corte)&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:12}}><span style={{color:C.textDim}}>Codigo Trillado: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{genNombreTrillado()}</span></div>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>kg Excelso</label><input style={S.input} type="number" value={form.excelso} onChange={e=>setForm(p=>({...p,excelso:e.target.value}))}/>{form.excelso&&<div style={{color:C.green,fontSize:10,marginTop:3}}>Rend: {((+form.excelso/ent)*100).toFixed(1)}% | FI: {factorIndustrial!=null?fmt(factorIndustrial,1):"?"}</div>}</div>
            <div><label style={S.lbl}>kg Merma (auto = Cisco)</label><input style={{...S.input,background:C.panel2,color:C.textDim}} value={fmt(mermaCalc)} readOnly/></div>
            <div><label style={S.lbl}>kg Pasillas (auto = suma)</label><input style={{...S.input,background:C.panel2,color:C.textDim}} value={fmt(pasillasCalc)} readOnly/></div>
            <div><label style={S.lbl}>Proceso</label><select style={S.select} value={form.con_proceso} onChange={e=>setForm(p=>({...p,con_proceso:e.target.value}))}><option>Con Proceso</option><option>Sin Proceso</option></select></div>
            <div><label style={S.lbl}>Humedad Salida %</label><input style={S.input} type="number" step="0.1" value={form.humedad} onChange={e=>setForm(p=>({...p,humedad:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>Pasilla Electronica kg</label><input style={S.input} type="number" placeholder="0" value={form.pasilla_elec} onChange={e=>setForm(p=>({...p,pasilla_elec:e.target.value}))}/></div>
            <div><label style={S.lbl}>Catadora Densimetrica kg</label><input style={S.input} type="number" placeholder="0" value={form.catadora_dens} onChange={e=>setForm(p=>({...p,catadora_dens:e.target.value}))}/></div>
            <div><label style={S.lbl}>Inferiores kg</label><input style={S.input} type="number" placeholder="0" value={form.inferiores} onChange={e=>setForm(p=>({...p,inferiores:e.target.value}))}/></div>
            <div><label style={S.lbl}>Cisco kg</label><input style={S.input} type="number" placeholder="0" value={form.cisco} onChange={e=>setForm(p=>({...p,cisco:e.target.value}))}/></div>
          </div>
          <div style={{background:C.bg,borderRadius:6,padding:12,marginBottom:12,border:"1px solid "+C.border}}>
            <div style={{color:C.textDim,fontSize:11,fontWeight:600,marginBottom:8}}>CALCULOS AUTOMATICOS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>% Merma (Cisco/Perg.)</div><div style={{color:C.red,fontWeight:700,fontSize:14}}>{pctMerma}%</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>Factor Industrial (Perg./Exc.)x70</div><div style={{color:C.teal,fontWeight:700,fontSize:14}}>{factorIndustrial!=null?fmt(factorIndustrial,1):"?"}</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:9}}>Total Pasillas (Dens+Cat+Inf)</div><div style={{color:C.orange,fontWeight:700,fontSize:14}}>{fmt(pasillasCalc)} kg</div></div>
            </div>
          </div>
          <Fld label="Norma de Produccion"><select style={S.select} value={form.norma} onChange={e=>setForm(p=>({...p,norma:e.target.value}))}>{NORMAS.map(n=>(<option key={n}>{n}</option>))}</select></Fld>
          <Fld label="Costo por KG Excelso COP"><input style={S.input} type="number" placeholder="Ej: 8500  (opcional, se arrastra a Salida)" value={form.costoKgExcelso} onChange={e=>setForm(p=>({...p,costoKgExcelso:e.target.value}))}/></Fld>
          {errTrilla&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errTrilla}</div>)}
          <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))}/></Fld>
          <button style={{...S.btn,background:C.green,width:"100%"}} onClick={reg}>{isEditing?"Guardar Cambios":"Registrar Trilla"}</button></>
        )}
      </div>
      </div>
    </div>
    <div style={{...S.card,marginTop:16,marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>Costo Trilladora por Mes</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr>{["Mes","Costos Trilladora","kg Excelso Producido","Costo Trilladora / kg Excelso"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{MESES.filter(m=>{const cb=(costos||[]).filter(c=>c.centro==="Bodega Cafe Fino"&&c.mes===m).reduce((s,c)=>s+c.valor,0);return cb>0;}).map(m=>{
        const{costosTri:ct,kgEx:ke,costoTriKg:ck}=calcCostoTriCF(m,costos,lotesFino);
        return(<tr key={m}><td style={{...S.td,textTransform:"capitalize",fontWeight:600}}>{m}</td><td style={{...S.td,color:C.orange,fontWeight:600}}>{fmtCOP(ct)}</td><td style={{...S.td,color:C.green,fontWeight:600}}>{fmt(ke)} kg</td><td style={{...S.td,color:C.purple,fontWeight:700,fontSize:14}}>{ke>0?fmtCOP(Math.round(ck)):"Sin excelso registrado"}</td></tr>);
      })}</tbody></table></TablaScrollV>
      {(costos||[]).filter(c=>c.centro==="Bodega Cafe Fino").length===0&&<div style={{color:C.textFaint,fontSize:12,padding:8}}>Registra costos de "Bodega Cafe Fino" en el modulo de Costos para ver este calculo.</div>}
    </div>
    {!isEditing&&gruposTrillados.length>0&&(<div style={{...S.card,marginTop:4}}>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Trillas Realizadas</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
        <thead><tr>{["Fecha Trilla","Mes","Corte","Lotes Origen","Producto","Cod. Trillado","Perg. kg","Excelso kg","Merma kg","% Merma","FI","Dif. vs FP","Costo /kg Ex","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{gruposTrillados.map(grupo=>{
          const repr=grupo[0];const t=repr.trilla;
          const entrada=grupo.reduce((s,x)=>s+stockDe(x),0);
          const excelso=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
          const merma=grupo.reduce((s,x)=>s+(x.trilla?.kg_merma||0),0);
          const pctMermaGrupo=entrada>0?((merma/entrada)*100).toFixed(1):"—";
          const costoEx=costoKgExFinoDe(grupo,costos,lotesFino);
          const dif=(t.factor_industrial!=null&&t.factor_pretrilla_ponderado!=null)?(t.factor_industrial-t.factor_pretrilla_ponderado):null;
          return(<tr key={repr.id}>
            <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.fecha_trilla}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{mesDe(t.fecha_trilla)}</td>
            <td style={S.td}><Bdg label={t.codigo_corte||"—"} col={C.accent}/></td>
            <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.teal}/>))}</div></td>
            <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[...new Set(grupo.map(x=>x.producto))].map(p=>(<Bdg key={p} label={p} col={C.navy}/>))}</div></td>
            <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:C.green,fontWeight:600,maxWidth:160}}><AutoFitText text={t.nombre_trillado||"—"}/></td>
            <td style={{...S.td,fontWeight:600}}>{fmt(entrada)}</td>
            <td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(excelso)}</td>
            <td style={{...S.td,color:C.red}}>{fmt(merma)}</td>
            <td style={S.td}>{pctMermaGrupo}%</td>
            <td style={{...S.td,color:C.teal,fontWeight:600}}>{t.factor_industrial!=null?fmt(t.factor_industrial,1):"—"}</td>
            <td style={{...S.td,color:dif!=null&&Math.abs(dif)>5?C.red:C.textDim,fontWeight:dif!=null&&Math.abs(dif)>5?700:400}}>{dif!=null?(dif>0?"+":"")+dif.toFixed(1):"—"}</td>
            <td style={{...S.td,fontWeight:600}}>{costoEx>0?fmtCOP(costoEx):"—"}</td>
            <td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarGrupo(repr)}>Editar</button></td>
          </tr>);
        })}</tbody>
      </table></TablaScrollV>
    </div>)}
  </div>);
}
