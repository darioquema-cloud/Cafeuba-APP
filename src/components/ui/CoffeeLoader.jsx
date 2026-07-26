import{useState,useEffect}from"react";
import{C}from"../../theme";
export function CoffeeLoader(){
  const [h,setH]=useState(0);
  useEffect(()=>{
    const id=setInterval(()=>setH(p=>(p+1.5)%100),70);
    return()=>clearInterval(id);
  },[]);
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
    <div style={{perspective:600}}>
      <div style={{position:"relative",width:100,height:110,transform:"rotateX(8deg)"}}>
        <div style={{position:"absolute",top:18,left:18,width:64,height:60,borderRadius:"0 0 30px 30px",background:"linear-gradient(135deg,"+C.panel+","+C.bg+")",border:"2px solid "+C.border2,overflow:"hidden",boxShadow:"inset -6px -4px 10px rgba(0,0,0,0.12)"}}>
          <div style={{position:"absolute",bottom:0,left:0,width:"100%",height:h+"%",background:"linear-gradient(180deg,#a3671b,#5c3a10)"}}/>
          <div style={{position:"absolute",top:4,left:6,width:10,height:40,background:"rgba(255,255,255,0.25)",borderRadius:6,transform:"rotate(8deg)"}}/>
        </div>
        <div style={{position:"absolute",top:14,left:14,width:72,height:14,borderRadius:"50%",border:"2px solid "+C.border2,background:C.bg}}/>
        <div style={{position:"absolute",top:38,left:78,width:22,height:28,border:"5px solid "+C.border2,borderLeft:"none",borderRadius:"0 14px 14px 0"}}/>
        <div style={{position:"absolute",bottom:6,left:4,width:92,height:10,borderRadius:"50%",background:C.bg,border:"2px solid "+C.border2}}/>
      </div>
    </div>
  </div>);
}
