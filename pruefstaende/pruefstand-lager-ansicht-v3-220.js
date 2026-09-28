// Prueft die Darstellung der Lagerverwaltung (v3.220).
//
// Ansage des Anwenders: "Lagerverwaltung aufpeppen... darstellung
// professionalisieren, es sieht im momemt nach einer einstellungsseite aus
// es soll nun professioneller aussehen".
//
// WAS HIER GEPRUEFT WIRD - gemessen, nicht behauptet:
//   A  Der Stand des Lagers steht als Zeile oben und ist ABGELEITET.
//   B  Die Zeile einer Position: EDV-Nr. als Nummernfeld, Bezeichnung,
//      Dimension darunter, Bestand rechts als Zahl mit Einheit.
//   C  Bestand 0 faellt auf (rot) - und ein Bestand > 0 eben nicht.
//   D  Die Werkzeugleiste ist eine Leiste, keine Wand aus vollbreiten
//      Knoepfen; gesucht wird ueber den Knoepfen.
//   E  Im Lager-BEREICH ist der Abschnitt kein zuklappbarer
//      Einstellungs-Abschnitt mehr - in den Einstellungen dagegen schon.
//   F  Gegenprobe: was die Seite TUT, ist unveraendert. Dieselben Marken
//      (data-lager-karte, data-lager-buchen), derselbe Bestand.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-lager-ansicht-v3-220.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

// Vier Positionen, fuenf Produkte, zwei davon mit Bestand - die Zahlen
// darunter sind von Hand nachgerechnet und stehen so im Pruefstand.
const AUFBAU=()=>{
 currentProfile={id:"u1",role:"admin",first_name:"A",last_name:"B",company_id:"c1"};
 meineRechte={admin:true};
 settings.materials=[["101.10","Titanzink Band","0.7 mm","m2",38.5],
                     ["205.30","Rinnenhalter verzinkt","333 mm","Stk",4.2],
                     ["300.10","Dichtband Butyl","15 mm x 10 m","Rolle",18.9],
                     ["410.20","Bohrschraube","4.5 x 35 mm","Stk",0.42]];
 materialIds=[11,12,13,14];
 lagerVarianten=[
  {id:1,material_id:11,bezeichnung:"Titanzink Band 0.7 mm",archiviert:false},
  {id:2,material_id:12,bezeichnung:"Rinnenhalter verzinkt",archiviert:false},
  {id:3,material_id:13,bezeichnung:"Dichtband schwarz",archiviert:false},
  {id:4,material_id:13,bezeichnung:"Dichtband grau",archiviert:false},
  {id:5,material_id:14,bezeichnung:"Bohrschraube 4.5x35",archiviert:false}];
 lagerBewegungen=[
  {id:1,variante_id:1,menge:12,art:"zugang",datum:"2026-09-20",grund:""},
  {id:2,variante_id:2,menge:240,art:"zugang",datum:"2026-09-21",grund:""}];
 $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
 if($("lagerverwaltungSection"))$("lagerverwaltungSection").hidden=false;
 lagerSuche=""; if($("lagerSuche"))$("lagerSuche").value="";
 lagerListeVersteckt=false; lagerArchivZeigen=false;
 openSettingsTo("lager");
 const sec=document.querySelector('[data-section="lagerverwaltung"]');
 if(sec)sec.classList.add("open");
 renderLagerverwaltung();
};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(AUFBAU);
 await page.evaluate(()=>{$("settingsModal").classList.add("a2-nur-lager")});
 await page.waitForTimeout(300);

 // ---- A  Der Stand des Lagers -------------------------------------------
 console.log("A . Der Stand des Lagers steht oben");
 let z=await page.evaluate(()=>{
  const kz=$("lagerKennzahlen");
  return {da:!!kz&&!kz.hidden, text:(kz.innerText||"").replace(/\s+/g," ").trim(),
          warnung:!!kz.querySelector(".lager-kz-warnung"),
          // Steht die Zeile wirklich ueber der Liste?
          vorDerListe:!!(kz.compareDocumentPosition($("lagerverwaltungListe"))&4)};
 });
 p(z.da&&/4 Positionen/.test(z.text),"A1 die Zahl der Positionen steht da",z);
 p(/5 Produkte/.test(z.text),"A2 und die Zahl der Produkte",z);
 // Von Hand nachgerechnet: fuenf Produkte, zwei mit Bestand -> drei ohne.
 p(/3 ohne Bestand/.test(z.text),"A3 und wie viele davon leer sind (3 von 5)",z);
 p(z.warnung===true,"A4 'ohne Bestand' faellt auf, solange es welche gibt",z);
 p(z.vorDerListe,"A5 die Zeile steht ueber der Liste",z);
 // Gegenprobe: die Zahlen sind ABGELEITET, kein fester Text. Ein Zugang auf
 // das dritte Produkt muss "3 ohne Bestand" zu "2" machen.
 z=await page.evaluate(()=>{
  lagerBewegungen.push({id:3,variante_id:3,menge:6,art:"zugang",datum:"2026-09-22",grund:""});
  renderLagerverwaltung();
  const t=($("lagerKennzahlen").innerText||"").replace(/\s+/g," ").trim();
  lagerBewegungen.pop(); renderLagerverwaltung();
  return t;
 });
 p(/2 ohne Bestand/.test(z),"A6 Gegenprobe: eine Buchung aendert die Zahl - sie ist abgeleitet",z);

 // ---- B  Wie eine Zeile aussieht ----------------------------------------
 console.log("\nB . Die Zeile einer Position");
 z=await page.evaluate(()=>{
  const karten=[...document.querySelectorAll("#lagerverwaltungListe .lager-karte")];
  const erste=karten[0];
  const nr=erste.querySelector(".lager-nr");
  const titel=erste.querySelector(".lager-zeile-titel b");
  const unter=erste.querySelector(".lager-zeile-unter");
  const best=erste.querySelector(".lager-bestand");
  const r=best?best.getBoundingClientRect():null;
  const kr=erste.getBoundingClientRect();
  return {anzahl:karten.length,
   nr:nr?nr.textContent.trim():null,
   titel:titel?titel.textContent.trim():null,
   unter:unter?unter.textContent.trim():null,
   bestZahl:best?best.querySelector("b").textContent.trim():null,
   bestEinheit:best?best.querySelector("span").textContent.trim():null,
   // "rechts" heisst: die rechte Kante der Zahl liegt am rechten Rand der Karte.
   rechts:!!(r&&kr&&(kr.right-r.right)<120),
   // Das Wort "Bestand:" davor gibt es nicht mehr - die Zahl spricht selbst.
   wortBestand:/Bestand:/.test(erste.innerText||"")};
 });
 p(z.anzahl===4,"B1 vier Positionen stehen in der Liste",z);
 p(z.nr==="101.10","B2 die EDV-Nr. steht als eigenes Feld vorn",z);
 p(z.titel==="Titanzink Band","B3 die Bezeichnung traegt die Zeile",z);
 p(z.unter==="0.7 mm","B4 die Dimension steht klein darunter",z);
 p(z.bestZahl==="12"&&z.bestEinheit==="m2","B5 der Bestand steht als Zahl mit Einheit",z);
 p(z.rechts,"B6 und zwar rechts in der Zeile",z);
 p(z.wortBestand===false,"B7 ohne das Wort 'Bestand:' davor",z);

 // ---- C  Null faellt auf -------------------------------------------------
 console.log("\nC . Nichts mehr da");
 z=await page.evaluate(()=>{
  const karten=[...document.querySelectorAll("#lagerverwaltungListe .lager-karte")];
  const mit=karten[0].querySelector(".lager-bestand");
  const ohne=karten.find(k=>k.querySelector(".lager-bestand-leer"));
  const f=e=>{const c=getComputedStyle(e.querySelector("b")).color.match(/\d+/g);
   return c?{r:+c[0],g:+c[1],b:+c[2]}:null};
  return {leerVorhanden:!!ohne, leer:ohne?f(ohne.querySelector(".lager-bestand")):null,
          voll:f(mit), vollIstLeer:mit.classList.contains("lager-bestand-leer")};
 });
 p(z.leerVorhanden&&z.leer&&z.leer.r>z.leer.g+40&&z.leer.r>z.leer.b+40,
   "C1 ein Bestand von 0 wird rot gezeigt",z);
 p(z.vollIstLeer===false&&z.voll&&!(z.voll.r>z.voll.g+40),
   "C2 Gegenprobe: ein Bestand > 0 ist NICHT rot - die Marke sitzt nicht an jeder Zeile",z);

 // ---- D  Werkzeugleiste --------------------------------------------------
 console.log("\nD . Eine Leiste, keine Wand");
 z=await page.evaluate(()=>{
  const leiste=document.querySelector(".lager-werkzeuge");
  const knoepfe=[...leiste.querySelectorAll("button")].filter(x=>!x.hidden);
  const breite=leiste.getBoundingClientRect().width;
  const vollbreit=knoepfe.filter(x=>x.getBoundingClientRect().width>breite*0.9).length;
  const suche=$("lagerSuche");
  return {anzahl:knoepfe.length, vollbreit,
          sucheUeberLeiste:!!(suche.compareDocumentPosition(leiste)&4),
          reihen:new Set(knoepfe.map(x=>Math.round(x.getBoundingClientRect().top))).size};
 });
 p(z.anzahl>=4,"D1 die Leiste traegt ihre Knoepfe",z);
 p(z.vollbreit===0,"D2 kein Knopf nimmt die ganze Breite - es ist eine Leiste",z);
 p(z.reihen<=2,"D3 sie braucht hoechstens zwei Reihen",z);
 p(z.sucheUeberLeiste,"D4 gesucht wird ueber den Knoepfen - das ist die haeufigste Handlung",z);

 // ---- E  Bereich statt Einstellungs-Abschnitt ---------------------------
 console.log("\nE . Im Bereich kein Einstellungs-Abschnitt");
 z=await page.evaluate(()=>{
  const kopf=document.querySelector('[data-section="lagerverwaltung"] .settings-section-head');
  const pfeil=kopf.querySelector(".settings-section-chevron");
  const hilfe=kopf.querySelector(".hilfe-knopf");
  const st=e=>e?getComputedStyle(e):null;
  return {kopfKlasse:kopf.className,
          pfeilSichtbar:st(pfeil).display!=="none",
          kopfKlickbar:st(kopf).pointerEvents!=="none",
          hilfeKlickbar:st(hilfe).pointerEvents!=="none"};
 });
 p(/lager-kopf/.test(z.kopfKlasse),"E1 der Kopf traegt die eigene Marke",z);
 p(z.pfeilSichtbar===false,"E2 im Bereich hat er keinen Zuklapp-Pfeil",z);
 p(z.kopfKlickbar===false,"E3 und laesst sich nicht zuklappen - er IST die Seite",z);
 p(z.hilfeKlickbar===true,"E4 die Info-Knoepfe darin bleiben trotzdem bedienbar",z);
 // Gegenprobe: OHNE die Bereichsmarke - also in den Einstellungen - ist alles
 // unveraendert. Sonst waere der Abschnitt dort nicht mehr zuklappbar.
 z=await page.evaluate(()=>{
  $("settingsModal").classList.remove("a2-nur-lager");
  const kopf=document.querySelector('[data-section="lagerverwaltung"] .settings-section-head');
  const r={pfeil:getComputedStyle(kopf.querySelector(".settings-section-chevron")).display!=="none",
           klickbar:getComputedStyle(kopf).pointerEvents!=="none"};
  $("settingsModal").classList.add("a2-nur-lager");
  return r;
 });
 p(z.pfeil&&z.klickbar,"E5 Gegenprobe: in den Einstellungen bleibt er zuklappbar wie bisher",z);

 // ---- F  Was die Seite TUT, ist unveraendert ----------------------------
 console.log("\nF . Dieselbe Funktion");
 z=await page.evaluate(()=>{
  const k=document.querySelector("#lagerverwaltungListe [data-lager-karte]");
  const buchen=document.querySelector("#lagerverwaltungListe [data-lager-buchen]");
  // Aufklappen wie bisher: ein Tipp auf den Kopf. Nach dem Tipp wird die
  // Liste neu gezeichnet - der zweite Tipp muss deshalb auf den NEUEN Kopf
  // gehen, nicht auf das inzwischen weggeworfene Element.
  k.click();
  const offen=!!document.querySelector("#lagerverwaltungListe .lager-karte-body");
  const k2=document.querySelector("#lagerverwaltungListe [data-lager-karte]");
  if(k2)k2.click();
  return {marken:!!k&&!!buchen, offen,
          zuNachZweitemTipp:!document.querySelector("#lagerverwaltungListe .lager-karte-body"),
          bestand:typeof lagerBestandVon==="function"?lagerBestandVon(1):null};
 });
 p(z.marken,"F1 die Marken data-lager-karte und data-lager-buchen sind unveraendert da",z);
 p(z.offen&&z.zuNachZweitemTipp,"F2 auf- und zuklappen geht wie bisher",z);
 p(z.bestand===12,"F3 und der Bestand wird unveraendert gerechnet",z);

 p(fehler.length===0,"G1 keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();
