import{useState,useMemo,useEffect,useRef,useLayoutEffect}from"react";
import*as XLSX from"xlsx";
import{auth}from"./firebase";
import{signInWithPopup,GoogleAuthProvider,onAuthStateChanged,signOut as fbSignOut,signInWithEmailAndPassword,sendPasswordResetEmail,createUserWithEmailAndPassword,getAuth as fbGetAuth}from"firebase/auth";
import{initializeApp as fbInitApp,deleteApp as fbDeleteApp}from"firebase/app";
import{cfg}from"./firebase";
import{useFirestoreList}from"./useFirestoreList";

/* ─── EXCEL DATA (pre-processed) ─────────────────────────────────────────── */
const XD={lotes:[],bodega:[],salidas:[],trilla:[],ventas_v:[],ventas_m:[],cb_mes:{},kg_mes:{},c_mes:{}};


/* ─── PALETA ──────────────────────────────────────────────────────────────── */
const C={bg:"#F4F6F9",panel:"#FFFFFF",panel2:"#F8FAFC",border:"#E2E8F0",border2:"#CBD5E1",navy:"#1E3A5F",accent:"#2563EB",accentBg:"#EFF6FF",gold:"#B45309",goldBg:"#FFFBEB",green:"#15803D",greenBg:"#F0FDF4",red:"#DC2626",redBg:"#FEF2F2",orange:"#C2410C",orangeBg:"#FFF7ED",teal:"#0E7490",tealBg:"#ECFEFF",purple:"#7C3AED",purpleBg:"#F5F3FF",text:"#0F172A",textDim:"#64748B",textFaint:"#94A3B8",white:"#FFFFFF"};
const fmtCOP=n=>n==null||n===""?"":"$ "+Number(n).toLocaleString("es-CO",{minimumFractionDigits:1,maximumFractionDigits:1});
const fmt=(n,d=0)=>n==null?"":Number(n).toLocaleString("es-CO",{minimumFractionDigits:d,maximumFractionDigits:d});
const today=()=>new Date().toISOString().slice(0,10);
const genId=()=>Math.random().toString(36).slice(2,8).toUpperCase();
const semanaISO=(d)=>{if(!d)return"";const dt=new Date(d+"T00:00:00");dt.setHours(0,0,0,0);dt.setDate(dt.getDate()+3-((dt.getDay()+6)%7));const w1=new Date(dt.getFullYear(),0,4);return 1+Math.round(((dt-w1)/86400000-3+((w1.getDay()+6)%7))/7);};
const mesDe=(d)=>d?MESES[new Date(d+"T00:00:00").getMonth()]:"";
const diasEntre=(a,b)=>a&&b?Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000):null;
const dateToCode=(d)=>{if(!d)return"";const[y,m,dd]=d.split("-");return dd+m+y;};
const fmtFecha=(d)=>{if(!d||typeof d!=="string")return"—";const p=d.split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:d;};
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
const CENTROS=["Central de Beneficio","Trilladora","Tostado","Maquila","Bodega Cafe Fino"];
const CENTRO_COL={"Central de Beneficio":C.teal,"Trilladora":C.purple,"Tostado":C.orange,"Maquila":C.gold,"Bodega Cafe Fino":C.green};
const CENTRO_BG={"Central de Beneficio":C.tealBg,"Trilladora":C.purpleBg,"Tostado":C.orangeBg,"Maquila":C.goldBg,"Bodega Cafe Fino":C.greenBg};
const ECOL={"Recepcion":C.teal,"Proceso":C.orange,"Secado":C.gold,"Bodega":C.accent,"Finalizado":C.green,"Cerrado":C.purple};
const EBG={"Recepcion":C.tealBg,"Proceso":C.orangeBg,"Secado":C.goldBg,"Bodega":C.accentBg,"Finalizado":C.greenBg,"Cerrado":C.purpleBg};
const USERS_SEED=[{id:"u1",nombre:"Dario Quema",email:"dario.quema@cafeuba.com.co",rol:"Gerente",activo:true},{id:"u2",nombre:"Liliana Gomez",email:"l.gomez@cafeuba.com.co",rol:"Operario Beneficio",activo:true},{id:"u3",nombre:"Andres Perez",email:"a.perez@cafeuba.com.co",rol:"Trilladore",activo:true},{id:"u4",nombre:"Maria Torres",email:"m.torres@cafeuba.com.co",rol:"Analista Calidad",activo:true}];
const seedL=()=>[];
const seedC=()=>[];

// Calculo costo lote (a + b + c)
const calcCosto=(lote,costos,lotes)=>{
  if(!lote.kg_producto||lote.kg_producto===0)return null;
  if(lote.origen_lote==="carga_directa"){const dk=lote.costo_directo_kg||0;return{totalCereza:0,totalIns:0,a:dk,b:0,c:0,total:dk};}
  const totalCereza=(lote.cereza||[]).reduce((s,c)=>s+c.kg*c.valor_kg,0);
  const ins=lote.insumos||{};
  const totalIns=(ins.jugo||0)*(ins.vr_jugo||0)+(ins.panela||0)*(ins.vr_panela||0)+(ins.harina||0)*(ins.vr_harina||0)+(ins.levadura||0)*(ins.vr_levadura||0);
  const a=totalCereza/lote.kg_producto;
  const b=totalIns/lote.kg_producto;
  // c: solo aplica a lotes que pasaron por CB (no a lotes manuales de trilla externa)
  let c_val=0;
  if(lote.origen_lote!=="trilla_directa"){
    const costosCBMes=(costos||[]).filter(c=>c.centro==="Central de Beneficio"&&c.mes===lote.mes).reduce((s,c)=>s+c.valor,0);
    const kgPergaminoMes=(lotes||[lote]).filter(l=>l.mes===lote.mes&&l.kg_producto>0&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual"&&l.origen_lote!=="carga_directa").reduce((s,l)=>s+l.kg_producto,0);
    c_val=kgPergaminoMes>0?costosCBMes/kgPergaminoMes:0;
  }
  return{totalCereza,totalIns,a,b,c:c_val,total:a+b+c_val};
};

// Costo trilladora por kg excelso del mes
const calcCostoTri=(mes,costos,lotes)=>{
  const costosTri=(costos||[]).filter(c=>c.centro==="Trilladora"&&c.mes===mes).reduce((s,c)=>s+c.valor,0);
  const kgEx=lotes.filter(l=>l.mes===mes&&l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  return{costosTri,kgEx,costoTriKg:kgEx>0?costosTri/kgEx:0};
};

const S={app:{fontFamily:"'Inter','Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",color:C.text,fontSize:14},topbar:{height:56,background:C.navy,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"fixed",top:0,left:0,right:0,zIndex:200,boxShadow:"0 2px 12px rgba(0,0,0,0.2)"},sidebar:{width:224,background:C.panel,borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",position:"fixed",top:56,left:0,height:"calc(100vh - 56px)",zIndex:100,boxShadow:"2px 0 8px rgba(0,0,0,0.05)"},main:{marginLeft:224,marginTop:56,padding:"28px 32px",minHeight:"calc(100vh - 56px)"},card:{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"20px 24px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"},card2:{background:C.panel2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px"},input:{background:C.white,border:"1px solid "+C.border2,borderRadius:6,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:13,padding:"9px 12px",width:"100%",outline:"none",boxSizing:"border-box"},select:{background:C.white,border:"1px solid "+C.border2,borderRadius:6,color:C.text,fontFamily:"'Inter',sans-serif",fontSize:13,padding:"9px 12px",width:"100%",outline:"none"},btn:{background:C.navy,border:"none",borderRadius:6,color:C.white,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:600,padding:"9px 20px"},btnG:{background:"transparent",border:"1px solid "+C.border2,borderRadius:6,color:C.textDim,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,padding:"7px 14px"},th:{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",padding:"10px 14px",textAlign:"left",borderBottom:"2px solid "+C.border,background:C.panel2,whiteSpace:"nowrap"},td:{padding:"11px 14px",borderBottom:"1px solid "+C.border,fontSize:13,verticalAlign:"middle",whiteSpace:"nowrap"},lbl:{color:C.textDim,fontSize:11,fontWeight:500,letterSpacing:.4,textTransform:"uppercase",marginBottom:5,display:"block"}};
const tg=(col,bg)=>({background:bg||col+"15",border:"1px solid "+col+"30",borderRadius:4,color:col,fontSize:11,fontWeight:600,padding:"3px 8px",display:"inline-block",whiteSpace:"nowrap"});
const Bdg=({label,col,bg})=><span style={tg(col||C.accent,bg)}>{label||"?"}</span>;
const Fld=({label,children,half,third})=>{const w=third?"calc(33.3% - 8px)":half?"calc(50% - 6px)":"100%";return(<div style={{marginBottom:13,width:w,display:"inline-block",verticalAlign:"top",marginRight:half||third?"12px":"0"}}><label style={S.lbl}>{label}</label>{children}</div>);};
// Claves fijas de destino (no dependen de texto/tildes) — usar SIEMPRE destino_key para logica de traslados, "cliente" solo es texto para mostrar
const DESTINOS_SALIDA=[{key:"trilla",label:"Trilla"},{key:"blend",label:"Blend"},{key:"bodega_cf",label:"Bodega Cafe Fino"},{key:"trilla_cf",label:"Trilladora Cafe Fino"},{key:"blend_cf",label:"Blend Cafe Fino"},{key:"uba_tostado",label:"UBA Tostado"},{key:"otro",label:"Otro"}];
const destinoLabel=(key)=>DESTINOS_SALIDA.find(d=>d.key===key)?.label||"";
const SelectDestino=({value,destinoKey,onChange})=>{const esOtro=!destinoKey||destinoKey==="otro";return(<div><select style={S.select} value={esOtro?"otro":destinoKey} onChange={e=>{const k=e.target.value;onChange(k==="otro"?"":destinoLabel(k)||value,k);}}>{DESTINOS_SALIDA.map(d=>(<option key={d.key} value={d.key}>{d.label}</option>))}</select>{esOtro&&<input style={{...S.input,marginTop:6}} placeholder="Nombre del destino externo..." value={value} onChange={e=>onChange(e.target.value,"otro")}/>}</div>);};
function KPI({label,value,sub,col,icon}){const c=col||C.accent;return(<div style={{...S.card,marginBottom:0,borderTop:"3px solid "+c}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><span style={{color:C.textDim,fontSize:11,fontWeight:500,textTransform:"uppercase"}}>{label}</span>{icon&&<span style={{fontSize:18,opacity:.6}}>{icon}</span>}</div><div style={{color:C.navy,fontSize:22,fontWeight:700,lineHeight:1,marginBottom:4}}>{value}</div>{sub&&<div style={{color:C.textFaint,fontSize:11,marginTop:3}}>{sub}</div>}</div>);}
function KPIDoble({label,kgVal,valorVal,col,icon}){const c=col||C.accent;return(<div style={{...S.card,marginBottom:0,borderTop:"3px solid "+c,display:"flex",flexDirection:"column"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}><span style={{color:C.textDim,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5}}>{label}</span>{icon&&<span style={{fontSize:15,opacity:.5}}>{icon}</span>}</div><div style={{marginBottom:10}}><div style={{color:C.textFaint,fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Kilogramos</div><div style={{color:C.navy,fontSize:22,fontWeight:700,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{kgVal}</div></div><div style={{borderTop:"1px solid "+C.border,paddingTop:10}}><div style={{color:C.textFaint,fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Valor Total</div><div style={{color:c,fontSize:15,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{valorVal}</div></div></div>);}
function Bar({label,value,max,col}){const c=col||C.accent;const p=Math.min(100,(value/max)*100)||0;return(<div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:C.text,fontSize:12}}>{label}</span><span style={{color:c,fontSize:12,fontWeight:600}}>{fmt(value)} kg</span></div><div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:c,width:p+"%",height:"100%",borderRadius:4}}/></div></div>);}
function Modal({title,onClose,children,wide}){return(<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:C.panel,border:"1px solid "+C.border,borderRadius:12,padding:28,width:wide?900:580,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:14,borderBottom:"1px solid "+C.border}}><span style={{color:C.navy,fontWeight:700,fontSize:15}}>{title}</span><button style={{...S.btnG,padding:"4px 10px",fontSize:15}} onClick={onClose}>x</button></div>{children}</div></div>);}

function AutoFitText({text,minSize=9,style}){
  const ref=useRef(null);
  useLayoutEffect(()=>{
    const el=ref.current;if(!el||!el.parentElement)return;
    const par=el.parentElement;
    let size=13;el.style.fontSize=size+"px";
    const pad=(parseInt(getComputedStyle(par).paddingLeft)||0)+(parseInt(getComputedStyle(par).paddingRight)||0);
    const avail=Math.max(par.clientWidth-pad,30);
    let lo=minSize,hi=13;
    while(hi-lo>0.4){
      const mid=Math.round((lo+hi)/2*10)/10;
      el.style.fontSize=mid+"px";
      if(el.scrollWidth<=avail)lo=mid; else hi=mid;
    }
    el.style.fontSize=lo+"px";
  },[text]);
  return <span ref={ref} style={{display:"block",whiteSpace:"nowrap",overflow:"hidden",...(style||{})}}>{text??""}</span>;
}

function TablaScrollV({children,minWidth,maxHeight=480,botStyle}){
  const contRef=useRef(null);
  const thumbRef=useRef(null);
  const trackRef=useRef(null);
  const drag=useRef(null);
  useLayoutEffect(()=>{
    const cont=contRef.current;const thumb=thumbRef.current;const track=trackRef.current;
    if(!cont||!thumb||!track)return;
    // Ocultar scrollbar nativo empujándolo fuera del clip del padre
    const sbw=cont.offsetWidth-cont.clientWidth;
    if(sbw>0)cont.style.width='calc(100% + '+sbw+'px)';
    const update=()=>{
      const can=cont.scrollHeight>cont.clientHeight;
      track.style.visibility=can?'visible':'hidden';
      if(!can)return;
      const ratio=cont.scrollTop/(cont.scrollHeight-cont.clientHeight);
      const trkH=track.clientHeight;
      const tmbH=Math.max(24,(cont.clientHeight/cont.scrollHeight)*trkH);
      thumb.style.height=tmbH+'px';
      thumb.style.top=(ratio*(trkH-tmbH))+'px';
    };
    cont.addEventListener('scroll',update);
    const ro=new ResizeObserver(update);ro.observe(cont);
    update();
    const onDown=(e)=>{drag.current={y:e.clientY,s:cont.scrollTop};e.preventDefault();};
    const onMove=(e)=>{if(!drag.current)return;const dy=e.clientY-drag.current.y;const trkH=track.clientHeight;const tmbH=thumb.clientHeight;cont.scrollTop=drag.current.s+(dy/(trkH-tmbH))*(cont.scrollHeight-cont.clientHeight);};
    const onUp=()=>{drag.current=null;};
    thumb.addEventListener('mousedown',onDown);
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
    return()=>{cont.removeEventListener('scroll',update);ro.disconnect();thumb.removeEventListener('mousedown',onDown);document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
  },[]);
  const mh=(botStyle&&botStyle.maxHeight)?botStyle.maxHeight:maxHeight;
  return(<div style={{display:'flex',alignItems:'stretch',gap:4}}>
    <div ref={trackRef} style={{width:8,flexShrink:0,borderRadius:4,background:'#e2e8f0',position:'relative',visibility:'hidden',minHeight:20}}>
      <div ref={thumbRef} style={{position:'absolute',left:0,right:0,top:0,height:0,background:'#94a3b8',borderRadius:4,cursor:'grab',userSelect:'none'}}/>
    </div>
    <div style={{flex:1,overflow:'hidden'}}>
      <div ref={contRef} style={{overflowX:'auto',overflowY:'scroll',maxHeight:mh}}>
        {children}
      </div>
    </div>
  </div>);
}

function Dashboard({lotes,costos,lotesFino,maquilas,blendsTostado}){
  const [tabDash,setTabDash]=useState("central");const [mesFiltCB,setMesFiltCB]=useState("todos");
  // ── Central de Procesos — solo lotes de recepción real (excluye carga masiva) ──
  const lotesCP=lotes.filter(l=>l.origen_lote!=="carga_directa"&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual");
  const tkq=lotesCP.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const tp=lotesCP.reduce((s,l)=>s+(l.kg_producto||0),0);
  const tc=lotesCP.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  const tex=lotesCP.filter(l=>l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const ep=lotesCP.filter(l=>!["Finalizado","Cerrado"].includes(l.estado)).length;
  const tcos=costos.reduce((s,c)=>s+c.valor,0);
  const enBodega=lotesCP.filter(l=>l.estado==="Bodega");
  const kgBodega=enBodega.reduce((s,l)=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);return s+(l.kg_producto-sal);},0);
  const pf={};lotesCP.forEach(l=>l.cereza.forEach(c=>{pf[c.finca]=(pf[c.finca]||0)+c.kg;}));
  const mf=Math.max(...Object.values(pf),1);
  const pe={};lotes.forEach(l=>{pe[l.estado]=(pe[l.estado]||0)+1;});
  const tr=[18380,25000,45687,80314,91189,92000,95000,88000,103000,110000,118000,125000];
  const mt=Math.max(...tr);const ml=["E","F","M","A","M","J","J","A","S","O","N","D"];
  const ing=tex*1250000;const mg=ing-tc-tcos;
  // ── Bodega Milan ──
  const lotesBM=lotes.filter(l=>l.kg_producto>0);
  const bmDetalle=lotesBM.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);return{...l,_stock:l.kg_producto-sal,_salTot:sal};});
  const bmConStock=bmDetalle.filter(l=>l._stock>0);
  const bmStockKg=bmConStock.reduce((s,l)=>s+l._stock,0);
  const bmSalidasKg=bmDetalle.reduce((s,l)=>s+l._salTot,0);
  const bmValSalidas=lotesBM.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  // ── Trilla ──
  const lotesTrilla=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const triExcelso=lotesTrilla.reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const triEntrada=lotesTrilla.reduce((s,l)=>s+(l.trilla.entrada_usada||l.kg_producto||0),0);
  const triMerma=lotesTrilla.reduce((s,l)=>s+(l.trilla.merma||0),0);
  const triRend=triEntrada>0?((triExcelso/triEntrada)*100).toFixed(1):0;
  // ── Bodega CF ──
  const lotesBCF=(lotesFino||[]).filter(l=>!l.para_trilladora);
  const bcfEntradas=lotesBCF.reduce((s,l)=>s+(l.kg_producto||0),0);
  const bcfSalidas=lotesBCF.reduce((s,l)=>s+(l.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const bcfStock=bcfEntradas-bcfSalidas;
  const bcfValStock=lotesBCF.reduce((s,l)=>{const sal=(l.salidas||[]).reduce((a,si)=>a+si.peso_salida,0);return s+((l.kg_producto||0)-sal)*(l.costo_compra_kg||0);},0);
  // ── Trilladora CF ──
  const lotesTCF=(lotesFino||[]).filter(l=>l.para_trilladora);
  const tcfExcelso=lotesTCF.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const tcfSalidas=lotesTCF.reduce((s,l)=>s+(l.salidas_trilladora||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const tcfStock=tcfExcelso-tcfSalidas;
  // ── Maquila ──
  const maqAll=maquilas||[];
  const maqActivas=maqAll.filter(m=>m.estado_pipeline!=="entregado");
  const maqKg=maqAll.reduce((s,m)=>s+(m.kg_recibidos||0),0);
  // ── UBA Tostado ──
  const tostAll=blendsTostado||[];
  const tostKg=tostAll.reduce((s,t)=>s+(t.kg_tostado||0),0);
  const tostSal=tostAll.reduce((s,t)=>s+(t.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const tostStock=tostKg-tostSal;
  const tostRend=tostAll.length>0?((tostAll.reduce((s,t)=>{const ka=t.kg_a_tostar||0;return s+(ka>0?(t.kg_tostado||0)/ka*100:0);},0)/tostAll.length).toFixed(1)):0;
  // ── Central de Procesos — datos para gráficos (solo lotes reales) ──
  const cerezaMes={};lotesCP.forEach(l=>{const m=l.mes||mesDe(l.fecha_proceso||l.fecha_recibo)||"otros";cerezaMes[m]=(cerezaMes[m]||0)+l.cereza.reduce((a,c)=>a+c.kg,0);});
  const mesMostrar=MESES.filter(m=>cerezaMes[m]).map(m=>({mes:m,kg:cerezaMes[m]}));
  const fincaData=Object.entries(pf).sort((a,b)=>b[1]-a[1]);
  const byProd={};lotesCP.forEach(l=>{const p=l.producto||"Sin Producto";if(!byProd[p])byProd[p]={cereza:0,terminado:0,lotes:0};byProd[p].cereza+=l.cereza.reduce((a,c)=>a+c.kg,0);byProd[p].terminado+=l.kg_producto||0;byProd[p].lotes++;});
  const prodData=Object.entries(byProd).sort((a,b)=>b[1].cereza-a[1].cereza);
  const INS_KEYS=[["jugo","Jugo"],["panela","Panela"],["harina","Harina"],["levadura","Levadura"]];
  const insumosData=INS_KEYS.map(([k,nombre])=>{const qty=lotesCP.reduce((s,l)=>s+(l.insumos?.[k]||0),0);const val=lotesCP.reduce((s,l)=>{const ins=l.insumos||{};return s+(ins[k]||0)*(ins["vr_"+k]||0);},0);return{nombre,qty,val};});
  const totalInsCP=insumosData.reduce((s,d)=>s+d.val,0);
  const totalCBCostos=costos.filter(c=>c.centro==="Central de Beneficio").reduce((s,c)=>s+c.valor,0);
  const cbCosFiltrados=costos.filter(c=>c.centro==="Central de Beneficio"&&(mesFiltCB==="todos"||c.mes===mesFiltCB));
  const cbPorTipo={};cbCosFiltrados.forEach(c=>{cbPorTipo[c.tipo]=(cbPorTipo[c.tipo]||0)+c.valor;});
  const cbPieTotal=Object.values(cbPorTipo).reduce((s,v)=>s+v,0);
  const cbPieData=Object.entries(cbPorTipo).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>({tipo,val,pct:cbPieTotal>0?((val/cbPieTotal)*100).toFixed(1):"0.0"}));
  const promA=tp>0?tc/tp:0;
  const promB=tp>0?totalInsCP/tp:0;
  const promC=tp>0?totalCBCostos/tp:0;
  const promTotal=promA+promB+promC;
  const TABS_DASH=[["central","Central de Procesos"],["bodega_milan","Bodega Milan"],["trilla","Trilla"],["bodega_cf","Bodega Cafe Fino"],["trilladora_cf","Trilladora CF"],["maquila","Maquila"],["uba_tostado","UBA Tostado"]];
  return(<div>
    <div style={{marginBottom:16}}><div style={{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PLAN MILAN - CENTRAL DE BENEFICIO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Dashboard Ejecutivo</div><div style={{color:C.textDim,fontSize:12,marginTop:3}}>{new Date().toLocaleDateString("es-CO",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div></div>
    <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {TABS_DASH.map(([k,v])=>(<button key={k} onClick={()=>setTabDash(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:tabDash===k?700:400,color:tabDash===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tabDash===k?"3px solid "+C.accent:"3px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{v}</button>))}
    </div>
    {tabDash==="central"&&(<>
      {/* ── Tarea 1: KPI Cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:24}}>
        {[{label:"Cereza Recibida",value:fmt(tkq)+" kg",sub:lotes.length+" lotes registrados",col:C.teal,icon:"☕"},{label:"Producto Terminado",value:fmt(tp)+" kg",sub:"café seco / pergamino",col:C.accent,icon:"📦"},{label:"Lotes Procesados",value:lotesCP.filter(l=>l.kg_producto>0).length,sub:"con producto terminado",col:C.navy,icon:"🔢"},{label:"Valor Materia Prima",value:fmtCOP(tc),sub:"costo total cereza",col:C.gold,icon:"💰"},{label:"Costo Insumos Proceso",value:fmtCOP(totalInsCP),sub:"jugo · panela · harina · levadura",col:C.purple,icon:"🧪"},{label:"Total Central Beneficio",value:fmtCOP(totalCBCostos),sub:"costos registrados CB",col:C.orange,icon:"📊",fs:18}].map(k=>(
          <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:12,padding:"18px 20px",borderLeft:"4px solid "+k.col,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1}}>{k.label}</div>
              <span style={{fontSize:20}}>{k.icon}</span>
            </div>
            <div style={{fontSize:k.fs||26,fontWeight:800,color:k.col,lineHeight:1,marginBottom:4,overflowWrap:"anywhere"}}>{k.value}</div>
            <div style={{fontSize:11,color:C.textFaint}}>{k.sub}</div>
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
            <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Distribución de Costos — Central de Beneficio</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>% por rubro de costo</div></div>
            <select value={mesFiltCB} onChange={e=>setMesFiltCB(e.target.value)} style={{...S.sel,width:"auto",fontSize:11,padding:"4px 8px"}}>
              <option value="todos">Todos los meses</option>
              {MESES.filter(m=>costos.some(c=>c.centro==="Central de Beneficio"&&c.mes===m)).map(m=>(<option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>))}
            </select>
          </div>
          <div style={{textAlign:"right",marginBottom:6,fontSize:12,color:C.textDim}}>Total: <strong style={{color:C.orange}}>{fmtCOP(cbPieTotal)}</strong></div>
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
          <div style={{marginTop:8,padding:"8px 12px",background:C.accentBg,borderRadius:8,fontSize:11,color:C.textDim,textAlign:"center"}}>{lotesCP.filter(l=>l.kg_producto>0).length} lotes · {fmt(tp)} kg totales</div>
        </div>
      </div>
    </>)}
    {tabDash==="bodega_milan"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Lotes con Stock" value={bmConStock.length} sub={lotesBM.length+" lotes total"} col={C.accent}/>
        <KPI label="Stock kg" value={fmt(bmStockKg)+" kg"} col={C.navy}/>
        <KPI label="Salidas kg" value={fmt(bmSalidasKg)+" kg"} col={C.orange}/>
        <KPI label="Valor Salidas" value={fmtCOP(bmValSalidas)} col={C.gold}/>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Lotes Bodega Milan</div>
        {bmDetalle.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin lotes registrados.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr>{["Codigo","Mes","Producto","Entrada kg","Salidas kg","Stock kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{[...bmDetalle].sort((a,b)=>b._stock-a._stock).map(l=>(<tr key={l.id}>
            <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.accent,fontSize:11}}>{l.codigo}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
            <td style={S.td}><Bdg label={l.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
            <td style={{...S.td,color:C.navy,fontWeight:600}}>{fmt(l.kg_producto)} kg</td>
            <td style={{...S.td,color:C.orange}}>{fmt(l._salTot)} kg</td>
            <td style={S.td}><span style={{color:l._stock>0?C.green:C.textDim,fontWeight:700}}>{fmt(l._stock)} kg</span></td>
          </tr>))}</tbody></table></TablaScrollV>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:20}}>
        <KPI label="Lotes CF" value={lotesBCF.length} col={C.accent}/>
        <KPI label="Entradas kg" value={fmt(bcfEntradas)+" kg"} col={C.navy}/>
        <KPI label="Salidas kg" value={fmt(bcfSalidas)+" kg"} col={C.orange}/>
        <KPI label="Stock kg" value={fmt(bcfStock)+" kg"} col={C.green}/>
        <KPI label="Valor en Stock" value={fmtCOP(bcfValStock)} col={C.gold}/>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Lotes Cafe Fino</div>
        {lotesBCF.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin lotes registrados.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:750}}><thead><tr>{["Codigo","Mes","Producto","Proveedor","Entrada kg","Salidas kg","Stock kg","Costo/kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{lotesBCF.map(l=>{const sal=(l.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=(l.kg_producto||0)-sal;return(<tr key={l.id}>
            <td style={{...S.td,fontFamily:"monospace",fontWeight:700,color:C.accent,fontSize:11}}>{l.codigo}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
            <td style={S.td}><Bdg label={l.producto||"—"} col={C.teal} bg={C.tealBg}/></td>
            <td style={S.td}>{l.proveedor||"—"}</td>
            <td style={{...S.td,color:C.navy,fontWeight:600}}>{fmt(l.kg_producto||0)} kg</td>
            <td style={{...S.td,color:C.orange}}>{fmt(sal)} kg</td>
            <td style={S.td}><span style={{color:stock>0?C.green:C.textDim,fontWeight:700}}>{fmt(stock)} kg</span></td>
            <td style={{...S.td,color:C.gold}}>{fmtCOP(l.costo_compra_kg||0)}</td>
          </tr>);})}
          </tbody></table></TablaScrollV>
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

function RecepcionTab({lotes,setLotes,lotesFino,setLotesFino}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankRows=()=>[{finca:FINCAS[0],variedad:"",kg:"",flote:"",kg_proceso:"",valor_kg:""}];
  const blankForm=()=>({fecha_proceso:today(),tipo:TIPOS[0],producto:"SD",canecas:"",equipo_ferm:EQUIPOS_FERM[0],fecha_lavado:"",notas:""});
  const [rows,setRows]=useState(blankRows());
  const [form,setForm]=useState(blankForm());
  const addRow=()=>setRows(p=>[...p,{finca:FINCAS[0],variedad:"",kg:"",flote:"",kg_proceso:"",valor_kg:""}]);
  const rmRow=i=>setRows(p=>p.filter((_,j)=>j!==i));
  const setRow=(i,k,v)=>setRows(p=>p.map((r,j)=>j===i?{...r,[k]:v}:r));
  const sanitizeVar=(v)=>v?v.charAt(0).toUpperCase()+v.slice(1).replace(/[^a-zA-Z0-9]/g,""):"";
  const genCod=()=>{const a=ABREV[form.tipo]||"OTR";const[y,m,d]=form.fecha_proceso.split("-");const vr=sanitizeVar((rows.find(r=>r.variedad?.trim())?.variedad||"").trim());return vr?a+"-"+form.producto+"-"+vr+"-"+d+m+y:a+"-"+form.producto+"-"+d+m+y;};
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
      const loteActual=lotes.find(l=>l.id===editId);
      const codigoNuevo=genCod();
      const codigoAnterior=loteActual?.codigo;
      setLotes(p=>p.map(l=>l.id===editId?{...l,codigo:codigoNuevo,fecha_recibo:form.fecha_proceso,fecha_proceso:form.fecha_proceso,semana:semanaAuto,mes:mesAuto,tipo:form.tipo,producto:form.producto,fecha_lavado:form.fecha_lavado||null,equipo_ferm:form.equipo_ferm,canecas:+(form.canecas||0),notas:form.notas,cereza:cerezaRows}:l));
      if(setLotesFino&&codigoAnterior&&codigoNuevo!==codigoAnterior){
        setLotesFino(p=>p.map(lf=>{
          const traz=lf.trazabilidad;
          const cambiaPropio=lf.codigo===codigoAnterior;
          const cambiaTraz=traz?.codigo_lote_origen===codigoAnterior;
          if(!cambiaPropio&&!cambiaTraz)return lf;
          return{...lf,...(cambiaPropio?{codigo:codigoNuevo}:{}),trazabilidad:{...traz,...(cambiaTraz?{codigo_lote_origen:codigoNuevo}:{})}};
        }));
      }
    }else{
      setLotes(p=>[{id:genId(),fecha_recibo:form.fecha_proceso,fecha_proceso:form.fecha_proceso,semana:semanaAuto,mes:mesAuto,tipo:form.tipo,producto:form.producto,codigo:genCod(),estado:"Recepcion",fecha_lavado:form.fecha_lavado||null,fecha_fin_secado:null,humedad:"",kg_producto:0,bultos:0,equipo_ferm:form.equipo_ferm,equipo_secado:"",insumos:{jugo:0,panela:0,harina:0,levadura:0,vr_jugo:0,vr_panela:0,vr_harina:0,vr_levadura:0},conversion:0,canecas:+(form.canecas||0),notas:form.notas,cereza:cerezaRows,trilla:null,salidas_bodega:[]},...p]);
    }
    cerrarModal();setRows(blankRows());
  };
  const editLote=editId?lotes.find(l=>l.id===editId):null;
  const lotesRecepcion=useMemo(()=>lotes.filter(l=>l.origen_lote!=="carga_directa"&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual"),[lotes]);
  const lotesOrdenados=useMemo(()=>[...lotesRecepcion].sort((a,b)=>(a.fecha_proceso||a.fecha_recibo||"").localeCompare(b.fecha_proceso||b.fecha_recibo||"")),[lotesRecepcion]);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACION 01</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Recepcion de Cereza</div></div><button style={S.btn} onClick={abrirNuevo}>+ Nuevo Lote</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}><KPI label="Total Lotes" value={lotesRecepcion.length} col={C.teal}/><KPI label="kg Cereza" value={fmt(lotesRecepcion.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0))+" kg"} col={C.accent}/><KPI label="Valor Total" value={fmtCOP(lotesRecepcion.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0))} col={C.gold}/><KPI label="Fincas" value={[...new Set(lotesRecepcion.flatMap(l=>l.cereza.map(c=>c.finca)))].length} col={C.green}/></div>
    <div style={S.card}><TablaScrollV minWidth={800}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr>{["Codigo","Fecha","Mes","Fincas","kg Cereza","Valor COP","Equipo Ferm.","Proceso","Estado",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{lotesOrdenados.map(l=>{const kg=l.cereza.reduce((a,c)=>a+c.kg,0);const cop=l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0);const fi=[...new Set(l.cereza.map(c=>c.finca))];return(<tr key={l.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",maxWidth:160}}><AutoFitText text={l.codigo}/></td><td style={{...S.td,color:C.textDim}}>{fmtFecha(l.fecha_recibo)}</td><td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td><td style={S.td}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td><td style={{...S.td,fontWeight:600,color:C.navy}}>{fmt(kg)}</td><td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(cop)}</td><td style={S.td}><Bdg label={l.equipo_ferm||"-"} col={C.purple} bg={C.purpleBg}/></td><td style={S.td}>{l.tipo} / {l.producto}</td><td style={S.td}><Bdg label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditar(l)}>Editar</button></td></tr>);})}</tbody></table></TablaScrollV></div>
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
        <tbody>{rows.map((r,i)=>(<tr key={i}><td style={{padding:"4px"}}><select style={{...S.select,padding:"6px 8px",fontSize:12}} value={FINCAS.includes(r.finca)?r.finca:"Otra"} onChange={e=>setRow(i,"finca",e.target.value==="Otra"?"":e.target.value)}>{FINCAS.map(f=>(<option key={f}>{f}</option>))}<option value="Otra">Otra...</option></select>{!FINCAS.includes(r.finca)&&<input style={{...S.input,padding:"6px 8px",fontSize:12,marginTop:4}} placeholder="Nombre de la finca" value={r.finca} onChange={e=>setRow(i,"finca",e.target.value)}/>}</td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} placeholder="Opcional" value={r.variedad} onChange={e=>setRow(i,"variedad",e.target.value)}/></td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.kg} onChange={e=>setRow(i,"kg",e.target.value)}/></td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.flote} onChange={e=>setRow(i,"flote",e.target.value)}/></td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.kg_proceso} placeholder={r.kg} onChange={e=>setRow(i,"kg_proceso",e.target.value)}/></td><td style={{padding:"4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.valor_kg} placeholder="6000" onChange={e=>setRow(i,"valor_kg",e.target.value)}/></td><td style={{padding:"4px 8px",color:C.gold,fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>{fmtCOP((+r.kg||0)*(+r.valor_kg||0))}</td><td style={{padding:"4px"}}>{rows.length>1&&(<button style={{...S.btnG,padding:"5px 8px"}} onClick={()=>rmRow(i)}>x</button>)}</td></tr>))}</tbody></table>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,padding:"10px 8px",background:C.accentBg,borderRadius:6}}><button style={S.btnG} onClick={addRow}>+ Agregar Finca</button><div><span style={{color:C.textDim,fontSize:12}}>Total: </span><span style={{color:C.navy,fontWeight:700}}>{fmt(tkr)} kg</span><span style={{color:C.textDim,fontSize:12,margin:"0 8px"}}>|</span><span style={{color:C.gold,fontWeight:700,fontSize:14}}>{fmtCOP(tco)}</span></div></div>
      </div>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"10px 14px",marginBottom:14}}><span style={{color:C.textDim,fontSize:12}}>Codigo: </span><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:14}}>{genCod()}</span></div>
      <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Fld>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={cerrarModal}>Cancelar</button><button style={S.btn} onClick={reg}>{editId?"Guardar Cambios":"Registrar Lote"}</button></div>
    </Modal>)}
  </div>);
}

function Procesamiento({lotes,setLotes,costos,lotesFino,setLotesFino}){
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
  const [filtroMesH,setFiltroMesH]=useState("");
  const [filtroProductoH,setFiltroProductoH]=useState("");
  const [busquedaH,setBusquedaH]=useState("");
  const mesesH=[...new Set(historico.map(l=>l.mes).filter(Boolean))].sort();
  const productosH=[...new Set(historico.map(l=>l.producto).filter(Boolean))].sort();
  const historicoFiltrado=useMemo(()=>historico.filter(l=>{
    if(filtroMesH&&l.mes!==filtroMesH)return false;
    if(filtroProductoH&&l.producto!==filtroProductoH)return false;
    if(busquedaH){const q=busquedaH.toLowerCase();const fi=[...new Set(l.cereza.map(c=>c.finca))];if(!l.codigo.toLowerCase().includes(q)&&!(l.producto||"").toLowerCase().includes(q)&&!fi.some(f=>f.toLowerCase().includes(q)))return false;}
    return true;
  }),[historico,filtroMesH,filtroProductoH,busquedaH]);
  const abrirEditarHistorico=(l)=>{setSelS(l);setFormS({fecha_fin:l.fecha_fin_secado||"",kg_producto:l.kg_producto||"",bultos:l.bultos||"",humedad:l.humedad||"",equipo_secado:l.equipo_secado||EQUIPOS_SECADO[0],notas:l.notas||""});setTab("secado");};
  const procesoStats=useMemo(()=>{const enP=lotes.filter(l=>l.estado==="Proceso");return{count:enP.length,kg:enP.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0),valor:enP.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0)};},[lotes]);

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACION 01-03</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Procesamiento - Recepcion, Fermentacion y Secado</div></div>
    <div style={{display:"flex",gap:8,marginBottom:20,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["recepcion","Recepcion"],["proceso","En Proceso"],["secado","En Secado"],["historico","Historico"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="recepcion"&&<RecepcionTab lotes={lotes} setLotes={setLotes} lotesFino={lotesFino} setLotesFino={setLotesFino}/>}

    {tab==="proceso"&&(<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:16}}><KPI label="Lotes en Proceso" value={procesoStats.count} col={C.orange}/><KPI label="kg Cereza en Proceso" value={fmt(procesoStats.kg)+" kg"} col={C.teal}/><KPI label="Valor Cereza en Proceso" value={fmtCOP(procesoStats.valor)} col={C.gold}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:16}}>
      <div><div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>Lotes para Procesar</div>{dispP.length===0&&<div style={{color:C.textFaint,fontSize:13}}>Sin lotes.</div>}{dispP.map(l=>{const kg=l.cereza.reduce((a,c)=>a+c.kg,0);return(<div key={l.id} onClick={()=>setSelP(l)} style={{...S.card2,marginBottom:8,cursor:"pointer",borderLeft:"3px solid "+(selP?.id===l.id?C.orange:C.border)}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{l.codigo}</span><span style={{color:C.textDim,fontSize:11}}>{fmtFecha(l.fecha_recibo)}</span></div><div style={{color:C.orange,fontSize:12,marginBottom:6}}>{l.tipo} - {l.producto}</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{[...new Set(l.cereza.map(c=>c.finca))].map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}<Bdg label={l.equipo_ferm} col={C.purple} bg={C.purpleBg}/><Bdg label={fmt(kg)+" kg"} col={C.gold} bg={C.goldBg}/></div></div>);})}</div>
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
    </div></>)}

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
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Historico de Lotes Procesados</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <input style={{...S.input,flex:1,minWidth:160}} placeholder="Buscar por codigo, producto, finca..." value={busquedaH} onChange={e=>setBusquedaH(e.target.value)}/>
        <select style={{...S.select,width:150}} value={filtroMesH} onChange={e=>setFiltroMesH(e.target.value)}><option value="">Todos los meses</option>{mesesH.map(m=>(<option key={m}>{m}</option>))}</select>
        <select style={{...S.select,width:160}} value={filtroProductoH} onChange={e=>setFiltroProductoH(e.target.value)}><option value="">Todos los productos</option>{productosH.map(p=>(<option key={p}>{p}</option>))}</select>
        {(filtroMesH||filtroProductoH||busquedaH)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMesH("");setFiltroProductoH("");setBusquedaH("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{historicoFiltrado.length} de {historico.length} lotes</span>
      </div>
      {(filtroMesH||filtroProductoH||busquedaH)&&(()=>{
        const sumPC=historicoFiltrado.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
        const sumPP=historicoFiltrado.reduce((s,l)=>s+(l.kg_producto||0),0);
        const convProm=sumPP>0?sumPC/sumPP:0;
        const sumKgSalP=historicoFiltrado.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0),0);
        const sumValSalP=historicoFiltrado.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),0),0);
        const stkP=sumPP-sumKgSalP;
        return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>LOTES</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{historicoFiltrado.length}</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG CEREZA</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumPC)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG PERGAMINO</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumPP)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>CONV PROM</div><div style={{color:"#fde68a",fontWeight:700,fontSize:15}}>{convProm>0?convProm.toFixed(2)+":1":"—"}</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK PERG</div><div style={{color:"#34d399",fontWeight:700,fontSize:15}}>{fmt(stkP)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumKgSalP)} kg</div></div>
          <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumValSalP)}</div></div>
        </div>);
      })()}
      {historicoFiltrado.length===0&&<div style={{color:C.textFaint,fontSize:13}}>{historico.length===0?"Aun no hay lotes terminados.":"Sin resultados para los filtros aplicados."}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:12}}>
        {historicoFiltrado.map(l=>{const clH=calcCosto(l,costos,lotes);const kgCereza=l.cereza.reduce((a,c)=>a+c.kg,0);const fincasL=[...new Set(l.cereza.map(c=>c.finca))];return(
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
function Bodega({lotes,setLotes,costos,setLotesFino,subprodPerg,setSubprodPerg}){
  const [selLote,setSelLote]=useState(null);
  const [modalSubPerg,setModalSubPerg]=useState(false);
  const [editSubPergId,setEditSubPergId]=useState(null);
  const [formSubPerg,setFormSubPerg]=useState({fecha:today(),codigo:"",kg:""});
  const guardarSubPerg=()=>{
    if(!formSubPerg.codigo||!formSubPerg.kg)return;
    const entry={fecha:formSubPerg.fecha,mes:mesDe(formSubPerg.fecha),semana:semanaISO(formSubPerg.fecha),codigo:formSubPerg.codigo,kg:+formSubPerg.kg};
    if(editSubPergId){setSubprodPerg(p=>p.map(sp=>sp.id===editSubPergId?{...sp,...entry}:sp));}
    else{setSubprodPerg(p=>[{id:genId(),...entry},...p]);}
    setModalSubPerg(false);setEditSubPergId(null);setFormSubPerg({fecha:today(),codigo:"",kg:""});
  };
  const [modalSalida,setModalSalida]=useState(false);
  const [formSalida,setFormSalida]=useState({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:""});
  const [errSalida,setErrSalida]=useState("");
  const [editSalidaId,setEditSalidaId]=useState(null);
  const abrirEditarSalida=(l,s)=>{setSelLote(l);setEditSalidaId(s.id);setFormSalida({fecha:s.fecha,factura:s.factura,remision:s.remision,cliente:s.cliente||"",destino_key:s.destino_key||"",peso_salida:s.peso_salida,valor_kg:s.valor_kg,valor_total:s.valor_total});setErrSalida("");setModalSalida(true);};
  const eliminarSalida=(loteId,salidaId)=>{if(!window.confirm("¿Eliminar esta salida? Esta acción no se puede deshacer."))return;setLotes(p=>p.map(l=>l.id===loteId?{...l,salidas_bodega:(l.salidas_bodega||[]).filter(s=>s.id!==salidaId)}:l));};
  const [modalEditar,setModalEditar]=useState(false);
  const [formEditar,setFormEditar]=useState({kg_producto:"",bultos:"",humedad:"",fecha_fin_secado:"",equipo_secado:EQUIPOS_SECADO[0]});
  const [modalPre,setModalPre]=useState(false);
  const [formPre,setFormPre]=useState({fecha:today(),perfil_taza:"",peso_muestra:"",almendra_sana:"",granos_brocados:"",granos_inmaduros:"",inferiores:"",gr_merma:""});
  const [filtroMes,setFiltroMes]=useState("");
  const [filtroProducto,setFiltroProducto]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const [zoomTarget,setZoomTarget]=useState(null);
  const lotesB=lotes.filter(l=>l.kg_producto>0&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual");
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
      const fSal=formSalida.fecha||today();
      setLotesFino(p=>[{id:genId(),codigo:selLote?.codigo||("CF-"+dateToCode(fSal)),fecha:fSal,mes:mesDe(fSal),semana:semanaISO(fSal),producto:selLote?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:vkg||0,valor_total:vtotal,notas:"Transferido desde Bodega Milan — "+selLote?.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,trazabilidad:{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:selLote?.fecha_proceso||"",fecha_trilla:"",fecha_secado:selLote?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    if(formSalida.destino_key==="trilla_cf"){
      const fSal=formSalida.fecha||today();
      setLotesFino(p=>[{id:genId(),codigo:selLote?.codigo||("CF-"+dateToCode(fSal)),fecha:fSal,mes:mesDe(fSal),semana:semanaISO(fSal),producto:selLote?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:vkg||0,valor_total:vtotal,notas:"Trasladado desde Bodega Milan a Trilladora CF — "+selLote?.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,para_trilladora:true,trazabilidad:{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:selLote?.fecha_proceso||"",fecha_trilla:"",fecha_secado:selLote?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
    }
    setModalSalida(false);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:""});setErrSalida("");
  };

  const totalKgBodega=lotesB.reduce((s,l)=>s+stockDisponible(l),0);
  const totalValorBodega=lotesB.reduce((s,l)=>{const cl=calcCosto(l,costos,lotes);const stock=stockDisponible(l);return s+(stock*(cl?cl.total:0));},0);
  const totalEntradaKg=lotesB.reduce((s,l)=>s+l.kg_producto,0);
  const totalEntradaValor=lotesB.reduce((s,l)=>{const cl=calcCosto(l,costos,lotes);return s+(l.kg_producto*(cl?cl.total:0));},0);
  const totalSalidasKg=lotesB.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,s),0);
  const totalSalidasValor=lotesB.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),s),0);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.navy,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Bodega Milan - Inventario Cafe Seco</div></div></div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(120px,160px) repeat(3,1fr)",gap:12,marginBottom:20,alignItems:"stretch"}}>
      <KPI label="Lotes en Bodega" value={lotesB.length} col={C.navy}/>
      <KPIDoble label="Entradas a Bodega" kgVal={fmt(totalEntradaKg)+" kg"} valorVal={fmtCOP(Math.round(totalEntradaValor))} col={C.green}/>
      <KPIDoble label="Salidas de Bodega" kgVal={fmt(totalSalidasKg)+" kg"} valorVal={fmtCOP(Math.round(totalSalidasValor))} col={C.orange}/>
      <KPIDoble label="Stock Actual" kgVal={fmt(totalKgBodega)+" kg"} valorVal={fmtCOP(Math.round(totalValorBodega))} col={C.gold}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"],["subproductos","Subproductos Pergamino"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesB.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosB.map(p=>(<option key={p}>{p}</option>))}</select>
      {(filtroMes||filtroProducto||busqueda)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMes("");setFiltroProducto("");setBusqueda("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{lotesBFiltrados.length} de {lotesB.length} lotes</span>
    </div>
    {(filtroMes||filtroProducto||busqueda)&&(()=>{
      const sumBMEnt=lotesBFiltrados.reduce((s,l)=>s+l.kg_producto,0);
      const sumBMSal=lotesBFiltrados.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,s),0);
      const sumBMStk=sumBMEnt-sumBMSal;
      const sumBMValSal=lotesBFiltrados.reduce((s,l)=>(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),s),0);
      const sumBMValStk=lotesBFiltrados.reduce((s,l)=>{const cl=calcCosto(l,costos,lotes);const stk=stockDisponible(l);return s+(stk*(cl?cl.total:0));},0);
      return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>LOTES</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{lotesBFiltrados.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG ENTRADA</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumBMEnt)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumBMStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR STOCK</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumBMValStk))}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumBMSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumBMValSal)}</div></div>
      </div>);
    })()}
    <div style={zoomTarget==="inv"?{position:"fixed",inset:0,zIndex:600,background:"rgba(15,23,42,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}:{}}>
    <div style={zoomTarget==="inv"?{background:C.panel,borderRadius:12,padding:24,width:"98vw",maxHeight:"95vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}:S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:600,fontSize:14,color:C.navy}}>Inventario por Lote</span>
        <button style={S.btnG} onClick={()=>setZoomTarget(t=>t==="inv"?null:"inv")}>{zoomTarget==="inv"?"✕ Cerrar":"⛶ Ampliar"}</button>
      </div>
      <TablaScrollV botStyle={{maxHeight:zoomTarget==="inv"?"calc(95vh - 100px)":"450px",overflowY:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:1350}}><thead style={{position:"sticky",top:0,zIndex:2,background:C.panel2}}><tr>{["Codigo","Mes","Finca","Producto","Peso Cereza","Reactor","Silo","Fec. Secado","Humedad","Entrada kg","Salidas kg","Stock kg","MP/kg","Ins/kg","CB/kg","Total/kg","Valor Stock","Pre-Trilla","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{[...lotesBFiltrados].sort((a,b)=>(a.fecha_proceso||"").localeCompare(b.fecha_proceso||"")).map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=l.kg_producto-sal;const cl=calcCosto(l,costos,lotes);const costoKg=cl?cl.total:0;const fi=[...new Set(l.cereza.map(c=>c.finca))];const kgCereza=l.cereza.reduce((a,c)=>a+c.kg,0);return(<tr key={l.id}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",maxWidth:160}}><AutoFitText text={l.codigo}/></td>
        <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontWeight:600}}>{l.producto}</td>
        <td style={{...S.td,color:C.teal,fontWeight:600}}>{fmt(kgCereza)} kg</td>
        {/* FIX 3: Mostrar reactor y silo */}
        <td style={S.td}><Bdg label={l.equipo_ferm||"-"} col={C.purple} bg={C.purpleBg}/></td>
        <td style={S.td}><Bdg label={l.equipo_secado||"-"} col={C.teal} bg={C.tealBg}/></td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(l.fecha_fin_secado)}</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{l.humedad?l.humedad+"%":"-"}</td>
        <td style={{...S.td,fontWeight:600}}>{fmt(l.kg_producto)}</td>
        <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(sal)}</td>
        <td style={S.td}><div style={{color:stock>100?C.green:stock>0?C.gold:C.red,fontWeight:700,fontSize:14}}>{fmt(stock)} kg</div><div style={{background:C.bg,borderRadius:3,height:6,marginTop:4,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:stock>100?C.green:stock>0?C.gold:C.red,width:Math.min(100,l.kg_producto>0?(stock/l.kg_producto)*100:0)+"%",height:"100%",borderRadius:3}}/></div></td>
        <td style={{...S.td,color:C.orange}}>{cl?fmtCOP(Math.round(cl.a)):"—"}</td>
        <td style={{...S.td,color:C.red}}>{cl?fmtCOP(Math.round(cl.b)):"—"}</td>
        <td style={{...S.td,color:C.purple}}>{cl?fmtCOP(Math.round(cl.c)):"—"}</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(costoKg)}</td>
        <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(stock*costoKg)}</td>
        <td style={S.td}>{l.pretrilla?(<div><div style={{color:C.purple,fontWeight:700,fontSize:12}}>FP: {fmt(l.pretrilla.factor_pretrilla,1)}</div><div style={{color:C.red,fontSize:11}}>Merma: {fmt(l.pretrilla.pct_merma,1)}%</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirPre(l)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirPre(l)}>+ Pre-Trilla</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>{if(stock>0){setSelLote(l);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:cl?Math.round(cl.total):"",valor_total:""});setErrSalida("");setModalSalida(true);}}}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(l)}>Editar</button></div></td>
      </tr>);})}
      </tbody></table></TablaScrollV></div></div></>)}
    {tab==="subproductos"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20}}>
        <KPI label="Registros" value={(subprodPerg||[]).length} col={C.navy}/>
        <KPI label="Total kg" value={fmt((subprodPerg||[]).reduce((s,sp)=>s+sp.kg,0))+" kg"} col={C.green}/>
      </div>
      <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontWeight:600,fontSize:14,color:C.navy}}>Subproductos Pergamino</span>
        <button style={S.btn} onClick={()=>{setFormSubPerg({fecha:today(),codigo:"",kg:""});setEditSubPergId(null);setModalSubPerg(true);}}>+ Registrar Lote</button>
      </div>
      {(subprodPerg||[]).length===0?(
        <div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin subproductos pergamino registrados. Usa el boton para registrar el primer lote.</div>
      ):(
        <div style={S.card}>
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr>
            {["Fecha","Mes","Semana","Codigo Subproducto","kg Subproductos",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}
          </tr></thead>
          <tbody>{[...(subprodPerg||[])].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map(sp=>(
            <tr key={sp.id}>
              <td style={{...S.td,color:C.textDim}}>{fmtFecha(sp.fecha)}</td>
              <td style={{...S.td,textTransform:"capitalize"}}>{sp.mes}</td>
              <td style={S.td}><Bdg label={"S"+sp.semana} col={C.teal} bg={C.tealBg}/></td>
              <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{sp.codigo}</td>
              <td style={{...S.td,color:C.green,fontWeight:700,fontSize:15}}>{fmt(sp.kg)} kg</td>
              <td style={S.td}><button style={S.btnG} onClick={()=>{setEditSubPergId(sp.id);setFormSubPerg({fecha:sp.fecha,codigo:sp.codigo,kg:sp.kg});setModalSubPerg(true);}}>Editar</button></td>
            </tr>
          ))}</tbody></table></TablaScrollV>
        </div>
      )}
      {modalSubPerg&&(<Modal title={editSubPergId?"Editar Subproducto Pergamino":"Nuevo Subproducto Pergamino"} onClose={()=>{setModalSubPerg(false);setEditSubPergId(null);}}>
        <Fld label="Fecha"><input style={S.input} type="date" value={formSubPerg.fecha} onChange={e=>setFormSubPerg(p=>({...p,fecha:e.target.value}))}/></Fld>
        <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:12}}>
          <span style={{color:C.textDim}}>Mes: </span><b style={{color:C.navy}}>{mesDe(formSubPerg.fecha)}</b>
          <span style={{color:C.textDim,marginLeft:16}}>Semana ISO: </span><b style={{color:C.navy}}>S{semanaISO(formSubPerg.fecha)}</b>
        </div>
        <Fld label="Codigo Subproducto"><input style={S.input} placeholder="Ej: SUB-PERG-001" value={formSubPerg.codigo} onChange={e=>setFormSubPerg(p=>({...p,codigo:e.target.value}))}/></Fld>
        <Fld label="kg Subproductos"><input style={S.input} type="number" min="0" step="0.1" placeholder="kg" value={formSubPerg.kg} onChange={e=>setFormSubPerg(p=>({...p,kg:e.target.value}))}/></Fld>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
          <button style={S.btnG} onClick={()=>{setModalSubPerg(false);setEditSubPergId(null);}}>Cancelar</button>
          <button style={S.btn} onClick={guardarSubPerg}>{editSubPergId?"Guardar Cambios":"Registrar"}</button>
        </div>
      </Modal>)}
    </>)}
    {tab==="historico"&&(lotes.some(l=>(l.salidas_bodega||[]).length>0)?(
    <div style={zoomTarget==="sal"?{position:"fixed",inset:0,zIndex:600,background:"rgba(15,23,42,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}:{}}>
    <div style={zoomTarget==="sal"?{background:C.panel,borderRadius:12,padding:24,width:"98vw",maxHeight:"95vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}:S.card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontWeight:600,fontSize:14,color:C.navy}}>Historico de Salidas</span>
        <button style={S.btnG} onClick={()=>setZoomTarget(t=>t==="sal"?null:"sal")}>{zoomTarget==="sal"?"✕ Cerrar":"⛶ Ampliar"}</button>
      </div>
      <TablaScrollV botStyle={{maxHeight:zoomTarget==="sal"?"calc(95vh - 100px)":"450px",overflowY:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead style={{position:"sticky",top:0,zIndex:2,background:C.panel2}}><tr>{["Lote","Fecha","Destino","Factura","Remision","Cliente","Peso Salida","Valor/kg","Valor Total",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{lotes.flatMap(l=>(l.salidas_bodega||[]).map(s=>({...s,codigo:l.codigo,loteId:l.id,loteRef:l}))).sort((a,b)=>(a.loteRef.fecha_proceso||"").localeCompare(b.loteRef.fecha_proceso||"")||(a.fecha||"").localeCompare(b.fecha||"")).map(s=>{
        const destiLabel={trilla:"Trilla",blend:"Blend",bodega_cf:"Cafe Fino",trilla_cf:"Trilla CF",blend_cf:"Blend CF",uba_tostado:"Tostado",muestras:"Muestras",otro:"Otro"}[s.destino_key]||s.destino_key||"-";
        const destiCol={bodega_cf:C.green,trilla_cf:C.teal,muestras:C.purple,blend:C.gold,trilla:C.accent}[s.destino_key]||C.textDim;
        return(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={S.td}><Bdg label={destiLabel} col={destiCol}/></td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,display:"flex",gap:4}}><button style={S.btnG} onClick={()=>abrirEditarSalida(s.loteRef,s)}>Editar</button><button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminarSalida(s.loteId,s.id)}>Eliminar</button></td></tr>);})}
      </tbody></table></TablaScrollV></div></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

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
function Trilla({lotes,setLotes,costos,subprodVerde,setSubprodVerde}){
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
  const costoKgExDe=(l)=>{const cl=calcCosto(l,costos,lotes);const t=l.trilla;const D=calcCostoTri(l.mes,costos,lotes).costoTriKg;return cl&&t?.kg_excelso>0?Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D):0;};
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
      const fSalT=formSalidaT.fecha||today();
      setLotesFino(p=>[{id:genId(),codigo:selLoteT?.codigo||("CF-"+dateToCode(fSalT)),fecha:fSalT,mes:mesDe(fSalT),semana:semanaISO(fSalT),producto:selLoteT?.producto||"",proveedor:"Bodega Milan",kg_producto:peso,costo_compra_kg:vkg||0,valor_total:vtotal,notas:"Transferido desde Bodega Trilladora — "+selLoteT?.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],trazabilidad:{codigo_lote_origen:selLoteT?.codigo||"",fecha_proceso:selLoteT?.fecha_proceso||"",fecha_trilla:selLoteT?.trilla?.fecha_trilla||"",fecha_secado:selLoteT?.fecha_fin_secado||"",lotes_blend:[]}},...p]);
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
      <KPI label="Excelso Total kg" value={fmt(totalExcelso)+" kg"} col={C.green}/>
      <KPI label="Stock Disponible kg" value={fmt(stockActual.kg)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock Disponible" value={fmtCOP(stockActual.val)} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidasT)} col={C.purple}/>
      <KPI label="Costo Prom/kg Ex" value={stockActual.kg>0?fmtCOP(Math.round(stockActual.val/stockActual.kg)):"—"} col={C.teal}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
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
      const sumTSal=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+c.peso_salida,0),0),0);
      const sumTStk=sumTExc-sumTSal;
      const sumTValSal=gruposTFiltrados.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+(c.valor_total||0),0),0),0);
      const sumTValStk=gruposTFiltrados.reduce((s,g)=>{
        const excelsoG=g.reduce((a,x)=>a+(x.trilla?.kg_excelso||0),0);
        const salG=g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((b,c)=>b+c.peso_salida,0),0);
        const stk=excelsoG-salG;
        const costoTG=g.reduce((a,x)=>{const cl=calcCosto(x,costos,lotes);return a+(cl?cl.total*pesoATrilladora(x):0);},0);
        const D=calcCostoTri(g[0].mes,costos,lotes).costoTriKg;
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
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(t.fecha_trilla)}</td>
          <td style={S.td}><Bdg label={t.codigo_corte||"—"} col={C.accent}/></td>
          <td style={{...S.td,textTransform:"capitalize"}}>{repr.mes}</td>
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
    {tab==="historico"&&(trilledLotes.some(l=>(l.salidas_trilladora||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas - Trilladora</div><TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{trilledLotes.flatMap(l=>(l.salidas_trilladora||[]).map(s=>({...s,codigo:l.codigo,loteRef:l}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaT(s.loteRef,s)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

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
  // solo excelso transferido formalmente a Blend (salida con destino_key "blend")
  lotes.forEach(l=>(l.salidas_trilladora||[]).forEach(s=>{
    if(s.destino_key==="blend"){
      pool.push({key:"sal:"+s.id,salidaId:s.id,reprId:l.id,codigo:l.codigo,producto:l.producto,kg_total:s.peso_salida,valor_kg:s.valor_kg,fecha:s.fecha,esStockDirecto:false});
    }
  }));
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
  const [filtroNomCom,setFiltroNomCom]=useState("");
  const [busqueda,setBusqueda]=useState("");
  const [tab,setTab]=useState("inventario");
  const [poolSel,setPoolSel]=useState([]);

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
  const abrirNuevoDesdePool=()=>{setEditId(null);setNombre("");setFecha(today());setProductoComercial("");setItems(poolSel.map(key=>{const p=pool.find(x=>x.key===key);return p?{key:p.key,salidaId:p.salidaId,reprId:p.reprId,codigo:p.codigo,valor_kg:p.valor_kg,kg_usado:"",esStockDirecto:p.esStockDirecto,tipo:p.tipo||"lote"}:null;}).filter(Boolean));setErrBlendForm("");setPoolSel([]);setModal(true);};
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
  const nomComBlend=[...new Set(blends.map(b=>b.producto_comercial).filter(Boolean))].sort();
  const blendsFiltrados=blends.filter(b=>{
    if(filtroMes&&mesDe(b.fecha)!==filtroMes)return false;
    if(filtroProducto&&!productosDeBlend(b).includes(filtroProducto))return false;
    if(filtroNomCom&&b.producto_comercial!==filtroNomCom)return false;
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
    <div style={{...S.card,marginBottom:16}}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:10}}>Pool de Excelso Disponible</div>
      {pool.length===0?(<div style={{color:C.textFaint,fontSize:13}}>Sin excelso disponible para blend.</div>):(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {pool.map(p=>{const sel=poolSel.includes(p.key);return(<label key={p.key} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"6px 10px",borderRadius:6,border:"1.5px solid "+(sel?C.accent:C.border),background:sel?C.accentBg:"transparent",fontSize:12}}>
            <input type="checkbox" checked={sel} onChange={e=>setPoolSel(prev=>e.target.checked?[...prev,p.key]:prev.filter(k=>k!==p.key))} style={{accentColor:C.accent}}/>
            <span style={{fontFamily:"monospace",fontWeight:700,color:C.accent}}>{p.codigo}</span>
            <Bdg label={p.producto} col={C.teal} bg={C.tealBg}/>
            <span style={{color:C.green,fontWeight:600}}>{fmt(p.kg_disponible)} kg</span>
            {p.tipo==="blend"&&<Bdg label="Blend" col={C.purple} bg={C.purpleBg}/>}
          </label>);})}
        </div>
      )}
      {poolSel.length>0&&(<button style={{...S.btn,background:C.purple}} onClick={abrirNuevoDesdePool}>+ Nuevo Blend con seleccion ({poolSel.length})</button>)}
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<><div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo de lote o blend..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}><option value="">Todos los meses</option>{mesesBlend.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProducto} onChange={e=>setFiltroProducto(e.target.value)}><option value="">Todos los productos</option>{productosBlend.map(p=>(<option key={p}>{p}</option>))}</select>
      <select style={{...S.select,width:180}} value={filtroNomCom} onChange={e=>setFiltroNomCom(e.target.value)}><option value="">Todos los nombres comerciales</option>{nomComBlend.map(n=>(<option key={n}>{n}</option>))}</select>
      {(filtroMes||filtroProducto||filtroNomCom||busqueda)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMes("");setFiltroProducto("");setFiltroNomCom("");setBusqueda("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{blendsFiltrados.length} de {blends.length} blends</span>
    </div>
    {(filtroMes||filtroProducto||filtroNomCom||busqueda)&&(()=>{
      const sumBKgT=blendsFiltrados.reduce((s,b)=>s+b.kg_total,0);
      const sumBValT=blendsFiltrados.reduce((s,b)=>s+b.valor_total,0);
      const sumBKgSal=blendsFiltrados.reduce((s,b)=>(b.salidas||[]).reduce((a,x)=>a+x.peso_salida,s),0);
      const sumBValSal=blendsFiltrados.reduce((s,b)=>(b.salidas||[]).reduce((a,x)=>a+(x.valor_total||0),s),0);
      const sumBStk=blendsFiltrados.reduce((s,b)=>s+stockBlend(b),0);
      return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>BLENDS</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{blendsFiltrados.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG TOTAL</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumBKgT)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR TOTAL</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumBValT))}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumBStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumBKgSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumBValSal)}</div></div>
      </div>);
    })()}
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Blends Registrados</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}><thead><tr>{["Codigo Blend","Producto Comercial","Fecha","Mes","Lotes Usados","kg Total","Costo/kg","Valor Total","Salidas kg","Stock kg","Analisis Pre-Embarque","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{blendsFiltrados.map(b=>{const salKg=(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);const stock=stockBlend(b);return(<tr key={b.id}>
        <td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{b.codigo}</td>
        <td style={S.td}>{b.producto_comercial?<Bdg label={b.producto_comercial} col={C.gold} bg={C.goldBg}/>:"—"}</td>
        <td style={{...S.td,color:C.textDim}}>{fmtFecha(b.fecha)}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{mesDe(b.fecha)}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{b.items.map(it=>(<Bdg key={it.key} label={it.codigo+" ("+fmt(it.kg_usado)+"kg)"} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(b.kg_total)} kg</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(Math.round(b.costo_kg))}</td>
        <td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(b.valor_total)}</td>
        <td style={{...S.td,color:C.orange}}>{fmt(salKg)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={S.td}>{b.pre_embarque?(<div><div style={{color:C.teal,fontWeight:600,fontSize:11}}>{fmtFecha(b.pre_embarque.fecha)}</div><div style={{color:C.textDim,fontSize:11}}>{b.pre_embarque.norma}</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirEmb(b)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirEmb(b)}>+ Pre-Embarque</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaB(b)}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(b)}>Editar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {blendsFiltrados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{blends.length===0?'Sin blends registrados. El excelso debe salir de Bodega Trilladora con destino "Blend" para estar disponible aqui.':"Ningun blend coincide con el filtro."}</div>}
    </div></>)}

    {tab==="historico"&&(blends.some(b=>(b.salidas||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas - Blend</div><TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Blend","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{blends.flatMap(b=>(b.salidas||[]).map(s=>({...s,codigo:b.codigo,blendRef:b}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaB(s.blendRef,s)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

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
function BodegaFino({lotesFino,setLotesFino,setBlendsFino,setBlendsTostado,lotes}){
  const fincasDeOrigen=(l)=>{if(!lotes||!l.trazabilidad?.codigo_lote_origen)return[];const orig=lotes.find(x=>x.codigo===l.trazabilidad.codigo_lote_origen);return orig?[...new Set(orig.cereza.map(c=>c.finca))]:[];};
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
  const [filMesB,setFilMesB]=useState("");
  const [filProdB,setFilProdB]=useState("");
  const [busqB,setBusqB]=useState("");

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
    // esBlendFino: salida already recorded in salidas_bodega above; poolBlendFino picks it up automatically
    if(esTrilladoraFino){
      setLotesFino(p=>[{id:genId(),codigo:selLote.codigo,fecha:formSalida.fecha,mes:mesDe(formSalida.fecha),semana:semanaISO(formSalida.fecha),producto:selLote.producto||"",proveedor:"Bodega Café Fino",kg_producto:peso,costo_compra_kg:vkg||0,notas:"Trasladado desde Bodega CF — "+selLote.codigo,salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:selLote?.pretrilla||null,trazabilidad:{codigo_lote_origen:selLote?.codigo||"",fecha_proceso:"",fecha_trilla:"",fecha_secado:"",lotes_blend:[]},para_trilladora:true},...p]);
    }
    setModalSalida(false);setEditSalidaId(null);setErrSalida("");
    setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:"",valor_total:"",nombre_producto_tostado:""});
  };

  const lotesBodega=lotesFino.filter(l=>!l.para_trilladora);
  const mesesB=[...new Set(lotesBodega.map(l=>l.mes).filter(Boolean))].sort();
  const productosB=[...new Set(lotesBodega.map(l=>l.producto).filter(Boolean))].sort();
  const lotesFiltradosB=lotesBodega.filter(l=>{
    if(filMesB&&l.mes!==filMesB)return false;
    if(filProdB&&l.producto!==filProdB)return false;
    if(busqB){const q=busqB.toLowerCase();if(!l.codigo?.toLowerCase().includes(q)&&!l.proveedor?.toLowerCase().includes(q)&&!l.producto?.toLowerCase().includes(q)&&!l.notas?.toLowerCase().includes(q))return false;}
    return true;
  });
  const hayFiltroB=!!(filMesB||filProdB||busqB);
  const sumBEnt=lotesFiltradosB.reduce((s,l)=>s+l.kg_producto,0);
  const sumBStk=lotesFiltradosB.reduce((s,l)=>s+stockDe(l),0);
  const sumBValStk=lotesFiltradosB.reduce((s,l)=>s+stockDe(l)*(l.costo_compra_kg||0),0);
  const sumBKgSal=lotesFiltradosB.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0),0);
  const sumBValSal=lotesFiltradosB.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),0),0);
  const totalKg=lotesBodega.reduce((s,l)=>s+stockDe(l),0);
  const totalValor=lotesBodega.reduce((s,l)=>s+stockDe(l)*(l.costo_compra_kg||0),0);
  const totalSalidas=lotesBodega.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0),0);
  const totalValorSalidas=lotesBodega.reduce((s,l)=>s+(l.salidas_bodega||[]).reduce((a,b)=>a+(b.valor_total||0),0),0);

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.navy,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>INVENTARIO CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Bodega Cafe Fino</span><button style={S.btn} onClick={abrirNuevo}>+ Nuevo Lote</button></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Lotes en Bodega" value={lotesBodega.length} col={C.navy}/>
      <KPI label="Stock Total" value={fmt(totalKg)+" kg"} col={C.accent}/>
      <KPI label="Valor Stock" value={fmtCOP(totalValor)} col={C.gold}/>
      <KPI label="kg con Salida" value={fmt(totalSalidas)+" kg"} col={C.orange}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValorSalidas)} col={C.green}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>
    {tab==="inventario"&&(<div style={S.card}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <input style={{...S.input,maxWidth:200,marginBottom:0,flex:"1 1 150px"}} placeholder="Buscar código, proveedor..." value={busqB} onChange={e=>setBusqB(e.target.value)}/>
        <select style={{...S.select,flex:"1 1 130px",maxWidth:160}} value={filMesB} onChange={e=>setFilMesB(e.target.value)}><option value="">Todos los meses</option>{mesesB.map(m=>(<option key={m} value={m} style={{textTransform:"capitalize"}}>{m}</option>))}</select>
        <select style={{...S.select,flex:"1 1 140px",maxWidth:180}} value={filProdB} onChange={e=>setFilProdB(e.target.value)}><option value="">Todos los productos</option>{productosB.map(p=>(<option key={p}>{p}</option>))}</select>
        {hayFiltroB&&<button style={{...S.btnG,fontSize:11,padding:"6px 10px",color:C.red,borderColor:C.red+"40"}} onClick={()=>{setBusqB("");setFilMesB("");setFilProdB("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12,marginLeft:4}}>{lotesFiltradosB.length} de {lotesBodega.length}</span>
      </div>
      {hayFiltroB&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>LOTES</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{lotesFiltradosB.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG ENTRADA</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumBEnt)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumBStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR STOCK</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(sumBValStk)}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumBKgSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumBValSal)}</div></div>
      </div>)}
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Inventario por Lote</div><TablaScrollV minWidth={1150}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1150}}><thead><tr>{["Codigo","Mes","Finca","Producto","Proveedor","Fecha","Entrada kg","Salidas kg","Stock kg","Costo Compra/kg","Valor Stock","Pre-Trilla","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{lotesFiltradosB.map(l=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);const stock=stockDe(l);const fi=fincasDeOrigen(l);return(<tr key={l.id}>
        <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td>
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{fi.length>0?fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>)):<span style={{color:C.textFaint,fontSize:11}}>—</span>}</div></td>
        <td style={S.td}><Bdg label={l.producto||"-"} col={C.teal} bg={C.tealBg}/></td>
        <td style={{...S.td,color:C.textDim}}>{l.proveedor||"-"}</td>
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(l.fecha)}</td>
        <td style={{...S.td,fontWeight:600}}>{fmt(l.kg_producto)}</td>
        <td style={{...S.td,color:C.orange,fontWeight:600}}>{fmt(sal)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(l.costo_compra_kg)}</td>
        <td style={{...S.td,color:C.navy,fontWeight:700}}>{fmtCOP(stock*(l.costo_compra_kg||0))}</td>
        <td style={S.td}>{l.pretrilla?(<div><div style={{color:C.purple,fontWeight:700,fontSize:12}}>FP: {fmt(l.pretrilla.factor_pretrilla,1)}</div><div style={{color:C.red,fontSize:11}}>Merma: {fmt(l.pretrilla.pct_merma,1)}%</div><button style={{...S.btnG,fontSize:10,padding:"3px 8px",marginTop:3}} onClick={()=>abrirPre(l)}>Editar</button></div>):(<button style={{...S.btnG,fontSize:11,padding:"6px 10px"}} onClick={()=>abrirPre(l)}>+ Pre-Trilla</button>)}</td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>{setSelLote(l);setEditSalidaId(null);setFormSalida({fecha:today(),factura:"",remision:"",cliente:"",destino_key:"",peso_salida:"",valor_kg:l.costo_compra_kg||"",valor_total:""});setErrSalida("");setModalSalida(true);}}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(l)}>Editar</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px",color:C.red,borderColor:C.red+"40"}} disabled={!!(l.trilla?.kg_excelso)} title={l.trilla?.kg_excelso?"No se puede eliminar: ya fue trillado":""} onClick={()=>{if(window.confirm("¿Eliminar el lote "+l.codigo+" de Bodega Cafe Fino? Esta accion no se puede deshacer.")){setLotesFino(p=>p.filter(x=>x.id!==l.id));}}}>Eliminar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {lotesFiltradosB.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{hayFiltroB?"Sin lotes que coincidan con los filtros.":"Sin lotes registrados todavia."}</div>}
    </div>)}
    {tab==="historico"&&(lotesBodega.some(l=>(l.salidas_bodega||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas</div><TablaScrollV minWidth={900}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Lote","Fecha","Factura","Remision","Cliente","Peso Salida","Valor/kg","Valor Total",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{lotesBodega.flatMap(l=>(l.salidas_bodega||[]).map(s=>({...s,codigo:l.codigo,loteRef:l}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalida(s.loteRef,s)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

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
  const [filMesTF,setFilMesTF]=useState("");
  const [filProdTF,setFilProdTF]=useState("");
  const [busqTF,setBusqTF]=useState("");
  const [selArr,setSelArr]=useState([]);
  const [isEditing,setIsEditing]=useState(false);
  const [form,setForm]=useState(blankForm());
  const [errTrilla,setErrTrilla]=useState("");
  const stockDe=(l)=>l.kg_producto-(l.salidas_bodega||[]).reduce((a,s)=>a+s.peso_salida,0);
  const disp=lotesFino.filter(l=>l.para_trilladora&&!l.trilla?.kg_excelso&&stockDe(l)>0);
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

  // Trilladora filter computations
  const mesesTF=[...new Set(gruposHistorico.map(g=>mesDe(g[0].trilla?.fecha_trilla||"")).filter(Boolean))].sort();
  const productosTF=[...new Set(gruposHistorico.flatMap(g=>g.map(x=>x.producto).filter(Boolean)))].sort();
  const gruposFiltradosTF=gruposHistorico.filter(grupo=>{
    const t=grupo[0].trilla;
    if(filMesTF&&mesDe(t?.fecha_trilla||"")!==filMesTF)return false;
    if(filProdTF&&!grupo.some(x=>x.producto===filProdTF))return false;
    if(busqTF){const q=busqTF.toLowerCase();if(!t?.nombre_trillado?.toLowerCase().includes(q)&&!t?.codigo_corte?.toLowerCase().includes(q)&&!grupo.some(x=>x.codigo?.toLowerCase().includes(q)))return false;}
    return true;
  });
  const hayFiltroTF=!!(filMesTF||filProdTF||busqTF);
  const sumTFExc=gruposFiltradosTF.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.trilla?.kg_excelso||0),0),0);
  const sumTFSal=gruposFiltradosTF.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((aa,b)=>aa+b.peso_salida,0),0),0);
  const sumTFStk=sumTFExc-sumTFSal;
  const sumTFValSal=gruposFiltradosTF.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.salidas_trilladora||[]).reduce((aa,b)=>aa+(b.valor_total||0),0),0),0);
  const sumTFEnt=gruposFiltradosTF.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.trilla?.entrada_usada||0),0),0);
  const sumTFCostoTotal=gruposFiltradosTF.reduce((s,g)=>s+g.reduce((a,x)=>a+(x.costo_compra_kg||0)*(x.trilla?.entrada_usada||0),0),0);
  const sumTFValStk=sumTFExc>0?Math.round(sumTFStk*(sumTFCostoTotal/sumTFExc)):0;

  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>TRILLA CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Trilladora Cafe Fino</div></div>
    {tril.length>0&&(<div style={{...S.card,marginBottom:16}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <input style={{...S.input,maxWidth:200,marginBottom:0,flex:"1 1 150px"}} placeholder="Buscar corte, código..." value={busqTF} onChange={e=>setBusqTF(e.target.value)}/>
        <select style={{...S.select,flex:"1 1 130px",maxWidth:160}} value={filMesTF} onChange={e=>setFilMesTF(e.target.value)}><option value="">Todos los meses</option>{mesesTF.map(m=>(<option key={m} value={m} style={{textTransform:"capitalize"}}>{m}</option>))}</select>
        <select style={{...S.select,flex:"1 1 140px",maxWidth:180}} value={filProdTF} onChange={e=>setFilProdTF(e.target.value)}><option value="">Todos los productos</option>{productosTF.map(p=>(<option key={p}>{p}</option>))}</select>
        {hayFiltroTF&&<button style={{...S.btnG,fontSize:11,padding:"6px 10px",color:C.red,borderColor:C.red+"40"}} onClick={()=>{setBusqTF("");setFilMesTF("");setFilProdTF("");}}>✕ Limpiar</button>}
        <span style={{color:C.textFaint,fontSize:12,marginLeft:4}}>{gruposFiltradosTF.length} de {gruposHistorico.length}</span>
      </div>
      {hayFiltroTF&&(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:14,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>CORTES</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{gruposFiltradosTF.length}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG ENTRADA</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumTFEnt)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG EXCELSO</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumTFExc)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#34d399",fontWeight:800,fontSize:15}}>{fmt(sumTFStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR STOCK</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(sumTFValStk)}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumTFSal)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR SALIDAS</div><div style={{color:"#bbf7d0",fontWeight:700,fontSize:13}}>{fmtCOP(sumTFValSal)}</div></div>
      </div>)}
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Inventario Trilladora Café Fino</div>
      <TablaScrollV minWidth={900}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Corte / Trillado","Lotes Origen","Producto","Fecha Trilla","Mes","kg Excelso","Salidas kg","Stock Excelso","Costo/kg Ex.","Valor en Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{gruposFiltradosTF.map(grupo=>{
        const repr=grupo[0];const t=repr.trilla;
        const excelso=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
        const salTotal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).reduce((a,b)=>a+b.peso_salida,0),0);
        const stock=excelso-salTotal;
        const costoTotal=grupo.reduce((s,x)=>s+((x.costo_compra_kg||0)*(x.trilla?.entrada_usada||0)),0);
        const costoEx=excelso>0?Math.round(costoTotal/excelso):0;
        return(<tr key={repr.id}>
          <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:C.green,fontWeight:600}}>{t.nombre_trillado||repr.codigo}</td>
          <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{grupo.map(x=>(<Bdg key={x.id} label={x.codigo} col={C.teal} bg={C.tealBg}/>))}</div></td>
          <td style={S.td}><Bdg label={grupo.map(x=>x.producto).filter(Boolean).join("/")||"—"} col={C.navy} bg={C.accentBg}/></td>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(t.fecha_trilla)}</td>
          <td style={{...S.td,textTransform:"capitalize"}}>{repr.mes}</td>
          <td style={{...S.td,fontWeight:600}}>{fmt(excelso)} kg</td>
          <td style={{...S.td,color:C.orange}}>{salTotal>0?fmt(salTotal)+" kg":"—"}</td>
          <td style={S.td}><span style={{fontWeight:700,fontSize:14,color:stock>0?C.green:C.textFaint}}>{fmt(stock)} kg</span></td>
          <td style={{...S.td,color:C.purple,fontWeight:600}}>{costoEx?fmtCOP(costoEx):"—"}</td>
          <td style={{...S.td,color:C.gold,fontWeight:700}}>{stock>0&&costoEx?fmtCOP(Math.round(stock*costoEx)):"—"}</td>
        </tr>);
      })}{gruposFiltradosTF.length===0&&<tr><td colSpan={9} style={{...S.td,color:C.textFaint,textAlign:"center"}}>{hayFiltroTF?"Sin cortes que coincidan con los filtros.":"Sin trillas registradas todavia."}</td></tr>}</tbody></table></TablaScrollV>
    </div>)}
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
    {gruposHistorico.length>0&&(<div style={{...S.card,marginTop:16}}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Historico Trilla Cafe Fino</div><TablaScrollV minWidth={1200}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1200}}><thead><tr>{["Fecha Trilla","Corte","Lotes","Cod. Trillado","Proceso","Perg. kg","Excelso kg","Merma kg","% Merma","FI","FP Pond.","Dif.","Rend.","Costo/kg Ex","Stock Excelso","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
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
        <td style={{...S.td,color:C.textDim,fontSize:12}}>{fmtFecha(t.fecha_trilla)}</td>
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
    })}</tbody></table></TablaScrollV></div>)}

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
const poolBlendFino=(lotesFino,blendsFino,editId)=>{
  const pool=[];
  // From Trilladora CF: salidas_trilladora with destino_key blend_cf
  lotesFino.filter(l=>l.trilla?.kg_excelso>0).forEach(l=>{
    (l.salidas_trilladora||[]).filter(s=>s.destino_key==="blend_cf").forEach(s=>{
      pool.push({key:"finolote:sal:"+s.id,salidaId:s.id,reprId:l.id,codigo:l.trilla.nombre_trillado||l.codigo,producto:l.producto,kg_total:s.peso_salida,valor_kg:s.valor_kg,fecha:s.fecha,tipo:"finolote"});
    });
  });
  // From Bodega CF: salidas_bodega with destino_key blend_cf
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

function BlendFino({lotesFino,setLotesFino,blendsFino,setBlendsFino}){
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
  const sumBFKgSal=blendsFiltrados.reduce((s,b)=>s+(b.salidas||[]).reduce((a,x)=>a+x.peso_salida,0),0);
  const sumBFValSal=blendsFiltrados.reduce((s,b)=>s+(b.salidas||[]).reduce((a,x)=>a+(x.valor_total||0),0),0);
  const sumBFStk=blendsFiltrados.reduce((s,b)=>s+stockBlend(b),0);
  const totalKgBlends=blendsFino.reduce((s,b)=>s+b.kg_total,0);
  const totalValBlends=blendsFino.reduce((s,b)=>s+b.valor_total,0);
  const totalValSalidasB=blendsFino.reduce((s,b)=>s+(b.salidas||[]).reduce((a,x)=>a+(x.valor_total||0),0),0);
  // Pool externo visible (items desde Bodega CF y Trilladora CF destino blend_cf)
  const poolExterno=poolAll.filter(p=>p.tipo==="finolote"||p.tipo==="bodegabf");

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.purple,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>MEZCLAS CAFE FINO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Blend Cafe Fino</div></div><button style={{...S.btn,background:C.purple}} onClick={abrirNuevo}>+ Nuevo Blend</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Blends Creados" value={blendsFino.length} col={C.navy}/>
      <KPI label="Pool Disponible" value={fmt(totalKgDisponiblePool)+" kg"} col={C.teal}/>
      <KPI label="kg en Blends" value={fmt(totalKgBlends)+" kg"} col={C.accent}/>
      <KPI label="Valor en Blends" value={fmtCOP(totalValBlends)} col={C.gold}/>
      <KPI label="Valor Salidas" value={fmtCOP(totalValSalidasB)} col={C.green}/>
    </div>
    {poolExterno.length>0&&(<div style={{...S.card,marginBottom:16,borderLeft:"3px solid "+C.teal}}>
      <div style={{fontWeight:600,fontSize:13,color:C.teal,marginBottom:10}}>Insumos disponibles para Blend (desde Bodega CF y Trilladora CF)</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{poolExterno.map(p=>{const kgDisp=p.kg_total-kgUsadoDeKey(p.key);if(kgDisp<=0)return null;return(<div key={p.key} style={{background:p.tipo==="bodegabf"?C.accentBg:C.greenBg,border:"1px solid "+(p.tipo==="bodegabf"?C.accent:C.green)+"40",borderRadius:6,padding:"8px 12px",minWidth:180}}>
        <div style={{color:p.tipo==="bodegabf"?C.accent:C.green,fontWeight:700,fontSize:12,fontFamily:"monospace"}}>{p.codigo}</div>
        <div style={{color:C.textDim,fontSize:11,marginTop:2}}>{p.tipo==="bodegabf"?"Desde Bodega":"Desde Trilladora"} | {p.producto||"—"}</div>
        <div style={{color:C.navy,fontWeight:700,fontSize:13,marginTop:4}}>{fmt(kgDisp)} kg | {fmtCOP(p.valor_kg)}/kg</div>
      </div>);})}</div>
    </div>)}
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border,flexWrap:"wrap"}}>
      {[["inventario","Inventario"],["historico","Historico de Salidas"]].map(([k,v])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:tab===k?600:400,color:tab===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tab===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
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
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG TOTAL</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumBFKgT)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG STOCK</div><div style={{color:"#6ee7b7",fontWeight:700,fontSize:15}}>{fmt(sumBFStk)} kg</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR TOTAL</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(sumBFValT)}</div></div>
        <div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG SALIDAS</div><div style={{color:"#fdba74",fontWeight:700,fontSize:15}}>{fmt(sumBFKgSal)} kg</div></div>
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
        <td style={S.td}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{b.items.map(it=>(<Bdg key={it.key} label={it.codigo+" ("+fmt(it.kg_usado)+"kg)"} col={C.teal} bg={C.tealBg}/>))}</div></td>
        <td style={{...S.td,fontWeight:700,color:C.navy}}>{fmt(b.kg_total)} kg</td>
        <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(Math.round(b.costo_kg))}</td>
        <td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(b.valor_total)}</td>
        <td style={{...S.td,color:C.orange}}>{fmt(salKg)}</td>
        <td style={S.td}><span style={{color:stock>0?C.green:C.red,fontWeight:700}}>{fmt(stock)} kg</span></td>
        <td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...S.btn,fontSize:11,padding:"6px 12px",background:stock>0?C.accent:C.textFaint,cursor:stock>0?"pointer":"not-allowed"}} disabled={stock<=0} onClick={()=>abrirSalidaB(b)}>+ Salida</button><button style={{...S.btnG,fontSize:11,padding:"6px 12px"}} onClick={()=>abrirEditar(b)}>Editar</button></div></td>
      </tr>);})}</tbody></table></TablaScrollV>
      {blendsFiltrados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>{hayFiltroBF?"Sin blends que coincidan con los filtros.":"Sin blends registrados todavia."}</div>}
    </div>)}
    {tab==="historico"&&(blendsFino.some(b=>(b.salidas||[]).length>0)?(<div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Historico de Salidas</div><TablaScrollV minWidth={900}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr>{["Blend","Fecha","Cliente/Destino","Factura","Remision","Peso Salida","Valor/kg","Valor Total","Observaciones",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{blendsFino.flatMap(b=>(b.salidas||[]).map(s=>({...s,codigo:b.codigo,blendRef:b}))).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(s=>(<tr key={s.id}><td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace"}}>{s.codigo}</td><td style={{...S.td,color:C.textDim}}>{fmtFecha(s.fecha)}</td><td style={{...S.td,fontWeight:600}}>{s.cliente||"-"}</td><td style={S.td}><Bdg label={s.factura||"-"} col={C.navy}/></td><td style={S.td}>{s.remision||"-"}</td><td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(s.peso_salida)} kg</td><td style={{...S.td,color:C.gold}}>{fmtCOP(s.valor_kg)}</td><td style={{...S.td,color:C.gold,fontWeight:700}}>{fmtCOP(s.valor_total)}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{s.observaciones||"-"}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarSalidaB(s.blendRef,s)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV></div>):(<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin salidas registradas todavia.</div>))}

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
  const [tab,setTab]=useState("registros");
  // --- Tab A: Registros ---
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankA=()=>({fecha:today(),cliente:"",telefono:"",kg_recibidos:"",servicio:SERVICIOS_MAQUILA[0],observaciones:""});
  const [form,setForm]=useState(blankA());
  const mesAuto=mesDe(form.fecha);const semanaAuto=semanaISO(form.fecha);
  const genCodM=()=>"MAQUILA-"+dateToCode(form.fecha)+"-"+form.cliente.replace(/\s+/g,"");
  const regA=()=>{
    if(!form.cliente||!form.kg_recibidos)return;
    if(editId){setMaquilas(p=>p.map(m=>m.id===editId?{...m,fecha:form.fecha,mes:mesAuto,semana:semanaAuto,cliente:form.cliente,telefono:form.telefono,kg_recibidos:+form.kg_recibidos,servicio:form.servicio,observaciones:form.observaciones}:m));}
    else{setMaquilas(p=>[{id:genId(),codigo:genCodM(),fecha:form.fecha,mes:mesAuto,semana:semanaAuto,cliente:form.cliente,telefono:form.telefono,kg_recibidos:+form.kg_recibidos,servicio:form.servicio,observaciones:form.observaciones,salidas:[],estado_pipeline:"registro",trilla_mq:null,tostado_mq:null,entregas_mq:[]},...p]);}
    setModal(false);
  };
  const enviarTrilla=(m)=>{setMaquilas(p=>p.map(x=>x.id===m.id?{...x,estado_pipeline:"en_trilla"}:x));setTab("trilla");};
  // --- Tab B: Trilla ---
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
  // --- Tab C: Tostado ---
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
  // --- Tab D: Entregas ---
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
  // KPIs
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
    <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Registros de Tostacion</div><TablaScrollV minWidth={1500}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1500}}><thead><tr>{["Codigo","Fecha","Mes","Producto","Trazabilidad","kg a Tostar","Valor Unit.","Valor Total","Temp.","Tiempo","Tipo Tostión","kg Tostado","Rend.","Stock kg","Catacion","Responsable","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
      <tbody>{blendsTostado.map(t=>{const stock=stockTostado(t);return(<tr key={t.id}>
        <td style={{...S.td,color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{t.codigo||"-"}</td>
        <td style={{...S.td,color:C.textDim}}>{fmtFecha(t.fecha)}</td>
        <td style={{...S.td,textTransform:"capitalize"}}>{mesDe(t.fecha)}</td>
        <td style={{...S.td,fontWeight:600}}>{t.nombre_producto||"-"}</td>
        <td style={S.td}><div style={{display:"flex",flexDirection:"column",gap:2,fontSize:10}}>
          {t.codigo_lote_origen&&<span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>Lote: {t.codigo_lote_origen}</span>}
          {t.fecha_proceso&&<span style={{color:C.textDim}}>Proceso: {fmtFecha(t.fecha_proceso)}</span>}
          {t.fecha_trilla&&<span style={{color:C.textDim}}>Trilla: {fmtFecha(t.fecha_trilla)}</span>}
          {t.fecha_secado&&<span style={{color:C.textDim}}>Secado: {fmtFecha(t.fecha_secado)}</span>}
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
      </tr>);})}</tbody></table></TablaScrollV>
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
    {tab==="lotes"&&(<div style={S.card}><TablaScrollV minWidth={1100}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1100}}><thead><tr>{["Codigo","Mes","Fincas","kg Cereza","kg Seco","Conv.","Fecha Sec.","Reactor","Silo","Humedad","Producto","a) MP/kg","b) Ins/kg","c) CB/kg","Total/kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
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
      </tr>))}</tbody></table></TablaScrollV></div>)}

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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div><div style={{color:C.purple,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{b.codigo}</div><div style={{color:C.textDim,fontSize:11,marginTop:2}}>{b.nombre} - Fecha Blend: {fmtFecha(b.fecha)}</div></div><Bdg label={fmt(stock)+" kg stock"} col={stock>0?C.green:C.red} bg={stock>0?C.greenBg:C.redBg}/></div>
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}><KPI label="Total Costos" value={fmtCOP(costos.reduce((s,c)=>s+c.valor,0))} col={C.red}/><KPI label="Central Beneficio" value={fmtCOP(porC["Central de Beneficio"]||0)} col={C.teal}/><KPI label="Trilladora" value={fmtCOP(porC["Trilladora"]||0)} col={C.purple}/><KPI label="Tostado" value={fmtCOP(porC["Tostado"]||0)} col={C.orange}/><KPI label="Maquila" value={fmtCOP(porC["Maquila"]||0)} col={C.gold}/><KPI label="Bodega Cafe Fino" value={fmtCOP(porC["Bodega Cafe Fino"]||0)} col={C.green}/><KPI label="Registros" value={costos.length} col={C.accent}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16,marginBottom:16}}>
      <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><div style={{fontWeight:600,fontSize:14,color:C.navy}}>Costos por Tipo</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{["todos",...CENTROS].map(c=>(<button key={c} style={{...S.btnG,background:fil===c?C.navy:"transparent",color:fil===c?C.white:C.textDim,fontSize:11,padding:"4px 10px"}} onClick={()=>setFil(c)}>{c==="todos"?"Todos":c}</button>))}</div></div>
        {Object.entries(porT).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>{const p=total?val/total*100:0;return(<div key={tipo} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:C.text}}>{tipo}</span><span style={{color:C.orange,fontWeight:600,fontSize:12}}>{fmtCOP(val)}</span></div><div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:C.orange,width:p+"%",height:"100%",borderRadius:4}}/></div></div>);})}
        <div style={{borderTop:"2px solid "+C.border,paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between"}}><span style={{color:C.navy,fontWeight:700}}>TOTAL</span><span style={{color:C.navy,fontSize:15,fontWeight:700}}>{fmtCOP(total)}</span></div>
      </div>
      <div style={S.card}><div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Por Centro de Costo</div>{CENTROS.map(cc=>{const col=CENTRO_COL[cc]||C.teal;const v=porC[cc]||0;const t=costos.reduce((s,c)=>s+c.valor,0);const p=t?v/t*100:0;return(<div key={cc} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:600,color:C.navy,fontSize:12}}>{cc}</span><span style={{color:col,fontWeight:700,fontSize:13}}>{fmtCOP(v)}</span></div><div style={{background:C.bg,borderRadius:4,height:10,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:col,width:p+"%",height:"100%",borderRadius:4}}/></div><div style={{color:C.textDim,fontSize:10,marginTop:2}}>{p.toFixed(1)}% del total</div></div>);})}</div>
    </div>
    <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Historial</div><TablaScrollV minWidth={700}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr>{["Fecha","Mes","Tipo","Descripcion","Centro","Valor",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{costos.map(c=>(<tr key={c.id}><td style={{...S.td,color:C.textDim}}>{c.fecha}</td><td style={{...S.td,color:C.textDim,textTransform:"capitalize"}}>{c.mes}</td><td style={S.td}><Bdg label={c.tipo} col={C.orange} bg={C.orangeBg}/></td><td style={{...S.td,color:C.text}}>{c.descripcion}</td><td style={S.td}><Bdg label={c.centro} col={CENTRO_COL[c.centro]||C.teal} bg={CENTRO_BG[c.centro]||C.tealBg}/></td><td style={{...S.td,color:C.orange,fontWeight:700,textAlign:"right"}}>{fmtCOP(c.valor)}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarC(c)}>Editar</button></td></tr>))}</tbody></table></TablaScrollV></div>
    {modal&&(<Modal title={editId?"Editar Costo":"Registrar Nuevo Costo"} onClose={()=>{setModal(false);setEditId(null);}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>{const d=e.target.value;setForm(p=>({...p,fecha:d,mes:mesDe(d)||p.mes}));}}/></Fld>
        <Fld label="Mes (auto)" half><input style={{...S.input,background:C.panel2,color:C.textDim,textTransform:"capitalize"}} value={form.mes} readOnly/></Fld>
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
  const [invLoading,setInvLoading]=useState(null);const [invMsgs,setInvMsgs]=useState({});
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
  const invitar=async(u)=>{
    setInvLoading(u.id);setInvMsgs(p=>({...p,[u.id]:""}));
    try{
      const secApp=fbInitApp(cfg,"inv-"+Date.now());
      const secAuth=fbGetAuth(secApp);
      const tp=Math.random().toString(36).slice(-8)+"Aa1!";
      try{await createUserWithEmailAndPassword(secAuth,u.email,tp);}
      catch(e){
        if(e.code==="auth/email-already-in-use"){
          await fbDeleteApp(secApp);
          try{await sendPasswordResetEmail(auth,u.email);setInvMsgs(p=>({...p,[u.id]:"✓ Enlace enviado a "+u.email}));}
          catch(e2){setInvMsgs(p=>({...p,[u.id]:"Este correo usa Google. El usuario puede ingresar con Google directamente."}));}
          setInvLoading(null);return;
        }
        throw e;
      }
      await fbDeleteApp(secApp);
      await sendPasswordResetEmail(auth,u.email);
      setInvMsgs(p=>({...p,[u.id]:"✓ Invitacion enviada a "+u.email}));
    }catch(e){setInvMsgs(p=>({...p,[u.id]:"Error: "+(e.message||e.code)}));}
    setInvLoading(null);
  };
  const resetClave=async(u)=>{
    setInvLoading(u.id);setInvMsgs(p=>({...p,[u.id]:""}));
    try{await sendPasswordResetEmail(auth,u.email);setInvMsgs(p=>({...p,[u.id]:"✓ Email de reset enviado a "+u.email}));}
    catch(e){setInvMsgs(p=>({...p,[u.id]:"Error: "+(e.message||e.code)}));}
    setInvLoading(null);
  };
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.accent,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>GESTION DE ACCESO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Usuarios del Sistema</div></div><button style={S.btn} onClick={abrirNuevoU}>+ Nuevo Usuario</button></div>
    <div style={S.card}><TablaScrollV minWidth={700}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr>{["#","Nombre","Email","Rol","Estado","Acciones","Acceso"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{usuarios.map(u=>(<tr key={u.id}><td style={{...S.td,color:C.textFaint,fontSize:11}}>{u.id}</td><td style={{...S.td,fontWeight:600,color:C.navy}}>{u.nombre}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{u.email}</td><td style={S.td}><Bdg label={u.rol} col={C.accent} bg={C.accentBg}/></td><td style={S.td}><Bdg label={u.activo?"Activo":"Inactivo"} col={u.activo?C.green:C.red} bg={u.activo?C.greenBg:C.redBg}/></td><td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={S.btnG} onClick={()=>setUsuarios(p=>p.map(x=>x.id===u.id?{...x,activo:!x.activo}:x))}>{u.activo?"Desactivar":"Activar"}</button><button style={S.btnG} onClick={()=>abrirEditarU(u)}>Editar</button><button style={S.btnG} onClick={()=>resetClave(u)} disabled={invLoading===u.id}>Reset Clave</button></div></td><td style={S.td}><div style={{display:"flex",flexDirection:"column",gap:4,minWidth:100}}><button style={{background:C.green,border:"none",borderRadius:6,color:C.white,cursor:"pointer",fontSize:11,fontWeight:600,padding:"5px 10px",opacity:invLoading===u.id?0.6:1}} onClick={()=>invitar(u)} disabled={invLoading===u.id}>{invLoading===u.id?"Enviando...":"Invitar"}</button>{invMsgs[u.id]&&<div style={{color:invMsgs[u.id].startsWith("✓")?C.green:C.red,fontSize:10,lineHeight:1.3}}>{invMsgs[u.id]}</div>}</div></td></tr>))}</tbody></table></TablaScrollV></div>
    {modal&&(<Modal title={editId?"Editar Usuario":"Nuevo Usuario"} onClose={()=>{setModal(false);setErr("");}}><div style={{color:C.textDim,fontSize:12,marginBottom:14,padding:"8px 12px",background:C.accentBg,borderRadius:6}}>Despues de agregar el usuario usa el boton "Invitar" para enviarle el correo de acceso a la plataforma.</div><Fld label="Nombre Completo"><input style={S.input} value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}/></Fld><Fld label="Correo Electronico"><input style={S.input} type="email" placeholder="usuario@empresa.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value.toLowerCase()}))}/></Fld><Fld label="Rol"><select style={S.select} value={form.rol} onChange={e=>setForm(p=>({...p,rol:e.target.value}))}>{ROLES.map(r=>(<option key={r}>{r}</option>))}</select></Fld>{err&&<div style={{color:C.red,fontSize:12,marginBottom:10,padding:"8px 12px",background:C.redBg,borderRadius:4}}>{err}</div>}<div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModal(false);setErr("");}}>Cancelar</button><button style={S.btn} onClick={agregar}>{editId?"Guardar Cambios":"Agregar Usuario"}</button></div></Modal>)}
  </div>);
}

function LoginForm({notAuthorized}){
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");const [resetMode,setResetMode]=useState(false);const [resetSent,setResetSent]=useState(false);
  const MSGS={"auth/user-not-found":"Correo no registrado.","auth/wrong-password":"Contraseña incorrecta.","auth/invalid-credential":"Correo o contraseña incorrectos.","auth/too-many-requests":"Demasiados intentos. Espera unos minutos."};
  const login=async()=>{if(!email||!pass){setErr("Ingresa correo y contraseña.");return;}setLoading(true);setErr("");try{await signInWithEmailAndPassword(auth,email,pass);}catch(e){setErr(MSGS[e.code]||"Error al iniciar sesion.");setLoading(false);}};
  const loginGoogle=async()=>{setLoading(true);setErr("");try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){if(e.code!=="auth/popup-closed-by-user")setErr("Error con Google.");setLoading(false);}};
  const forgot=async()=>{if(!email){setErr("Ingresa tu correo primero.");return;}setLoading(true);setErr("");try{await sendPasswordResetEmail(auth,email);setResetSent(true);}catch(e){setErr("No encontramos ese correo.");}setLoading(false);};
  const panelLeft=(<div style={{width:"50%",background:"linear-gradient(145deg,#1E3A5F 0%,#2D5F8A 50%,#0E7490 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48}}><div style={{textAlign:"center",maxWidth:380}}><div style={{width:220,height:220,borderRadius:"50%",background:C.white,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 32px",boxShadow:"0 16px 48px rgba(0,0,0,0.3)",padding:22}}><img src="/logo-cafeuba.png" alt="CafeUba" style={{width:"100%",height:"100%",objectFit:"contain"}}/></div><div style={{color:"rgba(255,255,255,0.8)",fontSize:14,marginBottom:36,lineHeight:1.7,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600}}>Central de Beneficio<br/>Plan Milan</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["&#127807;","Recepcion"],["&#9881;","Proceso"],["&#9728;","Secado"],["&#9989;","Trilla"]].map(([ic,lb])=>(<div key={lb} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.15)"}}><span dangerouslySetInnerHTML={{__html:ic}} style={{fontSize:20}}/><div style={{color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:5,fontWeight:500}}>{lb}</div></div>))}</div></div></div>);
  return(<div style={{...S.app,display:"flex",minHeight:"100vh"}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    {panelLeft}
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:48,background:C.bg}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{marginBottom:28}}><div style={{color:C.navy,fontSize:26,fontWeight:700,marginBottom:5}}>Bienvenido</div><div style={{color:C.textDim,fontSize:13}}>{resetMode?"Recuperar contraseña":"Ingresa a la plataforma de operaciones"}</div></div>
        <div style={{...S.card,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
          {notAuthorized&&<div style={{color:C.red,fontSize:12,marginBottom:16,padding:"10px 12px",background:C.redBg,borderRadius:6}}>Tu cuenta no tiene acceso. Pide al administrador que te agregue en la seccion Usuarios.</div>}
          {err&&<div style={{color:C.red,fontSize:12,marginBottom:12,padding:"10px 12px",background:C.redBg,borderRadius:6}}>{err}</div>}
          {resetSent?(<div style={{color:C.green,fontSize:13,padding:"14px",background:C.greenBg,borderRadius:6,textAlign:"center",lineHeight:1.6}}>✓ Revisa tu correo.<br/>Te enviamos un enlace para crear tu contraseña.<br/><button style={{...S.btnG,marginTop:12,width:"100%"}} onClick={()=>{setResetSent(false);setResetMode(false);}}>Volver al inicio</button></div>):(<>
            <div style={{marginBottom:12}}><label style={S.lbl}>Correo electronico</label><input style={S.input} type="email" placeholder="tu@correo.com" value={email} onChange={e=>setEmail(e.target.value.toLowerCase())} onKeyDown={e=>e.key==="Enter"&&!resetMode&&login()}/></div>
            {!resetMode&&<div style={{marginBottom:6}}><label style={S.lbl}>Contraseña</label><input style={S.input} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/></div>}
            {!resetMode&&<div style={{textAlign:"right",marginBottom:14}}><button style={{background:"none",border:"none",color:C.accent,fontSize:12,cursor:"pointer",padding:0}} onClick={()=>{setResetMode(true);setErr("");}}>¿Olvidaste tu contraseña?</button></div>}
            {resetMode?(<><button style={{...S.btn,width:"100%",marginBottom:8}} onClick={forgot} disabled={loading}>{loading?"Enviando...":"Enviar enlace de acceso"}</button><button style={{...S.btnG,width:"100%",textAlign:"center"}} onClick={()=>{setResetMode(false);setErr("");}}>Volver</button></>):(<>
              <button style={{...S.btn,width:"100%",marginBottom:14}} onClick={login} disabled={loading}>{loading?"Iniciando...":"Iniciar sesion"}</button>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{flex:1,height:1,background:C.border}}/><span style={{color:C.textFaint,fontSize:11}}>o</span><div style={{flex:1,height:1,background:C.border}}/></div>
              <button style={{background:C.white,border:"1px solid #dadce0",borderRadius:8,color:"#3c4043",cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:500,gap:10,padding:"10px 20px",width:"100%",opacity:loading?0.7:1}} onClick={loginGoogle} disabled={loading}><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continuar con Google</button>
            </>)}
          </>)}
        </div>
      </div>
    </div>
  </div>);
}

function BulkLoader({lotes,setLotes,blends,setBlends,setCostos,lotesFino,setLotesFino,blendsFino,setBlendsFino,setMaquilas,setBlendsTostado,setUsuarios}){
  const [status,setStatus]=useState("idle");
  const [statusCF,setStatusCF]=useState("idle");
  const [wipeStatus,setWipeStatus]=useState("idle");
  const [log,setLog]=useState([]);
  const [logCF,setLogCF]=useState([]);
  const INS0={jugo:0,panela:0,harina:0,levadura:0,vr_jugo:0,vr_panela:0,vr_harina:0,vr_levadura:0};
  const excF=d=>new Date((d-25569)*86400000).toISOString().slice(0,10);
  const rawMilan=[
    {codigo:"MB L7-6 Y CAPRI 151125",fecha:"2026-01-31",mes:"enero",producto:"MB",kg:405,costo:28191.78},
    {codigo:"MB CAPRI LOTE 15-LOTE 12-VECINO 201125",fecha:"2026-01-31",mes:"enero",producto:"MB",kg:160,costo:26412.25},
    {codigo:"Barredura 310326",fecha:"2026-03-31",mes:"marzo",producto:"PAS",kg:73,costo:0},
    {codigo:"CPS Sin identificacion",fecha:"2026-03-31",mes:"marzo",producto:"Regional",kg:182,costo:0},
    {codigo:"Excelso Sin identificacion",fecha:"2026-03-31",mes:"marzo",producto:"Regional Excelso",kg:81,costo:0},
    {codigo:"LVD-BIOMASTER-100426",fecha:"2026-04-23",mes:"abril",producto:"BIO",kg:102.2,costo:40034.47705008096},
    {codigo:"RIV-LVD-BIOMASTER-280326",fecha:"2026-04-30",mes:"abril",producto:"BIO",kg:98,costo:48785.94000494723},
    {codigo:"LVD-BIOMASTER-210326",fecha:"2026-04-30",mes:"abril",producto:"BIO",kg:73,costo:37232.18439238451},
    {codigo:"L 15-14-NAT-NAT-150526",fecha:"2026-06-08",mes:"junio",producto:"NAT",kg:104.2,costo:35940.96989941069},
    {codigo:"RIVIERA -SAN ISIDRO-NAT-NAT-030626",fecha:"2026-06-30",mes:"junio",producto:"NAT",kg:180,costo:32776.38653645601},
    {codigo:"CLTG-DR-030626",fecha:"2026-06-17",mes:"junio",producto:"DR",kg:660.2,costo:38420.23062242539},
    {codigo:"CLTG-AR-100626",fecha:"2026-06-18",mes:"junio",producto:"AR",kg:839.2,costo:36344.32801126943},
    {codigo:"LVD-LVD-110626",fecha:"2026-06-18",mes:"junio",producto:"REGIONAL",kg:357.2,costo:34804.40152833351},
    {codigo:"TERMO-NAT-NAT-030626",fecha:"2026-06-18",mes:"junio",producto:"NAT",kg:154.2,costo:26760.615927137016},
    {codigo:"GESHA CAPRI RIVIERA-NAT-NAT-270526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:89,costo:39787.30483788046},
    {codigo:"L 10  -NAT-NAT-290526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:3,costo:27712.39847083926},
    {codigo:"L 17-NAT-NAT-220526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:133,costo:23241.220525977104},
    {codigo:"L 17 - 13-NAT-NAT-220526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:362,costo:15874.46108594055},
    {codigo:"L 5-NAT-NAT-060526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:4,costo:29045.731804172592},
    {codigo:"L 20-NAT-NAT-060526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:6,costo:26379.065137505924},
    {codigo:"LOTE 17-LVD-LVD-120626",fecha:"2026-07-02",mes:"julio",producto:"REGIONAL",kg:196,costo:42315.116884083516},
    {codigo:"LOTE 15-NAT-NAT-190626",fecha:"2026-07-02",mes:"julio",producto:"REGIONAL",kg:251,costo:22308.745987540562},
  ];
  const rawTri=[
    {codigo:"PARA CAPITAN MARK 151025",fecha:"2026-02-18",mes:"febrero",producto:"PARA CAPITAN",kg:487,costo:37209.35},
    {codigo:"BOURBON SUAZA 130125",fecha:"2026-02-18",mes:"febrero",producto:"PASILLA",kg:760,costo:32350.93},
    {codigo:"AGRAZ 2611",fecha:"2026-02-18",mes:"febrero",producto:"AGR",kg:470,costo:37052.83},
    {codigo:"PASILLAS CON OLOR",fecha:"2026-02-18",mes:"febrero",producto:"PASILLA CO",kg:846,costo:0},
    {codigo:"BARREDURA  Y CATADORA",fecha:"2026-02-18",mes:"febrero",producto:"PASILLA CO",kg:737,costo:0},
    {codigo:"MB 1501",fecha:"2026-02-18",mes:"febrero",producto:"MB",kg:521,costo:41101.73},
    {codigo:"RECHAZO DE CATURRA NITRO ENERO",fecha:"2026-02-18",mes:"febrero",producto:"Caturra Nitro Rechazo",kg:183,costo:0},
    {codigo:"LAVADO L4,L5,L6 061225",fecha:"2026-02-18",mes:"febrero",producto:"PASILLA",kg:281,costo:0},
    {codigo:"PARA CAPITAN MARK 151025",fecha:"2026-02-23",mes:"febrero",producto:"PARA CAPITAN",kg:1122.3,costo:36916.12},
    {codigo:"M 491-ESTATE CAPRI Y RIVIERA-2502",fecha:"2026-02-25",mes:"febrero",producto:"CAPITAN MARK",kg:593,costo:25923.84},
    {codigo:"M 494-DESCARTE CON OLOR -0203",fecha:"2026-03-02",mes:"marzo",producto:"PASILLA CO",kg:697,costo:29412.238},
    {codigo:"M 497-AR-0603",fecha:"2026-03-06",mes:"marzo",producto:"AR",kg:296,costo:50325.159},
    {codigo:"M 501-EXCELSO FLOTE -1203",fecha:"2026-03-12",mes:"marzo",producto:"PASILLA SO",kg:593,costo:0},
    {codigo:"M 504-GESHA TAMBO-1803",fecha:"2026-03-19",mes:"marzo",producto:"Gesha Nar",kg:209,costo:52492.652},
    {codigo:"M 492-DESCARTE SIN OLOR -2702",fecha:"2026-04-28",mes:"abril",producto:"Descarte sin olor",kg:1519,costo:35071.96},
    {codigo:"M 515-DR-2304",fecha:"2026-04-21",mes:"abril",producto:"DR",kg:499,costo:78620.582},
    {codigo:"Regional recuperado 2301",fecha:"2026-04-21",mes:"abril",producto:"PASILLA",kg:803,costo:0},
    {codigo:"M 526-SD-2505",fecha:"2026-05-25",mes:"mayo",producto:"SD",kg:245,costo:73245.452},
    {codigo:"M 525-CONSUMO#1-2105",fecha:"2026-05-26",mes:"mayo",producto:"CONSUMO",kg:1296,costo:960.877},
    {codigo:"M 528-MR-0206",fecha:"2026-06-02",mes:"junio",producto:"MR",kg:170,costo:76991.085},
    {codigo:"M 530-REGIONAL 1-0406",fecha:"2026-06-10",mes:"junio",producto:"REGIONAL",kg:1000,costo:26195.725},
    {codigo:"M 531-NR-0806",fecha:"2026-06-10",mes:"junio",producto:"NR",kg:56,costo:78389.204},
    {codigo:"M 532-MR-1106",fecha:"2026-06-11",mes:"junio",producto:"MR",kg:99,costo:62023.978},
    {codigo:"M 533-LYCHE-1106",fecha:"2026-06-11",mes:"junio",producto:"LYCHE",kg:92,costo:62921.728},
    {codigo:"M 534-AGRAZ-1206",fecha:"2026-06-12",mes:"junio",producto:"AGRAZ",kg:47,costo:48926.989},
    {codigo:"M 537-CC-1806",fecha:"2026-06-19",mes:"junio",producto:"CC",kg:218,costo:47215.575},
    {codigo:"M 538-REGIONAL-1906",fecha:"2026-06-23",mes:"junio",producto:"REGIONAL",kg:7692,costo:25259.453},
    {codigo:"M 540-SD-2406",fecha:"2026-06-24",mes:"junio",producto:"SD",kg:76,costo:70906.021},
    {codigo:"M 541-BB-3006",fecha:"2026-06-30",mes:"junio",producto:"BB",kg:250,costo:41676.702},
    {codigo:"M 542-AGRAZ-3006",fecha:"2026-06-30",mes:"junio",producto:"AGRAZ",kg:1067,costo:67820.986},
    {codigo:"M 543-NR-0207",fecha:"2026-07-03",mes:"julio",producto:"NR",kg:439,costo:47177.156},
  ];
  const rawBlends=[
    {fecha:"2026-03-04",mes:"marzo",nombre:"TABACO 0403",costo:41268.495,kg:227,productoComercial:"Tabacco"},
    {fecha:"2026-03-17",mes:"marzo",nombre:"PINK BOURBON MAME 1703",costo:41839.742,kg:13,productoComercial:"Pink Borbon"},
    {fecha:"2026-04-09",mes:"abril",nombre:"MAYPOP 0904",costo:52383.465,kg:8,productoComercial:"Maypop"},
    {fecha:"2026-04-13",mes:"abril",nombre:"NG  (LYCHE) 1304",costo:44030.459,kg:72,productoComercial:"NG"},
    {fecha:"2026-04-17",mes:"abril",nombre:"APRIL 1704",costo:47562.328,kg:5,productoComercial:"April"},
    {fecha:"2026-04-23",mes:"abril",nombre:"Capitan 2304",costo:25923.84,kg:9,productoComercial:"Capitan"},
    {fecha:"2026-05-07",mes:"mayo",nombre:"APRIL 0705",costo:31627.701,kg:627,productoComercial:"APRIL"},
    {fecha:"2026-05-12",mes:"mayo",nombre:"NIU 1205",costo:40811.403,kg:4,productoComercial:"NIU"},
    {fecha:"2026-05-12",mes:"mayo",nombre:"NG 1205",costo:31780.709,kg:302,productoComercial:"NG"},
    {fecha:"2026-05-20",mes:"mayo",nombre:"CATURRA NITRO 2505",costo:40499.516,kg:278,productoComercial:"Caturra nitro"},
    {fecha:"2026-06-10",mes:"junio",nombre:"PINK BOURBON 1106",costo:36640.152,kg:1202,productoComercial:"Pink Borbon"},
    {fecha:"2026-06-11",mes:"junio",nombre:"MAYPOP 1106",costo:53421.807,kg:1232,productoComercial:"Maypop"},
    {fecha:"2026-06-13",mes:"junio",nombre:"NG 1306",costo:33540.926,kg:1051,productoComercial:"NG"},
    {fecha:"2026-06-15",mes:"junio",nombre:"AGI 1506",costo:30700.151,kg:792,productoComercial:"AGI"},
    {fecha:"2026-06-17",mes:"junio",nombre:"CATURRA NITRO 1706",costo:42046.148,kg:3822,productoComercial:"Caturra nitro"},
    {fecha:"2026-06-26",mes:"junio",nombre:"NIU 2606",costo:48009.572,kg:1382.5,productoComercial:"NIU"},
    {fecha:"2026-06-30",mes:"junio",nombre:"TROPICAL 3006",costo:57550.766,kg:4,productoComercial:"TROPICAL"},
    {fecha:"2026-07-06",mes:"julio",nombre:"VAINILLA 0607",costo:49246.077,kg:1112,productoComercial:"VAINILLA"},
  ];
  const rawFino=[
    {codigo:"LAURINA 151223",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"VARIETAL",kg:48,costo:24267.27},
    {codigo:"KW 1106",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"NA",kg:97,costo:46995.12},
    {codigo:"WUSH WUSH LAVADO ARGEMIRO",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"VARIETAL",kg:48,costo:101835.93},
    {codigo:"CONSUMO NATURAL 0710",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"NA",kg:273,costo:24161.07},
    {codigo:"DULCE JESUS MIO",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"",kg:24,costo:0},
    {codigo:"AR NATURAL",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"AR",kg:49,costo:0},
    {codigo:"SUDAN BIO 2402",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"VARIETAL",kg:13,costo:48000},
    {codigo:"M 497-AR-0603",fecha:46112,mes:"marzo",proveedor:"Trilladora Milan",producto:"AR",kg:223,costo:50325.16},
    {codigo:"TABACCO1702",fecha:46112,mes:"marzo",proveedor:"Trilladora Milan",producto:"TABACCO",kg:298,costo:37735.66},
    {codigo:"Washed Gesiha",fecha:46112,mes:"marzo",proveedor:"Trilladora Milan",producto:"VARIETAL",kg:6,costo:0},
    {codigo:"AGRAZ 2611",fecha:46125,mes:"abril",proveedor:"Trilladora Milan",producto:"AGRAZ",kg:35,costo:37052.83},
    {codigo:"APRIL 1704",fecha:46132,mes:"abril",proveedor:"Trilladora Milan",producto:"APRIL",kg:229,costo:47541.51},
    {codigo:"Lote 3 070625",fecha:46136,mes:"abril",proveedor:"NA",producto:"REG",kg:5,costo:0},
    {codigo:"Maragogype 2404",fecha:46136,mes:"abril",proveedor:"NA",producto:"VARIETAL",kg:9,costo:0},
    {codigo:"NIU 3003",fecha:46148,mes:"mayo",proveedor:"Trilladora Milan",producto:"NIU",kg:31,costo:37268.22},
    {codigo:"M 493-MB-2702",fecha:46158,mes:"mayo",proveedor:"Trilladora Milan",producto:"MB",kg:412,costo:40618.15},
    {codigo:"M 520-LYCHE-0805",fecha:46174,mes:"junio",proveedor:"Trilladora Milan",producto:"LYCHE",kg:210,costo:54969.48},
    {codigo:"MAYPOP 1405",fecha:46174,mes:"junio",proveedor:"Trilladora Milan",producto:"MAYPOP",kg:18,costo:57759.79},
    {codigo:"BB 1111",fecha:46174,mes:"junio",proveedor:"Trilladora Milan",producto:"BB",kg:86,costo:39283.3},
    {codigo:"BB 1401",fecha:46174,mes:"junio",proveedor:"Trilladora Milan",producto:"BB",kg:190,costo:38960.06},
    {codigo:"NG  (LYCHE) 1304",fecha:46176,mes:"junio",proveedor:"Trilladora Milan",producto:"NG",kg:75,costo:44011.03},
    {codigo:"Caturra Chiroso",fecha:46171,mes:"mayo",proveedor:"Luis Hernesto",producto:"VARIETAL",kg:166,costo:35238.03},
    {codigo:"M 527-PP -2705",fecha:46190,mes:"junio",proveedor:"Trilladora Milan",producto:"PP",kg:70,costo:55264.24},
    {codigo:"Excelso 270426",fecha:46192,mes:"junio",proveedor:"Trilladora Milan",producto:"REG",kg:224,costo:26142.86},
    {codigo:"NIU 0106",fecha:46192,mes:"junio",proveedor:"Trilladora Milan",producto:"NIU",kg:156,costo:50786.73},
    {codigo:"M 529-REGIONAL 2-0306",fecha:46198,mes:"junio",proveedor:"Trilladora Milan",producto:"REG",kg:404,costo:28262.7},
    {codigo:"M 538-REGIONAL-1906",fecha:46198,mes:"junio",proveedor:"Trilladora Milan",producto:"REG",kg:1258,costo:25271},
    {codigo:"TABACO 0403",fecha:46196,mes:"junio",proveedor:"Trilladora Milan",producto:"TABACCO",kg:218,costo:41268.49},
    {codigo:"M 540-SD-2406",fecha:46196,mes:"junio",proveedor:"Trilladora Milan",producto:"SD",kg:200,costo:70973.24},
    {codigo:"M 515-DR-2304",fecha:46199,mes:"junio",proveedor:"Trilladora Milan",producto:"DR",kg:169,costo:78620.58},
    {codigo:"M 531-NR-0806",fecha:46199,mes:"junio",proveedor:"Trilladora Milan",producto:"NR",kg:141,costo:78380.57},
    {codigo:"AGI 2905",fecha:46199,mes:"junio",proveedor:"Trilladora Milan",producto:"AGI",kg:254.5,costo:28937.97},
    {codigo:"M 535-CHOCOLATE-1306",fecha:46205,mes:"julio",proveedor:"Trilladora Milan",producto:"CHOCOLATE",kg:24,costo:50892.87},
    {codigo:"TROPICAL 3006",fecha:46209,mes:"julio",proveedor:"Trilladora Milan",producto:"TROPICAL",kg:866,costo:57550.77},
  ];
  const rawTriFino=[
    {codigo:"CF60-SIDRA 0203-0203",fecha:46083,mes:"marzo",producto:"VARIETAL",kg:1,costo:0},
    {codigo:"CF62-L12 BIO MASTER-0203",fecha:46083,mes:"marzo",producto:"REG",kg:63,costo:0},
    {codigo:"CF63-LOTE 4 LAVADO-0303",fecha:46084,mes:"marzo",producto:"REG",kg:68,costo:0},
    {codigo:"CF67-LOTE 9 LAVADO-0303",fecha:46084,mes:"marzo",producto:"REG",kg:53,costo:0},
    {codigo:"CF68-LOTE 11 -0303",fecha:46084,mes:"marzo",producto:"VARIETAL",kg:38,costo:0},
    {codigo:"CF70-L 4-2-3-7-0303",fecha:46084,mes:"marzo",producto:"REG",kg:2,costo:0},
    {codigo:"CF72-LOTE 12-0303",fecha:46084,mes:"marzo",producto:"REG",kg:4,costo:0},
    {codigo:"CF65-L13 LAVADO-0303",fecha:46087,mes:"marzo",producto:"VARIETAL",kg:1,costo:0},
    {codigo:"CF -RIVIERA NATURAL 2404-2404",fecha:46135,mes:"abril",producto:"NAT",kg:9,costo:51555.56},
    {codigo:"CF-BIOMASTER 2603-2404",fecha:46136,mes:"abril",producto:"REG",kg:48,costo:42500},
    {codigo:"CF 139-L 13 BIOMASTER-0105",fecha:46143,mes:"mayo",producto:"VARIETAL",kg:1,costo:63467.37},
    {codigo:"CF 143-BIOMASTER L1-0105",fecha:46143,mes:"mayo",producto:"REG",kg:3,costo:0},
    {codigo:"CF 144-BIOMASTER L3-4 041225-0105",fecha:46143,mes:"mayo",producto:"REG",kg:38,costo:43488.3},
    {codigo:"CF 145-L 7 LAVADO 301025-0105",fecha:46143,mes:"mayo",producto:"REG",kg:26,costo:47349.8},
    {codigo:"CF 146-RIVERA LAVADO 2802226-0105",fecha:46143,mes:"mayo",producto:"REG",kg:22,costo:79636.36},
    {codigo:"CF 147-LOTE 1-6 111225-0105",fecha:46143,mes:"mayo",producto:"REG",kg:83,costo:0},
    {codigo:"CF-L 20 020426-0105",fecha:46143,mes:"mayo",producto:"VARIETAL",kg:2,costo:42711.86},
    {codigo:"CF 187-L 17-0406",fecha:46177,mes:"junio",producto:"VARIETAL",kg:198,costo:58170.05},
    {codigo:"CF198-CAPRI GESHA-NAT-NAT-150426-3006",fecha:46203,mes:"junio",producto:"VARIETAL",kg:6,costo:56533.37},
    {codigo:"CF200-BAIRES-LVD-LVD-170126-3006",fecha:46203,mes:"junio",producto:"REG",kg:78,costo:0},
    {codigo:"CF201-COOP CAPRI 130925-3006",fecha:46203,mes:"junio",producto:"REG",kg:26,costo:0},
    {codigo:"CF203-LOTE 8 BIOMASTER 131125-3006",fecha:46203,mes:"junio",producto:"REG",kg:27,costo:0},
    {codigo:"CF204-L 13-9-LVD-LVD-220426-3006",fecha:46203,mes:"junio",producto:"REG",kg:16,costo:0},
    {codigo:"CF205-LOTE 13 LAVADO 131125-3006",fecha:46203,mes:"junio",producto:"VARIETAL",kg:15,costo:0},
    {codigo:"CF206-TODOS LOTE 8-3006",fecha:46203,mes:"junio",producto:"VARIETAL",kg:300,costo:48120.95},
    {codigo:"CF 185-GESHA LAVADO-0406",fecha:46203,mes:"junio",producto:"VARIETAL",kg:248,costo:65000},
  ];
  const rawBlendsFino=[
    {fecha:42428,mes:"febrero",nombre:"BORBON SIDRA",costo:40447,kg:19,productoComercial:"BORBON SIDRA"},
    {fecha:46155,mes:"mayo",nombre:"Capitan 1305",costo:25965.67,kg:454,productoComercial:"CAPITAN MARK"},
    {fecha:46155,mes:"mayo",nombre:"Sidra Bio 1305",costo:49820.66,kg:24,productoComercial:"SIDRA BIO"},
    {fecha:46162,mes:"mayo",nombre:"Wush 2005",costo:45072.32,kg:14,productoComercial:"WUSH WUSH"},
    {fecha:46170,mes:"mayo",nombre:"Caturra nitro 2805",costo:34589.33,kg:260,productoComercial:"CATURRA NITRO"},
    {fecha:46177,mes:"junio",nombre:"Sakura Competition 0406",costo:60016.42,kg:15,productoComercial:"SAKURA"},
    {fecha:46177,mes:"junio",nombre:"MAYPOP COMPETITION",costo:58180.75,kg:26,productoComercial:"MAYPOP"},
    {fecha:46184,mes:"junio",nombre:"Maypop 1106",costo:58154.7,kg:361,productoComercial:"MAYPOP"},
    {fecha:46192,mes:"junio",nombre:"Caturra nitro 1906",costo:31267.12,kg:647,productoComercial:"CATURRA NITRO"},
    {fecha:46192,mes:"junio",nombre:"Gesha Bio 1906",costo:59864.25,kg:255,productoComercial:"GESHA BIO"},
    {fecha:46199,mes:"junio",nombre:"Pink borbon 2606",costo:38566.72,kg:110,productoComercial:"PINK BOURBON"},
    {fecha:46199,mes:"junio",nombre:"Sakura 2606",costo:47523.36,kg:111,productoComercial:"SAKURA"},
    {fecha:46203,mes:"junio",nombre:"NIU 3006",costo:52486.24,kg:290,productoComercial:"NIU"},
  ];
  const wipeAll=()=>{
    const ok1=window.confirm("⚠️ ADVERTENCIA CRITICA\n\nEsta accion borrara ABSOLUTAMENTE TODOS los datos:\nlotes, blends, costos, usuarios, maquilas, etc.\n\nEs IRREVERSIBLE. ¿Continuar?");
    if(!ok1)return;
    const txt=window.prompt("Para confirmar escribe exactamente:\n\nBORRAR TODO");
    if(txt!=="BORRAR TODO"){alert("Texto incorrecto. Operacion cancelada.");return;}
    setLotes([]);setBlends([]);setCostos([]);setLotesFino([]);setBlendsFino([]);setMaquilas([]);setBlendsTostado([]);setUsuarios([]);
    setWipeStatus("done");
  };
  const ejecutar=()=>{
    if(!window.confirm("¿Confirmar carga inicial?\n\n• "+rawMilan.length+" lotes → Bodega Milan\n• "+rawTri.length+" lotes → Bodega Trilladora\n• "+rawBlends.length+" blends → Inventario Blends\n• "+rawFino.length+" lotes → Bodega Café Fino\n• "+rawTriFino.length+" lotes → Trilladora Café Fino\n• "+rawBlendsFino.length+" blends → Blend Café Fino\n\nEsta operación no se puede deshacer automaticamente."))return;
    const codsLotes=new Set(lotes.map(l=>l.codigo+"|"+l.kg_producto+"|"+l.fecha_proceso));
    const nuevosM=rawMilan.filter(r=>!codsLotes.has(r.codigo+"|"+r.kg+"|"+r.fecha)).map(r=>({
      id:genId(),codigo:r.codigo,fecha_proceso:r.fecha,fecha_recibo:r.fecha,
      semana:semanaISO(r.fecha),mes:r.mes,tipo:"carga_directa",producto:r.producto,
      estado:"Bodega",origen_lote:"carga_directa",cereza:[],
      kg_producto:r.kg,costo_directo_kg:r.costo,bultos:0,humedad:"",conversion:1,notas:"",
      insumos:INS0,equipo_ferm:"",equipo_secado:"",fecha_lavado:null,fecha_fin_secado:r.fecha,
      salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:null,
    }));
    const nuevosT=rawTri.filter(r=>!codsLotes.has(r.codigo+"|"+r.kg+"|"+r.fecha)).map(r=>{
      const c=+r.costo||0;const sid=genId();
      return{
        id:genId(),codigo:r.codigo,fecha_proceso:r.fecha,fecha_recibo:r.fecha,
        semana:semanaISO(r.fecha),mes:r.mes,tipo:"Manual",producto:r.producto,
        estado:"Cerrado",origen_lote:"trilla_directa",
        cereza:[{finca:"Externo",kg:r.kg,valor_kg:c,flote:0,kg_proceso:r.kg}],
        kg_producto:r.kg,bultos:0,humedad:"",conversion:1,notas:"",
        insumos:INS0,equipo_ferm:"",equipo_secado:"",fecha_lavado:null,fecha_fin_secado:null,
        salidas_bodega:[{id:sid,fecha:r.fecha,factura:"MANUAL",remision:"",cliente:"Trilla",destino_key:"trilla",peso_salida:r.kg,valor_kg:c,valor_total:r.kg*c}],
        trilla:{kg_excelso:r.kg,kg_merma:0,kg_pasillas:0,pasilla_elec:0,catadora_dens:0,inferiores:0,cisco:0,
          humedad_salida:0,norma:"",fecha_trilla:r.fecha,codigo_corte:"CARGA-DIRECTA",con_proceso:"Con Proceso",
          nombre_trillado:r.codigo,obs:"Carga directa inicial",lotes_combinados:[],
          factor_pretrilla_ponderado:0,factor_industrial:0,costo_kg_excelso:c,valor_total:r.kg*c},
        salidas_trilladora:[],pretrilla:null,
      };
    });
    const nombresBlends=new Set(blends.map(b=>b.nombre));
    const nuevosB=rawBlends.filter(r=>!nombresBlends.has(r.nombre)).map(r=>({
      id:genId(),nombre:r.nombre,fecha:r.fecha,
      codigo:r.nombre.trim().replace(/\s+/g,"")+"-"+dateToCode(r.fecha),
      mes:r.mes,producto_comercial:r.productoComercial,
      items:[],kg_total:r.kg,valor_total:r.kg*r.costo,costo_kg:r.costo,salidas:[],
    }));
    const msgs=[];
    if(nuevosM.length||nuevosT.length)setLotes(p=>[...p,...nuevosM,...nuevosT]);
    if(nuevosB.length)setBlends(p=>[...p,...nuevosB]);
    msgs.push("✓ Bodega Milan: "+nuevosM.length+" lotes cargados");
    msgs.push("✓ Bodega Trilladora: "+nuevosT.length+" lotes cargados");
    msgs.push("✓ Blends: "+nuevosB.length+" blends cargados");
    setLog(msgs);setStatus("done");
  };
  const ejecutarCF=()=>{
    if(!window.confirm("¿Confirmar carga Café Fino?\n\n• "+rawFino.length+" lotes → Bodega Café Fino\n• "+rawTriFino.length+" lotes → Trilladora Café Fino\n• "+rawBlendsFino.length+" blends → Blend Café Fino\n\nNO toca datos de Bodega Milan ni Trilladora."))return;
    const codsFino=new Set((lotesFino||[]).map(l=>l.codigo+"|"+l.kg_producto+"|"+l.fecha));
    const nuevosFino=rawFino.filter(r=>!codsFino.has(r.codigo+"|"+r.kg+"|"+excF(r.fecha))).map(r=>{
      const f=excF(r.fecha);
      return{id:genId(),codigo:r.codigo,fecha:f,mes:r.mes,semana:semanaISO(f),
        producto:r.producto,proveedor:r.proveedor,kg_producto:r.kg,costo_compra_kg:r.costo||0,
        notas:"",salidas_bodega:[],trilla:null,salidas_trilladora:[]};
    });
    const nuevosTriFino=rawTriFino.filter(r=>!codsFino.has(r.codigo+"|"+r.kg+"|"+excF(r.fecha))).map(r=>{
      const f=excF(r.fecha);const c=r.costo||0;
      return{id:genId(),codigo:r.codigo,fecha:f,mes:r.mes,semana:semanaISO(f),
        producto:r.producto,proveedor:"Trilladora Milan",kg_producto:r.kg,costo_compra_kg:c,
        notas:"",salidas_bodega:[],
        trilla:{kg_excelso:r.kg,kg_merma:0,kg_pasillas:0,pasilla_elec:0,catadora_dens:0,inferiores:0,cisco:0,
          entrada_usada:r.kg,humedad_salida:0,norma:"",fecha_trilla:f,codigo_corte:"CARGA-DIRECTA",
          con_proceso:"Con Proceso",nombre_trillado:r.codigo,obs:"Carga directa inicial",lotes_combinados:[],
          factor_industrial:null,factor_pretrilla_ponderado:null,costo_kg_excelso:c,valor_total:r.kg*c},
        salidas_trilladora:[],pretrilla:null};
    });
    const nombresBF=new Set((blendsFino||[]).map(b=>b.nombre));
    const nuevosBF=rawBlendsFino.filter(r=>!nombresBF.has(r.nombre)).map(r=>{
      const f=excF(r.fecha);
      return{id:genId(),nombre:r.nombre,fecha:f,
        codigo:r.nombre.trim().replace(/\s+/g,"")+"-"+dateToCode(f),
        mes:r.mes,producto_comercial:r.productoComercial,
        items:[],kg_total:r.kg,valor_total:r.kg*r.costo,costo_kg:r.costo,salidas:[]};
    });
    const msgs=[];
    if(nuevosFino.length||nuevosTriFino.length)setLotesFino(p=>[...p,...nuevosFino,...nuevosTriFino]);
    if(nuevosBF.length)setBlendsFino(p=>[...p,...nuevosBF]);
    msgs.push("✓ Bodega Café Fino: "+nuevosFino.length+" lotes cargados");
    msgs.push("✓ Trilladora Café Fino: "+nuevosTriFino.length+" lotes cargados");
    msgs.push("✓ Blend Café Fino: "+nuevosBF.length+" blends cargados");
    setLogCF(msgs);setStatusCF("done");
  };
  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>ADMINISTRACION</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Carga Inicial de Datos</div></div>
    <div style={{...S.card,maxWidth:600,borderTop:"3px solid "+C.red,marginBottom:20}}>
      <div style={{color:C.red,fontWeight:700,fontSize:14,marginBottom:8}}>Zona de Peligro — Borrado Total</div>
      <div style={{color:C.textDim,fontSize:12,marginBottom:16}}>Elimina absolutamente todos los documentos de Firestore: lotes, blends, costos, usuarios, maquilas. Irreversible.</div>
      {wipeStatus==="idle"&&(<button style={{...S.btn,background:C.red}} onClick={wipeAll}>Borrar TODOS los datos</button>)}
      {wipeStatus==="done"&&(<div style={{color:C.red,fontWeight:700,fontSize:13}}>✓ Borrado enviado a Firestore. En unos segundos la app quedara en cero. Recarga la pagina para confirmar.</div>)}
    </div>
    <div style={{...S.card,maxWidth:600,marginBottom:16}}>
      <div style={{marginBottom:20}}>
        <div style={{color:C.navy,fontWeight:700,fontSize:15,marginBottom:4}}>Bodega Milan · Trilladora · Blends</div>
        <div style={{color:C.textDim,fontSize:11,marginBottom:12}}>Solo carga estos 3 módulos — no toca Café Fino.</div>
        {[["Bodega Milan",rawMilan.length,"lotes de pergamino seco",C.accent],["Bodega Trilladora",rawTri.length,"lotes de excelso",C.green],["Inventario Blends",rawBlends.length,"blends",C.purple]].map(([sec,n,desc,col])=>(<div key={sec} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid "+C.border}}><div style={{width:36,height:36,borderRadius:8,background:col+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,color:col,flexShrink:0}}>{n}</div><div><div style={{fontWeight:600,fontSize:13,color:C.navy}}>{sec}</div><div style={{fontSize:11,color:C.textDim}}>{desc}</div></div></div>))}
      </div>
      {status==="idle"&&(<button style={{...S.btn,background:C.accent}} onClick={ejecutar}>Cargar Bodega Milan / Trilladora / Blends</button>)}
      {status==="done"&&(<>
        <div style={{marginBottom:16}}>{log.map((m,i)=>(<div key={i} style={{padding:"8px 12px",background:C.accentBg,borderRadius:6,marginBottom:6,fontSize:13,color:C.navy,fontWeight:500}}>{m}</div>))}</div>
        <div style={{color:C.green,fontWeight:700,fontSize:13}}>✓ Completado.</div>
      </>)}
    </div>
    <div style={{...S.card,maxWidth:600}}>
      <div style={{marginBottom:20}}>
        <div style={{color:C.navy,fontWeight:700,fontSize:15,marginBottom:4}}>Café Fino — Carga independiente</div>
        <div style={{color:C.textDim,fontSize:11,marginBottom:12}}>Solo carga los 3 módulos de Café Fino — no toca Bodega Milan ni Trilladora.</div>
        {[["Bodega Café Fino",rawFino.length,"lotes de café fino",C.gold],["Trilladora Café Fino",rawTriFino.length,"lotes de excelso fino",C.orange],["Blend Café Fino",rawBlendsFino.length,"blends café fino",C.green]].map(([sec,n,desc,col])=>(<div key={sec} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid "+C.border}}><div style={{width:36,height:36,borderRadius:8,background:col+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,color:col,flexShrink:0}}>{n}</div><div><div style={{fontWeight:600,fontSize:13,color:C.navy}}>{sec}</div><div style={{fontSize:11,color:C.textDim}}>{desc}</div></div></div>))}
      </div>
      {statusCF==="idle"&&(<button style={{...S.btn,background:C.gold}} onClick={ejecutarCF}>Cargar Café Fino</button>)}
      {statusCF==="done"&&(<>
        <div style={{marginBottom:16}}>{logCF.map((m,i)=>(<div key={i} style={{padding:"8px 12px",background:C.accentBg,borderRadius:6,marginBottom:6,fontSize:13,color:C.navy,fontWeight:500}}>{m}</div>))}</div>
        <div style={{color:C.green,fontWeight:700,fontSize:13}}>✓ Café Fino cargado en Firestore.</div>
      </>)}
    </div>
  </div>);
}

const NAV=[{k:"dashboard",l:"Dashboard",icon:"&#9647;"},{k:"sep1",sep:true},{k:"procesamiento",l:"Procesamiento",icon:"&#8857;"},{k:"bodega",l:"Bodega Milan",icon:"&#127968;"},{k:"trilla",l:"Trilla",icon:"&#9881;"},{k:"bodega_tri",l:"Bodega Trilladora",icon:"&#9733;"},{k:"blend",l:"Blend",icon:"&#9737;"},{k:"sep2",sep:true},{k:"bodega_fino",l:"Bodega Cafe Fino",icon:"&#127968;"},{k:"trilladora_fino",l:"Trilladora Cafe Fino",icon:"&#9881;"},{k:"blend_fino",l:"Blend Cafe Fino",icon:"&#9737;"},{k:"sep4",sep:true},{k:"maquila",l:"Maquila",icon:"&#9874;"},{k:"uba_tostado",l:"UBA Tostado",icon:"&#9745;"},{k:"sep2b",sep:true},{k:"trazabilidad",l:"Trazabilidad",icon:"&#128202;"},{k:"costos",l:"Reg. Costos",icon:"$"},{k:"sep3",sep:true},{k:"usuarios",l:"Usuarios",icon:"&#8853;"},{k:"sep5",sep:true},{k:"carga_inicial",l:"Carga Inicial",icon:"&#8659;"}];

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
  const VIEWS={dashboard:()=><Dashboard lotes={lotes} costos={costos} lotesFino={lotesFino} maquilas={maquilas} blendsTostado={blendsTostado}/>,procesamiento:()=><Procesamiento lotes={lotes} setLotes={setLotes} costos={costos} lotesFino={lotesFino} setLotesFino={setLotesFino}/>,bodega:()=><Bodega lotes={lotes} setLotes={setLotes} costos={costos} setLotesFino={setLotesFino} subprodPerg={subprodPerg} setSubprodPerg={setSubprodPerg}/>,trilla:()=><Trilla lotes={lotes} setLotes={setLotes} costos={costos} subprodVerde={subprodVerde} setSubprodVerde={setSubprodVerde}/>,bodega_tri:()=><BodegaTrilladora lotes={lotes} setLotes={setLotes} costos={costos} setLotesFino={setLotesFino}/>,blend:()=><Blend lotes={lotes} setLotes={setLotes} blends={blends} setBlends={setBlends} costos={costos} setLotesFino={setLotesFino}/>,bodega_fino:()=><BodegaFino lotesFino={lotesFino} setLotesFino={setLotesFino} setBlendsFino={setBlendsFino} setBlendsTostado={setBlendsTostado} lotes={lotes}/>,trilladora_fino:()=><TrilladoraFino lotesFino={lotesFino} setLotesFino={setLotesFino}/>,blend_fino:()=><BlendFino lotesFino={lotesFino} setLotesFino={setLotesFino} blendsFino={blendsFino} setBlendsFino={setBlendsFino}/>,maquila:()=><Maquila maquilas={maquilas} setMaquilas={setMaquilas} setLotesFino={setLotesFino}/>,uba_tostado:()=><UbaTostado blendsTostado={blendsTostado} setBlendsTostado={setBlendsTostado}/>,trazabilidad:()=><Trazabilidad lotes={lotes} costos={costos} blends={blends}/>,costos:()=><Costos costos={costos} setCostos={setCostos}/>,usuarios:()=><Usuarios usuarios={usuarios} setUsuarios={setUsuarios}/>,carga_inicial:()=><BulkLoader lotes={lotes} setLotes={setLotes} blends={blends} setBlends={setBlends} setCostos={setCostos} lotesFino={lotesFino} setLotesFino={setLotesFino} blendsFino={blendsFino} setBlendsFino={setBlendsFino} setMaquilas={setMaquilas} setBlendsTostado={setBlendsTostado} setUsuarios={setUsuarios}/>};
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
