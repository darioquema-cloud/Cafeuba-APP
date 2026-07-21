import{useState}from"react";
import{C,S}from"../../../theme";
import{MESES}from"../../../data/constants";
import{fmtCOP,fmt}from"../../../lib/format";
import{mesDe}from"../../../lib/dates";
import{Bdg,TablaScrollV}from"../../ui";
export function DashboardCentral({lotes,costos}){
  const [filtroMesDash,setFiltroMesDash]=useState("todos");
  const lotesCP=lotes.filter(l=>l.origen_lote!=="carga_directa"&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual");
  const lotesCPFilt=filtroMesDash==="todos"?lotesCP:lotesCP.filter(l=>l.mes===filtroMesDash);
  const tkq=lotesCPFilt.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg,0),0);
  const tp=lotesCPFilt.reduce((s,l)=>s+(l.kg_producto||0),0);
  const tc=lotesCPFilt.reduce((s,l)=>s+l.cereza.reduce((a,c)=>a+c.kg*c.valor_kg,0),0);
  const tex=lotesCP.filter(l=>l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  const ep=lotesCP.filter(l=>!["Finalizado","Cerrado"].includes(l.estado)).length;
  const tcos=costos.reduce((s,c)=>s+c.valor,0);
  const enBodega=lotesCP.filter(l=>l.estado==="Bodega");
  const kgBodega=enBodega.reduce((s,l)=>{const sal=(l.salidas_bodega||[]).reduce((a,b)=>a+b.peso_salida,0);return s+(l.kg_producto-sal);},0);
  const pf={};lotesCPFilt.forEach(l=>l.cereza.forEach(c=>{pf[c.finca]=(pf[c.finca]||0)+c.kg;}));
  const mf=Math.max(...Object.values(pf),1);
  const pe={};lotes.forEach(l=>{pe[l.estado]=(pe[l.estado]||0)+1;});
  const tr=[18380,25000,45687,80314,91189,92000,95000,88000,103000,110000,118000,125000];
  const mt=Math.max(...tr);const ml=["E","F","M","A","M","J","J","A","S","O","N","D"];
  const ing=tex*1250000;const mg=ing-tc-tcos;
  const cerezaMes={};lotesCPFilt.forEach(l=>{const m=l.mes||mesDe(l.fecha_proceso||l.fecha_recibo)||"otros";cerezaMes[m]=(cerezaMes[m]||0)+l.cereza.reduce((a,c)=>a+c.kg,0);});
  const mesMostrar=MESES.filter(m=>cerezaMes[m]).map(m=>({mes:m,kg:cerezaMes[m]}));
  const fincaData=Object.entries(pf).sort((a,b)=>b[1]-a[1]);
  const byProd={};lotesCPFilt.forEach(l=>{const p=l.producto||"Sin Producto";if(!byProd[p])byProd[p]={cereza:0,terminado:0,lotes:0};byProd[p].cereza+=l.cereza.reduce((a,c)=>a+c.kg,0);byProd[p].terminado+=l.kg_producto||0;byProd[p].lotes++;});
  const prodData=Object.entries(byProd).sort((a,b)=>b[1].cereza-a[1].cereza);
  const INS_KEYS=[["jugo","Jugo"],["panela","Panela"],["harina","Harina"],["levadura","Levadura"]];
  const insumosData=INS_KEYS.map(([k,nombre])=>{const qty=lotesCPFilt.reduce((s,l)=>s+(l.insumos?.[k]||0),0);const val=lotesCPFilt.reduce((s,l)=>{const ins=l.insumos||{};return s+(ins[k]||0)*(ins["vr_"+k]||0);},0);return{nombre,qty,val};});
  const totalInsCP=insumosData.reduce((s,d)=>s+d.val,0);
  const cbCosFiltrados=costos.filter(c=>c.centro==="Central de Beneficio"&&(filtroMesDash==="todos"||c.mes===filtroMesDash));
  const cbPorTipo={};cbCosFiltrados.forEach(c=>{cbPorTipo[c.tipo]=(cbPorTipo[c.tipo]||0)+c.valor;});
  const cbPieTotal=Object.values(cbPorTipo).reduce((s,v)=>s+v,0);
  const cbPieData=Object.entries(cbPorTipo).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([tipo,val])=>({tipo,val,pct:cbPieTotal>0?((val/cbPieTotal)*100).toFixed(1):"0.0"}));
  const promA=tp>0?tc/tp:0;
  const promB=tp>0?totalInsCP/tp:0;
  const promC=tp>0?cbPieTotal/tp:0;
  const promTotal=promA+promB+promC;
  return(<>
    {(()=>{const mesesDisp=MESES.filter(m=>lotesCP.some(l=>l.mes===m)||costos.some(c=>c.centro==="Central de Beneficio"&&c.mes===m));return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 16px",background:C.panel,borderRadius:12,border:"1px solid "+C.border,flexWrap:"wrap"}}>
      <span style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>Periodo</span>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
        {["todos",...mesesDisp].map(m=>(<button key={m} onClick={()=>setFiltroMesDash(m)} style={{padding:"4px 13px",borderRadius:20,border:"1px solid "+(filtroMesDash===m?C.navy:C.border),background:filtroMesDash===m?C.navy:"transparent",color:filtroMesDash===m?"#fff":C.text,fontSize:11,fontWeight:filtroMesDash===m?700:400,cursor:"pointer",fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{m==="todos"?"Todos":m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
      </div>
      {filtroMesDash!=="todos"&&<span style={{fontSize:11,color:C.accent,fontWeight:700,whiteSpace:"nowrap",background:C.accentBg,padding:"3px 10px",borderRadius:20}}>📅 {filtroMesDash.charAt(0).toUpperCase()+filtroMesDash.slice(1)}</span>}
    </div>);})()}
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10,marginBottom:18}}>
      {[{label:"Cereza Recibida",value:fmt(tkq)+" kg",sub:lotesCPFilt.length+" lotes",col:C.teal,icon:"☕"},{label:"Producto Terminado",value:fmt(tp)+" kg",sub:"café seco / pergamino",col:C.accent,icon:"📦"},{label:"Lotes Procesados",value:lotesCPFilt.filter(l=>l.kg_producto>0).length,sub:"con producto terminado",col:C.navy,icon:"🔢"},{label:"Valor Materia Prima",value:fmtCOP(tc),sub:"costo total cereza",col:C.gold,icon:"💰"},{label:"Costo Insumos",value:fmtCOP(totalInsCP),sub:"jugo·panela·harina·lev",col:C.purple,icon:"🧪"},{label:"Total Costos CB",value:fmtCOP(cbPieTotal),sub:"costos registrados CB",col:C.orange,icon:"📊",fs:15}].map(k=>(
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
    <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16,marginBottom:20}}>
      <div style={{...S.card,minHeight:260}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Cereza Recibida por Mes</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Suma kg acumulada</div></div>
          <div style={{background:C.tealBg,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700,color:C.teal}}>{fmt(tkq)} kg total</div>
        </div>
        {mesMostrar.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",paddingTop:40}}>Sin datos de recepcion.</div>:(()=>{
          const W=520,H=190,pt=20,pr=10,pb=40,pl=52;
          const cW=W-pl-pr,cH=H-pt-pb;
          const maxV=Math.max(...mesMostrar.map(d=>d.kg),1);
          const bStep=cW/mesMostrar.length;
          const bW=Math.min(38,bStep*0.62);
          const ticks=4;
          return(<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{overflow:"visible",display:"block"}}>
            {Array.from({length:ticks+1},(_,i)=>{const y=pt+cH-(cH*i/ticks);const v=maxV*i/ticks;return(<g key={i}><line x1={pl} y1={y} x2={pl+cW} y2={y} stroke={C.border} strokeWidth={i===0?"1.5":"0.6"} strokeDasharray={i===0?"":"5 3"}/><text x={pl-8} y={y+4} textAnchor="end" fontSize="9" fill={C.textDim} fontFamily="Inter,sans-serif">{v>=1000?(v/1000).toFixed(0)+"k":Math.round(v)}</text></g>);})}
            {mesMostrar.map((d,i)=>{
              const x=pl+bStep*i+(bStep-bW)/2;
              const bH=Math.max(2,cH*(d.kg/maxV));
              const y=pt+cH-bH;
              const isMax=d.kg===Math.max(...mesMostrar.map(x=>x.kg));
              return(<g key={d.mes}>
                <rect x={x} y={y} width={bW} height={bH} fill={isMax?C.navy:C.teal} rx="3" opacity={isMax?1:0.82}/>
                <text x={x+bW/2} y={pt+cH+14} textAnchor="middle" fontSize="8.5" fill={C.textDim} fontFamily="Inter,sans-serif">{d.mes.slice(0,3).toUpperCase()}</text>
                <text x={x+bW/2} y={Math.max(y-5,pt+9)} textAnchor="middle" fontSize="8" fill={isMax?C.navy:C.teal} fontWeight="700" fontFamily="Inter,sans-serif">{d.kg>=1000?(d.kg/1000).toFixed(1)+"k":Math.round(d.kg)}</text>
              </g>);
            })}
            <line x1={pl} y1={pt} x2={pl} y2={pt+cH} stroke={C.border} strokeWidth="1.5"/>
            <line x1={pl} y1={pt+cH} x2={pl+cW} y2={pt+cH} stroke={C.border} strokeWidth="1.5"/>
          </svg>);
        })()}
      </div>
      <div style={{...S.card,minHeight:260}}>
        <div style={{marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Cereza por Finca</div>
          <div style={{fontSize:11,color:C.textDim,marginTop:2}}>{fincaData.length} fincas proveedoras</div>
        </div>
        {fincaData.length===0?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",paddingTop:40}}>Sin datos de fincas.</div>:(()=>{
          const COLS=[C.navy,C.accent,C.teal,C.green,C.purple,C.gold,C.orange];
          const W=380,rowH=30,pt=4,pl=115,pr=52,pb=4;
          const H=pt+pb+fincaData.length*rowH;
          const maxV=fincaData[0][1];
          const barZone=W-pl-pr;
          return(<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{overflow:"visible",display:"block"}}>
            {fincaData.map(([finca,kg],i)=>{
              const y=pt+i*rowH;
              const bW=Math.max(3,(kg/maxV)*barZone);
              const col=COLS[i%COLS.length];
              const label=finca.length>16?finca.slice(0,15)+"…":finca;
              return(<g key={finca}>
                <text x={pl-8} y={y+rowH/2+4} textAnchor="end" fontSize="10" fill={C.text} fontFamily="Inter,sans-serif">{label}</text>
                <rect x={pl} y={y+5} width={bW} height={rowH-12} fill={col} rx="3" opacity="0.88"/>
                <text x={pl+bW+5} y={y+rowH/2+4} fontSize="9" fill={col} fontWeight="700" fontFamily="Inter,sans-serif">{kg>=1000?(kg/1000).toFixed(1)+"k":Math.round(kg)}</text>
              </g>);
            })}
          </svg>);
        })()}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:16,alignItems:"start"}}>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Resumen por Producto</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>Cereza recibida vs. café seco obtenido</div></div>
          <div style={{fontSize:11,color:C.textDim,background:C.accentBg,borderRadius:8,padding:"4px 10px"}}>Conversión = kg cereza / kg seco</div>
        </div>
        {prodData.length===0?<div style={{color:C.textFaint,fontSize:13}}>Sin datos.</div>:(
          <TablaScrollV><table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr>
              <th style={S.th}>Producto</th>
              <th style={S.th}>Lotes</th>
              <th style={S.th}>Cereza (kg)</th>
              <th style={S.th}>Café Seco (kg)</th>
              <th style={S.th}>Conversión</th>
              <th style={S.th}>%</th>
            </tr></thead>
            <tbody>{prodData.map(([prod,d])=>{
              const conv=d.terminado>0?(d.cereza/d.terminado).toFixed(2):"—";
              const pct=tkq>0?((d.cereza/tkq)*100).toFixed(1):"0.0";
              const barW=tkq>0?(d.cereza/tkq)*100:0;
              return(<tr key={prod}>
                <td style={{...S.td,fontWeight:700,color:C.navy}}><Bdg label={prod} col={C.teal} bg={C.tealBg}/></td>
                <td style={{...S.td,textAlign:"center",color:C.textDim}}>{d.lotes}</td>
                <td style={{...S.td,fontWeight:700,color:C.teal,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmt(d.cereza)}</td>
                <td style={{...S.td,fontWeight:700,color:C.accent,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{d.terminado>0?fmt(d.terminado):"—"}</td>
                <td style={{...S.td,textAlign:"center"}}>{d.terminado>0?(<span style={{background:C.accentBg,color:C.accent,borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700}}>{conv}:1</span>):"—"}</td>
                <td style={{...S.td,minWidth:90}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1,height:7,background:C.bg,borderRadius:4,overflow:"hidden",border:"1px solid "+C.border}}>
                      <div style={{width:barW+"%",height:"100%",background:C.teal,borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:C.teal,minWidth:30,textAlign:"right"}}>{pct}%</span>
                  </div>
                </td>
              </tr>);
            })}
            <tr style={{background:C.accentBg}}>
              <td style={{...S.td,fontWeight:800,color:C.navy}} colSpan={2}>TOTAL</td>
              <td style={{...S.td,fontWeight:800,color:C.teal,textAlign:"right"}}>{fmt(tkq)}</td>
              <td style={{...S.td,fontWeight:800,color:C.accent,textAlign:"right"}}>{fmt(tp)}</td>
              <td style={{...S.td,textAlign:"center"}}>{tp>0?(<span style={{background:C.navy,color:C.white,borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:700}}>{(tkq/tp).toFixed(2)}:1</span>):"—"}</td>
              <td style={{...S.td,fontWeight:700,color:C.navy}}>100%</td>
            </tr>
            </tbody>
          </table></TablaScrollV>
        )}
      </div>
      <div style={S.card}>
        <div style={{marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Insumos de Proceso</div>
          <div style={{fontSize:11,color:C.textDim,marginTop:2}}>Etapa fermentación / proceso</div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={S.th}>Insumo</th>
            <th style={{...S.th,textAlign:"right"}}>Cantidad Total</th>
            <th style={{...S.th,textAlign:"right"}}>Valor Total</th>
            <th style={{...S.th,textAlign:"right"}}>%</th>
          </tr></thead>
          <tbody>
            {insumosData.map(d=>{
              const pct=totalInsCP>0?((d.val/totalInsCP)*100).toFixed(1):"0.0";
              const barW=totalInsCP>0?(d.val/totalInsCP)*100:0;
              return(<tr key={d.nombre}>
                <td style={{...S.td,fontWeight:600}}><Bdg label={d.nombre} col={C.purple} bg={C.purpleBg}/></td>
                <td style={{...S.td,textAlign:"right",color:C.textDim,fontVariantNumeric:"tabular-nums"}}>{fmt(d.qty)} u</td>
                <td style={{...S.td,textAlign:"right",fontWeight:700,color:C.purple,fontVariantNumeric:"tabular-nums"}}>{fmtCOP(d.val)}</td>
                <td style={{...S.td,minWidth:70}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{flex:1,height:7,background:C.bg,borderRadius:4,overflow:"hidden",border:"1px solid "+C.border}}>
                      <div style={{width:barW+"%",height:"100%",background:C.purple,borderRadius:4,opacity:0.8}}/>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:C.purple,minWidth:28,textAlign:"right"}}>{pct}%</span>
                  </div>
                </td>
              </tr>);
            })}
            <tr style={{background:C.purpleBg}}>
              <td style={{...S.td,fontWeight:800,color:C.navy}} colSpan={2}>TOTAL INSUMOS</td>
              <td style={{...S.td,fontWeight:800,color:C.purple,textAlign:"right"}}>{fmtCOP(totalInsCP)}</td>
              <td style={{...S.td,fontWeight:700,color:C.navy}}>100%</td>
            </tr>
          </tbody>
        </table>
        {totalInsCP===0&&<div style={{color:C.textFaint,fontSize:12,marginTop:12,textAlign:"center"}}>Sin insumos registrados.</div>}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,alignItems:"start",marginTop:20}}>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><div style={{fontWeight:700,fontSize:14,color:C.navy}}>Distribución de Costos — Central de Beneficio</div><div style={{fontSize:11,color:C.textDim,marginTop:2}}>% por rubro · {filtroMesDash==="todos"?"todos los meses":filtroMesDash.charAt(0).toUpperCase()+filtroMesDash.slice(1)}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:10,color:C.textDim}}>Total</div><div style={{fontSize:14,fontWeight:800,color:C.orange}}>{fmtCOP(cbPieTotal)}</div></div>
        </div>
        {cbPieData.length===0
          ?<div style={{color:C.textFaint,fontSize:13,textAlign:"center",padding:"40px 0"}}>Sin costos registrados para Central de Beneficio.</div>
          :(()=>{
            const PCOLS=[C.navy,C.teal,C.accent,C.green,C.purple,C.gold,C.orange,"#e11d48","#0369a1","#7c3aed","#059669","#b45309"];
            const cx=105,cy=105,r=88;
            if(cbPieData.length===1){
              const d=cbPieData[0];const col=PCOLS[0];
              return(<svg viewBox="0 0 420 215" width="100%" style={{display:"block",overflow:"visible"}}>
                <circle cx={cx} cy={cy} r={r} fill={col} stroke={C.panel} strokeWidth="2" opacity="0.93"/>
                <text x={cx} y={cy+6} textAnchor="middle" fontSize="20" fill="#fff" fontWeight="800" fontFamily="Inter,sans-serif">100%</text>
                <rect x="218" y="15" width="13" height="13" fill={col} rx="2"/><text x="236" y="25" fontSize="10.5" fill={C.text} fontFamily="Inter,sans-serif">{(d.tipo||"Sin tipo").length>19?(d.tipo||"Sin tipo").slice(0,18)+"…":(d.tipo||"Sin tipo")}</text>
                <text x="302" y="25" textAnchor="end" fontSize="10.5" fill={col} fontWeight="700" fontFamily="Inter,sans-serif">100%</text>
                <text x="418" y="25" textAnchor="end" fontSize="10" fill={C.textDim} fontFamily="Inter,sans-serif">{fmtCOP(d.val)}</text>
              </svg>);
            }
            let cum=0;
            const slices=cbPieData.map((d,i)=>{
              const frac=cbPieTotal>0?d.val/cbPieTotal:0;
              const s0=cum*2*Math.PI;cum+=frac;const s1=cum*2*Math.PI;
              const x1=cx+r*Math.cos(s0-Math.PI/2),y1=cy+r*Math.sin(s0-Math.PI/2);
              const x2=cx+r*Math.cos(s1-Math.PI/2),y2=cy+r*Math.sin(s1-Math.PI/2);
              const path=`M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${(s1-s0)>Math.PI?1:0} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
              const mid=(s0+s1)/2-Math.PI/2;
              return{...d,path,col:PCOLS[i%PCOLS.length],frac,mid};
            });
            const vH=Math.max(215,30+cbPieData.length*22+20);
            return(<svg viewBox={`0 0 420 ${vH}`} width="100%" style={{display:"block",overflow:"visible"}}>
              <circle cx={cx} cy={cy} r={r+3} fill={C.bg} stroke={C.border} strokeWidth="1"/>
              {slices.map(s=>(
                <g key={s.tipo}>
                  <path d={s.path} fill={s.col} stroke={C.panel} strokeWidth="2.5" opacity="0.93"/>
                  {s.frac>0.055&&(<text x={(cx+(r*0.62)*Math.cos(s.mid)).toFixed(2)} y={(cy+(r*0.62)*Math.sin(s.mid)+4).toFixed(2)} textAnchor="middle" fontSize="9.5" fill="#fff" fontWeight="700" fontFamily="Inter,sans-serif">{s.pct}%</text>)}
                </g>
              ))}
              {slices.map((s,i)=>{
                const ry=25+i*22;
                const tipo=s.tipo&&s.tipo.length>19?s.tipo.slice(0,18)+"…":(s.tipo||"Sin tipo");
                return(<g key={s.tipo+"_l"}>
                  <rect x="218" y={ry-10} width="13" height="13" fill={s.col} rx="2" opacity="0.9"/>
                  <text x="236" y={ry} fontSize="10.5" fill={C.text} fontFamily="Inter,sans-serif">{tipo}</text>
                  <text x="302" y={ry} textAnchor="end" fontSize="10.5" fill={s.col} fontWeight="700" fontFamily="Inter,sans-serif">{s.pct}%</text>
                  <text x="418" y={ry} textAnchor="end" fontSize="10" fill={C.textDim} fontFamily="Inter,sans-serif">{fmtCOP(s.val)}</text>
                </g>);
              })}
            </svg>);
          })()
        }
      </div>
      <div style={S.card}>
        <div style={{marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Costo Promedio por Unidad</div>
          <div style={{fontSize:11,color:C.textDim,marginTop:2}}>Costo por kg de producto terminado</div>
        </div>
        {[{label:"Costo MP / unidad",val:promA,col:C.gold,icon:"🌱"},{label:"Costo Insumos / unidad",val:promB,col:C.purple,icon:"🧪"},{label:"Costo MO Admin / unidad",val:promC,col:C.orange,icon:"⚙️"},{label:"Costo Total / unidad",val:promTotal,col:C.navy,icon:"💰",bold:true}].map(r=>(
          <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",marginBottom:8,borderRadius:10,background:r.bold?C.navy:C.bg,border:"1px solid "+(r.bold?C.navy:C.border),borderLeft:"4px solid "+r.col}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:15}}>{r.icon}</span>
              <span style={{fontSize:12,fontWeight:r.bold?700:500,color:r.bold?"#fff":C.text}}>{r.label}</span>
            </div>
            <div style={{fontSize:15,fontWeight:800,color:r.bold?"#fff":r.col,fontVariantNumeric:"tabular-nums",fontFamily:"Inter,sans-serif"}}>{fmtCOP(r.val)}</div>
          </div>
        ))}
        <div style={{marginTop:8,padding:"8px 12px",background:C.accentBg,borderRadius:8,fontSize:11,color:C.textDim,textAlign:"center"}}>{lotesCPFilt.filter(l=>l.kg_producto>0).length} lotes · {fmt(tp)} kg totales</div>
      </div>
    </div>
  </>);
}
