import{useState}from"react";
import{C,S}from"../../theme";
import{auth}from"../../firebase";
import{signInWithPopup,GoogleAuthProvider,signInWithEmailAndPassword,sendPasswordResetEmail}from"firebase/auth";
export function LoginForm({notAuthorized}){
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");const [resetMode,setResetMode]=useState(false);const [resetSent,setResetSent]=useState(false);
  const MSGS={"auth/user-not-found":"Correo no registrado.","auth/wrong-password":"Contraseña incorrecta.","auth/invalid-credential":"Correo o contraseña incorrectos.","auth/too-many-requests":"Demasiados intentos. Espera unos minutos."};
  const login=async()=>{if(!email||!pass){setErr("Ingresa correo y contraseña.");return;}setLoading(true);setErr("");try{await signInWithEmailAndPassword(auth,email,pass);}catch(e){setErr(MSGS[e.code]||"Error al iniciar sesion.");setLoading(false);}};
  const loginGoogle=async()=>{setLoading(true);setErr("");try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){if(e.code!=="auth/popup-closed-by-user")setErr("Error con Google.");setLoading(false);}};
  const forgot=async()=>{if(!email){setErr("Ingresa tu correo primero.");return;}setLoading(true);setErr("");try{await sendPasswordResetEmail(auth,email);setResetSent(true);}catch(e){setErr("No encontramos ese correo.");}setLoading(false);};
  const panelLeft=(<div style={{width:"50%",background:"linear-gradient(145deg,#1E3A5F 0%,#2D5F8A 50%,#0E7490 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48}}><div style={{textAlign:"center",maxWidth:380}}><div style={{width:220,height:220,borderRadius:"50%",background:C.white,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 32px",boxShadow:"0 16px 48px rgba(0,0,0,0.3)",padding:22}}><img src="/logo-cafeuba.png" alt="CafeUba" style={{width:"100%",height:"100%",objectFit:"contain"}}/></div><div style={{color:"rgba(255,255,255,0.8)",fontSize:14,marginBottom:36,lineHeight:1.7,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600}}>Central de Beneficio<br/>Plan Milan</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["&#127807;","Recepcion"],["&#9881;","Proceso"],["&#9728;","Secado"],["&#9989;","Trilla"]].map(([ic,lb])=>(<div key={lb} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.15)"}}><span dangerouslySetInnerHTML={{__html:ic}} style={{fontSize:20}}/><div style={{color:"rgba(255,255,255,0.85)",fontSize:12,marginTop:5,fontWeight:500}}>{lb}</div></div>))}</div></div></div>);
  return(<div style={{...S.app,display:"flex",minHeight:"100vh"}}>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    {panelLeft}
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:48,background:C.bg}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{marginBottom:28}}><div style={{color:C.navy,fontSize:26,fontWeight:700,marginBottom:5}}>Bienvenido</div><div style={{color:C.textDim,fontSize:13}}>{resetMode?"Recuperar contraseña":"Ingresa a la plataforma de operaciones"}</div></div>
        <div style={{...S.card,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
          {notAuthorized&&<div style={{color:C.red,fontSize:12,marginBottom:16,padding:"10px 12px",background:C.redBg,borderRadius:6}}>Tu cuenta no tiene acceso. Pide al administrador que te agregue en la seccion Usuarios.</div>}
          {err&&<div style={{color:C.red,fontSize:12,marginBottom:12,padding:"10px 12px",background:C.redBg,borderRadius:6}}>{err}</div>}
          {resetSent?(<div style={{color:C.green,fontSize:13,padding:"14px",background:C.greenBg,borderRadius:6,textAlign:"center",lineHeight:1.6}}>✓ Revisa tu correo.<br/>Te enviamos un enlace para crear tu contraseña.<br/><button style={{...S.btnG,marginTop:12,width:"100%"}} onClick={()=>{setResetSent(false);setResetMode(false);}}>Volver al inicio</button></div>):(<>
            <div style={{marginBottom:12}}><label style={S.lbl}>Correo electronico</label><input style={S.input} type="email" placeholder="tu@correo.com" value={email} onChange={e=>setEmail(e.target.value.toLowerCase())} onKeyDown={e=>e.key==="Enter"&&!resetMode&&login()}/></div>
            {!resetMode&&<div style={{marginBottom:6}}><label style={S.lbl}>Contraseña</label><input style={S.input} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}/></div>}
            {!resetMode&&<div style={{textAlign:"right",marginBottom:14}}><button style={{background:"none",border:"none",color:C.accent,fontSize:12,cursor:"pointer",padding:0}} onClick={()=>{setResetMode(true);setErr("");}}>¿Olvidaste tu contraseña?</button></div>}
            {resetMode?(<><button style={{...S.btn,width:"100%",marginBottom:8}} onClick={forgot} disabled={loading}>{loading?"Enviando...":"Enviar enlace de acceso"}</button><button style={{...S.btnG,width:"100%",textAlign:"center"}} onClick={()=>{setResetMode(false);setErr("");}}>Volver</button></>):(<>
              <button style={{...S.btn,width:"100%",marginBottom:14}} onClick={login} disabled={loading}>{loading?"Iniciando...":"Iniciar sesion"}</button>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{flex:1,height:1,background:C.border}}/><span style={{color:C.textFaint,fontSize:11}}>o</span><div style={{flex:1,height:1,background:C.border}}/></div>
              <button style={{background:C.white,border:"1px solid #dadce0",borderRadius:8,color:"#3c4043",cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:500,gap:10,padding:"10px 20px",width:"100%",opacity:loading?0.7:1}} onClick={loginGoogle} disabled={loading}><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continuar con Google</button>
            </>)}
          </>)}
        </div>
      </div>
    </div>
  </div>);
}
