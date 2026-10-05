// Prueft die ANSICHT 2.0 (v3.150) - die zweite Oberflaeche fuer dieselbe App.
//
// WAS HIER GEPRUEFT WIRD
//   A  Ohne Schalter ist die klassische Ansicht unveraendert da.
//   B  Mit Schalter erscheint die neue Ansicht mit ihren Registern.
//   C  Die Listen kommen aus den Daten der App, nicht aus eigenen.
//   D  Die Ablaufleiste rechnet richtig - besonders im leeren Fall.
//   E  Der Weg zurueck stellt den vorherigen Zustand wirklich wieder her.
//   F  Gegenproben: kein zweiter Schreibweg, keine zweite Rechtepruefung,
//      keine Stilregel, die ohne den Schalter wirkt.
//
// WAS HIER NICHT GEPRUEFT WIRD
//   Ob die Datenbank die Regeln durchsetzt. Diese Ansicht schreibt nichts;
//   sie ruft dieselben Funktionen wie die klassische Ansicht, und die sind
//   an ihrer eigenen Stelle geprueft. Genau das wird in F1/F2 belegt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ansicht2-v3-150.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const fs=require("fs");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:()=>{const f={};['select','order','limit','range','eq','in','not'].forEach(k=>f[k]=()=>f);
  f.maybeSingle=async()=>({data:null,error:null});
  f.then=(r)=>Promise.resolve({data:[],error:null}).then(r);return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:null})})}
})};`;

// Die Anmeldung nachstellen. Bewusst nur das, was die neue Ansicht liest -
// so faellt auf, wenn sie heimlich noch etwas anderes braucht.
const anmelden=page=>page.evaluate(()=>{
 currentProfile={id:"u1",first_name:"Mike",last_name:"Ledermann",role:"admin"};
 companyName="Muster Spenglerei AG";
 allProjects=[
  {id:1,name:"Neubau Hofmatt",object:"Hofmattstrasse 4, 3400 Burgdorf",order_no:"26-011",customer:"Hofmatt AG",status:"in_arbeit",archived:false,updated_at:"2026-09-20T10:00:00Z"},
  {id:2,name:"Sanierung Kirche",object:"Kirchweg 1, 3550 Langnau",order_no:"26-004",customer:"Kirchgemeinde",status:"offen",archived:false,updated_at:"2026-09-18T10:00:00Z"},
  {id:3,name:"Altbau",object:"Bahnhofstrasse 9, 3000 Bern",order_no:"25-099",customer:"X AG",status:"abgeschlossen",archived:true,updated_at:"2026-01-01T10:00:00Z"}
 ];
 aufgabenListe=[
  {art:"erneut_freigeben",m:{id:11,project_id:1,type:"kamin_einfassung",title:"Kamin Ost",workflow_status:"in_bearbeitung",freigabe_verfallen:true}},
  {art:"ruesten",m:{id:12,project_id:2,type:"rinne_halbrund",title:"Rinne Nord",workflow_status:"zu_ruesten"}}
 ];
 $("authScreen").hidden=true;$("appRoot").hidden=false;$("startScreen").hidden=false;
 if($("navWerkstatt"))$("navWerkstatt").hidden=false;
 if($("navLagerverwaltung"))$("navLagerverwaltung").hidden=false;
});

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad()});
 const page=await b.newPage({viewport:{width:390,height:844}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("console",m=>{
  if(m.type()!=="error")return;
  // Ohne Netz laedt die Pruefumgebung cdn.jsdelivr.net nicht (Supabase und
  // xlsx). Das ist eine Grenze der Umgebung, kein Fehler der App - und es
  // ist genau diese eine Meldung, die ausgenommen wird, nichts sonst.
  if(/ERR_TUNNEL_CONNECTION_FAILED|Failed to load resource/.test(m.text()))return;
  fehler.push("console: "+m.text());
 });
 // v3.205: Der Stub muss ausdruecklich geschuetzt werden.
 //
 // Bis v3.204 lag supabase-js auf cdn.jsdelivr.net und war aus der
 // Pruefumgebung nicht erreichbar - deshalb blieb der ueber addInitScript
 // eingespielte Stub stehen, ohne dass es hier jemand absichern musste.
 // Das war Zufall, kein Vertrag: auf dem GitHub-Runner mit Internet wurde
 // der Stub schon vorher ueberschrieben (siehe stub-schutz.js). Seit v3.205
 // liegt die Bibliothek im Projekt und laedt IMMER - der Zufall faellt weg,
 // die Absicherung wird Pflicht.
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP);

 // ===== A  Es gibt nur diese eine Ansicht (v3.218) =========================
 // Bis v3.217 stand hier: die Vorgabe greift, eine ausdrueckliche Wahl
 // schlaegt sie, und ueber den Knopf "Neue Ansicht testen" geht es hinein.
 // Ansage des Anwenders: "Klassische alte ansicht kann komplett weg." Damit
 // sind Vorgabe, Wahl und Umschalter entfallen - geprueft wird jetzt, dass
 // wirklich nichts davon uebrig ist und die Ansicht trotzdem immer steht,
 // auch mit einem alten "lieber klassisch" im Geraetespeicher.
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 let a0=await page.evaluate(()=>({
  gespeichert:localStorage.getItem("sd_ansicht2"),
  aktiv:a2Aktiv(),
  umschalter:typeof a2Setzen==="function"||!!document.getElementById("a2Ein"),
  klassisch:!!document.getElementById("startNav")||!!document.getElementById("topUserBar")
 }));
 p(a0.gespeichert===null&&a0.aktiv===true,"A0 auf einem frischen Geraet steht die Ansicht",a0);
 p(a0.umschalter===false,"A0b es gibt keinen Umschalter mehr",a0);
 p(a0.klassisch===false,"A0c und keine klassische Startseite im Dokument",a0);

 // Ein alter Eintrag aus v3.150 darf niemanden aussperren.
 await page.evaluate(()=>localStorage.setItem("sd_ansicht2","nein"));
 await page.reload();
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 await anmelden(page);
 // v3.218: Gezeichnet wurde die Ansicht bis v3.217 durch den Klick auf den
 // Umschalter. Den gibt es nicht mehr - im Betrieb zeichnet showStart() nach
 // dem Anmelden; hier wird genau das ausgeloest.
 await page.evaluate(()=>{if(typeof showStart==="function")showStart();else a2Zeichnen()});
 await page.waitForTimeout(300);
 let a=await page.evaluate(()=>({
  aktiv:a2Aktiv(),
  klasse:document.documentElement.classList.contains("a2-an"),
  a2:$("a2Screen").getClientRects().length>0,
  inhalt:($("a2Inhalt").innerText||"").length,
  // v3.218: Die Ablaufleiste gehoert ins Cockpit. Bis v3.217 war sie
  // ausserdem per hidden aus, solange die klassische Ansicht lief. Das
  // entfaellt; sichtbar sein darf sie trotzdem nicht, solange kein Projekt
  // offen ist - gemessen wird deshalb die Sichtbarkeit, nicht das Attribut.
  ablauf:$("a2Ablauf").getClientRects().length===0
 }));
 p(a.aktiv===true,"A1 ein altes 'lieber klassisch' wird nicht mehr gelesen",a);
 p(a.klasse&&a.a2&&a.inhalt>0,"A2 die Ansicht steht und ist gefuellt",a);
 p(a.ablauf,"A3 die Ablaufleiste ist nicht zu sehen, solange kein Projekt offen ist",a);

 // ===== B  Was auf der Startseite steht ====================================
 let bb=await page.evaluate(()=>({
  a2:$("a2Screen").getClientRects().length>0,
  // v3.218: Diese drei gibt es nicht mehr im Dokument - die Gegenprobe ist
  // deshalb "gar nicht da" statt "unsichtbar".
  nav:!!document.getElementById("startNav"),
  versionSichtbar:$("appVersion").getClientRects().length>0,
  versionText:($("appVersion").textContent||"").trim(),
  oben:!!document.getElementById("topUserBar"),
  tabs:[...$("a2Leiste").querySelectorAll("button")].map(x=>x.getAttribute("data-a2-tab")),
  zahlen:[...document.querySelectorAll("#a2Inhalt .a2-zahl b")].map(x=>x.textContent),
  // v3.158: Aufgaben sind Zeilen, nicht mehr Karten. Die Zahl der offenen
  // steht als Marke neben der Ueberschrift.
  zeilen:document.querySelectorAll("#a2Inhalt .a2-zeile-reihe").length,
  offenMarke:(()=>{const k=[...document.querySelectorAll("#a2Inhalt .a2-abschnitt-kopf")]
    .find(x=>/Meine Aufgaben/.test(x.textContent));
   const m=k&&k.querySelector(".a2-marke");return m?m.textContent.trim():""})(),
  rubriken:[...document.querySelectorAll("#a2Inhalt .a2-abschnitt-kopf h2")]
    .map(x=>x.textContent.replace(/\s+/g," ").trim().replace(/ i$/,"")),
  punkt:document.querySelector("#a2Leiste .a2-punkt")?document.querySelector("#a2Leiste .a2-punkt").textContent:""
 }));
 p(bb.a2&&!bb.nav&&!bb.oben,"B1 der Schirm steht, die klassische Startseite ist weg",bb);
 // Die Versionsnummer bleibt als Traeger im Dokument (index.html, #appAnker),
 // wird aber nicht mehr auf der Startseite gezeigt - sie steht unter "Mehr".
 p(!bb.versionSichtbar&&/^Version \d+\.\d+$/.test(bb.versionText),
   "B2 die Versionsnummer ist der eine Traeger, aber keine Anzeige mehr",bb);
 p(JSON.stringify(bb.tabs)===JSON.stringify(["heute","projekte","werkstatt","lager","mehr"]),"B3 fuenf Register",bb.tabs);
 // UMGESTELLT in v3.158. Bis dahin stand oben ein Band aus drei Zahlen
 // (offen / jetzt dran / Projekte) und darunter jede Aufgabe als Karte.
 // Die Startseite folgt jetzt dem Prototyp: die Zahl der offenen Aufgaben
 // steht als Marke neben der Ueberschrift, und das Zahlenband zeigt die
 // Werkstatt. Geloescht wird davon nichts - beides wird weiter gemessen,
 // nur an seinem neuen Platz.
 p(bb.offenMarke==="2 offen",
   "B4 die Zahl der offenen Aufgaben steht neben der Ueberschrift",bb.offenMarke);
 // v3.258: Die Liste startet ZUGEKLAPPT (Ansage des Anwenders). Die Zusage
 // "beide Aufgaben stehen als Zeile da" gilt unveraendert - sie ist nur
 // einen Tipp entfernt. Gemessen wird deshalb beides: die neue Vorgabe
 // (B5a: keine Zeile, dafuer die Koepfe mit der Zusammenfassung) UND die
 // alte Zusage nach dem Aufklappen (B5). Weggefallen ist keine davon.
 p(bb.zeilen===0,
   "B5a voreingestellt ist zugeklappt - es steht keine Aufgabenzeile da",bb.zeilen);
 const koepfe=await page.evaluate(()=>[...document.querySelectorAll("[data-a2-aufg-gruppe]")]
   .map(k=>(k.querySelector(".a2-zeile-text span")||{}).textContent||""));
 p(koepfe.length>0&&koepfe.every(t=>/\d+ Aufgabe/.test(t)),
   "B5c dafuer sagt jeder Projektkopf, wie viele Aufgaben darunter liegen",koepfe);
 const nachAuf=await page.evaluate(async()=>{
  // Ueber den echten Weg aufklappen, nicht ueber den Zustand - sonst
  // pruefte der Lauf etwas, das kein Anwender ausloesen kann.
  //
  // EINZELN und jedes Mal NEU gesucht: jeder Klick zeichnet die Seite neu,
  // und die Elemente aus einem vorher genommenen Schnappschuss haengen
  // danach nicht mehr im Dokument. Ein Klick darauf tut nichts. (Beim
  // ersten Anlauf genau so passiert: nur die erste Gruppe ging auf.)
  const ids=[...document.querySelectorAll("[data-a2-aufg-gruppe]")]
    .map(k=>k.getAttribute("data-a2-aufg-gruppe"));
  for(const id of ids){
   const k=document.querySelector(`[data-a2-aufg-gruppe="${id}"]`);
   if(k)k.click();
   await new Promise(r=>setTimeout(r,120));
  }
  return document.querySelectorAll("#a2Inhalt .a2-zeile-reihe").length;
 });
 p(nachAuf===2,"B5 aufgeklappt stehen beide Aufgaben als Zeile da",nachAuf);
 // Gegenprobe: die Seite hat die Gliederung des Prototyps. Ohne sie waeren
 // B4 und B5 auch gruen, wenn ausser den Aufgaben nichts mehr da waere.
 // Gemessen werden die RUBRIKEN, nicht die Werkstattzahlen: die kommen
 // nachtraeglich (werkLaden laeuft asynchron) und waeren hier ein Wettlauf.
 p(bb.rubriken.indexOf("Meine Aufgaben")>=0&&bb.rubriken.indexOf("Werkstatt heute")>=0
   &&bb.rubriken.indexOf("Offene Projekte")>=0,
   "B5b die Seite traegt die Rubriken des Prototyps",bb.rubriken);
 p(bb.punkt==="2","B6 die Zahl am Register Heute stimmt",bb);

 // Der Knopf einer Aufgabe muss GENAU die bestehende Funktion aufrufen.
 await page.evaluate(()=>{window.__ruf=[];aufgabeAusfuehren=async(art,id)=>{window.__ruf.push([art,String(id)])}});
 await page.click('[data-a2-aufgabe="ruesten"]');
 let ruf=await page.evaluate(()=>window.__ruf);
 p(JSON.stringify(ruf)===JSON.stringify([["ruesten","12"]]),"B7 der Knopf ruft aufgabeAusfuehren('ruesten',12) - kein eigener Weg",ruf);

 // ===== C  Projekte =========================================================
 await page.click('[data-a2-tab="projekte"]');
 let c=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#a2ProjListe .a2-zeile").length,
  text:$("a2ProjListe").textContent.replace(/\s+/g," "),
  feld:!!$("a2Suche")
 }));
 p(c.zeilen===2,"C1 nur die zwei nicht archivierten Projekte",c);
 p(!c.text.includes("Bahnhofstrasse"),"C2 das archivierte Projekt fehlt",c.text.slice(0,200));
 p(c.text.includes("Hofmattstrasse 4"),"C3 die Adresse ist der Haupttitel (projektTitel)",c.text.slice(0,200));

 await page.fill("#a2Suche","kirch");
 let c2=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#a2ProjListe .a2-zeile").length,
  fokus:document.activeElement?document.activeElement.id:""
 }));
 p(c2.zeilen===1,"C4 Suche 'kirch' findet genau ein Projekt",c2);
 p(c2.fokus==="a2Suche","C5 das Suchfeld behaelt beim Tippen den Fokus",c2);

 // Ein Projekt oeffnet seit v3.151 die eigene PROJEKTSEITE (sechs Register),
 // nicht mehr das klassische Cockpit. Bis v3.150 war es umgekehrt - der
 // Vertrag ist umgestellt, nicht abgeschwaecht: das Cockpit bleibt aus der
 // Projektseite heraus erreichbar, und dass es dort wirklich aufgeht,
 // prueft C8.
 await page.click('[data-a2-projekt="2"]');
 await page.waitForFunction(()=>!a2ProjLaedt);
 let c6=await page.evaluate(()=>({
  seite:a2Zustand.seite, projektId:a2Zustand.projektId,
  cockpit:!$("projectCockpitModal").hidden,
  register:[...document.querySelectorAll("#a2Inhalt .a2-register button")].length,
  // Die Startseite bleibt liegen - die Projektseite steckt darin.
  startNochDa:!$("startScreen").hidden
 }));
 p(c6.seite==="projekt"&&String(c6.projektId)==="2","C6 Tippen auf ein Projekt oeffnet die Projektseite",c6);
 p(!c6.cockpit,"C6b das klassische Cockpit bleibt dabei zu",c6);
 p(c6.register>=4,"C6c mit ihren Registern",c6);

 // Der Zurueck-Knopf der Kopfzeile fuehrt in die Projektliste.
 await page.click("[data-a2-zurueck]");
 let c7=await page.evaluate(()=>({
  seite:a2Zustand.seite, projektId:a2Zustand.projektId,
  a2:$("a2Screen").getClientRects().length>0
 }));
 p(c7.seite==="projekte"&&!c7.projektId&&c7.a2,"C7 Zurueck fuehrt in die Projektliste",c7);

 // Gegenprobe: das vollstaendige Cockpit ist weiterhin erreichbar, und sein
 // Zurueck-Knopf fuehrt in die neue Ansicht statt in die klassische Liste.
 await page.click('[data-a2-projekt="2"]');
 await page.waitForFunction(()=>!a2ProjLaedt);
 // UMGESTELLT in v3.203: Das Register "Mehr" der Projektseite ist
 // aufgeloest - es hiess genauso wie der Eintrag "Mehr" in der unteren
 // Leiste und enthielt etwas anderes. Seine Inhalte stehen jetzt in
 // eigenen Registern; der Weg ins vollstaendige Cockpit fuehrt ueber
 // "Dateien", wo das steht, was nur die vollstaendige Ansicht kann
 // (Hochladen, Fotowand, Verlauf). Die Zusicherung selbst ist unveraendert
 // dieselbe: es MUSS von der Projektseite aus einen Weg dorthin geben.
 const c8a=await page.evaluate(()=>({
  mehr:!!document.querySelector('#a2Inhalt [data-a2-reg="mehr"]'),
  dateien:!!document.querySelector('#a2Inhalt [data-a2-reg="dateien"]')
 }));
 p(!c8a.mehr,"C8a das Sammel-Register 'Mehr' der Projektseite ist weg",c8a);
 p(c8a.dateien,"C8b an seiner Stelle steht das Register Dateien",c8a);
 await page.click('#a2Inhalt [data-a2-reg="dateien"]');
 await page.waitForTimeout(300);
 const c8c=await page.evaluate(()=>
  [...document.querySelectorAll('#a2Inhalt [data-a2-tu="cockpit"]')].length);
 p(c8c>0,"C8c und es fuehrt in die vollstaendige Projektansicht",{wege:c8c});
 await page.click('#a2Inhalt [data-a2-tu="cockpit"]');
 let c8=await page.evaluate(()=>({
  cockpit:!$("projectCockpitModal").hidden,
  titel:$("cockpitTitle").textContent
 }));
 p(c8.cockpit,"C8 das vollstaendige Cockpit geht dort wirklich auf",c8);
 await page.click("#cockpitBack");
 await page.waitForFunction(()=>!a2ProjLaedt);
 let c9=await page.evaluate(()=>({
  cockpit:!$("projectCockpitModal").hidden,
  projektListe:!$("projectsModal").hidden,
  seite:a2Zustand.seite
 }));
 p(!c9.cockpit&&!c9.projektListe&&c9.seite==="projekt",
   "C9 sein Zurueck fuehrt auf die Projektseite, nicht in die klassische Liste",c9);

 // Eine fremde oder geloeschte Projekt-ID darf keine leere Seite hinterlassen.
 let c10=await page.evaluate(async()=>{
  a2Zustand.seite="projekte"; a2Zustand.projektId=null; a2Zeichnen();
  const knopf=document.querySelector('[data-a2-projekt]');
  knopf.setAttribute("data-a2-projekt","999999");
  knopf.click();
  await new Promise(r=>setTimeout(r,60));
  return {seite:a2Zustand.seite,a2:$("a2Screen").getClientRects().length>0};
 });
 p(c10.seite==="projekte"&&c10.a2,"C10 eine unbekannte Projekt-ID laesst die Liste stehen",c10);

 // ===== D  Ablaufleiste =====================================================
 // D1 ist der Fall, an dem eine naive Fassung scheitert: OHNE Massaufnahmen
 // erfuellt "jede ist montiert" die Bedingung leer - das Projekt stuende
 // faelschlich ganz hinten im Ablauf.
 let d1=await page.evaluate(()=>{
  projectMeasurementsCache=[];projectAngeboteCache=[];projectAusmassCache=[];
  if($("cockpitStandAngeboteZeile"))$("cockpitStandAngeboteZeile").hidden=false;
  a2AblaufZeichnen();
  return {stand:a2AblaufStand(),
   fertig:[...document.querySelectorAll("#a2Ablauf .ist-fertig")].length,
   jetzt:document.querySelector("#a2Ablauf .ist-jetzt .a2-ablauf-text").textContent};
 });
 p(d1.fertig===0,"D1 ohne Massaufnahmen ist keine Station fertig (leere Menge)",d1);
 p(d1.jetzt==="Offerte","D1b die erste offene Station ist die Offerte",d1);
 p(d1.stand.montage===false&&d1.stand.ruesten===false,"D1c weder Ruesten noch Montage gelten als erledigt",d1.stand);

 let d2=await page.evaluate(()=>{
  projectAngeboteCache=[{id:1}];
  projectMeasurementsCache=[
   {id:1,workflow_status:"geruestet"},
   {id:2,workflow_status:"zu_ruesten"}     // die schwaechste Station entscheidet
  ];
  projectAusmassCache=[];
  a2AblaufZeichnen();
  return {stand:a2AblaufStand(),
   jetzt:document.querySelector("#a2Ablauf .ist-jetzt .a2-ablauf-text").textContent};
 });
 p(d2.stand.freigabe===true&&d2.stand.ruesten===false,"D2 eine noch nicht geruestete Massaufnahme haelt das ganze Projekt",d2.stand);
 p(d2.jetzt==="Rüsten","D2b die aktuelle Station ist Ruesten",d2);

 let d3=await page.evaluate(()=>{
  projectMeasurementsCache=[{id:1,workflow_status:"freigegeben",freigabe_verfallen:true}];
  a2AblaufZeichnen();
  return a2AblaufStand();
 });
 p(d3.freigabe===false,"D3 eine verfallene Freigabe ist keine Freigabe",d3);

 let d4=await page.evaluate(()=>{
  workflowAktiv=false;
  a2AblaufZeichnen();
  const t=[...document.querySelectorAll("#a2Ablauf .a2-ablauf-text")].map(x=>x.textContent);
  workflowAktiv=true;
  return t;
 });
 p(d4.length===3&&d4.indexOf("Rüsten")<0,"D4 ohne Arbeitsablauf gibt es nur drei Stationen",d4);

 let d5=await page.evaluate(()=>{
  if($("cockpitStandAngeboteZeile"))$("cockpitStandAngeboteZeile").hidden=true;
  a2AblaufZeichnen();
  const t=[...document.querySelectorAll("#a2Ablauf .a2-ablauf-text")].map(x=>x.textContent);
  if($("cockpitStandAngeboteZeile"))$("cockpitStandAngeboteZeile").hidden=false;
  return t;
 });
 p(d5.indexOf("Offerte")<0,"D5 ohne Offerten-Freigabe fehlt die Station Offerte",d5);

 // ===== E  Der Weg zurueck ==================================================
 // Werkstatt und Lager erscheinen nur, wenn ihre Knoepfe sichtbar sind -
 // die Rechtepruefung bleibt bei der App.
 let e0=await page.evaluate(()=>{
  $("navWerkstatt").hidden=true;$("navLagerverwaltung").hidden=true;
  a2Zeichnen();
  return [...$("a2Leiste").querySelectorAll("button")].map(x=>x.getAttribute("data-a2-tab"));
 });
 p(JSON.stringify(e0)===JSON.stringify(["heute","projekte","mehr"]),"E1 abgeschaltete Module fehlen in der Leiste",e0);

 await page.evaluate(()=>{$("navWerkstatt").hidden=false;$("navLagerverwaltung").hidden=false;a2Zeichnen()});
 await page.click('[data-a2-tab="mehr"]');
 // v3.218: Bis v3.217 stand unter "Mehr" der Knopf "Zurueck zur klassischen
 // Ansicht". Den gibt es nicht mehr; geprueft wird jetzt, dass unter "Mehr"
 // wirklich kein Weg zurueck steht UND dass die Seite sonst unveraendert
 // funktioniert - die Sichtbarkeitszustaende der Anker bleiben unberuehrt.
 let e=await page.evaluate(()=>({
  zurueck:!!document.querySelector('[data-a2-tu="klassisch"]'),
  gemerkt:localStorage.getItem("sd_ansicht2"),
  a2:$("a2Screen").getClientRects().length>0,
  nav:!!document.getElementById("startNav"),
  oben:!!document.getElementById("topUserBar"),
  eintraege:[...document.querySelectorAll('#a2Inhalt [data-a2-tu]')].map(x=>x.getAttribute("data-a2-tu")),
  werkstatt:$("navWerkstatt").hidden,
  ablauf:$("a2Ablauf").getClientRects().length===0
 }));
 p(e.zurueck===false,"E2 unter Mehr steht kein Weg zurueck in die alte Ansicht",e);
 p(e.a2&&!e.nav&&!e.oben,"E3 die klassische Ansicht ist nicht wiederherstellbar - es gibt sie nicht",e);
 p(e.werkstatt===false,"E4 die hidden-Zustaende der Anker sind unberuehrt",e);
 p(e.ablauf,"E5 die Ablaufleiste ist nicht zu sehen",e);
 p(e.eintraege.length>=5,"E6 die Seite Mehr steht sonst unveraendert da",e.eintraege);

 // ===== F  Gegenproben am Quelltext =========================================
 const jsQ=fs.readFileSync("js/70-ansicht2.js","utf8");
 // Die Zusage: js/70 ZEICHNET nur, es schreibt nichts in die Datenbank.
 //
 // v3.257 GENAUER GEFASST, nicht abgeschwaecht. Bis dahin suchte diese
 // Pruefung stur nach ".insert(" / ".update(" / ".delete(" / ".upsert(" /
 // ".rpc(" im ganzen Text. Das trifft auch Set.delete() und Map.delete() -
 // reine Zustandsarbeit im Browser, die mit der Datenbank nichts zu tun hat.
 // Aufgefallen ist es, als das Zuklappen der Aufgaben-Gruppen (v3.257) eine
 // Menge zugeklappter Projekte fuehrte.
 //
 // Geprueft wird deshalb der SUPABASE-Weg: ein Schreibvorgang geht in dieser
 // App ausnahmslos ueber sb.from("tabelle"). Steht das nirgends in js/70,
 // kann die Datei auch nichts schreiben - unabhaengig davon, wie viele
 // Mengen und Karten sie sonst pflegt. F1b haelt fest, dass die Pruefung
 // einen echten Schreibweg weiterhin FINDEN wuerde; ohne diese Gegenprobe
 // waere die genauere Fassung nur eine bequemere.
 const sbWeg=jsQ.match(/\bsb\s*\.\s*from\s*\(/g)||[];
 const direkt=jsQ.match(/\.(from\s*\([^)]*\)\s*\.\s*(insert|update|delete|upsert)|rpc)\s*\(/g)||[];
 p(sbWeg.length===0&&direkt.length===0,
   "F1 js/70 enthaelt keinen einzigen Schreibweg - es spricht die Datenbank gar nicht erst an",
   {sbWeg,direkt});
 const probe='sb.from("projects").update({a:1});';
 p((probe.match(/\bsb\s*\.\s*from\s*\(/g)||[]).length===1,
   "F1a GEGENPROBE: ein echter Schreibweg wuerde von dieser Pruefung gefunden",probe);
 // v3.211 zusaetzlich, nicht ersatzweise: die Ansicht spricht ueberhaupt
 // nicht mit der Datenbank - auch nicht lesend. Das ist die eigentliche
 // Aussage hinter F1 und laesst sich nicht mit einem Set verwechseln.
 p(!/\bsb\s*\./.test(jsQ)&&!/\.from\(/.test(jsQ),
   "F1b und ruft die Datenbank gar nicht erst auf",
   (jsQ.match(/\bsb\s*\.[a-z]+/g)||[]).slice(0,5));
 p(!/\bsb\.from\(/.test(jsQ),"F2 js/70 fragt die Datenbank nicht selbst ab",jsQ.match(/sb\.from\([^)]*\)/g));

 // Jede Stilregel muss am Schalter oder an einer a2-Klasse haengen. Sonst
 // wuerde die Datei die klassische Ansicht veraendern, obwohl sie aus ist.
 // Die @media-Kopfzeilen werden VOR dem Zerlegen entfernt. Sonst faende
 // indexOf("{") im ersten Stueck eines @media-Blocks dessen Klammer, der
 // Waehler hiesse "@media screen" - und die erste Regel darin bliebe
 // ungeprueft. Seit v3.154 steht ein ganzer Block in @media screen.
 const cssQ=fs.readFileSync("css/05-ansicht2.css","utf8")
  .replace(/\/\*[\s\S]*?\*\//g,"").replace(/@media[^{]*\{/g,"");
 const lose=[];
 cssQ.split("}").forEach(bl=>{
  const i=bl.indexOf("{"); if(i<0)return;
  const sel=bl.slice(0,i).trim();
  if(!sel||sel.startsWith("@"))return;
  sel.split(",").forEach(s=>{s=s.trim();
   if(s&&!/#a2/.test(s)&&!/\.a2-/.test(s))lose.push(s)});
 });
 p(lose.length===0,"F3 keine Stilregel wirkt ohne den Schalter",lose);

 // Die neuen Dateien muessen in der App-Shell des Service Workers stehen -
 // sonst fehlen sie ohne Verbindung.
 const swQ=fs.readFileSync("sw.js","utf8");
 p(swQ.includes('"./js/70-ansicht2.js"')&&swQ.includes('"./css/05-ansicht2.css"'),
   "F4 beide neuen Dateien stehen in der App-Shell");

 p(fehler.length===0,"F5 keine Javascript-Fehler",fehler);

 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
