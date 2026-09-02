import{useState}from"react";
import{C,S}from"../../theme";
import{CANALES_VENTA_TOSTADO}from"../../data/constants";
import{fmtCOP,fmt,today,genId,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{Bdg,Fld,KPI,Modal,TablaScrollV}from"../ui";

export function TabVentasTostado({empaques,setEmpaques}){
  const [modal,setModal]=useState(false);
  const [empaqueId,setEmpaqueId]=useState("");
  const [form,setForm]=useState({fecha:today(),canal:CANALES_VENTA_TOSTADO[0],cliente:"",referencia:"",unidades:"",precio_unitario:"",descuento_pct:"0",notas:""});
  const [err,setErr]=useState("");
  const [filtroMes,setFiltroMes]=useState("");

  const stockDe=(e)=>(e.unidades||0)-(e.ventas||[]).reduce((s,v)=>s+(v.unidades||0),0);
  const conStock=empaques.filter(e=>stockDe(e)>0);
  const empaqueSel=empaques.find(e=>e.id===empaqueId)||null;
  const stockSel=empaqueSel?stockDe(empaqueSel):0;

  const abrirModal=()=>{setEmpaqueId("");setForm({fecha:today(),canal:CANALES_VENTA_TOSTADO[0],cliente:"",referencia:"",unidades:"",precio_unitario:"",descuento_pct:"0",notas:""});setErr("");setModal(true);};

  const registrar=()=>{
    if(!empaqueSel){setErr("Selecciona un registro de empaque.");return;}
    if(!(+form.unidades>0)){setErr("Ingresa unidades válidas.");return;}
    if(+form.unidades>stockSel){setErr("No hay suficiente stock: disponibles "+stockSel+", pedidas "+(+form.unidades)+".");return;}
    setErr("");
    const u=+form.unidades,pr=+form.precio_unitario||0,dp=+form.descuento_pct||0;
    const valorTotal=Math.round(u*pr*(1-dp/100));
    const nuevaVenta={id:genId(),fecha:form.fecha,mes:mesDe(form.fecha),canal:form.canal,cliente:form.cliente,referencia:form.referencia,unidades:u,precio_unitario:pr,descuento_pct:dp,valor_total:valorTotal,notas:form.notas};
    setEmpaques(p=>p.map(e=>e.id===empaqueSel.id?{...e,ventas:[...(e.ventas||[]),nuevaVenta]}:e));
    setModal(false);
  };

  const eliminarVenta=(empaqueIdRef,ventaId)=>{
    if(!window.confirm("¿Eliminar esta venta? Las unidades volverán al stock empacado."))return;
    setEmpaques(p=>p.map(e=>e.id===empaqueIdRef?{...e,ventas:(e.ventas||[]).filter(v=>v.id!==ventaId)}:e));
  };

  const todasVentas=empaques.flatMap(e=>(e.ventas||[]).map(v=>({...v,empaque_id:e.id,codigo_lote_empacado:e.codigo_lote_empacado,nombre_producto:e.nombre_producto,gramos_por_unidad:e.gramos_por_unidad,tipo_molienda:e.tipo_molienda})));
  const mesActual=mesDe(today());
  const ventasMes=todasVentas.filter(v=>v.mes===mesActual);
  const ingresosMes=ventasMes.reduce((s,v)=>s+v.valor_total,0);
  const unidadesMes=ventasMes.reduce((s,v)=>s+v.unidades,0);
  const ingresosTotal=todasVentas.reduce((s,v)=>s+v.valor_total,0);
  const unidadesTotal=todasVentas.reduce((s,v)=>s+v.unidades,0);

  const ventasFiltradas=filtroMes?todasVentas.filter(v=>v.mes===filtroMes):todasVentas;
  const CANAL_COL={"Shopify":C.accent,"WhatsApp Business":C.green,"Venta en Persona (Eventos/Ferias)":C.purple};
  const CANAL_BG={"Shopify":C.accentBg,"WhatsApp Business":C.greenBg,"Venta en Persona (Eventos/Ferias)":C.purpleBg};

  return(<div>
    <div style={{...S.card,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:12}}>Inventario Empacado Disponible</div>
      {empaques.length===0?(<div style={{color:C.textFaint,fontSize:13}}>Sin empaques registrados todavía — ve a la pestaña Empaque para registrar.</div>):(
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Código","Producto","Gramos/u","Tipo","Empacadas","Vendidas","Disponibles"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{empaques.map(e=>{
            const vend=(e.ventas||[]).reduce((s,v)=>s+v.unidades,0);
            const disp=stockDe(e);
            return(<tr key={e.id}>
              <td style={{...S.td,fontWeight:700,color:C.accent,fontFamily:"monospace",fontSize:11}}>{e.codigo_lote_empacado}</td>
              <td style={{...S.td,fontWeight:600}}>{e.nombre_producto}</td>
              <td style={S.td}>{e.gramos_por_unidad} g</td>
              <td style={S.td}><Bdg label={e.tipo_molienda} col={C.purple} bg={C.purpleBg}/></td>
              <td style={{...S.td,textAlign:"right",color:C.teal}}>{e.unidades}</td>
              <td style={{...S.td,textAlign:"right",color:C.textDim}}>{vend}</td>
              <td style={{...S.td,textAlign:"right",fontWeight:700,color:disp>0?C.green:C.red}}>{disp}</td>
            </tr>);
          })}</tbody>
        </table>
      )}
    </div>

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,flex:1}}>
        <KPI label="Ventas totales" value={todasVentas.length} col={C.navy}/>
        <KPI label="Unidades vendidas" value={unidadesTotal.toLocaleString("es-CO")} col={C.accent}/>
        <KPI label={"Ingresos "+mesActual} value={fmtCOP(ingresosMes)} col={C.green}/>
        <KPI label={"Unidades "+mesActual} value={unidadesMes.toLocaleString("es-CO")} col={C.gold}/>
      </div>
      <button style={{...S.btn,background:C.green,flexShrink:0,opacity:conStock.length===0?0.5:1}} disabled={conStock.length===0} onClick={abrirModal}>+ Nueva Venta</button>
    </div>

    <div style={{marginBottom:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{color:C.textDim,fontSize:12}}>Filtrar mes:</span>
      <button style={{...S.btnG,fontSize:11,fontWeight:!filtroMes?700:400,color:!filtroMes?C.navy:C.textDim}} onClick={()=>setFiltroMes("")}>Todos</button>
      {[...new Set(todasVentas.map(v=>v.mes))].map(m=>(<button key={m} style={{...S.btnG,fontSize:11,fontWeight:filtroMes===m?700:400,color:filtroMes===m?C.navy:C.textDim,textTransform:"capitalize"}} onClick={()=>setFiltroMes(m)}>{m}</button>))}
    </div>

    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Ventas Registradas</div>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
        <thead><tr>{["Fecha","Canal","Cliente","Referencia","Producto","Unidades","Total","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{ventasFiltradas.map(v=>(<tr key={v.id}>
          <td style={{...S.td,color:C.textDim}}>{fmtFecha(v.fecha)}</td>
          <td style={S.td}><Bdg label={v.canal} col={CANAL_COL[v.canal]||C.accent} bg={CANAL_BG[v.canal]||C.accentBg}/></td>
          <td style={{...S.td,fontWeight:600}}>{v.cliente||"—"}</td>
          <td style={{...S.td,color:C.textDim,fontSize:12}}>{v.referencia||"—"}</td>
          <td style={S.td}>{v.nombre_producto} <span style={{color:C.textFaint,fontSize:11}}>({v.gramos_por_unidad}g {v.tipo_molienda})</span></td>
          <td style={{...S.td,textAlign:"right"}}>{v.unidades}</td>
          <td style={{...S.td,textAlign:"right",color:C.green,fontWeight:700}}>{fmtCOP(v.valor_total)}</td>
          <td style={S.td}><button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"60"}} onClick={()=>eliminarVenta(v.empaque_id,v.id)}>Eliminar</button></td>
        </tr>))}
        {!ventasFiltradas.length&&<tr><td colSpan={8} style={{...S.td,color:C.textFaint,textAlign:"center",padding:20}}>Sin ventas registradas{filtroMes?" para este mes":""} todavía.</td></tr>}
        </tbody>
      </table></TablaScrollV>
    </div>

    {modal&&(<Modal title="Registrar Venta" onClose={()=>setModal(false)}>
      <Fld label="Registro de Empaque">
        <select style={S.select} value={empaqueId} onChange={e=>{setEmpaqueId(e.target.value);const emp=empaques.find(x=>x.id===e.target.value);setForm(p=>({...p,precio_unitario:emp?.precio_venta_sugerido||""}));}}>
          <option value="">— Selecciona —</option>
          {conStock.map(e=>(<option key={e.id} value={e.id}>{e.codigo_lote_empacado} — {e.nombre_producto} ({e.gramos_por_unidad}g {e.tipo_molienda}) — {stockDe(e)} disp.</option>))}
        </select>
      </Fld>
      {empaqueSel&&<div style={{fontSize:12,color:C.textDim,marginBottom:10}}>Disponible: <b style={{color:C.green}}>{stockSel} unidades</b></div>}
      <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
      <Fld label="Canal de Venta" half><select style={S.select} value={form.canal} onChange={e=>setForm(p=>({...p,canal:e.target.value}))}>{CANALES_VENTA_TOSTADO.map(c=>(<option key={c}>{c}</option>))}</select></Fld>
      <Fld label="Cliente" half><input style={S.input} value={form.cliente} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))}/></Fld>
      <Fld label="Referencia (# pedido)" half><input style={S.input} value={form.referencia} onChange={e=>setForm(p=>({...p,referencia:e.target.value}))}/></Fld>
      <Fld label="Unidades" half><input style={S.input} type="number" min="1" max={stockSel} value={form.unidades} onChange={e=>setForm(p=>({...p,unidades:e.target.value}))}/></Fld>
      <Fld label="Precio/Unidad (COP)" half><input style={S.input} type="number" min="0" value={form.precio_unitario} onChange={e=>setForm(p=>({...p,precio_unitario:e.target.value}))}/></Fld>
      <Fld label="Descuento %" half><input style={S.input} type="number" min="0" max="100" value={form.descuento_pct} onChange={e=>setForm(p=>({...p,descuento_pct:e.target.value}))}/></Fld>
      <Fld label="Notas" half><input style={S.input} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Fld>
      {form.unidades>0&&form.precio_unitario>0&&<div style={{fontSize:13,color:C.green,fontWeight:700,marginBottom:10}}>Total: {fmtCOP(Math.round((+form.unidades)*(+form.precio_unitario)*(1-(+form.descuento_pct||0)/100)))}</div>}
      {err&&<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"8px 12px",marginBottom:10,color:C.red,fontSize:13}}>{err}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={{...S.btn,background:C.green}} onClick={registrar}>Registrar Venta</button>
      </div>
    </Modal>)}
  </div>);
}
