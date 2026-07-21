import{useState,useMemo}from"react";
import{C,S}from"../../theme";
import{CANALES_VENTA_TOSTADO,MESES}from"../../data/constants";
import{fmtCOP,fmt,today,genId,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{Bdg,Fld,KPI,Modal,TablaScrollV}from"../ui";

export function TabVentasTostado({empaques,ventasTostado,setVentasTostado,configEmpaque}){
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({fecha:today(),canal:CANALES_VENTA_TOSTADO[0],cliente:"",referencia:"",notas:"",items:[]});
  const [selectorKey,setSelectorKey]=useState(""); // combo "nombreProd||sku_key" seleccionado para agregar
  const [err,setErr]=useState("");
  const [filtroMes,setFiltroMes]=useState("");

  const cfgMap=Object.fromEntries(configEmpaque.map(c=>[c.sku_key,c]));

  // Inventario: todas las combinaciones (nombre_producto, sku_key) que han sido empacadas
  const inventarioRows=useMemo(()=>{
    const seen=new Set();
    const rows=[];
    empaques.forEach(e=>{(e.items||[]).forEach(it=>{const k=e.nombre_producto+"||"+it.sku_key;if(!seen.has(k)){seen.add(k);rows.push({nombre_producto:e.nombre_producto,sku_key:it.sku_key,sku_label:it.sku_label});}});});
    return rows.map(r=>{
      const producidas=empaques.filter(e=>e.nombre_producto===r.nombre_producto).flatMap(e=>(e.items||[]).filter(it=>it.sku_key===r.sku_key)).reduce((s,it)=>s+it.unidades,0);
      const vendidas=ventasTostado.flatMap(v=>(v.items||[])).filter(it=>it.sku_key===r.sku_key&&it.nombre_producto===r.nombre_producto).reduce((s,it)=>s+it.unidades,0);
      return{...r,producidas,vendidas,disponible:producidas-vendidas};
    });
  },[empaques,ventasTostado]);

  const inventarioDisp=inventarioRows.filter(r=>r.disponible>0);

  const getDisponible=(nombreProd,skuKey)=>{
    const r=inventarioRows.find(x=>x.nombre_producto===nombreProd&&x.sku_key===skuKey);
    return r?r.disponible:0;
  };

  const abrirModal=()=>{setForm({fecha:today(),canal:CANALES_VENTA_TOSTADO[0],cliente:"",referencia:"",notas:"",items:[]});setSelectorKey("");setErr("");setModal(true);};

  const agregarItem=()=>{
    if(!selectorKey)return;
    const [nombreProd,skuKey]=selectorKey.split("||");
    if(form.items.some(it=>it.sku_key===skuKey&&it.nombre_producto===nombreProd))return;
    const row=inventarioDisp.find(r=>r.nombre_producto===nombreProd&&r.sku_key===skuKey);
    if(!row)return;
    const precio=cfgMap[skuKey]?.precio_lista||0;
    setForm(p=>({...p,items:[...p.items,{nombre_producto:nombreProd,sku_key:skuKey,sku_label:row.sku_label,unidades:"",precio_unitario:precio,descuento_pct:"0",valor_total:0}]}));
    setSelectorKey("");
  };

  const quitarItem=(idx)=>setForm(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}));

  const updateItem=(idx,field,val)=>setForm(p=>{
    const its=[...p.items];
    its[idx]={...its[idx],[field]:val};
    const u=+its[idx].unidades||0;
    const pr=+its[idx].precio_unitario||0;
    const dp=+its[idx].descuento_pct||0;
    its[idx].valor_total=Math.round(u*pr*(1-dp/100));
    return{...p,items:its};
  });

  const registrar=()=>{
    if(!form.items.length){setErr("Agrega al menos un ítem a la venta.");return;}
    for(const it of form.items){
      if(!(+it.unidades>0)){setErr("Ingresa unidades válidas en todos los ítems.");return;}
      const disp=getDisponible(it.nombre_producto,it.sku_key);
      if(+it.unidades>disp){setErr("No hay suficiente stock de "+it.sku_label+" ("+it.nombre_producto+"): disponibles "+disp+" unidades, pedidas "+(+it.unidades)+".");return;}
    }
    setErr("");
    const items=form.items.map(it=>({...it,unidades:+it.unidades,precio_unitario:+it.precio_unitario||0,descuento_pct:+it.descuento_pct||0,valor_total:Math.round((+it.unidades)*(+it.precio_unitario||0)*(1-(+it.descuento_pct||0)/100))}));
    const subtotal=items.reduce((s,it)=>s+it.unidades*it.precio_unitario,0);
    const valorTotal=items.reduce((s,it)=>s+it.valor_total,0);
    setVentasTostado(p=>[{id:genId(),fecha:form.fecha,mes:mesDe(form.fecha),canal:form.canal,cliente:form.cliente,referencia:form.referencia,notas:form.notas,items,subtotal,descuento_total:subtotal-valorTotal,valor_total:valorTotal},...p]);
    setModal(false);
  };

  const eliminarVenta=(v)=>{
    if(!window.confirm("¿Eliminar esta venta? Las unidades volverán al inventario empacado."))return;
    setVentasTostado(p=>p.filter(x=>x.id!==v.id));
  };

  // KPIs
  const mesActual=mesDe(today());
  const ventasMes=ventasTostado.filter(v=>v.mes===mesActual);
  const ingresosMes=ventasMes.reduce((s,v)=>s+v.valor_total,0);
  const unidadesMes=ventasMes.reduce((s,v)=>s+(v.items||[]).reduce((a,it)=>a+it.unidades,0),0);
  const ingresosTotal=ventasTostado.reduce((s,v)=>s+v.valor_total,0);
  const unidadesTotal=ventasTostado.reduce((s,v)=>s+(v.items||[]).reduce((a,it)=>a+it.unidades,0),0);

  const ventasFiltradas=filtroMes?ventasTostado.filter(v=>v.mes===filtroMes):ventasTostado;

  const CANAL_COL={"Shopify":C.accent,"WhatsApp Business":C.green,"Venta en Persona (Eventos/Ferias)":C.purple};
  const CANAL_BG={"Shopify":C.accentBg,"WhatsApp Business":C.greenBg,"Venta en Persona (Eventos/Ferias)":C.purpleBg};

  return(<div>
    {/* Inventario empacado */}
    <div style={{...S.card,marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:12}}>Inventario Empacado Disponible</div>
      {inventarioRows.length===0?(<div style={{color:C.textFaint,fontSize:13}}>Sin empaques registrados todavía — ve a la pestaña Empaque para registrar corridas.</div>):(
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Producto","SKU","Empacadas","Vendidas","Disponibles"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{inventarioRows.map((r,i)=>(<tr key={i}>
            <td style={{...S.td,fontWeight:600}}>{r.nombre_producto}</td>
            <td style={S.td}><span style={{background:C.purpleBg,color:C.purple,borderRadius:4,padding:"2px 8px",fontSize:12,fontWeight:600}}>{r.sku_label}</span></td>
            <td style={{...S.td,textAlign:"right",color:C.teal}}>{r.producidas}</td>
            <td style={{...S.td,textAlign:"right",color:C.textDim}}>{r.vendidas}</td>
            <td style={{...S.td,textAlign:"right",fontWeight:700,color:r.disponible>0?C.green:C.red}}>{r.disponible}</td>
          </tr>))}
          </tbody>
        </table>
      )}
    </div>

    {/* KPIs + action */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,flex:1}}>
        <KPI label="Ventas totales" value={ventasTostado.length} col={C.navy}/>
        <KPI label="Unidades vendidas" value={unidadesTotal.toLocaleString("es-CO")} col={C.accent}/>
        <KPI label={"Ingresos "+mesActual} value={fmtCOP(ingresosMes)} col={C.green}/>
        <KPI label={"Unidades "+mesActual} value={unidadesMes.toLocaleString("es-CO")} col={C.gold}/>
      </div>
      <button style={{...S.btn,background:C.green,flexShrink:0,opacity:inventarioDisp.length===0?0.5:1}} disabled={inventarioDisp.length===0} onClick={abrirModal}>+ Nueva Venta</button>
    </div>

    {/* Filtro mes */}
    <div style={{marginBottom:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{color:C.textDim,fontSize:12}}>Filtrar mes:</span>
      <button style={{...S.btnG,fontSize:11,fontWeight:!filtroMes?700:400,color:!filtroMes?C.navy:C.textDim}} onClick={()=>setFiltroMes("")}>Todos</button>
      {[...new Set(ventasTostado.map(v=>v.mes))].map(m=>(<button key={m} style={{...S.btnG,fontSize:11,fontWeight:filtroMes===m?700:400,color:filtroMes===m?C.navy:C.textDim,textTransform:"capitalize"}} onClick={()=>setFiltroMes(m)}>{m}</button>))}
    </div>

    {/* Tabla ventas */}
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Ventas Registradas</div>
      <TablaScrollV minWidth={900}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead><tr>{["Fecha","Canal","Cliente","Referencia","Ítems","Subtotal","Descuento","Total","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{ventasFiltradas.map(v=>(<tr key={v.id}>
            <td style={{...S.td,color:C.textDim}}>{fmtFecha(v.fecha)}</td>
            <td style={S.td}><Bdg label={v.canal} col={CANAL_COL[v.canal]||C.accent} bg={CANAL_BG[v.canal]||C.accentBg}/></td>
            <td style={{...S.td,fontWeight:600}}>{v.cliente||"—"}</td>
            <td style={{...S.td,color:C.textDim,fontSize:12}}>{v.referencia||"—"}</td>
            <td style={S.td}><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(v.items||[]).map((it,i)=>(<span key={i} style={{background:C.greenBg,color:C.green,borderRadius:4,padding:"2px 6px",fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>{it.sku_label} ×{it.unidades}{it.nombre_producto&&<span style={{color:C.teal}}> ({it.nombre_producto})</span>}</span>))}</div></td>
            <td style={{...S.td,textAlign:"right",color:C.textDim}}>{fmtCOP(v.subtotal)}</td>
            <td style={{...S.td,textAlign:"right",color:v.descuento_total>0?C.red:C.textFaint}}>{v.descuento_total>0?"-"+fmtCOP(v.descuento_total):"—"}</td>
            <td style={{...S.td,textAlign:"right",color:C.green,fontWeight:700}}>{fmtCOP(v.valor_total)}</td>
            <td style={S.td}><button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"60"}} onClick={()=>eliminarVenta(v)}>Eliminar</button></td>
          </tr>))}
          {!ventasFiltradas.length&&<tr><td colSpan={9} style={{...S.td,color:C.textFaint,textAlign:"center",padding:20}}>Sin ventas registradas{filtroMes?" para este mes":""} todavía.</td></tr>}
          </tbody>
        </table>
      </TablaScrollV>
    </div>

    {/* Modal nueva venta */}
    {modal&&(<Modal title="Registrar Venta" onClose={()=>setModal(false)} wide>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Canal de Venta" half><select style={S.select} value={form.canal} onChange={e=>setForm(p=>({...p,canal:e.target.value}))}>{CANALES_VENTA_TOSTADO.map(c=>(<option key={c}>{c}</option>))}</select></Fld>
        <Fld label="Cliente" half><input style={S.input} value={form.cliente} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))}/></Fld>
        <Fld label="Referencia (# pedido / código)" half><input style={S.input} value={form.referencia} onChange={e=>setForm(p=>({...p,referencia:e.target.value}))}/></Fld>
        <Fld label="Notas"><input style={S.input} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Fld>
      </div>

      {/* Selector de ítems */}
      <div style={{...S.card,padding:"12px 14px",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:10}}>Ítems de la Venta</div>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontSize:11,color:C.textDim,marginBottom:4}}>Agregar producto + SKU</div>
            <select style={{...S.select,width:"100%"}} value={selectorKey} onChange={e=>setSelectorKey(e.target.value)}>
              <option value="">— Selecciona producto y SKU —</option>
              {inventarioDisp.filter(r=>!form.items.some(it=>it.sku_key===r.sku_key&&it.nombre_producto===r.nombre_producto)).map(r=>{const k=r.nombre_producto+"||"+r.sku_key;return(<option key={k} value={k}>{r.nombre_producto} — {r.sku_label} ({r.disponible} u. disponibles)</option>);})}
            </select>
          </div>
          <button style={{...S.btn,background:C.accent,padding:"8px 16px",flexShrink:0}} disabled={!selectorKey} onClick={agregarItem}>Agregar</button>
        </div>

        {form.items.map((it,idx)=>{
          const disp=getDisponible(it.nombre_producto,it.sku_key);
          const u=+it.unidades||0;
          const pr=+it.precio_unitario||0;
          const dp=+it.descuento_pct||0;
          const vt=Math.round(u*pr*(1-dp/100));
          const sobreStock=u>disp;
          return(<div key={idx} style={{display:"flex",gap:8,alignItems:"flex-end",marginBottom:10,background:sobreStock?C.redBg:C.greenBg,borderRadius:6,padding:"10px 12px",border:"1px solid "+(sobreStock?C.red:C.green)+"40",flexWrap:"wrap"}}>
            <div style={{minWidth:140}}>
              <div style={{fontWeight:700,color:C.navy,fontSize:13}}>{it.nombre_producto}</div>
              <div style={{color:C.purple,fontWeight:600,fontSize:12}}>{it.sku_label}</div>
              <div style={{color:C.textDim,fontSize:11,marginTop:2}}>Disponible: <b style={{color:sobreStock?C.red:C.green}}>{disp} u</b></div>
            </div>
            <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div><div style={{fontSize:11,color:C.textDim,marginBottom:3}}>Unidades</div><input style={{...S.input,width:80,textAlign:"right",borderColor:sobreStock?C.red:"",padding:"4px 8px"}} type="number" min="1" max={disp} value={it.unidades} onChange={e=>updateItem(idx,"unidades",e.target.value)}/></div>
              <div><div style={{fontSize:11,color:C.textDim,marginBottom:3}}>Precio/u (COP)</div><input style={{...S.input,width:110,textAlign:"right",padding:"4px 8px"}} type="number" value={it.precio_unitario} onChange={e=>updateItem(idx,"precio_unitario",e.target.value)}/></div>
              <div><div style={{fontSize:11,color:C.textDim,marginBottom:3}}>Descuento %</div><input style={{...S.input,width:70,textAlign:"right",padding:"4px 8px"}} type="number" min="0" max="100" value={it.descuento_pct} onChange={e=>updateItem(idx,"descuento_pct",e.target.value)}/></div>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                <div style={{fontSize:11,color:C.textDim,marginBottom:3}}>Total ítem</div>
                <div style={{color:C.green,fontWeight:700,fontSize:14,padding:"4px 0"}}>{fmtCOP(vt)}</div>
              </div>
            </div>
            <button style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontWeight:900,fontSize:18,padding:"0 4px",alignSelf:"center"}} onClick={()=>quitarItem(idx)}>×</button>
          </div>);
        })}

        {form.items.length>0&&(()=>{
          const subtotal=form.items.reduce((s,it)=>s+(+it.unidades||0)*(+it.precio_unitario||0),0);
          const total=form.items.reduce((s,it)=>s+Math.round((+it.unidades||0)*(+it.precio_unitario||0)*(1-(+it.descuento_pct||0)/100)),0);
          return(<div style={{marginTop:10,borderTop:"1px solid "+C.border,paddingTop:10,display:"flex",gap:24,justifyContent:"flex-end",fontSize:13}}>
            {subtotal!==total&&<span style={{color:C.textDim}}>Subtotal: <b>{fmtCOP(subtotal)}</b></span>}
            {subtotal!==total&&<span style={{color:C.red}}>Descuento: <b>-{fmtCOP(subtotal-total)}</b></span>}
            <span style={{color:C.green,fontWeight:700,fontSize:15}}>Total: <b>{fmtCOP(total)}</b></span>
          </div>);
        })()}

        {!form.items.length&&<div style={{color:C.textFaint,fontSize:12,textAlign:"center",padding:8}}>Selecciona un producto y SKU para agregar ítems.</div>}
      </div>

      {err&&<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:10,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {err}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}><button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button><button style={{...S.btn,background:C.green}} onClick={registrar}>Registrar Venta</button></div>
    </Modal>)}
  </div>);
}
