import{useState,useMemo}from"react";
import{C,S,tg}from"../../theme";
import{MESES}from"../../data/constants";
import{fmtCOP,fmt}from"../../lib/format";
import{mesDe}from"../../lib/dates";
import{Bdg,TablaScrollV}from"../ui";
export function Ventas({lotes,lotesFino,blends,blendsFino}){
  const [tab,setTab]=useState("consolidado");
  const [filtroMes,setFiltroMes]=useState("todos");
  const [filtroTipo,setFiltroTipo]=useState("todos");
  const [busqueda,setBusqueda]=useState("");
  const [clienteSel,setClienteSel]=useState(null);

  const esExterno=s=>(!s.destino_key||s.destino_key===""||s.destino_key==="otro")&&!s.auto_blend;

  const todasVentas=useMemo(()=>[
    ...(lotes||[]).flatMap(l=>(l.salidas_bodega||[]).filter(esExterno).map(s=>({id:s.id,fecha:s.fecha||"",mes:mesDe(s.fecha)||l.mes||"",factura:s.factura||"",remision:s.remision||"",cliente:s.cliente||"Sin Cliente",producto:l.producto||"Sin Producto",tipo:"Pergamino",tipoKey:"pergamino",kg:s.peso_salida||0,valor_kg:s.valor_kg||0,valor_total:s.valor_total||0}))),
    ...(lotesFino||[]).filter(l=>!l.para_trilladora).flatMap(l=>(l.salidas_bodega||[]).filter(esExterno).map(s=>({id:s.id,fecha:s.fecha||"",mes:mesDe(s.fecha)||l.mes||"",factura:s.factura||"",remision:s.remision||"",cliente:s.cliente||"Sin Cliente",producto:l.producto||"Sin Producto",tipo:"Café Fino",tipoKey:"cf",kg:s.peso_salida||0,valor_kg:s.valor_kg||0,valor_total:s.valor_total||0}))),
    ...(blends||[]).flatMap(b=>(b.salidas||[]).filter(esExterno).map(s=>({id:s.id,fecha:s.fecha||"",mes:mesDe(s.fecha)||"",factura:s.factura||"",remision:s.remision||"",cliente:s.cliente||"Sin Cliente",producto:b.producto_comercial||b.nombre||"Sin Nombre",tipo:"Blend",tipoKey:"blend",kg:s.peso_salida||0,valor_kg:s.valor_kg||0,valor_total:s.valor_total||0}))),
    ...(blendsFino||[]).flatMap(b=>(b.salidas||[]).filter(esExterno).map(s=>({id:s.id,fecha:s.fecha||"",mes:mesDe(s.fecha)||"",factura:s.factura||"",remision:s.remision||"",cliente:s.cliente||"Sin Cliente",producto:b.producto_comercial||b.nombre||"Sin Nombre",tipo:"Blend CF",tipoKey:"blend_cf",kg:s.peso_salida||0,valor_kg:s.valor_kg||0,valor_total:s.valor_total||0}))),
  ].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")),[lotes,lotesFino,blends,blendsFino]);

  const mesesDisp=MESES.filter(m=>todasVentas.some(v=>v.mes===m));
  const tiposDisp=[...new Set(todasVentas.map(v=>v.tipo))];

  const ventasFilt=todasVentas.filter(v=>{
    if(filtroMes!=="todos"&&v.mes!==filtroMes)return false;
    if(filtroTipo!=="todos"&&v.tipo!==filtroTipo)return false;
    if(busqueda){const q=busqueda.toLowerCase();if(!v.cliente.toLowerCase().includes(q)&&!v.producto.toLowerCase().includes(q)&&!v.factura.toLowerCase().includes(q)&&!v.remision.toLowerCase().includes(q))return false;}
    return true;
  });

  const totalKg=ventasFilt.reduce((s,v)=>s+v.kg,0);
  const totalValor=ventasFilt.reduce((s,v)=>s+v.valor_total,0);
  const promKg=totalKg>0?totalValor/totalKg:0;
  const clientesUnicos=[...new Set(ventasFilt.map(v=>v.cliente).filter(c=>c&&c!=="Sin Cliente"))];

  const porCliente={};
  todasVentas.forEach(v=>{const c=v.cliente||"Sin Cliente";if(!porCliente[c])porCliente[c]={kg:0,valor:0,tx:0,meses:new Set(),tipos:new Set()};porCliente[c].kg+=v.kg;porCliente[c].valor+=v.valor_total;porCliente[c].tx++;porCliente[c].meses.add(v.mes);porCliente[c].tipos.add(v.tipo);});
  const clienteData=Object.entries(porCliente).sort((a,b)=>b[1].valor-a[1].valor).map(([cliente,d])=>({cliente,kg:d.kg,valor:d.valor,tx:d.tx,promKg:d.kg>0?d.valor/d.kg:0,meses:[...d.meses].filter(Boolean).length,tipos:[...d.tipos].join(", ")}));
  const maxValCliente=clienteData.length>0?clienteData[0].valor:1;

  const porMesGraf={};MESES.forEach(m=>{if(todasVentas.some(v=>v.mes===m))porMesGraf[m]={kg:0,valor:0};});
  todasVentas.forEach(v=>{if(v.mes&&porMesGraf[v.mes]){porMesGraf[v.mes].kg+=v.kg;porMesGraf[v.mes].valor+=v.valor_total;}});
  const mesesGraf=Object.entries(porMesGraf);
  const maxValMes=mesesGraf.reduce((m,[,d])=>Math.max(m,d.valor),1);

  const TIPO_COL={"Pergamino":C.teal,"Café Fino":C.green,"Blend":C.purple,"Blend CF":C.accent};
  const TIPO_BG={"Pergamino":C.tealBg,"Café Fino":C.greenBg,"Blend":C.purpleBg,"Blend CF":C.accentBg};
  const DCOL={trilla:C.teal,blend:C.purple,bodega_cf:C.green,trilla_cf:C.orange,blend_cf:C.accent,uba_tostado:C.gold};
  const DLABEL={trilla:"Trilla",blend:"Blend",bodega_cf:"Bodega CF",trilla_cf:"Trilladora CF",blend_cf:"Blend CF",uba_tostado:"UBA Tostado"};
  const OCOL={bodega_milan:C.navy,bodega_cf_src:"#0d9488",blend_src:C.purple,blend_cf_src:C.accent};
  const traslados=useMemo(()=>[
    ...(lotes||[]).flatMap(l=>(l.salidas_bodega||[]).filter(s=>s.destino_key&&s.destino_key!==""&&s.destino_key!=="otro").map(s=>({id:s.id,fecha:s.fecha||"",mes:mesDe(s.fecha)||l.mes||"",origenKey:"bodega_milan",origen:"Bodega Milan",destinoKey:s.destino_key,destino:DLABEL[s.destino_key]||s.destino_key,producto:l.producto||"Sin Producto",ref:l.codigo||"",kg:s.peso_salida||0}))),
    ...(lotesFino||[]).filter(l=>!l.para_trilladora).flatMap(l=>(l.salidas_bodega||[]).filter(s=>s.destino_key&&s.destino_key!==""&&s.destino_key!=="otro").map(s=>({id:s.id,fecha:s.fecha||"",mes:mesDe(s.fecha)||l.mes||"",origenKey:"bodega_cf_src",origen:"Bodega CF",destinoKey:s.destino_key,destino:DLABEL[s.destino_key]||s.destino_key,producto:l.producto||"Sin Producto",ref:l.codigo||"",kg:s.peso_salida||0}))),
    ...(blends||[]).flatMap(b=>(b.salidas||[]).filter(s=>s.destino_key&&s.destino_key!==""&&s.destino_key!=="otro").map(s=>({id:s.id,fecha:s.fecha||"",mes:mesDe(s.fecha)||"",origenKey:"blend_src",origen:"Blend",destinoKey:s.destino_key,destino:DLABEL[s.destino_key]||s.destino_key,producto:b.producto_comercial||b.nombre||"Sin Nombre",ref:b.codigo||"",kg:s.peso_salida||0}))),
    ...(blendsFino||[]).flatMap(b=>(b.salidas||[]).filter(s=>s.destino_key&&s.destino_key!==""&&s.destino_key!=="otro").map(s=>({id:s.id,fecha:s.fecha||"",mes:mesDe(s.fecha)||"",origenKey:"blend_cf_src",origen:"Blend CF",destinoKey:s.destino_key,destino:DLABEL[s.destino_key]||s.destino_key,producto:b.producto_comercial||b.nombre||"Sin Nombre",ref:b.codigo||"",kg:s.peso_salida||0}))),
  ].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")),[lotes,lotesFino,blends,blendsFino]);

  const histCliente=clienteSel?todasVentas.filter(v=>v.cliente===clienteSel).sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")):[];

  return(<div>
    <div style={{marginBottom:20}}>
      <div style={{color:C.textDim,fontSize:11,fontWeight:600,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PLAN MILAN</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Ventas</div><div style={{color:C.textDim,fontSize:12,marginTop:3}}>{todasVentas.length} transacciones · {[...new Set(todasVentas.map(v=>v.cliente).filter(c=>c&&c!=="Sin Cliente"))].length} clientes</div></div>
        <div style={{display:"flex",gap:6}}>
          {[["consolidado","Consolidado"],["clientes","Por Cliente"],["tendencia","Tendencia"],["traslados","Flujo Interno"]].map(([k,v])=>(<button key={k} onClick={()=>{setTab(k);setClienteSel(null);}} style={{padding:"8px 18px",cursor:"pointer",fontSize:12,fontWeight:tab===k?700:400,color:tab===k?C.navy:C.textDim,background:tab===k?C.accentBg:"transparent",border:"1px solid "+(tab===k?C.accent:C.border),borderRadius:8,fontFamily:"'Inter',sans-serif"}}>{v}</button>))}
        </div>
      </div>
    </div>

    <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap",alignItems:"center",padding:"12px 16px",background:C.panel,borderRadius:10,border:"1px solid "+C.border}}>
      <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5}}>Filtros</span>
      <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)} style={{...S.select,width:"auto",minWidth:130,fontSize:12,padding:"6px 10px"}}>
        <option value="todos">Todos los meses</option>
        {mesesDisp.map(m=>(<option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>))}
      </select>
      <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{...S.select,width:"auto",minWidth:140,fontSize:12,padding:"6px 10px"}}>
        <option value="todos">Todos los productos</option>
        {tiposDisp.map(t=>(<option key={t} value={t}>{t}</option>))}
      </select>
      <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar cliente, producto, factura..." style={{...S.input,width:"auto",flex:1,minWidth:200,fontSize:12,padding:"6px 10px"}}/>
      {(filtroMes!=="todos"||filtroTipo!=="todos"||busqueda)&&<button style={{...S.btnG,fontSize:11,padding:"6px 12px",color:C.red,borderColor:C.red+"40"}} onClick={()=>{setFiltroMes("todos");setFiltroTipo("todos");setBusqueda("");}}>✕ Limpiar</button>}
      <span style={{fontSize:11,color:C.textFaint,marginLeft:"auto"}}>{ventasFilt.length} resultados</span>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:20}}>
      {[{label:"Total Facturado",value:fmtCOP(totalValor),sub:ventasFilt.length+" transacciones",col:C.navy,icon:"💵",big:true},{label:"kg Vendidos",value:fmt(totalKg)+" kg",sub:"peso neto despachado",col:C.teal,icon:"⚖️"},{label:"Precio Prom. / kg",value:promKg>0?fmtCOP(promKg):"—",sub:"valor promedio ponderado",col:C.gold,icon:"📈"},{label:"Clientes Activos",value:clientesUnicos.length,sub:"en periodo seleccionado",col:C.accent,icon:"🤝"}].map(k=>(
        <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:12,padding:"18px 20px",borderTop:"3px solid "+k.col,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1}}>{k.label}</span>
            <span style={{fontSize:18,opacity:0.6}}>{k.icon}</span>
          </div>
          <div style={{fontSize:k.big?20:24,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:4,fontVariantNumeric:"tabular-nums"}}>{k.value}</div>
          <div style={{fontSize:11,color:C.textFaint}}>{k.sub}</div>
        </div>
      ))}
    </div>

    {tab==="consolidado"&&(<>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Transacciones de Venta</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Salidas externas de todos los productos</div></div>
          <div style={{display:"flex",gap:10,fontSize:11,color:C.textDim}}>
            <span>Total: <strong style={{color:C.navy}}>{fmtCOP(totalValor)}</strong></span>
            <span>·</span>
            <span><strong style={{color:C.teal}}>{fmt(totalKg)} kg</strong></span>
          </div>
        </div>
        {ventasFilt.length===0?(<div style={{textAlign:"center",padding:"40px 0",color:C.textFaint}}><div style={{fontSize:32,marginBottom:10}}>📭</div><div style={{fontSize:13}}>Sin ventas para el filtro aplicado</div></div>):(
          <TablaScrollV>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:800}}>
              <thead><tr>{["Fecha","Factura / Remisión","Cliente","Producto","Tipo","kg","Valor/kg","Valor Total"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
              <tbody>
                {ventasFilt.map((v,i)=>(<tr key={v.id||i} style={{background:i%2===0?C.panel:C.panel2}}>
                  <td style={{...S.td,color:C.textDim,fontSize:12}}>{v.fecha||"—"}</td>
                  <td style={{...S.td}}>
                    {v.factura&&<div style={{fontSize:12,fontWeight:600,color:C.navy}}>F: {v.factura}</div>}
                    {v.remision&&<div style={{fontSize:11,color:C.textDim}}>R: {v.remision}</div>}
                    {!v.factura&&!v.remision&&<span style={{color:C.textFaint}}>—</span>}
                  </td>
                  <td style={{...S.td,fontWeight:600,color:C.navy}}>{v.cliente}</td>
                  <td style={S.td}><Bdg label={v.producto} col={TIPO_COL[v.tipo]||C.navy} bg={TIPO_BG[v.tipo]||C.accentBg}/></td>
                  <td style={S.td}><span style={{...tg(TIPO_COL[v.tipo]||C.navy,TIPO_BG[v.tipo]),fontSize:10}}>{v.tipo}</span></td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(v.kg)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{v.valor_kg>0?fmtCOP(v.valor_kg):"—"}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{v.valor_total>0?fmtCOP(v.valor_total):"—"}</td>
                </tr>))}
                <tr style={{background:C.navy}}>
                  <td colSpan={5} style={{...S.td,fontWeight:800,color:"#fff",fontSize:12}}>TOTAL ({ventasFilt.length} transacciones)</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(totalKg)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmtCOP(totalValor)}</td>
                </tr>
              </tbody>
            </table>
          </TablaScrollV>
        )}
      </div>
    </>)}

    {tab==="clientes"&&(<>
      {clienteSel?(
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <button onClick={()=>setClienteSel(null)} style={{...S.btnG,fontSize:11,padding:"4px 10px",marginBottom:8}}>← Volver</button>
              <div style={{fontWeight:700,fontSize:16,color:C.navy}}>{clienteSel}</div>
              <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{histCliente.length} transacciones · {fmt(histCliente.reduce((s,v)=>s+v.kg,0))} kg · {fmtCOP(histCliente.reduce((s,v)=>s+v.valor_total,0))}</div>
            </div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              {[...new Set(histCliente.map(v=>v.tipo))].map(t=>(<Bdg key={t} label={t} col={TIPO_COL[t]||C.navy} bg={TIPO_BG[t]}/>))}
            </div>
          </div>
          <TablaScrollV>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
              <thead><tr>{["Fecha","Factura / Remisión","Producto","Tipo","kg","Valor/kg","Valor Total"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
              <tbody>
                {histCliente.map((v,i)=>(<tr key={v.id||i} style={{background:i%2===0?C.panel:C.panel2}}>
                  <td style={{...S.td,color:C.textDim,fontSize:12}}>{v.fecha||"—"}</td>
                  <td style={S.td}>{v.factura&&<div style={{fontSize:12,fontWeight:600,color:C.navy}}>F: {v.factura}</div>}{v.remision&&<div style={{fontSize:11,color:C.textDim}}>R: {v.remision}</div>}{!v.factura&&!v.remision&&"—"}</td>
                  <td style={S.td}><Bdg label={v.producto} col={TIPO_COL[v.tipo]||C.navy} bg={TIPO_BG[v.tipo]}/></td>
                  <td style={S.td}><span style={{...tg(TIPO_COL[v.tipo]||C.navy,TIPO_BG[v.tipo]),fontSize:10}}>{v.tipo}</span></td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(v.kg)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{v.valor_kg>0?fmtCOP(v.valor_kg):"—"}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{v.valor_total>0?fmtCOP(v.valor_total):"—"}</td>
                </tr>))}
                <tr style={{background:C.navy}}>
                  <td colSpan={4} style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(histCliente.reduce((s,v)=>s+v.kg,0))} kg</td>
                  <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmtCOP(histCliente.reduce((s,v)=>s+v.valor_total,0))}</td>
                </tr>
              </tbody>
            </table>
          </TablaScrollV>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={S.card}>
            <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>Ranking de Clientes</div>
            <div style={{fontSize:11,color:C.textDim,marginBottom:16}}>{clienteData.length} clientes · ordenado por valor total</div>
            {clienteData.length===0?(<div style={{textAlign:"center",padding:"30px 0",color:C.textFaint}}>Sin datos</div>):(
              <div>{clienteData.map((d,i)=>(
                <div key={d.cliente} onClick={()=>setClienteSel(d.cliente)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 12px",marginBottom:6,borderRadius:8,border:"1px solid "+C.border,cursor:"pointer",background:i===0?C.accentBg:C.panel,transition:"background 0.15s"}} onMouseEnter={e=>e.currentTarget.style.background=C.accentBg} onMouseLeave={e=>e.currentTarget.style.background=i===0?C.accentBg:C.panel}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:i<3?C.navy:C.bg,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:i<3?"#fff":C.textDim,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.cliente}</div>
                    <div style={{fontSize:10,color:C.textDim,marginTop:2}}>{d.tx} tx · {fmt(d.kg)} kg · {d.tipos}</div>
                    <div style={{marginTop:6,background:C.bg,borderRadius:4,height:5,overflow:"hidden"}}><div style={{background:C.accent,width:((d.valor/maxValCliente)*100)+"%",height:"100%",borderRadius:4}}/></div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmtCOP(d.valor)}</div>
                    <div style={{fontSize:10,color:C.gold}}>{fmtCOP(d.promKg)}/kg</div>
                  </div>
                </div>
              ))}</div>
            )}
          </div>
          <div style={S.card}>
            <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>Mix de Productos Vendidos</div>
            <div style={{fontSize:11,color:C.textDim,marginBottom:20}}>Participación por tipo · kg totales</div>
            {(()=>{
              const PCOLS2=[C.teal,C.green,C.purple,C.accent,C.gold,C.orange];
              const porTipoArr=tiposDisp.map((t,i)=>{const kgt=todasVentas.filter(v=>v.tipo===t).reduce((s,v)=>s+v.kg,0);const valt=todasVentas.filter(v=>v.tipo===t).reduce((s,v)=>s+v.valor_total,0);return{tipo:t,kg:kgt,valor:valt,col:PCOLS2[i%PCOLS2.length]};}).sort((a,b)=>b.kg-a.kg);
              const totalKgT=porTipoArr.reduce((s,d)=>s+d.kg,0)||1;
              const cx=90,cy=90,ro=70,ri=36;
              if(porTipoArr.length===0)return<div style={{color:C.textFaint,textAlign:"center",padding:"40px 0"}}>Sin datos</div>;
              if(porTipoArr.length===1){const d=porTipoArr[0];return(<div><div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{background:d.col+"15",border:"1px solid "+d.col+"30",borderRadius:10,padding:"16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:700,color:d.col}}>{d.tipo}</div><div style={{fontSize:12,color:C.textDim,marginTop:4}}>{fmt(d.kg)} kg</div></div><div style={{fontSize:20,fontWeight:800,color:d.col}}>100%</div></div></div></div>);}
              let cum=0;
              const slices=porTipoArr.map(d=>{const frac=d.kg/totalKgT;const s0=cum*2*Math.PI;cum+=frac;const s1=cum*2*Math.PI;const x1=cx+ro*Math.cos(s0-Math.PI/2),y1=cy+ro*Math.sin(s0-Math.PI/2);const x2=cx+ro*Math.cos(s1-Math.PI/2),y2=cy+ro*Math.sin(s1-Math.PI/2);const xi1=cx+ri*Math.cos(s1-Math.PI/2),yi1=cy+ri*Math.sin(s1-Math.PI/2);const xi2=cx+ri*Math.cos(s0-Math.PI/2),yi2=cy+ri*Math.sin(s0-Math.PI/2);const path=`M${x1.toFixed(2)},${y1.toFixed(2)} A${ro},${ro} 0 ${(s1-s0)>Math.PI?1:0} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi1.toFixed(2)},${yi1.toFixed(2)} A${ri},${ri} 0 ${(s1-s0)>Math.PI?1:0} 0 ${xi2.toFixed(2)},${yi2.toFixed(2)} Z`;const mid=(s0+s1)/2-Math.PI/2;return{...d,path,frac,mid,pct:((frac)*100).toFixed(1)};});
              const vH=Math.max(195,40+porTipoArr.length*26);
              return(<svg viewBox={`0 0 340 ${vH}`} width="100%" style={{display:"block"}}>
                <circle cx={cx} cy={cy} r={ro+2} fill={C.bg} stroke={C.border} strokeWidth="1"/>
                {slices.map(s=>(<path key={s.tipo} d={s.path} fill={s.col} stroke={C.panel} strokeWidth="2" opacity="0.92"/>))}
                {slices.map(s=>s.frac>0.06&&(<text key={s.tipo+"t"} x={(cx+(ro*0.64)*Math.cos(s.mid)).toFixed(2)} y={(cy+(ro*0.64)*Math.sin(s.mid)+4).toFixed(2)} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="800" fontFamily="Inter,sans-serif">{s.pct}%</text>))}
                <text x={cx} y={cy-5} textAnchor="middle" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(totalKgT)}</text>
                <text x={cx} y={cy+7} textAnchor="middle" fontSize="8" fill={C.textFaint} fontFamily="Inter,sans-serif">kg total</text>
                {slices.map((s,i)=>{const ry=22+i*26;return(<g key={s.tipo+"l"}><rect x="195" y={ry-10} width="13" height="13" fill={s.col} rx="2" opacity="0.9"/><text x="213" y={ry} fontSize="10" fill={C.text} fontFamily="Inter,sans-serif">{s.tipo}</text><text x="280" y={ry} textAnchor="end" fontSize="10" fill={s.col} fontWeight="700" fontFamily="Inter,sans-serif">{s.pct}%</text><text x="336" y={ry} textAnchor="end" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(s.kg)} kg</text></g>);})}
              </svg>);
            })()}
          </div>
        </div>
      )}
    </>)}

    {tab==="tendencia"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>Ventas por Mes</div>
          <div style={{fontSize:11,color:C.textDim,marginBottom:16}}>Valor total facturado</div>
          {mesesGraf.length===0?(<div style={{color:C.textFaint,textAlign:"center",padding:"30px 0"}}>Sin datos</div>):(()=>{
            const barH=180,barW=Math.max(28,Math.floor(340/mesesGraf.length)-8);
            return(<svg viewBox="0 0 340 220" width="100%" style={{display:"block"}}>
              {mesesGraf.map(([mes,d],i)=>{const x=i*(barW+6)+10;const h=maxValMes>0?(d.valor/maxValMes)*(barH-10):0;const y=barH-h+20;const activo=filtroMes===mes;return(<g key={mes}>
                <rect x={x} y={y} width={barW} height={h} fill={activo?C.navy:C.accent} rx="3" opacity={activo?1:0.75}/>
                <text x={x+barW/2} y={y-5} textAnchor="middle" fontSize="7.5" fill={C.accent} fontWeight="700" fontFamily="Inter,sans-serif">{d.valor>0?("$"+Math.round(d.valor/1000000)+"M"):"—"}</text>
                <text x={x+barW/2} y={barH+32} textAnchor="middle" fontSize="8" fill={C.textDim} fontFamily="Inter,sans-serif" transform={`rotate(-35,${x+barW/2},${barH+32})`}>{mes.slice(0,3)}</text>
              </g>);})}
              <line x1="10" y1={barH+20} x2="330" y2={barH+20} stroke={C.border} strokeWidth="1"/>
            </svg>);
          })()}
        </div>
        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>kg Despachados por Mes</div>
          <div style={{fontSize:11,color:C.textDim,marginBottom:16}}>Volumen físico vendido</div>
          {mesesGraf.length===0?(<div style={{color:C.textFaint,textAlign:"center",padding:"30px 0"}}>Sin datos</div>):(()=>{
            const barH=180,barW=Math.max(28,Math.floor(340/mesesGraf.length)-8);
            const maxKgMes=mesesGraf.reduce((m,[,d])=>Math.max(m,d.kg),1);
            return(<svg viewBox="0 0 340 220" width="100%" style={{display:"block"}}>
              {mesesGraf.map(([mes,d],i)=>{const x=i*(barW+6)+10;const h=maxKgMes>0?(d.kg/maxKgMes)*(barH-10):0;const y=barH-h+20;const activo=filtroMes===mes;return(<g key={mes}>
                <rect x={x} y={y} width={barW} height={h} fill={activo?C.navy:C.teal} rx="3" opacity={activo?1:0.78}/>
                <text x={x+barW/2} y={y-5} textAnchor="middle" fontSize="7.5" fill={C.teal} fontWeight="700" fontFamily="Inter,sans-serif">{d.kg>0?fmt(Math.round(d.kg)):"—"}</text>
                <text x={x+barW/2} y={barH+32} textAnchor="middle" fontSize="8" fill={C.textDim} fontFamily="Inter,sans-serif" transform={`rotate(-35,${x+barW/2},${barH+32})`}>{mes.slice(0,3)}</text>
              </g>);})}
              <line x1="10" y1={barH+20} x2="330" y2={barH+20} stroke={C.border} strokeWidth="1"/>
            </svg>);
          })()}
        </div>
      </div>
      <div style={S.card}>
        <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:14}}>Resumen Mensual</div>
        {mesesGraf.length===0?(<div style={{color:C.textFaint,textAlign:"center",padding:"30px 0"}}>Sin datos</div>):(
          <TablaScrollV>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Mes","Transacciones","kg Vendidos","Valor Total","Precio Prom./kg"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
              <tbody>
                {mesesGraf.map(([mes,d],i)=>{const txMes=todasVentas.filter(v=>v.mes===mes).length;const promM=d.kg>0?d.valor/d.kg:0;return(<tr key={mes} style={{background:filtroMes===mes?C.accentBg:i%2===0?C.panel:C.panel2,cursor:"pointer"}} onClick={()=>setFiltroMes(filtroMes===mes?"todos":mes)}>
                  <td style={{...S.td,fontWeight:600,textTransform:"capitalize"}}>{mes}</td>
                  <td style={{...S.td,textAlign:"center",color:C.textDim}}>{txMes}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kg)} kg</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmtCOP(d.valor)}</td>
                  <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{promM>0?fmtCOP(promM):"—"}</td>
                </tr>);})}
                <tr style={{background:C.navy}}>
                  <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
                  <td style={{...S.td,textAlign:"center",fontWeight:800,color:"rgba(255,255,255,0.7)"}}>{todasVentas.length}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(todasVentas.reduce((s,v)=>s+v.kg,0))} kg</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmtCOP(todasVentas.reduce((s,v)=>s+v.valor_total,0))}</td>
                  <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                </tr>
              </tbody>
            </table>
          </TablaScrollV>
        )}
      </div>
    </>)}

    {tab==="traslados"&&(<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:20}}>
        {[{label:"Traslados Internos",value:traslados.length,sub:"movimientos entre etapas",col:C.navy,icon:"🔁"},{label:"kg Transferidos",value:fmt(traslados.reduce((s,t)=>s+t.kg,0))+" kg",sub:"volumen total interno",col:C.teal,icon:"⚖️"},{label:"Rutas Activas",value:[...new Set(traslados.map(t=>t.origenKey+"→"+t.destinoKey))].length,sub:"pares origen → destino",col:C.purple,icon:"🔀"},{label:"Etapas Involucradas",value:[...new Set([...traslados.map(t=>t.origenKey),...traslados.map(t=>t.destinoKey)])].length,sub:"procesos conectados",col:C.accent,icon:"🏭"}].map(k=>(<div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:12,padding:"18px 20px",borderTop:"3px solid "+k.col,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1}}>{k.label}</span><span style={{fontSize:18,opacity:0.6}}>{k.icon}</span></div>
          <div style={{fontSize:24,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:4,fontVariantNumeric:"tabular-nums"}}>{k.value}</div>
          <div style={{fontSize:11,color:C.textFaint}}>{k.sub}</div>
        </div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,marginBottom:16}}>
        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>Flujo de Materiales entre Etapas</div>
          <div style={{fontSize:11,color:C.textDim,marginBottom:16}}>kg transferidos — ancho proporcional al volumen</div>
          {traslados.length===0?<div style={{color:C.textFaint,textAlign:"center",padding:"40px 0"}}>Sin traslados registrados</div>:(()=>{
            const nodeW=14,pad=20,gap=12,W=460,cpRatio=0.42;
            const srcMap={};traslados.forEach(t=>{if(!srcMap[t.origenKey])srcMap[t.origenKey]={key:t.origenKey,label:t.origen,col:OCOL[t.origenKey]||C.navy,kg:0,flows:{}};srcMap[t.origenKey].kg+=t.kg;srcMap[t.origenKey].flows[t.destinoKey]=(srcMap[t.origenKey].flows[t.destinoKey]||0)+t.kg;});
            const dstMap={};traslados.forEach(t=>{if(!dstMap[t.destinoKey])dstMap[t.destinoKey]={key:t.destinoKey,label:t.destino,col:DCOL[t.destinoKey]||C.accent,kg:0,flows:{}};dstMap[t.destinoKey].kg+=t.kg;dstMap[t.destinoKey].flows[t.origenKey]=(dstMap[t.destinoKey].flows[t.origenKey]||0)+t.kg;});
            const srcs=Object.values(srcMap).sort((a,b)=>b.kg-a.kg);
            const dsts=Object.values(dstMap).sort((a,b)=>b.kg-a.kg);
            const totalKgS=srcs.reduce((s,n)=>s+n.kg,0)||1;
            const svgH=Math.max(200,pad*2+Math.max(srcs.length,dsts.length)*50+(Math.max(srcs.length,dsts.length)-1)*gap);
            const usableH=svgH-2*pad;
            let sy=pad;const srcNodes=srcs.map(n=>{const h=Math.max(12,(n.kg/totalKgS)*(usableH-gap*(srcs.length-1)));const node={...n,x:10,y:sy,h};sy+=h+gap;return node;});
            let dy=pad;const dstNodes=dsts.map(n=>{const h=Math.max(12,(n.kg/totalKgS)*(usableH-gap*(dsts.length-1)));const node={...n,x:W-nodeW-10,y:dy,h};dy+=h+gap;return node;});
            const dstOff={};dstNodes.forEach(dn=>{let off=0;dstOff[dn.key]={};srcNodes.forEach(sn=>{if(dn.flows[sn.key]){dstOff[dn.key][sn.key]=off;off+=Math.max(2,(dn.flows[sn.key]/dn.kg)*dn.h);}});});
            const paths=[];srcNodes.forEach(sn=>{let srcOff=0;Object.entries(sn.flows).sort((a,b)=>b[1]-a[1]).forEach(([dk,fKg])=>{const dn=dstNodes.find(d=>d.key===dk);if(!dn)return;const fhS=Math.max(2,(fKg/sn.kg)*sn.h),fhD=Math.max(2,(fKg/dn.kg)*dn.h);const syt=sn.y+srcOff,syb=syt+fhS,dyt=dn.y+(dstOff[dn.key][sn.key]||0),dyb=dyt+fhD;const sx=sn.x+nodeW,dx=dn.x,cp=sx+(dx-sx)*cpRatio;paths.push({d:`M${sx},${syt} C${cp},${syt} ${cp},${dyt} ${dx},${dyt} L${dx},${dyb} C${cp},${dyb} ${cp},${syb} ${sx},${syb} Z`,col:dn.col,kg:fKg});srcOff+=fhS;});});
            return(<svg viewBox={`0 0 ${W} ${svgH}`} width="100%" style={{display:"block"}}>
              {paths.map((p,i)=>(<path key={i} d={p.d} fill={p.col} opacity="0.32" stroke={p.col} strokeWidth="0.3" strokeOpacity="0.4"/>))}
              {srcNodes.map(n=>(<g key={n.key}><rect x={n.x} y={n.y} width={nodeW} height={n.h} fill={n.col} rx="2"/><text x={n.x+nodeW+6} y={n.y+n.h/2+(n.h>=22?-4:4)} fontSize="9" fill={C.navy} fontWeight="700" fontFamily="Inter,sans-serif">{n.label}</text>{n.h>=22&&<text x={n.x+nodeW+6} y={n.y+n.h/2+8} fontSize="7.5" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(n.kg)} kg</text>}</g>))}
              {dstNodes.map(n=>(<g key={n.key}><rect x={n.x} y={n.y} width={nodeW} height={n.h} fill={n.col} rx="2"/><text x={n.x-6} y={n.y+n.h/2+(n.h>=22?-4:4)} textAnchor="end" fontSize="9" fill={C.navy} fontWeight="700" fontFamily="Inter,sans-serif">{n.label}</text>{n.h>=22&&<text x={n.x-6} y={n.y+n.h/2+8} textAnchor="end" fontSize="7.5" fill={C.textDim} fontFamily="Inter,sans-serif">{fmt(n.kg)} kg</text>}</g>))}
            </svg>);
          })()}
        </div>
        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>kg por Destino</div>
          <div style={{fontSize:11,color:C.textDim,marginBottom:20}}>volumen recibido por cada etapa</div>
          {(()=>{const byDest={};traslados.forEach(t=>{if(!byDest[t.destinoKey])byDest[t.destinoKey]={label:t.destino,col:DCOL[t.destinoKey]||C.accent,kg:0,count:0};byDest[t.destinoKey].kg+=t.kg;byDest[t.destinoKey].count++;});const destArr=Object.values(byDest).sort((a,b)=>b.kg-a.kg);const maxKg=destArr.length>0?destArr[0].kg:1;if(destArr.length===0)return<div style={{color:C.textFaint,textAlign:"center",padding:"30px 0"}}>Sin datos</div>;return(<div>{destArr.map(d=>(<div key={d.label} style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><Bdg label={d.label} col={d.col} bg={d.col+"18"}/><div style={{textAlign:"right"}}><span style={{fontSize:14,fontWeight:800,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kg)} kg</span><span style={{fontSize:10,color:C.textDim,marginLeft:8}}>{d.count} mov.</span></div></div><div style={{background:C.bg,borderRadius:6,height:10,border:"1px solid "+C.border,overflow:"hidden"}}><div style={{background:d.col,width:((d.kg/maxKg)*100)+"%",height:"100%",borderRadius:6}}/></div></div>))}</div>);})()}
          {traslados.length>0&&<div style={{marginTop:16,paddingTop:14,borderTop:"1px solid "+C.border,display:"flex",justifyContent:"space-between",fontSize:11,color:C.textDim}}><span>Total transferido</span><strong style={{color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(traslados.reduce((s,t)=>s+t.kg,0))} kg</strong></div>}
        </div>
      </div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Detalle de Traslados</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{traslados.length} movimientos internos</div></div>
          <strong style={{color:C.teal,fontSize:12,fontVariantNumeric:"tabular-nums"}}>{fmt(traslados.reduce((s,t)=>s+t.kg,0))} kg total</strong>
        </div>
        {traslados.length===0?<div style={{textAlign:"center",padding:"40px 0",color:C.textFaint}}><div style={{fontSize:36,marginBottom:10}}>🔁</div><div style={{fontSize:13}}>Sin traslados internos registrados</div></div>
        :<TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
          <thead><tr>{["Fecha","Origen","→","Destino","Producto","Ref.","kg"].map(h=>(<th key={h} style={{...S.th,textAlign:h==="kg"?"right":"left"}}>{h}</th>))}</tr></thead>
          <tbody>
            {traslados.map((t,i)=>(<tr key={t.id||i} style={{background:i%2===0?C.panel:C.panel2}}>
              <td style={{...S.td,color:C.textDim,fontSize:12}}>{t.fecha||"—"}</td>
              <td style={S.td}><Bdg label={t.origen} col={OCOL[t.origenKey]||C.navy} bg={(OCOL[t.origenKey]||C.navy)+"18"}/></td>
              <td style={{...S.td,color:C.textFaint,fontSize:16,padding:"0 4px"}}>→</td>
              <td style={S.td}><Bdg label={t.destino} col={DCOL[t.destinoKey]||C.accent} bg={(DCOL[t.destinoKey]||C.accent)+"18"}/></td>
              <td style={{...S.td,color:C.navy,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis"}}>{t.producto}</td>
              <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:C.textDim}}>{t.ref||"—"}</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(t.kg)} kg</td>
            </tr>))}
            <tr style={{background:C.navy}}>
              <td colSpan={6} style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL ({traslados.length} movimientos)</td>
              <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.teal,fontVariantNumeric:"tabular-nums"}}>{fmt(traslados.reduce((s,t)=>s+t.kg,0))} kg</td>
            </tr>
          </tbody>
        </table></TablaScrollV>}
      </div>
    </>)}
  </div>);
}
