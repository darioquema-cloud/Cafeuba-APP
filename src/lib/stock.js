export const pesoATrilladora=(l)=>(l.salidas_bodega||[]).filter(s=>s.destino_key==="trilla").reduce((s,x)=>s+x.peso_salida,0);
export const pesoATrilladoraCafeFino=(l)=>(l.salidas_bodega||[]).filter(s=>s.destino_key==="trilla_cf").reduce((s,x)=>s+x.peso_salida,0);
export const pesoOtrosBodega=(l)=>(l.salidas_bodega||[]).filter(s=>s.destino_key!=="trilla"&&s.destino_key!=="trilla_cf").reduce((s,x)=>s+x.peso_salida,0);
