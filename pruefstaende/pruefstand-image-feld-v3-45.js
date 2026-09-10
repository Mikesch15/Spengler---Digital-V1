"use strict";
// Pruefstand v3.45 - Feldname "image" statt "image_base64" (Client <-> Server)
//
// Gemeldeter Produktivfehler (Screenshot des Betriebs, Offerte-Bearbeiten-
// Bildschirm mit bereits 112 zuvor erkannten Positionen):
//   "Fehler bei der Erkennung: Server antwortete mit Status 400: Kein
//   gueltiges Bild/PDF uebergeben."
// Zusatzfrage des Betriebs im selben Bericht: ob das App bereits den
// GANZEN Absatz je Positionsnummer einliest (nicht nur die Zeile daneben)
// und ob fett gedruckte Zwischentitel mit eingelesen werden.
//
// Root Cause (per Log-Auswertung ueber mcp__Supabase__query_logs gegen das
// echte Produktivprojekt nfgryuzkpwjfmdlmevuy sowie direktem Quelltext-
// Abgleich, nicht geraten):
//   js/17-ausmass.js  recognizePhoto()  schickte  {image_base64:src}
//   Edge Function (deployte Fassung, v16)          erwartete  body.image
// -> jeder Aufruf schlug serverseitig mit exakt der gemeldeten 400er-
//    Meldung fehl, unabhaengig vom Inhalt des PDFs/Fotos.
//
// Zusaetzlich festgestellt: die im Repo eingecheckte
// supabase/functions/extract-offer-positions/index.ts war seit v12 nicht
// mehr mit der tatsaechlich live deployten Fassung (v16) synchron - unter
// anderem las der eingecheckte Server-Code ebenfalls noch body.image_base64
// statt body.image. Beim Abgleich gegen die per get_edge_function
// bestaetigte Live-Fassung wurde das behoben; ein erster eigener
// Rekonstruktionsversuch dabei liess die Datei zunaechst selbst
// syntaktisch kaputt zurueck (im Kopfkommentar der Datei transparent
// dokumentiert) - per "npx tsc --noEmit --target es2022 --lib
// es2022,dom --skipLibCheck --allowJs false" zweifach gegengeprueft,
// danach fehlerfrei (bis auf die zwei erwarteten, harmlosen
// TS2304-Meldungen zu "Deno").
//
// Fix:
//   1. js/17-ausmass.js: body:JSON.stringify({image:src}) statt
//      {image_base64:src}.
//   2. supabase/functions/extract-offer-positions/index.ts: liest
//      body.image (nicht body.image_base64), Fehlermeldung bei fehlendem
//      Bild bleibt "Kein gueltiges Bild/PDF uebergeben.".
//   3. Deployed als Edge Function Version 17 (bestaetigt ACTIVE ueber
//      list_edge_functions/get_edge_function).
//
// Die Antwort auf die Zusatzfrage des Betriebs: JA, beide Punkte sind
// bereits im deployten Prompt-Text vorhanden (unveraendert seit v16/v3.44,
// CLAUDE.md Abschnitt 149) - "GESAMTEN zusammengehoerigen Text" fuer die
// Mehrzeiligkeit einer Position, sowie die eigene Anweisung fuer fett
// gedruckte Zwischentitel (nicht als eigene Position, sondern jeder
// folgenden Position mit " - " vorangestellt). Dieser Pruefstand belegt
// beides strukturell (Abschnitt A) zusaetzlich zur bereits in v3.44
// geprueften Funktion.
//
// Geprueft:
//  1. js/17-ausmass.js schickt das Feld "image" (nicht "image_base64").
//  2. index.ts liest body.image (nicht body.image_base64).
//  3. Die exakte 400er-Fehlermeldung "Kein gueltiges Bild/PDF uebergeben."
//     ist unveraendert vorhanden.
//  4. Die Mehrzeiligkeits-Anweisung ("GESAMTEN zusammengehoerigen Text")
//     ist im Prompt vorhanden.
//  5. Die Zwischentitel-Anweisung (fett gedruckt, " - "-Trennzeichen,
//     NICHT als eigenes Array-Element) ist im Prompt vorhanden.
//  6. generationConfig ist unveraendert aus v15/v3.43 (maxOutputTokens,
//     thinkingConfig, responseMimeType - kein weiterer Rest).
//  7. Der MAX_TOKENS-Rueckfall aus v3.40 ist unveraendert vorhanden.
//  8. Der generische Fehlerpfad ist unveraendert vorhanden.
//  9. Der Erfolgspfad ist unveraendert vorhanden.
// 10. Verhalten ueber die echte Offerte-Oberflaeche (newAngebot() ->
//     #angPdfInput -> [data-ang-pdf-erkennen]): das tatsaechlich an die
//     Edge Function geschickte JSON traegt das Feld "image", niemals
//     "image_base64"; 97 gelieferte Positionen werden vollstaendig
//     uebernommen.
// 11. MAX_TOKENS- und generischer Fehlerfall bleiben ueber die echte
//     Oberflaeche unveraendert wirksam (Regressionsschutz).
// 12. recognizePhoto() bleibt Unikat in js/17-ausmass.js, js/63-angebote.js
//     baut sie nicht nach.
// 13. Keine geschuetzte Fachdatei wurde fuer diesen rein technischen Fix
//     angefasst.
// 14. Keine unbehandelten JavaScript-Fehler waehrend des gesamten Laufs.
//
// Gegenprobe (siehe CLAUDE.md Abschnitt 88.8): js/17-ausmass.js wird
// bewusst wieder auf {image_base64:src} zurueckgesetzt, der Pruefstand
// erneut ausgefuehrt (muss an genau den erwarteten Stellen fehlschlagen -
// der strukturellen Feldpruefung UND der Anfrage-Aufzeichnung im
// Verhaltensteil), danach wiederhergestellt und erneut gruen bestaetigt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-image-feld-v3-45.js

const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const fs=require("fs");
const {execSync}=require("child_process");

let ok=0,fail=0;
const p=(b,t,z)=>{
 if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}
};

const repo="/home/user/Spengler---Digital-V1";

// ---------- Teil A: strukturell, am Quelltext ----------

const quelltextClient=fs.readFileSync(repo+"/js/17-ausmass.js","utf8");
const clientOhneKommentare=quelltextClient.split("\n").filter(z=>!/^\s*\/\//.test(z)).join("\n");

p(/body:\s*JSON\.stringify\(\{\s*image:\s*src\s*\}\)/.test(clientOhneKommentare),
 "js/17-ausmass.js: recognizePhoto() schickt {image:src}");
p(!/JSON\.stringify\(\{\s*image_base64:/.test(clientOhneKommentare),
 "js/17-ausmass.js: kein JSON.stringify({image_base64:...}) mehr im tatsaechlichen Code");

const quelltextEdge=fs.readFileSync(repo+"/supabase/functions/extract-offer-positions/index.ts","utf8");
const edgeOhneKommentare=quelltextEdge.split("\n").filter(z=>!/^\s*\/\//.test(z)).join("\n");

p(/resolveImage\(String\(body\.image\s*\|\|\s*""\)\)/.test(edgeOhneKommentare),
 "index.ts: liest body.image (nicht body.image_base64)");
p(!/body\.image_base64/.test(edgeOhneKommentare),
 "index.ts: body.image_base64 kommt im tatsaechlichen Code nirgends mehr vor");
p(/error:\s*"Kein gueltiges Bild\/PDF uebergeben\."/.test(edgeOhneKommentare),
 "index.ts: die exakte 400er-Fehlermeldung ist unveraendert vorhanden");

p(/GESAMTEN zusammengeh.rigen Text/.test(quelltextEdge),
 "index.ts: die Mehrzeiligkeits-Anweisung (ganzer Absatz statt nur die Zeile) ist im Prompt vorhanden");
p(/fett gedruckte Zwischentitel/.test(quelltextEdge)&&/NICHT als eigenes Array-Element/.test(quelltextEdge),
 "index.ts: die Zwischentitel-Anweisung (fett gedruckt, nicht als eigene Position) ist im Prompt vorhanden");
p(quelltextEdge.includes(" – ")||quelltextEdge.includes(" - "),
 "index.ts: das Trennzeichen zwischen Zwischentitel und Positionstext ist im Prompt vorhanden");

const genConfMatch=edgeOhneKommentare.match(/generationConfig:\s*\{([\s\S]*?)\},\s*\}\),/);
p(!!genConfMatch,"index.ts: generationConfig-Block gefunden");
if(genConfMatch){
 const felder=(genConfMatch[1].match(/^\s*(\w+):/gm)||[]).map(z=>z.trim().replace(/:$/,""));
 p(felder.includes("maxOutputTokens")&&felder.includes("thinkingConfig")&&felder.includes("responseMimeType")&&felder.length===3,
  "index.ts: generationConfig enthaelt GENAU maxOutputTokens, thinkingConfig, responseMimeType",felder);
}
p(/maxOutputTokens:\s*65536/.test(edgeOhneKommentare),"index.ts: maxOutputTokens ist weiterhin 65536");
p(/thinkingLevel:\s*"LOW"/.test(edgeOhneKommentare),"index.ts: thinkingConfig.thinkingLevel ist weiterhin \"LOW\"");

p(/finishReason\s*===\s*"MAX_TOKENS"/.test(edgeOhneKommentare),
 "index.ts: der MAX_TOKENS-Rueckfall aus v3.40 ist unveraendert vorhanden");
p(/error:\s*"Antwort der KI konnte nicht als Liste gelesen werden\."[\s\S]{0,80}raw:/.test(edgeOhneKommentare),
 "index.ts: der generische Fehlerpfad ist unveraendert vorhanden");
p(/return json\(\{\s*ok:\s*true,\s*positions\s*\}\)/.test(edgeOhneKommentare),
 "index.ts: der Erfolgspfad ist unveraendert vorhanden");
p(/function resolveImage/.test(edgeOhneKommentare)&&/function bytesToBase64/.test(edgeOhneKommentare),
 "index.ts: resolveImage()/bytesToBase64() sind unveraendert vorhanden (kein zweiter Erkennungsweg)");

// ---------- Attrappe fuer den Browserlauf ----------

const ATTRAPPE=`window.supabase={createClient:function(){
 function tabelle(t){
  const q={_t:t,_filter:{}};
  q.select=function(){return q};
  q.eq=function(k,v){q._filter[k]=v;return q};
  q.order=function(){return q};
  q.in=function(){return q};
  q.not=function(){return q};
  q.limit=function(){return q};
  q.maybeSingle=function(){return q.then(r=>({data:(r.data||[])[0]||null,error:r.error}))};
  q.insert=function(zeile){
   window.__schreib=window.__schreib||[];
   window.__schreib.push({t:t,op:"insert",zeile:zeile});
   const arr=Array.isArray(zeile)?zeile:[zeile];
   return {select:function(){return {then:function(f){return f({data:arr,error:null})}}},then:function(f){return f({data:arr,error:null})}};
  };
  q.update=function(zeile){
   window.__schreib=window.__schreib||[];
   window.__schreib.push({t:t,op:"update",zeile:zeile,filter:q._filter});
   return {eq:function(){return this},select:function(){return {then:function(f){return f({data:[zeile],error:null})}}},then:function(f){return f({data:[zeile],error:null})}};
  };
  q.delete=function(){
   window.__schreib=window.__schreib||[];
   window.__schreib.push({t:t,op:"delete",filter:q._filter});
   return {eq:function(){return {then:function(f){return f({data:[],error:null})}}},then:function(f){return f({data:[],error:null})}};
  };
  q.then=function(f){
   window.__from=window.__from||[];
   window.__from.push(t);
   const daten=(window.__lese&&window.__lese[t])||[];
   return f({data:daten,error:null});
  };
  return q;
 }
 return {
  from:tabelle,
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  storage:{from:function(){return {upload:async()=>({data:{path:"x"},error:null}),createSignedUrl:async()=>({data:{signedUrl:"https://beispiel.test/signiert.pdf"},error:null})}}},
  rpc:function(){return Promise.resolve({data:null,error:null})},
  functions:{invoke:function(){return Promise.resolve({data:{ok:true},error:null})}}
 };
}};`;

// ---------- Teil B/C/D: Verhalten ueber die echte Offerte-Oberflaeche ----------

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>{(page.__dialoge=page.__dialoge||[]).push(d.message());d.accept()});

 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));

 let antwortModus="erfolg";
 await page.route("**/functions/v1/extract-offer-positions",async route=>{
  const gesendet=route.request().postDataJSON();
  page.__kiAufrufe=page.__kiAufrufe||[];
  page.__kiAufrufe.push(gesendet);
  if(antwortModus==="erfolg"){
   const positions=[];
   for(let i=1;i<=97;i++)positions.push({pos:String(i),description:"Position "+i,quantity:1,unit:"Stk."});
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,positions})});
  }else if(antwortModus==="max_tokens"){
   await route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({ok:false,error:"Das Dokument enthält zu viele Positionen für eine einzelne Erkennung – die Antwort der KI wurde mitten im Satz abgeschnitten. Bitte das Dokument in kleineren Abschnitten hochladen oder die Positionen für diesen Teil von Hand erfassen.",geminiFinishReason:"MAX_TOKENS"})});
  }else if(antwortModus==="feld_fehlt"){
   await route.fulfill({status:400,contentType:"application/json",body:JSON.stringify({ok:false,error:"Kein gueltiges Bild/PDF uebergeben."})});
  }else{
   await route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({ok:false,error:"Antwort der KI konnte nicht als Liste gelesen werden.",raw:"{kaputt"})});
  }
 });

 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof checkOfferteZugriff==="function"&&typeof newAngebot==="function"&&typeof recognizePhoto==="function",null,{timeout:15000});
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
  $("appRoot").hidden=false;
  $("authScreen").hidden=true;
 });
 await page.evaluate(async()=>{await checkOfferteZugriff()});

 // --- B: erfolgreicher Treffer, das gesendete JSON traegt "image" ---
 antwortModus="erfolg";
 page.__dialoge=[];
 page.__kiAufrufe=[];
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles({name:"steildachsanierung-alpeneggstrasse.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")});
 await page.waitForTimeout(50);
 const erfolgErgebnis=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,500));
  return {anzahlPositionen:angPositions.length,status:$("angRecognizeStatus")?$("angRecognizeStatus").textContent:""};
 });
 const gesendetesJson=(page.__kiAufrufe||[])[0]||{};
 p(Object.prototype.hasOwnProperty.call(gesendetesJson,"image"),
  "Verhalten: das tatsaechlich an die Edge Function geschickte JSON traegt das Feld \"image\"",gesendetesJson);
 p(!Object.prototype.hasOwnProperty.call(gesendetesJson,"image_base64"),
  "Verhalten: das gesendete JSON traegt NICHT mehr das Feld \"image_base64\"",gesendetesJson);
 p(erfolgErgebnis.anzahlPositionen===97,
  "Verhalten: alle 97 gelieferten Positionen werden uebernommen",erfolgErgebnis);
 p(/97 Position/.test(erfolgErgebnis.status||""),
  "Verhalten: die Statuszeile nennt die Anzahl erkannter Positionen",erfolgErgebnis.status);

 // --- C: MAX_TOKENS bleibt unveraendert wirksam (Regressionsschutz) ---
 antwortModus="max_tokens";
 page.__dialoge=[];
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles({name:"gross.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")});
 await page.waitForTimeout(50);
 const maxTokensErgebnis=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,500));
  return {anzahlPositionen:angPositions.length};
 });
 const maxTokensDialoge=(page.__dialoge||[]).join(" | ");
 p(/zu viele Positionen/.test(maxTokensDialoge)&&/abgeschnitten/.test(maxTokensDialoge)&&/kleineren Abschnitten/.test(maxTokensDialoge),
  "Verhalten: MAX_TOKENS-Meldung bleibt unveraendert wirksam",maxTokensDialoge);
 p(maxTokensErgebnis.anzahlPositionen===0,
  "Verhalten: bei MAX_TOKENS wird keine Position erfunden/uebernommen",maxTokensErgebnis);

 // --- D: der urspruenglich gemeldete Fehler selbst (400, fehlendes Feld) ---
 antwortModus="feld_fehlt";
 page.__dialoge=[];
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();});
 await page.locator("#angPdfInput").setInputFiles({name:"ohne-passendes-feld.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")});
 await page.waitForTimeout(50);
 const feldFehltErgebnis=await page.evaluate(async()=>{
  document.querySelector("[data-ang-pdf-erkennen]").click();
  await new Promise(r=>setTimeout(r,500));
  return {anzahlPositionen:angPositions.length};
 });
 const feldFehltDialoge=(page.__dialoge||[]).join(" | ");
 p(/Kein gueltiges Bild\/PDF uebergeben/.test(feldFehltDialoge),
  "Verhalten: eine Server-Ablehnung wegen fehlendem Feld erreicht unveraendert den Fehlerdialog",feldFehltDialoge);
 p(feldFehltErgebnis.anzahlPositionen===0,
  "Verhalten: bei einer 400er-Ablehnung wird keine Position erfunden",feldFehltErgebnis);

 // --- E: geschuetzte Dateien unangetastet ---
 const quelltextAngebote=fs.readFileSync(repo+"/js/63-angebote.js","utf8");
 p(!/async\s+function\s+recognizePhoto/.test(quelltextAngebote),
  "js/63-angebote.js definiert recognizePhoto() NICHT selbst (bleibt Unikat in js/17-ausmass.js)");
 p((quelltextClient.match(/async\s+function\s+recognizePhoto/g)||[]).length===1,
  "js/17-ausmass.js definiert recognizePhoto() genau einmal");

 const mussUnberuehrtSein=[
  "js/24-projekt-cockpit.js","js/05a-rechte.js","js/06-rapport.js","js/08-katalog-blitzschutz.js",
  "css/03-druck.css","css/04-rechte.css","js/09-projekte.js","js/10-massaufnahme.js",
  "js/44-workflow.js","js/45-aufgaben.js","js/46-admin-uebersicht.js","js/47-projektmodule.js",
  "js/48-projekt-material.js","js/49-projekt-zuschnitt.js","js/50-reservierung.js","js/51-werkstatt.js",
  "js/54-zurueck.js","js/55-winkel.js","js/56-material-zuschnitt.js",
  "js/57-rapport-material.js","js/58-ruestliste.js","js/59-lagerbestand.js","js/60-ruestskizzen.js",
  "js/61-materialstaerke.js","js/62-masse.js","js/64-ausfuehrung.js","js/65-leistungen.js",
  "js/11-einlaufblech-gerade.js","js/12-rinne-halbrund.js","js/12b-mauerabdeckung.js",
  "js/13-einlaufblech-konisch.js","js/14-freies-profil.js","js/15-einlaufblech-stueckliste.js",
  "js/19-lukarne.js","js/20-anschlussblech.js","js/21-einfassung-rund.js",
  "js/25-kehle.js","js/26-rinne.js","js/37-kamin-aufnahme.js"
 ];
 try{
  const diffAusgabe=execSync("git diff --name-only HEAD -- . && git ls-files --others --exclude-standard",{cwd:repo,encoding:"utf8"});
  const geaenderteDateien=diffAusgabe.split("\n").map(z=>z.trim()).filter(Boolean);
  const betroffen=geaenderteDateien.filter(d=>mussUnberuehrtSein.includes(d));
  p(betroffen.length===0,"keine geschuetzte Fachdatei wurde fuer diesen Fix angefasst",betroffen);
 }catch(e){
  p(false,"git diff --name-only konnte nicht ausgewertet werden",String(e));
 }

 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler waehrend des gesamten Laufs",jsFehler);

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
