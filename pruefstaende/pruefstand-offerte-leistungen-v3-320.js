// Prueft v3.320: "Massaufnahmen ableiten" legt je Offertenposition eine Projekt-Leistung an (oder verwendet die
// vorhandene) und verknuepft die neue Massaufnahme - idempotent, ohne Preis-/Mengenaenderung, ehrlich bei Fehlern.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-offerte-leistungen-v3-320.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

// Zustandsbehaftete Attrappe: Tabellen leben in window.__t, jeder Schreibvorgang landet in window.__log.
const STUB=`window.__t={measurements:[],leistungen:[],leistung_massaufnahmen:[]};window.__log=[];window.__fehler={};window.__id=100;
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({createSignedUrl:async(x)=>({data:{signedUrl:"https://t/"+x},error:null})})},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>{const z={t,eqs:[]};const q={};
  q.insert=d=>{z.op="insert";z.d=d;return q};
  q.upsert=(d,o)=>{z.op="upsert";z.d=d;z.o=o;return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  q.eq=(f,v)=>{z.eqs.push([f,v]);return q};
  ["order","limit","not","delete","update","in","is","range","ilike"].forEach(k=>{q[k]=()=>q});
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  const lauf=()=>{
   window.__t[t]=window.__t[t]||[];
   if(z.op==="insert"||z.op==="upsert"){
    window.__log.push({t,op:z.op,d:z.d});
    if(window.__fehler[t])return {data:null,error:{message:window.__fehler[t]}};
    const zeilen=(Array.isArray(z.d)?z.d:[z.d]);
    const neu=[];
    zeilen.forEach(x=>{
     if(t==="leistung_massaufnahmen"&&window.__t[t].some(r=>r.leistung_id===x.leistung_id&&r.measurement_id===x.measurement_id)){
      if(z.op==="upsert")return; return;}
     const r=Object.assign({id:++window.__id},x);window.__t[t].push(r);neu.push(r)});
    return {data:neu,error:null};}
   return {data:window.__t[t].filter(r=>z.eqs.every(([f,v])=>r[f]===v)),error:null};};
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g); return q}})};`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1200,height:1400}});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 const dialoge=[];
 page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);
 const POS=[
  {pos:"1.1",description:"Dachrinne halbrund 333mm verzinkt",quantity:24,unit:"m",preis:48},
  {pos:"1.2",description:"Einlaufblech konisch 0.6mm",quantity:6,unit:"Stk.",preis:90},
  {pos:"",description:"Kamineinfassung Ost",quantity:1,unit:"Stk.",preis:640}
 ];
 const grund=async(angebotId,pos)=>page.evaluate(([id,POS])=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"A"};
  allProfiles=[{id:"u1",first_name:"M",last_name:"L"}];
  meineRechte={admin:true};offerteZugriff=true;
  allProjects=[{id:7,name:"Dach",object:"X",archived:false}];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  angPositions=JSON.parse(JSON.stringify(POS));
  $("angTitle").value="Offerte Muster";
  setAngProjectField(7);renderAngPositionsTable();
  currentAngebotId=id;
  $("angebotEditModal").hidden=false;$("angMeasModal").hidden=true;
  window.__log=[];window.__fehler={};$("angMeasLeistungen").checked=true;
 },[angebotId,pos||POS]);
 const ablauf=async(haken)=>{
  const n=dialoge.length;
  await page.evaluate(async()=>{await angMassaufnahmenDialog()});
  if(haken)await page.evaluate(h=>{angMeasZeilen.forEach((z,i)=>z.haken=h.indexOf(i)>=0);renderAngMeasTabelle()},haken);
  await page.evaluate(()=>$("angMeasAnlegen").click());
  await page.waitForTimeout(400);
  return dialoge.slice(n).join(" | ");
 };
 const tab=n=>page.evaluate(n=>JSON.parse(JSON.stringify(window.__t[n])),n);

 console.log("\nA · normaler Lauf (3 Positionen, davon eine ohne Nummer)");
 await grund(12);
 let msg=await ablauf();
 let L=await tab("leistungen"),LM=await tab("leistung_massaufnahmen"),M=await tab("measurements");
 p(M.length===3,"3 Massaufnahmen angelegt",M.length);
 p(L.length===3,"3 Leistungen angelegt",L.length);
 p(LM.length===3&&LM.every(r=>L.some(l=>l.id===r.leistung_id)&&M.some(m=>m.id===r.measurement_id)),"3 Verknuepfungen, jede zeigt auf echte Leistung und echte Massaufnahme",LM);
 p(L.every(l=>l.angebot_id===12&&l.project_id===7&&l.status==="nicht_ausgefuehrt"),"Leistungen: Offerte, Projekt, Status offen",L[0]);
 p(L[0].menge===24&&L[0].einheit==="m","Menge/Einheit aus der Position",L[0]);
 p(L[2].angebot_position===""&&L[2].bezeichnung==="Kamineinfassung Ost","Position ohne Nummer: Leistung mit Beschreibung",L[2]);
 p(L.every(l=>l.company_id===undefined),"keine company_id vom Client");
 p(/3 neu/.test(msg)&&/3 verknüpft/.test(msg),"Meldung nennt die Zahlen",msg);
 const pos1=await page.evaluate(()=>JSON.stringify(angPositions));
 p(pos1===JSON.stringify(POS),"Preise/Mengen der Offerte unveraendert");

 console.log("\nB · zweiter Lauf: keine doppelten Leistungen, mehrere Massaufnahmen je Leistung");
 await grund(12);
 msg=await ablauf([0,1,2]);
 L=await tab("leistungen");LM=await tab("leistung_massaufnahmen");
 p(L.length===3,"weiterhin 3 Leistungen (keine Duplikate)",L.length);
 p(LM.length===6,"6 Verknuepfungen (je Leistung zwei Massaufnahmen)",LM.length);
 p(new Set(LM.map(r=>r.leistung_id+"/"+r.measurement_id)).size===6,"keine doppelte Verknuepfung");
 p(/0 neu/.test(msg)&&/3 vorhandene/.test(msg),"Meldung: vorhandene verwendet",msg);

 console.log("\nC · Offerte nicht gespeichert / Haken aus");
 await page.evaluate(()=>{window.__t.leistungen=[];window.__t.leistung_massaufnahmen=[]});
 await grund(null);
 msg=await ablauf([0]);
 L=await tab("leistungen");
 p(L.length===0,"ohne gespeicherte Offerte keine Leistung",L.length);
 p(/noch nicht gespeichert/.test(msg),"ehrlicher Hinweis",msg);
 await grund(12);
 await page.evaluate(()=>{$("angMeasLeistungen").checked=false});
 const n0=await page.evaluate(()=>{window.__log=[];return 0});
 msg=await (async()=>{const n=dialoge.length;await page.evaluate(async()=>{await angMassaufnahmenDialog()});
  await page.evaluate(()=>{$("angMeasLeistungen").checked=false;$("angMeasAnlegen").click()});await page.waitForTimeout(400);return dialoge.slice(n).join(" | ")})();
 const log=await page.evaluate(()=>window.__log.map(x=>x.t));
 p(log.indexOf("leistungen")<0&&log.indexOf("leistung_massaufnahmen")<0,"Haken aus: nur Massaufnahmen geschrieben",log);

 console.log("\nD · Fehler bei Leistungen: Massaufnahmen bleiben, Meldung ehrlich");
 await page.evaluate(()=>{window.__t.measurements=[];window.__t.leistungen=[];window.__t.leistung_massaufnahmen=[]});
 await grund(12);
 await page.evaluate(()=>{window.__fehler.leistungen="permission denied for table leistungen"});
 msg=await (async()=>{const n=dialoge.length;await page.evaluate(async()=>{await angMassaufnahmenDialog()});
  await page.evaluate(()=>{window.__fehler.leistungen="permission denied for table leistungen";$("angMeasAnlegen").click()});await page.waitForTimeout(400);return dialoge.slice(n).join(" | ")})();
 M=await tab("measurements");
 p(M.length===3,"Massaufnahmen trotzdem angelegt",M.length);
 p(/konnten nicht/.test(msg)&&/Massaufnahmen sind trotzdem angelegt/.test(msg),"Meldung sagt, was fehlt",msg);
 p(msg.indexOf("leistungen")<0||/Berechtigung/.test(msg),"keine rohe Tabellenmeldung",msg);

 console.log("\nE · doppelte Nummer, unklare Faelle, Zusatzleistung");
 await page.evaluate(()=>{window.__t.measurements=[];window.__t.leistungen=[{id:1,project_id:7,bezeichnung:"Zusatz",angebot_id:null,angebot_position:null}];window.__t.leistung_massaufnahmen=[]});
 await grund(12,[{pos:"2",description:"Blech A",quantity:1,unit:"Stk."},{pos:"2",description:"Blech B",quantity:2,unit:"Stk."}]);
 msg=await ablauf();
 L=await tab("leistungen");
 p(L.length===3&&L.filter(l=>l.angebot_id===12).length===2,"gleiche Nummer, andere Beschreibung -> zwei Leistungen",L.map(l=>[l.id,l.angebot_position,l.angebot_position_beschreibung]));
 p(L.find(l=>l.id===1)&&L.find(l=>l.id===1).angebot_id===null,"Zusatzleistung ohne Offerte bleibt unberuehrt");
 // unklar: zwei vorhandene Leistungen ohne Beschreibung mit derselben Nummer
 await page.evaluate(()=>{window.__t.measurements=[];window.__t.leistungen=[{id:5,project_id:7,bezeichnung:"x",angebot_id:12,angebot_position:"3"},{id:6,project_id:7,bezeichnung:"y",angebot_id:12,angebot_position:"3"}];window.__t.leistung_massaufnahmen=[]});
 await grund(12,[{pos:"3",description:"Etwas",quantity:1,unit:"m"}]);
 msg=await ablauf();
 L=await tab("leistungen");LM=await tab("leistung_massaufnahmen");
 p(L.length===2&&LM.length===0,"unklar -> nichts geraten, nichts verknuepft",{L:L.length,LM:LM.length});
 p(/nicht eindeutig/.test(msg),"Meldung weist auf Handzuordnung hin",msg);

 console.log("\nF · andere Offerte desselben Projekts mit gleicher Nummer wird nicht angefasst");
 await page.evaluate(()=>{window.__t.measurements=[];window.__t.leistung_massaufnahmen=[]; window.__t.leistungen=[]});
 await grund(12,[{pos:"1",description:"Rinne",quantity:3,unit:"m"}]);
 await ablauf();
 await grund(13,[{pos:"1",description:"Rinne",quantity:3,unit:"m"}]);
 await page.evaluate(()=>{window.__fl=0});
 const orig=await page.evaluate(()=>window.__t.leistungen.length);
 // die Attrappe filtert auf angebot_id: Offerte 13 sieht Leistung von 12 nicht
 await ablauf([0]);
 L=await tab("leistungen");
 p(orig===1&&L.length===2&&L.some(l=>l.angebot_id===13),"Offerte 13 bekommt eigene Leistung",L.map(l=>l.angebot_id));

 console.log("\nG · Quelltext");
 const fs=require("fs");
 const q63=fs.readFileSync("js/63-angebote.js","utf8"),q65=fs.readFileSync("js/65-leistungen.js","utf8"),h=fs.readFileSync("index.html","utf8");
 p(/id="angMeasLeistungen"/.test(h),"Auswahlfeld im Dialog");
 p(/ignoreDuplicates/.test(q65.slice(q65.indexOf("async function leiAusOffertePositionen"))),"Verknuepfung ohne Duplikate");
 p(!/\.delete\(/.test(q65.slice(q65.indexOf("async function leiAusOffertePositionen"),q65.indexOf("async function loadProjectLeistungen"))),"die Funktion loescht nichts");
 p(!/\.update\(/.test(q65.slice(q65.indexOf("async function leiAusOffertePositionen"),q65.indexOf("async function loadProjectLeistungen"))),"und aendert keine vorhandene Leistung");
 p(/Massaufnahmen sind trotzdem angelegt/.test(q63),"Fehlertext vorhanden");
 p(jsFehler.length===0,"keine JS-Fehler",jsFehler);
 await b.close();
 console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();
