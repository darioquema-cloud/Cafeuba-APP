export const fmtCOP=n=>(n==null||n===""||isNaN(n))?"":"$ "+Number(n).toLocaleString("es-CO",{minimumFractionDigits:1,maximumFractionDigits:1});
export const fmt=(n,d=0)=>(n==null||isNaN(n))?"":Number(n).toLocaleString("es-CO",{minimumFractionDigits:d,maximumFractionDigits:d});
export const numVal=(v,fallback=0)=>{const n=+v;return isFinite(n)&&!isNaN(n)?n:fallback;};
export const today=()=>new Date().toISOString().slice(0,10);
export const genId=()=>Math.random().toString(36).slice(2,8).toUpperCase();
export const dateToCode=(d)=>{if(!d)return"";const[y,m,dd]=d.split("-");return dd+m+y;};
export const fmtFecha=(d)=>{if(!d||typeof d!=="string")return"—";const p=d.split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:d;};
