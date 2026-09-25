"use strict";
// ===========================================================================
// Einrichtungs-Checkliste (v3.183)
//
// Eine neue Firma landet heute in einer fertigen App, in der noch nichts
// steht: kein Material im Katalog, keine Werkstoffe mit Dehnungswerten,
// keine Rollenbreiten, keine Rinne-Ansetztypen. Die App sagt dazu nichts -
// sie zeigt nur leere Auswahlfelder. Diese Karte sagt es.
//
// GRUNDSATZ: Der Haken wird ABGELEITET, nicht gespeichert.
// Es gibt bewusst KEINE Fortschritts-Spalte, kein "einrichtung_erledigt",
// kein localStorage-Merkzettel. Jeder Punkt schaut in dieselben Daten, aus
// denen die App ohnehin arbeitet (settings.materials, measurementMaterials,
// blechRollenbreiten ...). Ein gespeicherter Fortschritt waere eine zweite
// Wahrheit: er koennte "erledigt" sagen, waehrend die Liste leer ist -
// etwa wenn jemand den Katalog spaeter wieder leert. Abgeleitet kann das
// nicht passieren; die Karte kommt dann von selbst zurueck, und das ist
// richtig so.
//
// Die Karte baut ausserdem KEIN eigenes Formular. Jeder Punkt oeffnet die
// bestehende Karte in den Einstellungen (openSettingsTo, js/07). Ein
// eigener Assistent mit eigenen Eingabefeldern waere derselbe Fehler noch
// einmal: zwei Schreibwege auf dieselben Felder.
// ===========================================================================

// Nur Administratoren sehen die Karte: alle Punkte fuehren in Bereiche, die
// ohnehin nur sie aendern duerfen (Register "Geschuetzt" u. a.). Einem
// Monteur eine Liste zu zeigen, die er nicht abarbeiten kann, waere Ballast.
function einrZustaendig(){
 return typeof isAdmin==="function" && isAdmin();
}

// Wird die Karte auch dann gezeigt, wenn nichts mehr offen ist? Reine
// Anzeige-Angabe dieses Geraets (wie lagKandidatenOffen in js/59), kein
// Datenzustand - deshalb steht sie hier und nicht in der Datenbank.
let einrErzwungen=false;

function einrZahl(x){ return Array.isArray(x)?x.length:0 }
function einrText(x){ return String(x==null?"":x).trim() }

// ---- Die Punkte ----------------------------------------------------------
// pflicht:true  = ohne das fehlt der App eine Grundlage zum Rechnen.
// pflicht:false = sinnvoll, aber die App arbeitet auch ohne.
// tab/abschnitt = Ziel in den Einstellungen (js/07, openSettingsTo).
const EINR_PUNKTE=[
 {schluessel:"firma", pflicht:true, tab:"protected", abschnitt:"company",
  titel:"Firmenangaben",
  warum:"Name und Adresse stehen auf jedem Regierapport und jeder Offerte.",
  erledigt:()=>!!einrText(typeof companyName!=="undefined"?companyName:"")
            && !!einrText(typeof companyAddress!=="undefined"?companyAddress:""),
  stand:()=>einrText(typeof companyName!=="undefined"?companyName:"")||"noch nichts eingetragen"},

 {schluessel:"mitarbeiter", pflicht:true, tab:"protected", abschnitt:"employees",
  titel:"Mitarbeiter",
  warum:"Rapporte, Massaufnahmen und Projekte werden Mitarbeitern zugeordnet. Solange nur das eigene Konto da ist, gibt es nichts zu verteilen.",
  erledigt:()=>einrZahl(typeof allProfiles!=="undefined"?allProfiles:[])>=2,
  stand:()=>einrZahl(typeof allProfiles!=="undefined"?allProfiles:[])+" erfasst"},

 {schluessel:"ansaetze", pflicht:true, tab:"protected", abschnitt:"rates",
  titel:"Stundenansätze",
  warum:"Ohne Ansatz bleibt im Regierapport die Spalte mit dem Betrag leer – die Stunden sind erfasst, aber nichts ist gerechnet.",
  erledigt:()=>einrZahl(typeof settings!=="undefined"&&settings?settings.rates:[])>0,
  stand:()=>einrZahl(typeof settings!=="undefined"&&settings?settings.rates:[])+" erfasst"},

 {schluessel:"katalog", pflicht:true, tab:"protected", abschnitt:"materials",
  titel:"Material-Katalog",
  warum:"Regierapport, Ausmass und Lager greifen alle auf denselben Katalog zu. Er lässt sich aus einer Lieferantenliste importieren – „📥 Aus Excel importieren“ steht gleich bei der Karte.",
  erledigt:()=>einrZahl(typeof settings!=="undefined"&&settings?settings.materials:[])>0,
  stand:()=>einrZahl(typeof settings!=="undefined"&&settings?settings.materials:[])+" Positionen"},

 {schluessel:"werkstoffe", pflicht:true, tab:"measurements", abschnitt:"material",
  titel:"Werkstoffe und Dehnungswerte",
  warum:"Aus ihnen rechnet die Massaufnahme, wo eine Dilatation hin muss. Fehlen sie, bleibt die Auswahl im Formular leer.",
  erledigt:()=>einrZahl(typeof measurementMaterials!=="undefined"?measurementMaterials:[])>0,
  stand:()=>einrZahl(typeof measurementMaterials!=="undefined"?measurementMaterials:[])+" erfasst"},

 {schluessel:"rollenbreiten", pflicht:true, tab:"general", abschnitt:"rollenbreiten",
  titel:"Rollenbreiten des Blechlagers",
  warum:"Der Zuschnitt rechnet gegen sie. Ohne eine einzige Breite kann kein Plan entstehen.",
  erledigt:()=>einrZahl(typeof blechRollenbreiten!=="undefined"?blechRollenbreiten:[])>0,
  stand:()=>{
   const l=(typeof blechRollenbreiten!=="undefined"&&Array.isArray(blechRollenbreiten))?blechRollenbreiten:[];
   return l.length?l.join(" / ")+" mm":"noch keine";
  }},

 {schluessel:"bleche", pflicht:true, tab:"lager", abschnitt:"lagerbestand",
  titel:"Blech-Formate",
  warum:"Erst wenn an einer Katalogposition Stärke und Rolle/Tafel stehen, weiss der Zuschnitt, woraus er schneidet. Die App schlägt dabei vor, welche Positionen nach Blech aussehen.",
  erledigt:()=>typeof lagFormate==="function"&&einrZahl(lagFormate())>0,
  stand:()=>(typeof lagFormate==="function"?einrZahl(lagFormate()):0)+" geführt"},

 {schluessel:"rinne", pflicht:false, tab:"measurements", abschnitt:"rinne",
  titel:"Rinne: Ansetztypen",
  warum:"Aussenecke, Ablaufstutzen, Schiebestutzen und so weiter – ohne sie lässt sich eine Rinne nicht abwickeln. Nur nötig, wenn der Betrieb Rinnen macht.",
  erledigt:()=>einrZahl(typeof rinneFittingTypes!=="undefined"?rinneFittingTypes:[])>0,
  stand:()=>einrZahl(typeof rinneFittingTypes!=="undefined"?rinneFittingTypes:[])+" erfasst"},

 {schluessel:"blitzschutz", pflicht:false, tab:"protected", abschnitt:"blitzschutz",
  titel:"Blitzschutz-Katalog",
  warum:"Eigener Katalog für das Blitzschutzausmass, ebenfalls aus Excel importierbar. Nur nötig, wenn der Betrieb Blitzschutz ausmisst.",
  erledigt:()=>einrZahl(typeof blitzschutzMaterials!=="undefined"?blitzschutzMaterials:[])>0,
  stand:()=>einrZahl(typeof blitzschutzMaterials!=="undefined"?blitzschutzMaterials:[])+" Positionen"},

 {schluessel:"logo", pflicht:false, tab:"protected", abschnitt:"company",
  titel:"Firmenlogo",
  warum:"Erscheint auf den Ausdrucken und oben in der App.",
  erledigt:()=>!!einrText(typeof logoUrl!=="undefined"?logoUrl:""),
  stand:()=>einrText(typeof logoUrl!=="undefined"?logoUrl:"")?"hinterlegt":"keines"}
];

// ---- Ableitung -----------------------------------------------------------
// EINE Quelle fuer beide Ansichten (Karte auf der Startseite und die volle
// Liste). Jeder Aufruf rechnet neu - es wird nichts zwischengespeichert,
// damit der Stand nicht hinter den Daten herhinken kann.
function einrStand(){
 return EINR_PUNKTE.map(p=>{
  let fertig=false;
  // Ein Punkt, dessen Pruefung stolpert (fehlende Funktion, alter
  // Offline-Stand), gilt als NICHT erledigt statt die ganze Karte
  // mitzureissen. Lieber ein Haken zu wenig als eine leere Startseite.
  try{ fertig=!!p.erledigt(); }catch(e){ fertig=false; }
  let stand="";
  try{ stand=String(p.stand()); }catch(e){ stand=""; }
  return {schluessel:p.schluessel,titel:p.titel,warum:p.warum,pflicht:p.pflicht,
          tab:p.tab,abschnitt:p.abschnitt,fertig,stand};
 });
}
function einrOffenePflicht(){ return einrStand().filter(p=>p.pflicht&&!p.fertig) }
function einrFertigeZahl(){ return einrStand().filter(p=>p.fertig).length }
function einrAlleFertig(){ return einrOffenePflicht().length===0 }

// Sichtbar, solange eine Pflichtangabe fehlt - oder wenn sie ueber "Mehr"
// ausdruecklich aufgerufen wurde.
function einrKarteNoetig(){
 if(!einrZustaendig())return false;
 return einrErzwungen || einrOffenePflicht().length>0;
}

// ---- Anzeige -------------------------------------------------------------
function einrPunktHtml(p){
 return `<div class="einr-punkt${p.fertig?" einr-fertig":""}">
  <span class="einr-haken">${p.fertig?"✓":"○"}</span>
  <div class="einr-text">
   <b>${esc(p.titel)}</b>${p.pflicht?"":' <span class="einr-freiwillig">freiwillig</span>'}
   <div class="small">${esc(p.warum)}</div>
   <div class="small einr-stand">${esc(p.stand)}</div>
  </div>
  <button type="button" class="a2-knopf a2-knopf-klein ${p.fertig?"a2-k-grau":"a2-k-blau"}"
   data-einr-ziel="${esc(p.schluessel)}">${p.fertig?"ansehen":"erledigen"}</button>
 </div>`;
}

function einrKarteHtml(){
 if(!einrKarteNoetig())return "";
 const liste=einrStand();
 const pflicht=liste.filter(p=>p.pflicht);
 const fertig=pflicht.filter(p=>p.fertig).length;
 const alles=einrAlleFertig();
 return `<div class="a2-karte einr-karte">
  <div class="a2-karte-titel">${alles?"Einrichtung vollständig":"Ihre Einrichtung"}</div>
  <p class="a2-karte-unter">${alles
   ? "Alles Nötige steht. Die freiwilligen Punkte unten sind nur dann nötig, wenn der Betrieb sie braucht."
   : `${fertig} von ${pflicht.length} nötigen Angaben erledigt. Ohne sie rechnet die App an manchen Stellen nicht – bei jedem Punkt steht, warum.`}</p>
  <div class="einr-liste">${liste.map(einrPunktHtml).join("")}</div>
  ${einrErzwungen?`<div class="a2-knopf-reihe">
   <button type="button" class="a2-knopf a2-k-grau a2-k-voll" data-einr-ziel="zu">Schliessen</button>
  </div>`:""}
 </div>`;
}

// ---- Klicks --------------------------------------------------------------
// Ein einziger Zuhoerer am Dokument, wie in den uebrigen Modulen. Er wirkt
// in BEIDEN Ansichten, weil die Karte nur an einer Stelle gezeichnet wird.
document.addEventListener("click",e=>{
 const k=e.target.closest("[data-einr-ziel]");
 if(!k)return;
 const ziel=k.getAttribute("data-einr-ziel");
 if(ziel==="zu"){
  einrErzwungen=false;
  if(typeof a2Zeichnen==="function")a2Zeichnen();
  return;
 }
 const p=EINR_PUNKTE.find(x=>x.schluessel===ziel);
 if(!p)return;
 // Geoeffnet wird die BESTEHENDE Karte - kein Nachbau (siehe Kopfkommentar).
 if(typeof openSettingsTo==="function")openSettingsTo(p.tab,p.abschnitt);
});

// Aufruf aus "Mehr": die Liste auch dann zeigen, wenn nichts mehr offen ist.
function einrAnzeigen(){
 einrErzwungen=true;
 if(typeof a2Zustand==="object"&&a2Zustand)a2Zustand.seite="heute";
 if(typeof a2Zeichnen==="function")a2Zeichnen();
}
