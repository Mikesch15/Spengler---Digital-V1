"use strict";
$("openGlobalSearch").onclick=()=>{
 $("globalSearchModal").hidden=false;
 $("globalSearchInput").value="";
 $("globalSearchResults").innerHTML="";
 $("globalSearchStatus").textContent="";
 $("globalSearchInput").focus();
};
$("closeGlobalSearch").onclick=()=>{$("globalSearchModal").hidden=true};
$("startFromGlobalSearch").onclick=()=>goToStart();
const debouncedGlobalSearch=debounce(async(q)=>{
 q=q.trim();
 if(!q){$("globalSearchResults").innerHTML="";$("globalSearchStatus").textContent="";return}
 $("globalSearchStatus").textContent="Suche läuft …";
 const like=`%${q}%`;
 const [repRes,measRes,amRes]=await Promise.all([
  sb.from("reports").select("*").or(`customer.ilike.${like},object.ilike.${like},order_no.ilike.${like}`).order("date",{ascending:false}).limit(30),
  sb.from("measurements").select("*").ilike("title",like).order("date",{ascending:false}).limit(30),
  sb.from("ausmass").select("*").ilike("title",like).order("date",{ascending:false}).limit(30),
 ]);
 const qLower=q.toLowerCase();
 const projMatches=allProjects.filter(p=>String(p.name||"").toLowerCase().includes(qLower));
 const projIds=new Set(projMatches.map(p=>p.id));
 let reports=repRes.data||[];
 let measurements=measRes.data||[];
 let ausmasse=amRes.data||[];
 if(projIds.size){
  const [r2,m2,a2]=await Promise.all([
   sb.from("reports").select("*").in("project_id",[...projIds]).order("date",{ascending:false}).limit(30),
   sb.from("measurements").select("*").in("project_id",[...projIds]).order("date",{ascending:false}).limit(30),
   sb.from("ausmass").select("*").in("project_id",[...projIds]).order("date",{ascending:false}).limit(30),
  ]);
  const mergeById=(a,b)=>{const seen=new Set(a.map(x=>x.id));return a.concat((b||[]).filter(x=>!seen.has(x.id)))};
  reports=mergeById(reports,r2.data);
  measurements=mergeById(measurements,m2.data);
  ausmasse=mergeById(ausmasse,a2.data);
 }
 const results=[
  ...reports.map(r=>({kind:"report",data:r})),
  ...measurements.map(m=>({kind:"measurement",data:m})),
  ...ausmasse.map(a=>({kind:"ausmass",data:a})),
 ];
 globalSearchCache=results;
 const measTypeLabels={skizze_foto:"Skizze/Foto",einlaufblech_gerade:"Einlaufblech gerade",rinne_halbrund:"Rinne Halbrund",einlaufblech_konisch:"Einlaufblech konisch",freies_profil:"Freies Profil"};
 const amTypeLabels={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};
 $("globalSearchStatus").textContent=`${results.length} Treffer`;
 $("globalSearchResults").innerHTML=results.length?results.map((r,i)=>{
  const proj=allProjects.find(p=>p.id===r.data.project_id);
  let label,sub,icon;
  if(r.kind==="report"){icon="📋";label="Regierapport";sub=`${proj?proj.name:(r.data.customer||"Ohne Projekt")} · ${r.data.date||"–"} · ${r.data.order_no||"–"}`}
  else if(r.kind==="measurement"){icon="📐";label=`Massaufnahme (${measTypeLabels[r.data.type]||r.data.type})`;sub=`${r.data.title||"Ohne Titel"} · ${proj?proj.name:"Kein Projekt"} · ${r.data.date||"–"}`}
  else{icon="📏";label=`Ausmass (${amTypeLabels[r.data.type]||r.data.type})`;sub=`${r.data.title||"Ohne Titel"} · ${proj?proj.name:"Kein Projekt"} · ${r.data.date||"–"}`}
  return `<div class="meas-row">
<div class="meas-row-info"><b>${icon} ${esc(label)}</b><span>${esc(sub)}</span></div>
<div class="meas-row-actions"><button class="blue" data-open-search-result="${i}" title="Öffnen">✏️</button></div>
</div>`;
 }).join(""):"<div class=\"empty\">Keine Treffer.</div>";
},400);
$("globalSearchInput").addEventListener("input",e=>debouncedGlobalSearch(e.target.value));
$("globalSearchResults").addEventListener("click",e=>{
 const b=e.target.closest("[data-open-search-result]");
 if(!b)return;
 const r=globalSearchCache[Number(b.dataset.openSearchResult)];
 if(!r)return;
 $("globalSearchModal").hidden=true;
 if(r.kind==="report")openReport(r.data);
 else if(r.kind==="measurement")openMeasurement(r.data);
 else openAusmass(r.data);
});
$("navReport").onclick=async()=>{$("reportsModal").hidden=false;await renderReportsOverview()};
$("startFromReportEdit").onclick=()=>{goToStart()};
$("reportEditSettingsShortcut").onclick=()=>openSettingsTo("protected","rates");
$("newReport").onclick=()=>{
 sperreFuerEintrag("rapport",null);
 isDirty=false;
 currentProjectId=null;currentReportId=null;
 currentReportMeta={};
 works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];
 mats=[];
 $("date").value=new Date().toISOString().slice(0,10);
 $("orderNo").value="";
 $("customer").value="";
 $("object").value="";
 $("vat").value=defaultVat;
 renderProjectSelect();
 renderMain();
 $("reportsModal").hidden=true;
 $("startScreen").hidden=true;
 $("reportScreen").hidden=false;
};
async function renderReportsOverview(){
 const {data,error}=await sb.from("reports").select("*").order("created_at",{ascending:false}).limit(recentCount);
 if(error){$("recentReportsList").innerHTML=`<div class="empty">Fehler: ${esc(error.message)}</div>`;return}
 const rows=data||[];
 recentReportsCache=rows;
 $("recentReportsList").innerHTML=rows.length?rows.map(r=>{
  const proj=allProjects.find(p=>p.id===r.project_id);
  return `<div class="meas-row">
<div class="meas-row-info"><b>Regierapport</b><span>${esc(proj?proj.name:(r.customer||"Ohne Projekt"))} · ${esc(r.date||"–")} · ${esc(r.order_no||"–")}</span></div>
<div class="meas-row-actions">
<button class="blue" data-open-report-overview="${r.id}" title="Öffnen">✏️</button>
<button class="red" data-del-report-overview="${r.id}" title="Löschen">×</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch keine Rapporte vorhanden.</div>';
}
$("recentReportsList").addEventListener("click",e=>{
 const o=e.target.closest("[data-open-report-overview]");
 if(o){const r=recentReportsCache.find(x=>x.id===Number(o.dataset.openReportOverview));if(r)openReport(r);return}
 const d=e.target.closest("[data-del-report-overview]");
 if(d){
  if(!confirm("Diesen Rapport wirklich löschen?"))return;
  sb.from("reports").delete().eq("id",Number(d.dataset.delReportOverview)).then(({error})=>{
   if(error){alert("Fehler: "+error.message);return}
   if(currentReportId===Number(d.dataset.delReportOverview))currentReportId=null;
   renderReportsOverview();
  });
 }
});
$("closeReports").onclick=()=>{$("reportsModal").hidden=true};
$("reportSettingsShortcut").onclick=()=>openSettingsTo("protected","rates");
$("startFromReports").onclick=()=>goToStart();
$("exportReportsCsv").onclick=async()=>{
 $("exportReportsCsv").disabled=true;
 const {data,error}=await sb.from("reports").select("*").order("date",{ascending:false});
 $("exportReportsCsv").disabled=false;
 if(error){alert("Fehler: "+error.message);return}
 const rows=data||[];
 if(!rows.length){alert("Keine Rapporte zum Exportieren vorhanden.");return}
 const header=["Datum","Projekt","Auftrags-Nr.","Auftraggeber","Adresse","Arbeitsstunden","Arbeitsbetrag CHF","Materialbetrag CHF","MWST","Gesamtbetrag CHF (inkl. MWST)"];
 const csvRows=[header];
 for(const r of rows){
  const proj=allProjects.find(p=>p.id===r.project_id);
  const works=r.work_entries||[];
  const mats2=r.material_entries||[];
  const hours=works.reduce((s,w)=>s+(Number(w.hours)||0),0);
  const workTotal=works.reduce((s,w)=>s+(Number(w.hours)||0)*rateFor(w.rateName),0);
  const matTotal=mats2.reduce((s,m)=>{const x=materialFor(m.no);return s+(x?Number(String(x[4]).replace(",","."))*Number(m.qty||0):0)},0);
  const vat=Number(String(r.vat||"0").replace(",",".").replace("%",""))||0;
  const gross=(workTotal+matTotal)*(1+vat/100);
  csvRows.push([r.date||"",proj?proj.name:"",r.order_no||"",r.customer||"",r.object||"",hours.toFixed(2),workTotal.toFixed(2),matTotal.toFixed(2),r.vat||"",gross.toFixed(2)]);
 }
 const csv=csvRows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
 const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download=`Regierapporte_${new Date().toISOString().slice(0,10)}.csv`;
 document.body.appendChild(a);a.click();document.body.removeChild(a);
 URL.revokeObjectURL(url);
};
$("startFromProjects").onclick=()=>{goToStart()};
$("startFromMeasurements").onclick=()=>{goToStart()};
$("measurementSettingsShortcut").onclick=()=>openSettingsTo("measurements");
$("startFromMeasurementEdit").onclick=()=>{goToStart()};
$("measurementEditSettingsShortcut").onclick=()=>{
 const type=$("measType").value;
 if(type==="rinne_halbrund")openSettingsTo("measurements","rinne");
 else if(type==="einlaufblech_gerade")openSettingsTo("measurements","einlaufblech");
 else openSettingsTo("measurements");
};
$("startFromSettings").onclick=()=>{goToStart()};
$("startFromSheet").onclick=()=>{goToStart()};
