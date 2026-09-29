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
 // v3.223: die App startet die Liste jetzt ZUGEKLAPPT (siehe Abschnitt H,
 // der genau das prueft). Die Abschnitte A-F schauen sich die Zeilen an -
 // dafuer muss die Liste da sein, also wird hier ausdruecklich aufgeklappt.
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
 console.log("\nD . Scannen ist die Handlung, alles andere Beiwerk");
 // GEAENDERTER VERTRAG (v3.223). Bis v3.222 lagen alle fuenf Knoepfe in
 // EINER Leiste und wurden gleich gewichtet; "＋ Neues Material" stand seit
 // v3.140 sogar vorn und blau. Ansage des Anwenders: "die ein un ausscannen
 // buttons sollen prominent sein und die anderen im hintergrund". Die
 // Pruefungen sind deshalb nicht geloescht, sondern gedreht - samt
 // Gegenproben, damit die alte Gleichgewichtung nicht zurueckkommt.
 z=await page.evaluate(()=>{
  const scan=document.querySelector(".lager-scan");
  const leiste=document.querySelector(".lager-werkzeuge");
  const sicht=el=>[...el.querySelectorAll("button")].filter(x=>!x.hidden);
  const scanK=sicht(scan), nebenK=sicht(leiste);
  const gr=el=>el.getBoundingClientRect();
  const schrift=el=>parseFloat(getComputedStyle(el).fontSize);
  const breite=gr(leiste).width;
  return {
   scanIds:scanK.map(x=>x.id),
   nebenIds:nebenK.map(x=>x.id),
   scanHoehe:Math.min(...scanK.map(x=>gr(x).height)),
   nebenHoehe:Math.max(...nebenK.map(x=>gr(x).height)),
   scanSchrift:Math.min(...scanK.map(schrift)),
   nebenSchrift:Math.max(...nebenK.map(schrift)),
   scanAnteil:Math.min(...scanK.map(x=>gr(x).width/gr(scan).width)),
   nebenGrau:nebenK.every(x=>x.classList.contains("gray")),
   scanNichtGrau:scanK.every(x=>!x.classList.contains("gray")),
   scanUeberSuche:!!($("lagerSuche").compareDocumentPosition(scan)&2),
   sucheUeberLeiste:!!($("lagerSuche").compareDocumentPosition(leiste)&4),
   vollbreit:nebenK.filter(x=>gr(x).width>breite*0.9).length,
   reihen:new Set(nebenK.map(x=>Math.round(gr(x).top))).size
  };
 });
 p(z.scanIds.length===2&&z.scanIds.indexOf("lagerEinscannen")>=0&&z.scanIds.indexOf("lagerAusscannen")>=0,
   "D1 Ein- und Ausscannen stehen ALLEIN in ihrer eigenen Zeile",z);
 p(z.nebenIds.indexOf("lagerEinscannen")<0&&z.nebenIds.indexOf("lagerAusscannen")<0,
   "D2 GEGENPROBE: sie liegen NICHT mehr zwischen den Nebenknoepfen",z);
 p(z.scanHoehe>z.nebenHoehe&&z.scanSchrift>z.nebenSchrift,
   "D3 sie sind messbar groesser als die Nebenknoepfe - prominent sieht man, statt es zu raten",z);
 p(z.scanAnteil>0.4,"D4 jeder der beiden nimmt seine halbe Zeile - sie teilen sie sich",z);
 p(z.scanNichtGrau&&z.nebenGrau,
   "D5 die Scan-Knoepfe sind farbig, ALLE Nebenknoepfe grau - auch '＋ Neues Material', das bis v3.222 blau war",z);
 p(z.scanUeberSuche,"D6 die Scan-Zeile steht zuoberst, noch ueber der Suche",z);
 p(z.sucheUeberLeiste,"D7 die Nebenknoepfe stehen unter der Suche - sie sind der Rest, nicht der Weg",z);
 p(z.vollbreit===0&&z.reihen<=2,"D8 die Nebenzeile bleibt eine Leiste: kein Knopf in voller Breite, hoechstens zwei Reihen",z);

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

 // ---- H  Zugeklappt ist der Normalzustand (v3.223) ----------------------
 console.log("\nH . Zugeklappt ist der Normalzustand");
 // Ansage des Anwenders: "zusätzlich soll standartmässig alles zugeklappt
 // sein". Bis v3.222 stand die Liste offen da; bei ueber dreihundert
 // Positionen ist das keine Uebersicht, sondern eine Wand.
 // Die Vorgabe steht im Quelltext - im Node gelesen, nicht in der Seite:
 // die Pruefseite laeuft ueber file://, dort ist fetch() gesperrt.
 {
  const frisch=fs.readFileSync(path.join(process.cwd(),"js/68-lagerverwaltung.js"),"utf8");
  const vorgabe=/let lagerListeVersteckt\s*=\s*(true|false)/.exec(frisch);
  z={vorgabe:vorgabe?vorgabe[1]:null};
 }
 p(z.vorgabe==="true",
   "H1 die App startet mit zugeklappter Liste - GEGENPROBE zum alten Zustand, wo sie offen stand",z);

 z=await page.evaluate(()=>{
  lagerListeVersteckt=true; lagerSuche=""; $("lagerSuche").value="";
  renderLagerverwaltung();
  const zu={text:$("lagerverwaltungListe").innerText,
   karten:document.querySelectorAll("#lagerverwaltungListe [data-lager-karte]").length,
   knopf:$("lagerAlleZuklappen").textContent, knopfDa:!$("lagerAlleZuklappen").hidden,
   kennzahlenDa:!$("lagerKennzahlen").hidden, sucheDa:!!$("lagerSuche")};
  $("lagerAlleZuklappen").click();
  const auf={karten:document.querySelectorAll("#lagerverwaltungListe [data-lager-karte]").length,
   knopf:$("lagerAlleZuklappen").textContent};
  // Und die Suche muss das Zuklappen weiterhin schlagen.
  lagerListeVersteckt=true; lagerSuche="rinnen"; $("lagerSuche").value="rinnen";
  renderLagerverwaltung();
  const gesucht=document.querySelectorAll("#lagerverwaltungListe [data-lager-karte]").length;
  lagerSuche=""; $("lagerSuche").value=""; lagerListeVersteckt=false; renderLagerverwaltung();
  return {zu,auf,gesucht};
 });
 p(z.zu.karten===0&&/Positionen im Lager/.test(z.zu.text),
   "H2 zugeklappt steht keine einzige Zeile da - nur, wie viele Positionen es gibt",z);
 p(z.zu.kennzahlenDa&&z.zu.sucheDa&&z.zu.knopfDa,
   "H3 Kennzahlen, Suche und der Weg zur Liste bleiben sichtbar - zugeklappt heisst nicht weg",z);
 p(/anzeigen/i.test(z.zu.knopf),"H4 der Knopf bietet an, sie zu zeigen",z);
 p(z.auf.karten>0&&/zuklappen/i.test(z.auf.knopf),
   "H5 GEGENPROBE: ein Druck zeigt die ganze Liste, und der Knopf bietet wieder das Zuklappen an",z);
 p(z.gesucht>0,
   "H6 GEGENPROBE: eine Suche schlaegt das Zuklappen - wer sucht, will die Treffer sehen (unveraendert seit v3.124)",z);

 // ---- I  Zurueck aus der Kamera (v3.223) --------------------------------
 console.log("\nI . Zurueck aus der Kamera");
 // ECHTER FEHLER, gemeldet: "Und ich will von der kamera irgendwie
 // zutückkommen ohne das es die ganze app schliesst". Das Scan-Overlay
 // traegt .barcode-scan-overlay und keine der Klassen, die js/54 sucht -
 // es lag also kein Platzhalter in der Verlaufsliste, und die
 // Zurueck-Taste verliess die Seite.
 const zurueckQuelle=fs.readFileSync(path.join(process.cwd(),"js/54-zurueck.js"),"utf8");
 z=await page.evaluate(async()=>{
  $("barcodeScanOverlay").hidden=false;
  await new Promise(r=>setTimeout(r,60));
  const imStapel=typeof zurueckSchirme!=="undefined"&&zurueckSchirme.indexOf("barcodeScanOverlay")>=0;
  // Der Rueckweg muss die Kamera wirklich stoppen, nicht bloss ausblenden.
  const stream=document.createElement("canvas").captureStream();
  let gestoppt=false; stream.getVideoTracks()[0].stop=()=>{gestoppt=true};
  $("barcodeScanVideo").srcObject=stream;
  zurueckSchliesse("barcodeScanOverlay");
  await new Promise(r=>setTimeout(r,60));
  return {imStapel, zu:$("barcodeScanOverlay").hidden, gestoppt};
 });
 z.extra=/ZURUECK_EXTRA=\[[^\]]*barcodeScanOverlay/.test(zurueckQuelle);
 z.ueberSchliessen=/barcodeScanOverlay:\s*\(\)=>barcodeScanSchliessen\(\)/.test(zurueckQuelle);
 p(z.extra,"I1 das Scan-Overlay ist als Schirm eingetragen - vorher kannte der Zurueck-Mechanismus es gar nicht",z);
 p(z.imStapel,"I2 und landet beim Oeffnen tatsaechlich im Schirm-Stapel, bekommt also einen Platz in der Verlaufsliste",z);
 p(z.zu===true,"I3 Zurueck schliesst das Overlay statt die App",z);
 p(z.ueberSchliessen&&z.gestoppt===true,
   "I4 GEGENPROBE gegen blosses Ausblenden: der Rueckweg geht ueber barcodeScanSchliessen() und stoppt die Kamera wirklich",z);
 z=await page.evaluate(()=>({
  links:!!(document.querySelector(".barcode-scan-box .bar button#barcodeScanAbbrechen")&&
   $("barcodeScanAbbrechen").compareDocumentPosition($("barcodeScanAbbrechen").parentElement.querySelector("span"))&4),
  text:$("barcodeScanAbbrechen").textContent}));
 p(z.links&&/zur/i.test(z.text),
   "I5 im Overlay selbst steht der Rueckweg links und heisst 'Zurueck' - wie ueberall sonst in der App",z);

 p(fehler.length===0,"G1 keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();
