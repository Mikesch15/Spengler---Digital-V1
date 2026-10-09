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
// Die damalige Lagerverwaltung (js/68, in v3.251 abgeschafft) sass auf
// materials - dem Katalog der
// FIRMA, mit ihren eigenen EDV-Nummern. Derselbe Katalog fuellt die
// Regiematerial-Liste, das Ausmass und den Zuschnitt. Ein Lieferantensortiment
// mit 439 FREMDEN Artikelnummern dort hineinzukippen wuerde zwei Nummernkreise
// vermischen und genau die beiden Listen veraendern, die unberuehrt bleiben
// sollen.
//
// Deshalb: eigene Tabellen (lieferanten_artikel, lieferanten_bewegungen),
// eigene Datei, eigener Dialog. An js/59, am Regierapport und an materials
// aendert diese Datei NICHTS - sie liest von dort auch nichts.
//
// v3.251: Die alte Lagerverwaltung ist abgeschafft (Ansage des Anwenders:
// "die altr lagerverwaltung wird abgeschafft"). Das aendert an der Trennung
// oben nichts - sie war der Grund, weshalb diese Datei die Abschaffung
// unbeschadet ueberlebt. Zugekommen sind zwei Dinge, die sonst mitgegangen
// waeren: das Recht "Lager" (checkLagerZugriff, weiter unten) und der
// Startweg vom Lager-Knopf der Ansicht.
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

// ---- Das Recht "Lager" (v3.251 hierher umgezogen) ------------------------
//
// Diese Funktion stand bis v3.250 in js/68-lagerverwaltung.js. Mit deren
// Abschaffung ist das Lieferanten-Lager der EINE Ort, den das Recht "Lager"
// noch freischaltet - deshalb steht die Pruefung jetzt hier, bei dem Modul,
// das sie betrifft. Gerufen wird sie unveraendert aus afterLogin()
// (js/03-login.js) und nach einer Rechteaenderung (js/05a-rechte.js); die
// Namen sind deshalb dieselben geblieben.
//
// navLagerverwaltung ist ein unsichtbarer Knopf in index.html, dessen
// hidden-Zustand das Recht in die Ansicht 2 traegt (a2KnopfSichtbar() in
// js/70). Eine zweite Rechtepruefung dort waere eine zweite Wahrheit -
// deshalb bleibt es bei diesem einen Schalter, auch wenn sein Name noch an
// die alte Lagerverwaltung erinnert.
let lagerverwaltungZugriff=false;
async function checkLagerZugriff(){
 lagerverwaltungZugriff=false;
 if(currentProfile){
  try{
   const {data,error}=await sb.from("feature_access").select("granted")
    .eq("profile_id",currentProfile.id).eq("feature","lager").maybeSingle();
   lagerverwaltungZugriff=!error&&!!data&&!!data.granted;
  }catch(e){lagerverwaltungZugriff=false;}
 }
 if($("navLagerverwaltung"))$("navLagerverwaltung").hidden=!lagerverwaltungZugriff;
}
// v3.251: Der Weg von der Startseite fuehrt jetzt ins Lieferanten-Lager -
// bis v3.250 fuehrte derselbe Knopf in die Einstellungen zur alten
// Lagerverwaltung (openSettingsTo("lager","lagerverwaltung")). Es gibt nur
// noch ein Lager, also nur noch ein Ziel.
if(typeof $==="function"&&$("navLagerverwaltung"))
 $("navLagerverwaltung").onclick=()=>lfOeffnen();

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

// ---- Der Lieferanten-Filter (v3.241) --------------------------------------
//
// Ansage des Anwenders: "weitere produkte werden folgen."
//
// Das Datenmodell ist seit v3.231 mehrlieferantenfaehig, die BEDIENUNG war es
// nicht: Artikelliste, Zuordnen und Inventur mischten alle Lieferanten in
// dieselben Produktgruppen. Mit einer zweiten Liste heisst das, dass unter
// "Dachrinnen" die Ware zweier Haendler untereinander steht und
// "alle angezeigten setzen" quer darueber greift.
//
// EIN Filter fuer alle drei Ansichten, nicht drei. "An welchem Lieferanten
// arbeite ich gerade" ist eine Frage, nicht drei - und drei Schalter, die
// dasselbe meinen, laufen auseinander.
let lfLieferant="";     // "" = alle

function lfLieferantPasst(a){
 if(!lfLieferant)return true;
 return String(a&&a.lieferant||"").trim()===lfLieferant;
}
// Kennzahlen je Lieferant - abgeleitet aus den Artikeln, nicht gefuehrt.
function lfLieferantenStand(){
 const m={};
 lfArtikel.filter(a=>!a.archiviert).forEach(a=>{
  const l=String(a.lieferant||"").trim()||"Ohne Lieferant";
  if(!m[l])m[l]={name:l,artikel:0,zugeordnet:0,mitPreis:0,mitBestand:0,unterMindest:0};
  const s=m[l];
  s.artikel++;
  if(lfRegieVon(a))s.zugeordnet++;
  if(lfHatPreis(a))s.mitPreis++;
  if(lfBestand(a.id)!==0)s.mitBestand++;
  if(lfFehlt(a)>0)s.unterMindest++;
 });
 return Object.keys(m).sort((x,y)=>x.localeCompare(y,"de")).map(k=>m[k]);
}
// Ein Auswahlfeld, gefuellt aus den vorhandenen Lieferanten. Bei nur EINEM
// Lieferanten bleibt es weg - ein Filter mit einer Wahl ist kein Filter,
// sondern Rauschen.
function lfLieferantWahlZeichnen(selId,boxId){
 if(typeof $!=="function")return;
 const sel=$(selId), box=boxId?$(boxId):null;
 if(!sel)return;
 const liste=lfLieferantenStand();
 const mehrere=liste.length>1;
 if(box)box.hidden=!mehrere;
 if(!mehrere){ lfLieferant=""; return }
 sel.innerHTML=`<option value=""${lfLieferant===""?" selected":""}>Alle Lieferanten (${
  liste.reduce((s,x)=>s+x.artikel,0)} Artikel)</option>`
  +liste.map(x=>`<option value="${esc(x.name)}"${lfLieferant===x.name?" selected":""}>${
   esc(x.name)} – ${x.artikel} Artikel</option>`).join("");
}
function lfLieferantenUebersichtZeichnen(){
 if(typeof $!=="function")return;
 const box=$("liefLieferantenUebersicht");
 if(!box)return;
 const liste=lfLieferantenStand();
 if(liste.length<2){ box.innerHTML=""; box.hidden=true; return }
 box.hidden=false;
 box.innerHTML=liste.map(x=>`<div class="small" style="color:var(--muted)">
  <b>${esc(x.name)}</b> · ${x.artikel} Artikel · ${x.zugeordnet} zugeordnet · ${
  x.mitPreis} mit Preis · ${x.mitBestand} mit Bestand${
  x.unterMindest?` · <b style="color:var(--red)">${x.unterMindest}</b> unter Mindestbestand`:""}
 </div>`).join("");
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

// ---- "Dafuer gibt es bei uns keine Position" (v3.249) ---------------------
//
// Ansage des Anwenders (02.10.2026): "Punkt 1 wird so bleiben, wir haben
// keine Positionen fuer die fehlenden Artikel."
//
// Das kann die App NICHT selbst erkennen. Ob es fuer eine 400er Rinne eine
// Abrechnungsposition geben soll, ist eine betriebliche Entscheidung. Ohne
// einen Platz dafuer meldete der Zuordnen-Knopf dauerhaft "158 offen" - und
// ein Zaehler, der Arbeit anzeigt, die keine ist, verdeckt die echte, sobald
// eine neue Lieferantenliste kommt.
//
// Entschieden heisst NICHT erledigt: der Artikel bleibt im Lager voll
// brauchbar. Bestand, Mindestbestand, Einkaufsliste und Inventur brauchen
// keine Regie-Position - nur das Verrechnen im Regierapport braucht sie.
// Deshalb ist das kein "archiviert".
function lfKeinePosition(a){ return !!(a&&a.keine_regie_position) }
// Noch zu entscheiden: weder zugeordnet noch bewusst ohne Position.
function lfOffeneZuordnung(a){
 return !!a&&!a.archiviert&&!lfRegieVon(a)&&!lfKeinePosition(a);
}
function lfEntschiedenOhne(){
 return lfArtikel.filter(a=>!a.archiviert&&lfKeinePosition(a)).length;
}

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

// ---- Groesse: Widerspruch statt Beinahe-Treffer (v3.243) ------------------
//
// Gemessen am 01.10.2026 an den 439 Artikeln von B-Team:
//   Groesse 400 -> 63 Artikel, davon 0 zugeordnet
//   Groesse 200 -> 46 Artikel, davon 0 zugeordnet
// Die Regie-Liste fuehrt die Rinnenpositionen nur in 250 und 330. 115 der
// 158 offenen Artikel sind deshalb NICHT zuordenbar - es gibt die Position
// gar nicht. Dazu kommen Formen, die in der Regie-Liste fehlen: Rinnenhaken
// eckig, Rinnenkugelboeden, Schraegstutzen.
//
// Gefaehrlich war daran nicht das Offenbleiben, sondern das Gegenteil: die
// App bot fuer eine 400er-Rinne die 250er-Position an - mit "wie 44x in
// dieser Gruppe" davor, und "sichere uebernehmen" haette sie gesetzt. Eine
// 400er-Rinne mit dem Preis der 250er im Regierapport ist ein falscher
// Betrag auf einer Rechnung, und niemand haette es gesehen.
//
// Deshalb: eine Groesse, die der Regie-Position widerspricht, ist kein
// schwacher Treffer, sondern ein Ausschluss. Automatisch gesetzt wird sie
// nie. Von Hand bleibt sie moeglich - es gibt Faelle, die nur der Spengler
// kennt - aber sie steht dann benannt da.
// Gemessen und korrigiert am 01.10.2026: zuschnitt_mm allein als "die
// Groesse" zu lesen war falsch. Bei "Rinnenstutzen 100 mm 20.160.330.100"
// steht dort 100 - der ABLAUFdurchmesser -, waehrend die Rinnengroesse 330
// in der Artikelnummer sitzt; bei "Rinnenstutzen 50 mm 20.160.200.050"
// steht in demselben Feld 200, also die Rinnengroesse. Das Feld hat je
// Gruppe eine andere Bedeutung.
//
// Eine Regel, die nur zuschnitt_mm vergleicht, haette 12 bereits von Hand
// gemachte, RICHTIGE Zuordnungen rot markiert und blockiert. Verglichen
// werden deshalb ALLE Zahlen des Artikels - und zwar mit rmatZahlen() aus
// js/57, derselben Funktion, mit der die Vorschlagsbewertung die Dimension
// schon immer prueft. Keine zweite Rechnung fuer dieselbe Frage.
//
// Zusatz, gemessen im Pruefstand (X17): rmatZahlen() liest "20.160.330.100"
// als Dezimalzahlen - 20.16 und 330.1 - und die 330 kommt darin nie vor.
// Bei B-Team traegt aber genau diese punktierte Nummer die Rinnengroesse.
// Deshalb kommen auf der ARTIKELseite zusaetzlich die reinen Ziffergruppen
// dazu (20, 160, 330, 100). Das ist keine zweite Regel fuer dieselbe Frage:
// die Pruefung bleibt dieselbe, nur der Artikel wird vollstaendig gelesen.
// Und es kann den Riegel nur LOCKERN, nie zusaetzlich zuschlagen - eine
// breitere Zahlenmenge findet mehr Treffer, nicht weniger.
function lfArtikelZahlen(a){
 if(!a)return [];
 const t=[a.bezeichnung,a.artikelnr,a.zuschnitt_mm,a.laenge_m].filter(x=>x!==null&&x!==undefined).join(" ");
 const raus=(typeof rmatZahlen==="function")?rmatZahlen(t).slice():[];
 (String(t).match(/\d+/g)||[]).forEach(x=>{
  const z=Number(x);
  if(Number.isFinite(z)&&raus.indexOf(z)<0)raus.push(z);
 });
 return raus;
}
// Die Groesse fuer die ANZEIGE ("die Regie-Liste hat die Grösse 400 nicht").
// zuschnitt_mm ist dafuer die beste Angabe, die es gibt - sie steht in 426
// von 439 Faellen da. Fuer die ENTSCHEIDUNG zaehlt sie nicht allein.
function lfGroesse(a){
 if(!a)return 0;
 const z=Number(a.zuschnitt_mm);
 if(z>0)return z;
 const t=String(a.bezeichnung||"").match(/(^|[^\d.,])(\d{3})([^\d.,]|$)/);
 return t?Number(t[2]):0;
}
// Entschieden wird nur bei einer EINDEUTIGEN Dimension: eine blanke Zahl
// oder eine Liste blanker Zahlen ("250", "40 / 60"). Alles andere sagt ueber
// die Groesse nichts Entscheidbares und bleibt offen.
//
// Gemessen an den echten Daten (01.10.2026): "Rinnenseiher, alle
// Materialien" traegt dim "bis 120". Das ist eine OBERGRENZE - 60, 75 und
// 100 mm passen alle. Eine Regel, die daraus "120 oder Widerspruch" macht,
// haette 9 richtige Zuordnungen rot markiert. Dasselbe gilt fuer "B 122"
// (eine Breite) und "bis 150".
function lfRegieDimZahlen(r){
 const roh=String((r&&r.dim)||"").trim();
 if(!roh)return [];
 // Erlaubt sind nur Zahlen und Trennzeichen. Ein Buchstabe ("bis", "B",
 // "re", "CrNiS") macht die Angabe uneindeutig.
 // Ein Bindestrich waere ein Bereich ("250-330") - der ist ebenfalls nicht
 // als Aufzaehlung zu lesen und bleibt deshalb aussen.
 if(!/^[\d\s.,/x×]+$/.test(roh))return [];
 const t=roh.match(/\d+(?:[.,]\d+)?/g)||[];
 return t.map(x=>Number(String(x).replace(",",".")));
}
// Eine Position OHNE Zahl in der Dimension sagt ueber die Groesse nichts
// aus ("alle Materialien") - die ist kein Widerspruch, sondern offen.
// Ebenso ein Artikel, in dem gar keine Zahl steht.
function lfGroessePasst(r,a){
 const z=lfRegieDimZahlen(r);
 if(!z.length)return true;
 const zahlen=lfArtikelZahlen(a);
 if(!zahlen.length)return true;
 return z.some(x=>zahlen.some(y=>Math.abs(x-y)<1e-9));
}
function lfGroesseWiderspricht(a,r){
 return !lfGroessePasst(r,a);
}
// Welche Groessen fuehrt die Regie-Liste fuer die Positionen, die zu diesem
// Artikel ueberhaupt in Frage kommen? Das ist die Auskunft, die er braucht:
// nicht "kein Vorschlag", sondern "die Liste hat 250 und 330, nicht 400".
function lfRegieGroessenFuer(a){
 const raus=[];
 lfRegieVorschlaege(a).forEach(v=>{
  const r=lfRegieZuNummer(v.no);
  if(!r)return;
  lfRegieDimZahlen(r).forEach(z=>{ if(raus.indexOf(z)<0)raus.push(z) });
 });
 return raus.sort((x,y)=>x-y);
}
// Ein Befund je Artikel, und zwar genau einer - sonst steht an zwei Stellen
// eine eigene Rechnung.
//   "ok"            es gibt einen Kandidaten, der die Groesse traegt
//   "groesse-fehlt" es gibt Kandidaten, aber alle mit anderer Groesse
//   "nichts"        es gibt gar keinen Kandidaten
function lfGroessenBefund(a){
 const vor=lfRegieVorschlaege(a);
 const g=lfGroesse(a);
 if(!vor.length)return {art:"nichts",groesse:g,vorhanden:[]};
 const passend=vor.filter(v=>{
  const r=lfRegieZuNummer(v.no);
  return r&&lfGroessePasst(r,a);
 });
 if(passend.length)return {art:"ok",groesse:g,vorhanden:lfRegieGroessenFuer(a)};
 return {art:"groesse-fehlt",groesse:g,vorhanden:lfRegieGroessenFuer(a)};
}
function lfGroessenBefundText(b){
 if(!b)return "";
 if(b.art==="nichts")return "keine Regie-Position gefunden";
 if(b.art!=="groesse-fehlt")return "";
 return "die Regie-Liste hat die Grösse "+lfZahlText(b.groesse)+" nicht"
  +(b.vorhanden.length?" (vorhanden: "+b.vorhanden.map(lfZahlText).join(", ")+")":"");
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
// v3.251: Gesucht wird nur noch HIER. Bis v3.250 fragte diese Funktion
// danach auch die alte Lagerverwaltung (lager_varianten.barcode, ueber
// lagerVarianteZuBarcode aus js/68) - die ist abgeschafft. Betroffen war
// genau EIN Barcode; gemessen, nicht geschaetzt.
function lfBarcodeZuRegie(code){
 const c=String(code||"").trim();
 if(!c)return {ok:false,grund:"leer",text:"Es wurde kein Code gelesen."};

 const a=lfArtikelZuBarcode(c);
 if(a){
  if(a.archiviert)
   return {ok:false,grund:"archiviert",artikel:a,
    text:"„"+a.bezeichnung+"“ ist archiviert und wird nicht mehr verrechnet."};
  const r=lfRegieVon(a);
  // v3.249: Zwei verschiedene Lagen, und sie zu verwechseln ist der Fehler.
  // "Noch nicht zugeordnet" heisst: trag es nach. "Dafuer gibt es keine
  // Position" heisst: es gibt nichts nachzutragen - der Rat ins Leere waere
  // schlimmer als keiner.
  if(!r&&lfKeinePosition(a))
   return {ok:false,grund:"keine-position",artikel:a,
    text:"„"+a.bezeichnung+"“ ist im Lager, hat aber bei euch keine "
        +"Regie-Position – so entschieden. Er lässt sich deshalb nicht in den "
        +"Regierapport übernehmen. Material von Hand erfassen, oder die "
        +"Entscheidung im Lager unter 🔗 Zuordnen zurücknehmen."};
  if(!r)return {ok:false,grund:"ohne-zuordnung",artikel:a,
   text:"„"+a.bezeichnung+"“ ist bekannt, hat aber noch keine Regie-Position. "
       +"Im Lieferanten-Lager unter 🔗 Zuordnen nachtragen – danach geht das Scannen."};
  return {ok:true,quelle:"lieferant",artikel:a,regie:r,
   text:a.bezeichnung+" → "+r.edv_nr+" · "+r.name};
 }

 return {ok:false,grund:"unbekannt",
  text:"Der Code "+c+" ist im Lager nicht bekannt."};
}

// ---- Inventur: Bestand und Mindestbestand gruppenweise (v3.240) -----------
//
// BEFUND VOR DEM BAUEN: 0 von 439 Artikeln hatten einen Mindestbestand, 2
// eine Buchung. Die Einkaufsliste aus v3.231 lief leer - nicht weil sie
// fehlt, sondern weil 439 Artikel einzeln zu erfassen eine Wand ist.
// Derselbe Engpass, den der Anwender beim Zuordnen benannt hat.
//
// Diese Ansicht folgt dem PHYSISCHEN Weg durch das Lager: man geht mit dem
// Handy am Regal entlang, zaehlt, und sagt dabei gleich, wie viel immer da
// sein soll. Deshalb stehen beide Felder in einer Zeile.
//
// DAS GEZAEHLTE WIRD ALS KORREKTUR GEBUCHT, nicht als Zugang. Ein Zugang
// behauptet, Ware sei angekommen; eine Korrektur sagt "der Bestand ist in
// Wirklichkeit dieser". Genau dafuer ist die Korrektur in diesem Lager
// vorgesehen, und die Bewegungsliste bleibt dadurch wahr.
let lfInvGruppe="";
let lfInvSuche="";
let lfInvGezaehlt={};    // {artikelId: Text} - noch nicht gebucht
let lfInvMindest={};     // {artikelId: Text} - noch nicht gespeichert

function lfInvKandidaten(){
 const t=(x,y)=>String(x||"").localeCompare(String(y||""),"de");
 const q=lfInvSuche.trim().toLowerCase();
 return lfArtikel.filter(a=>{
  if(a.archiviert)return false;
  if(!lfPasstZumFilter(a))return false;
  if(lfInvGruppe&&String(a.gruppe||"Ohne Gruppe")!==lfInvGruppe)return false;
  if(q&&![a.bezeichnung,a.artikelnr,a.ean,a.material].some(x=>String(x||"").toLowerCase().indexOf(q)>=0))return false;
  return true;
 }).sort((x,y)=>t(x.gruppe,y.gruppe)||t(x.bezeichnung,y.bezeichnung));
}
// Was eine Zeile zu tun gibt. Leer heisst NICHT null - es heisst
// "nicht gezaehlt", und ein nicht gezaehlter Artikel wird nicht angefasst.
// Das ist der Unterschied, der eine Inventur benutzbar macht: man kann ein
// Regal zaehlen und den Rest in Ruhe lassen.
function lfInvZeile(a){
 const sId=String(a.id);
 const rohZ=Object.prototype.hasOwnProperty.call(lfInvGezaehlt,sId)?String(lfInvGezaehlt[sId]):"";
 const rohM=Object.prototype.hasOwnProperty.call(lfInvMindest,sId)?String(lfInvMindest[sId]):"";
 const ist=lfBestand(a.id);
 const gezaehlt=rohZ.trim()===""?null:lfZahl(rohZ);
 const diff=gezaehlt===null?0:gezaehlt-ist;
 const mindestNeu=rohM.trim()===""?null:lfZahl(rohM);
 const mindestAlt=lfMindest(a);
 return {ist,gezaehlt,diff,mindestNeu,mindestAlt,
         mindestGeaendert:mindestNeu!==null&&mindestNeu!==mindestAlt};
}
function lfInvOffen(){
 let korrekturen=0, minima=0;
 lfArtikel.forEach(a=>{
  const z=lfInvZeile(a);
  if(z.gezaehlt!==null&&z.diff!==0)korrekturen++;
  if(z.mindestGeaendert)minima++;
 });
 return {korrekturen,minima,summe:korrekturen+minima};
}
function lfInvKopfZeichnen(){
 if(typeof $!=="function")return;
 const o=lfInvOffen();
 const k=$("liefInvKennzahlen");
 if(k){
  const gesamt=lfArtikel.filter(a=>!a.archiviert).length;
  const mitMindest=lfArtikel.filter(a=>lfMindest(a)>0).length;
  const mitBestand=lfArtikel.filter(a=>lfBestand(a.id)!==0).length;
  k.innerHTML=`<b>${mitBestand}</b> von <b>${gesamt}</b> Artikeln haben einen Bestand · `
   +`<b>${mitMindest}</b> einen Mindestbestand`
   +(o.summe?` · <b style="color:var(--red)">${o.summe}</b> Änderung(en) offen`:"");
 }
 const s=$("liefInvSpeichern");
 if(s){
  s.disabled=!o.summe;
  s.textContent=o.summe
   ? "💾 "+o.korrekturen+" Korrektur(en), "+o.minima+" Mindestbestand/-bestände speichern"
   : "💾 Speichern";
 }
}
function lfInvGruppenZeichnen(){
 if(typeof $!=="function")return;
 const sel=$("liefInvGruppe");
 if(!sel)return;
 const m={};
 // v3.241: nur die Gruppen des gewaehlten Lieferanten.
 lfArtikel.filter(a=>!a.archiviert&&lfPasstZumFilter(a)).forEach(a=>{
  const g=String(a.gruppe||"Ohne Gruppe");
  if(!m[g])m[g]={name:g,gesamt:0,gezaehlt:0};
  m[g].gesamt++;
  if(lfBestand(a.id)!==0)m[g].gezaehlt++;
 });
 const gr=Object.keys(m).sort((x,y)=>x.localeCompare(y,"de")).map(k=>m[k]);
 sel.innerHTML=`<option value=""${lfInvGruppe===""?" selected":""}>Alle Gruppen</option>`
  +gr.map(g=>`<option value="${esc(g.name)}"${lfInvGruppe===g.name?" selected":""}>${
   esc(g.name)} – ${g.gezaehlt} von ${g.gesamt} mit Bestand</option>`).join("");
}
function lfInvZeichnen(){
 if(typeof $!=="function")return;
 const box=$("liefInvListe");
 if(!box)return;
 lfInvKopfZeichnen();
 lfLieferantWahlZeichnen("liefInvLieferant","liefInvLieferantBox");
 lfInvGruppenZeichnen();
 const liste=lfInvKandidaten();
 if(!liste.length){
  box.innerHTML=`<div class="a2-leer">Kein Artikel passt zu dieser Auswahl.</div>`;
  return;
 }
 let letzte=null, html="";
 liste.forEach(a=>{
  const g=String(a.gruppe||"Ohne Gruppe");
  if(g!==letzte&&!lfInvGruppe){
   html+=`<div style="margin:14px 0 4px;font-weight:700;color:var(--muted);
    font-size:13px;letter-spacing:.02em">${esc(g)}</div>`;
   letzte=g;
  }
  const z=lfInvZeile(a);
  const diffText=z.gezaehlt===null?""
   :(z.diff===0?"stimmt"
     :(z.diff>0?"+"+lfZahlText(z.diff):lfZahlText(z.diff))+" als Korrektur");
  html+=`<div class="kw-zeile" style="align-items:flex-start">
   <div style="flex:1;min-width:0">
    <b>${esc(a.bezeichnung)}</b>
    <div class="small" style="color:var(--muted)">${esc(a.artikelnr)}${
     a.vpe?" · VPE "+esc(lfZahlText(a.vpe)):""} · Bestand jetzt <b>${esc(lfZahlText(z.ist))}</b>${
     diffText?' · <span style="color:'+(z.diff===0?"var(--muted)":"var(--red)")+'">'+esc(diffText)+"</span>":""}</div>
    <div class="grid" style="margin-top:4px">
     <div><label class="small">gezählt</label>
      <input data-lf-inv-z="${esc(a.id)}" type="number" step="any" inputmode="decimal"
       value="${esc(z.gezaehlt===null?"":lfZahlText(z.gezaehlt))}" placeholder="leer = nicht gezählt"></div>
     <div><label class="small">Mindestbestand</label>
      <input data-lf-inv-m="${esc(a.id)}" type="number" step="any" min="0" inputmode="decimal"
       value="${esc(z.mindestNeu!==null?lfZahlText(z.mindestNeu):(z.mindestAlt?lfZahlText(z.mindestAlt):""))}"
       placeholder="leer = nicht überwachen"></div>
    </div>
   </div>
  </div>`;
 });
 box.innerHTML=html;
}
// Alle ANGEZEIGTEN auf einen Mindestbestand setzen - derselbe Grundsatz wie
// beim Zuordnen: was du siehst, wird gesetzt.
async function lfInvMindestAlle(){
 if(typeof $!=="function")return;
 const feld=$("liefInvMindestAlle"), h=$("liefInvMeldung");
 const roh=feld?feld.value.trim():"";
 const liste=lfInvKandidaten();
 if(!liste.length){ if(h){h.style.color="var(--muted)";h.textContent="Es wird gerade nichts angezeigt."} return }
 if(roh===""){
  if(h){ h.style.color="var(--red)";
   h.textContent="Bitte einen Mindestbestand eintragen – 0 heisst „nicht überwachen“." }
  return;
 }
 const m=lfZahl(roh);
 if(m<0){ if(h){h.style.color="var(--red)";h.textContent="Ein Mindestbestand kann nicht negativ sein."} return }
 if(typeof confirm==="function"&&!await appConfirm(
   "Allen "+liste.length+" angezeigten Artikeln den Mindestbestand "+lfZahlText(m)+" geben?\n\n"
  +"Gespeichert wird erst mit „Speichern“."))return;
 liste.forEach(a=>{ lfInvMindest[String(a.id)]=lfZahlText(m) });
 lfInvZeichnen();
 if(h){ h.style.color="var(--muted)";
  h.textContent=liste.length+" Artikel auf Mindestbestand "+lfZahlText(m)+" gesetzt – noch nicht gespeichert." }
}
async function lfInvSpeichern(){
 if(typeof $!=="function"||typeof sb==="undefined")return;
 const h=$("liefInvMeldung");
 const korrekturen=[], minima=[];
 lfArtikel.forEach(a=>{
  const z=lfInvZeile(a);
  if(z.gezaehlt!==null&&z.diff!==0)korrekturen.push({
   artikel_id:a.id, art:"korrektur", menge:z.diff,
   grund:"Inventur", ziel:"inventur",
   created_by:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
  });
  if(z.mindestGeaendert)minima.push({id:Number(a.id),mindestbestand:z.mindestNeu});
 });
 if(!korrekturen.length&&!minima.length){
  if(h){ h.style.color="var(--muted)"; h.textContent="Es gibt nichts zu speichern." }
  return;
 }
 $("liefInvSpeichern").disabled=true;
 if(h){ h.style.color="var(--muted)"; h.textContent="Wird gespeichert …" }
 // Reihenfolge mit Absicht: erst die BUCHUNGEN. Scheitern sie, bleiben die
 // Mindestbestaende unveraendert - und nicht umgekehrt, denn ein
 // Mindestbestand ohne den gezaehlten Bestand meldet sofort falschen Mangel.
 try{
  if(korrekturen.length){
   const r=await sb.from("lieferanten_bewegungen").insert(korrekturen);
   if(r.error)throw r.error;
  }
 }catch(e){
  if(h){ h.style.color="var(--red)"; h.textContent="Die Korrekturen wurden NICHT gebucht: "+((e&&e.message)||e) }
  $("liefInvSpeichern").disabled=false;
  return;
 }
 let minFehler="";
 try{
  if(minima.length){
   const r=await sb.rpc("lieferanten_mindestbestand_setzen",{paare:minima});
   if(r.error)throw r.error;
  }
 }catch(e){
  minFehler=" Die Mindestbestände wurden NICHT gespeichert: "+((e&&e.message)||e);
 }
 lfInvGezaehlt={}; lfInvMindest={};
 $("liefInvSpeichern").disabled=false;
 await lfLaden();
 lfZeichnen();
 lfInvZeichnen();
 if($("liefEinkaufModal")&&!$("liefEinkaufModal").hidden)lfEinkaufZeichnen();
 if(h){
  h.style.color=minFehler?"var(--red)":"var(--muted)";
  h.textContent=korrekturen.length+" Korrektur(en) gebucht, "
   +(minFehler?"0":minima.length)+" Mindestbestand/-bestände gespeichert."+minFehler;
 }
}
async function lfInvOeffnen(){
 if(typeof $!=="function")return;
 const m=$("liefInvModal");
 if(!m)return;
 lfInvGezaehlt={}; lfInvMindest={};
 lfInvSuche="";
 const sf=$("liefInvSuche"); if(sf)sf.value="";
 const mf=$("liefInvMindestAlle"); if(mf)mf.value="";
 const h=$("liefInvMeldung"); if(h)h.textContent="";
 m.hidden=false;
 if(!lfGeladen)await lfLaden();
 lfInvZeichnen();
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
 // v3.251: Hier stand ein Zweig fuer t.quelle!=="lieferant" - fuer einen
 // Treffer in der alten Lagerverwaltung, in die dieses Modul bewusst nie
 // gebucht hat. Die ist abgeschafft, lfBarcodeZuRegie() liefert nur noch
 // Treffer aus dem Lieferanten-Lager. Ein Zweig, der nicht mehr erreicht
 // werden kann, ist keine Vorsicht, sondern eine Aussage ueber einen
 // Zustand, den es nicht gibt.
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
// v3.246: Was ANGEZEIGT und verschickt wird. lfEinkaufsliste() bleibt die
// eine Wahrheit darueber, was ueberhaupt fehlt - gefiltert wird erst an der
// Ansicht, und zwar mit demselben lfLieferant wie Artikelliste, Zuordnen und
// Inventur. Vier Ansichten, ein Filter.
//
// WARUM es die Einkaufsliste besonders braucht: eine Bestellung geht an
// GENAU EINEN Haendler. Eine Liste quer ueber zwei Lieferanten ist kein
// Bestellvorgang, und die Summe darunter waere eine Zahl, die zu keiner
// Bestellung gehoert.
function lfEinkaufAnzeige(){
 return lfEinkaufsliste().filter(a=>lfLieferantPasst(a));
}
// Was der Filter gerade AUSBLENDET. Still verschwinden lassen waere hier der
// teure Fall: eine Bestellung, die niemand aufgibt.
function lfEinkaufVerdeckt(){
 return lfEinkaufsliste().length-lfEinkaufAnzeige().length;
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
 const liste=lfEinkaufAnzeige();
 let summe=0, mit=0, ohne=0;
 liste.forEach(a=>{
  const w=lfZeilenwert(a);
  if(w===null)ohne++; else { summe+=w; mit++ }
 });
 return {summe,mit,ohne};
}
function lfEinkaufsText(){
 const liste=lfEinkaufAnzeige();
 if(!liste.length)return "";
 const heute=new Date().toLocaleDateString("de-CH");
 // Ist ein Lieferant gewaehlt, steht er im Titel: der Text ist dann die
 // Bestellung, die verschickt wird, und nicht eine Uebersicht.
 const zeilen=[(lfLieferant?"Einkaufsliste "+lfLieferant+" vom ":"Einkaufsliste vom ")+heute,""];
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
 // v3.246: angezeigt wird, was zum gewaehlten Lieferanten gehoert - eine
 // Bestellung geht an genau einen Haendler.
 lfLieferantWahlZeichnen("liefEinkaufLieferant","liefEinkaufLieferantBox");
 const liste=lfEinkaufAnzeige();
 const verdeckt=lfEinkaufVerdeckt();
 const ueberwacht=lfArtikel.filter(a=>lfMindest(a)>0&&lfLieferantPasst(a)).length;
 if(feld)feld.value=lfEinkaufsText();
 const knopf=$("liefEinkaufKopieren");
 if(knopf)knopf.disabled=!liste.length;
 // Was der Filter ausblendet, wird GENANNT. Eine Bestellung, die niemand
 // aufgibt, weil sie hinter einem Filter lag, ist der teure Fall.
 const andere=verdeckt
  ? `<div class="small" style="color:var(--muted);margin-top:8px">Bei <b>anderen Lieferanten</b>
     fehlen zusätzlich <b>${verdeckt}</b> Position(en) – dafür oben den Lieferanten wechseln.
     Jede Bestellung geht an einen Händler.</div>`
  : "";
 if(!liste.length){
  // Eine leere Einkaufsliste bedeutet mehreres, und die zu verwechseln waere
  // teuer: "nichts fehlt", "es wird nichts ueberwacht" - oder, seit v3.246,
  // "bei DIESEM Lieferanten fehlt nichts".
  box.innerHTML=(verdeckt
   ? `<div class="info">Bei <b>${esc(lfLieferant)}</b> ist nichts zu bestellen.</div>`
   : (ueberwacht
    ? `<div class="info">Nichts zu bestellen – von allen <b>${ueberwacht}</b>
       überwachten Artikeln ist genug da. Einzelnes lässt sich jederzeit von Hand
       dazusetzen: im Lager den Artikel antippen, <b>🛒 Auf die Einkaufsliste</b>.</div>`
    : `<div class="info">Für noch keinen Artikel ist ein <b>Mindestbestand</b>
       hinterlegt, und von Hand ist auch nichts gesetzt – deshalb kann die Liste
       nichts melden. Im Lager einen Artikel antippen: dort trägst du einen
       <b>Mindestbestand</b> ein (dann meldet er sich selbst) oder setzt ihn mit
       <b>🛒 Auf die Einkaufsliste</b> einmalig dazu.</div>`))+andere;
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
   <div class="bar" style="margin:0">
    <!-- v3.239: Wareneingang direkt aus der Einkaufsliste. Vorbelegt wird
         die BESTELLmenge - mit der Liste in der Hand ist das die Zahl, die
         auf dem Lieferschein steht. -->
    <button type="button" class="blue" data-lf-eingang="${esc(a.id)}"
     data-lf-eingang-menge="${esc(lfZahlText(lfBestellmenge(a)))}"
     title="Wareneingang buchen">📥</button>
    ${hand?`<button type="button" class="gray"
     data-lf-erledigt="${esc(hand.id)}" title="Von Hand gesetzte Zeile abhaken">✓</button>`:""}
   </div>
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
 box.innerHTML=html+andere;
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
 // v3.241: nur die Gruppen des gewaehlten Lieferanten - sonst stehen in der
 // Auswahl Gruppen, die danach keine Zeile zeigen.
 lfArtikel.filter(a=>!a.archiviert&&lfPasstZumFilter(a)).forEach(a=>{
  const g=String(a.gruppe||"Ohne Gruppe");
  if(!m[g])m[g]={name:g,gesamt:0,offen:0};
  m[g].gesamt++;
  if(lfOffeneZuordnung(a))m[g].offen++;
 });
 return Object.keys(m).sort((x,y)=>x.localeCompare(y,"de")).map(k=>m[k]);
}
function lfZuordnenKandidaten(){
 const t=(x,y)=>String(x||"").localeCompare(String(y||""),"de");
 const q=lfZuordnenSuche.trim().toLowerCase();
 return lfArtikel.filter(a=>{
  if(a.archiviert)return false;
  if(!lfPasstZumFilter(a))return false;
  // v3.249: "nur noch nicht zugeordnete" heisst auch: nicht die, bei denen
  // entschieden ist, dass es keine Position gibt. Ohne die Wahl stehen sie
  // weiter da - zum Zuruecknehmen der Entscheidung.
  if(lfZuordnenNurOffene&&!lfOffeneZuordnung(a))return false;
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
 // v3.243: Das Gruppenmuster ist stark - "wie 44x in dieser Gruppe" liest
 // sich wie eine Zusage. Genau deshalb darf es keine Position tragen, deren
 // Groesse dem Artikel widerspricht: in der Gruppe "Dachrinnen" ist das
 // Muster die 250er-Position, der Artikel aber eine 400er Rinne. Statt der
 // naechstbesten Behauptung wird der naechste Kandidat genommen, der nicht
 // widerspricht - und wenn es keinen gibt, gar keiner.
 const sortiert=Object.keys(zaehler).sort((x,y)=>zaehler[y]-zaehler[x]);
 for(const id of sortiert){
  const r=lfRegieZuId(id);
  if(!r)continue;
  if(lfGroesseWiderspricht(a,r))continue;
  return {regie:r,anzahl:zaehler[id]};
 }
 return null;
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
async function lfZuordnenAlleSetzen(){
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
 // v3.243: Dieser Knopf war der teuerste Weg in eine falsche Rechnung.
 // In der Gruppe "Dachrinnen" sind die offenen Artikel 200er und 400er; mit
 // der 250er-Position im Feld haette ein Druck 11 Artikel auf einen falschen
 // Preis gesetzt. Artikel, deren Groesse der gewaehlten Position
 // widerspricht, werden deshalb ausgelassen - und zwar benannt, nicht still.
 // v3.249: Auch hier die Entschiedenen auslassen. Sie zu setzen waere das
 // Gegenteil der Entscheidung - und im Gegensatz zu "Sichere Vorschlaege"
 // war das hier zuerst nicht abgesichert; der Pruefstand hat es gefunden
 // (AA10).
 const entschiedene=liste.filter(a=>lfKeinePosition(a)).length;
 const passend=liste.filter(a=>!lfKeinePosition(a)&&!lfGroesseWiderspricht(a,r));
 const weg=liste.length-passend.length-entschiedene;
 if(!passend.length){
  if(h){ h.style.color="var(--red)";
   h.textContent="Nichts gesetzt: „"+r.edv_nr+" · "+r.name+"“ hat die Grösse "
    +(r.dim?"„"+r.dim+"“":"ohne Angabe")+", die angezeigten Artikel eine andere. "
    +"Eine andere Grösse ist ein anderer Preis – deshalb setzt die App das nicht in einem Zug. "
    +"Einzeln geht es weiterhin, wenn es fachlich stimmt." }
  return;
 }
 if(typeof confirm==="function"&&!await appConfirm(
   (weg?passend.length+" von "+liste.length+" angezeigten Artikeln":"Alle "+passend.length+" angezeigten Artikel")
  +" auf „"+r.edv_nr+" · "+r.name+"“ setzen?\n\n"
  +(weg?weg+" Artikel werden ausgelassen: ihre Grösse passt nicht zu dieser Position.\n\n":"")
  +(entschiedene?entschiedene+" weitere, weil bei ihnen festgehalten ist, dass es keine Regie-Position gibt.\n\n":"")
  +"Gespeichert wird erst mit „Speichern“ – bis dahin lässt sich jede Zeile noch einzeln ändern."))return;
 passend.forEach(a=>{ lfZuordnungen[String(a.id)]=String(r.id) });
 lfZuordnenZeichnen();
 if(h){ h.style.color="var(--muted)";
  h.textContent=passend.length+" Artikel auf „"+r.edv_nr+"“ gesetzt – noch nicht gespeichert."
   +(weg?" "+weg+" ausgelassen, weil die Grösse nicht passt.":"")
   +(entschiedene?" "+entschiedene+" ausgelassen, weil dort entschieden ist, dass es keine Position gibt.":"") }
}

// v3.243: Wie viele der offenen Artikel sind ueberhaupt zuordenbar? Das ist
// eine andere Frage als "wie viele sind noch offen" - und die wichtigere.
// Gemessen: 115 der 158 offenen Artikel koennen gar nicht zugeordnet werden,
// weil die Regie-Liste ihre Groesse nicht fuehrt.
function lfZuordnenBefundStand(){
 const st={offen:0,zuEntscheiden:0,groesseFehlt:0,nichts:0,ohneMuster:0,
  entschiedenOhne:lfEntschiedenOhne()};
 lfArtikel.forEach(a=>{
  // v3.249: bewusst ohne Position ist nicht offen.
  if(!lfOffeneZuordnung(a))return;
  st.offen++;
  const b=lfGroessenBefund(a);
  if(b.art==="groesse-fehlt")st.groesseFehlt++;
  else if(b.art==="nichts")st.nichts++;
  else st.zuEntscheiden++;
  // v3.244: zaehlt QUER dazu - diese Artikel sind zuordenbar, aber der
  // Vorschlag stammt aus einer anderen Gruppe. Keine eigene Spalte in der
  // Summe, sonst zaehlte derselbe Artikel zweimal.
  if(lfOhneMuster(a))st.ohneMuster++;
 });
 return st;
}
// ---- Welche Position fehlt? (v3.244) --------------------------------------
//
// v3.243 sagt, dass 115 Artikel nicht zuordenbar sind. Die naechste Frage ist
// "und was muss ich tun?" - und die Antwort steht in SEINER eigenen Liste.
//
// Gemessen am 01.10.2026: seine Regie-Liste benutzt ZWEI Stile, und zwar je
// Warenart verschieden.
//   je Werkstoff:      201.01/02 Dachrinnen halbrund Kupfer, 201.11/12
//                      Titanzink, 201.13/14 Chromnickelstahl
//   alle Materialien:  203.41/42 Einhaengestutzen gerade, 203.21/22
//                      Rinnenboden gerade, 203.01/02 Rinnenwinkel
// Beim Blech ist der Werkstoff der Preis, beim Formteil nicht. Welcher Stil
// in einer Gruppe gilt, muss deshalb nicht geraten werden: die bereits
// zugeordneten Artikel derselben Gruppe sagen es.
// Alle Groessen, in denen die Regie-Liste eine Position dieses Namens fuehrt
// - gelesen aus der Liste selbst, nicht aus den Zuordnungen.
function lfRegieDimsFuerName(name){
 const raus=[];
 lfRegieListe().forEach(r=>{
  if(String(r.name||"")!==String(name||""))return;
  lfRegieDimZahlen(r).forEach(z=>{ if(raus.indexOf(z)<0)raus.push(z) });
 });
 return raus.sort((x,y)=>x-y);
}
// v3.244, zweiter Befund - und der war mir in v3.243 entgangen:
// die Groessenregel faengt nur Groessen. Ein "Rinnenkugelboden 250" bekommt
// "Rinnenboden gerade, alle Materialien" Groesse 250 angeboten: die Groesse
// PASST, nur die Form nicht. Dasselbe bei "Schraegstutzen" gegen
// "Einhaengestutzen gerade" und bei "Rinnenhaken eckig" gegen "Rinnenhalter".
// In rmatBewerte steht "gerade" sogar ausdruecklich auf der Ignorierliste -
// genau deshalb gewinnt es.
//
// Eine Wortregel dafuer waere Spenglerfachsprache, und die gehoert ihm, nicht
// mir. Messbar ist aber etwas anderes, und es genuegt: in diesen Gruppen ist
// noch GAR NICHTS zugeordnet. Die App hat also keinen Beleg, dass diese
// Gruppe auf irgendetwas zeigt - der Vorschlag kommt aus einer anderen
// Gruppe. Das wird gesagt.
//
// Geblockt wird es NICHT: genau so hat er die 281 vorhandenen Zuordnungen
// gemacht - eine von Hand, dann traegt das Gruppenmuster den Rest. Wer hier
// zusperrt, nimmt ihm bei jeder neuen Lieferantenliste den Einstieg.
// Betrifft 47 Artikel: Rinnenhaken eckig (17), Rinnenkugelboeden (15),
// Schraegstutzen (15).
function lfOhneMuster(a){
 // v3.249: ein bewusst ohne Position entschiedener Artikel ist hier kein
 // Fall mehr - es gibt nichts zu warnen, wenn nichts zugeordnet werden soll.
 return lfOffeneZuordnung(a)&&lfMusterFuer(a)===null&&lfRegieVorschlaege(a).length>0;
}
function lfMusterFuer(a){
 if(!a)return null;
 const g=String(a.gruppe||"");
 const namen={};
 lfArtikel.forEach(x=>{
  if(x.archiviert||String(x.gruppe||"")!==g)return;
  const r=lfRegieVon(x);
  if(!r)return;
  const k=String(r.name||"");
  if(!namen[k])namen[k]={name:k,einheit:String(r.unit||""),dims:[],materialien:[]};
  const mt=String(x.material||"");
  if(mt&&namen[k].materialien.indexOf(mt)<0)namen[k].materialien.push(mt);
 });
 const liste=Object.keys(namen).map(k=>namen[k]);
 // v3.244, behobener Fehler: die vorhandenen Groessen muessen aus der
 // REGIE-LISTE kommen, nicht aus den Zuordnungen. Sonst fehlt eine Groesse,
 // die er schon fuehrt, nur weil ihr noch kein Lieferantenartikel zugeordnet
 // ist - und die Arbeitsliste verlangte eine Position, die es gibt.
 liste.forEach(x=>{ x.dims=lfRegieDimsFuerName(x.name) });
 if(!liste.length)return null;
 // Ein Name fuer die ganze Gruppe: "alle Materialien".
 if(liste.length===1)return Object.assign({stil:"alle"},liste[0]);
 // Mehrere Namen: je Werkstoff. Das Muster ist der Name, den die Artikel
 // MIT DEMSELBEN Werkstoff benutzen - nicht der haeufigste.
 const mt=String(a.material||"");
 const treffer=liste.filter(x=>x.materialien.indexOf(mt)>=0);
 if(treffer.length===1)return Object.assign({stil:"werkstoff"},treffer[0]);
 // Mehrdeutig: der Werkstoff ist noch nirgends zugeordnet. Dann werden die
 // Kandidaten genannt, statt einen zu behaupten.
 return {stil:"unklar",kandidaten:liste.map(x=>x.name),dims:[],einheit:""};
}
// Was der Regie-Liste fehlt, nach Gruppe und Groesse - zum Mitnehmen.
// Die Regie-Liste zu erweitern ist SEINE Entscheidung (sie ist die Grundlage
// der Verrechnung); die App sagt nur, was dort fehlen wuerde.
// v3.244: Zusammengefasst wird nach der POSITION, die fehlen wuerde - nicht
// nach dem Artikel. Eine Zeile hier ist genau eine Position, die er anlegen
// koennte; 115 Einzelzeilen waeren keine Auskunft.
//
// Zwei Arten von Luecke, und sie bedeuten Verschiedenes:
//   "muster"  seine Liste fuehrt die Position schon, nur in anderer Groesse
//             -> Name und Einheit stehen fest, es fehlen EDV-Nr. und Preis
//   "neu"     seine Liste fuehrt diese Warenart gar nicht (Rinnenhaken
//             eckig, Kugelboeden, Schraegstutzen) -> das ist eine fachliche
//             Entscheidung, nicht eine Kopie
function lfFehlendeRegie(){
 const m={};
 lfArtikel.forEach(a=>{
  // v3.249: Was bewusst ohne Position bleibt, fehlt der Regie-Liste nicht -
  // es ist entschieden. Eine Arbeitsliste, die Entschiedenes weiter
  // verlangt, ist keine Arbeitsliste.
  if(!lfOffeneZuordnung(a))return;
  const b=lfGroessenBefund(a);
  // v3.244: Eine Gruppe ohne jede Zuordnung gehoert in die Arbeitsliste, auch
  // wenn die Groesse passt - sonst fehlen dort genau die 47 Artikel, bei
  // denen die Form nicht stimmt.
  if(b.art==="ok"&&!lfOhneMuster(a))return;
  const g=String(a.gruppe||"Ohne Gruppe");
  const mu=lfMusterFuer(a);
  const dazu=e=>{
   e.anzahl++;
   if(e.beispiele.length<2&&e.beispiele.indexOf(a.bezeichnung)<0)e.beispiele.push(a.bezeichnung);
  };
  if(mu&&(mu.stil==="alle"||mu.stil==="werkstoff")){
   const k="M|"+mu.name+"|"+(b.groesse||0);
   if(!m[k])m[k]={art:"muster",name:mu.name,einheit:mu.einheit,stil:mu.stil,
    gruppe:g,groesse:b.groesse,vorhanden:mu.dims.slice(),anzahl:0,beispiele:[]};
   dazu(m[k]);
  }else{
   const k="N|"+g+"|"+(b.groesse||0);
   if(!m[k])m[k]={art:"neu",gruppe:g,groesse:b.groesse,anzahl:0,beispiele:[],
    nahe:(mu&&mu.kandidaten)?mu.kandidaten.slice(0,2)
         :lfRegieVorschlaege(a).slice(0,1).map(v=>{
            const r=lfRegieZuNummer(v.no); return r?String(r.name||""):"" }).filter(Boolean),
    vorhanden:b.vorhanden.slice()};
   dazu(m[k]);
  }
 });
 return Object.keys(m).map(k=>m[k]).sort((x,y)=>
  (x.art===y.art?0:(x.art==="muster"?-1:1))
  ||String(x.name||x.gruppe).localeCompare(String(y.name||y.gruppe),"de")
  ||x.groesse-y.groesse);
}
// Der Text ist eine ARBEITSLISTE, nicht ein Befund: je Zeile eine Position,
// die er in der Lagerverwaltung unter "neues Material anlegen" erfassen
// kann. Name und Einheit stehen dort schon - EDV-Nr. und Preis sind seine
// Entscheidung, und die App schlaegt dafuer bewusst nichts vor: eine
// geratene EDV-Nr. landet in seinem Nummernsystem, und ein geratener Preis
// auf einer Rechnung.
function lfFehlendeRegieText(){
 const liste=lfFehlendeRegie();
 if(!liste.length)return "";
 const z=[];
 z.push("Was der Regie-Liste fehlt – Stand "+new Date().toLocaleDateString("de-CH"));
 z.push("");
 const muster=liste.filter(x=>x.art==="muster");
 const neue=liste.filter(x=>x.art!=="muster");
 if(muster.length){
  z.push("A) VORHANDENE POSITION IN ANDERER GRÖSSE  ("+muster.length+" Positionen)");
  z.push("   Name und Einheit stehen schon fest – es fehlen EDV-Nr. und Preis.");
  z.push("");
  muster.forEach(x=>{
   z.push("  "+x.name+(x.groesse?"   Grösse "+lfZahlText(x.groesse):"   Grösse ?")
    +(x.einheit?"   Einheit "+x.einheit:""));
   z.push("      vorhanden in: "+(x.vorhanden.length?x.vorhanden.map(lfZahlText).join(", "):"—")
    +"   ·   deckt "+x.anzahl+" Artikel"
    +(x.stil==="werkstoff"?"   ·   diese Gruppe wird je Werkstoff geführt":""));
   x.beispiele.forEach(b=>z.push("      z. B. "+b));
   z.push("");
  });
 }
 if(neue.length){
  z.push("B) IN DIESER GRUPPE IST NOCH NICHTS ZUGEORDNET  ("+neue.length+" Gruppen/Grössen)");
  z.push("   Hier ist es keine Kopie, sondern eine fachliche Entscheidung: gibt es");
  z.push("   diese Position bei euch, und unter welchem Namen? Die App hat keinen");
  z.push("   Beleg - die genannte ähnliche Position stammt aus einem ANDEREN");
  z.push("   Produktbereich (ein Kugelboden ist kein gerader Boden, ein");
  z.push("   Schrägstutzen kein Einhängestutzen gerade). Ordnet ihr einen Artikel");
  z.push("   von Hand zu, trägt das Gruppenmuster danach den Rest.");
  z.push("");
  neue.forEach(x=>{
   z.push("  "+x.gruppe+(x.groesse?"   Grösse "+lfZahlText(x.groesse):"")
    +"   ·   deckt "+x.anzahl+" Artikel");
   if(x.nahe&&x.nahe.length)z.push("      ähnlich vorhanden: "+x.nahe.join(" / "));
   x.beispiele.forEach(b=>z.push("      z. B. "+b));
   z.push("");
  });
 }
 z.push("Angelegt wird in der Lagerverwaltung unter „neues Material anlegen“.");
 z.push("Die App legt dort NICHTS von selbst an: die Regie-Liste ist die Grundlage");
 z.push("der Verrechnung, und EDV-Nr. und Preis sind eure Entscheidung.");
 z.push("");
 z.push("Die angegebene Grösse ist die aus dem Zuschnitt-Feld des Artikels. Wo sie");
 z.push("nicht stimmt, sagen die Beispielartikel, was gemeint ist – bei B-Team steht");
 z.push("die Rinnengrösse teils in der Artikelnummer (20.160.400.100 = 400er Rinne,");
 z.push("100 mm Ablauf).");
 z.push("");
 z.push("Solange die Position fehlt, bleiben diese Artikel ohne Regie-Position und");
 z.push("lassen sich im Regierapport nicht scannen. Auch das ist eine Antwort.");
 return z.join("\n");
}
// v3.244: Der Knopf ZEIGT die Liste und kopiert sie zusaetzlich. Auf dem
// Handy ist Lesen das Wichtigere - eine Arbeitsliste, die nur in der
// Zwischenablage liegt, muss man erst irgendwohin einfuegen, um sie zu
// sehen. Das Kopieren darf deshalb auch fehlschlagen, ohne dass die
// Auskunft verloren geht.
async function lfFehlendeRegieKopieren(){
 if(typeof $!=="function")return;
 const text=lfFehlendeRegieText();
 const h=$("liefZuordnenMeldung");
 const f=$("liefZuordnenFehlendText");
 if(!text){
  if(f){ f.hidden=true; f.value="" }
  if(h){h.style.color="var(--muted)";h.textContent="Es fehlt nichts – jeder offene Artikel hat eine passende Position zur Wahl."}
  return;
 }
 if(f){ f.hidden=false; f.value=text }
 const n=lfFehlendeRegie().length;
 try{
  if(!navigator.clipboard||!navigator.clipboard.writeText)throw new Error("keine Zwischenablage");
  await navigator.clipboard.writeText(text);
  if(h){h.style.color="var(--muted)";
   h.textContent=n+" Position(en) – die Liste steht unten und ist zusätzlich kopiert."}
 }catch(e){
  if(f){ f.focus(); f.select() }
  if(h){h.style.color="var(--muted)";
   h.textContent=n+" Position(en) – die Liste steht unten. Das Kopieren hat dieses Gerät nicht erlaubt; der Text ist markiert."}
 }
}
// v3.249: Die Entscheidung setzen oder zuruecknehmen - einzeln oder fuer
// alle angezeigten. 158 Artikel einzeln anzutippen waere ein Nachmittag;
// gearbeitet wird gruppenweise, wie beim Zuordnen selbst.
//
// Geschrieben wird SOFORT, nicht erst mit "Speichern": die Entscheidung
// haengt an keiner Regie-Position, es gibt also nichts durchzusehen. Und
// eine Entscheidung, die man noch speichern muss, geht beim Schliessen des
// Dialogs verloren.
async function lfKeinePositionSetzen(ids,wert){
 if(typeof sb==="undefined")return {ok:false,text:"Keine Verbindung."};
 const liste=(Array.isArray(ids)?ids:[ids]).map(String).filter(Boolean);
 if(!liste.length)return {ok:false,text:"Es wird gerade nichts angezeigt."};
 // Die Datenbank laesst die Marke nur ohne Zuordnung zu
 // (lieferanten_artikel_keine_regie_nur_ohne_zuordnung). Hier wird deshalb
 // gar nicht erst versucht, sie auf einen zugeordneten Artikel zu setzen -
 // die Regel steht dort, die Auskunft steht hier.
 const betroffen=wert
  ? liste.filter(id=>{ const a=lfArtikelZuId(id); return a&&!lfRegieVon(a) })
  : liste;
 if(!betroffen.length)return {ok:false,
  text:"Diese Artikel haben eine Regie-Position. Erst die Zuordnung entfernen, dann geht es."};
 let fehler="";
 for(const id of betroffen){
  const r=await sb.from("lieferanten_artikel")
   .update({keine_regie_position:!!wert}).eq("id",Number(id));
  if(r&&r.error){ fehler=r.error.message||String(r.error); break }
 }
 if(fehler)return {ok:false,text:"Nicht gespeichert: "+fehler};
 await lfLaden();
 return {ok:true,anzahl:betroffen.length,
  uebersprungen:liste.length-betroffen.length};
}
async function lfKeinePositionAlleSetzen(wert){
 if(typeof $!=="function")return;
 const h=$("liefZuordnenMeldung");
 const liste=lfZuordnenKandidaten();
 if(!liste.length){ if(h){h.style.color="var(--muted)";h.textContent="Es wird gerade nichts angezeigt."} return }
 if(typeof confirm==="function"&&wert&&!await appConfirm(
   "Bei allen "+liste.length+" angezeigten Artikeln festhalten, dass es dafür KEINE Regie-Position gibt?\n\n"
  +"Sie verschwinden damit aus „noch offen“ und aus „Was fehlt“. Im Lager bleiben sie voll nutzbar – "
  +"Bestand, Mindestbestand und Einkaufsliste brauchen keine Regie-Position.\n\n"
  +"Scannen im Regierapport geht bei ihnen nicht; das sagt die App dann auch so."))return;
 const r=await lfKeinePositionSetzen(liste.map(a=>a.id),wert);
 lfZuordnenZeichnen(); lfZeichnen();
 if(h){
  h.style.color=r.ok?"var(--muted)":"var(--red)";
  h.textContent=r.ok
   ? (wert
      ? r.anzahl+" Artikel festgehalten: dafür gibt es keine Regie-Position."
        +(r.uebersprungen?" "+r.uebersprungen+" ausgelassen, weil sie eine haben.":"")
      : "Bei "+r.anzahl+" Artikel(n) zurückgenommen – sie stehen wieder als offen da.")
   : r.text;
 }
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
 // v3.243: Die offenen Artikel aufgeteilt in "da ist zu entscheiden" und
 // "da gibt es nichts zu entscheiden". Ohne diese Trennung sucht man in der
 // Liste nach einer Position, die es nicht gibt.
 const hin=$("liefZuordnenBefund");
 if(hin){
  const st=lfZuordnenBefundStand();
  const blockiert=st.groesseFehlt+st.nichts;
  // v3.244: Der Satz zu den Gruppen, in denen noch nichts zugeordnet ist -
  // er gilt unabhaengig davon, ob eine Groesse fehlt.
  const fremd=st.ohneMuster
   ? `<div class="small" style="margin-top:4px">Bei <b>${st.ohneMuster}</b> Artikel(n) ist in ihrer
      <b>Produktgruppe noch nichts zugeordnet</b> – deren Vorschlag kommt aus einem anderen
      Produktbereich (ein <i>Kugelboden</i> bekommt den <i>geraden</i> Boden angeboten: Grösse passt,
      Form nicht). Geblockt wird nichts – ordne einen von Hand zu, dann trägt das Gruppenmuster
      den Rest.</div>`
   : "";
  // v3.249: Die Entschiedenen werden GENANNT, nicht verschwiegen. Sonst
  // fragt er sich, wo die 158 hin sind - und ob die App sie vergessen hat.
  const entschieden=st.entschiedenOhne
   ? `<div class="small" style="margin-top:4px;color:var(--muted)">Bei <b>${st.entschiedenOhne}</b>
      Artikel(n) ist festgehalten, dass es dafür <b>keine</b> Regie-Position gibt. Sie zählen
      nicht als offen und stehen nicht in „Was fehlt“ – im Lager bleiben sie voll nutzbar.
      Mit dem Schalter „nur noch nicht zugeordnete“ aus siehst du sie wieder.</div>`
   : "";
  if(!st.offen&&st.entschiedenOhne){
   hin.hidden=false;
   hin.innerHTML=`<b>Nichts mehr offen.</b>`+entschieden;
   return;
  }
  if(!st.offen){ hin.hidden=true; hin.innerHTML="" }
  else if(!blockiert){
   hin.hidden=false;
   hin.innerHTML=`<b>${st.offen}</b> offen – für jeden steht eine passende Position zur Wahl.`+fremd+entschieden;
  }else{
   hin.hidden=false;
   hin.innerHTML=`Von <b>${st.offen}</b> offenen Artikeln sind <b>${st.zuEntscheiden}</b> zu entscheiden.
    <b style="color:var(--red)">${blockiert}</b> lassen sich <b>nicht</b> zuordnen – die Regie-Liste führt
    ${st.groesseFehlt?`bei <b>${st.groesseFehlt}</b> die Grösse nicht`:""}${
     st.groesseFehlt&&st.nichts?" und ":""}${st.nichts?`für <b>${st.nichts}</b> gar keine passende Position`:""}.
    Das ist keine Arbeit, die noch wartet: es gibt die Position nicht.
    <div class="small" style="margin-top:4px">Das wären <b>${lfFehlendeRegie().length}</b> Regie-Position(en) –
    <b>📋 Was fehlt</b> zeigt sie als Arbeitsliste: Name und Einheit stehen schon fest, EDV-Nr. und Preis sind
    deine Entscheidung. Angelegt wird in der <b>Lagerverwaltung</b>; die App legt dort nichts von selbst an.</div>`
    +fremd+entschieden;
  }
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
 lfLieferantWahlZeichnen("liefZuordnenLieferant","liefZuordnenLieferantBox");
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
  const befund=lfGroessenBefund(a);
  // v3.243: Auch eine BESTEHENDE Zuordnung kann der Groesse widersprechen -
  // sie ist aus der Zeit vor dieser Pruefung. Gemessen wurden zwei Faelle
  // (330er Rinne auf der 250er Position). Geaendert wird nichts von selbst:
  // es ist seine Zuordnung, und nur er weiss, ob sie Absicht war. Gefragt
  // wird aber.
  const jetztR=lfRegieVon(a);
  const jetztFalsch=(jetztR&&lfGroesseWiderspricht(a,jetztR))?(jetztR.dim||""):"";
  const fremdeGruppe=lfOhneMuster(a);
  const entschieden=lfKeinePosition(a);
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
   // v3.243: Ein Beinahe-Treffer darf nicht wie ein Treffer aussehen. Steht
   // in der Auswahl nur "Dachrinnen halbrund Kupfer (Grösse 250)", liest
   // sich das bei einer 400er-Rinne wie der richtige Eintrag.
   const grund=lfGroesseWiderspricht(a,r)
    ? " ⚠ ANDERE GRÖSSE ("+(r.dim||"ohne Angabe")+")"
    : (v.gruende&&v.gruende.length?" ("+v.gruende.join(", ")+")":"");
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
     entschieden?' · <span style="color:var(--muted)">bewusst ohne Regie-Position – im Lager weiter nutzbar, im Regierapport nicht verrechenbar</span>'
        :jetztFalsch?' · <span style="color:var(--red)">zugeordnet auf Grösse '+esc(jetztFalsch)+' – stimmt das?</span>'
        :grp?' · <span style="color:var(--green)">wie '+grp.anzahl+'× in dieser Gruppe</span>'
        :(befund.art==="groesse-fehlt"
          ? ' · <span style="color:var(--red)">'+esc(lfGroessenBefundText(befund))+'</span>'
          :(fremdeGruppe
            ? ' · <span style="color:var(--orange,#c97a00)">in dieser Gruppe ist noch nichts zugeordnet – '
              +'der Vorschlag kommt aus einem anderen Produktbereich</span>'
            :(vor.length?(sicher?' · <span style="color:var(--green)">sicherer Vorschlag</span>'
                                :' · <span style="color:var(--muted)">Vorschlag, bitte prüfen</span>')
                        :' · <span style="color:var(--muted)">kein Vorschlag gefunden</span>')))}</div>
    <select data-lf-zu="${esc(a.id)}" style="margin-top:4px;width:100%"${
      entschieden?" disabled":""}>${optionen.join("")}</select>
    <label class="rechte-schalter" style="margin-top:4px">
     <input type="checkbox" data-lf-keine="${esc(a.id)}"${entschieden?" checked":""}${
      jetztR?" disabled":""}>
     ${entschieden
       ? 'Dafür gibt es bei uns <b>keine</b> Regie-Position – entschieden'
       : 'Dafür gibt es bei uns keine Regie-Position'}</label>
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
 let n=0, ausGruppe=0, uebersprungen=0, fremd=0;
 lfZuordnenKandidaten().forEach(a=>{
  // v3.249: auch nichts bei denen setzen, bei denen entschieden ist, dass
  // es keine Position gibt - das waere das Gegenteil der Entscheidung.
  if(!lfOffeneZuordnung(a))return;
  // Die eigene Entscheidung in der Gruppe zaehlt mehr als die
  // Textaehnlichkeit - siehe lfGruppenVorschlag.
  const grp=lfGruppenVorschlag(a);
  if(grp){ lfZuordnungen[String(a.id)]=String(grp.regie.id); n++; ausGruppe++; return }
  // v3.243: Der Grund, aus dem ein Artikel offen BLEIBT, wird hier
  // festgestellt - vor der Frage, ob ein Vorschlag sicher genug ist. Sonst
  // haengt die Begruendung an der Reihenfolge der Pruefungen: ein 400er
  // Artikel, dessen Vorschlag ohnehin nicht sicher war, waere als "kein
  // Vorschlag sicher genug" gemeldet worden - und der Rat darunter ("setze
  // eine Zeile von Hand, die uebrigen schlaegt die App dann genauso vor")
  // waere genau der falsche: die Position gibt es nicht.
  if(lfGroessenBefund(a).art==="groesse-fehlt"){ uebersprungen++; return }
  const vor=lfRegieVorschlaege(a);
  if(!lfRegieSicher(vor))return;
  const r=lfRegieZuNummer(vor[0].no);
  if(!r)return;
  const fremd0=lfOhneMuster(a);
  // Doppelt gesichert: auch ein sicherer Namenstreffer darf die Groesse
  // nicht ueberstimmen.
  if(lfGroesseWiderspricht(a,r)){ uebersprungen++; return }
  lfZuordnungen[String(a.id)]=String(r.id);
  n++;
  // v3.244: Nicht geblockt - so hat er die 281 vorhandenen Zuordnungen
  // gemacht, und bei jeder neuen Lieferantenliste ist jede Gruppe zuerst
  // leer. Aber gezaehlt und genannt: der Vorschlag kam aus einer anderen
  // Gruppe, und das ist die Zeile, die er zuerst anschauen sollte.
  if(fremd0)fremd++;
 });
 lfZuordnenZeichnen();
 const h=$("liefZuordnenMeldung");
 if(h){
  h.style.color="var(--muted)";
  // v3.243: Was NICHT gesetzt wurde, wird genannt. Ein Knopf, der stumm
  // weniger tut als erwartet, laesst den Anwender die Zeilen suchen.
  const wegFremd=fremd
   ? " "+fremd+" davon stammen aus einer Gruppe, in der noch nichts zugeordnet war – die bitte zuerst ansehen."
   : "";
  const wegGroesse=uebersprungen
   ? " "+uebersprungen+" Artikel wurden ausgelassen, weil die Regie-Liste ihre Grösse nicht führt – sie stehen unten mit Begründung."
   : "";
  h.textContent=n
   ? n+" Vorschlag(e) eingesetzt"+(ausGruppe?" ("+ausGruppe+" davon nach dem Muster dieser Gruppe)":"")
     +" – noch nicht gespeichert. Bitte durchsehen und speichern."+wegFremd+wegGroesse
   : (uebersprungen
      ? "Nichts eingesetzt: bei allen "+uebersprungen+" angezeigten Artikeln führt die Regie-Liste die Grösse nicht. "
        +"Das ist keine Zuordnung, die noch fehlt – es gibt die Position nicht. Unten steht je Zeile, welche Grössen vorhanden sind."
      : "Kein Vorschlag ist sicher genug zum Vorwählen. Setze eine Zeile von Hand – die übrigen der Gruppe schlägt die App dann von selbst genauso vor.");
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
 if(typeof confirm==="function"&&!await appConfirm(
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

// v3.239: Wareneingang. Kommt die Ware und wird ein Zugang gebucht, ist der
// offene Einkaufswunsch damit ganz oder teilweise erledigt.
//
// DIE REGEL IST EINE EINZIGE: was da ist, fehlt nicht mehr.
//   gebucht >= gewuenscht  ->  Wunsch erledigt
//   gebucht <  gewuenscht  ->  Wunsch um die gebuchte Menge verringert
// Den Wunsch bei einer Teillieferung auf der alten Menge stehen zu lassen
// waere der teure Fehler: die Einkaufsliste wuerde weiter die GANZE Menge
// verlangen, und beim naechsten Bestellen kaeme das Zuwenig doppelt.
//
// Der Haken "Rest streichen" ist die Ausnahme fuer den Fall, dass der Rest
// gar nicht mehr kommt (abgesagt, ersetzt). Aus, solange nichts gesagt wird -
// ein stillschweigend gestrichener Rest waere Ware, die niemand mehr
// bestellt und die auf der Baustelle fehlt.
function lfBuchenWunschZeichnen(){
 if(typeof $!=="function")return;
 const a=lfArtikelZuId(lfBuchenArtikelId);
 const box=$("liefBuchenWunschBox"), hin=$("liefBuchenWunschHinweis");
 if(!box)return;
 const w=lfHandEintrag(a);
 const zugang=$("liefBuchenArt")&&$("liefBuchenArt").value==="zugang";
 box.hidden=!(w&&zugang);
 if(!w||!zugang)return;
 const menge=lfZahl($("liefBuchenMenge").value);
 const offen=lfZahl(w.menge)-menge;
 if(hin)hin.textContent=
  "Offener Einkaufswunsch: "+lfZahlText(w.menge)+(w.grund?" ("+w.grund+")":"")
  +" · "+(offen<=0
    ? "mit dieser Buchung erledigt."
    : "danach bleiben "+lfZahlText(offen)+" offen.");
}
function lfBuchenOeffnen(artikelId,art,menge){
 if(typeof $!=="function")return;
 const a=lfArtikelZuId(artikelId);
 if(!a){ lfMeldung("Dieser Artikel ist nicht mehr da.",true); return }
 lfBuchenArtikelId=a.id;
 $("liefBuchenTitel").textContent=a.bezeichnung;
 $("liefBuchenUnter").textContent=(a.lieferant?a.lieferant+" · ":"")+"Art.-Nr. "+a.artikelnr
  +(a.ean?" · "+a.ean:"")+" · Bestand "+lfZahlText(lfBestand(a.id));
 $("liefBuchenArt").value=art||"zugang";
 // Vorbelegt wird, was in dieser Lage die richtige Menge ist:
 //  - eine mitgegebene (aus der Einkaufsliste: die Bestellmenge)
 //  - sonst bei einem Zugang mit offenem Wunsch dessen Menge - das ist, was
 //    bestellt wurde, nicht was in eine Packung geht
 //  - sonst die Verpackungseinheit
 const w=lfHandEintrag(a);
 const vor=(menge!==undefined&&menge!==null&&lfZahl(menge)>0) ? lfZahl(menge)
   : ((art||"zugang")==="zugang"&&w) ? lfZahl(w.menge)
   : (a.vpe?lfZahl(a.vpe):1);
 $("liefBuchenMenge").value=lfZahlText(vor);
 $("liefBuchenGrund").value="";
 $("liefBuchenFehler").textContent="";
 const rest=$("liefBuchenRestStreichen");
 if(rest)rest.checked=false;
 lfBuchenWunschZeichnen();
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
 // v3.239: Wareneingang - der offene Einkaufswunsch wird nachgefuehrt. Erst
 // NACH der Buchung: schlaegt die fehl, ist auch nichts angekommen, und der
 // Wunsch muss unberuehrt bleiben.
 //
 // Ein Fehlschlag HIER nimmt die Buchung nicht zurueck - die Ware ist ja da.
 // Er wird aber gesagt, sonst glaubte der Anwender, die Einkaufsliste sei
 // nachgefuehrt.
 let wunschHinweis="";
 const w=(art==="zugang")?lfHandEintrag(a):null;
 if(w){
  const rest=lfZahl(w.menge)-Math.abs(menge);
  const streichen=$("liefBuchenRestStreichen")&&$("liefBuchenRestStreichen").checked;
  try{
   if(rest<=0||streichen){
    const r=await sb.from("lieferanten_einkauf").update({
     erledigt_am:new Date().toISOString(),
     erledigt_von:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null
    }).eq("id",w.id);
    if(r.error)throw r.error;
    wunschHinweis=(rest<=0)
     ? " Einkaufswunsch erledigt."
     : " Rest von "+lfZahlText(rest)+" gestrichen, Einkaufswunsch erledigt.";
   }else{
    // Verringern, nicht loeschen: der Rest fehlt weiterhin. Die
    // Datenbankregel menge > 0 ist damit gewahrt - der Fall rest <= 0
    // laeuft oben ueber erledigt_am.
    const r=await sb.from("lieferanten_einkauf").update({menge:rest}).eq("id",w.id);
    if(r.error)throw r.error;
    wunschHinweis=" Einkaufswunsch steht noch auf "+lfZahlText(rest)+".";
   }
  }catch(e){
   wunschHinweis=" Der Einkaufswunsch liess sich NICHT nachführen: "+((e&&e.message)||e);
  }
 }
 $("liefBuchenSpeichern").disabled=false;
 lfBuchenSchliessen();
 await lfLaden();
 lfZeichnen();
 if($("liefEinkaufModal")&&!$("liefEinkaufModal").hidden)lfEinkaufZeichnen();
 if($("liefBewModal")&&!$("liefBewModal").hidden)lfBewegungenZeichnen();
 lfMeldung(LF_ART_TEXT[art]+" von "+lfZahlText(menge)+" auf „"+a.bezeichnung+"“ gebucht. Bestand jetzt "+lfZahlText(lfBestand(a.id))+"."+wunschHinweis,
   /NICHT nachführen/.test(wunschHinweis));
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
// v3.241: Der Lieferanten-Filter wirkt VOR der Suche - er sagt, womit man
// gerade arbeitet, die Suche sagt, was man darin sucht.
function lfPasstZumFilter(a){ return lfLieferantPasst(a) }
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
 lfLieferantWahlZeichnen("liefLieferantWahl","liefLieferantWahlBox");
 lfLieferantenUebersichtZeichnen();
 const treffer=lfArtikel.filter(a=>!a.archiviert&&lfPasstZumFilter(a)&&lfPasstZurSuche(a));
 const k=$("liefKennzahlen");
 if(k){
  // Gezaehlt wird, was der Filter durchlaesst - eine Zahl, die etwas
  // anderes meint als die Liste darunter, ist schlimmer als keine.
  const imFilter=lfArtikel.filter(a=>!a.archiviert&&lfPasstZumFilter(a));
  const mitBestand=imFilter.filter(a=>lfBestand(a.id)>0).length;
  const fehlt=imFilter.filter(a=>lfFehlt(a)>0).length;
  const buchungen=lfLieferant
   ? lfBewegungen.filter(b=>{ const a=lfArtikelZuId(b.artikel_id); return a&&lfPasstZumFilter(a) }).length
   : lfBewegungen.length;
  k.innerHTML=`<b>${imFilter.length}</b> Artikel · <b>${mitBestand}</b> mit Bestand · <b>${buchungen}</b> Buchungen`
   +(fehlt?` · <b style="color:var(--red)">${fehlt}</b> unter Mindestbestand`:"")
   +(lfLieferant?` · <span style="color:var(--muted)">nur ${esc(lfLieferant)}</span>`:"");
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
  // v3.249: gezaehlt wird, was noch zu ENTSCHEIDEN ist - nicht, was
  // bewusst ohne Position bleibt. Sonst zeigte der Knopf dauerhaft Arbeit
  // an, die keine ist, und die echte faellt nicht mehr auf.
  const offen=lfArtikel.filter(a=>lfOffeneZuordnung(a)).length;
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

// v3.241: Tippfehler-Schutz beim Import.
//
// Der Lieferant ist ein Freitextfeld - "Bteam" neben "B-Team" waere ein
// ZWEITER Lieferant, mit eigenem Nummernkreis, eigener Gruppenliste und
// doppelten Artikeln. Auffallen wuerde es erst viel spaeter.
//
// Geblockt wird nichts: es kann einen Haendler geben, der wirklich so
// aehnlich heisst. Gefragt wird, und das Uebernehmen ist ein Knopf.
function lfAehnlich(a,b){
 const k=s=>String(s||"").toLowerCase()
  .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
  .replace(/[^a-z0-9]/g,"");
 const x=k(a), y=k(b);
 return !!x&&!!y&&x===y;
}
function lfLieferantHinweisZeichnen(){
 if(typeof $!=="function")return;
 const feld=$("liefExcelLieferant"), hin=$("liefExcelLieferantHinweis");
 if(!feld||!hin)return;
 const wert=feld.value.trim();
 const treffer=lfLieferanten().find(l=>l!==wert&&lfAehnlich(l,wert));
 if(!treffer){ hin.innerHTML=""; hin.hidden=true; return }
 hin.hidden=false;
 hin.innerHTML=`Es gibt schon <b>${esc(treffer)}</b> – gemeint?
  <button type="button" class="gray" data-lf-lieferant-uebernehmen="${esc(treffer)}"
   style="margin-left:6px">Übernehmen</button>
  <div class="small" style="color:var(--muted);margin-top:4px">Sonst entsteht ein
  <b>zweiter</b> Lieferant mit eigenem Nummernkreis – auffallen würde das erst viel später.</div>`;
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
 // v3.241: den vorhandenen Lieferantennamen uebernehmen statt ihn neu zu tippen.
 const lu=t.closest("[data-lf-lieferant-uebernehmen]");
 if(lu){
  const f=$("liefExcelLieferant");
  if(f){ f.value=lu.getAttribute("data-lf-lieferant-uebernehmen"); lfLieferantHinweisZeichnen() }
  return;
 }
 const erl=t.closest("[data-lf-erledigt]");
 if(erl){ lfEinkaufErledigt(erl.getAttribute("data-lf-erledigt")); return }
 // v3.239: Wareneingang aus der Einkaufsliste.
 const ein2=t.closest("[data-lf-eingang]");
 if(ein2){
  lfBuchenOeffnen(ein2.getAttribute("data-lf-eingang"),"zugang",
   ein2.getAttribute("data-lf-eingang-menge"));
  return;
 }
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
 // v3.249: Die Entscheidung "dafuer gibt es keine Position". Sie wird SOFORT
 // geschrieben, nicht erst mit "Speichern" - sie haengt an keiner
 // Regie-Position, es gibt also nichts durchzusehen, und eine Entscheidung,
 // die man noch speichern muss, geht beim Schliessen verloren.
 const keineId=s.getAttribute("data-lf-keine");
 if(keineId!==null){
  const an=!!s.checked;
  lfKeinePositionSetzen(keineId,an).then(r=>{
   const h=$("liefZuordnenMeldung");
   if(h){
    h.style.color=r.ok?"var(--muted)":"var(--red)";
    h.textContent=r.ok
     ? (an?"Festgehalten: dafür gibt es keine Regie-Position."
          :"Zurückgenommen – der Artikel steht wieder als offen da.")
     : r.text;
   }
   lfZuordnenZeichnen(); lfZeichnen();
  });
  return;
 }
 const id=s.getAttribute("data-lf-zu");
 if(id===null)return;
 lfZuordnungen[String(id)]=s.value||"";
 // NUR der Kopf wird neu gezeichnet. Die ganze Liste neu zu bauen wuerde bei
 // 439 Zeilen die Scrollposition verlieren - mitten im Durchgehen der
 // schlimmste Moment.
 lfZuordnenKopfZeichnen();
});
// v3.240: Die Inventur-Felder. Auch hier wird NUR der Kopf neu gezeichnet -
// beim Tippen die ganze Liste neu zu bauen wuerde den Fokus aus dem Feld
// nehmen, in dem man gerade steht.
if(typeof document!=="undefined")document.addEventListener("input",e=>{
 const f=e.target;
 if(!f||!f.getAttribute)return;
 const z=f.getAttribute("data-lf-inv-z");
 if(z!==null){ lfInvGezaehlt[String(z)]=f.value; lfInvKopfZeichnen(); return }
 const m=f.getAttribute("data-lf-inv-m");
 if(m!==null){ lfInvMindest[String(m)]=f.value; lfInvKopfZeichnen(); return }
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
 // v3.245: Eine Preisliste vom Haendler hat Artikelnummer und Preis, keine
 // Bezeichnung. Fuer einen NEUEN Artikel bleibt sie Pflicht - eine Zeile
 // ohne Namen ist keine Position. Fuer einen vorhandenen nicht: die
 // Bezeichnung steht schon da und wird nicht angefasst.
 pflichtNurNeu:["bezeichnung"],
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
 // v3.239: Der Hinweis zum Einkaufswunsch rechnet mit, waehrend getippt
 // wird - sonst muesste man im Kopf ausrechnen, was offen bleibt.
 const bm=$("liefBuchenMenge");
 if(bm)bm.addEventListener("input",()=>lfBuchenWunschZeichnen());
 const bart=$("liefBuchenArt");
 if(bart)bart.addEventListener("change",()=>lfBuchenWunschZeichnen());
 an("liefEinkaufKnopf",()=>lfEinkaufOeffnen());
 an("liefEinkaufKopieren",()=>lfEinkaufKopieren());
 an("liefEinkaufSchliessen",()=>{ $("liefEinkaufModal").hidden=true });
 an("liefArtikelAbbrechen",()=>lfArtikelSchliessen());
 an("liefArtikelSpeichern",()=>lfMindestSpeichern());
 an("liefArtikelWunschSetzen",()=>lfAufEinkaufsliste());
 an("liefZuordnenKnopf",()=>lfZuordnenOeffnen());
 an("liefZuordnenSichere",()=>lfZuordnenSichereUebernehmen());
 an("liefZuordnenFehlend",()=>lfFehlendeRegieKopieren());
 an("liefZuordnenSpeichern",()=>lfZuordnenSpeichern());
 an("liefZuordnenSchliessen",()=>{ $("liefZuordnenModal").hidden=true });
 an("liefZuordnenAlle",async ()=>await lfZuordnenAlleSetzen());
 an("liefKeinePositionAlle",()=>lfKeinePositionAlleSetzen(true));
 an("liefKeinePositionAlleZurueck",()=>lfKeinePositionAlleSetzen(false));
 an("liefBewKnopf",()=>lfBewegungenOeffnen());
 an("liefInvKnopf",()=>lfInvOeffnen());
 an("liefInvSchliessen",()=>{ $("liefInvModal").hidden=true });
 an("liefInvMindestSetzen",async ()=>await lfInvMindestAlle());
 an("liefInvSpeichern",()=>lfInvSpeichern());
 const ig=$("liefInvGruppe");
 if(ig)ig.onchange=()=>{ lfInvGruppe=ig.value; lfInvZeichnen() };
 const isf=$("liefInvSuche");
 if(isf)isf.oninput=()=>{ lfInvSuche=isf.value; lfInvZeichnen() };
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
 // v3.241: EIN Filter, drei Ansichten. Wird er irgendwo gewechselt, gilt er
 // ueberall - "an welchem Lieferanten arbeite ich gerade" ist eine Frage,
 // nicht drei. Gruppen- und Suchfilter werden dabei zurueckgesetzt: eine
 // Gruppe des alten Lieferanten gibt es beim neuen meist nicht, und eine
 // Auswahl, die ins Leere zeigt, sieht wie ein Fehler aus.
 const lw=(id,danach)=>{
  const el=$(id);
  if(el)el.onchange=()=>{
   lfLieferant=el.value;
   lfZuordnenGruppe=""; lfInvGruppe="";
   danach();
  };
 };
 lw("liefLieferantWahl",()=>lfZeichnen());
 lw("liefZuordnenLieferant",()=>{ lfZuordnenZeichnen(); lfZeichnen() });
 lw("liefInvLieferant",()=>{ lfInvZeichnen(); lfZeichnen() });
 lw("liefEinkaufLieferant",()=>{ lfEinkaufZeichnen(); lfZeichnen() });
 const le=$("liefExcelLieferant");
 if(le)le.addEventListener("input",()=>lfLieferantHinweisZeichnen());
});
