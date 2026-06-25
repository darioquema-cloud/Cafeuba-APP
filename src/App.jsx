import{useState,useMemo}from"react";
const C={bg:"#F4F6F9",panel:"#FFFFFF",panel2:"#F8FAFC",border:"#E2E8F0",border2:"#CBD5E1",navy:"#1E3A5F",navyDark:"#152944",navyLight:"#2D5F8A",accent:"#2563EB",accentBg:"#EFF6FF",gold:"#B45309",goldBg:"#FFFBEB",green:"#15803D",greenBg:"#F0FDF4",red:"#DC2626",redBg:"#FEF2F2",orange:"#C2410C",orangeBg:"#FFF7ED",teal:"#0E7490",tealBg:"#ECFEFF",purple:"#7C3AED",purpleBg:"#F5F3FF",text:"#0F172A",textDim:"#64748B",textFaint:"#94A3B8",white:"#FFFFFF"};
const fmtCOP=n=>n==null||n===""?"—":"$\u00a0"+Number(n).toLocaleString("es-CO",{maximumFractionDigits:0});
const fmt=(n,d=0)=>Number(n).toLocaleString("es-CO",{minimumFractionDigits:d,maximumFractionDigits:d});
const today=()=>new Date().toISOString().slice(0,10);
const genId=()=>Math.random().toString(36).slice(2,8).toUpperCase();
const FINCAS=["Milan","Buenos Aires","Capri","Riviera","Bascula","Palermo","Marsella","Sta Maria Huila","Externo Huila"];
const VARIEDADES=["Castillo","Caturra","Colombia","Cenicafe","San Isidro","Gesha","L13","SIDRA","Tabi","Bourbon"];
const TIPOS=["Culturing","Lavado","Natural","Honey","Biomaster","Double Roast","Marco Rojo","Purple Peak","Cherry Candy","None Required","SD","LVD"];
const ABREV={"Culturing":"CLTG","Lavado":"LVD","Natural":"NAT","Honey":"HNY","Biomaster":"BIOMASTER","Double Roast":"DR","Marco Rojo":"MR","Purple Peak":"PP","Cherry Candy":"CC","None Required":"NR","SD":"SD","LVD":"LVD"};
const NORMAS=["Norma FNC","European Prep","Specialty 80+","Specialty 85+","Micro Lot","Privado"];
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const ECOL={"Recepcion":C.teal,"Proceso":C.orange,"Secado":C.gold,"Finalizado":C.green,"Cerrado":C.purple};
const EBG={"Recepcion":C.tealBg,"Proceso":C.orangeBg,"Secado":C.goldBg,"Finalizado":C.greenBg,"Cerrado":C.purpleBg};
const USERS=[
  {id:1,nombre:"Carlos Andrés Muñoz",email:"c.munoz@cafeuba.com.co",rol:"Gerente",activo:true,pass:"admin123"},
  {id:2,nombre:"Liliana Gómez",email:"l.gomez@cafeuba.com.co",rol:"Operario Beneficio",activo:true,pass:"lili123"},
  {id:3,nombre:"Andrés Pérez",email:"a.perez@cafeuba.com.co",rol:"Trilladore",activo:true,pass:"andres123"},
  {id:4,nombre:"María Torres",email:"m.torres@cafeuba.com.co",rol:"Analista Calidad",activo:true,pass:"maria123"},
  {id:5,nombre:"Juan López",email:"js.lopez@cafeuba.com.co",rol:"Supervisor",activo:true,pass:"juan123"},
];
const seedLotes=()=>[
  {id:genId(),fecha_recibo:"2026-05-06",fecha_proceso:"2026-05-07",semana:19,mes:"mayo",tipo:"Culturing",producto:"SD",codigo:"CLTG-SD-060526",estado:"Secado",fecha_lavado:"2026-05-11",fecha_fin_secado:"2026-05-21",humedad:"12.3",kg_producto:1384,bultos:35,insumos:{jugo:138.55,panela:27.71,harina:33.25,levadura:0.554},conversion:5.61,canecas:27.71,notas:"",cereza:[{finca:"Milan",variedad:"Castillo",kg:2617,flote:0,kg_proceso:2617,valor_kg:6000},{finca:"Buenos Aires",variedad:"Castillo",kg:2272,flote:0,kg_proceso:2272,valor_kg:6000},{finca:"Bascula",variedad:"Castillo",kg:1304,flote:0,kg_proceso:1304,valor_kg:3916},{finca:"Capri",variedad:"Castillo",kg:591,flote:0,kg_proceso:591,valor_kg:6000},{finca:"Riviera",variedad:"Castillo",kg:975,flote:0,kg_proceso:975,valor_kg:8000}],trilla:null},
  {id:genId(),fecha_recibo:"2026-05-13",fecha_proceso:"2026-05-14",semana:20,mes:"mayo",tipo:"Culturing",producto:"PP",codigo:"CLTG-PP-130526",estado:"Secado",fecha_lavado:"2026-05-17",fecha_fin_secado:"2026-05-22",humedad:"11.5",kg_producto:1276,bultos:32,insumos:{jugo:123.1,panela:24.62,harina:29.55,levadura:0.492},conversion:5.40,canecas:24.62,notas:"",cereza:[{finca:"Milan",variedad:"Castillo",kg:1577,flote:0,kg_proceso:1577,valor_kg:6000},{finca:"Buenos Aires",variedad:"Castillo",kg:2152,flote:0,kg_proceso:2152,valor_kg:6000},{finca:"Bascula",variedad:"Castillo",kg:1824,flote:0,kg_proceso:1824,valor_kg:3866},{finca:"Capri",variedad:"Castillo",kg:670,flote:0,kg_proceso:670,valor_kg:6000},{finca:"Riviera",variedad:"Castillo",kg:671,flote:0,kg_proceso:671,valor_kg:8000}],trilla:null},
  {id:genId(),fecha_recibo:"2026-04-01",fecha_proceso:"2026-04-02",semana:14,mes:"abril",tipo:"Culturing",producto:"DR",codigo:"CLTG-DR-010426",estado:"Cerrado",fecha_lavado:"2026-04-08",fecha_fin_secado:"2026-04-15",humedad:"11.3",kg_producto:910,bultos:23,insumos:{jugo:80,panela:16,harina:19.2,levadura:0.32},conversion:5.26,canecas:16,notas:"Facturado",cereza:[{finca:"Buenos Aires",variedad:"Castillo",kg:2494,flote:407.5,kg_proceso:2494,valor_kg:6000},{finca:"Capri",variedad:"Castillo",kg:217,flote:0,kg_proceso:217,valor_kg:6000},{finca:"Riviera",variedad:"Castillo",kg:1066,flote:0,kg_proceso:1066,valor_kg:8000},{finca:"Bascula",variedad:"Castillo",kg:1007,flote:0,kg_proceso:1007,valor_kg:5616}],trilla:{kg_excelso:820,kg_merma:55,kg_pasillas:35,humedad_salida:11.0,norma:"European Prep",obs:"Exportacion EU"}},
  {id:genId(),fecha_recibo:"2026-05-27",fecha_proceso:"2026-05-27",semana:22,mes:"mayo",tipo:"Natural",producto:"NAT",codigo:"L17-NAT-220526",estado:"Finalizado",fecha_lavado:null,fecha_fin_secado:null,humedad:"10.8",kg_producto:671,bultos:17,insumos:{jugo:0,panela:0,harina:0,levadura:0},conversion:1,canecas:0,notas:"",cereza:[{finca:"Riviera",variedad:"L13",kg:671,flote:0,kg_proceso:671,valor_kg:8000}],trilla:null},
];
const S={
  app:{fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.text,fontSize:14},
  topbar:{height:56,background:C.navy,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"fixed",top:0,left:0,right:0,zIndex:200,boxShadow:"0 2px 12px rgba(0,0,0,0.2)"},
  sidebar:{width:224,background:C.panel,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",position:"fixed",top:56,left:0,height:"calc(100vh - 56px)",zIndex:100,boxShadow:"2px 0 8px rgba(0,0,0,0.05)"},
  main:{marginLeft:224,marginTop:56,padding:"28px 32px",minHeight:"calc(100vh - 56px)"},
  card:{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 24px",marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"},
  card2:{background:C.panel2,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px"},
  input:{background:C.white,border:`1px solid ${C.border2}`,borderRadius:6,color:C.text,fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:13,padding:"9px 12px",width:"100%",outline:"none",boxSizing:"border-box"},
  select:{background:C.white,border:`1px solid ${C.border2}`,borderRadius:6,color:C.text,fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:13,padding:"9px 12px",width:"100%",outline:"none"},
  btnPrimary:{background:C.navy,border:"none",borderRadius:6,color:C.white,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:600,padding:"9px 20px"},
  btnGhost:{background:"transparent",border:`1px solid ${C.border2}`,borderRadius:6,color:C.textDim,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,padding:"7px 14px"},
  th:{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",padding:"10px 14px",textAlign:"left",borderBottom:`2px solid ${C.border}`,background:C.panel2,whiteSpace:"nowrap"},
  td:{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,fontSize:13,verticalAlign:"middle"},
  label:{color:C.textDim,fontSize:11,fontWeight:500,letterSpacing:.4,textTransform:"uppercase",marginBottom:5,display:"block"},
};
const tag=(col,bg)=>({background:bg||col+"15",border:`1px solid ${col}30`,borderRadius:4,color:col,fontSize:11,fontWeight:600,padding:"3px 8px",display:"inline-block",whiteSpace:"nowrap"});
const Field=({label,children,half})=>(<div style={{marginBottom:13,width:half?"calc(50% - 6px)":"100%",display:"inline-block",verticalAlign:"top",marginRight:half?"12px":"0"}}><label style={S.label}>{label}</label>{children}</div>);
const Badge=({label,col,bg})=>(<span style={tag(col||C.accent,bg)}>{label}</span>);

function KPI({label,value,sub,col,delta,icon}){
  const c=col||C.accent;
  return(
    <div style={{...S.card,marginBottom:0,borderTop:`3px solid ${c}`,position:"relative"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <span style={{color:C.textDim,fontSize:11,fontWeight:500,letterSpacing:.5,textTransform:"uppercase"}}>{label}</span>
        {icon&&<span style={{fontSize:20,opacity:.6}}>{icon}</span>}
      </div>
      <div style={{color:C.navy,fontSize:23,fontWeight:700,lineHeight:1,marginBottom:4}}>{value}</div>
      {sub&&<div style={{color:C.textFaint,fontSize:11,marginTop:3}}>{sub}</div>}
      {delta!=null&&(
        <div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:8,background:delta>=0?C.greenBg:C.redBg,borderRadius:4,padding:"2px 8px"}}>
          <span style={{color:delta>=0?C.green:C.red,fontSize:11,fontWeight:600}}>{delta>=0?"↑":"↓"} {Math.abs(delta).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

function Bar({label,value,max,col}){
  const c=col||C.accent;
  const p=Math.min(100,(value/max)*100)||0;
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{color:C.text,fontSize:12}}>{label}</span>
        <span style={{color:c,fontSize:12,fontWeight:600}}>{fmt(value)} kg</span>
      </div>
      <div style={{background:C.bg,borderRadius:4,height:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        <div style={{background:c,width:p+"%",height:"100%",borderRadius:4,transition:"width .5s"}}/>
      </div>
    </div>
  );
}

function Modal({title,onClose,children,wide}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(3px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:28,width:wide?860:560,maxWidth:"95vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${C.border}`}}>
          <span style={{color:C.navy,fontWeight:700,fontSize:15}}>{title}</span>
          <button style={{...S.btnGhost,padding:"4px 10px",fontSize:15}} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Dashboard({lotes}){
  const totalKg=lotes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const totalProd=lotes.reduce((s,l)=>s+(l.kg_producto||0),0);
  const totalCosto=lotes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  const fin=lotes.filter(l=>["Finalizado","Cerrado"].includes(l.estado));
  const convProm=fin.length?fin.reduce((s,l)=>s+(l.conversion||0),0)/fin.length:0;
  const totalExcelso=lotes.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const enProceso=lotes.filter(l=>!["Finalizado","Cerrado"].includes(l.estado)).length;
  const ingreso=totalExcelso*1250000;
  const margen=ingreso-totalCosto;
  const porFinca={};
  lotes.forEach(l=>l.cereza.forEach(c=>{porFinca[c.finca]=(porFinca[c.finca]||0)+c.kg;}));
  const maxF=Math.max(...Object.values(porFinca),1);
  const porEstado={};
  lotes.forEach(l=>{porEstado[l.estado]=(porEstado[l.estado]||0)+1;});
  const trend=[18380,25000,45687,80314,91189,92000,95000,88000,103000,110000,118000,125000];
  const maxT=Math.max(...trend);
  const mLabels=["E","F","M","A","M","J","J","A","S","O","N","D"];
  return(
    <div>
      <div style={{marginBottom:24}}>
        <div style={{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PLAN MILÁN — CENTRAL DE BENEFICIO</div>
        <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Dashboard Ejecutivo</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:3}}>{new Date().toLocaleDateString("es-CO",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:14,marginBottom:22}}>
        <KPI label="Cereza Recibida" value={fmt(totalKg)+" kg"} sub={lotes.length+" lotes"} col={C.teal} delta={8.3} icon="🌿"/>
        <KPI label="Prod. Terminado" value={fmt(totalProd)+" kg"} col={C.accent} delta={5.1} icon="📦"/>
        <KPI label="Excelso Trillado" value={fmt(totalExcelso)+" kg"} col={C.green} delta={12.4} icon="✅"/>
        <KPI label="Conversión Prom." value={convProm.toFixed(2)+":1"} sub="cereza → producto" col={C.gold} icon="⚙️"/>
        <KPI label="Costo MP Total" value={fmtCOP(totalCosto)} col={C.orange} icon="💰"/>
        <KPI label="Lotes Activos" value={enProceso} col={C.purple} icon="🔄"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,marginBottom:16}}>
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontWeight:600,fontSize:14,color:C.navy}}>Recepción por Mes — 2025/2026</div>
            <div style={{color:C.accent,fontSize:13,fontWeight:700}}>{fmt(trend[11])} kg ↑</div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:5,height:90,marginBottom:6}}>
            {trend.map((v,i)=>{
              const h=Math.max(4,(v/maxT)*80);
              return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <div style={{width:"100%",height:h,background:i===trend.length-1?C.navy:C.accentBg,borderRadius:"3px 3px 0 0",border:`1px solid ${i===trend.length-1?C.navy:C.border}`,transition:"height .4s"}}/>
              </div>);
            })}
          </div>
          <div style={{display:"flex",gap:5}}>{mLabels.map((l,i)=>(<div key={i} style={{flex:1,textAlign:"center",fontSize:9,color:i===trend.length-1?C.navy:C.textFaint,fontWeight:i===trend.length-1?700:400}}>{l}</div>))}</div>
        </div>
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Flujo de Proceso</div>
          {Object.entries(ECOL).map(([est,col])=>{
            const n=porEstado[est]||0;
            const p=lotes.length?(n/lotes.length)*100:0;
            return(<div key={est} style={{display:"flex",alignItems:"center",gap:10,marginBottom:11}}>
              <Badge label={est} col={col} bg={EBG[est]}/>
              <div style={{flex:1,background:C.bg,borderRadius:4,height:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <div style={{background:col,width:p+"%",height:"100%",borderRadius:4}}/>
              </div>
              <span style={{color:col,fontSize:13,fontWeight:700,minWidth:18,textAlign:"right"}}>{n}</span>
            </div>);
          })}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Cereza por Finca</div>
          {Object.entries(porFinca).sort((a,b)=>b[1]-a[1]).map(([f,kg],i)=>(<Bar key={f} label={f} value={kg} max={maxF} col={[C.navy,C.accent,C.teal,C.green,C.purple,C.gold,C.orange][i%7]}/>))}
        </div>
        <div>
          <div style={{...S.card,marginBottom:14}}>
            <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Resultado Financiero</div>
            {[{l:"Ingresos Estimados",v:fmtCOP(ingreso),c:C.green},{l:"Costo Materia Prima",v:fmtCOP(totalCosto),c:C.red},{l:"Margen Bruto Est.",v:fmtCOP(margen),c:margen>0?C.accent:C.red},{l:"ROI Estimado",v:totalCosto?(((ingreso-totalCosto)/totalCosto)*100).toFixed(1)+"%":"—",c:C.gold}].map(r=>(<div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:C.textDim,fontSize:12}}>{r.l}</span><span style={{color:r.c,fontWeight:700,fontSize:14}}>{r.v}</span></div>))}
          </div>
          <div style={S.card}>
            <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:12}}>Lotes Recientes</div>
            {lotes.slice(0,4).map(l=>(<div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><div><div style={{color:C.navy,fontWeight:600,fontSize:12,fontFamily:"monospace"}}>{l.codigo}</div><div style={{color:C.textDim,fontSize:11}}>{l.fecha_recibo}</div></div><Badge label={l.estado} col={ECOL[l.estado]} bg={EBG[l.estado]}/></div>))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Recepcion({lotes,setLotes}){
  const [modal,setModal]=useState(false);
  const [rows,setRows]=useState([{finca:FINCAS[0],variedad:VARIEDADES[0],kg:"",flote:"",kg_proceso:"",valor_kg:""}]);
  const [form,setForm]=useState({fecha_recibo:today(),fecha_proceso:today(),semana:"",mes:MESES[new Date().getMonth()],tipo:TIPOS[0],producto:"SD",canecas:"",fecha_lavado:"",notas:""});
  const addRow=()=>setRows(p=>[...p,{finca:FINCAS[0],variedad:VARIEDADES[0],kg:"",flote:"",kg_proceso:"",valor_kg:""}]);
  const rmRow=i=>setRows(p=>p.filter((_,j)=>j!==i));
  const setRow=(i,k,v)=>setRows(p=>p.map((r,j)=>j===i?{...r,[k]:v}:r));
  const genCod=()=>{const a=ABREV[form.tipo]||"OTR";const d=form.fecha_proceso.replace(/-/g,"").slice(2);return`${a}-${form.producto}-${d}`;};
  const registrar=()=>{
    const v=rows.filter(r=>r.kg&&r.valor_kg);
    if(!v.length)return;
    setLotes(p=>[{id:genId(),fecha_recibo:form.fecha_recibo,fecha_proceso:form.fecha_proceso,semana:+form.semana,mes:form.mes,tipo:form.tipo,producto:form.producto,codigo:genCod(),estado:"Recepcion",fecha_lavado:form.fecha_lavado||null,fecha_fin_secado:null,humedad:"",kg_producto:0,bultos:0,insumos:{jugo:0,panela:0,harina:0,levadura:0},conversion:0,canecas:+(form.canecas||0),notas:form.notas,cereza:v.map(r=>({finca:r.finca,variedad:r.variedad,kg:+r.kg,flote:+(r.flote||0),kg_proceso:+(r.kg_proceso||r.kg),valor_kg:+r.valor_kg})),trilla:null},...p]);
    setModal(false);
    setRows([{finca:FINCAS[0],variedad:VARIEDADES[0],kg:"",flote:"",kg_proceso:"",valor_kg:""}]);
  };
  const totalKg=lotes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const totalCOP=lotes.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACIÓN 01</div>
          <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Recepción de Cereza</div>
          <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Registro multi-finca — mezcla de orígenes en un mismo lote</div>
        </div>
        <button style={S.btnPrimary} onClick={()=>setModal(true)}>+ Nuevo Lote</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
        <KPI label="Total Lotes" value={lotes.length} col={C.teal}/>
        <KPI label="kg Cereza" value={fmt(totalKg)+" kg"} col={C.accent}/>
        <KPI label="Valor Total" value={fmtCOP(totalCOP)} col={C.gold}/>
        <KPI label="Fincas" value={[...new Set(lotes.flatMap(l=>l.cereza.map(c=>c.finca)))].length} col={C.green}/>
      </div>
      <div style={S.card}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr>{["Código","Fecha Recibo","Fincas","kg Cereza","Valor COP","Proceso","Producto","Estado"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
            <tbody>{lotes.map(l=>{
              const kg=l.cereza.reduce((a,c)=>a+c.kg,0);
              const cop=l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0);
              const fi=[...new Set(l.cereza.map(c=>c.finca))];
              return(<tr key={l.id}>
                <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</td>
                <td style={{...S.td,color:C.textDim}}>{l.fecha_recibo}</td>
                <td style={S.td}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{fi.map(f=>(<Badge key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td>
                <td style={{...S.td,fontWeight:600,color:C.navy}}>{fmt(kg)}</td>
                <td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(cop)}</td>
                <td style={S.td}>{l.tipo}</td>
                <td style={{...S.td,fontWeight:600}}>{l.producto}</td>
                <td style={S.td}><Badge label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </div>
      {modal&&(
        <Modal title="Nuevo Lote — Recepción de Cereza" onClose={()=>setModal(false)} wide>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
            <Field label="Fecha Recibo" half><input style={S.input} type="date" value={form.fecha_recibo} onChange={e=>setForm(p=>({...p,fecha_recibo:e.target.value}))}/></Field>
            <Field label="Fecha Proceso" half><input style={S.input} type="date" value={form.fecha_proceso} onChange={e=>setForm(p=>({...p,fecha_proceso:e.target.value}))}/></Field>
            <Field label="Semana #" half><input style={S.input} type="number" value={form.semana} onChange={e=>setForm(p=>({...p,semana:e.target.value}))}/></Field>
            <Field label="Mes" half><select style={S.select} value={form.mes} onChange={e=>setForm(p=>({...p,mes:e.target.value}))}>{MESES.map(m=>(<option key={m}>{m}</option>))}</select></Field>
            <Field label="Tipo Proceso" half><select style={S.select} value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>{TIPOS.map(t=>(<option key={t}>{t}</option>))}</select></Field>
            <Field label="Producto / Perfil" half><input style={S.input} value={form.producto} onChange={e=>setForm(p=>({...p,producto:e.target.value}))}/></Field>
            <Field label="N° Canecas" half><input style={S.input} type="number" step="0.1" value={form.canecas} onChange={e=>setForm(p=>({...p,canecas:e.target.value}))}/></Field>
            <Field label="Fecha Lavado" half><input style={S.input} type="date" value={form.fecha_lavado} onChange={e=>setForm(p=>({...p,fecha_lavado:e.target.value}))}/></Field>
          </div>
          <div style={{fontWeight:600,fontSize:13,color:C.navy,margin:"4px 0 10px"}}>Cereza por Finca</div>
          <div style={{background:C.bg,borderRadius:6,padding:14,marginBottom:14,overflowX:"auto",border:`1px solid ${C.border}`}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}>
              <thead><tr>{["Finca","Variedad","kg Cereza","Flote","kg Proceso","Valor/kg",""].map(h=>(<th key={h} style={{...S.th,fontSize:10,padding:"6px 8px"}}>{h}</th>))}</tr></thead>
              <tbody>{rows.map((r,i)=>(
                <tr key={i}>
                  <td style={{padding:"4px 4px"}}><select style={{...S.select,padding:"6px 8px",fontSize:12}} value={r.finca} onChange={e=>setRow(i,"finca",e.target.value)}>{FINCAS.map(f=>(<option key={f}>{f}</option>))}</select></td>
                  <td style={{padding:"4px 4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} value={r.variedad} onChange={e=>setRow(i,"variedad",e.target.value)} list="vl"/><datalist id="vl">{VARIEDADES.map(v=>(<option key={v} value={v}/>))}</datalist></td>
                  <td style={{padding:"4px 4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.kg} onChange={e=>setRow(i,"kg",e.target.value)}/></td>
                  <td style={{padding:"4px 4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.flote} onChange={e=>setRow(i,"flote",e.target.value)}/></td>
                  <td style={{padding:"4px 4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.kg_proceso} placeholder={r.kg} onChange={e=>setRow(i,"kg_proceso",e.target.value)}/></td>
                  <td style={{padding:"4px 4px"}}><input style={{...S.input,padding:"6px 8px",fontSize:12}} type="number" value={r.valor_kg} placeholder="6000" onChange={e=>setRow(i,"valor_kg",e.target.value)}/></td>
                  <td style={{padding:"4px 4px"}}>{rows.length>1&&(<button style={{...S.btnGhost,padding:"5px 8px"}} onClick={()=>rmRow(i)}>✕</button>)}</td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
              <button style={S.btnGhost} onClick={addRow}>+ Agregar Finca</button>
              <span style={{color:C.accent,fontSize:12,fontWeight:600}}>Total: {fmt(rows.reduce((s,r)=>s+(+r.kg||0),0))} kg — {fmtCOP(rows.reduce((s,r)=>s+(+r.kg||0)*(+r.valor_kg||0),0))}</span>
            </div>
          </div>
          <div style={{background:C.accentBg,border:`1px solid ${C.accent}30`,borderRadius:6,padding:"10px 14px",marginBottom:14}}>
            <span style={{color:C.textDim,fontSize:12}}>Código generado: </span>
            <span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:14}}>{genCod()}</span>
          </div>
          <Field label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
            <button style={S.btnGhost} onClick={()=>setModal(false)}>Cancelar</button>
            <button style={S.btnPrimary} onClick={registrar}>Registrar Lote</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Proceso({lotes,setLotes}){
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState({canecas:"",jugo:"",panela:"",harina:"",levadura:"",notas:""});
  const disp=lotes.filter(l=>l.estado==="Recepcion");
  const avanzar=()=>{
    if(!sel)return;
    setLotes(p=>p.map(l=>l.id===sel.id?{...l,estado:"Proceso",canecas:+form.canecas||l.canecas,insumos:{jugo:+form.jugo,panela:+form.panela,harina:+form.harina,levadura:+form.levadura},notas:form.notas}:l));
    setSel(null);
  };
  return(
    <div>
      <div style={{marginBottom:22}}>
        <div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACIÓN 02</div>
        <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Proceso — Despulpado & Fermentación</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:16}}>
        <div>
          <div style={S.card}>
            <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>Lotes para Procesar</div>
            {disp.length===0&&<div style={{color:C.textFaint,fontSize:13}}>Sin lotes en recepción.</div>}
            {disp.map(l=>{
              const kg=l.cereza.reduce((a,c)=>a+c.kg,0);
              return(<div key={l.id} onClick={()=>setSel(l)} style={{...S.card2,marginBottom:8,cursor:"pointer",borderLeft:`3px solid ${sel?.id===l.id?C.orange:C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{l.codigo}</span>
                  <span style={{color:C.textDim,fontSize:11}}>{l.fecha_recibo}</span>
                </div>
                <div style={{color:C.orange,fontSize:12,marginBottom:6}}>{l.tipo} → {l.producto}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {[...new Set(l.cereza.map(c=>c.finca))].map(f=>(<Badge key={f} label={f} col={C.teal} bg={C.tealBg}/>))}
                  <Badge label={fmt(kg)+" kg"} col={C.gold} bg={C.goldBg}/>
                </div>
              </div>);
            })}
          </div>
          <div style={S.card}>
            <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:12}}>En Proceso Activo</div>
            {lotes.filter(l=>l.estado==="Proceso").map(l=>(
              <div key={l.id} style={{...S.card2,marginBottom:8,borderLeft:`3px solid ${C.orange}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{l.codigo}</span>
                  <Badge label="En Proceso" col={C.orange} bg={C.orangeBg}/>
                </div>
                <div style={{color:C.textDim,fontSize:11,marginBottom:8}}>{l.tipo} — {l.canecas} canecas</div>
                <button style={{...S.btnPrimary,background:C.orange,width:"100%",fontSize:12}} onClick={()=>setLotes(p=>p.map(x=>x.id===l.id?{...x,estado:"Secado"}:x))}>Mover a Secado →</button>
              </div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registrar Proceso</div>
          {!sel?(<div style={{color:C.textFaint,fontSize:13,padding:20}}>← Selecciona un lote</div>):(
            <>
              <div style={{background:C.orangeBg,border:`1px solid ${C.orange}30`,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
                <div style={{color:C.orange,fontWeight:700}}>{sel.codigo}</div>
                <div style={{color:C.textDim,fontSize:12,marginTop:2}}>{sel.tipo} | {fmt(sel.cereza.reduce((a,c)=>a+c.kg,0))} kg | {[...new Set(sel.cereza.map(c=>c.finca))].join(", ")}</div>
              </div>
              <Field label="N° Canecas"><input style={S.input} type="number" step="0.1" value={form.canecas} onChange={e=>setForm(p=>({...p,canecas:e.target.value}))}/></Field>
              <div style={{fontWeight:600,fontSize:12,color:C.navy,marginBottom:10}}>Insumos de Fermentación</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                {["jugo","panela","harina","levadura"].map(ins=>(<div key={ins}><label style={S.label}>{ins}</label><input style={S.input} type="number" step="0.01" value={form[ins]} onChange={e=>setForm(p=>({...p,[ins]:e.target.value}))}/></div>))}
              </div>
              <Field label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Field>
              <button style={{...S.btnPrimary,background:C.orange,width:"100%"}} onClick={avanzar}>Iniciar Proceso</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Secado({lotes,setLotes}){
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState({fecha_fin:"",kg_producto:"",bultos:"",humedad:"",notas:""});
  const enSecado=lotes.filter(l=>l.estado==="Secado");
  const cerrar=()=>{
    if(!sel)return;
    const kgC=sel.cereza.reduce((a,c)=>a+c.kg,0);
    setLotes(p=>p.map(l=>l.id===sel.id?{...l,fecha_fin_secado:form.fecha_fin||null,kg_producto:+form.kg_producto,bultos:+form.bultos,humedad:form.humedad,conversion:+(kgC/(+form.kg_producto||1)).toFixed(2),notas:form.notas,estado:"Finalizado"}:l));
    setSel(null);
  };
  return(
    <div>
      <div style={{marginBottom:22}}>
        <div style={{color:C.gold,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACIÓN 03</div>
        <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Control de Secado</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:16}}>
        <div>
          {enSecado.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes en secado activo.</div>}
          {enSecado.map(l=>{
            const dias=Math.max(0,Math.round((Date.now()-new Date(l.fecha_proceso))/86400000));
            const p=Math.min(100,(dias/20)*100);
            return(<div key={l.id} style={{...S.card,cursor:"pointer",marginBottom:10,borderLeft:`3px solid ${sel?.id===l.id?C.gold:C.border}`}}
              onClick={()=>{setSel(l);setForm({fecha_fin:"",kg_producto:"",bultos:"",humedad:"",notas:""});}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</span>
                {l.kg_producto>0?<Badge label="Listo" col={C.green} bg={C.greenBg}/>:<Badge label={dias+"d secando"} col={C.gold} bg={C.goldBg}/>}
              </div>
              <div style={{color:C.textDim,fontSize:12,marginBottom:8}}>{l.producto} — {[...new Set(l.cereza.map(c=>c.finca))].join(", ")}</div>
              <div style={{background:C.bg,borderRadius:4,height:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <div style={{background:p>85?C.red:C.gold,width:p+"%",height:"100%",borderRadius:4}}/>
              </div>
              {l.kg_producto>0&&<div style={{color:C.green,fontSize:12,marginTop:6,fontWeight:600}}>{fmt(l.kg_producto)} kg · {l.bultos} bultos · H:{l.humedad}% · Conv:{l.conversion}:1</div>}
            </div>);
          })}
        </div>
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registrar Salida de Secado</div>
          {!sel?(<div style={{color:C.textFaint,fontSize:13}}>← Selecciona un lote</div>):(
            <>
              <div style={{background:C.goldBg,border:`1px solid ${C.gold}30`,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
                <div style={{color:C.gold,fontWeight:700}}>{sel.codigo}</div>
                <div style={{color:C.textDim,fontSize:12}}>Entrada: {fmt(sel.cereza.reduce((a,c)=>a+c.kg,0))} kg cereza</div>
              </div>
              <Field label="Fecha Fin Secado"><input style={S.input} type="date" value={form.fecha_fin} onChange={e=>setForm(p=>({...p,fecha_fin:e.target.value}))}/></Field>
              <Field label="kg Producto Terminado">
                <input style={S.input} type="number" value={form.kg_producto} onChange={e=>setForm(p=>({...p,kg_producto:e.target.value}))}/>
                {form.kg_producto&&<div style={{color:C.accent,fontSize:11,marginTop:4}}>Conversión: {(sel.cereza.reduce((a,c)=>a+c.kg,0)/(+form.kg_producto)).toFixed(2)}:1</div>}
              </Field>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Field label="N° Bultos"><input style={S.input} type="number" value={form.bultos} onChange={e=>setForm(p=>({...p,bultos:e.target.value}))}/></Field>
                <Field label="Humedad Final (%)"><input style={S.input} type="number" step="0.1" value={form.humedad} onChange={e=>setForm(p=>({...p,humedad:e.target.value}))}/></Field>
              </div>
              <Field label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Field>
              <button style={{...S.btnPrimary,background:C.gold,width:"100%"}} onClick={cerrar}>Cerrar Secado → Finalizado</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Trilla({lotes,setLotes}){
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState({excelso:"",merma:"",pasillas:"",humedad:"",norma:NORMAS[0],obs:""});
  const disp=lotes.filter(l=>l.estado==="Finalizado"&&!l.trilla?.kg_excelso);
  const tril=lotes.filter(l=>l.trilla?.kg_excelso>0);
  const registrar=()=>{
    if(!sel)return;
    setLotes(p=>p.map(l=>l.id===sel.id?{...l,estado:"Cerrado",trilla:{kg_excelso:+form.excelso,kg_merma:+form.merma,kg_pasillas:+form.pasillas,humedad_salida:+form.humedad,norma:form.norma,obs:form.obs}}:l));
    setSel(null);
  };
  const entrada=sel?.kg_producto||0;
  const salida=(+form.excelso||0)+(+form.merma||0)+(+form.pasillas||0);
  const diff=entrada-salida;
  return(
    <div>
      <div style={{marginBottom:22}}>
        <div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACIÓN 04</div>
        <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Trilla — Excelso / Merma / Pasillas</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
        <KPI label="Excelso Total" value={fmt(tril.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0))+" kg"} col={C.green}/>
        <KPI label="Merma Total" value={fmt(tril.reduce((s,l)=>s+(l.trilla?.kg_merma||0),0))+" kg"} col={C.red}/>
        <KPI label="Pasillas" value={fmt(tril.reduce((s,l)=>s+(l.trilla?.kg_pasillas||0),0))+" kg"} col={C.orange}/>
        <KPI label="Pendientes" value={disp.length} col={C.gold}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.3fr",gap:16}}>
        <div>
          {disp.length===0&&<div style={{...S.card,color:C.textFaint,fontSize:13}}>Sin lotes disponibles.</div>}
          {disp.map(l=>(<div key={l.id} onClick={()=>{setSel(l);setForm({excelso:"",merma:"",pasillas:"",humedad:"",norma:NORMAS[0],obs:""}); }}
            style={{...S.card,cursor:"pointer",marginBottom:10,borderLeft:`3px solid ${sel?.id===l.id?C.green:C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</span>
              <span style={{color:C.gold,fontSize:12,fontWeight:600}}>{l.humedad}% H</span>
            </div>
            <div style={{color:C.textDim,fontSize:12,marginBottom:4}}>{l.producto} — {[...new Set(l.cereza.map(c=>c.finca))].join(", ")}</div>
            <div style={{color:C.green,fontSize:12,fontWeight:600}}>{fmt(l.kg_producto)} kg · {l.bultos} bultos</div>
          </div>))}
        </div>
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:16}}>Registro de Trilla</div>
          {!sel?(<div style={{color:C.textFaint,fontSize:13}}>← Selecciona un lote</div>):(
            <>
              <div style={{background:C.greenBg,border:`1px solid ${C.green}30`,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
                <div style={{color:C.green,fontWeight:700}}>{sel.codigo}</div>
                <div style={{color:C.textDim,fontSize:12}}>Entrada: {fmt(sel.kg_producto)} kg | H:{sel.humedad}%</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div><label style={S.label}>kg Excelso</label><input style={S.input} type="number" value={form.excelso} onChange={e=>setForm(p=>({...p,excelso:e.target.value}))}/>{form.excelso&&<div style={{color:C.green,fontSize:10,marginTop:3}}>{((+form.excelso/entrada)*100).toFixed(1)}% rend.</div>}</div>
                <div><label style={S.label}>kg Merma</label><input style={S.input} type="number" value={form.merma} onChange={e=>setForm(p=>({...p,merma:e.target.value}))}/>{form.merma&&<div style={{color:C.red,fontSize:10,marginTop:3}}>{((+form.merma/entrada)*100).toFixed(1)}%</div>}</div>
                <div><label style={S.label}>kg Pasillas</label><input style={S.input} type="number" value={form.pasillas} onChange={e=>setForm(p=>({...p,pasillas:e.target.value}))}/></div>
                <div><label style={S.label}>Humedad Salida %</label><input style={S.input} type="number" step="0.1" value={form.humedad} onChange={e=>setForm(p=>({...p,humedad:e.target.value}))}/></div>
              </div>
              <Field label="Norma de Producción"><select style={S.select} value={form.norma} onChange={e=>setForm(p=>({...p,norma:e.target.value}))}>{NORMAS.map(n=>(<option key={n}>{n}</option>))}</select></Field>
              {salida>0&&(
                <div style={{background:C.bg,borderRadius:6,padding:12,marginBottom:12,border:`1px solid ${C.border}`}}>
                  <div style={{color:C.textDim,fontSize:11,fontWeight:600,marginBottom:8}}>BALANCE</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,textAlign:"center"}}>
                    {[{l:"Entrada",v:entrada,c:C.navy},{l:"Excelso",v:+form.excelso,c:C.green},{l:"Merma",v:+form.merma,c:C.red},{l:"Pasillas",v:+form.pasillas,c:C.orange}].map(x=>(<div key={x.l} style={{background:C.panel,borderRadius:4,padding:"6px 4px",border:`1px solid ${C.border}`}}><div style={{color:C.textDim,fontSize:9}}>{x.l}</div><div style={{color:x.c,fontWeight:700,fontSize:14}}>{fmt(x.v)}</div></div>))}
                  </div>
                  {Math.abs(diff)>0&&<div style={{color:Math.abs(diff)<5?C.gold:C.red,fontSize:11,marginTop:8,textAlign:"center",fontWeight:600}}>⚠ Diferencia: {fmt(diff)} kg</div>}
                </div>
              )}
              <Field label="Observaciones"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={form.obs} onChange={e=>setForm(p=>({...p,obs:e.target.value}))}/></Field>
              <button style={{...S.btnPrimary,background:C.green,width:"100%"}} onClick={registrar}>Registrar Trilla ✓</button>
            </>
          )}
        </div>
      </div>
      {tril.length>0&&(<div style={{...S.card,marginTop:4}}>
        <div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Histórico Trilla</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr>{["Código","Producto","Entrada","Excelso","Merma","Pasillas","H.Salida","Norma","Rend."].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
            <tbody>{tril.map(l=>(<tr key={l.id}>
              <td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace"}}>{l.codigo}</td>
              <td style={S.td}>{l.producto}</td>
              <td style={{...S.td,fontWeight:600}}>{fmt(l.kg_producto)}</td>
              <td style={{...S.td,color:C.green,fontWeight:700}}>{fmt(l.trilla.kg_excelso)}</td>
              <td style={{...S.td,color:C.red}}>{fmt(l.trilla.kg_merma)}</td>
              <td style={{...S.td,color:C.orange}}>{fmt(l.trilla.kg_pasillas)}</td>
              <td style={S.td}>{l.trilla.humedad_salida}%</td>
              <td style={S.td}><Badge label={l.trilla.norma} col={C.purple} bg={C.purpleBg}/></td>
              <td style={{...S.td,color:C.green,fontWeight:600}}>{l.kg_producto?((l.trilla.kg_excelso/l.kg_producto)*100).toFixed(1)+"%":"—"}</td>
            </tr>))}</tbody>
          </table>
        </div>
      </div>)}
    </div>
  );
}

function Trazabilidad({lotes}){
  const [q,setQ]=useState("");
  const [det,setDet]=useState(null);
  const PASOS=["Recepcion","Proceso","Secado","Finalizado","Cerrado"];
  const fil=useMemo(()=>{if(!q.trim())return lotes;const s=q.toLowerCase();return lotes.filter(l=>l.codigo?.toLowerCase().includes(s)||l.cereza.some(c=>c.finca.toLowerCase().includes(s))||l.producto?.toLowerCase().includes(s)||l.tipo?.toLowerCase().includes(s));},[q,lotes]);
  return(
    <div>
      <div style={{marginBottom:22}}>
        <div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>TRAZABILIDAD</div>
        <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Seguimiento en Tiempo Real</div>
      </div>
      <div style={{...S.card,display:"flex",gap:12,alignItems:"center"}}>
        <input style={{...S.input,fontSize:14}} placeholder="Buscar por código, finca, producto o tipo de proceso…" value={q} onChange={e=>setQ(e.target.value)}/>
        <span style={{color:C.textDim,fontSize:12,whiteSpace:"nowrap"}}>{fil.length} lotes</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:12,marginTop:4}}>
        {fil.map(l=>{
          const kg=l.cereza.reduce((a,c)=>a+c.kg,0);
          const ei=PASOS.indexOf(l.estado);
          const open=det?.id===l.id;
          return(<div key={l.id} style={{...S.card,cursor:"pointer",marginBottom:0,borderLeft:`3px solid ${open?C.accent:ECOL[l.estado]||C.border}`}}
            onClick={()=>setDet(open?null:l)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{color:C.accent,fontWeight:700,fontFamily:"monospace",fontSize:13}}>{l.codigo}</div>
                <div style={{color:C.textDim,fontSize:11,marginTop:2}}>{l.tipo} → {l.producto}</div>
              </div>
              <Badge label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
              {[...new Set(l.cereza.map(c=>c.finca))].map(f=>(<Badge key={f} label={f} col={C.teal} bg={C.tealBg}/>))}
            </div>
            <div style={{display:"flex",alignItems:"center"}}>
              {PASOS.map((p,i)=>{
                const done=i<=ei;const act=i===ei;
                const col=done?(ECOL[p]||C.accent):C.textFaint;
                return(<div key={p} style={{display:"flex",alignItems:"center",flex:1}}>
                  <div style={{width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:done?col:C.bg,border:`2px solid ${done?col:C.border}`,fontSize:9,fontWeight:700,color:done?C.white:C.textFaint,flexShrink:0,boxShadow:act?`0 0 0 3px ${col}30`:"none"}}>{done?"✓":i+1}</div>
                  {i<PASOS.length-1&&<div style={{flex:1,height:2,background:i<ei?C.accent:C.border,margin:"0 2px"}}/>}
                </div>);
              })}
            </div>
            {open&&(
              <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {[{l:"kg Cereza",v:fmt(kg)+" kg",c:C.teal},{l:"Prod. Term.",v:l.kg_producto?fmt(l.kg_producto)+" kg":"—",c:C.gold},{l:"Conversión",v:l.conversion?l.conversion+":1":"—",c:C.accent},{l:"Excelso",v:l.trilla?.kg_excelso?fmt(l.trilla.kg_excelso)+" kg":"—",c:C.green},{l:"Merma",v:l.trilla?.kg_merma?fmt(l.trilla.kg_merma)+" kg":"—",c:C.red},{l:"Norma",v:l.trilla?.norma||"—",c:C.purple}].map(d=>(<div key={d.l} style={{background:C.bg,borderRadius:4,padding:"8px 10px",border:`1px solid ${C.border}`}}><div style={S.label}>{d.l}</div><div style={{color:d.c||C.navy,fontSize:13,fontWeight:700}}>{d.v}</div></div>))}
                </div>
                {l.cereza.map((c,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}><span style={{color:C.teal,fontWeight:600}}>{c.finca}</span><span style={{color:C.textDim}}>{c.variedad}</span><span style={{fontWeight:600}}>{fmt(c.kg)} kg</span><span style={{color:C.gold,fontWeight:600}}>{fmtCOP(c.valor_kg)}/kg</span></div>))}
              </div>
            )}
          </div>);
        })}
      </div>
    </div>
  );
}

function Costos({lotes}){
  const [mes,setMes]=useState("todos");
  const meses=["todos",...new Set(lotes.map(l=>l.mes).filter(Boolean))];
  const fil=mes==="todos"?lotes:lotes.filter(l=>l.mes===mes);
  const kg=fil.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const mp=fil.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  const prod=fil.reduce((s,l)=>s+(l.kg_producto||0),0);
  const exc=fil.reduce((s,l)=>s+(l.trilla?.kg_excelso||0),0);
  const mo=fil.length*85000,ene=kg*48,agua=kg*15,mant=mp*0.025;
  const total=mp+mo+ene+agua+mant;
  const ing=exc*1250000;const margen=ing-total;
  const items=[{l:"Materia Prima",v:mp,c:C.orange},{l:"Mano de Obra",v:mo,c:C.accent},{l:"Energía",v:ene,c:C.gold},{l:"Agua",v:agua,c:C.teal},{l:"Mantenimiento",v:mant,c:C.purple}];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{color:C.gold,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>MÓDULO FINANCIERO</div>
          <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Análisis de Costos</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:C.textDim,fontSize:12}}>Período:</span>
          <select style={{...S.select,width:140}} value={mes} onChange={e=>setMes(e.target.value)}>{meses.map(m=>(<option key={m}>{m}</option>))}</select>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
        <KPI label="Costo Total" value={fmtCOP(total)} col={C.red}/>
        <KPI label="Costo/kg Cereza" value={fmtCOP(kg?total/kg:0)} col={C.gold}/>
        <KPI label="Costo/kg Producto" value={fmtCOP(prod?total/prod:0)} col={C.gold}/>
        <KPI label="Costo/kg Excelso" value={fmtCOP(exc?total/exc:0)} col={C.orange}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:16}}>
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Estructura de Costos</div>
          {items.map(it=>{const p=total?(it.v/total*100):0;return(<div key={it.l} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:C.text,fontWeight:500}}>{it.l}</span><span style={{color:it.c,fontWeight:700,fontSize:12}}>{fmtCOP(it.v)}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,background:C.bg,borderRadius:4,height:10,border:`1px solid ${C.border}`,overflow:"hidden"}}><div style={{background:it.c,width:p+"%",height:"100%",borderRadius:4}}/></div><span style={{color:C.textDim,fontSize:11,minWidth:38,textAlign:"right"}}>{p.toFixed(1)}%</span></div>
          </div>);})}
          <div style={{borderTop:`2px solid ${C.border}`,paddingTop:12,marginTop:4,display:"flex",justifyContent:"space-between"}}><span style={{color:C.navy,fontWeight:700}}>TOTAL</span><span style={{color:C.navy,fontSize:16,fontWeight:700}}>{fmtCOP(total)}</span></div>
        </div>
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Estado de Resultados</div>
          {[{l:"Ingresos Estimados",v:fmtCOP(ing),c:C.green},{l:"Costos Totales",v:fmtCOP(total),c:C.red},{l:"Margen Bruto",v:fmtCOP(margen),c:margen>0?C.accent:C.red},{l:"Rentabilidad",v:total?(((ing-total)/total)*100).toFixed(1)+"%":"—",c:C.gold}].map(r=>(<div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"11px 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:C.textDim,fontSize:12}}>{r.l}</span><span style={{color:r.c,fontWeight:700,fontSize:14}}>{r.v}</span></div>))}
        </div>
      </div>
    </div>
  );
}

function Usuarios({usuarios,setUsuarios}){
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({nombre:"",email:"",rol:"Operario Beneficio",pass:""});
  const [err,setErr]=useState("");
  const ROLES=["Gerente","Supervisor","Operario Beneficio","Trilladore","Analista Calidad","Conductor"];
  const agregar=()=>{
    if(!form.nombre||!form.email||!form.pass){setErr("Completa todos los campos.");return;}
    if(!form.email.endsWith("@cafeuba.com.co")){setErr("El correo debe ser @cafeuba.com.co");return;}
    if(usuarios.some(u=>u.email===form.email)){setErr("Correo ya registrado.");return;}
    setUsuarios(p=>[...p,{...form,id:p.length+1,activo:true}]);
    setModal(false);setErr("");setForm({nombre:"",email:"",rol:"Operario Beneficio",pass:""});
  };
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{color:C.accent,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>GESTIÓN DE ACCESO</div>
          <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Usuarios del Sistema</div>
          <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Solo correos @cafeuba.com.co</div>
        </div>
        <button style={S.btnPrimary} onClick={()=>setModal(true)}>+ Nuevo Usuario</button>
      </div>
      <div style={S.card}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr>{["#","Nombre","Email","Rol","Estado","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
            <tbody>{usuarios.map(u=>(<tr key={u.id}>
              <td style={{...S.td,color:C.textFaint}}>{u.id}</td>
              <td style={{...S.td,fontWeight:600,color:C.navy}}>{u.nombre}</td>
              <td style={{...S.td,color:C.textDim,fontSize:12}}>{u.email}</td>
              <td style={S.td}><Badge label={u.rol} col={C.accent} bg={C.accentBg}/></td>
              <td style={S.td}><Badge label={u.activo?"Activo":"Inactivo"} col={u.activo?C.green:C.red} bg={u.activo?C.greenBg:C.redBg}/></td>
              <td style={S.td}><button style={S.btnGhost} onClick={()=>setUsuarios(p=>p.map(x=>x.id===u.id?{...x,activo:!x.activo}:x))}>{u.activo?"Desactivar":"Activar"}</button></td>
            </tr>))}</tbody>
          </table>
        </div>
      </div>
      {modal&&(<Modal title="Crear Usuario" onClose={()=>{setModal(false);setErr("");}}>
        <Field label="Nombre Completo *"><input style={S.input} value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}/></Field>
        <Field label="Correo (@cafeuba.com.co) *"><input style={S.input} type="email" placeholder="nombre@cafeuba.com.co" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value.toLowerCase()}))}/></Field>
        <Field label="Rol"><select style={S.select} value={form.rol} onChange={e=>setForm(p=>({...p,rol:e.target.value}))}>{ROLES.map(r=>(<option key={r}>{r}</option>))}</select></Field>
        <Field label="Contraseña *"><input style={S.input} type="password" value={form.pass} onChange={e=>setForm(p=>({...p,pass:e.target.value}))}/></Field>
        {err&&<div style={{color:C.red,fontSize:12,marginBottom:10,padding:"8px 12px",background:C.redBg,borderRadius:4}}>{err}</div>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
          <button style={S.btnGhost} onClick={()=>{setModal(false);setErr("");}}>Cancelar</button>
          <button style={S.btnPrimary} onClick={agregar}>Crear Usuario</button>
        </div>
      </Modal>)}
    </div>
  );
}

function Login({usuarios,onLogin}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState(false);
  const handle=()=>{const u=usuarios.find(x=>x.email===email.trim().toLowerCase()&&x.pass===pass&&x.activo);if(u)onLogin(u);else setErr(true);};
  return(
    <div style={{...S.app,display:"flex",minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{width:"50%",background:`linear-gradient(145deg,#1E3A5F 0%,#2D5F8A 50%,#0E7490 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48}}>
        <div style={{textAlign:"center",maxWidth:360}}>
          <div style={{fontSize:56,marginBottom:16}}>☕</div>
          <div style={{fontSize:34,fontWeight:800,color:C.white,letterSpacing:.5,marginBottom:6}}>CafeUba</div>
          <div style={{color:"rgba(255,255,255,0.75)",fontSize:15,marginBottom:36,lineHeight:1.6}}>Central de Beneficio<br/>Plan Milán — Gestión Operativa</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["🌿","Recepción"],["⚙️","Proceso"],["☀️","Secado"],["✅","Trilla"]].map(([ic,lb])=>(<div key={lb} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",textAlign:"left",border:"1px solid rgba(255,255,255,0.15)"}}><span style={{fontSize:20}}>{ic}</span><div style={{color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:5,fontWeight:500}}>{lb}</div></div>))}
          </div>
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:48,background:C.bg}}>
        <div style={{width:"100%",maxWidth:380}}>
          <div style={{marginBottom:32}}>
            <div style={{color:C.navy,fontSize:26,fontWeight:700,marginBottom:5}}>Bienvenido</div>
            <div style={{color:C.textDim,fontSize:13}}>Ingresa con tu correo corporativo</div>
          </div>
          <div style={{...S.card,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
            <Field label="Correo Corporativo"><input style={{...S.input,fontSize:14}} type="email" placeholder="usuario@cafeuba.com.co" value={email} onChange={e=>{setEmail(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&handle()}/></Field>
            <Field label="Contraseña"><input style={{...S.input,fontSize:14}} type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&handle()}/></Field>
            {err&&<div style={{color:C.red,fontSize:12,marginBottom:12,padding:"10px 12px",background:C.redBg,borderRadius:6,border:`1px solid ${C.red}25`}}>✕ Credenciales incorrectas o usuario inactivo</div>}
            <button style={{...S.btnPrimary,width:"100%",padding:12,fontSize:14,boxShadow:"0 4px 12px rgba(30,58,95,0.25)"}} onClick={handle}>Ingresar</button>
            <div style={{color:C.textFaint,fontSize:11,textAlign:"center",marginTop:14}}>Demo: c.munoz@cafeuba.com.co / admin123</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const NAV=[{k:"dashboard",l:"Dashboard",icon:"▣",c:C.navy},null,{k:"recepcion",l:"Recepción",icon:"↓",c:C.teal},{k:"proceso",l:"Proceso",icon:"⊙",c:C.orange},{k:"secado",l:"Secado",icon:"◎",c:C.gold},{k:"trilla",l:"Trilla",icon:"⚙",c:C.green},null,{k:"trazabilidad",l:"Trazabilidad",icon:"⟳",c:C.teal},{k:"costos",l:"Costos",icon:"$",c:C.gold},null,{k:"usuarios",l:"Usuarios",icon:"⊕",c:C.accent}];

export default function App(){
  const [usuarios,setUsuarios]=useState(USERS);
  const [loggedIn,setLoggedIn]=useState(false);
  const [user,setUser]=useState(null);
  const [view,setView]=useState("dashboard");
  const [lotes,setLotes]=useState(seedLotes);
  if(!loggedIn)return(<><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/><Login usuarios={usuarios} onLogin={u=>{setLoggedIn(true);setUser(u);}}/></>);
  const VIEWS={dashboard:Dashboard,recepcion:Recepcion,proceso:Proceso,secado:Secado,trilla:Trilla,trazabilidad:Trazabilidad,costos:Costos,usuarios:Usuarios};
  const View=VIEWS[view]||Dashboard;
  return(
    <><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <div style={S.app}>
      <div style={S.topbar}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:8,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>☕</div>
          <div><div style={{color:C.white,fontWeight:700,fontSize:14}}>CafeUba</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:9,letterSpacing:1}}>CENTRAL DE BENEFICIO</div></div>
        </div>
        <div style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontWeight:500}}>Dashboard Gerencial · Procesos & Trilladora Milán</div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:"#4ADE80"}}/><span style={{color:"rgba(255,255,255,0.7)",fontSize:11,fontWeight:500}}>EN VIVO</span></div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>{new Date().toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}</div>
        </div>
      </div>
      <div style={S.sidebar}>
        <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>
          {NAV.map((item,i)=>item===null?(<div key={i} style={{height:1,background:C.border,margin:"6px 6px"}}/>):(<div key={item.k} onClick={()=>setView(item.k)} style={{padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderRadius:6,marginBottom:2,background:view===item.k?C.accentBg:"transparent",color:view===item.k?C.navy:C.textDim,fontSize:13,fontWeight:view===item.k?600:400,borderLeft:view===item.k?`3px solid ${C.accent}`:"3px solid transparent"}}><span style={{fontSize:14,width:18,textAlign:"center"}}>{item.icon}</span>{item.l}</div>))}
        </nav>
        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.white,flexShrink:0}}>{user?.nombre?.charAt(0)}</div>
            <div style={{overflow:"hidden"}}><div style={{color:C.navy,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.nombre}</div><div style={{color:C.textDim,fontSize:10}}>{user?.rol}</div></div>
          </div>
          <button style={{...S.btnGhost,width:"100%",textAlign:"center",fontSize:12}} onClick={()=>{setLoggedIn(false);setUser(null);}}>Cerrar Sesión</button>
        </div>
      </div>
      <div style={S.main}><View lotes={lotes} setLotes={setLotes} usuarios={usuarios} setUsuarios={setUsuarios}/></div>
    </div></>
  );
}
