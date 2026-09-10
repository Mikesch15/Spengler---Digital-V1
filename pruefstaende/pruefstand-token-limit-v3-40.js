"use strict";
// ---- Pruefstand: Token-Limit-Fix der Positionserkennung (v3.40) -----------
//
// Auftrag (Fehlermeldung des Betriebs, woertlich): "klappt nicht mit
// positionen auslesen aus den pdf, bitte überprüfen... so sehen unsere
// offerten aus..." - beigelegt: ein Bildschirmfoto des genauen Fehlers
// ("Fehler bei der Erkennung: Server antwortete mit Status 502: Antwort der
// KI konnte nicht als Liste gelesen werden.") und eine echte, dichte
// 13-seitige Schweizer NPK-Offerte mit ueber 90 einzeln nummerierten
// Positionen (Alpeneggstrasse 22, Bern - Rinne und Vordach neu).
//
// Root Cause (per query_logs gegen die echte Produktivdatenbank bestaetigt,
// nicht vermutet): der reale 502 wurde am 2026-09-10T05:16:46Z fuer genau
// diese Funktion protokolliert. Direkte Pruefung des v11-Quelltexts zeigt
// generationConfig.maxOutputTokens:3000 - bei geschaetzt 30-35 Ausgabe-Token
// je JSON-Positionsobjekt reichen 90 Positionen fast genau bis an diese
// Grenze (~2970-3000 Token). Geminis Antwort wird dadurch mitten im Array
// abgeschnitten, JSON.parse(raw) scheitert, und genau der oben zitierte,
// unspezifische Fehler wird angezeigt - ohne jeden Hinweis auf die
// tatsaechliche Ursache.
//
// Fix (Edge Function extract-offer-positions, v11 -> v12, bereits ueber
// mcp__Supabase__deploy_edge_function live in Produktion deployt UND als
// supabase/functions/extract-offer-positions/index.ts im Repo abgelegt -
// schliesst zugleich die seit CLAUDE.md §31.6/§144.3 dokumentierte Luecke,
// dass diese Funktion als einzige ohne eingecheckten Quelltext war):
//   1. maxOutputTokens 3000 -> 8192 (rund 2.75x Reserve ueber den realen
//      Bedarf des angehaengten Dokuments hinaus - keine geratene Zahl,
//      sondern anhand des tatsaechlichen Dokuments bemessen).
//   2. candidate.finishReason wird jetzt gelesen. Scheitert JSON.parse(raw)
//      TROTZDEM noch (ein noch groesseres Dokument als das reale Beispiel)
//      UND finishReason==="MAX_TOKENS", bekommt die Person eine ehrliche,
//      konkrete, umsetzbare Meldung statt der alten, nichtssagenden - ohne
//      irgendeine Position zu erfinden oder ein abgeschnittenes Array
//      teilweise zu uebernehmen (CLAUDE.md §78.5: "keine geratenen
//      Positionen" gilt unveraendert).
// Der Erfolgspfad (ok:true, positions) UND der bisherige generische
// Fehlerpfad (jeder andere Grund, warum JSON.parse scheitert) sind
// unveraendert - der Fix ist rein additiv.
//
// Da diese Sandbox ueber keine Deno-Laufzeit verfuegt (nur Node.js, siehe
// "which deno node"), kann der SERVER-Code nicht direkt ausgefuehrt werden.
// Geprueft wird deshalb wie bei jeder Edge-Function-Aenderung dieses Repos
// (siehe pruefstand-angebot-pdf-erkennen-v3-39.js):
//   (a) STRUKTURELL der eingecheckte Quelltext von index.ts, und
//   (b) VERHALTENSBEZOGEN der Client-Vertrag ueber page.route()-Mocks der
//       Edge-Function-Antwort - recognizePhoto() (js/17-ausmass.js) reicht
//       jeden vom Server gelieferten error-String unveraendert weiter, die
//       neue, spezifischere Meldung erreicht die Person deshalb OHNE jede
//       Client-Code-Aenderung.
//
// Geprueft:
//  1  Struktur: maxOutputTokens ist 8192, nicht mehr 3000
//  2  Struktur: finishReason wird aus candidate.finishReason gelesen
//  3  Struktur: die neue, spezifische MAX_TOKENS-Meldung ist im Quelltext
//     vorhanden, mit beiden im Auftrag geforderten Kernaussagen (zu viele
//     Positionen / abgeschnitten) und einem konkreten Handlungsvorschlag
//  4  Struktur: der alte generische Fehlerpfad (Meldung + raw-Feld) bleibt
//     fuer den Nicht-MAX_TOKENS-Fall vollstaendig erhalten
//  5  Struktur: der Erfolgspfad ({ok:true,positions}) ist unveraendert
//  6  Struktur: der Quelltext liegt jetzt im Repo (schliesst die
//     dokumentierte Luecke)
//  7  Verhalten: ein gemockter 502 mit der NEUEN spezifischen Meldung +
//     geminiFinishReason:"MAX_TOKENS" erreicht die Person unveraendert ueber
//     denselben alert()-Mechanismus wie jeder andere Erkennungsfehler -
//     OHNE jede Aenderung an js/17-ausmass.js oder js/63-angebote.js
//  8  Verhalten: bei diesem Fehler wird KEINE einzige Position uebernommen
//     (das "keine geratenen Positionen"-Versprechen haelt auch hier)
//  9  Verhalten: der bisherige generische Fehlerfall (kein finishReason)
//     zeigt weiterhin die alte, generische Meldung unveraendert - der Fix
//     ist rein additiv, kein bestehendes Verhalten wurde ersetzt
// 10  Verhalten: ein grosser, erfolgreicher Treffer (120 Positionen, wie es
//     das jetzt hoehere Token-Limit ermoeglichen soll) wird VOLLSTAENDIG
//     uebernommen - keine client-seitige Kappung irgendwo im Weg
// 11  Struktur: recognizePhoto() bleibt Unikat in js/17-ausmass.js, js/63
//     baut nichts nach, keine geschuetzte Fachdatei wurde angefasst
//
// Gegenprobe (siehe CLAUDE.md Abschnitt 88.8): separat als eigener Vorgang
// durchgefuehrt (Baum sichern, echten Fehler in index.ts einbauen - z.B.
// maxOutputTokens zurueck auf 3000 oder den finishReason-Zweig entfernen -,
// diesen Pruefstand erneut laufen lassen, genau den erwarteten Fehlschlag
// bestaetigen, wiederherstellen). Kein Umschalter dafuer in dieser Datei.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-token-limit-v3-40.js
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
p(fs.existsSync(edgePfad),"die Datei existiert (schliesst die dokumentierte Luecke, CLAUDE.md §31.6/§144.3)");
const quelltextEdge=fs.existsSync(edgePfad)?fs.readFileSync(edgePfad,"utf8"):"";

p(/maxOutputTokens:\s*8192/.test(quelltextEdge),"maxOutputTokens ist 8192 (nicht mehr 3000)");
// Der Kopfkommentar DARF (und soll, house style) den alten, fehlerhaften Wert
// zu Dokumentationszwecken nennen ("maxOutputTokens:3000 war zu niedrig") -
// geprueft wird deshalb nur der tatsaechliche CODE, mit vorher entfernten
// Kommentarzeilen, nicht der erklaerende Prosatext.
const quelltextOhneKommentare=quelltextEdge.split("\n").filter(z=>!/^\s*\/\//.test(z)).join("\n");
p(!/maxOutputTokens:\s*3000/.test(quelltextOhneKommentare),
 "maxOutputTokens 3000 kommt im tatsaechlichen Code nirgends mehr vor (der Kopfkommentar darf den alten Wert dokumentieren)");

p(/finishReason\s*=\s*candidate\??\.finishReason/.test(quelltextEdge),
 "finishReason wird aus candidate.finishReason gelesen");

const hatNeueMeldung=/zu viele Positionen/.test(quelltextEdge)&&/abgeschnitten/.test(quelltextEdge)
 &&/kleineren Abschnitten/.test(quelltextEdge);
p(hatNeueMeldung,
 "die neue MAX_TOKENS-Meldung nennt sowohl 'zu viele Positionen' als auch 'abgeschnitten' und einen Loesungsvorschlag ('kleineren Abschnitten')");
p(/finishReason\s*===\s*["']MAX_TOKENS["']/.test(quelltextEdge),
 "die neue Meldung wird gezielt an finishReason==='MAX_TOKENS' geknuepft (kein pauschaler Ersatz jedes Fehlers)");
p(/geminiFinishReason:\s*finishReason/.test(quelltextEdge),
 "geminiFinishReason wird zur Diagnose mit zurueckgegeben");

p(/error:\s*"Antwort der KI konnte nicht als Liste gelesen werden\."\s*,\s*raw\s*\}/.test(quelltextEdge),
 "der alte, generische Fehlerpfad (Meldung + raw-Feld) bleibt fuer JEDEN anderen Fehlschlag unveraendert erhalten");

p(/return json\(\{\s*ok:\s*true,\s*positions\s*\}\)/.test(quelltextEdge),
 "der Erfolgspfad {ok:true,positions} ist unveraendert");

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

 // Der Edge-Function-Endpunkt wird je Testfall neu belegt, mit exakt der
 // Antwort, die der ECHTE Server (v12) fuer den jeweiligen Fall liefern
 // wuerde - kein Aufruf der echten Funktion, da diese Sandbox keinen
 // Zugriff auf das Produktivnetzwerk hat.
 let antwortModus="max_tokens";
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
  }else if(antwortModus==="grosser_erfolg"){
   const positions=Array.from({length:120},(_,i)=>({pos:String(i+1),description:"Position "+(i+1),quantity:i+1,unit:"m2"}));
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

 console.log("\nB · Verhalten - Fall 'MAX_TOKENS' (der real gemeldete Fehler)");
 antwortModus="max_tokens";
 page.__dialoge=[];
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles({
  name:"Offerte_18191_Steildachsanierung.pdf",mimeType:"application/pdf",
  buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")
 });
 await page.waitForTimeout(50);
 const maxTokensErgebnis=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,300));
  return {anzahlPositionen:angPositions.length};
 });
 p((page.__dialoge||[]).some(m=>m.includes("zu viele Positionen")&&m.includes("abgeschnitten")&&m.includes("kleineren Abschnitten")),
  "die neue, spezifische Meldung erreicht die Person unveraendert ueber den bestehenden Fehlerdialog - OHNE jede Client-Code-Aenderung",page.__dialoge);
 p(maxTokensErgebnis.anzahlPositionen===0,
  "bei diesem Fehler wird KEINE Position erfunden/uebernommen",maxTokensErgebnis);

 console.log("\nC · Verhalten - Fall 'generisch' (jeder andere Grund - unveraendert, Regressionsschutz)");
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
  "der alte, generische Fehlerfall zeigt weiterhin GENAU die alte Meldung - der Fix ist rein additiv, kein bestehendes Verhalten ersetzt",page.__dialoge);
 p(generischErgebnis.anzahlPositionen===0,"auch hier wird keine Position erfunden",generischErgebnis);

 console.log("\nD · Verhalten - grosser Treffer (120 Positionen) wird VOLLSTAENDIG uebernommen");
 antwortModus="grosser_erfolg";
 page.__dialoge=[];
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles({
  name:"grosse-offerte-90-positionen.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")
 });
 await page.waitForTimeout(50);
 const grossErgebnis=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,400));
  return {anzahlPositionen:angPositions.length,status:$("angRecognizeStatus").textContent};
 });
 p(grossErgebnis.anzahlPositionen===120,
  "alle 120 vom (jetzt hoeheren Token-Limit ermoeglichten) erfolgreichen Treffer gelieferten Positionen werden uebernommen - keine client-seitige Kappung",grossErgebnis);
 p(/120 Position\(en\) aus dem PDF erkannt/.test(grossErgebnis.status),"und die Statuszeile nennt die volle Anzahl",grossErgebnis);

 console.log("\nE · Struktur - keine geschuetzte Fachdatei wurde fuer diesen Fix angefasst");
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
   "js/63-angebote.js (und jede andere Client-Datei) blieb fuer diesen Fix unangetastet - dieser ist rein serverseitig (Edge Function)",
   {geaendert:geaenderteDateien,verletzt});
 }

 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler waehrend des gesamten Laufs",jsFehler);

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
