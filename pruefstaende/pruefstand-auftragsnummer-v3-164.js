// Prueft v3.164: Eine Auftrags-Nr. darf es je Firma nur EINMAL geben.
//
// WORUM ES GEHT
// Eine Auftrags-Nr. bezeichnet genau einen Auftrag. Wurde dieselbe Nummer
// zweimal angelegt, verteilen sich Massaufnahmen, Rapporte und Ausmasse
// auf zwei Projekte - und niemand merkt es, bis auf der Baustelle die
// Haelfte fehlt. Deshalb wird die Doppelung verhindert, BEVOR gespeichert
// wird, und der Anwender erfaehrt, zu welchem Projekt die Nummer gehoert.
//
// ZWEI STUFEN - UND WARUM BEIDE NOETIG SIND
//   1. Die Datenbank: eindeutiger Index projects_firma_auftragsnr_eindeutig
//      auf (company_id, lower(btrim(order_no))). NUR DAS ist die
//      verbindliche Sperre. Sie greift auch, wenn zwei Geraete im selben
//      Moment speichern oder wenn die Projektliste auf einem Geraet
//      veraltet ist. Ein Pruefstand im Browser kann sie nicht ausfuehren -
//      sie wurde gegen die echte Datenbank in einer sich selbst
//      zuruecknehmenden Transaktion nachgewiesen (gleiche Nummer blockiert,
//      gleiche Nummer mit Leerzeichen/Grossschreibung blockiert, gleiche
//      Nummer in einer ANDEREN Firma erlaubt).
//   2. Die Oberflaeche: die freundliche Vorstufe, die das bestehende
//      Projekt benennt. Sie ist NICHT die Sperre - Abschnitt G sichert
//      deshalb strukturell ab, dass der Rueckfall auf die Datenbank an
//      beiden Speicherwegen erhalten bleibt.
//
// WAS HIER GEPRUEFT WIRD
//   A  auftragsNrSchluessel() - die Normalisierung, exakt wie im Index.
//   B  projektMitAuftragsNr() - findet das bestehende Projekt, nimmt das
//      gerade bearbeitete aus, zaehlt archivierte MIT.
//   C  auftragsNrBelegtText() - nennt das Projekt, kennzeichnet
//      archiviert und "wartet auf die Uebertragung".
//   D  auftragsNrKonfliktText() - uebersetzt die Meldung der Datenbank.
//      D3/D4 sind die Gegenproben: andere Fehler werden NICHT geschluckt.
//   E  Projekt anlegen (js/09): doppelte Nummer -> Warnung, nichts wird
//      geschrieben. E3 ist die Gegenprobe mit einer freien Nummer.
//   F  Stammdaten bearbeiten (js/24): das Projekt kollidiert nicht mit
//      sich selbst (F1), fremde Nummer wird abgelehnt (F2).
//   G  Der Rueckfall auf die Datenbank steht an allen drei Schreibwegen
//      (Anlegen, Stammdaten, Warteschlange) - strukturell geprueft, damit
//      ihn niemand spaeter als "doppelt" entfernt.
//   H  Die Warteschlange uebersetzt den Konflikt beim Senden.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-auftragsnummer-v3-164.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile,{id:"u2",first_name:"Beat",last_name:"Krebs",role:"employee"}];
  meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice().map(x=>({...x}));
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  // Meldungen einsammeln statt sie wegzuklicken - der TEXT ist hier der
  // eigentliche Gegenstand der Pruefung.
  window.__meldungen=[];
  window.alert=(t)=>{window.__meldungen.push(String(t))};
 });
 await page.waitForTimeout(300);

 // ---- A  Die Normalisierung ----------------------------------------------
 // Muss exakt dem Index entsprechen: lower(btrim(order_no)).
 const A=await page.evaluate(()=>({
  schlicht:   auftragsNrSchluessel("176712"),
  raender:    auftragsNrSchluessel("  176712  "),
  gross:      auftragsNrSchluessel("A-77"),
  klein:      auftragsNrSchluessel("a-77"),
  leer:       auftragsNrSchluessel("   "),
  nichts:     auftragsNrSchluessel(null),
  zahl:       auftragsNrSchluessel(176712),
  // Gegenprobe: unterschiedliche Nummern bleiben unterschiedlich.
  anders:     auftragsNrSchluessel("176713")
 }));
 p(A.schlicht==="176712"&&A.raender==="176712",
   "A1 Rand-Leerzeichen zaehlen nicht mit",A);
 p(A.gross===A.klein&&A.gross==="a-77",
   "A2 Gross- und Kleinschreibung meinen dieselbe Nummer",A);
 p(A.leer===""&&A.nichts==="",
   "A3 leer und 'nicht gesetzt' ergeben denselben leeren Schluessel",A);
 p(A.zahl==="176712","A4 eine Nummer als Zahl ergibt denselben Schluessel wie als Text",A);
 p(A.anders!==A.schlicht,"A5 verschiedene Nummern bleiben verschieden",A);

 // ---- B  Das bestehende Projekt finden ------------------------------------
 const B=await page.evaluate(()=>{
  allProjects=[
   {id:1,name:"Sanierung Dach Nord",object:"Bahnhofstrasse 12",order_no:"2026-118",archived:false},
   {id:2,name:"Neubau",object:"Sonnhaldenweg 4",order_no:"2026-124",archived:false},
   {id:3,name:"Altbau",object:"Rosenweg 8",order_no:"2026-099",archived:true},
   {id:4,name:"Ohne Nummer",object:"Feldweg 1",order_no:"",archived:false}
  ];
  return {
   treffer:      (projektMitAuftragsNr("2026-118")||{}).id,
   normalisiert: (projektMitAuftragsNr("  2026-118 ")||{}).id,
   // Das Projekt, das gerade bearbeitet wird, kollidiert nicht mit sich selbst.
   selbst:        projektMitAuftragsNr("2026-118",1),
   selbstAlsText: projektMitAuftragsNr("2026-118","1"),
   // ... wohl aber mit einem ANDEREN.
   fremd:        (projektMitAuftragsNr("2026-118",2)||{}).id,
   // Archivierte zaehlen mit: die Nummer bleibt belegt.
   archiviert:   (projektMitAuftragsNr("2026-099")||{}).id,
   frei:          projektMitAuftragsNr("2026-500"),
   // Eine leere Eingabe darf nicht auf das Projekt ohne Nummer zeigen.
   leer:          projektMitAuftragsNr(""),
   leerRaender:   projektMitAuftragsNr("   ")
  };
 });
 p(B.treffer===1&&B.normalisiert===1,
   "B1 die belegte Nummer wird gefunden, auch mit Leerzeichen",B);
 p(B.selbst===null&&B.selbstAlsText===null,
   "B2 ein Projekt kollidiert nicht mit sich selbst (Id als Zahl und als Text)",B);
 p(B.fremd===1,"B3 ein ANDERES Projekt mit derselben Nummer wird sehr wohl gefunden",B);
 p(B.archiviert===3,"B4 archivierte Projekte halten ihre Nummer belegt",B);
 p(B.frei===null,"B5 eine freie Nummer meldet keinen Treffer",B);
 p(B.leer===null&&B.leerRaender===null,
   "B6 eine leere Eingabe trifft NICHT das Projekt ohne Nummer",B);

 // ---- C  Der Warntext -----------------------------------------------------
 const C=await page.evaluate(()=>({
  normal:  auftragsNrBelegtText("2026-118",{id:1,name:"Sanierung Dach Nord",object:"Bahnhofstrasse 12",archived:false}),
  archiv:  auftragsNrBelegtText("2026-099",{id:3,name:"Altbau",object:"Rosenweg 8",archived:true}),
  wartet:  auftragsNrBelegtText("2026-500",{id:"tmp-x",name:"Neu",object:"Feldweg 1",wartet:true}),
  nackt:   auftragsNrBelegtText("2026-118",{id:9})
 }));
 p(/2026-118/.test(C.normal)&&/Bahnhofstrasse 12/.test(C.normal)&&/Sanierung Dach Nord/.test(C.normal),
   "C1 der Text nennt die Nummer UND das Projekt, das sie hat",C.normal);
 p(/schon/.test(C.normal)&&/nur einmal/.test(C.normal),
   "C2 und sagt, dass das Projekt bereits besteht",C.normal);
 p(/archiviert/.test(C.archiv),"C3 ein archiviertes Projekt wird als solches gekennzeichnet",C.archiv);
 p(/Übertragung/.test(C.wartet),
   "C4 ein noch nicht gesendetes Projekt ebenfalls - sonst sucht man es vergeblich",C.wartet);
 p(/9/.test(C.nackt),"C5 ohne Name und Adresse bleibt wenigstens die Projektnummer stehen",C.nackt);

 // ---- D  Die Meldung der Datenbank uebersetzen ----------------------------
 const D=await page.evaluate(()=>({
  echt: auftragsNrKonfliktText({code:"23505",
    message:'duplicate key value violates unique constraint "projects_firma_auftragsnr_eindeutig"'}),
  imDetail: auftragsNrKonfliktText({code:"23505",message:"duplicate key",
    details:'Key (company_id, lower(btrim(order_no)))=(...) already exists. projects_firma_auftragsnr_eindeutig'}),
  // Gegenproben - hier darf NICHTS uebersetzt werden, sonst verschwaende
  // ein echter Fehler hinter einer falschen Erklaerung.
  andereEindeutigkeit: auftragsNrKonfliktText({code:"23505",
    message:'duplicate key value violates unique constraint "materials_pkey"'}),
  andererFehler: auftragsNrKonfliktText({code:"42501",message:"permission denied"}),
  ohneFehler: auftragsNrKonfliktText(null)
 }));
 p(typeof D.echt==="string"&&/bereits vergeben/.test(D.echt),
   "D1 der rohe Postgres-Text wird zu einer lesbaren Meldung",D);
 p(typeof D.imDetail==="string","D2 auch wenn der Indexname erst in details steht",D);
 p(D.andereEindeutigkeit===null,
   "D3 Gegenprobe: eine ANDERE Eindeutigkeit wird nicht als Auftrags-Nr. erklaert",D);
 p(D.andererFehler===null&&D.ohneFehler===null,
   "D4 Gegenprobe: andere Fehler werden nicht geschluckt",D);

 // ---- E  Projekt anlegen --------------------------------------------------
 const E=await page.evaluate(async()=>{
  allProjects=[{id:1,name:"Sanierung Dach Nord",object:"Bahnhofstrasse 12",
                order_no:"2026-118",archived:false}];
  window.__meldungen=[];
  // Die Nutzlast einsammeln statt sie zu erraten.
  const geschrieben=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{const bau=alt(t);const i=bau.insert.bind(bau);
   bau.insert=(n)=>{geschrieben.push({tabelle:t,nutzlast:n});return i(n)};return bau};

  const fuellen=(nr)=>{
   $("newProjectName").value="Zweitversuch";
   $("newProjectOrderNo").value=nr;
   $("newProjectObject").value="Bahnhofstrasse 12";
   $("newProjectCustomer").value="";
  };
  // 1) exakt dieselbe Nummer
  fuellen("2026-118"); $("addProject").click();
  await new Promise(f=>setTimeout(f,350));
  const nachGleich={meldungen:window.__meldungen.slice(),geschrieben:geschrieben.length};
  // 2) dieselbe Nummer, nur anders geschrieben
  fuellen("  2026-118  "); $("addProject").click();
  await new Promise(f=>setTimeout(f,350));
  const nachVariante={meldungen:window.__meldungen.slice(),geschrieben:geschrieben.length};
  // 3) Gegenprobe: eine freie Nummer muss durchgehen
  fuellen("2026-777"); $("addProject").click();
  await new Promise(f=>setTimeout(f,350));
  const nachFrei={meldungen:window.__meldungen.slice(),geschrieben:geschrieben.slice()};
  sb.from=alt;
  return {nachGleich,nachVariante,nachFrei};
 });
 p(E.nachGleich.geschrieben===0&&E.nachGleich.meldungen.length===1
   &&/Bahnhofstrasse 12/.test(E.nachGleich.meldungen[0]),
   "E1 doppelte Nummer: es wird NICHTS geschrieben, und die Meldung nennt das Projekt",E.nachGleich);
 p(E.nachVariante.geschrieben===0&&E.nachVariante.meldungen.length===2,
   "E2 dieselbe Nummer mit Leerzeichen wird ebenfalls abgelehnt",E.nachVariante);
 p(E.nachFrei.geschrieben.length===1
   &&E.nachFrei.geschrieben[0].tabelle==="projects"
   &&E.nachFrei.geschrieben[0].nutzlast.order_no==="2026-777"
   &&E.nachFrei.meldungen.length===2,
   "E3 Gegenprobe: eine freie Nummer wird ohne Warnung angelegt",E.nachFrei);

 // ---- F  Stammdaten bearbeiten -------------------------------------------
 const F=await page.evaluate(async()=>{
  allProjects=[
   {id:1,name:"Sanierung Dach Nord",object:"Bahnhofstrasse 12",customer:"",
    order_no:"2026-118",archived:false,zugeteilt_an:[],hinweis:null},
   {id:2,name:"Neubau",object:"Sonnhaldenweg 4",customer:"",
    order_no:"2026-124",archived:false,zugeteilt_an:[],hinweis:null}
  ];
  const geschrieben=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{const bau=alt(t);const u=bau.update.bind(bau);
   bau.update=(n)=>{geschrieben.push(n);return u(n)};return bau};

  cockpitProjectId=1;
  renderCockpitStammdaten();
  // 1) die EIGENE Nummer unveraendert speichern - darf nicht meckern
  $("cockpitName").value="Sanierung Dach Nord neu";
  $("cockpitOrderNo").value="2026-118";
  $("cockpitObject").value="Bahnhofstrasse 12";
  $("cockpitSaveStammdaten").click();
  await new Promise(f=>setTimeout(f,350));
  const eigen={geschrieben:geschrieben.length,
               text:$("cockpitStammdatenMsg").textContent,
               farbe:$("cockpitStammdatenMsg").style.color};
  // 2) die Nummer eines ANDEREN Projekts uebernehmen
  $("cockpitOrderNo").value="2026-124";
  $("cockpitSaveStammdaten").click();
  await new Promise(f=>setTimeout(f,350));
  const fremd={geschrieben:geschrieben.length,
               text:$("cockpitStammdatenMsg").textContent,
               farbe:$("cockpitStammdatenMsg").style.color};
  sb.from=alt;
  return {eigen,fremd};
 });
 p(F.eigen.geschrieben===1&&/gespeichert/.test(F.eigen.text),
   "F1 die eigene Nummer unveraendert zu speichern ist kein Konflikt",F.eigen);
 p(F.fremd.geschrieben===1&&/Sonnhaldenweg 4/.test(F.fremd.text),
   "F2 die Nummer eines anderen Projekts wird abgelehnt - ohne zu schreiben",F.fremd);
 p(/red/.test(F.fremd.farbe),"F3 und die Ablehnung ist als solche zu erkennen",F.fremd);

 // ---- G  Der Rueckfall auf die Datenbank bleibt erhalten ------------------
 // Die Vorpruefung in der Oberflaeche ist NICHT die Sperre: sie sieht eine
 // veraltete Projektliste nicht und zwei gleichzeitige Speicherungen auch
 // nicht. Wer sie fuer ausreichend haelt und den Rueckfall entfernt, macht
 // aus der Sperre eine Bitte. Deshalb wird er hier festgehalten.
 const quellen={
  anlegen:   fs.readFileSync(path.join(process.cwd(),"js/09-projekte.js"),"utf8"),
  stammdaten:fs.readFileSync(path.join(process.cwd(),"js/24-projekt-cockpit.js"),"utf8"),
  schlange:  fs.readFileSync(path.join(process.cwd(),"js/43-warteschlange.js"),"utf8"),
  basis:     fs.readFileSync(path.join(process.cwd(),"js/01-basis.js"),"utf8")
 };
 p(/auftragsNrKonfliktText\(error\)/.test(quellen.anlegen),
   "G1 Anlegen faellt auf die Meldung der Datenbank zurueck");
 p(/auftragsNrKonfliktText\(error\)/.test(quellen.stammdaten),
   "G2 Stammdaten bearbeiten ebenfalls");
 p(/auftragsNrKonfliktText\(error\)/.test(quellen.schlange),
   "G3 und die Warteschlange beim Senden");
 p(/projects_firma_auftragsnr_eindeutig/.test(quellen.basis),
   "G4 der Name des eindeutigen Index steht dokumentiert im Code");
 p(/lower\(btrim\(order_no\)\)/.test(quellen.basis),
   "G5 samt der Normalisierung, die er verwendet - Oberflaeche und Datenbank urteilen gleich");

 // ---- H  Die Warteschlange beim Senden ------------------------------------
 const H=await page.evaluate(async()=>{
  const alt=sb.from.bind(sb);
  const fehlerAntwort=(f)=>({
   insert(){return this}, select(){return this},
   maybeSingle(){return Promise.resolve({data:null,error:f})}
  });
  let raus={};
  sb.from=()=>fehlerAntwort({code:"23505",
   message:'duplicate key value violates unique constraint "projects_firma_auftragsnr_eindeutig"'});
  raus.konflikt=await wsSendeEinen({tabelle:"projects",art:"insert",
   payload:{name:"Neu",order_no:"2026-118",object:"Bahnhofstrasse 12"},
   erstellt:"2026-09-23T08:00:00Z"});
  // Gegenprobe: ein anderer Fehler behaelt seinen eigenen Text.
  sb.from=()=>fehlerAntwort({code:"42501",message:"permission denied for table projects"});
  raus.anderer=await wsSendeEinen({tabelle:"projects",art:"insert",
   payload:{name:"Neu",order_no:"2026-999",object:"Feldweg 1"},
   erstellt:"2026-09-23T08:00:00Z"});
  sb.from=alt;
  return raus;
 });
 p(H.konflikt.status==="fehler"&&/bereits vergeben/.test(H.konflikt.fehler),
   "H1 die Warteschlange meldet den Konflikt lesbar statt roh",H);
 p(H.konflikt.status==="fehler",
   "H2 der Eintrag gilt als fehlgeschlagen - er bleibt in der Warteschlange stehen",H);
 p(H.anderer.status==="fehler"&&/permission denied/.test(H.anderer.fehler),
   "H3 Gegenprobe: ein anderer Fehler behaelt seinen eigenen Text",H);

 p(fehler.length===0,"I1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
