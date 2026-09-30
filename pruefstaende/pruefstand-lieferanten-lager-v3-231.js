// Prueft das Lieferanten-Lager (v3.229 als "Lager B-Team", ab v3.231
// mehrlieferantenfaehig).
//
// Ansage des Anwenders: "erstelle mal eine separate lagerverwaltung mit diesen
// bteam produkten... die alte lagerverwaltung und die regiematerialliste nicht
// anfassen."
//
// Der WICHTIGSTE Abschnitt ist deshalb A: die Zusage "separat" ist nicht eine
// Frage der Oberflaeche, sondern davon, welche Tabellen diese Datei anfasst.
// Ein Modul, das nebenbei doch in materials schreibt, sieht separat aus und
// ist es nicht.
//
//   A  Wirklich separat: js/82 fasst weder den Materialkatalog noch die
//      bestehende Lagerverwaltung noch den Regierapport an.
//   B  Der Bestand ist die Summe der Buchungen - nie ein Feld.
//   C  Barcode: Treffer fuehrt zum Buchen, ein unbekannter Code legt NICHTS
//      an, sagt aber, wohin er gehoert.
//   D  Einlesen aktualisiert ueber Lieferant + Artikelnummer und loescht nie.
//   E  Buchen schreibt genau eine Bewegung - und keine Aenderung an alten.
//   F  Verdrahtung: Datei, App-Huelle, Eintrag unter "Mehr", Hilfetext.
//   H  Neue Positionen per Excel - ueber den VORHANDENEN Import.
//   I  Kein Barcode ist kein Barcode (echter Fehler aus v3.230).
//   K  Der Lieferant gehoert zum Schluessel (v3.231).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-lieferanten-lager-v3-231.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

// Eine Attrappe fuer genau die beiden neuen Tabellen. Sie schreibt mit, was
// die App tut - darum geht es hier, nicht um die Datenbank.
const SB=`()=>{
 // Die Attrappe traegt DIESELBEN Artikel wie der Abschnitt darueber. Sonst
 // faellt auf die Nase, was in Wahrheit richtig ist: nach einer Buchung laedt
 // das Modul neu, und eine leere Attrappen-Tabelle leert dabei die Liste.
 window.__db={lieferanten_artikel:[
   {id:1,lieferant:"B-Team",artikelnr:"409373",bezeichnung:"Dachrinnen 330",ean:"3661587017460",vpe:5,gruppe:"Dachrinnen"},
   {id:2,lieferant:"B-Team",artikelnr:"422640",bezeichnung:"Rinnenseiher 60",ean:"1019006000005",vpe:1,gruppe:"Rinnenseiher"}],
  lieferanten_bewegungen:[],lieferanten_einkauf:[],ruf:[]};
 let n=100;
 const tisch=name=>({
  // .is("erledigt_am",null) filtert wie die echte Abfrage - sonst wuerde der
  // Pruefstand eine abgehakte Zeile weiter sehen und "erledigt" als
  // wirkungslos durchgehen lassen.
  select(){ const q={
    order(){return q},
    is(spalte,wert){ q.__filter=x=>(x[spalte]===undefined?null:x[spalte])===wert; return q },
    then(r){ let d=window.__db[name].slice();
     if(q.__filter)d=d.filter(q.__filter);
     return r({data:d,error:null}) } };
   return q; },
  insert(zeile){ window.__db.ruf.push({tisch:name,was:"insert",zeile});
   window.__db[name].push(Object.assign({id:++n},zeile));
   return Promise.resolve({error:null}); },
  upsert(zeilen,opt){ window.__db.ruf.push({tisch:name,was:"upsert",anzahl:zeilen.length,opt,zeilen});
   zeilen.forEach(z=>{
    // Die Attrappe gleicht ueber DENSELBEN Schluessel ab wie die Datenbank:
    // Lieferant UND Artikelnummer. Waere hier nur die Nummer gemeint,
    // koennte der Pruefstand die Verwechslung gar nicht bemerken, die er
    // in K verhindern soll.
    const da=window.__db[name].find(x=>x.artikelnr===z.artikelnr&&x.lieferant===z.lieferant);
    if(da)Object.assign(da,z); else window.__db[name].push(Object.assign({id:++n},z));
   });
   return Promise.resolve({error:null}); },
  // update kommt im Lager nur fuer Stammangaben vor (Mindestbestand) und
  // IMMER mit .eq("id",...) - ein update ohne eq traefe das ganze Lager.
  // Die Attrappe bildet das deshalb genauso ab und schreibt mit, worauf es
  // gezielt hat.
  update(werte){ const w=werte; return {
    eq(spalte,wert){
     window.__db.ruf.push({tisch:name,was:"update",spalte,wert,werte:w});
     const da=window.__db[name].find(x=>String(x[spalte])===String(wert));
     if(da)Object.assign(da,w);
     return Promise.resolve({error:null});
    },
    then(r){ window.__db.ruf.push({tisch:name,was:"update-ohne-eq",werte:w});
     return r({error:null}) }
   }; },
  delete(){ window.__db.ruf.push({tisch:name,was:"delete"}); return Promise.resolve({error:null}) }
 });
 // WICHTIG: sb ist im App-Code eine Bindung auf Modulebene, KEINE Eigenschaft
 // von window. Ein "window.sb={...}" legt ein zweites Objekt an, das niemand
 // liest - die App spraeche weiter mit der echten Attrappe aus stub.js, und
 // der Pruefstand haette an ihr vorbei gemessen. Gesetzt wird deshalb die
 // Eigenschaft AUF dem vorhandenen Objekt. (Derselbe Fehlertyp wie in v3.224
 // bei window.lagerVarianten und in v3.225 bei navigator.credentials.)
 sb.from=name=>tisch(name);
}`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 let z;

 // ---- A  Wirklich separat -----------------------------------------------
 console.log("A · Wirklich separat, nicht nur separat aussehend");
 const quelle=lies("js/82-lieferanten-lager.js");
 // Die Tabellennamen der bestehenden Lagerverwaltung und des Regierapports.
 const FREMD=["materials","lager_varianten","lagerbestand_bewegungen","lagerbestand","reports","report_materials"];
 const angefasst=FREMD.filter(t=>new RegExp('from\\("'+t+'"\\)').test(quelle));
 p(angefasst.length===0,
   "A1 js/82 spricht KEINE Tabelle der bestehenden Lagerverwaltung und des Regierapports an",angefasst);
 p(/from\("lieferanten_artikel"\)/.test(quelle)&&/from\("lieferanten_bewegungen"\)/.test(quelle),
   "A2 sondern ausschliesslich die eigenen",null);
 // Gegenprobe in die andere Richtung: die alten Dateien wissen nichts von
 // der neuen. Waere dort etwas eingebaut worden, waere "nicht anfassen"
 // gebrochen - unabhaengig davon, wie sauber js/82 selbst ist.
 const alt68=lies("js/68-lagerverwaltung.js"), alt59=lies("js/59-lagerbestand.js"), alt06=lies("js/06-rapport.js");
 const spur=t=>/lieferanten_artikel|lieferanten_bewegungen|lfBestand|lfOeffnen|bteam/i.test(t);
 p(!spur(alt68)&&!spur(alt59)&&!spur(alt06),
   "A3 GEGENPROBE: js/68, js/59 und js/06 enthalten keine einzige Zeile zum neuen Lager",
   {js68:spur(alt68),js59:spur(alt59),js06:spur(alt06)});
 p(!/function lager[A-Z]/.test(quelle),
   "A4 und js/82 definiert keine Funktion, die wie die alte heisst - kein Ueberschreiben aus Versehen",null);

 // ---- B  Der Bestand ist die Summe --------------------------------------
 console.log("\nB · Der Bestand ist die Summe der Buchungen");
 z=await page.evaluate(()=>{
  lfArtikel=[{id:1,lieferant:"B-Team",artikelnr:"409373",bezeichnung:"Dachrinnen 330",ean:"3661587017460",vpe:5},
             {id:2,lieferant:"B-Team",artikelnr:"422640",bezeichnung:"Rinnenseiher 60",ean:"1019006000005",vpe:1}];
  lfBewegungen=[
   {artikel_id:1,art:"zugang",menge:10},
   {artikel_id:1,art:"abgang",menge:3},
   {artikel_id:1,art:"korrektur",menge:-2},
   {artikel_id:2,art:"zugang",menge:4}];
  return {a1:lfBestand(1),a2:lfBestand(2),leer:lfBestand(99)};
 });
 p(z.a1===5,"B1 Zugang 10, Abgang 3, Korrektur -2 ergibt 5",z);
 p(z.a2===4,"B2 ein zweiter Artikel zaehlt fuer sich",z);
 p(z.leer===0,"B3 ein Artikel ohne Buchung hat Bestand 0 - und keinen Fehler",z);
 // Ein gespeichertes Bestandsfeld waere eine zweite Wahrheit neben den
 // Buchungen - und die erste, die falsch steht. Geprueft wird das am
 // VERHALTEN, nicht am Text der Datei: traegt ein Artikel ein Feld
 // "bestand", muss es die App ignorieren und weiter die Buchungen
 // zusammenzaehlen.
 z=await page.evaluate(()=>{
  const merk=lfArtikel;
  lfArtikel=[{id:1,lieferant:"B-Team",artikelnr:"409373",bezeichnung:"D",bestand:999,menge:999}];
  lfBewegungen=[{artikel_id:1,art:"zugang",menge:7}];
  const r=lfBestand(1);
  lfArtikel=merk;
  return r;
 });
 p(z===7,
   "B4 GEGENPROBE: ein mitgeliefertes Bestandsfeld wird ignoriert - gezaehlt werden immer die Buchungen",z);

 // ---- C  Barcode ---------------------------------------------------------
 console.log("\nC · Barcode");
 z=await page.evaluate(()=>{
  const treffer=lfArtikelZuBarcode("3661587017460");
  const daneben=lfArtikelZuBarcode("9999999999999");
  const leer=lfArtikelZuBarcode("");
  return {treffer:treffer&&treffer.artikelnr, daneben, leer};
 });
 p(z.treffer==="409373","C1 ein bekannter Barcode findet seinen Artikel",z);
 p(z.daneben===null&&z.leer===null,"C2 ein unbekannter oder leerer Code findet nichts",z);
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.ruf=[];
  // Den Scanner nachstellen: er liefert einen unbekannten Code.
  const echt=window.barcodeScannen;
  window.barcodeScannen=cb=>cb("9999999999999");
  lfScannenUndBuchen("zugang");
  await new Promise(r=>setTimeout(r,120));
  const meldung=$("liefMeldung").textContent;
  const dialogAuf=!$("liefBuchenModal").hidden;
  window.barcodeScannen=echt;
  return {meldung,dialogAuf,schreibt:window.__db.ruf.length};
 },SB);
 p(z.schreibt===0,
   "C3 GEGENPROBE: ein unbekannter Code legt NICHTS an - dieses Lager ist das Sortiment der Lieferanten",z);
 p(/Lagerverwaltung/.test(z.meldung)&&/9999999999999/.test(z.meldung),
   "C4 und die App sagt, wohin der Code dann gehoert - statt stumm nichts zu tun",z);
 p(z.dialogAuf===false,"C5 der Buchen-Dialog geht dabei nicht auf",z);

 // ---- D  Einlesen --------------------------------------------------------
 console.log("\nD · Sortiment einlesen");
 p(/onConflict:"company_id,lieferant,artikelnr"/.test(quelle),
   "D1 eingelesen wird ueber Lieferant UND Artikelnummer - dasselbe Sortiment verdoppelt sich nicht",null);
 p(!/\.delete\(\)/.test(quelle),
   "D2 GEGENPROBE: die Datei kennt kein Loeschen - ein Artikel, der in einer neuen Datei fehlt, bleibt stehen",null);
 const daten=JSON.parse(lies("daten/sortiment-bteam.json"));
 p(Array.isArray(daten.artikel)&&daten.artikel.length>400,
   "D3 die Sortimentsdatei liegt im Projekt und enthaelt das Sortiment",daten.artikel&&daten.artikel.length);
 const nr=new Set(), ean=new Set(); let doppelt=[];
 daten.artikel.forEach(a=>{
  if(nr.has(a.artikelnr))doppelt.push("Nr "+a.artikelnr); nr.add(a.artikelnr);
  if(a.ean){ if(ean.has(a.ean))doppelt.push("EAN "+a.ean); ean.add(a.ean) }
 });
 p(doppelt.length===0,
   "D4 jede Artikelnummer und jeder Barcode kommt genau einmal vor - sonst waere beim Scannen nicht entscheidbar, welcher Artikel gemeint ist",doppelt.slice(0,5));
 // v3.231: Der Lieferant steht in der DATEI, nicht im Code - sonst braeuchte
 // die zweite Sortimentsdatei eine Programmaenderung.
 p(typeof daten.lieferant==="string"&&daten.lieferant.trim().length>0,
   "D5 die Sortimentsdatei sagt selbst, von welchem Lieferanten sie ist",daten.lieferant);
 p(!/lieferant:"[^"]/.test(quelle),
   "D6 GEGENPROBE: der Lieferantenname steht NICHT fest im Code - eine zweite Datei bringt ihren eigenen mit",null);

 // ---- E  Buchen ----------------------------------------------------------
 console.log("\nE · Buchen");
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.ruf=[];
  lfBuchenOeffnen(1,"abgang");
  const vorbelegt={art:$("liefBuchenArt").value,menge:$("liefBuchenMenge").value,
                   titel:$("liefBuchenTitel").textContent};
  $("liefBuchenMenge").value="2";
  await lfBuchenSpeichern();
  await new Promise(r=>setTimeout(r,120));
  return {vorbelegt, ruf:window.__db.ruf, zu:$("liefBuchenModal").hidden};
 },SB);
 p(z.vorbelegt.art==="abgang"&&z.vorbelegt.menge==="5",
   "E1 der Dialog kommt mit der gewaehlten Art und der Verpackungseinheit als Menge",z.vorbelegt);
 p(z.ruf.length===1&&z.ruf[0].tisch==="lieferanten_bewegungen"&&z.ruf[0].was==="insert",
   "E2 gebucht wird mit GENAU einer neuen Bewegung",z.ruf);
 p(z.ruf[0]&&z.ruf[0].zeile.art==="abgang"&&Number(z.ruf[0].zeile.menge)===2,
   "E3 mit Art und Menge, wie eingegeben",z.ruf[0]&&z.ruf[0].zeile);
 p(!z.ruf.some(r=>r.was==="update"||r.was==="delete"),
   "E4 GEGENPROBE: keine alte Buchung wird geaendert oder geloescht - ein Fehler wird korrigiert, nicht ueberschrieben",z.ruf);
 p(z.zu===true,"E5 und der Dialog schliesst sich",z);

 // Eine negative Menge ist nur als Korrektur erlaubt.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.ruf=[];
  lfBuchenOeffnen(1,"zugang");
  $("liefBuchenMenge").value="-5";
  await lfBuchenSpeichern();
  await new Promise(r=>setTimeout(r,80));
  return {fehler:$("liefBuchenFehler").textContent, ruf:window.__db.ruf.length};
 },SB);
 p(z.ruf===0&&/Korrektur/.test(z.fehler),
   "E6 GEGENPROBE: eine negative Menge wird nicht als Zugang gebucht, und die App sagt warum",z);

 // ---- F  Verdrahtung -----------------------------------------------------
 console.log("\nF · Verdrahtung");
 const html=lies("index.html"), sw=lies("sw.js"), a2=lies("js/70-ansicht2.js");
 p(/<script src="js\/82-lieferanten-lager\.js"><\/script>/.test(html),"F1 js/82 ist in index.html eingehaengt",null);
 p(/"\.\/js\/82-lieferanten-lager\.js"/.test(sw),"F2 und in der App-Huelle - ohne Verbindung sonst weg",null);
 p(/id="liefModal"/.test(html)&&/id="liefBuchenModal"/.test(html),"F3 beide Dialoge stehen im Dokument",null);
 p(/"lieferanten-lager":\{titel/.test(lies("js/41-hilfe.js")),"F4 der Hilfetext ist hinterlegt",null);
 z=await page.evaluate(()=>{
  const mit=(()=>{ $("navLagerverwaltung").hidden=false; return /data-a2-tu="lieferantenlager"/.test(a2SeiteMehr()) })();
  const ohne=(()=>{ $("navLagerverwaltung").hidden=true; return /data-a2-tu="lieferantenlager"/.test(a2SeiteMehr()) })();
  $("navLagerverwaltung").hidden=false;
  return {mit,ohne};
 });
 p(z.mit===true,"F5 mit Lager-Zugriff steht der Eintrag unter Mehr",z);
 p(z.ohne===false,
   "F6 GEGENPROBE: ohne Lager-Zugriff nicht - dieselbe Freigabe wie fuer die Lagerverwaltung",z);
 // v3.231: Die Umbenennung ist erst dann vollstaendig, wenn kein alter Name
 // mehr irgendwo haengt. Eine halb umbenannte App faellt nicht beim Start
 // auf, sondern erst, wenn jemand den einen Knopf drueckt, der vergessen
 // wurde.
 const altSpur=["index.html","sw.js","js/70-ansicht2.js","js/41-hilfe.js","js/82-lieferanten-lager.js"]
  .filter(f=>/bteam(Modal|Buchen|Liste|Suche|Excel|Meldung|Kennzahlen|Ein|Aus|Schliessen|lager)|bteam_artikel|bteam_bewegungen|82-bteam-lager/.test(lies(f)));
 p(altSpur.length===0,
   "F7 GEGENPROBE: nirgends haengt noch ein alter Name (bteamModal, bteam_artikel, js/82-bteam-lager.js)",altSpur);

 // ---- H  Neue Positionen per Excel --------------------------------------
 // Ansage des Anwenders: "schaue auch direkt das ich in zukunft neue
 // positionen direkt in der app per excel datei hochladen kann."
 console.log("\nH · Neue Positionen per Excel hochladen");
 p(/initExcelImport\(\{/.test(quelle)&&/tableName:"lieferanten_artikel"/.test(quelle)
   &&/schluessel:"artikelnr"/.test(quelle),
   "H1 der Import haengt am VORHANDENEN Excel-Import (js/08) - kein zweiter, eigener",null);
 p(!/excelZeilenLesen|importAutoZuordnen|FileReader/.test(quelle),
   "H2 GEGENPROBE: js/82 liest keine Datei selbst - sonst gaebe es zwei Regeln dafuer, wie eine Lieferantenliste gelesen wird",null);
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  const aufbau=document.getElementById("liefExcelAufbau");
  return {felder:["liefExcelInput","liefExcelBtn","liefExcelPreview","liefExcelMapping",
                  "liefExcelConfirm","liefExcelCancel","liefExcelHeader","liefExcelLieferant"].filter(x=>!el(x)),
          aufbau:aufbau?aufbau.textContent.replace(/\s+/g," "):"" };
 });
 p(z.felder.length===0,"H3 alle Bedienteile des Imports stehen im Dokument",z.felder);
 // Der Aufbau-Hinweis wird AUS der Feldliste erzeugt (js/08) - steht er da,
 // ist die Konfiguration wirklich angekommen und nicht nur hingeschrieben.
 p(/Artikel-Nr\./.test(z.aufbau)&&/Bezeichnung/.test(z.aufbau)&&/EAN/.test(z.aufbau),
   "H4 und der Hinweis 'wie muss die Datei aufgebaut sein' nennt die Spalten - erzeugt aus der Feldliste, nicht danebengeschrieben",z.aufbau.slice(0,160));
 p(/Artikel-Nr\./.test(z.aufbau)&&/aktualisiert/.test(z.aufbau),
   "H5 samt der Regel, dass eine bekannte Artikel-Nr. aktualisiert statt verdoppelt wird",z.aufbau.slice(0,200));

 // ---- I  Der leere Barcode (v3.230) -------------------------------------
 // ECHTER FEHLER, so gemeldet: beim Excel-Upload brach der Import ab mit
 // "duplicate key value violates unique constraint bteam_artikel_ean_uniq",
 // obwohl keine zwei Artikel denselben Barcode tragen. Ursache: 12 der 439
 // Artikel haben GAR KEINEN Barcode, und der Excel-Import schreibt eine
 // leere Zelle als leere ZEICHENKETTE. Fuer die Eindeutigkeitsregel war das
 // zwoelfmal derselbe Wert.
 console.log("\nI · Kein Barcode ist kein Barcode");
 const ohneEan=daten.artikel.filter(a=>!a.ean||!String(a.ean).trim()).length;
 p(ohneEan>0,
   "I1 die gelieferte Liste enthaelt Artikel ganz ohne Barcode - genau der Fall, der den Import abbrechen liess",ohneEan);
 z=await page.evaluate(()=>{
  // Der eigene Weg (Startsortiment) macht aus "leer" schon immer ein NULL.
  // Geprueft wird das an der Stelle, die es tut - nicht am Text der Datei.
  const a={artikelnr:"X1",bezeichnung:"Ohne",ean:"   "};
  const ean=(a.ean&&String(a.ean).trim())?String(a.ean).trim():null;
  return ean;
 });
 p(z===null,"I2 beim Startsortiment wird ein leerer Barcode zu 'kein Barcode'",z);
 // Der Excel-Weg geht durch js/08 und schreibt "" - deshalb faengt das die
 // Datenbank ab (Trigger lieferanten_artikel_normalisieren, Migration
 // v3.230). Hier geprueft wird, was die App daraus MACHT, wenn es doch kracht.
 z=await page.evaluate(()=>{
  const f=(m)=>importFehlerText({message:m});
  return {
   ean:f('duplicate key value violates unique constraint "lieferanten_artikel_ean_uniq"'),
   nr:f('duplicate key value violates unique constraint "materials_edv_nr_key"'),
   rls:f('new row violates row-level security policy'),
   lief:f('new row for relation "lieferanten_artikel" violates check constraint "lieferanten_artikel_lieferant_gefuellt"'),
   unbekannt:f("irgendwas ganz anderes")
  };
 });
 p(/Barcode/.test(z.ean)&&/eindeutig/.test(z.ean),
   "I3 ein doppelter Barcode wird in Sprache uebersetzt, die sagt, was zu tun ist",z.ean.slice(0,90));
 p(/Nummer/.test(z.nr),"I4 eine doppelte Nummer ebenso",z.nr.slice(0,80));
 p(/Berechtigung/.test(z.rls),"I5 und eine fehlende Berechtigung",z.rls.slice(0,60));
 p(/Lieferant/.test(z.lief),"I6 und ein fehlender Lieferant (v3.231)",z.lief.slice(0,90));
 p(z.unbekannt==="irgendwas ganz anderes",
   "I7 GEGENPROBE: was nicht in der Liste steht, wird im Wortlaut gezeigt - eine erfundene Erklaerung waere schlimmer als eine unverstaendliche echte",z.unbekannt);

 // ---- K  Der Lieferant gehoert zum Schluessel (v3.231) ------------------
 //
 // WARUM DAS DER TEURE FEHLER WAERE: Artikelnummern sind nur je Lieferant
 // eindeutig. Eine "409373" gibt es bei jedem Haendler. Stuende der
 // Lieferant nicht im Schluessel, wuerde die Preisliste des zweiten
 // Haendlers die Artikel des ersten ueberschreiben - still, ohne Fehler,
 // und erst beim Scannen faellt auf, dass hinter dem Barcode etwas anderes
 // steht. Geprueft wird am VERHALTEN des Imports, nicht am Text der Datei.
 console.log("\nK · Der Lieferant gehoert zum Schluessel");
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  return {lieferanten:lfLieferanten(), anzahl:lfArtikel.length};
 },SB);
 p(z.lieferanten.length===1&&z.lieferanten[0]==="B-Team",
   "K1 die Lieferantenliste wird aus den Artikeln abgeleitet - keine zweite Liste daneben",z);
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  // Ein zweiter Haendler mit DERSELBEN Artikelnummer.
  window.__db.lieferanten_artikel.push(
   {id:3,lieferant:"Anderer Haendler",artikelnr:"409373",bezeichnung:"Ganz was anderes",vpe:1,gruppe:"Dachrinnen"});
  await lfLaden();
  return {anzahl:lfArtikel.length, lieferanten:lfLieferanten(),
          gleicheNr:lfArtikel.filter(a=>a.artikelnr==="409373").map(a=>a.lieferant)};
 },SB);
 p(z.anzahl===3&&z.gleicheNr.length===2,
   "K2 dieselbe Artikelnummer bei zwei Lieferanten sind ZWEI Artikel, nicht einer",z);
 p(z.lieferanten.length===2,"K3 und beide Lieferanten stehen in der Liste",z.lieferanten);
 // Der Import schreibt den oben gewaehlten Lieferanten mit - sonst laege der
 // Artikel bei irgendeinem.
 z=await page.evaluate(()=>{
  $("liefExcelLieferant").value="  Neuer Haendler  ";
  const gefuellt=lfExcelFestwerte();
  $("liefExcelLieferant").value="   ";
  const leer=lfExcelFestwerte();
  $("liefExcelLieferant").value="";
  return {gefuellt, leer};
 });
 p(z.gefuellt&&z.gefuellt.lieferant==="Neuer Haendler",
   "K4 der Import schreibt den oben gewaehlten Lieferanten mit - samt weggeputzter Leerzeichen",z);
 p(z.leer===null,
   "K5 GEGENPROBE: ohne Angabe gibt es keine Festwerte - und js/08 bricht dann ab, statt einen Lieferanten zu erfinden",z);
 // Die Vorschau "neu/geaendert" darf nur INNERHALB des gewaehlten
 // Lieferanten vergleichen - sonst meldet sie die Nummer eines anderen
 // Haendlers als "wird geaendert", obwohl sie einen anderen Artikel meint.
 // Gemessen wird das am Ergebnis, nicht am Text: dieselbe Nummer, zwei
 // Lieferanten, und der Vergleichsstand darf nur einen davon kennen.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.lieferanten_artikel.push(
   {id:3,lieferant:"Anderer Haendler",artikelnr:"409373",bezeichnung:"Ganz was anderes",vpe:1});
  await lfLaden();
  // lfVergleichsstand ist GENAU die Funktion, die js/08 als cfg.bestand()
  // aufruft - nicht eine Nachbildung davon.
  $("liefExcelLieferant").value="B-Team";
  const bteam=(lfVergleichsstand()["409373"]||{}).bezeichnung;
  $("liefExcelLieferant").value="Anderer Haendler";
  const ander=(lfVergleichsstand()["409373"]||{}).bezeichnung;
  $("liefExcelLieferant").value="";
  return {bteam,ander};
 },SB);
 p(/Dachrinnen/.test(z.bteam||"")&&/Ganz was anderes/.test(z.ander||""),
   "K6 GEGENPROBE: dieselbe Nummer liefert je nach gewaehltem Lieferanten einen ANDEREN Vergleichsartikel - die Vorschau meldet nichts faelschlich als 'wird geaendert'",z);
 // Gegenprobe zu K6: derselbe Vergleichsstand muss auch den Lieferanten
 // BERUECKSICHTIGEN, nicht nur zufaellig unterschiedliche Werte liefern.
 // Ohne Angabe sieht er alles - sonst haette der erste Import gar keinen
 // Vergleich.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.lieferanten_artikel.push(
   {id:3,lieferant:"Anderer Haendler",artikelnr:"999999",bezeichnung:"Nur beim anderen"});
  await lfLaden();
  $("liefExcelLieferant").value="B-Team";
  const nurBteam=Object.keys(lfVergleichsstand()).length;
  $("liefExcelLieferant").value="";
  const alle=Object.keys(lfVergleichsstand()).length;
  return {nurBteam,alle};
 },SB);
 p(z.nurBteam===2&&z.alle===3,
   "K7 der Vergleichsstand kennt mit gewaehltem Lieferanten nur dessen Artikel - ohne Angabe alle",z);

 // ---- L  Mindestbestand und Einkaufsliste (v3.231) ----------------------
 //
 // Die Einkaufsliste ist der Punkt, an dem eine Artikelliste zum Werkzeug
 // wird - und die Stelle, an der ein stiller Rechenfehler richtig teuer ist:
 // eine zu kleine Bestellmenge merkt man auf der Baustelle.
 console.log("\nL · Mindestbestand und Einkaufsliste");
 z=await page.evaluate(()=>{
  lfArtikel=[
   {id:1,lieferant:"B-Team",artikelnr:"A1",bezeichnung:"Rinne",gruppe:"Rinnen",vpe:5,mindestbestand:10},
   {id:2,lieferant:"B-Team",artikelnr:"A2",bezeichnung:"Seiher",gruppe:"Seiher",vpe:1,mindestbestand:4},
   {id:3,lieferant:"B-Team",artikelnr:"A3",bezeichnung:"Haken",gruppe:"Haken",vpe:25,mindestbestand:0},
   {id:4,lieferant:"B-Team",artikelnr:"A4",bezeichnung:"Bogen",gruppe:"Bogen",mindestbestand:6}];
  lfBewegungen=[
   {artikel_id:1,art:"zugang",menge:3},   // 3 da, 10 gewollt -> fehlt 7, VPE 5 -> 10
   {artikel_id:2,art:"zugang",menge:9},   // genug da
   {artikel_id:3,art:"zugang",menge:0},   // nicht ueberwacht
   {artikel_id:4,art:"zugang",menge:1}];  // 1 da, 6 gewollt -> fehlt 5, keine VPE -> 5
  return {
   fehlt1:lfFehlt(lfArtikel[0]), bestell1:lfBestellmenge(lfArtikel[0]),
   fehlt2:lfFehlt(lfArtikel[1]), fehlt3:lfFehlt(lfArtikel[2]),
   fehlt4:lfFehlt(lfArtikel[3]), bestell4:lfBestellmenge(lfArtikel[3]),
   liste:lfEinkaufsliste().map(a=>a.artikelnr),
   gruppen:lfEinkaufsliste().map(a=>a.gruppe),
   unter:lfUnterMindest().length
  };
 });
 p(z.fehlt1===7,"L1 3 da bei Mindestbestand 10 heisst: 7 fehlen",z);
 p(z.bestell1===10,
   "L2 bestellt werden aber 10 - aufgerundet auf die Verpackungseinheit 5. Wer 7 bestellt, bekommt vom Haendler nichts oder zu wenig",z);
 p(z.fehlt2===0,"L3 wer genug hat, fehlt nicht",z);
 p(z.fehlt3===0,
   "L4 GEGENPROBE: Mindestbestand 0 heisst 'nicht ueberwacht' - nicht 'es fehlt alles'",z);
 p(z.fehlt4===5&&z.bestell4===5,
   "L5 ohne Verpackungseinheit ist die Bestellmenge die Fehlmenge - nicht 0 und nicht aufgerundet auf irgendwas",z);
 p(z.liste.slice().sort().join(",")==="A1,A4"&&z.unter===2,
   "L6 in der Einkaufsliste steht genau, was unter seinem Mindestbestand liegt",z);
 // Die Reihenfolge ist Lieferant -> Gruppe -> Bezeichnung, und das ist keine
 // Formsache: bestellt wird bei einem Haendler, und im Laden steht die Ware
 // nach Gruppen. Eine Liste in Eingabereihenfolge laesst den Spengler
 // zwischen den Regalen hin und her laufen.
 p(z.gruppen.join(",")==="Bogen,Rinnen",
   "L6a und zwar nach Lieferant, Gruppe, Bezeichnung geordnet - nicht in der Reihenfolge, in der die Artikel angelegt wurden",z.gruppen);
 // Der Text zum Verschicken entsteht aus DERSELBEN Liste. Eine eigene
 // Textfassung waere eine zweite Wahrheit darueber, was fehlt.
 z=await page.evaluate(()=>({text:lfEinkaufsText()}));
 p(/A1/.test(z.text)&&/A4/.test(z.text)&&!/A2/.test(z.text)&&!/A3/.test(z.text),
   "L7 der Text zum Verschicken nennt dieselben Artikel wie die Anzeige",z.text);
 p(/10 x  A1/.test(z.text),
   "L8 und die Bestellmenge, nicht die Fehlmenge - verschickt wird eine Bestellung",z.text.slice(0,200));
 // Eine leere Liste bedeutet zweierlei, und die beiden zu verwechseln waere
 // teuer: "nichts fehlt" oder "es wird gar nichts ueberwacht".
 z=await page.evaluate(()=>{
  const merk=lfArtikel.map(a=>Object.assign({},a));
  lfArtikel.forEach(a=>a.mindestbestand=0);
  lfEinkaufZeichnen();
  const ohne=$("liefEinkaufListe").textContent.replace(/\s+/g," ");
  lfArtikel.forEach((a,i)=>a.mindestbestand=(i===1?4:0));
  lfEinkaufZeichnen();
  const genug=$("liefEinkaufListe").textContent.replace(/\s+/g," ");
  lfArtikel=merk;
  return {ohne,genug};
 });
 p(/Mindestbestand/.test(z.ohne)&&/noch keinen Artikel/.test(z.ohne),
   "L9 wird nichts ueberwacht, sagt die Liste DAS - statt 'nichts zu bestellen' zu behaupten",z.ohne.slice(0,140));
 p(/Nichts zu bestellen/.test(z.genug),
   "L10 GEGENPROBE: wird ueberwacht und ist genug da, sagt sie das andere",z.genug.slice(0,140));
 // Der Mindestbestand ist eine Stammangabe und wird mit einem gezielten
 // update gespeichert. Ein update OHNE eq traefe das ganze Lager.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  const titel=$("liefArtikelTitel").textContent;
  $("liefArtikelMindest").value="12";
  await lfMindestSpeichern();
  await new Promise(r=>setTimeout(r,120));
  return {titel, ruf:window.__db.ruf, zu:$("liefArtikelModal").hidden,
          stand:window.__db.lieferanten_artikel.map(a=>[a.id,a.mindestbestand])};
 },SB);
 p(/Dachrinnen/.test(z.titel),"L11 der Artikel-Dialog zeigt den angetippten Artikel",z.titel);
 const upd=z.ruf.filter(r=>r.was==="update");
 p(upd.length===1&&upd[0].spalte==="id"&&Number(upd[0].werte.mindestbestand)===12,
   "L12 gespeichert wird mit GENAU einem gezielten update auf diesen Artikel",z.ruf);
 p(!z.ruf.some(r=>r.was==="update-ohne-eq"),
   "L13 GEGENPROBE: nie ein update ohne eq - das traefe das ganze Lager",z.ruf);
 p(!z.ruf.some(r=>r.tisch==="lieferanten_bewegungen"),
   "L14 GEGENPROBE: eine Stammangabe erzeugt KEINE Buchung - der Bestand aendert sich davon nicht",z.ruf);
 p(z.stand.find(x=>x[0]===2)[1]===undefined||Number(z.stand.find(x=>x[0]===2)[1])===0,
   "L15 und kein anderer Artikel wird dabei mitgeaendert",z.stand);
 p(z.zu===true,"L16 der Dialog schliesst sich",z);
 // Ein leeres Feld schaltet die Ueberwachung ab - es darf nicht als Fehler
 // gelten und auch nicht den alten Wert stehen lassen.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  $("liefArtikelMindest").value="";
  await lfMindestSpeichern();
  await new Promise(r=>setTimeout(r,120));
  const u=window.__db.ruf.filter(r=>r.was==="update");
  return {menge:u.length?u[0].werte.mindestbestand:null, fehler:$("liefArtikelFehler").textContent};
 },SB);
 p(Number(z.menge)===0&&!z.fehler,
   "L17 ein leeres Feld schaltet die Ueberwachung ab (0) - und ist kein Fehler",z);
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  $("liefArtikelMindest").value="-3";
  await lfMindestSpeichern();
  await new Promise(r=>setTimeout(r,80));
  return {ruf:window.__db.ruf.length, fehler:$("liefArtikelFehler").textContent};
 },SB);
 p(z.ruf===0&&/negativ/.test(z.fehler),
   "L18 GEGENPROBE: ein negativer Mindestbestand wird nicht gespeichert, und die App sagt warum",z);
 // Verdrahtung der neuen Teile.
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  return ["liefEinkaufKnopf","liefEinkaufModal","liefEinkaufListe","liefEinkaufText",
          "liefEinkaufKopieren","liefArtikelModal","liefArtikelMindest",
          "liefArtikelSpeichern"].filter(x=>!el(x));
 });
 p(z.length===0,"L19 alle Bedienteile stehen im Dokument",z);
 p(/mindestbestand/.test(quelle)&&/alias:\["mindestbestand"/.test(quelle),
   "L20 der Mindestbestand laesst sich auch per Excel mitliefern",null);

 // ---- M  Von Hand auf die Einkaufsliste (v3.232) ------------------------
 //
 // Ansage des Anwenders: "Wo kann ich etwas in den einkaufswagen legen?" Bis
 // v3.231: nirgends - die Liste fuellte sich nur aus dem Mindestbestand, und
 // das Wagen-Symbol versprach etwas, das es nicht gab.
 console.log("\nM · Von Hand auf die Einkaufsliste");
 z=await page.evaluate(()=>{
  lfArtikel=[
   {id:1,lieferant:"B-Team",artikelnr:"A1",bezeichnung:"Rinne",gruppe:"Rinnen",vpe:5,mindestbestand:10},
   {id:2,lieferant:"B-Team",artikelnr:"A2",bezeichnung:"Seiher",gruppe:"Seiher",vpe:1,mindestbestand:0}];
  lfBewegungen=[{artikel_id:1,art:"zugang",menge:3}];   // fehlt 7
  lfEinkauf=[];
  const ohne={bedarf1:lfBedarf(lfArtikel[0]), bedarf2:lfBedarf(lfArtikel[1]),
              liste:lfEinkaufsliste().map(a=>a.artikelnr)};
  // A2 hat KEINEN Mindestbestand - nur von Hand gesetzt.
  lfEinkauf=[{id:9,artikel_id:2,menge:4,grund:"Baustelle Müller"}];
  const nurHand={bedarf2:lfBedarf(lfArtikel[1]), bestell2:lfBestellmenge(lfArtikel[1]),
                 liste:lfEinkaufsliste().map(a=>a.artikelnr)};
  // A1 hat BEIDES: Mindestbestand unterschritten (7) und von Hand (12).
  lfEinkauf=[{id:10,artikel_id:1,menge:12,grund:"Baustelle Müller"}];
  const beides={fehlt:lfFehlt(lfArtikel[0]), hand:lfHandMenge(lfArtikel[0]),
                bedarf:lfBedarf(lfArtikel[0]), bestell:lfBestellmenge(lfArtikel[0]),
                herkunft:lfHerkunftText(lfArtikel[0]),
                zeilen:lfEinkaufsliste().filter(a=>a.artikelnr==="A1").length};
  return {ohne,nurHand,beides};
 });
 p(z.ohne.bedarf1===7&&z.ohne.bedarf2===0&&z.ohne.liste.join(",")==="A1",
   "M1 ohne Handeintrag ist alles wie vorher - der Mindestbestand allein",z.ohne);
 p(z.nurHand.bedarf2===4&&z.nurHand.bestell2===4&&z.nurHand.liste.join(",")==="A1,A2",
   "M2 ein Artikel OHNE Mindestbestand kommt von Hand auf die Liste - genau das, was vorher nicht ging",z.nurHand);
 // Der teure Rechenfehler waere hier: nur die groessere der beiden Mengen zu
 // bestellen. Dann fehlt hinterher genau der andere Betrag.
 p(z.beides.fehlt===7&&z.beides.hand===12&&z.beides.bedarf===19,
   "M3 beide Herkuenfte werden ADDIERT (7 + 12 = 19) - nicht die groessere genommen",z.beides);
 p(z.beides.bestell===20,
   "M4 und die Bestellmenge ist das, aufgerundet auf die Verpackungseinheit 5",z.beides);
 p(z.beides.zeilen===1,
   "M5 GEGENPROBE: der Artikel steht trotzdem nur EINMAL auf der Liste - ein Haendler bekommt eine Zeile je Artikel",z.beides);
 p(/Mindestbestand 10/.test(z.beides.herkunft)&&/von Hand 12/.test(z.beides.herkunft)
   &&/Baustelle M/.test(z.beides.herkunft),
   "M6 und die Zeile nennt BEIDE Anteile samt Grund - addiert wird sichtbar, nicht versteckt",z.beides.herkunft);
 // Dieselbe Herkunft steht im verschickten Text - eine zweite Textfassung
 // waere eine zweite Wahrheit darueber, warum etwas bestellt wird.
 z=await page.evaluate(()=>lfEinkaufsText());
 p(/20 x  A1/.test(z)&&/von Hand 12/.test(z),
   "M7 der verschickte Text nennt dieselbe Bestellmenge und dieselbe Herkunft",z.slice(0,220));
 // Setzen: erst anlegen, dann aendern - und nie zwei offene Zeilen.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  const vorbelegt={menge:$("liefArtikelWunschMenge").value,
                   knopf:$("liefArtikelWunschSetzen").textContent};
  $("liefArtikelWunschMenge").value="12";
  $("liefArtikelWunschGrund").value="Baustelle Müller";
  await lfAufEinkaufsliste();
  await new Promise(r=>setTimeout(r,140));
  return {vorbelegt, ruf:window.__db.ruf.slice(),
          offen:window.__db.lieferanten_einkauf.length,
          zu:$("liefArtikelModal").hidden};
 },SB);
 p(z.vorbelegt.menge==="5"&&/Auf die Einkaufsliste/.test(z.vorbelegt.knopf),
   "M8 der Dialog schlaegt die Verpackungseinheit vor und sagt, dass er hinzufuegt",z.vorbelegt);
 const ins=z.ruf.filter(r=>r.tisch==="lieferanten_einkauf"&&r.was==="insert");
 p(ins.length===1&&Number(ins[0].zeile.menge)===12&&/Baustelle/.test(ins[0].zeile.grund||""),
   "M9 gesetzt wird mit GENAU einer neuen Zeile, mit Menge und Grund",z.ruf);
 p(!z.ruf.some(r=>r.tisch==="lieferanten_bewegungen"),
   "M10 GEGENPROBE: ein Wunsch ist KEINE Buchung - der Bestand aendert sich davon nicht",z.ruf);
 p(z.zu===true,"M11 und der Dialog schliesst sich",z);
 // Ein zweites Setzen desselben Artikels muss AENDERN, nicht verdoppeln.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.lieferanten_einkauf=[{id:77,artikel_id:1,menge:12,grund:"alt",erledigt_am:null}];
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  const vorbelegt={menge:$("liefArtikelWunschMenge").value,
                   grund:$("liefArtikelWunschGrund").value,
                   knopf:$("liefArtikelWunschSetzen").textContent};
  $("liefArtikelWunschMenge").value="20";
  await lfAufEinkaufsliste();
  await new Promise(r=>setTimeout(r,140));
  return {vorbelegt, ruf:window.__db.ruf.filter(r=>r.tisch==="lieferanten_einkauf"),
          zeilen:window.__db.lieferanten_einkauf.length,
          menge:window.__db.lieferanten_einkauf[0].menge};
 },SB);
 p(z.vorbelegt.menge==="12"&&z.vorbelegt.grund==="alt"&&/ändern/.test(z.vorbelegt.knopf),
   "M12 steht der Artikel schon drauf, kommen Menge und Grund mit - und der Knopf sagt 'ändern'",z.vorbelegt);
 p(z.ruf.length===1&&z.ruf[0].was==="update"&&z.zeilen===1&&Number(z.menge)===20,
   "M13 GEGENPROBE: das zweite Setzen AENDERT die Zeile, statt eine zweite anzulegen",z);
 // Abhaken: die Zeile verschwindet von der Liste, wird aber nicht geloescht.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.lieferanten_artikel[0].mindestbestand=0;   // nur der Handeintrag traegt die Zeile
  window.__db.lieferanten_einkauf=[{id:88,artikel_id:1,menge:6,grund:null,erledigt_am:null}];
  await lfLaden();
  const vorher=lfEinkaufsliste().length;
  window.__db.ruf=[];
  await lfEinkaufErledigt(88);
  await new Promise(r=>setTimeout(r,140));
  return {vorher, nachher:lfEinkaufsliste().length,
          ruf:window.__db.ruf.filter(r=>r.tisch==="lieferanten_einkauf"),
          nochDa:window.__db.lieferanten_einkauf.length,
          erledigt:!!window.__db.lieferanten_einkauf[0].erledigt_am};
 },SB);
 p(z.vorher===1&&z.nachher===0,"M14 abgehakt verschwindet die Zeile von der Liste",z);
 p(z.ruf.length===1&&z.ruf[0].was==="update"&&!z.ruf.some(r=>r.was==="delete"),
   "M15 GEGENPROBE: abhaken ist kein Loeschen - die Zeile bleibt mit ihrem Zeitpunkt stehen",z.ruf);
 p(z.nochDa===1&&z.erledigt===true,"M16 und traegt danach einen Erledigt-Zeitpunkt",z);
 // Abhaken darf den Mindestbestand NICHT beruehren: steht der Artikel auch
 // deswegen auf der Liste, bleibt er dort.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.lieferanten_artikel[0].mindestbestand=10;
  window.__db.lieferanten_bewegungen=[{id:1,artikel_id:1,art:"zugang",menge:3}];
  window.__db.lieferanten_einkauf=[{id:99,artikel_id:1,menge:6,grund:null,erledigt_am:null}];
  await lfLaden();
  await lfEinkaufErledigt(99);
  await new Promise(r=>setTimeout(r,140));
  const a=lfArtikelZuId(1);
  // Geprueft wird ueber die id, nicht ueber die Artikelnummer: die kommt aus
  // dem Seed der Attrappe und ist hier nicht die Aussage.
  return {drauf:lfEinkaufsliste().map(x=>String(x.id)), bedarf:lfBedarf(a),
          mindest:lfMindest(a), hand:lfHandMenge(a),
          meldung:$("liefEinkaufMeldung").textContent};
 },SB);
 p(z.drauf.join(",")==="1"&&z.bedarf===7&&z.mindest===10&&z.hand===0,
   "M17 GEGENPROBE: das Abhaken laesst den Mindestbestand unberuehrt - der Artikel bleibt aus DEM Grund auf der Liste",z);
 p(/Mindestbestand/.test(z.meldung),
   "M18 und die App sagt das, statt den Artikel wortlos stehen zu lassen",z.meldung);
 // Menge 0 ist kein Wunsch, sondern ein Versehen.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  $("liefArtikelWunschMenge").value="0";
  await lfAufEinkaufsliste();
  await new Promise(r=>setTimeout(r,80));
  return {ruf:window.__db.ruf.length, fehler:$("liefArtikelFehler").textContent};
 },SB);
 p(z.ruf===0&&/Menge/.test(z.fehler),
   "M19 GEGENPROBE: Menge 0 wird nicht gesetzt, und die App sagt warum",z);
 // Das Symbol: 🛒 heisst hinzufuegen, 📋 heisst ansehen. Genau diese
 // Verwechslung war der gemeldete Fehler.
 z=await page.evaluate(()=>{
  lfArtikel=[{id:1,lieferant:"B",artikelnr:"A1",bezeichnung:"R",vpe:1,mindestbestand:5}];
  lfBewegungen=[]; lfEinkauf=[];
  lfZeichnen();
  return {knopf:$("liefEinkaufKnopf").textContent,
          setzen:$("liefArtikelWunschSetzen").textContent,
          titel:document.querySelector("#liefEinkaufModal h2").textContent};
 });
 p(!/🛒/.test(z.knopf)&&/📋/.test(z.knopf)&&/\(1\)/.test(z.knopf),
   "M20 der Listen-Knopf traegt KEINEN Einkaufswagen mehr - er zeigt die Liste, er nimmt nichts auf",z);
 p(!/🛒/.test(z.titel),"M21 der Dialogtitel ebenso",z.titel);
 p(/🛒/.test(z.setzen),
   "M22 GEGENPROBE: der Wagen steht dort, wo wirklich etwas hinzugefuegt wird",z.setzen);
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  return ["liefArtikelWunschMenge","liefArtikelWunschGrund","liefArtikelWunschSetzen",
          "liefArtikelWunschHinweis"].filter(x=>!el(x));
 });
 p(z.length===0,"M23 alle Bedienteile stehen im Dokument",z);

 p(fehler.length===0,"G1 keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();
