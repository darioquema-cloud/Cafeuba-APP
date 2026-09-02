import{useState}from"react";
import{C,S}from"../../theme";
import{fmtCOP,fmt,numVal,today,genId,fmtFecha}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{Fld,KPI,Modal,TablaScrollV,Bdg}from"../ui";

const BOLSA_CLIENTE="__bolsa_cliente__";

export function TabEmpaque({blendsTostado,empaques,setEmpaques,tiposEmpaque,setTiposEmpaque}){
  const [modal,setModal]=useState(false);
  const [modalTipos,setModalTipos]=useState(false);
  const [err,setErr]=useState("");
  const [form,setForm]=useState({fecha:today(),codigo_lote_empacado:"",lote_tostado_id:"",gramos_por_unidad:"",unidades:"",tipo_molienda:"Molido",empaque_id:"",responsable:"",notas:""});
  const [formTipo,setFormTipo]=useState({nombre:"",costo:""});

  const stockGranel=(t)=>(t.kg_cafe_tostado||0)-(t.salidas||[]).reduce((a,s)=>a+s.peso_salida,0)-empaques.filter(e=>e.lote_tostado_id===t.id).reduce((s,e)=>s+(e.kg_cafe_total||0),0);
  const lotesConStock=blendsTostado.filter(t=>t.kg_cafe_tostado>0&&stockGranel(t)>0.01);
  const loteSeleccionado=blendsTostado.find(t=>t.id===form.lote_tostado_id)||null;
  const stockDisp=loteSeleccionado?stockGranel(loteSeleccionado):0;
  const vut=loteSeleccionado?(loteSeleccionado.valor_unitario_tostado||(loteSeleccionado.kg_cafe_tostado&&loteSeleccionado.valor_total?Math.round(loteSeleccionado.valor_total/loteSeleccionado.kg_cafe_tostado):0)):0;

  const tiposActivos=tiposEmpaque.filter(t=>t.activo!==false);
  const empaqueSeleccionado=form.empaque_id===BOLSA_CLIENTE?{nombre:"Bolsa del Cliente",costo:0}:tiposEmpaque.find(t=>t.id===form.empaque_id);

  const kgTotalForm=(+form.gramos_por_unidad||0)*(+form.unidades||0)/1000;

  const stockVentasDe=(e)=>(e.unidades||0)-(e.ventas||[]).reduce((s,v)=>s+(v.unidades||0),0);

  const abrirNuevo=()=>{setForm({fecha:today(),codigo_lote_empacado:"",lote_tostado_id:"",gramos_por_unidad:"",unidades:"",tipo_molienda:"Molido",empaque_id:"",responsable:"",notas:""});setErr("");setModal(true);};

  const registrar=()=>{
    if(!form.lote_tostado_id){setErr("Selecciona un lote tostado.");return;}
    if(!form.codigo_lote_empacado.trim()){setErr("Ingresa el Código Lote Empacado.");return;}
    if(!(+form.gramos_por_unidad>0)){setErr("Ingresa los gramos a empacar por unidad.");return;}
    if(!(+form.unidades>0)){setErr("Ingresa el número de unidades a empacar.");return;}
    if(!form.empaque_id){setErr("Selecciona el tipo de empaque.");return;}
    const kgTotal=Math.round((+form.gramos_por_unidad)*(+form.unidades)/1000*1000)/1000;
    if(kgTotal>stockDisp+0.001){setErr("Los kg a consumir ("+fmt(kgTotal,3)+") superan el stock disponible ("+fmt(stockDisp,3)+" kg).");return;}
    setErr("");
    const costoEmpaqueUnit=empaqueSeleccionado?.costo||0;
    const costoCafeUnit=Math.round(vut*(+form.gramos_por_unidad)/1000);
    setEmpaques(p=>[{
      id:genId(),fecha:form.fecha,mes:mesDe(form.fecha),codigo_lote_empacado:form.codigo_lote_empacado.trim(),
      lote_tostado_id:loteSeleccionado.id,lote_tostado_codigo:loteSeleccionado.codigo,nombre_producto:loteSeleccionado.nombre_producto,
      gramos_por_unidad:+form.gramos_por_unidad,unidades:+form.unidades,tipo_molienda:form.tipo_molienda,
      empaque_nombre:empaqueSeleccionado?.nombre||"",costo_empaque_unitario:costoEmpaqueUnit,
      kg_cafe_total:kgTotal,valor_unitario_tostado:vut,costo_cafe_unitario:costoCafeUnit,
      responsable:form.responsable,notas:form.notas,ventas:[]
    },...p]);
    setModal(false);
  };

  const eliminarEmpaque=(e)=>{
    if((e.ventas||[]).length>0){alert("No se puede eliminar: este empaque ya tiene ventas registradas. Elimina primero las ventas desde Ventas Tostado.");return;}
    if(!window.confirm("¿Eliminar este registro de empaque? Los kg volverán al stock granel del lote."))return;
    setEmpaques(p=>p.filter(x=>x.id!==e.id));
  };

  const guardarTipo=()=>{
    if(!formTipo.nombre.trim()||!(+formTipo.costo>=0))return;
    setTiposEmpaque(p=>[...p,{id:genId(),nombre:formTipo.nombre.trim(),costo:+formTipo.costo,activo:true}]);
    setFormTipo({nombre:"",costo:""});
  };
  const eliminarTipo=(id)=>{
    if(!window.confirm("¿Eliminar este tipo de empaque?"))return;
    setTiposEmpaque(p=>p.filter(t=>t.id!==id));
  };

  const totalKgEmpacado=empaques.reduce((s,e)=>s+(e.kg_cafe_total||0),0);
  const totalUnidades=empaques.reduce((s,e)=>s+(e.unidades||0),0);
  const mesActual=mesDe(today());
  const empaquesMes=empaques.filter(e=>e.mes===mesActual);
  const unidadesMes=empaquesMes.reduce((s,e)=>s+(e.unidades||0),0);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div style={{color:C.navy,fontSize:15,fontWeight:700}}>Registros de Empaque</div>
      <div style={{display:"flex",gap:8}}>
        <button style={S.btnG} onClick={()=>setModalTipos(true)}>Tipos de Empaque</button>
        <button style={{...S.btn,background:C.orange}} onClick={abrirNuevo}>+ Nuevo Registro</button>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Kg Empacados" value={fmt(totalKgEmpacado,1)+" kg"} col={C.navy}/>
      <KPI label="Unidades Empacadas" value={totalUnidades} col={C.accent}/>
      <KPI label={"Unidades "+mesActual} value={unidadesMes} col={C.gold}/>
    </div>

    <div style={S.card}>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
        <thead><tr>{["Código","Fecha","Lote Tostado","Gramos/u","Tipo","Empaque","Costo Empaque","Unidades","Vendidas","Stock","Kg Total","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{empaques.map(e=>{
          const stock=stockVentasDe(e);
          return(<tr key={e.id}>
            <td style={{...S.td,fontWeight:700,color:C.accent,fontFamily:"monospace",fontSize:11}}>{e.codigo_lote_empacado}</td>
            <td style={{...S.td,color:C.textDim}}>{fmtFecha(e.fecha)}</td>
            <td style={S.td}>{e.nombre_producto}<div style={{color:C.textFaint,fontSize:10}}>{e.lote_tostado_codigo}</div></td>
            <td style={S.td}>{e.gramos_por_unidad} g</td>
            <td style={S.td}><Bdg label={e.tipo_molienda} col={C.purple} bg={C.purpleBg}/></td>
            <td style={S.td}>{e.empaque_nombre}</td>
            <td style={{...S.td,color:e.costo_empaque_unitario>0?C.orange:C.textFaint}}>{fmtCOP(e.costo_empaque_unitario)}</td>
            <td style={{...S.td,textAlign:"right"}}>{e.unidades}</td>
            <td style={{...S.td,textAlign:"right",color:C.textDim}}>{(e.ventas||[]).reduce((s,v)=>s+(v.unidades||0),0)}</td>
            <td style={{...S.td,textAlign:"right",fontWeight:700,color:stock>0?C.green:C.textFaint}}>{stock}</td>
            <td style={{...S.td,textAlign:"right"}}>{fmt(e.kg_cafe_total,2)} kg</td>
            <td style={S.td}><button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminarEmpaque(e)}>Eliminar</button></td>
          </tr>);
        })}</tbody>
      </table></TablaScrollV>
      {empaques.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin registros de empaque todavía.</div>}
    </div>

    {modal&&(<Modal title="Nuevo Registro de Empaque" onClose={()=>setModal(false)}>
      <Fld label="Fecha" half><input style={S.input} type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))}/></Fld>
      <Fld label="Código Lote Empacado" half><input style={S.input} value={form.codigo_lote_empacado} onChange={e=>setForm(p=>({...p,codigo_lote_empacado:e.target.value}))}/></Fld>
      <Fld label="Lote Tostado">
        <select style={S.select} value={form.lote_tostado_id} onChange={e=>setForm(p=>({...p,lote_tostado_id:e.target.value}))}>
          <option value="">— Selecciona —</option>
          {lotesConStock.map(t=>(<option key={t.id} value={t.id}>{t.codigo} — {t.nombre_producto} ({fmt(stockGranel(t),1)} kg disp.)</option>))}
        </select>
      </Fld>
      <Fld label="Gramos a Empacar (por unidad)" half><input style={S.input} type="number" min="1" value={form.gramos_por_unidad} onChange={e=>setForm(p=>({...p,gramos_por_unidad:e.target.value}))}/></Fld>
      <Fld label="Unidades" half><input style={S.input} type="number" min="1" value={form.unidades} onChange={e=>setForm(p=>({...p,unidades:e.target.value}))}/></Fld>
      <Fld label="Tipo" half>
        <select style={S.select} value={form.tipo_molienda} onChange={e=>setForm(p=>({...p,tipo_molienda:e.target.value}))}>
          <option value="Molido">Molido</option>
          <option value="Grano">Grano</option>
        </select>
      </Fld>
      <Fld label="Empaque" half>
        <select style={S.select} value={form.empaque_id} onChange={e=>setForm(p=>({...p,empaque_id:e.target.value}))}>
          <option value="">— Selecciona —</option>
          {tiposActivos.map(t=>(<option key={t.id} value={t.id}>{t.nombre} ({fmtCOP(t.costo)})</option>))}
          <option value={BOLSA_CLIENTE}>Bolsa del Cliente ($0)</option>
        </select>
      </Fld>
      {kgTotalForm>0&&<div style={{fontSize:12,color:C.textDim,marginBottom:8}}>Total a consumir: <b style={{color:kgTotalForm>stockDisp?C.red:C.navy}}>{fmt(kgTotalForm,3)} kg</b> (disponible: {fmt(stockDisp,3)} kg)</div>}
      <Fld label="Responsable" half><input style={S.input} value={form.responsable} onChange={e=>setForm(p=>({...p,responsable:e.target.value}))}/></Fld>
      <Fld label="Notas" half><input style={S.input} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Fld>
      {err&&<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"8px 12px",marginBottom:10,color:C.red,fontSize:13}}>{err}</div>}
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:10}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={{...S.btn,background:C.green}} onClick={registrar}>Registrar</button>
      </div>
    </Modal>)}

    {modalTipos&&(<Modal title="Tipos de Empaque (Bolsas Propias)" onClose={()=>setModalTipos(false)}>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"flex-end"}}>
        <div style={{flex:1}}><Fld label="Nombre"><input style={S.input} placeholder="Ej: Kraft 500g" value={formTipo.nombre} onChange={e=>setFormTipo(p=>({...p,nombre:e.target.value}))}/></Fld></div>
        <div style={{width:120}}><Fld label="Costo"><input style={S.input} type="number" min="0" value={formTipo.costo} onChange={e=>setFormTipo(p=>({...p,costo:e.target.value}))}/></Fld></div>
        <button style={{...S.btn,marginBottom:2}} onClick={guardarTipo}>+ Agregar</button>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["Nombre","Costo",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{tiposEmpaque.map(t=>(<tr key={t.id}>
          <td style={S.td}>{t.nombre}</td>
          <td style={S.td}>{fmtCOP(t.costo)}</td>
          <td style={S.td}><button style={{...S.btnG,fontSize:11,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminarTipo(t.id)}>Eliminar</button></td>
        </tr>))}</tbody>
      </table>
      {tiposEmpaque.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin tipos de empaque registrados todavía.</div>}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}><button style={S.btn} onClick={()=>setModalTipos(false)}>Cerrar</button></div>
    </Modal>)}
  </div>);
}
