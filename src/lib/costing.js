import{SEED_COSTOS_TRI}from"../data/constants";
import{mesDe}from"./dates";
import{mesTrillaDe}from"./dates";
import{pesoATrilladora,pesoATrilladoraCafeFino}from"./stock";
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
  const kgEx=lotes.filter(l=>mesDe(l.trilla?.fecha_trilla)===mes&&l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  return{costosTri,kgEx,costoTriKg:kgEx>0?costosTri/kgEx:0};
};

export const costoKgExDe=(l,costos,lotes)=>{
  const cl=calcCosto(l,costos,lotes);
  const t=l.trilla;
  const D=calcCostoTri(mesTrillaDe(l),costos,lotes).costoTriKg;
  return cl&&t?.kg_excelso>0?Math.round((cl.total*pesoATrilladora(l))/t.kg_excelso)+Math.round(D):0;
};

export const calcCostoTriCF=(mes,costos,lotesFino)=>{
  const costosTri=(costos||[]).filter(c=>c.centro==="Bodega Cafe Fino"&&c.mes===mes).reduce((s,c)=>s+c.valor,0);
  const kgEx=(lotesFino||[]).filter(l=>l.para_trilladora&&mesTrillaDe(l)===mes&&l.trilla?.kg_excelso>0).reduce((s,l)=>s+(l.trilla.kg_excelso||0),0);
  return{costosTri,kgEx,costoTriKg:kgEx>0?costosTri/kgEx:0};
};

export const costoKgExDeCafeFino=(l,costos,lotesFino)=>{
  const cl=calcCosto(l,costos,lotesFino);
  const t=l.trilla;
  const D=calcCostoTriCF(mesTrillaDe(l),costos,lotesFino).costoTriKg;
  return cl&&t?.kg_excelso>0?Math.round((cl.total*pesoATrilladoraCafeFino(l))/t.kg_excelso)+Math.round(D):0;
};

export const esPlaceholderCarga=(l)=>l.trilla?.factor_industrial===0&&l.trilla?.factor_pretrilla_ponderado===0;

export const ponderarFactor=(arr,campo)=>{
  const con=arr.filter(l=>!esPlaceholderCarga(l)&&l.trilla?.[campo]!=null);
  const peso=con.reduce((s,l)=>s+pesoATrilladora(l),0);
  return peso>0?con.reduce((s,l)=>s+pesoATrilladora(l)*l.trilla[campo],0)/peso:null;
};

export const esVentaExterna=s=>(!s.destino_key||s.destino_key===""||s.destino_key==="otro"||s.destino_key==="venta")&&!s.auto_blend;

export const grupoDeBTF=(l,lotesFino)=>[l,...(lotesFino||[]).filter(x=>(l.trilla?.lotes_combinados||[]).includes(x.id))];

export const construirGruposBTF=(arr,lotesFino)=>{
  const vistos=new Set();const gs=[];
  arr.forEach(l=>{if(vistos.has(l.id))return;const g=grupoDeBTF(l,lotesFino);g.forEach(x=>vistos.add(x.id));gs.push(g);});
  return gs;
};

export const stockGrupoBTF=(grupo,cutoff)=>{
  const exc=grupo.reduce((s,x)=>s+(x.trilla?.kg_excelso||0),0);
  const sal=grupo.reduce((s,x)=>s+(x.salidas_trilladora||[]).filter(sd=>!cutoff||sd.fecha<=cutoff).reduce((a,b)=>a+b.peso_salida,0),0);
  return exc-sal;
};

export const costoKgExFinoDe=(grupo,costos,lotesFino)=>{
  let base=0;
  for(const x of grupo){if(x.trilla?.costo_kg_excelso>0){base=x.trilla.costo_kg_excelso;break;}}
  if(base===0){for(const x of grupo){if(x.costo_compra_kg>0){base=x.costo_compra_kg;break;}}}
  if(base===0)return 0;
  const d=calcCostoTriCF(mesTrillaDe(grupo[0]),costos,lotesFino).costoTriKg||0;
  return base+d;
};

export const calcCostoTuesteMes=(mes,costos,historico)=>{
  const costosTueste=(costos||[]).filter(c=>c.centro==="Tostado"&&c.mes===mes).reduce((s,c)=>s+c.valor,0);
  const kgTostado=(historico||[]).filter(t=>mesDe(t.fecha)===mes&&(t.kg_cafe_tostado||0)>0).reduce((s,t)=>s+(t.kg_cafe_tostado||0),0);
  return{costosTueste,kgTostado,costoTuesteKg:kgTostado>0?costosTueste/kgTostado:0};
};

export const calcCostoMaquilaMes=(mes,costos,maquilas)=>{
  const costosMQ=(costos||[]).filter(c=>c.centro==="Maquila"&&c.mes===mes).reduce((s,c)=>s+c.valor,0);
  const kgRecibidos=(maquilas||[]).filter(m=>(m.mes||mesDe(m.fecha))===mes&&(m.kg_recibidos||0)>0).reduce((s,m)=>s+(m.kg_recibidos||0),0);
  return{costosMQ,kgRecibidos,costoMQKg:kgRecibidos>0?costosMQ/kgRecibidos:0};
};
