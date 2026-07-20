import{useState}from"react";
import{C,S}from"../../theme";
import{genId,dateToCode,today}from"../../lib/format";
import{semanaISO,mesDe}from"../../lib/dates";
export function BulkLoader({lotes,setLotes,blends,setBlends,setCostos,lotesFino,setLotesFino,blendsFino,setBlendsFino,setMaquilas,setBlendsTostado,setUsuarios}){
  const [status,setStatus]=useState("idle");
  const [statusCF,setStatusCF]=useState("idle");
  const [statusCostos,setStatusCostos]=useState("idle");
  const [confirmCostos,setConfirmCostos]=useState(false);
  const [wipeStatus,setWipeStatus]=useState("idle");
  const [statusDupli,setStatusDupli]=useState("idle");
  const [log,setLog]=useState([]);
  const [logCF,setLogCF]=useState([]);
  const [logCostos,setLogCostos]=useState([]);
  const [logDupli,setLogDupli]=useState([]);
  const INS0={jugo:0,panela:0,harina:0,levadura:0,vr_jugo:0,vr_panela:0,vr_harina:0,vr_levadura:0};
  const excF=d=>new Date((d-25569)*86400000).toISOString().slice(0,10);
  const rawMilan=[
    {codigo:"MB L7-6 Y CAPRI 151125",fecha:"2026-01-31",mes:"enero",producto:"MB",kg:405,costo:28191.78},
    {codigo:"MB CAPRI LOTE 15-LOTE 12-VECINO 201125",fecha:"2026-01-31",mes:"enero",producto:"MB",kg:160,costo:26412.25},
    {codigo:"Barredura 310326",fecha:"2026-03-31",mes:"marzo",producto:"PAS",kg:73,costo:0},
    {codigo:"CPS Sin identificacion",fecha:"2026-03-31",mes:"marzo",producto:"Regional",kg:182,costo:0},
    {codigo:"Excelso Sin identificacion",fecha:"2026-03-31",mes:"marzo",producto:"Regional Excelso",kg:81,costo:0},
    {codigo:"LVD-BIOMASTER-100426",fecha:"2026-04-23",mes:"abril",producto:"BIO",kg:102.2,costo:40034.47705008096},
    {codigo:"RIV-LVD-BIOMASTER-280326",fecha:"2026-04-30",mes:"abril",producto:"BIO",kg:98,costo:48785.94000494723},
    {codigo:"LVD-BIOMASTER-210326",fecha:"2026-04-30",mes:"abril",producto:"BIO",kg:73,costo:37232.18439238451},
    {codigo:"L 15-14-NAT-NAT-150526",fecha:"2026-06-08",mes:"junio",producto:"NAT",kg:104.2,costo:35940.96989941069},
    {codigo:"RIVIERA -SAN ISIDRO-NAT-NAT-030626",fecha:"2026-06-30",mes:"junio",producto:"NAT",kg:180,costo:32776.38653645601},
    {codigo:"CLTG-DR-030626",fecha:"2026-06-17",mes:"junio",producto:"DR",kg:660.2,costo:38420.23062242539},
    {codigo:"CLTG-AR-100626",fecha:"2026-06-18",mes:"junio",producto:"AR",kg:839.2,costo:36344.32801126943},
    {codigo:"LVD-LVD-110626",fecha:"2026-06-18",mes:"junio",producto:"REGIONAL",kg:357.2,costo:34804.40152833351},
    {codigo:"TERMO-NAT-NAT-030626",fecha:"2026-06-18",mes:"junio",producto:"NAT",kg:154.2,costo:26760.615927137016},
    {codigo:"GESHA CAPRI RIVIERA-NAT-NAT-270526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:89,costo:39787.30483788046},
    {codigo:"L 10  -NAT-NAT-290526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:3,costo:27712.39847083926},
    {codigo:"L 17-NAT-NAT-220526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:133,costo:23241.220525977104},
    {codigo:"L 17 - 13-NAT-NAT-220526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:362,costo:15874.46108594055},
    {codigo:"L 5-NAT-NAT-060526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:4,costo:29045.731804172592},
    {codigo:"L 20-NAT-NAT-060526",fecha:"2026-06-24",mes:"junio",producto:"NAT",kg:6,costo:26379.065137505924},
    {codigo:"LOTE 17-LVD-LVD-120626",fecha:"2026-07-02",mes:"julio",producto:"REGIONAL",kg:196,costo:42315.116884083516},
    {codigo:"LOTE 15-NAT-NAT-190626",fecha:"2026-07-02",mes:"julio",producto:"REGIONAL",kg:251,costo:22308.745987540562},
  ];
  const rawTri=[
    {codigo:"PARA CAPITAN MARK 151025",fecha:"2026-02-18",mes:"febrero",producto:"PARA CAPITAN",kg:487,costo:37209.35},
    {codigo:"BOURBON SUAZA 130125",fecha:"2026-02-18",mes:"febrero",producto:"PASILLA",kg:760,costo:32350.93},
    {codigo:"AGRAZ 2611",fecha:"2026-02-18",mes:"febrero",producto:"AGR",kg:470,costo:37052.83},
    {codigo:"PASILLAS CON OLOR",fecha:"2026-02-18",mes:"febrero",producto:"PASILLA CO",kg:846,costo:0},
    {codigo:"BARREDURA  Y CATADORA",fecha:"2026-02-18",mes:"febrero",producto:"PASILLA CO",kg:737,costo:0},
    {codigo:"MB 1501",fecha:"2026-02-18",mes:"febrero",producto:"MB",kg:521,costo:41101.73},
    {codigo:"RECHAZO DE CATURRA NITRO ENERO",fecha:"2026-02-18",mes:"febrero",producto:"Caturra Nitro Rechazo",kg:183,costo:0},
    {codigo:"LAVADO L4,L5,L6 061225",fecha:"2026-02-18",mes:"febrero",producto:"PASILLA",kg:281,costo:0},
    {codigo:"PARA CAPITAN MARK 151025",fecha:"2026-02-23",mes:"febrero",producto:"PARA CAPITAN",kg:1122.3,costo:36916.12},
    {codigo:"M 491-ESTATE CAPRI Y RIVIERA-2502",fecha:"2026-02-25",mes:"febrero",producto:"CAPITAN MARK",kg:593,costo:25923.84},
    {codigo:"M 494-DESCARTE CON OLOR -0203",fecha:"2026-03-02",mes:"marzo",producto:"PASILLA CO",kg:697,costo:29412.238},
    {codigo:"M 497-AR-0603",fecha:"2026-03-06",mes:"marzo",producto:"AR",kg:296,costo:50325.159},
    {codigo:"M 501-EXCELSO FLOTE -1203",fecha:"2026-03-12",mes:"marzo",producto:"PASILLA SO",kg:593,costo:0},
    {codigo:"M 504-GESHA TAMBO-1803",fecha:"2026-03-19",mes:"marzo",producto:"Gesha Nar",kg:209,costo:52492.652},
    {codigo:"M 492-DESCARTE SIN OLOR -2702",fecha:"2026-04-28",mes:"abril",producto:"Descarte sin olor",kg:1519,costo:35071.96},
    {codigo:"M 515-DR-2304",fecha:"2026-04-21",mes:"abril",producto:"DR",kg:499,costo:78620.582},
    {codigo:"Regional recuperado 2301",fecha:"2026-04-21",mes:"abril",producto:"PASILLA",kg:803,costo:0},
    {codigo:"M 526-SD-2505",fecha:"2026-05-25",mes:"mayo",producto:"SD",kg:245,costo:73245.452},
    {codigo:"M 525-CONSUMO#1-2105",fecha:"2026-05-26",mes:"mayo",producto:"CONSUMO",kg:1296,costo:960.877},
    {codigo:"M 528-MR-0206",fecha:"2026-06-02",mes:"junio",producto:"MR",kg:170,costo:76991.085},
    {codigo:"M 530-REGIONAL 1-0406",fecha:"2026-06-10",mes:"junio",producto:"REGIONAL",kg:1000,costo:26195.725},
    {codigo:"M 531-NR-0806",fecha:"2026-06-10",mes:"junio",producto:"NR",kg:56,costo:78389.204},
    {codigo:"M 532-MR-1106",fecha:"2026-06-11",mes:"junio",producto:"MR",kg:99,costo:62023.978},
    {codigo:"M 533-LYCHE-1106",fecha:"2026-06-11",mes:"junio",producto:"LYCHE",kg:92,costo:62921.728},
    {codigo:"M 534-AGRAZ-1206",fecha:"2026-06-12",mes:"junio",producto:"AGRAZ",kg:47,costo:48926.989},
    {codigo:"M 537-CC-1806",fecha:"2026-06-19",mes:"junio",producto:"CC",kg:218,costo:47215.575},
    {codigo:"M 538-REGIONAL-1906",fecha:"2026-06-23",mes:"junio",producto:"REGIONAL",kg:7692,costo:25259.453},
    {codigo:"M 540-SD-2406",fecha:"2026-06-24",mes:"junio",producto:"SD",kg:76,costo:70906.021},
    {codigo:"M 541-BB-3006",fecha:"2026-06-30",mes:"junio",producto:"BB",kg:250,costo:41676.702},
    {codigo:"M 542-AGRAZ-3006",fecha:"2026-06-30",mes:"junio",producto:"AGRAZ",kg:1067,costo:67820.986},
    {codigo:"M 543-NR-0207",fecha:"2026-07-03",mes:"julio",producto:"NR",kg:439,costo:47177.156},
  ];
  const rawBlends=[
    {fecha:"2026-03-04",mes:"marzo",nombre:"TABACO 0403",costo:41268.495,kg:227,productoComercial:"Tabacco"},
    {fecha:"2026-03-17",mes:"marzo",nombre:"PINK BOURBON MAME 1703",costo:41839.742,kg:13,productoComercial:"Pink Borbon"},
    {fecha:"2026-04-09",mes:"abril",nombre:"MAYPOP 0904",costo:52383.465,kg:8,productoComercial:"Maypop"},
    {fecha:"2026-04-13",mes:"abril",nombre:"NG  (LYCHE) 1304",costo:44030.459,kg:72,productoComercial:"NG"},
    {fecha:"2026-04-17",mes:"abril",nombre:"APRIL 1704",costo:47562.328,kg:5,productoComercial:"April"},
    {fecha:"2026-04-23",mes:"abril",nombre:"Capitan 2304",costo:25923.84,kg:9,productoComercial:"Capitan"},
    {fecha:"2026-05-07",mes:"mayo",nombre:"APRIL 0705",costo:31627.701,kg:627,productoComercial:"APRIL"},
    {fecha:"2026-05-12",mes:"mayo",nombre:"NIU 1205",costo:40811.403,kg:4,productoComercial:"NIU"},
    {fecha:"2026-05-12",mes:"mayo",nombre:"NG 1205",costo:31780.709,kg:302,productoComercial:"NG"},
    {fecha:"2026-05-20",mes:"mayo",nombre:"CATURRA NITRO 2505",costo:40499.516,kg:278,productoComercial:"Caturra nitro"},
    {fecha:"2026-06-10",mes:"junio",nombre:"PINK BOURBON 1106",costo:36640.152,kg:1202,productoComercial:"Pink Borbon"},
    {fecha:"2026-06-11",mes:"junio",nombre:"MAYPOP 1106",costo:53421.807,kg:1232,productoComercial:"Maypop"},
    {fecha:"2026-06-13",mes:"junio",nombre:"NG 1306",costo:33540.926,kg:1051,productoComercial:"NG"},
    {fecha:"2026-06-15",mes:"junio",nombre:"AGI 1506",costo:30700.151,kg:792,productoComercial:"AGI"},
    {fecha:"2026-06-17",mes:"junio",nombre:"CATURRA NITRO 1706",costo:42046.148,kg:3822,productoComercial:"Caturra nitro"},
    {fecha:"2026-06-26",mes:"junio",nombre:"NIU 2606",costo:48009.572,kg:1382.5,productoComercial:"NIU"},
    {fecha:"2026-06-30",mes:"junio",nombre:"TROPICAL 3006",costo:57550.766,kg:4,productoComercial:"TROPICAL"},
    {fecha:"2026-07-06",mes:"julio",nombre:"VAINILLA 0607",costo:49246.077,kg:1112,productoComercial:"VAINILLA"},
  ];
  const rawFino=[
    {codigo:"LAURINA 151223",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"VARIETAL",kg:48,costo:24267.27},
    {codigo:"KW 1106",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"NA",kg:97,costo:46995.12},
    {codigo:"WUSH WUSH LAVADO ARGEMIRO",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"VARIETAL",kg:48,costo:101835.93},
    {codigo:"CONSUMO NATURAL 0710",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"NA",kg:273,costo:24161.07},
    {codigo:"DULCE JESUS MIO",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"",kg:24,costo:0},
    {codigo:"AR NATURAL",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"AR",kg:49,costo:0},
    {codigo:"SUDAN BIO 2402",fecha:46081,mes:"febrero",proveedor:"Trilladora Milan",producto:"VARIETAL",kg:13,costo:48000},
    {codigo:"M 497-AR-0603",fecha:46112,mes:"marzo",proveedor:"Trilladora Milan",producto:"AR",kg:223,costo:50325.16},
    {codigo:"TABACCO1702",fecha:46112,mes:"marzo",proveedor:"Trilladora Milan",producto:"TABACCO",kg:298,costo:37735.66},
    {codigo:"Washed Gesiha",fecha:46112,mes:"marzo",proveedor:"Trilladora Milan",producto:"VARIETAL",kg:6,costo:0},
    {codigo:"AGRAZ 2611",fecha:46125,mes:"abril",proveedor:"Trilladora Milan",producto:"AGRAZ",kg:35,costo:37052.83},
    {codigo:"APRIL 1704",fecha:46132,mes:"abril",proveedor:"Trilladora Milan",producto:"APRIL",kg:229,costo:47541.51},
    {codigo:"Lote 3 070625",fecha:46136,mes:"abril",proveedor:"NA",producto:"REG",kg:5,costo:0},
    {codigo:"Maragogype 2404",fecha:46136,mes:"abril",proveedor:"NA",producto:"VARIETAL",kg:9,costo:0},
    {codigo:"NIU 3003",fecha:46148,mes:"mayo",proveedor:"Trilladora Milan",producto:"NIU",kg:31,costo:37268.22},
    {codigo:"M 493-MB-2702",fecha:46158,mes:"mayo",proveedor:"Trilladora Milan",producto:"MB",kg:412,costo:40618.15},
    {codigo:"M 520-LYCHE-0805",fecha:46174,mes:"junio",proveedor:"Trilladora Milan",producto:"LYCHE",kg:210,costo:54969.48},
    {codigo:"MAYPOP 1405",fecha:46174,mes:"junio",proveedor:"Trilladora Milan",producto:"MAYPOP",kg:18,costo:57759.79},
    {codigo:"BB 1111",fecha:46174,mes:"junio",proveedor:"Trilladora Milan",producto:"BB",kg:86,costo:39283.3},
    {codigo:"BB 1401",fecha:46174,mes:"junio",proveedor:"Trilladora Milan",producto:"BB",kg:190,costo:38960.06},
    {codigo:"NG  (LYCHE) 1304",fecha:46176,mes:"junio",proveedor:"Trilladora Milan",producto:"NG",kg:75,costo:44011.03},
    {codigo:"Caturra Chiroso",fecha:46171,mes:"mayo",proveedor:"Luis Hernesto",producto:"VARIETAL",kg:166,costo:35238.03},
    {codigo:"M 527-PP -2705",fecha:46190,mes:"junio",proveedor:"Trilladora Milan",producto:"PP",kg:70,costo:55264.24},
    {codigo:"Excelso 270426",fecha:46192,mes:"junio",proveedor:"Trilladora Milan",producto:"REG",kg:224,costo:26142.86},
    {codigo:"NIU 0106",fecha:46192,mes:"junio",proveedor:"Trilladora Milan",producto:"NIU",kg:156,costo:50786.73},
    {codigo:"M 529-REGIONAL 2-0306",fecha:46198,mes:"junio",proveedor:"Trilladora Milan",producto:"REG",kg:404,costo:28262.7},
    {codigo:"M 538-REGIONAL-1906",fecha:46198,mes:"junio",proveedor:"Trilladora Milan",producto:"REG",kg:1258,costo:25271},
    {codigo:"TABACO 0403",fecha:46196,mes:"junio",proveedor:"Trilladora Milan",producto:"TABACCO",kg:218,costo:41268.49},
    {codigo:"M 540-SD-2406",fecha:46196,mes:"junio",proveedor:"Trilladora Milan",producto:"SD",kg:200,costo:70973.24},
    {codigo:"M 515-DR-2304",fecha:46199,mes:"junio",proveedor:"Trilladora Milan",producto:"DR",kg:169,costo:78620.58},
    {codigo:"M 531-NR-0806",fecha:46199,mes:"junio",proveedor:"Trilladora Milan",producto:"NR",kg:141,costo:78380.57},
    {codigo:"AGI 2905",fecha:46199,mes:"junio",proveedor:"Trilladora Milan",producto:"AGI",kg:254.5,costo:28937.97},
    {codigo:"M 535-CHOCOLATE-1306",fecha:46205,mes:"julio",proveedor:"Trilladora Milan",producto:"CHOCOLATE",kg:24,costo:50892.87},
    {codigo:"TROPICAL 3006",fecha:46209,mes:"julio",proveedor:"Trilladora Milan",producto:"TROPICAL",kg:866,costo:57550.77},
  ];
  const rawTriFino=[
    {codigo:"CF60-SIDRA 0203-0203",fecha:46083,mes:"marzo",producto:"VARIETAL",kg:1,costo:0},
    {codigo:"CF62-L12 BIO MASTER-0203",fecha:46083,mes:"marzo",producto:"REG",kg:63,costo:0},
    {codigo:"CF63-LOTE 4 LAVADO-0303",fecha:46084,mes:"marzo",producto:"REG",kg:68,costo:0},
    {codigo:"CF67-LOTE 9 LAVADO-0303",fecha:46084,mes:"marzo",producto:"REG",kg:53,costo:0},
    {codigo:"CF68-LOTE 11 -0303",fecha:46084,mes:"marzo",producto:"VARIETAL",kg:38,costo:0},
    {codigo:"CF70-L 4-2-3-7-0303",fecha:46084,mes:"marzo",producto:"REG",kg:2,costo:0},
    {codigo:"CF72-LOTE 12-0303",fecha:46084,mes:"marzo",producto:"REG",kg:4,costo:0},
    {codigo:"CF65-L13 LAVADO-0303",fecha:46087,mes:"marzo",producto:"VARIETAL",kg:1,costo:0},
    {codigo:"CF -RIVIERA NATURAL 2404-2404",fecha:46135,mes:"abril",producto:"NAT",kg:9,costo:51555.56},
    {codigo:"CF-BIOMASTER 2603-2404",fecha:46136,mes:"abril",producto:"REG",kg:48,costo:42500},
    {codigo:"CF 139-L 13 BIOMASTER-0105",fecha:46143,mes:"mayo",producto:"VARIETAL",kg:1,costo:63467.37},
    {codigo:"CF 143-BIOMASTER L1-0105",fecha:46143,mes:"mayo",producto:"REG",kg:3,costo:0},
    {codigo:"CF 144-BIOMASTER L3-4 041225-0105",fecha:46143,mes:"mayo",producto:"REG",kg:38,costo:43488.3},
    {codigo:"CF 145-L 7 LAVADO 301025-0105",fecha:46143,mes:"mayo",producto:"REG",kg:26,costo:47349.8},
    {codigo:"CF 146-RIVERA LAVADO 2802226-0105",fecha:46143,mes:"mayo",producto:"REG",kg:22,costo:79636.36},
    {codigo:"CF 147-LOTE 1-6 111225-0105",fecha:46143,mes:"mayo",producto:"REG",kg:83,costo:0},
    {codigo:"CF-L 20 020426-0105",fecha:46143,mes:"mayo",producto:"VARIETAL",kg:2,costo:42711.86},
    {codigo:"CF 187-L 17-0406",fecha:46177,mes:"junio",producto:"VARIETAL",kg:198,costo:58170.05},
    {codigo:"CF198-CAPRI GESHA-NAT-NAT-150426-3006",fecha:46203,mes:"junio",producto:"VARIETAL",kg:6,costo:56533.37},
    {codigo:"CF200-BAIRES-LVD-LVD-170126-3006",fecha:46203,mes:"junio",producto:"REG",kg:78,costo:0},
    {codigo:"CF201-COOP CAPRI 130925-3006",fecha:46203,mes:"junio",producto:"REG",kg:26,costo:0},
    {codigo:"CF203-LOTE 8 BIOMASTER 131125-3006",fecha:46203,mes:"junio",producto:"REG",kg:27,costo:0},
    {codigo:"CF204-L 13-9-LVD-LVD-220426-3006",fecha:46203,mes:"junio",producto:"REG",kg:16,costo:0},
    {codigo:"CF205-LOTE 13 LAVADO 131125-3006",fecha:46203,mes:"junio",producto:"VARIETAL",kg:15,costo:0},
    {codigo:"CF206-TODOS LOTE 8-3006",fecha:46203,mes:"junio",producto:"VARIETAL",kg:300,costo:48120.95},
    {codigo:"CF 185-GESHA LAVADO-0406",fecha:46203,mes:"junio",producto:"VARIETAL",kg:248,costo:65000},
  ];
  const rawBlendsFino=[
    {fecha:42428,mes:"febrero",nombre:"BORBON SIDRA",costo:40447,kg:19,productoComercial:"BORBON SIDRA"},
    {fecha:46155,mes:"mayo",nombre:"Capitan 1305",costo:25965.67,kg:454,productoComercial:"CAPITAN MARK"},
    {fecha:46155,mes:"mayo",nombre:"Sidra Bio 1305",costo:49820.66,kg:24,productoComercial:"SIDRA BIO"},
    {fecha:46162,mes:"mayo",nombre:"Wush 2005",costo:45072.32,kg:14,productoComercial:"WUSH WUSH"},
    {fecha:46170,mes:"mayo",nombre:"Caturra nitro 2805",costo:34589.33,kg:260,productoComercial:"CATURRA NITRO"},
    {fecha:46177,mes:"junio",nombre:"Sakura Competition 0406",costo:60016.42,kg:15,productoComercial:"SAKURA"},
    {fecha:46177,mes:"junio",nombre:"MAYPOP COMPETITION",costo:58180.75,kg:26,productoComercial:"MAYPOP"},
    {fecha:46184,mes:"junio",nombre:"Maypop 1106",costo:58154.7,kg:361,productoComercial:"MAYPOP"},
    {fecha:46192,mes:"junio",nombre:"Caturra nitro 1906",costo:31267.12,kg:647,productoComercial:"CATURRA NITRO"},
    {fecha:46192,mes:"junio",nombre:"Gesha Bio 1906",costo:59864.25,kg:255,productoComercial:"GESHA BIO"},
    {fecha:46199,mes:"junio",nombre:"Pink borbon 2606",costo:38566.72,kg:110,productoComercial:"PINK BOURBON"},
    {fecha:46199,mes:"junio",nombre:"Sakura 2606",costo:47523.36,kg:111,productoComercial:"SAKURA"},
    {fecha:46203,mes:"junio",nombre:"NIU 3006",costo:52486.24,kg:290,productoComercial:"NIU"},
  ];
  const wipeAll=()=>{
    const ok1=window.confirm("⚠️ ADVERTENCIA CRITICA\n\nEsta accion borrara ABSOLUTAMENTE TODOS los datos:\nlotes, blends, costos, usuarios, maquilas, etc.\n\nEs IRREVERSIBLE. ¿Continuar?");
    if(!ok1)return;
    const txt=window.prompt("Para confirmar escribe exactamente:\n\nBORRAR TODO");
    if(txt!=="BORRAR TODO"){alert("Texto incorrecto. Operacion cancelada.");return;}
    setLotes([]);setBlends([]);setCostos([]);setLotesFino([]);setBlendsFino([]);setMaquilas([]);setBlendsTostado([]);setUsuarios([]);
    setWipeStatus("done");
  };
  const ejecutar=()=>{
    if(!window.confirm("¿Confirmar carga inicial?\n\n• "+rawMilan.length+" lotes → Bodega Milan\n• "+rawTri.length+" lotes → Bodega Trilladora\n• "+rawBlends.length+" blends → Inventario Blends\n• "+rawFino.length+" lotes → Bodega Café Fino\n• "+rawTriFino.length+" lotes → Trilladora Café Fino\n• "+rawBlendsFino.length+" blends → Blend Café Fino\n\nEsta operación no se puede deshacer automaticamente."))return;
    const codsLotes=new Set(lotes.map(l=>l.codigo+"|"+l.kg_producto+"|"+l.fecha_proceso));
    const nuevosM=rawMilan.filter(r=>!codsLotes.has(r.codigo+"|"+r.kg+"|"+r.fecha)).map(r=>({
      id:genId(),codigo:r.codigo,fecha_proceso:r.fecha,fecha_recibo:r.fecha,
      semana:semanaISO(r.fecha),mes:r.mes,tipo:"carga_directa",producto:r.producto,
      estado:"Bodega",origen_lote:"carga_directa",cereza:[],
      kg_producto:r.kg,costo_directo_kg:r.costo,bultos:0,humedad:"",conversion:1,notas:"",
      insumos:INS0,equipo_ferm:"",equipo_secado:"",fecha_lavado:null,fecha_fin_secado:r.fecha,
      salidas_bodega:[],trilla:null,salidas_trilladora:[],pretrilla:null,
    }));
    const nuevosT=rawTri.filter(r=>!codsLotes.has(r.codigo+"|"+r.kg+"|"+r.fecha)).map(r=>{
      const c=+r.costo||0;const sid=genId();
      return{
        id:genId(),codigo:r.codigo,fecha_proceso:r.fecha,fecha_recibo:r.fecha,
        semana:semanaISO(r.fecha),mes:r.mes,tipo:"Manual",producto:r.producto,
        estado:"Cerrado",origen_lote:"trilla_directa",
        cereza:[{finca:"Externo",kg:r.kg,valor_kg:c,flote:0,kg_proceso:r.kg}],
        kg_producto:r.kg,bultos:0,humedad:"",conversion:1,notas:"",
        insumos:INS0,equipo_ferm:"",equipo_secado:"",fecha_lavado:null,fecha_fin_secado:null,
        salidas_bodega:[{id:sid,fecha:r.fecha,factura:"MANUAL",remision:"",cliente:"Trilla",destino_key:"trilla",peso_salida:r.kg,valor_kg:c,valor_total:r.kg*c}],
        trilla:{kg_excelso:r.kg,kg_merma:0,kg_pasillas:0,pasilla_elec:0,catadora_dens:0,inferiores:0,cisco:0,
          humedad_salida:0,norma:"",fecha_trilla:r.fecha,codigo_corte:"CARGA-DIRECTA",con_proceso:"Con Proceso",
          nombre_trillado:r.codigo,obs:"Carga directa inicial",lotes_combinados:[],
          factor_pretrilla_ponderado:0,factor_industrial:0,costo_kg_excelso:c,valor_total:r.kg*c},
        salidas_trilladora:[],pretrilla:null,
      };
    });
    const nombresBlends=new Set(blends.map(b=>b.nombre));
    const nuevosB=rawBlends.filter(r=>!nombresBlends.has(r.nombre)).map(r=>({
      id:genId(),nombre:r.nombre,fecha:r.fecha,
      codigo:r.nombre.trim().replace(/\s+/g,"")+"-"+dateToCode(r.fecha),
      mes:r.mes,producto_comercial:r.productoComercial,
      items:[],kg_total:r.kg,valor_total:r.kg*r.costo,costo_kg:r.costo,salidas:[],
    }));
    const msgs=[];
    if(nuevosM.length||nuevosT.length)setLotes(p=>[...p,...nuevosM,...nuevosT]);
    if(nuevosB.length)setBlends(p=>[...p,...nuevosB]);
    msgs.push("✓ Bodega Milan: "+nuevosM.length+" lotes cargados");
    msgs.push("✓ Bodega Trilladora: "+nuevosT.length+" lotes cargados");
    msgs.push("✓ Blends: "+nuevosB.length+" blends cargados");
    setLog(msgs);setStatus("done");
  };
  const ejecutarCF=()=>{
    if(!window.confirm("¿Confirmar carga Café Fino?\n\n• "+rawFino.length+" lotes → Bodega Café Fino\n• "+rawTriFino.length+" lotes → Trilladora Café Fino\n• "+rawBlendsFino.length+" blends → Blend Café Fino\n\nNO toca datos de Bodega Milan ni Trilladora."))return;
    const codsFino=new Set((lotesFino||[]).map(l=>l.codigo+"|"+l.kg_producto+"|"+l.fecha));
    const nuevosFino=rawFino.filter(r=>!codsFino.has(r.codigo+"|"+r.kg+"|"+excF(r.fecha))).map(r=>{
      const f=excF(r.fecha);
      return{id:genId(),codigo:r.codigo,fecha:f,mes:r.mes,semana:semanaISO(f),
        producto:r.producto,proveedor:r.proveedor,kg_producto:r.kg,costo_compra_kg:r.costo||0,
        notas:"",salidas_bodega:[],trilla:null,salidas_trilladora:[]};
    });
    const nuevosTriFino=rawTriFino.filter(r=>!codsFino.has(r.codigo+"|"+r.kg+"|"+excF(r.fecha))).map(r=>{
      const f=excF(r.fecha);const c=r.costo||0;
      return{id:genId(),codigo:r.codigo,fecha:f,mes:r.mes,semana:semanaISO(f),
        producto:r.producto,proveedor:"Trilladora Milan",kg_producto:r.kg,costo_compra_kg:c,
        notas:"",salidas_bodega:[],
        trilla:{kg_excelso:r.kg,kg_merma:0,kg_pasillas:0,pasilla_elec:0,catadora_dens:0,inferiores:0,cisco:0,
          entrada_usada:r.kg,humedad_salida:0,norma:"",fecha_trilla:f,codigo_corte:"CARGA-DIRECTA",
          con_proceso:"Con Proceso",nombre_trillado:r.codigo,obs:"Carga directa inicial",lotes_combinados:[],
          factor_industrial:null,factor_pretrilla_ponderado:null,costo_kg_excelso:c,valor_total:r.kg*c},
        salidas_trilladora:[],pretrilla:null};
    });
    const nombresBF=new Set((blendsFino||[]).map(b=>b.nombre));
    const nuevosBF=rawBlendsFino.filter(r=>!nombresBF.has(r.nombre)).map(r=>{
      const f=excF(r.fecha);
      return{id:genId(),nombre:r.nombre,fecha:f,
        codigo:r.nombre.trim().replace(/\s+/g,"")+"-"+dateToCode(f),
        mes:r.mes,producto_comercial:r.productoComercial,
        items:[],kg_total:r.kg,valor_total:r.kg*r.costo,costo_kg:r.costo,salidas:[]};
    });
    const msgs=[];
    if(nuevosFino.length||nuevosTriFino.length)setLotesFino(p=>[...p,...nuevosFino,...nuevosTriFino]);
    if(nuevosBF.length)setBlendsFino(p=>[...p,...nuevosBF]);
    msgs.push("✓ Bodega Café Fino: "+nuevosFino.length+" lotes cargados");
    msgs.push("✓ Trilladora Café Fino: "+nuevosTriFino.length+" lotes cargados");
    msgs.push("✓ Blend Café Fino: "+nuevosBF.length+" blends cargados");
    setLogCF(msgs);setStatusCF("done");
  };
  const ejecutarActualizarCostos=()=>{
    const triEntries=rawTri.filter(r=>r.costo>0);
    const triFEntries=rawTriFino.filter(r=>r.costo>0);
    const getCostoTri=(l)=>{const byKg=triEntries.find(r=>r.codigo===l.codigo&&Math.abs(r.kg-(l.kg_producto||0))<1);return byKg?byKg.costo:(triEntries.find(r=>r.codigo===l.codigo)?.costo||0);};
    const getCostoTriF=(l)=>{const byKg=triFEntries.find(r=>r.codigo===l.codigo&&Math.abs(r.kg-(l.kg_producto||0))<1);return byKg?byKg.costo:(triFEntries.find(r=>r.codigo===l.codigo)?.costo||0);};
    let updT=0,updTF=0;
    setLotes(prev=>prev.map(l=>{
      const c=getCostoTri(l);
      if(!c)return l;
      updT++;
      const cereza=(l.cereza||[]).length>0?(l.cereza).map((cx,i)=>i===0?{...cx,valor_kg:c}:cx):[{finca:"Externo",kg:l.kg_producto||0,valor_kg:c,flote:0,kg_proceso:l.kg_producto||0}];
      const hasSalidaT=(l.salidas_bodega||[]).some(s=>s.destino_key==="trilla");
      const salidas_bodega=hasSalidaT?(l.salidas_bodega||[]).map(s=>s.destino_key==="trilla"?{...s,valor_kg:c,valor_total:(s.peso_salida||0)*c}:s):[...(l.salidas_bodega||[]),{id:genId(),fecha:l.fecha_proceso||"",factura:"MANUAL",remision:"",cliente:"Trilla",destino_key:"trilla",peso_salida:l.kg_producto||0,valor_kg:c,valor_total:(l.kg_producto||0)*c}];
      const kgEx=l.trilla?.kg_excelso||l.kg_producto||0;
      const trilla=l.trilla?{...l.trilla,costo_kg_excelso:c,valor_total:kgEx*c}:{kg_excelso:kgEx,costo_kg_excelso:c,valor_total:kgEx*c};
      return{...l,cereza,salidas_bodega,trilla,costo_directo_kg:c,origen_lote:"trilla_directa"};
    }));
    setLotesFino(prev=>prev.map(l=>{
      const c=getCostoTriF(l);
      if(!c)return l;
      updTF++;
      const kgEx=l.trilla?.kg_excelso||l.kg_producto||0;
      const trilla=l.trilla?{...l.trilla,costo_kg_excelso:c,valor_total:kgEx*c}:l.trilla;
      return{...l,costo_compra_kg:c,trilla};
    }));
    setLogCostos(["✓ Bodega Trilladora: "+updT+" lotes actualizados","✓ Trilladora CF: "+updTF+" lotes actualizados"]);
    setStatusCostos("done");
    setConfirmCostos(false);
  };
  const limpiarDuplicados=()=>{
    const porCodigo={};
    lotes.forEach(l=>{if(!porCodigo[l.codigo])porCodigo[l.codigo]=[];porCodigo[l.codigo].push(l);});
    const grupos=Object.entries(porCodigo).filter(([,arr])=>arr.length>1);
    if(!grupos.length){setLogDupli(["Sin duplicados encontrados en Bodega Milan / Procesamiento."]);setStatusDupli("done");return;}
    const idsElim=new Set();
    const msgs=[];
    grupos.forEach(([cod,arr])=>{
      arr.sort((a,b)=>(b.kg_producto||0)-(a.kg_producto||0)||(b.cereza?.length||0)-(a.cereza?.length||0));
      const eliminar=arr.slice(1);
      eliminar.forEach(l=>idsElim.add(l.id));
      msgs.push("ELIMINADO — Código: "+cod+" ("+arr.length+" copias → se elimina "+(arr.length-1)+", se conserva el más completo)");
    });
    setLotes(p=>p.filter(l=>!idsElim.has(l.id)));
    setLogDupli(msgs);
    setStatusDupli("done");
  };
  return(<div>
    <div style={{marginBottom:22}}><div style={{color:C.green,fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>ADMINISTRACION</div><div style={{color:C.navy,fontSize:22,fontWeight:700}}>Carga Inicial de Datos</div></div>
    <div style={{...S.card,maxWidth:600,borderTop:"3px solid "+C.red,marginBottom:20}}>
      <div style={{color:C.red,fontWeight:700,fontSize:14,marginBottom:8}}>Zona de Peligro — Borrado Total</div>
      <div style={{color:C.textDim,fontSize:12,marginBottom:16}}>Elimina absolutamente todos los documentos de Firestore: lotes, blends, costos, usuarios, maquilas. Irreversible.</div>
      {wipeStatus==="idle"&&(<button style={{...S.btn,background:C.red}} onClick={wipeAll}>Borrar TODOS los datos</button>)}
      {wipeStatus==="done"&&(<div style={{color:C.red,fontWeight:700,fontSize:13}}>✓ Borrado enviado a Firestore. En unos segundos la app quedara en cero. Recarga la pagina para confirmar.</div>)}
    </div>
    <div style={{...S.card,maxWidth:600,marginBottom:16}}>
      <div style={{marginBottom:20}}>
        <div style={{color:C.navy,fontWeight:700,fontSize:15,marginBottom:4}}>Bodega Milan · Trilladora · Blends</div>
        <div style={{color:C.textDim,fontSize:11,marginBottom:12}}>Solo carga estos 3 módulos — no toca Café Fino.</div>
        {[["Bodega Milan",rawMilan.length,"lotes de pergamino seco",C.accent],["Bodega Trilladora",rawTri.length,"lotes de excelso",C.green],["Inventario Blends",rawBlends.length,"blends",C.purple]].map(([sec,n,desc,col])=>(<div key={sec} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid "+C.border}}><div style={{width:36,height:36,borderRadius:8,background:col+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,color:col,flexShrink:0}}>{n}</div><div><div style={{fontWeight:600,fontSize:13,color:C.navy}}>{sec}</div><div style={{fontSize:11,color:C.textDim}}>{desc}</div></div></div>))}
      </div>
      {status==="idle"&&(<button style={{...S.btn,background:C.accent}} onClick={ejecutar}>Cargar Bodega Milan / Trilladora / Blends</button>)}
      {status==="done"&&(<>
        <div style={{marginBottom:16}}>{log.map((m,i)=>(<div key={i} style={{padding:"8px 12px",background:C.accentBg,borderRadius:6,marginBottom:6,fontSize:13,color:C.navy,fontWeight:500}}>{m}</div>))}</div>
        <div style={{color:C.green,fontWeight:700,fontSize:13}}>✓ Completado.</div>
      </>)}
    </div>
    <div style={{...S.card,maxWidth:600}}>
      <div style={{marginBottom:20}}>
        <div style={{color:C.navy,fontWeight:700,fontSize:15,marginBottom:4}}>Café Fino — Carga independiente</div>
        <div style={{color:C.textDim,fontSize:11,marginBottom:12}}>Solo carga los 3 módulos de Café Fino — no toca Bodega Milan ni Trilladora.</div>
        {[["Bodega Café Fino",rawFino.length,"lotes de café fino",C.gold],["Trilladora Café Fino",rawTriFino.length,"lotes de excelso fino",C.orange],["Blend Café Fino",rawBlendsFino.length,"blends café fino",C.green]].map(([sec,n,desc,col])=>(<div key={sec} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid "+C.border}}><div style={{width:36,height:36,borderRadius:8,background:col+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,color:col,flexShrink:0}}>{n}</div><div><div style={{fontWeight:600,fontSize:13,color:C.navy}}>{sec}</div><div style={{fontSize:11,color:C.textDim}}>{desc}</div></div></div>))}
      </div>
      {statusCF==="idle"&&(<button style={{...S.btn,background:C.gold}} onClick={ejecutarCF}>Cargar Café Fino</button>)}
      {statusCF==="done"&&(<>
        <div style={{marginBottom:16}}>{logCF.map((m,i)=>(<div key={i} style={{padding:"8px 12px",background:C.accentBg,borderRadius:6,marginBottom:6,fontSize:13,color:C.navy,fontWeight:500}}>{m}</div>))}</div>
        <div style={{color:C.green,fontWeight:700,fontSize:13}}>✓ Café Fino cargado en Firestore.</div>
      </>)}
    </div>
    <div style={{...S.card,maxWidth:600,marginTop:16,borderTop:"3px solid "+C.orange}}>
      <div style={{color:C.orange,fontWeight:700,fontSize:14,marginBottom:6}}>Actualizar Costos/kg — Trilladora y CF</div>
      <div style={{color:C.textDim,fontSize:12,marginBottom:16}}>Aplica los costos del Excel a Bodega Trilladora y Trilladora CF. Solo actualiza el costo/kg — no toca salidas ni stock.</div>
      {!confirmCostos&&statusCostos!=="done"&&(<button style={{...S.btn,background:C.orange}} onClick={()=>setConfirmCostos(true)}>Actualizar Costos</button>)}
      {confirmCostos&&(<div style={{background:C.orangeBg,border:"1px solid "+C.orange+"40",borderRadius:8,padding:"14px 16px",marginBottom:8}}>
        <div style={{color:C.orange,fontWeight:600,fontSize:13,marginBottom:10}}>¿Confirmar actualización de costos/kg?</div>
        <div style={{display:"flex",gap:10}}>
          <button style={{...S.btn,background:C.orange,flex:1}} onClick={ejecutarActualizarCostos}>Sí, actualizar ahora</button>
          <button style={{...S.btnG,flex:1}} onClick={()=>setConfirmCostos(false)}>Cancelar</button>
        </div>
      </div>)}
      {statusCostos==="done"&&(<>
        <div style={{marginBottom:12,marginTop:12}}>{logCostos.map((m,i)=>(<div key={i} style={{padding:"8px 12px",background:C.orangeBg,borderRadius:6,marginBottom:6,fontSize:13,color:C.navy,fontWeight:600}}>{m}</div>))}</div>
        <div style={{color:C.green,fontWeight:700,fontSize:13,marginBottom:10}}>✓ Costos sincronizados con Firestore.</div>
        <button style={{...S.btnG,fontSize:12}} onClick={()=>{setStatusCostos("idle");setLogCostos([]);}}>Ejecutar de nuevo</button>
      </>)}
    </div>
    <div style={{...S.card,maxWidth:600,marginTop:16,borderTop:"3px solid "+C.purple}}>
      <div style={{color:C.purple,fontWeight:700,fontSize:14,marginBottom:6}}>Limpiar Lotes Duplicados</div>
      <div style={{color:C.textDim,fontSize:12,marginBottom:16}}>Detecta lotes con el mismo código en Bodega Milan / Procesamiento. Para cada duplicado, conserva el más completo (mayor kg_producto) y elimina los demás. Reporta los códigos afectados.</div>
      {statusDupli!=="done"&&(<button style={{...S.btn,background:C.purple}} onClick={limpiarDuplicados}>Detectar y Limpiar Duplicados</button>)}
      {statusDupli==="done"&&(<>
        <div style={{marginBottom:12}}>{logDupli.map((m,i)=>(<div key={i} style={{padding:"10px 12px",background:C.purpleBg||"#f3e8ff",borderRadius:6,marginBottom:6,fontSize:12,color:C.navy,fontWeight:600,borderLeft:"3px solid "+C.purple}}>{m}</div>))}</div>
        <div style={{color:C.green,fontWeight:700,fontSize:13,marginBottom:10}}>✓ Operación completada. Cambios guardados en Firestore.</div>
        <button style={{...S.btnG,fontSize:12}} onClick={()=>{setStatusDupli("idle");setLogDupli([]);}}>Escanear de nuevo</button>
      </>)}
    </div>
  </div>);
}
