// Prueft das Lieferanten-Lager B-Team (v3.229).
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
//   D  Einlesen aktualisiert ueber die Artikelnummer und loescht nie.
//   E  Buchen schreibt genau eine Bewegung - und keine Aenderung an alten.
//   F  Verdrahtung: Datei, App-Huelle, Eintrag unter "Mehr", Hilfetext.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-bteam-lager-v3-229.js
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
 window.__db={bteam_artikel:[
   {id:1,artikelnr:"409373",bezeichnung:"Dachrinnen 330",ean:"3661587017460",vpe:5,gruppe:"Dachrinnen"},
   {id:2,artikelnr:"422640",bezeichnung:"Rinnenseiher 60",ean:"1019006000005",vpe:1,gruppe:"Rinnenseiher"}],
  bteam_bewegungen:[],ruf:[]};
 let n=100;
 const tisch=name=>({
  select(){ const q={
    order(){return q}, then(r){return r({data:window.__db[name].slice(),error:null})} };
   return q; },
  insert(zeile){ window.__db.ruf.push({tisch:name,was:"insert",zeile});
   window.__db[name].push(Object.assign({id:++n},zeile));
   return Promise.resolve({error:null}); },
  upsert(zeilen,opt){ window.__db.ruf.push({tisch:name,was:"upsert",anzahl:zeilen.length,opt});
   zeilen.forEach(z=>{
    const da=window.__db[name].find(x=>x.artikelnr===z.artikelnr);
    if(da)Object.assign(da,z); else window.__db[name].push(Object.assign({id:++n},z));
   });
   return Promise.resolve({error:null}); },
  update(){ window.__db.ruf.push({tisch:name,was:"update"}); return Promise.resolve({error:null}) },
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
 const quelle=lies("js/82-bteam-lager.js");
 // Die Tabellennamen der bestehenden Lagerverwaltung und des Regierapports.
 const FREMD=["materials","lager_varianten","lagerbestand_bewegungen","lagerbestand","reports","report_materials"];
 const angefasst=FREMD.filter(t=>new RegExp('from\\("'+t+'"\\)').test(quelle));
 p(angefasst.length===0,
   "A1 js/82 spricht KEINE Tabelle der bestehenden Lagerverwaltung und des Regierapports an",angefasst);
 p(/from\("bteam_artikel"\)/.test(quelle)&&/from\("bteam_bewegungen"\)/.test(quelle),
   "A2 sondern ausschliesslich die eigenen",null);
 // Gegenprobe in die andere Richtung: die alten Dateien wissen nichts von
 // der neuen. Waere dort etwas eingebaut worden, waere "nicht anfassen"
 // gebrochen - unabhaengig davon, wie sauber js/82 selbst ist.
 const alt68=lies("js/68-lagerverwaltung.js"), alt59=lies("js/59-lagerbestand.js"), alt06=lies("js/06-rapport.js");
 p(!/bteam/i.test(alt68)&&!/bteam/i.test(alt59)&&!/bteam/i.test(alt06),
   "A3 GEGENPROBE: js/68, js/59 und js/06 enthalten keine einzige Zeile zum neuen Lager",
   {js68:/bteam/i.test(alt68),js59:/bteam/i.test(alt59),js06:/bteam/i.test(alt06)});
 p(!/function lager[A-Z]/.test(quelle),
   "A4 und js/82 definiert keine Funktion, die wie die alte heisst - kein Ueberschreiben aus Versehen",null);

 // ---- B  Der Bestand ist die Summe --------------------------------------
 console.log("\nB · Der Bestand ist die Summe der Buchungen");
 z=await page.evaluate(()=>{
  btArtikel=[{id:1,artikelnr:"409373",bezeichnung:"Dachrinnen 330",ean:"3661587017460",vpe:5},
             {id:2,artikelnr:"422640",bezeichnung:"Rinnenseiher 60",ean:"1019006000005",vpe:1}];
  btBewegungen=[
   {artikel_id:1,art:"zugang",menge:10},
   {artikel_id:1,art:"abgang",menge:3},
   {artikel_id:1,art:"korrektur",menge:-2},
   {artikel_id:2,art:"zugang",menge:4}];
  return {a1:btBestand(1),a2:btBestand(2),leer:btBestand(99)};
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
  const merk=btArtikel;
  btArtikel=[{id:1,artikelnr:"409373",bezeichnung:"D",bestand:999,menge:999}];
  btBewegungen=[{artikel_id:1,art:"zugang",menge:7}];
  const r=btBestand(1);
  btArtikel=merk;
  return r;
 });
 p(z===7,
   "B4 GEGENPROBE: ein mitgeliefertes Bestandsfeld wird ignoriert - gezaehlt werden immer die Buchungen",z);

 // ---- C  Barcode ---------------------------------------------------------
 console.log("\nC · Barcode");
 z=await page.evaluate(()=>{
  const treffer=btArtikelZuBarcode("3661587017460");
  const daneben=btArtikelZuBarcode("9999999999999");
  const leer=btArtikelZuBarcode("");
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
  btScannenUndBuchen("zugang");
  await new Promise(r=>setTimeout(r,120));
  const meldung=$("bteamMeldung").textContent;
  const dialogAuf=!$("bteamBuchenModal").hidden;
  window.barcodeScannen=echt;
  return {meldung,dialogAuf,schreibt:window.__db.ruf.length};
 },SB);
 p(z.schreibt===0,
   "C3 GEGENPROBE: ein unbekannter Code legt NICHTS an - dieses Lager ist das Sortiment des Lieferanten",z);
 p(/Lagerverwaltung/.test(z.meldung)&&/9999999999999/.test(z.meldung),
   "C4 und die App sagt, wohin der Code dann gehoert - statt stumm nichts zu tun",z);
 p(z.dialogAuf===false,"C5 der Buchen-Dialog geht dabei nicht auf",z);

 // ---- D  Einlesen --------------------------------------------------------
 console.log("\nD · Sortiment einlesen");
 p(/onConflict:"company_id,artikelnr"/.test(quelle),
   "D1 eingelesen wird ueber die Artikelnummer des Lieferanten - dasselbe Sortiment verdoppelt sich nicht",null);
 p(!/\.delete\(\)/.test(quelle),
   "D2 GEGENPROBE: die Datei kennt kein Loeschen - ein Artikel, der in einer neuen Datei fehlt, bleibt stehen",null);
 const daten=JSON.parse(lies("daten/bteam-sortiment.json"));
 p(Array.isArray(daten.artikel)&&daten.artikel.length>400,
   "D3 die Sortimentsdatei liegt im Projekt und enthaelt das Sortiment",daten.artikel&&daten.artikel.length);
 const nr=new Set(), ean=new Set(); let doppelt=[];
 daten.artikel.forEach(a=>{
  if(nr.has(a.artikelnr))doppelt.push("Nr "+a.artikelnr); nr.add(a.artikelnr);
  if(a.ean){ if(ean.has(a.ean))doppelt.push("EAN "+a.ean); ean.add(a.ean) }
 });
 p(doppelt.length===0,
   "D4 jede Artikelnummer und jeder Barcode kommt genau einmal vor - sonst waere beim Scannen nicht entscheidbar, welcher Artikel gemeint ist",doppelt.slice(0,5));

 // ---- E  Buchen ----------------------------------------------------------
 console.log("\nE · Buchen");
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  window.__db.ruf=[];
  btBuchenOeffnen(1,"abgang");
  const vorbelegt={art:$("bteamBuchenArt").value,menge:$("bteamBuchenMenge").value,
                   titel:$("bteamBuchenTitel").textContent};
  $("bteamBuchenMenge").value="2";
  await btBuchenSpeichern();
  await new Promise(r=>setTimeout(r,120));
  return {vorbelegt, ruf:window.__db.ruf, zu:$("bteamBuchenModal").hidden};
 },SB);
 p(z.vorbelegt.art==="abgang"&&z.vorbelegt.menge==="5",
   "E1 der Dialog kommt mit der gewaehlten Art und der Verpackungseinheit als Menge",z.vorbelegt);
 p(z.ruf.length===1&&z.ruf[0].tisch==="bteam_bewegungen"&&z.ruf[0].was==="insert",
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
  btBuchenOeffnen(1,"zugang");
  $("bteamBuchenMenge").value="-5";
  await btBuchenSpeichern();
  await new Promise(r=>setTimeout(r,80));
  return {fehler:$("bteamBuchenFehler").textContent, ruf:window.__db.ruf.length};
 },SB);
 p(z.ruf===0&&/Korrektur/.test(z.fehler),
   "E6 GEGENPROBE: eine negative Menge wird nicht als Zugang gebucht, und die App sagt warum",z);

 // ---- F  Verdrahtung -----------------------------------------------------
 console.log("\nF · Verdrahtung");
 const html=lies("index.html"), sw=lies("sw.js"), a2=lies("js/70-ansicht2.js");
 p(/<script src="js\/82-bteam-lager\.js"><\/script>/.test(html),"F1 js/82 ist in index.html eingehaengt",null);
 p(/"\.\/js\/82-bteam-lager\.js"/.test(sw),"F2 und in der App-Huelle - ohne Verbindung sonst weg",null);
 p(/id="bteamModal"/.test(html)&&/id="bteamBuchenModal"/.test(html),"F3 beide Dialoge stehen im Dokument",null);
 p(/"bteam-lager":\{titel/.test(lies("js/41-hilfe.js")),"F4 der Hilfetext ist hinterlegt",null);
 z=await page.evaluate(()=>{
  const mit=(()=>{ $("navLagerverwaltung").hidden=false; return /data-a2-tu="bteamlager"/.test(a2SeiteMehr()) })();
  const ohne=(()=>{ $("navLagerverwaltung").hidden=true; return /data-a2-tu="bteamlager"/.test(a2SeiteMehr()) })();
  $("navLagerverwaltung").hidden=false;
  return {mit,ohne};
 });
 p(z.mit===true,"F5 mit Lager-Zugriff steht der Eintrag unter Mehr",z);
 p(z.ohne===false,
   "F6 GEGENPROBE: ohne Lager-Zugriff nicht - dieselbe Freigabe wie fuer die Lagerverwaltung",z);

 // ---- H  Neue Positionen per Excel --------------------------------------
 // Ansage des Anwenders: "schaue auch direkt das ich in zukunft neue
 // positionen direkt in der app per excel datei hochladen kann."
 console.log("\nH · Neue Positionen per Excel hochladen");
 p(/initExcelImport\(\{/.test(quelle)&&/tableName:"bteam_artikel"/.test(quelle)
   &&/schluessel:"artikelnr"/.test(quelle),
   "H1 der Import haengt am VORHANDENEN Excel-Import (js/08) - kein zweiter, eigener",null);
 p(!/excelZeilenLesen|importAutoZuordnen|FileReader/.test(quelle),
   "H2 GEGENPROBE: js/82 liest keine Datei selbst - sonst gaebe es zwei Regeln dafuer, wie eine Lieferantenliste gelesen wird",null);
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  const aufbau=document.getElementById("bteamExcelAufbau");
  return {felder:["bteamExcelInput","bteamExcelBtn","bteamExcelPreview","bteamExcelMapping",
                  "bteamExcelConfirm","bteamExcelCancel","bteamExcelHeader"].filter(x=>!el(x)),
          aufbau:aufbau?aufbau.textContent.replace(/\s+/g," "):"" };
 });
 p(z.felder.length===0,"H3 alle Bedienteile des Imports stehen im Dokument",z.felder);
 // Der Aufbau-Hinweis wird AUS der Feldliste erzeugt (js/08) - steht er da,
 // ist die Konfiguration wirklich angekommen und nicht nur hingeschrieben.
 p(/Artikel-Nr\./.test(z.aufbau)&&/Bezeichnung/.test(z.aufbau)&&/EAN/.test(z.aufbau),
   "H4 und der Hinweis 'wie muss die Datei aufgebaut sein' nennt die Spalten - erzeugt aus der Feldliste, nicht danebengeschrieben",z.aufbau.slice(0,160));
 p(/Artikel-Nr\./.test(z.aufbau)&&/aktualisiert/.test(z.aufbau),
   "H5 samt der Regel, dass eine bekannte Artikel-Nr. aktualisiert statt verdoppelt wird",z.aufbau.slice(0,200));

 p(fehler.length===0,"G1 keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();
