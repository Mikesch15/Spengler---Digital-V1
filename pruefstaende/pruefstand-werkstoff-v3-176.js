// Prueft v3.176: Werkstoff, Artikel und Bestand sauber getrennt.
//
// GEMELDET
// "Material in Massaufnahme und Materialbestand in Lager sind fast
// dasselbe, das muesste man irgendwie vereinen koennen sonst wirds
// kompliziert."
//
// BEFUND
// Es sind DREI Dinge, nicht zwei:
//   Werkstoff (measurement_materials) - Kupfer, Titanzink. Traegt die
//     Dehnungswerte, steuert die Massaufnahme.
//   Artikel (materials) - EDV-Nr., Preis. Steuert die Verrechnung.
//   Bestand (lagerbestand) - Staerke, Rolle/Tafel. Steuert den Zuschnitt.
// Verschmelzen wuerde die Dehnungswerte ueber 381 Positionen duplizieren
// oder Werkstoffe unwaehlbar machen, die nicht am Lager liegen (vier von
// sechs). Doppelt war etwas anderes - und das ist hier behoben.
//
// WAS HIER GEPRUEFT WIRD
//   A  Stufe 1: der NAME steht nur noch an einer Stelle. Bis hierher trug
//      die Lagerzeile eine Kopie des Katalognamens, und die war bereits
//      auseinandergelaufen ("Cava-Band Kupfer" gegen "Cava-Band").
//   B  Stufe 2: ein Wort, eine Bedeutung. In der Massaufnahme heisst das
//      Feld Werkstoff; Rapport und Katalog behalten "Material".
//   C  Stufe 3: woraus ein Artikel ist, steht am Artikel - nicht mehr nur
//      an der Lagerzeile.
//   D  Die Zusicherung: der Zuschnitt rechnet UNVERAENDERT weiter.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-werkstoff-v3-176.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 // Der echte Fall aus den Daten der Firma: Katalog "Cava-Band Kupfer",
 // an der Lagerzeile stand noch das aeltere "Cava-Band".
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"c1"};
  meineRechte={admin:true};
  measurementMaterials=[{id:3,name:"Kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
                        {id:2,name:"Titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500}];
  settings.materials=[["111.02","Cava-Band Kupfer","0.6","m1",28.9],
                      ["205.00","Dichtband","","m1",4.2]];
  materialIds=[901,902];
  materialWerkstoffe=[3,null];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 // ---- A  Stufe 1: der Name ------------------------------------------------
 const A=await page.evaluate(()=>({
  mitArtikel:lagBeschreibung({artikel_id:901,bezeichnung:"Cava-Band",
                              material_id:3,staerke_mm:0.6,form:"rolle"}),
  ohneArtikel:lagBeschreibung({artikel_id:null,bezeichnung:"Eigenes Blech",
                               material_id:3,staerke_mm:0.7}),
  ohneBeides:lagBeschreibung({artikel_id:null,bezeichnung:null,material_id:3}),
  ganzLeer:lagBeschreibung({artikel_id:null,bezeichnung:null,material_id:null})
 }));
 p(/^Cava-Band Kupfer/.test(A.mitArtikel),
   "A1 mit Artikel gilt der KATALOGname - nicht die aeltere Kopie an der "
   +"Lagerzeile. Genau dieser Fall war in den Daten schon auseinandergelaufen",A);
 p(/^Eigenes Blech/.test(A.ohneArtikel),
   "A2 traegt ein Datensatz noch einen eigenen Namen, wird er weiterhin "
   +"angezeigt - lagBeschreibung() ist eine reine Anzeigefunktion und laesst "
   +"nichts fallen. Erzeugt wird ein solcher Satz seit v3.177 nicht mehr",A);
 p(/^Kupfer/.test(A.ohneBeides),
   "A3 ohne beides der Werkstoffname",A);
 p(/^Material/.test(A.ganzLeer),"A4 und ganz ohne Angabe ein neutrales Wort",A);

 // v3.177 hat diesen Vertrag VERSCHAERFT, nicht aufgeweicht. Bis v3.176 gab
 // es neben dem Artikel noch ein freies Bezeichnungsfeld - den Rueckfall
 // fuer Eintraege OHNE Artikel. Seit das Format am Artikel haengt
 // (Migration artikel_traegt_sein_blechformat), kann ein Eintrag ohne
 // Artikel gar nicht mehr entstehen: er haette keinen Ort. Damit faellt das
 // Feld weg - und mit ihm die letzte Stelle, an der eine Namenskopie
 // ueberhaupt haette eingetragen werden koennen.
 //
 // Geprueft wird deshalb ab hier das schaerfere Versprechen: das Formular
 // kennt den Schluessel bezeichnung ueberhaupt nicht mehr, und ein Eintrag
 // ohne Artikel wird nicht gespeichert, sondern abgewiesen.
 const A5=await page.evaluate(async()=>{
  // Beide Artikel OHNE Format: es wird ein NEUER Eintrag angelegt. Ein
  // Artikel, der bereits als Blech gefuehrt wird, steht seit v3.177
  // absichtlich nicht mehr in der Auswahl - er hat seinen Eintrag ja schon.
  materialFormate=[{staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null},
                   {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null}];
  lagFormularOeffnen({});
  await new Promise(f=>setTimeout(f,150));
  const setz=(id,v)=>{const el=$(id);if(el){el.value=v;el.dispatchEvent(new Event("change",{bubbles:true}))}};
  setz("lag_artikel","901"); setz("lag_material","3");
  await new Promise(f=>setTimeout(f,150));
  const werte=lagFormularWerte();
  const katalogText=($("lag_bezAusKatalog")||{}).textContent||"";
  const eingabefeldWeg=$("lag_bezeichnung")===null;
  // Ohne Artikel: speichern muss abgewiesen werden, mit sichtbarem Grund.
  setz("lag_artikel","");
  await new Promise(f=>setTimeout(f,150));
  const artikelIdLeer=lagFormularArtikelId();
  await lagSpeichern();
  const meldung=($("lagerFormFehler")||{}).textContent||"";
  const modalNochOffen=!$("lagerFormModal").hidden;
  lagFormularSchliessen();
  return {schluessel:Object.keys(werte),katalogText,eingabefeldWeg,
          artikelIdLeer,meldung,modalNochOffen};
 });
 p(A5.schluessel.indexOf("bezeichnung")<0,
   "A5 das Formular kennt keinen Schluessel bezeichnung mehr - die Kopie "
   +"kann nicht einmal mehr versehentlich entstehen",A5);
 p(A5.eingabefeldWeg===true&&/Cava-Band Kupfer/.test(A5.katalogText),
   "A6 statt eines Eingabefelds steht der Katalogname da, zum Lesen",A5);
 p(A5.artikelIdLeer===null&&A5.modalNochOffen===true&&/Artikel/.test(A5.meldung),
   "A7 GEGENPROBE: ohne Artikel wird NICHT gespeichert - der Eintrag haette "
   +"keinen Ort, und das wird gesagt statt still danebengelegt",A5);

 // ---- B  Stufe 2: ein Wort, eine Bedeutung --------------------------------
 const module=[["js/28-rinne-aufnahme.js","Rinne halbrund"],
   ["js/29-einlaufblech-aufnahme.js","Einlaufblech gerade"],
   ["js/30-einlaufblech-konisch-aufnahme.js","Einlaufblech konisch"],
   ["js/31-freies-profil-aufnahme.js","Freies Profil"],
   ["js/32-mauerabdeckung-aufnahme.js","Mauerabdeckung"],
   ["js/34-kehle-aufnahme.js","Kehle"],["js/36-lukarne-aufnahme.js","Lukarne"],
   ["js/37-kamin-aufnahme.js","Kamineinfassung"],
   ["js/38-einfassung-aufnahme.js","Einfassung rund"],
   ["js/66-dachfenster-aufnahme.js","Dachfenstereinfassung"]];
 const nochMaterial=module.filter(([f])=>/Feld\("Material"/.test(lies(f)));
 const schonWerkstoff=module.filter(([f])=>/Feld\("Werkstoff"/.test(lies(f)));
 p(schonWerkstoff.length===10&&nochMaterial.length===0,
   "B1 alle zehn Aufnahme-Module beschriften das Feld mit Werkstoff",
   {nochMaterial:nochMaterial.map(x=>x[1])});
 const idx=lies("index.html");
 p(/<label>Werkstoff<\/label><select id="anb_material"/.test(idx)
   &&/<label>Werkstoff<\/label><select id="rp_material"/.test(idx),
   "B2 die zwei fest im HTML stehenden Felder (Ort-/Seitenbleche, Rinne) ebenso");
 p(/<h2>Werkstoffe /.test(idx),
   "B3 und die Einstellungen-Karte, in der sie gepflegt werden");
 p(/<label>Material<\/label>/.test(idx)||/placeholder="Material"/.test(idx),
   "B4 Gegenprobe: im Regierapport und im Katalog heisst Material weiter "
   +"Material - umbenannt wird nur, was der Werkstoff IST");
 p(!/Materialart/.test(lies("js/59-lagerbestand.js")),
   "B5 im Materialbestand heisst die Auswahl nicht mehr Materialart");

 // ---- C  Stufe 3: der Werkstoff am Artikel --------------------------------
 const C=await page.evaluate(()=>({
  mitWerkstoff:artikelWerkstoffId(901),
  ohneWerkstoff:artikelWerkstoffId(902),
  unbekannt:artikelWerkstoffId(9999),
  nichts:artikelWerkstoffId(null),
  optionen:(typeof werkstoffOptionen==="function")?werkstoffOptionen(3):""
 }));
 p(String(C.mitWerkstoff)==="3","C1 ein Artikel nennt seinen Werkstoff",C);
 p(C.ohneWerkstoff===null,
   "C2 ein Artikel ohne Werkstoff (Dichtband) liefert null - es wird keiner "
   +"geraten",C);
 p(C.unbekannt===null&&C.nichts===null,
   "C3 dasselbe bei unbekannter oder fehlender Id",C);
 p(/Kupfer/.test(C.optionen)&&/Titanzink/.test(C.optionen)
   &&/– keiner –/.test(C.optionen)&&/value="3" selected/.test(C.optionen),
   "C4 die Auswahl im Katalog kennt alle Werkstoffe, hat ein ausdrueckliches "
   +"\"keiner\" und zeigt den hinterlegten an",C.optionen);
 const C5=await page.evaluate(()=>{
  const vorher=werkstoffOptionen(null);
  measurementMaterials=measurementMaterials.concat([{id:7,name:"Bleiblech"}]);
  const nachher=werkstoffOptionen(7);
  measurementMaterials=measurementMaterials.filter(w=>w.id!==7);
  return {vorher,nachher};
 });
 p(!/Bleiblech/.test(C5.vorher)&&/Bleiblech/.test(C5.nachher)
   &&/value="7" selected/.test(C5.nachher),
   "C5 ein neuer Werkstoff steht sofort auch im Katalog zur Wahl - beide "
   +"kommen aus derselben Quelle. Eine zweite, eigene Liste waere eine "
   +"zweite Meinung darueber, welche Werkstoffe es gibt",C5);
 p(/data-set-mwerkstoff/.test(lies("js/07-einstellungen.js")),
   "C6 jede Katalogzeile traegt die Auswahl");
 p(/materialWerkstoffe=materials\.map\(m=>m\.werkstoff_id/.test(lies("js/05-daten-laden.js")),
   "C7 werkstoff_id wird beim Anmelden mitgeladen");
 p(/dataset\.setMwerkstoff/.test(lies("js/08-katalog-blitzschutz.js"))
   &&/werkstoff_id:wert/.test(lies("js/08-katalog-blitzschutz.js")),
   "C8 und eine Aenderung wird gespeichert");

 // ---- D  Die Zusicherung --------------------------------------------------
 // Bis v3.176 hiess die Zusicherung: "der Zuschnitt ist NOCH NICHT
 // umgestellt". Mit v3.177 ist er es - auf Entscheid des Betriebs. Die
 // Zusicherung lautet deshalb jetzt: es gibt nur noch EINE Quelle, und der
 // Zuschnitt greift nirgends mehr an der alten Tabelle vorbei.
 //
 // Geprueft wird am CODE, nicht am Kommentar: die alte Fassung dieser Pruefung
 // suchte das blosse Wort "lagerbestand" im Funktionsrumpf und wurde dadurch
 // gruen, sobald das Wort in einem Kommentar stand. Hier wird deshalb auf den
 // Array-Zugriff geprueft, den es nur im Code gibt.
 const reste=lies("js/42-reste.js");
 // Kommentare UND Zeichenketten werden entfernt, danach darf der Bezeichner
 // schlicht nicht mehr vorkommen. Eine feinere Regel auf die Zugriffsform
 // ("lagerbestand." / "lagerbestand[") ging bereits einmal daneben: sie
 // uebersah (lagerbestand||[]) und blieb gruen, obwohl der alte Zugriff
 // wieder drin stand.
 const codeNur=reste
   .replace(/\/\*[\s\S]*?\*\//g,"")
   .replace(/\/\/[^\n]*/g,"")
   .replace(/"(?:[^"\\]|\\.)*"/g,'""')
   .replace(/'(?:[^'\\]|\\.)*'/g,"''");
 p(!/\blagerbestand\b(?!_)/.test(codeNur),
   "D1 js/42 greift nirgends mehr auf das Array lagerbestand zu - Kommentare "
   +"und Texte zaehlen dabei nicht, gesucht wird der Bezeichner im Code");
 p(/lagFormate\(\)/.test(reste),
   "D2 gerechnet wird ueber lagFormate() - die eine Quelle, die den Artikel "
   +"mit seinem Format liefert");

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
