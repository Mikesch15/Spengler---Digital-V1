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
 // v2.45: Ein Projekt wird ueber seine Adresse erkannt - deshalb wird
 // jetzt auch danach (und nach Auftrags-Nr./Auftraggeber) gesucht, nicht
 // nur nach dem Projektnamen. Laeuft weiterhin rein clientseitig auf dem
 // bereits geladenen, RLS-gefilterten allProjects: keine zusaetzliche
 // Abfrage, keine neue Datenquelle.
 const projMatches=allProjects.filter(p=>
  [p.name,p.object,p.order_no,p.customer].some(v=>String(v||"").toLowerCase().includes(qLower)));
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
  // Projekte zuerst: sie sind der Einstieg in alles Uebrige (v2.45).
  ...projMatches.map(p=>({kind:"project",data:p})),
  ...reports.map(r=>({kind:"report",data:r})),
  ...measurements.map(m=>({kind:"measurement",data:m})),
  ...ausmasse.map(a=>({kind:"ausmass",data:a})),
 ];
 globalSearchCache=results;
 const measTypeLabels=MEAS_TYPE_LABELS;
 const amTypeLabels={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};
 $("globalSearchStatus").textContent=`${results.length} Treffer`;
 // v2.40: Der gefundene Eintrag steht zuoberst, darunter Trefferart,
 // Projekt und Datum. Dieselben Angaben wie bisher, nur klarer geordnet.
 // project_id kommt aus der bereits geladenen Zeile (select("*")) -
 // dafuer ist keine zusaetzliche Abfrage noetig.
 $("globalSearchResults").innerHTML=results.length?results.map((r,i)=>{
  const proj=allProjects.find(p=>p.id===r.data.project_id);
  // Das Projekt selbst: Adresse als Haupttitel, Name/Auftrags-Nr./
  // Auftraggeber darunter. Kein Direktweg - ein Projekt wird immer im
  // Cockpit geoeffnet.
  if(r.kind==="project"){
   const titel=projektTitel(r.data);
   const sub=infoZeileOhne(titel,"Projekt",r.data.name,r.data.order_no,r.data.customer);
   return `<div class="meas-row">
<div class="meas-row-info"><b>📁 ${esc(titel)}</b><span>${esc(sub)}</span></div>
<div class="meas-row-actions"><button class="blue" data-open-search-cockpit="${i}">📂 Öffnen</button></div>
</div>`;
  }
  let treffer,art,icon,ersatz;
  if(r.kind==="report"){
   icon="📋";art="Regierapport";
   treffer=[r.data.order_no,r.data.customer,r.data.object].map(x=>String(x||"").trim()).filter(Boolean).join(" · ")||(r.data.date||"Ohne Kopfdaten");
   // Fallback-Stufe 2 ist beim Rapport die Objektbezeichnung
   // (Objekt/Gebaeudeteil), nicht der zusammengesetzte Treffertext.
   ersatz=r.data.object;
  }else if(r.kind==="measurement"){
   icon="📐";art=`Massaufnahme · ${measTypeLabels[r.data.type]||r.data.type}`;
   treffer=r.data.title||"Ohne Titel";
   ersatz=r.data.title;
  }else{
   icon="📏";art=`Ausmass · ${amTypeLabels[r.data.type]||r.data.type}`;
   treffer=r.data.title||"Ohne Titel";
   ersatz=r.data.title;
  }
  // v2.44: Adresse ist der Haupttitel, der gefundene Eintrag steht als
  // erste Zusatzangabe direkt darunter - sonst waere nicht mehr sichtbar,
  // warum der Treffer erschienen ist.
  const adresse=eintragAdresse(r.data,ersatz);
  // Den Treffer nicht doppelt zeigen, wenn er bereits der Haupttitel ist.
  const sub=infoZeileOhne(adresse,art,treffer,proj?"📁 "+proj.name:"Kein Projekt",r.data.date);
  // Der Cockpit-Weg nur, wenn der Treffer wirklich zu einem Projekt der
  // eigenen Firma gehoert - sonst bleibt es beim bisherigen Verhalten.
  const cockpitBtn=proj?`<button class="blue" data-open-search-cockpit="${i}">📂 Projekt</button>`:"";
  return `<div class="meas-row">
<div class="meas-row-info"><b>${icon} ${esc(adresse)}</b><span>${esc(sub)}</span></div>
<div class="meas-row-actions">${cockpitBtn}<button class="gray" data-open-search-result="${i}" title="Direkt öffnen">✏️</button></div>
</div>`;
 }).join(""):"<div class=\"empty\">Keine Treffer.</div>";
},400);
$("globalSearchInput").addEventListener("input",e=>debouncedGlobalSearch(e.target.value));
$("globalSearchResults").addEventListener("click",e=>{
 // Neuer Weg (v2.40): ins Projekt-Cockpit, dort ist der passende
 // Bereich seit v2.39 ohnehin geoeffnet - der Treffer wird nur noch
 // sichtbar gemacht. Zurueck fuehrt von dort ins Cockpit, nicht in die
 // Suche.
 const c=e.target.closest("[data-open-search-cockpit]");
 if(c){
  const t=globalSearchCache[Number(c.dataset.openSearchCockpit)];
  if(!t)return;
  // Beim Projekt selbst gibt es keinen einzelnen Treffer zum Hervorheben.
  const pid=t.kind==="project"?t.data.id:t.data.project_id;
  if(!pid)return;
  $("globalSearchModal").hidden=true;
  openProjectCockpit(pid,t.kind==="project"?null:{kind:t.kind,id:t.data.id});
  return;
 }
 // Bisheriger Direktweg - unveraendert.
 const b=e.target.closest("[data-open-search-result]");
 if(!b)return;
 const r=globalSearchCache[Number(b.dataset.openSearchResult)];
 if(!r||r.kind==="project")return;   // Projekte werden nur im Cockpit geoeffnet
 $("globalSearchModal").hidden=true;
 if(r.kind==="report")openReport(r.data);
 else if(r.kind==="measurement")openMeasurement(r.data);
 else openAusmass(r.data);
});
$("startFromReportEdit").onclick=()=>{goToStart()};
$("reportEditSettingsShortcut").onclick=()=>openSettingsTo("protected","rates");
$("newReport").onclick=()=>{
 sperreFuerEintrag("rapport",null);
 isDirty=false;
 currentProjectId=null;currentReportId=null;
 currentReportMeta={};
 updateVerlaufToggleVisibility($("reportVerlaufToggle"),$("reportVerlaufBody"),null);
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
<div class="meas-row-info"><b>${esc(eintragAdresse(r,r.object))}</b><span>${esc(infoZeileOhne(eintragAdresse(r,r.object),"Regierapport",proj?proj.name:null,r.date,r.order_no,r.customer))}</span></div>
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
  // matZeileTotal (js/06) beruecksichtigt auch die freie Position 999.99,
  // deren Preis im Rapport selbst steht statt im Katalog.
  const matTotal=mats2.reduce((s,m)=>s+matZeileTotal(m),0);
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
 // Bis v2.67 waren nur zwei der elf Arten hinterlegt - bei den uebrigen
 // neun oeffnete sich nur das Register, ohne an die passende Stelle zu
 // springen. Die Zuordnung steht jetzt vollstaendig in
 // MEAS_TYPE_SETTINGS_SECTION (js/01-basis.js), direkt neben der Liste
 // der Arten, damit eine neue Art beides gleichzeitig bekommt.
 openSettingsTo("measurements",MEAS_TYPE_SETTINGS_SECTION[$("measType").value]||"");
};
$("startFromSettings").onclick=()=>{goToStart()};
$("startFromSheet").onclick=()=>{goToStart()};
