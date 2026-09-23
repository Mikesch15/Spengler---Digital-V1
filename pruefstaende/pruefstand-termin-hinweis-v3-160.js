// Prueft v3.160: zwei neue Angaben, die bis hierher fehlten.
//
// WORUM ES GEHT
//   1) Die Startseite zeigte unter "Anstehende Montage" bewusst KEIN
//      geplantes Datum - die Datenbank fuehrte keines. Jetzt gibt es
//      measurements.montage_am.
//   2) Es gab keinen Ort fuer eine freie Notiz zum Projekt
//      ("Baustellenzufahrt nur bis 16:00 Uhr"). Jetzt gibt es
//      projects.hinweis.
//
// WAS HIER GEPRUEFT WIRD
//   A  montageTermin() (js/01) - die EINE Rechnung hinter jedem "morgen".
//      Inklusive der Zeitumstellung: ueber die Nacht der Umstellung hinweg
//      muss "morgen" morgen bleiben. Mit new Date("2026-03-29") statt der
//      Zahlenform waere genau das falsch.
//   B  Das Feld "Montage geplant am" erscheint dort, wo geplant wird - und
//      NICHT vorher (in Bearbeitung) und nicht mehr nachher (abgeschlossen).
//      B4 ist die Rechte-Gegenprobe.
//   C  DER WICHTIGSTE VERTRAG: der Termin schreibt ausschliesslich
//      montage_am. Wuerde er eine Workflow-Spalte mitschreiben, wiese der
//      Trigger den Schreibvorgang ab - und ein verschobener Termin duerfte
//      unter keinen Umstaenden eine Freigabe verfallen lassen.
//   D  Der Hinweis auf der Startseite und auf der Projektseite - und die
//      Gegenprobe: ohne Notiz entsteht kein leerer Abschnitt.
//   E  Das Eingabefeld in den Stammdaten wird gefuellt und mitgespeichert;
//      leer wird zu null, nicht zu einem Leerstring.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-termin-hinweis-v3-160.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 // timezoneId: sonst laeuft der Browser im Container auf UTC, und die
 // Zeitumstellung (A5) gaebe es gar nicht zu pruefen. Die App laeuft auf
 // Schweizer Geraeten - also wird hier auch so gemessen.
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH",
   timezoneId:"Europe/Zurich"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile,{id:"u2",first_name:"Beat",last_name:"Krebs",role:"employee"}];
  meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice();
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink"}];
  blechRollenbreiten=[1000,670,500];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
  a2Setzen(true);
 });
 await page.waitForTimeout(400);

 // ---- A  Die eine Rechnung -----------------------------------------------
 const A=await page.evaluate(()=>{
  const h="2026-09-23T10:00:00";
  const w=(d,heute)=>{const r=montageTermin(d,heute||h);return r?r.wort:null};
  return {
   heute:w("2026-09-23"), morgen:w("2026-09-24"), uebermorgen:w("2026-09-25"),
   drei:w("2026-09-26"), gestern:w("2026-09-22"), vorDrei:w("2026-09-20"),
   leer:montageTermin(""), unsinn:montageTermin("morgen früh"),
   // Spaet am Abend ist morgen immer noch morgen: gerechnet wird in
   // Kalendertagen, nicht in 24-Stunden-Abstaenden.
   spaet:w("2026-09-24","2026-09-23T23:30:00"),
   // Die Zeitumstellung. Am Sonntag, 29.3.2026 wird in der Schweiz um
   // 02:00 auf Sommerzeit gestellt. Der Sprung liegt damit IN diesem Tag:
   // zwischen Mitternacht des 29. und Mitternacht des 30. liegen nur 23
   // echte Stunden (nachgemessen im Browser, nicht geschaetzt - die
   // Mitternacht des 29. ist noch Winterzeit). Wer hier Math.floor statt
   // Math.round rechnet, bekommt 0 heraus und nennt morgen "heute".
   umstellung:w("2026-03-30","2026-03-29T12:00:00"),
   ueberfaellig:montageTermin("2026-09-22",h).ueberfaellig,
   nichtUeberfaellig:montageTermin("2026-09-23",h).ueberfaellig,
   datum:montageTermin("2026-09-24",h).datum
  };
 });
 p(A.heute==="heute"&&A.morgen==="morgen"&&A.uebermorgen==="übermorgen"&&A.drei==="in 3 Tagen",
   "A1 heute / morgen / übermorgen / in 3 Tagen",A);
 p(A.gestern==="gestern"&&A.vorDrei==="vor 3 Tagen",
   "A2 ein vergangener Termin wird auch so benannt",A);
 p(A.leer===null&&A.unsinn===null,
   "A3 ohne oder mit unbrauchbarem Wert kommt null - es wird nichts erfunden",A);
 p(A.spaet==="morgen","A4 um 23:30 Uhr ist morgen immer noch morgen",A);
 p(A.umstellung==="morgen","A5 auch ueber die Zeitumstellung hinweg",A);
 p(A.ueberfaellig===true&&A.nichtUeberfaellig===false,
   "A6 ueberfaellig ist nur, was wirklich vorbei ist",A);
 p(A.datum==="24.9.2026","A7 das Datum in Schweizer Schreibweise",A);

 // ---- B  Das Feld im Arbeitsstatus ---------------------------------------
// Planen darf, wer zuweisen darf: der Aufnehmer oder ein Administrator
 // (mwDarfZuweisen -> isAdmin, js/01 - und das liest currentProfile.role,
 // nicht meineRechte; das erste Mass hier war deshalb falsch und meldete
 // einen Fehler, der keiner war).
 const karte=(status,alsAdmin)=>page.evaluate(([s,admin])=>{
  currentProfile.role=admin?"admin":"employee";
  mwStandAusZeile({id:11,project_id:1,type:"einlaufblech_gerade",title:"Test",
   created_by:admin?"u1":"u2",workflow_status:s,monteur_id:"u2",
   montage_am:(s==="montiert"||s==="abgeschlossen")?"2026-09-24":null});
  renderMeasWorkflow();
  const feld=$("mwMontageAm");
  const box=document.querySelector("#measWorkflowBereich .mw-termin");
  return {feld:!!feld, box:!!box,
          nachlese:/Montage geplant war/.test($("measWorkflowBereich").textContent)};
 },[status,alsAdmin!==false]);

 let r=await karte("in_bearbeitung");
 p(!r.feld,"B1 in Bearbeitung: noch kein Termin - es ist noch nichts freigegeben",r);
 for(const s of ["freigegeben","zu_ruesten","geruestet","zu_montieren"]){
  r=await karte(s);
  p(r.feld&&r.box,"B2 "+s+": der Termin laesst sich eintragen",r);
 }
 r=await karte("abgeschlossen");
 p(!r.feld&&r.nachlese,
   "B3 abgeschlossen: kein Eingabefeld mehr, der geplante Tag bleibt als Angabe",r);
 r=await karte("zu_montieren",false);
 p(!r.feld,"B4 Gegenprobe: wer nicht einteilen darf, plant auch keinen Tag",r);

 // ---- C  Geschrieben wird NUR montage_am ---------------------------------
 const C=await page.evaluate(async()=>{
  currentProfile.role="admin";
  // id 11 gibt es in den Demodaten. Das ist nicht kosmetisch: die App
  // prueft nach dem Schreiben, ob wirklich eine Zeile betroffen war (von
  // RLS blockierte UPDATEs melden keinen Fehler, sie treffen still null
  // Zeilen). Mit einer erfundenen Id wuerde genau diese Pruefung
  // anschlagen - richtigerweise.
  mwStandAusZeile({id:11,project_id:1,type:"einlaufblech_gerade",title:"Test",
   created_by:"u1",workflow_status:"zu_montieren",monteur_id:"u2",montage_am:null});
  renderMeasWorkflow();
  const geschrieben=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{
   const bau=alt(t);
   const u=bau.update.bind(bau);
   bau.update=(nutzlast)=>{geschrieben.push({tabelle:t,nutzlast});return u(nutzlast)};
   return bau;
  };
  // Die Attrappe liefert nach dem Schreiben die Zeile aus __demo zurueck.
  // Sie bekommt hier BEWUSST einen anderen Tag als das Eingabefeld: damit
  // prueft C4, dass die App den Wert aus der ANTWORT DER DATENBANK
  // uebernimmt und nicht den, den sie selbst gerade hingeschrieben hat.
  // Genau das ist der Unterschied zwischen "gespeichert" und "abgeschickt".
  const zeile=window.__demo.measurements.find(m=>m.id===11);
  zeile.montage_am="2026-09-25";
  $("mwMontageAm").value="2026-09-24";
  $("mwMontageSpeichern").click();
  await new Promise(f=>setTimeout(f,400));
  sb.from=alt;
  return {geschrieben, stand:mwStand.montage_am, imFeld:"2026-09-24"};
 });
 const nutz=C.geschrieben[0]||{};
 const felder=Object.keys(nutz.nutzlast||{});
 p(C.geschrieben.length===1&&nutz.tabelle==="measurements",
   "C1 genau ein Schreibvorgang, auf measurements",C.geschrieben);
 p(felder.length===1&&felder[0]==="montage_am",
   "C2 geschrieben wird AUSSCHLIESSLICH montage_am - keine Workflow-Spalte",felder);
 const verboten=["workflow_status","freigabe_verfallen","freigegeben_von","freigegeben_am",
  "ruester_id","monteur_id","geruestet_am","montiert_am","data","type","project_id",
  "staerke_mm","zuschnitt_form"];
 p(verboten.every(f=>felder.indexOf(f)<0),
   "C3 keines der Felder, das eine Freigabe verfallen liesse oder der Trigger sperrt",felder);
 p(C.stand==="2026-09-25",
   "C4 uebernommen wird die Antwort der Datenbank, nicht der Inhalt des Feldes",C);

 // Entfernen schreibt null - nicht einen Leerstring, den kein date-Feld kennt.
 const C2=await page.evaluate(async()=>{
  const geschrieben=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{const bau=alt(t);const u=bau.update.bind(bau);
   bau.update=(n)=>{geschrieben.push(n);return u(n)};return bau};
  const knopf=$("mwMontageEntfernen");
  if(knopf)knopf.click();
  await new Promise(f=>setTimeout(f,400));
  sb.from=alt;
  return {da:!!knopf, geschrieben};
 });
 p(C2.da&&C2.geschrieben.length===1&&C2.geschrieben[0].montage_am===null,
   "C5 'Termin entfernen' schreibt null, keinen Leerstring",C2);

 // ---- D  Der Hinweis in der Ansicht --------------------------------------
 const koepfe=()=>page.evaluate(()=>
  [...document.querySelectorAll("#a2Inhalt .a2-abschnitt-kopf h2")]
   .map(h=>h.textContent.replace(/\s+/g," ").trim().replace(/ i$/,"")));
 await page.evaluate(()=>{
  allProjects.forEach(p=>{p.hinweis=null});
  a2Zustand.bereich=null; a2Zustand.seite="heute"; a2Zeichnen();
 });
 await page.waitForTimeout(300);
 let k=await koepfe();
 p(k.indexOf("Wichtige Hinweise")<0,
   "D1 Gegenprobe: ohne Notiz gibt es den Abschnitt gar nicht",k);
 const D2=await page.evaluate(()=>{
  const p0=allProjects.find(x=>!x.archived&&x.status!=="abgeschlossen"&&x.status!=="storniert");
  p0.hinweis="Baustellenzufahrt nur bis 16:00 Uhr";
  a2Zeichnen();
  const ab=[...document.querySelectorAll("#a2Inhalt .a2-abschnitt")]
   .find(a=>/Wichtige Hinweise/.test(a.textContent));
  const z=ab&&ab.querySelector(".a2-zeile");
  return {id:p0.id, text:z?z.textContent.replace(/\s+/g," ").trim():"",
          fuehrt:z?z.getAttribute("data-a2-projekt"):""};
 });
 p(/Baustellenzufahrt nur bis 16:00 Uhr/.test(D2.text),
   "D2 mit Notiz steht sie oben auf der Startseite",D2);
 p(String(D2.fuehrt)===String(D2.id),
   "D3 und die Zeile fuehrt in genau dieses Projekt",D2);
 // Leerzeichen sind keine Notiz.
 const D4=await page.evaluate(()=>{
  const p0=allProjects.find(x=>x.hinweis);
  p0.hinweis="   ";
  a2Zeichnen();
  return [...document.querySelectorAll("#a2Inhalt .a2-abschnitt-kopf h2")]
   .map(h=>h.textContent.trim()).indexOf("Wichtige Hinweise");
 });
 p(D4<0,"D4 Gegenprobe: eine Notiz aus Leerzeichen zaehlt nicht als Notiz",D4);

 // Auf der Projektseite selbst.
 const D5=await page.evaluate(async()=>{
  const p0=allProjects.find(x=>!x.archived);
  p0.hinweis="Schlüssel beim Hauswart";
  a2Zustand.seite="projekt"; a2Zustand.projektId=p0.id; a2Zustand.reg="uebersicht";
  if(typeof a2ProjektLaden==="function")await a2ProjektLaden(p0.id);
  a2Zeichnen();
  await new Promise(f=>setTimeout(f,300));
  const kasten=document.querySelector("#a2Inhalt .a2-h-merk");
  return {da:!!kasten, text:kasten?kasten.textContent.replace(/\s+/g," ").trim():""};
 });
 p(D5.da&&/Schlüssel beim Hauswart/.test(D5.text),
   "D5 die Projektseite zeigt die Notiz als eigenen Kasten",D5);
 const D6=await page.evaluate(()=>{
  const p0=allProjects.find(x=>x.hinweis);
  p0.hinweis=null; a2Zeichnen();
  return !!document.querySelector("#a2Inhalt .a2-h-merk");
 });
 p(!D6,"D6 Gegenprobe: ohne Notiz steht dort kein leerer Kasten",D6);

 // ---- E  Das Eingabefeld in den Stammdaten -------------------------------
 const E=await page.evaluate(async()=>{
  const p0=allProjects.find(x=>!x.archived);
  p0.hinweis="Zufahrt eng, kein Lastwagen";
  cockpitProjectId=p0.id;
  renderCockpitStammdaten();
  const gefuellt=$("cockpitHinweis")?$("cockpitHinweis").value:null;
  // Speichern: die Nutzlast einsammeln, statt sie zu erraten.
  const geschrieben=[];
  const alt=sb.from.bind(sb);
  sb.from=(t)=>{const bau=alt(t);const u=bau.update.bind(bau);
   bau.update=(n)=>{geschrieben.push({t,n});return u(n)};return bau};
  $("cockpitHinweis").value="Neue Notiz";
  $("cockpitSaveStammdaten").click();
  await new Promise(f=>setTimeout(f,400));
  $("cockpitHinweis").value="   ";
  $("cockpitSaveStammdaten").click();
  await new Promise(f=>setTimeout(f,400));
  sb.from=alt;
  return {gefuellt, geschrieben};
 });
 p(E.gefuellt==="Zufahrt eng, kein Lastwagen",
   "E1 das Feld wird aus dem Projekt gefuellt",E.gefuellt);
 p(E.geschrieben.length===2&&E.geschrieben[0].n.hinweis==="Neue Notiz",
   "E2 beim Speichern geht die Notiz mit",E.geschrieben);
 p(E.geschrieben[1]&&E.geschrieben[1].n.hinweis===null,
   "E3 leer wird zu null, nicht zu einem Leerstring",E.geschrieben);

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
