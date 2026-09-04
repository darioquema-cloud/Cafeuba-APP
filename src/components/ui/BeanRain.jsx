import{useEffect,useRef}from"react";

const COLS=40;

function drawBean(ctx,x,y,size,rotation){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0,0,size*0.55,size,0,0,Math.PI*2);
  ctx.fillStyle="#A8B87A";
  ctx.fill();
  ctx.strokeStyle="#7A8A52";
  ctx.lineWidth=0.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0,-size*0.85);
  ctx.quadraticCurveTo(size*0.35,0,0,size*0.85);
  ctx.strokeStyle="#5C6B3C";
  ctx.lineWidth=1;
  ctx.stroke();
  ctx.restore();
}

export function BeanRain({active}){
  const canvasRef=useRef(null);
  const stateRef=useRef({falling:[],settled:[],heightMap:null,raf:null});

  useEffect(()=>{
    if(!active)return;
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const resize=()=>{
      const parent=canvas.parentElement;
      canvas.width=parent.clientWidth;
      canvas.height=parent.clientHeight;
      stateRef.current.heightMap=new Array(COLS).fill(0);
    };
    resize();
    window.addEventListener("resize",resize);

    const spawn=()=>{
      const size=6+Math.random()*5;
      stateRef.current.falling.push({
        x:Math.random()*canvas.width,y:-20,
        vy:2+Math.random()*2,size,
        rotation:Math.random()*Math.PI*2,
        vRotation:(Math.random()-0.5)*0.15
      });
    };
    const spawnTimer=setInterval(spawn,90);
    for(let i=0;i<15;i++)setTimeout(spawn,i*50);

    const loop=()=>{
      const{falling,settled,heightMap}=stateRef.current;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const colW=canvas.width/COLS;

      for(let i=falling.length-1;i>=0;i--){
        const b=falling[i];
        b.y+=b.vy;
        b.rotation+=b.vRotation;
        const col=Math.min(COLS-1,Math.max(0,Math.floor(b.x/colW)));
        const floorY=canvas.height-heightMap[col];
        if(b.y+b.size>=floorY){
          b.y=floorY-b.size;
          settled.push({x:b.x,y:b.y,size:b.size,rotation:b.rotation});
          heightMap[col]+=b.size*1.1;
          if(col>0)heightMap[col-1]=Math.max(heightMap[col-1],heightMap[col]*0.4);
          if(col<COLS-1)heightMap[col+1]=Math.max(heightMap[col+1],heightMap[col]*0.4);
          falling.splice(i,1);
        }
      }

      settled.forEach(b=>drawBean(ctx,b.x,b.y,b.size,b.rotation));
      falling.forEach(b=>drawBean(ctx,b.x,b.y,b.size,b.rotation));

      if(settled.length>400)stateRef.current.settled=settled.slice(settled.length-400);

      stateRef.current.raf=requestAnimationFrame(loop);
    };
    stateRef.current.raf=requestAnimationFrame(loop);

    return()=>{
      clearInterval(spawnTimer);
      cancelAnimationFrame(stateRef.current.raf);
      window.removeEventListener("resize",resize);
    };
  },[active]);

  return<canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}
