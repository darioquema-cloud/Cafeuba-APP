import{useState}from"react";
import{C,S}from"../../theme";
import{KPI,Fld,Modal,Bdg}from"../ui";
import{fmt,fmtCOP,numVal,today,genId,fmtFecha}from"../../lib/format";

const ETAPAS=[
  {key:"prospecto",label:"Prospecto",col:C.gray},
  {key:"muestra",label:"Muestra Enviada",col:C.teal},
  {key:"cotizacion",label:"Cotización",col:C.accent},
  {key:"negociacion",label:"Negociación",col:C.orange},
  {key:"ganado",label:"Ganado",col:C.green},
];

const fechaUltimaEtapa=(op)=>{
  const h=op.historial_etapas||[];
  return h.length?h[h.length-1].fecha:op.fecha_registro;
};

export function Pipeline({oportunidades,setOportunidades,user}){
  const [tab,setTab]=useState("tablero");
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [cliente,setCliente]=useState("");
  const [productoInteres,setProductoInteres]=useState("");
  const [kgEstimado,setKgEstimado]=useState("");
  const [valorEstimado,setValorEstimado]=useState("");
  const [notas,setNotas]=useState("");
  const [err,setErr]=useState("");
  const [perderId,setPerderId]=useState(null);
  const [motivo,setMotivo]=useState("");
  const [errPerder,setErrPerder]=useState("");

  const activas=oportunidades.filter(o=>o.etapa!=="perdido");
  const perdidas=oportunidades.filter(o=>o.etapa==="perdido").sort((a,b)=>fechaUltimaEtapa(b).localeCompare(fechaUltimaEtapa(a)));

  const valorTotalPipeline=activas.reduce((s,o)=>s+(o.valor_estimado||0),0);
  const mesActual=today().slice(0,7);
  const perdidasEsteMes=perdidas.filter(o=>fechaUltimaEtapa(o).slice(0,7)===mesActual).length;

  const abrirNuevo=()=>{
    setEditId(null);setCliente("");setProductoInteres("");setKgEstimado("");setValorEstimado("");setNotas("");setErr("");setModal(true);
  };
  const abrirEditar=(op)=>{
    setEditId(op.id);setCliente(op.cliente);setProductoInteres(op.producto_interes);
    setKgEstimado(op.kg_estimado||"");setValorEstimado(op.valor_estimado||"");setNotas(op.notas||"");setErr("");setModal(true);
  };

  const guardar=()=>{
    if(!cliente.trim()){setErr("Ingresa el nombre del cliente.");return;}
    if(!productoInteres.trim()){setErr("Ingresa el producto de interes.");return;}
    if(editId){
      setOportunidades(list=>list.map(o=>o.id===editId?{...o,cliente:cliente.trim(),producto_interes:productoInteres.trim(),kg_estimado:numVal(kgEstimado),valor_estimado:numVal(valorEstimado),notas}:o));
    }else{
      const nueva={
        id:genId(),fecha_registro:today(),cliente:cliente.trim(),producto_interes:productoInteres.trim(),
        kg_estimado:numVal(kgEstimado),valor_estimado:numVal(valorEstimado),
        etapa:"prospecto",motivo_perdida:"",notas,
        usuario_registro:user?.nombre||user?.email||"",
        historial_etapas:[{etapa:"prospecto",fecha:today()}],
      };
      setOportunidades(list=>[nueva,...list]);
    }
    setModal(false);
  };

  const avanzar=(op)=>{
    const idx=ETAPAS.findIndex(e=>e.key===op.etapa);
    if(idx<0||idx>=ETAPAS.length-1)return;
    const siguiente=ETAPAS[idx+1].key;
    setOportunidades(list=>list.map(o=>o.id===op.id?{...o,etapa:siguiente,historial_etapas:[...(o.historial_etapas||[]),{etapa:siguiente,fecha:today()}]}:o));
  };

  const abrirPerder=(id)=>{setPerderId(id);setMotivo("");setErrPerder("");};
  const confirmarPerdida=()=>{
    if(!motivo.trim()){setErrPerder("Ingresa el motivo de la perdida.");return;}
    setOportunidades(list=>list.map(o=>o.id===perderId?{...o,etapa:"perdido",motivo_perdida:motivo.trim(),historial_etapas:[...(o.historial_etapas||[]),{etapa:"perdido",fecha:today()}]}:o));
    setPerderId(null);
  };

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{color:C.accent,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>COMERCIAL</div>
        <div style={{color:C.navy,fontSize:22,fontWeight:700}}>CRM - Embudo de Oportunidades</div>
        <div style={{color:C.textDim,fontSize:12,marginTop:2}}>Embudo de oportunidades comerciales — avance manual por etapas</div>
      </div>
      <button style={S.btn} onClick={abrirNuevo}>+ Nueva Oportunidad</button>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      {ETAPAS.map(e=>(<KPI key={e.key} label={e.label} value={activas.filter(o=>o.etapa===e.key).length} col={e.col}/>))}
      <KPI label="Valor Total en Pipeline" value={fmtCOP(valorTotalPipeline)} col={C.gold}/>
      <KPI label="Perdidas Este Mes" value={perdidasEsteMes} col={C.red}/>
    </div>

    <div style={{display:"flex",gap:8,marginBottom:16}}>
      <button style={tab==="tablero"?S.btn:S.btnG} onClick={()=>setTab("tablero")}>Tablero</button>
      <button style={tab==="perdidas"?S.btn:S.btnG} onClick={()=>setTab("perdidas")}>Perdidas ({perdidas.length})</button>
    </div>

    {tab==="tablero"&&(
      <div style={{overflowX:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(220px,1fr))",gap:14,alignItems:"start",minWidth:1100}}>
          {ETAPAS.map(e=>{
            const ops=activas.filter(o=>o.etapa===e.key).sort((a,b)=>b.fecha_registro.localeCompare(a.fecha_registro));
            return(<div key={e.key}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontWeight:700,fontSize:12,color:e.col,textTransform:"uppercase",letterSpacing:.5}}>{e.label}</span>
                <Bdg label={ops.length} col={e.col}/>
              </div>
              {ops.map(op=>(<div key={op.id} style={{...S.card,padding:14,marginBottom:10}}>
                <div style={{fontWeight:700,fontSize:13,color:C.navy,marginBottom:4}}>{op.cliente}</div>
                <div style={{color:C.textDim,fontSize:12,marginBottom:8}}>{op.producto_interes}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:10}}>
                  <span style={{color:C.textDim}}>{op.kg_estimado>0?fmt(op.kg_estimado)+" kg":"—"}</span>
                  <span style={{color:C.gold,fontWeight:700}}>{op.valor_estimado>0?fmtCOP(op.valor_estimado):"—"}</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  <button style={{...S.btnG,fontSize:11,padding:"5px 10px"}} onClick={()=>abrirEditar(op)}>Editar</button>
                  {e.key!=="ganado"&&(<button style={{...S.btnG,fontSize:11,padding:"5px 10px",color:C.accent,borderColor:C.accent+"40"}} onClick={()=>avanzar(op)}>Avanzar a {ETAPAS[ETAPAS.findIndex(x=>x.key===e.key)+1].label} →</button>)}
                  <button style={{...S.btnG,fontSize:11,padding:"5px 10px",color:C.red,borderColor:C.red+"40"}} onClick={()=>abrirPerder(op.id)}>Marcar Perdida</button>
                </div>
              </div>))}
              {ops.length===0&&<div style={{color:C.textFaint,fontSize:12,padding:"8px 2px"}}>Sin oportunidades</div>}
            </div>);
          })}
        </div>
      </div>
    )}

    {tab==="perdidas"&&(
      <div style={S.card}>
        <div style={{fontWeight:600,fontSize:14,color:C.navy,marginBottom:16}}>Oportunidades Perdidas</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
          {["Cliente","Producto","Valor Estimado","Motivo","Fecha"].map(h=>(<th key={h} style={S.th}>{h}</th>))}
        </tr></thead>
        <tbody>{perdidas.map(op=>(<tr key={op.id}>
          <td style={{...S.td,fontWeight:600}}>{op.cliente}</td>
          <td style={S.td}>{op.producto_interes}</td>
          <td style={{...S.td,color:C.gold,fontWeight:700}}>{op.valor_estimado>0?fmtCOP(op.valor_estimado):"—"}</td>
          <td style={{...S.td,color:C.red}}>{op.motivo_perdida||"—"}</td>
          <td style={{...S.td,color:C.textDim}}>{fmtFecha(fechaUltimaEtapa(op))}</td>
        </tr>))}</tbody></table>
        {perdidas.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:12}}>Sin oportunidades perdidas todavia.</div>}
      </div>
    )}

    {modal&&(<Modal title={editId?"Editar Oportunidad":"Nueva Oportunidad"} onClose={()=>setModal(false)}>
      {err&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {err}</div>)}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0 12px"}}>
        <Fld label="Cliente" half><input style={S.input} value={cliente} onChange={e=>setCliente(e.target.value)}/></Fld>
        <Fld label="Producto de Interes" half><input style={S.input} value={productoInteres} onChange={e=>setProductoInteres(e.target.value)}/></Fld>
        <Fld label="Kg Estimado" half><input style={S.input} type="number" value={kgEstimado} onChange={e=>setKgEstimado(e.target.value)}/></Fld>
        <Fld label="Valor Estimado (opcional)" half><input style={S.input} type="number" value={valorEstimado} onChange={e=>setValorEstimado(e.target.value)}/></Fld>
        <Fld label="Notas"><textarea style={{...S.input,minHeight:55,resize:"vertical"}} value={notas} onChange={e=>setNotas(e.target.value)}/></Fld>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button style={S.btnG} onClick={()=>setModal(false)}>Cancelar</button>
        <button style={S.btn} onClick={guardar}>{editId?"Guardar Cambios":"Guardar Oportunidad"}</button>
      </div>
    </Modal>)}

    {perderId&&(<Modal title="Marcar Oportunidad como Perdida" onClose={()=>setPerderId(null)}>
      {errPerder&&(<div style={{background:C.redBg,border:"1px solid "+C.red+"40",borderRadius:6,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:600,fontSize:13}}>&#9888; {errPerder}</div>)}
      <Fld label="Motivo de la perdida"><textarea style={{...S.input,minHeight:70,resize:"vertical"}} value={motivo} onChange={e=>setMotivo(e.target.value)}/></Fld>
      <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
        <button style={S.btnG} onClick={()=>setPerderId(null)}>Cancelar</button>
        <button style={{...S.btn,background:C.red}} onClick={confirmarPerdida}>Confirmar Perdida</button>
      </div>
    </Modal>)}
  </div>);
}
