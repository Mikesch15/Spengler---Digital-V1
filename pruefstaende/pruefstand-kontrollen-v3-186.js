// Prueft v3.186: Die Kontrolle der Stammdaten.
//
// GEWUENSCHT
// "Und es soll eine kontrollfunktion geben die prueft ob alle
//  blechpositionen einen werkstoff hinterlegt haben, und falls du noch mehr
//  solche kontrollanwendungsfaelle fuer sinnvoll erachtest kannst du sie
//  nach rueckfrage umsetzen"
// Auf Rueckfrage hat der Anwender ALLE VIER vorgeschlagenen Gruppen
// gewaehlt: Blech/Werkstoff, Katalog, Mehrdeutiges, Verwaistes im Lager.
//
// BEFUND (an den echten Daten der PETER KUENZI AG erhoben, nur lesend)
//     Blech ohne Werkstoff          0 von 6   (das ausdrueckliche Anliegen
//                                              ist heute in Ordnung - die
//                                              Pruefung haelt es so)
//     Werkstoff ohne Dehnungswerte  2 von 8
//     Tafel ohne Laenge/Breite      0
//     Position ohne Einheit         4 von 381
//     Position mit Preis 0.00       2
//     Zwei Bleche gleich            0
//     Werkstoff ohne Blech          5 von 8
//     Position nie benutzt          9
//
// KERNGEDANKE (wie js/73): Der Befund wird ABGELEITET, nie gespeichert.
// Gespeichert wird nur die Entscheidung des Menschen ("ist so gewollt").
// Diese Pruefungen halten genau das fest - eine gespeicherte Befundliste
// koennte behaupten, alles sei in Ordnung, waehrend der Katalog laengst
// wieder eine Luecke hat.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-kontrollen-v3-186.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
const nurCode=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")
                  .replace(/"(\\.|[^"\\])*"/g,'""').replace(/'(\\.|[^'\\])*'/g,"''")
                  .replace(/`(\\.|[^`\\])*`/g,"``");

// ---------------------------------------------------------------------------
// Zwei Datenstaende. SAUBER ist eine Firma, an der nichts zu beanstanden ist;
// KAPUTT traegt je Pruefung genau EINEN Befund, damit sich jede einzeln
// nachweisen laesst.
// ---------------------------------------------------------------------------
const SAUBER=()=>{
 settings.materials=[
  ["101.01","Kupferblech 0.6","0.6","m²",42],
  ["301.01","Rinnenhalter","3x25","Stk.",4.2]
 ];
 materialIds=[1,2];
 materialWerkstoffe=[3,null];
 materialFormate=[{staerke_mm:0.6,ausfuehrung:"blank",form:"rolle",laenge_mm:null,breite_mm:null},
                  {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null}];
 materialDemo=[false,false];
 measurementMaterials=[{id:3,name:"Kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000}];
 reststuecke=[{id:9,laenge_mm:2000,breite_mm:400,verbraucht:false,artikel_id:1,material_name:"Kupfer"}];
 restMindestlaenge=1000; restMindestbreite=100;
 zaehlwerkAktiv=true;
 zwMaterialUebernehmen([{edv_nr:"101.01",anzahl:5,zuletzt:"2026-01-01"},
                        {edv_nr:"301.01",anzahl:2,zuletzt:"2026-01-01"}]);
 konAbweisungen=Object.create(null);
 konLagerArtikel=new Set(["1","2"]);
 konAbgewieseneZeigen=false;
};

const KAPUTT=()=>{
 settings.materials=[
  ["101.01","Kupferblech 0.6","0.6","m²",42],          // in Ordnung
  ["101.02","Titanzink 0.7","0.7","m²",38],            // Blech OHNE Werkstoff
  ["101.03","Kupferblech 0.6 Zweitname","0.6","m²",40],// mehrdeutig zu 101.01
  ["201.01","Tafel Alu","0.8","m²",30],                // Tafel ohne Format
  ["301.01","Rinnenhalter","3x25","",4.2],             // ohne Einheit
  ["501.01","Dichtband","50mm","m1",0],                // Preis 0.00
  ["601.01","Blindniete","4x10","Stk.",0.1],           // nie benutzt
  ["901.01","Beispiel-Position","","Stk.",0]           // Beispiel: zaehlt nie
 ];
 materialIds=[1,2,3,4,5,6,7,901];
 materialWerkstoffe=[3,null,3,4,null,null,null,null];
 materialFormate=[
  {staerke_mm:0.6,ausfuehrung:"blank",form:"rolle",laenge_mm:null,breite_mm:null},
  {staerke_mm:0.7,ausfuehrung:"vorbewittert",form:"rolle",laenge_mm:null,breite_mm:null},
  {staerke_mm:0.6,ausfuehrung:"blank",form:"rolle",laenge_mm:null,breite_mm:null},
  {staerke_mm:0.8,ausfuehrung:"blank",form:"tafel",laenge_mm:null,breite_mm:1000},
  {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null},
  {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null},
  {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null},
  {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null}
 ];
 materialDemo=[false,false,false,false,false,false,false,true];
 measurementMaterials=[
  {id:3,name:"Kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
  {id:4,name:"Aluminium",max_abstand_mm:4000,ab_fixpunkt_mm:2000},
  {id:5,name:"Blei",max_abstand_mm:0,ab_fixpunkt_mm:0}   // ohne Dehnungswerte
 ];                                                      // 5 hat auch kein Blech
 reststuecke=[
  {id:9,laenge_mm:2000,breite_mm:400,verbraucht:false,artikel_id:1,material_name:"Kupfer"},
  {id:10,laenge_mm:300,breite_mm:80,verbraucht:false,artikel_id:1,material_name:"Kupfer"},
  {id:11,laenge_mm:200,breite_mm:50,verbraucht:true,artikel_id:1,material_name:"Kupfer"}
 ];
 restMindestlaenge=1000; restMindestbreite=100;
 zaehlwerkAktiv=true;
 zwMaterialUebernehmen([{edv_nr:"101.01",anzahl:5,zuletzt:"2026-01-01"},
                        {edv_nr:"101.02",anzahl:1,zuletzt:"2026-01-01"},
                        {edv_nr:"101.03",anzahl:1,zuletzt:"2026-01-01"},
                        {edv_nr:"201.01",anzahl:1,zuletzt:"2026-01-01"},
                        {edv_nr:"301.01",anzahl:2,zuletzt:"2026-01-01"},
                        {edv_nr:"501.01",anzahl:2,zuletzt:"2026-01-01"}]);
 konAbweisungen=Object.create(null);
 konLagerArtikel=new Set(["1"]);      // 601.01 hat auch kein Lagerprodukt
 konAbgewieseneZeigen=false;
};

const offenVon=`s=>{const b=konBefunde().find(x=>x.schluessel===s);return b?b.offen.map(t=>t.id):null}`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  meineRechte={admin:true,kataloge:true,lager:true};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });
 await page.evaluate(`window.__sauber=${SAUBER.toString()};window.__kaputt=${KAPUTT.toString()};window.__offen=${offenVon}`);

 // ---- A  Jede Pruefung findet genau ihren Fall ----------------------------
 console.log("\nA · Jede Pruefung findet genau ihren Fall");
 const A=await page.evaluate(()=>{
  window.__kaputt();
  const o=s=>window.__offen(s);
  return {
   blech:o("blech-ohne-werkstoff"),
   dila:o("werkstoff-ohne-dila"),
   tafel:o("tafel-ohne-mass"),
   einheit:o("position-ohne-einheit"),
   preis:o("position-ohne-preis"),
   mehr:o("blech-mehrdeutig"),
   rest:o("rest-unter-mindestmass"),
   werkstoffLeer:o("werkstoff-ohne-blech"),
   nie:o("position-nie-benutzt")
  };
 });
 // Das ausdrueckliche Anliegen des Anwenders: 101.02 traegt ein Blechformat,
 // aber keinen Werkstoff.
 p(JSON.stringify(A.blech)===JSON.stringify(["101.02"]),"Blech ohne Werkstoff: genau 101.02",A.blech);
 p(JSON.stringify(A.dila)===JSON.stringify(["5"]),"Werkstoff ohne Dehnungswerte: genau der mit 0/0",A.dila);
 p(JSON.stringify(A.tafel)===JSON.stringify(["201.01"]),"Tafel ohne Laenge: genau 201.01",A.tafel);
 p(JSON.stringify(A.einheit)===JSON.stringify(["301.01"]),"ohne Einheit: genau 301.01",A.einheit);
 p(JSON.stringify(A.preis)===JSON.stringify(["501.01"]),"Preis 0.00: genau 501.01",A.preis);
 p(A.mehr.length===1&&A.mehr[0]==="101.01+101.03","mehrdeutig: genau das Paar 101.01/101.03",A.mehr);
 // Das verbrauchte Reststueck 11 liegt ebenfalls unter dem Mindestmass und
 // darf trotzdem NICHT gemeldet werden - es ist weg.
 p(JSON.stringify(A.rest)===JSON.stringify(["10"]),"Rest unter Mindestmass: nur das vorhandene, nicht das verbrauchte",A.rest);
 p(JSON.stringify(A.werkstoffLeer)===JSON.stringify(["5"]),"Werkstoff ohne Blech: genau der ohne Position",A.werkstoffLeer);
 p(JSON.stringify(A.nie)===JSON.stringify(["601.01"]),"nie benutzt: genau 601.01",A.nie);

 // ---- B  Die Beispiel-Positionen werden nicht beanstandet -----------------
 console.log("\nB · Mitgelieferte Beispiele sind kein Fehler der Firma");
 const B=await page.evaluate(()=>{
  window.__kaputt();
  const alle=konBefunde().reduce((a,x)=>a.concat(x.offen.map(t=>t.id)).concat(x.abgewiesen.map(t=>t.id)),[]);
  return {trifftBeispiel:alle.filter(x=>String(x).indexOf("901.01")>=0)};
 });
 // 901.01 hat WEDER Einheit NOCH Preis und war nie in Gebrauch - es wuerde
 // drei Pruefungen ausloesen, wenn der Beispiel-Stempel nicht zaehlte.
 p(B.trifftBeispiel.length===0,"keine einzige Meldung zur Beispiel-Position 901.01",B.trifftBeispiel);

 // ---- C  Saubere Daten: nichts gefunden ------------------------------------
 console.log("\nC · Saubere Daten melden nichts");
 const C=await page.evaluate(()=>{
  window.__sauber();
  return {fehler:konFehlerZahl(),hinweise:konHinweisZahl(),
          karte:konKarteHtml().length>0,
          text:konListeHtml().indexOf("Alles in Ordnung")>=0};
 });
 p(C.fehler===0,"kein Fehler",C.fehler);
 p(C.hinweise===0,"kein Hinweis",C.hinweise);
 p(C.karte===false,"keine Karte auf der Startseite");
 p(C.text===true,"die Liste sagt es ausdruecklich");

 // ---- D  Fehler und Hinweis sind nicht dasselbe ---------------------------
 console.log("\nD · Fehler und Hinweis sind getrennt");
 const D=await page.evaluate(()=>{
  window.__kaputt();
  const b=konBefunde();
  const schwere=Object.create(null);
  b.forEach(x=>{schwere[x.schluessel]=x.schwere});
  return {schwere,fehler:konFehlerZahl(),hinweise:konHinweisZahl(),karte:konKarteHtml()};
 });
 p(D.schwere["blech-ohne-werkstoff"]==="fehler","Blech ohne Werkstoff ist ein FEHLER",D.schwere);
 p(D.schwere["tafel-ohne-mass"]==="fehler","Tafel ohne Format ist ein FEHLER");
 p(D.schwere["position-nie-benutzt"]==="hinweis","nie benutzt ist nur ein HINWEIS");
 p(D.schwere["rest-unter-mindestmass"]==="hinweis","Rest unter Mindestmass ist nur ein HINWEIS");
 p(D.fehler===5,"fuenf Fehler (Blech, Dila, Tafel, Einheit, Mehrdeutig)",D.fehler);
 p(D.hinweise===4,"vier Hinweise (Preis, Rest, Werkstoff ohne Blech, nie benutzt)",D.hinweise);
 p(D.karte.indexOf("5 Angaben hindern")>=0&&D.karte.indexOf("Kontrolle")>=0,"die Karte nennt die Zahl der FEHLER, nicht die aller Befunde",D.karte.slice(0,200));

 // Nur Hinweise -> keine Karte. Die Startseite gehoert der Arbeit, nicht der
 // Pflege der Stammdaten.
 const D2=await page.evaluate(()=>{
  window.__sauber();
  settings.materials[1][4]=0;             // Preis 0.00 -> ein reiner Hinweis
  return {fehler:konFehlerZahl(),hinweise:konHinweisZahl(),karte:konKarteHtml().length>0};
 });
 p(D2.fehler===0&&D2.hinweise===1,"nur ein Hinweis, kein Fehler",D2);
 p(D2.karte===false,"ein blosser Hinweis bringt KEINE Karte auf die Startseite");

 // ---- E  "Ist so gewollt" --------------------------------------------------
 console.log("\nE · Abweisen: die Entscheidung des Menschen");
 const E=await page.evaluate(()=>{
  window.__kaputt();
  const vorher=konFehlerZahl()+konHinweisZahl();
  // Was das Schreiben spaeter in konAbweisungen ablegt, hier direkt gesetzt -
  // geprueft wird die Wirkung, nicht der Netzweg.
  konAbweisungen[konSchluessel("position-ohne-preis","501.01")]={id:1,grund:"Beistellung"};
  const b=konBefunde().find(x=>x.schluessel==="position-ohne-preis");
  return {vorher,nachher:konFehlerZahl()+konHinweisZahl(),
          offen:b.offen.length,abgewiesen:b.abgewiesen.length,
          zahl:konAbgewiesenZahl(),
          zeileZu:konListeHtml().indexOf("1 abgehakt – anzeigen")>=0,
          inListeVersteckt:konListeHtml().indexOf("501.01")<0};
 });
 p(E.nachher===E.vorher-1,"der Befund zaehlt nicht mehr mit",E);
 p(E.offen===0&&E.abgewiesen===1,"er ist nicht weg, sondern abgehakt",E);
 p(E.zahl===1,"die Zahl der Abgehakten stimmt",E.zahl);
 p(E.zeileZu===true,"ueber der Liste steht, dass etwas abgehakt ist");
 p(E.inListeVersteckt===true,"zugeklappt steht die abgehakte Position nicht in der Liste");

 const E2=await page.evaluate(()=>{
  konAbgewieseneZeigen=true;
  const h=konListeHtml();
  return {sichtbar:h.indexOf("501.01")>=0,
          zurueck:h.indexOf('data-kon-zurueck="position-ohne-preis"')>=0};
 });
 p(E2.sichtbar===true,"aufgeklappt steht sie wieder da");
 p(E2.zurueck===true,"und laesst sich wieder melden");

 // Nicht alles darf abgehakt werden: ein Blech ohne Werkstoff ist kein
 // Geschmacksurteil.
 const E3=await page.evaluate(()=>{
  window.__kaputt();
  konAbgewieseneZeigen=false;
  const b=konBefunde();
  const h=konListeHtml();
  return {abweisbar:b.filter(x=>x.abweisbar).map(x=>x.schluessel),
          nichtAbweisbar:b.filter(x=>!x.abweisbar).map(x=>x.schluessel),
          knopfBeiBlech:h.indexOf('data-kon-abweisen="blech-ohne-werkstoff"')>=0,
          knopfBeiPreis:h.indexOf('data-kon-abweisen="position-ohne-preis"')>=0};
 });
 p(E3.nichtAbweisbar.indexOf("blech-ohne-werkstoff")>=0,"Blech ohne Werkstoff laesst sich NICHT abhaken",E3.nichtAbweisbar);
 p(E3.nichtAbweisbar.indexOf("werkstoff-ohne-dila")>=0,"fehlende Dehnungswerte auch nicht");
 p(E3.nichtAbweisbar.indexOf("blech-mehrdeutig")>=0,"zwei gleiche Bleche auch nicht");
 p(E3.knopfBeiBlech===false,"und der Knopf steht dort gar nicht erst");
 p(E3.knopfBeiPreis===true,"beim Preis 0.00 dagegen schon");

 // ---- F  Ohne Zaehlwerk wird nicht geraten ---------------------------------
 console.log("\nF · Ohne Zaehlwerk faellt die Pruefung aus, statt alles zu melden");
 const F=await page.evaluate(()=>{
  window.__kaputt();
  zaehlwerkAktiv=false;
  const b=konBefunde().find(x=>x.schluessel==="position-nie-benutzt");
  const h=konListeHtml();
  return {moeglich:b.moeglich,offen:b.offen.length,
          sagtWarum:h.indexOf("braucht das Zählwerk")>=0,
          hinweise:konHinweisZahl()};
 });
 p(F.moeglich===false,"die Pruefung meldet sich als nicht durchfuehrbar");
 p(F.offen===0,"sie meldet KEINE Position (sonst waeren es alle)",F.offen);
 p(F.sagtWarum===true,"und sagt, warum sie ausfaellt");

 // Und: geht das Lesen des Lagers schief, wird ebenfalls nichts behauptet.
 const F2=await page.evaluate(()=>{
  window.__kaputt();
  konLagerArtikel=null;                  // so bleibt es nach einem Lesefehler
  const b=konBefunde().find(x=>x.schluessel==="position-nie-benutzt");
  return {offen:b.offen.length};
 });
 p(F2.offen===0,"ohne gelesene Lager-Zuordnung wird keine Position beschuldigt",F2.offen);

 // ---- G  Nichts wird gespeichert ausser der Abweisung ---------------------
 console.log("\nG · Der Befund wird abgeleitet, nicht gemerkt");
 const quelle=nurCode(lies("js/75-kontrollen.js"));
 p(/function konBefunde\(\)/.test(quelle),"konBefunde() rechnet die Liste");
 p(!/localStorage/.test(quelle),"kein localStorage-Merkzettel fuer Befunde");
 // Geschrieben wird genau EINE Tabelle - die der Entscheidungen.
 const rohTab=[...lies("js/75-kontrollen.js").matchAll(/\.from\("([a-z_]+)"\)/g)].map(m=>m[1]);
 p(rohTab.filter(t=>t!=="kontroll_abweisungen").every(t=>["lager_varianten","lagerbestand"].indexOf(t)>=0),
   "gelesen wird nur aus Lager-Tabellen, geschrieben nur in kontroll_abweisungen",rohTab);
 const schreibt=lies("js/75-kontrollen.js");
 p(/from\("kontroll_abweisungen"\)[\s\S]{0,400}?upsert/.test(schreibt),"die Abweisung wird per upsert gesetzt");
 // Ein von RLS geblockter Schreibvorgang meldet keinen Fehler, er betrifft
 // still 0 Zeilen (CLAUDE.md 24.1). Beide Schreibwege muessen das pruefen.
 p((schreibt.match(/!data\|\|!data\.length/g)||[]).length>=2,
   "0 betroffene Zeilen gelten als Fehlschlag, nicht als Erfolg - beim Setzen UND beim Zuruecknehmen");

 // ---- H  Verdrahtung -------------------------------------------------------
 console.log("\nH · Verdrahtung");
 p(lies("sw.js").indexOf("./js/75-kontrollen.js")>=0,"js/75 steht in der App-Shell des Service Workers");
 const html=lies("index.html");
 p(html.indexOf('<script src="js/75-kontrollen.js">')>=0,"js/75 ist eingebunden");
 p(html.indexOf('data-section="kontrollen"')>=0,"der Abschnitt steht in den Einstellungen");
 p(html.indexOf('data-hilfe="einst-kontrollen"')>=0,"mit Info-Knopf");
 p(html.indexOf('id="kontrollenBox"')>=0,"und einem Behaelter zum Zeichnen");
 p(lies("js/41-hilfe.js").indexOf('"einst-kontrollen"')>=0,"der Hilfetext ist da");
 const a2=lies("js/70-ansicht2.js");
 p(a2.indexOf("konKarteHtml()")>=0,"die neue Ansicht zeigt die Karte");
 p(a2.indexOf('id:"kontrollen"')>=0,"und den Eintrag unter Mehr");
 p(a2.indexOf("konAnzeigen()")>=0,"der die Kontrolle oeffnet");
 p(lies("css/01-basis.css").indexOf(".kon-pruefung")>=0,"die Gestaltung steht in der gemeinsamen CSS-Datei");
 // Die Kontrolle darf kein zweites Formular auf dieselben Felder sein.
 p(/openSettingsTo\(p\.tab,p\.abschnitt\)/.test(schreibt),"jeder Befund oeffnet die BESTEHENDE Karte");
 p(!/<input/.test(schreibt.replace(/^\s*\/\/.*$/gm,"")),"js/75 baut selbst kein Eingabefeld");

 // Und der Weg ueber die Oberflaeche funktioniert wirklich.
 console.log("\nH2 · Der Abschnitt geht auf und zeichnet");
 await page.evaluate(()=>{ window.__kaputt(); openSettingsTo("general","kontrollen"); });
 await page.waitForTimeout(150);
 await page.click('[data-toggle-section="kontrollen"]');
 await page.waitForTimeout(150);
 await page.click('[data-toggle-section="kontrollen"]');
 await page.waitForTimeout(400);
 const H2=await page.evaluate(()=>{
  const box=$("kontrollenBox");
  return {inhalt:box?box.innerHTML.length:0,
          nenntBefund:box?box.innerHTML.indexOf("101.02")>=0:false};
 });
 p(H2.inhalt>200,"der Abschnitt ist gezeichnet",H2.inhalt);
 p(H2.nenntBefund===true,"und nennt den Befund im Klartext");

 // ---- I  Sauberkeit --------------------------------------------------------
 console.log("\nI · Sauberkeit");
 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler);

 await b.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();
