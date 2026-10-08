// Prueft den Umbau von v3.156.
//
// WORUM ES GEHT
// Bis v3.155 oeffneten Werkstatt, Lager, Suche, Einstellungen, Feedback, die
// Admin-Uebersicht, die System-Administration, Material & Zuschnitt und das
// Cockpit als klassisches Vollbild UEBER der neuen Ansicht. Ein .modal ist
// position:fixed/inset:0/z-index 500 und legt sich damit ueber die Kopfzeile
// (40) und ueber die untere Leiste (50). Wer auf "Werkstatt" tippte, sah den
// alten Seitenaufbau - und die Leiste, ueber die er gekommen war, war weg.
// Gemeldet hat das der Anwender; nachgemessen wurde es mit derselben Methode,
// die hier steht: elementFromPoint auf die Mitte der Leiste.
//
// WAS HIER GEPRUEFT WIRD
//   A  Die BEREICHE bleiben im Rahmen: Leiste sichtbar und bedienbar, Kopf
//      nennt den Bereich, sein Eintrag ist markiert.
//
//      A6 war bis v3.161 die Gegenprobe dazu: ein ERFASSUNGSFORMULAR
//      bleibt Vollbild. Das war ausdrueckliche Absicht ("wer ein Mass
//      eintraegt, ist in einer Aufgabe"). Der Anwender hat das in v3.162
//      verworfen - "das darf niergends mehr so sein" -, und damit ist
//      diese Zusicherung nicht mehr der Vertrag. Sie wird deshalb
//      UMGESTELLT, nicht geloescht: A6 verlangt jetzt das Gegenteil,
//      naemlich dass auch das Formular die Leiste stehen laesst.
//      Die Aufgabe der alten Gegenprobe - zu verhindern, dass blind jedes
//      .modal umgestellt wird - uebernimmt A6b: ein kleiner DIALOG
//      (Typwahl) liegt weiterhin ueber allem. Ohne ihn waere A1 bis A6
//      auch dann gruen, wenn jemand pauschal jedes .modal anfasst.
//   B  "Neues Projekt" zeigt nur das Anlegen-Formular, nicht noch einmal
//      die Projektliste, von der man gerade kam. B2/B3 sind die
//      Gegenproben: der Archiv-Weg zeigt umgekehrt die Liste ohne das
//      Formular, und die klassische Ansicht zeigt unveraendert beides.
//   C  Der Regierapport ist ein eigenes Register und steht nicht mehr
//      unter "Mehr …".
//   D  Der Ausdruck zeigt keinen Anfasser mehr. Ein textarea zeichnet in
//      Chrome unten rechts zwei Schraegstriche zum Groesserziehen; im
//      gedruckten Regierapport standen sie in "Auftraggeber" und
//      "Objekt / Gebaeudeteil". D2 ist die Gegenprobe: am Bildschirm
//      bleibt der Anfasser, dort gehoert er hin.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-bereiche-v3-156.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Liegt etwas ueber der Mitte der unteren Leiste? Genau das war der Fehler.
const rahmen=page=>page.evaluate(()=>{
 const leiste=$("a2Leiste");
 const r=leiste?leiste.getBoundingClientRect():null;
 let verdeckt=false,durch="";
 if(r&&r.height>0){
  const oben=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
  if(oben&&!(oben===leiste||leiste.contains(oben))){
   verdeckt=true; const m=oben.closest(".modal"); durch=m?m.id:(oben.id||oben.tagName);
  }
 }
 const auf=[...document.querySelectorAll("#a2Leiste [data-a2-tab].ist-auf")]
   .map(b=>b.getAttribute("data-a2-tab"));
 const kopf=$("a2Kopf")?$("a2Kopf").textContent.replace(/\s+/g," ").trim():"";
 return {leisteDa:!!r&&r.height>0,verdeckt,durch,markiert:auf,kopf};
});
const tab=(page,k)=>page.evaluate(k=>{
 const b=[...document.querySelectorAll("#a2Leiste [data-a2-tab])".replace(")",""))]
   .find(x=>x.getAttribute("data-a2-tab")===k);
 if(b)b.click(); return !!b;
},k);

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice();
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink"}];
  blechRollenbreiten=[1000,670,500];
  settings.rates=[["Meister",98]]; settings.employees=["Andrea Beispiel"];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  if(typeof werkstattKnopfAktualisieren==="function")werkstattKnopfAktualisieren();
  if($("navLagerverwaltung"))$("navLagerverwaltung").hidden=false;
  // Ohne diese Zeile ist der Abschnitt selbst versteckt (er haengt an
  // lagerverwaltungZugriff, js/68) - F1 saehe dann null Abschnitte und
  // waere gruen, ohne etwas geprueft zu haben.
  if($("lagerverwaltungSection"))$("lagerverwaltungSection").hidden=false;
  /* v3.218: Den Umschalter auf die neue Ansicht gibt es nicht mehr - es gibt nur diese eine. Gezeichnet werden muss sie weiterhin. */ if(typeof a2Zeichnen==="function")a2Zeichnen();
 });
 await page.waitForTimeout(400);
 const aufraeumen=async()=>{
  await page.evaluate(()=>{
   document.querySelectorAll(".modal").forEach(m=>{if(m.id!=="authScreen")m.hidden=true});
   if($("reportScreen"))$("reportScreen").hidden=true;
   $("startScreen").hidden=false;
   a2Zustand.bereich=null; a2Zustand.seite="heute"; a2Zustand.projektId=null; a2Zeichnen();
  });
  await page.waitForTimeout(200);
 };

 // ---- A  Bereiche bleiben im Rahmen --------------------------------------
 await tab(page,"werkstatt"); await page.waitForTimeout(900);
 let z=await rahmen(page);
 p(z.leisteDa&&!z.verdeckt,"A1 Werkstatt: die untere Leiste bleibt sichtbar und bedienbar",z);
 p(z.markiert.length===1&&z.markiert[0]==="werkstatt",
   "A2 Werkstatt: ihr Eintrag ist markiert, nicht die Seite dahinter",z.markiert);
 p(/Werkstatt/.test(z.kopf),"A3 Werkstatt: die Kopfzeile nennt den Bereich",z.kopf);

 await tab(page,"lager"); await page.waitForTimeout(900);
 z=await rahmen(page);
 p(z.leisteDa&&!z.verdeckt&&z.markiert[0]==="lager"&&/Lager/.test(z.kopf),
   "A4 Lager: eigener Bereich, Leiste bleibt, Kopfzeile nennt ihn",z);
 // Das Lager ist ein Bereich, keine Einstellungsseite.
 //
 // v3.251: Bis v3.250 fuehrte der Lager-Knopf in die EINSTELLUNGEN, und dort
 // musste ein Ausschnitt (a2-nur-lager) die Registerleiste und die beiden
 // Nachbarabschnitte wieder ausblenden - A5 und A5b prueften genau diesen
 // Ausschnitt. Mit der Abschaffung der alten Lagerverwaltung fuehrt der
 // Knopf ins Lieferanten-Lager, einen eigenen Schirm. Die Zusage ist
 // dieselbe und wird jetzt direkter gemessen: es sind gar keine
 // Einstellungen mehr im Spiel. Das ist der schaerfere Nachweis - ein
 // Ausschnitt kann luecken haben, ein nicht geoeffneter Schirm nicht.
 const lagerBereich=await page.evaluate(()=>({
  lief:!!$("liefModal")&&!$("liefModal").hidden,
  einstellungen:!!$("settingsModal")&&!$("settingsModal").hidden,
  bereich:a2Zustand.bereich?a2Zustand.bereich.id:null,
  // Und das Lager ist wirklich da, nicht nur sein Rahmen.
  arbeit:["liefEinscannen","liefAusscannen","liefSuche","liefListe"]
    .filter(i=>$(i)&&$(i).getBoundingClientRect().height>0)
 }));
 p(lagerBereich.lief&&lagerBereich.bereich==="liefModal",
   "A5 Lager: der Bereich IST das Lieferanten-Lager",lagerBereich);
 p(lagerBereich.einstellungen===false,
   "A5b GEGENPROBE: die Einstellungen sind dabei gar nicht offen - es braucht keinen Ausschnitt mehr, der sie zurechtschneidet",lagerBereich);
 p(lagerBereich.arbeit.length===4,
   "A5c und die Arbeitsteile des Lagers stehen im Rahmen: Ein-, Ausscannen, Suche, Liste",lagerBereich.arbeit);

 // v3.162: auch das Erfassungsformular laesst die Leiste stehen.
 await aufraeumen();
 await page.evaluate(()=>newMeasurementWithType("einlaufblech_gerade"));
 await page.waitForTimeout(700);
 z=await rahmen(page);
 p(z.leisteDa&&!z.verdeckt,
   "A6 auch das Massaufnahme-Formular laesst die Leiste sichtbar und bedienbar",z);

 // A6b ist die neue Gegenprobe an der Stelle der alten: ein DIALOG liegt
 // weiterhin ueber allem. Er muss das - wer eine Art auswaehlt, darf
 // daneben nicht die halbe Navigation bedienen koennen.
 await page.evaluate(()=>{
  if($("measTypeChooserModal"))$("measTypeChooserModal").hidden=false;
 });
 await page.waitForTimeout(300);
 z=await rahmen(page);
 p(z.verdeckt&&z.durch==="measTypeChooserModal",
   "A6b Gegenprobe: ein Dialog liegt weiterhin ueber der Leiste",z);
 await page.evaluate(()=>{
  if($("measTypeChooserModal"))$("measTypeChooserModal").hidden=true;
 });

 // Ein Tipp auf einen anderen Eintrag schliesst den offenen Bereich.
 await aufraeumen();
 await tab(page,"werkstatt"); await page.waitForTimeout(800);
 await tab(page,"heute"); await page.waitForTimeout(600);
 const zu=await page.evaluate(()=>({
  werkstattZu:$("werkstattModal").hidden,
  bereich:a2Zustand.bereich,seite:a2Zustand.seite}));
 p(zu.werkstattZu&&!zu.bereich&&zu.seite==="heute",
   "A7 ein Tipp auf einen anderen Eintrag schliesst den Bereich",zu);

 // ---- B  Neues Projekt zeigt nur das Formular ----------------------------
 await aufraeumen();
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-tu="neuesprojekt"]');if(k)k.click()});
 await page.waitForTimeout(800);
 const sicht=s=>page.evaluate(x=>{const e=document.querySelector(x);
  return !!e&&getComputedStyle(e).display!=="none"&&e.getBoundingClientRect().height>0},s);
 const anlegenDa=await sicht("#projectCreateBox"), listeDa=await sicht("#projectList");
 p(anlegenDa&&!listeDa,"B1 Neues Projekt: das Anlegen-Formular steht allein",
   {anlegen:anlegenDa,liste:listeDa});

 await aufraeumen();
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-tu="projektarchiv"]');if(k)k.click()});
 await page.waitForTimeout(800);
 const a2=await sicht("#projectCreateBox"), l2=await sicht("#projectList");
 p(!a2&&l2,"B2 Gegenprobe Archiv: dort steht die Liste ohne das Anlegen-Formular",
   {anlegen:a2,liste:l2});

 // v3.218: Bis v3.217 lief diese Gegenprobe ueber die klassische Ansicht
 // ("dort zeigt derselbe Schirm unveraendert beides"). Die gibt es nicht
 // mehr. Die Probe bleibt aber dieselbe Aussage: B1 und B2 duerfen nicht
 // daran liegen, dass der Schirm das eine oder andere ueberhaupt nicht
 // mehr hat - ohne die Marke steht beides da. Geoeffnet wird er ueber
 // denselben Weg wie in der Ansicht.
 await aufraeumen();
 // Die Marke des vorigen Schritts (a2-nur-liste aus B2) haengt noch am
 // Schirm - aufraeumen() blendet nur aus. Bis v3.217 fiel das nicht auf,
 // weil a2Setzen(false) die Marke ueber die Klasse a2-an wirkungslos
 // machte; ohne zweite Ansicht muss sie wirklich weg. Das tut die App an
 // dieser Stelle selbst (a2BereichMarkenWeg), also wird sie hier gerufen.
 await page.evaluate(()=>{
  if(typeof a2BereichMarkenWeg==="function")a2BereichMarkenWeg($("projectsModal"));
  $("startOpenProjects").click();
 });
 await page.waitForTimeout(800);
 const a3=await sicht("#projectCreateBox"), l3=await sicht("#projectList");
 p(a3&&l3,"B3 Gegenprobe: ohne Marke zeigt derselbe Schirm unveraendert beides",
   {anlegen:a3,liste:l3});
 // Und: den Weg zurueck in die alte Ansicht gibt es nicht mehr.
 const zurueck=await page.evaluate(()=>typeof a2Setzen==="function"||!!document.getElementById("a2Ein"));
 p(zurueck===false,"B3b es gibt keinen Umschalter in eine klassische Ansicht mehr",zurueck);
 await aufraeumen();

 // ---- C  Regierapport ist ein eigenes Register ---------------------------
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const zeile=document.querySelector("[data-a2-projekt]");if(zeile)zeile.click()});
 await page.waitForTimeout(1500);
 const reg=await page.evaluate(()=>[...document.querySelectorAll('#a2Inhalt [data-a2-reg]')]
   .map(x=>x.getAttribute("data-a2-reg")));
 p(reg.indexOf("rapport")>=0,"C1 der Regierapport ist ein eigenes Register",reg);
 // UMGESTELLT in v3.203. Bis dahin lautete die Zusicherung: "steht VOR
 // 'Mehr …', nicht darin". Den Sammelkuebel "Mehr …" gibt es auf der
 // Projektseite nicht mehr - seine Inhalte haben eigene Register bekommen
 // (Offerte, Dateien), weil zwei verschiedene Dinge gleich hiessen.
 // Der Vertrag wird dadurch STRENGER statt schwaecher: der Rapport steht
 // nicht mehr bloss vor dem Kuebel, es gibt gar keinen mehr, in dem er
 // verschwinden koennte. Die alte Fassung waere heute auch nicht mehr
 // aussagekraeftig - indexOf("mehr") ist -1, "rapport" steht davor, sie
 // haette sich selbst gruen gemeldet, ohne etwas zu pruefen.
 p(reg.indexOf("mehr")<0,
   "C2 auf der Projektseite gibt es keinen Sammelkuebel 'Mehr …' mehr",reg);
 const regNamen=await page.evaluate(()=>
  [...document.querySelectorAll('#a2Inhalt [data-a2-reg]')]
   .map(x=>String(x.textContent||"").trim().toLowerCase()));
 p(!regNamen.some(n=>n.indexOf("mehr")>=0),
   "C2b und auch keines, das so heisst - der Kuebel kommt nicht unter anderem Schluessel zurueck",regNamen);
 // C3 prueft weiter dasselbe wie bisher, nur nicht mehr an einem einzigen
 // Register: in KEINEM anderen Register darf die Rapportliste oder sein
 // Anlegen-Knopf stehen, sonst haette man ihn zweimal. Gesucht wird der
 // Knopf, nicht das Wort: "Regierapport" steht auch in der Registerleiste
 // darueber, die zu #a2Inhalt gehoert.
 const fremd=[];
 for(const k of reg){
  if(k==="rapport")continue;
  await page.evaluate(x=>{
   const b=document.querySelector('#a2Inhalt [data-a2-reg="'+x+'"]'); if(b)b.click();
  },k);
  await page.waitForTimeout(300);
  const da=await page.evaluate(()=>
   !!document.querySelector('#a2Inhalt [data-a2-tu="neuerrapport"]')
   ||!!document.querySelector('#a2Inhalt [data-a2-rep]'));
  if(da)fremd.push(k);
 }
 p(fremd.length===0,
   "C3 in keinem anderen Register steht seine Liste oder sein Anlegen-Knopf",fremd);
 // Gegenprobe: im Register "rapport" stehen beide sehr wohl - sonst wuerde
 // C3 auch dann gruen, wenn es den Rapport ueberhaupt nicht mehr gaebe.
 await page.evaluate(()=>{
  const b=document.querySelector('#a2Inhalt [data-a2-reg="rapport"]'); if(b)b.click();
 });
 await page.waitForTimeout(300);
 const imReg=await page.evaluate(()=>({
  knopf:!!document.querySelector('#a2Inhalt [data-a2-tu="neuerrapport"]'),
  liste:!!document.querySelector('#a2Inhalt [data-a2-rep]')
 }));
 p(imReg.knopf&&imReg.liste,
   "C3b Gegenprobe: im Register Rapport stehen Liste und Anlegen-Knopf",imReg);

 // ---- D  Der Ausdruck ohne Anfasser --------------------------------------
 await aufraeumen();
 const anfasser=()=>page.evaluate(()=>{
  const e=document.querySelector("#reportScreen textarea#customer");
  return e?getComputedStyle(e).resize:null;
 });
 await page.evaluate(()=>{$("startScreen").hidden=true;$("reportScreen").hidden=false});
 await page.waitForTimeout(300);
 const amSchirm=await anfasser();
 await page.emulateMedia({media:"print"});
 await page.waitForTimeout(250);
 const beimDruck=await anfasser();
 await page.emulateMedia({media:"screen"});
 p(beimDruck==="none","D1 im Ausdruck hat das Textfeld keinen Anfasser mehr",
   {druck:beimDruck});
 p(amSchirm&&amSchirm!=="none",
   "D2 Gegenprobe: am Bildschirm bleibt er - dort gehoert er hin",{schirm:amSchirm});

 // ---- E  Der Ausdruck ohne Zaehlpfeile ------------------------------------
 // v3.266: Chrome zeichnet an einem Zahlenfeld zwei kleine Pfeile zum Hoch-
 // und Runterzaehlen. Im Regierapport standen sie im fertigen PDF mitten in
 // den Spalten Std., Menge und Fr./E (gemeldet am 8.10.2026, am PC sichtbar,
 // auf dem Tablet nicht). Dieselbe Familie wie der Anfasser in D - und
 // dieselbe Falle: appearance:none am Feld selbst erreicht die Pfeile nicht,
 // sie sind ein eigenes Element im Schatten-Baum und brauchen ihre eigene
 // Regel.
 //
 // Gemessen wird am Bild, nicht an der Stilangabe: getComputedStyle mit
 // "::-webkit-inner-spin-button" gibt in Chrome die Werte des Feldes selbst
 // zurueck (gemessen: display inline-block, width 120px = Feldbreite,
 // appearance auto - in Druck UND Bildschirm gleich). Damit ist dort weder
 // ein Erfolg noch ein Fehlschlag zu erkennen.
 // Chrome zeichnet die Pfeile nur, solange der Zeiger auf dem Feld steht.
 // Also je Medium zwei Aufnahmen desselben Feldes - ohne und mit Zeiger
 // darauf - und verglichen werden die Bilder: im Druck muessen beide gleich
 // sein (keine Pfeile), am Bildschirm muessen sie sich unterscheiden (dort
 // gehoeren die Pfeile hin). Das Styling bleibt dabei je Vergleich gleich,
 // weil beide Aufnahmen im selben Medium entstehen.
 //
 // Zahlenfelder gibt es im Rapport erst mit einer Zeile: Std. steht in einer
 // Arbeitsposition. Ohne Zeile gibt es nichts zu messen - E0 haelt das fest,
 // damit die Pruefung nicht stillschweigend ins Leere laeuft.
 await page.evaluate(()=>{
  if(typeof works!=="undefined"&&typeof neueArbeitsposition==="function"&&!works.length)
   works.push(neueArbeitsposition());
  if(typeof renderMain==="function")renderMain();
 });
 await page.waitForTimeout(250);
 const zahlenfeld=page.locator('#reportScreen input[type=number]').first();
 const esGibtEins=await zahlenfeld.count()>0;
 p(esGibtEins,"E0 im Rapport gibt es ueberhaupt ein Zahlenfeld zu pruefen",
   {gefunden:esGibtEins});
 if(esGibtEins){
  const aufnahmen=async()=>{
   await page.mouse.move(0,0); await page.waitForTimeout(120);
   const ohne=await zahlenfeld.screenshot();
   await zahlenfeld.hover(); await page.waitForTimeout(120);
   const mit=await zahlenfeld.screenshot();
   await page.mouse.move(0,0);
   return {gleich:ohne.equals(mit),groesse:ohne.length};
  };
  const aSchirm=await aufnahmen();
  await page.emulateMedia({media:"print"});
  await page.waitForTimeout(250);
  const aDruck=await aufnahmen();
  await page.emulateMedia({media:"screen"});
  p(aDruck.gleich,"E1 im Ausdruck hat das Zahlenfeld keine Zaehlpfeile mehr",
    aDruck);
  p(!aSchirm.gleich,
    "E2 Gegenprobe: am Bildschirm bleiben sie - dort gehoeren sie hin",aSchirm);
 }

 // ---- F  Anleitung oeffnet die Anleitung ---------------------------------
 // Bis v3.156 fuehrten "Einstellungen" und "Anleitung" unter "Mehr" beide
 // in die Einstellungen - zwei Eintraege, ein Ziel.
 await aufraeumen();
 await page.evaluate(()=>{a2Zustand.seite="mehr";a2Zeichnen()});
 await page.waitForTimeout(300);
 // v3.226, ZWEI FEHLER IM PRUEFSTAND nacheinander - beide hier, nicht in
 // der App:
 //
 // Urspruenglich stand hier page.on("popup",x=>{neuesFenster=x.url()}) mit
 // einem festen Warten von 900 ms darunter. In der CI kam "" heraus und F2
 // war rot, seit es diesen Fall gibt - waehrend hier alles gruen aussah.
 //
 // Erster Anlauf: auf die Adresse warten statt auf Millisekunden. Half
 // nicht, die Adresse blieb auch nach sechs Sekunden leer. Der Grund ist
 // nicht Langsamkeit: die CI benutzt chrome-headless-shell, und der hat
 // keinen PDF-Betrachter. Das Fenster geht dort auf und bleibt leer, weil
 // die PDF gar nicht angezeigt werden kann. Die Adresse eines geoeffneten
 // PDF-Fensters ist in diesem Browser schlicht nicht messbar.
 //
 // Gemessen wird deshalb, was die APP TUT, nicht was der Browser daraus
 // macht: js/70 ruft window.open(HILFE_PDF,"_blank","noopener"). Das ist
 // browserunabhaengig und zugleich genauer als vorher - das Ziel "_blank"
 // wird jetzt mitgeprueft, also dass die Anleitung NEBEN der App aufgeht
 // und sie nicht verdraengt.
 const ruf=await page.evaluate(()=>{
  const echt=window.open;
  let g=null;
  window.open=(u,ziel,merk)=>{ g={adresse:String(u||""),ziel:String(ziel||""),merk:String(merk||"")}; return null };
  const k=document.querySelector('[data-a2-tu="anleitung"]');
  if(k)k.click();
  window.open=echt;
  return {gerufen:g, settingsOffen:!$("settingsModal").hidden};
 });
 p(!ruf.settingsOffen,"F1 'Anleitung' oeffnet nicht die Einstellungen",{settingsOffen:ruf.settingsOffen});
 p(!!ruf.gerufen&&/^anleitung\/Spengler-DIGITAL-Anleitung-v[0-9.]+\.pdf$/.test(ruf.gerufen.adresse),
   "F2 sondern die Anleitung selbst",{gerufen:ruf.gerufen});
 p(!!ruf.gerufen&&ruf.gerufen.ziel==="_blank",
   "F2a und zwar NEBEN der App, nicht an ihrer Stelle - sonst waere die Arbeit weg",{gerufen:ruf.gerufen});
 // GEGENPROBE, neu: js/41 (HILFE_PDF - die eine Quelle fuer den Pfad) und
 // index.html meinen dieselbe Datei, und index.html verweist ueberall auf
 // dieselbe. Ein Versionswechsel, bei dem eine der Stellen stehenbleibt,
 // faellt damit hier auf, statt als toter Verweis beim Anwender zu landen.
 const html=fs.readFileSync(path.join(process.cwd(),"index.html"),"utf8");
 const hilfe=fs.readFileSync(path.join(process.cwd(),"js/41-hilfe.js"),"utf8");
 const ausHtml=html.match(/anleitung\/Spengler-DIGITAL-Anleitung-v[0-9.]+\.pdf/g)||[];
 const ausJs=(hilfe.match(/const HILFE_PDF="([^"]+)"/)||[])[1]||"";
 const einheitlich=ausHtml.length>0&&ausHtml.every(x=>x===ausHtml[0]);
 p(einheitlich&&ausJs===ausHtml[0]&&(!!ruf.gerufen&&ruf.gerufen.adresse===ausJs),
   "F2b GEGENPROBE: js/41 und index.html meinen dieselbe Anleitung, index.html ueberall dieselbe - und genau die wird geoeffnet",
   {geoeffnet:ruf.gerufen&&ruf.gerufen.adresse,inJs:ausJs,inHtml:ausHtml});
 // Gegenprobe: "Einstellungen" fuehrt weiterhin in die Einstellungen.
 await aufraeumen();
 await page.evaluate(()=>{a2Zustand.seite="mehr";a2Zeichnen()});
 await page.waitForTimeout(250);
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-tu="einstell"]');if(k)k.click()});
 await page.waitForTimeout(800);
 p(await page.evaluate(()=>!$("settingsModal").hidden),
   "F3 Gegenprobe: 'Einstellungen' tut es weiterhin");

 // ---- G  Das Register heisst Massaufnahme --------------------------------
 await aufraeumen();
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const z=document.querySelector("[data-a2-projekt]");if(z)z.click()});
 await page.waitForTimeout(1500);
 const namen=await page.evaluate(()=>
  [...document.querySelectorAll('#a2Inhalt [data-a2-reg]')].map(x=>x.textContent.trim()));
 p(namen.indexOf("Massaufnahme")>=0&&namen.indexOf("Aufmass")<0,
   "G1 das Register heisst Massaufnahme, nicht mehr Aufmass",namen);
 // Der SCHLUESSEL bleibt "aufmass" - er steht im Zustand und in anderen
 // Pruefstaenden. Nur die Beschriftung hat sich geaendert.
 p(await page.evaluate(()=>!!document.querySelector('[data-a2-reg="aufmass"]')),
   "G2 der Schluessel dahinter ist unveraendert geblieben");

 // ---- H  Kompakter: Aufgaben und Zeilen ----------------------------------
 // "die offenen aufgaben sollten kleinere felder sein und nicht so wuchtig",
 // "verkleinere auch die buttons der einzelnen massaufnahmen".
 // Gemessen wird nicht eine gewuenschte Zahl, sondern das, was wuchtig
 // WIRKTE: ein blauer Balken quer ueber die ganze Aufgabenkarte.
 await aufraeumen();
 await page.evaluate(()=>{if(typeof aufgabenNeuLaden==="function")return aufgabenNeuLaden()});
 await page.waitForTimeout(900);
 // UMGESTELLT in v3.158: eine Aufgabe ist keine Karte mehr, sondern eine
 // Zeile (.a2-zeile-reihe) mit dem Schritt-Knopf daneben. Gemessen wird
 // dasselbe wie vorher - dass der Knopf nicht die ganze Breite frisst -,
 // nur an der Stelle, an der die Aufgabe heute steht.
 // v3.258: Die Aufgabenliste startet ZUGEKLAPPT (Ansage des Anwenders). Zum
 // Messen der Zeile selbst muss sie aufgeklappt sein - die Zusage dieses
 // Abschnitts ("der Knopf frisst der Zeile nicht die Breite") gilt
 // unveraendert, sie ist nur einen Tipp entfernt.
 //
 // Aufgeklappt wird EINZELN und jedes Mal neu gesucht: jeder Klick zeichnet
 // die Seite neu, Elemente aus einem alten Schnappschuss haengen danach
 // nicht mehr im Dokument.
 await page.evaluate(async()=>{
  const ids=[...document.querySelectorAll("[data-a2-aufg-gruppe]")]
    .map(k=>k.getAttribute("data-a2-aufg-gruppe"));
  for(const id of ids){
   const k=document.querySelector(`[data-a2-aufg-gruppe="${id}"]`);
   if(k)k.click();
   await new Promise(r=>setTimeout(r,120));
  }
 });
 await page.waitForTimeout(200);
 const h=await page.evaluate(()=>{
  const reihe=[...document.querySelectorAll("#a2Inhalt .a2-zeile-reihe")]
   .find(r=>r.querySelector(".a2-zeile-tat"));
  const knopf=reihe&&reihe.querySelector(".a2-zeile-tat");
  const zeile=document.querySelector("#a2Inhalt .a2-zeile");
  return {reiheBreit:reihe?Math.round(reihe.getBoundingClientRect().width):0,
          knopfBreit:knopf?Math.round(knopf.getBoundingClientRect().width):0,
          knopfHoch:knopf?Math.round(knopf.getBoundingClientRect().height):0,
          zeileHoch:zeile?Math.round(zeile.getBoundingClientRect().height):0};
 });
 p(h.knopfBreit>0&&h.knopfBreit<h.reiheBreit*0.6,
   "H1 der Schritt-Knopf einer Aufgabe nimmt der Zeile nicht die Breite",h);
 // Die Zeile der einzelnen Massaufnahmen steht auf der PROJEKTSEITE, nicht
 // auf Heute. Auf Heute traegt dieselbe Klasse die Projektzeile mit
 // Status-Marke, die naturgemaess hoeher ist - daran gemessen zu haben war
 // der erste Fehlschlag dieser Zusicherung.
 await tab(page,"projekte"); await page.waitForTimeout(400);
 await page.evaluate(()=>{const z=document.querySelector("[data-a2-projekt]");if(z)z.click()});
 await page.waitForTimeout(1500);
 await page.evaluate(()=>{const k=document.querySelector('[data-a2-reg="aufmass"]');if(k)k.click()});
 await page.waitForTimeout(500);
 const hm=await page.evaluate(()=>{
  const z=document.querySelector("#a2Inhalt .a2-zeile");
  return z?Math.round(z.getBoundingClientRect().height):0;
 });
 p(hm>0&&hm<=52,"H2 die Zeilen der einzelnen Massaufnahmen sind kompakt",{zeile:hm});
 // Gegenprobe zur Verkleinerung: treffbar muss alles bleiben. Unter 30px
 // trifft man auf dem Dach nichts mehr - dann waere aus "kleiner" ein
 // eigener Fehler geworden.
 p(h.knopfHoch>=30,"H3 Gegenprobe: die Knoepfe bleiben mit dem Finger treffbar",h);

 p(fehler.length===0,"E1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})();
