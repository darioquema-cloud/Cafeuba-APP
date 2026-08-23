// scripts/backup-firestore.js
// Respaldo manual de Firestore — ejecutar con: node scripts/backup-firestore.js
const admin=require("firebase-admin");
const fs=require("fs");
const path=require("path");

// Ruta a la clave de servicio (NUNCA subir este archivo a git — ver Paso 3)
const serviceAccount=require("../firebase-service-account.json");

admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
const db=admin.firestore();

const COLECCIONES=[
  "usuarios","lotes","costos","blends","lotesFino","blendsFino","maquilas",
  "blendsTostado","empaques","ventasTostado","configEmpaque","subprodVerde",
  "subprodPerg","permisosConfig","inventariosMensuales","pedidos","oportunidades",
  "muestras","visitas"
];

async function respaldar(){
  const fecha=new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const carpeta=path.join(__dirname,"..","respaldos",fecha);
  fs.mkdirSync(carpeta,{recursive:true});

  console.log(`Iniciando respaldo — ${fecha}`);
  let totalDocs=0;

  for(const coleccion of COLECCIONES){
    const snap=await db.collection(coleccion).get();
    const datos=snap.docs.map(d=>({id:d.id,...d.data()}));
    fs.writeFileSync(
      path.join(carpeta,`${coleccion}.json`),
      JSON.stringify(datos,null,2),
      "utf-8"
    );
    console.log(`  ✓ ${coleccion}: ${datos.length} documentos`);
    totalDocs+=datos.length;
  }

  console.log(`\nRespaldo completo: ${totalDocs} documentos en total.`);
  console.log(`Guardado en: ${carpeta}`);
}

respaldar().catch(e=>{console.error("Error en el respaldo:",e);process.exit(1);});
