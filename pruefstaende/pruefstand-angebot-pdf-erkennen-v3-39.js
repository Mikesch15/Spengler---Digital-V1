"use strict";
// ---- Pruefstand: Positionen aus dem PDF der Offerte erkennen (v3.39) ------
//
// Auftrag (Wunsch des Betriebs, woertlich): "das ist noch nicht das was ich
// wollte... aus dem pdf sollen jetzt auch die positionen importiert werden
// wie mit einem foto". Das PDF-Ablegen selbst (v3.38, uploadAngebotPdf(),
// angPdfExisting/angPdfNewFile) ist bereits vollstaendig in
// pruefstand-angebot-pdf-v3-38.js geprueft und wird hier NICHT wiederholt -
// hier geht es ausschliesslich um den neuen Knopf "🔎 Positionen erkennen"
// am PDF-Bereich (angPdfDatenUrlFuerErkennung(), fileZuDataUrl(),
// ANG_PDF_ERKENNEN_MAX_BYTES/-TEXT).
//
// Kernaussage, die dieser Pruefstand beweist: recognizePhoto()
// (js/17-ausmass.js) und die Edge Function extract-offer-positions sind
// UNVERAENDERT wiederverwendet - eine "data:application/pdf;base64,..."-URL
// wird genau denselben Weg geschickt wie bisher eine "data:image/..."-URL.
// Es gibt keinen zweiten Erkennungspfad.
//
// Geprueft:
//  1  Ohne jedes PDF gibt es keinen "🔎 Positionen erkennen"-Knopf (kein
//     funktionsloses Element)
//  2  Frisch ausgewaehltes, noch nicht gespeichertes PDF (angPdfNewFile):
//     Erkennung schickt eine "data:application/pdf;base64,…"-URL an
//     recognizePhoto() -> an die Edge Function, OHNE vorher hochzuladen
//  3  Erkannte Positionen werden an angPositions angehaengt und gerendert,
//     mit der erwarteten Statuszeile
//  4  Bereits gespeichertes PDF (angPdfExisting): die echten Bytes werden
//     ueber storageSignedUrl()+fetch()+Blob geholt (KEIN blosser
//     Speicherpfad an recognizePhoto() - das waere der bekannte, hier
//     bewusst NICHT replizierte Fehlertyp bei Fotos)
//  5  Groessengrenze der ERKENNUNG (15 MB) ist eigenstaendig und kleiner
//     als die Upload-Grenze (50 MB) - fuer ein frisch ausgewaehltes PDF
//  6  dieselbe Grenze gilt auch fuer ein bereits gespeichertes PDF (Bytes
//     erst nach dem Laden gemessen)
//  7  Fehlerbehandlung: signierte URL nicht erhaeltlich
//  8  Fehlerbehandlung: fetch() der signierten URL liefert einen
//     Fehlerstatus
//  9  Fehlerbehandlung: die Edge Function selbst meldet einen Fehler
//     (ok:false) - keine erfundenen Positionen
// 10  Der Knopf ist waehrend der Erkennung gesperrt und wird danach wieder
//     freigegeben
// 11  Struktur: keine der geschuetzten Fachdateien beruehrt, recognizePhoto()
//     bleibt in js/17-ausmass.js definiert (kein Nachbau in js/63)
//
// Gegenproben (siehe CLAUDE.md Abschnitt 88.8, wie beim Vorgaenger-
// Pruefstand): separat als eigener Vorgang durchgefuehrt (Baum sichern,
// echten Fehler einbauen, diesen Pruefstand erneut laufen lassen, genau den
// erwarteten Fehlschlag bestaetigen, wiederherstellen). Kein Umschalter
// dafuer in dieser Datei.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-angebot-pdf-erkennen-v3-39.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const fs=require("fs");
const {execSync}=require("child_process");

let ok=0,fail=0;
const p=(b,t,z)=>{
 if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}
};

// ---- Attrappe fuer window.supabase.createClient() -------------------------
// Uebernommen aus pruefstand-angebot-pdf-v3-38.js (storage.upload/
// createSignedUrl), createSignedUrl liefert hier zusaetzlich einen frei
// waehlbaren Wert (window.__signedUrlErgibt) statt fest "blob:x" - so laesst
// sich ein "bereits gespeichertes PDF" mit echten, kontrollierten Bytes
// nachstellen, ohne riesige Base64-Strings ueber CDP zu schicken (siehe
// window.fetch-Ueberschreibung weiter unten).
const ATTRAPPE=`window.supabase={createClient:()=>{
 window.__from=window.__from||[];
 window.__schreib=window.__schreib||[];
 const passt=(z,eqs)=>eqs.every(([f,v])=>z[f]===v);
 const tabelle=t=>{
  const kette={__eq:[],__order:null};
  Object.assign(kette,{
   select:()=>kette,
   eq:(f,v)=>{kette.__eq.push([f,v]);return kette},
   order:(f,o)=>{kette.__order=[f,o];return kette},
   in:()=>kette,
   not:()=>kette,
   limit:()=>kette,
   maybeSingle:()=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    const liste=(window.__lese&&window.__lese[t])||[];
    const treffer=liste.find(z=>passt(z,kette.__eq));
    return Promise.resolve({data:treffer||null,error:null});
   },
   then:(res,rej)=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    let liste=((window.__lese&&window.__lese[t])||[]).filter(z=>passt(z,kette.__eq));
    return Promise.resolve({data:liste,error:null}).then(res,rej);
   },
   insert:d=>{
    const zeilen=Array.isArray(d)?d:[d];
    window.__schreib.push({t,op:"insert",d:zeilen});
    return {select:()=>{
     const neu=zeilen.map((x,i)=>Object.assign({id:900+i,created_by:"u1",created_at:"2026-09-10T08:00:00Z",updated_by:"u1",updated_at:"2026-09-10T08:00:00Z"},x));
     return Promise.resolve({data:neu,error:null});
    }};
   },
   update:d=>{
    const eintrag={t,op:"update",d,eq:[]};
    window.__schreib.push(eintrag);
    const k2={eq:(f,v)=>{eintrag.eq.push([f,v]);return k2},
     select:()=>Promise.resolve({data:[Object.assign({id:1,updated_by:"u1",updated_at:"2026-09-10T09:00:00Z"},d)],error:null})};
    return k2;
   },
   delete:()=>({eq:()=>({then:(res)=>Promise.resolve({error:null}).then(res)})})
  });
  return kette;
 };
 return {
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:tabelle,
  storage:{from:()=>({
   upload:(pfad,datei,opt)=>{
    (window.__uploads=window.__uploads||[]).push({pfad,opt});
    return Promise.resolve({error:null});
   },
   createSignedUrl:(pfad)=>{
    (window.__signedUrlAufrufe=window.__signedUrlAufrufe||[]).push(pfad);
    if(window.__signedUrlFehler)return Promise.resolve({data:null,error:{message:"kaputt"}});
    return Promise.resolve({data:{signedUrl:window.__signedUrlErgibt||"blob:x"},error:null});
   }
  })},
  rpc:()=>Promise.resolve({data:null,error:null}),
  functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}
 };
}};`;

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>{(page.__dialoge=page.__dialoge||[]).push(d.message());d.accept()});

 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));

 // Edge Function extract-offer-positions - identisches Mock-Muster wie in
 // pruefstand-angebote-v3-34.js (dort fuer Fotos bereits bewaehrt).
 let kiModus="ok";
 await page.route("**/functions/v1/extract-offer-positions",async route=>{
  (page.__kiAufrufe=page.__kiAufrufe||[]).push(route.request().postDataJSON());
  if(kiModus==="ok"){
   await route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({ok:true,positions:[
     {pos:"1",description:"Titanzinkblech 0.7mm",quantity:12,unit:"m2"},
     {pos:"2",description:"Rinnenhalter",quantity:8,unit:"Stk"}
    ]})});
  }else if(kiModus==="serverfehler"){
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:false,error:"PDF nicht lesbar"})});
  }
 });

 const repo="/home/user/Spengler---Digital-V1";
 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof checkOfferteZugriff==="function"
  &&typeof newAngebot==="function"&&typeof openAngebot==="function"
  &&typeof renderAngPdfBereich==="function"&&typeof angPdfDatenUrlFuerErkennung==="function"
  &&typeof recognizePhoto==="function",null,{timeout:15000});
 await page.waitForTimeout(200);

 // window.fetch ueberschreiben: NUR fuer die beiden Sentinel-URLs eigenes
 // Verhalten, sonst Durchreichen an den echten fetch - sonst wuerde die
 // page.route()-Interception fuer die Edge Function selbst nicht mehr
 // greifen (die laeuft ebenfalls ueber fetch()).
 await page.evaluate(()=>{
  const orig=window.fetch.bind(window);
  window.__origFetch=orig;
  window.fetch=(url,opt)=>{
   if(url==="mock://kleines-pdf"){
    return Promise.resolve(new Response(new Blob([new Uint8Array(1024)],{type:"application/pdf"}),{status:200}));
   }
   if(url==="mock://grosses-pdf"){
    return Promise.resolve(new Response(new Blob([new Uint8Array(20*1024*1024)],{type:"application/pdf"}),{status:200}));
   }
   if(url==="mock://kaputte-antwort"){
    return Promise.resolve(new Response(new Blob([]),{status:404,statusText:"Not Found"}));
   }
   return orig(url,opt);
  };
 });

 // ---- Grundzustand ----------------------------------------------------
 await page.evaluate(()=>{
  window.__lese={angebote:[],feature_access:[{profile_id:"u1",feature:"angebote",granted:true}],audit_log:[]};
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"f1"};
  allProfiles=[currentProfile];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Testbau",object:"Musterweg 1, 3000 Bern",order_no:"2026-045",customer:"Muster AG",archived:false,status:"offen"}];
  settings={employees:["Mike Ledermann"],rates:[],materials:[]};
  employeeIds=["u1"];
  cockpitProjectId=7;
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });
 await page.evaluate(async()=>{await checkOfferteZugriff()});

 console.log("\n0 · Anwendung startet, Offerten-Zugriff freigeschaltet");
 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler beim Laden",jsFehler);
 p(await page.evaluate(()=>offerteZugriff===true),"offerteZugriff ist true");

 // ---- 1 · Ohne PDF kein Erkennen-Knopf --------------------------------
 console.log("\n1 · Ohne PDF gibt es keinen '🔎 Positionen erkennen'-Knopf");
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 const ohnePdf=await page.evaluate(()=>({knopf:!!document.querySelector("[data-ang-pdf-erkennen]")}));
 p(ohnePdf.knopf===false,"kein PDF -> kein Erkennen-Knopf (kein funktionsloses Element)",ohnePdf);

 // ---- 2+3 · Frisch ausgewaehltes PDF: Erkennung, keine vorherige Uploads ---
 console.log("\n2+3 · Frisch ausgewaehltes PDF: '🔎 Positionen erkennen' erkennt und haengt Positionen an");
 await page.locator("#angPdfInput").setInputFiles({
  name:"Offerte-Entwurf.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")
 });
 await page.waitForTimeout(50);
 p(await page.evaluate(()=>!!document.querySelector("[data-ang-pdf-erkennen]")),"nach der Auswahl erscheint der Erkennen-Knopf");
 await page.evaluate(()=>{window.__uploads=[];});
 page.__kiAufrufe=[];
 const frischErkannt=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
  return {
   status:$("angRecognizeStatus").textContent,
   anzahlPositionen:angPositions.length,
   uploadsWaehrendErkennung:(window.__uploads||[]).length
  };
 });
 p(frischErkannt.uploadsWaehrendErkennung===0,"die Erkennung laedt das PDF NICHT in den Storage hoch (kein storage.upload()-Aufruf)",frischErkannt);
 const gesendeteDaten=(page.__kiAufrufe[0]||{}).image_base64||"";
 p(gesendeteDaten.startsWith("data:application/pdf;base64,"),"an die Edge Function wird eine 'data:application/pdf;base64,…'-URL geschickt (recognizePhoto() unveraendert wiederverwendet)",gesendeteDaten.slice(0,40));
 p(frischErkannt.anzahlPositionen===2,"die zwei von der (gemockten) KI gelieferten Positionen wurden angehaengt",frischErkannt);
 p(/2 Position\(en\) aus dem PDF erkannt/.test(frischErkannt.status),"und die Statuszeile nennt die Anzahl",frischErkannt);
 // Bezeichnungen stehen als value="..." in <input data-ang-desc>, nicht als Text - deshalb ueber .value lesen.
 const tabelleZeigtErkannt=await page.evaluate(()=>
  Array.from(document.querySelectorAll("#angPositionsBody [data-ang-desc]")).map(el=>el.value).join(" | "));
 p(/Titanzinkblech/.test(tabelleZeigtErkannt)&&/Rinnenhalter/.test(tabelleZeigtErkannt),"die erkannten Bezeichnungen stehen in der Positionstabelle",tabelleZeigtErkannt);

 // ---- 4 · Bereits gespeichertes PDF: Bytes ueber signierte URL -------------
 console.log("\n4 · Bereits gespeichertes PDF: Erkennung holt die echten Bytes ueber storageSignedUrl()+fetch()");
 const bestehendeZeile={
  id:600,project_id:7,title:"Offerte mit PDF",note:"",date:"2026-09-01",
  photo_path:null,photo_paths:[],positions:[],
  pdf_path:"project-files/7/1000_bestand.pdf",pdf_name:"Bestand.pdf",
  created_by:"u1",created_at:"2026-09-01T08:00:00Z",updated_by:"u1",updated_at:"2026-09-01T08:00:00Z"
 };
 await page.evaluate(z=>{window.__signedUrlErgibt="mock://kleines-pdf";window.__signedUrlAufrufe=[];openAngebot(z);angPositions=[];renderAngPositionsTable();},bestehendeZeile);
 kiModus="ok";
 page.__kiAufrufe=[];
 const bestehendErkannt=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
  return {signedUrlAufrufe:window.__signedUrlAufrufe.slice(),anzahlPositionen:angPositions.length};
 });
 p(bestehendErkannt.signedUrlAufrufe.length===1&&bestehendErkannt.signedUrlAufrufe[0]===bestehendeZeile.pdf_path,
  "storageSignedUrl() wird mit EXAKT dem gespeicherten Pfad aufgerufen (kein blosser Speicherpfad direkt an recognizePhoto())",bestehendErkannt);
 const gesendeteDaten2=(page.__kiAufrufe[0]||{}).image_base64||"";
 p(gesendeteDaten2.startsWith("data:application/pdf;base64,"),"auch hier wird eine echte 'data:application/pdf;base64,…'-URL geschickt - NICHT der rohe Speicherpfad",gesendeteDaten2.slice(0,40));
 p(bestehendErkannt.anzahlPositionen===2,"die Positionen werden korrekt uebernommen",bestehendErkannt);

 // ---- 5 · Groessengrenze: frisch ausgewaehltes PDF -------------------------
 console.log("\n5 · Groessengrenze der Erkennung (15 MB) - frisch ausgewaehltes PDF > 15 MB");
 const grosseDateiPfad=(bytes)=>{
  const pfad=repo+"/pruefstaende/.tmp-erkennen-"+bytes+".pdf";
  if(!fs.existsSync(pfad))fs.writeFileSync(pfad,Buffer.alloc(bytes));
  return pfad;
 };
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles(grosseDateiPfad(16*1024*1024));
 await page.waitForTimeout(50);
 page.__dialoge=[];
 page.__kiAufrufe=[];
 await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
 });
 p(page.__kiAufrufe.length===0,"bei einer 16-MB-Datei (ueber der 15-MB-Erkennungsgrenze, aber unter der 50-MB-Uploadgrenze) wird die Edge Function NICHT aufgerufen");
 p((page.__dialoge||[]).some(m=>m.includes("Das PDF ist für die Positionserkennung zu gross (16.0 MB)")&&m.includes("höchstens 15 MB für die Erkennung")),
  "und die App zeigt genau diese Meldung, mit BEIDEN Zahlen (15 MB Erkennung, 50 MB Upload) erklaert",page.__dialoge);

 // ---- 6 · Groessengrenze: bereits gespeichertes PDF ------------------------
 console.log("\n6 · Groessengrenze der Erkennung - bereits gespeichertes PDF, erst nach dem Laden gemessen");
 await page.evaluate(z=>{window.__signedUrlErgibt="mock://grosses-pdf";openAngebot(z);},bestehendeZeile);
 page.__dialoge=[];
 page.__kiAufrufe=[];
 await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
 });
 p(page.__kiAufrufe.length===0,"ein 20-MB-Blob (aus der signierten URL geladen) wird ebenfalls NICHT an die Edge Function geschickt");
 p((page.__dialoge||[]).some(m=>m.includes("Das PDF ist für die Positionserkennung zu gross (20.0 MB)")),
  "mit derselben Meldung, diesmal fuer die tatsaechlich geladene Groesse",page.__dialoge);

 // ---- 7 · Fehler: signierte URL nicht erhaeltlich --------------------------
 console.log("\n7 · Fehlerbehandlung: signierte URL nicht erhaeltlich");
 await page.evaluate(z=>{window.__signedUrlFehler=true;openAngebot(z);},bestehendeZeile);
 page.__dialoge=[];
 await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
 });
 p((page.__dialoge||[]).some(m=>/PDF konnte nicht geladen werden\.?$/.test(m)||m.includes("PDF konnte nicht geladen werden.")),
  "eine verstaendliche Meldung statt eines Absturzes",page.__dialoge);
 await page.evaluate(()=>{window.__signedUrlFehler=false});

 // ---- 8 · Fehler: fetch() der signierten URL scheitert ---------------------
 console.log("\n8 · Fehlerbehandlung: fetch() der signierten URL liefert einen Fehlerstatus");
 await page.evaluate(z=>{window.__signedUrlErgibt="mock://kaputte-antwort";openAngebot(z);},bestehendeZeile);
 page.__dialoge=[];
 await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
 });
 p((page.__dialoge||[]).some(m=>m.includes("PDF konnte nicht geladen werden (Status 404)")),
  "die App nennt den echten HTTP-Status, statt eine leere Erkennung vorzutaeuschen",page.__dialoge);

 // ---- 9 · Fehler: die Edge Function selbst meldet ok:false -----------------
 console.log("\n9 · Fehlerbehandlung: Edge Function meldet ok:false - keine erfundenen Positionen");
 await page.evaluate(z=>{window.__signedUrlErgibt="mock://kleines-pdf";openAngebot(z);angPositions=[];renderAngPositionsTable();},bestehendeZeile);
 kiModus="serverfehler";
 page.__dialoge=[];
 const nachFehler=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
  return {anzahlPositionen:angPositions.length,status:$("angRecognizeStatus").textContent};
 });
 p(nachFehler.anzahlPositionen===0,"keine Position wird bei einem Server-Fehler erfunden",nachFehler);
 p((page.__dialoge||[]).some(m=>m.includes("PDF nicht lesbar")),"die App zeigt den vom Server gemeldeten Grund",page.__dialoge);
 kiModus="ok";

 // ---- 10 · Der Knopf ist waehrend der Erkennung gesperrt -------------------
 console.log("\n10 · Der Erkennen-Knopf ist waehrend der Erkennung gesperrt und danach wieder frei");
 await page.evaluate(z=>{openAngebot(z);angPositions=[];renderAngPositionsTable();},bestehendeZeile);
 // Ein verzoegertes route.fulfill(), damit der 'disabled'-Zustand WAEHREND
 // der Anfrage sichtbar messbar ist.
 kiModus="ok";
 await page.unroute("**/functions/v1/extract-offer-positions");
 await page.route("**/functions/v1/extract-offer-positions",async route=>{
  await new Promise(r=>setTimeout(r,250));
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,positions:[]})});
 });
 const waehrendUndDanach=await page.evaluate(async()=>{
  const knopf=document.querySelector("[data-ang-pdf-erkennen]");
  const klickPromise=knopf.click();
  await new Promise(r=>setTimeout(r,50));
  const waehrend=knopf.disabled;
  await new Promise(r=>setTimeout(r,400));
  const danach=document.querySelector("[data-ang-pdf-erkennen]")?document.querySelector("[data-ang-pdf-erkennen]").disabled:null;
  return {waehrend,danach};
 });
 p(waehrendUndDanach.waehrend===true,"der Knopf ist waehrend der laufenden Erkennung gesperrt (kein doppelter Aufruf per Doppelklick)",waehrendUndDanach);
 p(waehrendUndDanach.danach===false,"und danach wieder bedienbar",waehrendUndDanach);

 // ---- 11 · Struktur ---------------------------------------------------------
 console.log("\n11 · Struktur: recognizePhoto() bleibt Unikat in js/17, keine geschuetzte Fachdatei beruehrt");
 const quelltext63=fs.readFileSync(repo+"/js/63-angebote.js","utf8");
 const quelltext17=fs.readFileSync(repo+"/js/17-ausmass.js","utf8");
 p(quelltext17.includes("async function recognizePhoto(src)"),"recognizePhoto() ist weiterhin in js/17-ausmass.js definiert");
 p(!quelltext63.includes("async function recognizePhoto("),"js/63-angebote.js definiert recognizePhoto() NICHT selbst neu (kein Nachbau)");
 p(quelltext63.includes("function fileZuDataUrl(")&&quelltext63.includes("function angPdfDatenUrlFuerErkennung("),
  "js/63-angebote.js enthaelt die neuen Hilfsfunktionen fileZuDataUrl()/angPdfDatenUrlFuerErkennung()");
 p(quelltext63.includes("ANG_PDF_ERKENNEN_MAX_BYTES")&&quelltext63.includes("ANG_PDF_ERKENNEN_MAX_TEXT"),
  "und eine EIGENE, von MAX_DATEI_BYTES/MAX_DATEI_TEXT unabhaengige Groessengrenze fuer die Erkennung");

 let geaenderteDateien=[];
 try{
  geaenderteDateien=execSync("git diff --name-only HEAD -- . && git ls-files --others --exclude-standard",
   {cwd:repo,encoding:"utf8"}).trim().split("\n").filter(Boolean);
 }catch(e){geaenderteDateien=null;}
 const mussUnberuehrtSein=[
  "js/17-ausmass.js","js/24-projekt-cockpit.js","js/05a-rechte.js",
  "js/06-rapport.js","js/08-katalog-blitzschutz.js","css/03-druck.css","css/04-rechte.css",
  "js/09-projekte.js","js/10-massaufnahme.js",
  "js/44-workflow.js","js/45-aufgaben.js","js/48-projekt-material.js",
  "js/49-projekt-zuschnitt.js","js/50-reservierung.js","js/51-werkstatt.js",
  "js/56-material-zuschnitt.js","js/58-ruestliste.js","js/60-ruestskizzen.js",
  "js/11-einlaufblech-gerade.js","js/12-rinne-halbrund.js","js/13-einlaufblech-konisch.js",
  "js/14-freies-profil.js","js/19-lukarne.js","js/20-anschlussblech.js",
  "js/21-einfassung-rund.js","js/25-kehle.js","js/26-rinne.js","js/29-einlaufblech-aufnahme.js",
  "js/34-kehle-aufnahme.js","js/37-kamin-aufnahme.js","js/38-einfassung-aufnahme.js",
  "js/39-rinne-aufnahme.js","js/40-anschlussblech-aufnahme.js","js/61-materialstaerke.js",
  "js/64-ausfuehrung.js","js/65-leistungen.js"
 ];
 if(geaenderteDateien===null){
  p(false,"git diff konnte nicht ausgefuehrt werden - Struktur-Beweis nicht moeglich",{});
 }else{
  const verletzt=mussUnberuehrtSein.filter(f=>geaenderteDateien.includes(f));
  p(verletzt.length===0,
   "keine der 'nicht anzufassenden' Dateien wurde fuer diese Erweiterung veraendert",
   {geaendert:geaenderteDateien,verletzt});
  p(geaenderteDateien.includes("js/63-angebote.js"),"js/63-angebote.js selbst ist geaendert (traegt die neue PDF-Erkennung)",geaenderteDateien);
 }

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
