"use strict";
// ---- Fehleranzeige -------------------------------------------------
// Zeigt Programmfehler unten am Bildschirm an. Ohne das bleibt am Handy
// jeder Fehler unsichtbar und die App wirkt einfach "kaputt".
(function(){
 function zeige(text){
  let box=document.getElementById("fehlerBanner");
  if(!box){
   box=document.createElement("div");
   box.id="fehlerBanner";
   box.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#7f1d1d;color:#fff;font:12px/1.4 system-ui,sans-serif;padding:10px 40px 10px 12px;white-space:pre-wrap;word-break:break-word;max-height:45vh;overflow:auto";
   const zu=document.createElement("button");
   zu.textContent="×";
   zu.style.cssText="position:absolute;top:6px;right:8px;background:transparent;color:#fff;border:0;font-size:20px;line-height:1;padding:0;width:auto;min-height:0";
   zu.onclick=()=>box.remove();
   box.appendChild(zu);
   const p=document.createElement("div");
   p.id="fehlerBannerText";
   box.appendChild(p);
   (document.body||document.documentElement).appendChild(box);
  }
  const ziel=document.getElementById("fehlerBannerText");
  ziel.textContent=(ziel.textContent?ziel.textContent+"\n\n":"")+text;
 }
 window.addEventListener("error",e=>{
  zeige("Fehler: "+(e.message||"unbekannt")+"\n"+(e.filename||"").split("/").pop()+" Zeile "+(e.lineno||"?"));
 });
 window.addEventListener("unhandledrejection",e=>{
  zeige("Fehler (unerledigt): "+((e.reason&&e.reason.message)||e.reason||"unbekannt"));
 });
})();
// ============================================================
// Supabase-Anbindung
// WICHTIG: Vor dem Einsatz die beiden Werte unten eintragen
// (Supabase-Projekt → Settings → API → "Project URL" / "anon public key").
// Ausserdem im SQL-Editor das mitgelieferte supabase-setup.sql einmal
// ausführen und unter Authentication → Settings die
// E-Mail-Bestätigung ("Confirm email") deaktivieren, siehe SETUP.md.
// ============================================================
const SUPABASE_URL="https://nfgryuzkpwjfmdlmevuy.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_U1YsWEdl4X9U94JO4sL5Lg_7_dU0erM";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

let settings={employees:[],rates:[],materials:[]};
let employeeIds=[],rateIds=[],materialIds=[];
let currentProfile=null;
let allProfiles=[];
function profileName(id){
 if(!id)return null;
 const p=allProfiles.find(x=>x.id===id);
 return p?`${p.first_name} ${p.last_name}`:null;
}
// ---------------------------------------------------------------------------
// Pflichtfelder (v2.70, Feedback 6)
// ---------------------------------------------------------------------------
// Ein Feld ist Pflicht, wenn das Speichern ohne es abbricht. Genau diese
// Felder tragen im HTML data-pflicht="1". Der rote Stern wird hier zentral
// ergaenzt - so kann er nicht an einer Stelle vergessen gehen, ist nie Teil
// des Eingabewerts und laesst sich vom Benutzer nicht mit eintippen.
// Zusaetzlich: required + aria-required fuer Tastatur und Screenreader.
function markierePflichtfelder(wurzel){
 const bereich=wurzel||document;
 if(!bereich||!bereich.querySelectorAll)return 0;
 let gesetzt=0;
 bereich.querySelectorAll("[data-pflicht]").forEach(feld=>{
  feld.setAttribute("required","");
  feld.setAttribute("aria-required","true");
  // Das zugehoerige Label ist das erste im umgebenden Block; bei den
  // Projekt-Suchfeldern liegt noch ein .search-Container dazwischen.
  let label=null,el=feld;
  for(let i=0;i<4&&el&&!label;i++){
   el=el.parentElement;
   if(el&&el.querySelector)label=el.querySelector(":scope > label");
  }
  if(!label)return;
  if(label.querySelector(".pflicht-stern"))return;
  const stern=document.createElement("span");
  // "no-print": der Stern ist eine Bedienhilfe am Bildschirm. Im
  // gedruckten Regierapport hat er nichts verloren - dort stand vorher
  // auch der Text "(Pflichtfeld)" schon als .no-print.
  stern.className="pflicht-stern no-print";
  stern.textContent="*";
  stern.title="Pflichtfeld";
  // Der Stern allein sagt einem Screenreader nichts - das Label bekommt
  // deshalb zusaetzlich eine ausgeschriebene Beschriftung.
  stern.setAttribute("aria-hidden","true");
  const text=(label.textContent||"").trim();
  label.appendChild(stern);
  if(!label.getAttribute("aria-label"))label.setAttribute("aria-label",text+" (Pflichtfeld)");
  gesetzt++;
 });
 return gesetzt;
}

// v3.67: "Weiter" soll nicht stillschweigend ueber ein leeres Pflichtfeld
// hinwegblaettern - das noetigt der Installateur sonst dazu, erst am
// letzten Register (Kontrolle) zu merken, dass vorne etwas fehlt.
// ersteUngueltigePflicht() nutzt die vom Browser gefuehrte Gueltigkeit
// (required, siehe markierePflichtfelder oben) und ueberspringt versteckte
// Felder (z. B. ein Mass, das nur bei aktivem Kaestchen gezeigt wird).
function ersteUngueltigePflicht(wurzel){
 const bereich=wurzel||document;
 if(!bereich||!bereich.querySelectorAll)return null;
 const felder=bereich.querySelectorAll("[data-pflicht]");
 for(let i=0;i<felder.length;i++){
  const f=felder[i];
  if(f.offsetParent===null)continue;
  if(typeof f.checkValidity==="function"&&!f.checkValidity())return f;
 }
 return null;
}
// Springt zum ersten fehlenden Pflichtfeld und meldet es zurueck (false).
// true heisst: alles im sichtbaren Bereich ist ausgefuellt, weiterblaettern
// ist unbedenklich.
function pflichtPruefenUndSpringen(wurzel){
 const f=ersteUngueltigePflicht(wurzel);
 if(!f)return true;
 if(f.scrollIntoView)f.scrollIntoView({block:"center",behavior:"smooth"});
 if(typeof f.reportValidity==="function")f.reportValidity();
 else if(f.focus)f.focus();
 return false;
}

// v3.91: Fortschrittsbalken fuer mehrstufige Register-Formulare (alle
// Massaufnahme-Arten) - eine gemeinsame Stelle statt einer eigenen Kopie je
// Modul. Zeigt die Position im Ablauf (Register X von Y), KEINE
// Vollstaendigkeitspruefung aller uebrigen Register: nur das gerade aktive
// Register steht im DOM, die anderen sind es nicht - eine echte "so viele
// Register sind schon fehlerfrei" -Anzeige muesste je Modul jeden Eintrag
// aus dessen eigener Pruefungen()-Funktion einer Registernummer zuordnen,
// was es heute nicht gibt. Die bestehende "Weiter"-Sperre
// (pflichtPruefenUndSpringen) verhindert schon, dass ein Register mit einer
// Luecke verlassen wird - das genuegt hier als Grundlage.
//
// v3.94: raRegisterHakenHtml() ergaenzt genau darauf aufbauend einen kleinen
// Haken am Register-Knopf, OHNE die obige Grenze aufzuheben: ein Register
// gilt als "bestaetigt", sobald es per "Weiter" erfolgreich verlassen wurde
// (dann hat die Weiter-Sperre es schon geprueft) bzw. beim Oeffnen einer
// gespeicherten Aufnahme ohne Fehler in Pruefungen(). Wird DANACH ein Feld in
// einem bereits bestaetigten Register wieder geleert, verschwindet der Haken
// NICHT von selbst - das waere die echte, hier bewusst nicht gebaute
// Vollstaendigkeitspruefung. Jedes Modul haelt sein eigenes bestaetigt-Set
// (z.B. dfaBestaetigt) und uebergibt es hier nur zur Anzeige.
function raRegisterHakenHtml(bestaetigt,nr){
 return (bestaetigt&&bestaetigt.has(nr))
  ?'<span class="ra-register-haken" title="Bereits ausgefüllt">✓</span>':"";
}
function raFortschrittHtml(schritt,gesamt){
 if(!(gesamt>1))return "";
 const proz=Math.max(0,Math.min(100,Math.round((schritt/gesamt)*100)));
 return `<div class="ra-fortschritt">Register ${schritt} von ${gesamt}
<div class="ra-fortschritt-bahn"><div class="ra-fortschritt-balken" style="width:${proz}%"></div></div>
</div>`;
}

// v3.67: ein kleiner Chip neben einem leeren Pflichtfeld, das einen
// Firmen-Richtwert hat (Einstellungen oder Katalog). Antippen uebernimmt
// den Wert - der Nutzer sieht die Zahl vorher und bestaetigt sie aktiv,
// statt dass sie schon unbemerkt im Feld steht. feldId muss die id des
// Zahlenfelds sein.
function vorschlagChip(feldId,wert){
 const n=Number(wert);
 if(wert===""||wert===null||wert===undefined||!Number.isFinite(n))return "";
 return `<button type="button" class="vorschlag-chip no-print" data-vorschlag-fuer="${feldId}" `
  +`data-vorschlag-wert="${n}" title="Richtwert übernehmen">Richtwert ${n}</button>`;
}
// Eine einzige, ganz oben delegierte Stelle fuer alle Vorschlag-Chips der
// App - jedes Modul erzeugt nur die Chip-Markierung, das Uebernehmen passiert
// hier zentral. dispatchEvent statt direktem Aufruf, damit jedes Modul mit
// seinem eigenen, bereits vorhandenen input/change-Handler reagiert.
document.addEventListener("click",e=>{
 const chip=e.target.closest(".vorschlag-chip");
 if(!chip)return;
 const feld=document.getElementById(chip.dataset.vorschlagFuer);
 if(!feld)return;
 feld.value=chip.dataset.vorschlagWert;
 feld.dispatchEvent(new Event("input",{bubbles:true}));
 feld.dispatchEvent(new Event("change",{bubbles:true}));
 feld.focus();
 // Der Chip verschwindet sofort, auch wenn das Modul das Feld aus
 // Fokus-Gruenden nicht komplett neu zeichnet (siehe die vielen "live"-
 // Funktionen in den Aufnahme-Modulen).
 chip.remove();
});

function isAdmin(){
 // Administrator ist, wer das Recht "admin" hat (siehe 05a-rechte.js).
 return !!(currentProfile&&currentProfile.role==="admin");
}
let companyName="PETER KÜNZI AG";
let companyAddress="";
let logoUrl="";
let defaultVat="8.1 %";
let logoDataUrl=null;
let recentCount=Number(localStorage.getItem("sd_recentCount"))||5;
let isDirty=false;
let darkMode=localStorage.getItem("sd_darkMode")==="ja";
let defaultRate=localStorage.getItem("sd_defaultRate")||"";
let photoQuality=localStorage.getItem("sd_photoQuality")||"schnell";
// v3.07 Aufgabenzentrale auf dem Startbildschirm.
// aufgabenOffenStart: je Geraet - startet die Karte zugeklappt oder offen.
//   Der Klick auf die Karte gilt nur fuer jetzt, diese Einstellung fuer den
//   Start. Zwei Quellen fuer denselben Wert waeren verwirrend.
// workflowAktiv: firmenweit aus app_settings.workflow_aktiv. REINE
//   ANZEIGE-EINSTELLUNG - abgesichert ist der Ablauf ausschliesslich
//   serverseitig (schuetze_measurement_workflow() und die sechs
//   measurement_*-Funktionen), nicht hierdurch.
let aufgabenOffenStart=localStorage.getItem("sd_aufgabenOffen")==="auf";
let workflowAktiv=true;
document.documentElement.classList.toggle("dark",darkMode);
function photoQualitySettings(){
 return photoQuality==="hoch"?{maxDim:2200,quality:0.9}:{maxDim:1400,quality:0.75};
}
const EINLAUFBLECH_STANDARD=Object.freeze({stoss_laenge:2000,ueberlappung:70,gehrungszugabe:100,umschlag_oben:12,umschlag_unten:12,rest_schwelle:500,end_zugabe:10,gava_abstand:500});
// Standardwerte für beide Einlaufblech-Typen. Gespeicherte Werte des Geräts
// haben Vorrang – zurücksetzen geht über den Knopf in den Einstellungen.
let einlaufblechSettings=JSON.parse(localStorage.getItem("sd_einlaufblechSettings")||"null")||{...EINLAUFBLECH_STANDARD};
if(einlaufblechSettings.end_zugabe===undefined)einlaufblechSettings.end_zugabe=10;
// Abstand der Haltebleche (GAVA). Nur Einlaufblech gerade liest ihn.
if(einlaufblechSettings.gava_abstand===undefined)einlaufblechSettings.gava_abstand=500;
let einlaufblechKonischSettings=JSON.parse(localStorage.getItem("sd_einlaufblechKonischSettings")||"null")||{...EINLAUFBLECH_STANDARD};
if(einlaufblechKonischSettings.end_zugabe===undefined)einlaufblechKonischSettings.end_zugabe=10;
// Kehle: Zuschnittmasse der Segmente. Gleiche Form wie EINLAUFBLECH_STANDARD,
// damit teileLaengeInStuecke() unveraendert damit rechnen kann.
const KEHLE_STANDARD=Object.freeze({stoss_laenge:2000,ueberlappung:70,rest_schwelle:500});
let kehleSettings=JSON.parse(localStorage.getItem("sd_kehleSettings")||"null")||{...KEHLE_STANDARD};
if(kehleSettings.rest_schwelle===undefined)kehleSettings.rest_schwelle=KEHLE_STANDARD.rest_schwelle;
let blitzschutzMaterials=[];
let rinneFittingTypes=[];
// Material-Katalog für die Dropdowns bei jeder Massaufnahme-Art (Einstellungen
// → Massaufnahmen → "Material"). max_abstand_mm/ab_fixpunkt_mm werden nur von
// Rinne Halbrund und Mauerabdeckung für die SIA-271-Dila-/Schieber-Berechnung
// benutzt, bei den übrigen Arten ist das Dropdown rein informativ.
let measurementMaterials=[];
// Findet einen Material-Eintrag anhand der neuen ID oder eines alten, vor der
// Umstellung fest gespeicherten Schlüssels (z. B. "titanzink") – so bleiben
// bereits gespeicherte Massaufnahmen lesbar. Ohne Treffer ein fester
// Rückfallwert, damit die Dila-Berechnung nie abbricht.
const MEASUREMENT_MATERIAL_FALLBACK={id:null,name:"Titanzink (Standard)",legacy_key:"titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500};
function findMeasurementMaterial(value){
 if(value===undefined||value===null||value==="")return null;
 return measurementMaterials.find(m=>String(m.id)===String(value))
  ||measurementMaterials.find(m=>m.legacy_key===value)
  ||null;
}
function measurementMaterialOrFallback(value){
 return findMeasurementMaterial(value)||measurementMaterials.find(m=>m.legacy_key==="titanzink")||MEASUREMENT_MATERIAL_FALLBACK;
}
// Füllt alle Material-Dropdowns (Klasse "meas-material-select") mit dem
// aktuellen Katalog, ohne die laufende Auswahl zu verlieren.
function renderMeasMaterialOptions(){
 document.querySelectorAll(".meas-material-select").forEach(sel=>{
  const bisher=sel.value;
  const pflicht=sel.dataset.measMaterialRequired==="1";
  const optionen=measurementMaterials.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
  sel.innerHTML=(pflicht?"":'<option value="">– keine Auswahl –</option>')+optionen;
  const treffer=findMeasurementMaterial(bisher);
  if(treffer)sel.value=String(treffer.id);
  else if(pflicht&&measurementMaterials.length)sel.value=String(measurementMaterialOrFallback(null).id||measurementMaterials[0].id);
  else sel.value=bisher&&!pflicht?"":sel.value;
 });
}
// Mass des Dilatationselements (Rinne Halbrund), je angrenzendem Stück.
// Negativ = wird abgezogen. Firmenweit, kommt aus app_settings.
let rinneDilaMass=-165;
// v3.79: eigener, zweiter Wert NUR für die Ausmass-Länge (Feedback
// 11.09.2026) - unabhängig vom obigen rinneDilaMass, das ausschliesslich den
// Zuschnitt betrifft. 0 = keine Änderung, nichts wird erfunden, solange die
// Firma keinen Wert einträgt.
let rinneDilaAusmassMass=0;
// Rinnen-Normlängen je Material und Grösse als Firmeneinstellung:
// {"<material_id>|<groesse>":[laengen_mm]}. Leer = Vorgabe der App.
let rinneNormlaengen={};
// Rollenbreiten des Blechlagers, firmenweit aus app_settings. Leer =
// noch nichts hinterlegt, dann gilt die Vorgabe 1000/670 (js/29).
let blechRollenbreiten=[];
// Schnittbreite der Schere/Saege, firmenweit aus app_settings. 0 = wie bis
// v3.03, dann aendert sich keine bestehende Zahl. Wird bei jedem Schnitt
// abgezogen (js/29).
let blechSchnittfuge=0;
// Ab welcher Laenge sich das Aufheben eines Restes lohnt, firmenweit.
let restMindestlaenge=1000;
// Das Restsuecke-Lager der Firma, geladen wie die uebrigen Kataloge.
let reststuecke=[];
// v3.29: die bereits verwendeten Reste MIT Bezug (js/05). Bis v3.28 wurde
// nur "verbraucht" gespeichert und nirgends gelesen - ein verwendeter Rest
// verschwand spurlos. Bewusst eine getrennte Liste: die freien Reste sind
// Arbeitsvorrat, diese hier sind Nachschau.
let restVerwendet=[];
// v3.27: Lagerbestand, Mindestbreite und der Schalter fuer die
// Reststueckverwendung. Die Vorgaben entsprechen den Spalten-Defaults der
// Datenbank, damit die App vor dem ersten Laden nichts anderes annimmt.
let lagerbestand=[];
let restMindestbreite=100;
let resteImZuschnitt=false;
// Masse für die Mauerabdeckung, firmenweit aus app_settings.
let madBodenMass=0;
let madSchieberMass=0;
// v3.82: eigene, unabhaengige Ausmass-Zugaben (wie rinneDilaAusmassMass seit
// v3.79) - madBodenMass/madSchieberMass wirken weiterhin nur auf den
// Zuschnitt (Materialbedarf), diese beiden nur auf die Ausmass-Laenge.
let madBodenAusmassMass=0;
let madSchieberAusmassMass=0;
// v3.84: Zugabe fuer die Gehrung an einer Ecke (Segment mit Winkel != 0) -
// bisher bekam eine Ecke gar keine Zugabe, obwohl dort ein Gehrschnitt
// anfaellt. Vorgabe 100mm fuer den Zuschnitt (Materialbedarf), 0mm fuers
// Ausmass - wie bei Boden/Schieber ein eigener, unabhaengiger Wert.
let madGehrungMass=100;
let madGehrungAusmassMass=0;
// Lukarne Seitenverkleidung, firmenweit aus app_settings.
// Achsabstand und Hilfsriss sind Vorschlagswerte für eine neue Massaufnahme,
// die Zugaben werden dem Zuschnitt jeder Schar zugerechnet.
let lukAchsabstand=500;
let lukHilfsriss=600;
let lukZugabeBreite=0;
let lukZugabeLaenge=0;
// Bezeichnungen der Massaufnahme-Arten – an einer einzigen Stelle, damit
// eine neue Art nicht in fünf Dateien nachgetragen werden muss.
const MEAS_TYPE_LABELS=Object.freeze({
 skizze_foto:"Skizze/Foto",
 einlaufblech_gerade:"Einlaufblech gerade",
 rinne_halbrund:"Dachrinne",
 einlaufblech_konisch:"Einlaufblech konisch",
 freies_profil:"Freies Profil",
 mauerabdeckung:"Mauerabdeckung",
 lukarne:"Lukarne Seitenverkleidung",
 anschlussblech:"Ort- und Seitenbleche",
 einfassung_rund:"Einfassung Rund",
 kamineinfassung:"Kamineinfassung",
 dachfenstereinfassung:"Dachfenstereinfassung",
 kehle:"Kehle",
 rinne:"Rinne"
});
// Welcher Einstellungs-Abschnitt gehoert zu welcher Massaufnahme-Art?
// Der Knopf "⚙️ Einstellungen" im Massaufnahme-Formular springt damit
// direkt an die richtige Stelle statt nur das Register zu oeffnen.
// Alle Abschnitte liegen im Register "Massaufnahmen".
// Steht hier nichts, gibt es fuer die Art keinen eigenen Abschnitt und
// es wird nur das Register geoeffnet.
const MEAS_TYPE_SETTINGS_SECTION=Object.freeze({
 skizze_foto:"material",            // nur Materialkatalog
 einlaufblech_gerade:"einlaufblech",
 rinne_halbrund:"rinne",            // Anschlusstypen
 einlaufblech_konisch:"einlaufblech-konisch",
 freies_profil:"material",          // kein eigener Abschnitt, nur Material
 mauerabdeckung:"mauerabdeckung",
 lukarne:"lukarne",
 anschlussblech:"anschlussblech",
 einfassung_rund:"einfassung-rund",
 kamineinfassung:"kamineinfassung",
 dachfenstereinfassung:"dachfenstereinfassung",
 kehle:"kehle",                    // Stoss/Ueberlappung, seit v2.83
 rinne:"rinne-profil"               // Standardprofil & Ansetztypen
});
// Dasselbe fuer die beiden Ausmass-Arten (Register "Geschützt").
const AM_TYPE_SETTINGS_SECTION=Object.freeze({
 offerte_erfassen:"",               // keine eigenen Einstellungen
 blitzschutz_ausmass:"blitzschutz"
});
// Module in Entwicklung: nur für Administratoren sichtbar.
// Schlüssel: "meas:<art>" bzw. "am:<art>" -> true = versteckt für alle anderen.
let moduleImTest={};
// v3.94: unter welcher Kategorie (Steildach/Flachdach/Allgemein) eine
// Massaufnahme-Art bei der Auswahl einer neuen Massaufnahme erscheint.
// Gilt für alle Firmen (Systemadmin-Einstellung, wie moduleImTest), wird
// mit derselben system_settings-Zeile geladen. MEAS_KATEGORIEN_STANDARD ist
// nur der Ausgangswert, bevor ein Systemadmin ihn je bearbeitet hat -
// measKategorien (die geladene Firmen-uebergreifende Einstellung) hat
// immer Vorrang, siehe measKategorie().
const MEAS_KATEGORIEN=Object.freeze(["steildach","flachdach","allgemein"]);
const MEAS_KATEGORIEN_LABELS=Object.freeze({steildach:"Steildach",flachdach:"Flachdach",allgemein:"Allgemein"});
const MEAS_KATEGORIEN_STANDARD=Object.freeze({
 skizze_foto:"allgemein",
 einlaufblech_gerade:"steildach",
 rinne_halbrund:"steildach",
 einlaufblech_konisch:"steildach",
 freies_profil:"allgemein",
 mauerabdeckung:"flachdach",
 lukarne:"steildach",
 anschlussblech:"flachdach",
 einfassung_rund:"flachdach",
 kamineinfassung:"steildach",
 dachfenstereinfassung:"steildach",
 kehle:"steildach",
 rinne:"steildach"
});
let measKategorien={};
function measKategorie(art){
 const k=(measKategorien&&measKategorien[art])||MEAS_KATEGORIEN_STANDARD[art]||"allgemein";
 return MEAS_KATEGORIEN.includes(k)?k:"allgemein";
}
// Dieselben Symbole wie bisher in der (bis v3.93 statischen) Kartenauswahl.
const MEAS_TYPE_ICONS=Object.freeze({
 skizze_foto:"📷", einlaufblech_gerade:"📐", rinne_halbrund:"🏠",
 einlaufblech_konisch:"📐", freies_profil:"📐", mauerabdeckung:"🧱",
 lukarne:"🏚️", anschlussblech:"📐", einfassung_rund:"⭕",
 kamineinfassung:"🧱", dachfenstereinfassung:"🪟", kehle:"📏", rinne:"🚰"
});
// v3.94: die Kartenauswahl fuer eine neue Massaufnahme nach Kategorie
// gruppiert (Steildach/Flachdach/Allgemein, siehe MEAS_KATEGORIEN_STANDARD/
// measKategorien) statt einer einzigen langen Liste. Wird nach dem Login
// einmal gerufen (js/05a-rechte.js applyRechte(), nach applyModuleTest())
// - die Sichtbarkeits-Sperre selbst bleibt in applyModuleTest() unveraendert,
// sie greift ueber [data-choose-meas-type] unabhaengig von der Gruppierung.
function renderMeasTypeChooser(){
 const box=$("measTypeChooserBody");
 if(!box)return;
 const gruppen={steildach:[],flachdach:[],allgemein:[]};
 Object.keys(MEAS_TYPE_LABELS).forEach(art=>gruppen[measKategorie(art)].push(art));
 box.innerHTML=MEAS_KATEGORIEN.map(kat=>{
  if(!gruppen[kat].length)return "";
  const knoepfe=gruppen[kat].map(art=>
   `<button type="button" class="start-nav-btn blue" data-choose-meas-type="${esc(art)}"><span class="start-nav-icon">${esc(MEAS_TYPE_ICONS[art]||"📐")}</span><span>${esc(MEAS_TYPE_LABELS[art])}</span></button>`).join("");
  return `<div class="settings-section open" data-section="meastype-${kat}">
<div class="settings-section-head" data-toggle-section="meastype-${kat}"><h2>${esc(MEAS_KATEGORIEN_LABELS[kat])}</h2><span class="settings-section-chevron">›</span></div>
<div class="settings-section-body"><div class="start-nav">${knoepfe}</div></div>
</div>`;
 }).join("");
}
// ID der eigenen app_settings-Zeile. Wird beim Laden gesetzt und beim
// Speichern als WHERE-Bedingung gebraucht - PostgREST weist ein UPDATE
// ohne Filter ab ("UPDATE requires a WHERE clause").
let appSettingsId=null;
let isMike=false;
let allProjects=[],currentProjectId=null,currentReportId=null;
let currentReportMeta={};
// Wer eine Massaufnahme/ein Ausmass erstellt/zuletzt geändert hat – für die
// Fusszeile im PDF. Gleiches Prinzip wie currentReportMeta beim Regierapport,
// weil buildMeasurementFromForm()/buildAusmassFromForm() diese Angaben nicht
// aus den Formularfeldern kennen.
let currentMeasurementMeta={};
let currentAusmassMeta={};
let projectReportsCache=[];
let projectMeasurementsCache=[];
let projectAusmassCache=[];
let projectFilesCache=[];
let recentMeasurementsCache=[];
let recentReportsCache=[];
let globalSearchCache=[];
let recentAusmassCache=[];
let measEditReturnTo="measurementsModal";
let works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:"",rateName:"",hours:0}];
let mats=[];
let selectedSheet=null,cuts=[{l:"",b:"",q:1}];

// ---- Objektadresse eines Arbeitsdatensatzes (v2.44) -------------
// Einzige Quelle ist projects.object - das Pflichtfeld "Adresse" des
// Projekts. Weder measurements noch ausmass haben ein eigenes
// Adressfeld, und reports.object ist "Objekt / Gebaeudeteil" und damit
// etwas anderes. Es wird deshalb keine Adresse dupliziert und keine
// neue Spalte gebraucht.
function projektAdresse(projectId){
 if(!projectId)return "";
 const p=allProjects.find(x=>x.id===projectId);
 return p?String(p.object||"").trim():"";
}
// Fallback-Regel (Auftrag v2.44, Abschnitt 4):
//  1. Adresse des zugehoerigen Projekts
//  2. vorhandene eigene Bezeichnung des Datensatzes (Massaufnahme/
//     Ausmass: Titel, Regierapport: Objekt/Gebaeudeteil)
//  3. "Ohne Adresse"
// Erfunden wird nichts - Stufe 2 zeigt nur, was wirklich gespeichert ist.
function eintragAdresse(row,ersatz){
 const adr=projektAdresse(row&&row.project_id);
 if(adr)return adr;
 const e=String(ersatz==null?"":ersatz).trim();
 return e||"Ohne Adresse";
}
// Haupttitel eines Projekts (v2.45). Ein Projekt wird ueber seine
// Adresse erkannt - dieselbe Quelle (projects.object) und dieselbe
// dreistufige Fallback-Regel wie bei den Arbeitsdatensaetzen, nur ist
// Stufe 2 hier die eigene Bezeichnung des Projekts (der Projektname).
// Der Projektname geht dadurch nicht verloren: er bleibt ueberall als
// Zusatzangabe stehen.
function projektTitel(p){
 if(!p)return "Ohne Adresse";
 const adr=String(p.object||"").trim();
 if(adr)return adr;
 const name=String(p.name||"").trim();
 return name||"Ohne Adresse";
}
// ---- Geschaeftsstatus eines Projekts (v2.46) --------------------
// Vier Werte, gespeichert in projects.status (NOT NULL, Default 'offen',
// CHECK auf genau diese Menge). Bewusst getrennt vom Arbeitsstand aus
// v2.42: der Arbeitsstand sagt, WAS ERFASST IST (automatisch aus den
// vorhandenen Daten), der Status sagt, WIE ES GESCHAEFTLICH STEHT (nur
// von einem Menschen gesetzt). Ebenso getrennt von 'archived' - das ist
// eine reine Sichtbarkeitsfrage und bleibt unveraendert bestehen.
// Nie nur die Farbe traegt die Information: jeder Status hat zusaetzlich
// Zeichen und Text.
const PROJEKT_STATUS=[
 {wert:"offen",         label:"Offen",         icon:"○"},
 {wert:"in_arbeit",     label:"In Arbeit",     icon:"◐"},
 {wert:"abgeschlossen", label:"Abgeschlossen", icon:"✓"},
 {wert:"storniert",     label:"Storniert",     icon:"×"}
];
// Unbekannter oder fehlender Wert faellt auf "Offen" zurueck - so bleibt
// die Oberflaeche auch dann heil, wenn spaeter ein Wert dazukommt, den
// diese Programmversion noch nicht kennt.
function projektStatusInfo(wertOderProjekt){
 const wert=wertOderProjekt&&typeof wertOderProjekt==="object"?wertOderProjekt.status:wertOderProjekt;
 return PROJEKT_STATUS.find(x=>x.wert===wert)||PROJEKT_STATUS[0];
}
function projektStatusText(wertOderProjekt){
 const s=projektStatusInfo(wertOderProjekt);
 return s.icon+" "+s.label;
}
function projektStatusBadge(wertOderProjekt){
 const s=projektStatusInfo(wertOderProjekt);
 return `<span class="pstatus pstatus-${s.wert}">${s.icon} ${esc(s.label)}</span>`;
}
// Ein Vorschlag im Projekt-Auswahlfeld (v2.48). Genau eine Stelle fuer
// alle drei Auswahlfelder (Regierapport, Massaufnahme, Ausmass) statt
// drei fast gleicher Kopien. Adresse ist die Hauptinformation, der
// Projektname steht als Zusatz darunter - dieselbe Gewichtung wie in
// Projektliste, Cockpit und Suche seit v2.44/v2.45.
// Fehlt die Adresse, faellt projektTitel() auf den Projektnamen zurueck;
// der Name wird dann nicht doppelt angezeigt. Es wird nie ein leerer
// oder erfundener Text erzeugt.
function projektVorschlagHtml(p,attribut){
 const titel=projektTitel(p);
 const zusatz=infoZeileOhne(titel,p.name,p.order_no,p.customer);
 return `<div class="item projekt-vorschlag" ${attribut}="${p.id}"><b>${esc(titel)}</b>`
  +(zusatz?`<span>${esc(zusatz)}</span>`:"")+`</div>`;
}
// Zusatzzeile aus mehreren echten Angaben, leere Teile fallen weg.
function infoZeile(...teile){
 return teile.map(x=>String(x==null?"":x).trim()).filter(Boolean).join(" · ");
}
// Wie infoZeile(), laesst aber Angaben weg, die bereits der Haupttitel
// sind - sonst stuende bei fehlender Projektadresse der Ersatztitel
// zweimal untereinander (v2.44).
function infoZeileOhne(haupttitel,...teile){
 const h=String(haupttitel==null?"":haupttitel).trim();
 return infoZeile(...teile.filter(x=>String(x==null?"":x).trim()!==h));
}

const $=id=>document.getElementById(id);
// Verzögert wiederholte Aufrufe (Suchfelder, Auto-Speichern).
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
// supabase-js liefert bei einer Edge Function mit Nicht-2xx-Status nur die
// generische Meldung "Edge Function returned a non-2xx status code" in
// error.message – die eigentliche, vom Server gesendete Meldung steckt im
// Response-Objekt unter error.context und muss dort extra ausgelesen werden.
async function edgeFunctionErrorMessage(error,fallback){
 if(error&&error.context&&typeof error.context.json==="function"){
  try{
   const body=await error.context.json();
   if(body&&body.error)return body.error;
  }catch(e){/* Antwort war kein JSON */}
 }
 return (error&&error.message)||fallback||"Unbekannter Fehler.";
}

// ---------------------------------------------------------------------------
// Barcode-Scan ueber die Geraetekamera (v3.102)
//
// Eine einzige Stelle statt mehrfacher Kamera-Logik - genutzt von der
// Lagerverwaltung (js/68, Artikel per Scan buchen) und vom Material-Katalog
// in den Einstellungen (js/08, Barcode an einem Artikel hinterlegen).
//
// Die Bibliothek (ZXing, dieselbe cdn.jsdelivr.net-Quelle wie supabase-js
// und xlsx) wird erst beim ERSTEN Scan nachgeladen, nicht bei jedem
// App-Start - anders als die beiden anderen, wird sie nicht auf jedem
// Bildschirm gebraucht.
// ---------------------------------------------------------------------------
let zxingLadenPromise=null;
function zxingLaden(){
 if(typeof ZXing!=="undefined")return Promise.resolve();
 if(zxingLadenPromise)return zxingLadenPromise;
 zxingLadenPromise=new Promise((resolve,reject)=>{
  const s=document.createElement("script");
  s.src="https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js";
  s.onload=()=>{ if(typeof ZXing!=="undefined")resolve(); else reject(new Error("Scan-Bibliothek antwortet nicht.")) };
  s.onerror=()=>{ zxingLadenPromise=null; reject(new Error("Scan-Bibliothek konnte nicht geladen werden - Internetverbindung prüfen.")) };
  document.head.appendChild(s);
 });
 return zxingLadenPromise;
}

let barcodeScanCodeReader=null, barcodeScanControls=null, barcodeScanAktuellerCallback=null;

// Dieselbe Wunsch-Vorgabe wie beim ersten Oeffnen (siehe barcodeScannen) -
// wird auch fuer den Stream-Neustart beim Tippen-zum-Fokussieren gebraucht,
// deshalb in eine eigene Funktion ausgelagert statt zweimal hingeschrieben.
function barcodeScanWunschKonstraint(){
 return {video:{facingMode:{ideal:"environment"},
  width:{ideal:1920},height:{ideal:1080},advanced:[{focusMode:"continuous"}]}};
}

// Kamera stoppen und Overlay schliessen. Sicher mehrfach aufrufbar (z. B.
// einmal beim erfolgreichen Scan, einmal beim Abbrechen-Klick danach). Stoppt
// den Stream direkt ueber das <video>-Element (nicht nur ueber die
// ZXing-Controls) - seit v3.107 kann ein Tippen-zum-Fokussieren einen neuen
// Stream in denselben <video> eingehaengt haben, von dem die urspruenglichen
// ZXing-Controls nichts wissen; ohne diesen direkten Stopp bliebe die Kamera
// nach dem Schliessen aktiv.
function barcodeScanSchliessen(){
 try{ if(barcodeScanControls&&barcodeScanControls.stop)barcodeScanControls.stop(); }catch(e){}
 try{ if(barcodeScanCodeReader&&barcodeScanCodeReader.reset)barcodeScanCodeReader.reset(); }catch(e){}
 try{
  const stream=$("barcodeScanVideo")&&$("barcodeScanVideo").srcObject;
  if(stream&&stream.getTracks)stream.getTracks().forEach(t=>t.stop());
 }catch(e){}
 barcodeScanControls=null;
 if($("barcodeScanOverlay"))$("barcodeScanOverlay").hidden=true;
}
if($("barcodeScanAbbrechen"))$("barcodeScanAbbrechen").onclick=barcodeScanSchliessen;

// v3.109: direkter Versuch per EINZELFOTO statt Dauerautofokus. Der
// Anwender bestaetigte, dass die normale Kamera-App seines Geraets auf
// demselben Barcode aus derselben Distanz problemlos scharfstellt - das
// Problem liegt also nicht am Objektiv/Mindestabstand, sondern daran, dass
// der DAUERAUTOFOKUS eines laufenden Video-Streams (was Stufe 1/2 unten
// ansteuern) auf diesem Geraet schlechter nachfuehrt als die
// EINZELBILD-Aufnahme einer Kamera-App. Die `ImageCapture`-API
// (`takePhoto()`) nutzt denselben Einzelbild-Aufnahmepfad wie eine
// Foto-App (inkl. deren eigenem Fokussier-vor-Aufnahme-Verhalten), nicht
// den Dauerautofokus-Pfad des Vorschau-Streams - das erklaert den
// beobachteten Unterschied. Ein aufgenommenes Foto wird direkt auf
// Barcodes untersucht; wird einer gefunden, gilt der Scan als erledigt,
// ganz ohne auf den laufenden Video-Autofokus angewiesen zu sein.
async function barcodeScanFotoVersuch(){
 if(typeof ImageCapture==="undefined")return null;
 const video=$("barcodeScanVideo");
 const stream=video&&video.srcObject;
 const track=stream&&stream.getVideoTracks&&stream.getVideoTracks()[0];
 if(!track)return null;
 try{
  const capture=new ImageCapture(track);
  const blob=await capture.takePhoto();
  if(!barcodeScanCodeReader||typeof barcodeScanCodeReader.decodeFromImageElement!=="function")return null;
  const bitmap=await createImageBitmap(blob);
  const canvas=document.createElement("canvas");
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  canvas.getContext("2d").drawImage(bitmap,0,0);
  const result=await barcodeScanCodeReader.decodeFromImageElement(canvas);
  return result?result.getText():null;
 }catch(e){return null}
}

// v3.107 (verstaerkt nach Anwender-Rueckmeldung "stellt immer noch nicht
// scharf"): Tippen-zum-Fokussieren in drei Stufen. Auf mehreren Geraeten
// haengt der Dauerautofokus (focusMode:"continuous") bei sehr kurzer Distanz
// fest und stellt nicht mehr automatisch nach, obwohl die Vorgabe beim Start
// gesetzt wurde.
//
// Stufe 1 (schnell, aber nicht auf jedem Geraet wirksam): unterstuetzt die
// Kamera einen manuellen Fokusabstand (focusDistance), wird kurz auf den
// naechstmoeglichen Wert (Nahbereich) gestellt und sofort wieder auf
// "continuous" zurueckgesetzt.
//
// Stufe 2 (robuster, greift unabhaengig davon, ob Stufe 1 etwas bewirkt hat):
// ein KOMPLETT NEUER Kamera-Stream wird angefordert und in denselben
// laufenden <video> eingehaengt - der laufende ZXing-Scan liest die Bilder
// direkt vom <video>-Element und merkt vom Stream-Wechsel nichts, deshalb
// muss der Scan-Vorgang dafuer nicht neu gestartet werden. Viele
// Kamera-Treiber fuehren beim STREAM-START einen frischen Autofokus-Sweep
// durch, der beim laufenden Dauerautofokus mitten im Betrieb bei sehr
// kurzer Distanz oft ausbleibt - focusDistance ist dafuer nicht noetig, das
// deckt Geraete ab, bei denen Stufe 1 wirkungslos bleibt. Der alte Stream
// wird danach gestoppt, damit nicht zwei Kamerazugriffe gleichzeitig aktiv
// bleiben. Schlaegt die Neuanforderung fehl (z. B. kein zweiter Zugriff
// moeglich), bleibt der bisherige Stream unveraendert aktiv - kein Fehler
// sichtbar, kein zweiter Berechtigungsdialog, da die Kamera bereits erlaubt
// ist.
//
// Stufe 3 (v3.109, siehe barcodeScanFotoVersuch oben): unabhaengig vom
// Ergebnis der ersten beiden Stufen wird zusaetzlich ein Einzelfoto
// aufgenommen und direkt auf einen Barcode untersucht - wird einer
// gefunden, gilt der Scan als erledigt (Overlay schliesst, callback wird
// wie bei einem normalen Video-Treffer aufgerufen).
async function barcodeScanNeuFokussieren(){
 const video=$("barcodeScanVideo");
 const alterStream=video&&video.srcObject;
 const track=alterStream&&alterStream.getVideoTracks&&alterStream.getVideoTracks()[0];
 if(!track)return;
 if(track.applyConstraints){
  try{
   const caps=(typeof track.getCapabilities==="function")?track.getCapabilities():null;
   if(caps&&caps.focusDistance&&caps.focusMode&&caps.focusMode.indexOf("manual")!==-1){
    await track.applyConstraints({advanced:[{focusMode:"manual",focusDistance:caps.focusDistance.min}]});
    await new Promise(r=>setTimeout(r,250));
   }
   await track.applyConstraints({advanced:[{focusMode:"continuous"}]});
  }catch(e){/* Vorgabe nicht unterstuetzt - bewusst ignoriert */}
 }
 if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
  try{
   const neuerStream=await navigator.mediaDevices.getUserMedia(barcodeScanWunschKonstraint());
   video.srcObject=neuerStream;
   // play() bewusst NICHT abgewartet: das Video startet asynchron im
   // Hintergrund, ein haengendes/abgelehntes play()-Promise (z. B. weil die
   // Nutzeraktivierung aus dem Klick zu diesem Zeitpunkt schon verbraucht
   // ist) darf das Stoppen des alten Streams direkt darunter nicht verzoegern.
   if(typeof video.play==="function")video.play().catch(()=>{});
   try{ alterStream.getTracks().forEach(t=>t.stop()); }catch(e){}
  }catch(e){/* Neustart fehlgeschlagen - alter Stream bleibt aktiv, kein Fehler sichtbar */}
 }
 const text=await barcodeScanFotoVersuch();
 if(text){
  const cb=barcodeScanAktuellerCallback;
  barcodeScanSchliessen();
  if(cb)cb(text);
 }
}
if($("barcodeScanVideo"))$("barcodeScanVideo").addEventListener("click",barcodeScanNeuFokussieren);

// Oeffnet die Kamera und ruft callback(code) GENAU EINMAL mit dem erkannten
// Text auf, dann schliesst sich das Overlay von selbst. Ein Abbrechen-Klick
// ruft callback nicht auf. Fehler (kein Netz, keine Kamera-Freigabe) werden
// sichtbar im Overlay gemeldet statt still zu scheitern.
async function barcodeScannen(callback){
 const overlay=$("barcodeScanOverlay"), status=$("barcodeScanStatus"), video=$("barcodeScanVideo");
 if(!overlay||!video)return;
 overlay.hidden=false;
 if(status){status.textContent="Bibliothek wird geladen …";status.style.color="#fff"}
 try{
  await zxingLaden();
 }catch(err){
  if(status){status.textContent=(err&&err.message)?err.message:"Scan-Bibliothek konnte nicht geladen werden.";status.style.color="#ffb3b3"}
  return;
 }
 if(status){status.textContent="Kamera wird gestartet …";status.style.color="#fff"}
 try{
  barcodeScanCodeReader=new ZXing.BrowserMultiFormatReader();
  barcodeScanAktuellerCallback=callback;
  const aufTreffer=(result,err,controls)=>{
   barcodeScanControls=controls;
   if(result){
    const text=result.getText();
    barcodeScanSchliessen();
    callback(text);
   }
  };
  // Kamera-Autofokus (v3.104, verstaerkt): decodeFromVideoDevice(undefined,...)
  // liess die Kamera-Wahl UND ihre Voreinstellungen komplett dem Browser -
  // ohne ausdrueckliche Vorgabe blieb die Rueckkamera auf mehreren Geraeten
  // auf Dauer-unscharf stehen (kein Autofokus fuer einen reinen
  // Video-Stream, oft zusaetzlich eine sehr niedrige Standardaufloesung).
  // facingMode waehlt gezielt die Rueckkamera, eine hoehere ideale
  // Aufloesung UND focusMode:continuous fordern Dauerautofokus an, wo
  // Geraet/Browser das unterstuetzen - sonst wird die Vorgabe von selbst
  // ignoriert (kein Fehler). Bei einer zu engen Vorgabe
  // (OverconstrainedError) wird schrittweise gelockert statt sofort
  // komplett auf die alte, vorgabenlose Methode zurueckzufallen - eine
  // bereits erteilte Kamera-Freigabe darf dabei nicht zu einem zweiten
  // Berechtigungsdialog fuehren.
  const wunschKonstraint=barcodeScanWunschKonstraint();
  const engerKonstraint={video:{facingMode:{ideal:"environment"}}};
  if(typeof barcodeScanCodeReader.decodeFromConstraints==="function"){
   try{
    await barcodeScanCodeReader.decodeFromConstraints(wunschKonstraint,video,aufTreffer);
   }catch(engErr){
    if(engErr&&engErr.name==="OverconstrainedError"){
     await barcodeScanCodeReader.decodeFromConstraints(engerKonstraint,video,aufTreffer);
    }else{
     throw engErr;
    }
   }
  }else{
   await barcodeScanCodeReader.decodeFromVideoDevice(undefined,video,aufTreffer);
  }
  // Manche Browser/Kameras setzen "advanced"-Vorgaben aus getUserMedia nur
  // teilweise um, akzeptieren dieselbe Vorgabe aber ueber applyConstraints()
  // auf dem laufenden Track. Zusaetzlicher, rein defensiver Versuch - ohne
  // Wirkung, wenn nicht unterstuetzt (kein Fehler, kein zweiter Dialog, es
  // wird ja kein neuer Stream angefordert).
  try{
   const track=video.srcObject&&video.srcObject.getVideoTracks&&video.srcObject.getVideoTracks()[0];
   if(track&&track.applyConstraints)await track.applyConstraints({advanced:[{focusMode:"continuous"}]});
  }catch(e){/* Vorgabe nicht unterstuetzt - bewusst ignoriert */}
  if(status)status.textContent="Code in den Rahmen halten …";
 }catch(err){
  const meldung=(err&&err.name==="NotAllowedError")
   ?"Kein Zugriff auf die Kamera - bitte in den Geräteeinstellungen erlauben."
   :(err&&err.message)?err.message:"Kamera konnte nicht gestartet werden.";
  if(status){status.textContent=meldung;status.style.color="#ffb3b3"}
 }
}
