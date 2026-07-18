import{useRef,useLayoutEffect}from"react";
export function TablaScrollV({children,minWidth,maxHeight=480,botStyle}){
  const contRef=useRef(null);
  const thumbRef=useRef(null);
  const trackRef=useRef(null);
  const drag=useRef(null);
  useLayoutEffect(()=>{
    const cont=contRef.current;const thumb=thumbRef.current;const track=trackRef.current;
    if(!cont||!thumb||!track)return;
    // Ocultar scrollbar nativo empujándolo fuera del clip del padre
    const sbw=cont.offsetWidth-cont.clientWidth;
    if(sbw>0)cont.style.width='calc(100% + '+sbw+'px)';
    const update=()=>{
      const can=cont.scrollHeight>cont.clientHeight;
      track.style.visibility=can?'visible':'hidden';
      if(!can)return;
      const ratio=cont.scrollTop/(cont.scrollHeight-cont.clientHeight);
      const trkH=track.clientHeight;
      const tmbH=Math.max(24,(cont.clientHeight/cont.scrollHeight)*trkH);
      thumb.style.height=tmbH+'px';
      thumb.style.top=(ratio*(trkH-tmbH))+'px';
    };
    cont.addEventListener('scroll',update);
    const ro=new ResizeObserver(update);ro.observe(cont);
    update();
    const onDown=(e)=>{drag.current={y:e.clientY,s:cont.scrollTop};e.preventDefault();};
    const onMove=(e)=>{if(!drag.current)return;const dy=e.clientY-drag.current.y;const trkH=track.clientHeight;const tmbH=thumb.clientHeight;cont.scrollTop=drag.current.s+(dy/(trkH-tmbH))*(cont.scrollHeight-cont.clientHeight);};
    const onUp=()=>{drag.current=null;};
    thumb.addEventListener('mousedown',onDown);
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
    return()=>{cont.removeEventListener('scroll',update);ro.disconnect();thumb.removeEventListener('mousedown',onDown);document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
  },[]);
  const mh=(botStyle&&botStyle.maxHeight)?botStyle.maxHeight:maxHeight;
  return(<div style={{display:'flex',alignItems:'stretch',gap:4}}>
    <div ref={trackRef} style={{width:8,flexShrink:0,borderRadius:4,background:'#e2e8f0',position:'relative',visibility:'hidden',minHeight:20}}>
      <div ref={thumbRef} style={{position:'absolute',left:0,right:0,top:0,height:0,background:'#94a3b8',borderRadius:4,cursor:'grab',userSelect:'none'}}/>
    </div>
    <div style={{flex:1,overflow:'hidden'}}>
      <div ref={contRef} style={{overflowX:'auto',overflowY:'scroll',maxHeight:mh}}>
        {children}
      </div>
    </div>
  </div>);
}
