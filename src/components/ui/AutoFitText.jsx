import{useRef,useLayoutEffect}from"react";
export function AutoFitText({text,minSize=9,style}){
  const ref=useRef(null);
  useLayoutEffect(()=>{
    const el=ref.current;if(!el||!el.parentElement)return;
    const par=el.parentElement;
    let size=13;el.style.fontSize=size+"px";
    const pad=(parseInt(getComputedStyle(par).paddingLeft)||0)+(parseInt(getComputedStyle(par).paddingRight)||0);
    const avail=Math.max(par.clientWidth-pad,30);
    let lo=minSize,hi=13;
    while(hi-lo>0.4){
      const mid=Math.round((lo+hi)/2*10)/10;
      el.style.fontSize=mid+"px";
      if(el.scrollWidth<=avail)lo=mid; else hi=mid;
    }
    el.style.fontSize=lo+"px";
  },[text]);
  return <span ref={ref} style={{display:"block",whiteSpace:"nowrap",overflow:"hidden",...(style||{})}}>{text??""}</span>;
}
