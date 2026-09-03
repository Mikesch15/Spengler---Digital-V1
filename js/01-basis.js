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
function isAdmin(){
 // Administrator ist, wer das Recht "admin" hat (siehe 05a-rechte.js).
 return !!(currentProfile&&currentProfile.role==="admin");
}
// renderFeedbackList() liegt seit v2.63 in js/02-feedback.js, zusammen
// mit Sortierung und Export. Aufgerufen wird sie erst durch einen Klick
// (Einstellungen -> Feedback), also lange nachdem js/02 geladen ist.
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
document.documentElement.classList.toggle("dark",darkMode);
function photoQualitySettings(){
 return photoQuality==="hoch"?{maxDim:2200,quality:0.9}:{maxDim:1400,quality:0.75};
}
const EINLAUFBLECH_STANDARD=Object.freeze({stoss_laenge:2000,ueberlappung:70,gehrungszugabe:100,umschlag_oben:12,umschlag_unten:12,rest_schwelle:500,end_zugabe:10});
// Standardwerte für beide Einlaufblech-Typen. Gespeicherte Werte des Geräts
// haben Vorrang – zurücksetzen geht über den Knopf in den Einstellungen.
let einlaufblechSettings=JSON.parse(localStorage.getItem("sd_einlaufblechSettings")||"null")||{...EINLAUFBLECH_STANDARD};
if(einlaufblechSettings.end_zugabe===undefined)einlaufblechSettings.end_zugabe=10;
let einlaufblechKonischSettings=JSON.parse(localStorage.getItem("sd_einlaufblechKonischSettings")||"null")||{...EINLAUFBLECH_STANDARD};
if(einlaufblechKonischSettings.end_zugabe===undefined)einlaufblechKonischSettings.end_zugabe=10;
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
// Masse für die Mauerabdeckung, firmenweit aus app_settings.
let madBodenMass=0;
let madSchieberMass=0;
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
 rinne_halbrund:"Rinne Halbrund",
 einlaufblech_konisch:"Einlaufblech konisch",
 freies_profil:"Freies Profil",
 mauerabdeckung:"Mauerabdeckung",
 lukarne:"Lukarne Seitenverkleidung",
 anschlussblech:"Ort- und Seitenbleche",
 einfassung_rund:"Einfassung Rund",
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
 kehle:"",                          // rechnet nur, hat keine Einstellungen
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
