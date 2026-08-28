/* Spengler Digital V1.49 – extracted module; logic unchanged */
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
