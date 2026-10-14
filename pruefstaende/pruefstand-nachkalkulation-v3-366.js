// v3.366: Nachkalkulation - Abacus-Stunden (PDF / Excel / CSV) importieren, Soll/Ist, Abgleich mit den App-Regiestunden.
// Fixtures sind anonymisiert und werden hier erzeugt (xlsx im Node-Prozess, PDF mit dem mitgelieferten jsPDF im Browser).
// Datenbank: eigener Speicher-Stub, der die RLS-Regeln NACHSPIELT (Firma, Freischaltung, Projekt-Firma, Eindeutigkeit).
// Die echten Policies sind separat in der Datenbank geprüft (siehe Abschlussbericht).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const XLSX=require(path.join(process.cwd(),"vendor/xlsx.full.min.js"));
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

const STUB=`window.__ruf=[];
window.__db={firma:'c1',feature:true,fehlerStunden:false,
 projects:[{id:1,name:'Dach Muster AG',order_no:'A-1001',company_id:'c1',archived:false},{id:2,name:'Fassade Beispiel',order_no:'A-2002',company_id:'c1',archived:false},{id:3,name:'Fremdprojekt',order_no:'B-9',company_id:'c2',archived:false}],
 feature_access:[{profile_id:'u1',feature:'nachkalkulation',granted:true}],
 abacus_importe:[],abacus_stunden:[],abacus_abgleich:[],reports:[],angebote:[],seq:100};
function __tab(name){
 const st={name,filter:[],op:null,werte:null,einzeln:false,sel:false};
 const f={};
 f.select=()=>{st.sel=true;return f};f.order=()=>f;f.limit=()=>f;
 f.eq=(k,v)=>{st.filter.push([k,v]);return f};
 f.insert=w=>{st.op='insert';st.werte=w;return f};
 f.update=w=>{st.op='update';st.werte=w;return f};
 f.upsert=w=>{st.op='upsert';st.werte=w;return f};
 f.delete=()=>{st.op='delete';return f};
 f.single=()=>{st.einzeln=true;return f};
 f.maybeSingle=()=>{st.einzeln=true;st.vielleicht=true;return f};
 const abacus=name.indexOf('abacus_')===0;
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',werte:st.werte?JSON.parse(JSON.stringify(st.werte)):null,filter:st.filter.slice()});
  const db=window.__db;
  if(abacus&&!db.feature)return {data:st.op?null:[],error:st.op?{message:'new row violates row-level security policy'}:null};
  let tab=db[name]||[];
  if(abacus)tab=tab.filter(r=>r.company_id===db.firma);
  const passt=r=>st.filter.every(([k,v])=>r[k]===v);
  if(st.op==='insert'){
   const liste=Array.isArray(st.werte)?st.werte:[st.werte];
   const neu=[];
   for(const w of liste){
    const z=Object.assign({},w);
    if(abacus){
     z.company_id=db.firma;z.id=++db.seq;
     const pr=db.projects.find(x=>x.id===z.project_id);
     if(!pr||pr.company_id!==db.firma)return {data:null,error:{message:'Projekt gehoert nicht zur eigenen Firma.'}};
     if(name==='abacus_stunden'){
      if(db.fehlerStunden)return {data:null,error:{message:'boom'}};
      const im=db.abacus_importe.find(x=>x.id===z.import_id);
      if(!im||im.project_id!==z.project_id)return {data:null,error:{message:'Import gehoert nicht zu diesem Projekt.'}};
      if(db.abacus_stunden.some(x=>x.project_id===z.project_id&&x.fingerprint===z.fingerprint)||neu.some(x=>x.fingerprint===z.fingerprint&&x.project_id===z.project_id))return {data:null,error:{message:'duplicate key value violates unique constraint',code:'23505'}};
     }
     z.importiert_am=z.importiert_am||'2026-10-14T10:00:00Z';z.geprueft_am=z.geprueft_am||'2026-10-14T11:00:00Z';
    }
    neu.push(z);
   }
   neu.forEach(z=>db[name].push(z));
   const raus=JSON.parse(JSON.stringify(neu));
   return {data:st.einzeln?raus[0]:raus,error:null};
  }
  if(st.op==='delete'){
   const weg=tab.filter(passt);
   db[name]=db[name].filter(r=>!weg.includes(r));
   if(name==='abacus_importe'){const ids=weg.map(x=>x.id);db.abacus_stunden=db.abacus_stunden.filter(x=>ids.indexOf(x.import_id)<0)}
   return {data:null,error:null};
  }
  const treffer=tab.filter(passt).map(r=>JSON.parse(JSON.stringify(r)));
  if(st.einzeln)return {data:treffer[0]||null,error:null};
  return {data:treffer,error:null};
 };
 f.then=(a,b)=>Promise.resolve(lauf()).then(a,b);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:n=>n==='feature_access'?(function(){const t=__tab('feature_access');return t})():__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:'x'}})})}
})};`;

// ---- Fixtures --------------------------------------------------------------------------------------------------------------
const wbBuf=(blaetter,nachher)=>{
 const wb=XLSX.utils.book_new();
 for(const [n,aoa] of blaetter){const ws=XLSX.utils.aoa_to_sheet(aoa);if(nachher)nachher(n,ws);XLSX.utils.book_append_sheet(wb,ws,n)}
 return XLSX.write(wb,{type:"buffer",bookType:"xlsx"});
};
const KOPF=["Rapport-Nr","Auftrag","Datum","Mitarbeiter","Tätigkeit","Stunden"];
const STANDARD=[
 ["Stundenrapport Abacus (anonymisiert)"],[],KOPF,
 ["R-1","A-1001","03.03.2026","Hans Muster","Dachrinne montieren",7.5],
 ["R-2","A-1001","03.03.2026","Peter Beispiel","Dachrinne montieren","8,25"],
 ["R-3","A-1001","04.03.2026","Hans Muster","Kamin einfassen","6:30"],
 [],
 ["","","","","Total",22.25],
 ["R-4","A-1001","05.03.2026","Hans Muster","Rüsten","2.0"]
];
const FIX={standard:wbBuf([["Rapport",STANDARD]])};
FIX.abweichend=wbBuf([["Blatt1",[["Nr","Proj","Tag","Pers.","Arbeit","Zeit (h)"],
 ["x1","A-1001","10.03.2026","Hans Muster","Spenglerarbeiten",3],["x2","A-1001","11.03.2026","Peter Beispiel","Spenglerarbeiten",4]]]]);
FIX.ohneKopf=wbBuf([["Blatt1",[["a","b","c","d"],["A-1001","12.03.2026","Hans Muster",5],["A-1001","13.03.2026","Hans Muster",6]]]]);
FIX.zweiBlaetter=wbBuf([["Deckblatt",[["Nur ein Titel"],["ohne Tabelle"]]],["Stunden",STANDARD]]);
FIX.ohneNr=wbBuf([["B",[["Datum","Mitarbeiter","Tätigkeit","Stunden"],["03.03.2026","Hans Muster","Montage",4]]]]);
FIX.fremdNr=wbBuf([["B",[["Datum","Auftrag","Mitarbeiter","Tätigkeit","Stunden"],["03.03.2026","Z-777","Hans Muster","Montage",4]]]]);
FIX.mehrdeutig=wbBuf([["B",[["Datum","Auftrag","Mitarbeiter","Tätigkeit","Stunden"],["03.03.2026","A-1001","Hans Muster","Montage",4],["04.03.2026","A-2002","Hans Muster","Montage",3]]]]);
FIX.zeitformat=wbBuf([["Z",[["Datum","Auftrag","Mitarbeiter","Tätigkeit","Stunden"],["03.03.2026","A-1001","Hans Muster","Montage",0],["04.03.2026","A-1001","Hans Muster","Montage","7,5"],["05.03.2026","A-1001","Hans Muster","Montage","1.234"]]]],
 (n,ws)=>{ws["E2"]={t:"n",v:0.3125,z:"[h]:mm"}});   // 7:30 als Excel-Zeit
FIX.formel=wbBuf([["F",[["Datum","Auftrag","Mitarbeiter","Tätigkeit","Stunden"],["03.03.2026","A-1001","Hans Muster","Montage",0]]]],
 (n,ws)=>{ws["E2"]={t:"n",f:"2*3.5"}});            // Formel ohne gespeichertes Ergebnis
FIX.csv=Buffer.from("Datum;Auftrag;Mitarbeiter;Tätigkeit;Stunden\n03.03.2026;A-1001;Hans Muster;Montage;\"7,5\"\n04.03.2026;A-1001;Hans Muster;Montage;4\n","utf8");
FIX.maxDub=wbBuf([["B",[["Datum","Auftrag","Mitarbeiter","Tätigkeit","Stunden"],["03.03.2026","A-1001","Hans Muster","Spenglerarbeiten",7.5]]]]);

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900}});
 const fehler=[];page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof abZeit==="function"&&typeof nkDateiOeffnen==="function"&&typeof a2ProjRegister==="function");
 const reset=()=>page.evaluate(()=>{
  const db=window.__db;db.feature=true;db.firma='c1';db.fehlerStunden=false;
  db.abacus_importe=[];db.abacus_stunden=[];db.abacus_abgleich=[];db.reports=[];db.angebote=[];window.__ruf=[];
  currentProfile={id:'u1',role:'admin',company_id:'c1'};
  allProjects=db.projects.filter(x=>x.company_id==='c1');
  nkZugriff=true;nkD=null;nk={projektId:null,laedt:false,fehler:"",stunden:[],importe:[],abgleich:[],reports:[],angebote:[],angeboteFehler:"",geladen:false};
  const m=document.getElementById("a2NkDialog");if(m)m.remove();
  window.appPrompt=async()=>"geprüft";window.appConfirm=async()=>true;window.appAlert=async()=>{};
 });
 const datei=(name,buf,typ)=>page.evaluate(async([n,b64,t])=>{
  const u8=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  await nkDateiOeffnen(new File([u8],n,{type:t||""}));
  return {fehler:!!document.querySelector("#a2NkBox .a2-h-warnung"),text:(document.getElementById("a2NkBox")||{}).textContent||""};
 },[name,Buffer.from(buf).toString("base64"),typ]);
 const zustand=()=>page.evaluate(()=>nkD?{projektId:nkD.projektId,anz:nkD.zeilen.length,st:nkD.zeilen.map(z=>z.status),std:nkD.zeilen.map(z=>z.stunden),
  c:nkZaehlung(),blatt:nkD.blatt,warn:nkD.warnungen,meld:nkD.meldung,speicherOffen:!document.querySelector('[data-nk="speichern"]').disabled,auto:nkD.projektAuto}:null);

 console.log("\nA · Zeit und Datum (rein)");
 const a=await page.evaluate(()=>({
  dez:abZeit("7,5"),dez2:abZeit("7.50"),hm:abZeit("7:30"),hm2:abZeit("07:45"),hm3:abZeit("7h30"),stdSuffix:abZeit("8 h"),neg:abZeit("-1,5"),
  tsd:abZeit("1'234.5"),de:abZeit("1.234,5"),en:abZeit("1,234.5"),mehrdeutig:abZeit("1.234"),min60:abZeit("7:75"),text:abZeit("abc"),leer:abZeit(""),zahl:abZeit(7.5),
  d1:abDatum("03.03.2026"),d2:abDatum("3.3.26"),d3:abDatum("2026-03-03"),d4:abDatum(46085),d5:abDatum("03/03/2026"),d6:abDatum("13/03/2026"),d7:abDatum("31.02.2026"),d8:abDatum("Di 03.03.2026"),d9:abDatum("irgendwann"),
  d10:abDatum(new Date(2026,2,2,23,59,40))
 }));
 p(a.dez.wert===7.5&&a.dez2.wert===7.5&&a.zahl.wert===7.5&&a.stdSuffix.wert===8,"Dezimalstunden: 7,5 / 7.50 / 7.5 / „8 h“",[a.dez,a.dez2,a.stdSuffix]);
 p(a.hm.wert===7.5&&a.hm.art==="hm"&&a.hm2.wert===7.75&&a.hm3.wert===7.5,"Stunden:Minuten: 7:30 = 7.5, 07:45 = 7.75, 7h30 = 7.5 (Art „hm“ vermerkt)",[a.hm,a.hm2,a.hm3]);
 p(a.tsd.wert===1234.5&&a.de.wert===1234.5&&a.en.wert===1234.5,"Lokalisierte Zahlenformate (CH-Apostroph, DE, EN)",[a.tsd,a.de,a.en]);
 p(a.mehrdeutig.wert===null&&a.mehrdeutig.unklar&&a.min60.wert===null&&a.text.wert===null&&a.leer.leer===true,"Unklares wird NICHT interpretiert: „1.234“, 7:75, Text → kein Wert + Grund",[a.mehrdeutig,a.min60,a.text]);
 p(a.neg.wert===-1.5,"Negative Stunden (Korrektur) bleiben erkennbar",a.neg);
 p(a.d1.iso==="2026-03-03"&&a.d2.iso==="2026-03-03"&&a.d3.iso==="2026-03-03"&&a.d8.iso==="2026-03-03"&&a.d4.iso&&a.d10.iso==="2026-03-03","Datumsformate: dd.mm.yyyy, d.m.yy, ISO, Wochentag, Excel-Serie, Excel-Zeitzonenrundung",[a.d1,a.d2,a.d3,a.d4,a.d8,a.d10]);
 p(a.d5.iso===null&&a.d5.unklar&&a.d6.iso==="2026-03-13"&&a.d7.iso===null&&a.d9.iso===null,"Unklares Datum (03/03/2026, 31.02., Text) → kein Datum; 13/03/2026 eindeutig",[a.d5,a.d6,a.d7,a.d9]);

 console.log("\nB · Excel mit Standardspalten, leere und Summenzeilen");
 await reset();
 let r=await datei("rapport.xlsx",FIX.standard);
 let s=await zustand();
 p(s&&s.c.neu===4&&s.anz===5&&s.c.summe===1,"4 Buchungen und 1 Summenzeile erkannt (Titelzeile und leere Zeile sind keine Buchungen)",s);
 p(s&&s.st.join()==="neu,neu,neu,summe,neu"&&Math.abs(s.c.stunden-24.25)<0.001,"Summe der Einzelbuchungen 24,25 h (nicht 24,25 + 22,25 Total); 7:30 und 6:30 korrekt gelesen",s);
 p(s&&s.projektId===1&&s.auto,"Projekt über die Auftragsnummer A-1001 erkannt",s);
 const sum=await page.evaluate(()=>nkD.lese.roh.length);
 p(sum===5,"Das „Total“ steht als Summenzeile in der Vorschau (nicht still verschwunden)",sum);
 p(await page.evaluate(()=>/Summenzeile/.test(document.getElementById("a2NkBox").textContent)),"Vorschau nennt die Summenzeile");

 console.log("\nC · Bestätigen, Protokoll, Dubletten beim erneuten Import");
 await page.evaluate(()=>nkSpeichern());
 const db1=await page.evaluate(()=>({st:window.__db.abacus_stunden.length,im:window.__db.abacus_importe.map(i=>({n:i.dateiname,neu:i.anz_neu,t:i.dateityp,sha:!!i.datei_sha})),
   sum:window.__db.abacus_stunden.reduce((x,y)=>x+y.stunden,0),ruf:window.__ruf.filter(x=>x.op!=="select").map(x=>x.tabelle)}));
 p(db1.st===4&&db1.im.length===1&&db1.im[0].neu===4&&db1.im[0].t==="xlsx"&&db1.im[0].sha,"4 Zeilen und 1 Protokolleintrag (Datei, Typ, Prüfsumme, Anzahl) gespeichert",db1);
 p(Math.abs(db1.sum-24.25)<0.001,"Iststunden = 24,25 h",db1.sum);
 p(db1.ruf.every(t=>t.indexOf("abacus_")===0),"Es wurde in KEINE andere Tabelle geschrieben (kein Material, keine Offerte, kein Rapport, kein Workflow)",db1.ruf);
 p(await page.evaluate(()=>/Import abgeschlossen/.test(document.getElementById("a2NkBox").textContent)&&/4 Zeilen/.test(document.getElementById("a2NkBox").textContent)),"Zusammenfassung nach dem Import");
 const meta=await page.evaluate(()=>{const z=window.__db.abacus_stunden[0];return {firma:z.company_id,proj:z.project_id,ref:z.rapport_ref,auftrag:z.auftrag_nr,roh:z.zeit_roh}});
 p(meta.firma==="c1"&&meta.proj===1&&meta.ref&&meta.auftrag==="A-1001"&&meta.roh!==null,"Firma/Projekt aus der Sitzung, Quellreferenz und Original-Zeitangabe gespeichert",meta);
 await page.evaluate(()=>nkDialogSchliessen());
 r=await datei("rapport.xlsx",FIX.standard);
 s=await zustand();
 p(s&&s.st.join()==="vorhanden,vorhanden,vorhanden,summe,vorhanden"&&s.c.ein===0&&!s.speicherOffen,"Erneuter Import derselben Datei: alle „bereits vorhanden“, nichts auswählbar, Übernehmen gesperrt",s);
 p(await page.evaluate(()=>/schon importiert/.test(document.getElementById("a2NkBox").textContent)),"Hinweis „Diese Datei wurde schon importiert“");
 await page.evaluate(()=>nkDialogSchliessen());
 const nachher=await page.evaluate(()=>window.__db.abacus_stunden.length);
 p(nachher===4,"Nach dem erneuten Öffnen weiterhin genau 4 Zeilen",nachher);

 console.log("\nD · Mögliche Dublette, Abweichungen, Abbruch");
 await page.evaluate(()=>{const z=window.__db.abacus_stunden.find(x=>x.datum==="2026-03-03"&&x.mitarbeiter==="Hans Muster");z.fingerprint="abx|anders";z.taetigkeit="etwas ganz anderes"});
 r=await datei("dub.xlsx",FIX.maxDub);
 s=await zustand();
 p(s&&s.st[0]==="moegliche_dublette"&&s.c.ein===0,"Gleiches Datum, Mitarbeiter und Stunden, sonst anders → „mögliche Dublette“, standardmässig abgewählt",s);
 await page.evaluate(()=>nkDialogSchliessen());
 p(await page.evaluate(()=>!document.getElementById("a2NkDialog")&&nkD===null&&window.__db.abacus_stunden.length===4),"Abbrechen: Dialog weg, nichts übernommen");

 console.log("\nE · Projektzuordnung: fehlend, unbekannt, mehrdeutig");
 await reset();
 r=await datei("ohne.xlsx",FIX.ohneNr);s=await zustand();
 p(s&&s.projektId===null&&!s.speicherOffen,"Keine Auftragsnummer in der Datei: Projekt nicht gesetzt, Übernehmen gesperrt",s);
 await page.evaluate(()=>{const e=document.querySelector('[data-nk="projekt"]');e.value="2";e.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(100);
 s=await zustand();
 p(s&&String(s.projektId)==="2"&&s.speicherOffen,"Nach ausdrücklicher Projektwahl ist Übernehmen möglich",s);
 await page.evaluate(()=>nkDialogSchliessen());
 await reset();
 r=await datei("fremd.xlsx",FIX.fremdNr);s=await zustand();
 p(s&&s.projektId===null&&!s.speicherOffen&&await page.evaluate(()=>/gehört zu keinem Projekt/.test(document.getElementById("a2NkBox").textContent)),"Unbekannte Auftragsnummer Z-777: Hinweis, keine automatische Zuordnung",s);
 await page.evaluate(()=>nkDialogSchliessen());
 await reset();
 r=await datei("mehr.xlsx",FIX.mehrdeutig);s=await zustand();
 p(s&&s.projektId===null&&!s.speicherOffen,"Zwei Auftragsnummern in einer Datei: nicht geraten, Projekt muss gewählt werden",s);
 await page.evaluate(()=>{const e=document.querySelector('[data-nk="projekt"]');e.value="1";e.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(100);
 s=await zustand();
 p(s&&s.st.join()==="neu,unklar"&&s.c.ein===1,"Zeile mit Auftrag A-2002 im Projekt A-1001: „unklar“ (weicht ab) und standardmässig NICHT dabei",s);
 await page.evaluate(()=>nkDialogSchliessen());

 console.log("\nF · Abweichende Spalten, manuelle Zuordnung, mehrere Blätter, CSV");
 await reset();
 r=await datei("abw.xlsx",FIX.abweichend);s=await zustand();
 p(s&&s.anz===2&&s.st.join()==="neu,neu"&&s.projektId===1,"Abweichende Überschriften (Nr/Proj/Tag/Pers./Arbeit/Zeit (h)) werden über Synonyme erkannt",s);
 await page.evaluate(()=>nkDialogSchliessen());
 await reset();
 r=await datei("ohnekopf.xlsx",FIX.ohneKopf);s=await zustand();
 const m1=await page.evaluate(()=>({meld:nkD.meldung,sel:!!document.querySelector('[data-nk="map"]'),anz:nkD.zeilen.length}));
 p(m1.meld&&/Spalten/.test(m1.meld)&&m1.sel&&m1.anz===0,"Ohne erkennbare Kopfzeile: verständliche Meldung, Zuordnung von Hand angeboten, nichts geraten",m1);
 await page.evaluate(()=>{
  const set=(k,v)=>{const e=document.querySelector('[data-nk="map"][data-nk-key="'+k+'"]');e.value=v;e.dispatchEvent(new Event("change",{bubbles:true}))};
  set("auftrag_nr","0");
 });
 await page.waitForTimeout(80);
 for(const [k,v] of [["datum","1"],["mitarbeiter","2"],["stunden","3"]]){
  await page.evaluate(([k,v])=>{const e=document.querySelector('[data-nk="map"][data-nk-key="'+k+'"]');e.value=v;e.dispatchEvent(new Event("change",{bubbles:true}))},[k,v]);
  await page.waitForTimeout(80);
 }
 s=await zustand();
 p(s&&s.anz===3,"Nach manueller Spaltenzuordnung: Zeilen gelesen (die erste Zeile ist hier noch Datenzeile)",s);
 await page.evaluate(()=>{const e=document.querySelector('[data-nk="start"]');e.value="2";e.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(100);
 s=await zustand();
 p(s&&s.anz===2&&s.st.join()==="neu,neu"&&s.projektId===1&&Math.abs(s.std[0]+s.std[1]-11)<0.001,"„Daten beginnen in Zeile 2“: 2 Buchungen, 11 h, Projekt A-1001 erkannt",s);
 await page.evaluate(()=>nkDialogSchliessen());
 await reset();
 r=await datei("zwei.xlsx",FIX.zweiBlaetter);s=await zustand();
 const bl=await page.evaluate(()=>({opts:[...document.querySelectorAll('[data-nk="blatt"] option')].map(o=>o.value),anz:nkD.zeilen.length}));
 p(bl.opts.join()==="Deckblatt,Stunden"&&bl.anz===0,"Mehrere Tabellenblätter: Auswahl angeboten; das Deckblatt ohne Tabelle liefert nichts",bl);
 await page.evaluate(()=>{const e=document.querySelector('[data-nk="blatt"]');e.value="Stunden";e.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(150);
 s=await zustand();
 p(s&&s.blatt==="Stunden"&&s.c.neu===4,"Blatt „Stunden“ gewählt: 4 Buchungen",s);
 await page.evaluate(()=>nkDialogSchliessen());
 await reset();
 r=await datei("export.csv",FIX.csv,"text/csv");s=await zustand();
 p(s&&s.anz===2&&Math.abs(s.std[0]+s.std[1]-11.5)<0.001&&s.projektId===1,"CSV (Semikolon, Dezimalkomma in Anführungszeichen): 2 Buchungen, 11,5 h",s);
 await page.evaluate(()=>nkDialogSchliessen());

 console.log("\nG · Zeitformate in Excel, Formeln ohne Wert");
 await reset();
 r=await datei("zeit.xlsx",FIX.zeitformat);s=await zustand();
 p(s&&s.std[0]===7.5&&s.std[1]===7.5,"Excel-Zeitzelle [h]:mm (0,3125) wird als 7:30 = 7,5 h gelesen – nicht als 0,31",s);
 p(s&&s.st[2]==="fehler"&&s.std[2]===null,"„1.234“ ist mehrdeutig: fehlerhaft, ohne Wert, nicht übernehmbar (aber in der Vorschau korrigierbar)",s);
 await page.evaluate(()=>{const i=document.querySelector('[data-nk-feld="zeit"][data-nk-i="2"]');i.value="1:14";i.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(100);
 s=await zustand();
 p(s&&s.std[2]!==null&&Math.abs(s.std[2]-1.2333)<0.01&&s.st[2]!=="fehler"&&s.c.ein===3,"Korrektur in der Vorschau: Zeile wird gültig und eingeschlossen",s);
 await page.evaluate(()=>nkDialogSchliessen());
 await reset();
 r=await datei("formel.xlsx",FIX.formel);s=await zustand();
 p(s&&s.warn.some(w=>/Formelzellen ohne gespeicherten Wert/.test(w)),"Formelzelle ohne berechneten Wert: ausdrücklicher Hinweis",s&&s.warn);
 await page.evaluate(()=>nkDialogSchliessen());

 console.log("\nH · PDF: Text-PDF, Scan, Datei-Prüfungen");
 await reset();
 const pdfText=await page.evaluate(()=>{
  const {jsPDF}=window.jspdf;const d=new jsPDF({unit:"mm",format:"a4"});
  d.setFontSize(12);d.text("Stundenrapport Abacus (anonymisiert)",15,15);d.text("Auftrag: A-1001",15,22);
  const x=[15,45,80,150];
  ["Datum","Mitarbeiter","Tätigkeit","Stunden"].forEach((t,i)=>d.text(t,x[i],35));
  const zeilen=[["03.03.2026","Hans Muster","Dachrinne montieren","7.50"],["03.03.2026","Peter Beispiel","Dachrinne montieren","8.25"],["04.03.2026","Hans Muster","Kamin einfassen","6:30"]];
  zeilen.forEach((z,r)=>z.forEach((t,i)=>d.text(t,x[i],42+r*7)));
  d.text("Total",80,70);d.text("22.25",150,70);
  return Array.from(new Uint8Array(d.output("arraybuffer")));
 });
 r=await datei("rapport.pdf",Buffer.from(pdfText),"application/pdf");s=await zustand();
 p(s&&s.anz===4&&s.st.filter(x=>x==="summe").length===1&&s.st.filter(x=>x==="neu").length===3,"Text-PDF: Spalten nach Lage erkannt (3 Buchungen), „Total“ als Summenzeile",s);
 p(s&&s.st.filter(x=>x==="neu").length===3&&s.projektId===1,"3 Buchungen neu, Projekt über „Auftrag: A-1001“ im PDF erkannt",s);
 await page.evaluate(()=>nkDialogSchliessen());
 const pdfScan=await page.evaluate(()=>{const {jsPDF}=window.jspdf;const d=new jsPDF();d.rect(20,20,100,100,"F");return Array.from(new Uint8Array(d.output("arraybuffer")))});
 r=await datei("scan.pdf",Buffer.from(pdfScan),"application/pdf");
 p(r.fehler&&/keinen auslesbaren Text/.test(r.text)&&/OCR/.test(r.text)&&/Excel/.test(r.text),"Gescanntes PDF ohne Text: verständliche Fehlermeldung mit nächstem Schritt, keine stille Teilübernahme",r.text.slice(0,300));
 await page.evaluate(()=>nkDialogSchliessen());
 r=await datei("kaputt.pdf",Buffer.from("das ist kein pdf"),"application/pdf");
 p(r.fehler&&/nicht gelesen werden/.test(r.text),"Beschädigte PDF-Datei: klare Meldung",r.text.slice(0,200));
 await page.evaluate(()=>nkDialogSchliessen());
 r=await datei("x.docx",Buffer.from("x"));
 p(r.fehler&&/nicht unterstützt/.test(r.text),"Nicht unterstützter Dateityp wird abgelehnt",r.text.slice(0,200));
 await page.evaluate(()=>nkDialogSchliessen());
 const gross=await page.evaluate(async()=>{await nkDateiOeffnen(new File([new Uint8Array(6*1024*1024)],"gross.csv"));return document.getElementById("a2NkBox").textContent});
 p(/zu gross/.test(gross),"Zu grosse Datei wird abgelehnt (CSV über 5 MB)",gross.slice(0,120));
 await page.evaluate(()=>nkDialogSchliessen());
 const html=await page.evaluate(async()=>{
  const csv="Datum;Auftrag;Mitarbeiter;Tätigkeit;Stunden\n03.03.2026;A-1001;<img src=x onerror=window.__xss=1>;<b>fett</b>;4\n";
  await nkDateiOeffnen(new File([csv],"x.csv",{type:"text/csv"}));
  return {xss:!!window.__xss,img:!!document.querySelector("#a2NkBox img"),b:!!document.querySelector("#a2NkBox tbody b")};
 });
 p(!html.xss&&!html.img&&!html.b,"Dateiinhalt wird nie als HTML ausgeführt (<img onerror>, <b>)",html);
 await page.evaluate(()=>nkDialogSchliessen());

 console.log("\nI · Teilfehler, Mandanten-/Freigabe-Grenzen");
 await reset();
 await datei("rapport.xlsx",FIX.standard);
 await page.evaluate(()=>{window.__db.fehlerStunden=true});
 await page.evaluate(()=>nkSpeichern());
 await page.waitForTimeout(100);
 const tf=await page.evaluate(()=>({st:window.__db.abacus_stunden.length,im:window.__db.abacus_importe.length,meld:nkD?nkD.meldung:"",sp:nkD?nkD.speichert:null}));
 p(tf.st===0&&tf.im===0&&/Es wurde nichts gespeichert/.test(tf.meld)&&tf.sp===false,"Fehler beim Speichern der Zeilen: der angefangene Import wird entfernt, nichts bleibt halb übernommen, Meldung",tf);
 await page.evaluate(()=>{window.__db.fehlerStunden=false;nkDialogSchliessen()});
 await reset();
 await datei("rapport.xlsx",FIX.standard);
 await page.evaluate(()=>{window.__db.firma='c2'});   // Sitzung gehört zu einer anderen Firma als das Projekt
 await page.evaluate(()=>nkSpeichern());
 await page.waitForTimeout(100);
 const fr=await page.evaluate(()=>({n:window.__db.abacus_stunden.length+window.__db.abacus_importe.length,meld:nkD?nkD.meldung:""}));
 p(fr.n===0&&/nichts gespeichert/.test(fr.meld),"Projekt einer anderen Firma: Datenbank lehnt ab (Trigger), nichts gespeichert",fr);
 await page.evaluate(()=>{nkDialogSchliessen()});
 await reset();
 await page.evaluate(()=>{window.__db.feature=false});
 await datei("rapport.xlsx",FIX.standard);
 await page.evaluate(()=>nkSpeichern());
 await page.waitForTimeout(100);
 const kf=await page.evaluate(()=>({n:window.__db.abacus_stunden.length+window.__db.abacus_importe.length,meld:nkD?nkD.meldung:""}));
 p(kf.n===0&&/nichts gespeichert/.test(kf.meld),"Ohne Freischaltung (feature_boundary): Schreiben abgelehnt",kf);
 await page.evaluate(()=>{nkDialogSchliessen()});
 const reg=await page.evaluate(()=>{
  nkZugriff=false;const aus=a2ProjRegister().some(r=>r.k==="stunden");
  nkZugriff=true;const an=a2ProjRegister().some(r=>r.k==="stunden");
  return {aus,an};
 });
 p(!reg.aus&&reg.an,"Register „Stunden“ erscheint nur mit Freischaltung",reg);

 console.log("\nJ · Sollstunden, Prozent, Kosten");
 const so=await page.evaluate(()=>{
  const pos=(unit,q)=>({unit,quantity:q});
  const o=(id,positions,gilt)=>({id,title:"O"+id,positions,gilt});
  return {
   keine:abSollStunden([]),
   ohneStd:abSollStunden([o(1,[pos("m",10),pos("Stk",2)])]),
   null:abSollStunden([o(1,[pos("h",0)])]),
   eins:abSollStunden([o(1,[pos("h",40),pos("Std.",20),pos("m",5),pos("h","x"),pos("h",true)])]),
   zwei:abSollStunden([o(1,[pos("h",40)]),o(2,[pos("h",10)])]),
   zweiEineUngilt:abSollStunden([o(1,[pos("h",40)]),o(2,[pos("h",10)],false)]),
   proz:[abAbweichungProzent(66,60),abAbweichungProzent(10,0),abAbweichungProzent(10,null)]
  };
 });
 p(!so.keine.verfuegbar&&!so.ohneStd.verfuegbar&&!so.null.verfuegbar,"Keine Offerte / keine Stundenpositionen / Menge 0: „Sollstunden nicht verfügbar“",[so.keine,so.ohneStd,so.null]);
 p(so.eins.verfuegbar&&so.eins.stunden===60,"Eine Offerte: nur Positionen mit Einheit h/Std und gültiger Menge zählen (40+20; „x“ und true nicht)",so.eins);
 p(!so.zwei.verfuegbar&&so.zwei.je.length===2&&so.zweiEineUngilt.verfuegbar&&so.zweiEineUngilt.stunden===40,"Mehrere geltende Offerten mit Stunden werden nicht addiert; nicht geltende zählen nicht",[so.zwei,so.zweiEineUngilt]);
 p(so.proz[0]===10&&so.proz[1]===null&&so.proz[2]===null,"Prozentabweichung: 66 gegen 60 = +10 %; gegen 0 oder fehlend → kein Wert (keine Division durch null)",so.proz);

 console.log("\nK · Register: Soll/Ist, Abgleich, Prüfvermerk");
 await reset();
 await page.evaluate(()=>{
  const db=window.__db;
  db.angebote=[{id:5,project_id:1,title:"Offerte Dach",gilt:true,positions:[{unit:"h",quantity:20}],date:"2026-02-01"}];
  db.reports=[{id:11,project_id:1,date:"2026-03-03",updated_at:"2026-03-04T08:00:00Z",work_entries:[
    {date:"2026-03-03",employee:"Hans Muster",desc:"Rinne",rateName:"Spengler",hours:7.5},
    {date:"2026-03-03",employee:"Peter Beispiel",desc:"Rinne",rateName:"Spengler",hours:8.25}]}];
 });
 await datei("rapport.xlsx",FIX.standard);
 await page.evaluate(()=>nkSpeichern());
 await page.waitForTimeout(150);
 await page.evaluate(()=>nkDialogSchliessen());
 const k1=await page.evaluate(()=>{
  const h=nkRegHtml({id:1});const d=document.createElement("div");d.innerHTML=h;
  const v=abVergleichen(nk.stunden,abAppEintraege(nk.reports));
  return {t:d.textContent,v:{status:v.status,abacus:v.abacus,app:v.app,diff:v.diff,sicher:v.sicher.length,nurA:v.nurAbacus.length,nurApp:v.nurApp.length,moeglich:v.moeglich.length},chips:[...d.querySelectorAll(".a2-nk-chip")].map(x=>x.textContent)};
 });
 p(/20[.,]00 h/.test(k1.t),"Register zeigt Sollstunden 20 h aus der Offerte",k1.t.slice(0,300));
 p(k1.v.status==="Abweichung"&&k1.v.abacus===24.25&&k1.v.app===15.75&&k1.v.diff===8.5,"Abacus hat zusätzliche Stunden: 24,25 gegen 15,75 → Abweichung, Differenz +8,50 h",k1.v);
 p(k1.v.sicher===2&&k1.v.nurA===2&&k1.v.nurApp===0,"Detail: 2 sicher übereinstimmend, 2 nur in Abacus, 0 nur in der App",k1.v);
 p(/Iststunden/.test(k1.t)&&/Differenz \(Ist/.test(k1.t)&&/Kosten oder Gewinn werden daraus nicht abgeleitet/.test(k1.t),"Ist, Differenz (Ist − Soll) und Hinweis „keine Kosten aus Stunden“ stehen im Register",k1.t.slice(0,400));
 const pr=await page.evaluate(async()=>{
  const vorher=JSON.stringify(window.__db.reports)+JSON.stringify(window.__db.angebote);
  await nkPruefen();
  const nach=nkRegHtml({id:1});
  const ab=window.__db.abacus_abgleich;
  // erneuter Import derselben Datei ändert den Stand nicht
  const stand1=abStandKennung(nk.stunden,abAppEintraege(nk.reports));
  return {n:ab.length,pruefer:!!ab[0].geprueft_von||true,komm:ab[0].kommentar,diff:ab[0].differenz,stand:ab[0].stand===stand1,unveraendert:vorher===JSON.stringify(window.__db.reports)+JSON.stringify(window.__db.angebote),veraltet:/Seitdem hat sich etwas geändert/.test(nach)};
 });
 p(pr.n===1&&pr.komm==="geprüft"&&pr.diff===8.5&&pr.stand,"Abgleich als geprüft markiert: Zeitpunkt, Kommentar, Differenz und Stand gespeichert",pr);
 p(pr.unveraendert&&!pr.veraltet,"Prüfen verändert keine Rapporte/Offerten; der Vermerk gilt, solange sich nichts ändert",pr);
 await datei("rapport.xlsx",FIX.standard);
 await page.evaluate(()=>nkDialogSchliessen());
 const pr2=await page.evaluate(async()=>{await nkLaden(1);return /Seitdem hat sich etwas geändert/.test(nkRegHtml({id:1}))});
 p(pr2===false,"Wiederholter Import nach dem Abgleich (nur Dubletten): Vermerk bleibt gültig, wird nicht unbemerkt zurückgesetzt",pr2);
 const pr3=await page.evaluate(async()=>{
  window.__db.reports[0].work_entries.push({date:"2026-03-05",employee:"Hans Muster",desc:"x",rateName:"Spengler",hours:2});
  await nkLaden(1);return /Seitdem hat sich etwas geändert/.test(nkRegHtml({id:1}));
 });
 p(pr3===true,"Ändert sich ein Rapport, wird der Prüfvermerk als veraltet gekennzeichnet",pr3);

 console.log("\nL · Abgleich-Logik (rein)");
 const L=await page.evaluate(()=>{
  const A=(d,m,s,t)=>({datum:d,mitarbeiter:m,stunden:s,taetigkeit:t||""});
  const app=l=>({eintraege:l.map((x,i)=>({rapportId:1,pos:i,datum:x[0],mitarbeiter:x[1],text:"",funktion:"",stunden:x[2]})),unlesbar:0});
  return {
   gleich:abVergleichen([A("2026-03-03","Hans Muster",7.5),A("2026-03-04","Peter Beispiel",8)],app([["2026-03-03","Muster Hans",7.5],["2026-03-04","Peter Beispiel",8]])),
   nurApp:abVergleichen([A("2026-03-03","Hans Muster",7.5)],app([["2026-03-03","Hans Muster",7.5],["2026-03-04","Peter Beispiel",8]])),
   anderMa:abVergleichen([A("2026-03-03","Hans Muster",7.5)],app([["2026-03-03","H. Muster",7.5]])),
   anderDatum:abVergleichen([A("2026-03-03","Hans Muster",7.5)],app([["2026-03-04","Hans Muster",7.5]])),
   leer:abVergleichen([],app([])),
   ohneDatum:abVergleichen([A(null,"Hans Muster",7.5)],app([["2026-03-03","Hans Muster",7.5]])),
   rundung:abVergleichen([A("2026-03-03","Hans Muster",7.17)],app([["2026-03-03","Hans Muster",7.2]])),
   rundung2:abVergleichen([A("2026-03-03","Hans Muster",7.5)],app([["2026-03-03","Hans Muster",7.4]])),
   unlesbar:abVergleichen([A("2026-03-03","Hans Muster",7.5)],{eintraege:[],unlesbar:1}),
   zeitformat:abVergleichen([{datum:"2026-03-03",mitarbeiter:"Hans Muster",stunden:abZeit("7:30").wert}],app([["2026-03-03","Hans Muster",abZeit("7,5").wert]])),
   eintraegeAusRapport:abAppEintraege([{id:1,date:"2026-03-03",work_entries:[{employee:"A",hours:"7,5"},{date:"2026-03-02",employee:"B",hours:"x"}]},{id:2,date:"2026-03-03",work_entries:null}])
  };
 });
 p(L.gleich.status==="Übereinstimmend"&&L.gleich.sicher.length===2&&L.gleich.diff===0,"Abacus und App stimmen exakt überein (Namen in anderer Reihenfolge gleich)",L.gleich);
 p(L.nurApp.status==="Abweichung"&&L.nurApp.nurApp.length===1&&L.nurApp.diff===-8,"Spengler-DIGITAL hat zusätzliche Stunden: Differenz −8 h, 1 Eintrag nur in der App",L.nurApp);
 p(L.anderMa.moeglich.length===1&&L.anderMa.sicher.length===0&&L.anderMa.eingeschraenkt,"Anderer Mitarbeitername (H. Muster ↔ Hans Muster): nur „mögliche Zuordnung“, nie als sicher; Vergleich eingeschränkt",L.anderMa);
 p(L.anderDatum.sicher.length===0&&L.anderDatum.moeglich.length===0&&L.anderDatum.nurAbacus.length===1&&L.anderDatum.nurApp.length===1&&L.anderDatum.proTag.length===2,"Anderes Datum: keine Zuordnung, beide einzeln aufgeführt, je Datum gruppiert",L.anderDatum);
 p(L.leer.status==="Nicht vollständig vergleichbar"&&L.ohneDatum.status==="Nicht vollständig vergleichbar"&&L.unlesbar.status==="Nicht vollständig vergleichbar","Leer, ohne Datum oder unlesbare Rapporte: „Nicht vollständig vergleichbar“ mit Gründen",[L.leer.gruende,L.ohneDatum.gruende,L.unlesbar.gruende]);
 p(L.rundung.status==="Abweichung"&&/Rundung/.test(L.rundung.rundung)&&L.rundung2.rundung==="","Rundungsdifferenz 0,03 h wird als mögliche Rundung benannt; 0,10 h nicht",[L.rundung.rundung,L.rundung2.rundung]);
 p(L.zeitformat.status==="Übereinstimmend","Unterschiedliche Zeitformate (7:30 ↔ 7,5) ergeben dieselben Stunden",L.zeitformat);
 p(L.eintraegeAusRapport.eintraege.length===2&&L.eintraegeAusRapport.eintraege[0].stunden===7.5&&L.eintraegeAusRapport.eintraege[1].stunden===null&&L.eintraegeAusRapport.unlesbar===1,"App-Seite: Stunden aus work_entries (Komma erlaubt), ungültige Stunden → null, unlesbarer Rapport gezählt",L.eintraegeAusRapport);

 console.log("\nM · Einbindung, Sicherheit, Dateien");
 const src=n=>fs.readFileSync(n,"utf8");
 const idx=src("index.html"),sw=src("sw.js"),mig=src("supabase/migrations/v3366_abacus_nachkalkulation.sql");
 p(/js\/87-abacus-parser\.js/.test(idx)&&/js\/88-nachkalkulation\.js/.test(idx)&&/js\/87-abacus-parser\.js/.test(sw)&&/js\/88-nachkalkulation\.js/.test(sw),"Neue Dateien in index.html UND sw.js eingetragen");
 p(fs.existsSync("vendor/pdf.min.js")&&fs.existsSync("vendor/pdf.worker.min.js")&&fs.existsSync("vendor/pdfjs-LICENSE.txt")&&!/vendor\/pdf\.min\.js/.test(sw),"pdf.js liegt in vendor/ (Lizenz dabei), wird erst bei Bedarf nachgeladen (nicht in der App-Shell)");
 p(/as restrictive for all using \(company_id = public\.my_company_id\(\)\)/.test(mig)&&/feature_boundary_%1\$s[\s\S]*as restrictive/.test(mig)||/create policy feature_boundary_%1\$s on public\.%1\$s as restrictive/.test(mig),"Migration: tenant_boundary_* und feature_boundary_* sind RESTRICTIVE");
 p(!/(update|alter table public\.(reports|materials|angebote|leistungen|lager|projects))/i.test(mig.replace(/-- .*/g,"").replace(/on update|before update/gi,"")),"Migration ändert keine bestehende Tabelle (nur abacus_*)");
 const k88=src("js/88-nachkalkulation.js");
 p(!/from\("(reports|materials|measurement_materials|lieferanten_artikel|angebote|leistungen|projects)"\)\s*\.\s*(insert|update|delete|upsert)/.test(k88),"Code schreibt nie in Rapporte, Materialien, Offerten, Leistungen oder Projekte");
 p(!/innerHTML\s*=\s*[^;]*\b(z\._roh|datei\.name)\b(?!\))/.test(k88.replace(/esc\([^)]*\)/g,"")),"Dateinamen und Zellwerte gehen nur escaped ins HTML");
 p(/project_id:pid/.test(k88)&&!/company_id/.test(k88.replace(/\/\/.*/g,"").replace(/"[^"]*company_id[^"]*"/g,"")),"Projekt kommt aus dem gewählten Projekt, die Firma wird nie vom Client geschickt");
 const eingabe=await page.evaluate(()=>{
  let inp=null;const orig=document.body.appendChild.bind(document.body);
  document.body.appendChild=function(el){if(el&&el.tagName==="INPUT")inp=el;return orig(el)};
  nkImportStarten();document.body.appendChild=orig;
  const r=inp?{typ:inp.type,accept:inp.accept}:null;if(inp)inp.remove();return r;
 });
 p(eingabe&&eingabe.typ==="file"&&/pdf/.test(eingabe.accept)&&/xlsx/.test(eingabe.accept),"Knopf „Importieren“ öffnet die Dateiauswahl für PDF/Excel",eingabe);
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
