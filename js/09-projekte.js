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
function renderProjectList(){
 const list=showArchivedProjects?allProjects:allProjects.filter(p=>!p.archived);
 $("projectList").innerHTML=list.map(p=>`<div class="project-row"${p.archived?' style="opacity:.6"':''}>
<div class="project-row-top"><b>${esc(p.name)}${p.archived?' <span class="small">(archiviert)</span>':''}</b><button class="red" data-del-project="${p.id}">Löschen</button></div>
<div class="small">${esc(p.order_no||"–")} · ${esc(p.object||"–")} · ${esc(p.customer||"–")}</div>
<div class="project-row-actions">
<button class="gray" data-toggle-reports="${p.id}">📋 Rapporte anzeigen</button>
<button class="gray" data-toggle-measurements="${p.id}">📐 Massaufnahmen anzeigen</button>
<button class="gray" data-toggle-ausmass="${p.id}">📏 Ausmasse anzeigen</button>
<button class="gray" data-toggle-files="${p.id}">📎 Dateien anzeigen</button>
<button class="gray" data-archive-project="${p.id}">${p.archived?"↩️ Reaktivieren":"📦 Archivieren"}</button>
</div>
<div class="report-list" data-reports-body="${p.id}"></div>
<div class="report-list" data-measurements-body="${p.id}"></div>
<div class="report-list" data-ausmass-body="${p.id}"></div>
<div class="report-list" data-files-body="${p.id}"></div>
</div>`).join("")||'<div class="empty">Noch keine Projekte angelegt.</div>';
}
async function loadProjectAusmass(projectId){
 const box=document.querySelector(`[data-ausmass-body="${projectId}"]`);
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("ausmass").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 const typeLabels={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};
 projectAusmassCache=list;
 box.innerHTML=list.length?list.map(a=>`<div class="report-row">
<div class="report-row-info"><b>Ausmass (${esc(typeLabels[a.type]||a.type)})</b><span>${esc(a.title||"Ohne Titel")} · ${esc(a.date||"ohne Datum")}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-project-ausmass="${a.id}">Öffnen</button>
<button class="gray" data-print-project-ausmass="${a.id}">🖨️</button>
<button class="red" data-del-project-ausmass="${a.id}">×</button>
</div>
</div>`).join(""):'<div class="small">Noch keine Ausmasse zu diesem Projekt gespeichert.</div>';
}
async function loadProjectReports(projectId){
 const box=document.querySelector(`[data-reports-body="${projectId}"]`);
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("reports").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 projectReportsCache=list;
 box.innerHTML=list.length?list.map(r=>`<div class="report-row">
<div class="report-row-info"><b>Regierapport</b><span>${esc(r.date||"ohne Datum")} · ${esc(r.order_no||"–")}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-report="${r.id}">Öffnen</button>
<button class="red" data-del-report="${r.id}">×</button>
</div>
</div>`).join(""):'<div class="small">Noch keine Rapporte zu diesem Projekt gespeichert.</div>';
}
async function loadProjectMeasurements(projectId){
 const box=document.querySelector(`[data-measurements-body="${projectId}"]`);
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("measurements").select("*").eq("project_id",projectId).order("date",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 const typeLabels=MEAS_TYPE_LABELS;
 projectMeasurementsCache=list;
 box.innerHTML=list.length?list.map(m=>`<div class="report-row">
<div class="report-row-info"><b>Massaufnahme (${esc(typeLabels[m.type]||m.type)})</b><span>${esc(m.title||"Ohne Titel")} · ${esc(m.date||"ohne Datum")}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-project-measurement="${m.id}">Öffnen</button>
<button class="gray" data-print-project-measurement="${m.id}">🖨️</button>
<button class="red" data-del-project-measurement="${m.id}">×</button>
</div>
</div>`).join(""):'<div class="small">Noch keine Massaufnahmen zu diesem Projekt gespeichert.</div>';
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
 const box=document.querySelector(`[data-files-body="${projectId}"]`);
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("project_files").select("*").eq("project_id",projectId).order("created_at",{ascending:false});
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;return}
 const list=data||[];
 projectFilesCache=list;
 const zeilen=list.length?list.map(f=>{
  const wer=profileName(f.created_by)||"–";
  const wann=f.created_at?new Date(f.created_at).toLocaleDateString("de-CH"):"–";
  const geaendert=f.updated_at?` · ersetzt am ${esc(new Date(f.updated_at).toLocaleDateString("de-CH"))}${f.updated_by?" von "+esc(profileName(f.updated_by)||"–"):""}`:"";
  return `<div class="report-row">
<div class="report-row-info"><b>${projectFileIcon(f.mime_type,f.name)} ${esc(f.name)}</b><span>${formatFileSize(f.size_bytes)} · ${esc(wer)} · ${esc(wann)}${geaendert}</span></div>
<div class="report-row-actions">
<button class="blue" data-open-project-file="${f.id}">Öffnen</button>
<button class="gray" data-replace-project-file="${f.id}">🔄 Ersetzen</button>
<input type="file" data-replace-file-input="${f.id}" hidden>
<button class="red" data-del-project-file="${f.id}">×</button>
</div>
</div>`;
 }).join(""):'<div class="small">Noch keine Dateien zu diesem Projekt hochgeladen.</div>';
 box.innerHTML=`<div class="bar" style="margin-bottom:6px"><input type="file" multiple data-upload-file="${projectId}"></div>${zeilen}`;
}

function openReport(r){
 sperreFuerEintrag("rapport",r&&r.created_by);
 isDirty=false;
 currentProjectId=r.project_id;
 currentReportId=r.id;
 currentReportMeta={created_by:r.created_by,created_at:r.created_at,updated_by:r.updated_by,updated_at:r.updated_at};
 works=(r.work_entries&&r.work_entries.length)?r.work_entries:[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];
 mats=r.material_entries||[];
 $("date").value=r.date||"";
 $("orderNo").value=r.order_no||"";
 $("customer").value=r.customer||"";
 $("object").value=r.object||"";
 $("vat").value=r.vat||"8.1 %";
 $("projectsModal").hidden=true;
 $("reportsModal").hidden=true;
 $("startScreen").hidden=true;
 $("reportScreen").hidden=false;
 renderProjectSelect();
 renderMain();
}
$("startOpenProjects").onclick=()=>{renderProjectList();$("projectsModal").hidden=false};
$("navMeasurements").onclick=async()=>{$("measurementsModal").hidden=false;await renderMeasurementsOverview()};
$("newMeasurement").onclick=()=>{$("measurementsModal").hidden=true;$("measTypeChooserModal").hidden=false};
$("cancelMeasTypeChooser").onclick=()=>{$("measTypeChooserModal").hidden=true;$("measurementsModal").hidden=false};
$("measTypeChooserModal").addEventListener("click",e=>{
 const b=e.target.closest("[data-choose-meas-type]");
 if(!b)return;
 $("measTypeChooserModal").hidden=true;
 newMeasurementWithType(b.dataset.chooseMeasType);
});
$("navAusmass").onclick=async()=>{$("ausmassModal").hidden=false;await renderAusmassOverview()};
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
};
$("projectList").addEventListener("click",async e=>{
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
  return;
 }
 const toggle=e.target.closest("[data-toggle-reports]");
 if(toggle){
  const id=Number(toggle.dataset.toggleReports);
  const box=document.querySelector(`[data-reports-body="${id}"]`);
  const willOpen=!box.classList.contains("open");
  box.classList.toggle("open");
  toggle.textContent=willOpen?"📋 Rapporte ausblenden":"📋 Rapporte anzeigen";
  if(willOpen)await loadProjectReports(id);
  return;
 }
 const toggleM=e.target.closest("[data-toggle-measurements]");
 if(toggleM){
  const id=Number(toggleM.dataset.toggleMeasurements);
  const box=document.querySelector(`[data-measurements-body="${id}"]`);
  const willOpen=!box.classList.contains("open");
  box.classList.toggle("open");
  toggleM.textContent=willOpen?"📐 Massaufnahmen ausblenden":"📐 Massaufnahmen anzeigen";
  if(willOpen)await loadProjectMeasurements(id);
  return;
 }
 const toggleA=e.target.closest("[data-toggle-ausmass]");
 if(toggleA){
  const id=Number(toggleA.dataset.toggleAusmass);
  const box=document.querySelector(`[data-ausmass-body="${id}"]`);
  const willOpen=!box.classList.contains("open");
  box.classList.toggle("open");
  toggleA.textContent=willOpen?"📏 Ausmasse ausblenden":"📏 Ausmasse anzeigen";
  if(willOpen)await loadProjectAusmass(id);
  return;
 }
 const toggleF=e.target.closest("[data-toggle-files]");
 if(toggleF){
  const id=Number(toggleF.dataset.toggleFiles);
  const box=document.querySelector(`[data-files-body="${id}"]`);
  const willOpen=!box.classList.contains("open");
  box.classList.toggle("open");
  toggleF.textContent=willOpen?"📎 Dateien ausblenden":"📎 Dateien anzeigen";
  if(willOpen)await loadProjectFiles(id);
  return;
 }
 const openF=e.target.closest("[data-open-project-file]");
 if(openF){
  const id=Number(openF.dataset.openProjectFile);
  const f=projectFilesCache.find(x=>x.id===id);
  if(f)window.open(sb.storage.from("measurements").getPublicUrl(f.file_path).data.publicUrl,"_blank");
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
  if(!confirm("Diese Datei wirklich löschen?"))return;
  const id=Number(delF.dataset.delProjectFile);
  const f=projectFilesCache.find(x=>x.id===id);
  await sb.from("project_files").delete().eq("id",id);
  if(f&&f.file_path)await sb.storage.from("measurements").remove([f.file_path]);
  const projRow=delF.closest(".project-row");
  const projId=Number(projRow.querySelector("[data-toggle-files]").dataset.toggleFiles);
  await loadProjectFiles(projId);
  return;
 }
 const open=e.target.closest("[data-open-report]");
 if(open){
  const id=Number(open.dataset.openReport);
  const {data,error}=await sb.from("reports").select("*").eq("id",id).maybeSingle();
  if(error||!data){alert("Fehler beim Laden: "+(error?error.message:"Rapport nicht gefunden"));return}
  openReport(data);
  return;
 }
 const openM=e.target.closest("[data-open-project-measurement]");
 if(openM){
  const id=Number(openM.dataset.openProjectMeasurement);
  const m=projectMeasurementsCache.find(x=>x.id===id);
  if(m){
   measEditReturnTo="projectsModal";
   $("projectsModal").hidden=true;
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
  const projRow=delM.closest(".project-row");
  const projId=Number(projRow.querySelector("[data-toggle-measurements]").dataset.toggleMeasurements);
  await loadProjectMeasurements(projId);
  return;
 }
 const openA=e.target.closest("[data-open-project-ausmass]");
 if(openA){
  const id=Number(openA.dataset.openProjectAusmass);
  const a=projectAusmassCache.find(x=>x.id===id);
  if(a){
   amEditReturnTo="projectsModal";
   $("projectsModal").hidden=true;
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
  const projRow=delA.closest(".project-row");
  const projId=Number(projRow.querySelector("[data-toggle-ausmass]").dataset.toggleAusmass);
  await loadProjectAusmass(projId);
  return;
 }
 const delRep=e.target.closest("[data-del-report]");
 if(delRep){
  if(!confirm("Diesen Rapport wirklich löschen?"))return;
  const id=Number(delRep.dataset.delReport);
  await sb.from("reports").delete().eq("id",id);
  if(currentReportId===id)currentReportId=null;
  const projRow=delRep.closest(".project-row");
  const projId=Number(projRow.querySelector("[data-toggle-reports]").dataset.toggleReports);
  await loadProjectReports(projId);
 }
});
$("projectList").addEventListener("change",async e=>{
 const inp=e.target.closest("[data-upload-file]");
 if(inp){
  const projectId=Number(inp.dataset.uploadFile);
  const files=Array.from(inp.files||[]);
  if(!files.length)return;
  inp.disabled=true;
  try{
   for(const file of files)await uploadProjectFile(projectId,file);
  }catch(err){
   alert("Fehler beim Hochladen: "+(err.message||err));
  }
  await loadProjectFiles(projectId);
  return;
 }
 const replaceInp=e.target.closest("[data-replace-file-input]");
 if(replaceInp){
  const id=Number(replaceInp.dataset.replaceFileInput);
  const file=replaceInp.files&&replaceInp.files[0];
  if(!file)return;
  const box=replaceInp.closest("[data-files-body]");
  const projectId=box?Number(box.dataset.filesBody):null;
  replaceInp.disabled=true;
  try{
   await replaceProjectFile(id,file);
  }catch(err){
   alert("Fehler beim Ersetzen: "+(err.message||err));
  }
  if(projectId)await loadProjectFiles(projectId);
 }
});
