import{MESES}from"../data/constants";
export const semanaISO=(d)=>{if(!d)return"";const dt=new Date(d+"T00:00:00");dt.setHours(0,0,0,0);dt.setDate(dt.getDate()+3-((dt.getDay()+6)%7));const w1=new Date(dt.getFullYear(),0,4);return 1+Math.round(((dt-w1)/86400000-3+((w1.getDay()+6)%7))/7);};
export const mesDe=(d)=>d?MESES[new Date(d+"T00:00:00").getMonth()]:"";
export const anioDe=(d)=>d?new Date(d+"T00:00:00").getFullYear():null;
export const mesAnioDe=(d)=>{
  const m=mesDe(d),a=anioDe(d);
  return(m&&a)?`${m}-${a}`:"";
};
export const mesTrillaDe=(l)=>mesDe(l?.trilla?.fecha_trilla);
export const mesAnioTrillaDe=(l)=>mesAnioDe(l?.trilla?.fecha_trilla);
export const diasEntre=(a,b)=>a&&b?Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000):null;
export const ordenarMesAnio=(lista)=>{
  return[...new Set(lista)].filter(Boolean).sort((a,b)=>{
    const[ma,aa]=a.split("-"),[mb,ab]=b.split("-");
    return(+aa)*100+MESES.indexOf(ma)-((+ab)*100+MESES.indexOf(mb));
  });
};
export const formatMesAnio=(mesAnio)=>{
  if(!mesAnio)return"";
  const[m,a]=mesAnio.split("-");
  return m?`${m.charAt(0).toUpperCase()+m.slice(1)} ${a}`:"";
};
