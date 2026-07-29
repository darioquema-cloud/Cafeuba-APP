import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Modal,Fld,Bdg,TablaScrollV}from"../ui";
import{DonutChart}from"../ui/DonutChart";
import{MESES,TIPOS_COSTO,CENTROS,CENTRO_COL,CENTRO_BG}from"../../data/constants";
import{fmtCOP,today,genId}from"../../lib/format";
import{mesDe}from"../../lib/dates";
export function Costos({costos,setCostos}){
  const [modal,setModal]=useState(false);const [editId,setEditId]=useState(null);const [form,setForm]=useState({fecha:today(),mes:MESES[new Date().getMonth()],tipo:TIPOS_COSTO[0],descripcion:"",valor:"",centro:CENTROS[0]});const [fil,setFil]=useState("todos");
  const [busquedaH,setBusquedaH]=useState("");const [filtroMesH,setFiltroMesH]=useState("");const [filtroCentroH,setFiltroCentroH]=useState("");
  const blankFormC=()=>({fecha:today(),mes:MESES[new Date().getMonth()],tipo:TIPOS_COSTO[0],descripcion:"",valor:"",centro:CENTROS[0]});
  const abrirNuevoC=()=>{setEditId(null);setForm(blankFormC());setModal(true);};
  const abrirEditarC=(c)=>{setEditId(c.id);setForm({fecha:c.fecha,mes:c.mes,tipo:c.tipo,descripcion:c.descripcion,valor:c.valor,centro:c.centro});setModal(true);};
  const eliminarC=(id)=>{
    if(!window.confirm("¿Eliminar este registro de costo? Esta acción no se puede deshacer."))return;
    setCostos(p=>p.filter(c=>c.id!==id));
  };
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
  const costosHFiltrados=costos.filter(c=>{
    if(filtroMesH&&c.mes!==filtroMesH)return false;
    if(filtroCentroH&&c.centro!==filtroCentroH)return false;
    if(busquedaH){const q=busquedaH.toLowerCase();if(!c.descripcion.toLowerCase().includes(q)&&!(c.tipo||"").toLowerCase().includes(q))return false;}
    return true;
  });
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}><div><div style={{color:C.orange,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>MODULO COSTOS</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Registro de Costos Operativos</div></div><button style={S.btn} onClick={abrirNuevoC}>+ Nuevo Costo</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}><KPI label="Total Costos" value={fmtCOP(costos.reduce((s,c)=>s+c.valor,0))} col={C.red} icon="🧾" autoFit/><KPI label="Central Beneficio" value={fmtCOP(porC["Central de Beneficio"]||0)} col={C.teal} icon="🏭" autoFit/><KPI label="Trilladora" value={fmtCOP(porC["Trilladora"]||0)} col={C.purple} icon="⚙️" autoFit/><KPI label="Tostado" value={fmtCOP(porC["Tostado"]||0)} col={C.orange} icon="☕" autoFit/><KPI label="Maquila" value={fmtCOP(porC["Maquila"]||0)} col={C.gold} icon="🔄" autoFit/><KPI label="Bodega Cafe Fino" value={fmtCOP(porC["Bodega Cafe Fino"]||0)} col={C.green} icon="📦" autoFit/><KPI label="Registros" value={costos.length} col={C.accent} icon="📋" autoFit/></div>
    <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16,marginBottom:16}}>
      <div style={S.card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}><div style={{fontWeight:600,fontSize:14,color:C.navy}}>Costos por Tipo</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{["todos",...CENTROS].map(c=>(<button key={c} style={{...S.btnG,background:fil===c?C.navy:"transparent",color:fil===c?C.white:C.textDim,fontSize:11,padding:"4px 10px"}} onClick={()=>setFil(c)}>{c==="todos"?"Todos":c}</button>))}</div></div>
        {Object.entries(porT).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>{const p=total?val/total*100:0;return(<div key={tipo} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:C.text}}>{tipo}</span><span style={{color:C.orange,fontWeight:600,fontSize:12}}>{fmtCOP(val)}</span></div><div style={{background:C.bg,borderRadius:4,height:8,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:C.orange,width:p+"%",height:"100%",borderRadius:4}}/></div></div>);})}
        <div style={{borderTop:"2px solid "+C.border,paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between"}}><span style={{color:C.navy,fontWeight:700}}>TOTAL</span><span style={{color:C.navy,fontSize:15,fontWeight:700}}>{fmtCOP(total)}</span></div>
      </div>
      <div style={S.card}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:14}}>Por Centro de Costo</div>
        <DonutChart
          data={CENTROS.map(cc=>({centro:cc,valor:porC[cc]||0}))}
          labelKey="centro"
          valueKey="valor"
          colorKey={null}
          colors={CENTROS.map(cc=>CENTRO_COL[cc]||C.teal)}
          centerLabel="total costos"
        />
      </div>
    </div>
    <div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
      <input style={{...S.input,flex:1,minWidth:180}} placeholder="Buscar por descripcion o tipo..." value={busquedaH} onChange={e=>setBusquedaH(e.target.value)}/>
      <select style={{...S.select,width:150}} value={filtroMesH} onChange={e=>setFiltroMesH(e.target.value)}><option value="">Todos los meses</option>{MESES.map(m=>(<option key={m}>{m}</option>))}</select>
      <select style={{...S.select,width:180}} value={filtroCentroH} onChange={e=>setFiltroCentroH(e.target.value)}><option value="">Todos los centros</option>{CENTROS.map(c=>(<option key={c}>{c}</option>))}</select>
      {(filtroMesH||filtroCentroH||busquedaH)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMesH("");setFiltroCentroH("");setBusquedaH("");}}>✕ Limpiar</button>}
      <span style={{color:C.textFaint,fontSize:12,alignSelf:"center"}}>{costosHFiltrados.length} de {costos.length} registros</span>
    </div>
    {(filtroMesH||filtroCentroH||busquedaH)&&(()=>{
      const sumFiltrado=costosHFiltrados.reduce((s,c)=>s+c.valor,0);
      return(<div style={{...S.card,display:"flex",gap:24,alignItems:"center",background:C.tealBg||C.bg}}>
        <div><div style={{fontSize:11,color:C.textDim,textTransform:"uppercase"}}>Suma de los filtrados</div><div style={{fontSize:18,fontWeight:700,color:C.navy}}>{fmtCOP(sumFiltrado)}</div></div>
      </div>);
    })()}
    <div style={S.card}><div style={{fontWeight:600,fontSize:13,color:C.navy,marginBottom:14}}>Historial</div><TablaScrollV minWidth={700}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr>{["Fecha","Mes","Tipo","Descripcion","Centro","Valor",""].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{costosHFiltrados.map(c=>(<tr key={c.id}><td style={{...S.td,color:C.textDim}}>{c.fecha}</td><td style={{...S.td,color:C.textDim,textTransform:"capitalize"}}>{c.mes}</td><td style={S.td}><Bdg label={c.tipo} col={C.orange} bg={C.orangeBg}/></td><td style={{...S.td,color:C.text}}>{c.descripcion}</td><td style={S.td}><Bdg label={c.centro} col={CENTRO_COL[c.centro]||C.teal} bg={CENTRO_BG[c.centro]||C.tealBg}/></td><td style={{...S.td,color:C.orange,fontWeight:700,textAlign:"right"}}>{fmtCOP(c.valor)}</td><td style={S.td}><button style={S.btnG} onClick={()=>abrirEditarC(c)}>Editar</button><button style={{...S.btnG,color:C.red,borderColor:C.red+"40",marginLeft:6}} onClick={()=>eliminarC(c.id)}>Eliminar</button></td></tr>))}</tbody></table></TablaScrollV></div>
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
