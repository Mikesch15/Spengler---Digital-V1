// ---------------------------------------------------------------------------
// v3.09  Erweiterter Projekt-/Material-/Werkstattworkflow: die Schalter
// ---------------------------------------------------------------------------
// Ein Hauptschalter und sieben Untermodule. STANDARD IST AUS - fuer neue wie
// fuer bestehende Firmen. Die Spalte app_settings.projektmodule hat den
// Vorgabewert '{}', jeder Schluessel fehlt also und pmAktiv() liefert false.
//
// Bei AUS verhaelt sich die App exakt wie bis Version 3.08: keine neuen
// Pflichtfelder, keine neuen Karten, keine Reservierungs- oder
// Versionierungspflicht, keine Vorlagen- oder Serienfunktionen. Jede neue
// Anzeige dieses Funktionsblocks fragt vorher pmAktiv().
//
// Geschrieben wird ausschliesslich ueber die Datenbankfunktion
// set_projektmodule(): sie prueft den Administrator serverseitig (streng, mit
// Firmenbezug) und normalisiert die Abhaengigkeiten. Der Schalter hier ist
// reine Bedienung - er ist KEINE Sicherheitsgrenze, sonst haenge die
// Absicherung an einem Wert, den ein Firmenadmin selbst setzt.
//
// Beim Ausschalten des Hauptschalters bleiben die Unterschalter GESPEICHERT
// (Auftrag Abschnitt 3: beim Deaktivieren nichts loeschen). Beim erneuten
// Einschalten ist die fruehere Auswahl wieder da.
// ---------------------------------------------------------------------------

// Reihenfolge und Text der Unterschalter. "braucht" nennt die Grundlage, ohne
// die das Untermodul nicht sinnvoll ist - dieselbe Regel steht serverseitig
// noch einmal in set_projektmodule().
const PM_MODULE=[
 {key:"material",     name:"Projektweite Materialübersicht",
  text:"Führt das Material aller Massaufnahmen eines Projekts zusammen."},
 {key:"zuschnitt",    name:"Projektweiter Zuschnitt", braucht:"material",
  text:"Fasst die Zuschnitte des ganzen Projekts zu einem Rollenblech-Plan zusammen."},
 {key:"reservierung", name:"Materialreservierung",    braucht:"material",
  text:"Material und Reststücke für ein Projekt reservieren."},
 {key:"werkstatt",    name:"Werkstatt-/Rüstansicht",
  text:"Zusätzliche Sicht auf den bestehenden Arbeitsablauf, mit der Rüstgrundlage."},
 {key:"vorlagen",     name:"Vorlagen",
  text:"Wiederkehrende Massaufnahmen als Vorlage speichern und verwenden."},
 {key:"serien",       name:"Serienaufnahmen",         braucht:"vorlagen",
  text:"Aus einer Vorlage mehrere eigenständige Massaufnahmen erzeugen."},
 {key:"versionierung",name:"Massaufnahme-Versionierung",
  text:"Hält die freigegebenen Stände fest. Baut auf der bestehenden Freigabelogik auf."}
];
const PM_KEYS=PM_MODULE.map(m=>m.key);

// Der geladene Stand. Wird in js/05-daten-laden.js aus app_settings gefuellt.
// Der Startwert ist bewusst ein leeres Objekt: solange nichts geladen ist,
// ist alles aus.
let projektModule={};

// Ist ein Untermodul wirklich in Betrieb? Nur wenn der Hauptschalter an ist
// UND das Untermodul selbst.
function pmAktiv(key){
 return !!(projektModule&&projektModule.haupt===true&&projektModule[key]===true);
}
// Ist ueberhaupt etwas an? Fuer Stellen, die nur den ganzen Block betreffen.
function pmHaupt(){return !!(projektModule&&projektModule.haupt===true)}

// Uebernimmt einen Stand aus der Datenbank. Fremde Schluessel werden nicht
// uebernommen, fehlende gelten als aus.
function pmUebernehmen(roh){
 const q=(roh&&typeof roh==="object"&&!Array.isArray(roh))?roh:{};
 const neu={haupt:q.haupt===true};
 PM_KEYS.forEach(k=>{neu[k]=q[k]===true});
 // Abhaengigkeiten auch beim Lesen anwenden, damit ein alter oder von Hand
 // geschriebener Stand nichts anzeigt, was seine Grundlage nicht hat.
 PM_MODULE.forEach(m=>{if(m.braucht&&!neu[m.braucht])neu[m.key]=false});
 projektModule=neu;
 return neu;
}

// ---- Einstellungsseite ----------------------------------------------------
function pmHinweis(text,fehler){
 const el=$("pmHinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}

// Zeichnet die Schalterliste. Die Unterschalter erscheinen nur, wenn der
// Hauptschalter an ist; ein Unterschalter ohne seine Grundlage ist gesperrt
// und sagt auch warum.
function renderProjektmodule(){
 const box=$("pmListe");
 if(!box)return;
 // Reine Bedienhilfe: wer kein Administrator ist, kann hier nichts
 // verstellen. Die Grenze ist trotzdem die Datenbank - set_projektmodule()
 // prueft den Administrator selbst und weist jeden anderen ab.
 const darf=(typeof isAdmin!=="function")||isAdmin();
 const haupt=$("pmHauptInput");
 if(haupt){haupt.value=projektModule.haupt===true?"ja":"nein"; haupt.disabled=!darf}
 if($("savePmModule"))$("savePmModule").disabled=!darf;
 if($("pmNurAdmin"))$("pmNurAdmin").hidden=darf;
 box.hidden=projektModule.haupt!==true;
 box.innerHTML=PM_MODULE.map(m=>{
  const gesperrt=!darf||!!(m.braucht&&projektModule[m.braucht]!==true);
  const an=projektModule[m.key]===true;
  const grund=gesperrt?PM_MODULE.find(x=>x.key===m.braucht):null;
  return `<label class="pm-zeile${gesperrt?" pm-gesperrt":""}">
   <input type="checkbox" data-pm="${esc(m.key)}"${an?" checked":""}${gesperrt?" disabled":""}>
   <span class="pm-text"><b>${esc(m.name)}</b><br><span class="small">${esc(m.text)}${
    grund?" <i>Braucht „"+esc(grund.name)+"“.</i>":""}</span></span></label>`;
 }).join("");
}

// Ein Klick aendert nur die Anzeige - gespeichert wird erst mit dem Knopf.
if($("pmListe")){
 $("pmListe").addEventListener("change",e=>{
  const k=e.target&&e.target.dataset?e.target.dataset.pm:null;
  if(!k||PM_KEYS.indexOf(k)<0)return;
  projektModule[k]=!!e.target.checked;
  if(!projektModule[k])PM_MODULE.forEach(m=>{if(m.braucht===k)projektModule[m.key]=false});
  renderProjektmodule();
  pmHinweis("");
 });
}
if($("pmHauptInput")){
 $("pmHauptInput").addEventListener("change",()=>{
  projektModule.haupt=$("pmHauptInput").value==="ja";
  renderProjektmodule();
  pmHinweis("");
 });
}

// Speichern. Der Rueckgabewert der Funktion ist massgeblich, nicht das, was
// die Oberflaeche gerade zeigt: die Datenbank normalisiert die
// Abhaengigkeiten und koennte etwas abschalten.
async function pmSpeichern(){
 const senden={haupt:projektModule.haupt===true};
 PM_KEYS.forEach(k=>{senden[k]=projektModule[k]===true});
 const {data,error}=await sb.rpc("set_projektmodule",{p_module:senden});
 if(error){
  console.error("set_projektmodule fehlgeschlagen:",error);
  pmHinweis("Konnte nicht gespeichert werden: "+(error.message||"unbekannter Fehler"),true);
  return false;
 }
 if(!data){
  pmHinweis("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?",true);
  return false;
 }
 pmUebernehmen(data);
 renderProjektmodule();
 pmNachAenderung();
 const an=PM_MODULE.filter(m=>pmAktiv(m.key)).length;
 pmHinweis(projektModule.haupt!==true
  ? "✓ Gespeichert – der erweiterte Ablauf ist ausgeschaltet. Es wurde nichts gelöscht: bereits erfasste Reservierungen, Vorlagen und Versionen bleiben gespeichert und sind wieder da, sobald er erneut eingeschaltet wird."
  : "✓ Gespeichert – "+an+" von "+PM_MODULE.length+" Modulen eingeschaltet (gilt für die ganze Firma).");
 return true;
}
if($("savePmModule"))$("savePmModule").onclick=pmSpeichern;

// Nach einer Aenderung alles auffrischen, was von den Schaltern abhaengt.
// Jede Stelle ist einzeln abgesichert, damit eine noch nicht gebaute
// Ansicht hier keinen Fehler wirft.
function pmNachAenderung(){
 [ "renderProjectList","renderCockpitStammdaten","aufgabenNeuLaden",
   "renderMeasWorkflow","pmSichtbarkeitAuffrischen",
   "werkstattKnopfAktualisieren","vorlageKnopfAktualisieren",
   "renderVorlagenListe","verNeuLaden" ].forEach(f=>{
  try{ if(typeof window[f]==="function")window[f](); }catch(e){ console.error(f,e) }
 });
}
