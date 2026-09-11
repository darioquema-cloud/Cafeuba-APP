# Respaldos de la base de datos — CafeUba

## Que es esto

Cada 15 dias (el dia 1 y el dia 16 de cada mes), el sistema guarda automaticamente una
copia completa de toda tu base de datos, dentro de la carpeta respaldos/ de este mismo
repositorio — cada copia queda en su propia carpeta con la fecha, por ejemplo
respaldos/2026-09-16/.

No tienes que hacer nada para que esto funcione — corre solo, en los servidores de
GitHub, sin depender de que tu computador este prendido.

## Como ver un respaldo

Simplemente haz git pull como siempre en tu proyecto — la carpeta respaldos/ va a
aparecer con las copias mas recientes. Cada coleccion de datos (lotes, costos, ventas,
etc.) queda en su propio archivo .json dentro de la carpeta de esa fecha.

Ademas de los .json, cada carpeta tambien incluye un archivo unico
respaldo_AAAA-MM-DD.xlsx — un solo Excel con todas las colecciones, cada una en su propia
pestana, listo para abrir directamente sin depender de JSON.

## Como correr un respaldo manual (sin esperar la fecha automatica)

Si en algun momento quieres un respaldo AHORA MISMO, sin esperar al dia 1 o 16:

1. Ve a tu repositorio en GitHub -> pestana "Actions" (arriba).
2. En la lista de la izquierda, busca "Respaldo quincenal de Firestore".
3. A la derecha, veras un boton "Run workflow" -> dale clic -> confirma.
4. En unos minutos, el respaldo nuevo va a aparecer en respaldos/ -> haz git pull para
   verlo.

## Como RECUPERAR (restaurar) la base de datos en una emergencia

Esto es solo para una emergencia real (se borro o dano algo importante) — sobrescribe
los datos actuales con los del respaldo que elijas.

1. Abre PowerShell en la carpeta de tu proyecto:
   cd "C:\Users\darqu\OneDrive\Desktop\cafeuba-app"
2. Necesitas la misma llave de Firebase que ya descargaste (Paso 1 de la configuracion
   inicial) — colocala en la carpeta del proyecto con el nombre exacto
   firebase-service-account.json (esa carpeta ya la ignora git, asi que es seguro
   dejarla ahi).
3. Corre:
   node scripts/restore-firestore.js 2026-09-16
   (cambia la fecha por la del respaldo exacto que quieras recuperar — revisa las carpetas
   dentro de respaldos/ para ver cuales existen).
4. El sistema te va a pedir que escribas la palabra "RESTAURAR" (en mayusculas) para
   confirmar, como medida de seguridad — si escribes cualquier otra cosa, cancela sin tocar
   nada.
5. Espera a que termine — te va a mostrar cuantos documentos se restauraron por cada
   coleccion.

## Como correr un respaldo o restauracion manual sin el archivo de llave

En vez del archivo firebase-service-account.json, tambien puedes crear un archivo .env
(en la raiz del proyecto, tambien ignorado por git) con:

FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

Los scripts leen automaticamente ese .env si existe.

## Importante

- La llave de Firebase (firebase-service-account.json) nunca debe subirse a GitHub — ya
  esta configurado para que git la ignore automaticamente, pero de todas formas revisa
  antes de comitear que no aparezca por accidente en `git status`.
- Esa misma llave, en su version JSON completa, es la que esta guardada como el Secret
  FIREBASE_SERVICE_ACCOUNT en GitHub (pestana Settings -> Secrets and variables ->
  Actions del repositorio) — de ahi la lee el respaldo automatico, sin que quede expuesta
  en ningun archivo del codigo.
- La restauracion (scripts/restore-firestore.js) SOBRESCRIBE datos reales. Usala solo en
  una emergencia real y con la fecha correcta — si tienes duda de cual fecha usar, revisa
  primero las carpetas dentro de respaldos/ antes de correr el comando.
