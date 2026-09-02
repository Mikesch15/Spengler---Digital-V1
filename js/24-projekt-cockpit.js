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
async function zurueckInsCockpit(){
 $("projectCockpitModal").hidden=false;
 window.scrollTo(0,0);
 await loadProjectCockpitData();
 // Bereiche, die beim Verlassen offen waren, mit dem neuen Stand
 // nachladen - sonst zeigt die Liste noch den Stand von vorher.
 for(const key of Object.keys(COCKPIT_BEREICHE)){
  const b=COCKPIT_BEREICHE[key];
  if($(b.body).classList.contains("open"))await b.load();
 }
}
async function measEditZurueck(){
 if(measEditReturnTo==="projectCockpit"&&cockpitProjectId)await zurueckInsCockpit();
 else{$("measurementsModal").hidden=false;await renderMeasurementsOverview()}
 measEditReturnTo="measurementsModal";
}
async function amEditZurueck(){
 if(amEditReturnTo==="projectCockpit"&&cockpitProjectId)await zurueckInsCockpit();
 else{$("ausmassModal").hidden=false;await renderAusmassOverview()}
 amEditReturnTo="ausmassModal";
}
async function reportZurueck(){
 $("reportScreen").hidden=true;
 if(reportReturnTo==="projectCockpit"&&cockpitProjectId)await zurueckInsCockpit();
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
 $("cockpitTitle").textContent="📁 "+p.name;
 $("cockpitSubline").textContent=[p.order_no||"–",p.object||"–",p.customer||"–"].join(" · ")+(p.archived?" · archiviert":"");
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

// Alle Bereiche in EINEM Rutsch laden (Promise.all), nicht eine Abfrage
// pro Kachel nacheinander. Für Massaufnahmen/Ausmasse werden die Zeilen
// selbst geholt (Titel werden angezeigt), für Rapporte/Dateien genügt die
// reine id-Spalte.
async function loadProjectCockpitData(){
 const id=cockpitProjectId;
 ["cockpitMeasCount","cockpitAmCount","cockpitRepCount","cockpitFilesCount"].forEach(k=>{$(k).textContent="…"});
 $("cockpitLastActivity").textContent="Lädt…";
 const [mRes,aRes,rRes,fRes,vRes]=await Promise.all([
  sb.from("measurements").select("id,title,type,date").eq("project_id",id).order("date",{ascending:false}),
  sb.from("ausmass").select("id,title,type,date").eq("project_id",id).order("date",{ascending:false}),
  sb.from("reports").select("id").eq("project_id",id),
  sb.from("project_files").select("id").eq("project_id",id),
  sb.from("audit_log").select("user_id,action,entity_type,created_at").eq("project_id",id).order("created_at",{ascending:false}).limit(1)
 ]);
 // Zwischenzeitlich anderes Projekt geöffnet oder Cockpit geschlossen:
 // Ergebnis verwerfen statt eine fremde Übersicht zu zeichnen.
 if(cockpitProjectId!==id||$("projectCockpitModal").hidden)return;
 const fehler=[mRes,aRes,rRes,fRes,vRes].find(x=>x.error);
 if(fehler){
  ["cockpitMeasCount","cockpitAmCount","cockpitRepCount","cockpitFilesCount"].forEach(k=>{$(k).textContent="?"});
  $("cockpitLastActivity").textContent="Übersicht konnte nicht geladen werden: "+fehler.error.message;
  return;
 }
 const meas=mRes.data||[],am=aRes.data||[],rep=rRes.data||[],files=fRes.data||[];
 const measTitel=cockpitTitelListe(meas,MEAS_TYPE_LABELS);
 const amTitel=cockpitTitelListe(am,COCKPIT_AM_TYPE_LABELS);
 $("cockpitMeasCount").textContent=cockpitAnzahlText(meas.length,"Noch keine Massaufnahme")+(measTitel?" · "+measTitel:"");
 $("cockpitAmCount").textContent=cockpitAnzahlText(am.length,"Noch kein Ausmass")+(amTitel?" · "+amTitel:"");
 $("cockpitRepCount").textContent=cockpitAnzahlText(rep.length,"Noch kein Regierapport");
 $("cockpitFilesCount").textContent=cockpitAnzahlText(files.length,"Noch keine Datei");
 $("cockpitLastActivity").textContent=cockpitAktivitaetText((vRes.data||[])[0]);
}
// Nach Anlegen/Löschen innerhalb des Cockpits: nur die Zahlen auffrischen.
function refreshCockpitCounts(){return cockpitProjectId?loadProjectCockpitData():Promise.resolve()}

// Alle offenen Arbeitslisten zuklappen (beim Öffnen eines Projekts bzw.
// beim Wechsel), damit nie die Liste des vorherigen Projekts stehen bleibt.
function cockpitListenSchliessen(){
 ["cockpitMeasBody","cockpitAmBody","cockpitRepBody","cockpitFilesBody"].forEach(k=>{
  const box=$(k);box.classList.remove("open");box.innerHTML="";
 });
 document.querySelectorAll("[data-cockpit-open]").forEach(b=>{b.textContent="Öffnen"});
}

async function openProjectCockpit(projectId){
 cockpitProjectId=Number(projectId);
 if(!cockpitProject())return;
 renderCockpitStammdaten();
 cockpitListenSchliessen();
 // Verlauf-Container zurücksetzen (bestehende Hilfsfunktion aus v2.31).
 updateVerlaufToggleVisibility($("cockpitVerlaufToggle"),$("cockpitVerlaufBody"),cockpitProjectId);
 $("projectsModal").hidden=true;
 $("projectCockpitModal").hidden=false;
 window.scrollTo(0,0);
 await loadProjectCockpitData();
}

// ---- Arbeitsbereiche öffnen -------------------------------------
// "Öffnen" klappt die Liste des jeweiligen Bereichs auf/zu - gefüllt von
// genau den bestehenden Lade-Funktionen aus js/09-projekte.js.
const COCKPIT_BEREICHE={
 meas :{body:"cockpitMeasBody" ,load:()=>loadProjectMeasurements(cockpitProjectId)},
 am   :{body:"cockpitAmBody"   ,load:()=>loadProjectAusmass(cockpitProjectId)},
 rep  :{body:"cockpitRepBody"  ,load:()=>loadProjectReports(cockpitProjectId)},
 files:{body:"cockpitFilesBody",load:()=>loadProjectFiles(cockpitProjectId)}
};
async function cockpitBereichOeffnen(key,btn){
 const b=COCKPIT_BEREICHE[key];
 if(!b||!cockpitProjectId)return;
 const box=$(b.body);
 const willOpen=!box.classList.contains("open");
 box.classList.toggle("open",willOpen);
 btn.textContent=willOpen?"Schliessen":"Öffnen";
 if(willOpen)await b.load();
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
 const o=e.target.closest("[data-cockpit-open]");
 if(o){await cockpitBereichOeffnen(o.dataset.cockpitOpen,o);return}
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
});
$("amTypeChooserModal").addEventListener("click",e=>{
 const b=e.target.closest("[data-choose-am-type]");
 if(!b||cockpitTypWahl!=="am")return;
 cockpitTypWahl=null;
 amEditReturnTo="projectCockpit";
 setAmProjectField(cockpitProjectId);
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
