"use strict";
// ---- Projekt-Cockpit (v2.37, ab v2.38 zentraler Arbeits-Hub) ----
// Ein Projekt wird einmal geöffnet; danach bleibt der Benutzer in diesem
// Projekt, bis er bewusst zur Projektübersicht zurückgeht.
//
//   Projektübersicht → 📂 Projekt öffnen → Cockpit
//                    → Massaufnahme / Ausmass / Rapport / Datei / Verlauf
//                    → Zurück → wieder Cockpit
//
// Bewusst KEIN zweites System: die Arbeitslisten werden von den
// bestehenden Funktionen loadProjectMeasurements()/loadProjectAusmass()/
// loadProjectReports()/loadProjectFiles() (js/09-projekte.js) gefüllt,
// das Erfassen von openMeasurement()/newMeasurementWithType() usw., der
// Verlauf von js/23-verlauf.js. Das Cockpit ruft diese vorhandenen
// Funktionen nur mit dem richtigen Projektkontext auf.
//
// Sicherheit: alle Abfragen filtern nur nach project_id. Die Firmengrenze
// erzwingt weiterhin ausschliesslich die restriktive RLS jeder Tabelle
// (tenant_boundary_*) - eine fremde oder manipulierte Projekt-ID liefert
// serverseitig 0 Zeilen. Die ID aus dem Frontend ist nie für sich allein
// eine Berechtigung.

let cockpitProjectId=null;
// Rückziel des Regierapport-Bildschirms; Massaufnahme/Ausmass haben dafür
// bereits measEditReturnTo/amEditReturnTo (js/01-basis.js, js/17-ausmass.js).
let reportReturnTo="reportsModal";

// Gleiche Beschriftungen wie in der bestehenden Ausmass-Liste
// (loadProjectAusmass, js/09-projekte.js) - Massaufnahmen nutzen den
// bereits vorhandenen MEAS_TYPE_LABELS-Katalog aus js/01-basis.js.
const COCKPIT_AM_TYPE_LABELS={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};

function cockpitProject(){return allProjects.find(p=>p.id===cockpitProjectId)||null}

// ---- Zentrale Rückkehr ------------------------------------------
// Genau eine Stelle je Arbeitsbereich entscheidet, wohin "Zurück" führt.
// Die geschützten Erfassungsdateien rufen nur noch diese Funktionen auf,
// statt das Ziel selbst zu kennen.
// Nach der Rückkehr wird nur der Bereich neu geladen, in dem gearbeitet
// wurde, plus die Zeile "letzte Aktivität" - nicht das ganze Cockpit.
async function zurueckInsCockpit(bereich){
 $("projectCockpitModal").hidden=false;
 window.scrollTo(0,0);
 await Promise.all([cockpitBereichAktualisieren(bereich),cockpitAktivitaetLaden()]);
}
async function measEditZurueck(){
 if(measEditReturnTo==="projectCockpit"&&cockpitProjectId)await zurueckInsCockpit("meas");
 else{$("measurementsModal").hidden=false;await renderMeasurementsOverview()}
 measEditReturnTo="measurementsModal";
}
async function amEditZurueck(){
 if(amEditReturnTo==="projectCockpit"&&cockpitProjectId)await zurueckInsCockpit("am");
 else{$("ausmassModal").hidden=false;await renderAusmassOverview()}
 amEditReturnTo="ausmassModal";
}
async function reportZurueck(){
 $("reportScreen").hidden=true;
 if(reportReturnTo==="projectCockpit"&&cockpitProjectId)await zurueckInsCockpit("rep");
 else{$("reportsModal").hidden=false;await renderReportsOverview()}
 reportReturnTo="reportsModal";
 isDirty=false;
}

// ---- Stammdaten -------------------------------------------------
// Aus dem bereits geladenen allProjects, dafür ist keine zusätzliche
// Abfrage nötig.
function renderCockpitStammdaten(){
 const p=cockpitProject();
 if(!p)return;
 // v2.45: Die Adresse identifiziert das Projekt und steht deshalb genau
 // einmal - hier oben - als Haupttitel. Die Arbeitszeilen darunter
 // wiederholen sie nicht mehr. Projektname, Auftrags-Nr. und
 // Auftraggeber bleiben als Zusatzangaben erhalten.
 const titel=projektTitel(p);
 $("cockpitTitle").textContent="📁 "+titel;
 $("cockpitSubline").textContent=infoZeileOhne(titel,p.name,p.order_no,p.customer,p.archived?"archiviert":"");
 $("cockpitName").value=p.name||"";
 $("cockpitOrderNo").value=p.order_no||"";
 $("cockpitObject").value=p.object||"";
 $("cockpitCustomer").value=p.customer||"";
 $("cockpitStammdatenMsg").hidden=true;
}

// "3 vorhanden" / "Noch keine …" - niemals ein erfundener Status.
function cockpitAnzahlText(n,leerText){
 if(!n)return leerText;
 return n===1?"1 vorhanden":n+" vorhanden";
}

// Die ersten Titel als zusätzlicher Hinweis, damit man ohne Öffnen sieht,
// worum es geht. Ohne Titel wird die Fachart angezeigt, nichts erfunden.
function cockpitTitelListe(list,typeLabels){
 const namen=list.slice(0,3).map(x=>x.title||typeLabels[x.type]||x.type).filter(Boolean);
 if(!namen.length)return "";
 return namen.join(", ")+(list.length>3?" …":"");
}

function cockpitAktivitaetText(row){
 if(!row)return "Noch keine Aktivität";
 const wer=profileName(row.user_id)||"Unbekannter Benutzer";
 const ent=VERLAUF_ENTITY_LABELS[row.entity_type]||row.entity_type;
 const was=VERLAUF_ACTION_LABELS[row.action]||row.action;
 return `${ent} · ${was} · ${wer} · ${verlaufFormatWann(row.created_at)}`;
}

// ---- Arbeitsbereiche --------------------------------------------
// Ein Eintrag je Bereich. Gefüllt werden die Listen von genau den
// bestehenden Funktionen aus js/09-projekte.js; sie liefern seit v2.39
// zusätzlich die Anzahl zurück, damit dafür keine zweite Abfrage nötig
// ist. Die Listen sind immer sichtbar - kein Aufklappen mehr, das war
// ein Klick je Bereich ohne Gegenwert.
const COCKPIT_BEREICHE={
 meas :{count:"cockpitMeasCount" ,body:"cockpitMeasBody" ,card:"cockpitMeasCard" ,mark:"cockpitMeasMark" ,stand:"cockpitMeasStand" ,leer:"Noch keine" ,load:id=>loadProjectMeasurements(id)},
 am   :{count:"cockpitAmCount"   ,body:"cockpitAmBody"   ,card:"cockpitAmCard"   ,mark:"cockpitAmMark"   ,stand:"cockpitAmStand"   ,leer:"Noch keins",load:id=>loadProjectAusmass(id)},
 rep  :{count:"cockpitRepCount"  ,body:"cockpitRepBody"  ,card:"cockpitRepCard"  ,mark:"cockpitRepMark"  ,stand:"cockpitRepStand"  ,leer:"Noch keine" ,load:id=>loadProjectReports(id)},
 files:{count:"cockpitFilesCount",body:"cockpitFilesBody",card:"cockpitFilesCard",mark:"cockpitFilesMark",stand:"cockpitFilesStand",leer:"Noch keine" ,load:id=>loadProjectFiles(id)}
};

// Eine Stelle schreibt die Anzahl - in die Abschnittsüberschrift UND in
// den Arbeitsstand oben. Dieselbe Zahl, keine zweite Quelle.
// Wichtig (Auftrag Abschnitt 12): schlägt eine Abfrage fehl, liefert die
// Ladefunktion undefined - dann steht überall "?" und niemals eine
// falsche 0. Und es wird nur ausgesagt, was da ist: Anzahl bzw.
// "Noch keine …" - keine Behauptung, dass etwas fehle.
function cockpitZeigeAnzahl(key,n){
 const b=COCKPIT_BEREICHE[key];
 const unbekannt=(n===undefined||n===null);
 $(b.count).textContent=unbekannt?"?":String(n);
 $(b.mark).textContent =unbekannt?"?":(n>0?"✓":"○");
 $(b.stand).textContent=unbekannt?"?":(n>0?String(n):b.leer);
}
// Ladezustand: nichts behaupten, solange nichts bekannt ist.
function cockpitStandLaedt(){
 Object.keys(COCKPIT_BEREICHE).forEach(k=>{
  const b=COCKPIT_BEREICHE[k];
  $(b.count).textContent="…";$(b.mark).textContent="…";$(b.stand).textContent="…";
 });
 $("cockpitStandAktivitaet").textContent="…";
}
// Klick auf eine Arbeitsstand-Zeile springt zum bereits vorhandenen
// Abschnitt weiter unten - keine zweite Navigation, kein Nachladen.
$("projectCockpitModal").addEventListener("click",e=>{
 const z=e.target.closest("[data-cockpit-goto]");
 if(!z)return;
 const b=COCKPIT_BEREICHE[z.dataset.cockpitGoto];
 if(b)$(b.card).scrollIntoView({block:"start"});
});
// Einzelnen Bereich neu laden (nach Rückkehr, Anlegen oder Löschen).
async function cockpitBereichAktualisieren(key){
 if(!key||!cockpitProjectId||!COCKPIT_BEREICHE[key])return;
 cockpitZeigeAnzahl(key,await COCKPIT_BEREICHE[key].load(cockpitProjectId));
}
async function cockpitAktivitaetLaden(){
 const id=cockpitProjectId;
 if(!id)return;
 const {data,error}=await sb.from("audit_log")
  .select("user_id,action,entity_type,created_at")
  .eq("project_id",id).order("created_at",{ascending:false}).limit(1);
 if(cockpitProjectId!==id)return;
 if(error){
  $("cockpitLastActivity").textContent="Verlauf konnte nicht geladen werden: "+error.message;
  $("cockpitStandAktivitaet").textContent="?";
  return;
 }
 // Dieselbe Zeile speist beide Anzeigen: oben im Arbeitsstand nur der
 // Zeitpunkt, in der Verlaufskarte wie bisher der ganze Satz. Keine
 // zweite Aktivitätslogik - verlaufFormatWann() stammt aus v2.31.
 const zeile=(data||[])[0];
 $("cockpitLastActivity").textContent=cockpitAktivitaetText(zeile);
 $("cockpitStandAktivitaet").textContent=zeile?verlaufFormatWann(zeile.created_at):"Noch keine Aktivität";
}

// Beim Öffnen eines Projekts: alle vier Bereiche plus die letzte
// Aktivität in EINEM Promise.all - fünf Abfragen wie bisher, aber die
// Listen sind damit schon fertig und werden beim Ansehen nicht erneut
// geladen.
async function loadProjectCockpitData(){
 const id=cockpitProjectId;
 const keys=Object.keys(COCKPIT_BEREICHE);
 cockpitStandLaedt();
 $("cockpitLastActivity").textContent="Lädt…";
 const ergebnisse=await Promise.all(keys.map(k=>COCKPIT_BEREICHE[k].load(id)).concat([cockpitAktivitaetLaden()]));
 // Zwischenzeitlich anderes Projekt geöffnet oder Cockpit geschlossen:
 // Ergebnis verwerfen statt eine fremde Übersicht zu zeichnen.
 if(cockpitProjectId!==id||$("projectCockpitModal").hidden)return;
 keys.forEach((k,i)=>cockpitZeigeAnzahl(k,ergebnisse[i]));
}

// treffer (optional, v2.40): {kind:"measurement"|"ausmass"|"report", id}
// - stammt aus der globalen Suche und wird nach dem Laden in der
//   passenden Liste sichtbar gemacht. Reine Anzeigehilfe: welche Zeilen
//   ueberhaupt geladen werden, entscheidet weiterhin allein die RLS.
async function openProjectCockpit(projectId,treffer){
 cockpitProjectId=Number(projectId);
 // Projekt nicht in allProjects (z. B. manipulierte ID aus einer fremden
 // Firma): allProjects ist bereits RLS-gefiltert, hier passiert nichts.
 if(!cockpitProject())return;
 renderCockpitStammdaten();
 cockpitStammdatenEinklappen();
 // Listen des vorherigen Projekts sofort leeren, damit nie kurz die
 // falschen Einträge stehen bleiben.
 Object.keys(COCKPIT_BEREICHE).forEach(k=>{$(COCKPIT_BEREICHE[k].body).innerHTML=""});
 // Verlauf-Container zurücksetzen (bestehende Hilfsfunktion aus v2.31).
 updateVerlaufToggleVisibility($("cockpitVerlaufToggle"),$("cockpitVerlaufBody"),cockpitProjectId);
 $("projectsModal").hidden=true;
 $("projectCockpitModal").hidden=false;
 window.scrollTo(0,0);
 await loadProjectCockpitData();
 if(treffer)cockpitTrefferHervorheben(treffer);
}

// Den aus der Suche kommenden Eintrag in der bereits geladenen Liste
// finden, hinscrollen und kurz hervorheben. Seit v2.39 sind alle vier
// Listen ohnehin sofort sichtbar - es ist also kein Aufklappen noetig.
const COCKPIT_TREFFER_ATTR={measurement:"data-open-project-measurement",ausmass:"data-open-project-ausmass",report:"data-open-report"};
function cockpitTrefferHervorheben(treffer){
 const attr=COCKPIT_TREFFER_ATTR[treffer&&treffer.kind];
 if(!attr||!treffer.id)return;
 const knopf=$("cockpitWorkArea").querySelector(`[${attr}="${treffer.id}"]`);
 const zeile=knopf&&knopf.closest(".report-row");
 if(!zeile)return;
 zeile.classList.add("treffer");
 zeile.scrollIntoView({block:"center"});
 setTimeout(()=>zeile.classList.remove("treffer"),5000);
}


// ---- Neu anlegen aus dem Cockpit --------------------------------
// Das Cockpit erzeugt selbst nichts. Es startet den bestehenden
// Erfassungsprozess und gibt ihm das aktuelle Projekt mit; die
// Projekt-Setter (setMeasProjectField/setAmProjectField/
// renderProjectSelect) sind bereits vorhanden.
// Wichtig: newMeasurementWithType()/newAusmassWithType() setzen ihr
// Rückziel selbst auf die jeweilige Übersicht - deshalb wird es danach
// auf das Cockpit gesetzt, nicht vorher.
// Der bestehende "＋ Neuer Regierapport"-Knopf (js/04-start-suche.js)
// wird unverändert ausgelöst; der Listener unten läuft danach und ergänzt
// Projekt und Rückziel. Wird derselbe Knopf normal angeklickt, setzt er
// das Rückziel wieder auf die Rapport-Übersicht zurück.
let cockpitRapportStart=false;
function cockpitNeuerRapport(){
 if(!cockpitProjectId)return;
 cockpitRapportStart=true;
 $("newReport").click();
}
$("newReport").addEventListener("click",()=>{
 if(!cockpitRapportStart){
  reportReturnTo="reportsModal";
  $("backFromReportEdit").hidden=true;
  return;
 }
 cockpitRapportStart=false;
 $("projectCockpitModal").hidden=true;
 reportReturnTo="projectCockpit";
 $("backFromReportEdit").hidden=false;
 currentProjectId=cockpitProjectId;
 // Dieselbe Vorbefüllung wie beim Auswählen eines Projekts im Rapport
 // (js/09-projekte.js, data-pick-project).
 const proj=cockpitProject();
 if(proj){
  if(proj.order_no&&!$("orderNo").value)$("orderNo").value=proj.order_no;
  if(proj.customer&&!$("customer").value)$("customer").value=proj.customer;
  if(proj.object&&!$("object").value)$("object").value=proj.object;
 }
 renderProjectSelect();
});

$("cockpitWorkArea").addEventListener("click",async e=>{
 const n=e.target.closest("[data-cockpit-new]");
 if(!n)return;
 if(!cockpitProjectId)return;
 if(n.dataset.cockpitNew==="rep"){cockpitNeuerRapport();return}
 // Dieselbe Typ-Auswahl wie ueberall sonst, nur aus dem Cockpit heraus.
 $("projectCockpitModal").hidden=true;
 if(n.dataset.cockpitNew==="meas"){cockpitTypWahl="meas";$("measTypeChooserModal").hidden=false}
 else{cockpitTypWahl="am";$("amTypeChooserModal").hidden=false}
});

// Die Typ-Auswahl (Skizze/Foto, Rinne Halbrund, …) ist dieselbe wie
// überall sonst. cockpitTypWahl merkt sich nur, dass sie aus dem Cockpit
// heraus geöffnet wurde - der bestehende Handler in js/09-projekte.js
// bleibt unverändert und läuft zuerst; er startet die Erfassung ohne
// Projekt, danach ergänzt der Handler hier Projekt und Rückziel.
let cockpitTypWahl=null;
$("measTypeChooserModal").addEventListener("click",e=>{
 const b=e.target.closest("[data-choose-meas-type]");
 if(!b||cockpitTypWahl!=="meas")return;
 cockpitTypWahl=null;
 measEditReturnTo="projectCockpit";
 setMeasProjectField(cockpitProjectId);
 // Der Titel wurde von newMeasurementWithType() bereits gesetzt, damals
 // noch ohne Projekt - jetzt mit Adresse neu aufbauen (v2.44).
 updateMeasFormTitle();
});
$("amTypeChooserModal").addEventListener("click",e=>{
 const b=e.target.closest("[data-choose-am-type]");
 if(!b||cockpitTypWahl!=="am")return;
 cockpitTypWahl=null;
 amEditReturnTo="projectCockpit";
 setAmProjectField(cockpitProjectId);
 updateAmFormTitle();
});
// Abbrechen in der Typ-Auswahl: zurück ins Cockpit statt in die Übersicht.
$("cancelMeasTypeChooser").addEventListener("click",()=>{
 if(cockpitTypWahl!=="meas")return;
 cockpitTypWahl=null;
 $("measurementsModal").hidden=true;
 zurueckInsCockpit();
});
$("cancelAmTypeChooser").addEventListener("click",()=>{
 if(cockpitTypWahl!=="am")return;
 cockpitTypWahl=null;
 $("ausmassModal").hidden=true;
 zurueckInsCockpit();
});

// ---- Verlauf ----------------------------------------------------
// Kombinierter Projekt-Verlauf aus v2.32, unverändert wiederverwendet.
$("cockpitVerlaufToggle").onclick=()=>toggleProjectVerlaufBox($("cockpitVerlaufBody"),$("cockpitVerlaufToggle"),cockpitProjectId);

// ---- Stammdaten ein-/ausklappen ---------------------------------
// Im Alltag wird gearbeitet, nicht umbenannt - deshalb steht der
// Arbeitsbereich oben und die Felder erscheinen nur auf Wunsch.
function cockpitStammdatenEinklappen(){
 $("cockpitStammdaten").hidden=true;
 $("cockpitToggleStammdaten").textContent="✏️ Stammdaten bearbeiten";
}
$("cockpitToggleStammdaten").onclick=()=>{
 const offen=$("cockpitStammdaten").hidden;
 $("cockpitStammdaten").hidden=!offen;
 $("cockpitToggleStammdaten").textContent=offen?"▲ Stammdaten schliessen":"✏️ Stammdaten bearbeiten";
 if(offen)renderCockpitStammdaten();
};

// ---- Cockpit verlassen ------------------------------------------
$("cockpitBack").onclick=()=>{
 $("projectCockpitModal").hidden=true;
 $("projectsModal").hidden=false;
 renderProjectList();
};
$("cockpitStart").onclick=()=>goToStart();
$("backFromReportEdit").onclick=()=>reportZurueck();

// ---- Stammdaten speichern ---------------------------------------
// Dieselben Pflichtfelder wie beim Anlegen eines Projekts. Die
// Firmenzuordnung wird nicht mitgeschickt - company_id bleibt unverändert
// und wird ohnehin serverseitig erzwungen.
$("cockpitSaveStammdaten").onclick=async()=>{
 const p=cockpitProject();
 if(!p)return;
 const name=$("cockpitName").value.trim();
 const orderNo=$("cockpitOrderNo").value.trim();
 const object=$("cockpitObject").value.trim();
 const msg=$("cockpitStammdatenMsg");
 const zeige=(text,farbe)=>{msg.textContent=text;msg.style.color=farbe;msg.hidden=false};
 if(!name){zeige("Bitte einen Projektnamen eingeben.","var(--red)");return}
 if(!orderNo){zeige("Bitte eine Auftrags-Nr. eingeben.","var(--red)");return}
 if(!object){zeige("Bitte eine Adresse eingeben.","var(--red)");return}
 const {data,error}=await sb.from("projects")
  .update({name,order_no:orderNo,object,customer:$("cockpitCustomer").value.trim()})
  .eq("id",p.id).select("*");
 if(error){zeige("Fehler: "+error.message,"var(--red)");return}
 // Von RLS blockierte UPDATEs melden keinen Fehler, sie betreffen still
 // 0 Zeilen (siehe CLAUDE.md 24.1) - deshalb das Ergebnis prüfen, statt
 // Erfolg anzunehmen.
 if(!data||!data.length){zeige("Die Änderung konnte nicht gespeichert werden. Fehlt die nötige Berechtigung?","var(--red)");return}
 const idx=allProjects.findIndex(x=>x.id===p.id);
 if(idx>=0)allProjects[idx]=data[0];
 renderCockpitStammdaten();
 renderProjectSelect();
 zeige("✓ Stammdaten gespeichert.","var(--green)");
};
