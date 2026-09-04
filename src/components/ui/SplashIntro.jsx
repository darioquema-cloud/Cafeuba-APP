import{useEffect,useState,useRef}from"react";
import{BeanRain}from"./BeanRain";

export function SplashIntro({kgVendidos,onContinue}){
  const [count,setCount]=useState(0);
  const [showButton,setShowButton]=useState(false);
  const [fadingOut,setFadingOut]=useState(false);
  const startedRef=useRef(false);

  useEffect(()=>{
    if(startedRef.current)return;
    startedRef.current=true;
    const dur=2200;
    const t0=performance.now();
    const tick=(now)=>{
      const p=Math.min((now-t0)/dur,1);
      const eased=1-Math.pow(1-p,3);
      setCount(Math.round(eased*kgVendidos));
      if(p<1)requestAnimationFrame(tick);
      else setTimeout(()=>setShowButton(true),300);
    };
    requestAnimationFrame(tick);
  },[kgVendidos]);

  const handleContinue=()=>{
    setFadingOut(true);
    setTimeout(onContinue,500);
  };

  return(
    <div style={{
      position:"fixed",inset:0,zIndex:9999,background:"#0B2540",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      opacity:fadingOut?0:1,transition:"opacity 0.5s ease",overflow:"hidden"
    }}>
      <BeanRain active={!fadingOut}/>
      <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
        <div style={{width:220,height:220,borderRadius:"50%",background:"#F4F0E6",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
          <img src="/logo-cafeuba.png" alt="CafeUba" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
        </div>
        <div style={{color:"#F4F0E6",fontSize:22,letterSpacing:6,fontWeight:600}}>CAFEUBA</div>
        <div style={{width:40,height:2,background:"#D4A537"}}/>
        <div style={{marginTop:10,textAlign:"center"}}>
          <div style={{color:"#D4A537",fontSize:56,fontWeight:700,lineHeight:1}}>{count.toLocaleString("es-CO")}</div>
          <div style={{color:"#9FB3C8",fontSize:12,letterSpacing:2,marginTop:8}}>KG VENDIDOS {new Date().getFullYear()}</div>
        </div>
        {showButton&&(
          <button onClick={handleContinue} style={{
            marginTop:24,background:"transparent",border:"1.5px solid #D4A537",color:"#D4A537",
            padding:"12px 40px",fontSize:13,letterSpacing:2,fontWeight:600,borderRadius:4,
            cursor:"pointer",animation:"fadeInBtn 0.4s ease"
          }}>ENTRAR</button>
        )}
      </div>
      <style>{`@keyframes fadeInBtn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
