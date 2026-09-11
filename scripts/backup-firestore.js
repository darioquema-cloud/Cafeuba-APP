// scripts/backup-firestore.js
// Respaldo manual (o automatico via GitHub Actions) de Firestore.
// Uso manual: node scripts/backup-firestore.js
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

async function respaldar(){
  const fecha=new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const carpeta=path.join(__dirname,"..","respaldos",fecha);
  fs.mkdirSync(carpeta,{recursive:true});

  console.log(`Iniciando respaldo — ${fecha}`);
  let totalDocs=0;
  const resumen={fecha,colecciones:{}};

  for(const coleccion of COLECCIONES){
    const snap=await db.collection(coleccion).get();
    const datos=snap.docs.map(d=>({id:d.id,...d.data()}));
    fs.writeFileSync(
      path.join(carpeta,`${coleccion}.json`),
      JSON.stringify(datos,null,2),
      "utf-8"
    );
    console.log(`  OK ${coleccion}: ${datos.length} documentos`);
    resumen.colecciones[coleccion]=datos.length;
    totalDocs+=datos.length;
  }

  fs.writeFileSync(path.join(carpeta,"_resumen.json"),JSON.stringify(resumen,null,2),"utf-8");
  console.log(`\nRespaldo completo: ${totalDocs} documentos en total.`);
  console.log(`Guardado en: ${carpeta}`);
}

respaldar().catch(e=>{console.error("Error en el respaldo:",e);process.exit(1);});
