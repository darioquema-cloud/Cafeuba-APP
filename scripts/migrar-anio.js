// scripts/migrar-anio.js
// FASE 1 del proyecto multi-mes: agrega los campos "anio" y "mesAnio" a los documentos
// existentes de Firestore que hoy solo tienen "mes" (nombre del mes sin año), para que a
// partir de 2027 los meses repetidos entre años distintos se puedan distinguir.
//
// No modifica ni reemplaza el campo "mes" existente. Solo agrega anio/mesAnio.
//
// Uso:
//   node scripts/migrar-anio.js              -> modo diagnostico (no escribe nada)
//   node scripts/migrar-anio.js --aplicar     -> pide confirmacion y escribe los cambios
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

try{process.loadEnvFile?.();}catch{}

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const APLICAR=process.argv.includes("--aplicar");

let serviceAccount;
if(process.env.FIREBASE_SERVICE_ACCOUNT){
  serviceAccount=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
}else if(process.env.FIREBASE_SERVICE_ACCOUNT_PATH){
  serviceAccount=JSON.parse(fs.readFileSync(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),"utf-8"));
}else{
  console.error("Falta la clave de servicio. Define FIREBASE_SERVICE_ACCOUNT (contenido JSON) o FIREBASE_SERVICE_ACCOUNT_PATH (ruta al archivo).");
  process.exit(1);
}

const app=initializeApp({credential:cert(serviceAccount)});
const db=getFirestore(app);

// Mismas funciones que src/lib/dates.js (no se puede importar directo: ese archivo usa
// alias de Vite ("../data/constants") que Node no resuelve fuera del bundler).
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesDe=(d)=>d?MESES[new Date(d+"T00:00:00").getMonth()]:"";
const anioDe=(d)=>d?new Date(d+"T00:00:00").getFullYear():null;
const mesAnioDe=(d)=>{
  const m=mesDe(d),a=anioDe(d);
  return(m&&a)?`${m}-${a}`:"";
};

// Por cada coleccion, el campo de fecha real que usa hoy para calcular "mes" (revisado
// caso por caso en el codigo fuente, no asumido).
//
// Notas:
// - "lotes": el formulario de Recepcion y los registros manuales siempre escriben
//   fecha_proceso y fecha_recibo con el mismo valor. Se usa fecha_proceso, con fecha_recibo
//   como respaldo por si algun documento antiguo solo tiene uno de los dos.
// - "necesidadesTostado" quedo FUERA de esta lista a proposito (confirmado con Dario): esa
//   coleccion nunca tuvo un campo "mes" — se organiza por "trimestre" (texto libre, ej. "Q3
//   2026"), no por mes calculado de una fecha, y su unico campo de fecha (fecha_requerida)
//   suele venir vacio. Migrarla no corrige ningun bug de agrupacion real, asi que se deja
//   para revisarla aparte si alguna vez hace falta.
const COLECCIONES=[
  { nombre:"lotes",           campoFecha:["fecha_proceso","fecha_recibo"] },
  { nombre:"costos",          campoFecha:["fecha"] },
  { nombre:"blends",          campoFecha:["fecha"] },
  { nombre:"lotesFino",       campoFecha:["fecha"] },
  { nombre:"blendsFino",      campoFecha:["fecha"] },
  { nombre:"maquilas",        campoFecha:["fecha"] },
  { nombre:"blendsTostado",   campoFecha:["fecha"] },
  { nombre:"subprodVerde",    campoFecha:["fecha"] },
  { nombre:"mezclasSubKorea", campoFecha:["fecha"] },
  { nombre:"inventariosMensuales", campoFecha:["fecha_conteo"] },
  { nombre:"pedidos",         campoFecha:["fecha_registro"] },
  { nombre:"oportunidades",   campoFecha:["fecha_registro"] },
];

function fechaDelDoc(datos,campos){
  for(const campo of campos){
    if(datos[campo])return datos[campo];
  }
  return null;
}

// anio y mesAnio se evaluan por separado (no como un solo bloque "ya migrado"): algunos
// documentos de inventariosMensuales ya traen "anio" desde codigo de la app que lo agrega
// al crear el registro, pero ninguno trae todavia "mesAnio" (esa funcion no existia antes
// de esta migracion). Si se tratara como condicion conjunta, esos documentos se saltarian
// por completo y se quedarian sin mesAnio.
async function diagnosticar(){
  console.log(`\nModo DIAGNOSTICO (no se escribe nada). Para aplicar los cambios: node scripts/migrar-anio.js --aplicar\n`);
  const resumen=[];
  for(const{nombre,campoFecha}of COLECCIONES){
    const snap=await db.collection(nombre).get();
    let sinFecha=0,yaCompleto=0,aMigrar=0;
    snap.docs.forEach(doc=>{
      const datos=doc.data();
      const fecha=fechaDelDoc(datos,campoFecha);
      if(!fecha){sinFecha++;return;}
      const faltaAnio=datos.anio===undefined||datos.anio===null;
      const faltaMesAnio=datos.mesAnio===undefined||datos.mesAnio===null||datos.mesAnio==="";
      if(!faltaAnio&&!faltaMesAnio){yaCompleto++;return;}
      aMigrar++;
    });
    resumen.push({nombre,campoFecha:campoFecha[0],total:snap.size,aMigrar,yaCompleto,sinFecha});
    console.log(`  ${nombre.padEnd(20)} (campo fecha: ${campoFecha.join(" / ")})  total=${snap.size}  a_migrar=${aMigrar}  ya_completos=${yaCompleto}  sin_fecha=${sinFecha}`);
  }
  const totales=resumen.reduce((a,r)=>({aMigrar:a.aMigrar+r.aMigrar,yaCompleto:a.yaCompleto+r.yaCompleto,sinFecha:a.sinFecha+r.sinFecha}),{aMigrar:0,yaCompleto:0,sinFecha:0});
  console.log(`\nTotal a migrar: ${totales.aMigrar}  |  Ya completos: ${totales.yaCompleto}  |  Sin fecha (no se tocan): ${totales.sinFecha}`);
  console.log(`\nRevisa que los numeros se vean razonables. Si todo esta bien, corre: node scripts/migrar-anio.js --aplicar`);
}

function preguntar(txt){
  const rl=createInterface({input:process.stdin,output:process.stdout});
  return new Promise(resolve=>rl.question(txt,ans=>{rl.close();resolve(ans);}));
}

async function aplicar(){
  console.log(`\n=====================================================`);
  console.log(`Esto va a AGREGAR los campos "anio" y "mesAnio" a documentos existentes en Firestore.`);
  console.log(`No se modifica ni se borra ningun otro campo (incluido "mes", que se queda igual).`);
  console.log(`Colecciones: ${COLECCIONES.map(c=>c.nombre).join(", ")}`);
  console.log(`=====================================================\n`);

  const resp=await preguntar('Escribe exactamente "MIGRAR" (mayusculas) para continuar, o cualquier otra cosa para cancelar: ');
  if(resp.trim()!=="MIGRAR"){
    console.log("Cancelado. No se modifico nada.");
    process.exit(0);
  }

  const resumen=[];
  for(const{nombre,campoFecha}of COLECCIONES){
    const snap=await db.collection(nombre).get();
    const pendientes=[];
    let yaCompleto=0,sinFecha=0;
    snap.docs.forEach(doc=>{
      const datos=doc.data();
      const fecha=fechaDelDoc(datos,campoFecha);
      if(!fecha){sinFecha++;return;}
      const faltaAnio=datos.anio===undefined||datos.anio===null;
      const faltaMesAnio=datos.mesAnio===undefined||datos.mesAnio===null||datos.mesAnio==="";
      if(!faltaAnio&&!faltaMesAnio){yaCompleto++;return;}
      const cambios={};
      if(faltaAnio)cambios.anio=anioDe(fecha);
      if(faltaMesAnio)cambios.mesAnio=mesAnioDe(fecha);
      pendientes.push({ref:doc.ref,cambios});
    });

    console.log(`Migrando ${nombre}: ${pendientes.length} documentos...`);
    const batchSize=400;
    for(let i=0;i<pendientes.length;i+=batchSize){
      const lote=db.batch();
      pendientes.slice(i,i+batchSize).forEach(({ref,cambios})=>lote.update(ref,cambios));
      await lote.commit();
    }
    console.log(`  OK ${nombre}: ${pendientes.length} migrados, ${yaCompleto} ya completos, ${sinFecha} sin fecha.`);
    resumen.push({nombre,migrados:pendientes.length,yaCompleto,sinFecha});
  }

  console.log(`\n=====================================================`);
  console.log(`Migracion completa. Resumen por coleccion:`);
  resumen.forEach(r=>console.log(`  ${r.nombre.padEnd(20)} migrados=${r.migrados}  ya_completos=${r.yaCompleto}  sin_fecha=${r.sinFecha}`));
  const totales=resumen.reduce((a,r)=>({migrados:a.migrados+r.migrados,yaCompleto:a.yaCompleto+r.yaCompleto,sinFecha:a.sinFecha+r.sinFecha}),{migrados:0,yaCompleto:0,sinFecha:0});
  console.log(`\nTotal migrados: ${totales.migrados}  |  Ya completos: ${totales.yaCompleto}  |  Sin fecha: ${totales.sinFecha}`);
}

(APLICAR?aplicar():diagnosticar()).catch(e=>{console.error("Error en la migracion:",e);process.exit(1);});
