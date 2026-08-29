import{useState,Fragment}from"react";
import{C,S}from"../../theme";
import{genId,today,fmtFecha}from"../../lib/format";
import{Modal,Fld,KPI,TablaScrollV}from"../ui";

export function TabNecesidades({necesidadesTostado,setNecesidadesTostado}){
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({trimestre:"",producto:"",kg_necesarios:"",fecha_requerida:"",notas:""});
  const [trimExpandido,setTrimExpandido]=useState(null);

  const abrirNuevo=()=>{setForm({trimestre:"",producto:"",kg_necesarios:"",fecha_requerida:"",notas:""});setModal(true);};
  const guardar=()=>{
    if(!form.trimestre||!form.producto||!(+form.kg_necesarios>0)){alert("Completa trimestre, producto y kg necesarios (mayor a 0).");return;}
    setNecesidadesTostado(p=>[...p,{id:genId(),trimestre:form.trimestre,producto:form.producto,kg_necesarios:+form.kg_necesarios,fecha_requerida:form.fecha_requerida,notas:form.notas,entregado:false,fecha_entrega:"",kg_entregados:""}]);
    setModal(false);
  };
  const eliminar=(id)=>{
    if(!window.confirm("¿Eliminar este registro? Esta acción no se puede deshacer."))return;
    setNecesidadesTostado(p=>p.filter(n=>n.id!==id));
  };
  const toggleEntregado=(id)=>{
    setNecesidadesTostado(p=>p.map(n=>n.id===id?{...n,entregado:!n.entregado,fecha_entrega:!n.entregado?today():""}:n));
  };
  const actualizarKgEntregados=(id,val)=>{
    setNecesidadesTostado(p=>p.map(n=>n.id===id?{...n,kg_entregados:val}:n));
  };

  const porTrimestre={};
  necesidadesTostado.forEach(n=>{
    if(!porTrimestre[n.trimestre])porTrimestre[n.trimestre]={items:[],totalKg:0,pendientes:0,entregados:0};
    porTrimestre[n.trimestre].items.push(n);
    porTrimestre[n.trimestre].totalKg+=n.kg_necesarios||0;
    if(n.entregado)porTrimestre[n.trimestre].entregados++;else porTrimestre[n.trimestre].pendientes++;
  });
  const trimestresData=Object.entries(porTrimestre).sort((a,b)=>b[0].localeCompare(a[0]));

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontWeight:700,fontSize:16,color:C.navy}}>Necesidades Trimestrales</div>
      <button style={S.btn} onClick={abrirNuevo}>+ Nueva Necesidad</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      <KPI label="Pendientes" value={necesidadesTostado.filter(n=>!n.entregado).length} col={C.gold}/>
      <KPI label="Entregadas" value={necesidadesTostado.filter(n=>n.entregado).length} col={C.green}/>
      <KPI label="Trimestres Registrados" value={trimestresData.length} col={C.navy}/>
    </div>

    <div style={S.card}>
      <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
        <thead><tr>{["","Trimestre","Total Kg","Pendientes","Entregados"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
        <tbody>{trimestresData.map(([trim,d])=>{
          const expandido=trimExpandido===trim;
          return(<Fragment key={trim}>
            <tr style={{cursor:"pointer",background:expandido?C.accentBg:"transparent"}} onClick={()=>setTrimExpandido(expandido?null:trim)}>
              <td style={{...S.td,width:24,textAlign:"center",color:C.textDim}}>{expandido?"▾":"▸"}</td>
              <td style={{...S.td,fontWeight:700,color:C.navy}}>{trim}</td>
              <td style={{...S.td,fontWeight:700}}>{d.totalKg} kg</td>
              <td style={{...S.td,color:d.pendientes>0?C.gold:C.textFaint,fontWeight:d.pendientes>0?700:400}}>{d.pendientes}</td>
              <td style={{...S.td,color:C.green,fontWeight:700}}>{d.entregados}</td>
            </tr>
            {expandido&&(<tr><td colSpan={5} style={{padding:"14px 20px",background:C.bg,borderBottom:"1px solid "+C.border}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
                {["Producto","Kg Necesarios","Fecha Requerida","Entregado","Fecha Entrega","Kg Entregados","Notas","Acciones"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
              </tr></thead>
              <tbody>{d.items.map(n=>(<tr key={n.id}>
                <td style={S.td}>{n.producto}</td>
                <td style={{...S.td,fontWeight:700}}>{n.kg_necesarios} kg</td>
                <td style={{...S.td,color:C.textDim}}>{n.fecha_requerida?fmtFecha(n.fecha_requerida):"—"}</td>
                <td style={S.td} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={!!n.entregado} onChange={()=>toggleEntregado(n.id)} style={{accentColor:C.green}}/></td>
                <td style={{...S.td,color:n.entregado?C.green:C.textFaint}}>{n.fecha_entrega?fmtFecha(n.fecha_entrega):"—"}</td>
                <td style={S.td} onClick={e=>e.stopPropagation()}><input style={{...S.input,width:80,padding:"4px 8px"}} type="number" min="0" value={n.kg_entregados} onChange={e=>actualizarKgEntregados(n.id,e.target.value)}/></td>
                <td style={{...S.td,color:C.textDim,fontSize:12}}>{n.notas||"-"}</td>
                <td style={S.td} onClick={e=>e.stopPropagation()}><button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>eliminar(n.id)}>Eliminar</button></td>
              </tr>))}</tbody>
              </table>
            </td></tr>)}
          </Fragment>);
        })}</tbody>
      </table></TablaScrollV>
      {trimestresData.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin necesidades registradas todavia.</div>}
    </div>

    {modal&&(<Modal title="Nueva Necesidad Trimestral" onClose={()=>setModal(false)}>
      <Fld label="Trimestre" half><input style={S.input} placeholder="Ej: Q3 2026" value={form.trimestre} onChange={e=>setForm(p=>({...p,trimestre:e.target.value}))}/></Fld>
      <Fld label="Producto" half><input style={S.input} value={form.producto} onChange={e=>setForm(p=>({...p,producto:e.target.value}))}/></Fld>
      <Fld label="Kg Necesarios" half><input style={S.input} type="number" min="0" value={form.kg_necesarios} onChange={e=>setForm(p=>({...p,kg_necesarios:e.target.value}))}/></Fld>
      <Fld label="Fecha Requerida" half><input style={S.input} type="date" value={form.fecha_requerida} onChange={e=>setForm(p=>({...p,fecha_requerida:e.target.value}))}/></Fld>
      <Fld label="Notas"><input style={S.input} value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))}/></Fld>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={S.btn} onClick={guardar}>Registrar</button>
      </div>
    </Modal>)}
  </div>);
}
