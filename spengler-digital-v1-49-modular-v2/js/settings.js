/* Spengler Digital V1.49 – extracted module; logic unchanged */
function openSettingsTo(tabName,sectionName){
 renderSettings();
 applyCompanyName();
 applyEinlaufblechSettings();
 $("settingsModal").hidden=false;
 const tabBtn=document.querySelector(`[data-settings-tab="${tabName}"]`);
 if(tabBtn){
  document.querySelectorAll(".settings-tab").forEach(b=>b.classList.toggle("active",b===tabBtn));
  document.querySelectorAll(".settings-tab-panel").forEach(p=>{p.hidden=(p.dataset.settingsPanel!==tabName)});
  if(tabName==="protected"){renderPermissionSettings();}
 }
 if(sectionName){
  setTimeout(()=>{
   const section=document.querySelector(`[data-section="${sectionName}"]`);
   if(section){
    section.classList.add("open");
    section.scrollIntoView({behavior:"smooth",block:"start"});
   }
  },50);
 }
}
$("closeSettings").onclick=()=>{
 $("settingsModal").hidden=true;
 if(settingsReturnToMeasurement){
  settingsReturnToMeasurement=false;
  applyEinlaufblechSettings();
  if($("measType").value==="einlaufblech_gerade")renderEbPiecesTable();
  $("measurementEditModal").hidden=false;
 }else{
  renderMain();
 }
};
document.addEventListener("click",e=>{
 const h=e.target.closest("[data-toggle-section]");
 if(h){h.closest(".settings-section").classList.toggle("open");}
});
// Bei Klick/Fokus in ein Eingabefeld den gesamten Inhalt markieren (ausser Checkbox/Radio/Datei)
document.addEventListener("focus",e=>{
 const t=e.target;
 if(t.tagName==="INPUT"&&!["checkbox","radio","file","button","submit"].includes(t.type)){
  t.select();
 }else if(t.tagName==="TEXTAREA"){
  t.select();
 }
},true);
// Sucht-Dropdowns schliessen, wenn ausserhalb geklickt wird
document.addEventListener("click",e=>{
 if(e.target.closest(".search"))return;
 document.querySelectorAll(".suggest").forEach(box=>{if(box.innerHTML.trim())box.innerHTML="";});
});
$("settingsModal").addEventListener("click",e=>{
 const tab=e.target.closest("[data-settings-tab]");
 if(tab){
  document.querySelectorAll(".settings-tab").forEach(b=>b.classList.toggle("active",b===tab));
  document.querySelectorAll(".settings-tab-panel").forEach(p=>{p.hidden=(p.dataset.settingsPanel!==tab.dataset.settingsTab)});
  if(tab.dataset.settingsTab==="protected"){renderPermissionSettings();}
  if(tab.dataset.settingsTab==="feedback")renderFeedbackList();
 }
});
$("logoInput").addEventListener("change",async e=>{
 const file=e.target.files[0];
 if(!file)return;
 try{
  logoDataUrl=await resizeImageFile(file,400,0.9,"png");
  $("logoPreview").src=logoDataUrl;
  $("logoPreview").hidden=false;
  $("logoRemove").hidden=false;
 }catch(err){alert("Logo konnte nicht geladen werden: "+err.message)}
});
$("logoRemove").onclick=()=>{
 logoDataUrl=null;logoUrl="";
 $("logoPreview").hidden=true;$("logoPreview").src="";
 $("logoInput").value="";
 $("logoRemove").hidden=true;
};
$("saveCompanyName").onclick=async()=>{
 const name=$("companyNameInput").value.trim();
 if(!name){alert("Bitte einen Firmennamen eingeben.");return}
 $("saveCompanyName").disabled=true;
 try{
  let newLogoUrl=logoUrl;
  if(logoDataUrl)newLogoUrl=await uploadMeasurementImage(logoDataUrl,"company-logo");
  const {error}=await sb.from("app_settings").update({
   company_name:name,
   company_address:$("companyAddressInput").value,
   default_vat:$("defaultVatInput").value.trim()||"8.1 %",
   logo_url:newLogoUrl,
   updated_at:new Date().toISOString()
  }).eq("id",1);
  if(error)throw error;
  companyName=name;
  companyAddress=$("companyAddressInput").value;
  defaultVat=$("defaultVatInput").value.trim()||"8.1 %";
  logoUrl=newLogoUrl;
  logoDataUrl=null;
  applyCompanyName();
  alert("Gespeichert.");
 }catch(err){
  alert("Fehler: "+(err.message||err));
 }
 $("saveCompanyName").disabled=false;
};
$("saveRecentCount").onclick=async()=>{
 const n=Number($("recentCountInput").value);
 if(!n||n<1||n>20){alert("Bitte eine Zahl zwischen 1 und 20 eingeben.");return}
 localStorage.setItem("sd_recentCount",String(n));
 recentCount=n;
 const dark=$("darkModeInput").value==="ja";
 localStorage.setItem("sd_darkMode",dark?"ja":"nein");
 darkMode=dark;
 document.documentElement.classList.toggle("dark",darkMode);
 defaultRate=$("defaultRateInput").value;
 localStorage.setItem("sd_defaultRate",defaultRate);
 photoQuality=$("photoQualityInput").value;
 localStorage.setItem("sd_photoQuality",photoQuality);
 if(!$("measurementsModal").hidden)await renderMeasurementsOverview();
 if(!$("ausmassModal").hidden)await renderAusmassOverview();
 alert("Gespeichert (gilt nur für dieses Gerät).");
};
$("saveEinlaufblechSettings").onclick=()=>{
 const stossLaenge=Number($("eb_stossLaenge").value);
 const ueberlappung=Number($("eb_ueberlappung").value);
 const gehrungszugabe=Number($("eb_gehrungszugabe").value)||0;
 const umschlagOben=Number($("eb_umschlagOben").value)||0;
 const umschlagUnten=Number($("eb_umschlagUnten").value)||0;
 const restSchwelle=Number($("eb_restSchwelle").value)||0;
 const endZugabe=Number($("eb_endzugabe").value)||0;
 if(!stossLaenge||stossLaenge<=0){alert("Bitte eine gültige Länge Stoss bis Stoss eingeben.");return}
 if(ueberlappung<0){alert("Überlappung darf nicht negativ sein.");return}
 if(gehrungszugabe<0){alert("Gehrungszugabe darf nicht negativ sein.");return}
 if(umschlagOben<0||umschlagUnten<0){alert("Umschlagbreiten dürfen nicht negativ sein.");return}
 if(restSchwelle<0){alert("Restschwelle darf nicht negativ sein.");return}
 if(endZugabe<0){alert("Endzugabe darf nicht negativ sein.");return}
 einlaufblechSettings={stoss_laenge:stossLaenge,ueberlappung,gehrungszugabe,umschlag_oben:umschlagOben,umschlag_unten:umschlagUnten,rest_schwelle:restSchwelle,end_zugabe:endZugabe};
 localStorage.setItem("sd_einlaufblechSettings",JSON.stringify(einlaufblechSettings));
 alert("Gespeichert (gilt nur für dieses Gerät).");
};
$("saveEbkSettings").onclick=()=>{
 const stossLaenge=Number($("ebks_stossLaenge").value);
 const ueberlappung=Number($("ebks_ueberlappung").value);
 const gehrungszugabe=Number($("ebks_gehrungszugabe").value)||0;
 const umschlagOben=Number($("ebks_umschlagOben").value)||0;
 const umschlagUnten=Number($("ebks_umschlagUnten").value)||0;
 const restSchwelle=Number($("ebks_restSchwelle").value)||0;
 const endZugabe=Number($("ebks_endzugabe").value)||0;
 if(!stossLaenge||stossLaenge<=0){alert("Bitte eine gültige Länge Stoss bis Stoss eingeben.");return}
 if(ueberlappung<0){alert("Überlappung darf nicht negativ sein.");return}
 if(gehrungszugabe<0){alert("Gehrungszugabe darf nicht negativ sein.");return}
 if(umschlagOben<0||umschlagUnten<0){alert("Umschlagbreiten dürfen nicht negativ sein.");return}
 if(restSchwelle<0){alert("Restschwelle darf nicht negativ sein.");return}
 if(endZugabe<0){alert("Endzugabe darf nicht negativ sein.");return}
 einlaufblechKonischSettings={stoss_laenge:stossLaenge,ueberlappung,gehrungszugabe,umschlag_oben:umschlagOben,umschlag_unten:umschlagUnten,rest_schwelle:restSchwelle,end_zugabe:endZugabe};
 localStorage.setItem("sd_einlaufblechKonischSettings",JSON.stringify(einlaufblechKonischSettings));
 alert("Gespeichert (gilt nur für dieses Gerät).");
};

let materialPage=0, materialFilter="", materialExpanded=new Set();
const MATERIAL_PAGE_SIZE=20;
function renderMaterialSettings(){
 const q=materialFilter.trim().toLowerCase();
 const filtered=settings.materials.map((m,i)=>({m,i})).filter(o=>!q||String(o.m[0]).toLowerCase().includes(q)||String(o.m[1]).toLowerCase().includes(q));
 const pages=Math.max(1,Math.ceil(filtered.length/MATERIAL_PAGE_SIZE));
 if(materialPage>=pages)materialPage=pages-1;
 const start=materialPage*MATERIAL_PAGE_SIZE, rows=filtered.slice(start,start+MATERIAL_PAGE_SIZE);
 const ro=canEdit("rates")?"":"disabled";
 $("materialCount").textContent=`${filtered.length} Positionen · Seite ${materialPage+1} / ${pages}`;
 $("materialSettings").innerHTML=rows.map(o=>{const m=o.m,i=o.i,open=materialExpanded.has(i);return `<div class="settingrow-mat${open?" open":""}">
<div class="mat-row-head" data-toggle-mat="${i}">
<input data-set-mno="${i}" value="${esc(m[0])}" placeholder="EDV-Nr." class="mat-nr" ${ro}>
<input data-set-mname="${i}" value="${esc(m[1])}" placeholder="Material" class="mat-name" ${ro}>
<span class="mat-chevron">›</span>
</div>
<div class="mat-row-body">
<div><label>Dim.</label><input data-set-mdim="${i}" value="${esc(m[2])}" placeholder="Dim." ${ro}></div>
<div><label>Einheit</label><input data-set-munit="${i}" value="${esc(m[3])}" placeholder="Einheit" ${ro}></div>
<div><label>Preis</label><input data-set-mprice="${i}" type="number" step=".01" value="${m[4]}" placeholder="Preis" ${ro}></div>
${canEdit("materials")?`<button class="red" data-del-material="${i}">Löschen</button>`:""}
</div>
</div>`}).join("")||'<div class="empty">Keine Materialien gefunden.</div>';
 $("newMaterial").hidden=!canEdit("materials");
 $("materialPrev").disabled=materialPage===0;
 $("materialNext").disabled=materialPage>=pages-1;
}
const debouncedRateUpdate=debounce((id,patch)=>sb.from("rates").update(patch).eq("id",id),500);
const debouncedMaterialUpdate=debounce((id,patch)=>sb.from("materials").update(patch).eq("id",id),500);
const debouncedProfileUpdate=debounce((id,patch)=>sb.from("profiles").update(patch).eq("id",id),500);
const debouncedBzMaterialUpdate=debounce((id,patch)=>sb.from("blitzschutz_materials").update(patch).eq("id",id),500);

// ---- Blitzschutz-Materialkatalog (Einstellungen) ----------------
let bzMaterialPage=0, bzMaterialFilter="", bzMaterialExpanded=new Set();
const BZ_MATERIAL_PAGE_SIZE=20;
function renderBzMaterialSettings(){
 const q=bzMaterialFilter.trim().toLowerCase();
 const filtered=blitzschutzMaterials.map((m,i)=>({m,i})).filter(o=>!q||String(o.m.artikel_nr||"").toLowerCase().includes(q)||String(o.m.bezeichnung||"").toLowerCase().includes(q));
 const pages=Math.max(1,Math.ceil(filtered.length/BZ_MATERIAL_PAGE_SIZE));
 if(bzMaterialPage>=pages)bzMaterialPage=pages-1;
 const start=bzMaterialPage*BZ_MATERIAL_PAGE_SIZE, rows=filtered.slice(start,start+BZ_MATERIAL_PAGE_SIZE);
 $("bzMaterialCount").textContent=`${filtered.length} Positionen · Seite ${bzMaterialPage+1} / ${pages}`;
 $("bzMaterialSettings").innerHTML=rows.map(o=>{const m=o.m,i=o.i,open=bzMaterialExpanded.has(i);return `<div class="settingrow-mat${open?" open":""}">
<div class="mat-row-head" data-toggle-bz-mat="${i}">
<input data-set-bz-artikel="${i}" value="${esc(m.artikel_nr||"")}" placeholder="Artikel-Nr." class="mat-nr">
<input data-set-bz-bezeichnung="${i}" value="${esc(m.bezeichnung||"")}" placeholder="Bezeichnung" class="mat-name">
<span class="mat-chevron">›</span>
</div>
<div class="mat-row-body">
<div><label>Material</label><input data-set-bz-material="${i}" value="${esc(m.material||"")}" placeholder="z.B. Cu, Inox A2"></div>
<div><label>Einheit</label><input data-set-bz-einheit="${i}" value="${esc(m.einheit||"")}" placeholder="Einheit"></div>
<button class="red" data-del-bz-mat="${i}">Löschen</button>
</div>
</div>`}).join("")||'<div class="empty">Keine Materialien gefunden.</div>';
 $("bzMaterialPrev").disabled=bzMaterialPage===0;
 $("bzMaterialNext").disabled=bzMaterialPage>=pages-1;
}
$("bzMaterialSearch").addEventListener("input",e=>{bzMaterialFilter=e.target.value;bzMaterialPage=0;renderBzMaterialSettings()});
$("bzMaterialPrev").onclick=()=>{if(bzMaterialPage>0){bzMaterialPage--;renderBzMaterialSettings()}};
$("bzMaterialNext").onclick=()=>{bzMaterialPage++;renderBzMaterialSettings()};
$("newBzMaterial").onclick=async()=>{
 const {error}=await sb.from("blitzschutz_materials").insert({artikel_nr:"",bezeichnung:"Neues Material",einheit:"Stk"});
 if(error){alert("Fehler: "+error.message);return}
 const {data}=await sb.from("blitzschutz_materials").select("*").order("bezeichnung");
 blitzschutzMaterials=data||[];
 bzMaterialExpanded.add(blitzschutzMaterials.length-1);
 bzMaterialPage=Math.floor((blitzschutzMaterials.length-1)/BZ_MATERIAL_PAGE_SIZE);
 renderBzMaterialSettings();
};
$("bzMaterialSettings").addEventListener("click",e=>{
 const del=e.target.closest("[data-del-bz-mat]");
 if(del){
  if(!confirm("Dieses Material wirklich löschen?"))return;
  const i=Number(del.dataset.delBzMat);
  sb.from("blitzschutz_materials").delete().eq("id",blitzschutzMaterials[i].id).then(async({error})=>{
   if(error){alert("Fehler: "+error.message);return}
   const {data}=await sb.from("blitzschutz_materials").select("*").order("bezeichnung");
   blitzschutzMaterials=data||[];
   renderBzMaterialSettings();
  });
  return;
 }
 const head=e.target.closest("[data-toggle-bz-mat]");
 if(head&&e.target.tagName!=="INPUT"){
  const i=Number(head.dataset.toggleBzMat);
  bzMaterialExpanded.has(i)?bzMaterialExpanded.delete(i):bzMaterialExpanded.add(i);
  renderBzMaterialSettings();
 }
});
$("bzMaterialSettings").addEventListener("input",e=>{
 const i=Number(e.target.dataset.setBzArtikel??e.target.dataset.setBzBezeichnung??e.target.dataset.setBzMaterial??e.target.dataset.setBzEinheit);
 if(Number.isNaN(i)||!blitzschutzMaterials[i])return;
 const id=blitzschutzMaterials[i].id;
 if(e.target.dataset.setBzArtikel!==undefined){blitzschutzMaterials[i].artikel_nr=e.target.value;debouncedBzMaterialUpdate(id,{artikel_nr:e.target.value,updated_at:new Date().toISOString()})}
 else if(e.target.dataset.setBzBezeichnung!==undefined){blitzschutzMaterials[i].bezeichnung=e.target.value;debouncedBzMaterialUpdate(id,{bezeichnung:e.target.value,updated_at:new Date().toISOString()})}
 else if(e.target.dataset.setBzMaterial!==undefined){blitzschutzMaterials[i].material=e.target.value;debouncedBzMaterialUpdate(id,{material:e.target.value,updated_at:new Date().toISOString()})}
 else if(e.target.dataset.setBzEinheit!==undefined){blitzschutzMaterials[i].einheit=e.target.value;debouncedBzMaterialUpdate(id,{einheit:e.target.value,updated_at:new Date().toISOString()})}
});
function searchBlitzschutzMaterials(q){
 q=(q||"").trim().toLowerCase();
 return (!q?blitzschutzMaterials:blitzschutzMaterials.filter(m=>String(m.artikel_nr||"").toLowerCase().includes(q)||String(m.bezeichnung||"").toLowerCase().includes(q))).slice(0,15);
}

// ---- Rinne Halbrund: Anschlusstypen-Katalog (Einstellungen) -----
const debouncedRinneFittingUpdate=debounce((id,patch)=>sb.from("rinne_fitting_types").update(patch).eq("id",id),500);
function renderRinneFittingSettings(){
 $("rinneFittingSettings").innerHTML=rinneFittingTypes.map((f,i)=>`<div class="settingrow">
<input data-set-rinne-symbol="${i}" value="${esc(f.symbol||"")}" placeholder="Symbol" style="max-width:70px">
<input data-set-rinne-name="${i}" value="${esc(f.name||"")}" placeholder="Bezeichnung">
<input data-set-rinne-mass="${i}" type="number" step="1" value="${f.mass_mm||0}" placeholder="Mass mm" style="max-width:90px">
<input data-set-rinne-angle="${i}" type="number" step="1" value="${f.angle_deg||0}" placeholder="Winkel °" style="max-width:90px">
<label class="small" style="display:flex;align-items:center;gap:4px;white-space:nowrap"><input data-set-rinne-fixpunkt="${i}" type="checkbox" ${f.is_fixpunkt?"checked":""}> Fixpunkt?</label>
<label class="small" style="display:flex;align-items:center;gap:4px;white-space:nowrap"><input data-set-rinne-schiebestutzen="${i}" type="checkbox" ${f.is_schiebestutzen?"checked":""}> Schiebestutzen?</label>
<button class="red" data-del-rinne-fitting="${i}">Löschen</button>
</div>`).join("")||'<div class="empty">Noch keine Anschlusstypen.</div>';
}
$("newRinneFitting").onclick=async()=>{
 const {error}=await sb.from("rinne_fitting_types").insert({name:"Neuer Typ",mass_mm:0,symbol:"",angle_deg:0,is_fixpunkt:false,is_schiebestutzen:false});
 if(error){alert("Fehler: "+error.message);return}
 const {data}=await sb.from("rinne_fitting_types").select("*").order("name");
 rinneFittingTypes=data||[];
 renderRinneFittingSettings();
};
$("rinneFittingSettings").addEventListener("click",e=>{
 const del=e.target.closest("[data-del-rinne-fitting]");
 if(!del)return;
 if(!confirm("Diesen Anschlusstyp wirklich löschen?"))return;
 const i=Number(del.dataset.delRinneFitting);
 sb.from("rinne_fitting_types").delete().eq("id",rinneFittingTypes[i].id).then(async({error})=>{
  if(error){alert("Fehler: "+error.message);return}
  const {data}=await sb.from("rinne_fitting_types").select("*").order("name");
  rinneFittingTypes=data||[];
  renderRinneFittingSettings();
 });
});
$("rinneFittingSettings").addEventListener("input",e=>{
 const i=Number(e.target.dataset.setRinneSymbol??e.target.dataset.setRinneName??e.target.dataset.setRinneMass??e.target.dataset.setRinneAngle);
 if(Number.isNaN(i)||!rinneFittingTypes[i])return;
 const id=rinneFittingTypes[i].id;
 if(e.target.dataset.setRinneSymbol!==undefined){rinneFittingTypes[i].symbol=e.target.value;debouncedRinneFittingUpdate(id,{symbol:e.target.value,updated_at:new Date().toISOString()})}
 else if(e.target.dataset.setRinneName!==undefined){rinneFittingTypes[i].name=e.target.value;debouncedRinneFittingUpdate(id,{name:e.target.value,updated_at:new Date().toISOString()})}
 else if(e.target.dataset.setRinneMass!==undefined){rinneFittingTypes[i].mass_mm=Number(e.target.value)||0;debouncedRinneFittingUpdate(id,{mass_mm:Number(e.target.value)||0,updated_at:new Date().toISOString()})}
 else if(e.target.dataset.setRinneAngle!==undefined){rinneFittingTypes[i].angle_deg=Number(e.target.value)||0;debouncedRinneFittingUpdate(id,{angle_deg:Number(e.target.value)||0,updated_at:new Date().toISOString()})}
});
$("rinneFittingSettings").addEventListener("change",e=>{
 const i=Number(e.target.dataset.setRinneFixpunkt??e.target.dataset.setRinneSchiebestutzen);
 if(Number.isNaN(i)||!rinneFittingTypes[i])return;
 const id=rinneFittingTypes[i].id;
 if(e.target.dataset.setRinneFixpunkt!==undefined){
  rinneFittingTypes[i].is_fixpunkt=e.target.checked;
  debouncedRinneFittingUpdate(id,{is_fixpunkt:e.target.checked,updated_at:new Date().toISOString()});
 }else if(e.target.dataset.setRinneSchiebestutzen!==undefined){
  rinneFittingTypes[i].is_schiebestutzen=e.target.checked;
  debouncedRinneFittingUpdate(id,{is_schiebestutzen:e.target.checked,updated_at:new Date().toISOString()});
 }
});
$("saveRinneFittings").onclick=async()=>{
 $("saveRinneFittings").disabled=true;
 try{
  const results=await Promise.all(rinneFittingTypes.map(f=>sb.from("rinne_fitting_types").update({
   symbol:f.symbol,name:f.name,mass_mm:Number(f.mass_mm)||0,angle_deg:Number(f.angle_deg)||0,is_fixpunkt:!!f.is_fixpunkt,is_schiebestutzen:!!f.is_schiebestutzen,updated_at:new Date().toISOString()
  }).eq("id",f.id)));
  const err=results.find(r=>r.error);
  if(err)throw err.error;
  alert("Gespeichert.");
 }catch(err){
  alert("Fehler beim Speichern: "+(err.message||err));
 }
 $("saveRinneFittings").disabled=false;
};

async function registerEmployee(vor,nach){
 vor=(vor||"").trim();nach=(nach||"").trim();
 if(!vor||!nach)return false;
 const code=prompt("Firmen-Code?");
 if(!code)return false;
 const {data,error}=await sb.functions.invoke("smart-action",{body:{first_name:vor,last_name:nach,company_code:code}});
 if(error||!data?.ok){alert("Fehler: "+(error?.message||data?.error||"Mitarbeiter konnte nicht angelegt werden."));return false}
 alert("Konto erstellt.\n\nBenutzername: "+data.username+"\nPasswort: "+data.password+"\n\nBitte notieren.");
 return true;
}

const PERMISSION_RESOURCES=[["projects","Projekte"],["reports","Regierapporte"],["measurements","Massaufnahmen"],["ausmass","Ausmass"],["materials","Material (Regierapport)"],["rates","Funktionen / Stundenansätze"],["blitzschutz_materials","Blitzschutz-Material"],["rinne_fitting_types","Rinnen-Fittings"],["einlaufblech_settings","Einlaufblech-Einstellungen"],["feedback","Feedback"],["profiles","Mitarbeiterprofile"],["company_settings","Firmeneinstellungen"]];
async function renderPermissionSettings(){
 const box=$("permissionSettings");if(!box)return;
 if(!isAdmin()){ $("permissionSettingsSection").hidden=true;$("settingsRoleInfo").textContent="Du bist als Mitarbeiter angemeldet. Deine Zugriffsrechte werden von der Geschäftsleitung festgelegt.";return;}
 $("permissionSettingsSection").hidden=false;$("settingsRoleInfo").textContent="Du bist Administrator. Du hast immer Vollzugriff auf alle Bereiche.";
 const {data,error}=await sb.from("permission_settings").select("resource,can_view,can_edit").eq("role","employee").order("resource");
 if(error){box.innerHTML=`<div class="small" style="color:var(--red)">Fehler beim Laden: ${esc(error.message)}</div>`;return;}
 const map=Object.fromEntries((data||[]).map(x=>[x.resource,x]));
 box.innerHTML=`<div class="settingrow" style="font-weight:700;grid-template-columns:1fr 90px 100px"><span>Bereich</span><span>👁️ Sehen</span><span>✏️ Bearbeiten</span></div>`+PERMISSION_RESOURCES.map(([key,label])=>{const x=map[key]||{can_view:false,can_edit:false};return `<div class="settingrow" style="grid-template-columns:1fr 90px 100px"><span>${esc(label)}</span><label style="text-align:center"><input type="checkbox" data-perm-view="${key}" ${x.can_view?'checked':''}></label><label style="text-align:center"><input type="checkbox" data-perm-edit="${key}" ${x.can_edit?'checked':''}></label></div>`}).join("");
 box.querySelectorAll("[data-perm-edit]").forEach(cb=>cb.addEventListener("change",()=>{if(cb.checked){const v=box.querySelector(`[data-perm-view="${cb.dataset.permEdit}"]`);if(v)v.checked=true;}}));
 box.querySelectorAll("[data-perm-view]").forEach(cb=>cb.addEventListener("change",()=>{if(!cb.checked){const e=box.querySelector(`[data-perm-edit="${cb.dataset.permView}"]`);if(e)e.checked=false;}}));
}
$("savePermissions")?.addEventListener("click",async()=>{
 if(!isAdmin())return;const box=$("permissionSettings");if(!box)return;const rows=PERMISSION_RESOURCES.map(([resource])=>({role:"employee",resource,can_view:!!box.querySelector(`[data-perm-view="${resource}"]`)?.checked,can_edit:!!box.querySelector(`[data-perm-edit="${resource}"]`)?.checked}));const btn=$("savePermissions");btn.disabled=true;
 try{for(const row of rows){const {error}=await sb.from("permission_settings").upsert(row,{onConflict:"role,resource"});if(error)throw error;}await loadMyPermissions();alert("Berechtigungen gespeichert.");renderSettings();renderPermissionSettings();}catch(err){alert("Fehler beim Speichern: "+(err.message||err));}finally{btn.disabled=false;}
});


function applySettingsPermissions(){
 const rules=[["company","company_settings"],["employees","profiles"],["rates","rates"],["materials","materials"],["blitzschutz","blitzschutz_materials"],["rinne","rinne_fitting_types"],["einlaufblech","einlaufblech_settings"]];
 rules.forEach(([section,resource])=>{const el=document.querySelector(`[data-section="${section}"]`);if(el)el.hidden=!canView(resource);});
 const companyCanEdit=canEdit("company_settings");
 ["companyNameInput","companyAddressInput","defaultVatInput","logoInput","logoRemove","saveCompanyName"].forEach(id=>{const el=$(id);if(el)el.disabled=!companyCanEdit;});
 const employeeCanEdit=canEdit("profiles");
 const newEmp=$("newEmployee");if(newEmp)newEmp.hidden=!employeeCanEdit;
 document.querySelectorAll("#employeeSettings input, #employeeSettings button").forEach(el=>el.disabled=!employeeCanEdit);
 const savePerm=$("savePermissions");if(savePerm)savePerm.hidden=!isAdmin();
 const controlMap=[["saveEinlaufblechSettings","einlaufblech_settings"],["saveEbkSettings","einlaufblech_settings"],["saveRinneFittings","rinne_fitting_types"],["newRinneFitting","rinne_fitting_types"],["newBzMaterial","blitzschutz_materials"]];
 controlMap.forEach(([id,res])=>{const el=$(id);if(el)el.disabled=!canEdit(res);});
 document.querySelectorAll("#bzMaterialSettings input, #bzMaterialSettings button, #rinneFittingSettings input, #rinneFittingSettings button").forEach(el=>{const res=el.closest("#bzMaterialSettings")?"blitzschutz_materials":"rinne_fitting_types";el.disabled=!canEdit(res);});
}

function renderSettings(){
 $("feedbackTabBtn").hidden=!isAdmin();
 renderPermissionSettings();
 $("employeeSettings").innerHTML=settings.employees.map((e,i)=>`<div class="settingrow emp-row"><input data-set-emp="${i}" value="${esc(e)}"><button class="red" data-del-emp="${i}">Löschen</button></div>`).join("")||'<div class="empty">Noch keine Mitarbeiter.</div>';
 const ro=canEdit("rates")?"":"disabled";
 $("rateSettings").innerHTML=settings.rates.map((r,i)=>`<div class="settingrow"><input data-set-rate-name="${i}" value="${esc(r[0])}" ${ro}><input data-set-rate-value="${i}" type="number" step=".01" value="${r[1]}" ${ro}>${canEdit("rates")?`<button class="red" data-del-rate="${i}">Löschen</button>`:'<span></span>'}</div>`).join("");
 $("newRate").hidden=!canEdit("rates");
 renderMaterialSettings();
 renderBzMaterialSettings();
 renderRinneFittingSettings();
 $("darkModeInput").value=darkMode?"ja":"nein";
 $("photoQualityInput").value=photoQuality;
 $("defaultRateInput").innerHTML='<option value="">Kein Standard</option>'+settings.rates.map(r=>`<option value="${esc(r[0])}"${r[0]===defaultRate?" selected":""}>${esc(r[0])}</option>`).join("");
 applySettingsPermissions();
}

$("materialSettingsSearch").addEventListener("input",e=>{materialFilter=e.target.value;materialPage=0;renderMaterialSettings()});
$("materialPrev").onclick=()=>{if(materialPage>0){materialPage--;renderMaterialSettings()}};
$("materialNext").onclick=()=>{materialPage++;renderMaterialSettings()};
$("newEmployee").onclick=async()=>{
 const vor=prompt("Vorname des neuen Mitarbeiters?");if(!vor)return;
 const nach=prompt("Nachname des neuen Mitarbeiters?");if(!nach)return;
 if(await registerEmployee(vor,nach)){await loadAllData();renderSettings();renderMain()}
};
$("newRate").onclick=async()=>{
 const {error}=await sb.from("rates").insert({name:"Neue Funktion",value:0});
 if(error){alert("Fehler: "+error.message);return}
 await loadAllData();renderSettings();
};
$("newMaterial").onclick=async()=>{
 const {error}=await sb.from("materials").insert({edv_nr:"Neue Nr.",name:"Neues Material",dim:"",unit:"Stk.",price:0});
 if(error){alert("Fehler: "+error.message);return}
 await loadAllData();
 materialFilter="";$("materialSettingsSearch").value="";
 materialExpanded.add(settings.materials.length-1);
 materialPage=Math.floor((settings.materials.length-1)/MATERIAL_PAGE_SIZE);
 renderSettings();
};
$("employeeSettings").addEventListener("input",e=>{
 const i=e.target.dataset.setEmp;if(i===undefined)return;
 settings.employees[i]=e.target.value;
 const parts=e.target.value.trim().split(/\s+/);
 debouncedProfileUpdate(employeeIds[i],{first_name:parts[0]||"",last_name:parts.slice(1).join(" ")||""});
});
$("rateSettings").addEventListener("input",e=>{
 const i=e.target.dataset.setRateName??e.target.dataset.setRateValue;if(i===undefined)return;
 if(e.target.dataset.setRateName!==undefined){settings.rates[i][0]=e.target.value;debouncedRateUpdate(rateIds[i],{name:e.target.value})}
 else{settings.rates[i][1]=Number(e.target.value)||0;debouncedRateUpdate(rateIds[i],{value:Number(e.target.value)||0})}
});
$("materialSettings").addEventListener("input",e=>{
 const i=e.target.dataset.setMno??e.target.dataset.setMname??e.target.dataset.setMdim??e.target.dataset.setMunit??e.target.dataset.setMprice;if(i===undefined)return;
 const id=materialIds[i];
 if(e.target.dataset.setMno!==undefined){settings.materials[i][0]=e.target.value;debouncedMaterialUpdate(id,{edv_nr:e.target.value})}
 if(e.target.dataset.setMname!==undefined){settings.materials[i][1]=e.target.value;debouncedMaterialUpdate(id,{name:e.target.value})}
 if(e.target.dataset.setMdim!==undefined){settings.materials[i][2]=e.target.value;debouncedMaterialUpdate(id,{dim:e.target.value})}
 if(e.target.dataset.setMunit!==undefined){settings.materials[i][3]=e.target.value;debouncedMaterialUpdate(id,{unit:e.target.value})}
 if(e.target.dataset.setMprice!==undefined){settings.materials[i][4]=Number(e.target.value)||0;debouncedMaterialUpdate(id,{price:Number(e.target.value)||0})}
 updateTotals();
});
$("employeeSettings").addEventListener("click",async e=>{
 const b=e.target.closest("[data-del-emp]");if(!b)return;
 if(!confirm("Mitarbeiter aus der Liste entfernen?\n\nHinweis: Das Login-Konto selbst kann aus Sicherheitsgründen nur ein Administrator im Supabase-Dashboard vollständig löschen."))return;
 await sb.from("profiles").delete().eq("id",employeeIds[Number(b.dataset.delEmp)]);
 await loadAllData();renderSettings();
});
$("rateSettings").addEventListener("click",async e=>{
 const b=e.target.closest("[data-del-rate]");if(!b)return;
 if(!confirm("Diese Funktion/Stundenansatz wirklich löschen?"))return;
 await sb.from("rates").delete().eq("id",rateIds[Number(b.dataset.delRate)]);
 await loadAllData();renderSettings();
});
$("materialSettings").addEventListener("click",async e=>{
 const del=e.target.closest("[data-del-material]");
 if(del){
  if(!confirm("Dieses Material wirklich löschen?"))return;
  await sb.from("materials").delete().eq("id",materialIds[Number(del.dataset.delMaterial)]);
  await loadAllData();renderSettings();renderMain();return;
 }
 const head=e.target.closest("[data-toggle-mat]");
 if(head&&e.target.tagName!=="INPUT"){
  const i=Number(head.dataset.toggleMat);
  materialExpanded.has(i)?materialExpanded.delete(i):materialExpanded.add(i);
  renderMaterialSettings();
 }
});


// Blechverbrauch
$("openSheet").onclick=()=>{selectedSheet=null;cuts=[{l:"",b:"",q:1}];$("sheetSearch").value="";$("sheetMaterial").value="";renderCuts();$("sheetModal").hidden=false};
$("closeSheet").onclick=()=>{$("sheetModal").hidden=true};
$("addCut").onclick=()=>{cuts.push({l:"",b:"",q:1});renderCuts()};
$("sheetSearch").addEventListener("input",e=>{
 const box=$("sheetResults");
 box.innerHTML=searchMaterials(e.target.value).map(x=>`<div class="item" data-pick-sheet="${esc(x[0])}"><b>${esc(x[0])} · ${esc(x[1])}</b><span>${esc(x[2])} · ${esc(x[3])} · CHF ${money(x[4])}</span></div>`).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});
$("sheetResults").addEventListener("click",e=>{
 const p=e.target.closest("[data-pick-sheet]");if(!p)return;
 selectedSheet=materialFor(p.dataset.pickSheet);$("sheetSearch").value=selectedSheet[0]+" · "+selectedSheet[1];$("sheetMaterial").value=selectedSheet[1]+" · "+selectedSheet[2]+" · "+selectedSheet[3]+" · CHF "+money(selectedSheet[4]);$("sheetResults").innerHTML="";
});
