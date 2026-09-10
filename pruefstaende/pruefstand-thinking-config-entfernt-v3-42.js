"use strict";
// ---- Pruefstand: thinkingConfig entfernt (v3.42, Edge Function v14) -------
//
// Auftrag: innerhalb weniger Minuten nach dem v3.41-Deploy (Edge Function
// v13) hat eine ECHTE Live-Session (mobiles Geraet, echte Produktion) einen
// NEUEN Fehler gezeigt: "Fehler bei der Erkennung: Server antwortete mit
// Status 502: Request contains an invalid argument." - anders als der
// MAX_TOKENS-Fall aus v3.40/v3.41: hier weist Gemini die Anfrage selbst
// zurueck (der !res.ok-Zweig in index.ts), nicht erst die Antwort.
//
// Recherche (Websuche, da diese Sandbox keinen Live-Gemini-Aufruf machen
// kann, um es empirisch zu bestaetigen - "recherchiert, nicht geraten"):
// Googles eigenes Entwickler-Forum UND mehrere unabhaengige, einschlaegige
// GitHub-Issues (cline, kilocode, big-AGI) bestaetigen fuer die
// Gemini-3.x-Modellfamilie, zu der MODEL gehoert:
//   1. thinkingBudget:0 wird von Gemini-3.x-Modellen AUSDRUECKLICH
//      ZURUECKGEWIESEN, mit einer passenden, dokumentierten Fehlermeldung
//      ("Budget 0 is invalid. This model only works in thinking mode") -
//      Gemini-3.x-Modelle koennen das Denken nicht vollstaendig abschalten.
//   2. Gemini-3.x-Modelle erwarten fuer die Steuerung des Denkaufwands
//      generell das NEUERE Feld thinkingLevel statt des aelteren
//      (Gemini-2.5-Aera-)Felds thinkingBudget - thinkingBudget an ein
//      Gemini-3-Modell zu schicken ist selbst das falsche Feld, unabhaengig
//      vom gewaehlten Wert.
// Kurz: v13s thinkingConfig-Fix WAR SELBST die Ursache des neuen Fehlers.
//
// Fix: thinkingConfig wird VOLLSTAENDIG ENTFERNT statt durch ein
// unverifiziertes thinkingLevel ersetzt zu werden - die eigene Hausregel
// dieses Projekts ist, nur das konkret Kaputte zu reparieren, statt ein
// zweites, unverifiziertes Feld auf das erste zu stapeln. maxOutputTokens:
// 65536 (in v3.41 unabhaengig recherchiert und bestaetigt korrekt, von
// diesem Defekt unbetroffen) bleibt unveraendert stehen.
//
// Der ehrliche MAX_TOKENS-Rueckfall aus v3.40 UND der generische Fehlerpfad
// bleiben beide UNVERAENDERT als Sicherheitsnetz bestehen.
//
// Die Edge Function wurde bereits ueber mcp__Supabase__deploy_edge_function
// live deployt (Version 14, status:ACTIVE, bestaetigt ueber
// mcp__Supabase__list_edge_functions) UND als
// supabase/functions/extract-offer-positions/index.ts im Repo aktualisiert.
//
// Da diese Sandbox ueber keine Deno-Laufzeit verfuegt (nur Node.js), kann
// der SERVER-Code nicht direkt ausgefuehrt werden. Geprueft wird deshalb
// wie bei jeder Edge-Function-Aenderung dieses Repos:
//   (a) STRUKTURELL der eingecheckte Quelltext von index.ts, und
//   (b) VERHALTENSBEZOGEN der Client-Vertrag ueber page.route()-Mocks -
//       ein erfolgreicher Treffer, der MAX_TOKENS-Fall und der generische
//       Fehlerfall muessen alle drei unveraendert funktionieren, ohne dass
//       diese Sandbox dafuer irgendeine Client-Datei aendern musste.
//
// Geprueft:
//  1  Struktur: thinkingConfig kommt im tatsaechlichen Code (Kommentare
//     entfernt) NIRGENDS mehr vor - weder als thinkingConfig:{...} noch als
//     Objektschluessel
//  2  Struktur: thinkingBudget kommt im tatsaechlichen Code ebenfalls
//     nirgends mehr vor
//  3  Struktur: maxOutputTokens ist weiterhin 65536 (unveraendert aus v3.41)
//  4  Struktur: der generationConfig-Block enthaelt GENAU die zwei
//     erwarteten Felder (maxOutputTokens, responseMimeType) - kein Rest,
//     kein neues, unverifiziertes Feld
//  5  Struktur: der MAX_TOKENS-Fallback (Meldung + finishReason-Pruefung +
//     geminiFinishReason) ist UNVERAENDERT vorhanden - reines Sicherheits-
//     netz, kein ersetztes Verhalten
//  6  Struktur: der alte, generische Fehlerpfad bleibt fuer jeden anderen
//     Grund unveraendert erhalten
//  7  Struktur: der Erfolgspfad {ok:true,positions} ist unveraendert
//  8  Struktur: der !res.ok-Zweig (dort, wo der NEU gemeldete Fehler
//     tatsaechlich entsteht - Gemini weist die Anfrage selbst zurueck) ist
//     unveraendert vorhanden
//  9  Struktur: resolveImage()/bytesToBase64() sind unveraendert vorhanden -
//     kein zweiter Erkennungsweg
// 10  Verhalten: ein erfolgreicher Treffer wird vollstaendig uebernommen
// 11  Verhalten: der MAX_TOKENS-Fall erreicht die Person weiterhin
//     unveraendert ueber denselben Mechanismus - OHNE dass irgendeine
//     Position erfunden wird
// 12  Verhalten: der alte, generische Fehlerfall bleibt unveraendert
//     (Regressionsschutz)
// 13  Struktur: recognizePhoto() bleibt Unikat in js/17-ausmass.js
// 14  Struktur: keine geschuetzte Fachdatei wurde fuer diesen rein server-
//     seitigen Fix angefasst (git diff --name-only HEAD)
//
// Gegenprobe (siehe CLAUDE.md Abschnitt 88.8): separat als eigener Vorgang
// durchgefuehrt (Baum sichern, thinkingConfig testweise WIEDER einbauen,
// diesen Pruefstand erneut laufen lassen, genau den erwarteten Fehlschlag
// bestaetigen, wiederherstellen). Kein Umschalter dafuer in dieser Datei.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-thinking-config-entfernt-v3-42.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const fs=require("fs");
const {execSync}=require("child_process");

let ok=0,fail=0;
const p=(b,t,z)=>{
 if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}
};

const repo="/home/user/Spengler---Digital-V1";

// ---- Teil A: Struktur (der eingecheckte Quelltext von index.ts) -----------
console.log("A · Struktur - supabase/functions/extract-offer-positions/index.ts");
const edgePfad=repo+"/supabase/functions/extract-offer-positions/index.ts";
p(fs.existsSync(edgePfad),"die Datei existiert weiterhin im Repo");
const quelltextEdge=fs.existsSync(edgePfad)?fs.readFileSync(edgePfad,"utf8"):"";
const quelltextOhneKommentare=quelltextEdge.split("\n").filter(z=>!/^\s*\/\//.test(z)).join("\n");

p(!/thinkingConfig/.test(quelltextOhneKommentare),
 "thinkingConfig kommt im tatsaechlichen Code (Kommentare entfernt) NIRGENDS mehr vor");
p(!/thinkingBudget/.test(quelltextOhneKommentare),
 "thinkingBudget kommt im tatsaechlichen Code ebenfalls nirgends mehr vor");

p(/maxOutputTokens:\s*65536/.test(quelltextEdge),"maxOutputTokens ist weiterhin 65536 (unveraendert aus v3.41)");

// generationConfig-Block direkt herausgreifen und pruefen, dass er GENAU
// die zwei erwarteten Felder traegt - kein Rest von thinkingConfig, kein
// neues, unverifiziertes Feld.
const genConfMatch=quelltextEdge.match(/generationConfig:\s*\{([\s\S]*?)\},\s*\}\),/);
p(!!genConfMatch,"generationConfig-Block ist im Quelltext auffindbar");
const genConfText=genConfMatch?genConfMatch[1]:"";
const genConfFelder=(genConfText.match(/^\s*(\w+):/gm)||[]).map(s=>s.trim().replace(/:$/,""));
p(genConfFelder.length===2&&genConfFelder.includes("maxOutputTokens")&&genConfFelder.includes("responseMimeType"),
 "generationConfig enthaelt GENAU maxOutputTokens und responseMimeType - kein thinkingConfig, kein Rest",genConfFelder);

p(/finishReason\s*=\s*candidate\??\.finishReason/.test(quelltextEdge),
 "der MAX_TOKENS-Rueckfall aus v3.40 liest weiterhin finishReason aus candidate.finishReason (unveraendertes Sicherheitsnetz)");
const hatMaxTokensMeldung=/zu viele Positionen/.test(quelltextEdge)&&/abgeschnitten/.test(quelltextEdge)
 &&/kleineren Abschnitten/.test(quelltextEdge)&&/finishReason\s*===\s*["']MAX_TOKENS["']/.test(quelltextEdge)
 &&/geminiFinishReason:\s*finishReason/.test(quelltextEdge);
p(hatMaxTokensMeldung,"die v3.40-MAX_TOKENS-Meldung samt Bedingung und Diagnosefeld ist unveraendert vorhanden");

p(/error:\s*"Antwort der KI konnte nicht als Liste gelesen werden\."\s*,\s*raw\s*\}/.test(quelltextEdge),
 "der alte, generische Fehlerpfad (Meldung + raw-Feld) bleibt fuer JEDEN anderen Fehlschlag unveraendert erhalten");

p(/return json\(\{\s*ok:\s*true,\s*positions\s*\}\)/.test(quelltextEdge),
 "der Erfolgspfad {ok:true,positions} ist unveraendert");

p(/if\s*\(\s*!res\.ok\s*\)\s*\{/.test(quelltextEdge)&&/geminiStatus:\s*res\.status/.test(quelltextEdge),
 "der !res.ok-Zweig (dort, wo der NEU gemeldete Fehler tatsaechlich entstand - Gemini weist die Anfrage selbst zurueck) ist unveraendert vorhanden");

p(quelltextEdge.includes("async function resolveImage(")&&quelltextEdge.includes("function bytesToBase64("),
 "resolveImage()/bytesToBase64() sind unveraendert vorhanden (kein zweiter Erkennungsweg gebaut)");

// ---- Teil B: Verhalten (Client-Vertrag ueber gemockte Edge-Function) -------
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
    return Promise.resolve({data:{signedUrl:"blob:x"},error:null});
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

 let antwortModus="erfolg";
 await page.route("**/functions/v1/extract-offer-positions",async route=>{
  (page.__kiAufrufe=page.__kiAufrufe||[]).push(route.request().postDataJSON());
  if(antwortModus==="max_tokens"){
   await route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({
    ok:false,
    error:"Das Dokument enthält zu viele Positionen für eine einzelne Erkennung – die Antwort der KI wurde mitten im Satz abgeschnitten. Bitte das Dokument in kleineren Abschnitten hochladen oder die Positionen für diesen Teil von Hand erfassen.",
    geminiFinishReason:"MAX_TOKENS"
   })});
  }else if(antwortModus==="generisch"){
   await route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({
    ok:false,error:"Antwort der KI konnte nicht als Liste gelesen werden.",raw:"[{\"pos\":\"1\""
   })});
  }else if(antwortModus==="erfolg"){
   const positions=Array.from({length:97},(_,i)=>({pos:String(i+1),description:"Position "+(i+1),quantity:i+1,unit:"m2"}));
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,positions})});
  }
 });

 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof checkOfferteZugriff==="function"
  &&typeof newAngebot==="function"&&typeof recognizePhoto==="function",null,{timeout:15000});
 await page.waitForTimeout(200);

 await page.evaluate(()=>{
  window.__lese={angebote:[],feature_access:[{profile_id:"u1",feature:"angebote",granted:true}],audit_log:[]};
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"f1"};
  allProfiles=[currentProfile];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Testbau",object:"Alpeneggstrasse 22, Bern",order_no:"18191",customer:"Muster AG",archived:false,status:"offen"}];
  settings={employees:["Mike Ledermann"],rates:[],materials:[]};
  employeeIds=["u1"];
  cockpitProjectId=7;
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });
 await page.evaluate(async()=>{await checkOfferteZugriff()});

 console.log("\nB · Verhalten - erfolgreicher Treffer (97 Positionen, genau das reale gemeldete Dokument)");
 antwortModus="erfolg";
 page.__dialoge=[];
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles({
  name:"steildachsanierung-alpeneggstrasse.pdf",mimeType:"application/pdf",
  buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")
 });
 await page.waitForTimeout(50);
 const erfolgErgebnis=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,500));
  return {anzahlPositionen:angPositions.length,status:$("angRecognizeStatus").textContent};
 });
 p(erfolgErgebnis.anzahlPositionen===97,
  "alle 97 vom erfolgreichen Treffer gelieferten Positionen werden VOLLSTAENDIG uebernommen - keine clientseitige Kappung",erfolgErgebnis);
 p(/97 Position\(en\) aus dem PDF erkannt/.test(erfolgErgebnis.status),"und die Statuszeile nennt die volle Anzahl",erfolgErgebnis);

 console.log("\nC · Verhalten - Fall 'MAX_TOKENS' (unveraendertes Sicherheitsnetz aus v3.40)");
 antwortModus="max_tokens";
 page.__dialoge=[];
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles({
  name:"pathologisch-grosse-offerte.pdf",mimeType:"application/pdf",
  buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")
 });
 await page.waitForTimeout(50);
 const maxTokensErgebnis=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
  return {anzahlPositionen:angPositions.length};
 });
 p((page.__dialoge||[]).some(m=>m.includes("zu viele Positionen")&&m.includes("abgeschnitten")&&m.includes("kleineren Abschnitten")),
  "das MAX_TOKENS-Sicherheitsnetz erreicht die Person weiterhin unveraendert ueber den bestehenden Fehlerdialog",page.__dialoge);
 p(maxTokensErgebnis.anzahlPositionen===0,
  "bei diesem Fall wird weiterhin KEINE Position erfunden",maxTokensErgebnis);

 console.log("\nD · Verhalten - Fall 'generisch' (Regressionsschutz, unveraendert)");
 antwortModus="generisch";
 page.__dialoge=[];
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles({
  name:"kleine-offerte.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")
 });
 await page.waitForTimeout(50);
 const generischErgebnis=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
  return {anzahlPositionen:angPositions.length};
 });
 p((page.__dialoge||[]).some(m=>m.includes("Antwort der KI konnte nicht als Liste gelesen werden.")&&!m.includes("zu viele Positionen")),
  "der alte, generische Fehlerfall zeigt weiterhin GENAU die alte Meldung",page.__dialoge);
 p(generischErgebnis.anzahlPositionen===0,"auch hier wird keine Position erfunden",generischErgebnis);

 console.log("\nE · Struktur - keine geschuetzte Fachdatei wurde fuer diesen rein serverseitigen Fix angefasst");
 const quelltext63=fs.readFileSync(repo+"/js/63-angebote.js","utf8");
 const quelltext17=fs.readFileSync(repo+"/js/17-ausmass.js","utf8");
 p(quelltext17.includes("async function recognizePhoto(src)"),"recognizePhoto() ist weiterhin (und unveraendert) in js/17-ausmass.js definiert");
 p(!quelltext63.includes("async function recognizePhoto("),"js/63-angebote.js baut recognizePhoto() weiterhin NICHT selbst nach");

 let geaenderteDateien=[];
 try{
  geaenderteDateien=execSync("git diff --name-only HEAD -- . && git ls-files --others --exclude-standard",
   {cwd:repo,encoding:"utf8"}).trim().split("\n").filter(Boolean);
 }catch(e){geaenderteDateien=null;}
 const mussUnberuehrtSein=[
  "js/17-ausmass.js","js/24-projekt-cockpit.js","js/05a-rechte.js","js/63-angebote.js",
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
   "keine geschuetzte Fachdatei wurde fuer diesen Fix angefasst - dieser ist rein serverseitig (Edge Function)",
   {geaendert:geaenderteDateien,verletzt});
 }

 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler waehrend des gesamten Laufs",jsFehler);

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
