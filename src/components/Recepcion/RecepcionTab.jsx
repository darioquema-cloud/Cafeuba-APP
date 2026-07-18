import{useState,useMemo}from"react";
import{C,S}from"../../theme";
import{KPI,Modal,Fld,AutoFitText,Bdg,TablaScrollV}from"../ui";
import{FINCAS,TIPOS,ABREV,EQUIPOS_FERM,ECOL,EBG}from"../../data/constants";
import{fmt,fmtCOP,today,genId,fmtFecha}from"../../lib/format";
import{semanaISO,mesDe}from"../../lib/dates";
export function RecepcionTab({lotes,setLotes,lotesFino,setLotesFino}){
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const blankRows=()=>[{finca:FINCAS[0],variedad:"",kg:"",flote:"",kg_proceso:"",valor_kg:""}];
  const blankForm=()=>({fecha_proceso:today(),tipo:TIPOS[0],producto:"SD",canecas:"",equipo_ferm:EQUIPOS_FERM[0],fecha_lavado:"",notas:""});
  const [rows,setRows]=useState(blankRows());
  const [form,setForm]=useState(blankForm());
  const [errReg,setErrReg]=useState("");
  const [busquedaR,setBusquedaR]=useState("");
  const [filtroMesR,setFiltroMesR]=useState("");
  const [filtroProductoR,setFiltroProductoR]=useState("");
  const [filtroTipoR,setFiltroTipoR]=useState("");
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
  const cerrarModal=()=>{setModal(false);setEditId(null);setErrReg("");};
  const reg=()=>{
    const v=rows.filter(r=>r.kg&&r.valor_kg);if(!v.length)return;
    const cerezaRows=v.map(r=>({finca:r.finca,variedad:r.variedad,kg:+r.kg,flote:+(r.flote||0),kg_proceso:+(r.kg_proceso||r.kg),valor_kg:+r.valor_kg}));
    if(!editId){const codNuevo=genCod();if(lotes.some(l=>l.codigo===codNuevo)){setErrReg("Ya existe un lote con el código "+codNuevo+". Cambia la fecha, tipo, producto o variedad para obtener un código único.");return;}setErrReg("");}
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
  const mesesR=[...new Set(lotesOrdenados.map(l=>l.mes).filter(Boolean))].sort();
  const productosR=[...new Set(lotesOrdenados.map(l=>l.producto).filter(Boolean))].sort();
  const tiposR=[...new Set(lotesOrdenados.map(l=>l.tipo).filter(Boolean))].sort();
  const lotesRecFiltrados=lotesOrdenados.filter(l=>{
    if(filtroMesR&&l.mes!==filtroMesR)return false;
    if(filtroProductoR&&l.producto!==filtroProductoR)return false;
    if(filtroTipoR&&l.tipo!==filtroTipoR)return false;
    if(busquedaR){const q=busquedaR.toLowerCase();const fi=[...new Set(l.cereza.map(c=>c.finca))];if(!l.codigo.toLowerCase().includes(q)&&!(l.producto||"").toLowerCase().includes(q)&&!fi.some(f=>f.toLowerCase().includes(q)))return false;}
    return true;
  });
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.teal,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OPERACION 01</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Recepcion de Cereza</div></div><button style={S.btn} onClick={abrirNuevo}>+ Nuevo Lote</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}><KPI label="Total Lotes" value={lotesRecepcion.length} col={C.teal}/><KPI label="kg Cereza" value={fmt(lotesRecepcion.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0))+" kg"} col={C.accent}/><KPI label="Valor Total" value={fmtCOP(lotesRecepcion.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0))} col={C.gold}/><KPI label="Fincas" value={[...new Set(lotesRecepcion.flatMap(l=>l.cereza.map(c=>c.finca)))].length} col={C.green}/></div>
    <div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:8}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por codigo, finca, variedad..." value={busquedaR} onChange={e=>setBusquedaR(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMesR} onChange={e=>setFiltroMesR(e.target.value)}><option value="">Todos los meses</option>{mesesR.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroProductoR} onChange={e=>setFiltroProductoR(e.target.value)}><option value="">Todos los productos</option>{productosR.map(p=>(<option key={p}>{p}</option>))}</select>
      <select style={{...S.select,width:160}} value={filtroTipoR} onChange={e=>setFiltroTipoR(e.target.value)}><option value="">Todos los tipos</option>{tiposR.map(t=>(<option key={t}>{t}</option>))}</select>
      {(busquedaR||filtroMesR||filtroProductoR||filtroTipoR)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setBusquedaR("");setFiltroMesR("");setFiltroProductoR("");setFiltroTipoR("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12}}>{lotesRecFiltrados.length} de {lotesOrdenados.length} lotes</span>
    </div>
    {(busquedaR||filtroMesR||filtroProductoR||filtroTipoR)&&lotesRecFiltrados.length>0&&(()=>{const sumKgR=lotesRecFiltrados.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);const sumValR=lotesRecFiltrados.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);return(<div style={{background:C.navy,borderRadius:8,padding:"10px 16px",marginBottom:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>LOTES</div><div style={{color:C.white,fontWeight:800,fontSize:18}}>{lotesRecFiltrados.length}</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>KG CEREZA</div><div style={{color:"#93c5fd",fontWeight:700,fontSize:15}}>{fmt(sumKgR)} kg</div></div><div style={{textAlign:"center"}}><div style={{color:"rgba(255,255,255,0.6)",fontSize:9,fontWeight:700,letterSpacing:1}}>VALOR TOTAL</div><div style={{color:"#fde68a",fontWeight:700,fontSize:13}}>{fmtCOP(Math.round(sumValR))}</div></div></div>);})()}
    <div style={S.card}><TablaScrollV minWidth={800}><table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}><thead><tr>{["Codigo","Fecha","Mes","Fincas","kg Cereza","Valor COP","Equipo Ferm.","Proceso","Estado",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{lotesRecFiltrados.map(l=>{const kg=l.cereza.reduce((a,c)=>a+c.kg,0);const cop=l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0);const fi=[...new Set(l.cereza.map(c=>c.finca))];return(<tr key={l.id}><td style={{...S.td,color:C.accent,fontWeight:700,fontFamily:"monospace",maxWidth:160}}><AutoFitText text={l.codigo}/></td><td style={{...S.td,color:C.textDim}}>{fmtFecha(l.fecha_recibo)}</td><td style={{...S.td,textTransform:"capitalize"}}>{l.mes}</td><td style={S.td}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{fi.map(f=>(<Bdg key={f} label={f} col={C.teal} bg={C.tealBg}/>))}</div></td><td style={{...S.td,fontWeight:600,color:C.navy}}>{fmt(kg)}</td><td style={{...S.td,color:C.gold,fontWeight:600}}>{fmtCOP(cop)}</td><td style={S.td}><Bdg label={l.equipo_ferm||"-"} col={C.purple} bg={C.purpleBg}/></td><td style={S.td}>{l.tipo} / {l.producto}</td><td style={S.td}><Bdg label={l.estado} col={ECOL[l.estado]||C.textDim} bg={EBG[l.estado]}/></td><td style={S.td}><div style={{display:"flex",gap:6}}><button style={S.btnG} onClick={()=>abrirEditar(l)}>Editar</button>{(()=>{const puedeElim=(l.estado==="Recepcion"||l.estado==="Proceso")&&l.kg_producto===0&&(l.salidas_bodega||[]).length===0;return(<button style={{...S.btnG,color:puedeElim?C.red:C.textFaint,borderColor:puedeElim?C.red+"40":C.border,cursor:puedeElim?"pointer":"not-allowed"}} disabled={!puedeElim} title={!puedeElim?"No se puede eliminar: el lote ya tiene kg o movimientos registrados":""} onClick={()=>{if(window.confirm("¿Eliminar el lote "+l.codigo+"? Esta accion no se puede deshacer."))setLotes(p=>p.filter(x=>x.id!==l.id));}}>Eliminar</button>);})()}</div></td></tr>);})}</tbody></table></TablaScrollV></div>
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
      {errReg&&<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:10,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errReg}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={cerrarModal}>Cancelar</button><button style={S.btn} onClick={reg}>{editId?"Guardar Cambios":"Registrar Lote"}</button></div>
    </Modal>)}
  </div>);
}
