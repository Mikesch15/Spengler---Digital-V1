/* Spengler Digital V1.49 – extracted module; logic unchanged */
function renderCuts(){
 $("cuts").innerHTML=cuts.map((c,i)=>`<div class="cut"><div class="cutgrid">
<div><label>Länge mm</label><input data-cut-l="${i}" type="number" min="0" inputmode="decimal" value="${c.l}" placeholder="2000"></div>
<div><label>Breite mm</label><input data-cut-b="${i}" type="number" min="0" inputmode="decimal" value="${c.b}" placeholder="1000"></div>
<div><label>Stückzahl</label><input data-cut-q="${i}" type="number" min="1" inputmode="numeric" value="${c.q}"></div>
<div class="area"><label>Fläche</label><span id="cutArea${i}">0.00</span> m²</div></div>
<div class="bar no-print"><button class="red" data-del-cut="${i}">× Zuschnitt löschen</button></div></div>`).join("");
updateCuts();
}
function updateCuts(){
 let total=0;
 cuts.forEach((c,i)=>{const a=(Number(c.l)||0)*(Number(c.b)||0)*(Number(c.q)||0)/1000000;total+=a;$("cutArea"+i).textContent=money(a)});
 $("sheetTotal").textContent=money(total);
}
$("cuts").addEventListener("input",e=>{
 const i=e.target.dataset.cutL??e.target.dataset.cutB??e.target.dataset.cutQ;if(i===undefined)return;
 if(e.target.dataset.cutL!==undefined)cuts[i].l=e.target.value;
 if(e.target.dataset.cutB!==undefined)cuts[i].b=e.target.value;
 if(e.target.dataset.cutQ!==undefined)cuts[i].q=e.target.value;
 updateCuts();
});
$("cuts").addEventListener("click",e=>{const b=e.target.closest("[data-del-cut]");if(b){cuts.splice(Number(b.dataset.delCut),1);if(!cuts.length)cuts.push({l:"",b:"",q:1});renderCuts()}});
$("takeOver").onclick=()=>{
 if(!selectedSheet){alert("Bitte zuerst ein Material auswählen.");return}
 const total=cuts.reduce((s,c)=>s+(Number(c.l)||0)*(Number(c.b)||0)*(Number(c.q)||0)/1000000,0);
 if(total<=0){alert("Bitte mindestens einen gültigen Zuschnitt eingeben.");return}
 mats.push({date:new Date().toISOString().slice(0,10),no:selectedSheet[0],qty:Number(total.toFixed(4))});renderMain();$("sheetModal").hidden=true;
};

$("print").onclick=()=>{
 const proj=allProjects.find(p=>p.id===currentProjectId);
 const alterTitel=document.title;
 document.title=pdfDateiname(proj?proj.name:"",proj?proj.object:"","Regierapport",$("orderNo")?$("orderNo").value:"");
 window.print();
 setTimeout(()=>{document.title=alterTitel;},1000);
};
window.addEventListener("beforeprint",()=>{
 const el=$("printTimestamp");
 if(el)el.textContent="Ausgedruckt am "+new Date().toLocaleString("de-CH",{dateStyle:"medium",timeStyle:"short"});
 const metaEl=$("printMeta");
 if(metaEl){
  const erstelltName=profileName(currentReportMeta.created_by);
  const erstelltZeit=formatDatumZeit(currentReportMeta.created_at);
  const geaendertName=profileName(currentReportMeta.updated_by);
  const geaendertZeit=formatDatumZeit(currentReportMeta.updated_at);
  const teile=[];
  if(erstelltName||erstelltZeit)teile.push(`Erstellt von ${erstelltName||"–"}${erstelltZeit?" am "+erstelltZeit:""}`);
  if(geaendertName||geaendertZeit)teile.push(`Zuletzt geändert von ${geaendertName||"–"}${geaendertZeit?" am "+geaendertZeit:""}`);
  metaEl.textContent=teile.join(" · ");
 }
});
$("save").onclick=async()=>{
 if(!currentProjectId){alert("Bitte zuerst ein Projekt auswählen. Ein Rapport kann nur einem Projekt zugeordnet gespeichert werden.");return}
 $("save").disabled=true;
 const payload={
  project_id:currentProjectId,
  date:$("date").value||null,
  order_no:$("orderNo").value,
  customer:$("customer").value,
  object:$("object").value,
  vat:$("vat").value,
  work_entries:works,
  material_entries:mats,
  updated_by:currentProfile?currentProfile.id:null,
  updated_at:new Date().toISOString()
 };
 let res;
 if(currentReportId)res=await sb.from("reports").update(payload).eq("id",currentReportId).select().maybeSingle();
 else res=await sb.from("reports").insert({...payload,created_by:currentProfile?currentProfile.id:null,created_at:new Date().toISOString()}).select().maybeSingle();
 $("save").disabled=false;
 if(res.error){alert("Fehler beim Speichern: "+res.error.message);return}
 if(res.data){currentReportId=res.data.id;currentReportMeta={created_by:res.data.created_by,created_at:res.data.created_at,updated_by:res.data.updated_by,updated_at:res.data.updated_at};}
 isDirty=false;
 alert("Rapport gespeichert und dem Projekt zugeordnet.");
};
$("clear").onclick=()=>{if(confirm("Wirklich alle Rapportdaten löschen?")){works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];mats=[];currentReportId=null;renderMain()}};

// ---- Projekte ------------------------------------------------
