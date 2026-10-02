"use strict";
// ===========================================================================
// Kontrolle der Stammdaten (v3.186)
//
// Die Einrichtungs-Checkliste (js/73) beantwortet die Frage "ist etwas
// ueberhaupt da?". Diese Liste beantwortet die naechste: "stimmt, was da
// ist?". Ein Katalog mit 381 Positionen kann vollstaendig aussehen und
// trotzdem vier Positionen ohne Einheit enthalten, die im Regierapport
// nichts rechnen - das faellt im Alltag niemandem auf, weil niemand 381
// Zeilen durchsieht.
//
// GRUNDSATZ, WIE IN js/73: Der Befund wird ABGELEITET, nie gespeichert.
// Jede Pruefung schaut in dieselben Daten, aus denen die App ohnehin
// arbeitet. Ein gespeicherter Befund waere eine zweite Wahrheit - er koennte
// "alles in Ordnung" sagen, waehrend der Katalog laengst wieder eine Luecke
// hat.
//
// GESPEICHERT WIRD NUR DIE ENTSCHEIDUNG DES MENSCHEN.
// Manche Befunde sind kein Fehler, sondern Absicht: eine Position mit Preis
// 0.00 kann eine Beistellung sein. Fuer solche Faelle gibt es die Abweisung
// (Tabelle kontroll_abweisungen) - sie sagt "wir wissen davon, es bleibt
// so". Sie haengt am STABILEN Schluessel des Gegenstands (EDV-Nr.,
// Werkstoff-Id, Reststueck-Id), nicht an seiner Zeilennummer: sonst wanderte
// die Abweisung beim naechsten Excel-Import auf eine andere Position.
//
// WAS HIER BEWUSST NICHT GEPRUEFT WIRD
// - Produkte ohne Barcode (371 von 372). Eine Meldung, die praktisch jede
//   Zeile trifft, ist keine Kontrolle, sondern Rauschen.
// - Doppelte EDV-Nummern. Die Datenbank laesst sie gar nicht erst zu
//   (UNIQUE company_id, edv_nr) - eine Pruefung darauf koennte nie
//   anschlagen und taeuschte Wachsamkeit vor.
//
// Nichts hier aendert Daten von selbst. Jeder Befund fuehrt in die
// BESTEHENDE Karte, in der er sich beheben laesst (openSettingsTo, js/07) -
// kein zweites Formular auf dieselben Felder.
// ===========================================================================

// Wie die Checkliste: nur Administratoren. Alle Befunde fuehren in Bereiche,
// die ohnehin nur sie aendern duerfen.
function konZustaendig(){
 return typeof isAdmin==="function" && isAdmin();
}

function konText(x){ return String(x==null?"":x).trim() }
function konZahl(x){ const n=Number(x); return Number.isFinite(n)?n:null }
function konListe(x){ return Array.isArray(x)?x:[] }

// ---- Zustand -------------------------------------------------------------
// Abweisungen: "pruefung\u0000gegenstand" -> {id,grund}
let konAbweisungen=Object.create(null);
// Die Materialpositionen, zu denen ein Lagerprodukt gefuehrt wird. Wird nur
// fuer die Pruefung "nie benutzt" gebraucht und deshalb erst beim Oeffnen
// geladen - die Startseite soll deswegen nicht langsamer werden.
let konLagerArtikel=null;          // Set oder null = noch nicht geladen
let konAbgewieseneZeigen=false;    // reine Anzeige dieses Geraets
// v3.207: Sind die Abweisungen wirklich GELESEN worden? Ein leeres
// konAbweisungen heisst sonst zweierlei - "nichts abgehakt" und "noch nicht
// nachgesehen" -, und die Karte auf der Startseite (konKarteHtml) hat bis
// v3.206 den zweiten Fall als den ersten ausgegeben: sie zaehlte laengst
// abgehakte Befunde als offene Fehler, weil sie gezeichnet wurde, bevor
// irgendjemand die Kontrolle geoeffnet und damit die Entscheidungen geholt
// hatte. Wer alles abgehakt hatte, sah nach jedem App-Start wieder "X
// Angaben hindern die App am Rechnen".
let konAbweisungenGeladen=false;
let konAbweisungenLaeuft=false;    // ein Holen ist unterwegs
let konAbweisungenVersuch=0;       // Zeitpunkt des letzten Versuchs (ms)

function konSchluessel(pruefung,gegenstand){
 return String(pruefung)+"\u0000"+String(gegenstand);
}
function konIstAbgewiesen(pruefung,gegenstand){
 return !!konAbweisungen[konSchluessel(pruefung,gegenstand)];
}

// ---- Die Pruefungen ------------------------------------------------------
// schwere:"fehler"  = die App rechnet an dieser Stelle nachweislich falsch
//                     oder gar nicht.
// schwere:"hinweis" = es funktioniert, sieht aber nach einem Versehen aus.
// abweisbar:true    = es gibt einen legitimen Grund, das so zu lassen.
// tab/abschnitt     = wo es sich beheben laesst (js/07, openSettingsTo).
const KON_PRUEFUNGEN=[

 // ---- Gruppe A: Blech und Werkstoff -------------------------------------
 {schluessel:"blech-ohne-werkstoff", gruppe:"Blech und Werkstoff",
  schwere:"fehler", abweisbar:false, tab:"lager", abschnitt:"lagerbestand",
  titel:"Blech ohne Werkstoff",
  warum:"Aus dem Werkstoff kommen die Dehnungswerte. Ohne ihn weiss die Massaufnahme nicht, wie weit zwei Dilatationen auseinander dürfen – gerechnet wird trotzdem, mit dem Rückfallwert.",
  finden:()=>konBleche().filter(b=>b.werkstoff_id===null)
              .map(b=>({id:b.edv_nr,text:b.name+" · "+b.edv_nr+konMassText(b)})) },

 // v3.198: abweisbar. Es gibt Werkstoffe, bei denen KEINE Dehnungswerte der
 // richtige Zustand sind - Blei etwa liegt nicht in langen Bahnen, da ist
 // nichts zu dilatieren. Bis v3.197 blieb so ein Werkstoff dauerhaft als
 // roter Fehler stehen; eine Meldung, die sich nicht erledigen laesst,
 // verdeckt nach einer Weile die, die es ernst meinen.
 //
 // Abgehakt wird der EINZELNE Werkstoff, nicht die Pruefung: ein spaeter
 // angelegter Werkstoff ohne Dehnungswerte meldet sich wieder.
 {schluessel:"werkstoff-ohne-dila", gruppe:"Blech und Werkstoff",
  schwere:"fehler", abweisbar:true, tab:"measurements", abschnitt:"material",
  titel:"Werkstoff ohne Dehnungswerte",
  warum:"Max. Abstand und Abstand ab Fixpunkt sind die beiden Zahlen, aus denen die Dilatation gerechnet wird. Steht dort 0, setzt die Aufnahme keine. Bei einem Werkstoff, der gar nicht dilatiert wird – Blei zum Beispiel –, ist das richtig so: dann lässt sich der Eintrag mit „ist so gewollt“ abhaken.",
  finden:()=>konListe(typeof measurementMaterials!=="undefined"?measurementMaterials:[])
              .filter(w=>!(konZahl(w.max_abstand_mm)>0)||!(konZahl(w.ab_fixpunkt_mm)>0))
              .map(w=>({id:String(w.id),
                        text:konText(w.name)+" · max. "+(konZahl(w.max_abstand_mm)||0)+" mm, ab Fixpunkt "+(konZahl(w.ab_fixpunkt_mm)||0)+" mm"})) },

 {schluessel:"tafel-ohne-mass", gruppe:"Blech und Werkstoff",
  schwere:"fehler", abweisbar:false, tab:"lager", abschnitt:"lagerbestand",
  titel:"Tafel ohne Länge oder Breite",
  warum:"Bei einer Tafel rechnet der Zuschnitt gegen das Tafelformat. Fehlt eine der beiden Zahlen, kann für dieses Blech kein Plan entstehen.",
  finden:()=>konBleche().filter(b=>b.form==="tafel"&&(!(konZahl(b.laenge_mm)>0)||!(konZahl(b.breite_mm)>0)))
              .map(b=>({id:b.edv_nr,
                        text:b.name+" · "+b.edv_nr+" · "+(konZahl(b.laenge_mm)>0?konZahl(b.laenge_mm)+" mm":"Länge fehlt")+" × "+(konZahl(b.breite_mm)>0?konZahl(b.breite_mm)+" mm":"Breite fehlt")})) },

 // ---- Gruppe B: Katalog --------------------------------------------------
 {schluessel:"position-ohne-einheit", gruppe:"Material-Katalog",
  schwere:"fehler", abweisbar:true, tab:"protected", abschnitt:"materials",
  titel:"Position ohne Einheit",
  warum:"Ohne Einheit steht im Regierapport eine Menge ohne Bezug – 4 wovon? Und die Zeile rechnet keinen Betrag.",
  finden:()=>konKatalog().filter(p=>!konText(p.unit))
              .map(p=>({id:p.edv_nr,text:p.name+" · "+p.edv_nr})) },

 {schluessel:"position-ohne-preis", gruppe:"Material-Katalog",
  schwere:"hinweis", abweisbar:true, tab:"protected", abschnitt:"materials",
  titel:"Position mit Preis 0.00",
  warum:"Im Regierapport bleibt der Betrag dieser Zeile leer. Das kann gewollt sein – eine Beistellung des Kunden etwa. Dann hier abhaken, und die Position meldet sich nicht mehr.",
  finden:()=>konKatalog().filter(p=>!(konZahl(p.price)>0))
              .map(p=>({id:p.edv_nr,text:p.name+" · "+p.edv_nr})) },

 // v3.251: Hier stand "position-ohne-produkt" (v3.224). Die Pruefung
 // verglich den Material-Katalog mit lager_varianten - den Produkten der
 // alten Lagerverwaltung. Die ist abgeschafft, es gibt keine Produkte mehr,
 // zu denen eine Position fehlen koennte. Stehen gelassen waere sie die
 // teuerste Art von Kontrolle: eine, die immer gruen meldet, weil ihre
 // Grundlage fehlt - genau der Irrtum, vor dem der Kommentar in Abschnitt
 // "Lieferanten-Lager" weiter unten warnt. Die Gegenprobe dazu steht in
 // pruefstand-kontrollen-v3-186.js, Abschnitt L.

 // ---- Gruppe C: Mehrdeutiges --------------------------------------------
 {schluessel:"blech-mehrdeutig", gruppe:"Mehrdeutiges",
  schwere:"fehler", abweisbar:false, tab:"lager", abschnitt:"lagerbestand",
  titel:"Zwei Bleche mit denselben Merkmalen",
  warum:"Werkstoff, Stärke, Ausführung und Form sind identisch – für den Zuschnitt sind es zwei Namen für dasselbe Blech. Welches im Plan landet, hängt dann an der Reihenfolge und nicht an einer Entscheidung.",
  finden:()=>{
   const gruppen=Object.create(null);
   konBleche().forEach(b=>{
    const k=[b.werkstoff_id===null?"-":b.werkstoff_id,
             konZahl(b.staerke_mm)===null?"-":konZahl(b.staerke_mm),
             konText(b.ausfuehrung).toLowerCase(),
             konText(b.form).toLowerCase(),
             konZahl(b.laenge_mm)===null?"-":konZahl(b.laenge_mm),
             konZahl(b.breite_mm)===null?"-":konZahl(b.breite_mm)].join("|");
    (gruppen[k]=gruppen[k]||[]).push(b);
   });
   return Object.keys(gruppen).filter(k=>gruppen[k].length>1).map(k=>{
    const g=gruppen[k];
    return {id:g.map(b=>b.edv_nr).join("+"),
            text:g.map(b=>b.name+" ("+b.edv_nr+")").join(" und ")+konMassText(g[0])};
   });
  }},

 // ---- Gruppe D: Verwaistes im Lager --------------------------------------
 {schluessel:"rest-unter-mindestmass", gruppe:"Verwaistes im Lager",
  schwere:"hinweis", abweisbar:true, tab:"lager", abschnitt:"reststuecke",
  titel:"Reststück unter dem eigenen Mindestmass",
  warum:"Es liegt im Lager, aber der Zuschnitt greift nie danach – die Firma hat als Mindestmass mehr eingestellt. Entweder wegwerfen oder das Mindestmass senken.",
  finden:()=>{
   const minL=konZahl(typeof restMindestlaenge!=="undefined"?restMindestlaenge:0)||0;
   const minB=konZahl(typeof restMindestbreite!=="undefined"?restMindestbreite:0)||0;
   if(minL<=0&&minB<=0)return [];
   return konListe(typeof reststuecke!=="undefined"?reststuecke:[])
    .filter(r=>r&&r.verbraucht!==true)
    .filter(r=>(minL>0&&(konZahl(r.laenge_mm)||0)<minL)||(minB>0&&(konZahl(r.breite_mm)||0)<minB))
    .map(r=>({id:String(r.id),
              text:(konZahl(r.laenge_mm)||0)+" × "+(konZahl(r.breite_mm)||0)+" mm"
                   +(konText(r.material_name)?" · "+konText(r.material_name):"")
                   +" (Mindestmass "+minL+" × "+minB+" mm)"}));
  }},

 {schluessel:"werkstoff-ohne-blech", gruppe:"Verwaistes im Lager",
  schwere:"hinweis", abweisbar:true, tab:"measurements", abschnitt:"material",
  titel:"Werkstoff, zu dem kein Blech geführt wird",
  warum:"Er steht in der Auswahl der Massaufnahme, aber der Katalog hat keine Position aus diesem Material. Wer ihn wählt, bekommt später kein Blech dazu.",
  finden:()=>{
   const benutzt=new Set(konBleche().filter(b=>b.werkstoff_id!==null).map(b=>String(b.werkstoff_id)));
   return konListe(typeof measurementMaterials!=="undefined"?measurementMaterials:[])
    .filter(w=>!benutzt.has(String(w.id)))
    .map(w=>({id:String(w.id),text:konText(w.name)}));
  }},

 // ---- Gruppe E: Lieferanten-Lager (v3.247) ------------------------------
 //
 // Das Lieferanten-Lager steht seit v3.231 da, in den Kontrollen kam es nicht
 // vor. Aufgenommen werden bewusst NUR zwei Zustaende - die, die man sonst
 // gar nicht sieht:
 //
 //   "158 Artikel ohne Regie-Position" und "Gruppen ohne Muster" stehen
 //   schon am Knopf (🔗 Zuordnen (158 offen)) und im Kopf der
 //   Zuordnen-Ansicht. Sie hier zu wiederholen waere eine zweite Wahrheit
 //   ueber dieselbe Zahl - deshalb stehen sie NICHT hier.
 //
 // Beide Pruefungen haengen an lfGeladen. Ohne geladenes Lager melden sie
 // NICHTS und sagen, warum - die leere Liste waere sonst die Auskunft "alles
 // in Ordnung", und das ist der teure Irrtum - genau der Grund, aus dem
 // "position-ohne-produkt" weiter oben nicht stehen geblieben ist.
 {schluessel:"lieferant-groesse-widerspruch", gruppe:"Lieferanten-Lager",
  schwere:"fehler", abweisbar:true,
  oeffnen:()=>{ if(typeof lfOeffnen==="function")lfOeffnen() },
  titel:"Lieferantenartikel auf einer Position anderer Grösse",
  warum:"Der Artikel zeigt auf eine Regie-Position, deren Grösse nicht zu ihm passt – eine 400er Rinne auf der 250er Position. Wird er im Regierapport gescannt, steht der Preis der anderen Grösse auf der Rechnung, und auffallen würde es niemandem. Seit 3.243 setzt die App das nicht mehr von selbst; bestehende Zuordnungen sind aus der Zeit davor. Fachlich gewollt? Dann hier abhaken.",
  nurMit:()=>typeof lfGeladen!=="undefined"&&lfGeladen===true,
  nichtMoeglich:"Das Lieferanten-Lager ist noch nicht geladen – ohne seine Artikel ist die Frage nicht beantwortbar. Einmal im Lager gewesen, dann steht hier das Ergebnis.",
  finden:()=>{
   if(typeof lfArtikel==="undefined"||!Array.isArray(lfArtikel))return [];
   if(typeof lfGroesseWiderspricht!=="function"||typeof lfRegieVon!=="function")return [];
   return lfArtikel.filter(a=>{
    if(a.archiviert)return false;
    const r=lfRegieVon(a);
    return !!r&&lfGroesseWiderspricht(a,r);
   }).map(a=>{
    const r=lfRegieVon(a);
    return {id:String(a.lieferant||"")+" "+String(a.artikelnr||""),
            text:a.bezeichnung+" · "+a.artikelnr+" → "+r.edv_nr+" · "+r.name
                 +(r.dim?" (Grösse "+r.dim+")":"")};
   });
  } },

 // Ein negativer Bestand ist nie richtig - er heisst nicht "Fehler", sondern
 // "hier fehlt ein Zugang im Lager" (so formuliert seit v3.237, als das
 // Ausbuchen beim Scannen dazukam). Nicht abweisbar: es gibt keinen Grund,
 // eine falsche Zahl stehen zu lassen, und behoben wird sie mit einer
 // Buchung, nicht mit einem Haken.
 {schluessel:"lieferant-negativer-bestand", gruppe:"Lieferanten-Lager",
  schwere:"fehler", abweisbar:false,
  oeffnen:()=>{ if(typeof lfOeffnen==="function")lfOeffnen() },
  titel:"Lieferantenartikel mit negativem Bestand",
  warum:"Es wurde mehr ausgebucht als je eingebucht – meist, weil beim Scannen im Regierapport abgezogen wurde, der Zugang aber nie erfasst war. Der Rapport ist deswegen richtig, das Lager nicht. Im Lager am Artikel einen Zugang oder eine Korrektur buchen; abhaken lässt sich das nicht, weil die Zahl falsch bleibt.",
  nurMit:()=>typeof lfGeladen!=="undefined"&&lfGeladen===true,
  nichtMoeglich:"Das Lieferanten-Lager ist noch nicht geladen – der Bestand ist die Summe seiner Buchungen und ohne sie nicht zu haben.",
  finden:()=>{
   if(typeof lfArtikel==="undefined"||!Array.isArray(lfArtikel))return [];
   if(typeof lfBestand!=="function")return [];
   return lfArtikel.filter(a=>!a.archiviert&&lfBestand(a.id)<0)
    .map(a=>({id:String(a.lieferant||"")+" "+String(a.artikelnr||""),
              text:a.bezeichnung+" · "+a.artikelnr+" · Bestand "
                   +((typeof lfZahlText==="function")?lfZahlText(lfBestand(a.id)):lfBestand(a.id))}));
  } },

 {schluessel:"position-nie-benutzt", gruppe:"Verwaistes im Lager",
  schwere:"hinweis", abweisbar:true, tab:"protected", abschnitt:"materials",
  titel:"Katalogposition, die nie vorkam",
  warum:"Sie steht seit jeher im Katalog, wurde aber in keinem Rapport und keiner Massaufnahme verwendet, und es gibt kein Reststück dazu. Oft eine Zeile aus einer Lieferantenliste, die der Betrieb gar nicht führt.",
  // Ohne Zaehlwerk laesst sich das nicht beantworten - dann wird NICHT
  // geraten, sondern die Pruefung fällt aus (siehe konBefunde).
  nurMit:()=>typeof zwAn==="function"&&zwAn(),
  nichtMoeglich:"Diese Prüfung braucht das Zählwerk. Es ist unter „Was die App gelernt hat“ ausgeschaltet – ohne die Zählung wäre jede Position „nie benutzt“.",
  finden:()=>{
   if(konLagerArtikel===null)return [];      // noch nicht geladen
   return konKatalog().filter(p=>{
    if(typeof zwMaterialAnzahl==="function"&&zwMaterialAnzahl(p.edv_nr)>0)return false;
    if(konLagerArtikel.has(String(p.id)))return false;
    return true;
   }).map(p=>({id:p.edv_nr,text:p.name+" · "+p.edv_nr}));
  }}
];

// ---- Die Daten, auf die die Pruefungen schauen ---------------------------
// Eine Zeile je Katalogposition, aus den parallelen Listen zusammengesetzt.
// Beispiel-Positionen (v3.184) bleiben draussen: sie sind mitgeliefert, nicht
// erfasst - sie zu beanstanden hiesse, der Firma einen Fehler vorzuwerfen,
// den sie nicht gemacht hat, und sie loesen sich ohnehin von selbst auf.
function konKatalog(){
 const zeilen=konListe(typeof settings!=="undefined"&&settings?settings.materials:[]);
 const aus=[];
 zeilen.forEach((m,i)=>{
  if(typeof materialDemo!=="undefined"&&Array.isArray(materialDemo)&&materialDemo[i]===true)return;
  aus.push({
   i,
   id:(typeof materialIds!=="undefined"&&materialIds[i]!==undefined)?materialIds[i]:null,
   edv_nr:konText(m[0]),
   name:konText(m[1])||"(ohne Bezeichnung)",
   dim:konText(m[2]),
   unit:konText(m[3]),
   price:m[4]
  });
 });
 return aus;
}

// Nur die Positionen, die als Blech gefuehrt werden. artikelFormat() (js/01)
// entscheidet darueber an EINER Stelle - hier wird die Regel nicht
// nachgebaut.
function konBleche(){
 if(typeof artikelFormat!=="function")return [];
 return konKatalog().map(p=>{
  const f=p.id===null?null:artikelFormat(p.id);
  if(!f)return null;
  return Object.assign({},p,{
   werkstoff_id:(typeof artikelWerkstoffId==="function")?artikelWerkstoffId(p.id):null,
   staerke_mm:f.staerke_mm, ausfuehrung:f.ausfuehrung, form:f.form,
   laenge_mm:f.laenge_mm, breite_mm:f.breite_mm
  });
 }).filter(x=>x!==null);
}

function konMassText(b){
 const t=[];
 if(konZahl(b.staerke_mm)>0)t.push(konZahl(b.staerke_mm)+" mm");
 if(konText(b.ausfuehrung))t.push(konText(b.ausfuehrung));
 if(konText(b.form))t.push(konText(b.form)==="tafel"?"Tafel":"Rolle");
 return t.length?" · "+t.join(", "):"";
}

// ---- Laden ---------------------------------------------------------------
// Geholt wird erst beim Oeffnen der Kontrolle bzw. beim Zeichnen der
// Startseite, nicht beim Start der App: gebraucht wird es nur hier.
// Nur die Entscheidungen des Menschen. Eigene Funktion, weil die Karte auf
// der Startseite genau sie braucht und sonst nichts - die beiden
// Lager-Abfragen darunter gehoeren zur Pruefung "nie benutzt" und waeren
// beim Zeichnen der Startseite unnoetige Last.
//
// Ein Lesefehler laesst den bisherigen Stand stehen und meldet false. Die
// Abweisungen einfach zu leeren hiesse: jede abgehakte Sache steht wieder
// als Fehler da, nur weil eine Abfrage schiefging.
async function konAbweisungenLaden(){
 if(typeof sb==="undefined")return false;
 konAbweisungenVersuch=Date.now();
 const abw=await sb.from("kontroll_abweisungen").select("id,pruefung,gegenstand,grund");
 if(!abw||abw.error)return false;
 const karte=Object.create(null);
 konListe(abw.data).forEach(a=>{
  karte[konSchluessel(a.pruefung,a.gegenstand)]={id:a.id,grund:a.grund||""};
 });
 konAbweisungen=karte;
 konAbweisungenGeladen=true;
 return true;
}
// v3.251: GEMESSENER FEHLER, bei der Abschaffung der alten Lagerverwaltung
// aufgefallen - und er bestand schon vorher.
//
// Hier wurden bis v3.250 lager_varianten und lagerbestand gelesen: ein
// Produkt oder ein Lagereintrag zu einer Position galt als "sie kommt vor".
// Nur: seit v3.224 legt ein Trigger auf materials JE POSITION automatisch
// eine Variante an. An der Produktivdatenbank gemessen (02.10.2026): 760
// Positionen, 760 mit Variante, KEINE ohne. Damit stand jede Position in
// konLagerArtikel, und "position-nie-benutzt" meldete nie etwas - nicht
// weil alles in Ordnung war, sondern weil ihre Grundlage nichts aussagte.
// Eine Kontrolle, die immer gruen meldet, ist schlimmer als keine: sie wird
// geglaubt.
//
// Geblieben ist, was wirklich eine Verwendung BELEGT: ein Reststueck aus
// diesem Material. Dazu kommt unveraendert das Zaehlwerk
// (zwMaterialAnzahl, in der Pruefung selbst) - das zaehlt die echten
// Verwendungen in Rapporten und Massaufnahmen.
async function konDatenLaden(){
 if(typeof sb==="undefined")return;
 await konAbweisungenLaden();
 const set=new Set();
 konListe(typeof reststuecke!=="undefined"?reststuecke:[])
  .forEach(r=>{ if(r&&r.artikel_id!=null)set.add(String(r.artikel_id)) });
 konLagerArtikel=set;
}

// ---- Ableitung -----------------------------------------------------------
// EINE Quelle fuer Karte, Liste und Zaehler. Jeder Aufruf rechnet neu.
function konBefunde(){
 return KON_PRUEFUNGEN.map(p=>{
  let moeglich=true;
  try{ moeglich=p.nurMit?!!p.nurMit():true; }catch(e){ moeglich=false; }
  let alle=[];
  // Eine Pruefung, die stolpert, faellt aus - sie reisst nicht die ganze
  // Liste mit. Lieber ein Befund zu wenig als eine leere Seite.
  if(moeglich){ try{ alle=konListe(p.finden()); }catch(e){ alle=[]; } }
  const offen=alle.filter(t=>!konIstAbgewiesen(p.schluessel,t.id));
  const abgewiesen=alle.filter(t=>konIstAbgewiesen(p.schluessel,t.id));
  return {schluessel:p.schluessel,gruppe:p.gruppe,titel:p.titel,warum:p.warum,
          schwere:p.schwere,abweisbar:!!p.abweisbar,tab:p.tab,abschnitt:p.abschnitt,
          moeglich,nichtMoeglich:p.nichtMoeglich||"",offen,abgewiesen};
 });
}
function konFehlerZahl(){
 return konBefunde().filter(b=>b.schwere==="fehler").reduce((n,b)=>n+b.offen.length,0);
}
function konHinweisZahl(){
 return konBefunde().filter(b=>b.schwere==="hinweis").reduce((n,b)=>n+b.offen.length,0);
}
function konAbgewiesenZahl(){
 return konBefunde().reduce((n,b)=>n+b.abgewiesen.length,0);
}

// ---- Schreiben -----------------------------------------------------------
// Beides prueft das Ergebnis: ein von RLS geblockter Schreibvorgang meldet
// keinen Fehler, er betrifft still 0 Zeilen (CLAUDE.md 24.1).
async function konAbweisen(pruefung,gegenstand,grund){
 if(typeof sb==="undefined")return {ok:false,meldung:"Keine Verbindung."};
 const {data,error}=await sb.from("kontroll_abweisungen")
  .upsert({pruefung:String(pruefung),gegenstand:String(gegenstand),
           grund:konText(grund)||null,
           profil_id:(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null},
          {onConflict:"company_id,pruefung,gegenstand"})
  .select("id,grund");
 if(error)return {ok:false,meldung:error.message};
 if(!data||!data.length)return {ok:false,meldung:"Nicht gespeichert – fehlt die nötige Berechtigung?"};
 konAbweisungen[konSchluessel(pruefung,gegenstand)]={id:data[0].id,grund:data[0].grund||""};
 return {ok:true};
}
async function konAbweisungWeg(pruefung,gegenstand){
 if(typeof sb==="undefined")return {ok:false,meldung:"Keine Verbindung."};
 const {data,error}=await sb.from("kontroll_abweisungen").delete()
  .eq("pruefung",String(pruefung)).eq("gegenstand",String(gegenstand))
  .select("id");
 if(error)return {ok:false,meldung:error.message};
 if(!data||!data.length)return {ok:false,meldung:"Nichts geändert – fehlt die nötige Berechtigung?"};
 delete konAbweisungen[konSchluessel(pruefung,gegenstand)];
 return {ok:true};
}

// ---- Anzeige -------------------------------------------------------------
function konTrefferHtml(b,t,abgewiesen){
 const knopf=abgewiesen
  ? `<button type="button" class="kon-klein kon-k-grau" data-kon-zurueck="${esc(b.schluessel)}" data-kon-gegenstand="${esc(t.id)}">wieder melden</button>`
  : (b.abweisbar
     ? `<button type="button" class="kon-klein kon-k-grau" data-kon-abweisen="${esc(b.schluessel)}" data-kon-gegenstand="${esc(t.id)}">ist so gewollt</button>`
     : "");
 return `<div class="kon-treffer${abgewiesen?" kon-abgewiesen":""}">
  <span class="kon-treffer-text">${esc(t.text)}</span>${knopf}</div>`;
}

function konPruefungHtml(b){
 if(!b.moeglich){
  return `<div class="kon-pruefung kon-aus">
   <div class="kon-kopf"><span class="kon-marke kon-m-aus">–</span>
    <b>${esc(b.titel)}</b></div>
   <div class="small kon-warum">${esc(b.nichtMoeglich)}</div></div>`;
 }
 const zeigen=konAbgewieseneZeigen?b.abgewiesen:[];
 if(!b.offen.length&&!zeigen.length){
  return `<div class="kon-pruefung kon-ok">
   <div class="kon-kopf"><span class="kon-marke kon-m-ok">✓</span>
    <b>${esc(b.titel)}</b>
    <span class="small kon-stand">nichts gefunden${b.abgewiesen.length?" ("+b.abgewiesen.length+" abgehakt)":""}</span>
   </div></div>`;
 }
 const marke=b.schwere==="fehler"?"kon-m-fehler":"kon-m-hinweis";
 return `<div class="kon-pruefung kon-${b.schwere}">
  <div class="kon-kopf"><span class="kon-marke ${marke}">${b.schwere==="fehler"?"!":"i"}</span>
   <b>${esc(b.titel)}</b>
   <span class="small kon-stand">${b.offen.length}${b.abgewiesen.length?" (+"+b.abgewiesen.length+" abgehakt)":""}</span>
   <button type="button" class="kon-klein kon-k-blau" data-kon-ziel="${esc(b.schluessel)}">öffnen</button>
  </div>
  <div class="small kon-warum">${esc(b.warum)}</div>
  <div class="kon-treffer-liste">
   ${b.offen.map(t=>konTrefferHtml(b,t,false)).join("")}
   ${zeigen.map(t=>konTrefferHtml(b,t,true)).join("")}
  </div>
 </div>`;
}

// Die volle Liste. Sie wird an zwei Stellen gezeigt - in den Einstellungen
// und auf der Startseite der neuen Ansicht -, aber nur EINMAL gebaut.
function konListeHtml(){
 if(!konZustaendig())
  return `<p class="small">Die Kontrolle der Stammdaten steht dem Firmenadministrator offen.</p>`;
 const befunde=konBefunde();
 const fehler=konFehlerZahl(), hinweise=konHinweisZahl(), abgehakt=konAbgewiesenZahl();
 const kopf=fehler
  ? `<b>${fehler} ${fehler===1?"Sache":"Sachen"}, die die App am Rechnen hindern</b>${hinweise?" · "+hinweise+" Hinweis"+(hinweise===1?"":"e"):""}`
  : (hinweise?`Nichts, was die App am Rechnen hindert · ${hinweise} Hinweis${hinweise===1?"":"e"}`
             :`Alles in Ordnung.`);
 const gruppen=[];
 befunde.forEach(b=>{
  let g=gruppen.find(x=>x.name===b.gruppe);
  if(!g){g={name:b.gruppe,liste:[]};gruppen.push(g)}
  g.liste.push(b);
 });
 return `<p class="kon-kopfzeile">${kopf}</p>
  ${abgehakt?`<button type="button" class="kon-zeile-schalter" data-kon-abgehakt="1">
   ${konAbgewieseneZeigen?"▾":"▸"} ${abgehakt} abgehakt${konAbgewieseneZeigen?" – ausblenden":" – anzeigen"}
  </button>`:""}
  ${gruppen.map(g=>`<div class="kon-gruppe">
   <div class="kon-gruppe-titel">${esc(g.name)}</div>
   ${g.liste.map(konPruefungHtml).join("")}
  </div>`).join("")}`;
}

// Die Karte auf der Startseite der neuen Ansicht. Sie erscheint NUR bei
// echten Fehlern - Hinweise sind nicht dringend genug, um jeden Morgen die
// Startseite zu belegen. Wer sie sehen will, ruft die Kontrolle auf.
function konKarteNoetig(){
 // v3.207: ohne die gelesenen Abweisungen wird NICHTS behauptet. Lieber
 // keine Karte als eine, die abgehakte Sachen als Fehler ausgibt.
 return konZustaendig() && konAbweisungenGeladen && konFehlerZahl()>0;
}
// Wird von der Startseite VOR konKarteHtml() gerufen und holt die
// Entscheidungen einmal nach. Danach zeichnet sie die Seite neu - das ist der
// einzige Weg, auf dem die Karte ueberhaupt erscheint.
//
// Ein Fehlversuch (offline, keine Verbindung) wird nicht bei jedem Zeichnen
// wiederholt, sondern hoechstens alle 30 Sekunden.
function konKarteVorbereiten(){
 if(!konZustaendig()||konAbweisungenGeladen||konAbweisungenLaeuft)return;
 // Gefragt wird nur, wenn die Antwort etwas aendern kann. Ohne gelesene
 // Abweisungen ist konFehlerZahl() die groesstmoegliche Zahl - steht sie auf
 // 0, gibt es nichts abzuhaken und nichts zu melden, und die Startseite
 // schickt keine Abfrage los. Das ist der Normalfall einer Firma mit
 // sauberen Stammdaten; die Startseite soll fuer nichts laden.
 if(!(konFehlerZahl()>0))return;
 if(konAbweisungenVersuch&&Date.now()-konAbweisungenVersuch<30000)return;
 konAbweisungenLaeuft=true;
 Promise.resolve().then(konAbweisungenLaden).then(ok=>{
  konAbweisungenLaeuft=false;
  if(ok&&typeof a2Zeichnen==="function"&&typeof a2Aktiv==="function"&&a2Aktiv())a2Zeichnen();
 }).catch(()=>{ konAbweisungenLaeuft=false });
}
function konKarteHtml(){
 if(!konKarteNoetig())return "";
 const n=konFehlerZahl();
 return `<div class="a2-karte kon-karte">
  <div class="a2-karte-titel">Kontrolle der Stammdaten</div>
  <p class="a2-karte-unter">${n} ${n===1?"Angabe hindert":"Angaben hindern"} die App am Rechnen.
  Was genau, steht in der Kontrolle – jeder Punkt führt dorthin, wo er sich beheben lässt.</p>
  <div class="a2-knopf-reihe">
   <button type="button" class="a2-knopf a2-k-blau a2-k-voll" data-kon-oeffnen="1">Kontrolle öffnen</button>
  </div>
 </div>`;
}

// ---- Einbau in die Einstellungen ----------------------------------------
// Dort steht die Kontrolle in BEIDEN Ansichten - die Einstellungen sind
// dieselbe Karte fuer beide. Gezeichnet wird erst, wenn der Abschnitt
// aufgeht: die Pruefungen sollen nicht bei jedem Oeffnen der Einstellungen
// ueber 381 Katalogzeilen laufen.
function konAbschnittZeichnen(){
 const box=(typeof $==="function")?$("kontrollenBox"):document.getElementById("kontrollenBox");
 if(!box)return;
 box.innerHTML=konListeHtml();
}
async function konAbschnittOeffnen(){
 const box=(typeof $==="function")?$("kontrollenBox"):document.getElementById("kontrollenBox");
 if(box)box.innerHTML=`<p class="small">Wird geprüft …</p>`;
 try{ await konDatenLaden(); }catch(e){}
 konAbschnittZeichnen();
}

// Nach einer Aenderung wird beides neu gezeichnet, was gerade offen ist -
// die Karte der neuen Ansicht und der Abschnitt in den Einstellungen.
function konNeuZeichnen(){
 konAbschnittZeichnen();
 if(typeof a2Zeichnen==="function"&&typeof a2Aktiv==="function"&&a2Aktiv())a2Zeichnen();
}

// ---- Klicks --------------------------------------------------------------
// Ein einziger Zuhoerer am Dokument, wie in js/73 - er wirkt in beiden
// Ansichten, weil die Liste nur an einer Stelle gebaut wird.
document.addEventListener("click",async e=>{
 const auf=e.target.closest("[data-kon-oeffnen]");
 if(auf){ await konAnzeigen(); return }

 // Der Abschnitt in den Einstellungen wurde aufgeklappt. js/07 hat die
 // Klasse "open" schon gesetzt (sein Zuhoerer haengt frueher am Dokument),
 // hier wird nur noch geprueft, ob sie jetzt drin ist.
 const kopf=e.target.closest('[data-toggle-section="kontrollen"]');
 if(kopf){
  const ab=kopf.closest(".settings-section");
  if(ab&&ab.classList.contains("open"))await konAbschnittOeffnen();
  return;
 }

 const schalter=e.target.closest("[data-kon-abgehakt]");
 if(schalter){ konAbgewieseneZeigen=!konAbgewieseneZeigen; konNeuZeichnen(); return }

 const ziel=e.target.closest("[data-kon-ziel]");
 if(ziel){
  const p=KON_PRUEFUNGEN.find(x=>x.schluessel===ziel.getAttribute("data-kon-ziel"));
  // Geoeffnet wird die BESTEHENDE Karte - kein Nachbau.
  //
  // v3.247: Nicht jede Stelle liegt in den Einstellungen. Das
  // Lieferanten-Lager ist ein eigener Dialog und wird mit lfOeffnen()
  // geoeffnet (js/82). Eine Pruefung darf deshalb statt tab/abschnitt einen
  // eigenen Weg angeben - der Mechanismus wird erweitert, nicht verdoppelt.
  if(p&&typeof p.oeffnen==="function"){ p.oeffnen(); return }
  if(p&&typeof openSettingsTo==="function")openSettingsTo(p.tab,p.abschnitt);
  return;
 }

 const ab=e.target.closest("[data-kon-abweisen]");
 if(ab){
  const r=await konAbweisen(ab.getAttribute("data-kon-abweisen"),
                            ab.getAttribute("data-kon-gegenstand"),"");
  if(!r.ok&&typeof alert==="function")alert(r.meldung);
  konNeuZeichnen();
  return;
 }

 const zurueck=e.target.closest("[data-kon-zurueck]");
 if(zurueck){
  const r=await konAbweisungWeg(zurueck.getAttribute("data-kon-zurueck"),
                                zurueck.getAttribute("data-kon-gegenstand"));
  if(!r.ok&&typeof alert==="function")alert(r.meldung);
  konNeuZeichnen();
  return;
 }
});

// Aufruf aus "Mehr" und von der Karte: die Kontrolle in den Einstellungen
// oeffnen. Sie hat bewusst keinen eigenen Bildschirm - sie gehoert dorthin,
// wo auch die Felder stehen, die sie beanstandet.
async function konAnzeigen(){
 if(typeof openSettingsTo==="function")openSettingsTo("general","kontrollen");
 await konAbschnittOeffnen();
}
