// v3.393: Dachrandblech – eine Kante in n gleich lange Stücke teilen.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,600):""))}};
const INIT=()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};['select','eq','order','limit','in'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{window.appAlert=async()=>{};
  window.madMaterialTabelle=()=>({label:"Titanzink",maxAbstand:5000,abEcke:2500});   // feste SIA-Werte fuer den Test
  window.K=(l,e,x,w)=>({laenge:l,ecke:e||"aussen",winkel:w===undefined?90:w,eckschieber:!!x});
  window.D=(kanten,o)=>Object.assign({detail:"1.5",kanten,geschlossen:false,stoss:"schieber",schieber:{zugabe:"",abzug:""},stueck:{laenge:3000,ueberlappung:40,gleich:false},streifen:{aktiv:false}},o||{});
  window.L=r=>r.stuecke.map(s=>s.kante+":"+s.laenge).join(" ");
 });
 const ev=(f,...a)=>page.evaluate(f,...a);
 console.log("\nA · Überlappung: n gleiche Stücke");
 let r=await ev(()=>{const k=[{laenge:12000,ecke:"ende",teile:4}];const x=drbStueckeBerechnen(k,3000,40,false);return {l:x.stuecke.map(s=>s.laenge),m:x.materialLaenge}});
 p(r.l.join(",")==="3030,3030,3030,3030"&&r.m===12120,"12 m in 4 Stücke: 4 × 3030 (12000 + 3 × 40 Überlappung)",r);
 r=await ev(()=>{const k=[{laenge:10000,ecke:"ende",teile:3}];const x=drbStueckeBerechnen(k,3000,40,false);return x.stuecke.map(s=>s.laenge).reduce((a,b)=>a+b,0)});
 p(r===10080,"Rundung: die Summe bleibt Länge + Überlappungen (10080)",r);
 r=await ev(()=>{const a=drbStueckeBerechnen([{laenge:7000,ecke:"ende"}],3000,40,false),b=drbStueckeBerechnen([{laenge:7000,ecke:"ende",teile:""}],3000,40,false);return JSON.stringify(a)===JSON.stringify(b)});
 p(r,"Ohne Anzahl (leer/fehlt) rechnet alles wie bisher");
 r=await ev(()=>drbStueckeBerechnen([{laenge:5000,ecke:"ende",teile:1}],3000,40,false).stuecke.map(s=>s.laenge).join());
 p(r==="5000","1 Stück = ganze Kante",r);
 console.log("\nB · Schieber: n gleiche Stücke");
 r=await ev(()=>{madSchieberMass=30;const d={kanten:[{laenge:12000,ecke:"ende",teile:4}],stoss:"schieber",geschlossen:false,schieber:{zugabe:"",abzug:""},stueck:{laenge:3000,ueberlappung:40}};const x=drbStueckeFuer(d,null);return {l:x.stuecke.map(s=>s.laenge),n:x.schieberAnzahl}});
 p(r.n===3&&r.l.join(",")==="3030,3060,3060,3030","12 m in 4: 3 Schieber, Stücke 3030/3060/3060/3030",r);
 console.log("\nC · Speichern, Warnungen, Eingabe");
 r=await ev(()=>{const a=drbAusData({detail:"1.5",kanten:[{laenge:9000,ecke:"ende",teile:"3"}]});return {t:a.kanten[0].teile,alt:drbAusData({kanten:[{laenge:1}]}).kanten[0].teile,bad:drbAusData({kanten:[{laenge:1,teile:-2}]}).kanten[0].teile}});
 p(r.t===3&&r.alt===""&&r.bad==="","Laden: Anzahl bleibt erhalten; alte Daten/ungültige Werte → leer",r);
 r=await ev(()=>{fpA=fpA||{};fpA.material=null;fpA.dachrand=drbAusData({kanten:[{laenge:12000,ecke:"ende",teile:2}]});return drbPruefungen().map(x=>x.text).join("|")});
 p(/Kante 1: bei 2 gleichen Stücken ist ein Stück 6000 mm lang/.test(r),"Warnung, wenn das Stück länger als die Länge pro Stück wird",r);
 r=await ev(()=>{fpA.dachrand=drbAusData({stoss:"schieber",kanten:[{laenge:20000,ecke:"ende",teile:2}]});return drbPruefungen().map(x=>x.text).join("|")});
 p(/Schieber-Abstand 10000 mm/.test(r),"Warnung bei Schieber-Abstand über SIA-Maximum",r);
 r=await ev(()=>{fpA.dachrand=drbAusData({kanten:[{laenge:12000,ecke:"ende"}]});const h=drbKantenHtml();const el=document.createElement("div");el.innerHTML=h;const i=el.querySelector("[data-drb-teile]");return !!i});
 p(r,"Kante hat das Feld «In gleich lange Stücke teilen»");
 r=await ev(()=>drbDaten.toString().includes("teile:drbTeile(k.teile)"));
 p(r,"drbDaten speichert die Anzahl je Kante");
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();
