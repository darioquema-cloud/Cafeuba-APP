import{MESES}from"../data/constants";
export const semanaISO=(d)=>{if(!d)return"";const dt=new Date(d+"T00:00:00");dt.setHours(0,0,0,0);dt.setDate(dt.getDate()+3-((dt.getDay()+6)%7));const w1=new Date(dt.getFullYear(),0,4);return 1+Math.round(((dt-w1)/86400000-3+((w1.getDay()+6)%7))/7);};
export const mesDe=(d)=>d?MESES[new Date(d+"T00:00:00").getMonth()]:"";
export const diasEntre=(a,b)=>a&&b?Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000):null;
