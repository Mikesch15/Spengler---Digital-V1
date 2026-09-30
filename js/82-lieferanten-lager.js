"use strict";
// ---------------------------------------------------------------------------
// Lieferanten-Lager (v3.229 als "Lager B-Team", ab v3.231 mehrlieferantenfaehig)
//
// Ansage des Anwenders: "erstelle mal eine separate lagerverwaltung mit diesen
// bteam produkten... die alte lagerverwaltung und die regiematerialliste nicht
// anfassen."
//
// WARUM ES WIRKLICH SEPARAT IST, und nicht nur separat aussieht:
//
// Die bestehende Lagerverwaltung (js/68) sitzt auf materials - dem Katalog der
// FIRMA, mit ihren eigenen EDV-Nummern. Derselbe Katalog fuellt die
// Regiematerial-Liste, das Ausmass und den Zuschnitt. Ein Lieferantensortiment
// mit 439 FREMDEN Artikelnummern dort hineinzukippen wuerde zwei Nummernkreise
// vermischen und genau die beiden Listen veraendern, die unberuehrt bleiben
// sollen.
//
// Deshalb: eigene Tabellen (lieferanten_artikel, lieferanten_bewegungen),
// eigene Datei, eigener Dialog. An js/68, js/59, am Regierapport und an
// materials aendert diese Datei NICHTS - sie liest von dort auch nichts.
//
// Was sie sich TEILT, weil zwei Fassungen davon zwei Wahrheiten waeren:
//  - den Barcode-Scanner aus js/01 (barcodeScannen)
//  - den Excel-Import aus js/08 (initExcelImport)
//  - das Recht "Lager" (feature_access), also dieselbe Sichtbarkeit
//
// v3.231 - WARUM DAS LAGER NICHT MEHR "B-TEAM" HEISST:
// Der Lieferant stand bisher nur im Tabellennamen. Der zweite Lieferant haette
// dort keinen Platz gehabt, und Artikelnummern sind nur JE LIEFERANT
// eindeutig - eine "1001" gibt es bei jedem Haendler. Ohne den Lieferanten im
// Schluessel wuerde der naechste Import stillschweigend fremde Artikel
// ueberschreiben. Umbenannt wurde, solange das Lager 439 Artikel und NULL
// Buchungen trug: danach waere es eine Migration statt eines Umbenennens.
//
// Der Bestand ist wie drueben NIE ein Feld, sondern immer die Summe ueber die
// Bewegungen. Eine Buchung ist unveraenderlich - die Datenbank kennt fuer
// lieferanten_bewegungen kein Update und kein Delete. Ein Fehler wird durch
// eine Korrektur ausgeglichen, nicht durch Aendern der Vergangenheit.
// ---------------------------------------------------------------------------

const LF_SORTIMENT="daten/sortiment-bteam.json";
const LF_ART_TEXT={zugang:"Zugang",abgang:"Abgang",korrektur:"Korrektur"};

let lfArtikel=[];
let lfBewegungen=[];
let lfEinkauf=[];          // offene Einkaufswuensche (v3.232)
let lfSuche="";
let lfOffeneGruppen=new Set();
let lfGeladen=false;

function lfZahl(v){ const n=Number(v); return Number.isFinite(n)?n:0 }
function lfZahlText(v){
 const n=lfZahl(v);
 return Number.isInteger(n)?String(n):n.toFixed(2).replace(/\.?0+$/,"");
}
function lfMeldung(text,fehler){
 const m=(typeof $==="function")?$("liefMeldung"):null;
 if(!m)return;
 m.textContent=text||"";
 m.style.color=fehler?"var(--red)":"var(--muted)";
}

// Die Lieferanten, die im Lager wirklich vorkommen - abgeleitet aus den
// Artikeln, nicht als eigene Liste gefuehrt. Eine zweite Liste waere eine
// zweite Wahrheit darueber, welche Lieferanten es gibt.
function lfLieferanten(){
 return [...new Set(lfArtikel.map(a=>String(a.lieferant||"").trim()).filter(Boolean))].sort();
}

// ---- Laden ----------------------------------------------------------------
async function lfLaden(){
 if(typeof sb==="undefined")return false;
 try{
  const a=await sb.from("lieferanten_artikel").select("*").order("gruppe").order("bezeichnung");
  if(a.error)throw a.error;
  lfArtikel=a.data||[];
  const b=await sb.from("lieferanten_bewegungen").select("*").order("created_at",{ascending:false});
  if(b.error)throw b.error;
  lfBewegungen=b.data||[];
  // v3.232: Nur die OFFENEN Wuensche. Abgehakte bleiben in der Datenbank
  // stehen, gehoeren aber nicht mehr auf die Liste - sonst waere "erledigt"
  // wirkungslos.
  const w=await sb.from("lieferanten_einkauf").select("*").is("erledigt_am",null)
   .order("created_at",{ascending:false});
  if(w.error)throw w.error;
  lfEinkauf=w.data||[];
  lfGeladen=true;
  return true;
 }catch(e){
  lfArtikel=[]; lfBewegungen=[]; lfEinkauf=[]; lfGeladen=false;
  lfMeldung("Das Lieferanten-Lager liess sich nicht laden: "+((e&&e.message)||e),true);
  return false;
 }
}

// Bestand = Summe der Bewegungen. Zugang positiv, Abgang negativ, Korrektur
// so, wie sie gebucht wurde (sie darf auch negativ sein).
function lfBestand(artikelId){
 return lfBewegungen.filter(b=>String(b.artikel_id)===String(artikelId))
  .reduce((s,b)=>s+(b.art==="abgang"?-lfZahl(b.menge):lfZahl(b.menge)),0);
}
function lfArtikelZuId(id){ return lfArtikel.find(a=>String(a.id)===String(id))||null }
function lfArtikelZuBarcode(code){
 const c=String(code||"").trim();
 if(!c)return null;
 return lfArtikel.find(a=>String(a.ean||"").trim()===c)||null;
}

// ---- Mindestbestand und Einkaufsliste (v3.231) ----------------------------
//
// Ansage des Anwenders, sinngemaess: das Lager soll sagen, was bestellt
// werden muss. Das ist der Punkt, an dem eine Artikelliste zum Werkzeug wird.
//
// 0 heisst "nicht ueberwacht", nicht "Mindestbestand null". Ein Sortiment von
// 439 Artikeln, das jeden davon ueberwacht, meldet 439-mal Mangel und wird
// nie gelesen. Ueberwacht wird nur, was der Betrieb ausdruecklich vorratet.
// ---- Die Bruecke zur Regie-Position (v3.234) ------------------------------
//
// Ansage des Anwenders: "die artikel aus unserer regieliste decken sich viele
// mit der bteam liste... aber nicht alle."
//
// Nachgemessen: die beiden Listen sind nicht zwei Fassungen derselben Sache,
// sondern ZWEI EBENEN.
//   Regie   "Rinnenseiher, alle Materialien"      - ABRECHNUNGSposition
//   B-Team  "Rinnenseiher 60 mm Stahl verzinkt"   - konkreter ARTIKEL
// Das Verhaeltnis ist n:1 und nie 1:1. Deshalb wird nicht zusammengefuehrt,
// sondern verbunden.
//
// materials wird hier NUR GELESEN, und zwar ueber lagArtikelListe() aus
// js/59 - dieselbe Funktion, die auch der Materialbestand und die
// Lagerverwaltung benutzen. Eine eigene Katalogliste waere eine zweite
// Wahrheit darueber, welche Positionen es gibt.
function lfRegieListe(){ return (typeof lagArtikelListe==="function")?lagArtikelListe():[] }
function lfRegieZuId(id){
 if(id===null||id===undefined||id==="")return null;
 return lfRegieListe().find(r=>String(r.id)===String(id))||null;
}
function lfRegieZuNummer(no){
 const n=String(no||"").trim();
 if(!n)return null;
 return lfRegieListe().find(r=>String(r.edv_nr)===n)||null;
}
function lfRegieText(r){
 if(!r)return "";
 return r.edv_nr+" · "+r.name+(r.dim?" · "+r.dim:"")+(r.unit?" · "+r.unit:"");
}
function lfRegieVon(a){ return lfRegieZuId(a&&a.material_id) }
function lfZugeordnet(){ return lfArtikel.filter(a=>lfRegieVon(a)).length }

// Vorschlaege fuer einen Artikel.
//
// Gerechnet wird mit rmatVorschlaege() aus js/57 - derselben Bewertung, die
// seit v3.16 aus einer gerechneten Massaufnahme-Position eine Katalogzeile
// vorschlaegt. Eine zweite Bewertung waere eine zweite Wahrheit darueber,
// was ein Treffer ist.
//
// EINE Anpassung ist noetig: dort ist die EINHEIT ein harter Filter, und ein
// Lieferantenartikel hat keine. Abgefragt werden deshalb die beiden Klassen,
// die fuer Handelsware ueberhaupt in Frage kommen - Stueck (182 Positionen)
// und Laenge (81). Flaeche und Gewicht sind Blech und Lot, keine Artikel.
const LF_REGIE_EINHEITEN=["St","m1"];
let lfVorschlagCache={};
function lfRegieVorschlaege(a){
 if(!a||typeof rmatVorschlaege!=="function")return [];
 const schl=String(a.id);
 if(lfVorschlagCache[schl])return lfVorschlagCache[schl];
 // Die Produktgruppe kommt mit in den Suchtext: "Rinnenseiher 60 mm" allein
 // traegt das Wort schon, aber bei "Bogen 87°" entscheidet erst die Gruppe.
 const bez=[a.bezeichnung,a.gruppe].filter(Boolean).join(" ");
 const mat=String(a.material||"");
 const zusammen=[];
 LF_REGIE_EINHEITEN.forEach(e=>{
  (rmatVorschlaege(bez,e,mat)||[]).forEach(v=>{
   if(!zusammen.some(x=>String(x.no)===String(v.no)))zusammen.push(v);
  });
 });
 zusammen.sort((x,y)=>(y.vollTreffer?1:0)-(x.vollTreffer?1:0)||y.punkte-x.punkte
   ||String(x.no).localeCompare(String(y.no)));
 const raus=zusammen.slice(0,3);
 lfVorschlagCache[schl]=raus;
 return raus;
}
// Sicher heisst: die App darf vorwaehlen. Sonst schlaegt sie vor und der
// Mensch entscheidet - dieselbe Schwelle wie in js/57, nicht eine eigene.
function lfRegieSicher(liste){
 return (typeof rmatIstSicher==="function")?rmatIstSicher(liste):false;
}

// ---- Barcode -> Regie-Position (v3.236) -----------------------------------
//
// Der Zweck der ganzen Bruecke: auf der Baustelle den Artikel scannen und
// die Rapportzeile fuellt sich mit EURER EDV-Nr. und EUREM Preis.
//
// Die Auskunft steht HIER, nicht im Regierapport. js/06 fragt nur und
// schreibt nichts in die Lagertabellen - so bleibt die Regel gewahrt, dass
// der Regierapport das Lieferanten-Lager nicht anfasst.
//
// Geantwortet wird IMMER mit einem Grund, nie nur mit null. Ein Scanner,
// der schweigt, ist auf dem Dach schlimmer als einer, der "kenne ich nicht"
// sagt - man scannt dreimal und weiss immer noch nichts.
//
// Gesucht wird in beiden Lagern: zuerst im Lieferantensortiment, dann in
// der bestehenden Lagerverwaltung (lager_varianten.barcode, ueber
// lagerVarianteZuBarcode aus js/68). Ein Barcode zeigt auf eine Ware, nicht
// auf ein Modul - welches Lager sie fuehrt, ist nicht die Frage des
// Spenglers auf dem Dach.
function lfBarcodeZuRegie(code){
 const c=String(code||"").trim();
 if(!c)return {ok:false,grund:"leer",text:"Es wurde kein Code gelesen."};

 const a=lfArtikelZuBarcode(c);
 if(a){
  if(a.archiviert)
   return {ok:false,grund:"archiviert",artikel:a,
    text:"„"+a.bezeichnung+"“ ist archiviert und wird nicht mehr verrechnet."};
  const r=lfRegieVon(a);
  if(!r)return {ok:false,grund:"ohne-zuordnung",artikel:a,
   text:"„"+a.bezeichnung+"“ ist bekannt, hat aber noch keine Regie-Position. "
       +"Im Lieferanten-Lager unter 🔗 Zuordnen nachtragen – danach geht das Scannen."};
  return {ok:true,quelle:"lieferant",artikel:a,regie:r,
   text:a.bezeichnung+" → "+r.edv_nr+" · "+r.name};
 }

 // Die bestehende Lagerverwaltung. Nur LESEN, und nur, wenn es sie gibt.
 if(typeof lagerVarianteZuBarcode==="function"){
  const v=lagerVarianteZuBarcode(c);
  if(v){
   const r=lfRegieZuId(v.material_id);
   if(!r)return {ok:false,grund:"ohne-zuordnung",
    text:"„"+(v.bezeichnung||"Das Produkt")+"“ aus der Lagerverwaltung lässt sich keiner Katalogposition zuordnen."};
   return {ok:true,quelle:"lager",regie:r,
    text:(v.bezeichnung||"Produkt")+" → "+r.edv_nr+" · "+r.name};
  }
 }
 return {ok:false,grund:"unbekannt",
  text:"Der Code "+c+" ist weder im Lieferanten-Lager noch in der Lagerverwaltung bekannt."};
}

// ---- Bewegungen ansehen (v3.238) ------------------------------------------
//
// Seit v3.237 bucht die App SELBSTAENDIG: jeder Scan im Regierapport nimmt
// Ware aus dem Lager. Eine Buchung, die niemand ansehen kann, ist eine
// Buchung, die niemand pruefen kann - das ist das fehlende Netz unter dieser
// Funktion, und es gehoert unter sie, bevor Neues darauf kommt.
//
// Gezeigt wird, was die Datenbank hergibt, und nichts dazu: Zeitpunkt, Art,
// Menge, Artikel, Grund, Ziel, Projekt, Person. Gerechnet wird hier nichts -
// der Bestand steht in der Artikelliste, und zwei Rechnungen ueber dasselbe
// waeren zwei Wahrheiten.
let lfBewArt="";      // Filter: "" | zugang | abgang | korrektur
let lfBewSuche="";

function lfBewProjektName(id){
 if(id===null||id===undefined||id==="")return "";
 if(typeof allProjects==="undefined"||!Array.isArray(allProjects))return "";
 const p=allProjects.find(x=>String(x.id)===String(id));
 return p?(p.name||p.object||("Projekt "+id)):("Projekt "+id);
}
function lfBewPerson(id){
 if(!id)return "";
 return (typeof profileName==="function"&&profileName(id))||"";
}
function lfBewZeit(b){
 const s=b&&b.created_at?String(b.created_at):"";
 if(!s)return "";
 const d=new Date(s);
 if(isNaN(d))return s.slice(0,16).replace("T"," ");
 return d.toLocaleDateString("de-CH")+", "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
}
function lfBewegungenGefiltert(){
 const q=lfBewSuche.trim().toLowerCase();
 return lfBewegungen.filter(b=>{
  if(lfBewArt&&b.art!==lfBewArt)return false;
  if(!q)return true;
  const a=lfArtikelZuId(b.artikel_id);
  return [a&&a.bezeichnung,a&&a.artikelnr,a&&a.ean,b.grund,b.ziel,
          lfBewProjektName(b.project_id),lfBewPerson(b.created_by)]
   .some(x=>String(x||"").toLowerCase().indexOf(q)>=0);
 });
}
function lfBewegungenZeichnen(){
 if(typeof $!=="function")return;
 const box=$("liefBewListe");
 if(!box)return;
 const liste=lfBewegungenGefiltert();
 const k=$("liefBewKennzahlen");
 if(k){
  // Gezaehlt wird, was im Filter steht - eine Zahl, die etwas anderes
  // meint als die Liste darunter, ist schlimmer als keine.
  const zu=liste.filter(b=>b.art==="zugang").length;
  const ab=liste.filter(b=>b.art==="abgang").length;
  const ko=liste.filter(b=>b.art==="korrektur").length;
  k.innerHTML=`<b>${liste.length}</b> Buchung(en) · ${zu} Zugang · ${ab} Abgang · ${ko} Korrektur`;
 }
 if(!lfBewegungen.length){
  box.innerHTML=`<div class="info">Im Lieferanten-Lager wurde noch nichts gebucht.
   Buchungen entstehen beim Ein- und Ausscannen, beim ＋/－ am Artikel und
   – seit v3.237 – bei jedem Scan im Regierapport.</div>`;
  return;
 }
 if(!liste.length){
  box.innerHTML=`<div class="a2-leer">Keine Buchung passt zu dieser Auswahl.</div>`;
  return;
 }
 // Nur die neuesten 300. Eine Liste, die jede Buchung des Betriebs auf
 // einmal zeichnet, wird mit der Zeit unbenutzbar - und was aelter ist,
 // sucht man ueber das Suchfeld, nicht durch Scrollen.
 const zeigen=liste.slice(0,300);
 const farbe={zugang:"var(--green)",abgang:"var(--red)",korrektur:"var(--muted)"};
 const zeichen={zugang:"＋",abgang:"−",korrektur:"±"};
 box.innerHTML=zeigen.map(b=>{
  const a=lfArtikelZuId(b.artikel_id);
  const unten=[lfBewZeit(b),
               b.ziel&&b.ziel!=="unbekannt"?esc(b.ziel):"",
               lfBewProjektName(b.project_id)?esc(lfBewProjektName(b.project_id)):"",
               b.grund?esc(b.grund):"",
               lfBewPerson(b.created_by)?esc(lfBewPerson(b.created_by)):""]
              .filter(Boolean).join(" · ");
  return `<div class="kw-zeile">
   <div style="flex:1;min-width:0">
    <b>${a?esc(a.bezeichnung):"Artikel gelöscht"}</b>
    <div class="small" style="color:var(--muted)">${unten}</div>
   </div>
   <div class="small" style="text-align:right;min-width:74px">
    <b style="font-size:15px;color:${farbe[b.art]||"var(--ink)"}">${zeichen[b.art]||""}${
     esc(lfZahlText(Math.abs(lfZahl(b.menge))))}</b>
    <div style="color:var(--muted)">${esc(LF_ART_TEXT[b.art]||b.art||"")}</div>
   </div>
  </div>`;
 }).join("")
 +(liste.length>zeigen.length
   ? `<div class="small" style="color:var(--muted);margin-top:10px">Es werden die neuesten
      <b>${zeigen.length}</b> von <b>${liste.length}</b> gezeigt – Älteres über das Suchfeld.</div>`
   : "");
}
async function lfBewegungenOeffnen(){
 if(typeof $!=="function")return;
 const m=$("liefBewModal");
 if(!m)return;
 m.hidden=false;
 if(!lfGeladen)await lfLaden();
 lfBewegungenZeichnen();
}

// ---- Scannen im Regierapport: auflösen UND ausbuchen (v3.237) -------------
//
// Ansage des Anwenders: "Ja, beim scannen auch gleich ausbuchen."
//
// Bis v3.236 war ein Scan im Rapport eine Verrechnung. Jetzt ist er zweierlei:
// verrechnet UND aus dem Lager genommen. Das ist der Punkt, an dem der
// Bestand im Alltag ueberhaupt stimmen kann - vorher haette ihn jemand
// zusaetzlich von Hand ausbuchen muessen, und genau das passiert nie.
//
// DIESE FUNKTION IST DIE EINZIGE, DIE js/06 AUFRUFT. Aufloesen und Buchen
// gehoeren beides hierher, wo das Lager liegt; der Regierapport soll nicht
// wissen, wie eine Lagerbewegung aussieht.
//
// Gebucht wird NUR aus dem Lieferanten-Lager. Ein Treffer in der
// bestehenden Lagerverwaltung fuellt die Rapportzeile, wird aber nicht
// gebucht - dort hineinzuschreiben waere genau das Anfassen, das nicht
// passieren soll. Gesagt wird es trotzdem, statt es zu verschweigen.
async function lfScanVerbrauch(code,opt){
 const o=opt||{};
 const menge=lfZahl(o.menge)||1;
 const t=lfBarcodeZuRegie(code);
 if(!t.ok)return t;
 if(!o.ausbuchen)return Object.assign({},t,{gebucht:false});
 if(t.quelle!=="lieferant")
  return Object.assign({},t,{gebucht:false,
   buchhinweis:"Nicht ausgebucht: dieser Artikel liegt in der Lagerverwaltung, nicht im Lieferanten-Lager."});
 if(typeof sb==="undefined")return Object.assign({},t,{gebucht:false});
 try{
  const r=await sb.from("lieferanten_bewegungen").insert({
   artikel_id:t.artikel.id, art:"abgang", menge,
   grund:o.grund||null,
   project_id:(o.projekt!==undefined&&o.projekt!==null&&o.projekt!=="")?o.projekt:null,
   ziel:"regierapport",
   created_by:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
  });
  if(r.error)throw r.error;
 }catch(e){
  // Die Rapportzeile bleibt trotzdem gueltig - verrechnet ist verrechnet.
  // Verschwiegen wird der Fehlschlag aber nicht: sonst glaubte der Anwender,
  // der Bestand sei nachgefuehrt.
  return Object.assign({},t,{gebucht:false,
   buchhinweis:"Verrechnet, aber NICHT ausgebucht: "+((e&&e.message)||e)});
 }
 await lfLaden();
 lfZeichnen();
 const neu=lfBestand(t.artikel.id);
 return Object.assign({},t,{gebucht:true,menge,bestand:neu,
  // Ein negativer Bestand ist kein Fehler, sondern ein Hinweis: die Ware war
  // da, ihr Zugang wurde nie gebucht. Blockieren waere falsch - dann
  // scheiterte der Rapport an einer Lagerluecke.
  buchhinweis:lfZahlText(menge)+" ausgebucht, Bestand jetzt "+lfZahlText(neu)
   +(neu<0?" – negativ, also fehlt ein Zugang im Lager.":"")});
}

// ---- Preis (v3.233) -------------------------------------------------------
// Ansage des Anwenders: "Ich denke wir können schon starten bevor ich die
// preise habe." Genau dafuer ist das gebaut: ohne Preis funktioniert alles
// wie bisher, und kein Betrag wird erfunden. Ein fehlender Preis ist NICHT
// 0 - er ist unbekannt, und das ist ein Unterschied, den eine Summe nicht
// verschlucken darf.
function lfPreis(a){
 if(!a||a.preis===null||a.preis===undefined||a.preis==="")return null;
 const n=Number(a.preis);
 return Number.isFinite(n)?n:null;
}
function lfHatPreis(a){ return lfPreis(a)!==null }
function lfPreisText(a){
 const p=lfPreis(a);
 return p===null?"":"CHF "+p.toFixed(2);
}
// Wie alt ist dieser Preis? Ein Preis ohne Alter sieht nach vierzehn Monaten
// genauso aus wie gestern.
function lfPreisAlterText(a){
 const s=a&&a.preis_stand?String(a.preis_stand).slice(0,10):"";
 if(!s)return "";
 const d=new Date(s+"T00:00:00");
 if(isNaN(d))return "";
 const tage=Math.floor((Date.now()-d.getTime())/86400000);
 if(tage<=31)return "";                       // frisch - kein Hinweis noetig
 if(tage<365)return "Preis von "+d.toLocaleDateString("de-CH");
 return "Preis von "+d.toLocaleDateString("de-CH")+" – älter als ein Jahr";
}

function lfMindest(a){ return a?lfZahl(a.mindestbestand):0 }
function lfFehlt(a){
 if(!a)return 0;
 const m=lfMindest(a);
 if(m<=0)return 0;
 const f=m-lfBestand(a.id);
 return f>0?f:0;
}
// v3.232: Der zweite Weg auf die Liste - von Hand gesetzt.
//
// Ansage des Anwenders: "Wo kann ich etwas in den einkaufswagen legen?" Bis
// v3.231: nirgends. Der Reflex war richtig; manchmal soll etwas bestellt
// werden, ohne dass dafuer ein Mindestbestand gilt.
function lfHandEintrag(a){
 if(!a)return null;
 return lfEinkauf.find(x=>String(x.artikel_id)===String(a.id))||null;
}
function lfHandMenge(a){ const e=lfHandEintrag(a); return e?lfZahl(e.menge):0 }

// Der Gesamtbedarf ist die SUMME der beiden Herkuenfte, nicht die groessere
// von beiden.
//
// Das ist eine Entscheidung, und sie ist die einzige, die nichts erfindet:
// beide Bedarfe sind echt und unabhaengig. Der Mindestbestand sagt, was ins
// Regal zurueck muss; der Wunsch von Hand sagt, was zusaetzlich fuer eine
// Baustelle weggeht. Wer nur die groessere Zahl bestellt, hat hinterher zu
// wenig - und zwar genau um den anderen Betrag. Damit trotzdem nichts
// versteckt gerechnet wird, nennen Liste und Text BEIDE Anteile.
function lfBedarf(a){ return lfFehlt(a)+lfHandMenge(a) }

// Bestellt wird in Verpackungseinheiten, nicht in Stueck: wer 3 braucht und
// der Haendler liefert Fuenferpackungen, bestellt 5. Der Bedarf ist die
// Wahrheit ueber den Mangel, die Bestellmenge die ueber die Bestellung -
// deshalb stehen beide da und nicht nur eine.
function lfBestellmenge(a){
 const b=lfBedarf(a);
 if(b<=0)return 0;
 const v=lfZahl(a.vpe);
 return v>0?Math.ceil(b/v)*v:b;
}
function lfUnterMindest(){ return lfArtikel.filter(a=>!a.archiviert&&lfFehlt(a)>0) }
function lfEinkaufsliste(){
 const t=(x,y)=>String(x||"").localeCompare(String(y||""),"de");
 return lfArtikel.filter(a=>!a.archiviert&&lfBedarf(a)>0).sort((x,y)=>
  t(x.lieferant,y.lieferant)||t(x.gruppe,y.gruppe)||t(x.bezeichnung,y.bezeichnung));
}
// Woher eine Zeile kommt - als Text, an einer Stelle. Liste und verschickter
// Text lesen denselben Satz; zwei Fassungen waeren zwei Wahrheiten darueber,
// warum etwas bestellt wird.
function lfHerkunftText(a){
 const f=lfFehlt(a), h=lfHandMenge(a), e=lfHandEintrag(a);
 const teile=[];
 if(f>0)teile.push("Mindestbestand "+lfZahlText(lfMindest(a))+", Bestand "+lfZahlText(lfBestand(a.id)));
 if(h>0)teile.push("von Hand "+lfZahlText(h)+(e&&e.grund?" ("+e.grund+")":""));
 return teile.join(" · ");
}
// Der Text zum Verschicken. Er entsteht aus DERSELBEN Liste wie die Anzeige -
// eine eigene Textfassung waere eine zweite Wahrheit darueber, was fehlt.
// v3.233: Der Wert einer Zeile - oder null, wenn kein Preis hinterlegt ist.
function lfZeilenwert(a){
 const p=lfPreis(a);
 return p===null?null:p*lfBestellmenge(a);
}
// Die Summe zaehlt NUR die Zeilen mit Preis und sagt dazu, wie viele Zeilen
// sie nicht kennt. Eine Summe, die fehlende Preise als 0 mitnimmt, ist
// schlimmer als gar keine: sie sieht vollstaendig aus und ist zu klein.
function lfEinkaufsWert(){
 const liste=lfEinkaufsliste();
 let summe=0, mit=0, ohne=0;
 liste.forEach(a=>{
  const w=lfZeilenwert(a);
  if(w===null)ohne++; else { summe+=w; mit++ }
 });
 return {summe,mit,ohne};
}
function lfEinkaufsText(){
 const liste=lfEinkaufsliste();
 if(!liste.length)return "";
 const heute=new Date().toLocaleDateString("de-CH");
 const zeilen=["Einkaufsliste vom "+heute,""];
 let letzter=null;
 liste.forEach(a=>{
  const l=String(a.lieferant||"Ohne Lieferant");
  if(l!==letzter){ if(letzter!==null)zeilen.push(""); zeilen.push(l+":"); letzter=l }
  const w=lfZeilenwert(a);
  zeilen.push("  "+lfZahlText(lfBestellmenge(a))+" x  "+a.artikelnr+"  "+a.bezeichnung
   +(w===null?"":"   CHF "+w.toFixed(2))
   +"   ("+lfHerkunftText(a)+")");
 });
 const wert=lfEinkaufsWert();
 if(wert.mit){
  zeilen.push("");
  zeilen.push("Summe der Positionen mit Preis: CHF "+wert.summe.toFixed(2));
  if(wert.ohne)zeilen.push("Für "+wert.ohne+" Position(en) ist kein Preis hinterlegt – nicht enthalten.");
 }
 return zeilen.join("\n");
}

function lfEinkaufZeichnen(){
 if(typeof $!=="function")return;
 const box=$("liefEinkaufListe"), feld=$("liefEinkaufText");
 if(!box)return;
 const liste=lfEinkaufsliste();
 const ueberwacht=lfArtikel.filter(a=>lfMindest(a)>0).length;
 if(feld)feld.value=lfEinkaufsText();
 const knopf=$("liefEinkaufKopieren");
 if(knopf)knopf.disabled=!liste.length;
 if(!liste.length){
  // Eine leere Einkaufsliste bedeutet zweierlei, und die beiden zu
  // verwechseln waere teuer: "nichts fehlt" oder "es wird nichts
  // ueberwacht". Also wird gesagt, welches von beiden zutrifft.
  box.innerHTML=ueberwacht
   ? `<div class="info">Nichts zu bestellen – von allen <b>${ueberwacht}</b>
      überwachten Artikeln ist genug da. Einzelnes lässt sich jederzeit von Hand
      dazusetzen: im Lager den Artikel antippen, <b>🛒 Auf die Einkaufsliste</b>.</div>`
   : `<div class="info">Für noch keinen Artikel ist ein <b>Mindestbestand</b>
      hinterlegt, und von Hand ist auch nichts gesetzt – deshalb kann die Liste
      nichts melden. Im Lager einen Artikel antippen: dort trägst du einen
      <b>Mindestbestand</b> ein (dann meldet er sich selbst) oder setzt ihn mit
      <b>🛒 Auf die Einkaufsliste</b> einmalig dazu.</div>`;
  return;
 }
 let letzter=null, html="";
 liste.forEach(a=>{
  const l=String(a.lieferant||"Ohne Lieferant");
  // Die Lieferanten-Ueberschrift hatte in v3.231 die Klasse
  // "a2-abschnitt-titel" - die es in keiner CSS-Datei gibt. Sie stand
  // dadurch unformatiert da. Hier bewusst inline gesetzt statt eine neue
  // Klasse zu erfinden: eine Zwischenueberschrift in genau einer Liste
  // rechtfertigt keinen Eintrag in einer geteilten CSS-Datei.
  if(l!==letzter){
   html+=`<div style="margin:14px 0 4px;font-weight:700;color:var(--muted);
    font-size:13px;letter-spacing:.02em">${esc(l)}</div>`;
   letzter=l;
  }
  const hand=lfHandEintrag(a);
  html+=`<div class="kw-zeile">
   <div style="flex:1;min-width:0">
    <b>${esc(a.bezeichnung)}</b>
    <div class="small" style="color:var(--muted)">${esc(a.artikelnr)} · ${esc(lfHerkunftText(a))}${
     a.vpe?" · VPE "+esc(lfZahlText(a.vpe)):""}</div>
   </div>
   <div class="small" style="text-align:right;min-width:92px">
    <b style="font-size:15px;color:var(--red)">${esc(lfZahlText(lfBestellmenge(a)))}</b>
    <div style="color:var(--muted)">Bedarf ${esc(lfZahlText(lfBedarf(a)))}</div>
    ${lfHatPreis(a)?`<div style="color:var(--muted)">CHF ${esc(lfZeilenwert(a).toFixed(2))}</div>`:""}
   </div>
   ${hand?`<div class="bar" style="margin:0"><button type="button" class="gray"
     data-lf-erledigt="${esc(hand.id)}" title="Von Hand gesetzte Zeile abhaken">✓</button></div>`:""}
  </div>`;
 });
 // v3.233: Die Summe, und daneben ehrlich, was sie NICHT kennt. Solange
 // keine Preisliste da ist, steht hier gar keine Summe - lieber nichts als
 // eine, die stillschweigend zu klein ist.
 const wert=lfEinkaufsWert();
 if(wert.mit){
  html+=`<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--line);
    display:flex;justify-content:space-between;align-items:baseline;gap:10px">
   <span class="small" style="color:var(--muted)">Summe der Positionen mit Preis</span>
   <b style="font-size:16px">CHF ${esc(wert.summe.toFixed(2))}</b></div>`;
  if(wert.ohne)html+=`<div class="small" style="color:var(--muted);margin-top:4px">
   Für <b>${wert.ohne}</b> Position(en) ist kein Preis hinterlegt – sie sind in der Summe nicht enthalten.</div>`;
 }else if(wert.ohne){
  html+=`<div class="small" style="color:var(--muted);margin-top:14px;padding-top:10px;
   border-top:1px solid var(--line)">Für keine Position ist ein Preis hinterlegt – deshalb
   steht hier keine Summe. Preise kommen mit der Preisliste des Händlers als Excel-Datei
   oder lassen sich am Artikel von Hand eintragen.</div>`;
 }
 box.innerHTML=html;
}
function lfEinkaufOeffnen(){
 if(typeof $!=="function")return;
 const m=$("liefEinkaufModal");
 if(!m)return;
 const h=$("liefEinkaufMeldung"); if(h)h.textContent="";
 lfEinkaufZeichnen();
 m.hidden=false;
}
async function lfEinkaufKopieren(){
 if(typeof $!=="function")return;
 const text=lfEinkaufsText();
 const h=$("liefEinkaufMeldung");
 if(!text){ if(h)h.textContent="Es gibt nichts zu kopieren."; return }
 // Die Zwischenablage darf fehlschlagen - im Browser eines alten Geraets,
 // ohne sichere Verbindung, oder weil das Betriebssystem es verweigert.
 // Deshalb steht der Text ohnehin im Feld darunter: schlaegt das Kopieren
 // fehl, wird darauf verwiesen, statt so zu tun, als haette es geklappt.
 try{
  if(!navigator.clipboard||!navigator.clipboard.writeText)throw new Error("keine Zwischenablage");
  await navigator.clipboard.writeText(text);
  if(h)h.textContent="Einkaufsliste kopiert – sie lässt sich jetzt einfügen.";
 }catch(e){
  const f=$("liefEinkaufText");
  if(f){ f.focus(); f.select() }
  if(h)h.textContent="Das Kopieren hat dieses Gerät nicht erlaubt. Der Text unten ist markiert – von Hand kopieren.";
 }
}

// ---- Zuordnen (v3.234) ----------------------------------------------------
//
// 439 Artikel einzeln durch den Artikel-Dialog zu schieben waere ein
// Nachmittag. Deshalb eine eigene Ansicht: alle noch offenen Artikel, je
// mit dem Vorschlag der App, und der Mensch hakt ab.
//
// Die App waehlt NUR vor, wo sie sich sicher ist (rmatIstSicher). Ueberall
// sonst steht "offen" - ein vorgewaehlter Halbtreffer waere schlimmer als
// gar keiner, weil er unbesehen durchgewinkt wird.
let lfZuordnungen={};      // {artikelId: material_id oder ""} - noch nicht gespeichert
let lfZuordnenNurOffene=true;
let lfZuordnenGruppe="";   // v3.235: eine Produktgruppe auf einmal
let lfZuordnenSuche="";    // v3.235: innerhalb der Gruppe weiter eingrenzen

// v3.235, Ansage des Anwenders: "können wir das so machen das ich die
// zuordnung pro kategorie machen kann damit es übersichtlicher ist".
//
// 439 Artikel in 13 Gruppen, und die Zuordnung ist je Gruppe fast immer
// dieselbe - alle Rinnenstutzen sind "Einhängestutzen gerade". Gearbeitet
// wird deshalb gruppenweise, und was angezeigt wird, laesst sich in einem
// Zug setzen.
function lfZuordnenGruppen(){
 const m={};
 lfArtikel.filter(a=>!a.archiviert).forEach(a=>{
  const g=String(a.gruppe||"Ohne Gruppe");
  if(!m[g])m[g]={name:g,gesamt:0,offen:0};
  m[g].gesamt++;
  if(!lfRegieVon(a))m[g].offen++;
 });
 return Object.keys(m).sort((x,y)=>x.localeCompare(y,"de")).map(k=>m[k]);
}
function lfZuordnenKandidaten(){
 const t=(x,y)=>String(x||"").localeCompare(String(y||""),"de");
 const q=lfZuordnenSuche.trim().toLowerCase();
 return lfArtikel.filter(a=>{
  if(a.archiviert)return false;
  if(lfZuordnenNurOffene&&lfRegieVon(a))return false;
  if(lfZuordnenGruppe&&String(a.gruppe||"Ohne Gruppe")!==lfZuordnenGruppe)return false;
  if(q&&![a.bezeichnung,a.artikelnr,a.material].some(x=>String(x||"").toLowerCase().indexOf(q)>=0))return false;
  return true;
 }).sort((x,y)=>t(x.gruppe,y.gruppe)||t(x.bezeichnung,y.bezeichnung));
}

// Der staerkste Vorschlag ist nicht der aus dem Text, sondern die eigene
// Entscheidung des Anwenders: hat er in dieser Gruppe schon 40 Artikel auf
// "Einhängestutzen gerade" gelegt, ist das fuer den 41. die richtige
// Auskunft - unabhaengig davon, wie die Woerter heissen.
//
// Genau der Fall, den der Anwender gemeldet hat: "Rinnenstutzen ist ein
// Einhängestutzen gerade, da lag die app daneben". Die Textbewertung zieht
// "Rinnen..." zu Rinnenwinkel und Rinnenboden. Die Gruppe weiss es besser,
// sobald der Mensch es einmal gesagt hat.
//
// Gezaehlt werden gespeicherte UND noch offene Zuordnungen - sonst muesste
// man erst speichern, damit die Gruppe mitlernt.
function lfGruppenVorschlag(a){
 if(!a)return null;
 const g=String(a.gruppe||"Ohne Gruppe");
 const zaehler={};
 lfArtikel.forEach(x=>{
  if(x.archiviert||String(x.gruppe||"Ohne Gruppe")!==g)return;
  if(String(x.id)===String(a.id))return;
  const s=String(x.id);
  const id=Object.prototype.hasOwnProperty.call(lfZuordnungen,s)
   ? lfZuordnungen[s]
   : (lfRegieVon(x)?String(lfRegieVon(x).id):"");
  if(!id)return;
  zaehler[id]=(zaehler[id]||0)+1;
 });
 const beste=Object.keys(zaehler).sort((x,y)=>zaehler[y]-zaehler[x])[0];
 if(!beste)return null;
 const r=lfRegieZuId(beste);
 return r?{regie:r,anzahl:zaehler[beste]}:null;
}
function lfZuordnungWert(a){
 const s=String(a.id);
 if(Object.prototype.hasOwnProperty.call(lfZuordnungen,s))return lfZuordnungen[s];
 const r=lfRegieVon(a);
 return r?String(r.id):"";
}
function lfZuordnenOffen(){
 return Object.keys(lfZuordnungen).filter(k=>{
  const a=lfArtikelZuId(k);
  const r=lfRegieVon(a);
  return String(r?r.id:"")!==String(lfZuordnungen[k]);
 }).length;
}
// v3.235: Die Gruppenwahl. Sie wird aus den Artikeln abgeleitet, nicht
// gefuehrt - eine zweite Gruppenliste waere eine zweite Wahrheit darueber,
// welche Gruppen es gibt.
function lfZuordnenGruppenZeichnen(){
 if(typeof $!=="function")return;
 const sel=$("liefZuordnenGruppe");
 if(!sel)return;
 const gr=lfZuordnenGruppen();
 const gesamtOffen=gr.reduce((s,g)=>s+g.offen,0);
 sel.innerHTML=`<option value=""${lfZuordnenGruppe===""?" selected":""}>Alle Gruppen (${gesamtOffen} offen)</option>`
  +gr.map(g=>`<option value="${esc(g.name)}"${lfZuordnenGruppe===g.name?" selected":""}>${
   esc(g.name)} – ${g.offen} von ${g.gesamt} offen</option>`).join("");
}
// Die Auswahlliste der Regie-Positionen fuer das Sammelsetzen. Ein datalist
// statt eines select mit 380 Zeilen: tippen filtert mit. Gefuellt wird sie
// EINMAL beim Oeffnen - bei jedem Tastendruck 380 Zeilen neu zu bauen waere
// Verschwendung, und der Katalog aendert sich waehrenddessen nicht.
function lfZuordnenRegieListeFuellen(){
 if(typeof $!=="function")return;
 const dl=$("liefZuordnenRegieListe");
 if(dl)dl.innerHTML=lfRegieListe().map(r=>
  `<option value="${esc(r.edv_nr)}">${esc(r.name)}${r.dim?" · "+esc(r.dim):""}${r.unit?" · "+esc(r.unit):""}</option>`).join("");
}
// "Alle angezeigten auf ..." - was du siehst, wird gesetzt. Nichts
// Unsichtbares. Deshalb wirkt es auf lfZuordnenKandidaten(), also samt
// Gruppen- und Suchfilter und samt dem Schalter "nur offene".
function lfZuordnenAlleSetzen(){
 if(typeof $!=="function")return;
 const feld=$("liefZuordnenRegie");
 const h=$("liefZuordnenMeldung");
 const nr=feld?feld.value.trim():"";
 const liste=lfZuordnenKandidaten();
 if(!liste.length){ if(h){h.style.color="var(--muted)";h.textContent="Es wird gerade nichts angezeigt."} return }
 if(!nr){
  if(h){ h.style.color="var(--red)";
   h.textContent="Bitte oben eine Regie-Position wählen – oder das Feld leeren und die Zeilen einzeln setzen." }
  return;
 }
 const r=lfRegieZuNummer(nr);
 if(!r){
  if(h){ h.style.color="var(--red)"; h.textContent="Die EDV-Nr. „"+nr+"“ steht nicht im Regie-Katalog." }
  return;
 }
 if(typeof confirm==="function"&&!confirm(
   "Alle "+liste.length+" angezeigten Artikel auf „"+r.edv_nr+" · "+r.name+"“ setzen?\n\n"
  +"Gespeichert wird erst mit „Speichern“ – bis dahin lässt sich jede Zeile noch einzeln ändern."))return;
 liste.forEach(a=>{ lfZuordnungen[String(a.id)]=String(r.id) });
 lfZuordnenZeichnen();
 if(h){ h.style.color="var(--muted)";
  h.textContent=liste.length+" Artikel auf „"+r.edv_nr+"“ gesetzt – noch nicht gespeichert." }
}

function lfZuordnenKopfZeichnen(){
 if(typeof $!=="function")return;
 const kopf=$("liefZuordnenKennzahlen");
 if(kopf){
  const gesamt=lfArtikel.filter(a=>!a.archiviert).length;
  const noch=lfZuordnenOffen();
  kopf.innerHTML=`<b>${lfZugeordnet()}</b> von <b>${gesamt}</b> Artikeln haben eine Regie-Position`
   +(noch?` · <b style="color:var(--red)">${noch}</b> Änderung(en) noch nicht gespeichert`:"");
 }
 const offen=$("liefZuordnenSpeichern");
 if(offen){
  const n=lfZuordnenOffen();
  offen.disabled=!n;
  offen.textContent=n?"💾 "+n+" Änderung(en) speichern":"💾 Speichern";
 }
}
function lfZuordnenZeichnen(){
 if(typeof $!=="function")return;
 const box=$("liefZuordnenListe");
 if(!box)return;
 lfZuordnenKopfZeichnen();
 lfZuordnenGruppenZeichnen();
 const liste=lfZuordnenKandidaten();
 const setzen=$("liefZuordnenAlle");
 if(setzen){
  setzen.disabled=!liste.length;
  setzen.textContent=liste.length?"Alle "+liste.length+" angezeigten setzen":"Alle angezeigten setzen";
 }
 const sichere=$("liefZuordnenSichere");
 if(sichere)sichere.disabled=!liste.length;
 if(!liste.length){
  box.innerHTML=(lfZuordnenGruppe||lfZuordnenSuche.trim())
   ? `<div class="info">Hier ist nichts mehr offen. Wähle oben eine andere Gruppe –
      oder schalte „nur noch nicht zugeordnete“ aus, um die fertigen zu sehen und zu ändern.</div>`
   : (lfZuordnenNurOffene
      ? `<div class="info">Alle Artikel haben eine Regie-Position. Mit dem Schalter oben
         lassen sich auch die bereits zugeordneten anzeigen und ändern.</div>`
      : `<div class="a2-leer">Keine Artikel vorhanden.</div>`);
  return;
 }
 let letzte=null, html="";
 liste.forEach(a=>{
  const g=String(a.gruppe||"Ohne Gruppe");
  if(g!==letzte&&!lfZuordnenGruppe){
   html+=`<div style="margin:14px 0 4px;font-weight:700;color:var(--muted);
    font-size:13px;letter-spacing:.02em">${esc(g)}</div>`;
   letzte=g;
  }
  const vor=lfRegieVorschlaege(a);
  const sicher=lfRegieSicher(vor);
  const grp=lfGruppenVorschlag(a);
  const wert=lfZuordnungWert(a);
  // Die Auswahl enthaelt: keine Zuordnung, die Vorschlaege, und - falls
  // der Artikel schon eine Position hat, die nicht unter den Vorschlaegen
  // ist - diese ebenfalls. Sonst wuerde das Oeffnen der Ansicht eine
  // bestehende Zuordnung stillschweigend loeschen.
  const optionen=[];
  optionen.push(`<option value=""${wert===""?" selected":""}>— keine Regie-Position —</option>`);
  const drin=new Set();
  // Der Gruppenvorschlag steht ZUERST - er ist die eigene Entscheidung des
  // Anwenders und schlaegt jede Textaehnlichkeit.
  if(grp){
   drin.add(String(grp.regie.id));
   optionen.push(`<option value="${esc(grp.regie.id)}"${String(wert)===String(grp.regie.id)?" selected":""}>${
    esc(lfRegieText(grp.regie))} (wie ${grp.anzahl}× in dieser Gruppe)</option>`);
  }
  vor.forEach(v=>{
   const r=lfRegieZuNummer(v.no);
   if(!r||drin.has(String(r.id)))return;
   drin.add(String(r.id));
   const grund=v.gruende&&v.gruende.length?" ("+v.gruende.join(", ")+")":"";
   optionen.push(`<option value="${esc(r.id)}"${String(wert)===String(r.id)?" selected":""}>${
    esc(lfRegieText(r))}${esc(grund)}</option>`);
  });
  const jetzt=lfRegieVon(a);
  if(jetzt&&!drin.has(String(jetzt.id)))
   optionen.push(`<option value="${esc(jetzt.id)}"${String(wert)===String(jetzt.id)?" selected":""}>${
    esc(lfRegieText(jetzt))} (bisher)</option>`);
  html+=`<div class="kw-zeile" style="align-items:flex-start">
   <div style="flex:1;min-width:0">
    <b>${esc(a.bezeichnung)}</b>
    <div class="small" style="color:var(--muted)">${esc(a.artikelnr)}${
     a.material?" · "+esc(a.material):""}${
     grp?' · <span style="color:var(--green)">wie '+grp.anzahl+'× in dieser Gruppe</span>'
        :(vor.length?(sicher?' · <span style="color:var(--green)">sicherer Vorschlag</span>'
                            :' · <span style="color:var(--muted)">Vorschlag, bitte prüfen</span>')
                    :' · <span style="color:var(--muted)">kein Vorschlag gefunden</span>')}</div>
    <select data-lf-zu="${esc(a.id)}" style="margin-top:4px;width:100%">${optionen.join("")}</select>
   </div>
  </div>`;
 });
 box.innerHTML=html;
}
// "Alle sicheren uebernehmen" fasst NUR die an, bei denen die Bewertung
// deutlich fuehrt - und nur die, die noch offen sind. Eine bestehende
// Zuordnung wird nie ueberschrieben.
function lfZuordnenSichereUebernehmen(){
 // v3.235: wirkt auf die ANGEZEIGTEN Artikel, nicht auf alle. Sonst
 // aenderte der Knopf Zeilen in Gruppen, die gerade gar nicht zu sehen
 // sind - und man merkte es erst beim Speichern.
 let n=0, ausGruppe=0;
 lfZuordnenKandidaten().forEach(a=>{
  if(lfRegieVon(a))return;
  // Die eigene Entscheidung in der Gruppe zaehlt mehr als die
  // Textaehnlichkeit - siehe lfGruppenVorschlag.
  const grp=lfGruppenVorschlag(a);
  if(grp){ lfZuordnungen[String(a.id)]=String(grp.regie.id); n++; ausGruppe++; return }
  const vor=lfRegieVorschlaege(a);
  if(!lfRegieSicher(vor))return;
  const r=lfRegieZuNummer(vor[0].no);
  if(!r)return;
  lfZuordnungen[String(a.id)]=String(r.id);
  n++;
 });
 lfZuordnenZeichnen();
 const h=$("liefZuordnenMeldung");
 if(h){
  h.style.color="var(--muted)";
  h.textContent=n
   ? n+" Vorschlag(e) eingesetzt"+(ausGruppe?" ("+ausGruppe+" davon nach dem Muster dieser Gruppe)":"")
     +" – noch nicht gespeichert. Bitte durchsehen und speichern."
   : "Kein Vorschlag ist sicher genug zum Vorwählen. Setze eine Zeile von Hand – die übrigen der Gruppe schlägt die App dann von selbst genauso vor.";
 }
}
async function lfZuordnenSpeichern(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const h=$("liefZuordnenMeldung");
 const paare=Object.keys(lfZuordnungen).map(k=>({id:Number(k),material_id:lfZuordnungen[k]||""}))
  .filter(p=>{
   const r=lfRegieVon(lfArtikelZuId(p.id));
   return String(r?r.id:"")!==String(p.material_id);
  });
 if(!paare.length){ if(h)h.textContent="Es gibt nichts zu speichern."; return }
 $("liefZuordnenSpeichern").disabled=true;
 if(h){ h.style.color="var(--muted)"; h.textContent=paare.length+" Zuordnung(en) werden gespeichert …" }
 try{
  // EIN Aufruf statt n Schreibzugriffe - auf dem Handy im Funkloch waere n
  // der sichere Weg in einen halb gespeicherten Zustand. Die Funktion laeuft
  // ohne security definer, also greifen RLS, Firmen-Grenze und Trigger wie
  // bei einem gewoehnlichen update.
  const r=await sb.rpc("lieferanten_zuordnen",{paare});
  if(r.error)throw r.error;
 }catch(e){
  if(h){ h.style.color="var(--red)"; h.textContent="Nicht gespeichert: "+((e&&e.message)||e) }
  $("liefZuordnenSpeichern").disabled=false;
  return;
 }
 lfZuordnungen={};
 await lfLaden();
 lfZeichnen();
 lfZuordnenZeichnen();
 if(h){ h.style.color="var(--muted)"; h.textContent=paare.length+" Zuordnung(en) gespeichert." }
}
function lfZuordnenOeffnen(){
 if(typeof $!=="function")return;
 const m=$("liefZuordnenModal");
 if(!m)return;
 lfZuordnungen={};
 lfZuordnenSuche="";
 const sf=$("liefZuordnenSuche");
 if(sf)sf.value="";
 const rf=$("liefZuordnenRegie");
 if(rf)rf.value="";
 const h=$("liefZuordnenMeldung");
 if(h){ h.style.color="var(--muted)"; h.textContent="Vorschläge werden gerechnet …" }
 m.hidden=false;
 // Das Rechnen laeuft ueber alle Artikel gegen den ganzen Katalog. Erst
 // zeichnen, wenn der Bildschirm steht - sonst sieht der Anwender ein
 // eingefrorenes Fenster ohne zu wissen, warum.
 setTimeout(()=>{
  lfZuordnenRegieListeFuellen();
  lfZuordnenZeichnen();
  if(h)h.textContent="";
 },30);
}

// ---- Von Hand auf die Einkaufsliste (v3.232) ------------------------------
//
// Je Artikel genau EIN offener Wunsch: ein zweites Setzen aendert die Menge,
// statt eine zweite Zeile zu erzeugen. Eine Liste, in der derselbe Artikel
// dreimal steht, sagt nicht, wie viel bestellt werden soll. In der Datenbank
// ist das als UNIQUE (company_id, artikel_id) WHERE erledigt_am IS NULL
// festgehalten - die Regel steht dort, nicht nur hier.
async function lfAufEinkaufsliste(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const a=lfArtikelZuId(lfArtikelOffenId);
 if(!a)return;
 const menge=lfZahl($("liefArtikelWunschMenge").value);
 if(menge<=0){
  $("liefArtikelFehler").textContent="Bitte eine Menge über 0 eintragen.";
  return;
 }
 const grund=$("liefArtikelWunschGrund").value.trim()||null;
 const alt=lfHandEintrag(a);
 $("liefArtikelWunschSetzen").disabled=true;
 try{
  const r=alt
   ? await sb.from("lieferanten_einkauf").update({menge,grund}).eq("id",alt.id)
   : await sb.from("lieferanten_einkauf").insert({
      artikel_id:a.id, menge, grund,
      created_by:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null});
  if(r.error)throw r.error;
 }catch(e){
  $("liefArtikelFehler").textContent="Nicht gesetzt: "+((e&&e.message)||e);
  $("liefArtikelWunschSetzen").disabled=false;
  return;
 }
 $("liefArtikelWunschSetzen").disabled=false;
 lfArtikelSchliessen();
 await lfLaden();
 lfZeichnen();
 if($("liefEinkaufModal")&&!$("liefEinkaufModal").hidden)lfEinkaufZeichnen();
 lfMeldung(lfZahlText(menge)+" x „"+a.bezeichnung+"“ "+(alt?"auf der":"auf die")+" Einkaufsliste"+(alt?" geändert":"")+".");
}
// Abhaken ist kein Loeschen: die Zeile bleibt in der Datenbank mit ihrem
// Zeitpunkt stehen und verschwindet nur von der Liste. Danach laesst sich
// derselbe Artikel wieder setzen - die Eindeutigkeitsregel gilt nur fuer
// OFFENE Wuensche.
async function lfEinkaufErledigt(id){
 if(typeof sb==="undefined")return;
 const e=lfEinkauf.find(x=>String(x.id)===String(id));
 if(!e)return;
 const a=lfArtikel.find(x=>String(x.id)===String(e.artikel_id));
 const h=(typeof $==="function")?$("liefEinkaufMeldung"):null;
 try{
  const r=await sb.from("lieferanten_einkauf").update({
   erledigt_am:new Date().toISOString(),
   erledigt_von:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
  }).eq("id",e.id);
  if(r.error)throw r.error;
 }catch(err){
  if(h){ h.textContent="Nicht abgehakt: "+((err&&err.message)||err); h.style.color="var(--red)" }
  return;
 }
 await lfLaden();
 lfEinkaufZeichnen();
 lfZeichnen();
 if(h){
  h.style.color="var(--muted)";
  h.textContent="„"+((a&&a.bezeichnung)||"Der Artikel")+"“ ist abgehakt"
   +(a&&lfFehlt(a)>0?" – er steht weiter auf der Liste, weil sein Mindestbestand unterschritten ist.":".");
 }
}

// ---- Mindestbestand am Artikel --------------------------------------------
let lfArtikelOffenId=null;
let lfArtikelRegieWahl="";     // die Wahl im offenen Dialog (v3.234)
function lfArtikelOeffnen(id){
 if(typeof $!=="function")return;
 const a=lfArtikelZuId(id);
 if(!a){ lfMeldung("Dieser Artikel ist nicht mehr da.",true); return }
 lfArtikelOffenId=a.id;
 $("liefArtikelTitel").textContent=a.bezeichnung;
 $("liefArtikelUnter").textContent=(a.lieferant?a.lieferant+" · ":"")+"Art.-Nr. "+a.artikelnr
  +(a.ean?" · "+a.ean:"")+" · Bestand "+lfZahlText(lfBestand(a.id));
 $("liefArtikelMindest").value=lfMindest(a)?lfZahlText(lfMindest(a)):"";
 // v3.233: Der Preis steht hier, damit sich einzelne von Hand eintragen
 // lassen, bevor die Preisliste des Haendlers da ist.
 $("liefArtikelPreis").value=lfHatPreis(a)?lfPreis(a).toFixed(2):"";
 const pa=$("liefArtikelPreisStand");
 if(pa){
  const alt=lfPreisAlterText(a);
  pa.textContent=lfHatPreis(a)
   ? (alt||"Preis ist aktuell erfasst.")
   : "Noch kein Preis hinterlegt – ohne ihn rechnet die Einkaufsliste diese Position nicht mit.";
  pa.style.color=/älter als ein Jahr/.test(alt)?"var(--red)":"var(--muted)";
 }
 // v3.232: Steht der Artikel schon von Hand auf der Liste, kommen Menge und
 // Grund mit - dann aendert der Knopf die vorhandene Zeile, statt eine
 // zweite anzulegen. Das steht auch so da, sonst waere nicht erkennbar,
 // warum die Felder gefuellt sind.
 const wunsch=lfHandEintrag(a);
 $("liefArtikelWunschMenge").value=wunsch?lfZahlText(wunsch.menge):(a.vpe?lfZahlText(a.vpe):"1");
 $("liefArtikelWunschGrund").value=(wunsch&&wunsch.grund)||"";
 $("liefArtikelWunschSetzen").textContent=wunsch?"🛒 Menge ändern":"🛒 Auf die Einkaufsliste";
 const hin=$("liefArtikelWunschHinweis");
 if(hin)hin.textContent=wunsch
  ? "Steht bereits von Hand auf der Einkaufsliste."
  : "Einmalig bestellen, ohne dafür einen Mindestbestand festzulegen.";
 // v3.234: Regie-Position. Ausgewaehlt wird hier, gespeichert mit dem Rest.
 const r0=lfRegieVon(a);
 lfArtikelRegieWahl=r0?String(r0.id):"";
 lfArtikelRegieZeichnen(a);
 $("liefArtikelFehler").textContent="";
 $("liefArtikelModal").hidden=false;
 setTimeout(()=>{ const f=$("liefArtikelMindest"); if(f){f.focus();f.select()} },60);
}
// Die Auswahl im Artikel-Dialog: aktuelle Zuordnung, die Vorschlaege der App
// und die freie Suche im Katalog. Gesucht wird mit searchMaterials() aus
// js/06 - derselben Suche wie im Regierapport; eine zweite waere eine zweite
// Wahrheit darueber, was ein Treffer ist.
function lfArtikelRegieZeichnen(a){
 if(typeof $!=="function")return;
 const box=$("liefArtikelRegie");
 if(!box)return;
 // Angezeigt wird die WAHL im offenen Dialog, nicht der gespeicherte Stand -
 // sonst sieht der Anwender nach einem Klick immer noch das Alte und klickt
 // ein zweites Mal.
 const jetzt=lfRegieZuId(lfArtikelRegieWahl);
 const vor=lfRegieVorschlaege(a);
 const sicher=lfRegieSicher(vor);
 let html=jetzt
  ? `<div class="info" style="margin:0">Zugeordnet: <b>${esc(lfRegieText(jetzt))}</b>
     <button type="button" class="gray" data-lf-regie="" style="margin-left:8px">✕ entfernen</button></div>`
  : `<div class="small" style="color:var(--muted)">Noch keiner Regie-Position zugeordnet.</div>`;
 if(vor.length){
  html+=`<div class="small" style="color:var(--muted);margin:8px 0 4px">${
   sicher?"Vorschlag der App:":"Vorschläge – bitte prüfen:"}</div>`;
  vor.forEach(v=>{
   const r=lfRegieZuNummer(v.no);
   if(!r)return;
   const grund=v.gruende&&v.gruende.length?" · "+v.gruende.join(", "):"";
   html+=`<button type="button" class="${jetzt&&String(jetzt.id)===String(r.id)?"blue":"gray"}"
    data-lf-regie="${esc(r.id)}" style="display:block;width:100%;text-align:left;margin-bottom:4px">
    ${esc(lfRegieText(r))}<span style="opacity:.7">${esc(grund)}</span></button>`;
  });
 }else if(!jetzt){
  html+=`<div class="small" style="color:var(--muted);margin-top:6px">Die App findet keinen
   passenden Vorschlag – das ist in Ordnung. Nicht jeder Lieferantenartikel hat eine
   Regie-Position.</div>`;
 }
 html+=`<div class="wide" style="margin-top:8px"><label>Andere Position suchen</label>
  <div class="search"><input id="liefRegieSuche" placeholder="EDV-Nr. oder Bezeichnung" autocomplete="off">
  <div id="liefRegieSug" class="suggest"></div></div></div>`;
 box.innerHTML=html;
 const feld=$("liefRegieSuche");
 if(feld)feld.oninput=()=>{
  const sug=$("liefRegieSug");
  if(!sug||typeof searchMaterials!=="function")return;
  sug.innerHTML=searchMaterials(feld.value).map(x=>{
   const r=lfRegieZuNummer(x[0]);
   if(!r)return "";
   return `<div class="item" data-lf-regie="${esc(r.id)}"><b>${esc(x[0])} · ${esc(x[1])}</b>
    <span>${esc(x[2]||"")} · ${esc(x[3]||"")}</span></div>`;
  }).join("");
  if(sug.innerHTML&&typeof positionSuggest==="function")positionSuggest(feld,sug);
 };
}
function lfArtikelSchliessen(){
 if(typeof $==="function"&&$("liefArtikelModal"))$("liefArtikelModal").hidden=true;
 lfArtikelOffenId=null;
}
async function lfMindestSpeichern(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const a=lfArtikelZuId(lfArtikelOffenId);
 if(!a)return;
 const roh=$("liefArtikelMindest").value.trim();
 const m=roh?lfZahl(roh):0;
 if(m<0){ $("liefArtikelFehler").textContent="Ein Mindestbestand kann nicht negativ sein."; return }
 // v3.233: Ein LEERES Preisfeld heisst "kein Preis" und schreibt NULL - nicht
 // 0. Ein Artikel zu 0 Franken waere eine Behauptung ueber den Haendler; die
 // Einkaufsliste wuerde ihn mitsummieren und das Total waere still falsch.
 const rohP=$("liefArtikelPreis").value.trim();
 const p=rohP===""?null:Number(rohP.replace(",","."));
 if(p!==null&&(!Number.isFinite(p)||p<0)){
  $("liefArtikelFehler").textContent="Der Preis muss eine Zahl ab 0 sein – oder leer bleiben.";
  return;
 }
 $("liefArtikelSpeichern").disabled=true;
 try{
  // v3.234: Die Regie-Position geht mit demselben Schreibvorgang weg. Eine
  // leere Wahl schreibt NULL - "keine Zuordnung" ist ein gueltiger Zustand,
  // nicht ein fehlender Wert.
  const r=await sb.from("lieferanten_artikel")
   .update({mindestbestand:m,preis:p,material_id:lfArtikelRegieWahl||null}).eq("id",a.id);
  if(r.error)throw r.error;
 }catch(e){
  $("liefArtikelFehler").textContent="Nicht gespeichert: "+((e&&e.message)||e);
  $("liefArtikelSpeichern").disabled=false;
  return;
 }
 $("liefArtikelSpeichern").disabled=false;
 lfArtikelSchliessen();
 await lfLaden();
 lfZeichnen();
 if($("liefEinkaufModal")&&!$("liefEinkaufModal").hidden)lfEinkaufZeichnen();
 const teile=[];
 teile.push(m>0?"Mindestbestand "+lfZahlText(m):"nicht mehr überwacht");
 if(p!==null)teile.push("Preis CHF "+p.toFixed(2));
 const rr=lfRegieZuId(lfArtikelRegieWahl);
 if(rr)teile.push("Regie "+rr.edv_nr);
 lfMeldung("„"+a.bezeichnung+"“: "+teile.join(", ")+".");
}

// ---- Sortiment einlesen ---------------------------------------------------
// Die Liste liegt als Datei im Projekt (daten/sortiment-bteam.json) und wird
// erst beim Einlesen geholt - sie gehoert nicht in die App-Huelle, weil sie
// genau einmal gebraucht wird.
//
// Schluessel ist Lieferant + Artikelnummer: ein zweites Einlesen AKTUALISIERT
// dieselbe Position, statt sie zu verdoppeln. Geloescht wird nie - ein
// Artikel, der in der neuen Datei fehlt, bleibt stehen.
async function lfSortimentEinlesen(){
 if(typeof sb==="undefined")return;
 let daten=null;
 lfMeldung("Sortiment wird geholt …");
 try{
  const r=await fetch(LF_SORTIMENT,{cache:"no-store"});
  if(!r.ok)throw new Error("HTTP "+r.status);
  daten=await r.json();
 }catch(e){
  lfMeldung("Die Sortimentsdatei liess sich nicht laden: "+((e&&e.message)||e),true);
  return;
 }
 const liste=(daten&&Array.isArray(daten.artikel))?daten.artikel:[];
 if(!liste.length){ lfMeldung("Die Sortimentsdatei enthält keine Artikel.",true); return }
 // Der Lieferant steht in der Datei, nicht im Code: eine zweite Datei bringt
 // ihren eigenen mit, ohne dass hier etwas zu aendern waere.
 const lieferant=String((daten&&daten.lieferant)||"").trim();
 if(!lieferant){
  lfMeldung("In der Sortimentsdatei fehlt die Angabe, von welchem Lieferanten sie ist.",true);
  return;
 }
 if(typeof confirm==="function"&&!confirm(
   liste.length+" Artikel von "+lieferant+" einlesen?\n\n"
  +"Bereits vorhandene Artikelnummern dieses Lieferanten werden aktualisiert, nichts wird gelöscht.\n"
  +"Der Materialkatalog der Firma und die bestehende Lagerverwaltung bleiben unberührt."))return;

 const zeilen=liste.map(a=>({
  lieferant,
  artikelnr:String(a.artikelnr||"").trim(),
  bezeichnung:String(a.bezeichnung||"").trim(),
  gruppe:a.gruppe||null, material:a.material||null,
  zuschnitt_mm:a.zuschnitt?lfZahl(a.zuschnitt):null,
  dicke_mm:a.dicke?lfZahl(a.dicke):null,
  laenge_m:a.laenge?lfZahl(a.laenge):null,
  wulst:a.wulst||null, vpe:a.vpe?lfZahl(a.vpe):null,
  ean:(a.ean&&String(a.ean).trim())?String(a.ean).trim():null,
  hinweis:a.hinweis||null
 })).filter(z=>z.artikelnr&&z.bezeichnung);

 lfMeldung(zeilen.length+" Artikel werden gespeichert …");
 try{
  // In Haeppchen, damit eine grosse Liste nicht an einer Zeitgrenze scheitert.
  for(let i=0;i<zeilen.length;i+=100){
   const r=await sb.from("lieferanten_artikel")
    .upsert(zeilen.slice(i,i+100),{onConflict:"company_id,lieferant,artikelnr"});
   if(r.error)throw r.error;
  }
 }catch(e){
  const t=String((e&&e.message)||e);
  // Der eindeutige Barcode ist Absicht - siehe Migration. Wenn er kippt, ist
  // die Datei das Problem, und das gehoert gesagt statt geraten.
  if(/lieferanten_artikel_ean_uniq/.test(t))
   lfMeldung("Zwei Artikel in der Datei tragen denselben Barcode. Ein Barcode muss eindeutig auf einen Artikel zeigen – sonst wäre beim Scannen nicht entscheidbar, welcher gemeint ist. Nichts wurde gespeichert.",true);
  else lfMeldung("Das Einlesen ist fehlgeschlagen: "+t,true);
  return;
 }
 await lfLaden();
 lfZeichnen();
 lfMeldung(zeilen.length+" Artikel von "+lieferant+" eingelesen.");
}

// ---- Buchen ---------------------------------------------------------------
let lfBuchenArtikelId=null;

function lfBuchenOeffnen(artikelId,art){
 if(typeof $!=="function")return;
 const a=lfArtikelZuId(artikelId);
 if(!a){ lfMeldung("Dieser Artikel ist nicht mehr da.",true); return }
 lfBuchenArtikelId=a.id;
 $("liefBuchenTitel").textContent=a.bezeichnung;
 $("liefBuchenUnter").textContent=(a.lieferant?a.lieferant+" · ":"")+"Art.-Nr. "+a.artikelnr
  +(a.ean?" · "+a.ean:"")+" · Bestand "+lfZahlText(lfBestand(a.id));
 $("liefBuchenArt").value=art||"zugang";
 $("liefBuchenMenge").value=a.vpe?lfZahlText(a.vpe):"1";
 $("liefBuchenGrund").value="";
 $("liefBuchenFehler").textContent="";
 $("liefBuchenModal").hidden=false;
 setTimeout(()=>{ const f=$("liefBuchenMenge"); if(f){f.focus();f.select()} },60);
}
function lfBuchenSchliessen(){
 if(typeof $==="function"&&$("liefBuchenModal"))$("liefBuchenModal").hidden=true;
 lfBuchenArtikelId=null;
}
async function lfBuchenSpeichern(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const a=lfArtikelZuId(lfBuchenArtikelId);
 if(!a)return;
 const art=$("liefBuchenArt").value;
 const menge=lfZahl($("liefBuchenMenge").value);
 if(!menge){ $("liefBuchenFehler").textContent="Bitte eine Menge eintragen."; return }
 if(menge<0&&art!=="korrektur"){
  $("liefBuchenFehler").textContent="Eine negative Menge gibt es nur als Korrektur.";
  return;
 }
 $("liefBuchenSpeichern").disabled=true;
 try{
  const r=await sb.from("lieferanten_bewegungen").insert({
   artikel_id:a.id, art, menge:Math.abs(menge)*((art==="korrektur"&&menge<0)?-1:1),
   grund:$("liefBuchenGrund").value.trim()||null,
   created_by:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
  });
  if(r.error)throw r.error;
 }catch(e){
  $("liefBuchenFehler").textContent="Nicht gebucht: "+((e&&e.message)||e);
  $("liefBuchenSpeichern").disabled=false;
  return;
 }
 $("liefBuchenSpeichern").disabled=false;
 lfBuchenSchliessen();
 await lfLaden();
 lfZeichnen();
 lfMeldung(LF_ART_TEXT[art]+" von "+lfZahlText(menge)+" auf „"+a.bezeichnung+"“ gebucht. Bestand jetzt "+lfZahlText(lfBestand(a.id))+".");
}

// ---- Scannen --------------------------------------------------------------
// Derselbe Scanner wie in der bestehenden Lagerverwaltung (js/01). Ein
// unbekannter Code legt hier bewusst NICHTS an: dieses Lager ist das
// Sortiment der Lieferanten, kein Ort für selbst erfundene Artikel.
function lfScannenUndBuchen(art){
 if(typeof barcodeScannen!=="function")return;
 barcodeScannen(code=>{
  const a=lfArtikelZuBarcode(code);
  if(!a){
   lfMeldung("Kein Lieferantenartikel mit dem Barcode "+code+". Gehört er zum eigenen Material, ist er in der normalen Lagerverwaltung richtig.",true);
   return;
  }
  if(a.archiviert){
   lfMeldung("„"+a.bezeichnung+"“ ist archiviert und wird nicht bebucht.",true);
   return;
  }
  lfMeldung("");
  lfBuchenOeffnen(a.id,art);
 });
}

// ---- Anzeige --------------------------------------------------------------
function lfPasstZurSuche(a){
 const q=lfSuche.trim().toLowerCase();
 if(!q)return true;
 return [a.artikelnr,a.bezeichnung,a.gruppe,a.material,a.ean,a.lieferant]
  .some(x=>String(x||"").toLowerCase().indexOf(q)>=0);
}
function lfZeileHtml(a,mitLieferant){
 const bestand=lfBestand(a.id);
 const masse=[a.zuschnitt_mm?lfZahlText(a.zuschnitt_mm)+" mm":"",
              a.dicke_mm?lfZahlText(a.dicke_mm)+" mm":"",
              a.laenge_m?lfZahlText(a.laenge_m)+" m":"",
              a.wulst?a.wulst+" mm":""].filter(Boolean).join(" · ");
 // Der Lieferant steht nur da, wo es mehr als einen gibt - solange das Lager
 // eines Haendlers drinsteht, waere er in jeder Zeile dieselbe Auskunft.
 const regie=lfRegieVon(a);
 const unten=[mitLieferant&&a.lieferant?esc(a.lieferant):"",esc(a.artikelnr),
              masse?esc(masse):"",a.ean?esc(a.ean):"",
              lfHatPreis(a)?esc(lfPreisText(a)):"",
              regie?"Regie "+esc(regie.edv_nr):""].filter(Boolean).join(" · ");
 // v3.231: Ein ueberwachter Artikel zeigt seinen Mindestbestand, und wenn er
 // unterschritten ist, faellt das in der Zeile auf - nicht erst in der
 // Einkaufsliste. Der Mangel gehoert dorthin, wo man ihn sieht.
 const mindest=lfMindest(a), fehlt=lfFehlt(a);
 return `<div class="kw-zeile">
  <button type="button" class="lf-artikel" data-lf-artikel="${esc(a.id)}"
   style="flex:1;min-width:0;text-align:left;background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer">
   <b>${esc(a.bezeichnung)}</b>
   <div class="small" style="color:var(--muted)">${unten}</div>
  </button>
  <div class="small" style="text-align:right;min-width:78px">
   <b style="font-size:15px${fehlt>0?";color:var(--red)":""}">${esc(lfZahlText(bestand))}</b>
   ${mindest>0?`<div style="color:${fehlt>0?"var(--red)":"var(--muted)"}">von ${esc(lfZahlText(mindest))}</div>`
              :(a.vpe?`<div style="color:var(--muted)">VPE ${esc(lfZahlText(a.vpe))}</div>`:"")}
  </div>
  <div class="bar" style="margin:0">
   <button type="button" class="blue" data-lf-ein="${esc(a.id)}">＋</button>
   <button type="button" class="gray" data-lf-aus="${esc(a.id)}">－</button>
  </div>
 </div>`;
}
function lfZeichnen(){
 if(typeof $!=="function")return;
 const box=$("liefListe");
 if(!box)return;
 const mitLieferant=lfLieferanten().length>1;
 const treffer=lfArtikel.filter(a=>!a.archiviert&&lfPasstZurSuche(a));
 const k=$("liefKennzahlen");
 if(k){
  const mitBestand=lfArtikel.filter(a=>lfBestand(a.id)>0).length;
  const fehlt=lfUnterMindest().length;
  k.innerHTML=`<b>${lfArtikel.length}</b> Artikel · <b>${mitBestand}</b> mit Bestand · <b>${lfBewegungen.length}</b> Buchungen`
   +(fehlt?` · <b style="color:var(--red)">${fehlt}</b> unter Mindestbestand`:"");
 }
 // v3.232: Der Knopf zaehlt die ganze Einkaufsliste, nicht nur die
 // unterschrittenen Mindestbestaende - sonst fehlte von Hand Gesetztes in
 // der Zahl, und der Knopf staende auf 0, waehrend die Liste voll ist.
 //
 // Das Symbol ist bewusst kein Einkaufswagen mehr. Der Anwender hat nach dem
 // "Hineinlegen" gesucht, das es nicht gab: 🛒 verspricht Hinzufuegen. Jetzt
 // heisst 🛒 ueberall HINZUFUEGEN und 📋 ANSEHEN.
 const e=$("liefEinkaufKnopf");
 if(e){
  const n=lfEinkaufsliste().length;
  e.textContent=n?"📋 Einkaufsliste ("+n+")":"📋 Einkaufsliste";
 }
 // v3.234: Der Zuordnen-Knopf zeigt, wie viele Artikel noch OHNE
 // Regie-Position sind - das ist die Arbeit, die noch aussteht.
 const zk=$("liefZuordnenKnopf");
 if(zk){
  const offen=lfArtikel.filter(a=>!a.archiviert&&!lfRegieVon(a)).length;
  zk.textContent=offen?"🔗 Zuordnen ("+offen+" offen)":"🔗 Zuordnen";
 }
 if(!lfArtikel.length){
  box.innerHTML=`<div class="info">Noch kein Sortiment eingelesen. Der Knopf <b>Sortiment einlesen</b> holt die Artikelliste des Lieferanten.</div>`;
  return;
 }
 if(!treffer.length){
  box.innerHTML=`<div class="a2-leer">Kein Artikel passt zu „${esc(lfSuche)}“.</div>`;
  return;
 }
 // Nach Produktgruppe, zugeklappt - 439 Artikel am Stueck sind keine Liste,
 // sondern eine Wand. Wird gesucht, ist alles offen: dann will man die
 // Treffer sehen, nicht Gruppentitel.
 const offenAlle=!!lfSuche.trim();
 const gruppen={};
 treffer.forEach(a=>{ (gruppen[a.gruppe||"Ohne Gruppe"]=gruppen[a.gruppe||"Ohne Gruppe"]||[]).push(a) });
 box.innerHTML=Object.keys(gruppen).sort().map(g=>{
  const offen=offenAlle||lfOffeneGruppen.has(g);
  return `<div class="a2-abschnitt">
   <button type="button" class="a2-zeile" data-lf-gruppe="${esc(g)}">
    <span class="a2-zeile-text"><b>${esc(g)}</b><span>${gruppen[g].length} Artikel</span></span>
    <span class="a2-zeile-pfeil">${offen?"⌄":"›"}</span></button>
   ${offen?gruppen[g].map(a=>lfZeileHtml(a,mitLieferant)).join(""):""}
  </div>`;
 }).join("");
}

async function lfOeffnen(){
 if(typeof $!=="function")return;
 const modal=$("liefModal");
 if(!modal)return;
 modal.hidden=false;
 lfMeldung("");
 if(!lfGeladen){ lfMeldung("Wird geladen …"); await lfLaden(); lfMeldung("") }
 lfZeichnen();
 lfLieferantenVorschlaege();
}

// Der Lieferant, unter dem die hochgeladene Datei abgelegt wird. Eigene
// Funktion und nicht nur ein Feldzugriff in der Konfiguration: so laesst sich
// am VERHALTEN pruefen, dass ohne Angabe nichts importiert wird - statt im
// Text der Datei nachzusehen, ob dort das Richtige steht.
function lfImportLieferant(){
 const f=(typeof $==="function")?$("liefExcelLieferant"):null;
 return f?f.value.trim():"";
}
function lfExcelFestwerte(){
 const l=lfImportLieferant();
 return l?{lieferant:l}:null;
}
// Der aktuelle Stand als {artikelnr: Eintrag} - daraus entsteht in js/08 die
// Vorschau "neu / wird geaendert / unveraendert" VOR dem Speichern.
//
// Verglichen wird nur INNERHALB des gewaehlten Lieferanten. Sonst wuerde die
// Artikelnummer eines anderen Haendlers als "wird geaendert" gemeldet,
// obwohl sie einen ganz anderen Artikel meint.
function lfVergleichsstand(){
 const l=lfImportLieferant().toLowerCase();
 const m={};
 lfArtikel.filter(a=>!l||String(a.lieferant||"").trim().toLowerCase()===l)
  .forEach(a=>{ m[String(a.artikelnr||"").trim()]={
   artikelnr:String(a.artikelnr||""), bezeichnung:String(a.bezeichnung||""),
   gruppe:String(a.gruppe||""), material:String(a.material||""),
   zuschnitt_mm:lfZahl(a.zuschnitt_mm), dicke_mm:lfZahl(a.dicke_mm),
   laenge_m:lfZahl(a.laenge_m), wulst:String(a.wulst||""),
   vpe:lfZahl(a.vpe), mindestbestand:lfZahl(a.mindestbestand),
   preis:lfHatPreis(a)?lfPreis(a):"",
   ean:String(a.ean||""), hinweis:String(a.hinweis||"") }; });
 return m;
}

// Die Auswahlliste am Import wird aus den vorhandenen Lieferanten gefuellt -
// tippen muss man nur beim ersten Mal, und ein Tippfehler legt keinen
// zweiten Lieferanten an, den es gar nicht gibt.
function lfLieferantenVorschlaege(){
 if(typeof $!=="function")return;
 const dl=$("liefLieferantenListe");
 if(dl)dl.innerHTML=lfLieferanten().map(l=>`<option value="${esc(l)}"></option>`).join("");
 const feld=$("liefExcelLieferant");
 if(feld&&!feld.value.trim()){
  const l=lfLieferanten();
  if(l.length===1)feld.value=l[0];
 }
}

// ---- Klicks ---------------------------------------------------------------
if(typeof document!=="undefined")document.addEventListener("click",e=>{
 const t=e.target;
 if(!t||!t.closest)return;
 const g=t.closest("[data-lf-gruppe]");
 if(g){
  const name=g.getAttribute("data-lf-gruppe");
  if(lfOffeneGruppen.has(name))lfOffeneGruppen.delete(name); else lfOffeneGruppen.add(name);
  lfZeichnen(); return;
 }
 const ein=t.closest("[data-lf-ein]");
 if(ein){ lfBuchenOeffnen(ein.getAttribute("data-lf-ein"),"zugang"); return }
 const aus=t.closest("[data-lf-aus]");
 if(aus){ lfBuchenOeffnen(aus.getAttribute("data-lf-aus"),"abgang"); return }
 const art=t.closest("[data-lf-artikel]");
 if(art){ lfArtikelOeffnen(art.getAttribute("data-lf-artikel")); return }
 const erl=t.closest("[data-lf-erledigt]");
 if(erl){ lfEinkaufErledigt(erl.getAttribute("data-lf-erledigt")); return }
 // v3.234: eine Regie-Position im Artikel-Dialog waehlen oder entfernen.
 const reg=t.closest("[data-lf-regie]");
 if(reg){
  lfArtikelRegieWahl=reg.getAttribute("data-lf-regie")||"";
  const a=lfArtikelZuId(lfArtikelOffenId);
  if(a)lfArtikelRegieZeichnen(a);
  return;
 }
});
// Die Auswahl in der Zuordnen-Ansicht. Geschrieben wird erst beim Speichern -
// bis dahin steht die Aenderung nur hier, und der Knopf sagt, wie viele
// offen sind.
if(typeof document!=="undefined")document.addEventListener("change",e=>{
 const s=e.target;
 if(!s||!s.getAttribute)return;
 const id=s.getAttribute("data-lf-zu");
 if(id===null)return;
 lfZuordnungen[String(id)]=s.value||"";
 // NUR der Kopf wird neu gezeichnet. Die ganze Liste neu zu bauen wuerde bei
 // 439 Zeilen die Scrollposition verlieren - mitten im Durchgehen der
 // schlimmste Moment.
 lfZuordnenKopfZeichnen();
});

// ---- Neue Positionen als Excel hochladen ----------------------------------
// Ansage des Anwenders: "schaue auch direkt das ich in zukunft neue positionen
// direkt in der app per excel datei hochladen kann."
//
// Verwendet wird DERSELBE Import wie beim Materialkatalog (initExcelImport,
// js/08) - nur mit anderen Feldern und einer anderen Zieltabelle. Ein
// zweiter, eigener Import waere eine zweite Wahrheit darueber, wie eine
// Lieferantenliste gelesen wird: Spaltenzuordnung, Vorschau "neu/geaendert",
// der Grundsatz "geloescht wird nie" - das alles steht dort schon und muss
// nicht ein zweites Mal stimmen.
//
// Der Abgleich laeuft ueber Lieferant + Artikelnummer; in der Datenbank ist
// das als UNIQUE (company_id, lieferant, artikelnr) festgehalten. Der
// Lieferant steht NICHT in der Datei, sondern wird einmal oben gewaehlt: eine
// Preisliste kommt von genau einem Haendler.
if(typeof initExcelImport==="function")initExcelImport({
 inputId:"liefExcelInput", buttonId:"liefExcelBtn", previewId:"liefExcelPreview",
 headerCheckId:"liefExcelHeader", countId:"liefExcelCount", tableId:"liefExcelTable",
 confirmId:"liefExcelConfirm", cancelId:"liefExcelCancel",
 mappingId:"liefExcelMapping", fehlerId:"liefExcelFehler", aufbauId:"liefExcelAufbau",
 tableName:"lieferanten_artikel",
 schluessel:"artikelnr",
 onConflict:"company_id,lieferant,artikelnr",
 festwerte:()=>lfExcelFestwerte(),
 festwerteFehler:"Bitte oben eintragen, von welchem Lieferanten die Datei ist.\n\n"
  +"Artikelnummern sind nur je Lieferant eindeutig – ohne diese Angabe wäre "
  +"nicht entscheidbar, wessen Artikel gemeint sind.",
 bestand:()=>lfVergleichsstand(),
 // "alias" sind die Schreibweisen, die in echten Lieferantenlisten
 // vorkommen - damit trifft die automatische Zuordnung ohne Raten. Die
 // Ueberschriften der gelieferten Datei stehen bewusst mit drin.
 felder:[
  {key:"artikelnr",label:"Artikel-Nr.",pflicht:true,
   alias:["artikelnrbteam","artikelnr","artikelnummer","nr","nummer","code","artikel","lieferantennr"]},
  {key:"bezeichnung",label:"Bezeichnung",pflicht:true,
   alias:["artikelbezeichnung","beschreibung","text","benennung","material"]},
  {key:"gruppe",label:"Produktgruppe",alias:["gruppe","warengruppe","kategorie","sortiment"]},
  {key:"material",label:"Werkstoff",alias:["material","werkstoff","ausfuehrung","qualitaet"]},
  {key:"zuschnitt_mm",label:"Zuschnitt (mm)",zahl:true,alias:["zuschnitt","zuschnittmm","breite","abwicklung"]},
  {key:"dicke_mm",label:"Dicke (mm)",zahl:true,alias:["dicke","dickemm","staerke","blechdicke"]},
  {key:"laenge_m",label:"Länge (m)",zahl:true,alias:["laenge","laengem","stangenlaenge"]},
  {key:"wulst",label:"Wulst (mm)",alias:["wulst","wulstmm","groesse","rinnengroesse"]},
  {key:"vpe",label:"VPE",zahl:true,alias:["vpe","verpackungseinheit","gebinde","einheit"]},
  {key:"mindestbestand",label:"Mindestbestand",zahl:true,
   alias:["mindestbestand","mindest","minbestand","meldebestand","sollbestand"]},
  // v3.233: Die Spalte steht bereit, bevor es die Preisliste gibt. Kommt sie,
  // ist sie ein gewoehnlicher Upload - kein Umbau, kein Warten.
  {key:"preis",label:"Preis (CHF)",zahl:true,
   alias:["preis","preischf","chf","einzelpreis","listenpreis","nettopreis",
          "ekpreis","ek","vkpreis","bruttopreis","stueckpreis"]},
  {key:"ean",label:"EAN / Barcode",alias:["ean","eanbarcode","barcode","gtin","strichcode"]},
  {key:"hinweis",label:"Hinweis",alias:["hinweis","bemerkung","notiz"]}
 ],
 nachImport:async()=>{ await lfLaden(); lfZeichnen(); lfLieferantenVorschlaege() }
});

if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",()=>{
 if(typeof $!=="function")return;
 const an=(id,fn)=>{ const el=$(id); if(el)el.onclick=fn };
 an("liefEinscannen",()=>lfScannenUndBuchen("zugang"));
 an("liefAusscannen",()=>lfScannenUndBuchen("abgang"));
 an("liefEinlesen",()=>lfSortimentEinlesen());
 an("liefSchliessen",()=>{ $("liefModal").hidden=true });
 an("liefBuchenAbbrechen",()=>lfBuchenSchliessen());
 an("liefBuchenSpeichern",()=>lfBuchenSpeichern());
 an("liefEinkaufKnopf",()=>lfEinkaufOeffnen());
 an("liefEinkaufKopieren",()=>lfEinkaufKopieren());
 an("liefEinkaufSchliessen",()=>{ $("liefEinkaufModal").hidden=true });
 an("liefArtikelAbbrechen",()=>lfArtikelSchliessen());
 an("liefArtikelSpeichern",()=>lfMindestSpeichern());
 an("liefArtikelWunschSetzen",()=>lfAufEinkaufsliste());
 an("liefZuordnenKnopf",()=>lfZuordnenOeffnen());
 an("liefZuordnenSichere",()=>lfZuordnenSichereUebernehmen());
 an("liefZuordnenSpeichern",()=>lfZuordnenSpeichern());
 an("liefZuordnenSchliessen",()=>{ $("liefZuordnenModal").hidden=true });
 an("liefZuordnenAlle",()=>lfZuordnenAlleSetzen());
 an("liefBewKnopf",()=>lfBewegungenOeffnen());
 an("liefBewSchliessen",()=>{ $("liefBewModal").hidden=true });
 const ba=$("liefBewArt");
 if(ba)ba.onchange=()=>{ lfBewArt=ba.value; lfBewegungenZeichnen() };
 const bs=$("liefBewSuche");
 if(bs)bs.oninput=()=>{ lfBewSuche=bs.value; lfBewegungenZeichnen() };
 const nz=$("liefZuordnenNurOffene");
 if(nz)nz.onchange=()=>{ lfZuordnenNurOffene=nz.checked; lfZuordnenZeichnen() };
 const gz=$("liefZuordnenGruppe");
 if(gz)gz.onchange=()=>{ lfZuordnenGruppe=gz.value; lfZuordnenZeichnen() };
 const sz=$("liefZuordnenSuche");
 if(sz)sz.oninput=()=>{ lfZuordnenSuche=sz.value; lfZuordnenZeichnen() };
 const s=$("liefSuche");
 if(s)s.oninput=()=>{ lfSuche=s.value; lfZeichnen() };
});
