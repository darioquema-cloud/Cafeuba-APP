import{useState}from"react";
import{C,S}from"../../theme";
import{Modal,Fld,Bdg,TablaScrollV}from"../ui";
import{PERMISOS_SEED}from"../../data/constants";
import{genId}from"../../lib/format";
import{auth,cfg}from"../../firebase";
import{sendPasswordResetEmail,createUserWithEmailAndPassword,getAuth as fbGetAuth}from"firebase/auth";
import{initializeApp as fbInitApp,deleteApp as fbDeleteApp}from"firebase/app";
const ROLES_SISTEMA=["Gerente Produccion","Gerente Financiero","Gerente Comercial","Gerente Administrativo","Analista de Calidad","Analista Calidad + Trilla","Operario Cafe Fino","Coordinador Tostado"];
const SECS_PERM=[
  {k:"dashboard",l:"Dashboard"},{k:"procesamiento",l:"Procesamiento"},{k:"bodega",l:"Bodega Milan"},
  {k:"trilla",l:"Trilla"},{k:"bodega_tri",l:"Bodega Trilladora"},{k:"blend",l:"Blend"},
  {k:"bodega_fino",l:"Bodega Cafe Fino"},{k:"trilladora_fino",l:"Trilladora CF"},{k:"bodega_tri_fino",l:"Bodega Tri. CF"},
  {k:"blend_fino",l:"Blend Cafe Fino"},{k:"maquila",l:"Maquila"},{k:"uba_tostado",l:"UBA Tostado"},
  {k:"ventas",l:"Ventas"},{k:"trazabilidad",l:"Trazabilidad"},{k:"costos",l:"Reg. Costos"},
  {k:"usuarios",l:"Usuarios"},{k:"carga_inicial",l:"Carga Inicial"},
];
const ROL_ABREV={"Gerente":"Gerente","Gerente Produccion":"G. Prod.","Gerente Financiero":"G. Fin.","Gerente Comercial":"G. Com.","Gerente Administrativo":"G. Admin.","Analista de Calidad":"A. Calidad","Analista Calidad + Trilla":"A.C.+Trilla","Operario Cafe Fino":"Op. CF","Coordinador Tostado":"Coord. Tost."};

export function Usuarios({usuarios,setUsuarios,permisosConfig,setPermisosConfig}){
  const [modal,setModal]=useState(false);const [editId,setEditId]=useState(null);const [form,setForm]=useState({nombre:"",email:"",rol:ROLES_SISTEMA[0]});const [err,setErr]=useState("");
  const [invLoading,setInvLoading]=useState(null);const [invMsgs,setInvMsgs]=useState({});
  const [tabU,setTabU]=useState("usuarios");
  const blankFormU=()=>({nombre:"",email:"",rol:ROLES_SISTEMA[0]});
  const abrirNuevoU=()=>{setEditId(null);setForm(blankFormU());setErr("");setModal(true);};
  const abrirEditarU=(u)=>{setEditId(u.id);setForm({nombre:u.nombre,email:u.email,rol:u.rol});setErr("");setModal(true);};
  const agregar=()=>{
    if(!form.nombre||!form.email){setErr("Nombre y correo son obligatorios.");return;}
    if(!form.email.includes("@")){setErr("Ingresa un correo valido.");return;}
    if(usuarios.some(u=>u.email?.toLowerCase()===form.email.toLowerCase()&&u.id!==editId)){setErr("Correo ya registrado.");return;}
    if(editId){setUsuarios(p=>p.map(u=>u.id===editId?{...u,...form}:u));}
    else{setUsuarios(p=>[...p,{...form,id:genId(),activo:true}]);}
    setModal(false);setErr("");setForm(blankFormU());
  };
  const invitar=async(u)=>{
    setInvLoading(u.id);setInvMsgs(p=>({...p,[u.id]:""}));
    try{
      const secApp=fbInitApp(cfg,"inv-"+Date.now());
      const secAuth=fbGetAuth(secApp);
      const tp=Math.random().toString(36).slice(-8)+"Aa1!";
      try{await createUserWithEmailAndPassword(secAuth,u.email,tp);}
      catch(e){
        if(e.code==="auth/email-already-in-use"){
          await fbDeleteApp(secApp);
          try{await sendPasswordResetEmail(auth,u.email);setInvMsgs(p=>({...p,[u.id]:"✓ Enlace enviado a "+u.email}));}
          catch(e2){setInvMsgs(p=>({...p,[u.id]:"Este correo usa Google. El usuario puede ingresar con Google directamente."}));}
          setInvLoading(null);return;
        }
        throw e;
      }
      await fbDeleteApp(secApp);
      await sendPasswordResetEmail(auth,u.email);
      setInvMsgs(p=>({...p,[u.id]:"✓ Invitacion enviada a "+u.email}));
    }catch(e){setInvMsgs(p=>({...p,[u.id]:"Error: "+(e.message||e.code)}));}
    setInvLoading(null);
  };
  const resetClave=async(u)=>{
    setInvLoading(u.id);setInvMsgs(p=>({...p,[u.id]:""}));
    try{await sendPasswordResetEmail(auth,u.email);setInvMsgs(p=>({...p,[u.id]:"✓ Email de reset enviado a "+u.email}));}
    catch(e){setInvMsgs(p=>({...p,[u.id]:"Error: "+(e.message||e.code)}));}
    setInvLoading(null);
  };

  const getEstado=(rol,sec)=>{
    const p=permisosConfig.find(x=>x.id===rol);
    if(!p||(p.views||[]).indexOf(sec)===-1)return 0;
    if((p.readOnly||[]).indexOf(sec)!==-1)return 1;
    return 2;
  };
  const ciclar=(rol,sec)=>{
    const sig=(getEstado(rol,sec)+1)%3;
    setPermisosConfig(prev=>prev.map(p=>{
      if(p.id!==rol)return p;
      let v=[...(p.views||[])],r=[...(p.readOnly||[])];
      if(sig===0){v=v.filter(x=>x!==sec);r=r.filter(x=>x!==sec);}
      else if(sig===1){if(!v.includes(sec))v=[...v,sec];if(!r.includes(sec))r=[...r,sec];}
      else{if(!v.includes(sec))v=[...v,sec];r=r.filter(x=>x!==sec);}
      return{...p,views:v,readOnly:r};
    }));
  };
  const resetRolPerm=(rol)=>{
    const def=PERMISOS_SEED.find(x=>x.id===rol);
    if(!def)return;
    setPermisosConfig(prev=>prev.map(p=>p.id===rol?{...p,views:[...def.views],readOnly:[...def.readOnly]}:p));
  };
  const ROLES_PERM=PERMISOS_SEED.map(p=>p.id);
  const ESTADO_META=[
    {label:"Sin acceso",bg:"transparent",border:C.border,color:C.textFaint,icon:"—"},
    {label:"Solo ver",bg:C.goldBg,border:C.gold+"60",color:C.gold,icon:"👁"},
    {label:"Acceso completo",bg:C.greenBg,border:C.green+"60",color:C.green,icon:"✓"},
  ];

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}><div><div style={{color:C.accent,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>GESTION DE ACCESO</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Usuarios del Sistema</div></div>{tabU==="usuarios"&&<button style={S.btn} onClick={abrirNuevoU}>+ Nuevo Usuario</button>}</div>
    <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid "+C.border}}>
      {[["usuarios","Usuarios"],["permisos","Permisos por Rol"]].map(([k,v])=>(<button key={k} onClick={()=>setTabU(k)} style={{padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:tabU===k?700:400,color:tabU===k?C.navy:C.textDim,background:"transparent",border:"none",borderBottom:tabU===k?"2px solid "+C.accent:"2px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
    </div>

    {tabU==="usuarios"&&(<>
      <div style={S.card}><TablaScrollV minWidth={700}><table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}><thead><tr>{["#","Nombre","Email","Rol","Estado","Acciones","Acceso"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead><tbody>{usuarios.map(u=>(<tr key={u.id}><td style={{...S.td,color:C.textFaint,fontSize:11}}>{u.id}</td><td style={{...S.td,fontWeight:600,color:C.navy}}>{u.nombre}</td><td style={{...S.td,color:C.textDim,fontSize:12}}>{u.email}</td><td style={S.td}><Bdg label={u.rol} col={C.accent} bg={C.accentBg}/></td><td style={S.td}><Bdg label={u.activo?"Activo":"Inactivo"} col={u.activo?C.green:C.red} bg={u.activo?C.greenBg:C.redBg}/></td><td style={S.td}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={S.btnG} onClick={()=>setUsuarios(p=>p.map(x=>x.id===u.id?{...x,activo:!x.activo}:x))}>{u.activo?"Desactivar":"Activar"}</button><button style={S.btnG} onClick={()=>abrirEditarU(u)}>Editar</button><button style={S.btnG} onClick={()=>resetClave(u)} disabled={invLoading===u.id}>Reset Clave</button></div></td><td style={S.td}><div style={{display:"flex",flexDirection:"column",gap:4,minWidth:100}}><button style={{background:C.green,border:"none",borderRadius:6,color:C.white,cursor:"pointer",fontSize:11,fontWeight:600,padding:"5px 10px",opacity:invLoading===u.id?0.6:1}} onClick={()=>invitar(u)} disabled={invLoading===u.id}>{invLoading===u.id?"Enviando...":"Invitar"}</button>{invMsgs[u.id]&&<div style={{color:invMsgs[u.id].startsWith("✓")?C.green:C.red,fontSize:10,lineHeight:1.3}}>{invMsgs[u.id]}</div>}</div></td></tr>))}</tbody></table></TablaScrollV></div>
    </>)}

    {tabU==="permisos"&&(<>
      <div style={{background:C.accentBg,border:"1px solid "+C.accent+"30",borderRadius:8,padding:"10px 16px",marginBottom:16,display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{fontSize:12,color:C.navy,fontWeight:600}}>Leyenda — haz clic en cada celda para cambiar el acceso:</div>
        {ESTADO_META.map(m=>(<div key={m.label} style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><div style={{width:28,height:24,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,border:"1px solid "+m.border,background:m.bg,color:m.color,fontWeight:700,fontSize:12}}>{m.icon}</div><span style={{color:C.textDim}}>{m.label}</span></div>))}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",minWidth:900,width:"100%"}}>
          <thead>
            <tr>
              <th style={{...S.th,textAlign:"left",position:"sticky",left:0,background:C.panel2,minWidth:150,zIndex:2}}>Seccion</th>
              {ROLES_PERM.map(rol=>(<th key={rol} style={{...S.th,minWidth:90,whiteSpace:"nowrap",padding:"6px 8px"}}><div title={rol} style={{fontSize:10,fontWeight:700,color:C.navy,textAlign:"center"}}>{ROL_ABREV[rol]||rol}</div></th>))}
            </tr>
          </thead>
          <tbody>
            {SECS_PERM.map((sec,si)=>(<tr key={sec.k} style={{background:si%2===0?C.panel2:C.panel}}>
              <td style={{...S.td,fontWeight:600,color:C.navy,fontSize:12,position:"sticky",left:0,background:si%2===0?C.panel2:C.panel,zIndex:1}}>{sec.l}</td>
              {ROLES_PERM.map(rol=>{
                const est=getEstado(rol,sec.k);
                const m=ESTADO_META[est];
                return(<td key={rol} style={{...S.td,textAlign:"center",padding:"4px 6px"}}>
                  <button onClick={()=>ciclar(rol,sec.k)} title={m.label} style={{width:32,height:28,display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:5,border:"1px solid "+m.border,background:m.bg,color:m.color,fontWeight:700,fontSize:13,cursor:"pointer",transition:"all 0.15s"}}>{m.icon}</button>
                </td>);
              })}
            </tr>))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:12,color:C.textDim}}>Restablecer rol a valores por defecto:</span>
        {ROLES_PERM.map(rol=>(<button key={rol} style={{...S.btnG,fontSize:11,padding:"5px 10px"}} onClick={()=>{if(window.confirm("¿Restaurar permisos por defecto para "+rol+"?"))resetRolPerm(rol);}}>↺ {ROL_ABREV[rol]||rol}</button>))}
      </div>
    </>)}

    {modal&&(<Modal title={editId?"Editar Usuario":"Nuevo Usuario"} onClose={()=>{setModal(false);setErr("");}}><div style={{color:C.textDim,fontSize:12,marginBottom:14,padding:"8px 12px",background:C.accentBg,borderRadius:6}}>Despues de agregar el usuario usa el boton "Invitar" para enviarle el correo de acceso a la plataforma.</div><Fld label="Nombre Completo"><input style={S.input} value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))}/></Fld><Fld label="Correo Electronico"><input style={S.input} type="email" placeholder="usuario@empresa.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value.toLowerCase()}))}/></Fld><Fld label="Rol del Sistema"><select style={S.select} value={form.rol} onChange={e=>setForm(p=>({...p,rol:e.target.value}))}>{ROLES_SISTEMA.map(r=>(<option key={r}>{r}</option>))}</select></Fld>{err&&<div style={{color:C.red,fontSize:12,marginBottom:10,padding:"8px 12px",background:C.redBg,borderRadius:4}}>{err}</div>}<div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><button style={S.btnG} onClick={()=>{setModal(false);setErr("");}}>Cancelar</button><button style={S.btn} onClick={agregar}>{editId?"Guardar Cambios":"Agregar Usuario"}</button></div></Modal>)}
  </div>);
}
