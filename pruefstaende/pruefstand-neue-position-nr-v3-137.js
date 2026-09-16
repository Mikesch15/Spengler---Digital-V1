// Prueft "＋ Material hinzufügen" im Material-Katalog (v3.137).
//
// Gemeldet vom Anwender, mit Bildschirmfoto:
//   Fehler: duplicate key value violates unique constraint "materials_edv_nr_key"
//
// Ursache: der Knopf trug die EDV-Nr. als FESTEN TEXT ein -
// edv_nr:"Neue Nr.". Beim ersten Mal ging das gut, beim zweiten Mal brach
// die Datenbank ab. Der Knopf direkt darueber im selben File (Funktionen)
// macht es seit je richtig und nummeriert durch; beim Material wurde es nie
// nachgezogen.
//
// Der Vertrag, den dieser Pruefstand festhaelt:
//   1. Die Nummer wird berechnet, nicht gesetzt - mehrere Klicks
//      hintereinander ergeben mehrere Positionen, ohne Fehlermeldung.
//   2. Gerechnet wird mit derselben Funktion wie in der Lagerverwaltung.
//   3. Ein echter Zusammenstoss wird verstaendlich gemeldet, nicht mit dem
//      rohen Postgres-Text.
//
// Die Attrappe setzt die Eindeutigkeitsregel WIRKLICH durch - ohne das
// wuerde der Pruefstand nichts beweisen.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-neue-position-nr-v3-137.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:`window.__db={materials:[{id:1,edv_nr:"100.55",name:"CNS 1.4301 geschl.",dim:"",unit:"Stk.",price:0}],
 log:[], immerDoppelt:false};
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:(t)=>{const z={t};const q={};
  q.insert=d=>{z.op="insert";z.daten=d;return q};
  q.upsert=(d,o)=>{z.op="upsert";z.daten=d;return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  ["eq","order","limit","not","delete","update"].forEach(k=>{if(!q[k])q[k]=()=>q});
  const lauf=()=>{
   if(t==="materials"&&z.op==="insert"){
    const d=z.daten; window.__db.log.push(d.edv_nr);
    // Die ECHTE Regel der Datenbank: UNIQUE auf edv_nr.
    if(window.__db.immerDoppelt||window.__db.materials.some(m=>m.edv_nr===d.edv_nr))
     return {data:null,error:{message:'duplicate key value violates unique constraint "materials_edv_nr_key"'}};
    window.__db.materials.push(Object.assign({id:window.__db.materials.length+1},d));
    return {data:[d],error:null};
   }
   if(t==="materials"&&z.op==="select")return {data:window.__db.materials,error:null};
   return {data:[],error:null}};
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g); return q}})};`}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let dialoge=[]; page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"A"};
  meineRechte={admin:true,kataloge:true}; allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const klick=async()=>{ await page.evaluate(()=>$("newMaterial").click()); await page.waitForTimeout(400); };
 const stand=()=>page.evaluate(()=>({gesendet:window.__db.log.slice(),
   katalog:window.__db.materials.map(m=>m.edv_nr)}));

 console.log("\nA · Die Nummer wird gerechnet, nicht gesetzt");
 const fn=await page.evaluate(()=>({eigen:typeof katalogNaechsteFreieEdvNr==="function",
   lager:typeof lagerNaechsteFreieEdvNr==="function"}));
 p(fn.eigen,"katalogNaechsteFreieEdvNr ist vorhanden",fn);
 // Eine Nummer, zwei Wege: der Katalog rechnet mit derselben Funktion wie
 // die Lagerverwaltung, es gibt kein zweites Verfahren.
 p(fn.lager,"und stuetzt sich auf die Funktion der Lagerverwaltung",fn);

 console.log("\nB · Vier Klicks hintereinander - der gemeldete Fall");
 dialoge=[];
 for(let i=0;i<4;i++)await klick();
 const s=await stand();
 p(s.katalog.length===5,"aus vier Klicks werden vier neue Positionen",s.katalog);
 // Gegenprobe auf den gemeldeten Fehler: es darf KEINE Meldung kommen.
 p(dialoge.length===0,
   "GEGENPROBE: keine Fehlermeldung - der gemeldete Abbruch bleibt aus",dialoge);
 p(!dialoge.some(m=>/duplicate key|unique constraint/i.test(m)),
   "GEGENPROBE: schon gar nicht der rohe Datenbanktext",dialoge);
 // Gegenprobe auf den alten Code: der schickte viermal dieselbe Nummer.
 p(new Set(s.gesendet).size===s.gesendet.length,
   "GEGENPROBE: jede gesendete Nummer ist verschieden",s.gesendet);
 p(!s.gesendet.some(x=>x==="Neue Nr."),
   "GEGENPROBE: der feste Text \"Neue Nr.\" wird nicht mehr gesendet",s.gesendet);
 p(s.gesendet.every(x=>/^\d+\.\d\d$/.test(String(x))),
   "die Nummern haben die uebliche Form",s.gesendet);
 p(s.katalog.indexOf("100.55")===0,
   "die bestehende Position bleibt unangetastet",s.katalog);

 console.log("\nC · Ein echter Zusammenstoss wird verstaendlich gemeldet");
 await page.evaluate(()=>{window.__db.immerDoppelt=true;window.__db.log=[]});
 dialoge=[];
 await klick();
 p(dialoge.length===1,"es kommt genau eine Meldung",dialoge);
 p(dialoge.some(m=>/bereits vergeben/.test(m)),
   "in verstaendlichen Worten",dialoge);
 // Gegenprobe: der rohe Postgres-Text darf dem Anwender nicht mehr
 // vorgelegt werden - genau das stand im Bildschirmfoto.
 p(!dialoge.some(m=>/duplicate key value violates/.test(m)),
   "GEGENPROBE: NICHT als \"duplicate key value violates …\"",dialoge);
 const s2=await page.evaluate(()=>window.__db.log.slice());
 p(s2.length===2,"vorher wird ein zweites Mal mit frischem Stand gerechnet",s2);
 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));

 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
