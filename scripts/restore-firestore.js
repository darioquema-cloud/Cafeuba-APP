// scripts/restore-firestore.js
// RECUPERA (restaura) la base de datos desde una carpeta de respaldo.
// ADVERTENCIA: esto SOBRESCRIBE los datos actuales en Firestore con los del respaldo.
// Usar solo en una emergencia real, o para probar en un proyecto de Firebase distinto.
//
// Uso: node scripts/restore-firestore.js 2026-09-10
// (el argumento es la fecha exacta de la carpeta dentro de /respaldos que quieres restaurar)
//
// Por seguridad, pide confirmacion escrita antes de tocar cualquier dato.
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

try{process.loadEnvFile?.();}catch{}

const __dirname=path.dirname(fileURLToPath(import.meta.url));

const fechaArg=process.argv[2];
if(!fechaArg){
  console.error("Falta indicar la fecha del respaldo a restaurar.");
  console.error("Uso: node scripts/restore-firestore.js AAAA-MM-DD");
  process.exit(1);
}

const carpeta=path.join(__dirname,"..","respaldos",fechaArg);
if(!fs.existsSync(carpeta)){
  console.error(`No existe la carpeta de respaldo: ${carpeta}`);
  process.exit(1);
}

let serviceAccount;
if(process.env.FIREBASE_SERVICE_ACCOUNT){
  serviceAccount=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
}else if(process.env.FIREBASE_SERVICE_ACCOUNT_PATH){
  serviceAccount=JSON.parse(fs.readFileSync(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),"utf-8"));
}else{
  console.error("Falta la clave de servicio. Define FIREBASE_SERVICE_ACCOUNT o FIREBASE_SERVICE_ACCOUNT_PATH.");
  process.exit(1);
}

admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
const db=admin.firestore();

const archivos=fs.readdirSync(carpeta).filter(f=>f.endsWith(".json")&&f!=="_resumen.json");
const colecciones=archivos.map(f=>f.replace(".json",""));

function preguntar(txt){
  const rl=createInterface({input:process.stdin,output:process.stdout});
  return new Promise(resolve=>rl.question(txt,ans=>{rl.close();resolve(ans);}));
}

async function restaurar(){
  console.log(`\n=====================================================`);
  console.log(`ADVERTENCIA: esto va a SOBRESCRIBIR datos reales en Firestore.`);
  console.log(`Respaldo a restaurar: ${fechaArg}`);
  console.log(`Colecciones encontradas: ${colecciones.join(", ")}`);
  console.log(`=====================================================\n`);

  const resp=await preguntar('Escribe exactamente "RESTAURAR" (mayusculas) para continuar, o cualquier otra cosa para cancelar: ');
  if(resp.trim()!=="RESTAURAR"){
    console.log("Cancelado. No se modifico nada.");
    process.exit(0);
  }

  let totalDocs=0;
  for(const coleccion of colecciones){
    const datos=JSON.parse(fs.readFileSync(path.join(carpeta,`${coleccion}.json`),"utf-8"));
    console.log(`Restaurando ${coleccion}: ${datos.length} documentos...`);
    const batchSize=400; // limite seguro por lote de Firestore
    for(let i=0;i<datos.length;i+=batchSize){
      const lote=db.batch();
      const trozo=datos.slice(i,i+batchSize);
      trozo.forEach(item=>{
        const{id,...campos}=item;
        lote.set(db.collection(coleccion).doc(id),campos);
      });
      await lote.commit();
    }
    console.log(`  OK ${coleccion} restaurada.`);
    totalDocs+=datos.length;
  }

  console.log(`\nRestauracion completa: ${totalDocs} documentos en total.`);
}

restaurar().catch(e=>{console.error("Error durante la restauracion:",e);process.exit(1);});
