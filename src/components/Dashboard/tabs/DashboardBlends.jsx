import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmtCOP,fmt}from"../../../lib/format";
import{mesDe}from"../../../lib/dates";
import{Bdg,TablaScrollV,DonutChart}from"../../ui";
export function DashboardBlends({blends,blendsFino}){
  const [tabBlends,setTabBlends]=useState("blend");
  const [filtroMesBlend,setFiltroMesBlend]=useState("todos");
  const [filtroMesBlendf,setFiltroMesBlendf]=useState("todos");
  const _stockB=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const blendsAll=blends||[];
  const blendsFilt=filtroMesBlend==="todos"?blendsAll:blendsAll.filter(b=>mesDe(b.fecha)===filtroMesBlend);
  const blendsKgTotal=blendsFilt.reduce((s,b)=>s+b.kg_total,0);
  const blendsValTotal=blendsFilt.reduce((s,b)=>s+(b.valor_total||0),0);
  const blendsStockKg=blendsFilt.reduce((s,b)=>s+_stockB(b),0);
  const blendsKgSal=blendsFilt.reduce((s,b)=>s+(b.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const blendsValSal=blendsFilt.reduce((s,b)=>s+(b.salidas||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  const blendsPorProd={};blendsFilt.forEach(b=>{const p=b.producto_comercial||b.nombre||"Sin Nombre";if(!blendsPorProd[p])blendsPorProd[p]={count:0,kgTotal:0,valTotal:0,kgSal:0,kgStock:0};blendsPorProd[p].count++;blendsPorProd[p].kgTotal+=b.kg_total;blendsPorProd[p].valTotal+=(b.valor_total||0);blendsPorProd[p].kgSal+=(b.salidas||[]).reduce((a,si)=>a+si.peso_salida,0);blendsPorProd[p].kgStock+=_stockB(b);});
  const blendsProdData=Object.entries(blendsPorProd).sort((a,b)=>b[1].kgTotal-a[1].kgTotal).map(([prod,d])=>({prod,count:d.count,kgTotal:d.kgTotal,costoUk:d.kgTotal>0?d.valTotal/d.kgTotal:0,kgSal:d.kgSal,kgStock:d.kgStock}));
  const _stockBF=(b)=>b.kg_total-(b.salidas||[]).reduce((a,s)=>a+s.peso_salida,0);
  const blendsFAll=blendsFino||[];
  const blendsFfilt=filtroMesBlendf==="todos"?blendsFAll:blendsFAll.filter(b=>mesDe(b.fecha)===filtroMesBlendf);
  const blendsFKgTotal=blendsFfilt.reduce((s,b)=>s+b.kg_total,0);
  const blendsFValTotal=blendsFfilt.reduce((s,b)=>s+(b.valor_total||0),0);
  const blendsFStockKg=blendsFfilt.reduce((s,b)=>s+_stockBF(b),0);
  const blendsFKgSal=blendsFfilt.reduce((s,b)=>s+(b.salidas||[]).reduce((a,si)=>a+si.peso_salida,0),0);
  const blendsFValSal=blendsFfilt.reduce((s,b)=>s+(b.salidas||[]).reduce((a,si)=>a+(si.valor_total||0),0),0);
  const blendsFPorProd={};blendsFfilt.forEach(b=>{const p=b.producto_comercial||b.nombre||"Sin Nombre";if(!blendsFPorProd[p])blendsFPorProd[p]={count:0,kgTotal:0,valTotal:0,kgSal:0,kgStock:0};blendsFPorProd[p].count++;blendsFPorProd[p].kgTotal+=b.kg_total;blendsFPorProd[p].valTotal+=(b.valor_total||0);blendsFPorProd[p].kgSal+=(b.salidas||[]).reduce((a,si)=>a+si.peso_salida,0);blendsFPorProd[p].kgStock+=_stockBF(b);});
  const blendsFProdData=Object.entries(blendsFPorProd).sort((a,b)=>b[1].kgTotal-a[1].kgTotal).map(([prod,d])=>({prod,count:d.count,kgTotal:d.kgTotal,costoUk:d.kgTotal>0?d.valTotal/d.kgTotal:0,kgSal:d.kgSal,kgStock:d.kgStock}));
  return(<>
    <div style={{display:"flex",gap:6,marginBottom:20,borderBottom:"2px solid "+C.border}}>
      {[["blend","Blend"],["blend_fino","Blend Cafe Fino"]].map(([k,v])=>(<button key={k} onClick={()=>setTabBlends(k)} style={{padding:"7px 18px",cursor:"pointer",fontSize:12,fontWeight:tabBlends===k?700:400,color:tabBlends===k?C.purple:C.textDim,background:"transparent",border:"none",borderBottom:tabBlends===k?"3px solid "+C.purple:"3px solid transparent",marginBottom:-2,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{v}</button>))}
    </div>
    {tabBlends==="blend"&&(<>
      {(()=>{const mesesB=MESES.filter(m=>blendsAll.some(b=>mesDe(b.fecha)===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
          {["todos",...mesesB].map(m=>(<button key={m} onClick={()=>setFiltroMesBlend(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesBlend===m?C.purple:C.border),background:filtroMesBlend===m?C.purple:"transparent",color:filtroMesBlend===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesBlend===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
        </div>
        {filtroMesBlend!=="todos"&&<span style={{fontSize:11,color:C.purple,fontWeight:700,whiteSpace:"nowrap",background:C.purpleBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesBlend.charAt(0).toUpperCase()+filtroMesBlend.slice(1)}</span>}
      </div>);})()}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10,marginBottom:18}}>
        {[{label:"Blends Creados",value:blendsFilt.length,sub:"periodo seleccionado",col:C.navy,icon:"🔀"},{label:"kg Producidos",value:fmt(blendsKgTotal)+" kg",sub:"acumulado",col:C.teal,icon:"⚖️"},{label:"Valor Producido",value:fmtCOP(blendsValTotal),sub:"costo total",col:C.gold,icon:"💰",fs:14},{label:"kg Salidas",value:fmt(blendsKgSal)+" kg",sub:"despachado",col:C.orange,icon:"📤"},{label:"Valor Salidas",value:fmtCOP(blendsValSal),sub:"facturado salidas",col:C.accent,icon:"💸",fs:14},{label:"kg en Stock",value:fmt(blendsStockKg)+" kg",sub:"disponible",col:C.green,icon:"🏪"}].map(k=>(
          <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
              <span style={{fontSize:14}}>{k.icon}</span>
            </div>
            <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
            <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16,marginBottom:0}}>
        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>Participación por Producto</div>
          <div style={{fontSize:11,color:C.textDim,marginBottom:14}}>% sobre kg producidos</div>
          <DonutChart data={blendsProdData} labelKey="prod" valueKey="kgTotal" colors={[C.purple,C.navy,C.teal,C.accent,C.green,C.gold,C.orange,"#e11d48","#0369a1","#059669"]}/>
        </div>
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{blendsProdData.length} productos · {blendsFilt.length} blends</div></div>
            <div style={{display:"flex",gap:14,fontSize:11,color:C.textDim}}>
              <span>Stock: <strong style={{color:C.green}}>{fmt(blendsStockKg)} kg</strong></span>
            </div>
          </div>
          {blendsProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin blends registrados.</div>:(
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Producto Comercial","Blends","kg Producidos","Costo/kg","kg Salidas","kg Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
              <tbody>
                {blendsProdData.map(d=>(<tr key={d.prod}>
                  <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.purple} bg={C.purpleBg}/></td>
                  <td style={{...S.td,textAlign:"center",color:C.textDim}}>{d.count}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgTotal)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoUk>0?fmtCOP(d.costoUk):"—"}</td>
                  <td style={{...S.td,textAlign:"right",color:C.orange,fontVariantNumeric:"tabular-nums"}}>{d.kgSal>0?fmt(d.kgSal)+" kg":"—"}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}><span style={{color:d.kgStock>0?C.green:C.textDim}}>{fmt(d.kgStock)} kg</span></td>
                </tr>))}
                <tr style={{background:C.navy}}>
                  <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
                  <td style={{...S.td,textAlign:"center",color:"rgba(255,255,255,0.5)"}}>{blendsFilt.length}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(blendsKgTotal)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{blendsKgSal>0?fmt(blendsKgSal)+" kg":"—"}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(blendsStockKg)} kg</td>
                </tr>
              </tbody>
            </table></TablaScrollV>
          )}
        </div>
      </div>
    </>)}
    {tabBlends==="blend_fino"&&(<>
      {(()=>{const mesesBF2=MESES.filter(m=>blendsFAll.some(b=>mesDe(b.fecha)===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
          {["todos",...mesesBF2].map(m=>(<button key={m} onClick={()=>setFiltroMesBlendf(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesBlendf===m?C.green:C.border),background:filtroMesBlendf===m?C.green:"transparent",color:filtroMesBlendf===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesBlendf===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
        </div>
        {filtroMesBlendf!=="todos"&&<span style={{fontSize:11,color:C.green,fontWeight:700,whiteSpace:"nowrap",background:C.greenBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesBlendf.charAt(0).toUpperCase()+filtroMesBlendf.slice(1)}</span>}
      </div>);})()}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10,marginBottom:18}}>
        {[{label:"Blends Creados",value:blendsFfilt.length,sub:"periodo seleccionado",col:C.navy,icon:"🔀"},{label:"kg Producidos",value:fmt(blendsFKgTotal)+" kg",sub:"acumulado",col:C.teal,icon:"⚖️"},{label:"Valor Producido",value:fmtCOP(blendsFValTotal),sub:"costo total",col:C.gold,icon:"💰",fs:14},{label:"kg Salidas",value:fmt(blendsFKgSal)+" kg",sub:"despachado",col:C.orange,icon:"📤"},{label:"Valor Salidas",value:fmtCOP(blendsFValSal),sub:"facturado salidas",col:C.accent,icon:"💸",fs:14},{label:"kg en Stock",value:fmt(blendsFStockKg)+" kg",sub:"disponible",col:C.green,icon:"🏪"}].map(k=>(
          <div key={k.label} style={{background:C.panel,border:"1px solid "+C.border,borderRadius:10,padding:"12px 10px",borderLeft:"3px solid "+k.col,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{fontSize:9,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:0.8,lineHeight:1.3}}>{k.label}</div>
              <span style={{fontSize:14}}>{k.icon}</span>
            </div>
            <div style={{fontSize:k.fs||19,fontWeight:800,color:k.col,lineHeight:1.1,marginBottom:3,overflowWrap:"anywhere"}}>{k.value}</div>
            <div style={{fontSize:9,color:C.textFaint}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16}}>
        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy,marginBottom:4}}>Participación por Producto</div>
          <div style={{fontSize:11,color:C.textDim,marginBottom:14}}>% sobre kg producidos</div>
          <DonutChart data={blendsFProdData} labelKey="prod" valueKey="kgTotal" colors={[C.green,C.teal,C.navy,C.purple,C.accent,C.gold,C.orange,"#e11d48","#0369a1","#059669"]}/>
        </div>
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>{blendsFProdData.length} productos · {blendsFfilt.length} blends</div></div>
            <div style={{display:"flex",gap:14,fontSize:11,color:C.textDim}}>
              <span>Stock: <strong style={{color:C.green}}>{fmt(blendsFStockKg)} kg</strong></span>
            </div>
          </div>
          {blendsFProdData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"20px 0"}}>Sin blends registrados.</div>:(
            <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>{["Producto Comercial","Blends","kg Producidos","Costo/kg","kg Salidas","kg Stock"].map(h=>(<th key={h} style={S.th}>{h}</th>))}</tr></thead>
              <tbody>
                {blendsFProdData.map(d=>(<tr key={d.prod}>
                  <td style={{...S.td,fontWeight:700}}><Bdg label={d.prod} col={C.green} bg={C.greenBg}/></td>
                  <td style={{...S.td,textAlign:"center",color:C.textDim}}>{d.count}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.navy,fontVariantNumeric:"tabular-nums"}}>{fmt(d.kgTotal)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:C.gold,fontVariantNumeric:"tabular-nums"}}>{d.costoUk>0?fmtCOP(d.costoUk):"—"}</td>
                  <td style={{...S.td,textAlign:"right",color:C.orange,fontVariantNumeric:"tabular-nums"}}>{d.kgSal>0?fmt(d.kgSal)+" kg":"—"}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}><span style={{color:d.kgStock>0?C.green:C.textDim}}>{fmt(d.kgStock)} kg</span></td>
                </tr>))}
                <tr style={{background:C.navy}}>
                  <td style={{...S.td,fontWeight:800,color:"#fff"}}>TOTAL</td>
                  <td style={{...S.td,textAlign:"center",color:"rgba(255,255,255,0.5)"}}>{blendsFfilt.length}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(blendsFKgTotal)} kg</td>
                  <td style={{...S.td,textAlign:"right",color:"rgba(255,255,255,0.4)"}}>—</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.orange,fontVariantNumeric:"tabular-nums"}}>{blendsFKgSal>0?fmt(blendsFKgSal)+" kg":"—"}</td>
                  <td style={{...S.td,textAlign:"right",fontWeight:800,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmt(blendsFStockKg)} kg</td>
                </tr>
              </tbody>
            </table></TablaScrollV>
          )}
        </div>
      </div>
    </>)}
  </>);
}
