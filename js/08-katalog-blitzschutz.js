"use strict";
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

// ---- Materialkataloge aus Excel importieren -----------------------
// Liest die erste Tabelle einer hochgeladenen Excel-/CSV-Datei ein und
// zeigt sie vor dem Speichern zur Kontrolle an – so lässt sich das
// bisherige Abtippen nach Foto durch einen echten Import ersetzen,
// ohne dass unbemerkt falsche Spalten landen. Ergänzt die bestehende
// Liste nur, löscht oder überschreibt nichts.
async function excelZeilenLesen(file){
 const buf=await file.arrayBuffer();
 const wb=XLSX.read(buf,{type:"array"});
 const blatt=wb.Sheets[wb.SheetNames[0]];
 return XLSX.utils.sheet_to_json(blatt,{header:1,defval:"",raw:false});
}
function excelZahlLesen(wert){
 return Number(String(wert??"").replace(/['\s]/g,"").replace(",","."))||0;
}
function initExcelImport(cfg){
 // cfg: {inputId,buttonId,previewId,headerCheckId,countId,tableId,
 //       confirmId,cancelId,tableName,felder:[{key,label,zahl}],nachImport}
 const input=$(cfg.inputId),btn=$(cfg.buttonId);
 if(!input||!btn)return;
 let zeilen=[];
 btn.onclick=()=>input.click();
 input.addEventListener("change",async()=>{
  const file=input.files[0];
  if(!file)return;
  try{ zeilen=await excelZeilenLesen(file); }
  catch(err){ alert("Die Datei konnte nicht gelesen werden: "+(err.message||err)); input.value=""; return; }
  $(cfg.previewId).hidden=false;
  zeichneVorschau();
 });
 function datenZeilen(){
  const mitKopf=$(cfg.headerCheckId).checked;
  return (mitKopf?zeilen.slice(1):zeilen).filter(z=>z.some(w=>String(w||"").trim()!==""));
 }
 function zeichneVorschau(){
  const daten=datenZeilen();
  $(cfg.countId).textContent=`${daten.length} Positionen erkannt (von ${zeilen.length} Zeilen in der Datei).`;
  const kopf="<tr>"+cfg.felder.map(f=>`<th>${esc(f.label)}</th>`).join("")+"</tr>";
  const rumpf=daten.slice(0,200).map(z=>"<tr>"+cfg.felder.map((f,i)=>`<td>${esc(String(z[i]??""))}</td>`).join("")+"</tr>").join("");
  $(cfg.tableId).innerHTML=kopf+rumpf;
 }
 $(cfg.headerCheckId).addEventListener("change",zeichneVorschau);
 $(cfg.cancelId).onclick=()=>{ zeilen=[]; input.value=""; $(cfg.previewId).hidden=true; };
 $(cfg.confirmId).onclick=async()=>{
  const daten=datenZeilen();
  if(!daten.length){ alert("Keine Zeilen zum Importieren gefunden."); return; }
  const eintraege=daten.map(z=>{
   const o={};
   cfg.felder.forEach((f,i)=>{ o[f.key]=f.zahl?excelZahlLesen(z[i]):String(z[i]??"").trim(); });
   return o;
  });
  $(cfg.confirmId).disabled=true;
  const {error}=await sb.from(cfg.tableName).insert(eintraege);
  $(cfg.confirmId).disabled=false;
  if(error){ alert("Fehler beim Import: "+error.message); return; }
  alert(`${eintraege.length} Positionen importiert.`);
  zeilen=[]; input.value=""; $(cfg.previewId).hidden=true;
  await cfg.nachImport();
 };
}
initExcelImport({
 inputId:"materialExcelInput",buttonId:"materialExcelBtn",previewId:"materialExcelPreview",
 headerCheckId:"materialExcelHeader",countId:"materialExcelCount",tableId:"materialExcelTable",
 confirmId:"materialExcelConfirm",cancelId:"materialExcelCancel",
 tableName:"materials",
 felder:[
  {key:"edv_nr",label:"EDV-Nr."},
  {key:"name",label:"Material"},
  {key:"dim",label:"Dim."},
  {key:"unit",label:"Einheit"},
  {key:"price",label:"Preis",zahl:true}
 ],
 nachImport:async()=>{ await loadAllData(); renderSettings(); }
});
initExcelImport({
 inputId:"bzMaterialExcelInput",buttonId:"bzMaterialExcelBtn",previewId:"bzMaterialExcelPreview",
 headerCheckId:"bzMaterialExcelHeader",countId:"bzMaterialExcelCount",tableId:"bzMaterialExcelTable",
 confirmId:"bzMaterialExcelConfirm",cancelId:"bzMaterialExcelCancel",
 tableName:"blitzschutz_materials",
 felder:[
  {key:"artikel_nr",label:"Artikel-Nr."},
  {key:"bezeichnung",label:"Bezeichnung"},
  {key:"material",label:"Material"},
  {key:"einheit",label:"Einheit"}
 ],
 nachImport:async()=>{
  const {data}=await sb.from("blitzschutz_materials").select("*").order("bezeichnung");
  blitzschutzMaterials=data||[];
  renderBzMaterialSettings();
 }
});

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

// ---- Material-Katalog für Massaufnahmen (Einstellungen) ----------
const debouncedMeasMaterialUpdate=debounce((id,patch)=>sb.from("measurement_materials").update(patch).eq("id",id),500);
function renderMeasMaterialSettings(){
 const box=$("measMaterialSettings");
 if(!box)return;
 box.innerHTML=measurementMaterials.map((m,i)=>`<div class="settingrow">
<input data-set-meas-material-name="${i}" value="${esc(m.name||"")}" placeholder="Bezeichnung">
<input data-set-meas-material-abstand="${i}" type="number" step="1" value="${m.max_abstand_mm??""}" placeholder="Abstand zwischen zwei (mm)">
<input data-set-meas-material-fixpunkt="${i}" type="number" step="1" value="${m.ab_fixpunkt_mm??""}" placeholder="Abstand ab Fixpunkt (mm)">
<button class="red" data-del-meas-material="${i}">Löschen</button>
</div>`).join("")||'<div class="empty">Noch kein Material vorhanden.</div>';
}
$("newMeasMaterial").onclick=async()=>{
 const {error}=await sb.from("measurement_materials").insert({name:"Neues Material"});
 if(error){alert("Fehler: "+error.message);return}
 const {data}=await sb.from("measurement_materials").select("*").order("name");
 measurementMaterials=data||[];
 renderMeasMaterialSettings();
 renderMeasMaterialOptions();
};
$("measMaterialSettings").addEventListener("click",e=>{
 const del=e.target.closest("[data-del-meas-material]");
 if(!del)return;
 if(!confirm("Dieses Material wirklich löschen?"))return;
 const i=Number(del.dataset.delMeasMaterial);
 sb.from("measurement_materials").delete().eq("id",measurementMaterials[i].id).then(async({error})=>{
  if(error){alert("Fehler: "+error.message);return}
  const {data}=await sb.from("measurement_materials").select("*").order("name");
  measurementMaterials=data||[];
  renderMeasMaterialSettings();
  renderMeasMaterialOptions();
 });
});
$("measMaterialSettings").addEventListener("input",e=>{
 const i=Number(e.target.dataset.setMeasMaterialName??e.target.dataset.setMeasMaterialAbstand??e.target.dataset.setMeasMaterialFixpunkt);
 if(Number.isNaN(i)||!measurementMaterials[i])return;
 const id=measurementMaterials[i].id;
 if(e.target.dataset.setMeasMaterialName!==undefined){
  measurementMaterials[i].name=e.target.value;
  debouncedMeasMaterialUpdate(id,{name:e.target.value,updated_at:new Date().toISOString()});
  renderMeasMaterialOptions();
 }else if(e.target.dataset.setMeasMaterialAbstand!==undefined){
  const v=e.target.value===""?null:Number(e.target.value)||0;
  measurementMaterials[i].max_abstand_mm=v;
  debouncedMeasMaterialUpdate(id,{max_abstand_mm:v,updated_at:new Date().toISOString()});
 }else if(e.target.dataset.setMeasMaterialFixpunkt!==undefined){
  const v=e.target.value===""?null:Number(e.target.value)||0;
  measurementMaterials[i].ab_fixpunkt_mm=v;
  debouncedMeasMaterialUpdate(id,{ab_fixpunkt_mm:v,updated_at:new Date().toISOString()});
 }
});

async function registerEmployee(vor,nach){
 vor=(vor||"").trim();nach=(nach||"").trim();
 if(!vor||!nach)return false;
 const {data,error}=await sb.functions.invoke("smart-action",{body:{first_name:vor,last_name:nach}});
 if(error){alert("Fehler: "+(await edgeFunctionErrorMessage(error,"Mitarbeiter konnte nicht angelegt werden.")));return false}
 if(!data?.ok){alert("Fehler: "+(data?.error||"Mitarbeiter konnte nicht angelegt werden."));return false}
 alert("Konto erstellt.\n\nBenutzername: "+data.username+"\nPasswort: "+data.password+"\n\nBitte notieren.");
 return true;
}

function renderSettings(){
 $("feedbackTabBtn").hidden=!isAdmin();
 $("protectedTabBtn").hidden=!isAdmin();
 const dilaFeld=$("rinneDilaMassInput");
 if(dilaFeld)dilaFeld.value=rinneDilaMass;
 if(typeof renderRinneNormSettings==="function")renderRinneNormSettings();
 const madBoden=$("madBodenMassInput"),madSchieber=$("madSchieberMassInput");
 if(madBoden)madBoden.value=madBodenMass;
 if(madSchieber)madSchieber.value=madSchieberMass;
 const lukA=$("lukAchsabstandInput"),lukH=$("lukHilfsrissInput"),lukB=$("lukZugabeBreiteInput"),lukL=$("lukZugabeLaengeInput");
 if(lukA)lukA.value=lukAchsabstand;
 if(lukH)lukH.value=lukHilfsriss;
 if(lukB)lukB.value=lukZugabeBreite;
 if(lukL)lukL.value=lukZugabeLaenge;
 renderMitarbeiterSettings();
 const ro=isAdmin()?"":"disabled";
 $("rateSettings").innerHTML=settings.rates.map((r,i)=>`<div class="settingrow"><input data-set-rate-name="${i}" value="${esc(r[0])}" ${ro}><input data-set-rate-value="${i}" type="number" step=".01" value="${r[1]}" ${ro}>${isAdmin()?`<button class="red" data-del-rate="${i}">Löschen</button>`:'<span></span>'}</div>`).join("");
 $("newRate").hidden=!isAdmin();
 renderMaterialSettings();
 renderBzMaterialSettings();
 renderRinneFittingSettings();
 renderMeasMaterialSettings();
 $("darkModeInput").value=darkMode?"ja":"nein";
 $("photoQualityInput").value=photoQuality;
 $("defaultRateInput").innerHTML='<option value="">Kein Standard</option>'+settings.rates.map(r=>`<option value="${esc(r[0])}"${r[0]===defaultRate?" selected":""}>${esc(r[0])}</option>`).join("");
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
 // UNIQUE(company_id,name) verhindert einen zweiten Eintrag mit demselben
 // Namen in derselben Firma – bei bereits vorhandener "Neue Funktion"
 // (z. B. noch nicht umbenannt) automatisch durchnummerieren statt mit
 // einem Datenbankfehler abzubrechen. company_id kommt weiterhin
 // ausschliesslich aus dem serverseitigen Spalten-Default (my_company_id()),
 // nicht aus einem Clientwert.
 let name="Neue Funktion",n=2;
 while(settings.rates.some(r=>r[0]===name)){name=`Neue Funktion ${n}`;n++}
 const {error}=await sb.from("rates").insert({name,value:0});
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
 const bar=$("reportFooterBar");
 if(!bar)return;
 const teile=[companyName];
 const info=erstelltGeaendertText(currentReportMeta);
 if(info)teile.push(info);
 teile.push("Gedruckt am "+new Date().toLocaleString("de-CH",{dateStyle:"medium",timeStyle:"short"}));
 bar.textContent=teile.join(" · ");
});
$("save").onclick=async()=>{
 // Offline (v2.70): klare Absage statt kryptischer Netzwerkmeldung.
 if(offlineSperrtSpeichern("Dieser Regierapport"))return;
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
 updateVerlaufToggleVisibility($("reportVerlaufToggle"),$("reportVerlaufBody"),currentReportId);
 isDirty=false;
 alert("Rapport gespeichert und dem Projekt zugeordnet.");
};
$("clear").onclick=()=>{if(confirm("Wirklich alle Rapportdaten löschen?")){works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];mats=[];currentReportId=null;updateVerlaufToggleVisibility($("reportVerlaufToggle"),$("reportVerlaufBody"),null);renderMain()}};
