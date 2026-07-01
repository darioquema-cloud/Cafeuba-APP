import{useState,useMemo,useEffect}from"react";
import*as XLSX from"xlsx";
import{auth}from"./firebase";
import{signInWithPopup,GoogleAuthProvider,onAuthStateChanged,signOut as fbSignOut}from"firebase/auth";
import{useFirestoreList}from"./useFirestoreList";

/* ─── EXCEL DATA (pre-processed) ─────────────────────────────────────────── */
const XD={lotes:[],bodega:[],salidas:[],trilla:[],ventas_v:[],ventas_m:[],cb_mes:{},kg_mes:{},c_mes:{}};


/* ─── PALETA ──────────────────────────────────────────────────────────────── */
const C={bg:"#F4F6F9",panel:"#FFFFFF",panel2:"#F8FAFC",border:"#E2E8F0",border2:"#CBD5E1",navy:"#1E3A5F",accent:"#2563EB",accentBg:"#EFF6FF",gold:"#B45309",goldBg:"#FFFBEB",green:"#15803D",greenBg:"#F0FDF4",red:"#DC2626",redBg:"#FEF2F2",orange:"#C2410C",orangeBg:"#FFF7ED",teal:"#0E7490",tealBg:"#ECFEFF",purple:"#7C3AED",purpleBg:"#F5F3FF",text:"#0F172A",textDim:"#64748B",textFaint:"#94A3B8",white:"#FFFFFF"};
const fmtCOP=n=>n==null||n===""?"":"$ "+Number(n).toLocaleString("es-CO",{maximumFractionDigits:0});
const fmt=(n,d=0)=>n==null?"":Number(n).toLocaleString("es-CO",{minimumFractionDigits:d,maximumFractionDigits:d});
const today=()=>new Date().toISOString().slice(0,10);
const genId=()=>Math.random().toString(36).slice(2,8).toUpperCase();
const semanaISO=(d)=>{if(!d)return"";const dt=new Date(d+"T00:00:00");dt.setHours(0,0,0,0);dt.setDate(dt.getDate()+3-((dt.getDay()+6)%7));const w1=new Date(dt.getFullYear(),0,4);return 1+Math.round(((dt-w1)/86400000-3+((w1.getDay()+6)%7))/7);};
const mesDe=(d)=>d?MESES[new Date(d+"T00:00:00").getMonth()]:"";
const diasEntre=(a,b)=>a&&b?Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000):null;
const dateToCode=(d)=>{if(!d)return"";const[y,m,dd]=d.split("-");return dd+m+y;};
const pesoATrilladora=(l)=>(l.salidas_bodega||[]).filter(s=>s.destino_key==="trilla").reduce((s,x)=>s+x.peso_salida,0);
const pesoATrilladoraCafeFino=(l)=>(l.salidas_bodega||[]).filter(s=>s.destino_key==="trilla_cf").reduce((s,x)=>s+x.peso_salida,0);
const pesoOtrosBodega=(l)=>(l.salidas_bodega||[]).filter(s=>s.destino_key!=="trilla"&&s.destino_key!=="trilla_cf").reduce((s,x)=>s+x.peso_salida,0);
const FINCAS=["Milan","Buenos Aires","Capri","Riviera","Bascula","Palermo","Marsella","Sta Maria Huila","Externo Huila"];
const VARIEDADES=["Castillo","Caturra","Colombia","Cenicafe","San Isidro","Gesha","L13","SIDRA","Tabi","Bourbon"];
const TIPOS=["Culturing","Lavado","Natural","Honey","Ultrastate","Biomaster","Double Roast","Marco Rojo","Purple Peak","Cherry Candy","None Required","SD","LVD"];
const ABREV={"Culturing":"CTG","Lavado":"LVD","Natural":"NAT","Honey":"HNY","Ultrastate":"UST","Biomaster":"BIOMASTER","Double Roast":"DR","Marco Rojo":"MR","Purple Peak":"PP","Cherry Candy":"CC","None Required":"NR","SD":"SD","LVD":"LVD"};
const NORMAS=["Norma FNC","European Prep","Specialty 80+","Specialty 85+","Micro Lot","Privado"];
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const EQUIPOS_FERM=["Reactor 1","Reactor 2","Reactor 3","Canecas","Biomaster"];
const EQUIPOS_SECADO=["Silo Redondo","Silo Cuadrado","Guardiola","Marquesina","Dry Pro"];
const TIPOS_COSTO=["Mano de Obra","Energia","Agua","Logistica","Empaques","Mantenimiento Maquinaria","Mantenimiento Infraestructura","Seguridad Social","Horas Extras","Administracion","Herramientas","Equipos","Papeleria","Internet","Servicios Generales","Apoyo Cargue Descargue"];
const CENTROS=["Central de Beneficio","Trilladora"];
const ECOL={"Recepcion":C.teal,"Proceso":C.orange,"Secado":C.gold,"Bodega":C.accent,"Finalizado":C.green,"Cerrado":C.purple};
const EBG={"Recepcion":C.tealBg,"Proceso":C.orangeBg,"Secado":C.goldBg,"Bodega":C.accentBg,"Finalizado":C.greenBg,"Cerrado":C.purpleBg};
const USERS_SEED=[{id:"u1",nombre:"Dario Quema",email:"dario.quema@cafeuba.com.co",rol:"Gerente",activo:true},{id:"u2",nombre:"Liliana Gomez",email:"l.gomez@cafeuba.com.co",rol:"Operario Beneficio",activo:true},{id:"u3",nombre:"Andres Perez",email:"a.perez@cafeuba.com.co",rol:"Trilladore",activo:true},{id:"u4",nombre:"Maria Torres",email:"m.torres@cafeuba.com.co",rol:"Analista Calidad",activo:true}];
const seedL=()=>[];
const seedC=()=>[];

// Calculo costo lote (a + b + c)
const calcCosto=(lote,costos,lotes)=>{
  if(!lote.kg_producto||lote.kg_producto===0)return null;
  const totalCereza=lote.cereza.reduce((s,c)=>s+c.kg*c.valor_kg,0);
  const ins=lote.insumos||{};
  const totalIns=(ins.jugo||0)*(ins.vr_jugo||0)+(ins.panela||0)*(ins.vr_panela||0)+(ins.harina||0)*(ins.vr_harina||0)+(ins.levadura||0)*(ins.vr_levadura||0);
  const a=totalCereza/lote.kg_producto;
  const b=totalIns/lote.kg_producto;
  // c: suma costos CB del mes / suma kg pergamino del mes (pool mensual, no por lote individual)
  const costosCBMes=(costos||[]).filter(c=>c.centro==="Central de Beneficio"&&c.mes===lote.mes).reduce((s,c)=>s+c.valor,0);
  const kgPergaminoMes=(lotes||[lote]).filter(l=>l.mes===lote.mes&&l.kg_producto>0).reduce((s,l)=>s+l.kg_producto,0);
  const c_val=kgPergaminoMes>0?costosCBMes/kgPergaminoMes:0;
  // d: costos Trilladora del mes / kg excelso del mes (se calcula en Trilla)
  return{totalCereza,totalIns,a,b,c:c_val,total:a+b+c_val};
};

// Costo trilladora por kg excelso del mes
const calcCostoTri=(mes,costos,lotes)=>{
  const costosTri=(costos||[]).filter(c=>c.centro==="Trilladora"&&c.mes===mes).reduce((s,c)=>s+c.valor,0);
  const kgEx=lotes.filter(l=>l.mes===mes&&l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  return{costosTri,kgEx,costoTriKg:kgEx>0?costosTri/kgEx:0};
};

const S={app:{fontFamily:"'Inter','Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",color:C.text,fontSize:14},topbar:{height:56,background:C.navy,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"fixed",top:0,left:0,right:0,zIndex:200,boxShadow:"0 2px 12px rgba(0,0,0,0.2)"},sidebar:{width:224,background:C.panel,borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",position:"fixed",top:56,left:0,height:"calc(100vh - 56px)",zIndex:100,boxShadow:"2px 0 8px rgba(0,0,0,0.05)"},main:{marginLeft:224,marginTop:56,padding:"28px 32px",minHeight:"calc(100vh - 56px)"},card:{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"20px 24px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"},card2:{background:C.panel2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px"},input:{background:C.white,border:"1px solid "+C.border2,borderRadius:6,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:13,padding:"9px 12px",width:"100%",outline:"none",boxSizing:"border-box"},select:{background:C.white,border:"1px solid "+C.border2,borderRadius:6,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:13,padding:"9px 12px",width:"100%",outline:"none"},btn:{background:C.navy,border:"none",borderRadius:6,color:C.white,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:600,padding:"9px 20px"},btnG:{background:"transparent",border:"1px solid "+C.border2,borderRadius:6,color:C.textDim,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,padding:"7px 14px"},th:{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",padding:"10px 14px",textAlign:"left",borderBottom:"2px solid "+C.border,background:C.panel2,whiteSpace:"nowrap"},td:{padding:"11px 14px",borderBottom:"1px solid "+C.border,fontSize:13,verticalAlign:"middle"},lbl:{color:C.textDim,fontSize:11,fontWeight:500,letterSpacing:.4,textTransform:"uppercase",marginBottom:5,display:"block"}};
const tg=(col,bg)=>({background:bg||col+"15",border:"1px solid "+col+"30",borderRadius:4,color:col,fontSize:11,fontWeight:600,padding:"3px 8px",display:"inline-block",whiteSpace:"nowrap"});
const Bdg=({label,col,bg})=><span style={tg(col||C.accent,bg)}>{label||"?"}</span>;
const Fld=({label,children,half,third})=>{const w=third?"calc(33.3% - 8px)":half?"calc(50% - 6px)":"100%";return(<div style={{marginBottom:13,width:w,display:"inline-block",verticalAlign:"top",marginRight:half||third?"12px":"0"}}><label style={S.lbl}>{label}</label>{children}</div>);};
// Claves fijas de destino (no dependen de texto/tildes) — usar SIEMPRE destino_key para logica de traslados, "cliente" solo es texto para mostrar
const DESTINOS_SALIDA=[{key:"trilla",label:"Trilla"},{key:"blend",label:"Blend"},{key:"bodega_cf",label:"Bodega Cafe Fino"},{key:"trilla_cf",label:"Trilladora Cafe Fino"},{key:"blend_cf",label:"Blend Cafe Fino"},{key:"uba_tostado",label:"UBA Tostado"},{key:"otro",label:"Otro"}];
const destinoLabel=(key)=>DESTINOS_SALIDA.find(d=>d.key===key)?.label||"";
const SelectDestino=({value,destinoKey,onChange})=>{const esOtro=!destinoKey||destinoKey==="otro";return(<div><select style={S.select} value={esOtro?"otro":destinoKey} onChange={e=>{const k=e.target.value;onChange(k==="otro"?"":destinoLabel(k)||value,k);}}>{DESTINOS_SALIDA.map(d=>(<option key={d.key} value={d.key}>{d.label}</option>))}</select>{esOtro&&<input style={{...S.input,marginTop:6}} placeholder="Nombre del destino externo..." value={value} onChange={e=>onChange(e.target.value,"otro")}/>}</div>);};
function KPI({label,value,sub,col,icon}){const c=col||C.accent;return(<div style={{...S.card,marginBottom:0,borderTop:"3px solid "+c}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><span style={{color:C.textDim,fontSize:11,fontWeight:500,textTransform:"uppercase"}}>{label}</span>{icon&&<span style={{fontSize:18,opacity:.6}}>{icon}</span>}</div><div style={{color:C.navy,fontSize:22,fontWeight:700,lineHeight:1,marginBottom:4}}>{value}</div>{sub&&<div style={{color:C.textFaint,fontSize:11,marginTop:3}}>{sub}</div>}</div>);}
function Bar({label,value,max,col}){const c=col||C.accent;const p=Math.min(100,(value/max)*100)||0;return(<div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:C.text,fontSize:12}}>{label}</span><span style={{color:c,fontSize:12,fontWeight:600}}>{fmt(value)} kg</span></div><div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:c,width:p+"%",height:"100%",borderRadius:4}}/></div></div>);}
function Modal({title,onClose,children,wide}){return(<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:12,padding:28,width:wide?900:580,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:14,borderBottom:"1px solid "+C.border}}><span style={{color:C.navy,fontWeight:700,fontSize:15}}>{title}</span><button style={{...S.btnG,padding:"4px 10px",fontSize:15}} onClick={onClose}>x</button></div>{children}</div></div>);}

function Dashboard({lotes,costos}){
  const tkq=lotes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const tp=lotes.reduce((s,l)=>s+(l.kg_producto||0),0);
  const tc=lotes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  const tex=lotes.filter(l=>l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const ep=lotes.filter(l=>!["Finalizado","Cerrado"].includes(l.estado)).length;
  const tcos=costos.reduce((s,c)=>s+c.valor,0);
  const enBodega=lotes.filter(l=>l.estado==="Bodega");
  const kgBodega=enBodega.reduce((s,l)=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);return s+(l.kg_producto-sal);},0);
  const pf={};lotes.forEach(l=>l.cereza.forEach(c=>{pf[c.finca]=(pf[c.finca]||0)+c.kg;}));
  const mf=Math.max(...Object.values(pf),1);
  const pe={};lotes.forEach(l=>{pe[l.estado]=(pe[l.estado]||0)+1;});
  const tr=[18380,25000,45687,80314,91189,92000,95000,88000,103000,110000,118000,125000];
  const mt=Math.max(...tr);const ml=["E","F","M","A","M","J","J","A","S","O","N","D"];
  const ing=tex*1250000;const mg=ing-tc-tcos;
  return(<div>
    <div style={{marginBottom:24}}><div style={{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PLAN MILAN - CENTRAL DE BENEFICIO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Dashboard Ejecutivo</div><div style={{color:C.textDim,fontSize:12,marginTop:3}}>{new Date().toLocaleDateString("es-CO",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:22}}>
      <KPI label="Cereza Recibida" value={fmt(tkq)+" kg"} sub={lotes.length+" lotes"} col={C.teal} icon="&#127807;"/>
      <KPI label="Prod. Terminado" value={fmt(tp)+" kg"} col={C.accent} icon="&#128230;"/>
      <KPI label="Stock en Bodega" value={fmt(kgBodega)+" kg"} sub={enBodega.length+" lotes"} col={C.navy} icon="&#127968;"/>
      <KPI label="Excelso Trillado" value={fmt(tex)+" kg"} col={C.green} icon="&#9989;"/>
      <KPI label="Costos Registrados" value={fmtCOP(tcos)} col={C.orange} icon="&#128176;"/>
      <KPI label="Lotes Activos" value={ep} col={C.purple} icon="&#128260;"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,marginBottom:16}}>
      <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontWeight:600,fontSize:14,color:C.navy}}>Recepcion por Mes</div><div style={{color:C.accent,fontSize:13,fontWeight:700}}>{fmt(tr[11])} kg</div></div><div style={{display:"flex",alignItems:"flex-end",gap:5,height:90,marginBottom:6}}>{tr.map((v,i)=>{const h=Math.max(4,(v/mt)*80);return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{width:"100%",height:h,background:i===tr.length-1?C.navy:C.accentBg,borderRadius:"3px 3px 0 0"}}/></div>);})}</div><div style={{display:"flex",gap:5}}>{ml.map((l,i)=>(<div key={i} style={{flex:1,textAlign:"center",fontSize:9,color:i===tr.length-1?C.navy:C.textFaint,fontWeight:i===tr.length-1?700:400}}>{l}</div>))}</div></div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Flujo de Proceso</div>{Object.entries(ECOL).map(([est,col])=>{const n=pe[est]||0;const p=lotes.length?(n/lotes.length)*100:0;return(<div key={est} style={{display:"flex",alignItems:"center",gap:10,marginBottom:11}}><Bdg label={est} col={col} bg={EBG[est]}/><div style={{flex:1,background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:col,width:p+"%",height:"100%",borderRadius:4}}/></div><span style={{color:col,fontSize:13,fontWeight:700,minWidth:18,textAlign:"right"}}>{n}</span></div>);})}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Cereza por Finca</div>{Object.entries(pf).sort((a,b)=>b[1]-a[1]).map(([f,kg],i)=>(<Bar key={f} label={f} value={kg} max={mf} col={[C.navy,C.accent,C.teal,C.green,C.purple,C.gold,C.orange][i%7]}/>))}</div>
      <div><div style={{...S.card,marginBottom:14}}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Resultado Financiero</div>{[{l:"Ingresos Estimados",v:fmtCOP(ing),c:C.green},{l:"Costo Cereza MP",v:fmtCOP(tc),c:C.red},{l:"Otros Costos",v:fmtCOP(tcos),c:C.orange},{l:"Margen Bruto Est.",v:fmtCOP(mg),c:mg>0?C.accent:C.red}].map(r=>(<div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+C.border}}><span style={{color:C.textDim,fontSize:12}}>{r.l}</span><span style={{color:r.c,fontWeight:700,fontSize:14}}>{r.v}</span></div>))}</div><div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Lotes Recientes</div>{lotes.slice(0,4).map(l=>(<div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+C.border}}><div><div style={{color:C.navy,fontWeight:600,fontSize:12,fontFamily:"monospace"}}>{l.codigo}</div><div style={{color:C.textDim,fontSize:11}}>{l.fecha_recibo}</div></div><Bdg label={l.estado} col={ECOL[l.estado]} bg={EBG[l.estado]}/></div>))}</div></div>
    </div>
  </div>);
}

function RecepcionTab({lotes,setLotes}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankRows=()=>[{finca:FINCAS[0],variedad:VARIEDADES[0],kg:"",flote:"",kg_proceso:"",valor_kg:""}];
  const blankForm=()=>({fecha_proceso:today(),tipo:TIPOS[0],producto:"SD",canecas:"",equipo_ferm:EQUIPOS_FERM[0],fecha_lavado:"",notas:""});
  const [rows,setRows]=useState(blankRows());
  const [form,setForm]=useState(blankForm());
  const addRow=()=>setRows(p=>[...p,{finca:FINCAS[0],variedad:VARIEDADES[0],kg:"",flote:"",kg_proceso:"",valor_kg:""}]);
  const rmRow=i=>setRows(p=>p.filter((_,j)=>j!==i));
  const setRow=(i,k,v)=>setRows(p=>p.map((r,j)=>j===i?{...r,[k]:v}:r));
  const genCod=()=>{const a=ABREV[form.tipo]||"OTR";const[y,m,d]=form.fecha_proceso.split("-");return a+"-"+form.producto+"-"+d+m+y;};
  const tkr=rows.reduce((s,r)=>s+(+r.kg||0),0);const tco=rows.reduce((s,r)=>s+(+r.kg||0)*(+r.valor_kg||0),0);
  const semanaAuto=semanaISO(form.fecha_proceso);
  const mesAuto=mesDe(form.fecha_proceso);
  const abrirNuevo=()=>{setEditId(null);setForm(blankForm());setRows(blankRows());setModal(true);};
  const abrirEditar=(l)=>{setEditId(l.id);setForm({fecha_proceso:l.fecha_proceso,tipo:l.tipo,producto:l.producto,canecas:l.canecas||"",equipo_ferm:l.equipo_ferm||EQUIPOS_FERM[0],fecha_lavado:l.fecha_lavado||"",notas:l.notas||""});setRows(l.cereza.map(c=>({finca:c.finca,variedad:c.variedad,kg:c.kg,flote:c.flote,kg_proceso:c.kg_proceso,valor_kg:c.valor_kg})));setModal(true);};
  const cerrarModal=()=>{setModal(false);setEditId(null);};
  const reg=()=>{
    const v=rows.filter(r=>r.kg&&r.valor_kg);if(!v.length)return;
    const cerezaRows=v.map(r=>({finca:r.finca,variedad:r.variedad,kg:+r.kg,flote:+(r.flote||0),kg_proceso:+(r.kg_proceso||r.kg),valor_kg:+r.valor_kg}));
    if(editId){
      setLotes(p=>p.map(l=>l.id===editId?{...l,fecha_recibo:form.fecha_proceso,fecha_proceso:form.fecha_proceso,semana:semanaAuto,mes:mesAuto,tipo:form.tipo,producto:form.producto,fecha_lavado:form.fecha_lavado||null,equipo_ferm:form.equipo_ferm,canecas:+(form.canecas||0),notas:form.notas,cereza:cerezaRows}:l));
    }else{
      setLotes(p=>[{id:genId(),fecha_recibo:form.fecha_proceso,fecha_proceso:form.fecha_proceso,semana:semanaAuto,mes:mesAuto,tipo:form.tipo,producto:form.producto,codigo:genCod(),estado:"Recepcion",fecha_lavado:form.fecha_lavado||null,fecha_fin_secado:null,humedad:"",kg_producto:0,bultos:0,equipo_ferm:form.equipo_ferm,equipo_secado:"",insumos:{jugo:0,panela:0,harina:0,levadura:0,vr_jugo:0,vr_panela:0,vr_harina:0,vr_levadura:0},conversion:0,canecas:+(form.canecas||0),notas:form.notas,cereza:cerezaRows,trilla:null,salidas_bodega:[]},...p]);
    }
    cerrarModal();setRows(blankRows());
  };
  const editLote=editId?lotes.find(l=>l.id===editId):null;
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACION 01</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Recepcion de Cereza</div></div><button style={S.btn} onClick={abrirNuevo}>+ Nuevo Lote</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}><KPI label="Total Lotes" value={lotes.length} col={C.teal}/><KPI label="kg Cereza" value={fmt(lotes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0))+" kg"} col={C.accent}/><KPI label="Valor Total" value={fmtCOP(lotes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0))} col={C.gold}/><KPI label="Fincas" value={[...new Set(lotes.flatMap(l=>l.cereza.map(c=>c.finca)))].length} col={C.green}/></div>
    <div style={S.card}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr>{["Codigo","Fecha","Fincas","kg Cereza","Valor COP","Equipo Ferm.","Proceso","Estado",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{lotes.map(l=>{const kg=l.cereza.reduce((a,c)=>a+c.kg,0);const cop=l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0);const fi=[...new Set(l.cereza.map(c=>c.finca))];return(<tr key={l.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</td><td style={{...S.td,color:C.textDim}}>{l.fecha_recibo}</td><td style={S.td}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td><td style={{...S.td,fontWeight:600,color:C.navy}}>{fmt(kg)}</td><td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(cop)}</td><td style={S.td}><Bdg label={l.equipo_ferm||"-"} col={C.purple} bg={C.purpleBg}/></td><td style={S.td}>{l.tipo} / {l.producto}</td><td style={S.td}><Bdg label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditar(l)}>Editar</button></td></tr>);})}</tbody></table></div></div>
    {modal&&(<Modal title={editId?"Editar Lote — "+(editLote?.codigo||""):"Nuevo Lote"} onClose={cerrarModal} wide>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha Proceso" half><input style={S.input} type="date" value={form.fecha_proceso} onChange={e=>setForm(p=>({...p,fecha_proceso:e.target.value}))}/></Fld>
        <Fld label="Semana (auto)" third><input style={{...S.input,background:C.panel2,color:C.textDim}} value={semanaAuto} readOnly/></Fld>
        <Fld label="Mes (auto)" third><input style={{...S.input,background:C.panel2,color:C.textDim,textTransform:"capitalize"}} value={mesAuto} readOnly/></Fld>
        <Fld label="Canecas" third><input style={S.input} type="number" step="0.1" value={form.canecas} onChange={e=>setForm(p=>({...p,canecas:e.target.value}))}/></Fld>
        <Fld label="Tipo Proceso" half><select style={S.select} value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>{TIPOS.map(t=>(<option key={t}>{t}</option>))}</select></Fld>
        <Fld label="Producto" half><input style={S.input} value={form.producto} onChange={e=>setForm(p=>({...p,producto:e.target.value}))}/></Fld>
        <Fld label="Equipo Fermentacion" half><select style={S.select} value={form.equipo_ferm} onChange={e=>setForm(p=>({...p,equipo_ferm:e.target.value}))}>{EQUIPOS_FERM.map(eq=>(<option key={eq}>{eq}</option>))}</select></Fld>
        <Fld label="Fecha Lavado" half><input style={S.input} type="date" value={form.fecha_lavado} onChange={e=>setForm(p=>({...p,fecha_lavado:e.target.value}))}/></Fld>
      </div>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Cereza por Finca</div>
      <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,overflowX:"auto",border:"1px solid "+C.border}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}><thead><tr>{["Finca","Variedad","kg Cereza","Flote","kg Proceso","Valor/kg","Subtotal",""].map(h=>(<th key={h} style={{...S.th,fontSize:10,padding:"6px 8px"}}>{h}</th>))}</tr></thead>
        <tbody>{rows.map((r,i)=>(<tr key={i}><td style={{padding:"4px"}}><select style={{...S.select,padding:"6px 8px",fontSize:12}} value={FINCAS.includes(r.finca)?r.finca:"Otra"} onChange={e=>setRow(i,"finca",e.target.value==="Otra"?"":e.target.value)}>{FINCAS.map(f=>(<option key={f}>{f}</option>))}<option value="Otra">Otra...</option></select>{!FINCAS.includes(r.finca)&&<input style={{...S.input,padding:"6px 8px",fontSize:12,marginTop:4}} placeholder="Nombre de la finca" value={r.finca} onChange={e=>setRow(i,"finca",e.target.value)}/>}</td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} value={r.variedad} onChange={e=>setRow(i,"variedad",e.target.value)} list="vl"/><datalist id="vl">{VARIEDADES.map(v=>(<option key={v} value={v}/>))}</datalist></td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.kg} onChange={e=>setRow(i,"kg",e.target.value)}/></td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.flote} onChange={e=>setRow(i,"flote",e.target.value)}/></td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.kg_proceso} placeholder={r.kg} onChange={e=>setRow(i,"kg_proceso",e.target.value)}/></td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.valor_kg} placeholder="6000" onChange={e=>setRow(i,"valor_kg",e.target.value)}/></td><td style={{padding:"4px 8px",color:C.gold,fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>{fmtCOP((+r.kg||0)*(+r.valor_kg||0))}</td><td style={{padding:"4px"}}>{rows.length>1&&(<button style={{...S.btnG,padding:"5px 8px"}} onClick={()=>rmRow(i)}>x</button>)}</td></tr>))}</tbody></table>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,padding:"10px 8px",background:C.accentBg,borderRadius:6}}><button style={S.btnG} onClick={addRow}>+ Agregar Finca</button><div><span style={{color:C.textDim,fontSize:12}}>Total: </span><span style={{color:C.navy,fontWeight:700}}>{fmt(tkr)} kg</span><span style={{color:C.textDim,fontSize:12,margin:"0 8px"}}>|</span><span style={{color:C.gold,fontWeight:700,fontSize:14}}>{fmtCOP(tco)}</span></div></div>
      </div>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14}}><span style={{color:C.textDim,fontSize:12}}>Codigo: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:14}}>{editId?(editLote?.codigo||""):genCod()}</span>{editId&&<span style={{color:C.textFaint,fontSize:11,marginLeft:8}}>(no cambia al editar)</span>}</div>
      <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Fld>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={cerrarModal}>Cancelar</button><button style={S.btn} onClick={reg}>{editId?"Guardar Cambios":"Registrar Lote"}</button></div>
    </Modal>)}
  </div>);
}

function Procesamiento({lotes,setLotes,costos}){
  const [tab,setTab]=useState("recepcion");
  const [selP,setSelP]=useState(null);
  const [formP,setFormP]=useState({canecas:"",jugo:"",panela:"",harina:"",levadura:"",vr_jugo:"",vr_panela:"",vr_harina:"",vr_levadura:"",notas:""});
  const dispP=lotes.filter(l=>l.estado==="Recepcion");
  const tiP=(+formP.jugo||0)*(+formP.vr_jugo||0)+(+formP.panela||0)*(+formP.vr_panela||0)+(+formP.harina||0)*(+formP.vr_harina||0)+(+formP.levadura||0)*(+formP.vr_levadura||0);
  const avanzar=()=>{if(!selP)return;setLotes(p=>p.map(l=>l.id===selP.id?{...l,estado:"Proceso",canecas:+formP.canecas||l.canecas,insumos:{jugo:+formP.jugo,panela:+formP.panela,harina:+formP.harina,levadura:+formP.levadura,vr_jugo:+formP.vr_jugo,vr_panela:+formP.vr_panela,vr_harina:+formP.vr_harina,vr_levadura:+formP.vr_levadura},notas:formP.notas}:l));setSelP(null);};

  const [selS,setSelS]=useState(null);
  const [formS,setFormS]=useState({fecha_fin:"",kg_producto:"",bultos:"",humedad:"",equipo_secado:EQUIPOS_SECADO[0],notas:""});
  const enS=lotes.filter(l=>l.estado==="Secado");
  const cerrar=()=>{
    if(!selS)return;
    const kgC=selS.cereza.reduce((a,c)=>a+c.kg,0);
    const conv=+(kgC/(+formS.kg_producto||1)).toFixed(2);
    const nota="Lote "+selS.codigo+" terminado el "+(formS.fecha_fin||today())+": "+fmt(+formS.kg_producto)+" kg de pergamino (conversion "+conv+":1), humedad "+formS.humedad+"%, "+fmt(+formS.bultos)+" bultos. Pasa a Bodega Milan.";
    setLotes(p=>p.map(l=>l.id===selS.id?{...l,fecha_fin_secado:formS.fecha_fin||null,kg_producto:+formS.kg_producto,bultos:+formS.bultos,humedad:formS.humedad,equipo_secado:formS.equipo_secado,conversion:conv,notas:formS.notas,nota_terminado:nota,estado:"Bodega"}:l));
    setSelS(null);
  };
  const cl=selS?calcCosto({...selS,kg_producto:+formS.kg_producto||selS.kg_producto},costos,lotes):null;

  const historico=lotes.filter(l=>l.nota_terminado).sort((a,b)=>(b.fecha_fin_secado||"").localeCompare(a.fecha_fin_secado||""));
  const abrirEditarHistorico=(l)=>{setSelS(l);setFormS({fecha_fin:l.fecha_fin_secado||"",kg_producto:l.kg_producto||"",bultos:l.bultos||"",humedad:l.humedad||"",equipo_secado:l.equipo_secado||EQUIPOS_SECADO[0],notas:l.notas||""});setTab("secado");};

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACION 01-03</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Procesamiento - Recepcion, Fermentacion y Secado</div></div>
    <div style={{display:"flex",gap:8,marginBottom:20,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["recepcion","Recepcion"],["proceso","En Proceso"],["secado","En Secado"],["historico","Historico"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="recepcion"&&<RecepcionTab lotes={lotes} setLotes={setLotes}/>}

    {tab==="proceso"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:16}}>
      <div><div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>Lotes para Procesar</div>{dispP.length===0&&<div style={{color:C.textFaint,fontSize:13}}>Sin lotes.</div>}{dispP.map(l=>{const kg=l.cereza.reduce((a,c)=>a+c.kg,0);return(<div key={l.id} onClick={()=>setSelP(l)} style={{...S.card2,marginBottom:8,cursor:"pointer",borderLeft:"3px solid "+(selP?.id===l.id?C.orange:C.border)}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{l.codigo}</span><span style={{color:C.textDim,fontSize:11}}>{l.fecha_recibo}</span></div><div style={{color:C.orange,fontSize:12,marginBottom:6}}>{l.tipo} - {l.producto}</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{[...new Set(l.cereza.map(c=>c.finca))].map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}<Bdg label={l.equipo_ferm} col={C.purple} bg={C.purpleBg}/><Bdg label={fmt(kg)+" kg"} col={C.gold} bg={C.goldBg}/></div></div>);})}</div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>En Proceso Activo</div>{lotes.filter(l=>l.estado==="Proceso").map(l=>(<div key={l.id} style={{...S.card2,marginBottom:8,borderLeft:"3px solid "+C.orange}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{l.codigo}</span><Bdg label="En Proceso" col={C.orange} bg={C.orangeBg}/></div><div style={{color:C.textDim,fontSize:11,marginBottom:8}}>{l.tipo} - {l.canecas} canecas - {l.equipo_ferm}</div><div style={{display:"flex",gap:6}}><button style={{...S.btn,background:C.orange,flex:1,fontSize:12}} onClick={()=>setLotes(p=>p.map(x=>x.id===l.id?{...x,estado:"Secado"}:x))}>Mover a Secado</button><button style={{...S.btnG,fontSize:12}} onClick={()=>{setSelP(l);setFormP({canecas:l.canecas||"",jugo:l.insumos?.jugo||"",panela:l.insumos?.panela||"",harina:l.insumos?.harina||"",levadura:l.insumos?.levadura||"",vr_jugo:l.insumos?.vr_jugo||"",vr_panela:l.insumos?.vr_panela||"",vr_harina:l.insumos?.vr_harina||"",vr_levadura:l.insumos?.vr_levadura||"",notas:l.notas||""});}}>Editar</button></div></div>))}</div></div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registrar Proceso e Insumos</div>
        {!selP?(<div style={{color:C.textFaint,fontSize:13,padding:20}}>Selecciona un lote</div>):(
          <><div style={{background:C.orangeBg,border:"1px solid "+C.orange+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}><div style={{color:C.orange,fontWeight:700}}>{selP.codigo}</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>{selP.tipo} | {fmt(selP.cereza.reduce((a,c)=>a+c.kg,0))} kg | {selP.equipo_ferm}</div></div>
          <Fld label="N Canecas"><input style={S.input} type="number" step="0.1" value={formP.canecas} onChange={e=>setFormP(p=>({...p,canecas:e.target.value}))}/></Fld>
          <div style={{background:C.panel2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px",marginBottom:14}}><div style={{fontWeight:600,fontSize:12,color:C.navy,marginBottom:12}}>Insumos de Fermentacion</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Insumo","Cantidad","Valor Unit. COP","Total COP"].map(h=>(<th key={h} style={{...S.th,fontSize:10,padding:"6px 10px"}}>{h}</th>))}</tr></thead>
            <tbody>{[{k:"jugo",kv:"vr_jugo",l:"Jugo"},{k:"panela",kv:"vr_panela",l:"Panela"},{k:"harina",kv:"vr_harina",l:"Harina"},{k:"levadura",kv:"vr_levadura",l:"Levadura"}].map(ins=>(<tr key={ins.k}><td style={{...S.td,fontWeight:600,color:C.navy}}>{ins.l}</td><td style={S.td}><input style={{...S.input,padding:"6px 10px",fontSize:12}} type="number" step="0.01" placeholder="0" value={formP[ins.k]} onChange={e=>setFormP(p=>({...p,[ins.k]:e.target.value}))}/></td><td style={S.td}><input style={{...S.input,padding:"6px 10px",fontSize:12}} type="number" placeholder="0" value={formP[ins.kv]} onChange={e=>setFormP(p=>({...p,[ins.kv]:e.target.value}))}/></td><td style={{...S.td,color:C.gold,fontWeight:700,whiteSpace:"nowrap"}}>{fmtCOP((+formP[ins.k]||0)*(+formP[ins.kv]||0))}</td></tr>))}</tbody></table>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:10,padding:"8px 10px",background:C.goldBg,borderRadius:6}}><span style={{color:C.textDim,fontSize:12}}>Total Insumos: </span><span style={{color:C.gold,fontWeight:700,fontSize:14,marginLeft:8}}>{fmtCOP(tiP)}</span></div>
          </div>
          <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formP.notas} onChange={e=>setFormP(p=>({...p,notas:e.target.value}))}/></Fld>
          <button style={{...S.btn,background:C.orange,width:"100%"}} onClick={avanzar}>{selP.estado==="Proceso"?"Guardar Cambios":"Iniciar Proceso"}</button></>
        )}
      </div>
    </div>)}

    {tab==="secado"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1.3fr",gap:16}}>
      <div>{enS.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes en secado activo.</div>}
        {enS.map(l=>{const dias=Math.max(0,Math.round((Date.now()-new Date(l.fecha_proceso))/86400000));const p=Math.min(100,(dias/20)*100);return(<div key={l.id} style={{...S.card,cursor:"pointer",marginBottom:10,borderLeft:"3px solid "+(selS?.id===l.id?C.gold:C.border)}} onClick={()=>{setSelS(l);setFormS({fecha_fin:"",kg_producto:"",bultos:"",humedad:"",equipo_secado:l.equipo_secado||EQUIPOS_SECADO[0],notas:""});}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</span>{l.kg_producto>0?<Bdg label="Listo" col={C.green} bg={C.greenBg}/>:<Bdg label={dias+"d secando"} col={C.gold} bg={C.goldBg}/>}</div>
          <div style={{color:C.textDim,fontSize:12,marginBottom:6}}>{l.producto} - {[...new Set(l.cereza.map(c=>c.finca))].join(", ")}</div>
          {l.fecha_lavado&&<div style={{color:C.textFaint,fontSize:11,marginBottom:6}}>Recepcion - Lavado: {diasEntre(l.fecha_recibo,l.fecha_lavado)} dias</div>}
          {l.equipo_secado&&<div style={{marginBottom:6}}><Bdg label={l.equipo_secado} col={C.teal} bg={C.tealBg}/></div>}
          <div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:p>85?C.red:C.gold,width:p+"%",height:"100%",borderRadius:4}}/></div>
        </div>);})}
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registrar Salida de Secado</div>
        {!selS?(<div style={{color:C.textFaint,fontSize:13}}>Selecciona un lote</div>):(
          <><div style={{background:C.goldBg,border:"1px solid "+C.gold+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}><div style={{color:C.gold,fontWeight:700}}>{selS.codigo}</div><div style={{color:C.textDim,fontSize:12}}>Entrada: {fmt(selS.cereza.reduce((a,c)=>a+c.kg,0))} kg cereza | Reactor: {selS.equipo_ferm}</div>{selS.fecha_lavado&&<div style={{color:C.textDim,fontSize:12,marginTop:2}}>Recepcion - Lavado: {diasEntre(selS.fecha_recibo,selS.fecha_lavado)} dias</div>}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
            <Fld label="Fecha Fin Secado" half><input style={S.input} type="date" value={formS.fecha_fin} onChange={e=>setFormS(p=>({...p,fecha_fin:e.target.value}))}/>{formS.fecha_fin&&<div style={{color:C.accent,fontSize:11,marginTop:4}}>Recepcion - Secado: {diasEntre(selS.fecha_recibo,formS.fecha_fin)} dias</div>}</Fld>
            <Fld label="Equipo de Secado" half><select style={S.select} value={formS.equipo_secado} onChange={e=>setFormS(p=>({...p,equipo_secado:e.target.value}))}>{EQUIPOS_SECADO.map(eq=>(<option key={eq}>{eq}</option>))}</select></Fld>
            <Fld label="kg Producto Terminado" half><input style={S.input} type="number" value={formS.kg_producto} onChange={e=>setFormS(p=>({...p,kg_producto:e.target.value}))}/>{formS.kg_producto&&<div style={{color:C.accent,fontSize:11,marginTop:4}}>Conv: {(selS.cereza.reduce((a,c)=>a+c.kg,0)/(+formS.kg_producto)).toFixed(2)}:1</div>}</Fld>
            <Fld label="Humedad Final %" half><input style={S.input} type="number" step="0.1" value={formS.humedad} onChange={e=>setFormS(p=>({...p,humedad:e.target.value}))}/></Fld>
            <Fld label="N Bultos"><input style={S.input} type="number" value={formS.bultos} onChange={e=>setFormS(p=>({...p,bultos:e.target.value}))}/></Fld>
          </div>
          {cl&&formS.kg_producto&&(<div style={{background:C.panel2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px",marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:12,color:C.navy,marginBottom:12}}>ANALISIS DE COSTO DEL LOTE (Central de Beneficio)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[{l:"Total Cereza",v:fmtCOP(cl.totalCereza),c:C.navy},{l:"Total Insumos",v:fmtCOP(cl.totalIns),c:C.orange},{l:"a) Costo cereza/kg seco",v:fmtCOP(cl.a),c:C.red},{l:"b) Costo insumos/kg seco",v:fmtCOP(cl.b),c:C.orange},{l:"c) Costo proceso CB/kg",v:fmtCOP(cl.c),c:C.purple},{l:"Costos CB "+selS.mes,v:fmtCOP((costos||[]).filter(x=>x.centro==="Central de Beneficio"&&x.mes===selS.mes).reduce((s,x)=>s+x.valor,0)),c:C.textDim}].map(x=>(<div key={x.l} style={{background:C.panel,borderRadius:6,padding:"10px 12px",border:"1px solid "+C.border}}><div style={{color:C.textDim,fontSize:10,textTransform:"uppercase",marginBottom:3}}>{x.l}</div><div style={{color:x.c,fontWeight:700,fontSize:14}}>{x.v}</div></div>))}
            </div>
            <div style={{background:C.navy,borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600}}>a + b + c = Costo total / kg seco</span><span style={{color:C.white,fontWeight:800,fontSize:22}}>{fmtCOP(cl.total)}</span></div>
          </div>)}
          <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formS.notas} onChange={e=>setFormS(p=>({...p,notas:e.target.value}))}/></Fld>
          <button style={{...S.btn,background:C.gold,width:"100%"}} onClick={cerrar}>Cerrar Secado - Mover a Bodega</button></>
        )}
      </div>
    </div>)}

    {tab==="historico"&&(<div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Lotes Procesados</div>
      {historico.length===0&&<div style={{color:C.textFaint,fontSize:13}}>Aun no hay lotes terminados.</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:12}}>
        {historico.map(l=>{const clH=calcCosto(l,costos,lotes);const kgCereza=l.cereza.reduce((a,c)=>a+c.kg,0);const fincasL=[...new Set(l.cereza.map(c=>c.finca))];return(
          <div key={l.id} style={{...S.card,marginBottom:0,borderLeft:"3px solid "+C.gold}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{l.codigo}</span><Bdg label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></div>
            <div style={{color:C.textDim,fontSize:12,marginBottom:8,lineHeight:1.5}}>{l.nota_terminado}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{fincasL.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
              {[{l:"kg Cereza",v:fmt(kgCereza)+" kg",c:C.navy},{l:"Costo Total MP",v:clH?fmtCOP(clH.totalCereza):"-",c:C.red},{l:"Costo Total Insumos",v:clH?fmtCOP(clH.totalIns):"-",c:C.orange}].map(d=>(<div key={d.l} style={{background:C.panel2,borderRadius:4,padding:"6px 8px"}}><div style={{color:C.textDim,fontSize:9,textTransform:"uppercase",marginBottom:1}}>{d.l}</div><div style={{color:d.c,fontWeight:600,fontSize:12}}>{d.v}</div></div>))}
            </div>
            {clH&&(<div style={{background:C.goldBg,border:"1px solid "+C.gold+"30",borderRadius:6,padding:"8px 10px",marginBottom:8}}>
              <div style={{color:C.gold,fontWeight:700,fontSize:11,marginBottom:3}}>Costo Central de Beneficio / kg</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:11}}><span style={{color:C.textDim}}>MP: <b style={{color:C.navy}}>{fmtCOP(clH.a)}</b></span><span style={{color:C.textDim}}>Insumos: <b style={{color:C.navy}}>{fmtCOP(clH.b)}</b></span><span style={{color:C.textDim}}>CB: <b style={{color:C.navy}}>{fmtCOP(clH.c)}</b></span><span style={{color:C.textDim}}>Total: <b style={{color:C.gold,fontSize:13}}>{fmtCOP(clH.total)}</b></span></div>
            </div>)}
            <button style={S.btnG} onClick={()=>abrirEditarHistorico(l)}>Editar</button>
          </div>
        );})}
      </div>
    </div>)}
  </div>);
}

// FIX 1,2: Bodega con validacion stock negativo, valor salida y valor/kg
function Bodega({lotes,setLotes,costos,setLotesFino}){
  const [selLote,setSelLote]=useState(null);
  const [modalSalida,setModalSalida]=useState(false);
  const [formSalida,setFormSalida]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:""});
  const [errSalida,setErrSalida]=useState("");
  const [editSalidaId,setEditSalidaId]=useState(null);
  const abrirEditarSalida=(l,s)=>{setSelLote(l);setEditSalidaId(s.id);setFormSalida({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total});setErrSalida("");setModalSalida(true);};
  const [modalEditar,setModalEditar]=useState(false);
  const [formEditar,setFormEditar]=useState({kg_producto:"",bultos:"",humedad:"",fecha_fin_secado:"",equipo_secado:EQUIPOS_SECADO[0]});
  const [modalPre,setModalPre]=useState(false);
  const [formPre,setFormPre]=useState({fecha:today(),perfil_taza:"",peso_muestra:"",almendra_sana:"",granos_brocados:"",granos_inmaduros:"",inferiores:"",gr_merma:""});
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const lotesB=lotes.filter(l=>l.kg_producto>0);
  const mesesB=[...new Set(lotesB.map(l=>l.mes).filter(Boolean))].sort();
  const productosB=[...new Set(lotesB.map(l=>l.producto).filter(Boolean))].sort();
  const lotesBFiltrados=lotesB.filter(l=>{
    if(filtroMes&&l.mes!==filtroMes)return false;
    if(filtroProducto&&l.producto!==filtroProducto)return false;
    if(busqueda&&!l.codigo.toLowerCase().includes(busqueda.toLowerCase()))return false;
    return true;
  });
  const stockDisponible=(l)=>l.kg_producto-(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);

  const abrirEditar=(l)=>{setSelLote(l);setFormEditar({kg_producto:l.kg_producto||"",bultos:l.bultos||"",humedad:l.humedad||"",fecha_fin_secado:l.fecha_fin_secado||"",equipo_secado:l.equipo_secado||EQUIPOS_SECADO[0]});setModalEditar(true);};
  const guardarEdicion=()=>{
    if(!selLote)return;
    const kgC=selLote.cereza.reduce((a,c)=>a+c.kg,0);
    setLotes(p=>p.map(l=>l.id===selLote.id?{...l,kg_producto:+formEditar.kg_producto||0,bultos:+formEditar.bultos||0,humedad:formEditar.humedad,fecha_fin_secado:formEditar.fecha_fin_secado||null,equipo_secado:formEditar.equipo_secado,conversion:+(kgC/(+formEditar.kg_producto||1)).toFixed(2)}:l));
    setModalEditar(false);
  };

  const totalPasillaPre=(+formPre.granos_brocados||0)+(+formPre.granos_inmaduros||0)+(+formPre.inferiores||0);
  const factorPre=(+formPre.almendra_sana)>0?((+formPre.peso_muestra||0)/(+formPre.almendra_sana))*70:0;
  const pctMermaPre=(+formPre.peso_muestra)>0?((+formPre.gr_merma||0)/(+formPre.peso_muestra))*100:0;
  const sumaComponentesPre=(+formPre.almendra_sana||0)+(+formPre.granos_brocados||0)+(+formPre.granos_inmaduros||0)+(+formPre.inferiores||0)+(+formPre.gr_merma||0);
  const alertaPesosPre=(+formPre.peso_muestra)>0&&sumaComponentesPre>(+formPre.peso_muestra);
  const abrirPre=(l)=>{setSelLote(l);setFormPre(l.pretrilla?{fecha:l.pretrilla.fecha,perfil_taza:l.pretrilla.perfil_taza,peso_muestra:l.pretrilla.peso_muestra,almendra_sana:l.pretrilla.almendra_sana,granos_brocados:l.pretrilla.granos_brocados,granos_inmaduros:l.pretrilla.granos_inmaduros,inferiores:l.pretrilla.inferiores,gr_merma:l.pretrilla.gr_merma}:{fecha:today(),perfil_taza:"",peso_muestra:"",almendra_sana:"",granos_brocados:"",granos_inmaduros:"",inferiores:"",gr_merma:""});setModalPre(true);};
  const guardarPre=()=>{
    if(!selLote)return;
    setLotes(p=>p.map(l=>l.id===selLote.id?{...l,pretrilla:{fecha:formPre.fecha,perfil_taza:formPre.perfil_taza,peso_muestra:+formPre.peso_muestra||0,almendra_sana:+formPre.almendra_sana||0,granos_brocados:+formPre.granos_brocados||0,granos_inmaduros:+formPre.granos_inmaduros||0,inferiores:+formPre.inferiores||0,gr_merma:+formPre.gr_merma||0,total_pasilla:totalPasillaPre,factor_pretrilla:factorPre,pct_merma:pctMermaPre}}:l));
    setModalPre(false);
  };

  const regSalida=()=>{
    if(!selLote||!formSalida.peso_salida){setErrSalida("Ingresa el peso de salida.");return;}
    const peso=+formSalida.peso_salida;
    const stockBase=stockDisponible(selLote)+(editSalidaId?(selLote.salidas_bodega||[]).find(x=>x.id===editSalidaId)?.peso_salida||0:0);
    // FIX 1: Validar stock no negativo
    if(peso>stockBase){setErrSalida("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg). No se permite stock negativo.");return;}
    const vkg=+formSalida.valor_kg||0;
    // FIX 2: Registrar valor total y valor/kg
    const vtotal=vkg>0?peso*vkg:(+formSalida.valor_total||0);
    setLotes(p=>p.map(l=>{if(l.id!==selLote.id)return l;
      let sal;
      if(editSalidaId){sal=(l.salidas_bodega||[]).map(s=>s.id===editSalidaId?{...s,fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}:s);}
      else{sal=[...(l.salidas_bodega||[]),{id:genId(),fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}];}
      const stockNew=l.kg_producto-sal.reduce((s,x)=>s+x.peso_salida,0);
      return{...l,salidas_bodega:sal,estado:stockNew>0?"Bodega":"Finalizado"};}));
    if(formSalida.destino_key==="bodega_cf"){
      setLotesFino(p=>[{id:genId(),codigo:selLote?.codigo||("CF-"+dateToCode(today())),fecha:today(),mes:mesDe(today()),semana:semanaISO(today()),producto:selLote?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:vkg||0,notas:"Auto-transferido desde Bodega Milan",salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,trazabilidad:{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:selLote?.fecha_proceso||"",fecha_trilla:"",fecha_secado:selLote?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    if(formSalida.destino_key==="trilla_cf"){
      setLotesFino(p=>[{id:genId(),codigo:selLote?.codigo||("CF-"+dateToCode(today())),fecha:today(),mes:mesDe(today()),semana:semanaISO(today()),producto:selLote?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:vkg||0,notas:"Trasladado desde Bodega Milan a Trilladora CF",salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,trazabilidad:{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:selLote?.fecha_proceso||"",fecha_trilla:"",fecha_secado:selLote?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    setModalSalida(false);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:""});setErrSalida("");
  };

  const totalKgBodega=lotesB.reduce((s,l)=>s+stockDisponible(l),0);
  const totalValorBodega=lotesB.reduce((s,l)=>{const cl=calcCosto(l,costos,lotes);const stock=stockDisponible(l);return s+(stock*(cl?cl.total:0));},0);
  const totalSalidas=lotes.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,s),0);
  const totalValorSalidas=lotes.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),s),0);
  const totalATrilladora=lotesB.reduce((s,l)=>s+pesoATrilladora(l),0);
  const totalATrilladoraCF=lotesB.reduce((s,l)=>s+pesoATrilladoraCafeFino(l),0);
  const totalOtros=lotesB.reduce((s,l)=>s+pesoOtrosBodega(l),0);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.navy,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Bodega Milan - Inventario Cafe Seco</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Lotes en Bodega" value={lotesB.length} col={C.navy}/>
      <KPI label="Stock Total" value={fmt(totalKgBodega)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock" value={fmtCOP(totalValorBodega)} col={C.gold}/>
      <KPI label="kg a Trilladora" value={fmt(totalATrilladora)+" kg"} col={C.teal}/>
      <KPI label="kg a Trilladora CF" value={fmt(totalATrilladoraCF)+" kg"} col={C.purple}/>
      <KPI label="kg Otros Destinos" value={fmt(totalOtros)+" kg"} col={C.orange}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidas)} col={C.green}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesB.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosB.map(p=>(<option key={p}>{p}</option>))}</select>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Inventario por Lote</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:950}}><thead><tr>{["Codigo","Producto","Peso Cereza","Reactor","Silo","Fec. Secado","Humedad","Entrada kg","Salidas kg","Stock kg","Costo/kg","Valor Stock","Pre-Trilla","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{lotesBFiltrados.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=l.kg_producto-sal;const cl=calcCosto(l,costos,lotes);const costoKg=cl?cl.total:0;const fi=[...new Set(l.cereza.map(c=>c.finca))];const kgCereza=l.cereza.reduce((a,c)=>a+c.kg,0);return(<tr key={l.id}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</td>
        <td style={S.td}><div style={{fontWeight:600}}>{l.producto}</div><div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{fmt(kgCereza)} kg</td>
        {/* FIX 3: Mostrar reactor y silo */}
        <td style={S.td}><Bdg label={l.equipo_ferm||"-"} col={C.purple} bg={C.purpleBg}/></td>
        <td style={S.td}><Bdg label={l.equipo_secado||"-"} col={C.teal} bg={C.tealBg}/></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{l.fecha_fin_secado||"-"}</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{l.humedad?l.humedad+"%":"-"}</td>
        <td style={{...S.td,fontWeight:600}}>{fmt(l.kg_producto)}</td>
        <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(sal)}</td>
        <td style={S.td}><div style={{color:stock>100?C.green:stock>0?C.gold:C.red,fontWeight:700,fontSize:14}}>{fmt(stock)} kg</div><div style={{background:C.bg,borderRadius:3,height:6,marginTop:4,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:stock>100?C.green:stock>0?C.gold:C.red,width:Math.min(100,l.kg_producto>0?(stock/l.kg_producto)*100:0)+"%",height:"100%",borderRadius:3}}/></div></td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(costoKg)}</td>
        <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(stock*costoKg)}</td>
        <td style={S.td}>{l.pretrilla?(<div><div style={{color:C.purple,fontWeight:700,fontSize:12}}>FP: {fmt(l.pretrilla.factor_pretrilla,1)}</div><div style={{color:C.red,fontSize:11}}>Merma: {fmt(l.pretrilla.pct_merma,1)}%</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirPre(l)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirPre(l)}>+ Pre-Trilla</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>{if(stock>0){setSelLote(l);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:cl?Math.round(cl.total):"",valor_total:""});setErrSalida("");setModalSalida(true);}}}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(l)}>Editar</button></div></td>
      </tr>);})}
      </tbody></table></div></div></>)}
    {tab==="historico"&&(lotes.some(l=>(l.salidas_bodega||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote","Fecha","Factura","Remision","Cliente","Peso Salida","Valor/kg","Valor Total",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{lotes.flatMap(l=>(l.salidas_bodega||[]).map(s=>({...s,codigo:l.codigo,loteRef:l}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{s.fecha}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalida(s.loteRef,s)}>Editar</button></td></tr>))}</tbody></table></div></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

    {modalSalida&&selLote&&(<Modal title={(editSalidaId?"Editar Salida - ":"Registrar Salida - ")+selLote.codigo} onClose={()=>{setModalSalida(false);setEditSalidaId(null);setErrSalida("");}}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selLote.codigo} - {selLote.producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockDisponible(selLote))} kg</b></div>
        <div style={{color:C.textDim,fontSize:11,marginTop:2}}>Reactor: {selLote.equipo_ferm} | Silo: {selLote.equipo_secado} | Humedad: {selLote.humedad}%</div>
      </div>
      {errSalida&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalida}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalida.fecha} onChange={e=>setFormSalida(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Peso de Salida (kg)" half>
          <input style={{...S.input,borderColor:errSalida?C.red:C.border2}} type="number" value={formSalida.peso_salida} onChange={e=>{setFormSalida(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalida.valor_kg||0)||""}));setErrSalida("");}}/>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Max: {fmt(stockDisponible(selLote))} kg</div>
        </Fld>
        {/* FIX 2: Valor/kg y valor total */}
        <Fld label="Valor por kg COP (auto desde Bodega)" half><input style={S.input} type="number" placeholder="0" value={formSalida.valor_kg} onChange={e=>setFormSalida(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalida.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total COP" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" placeholder="Calculado automatico" value={formSalida.valor_total} onChange={e=>setFormSalida(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalida.factura} placeholder="FAC-001" onChange={e=>setFormSalida(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalida.remision} placeholder="REM-001" onChange={e=>setFormSalida(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalida.cliente} destinoKey={formSalida.destino_key} onChange={(v,k)=>setFormSalida(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
      </div>
      {formSalida.destino_key==="trilla"&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Destino Trilla: el lote pasara automaticamente a la seccion Trilla</div>)}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalida(false);setEditSalidaId(null);setErrSalida("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalida}>{editSalidaId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}

    {modalEditar&&selLote&&(<Modal title={"Editar Lote - "+selLote.codigo} onClose={()=>setModalEditar(false)}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selLote.codigo} - {selLote.producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Cereza: {fmt(selLote.cereza.reduce((a,c)=>a+c.kg,0))} kg</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="kg Producto Terminado (correccion)" half><input style={S.input} type="number" value={formEditar.kg_producto} onChange={e=>setFormEditar(p=>({...p,kg_producto:e.target.value}))}/>{formEditar.kg_producto&&<div style={{color:C.accent,fontSize:11,marginTop:4}}>Conv: {(selLote.cereza.reduce((a,c)=>a+c.kg,0)/(+formEditar.kg_producto)).toFixed(2)}:1</div>}</Fld>
        <Fld label="N Bultos" half><input style={S.input} type="number" value={formEditar.bultos} onChange={e=>setFormEditar(p=>({...p,bultos:e.target.value}))}/></Fld>
        <Fld label="Humedad Final %" half><input style={S.input} type="number" step="0.1" value={formEditar.humedad} onChange={e=>setFormEditar(p=>({...p,humedad:e.target.value}))}/></Fld>
        <Fld label="Equipo de Secado" half><select style={S.select} value={formEditar.equipo_secado} onChange={e=>setFormEditar(p=>({...p,equipo_secado:e.target.value}))}>{EQUIPOS_SECADO.map(eq=>(<option key={eq}>{eq}</option>))}</select></Fld>
        <Fld label="Fecha Fin Secado"><input style={S.input} type="date" value={formEditar.fecha_fin_secado} onChange={e=>setFormEditar(p=>({...p,fecha_fin_secado:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModalEditar(false)}>Cancelar</button><button style={S.btn} onClick={guardarEdicion}>Guardar Cambios</button></div>
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

// FIX 5,6,7: Trilla con campos adicionales, % merma, factor rendimiento, costo trilladora
function Trilla({lotes,setLotes,costos}){
  const blankFormTrilla=()=>({excelso:"",pasilla_elec:"",catadora_dens:"",inferiores:"",cisco:"",humedad:"",norma:NORMAS[0],fecha_trilla:"",codigo_corte:"",con_proceso:"Con Proceso",obs:""});
  const [selArr,setSelArr]=useState([]);
  const [isEditing,setIsEditing]=useState(false);
  const [form,setForm]=useState(blankFormTrilla());
  const [errTrilla,setErrTrilla]=useState("");
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
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
    limpiarSeleccion();
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

    {/* FIX 7: Panel costo trilladora por mes */}
    <div style={{...S.card,marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>Costo Trilladora por Mes</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr>{["Mes","Costos Trilladora","kg Excelso Producido","Costo Trilladora / kg Excelso"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{MESES.filter(m=>{const cb=(costos||[]).filter(c=>c.centro==="Trilladora"&&c.mes===m).reduce((s,c)=>s+c.valor,0);return cb>0;}).map(m=>{
        const {costosTri:ct,kgEx:ke,costoTriKg:ck}=calcCostoTri(m,costos,lotes);
        return(<tr key={m}><td style={{...S.td,textTransform:"capitalize",fontWeight:600}}>{m}</td><td style={{...S.td,color:C.orange,fontWeight:600}}>{fmtCOP(ct)}</td><td style={{...S.td,color:C.green,fontWeight:600}}>{fmt(ke)} kg</td><td style={{...S.td,color:C.purple,fontWeight:700,fontSize:14}}>{ke>0?fmtCOP(Math.round(ck)):"Sin excelso registrado"}</td></tr>);
      })}</tbody></table></div>
      {(costos||[]).filter(c=>c.centro==="Trilladora").length===0&&<div style={{color:C.textFaint,fontSize:12,padding:8}}>Registra costos de Trilladora en el modulo de Costos para ver este calculo.</div>}
    </div>

    <div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesD.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosD.map(p=>(<option key={p}>{p}</option>))}</select>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16}}>
      <div>{dispFiltrados.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes disponibles. Los lotes con salida a Trilladora Milan apareceran aqui automaticamente.</div>}
        <div style={{color:C.textFaint,fontSize:11,marginBottom:8}}>Selecciona de 1 a {MAX_LOTES_TRILLA} lotes para trillar juntos (mezcla).</div>
        {dispFiltrados.map(l=>{const salT=(l.salidas_bodega||[]).filter(s=>s.destino_key==="trilla");const pesoTri=salT.reduce((s,x)=>s+x.peso_salida,0);const isSel=selArr.some(x=>x.id===l.id);return(<div key={l.id} onClick={()=>toggleSel(l)} style={{...S.card,cursor:isEditing?"default":"pointer",opacity:isEditing&&!isSel?0.5:1,marginBottom:10,borderLeft:"3px solid "+(isSel?C.green:C.border),borderColor:isSel?C.green:C.border}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</span><span style={{color:C.gold,fontSize:12,fontWeight:600}}>{l.humedad?l.humedad+"%":"?"}</span></div>
          <div style={{color:C.textDim,fontSize:12,marginBottom:4}}>{l.producto} - {[...new Set(l.cereza.map(c=>c.finca))].join(", ")}</div>
          <div style={{color:C.green,fontSize:12,fontWeight:600}}>{fmt(l.kg_producto)} kg{pesoTri>0?" | Enviado: "+fmt(pesoTri)+" kg":""}</div>
          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}><Bdg label={l.producto} col={C.navy} bg={C.accentBg}/>{l.equipo_ferm&&<Bdg label={l.equipo_ferm} col={C.purple} bg={C.purpleBg}/>}{l.equipo_secado&&<Bdg label={l.equipo_secado} col={C.teal} bg={C.tealBg}/>}{l.pretrilla?.factor_pretrilla?<Bdg label={"FP: "+fmt(l.pretrilla.factor_pretrilla,1)} col={C.gold} bg={C.goldBg}/>:null}</div>
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
    {gruposHistorico.length>0&&(<div style={{...S.card,marginTop:4}}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Historico Trilla</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}><thead><tr>{["Fecha Trilla","Corte","Lotes","Producto","Cod. Trillado","Proceso","Perg. kg (a trilladora)","Excelso kg","Merma kg","P.Elec","Cat.Dens","Inf.","Cisco","% Merma","FI","Dif. vs FP","Rend.","Costo /kg Ex",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
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
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.fecha_trilla||"—"}</td>
        <td style={S.td}><Bdg label={t.codigo_corte||"—"} col={C.accent}/></td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{[...new Set(grupo.map(x=>x.producto))].map(p=>(<Bdg key={p} label={p} col={C.navy} bg={C.accentBg}/>))}</div></td>
        <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:C.green,fontWeight:600}}>{t.nombre_trillado||"—"}</td>
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
    </tbody></table></div></div>)}
  </div>);
}

/* FIX 1: Bodega Trilladora - nueva seccion */
function BodegaTrilladora({lotes,setLotes,costos,setLotesFino}){
  const [selLoteT,setSelLoteT]=useState(null);
  const [modalSalidaT,setModalSalidaT]=useState(false);
  const [formSalidaT,setFormSalidaT]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",observaciones:""});
  const [errSalidaT,setErrSalidaT]=useState("");
  const [editSalidaTId,setEditSalidaTId]=useState(null);
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const trilledLotes=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const mesesT=[...new Set(trilledLotes.map(l=>l.mes).filter(Boolean))].sort();
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
    if(filtroMes&&!grupo.some(l=>l.mes===filtroMes))return false;
    if(filtroProducto&&!grupo.some(l=>l.producto===filtroProducto))return false;
    if(busqueda&&!grupo.some(l=>l.codigo.toLowerCase().includes(busqueda.toLowerCase())))return false;
    return true;
  });
  const costoKgExDe=(l)=>{if(l.trilla?.costo_kg_excelso>0)return l.trilla.costo_kg_excelso;const cl=calcCosto(l,costos,lotes);const t=l.trilla;const D=calcCostoTri(l.mes,costos,lotes).costoTriKg;return cl&&t.kg_excelso>0?Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D):0;};
  const stockTrilladora=(l)=>(l.trilla?.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0);
  const totalExcelso=trilledLotes.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const totalValorSalidasT=trilledLotes.reduce((s,l)=>s+(l.salidas_trilladora||[]).reduce((a,b)=>a+(b.valor_total||0),0),0);
  const stockActual=trilledLotes.reduce((s,l)=>{const stock=stockTrilladora(l);const costoKg=costoKgExDe(l);return {kg:s.kg+stock,val:s.val+(costoKg*stock)};},{kg:0,val:0});

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
  const regSalidaT=()=>{
    if(!selLoteT||!formSalidaT.peso_salida){setErrSalidaT("Ingresa el peso de salida.");return;}
    const peso=+formSalidaT.peso_salida;
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
      setLotesFino(p=>[{id:genId(),codigo:selLoteT?.codigo||("CF-"+dateToCode(today())),fecha:today(),mes:mesDe(today()),semana:semanaISO(today()),producto:selLoteT?.producto||"",proveedor:"Bodega Trilladora",kg_producto:peso,costo_compra_kg:vkg||0,notas:"Auto-transferido desde Bodega Trilladora",salidas_bodega:[],trilla:null,salidas_trilladora:[],trazabilidad:{codigo_lote_origen:selLoteT?.codigo||"",fecha_proceso:selLoteT?.fecha_proceso||"",fecha_trilla:selLoteT?.trilla?.fecha_trilla||"",fecha_secado:selLoteT?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    setModalSalidaT(false);setEditSalidaTId(null);setErrSalidaT("");
  };

  return(<div>
    <div style={{marginBottom:22}}>
      <div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO</div>
      <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Bodega Trilladora - Excelso</div>
      <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Inventario de cafe excelso con costo total de produccion</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Lotes con Excelso" value={trilledLotes.length} col={C.navy}/>
      <KPI label="Excelso Total kg" value={fmt(totalExcelso)+" kg"} col={C.green}/>
      <KPI label="Stock Disponible kg" value={fmt(stockActual.kg)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock Disponible" value={fmtCOP(stockActual.val)} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidasT)} col={C.purple}/>
      <KPI label="Costo Prom/kg Ex" value={stockActual.kg>0?fmtCOP(Math.round(stockActual.val/stockActual.kg)):"—"} col={C.teal}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesT.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosT.map(p=>(<option key={p}>{p}</option>))}</select>
    </div>
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Inventario por Lote</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>
        {["Codigo Lote","Cod. Trillado","Fecha Trilla","Corte","Mes","Producto","Fincas","kg Excelso","Costo MP/kg","Costo Ins/kg","Costo CB/kg","Costo Trilladora/kg (D)","Costo Total/kg","Valor Total Lote","Salidas kg","Stock kg","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
      </tr></thead>
      <tbody>{gruposTFiltrados.map(grupo=>{
        const repr=grupo[0];
        const t=repr.trilla;
        const excelsoGrupo=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
        const pesoTotalGrupo=grupo.reduce((s,x)=>s+pesoATrilladora(x),0);
        const costoTotalGrupo=grupo.reduce((s,x)=>{const cl=calcCosto(x,costos,lotes);return s+(cl?cl.total*pesoATrilladora(x):0);},0);
        const waRate=(key)=>pesoTotalGrupo>0?grupo.reduce((s,x)=>{const cl=calcCosto(x,costos,lotes);return s+((cl?cl[key]:0)*pesoATrilladora(x));},0)/pesoTotalGrupo:null;
        const aProm=waRate('a'),bProm=waRate('b'),cProm=waRate('c');
        const D=calcCostoTri(repr.mes,costos,lotes).costoTriKg;
        const costoKgEx=excelsoGrupo>0?Math.round(costoTotalGrupo/excelsoGrupo)+Math.round(D):0;
        const fi=[...new Set(grupo.flatMap(x=>x.cereza.map(c=>c.finca)))];
        const salGrupo=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
        const stock=excelsoGrupo-salGrupo;
        return(<tr key={repr.id}>
          <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.accent} bg={C.accentBg}/>))}</div></td>
          <td style={{...S.td,color:C.green,fontWeight:600,fontFamily:"monospace",fontSize:11}}>{t.nombre_trillado||"—"}</td>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.fecha_trilla||"—"}</td>
          <td style={S.td}><Bdg label={t.codigo_corte||"—"} col={C.accent}/></td>
          <td style={{...S.td,textTransform:"capitalize"}}>{repr.mes}</td>
          <td style={S.td}><Bdg label={repr.producto} col={C.teal} bg={C.tealBg}/></td>
          <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td>
          <td style={{...S.td,fontWeight:700,color:C.green,fontSize:15}}>{fmt(excelsoGrupo)} kg</td>
          <td style={{...S.td,color:C.orange}}>{aProm!=null?fmtCOP(Math.round(aProm)):"—"}</td>
          <td style={{...S.td,color:C.red}}>{bProm!=null?fmtCOP(Math.round(bProm)):"—"}</td>
          <td style={{...S.td,color:C.purple}}>{cProm!=null?fmtCOP(Math.round(cProm)):"—"}</td>
          <td style={{...S.td,color:C.teal,fontWeight:600}}>{D?fmtCOP(Math.round(D)):"—"}</td>
          <td style={{...S.td,color:C.gold,fontWeight:700,fontSize:13}}>{fmtCOP(costoKgEx)}</td>
          <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(costoKgEx*excelsoGrupo)}</td>
          <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(salGrupo)}</td>
          <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
          <td style={S.td}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaT(repr)}>+ Salida</button></td>
        </tr>);
      })}</tbody></table></div>
    </div></>)}
    {tab==="historico"&&(trilledLotes.some(l=>(l.salidas_trilladora||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas - Trilladora</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{trilledLotes.flatMap(l=>(l.salidas_trilladora||[]).map(s=>({...s,codigo:l.codigo,loteRef:l}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{s.fecha}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaT(s.loteRef,s)}>Editar</button></td></tr>))}</tbody></table></div></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

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

// Pool de excelso disponible para Blend: salidas de Bodega Trilladora con destino "Blend"
const poolBlend=(lotes,costos)=>{
  const pool=[];
  // A) excelso ya transferido formalmente a Blend (salida con destino_key "blend")
  lotes.forEach(l=>(l.salidas_trilladora||[]).forEach(s=>{
    if(s.destino_key==="blend"){
      pool.push({key:"sal:"+s.id,salidaId:s.id,reprId:l.id,codigo:l.codigo,producto:l.producto,kg_total:s.peso_salida,valor_kg:s.valor_kg,fecha:s.fecha,esStockDirecto:false});
    }
  }));
  // B) excelso que sigue como stock en Bodega Trilladora (sin salida formal todavia)
  const vistos=new Set();
  lotes.filter(l=>l.trilla?.kg_excelso>0).forEach(l=>{
    if(vistos.has(l.id))return;
    const grupo=[l,...lotes.filter(x=>(l.trilla.lotes_combinados||[]).includes(x.id))];
    grupo.forEach(x=>vistos.add(x.id));
    const excelsoTotal=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
    const salTotal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
    const stock=excelsoTotal-salTotal;
    if(stock>0){
      const costoTotalGrupo=grupo.reduce((s,x)=>{const cl=calcCosto(x,costos,lotes);return s+(cl?cl.total*pesoATrilladora(x):0);},0);
      const D=calcCostoTri(l.mes,costos,lotes).costoTriKg;
      const costoKgEx=excelsoTotal>0?Math.round(costoTotalGrupo/excelsoTotal)+Math.round(D):0;
      pool.push({key:"stock:"+l.id,salidaId:null,reprId:l.id,codigo:grupo.map(x=>x.codigo).join("-"),producto:l.producto,kg_total:stock,valor_kg:costoKgEx,fecha:l.trilla.fecha_trilla,esStockDirecto:true});
    }
  });
  return pool;
};

function Blend({lotes,setLotes,blends,setBlends,costos,setLotesFino}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [nombre,setNombre]=useState("");
  const [fecha,setFecha]=useState(today());
  const [productoComercial,setProductoComercial]=useState("");
  const [items,setItems]=useState([]);
  const [errBlendForm,setErrBlendForm]=useState("");
  const [modalSalidaB,setModalSalidaB]=useState(false);
  const [selBlend,setSelBlend]=useState(null);
  const [formSalidaB,setFormSalidaB]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",observaciones:""});
  const [errB,setErrB]=useState("");
  const [editSalidaBId,setEditSalidaBId]=useState(null);
  const [modalEmb,setModalEmb]=useState(false);
  const [formEmb,setFormEmb]=useState({fecha:today(),prueba_taza:"",norma:NORMAS[0],observaciones:""});
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");

  const stockBlend=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const poolAll=[
    ...poolBlend(lotes,costos).map(p=>({...p,tipo:"lote"})),
    ...blends.filter(b=>b.id!==editId&&stockBlend(b)>0).map(b=>({key:"blendstock:"+b.id,salidaId:null,reprId:b.id,codigo:b.codigo,producto:b.producto_comercial||b.nombre,kg_total:stockBlend(b),valor_kg:Math.round(b.costo_kg)||0,fecha:b.fecha,esStockDirecto:true,tipo:"blend"})),
  ];
  const kgUsadoDeKey=(key)=>blends.filter(b=>b.id!==editId).reduce((s,b)=>s+b.items.filter(it=>it.key===key).reduce((a,it)=>a+it.kg_usado,0),0);
  const pool=poolAll.map(p=>({...p,kg_disponible:p.kg_total-kgUsadoDeKey(p.key)})).filter(p=>p.kg_disponible>0||items.some(it=>it.key===p.key));
  const totalKgDisponiblePool=pool.reduce((s,p)=>s+Math.max(0,p.kg_disponible),0);

  const codigoBlend=(nombre&&fecha)?(nombre.trim().replace(/\s+/g,"")+"-"+dateToCode(fecha)):"";
  const kgTotalBlend=items.reduce((s,it)=>s+(+it.kg_usado||0),0);
  const valorTotalBlend=items.reduce((s,it)=>s+(+it.kg_usado||0)*(+it.valor_kg||0),0);
  const costoKgBlend=kgTotalBlend>0?valorTotalBlend/kgTotalBlend:0;

  const abrirNuevo=()=>{setEditId(null);setNombre("");setFecha(today());setProductoComercial("");setItems([]);setErrBlendForm("");setModal(true);};
  const abrirEditar=(b)=>{setEditId(b.id);setNombre(b.nombre);setFecha(b.fecha);setProductoComercial(b.producto_comercial||"");setItems(b.items.map(it=>({...it})));setErrBlendForm("");setModal(true);};
  const cerrarModal=()=>setModal(false);
  const addItem=(p)=>{if(items.some(it=>it.key===p.key))return;setItems(prev=>[...prev,{key:p.key,salidaId:p.salidaId,reprId:p.reprId,codigo:p.codigo,valor_kg:p.valor_kg,kg_usado:"",esStockDirecto:p.esStockDirecto,tipo:p.tipo||"lote"}]);};
  const setItemKg=(key,kg)=>setItems(prev=>prev.map(it=>it.key===key?{...it,kg_usado:kg}:it));
  const rmItem=(key)=>setItems(prev=>prev.filter(it=>it.key!==key));
  const guardar=()=>{
    const v=items.filter(it=>+it.kg_usado>0);
    if(!v.length||!nombre||!fecha)return;
    for(const it of v){
      const p=pool.find(x=>x.key===it.key);
      const maxKg=(p?.kg_disponible||0)+(+it.kg_usado||0);
      if(+it.kg_usado>maxKg){setErrBlendForm("ALERTA: el lote "+it.codigo+" usa "+fmt(+it.kg_usado)+" kg pero solo hay "+fmt(maxKg)+" kg disponibles.");return;}
    }
    setErrBlendForm("");
    const itemsFinal=v.map(it=>{
      const kgU=+it.kg_usado;
      const salidaId=it.salidaId||genId();
      return{...it,kg_usado:kgU,valor_total:kgU*(+it.valor_kg||0),salidaId,key:"sal:"+salidaId,esStockDirecto:false};
    });
    const itemsLote=itemsFinal.filter(it=>it.tipo!=="blend");
    const itemsBlendOrigen=itemsFinal.filter(it=>it.tipo==="blend");
    // materializar/sincronizar las salidas_trilladora generadas automaticamente desde stock directo de lotes
    if(itemsLote.length){
      setLotes(p=>p.map(l=>{
        const itemsDeEsteLote=itemsLote.filter(it=>it.reprId===l.id);
        if(!itemsDeEsteLote.length)return l;
        let sal=l.salidas_trilladora||[];
        itemsDeEsteLote.forEach(it=>{
          const existente=sal.find(s=>s.id===it.salidaId);
          if(existente){
            if(existente.auto_blend){sal=sal.map(s=>s.id===it.salidaId?{...s,peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total}:s);}
          }else{
            sal=[...sal,{id:it.salidaId,fecha:today(),factura:"",remision:"",cliente:"Blend",peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total,observaciones:"Generado automaticamente desde Blend "+(codigoBlend||nombre),auto_blend:true}];
          }
        });
        return{...l,salidas_trilladora:sal};
      }));
    }
    // materializar/sincronizar el consumo de excelso tomado del stock de OTROS blends
    if(itemsBlendOrigen.length){
      setBlends(p=>p.map(b=>{
        const itemsDeEsteBlend=itemsBlendOrigen.filter(it=>it.reprId===b.id);
        if(!itemsDeEsteBlend.length)return b;
        let sal=b.salidas||[];
        itemsDeEsteBlend.forEach(it=>{
          const existente=sal.find(s=>s.id===it.salidaId);
          if(existente){
            if(existente.auto_blend){sal=sal.map(s=>s.id===it.salidaId?{...s,peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total}:s);}
          }else{
            sal=[...sal,{id:it.salidaId,fecha:today(),factura:"",remision:"",cliente:"Blend "+(codigoBlend||nombre),peso_salida:it.kg_usado,valor_kg:it.valor_kg,valor_total:it.valor_total,observaciones:"Usado como insumo del blend "+(codigoBlend||nombre),auto_blend:true}];
          }
        });
        return{...b,salidas:sal};
      }));
    }
    const kgT=itemsFinal.reduce((s,it)=>s+it.kg_usado,0);
    const valT=itemsFinal.reduce((s,it)=>s+it.valor_total,0);
    if(editId){
      setBlends(p=>p.map(b=>b.id===editId?{...b,nombre,fecha,codigo:codigoBlend,producto_comercial:productoComercial,items:itemsFinal,kg_total:kgT,valor_total:valT,costo_kg:kgT>0?valT/kgT:0}:b));
    }else{
      setBlends(p=>[{id:genId(),nombre,fecha,codigo:codigoBlend,producto_comercial:productoComercial,items:itemsFinal,kg_total:kgT,valor_total:valT,costo_kg:kgT>0?valT/kgT:0,salidas:[]},...p]);
    }
    setModal(false);
  };

  const abrirSalidaB=(b)=>{setSelBlend(b);setEditSalidaBId(null);setFormSalidaB({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:Math.round(b.costo_kg)||"",valor_total:"",observaciones:""});setErrB("");setModalSalidaB(true);};
  const abrirEditarSalidaB=(b,s)=>{setSelBlend(b);setEditSalidaBId(s.id);setFormSalidaB({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total,observaciones:s.observaciones||""});setErrB("");setModalSalidaB(true);};
  const regSalidaB=()=>{
    if(!selBlend||!formSalidaB.peso_salida){setErrB("Ingresa el peso de salida.");return;}
    const peso=+formSalidaB.peso_salida;
    const stockBase=stockBlend(selBlend)+(editSalidaBId?(selBlend.salidas||[]).find(x=>x.id===editSalidaBId)?.peso_salida||0:0);
    if(peso>stockBase){setErrB("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaB.valor_kg||0;
    const vtotal=vkg>0?peso*vkg:(+formSalidaB.valor_total||0);
    setBlends(p=>p.map(b=>{
      if(b.id!==selBlend.id)return b;
      let sal;
      if(editSalidaBId){sal=(b.salidas||[]).map(s=>s.id===editSalidaBId?{...s,fecha:formSalidaB.fecha,factura:formSalidaB.factura,remision:formSalidaB.remision,cliente:formSalidaB.cliente,destino_key:formSalidaB.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaB.observaciones}:s);}
      else{sal=[...(b.salidas||[]),{id:genId(),fecha:formSalidaB.fecha,factura:formSalidaB.factura,remision:formSalidaB.remision,cliente:formSalidaB.cliente,destino_key:formSalidaB.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaB.observaciones}];}
      return{...b,salidas:sal};
    }));
    // Auto-transferencia a Bodega Café Fino cuando destino = "café fino" — conserva el codigo original (item 3) y trazabilidad (item 5)
    if(formSalidaB.destino_key==="bodega_cf"){
      setLotesFino(p=>[{id:genId(),codigo:selBlend?.codigo||("CF-BL-"+dateToCode(today())),fecha:today(),mes:mesDe(today()),semana:semanaISO(today()),producto:selBlend?.producto_comercial||selBlend?.nombre||"",proveedor:"Blend",kg_producto:peso,costo_compra_kg:vkg||0,notas:"Auto-transferido desde Blend",salidas_bodega:[],trilla:null,salidas_trilladora:[],trazabilidad:{codigo_lote_origen:selBlend?.codigo||"",fecha_proceso:"",fecha_trilla:"",fecha_secado:"",lotes_blend:(selBlend?.items||[]).map(it=>it.codigo)}},...p]);
    }
    setModalSalidaB(false);setEditSalidaBId(null);setErrB("");
  };

  const abrirEmb=(b)=>{setSelBlend(b);setFormEmb(b.pre_embarque?{...b.pre_embarque}:{fecha:today(),prueba_taza:"",norma:NORMAS[0],observaciones:""});setModalEmb(true);};
  const guardarEmb=()=>{
    if(!selBlend)return;
    setBlends(p=>p.map(b=>b.id===selBlend.id?{...b,pre_embarque:{fecha:formEmb.fecha,prueba_taza:formEmb.prueba_taza,norma:formEmb.norma,observaciones:formEmb.observaciones}}:b));
    setModalEmb(false);
  };

  const productosDeBlend=(b)=>[...new Set(b.items.map(it=>lotes.find(x=>x.id===it.reprId)?.producto).filter(Boolean))];
  const mesesBlend=[...new Set(blends.map(b=>mesDe(b.fecha)).filter(Boolean))].sort();
  const productosBlend=[...new Set(blends.flatMap(b=>productosDeBlend(b)))].sort();
  const blendsFiltrados=blends.filter(b=>{
    if(filtroMes&&mesDe(b.fecha)!==filtroMes)return false;
    if(filtroProducto&&!productosDeBlend(b).includes(filtroProducto))return false;
    if(busqueda){
      const q=busqueda.toLowerCase();
      const enCodigos=b.codigo.toLowerCase().includes(q)||b.items.some(it=>it.codigo.toLowerCase().includes(q));
      if(!enCodigos)return false;
    }
    return true;
  });
  const totalKgBlends=blends.reduce((s,b)=>s+b.kg_total,0);
  const totalValBlends=blends.reduce((s,b)=>s+b.valor_total,0);
  const totalValSalidasB=blends.reduce((s,b)=>s+(b.salidas||[]).reduce((a,x)=>a+(x.valor_total||0),0),0);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.purple,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>MEZCLAS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Blend</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>Combina excelso de varios lotes en un blend nuevo</div></div><button style={{...S.btn,background:C.purple}} onClick={abrirNuevo}>+ Nuevo Blend</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Blends Creados" value={blends.length} col={C.navy}/>
      <KPI label="kg Disponibles (Stock)" value={fmt(totalKgDisponiblePool)+" kg"} col={C.teal}/>
      <KPI label="kg en Blends (Salida)" value={fmt(totalKgBlends)+" kg"} col={C.accent}/>
      <KPI label="Valor en Blends" value={fmtCOP(totalValBlends)} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValSalidasB)} col={C.green}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote o blend..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesBlend.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosBlend.map(p=>(<option key={p}>{p}</option>))}</select>
    </div>
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Blends Registrados</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>{["Codigo Blend","Nombre","Producto Comercial","Fecha","Lotes Usados","kg Total","Costo/kg","Valor Total","Salidas kg","Stock kg","Analisis Pre-Embarque","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{blendsFiltrados.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=stockBlend(b);return(<tr key={b.id}>
        <td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{b.codigo}</td>
        <td style={{...S.td,fontWeight:600}}>{b.nombre}</td>
        <td style={S.td}>{b.producto_comercial?<Bdg label={b.producto_comercial} col={C.gold} bg={C.goldBg}/>:"—"}</td>
        <td style={{...S.td,color:C.textDim}}>{b.fecha}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{b.items.map(it=>(<Bdg key={it.key} label={it.codigo+" ("+fmt(it.kg_usado)+"kg)"} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(b.kg_total)} kg</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(Math.round(b.costo_kg))}</td>
        <td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(b.valor_total)}</td>
        <td style={{...S.td,color:C.orange}}>{fmt(salKg)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={S.td}>{b.pre_embarque?(<div><div style={{color:C.teal,fontWeight:600,fontSize:11}}>{b.pre_embarque.fecha}</div><div style={{color:C.textDim,fontSize:11}}>{b.pre_embarque.norma}</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirEmb(b)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirEmb(b)}>+ Pre-Embarque</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaB(b)}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(b)}>Editar</button></div></td>
      </tr>);})}</tbody></table></div>
      {blendsFiltrados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{blends.length===0?'Sin blends registrados. El excelso debe salir de Bodega Trilladora con destino "Blend" para estar disponible aqui.':"Ningun blend coincide con el filtro."}</div>}
    </div></>)}

    {tab==="historico"&&(blends.some(b=>(b.salidas||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas - Blend</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Blend","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{blends.flatMap(b=>(b.salidas||[]).map(s=>({...s,codigo:b.codigo,blendRef:b}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{s.fecha}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaB(s.blendRef,s)}>Editar</button></td></tr>))}</tbody></table></div></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

    {modal&&(<Modal title={editId?"Editar Blend":"Nuevo Blend"} onClose={cerrarModal} wide>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Nombre / Codigo Blend" half><input style={S.input} value={nombre} onChange={e=>setNombre(e.target.value)}/></Fld>
        <Fld label="Fecha de Realizacion" half><input style={S.input} type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/></Fld>
        <Fld label="Nombre de Producto Comercial"><input style={S.input} placeholder="Ej: Reserva Especial, Blend Premium..." value={productoComercial} onChange={e=>setProductoComercial(e.target.value)}/></Fld>
      </div>
      {codigoBlend&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14}}><span style={{color:C.textDim,fontSize:12}}>Codigo generado: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:14}}>{codigoBlend}</span></div>)}
      <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Lotes y Blends Disponibles (en stock o ya transferidos a Blend)</div>
      <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,border:"1px solid "+C.border}}>
        {pool.filter(p=>!items.some(it=>it.key===p.key)).length===0&&<div style={{color:C.textFaint,fontSize:12}}>No hay excelso disponible. Trilla un lote o registra una salida en Bodega Trilladora.</div>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{pool.filter(p=>!items.some(it=>it.key===p.key)).map(p=>(<button key={p.key} style={{...S.btnG,fontSize:11,padding:"6px 10px",borderColor:p.tipo==="blend"?C.purple:C.border2,color:p.tipo==="blend"?C.purple:C.textDim}} onClick={()=>addItem(p)}>+ {p.codigo} ({fmt(p.kg_disponible)} kg {p.tipo==="blend"?"blend en stock":p.esStockDirecto?"en stock":"transferido"})</button>))}</div>
      </div>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Lotes Seleccionados</div>
      {errBlendForm&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errBlendForm}</div>)}
      <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,overflowX:"auto",border:"1px solid "+C.border}}>
        {items.length===0&&<div style={{color:C.textFaint,fontSize:12}}>Agrega al menos un lote del listado de arriba.</div>}
        {items.length>0&&(<table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}><thead><tr>{["Lote","kg a Usar","kg Disponible","Valor/kg","Subtotal",""].map(h=>(<th key={h} style={{...S.th,fontSize:10,padding:"6px 8px"}}>{h}</th>))}</tr></thead>
        <tbody>{items.map(it=>{const p=pool.find(x=>x.key===it.key);const kgExcelsoLoteBlend=(p?.kg_disponible||0)+(+it.kg_usado||0);const restante=kgExcelsoLoteBlend-(+it.kg_usado||0);return(<tr key={it.key}>
          <td style={{padding:"4px 8px",color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{it.codigo}</td>
          <td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={it.kg_usado} onChange={e=>setItemKg(it.key,e.target.value)}/></td>
          <td style={{padding:"4px 8px",fontSize:12,fontWeight:700,color:restante<0?C.red:C.green}}>{fmt(restante)} kg</td>
          <td style={{padding:"4px 8px",fontSize:12,color:C.gold}}>{fmtCOP(it.valor_kg)}</td>
          <td style={{padding:"4px 8px",fontSize:12,color:C.gold,fontWeight:700}}>{fmtCOP((+it.kg_usado||0)*(+it.valor_kg||0))}</td>
          <td style={{padding:"4px"}}><button style={{...S.btnG,padding:"5px 8px"}} onClick={()=>rmItem(it.key)}>x</button></td>
        </tr>);})}</tbody></table>)}
      </div>
      <div style={{background:C.navy,borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600}}>kg Total: {fmt(kgTotalBlend)} | Valor Total: {fmtCOP(valorTotalBlend)}</span>
        <span style={{color:C.white,fontWeight:800,fontSize:18}}>Costo/kg Blend: {fmtCOP(Math.round(costoKgBlend))}</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button style={S.btnG} onClick={cerrarModal}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={guardar}>{editId?"Guardar Cambios":"Crear Blend"}</button></div>
    </Modal>)}

    {modalSalidaB&&selBlend&&(<Modal title={(editSalidaBId?"Editar Salida Blend - ":"Registrar Salida Blend - ")+selBlend.codigo} onClose={()=>{setModalSalidaB(false);setEditSalidaBId(null);setErrB("");}}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selBlend.codigo} - {selBlend.nombre}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockBlend(selBlend))} kg</b></div>
      </div>
      {errB&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errB}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalidaB.fecha} onChange={e=>setFormSalidaB(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Venta/Salida" half>
          <input style={{...S.input,borderColor:errB?C.red:C.border2}} type="number" value={formSalidaB.peso_salida} onChange={e=>{setFormSalidaB(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalidaB.valor_kg||0)||""}));setErrB("");}}/>
          <div style={{color:C.textDim,fontSize:11,marginTop:3}}>Max: {fmt(stockBlend(selBlend))} kg</div>
        </Fld>
        <Fld label="Precio por Unidad (kg COP)" half><input style={S.input} type="number" value={formSalidaB.valor_kg} onChange={e=>setFormSalidaB(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalidaB.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total Salida" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" placeholder="Calculado automatico" value={formSalidaB.valor_total} onChange={e=>setFormSalidaB(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalidaB.factura} placeholder="FAC-001" onChange={e=>setFormSalidaB(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalidaB.remision} placeholder="REM-001" onChange={e=>setFormSalidaB(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalidaB.cliente} destinoKey={formSalidaB.destino_key} onChange={(v,k)=>setFormSalidaB(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formSalidaB.observaciones} onChange={e=>setFormSalidaB(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalidaB(false);setEditSalidaBId(null);setErrB("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaB}>{editSalidaBId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}

    {modalEmb&&selBlend&&(<Modal title={"Analisis Pre-Embarque - "+selBlend.codigo} onClose={()=>setModalEmb(false)}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selBlend.codigo} - {selBlend.nombre}</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Analisis" half><input style={S.input} type="date" value={formEmb.fecha} onChange={e=>setFormEmb(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Prueba de Taza" half><input style={S.input} value={formEmb.prueba_taza} onChange={e=>setFormEmb(p=>({...p,prueba_taza:e.target.value}))}/></Fld>
        <Fld label="Norma"><select style={S.select} value={formEmb.norma} onChange={e=>setFormEmb(p=>({...p,norma:e.target.value}))}>{NORMAS.map(n=>(<option key={n}>{n}</option>))}</select></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formEmb.observaciones} onChange={e=>setFormEmb(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModalEmb(false)}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={guardarEmb}>Guardar Analisis</button></div>
    </Modal>)}
  </div>);
}

// ══════════════════════════════════════════════════════════════════════════
// CAFE FINO: linea paralela de procesamiento para pergamino comprado/ingresado
// directamente (sin pasar por Recepcion/Procesamiento). Misma logica de
// diseno que Bodega Milan / Trilla / Blend, con costo de compra en vez de
// costo de produccion (a+b+c).
// ══════════════════════════════════════════════════════════════════════════
function BodegaFino({lotesFino,setLotesFino,setBlendsFino,setBlendsTostado}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankForm=()=>({fecha:today(),producto:"",proveedor:"",kg_producto:"",costo_compra_kg:"",notas:""});
  const [form,setForm]=useState(blankForm());
  const [selLote,setSelLote]=useState(null);
  const [modalSalida,setModalSalida]=useState(false);
  const [formSalida,setFormSalida]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",nombre_producto_tostado:""});
  const [errSalida,setErrSalida]=useState("");
  const [editSalidaId,setEditSalidaId]=useState(null);
  const [tab,setTab]=useState("inventario");

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
  const genCod=()=>{const[y,m,d]=form.fecha.split("-");return "CF-"+(form.producto||"GEN")+"-"+d+m+y;};
  const abrirNuevo=()=>{setEditId(null);setForm(blankForm());setModal(true);};
  const abrirEditar=(l)=>{setEditId(l.id);setForm({fecha:l.fecha,producto:l.producto,proveedor:l.proveedor||"",kg_producto:l.kg_producto,costo_compra_kg:l.costo_compra_kg,notas:l.notas||""});setModal(true);};
  const reg=()=>{
    if(!form.kg_producto||!form.costo_compra_kg)return;
    if(editId){
      setLotesFino(p=>p.map(l=>l.id===editId?{...l,fecha:form.fecha,producto:form.producto,proveedor:form.proveedor,kg_producto:+form.kg_producto,costo_compra_kg:+form.costo_compra_kg,notas:form.notas}:l));
    }else{
      setLotesFino(p=>[{id:genId(),codigo:genCod(),fecha:form.fecha,mes:mesDe(form.fecha),semana:semanaISO(form.fecha),producto:form.producto,proveedor:form.proveedor,kg_producto:+form.kg_producto,costo_compra_kg:+form.costo_compra_kg,notas:form.notas,salidas_bodega:[],trilla:null,salidas_trilladora:[]},...p]);
    }
    setModal(false);
  };
  const abrirEditarSalida=(l,s)=>{setSelLote(l);setEditSalidaId(s.id);setFormSalida({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total});setErrSalida("");setModalSalida(true);};
  const regSalida=()=>{
    if(!selLote||!formSalida.peso_salida){setErrSalida("Ingresa el peso de salida.");return;}
    // item 8: campo obligatorio cuando destino = UBA Tostado
    if(esUbaTostado&&!formSalida.nombre_producto_tostado){setErrSalida("Para UBA Tostado debes ingresar el Nombre de Producto Comercial Tostado.");return;}
    const peso=+formSalida.peso_salida;
    const stockBase=stockDe(selLote)+(editSalidaId?(selLote.salidas_bodega||[]).find(x=>x.id===editSalidaId)?.peso_salida||0:0);
    if(peso>stockBase){setErrSalida("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalida.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalida.valor_total||0);
    setLotesFino(p=>p.map(l=>{if(l.id!==selLote.id)return l;
      let sal;
      if(editSalidaId){sal=(l.salidas_bodega||[]).map(s=>s.id===editSalidaId?{...s,fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}:s);}
      else{sal=[...(l.salidas_bodega||[]),{id:genId(),fecha:formSalida.fecha,factura:formSalida.factura,remision:formSalida.remision,cliente:formSalida.cliente,destino_key:formSalida.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}];}
      return{...l,salidas_bodega:sal};
    }));
    // item 7: auto-transfer a UBA Tostado, arrastrando trazabilidad completa (item 5)
    if(esUbaTostado){
      const codUBA="UBA-"+(formSalida.nombre_producto_tostado||"").replace(/\s+/g,"")+"-"+dateToCode(today());
      const tz=selLote?.trazabilidad||{};
      setBlendsTostado(p=>[{id:genId(),codigo:codUBA,fecha:today(),mes:mesDe(today()),nombre_producto:formSalida.nombre_producto_tostado,kg_a_tostar:peso,valor_unitario:vkg,valor_total:vtotal,temperatura:"",tiempo:"",tipo_tostion:TIPOS_TOSTION[0],kg_cafe_tostado:0,catacion:"",responsable:"",codigo_lote_origen:tz.codigo_lote_origen||selLote?.codigo||"",fecha_proceso:tz.fecha_proceso||"",fecha_trilla:selLote?.trilla?.fecha_trilla||tz.fecha_trilla||"",fecha_secado:tz.fecha_secado||"",lotes_blend:tz.lotes_blend||[]},...p]);
    }
    if(esBlendFino){
      const newId=genId();
      const salidaIdBF=genId();
      setLotesFino(p=>[{id:newId,codigo:selLote.codigo,fecha:today(),mes:mesDe(today()),semana:semanaISO(today()),producto:selLote.producto||"",proveedor:"Bodega Café Fino (para Blend)",kg_producto:peso,costo_compra_kg:vkg,notas:"Auto para Blend Café Fino",salidas_bodega:[],trilla:{kg_excelso:peso,kg_merma:0,kg_pasillas:0,pasilla_elec:0,catadora_dens:0,inferiores:0,cisco:0,entrada_usada:peso,humedad_salida:0,norma:"",fecha_trilla:today(),codigo_corte:"AUTO",nombre_trillado:selLote.codigo,con_proceso:"Con Proceso",obs:"Generado para Blend CF",lotes_combinados:[],costo_kg_excelso:vkg,valor_total:vtotal},salidas_trilladora:[{id:salidaIdBF,fecha:today(),cliente:"Blend Cafe Fino",destino_key:"blend_cf",peso_salida:peso,valor_kg:vkg,valor_total:vtotal}]},...p]);
    }
    if(esTrilladoraFino){
      setLotesFino(p=>[{id:genId(),codigo:selLote.codigo,fecha:today(),mes:mesDe(today()),semana:semanaISO(today()),producto:selLote.producto||"",proveedor:"Bodega Café Fino",kg_producto:peso,costo_compra_kg:vkg||0,notas:"Trasladado a Trilladora CF",salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,trazabilidad:selLote?.trazabilidad||{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:"",fecha_trilla:"",fecha_secado:"",lotes_blend:[]}},...p]);
    }
    setModalSalida(false);setEditSalidaId(null);setErrSalida("");
    setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",nombre_producto_tostado:""});
  };

  const totalKg=lotesFino.reduce((s,l)=>s+stockDe(l),0);
  const totalValor=lotesFino.reduce((s,l)=>s+stockDe(l)*(l.costo_compra_kg||0),0);
  const totalSalidas=lotesFino.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0),0);
  const totalValorSalidas=lotesFino.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),0),0);

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.navy,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Bodega Cafe Fino</span><button style={S.btn} onClick={abrirNuevo}>+ Nuevo Lote</button></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Lotes en Bodega" value={lotesFino.length} col={C.navy}/>
      <KPI label="Stock Total" value={fmt(totalKg)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock" value={fmtCOP(totalValor)} col={C.gold}/>
      <KPI label="kg con Salida" value={fmt(totalSalidas)+" kg"} col={C.orange}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidas)} col={C.green}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Inventario por Lote</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>{["Codigo","Producto","Proveedor","Fecha","Entrada kg","Salidas kg","Stock kg","Costo Compra/kg","Valor Stock","Pre-Trilla","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{lotesFino.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=stockDe(l);return(<tr key={l.id}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</td>
        <td style={S.td}><Bdg label={l.producto||"-"} col={C.teal} bg={C.tealBg}/></td>
        <td style={{...S.td,color:C.textDim}}>{l.proveedor||"-"}</td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{l.fecha}</td>
        <td style={{...S.td,fontWeight:600}}>{fmt(l.kg_producto)}</td>
        <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(sal)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(l.costo_compra_kg)}</td>
        <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(stock*(l.costo_compra_kg||0))}</td>
        <td style={S.td}>{l.pretrilla?(<div><div style={{color:C.purple,fontWeight:700,fontSize:12}}>FP: {fmt(l.pretrilla.factor_pretrilla,1)}</div><div style={{color:C.red,fontSize:11}}>Merma: {fmt(l.pretrilla.pct_merma,1)}%</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirPre(l)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirPre(l)}>+ Pre-Trilla</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>{setSelLote(l);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:l.costo_compra_kg||"",valor_total:""});setErrSalida("");setModalSalida(true);}}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(l)}>Editar</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px",color:C.red,borderColor:C.red+"40"}} disabled={!!(l.trilla?.kg_excelso)} title={l.trilla?.kg_excelso?"No se puede eliminar: ya fue trillado":""} onClick={()=>{if(window.confirm("¿Eliminar el lote "+l.codigo+" de Bodega Cafe Fino? Esta accion no se puede deshacer.")){setLotesFino(p=>p.filter(x=>x.id!==l.id));}}}>Eliminar</button></div></td>
      </tr>);})}</tbody></table></div>
      {lotesFino.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin lotes registrados todavia.</div>}
    </div>)}
    {tab==="historico"&&(lotesFino.some(l=>(l.salidas_bodega||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote","Fecha","Factura","Remision","Cliente","Peso Salida","Valor/kg","Valor Total",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{lotesFino.flatMap(l=>(l.salidas_bodega||[]).map(s=>({...s,codigo:l.codigo,loteRef:l}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{s.fecha}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalida(s.loteRef,s)}>Editar</button></td></tr>))}</tbody></table></div></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

    {modal&&(<Modal title={editId?"Editar Lote Cafe Fino":"Nuevo Lote Cafe Fino"} onClose={()=>setModal(false)}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Producto" half><input style={S.input} value={form.producto} onChange={e=>setForm(p=>({...p,producto:e.target.value}))}/></Fld>
        <Fld label="Proveedor / Origen" half><input style={S.input} value={form.proveedor} onChange={e=>setForm(p=>({...p,proveedor:e.target.value}))}/></Fld>
        <Fld label="kg Pergamino Recibido" half><input style={S.input} type="number" value={form.kg_producto} onChange={e=>setForm(p=>({...p,kg_producto:e.target.value}))}/></Fld>
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
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalida.fecha} onChange={e=>setFormSalida(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Peso de Salida (kg)" half><input style={{...S.input,borderColor:errSalida?C.red:C.border2}} type="number" value={formSalida.peso_salida} onChange={e=>{setFormSalida(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+formSalida.valor_kg||0)||""}));setErrSalida("");}}/></Fld>
        <Fld label="Valor por kg COP (auto)" half><input style={S.input} type="number" value={formSalida.valor_kg} onChange={e=>setFormSalida(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+formSalida.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total COP" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={formSalida.valor_total} onChange={e=>setFormSalida(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="N Factura" half><input style={S.input} value={formSalida.factura} onChange={e=>setFormSalida(p=>({...p,factura:e.target.value}))}/></Fld>
        <Fld label="N Remision" half><input style={S.input} value={formSalida.remision} onChange={e=>setFormSalida(p=>({...p,remision:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalida.cliente} destinoKey={formSalida.destino_key} onChange={(v,k)=>setFormSalida(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
        {esUbaTostado&&<Fld label="Nombre Producto Comercial Tostado (obligatorio)"><input style={{...S.input,borderColor:!formSalida.nombre_producto_tostado?C.red:C.border2}} value={formSalida.nombre_producto_tostado} placeholder="Ej: Reserva Especial Tostado..." onChange={e=>setFormSalida(p=>({...p,nombre_producto_tostado:e.target.value}))}/></Fld>}
      </div>
      {esTrilladoraFino&&<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Este lote quedara disponible en Trilladora Cafe Fino para ser procesado.</div>}
      {esBlendFino&&<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Se creara automaticamente un lote disponible en Blend Cafe Fino.</div>}
      {esUbaTostado&&<div style={{background:C.orangeBg,border:"1px solid "+C.orange+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.orange,fontWeight:600,marginBottom:10}}>&#8505; Se creara automaticamente un registro en UBA Tostado con los kg y valor ingresados.</div>}
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

function TrilladoraFino({lotesFino,setLotesFino}){
  const MAX_LOTES=8;
  const blankForm=()=>({excelso:"",pasilla_elec:"",catadora_dens:"",inferiores:"",cisco:"",humedad:"",norma:NORMAS[0],fecha_trilla:"",codigo_corte:"",con_proceso:"Con Proceso",obs:""});
  const [selArr,setSelArr]=useState([]);
  const [isEditing,setIsEditing]=useState(false);
  const [form,setForm]=useState(blankForm());
  const [errTrilla,setErrTrilla]=useState("");
  const stockDe=(l)=>l.kg_producto-(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);
  const disp=lotesFino.filter(l=>!l.trilla?.kg_excelso&&stockDe(l)>0);
  const tril=lotesFino.filter(l=>l.trilla?.kg_excelso>0);

  // Salida de excelso trillado (item 4: solo destinos marcados explicitamente alimentan Blend Cafe Fino)
  const [modalSalidaTF,setModalSalidaTF]=useState(false);
  const [selGrupoTF,setSelGrupoTF]=useState(null);
  const [formSalidaTF,setFormSalidaTF]=useState({fecha:today(),peso_salida:"",valor_kg:"",valor_total:"",cliente:"",destino_key:""});
  const [errSalidaTF,setErrSalidaTF]=useState("");
  const stockExcelsoGrupo=(grupo)=>{const excelsoTotal=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);const salTotal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);return excelsoTotal-salTotal;};
  const abrirSalidaTF=(grupo)=>{setSelGrupoTF(grupo);setFormSalidaTF({fecha:today(),peso_salida:"",valor_kg:"",valor_total:"",cliente:"",destino_key:""});setErrSalidaTF("");setModalSalidaTF(true);};
  const regSalidaTF=()=>{
    if(!selGrupoTF||!formSalidaTF.peso_salida){setErrSalidaTF("Ingresa el peso de salida.");return;}
    const peso=+formSalidaTF.peso_salida;
    const stockBase=stockExcelsoGrupo(selGrupoTF);
    if(peso>stockBase){setErrSalidaTF("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaTF.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalidaTF.valor_total||0);
    const reprId=selGrupoTF[0].id;
    setLotesFino(p=>p.map(l=>l.id===reprId?{...l,salidas_trilladora:[...(l.salidas_trilladora||[]),{id:genId(),fecha:formSalidaTF.fecha,cliente:formSalidaTF.cliente,destino_key:formSalidaTF.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal}]}:l));
    setModalSalidaTF(false);setErrSalidaTF("");
  };

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
    setForm({excelso:sum("kg_excelso"),pasilla_elec:sum("pasilla_elec"),catadora_dens:sum("catadora_dens"),inferiores:sum("inferiores"),cisco:sum("cisco"),humedad:l.trilla.humedad_salida||"",norma:l.trilla.norma||NORMAS[0],fecha_trilla:l.trilla.fecha_trilla||"",codigo_corte:l.trilla.codigo_corte||"",con_proceso:l.trilla.con_proceso||"Con Proceso",obs:l.trilla.obs||""});
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
      }};
    }));
    limpiarSeleccion();
  };

  const gruposVistos=new Set();
  const gruposHistorico=[];
  tril.forEach(l=>{
    if(gruposVistos.has(l.id))return;
    const grupo=[l,...lotesFino.filter(x=>(l.trilla.lotes_combinados||[]).includes(x.id))];
    grupo.forEach(x=>gruposVistos.add(x.id));
    gruposHistorico.push(grupo);
  });

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>TRILLA CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Trilladora Cafe Fino</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16}}>
      <div>{disp.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes disponibles en Bodega Cafe Fino.</div>}
        <div style={{color:C.textFaint,fontSize:11,marginBottom:8}}>Selecciona de 1 a {MAX_LOTES} lotes para trillar juntos.</div>
        {disp.map(l=>{const isSel=selArr.some(x=>x.id===l.id);return(<div key={l.id} onClick={()=>toggleSel(l)} style={{...S.card,cursor:isEditing?"default":"pointer",opacity:isEditing&&!isSel?0.5:1,marginBottom:10,borderLeft:"3px solid "+(isSel?C.green:C.border),borderColor:isSel?C.green:C.border}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</span><Bdg label={l.producto||"-"} col={C.navy} bg={C.accentBg}/></div>
          <div style={{color:C.green,fontSize:12,fontWeight:600}}>{fmt(stockDe(l))} kg disponibles{l.pretrilla?.factor_pretrilla?<Bdg label={"FP: "+fmt(l.pretrilla.factor_pretrilla,1)} col={C.gold} bg={C.goldBg}/>:null}</div>
        </div>);})}
      </div>
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
          {errTrilla&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errTrilla}</div>)}
          <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))}/></Fld>
          <button style={{...S.btn,background:C.green,width:"100%"}} onClick={reg}>{isEditing?"Guardar Cambios":"Registrar Trilla"}</button></>
        )}
      </div>
    </div>
    {gruposHistorico.length>0&&(<div style={{...S.card,marginTop:16}}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Historico Trilla Cafe Fino</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1200}}><thead><tr>{["Fecha Trilla","Corte","Lotes","Cod. Trillado","Proceso","Perg. kg","Excelso kg","Merma kg","% Merma","FI","FP Pond.","Dif.","Rend.","Costo/kg Ex","Stock Excelso","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
    <tbody>{gruposHistorico.map(grupo=>{
      const repr=grupo[0];const t=repr.trilla;
      const entrada=grupo.reduce((s,x)=>s+(x.trilla?.entrada_usada||0),0);
      const excelso=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
      const merma=grupo.reduce((s,x)=>s+(x.trilla?.kg_merma||0),0);
      const costoTotalGrupo=grupo.reduce((s,x)=>s+((x.costo_compra_kg||0)*(x.trilla?.entrada_usada||0)),0);
      const costoEx=excelso>0?Math.round(costoTotalGrupo/excelso):null;
      const stockEx=stockExcelsoGrupo(grupo);
      const dif=(t.factor_industrial!=null&&t.factor_pretrilla_ponderado!=null)?(t.factor_industrial-t.factor_pretrilla_ponderado):null;
      return(<tr key={repr.id}>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.fecha_trilla||"—"}</td>
        <td style={S.td}><Bdg label={t.codigo_corte||"—"} col={C.accent}/></td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:C.green,fontWeight:600}}>{t.nombre_trillado||"—"}</td>
        <td style={S.td}><Bdg label={t.con_proceso||"—"} col={t.con_proceso==="Sin Proceso"?C.orange:C.teal}/></td>
        <td style={{...S.td,fontWeight:600}}>{fmt(entrada)}</td>
        <td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(excelso)}</td>
        <td style={{...S.td,color:C.red}}>{fmt(merma)}</td>
        <td style={{...S.td,color:C.red,fontWeight:600}}>{entrada?((merma/entrada)*100).toFixed(1)+"%":"?"}</td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{t.factor_industrial!=null?fmt(t.factor_industrial,1):"?"}</td>
        <td style={{...S.td,color:C.purple,fontWeight:600}}>{t.factor_pretrilla_ponderado!=null?fmt(t.factor_pretrilla_ponderado,1):"?"}</td>
        <td style={{...S.td,color:dif>0?C.red:C.green,fontWeight:600}}>{dif!=null?fmt(dif,1):"?"}</td>
        <td style={{...S.td,color:C.green,fontWeight:600}}>{entrada?((excelso/entrada)*100).toFixed(1)+"%":"?"}</td>
        <td style={{...S.td,color:C.purple,fontWeight:700}}>{costoEx?fmtCOP(costoEx):"?"}</td>
        <td style={S.td}><span style={{color:stockEx>0?C.green:C.textFaint,fontWeight:700}}>{fmt(stockEx)} kg</span></td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stockEx>0?C.accent:C.textFaint,cursor:stockEx>0?"pointer":"not-allowed"}} disabled={stockEx<=0} onClick={()=>abrirSalidaTF(grupo)}>+ Salida</button><button style={S.btnG} onClick={()=>abrirEditarGrupo(repr)}>Editar</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px",color:C.orange,borderColor:C.orange+"40"}} onClick={()=>{if(window.confirm("¿Retroceder la trilla de "+repr.codigo+"? Los lotes volveran a Bodega Cafe Fino disponibles para trillar.")){setLotesFino(p=>p.map(l=>grupo.some(g=>g.id===l.id)?{...l,trilla:null,salidas_trilladora:[]}:l));}}}>Retroceder</button></div></td>
      </tr>);
    })}</tbody></table></div></div>)}

    {modalSalidaTF&&selGrupoTF&&(<Modal title={"Salida de Excelso - "+(selGrupoTF[0].trilla.nombre_trillado||selGrupoTF[0].codigo)} onClose={()=>{setModalSalidaTF(false);setErrSalidaTF("");}}>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.navy,fontWeight:700}}>{selGrupoTF[0].trilla.nombre_trillado||selGrupoTF[0].codigo}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockExcelsoGrupo(selGrupoTF))} kg</b></div>
      </div>
      {errSalidaTF&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalidaTF}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalidaTF.fecha} onChange={e=>setFormSalidaTF(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Salida" half><input style={S.input} type="number" value={formSalidaTF.peso_salida} onChange={e=>{setFormSalidaTF(p=>({...p,peso_salida:e.target.value,valor_total:+e.target.value*(+p.valor_kg||0)||""}));setErrSalidaTF("");}}/></Fld>
        <Fld label="Valor por kg COP" half><input style={S.input} type="number" value={formSalidaTF.valor_kg} onChange={e=>setFormSalidaTF(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+p.peso_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total COP" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={formSalidaTF.valor_total} onChange={e=>setFormSalidaTF(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalidaTF.cliente} destinoKey={formSalidaTF.destino_key} onChange={(v,k)=>setFormSalidaTF(p=>({...p,cliente:v,destino_key:k}))}/></Fld>
      </div>
      {formSalidaTF.destino_key==="blend_cf"&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Este excelso quedara disponible en Blend Cafe Fino.</div>)}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModalSalidaTF(false)}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaTF}>Registrar Salida</button></div>
    </Modal>)}
  </div>);
}

const grupoDeFino=(lotesFino,l)=>[l,...lotesFino.filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];
// item 4: Blend Cafe Fino SOLO se alimenta de excelso con salida explicitamente marcada "Blend Cafe Fino"
const poolBlendFino=(lotesFino,blendsFino,editId)=>{
  const pool=[];
  lotesFino.filter(l=>l.trilla?.kg_excelso>0).forEach(l=>{
    (l.salidas_trilladora||[]).filter(s=>s.destino_key==="blend_cf").forEach(s=>{
      pool.push({key:"finolote:sal:"+s.id,salidaId:s.id,reprId:l.id,codigo:l.trilla.nombre_trillado||l.codigo,producto:l.producto,kg_total:s.peso_salida,valor_kg:s.valor_kg,fecha:s.fecha,tipo:"finolote"});
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

function BlendFino({lotesFino,setLotesFino,blendsFino,setBlendsFino}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [nombre,setNombre]=useState("");
  const [fecha,setFecha]=useState(today());
  const [productoComercial,setProductoComercial]=useState("");
  const [items,setItems]=useState([]);
  const [errBlendForm,setErrBlendForm]=useState("");
  const [modalSalidaB,setModalSalidaB]=useState(false);
  const [selBlend,setSelBlend]=useState(null);
  const [formSalidaB,setFormSalidaB]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",observaciones:""});
  const [errB,setErrB]=useState("");
  const [editSalidaBId,setEditSalidaBId]=useState(null);
  const [tab,setTab]=useState("inventario");

  const stockBlend=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
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
      if(+it.kg_usado>maxKg){setErrBlendForm("ALERTA: "+it.codigo+" usa "+fmt(+it.kg_usado)+" kg pero solo hay "+fmt(maxKg)+" kg disponibles.");return;}
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

  const abrirSalidaB=(b)=>{setSelBlend(b);setEditSalidaBId(null);setFormSalidaB({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:Math.round(b.costo_kg)||"",valor_total:"",observaciones:""});setErrB("");setModalSalidaB(true);};
  const abrirEditarSalidaB=(b,s)=>{setSelBlend(b);setEditSalidaBId(s.id);setFormSalidaB({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total,observaciones:s.observaciones||""});setErrB("");setModalSalidaB(true);};
  const regSalidaB=()=>{
    if(!selBlend||!formSalidaB.peso_salida){setErrB("Ingresa el peso de salida.");return;}
    const peso=+formSalidaB.peso_salida;
    const stockBase=stockBlend(selBlend)+(editSalidaBId?(selBlend.salidas||[]).find(x=>x.id===editSalidaBId)?.peso_salida||0:0);
    if(peso>stockBase){setErrB("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaB.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalidaB.valor_total||0);
    setBlendsFino(p=>p.map(b=>{
      if(b.id!==selBlend.id)return b;
      let sal;
      if(editSalidaBId){sal=(b.salidas||[]).map(s=>s.id===editSalidaBId?{...s,fecha:formSalidaB.fecha,factura:formSalidaB.factura,remision:formSalidaB.remision,cliente:formSalidaB.cliente,destino_key:formSalidaB.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaB.observaciones}:s);}
      else{sal=[...(b.salidas||[]),{id:genId(),fecha:formSalidaB.fecha,factura:formSalidaB.factura,remision:formSalidaB.remision,cliente:formSalidaB.cliente,destino_key:formSalidaB.destino_key,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,observaciones:formSalidaB.observaciones}];}
      return{...b,salidas:sal};
    }));
    setModalSalidaB(false);setEditSalidaBId(null);setErrB("");
  };

  const totalKgBlends=blendsFino.reduce((s,b)=>s+b.kg_total,0);
  const totalValBlends=blendsFino.reduce((s,b)=>s+b.valor_total,0);
  const totalValSalidasB=blendsFino.reduce((s,b)=>s+(b.salidas||[]).reduce((a,x)=>a+(x.valor_total||0),0),0);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.purple,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>MEZCLAS CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Blend Cafe Fino</div></div><button style={{...S.btn,background:C.purple}} onClick={abrirNuevo}>+ Nuevo Blend</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Blends Creados" value={blendsFino.length} col={C.navy}/>
      <KPI label="kg Disponibles (Stock)" value={fmt(totalKgDisponiblePool)+" kg"} col={C.teal}/>
      <KPI label="kg en Blends" value={fmt(totalKgBlends)+" kg"} col={C.accent}/>
      <KPI label="Valor en Blends" value={fmtCOP(totalValBlends)} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValSalidasB)} col={C.green}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Blends Registrados</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>{["Codigo Blend","Nombre","Producto Comercial","Fecha","Lotes Usados","kg Total","Costo/kg","Valor Total","Salidas kg","Stock kg","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{blendsFino.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=stockBlend(b);return(<tr key={b.id}>
        <td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{b.codigo}</td>
        <td style={{...S.td,fontWeight:600}}>{b.nombre}</td>
        <td style={S.td}>{b.producto_comercial?<Bdg label={b.producto_comercial} col={C.gold} bg={C.goldBg}/>:"—"}</td>
        <td style={{...S.td,color:C.textDim}}>{b.fecha}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{b.items.map(it=>(<Bdg key={it.key} label={it.codigo+" ("+fmt(it.kg_usado)+"kg)"} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(b.kg_total)} kg</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(Math.round(b.costo_kg))}</td>
        <td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(b.valor_total)}</td>
        <td style={{...S.td,color:C.orange}}>{fmt(salKg)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaB(b)}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(b)}>Editar</button></div></td>
      </tr>);})}</tbody></table></div>
      {blendsFino.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin blends registrados todavia.</div>}
    </div>)}
    {tab==="historico"&&(blendsFino.some(b=>(b.salidas||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Blend","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{blendsFino.flatMap(b=>(b.salidas||[]).map(s=>({...s,codigo:b.codigo,blendRef:b}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{s.fecha}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaB(s.blendRef,s)}>Editar</button></td></tr>))}</tbody></table></div></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

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
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{pool.filter(p=>!items.some(it=>it.key===p.key)).map(p=>(<button key={p.key} style={{...S.btnG,fontSize:11,padding:"6px 10px",borderColor:p.tipo==="finoblend"?C.purple:C.border2,color:p.tipo==="finoblend"?C.purple:C.textDim}} onClick={()=>addItem(p)}>+ {p.codigo} ({fmt(p.kg_disponible)} kg)</button>))}</div>
      </div>
      <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Lotes Seleccionados</div>
      {errBlendForm&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errBlendForm}</div>)}
      <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,overflowX:"auto",border:"1px solid "+C.border}}>
        {items.length===0&&<div style={{color:C.textFaint,fontSize:12}}>Agrega al menos un lote del listado de arriba.</div>}
        {items.length>0&&(<table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}><thead><tr>{["Lote","kg a Usar","kg Disponible","Valor/kg","Subtotal",""].map(h=>(<th key={h} style={{...S.th,fontSize:10,padding:"6px 8px"}}>{h}</th>))}</tr></thead>
        <tbody>{items.map(it=>{const p=pool.find(x=>x.key===it.key);const kgTotalItem=(p?.kg_disponible||0)+(+it.kg_usado||0);const restante=kgTotalItem-(+it.kg_usado||0);return(<tr key={it.key}>
          <td style={{padding:"4px 8px",color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{it.codigo}</td>
          <td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={it.kg_usado} onChange={e=>setItemKg(it.key,e.target.value)}/></td>
          <td style={{padding:"4px 8px",fontSize:12,fontWeight:700,color:restante<0?C.red:C.green}}>{fmt(restante)} kg</td>
          <td style={{padding:"4px 8px",fontSize:12,color:C.gold}}>{fmtCOP(it.valor_kg)}</td>
          <td style={{padding:"4px 8px",fontSize:12,color:C.gold,fontWeight:700}}>{fmtCOP((+it.kg_usado||0)*(+it.valor_kg||0))}</td>
          <td style={{padding:"4px"}}><button style={{...S.btnG,padding:"5px 8px"}} onClick={()=>rmItem(it.key)}>x</button></td>
        </tr>);})}</tbody></table>)}
      </div>
      <div style={{background:C.navy,borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600}}>kg Total: {fmt(kgTotalBlend)} | Valor Total: {fmtCOP(valorTotalBlend)}</span>
        <span style={{color:C.white,fontWeight:800,fontSize:18}}>Costo/kg Blend: {fmtCOP(Math.round(costoKgBlend))}</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button style={S.btnG} onClick={cerrarModal}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={guardar}>{editId?"Guardar Cambios":"Crear Blend"}</button></div>
    </Modal>)}

    {modalSalidaB&&selBlend&&(<Modal title={(editSalidaBId?"Editar Salida - ":"Registrar Salida - ")+selBlend.codigo} onClose={()=>{setModalSalidaB(false);setEditSalidaBId(null);setErrB("");}}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selBlend.codigo} - {selBlend.nombre}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockBlend(selBlend))} kg</b></div>
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
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModalSalidaB(false);setEditSalidaBId(null);setErrB("");}}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaB}>{editSalidaBId?"Guardar Cambios":"Registrar Salida"}</button></div>
    </Modal>)}
  </div>);
}

const SERVICIOS_MAQUILA=["Trilla","Seleccion","Tostado","Marca"];
function Maquila({maquilas,setMaquilas,setLotesFino}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankForm=()=>({fecha:today(),cliente:"",telefono:"",kg_recibidos:"",servicio:SERVICIOS_MAQUILA[0],observaciones:""});
  const [form,setForm]=useState(blankForm());
  const mesAuto=mesDe(form.fecha);
  const semanaAuto=semanaISO(form.fecha);
  const abrirNuevo=()=>{setEditId(null);setForm(blankForm());setModal(true);};
  const abrirEditar=(m)=>{setEditId(m.id);setForm({fecha:m.fecha,cliente:m.cliente,telefono:m.telefono||"",kg_recibidos:m.kg_recibidos,servicio:m.servicio,observaciones:m.observaciones||""});setModal(true);};
  const genCodMaquila=()=>"MAQUILA-"+dateToCode(form.fecha)+"-"+form.cliente.replace(/\s+/g,"");
  const [modalSalidaMq,setModalSalidaMq]=useState(false);
  const [selMq,setSelMq]=useState(null);
  const [formSalidaMq,setFormSalidaMq]=useState({fecha:today(),kg_salida:"",valor_kg:"",valor_total:"",cliente_destino:"",destino_key:"",observaciones:""});
  const [errSalidaMq,setErrSalidaMq]=useState("");
  const abrirSalidaMq=(m)=>{setSelMq(m);setFormSalidaMq({fecha:today(),kg_salida:"",valor_kg:"",valor_total:"",cliente_destino:"",destino_key:"",observaciones:""});setErrSalidaMq("");setModalSalidaMq(true);};
  const regSalidaMq=()=>{
    if(!selMq||!formSalidaMq.kg_salida){setErrSalidaMq("Ingresa el peso de salida.");return;}
    const kgSal=+formSalidaMq.kg_salida;
    const vkg=+formSalidaMq.valor_kg||0;const vtotal=vkg>0?kgSal*vkg:(+formSalidaMq.valor_total||0);
    setMaquilas(p=>p.map(m=>m.id===selMq.id?{...m,salidas:[...(m.salidas||[]),{id:genId(),fecha:formSalidaMq.fecha,kg_salida:kgSal,valor_kg:vkg,valor_total:vtotal,cliente_destino:formSalidaMq.cliente_destino,destino_key:formSalidaMq.destino_key,observaciones:formSalidaMq.observaciones}]}:m));
    // Auto-transferencia a Trilladora Café Fino (item 10)
    if(formSalidaMq.destino_key==="trilla_cf"){
      const codFino="CF-MQ-"+dateToCode(today())+"-"+genId().slice(0,4);
      setLotesFino(p=>[{id:genId(),codigo:codFino,fecha:formSalidaMq.fecha,mes:mesDe(formSalidaMq.fecha),semana:semanaISO(formSalidaMq.fecha),producto:selMq.servicio||"",proveedor:selMq.cliente,kg_producto:kgSal,costo_compra_kg:vkg||0,notas:"Maquila desde "+selMq.codigo+" - "+selMq.cliente,salidas_bodega:[],trilla:null,salidas_trilladora:[]},...p]);
    }
    setModalSalidaMq(false);setErrSalidaMq("");
  };
  const reg=()=>{
    if(!form.cliente||!form.kg_recibidos)return;
    if(editId){
      setMaquilas(p=>p.map(m=>m.id===editId?{...m,fecha:form.fecha,mes:mesAuto,semana:semanaAuto,cliente:form.cliente,telefono:form.telefono,kg_recibidos:+form.kg_recibidos,servicio:form.servicio,observaciones:form.observaciones}:m));
    }else{
      setMaquilas(p=>[{id:genId(),codigo:genCodMaquila(),fecha:form.fecha,mes:mesAuto,semana:semanaAuto,cliente:form.cliente,telefono:form.telefono,kg_recibidos:+form.kg_recibidos,servicio:form.servicio,observaciones:form.observaciones,salidas:[]},...p]);
    }
    setModal(false);
  };
  const totalKg=maquilas.reduce((s,m)=>s+(m.kg_recibidos||0),0);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>SERVICIOS A TERCEROS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Maquila</div></div><button style={{...S.btn,background:C.orange}} onClick={abrirNuevo}>+ Nuevo Registro</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Registros" value={maquilas.length} col={C.navy}/>
      <KPI label="kg Recibidos" value={fmt(totalKg)+" kg"} col={C.accent}/>
      <KPI label="Clientes" value={[...new Set(maquilas.map(m=>m.cliente))].length} col={C.green}/>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Registros de Maquila</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}><thead><tr>{["Codigo","Fecha","Mes","Semana","Cliente","Telefono","kg Recibidos","Servicio","Observaciones","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{maquilas.map(m=>(<tr key={m.id}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{m.codigo||"-"}</td>
        <td style={{...S.td,color:C.textDim}}>{m.fecha}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{m.mes}</td>
        <td style={S.td}>{m.semana}</td>
        <td style={{...S.td,fontWeight:600,color:C.navy}}>{m.cliente}</td>
        <td style={{...S.td,color:C.textDim}}>{m.telefono||"-"}</td>
        <td style={{...S.td,fontWeight:700,color:C.accent}}>{fmt(m.kg_recibidos)} kg</td>
        <td style={S.td}><Bdg label={m.servicio} col={C.orange} bg={C.orangeBg}/></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{m.observaciones||"-"}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirSalidaMq(m)}>+ Salida</button><button style={S.btnG} onClick={()=>abrirEditar(m)}>Editar</button></div></td>
      </tr>))}</tbody></table></div>
      {maquilas.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin registros de maquila todavia.</div>}
    </div>
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
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button><button style={{...S.btn,background:C.orange}} onClick={reg}>{editId?"Guardar Cambios":"Registrar"}</button></div>
    </Modal>)}

    {modalSalidaMq&&selMq&&(<Modal title={"Salida de Maquila - "+selMq.codigo} onClose={()=>{setModalSalidaMq(false);setErrSalidaMq("");}}>
      <div style={{background:C.orangeBg,border:"1px solid "+C.orange+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.orange,fontWeight:700}}>{selMq.codigo} - {selMq.cliente}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>{selMq.servicio} | {fmt(selMq.kg_recibidos)} kg recibidos</div>
      </div>
      {errSalidaMq&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errSalidaMq}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha de Salida" half><input style={S.input} type="date" value={formSalidaMq.fecha} onChange={e=>setFormSalidaMq(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="kg Salida" half><input style={S.input} type="number" value={formSalidaMq.kg_salida} onChange={e=>{setFormSalidaMq(p=>({...p,kg_salida:e.target.value,valor_total:+e.target.value*(+p.valor_kg||0)||""}));setErrSalidaMq("");}}/></Fld>
        <Fld label="Valor por kg COP" half><input style={S.input} type="number" value={formSalidaMq.valor_kg} onChange={e=>setFormSalidaMq(p=>({...p,valor_kg:e.target.value,valor_total:+e.target.value*(+p.kg_salida||0)||""}))}/></Fld>
        <Fld label="Valor Total COP" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={formSalidaMq.valor_total} onChange={e=>setFormSalidaMq(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="Cliente / Destino"><SelectDestino value={formSalidaMq.cliente_destino} destinoKey={formSalidaMq.destino_key} onChange={(v,k)=>setFormSalidaMq(p=>({...p,cliente_destino:v,destino_key:k}))}/></Fld>
        <Fld label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={formSalidaMq.observaciones} onChange={e=>setFormSalidaMq(p=>({...p,observaciones:e.target.value}))}/></Fld>
      </div>
      {formSalidaMq.destino_key==="trilla_cf"&&(<div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",fontSize:12,color:C.accent,fontWeight:600,marginBottom:10}}>&#8505; Los kg de salida se trasladaran automaticamente a Trilladora Cafe Fino.</div>)}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModalSalidaMq(false)}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={regSalidaMq}>Registrar Salida</button></div>
    </Modal>)}
  </div>);
}

const TIPOS_TOSTION=["Ligero","Medio","Oscuro","Especialidad","Otro"];

function UbaTostado({blendsTostado,setBlendsTostado}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankForm=()=>({fecha:today(),nombre_producto:"",kg_a_tostar:"",valor_unitario:"",valor_total:"",temperatura:"",tiempo:"",tipo_tostion:TIPOS_TOSTION[0],kg_cafe_tostado:"",catacion:"",responsable:"",codigo_lote_origen:"",fecha_proceso:"",fecha_trilla:"",fecha_secado:""});
  const [form,setForm]=useState(blankForm());
  const abrirNuevo=()=>{setEditId(null);setForm(blankForm());setModal(true);};
  const abrirEditar=(t)=>{setEditId(t.id);setForm({fecha:t.fecha,nombre_producto:t.nombre_producto||"",kg_a_tostar:t.kg_a_tostar,valor_unitario:t.valor_unitario,valor_total:t.valor_total,temperatura:t.temperatura||"",tiempo:t.tiempo||"",tipo_tostion:t.tipo_tostion||TIPOS_TOSTION[0],kg_cafe_tostado:t.kg_cafe_tostado||"",catacion:t.catacion||"",responsable:t.responsable||"",codigo_lote_origen:t.codigo_lote_origen||"",fecha_proceso:t.fecha_proceso||"",fecha_trilla:t.fecha_trilla||"",fecha_secado:t.fecha_secado||""});setModal(true);};

  // item 6: accion de salida sobre el cafe tostado resultante
  const stockTostado=(t)=>(t.kg_cafe_tostado||0)-(t.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const [modalSalidaUBA,setModalSalidaUBA]=useState(false);
  const [selTost,setSelTost]=useState(null);
  const [formSalidaUBA,setFormSalidaUBA]=useState({fecha:today(),peso_salida:"",valor_kg:"",valor_total:"",cliente:"",observaciones:""});
  const [errSalidaUBA,setErrSalidaUBA]=useState("");
  const abrirSalidaUBA=(t)=>{setSelTost(t);setFormSalidaUBA({fecha:today(),peso_salida:"",valor_kg:"",valor_total:"",cliente:"",observaciones:""});setErrSalidaUBA("");setModalSalidaUBA(true);};
  const regSalidaUBA=()=>{
    if(!selTost||!formSalidaUBA.peso_salida){setErrSalidaUBA("Ingresa el peso de salida.");return;}
    const peso=+formSalidaUBA.peso_salida;
    const stockBase=stockTostado(selTost);
    if(peso>stockBase){setErrSalidaUBA("ERROR: El peso de salida ("+fmt(peso)+" kg) supera el stock disponible ("+fmt(stockBase)+" kg).");return;}
    const vkg=+formSalidaUBA.valor_kg||0;const vtotal=vkg>0?peso*vkg:(+formSalidaUBA.valor_total||0);
    setBlendsTostado(p=>p.map(t=>t.id===selTost.id?{...t,salidas:[...(t.salidas||[]),{id:genId(),fecha:formSalidaUBA.fecha,peso_salida:peso,valor_kg:vkg,valor_total:vtotal,cliente:formSalidaUBA.cliente,observaciones:formSalidaUBA.observaciones}]}:t));
    setModalSalidaUBA(false);setErrSalidaUBA("");
  };
  const reg=()=>{
    if(!form.kg_a_tostar||!form.fecha)return;
    const vt=(+form.kg_a_tostar||0)*(+form.valor_unitario||0);
    if(editId){
      setBlendsTostado(p=>p.map(t=>t.id===editId?{...t,fecha:form.fecha,mes:mesDe(form.fecha),nombre_producto:form.nombre_producto,kg_a_tostar:+form.kg_a_tostar,valor_unitario:+form.valor_unitario,valor_total:vt,temperatura:form.temperatura,tiempo:form.tiempo,tipo_tostion:form.tipo_tostion,kg_cafe_tostado:+form.kg_cafe_tostado||0,catacion:form.catacion,responsable:form.responsable,codigo_lote_origen:form.codigo_lote_origen,fecha_proceso:form.fecha_proceso,fecha_trilla:form.fecha_trilla,fecha_secado:form.fecha_secado}:t));
    }else{
      const cod="UBA-"+form.nombre_producto.replace(/\s+/g,"")+"-"+dateToCode(form.fecha);
      setBlendsTostado(p=>[{id:genId(),codigo:cod,fecha:form.fecha,mes:mesDe(form.fecha),nombre_producto:form.nombre_producto,kg_a_tostar:+form.kg_a_tostar,valor_unitario:+form.valor_unitario,valor_total:vt,temperatura:form.temperatura,tiempo:form.tiempo,tipo_tostion:form.tipo_tostion,kg_cafe_tostado:+form.kg_cafe_tostado||0,catacion:form.catacion,responsable:form.responsable,codigo_lote_origen:form.codigo_lote_origen,fecha_proceso:form.fecha_proceso,fecha_trilla:form.fecha_trilla,fecha_secado:form.fecha_secado,lotes_blend:[]},...p]);
    }
    setModal(false);
  };
  const totalKgTostar=blendsTostado.reduce((s,t)=>s+(t.kg_a_tostar||0),0);
  const totalKgTostado=blendsTostado.reduce((s,t)=>s+(t.kg_cafe_tostado||0),0);
  const rendProm=totalKgTostar>0?((totalKgTostado/totalKgTostar)*100).toFixed(1):0;
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.purple,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PROCESO DE TOSTACION</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>UBA Tostado</div></div><button style={{...S.btn,background:C.purple}} onClick={abrirNuevo}>+ Nueva Tostacion</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Tostaciones" value={blendsTostado.length} col={C.navy}/>
      <KPI label="kg a Tostar" value={fmt(totalKgTostar)+" kg"} col={C.accent}/>
      <KPI label="kg Cafe Tostado" value={fmt(totalKgTostado)+" kg"} col={C.green}/>
      <KPI label="Rendimiento Prom." value={rendProm+"%"} col={C.gold}/>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Registros de Tostacion</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1500}}><thead><tr>{["Codigo","Fecha","Producto","Trazabilidad","kg a Tostar","Valor Unit.","Valor Total","Temp.","Tiempo","Tipo Tostión","kg Tostado","Rend.","Stock kg","Catacion","Responsable","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{blendsTostado.map(t=>{const stock=stockTostado(t);return(<tr key={t.id}>
        <td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{t.codigo||"-"}</td>
        <td style={{...S.td,color:C.textDim}}>{t.fecha}</td>
        <td style={{...S.td,fontWeight:600}}>{t.nombre_producto||"-"}</td>
        <td style={S.td}><div style={{display:"flex",flexDirection:"column",gap:2,fontSize:10}}>
          {t.codigo_lote_origen&&<span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>Lote: {t.codigo_lote_origen}</span>}
          {t.fecha_proceso&&<span style={{color:C.textDim}}>Proceso: {t.fecha_proceso}</span>}
          {t.fecha_trilla&&<span style={{color:C.textDim}}>Trilla: {t.fecha_trilla}</span>}
          {t.fecha_secado&&<span style={{color:C.textDim}}>Secado: {t.fecha_secado}</span>}
          {(t.lotes_blend||[]).length>0&&<span style={{color:C.purple}}>Blend: {t.lotes_blend.join(", ")}</span>}
          {!t.codigo_lote_origen&&!t.fecha_proceso&&!t.fecha_trilla&&!t.fecha_secado&&!(t.lotes_blend||[]).length&&"-"}
        </div></td>
        <td style={{...S.td,color:C.accent,fontWeight:600}}>{fmt(t.kg_a_tostar)} kg</td>
        <td style={{...S.td,color:C.gold}}>{fmtCOP(t.valor_unitario)}</td>
        <td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(t.valor_total)}</td>
        <td style={S.td}>{t.temperatura?t.temperatura+"°C":"-"}</td>
        <td style={S.td}>{t.tiempo||"-"}</td>
        <td style={S.td}><Bdg label={t.tipo_tostion||"-"} col={C.orange} bg={C.orangeBg}/></td>
        <td style={{...S.td,color:C.green,fontWeight:700}}>{t.kg_cafe_tostado?fmt(t.kg_cafe_tostado)+" kg":"-"}</td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{t.kg_a_tostar&&t.kg_cafe_tostado?((t.kg_cafe_tostado/t.kg_a_tostar)*100).toFixed(1)+"%":"-"}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.textFaint,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.catacion||"-"}</td>
        <td style={S.td}>{t.responsable||"-"}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaUBA(t)}>+ Salida</button><button style={S.btnG} onClick={()=>abrirEditar(t)}>Editar</button></div></td>
      </tr>);})}</tbody></table></div>
      {blendsTostado.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin tostaciones registradas todavia.</div>}
    </div>

    {modalSalidaUBA&&selTost&&(<Modal title={"Salida de Cafe Tostado - "+selTost.codigo} onClose={()=>{setModalSalidaUBA(false);setErrSalidaUBA("");}}>
      <div style={{background:C.purpleBg,border:"1px solid "+C.purple+"30",borderRadius:6,padding:"12px 14px",marginBottom:14}}>
        <div style={{color:C.purple,fontWeight:700}}>{selTost.codigo} - {selTost.nombre_producto}</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Stock disponible: <b style={{color:C.green,fontSize:15}}>{fmt(stockTostado(selTost))} kg</b></div>
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
    {modal&&(<Modal title={editId?"Editar Tostacion":"Nueva Tostacion"} onClose={()=>setModal(false)} wide>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Nombre Producto Comercial" half><input style={S.input} value={form.nombre_producto} onChange={e=>setForm(p=>({...p,nombre_producto:e.target.value}))}/></Fld>
        <Fld label="Codigo de Lote Origen" half><input style={S.input} value={form.codigo_lote_origen} onChange={e=>setForm(p=>({...p,codigo_lote_origen:e.target.value}))}/></Fld>
        <Fld label="Fecha de Proceso" third><input style={S.input} type="date" value={form.fecha_proceso} onChange={e=>setForm(p=>({...p,fecha_proceso:e.target.value}))}/></Fld>
        <Fld label="Fecha de Trilla" third><input style={S.input} type="date" value={form.fecha_trilla} onChange={e=>setForm(p=>({...p,fecha_trilla:e.target.value}))}/></Fld>
        <Fld label="Fecha de Secado" third><input style={S.input} type="date" value={form.fecha_secado} onChange={e=>setForm(p=>({...p,fecha_secado:e.target.value}))}/></Fld>
        <Fld label="kg a Tostar" half><input style={S.input} type="number" value={form.kg_a_tostar} onChange={e=>setForm(p=>({...p,kg_a_tostar:e.target.value,valor_total:(+e.target.value||0)*(+p.valor_unitario||0)||""}))}/></Fld>
        <Fld label="Valor Unitario ($/kg)" half><input style={S.input} type="number" value={form.valor_unitario} onChange={e=>setForm(p=>({...p,valor_unitario:e.target.value,valor_total:(+form.kg_a_tostar||0)*(+e.target.value||0)||""}))}/></Fld>
        <Fld label="Valor Total" half><input style={{...S.input,background:C.panel2,color:C.gold,fontWeight:600}} type="number" value={form.valor_total} onChange={e=>setForm(p=>({...p,valor_total:e.target.value}))}/></Fld>
        <Fld label="Temperatura (°C)" half><input style={S.input} type="number" value={form.temperatura} onChange={e=>setForm(p=>({...p,temperatura:e.target.value}))}/></Fld>
        <Fld label="Tiempo (min)" half><input style={S.input} type="number" value={form.tiempo} onChange={e=>setForm(p=>({...p,tiempo:e.target.value}))}/></Fld>
        <Fld label="Tipo de Tostión" half><select style={S.select} value={form.tipo_tostion} onChange={e=>setForm(p=>({...p,tipo_tostion:e.target.value}))}>{TIPOS_TOSTION.map(t=>(<option key={t}>{t}</option>))}</select></Fld>
        <Fld label="kg Cafe Tostado (resultado)" half><input style={S.input} type="number" value={form.kg_cafe_tostado} onChange={e=>setForm(p=>({...p,kg_cafe_tostado:e.target.value}))}/>{form.kg_cafe_tostado&&form.kg_a_tostar&&<div style={{color:C.teal,fontSize:11,marginTop:4}}>Rendimiento: {((+form.kg_cafe_tostado/+form.kg_a_tostar)*100).toFixed(1)}%</div>}</Fld>
        <Fld label="Responsable" half><input style={S.input} value={form.responsable} onChange={e=>setForm(p=>({...p,responsable:e.target.value}))}/></Fld>
      </div>
      <Fld label="Catacion"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.catacion} onChange={e=>setForm(p=>({...p,catacion:e.target.value}))}/></Fld>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={reg}>{editId?"Guardar Cambios":"Registrar Tostacion"}</button></div>
    </Modal>)}
  </div>);
}

// FIX 3: Trazabilidad con fecha secado, reactor, silo, humedad
function Trazabilidad({lotes,costos,blends}){
  const [tab,setTab]=useState("lotes");
  const [q,setQ]=useState("");
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroTipo,setFiltroTipo]=useState("");
  const [filtroMesOp,setFiltroMesOp]=useState("");
  const [filtroProductoOp,setFiltroProductoOp]=useState("");
  const [filtroProductoComercialOp,setFiltroProductoComercialOp]=useState("");
  const PASOS=["Recepcion","Proceso","Secado","Bodega","Finalizado","Cerrado"];
  const productosDeBlendTz=(b)=>[...new Set(b.items.map(it=>lotes.find(x=>x.id===it.reprId)?.producto).filter(Boolean))];
  const mesesOp=[...new Set(lotes.map(l=>l.mes).filter(Boolean))].sort();
  const productosOp=[...new Set(lotes.map(l=>l.producto).filter(Boolean))].sort();
  const productosComercialesOp=[...new Set((blends||[]).map(b=>b.producto_comercial).filter(Boolean))].sort();
  const lotesOpFiltrados=lotes.filter(l=>{
    if(filtroMesOp&&l.mes!==filtroMesOp)return false;
    if(filtroProductoOp&&l.producto!==filtroProductoOp)return false;
    return true;
  });
  const blendsOpFiltrados=(blends||[]).filter(b=>{
    if(filtroMesOp&&mesDe(b.fecha)!==filtroMesOp)return false;
    if(filtroProductoComercialOp&&b.producto_comercial!==filtroProductoComercialOp)return false;
    if(filtroProductoOp&&!productosDeBlendTz(b).includes(filtroProductoOp))return false;
    return true;
  });
  const meses=[...new Set([...XD.lotes.map(l=>l.mes),...lotes.map(l=>l.mes)].filter(Boolean))].sort();
  const tipos=[...new Set([...XD.lotes.map(l=>l.tipo),...lotes.map(l=>l.tipo)].filter(Boolean))].sort();
  const xlotesF=useMemo(()=>XD.lotes.filter(l=>{if(filtroMes&&l.mes!==filtroMes)return false;if(filtroTipo&&l.tipo!==filtroTipo)return false;if(q){const fincas=(l.fin||[]).map(f=>f.f||"").join(" ").toLowerCase();if(!(l.cod||"").toLowerCase().includes(q.toLowerCase())&&!fincas.includes(q.toLowerCase())&&!(l.prod||"").toLowerCase().includes(q.toLowerCase()))return false;}return true;}),[q,filtroMes,filtroTipo]);

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>TRAZABILIDAD & COSTOS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Seguimiento en Tiempo Real</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>{XD.lotes.length} lotes del Excel + {lotes.length} lotes operativos</div></div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["lotes","Lotes Excel"],["costos","Analisis Costos"],["lotes_op","Lotes Operativos"],["blend_op","Blends"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {(tab==="lotes"||tab==="costos")&&(<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      <input style={{...S.input,flex:1,minWidth:200}} placeholder="Buscar codigo, finca, producto..." value={q} onChange={e=>setQ(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{meses.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}><option value="">Todos los tipos</option>{tipos.map(t=>(<option key={t}>{t}</option>))}</select>
      <span style={{color:C.textDim,fontSize:12,alignSelf:"center"}}>{xlotesF.length} lotes</span>
    </div>)}

    {(tab==="lotes_op"||tab==="blend_op")&&(<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
      <select style={{...S.select,width:150}} value={filtroMesOp} onChange={e=>setFiltroMesOp(e.target.value)}><option value="">Todos los meses</option>{mesesOp.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProductoOp} onChange={e=>setFiltroProductoOp(e.target.value)}><option value="">Todos los productos</option>{productosOp.map(p=>(<option key={p}>{p}</option>))}</select>
      {tab==="blend_op"&&<select style={{...S.select,width:180}} value={filtroProductoComercialOp} onChange={e=>setFiltroProductoComercialOp(e.target.value)}><option value="">Todo producto comercial</option>{productosComercialesOp.map(p=>(<option key={p}>{p}</option>))}</select>}
      <span style={{color:C.textDim,fontSize:12,alignSelf:"center"}}>{tab==="lotes_op"?lotesOpFiltrados.length:blendsOpFiltrados.length} resultados</span>
    </div>)}

    {/* FIX 3: Lotes Excel con fecha secado, reactor, silo, humedad */}
    {tab==="lotes"&&(<div style={S.card}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}><thead><tr>{["Codigo","Mes","Fincas","kg Cereza","kg Seco","Conv.","Fecha Sec.","Reactor","Silo","Humedad","Producto","a) MP/kg","b) Ins/kg","c) CB/kg","Total/kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{xlotesF.map((l,i)=>(<tr key={i}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{l.cod}</td>
        <td style={{...S.td,color:C.textDim,textTransform:"capitalize"}}>{l.mes}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{(l.fin||[]).map((f,j)=>(<span key={j} style={{background:C.tealBg,border:"1px solid "+C.teal+"30",borderRadius:3,color:C.teal,fontSize:10,padding:"1px 5px"}}>{f.f}</span>))}</div></td>
        <td style={{...S.td,fontWeight:600}}>{fmt(l.tkg)}</td>
        <td style={{...S.td,fontWeight:600,color:C.green}}>{l.kgp?fmt(l.kgp):"?"}</td>
        <td style={{...S.td,color:C.textDim}}>{l.conv?fmt(l.conv,2):"?"}</td>
        {/* FIX 3: fecha secado */}
        <td style={{...S.td,color:C.textDim,fontSize:11}}>{l.fs||"?"}</td>
        {/* FIX 3: reactor y silo - no en Excel data, mostrar "?" */}
        <td style={S.td}><span style={{color:C.textFaint,fontSize:11}}>-</span></td>
        <td style={S.td}><span style={{color:C.textFaint,fontSize:11}}>-</span></td>
        <td style={{...S.td,color:C.gold}}>{l.hum!=null?(+l.hum*100<1?fmt(+l.hum*100,1):fmt(l.hum,1))+"%":"?"}</td>
        <td style={S.td}><span style={{background:C.tealBg,border:"1px solid "+C.teal+"30",borderRadius:3,color:C.teal,fontSize:11,padding:"2px 7px",fontWeight:600}}>{l.prod}</span></td>
        <td style={{...S.td,color:C.orange}}>{fmtCOP(l.a)}</td>
        <td style={{...S.td,color:C.red}}>{fmtCOP(l.b)}</td>
        <td style={{...S.td,color:C.purple}}>{fmtCOP(l.c)}</td>
        <td style={{...S.td,fontWeight:700,color:l.tot?(l.tot>50000?C.red:C.green):C.textFaint}}>{fmtCOP(l.tot)}</td>
      </tr>))}</tbody></table></div></div>)}

    {tab==="lotes_op"&&(<div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:12}}>
      {lotesOpFiltrados.map(l=>{
        const kg=l.cereza.reduce((a,c)=>a+c.kg,0);const ei=PASOS.indexOf(l.estado);const cl=calcCosto(l,costos,lotes);
        const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=l.kg_producto-sal;
        const stockExcelso=(l.trilla?.kg_excelso||0)-(l.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0);
        return(<div key={l.id} style={{...S.card,marginBottom:0,borderLeft:"3px solid "+(ECOL[l.estado]||C.border)}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{l.codigo}</div><div style={{color:C.textDim,fontSize:11,marginTop:2}}>{l.tipo} - {l.producto}</div></div><Bdg label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{[...new Set(l.cereza.map(c=>c.finca))].map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div>
          {/* FIX 3: reactor, silo, fecha secado, humedad */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
            {[{l:"Reactor",v:l.equipo_ferm||"-",c:C.purple},{l:"Silo",v:l.equipo_secado||"-",c:C.teal},{l:"Fecha Secado",v:l.fecha_fin_secado||"-",c:C.textDim},{l:"Humedad",v:l.humedad?l.humedad+"%":"-",c:C.gold},{l:"kg Cereza Recibido",v:fmt(kg)+" kg",c:C.navy},{l:"kg Pergamino Producido",v:l.kg_producto?fmt(l.kg_producto)+" kg":"-",c:C.navy},{l:"Stock Bodega (Pergamino)",v:stock>0?fmt(stock)+" kg":"-",c:C.green},{l:"Excelso Trillado",v:l.trilla?.kg_excelso?fmt(l.trilla.kg_excelso)+" kg":"-",c:C.green},{l:"Stock Excelso",v:l.trilla?.kg_excelso?fmt(stockExcelso)+" kg":"-",c:stockExcelso>0?C.green:C.textFaint},{l:"Costo Final Excelso/kg",v:(()=>{const t=l.trilla;if(!cl||!(t?.kg_excelso>0))return"-";const D=calcCostoTri(l.mes,costos,lotes).costoTriKg;return fmtCOP(Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D));})(),c:C.purple}].map(d=>(<div key={d.l} style={{background:C.panel2,borderRadius:4,padding:"6px 8px"}}><div style={{color:C.textDim,fontSize:9,textTransform:"uppercase",marginBottom:1}}>{d.l}</div><div style={{color:d.c,fontWeight:600,fontSize:12}}>{d.v}</div></div>))}
          </div>
          {cl&&<div style={{background:C.goldBg,border:"1px solid "+C.gold+"30",borderRadius:6,padding:"8px 10px"}}><div style={{color:C.gold,fontWeight:700,fontSize:11,marginBottom:3}}>Costo por kg de Pergamino</div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><span style={{fontSize:11,color:C.textDim}}>Materia Prima: <b style={{color:C.navy}}>{fmtCOP(cl.a)}</b></span><span style={{fontSize:11,color:C.textDim}}>Insumos: <b style={{color:C.navy}}>{fmtCOP(cl.b)}</b></span><span style={{fontSize:11,color:C.textDim}}>Central Beneficio: <b style={{color:C.navy}}>{fmtCOP(cl.c)}</b></span><span style={{fontSize:11,color:C.textDim}}>Total: <b style={{color:C.gold,fontSize:13}}>{fmtCOP(cl.total)}</b></span></div></div>}
          <div style={{display:"flex",alignItems:"center",marginTop:12}}>{PASOS.map((p,i)=>{const done=i<=ei;const act=i===ei;const col=done?(ECOL[p]||C.accent):C.textFaint;return(<div key={p} style={{display:"flex",alignItems:"center",flex:1}}><div style={{width:18,height:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:done?col:C.bg,border:"2px solid "+(done?col:C.border),fontSize:8,fontWeight:700,color:done?C.white:C.textFaint,flexShrink:0,boxShadow:act?"0 0 0 3px "+col+"30":"none"}}>{done?"v":i+1}</div>{i<PASOS.length-1&&<div style={{flex:1,height:2,background:i<ei?C.accent:C.border,margin:"0 2px"}}/>}</div>);})}</div>
        </div>);
      })}
    </div></div>)}

    {tab==="blend_op"&&(<div>
      {blendsOpFiltrados.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>{(blends||[]).length===0?"Sin blends registrados todavia.":"Ningun blend coincide con el filtro."}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:12}}>
        {blendsOpFiltrados.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=b.kg_total-salKg;return(
          <div key={b.id} style={{...S.card,marginBottom:0,borderLeft:"3px solid "+C.purple}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{b.codigo}</div><div style={{color:C.textDim,fontSize:11,marginTop:2}}>{b.nombre} - Fecha Blend: {b.fecha}</div></div><Bdg label={fmt(stock)+" kg stock"} col={stock>0?C.green:C.red} bg={stock>0?C.greenBg:C.redBg}/></div>
            <div style={{fontWeight:600,fontSize:11,color:C.textDim,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Lotes Usados</div>
            {b.items.map(it=>{const loteRef=lotes.find(x=>x.id===it.reprId);const kgCereza=loteRef?loteRef.cereza.reduce((a,c)=>a+c.kg,0):null;return(<div key={it.key} style={{padding:"6px 0",borderBottom:"1px solid "+C.border,fontSize:12}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{it.codigo}</span>
                <span style={{color:C.textDim}}>{fmt(it.kg_usado)} kg</span>
                <span style={{color:C.gold}}>{fmtCOP(it.valor_kg)}/kg</span>
                <span style={{fontWeight:600}}>{fmtCOP(it.valor_total)}</span>
              </div>
              {loteRef&&(<div style={{display:"flex",gap:10,flexWrap:"wrap",color:C.textFaint,fontSize:10,marginTop:3}}>
                <span>Cereza: {fmt(kgCereza)} kg</span>
                <span>Pergamino: {fmt(loteRef.kg_producto)} kg</span>
                <span>F.Proceso: {loteRef.fecha_proceso||"—"}</span>
                <span>F.Secado: {loteRef.fecha_fin_secado||"—"}</span>
                <span>F.Trilla: {loteRef.trilla?.fecha_trilla||"—"}</span>
              </div>)}
            </div>);})}
            <div style={{background:C.navy,borderRadius:6,padding:"10px 12px",marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"rgba(255,255,255,0.8)",fontSize:12}}>kg Total: {fmt(b.kg_total)} | Costo Final/kg</span>
              <span style={{color:C.white,fontWeight:800,fontSize:16}}>{fmtCOP(Math.round(b.costo_kg))}</span>
            </div>
          </div>
        );})}
      </div>
    </div>)}

    {tab==="costos"&&(<div>{xlotesF.filter(l=>l.a).map((l,i)=>{const maxV=Math.max(l.a||0,l.b||0,l.c||0,1);return(<div key={i} style={{...S.card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div><div style={{fontFamily:"monospace",fontWeight:700,color:C.accent,fontSize:14}}>{l.cod}</div><div style={{color:C.textDim,fontSize:12,marginTop:2}}>{l.tipo} | {l.prod} | {l.mes}</div><div style={{marginTop:5,display:"flex",gap:3,flexWrap:"wrap"}}>{(l.fin||[]).map((f,j)=>(<span key={j} style={{background:C.tealBg,border:"1px solid "+C.teal+"30",borderRadius:3,color:C.teal,fontSize:11,padding:"2px 6px"}}>{f.f}</span>))}</div></div>
        <div style={{textAlign:"right"}}><div style={{color:C.textDim,fontSize:11}}>kg secos | Hum: {l.hum!=null?l.hum:"?"}</div><div style={{fontSize:20,fontWeight:700,color:C.navy}}>{fmt(l.kgp)} kg</div><div style={{color:C.textDim,fontSize:11}}>Fec. secado: {l.fs||"?"}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div style={{background:C.panel2,borderRadius:6,padding:"10px 12px"}}><div style={{color:C.textDim,fontSize:10,textTransform:"uppercase",marginBottom:3}}>Cereza Total</div><div style={{color:C.navy,fontWeight:700,fontSize:13}}>{fmtCOP(l.tcp)}</div></div>
        <div style={{background:C.panel2,borderRadius:6,padding:"10px 12px"}}><div style={{color:C.textDim,fontSize:10,textTransform:"uppercase",marginBottom:3}}>Insumos Total</div><div style={{color:C.navy,fontWeight:700,fontSize:13}}>{fmtCOP(l.tip)}</div></div>
        <div style={{background:C.panel2,borderRadius:6,padding:"10px 12px"}}><div style={{color:C.textDim,fontSize:10,textTransform:"uppercase",marginBottom:3}}>Conversion</div><div style={{color:C.navy,fontWeight:700,fontSize:13}}>{fmt(l.conv,2)}:1</div></div>
      </div>
      <div style={{background:C.panel2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px"}}>
        <div style={{fontWeight:600,color:C.navy,fontSize:12,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}}>Costo por kg de Cafe Seco</div>
        {[{lbl:"a) Materia Prima (Cereza)",v:l.a,col:C.orange},{lbl:"b) Insumos de Proceso",v:l.b,col:C.red},{lbl:"c) Central de Beneficio ("+l.mes+")",v:l.c,col:C.purple}].map((row,j)=>(<div key={j} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:C.textDim,fontSize:12}}>{row.lbl}</span><span style={{color:row.col,fontWeight:700,fontSize:13}}>{fmtCOP(row.v)}</span></div>
          <div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:row.col,width:maxV?(Math.min(100,(row.v||0)/maxV*100)):0+"%",height:"100%",borderRadius:4}}/></div>
        </div>))}
        <div style={{background:C.navy,borderRadius:8,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"rgba(255,255,255,0.8)",fontSize:13,fontWeight:600}}>a + b + c</span><span style={{color:C.white,fontWeight:800,fontSize:22}}>{fmtCOP(l.tot)}</span></div>
      </div>
    </div>);})}
    </div>)}

  </div>);
}

function Costos({costos,setCostos}){
  const [modal,setModal]=useState(false);const [editId,setEditId]=useState(null);const [form,setForm]=useState({fecha:today(),mes:MESES[new Date().getMonth()],tipo:TIPOS_COSTO[0],descripcion:"",valor:"",centro:CENTROS[0]});const [fil,setFil]=useState("todos");
  const blankFormC=()=>({fecha:today(),mes:MESES[new Date().getMonth()],tipo:TIPOS_COSTO[0],descripcion:"",valor:"",centro:CENTROS[0]});
  const abrirNuevoC=()=>{setEditId(null);setForm(blankFormC());setModal(true);};
  const abrirEditarC=(c)=>{setEditId(c.id);setForm({fecha:c.fecha,mes:c.mes,tipo:c.tipo,descripcion:c.descripcion,valor:c.valor,centro:c.centro});setModal(true);};
  const reg=()=>{
    if(!form.valor||!form.descripcion)return;
    if(editId){setCostos(p=>p.map(c=>c.id===editId?{...c,...form,valor:+form.valor}:c));}
    else{setCostos(p=>[{...form,id:genId(),valor:+form.valor},...p]);}
    setModal(false);setEditId(null);setForm(blankFormC());
  };
  const data=fil==="todos"?costos:costos.filter(c=>c.centro===fil);
  const total=data.reduce((s,c)=>s+c.valor,0);
  const porT={};data.forEach(c=>{porT[c.tipo]=(porT[c.tipo]||0)+c.valor;});
  const porC={};costos.forEach(c=>{porC[c.centro]=(porC[c.centro]||0)+c.valor;});
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>MODULO COSTOS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Registro de Costos Operativos</div></div><button style={S.btn} onClick={abrirNuevoC}>+ Nuevo Costo</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}><KPI label="Total Costos" value={fmtCOP(costos.reduce((s,c)=>s+c.valor,0))} col={C.red}/><KPI label="Central Beneficio" value={fmtCOP(porC["Central de Beneficio"]||0)} col={C.teal}/><KPI label="Trilladora" value={fmtCOP(porC["Trilladora"]||0)} col={C.purple}/><KPI label="Registros" value={costos.length} col={C.accent}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16,marginBottom:16}}>
      <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><div style={{fontWeight:600,fontSize:14,color:C.navy}}>Costos por Tipo</div><div style={{display:"flex",gap:6}}>{["todos",...CENTROS].map(c=>(<button key={c} style={{...S.btnG,background:fil===c?C.navy:"transparent",color:fil===c?C.white:C.textDim,fontSize:11,padding:"5px 12px"}} onClick={()=>setFil(c)}>{c==="todos"?"Todos":c}</button>))}</div></div>
        {Object.entries(porT).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>{const p=total?val/total*100:0;return(<div key={tipo} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:C.text}}>{tipo}</span><span style={{color:C.orange,fontWeight:600,fontSize:12}}>{fmtCOP(val)}</span></div><div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:C.orange,width:p+"%",height:"100%",borderRadius:4}}/></div></div>);})}
        <div style={{borderTop:"2px solid "+C.border,paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between"}}><span style={{color:C.navy,fontWeight:700}}>TOTAL</span><span style={{color:C.navy,fontSize:15,fontWeight:700}}>{fmtCOP(total)}</span></div>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Por Centro de Costo</div>{CENTROS.map(cc=>{const v=porC[cc]||0;const t=costos.reduce((s,c)=>s+c.valor,0);const p=t?v/t*100:0;return(<div key={cc} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontWeight:600,color:C.navy,fontSize:13}}>{cc}</span><span style={{color:cc==="Trilladora"?C.purple:C.teal,fontWeight:700,fontSize:14}}>{fmtCOP(v)}</span></div><div style={{background:C.bg,borderRadius:4,height:12,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:cc==="Trilladora"?C.purple:C.teal,width:p+"%",height:"100%",borderRadius:4}}/></div><div style={{color:C.textDim,fontSize:11,marginTop:3}}>{p.toFixed(1)}% del total</div></div>);})}</div>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Historial</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr>{["Fecha","Mes","Tipo","Descripcion","Centro","Valor",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{costos.map(c=>(<tr key={c.id}><td style={{...S.td,color:C.textDim}}>{c.fecha}</td><td style={{...S.td,color:C.textDim,textTransform:"capitalize"}}>{c.mes}</td><td style={S.td}><Bdg label={c.tipo} col={C.orange} bg={C.orangeBg}/></td><td style={{...S.td,color:C.text}}>{c.descripcion}</td><td style={S.td}><Bdg label={c.centro} col={c.centro==="Trilladora"?C.purple:C.teal} bg={c.centro==="Trilladora"?C.purpleBg:C.tealBg}/></td><td style={{...S.td,color:C.orange,fontWeight:700,textAlign:"right"}}>{fmtCOP(c.valor)}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarC(c)}>Editar</button></td></tr>))}</tbody></table></div></div>
    {modal&&(<Modal title={editId?"Editar Costo":"Registrar Nuevo Costo"} onClose={()=>{setModal(false);setEditId(null);}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Mes" half><select style={S.select} value={form.mes} onChange={e=>setForm(p=>({...p,mes:e.target.value}))}>{MESES.map(m=>(<option key={m}>{m}</option>))}</select></Fld>
        <Fld label="Centro de Costo" half><select style={S.select} value={form.centro} onChange={e=>setForm(p=>({...p,centro:e.target.value}))}>{CENTROS.map(c=>(<option key={c}>{c}</option>))}</select></Fld>
        <Fld label="Tipo de Costo" half><select style={S.select} value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>{TIPOS_COSTO.map(t=>(<option key={t}>{t}</option>))}</select></Fld>
        <Fld label="Descripcion"><input style={S.input} value={form.descripcion} placeholder="Detalle del gasto" onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))}/></Fld>
        <Fld label="Valor COP"><input style={S.input} type="number" value={form.valor} placeholder="0" onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModal(false);setEditId(null);}}>Cancelar</button><button style={S.btn} onClick={reg}>{editId?"Guardar Cambios":"Registrar Costo"}</button></div>
    </Modal>)}
  </div>);
}

function Usuarios({usuarios,setUsuarios}){
  const [modal,setModal]=useState(false);const [editId,setEditId]=useState(null);const [form,setForm]=useState({nombre:"",email:"",rol:"Operario Beneficio"});const [err,setErr]=useState("");
  const ROLES=["Gerente","Supervisor","Operario Beneficio","Trilladore","Analista Calidad","Conductor"];
  const blankFormU=()=>({nombre:"",email:"",rol:"Operario Beneficio"});
  const abrirNuevoU=()=>{setEditId(null);setForm(blankFormU());setErr("");setModal(true);};
  const abrirEditarU=(u)=>{setEditId(u.id);setForm({nombre:u.nombre,email:u.email,rol:u.rol});setErr("");setModal(true);};
  const agregar=()=>{
    if(!form.nombre||!form.email){setErr("Nombre y correo son obligatorios.");return;}
    if(!form.email.includes("@")){setErr("Ingresa un correo valido.");return;}
    if(usuarios.some(u=>u.email?.toLowerCase()===form.email.toLowerCase()&&u.id!==editId)){setErr("Correo ya registrado.");return;}
    if(editId){setUsuarios(p=>p.map(u=>u.id===editId?{...u,...form}:u));}
    else{setUsuarios(p=>[...p,{...form,id:genId(),activo:true}]);}
    setModal(false);setErr("");setForm(blankFormU());
  };
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.accent,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>GESTION DE ACCESO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Usuarios del Sistema</div></div><button style={S.btn} onClick={abrirNuevoU}>+ Nuevo Usuario</button></div>
    <div style={S.card}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:550}}><thead><tr>{["#","Nombre","Email","Rol","Estado","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{usuarios.map(u=>(<tr key={u.id}><td style={{...S.td,color:C.textFaint}}>{u.id}</td><td style={{...S.td,fontWeight:600,color:C.navy}}>{u.nombre}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{u.email}</td><td style={S.td}><Bdg label={u.rol} col={C.accent} bg={C.accentBg}/></td><td style={S.td}><Bdg label={u.activo?"Activo":"Inactivo"} col={u.activo?C.green:C.red} bg={u.activo?C.greenBg:C.redBg}/></td><td style={S.td}><div style={{display:"flex",gap:6}}><button style={S.btnG} onClick={()=>setUsuarios(p=>p.map(x=>x.id===u.id?{...x,activo:!x.activo}:x))}>{u.activo?"Desactivar":"Activar"}</button><button style={S.btnG} onClick={()=>abrirEditarU(u)}>Editar</button></div></td></tr>))}</tbody></table></div></div>
    {modal&&(<Modal title={editId?"Editar Usuario":"Nuevo Usuario Autorizado"} onClose={()=>{setModal(false);setErr("");}}><div style={{color:C.textDim,fontSize:12,marginBottom:14,padding:"8px 12px",background:C.accentBg,borderRadius:6}}>El usuario debe ingresar con su cuenta Google al correo registrado aqui.</div><Fld label="Nombre Completo"><input style={S.input} value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}/></Fld><Fld label="Correo Google (Gmail o corporativo)"><input style={S.input} type="email" placeholder="usuario@gmail.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value.toLowerCase()}))}/></Fld><Fld label="Rol"><select style={S.select} value={form.rol} onChange={e=>setForm(p=>({...p,rol:e.target.value}))}>{ROLES.map(r=>(<option key={r}>{r}</option>))}</select></Fld>{err&&<div style={{color:C.red,fontSize:12,marginBottom:10,padding:"8px 12px",background:C.redBg,borderRadius:4}}>{err}</div>}<div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModal(false);setErr("");}}>Cancelar</button><button style={S.btn} onClick={agregar}>{editId?"Guardar Cambios":"Agregar Usuario"}</button></div></Modal>)}
  </div>);
}

function GoogleLogin({notAuthorized}){
  const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const handle=async()=>{setLoading(true);setErr("");try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){if(e.code!=="auth/popup-closed-by-user")setErr("Error al iniciar sesion. Intenta de nuevo.");setLoading(false);}};
  return(<div style={{...S.app,display:"flex",minHeight:"100vh"}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <div style={{width:"50%",background:"linear-gradient(145deg,#1E3A5F 0%,#2D5F8A 50%,#0E7490 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48}}>
      <div style={{textAlign:"center",maxWidth:380}}>
        <div style={{width:220,height:220,borderRadius:"50%",background:C.white,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 32px",boxShadow:"0 16px 48px rgba(0,0,0,0.3)",padding:22}}>
          <img src="/logo-cafeuba.png" alt="CafeUba" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
        </div>
        <div style={{color:"rgba(255,255,255,0.8)",fontSize:14,marginBottom:36,lineHeight:1.7,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600}}>Central de Beneficio<br/>Plan Milan</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["&#127807;","Recepcion"],["&#9881;","Proceso"],["&#9728;","Secado"],["&#9989;","Trilla"]].map(([ic,lb])=>(<div key={lb} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.15)"}}><span dangerouslySetInnerHTML={{__html:ic}} style={{fontSize:20}}/><div style={{color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:5,fontWeight:500}}>{lb}</div></div>))}</div>
      </div>
    </div>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:48,background:C.bg}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{marginBottom:32}}><div style={{color:C.navy,fontSize:26,fontWeight:700,marginBottom:5}}>Bienvenido</div><div style={{color:C.textDim,fontSize:13}}>Accede con tu cuenta Google corporativa</div></div>
        <div style={{...S.card,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
          {notAuthorized&&<div style={{color:C.red,fontSize:12,marginBottom:16,padding:"10px 12px",background:C.redBg,borderRadius:6}}>Tu cuenta Google no tiene acceso. Pide al administrador que agregue tu correo en la seccion Usuarios.</div>}
          {err&&<div style={{color:C.red,fontSize:12,marginBottom:12,padding:"10px 12px",background:C.redBg,borderRadius:6}}>{err}</div>}
          <button style={{background:C.white,border:"1px solid #dadce0",borderRadius:8,color:"#3c4043",cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:500,gap:10,padding:"11px 20px",width:"100%",opacity:loading?0.7:1}} onClick={handle} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {loading?"Iniciando sesion...":"Iniciar sesion con Google"}
          </button>
        </div>
      </div>
    </div>
  </div>);
}

const NAV=[{k:"dashboard",l:"Dashboard",icon:"&#9647;"},{k:"sep1",sep:true},{k:"procesamiento",l:"Procesamiento",icon:"&#8857;"},{k:"bodega",l:"Bodega Milan",icon:"&#127968;"},{k:"trilla",l:"Trilla",icon:"&#9881;"},{k:"bodega_tri",l:"Bodega Trilladora",icon:"&#9733;"},{k:"blend",l:"Blend",icon:"&#9737;"},{k:"sep2",sep:true},{k:"bodega_fino",l:"Bodega Cafe Fino",icon:"&#127968;"},{k:"trilladora_fino",l:"Trilladora Cafe Fino",icon:"&#9881;"},{k:"blend_fino",l:"Blend Cafe Fino",icon:"&#9737;"},{k:"sep4",sep:true},{k:"maquila",l:"Maquila",icon:"&#9874;"},{k:"uba_tostado",l:"UBA Tostado",icon:"&#9745;"},{k:"sep2b",sep:true},{k:"trazabilidad",l:"Trazabilidad",icon:"&#128202;"},{k:"costos",l:"Reg. Costos",icon:"$"},{k:"sep3",sep:true},{k:"usuarios",l:"Usuarios",icon:"&#8853;"}];

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
  if(!loggedIn)return(<><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/><GoogleLogin notAuthorized={notAuthorized}/></>);
  const VIEWS={dashboard:()=><Dashboard lotes={lotes} costos={costos}/>,procesamiento:()=><Procesamiento lotes={lotes} setLotes={setLotes} costos={costos}/>,bodega:()=><Bodega lotes={lotes} setLotes={setLotes} costos={costos} setLotesFino={setLotesFino}/>,trilla:()=><Trilla lotes={lotes} setLotes={setLotes} costos={costos}/>,bodega_tri:()=><BodegaTrilladora lotes={lotes} setLotes={setLotes} costos={costos} setLotesFino={setLotesFino}/>,blend:()=><Blend lotes={lotes} setLotes={setLotes} blends={blends} setBlends={setBlends} costos={costos} setLotesFino={setLotesFino}/>,bodega_fino:()=><BodegaFino lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsFino={setBlendsFino} setBlendsTostado={setBlendsTostado}/>,trilladora_fino:()=><TrilladoraFino lotesFino={lotesFino} setLotesFino={setLotesFino}/>,blend_fino:()=><BlendFino lotesFino={lotesFino} setLotesFino={setLotesFino} blendsFino={blendsFino} setBlendsFino={setBlendsFino}/>,maquila:()=><Maquila maquilas={maquilas} setMaquilas={setMaquilas} setLotesFino={setLotesFino}/>,uba_tostado:()=><UbaTostado blendsTostado={blendsTostado} setBlendsTostado={setBlendsTostado}/>,trazabilidad:()=><Trazabilidad lotes={lotes} costos={costos} blends={blends}/>,costos:()=><Costos costos={costos} setCostos={setCostos}/>,usuarios:()=><Usuarios usuarios={usuarios} setUsuarios={setUsuarios}/>};
  const View=VIEWS[view]||VIEWS.dashboard;
  return(<><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <div style={S.app}>
      <div style={S.topbar}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:34,height:34,borderRadius:"50%",background:C.white,display:"flex",alignItems:"center",justifyContent:"center",padding:4,flexShrink:0}}><img src="/logo-cafeuba.png" alt="CafeUba" style={{width:"100%",height:"100%",objectFit:"contain"}}/></div><div><div style={{color:C.white,fontWeight:700,fontSize:14}}>CafeUba</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:9,letterSpacing:1}}>CENTRAL DE BENEFICIO</div></div></div>
        <div style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:500}}>Dashboard Gerencial - Plan Milan</div>
        <div style={{display:"flex",alignItems:"center",gap:14}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:"#4ADE80"}}/><span style={{color:"rgba(255,255,255,0.7)",fontSize:11,fontWeight:500}}>EN VIVO</span></div><div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>{new Date().toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}</div><button onClick={()=>exportarTodoExcel(lotes,costos,blends,lotesFino,blendsFino,maquilas,blendsTostado)} style={{background:"#166534",border:"1px solid #22c55e55",borderRadius:6,color:"#4ADE80",fontSize:11,fontWeight:700,padding:"5px 12px",cursor:"pointer",letterSpacing:0.5}}>⬇ Excel</button></div>
      </div>
      <div style={S.sidebar}>
        <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>{NAV.map((item)=>item.sep?(<div key={item.k} style={{height:1,background:C.border,margin:"6px 6px"}}/>):(<div key={item.k} onClick={()=>setView(item.k)} style={{padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderRadius:6,marginBottom:2,background:view===item.k?C.accentBg:"transparent",color:view===item.k?C.navy:C.textDim,fontSize:13,fontWeight:view===item.k?600:400,borderLeft:view===item.k?"3px solid "+C.accent:"3px solid transparent"}}><span dangerouslySetInnerHTML={{__html:item.icon}} style={{fontSize:14,width:18,textAlign:"center"}}/>{item.l}</div>))}</nav>
        <div style={{padding:"12px 14px",borderTop:"1px solid "+C.border}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:34,height:34,borderRadius:"50%",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.white,flexShrink:0}}>{user?.nombre?.charAt(0)}</div><div style={{overflow:"hidden"}}><div style={{color:C.navy,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.nombre}</div><div style={{color:C.textDim,fontSize:10}}>{user?.rol}</div></div></div><button style={{...S.btnG,width:"100%",textAlign:"center",fontSize:12}} onClick={()=>{fbSignOut(auth);setLoggedIn(false);setUser(null);}}>Cerrar Sesion</button></div>
      </div>
      <div style={S.main}><View/></div>
    </div>
  </>);
}
