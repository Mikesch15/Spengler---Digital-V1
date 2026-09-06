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
// Spaltenzuordnung: welche Spalte der Datei gehoert zu welchem Feld.
// Ohne sie musste die Datei die feste Reihenfolge der App haben - genau das
// verlangt CLAUDE.md 7 ausdruecklich nicht ("unterschiedliche Listenformate
// unterstuetzen", "Spalten zuordnen"). Erkannt wird ueber die Kopfzeile,
// aendern laesst es sich immer von Hand.
function importSpaltenName(i){
 // 0 -> A, 25 -> Z, 26 -> AA
 let n=i,s="";
 do{ s=String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26)-1; }while(n>=0);
 return s;
}
function importNormal(t){
 return String(t==null?"":t).toLowerCase()
  .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
  .replace(/[^a-z0-9]/g,"");
}
// Ordnet anhand der Kopfzeile zu. Trifft nichts, bleibt das Feld leer -
// es wird nichts geraten.
function importAutoZuordnen(felder,kopf){
 const zu={};
 const belegt={};
 felder.forEach(f=>{
  const kandidaten=[f.label].concat(f.alias||[]).map(importNormal);
  for(let i=0;i<(kopf||[]).length;i++){
   if(belegt[i])continue;
   const k=importNormal(kopf[i]);
   if(!k)continue;
   if(kandidaten.some(c=>c&&(k===c||k.indexOf(c)===0||c.indexOf(k)===0))){
    zu[f.key]=i; belegt[i]=true; return;
   }
  }
 });
 return zu;
}
function initExcelImport(cfg){
 // cfg: {inputId,buttonId,previewId,headerCheckId,countId,tableId,mappingId,
 //       fehlerId,confirmId,cancelId,tableName,felder:[{key,label,zahl,pflicht,alias}],
 //       nachImport}
 const input=$(cfg.inputId),btn=$(cfg.buttonId);
 if(!input||!btn)return;
 let zeilen=[];
 let zuordnung={};        // feldKey -> Spaltenindex
 btn.onclick=()=>input.click();
 input.addEventListener("change",async()=>{
  const file=input.files[0];
  if(!file)return;
  try{ zeilen=await excelZeilenLesen(file); }
  catch(err){ alert("Die Datei konnte nicht gelesen werden: "+(err.message||err)); input.value=""; return; }
  if(!zeilen.length){ alert("Die Datei enthält keine Zeilen."); input.value=""; return; }
  // Nur beim Einlesen automatisch zuordnen - eine spaetere Aenderung von
  // Hand darf nicht ueberschrieben werden.
  zuordnung=$(cfg.headerCheckId).checked?importAutoZuordnen(cfg.felder,zeilen[0]):{};
  $(cfg.previewId).hidden=false;
  zeichneZuordnung(); zeichneVorschau();
 });
 function spaltenAnzahl(){
  return zeilen.reduce((m,z)=>Math.max(m,(z||[]).length),0);
 }
 function datenZeilen(){
  const mitKopf=$(cfg.headerCheckId).checked;
  return (mitKopf?zeilen.slice(1):zeilen).filter(z=>z.some(w=>String(w||"").trim()!==""));
 }
 function zeichneZuordnung(){
  const box=$(cfg.mappingId); if(!box)return;
  const n=spaltenAnzahl();
  const mitKopf=$(cfg.headerCheckId).checked;
  const kopf=mitKopf?(zeilen[0]||[]):[];
  const optionen=i=>{
   let o='<option value="">– keine –</option>';
   for(let c=0;c<n;c++){
    const name=String(kopf[c]||"").trim();
    o+=`<option value="${c}"${zuordnung[i]===c?" selected":""}>Spalte ${importSpaltenName(c)}${
      name?" · "+esc(name):""}</option>`;
   }
   return o;
  };
  box.innerHTML=`<div class="small" style="margin-bottom:4px"><b>Spalten zuordnen</b> – welche Spalte der Datei ist welches Feld?</div>`
   +cfg.felder.map(f=>`<label class="import-feld"><span>${esc(f.label)}${
     f.pflicht?' <span style="color:#d9534f">*</span>':""}</span>
<select data-import-feld="${esc(f.key)}">${optionen(f.key)}</select></label>`).join("");
  box.querySelectorAll("[data-import-feld]").forEach(sel=>{
   sel.addEventListener("change",()=>{
    const k=sel.dataset.importFeld;
    if(sel.value==="")delete zuordnung[k]; else zuordnung[k]=Number(sel.value);
    zeichneVorschau();
   });
  });
 }
 // Der Wert einer Zeile fuer ein Feld - ohne Zuordnung bleibt er leer.
 function wert(z,f){
  const i=zuordnung[f.key];
  if(i===undefined)return f.zahl?0:"";
  return f.zahl?excelZahlLesen(z[i]):String(z[i]??"").trim();
 }
 // Was am Import noch nicht stimmt. Ehrlich benannt statt eines pauschalen
 // "Fehler beim Import".
 function pruefen(daten){
  const meldungen=[];
  cfg.felder.filter(f=>f.pflicht).forEach(f=>{
   if(zuordnung[f.key]===undefined)meldungen.push(`Das Pflichtfeld „${f.label}" ist keiner Spalte zugeordnet.`);
  });
  if(!daten.length)meldungen.push("Die Datei enthält keine Datenzeilen.");
  // Leere Pflichtwerte je Zeile
  cfg.felder.filter(f=>f.pflicht&&zuordnung[f.key]!==undefined).forEach(f=>{
   const leer=daten.filter(z=>String(wert(z,f)).trim()==="").length;
   if(leer)meldungen.push(`${leer} Zeile(n) haben kein „${f.label}" – sie werden nicht importiert.`);
  });
  return meldungen;
 }
 function verwendbar(daten){
  return daten.filter(z=>cfg.felder.filter(f=>f.pflicht)
    .every(f=>zuordnung[f.key]!==undefined&&String(wert(z,f)).trim()!==""));
 }
 function zeichneVorschau(){
  const daten=datenZeilen();
  const gut=verwendbar(daten);
  const meldungen=pruefen(daten);
  $(cfg.countId).textContent=`${gut.length} von ${daten.length} Zeilen werden importiert `
   +`(die Datei hat ${zeilen.length} Zeilen und ${spaltenAnzahl()} Spalten).`;
  const fb=$(cfg.fehlerId);
  if(fb){
   fb.innerHTML=meldungen.length
    ? meldungen.map(m=>`<div style="color:#8a5312">⚠️ ${esc(m)}</div>`).join("")
    : '<div style="color:var(--green)">✓ Alle Pflichtfelder sind zugeordnet.</div>';
  }
  const kopf="<tr>"+cfg.felder.map(f=>`<th>${esc(f.label)}</th>`).join("")+"</tr>";
  const rumpf=gut.slice(0,200).map(z=>"<tr>"+cfg.felder.map(f=>`<td>${esc(String(wert(z,f)))}</td>`).join("")+"</tr>").join("");
  $(cfg.tableId).innerHTML=kopf+rumpf;
  const k=$(cfg.confirmId); if(k)k.disabled=!gut.length;
 }
 $(cfg.headerCheckId).addEventListener("change",()=>{
  if($(cfg.headerCheckId).checked&&!Object.keys(zuordnung).length)
   zuordnung=importAutoZuordnen(cfg.felder,zeilen[0]);
  zeichneZuordnung(); zeichneVorschau();
 });
 $(cfg.cancelId).onclick=()=>{ zeilen=[]; zuordnung={}; input.value=""; $(cfg.previewId).hidden=true; };
 $(cfg.confirmId).onclick=async()=>{
  const daten=verwendbar(datenZeilen());
  if(!daten.length){ alert("Keine vollständigen Zeilen zum Importieren gefunden."); return; }
  const eintraege=daten.map(z=>{
   const o={};
   cfg.felder.forEach(f=>{ o[f.key]=wert(z,f); });
   return o;
  });
  $(cfg.confirmId).disabled=true;
  const {data,error}=await sb.from(cfg.tableName).insert(eintraege).select();
  $(cfg.confirmId).disabled=false;
  if(error){ alert("Fehler beim Import: "+error.message); return; }
  // Ein von RLS geblocktes INSERT meldet keinen Fehler, es betrifft still
  // 0 Zeilen (CLAUDE.md 24.1) - deshalb wird das Ergebnis geprueft.
  if(!data||!data.length){ alert("Es wurde nichts importiert. Fehlt die nötige Berechtigung?"); return; }
  alert(`${data.length} Positionen importiert.`);
  zeilen=[]; zuordnung={}; input.value=""; $(cfg.previewId).hidden=true;
  await cfg.nachImport();
 };
}
initExcelImport({
 inputId:"materialExcelInput",buttonId:"materialExcelBtn",previewId:"materialExcelPreview",
 headerCheckId:"materialExcelHeader",countId:"materialExcelCount",tableId:"materialExcelTable",
 confirmId:"materialExcelConfirm",cancelId:"materialExcelCancel",
 mappingId:"materialExcelMapping",fehlerId:"materialExcelFehler",
 tableName:"materials",
 // "alias" sind die Schreibweisen, die in echten Lieferantenlisten
 // vorkommen - damit trifft die automatische Zuordnung ohne Raten.
 felder:[
  {key:"edv_nr",label:"EDV-Nr.",pflicht:true,alias:["edvnr","artikelnr","artikelnummer","nr","nummer","code","artikel"]},
  {key:"name",label:"Material",pflicht:true,alias:["bezeichnung","artikelbezeichnung","beschreibung","text","benennung"]},
  {key:"dim",label:"Dim.",alias:["dimension","abmessung","masse","staerke","dicke","format"]},
  {key:"unit",label:"Einheit",alias:["einh","me","mengeneinheit","verkaufseinheit","vpe"]},
  {key:"price",label:"Preis",zahl:true,alias:["preis","fr","chf","betrag","vkpreis","verkaufspreis","einzelpreis","listenpreis"]}
 ],
 nachImport:async()=>{ await loadAllData(); renderSettings(); }
});
initExcelImport({
 inputId:"bzMaterialExcelInput",buttonId:"bzMaterialExcelBtn",previewId:"bzMaterialExcelPreview",
 headerCheckId:"bzMaterialExcelHeader",countId:"bzMaterialExcelCount",tableId:"bzMaterialExcelTable",
 confirmId:"bzMaterialExcelConfirm",cancelId:"bzMaterialExcelCancel",
 mappingId:"bzMaterialExcelMapping",fehlerId:"bzMaterialExcelFehler",
 tableName:"blitzschutz_materials",
 felder:[
  {key:"artikel_nr",label:"Artikel-Nr.",pflicht:true,alias:["artikelnr","artikelnummer","edvnr","nr","nummer","code","artikel"]},
  {key:"bezeichnung",label:"Bezeichnung",pflicht:true,alias:["beschreibung","text","benennung","name"]},
  {key:"material",label:"Material",alias:["werkstoff","ausfuehrung"]},
  {key:"einheit",label:"Einheit",alias:["einh","me","mengeneinheit","vpe"]}
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
 // Schnittfuge, Rest-Mindestlaenge und das Reststuecke-Lager (v3.04, js/42).
 if(typeof renderSchnittfugeFelder==="function")renderSchnittfugeFelder();
 if(typeof renderRestLager==="function")renderRestLager();
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
 if($("aufgabenOffenInput"))$("aufgabenOffenInput").value=aufgabenOffenStart?"auf":"zu";
 if($("workflowAktivInput"))$("workflowAktivInput").value=(typeof workflowAktiv==="undefined"||workflowAktiv!==false)?"ja":"nein";
 if(typeof renderProjektmodule==="function")renderProjektmodule();   // v3.09
 if(typeof vorlagenNeuLaden==="function")vorlagenNeuLaden();         // v3.09
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
 if(!currentProjectId){alert("Bitte zuerst ein Projekt auswählen. Ein Rapport kann nur einem Projekt zugeordnet gespeichert werden.");return}
 // Ohne Verbindung: in die Warteschlange statt einer Absage (v3.04).
 if(wsIstOffline()){
  const proj=allProjects.find(x=>String(x.id)===String(currentProjectId));
  const r=await wsEinreihen({
   tabelle:"reports", zielId:currentReportId||null,
   // Ein Rapport-Bildschirm, eine Marke - zweimal speichern ersetzt.
   schluessel:"report-"+(currentProjectId||"?"),
   standVorher:currentReportMeta?currentReportMeta.updated_at:null,
   titel:`${($("date").value||"")} · ${proj?(proj.object||proj.name):""}`.trim(),
   payload:{project_id:currentProjectId,date:$("date").value||null,
     order_no:$("orderNo").value,customer:$("customer").value,object:$("object").value,
     vat:$("vat").value,work_entries:works,material_entries:mats},
   bilder:{photo_paths:(typeof reportPhotos!=="undefined")?reportPhotos.slice():[]}
  });
  if(!r.ok){
   alert("Keine Verbindung – und dieser Rapport lässt sich auf diesem Gerät auch nicht "
    +"zwischenspeichern ("+(r.grund||"unbekannter Grund")+").\n\nDie Eingaben bleiben "
    +"stehen. Bitte speichern, sobald wieder eine Verbindung besteht.");
   return;
  }
  isDirty=false;
  alert("Keine Verbindung.\n\nDer Rapport wartet jetzt auf diesem Gerät und wird übertragen, "
   +"sobald wieder eine Verbindung besteht. Bis dahin ist er NICHT in der Datenbank – "
   +"bitte das Gerät nicht zurücksetzen.");
  return;
 }
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
 // Fotos (v3.04): sie liegen unter reports/<projectId>/<reportId>/photo/… -
 // bei einem neuen Rapport gibt es diese ID aber erst nach dem ersten
 // Speichern. Deshalb wie bei den Massaufnahmen zuerst die Zeile anlegen und
 // die Bilder danach hochladen.
 const neueFotos=(typeof reportPhotos!=="undefined")
   ? reportPhotos.some(x=>String(x).startsWith("data:")) : false;
 if(currentReportId)res=await sb.from("reports").update(payload).eq("id",currentReportId).select().maybeSingle();
 else res=await sb.from("reports").insert({...payload,created_by:currentProfile?currentProfile.id:null,created_at:new Date().toISOString()}).select().maybeSingle();
 if(!res.error&&res.data&&neueFotos){
  try{
   const ordner=`reports/${currentProjectId}/${res.data.id}/photo`;
   const pfade=[];
   for(const f of reportPhotos){
    pfade.push(String(f).startsWith("data:")?await uploadMeasurementImage(f,ordner):f);
   }
   const nach=await sb.from("reports").update({photo_paths:pfade}).eq("id",res.data.id).select().maybeSingle();
   if(nach.error)throw nach.error;
   reportPhotos=pfade;
   if(typeof renderReportFotos==="function")renderReportFotos();
   res=nach;
  }catch(err){
   $("save").disabled=false;
   alert("Der Rapport wurde gespeichert, aber die Fotos konnten nicht hochgeladen werden: "
     +(err&&err.message?err.message:err)+"\n\nDie Fotos bleiben im Formular stehen.");
   if(res.data){currentReportId=res.data.id;}
   return;
  }
 }
 $("save").disabled=false;
 if(res.error){alert("Fehler beim Speichern: "+res.error.message);return}
 if(res.data){currentReportId=res.data.id;currentReportMeta={created_by:res.data.created_by,created_at:res.data.created_at,updated_by:res.data.updated_by,updated_at:res.data.updated_at};}
 updateVerlaufToggleVisibility($("reportVerlaufToggle"),$("reportVerlaufBody"),currentReportId);
 isDirty=false;
 alert("Rapport gespeichert und dem Projekt zugeordnet.");
};
$("clear").onclick=()=>{if(confirm("Wirklich alle Rapportdaten löschen?")){works=[{date:new Date().toISOString().slice(0,10),desc:"",employee:settings.employees[0]||"",rateName:(defaultRate&&settings.rates.some(r=>r[0]===defaultRate))?defaultRate:(settings.rates[0]?.[0]||""),hours:0}];mats=[];currentReportId=null;
 if(typeof reportPhotos!=="undefined"){reportPhotos=[];if(typeof renderReportFotos==="function")renderReportFotos()}
 updateVerlaufToggleVisibility($("reportVerlaufToggle"),$("reportVerlaufBody"),null);renderMain()}};
