import{SEED_COSTOS_TRI}from"../data/constants";
export const getSeedCostoTri=(codigo,kgProducto)=>{const byKg=SEED_COSTOS_TRI.find(r=>r.codigo===codigo&&Math.abs(r.kg-(kgProducto||0))<1);return byKg?.costo||(SEED_COSTOS_TRI.find(r=>r.codigo===codigo)?.costo||0);};
export const calcCosto=(lote,costos,lotes)=>{
  if(!lote.kg_producto||lote.kg_producto===0)return null;
  if(lote.origen_lote==="carga_directa"){const dk=lote.costo_directo_kg||0;return{totalCereza:0,totalIns:0,a:dk,b:0,c:0,total:dk};}
  const totalCereza=(lote.cereza||[]).reduce((s,c)=>s+c.kg*c.valor_kg,0);
  const ins=lote.insumos||{};
  const totalIns=(ins.jugo||0)*(ins.vr_jugo||0)+(ins.panela||0)*(ins.vr_panela||0)+(ins.harina||0)*(ins.vr_harina||0)+(ins.levadura||0)*(ins.vr_levadura||0);
  const a=totalCereza>0?totalCereza/lote.kg_producto:(lote.trilla?.costo_kg_excelso||lote.costo_directo_kg||0);
  const b=totalIns/lote.kg_producto;
  let c_val=0;
  if(lote.origen_lote!=="trilla_directa"){
    const costosCBMes=(costos||[]).filter(c=>c.centro==="Central de Beneficio"&&c.mes===lote.mes).reduce((s,c)=>s+c.valor,0);
    const kgPergaminoMes=(lotes||[lote]).filter(l=>l.mes===lote.mes&&l.kg_producto>0&&l.origen_lote!=="trilla_directa"&&l.tipo!=="Manual"&&l.origen_lote!=="carga_directa").reduce((s,l)=>s+l.kg_producto,0);
    c_val=kgPergaminoMes>0?costosCBMes/kgPergaminoMes:0;
  }
  return{totalCereza,totalIns,a,b,c:c_val,total:a+b+c_val};
};
export const calcCostoTri=(mes,costos,lotes)=>{
  const costosTri=(costos||[]).filter(c=>c.centro==="Trilladora"&&c.mes===mes).reduce((s,c)=>s+c.valor,0);
  const kgEx=lotes.filter(l=>l.mes===mes&&l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  return{costosTri,kgEx,costoTriKg:kgEx>0?costosTri/kgEx:0};
};
