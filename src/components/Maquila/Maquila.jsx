import{useState}from"react";
import{C,S}from"../../theme";
import{NORMAS,TIPOS_TOSTION}from"../../data/constants";
import{fmtCOP,fmt,today,genId,fmtFecha}from"../../lib/format";
import{mesDe,semanaISO}from"../../lib/dates";
import{Bdg,Fld,KPI,Modal,TablaScrollV}from"../ui";
const SERVICIOS_MAQUILA=["Trilla","Seleccion","Tostado","Marca"];
export function Maquila({maquilas,setMaquilas,setLotesFino}){
  const [tab,setTab]=useState("registros");
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankA=()=>({fecha:today(),cliente:"",telefono:"",kg_recibidos:"",servicio:SERVICIOS_MAQUILA[0],observaciones:""});
  const [form,setForm]=useState(blankA());
  const mesAuto=mesDe(form.fecha);const semanaAuto=semanaISO(form.fecha);
  const genCodM=()=>"MAQUILA-"+today().replace(/-/g,"")+"-"+form.cliente.replace(/\s+/g,"");
  const regA=()=>{
    if(!form.cliente||!form.kg_recibidos)return;
    if(editId){setMaquilas(p=>p.map(m=>m.id===editId?{...m,fecha:form.fecha,mes:mesAuto,semana:semanaAuto,cliente:form.cliente,telefono:form.telefono,kg_recibidos:+form.kg_recibidos,servicio:form.servicio,observaciones:form.observaciones}:m));}
    else{setMaquilas(p=>[{id:genId(),codigo:genCodM(),fecha:form.fecha,mes:mesAuto,semana:semanaAuto,cliente:form.cliente,telefono:form.telefono,kg_recibidos:+form.kg_recibidos,servicio:form.servicio,observaciones:form.observaciones,salidas:[],estado_pipeline:"registro",trilla_mq:null,tostado_mq:null,entregas_mq:[]},...p]);}
    setModal(false);
  };
  const enviarTrilla=(m)=>{setMaquilas(p=>p.map(x=>x.id===m.id?{...x,estado_pipeline:"en_trilla"}:x));setTab("trilla");};
  const [selT,setSelT]=useState(null);
  const blankT=()=>({fecha_trilla:today(),codigo_corte:"",kg_excelso:"",pasilla_elec:"",catadora_dens:"",inferiores:"",cisco:"",humedad:"",norma:NORMAS[0],con_proceso:"Con Proceso",obs:""});
  const [formT,setFormT]=useState(blankT());
  const [errT,setErrT]=useState("");
  const pendTrilla=maquilas.filter(m=>m.estado_pipeline==="en_trilla"&&!m.trilla_mq);
  const histTrilla=maquilas.filter(m=>m.trilla_mq);
  const entT=selT?.kg_recibidos||0;
  const mermaT=+formT.cisco||0;
  const pasillasT=(+formT.pasilla_elec||0)+(+formT.catadora_dens||0)+(+formT.inferiores||0);
  const fiT=entT>0&&+formT.kg_excelso>0?(entT/(+formT.kg_excelso)*70):null;
  const regT=()=>{
    if(!selT)return;
    if(!formT.fecha_trilla||!formT.codigo_corte){setErrT("Fecha y Codigo de Corte son obligatorios.");return;}
    setMaquilas(p=>p.map(m=>m.id===selT.id?{...m,trilla_mq:{fecha_trilla:formT.fecha_trilla,codigo_corte:formT.codigo_corte,kg_excelso:+formT.kg_excelso||0,kg_merma:mermaT,kg_pasillas:pasillasT,pasilla_elec:+formT.pasilla_elec||0,catadora_dens:+formT.catadora_dens||0,inferiores:+formT.inferiores||0,cisco:+formT.cisco||0,entrada_usada:entT,humedad_salida:+formT.humedad||0,norma:formT.norma,con_proceso:formT.con_proceso,obs:formT.obs,factor_industrial:fiT}}:m));
    setSelT(null);setFormT(blankT());setErrT("");
  };
  const enviarTostado=(m)=>{setMaquilas(p=>p.map(x=>x.id===m.id?{...x,estado_pipeline:"en_tostado"}:x));setTab("tostado");};
  const retroTrilla=(m)=>{if(window.confirm("¿Retroceder a Registros? Se borra el registro de trilla.")){setMaquilas(p=>p.map(x=>x.id===m.id?{...x,estado_pipeline:"registro",trilla_mq:null}:x));}};
  const [selC,setSelC]=useState(null);
  const blankC=()=>({fecha:today(),nombre_producto:"",kg_cafe_tostado:"",temperatura:"",tiempo:"",tipo_tostion:TIPOS_TOSTION[0],catacion:"",responsable:""});
  const [formC,setFormC]=useState(blankC());
  const [errC,setErrC]=useState("");
  const pendTostado=maquilas.filter(m=>m.estado_pipeline==="en_tostado"&&!m.tostado_mq);
  const histTostado=maquilas.filter(m=>m.tostado_mq);
  const regC=()=>{
    if(!selC)return;
    if(!formC.kg_cafe_tostado){setErrC("Ingresa kg de café tostado.");return;}
    const kgTostar=selC.trilla_mq?.kg_excelso||0;
    setMaquilas(p=>p.map(m=>m.id===selC.id?{...m,tostado_mq:{fecha:formC.fecha,nombre_producto:formC.nombre_producto,kg_a_tostar:kgTostar,kg_cafe_tostado:+formC.kg_cafe_tostado||0,temperatura:formC.temperatura,tiempo:formC.tiempo,tipo_tostion:formC.tipo_tostion,catacion:formC.catacion,responsable:formC.responsable}}:m));
    setSelC(null);setFormC(blankC());setErrC("");
  };
  const retroTostado=(m)=>{if(window.confirm("¿Retroceder a Trilla? Se borra el registro de tostado.")){setMaquilas(p=>p.map(x=>x.id===m.id?{...x,estado_pipeline:"en_trilla",tostado_mq:null}:x));}};
  const [modalE,setModalE]=useState(false);
  const [selE,setSelE]=useState(null);
  const blankE=()=>({fecha:today(),kg_entregados:"",valor_servicio:"",responsable_entrega:"",responsable_recibe:""});
  const [formE,setFormE]=useState(blankE());
  const [errE,setErrE]=useState("");
  const maqConTostado=maquilas.filter(m=>m.tostado_mq);
  const todasEntregas=maqConTostado.flatMap(m=>(m.entregas_mq||[]).map(e=>({...e,mq:m})));
  const kgEntregadosDe=(m)=>(m.entregas_mq||[]).reduce((s,e)=>s+e.kg_entregados,0);
  const abrirE=(m)=>{setSelE(m);setFormE(blankE());setErrE("");setModalE(true);};
  const regE=()=>{
    if(!selE||!formE.kg_entregados){setErrE("Ingresa los kg entregados.");return;}
    const ent={id:genId(),fecha:formE.fecha,kg_entregados:+formE.kg_entregados,valor_servicio:+formE.valor_servicio||0,responsable_entrega:formE.responsable_entrega,responsable_recibe:formE.responsable_recibe};
    setMaquilas(p=>p.map(m=>m.id===selE.id?{...m,entregas_mq:[...(m.entregas_mq||[]),ent]}:m));
    setModalE(false);setFormE(blankE());setErrE("");
  };
  const totalKg=maquilas.reduce((s,m)=>s+(m.kg_recibidos||0),0);
  const TABS_MQ=[["registros","Registros Maquila"],["trilla","Trilla Maquila"],["tostado","Tostado Maquila"],["entregas","Entregas Maquila"]];
  const tStyle=(k)=>({padding:"8px 16px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:tab===k?C.orange:C.panel,color:tab===k?C.white:C.textDim,borderBottom:tab===k?"3px solid "+C.orange:"3px solid transparent"});
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}><div><div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>SERVICIOS A TERCEROS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Maquila</div></div>{tab==="registros"&&<button style={{...S.btn,background:C.orange}} onClick={()=>{setEditId(null);setForm(blankA());setModal(true);}}>+ Nuevo Registro</button>}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
      <KPI label="Registros" value={maquilas.length} col={C.navy}/>
      <KPI label="kg Recibidos" value={fmt(totalKg)+" kg"} col={C.accent}/>
      <KPI label="En Trilla" value={maquilas.filter(m=>m.estado_pipeline==="en_trilla").length} col={C.orange}/>
      <KPI label="En Tostado" value={maquilas.filter(m=>m.estado_pipeline==="en_tostado").length} col={C.purple}/>
      <KPI label="Entregas" value={todasEntregas.length} col={C.green}/>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"1px solid "+C.border,paddingBottom:0}}>{TABS_MQ.map(([k,l])=>(<button key={k} style={tStyle(k)} onClick={()=>setTab(k)}>{l}{k==="trilla"&&pendTrilla.length>0?<span style={{marginLeft:6,background:C.red,color:C.white,borderRadius:10,padding:"1px 6px",fontSize:10}}>{pendTrilla.length}</span>:null}{k==="tostado"&&pendTostado.length>0?<span style={{marginLeft:6,background:C.red,color:C.white,borderRadius:10,padding:"1px 6px",fontSize:10}}>{pendTostado.length}</span>:null}</button>))}</div>

    {tab==="registros"&&(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Registros de Maquila</div><TablaScrollV minWidth={1050}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>{["Codigo","Fecha","Mes","Cliente","Telefono","kg Recibidos","Servicio","Estado","Observaciones","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{maquilas.map(m=>{const ep=m.estado_pipeline||"registro";const puedeTrilla=ep==="registro";return(<tr key={m.id}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{m.codigo||"-"}</td>
        <td style={{...S.td,color:C.textDim}}>{fmtFecha(m.fecha)}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{m.mes||mesDe(m.fecha)}</td>
        <td style={{...S.td,fontWeight:600,color:C.navy}}>{m.cliente}</td>
        <td style={{...S.td,color:C.textDim}}>{m.telefono||"-"}</td>
        <td style={{...S.td,fontWeight:700,color:C.accent}}>{fmt(m.kg_recibidos)} kg</td>
        <td style={S.td}><Bdg label={m.servicio} col={C.orange} bg={C.orangeBg}/></td>
        <td style={S.td}><Bdg label={ep==="registro"?"Registro":ep==="en_trilla"?"En Trilla":ep==="en_tostado"?"En Tostado":"Entrega"} col={ep==="registro"?C.textDim:ep==="en_trilla"?C.orange:ep==="en_tostado"?C.purple:C.green}/></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{m.observaciones||"-"}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{puedeTrilla&&<button style={{...S.btn,fontSize:11,padding:"6px 12px",background:C.orange}} onClick={()=>enviarTrilla(m)}>&#8594; Trilla</button>}<button style={S.btnG} onClick={()=>{setEditId(m.id);setForm({fecha:m.fecha,cliente:m.cliente,telefono:m.telefono||"",kg_recibidos:m.kg_recibidos,servicio:m.servicio,observaciones:m.observaciones||""});setModal(true);}}>Editar</button></div></td>
      </tr>);})}
      </tbody></table></TablaScrollV>{maquilas.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin registros de maquila todavia.</div>}</div>)}

    {tab==="trilla"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16}}>
      <div>
        <div style={{color:C.textFaint,fontSize:11,marginBottom:8}}>Selecciona un lote para registrar la trilla.</div>
        {pendTrilla.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes pendientes de trilla. Envía registros desde la pestaña Registros.</div>}
        {pendTrilla.map(m=>{const isSel=selT?.id===m.id;return(<div key={m.id} onClick={()=>{setSelT(m);setFormT(blankT());setErrT("");}} style={{...S.card,cursor:"pointer",marginBottom:10,borderLeft:"3px solid "+(isSel?C.orange:C.border)}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{m.codigo}</span><Bdg label={m.servicio} col={C.orange} bg={C.orangeBg}/></div>
          <div style={{color:C.navy,fontWeight:600,fontSize:13}}>{m.cliente}</div>
          <div style={{color:C.green,fontSize:12,fontWeight:600,marginTop:3}}>{fmt(m.kg_recibidos)} kg recibidos</div>
        </div>);})}
        {histTrilla.length>0&&(<div style={{...S.card,marginTop:16}}>
          <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:10}}>Trillas Realizadas</div>
          {histTrilla.map(m=>{const t=m.trilla_mq;const fi=t.factor_industrial;return(<div key={m.id} style={{borderBottom:"1px solid "+C.border,paddingBottom:10,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
              <div><div style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{m.codigo}</div><div style={{color:C.navy,fontWeight:600,fontSize:12}}>{m.cliente}</div></div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {m.estado_pipeline==="en_trilla"&&<button style={{...S.btn,fontSize:11,padding:"5px 10px",background:C.purple}} onClick={()=>enviarTostado(m)}>&#8594; Tostado</button>}
                <button style={{...S.btnG,fontSize:11,padding:"5px 10px",color:C.orange,borderColor:C.orange+"40"}} onClick={()=>retroTrilla(m)}>Retroceder</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:8}}>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 8px",border:"1px solid "+C.border}}><div style={{color:C.textFaint,fontSize:9}}>kg Excelso</div><div style={{color:C.green,fontWeight:700,fontSize:13}}>{fmt(t.kg_excelso)} kg</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 8px",border:"1px solid "+C.border}}><div style={{color:C.textFaint,fontSize:9}}>Rend.</div><div style={{color:C.teal,fontWeight:700,fontSize:13}}>{t.entrada_usada>0?((t.kg_excelso/t.entrada_usada)*100).toFixed(1)+"%":"?"}</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 8px",border:"1px solid "+C.border}}><div style={{color:C.textFaint,fontSize:9}}>Factor Ind.</div><div style={{color:C.purple,fontWeight:700,fontSize:13}}>{fi!=null?fmt(fi,1):"?"}</div></div>
            </div>
            <div style={{color:C.textDim,fontSize:11,marginTop:4}}>{fmtFecha(t.fecha_trilla)} | {t.codigo_corte}</div>
          </div>);})}
        </div>)}
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registro de Trilla Maquila</div>
        {!selT?(<div style={{color:C.textFaint,fontSize:13}}>Selecciona un lote de la lista para registrar su trilla.</div>):(
          <><div style={{background:C.orangeBg,border:"1px solid "+C.orange+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
            <div style={{color:C.orange,fontWeight:700}}>{selT.codigo} — {selT.cliente}</div>
            <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Entrada: <b style={{color:C.navy}}>{fmt(entT)} kg</b></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>Fecha de Trilla</label><input style={S.input} type="date" value={formT.fecha_trilla} onChange={e=>setFormT(p=>({...p,fecha_trilla:e.target.value}))}/></div>
            <div><label style={S.lbl}>Codigo de Corte</label><input style={S.input} value={formT.codigo_corte} onChange={e=>setFormT(p=>({...p,codigo_corte:e.target.value}))}/></div>
            <div><label style={S.lbl}>kg Excelso</label><input style={S.input} type="number" value={formT.kg_excelso} onChange={e=>setFormT(p=>({...p,kg_excelso:e.target.value}))}/>{formT.kg_excelso&&entT?<div style={{color:C.green,fontSize:10,marginTop:3}}>Rend: {((+formT.kg_excelso/entT)*100).toFixed(1)}% | FI: {fiT!=null?fmt(fiT,1):"?"}</div>:null}</div>
            <div><label style={S.lbl}>Humedad Salida %</label><input style={S.input} type="number" step="0.1" value={formT.humedad} onChange={e=>setFormT(p=>({...p,humedad:e.target.value}))}/></div>
            <div><label style={S.lbl}>Pasilla Electronica kg</label><input style={S.input} type="number" placeholder="0" value={formT.pasilla_elec} onChange={e=>setFormT(p=>({...p,pasilla_elec:e.target.value}))}/></div>
            <div><label style={S.lbl}>Catadora Densimetrica kg</label><input style={S.input} type="number" placeholder="0" value={formT.catadora_dens} onChange={e=>setFormT(p=>({...p,catadora_dens:e.target.value}))}/></div>
            <div><label style={S.lbl}>Inferiores kg</label><input style={S.input} type="number" placeholder="0" value={formT.inferiores} onChange={e=>setFormT(p=>({...p,inferiores:e.target.value}))}/></div>
            <div><label style={S.lbl}>Cisco kg (Merma)</label><input style={S.input} type="number" placeholder="0" value={formT.cisco} onChange={e=>setFormT(p=>({...p,cisco:e.target.value}))}/></div>
          </div>
          <Fld label="Norma de Produccion"><select style={S.select} value={formT.norma} onChange={e=>setFormT(p=>({...p,norma:e.target.value}))}>{NORMAS.map(n=>(<option key={n}>{n}</option>))}</select></Fld>
          <Fld label="Proceso"><select style={S.select} value={formT.con_proceso} onChange={e=>setFormT(p=>({...p,con_proceso:e.target.value}))}><option>Con Proceso</option><option>Sin Proceso</option></select></Fld>
          <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formT.obs} onChange={e=>setFormT(p=>({...p,obs:e.target.value}))}/></Fld>
          {errT&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errT}</div>)}
          <button style={{...S.btn,background:C.orange,width:"100%"}} onClick={regT}>Registrar Trilla</button></>
        )}
      </div>
    </div>)}

    {tab==="tostado"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16}}>
      <div>
        <div style={{color:C.textFaint,fontSize:11,marginBottom:8}}>Selecciona un lote para registrar el tostado.</div>
        {pendTostado.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes pendientes de tostado. Envía desde Trilla Maquila.</div>}
        {pendTostado.map(m=>{const isSel=selC?.id===m.id;return(<div key={m.id} onClick={()=>{setSelC(m);setFormC(blankC());setErrC("");}} style={{...S.card,cursor:"pointer",marginBottom:10,borderLeft:"3px solid "+(isSel?C.purple:C.border)}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{m.codigo}</span><Bdg label={m.servicio} col={C.orange} bg={C.orangeBg}/></div>
          <div style={{color:C.navy,fontWeight:600,fontSize:13}}>{m.cliente}</div>
          <div style={{color:C.purple,fontSize:12,fontWeight:600,marginTop:3}}>Excelso disponible: {fmt(m.trilla_mq?.kg_excelso||0)} kg</div>
        </div>);})}
        {histTostado.length>0&&(<div style={{...S.card,marginTop:16}}>
          <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:10}}>Tostados Realizados</div>
          {histTostado.map(m=>{const t=m.tostado_mq;return(<div key={m.id} style={{borderBottom:"1px solid "+C.border,paddingBottom:10,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
              <div><div style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{m.codigo}</div><div style={{color:C.navy,fontWeight:600,fontSize:12}}>{m.cliente} — {t.nombre_producto}</div></div>
              <button style={{...S.btnG,fontSize:11,padding:"5px 10px",color:C.orange,borderColor:C.orange+"40"}} onClick={()=>retroTostado(m)}>Retroceder</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:8}}>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 8px",border:"1px solid "+C.border}}><div style={{color:C.textFaint,fontSize:9}}>kg Tostado</div><div style={{color:C.green,fontWeight:700,fontSize:13}}>{fmt(t.kg_cafe_tostado)} kg</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 8px",border:"1px solid "+C.border}}><div style={{color:C.textFaint,fontSize:9}}>Rendimiento</div><div style={{color:C.teal,fontWeight:700,fontSize:13}}>{t.kg_a_tostar>0?((t.kg_cafe_tostado/t.kg_a_tostar)*100).toFixed(1)+"%":"?"}</div></div>
              <div style={{background:C.panel,borderRadius:4,padding:"6px 8px",border:"1px solid "+C.border}}><div style={{color:C.textFaint,fontSize:9}}>Tipo Tostión</div><div style={{color:C.purple,fontWeight:700,fontSize:11}}>{t.tipo_tostion}</div></div>
            </div>
            <div style={{color:C.textDim,fontSize:11,marginTop:4}}>{fmtFecha(t.fecha)} | Resp: {t.responsable||"—"}</div>
          </div>);})}
        </div>)}
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registro de Tostado Maquila</div>
        {!selC?(<div style={{color:C.textFaint,fontSize:13}}>Selecciona un lote para registrar su tostado.</div>):(
          <><div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
            <div style={{color:C.purple,fontWeight:700}}>{selC.codigo} — {selC.cliente}</div>
            <div style={{color:C.textDim,fontSize:12,marginTop:2}}>kg Excelso a tostar: <b style={{color:C.navy}}>{fmt(selC.trilla_mq?.kg_excelso||0)} kg</b></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={S.lbl}>Fecha</label><input style={S.input} type="date" value={formC.fecha} onChange={e=>setFormC(p=>({...p,fecha:e.target.value}))}/></div>
            <div><label style={S.lbl}>Nombre Producto Comercial</label><input style={S.input} value={formC.nombre_producto} onChange={e=>setFormC(p=>({...p,nombre_producto:e.target.value}))}/></div>
            <div><label style={S.lbl}>kg Cafe Tostado (salida)</label><input style={S.input} type="number" value={formC.kg_cafe_tostado} onChange={e=>setFormC(p=>({...p,kg_cafe_tostado:e.target.value}))}/>{formC.kg_cafe_tostado&&selC.trilla_mq?.kg_excelso?<div style={{color:C.teal,fontSize:10,marginTop:3}}>Rend: {((+formC.kg_cafe_tostado/selC.trilla_mq.kg_excelso)*100).toFixed(1)}%</div>:null}</div>
            <div><label style={S.lbl}>Temperatura (°C)</label><input style={S.input} type="number" value={formC.temperatura} onChange={e=>setFormC(p=>({...p,temperatura:e.target.value}))}/></div>
            <div><label style={S.lbl}>Tiempo (min)</label><input style={S.input} type="number" value={formC.tiempo} onChange={e=>setFormC(p=>({...p,tiempo:e.target.value}))}/></div>
            <div><label style={S.lbl}>Tipo Tostión</label><select style={S.select} value={formC.tipo_tostion} onChange={e=>setFormC(p=>({...p,tipo_tostion:e.target.value}))}>{TIPOS_TOSTION.map(t=>(<option key={t}>{t}</option>))}</select></div>
            <div><label style={S.lbl}>Catacion / Perfil</label><input style={S.input} value={formC.catacion} onChange={e=>setFormC(p=>({...p,catacion:e.target.value}))}/></div>
            <div><label style={S.lbl}>Responsable</label><input style={S.input} value={formC.responsable} onChange={e=>setFormC(p=>({...p,responsable:e.target.value}))}/></div>
          </div>
          {errC&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errC}</div>)}
          <button style={{...S.btn,background:C.purple,width:"100%"}} onClick={regC}>Registrar Tostado</button></>
        )}
      </div>
    </div>)}

    {tab==="entregas"&&(<div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Lotes Listos para Entrega</div>
        {maqConTostado.length===0&&<div style={{color:C.textFaint,fontSize:13}}>Ningún lote ha completado el proceso de tostado todavía.</div>}
        <TablaScrollV minWidth={900}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Codigo","Cliente","Servicio","kg Tostado","kg Entregados","Pendiente kg","Fecha Tostado","Responsable","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{maqConTostado.map(m=>{const t=m.tostado_mq;const entKg=kgEntregadosDe(m);const pendKg=(t.kg_cafe_tostado||0)-entKg;return(<tr key={m.id}>
          <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{m.codigo||"-"}</td>
          <td style={{...S.td,fontWeight:600,color:C.navy}}>{m.cliente}</td>
          <td style={S.td}><Bdg label={m.servicio} col={C.orange} bg={C.orangeBg}/></td>
          <td style={{...S.td,fontWeight:600,color:C.purple}}>{fmt(t.kg_cafe_tostado)} kg</td>
          <td style={{...S.td,color:C.green,fontWeight:600}}>{fmt(entKg)} kg</td>
          <td style={S.td}><span style={{fontWeight:700,color:pendKg>0?C.orange:C.textFaint}}>{fmt(pendKg)} kg</span></td>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(t.fecha)}</td>
          <td style={{...S.td,color:C.textDim}}>{t.responsable||"—"}</td>
          <td style={S.td}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:pendKg>0?C.green:C.textFaint,cursor:pendKg>0?"pointer":"not-allowed"}} disabled={pendKg<=0} onClick={()=>abrirE(m)}>+ Entrega</button></td>
        </tr>);})}
        </tbody></table></TablaScrollV>
      </div>
      {todasEntregas.length>0&&(<div style={{...S.card,marginTop:16}}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historial de Entregas</div>
        <TablaScrollV minWidth={900}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Fecha","Codigo Maquila","Cliente","kg Entregados","Valor Servicio","Resp. Entrega","Resp. Recibe"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{todasEntregas.map(e=>(<tr key={e.id}>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(e.fecha)}</td>
          <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{e.mq.codigo}</td>
          <td style={{...S.td,fontWeight:600,color:C.navy}}>{e.mq.cliente}</td>
          <td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(e.kg_entregados)} kg</td>
          <td style={{...S.td,color:C.gold,fontWeight:600}}>{e.valor_servicio?fmtCOP(e.valor_servicio):"—"}</td>
          <td style={S.td}>{e.responsable_entrega||"—"}</td>
          <td style={S.td}>{e.responsable_recibe||"—"}</td>
        </tr>))}</tbody></table></TablaScrollV>
      </div>)}
    </div>)}

    {modal&&(<Modal title={editId?"Editar Registro Maquila":"Nuevo Registro Maquila"} onClose={()=>setModal(false)}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Mes (auto)" half><input style={{...S.input,background:C.panel2,color:C.textDim,textTransform:"capitalize"}} value={mesAuto} readOnly/></Fld>
        <Fld label="Semana (auto)" half><input style={{...S.input,background:C.panel2,color:C.textDim}} value={semanaAuto} readOnly/></Fld>
        <Fld label="Nombre Cliente" half><input style={S.input} value={form.cliente} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))}/></Fld>
        <Fld label="Telefono" half><input style={S.input} value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))}/></Fld>
        <Fld label="kg Recibidos" half><input style={S.input} type="number" value={form.kg_recibidos} onChange={e=>setForm(p=>({...p,kg_recibidos:e.target.value}))}/></Fld>
        <Fld label="Servicio"><select style={S.select} value={form.servicio} onChange={e=>setForm(p=>({...p,servicio:e.target.value}))}>{SERVICIOS_MAQUILA.map(s=>(<option key={s}>{s}</option>))}</select></Fld>
      </div>
      <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.observaciones} onChange={e=>setForm(p=>({...p,observaciones:e.target.value}))}/></Fld>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button><button style={{...S.btn,background:C.orange}} onClick={regA}>{editId?"Guardar Cambios":"Registrar"}</button></div>
    </Modal>)}
    {modalE&&selE&&(<Modal title={"Registrar Entrega — "+selE.codigo} onClose={()=>setModalE(false)}>
      <div style={{background:C.greenBg,border:"1px solid "+C.green+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.green,fontWeight:700}}>{selE.codigo} — {selE.cliente}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>kg tostados disponibles: <b style={{color:C.navy}}>{fmt((selE.tostado_mq?.kg_cafe_tostado||0)-kgEntregadosDe(selE))} kg</b></div>
      </div>
      {errE&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errE}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Entrega" half><input style={S.input} type="date" value={formE.fecha} onChange={e=>setFormE(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Entregados" half><input style={S.input} type="number" value={formE.kg_entregados} onChange={e=>{setFormE(p=>({...p,kg_entregados:e.target.value}));setErrE("");}}/></Fld>
        <Fld label="Valor del Servicio COP" half><input style={S.input} type="number" value={formE.valor_servicio} onChange={e=>setFormE(p=>({...p,valor_servicio:e.target.value}))}/></Fld>
        <Fld label="Responsable de Entrega" half><input style={S.input} value={formE.responsable_entrega} onChange={e=>setFormE(p=>({...p,responsable_entrega:e.target.value}))}/></Fld>
        <Fld label="Responsable que Recibe" half><input style={S.input} value={formE.responsable_recibe} onChange={e=>setFormE(p=>({...p,responsable_recibe:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModalE(false)}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regE}>Registrar Entrega</button></div>
    </Modal>)}
  </div>);
}
