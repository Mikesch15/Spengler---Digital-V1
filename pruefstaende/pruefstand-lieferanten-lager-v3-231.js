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
  // insert nimmt auch ein ARRAY - die Inventur bucht alle Korrekturen in
  // EINEM Aufruf. Eine Attrappe, die nur Einzelzeilen kennt, haette das
  // stillschweigend verschluckt.
  insert(zeile){ window.__db.ruf.push({tisch:name,was:"insert",zeile});
   (Array.isArray(zeile)?zeile:[zeile]).forEach(z=>
    window.__db[name].push(Object.assign({id:++n},z)));
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
  // v3.249: update traegt auch keine_regie_position. Die Attrappe bildet
  // dabei die REGEL der Datenbank nach - die Marke nur ohne Zuordnung -,
  // sonst koennte der Pruefstand den Widerspruch gar nicht bemerken.
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
 // v3.234: die Zuordnung laeuft ueber eine Datenbankfunktion, nicht ueber
 // n einzelne Schreibzugriffe. Die Attrappe schreibt mit, WAS geschickt
 // wurde - darum geht es hier.
 sb.rpc=(name,args)=>{
  window.__db.ruf.push({tisch:"rpc:"+name,was:"rpc",args});
  ((args&&args.paare)||[]).forEach(p=>{
   const a=window.__db.lieferanten_artikel.find(x=>String(x.id)===String(p.id));
   if(!a)return;
   if(name==="lieferanten_mindestbestand_setzen")a.mindestbestand=p.mindestbestand;
   else a.material_id=p.material_id===""?null:p.material_id;
  });
  return Promise.resolve({data:((args&&args.paare)||[]).length,error:null});
 };
}`;

// Der Regie-Katalog, wie ihn lagArtikelListe() (js/59) liefert. Gesetzt
// werden BEIDE parallelen Listen - settings.materials und materialIds -,
// weil js/59 sie ueber denselben Index zusammenfuehrt. Nur eine davon zu
// setzen ergaebe eine leere Liste, und der Pruefstand haette am Katalog
// vorbei gemessen.
//
// materialIds wird OHNE "window." gesetzt. Es ist wie sb eine Bindung auf
// Modulebene: ein "window.materialIds=[...]" legt ein zweites Objekt an,
// das lagArtikelListe() nie liest - die Liste bliebe leer und der
// Pruefstand haette am Katalog vorbei gemessen. (Derselbe Fehlertyp wie in
// v3.224 bei lagerVarianten, v3.225 bei navigator.credentials und v3.229
// bei sb - beim vierten Mal ist es keine Unachtsamkeit mehr, sondern ein
// Muster dieses Projekts.)
const KATALOG=`()=>{
 settings.materials=[
  ["203.06","Rinnenseiher, alle Materialien","alle","St",12.5],
  ["201.01","Dachrinnen halbrund Titanzink","333","m1",18],
  ["202.01","Rinnenhalter Titanzink","alle","St",9],
  ["811.04","Dichtungsmasse Neutralsilikon","","Kart.",14],
  ["100.01","Stahlblech svz / evz / dek","0.62","m²",31]
 ];
 materialIds=[7001,7002,7003,7004,7005];
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
 // Die Tabellennamen der ehemaligen Lagerverwaltung und des Regierapports.
 // v3.251: Die Lagerverwaltung ist abgeschafft. Die Zusage bleibt dieselbe
 // und wird nicht gegenstandslos - ihre Tabellen stehen bis zur Datenbank-
 // Stufe noch da, und ein Zugriff von hier aus waere jetzt erst recht
 // falsch.
 const FREMD=["materials","lager_varianten","lagerbestand_bewegungen","lagerbestand","reports","report_materials"];
 const angefasst=FREMD.filter(t=>new RegExp('from\\("'+t+'"\\)').test(quelle));
 p(angefasst.length===0,
   "A1 js/82 spricht KEINE Tabelle der ehemaligen Lagerverwaltung und des Regierapports an",angefasst);
 p(/from\("lieferanten_artikel"\)/.test(quelle)&&/from\("lieferanten_bewegungen"\)/.test(quelle),
   "A2 sondern ausschliesslich die eigenen",null);
 // Gegenprobe in die andere Richtung: die alten Dateien wissen nichts von
 // der neuen. Waere dort etwas eingebaut worden, waere "nicht anfassen"
 // gebrochen - unabhaengig davon, wie sauber js/82 selbst ist.
 const alt59=lies("js/59-lagerbestand.js"), alt06=lies("js/06-rapport.js");
 // v3.236: js/06 DARF das Lieferanten-Lager seit dem Scannen etwas FRAGEN -
 // aber nach wie vor keine seiner Tabellen anfassen und keine eigene
 // Lagerlogik fuehren. Die Zusage ist damit nicht weicher geworden, sie ist
 // genauer: geprueft werden die TABELLEN und die Buchungsfunktionen, nicht
 // mehr jede Erwaehnung.
 const spur=t=>/from\("lieferanten_(artikel|bewegungen|einkauf)"\)|lfBuchenSpeichern|lfZuordnenSpeichern|bteam/i.test(t);
 p(!spur(alt59)&&!spur(alt06),
   "A3 GEGENPROBE: js/59 und js/06 sprechen KEINE Tabelle des neuen Lagers an und buchen dort nichts",
   {js59:spur(alt59),js06:spur(alt06)});
 // v3.251: js/68-lagerverwaltung.js stand hier als dritte Datei. Sie ist
 // abgeschafft - und das ist der Punkt: die Trennung dieser Datei von der
 // alten Lagerverwaltung war der Grund, weshalb das neue Lager die
 // Abschaffung unbeschadet ueberlebt hat. Die Pruefung wird deshalb nicht
 // gestrichen, sondern gedreht: sie haelt jetzt fest, dass die alte Datei
 // wirklich weg ist - aus dem Ordner UND aus der App-Huelle. Eine Datei, die
 // nur aus index.html ausgehaengt wurde, kaeme beim naechsten Script-Tag
 // zurueck.
 const weg68=!fs.existsSync(path.join(process.cwd(),"js","68-lagerverwaltung.js"));
 const inHuelle=/68-lagerverwaltung/.test(lies("sw.js"));
 const inSeite=/68-lagerverwaltung/.test(lies("index.html"));
 p(weg68&&!inHuelle&&!inSeite,
   "A3b GEGENPROBE: js/68-lagerverwaltung.js ist weg - aus dem Ordner, aus sw.js und aus index.html",
   {weg68,inHuelle,inSeite});
 // Und die Gegenprobe zur Gegenprobe: js/06 fragt wirklich nur, und zwar
 // ueber die eine dafuer vorgesehene Funktion.
 // Gemessen wird, WELCHE Funktionen des Lagers js/06 aufruft - nicht, wie
 // oft der Name im Text steht. Ein Vergleich (typeof lf... === "function")
 // ist keine Zuweisung; ein Aufruf mit Klammer ist einer.
 const gerufen=[...new Set((alt06.match(/\blf[A-Z]\w*\s*\(/g)||[]).map(s=>s.replace(/\s*\($/,"")))];
 const gesetzt=(alt06.match(/\blf[A-Z]\w*\s*=(?!=)/g)||[]);
 p(gerufen.join(",")==="lfScanVerbrauch"&&gesetzt.length===0,
   "A3a js/06 ruft GENAU eine Funktion des Lagers auf (lfScanVerbrauch) und setzt dort keine einzige Variable - auch das Buchen liegt in js/82, nicht im Rapport",
   {gerufen,gesetzt});
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
 // v3.251: Bis v3.250 stand das Lieferanten-Lager als eigener Punkt unter
 // "Mehr", NEBEN dem Lager-Tab, der in die alte Lagerverwaltung fuehrte. Die
 // ist abgeschafft - der Tab fuehrt jetzt hierher, und der zweite Weg ist
 // weg. Die Zusage ist dieselbe und wird am neuen Ort gemessen: mit dem
 // Recht erscheint das Lager in der Leiste, ohne das Recht nicht.
 z=await page.evaluate(()=>{
  const tabs=()=>a2Leisten().map(x=>x.k);
  const mit=(()=>{ $("navLagerverwaltung").hidden=false; return tabs().indexOf("lager")>=0 })();
  const ohne=(()=>{ $("navLagerverwaltung").hidden=true; return tabs().indexOf("lager")>=0 })();
  $("navLagerverwaltung").hidden=false;
  return {mit,ohne,
   // Und der Tab fuehrt wirklich ins Lager, nicht in die Einstellungen.
   handler:String($("navLagerverwaltung").onclick||""),
   // GEGENPROBE: der zweite Weg unter "Mehr" ist weg - zwei Wege zum selben
   // Schirm waeren zwei Stellen, an denen dieselbe Sichtbarkeit gepflegt
   // werden muesste.
   mehr:/data-a2-tu="lieferantenlager"/.test(a2SeiteMehr())};
 });
 p(z.mit===true,"F5 mit Lager-Zugriff steht das Lager in der Leiste",z);
 p(z.ohne===false,
   "F6 GEGENPROBE: ohne Lager-Zugriff nicht - es ist dasselbe Recht wie zuvor",z);
 p(/lfOeffnen/.test(z.handler),
   "F5a und der Lager-Knopf fuehrt ins Lieferanten-Lager, nicht in die Einstellungen",z.handler.slice(0,80));
 p(z.mehr===false,
   "F5b GEGENPROBE: der frueher doppelte Eintrag unter Mehr ist weg",z.mehr);
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
 // v3.245: Eine Preisliste hat keine Bezeichnungsspalte. Dass sie trotzdem
 // laeuft, prueft der Import-Pruefstand am Verhalten (Abschnitt F dort);
 // hier wird festgehalten, dass die Angabe am LIEFERANTEN-Import haengt und
 // nicht etwa im gemeinsamen js/08 fuer alle gesetzt wurde.
 p(/pflichtNurNeu:\["bezeichnung"\]/.test(quelle),
   "H6 die Bezeichnung ist nur fuer NEUE Artikel Pflicht - so laeuft eine reine Preisliste durch",null);
 p(/nur für neue/.test(z.aufbau),
   "H7 und der Aufbau-Hinweis sagt das, samt dem Hinweis auf die Preisliste",z.aufbau.slice(0,400));

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

 // ---- N  Preis (v3.233) --------------------------------------------------
 //
 // Ansage des Anwenders: "Ich denke wir können schon starten bevor ich die
 // preise habe." Der teure Fehler waere deshalb, einen fehlenden Preis als
 // 0 zu behandeln: die Summe saehe vollstaendig aus und waere zu klein.
 // Genau das prueft dieser Abschnitt.
 console.log("\nN · Preis");
 z=await page.evaluate(()=>{
  lfArtikel=[
   {id:1,lieferant:"B",artikelnr:"A1",bezeichnung:"Rinne",gruppe:"R",vpe:5,mindestbestand:10,preis:12.5},
   {id:2,lieferant:"B",artikelnr:"A2",bezeichnung:"Seiher",gruppe:"S",vpe:1,mindestbestand:4},
   {id:3,lieferant:"B",artikelnr:"A3",bezeichnung:"Haken",gruppe:"H",vpe:1,mindestbestand:2,preis:0}];
  lfBewegungen=[]; lfEinkauf=[];
  return {
   p1:lfPreis(lfArtikel[0]), p2:lfPreis(lfArtikel[1]), p3:lfPreis(lfArtikel[2]),
   hat1:lfHatPreis(lfArtikel[0]), hat2:lfHatPreis(lfArtikel[1]), hat3:lfHatPreis(lfArtikel[2]),
   // A1: fehlt 10, VPE 5 -> Bestellmenge 10, mal 12.50 = 125
   wert1:lfZeilenwert(lfArtikel[0]), wert2:lfZeilenwert(lfArtikel[1]),
   summe:lfEinkaufsWert()
  };
 });
 p(z.p1===12.5&&z.p2===null,"N1 ein hinterlegter Preis wird gelesen, ein fehlender ist null",z);
 p(z.hat3===true&&z.p3===0,
   "N2 GEGENPROBE: ein Preis von 0 ist ein PREIS (Gratisartikel), kein fehlender - die beiden sind nicht dasselbe",z);
 p(z.wert1===125,"N3 der Zeilenwert rechnet mit der Bestellmenge, nicht mit der Fehlmenge",z);
 p(z.wert2===null,"N4 GEGENPROBE: ohne Preis gibt es keinen Zeilenwert - und keine 0",z);
 p(z.summe.summe===125&&z.summe.mit===2&&z.summe.ohne===1,
   "N5 die Summe zaehlt nur Zeilen MIT Preis (125.00) und weiss, dass sie eine nicht kennt",z.summe);
 // Die Anzeige muss das auch sagen - eine stille Summe waere hier die
 // gefaehrlichste Variante.
 z=await page.evaluate(()=>{
  lfEinkaufZeichnen();
  const mit=$("liefEinkaufListe").textContent.replace(/\s+/g," ");
  // Und jetzt ganz ohne Preise: dann darf GAR KEINE Summe dastehen.
  lfArtikel.forEach(a=>{ delete a.preis });
  lfEinkaufZeichnen();
  const ohne=$("liefEinkaufListe").textContent.replace(/\s+/g," ");
  return {mit,ohne,text:lfEinkaufsText()};
 });
 p(/CHF 125\.00/.test(z.mit)&&/1.{0,3}Position/.test(z.mit)&&/nicht enthalten/.test(z.mit),
   "N6 die Liste zeigt die Summe UND sagt, wie viele Positionen ihr fehlen",z.mit.slice(-220));
 p(!/CHF/.test(z.ohne)&&/keine Summe/.test(z.ohne),
   "N7 GEGENPROBE: ohne jeden Preis steht GAR KEINE Summe da - lieber nichts als eine stillschweigend zu kleine",z.ohne.slice(-220));
 // Speichern: leeres Feld schreibt NULL, nicht 0.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  $("liefArtikelMindest").value="10";
  $("liefArtikelPreis").value="";
  await lfMindestSpeichern();
  await new Promise(r=>setTimeout(r,140));
  const u=window.__db.ruf.filter(r=>r.was==="update");
  return {werte:u.length?u[0].werte:null};
 },SB);
 p(z.werte&&z.werte.preis===null,
   "N8 ein leeres Preisfeld schreibt NULL - nicht 0, sonst waere der Artikel gratis",z);
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  $("liefArtikelPreis").value="18.40";
  await lfMindestSpeichern();
  await new Promise(r=>setTimeout(r,140));
  const u=window.__db.ruf.filter(r=>r.was==="update");
  return {werte:u.length?u[0].werte:null};
 },SB);
 p(z.werte&&Number(z.werte.preis)===18.4,"N9 ein eingetragener Preis wird gespeichert",z);
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await lfLaden();
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  $("liefArtikelPreis").value="-3";
  await lfMindestSpeichern();
  await new Promise(r=>setTimeout(r,80));
  return {ruf:window.__db.ruf.length, fehler:$("liefArtikelFehler").textContent};
 },SB);
 p(z.ruf===0&&/Preis/.test(z.fehler),
   "N10 GEGENPROBE: ein negativer Preis wird nicht gespeichert, und die App sagt warum",z);
 // Das Alter des Preises: frisch schweigt, alt meldet sich.
 z=await page.evaluate(()=>{
  const tage=n=>{ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10) };
  return {
   frisch:lfPreisAlterText({preis:5,preis_stand:tage(3)}),
   halb:lfPreisAlterText({preis:5,preis_stand:tage(200)}),
   alt:lfPreisAlterText({preis:5,preis_stand:tage(500)}),
   ohne:lfPreisAlterText({preis:5})
  };
 });
 p(z.frisch===""&&z.ohne==="",
   "N11 ein frischer Preis erzeugt keinen Hinweis - und einer ohne Datum auch nicht",z);
 p(/Preis von/.test(z.halb)&&!/älter als ein Jahr/.test(z.halb),
   "N12 ein halbjahresalter Preis nennt sein Datum",z.halb);
 p(/älter als ein Jahr/.test(z.alt),
   "N13 und einer ueber einem Jahr sagt ausdruecklich, dass er alt ist - ein Preis ohne Alter sieht nach 14 Monaten aus wie gestern",z.alt);
 p(/key:"preis"/.test(quelle)&&/alias:\["preis"/.test(quelle),
   "N14 die Preisliste des Haendlers laesst sich als Excel-Datei einlesen, sobald sie da ist",null);
 z=await page.evaluate(()=>!!document.getElementById("liefArtikelPreis")
   &&!!document.getElementById("liefArtikelPreisStand"));
 p(z===true,"N15 die Bedienteile stehen im Dokument",z);

 // ---- O  Die Bruecke zur Regie-Position (v3.234) ------------------------
 //
 // Ansage des Anwenders: "die artikel aus unserer regieliste decken sich
 // viele mit der bteam liste... aber nicht alle."
 //
 // Der teure Fehler waere hier, aus n:1 ein 1:1 zu machen - oder eine
 // Zuordnung zu erfinden, wo keine passt. Beides prueft dieser Abschnitt.
 console.log("\nO · Die Bruecke zur Regie-Position");
 z=await page.evaluate((k)=>{
  eval("("+k+")()");
  return {katalog:lfRegieListe().length, erste:lfRegieListe()[0]};
 },KATALOG);
 p(z.katalog===5&&z.erste&&z.erste.edv_nr==="203.06"&&z.erste.id===7001,
   "O1 der Regie-Katalog kommt aus lagArtikelListe() (js/59) - dieselbe Liste wie Materialbestand und Lagerverwaltung",z);
 p(!/from\("materials"\)/.test(quelle)&&!/update\([^)]*materials/.test(quelle),
   "O2 GEGENPROBE: js/82 schreibt NICHT in materials - die Regieliste wird nur gelesen",null);
 // n:1 - drei Rinnenseiher zeigen auf dieselbe Regie-Position.
 z=await page.evaluate((k)=>{
  eval("("+k+")()");
  lfArtikel=[
   {id:1,lieferant:"B",artikelnr:"A1",bezeichnung:"Rinnenseiher 60 mm Stahl verzinkt",gruppe:"Rinnenseiher",material:"Stahl verzinkt"},
   {id:2,lieferant:"B",artikelnr:"A2",bezeichnung:"Rinnenseiher 75 mm Stahl verzinkt",gruppe:"Rinnenseiher",material:"Stahl verzinkt"},
   {id:3,lieferant:"B",artikelnr:"A3",bezeichnung:"Rinnenseiher 100 mm Stahl verzinkt",gruppe:"Rinnenseiher",material:"Stahl verzinkt"},
   {id:4,lieferant:"B",artikelnr:"A4",bezeichnung:"Vogelabwehrstäbe Ecopic 1-reihig",gruppe:"Vogelabwehr",material:""}];
  lfBewegungen=[]; lfEinkauf=[]; lfVorschlagCache={};
  const v=lfArtikel.map(a=>{
   const liste=lfRegieVorschlaege(a);
   return {nr:a.artikelnr, bester:liste.length?liste[0].no:null,
           sicher:lfRegieSicher(liste), anzahl:liste.length};
  });
  return v;
 },KATALOG);
 p(z[0].bester==="203.06"&&z[1].bester==="203.06"&&z[2].bester==="203.06",
   "O3 drei verschiedene Rinnenseiher schlagen DIESELBE Regie-Position vor - n:1 ist der Normalfall, nicht der Fehler",z);
 p(z[3].anzahl===0||z[3].bester!=="203.06",
   "O4 GEGENPROBE: ein Artikel ohne passende Position bekommt keine aufgedraengt ('nicht alle')",z[3]);
 // Die Einheit: Lieferantenartikel haben keine, deshalb werden Stueck UND
 // Laenge gefragt. Wuerde nur eine gefragt, fiele die halbe Regieliste weg.
 z=await page.evaluate((k)=>{
  eval("("+k+")()");
  lfVorschlagCache={};
  const rinne={id:9,artikelnr:"A9",bezeichnung:"Dachrinnen 333x0.7 mm Titanzink",gruppe:"Dachrinnen",material:"Titanzink"};
  lfArtikel=[rinne];
  const beide=lfRegieVorschlaege(rinne).map(v=>v.no);
  // Gegenprobe: nur Stueck gefragt - die m1-Position kann gar nicht kommen.
  const nurStueck=(rmatVorschlaege("Dachrinnen 333x0.7 mm Titanzink Dachrinnen","St","Titanzink")||[]).map(v=>v.no);
  return {beide,nurStueck};
 },KATALOG);
 p(z.beide.indexOf("201.01")>=0,
   "O5 eine Rinne (Katalogeinheit m1) wird gefunden, obwohl der Artikel keine Einheit hat",z);
 p(z.nurStueck.indexOf("201.01")<0,
   "O6 GEGENPROBE: mit nur EINER Einheitenklasse waere sie unauffindbar - deshalb werden beide gefragt",z);
 // Vorwaehlen nur, wo es sicher ist.
 z=await page.evaluate((k)=>{
  eval("("+k+")()");
  lfVorschlagCache={};
  lfArtikel=[
   {id:1,lieferant:"B",artikelnr:"A1",bezeichnung:"Rinnenhalter Titanzink 333",gruppe:"Rinnenhalter",material:"Titanzink"},
   {id:2,lieferant:"B",artikelnr:"A2",bezeichnung:"Schraube 4.5x35 Inox",gruppe:"Schrauben",material:""}];
  lfZuordnungen={};
  lfZuordnenSichereUebernehmen();
  return {gesetzt:Object.keys(lfZuordnungen).length, wahl:lfZuordnungen["1"]||null,
          zwei:lfZuordnungen["2"]||null};
 },KATALOG);
 p(z.wahl==="7003",
   "O7 ein sicherer Vorschlag wird von 'Sichere einsetzen' uebernommen",z);
 p(z.zwei===null,
   "O8 GEGENPROBE: wo nichts passt, wird nichts eingesetzt - die App behauptet nicht",z);
 // Gespeichert wird erst auf Knopfdruck, und in EINEM Aufruf.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  await lfLaden();
  lfVorschlagCache={};
  window.__db.ruf=[];
  lfZuordnungen={"1":"7001","2":""};
  await lfZuordnenSpeichern();
  await new Promise(r=>setTimeout(r,140));
  return {ruf:window.__db.ruf.slice(),
          stand:window.__db.lieferanten_artikel.map(a=>[a.id,a.material_id||null])};
 },{f:SB,k:KATALOG});
 const rpc=z.ruf.filter(r=>r.was==="rpc");
 p(rpc.length===1&&rpc[0].tisch==="rpc:lieferanten_zuordnen",
   "O9 gespeichert wird mit GENAU einem Aufruf, nicht mit n Schreibzugriffen - im Funkloch waere n ein halb gespeicherter Zustand",z.ruf);
 p(!z.ruf.some(r=>r.tisch==="lieferanten_bewegungen"||r.tisch==="lieferanten_einkauf"),
   "O10 GEGENPROBE: eine Zuordnung ist weder Buchung noch Einkaufswunsch",z.ruf);
 p(rpc[0]&&rpc[0].args.paare.length===1&&String(rpc[0].args.paare[0].id)==="1",
   "O11 und nur die WIRKLICH geaenderten Zeilen gehen mit - Artikel 2 stand schon auf 'keine'",rpc[0]&&rpc[0].args);
 // Der Artikel-Dialog: waehlen, entfernen, und die Wahl geht mit dem
 // uebrigen Speichern weg.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  // Eine Vorlage, die eindeutig trifft - hier wird das BEDIENEN geprueft,
  // nicht noch einmal die Bewertung (das war O3-O8).
  Object.assign(window.__db.lieferanten_artikel[0],
   {bezeichnung:"Rinnenhalter Titanzink 333",gruppe:"Rinnenhalter",material:"Titanzink",material_id:null});
  await lfLaden();
  lfVorschlagCache={};
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  const vorher=lfArtikelRegieWahl;
  const knopf=document.querySelector('#liefArtikelRegie [data-lf-regie]:not([data-lf-regie=""])');
  if(!knopf)return {fehlt:"kein Vorschlagsknopf",html:$("liefArtikelRegie").innerHTML.slice(0,200)};
  knopf.click();
  const nachKlick=lfArtikelRegieWahl;
  await lfMindestSpeichern();
  await new Promise(r=>setTimeout(r,140));
  const u=window.__db.ruf.filter(r=>r.was==="update");
  return {vorher,nachKlick,werte:u.length?u[0].werte:null};
 },{f:SB,k:KATALOG});
 p(z.vorher===""&&z.nachKlick&&z.nachKlick!=="",
   "O12 im Artikel-Dialog laesst sich ein Vorschlag mit einem Klick waehlen",z);
 p(z.werte&&String(z.werte.material_id)===String(z.nachKlick),
   "O13 und die Wahl geht mit demselben Speichern weg wie Mindestbestand und Preis",z);
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  window.__db.lieferanten_artikel[0].material_id=7001;
  await lfLaden();
  lfVorschlagCache={};
  window.__db.ruf=[];
  lfArtikelOeffnen(1);
  const vorher=lfArtikelRegieWahl;
  document.querySelector('#liefArtikelRegie [data-lf-regie=""]').click();
  await lfMindestSpeichern();
  await new Promise(r=>setTimeout(r,140));
  const u=window.__db.ruf.filter(r=>r.was==="update");
  return {vorher, werte:u.length?u[0].werte:null};
 },{f:SB,k:KATALOG});
 p(String(z.vorher)==="7001",
   "O14 eine bestehende Zuordnung steht beim Oeffnen da",z);
 p(z.werte&&z.werte.material_id===null,
   "O15 GEGENPROBE: 'entfernen' schreibt NULL - 'keine Zuordnung' ist ein gueltiger Zustand, kein fehlender Wert",z);
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  return ["liefZuordnenKnopf","liefZuordnenModal","liefZuordnenListe","liefZuordnenSichere",
          "liefZuordnenSpeichern","liefZuordnenNurOffene","liefArtikelRegie"].filter(x=>!el(x));
 });
 p(z.length===0,"O16 alle Bedienteile stehen im Dokument",z);
 p(/rmatVorschlaege\(/.test(quelle)&&/rmatIstSicher\(/.test(quelle),
   "O17 bewertet wird mit der VORHANDENEN Bewertung aus js/57 - keine zweite Wahrheit darueber, was ein Treffer ist",null);

 // ---- P  Zuordnen je Gruppe (v3.235) -----------------------------------
 //
 // Ansage des Anwenders: "können wir das so machen das ich die zuordnung pro
 // kategorie machen kann damit es übersichtlicher ist" - und der gemeldete
 // Fehler dazu: "zb rinnenstutzen ist ein einhängestutzen gerade, da lag die
 // app daneben".
 //
 // Der zweite Teil ist der wichtigere: die Textbewertung zieht "Rinnen..."
 // zu Rinnenwinkel und Rinnenboden. Dagegen hilft keine bessere Wortregel,
 // sondern die Entscheidung des Menschen - einmal gesagt, gilt sie fuer die
 // ganze Gruppe.
 console.log("\nP · Zuordnen je Gruppe");
 const GRUPPE=`()=>{
  lfArtikel=[
   {id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250 Titanzink",gruppe:"Rinnenstutzen",material:"Titanzink"},
   {id:2,lieferant:"B",artikelnr:"S2",bezeichnung:"Rinnenstutzen 330 Titanzink",gruppe:"Rinnenstutzen",material:"Titanzink"},
   {id:3,lieferant:"B",artikelnr:"S3",bezeichnung:"Rinnenstutzen 250 Kupfer",gruppe:"Rinnenstutzen",material:"Kupfer"},
   {id:4,lieferant:"B",artikelnr:"W1",bezeichnung:"Rinnenwinkel 250 Titanzink",gruppe:"Rinnenwinkel",material:"Titanzink"}];
  lfBewegungen=[]; lfEinkauf=[]; lfVorschlagCache={}; lfZuordnungen={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=true;
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()");
  eval("("+o.g+")()");
  return {gruppen:lfZuordnenGruppen().map(g=>[g.name,g.offen,g.gesamt]),
          alle:lfZuordnenKandidaten().length};
 },{k:KATALOG,g:GRUPPE});
 p(z.gruppen.length===2&&z.gruppen[0][0]==="Rinnenstutzen"&&z.gruppen[0][2]===3,
   "P1 die Gruppen werden aus den Artikeln abgeleitet, mit offen/gesamt - keine zweite Gruppenliste",z);
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()");
  eval("("+o.g+")()");
  lfZuordnenGruppe="Rinnenstutzen";
  const nurGruppe=lfZuordnenKandidaten().map(a=>a.artikelnr);
  const reihenfolge=lfZuordnenKandidaten().map(a=>a.bezeichnung);
  lfZuordnenSuche="250";
  const mitSuche=lfZuordnenKandidaten().map(a=>a.artikelnr);
  lfZuordnenSuche="kupfer";
  const nachMaterial=lfZuordnenKandidaten().map(a=>a.artikelnr);
  return {nurGruppe,reihenfolge,mitSuche,nachMaterial};
 },{k:KATALOG,g:GRUPPE});
 // Geprueft wird die MENGE, nicht die Reihenfolge der Artikelnummern -
 // sortiert wird nach Bezeichnung, und das ist Absicht (siehe P2a).
 p(z.nurGruppe.slice().sort().join(",")==="S1,S2,S3",
   "P2 die Gruppenwahl zeigt genau diese Gruppe - der Rinnenwinkel bleibt draussen",z);
 p(z.reihenfolge.join(" | ")===z.reihenfolge.slice().sort((x,y)=>x.localeCompare(y,"de")).join(" | "),
   "P2a und geordnet wird nach BEZEICHNUNG, nicht nach Artikelnummer - beim Durchgehen sucht man den Namen, nicht die Nummer",z.reihenfolge);
 p(z.mitSuche.slice().sort().join(",")==="S1,S3"&&z.nachMaterial.join(",")==="S3",
   "P3 und das Suchfeld grenzt darin weiter ein, nach Mass wie nach Werkstoff - damit lassen sich die Groessenpaare (250/330) getrennt setzen",z);
 // Sammelsetzen: was ANGEZEIGT wird, wird gesetzt - nichts Unsichtbares.
 z=await page.evaluate(async (o)=>{
  eval("("+o.k+")()");
  eval("("+o.g+")()");
  lfZuordnenGruppe="Rinnenstutzen";
  lfZuordnenSuche="250";
  $("liefZuordnenRegie").value="203.06";       // Rinnenseiher - hier nur als Ziel
  await lfZuordnenAlleSetzen();
  return {gesetzt:Object.assign({},lfZuordnungen)};
 },{k:KATALOG,g:GRUPPE});
 p(Object.keys(z.gesetzt).length===2&&z.gesetzt["1"]==="7001"&&z.gesetzt["3"]==="7001",
   "P4 'Alle angezeigten setzen' trifft genau die sichtbaren zwei - nicht die ganze Gruppe und nicht das ganze Lager",z);
 p(z.gesetzt["2"]===undefined&&z.gesetzt["4"]===undefined,
   "P5 GEGENPROBE: der ausgeblendete Artikel derselben Gruppe und der fremden Gruppe bleiben unangetastet",z);
 z=await page.evaluate(async (o)=>{
  eval("("+o.k+")()");
  eval("("+o.g+")()");
  lfZuordnenGruppe="Rinnenstutzen";
  $("liefZuordnenRegie").value="999.99";
  await lfZuordnenAlleSetzen();
  const unbekannt={anzahl:Object.keys(lfZuordnungen).length, meldung:$("liefZuordnenMeldung").textContent};
  $("liefZuordnenRegie").value="";
  await lfZuordnenAlleSetzen();
  const leer={anzahl:Object.keys(lfZuordnungen).length, meldung:$("liefZuordnenMeldung").textContent};
  return {unbekannt,leer};
 },{k:KATALOG,g:GRUPPE});
 p(z.unbekannt.anzahl===0&&/nicht im Regie-Katalog/.test(z.unbekannt.meldung),
   "P6 GEGENPROBE: eine EDV-Nr., die es nicht gibt, setzt nichts - und die App sagt warum",z.unbekannt);
 p(z.leer.anzahl===0&&/Regie-Position wählen/.test(z.leer.meldung),
   "P7 GEGENPROBE: ein leeres Feld setzt nichts - sonst wuerden alle angezeigten stillschweigend geleert",z.leer);
 // DER GEMELDETE FEHLER: "rinnenstutzen ist ein einhängestutzen gerade".
 // Die Textbewertung kann das nicht wissen. Die Gruppe weiss es, sobald der
 // Mensch es EINMAL gesagt hat.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()");
  eval("("+o.g+")()");
  const vorher=lfGruppenVorschlag(lfArtikel[1]);
  // Der Mensch ordnet EINEN Rinnenstutzen von Hand zu.
  lfZuordnungen["1"]="7001";
  const nachher=lfGruppenVorschlag(lfArtikel[1]);
  const fremd=lfGruppenVorschlag(lfArtikel[3]);   // andere Gruppe
  return {vorher, nachher:nachher&&{nr:nachher.regie.edv_nr,anzahl:nachher.anzahl}, fremd};
 },{k:KATALOG,g:GRUPPE});
 p(z.vorher===null,"P8 ohne eine einzige Entscheidung gibt es keinen Gruppenvorschlag - die App erfindet kein Muster",z);
 p(z.nachher&&z.nachher.nr==="203.06"&&z.nachher.anzahl===1,
   "P9 EINE Zuordnung von Hand, und die Gruppe schlaegt sie fuer die uebrigen vor - genau der gemeldete Fall (Rinnenstutzen = Einhaengestutzen)",z);
 p(z.fremd===null,
   "P10 GEGENPROBE: eine andere Gruppe lernt davon NICHT mit - sonst zoege eine Entscheidung das ganze Lager hinter sich her",z);
 // Auch noch nicht gespeicherte Entscheidungen zaehlen - sonst muesste man
 // erst speichern, damit die Gruppe mitlernt.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()");
  eval("("+o.g+")()");
  lfZuordnungen["1"]="7001";
  lfZuordnenGruppe="Rinnenstutzen";
  lfZuordnenSichereUebernehmen();
  return {gesetzt:Object.assign({},lfZuordnungen), meldung:$("liefZuordnenMeldung").textContent};
 },{k:KATALOG,g:GRUPPE});
 p(z.gesetzt["2"]==="7001"&&z.gesetzt["3"]==="7001",
   "P11 'Sichere Vorschläge einsetzen' folgt dem Gruppenmuster - eine Handzuordnung genuegt fuer den Rest",z);
 p(z.gesetzt["4"]===undefined,
   "P12 GEGENPROBE: und bleibt dabei in der angezeigten Gruppe",z);
 p(/Gruppe/.test(z.meldung),
   "P13 die App sagt auch, dass sie dem Gruppenmuster gefolgt ist - nicht nur, dass sie etwas gesetzt hat",z.meldung);
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  return ["liefZuordnenGruppe","liefZuordnenSuche","liefZuordnenRegie",
          "liefZuordnenRegieListe","liefZuordnenAlle"].filter(x=>!el(x));
 });
 p(z.length===0,"P14 alle Bedienteile stehen im Dokument",z);

 // ---- Q  Scannen im Regierapport (v3.236) ------------------------------
 //
 // Der Zweck der ganzen Bruecke: auf dem Dach den Artikel scannen, und die
 // Rapportzeile traegt EURE EDV-Nr. und EUREN Preis.
 //
 // Der teure Fehler waere, bei einem unbekannten oder unzugeordneten Code
 // trotzdem irgendeine Zeile anzulegen - dann stuende im Rapport Material,
 // das niemand verbaut hat.
 console.log("\nQ · Scannen im Regierapport");
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()");
  lfArtikel=[
   {id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250 Titanzink",
    gruppe:"Rinnenstutzen",material:"Titanzink",ean:"111",material_id:7001},
   {id:2,lieferant:"B",artikelnr:"S2",bezeichnung:"Rinnenstutzen 330 Titanzink",
    gruppe:"Rinnenstutzen",material:"Titanzink",ean:"222",material_id:null},
   {id:3,lieferant:"B",artikelnr:"S3",bezeichnung:"Alt",gruppe:"Rinnenstutzen",
    ean:"333",material_id:7001,archiviert:true}];
  lfBewegungen=[]; lfEinkauf=[];
  return {
   treffer:lfBarcodeZuRegie("111"),
   ohneZuordnung:lfBarcodeZuRegie("222"),
   archiviert:lfBarcodeZuRegie("333"),
   unbekannt:lfBarcodeZuRegie("999"),
   leer:lfBarcodeZuRegie("  ")
  };
 },{k:KATALOG});
 p(z.treffer.ok===true&&z.treffer.regie.edv_nr==="203.06"&&z.treffer.quelle==="lieferant",
   "Q1 ein zugeordneter Barcode liefert die Regie-Position - das ist der ganze Zweck der Bruecke",z.treffer);
 p(z.ohneZuordnung.ok===false&&z.ohneZuordnung.grund==="ohne-zuordnung"
   &&/Zuordnen/.test(z.ohneZuordnung.text),
   "Q2 ein bekannter Artikel OHNE Regie-Position liefert nichts - und sagt, wo man sie nachträgt",z.ohneZuordnung);
 p(z.archiviert.ok===false&&z.archiviert.grund==="archiviert",
   "Q3 ein archivierter Artikel wird nicht verrechnet",z.archiviert);
 // v3.251: Der Satz nennt nur noch EIN Lager ("im Lager nicht bekannt")
 // statt "weder im Lieferanten-Lager noch in der Lagerverwaltung" - es gibt
 // nur noch eines. Die Zusage ist unveraendert: der Code steht drin, und es
 // wird gesagt, dass er nicht bekannt ist.
 p(z.unbekannt.ok===false&&z.unbekannt.grund==="unbekannt"
   &&/nicht bekannt/.test(z.unbekannt.text)&&/999/.test(z.unbekannt.text),
   "Q4 ein unbekannter Code nennt den Code - ein Scanner, der schweigt, ist auf dem Dach schlimmer als einer, der 'kenne ich nicht' sagt",z.unbekannt);
 p(!/Lagerverwaltung/.test(z.unbekannt.text),
   "Q4a GEGENPROBE: und verweist nicht mehr auf ein Lager, das es nicht gibt",z.unbekannt.text);
 p(z.leer.ok===false&&z.leer.grund==="leer","Q5 und ein leerer Code ebenso",z.leer);
 // Das Verhalten im Rapport: Zeile anlegen, hochzaehlen, und bei jedem
 // Misserfolg NICHTS anlegen.
 const SCAN=`(code)=>{ window.barcodeScannen=cb=>cb(code) }`;
 z=await page.evaluate(async(o)=>{
  eval("("+o.k+")()");
  lfArtikel=[{id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250",
              gruppe:"Rinnenstutzen",ean:"111",material_id:7001},
             {id:2,lieferant:"B",artikelnr:"S2",bezeichnung:"Ohne",
              gruppe:"Rinnenstutzen",ean:"222",material_id:null}];
  lfBewegungen=[]; lfEinkauf=[];
  const echt=window.barcodeScannen;
  mats.length=0;
  // Der Scan-Ablauf ist seit v3.237 asynchron - er wartet auf die
  // Lagerbuchung. Ohne dieses Warten liest der Pruefstand mats, BEVOR die
  // Zeile entsteht, und misst damit nichts.
  const warte=()=>new Promise(r=>setTimeout(r,120));
  // Hier ohne Ausbuchen: geprueft wird das Verhalten der Rapportzeile.
  // Das Buchen hat seinen eigenen Abschnitt (R).
  const k=$("matScanAusbuchen"); if(k)k.checked=false;
  eval("("+o.s+")")("111"); rapportMaterialScannen(); await warte();
  const nach1=mats.map(m=>[m.no,m.qty]);
  eval("("+o.s+")")("111"); rapportMaterialScannen(); await warte();
  const nach2=mats.map(m=>[m.no,m.qty]);
  eval("("+o.s+")")("222"); rapportMaterialScannen(); await warte();
  const nachOhne=mats.map(m=>[m.no,m.qty]);
  const hinweisOhne=$("matScanHinweis").textContent;
  eval("("+o.s+")")("999"); rapportMaterialScannen(); await warte();
  const nachUnbekannt=mats.map(m=>[m.no,m.qty]);
  window.barcodeScannen=echt;
  if(k)k.checked=true;
  mats.length=0;
  return {nach1,nach2,nachOhne,nachUnbekannt,hinweisOhne};
 },{k:KATALOG,s:SCAN});
 p(z.nach1.length===1&&z.nach1[0][0]==="203.06"&&z.nach1[0][1]===1,
   "Q6 der erste Scan legt EINE Zeile mit der EDV-Nr. und Menge 1 an",z.nach1);
 p(z.nach2.length===1&&z.nach2[0][1]===2,
   "Q7 der zweite Scan desselben Artikels zaehlt HOCH statt eine zweite Zeile anzulegen - dreimal scannen heisst drei Stueck",z.nach2);
 p(z.nachOhne.length===1&&z.nachOhne[0][1]===2,
   "Q8 GEGENPROBE: ein Artikel ohne Regie-Position legt NICHTS an - sonst stuende Material im Rapport, das niemand verbaut hat",z.nachOhne);
 p(/Zuordnen/.test(z.hinweisOhne),"Q9 und der Hinweis sagt, was zu tun ist",z.hinweisOhne);
 p(z.nachUnbekannt.length===1&&z.nachUnbekannt[0][1]===2,
   "Q10 GEGENPROBE: ein unbekannter Code ebenso wenig",z.nachUnbekannt);
 // Verdrahtung: der Knopf wird ERST NACH dem Einlesen aller Dateien
 // sichtbar gemacht - js/06 laeuft vor js/82.
 z=await page.evaluate(()=>{
  const k=document.getElementById("matScan");
  return {da:!!k, sichtbar:k?!k.hidden:null, moeglich:rapportScannerMoeglich(),
          hinweis:!!document.getElementById("matScanHinweis")};
 });
 p(z.da&&z.hinweis,"Q11 Knopf und Hinweiszeile stehen im Dokument",z);
 p(z.moeglich===true&&z.sichtbar===true,
   "Q12 und der Knopf ist sichtbar - die Pruefung laeuft NACH dem Einlesen aller Dateien, sonst bliebe er fuer immer versteckt (Fehlertyp aus v3.228)",z);
 p(/typeof lfScanVerbrauch==="function"/.test(lies("js/06-rapport.js")),
   "Q13 ohne Lieferanten-Lager taucht der Knopf gar nicht erst auf - lieber nicht da als beim Druecken fehlschlagen",null);

 // ---- R  Ausbuchen beim Scannen (v3.237) --------------------------------
 //
 // Ansage des Anwenders: "Ja, beim scannen auch gleich ausbuchen."
 //
 // Ein Scan tut damit ZWEIERLEI: verrechnen und Lagerbestand aendern. Die
 // teuren Fehler waeren deshalb: stumm nicht buchen (der Anwender glaubt,
 // der Bestand stimmt), oder doppelt buchen, oder beim Fehlschlag die
 // Rapportzeile mitreissen.
 console.log("\nR · Ausbuchen beim Scannen");
 const LAGERSTAND=`()=>{
  window.__db.lieferanten_artikel=[
   {id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250",
    gruppe:"Rinnenstutzen",ean:"111",material_id:7001},
   {id:2,lieferant:"B",artikelnr:"S2",bezeichnung:"Ohne Zuordnung",
    gruppe:"Rinnenstutzen",ean:"222",material_id:null}];
  window.__db.lieferanten_bewegungen=[{id:1,artikel_id:1,art:"zugang",menge:10}];
 }`;
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  eval("("+o.l+")()");
  await lfLaden();
  window.__db.ruf=[];
  const t=await lfScanVerbrauch("111",{menge:1,ausbuchen:true,projekt:42,grund:"Regierapport"});
  return {t:{ok:t.ok,gebucht:t.gebucht,bestand:t.bestand,hinweis:t.buchhinweis,
             nr:t.regie&&t.regie.edv_nr},
          ruf:window.__db.ruf.filter(r=>r.was==="insert")};
 },{f:SB,k:KATALOG,l:LAGERSTAND});
 p(z.t.ok===true&&z.t.gebucht===true&&z.t.nr==="203.06",
   "R1 ein Scan loest die Regie-Position auf UND bucht aus",z.t);
 p(z.ruf.length===1&&z.ruf[0].tisch==="lieferanten_bewegungen"
   &&z.ruf[0].zeile.art==="abgang"&&Number(z.ruf[0].zeile.menge)===1,
   "R2 gebucht wird GENAU eine Bewegung, als Abgang ueber die gescannte Menge",z.ruf);
 p(z.ruf[0]&&Number(z.ruf[0].zeile.project_id)===42&&z.ruf[0].zeile.ziel==="regierapport",
   "R3 samt Projekt und Herkunft - sonst stuende im Lager ein Abgang ohne Ziel",z.ruf[0]&&z.ruf[0].zeile);
 p(z.t.bestand===9&&/Bestand jetzt 9/.test(z.t.hinweis||""),
   "R4 und der neue Bestand wird zurueckgemeldet, nicht nur gebucht",z.t);
 // Ohne Schalter wird NICHT gebucht - und das muss auch so gesagt werden.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  eval("("+o.l+")()");
  await lfLaden();
  window.__db.ruf=[];
  const t=await lfScanVerbrauch("111",{menge:1,ausbuchen:false});
  return {ok:t.ok,gebucht:t.gebucht,hinweis:t.buchhinweis||"",
          ruf:window.__db.ruf.filter(r=>r.was==="insert").length};
 },{f:SB,k:KATALOG,l:LAGERSTAND});
 p(z.ok===true&&z.gebucht===false&&z.ruf===0,
   "R5 GEGENPROBE: ohne Schalter wird die Zeile verrechnet, aber NICHTS gebucht",z);
 // Ein Artikel ohne Regie-Position darf auch nicht gebucht werden - sonst
 // waere Ware weg, die nie verrechnet wurde.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  eval("("+o.l+")()");
  await lfLaden();
  window.__db.ruf=[];
  const t=await lfScanVerbrauch("222",{menge:1,ausbuchen:true});
  return {ok:t.ok,grund:t.grund,ruf:window.__db.ruf.filter(r=>r.was==="insert").length};
 },{f:SB,k:KATALOG,l:LAGERSTAND});
 p(z.ok===false&&z.grund==="ohne-zuordnung"&&z.ruf===0,
   "R6 GEGENPROBE: ohne Regie-Position wird NICHT gebucht - sonst waere Ware weg, die nie verrechnet wurde",z);
 // Negativer Bestand: buchen JA, aber sagen. Blockieren waere falsch -
 // dann scheiterte der Rapport an einer Lagerluecke.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  eval("("+o.l+")()");
  window.__db.lieferanten_bewegungen=[];      // gar kein Zugang
  await lfLaden();
  const t=await lfScanVerbrauch("111",{menge:1,ausbuchen:true});
  return {gebucht:t.gebucht,bestand:t.bestand,hinweis:t.buchhinweis};
 },{f:SB,k:KATALOG,l:LAGERSTAND});
 p(z.gebucht===true&&z.bestand===-1&&/negativ/.test(z.hinweis||""),
   "R7 ein Bestand unter null wird gebucht und BENANNT - blockieren hiesse, den Rapport an einer Lagerluecke scheitern zu lassen",z);
 // Scheitert das Buchen, bleibt die Rapportzeile gueltig - aber der
 // Fehlschlag wird nicht verschwiegen.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  eval("("+o.l+")()");
  await lfLaden();
  const echt=sb.from;
  sb.from=name=>{
   const t=echt(name);
   if(name==="lieferanten_bewegungen")
    return Object.assign({},t,{insert:()=>Promise.resolve({error:{message:"Netz weg"}})});
   return t;
  };
  const t=await lfScanVerbrauch("111",{menge:1,ausbuchen:true});
  sb.from=echt;
  return {ok:t.ok,gebucht:t.gebucht,hinweis:t.buchhinweis,nr:t.regie&&t.regie.edv_nr};
 },{f:SB,k:KATALOG,l:LAGERSTAND});
 p(z.ok===true&&z.nr==="203.06"&&z.gebucht===false,
   "R8 scheitert das Buchen, bleibt die Rapportzeile gueltig - verrechnet ist verrechnet",z);
 p(/NICHT ausgebucht/.test(z.hinweis||"")&&/Netz weg/.test(z.hinweis||""),
   "R9 GEGENPROBE: der Fehlschlag wird aber NICHT verschwiegen - sonst glaubte der Anwender, der Bestand sei nachgefuehrt",z);
 // v3.251: Hier stand der Rueckfall auf die alte Lagerverwaltung - ein
 // Treffer dort fuellte die Rapportzeile, wurde aber NICHT gebucht, weil
 // dieses Modul dort nie hineinschreibt. Die Lagerverwaltung ist
 // abgeschafft; betroffen war genau EIN Barcode (gemessen).
 //
 // Die Pruefung ist deshalb nicht gestrichen, sondern gedreht. Was sie jetzt
 // festhaelt, ist der Zustand, der an die Stelle getreten ist: ein Code, den
 // dieses Lager nicht kennt, fuehrt zu KEINER Rapportzeile und zu KEINER
 // Buchung - und es gibt keinen stillen Weg mehr in ein fremdes Modul.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.k+")()");
  eval("("+o.l+")()");
  await lfLaden();
  window.__db.ruf=[];
  const t=await lfScanVerbrauch("777",{menge:1,ausbuchen:true});
  return {ok:t.ok,grund:t.grund,quelle:t.quelle,gebucht:t.gebucht,
          ruf:window.__db.ruf.filter(r=>r.was==="insert").length};
 },{f:SB,k:KATALOG,l:LAGERSTAND});
 p(z.ok===false&&z.grund==="unbekannt"&&z.ruf===0,
   "R10 ein Code, den dieses Lager nicht kennt, fuehrt zu keiner Zeile und zu keiner Buchung",z);
 // GEGENPROBE am Text: kein Zweig ruft mehr in ein fremdes Modul, und keiner
 // behauptet mehr, der Artikel liege 'in der Lagerverwaltung'.
 // Gemessen wird der CODE, nicht der Kommentar - der Kommentar sagt ja
 // gerade, was weggefallen ist, und nennt es dabei beim Namen. Ohne das
 // Herausnehmen wuerde die Gegenprobe an der Erklaerung scheitern.
 const q82=lies("js/82-lieferanten-lager.js")
   .split("\n").filter(l=>!/^\s*\/\//.test(l)).join("\n");
 p(!/lagerVarianteZuBarcode\s*\(/.test(q82)
   &&!/quelle!=="lieferant"/.test(q82)
   &&!/quelle:"lager"/.test(q82),
   "R11 GEGENPROBE: der Rueckfall in die alte Lagerverwaltung ist samt seinem Zweig und seinem Hinweis weg",
   {ruf:/lagerVarianteZuBarcode\s*\(/.test(q82),
    zweig:/quelle!=="lieferant"/.test(q82),
    quelle:/quelle:"lager"/.test(q82)});
 // Der Schalter: sichtbar, eingeschaltet, und je Geraet gemerkt.
 z=await page.evaluate(()=>{
  const box=document.getElementById("matScanAusbuchenBox");
  const k=document.getElementById("matScanAusbuchen");
  if(!k)return {fehlt:true};
  rapportScanSchalterSetzen();
  const an=rapportScanBuchtAus();
  k.checked=false; k.onchange();
  const gemerkt=localStorage.getItem("sd_rapport_scan_buchen");
  const aus=rapportScanBuchtAus();
  k.checked=true; k.onchange();
  return {boxDa:!!box, an, aus, gemerkt, wieder:rapportScanBuchtAus()};
 });
 p(z.boxDa===true&&z.an===true,
   "R12 der Schalter steht sichtbar daneben und ist EINGESCHALTET - so ist es gewollt",z);
 p(z.aus===false&&z.gemerkt==="0"&&z.wieder===true,
   "R13 und er laesst sich ausschalten, gemerkt je Geraet - wer nur nachsehen will, was etwas kostet, bucht nicht aus",z);



 // ---- S  Bewegungen ansehen (v3.238) -----------------------------------
 //
 // Seit v3.237 bucht die App selbstaendig. Diese Liste ist das Netz darunter:
 // sie muss zeigen, was WIRKLICH in der Datenbank steht, und nichts dazu -
 // eine Historie, die rechnet oder rundet, ist keine Historie.
 console.log("\nS · Bewegungen ansehen");
 const BEW=`()=>{
  lfArtikel=[
   {id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250",gruppe:"Rinnenstutzen"},
   {id:2,lieferant:"B",artikelnr:"S2",bezeichnung:"Rinnenseiher 60",gruppe:"Rinnenseiher"}];
  lfBewegungen=[
   {id:5,artikel_id:1,art:"abgang",menge:1,ziel:"regierapport",project_id:42,
    grund:"Regierapport",created_at:"2026-09-30T14:05:00Z",created_by:"p1"},
   {id:4,artikel_id:1,art:"zugang",menge:10,ziel:"unbekannt",created_at:"2026-09-29T08:00:00Z"},
   {id:3,artikel_id:2,art:"korrektur",menge:-2,created_at:"2026-09-28T10:00:00Z"},
   {id:2,artikel_id:99,art:"abgang",menge:3,created_at:"2026-09-27T10:00:00Z"}];
  lfBewArt=""; lfBewSuche="";
  allProjects=[{id:42,name:"Haus Müller",object:"Musterweg 1"}];
  allProfiles=[{id:"p1",first_name:"Hans",last_name:"Meier"}];
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.b+")()");
  lfBewegungenZeichnen();
  const txt=$("liefBewListe").textContent.replace(/\s+/g," ");
  return {txt, kennzahl:$("liefBewKennzahlen").textContent.replace(/\s+/g," "),
          anzahl:lfBewegungenGefiltert().length};
 },{b:BEW});
 p(z.anzahl===4&&/4 Buchung/.test(z.kennzahl)&&/1 Zugang/.test(z.kennzahl)
   &&/2 Abgang/.test(z.kennzahl)&&/1 Korrektur/.test(z.kennzahl),
   "S1 alle Buchungen stehen da, und die Kennzahl zaehlt genau die angezeigten",z.kennzahl);
 p(/Rinnenstutzen 250/.test(z.txt)&&/Haus Müller/.test(z.txt)&&/Hans Meier/.test(z.txt)
   &&/regierapport/.test(z.txt),
   "S2 eine Zeile nennt Artikel, Projekt, Person und Herkunft - sonst weiss niemand, wohin die Ware ging",z.txt.slice(0,220));
 p(/Artikel gelöscht/.test(z.txt),
   "S3 eine Buchung auf einen nicht mehr vorhandenen Artikel wird ANGEZEIGT, nicht verschluckt - die Buchung ist trotzdem passiert",z.txt);
 // Die Mengen: eine Korrektur von -2 muss als 2 mit Vorzeichen erscheinen,
 // nicht als -2 mit zweitem Minus davor.
 p(/±2/.test(z.txt)&&/−1/.test(z.txt)&&/＋10/.test(z.txt),
   "S4 Vorzeichen kommt aus der ART, der Betrag aus der Menge - kein doppeltes Minus bei einer negativen Korrektur",z.txt.slice(0,260));
 // Filter und Suche.
 z=await page.evaluate((o)=>{
  eval("("+o.b+")()");
  lfBewArt="abgang";
  const nurAb=lfBewegungenGefiltert().map(b=>b.id);
  lfBewArt="";
  lfBewSuche="müller";
  const nachProjekt=lfBewegungenGefiltert().map(b=>b.id);
  lfBewSuche="meier";
  const nachPerson=lfBewegungenGefiltert().map(b=>b.id);
  lfBewSuche="seiher";
  const nachArtikel=lfBewegungenGefiltert().map(b=>b.id);
  lfBewSuche="";
  return {nurAb,nachProjekt,nachPerson,nachArtikel};
 },{b:BEW});
 p(z.nurAb.join(",")==="5,2","S5 der Art-Filter zeigt genau diese Art",z);
 p(z.nachProjekt.join(",")==="5"&&z.nachPerson.join(",")==="5",
   "S6 gesucht wird auch nach Projekt und Person, nicht nur nach dem Artikelnamen",z);
 p(z.nachArtikel.join(",")==="3","S7 und nach dem Artikel",z);
 // Diese Ansicht darf NICHTS schreiben und nichts rechnen.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()");
  eval("("+o.b+")()");
  window.__db.ruf=[];
  lfBewegungenZeichnen();
  await lfBewegungenOeffnen();
  await new Promise(r=>setTimeout(r,120));
  return {ruf:window.__db.ruf.filter(r=>r.was!=="select"), auf:!$("liefBewModal").hidden};
 },{f:SB,b:BEW});
 p(z.ruf.length===0,
   "S8 GEGENPROBE: die Bewegungsansicht schreibt NICHTS - sie sieht nur nach",z.ruf);
 p(z.auf===true,"S9 und sie geht auf",z);
 // Kein Bestand wird hier gerechnet - das ist die Aufgabe der Artikelliste,
 // und zwei Rechnungen ueber dasselbe waeren zwei Wahrheiten.
 const quelleBew=quelle.split("function lfBewegungenZeichnen")[1]||"";
 p(!/lfBestand\(/.test(quelleBew.split("async function lfBewegungenOeffnen")[0]||""),
   "S10 GEGENPROBE: in der Historie wird kein Bestand gerechnet - der steht in der Artikelliste",null);
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  return ["liefBewKnopf","liefBewModal","liefBewListe","liefBewArt","liefBewSuche",
          "liefBewKennzahlen"].filter(x=>!el(x));
 });
 p(z.length===0,"S11 alle Bedienteile stehen im Dokument",z);

 // ---- T  Wareneingang (v3.239) -----------------------------------------
 //
 // DIE REGEL IST EINE EINZIGE: was da ist, fehlt nicht mehr.
 //   gebucht >= gewuenscht -> Wunsch erledigt
 //   gebucht <  gewuenscht -> Wunsch um die gebuchte Menge verringert
 //
 // Der teure Fehler waere, den Wunsch bei einer Teillieferung auf der alten
 // Menge stehen zu lassen: die Einkaufsliste verlangte weiter die GANZE
 // Menge, und beim naechsten Bestellen kaeme das Zuwenig doppelt.
 console.log("\nT · Wareneingang");
 const EINGANG=`(wunsch)=>{
  window.__db.lieferanten_artikel=[
   {id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250",
    gruppe:"Rinnenstutzen",vpe:5,mindestbestand:0}];
  window.__db.lieferanten_bewegungen=[];
  window.__db.lieferanten_einkauf=wunsch
   ? [{id:77,artikel_id:1,menge:wunsch,grund:"Baustelle Müller",erledigt_am:null}] : [];
 }`;
 // Volle Lieferung: Wunsch erledigt.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.e+")")(12);
  await lfLaden();
  window.__db.ruf=[];
  lfBuchenOeffnen(1,"zugang");
  const vorbelegt=$("liefBuchenMenge").value;
  const hinweis=$("liefBuchenWunschHinweis").textContent;
  const sichtbar=!$("liefBuchenWunschBox").hidden;
  await lfBuchenSpeichern();
  await new Promise(r=>setTimeout(r,150));
  return {vorbelegt,hinweis,sichtbar,
          ruf:window.__db.ruf.filter(r=>r.was!=="select"),
          wunsch:window.__db.lieferanten_einkauf[0],
          meldung:$("liefMeldung").textContent};
 },{f:SB,k:KATALOG,e:EINGANG});
 p(z.vorbelegt==="12"&&z.sichtbar===true,
   "T1 bei einem Zugang mit offenem Wunsch ist die WUNSCHmenge vorbelegt, nicht die Verpackungseinheit - das ist, was bestellt wurde",z);
 p(/Offener Einkaufswunsch: 12/.test(z.hinweis)&&/erledigt/.test(z.hinweis),
   "T2 und der Hinweis sagt vorher, was die Buchung mit dem Wunsch macht",z.hinweis);
 p(z.wunsch&&!!z.wunsch.erledigt_am,
   "T3 die volle Lieferung hakt den Wunsch ab",z.wunsch);
 p(/Einkaufswunsch erledigt/.test(z.meldung),"T4 und die App sagt es",z.meldung);
 // Teillieferung: Wunsch VERRINGERT, nicht erledigt und nicht unveraendert.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.e+")")(12);
  await lfLaden();
  lfBuchenOeffnen(1,"zugang");
  $("liefBuchenMenge").value="5";
  lfBuchenWunschZeichnen();
  const hinweis=$("liefBuchenWunschHinweis").textContent;
  await lfBuchenSpeichern();
  await new Promise(r=>setTimeout(r,150));
  return {hinweis, wunsch:window.__db.lieferanten_einkauf[0],
          bestand:lfBestand(1), meldung:$("liefMeldung").textContent};
 },{f:SB,k:KATALOG,e:EINGANG});
 p(/bleiben 7 offen/.test(z.hinweis),
   "T5 der Hinweis rechnet beim Tippen mit - man muss nicht im Kopf ausrechnen, was offen bleibt",z.hinweis);
 p(z.wunsch&&!z.wunsch.erledigt_am&&Number(z.wunsch.menge)===7,
   "T6 eine Teillieferung VERRINGERT den Wunsch auf 7 - ihn auf 12 stehen zu lassen hiesse, das Zuwenig doppelt zu bestellen",z.wunsch);
 p(z.bestand===5,"T7 und der Bestand steigt um das Gelieferte",z);
 p(/steht noch auf 7/.test(z.meldung),"T8 die App sagt, was offen bleibt",z.meldung);
 // Rest streichen: erledigt, obwohl weniger kam.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.e+")")(12);
  await lfLaden();
  lfBuchenOeffnen(1,"zugang");
  $("liefBuchenMenge").value="5";
  $("liefBuchenRestStreichen").checked=true;
  await lfBuchenSpeichern();
  await new Promise(r=>setTimeout(r,150));
  return {wunsch:window.__db.lieferanten_einkauf[0], meldung:$("liefMeldung").textContent};
 },{f:SB,k:KATALOG,e:EINGANG});
 p(z.wunsch&&!!z.wunsch.erledigt_am&&Number(z.wunsch.menge)===12,
   "T9 'Rest streichen' hakt ab, OHNE die gewuenschte Menge zu verfaelschen - was verlangt war, bleibt nachvollziehbar",z.wunsch);
 p(/Rest von 7 gestrichen/.test(z.meldung),"T10 und benennt den gestrichenen Rest",z.meldung);
 // Der Haken ist AUS, solange nichts gesagt wird.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.e+")")(12);
  await lfLaden();
  $("liefBuchenRestStreichen").checked=true;      // Rest aus einem frueheren Dialog
  lfBuchenOeffnen(1,"zugang");
  return {haken:$("liefBuchenRestStreichen").checked};
 },{f:SB,k:KATALOG,e:EINGANG});
 p(z.haken===false,
   "T11 GEGENPROBE: der Haken ist beim Oeffnen immer AUS - ein stillschweigend gestrichener Rest waere Ware, die niemand mehr bestellt",z);
 // Ein ABGANG darf den Wunsch nicht anfassen.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.e+")")(12);
  window.__db.lieferanten_bewegungen=[{id:1,artikel_id:1,art:"zugang",menge:20}];
  await lfLaden();
  lfBuchenOeffnen(1,"abgang");
  const sichtbar=!$("liefBuchenWunschBox").hidden;
  const vorbelegt=$("liefBuchenMenge").value;
  await lfBuchenSpeichern();
  await new Promise(r=>setTimeout(r,150));
  return {sichtbar,vorbelegt,wunsch:window.__db.lieferanten_einkauf[0]};
 },{f:SB,k:KATALOG,e:EINGANG});
 p(z.sichtbar===false&&z.vorbelegt==="5",
   "T12 bei einem ABGANG ist der Wunsch-Kasten weg und die Verpackungseinheit vorbelegt - er hat mit dem Wareneingang nichts zu tun",z);
 p(z.wunsch&&!z.wunsch.erledigt_am&&Number(z.wunsch.menge)===12,
   "T13 GEGENPROBE: ein Abgang laesst den Einkaufswunsch unberuehrt",z.wunsch);
 // Ohne Wunsch: alles wie vorher, kein Schreibzugriff auf lieferanten_einkauf.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.e+")")(0);
  await lfLaden();
  window.__db.ruf=[];
  lfBuchenOeffnen(1,"zugang");
  const vorbelegt=$("liefBuchenMenge").value;
  const sichtbar=!$("liefBuchenWunschBox").hidden;
  await lfBuchenSpeichern();
  await new Promise(r=>setTimeout(r,150));
  return {vorbelegt,sichtbar,
          einkauf:window.__db.ruf.filter(r=>r.tisch==="lieferanten_einkauf").length};
 },{f:SB,k:KATALOG,e:EINGANG});
 p(z.vorbelegt==="5"&&z.sichtbar===false&&z.einkauf===0,
   "T14 ohne offenen Wunsch bleibt alles wie vorher - kein Kasten, Verpackungseinheit vorbelegt, kein Schreibzugriff auf die Einkaufsliste",z);
 // Scheitert das Nachfuehren, bleibt die BUCHUNG stehen - die Ware ist da -
 // aber es wird gesagt.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.e+")")(12);
  await lfLaden();
  const echt=sb.from;
  sb.from=name=>{
   const t=echt(name);
   if(name==="lieferanten_einkauf")
    return Object.assign({},t,{update:()=>({eq:()=>Promise.resolve({error:{message:"Netz weg"}})})});
   return t;
  };
  lfBuchenOeffnen(1,"zugang");
  await lfBuchenSpeichern();
  await new Promise(r=>setTimeout(r,150));
  sb.from=echt;
  return {bestand:lfBestand(1), meldung:$("liefMeldung").textContent,
          wunschOffen:!window.__db.lieferanten_einkauf[0].erledigt_am};
 },{f:SB,k:KATALOG,e:EINGANG});
 p(z.bestand===12&&z.wunschOffen===true,
   "T15 scheitert das Nachfuehren, bleibt die Buchung stehen - die Ware ist ja da",z);
 p(/NICHT nachführen/.test(z.meldung)&&/Netz weg/.test(z.meldung),
   "T16 GEGENPROBE: der Fehlschlag wird gesagt - sonst glaubte der Anwender, die Einkaufsliste sei nachgefuehrt",z.meldung);
 // Der Eingangsknopf in der Einkaufsliste belegt die BESTELLmenge vor.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.e+")")(12);
  window.__db.lieferanten_artikel[0].mindestbestand=0;
  await lfLaden();
  lfEinkaufZeichnen();
  const knopf=document.querySelector("#liefEinkaufListe [data-lf-eingang]");
  if(!knopf)return {fehlt:true};
  const menge=knopf.getAttribute("data-lf-eingang-menge");
  knopf.click();
  await new Promise(r=>setTimeout(r,80));
  return {menge, vorbelegt:$("liefBuchenMenge").value, auf:!$("liefBuchenModal").hidden};
 },{f:SB,k:KATALOG,e:EINGANG});
 p(z.menge==="15"&&z.vorbelegt==="15"&&z.auf===true,
   "T17 der 📥 in der Einkaufsliste oeffnet den Zugang mit der BESTELLmenge (12 auf VPE 5 aufgerundet = 15) - mit der Liste in der Hand ist das die Zahl vom Lieferschein",z);

 // ---- U  Inventur (v3.240) ---------------------------------------------
 //
 // BEFUND VOR DEM BAUEN: 0 von 439 Artikeln hatten einen Mindestbestand.
 // Die Einkaufsliste lief leer, weil 439 Artikel einzeln zu erfassen eine
 // Wand ist.
 //
 // Die teuren Fehler hier: einen NICHT gezaehlten Artikel anfassen (dann
 // kann man kein einzelnes Regal zaehlen), oder das Gezaehlte als Zugang
 // buchen (dann behauptet die Bewegungsliste, Ware sei angekommen).
 console.log("\nU · Inventur");
 const INV=`()=>{
  window.__db.lieferanten_artikel=[
   {id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250",gruppe:"Rinnenstutzen",vpe:5,mindestbestand:0},
   {id:2,lieferant:"B",artikelnr:"S2",bezeichnung:"Rinnenstutzen 330",gruppe:"Rinnenstutzen",vpe:5,mindestbestand:0},
   {id:3,lieferant:"B",artikelnr:"W1",bezeichnung:"Rinnenwinkel 250",gruppe:"Rinnenwinkel",vpe:1,mindestbestand:4}];
  window.__db.lieferanten_bewegungen=[{id:1,artikel_id:1,art:"zugang",menge:10}];
  window.__db.lieferanten_einkauf=[];
  lfInvGruppe=""; lfInvSuche=""; lfInvGezaehlt={}; lfInvMindest={};
 }`;
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.i+")()");
  await lfLaden();
  lfInvZeichnen();
  const z1=lfInvZeile(lfArtikelZuId(1));
  lfInvGezaehlt["1"]="14";
  const z2=lfInvZeile(lfArtikelZuId(1));
  lfInvGezaehlt["2"]="";
  const z3=lfInvZeile(lfArtikelZuId(2));
  return {z1,z2,z3,offen:lfInvOffen()};
 },{f:SB,k:KATALOG,i:INV});
 p(z.z1.ist===10&&z.z1.gezaehlt===null&&z.z1.diff===0,
   "U1 ungezaehlt heisst: Bestand 10, keine Differenz, nichts zu tun",z.z1);
 p(z.z2.gezaehlt===14&&z.z2.diff===4,
   "U2 gezaehlt 14 bei Bestand 10 ergibt eine Korrektur von +4",z.z2);
 p(z.z3.gezaehlt===null&&z.z3.diff===0,
   "U3 GEGENPROBE: ein LEERES Feld heisst 'nicht gezaehlt', nicht 'null Stueck' - sonst koennte man kein einzelnes Regal zaehlen",z.z3);
 p(z.offen.korrekturen===1&&z.offen.minima===0,
   "U4 offen ist genau die eine Korrektur",z.offen);
 // Gebucht wird als KORREKTUR, in EINEM Aufruf, und nur fuer das Gezaehlte.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.i+")()");
  await lfLaden();
  lfInvGezaehlt["1"]="14";     // +4
  lfInvGezaehlt["2"]="3";      // Bestand 0 -> +3
  lfInvGezaehlt["3"]="";       // nicht gezaehlt
  lfInvMindest["1"]="10";
  window.__db.ruf=[];
  await lfInvSpeichern();
  await new Promise(r=>setTimeout(r,160));
  const ins=window.__db.ruf.filter(r=>r.was==="insert");
  const rpc=window.__db.ruf.filter(r=>r.was==="rpc");
  return {ins,rpc,meldung:$("liefInvMeldung").textContent,
          bestand1:lfBestand(1),bestand2:lfBestand(2),bestand3:lfBestand(3)};
 },{f:SB,k:KATALOG,i:INV});
 p(z.ins.length===1&&Array.isArray(z.ins[0].zeile)&&z.ins[0].zeile.length===2,
   "U5 alle Korrekturen gehen in EINEM insert weg - nicht eine Runde pro Artikel",z.ins);
 p(z.ins[0]&&z.ins[0].zeile.every(x=>x.art==="korrektur"),
   "U6 und zwar als KORREKTUR, nicht als Zugang - ein Zugang wuerde behaupten, Ware sei angekommen",z.ins[0]&&z.ins[0].zeile);
 p(z.ins[0]&&z.ins[0].zeile.every(x=>x.ziel==="inventur"&&x.grund==="Inventur"),
   "U7 mit Herkunft 'inventur' - in der Bewegungsliste muss erkennbar sein, woher die Zahl kommt",z.ins[0]&&z.ins[0].zeile);
 p(z.ins[0]&&z.ins[0].zeile.map(x=>Number(x.menge)).sort((a,b)=>a-b).join(",")==="3,4",
   "U8 gebucht wird die DIFFERENZ (+4 und +3), nicht die gezaehlte Menge",z.ins[0]&&z.ins[0].zeile);
 p(!z.ins[0]||!z.ins[0].zeile.some(x=>String(x.artikel_id)==="3"),
   "U9 GEGENPROBE: der ungezaehlte Artikel wird NICHT angefasst",z.ins[0]&&z.ins[0].zeile);
 p(z.rpc.length===1&&z.rpc[0].tisch==="rpc:lieferanten_mindestbestand_setzen"
   &&z.rpc[0].args.paare.length===1&&Number(z.rpc[0].args.paare[0].mindestbestand)===10,
   "U10 die Mindestbestaende gehen in EINEM Aufruf weg, und nur die geaenderten",z.rpc);
 p(z.bestand1===14&&z.bestand2===3&&z.bestand3===0,
   "U11 danach stimmt der Bestand mit dem Gezaehlten",z);
 // Scheitern die Buchungen, bleiben die Mindestbestaende unberuehrt - ein
 // Mindestbestand ohne den gezaehlten Bestand meldet sofort falschen Mangel.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.i+")()");
  await lfLaden();
  lfInvGezaehlt["1"]="14";
  lfInvMindest["1"]="10";
  const echt=sb.from;
  sb.from=name=>{
   const t=echt(name);
   if(name==="lieferanten_bewegungen")
    return Object.assign({},t,{insert:()=>Promise.resolve({error:{message:"Netz weg"}})});
   return t;
  };
  window.__db.ruf=[];
  await lfInvSpeichern();
  await new Promise(r=>setTimeout(r,160));
  sb.from=echt;
  return {rpc:window.__db.ruf.filter(r=>r.was==="rpc").length,
          meldung:$("liefInvMeldung").textContent,
          mindest:window.__db.lieferanten_artikel[0].mindestbestand};
 },{f:SB,k:KATALOG,i:INV});
 p(z.rpc===0&&Number(z.mindest)===0,
   "U12 scheitern die Korrekturen, bleiben die Mindestbestaende UNBERUEHRT - einer ohne den gezaehlten Bestand meldet sofort falschen Mangel",z);
 p(/NICHT gebucht/.test(z.meldung)&&/Netz weg/.test(z.meldung),
   "U13 und der Fehlschlag wird gesagt",z.meldung);
 // Gruppenweise und 'allen angezeigten' - derselbe Grundsatz wie beim
 // Zuordnen: was du siehst, wird gesetzt.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.i+")()");
  await lfLaden();
  lfInvGruppe="Rinnenstutzen";
  const sichtbar=lfInvKandidaten().map(a=>a.artikelnr);
  $("liefInvMindestAlle").value="10";
  await lfInvMindestAlle();
  return {sichtbar, gesetzt:Object.assign({},lfInvMindest)};
 },{f:SB,k:KATALOG,i:INV});
 p(z.sichtbar.join(",")==="S1,S2",
   "U14 die Gruppenwahl zeigt nur diese Gruppe",z);
 p(Object.keys(z.gesetzt).length===2&&z.gesetzt["3"]===undefined,
   "U15 'allen angezeigten' trifft genau die sichtbaren - der Rinnenwinkel bleibt unberuehrt",z.gesetzt);
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.i+")()");
  await lfLaden();
  $("liefInvMindestAlle").value="";
  await lfInvMindestAlle();
  const leer={anzahl:Object.keys(lfInvMindest).length,meldung:$("liefInvMeldung").textContent};
  $("liefInvMindestAlle").value="-1";
  await lfInvMindestAlle();
  const neg={anzahl:Object.keys(lfInvMindest).length,meldung:$("liefInvMeldung").textContent};
  return {leer,neg};
 },{f:SB,k:KATALOG,i:INV});
 p(z.leer.anzahl===0&&/Mindestbestand eintragen/.test(z.leer.meldung),
   "U16 GEGENPROBE: ein leeres Feld setzt nichts - sonst wuerden alle angezeigten stillschweigend auf 0 fallen",z.leer);
 p(z.neg.anzahl===0&&/negativ/.test(z.neg.meldung),
   "U17 GEGENPROBE: ein negativer Mindestbestand ebenso nicht",z.neg);
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  return ["liefInvKnopf","liefInvModal","liefInvListe","liefInvGruppe","liefInvSuche",
          "liefInvMindestAlle","liefInvMindestSetzen","liefInvSpeichern"].filter(x=>!el(x));
 });
 p(z.length===0,"U18 alle Bedienteile stehen im Dokument",z);

 // ---- V  Mehrere Lieferanten in der Bedienung (v3.241) -----------------
 //
 // Ansage des Anwenders: "weitere produkte werden folgen."
 //
 // Das Datenmodell ist seit v3.231 mehrlieferantenfaehig, die BEDIENUNG war
 // es nicht. Der teure Fehler: "alle angezeigten setzen" greift quer ueber
 // zwei Haendler, oder eine Gruppenauswahl zeigt Gruppen, die danach keine
 // Zeile haben.
 console.log("\nV · Mehrere Lieferanten in der Bedienung");
 const ZWEI=`()=>{
  lfArtikel=[
   {id:1,lieferant:"B-Team",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250",gruppe:"Rinnenstutzen",mindestbestand:0},
   {id:2,lieferant:"B-Team",artikelnr:"S2",bezeichnung:"Rinnenstutzen 330",gruppe:"Rinnenstutzen",mindestbestand:0,material_id:7001},
   {id:3,lieferant:"Gyso",artikelnr:"G1",bezeichnung:"Dichtungsmasse 310ml",gruppe:"Dichtstoffe",mindestbestand:0,preis:12.5},
   {id:4,lieferant:"Gyso",artikelnr:"G2",bezeichnung:"Butylband 100mm",gruppe:"Bänder",mindestbestand:0}];
  lfBewegungen=[{id:1,artikel_id:1,art:"zugang",menge:10}];
  lfEinkauf=[];
  lfLieferant=""; lfSuche=""; lfVorschlagCache={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=true; lfZuordnungen={};
  lfInvGruppe=""; lfInvSuche=""; lfInvGezaehlt={}; lfInvMindest={};
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  const stand=lfLieferantenStand();
  return {stand, lieferanten:lfLieferanten()};
 },{k:KATALOG,z:ZWEI});
 p(z.lieferanten.join(",")==="B-Team,Gyso"&&z.stand.length===2,
   "V1 die Lieferanten werden aus den Artikeln abgeleitet - keine zweite Liste",z);
 p(z.stand[0].artikel===2&&z.stand[0].zugeordnet===1&&z.stand[0].mitPreis===0
   &&z.stand[0].mitBestand===1&&z.stand[1].mitPreis===1,
   "V2 die Uebersicht zaehlt je Lieferant: Artikel, zugeordnet, mit Preis, mit Bestand",z.stand);
 // Der Filter wirkt in ALLEN drei Ansichten - er ist EINER, nicht drei.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfLieferant="Gyso";
  return {
   haupt:lfArtikel.filter(a=>!a.archiviert&&lfPasstZumFilter(a)&&lfPasstZurSuche(a)).map(a=>a.artikelnr),
   zuordnen:lfZuordnenKandidaten().map(a=>a.artikelnr),
   inventur:lfInvKandidaten().map(a=>a.artikelnr),
   gruppenZu:lfZuordnenGruppen().map(g=>g.name)
  };
 },{k:KATALOG,z:ZWEI});
 p(z.haupt.sort().join(",")==="G1,G2"&&z.zuordnen.sort().join(",")==="G1,G2"
   &&z.inventur.sort().join(",")==="G1,G2",
   "V3 EIN Filter wirkt in Artikelliste, Zuordnen und Inventur - 'an welchem Lieferanten arbeite ich' ist eine Frage, nicht drei",z);
 p(z.gruppenZu.sort().join(",")==="Bänder,Dichtstoffe",
   "V4 und die Gruppenauswahl zeigt nur die Gruppen dieses Lieferanten - sonst stehen dort Gruppen, die danach keine Zeile haben",z.gruppenZu);
 // Sammelsetzen darf NICHT ueber den Lieferanten hinausgreifen.
 z=await page.evaluate(async (o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfLieferant="Gyso";
  $("liefZuordnenRegie").value="203.06";
  await lfZuordnenAlleSetzen();
  const zu=Object.keys(lfZuordnungen).sort();
  lfInvGezaehlt={}; lfInvMindest={};
  $("liefInvMindestAlle").value="10";
  await lfInvMindestAlle();
  return {zu, inv:Object.keys(lfInvMindest).sort()};
 },{k:KATALOG,z:ZWEI});
 p(z.zu.join(",")==="3,4",
   "V5 GEGENPROBE: 'Alle angezeigten setzen' im Zuordnen bleibt beim gewaehlten Lieferanten",z);
 p(z.inv.join(",")==="3,4",
   "V6 GEGENPROBE: und 'allen angezeigten diesen Mindestbestand' ebenso - quer ueber zwei Haendler zu setzen waere der teure Fehler",z);
 // Die Kennzahl zaehlt, was der Filter durchlaesst.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfZeichnen();
  const alle=$("liefKennzahlen").textContent.replace(/\s+/g," ");
  lfLieferant="B-Team";
  lfZeichnen();
  const nurB=$("liefKennzahlen").textContent.replace(/\s+/g," ");
  return {alle,nurB};
 },{k:KATALOG,z:ZWEI});
 p(/4 Artikel/.test(z.alle)&&/2 Artikel/.test(z.nurB)&&/nur B-Team/.test(z.nurB),
   "V7 die Kennzahl zaehlt die GEFILTERTEN Artikel und sagt, dass gefiltert ist",z);
 // Bei nur EINEM Lieferanten bleibt der Filter weg und setzt sich zurueck.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfArtikel=lfArtikel.filter(a=>a.lieferant==="B-Team");
  lfLieferant="Gyso";                 // Rest aus einer frueheren Wahl
  lfLieferantWahlZeichnen("liefLieferantWahl","liefLieferantWahlBox");
  lfLieferantenUebersichtZeichnen();
  return {box:$("liefLieferantWahlBox").hidden, filter:lfLieferant,
          uebersicht:$("liefLieferantenUebersicht").hidden};
 },{k:KATALOG,z:ZWEI});
 p(z.box===true&&z.uebersicht===true,
   "V8 bei nur einem Lieferanten bleiben Filter und Uebersicht weg - ein Filter mit einer Wahl ist Rauschen",z);
 p(z.filter==="",
   "V9 GEGENPROBE: und ein Rest aus einer frueheren Wahl wird zurueckgesetzt - sonst waere die Liste leer und niemand wuesste warum",z);
 // Tippfehler-Schutz: "Bteam" neben "B-Team" waere ein zweiter Lieferant.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  const setze=v=>{ $("liefExcelLieferant").value=v; lfLieferantHinweisZeichnen();
   return {weg:$("liefExcelLieferantHinweis").hidden,
           text:$("liefExcelLieferantHinweis").textContent.replace(/\s+/g," ")} };
  const aehnlich=setze("bteam");
  const gleich=setze("B-Team");
  const neu=setze("Würth");
  // Uebernehmen-Knopf
  setze("b team");
  const k=document.querySelector("#liefExcelLieferantHinweis [data-lf-lieferant-uebernehmen]");
  if(k)k.click();
  const nachKlick=$("liefExcelLieferant").value;
  $("liefExcelLieferant").value="";
  return {aehnlich,gleich,neu,nachKlick};
 },{k:KATALOG,z:ZWEI});
 p(z.aehnlich.weg===false&&/B-Team/.test(z.aehnlich.text)&&/zweiter/.test(z.aehnlich.text),
   "V10 'bteam' warnt vor dem vorhandenen 'B-Team' und sagt, was sonst passiert",z.aehnlich);
 p(z.gleich.weg===true&&z.neu.weg===true,
   "V11 GEGENPROBE: der genaue Name und ein wirklich neuer Haendler loesen KEINE Warnung aus - geblockt wird nichts",z);
 p(z.nachKlick==="B-Team",
   "V12 'Übernehmen' setzt den vorhandenen Namen ein, statt ihn tippen zu lassen",z);
 z=await page.evaluate(()=>{
  const el=id=>!!document.getElementById(id);
  return ["liefLieferantWahl","liefLieferantWahlBox","liefLieferantenUebersicht",
          "liefZuordnenLieferant","liefInvLieferant","liefExcelLieferantHinweis"].filter(x=>!el(x));
 });
 p(z.length===0,"V13 alle Bedienteile stehen im Dokument",z);

 // ---- W  Zeile und Lager laufen auseinander (v3.242) -------------------
 //
 // In v3.237 habe ich selbst vermerkt: gebucht wird, was GESCANNT wurde,
 // nicht was am Ende in der Zeile steht. Wer die Menge hinterher aendert,
 // aendert die Buchung nicht - und der Lagerbestand ist um die Differenz
 // falsch, OHNE dass es jemand merkt. Genau das wird jetzt sichtbar.
 //
 // Nicht gleich nachgebucht wird, weil auf dieselbe EDV-Nr. mehrere
 // Lieferantenartikel zeigen koennen (n:1, v3.234): aus "die Zeile steht
 // jetzt auf 5" folgt nicht, WELCHER Artikel die zwei mehr hergeben soll.
 console.log("\nW · Zeile und Lager laufen auseinander");
 const WSCAN=`(code)=>{ window.barcodeScannen=cb=>cb(code) }`;
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()");
  window.__db.lieferanten_artikel=[
   {id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250",gruppe:"R",ean:"111",material_id:7001},
   {id:2,lieferant:"B",artikelnr:"S2",bezeichnung:"Rinnenstutzen 330",gruppe:"R",ean:"222",material_id:7001}];
  window.__db.lieferanten_bewegungen=[{id:1,artikel_id:1,art:"zugang",menge:50},
                                      {id:2,artikel_id:2,art:"zugang",menge:50}];
  await lfLaden();
  mats.length=0;
  $("matScanAusbuchen").checked=true;
  const warte=()=>new Promise(r=>setTimeout(r,140));
  eval("("+o.s+")")("111"); rapportMaterialScannen(); await warte();
  eval("("+o.s+")")("111"); rapportMaterialScannen(); await warte();
  const nachZwei={qty:mats[0].qty, gebucht:JSON.parse(JSON.stringify(mats[0].gebucht||[])),
                  warnWeg:$("matBuchWarnung").hidden};
  // Jetzt dieselbe EDV-Nr. ueber den ZWEITEN Artikel - n:1.
  eval("("+o.s+")")("222"); rapportMaterialScannen(); await warte();
  const nachDrei={qty:mats[0].qty, gebucht:JSON.parse(JSON.stringify(mats[0].gebucht||[])),
                  zeilen:mats.length, warnWeg:$("matBuchWarnung").hidden};
  // Von Hand auf 5 aendern -> Abweichung
  mats[0].qty=5;
  updateTotals();
  const nachHand={warnWeg:$("matBuchWarnung").hidden,
                  text:$("matBuchWarnung").textContent.replace(/\s+/g," "),
                  abw:rapportBuchAbweichungen()};
  mats.length=0;
  return {nachZwei,nachDrei,nachHand};
 },{f:SB,k:KATALOG,s:WSCAN});
 p(z.nachZwei.qty===2&&z.nachZwei.gebucht.length===1
   &&Number(z.nachZwei.gebucht[0].menge)===2,
   "W1 zwei Scans desselben Artikels: Zeile auf 2, und gebucht wird je ARTIKEL mitgefuehrt",z.nachZwei);
 p(z.nachZwei.warnWeg===true,
   "W2 solange Zeile und Buchung uebereinstimmen, steht keine Warnung da",z.nachZwei);
 p(z.nachDrei.zeilen===1&&z.nachDrei.qty===3&&z.nachDrei.gebucht.length===2,
   "W3 ein ZWEITER Artikel auf derselben EDV-Nr. landet in derselben Zeile - und wird einzeln mitgefuehrt (n:1, genau deshalb je Artikel)",z.nachDrei);
 p(z.nachDrei.warnWeg===true,
   "W4 und auch das ist keine Abweichung: 3 gebucht, Zeile auf 3",z.nachDrei);
 p(z.nachHand.warnWeg===false&&z.nachHand.abw.length===1
   &&z.nachHand.abw[0].gebucht===3&&z.nachHand.abw[0].menge===5,
   "W5 wird die Zeile von Hand auf 5 gesetzt, FAELLT DAS AUF: 3 ausgebucht, Zeile auf 5",z.nachHand);
 p(/nicht<\/b> nachgeführt|nicht nachgeführt/.test(z.nachHand.text)&&/Korrektur/.test(z.nachHand.text),
   "W6 und die Meldung sagt, was gilt (verrechnet wird die Zeile), was nicht (das Lager) und was zu tun ist",z.nachHand.text.slice(0,200));
 // Eine von Hand erfasste Zeile ist KEINE Abweichung.
 z=await page.evaluate(()=>{
  mats.length=0;
  mats.push({date:"2026-10-01",no:"203.06",qty:7});
  updateTotals();
  const r={warnWeg:$("matBuchWarnung").hidden, abw:rapportBuchAbweichungen().length};
  mats.length=0;
  return r;
 });
 p(z.warnWeg===true&&z.abw===0,
   "W7 GEGENPROBE: eine von Hand erfasste Zeile ohne Buchung ist KEINE Abweichung - sie wurde ja nie ausgebucht",z);
 // Ohne Ausbuchen wird auch nichts mitgefuehrt - und damit nichts gemeldet.
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()");
  window.__db.lieferanten_artikel=[
   {id:1,lieferant:"B",artikelnr:"S1",bezeichnung:"Rinnenstutzen 250",gruppe:"R",ean:"111",material_id:7001}];
  window.__db.lieferanten_bewegungen=[];
  await lfLaden();
  mats.length=0;
  $("matScanAusbuchen").checked=false;
  eval("("+o.s+")")("111"); rapportMaterialScannen();
  await new Promise(r=>setTimeout(r,140));
  mats[0].qty=9; updateTotals();
  const r={gebucht:mats[0].gebucht, warnWeg:$("matBuchWarnung").hidden};
  mats.length=0; $("matScanAusbuchen").checked=true;
  return r;
 },{f:SB,k:KATALOG,s:WSCAN});
 p(z.gebucht===undefined&&z.warnWeg===true,
   "W8 GEGENPROBE: ohne Ausbuchen wird nichts mitgefuehrt und nichts gemeldet - es gibt ja keine Buchung, von der die Zeile abweichen koennte",z);
 // Die Angabe haengt an der Zeile und ueberlebt damit das Speichern: sie
 // reist in reports.material_entries (jsonb) mit, ohne Migration.
 p(/material_entries:mats/.test(lies("js/08-katalog-blitzschutz.js"))
   &&/mats=r\.material_entries/.test(lies("js/09-projekte.js")),
   "W9 gespeichert und geladen wird das GANZE Zeilen-Objekt - die Angabe ueberlebt ohne Migration",null);
 p(/updateTotals/.test(lies("js/06-rapport.js").split("function updateTotals")[1].split("\n}")[0]+"")
   ||/rapportBuchWarnungZeichnen/.test(lies("js/06-rapport.js").split("function updateTotals")[1].split("\n}")[0]),
   "W10 die Warnung haengt in updateTotals - dem einen Weg, den jede Aenderung nimmt (Zeichnen, Mengenaenderung, Laden)",null);

 // ---- X  Groesse: Widerspruch statt Beinahe-Treffer (v3.243) ------------
 //
 // Gemessen am 01.10.2026 an den echten 439 Artikeln: Groesse 400 -> 63
 // Artikel, 0 zugeordnet. Groesse 200 -> 46 Artikel, 0 zugeordnet. Die
 // Regie-Liste fuehrt die Rinnenpositionen nur in 250 und 330.
 //
 // Der gefaehrliche Teil war nicht das Offenbleiben, sondern dass die App
 // fuer eine 400er-Rinne die 333er-Position anbot - mit "wie 2x in dieser
 // Gruppe" davor. Eine 400er-Rinne mit dem Preis der 333er ist ein falscher
 // Betrag auf einer Rechnung.
 console.log("\nX · Groesse: Widerspruch statt Beinahe-Treffer");
 // Zwei Dachrinnen in einer Gruppe: eine 333er (passt zu 201.01) und eine
 // 400er (passt zu nichts). Die 333er ist zugeordnet - damit es ein
 // Gruppenmuster GIBT, das der 400er angeboten werden koennte.
 const GROESSE=`()=>{
  lfArtikel=[
   {id:1,lieferant:"B-Team",artikelnr:"D333",bezeichnung:"Dachrinnen 333x0.7 mm Titanzink",
    gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:333,material_id:7002},
   {id:2,lieferant:"B-Team",artikelnr:"D400",bezeichnung:"Dachrinnen 400x0.7 mm Titanzink",
    gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:400},
   {id:3,lieferant:"B-Team",artikelnr:"D200",bezeichnung:"Dachrinnen 200x0.7 mm Titanzink",
    gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:200}];
  lfBewegungen=[]; lfEinkauf=[];
  lfLieferant=""; lfSuche=""; lfVorschlagCache={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=true; lfZuordnungen={};
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  const a400=lfArtikelZuId(2), a333=lfArtikelZuId(1);
  const r201=lfRegieZuNummer("201.01");
  return {
   g400:lfGroesse(a400), g333:lfGroesse(a333),
   dim:lfRegieDimZahlen(r201),
   widerspricht400:lfGroesseWiderspricht(a400,r201),
   widerspricht333:lfGroesseWiderspricht(a333,r201),
   befund400:lfGroessenBefund(a400), befund333:lfGroessenBefund(a333)
  };
 },{k:KATALOG,g:GROESSE});
 p(z.g400===400&&z.g333===333&&z.dim.join(",")==="333",
   "X1 die Groesse kommt aus zuschnitt_mm, die der Regie-Position aus dim",z);
 p(z.widerspricht400===true&&z.widerspricht333===false,
   "X2 333 passt zur 333er-Position, 400 widerspricht ihr",z);
 p(z.befund400.art==="groesse-fehlt"&&z.befund400.vorhanden.join(",")==="333",
   "X3 der Befund sagt nicht 'kein Vorschlag', sondern WELCHE Groessen die Regie-Liste hat",z.befund400);
 // Eine Position ohne Zahl in der Dimension sagt ueber die Groesse nichts
 // aus - die darf nicht als Widerspruch gelten, sonst faellt "alle
 // Materialien" ueberall heraus.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  const a400=lfArtikelZuId(2);
  return {alle:lfGroesseWiderspricht(a400,lfRegieZuNummer("203.06")),
          leer:lfGroesseWiderspricht(a400,lfRegieZuNummer("811.04")),
          ohneGroesse:lfGroesseWiderspricht({bezeichnung:"Dichtmasse",zuschnitt_mm:null},
                                            lfRegieZuNummer("201.01"))};
 },{k:KATALOG,g:GROESSE});
 p(z.alle===false&&z.leer===false&&z.ohneGroesse===false,
   "X4 GEGENPROBE: eine Position OHNE Zahl in der Dimension ist kein Widerspruch - und ein Artikel ohne Groesse auch nicht",z);
 // Der teuerste Weg: das Gruppenmuster.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  const grp400=lfGruppenVorschlag(lfArtikelZuId(2));
  const grp333=lfGruppenVorschlag(lfArtikelZuId(3));
  return {grp400:grp400?String(grp400.regie.edv_nr):null,
          grp200:grp333?String(grp333.regie.edv_nr):null};
 },{k:KATALOG,g:GROESSE});
 p(z.grp400===null&&z.grp200===null,
   "X5 das Gruppenmuster schlaegt die 333er-Position NICHT fuer die 400er und die 200er vor - 'wie 2x in dieser Gruppe' liest sich wie eine Zusage",z);
 // "Sichere Vorschlaege einsetzen" darf nichts setzen - und muss sagen,
 // warum nicht.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  lfZuordnenSichereUebernehmen();
  return {gesetzt:Object.keys(lfZuordnungen).sort().join(","),
          text:$("liefZuordnenMeldung").textContent};
 },{k:KATALOG,g:GROESSE});
 p(z.gesetzt==="",
   "X6 'Sichere Vorschlaege einsetzen' setzt bei widersprechender Groesse NICHTS - ein starker Namenstreffer bei falscher Groesse ist der teure Fall",z);
 p(/Grösse/.test(z.text)&&/nicht/.test(z.text),
   "X7 und sagt, dass es an der Groesse liegt - ein Knopf, der stumm weniger tut, laesst ihn die Zeilen suchen",z.text);
 // Und der Sammelsetzen-Knopf: er laesst die widersprechenden aus, benannt.
 z=await page.evaluate(async (o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  lfZuordnenNurOffene=false;
  $("liefZuordnenRegie").value="201.01";
  await lfZuordnenAlleSetzen();
  return {gesetzt:Object.keys(lfZuordnungen).sort().join(","),
          text:$("liefZuordnenMeldung").textContent};
 },{k:KATALOG,g:GROESSE});
 p(z.gesetzt==="1",
   "X8 'Alle angezeigten setzen' trifft nur die 333er - 200 und 400 bleiben aussen, obwohl sie angezeigt sind",z);
 p(/ausgelassen/.test(z.text)&&/Grösse/.test(z.text),
   "X9 und es steht da, wie viele ausgelassen wurden und warum",z.text);
 // Gegenprobe: eine Position OHNE Groessenangabe setzt weiterhin alle.
 z=await page.evaluate(async (o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  lfZuordnenNurOffene=false;
  $("liefZuordnenRegie").value="203.06";
  await lfZuordnenAlleSetzen();
  return Object.keys(lfZuordnungen).sort().join(",");
 },{k:KATALOG,g:GROESSE});
 p(z==="1,2,3",
   "X10 GEGENPROBE: eine Position ohne Groessenangabe setzt weiterhin alle angezeigten - geblockt wird nur der Widerspruch",z);
 // Die Zeile selbst: der Beinahe-Treffer darf nicht wie ein Treffer
 // aussehen, und der Befund steht dran.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  lfZuordnenZeichnen();
  const html=$("liefZuordnenListe").innerHTML;
  return {html, befund:$("liefZuordnenBefund").innerHTML,
          versteckt:$("liefZuordnenBefund").hidden};
 },{k:KATALOG,g:GROESSE});
 p(/ANDERE GRÖSSE/.test(z.html),
   "X11 in der Auswahl steht beim Beinahe-Treffer 'ANDERE GRÖSSE' - sonst liest er 'Dachrinnen halbrund Titanzink (Grösse 333)' als den richtigen Eintrag",null);
 p(/die Regie-Liste hat die Grösse 400 nicht/.test(z.html)
   &&/die Regie-Liste hat die Grösse 200 nicht/.test(z.html),
   "X12 und an der Zeile steht, dass die Groesse fehlt - nicht das irrefuehrende 'Vorschlag, bitte pruefen'",null);
 p(z.versteckt===false&&/2/.test(z.befund)&&/nicht/.test(z.befund),
   "X13 oben steht die Aufteilung: was zu entscheiden ist und was nicht zuordenbar ist",z.befund);
 // Was der Regie-Liste fehlt, zum Mitnehmen.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  return {liste:lfFehlendeRegie(), text:lfFehlendeRegieText()};
 },{k:KATALOG,g:GROESSE});
 p(z.liste.length===2&&z.liste.every(x=>x.gruppe==="Dachrinnen")
   &&z.liste.map(x=>x.groesse).sort((a,b)=>a-b).join(",")==="200,400",
   "X14 die Fehlliste fasst nach Gruppe UND Groesse zusammen - 115 Einzelzeilen waeren keine Auskunft",z.liste);
 // v3.244 hat den Text zu einer Arbeitsliste gemacht (Abschnitt Y). Die
 // Erwartung hier ist deshalb auf den JETZIGEN Wortlaut umgestellt - die
 // Aussage bleibt dieselbe: was fehlt, was vorhanden ist, wessen
 // Entscheidung es ist.
 p(/Grösse 400/.test(z.text)&&/Grösse 200/.test(z.text)&&/vorhanden in: 333/.test(z.text)
   &&/eure Entscheidung/.test(z.text),
   "X15 der Text sagt, was fehlt, was vorhanden ist - und dass die Regie-Liste zu erweitern SEINE Entscheidung ist",z.text.slice(0,400));
 // GEGENPROBE zum alten Wortlaut: die blosse Aufzaehlung "N Artikel, Grösse
 // X" ohne Name und Einheit darf nicht zurueckkommen - sie war ein Befund,
 // keine Arbeitsliste.
 p(!/^\s+\d+ Artikel\s/m.test(z.text)&&/Einheit m1/.test(z.text),
   "X15a GEGENPROBE: und zwar je POSITION mit Name und Einheit, nicht je Artikel",null);
 // Gegenprobe: ist alles zuordenbar, steht der Kasten nicht da.
 //
 // Der zweite Artikel ist NEU (v3.244) und noetig: er ist zugeordnet und gibt
 // der Gruppe damit ein Muster. Ohne ihn waere in der Gruppe gar nichts
 // zugeordnet - und dann ist "zuordenbar" eben nicht wahr, weil der
 // Vorschlag aus einem anderen Produktbereich stammen koennte. Genau das
 // prueft X16a.
 const EINS=`()=>{
  lfArtikel=[
   {id:1,lieferant:"B-Team",artikelnr:"D333",bezeichnung:"Dachrinnen 333x0.7 mm Titanzink",
    gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:333},
   {id:2,lieferant:"B-Team",artikelnr:"D333b",bezeichnung:"Dachrinnen 333x0.8 mm Titanzink",
    gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:333,material_id:7002}];
  lfBewegungen=[]; lfEinkauf=[]; lfVorschlagCache={}; lfZuordnungen={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=true; lfLieferant="";
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.e+")()");
  lfZuordnenZeichnen();
  return {befund:$("liefZuordnenBefund").innerHTML,
          versteckt:$("liefZuordnenBefund").hidden,
          fehlt:lfFehlendeRegie().length};
 },{k:KATALOG,e:EINS});
 p(z.versteckt===false&&/zur Wahl/.test(z.befund)&&z.fehlt===0
   &&!/noch nichts zugeordnet/.test(z.befund),
   "X16 GEGENPROBE: ist jeder offene Artikel zuordenbar, sagt die App genau das - und die Fehlliste ist leer",z);
 // Und ohne das Muster in der Gruppe sagt sie das Gegenteil - derselbe
 // Artikel, dieselbe Groesse, nur ohne Beleg in der Gruppe.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.e+")()");
  lfArtikel=[lfArtikel[0]];
  lfVorschlagCache={};
  lfZuordnenZeichnen();
  return {befund:$("liefZuordnenBefund").textContent.replace(/\s+/g," "),
          fehlt:lfFehlendeRegie().length,
          ohne:lfOhneMuster(lfArtikelZuId(1))};
 },{k:KATALOG,e:EINS});
 p(z.ohne===true&&z.fehlt===1&&/noch nichts zugeordnet/.test(z.befund),
   "X16a GEGENPROBE DAZU: ohne jede Zuordnung in der Gruppe sagt die App, dass der Vorschlag aus einem anderen Produktbereich kommt",z);
 // DER FALL, DER DIE REGEL FAST FALSCH GEMACHT HAETTE.
 //
 // Gemessen an den echten Daten: bei "Rinnenstutzen 100 mm 20.160.330.100"
 // steht in zuschnitt_mm die 100 - der ABLAUFdurchmesser -, waehrend die
 // Rinnengroesse 330 in der Artikelnummer sitzt. Bei "Rinnenstutzen 50 mm
 // 20.160.200.050" steht in DEMSELBEN Feld 200, also die Rinnengroesse.
 //
 // Eine Regel, die nur zuschnitt_mm vergleicht, haette diese 12 bereits von
 // Hand gemachten, RICHTIGEN Zuordnungen rot markiert und kuenftig
 // blockiert. Verglichen werden deshalb alle Zahlen des Artikels, mit
 // rmatZahlen() aus js/57 - derselben Funktion, die die Bewertung schon
 // immer benutzt.
 const STUTZEN=`()=>{
  lfArtikel=[
   {id:1,lieferant:"B-Team",artikelnr:"20.160.333.100",bezeichnung:"Rinnenstutzen 100 mm 20.160.333.100",
    gruppe:"Rinnenstutzen",zuschnitt_mm:100},
   {id:2,lieferant:"B-Team",artikelnr:"20.160.400.100",bezeichnung:"Rinnenstutzen 100 mm 20.160.400.100",
    gruppe:"Rinnenstutzen",zuschnitt_mm:100}];
  lfBewegungen=[]; lfEinkauf=[]; lfVorschlagCache={}; lfZuordnungen={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=true; lfLieferant="";
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.g+")()");
  const r201=lfRegieZuNummer("201.01");    // dim 333
  return {
   zahlen333:lfArtikelZahlen(lfArtikelZuId(1)),
   passt333:lfGroessePasst(r201,lfArtikelZuId(1)),
   passt400:lfGroessePasst(r201,lfArtikelZuId(2))
  };
 },{k:KATALOG,g:STUTZEN});
 p(z.passt333===true&&z.zahlen333.indexOf(333)>=0,
   "X17 die 333 aus der Artikelnummer zaehlt mit - zuschnitt_mm traegt hier den Ablauf (100), nicht die Rinnengroesse",z);
 p(z.passt400===false,
   "X18 GEGENPROBE: derselbe Stutzen fuer eine 400er Rinne widerspricht der 333er-Position trotzdem - die Regel ist nicht einfach weicher geworden",z);
 // Und sie benutzt die VORHANDENE Funktion, nicht eine eigene Zahlenlogik.
 p(/rmatZahlen/.test(lies("js/82-lieferanten-lager.js")),
   "X19 geprueft wird mit rmatZahlen() aus js/57 - keine zweite Rechnung fuer dieselbe Frage",null);
 // DER ZWEITE FEHLALARM, auch an den echten Daten gefunden:
 // "Rinnenseiher, alle Materialien" traegt dim "bis 120". Das ist eine
 // OBERGRENZE, keine Groesse - 60, 75 und 100 mm passen alle. Eine Regel,
 // die daraus "120 oder Widerspruch" macht, haette 9 richtige Zuordnungen
 // rot markiert. Entschieden wird deshalb nur bei einer EINDEUTIGEN
 // Dimension: blanke Zahl oder Liste blanker Zahlen.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()");
  settings.materials=settings.materials.concat([
   ["203.51","Rinnenseiher, alle Materialien","bis 120","St",12],
   ["241.11","Flachdachrinne rostfrei, B 125, Höhen in mm","40 / 60","m1",30],
   ["241.22","Loch- und Schlitzrost rostfrei","B 122","m1",22],
   ["999.01","Spannweite","250-330","St",5]]);
  materialIds=materialIds.concat([7051,7111,7122,7991]);
  const seiher={bezeichnung:"Rinnenseiher 60 mm Kupfer",artikelnr:"422640",gruppe:"Rinnenseiher"};
  const flach={bezeichnung:"Flachdachrinne 60 mm",artikelnr:"F60",gruppe:"Flachdachrinnen"};
  const flach2={bezeichnung:"Flachdachrinne 80 mm",artikelnr:"F80",gruppe:"Flachdachrinnen"};
  return {
   bis:lfRegieDimZahlen(lfRegieZuNummer("203.51")),
   buchstabe:lfRegieDimZahlen(lfRegieZuNummer("241.22")),
   bereich:lfRegieDimZahlen(lfRegieZuNummer("999.01")),
   liste:lfRegieDimZahlen(lfRegieZuNummer("241.11")),
   seiherOk:lfGroessePasst(lfRegieZuNummer("203.51"),seiher),
   flachOk:lfGroessePasst(lfRegieZuNummer("241.11"),flach),
   flach2:lfGroessePasst(lfRegieZuNummer("241.11"),flach2)
  };
 },{k:KATALOG});
 p(z.bis.length===0&&z.buchstabe.length===0&&z.bereich.length===0,
   "X20 'bis 120', 'B 122' und '250-330' entscheiden NICHTS - eine Obergrenze, eine Breite und ein Bereich sind keine Groessenangabe",z);
 p(z.seiherOk===true,
   "X21 GEGENPROBE: der 60er Rinnenseiher auf 'bis 120' bleibt richtig - 9 bereits gemachte Zuordnungen waeren sonst rot geworden",z);
 p(z.liste.join(",")==="40,60"&&z.flachOk===true&&z.flach2===false,
   "X22 eine AUFZAEHLUNG blanker Zahlen entscheidet weiterhin: 60 passt zu '40 / 60', 80 nicht",z);
 // Eine bereits GESPEICHERTE Zuordnung, die der Groesse widerspricht, wird
 // nicht stillschweigend hingenommen - gemessen: zwei Faelle (330er Rinne
 // auf der 250er Position). Geaendert wird aber nichts von selbst.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()");
  lfArtikel=[{id:1,lieferant:"B-Team",artikelnr:"D400",bezeichnung:"Dachrinnen 400x0.7 mm Titanzink",
   gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:400,material_id:7002}];
  lfBewegungen=[]; lfEinkauf=[]; lfVorschlagCache={}; lfZuordnungen={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=false; lfLieferant="";
  lfZuordnenZeichnen();
  return {html:$("liefZuordnenListe").innerHTML, id:lfArtikelZuId(1).material_id};
 },{k:KATALOG});
 p(/stimmt das\?/.test(z.html)&&/Grösse 333/.test(z.html),
   "X23 eine bestehende Zuordnung mit widersprechender Groesse wird GEFRAGT, nicht hingenommen",null);
 p(z.id===7002,
   "X24 GEGENPROBE: geaendert wird dabei nichts - es ist seine Zuordnung, und nur er weiss, ob sie Absicht war",z.id);

 // Und die Bedienteile stehen im Dokument.
 z=await page.evaluate(()=>["liefZuordnenBefund","liefZuordnenFehlend","liefZuordnenFehlendText"]
   .filter(i=>!document.getElementById(i)));
 p(z.length===0,"X25 alle Bedienteile stehen im Dokument",z);

 // ---- Z  Die Einkaufsliste gehoert zu EINEM Lieferanten (v3.246) --------
 //
 // Eine Unstimmigkeit in meinem eigenen v3.241: der Filter wirkte in
 // Artikelliste, Zuordnen und Inventur - nicht in der Einkaufsliste. Dabei
 // geht eine Bestellung an GENAU EINEN Haendler, und die Summe darunter
 // rechnete quer ueber alle: eine Zahl, die zu keiner Bestellung gehoert.
 console.log("\nZ · Die Einkaufsliste gehoert zu EINEM Lieferanten");
 const ZWEIK=`()=>{
  lfArtikel=[
   {id:1,lieferant:"B-Team",artikelnr:"B1",bezeichnung:"Dachrinne 333",gruppe:"Dachrinnen",
    mindestbestand:5,vpe:1,preis:20},
   {id:2,lieferant:"B-Team",artikelnr:"B2",bezeichnung:"Rinnenwinkel 333",gruppe:"Rinnenwinkel",
    mindestbestand:4,vpe:1,preis:10},
   {id:3,lieferant:"Gyso",artikelnr:"G1",bezeichnung:"Dichtungsmasse 310ml",gruppe:"Dichtstoffe",
    mindestbestand:3,vpe:1,preis:12}];
  lfBewegungen=[]; lfEinkauf=[];
  lfLieferant=""; lfSuche=""; lfVorschlagCache={};
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  const alle=lfEinkaufsliste().map(a=>a.artikelnr);
  lfLieferant="B-Team";
  return {alle, gefiltert:lfEinkaufAnzeige().map(a=>a.artikelnr),
          verdeckt:lfEinkaufVerdeckt(),
          wertAlle:(lfLieferant="",lfEinkaufsWert()),
          wertB:(lfLieferant="B-Team",lfEinkaufsWert())};
 },{k:KATALOG,z:ZWEIK});
 p(z.alle.sort().join(",")==="B1,B2,G1",
   "Z1 lfEinkaufsliste() bleibt die EINE Wahrheit darueber, was ueberhaupt fehlt - alle drei",z.alle);
 p(z.gefiltert.sort().join(",")==="B1,B2"&&z.verdeckt===1,
   "Z2 angezeigt wird nur der gewaehlte Lieferant - und was ausgeblendet ist, wird GEZAEHLT",z);
 p(z.wertAlle.summe===20*5+10*4+12*3&&z.wertB.summe===20*5+10*4,
   "Z3 DIE SUMME gehoert zum gefilterten Teil - quer ueber zwei Haendler waere sie eine Zahl, die zu keiner Bestellung gehoert",
   {alle:z.wertAlle.summe,b:z.wertB.summe});
 // Der verschickte Text ist die Bestellung - er traegt den Haendler im Titel
 // und enthaelt den anderen nicht.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  const ohne=lfEinkaufsText();
  lfLieferant="B-Team";
  return {ohne, mit:lfEinkaufsText()};
 },{k:KATALOG,z:ZWEIK});
 p(/Einkaufsliste B-Team vom/.test(z.mit)&&!/Gyso/.test(z.mit)&&/Dichtungsmasse/.test(z.ohne),
   "Z4 der verschickte Text traegt den Haendler im Titel und enthaelt den anderen NICHT - er ist die Bestellung",z.mit.slice(0,120));
 p(/^Einkaufsliste vom/.test(z.ohne)&&/Gyso/.test(z.ohne)&&/B-Team/.test(z.ohne),
   "Z5 GEGENPROBE: ohne Wahl bleibt es die Uebersicht ueber alle, nach Lieferant gruppiert wie bisher",z.ohne.slice(0,120));
 // Der Kasten sagt, was er nicht zeigt - und bei leerer Auswahl, WELCHER der
 // drei Gruende zutrifft.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfLieferant="B-Team";
  lfEinkaufZeichnen();
  const mit=$("liefEinkaufListe").textContent.replace(/\s+/g," ");
  // Jetzt ein Lieferant, bei dem nichts fehlt: Gyso deckt seinen Bedarf.
  lfBewegungen=[{id:1,artikel_id:3,art:"zugang",menge:10}];
  lfLieferant="Gyso";
  lfEinkaufZeichnen();
  const leer=$("liefEinkaufListe").textContent.replace(/\s+/g," ");
  return {mit, leer};
 },{k:KATALOG,z:ZWEIK});
 p(/anderen Lieferanten/.test(z.mit)&&/1 Position/.test(z.mit),
   "Z6 was der Filter ausblendet, steht da - eine Bestellung, die niemand aufgibt, weil sie hinter einem Filter lag, ist der teure Fall",z.mit.slice(-200));
 p(/Bei Gyso ist nichts zu bestellen/.test(z.leer)&&/anderen Lieferanten/.test(z.leer),
   "Z7 und bei leerer Auswahl steht, dass es an DIESEM Lieferanten liegt - nicht das irrefuehrende 'nichts zu bestellen'",z.leer.slice(0,200));
 // DIE WICHTIGSTE GEGENPROBE: der Knopf-Zaehler filtert NICHT mit. Er ist
 // das Signal "es liegt Arbeit" und steht ausserhalb der gefilterten
 // Ansicht; ein Zaehler, der still einen Haendler unterschlaegt, waere die
 // gefaehrliche Richtung.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfLieferant="B-Team";
  lfZeichnen();
  return $("liefEinkaufKnopf").textContent;
 },{k:KATALOG,z:ZWEIK});
 p(/\(3\)/.test(z),
   "Z8 GEGENPROBE: der Knopf zaehlt WEITERHIN alle drei - er ist das Signal 'es liegt Arbeit', nicht die Bestellung",z);
 p(await page.evaluate(()=>["liefEinkaufLieferant","liefEinkaufLieferantBox"]
   .filter(i=>!document.getElementById(i))).then(x=>x.length===0),
   "Z9 die Bedienteile stehen im Dokument",null);
 // Und bei nur EINEM Lieferanten bleibt die Wahl weg - wie in den anderen
 // drei Ansichten.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfArtikel=lfArtikel.filter(a=>a.lieferant==="B-Team");
  lfLieferant="Gyso";                 // Rest aus einer frueheren Wahl
  lfEinkaufZeichnen();
  return {versteckt:$("liefEinkaufLieferantBox").hidden, filter:lfLieferant,
          liste:lfEinkaufAnzeige().length};
 },{k:KATALOG,z:ZWEIK});
 p(z.versteckt===true&&z.filter===""&&z.liste===2,
   "Z10 bei nur einem Lieferanten bleibt die Wahl weg - und ein Rest aus einer frueheren Wahl wird zurueckgesetzt, sonst waere die Liste leer",z);

 // ---- Y  Welche Position fehlt? (v3.244) --------------------------------
 //
 // v3.243 sagt, WAS nicht geht. Y prueft die Antwort auf "und was muss ich
 // tun?" - und die steht in seiner eigenen Liste. Gemessen am 01.10.2026:
 // sie benutzt ZWEI Stile, je Warenart verschieden.
 //   je Werkstoff:     201.01/02 Dachrinnen halbrund Kupfer, 201.11/12
 //                     Titanzink, 201.13/14 Chromnickelstahl
 //   alle Materialien: 203.41/42 Einhaengestutzen, 203.21/22 Rinnenboden
 // Beim Blech ist der Werkstoff der Preis, beim Formteil nicht. Welcher
 // Stil gilt, darf deshalb nicht geraten werden.
 console.log("\nY · Welche Position fehlt - nach dem Muster seiner eigenen Liste");
 const MUSTER=`()=>{
  settings.materials=[
   ["201.01","Dachrinnen halbrund Kupfer","250","m1",18],
   ["201.02","Dachrinnen halbrund Kupfer","330","m1",22],
   ["201.11","Dachrinnen halbrund Titanzink","250","m1",16],
   ["201.12","Dachrinnen halbrund Titanzink","330","m1",20],
   ["203.41","Einhängestutzen gerade, alle Materialien","250","St",12],
   ["203.42","Einhängestutzen gerade, alle Materialien","330","St",14],
   ["203.21","Rinnenboden gerade, alle Materialien","250","St",9]];
  materialIds=[7001,7002,7011,7012,7041,7042,7021];
  lfArtikel=[
   // Dachrinnen: je Werkstoff. Kupfer 250 ist zugeordnet, Kupfer 400 offen.
   {id:1,artikelnr:"K250",bezeichnung:"Dachrinnen 250x0.6 mm Kupfer",gruppe:"Dachrinnen",
    material:"Kupfer",zuschnitt_mm:250,material_id:7001,lieferant:"B-Team"},
   {id:2,artikelnr:"K400",bezeichnung:"Dachrinnen 400x0.6 mm Kupfer",gruppe:"Dachrinnen",
    material:"Kupfer",zuschnitt_mm:400,lieferant:"B-Team"},
   // Titanzink 250 zugeordnet, Titanzink 400 offen - MUSS das Titanzink-
   // Muster treffen, nicht das Kupfer-Muster.
   {id:3,artikelnr:"T250",bezeichnung:"Dachrinnen 250x0.7 mm Titanzink",gruppe:"Dachrinnen",
    material:"Titanzink",zuschnitt_mm:250,material_id:7011,lieferant:"B-Team"},
   {id:4,artikelnr:"T400",bezeichnung:"Dachrinnen 400x0.7 mm Titanzink",gruppe:"Dachrinnen",
    material:"Titanzink",zuschnitt_mm:400,lieferant:"B-Team"},
   // Rinnenstutzen: alle Materialien. Zwei Werkstoffe, EIN Muster.
   {id:5,artikelnr:"S250",bezeichnung:"Rinnenstutzen 250 Kupfer",gruppe:"Rinnenstutzen",
    material:"Kupfer",zuschnitt_mm:250,material_id:7041,lieferant:"B-Team"},
   {id:6,artikelnr:"S400a",bezeichnung:"Rinnenstutzen 400 Kupfer",gruppe:"Rinnenstutzen",
    material:"Kupfer",zuschnitt_mm:400,lieferant:"B-Team"},
   {id:7,artikelnr:"S400b",bezeichnung:"Rinnenstutzen 400 CrNi-Stahl",gruppe:"Rinnenstutzen",
    material:"CrNi-Stahl",zuschnitt_mm:400,lieferant:"B-Team"},
   // Kugelboeden: in seiner Liste gar nicht vorhanden - "Rinnenboden
   // gerade" ist eine andere Form.
   {id:8,artikelnr:"KB250",bezeichnung:"Rinnenkugelboden 250 Kupfer",gruppe:"Rinnenkugelböden",
    material:"Kupfer",zuschnitt_mm:250,lieferant:"B-Team"}];
  lfBewegungen=[]; lfEinkauf=[]; lfVorschlagCache={}; lfZuordnungen={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=true; lfLieferant="";
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.m+")()");
  return {
   kupfer:lfMusterFuer(lfArtikelZuId(2)),
   titan:lfMusterFuer(lfArtikelZuId(4)),
   stutzenKupfer:lfMusterFuer(lfArtikelZuId(6)),
   stutzenCrNi:lfMusterFuer(lfArtikelZuId(7)),
   kugel:lfMusterFuer(lfArtikelZuId(8))
  };
 },{m:MUSTER});
 p(z.kupfer&&z.kupfer.stil==="werkstoff"&&z.kupfer.name==="Dachrinnen halbrund Kupfer"
   &&z.kupfer.dims.join(",")==="250,330",
   "Y1 beim Blech trifft das Muster den WERKSTOFF des Artikels - 'Dachrinnen halbrund Kupfer', vorhanden in 250 und 330",z.kupfer);
 p(z.titan&&z.titan.name==="Dachrinnen halbrund Titanzink",
   "Y2 GEGENPROBE: die 400er Titanzink-Rinne trifft das Titanzink-Muster, nicht das haeufigere Kupfer-Muster",z.titan);
 p(z.stutzenKupfer&&z.stutzenKupfer.stil==="alle"
   &&z.stutzenCrNi&&z.stutzenCrNi.name==="Einhängestutzen gerade, alle Materialien",
   "Y3 beim Formteil gilt EIN Muster fuer alle Werkstoffe - auch fuer einen Werkstoff, der dort noch nie zugeordnet war",z);
 p(z.kugel===null,
   "Y4 fuer eine Warenart, die seine Liste gar nicht fuehrt, gibt es KEIN Muster - 'Rinnenboden gerade' ist eine andere Form",z.kugel);
 // Zusammengefasst wird nach der POSITION, nicht nach dem Artikel.
 z=await page.evaluate((o)=>{
  eval("("+o.m+")()");
  return lfFehlendeRegie();
 },{m:MUSTER});
 p(z.length===4,
   "Y5 vier offene Artikel in drei Gruppen ergeben VIER Positionen - eine Zeile ist eine Position, nicht ein Artikel",z.map(x=>x.name||x.gruppe));
 p(z.filter(x=>x.art==="muster").length===3&&z.filter(x=>x.art==="neu").length===1,
   "Y6 getrennt nach 'gleiche Position in anderer Groesse' und 'Warenart fehlt ganz' - das bedeutet Verschiedenes",z.map(x=>x.art));
 const stutzen=z.filter(x=>x.name==="Einhängestutzen gerade, alle Materialien")[0];
 p(stutzen&&stutzen.anzahl===2&&stutzen.einheit==="St"&&stutzen.vorhanden.join(",")==="250,330",
   "Y7 die 'alle Materialien'-Position deckt beide Werkstoffe in EINER Zeile - und Einheit und vorhandene Groessen stehen dran",stutzen);
 p(z.filter(x=>x.art==="muster").every(x=>x.beispiele.length>=1&&x.beispiele.length<=2),
   "Y8 je Zeile ein bis zwei Beispielartikel - sie sagen, was gemeint ist, wo die erkannte Groesse danebenliegt",z.map(x=>x.beispiele));
 const neu=z.filter(x=>x.art==="neu")[0];
 p(neu&&neu.gruppe==="Rinnenkugelböden"&&neu.nahe.length>=1,
   "Y9 bei der fehlenden Warenart nennt die App die aehnlichste vorhandene Position zur Orientierung",neu);
 // Der Text ist eine Arbeitsliste - und schlaegt WEDER EDV-Nr. NOCH Preis vor.
 z=await page.evaluate((o)=>{
  eval("("+o.m+")()");
  return lfFehlendeRegieText();
 },{m:MUSTER});
 p(/A\) VORHANDENE POSITION IN ANDERER GRÖSSE  \(3 Positionen\)/.test(z)
   &&/B\) IN DIESER GRUPPE IST NOCH NICHTS ZUGEORDNET  \(1 Gruppen\/Grössen\)/.test(z),
   "Y10 der Text ist in die beiden Teile geteilt, mit Anzahl",z.slice(0,200));
 p(/Einheit St/.test(z)&&/Einheit m1/.test(z),
   "Y11 die Einheit kommt aus dem Muster mit - sie ist keine Entscheidung mehr",null);
 p(!/EDV-Nr\.\s*2\d\d\.\d\d/.test(z)&&!/Preis\s+CHF/.test(z)&&/eure Entscheidung/.test(z),
   "Y12 EDV-Nr. und Preis schlaegt die App NICHT vor - eine geratene Nummer landet in seinem Nummernsystem, ein geratener Preis auf einer Rechnung",null);
 p(/Lagerverwaltung/.test(z)&&/legt dort NICHTS/.test(z),
   "Y13 und es steht da, wo angelegt wird - und dass die App es nicht selbst tut",null);
 // Der Knopf ZEIGT die Liste, nicht nur kopieren.
 z=await page.evaluate(async(o)=>{
  eval("("+o.m+")()");
  await lfFehlendeRegieKopieren();
  const f=$("liefZuordnenFehlendText");
  return {versteckt:f.hidden, laenge:f.value.length, meldung:$("liefZuordnenMeldung").textContent};
 },{m:MUSTER});
 p(z.versteckt===false&&z.laenge>200,
   "Y14 der Knopf ZEIGT die Arbeitsliste im Dialog - auf dem Handy ist Lesen wichtiger als Einfuegen",z);
 p(/4 Position/.test(z.meldung),
   "Y15 und die Meldung nennt die Anzahl",z.meldung);
 // Und der Kopf nennt sie auch.
 z=await page.evaluate((o)=>{
  eval("("+o.m+")()");
  lfZuordnenZeichnen();
  return $("liefZuordnenBefund").textContent.replace(/\s+/g," ");
 },{m:MUSTER});
 p(/4 Regie-Position/.test(z)&&/Lagerverwaltung/.test(z),
   "Y16 der Kopf sagt, wie viele Positionen es waeren - das ist die Zahl, die er braucht",z);
 // UND DIE ZUSAGE BLEIBT: js/82 schreibt NICHTS in die Regie-Liste.
 z=lies("js/82-lieferanten-lager.js");
 p(!/from\("materials"\)/.test(z)&&!/katalogPositionAnlegen/.test(z),
   "Y17 DIE ZUSAGE: js/82 liest die Regie-Liste, legt dort aber nichts an - weder direkt noch ueber js/59",null);

 // ---- AA  "Dafuer gibt es bei uns keine Position" (v3.249) ---------------
 //
 // Ansage des Anwenders (02.10.2026): "Punkt 1 wird so bleiben, wir haben
 // keine Positionen fuer die fehlenden Artikel."
 //
 // Das kann die App nicht selbst erkennen. Ohne einen Platz dafuer meldete
 // der Zuordnen-Knopf dauerhaft "158 offen" - ein Zaehler, der Arbeit
 // anzeigt, die keine ist, verdeckt die echte, sobald eine neue
 // Lieferantenliste kommt.
 console.log("\nAA · Bewusst ohne Regie-Position");
 const KEINE=`()=>{
  lfArtikel=[
   {id:1,lieferant:"B-Team",artikelnr:"D400",bezeichnung:"Dachrinnen 400x0.7 mm Titanzink",
    gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:400,ean:"400400",
    mindestbestand:2,keine_regie_position:false},
   {id:2,lieferant:"B-Team",artikelnr:"D333",bezeichnung:"Dachrinnen 333x0.7 mm Titanzink",
    gruppe:"Dachrinnen",material:"Titanzink",zuschnitt_mm:333,material_id:7002},
   {id:3,lieferant:"B-Team",artikelnr:"K250",bezeichnung:"Rinnenkugelboden 250 Kupfer",
    gruppe:"Rinnenkugelböden",material:"Kupfer",zuschnitt_mm:250,keine_regie_position:false}];
  lfBewegungen=[]; lfEinkauf=[]; lfVorschlagCache={}; lfZuordnungen={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=true; lfLieferant="";
 }`;
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  const vorher={offen:lfZuordnenKandidaten().length,
                fehlt:lfFehlendeRegie().length,
                stand:lfZuordnenBefundStand()};
  lfArtikelZuId(1).keine_regie_position=true;
  lfArtikelZuId(3).keine_regie_position=true;
  const nachher={offen:lfZuordnenKandidaten().length,
                 fehlt:lfFehlendeRegie().length,
                 stand:lfZuordnenBefundStand(),
                 entschieden:lfEntschiedenOhne()};
  return {vorher,nachher};
 },{k:KATALOG,z:KEINE});
 p(z.vorher.offen===2&&z.vorher.fehlt>0&&z.vorher.stand.offen===2,
   "AA1 vorher: zwei offene Artikel, und die Arbeitsliste verlangt Positionen",z.vorher);
 p(z.nachher.offen===0&&z.nachher.stand.offen===0,
   "AA2 nach der Entscheidung sind sie NICHT mehr offen - der Zaehler zeigt keine Arbeit mehr an, die keine ist",z.nachher);
 p(z.nachher.fehlt===0,
   "AA3 und die Arbeitsliste verlangt nichts mehr - eine Liste, die Entschiedenes weiter verlangt, ist keine Arbeitsliste",z.nachher);
 p(z.nachher.entschieden===2,
   "AA4 gezaehlt werden sie trotzdem - verschwiegen waere schlimmer als gezeigt",z.nachher);
 // Im LAGER bleibt der Artikel voll brauchbar - das ist der Unterschied zu
 // "archiviert".
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfArtikelZuId(1).keine_regie_position=true;
  lfBewegungen=[];
  return {imLager:lfArtikel.filter(a=>!a.archiviert&&lfPasstZumFilter(a)).length,
          einkauf:lfEinkaufsliste().map(a=>a.artikelnr),
          inventur:lfInvKandidaten().map(a=>a.artikelnr),
          mindest:lfMindest(lfArtikelZuId(1))};
 },{k:KATALOG,z:KEINE});
 p(z.imLager===3&&z.einkauf.indexOf("D400")>=0&&z.inventur.indexOf("D400")>=0&&z.mindest===2,
   "AA5 im Lager bleibt er voll nutzbar: Artikelliste, Einkaufsliste, Inventur und Mindestbestand brauchen keine Regie-Position - DESHALB ist es kein 'archiviert'",z);
 // Der Scanner sagt etwas ANDERES als bei "noch nicht zugeordnet".
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  const offen=lfBarcodeZuRegie("400400");
  lfArtikelZuId(1).keine_regie_position=true;
  const entschieden=lfBarcodeZuRegie("400400");
  return {offen:{grund:offen.grund,text:offen.text},
          entschieden:{grund:entschieden.grund,text:entschieden.text}};
 },{k:KATALOG,z:KEINE});
 p(z.offen.grund==="ohne-zuordnung"&&/nachtragen/.test(z.offen.text),
   "AA6 solange offen, raet der Scanner zum Nachtragen - wie bisher",z.offen);
 p(z.entschieden.grund==="keine-position"&&!/nachtragen/.test(z.entschieden.text)
   &&/so entschieden/.test(z.entschieden.text),
   "AA7 ist es entschieden, raet er NICHT mehr zum Nachtragen - ein Rat ins Leere ist schlimmer als keiner",z.entschieden);
 p(/von Hand/.test(z.entschieden.text),
   "AA8 sondern sagt, was stattdessen geht",z.entschieden);
 // Kein automatischer Weg setzt eine Zuordnung auf einen Entschiedenen.
 z=await page.evaluate(async (o)=>{
  eval("("+o.k+")()"); eval("("+o.z+")()");
  lfArtikelZuId(1).keine_regie_position=true;
  lfArtikelZuId(3).keine_regie_position=true;
  lfZuordnenNurOffene=false;
  lfZuordnenSichereUebernehmen();
  const nachSicher=Object.keys(lfZuordnungen).sort().join(",");
  lfZuordnungen={};
  $("liefZuordnenRegie").value="203.06";
  await lfZuordnenAlleSetzen();
  return {nachSicher, nachAlle:Object.keys(lfZuordnungen).sort().join(",")};
 },{k:KATALOG,z:KEINE});
 p(z.nachSicher==="",
   "AA9 GEGENPROBE: 'Sichere Vorschlaege' fasst einen Entschiedenen nicht an - das waere das Gegenteil der Entscheidung",z);
 p(z.nachAlle.indexOf("1")<0&&z.nachAlle.indexOf("3")<0,
   "AA10 GEGENPROBE: und 'Alle angezeigten setzen' ebenso nicht",z);
 // Zuruecknehmen geht, und ein zugeordneter Artikel kann die Marke nicht
 // tragen (die Regel steht in der Datenbank, die Auskunft hier).
 z=await page.evaluate(async(o)=>{
  eval("("+o.f+")()"); eval("("+o.k+")()"); eval("("+o.z+")()");
  // WICHTIG: lfKeinePositionSetzen() laedt am Ende neu (wie die App nach
  // jedem Schreiben). Die ATTRAPPE muss deshalb dieselben Artikel tragen -
  // sonst ueberschreibt das Nachladen den Aufbau, und der Pruefstand misst
  // an anderen Daten als er gesetzt hat. Beim ersten Anlauf genau so
  // passiert: AA11 und AA12 waren dadurch gruen bzw. rot ohne Aussage.
  window.__db.lieferanten_artikel=lfArtikel.map(a=>Object.assign({},a));
  await lfLaden();
  const r1=await lfKeinePositionSetzen("2",true);      // hat eine Zuordnung
  const r2=await lfKeinePositionSetzen("1",true);      // offen
  const rufe=window.__db.ruf.filter(x=>x.was==="update")
    .map(x=>({wert:x.wert,marke:x.werte&&x.werte.keine_regie_position}));
  return {r1,r2,rufe};
 },{f:SB,k:KATALOG,z:KEINE});
 p(z.r1.ok===false&&/Regie-Position/.test(z.r1.text),
   "AA11 ein ZUGEORDNETER Artikel kann die Marke nicht tragen - die Regel steht in der Datenbank, die Auskunft hier",z.r1);
 p(z.r2.ok===true&&z.rufe.length===1&&z.rufe[0].marke===true&&String(z.rufe[0].wert)==="1",
   "AA12 und beim offenen wird genau EIN update geschrieben, auf genau diese id",z);
 // Die Bedienteile stehen im Dokument.
 z=await page.evaluate(()=>["liefKeinePositionAlle","liefKeinePositionAlleZurueck"]
   .filter(i=>!document.getElementById(i)));
 p(z.length===0,"AA13 die Bedienteile stehen im Dokument",z);

 // ---- AB  Auf dem Handy bedienbar (v3.250) ------------------------------
 //
 // WARUM ES DIESEN ABSCHNITT GIBT (echter Fehler, am 02.10.2026 gemessen)
 // Die uebrigen Abschnitte pruefen, ob Bedienteile DA sind - nicht, ob sie
 // passen. Bei 390 px Fensterbreite stand im Lager-Dialog eine Tabelle von
 // 1000 px in einem 342 px Behaelter: die Aufbau-Tabelle der Excel-Importe
 // ("Wie muss die Datei aufgebaut sein?"). Ursache war die globale
 // Grundregel table{min-width:1000px} aus css/01 - richtig fuer die breiten
 // Stuecklisten, falsch fuer eine schmale Nachschlagetabelle. Weil weder
 // Tabelle noch Behaelter scrollen, war die dritte Spalte unerreichbar -
 // genau die mit den erlaubten Spaltenueberschriften, also das Einzige,
 // weswegen man diesen Abschnitt oeffnet.
 //
 // Ein Spengler bedient das auf dem Dach mit einem Handy. Gemessen werden
 // deshalb BEIDE Breiten, die in diesem Projekt als Vorgabe gelten (siehe
 // Abschnitt F im Rapport-Pruefstand): 320 und 390 px.
 console.log("\nAB · Auf dem Handy bedienbar");
 const AB_DATEN=`()=>{
  lfArtikel=[];
  for(let i=1;i<=8;i++)lfArtikel.push({id:i,lieferant:"B-Team",
   artikelnr:"4093"+(70+i),
   bezeichnung:"Dachrinnen "+(i%2?400:333)+"x0.7 mm CuTi-Zink vorbew. Quartz",
   gruppe:"Dachrinnen",material:"CuTi-Zink vorbew.",zuschnitt_mm:(i%2?400:333),
   vpe:5,mindestbestand:i<3?2:0,ean:"400"+i,
   material_id:(i%3===0)?7002:null,keine_regie_position:(i===4)});
  lfBewegungen=[{id:1,artikel_id:1,art:"zugang",menge:3}];
  lfEinkauf=[]; lfGeladen=true; lfLieferant=""; lfVorschlagCache={};
  lfZuordnenGruppe=""; lfZuordnenSuche=""; lfZuordnenNurOffene=false; lfZuordnungen={};
  lfInvGruppe=""; lfInvSuche=""; lfInvGezaehlt={}; lfInvMindest={};
 }`;
 for(const breite of [320,390]){
  await page.setViewportSize({width:breite,height:900});
  z=await page.evaluate((o)=>{
   eval("("+o.k+")()"); eval("("+o.d+")()");
   const raus=[];
   const pruef=(name,id,zeichnen)=>{
    const m=document.getElementById(id);
    if(!m){ raus.push({name,fehlt:true}); return }
    m.hidden=false;
    try{ zeichnen() }catch(e){ raus.push({name,zeichenfehler:String(e).slice(0,60)}) }
    const ueber=[];
    m.querySelectorAll("*").forEach(el=>{
     const r=el.getBoundingClientRect();
     if(r.width>0&&r.right>window.innerWidth+1)
      ueber.push((el.id||el.tagName.toLowerCase())+" bis "+Math.round(r.right));
    });
    raus.push({name,ueberlauf:ueber.length,beispiele:ueber.slice(0,3)});
    m.hidden=true;
   };
   pruef("Lager","liefModal",()=>lfZeichnen());
   pruef("Zuordnen","liefZuordnenModal",()=>lfZuordnenZeichnen());
   pruef("Einkaufsliste","liefEinkaufModal",()=>lfEinkaufZeichnen());
   pruef("Inventur","liefInvModal",()=>lfInvZeichnen());
   pruef("Bewegungen","liefBewModal",()=>lfBewegungenZeichnen());
   return raus;
  },{k:KATALOG,d:AB_DATEN});
  const schlimm=z.filter(x=>x.fehlt||x.zeichenfehler||x.ueberlauf>0);
  p(schlimm.length===0,
    "AB"+(breite===320?1:2)+" bei "+breite+" px laeuft in keinem der fuenf Lager-Dialoge etwas aus dem Bild",schlimm);
 }
 // Die Aufbau-Tabelle im Besonderen: sie war der Fall, und die Ursache darf
 // nicht zurueckkommen.
 z=await page.evaluate(()=>{
  $("liefModal").hidden=false;
  const t=document.querySelector("#liefExcelAufbau table");
  const cs=t?getComputedStyle(t):null;
  const r=t?t.getBoundingClientRect():null;
  const b=t?t.parentElement.getBoundingClientRect():null;
  $("liefModal").hidden=true;
  return t?{minWidth:cs.minWidth,layout:cs.tableLayout,
            breite:Math.round(r.width),behaelter:Math.round(b.width)}:{keine:true};
 });
 p(z.minWidth==="0px"&&z.layout==="auto",
   "AB3 die Aufbau-Tabelle setzt die globale Regel table{min-width:1000px} zurueck - sie ist eine Nachschlagetabelle, keine Stueckliste",z);
 p(z.breite<=z.behaelter+1,
   "AB4 und sie passt damit in ihren Behaelter - vorher 1000 px in 342 px, und die Spalte mit den erlaubten Ueberschriften war unerreichbar",z);
 // Die Trefferflaeche der Schalter: das Kaestchen ist klein, das LABEL ist
 // der Treffer - und das muss hoch genug sein.
 z=await page.evaluate((o)=>{
  eval("("+o.k+")()"); eval("("+o.d+")()");
  $("liefZuordnenModal").hidden=false;
  lfZuordnenZeichnen();
  const box=document.querySelector("[data-lf-keine]");
  const lab=box&&box.closest("label");
  // ERST ins Bild scrollen. Bei acht Artikeln liegt die erste Zeile
  // unterhalb des Fensters, und elementFromPoint gibt dann null - das war
  // beim ersten Anlauf der Fehlschlag, und er lag an der Messung, nicht an
  // der App.
  if(lab&&lab.scrollIntoView)lab.scrollIntoView({block:"center"});
  const rl=lab?lab.getBoundingClientRect():null;
  const treffer=rl?document.elementFromPoint(rl.left+rl.width-20,rl.top+rl.height/2):null;
  $("liefZuordnenModal").hidden=true;
  // Geprueft wird, ob der Tipp INNERHALB des Labels landet - nicht, ob er
  // genau das Label-Element trifft. Bei einem schon entschiedenen Artikel
  // steht im Text ein <b>, und elementFromPoint gibt dann dieses zurueck;
  // ein Klick darauf schaltet trotzdem, weil er zum Label hochlaeuft. Die
  // strengere Erwartung war meine, nicht die der App.
  return {imLabel:!!lab,hoehe:rl?Math.round(rl.height):0,breite:rl?Math.round(rl.width):0,
          trefferIstLabel:!!(lab&&treffer&&(treffer===lab||lab.contains(treffer))),
          trefferTag:treffer?treffer.tagName.toLowerCase():null};
 },{k:KATALOG,d:AB_DATEN});
 p(z.imLabel&&z.trefferIstLabel,
   "AB5 der Schalter steckt im Label - ein Tipp irgendwo in der Zeile schaltet, nicht nur das 13-px-Kaestchen",z);
 p(z.hoehe>=28&&z.breite>200,
   "AB6 und die Zeile ist hoch genug: auf dem Dach, mit kalten Haenden, war sie mit 19 px fummelig",z);
 await page.setViewportSize({width:900,height:900});

 p(fehler.length===0,"G1 keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();
