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
 r=await ev(()=>{const d={kanten:[{laenge:12000,ecke:"ende",teile:4}],stoss:"schieber",geschlossen:false,schieber:{zugabe:30,abzug:""},stueck:{laenge:3000,ueberlappung:40}};const x=drbStueckeFuer(d,null);return {l:x.stuecke.map(s=>s.laenge),n:x.schieberAnzahl}});
 p(r.n===3&&r.l.join(",")==="3030,3060,3060,3030","12 m in 4: 3 Schieber, Stücke 3030/3060/3060/3030",r);
 console.log("\nC · Speichern, Warnungen, Eingabe");
 r=await ev(()=>{const a=drbAusData({detail:"1.5",kanten:[{laenge:9000,ecke:"ende",teile:"3"}]});return {t:a.kanten[0].teile,alt:drbAusData({kanten:[{laenge:1}]}).kanten[0].teile,bad:drbAusData({kanten:[{laenge:1,teile:-2}]}).kanten[0].teile}});
 p(r.t===3&&r.alt===""&&r.bad==="","Laden: Anzahl bleibt erhalten; alte Daten/ungültige Werte → leer",r);
 r=await ev(()=>{fpA=fpA||{};fpA.material=null;fpA.dachrand=drbAusData({kanten:[{laenge:12000,ecke:"ende",teile:2}]});return drbPruefungen().map(x=>x.text).join("|")});
 p(/Kante 1: bei 2 gleichen Stücken ist ein Stück 6000 mm lang/.test(r),"Warnung, wenn das Stück länger als die Länge pro Stück wird",r);
 r=await ev(()=>{fpA.dachrand=drbAusData({stoss:"schieber",kanten:[{laenge:20000,ecke:"ende",teile:2}]});return drbPruefungen().map(x=>x.text).join("|")});
 p(/Schieber-Abstand 10000 mm/.test(r),"Warnung bei Schieber-Abstand über SIA-Maximum",r);
 r=await ev(()=>{fpA.dachrand=drbAusData({kanten:[{laenge:12000,ecke:"ende"}]});const el=document.createElement("div");el.innerHTML=drbStueckeHtml();return {anz:!!el.querySelector("[data-drb-teile]"),wu:!!el.querySelector("[data-drb-wunsch]"),alle:!!el.querySelector("#drb_wunschAlleBtn"),kante:!!(()=>{const k=document.createElement("div");k.innerHTML=drbKantenHtml();return k.querySelector("[data-drb-teile]")})()}});
 p(r.anz&&r.wu&&r.alle&&!r.kante,"Im Register «Stücke» stehen je Kante «Anzahl» und «Wunschlänge» sowie «für alle Kanten» (nicht mehr im Grundriss)",r);
 r=await ev(()=>drbDaten.toString().includes("teile:drbTeile(k.teile)"));
 p(r,"drbDaten speichert die Anzahl je Kante");

 console.log("\nD · v3.396: Wunschlänge");
 r=await ev(()=>({
  a:drbAnzahlWunsch(12000,3000,40),b:drbAnzahlWunsch(12000,2500,40),c:drbAnzahlWunsch(10000,3000,0),d:drbAnzahlWunsch(5000,6000,40),
  e:drbAnzahlWunsch(12000,40,40),f:drbAnzahlWunsch(0,3000,40),g:drbAnzahlWunsch(9000,2000,0)}));
 p(r.a===4,"12 m, Wunsch 3000, Überlappung 40 → 4 Stücke (je 3030)",r.a);
 p(r.b===5,"12 m, Wunsch 2500 → 5 Stücke (je 2432, näher an 2500 als 4 × 3030)",r.b);
 p(r.c===3,"10 m, Wunsch 3000, Schieber → 3 Abstände (3333 näher als 4 × 2500)",r.c);
 p(r.d===1,"Wunsch länger als die Kante → 1 Stück",r.d);
 p(r.e===0&&r.f===0,"Wunsch ≤ Überlappung oder Länge 0 → 0 (ungültig, automatisch)",[r.e,r.f]);
 p(r.g===5,"Gleichstand 9 m / Wunsch 2000: 4 × 2250 und 5 × 1800 gleich weit – die kleinere Länge (5 Stücke)",r.g);
 r=await ev(()=>{const k=[{laenge:12000,ecke:"ende",wunsch:2500}];const x=drbStueckeBerechnen(k,3000,40,false);
  const y=drbStueckeBerechnen([{laenge:12000,ecke:"ende",wunsch:2500,teile:3}],3000,40,false);
  return {n:x.stuecke.length,l:x.stuecke.map(s=>s.laenge),sum:x.stuecke.reduce((a,b)=>a+b.laenge,0),vorrang:y.stuecke.length}});
 p(r.n===5&&r.sum===12000+4*40&&Math.max(...r.l)-Math.min(...r.l)<=4,"Überlappung mit Wunschlänge: 5 fast gleiche Stücke, Summe = Länge + Überlappungen",r);
 p(r.vorrang===3,"Anzahl hat Vorrang vor der Wunschlänge",r.vorrang);
 r=await ev(()=>{const d={kanten:[{laenge:10000,ecke:"ende",wunsch:3000}],stoss:"schieber",geschlossen:false,schieber:{zugabe:30,abzug:""},stueck:{laenge:3000,ueberlappung:40}};const x=drbStueckeFuer(d,null);return {n:x.stuecke.length,s:x.schieberAnzahl}});
 p(r.n===3&&r.s===2,"Schieber mit Wunschlänge: 3 Stücke, 2 Schieber",r);
 r=await ev(()=>{fpA.dachrand=drbAusData({kanten:[{laenge:12000,ecke:"ende",wunsch:2500},{laenge:5000,ecke:"ende"}]});
  return [drbEinteilungHinweis(0),drbEinteilungHinweis(1)]});
 p(/5 gleiche Stücke \(aus der Wunschlänge\), je 2.?432 mm/.test(r[0])&&r[1]==="automatisch","Hinweis unter dem Feld nennt Anzahl und Länge bzw. «automatisch»",r);
 r=await ev(()=>{const a=drbAusData({kanten:[{laenge:1,wunsch:"2500"},{laenge:1,wunsch:-5},{laenge:1}]});return a.kanten.map(k=>k.wunsch)});
 p(r[0]===2500&&r[1]===""&&r[2]==="","Laden: gültige Wunschlänge bleibt, ungültig/fehlend → leer",r);
 r=await ev(()=>{fpA.dachrand=drbAusData({kanten:[{laenge:12000,ecke:"ende",wunsch:2500}]});return drbDaten().kanten[0].wunsch});
 p(r===2500,"Die Wunschlänge wird mitgespeichert (drbDaten)",r);
 await ev(()=>{fpA.material=null;fpA.dachrand=drbAusData({kanten:[{laenge:12000,ecke:"ende"},{laenge:6000,ecke:"ende"}]});const host=document.createElement("div");document.body.appendChild(host);host.innerHTML='<input id="drb_wunschAlle" value="2000">'});
 r=await ev(()=>{const m=fpA.dachrand;const w=drbWunsch(document.getElementById("drb_wunschAlle").value);m.kanten.forEach(k=>{k.wunsch=w;k.teile=""});return m.kanten.map(k=>drbAnzahlKante(k,40))});
 p(r.join()==="6,3","Wunschlänge 2000 für alle Kanten: 12 m → 6, 6 m → 3 Stücke",r);
 r=await ev(()=>{fpA.material=null;fpA.dachrand=drbAusData({stoss:"schieber",kanten:[{laenge:20000,ecke:"ende",wunsch:15000}]});return drbPruefungen().map(x=>x.text).join("|")});
 p(/Schieber-Abstand 10000 mm|Schieber-Abstand/.test(r),"Warnung bei zu grossem Schieber-Abstand gilt auch für die Wunschlänge",r);
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();
