import{useState}from"react";
import{C,S}from"../../theme";
import{PRESENTACIONES_TOSTADO}from"../../data/constants";
import{fmtCOP,fmt,numVal,today,genId,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{Fld,KPI,Modal,TablaScrollV}from"../ui";

const SKU_MAP=Object.fromEntries(PRESENTACIONES_TOSTADO.map(p=>[p.key,p]));

export function TabEmpaque({blendsTostado,empaques,setEmpaques,configEmpaque,setConfigEmpaque}){
  const [showConfig,setShowConfig]=useState(false);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({fecha:today(),lote_tostado_id:"",responsable:"",notas:"",items:[]});
  const [err,setErr]=useState("");

  // stock granel = tostado - salidas granel - empaques
  const stockGranel=(t)=>(t.kg_cafe_tostado||0)-(t.salidas||[]).reduce((a,s)=>a+s.peso_salida,0)-empaques.filter(e=>e.lote_tostado_id===t.id).reduce((s,e)=>s+(e.kg_cafe_total||0),0);

  const cfgMap=Object.fromEntries(configEmpaque.map(c=>[c.sku_key,c]));
  const lotesConStock=blendsTostado.filter(t=>t.kg_cafe_tostado>0&&stockGranel(t)>0.01);
  const loteSeleccionado=blendsTostado.find(t=>t.id===form.lote_tostado_id)||null;
  const stockDisp=loteSeleccionado?stockGranel(loteSeleccionado):0;
  const vut=loteSeleccionado?(loteSeleccionado.valor_unitario_tostado||(loteSeleccionado.kg_cafe_tostado&&loteSeleccionado.valor_total?Math.round(loteSeleccionado.valor_total/loteSeleccionado.kg_cafe_tostado):0)):0;

  const kgUsadoForm=form.items.reduce((s,it)=>{const sku=SKU_MAP[it.sku_key];return s+(+it.unidades||0)*(sku?.kg_cafe||0);},0);

  const agregarSKU=(skuKey)=>{
    if(form.items.some(it=>it.sku_key===skuKey))return;
    setForm(p=>({...p,items:[...p.items,{sku_key:skuKey,unidades:""}]}));
  };
  const quitarSKU=(idx)=>setForm(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}));
  const setUnidades=(idx,val)=>setForm(p=>{const its=[...p.items];its[idx]={...its[idx],unidades:val};return{...p,items:its};});

  const abrirModal=()=>{setForm({fecha:today(),lote_tostado_id:"",responsable:"",notas:"",items:[]});setErr("");setModal(true);};

  const registrar=()=>{
    if(!form.lote_tostado_id){setErr("Selecciona un lote tostado.");return;}
    if(!form.items.length){setErr("Agrega al menos un SKU a empacar.");return;}
    for(const it of form.items){if(!(+it.unidades>0)){setErr("Ingresa unidades válidas (>0) en todos los SKU.");return;}}
    if(kgUsadoForm>stockDisp+0.001){setErr("Los kg a consumir ("+fmt(kgUsadoForm,3)+") superan el stock disponible ("+fmt(stockDisp,3)+" kg).");return;}
    setErr("");
    const items=form.items.map(it=>{
      const sku=SKU_MAP[it.sku_key];
      const cfg=cfgMap[it.sku_key]||{};
      const unidades=+it.unidades;
      const kgUnit=sku?.kg_cafe||0;
      const kgTotal=Math.round(unidades*kgUnit*1000)/1000;
      const costoCafe=Math.round(vut*kgUnit);
      const costoEmpaque=cfg.costo_empaque||0;
      return{sku_key:it.sku_key,sku_label:sku?.label||it.sku_key,unidades,kg_cafe_por_unidad:kgUnit,kg_cafe_total:kgTotal,costo_cafe_unitario:costoCafe,costo_empaque_unitario:costoEmpaque,costo_total_unitario:costoCafe+costoEmpaque,precio_lista:cfg.precio_lista||0};
    });
    const kgTotal=Math.round(items.reduce((s,it)=>s+it.kg_cafe_total,0)*1000)/1000;
    setEmpaques(p=>[{id:genId(),fecha:form.fecha,mes:mesDe(form.fecha),lote_tostado_id:loteSeleccionado.id,lote_tostado_codigo:loteSeleccionado.codigo,nombre_producto:loteSeleccionado.nombre_producto,valor_unitario_tostado:vut,responsable:form.responsable,notas:form.notas,items,kg_cafe_total:kgTotal},...p]);
    setModal(false);
  };

  const eliminarEmpaque=(e)=>{
    if(!window.confirm("¿Eliminar esta corrida de empaque? Los kg volverán al stock granel del lote."))return;
    setEmpaques(p=>p.filter(x=>x.id!==e.id));
  };

  const updateCfg=(skuKey,field,val)=>setConfigEmpaque(p=>p.map(c=>c.id===skuKey?{...c,[field]:numVal(val)}:c));

  // KPIs
  const totalUnidades=empaques.reduce((s,e)=>s+(e.items||[]).reduce((a,it)=>a+it.unidades,0),0);
  const totalKgEmpacado=empaques.reduce((s,e)=>s+(e.kg_cafe_total||0),0);
  const corrIDAmes=(()=>{const mes=mesDe(today());return empaques.filter(e=>e.mes===mes);})();
  const unidadesMes=corrIDAmes.reduce((s,e)=>s+(e.items||[]).reduce((a,it)=>a+it.unidades,0),0);

  const skusActivos=PRESENTACIONES_TOSTADO.filter(p=>{const c=cfgMap[p.key];return!c||c.activo!==false;});

  return(<div>
    {/* Config panel */}
    <div style={{...S.card,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontWeight:700,fontSize:13,color:C.navy}}>Configuración de Precios y Costos por SKU</div>
        <button style={S.btnG} onClick={()=>setShowConfig(v=>!v)}>{showConfig?"Ocultar":"Editar precios ▾"}</button>
      </div>
      {showConfig&&(<div style={{marginTop:14}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["SKU","Formato","Peso (g)","kg café / unidad","Costo Empaque (COP/u)","Precio de Lista (COP/u)","Activo"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{PRESENTACIONES_TOSTADO.map(p=>{const c=cfgMap[p.key]||{};return(<tr key={p.key}>
            <td style={{...S.td,fontWeight:600,color:C.navy,whiteSpace:"nowrap"}}>{p.label}</td>
            <td style={S.td}>{p.formato}</td>
            <td style={{...S.td,textAlign:"right"}}>{p.peso_g}</td>
            <td style={{...S.td,textAlign:"right",color:C.teal,fontWeight:600}}>{p.kg_cafe}</td>
            <td style={S.td}><input style={{...S.input,width:110,textAlign:"right",padding:"4px 8px"}} type="number" value={c.costo_empaque||0} onChange={e=>updateCfg(p.key,"costo_empaque",e.target.value)}/></td>
            <td style={S.td}><input style={{...S.input,width:110,textAlign:"right",padding:"4px 8px"}} type="number" value={c.precio_lista||0} onChange={e=>updateCfg(p.key,"precio_lista",e.target.value)}/></td>
            <td style={{...S.td,textAlign:"center"}}><input type="checkbox" checked={c.activo!==false} onChange={e=>setConfigEmpaque(p2=>p2.map(x=>x.id===p.key?{...x,activo:e.target.checked}:x))}/></td>
          </tr>);})}</tbody>
        </table>
        <div style={{color:C.textFaint,fontSize:11,marginTop:8}}>Los valores se guardan automáticamente. Solo se aplican a corridas de empaque nuevas — los registros existentes conservan el costo capturado al momento del empaque.</div>
      </div>)}
    </div>

    {/* KPIs + action */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,flex:1}}>
        <KPI label="Corridas totales" value={empaques.length} col={C.navy}/>
        <KPI label="Unidades empacadas" value={totalUnidades.toLocaleString("es-CO")} col={C.purple}/>
        <KPI label="kg café consumido" value={fmt(totalKgEmpacado,1)+" kg"} col={C.orange}/>
        <KPI label={"Unidades este mes"} value={unidadesMes.toLocaleString("es-CO")} col={C.green}/>
      </div>
      <button style={{...S.btn,background:C.purple,flexShrink:0}} onClick={abrirModal}>+ Nueva Corrida de Empaque</button>
    </div>

    {/* Tabla corridas */}
    <div style={S.card}>
      <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Corridas de Empaque</div>
      <TablaScrollV minWidth={900}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead><tr>{["Fecha","Mes","Lote Tostado","Producto","SKUs empacados","kg café usado","Responsable","Notas","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{empaques.map(e=>(<tr key={e.id}>
            <td style={{...S.td,color:C.textDim}}>{fmtFecha(e.fecha)}</td>
            <td style={{...S.td,textTransform:"capitalize"}}>{e.mes}</td>
            <td style={{...S.td,color:C.orange,fontWeight:700,fontFamily:"monospace",fontSize:11}}>{e.lote_tostado_codigo}</td>
            <td style={{...S.td,fontWeight:600}}>{e.nombre_producto}</td>
            <td style={S.td}><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(e.items||[]).map((it,i)=>(<span key={i} style={{background:C.purpleBg,color:C.purple,borderRadius:4,padding:"2px 6px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{it.sku_label} ×{it.unidades}</span>))}</div></td>
            <td style={{...S.td,color:C.orange,fontWeight:700}}>{fmt(e.kg_cafe_total,3)} kg</td>
            <td style={S.td}>{e.responsable||"—"}</td>
            <td style={{...S.td,color:C.textDim,fontSize:12,maxWidth:180}}>{e.notas||"—"}</td>
            <td style={S.td}><button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"60"}} onClick={()=>eliminarEmpaque(e)}>Eliminar</button></td>
          </tr>))}
          {!empaques.length&&<tr><td colSpan={9} style={{...S.td,color:C.textFaint,textAlign:"center",padding:20}}>Sin corridas de empaque registradas todavía.</td></tr>}
          </tbody>
        </table>
      </TablaScrollV>
    </div>

    {/* Modal nueva corrida */}
    {modal&&(<Modal title="Nueva Corrida de Empaque" onClose={()=>setModal(false)} wide>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
        <Fld label="Lote Tostado" half>
          <select style={S.select} value={form.lote_tostado_id} onChange={e=>setForm(p=>({...p,lote_tostado_id:e.target.value,items:[]}))}>
            <option value="">— Selecciona lote —</option>
            {lotesConStock.map(t=>(<option key={t.id} value={t.id}>{t.codigo} · {t.nombre_producto} · {fmt(stockGranel(t),2)} kg disp.</option>))}
          </select>
        </Fld>
        <Fld label="Responsable" half><input style={S.input} value={form.responsable} onChange={e=>setForm(p=>({...p,responsable:e.target.value}))}/></Fld>
        <Fld label="Notas" half><input style={S.input} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Fld>
      </div>

      {loteSeleccionado&&(<div style={{background:C.orangeBg,border:"1px solid "+C.orange+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{color:C.navy,fontWeight:700}}>{loteSeleccionado.nombre_producto}</span>
        <span style={{color:C.orange,fontWeight:700}}>Stock disponible: {fmt(stockDisp,2)} kg</span>
        <span style={{color:C.gold}}>Costo/kg tostado: {fmtCOP(vut)}</span>
        {kgUsadoForm>0&&<span style={{color:kgUsadoForm>stockDisp?C.red:C.green,fontWeight:700}}>A consumir: {fmt(kgUsadoForm,3)} kg {kgUsadoForm>stockDisp?"⚠ SUPERA STOCK":""}</span>}
      </div>)}

      {/* Selector de SKUs */}
      <div style={{...S.card,padding:"12px 14px",marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:10}}>SKUs a Empacar</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
          {skusActivos.filter(p=>!form.items.some(it=>it.sku_key===p.key)).map(p=>(<button key={p.key} style={{...S.btnG,fontSize:11,color:C.purple,borderColor:C.purple+"60",padding:"5px 10px"}} onClick={()=>agregarSKU(p.key)}>+ {p.label}</button>))}
          {skusActivos.filter(p=>!form.items.some(it=>it.sku_key===p.key)).length===0&&form.items.length>0&&<div style={{color:C.textFaint,fontSize:11}}>Todos los SKUs activos ya están en la lista.</div>}
          {!loteSeleccionado&&<div style={{color:C.textFaint,fontSize:11}}>Selecciona un lote primero.</div>}
        </div>
        {form.items.map((it,idx)=>{
          const sku=SKU_MAP[it.sku_key];
          const cfg=cfgMap[it.sku_key]||{};
          const u=+it.unidades||0;
          const kgUnit=sku?.kg_cafe||0;
          const kgTotal=Math.round(u*kgUnit*1000)/1000;
          const costoCafe=Math.round(vut*kgUnit);
          const costoEmp=cfg.costo_empaque||0;
          return(<div key={it.sku_key} style={{display:"flex",gap:10,alignItems:"center",marginBottom:8,background:C.purpleBg,borderRadius:6,padding:"8px 12px",border:"1px solid "+C.purple+"30",flexWrap:"wrap"}}>
            <div style={{minWidth:170,fontWeight:600,color:C.purple}}>{sku?.label}</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input style={{...S.input,width:80,textAlign:"right",padding:"4px 8px"}} type="number" min="1" placeholder="Unidades" value={it.unidades} onChange={e=>setUnidades(idx,e.target.value)}/>
              <span style={{color:C.textDim,fontSize:12}}>u</span>
            </div>
            {u>0&&(<div style={{display:"flex",gap:14,fontSize:11,flexWrap:"wrap"}}>
              <span style={{color:C.orange}}>kg café: <b>{fmt(kgTotal,3)}</b></span>
              <span style={{color:C.gold}}>Costo café/u: <b>{fmtCOP(costoCafe)}</b></span>
              <span style={{color:C.teal}}>Costo empaque/u: <b>{fmtCOP(costoEmp)}</b></span>
              <span style={{color:C.navy,fontWeight:700}}>Costo total/u: <b>{fmtCOP(costoCafe+costoEmp)}</b></span>
              <span style={{color:C.green}}>Precio lista: <b>{fmtCOP(cfg.precio_lista||0)}</b></span>
            </div>)}
            <button style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontWeight:900,fontSize:16,padding:"0 4px",marginLeft:"auto"}} onClick={()=>quitarSKU(idx)}>×</button>
          </div>);
        })}
        {form.items.length>0&&(<div style={{marginTop:8,display:"flex",gap:20,fontSize:12,fontWeight:600,borderTop:"1px solid "+C.border,paddingTop:8}}>
          <span style={{color:C.orange}}>Total kg a consumir: <b>{fmt(kgUsadoForm,3)} kg</b></span>
          <span style={{color:C.navy}}>Total unidades: <b>{form.items.reduce((s,it)=>s+(+it.unidades||0),0)}</b></span>
        </div>)}
      </div>

      {err&&<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:10,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {err}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}><button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button><button style={{...S.btn,background:C.purple}} onClick={registrar}>Registrar Empaque</button></div>
    </Modal>)}
  </div>);
}
