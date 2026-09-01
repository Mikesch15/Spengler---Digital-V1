"use strict";
let settingsReturnToMeasurement=false;
// Das Anschlussblech und die Einfassung Rund bringen ihre Einstellungen
// selbst mit (js/20 bzw. js/21). Diese Hüllen machen den Aufruf
// unabhängig von der Ladereihenfolge.
function anbEinstellungenAnzeigen(){
 if(typeof applyAnschlussblechSettings==="function")applyAnschlussblechSettings();
}
function einfEinstellungenAnzeigen(){
 if(typeof applyEinfassungSettings==="function")applyEinfassungSettings();
}
$("settings").onclick=()=>{renderSettings();applyCompanyName();applyEinlaufblechSettings();anbEinstellungenAnzeigen();einfEinstellungenAnzeigen();$("settingsModal").hidden=false};
function openSettingsTo(tabName,sectionName){
 renderSettings();
 applyCompanyName();
 applyEinlaufblechSettings();
 anbEinstellungenAnzeigen();
 einfEinstellungenAnzeigen();
 $("settingsModal").hidden=false;
 const tabBtn=document.querySelector(`[data-settings-tab="${tabName}"]`);
 if(tabBtn){
  document.querySelectorAll(".settings-tab").forEach(b=>b.classList.toggle("active",b===tabBtn));
  document.querySelectorAll(".settings-tab-panel").forEach(p=>{p.hidden=(p.dataset.settingsPanel!==tabName)});
  if(tabName==="protected"){
   $("protectedDenied").hidden=isAdmin();
   $("protectedContent").hidden=!isAdmin();
  }
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
  anbEinstellungenAnzeigen();
  einfEinstellungenAnzeigen();
  if($("measType").value==="einlaufblech_gerade")renderEbPiecesTable();
  if($("measType").value==="lukarne"&&typeof renderLukResult==="function")renderLukResult();
  if($("measType").value==="anschlussblech"&&typeof renderAnbResult==="function")renderAnbResult();
  if($("measType").value==="einfassung_rund"&&typeof renderEinfResult==="function")renderEinfResult();
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
  if(tab.dataset.settingsTab==="protected"){
   $("protectedDenied").hidden=isAdmin();
   $("protectedContent").hidden=!isAdmin();
  }
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
// Liste der Module aus den Auswahlfenstern zusammenstellen. Neue Arten
// erscheinen dadurch automatisch, ohne dass hier etwas nachgetragen wird.
function renderModuleTestListe(){
 const box=$("moduleTestListe");
 if(!box)return;
 const zeilen=[];
 const sammeln=(auswahl,praefix,attribut,titel)=>{
  document.querySelectorAll(auswahl).forEach(btn=>{
   const art=btn.dataset[attribut];
   const spans=btn.querySelectorAll("span");
   const text=(spans.length?spans[spans.length-1].textContent:btn.textContent).trim();
   const schluessel=praefix+":"+art;
   zeilen.push(`<label class="rechte-schalter"><input type="checkbox" data-modul-test="${esc(schluessel)}"${moduleImTest[schluessel]?" checked":""}> ${esc(titel)} – ${esc(text)}</label>`);
  });
 };
 sammeln("[data-choose-meas-type]","meas","chooseMeasType","Massaufnahme");
 sammeln("[data-choose-am-type]","am","chooseAmType","Ausmass");
 box.innerHTML=zeilen.join("")||'<div class="small">Keine Module gefunden.</div>';
}
$("saveModuleTest").addEventListener("click",async()=>{
 const knopf=$("saveModuleTest");
 const neu={};
 document.querySelectorAll("[data-modul-test]").forEach(cb=>{
  if(cb.checked)neu[cb.dataset.modulTest]=true;
 });
 knopf.disabled=true;
 try{
  const {error}=await sb.from("app_settings")
   .update({module_test:neu,updated_at:new Date().toISOString()}); // eine Zeile je Firma, RLS grenzt automatisch ein
  if(error){alert("Konnte nicht gespeichert werden: "+error.message);return}
  moduleImTest=neu;
  applyModuleTest();
  alert("Gespeichert (gilt für alle).");
 }catch(err){
  alert("Fehler beim Speichern: "+(err&&err.message?err.message:err));
 }finally{
  knopf.disabled=false;
 }
});
$("saveMadMasse").addEventListener("click",async()=>{
 const knopf=$("saveMadMasse");
 const boden=Number($("madBodenMassInput").value)||0;
 const schieber=Number($("madSchieberMassInput").value)||0;
 knopf.disabled=true;
 try{
  const {error}=await sb.from("app_settings")
   .update({mad_boden_mass_mm:boden,mad_schieber_mass_mm:schieber,updated_at:new Date().toISOString()}); // eine Zeile je Firma, RLS grenzt automatisch ein
  if(error){alert("Konnte nicht gespeichert werden: "+error.message);return}
  madBodenMass=boden;madSchieberMass=schieber;
  if(typeof renderMadResult==="function"&&madSegments.length)renderMadResult();
  alert("Gespeichert (gilt für alle).");
 }catch(err){
  // Ohne das bliebe der Knopf nach einem Fehler dauerhaft gesperrt
  alert("Fehler beim Speichern: "+(err&&err.message?err.message:err));
 }finally{
  knopf.disabled=false;
 }
});
$("saveLukMasse").addEventListener("click",async()=>{
 const knopf=$("saveLukMasse");
 const achs=Number($("lukAchsabstandInput").value)||0;
 const hr=Number($("lukHilfsrissInput").value)||0;
 const zb=Number($("lukZugabeBreiteInput").value)||0;
 const zl=Number($("lukZugabeLaengeInput").value)||0;
 if(achs<=0){alert("Der Achsabstand muss grösser als 0 sein.");return}
 knopf.disabled=true;
 try{
  const {error}=await sb.from("app_settings")
   .update({luk_achsabstand_mm:achs,luk_hilfsriss_mm:hr,luk_zugabe_breite_mm:zb,luk_zugabe_laenge_mm:zl,updated_at:new Date().toISOString()}); // eine Zeile je Firma, RLS grenzt automatisch ein
  if(error){alert("Konnte nicht gespeichert werden: "+error.message);return}
  lukAchsabstand=achs;lukHilfsriss=hr;lukZugabeBreite=zb;lukZugabeLaenge=zl;
  if(typeof renderLukResult==="function"&&$("measType").value==="lukarne")renderLukResult();
  alert("Gespeichert (gilt für alle).");
 }catch(err){
  alert("Fehler beim Speichern: "+(err&&err.message?err.message:err));
 }finally{
  knopf.disabled=false;
 }
});
$("saveRinneDilaMass").onclick=async()=>{
 const wert=Number($("rinneDilaMassInput").value)||0;
 $("saveRinneDilaMass").disabled=true;
 const {error}=await sb.from("app_settings").update({rinne_dila_mass_mm:wert,updated_at:new Date().toISOString()}); // eine Zeile je Firma, RLS grenzt automatisch ein
 $("saveRinneDilaMass").disabled=false;
 if(error){alert("Konnte nicht gespeichert werden: "+error.message);return}
 rinneDilaMass=wert;
 if(typeof renderRinneResult==="function"&&rinneSegments.length)renderRinneResult();
 alert("Gespeichert (gilt für alle).");
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
  }); // eine Zeile je Firma, RLS grenzt automatisch ein
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

// Setzt die Werte eines Einlaufblech-Typs auf die Standardwerte zurück.
function einlaufblechZuruecksetzen(praefix,speicherSchluessel,zuweisen){
 if(!confirm("Alle Werte auf die Standardwerte zurücksetzen?"))return;
 const w={...EINLAUFBLECH_STANDARD};
 zuweisen(w);
 localStorage.setItem(speicherSchluessel,JSON.stringify(w));
 $(praefix+"stossLaenge").value=w.stoss_laenge;
 $(praefix+"ueberlappung").value=w.ueberlappung;
 $(praefix+"gehrungszugabe").value=w.gehrungszugabe;
 $(praefix+"umschlagOben").value=w.umschlag_oben;
 $(praefix+"umschlagUnten").value=w.umschlag_unten;
 $(praefix+"restSchwelle").value=w.rest_schwelle;
 $(praefix+"endzugabe").value=w.end_zugabe;
 alert("Auf Standardwerte zurückgesetzt.");
}
$("resetEinlaufblechSettings").onclick=()=>einlaufblechZuruecksetzen("eb_","sd_einlaufblechSettings",w=>{einlaufblechSettings=w});
$("resetEbkSettings").onclick=()=>einlaufblechZuruecksetzen("ebks_","sd_einlaufblechKonischSettings",w=>{einlaufblechKonischSettings=w});

let materialPage=0, materialFilter="", materialExpanded=new Set();
const MATERIAL_PAGE_SIZE=20;
function renderMaterialSettings(){
 const q=materialFilter.trim().toLowerCase();
 const filtered=settings.materials.map((m,i)=>({m,i})).filter(o=>!q||String(o.m[0]).toLowerCase().includes(q)||String(o.m[1]).toLowerCase().includes(q));
 const pages=Math.max(1,Math.ceil(filtered.length/MATERIAL_PAGE_SIZE));
 if(materialPage>=pages)materialPage=pages-1;
 const start=materialPage*MATERIAL_PAGE_SIZE, rows=filtered.slice(start,start+MATERIAL_PAGE_SIZE);
 const ro=isAdmin()?"":"disabled";
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
${isAdmin()?`<button class="red" data-del-material="${i}">Löschen</button>`:""}
</div>
</div>`}).join("")||'<div class="empty">Keine Materialien gefunden.</div>';
 $("newMaterial").hidden=!isAdmin();
 $("materialPrev").disabled=materialPage===0;
 $("materialNext").disabled=materialPage>=pages-1;
}
const debouncedRateUpdate=debounce((id,patch)=>sb.from("rates").update(patch).eq("id",id),500);
const debouncedMaterialUpdate=debounce((id,patch)=>sb.from("materials").update(patch).eq("id",id),500);
const debouncedProfileUpdate=debounce((id,patch)=>sb.from("profiles").update(patch).eq("id",id),500);
const debouncedBzMaterialUpdate=debounce((id,patch)=>sb.from("blitzschutz_materials").update(patch).eq("id",id),500);

// ---- Mitarbeiterkonto anlegen (nur Administrator) ------------
$("mitarbeiterAnlegen").addEventListener("click",async()=>{
 if(!meineRechte.admin){alert("Nur ein Administrator kann Konten anlegen.");return}
 const vor=$("neuMitarbeiterVor").value.trim();
 const nach=$("neuMitarbeiterNach").value.trim();
 if(!vor||!nach){alert("Bitte Vor- und Nachname eingeben.");return}
 const knopf=$("mitarbeiterAnlegen");
 knopf.disabled=true;
 try{
  const {data,error}=await sb.functions.invoke("smart-action",{body:{first_name:vor,last_name:nach}});
  if(error){alert(await edgeFunctionErrorMessage(error,"Konto konnte nicht angelegt werden."));return}
  if(!data?.ok){alert(data?.error||"Konto konnte nicht angelegt werden.");return}
  const username=data?.user?.username||data?.username||(vor.toLowerCase()+"."+nach.toLowerCase());
  const passwort=data?.password||"(vom Server vergeben)";
  alert("Konto angelegt.\n\nBenutzername: "+username+"\nStartpasswort: "+passwort+"\n\nBitte dem Mitarbeiter weitergeben. Er muss bei der ersten Anmeldung ein eigenes Passwort vergeben.");
  $("neuMitarbeiterVor").value="";
  $("neuMitarbeiterNach").value="";
  await loadAllData();
  renderSettings();
 }catch(err){
  alert("Fehler: "+((err&&err.message)||err));
 }finally{
  knopf.disabled=false;
 }
});

// ---- Datensicherung -----------------------------------------
$("datenSichern").addEventListener("click",async()=>{
 const knopf=$("datenSichern");
 const info=$("sicherungInfo");
 const tabellen=["profiles","projects","reports","measurements","ausmass","materials","rates",
                 "blitzschutz_materials","rinne_fitting_types","app_settings","permission_settings",
                 "permission_overrides","feedback"];
 knopf.disabled=true;
 info.textContent="Sicherung wird erstellt …";
 try{
  const sicherung={erstellt:new Date().toISOString(),version:$("appVersion")?$("appVersion").textContent:"",daten:{}};
  const fehler=[];
  for(const t of tabellen){
   const {data,error}=await sb.from(t).select("*");
   if(error){fehler.push(t+": "+error.message);continue}
   sicherung.daten[t]=data||[];
  }
  const text=JSON.stringify(sicherung,null,1);
  const blob=new Blob([text],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="spengler-sicherung-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  const anzahl=Object.entries(sicherung.daten).map(([t,v])=>t+": "+v.length).join(" · ");
  info.textContent="Gesichert – "+anzahl+(fehler.length?(" · Nicht lesbar: "+fehler.join(", ")):"");
 }catch(err){
  info.textContent="Fehler: "+((err&&err.message)||err);
 }finally{
  knopf.disabled=false;
 }
});

// ---- Passwort eines Mitarbeiters zurücksetzen ----------------
// Das eigentliche Setzen macht die Edge Function "reset-password";
// aus dem Browser heraus ginge es nicht, dafür braucht es den geheimen
// Service-Role-Schlüssel, der nur auf dem Server liegen darf.
function neuesStartpasswort(){
 const zeichen="abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
 let p="";
 const zufall=crypto.getRandomValues(new Uint32Array(8));
 for(let i=0;i<8;i++)p+=zeichen[zufall[i]%zeichen.length];
 return "Start-"+p;
}
$("employeeSettings").addEventListener("click",async e=>{
 const knopf=e.target.closest("[data-pw-reset]");
 if(!knopf)return;
 if(!meineRechte.admin){alert("Nur ein Administrator kann Passwörter zurücksetzen.");return}
 const i=Number(knopf.dataset.pwReset);
 const id=employeeIds[i];
 const name=settings.employees[i]||"diesen Mitarbeiter";
 if(!id){alert("Zu diesem Eintrag gibt es kein Konto.");return}
 if(!confirm("Passwort von "+name+" wirklich zurücksetzen?\n\nDas bisherige Passwort wird ungültig."))return;
 const neu=neuesStartpasswort();
 knopf.disabled=true;
 try{
  const {data,error}=await sb.functions.invoke("reset-password",{body:{profile_id:id,password:neu}});
  if(error){alert("Fehler: "+(await edgeFunctionErrorMessage(error,"Passwort konnte nicht zurückgesetzt werden.")));return}
  if(!data?.ok){alert("Fehler: "+(data?.error||"Passwort konnte nicht zurückgesetzt werden."));return}
  alert("Neues Startpasswort für "+name+":\n\n"+neu+"\n\nBitte weitergeben. Bei der nächsten Anmeldung muss ein eigenes Passwort vergeben werden.");
 }catch(err){
  alert("Fehler: "+((err&&err.message)||err));
 }finally{
  knopf.disabled=false;
 }
});
