import{useState,useEffect,useCallback}from"react";
import{collection,query,where,orderBy,limit,startAfter,getDocs}from"firebase/firestore";
import{db}from"../../firebase";
import{C,S}from"../../theme";
import{TablaScrollV,Bdg}from"../ui";

const PAGE_SIZE=100;
const DIAS_INICIAL=6;

const COLECCION_LABEL={
  lotes:"Bodega Milán / Trilla / Bodega Trilladora",
  blends:"Blend",
  lotesFino:"Bodega Café Fino / Trilladora Café Fino",
  blendsFino:"Blend Café Fino",
  maquilas:"Maquila",
  blendsTostado:"UBA Tostado (Tueste)",
  empaques:"UBA Tostado (Empaque)",
  tiposEmpaque:"UBA Tostado (Tipos de Empaque)",
  necesidadesTostado:"UBA Tostado (Necesidades)",
  costos:"Reg. Costos",
  oportunidades:"CRM",
  pedidos:"Pedidos",
  subprodVerde:"Subproductos Verde",
  subprodPerg:"Subproductos Pergamino",
  usuarios:"Usuarios",
  inventariosMensuales:"Inventario Mensual",
};

const ACCION_COL={crear:C.green,editar:C.gold,eliminar:C.red};
const ACCION_BG={crear:C.greenBg,editar:C.goldBg,eliminar:C.redBg};
const ACCION_LABEL={crear:"Creó",editar:"Editó",eliminar:"Eliminó"};

export function Bitacora(){
  const[registros,setRegistros]=useState([]);
  const[cargando,setCargando]=useState(true);
  const[cargandoMas,setCargandoMas]=useState(false);
  const[ultimoDoc,setUltimoDoc]=useState(null);
  const[hayMas,setHayMas]=useState(true);
  const[filtroUsuario,setFiltroUsuario]=useState("");
  const[filtroModulo,setFiltroModulo]=useState("");

  const cargarInicial=useCallback(async()=>{
    setCargando(true);
    const hace6Dias=new Date();
    hace6Dias.setDate(hace6Dias.getDate()-DIAS_INICIAL);
    try{
      const q=query(collection(db,"bitacora_actividad"),where("fecha",">=",hace6Dias.toISOString()),orderBy("fecha","desc"),limit(PAGE_SIZE));
      const snap=await getDocs(q);
      const docs=snap.docs.map(d=>d.data());
      setRegistros(docs);
      setUltimoDoc(snap.docs[snap.docs.length-1]||null);
      setHayMas(snap.docs.length===PAGE_SIZE);
    }catch(e){console.error("Error cargando bitacora:",e);}
    setCargando(false);
  },[]);

  useEffect(()=>{cargarInicial();},[cargarInicial]);

  const cargarMas=async()=>{
    if(!ultimoDoc)return;
    setCargandoMas(true);
    try{
      const q=query(collection(db,"bitacora_actividad"),orderBy("fecha","desc"),startAfter(ultimoDoc),limit(PAGE_SIZE));
      const snap=await getDocs(q);
      const docs=snap.docs.map(d=>d.data());
      setRegistros(p=>[...p,...docs]);
      setUltimoDoc(snap.docs[snap.docs.length-1]||null);
      setHayMas(snap.docs.length===PAGE_SIZE);
    }catch(e){console.error("Error cargando mas de bitacora:",e);}
    setCargandoMas(false);
  };

  const usuarios=[...new Set(registros.map(r=>r.usuario))].filter(Boolean).sort();
  const modulos=[...new Set(registros.map(r=>r.coleccion))].filter(Boolean).sort();

  const filtrados=registros.filter(r=>
    (!filtroUsuario||r.usuario===filtroUsuario)&&
    (!filtroModulo||r.coleccion===filtroModulo)
  );

  return(<div>
    <div style={{marginBottom:22}}>
      <div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>AUDITORÍA</div>
      <div style={{color:C.navy,fontSize:22,fontWeight:700}}>Bitácora de Actividad</div>
      <div style={{color:C.textDim,fontSize:12,marginTop:4}}>Mostrando los últimos {DIAS_INICIAL} días — usa "Cargar más" para ver registros anteriores</div>
    </div>

    <div style={{...S.card,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
      <select style={{...S.select,width:220}} value={filtroUsuario} onChange={e=>setFiltroUsuario(e.target.value)}>
        <option value="">Todos los usuarios</option>
        {usuarios.map(u=>(<option key={u} value={u}>{u}</option>))}
      </select>
      <select style={{...S.select,width:260}} value={filtroModulo} onChange={e=>setFiltroModulo(e.target.value)}>
        <option value="">Todos los módulos</option>
        {modulos.map(m=>(<option key={m} value={m}>{COLECCION_LABEL[m]||m}</option>))}
      </select>
      {(filtroUsuario||filtroModulo)&&<button style={{...S.btnG,color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroUsuario("");setFiltroModulo("");}}>✕ Limpiar</button>}
    </div>

    <div style={S.card}>
      {cargando?(
        <div style={{color:C.textFaint,fontSize:13,padding:20,textAlign:"center"}}>Cargando actividad reciente...</div>
      ):(<>
        <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead><tr>{["Fecha y Hora","Usuario","Acción","Módulo","Documento"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
          <tbody>{filtrados.map(r=>(<tr key={r.id}>
            <td style={{...S.td,color:C.textDim,fontSize:12}}>{r.fecha?new Date(r.fecha).toLocaleString("es-CO"):"—"}</td>
            <td style={{...S.td,fontWeight:600}}>{r.usuario}</td>
            <td style={S.td}><Bdg label={ACCION_LABEL[r.accion]||r.accion} col={ACCION_COL[r.accion]||C.textDim} bg={ACCION_BG[r.accion]||C.panel2}/></td>
            <td style={S.td}>{COLECCION_LABEL[r.coleccion]||r.coleccion}</td>
            <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:C.textFaint}}>{r.documentoId}</td>
          </tr>))}</tbody>
        </table></TablaScrollV>
        {filtrados.length===0&&<div style={{color:C.textFaint,fontSize:13,padding:20,textAlign:"center"}}>Sin actividad registrada en este periodo.</div>}
        {hayMas&&(
          <div style={{textAlign:"center",marginTop:16}}>
            <button style={S.btnG} onClick={cargarMas} disabled={cargandoMas}>{cargandoMas?"Cargando...":"Cargar más"}</button>
          </div>
        )}
      </>)}
    </div>
  </div>);
}
