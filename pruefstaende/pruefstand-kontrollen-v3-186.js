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
 // v3.207: Der Datenstand setzt die Abweisungen direkt - damit sind sie
 // GELESEN. Ohne diese Flagge behauptet die Karte bewusst nichts (siehe
 // Abschnitt K), und die Abschnitte C/D pruefen ja gerade die Karte.
 konAbweisungenGeladen=true;
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
 konAbweisungenGeladen=true;          // wie in SAUBER: direkt gesetzt = gelesen
 konLagerArtikel=new Set(["1"]);      // 601.01 hat auch kein Lagerprodukt
 konAbgewieseneZeigen=false;
};

const offenVon=`s=>{const b=konBefunde().find(x=>x.schluessel===s);return b?b.offen.map(t=>t.id):null}`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
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
          knopfBeiPreis:h.indexOf('data-kon-abweisen="position-ohne-preis"')>=0,
          knopfBeiDila:h.indexOf('data-kon-abweisen="werkstoff-ohne-dila"')>=0};
 });
 p(E3.nichtAbweisbar.indexOf("blech-ohne-werkstoff")>=0,"Blech ohne Werkstoff laesst sich NICHT abhaken",E3.nichtAbweisbar);
 p(E3.nichtAbweisbar.indexOf("blech-mehrdeutig")>=0,"zwei gleiche Bleche auch nicht");
 // v3.198: Fehlende Dehnungswerte SIND abweisbar. Bis v3.197 stand hier das
 // Gegenteil - die Erwartung ist umgedreht, nicht geloescht. Der Grund: es
 // gibt Werkstoffe, bei denen keine Dehnungswerte richtig sind (Blei liegt
 // nicht in langen Bahnen). Eine Meldung, die sich nie erledigen laesst,
 // verdeckt nach einer Weile die, die es ernst meinen.
 p(E3.abweisbar.indexOf("werkstoff-ohne-dila")>=0,
   "fehlende Dehnungswerte lassen sich als gewollt abhaken",E3.abweisbar);
 p(E3.knopfBeiBlech===false,"und der Knopf steht dort gar nicht erst");
 p(E3.knopfBeiPreis===true,"beim Preis 0.00 dagegen schon");
 p(E3.knopfBeiDila===true,"und beim Werkstoff ohne Dehnungswerte ebenfalls",E3.knopfBeiDila);

 // ---- E4  Der Weg wird wirklich durchgespielt (v3.198) --------------------
 console.log("\nE4 · Werkstoff ohne Dehnungswerte abhaken");
 // Wie in Abschnitt E: was das Schreiben in konAbweisungen ablegt, wird hier
 // direkt gesetzt. Geprueft wird die WIRKUNG; dass geschrieben wird und dass
 // 0 betroffene Zeilen als Fehlschlag gelten, prueft Abschnitt G.
 const E4=await page.evaluate(()=>{
  window.__kaputt();
  konAbweisungen={};
  konAbgewieseneZeigen=false;
  const vorher=konBefunde().find(x=>x.schluessel==="werkstoff-ohne-dila");
  const fehlerVorher=konFehlerZahl();
  const id=vorher.offen[0].id;
  konAbweisungen[konSchluessel("werkstoff-ohne-dila",id)]={id:7,grund:"Blei wird nicht dilatiert"};
  const nachher=konBefunde().find(x=>x.schluessel==="werkstoff-ohne-dila");
  const zu=konListeHtml();
  konAbgewieseneZeigen=true;
  const auf=konListeHtml();
  konAbgewieseneZeigen=false;
  return {id, offenVorher:vorher.offen.length, offenNachher:nachher.offen.length,
          abgewiesen:nachher.abgewiesen.length,
          fehlerVorher, fehlerNachher:konFehlerZahl(),
          abgewiesenZahl:konAbgewiesenZahl(),
          zugeklappt:zu.indexOf('data-kon-zurueck="werkstoff-ohne-dila"')>=0,
          aufgeklappt:auf.indexOf('data-kon-zurueck="werkstoff-ohne-dila"')>=0};
 });
 p(E4.offenVorher===1&&E4.offenNachher===0,
   "der Werkstoff steht nicht mehr als offener Fehler da",[E4.offenVorher,E4.offenNachher]);
 p(E4.abgewiesen===1&&E4.abgewiesenZahl>=1,"sondern als abgehakt",E4);
 p(E4.fehlerNachher===E4.fehlerVorher-1,
   "und der Fehlerzaehler geht um genau eins runter",[E4.fehlerVorher,E4.fehlerNachher]);
 // Abgehakt heisst NICHT verschwunden - eingeklappt ist er weg, aufgeklappt
 // steht er mit "wieder melden" da. Sonst waere es Verstecken statt Abhaken.
 p(E4.zugeklappt===false&&E4.aufgeklappt===true,
   "eingeklappt weg, aufgeklappt mit „wieder melden“ da",[E4.zugeklappt,E4.aufgeklappt]);

 // GEGENPROBE: abgehakt ist GENAU dieser Werkstoff, nicht die Pruefung. Ein
 // spaeter angelegter Werkstoff ohne Dehnungswerte muss sich wieder melden -
 // sonst haette ein einziger Klick die Kontrolle dauerhaft stillgelegt.
 const E5=await page.evaluate(()=>{
  measurementMaterials=konListe(measurementMaterials).concat(
    [{id:99,name:"Neuer Werkstoff",max_abstand_mm:0,ab_fixpunkt_mm:0}]);
  const b=konBefunde().find(x=>x.schluessel==="werkstoff-ohne-dila");
  return {offen:b.offen.map(t=>t.id), abgewiesen:b.abgewiesen.map(t=>t.id)};
 });
 p(E5.offen.length===1&&E5.offen[0]==="99",
   "ein NEUER Werkstoff ohne Dehnungswerte meldet sich trotzdem",E5);
 p(E5.abgewiesen.length===1&&E5.abgewiesen[0]!=="99",
   "und der abgehakte bleibt abgehakt",E5);

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

 // ---- K  Die Karte behauptet nichts, bevor die Abweisungen gelesen sind ----
 // v3.207, gemeldet vom Anwender: "Kontrolle der stammdaten zeigt immernoch
 // e fehler an obwohl ich alles als so gewollt abgehakt habe".
 // URSACHE: konAbweisungen wurde erst beim OEFFNEN der Kontrolle geholt
 // (konDatenLaden). Die Karte auf der Startseite wird aber lange davor
 // gezeichnet - mit leerem konAbweisungen. Und leer hiess zweierlei:
 // "nichts abgehakt" und "noch nicht nachgesehen". Die Karte gab den
 // zweiten Fall als den ersten aus und zaehlte abgehakte Sachen als Fehler.
 // Beim Oeffnen der Kontrolle war dann alles in Ordnung - beim naechsten
 // App-Start stand die Karte wieder da.
 console.log("\nK · Die Karte zaehlt erst, wenn die Abweisungen gelesen sind");
 const K0=await page.evaluate(()=>{
  window.__sauber();
  settings.materials[1][3]="";          // 301.01 ohne Einheit = EIN Fehler
  konAbweisungen=Object.create(null);
  konAbweisungenGeladen=false;          // Stand direkt nach dem App-Start
  konAbweisungenLaeuft=false; konAbweisungenVersuch=0;
  return {fehler:konFehlerZahl(),noetig:konKarteNoetig(),karte:konKarteHtml()};
 });
 p(K0.fehler===1,"ein offener Fehler, solange nichts abgehakt bekannt ist",K0.fehler);
 p(K0.noetig===false&&K0.karte==="",
   "trotzdem KEINE Karte - ungelesene Entscheidungen sind keine Entscheidung",K0);

 // Der ganze Weg, wie ihn die Startseite geht: vorbereiten, holen, neu
 // zeichnen. Die Abweisung deckt genau diesen Befund ab.
 const K1=await page.evaluate(async()=>{
  let gefragt=0;
  sb.from=t=>{const q={};["select","eq","upsert","delete"].forEach(k=>q[k]=()=>q);
    q.then=(f,g)=>{
     if(t==="kontroll_abweisungen"){gefragt++;
      return Promise.resolve({data:[{id:1,pruefung:"position-ohne-einheit",
                                     gegenstand:"301.01",grund:null}],error:null}).then(f,g)}
     return Promise.resolve({data:[],error:null}).then(f,g)};
    return q};
  konKarteVorbereiten();
  konKarteVorbereiten();                 // zweimal gezeichnet = trotzdem einmal holen
  await new Promise(r=>setTimeout(r,120));
  return {gefragt,geladen:konAbweisungenGeladen,
          fehler:konFehlerZahl(),karte:konKarteHtml(),
          abgehakt:konAbgewiesenZahl()};
 });
 p(K1.gefragt===1,"die Abweisungen werden genau einmal geholt, nicht bei jedem Zeichnen",K1.gefragt);
 p(K1.geladen===true&&K1.abgehakt===1,"danach ist die Entscheidung des Menschen bekannt",K1);
 p(K1.fehler===0&&K1.karte==="",
   "und die Karte bleibt weg - genau das war die Meldung des Anwenders",K1);

 // Und: ohne Befund wird gar nicht erst gefragt. Die Startseite soll fuer
 // nichts laden - pruefstand-uebersicht-cockpit-v3-09 haelt genau das fest
 // (bei ausgeschalteten Modulen faellt dort KEINE Abfrage an).
 const K1b=await page.evaluate(async()=>{
  window.__sauber();                     // nichts zu beanstanden
  konAbweisungen=Object.create(null);
  konAbweisungenGeladen=false; konAbweisungenLaeuft=false; konAbweisungenVersuch=0;
  let gefragt=0;
  sb.from=()=>{const q={};["select","eq","upsert","delete"].forEach(k=>q[k]=()=>q);
    q.then=(f,g)=>{gefragt++;return Promise.resolve({data:[],error:null}).then(f,g)};
    return q};
  konKarteVorbereiten();
  await new Promise(r=>setTimeout(r,120));
  return {gefragt,fehler:konFehlerZahl(),karte:konKarteHtml()};
 });
 p(K1b.fehler===0&&K1b.gefragt===0,
   "ohne einen einzigen Befund wird gar nicht erst nach Abweisungen gefragt",K1b);
 p(K1b.karte==="","und es steht auch keine Karte da",K1b.karte);

 // GEGENPROBE 1: ist NICHTS abgehakt, kommt die Karte sehr wohl. Sonst
 // haette der Fix die Karte nur stillgelegt.
 const K2=await page.evaluate(async()=>{
  window.__sauber();
  settings.materials[1][3]="";
  konAbweisungen=Object.create(null);
  konAbweisungenGeladen=false; konAbweisungenLaeuft=false; konAbweisungenVersuch=0;
  sb.from=()=>{const q={};["select","eq","upsert","delete"].forEach(k=>q[k]=()=>q);
    q.then=(f,g)=>Promise.resolve({data:[],error:null}).then(f,g);return q};
  konKarteVorbereiten();
  await new Promise(r=>setTimeout(r,120));
  return {geladen:konAbweisungenGeladen,fehler:konFehlerZahl(),karte:konKarteHtml()};
 });
 p(K2.geladen===true&&K2.fehler===1,"ohne Abweisung bleibt der Fehler ein Fehler",K2);
 p(K2.karte.indexOf("1 Angabe hindert")>=0,"und die Karte steht da",K2.karte.slice(0,160));

 // GEGENPROBE 2: geht das Lesen schief, wird der bisherige Stand NICHT
 // geleert. Sonst stuende nach einer misslungenen Abfrage jede abgehakte
 // Sache wieder als Fehler da.
 const K3=await page.evaluate(async()=>{
  window.__sauber();
  settings.materials[1][3]="";
  konAbweisungen=Object.create(null);
  konAbweisungen[konSchluessel("position-ohne-einheit","301.01")]={id:1,grund:""};
  konAbweisungenGeladen=true; konAbweisungenLaeuft=false; konAbweisungenVersuch=0;
  sb.from=()=>{const q={};["select","eq","upsert","delete"].forEach(k=>q[k]=()=>q);
    q.then=(f,g)=>Promise.resolve({data:null,error:{message:"keine Verbindung"}}).then(f,g);
    return q};
  const ok=await konAbweisungenLaden();
  return {ok,abgehakt:konAbgewiesenZahl(),fehler:konFehlerZahl()};
 });
 p(K3.ok===false,"ein Lesefehler meldet sich als Fehlschlag",K3);
 p(K3.abgehakt===1&&K3.fehler===0,"und laesst die bekannten Entscheidungen stehen",K3);

 // Verdrahtung: die Startseite bereitet VOR dem Zeichnen der Karte vor.
 // Ohne Kommentare gelesen: im Kommentar daneben stehen beide Namen auch.
 const a2Quelle=nurCode(lies("js/70-ansicht2.js"));
 p(a2Quelle.indexOf("konKarteVorbereiten()")>=0
   &&a2Quelle.indexOf("konKarteVorbereiten()")<a2Quelle.indexOf("konKarteHtml()"),
   "js/70 holt die Entscheidungen, bevor es die Karte zeichnet");

 // ---- I  Sauberkeit --------------------------------------------------------
 // ---- L · Position ohne Produkt im Lager (v3.224) -----------------------
 console.log("\nL · Die Kontrolle \u201ePosition ohne Produkt\u201c ist WEG (v3.251)");
 // Hier standen drei Pruefungen zur Kontrolle "position-ohne-produkt"
 // (v3.224). Sie verglich den Material-Katalog mit lager_varianten - den
 // Produkten der alten Lagerverwaltung. Die ist abgeschafft; es gibt keine
 // Produkte mehr, zu denen eine Position fehlen koennte.
 //
 // Abschnitt L ist deshalb nicht geloescht, sondern GEDREHT. Was er jetzt
 // festhaelt, ist die eigentliche Gefahr beim Abschaffen: eine Kontrolle,
 // die stehen bleibt, nachdem ihre Grundlage weg ist, meldet fuer immer
 // "alles in Ordnung". Das ist schlimmer als keine Kontrolle - sie wird
 // geglaubt. Genau davor warnte schon der Kommentar zu L1: ohne geladene
 // Lagerdaten durfte sie NICHTS melden, und die leere Liste war deshalb ein
 // "weiss nicht", kein "nichts gefunden". Ohne Lagerverwaltung ist das
 // "weiss nicht" dauerhaft - also muss sie weg sein, und das wird gemessen.
 const L=await page.evaluate(()=>{
  const alle=(typeof KON_PRUEFUNGEN!=="undefined"?KON_PRUEFUNGEN:[])
    .map(x=>String(x.schluessel));
  return {alle,
    weg:alle.indexOf("position-ohne-produkt")<0,
    // Keine Kontrolle darf noch auf die Tabellen der alten Lagerverwaltung
    // zeigen - ueber einen Namen, der ins Leere faellt, oder ueber einen
    // Abschnitt, der nicht mehr existiert.
    reste:(typeof KON_PRUEFUNGEN!=="undefined"?KON_PRUEFUNGEN:[])
      .filter(x=>/lager_varianten|lagerVarianten|lagerverwaltung/
        .test(String(x.finden||"")+String(x.abschnitt||"")+String(x.tab||"")))
      .map(x=>String(x.schluessel)),
    // Und es gibt sie im Katalog der Kontrollen nicht mehr - auch nicht als
    // Abweisung, die auf eine Pruefung zeigt, die keiner mehr findet.
    anzahl:alle.length};
 });
 p(L.weg,
   "L1 die Kontrolle \u201eposition-ohne-produkt\u201c steht nicht mehr im Katalog - ihre Grundlage ist weg, und eine Kontrolle ohne Grundlage meldet fuer immer gruen",L.alle.length);
 p(L.reste.length===0,
   "L2 GEGENPROBE: keine andere Kontrolle zeigt noch auf die Tabellen oder den Abschnitt der alten Lagerverwaltung",L.reste);
 // Gegenprobe gegen das Gegenteil des Fehlers: beim Entfernen darf nicht
 // der halbe Katalog mitgegangen sein. Geprueft werden die Schluessel, nicht
 // eine Zahl - eine Zahl waere beim naechsten Zuwachs falsch, ohne dass
 // etwas kaputt waere.
 p(["blech-ohne-werkstoff","werkstoff-ohne-dila","tafel-ohne-mass",
    "position-ohne-einheit","position-ohne-preis","blech-mehrdeutig",
    "rest-unter-mindestmass","werkstoff-ohne-blech","position-nie-benutzt",
    "lieferant-groesse-widerspruch","lieferant-negativer-bestand"]
   .every(k=>L.alle.indexOf(k)>=0),
   "L3 GEGENPROBE: und jede andere Kontrolle steht unveraendert im Katalog",L.alle);

 console.log("\nL2 \u00b7 \u201ePosition, die nie vorkam\u201c sieht wieder etwas (v3.251)");
 // GEMESSENER FEHLER, bei der Abschaffung aufgefallen - und er bestand schon
 // vorher. Die Pruefung galt eine Position als benutzt, sobald es ein
 // Lager-Produkt dazu gab (lager_varianten). Seit v3.224 legt ein Trigger
 // aber JE POSITION automatisch eine Variante an: an der Produktivdatenbank
 // gemessen 760 Positionen, 760 mit Variante, keine ohne. Die Pruefung
 // meldete damit NIE etwas - nicht weil alles in Ordnung war, sondern weil
 // ihre Grundlage nichts aussagte.
 const L2=await page.evaluate(()=>{
  const quelle=String(konDatenLaden);
  return {
   quelle,
   liestVarianten:/lager_varianten/.test(quelle),
   liestLagerbestand:/from\("lagerbestand"\)/.test(quelle),
   liestReste:/reststuecke/.test(quelle)};
 });
 p(!L2.liestVarianten,
   "L2a die Grundlage liest lager_varianten NICHT mehr - eine Variante je Position belegt keine Verwendung",L2.liestVarianten);
 p(!L2.liestLagerbestand,
   "L2b und lagerbestand ebenso nicht - 6 Zeilen, alle mit Menge 0",L2.liestLagerbestand);
 p(L2.liestReste,
   "L2c was BELEGT wird weiterhin gelesen: ein Reststueck aus diesem Material",L2.liestReste);
 // Und die Pruefung muss wirklich wieder etwas finden koennen.
 const L3=await page.evaluate(()=>{
  // Auf dem Stand KAPUTT: dort deckt das Zaehlwerk sechs der sieben echten
  // Positionen ab - 601.01 bleibt uebrig und ist genau der Fall, den die
  // Pruefung finden soll.
  window.__kaputt();
  const vorher=konLagerArtikel;
  const katalog=konKatalog().filter(x=>x.id!=null);
  konLagerArtikel=new Set();
  const ohneAlles=window.__offen("position-nie-benutzt");
  konLagerArtikel=new Set(katalog.map(x=>String(x.id)));
  const alleBelegt=window.__offen("position-nie-benutzt");
  konLagerArtikel=vorher;
  return {ohneAlles:ohneAlles?ohneAlles.length:null,
          alleBelegt:alleBelegt?alleBelegt.length:null,
          katalog:katalog.length};
 });
 p(L3.ohneAlles>0,
   "L2d ohne jeden Belegt-Nachweis meldet sie wieder etwas - das konnte sie bis v3.250 nicht",L3);
 p(L3.alleBelegt===0,
   "L2e GEGENPROBE: liegt zu jeder Position ein Reststueck, meldet sie nichts",L3);

 console.log("\nM · Lieferanten-Lager (v3.247)");
 // Aufgenommen sind BEWUSST nur zwei Zustaende - die, die man sonst nicht
 // sieht. "158 Artikel ohne Regie-Position" und "Gruppen ohne Muster" stehen
 // schon am Knopf und im Kopf der Zuordnen-Ansicht; sie hier zu wiederholen
 // waere eine zweite Wahrheit ueber dieselbe Zahl. M7 haelt das fest.
 const M=await page.evaluate(()=>{
  // Modulebene, OHNE window-Vorsatz - derselbe Grund wie bei L.
  const vorA=(typeof lfArtikel!=="undefined")?lfArtikel:null;
  const vorB=(typeof lfBewegungen!=="undefined")?lfBewegungen:null;
  const vorG=(typeof lfGeladen!=="undefined")?lfGeladen:null;
  const o=s=>window.__offen(s);

  // Ein Regie-Katalog mit einer 333er-Position.
  settings.materials=[["201.12","Dachrinnen halbrund Titanzink","333","m1",22]];
  materialIds=[7012];

  // 1) Lager NICHT geladen: beide Pruefungen melden NICHTS und sagen warum.
  lfGeladen=false;
  lfArtikel=[{id:1,lieferant:"B-Team",artikelnr:"D400",
    bezeichnung:"Dachrinnen 400x0.7 mm Titanzink",zuschnitt_mm:400,material_id:7012}];
  lfBewegungen=[{id:1,artikel_id:1,art:"abgang",menge:3}];
  lfVorschlagCache={};
  const ungeladen={gr:o("lieferant-groesse-widerspruch"), neg:o("lieferant-negativer-bestand")};
  const texte=konBefunde().filter(b=>b.gruppe==="Lieferanten-Lager")
    .map(b=>({moeglich:b.moeglich,nichtMoeglich:b.nichtMoeglich}));

  // 2) Geladen: jetzt muessen genau beide Faelle dastehen.
  lfGeladen=true;
  const geladen={gr:o("lieferant-groesse-widerspruch"), neg:o("lieferant-negativer-bestand")};

  // 3) Gegenprobe: passende Groesse und ein Zugang -> nichts mehr.
  lfArtikel=[{id:1,lieferant:"B-Team",artikelnr:"D333",
    bezeichnung:"Dachrinnen 333x0.7 mm Titanzink",zuschnitt_mm:333,material_id:7012}];
  lfBewegungen=[{id:1,artikel_id:1,art:"zugang",menge:5}];
  lfVorschlagCache={};
  const sauber={gr:o("lieferant-groesse-widerspruch"), neg:o("lieferant-negativer-bestand")};

  // 4) Ein Artikel OHNE Zuordnung ist kein Groessen-Widerspruch.
  lfArtikel=[{id:1,lieferant:"B-Team",artikelnr:"D400",
    bezeichnung:"Dachrinnen 400x0.7 mm Titanzink",zuschnitt_mm:400}];
  lfVorschlagCache={};
  const ohneZuordnung=o("lieferant-groesse-widerspruch");

  // 5) Und ein archivierter Artikel zaehlt nicht mit.
  lfArtikel=[{id:1,lieferant:"B-Team",artikelnr:"D400",archiviert:true,
    bezeichnung:"Dachrinnen 400x0.7 mm Titanzink",zuschnitt_mm:400,material_id:7012}];
  lfBewegungen=[{id:1,artikel_id:1,art:"abgang",menge:3}];
  lfVorschlagCache={};
  const archiviert={gr:o("lieferant-groesse-widerspruch"), neg:o("lieferant-negativer-bestand")};

  const schweren=konBefunde().filter(b=>b.gruppe==="Lieferanten-Lager")
    .map(b=>({s:b.schluessel,schwere:b.schwere,abweisbar:b.abweisbar,
              eigenerWeg:typeof (KON_PRUEFUNGEN.find(x=>x.schluessel===b.schluessel)||{}).oeffnen==="function"}));

  if(vorA!==null)lfArtikel=vorA;
  if(vorB!==null)lfBewegungen=vorB;
  if(vorG!==null)lfGeladen=vorG;
  return {ungeladen,texte,geladen,sauber,ohneZuordnung,archiviert,schweren,
          anzahl:konBefunde().filter(b=>b.gruppe==="Lieferanten-Lager").length};
 });
 p(M.ungeladen.gr.length===0&&M.ungeladen.neg.length===0,
   "M1 GEGENPROBE: ohne geladenes Lager melden beide Pruefungen NICHTS - die leere Liste waere sonst die Auskunft 'alles in Ordnung'",M.ungeladen);
 p(M.texte.length===2&&M.texte.every(t=>t.moeglich===false&&/nicht geladen/.test(t.nichtMoeglich)),
   "M2 und sie sagen, WARUM sie nicht laufen - statt stumm leer zu bleiben",M.texte);
 p(M.geladen.gr.length===1&&M.geladen.neg.length===1,
   "M3 geladen: die 400er Rinne auf der 333er Position UND der negative Bestand stehen da",M.geladen);
 p(M.sauber.gr.length===0&&M.sauber.neg.length===0,
   "M4 GEGENPROBE: passende Groesse und ein Zugang - keine Meldung mehr",M.sauber);
 p(M.ohneZuordnung.length===0,
   "M5 GEGENPROBE: ein Artikel OHNE Regie-Position ist kein Groessen-Widerspruch - das ist die andere Frage",M.ohneZuordnung);
 p(M.archiviert.gr.length===0&&M.archiviert.neg.length===0,
   "M6 GEGENPROBE: ein archivierter Artikel zaehlt in beiden nicht mit",M.archiviert);
 p(M.anzahl===2,
   "M7 es sind GENAU zwei Pruefungen - 'ohne Regie-Position' und 'Gruppe ohne Muster' stehen schon am Knopf und im Zuordnen-Kopf; hier waeren sie eine zweite Wahrheit",M.anzahl);
 const gw=M.schweren.find(x=>x.s==="lieferant-groesse-widerspruch");
 const nb=M.schweren.find(x=>x.s==="lieferant-negativer-bestand");
 p(gw&&gw.schwere==="fehler"&&gw.abweisbar===true,
   "M8 der Groessen-Widerspruch ist ein FEHLER (falscher Preis auf der Rechnung), aber abweisbar - es kann fachlich gewollt sein",gw);
 p(nb&&nb.schwere==="fehler"&&nb.abweisbar===false,
   "M9 der negative Bestand ist NICHT abweisbar - eine falsche Zahl bleibt falsch, behoben wird sie mit einer Buchung",nb);
 p(gw&&gw.eigenerWeg&&nb&&nb.eigenerWeg,
   "M10 beide tragen einen eigenen Weg zum Oeffnen - das Lieferanten-Lager liegt nicht in den Einstellungen",M.schweren);
 p(/p\.oeffnen==="function"/.test(lies("js/75-kontrollen.js")),
   "M11 und der vorhandene Sprung wurde ERWEITERT, nicht verdoppelt",null);

 console.log("\nI · Sauberkeit");
 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler);

 await b.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();
