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
// v3.176: Woraus ist ein Katalogartikel? Parallel zu materialIds gefuehrt,
// wie dort auch - settings.materials ist seit je ein Array aus Arrays, und
// ein sechstes Feld darin wuerde jede Stelle treffen, die nach Position
// zugreift. NULL heisst "kein Werkstoff" und ist bei den meisten Positionen
// (Schrauben, Dichtband, Leistungen) der richtige Wert.
let materialWerkstoffe=[];
// Der Werkstoff eines Artikels, ueber seine Datenbank-Id. Null, wenn keiner
// hinterlegt ist - es wird keiner geraten.
function artikelWerkstoffId(artikelId){
 if(artikelId===null||artikelId===undefined)return null;
 const i=materialIds.findIndex(x=>String(x)===String(artikelId));
 if(i<0)return null;
 const w=materialWerkstoffe[i];
 return (w===null||w===undefined||w==="")?null:w;
}
// v3.177: Und woraus BESTEHT die Rolle bzw. Tafel? Staerke, Ausfuehrung,
// Form und - nur bei einer Tafel - das Format. Bis v3.176 stand das auf einer
// eigenen lagerbestand-Zeile neben dem Artikel. Das war die letzte Stelle, an
// der ein und dasselbe Blech zweimal erfasst war: der Artikel trug den Namen,
// die Lagerzeile das Format. Sichtbar wurde es daran, dass materials 36/37/38
// alle drei "Kupferblech" heissen - in der Lagerverwaltung drei gleich
// benannte Produkte, bei denen niemand 0,6 von 1,0 mm unterscheiden konnte.
//
// Gefuehrt wird es parallel zu materialIds, aus demselben Grund wie
// materialWerkstoffe: settings.materials ist seit je ein Array aus Arrays,
// und ein weiteres Feld darin wuerde jede Stelle treffen, die nach Position
// zugreift.
let materialFormate=[];
// v3.184: Ist der Artikel eine BEISPIEL-Position aus der Erstregistrierung?
// Wieder parallel gefuehrt, aus demselben Grund wie die beiden Listen
// darueber. true heisst: die Firma hat diese Zeile nie selbst erfasst, sie
// kam mit der Registrierung mit, damit sich Rapport, Lager und Zuschnitt
// sofort ausprobieren lassen. Solche Zeilen loesen sich auf, sobald die
// Firma ihre erste eigene Position anlegt oder eine Liste importiert.
let materialDemo=[];
// Zaehlt nur ECHTE Positionen - die Beispiele bleiben aussen vor. Gebraucht
// von der Einrichtungs-Checkliste (js/73): ein Haken, den mitgelieferte
// Beispieldaten setzen, waere ein falscher Haken. Die Liste soll sagen, ob
// der BETRIEB seinen Katalog hat, nicht ob die App etwas mitgebracht hat.
function katalogEchteAnzahl(){
 if(!Array.isArray(settings&&settings.materials))return 0;
 return settings.materials.filter((_,i)=>materialDemo[i]!==true).length;
}
// Dasselbe ueber die Datenbank-Id, fuer Stellen, die einen Artikel in der
// Hand haben statt die ganze Liste.
function artikelIstDemo(artikelId){
 if(artikelId===null||artikelId===undefined)return false;
 const i=materialIds.findIndex(x=>String(x)===String(artikelId));
 return i>=0 && materialDemo[i]===true;
}
// Das Blech-Format eines Artikels, ueber seine Datenbank-Id. Null, wenn der
// Artikel gar nichts davon traegt - dann ist er kein gefuehrtes Blech,
// sondern eine gewoehnliche Katalogposition (Schrauben, Dichtband).
//
// Es genuegt FORM ODER STAERKE, nicht beides. Das ist bewusst so und nicht
// grosszuegig gemeint: bis v3.176 zaehlte eine Bestandszeile mit Staerke,
// aber ohne Form, fuer die Bedarfspruefung sehr wohl mit (restBedarfMerkmale
// in js/42) - nur die Form-Frage blieb dann offen ("ohne-form"). Haette man
// hier allein die Form verlangt, waere so ein Eintrag mit v3.177 still ganz
// aus der Liste gefallen und der Bedarf ploetzlich "kein-lager" geworden.
// Das waere eine Verhaltensaenderung durch die Hintertuer gewesen.
//
// Beim SPEICHERN wird die Form trotzdem verlangt (lagSpeichern in js/59):
// streng beim Schreiben, nachsichtig beim Lesen - so entstehen keine neuen
// halben Eintraege, und die alten gehen trotzdem nicht verloren.
function artikelFormat(artikelId){
 if(artikelId===null||artikelId===undefined)return null;
 const i=materialIds.findIndex(x=>String(x)===String(artikelId));
 if(i<0)return null;
 const f=materialFormate[i];
 if(!f)return null;
 const hatStaerke=f.staerke_mm!==null&&f.staerke_mm!==undefined&&f.staerke_mm!=="";
 return (f.form||hatStaerke)?f:null;
}
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
//
// v3.172: dazu kommt, was der Betrieb an dieser Stelle TATSAECHLICH
// gemessen hat (Zaehlwerk, js/71). art und feld sind dafuer noetig -
// die Art der Massaufnahme ("kamineinfassung") und der Name des Feldes,
// wie er im Formular heisst ("lattenabstand"). Fehlen sie, oder ist das
// Zaehlwerk nicht geladen, entsteht exakt derselbe Chip wie vorher.
//
// Vier Faelle, und in jedem steht die Zahl dabei:
//   Richtwert, nichts gemessen  -> "Richtwert 330"           (wie bisher)
//   Richtwert = gemessen        -> "Richtwert 330 · 3× so gemessen"
//   Richtwert ≠ gemessen        -> zwei Chips nebeneinander
//   kein Richtwert, aber Messung-> nur "3× gemessen: 360"
// Der hinterlegte Richtwert verschwindet nie (Zaehlwerk-Regel 1), und
// uebernommen wird weiterhin nur, was angetippt wird (Regel 3).
function vorschlagChip(feldId,wert,art,feld){
 const n=Number(wert);
 const hatRichtwert=!(wert===""||wert===null||wert===undefined)&&Number.isFinite(n);
 const gelernt=(art&&feld&&typeof zwMesswertRichtwert==="function")
  ?zwMesswertRichtwert(art,feld):null;
 const knopf=(w,text,zusatz)=>`<button type="button" class="vorschlag-chip no-print${zusatz||""}" `
  +`data-vorschlag-fuer="${feldId}" data-vorschlag-wert="${w}" `
  +`title="${zusatz?"Gemessenen Wert übernehmen":"Richtwert übernehmen"}">${text}</button>`;
 if(!hatRichtwert){
  if(!gelernt)return "";
  return knopf(gelernt.wert,
    `<span class="zw-zahl">${gelernt.anzahl}×</span> gemessen: ${gelernt.wert}`," zw-chip");
 }
 if(!gelernt)return knopf(n,"Richtwert "+n);
 if(gelernt.wert===n)
  return knopf(n,`Richtwert ${n} · <span class="zw-zahl">${gelernt.anzahl}×</span> so gemessen`);
 return knopf(n,"Richtwert "+n)
  +knopf(gelernt.wert,
    `<span class="zw-zahl">${gelernt.anzahl}×</span> gemessen: ${gelernt.wert}`," zw-chip");
}
// v3.173: derselbe Gedanke fuer ein AUSWAHLFELD. Er benutzt bewusst
// dieselbe Chip-Markierung wie oben, damit das zentrale Uebernehmen weiter
// unten unveraendert greift - ein <select> nimmt ein zugewiesenes .value
// genauso an wie ein Zahlenfeld.
//
// o.feldId   id des <select>
// o.art      Massaufnahme-Art ("einlaufblech_konisch")
// o.feld     Name im gespeicherten Datensatz ("material")
// o.aktuell  was gerade ausgewaehlt ist
// o.vorgabe  die fest einprogrammierte Vorgabe des Moduls, falls es eine
//            gibt (ebaLeer() setzt z.B. Abwicklung 250). Steht das Feld
//            noch darauf, gilt es wie leer.
// o.text     macht aus dem gespeicherten Wert etwas Lesbares (bei einer
//            Material-Id den Namen). Leerer Text = kein Chip.
// o.erlaubt  die Werte, die die Auswahlliste ueberhaupt kennt.
//
// Es gibt bewusst VIER Gruende, aus denen hier nichts erscheint: zu wenig
// gezaehlt, die Person hat selbst schon etwas anderes gewaehlt, der
// gelernte Wert steht bereits da, oder er kommt in der Liste gar nicht
// (mehr) vor. In allen vier Faellen waere ein Chip entweder geraten,
// bevormundend oder wirkungslos.
function auswahlChip(o){
 o=o||{};
 const g=(typeof zwAuswahlHaeufigste==="function")
  ?zwAuswahlHaeufigste(o.art,o.feld):null;
 if(!g)return "";
 const w=String(g.wert);
 const akt=String(o.aktuell==null?"":o.aktuell).trim();
 const aufVorgabe=(o.vorgabe!==undefined&&o.vorgabe!==null
                   &&akt===String(o.vorgabe).trim());
 if(akt!==""&&!aufVorgabe)return "";      // eigene Wahl bleibt unkommentiert
 if(w===akt)return "";                    // steht schon so da
 if(Array.isArray(o.erlaubt)&&!o.erlaubt.some(x=>String(x)===w))return "";
 const text=(typeof o.text==="function")?String(o.text(w)||""):w;
 if(!text)return "";
 return `<button type="button" class="vorschlag-chip zw-chip no-print" `
  +`data-vorschlag-fuer="${esc(o.feldId)}" data-vorschlag-wert="${esc(w)}" `
  +`title="Gewählten Wert übernehmen">`
  +`<span class="zw-zahl">${g.anzahl}×</span> gewählt: ${esc(text)}</button>`;
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
 // Die Chips verschwinden sofort, auch wenn das Modul das Feld aus
 // Fokus-Gruenden nicht komplett neu zeichnet (siehe die vielen "live"-
 // Funktionen in den Aufnahme-Modulen). Seit v3.172 koennen es ZWEI sein
 // (Richtwert und eigene Messung) - es gehen beide weg, sonst stuende
 // neben dem jetzt gefuellten Feld noch ein Vorschlag.
 const ziel=chip.dataset.vorschlagFuer;
 document.querySelectorAll(".vorschlag-chip").forEach(c=>{
  if(c.dataset.vorschlagFuer===ziel)c.remove();
 });
});

function isAdmin(){
 // Administrator ist, wer das Recht "admin" hat (siehe 05a-rechte.js).
 return !!(currentProfile&&currentProfile.role==="admin");
}
let companyName="PETER KÜNZI AG";
let companyAddress="";
let logoUrl="";
let defaultVat="8.1 %";
// v3.200: Vorgaben fuer eine NEU angelegte Offerte (js/79). Sie werden beim
// Anlegen in die Offerte kopiert, nicht bei jedem Oeffnen nachgeladen - eine
// spaetere Aenderung der Vorgabe darf eine bereits geschriebene Offerte nicht
// rueckwirkend umformulieren. Der MwSt-Satz kommt aus defaultVat, es gibt
// dafuer bewusst kein zweites Feld.
let offerteVortext="";
let offerteSchlusstext="";
let offerteGueltigTage=30;
let logoDataUrl=null;
let recentCount=Number(localStorage.getItem("sd_recentCount"))||5;
let isDirty=false;
let darkMode=localStorage.getItem("sd_darkMode")==="ja";
let defaultRate=localStorage.getItem("sd_defaultRate")||"";
let photoQuality=localStorage.getItem("sd_photoQuality")||"schnell";
// v3.07 Aufgabenzentrale. v3.218: aufgabenOffenStart ist entfallen - es gibt
// die zuklappbare Karte des klassischen Startbildschirms nicht mehr.
// workflowAktiv: firmenweit aus app_settings.workflow_aktiv. REINE
//   ANZEIGE-EINSTELLUNG - abgesichert ist der Ablauf ausschliesslich
//   serverseitig (schuetze_measurement_workflow() und die sechs
//   measurement_*-Funktionen), nicht hierdurch.
let workflowAktiv=true;
document.documentElement.classList.toggle("dark",darkMode);
function photoQualitySettings(){
 return photoQuality==="hoch"?{maxDim:2200,quality:0.9}:{maxDim:1400,quality:0.75};
}

// ---- v3.122: Foto aufnehmen ODER aus der Galerie waehlen ------------------
// Ein einzelnes <input type="file" accept="image/*"> ueberlaesst die Wahl dem
// Geraet. Darauf ist kein Verlass: auf manchen Android-Geraeten - und in der
// installierten PWA - fuehrt derselbe Knopf direkt in die Galerie, ohne die
// Kamera ueberhaupt anzubieten. Genau dieses Verhalten hat beim Barcode-Scan
// schon eine ganze Versionsreihe gekostet (v3.115: erst ein eigenes Feld mit
// capture="environment" oeffnete zuverlaessig die native Kamera-App).
//
// Jeder Foto-Knopf hat deshalb ZWEI Felder, die sich nicht auf die
// Geraetewahl verlassen:
//   <id>Kamera  mit capture="environment" -> oeffnet die Kamera-App. Immer
//               genau EIN Foto; das ist die Natur von capture, kein Mangel.
//   <id>        ohne capture, mit multiple -> Galerie/Dateien, mehrere Fotos.
//
// Beide teilen sich denselben change-Handler: es gibt weiterhin nur EINE
// Stelle je Bereich, die ein Foto verarbeitet, und der Handler arbeitet
// ohnehin mit e.target, nicht mit einer festen Feld-Id.
function fotoFelder(feldId){
 return [$(feldId),$(feldId+"Kamera")].filter(Boolean);
}
function fotoFelderVerdrahten(feldId,handler){
 fotoFelder(feldId).forEach(el=>el.addEventListener("change",handler));
}
// Beide Felder leeren. Noetig nach dem Uebernehmen und beim Zuruecksetzen des
// Formulars - sonst laesst sich dieselbe Datei kein zweites Mal waehlen.
function fotoFelderLeeren(feldId){
 fotoFelder(feldId).forEach(el=>{el.value=""});
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
// Einen neuen Werkstoff anlegen (v3.180).
//
// EINE Stelle, an der ein Werkstoff entsteht - dasselbe Muster wie
// katalogPositionAnlegen() in js/59. Bis v3.179 ging das nur ueber die Karte
// "Werkstoffe" in den Einstellungen; wer beim Erfassen eines neuen Blechs
// merkte, dass der Werkstoff fehlt, musste den Dialog verlassen.
//
// Verschmolzen wird hier ausdruecklich NICHT: max_abstand_mm/ab_fixpunkt_mm
// sind die SIA-271-Dehnungswerte und gehoeren zum Werkstoff, nicht zum
// Artikel. Am Artikel stuenden sie ueber 380-mal, obwohl es sechs Werkstoffe
// gibt - und ein Werkstoff muss waehlbar bleiben, auch wenn gerade kein Blech
// daraus am Lager liegt.
//
// Wie die Liste danach aufgefrischt wird, entscheidet der Aufrufer: die
// Einstellungen-Karte laedt sie neu (sie zeigt auch die Werte), ein Dialog
// kommt mit dem oertlichen Nachziehen aus.
async function werkstoffAnlegen(werte){
 const w=werte||{};
 const satz={name:String(w.name||"").trim()||"Neuer Werkstoff"};
 if(w.max_abstand_mm!==undefined)satz.max_abstand_mm=w.max_abstand_mm;
 if(w.ab_fixpunkt_mm!==undefined)satz.ab_fixpunkt_mm=w.ab_fixpunkt_mm;
 const {data,error}=await sb.from("measurement_materials").insert(satz).select("*");
 if(error)return {id:null,fehler:error.message,
   rls:/permission|policy|row-level/i.test(error.message||"")};
 // Ein von RLS blockiertes Schreiben meldet keinen Fehler, es betrifft still
 // 0 Zeilen (CLAUDE.md 24.1) - 0 gilt deshalb NICHT als Erfolg.
 if(!data||!data.length)return {id:null,fehler:"",rls:false};
 measurementMaterials=measurementMaterials.concat(data)
   .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"de-CH"));
 renderMeasMaterialOptions();
 return {id:data[0].id,fehler:null,rls:false};
}

// Den Werkstoff aus einem Positionstext vorschlagen (v3.182).
//
// Der Werkstoff steht fast immer im Namen: "Kupferblech", "Titanzinkblech
// blank", "Messingblech halb hart". Gesucht wird das ERSTE Wort jedes
// bekannten Werkstoffnamens - "Aluminium (Aluman)" -> "aluminium",
// "CrNi-Stahl" -> "crni". Damit braucht es keine gepflegte Liste von
// Schreibweisen: die Werkstoffe der Firma sind die Quelle.
//
// Das Wort muss ein WORT IM NAMEN BEGINNEN, nicht irgendwo darin stehen.
// Das ist der entscheidende Punkt, an den echten Daten gemessen:
//   "Stahlblech svz"            -> Stahl        (richtig)
//   "Chromnickelstahl 1.4301"   -> kein Vorschlag
// Ohne die Wortanfang-Bedingung bekaeme der zweite Fall "Stahl"
// vorgeschlagen - 1.4301 ist aber CrNi-Stahl. Von 42 Katalogpositionen
// ergeben sich so 18 Vorschlaege, alle richtig, und keiner mehrdeutig.
//
// Passen MEHRERE Werkstoffe, wird keiner vorgeschlagen - geraten wird nicht.
// Und vorgeschlagen heisst vorgeschlagen: geschrieben wird nichts, bis jemand
// bestaetigt. "Walzblei" findet die Regel nicht, weil der Werkstoff dort
// hinten im Wort steht; das ist der Preis dafuer, nicht falsch zu raten.
function werkstoffAusText(text){
 const t=String(text||"").toLowerCase();
 if(!t)return null;
 const liste=(typeof measurementMaterials!=="undefined"&&Array.isArray(measurementMaterials))
   ?measurementMaterials:[];
 const treffer=[];
 liste.forEach(m=>{
  const wort=String(m.name||"").toLowerCase().match(/[a-zäöüß]{3,}/);
  if(!wort)return;
  if(new RegExp("(^|[^a-zäöüß])"+wort[0]).test(t))treffer.push(m.id);
 });
 return treffer.length===1?treffer[0]:null;
}

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
// Dasselbe fuer die beiden Ausmass-Arten (Register "Firma", bis v3.207
// "Geschützt").
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
// ---- Zuteilung eines Projekts (v3.161) ---------------------------
// Wem ist dieses Projekt zugeteilt? projects.zugeteilt_an ist ein
// jsonb-Array von profiles.id - dieselbe Form wie zuschnitt_ausschluss
// (js/49), und wie dort wird sie defensiv gelesen: ein alter Datensatz
// oder eine kaputte Zeile darf die Liste nicht zum Absturz bringen.
function projektZugeteilt(p){
 if(!p||!Array.isArray(p.zugeteilt_an))return [];
 return p.zugeteilt_an.map(x=>String(x||"")).filter(Boolean);
}

// ---- Die Ankreuzliste selbst (v3.255) ----------------------------
// Sie stand bis v3.254 nur im Stammdaten-Formular des Cockpits (js/24).
// Seit das Projekt auch beim ANLEGEN zugeteilt werden kann (js/09), gibt
// es sie an zwei Orten - und damit gehoert sie hierher, an EINE Stelle.
// Zwei Fassungen waeren zwei Meinungen darueber, wer zur Auswahl steht
// und in welcher Reihenfolge.
//
// Quelle und Sortierung sind unveraendert aus js/24 uebernommen: alle
// Profile, nach Namen sortiert - dieselbe Quelle und dieselbe Sortierung
// wie die Auswahl von Ruester und Monteur (js/44).
//
// Angekreuzt wird ausschliesslich, was uebergeben wird. Niemand wird
// vorangekreuzt, auch der Ersteller nicht: ein Haken, den niemand gesetzt
// hat, waere eine Behauptung. Der Satz darunter sagt stattdessen, was bei
// leerer Liste passiert (zuteilungHinweisText).
function zuteilungListeHtml(gewaehlt){
 const gw=(gewaehlt instanceof Set)?gewaehlt:new Set((gewaehlt||[]).map(String));
 const liste=(Array.isArray(allProfiles)?allProfiles:[]).slice()
  .sort((a,b)=>String(profileName(a.id)).localeCompare(String(profileName(b.id)),"de"));
 return liste.length
  ? liste.map(m=>`<label class="zuteilung-person">
      <input type="checkbox" data-zuteilung="${esc(m.id)}"${gw.has(String(m.id))?" checked":""}>
      <span>${esc(profileName(m.id)||"Unbekannter Benutzer")}</span></label>`).join("")
  : '<div class="small">Es sind keine weiteren Mitarbeiterkonten angelegt.</div>';
}

// Der Satz unter der Liste. Er sagt bei leerer Auswahl, wer das Projekt
// dann auf seiner Startseite sieht - sonst waere "niemand zugeteilt" eine
// Aussage, aus der niemand die Folge ableiten kann.
//
// "wer stattdessen" unterscheidet die beiden Orte und ist deshalb ein
// Argument: im Cockpit ist es die Person, die das Projekt angelegt HAT,
// beim Anlegen ist man es selbst. Derselbe Satz, zwei Enden.
function zuteilungHinweisText(anzahl,werStattdessen){
 if(anzahl>0){
  return "Auf der Startseite erscheint das Projekt unter \u201eOffene Projekte\u201c bei "
   +(anzahl===1?"dieser Person":"diesen "+anzahl+" Personen")+".";
 }
 return "Niemand zugeteilt \u2013 das Projekt erscheint auf der Startseite bei "
  +(werStattdessen||"der Person, die es angelegt hat")
  +". \u00dcber \u201eProjekte\u201c und die Suche bleibt es f\u00fcr alle erreichbar.";
}

// Die angekreuzten Ids EINES Kastens, in der Reihenfolge der Liste.
function zuteilungGewaehltAus(box){
 if(!box)return [];
 return [...box.querySelectorAll("[data-zuteilung]")]
  .filter(x=>x.checked).map(x=>x.dataset.zuteilung);
}

// Ist dieses Projekt MEINES? Die eine Stelle, die das beantwortet -
// benutzt von der Startseite (js/70) und von der Projektseite. Zwei
// Ableitungen waeren zwei Meinungen darueber, wer zustaendig ist.
//
// Ohne Zuteilung gilt, WER DAS PROJEKT ANGELEGT HAT. Das ist bewusst so
// entschieden (v3.161): am Tag der Umstellung ist kein einziges Projekt
// zugeteilt, und eine leere Startseite fuer alle waere schlimmer als eine
// grobe Naeherung. Sobald jemand zuteilt, gilt ausschliesslich die
// Zuteilung - der Ersteller faellt dann heraus, wenn er nicht dabei ist.
// Das ist gewollt: ein Projekt, das der Chef anlegt und dem Monteur
// zuteilt, gehoert auf dessen Startseite, nicht mehr auf seine.
function projektIstMeines(p,profilId){
 if(!p||!profilId)return false;
 const liste=projektZugeteilt(p);
 if(!liste.length)return String(p.created_by||"")===String(profilId);
 return liste.indexOf(String(profilId))>=0;
}

// ---- Auftrags-Nr.: je Firma nur einmal (v3.164) -------------------
// Eine Auftrags-Nr. bezeichnet genau einen Auftrag. Zwei Projekte mit
// derselben Nummer bedeuten in der Praxis, dass jemand dasselbe Projekt
// ein zweites Mal angelegt hat - danach liegen Massaufnahmen, Rapporte
// und Ausmasse verteilt auf zwei Eintraegen und niemand merkt es.
//
// Die VERBINDLICHE Sperre steht in der Datenbank (eindeutiger Index
// projects_firma_auftragsnr_eindeutig). Nur sie ist zuverlaessig: sie
// greift auch dann, wenn zwei Geraete im selben Moment speichern oder
// wenn die Projektliste auf einem Geraet veraltet ist. Die Funktionen
// hier sind die freundliche Vorstufe davon - sie sagen VOR dem Speichern,
// welches Projekt die Nummer schon hat.
//
// Verglichen wird normalisiert: ohne Rand-Leerzeichen, ohne Gross-/
// Kleinschreibung. Exakt dieselbe Normalisierung steht im Index
// (lower(btrim(order_no))) - sonst wuerden Oberflaeche und Datenbank
// unterschiedlich urteilen, und der Anwender bekaeme mal eine schoene,
// mal eine rohe Fehlermeldung.
function auftragsNrSchluessel(wert){
 return String(wert==null?"":wert).trim().toLowerCase();
}

// Gibt es in dieser Firma schon ein Projekt mit dieser Auftrags-Nr.?
// Liefert das Projekt oder null.
//
// ausserId: die id des Projekts, das gerade bearbeitet wird - es
// kollidiert nicht mit sich selbst. Beim Anlegen bleibt das leer.
//
// Gesucht wird in allProjects. Das ist die vollstaendige Projektliste
// der eigenen Firma (RLS sorgt dafuer, dass gar nichts anderes drin
// sein kann) - ARCHIVIERTE EINGESCHLOSSEN. Das ist Absicht: eine Nummer
// eines archivierten Projekts noch einmal zu vergeben wuerde die
// Geschichte des Auftrags unlesbar machen. Offline angelegte Projekte
// stehen mit wartet:true ebenfalls in der Liste und zaehlen mit.
function projektMitAuftragsNr(orderNo,ausserId){
 const k=auftragsNrSchluessel(orderNo);
 if(!k||!Array.isArray(allProjects))return null;
 return allProjects.find(p=>p&&auftragsNrSchluessel(p.order_no)===k
   &&String(p.id)!==String(ausserId==null?"":ausserId))||null;
}

// Der Warntext dazu - eine Quelle fuer alle Stellen, die ihn zeigen
// (Projekt anlegen, Stammdaten bearbeiten). Er NENNT das Projekt, das
// die Nummer schon hat: "schon vergeben" allein laesst den Anwender
// suchen, "vergeben an ..." laesst ihn nachsehen.
function auftragsNrBelegtText(orderNo,p){
 const wer=[p&&p.object,p&&p.name].map(x=>String(x||"").trim()).filter(Boolean).join(" · ")
   ||("Projekt Nr. "+String(p&&p.id||"?"));
 const zusatz=p&&p.wartet?" (wartet noch auf die Übertragung)"
   :(p&&p.archived?" (archiviert)":"");
 return "Die Auftrags-Nr. "+String(orderNo||"").trim()+" gibt es in dieser Firma schon:\n\n"
  +wer+zusatz+"\n\n"
  +"Eine Auftrags-Nr. darf nur einmal vergeben werden. Dieses Projekt "
  +"besteht also bereits – bitte dort weiterarbeiten oder eine andere "
  +"Auftrags-Nr. eingeben.";
}

// Dieselbe Aussage, wenn die DATENBANK die Doppelung meldet statt die
// Vorpruefung oben. Das passiert, wenn die Projektliste auf diesem
// Geraet veraltet war oder zwei Leute gleichzeitig gespeichert haben -
// und beim Senden aus der Warteschlange (js/43). Ohne diese Uebersetzung
// stuende dort der rohe Postgres-Text ("duplicate key value violates
// unique constraint ..."), mit dem niemand auf der Baustelle etwas
// anfangen kann.
//
// Erkannt wird am SQLSTATE 23505 zusammen mit dem Indexnamen. Der Code
// allein wuerde auch andere Eindeutigkeiten dieser Tabelle einfangen.
function auftragsNrKonfliktText(error){
 if(!error)return null;
 const code=String(error.code||"");
 const text=String(error.message||"")+" "+String(error.details||"");
 if(code!=="23505"&&!/23505/.test(text))return null;
 if(text.indexOf("projects_firma_auftragsnr_eindeutig")<0)return null;
 return "Diese Auftrags-Nr. ist in dieser Firma bereits vergeben – das Projekt "
  +"besteht schon. Bitte die Projektliste aktualisieren und dort weiterarbeiten "
  +"oder eine andere Auftrags-Nr. eingeben.";
}

// ---- Ein Projekt oeffnen (v3.166) --------------------------------
// Die eine Stelle, die entscheidet, WO ein Projekt aufgeht.
//
// Bis v3.165 rief jeder Weg, der ein Projekt oeffnet, direkt
// openProjectCockpit() - auch dann, wenn die neue Ansicht an war. Aus
// der Werkstatt heraus (gemeldet) und aus der Projektliste klappte
// deshalb mitten in der neuen Ansicht das vollstaendige alte Cockpit auf.
//
// Jetzt gilt: in der neuen Ansicht die Projektseite, sonst das Cockpit.
// Die beiden Stellen, die das Cockpit AUSDRUECKLICH wollen - "Dateien,
// Fotos und Verlauf" und "Stammdaten bearbeiten" in js/70 - rufen
// weiterhin openProjectCockpit() direkt, mit ihrer Marke. Sie wollen
// genau diesen Schirm, nicht "ein Projekt".
//
// Alles ueber typeof geprueft: js/01 laedt vor js/24 und js/70, und
// keiner der beiden darf hier eine harte Abhaengigkeit werden.
// treffer (optional): {kind,id} aus der Suche - der Eintrag, den der
// Anwender gemeint hat. v3.167: beide Ansichten koennen ihn anspringen,
// die neue ueber ihr Register, die klassische ueber ihren Klappbereich.
async function projektOeffnen(id,treffer){
 // v3.218: Die Weiche "neue oder klassische Ansicht" ist entfallen - es gibt
 // nur noch eine. Der Rueckfall auf das klassische Cockpit bleibt als
 // Notnagel stehen: waere js/70 nicht geladen, gaebe es sonst ueberhaupt
 // keinen Weg mehr ins Projekt.
 if(typeof a2ProjektOeffnen==="function"){
  await a2ProjektOeffnen(id,treffer);
  return;
 }
 if(typeof openProjectCockpit==="function")await openProjectCockpit(id,treffer);
}

// Dasselbe fuer "Stammdaten bearbeiten": es geht der Cockpit-Stammdaten-
// bereich mit seiner Marke auf (nur die Felder). Der Rueckfall darunter ist
// derselbe Notnagel wie oben.
async function projektStammdatenOeffnen(id){
 if(typeof a2StammdatenOeffnen==="function"){
  await a2StammdatenOeffnen(id);
  return;
 }
 if(typeof openProjectCockpitZumBearbeiten==="function")
  await openProjectCockpitZumBearbeiten(id);
}

// ---- Worum es in einem Regierapport geht (v3.165) -----------------
// Die Rapportliste eines Projekts zeigte bis v3.164 nur Kopfdaten:
// Datum, Auftrags-Nr., Auftraggeber, Objekt. Bei fuenf Rapporten zur
// selben Baustelle sahen alle fuenf gleich aus - man musste jeden
// einzeln oeffnen, um zu sehen, worum es ging.
//
// ABGELEITET, NICHT ERFASST. Der Text wird aus dem gerechnet, was im
// Rapport ohnehin steht (Arbeitszeilen, Stunden, Materialzeilen). Das
// ist bewusst so entschieden:
//   * Es wirkt rueckwirkend auf jeden bestehenden Rapport - ein neues
//     Feld waere bei allen alten leer.
//   * Es verlangt auf der Baustelle keine zusaetzliche Disziplin.
//   * Es kann nicht veralten: aendert jemand die Arbeitszeilen, aendert
//     sich die Zusammenfassung mit.
// Ein frei getipptes "Betreff"-Feld, das diesen Text ueberschreibt,
// laesst sich spaeter jederzeit nachruesten - umgekehrt nicht.
//
// KEINE ZUSAETZLICHE ABFRAGE. Alle drei Listen, die das anzeigen, laden
// ihre Rapporte schon mit select("*") - work_entries und
// material_entries liegen also bereits im Speicher.
//
// Es wird NICHTS erfunden: ist nichts erfasst, kommt ein leerer Text
// zurueck, und die aufrufende Liste zeigt weiter ihren eigenen
// Ersatztext. Eine Zusammenfassung, die "nichts" verschweigt, waere
// schlimmer als keine.
const RAPPORT_KURZ_LAENGE=80;

// Zahl fuer die Anzeige: 8 -> "8", 2.5 -> "2,5", 2.25 -> "2,25".
// Dezimalkomma wie sonst in der App, keine ueberfluessigen Nullen.
function rapportStundenText(n){
 const z=Math.round((Number(n)||0)*100)/100;
 return String(z).replace(".",",");
}

// Die Arbeitstexte eines Rapports, entdoppelt, in ihrer Reihenfolge.
// Entdoppelt wird ohne Gross-/Kleinschreibung und ohne Rand-Leerzeichen:
// "Rinne ausbessern" und "rinne ausbessern " sind dieselbe Arbeit, und
// zweimal dasselbe in der Zeile zu lesen hilft niemandem.
function rapportArbeitstexte(r){
 const zeilen=(r&&Array.isArray(r.work_entries))?r.work_entries:[];
 const gesehen=Object.create(null), raus=[];
 zeilen.forEach(w=>{
  const t=String((w&&w.desc)||"").trim();
  if(!t)return;
  const k=t.toLowerCase();
  if(gesehen[k])return;
  gesehen[k]=true;
  raus.push(t);
 });
 return raus;
}

// Mehrere Texte zu einer Zeile, gekappt auf RAPPORT_KURZ_LAENGE.
// Gekappt wird an der Trennstelle, nicht mitten im Wort - und nur, wenn
// dadurch ueberhaupt etwas stehen bleibt; sonst wird der erste Text hart
// gekuerzt. Dass etwas fehlt, zeigt das angehaengte Zeichen.
function rapportTexteKurz(texte){
 const alles=texte.join(" · ");
 if(alles.length<=RAPPORT_KURZ_LAENGE)return alles;
 let zeile="";
 for(let i=0;i<texte.length;i++){
  const naechste=zeile?zeile+" · "+texte[i]:texte[i];
  if(naechste.length>RAPPORT_KURZ_LAENGE)break;
  zeile=naechste;
 }
 if(zeile)return zeile+" …";
 return texte[0].slice(0,RAPPORT_KURZ_LAENGE).trim()+"…";
}

// Die eine Quelle fuer "worum geht es in diesem Rapport" - benutzt von
// der Rapportliste im Projekt (js/09), der neuen Ansicht (js/70) und der
// Rapport-Uebersicht (js/04). Drei eigene Ableitungen waeren drei
// Gelegenheiten, dasselbe unterschiedlich zu formulieren.
function rapportKurz(r){
 if(!r)return "";
 const arbeit=(Array.isArray(r.work_entries))?r.work_entries:[];
 const material=(Array.isArray(r.material_entries))?r.material_entries:[];
 const texte=rapportArbeitstexte(r);

 // Was gemacht wurde. Stehen die Arbeitszeilen ohne Text da (es gibt sie,
 // aber niemand hat etwas hingeschrieben), wird das gesagt statt
 // verschwiegen - sonst sieht der Rapport leer aus, obwohl Stunden
 // darauf gebucht sind.
 let was="";
 if(texte.length)was=rapportTexteKurz(texte);
 else if(arbeit.length)was=arbeit.length+(arbeit.length===1?" Arbeitsposition":" Arbeitspositionen")+" ohne Text";

 // Die Zahlen dahinter.
 const stunden=arbeit.reduce((s,w)=>s+(Number(w&&w.hours)||0),0);
 const zahlen=[];
 if(stunden>0)zahlen.push(rapportStundenText(stunden)+" h");
 if(material.length)zahlen.push(material.length
   +(material.length===1?" Materialposition":" Materialpositionen"));

 if(was&&zahlen.length)return was+" — "+zahlen.join(" · ");
 return was||zahlen.join(" · ");
}

// ---- Geplanter Montagetermin (v3.160) ----------------------------
// Ein Tag in Worten: "heute", "morgen", "in 3 Tagen".
//
// EINE Quelle fuer alle Stellen, die den Termin zeigen - der Arbeitsstatus
// im Massaufnahme-Formular (js/44), die Werkstatt (js/51) und die
// Startseite (js/70). Drei eigene Rechnungen waeren drei Gelegenheiten,
// sich um einen Tag zu vertun.
//
// Gerechnet wird in KALENDERTAGEN, nicht in Stunden: "morgen" ist der
// naechste Kalendertag, egal ob es jetzt 7 Uhr oder 23 Uhr ist. Das Datum
// kommt als reines Tagesdatum aus der Datenbank (date, keine Uhrzeit) und
// wird aus seinen drei Zahlen gebaut statt mit new Date(text): letzteres
// liest "2026-09-24" als UTC-Mitternacht. In der Schweiz faellt das noch
// auf denselben Tag (wir liegen oestlich von Greenwich) - westlich davon
// waere es der Vortag. Die Zahlenform ist also nicht heute noetig, aber
// sie ist die einzige, die unabhaengig von der Zeitzone stimmt, und sie
// kostet nichts.
//
// Ohne Termin kommt null zurueck. Dann sagt die aufrufende Stelle selbst,
// was sie stattdessen zeigt - es wird kein Datum erfunden.
function montageTermin(wert,heuteWert){
 if(!wert)return null;
 const t=String(wert).slice(0,10);
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
 if(!m)return null;
 const tag=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
 if(isNaN(tag.getTime()))return null;
 const jetzt=heuteWert?new Date(heuteWert):new Date();
 if(isNaN(jetzt.getTime()))return null;
 const heuteTag=new Date(jetzt.getFullYear(),jetzt.getMonth(),jetzt.getDate());
 // Math.round, nicht Math.floor: die Zeitumstellung macht einen Tag
 // einmal im Jahr 23 und einmal 25 Stunden lang.
 const tage=Math.round((tag.getTime()-heuteTag.getTime())/86400000);
 let wort;
 if(tage===0)wort="heute";
 else if(tage===1)wort="morgen";
 else if(tage===2)wort="übermorgen";
 else if(tage>2)wort="in "+tage+" Tagen";
 else if(tage===-1)wort="gestern";
 else wort="vor "+(-tage)+" Tagen";
 return {
  iso:t, tage, wort,
  datum:tag.toLocaleDateString("de-CH",{day:"numeric",month:"numeric",year:"numeric"}),
  wochentag:tag.toLocaleDateString("de-CH",{weekday:"long"}),
  // Der Termin liegt in der Vergangenheit und die Montage steht noch an -
  // das ist die einzige Lage, die eine Farbe verdient.
  ueberfaellig:tage<0,
  dringend:tage>=0&&tage<=1
 };
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

// ---- Ein Katalogfeld wirklich speichern (v3.182) ---------------------------
// GEFUNDEN, weil sich ein neuer Werkstoff nicht umbenennen liess.
//
// Die Einstellungen speichern ihre Felder beim Tippen, verzoegert. Der Aufruf
// sah so aus:
//
//   debounce((id,patch)=>sb.from(T).update(patch).eq("id",id),500)
//
// Das BAUT die Abfrage nur. supabase-js schickt sie erst, wenn jemand auf das
// Ergebnis wartet (then/await) - ohne das passiert schlicht nichts. Die
// Oberflaeche sah trotzdem richtig aus, weil die lokale Liste sofort geaendert
// wurde; weg war die Aenderung erst nach dem Neuladen.
//
// Belegt an den echten Daten: von 381 Artikeln, 12 Ansaetzen, 487
// Blitzschutz-Positionen und 9 Werkstoffen trug KEINE EINZIGE Zeile je ein
// veraendertes updated_at - und genau das schicken diese Aufrufe mit. Einzig
// rinne_fitting_types war betroffen-frei: dort gibt es einen eigenen
// Speichern-Knopf, der await benutzt.
//
// Zwei Fehler, zwei Korrekturen:
//   1. await - die Abfrage wird abgeschickt.
//   2. Das Ergebnis wird geprueft. Ein von RLS blockiertes Schreiben meldet
//      keinen Fehler, es betrifft still 0 Zeilen (CLAUDE.md 24.1). Stilles
//      Nichtstun war ja gerade das Problem.
async function katalogFeldSchreiben(tabelle,id,patch){
 const {data,error}=await sb.from(tabelle).update(patch).eq("id",id).select("id");
 if(error)return {ok:false,meldung:error.message,
   rls:/permission|policy|row-level/i.test(error.message||"")};
 if(!data||!data.length)return {ok:false,meldung:"",rls:true};
 return {ok:true,meldung:"",rls:false};
}
// Baut einen verzoegerten Speicherer fuer eine Tabelle. Dieselbe Verzoegerung
// wie bisher (500 ms) - es wird nur wirklich geschickt und das Ergebnis
// gemeldet.
function katalogSpeicher(tabelle,ms){
 return debounce(async(id,patch)=>{
  const r=await katalogFeldSchreiben(tabelle,id,patch);
  if(r.ok){katalogHinweis("✓ Gespeichert.");return}
  katalogHinweis(r.meldung
    ?("Nicht gespeichert: "+r.meldung+(r.rls?" Dafür fehlt die Berechtigung.":""))
    :"Nicht gespeichert – fehlt die nötige Berechtigung?",true);
 },ms===undefined?500:ms);
}
// Eine kurze Rueckmeldung, die nicht uebersehen werden kann. Sie steht fest
// am unteren Rand, weil die Einstellungen lang sind und die geaenderte Zeile
// beim Tippen ueberall stehen kann.
let katalogHinweisZeit=null;
function katalogHinweis(text,fehler){
 const el=$("katalogHinweis");
 if(!el){if(fehler)alert(text);return}
 el.textContent=text||"";
 el.classList.toggle("fehler",!!fehler);
 el.classList.toggle("an",!!text);
 clearTimeout(katalogHinweisZeit);
 // Ein Fehler bleibt laenger stehen als eine Bestaetigung.
 if(text)katalogHinweisZeit=setTimeout(()=>el.classList.remove("an"),fehler?8000:2000);
}
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
// Lieferanten-Lager (js/82, Artikel per Scan buchen) und vom Material-Katalog
// in den Einstellungen (js/08, Barcode an einem Artikel hinterlegen).
//
// Die Bibliothek (ZXing) wird erst beim ERSTEN Scan nachgeladen, nicht bei
// jedem App-Start - sie wird nicht auf jedem Bildschirm gebraucht.
//
// v3.205: Sie kommt aus dem Projekt (vendor/), nicht mehr von einem fremden
// Server. Gescannt wird im Lager, und ein Lager ist oft genau der Ort mit
// dem schlechtesten Empfang im Haus. Bisher hiess es dort
// "Scan-Bibliothek konnte nicht geladen werden - Internetverbindung
// pruefen"; jetzt liegt sie nach dem ersten Scan im Zwischenspeicher des
// Service Workers und ist auch ohne Verbindung da. An der Kamera-Logik
// selbst aendert sich dabei NICHTS - nur, woher die Datei kommt.
// ---------------------------------------------------------------------------
let zxingLadenPromise=null;
function zxingLaden(){
 if(typeof ZXing!=="undefined")return Promise.resolve();
 if(zxingLadenPromise)return zxingLadenPromise;
 zxingLadenPromise=new Promise((resolve,reject)=>{
  const s=document.createElement("script");
  s.src="vendor/zxing.umd.min.js";
  s.onload=()=>{ if(typeof ZXing!=="undefined")resolve(); else reject(new Error("Scan-Bibliothek antwortet nicht.")) };
  s.onerror=()=>{ zxingLadenPromise=null; reject(new Error("Scan-Bibliothek konnte nicht geladen werden. Bitte die App einmal mit Verbindung öffnen, danach geht der Scan auch ohne.")) };
  document.head.appendChild(s);
 });
 return zxingLadenPromise;
}

let barcodeScanCodeReader=null, barcodeScanControls=null, barcodeScanAktuellerCallback=null;

// ---- Kamerawahl, Zoom und Diagnose (v3.222) ------------------------------
//
// STAND DER DINGE, ehrlich: der Anwender meldet zu v3.221 "Klappt nicht,
// stellt nicht scharf und erkennt nichts... in der migros app klappt das
// aber auf dem selben gerät problemlos in ca 0.5 sekunden". Er SIEHT, dass
// das Bild unscharf ist - kein Barcode-Leser der Welt liest ein unscharfes
// Bild, also ist der Fokus die Ursache und nicht die Erkennung.
//
// Seit v3.107 habe ich daran fuenfzehn Mal geraten, weil aus der
// Entwicklungsumgebung kein Zugriff auf eine echte Kamera moeglich ist.
// Damit ist jetzt Schluss. Diese Fassung raet nicht, sie macht drei Dinge:
//
// 1. KAMERAWAHL. Ein modernes Android-Handy hat drei bis vier Kameras
//    hinten. facingMode:"environment" laesst die Wahl dem Browser - und der
//    nimmt regelmaessig die Ultraweitwinkel-Kamera, die einen FESTEN Fokus
//    hat und naeher als etwa 10 cm grundsaetzlich nicht scharf werden KANN.
//    Genau das passt zu "stellt nicht scharf". Die App zaehlt die Kameras
//    jetzt auf und laesst den Anwender selbst waehlen; die Wahl wird
//    gemerkt. Eine native App wie die von Migros waehlt die Kamera
//    ebenfalls gezielt - das ist der Unterschied, nicht die Erkennung.
//
// 2. ZOOM. Der ueblich gewordene Weg im Browser, wenn eine Kamera nicht nah
//    scharf wird: nicht naeher herangehen, sondern aus 20-30 cm mit Zoom
//    arbeiten. Dort wird jede Kamera scharf. Chrome/Android unterstuetzt
//    zoom ueber applyConstraints; wo es das nicht gibt, bleibt der Regler
//    weg.
//
// 3. DIAGNOSE. Das Overlay zeigt auf Wunsch, was das Geraet wirklich
//    liefert: welche Kameras es gibt, welche laeuft, mit welcher Auflösung,
//    welche Fokus-/Zoom-Faehigkeiten sie meldet, ob der eingebaute
//    Barcode-Leser da ist und wie viele Leseversuche pro Sekunde laufen.
//    Damit muss nicht mehr geraten werden - die Angaben lassen sich
//    kopieren und weitergeben.
//
// AUSSERDEM GEAENDERT: die Wunsch-Vorgabe fuer getUserMedia enthaelt kein
// "advanced" mehr. Eine advanced-Vorgabe beeinflusst, WELCHE Kamera-
// Konfiguration der Browser waehlt - beim Versuch, focusMode:"continuous"
// zu erfuellen, kann er auf eine andere Kamera ausweichen. Der Fokuswunsch
// wird deshalb erst NACH dem Start auf dem laufenden Track gesetzt (siehe
// barcodeScanDauerfokus), wo er nichts mehr umlenken kann. Die angefragte
// Auflösung sinkt von 1920x1080 auf 1280x720: das reicht fuer jeden
// Barcode, ist bei der Erkennung schneller und laesst dem Geraet mehr
// Kamera-Konfigurationen mit Autofokus offen.
const BARCODE_KAMERA_MERKER="spenglerBarcodeKamera";
const BARCODE_ZOOM_MERKER="spenglerBarcodeZoom";

function barcodeScanGemerkt(schluessel){
 try{ return localStorage.getItem(schluessel)||""; }catch(e){ return ""; }
}
function barcodeScanMerken(schluessel,wert){
 try{ if(wert)localStorage.setItem(schluessel,String(wert)); else localStorage.removeItem(schluessel); }catch(e){}
}

// Die Wunsch-Vorgabe. Mit gemerkter Kamera wird DIESE genommen (exact waere
// zu hart - ist die Kamera weg, soll die App trotzdem oeffnen).
function barcodeScanWunschKonstraint(){
 const id=barcodeScanGemerkt(BARCODE_KAMERA_MERKER);
 const v={width:{ideal:1280},height:{ideal:720}};
 if(id)v.deviceId={ideal:id}; else v.facingMode={ideal:"environment"};
 return {video:v};
}

// Kamera stoppen und Overlay schliessen. Sicher mehrfach aufrufbar (z. B.
// einmal beim erfolgreichen Scan, einmal beim Abbrechen-Klick danach).
function barcodeScanSchliessen(){
 // v3.221: auch der eingebaute Leser des Geraets muss aufhoeren - sonst
 // laeuft sein Takt weiter, nachdem die Kamera schon freigegeben ist.
 barcodeScanDetektorStoppen();
 if(barcodeScanDiagnoseTakt){ clearInterval(barcodeScanDiagnoseTakt); barcodeScanDiagnoseTakt=null; }
 try{ if(barcodeScanControls&&barcodeScanControls.stop)barcodeScanControls.stop(); }catch(e){}
 try{ if(barcodeScanCodeReader&&barcodeScanCodeReader.reset)barcodeScanCodeReader.reset(); }catch(e){}
 try{
  const stream=$("barcodeScanVideo")&&$("barcodeScanVideo").srcObject;
  if(stream&&stream.getTracks)stream.getTracks().forEach(t=>t.stop());
 }catch(e){}
 barcodeScanControls=null;
 if($("barcodeScanOverlay"))$("barcodeScanOverlay").hidden=true;
 if($("barcodeScanManuellInput"))$("barcodeScanManuellInput").value="";
}
if($("barcodeScanAbbrechen"))$("barcodeScanAbbrechen").onclick=barcodeScanSchliessen;

// v3.116: TATSAECHLICHE URSACHE gefunden, siehe CHANGELOG_HISTORIE.md
// Abschnitt 182. decodeFromImageElement() der ZXing-Bibliothek akzeptiert
// laut eigener Typdefinition NUR ein <img>-Element (oder dessen ID) - kein
// <canvas>. Ein uebergebenes <canvas> erkennt die Bibliothek intern an
// keiner Stelle, wodurch der Aufruf mit einem Fehler abbrach, BEVOR
// ueberhaupt ein Dekodierversuch stattfand - unabhaengig davon, wie scharf
// das Foto tatsaechlich war. Dieser Fehler wurde bislang in JEDEM
// Einzelfoto-Dekodierpfad (v3.109/v3.111/v3.113/v3.114) still von einem
// try/catch verschluckt, weshalb er nie sichtbar wurde; erst der neue
// native Kamera-Pfad (v3.115) zeigt eine Statusmeldung bei einem
// Fehlschlag und machte das Problem dadurch erstmals sichtbar. Die neue
// Hilfsfunktion baut statt eines <canvas> ein echtes <img>-Element aus dem
// Foto auf, wie es die Bibliothek erwartet.
function barcodeScanBildElement(quelle){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(quelle);
  const img=new Image();
  img.onload=async()=>{
   // v3.117: "onload" (und selbst das Promise von img.decode()) meldet bei
   // einem aus einer object-URL geladenen Bild manchmal schon VOR dem
   // vollstaendigen Bereitstellen der Pixeldaten - ein direkt danach
   // gezeichnetes/ausgelesenes Canvas kann dadurch noch leer/unvollstaendig
   // sein. Direkt durch wiederholte Tests mit echten Barcodes gegen die
   // echte ZXing-Bibliothek bestaetigt: ohne kurze Wartezeit schlaegt das
   // Dekodieren eines eindeutig gueltigen Codes unregelmaessig fehl, mit
   // einer kurzen Wartezeit danach zuverlaessig nicht mehr.
   try{ if(typeof img.decode==="function")await img.decode().catch(()=>{}); }catch(e){}
   await new Promise(r=>setTimeout(r,300));
   resolve({img,url});
  };
  img.onerror=()=>{ try{URL.revokeObjectURL(url)}catch(e){}; reject(new Error("Bild konnte nicht geladen werden")); };
  img.src=url;
 });
}

// v3.117: Sicherheitsnetz gegen ein stilles Haengenbleiben. ZXing wiederholt
// decodeFromImageElement() bei einer ChecksumException/FormatException (ein
// Code wurde ERKANNT, aber nicht sauber gelesen) intern automatisch per
// setTimeout - OHNE eingebaute Obergrenze. Liefert ein Foto wiederholt genau
// so einen Fehler (z. B. ein teilweise verdeckter/leicht verzerrter Code),
// koennte die Auswertung dadurch unbegrenzt lange "Foto wird ausgewertet …"
// anzeigen, ohne je durchzukommen. Ein Zeitlimit stellt sicher, dass immer
// eine Rueckmeldung erscheint statt eines stillen Haengenbleibens.
function barcodeScanMitZeitlimit(promise,ms){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error("Zeitueberschreitung beim Auswerten des Fotos.")),ms);
  promise.then(
   v=>{clearTimeout(timer);resolve(v)},
   e=>{clearTimeout(timer);reject(e)}
  );
 });
}

// ---- Fokus im laufenden Bild (v3.221) ------------------------------------
//
// ECHTER FEHLER, vom Anwender gemeldet: "Bild im scanner wird beim
// draufklicken wieder kurz schwarz und kommt dan wieder."
//
// Ursache war kein Kamerafehler, sondern was hier bis v3.220 beim Tippen
// passierte. Der Tipp-Handler stammte aus v3.113/v3.114, als das laufende
// Bild NICHT der Weg zum Scannen war, sondern nur eine Vorschau vor einer
// Fotoaufnahme: er stoppte die Vorschau vollstaendig, wartete 200 ms,
// forderte einen NEUEN Stream nur fuer ein Foto an, wartete dort 1000 ms
// auf dessen Autofokus, nahm ein Einzelfoto auf, gab den Stream wieder
// frei und forderte danach einen DRITTEN Stream fuer die Vorschau an.
// Dazwischen hing am <video> kein Bild - das sind die rund anderthalb
// Sekunden Schwarz. Seit v3.220 der Live-Scan der normale Weg ist, riss
// dieses Tippen also genau das ab, was man gerade benutzt.
//
// Jetzt wird der Stream beim Tippen NIE MEHR angefasst. Es gibt keinen
// Pfad mehr, der video.srcObject leert oder einen zweiten Stream
// anfordert - deshalb kann das Bild beim Tippen auch nicht mehr schwarz
// werden. Stattdessen wird dem laufenden Track ueber applyConstraints()
// ein Fokus-Anstoss gegeben: einmal "single-shot" (scharfstellen auf das,
// was jetzt im Bild ist), danach zurueck auf "continuous", damit er
// weiter von selbst nachfuehrt. Beides nur, wenn das Geraet es in
// getCapabilities() auch wirklich anbietet - sonst passiert nichts, was
// ausdruecklich in Ordnung ist: der Dauerautofokus laeuft ja ohnehin.
//
// Ehrliche Einschraenkung, wie schon in v3.107-v3.116: aus der
// Entwicklungsumgebung ist kein Zugriff auf eine echte Geraetekamera
// moeglich. Dass das Bild beim Tippen nicht mehr schwarz wird, ist
// strukturell sicher (der abreissende Pfad existiert nicht mehr, der
// Pruefstand belegt das). Wie gut der Autofokus auf dem konkreten Geraet
// nachfuehrt, kann nur der Anwender bestaetigen.
function barcodeScanFokusModi(track){
 let faehig=null;
 try{ faehig=(track&&track.getCapabilities)?track.getCapabilities():null; }catch(e){}
 return (faehig&&faehig.focusMode)||[];
}

// Dauerautofokus anfordern - die Vorgabe aus getUserMedia wird von manchen
// Browsern nur teilweise umgesetzt, ueber den laufenden Track aber
// akzeptiert. Kein neuer Stream, kein zweiter Berechtigungsdialog.
async function barcodeScanDauerfokus(track){
 if(!track||!track.applyConstraints)return false;
 if(barcodeScanFokusModi(track).indexOf("continuous")<0)return false;
 try{ await track.applyConstraints({advanced:[{focusMode:"continuous"}]}); return true; }
 catch(e){ return false; }
}

async function barcodeScanFokusAnstossen(){
 const video=$("barcodeScanVideo");
 const stream=video&&video.srcObject;
 if(!stream||!stream.getVideoTracks)return;
 const track=stream.getVideoTracks()[0];
 if(!track||!track.applyConstraints)return;
 const modi=barcodeScanFokusModi(track);
 try{
  if(modi.indexOf("single-shot")>=0){
   await track.applyConstraints({advanced:[{focusMode:"single-shot"}]});
   // Kurz scharfstellen lassen, dann wieder abgeben an den Dauerautofokus -
   // sonst bliebe die Kamera auf dieser einen Entfernung stehen.
   await new Promise(r=>setTimeout(r,700));
  }
 }catch(e){/* Vorgabe nicht unterstuetzt - bewusst ignoriert */}
 await barcodeScanDauerfokus(track);
}
if($("barcodeScanVideo"))$("barcodeScanVideo").addEventListener("click",barcodeScanFokusAnstossen);

// ---- Der eingebaute Scanner des Geraets (v3.221) --------------------------
//
// Frage des Anwenders: "gibt es nicht extra eine scanner funktion um so
// etwas zu machen? Zb. Die Migros app hat so einen scanner eingebaut ...
// dort laeuft immer das livebild und es fokussiert immer ohne etwas zu
// tun."
//
// Die gibt es: BarcodeDetector, der Barcode-Leser, den der Browser selbst
// mitbringt. Auf Android/Chrome ist das dieselbe eingebaute Erkennung, die
// auch native Apps benutzen - sie laeuft ausserhalb von JavaScript, ist
// deutlich schneller und liest unschaerfere und schraegere Codes als die
// mitgelieferte Bibliothek. Sie ist aber nicht ueberall da (iOS/Safari
// kennt sie nicht), deshalb ist sie ein PLUS, kein Ersatz:
//
// Beide lesen dasselbe laufende Bild. ZXing laeuft weiter wie bisher (es
// besitzt den Stream und das <video>), der eingebaute Leser schaut
// zusaetzlich alle 200 ms auf denselben <video>-Inhalt. Wer zuerst einen
// Code sieht, gewinnt; barcodeScanTreffer() laesst nur den ersten durch.
// Faellt der eingebaute Leser aus oder gibt es ihn nicht, aendert sich
// gegenueber v3.220 nichts.
let barcodeScanDetektorTimer=null;

function barcodeScanDetektorStoppen(){
 if(barcodeScanDetektorTimer){ clearInterval(barcodeScanDetektorTimer); barcodeScanDetektorTimer=null; }
}

// Genau EINMAL melden - egal, welcher Weg zuerst da ist (eingebauter Leser,
// ZXing, Foto oder von Hand eingetippt). Der Merker dafuer ist der Callback
// selbst: er wird hier entnommen und sofort geloescht, ein zweiter Treffer
// findet also nichts mehr vor und schliesst nur noch (was ohne Wirkung ist,
// wenn schon geschlossen). Ein eigenes Flag waere eine zweite Wahrheit, die
// man beim Oeffnen zuruecksetzen muesste - und genau das vergisst man.
function barcodeScanTreffer(text){
 const cb=barcodeScanAktuellerCallback;
 barcodeScanAktuellerCallback=null;
 barcodeScanSchliessen();
 if(cb)cb(text);
}

// Den eingebauten Leser bauen - oder null, wenn es ihn nicht gibt. Die
// Abfrage der unterstuetzten Formate ist wichtig: auf manchen Geraeten
// existiert BarcodeDetector, kann aber kein einziges Format.
async function barcodeScanDetektorBauen(){
 if(typeof BarcodeDetector==="undefined")return null;
 try{
  const formate=await BarcodeDetector.getSupportedFormats();
  if(!formate||!formate.length)return null;
  return new BarcodeDetector({formats:formate});
 }catch(e){ return null; }
}

async function barcodeScanDetektorStarten(){
 const video=$("barcodeScanVideo");
 if(!video)return false;
 const detektor=await barcodeScanDetektorBauen();
 if(!detektor)return false;
 let laeuft=false;   // detect() ist asynchron - kein zweiter Lauf daneben
 barcodeScanDetektorStoppen();
 barcodeScanDetektorTimer=setInterval(async()=>{
  if(laeuft)return;
  if(!video.srcObject||video.readyState<2)return;
  laeuft=true;
  barcodeScanLeseversuche++;   // v3.222: sichtbar in der Diagnose
  try{
   const codes=await detektor.detect(video);
   if(codes&&codes.length&&codes[0].rawValue)barcodeScanTreffer(codes[0].rawValue);
  }catch(e){/* einzelner Leseversuch fehlgeschlagen - beim naechsten weiter */}
  laeuft=false;
 },200);
 return true;
}

// ---- Kameraliste, Zoom-Regler und Diagnose (v3.222) ----------------------
let barcodeScanLeseversuche=0, barcodeScanDiagnoseTakt=null, barcodeScanDetektorDa=false;

// Alle Kameras des Geraets. Vor einer erteilten Freigabe liefert der Browser
// die Namen leer - deshalb wird die Liste erst NACH dem Start gefuellt, wo
// die Freigabe schon vorliegt und die Namen ("Kamera hinten, Ultraweit") da
// sind. Genau diese Namen braucht der Anwender, um zu waehlen.
async function barcodeScanKameras(){
 try{
  if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return [];
  const alle=await navigator.mediaDevices.enumerateDevices();
  return alle.filter(g=>g.kind==="videoinput");
 }catch(e){ return []; }
}

function barcodeScanKameraName(geraet,nr){
 const name=(geraet&&geraet.label||"").trim();
 return name||("Kamera "+nr);
}

// Die Kameraliste als Knopfreihe. Der laufende Eintrag ist markiert. Ein
// Klick merkt die Kamera und startet den Scan mit ihr neu.
async function barcodeScanKamerawahlZeichnen(){
 const feld=$("barcodeScanKamerawahl");
 if(!feld)return;
 const kameras=await barcodeScanKameras();
 // Eine einzige Kamera braucht keine Wahl.
 if(kameras.length<2){ feld.hidden=true; feld.innerHTML=""; return; }
 const laufend=barcodeScanAktuelleEinstellungen().deviceId||"";
 feld.hidden=false;
 feld.innerHTML='<span class="barcode-scan-wahl-titel">Kamera:</span>'+
  kameras.map((g,i)=>{
   const aktiv=g.deviceId&&g.deviceId===laufend;
   return '<button type="button" class="barcode-scan-wahl-knopf'+(aktiv?" aktiv":"")+
    '" data-barcode-kamera="'+esc(g.deviceId)+'">'+esc(barcodeScanKameraName(g,i+1))+'</button>';
  }).join("");
}

// Der laufende Track und seine echten Werte - an einer Stelle, damit die
// Diagnose und die Kamerawahl dieselbe Quelle benutzen.
function barcodeScanTrack(){
 const video=$("barcodeScanVideo");
 const stream=video&&video.srcObject;
 if(!stream||!stream.getVideoTracks)return null;
 return stream.getVideoTracks()[0]||null;
}
function barcodeScanAktuelleEinstellungen(){
 const track=barcodeScanTrack();
 try{ return (track&&track.getSettings)?track.getSettings():{}; }catch(e){ return {}; }
}
function barcodeScanFaehigkeiten(){
 const track=barcodeScanTrack();
 try{ return (track&&track.getCapabilities)?track.getCapabilities():{}; }catch(e){ return {}; }
}

// Zoom. Der einzige Weg, der im Browser verlaesslich hilft, wenn eine
// Kamera nah nicht scharf wird: Abstand halten und heranzoomen.
function barcodeScanZoomZeichnen(){
 const zeile=$("barcodeScanZoomZeile"), regler=$("barcodeScanZoom");
 if(!zeile||!regler)return;
 const z=barcodeScanFaehigkeiten().zoom;
 if(!z||!(Number(z.max)>Number(z.min))){ zeile.hidden=true; return; }
 zeile.hidden=false;
 regler.min=z.min; regler.max=z.max; regler.step=z.step||0.1;
 const gemerkt=Number(barcodeScanGemerkt(BARCODE_ZOOM_MERKER));
 const start=(gemerkt>=z.min&&gemerkt<=z.max)?gemerkt:Number(barcodeScanAktuelleEinstellungen().zoom||z.min);
 regler.value=start;
 barcodeScanZoomSetzen(start);
}

async function barcodeScanZoomSetzen(wert){
 const track=barcodeScanTrack();
 const anzeige=$("barcodeScanZoomWert");
 if(anzeige)anzeige.textContent=(Number(wert)).toFixed(1).replace(".",",")+"×";
 if(!track||!track.applyConstraints)return;
 try{ await track.applyConstraints({advanced:[{zoom:Number(wert)}]}); barcodeScanMerken(BARCODE_ZOOM_MERKER,wert); }
 catch(e){/* Zoom nicht unterstuetzt - Regler bleibt ohne Wirkung */}
}
if($("barcodeScanZoom"))$("barcodeScanZoom").addEventListener("input",e=>barcodeScanZoomSetzen(e.target.value));

// Die Diagnose. Reiner Text, damit er sich kopieren und weitergeben laesst.
async function barcodeScanDiagnoseText(){
 const e=barcodeScanAktuelleEinstellungen(), f=barcodeScanFaehigkeiten();
 const kameras=await barcodeScanKameras();
 let formate="nicht vorhanden";
 if(typeof BarcodeDetector!=="undefined"){
  try{ const l=await BarcodeDetector.getSupportedFormats(); formate=(l&&l.length)?l.join(", "):"vorhanden, aber kein Format"; }
  catch(err){ formate="vorhanden, Abfrage fehlgeschlagen"; }
 }
 const zeilen=[
  "App-Version: "+(($("appVersion")&&$("appVersion").textContent)||"?"),
  "Gerät/Browser: "+navigator.userAgent,
  "",
  "Eingebauter Barcode-Leser: "+formate,
  "Läuft mit: "+(barcodeScanDetektorDa?"eingebautem Leser + ZXing":"nur ZXing"),
  "Leseversuche (eingebauter Leser): "+barcodeScanLeseversuche,
  "",
  "Kameras am Gerät: "+kameras.length,
  ...kameras.map((g,i)=>"  "+(i+1)+". "+barcodeScanKameraName(g,i+1)+
   (g.deviceId===e.deviceId?"   <-- läuft gerade":"")),
  "",
  "Laufende Kamera:",
  "  Auflösung: "+(e.width||"?")+" x "+(e.height||"?")+"  bei "+(e.frameRate?Math.round(e.frameRate):"?")+" Bildern/s",
  "  facingMode: "+(e.facingMode||"—"),
  "  focusMode: "+(e.focusMode||"—")+"   (Gerät kann: "+((f.focusMode&&f.focusMode.join(", "))||"keine Angabe")+")",
  "  focusDistance: "+(e.focusDistance!==undefined?e.focusDistance:"—")+
   "   (Bereich: "+(f.focusDistance?f.focusDistance.min+"–"+f.focusDistance.max:"keine Angabe")+")",
  "  Zoom: "+(e.zoom!==undefined?e.zoom:"—")+
   "   (Bereich: "+(f.zoom?f.zoom.min+"–"+f.zoom.max:"keine Angabe")+")",
  "  Bild im <video>: "+(($("barcodeScanVideo")&&$("barcodeScanVideo").videoWidth)||0)+" x "+
   (($("barcodeScanVideo")&&$("barcodeScanVideo").videoHeight)||0)
 ];
 return zeilen.join("\n");
}

async function barcodeScanDiagnoseZeichnen(){
 const feld=$("barcodeScanDiagnoseText");
 if(!feld)return;
 // Nur rechnen, wenn der Anwender die Angaben ueberhaupt aufgeklappt hat.
 const kasten=$("barcodeScanDiagnose");
 if(kasten&&!kasten.open)return;
 feld.textContent=await barcodeScanDiagnoseText();
}
if($("barcodeScanDiagnose"))$("barcodeScanDiagnose").addEventListener("toggle",barcodeScanDiagnoseZeichnen);
if($("barcodeScanDiagnoseKopieren"))$("barcodeScanDiagnoseKopieren").onclick=async()=>{
 const text=await barcodeScanDiagnoseText();
 const sagen=t=>{ const s=$("barcodeScanStatus"); if(s){s.textContent=t;s.style.color="#fff"} };
 try{ await navigator.clipboard.writeText(text); sagen("Angaben kopiert - jetzt einfügen und schicken."); }
 catch(e){
  // Kein Zugriff auf die Zwischenablage (kommt vor): dann wenigstens
  // markierbar hinlegen statt nichts zu tun.
  const feld=$("barcodeScanDiagnoseText");
  if(feld){ feld.textContent=text; const r=document.createRange(); r.selectNodeContents(feld);
   const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
  sagen("Kopieren nicht erlaubt - der Text ist markiert, bitte von Hand kopieren.");
 }
};

// Kamera wechseln: merken und denselben Weg neu gehen (barcodeScannen ist
// die einzige Stelle, die eine Kamera oeffnet - keine zweite Wahrheit).
async function barcodeScanKameraWechseln(id){
 const cb=barcodeScanAktuellerCallback;
 barcodeScanMerken(BARCODE_KAMERA_MERKER,id);
 // Der Zoom gehoert zur Kamera, nicht zum Geraet - bei einem Wechsel weg.
 barcodeScanMerken(BARCODE_ZOOM_MERKER,"");
 barcodeScanSchliessen();
 if(cb)await barcodeScannen(cb);
}
document.addEventListener("click",e=>{
 const k=e.target&&e.target.closest&&e.target.closest("[data-barcode-kamera]");
 if(k)barcodeScanKameraWechseln(k.getAttribute("data-barcode-kamera"));
});

// v3.114: manuelle Code-Eingabe als garantierter Rueckweg, unabhaengig von
// jeder Kamera-Eigenheit - falls die Kamera einen Code partout nicht
// scharf bekommt, kann er von Hand eingegeben werden (z. B. abgelesen vom
// Etikett). Ruft denselben callback wie ein erfolgreicher Scan auf.
function barcodeScanManuellUebernehmen(){
 const eingabe=$("barcodeScanManuellInput");
 if(!eingabe)return;
 const text=eingabe.value.trim();
 if(!text)return;
 // v3.221: ueber dieselbe Stelle wie die beiden Leser - so kann ein
 // gleichzeitig erkannter Code nicht ein zweites Mal gemeldet werden.
 barcodeScanTreffer(text);
}
if($("barcodeScanManuellUebernehmen"))$("barcodeScanManuellUebernehmen").onclick=barcodeScanManuellUebernehmen;
if($("barcodeScanManuellInput"))$("barcodeScanManuellInput").addEventListener("keydown",e=>{
 if(e.key==="Enter"){e.preventDefault();barcodeScanManuellUebernehmen()}
});

// v3.115: alternative Kamera-Oeffnung ueber die ECHTE native Kamera-App des
// Geraets statt der Web-Kamera-Vorschau oben. <input type="file"
// accept="image/*" capture="environment"> ruft auf Mobilgeraeten die
// eigentliche Kamera-App auf (mit deren komplettem Aufnahme-, Fokus- und
// Zoom-Verhalten) statt eine Web-API wie getUserMedia/ImageCapture
// anzusteuern - genau der Weg, der beim Anwender nachweislich scharf
// scharfstellt (native Kamera-App-Test in v3.109 bestaetigt), unabhaengig
// von allen bisherigen Problemen mit der Web-Kamera-Vorschau. Das
// aufgenommene Foto wird danach wie ein Foto aus der Kamera-Vorschau auf
// einen Barcode untersucht.
async function barcodeScanNativeFotoAusgewaehlt(e){
 const datei=e.target.files&&e.target.files[0];
 e.target.value="";
 if(!datei)return;
 const status=$("barcodeScanStatus");
 if(!barcodeScanCodeReader||typeof barcodeScanCodeReader.decodeFromImageElement!=="function"){
  if(status){status.textContent="Foto konnte nicht ausgewertet werden.";status.style.color="#ffb3b3"}
  return;
 }
 if(status){status.textContent="Foto wird ausgewertet …";status.style.color="#fff"}
 let bild=null;
 try{
  bild=await barcodeScanBildElement(datei);
  const result=await barcodeScanMitZeitlimit(barcodeScanCodeReader.decodeFromImageElement(bild.img),6000);
  const text=result?result.getText():null;
  if(text){
   barcodeScanTreffer(text);   // v3.221: eine Stelle fuer alle Wege
   return;
  }
  if(status){status.textContent="Kein Code im Foto gefunden - nochmal versuchen oder unten eintippen.";status.style.color="#ffb3b3"}
 }catch(e){
  // ZXing lehnt decodeFromImageElement() bei einem Foto OHNE erkennbaren
  // Code mit einer NotFoundException ab, statt einfach null zurueckzugeben -
  // das ist der Normalfall "kein Code im Bild", kein technischer Fehler.
  // v3.117: e.name/e.constructor.name sind im minifizierten CDN-Bundle NICHT
  // mehr "NotFoundException" (auf einen kurzen, einzelnen Buchstaben
  // verkuerzt) - der Vergleich per Name schlug dadurch IMMER fehl, egal ob
  // echter Fehler oder normaler "kein Code gefunden"-Fall, und zeigte
  // deshalb immer die alarmierendere generische Meldung. ZXing.NotFoundException
  // bleibt als Klasse selbst unter diesem Namen global zugaenglich (Pruefung
  // per instanceof direkt gegen echten Code in der ZXing-Bibliothek bestaetigt).
  const keinCodeGefunden=(typeof ZXing!=="undefined"&&ZXing.NotFoundException&&e instanceof ZXing.NotFoundException)||(e&&/not found/i.test(e.message||""));
  if(keinCodeGefunden){
   if(status){status.textContent="Kein Code im Foto gefunden - nochmal versuchen oder unten eintippen.";status.style.color="#ffb3b3"}
  }else{
   if(status){status.textContent="Foto konnte nicht ausgewertet werden.";status.style.color="#ffb3b3"}
  }
 }finally{
  if(bild)try{URL.revokeObjectURL(bild.url)}catch(e){}
 }
}
if($("barcodeScanNativeKamera"))$("barcodeScanNativeKamera").onclick=()=>{
 if($("barcodeScanNativeInput"))$("barcodeScanNativeInput").click();
};
if($("barcodeScanNativeInput"))$("barcodeScanNativeInput").addEventListener("change",barcodeScanNativeFotoAusgewaehlt);

// Oeffnet die Kamera und ruft callback(code) GENAU EINMAL mit dem erkannten
// Text auf, dann schliesst sich das Overlay von selbst. Ein Abbrechen-Klick
// ruft callback nicht auf. Fehler (kein Netz, keine Kamera-Freigabe) werden
// sichtbar im Overlay gemeldet statt still zu scheitern.
async function barcodeScannen(callback){
 const overlay=$("barcodeScanOverlay"), status=$("barcodeScanStatus"), video=$("barcodeScanVideo");
 if(!overlay||!video)return;
 overlay.hidden=false;
 barcodeScanAktuellerCallback=callback;
 barcodeScanLeseversuche=0;
 // v3.220: Gescannt wird im LAUFENDEN BILD. Ansage des Anwenders: "ich
 // moechte das der barcodescanner als livebild scanner funktioniert und man
 // nicht vorher erst ein foto machen muss und dieses dan ausgewertet wird."
 //
 // v3.119 hatte hier die native Kamera-App automatisch geoeffnet - damals
 // der einzige Weg, der auf dem Geraet des Anwenders zuverlaessig scharf
 // wurde. Diese Zeile faellt weg: die Live-Erkennung weiter unten
 // (decodeFromConstraints) lief die ganze Zeit schon, sie war nur hinter der
 // Foto-Aufnahme versteckt. Der Fokus-Grund ist seit v3.116 behoben.
 //
 // Der Weg ueber die Kamera-App bleibt als Knopf im Overlay - er ist der
 // Rueckweg, wenn ein Code im Live-Bild partout nicht scharf wird. Aus einem
 // automatischen Zwang wird damit ein Angebot.
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
  const aufTreffer=(result,err,controls)=>{
   barcodeScanControls=controls;
   // v3.221: ueber die gemeinsame Stelle - seit der eingebaute Leser des
   // Geraets parallel mitliest, darf nur der erste Treffer durchkommen.
   if(result)barcodeScanTreffer(result.getText());
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
  // Rueckfall bei einer zu engen Vorgabe: alles fallen lassen ausser der
  // Kamerawahl selbst - die ist das Einzige, was der Anwender ausdruecklich
  // gesetzt hat und was wir ihm nicht stillschweigend wegnehmen duerfen.
  const gemerkteKamera=barcodeScanGemerkt(BARCODE_KAMERA_MERKER);
  const engerKonstraint=gemerkteKamera
   ?{video:{deviceId:{ideal:gemerkteKamera}}}
   :{video:{facingMode:{ideal:"environment"}}};
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
  const track=video.srcObject&&video.srcObject.getVideoTracks&&video.srcObject.getVideoTracks()[0];
  await barcodeScanDauerfokus(track);

  // v3.221: zusaetzlich den eingebauten Barcode-Leser des Geraets mitlesen
  // lassen (siehe Kommentar bei barcodeScanDetektorStarten). Gibt es ihn
  // nicht, bleibt alles wie in v3.220.
  barcodeScanDetektorDa=await barcodeScanDetektorStarten();

  // v3.222: Kamerawahl und Zoom erst JETZT - die Kameranamen gibt der
  // Browser erst heraus, wenn die Freigabe erteilt ist, und die
  // Zoom-Grenzen kennt nur der laufende Track.
  await barcodeScanKamerawahlZeichnen();
  barcodeScanZoomZeichnen();
  await barcodeScanDiagnoseZeichnen();
  if(barcodeScanDiagnoseTakt)clearInterval(barcodeScanDiagnoseTakt);
  barcodeScanDiagnoseTakt=setInterval(barcodeScanDiagnoseZeichnen,1000);

  if(status)status.textContent="Code in den Rahmen halten …";
 }catch(err){
  const meldung=(err&&err.name==="NotAllowedError")
   ?"Kein Zugriff auf die Kamera - bitte in den Geräteeinstellungen erlauben."
   :(err&&err.message)?err.message:"Kamera konnte nicht gestartet werden.";
  if(status){status.textContent=meldung;status.style.color="#ffb3b3"}
 }
}

// ---- Excel-Bibliothek erst bei Bedarf laden (v3.205) ----------------------
// Bis v3.204 hing xlsx.full.min.js im Kopf von index.html: 880 kB, die BEI
// JEDEM START heruntergeladen, geparst und ausgefuehrt wurden - vor dem
// ersten sichtbaren Bild, denn ein <script> im Kopf blockiert das Zeichnen.
// Gebraucht wird die Bibliothek an genau zwei Stellen: beim Feedback-Export
// (js/02) und beim Katalog-Import (js/08). Beides macht man am Schreibtisch,
// selten, und nie auf dem Dach.
//
// Sie liegt jetzt wie supabase-js und jsPDF im Projekt (vendor/) und wird
// nachgeladen, wenn sie das erste Mal gebraucht wird. Danach ist sie da -
// die Zusage wird nur einmal gebaut, jeder weitere Aufruf bekommt dieselbe.
//
// BEWUSST NICHT im App-Vorrat (sw.js): sonst kostete die Installation die
// 880 kB wieder, nur eben vorher. Der Service Worker legt die Datei beim
// ersten Gebrauch von selbst ab (sein fetch-Handler speichert jede Antwort
// aus dem eigenen Haus) - ab dann geht der Export auch ohne Verbindung.
// Vorher ging er ohne Verbindung ueberhaupt nie, weil die Datei von einem
// fremden Server kam.
let xlsxZusage=null;
// ---- Die Passwortregel, an EINER Stelle (v3.248) ---------------------------
//
// WARUM SIE HIER STEHT UND NICHT DREIMAL
// Bis v3.247 stand "mindestens 8 Zeichen" an drei Stellen als eigene Zeile:
// js/03 (eigenes Passwort festlegen), js/69 zweimal (Passwort vergessen,
// Firmenregistrierung). Drei Kopien derselben Regel laufen auseinander,
// sobald eine davon erweitert wird - und genau das passiert hier.
//
// WARUM SIE MEHR PRUEFT ALS DIE LAENGE
// Supabase kann neue Passwoerter gegen HaveIBeenPwned pruefen und damit die
// Passwoerter abweisen, die in geleakten Listen stehen. Das ist ein
// Pro-Plan-Merkmal und steht diesem Konto nicht zur Verfuegung (Ansage des
// Anwenders, 02.10.2026). Die Luecke bleibt also, und "8 Zeichen" allein
// laesst "12345678" durch - das ist seit Jahren das haeufigste Passwort
// ueberhaupt.
//
// Diese Regel ist der freie Ersatz fuer den Teil, der wirklich zaehlt: die
// kurze Liste derer, die geraten werden. Sie ist BEWUSST kurz und verlangt
// KEINE Sonderzeichen, keine Ziffern, keine Grossbuchstaben. Erzwungene
// Komplexitaet erzeugt "Sommer2026!" und Zettel am Bildschirm; Laenge und
// "nicht das Offensichtliche" sind das, was traegt.
const PW_MINDESTLAENGE=8;
// Nur, was wirklich geraten wird - deutsch, englisch, und was in einem
// Spenglerbetrieb naheliegt.
const PW_ZU_EINFACH=[
 "12345678","123456789","1234567890","87654321","passwort","password",
 "qwertzuiop","asdfghjkl","qwertyuiop","password1","passwort1","willkommen",
 "welcome1","sommer2026","winter2026","geheim12","internet","computer",
 "spengler","spenglerei","dachdecker","blechner","firma123","admin123",
 "administrator","start1234","hallo123","schweiz1","test1234"
];
// Umlaute falten und alles Nicht-Alphanumerische weg - "Spengler!" und
// "spengler" sind dasselbe Passwort, nur anders getippt.
function pwNormal(s){
 return String(s||"").toLowerCase()
  .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
  .replace(/[^a-z0-9]/g,"");
}
// Wie viel EIGENES bleibt uebrig, wenn man alles Erratbare wegnimmt?
//
// Blosses Vorkommen abzuweisen waere zu streng: "Mike-Winterdach-7" enthaelt
// den Vornamen und ist trotzdem in Ordnung. Entfernt werden deshalb ALLE
// bekannten Bausteine in EINEM Durchgang - Vorname, Nachname, Firma, der
// Teil vor dem @ und die Liste der geratenen Woerter -, und danach muessen
// mindestens sechs Zeichen stehen bleiben.
//
// Gemessen an echten Beispielen: "kuenzi1x" -> "1x" (abgewiesen),
// "Kuenzi-Spengler" -> "" (abgewiesen, zwei Bausteine hintereinander),
// "mike1234" -> "1234" (abgewiesen), "Mike-Winterdach-7" -> "winterdach7"
// (angenommen), "Winterdach-Kupfer-7" -> unberuehrt (angenommen).
const PW_EIGENES_MINDESTENS=6;
function pwEigenerRest(pw,teile){
 let p=pwNormal(pw);
 // Auch WORTWEISE: "Peter Kuenzi AG" ist nicht nur als Ganzes erratbar,
 // sondern in jedem seiner Woerter. Ohne das kaeme "peter-kuenzi-dach"
 // durch, weil der ganze Firmenname so nie im Passwort steht.
 const roh=[];
 (teile||[]).forEach(t=>{
  roh.push(t);
  String(t||"").split(/[\s.,\/_-]+/).forEach(w=>roh.push(w));
 });
 const weg=roh.concat(PW_ZU_EINFACH)
  .map(pwNormal).filter(t=>t.length>=3)
  .sort((a,b)=>b.length-a.length);     // laengste zuerst, sonst bleiben Reste
 weg.forEach(t=>{ if(t)p=p.split(t).join("") });
 return p;
}
// Gibt den GRUND zurueck, nicht true/false - der Anwender soll lesen, was
// nicht stimmt, nicht dass etwas nicht stimmt.
// zu: {vorname,nachname,email,firma} - alles freiwillig.
function passwortSchwach(pw,zu){
 const p=String(pw||"");
 const z=zu||{};
 if(p.length<PW_MINDESTLAENGE)
  return "Das Passwort braucht mindestens "+PW_MINDESTLAENGE+" Zeichen.";
 const n=pwNormal(p);
 if(n.length&&new Set(n).size===1)
  return "Immer dasselbe Zeichen ist kein Passwort. Nimm etwas, das du dir merken kannst – ein paar Wörter hintereinander sind sicherer als ein kurzes mit Sonderzeichen.";
 // Eine durchlaufende Zahlenreihe - auf- oder abwaerts. Bewusst so
 // geschrieben, dass man sie lesen kann: jede Stelle genau eins mehr (oder
 // eins weniger) als die vorige. Eine Ziffernfolge OHNE Reihe ("48271936")
 // wird nicht abgewiesen - die ist nicht geraten, sondern gewaehlt.
 if(/^[0-9]+$/.test(p)){
  let auf=true, ab=true;
  for(let i=1;i<p.length;i++){
   if(Number(p[i])!==Number(p[i-1])+1)auf=false;
   if(Number(p[i])!==Number(p[i-1])-1)ab=false;
  }
  if(auf||ab)
   return "Eine durchlaufende Zahlenreihe wird als Erstes geraten. Nimm etwas, das du dir merken kannst – ein paar Wörter hintereinander sind sicherer als ein kurzes mit Sonderzeichen.";
 }
 if(PW_ZU_EINFACH.indexOf(n)>=0)
  return "Dieses Passwort steht auf jeder Liste, die zum Durchprobieren benutzt wird. Nimm etwas anderes – ein paar Wörter hintereinander sind leicht zu merken und schwer zu raten.";
 // Zum Schluss: was bleibt uebrig, wenn man Name, Firma und die geratenen
 // Woerter wegnimmt? Bleibt kaum etwas, ist das Passwort aus Bausteinen
 // gebaut, die jemand als Erstes probiert.
 const teile=[z.vorname,z.nachname,z.firma,String(z.email||"").split("@")[0]];
 if(teile.some(t=>pwNormal(t).length>=3)
    &&pwEigenerRest(p,teile).length<PW_EIGENES_MINDESTENS)
  return "Dein Name oder der Firmenname ist das Erste, was jemand probiert. "
   +"Nimm etwas dazu, das nichts mit dir zu tun hat – oder gleich ein paar Wörter hintereinander.";
 return "";
}

function xlsxLaden(){
 if(typeof XLSX!=="undefined")return Promise.resolve(true);
 if(xlsxZusage)return xlsxZusage;
 xlsxZusage=new Promise(fertig=>{
  const s=document.createElement("script");
  s.src="vendor/xlsx.full.min.js";
  s.onload=()=>fertig(typeof XLSX!=="undefined");
  // Kein Rueckfall auf ein CDN: eine zweite Quelle waere eine zweite
  // Wahrheit. Geht es nicht, sagen die Aufrufer das ehrlich.
  s.onerror=()=>{xlsxZusage=null;fertig(false)};
  document.head.appendChild(s);
 });
 return xlsxZusage;
}
