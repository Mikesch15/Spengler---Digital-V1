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
<button class="gray" data-archive-project="${p.id}">${p.archived?"↩️ Reaktivieren":"📦 Archivieren"}</button>
</div>
<div class="report-list" data-reports-body="${p.id}"></div>
<div class="report-list" data-measurements-body="${p.id}"></div>
<div class="report-list" data-ausmass-body="${p.id}"></div>
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
 const typeLabels={skizze_foto:"Skizze/Foto",einlaufblech_gerade:"Einlaufblech gerade",rinne_halbrund:"Rinne Halbrund",einlaufblech_konisch:"Einlaufblech konisch",freies_profil:"Freies Profil"};
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
function openReport(r){
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
