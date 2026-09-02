"use strict";
// ---- Projekte ------------------------------------------------
function searchProjects(q){
 q=(q||"").trim().toLowerCase();
 const active=allProjects.filter(p=>!p.archived);
 const base=!q?active:active.filter(p=>
   String(p.name||"").toLowerCase().includes(q)||
   String(p.order_no||"").toLowerCase().includes(q)||
   String(p.customer||"").toLowerCase().includes(q)||
   String(p.object||"").toLowerCase().includes(q)
 );
 return base.slice(0,15);
}
function renderProjectSelect(){
 const p=allProjects.find(x=>x.id===currentProjectId);
 $("projectSearch").value=p?p.name:"";
 $("projectSelectedLabel").textContent=p?"":"Kein Projekt ausgewählt";
 $("printProjectLine").textContent=p?p.name:"";
 // Objektadresse als Haupttitel am Bildschirm (v2.44). Die gedruckte
 // Kopfzeile bleibt unveraendert - die Zeile ist .no-print.
 const adr=$("reportAddressLine");
 if(adr)adr.textContent=p?eintragAdresse({project_id:p.id},$("object")?$("object").value:""):"";
}
function renderProjectSuggest(q){
 const box=$("projectResults");
 box.innerHTML=searchProjects(q).map(p=>`<div class="item" data-pick-project="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.order_no||"–")} · ${esc(p.object||"–")} · ${esc(p.customer||"–")}</span></div>`).join("");
 return box;
}
$("projectSearch").addEventListener("input",e=>{
 const box=renderProjectSuggest(e.target.value);
 if(box.innerHTML)positionSuggest(e.target,box);
});
$("projectSearch").addEventListener("focus",e=>{
 e.target.select();
 const box=renderProjectSuggest(e.target.value);
 if(box.innerHTML)positionSuggest(e.target,box);
});
$("projectResults").addEventListener("click",e=>{
 const p=e.target.closest("[data-pick-project]");if(!p)return;
 currentProjectId=Number(p.dataset.pickProject);
 currentReportId=null;
 const proj=allProjects.find(x=>x.id===currentProjectId);
 if(proj){
  if(proj.order_no&&!$("orderNo").value)$("orderNo").value=proj.order_no;
  if(proj.customer&&!$("customer").value)$("customer").value=proj.customer;
  if(proj.object&&!$("object").value)$("object").value=proj.object;
 }
 $("projectResults").innerHTML="";
 renderProjectSelect();
});
let showArchivedProjects=false;

// ---- Schnellzugriff: zuletzt bearbeitete Projekte (v2.41) --------
// WAS "zuletzt bearbeitet" HEISST:
// projects.updated_at aendert sich nur, wenn die Projektzeile selbst
// geschrieben wird - also beim Anlegen, beim Aendern der Stammdaten und
// beim Archivieren. Arbeit AM Projekt (Massaufnahme, Ausmass, Rapport,
// Datei) fasst diese Zeile nicht an. An den echten Daten nachgeprueft:
// danach stuende ein leeres, gerade erst angelegtes Projekt zuoberst,
// waehrend die beiden Projekte, an denen tatsaechlich zuletzt gearbeitet
// wurde, weiter unten laegen. projects.updated_at allein waere also
// irrefuehrend und wird NICHT als alleinige Quelle verwendet.
//
// Verwendet wird stattdessen der spaeteste echte Bearbeitungszeitpunkt
// aus allen Projektdaten: die Projektzeile selbst UND die zugehoerigen
// Massaufnahmen/Ausmasse/Rapporte/Dateien. Diese Zeitstempel setzt seit
// v2.28/v2.29 ein Datenbank-Trigger serverseitig, sie sind also
// verlaesslich und ruecckwirkend vorhanden. audit_log waere die
// sauberste Quelle, ist aber bis heute leer (seit v2.30 noch keine
// reale Nutzung) und koennte die zurueckliegende Arbeit nicht abbilden.
//
// Es wird KEINE Abfrage pro Projekt ausgefuehrt: vier gebuendelte,
// begrenzte Abfragen liefern die juengsten Datensaetze je Art, daraus
// wird der Stand je Projekt im Browser bestimmt.
const RECENT_PROJECT_ANZAHL=4;   // Schnellzugriff, keine zweite Projektliste
const RECENT_QUELLE_LIMIT=100;   // je Art; wer aelter ist, ist nicht "zuletzt"
let recentProjectsLauf=0;

// "Heute · 07:32" / "Gestern · 14:05" / "28.08.2026 · 09:11"
function recentZeitText(iso){
 const d=new Date(iso);
 if(isNaN(d))return "";
 const uhr=d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
 const tag=new Date(d.getFullYear(),d.getMonth(),d.getDate());
 const heute=new Date();const heute0=new Date(heute.getFullYear(),heute.getMonth(),heute.getDate());
 const diff=Math.round((heute0-tag)/86400000);
 if(diff===0)return "Heute · "+uhr;
 if(diff===1)return "Gestern · "+uhr;
 return d.toLocaleDateString("de-CH")+" · "+uhr;
}

async function renderRecentProjects(){
 const box=$("recentProjectsList");
 if(!box)return;
 const lauf=++recentProjectsLauf;
 const felder="project_id,updated_at,updated_by";
 const [mRes,aRes,rRes,fRes]=await Promise.all([
  sb.from("measurements").select(felder).order("updated_at",{ascending:false}).limit(RECENT_QUELLE_LIMIT),
  sb.from("ausmass").select(felder).order("updated_at",{ascending:false}).limit(RECENT_QUELLE_LIMIT),
  sb.from("reports").select(felder).order("updated_at",{ascending:false}).limit(RECENT_QUELLE_LIMIT),
  sb.from("project_files").select("project_id,created_at,updated_at,created_by,updated_by").order("created_at",{ascending:false}).limit(RECENT_QUELLE_LIMIT)
 ]);
 if(lauf!==recentProjectsLauf)return;   // neuere Aktualisierung laeuft bereits
 const fehler=[mRes,aRes,rRes,fRes].find(x=>x.error);
 if(fehler){
  box.innerHTML=`<div class="small" style="color:var(--red)">Schnellzugriff konnte nicht geladen werden: ${esc(fehler.error.message)}</div>`;
  return;
 }
 // Spaetesten Zeitpunkt je Projekt bestimmen. Startwert ist die
 // Projektzeile selbst (Anlegen/Stammdaten/Archivieren) - auch das ist
 // eine echte Bearbeitung.
 const stand=new Map();
 const merke=(pid,zeit,wer)=>{
  if(!pid||!zeit)return;
  const alt=stand.get(pid);
  if(!alt||new Date(zeit)>new Date(alt.zeit))stand.set(pid,{zeit,wer:wer||null});
 };
 allProjects.forEach(p=>merke(p.id,p.updated_at,p.updated_by));
 (mRes.data||[]).forEach(x=>merke(x.project_id,x.updated_at,x.updated_by));
 (aRes.data||[]).forEach(x=>merke(x.project_id,x.updated_at,x.updated_by));
 (rRes.data||[]).forEach(x=>merke(x.project_id,x.updated_at,x.updated_by));
 (fRes.data||[]).forEach(x=>merke(x.project_id,x.updated_at||x.created_at,x.updated_by||x.created_by));

 // Nur aktive Projekte der eigenen Firma: allProjects ist bereits
 // RLS-gefiltert, archivierte bleiben im Schnellzugriff aussen vor.
 const liste=allProjects
  .filter(p=>!p.archived&&stand.has(p.id))
  .map(p=>({p,...stand.get(p.id)}))
  .sort((x,y)=>new Date(y.zeit)-new Date(x.zeit))
  .slice(0,RECENT_PROJECT_ANZAHL);

 box.innerHTML=liste.length?liste.map(e=>{
  // Nur echte Angaben: Auftrags-Nr., Zeitpunkt, Benutzer.
  // updated_by nicht gesetzt (aeltere Datensaetze) -> Benutzer weglassen,
  // gesetzt aber nicht aufloesbar (geloeschter Mitarbeiter) -> wie ueberall
  // sonst "Unbekannter Benutzer".
  const wer=e.wer?(profileName(e.wer)||"Unbekannter Benutzer"):"";
  const zeile=[e.p.order_no,recentZeitText(e.zeit),wer].map(x=>String(x||"").trim()).filter(Boolean).join(" · ");
  return `<button type="button" class="recent-project" data-open-recent="${e.p.id}">
<span class="recent-project-info"><b>📁 ${esc(e.p.name)}</b><span>${esc(zeile)}</span></span>
<span class="recent-project-arrow">›</span>
</button>`;
 }).join(""):'<div class="empty">Noch keine zuletzt bearbeiteten Projekte.</div>';
}

$("recentProjectsList").addEventListener("click",async e=>{
 const b=e.target.closest("[data-open-recent]");
 // Bewusst dieselbe Funktion wie die Projektkarte - kein zweites
 // Projekt-Oeffnungssystem.
 if(b)await openProjectCockpit(Number(b.dataset.openRecent));
});
function renderProjectList(){
 // Schnellzugriff mit auffrischen (v2.41). Bewusst ohne await - die
 // Projektliste selbst soll nicht auf die Abfragen warten.
 renderRecentProjects().catch(err=>console.error("Schnellzugriff:",err));
 const list=showArchivedProjects?allProjects:allProjects.filter(p=>!p.archived);
 $("projectList").innerHTML=list.map(p=>{
  // Dezente Ersteller-/Bearbeiter-Anzeige, dieselbe Logik wie bei
  // Massaufnahmen (erstelltGeaendertText(), js/16-massaufnahme-
  // formular.js) - siehe CLAUDE.md 36.
  const meta=erstelltGeaendertText(p);
  return `<div class="project-row"${p.archived?' style="opacity:.6"':''}>
<div class="project-row-top"><b>${esc(p.name)}${p.archived?' <span class="small">(archiviert)</span>':''}</b><button class="red" data-del-project="${p.id}">Löschen</button></div>
<div class="small">${esc(p.order_no||"–")} · ${esc(p.object||"–")} · ${esc(p.customer||"–")}</div>
${meta?`<div class="small" style="color:var(--muted)">${meta}</div>`:""}
<div class="project-row-actions">
<button class="blue" data-open-cockpit="${p.id}">📂 Projekt öffnen</button>
<button class="gray" data-archive-project="${p.id}">${p.archived?"↩️ Reaktivieren":"📦 Archivieren"}</button>
</div>
</div>`;
 }).join("")||'<div class="empty">Noch keine Projekte angelegt.</div>';
}
// ---- Kurzinfos fuer die Cockpit-Listen (v2.39) -----------------
// Verwenden ausschliesslich Felder, die ohnehin schon geladen sind -
// keine zusaetzliche Abfrage, keine erfundene Statusinformation.
function datumCH(d){
 if(!d)return "";
 const t=new Date(d);
 return isNaN(t)?String(d):t.toLocaleDateString("de-CH");
}
// Datum des Eintrags plus, falls vorhanden, wann er zuletzt geaendert
// wurde (updated_at ist bereits Teil der geladenen Zeile).
function eintragZusatz(x,ohneDatum){
 const teile=[];
 if(!ohneDatum&&x.date)teile.push(datumCH(x.date));
 if(x.updated_at){
  const u=datumCH(x.updated_at);
  if(u&&u!==datumCH(x.date))teile.push("zuletzt geändert "+u);
 }
 return teile.length?" · "+esc(teile.join(" · ")):"";
}
async function loadProjectAusmass(projectId){
 const box=$("cockpitAmBody");
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("ausmass").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 const typeLabels={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};
 projectAusmassCache=list;
 box.innerHTML=list.length?list.map(a=>`<div class="report-row">
<div class="report-row-info"><b>${esc(eintragAdresse(a,a.title))}</b><span>${esc(infoZeileOhne(eintragAdresse(a,a.title),typeLabels[a.type]||a.type,a.title))}${eintragZusatz(a)}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-project-ausmass="${a.id}">Öffnen</button>
<button class="gray" data-print-project-ausmass="${a.id}" title="Drucken">🖨️</button>
<button class="red" data-del-project-ausmass="${a.id}" title="Löschen">×</button>
</div>
</div>`).join(""):'<div class="empty">Noch kein Ausmass zu diesem Projekt.</div>';
 return list.length;
}
async function loadProjectReports(projectId){
 const box=$("cockpitRepBody");
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("reports").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 projectReportsCache=list;
 // Kopfdaten, die im Rapport ohnehin schon gespeichert sind (v2.39):
 // Datum als Titelzeile, darunter Auftrags-Nr./Auftraggeber/Objekt.
 box.innerHTML=list.length?list.map(r=>{
  // Adresse als Haupttitel (v2.44), Kopfdaten des Rapports darunter.
  const kopf=infoZeileOhne(eintragAdresse(r,r.object),datumCH(r.date),r.order_no,r.customer,r.object);
  return `<div class="report-row">
<div class="report-row-info"><b>${esc(eintragAdresse(r,r.object))}</b><span>${esc(kopf||"Ohne Kopfdaten")}${eintragZusatz(r,true)}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-report="${r.id}">Öffnen</button>
<button class="red" data-del-report="${r.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch kein Regierapport zu diesem Projekt.</div>';
 return list.length;
}
async function loadProjectMeasurements(projectId){
 const box=$("cockpitMeasBody");
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("measurements").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 const typeLabels=MEAS_TYPE_LABELS;
 projectMeasurementsCache=list;
 // Titel zuerst - der Abschnitt heisst bereits "Massaufnahmen", die
 // Wiederholung in der Kopfzeile war verschenkter Platz (v2.39).
 box.innerHTML=list.length?list.map(m=>`<div class="report-row">
<div class="report-row-info"><b>${esc(eintragAdresse(m,m.title))}</b><span>${esc(infoZeileOhne(eintragAdresse(m,m.title),typeLabels[m.type]||m.type,m.title))}${eintragZusatz(m)}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-project-measurement="${m.id}">Öffnen</button>
<button class="gray" data-print-project-measurement="${m.id}" title="Drucken">🖨️</button>
<button class="red" data-del-project-measurement="${m.id}" title="Löschen">×</button>
</div>
</div>`).join(""):'<div class="empty">Noch keine Massaufnahme zu diesem Projekt.</div>';
 return list.length;
}

// ---- Dateien je Projekt (PDF, Word, Excel, Fotos, …) --------------
// Liegen im selben Storage-Bucket wie die Massaufnahme-Fotos, nur unter
// einem eigenen Pfad "project-files/<projectId>/…", damit dieselben,
// bereits eingerichteten Zugriffsregeln gelten.
function formatFileSize(bytes){
 bytes=Number(bytes)||0;
 if(bytes<1024)return bytes+" B";
 if(bytes<1024*1024)return (bytes/1024).toFixed(1)+" KB";
 return (bytes/1024/1024).toFixed(1)+" MB";
}
// Verstaendliche deutsche Meldung statt der englischen Rohmeldung von
// Storage/PostgREST (v2.43).
function dateiFehlerText(err){
 const m=String((err&&err.message)||err||"");
 if(/maximum allowed size|Payload too large|exceeded|413/i.test(m))
  return "Die Datei ist zu gross für den Speicher.";
 if(/already exists|Duplicate|409/i.test(m))
  return "Unter diesem Speichernamen existiert bereits eine Datei. Bitte erneut versuchen.";
 if(/row-level security|not authorized|permission|403/i.test(m))
  return "Keine Berechtigung, für dieses Projekt Dateien zu speichern.";
 if(/Failed to fetch|NetworkError|network|timeout/i.test(m))
  return "Keine Verbindung zum Server. Bitte die Internetverbindung prüfen.";
 return m||"Unbekannter Fehler.";
}
const DATEI_BILD_ENDUNGEN=["jpg","jpeg","png","gif","heic","heif","webp","bmp"];
function istBilddatei(mime,name){
 if(String(mime||"").startsWith("image/"))return true;
 return DATEI_BILD_ENDUNGEN.includes(String(name||"").split(".").pop().toLowerCase());
}
function projectFileIcon(mime,name){
 mime=mime||"";
 const ext=String(name||"").split(".").pop().toLowerCase();
 if(mime.includes("pdf")||ext==="pdf")return "📕";
 if(mime.includes("image")||["jpg","jpeg","png","gif","heic","webp"].includes(ext))return "🖼️";
 if(mime.includes("word")||["doc","docx"].includes(ext))return "📄";
 if(mime.includes("sheet")||mime.includes("excel")||["xls","xlsx","csv"].includes(ext))return "📊";
 return "📎";
}
async function uploadProjectFile(projectId,file){
 const ext=(file.name.split(".").pop()||"").toLowerCase();
 const path=`project-files/${projectId}/${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext?"."+ext:""}`;
 const {error}=await sb.storage.from("measurements").upload(path,file,{contentType:file.type||undefined,upsert:false});
 if(error)throw error;
 const {error:e2}=await sb.from("project_files").insert({
  project_id:projectId,
  name:file.name,
  file_path:path,
  size_bytes:file.size,
  mime_type:file.type||null,
  created_by:currentProfile?currentProfile.id:null
 });
 if(e2)throw e2;
}
// Ersetzt den Inhalt einer bestehenden Datei (gleicher Eintrag, gleiche
// Stelle in der Liste). Neue Datei zuerst hochladen und den Datenbank-
// Eintrag erst danach umbiegen – erst wenn das sicher geklappt hat, wird
// die alte Datei aus dem Speicher gelöscht.
async function replaceProjectFile(fileId,file){
 const alt=projectFilesCache.find(x=>x.id===fileId);
 if(!alt)throw new Error("Datei nicht gefunden.");
 const ext=(file.name.split(".").pop()||"").toLowerCase();
 const path=`project-files/${alt.project_id}/${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext?"."+ext:""}`;
 const {error}=await sb.storage.from("measurements").upload(path,file,{contentType:file.type||undefined,upsert:false});
 if(error)throw error;
 const {error:e2}=await sb.from("project_files").update({
  name:file.name,
  file_path:path,
  size_bytes:file.size,
  mime_type:file.type||null,
  updated_by:currentProfile?currentProfile.id:null,
  updated_at:new Date().toISOString()
 }).eq("id",fileId);
 if(e2)throw e2;
 await sb.storage.from("measurements").remove([alt.file_path]);
}
async function loadProjectFiles(projectId){
 const box=$("cockpitFilesBody");
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("project_files").select("*").eq("project_id",projectId).order("created_at",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 projectFilesCache=list;
 const zeilen=list.length?list.map(f=>{
  // Gelöschter Mitarbeiter: dieselbe Formulierung wie überall sonst.
  const wer=f.created_by?(profileName(f.created_by)||"Unbekannter Benutzer"):"–";
  const wann=datumCH(f.created_at)||"–";
  // Seit v2.43 setzt der Trigger updated_at bei JEDER Änderung (auch beim
  // Umbenennen) - deshalb neutral "geändert", nicht mehr "ersetzt".
  const geaendert=(f.updated_at&&datumCH(f.updated_at)!==wann)?` · geändert am ${esc(datumCH(f.updated_at))}`:"";
  // Bilder bekommen eine kleine Vorschau. Die signierte URL wird nach dem
  // Zeichnen über die bestehende resolveSignedThumbnails()-Logik
  // (js/10-massaufnahme.js) nachgeladen - dasselbe Muster wie bei den
  // Skizzen-Vorschauen.
  const vorschau=istBilddatei(f.mime_type,f.name)
   ? `<img class="datei-thumb" data-signed-src="${esc(f.file_path)}" alt="">`
   : `<span class="datei-icon">${projectFileIcon(f.mime_type,f.name)}</span>`;
  return `<div class="report-row">
${vorschau}
<div class="report-row-info"><b>${esc(f.name)}</b><span>${formatFileSize(f.size_bytes)} · ${esc(wer)} · ${esc(wann)}${geaendert}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-project-file="${f.id}">Öffnen</button>
<button class="gray" data-rename-project-file="${f.id}" title="Umbenennen">✏️</button>
<button class="gray" data-replace-project-file="${f.id}" title="Ersetzen">🔄</button>
<input type="file" data-replace-file-input="${f.id}" hidden>
<button class="red" data-del-project-file="${f.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch keine Datei zu diesem Projekt.</div>';
 // Klar beschriftete, volle Trefferflaeche statt eines nackten
 // Datei-Feldes (v2.39) - das Feld selbst bleibt unveraendert dahinter.
 box.innerHTML=`<div class="bar"><label class="cockpit-new blue cockpit-upload">＋ Datei/Foto hinzufügen<input type="file" multiple data-upload-file="${projectId}" hidden></label></div>${zeilen}`;
 // Vorschaubilder nachladen. Absichtlich abgesichert: die Dateiliste
 // soll auch dann funktionieren, wenn die Hilfsfunktion aus
 // js/10-massaufnahme.js einmal nicht verfuegbar sein sollte -
 // dann bleiben nur die Vorschaubilder leer.
 if(typeof resolveSignedThumbnails==="function")resolveSignedThumbnails(box);
 return list.length;
}

// returnTo (v2.38): wohin fuehrt "Zurueck" aus dem Regierapport?
// Ohne Angabe wie bisher zurueck in die Rapport-Uebersicht.
function openReport(r,returnTo){
 reportReturnTo=returnTo||"reportsModal";
 $("backFromReportEdit").hidden=(reportReturnTo!=="projectCockpit");
 sperreFuerEintrag("rapport",r&&r.created_by);
 isDirty=false;
 currentProjectId=r.project_id;
 currentReportId=r.id;
 currentReportMeta={created_by:r.created_by,created_at:r.created_at,updated_by:r.updated_by,updated_at:r.updated_at};
 updateVerlaufToggleVisibility($("reportVerlaufToggle"),$("reportVerlaufBody"),currentReportId);
 works=(r.work_entries&&r.work_entries.length)?r.work_entries:[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];
 mats=r.material_entries||[];
 $("date").value=r.date||"";
 $("orderNo").value=r.order_no||"";
 $("customer").value=r.customer||"";
 $("object").value=r.object||"";
 $("vat").value=r.vat||"8.1 %";
 $("projectsModal").hidden=true;
 $("projectCockpitModal").hidden=true;
 $("reportsModal").hidden=true;
 $("startScreen").hidden=true;
 $("reportScreen").hidden=false;
 renderProjectSelect();
 renderMain();
}
// v2.44: Wird im Massaufnahme-/Ausmass-Formular interaktiv ein anderes
// Projekt gewaehlt, muss der Haupttitel (die Objektadresse) mitwandern.
// Diese Listener laufen nach den bestehenden Handlern in js/10 bzw.
// js/17 - so bleibt die Aenderung ausserhalb der geschuetzten Fachdateien.
$("measProjectResults").addEventListener("click",e=>{
 if(e.target.closest("[data-pick-meas-project]"))updateMeasFormTitle();
});
$("amProjectResults").addEventListener("click",e=>{
 if(e.target.closest("[data-pick-am-project]"))updateAmFormTitle();
});
$("startOpenProjects").onclick=()=>{renderProjectList();$("projectsModal").hidden=false};
$("newMeasurement").onclick=()=>{$("measurementsModal").hidden=true;$("measTypeChooserModal").hidden=false};
$("cancelMeasTypeChooser").onclick=()=>{$("measTypeChooserModal").hidden=true;$("measurementsModal").hidden=false};
$("measTypeChooserModal").addEventListener("click",e=>{
 const b=e.target.closest("[data-choose-meas-type]");
 if(!b)return;
 $("measTypeChooserModal").hidden=true;
 newMeasurementWithType(b.dataset.chooseMeasType);
});
$("newAusmass").onclick=()=>{$("ausmassModal").hidden=true;$("amTypeChooserModal").hidden=false};
$("cancelAmTypeChooser").onclick=()=>{$("amTypeChooserModal").hidden=true;$("ausmassModal").hidden=false};
$("amTypeChooserModal").addEventListener("click",e=>{
 const b=e.target.closest("[data-choose-am-type]");
 if(!b)return;
 $("amTypeChooserModal").hidden=true;
 newAusmassWithType(b.dataset.chooseAmType);
});
$("closeProjects").onclick=()=>{$("projectsModal").hidden=true};
$("addProject").onclick=async()=>{
 const name=$("newProjectName").value.trim();
 const orderNo=$("newProjectOrderNo").value.trim();
 const address=$("newProjectObject").value.trim();
 if(!name){alert("Bitte einen Projektnamen eingeben.");return}
 if(!orderNo){alert("Bitte eine Auftrags-Nr. eingeben.");return}
 if(!address){alert("Bitte eine Adresse eingeben.");return}
 const {error}=await sb.from("projects").insert({
  name,
  order_no:orderNo,
  customer:$("newProjectCustomer").value.trim(),
  object:address
 });
 if(error){alert("Fehler: "+error.message);return}
 $("newProjectName").value="";$("newProjectOrderNo").value="";$("newProjectCustomer").value="";$("newProjectObject").value="";
 const {data}=await sb.from("projects").select("*").order("name");
 allProjects=data||[];
 renderProjectList();renderProjectSelect();
};
$("toggleArchivedProjects").onclick=()=>{
 showArchivedProjects=!showArchivedProjects;
 $("toggleArchivedProjects").textContent=showArchivedProjects?"📦 Nur aktive anzeigen":"📦 Archivierte anzeigen";
 renderProjectList();
};// ---- Projektliste: nur noch Projekt-Aktionen -------------------
// Seit v2.38 ist die Projektübersicht ausschliesslich zur Auswahl eines
// Projekts da. Alle Arbeitsbereiche (Massaufnahmen/Ausmass/Rapporte/
// Dateien/Verlauf) liegen im Projekt-Cockpit, siehe js/24-projekt-
// cockpit.js. Die Lade-Funktionen oben sind dieselben geblieben, sie
// schreiben nur in die Cockpit-Container statt in die Projektkarte.
$("projectList").addEventListener("click",async e=>{
 const cockpit=e.target.closest("[data-open-cockpit]");
 if(cockpit){
  await openProjectCockpit(Number(cockpit.dataset.openCockpit));
  return;
 }
 const arch=e.target.closest("[data-archive-project]");
 if(arch){
  const id=Number(arch.dataset.archiveProject);
  const proj=allProjects.find(x=>x.id===id);
  const {error}=await sb.from("projects").update({archived:!proj.archived}).eq("id",id);
  if(error){alert("Fehler: "+error.message);return}
  const {data}=await sb.from("projects").select("*").order("name");
  allProjects=data||[];
  renderProjectList();
  return;
 }
 const del=e.target.closest("[data-del-project]");
 if(del){
  if(!confirm("Projekt wirklich löschen? Gespeicherte Rapporte bleiben erhalten, verlieren aber die Projekt-Zuordnung."))return;
  await sb.from("projects").delete().eq("id",Number(del.dataset.delProject));
  const {data}=await sb.from("projects").select("*").order("name");
  allProjects=data||[];
  renderProjectList();renderProjectSelect();
 }
});

// ---- Arbeitslisten im Projekt-Cockpit --------------------------
// Genau dieselben Aktionen wie bisher auf der Projektkarte, nur jetzt im
// Cockpit. Die Projekt-Zugehörigkeit kommt aus cockpitProjectId
// (js/24-projekt-cockpit.js) statt aus der umgebenden Projektkarte - es
// ist immer genau ein Projekt geöffnet.
$("cockpitWorkArea").addEventListener("click",async e=>{
 const openF=e.target.closest("[data-open-project-file]");
 if(openF){
  const id=Number(openF.dataset.openProjectFile);
  const f=projectFilesCache.find(x=>x.id===id);
  if(f){
   // Bucket ist privat: window.open() muss synchron im Klick bleiben,
   // sonst blockieren Popup-Blocker – deshalb sofort ein leeres Fenster
   // öffnen und erst danach die signierte URL nachladen.
   const fenster=window.open("","_blank");
   const url=await storageSignedUrl(f.file_path);
   if(url&&fenster)fenster.location.href=url;
   else if(fenster)fenster.close();
   if(!url)alert("Datei konnte nicht geöffnet werden.");
  }
  return;
 }
 const renameF=e.target.closest("[data-rename-project-file]");
 if(renameF){
  const id=Number(renameF.dataset.renameProjectFile);
  const f=projectFilesCache.find(x=>x.id===id);
  if(!f)return;
  const neuerName=prompt("Neuer Dateiname:",f.name);
  if(neuerName===null)return;
  const trimmed=neuerName.trim();
  if(!trimmed){alert("Bitte einen Namen eingeben.");return}
  const {data:neu,error}=await sb.from("project_files").update({name:trimmed}).eq("id",id).select("id");
  if(error){alert("Fehler beim Umbenennen: "+dateiFehlerText(error));return}
  if(!neu||!neu.length){alert("Die Datei konnte nicht umbenannt werden. Fehlt die nötige Berechtigung?");return}
  await cockpitBereichAktualisieren("files");
  return;
 }
 const replaceF=e.target.closest("[data-replace-project-file]");
 if(replaceF){
  const inp=replaceF.parentElement.querySelector(`[data-replace-file-input="${replaceF.dataset.replaceProjectFile}"]`);
  if(inp)inp.click();
  return;
 }
 const delF=e.target.closest("[data-del-project-file]");
 if(delF){
  const id=Number(delF.dataset.delProjectFile);
  const f=projectFilesCache.find(x=>x.id===id);
  if(!confirm(`Datei „${f?f.name:"?"}" wirklich löschen?`))return;
  // Ein von RLS blockiertes DELETE meldet keinen Fehler, es betrifft
  // still 0 Zeilen (siehe CLAUDE.md 24.1) - deshalb das Ergebnis prüfen,
  // statt Erfolg anzunehmen und die Datei danach trotzdem anzuzeigen.
  const {data:weg,error}=await sb.from("project_files").delete().eq("id",id).select("id");
  if(error){alert("Fehler beim Löschen: "+dateiFehlerText(error));return}
  if(!weg||!weg.length){alert("Die Datei konnte nicht gelöscht werden. Fehlt die nötige Berechtigung?");return}
  if(f&&f.file_path)await sb.storage.from("measurements").remove([f.file_path]);
  await cockpitBereichAktualisieren("files");
  return;
 }
 const open=e.target.closest("[data-open-report]");
 if(open){
  const id=Number(open.dataset.openReport);
  const {data,error}=await sb.from("reports").select("*").eq("id",id).maybeSingle();
  if(error||!data){alert("Fehler beim Laden: "+(error?error.message:"Rapport nicht gefunden"));return}
  openReport(data,"projectCockpit");
  return;
 }
 const openM=e.target.closest("[data-open-project-measurement]");
 if(openM){
  const id=Number(openM.dataset.openProjectMeasurement);
  const m=projectMeasurementsCache.find(x=>x.id===id);
  if(m){
   measEditReturnTo="projectCockpit";
   $("projectCockpitModal").hidden=true;
   openMeasurement(m);
  }
  return;
 }
 const printM=e.target.closest("[data-print-project-measurement]");
 if(printM){
  const id=Number(printM.dataset.printProjectMeasurement);
  const m=projectMeasurementsCache.find(x=>x.id===id);
  if(m)printMeasurement(m);
  return;
 }
 const delM=e.target.closest("[data-del-project-measurement]");
 if(delM){
  if(!confirm("Diese Massaufnahme wirklich löschen?"))return;
  const id=Number(delM.dataset.delProjectMeasurement);
  await sb.from("measurements").delete().eq("id",id);
  await cockpitBereichAktualisieren("meas");
  return;
 }
 const openA=e.target.closest("[data-open-project-ausmass]");
 if(openA){
  const id=Number(openA.dataset.openProjectAusmass);
  const a=projectAusmassCache.find(x=>x.id===id);
  if(a){
   amEditReturnTo="projectCockpit";
   $("projectCockpitModal").hidden=true;
   openAusmass(a);
  }
  return;
 }
 const printA=e.target.closest("[data-print-project-ausmass]");
 if(printA){
  const id=Number(printA.dataset.printProjectAusmass);
  const a=projectAusmassCache.find(x=>x.id===id);
  if(a)printAusmass(a);
  return;
 }
 const delA=e.target.closest("[data-del-project-ausmass]");
 if(delA){
  if(!confirm("Dieses Ausmass wirklich löschen?"))return;
  const id=Number(delA.dataset.delProjectAusmass);
  await sb.from("ausmass").delete().eq("id",id);
  await cockpitBereichAktualisieren("am");
  return;
 }
 const delRep=e.target.closest("[data-del-report]");
 if(delRep){
  if(!confirm("Diesen Rapport wirklich löschen?"))return;
  const id=Number(delRep.dataset.delReport);
  await sb.from("reports").delete().eq("id",id);
  if(currentReportId===id)currentReportId=null;
  await cockpitBereichAktualisieren("rep");
 }
});
$("cockpitWorkArea").addEventListener("change",async e=>{
 const inp=e.target.closest("[data-upload-file]");
 if(inp){
  const projectId=Number(inp.dataset.uploadFile);
  const files=Array.from(inp.files||[]);
  if(!files.length)return;
  inp.disabled=true;
  // Jede Datei einzeln: ein Fehler bei einer Datei darf die uebrigen
  // nicht verhindern, und am Ende muss klar sein, was gespeichert wurde.
  const fehler=[];
  for(const file of files){
   try{ await uploadProjectFile(projectId,file); }
   catch(err){ fehler.push(`• ${file.name}: ${dateiFehlerText(err)}`); }
  }
  if(fehler.length){
   const ok=files.length-fehler.length;
   alert(`${ok} von ${files.length} Datei(en) gespeichert.\n\nNicht gespeichert:\n${fehler.join("\n")}`);
  }
  await cockpitBereichAktualisieren("files");
  return;
 }
 const replaceInp=e.target.closest("[data-replace-file-input]");
 if(replaceInp){
  const id=Number(replaceInp.dataset.replaceFileInput);
  const file=replaceInp.files&&replaceInp.files[0];
  if(!file)return;
  replaceInp.disabled=true;
  try{
   await replaceProjectFile(id,file);
  }catch(err){
   alert("Fehler beim Ersetzen: "+dateiFehlerText(err));
  }
  await cockpitBereichAktualisieren("files");
 }
});
