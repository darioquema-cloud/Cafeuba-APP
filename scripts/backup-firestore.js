// scripts/backup-firestore.js
// Respaldo manual (o automatico via GitHub Actions) de Firestore.
// Uso manual: node scripts/backup-firestore.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Carga un .env local si existe (no hace falta en GitHub Actions, donde el
// Secret llega directo como variable de entorno).
try{process.loadEnvFile?.();}catch{}

const __dirname=path.dirname(fileURLToPath(import.meta.url));

// La clave de servicio se lee de una variable de entorno (segura, nunca en el codigo).
// En GitHub Actions, viene del Secret FIREBASE_SERVICE_ACCOUNT.
// Para correrlo a mano en tu computador, crea un archivo .env con
// FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json (ver README-RESPALDOS.md)
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

// Lista actualizada — todas las colecciones reales que usa la app hoy.
const COLECCIONES=[
  "usuarios","lotes","costos","blends","lotesFino","blendsFino","maquilas",
  "blendsTostado","empaques","tiposEmpaque","subprodVerde","subprodPerg",
  "permisosConfig","inventariosMensuales","pedidos","oportunidades","muestras",
  "visitas","necesidadesTostado","bitacora_actividad"
];

// Excel no permite nombres de hoja de mas de 31 caracteres ni ciertos simbolos.
function nombreHoja(coleccion){
  return coleccion.slice(0,31).replace(/[\\/?*[\]:]/g,"_");
}

// Convierte cada documento (que puede tener campos anidados: objetos, arreglos) a un
// formato plano de una sola fila, apto para una hoja de Excel.
function aplanarParaExcel(datos){
  const LIMITE_EXCEL=32000; // un poco por debajo del limite real (32767) por seguridad
  return datos.map(doc=>{
    const fila={};
    for(const[key,val]of Object.entries(doc)){
      if(val===null||val===undefined){fila[key]="";}
      else if(typeof val==="object"){
        let texto=JSON.stringify(val);
        if(texto.length>LIMITE_EXCEL){
          texto=texto.slice(0,LIMITE_EXCEL)+"...[TRUNCADO, ver el archivo .json para el dato completo]";
        }
        fila[key]=texto;
      }
      else{fila[key]=val;}
    }
    return fila;
  });
}

async function respaldar(){
  const fecha=new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const carpeta=path.join(__dirname,"..","respaldos",fecha);
  fs.mkdirSync(carpeta,{recursive:true});

  console.log(`Iniciando respaldo — ${fecha}`);
  let totalDocs=0;
  const resumen={fecha,colecciones:{}};
  const libro=XLSX.utils.book_new();

  for(const coleccion of COLECCIONES){
    const snap=await db.collection(coleccion).get();
    const datos=snap.docs.map(d=>({id:d.id,...d.data()}));
    fs.writeFileSync(
      path.join(carpeta,`${coleccion}.json`),
      JSON.stringify(datos,null,2),
      "utf-8"
    );

    const hoja=XLSX.utils.json_to_sheet(datos.length>0?aplanarParaExcel(datos):[{aviso:"Sin datos en esta coleccion"}]);
    XLSX.utils.book_append_sheet(libro,hoja,nombreHoja(coleccion));

    console.log(`  OK ${coleccion}: ${datos.length} documentos`);
    resumen.colecciones[coleccion]=datos.length;
    totalDocs+=datos.length;
  }

  XLSX.writeFile(libro,path.join(carpeta,`respaldo_${fecha}.xlsx`));
  fs.writeFileSync(path.join(carpeta,"_resumen.json"),JSON.stringify(resumen,null,2),"utf-8");

  console.log(`\nRespaldo completo: ${totalDocs} documentos en total.`);
  console.log(`Guardado en: ${carpeta}`);
  console.log(`Excel generado: respaldo_${fecha}.xlsx`);
}

respaldar().catch(e=>{console.error("Error en el respaldo:",e);process.exit(1);});
