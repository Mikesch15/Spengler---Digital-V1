"use strict";
// ---- Daten laden ---------------------------------------------
async function loadAllData(){
 const [ratesRes,materialsRes,profilesRes,projectsRes,appSettingsRes,bzRes,rinneRes]=await Promise.all([
  sb.from("rates").select("*").order("id"),
  sb.from("materials").select("*").order("edv_nr"),
  sb.from("profiles").select("*").order("first_name"),
  sb.from("projects").select("*").order("name"),
  sb.from("app_settings").select("*").eq("id",1).maybeSingle(),
  sb.from("blitzschutz_materials").select("*").order("bezeichnung"),
  sb.from("rinne_fitting_types").select("*").order("name"),
 ]);
 const rates=ratesRes.data||[];
 const materials=materialsRes.data||[];
 const profiles=profilesRes.data||[];
 settings.rates=rates.map(r=>[r.name,r.value]);
 rateIds=rates.map(r=>r.id);
 settings.materials=materials.map(m=>[m.edv_nr,m.name,m.dim,m.unit,m.price]);
 materialIds=materials.map(m=>m.id);
 settings.employees=profiles.map(p=>`${p.first_name} ${p.last_name}`);
 employeeIds=profiles.map(p=>p.id);
 allProfiles=profiles;
 allProjects=projectsRes.data||[];
 if(appSettingsRes.data&&appSettingsRes.data.company_name)companyName=appSettingsRes.data.company_name;
 if(appSettingsRes.data){
  companyAddress=appSettingsRes.data.company_address||"";
  logoUrl=appSettingsRes.data.logo_url||"";
  defaultVat=appSettingsRes.data.default_vat||"8.1 %";
  if(appSettingsRes.data.rinne_dila_mass_mm!==null&&appSettingsRes.data.rinne_dila_mass_mm!==undefined)rinneDilaMass=Number(appSettingsRes.data.rinne_dila_mass_mm)||0;
 }
 blitzschutzMaterials=bzRes.data||[];
 rinneFittingTypes=rinneRes.data||[];
 applyCompanyName();
 applyEinlaufblechSettings();
}
function applyCompanyName(){
 document.querySelectorAll(".js-company-name").forEach(el=>el.textContent=companyName);
 const label=$("startCompanyLine");if(label)label.textContent="bei "+companyName;
 const input=$("companyNameInput");if(input&&document.activeElement!==input)input.value=companyName;
 const rcInput=$("recentCountInput");if(rcInput&&document.activeElement!==rcInput)rcInput.value=recentCount;
 const addrInput=$("companyAddressInput");if(addrInput&&document.activeElement!==addrInput)addrInput.value=companyAddress;
 const vatInput=$("defaultVatInput");if(vatInput&&document.activeElement!==vatInput)vatInput.value=defaultVat;
 const printAddr=$("printAddress");if(printAddr)printAddr.textContent=companyAddress;
 const logoEl=$("printLogo");
 if(logoEl)logoEl.innerHTML=logoUrl?`<img src="${logoUrl}" style="max-height:60px;max-width:280px;display:block">`:esc(companyName);
 const logoPrev=$("logoPreview");
 if(logoPrev&&!logoDataUrl){
  if(logoUrl){logoPrev.src=logoUrl;logoPrev.hidden=false;$("logoRemove").hidden=false;}
  else{logoPrev.hidden=true;logoPrev.src="";$("logoRemove").hidden=true;}
 }
 const startLogo=$("startLogo");
 if(startLogo){
  if(logoUrl){startLogo.src=logoUrl;startLogo.hidden=false;}
  else{startLogo.hidden=true;startLogo.src="";}
 }
}
function applyEinlaufblechSettings(){
 if(document.activeElement!==$("eb_stossLaenge"))$("eb_stossLaenge").value=einlaufblechSettings.stoss_laenge;
 if(document.activeElement!==$("eb_ueberlappung"))$("eb_ueberlappung").value=einlaufblechSettings.ueberlappung;
 if(document.activeElement!==$("eb_gehrungszugabe"))$("eb_gehrungszugabe").value=einlaufblechSettings.gehrungszugabe;
 if(document.activeElement!==$("eb_umschlagOben"))$("eb_umschlagOben").value=einlaufblechSettings.umschlag_oben;
 if(document.activeElement!==$("eb_umschlagUnten"))$("eb_umschlagUnten").value=einlaufblechSettings.umschlag_unten;
 if(document.activeElement!==$("eb_restSchwelle"))$("eb_restSchwelle").value=einlaufblechSettings.rest_schwelle;
 if(document.activeElement!==$("eb_endzugabe"))$("eb_endzugabe").value=einlaufblechSettings.end_zugabe;
 if(document.activeElement!==$("ebks_stossLaenge"))$("ebks_stossLaenge").value=einlaufblechKonischSettings.stoss_laenge;
 if(document.activeElement!==$("ebks_ueberlappung"))$("ebks_ueberlappung").value=einlaufblechKonischSettings.ueberlappung;
 if(document.activeElement!==$("ebks_gehrungszugabe"))$("ebks_gehrungszugabe").value=einlaufblechKonischSettings.gehrungszugabe;
 if(document.activeElement!==$("ebks_umschlagOben"))$("ebks_umschlagOben").value=einlaufblechKonischSettings.umschlag_oben;
 if(document.activeElement!==$("ebks_umschlagUnten"))$("ebks_umschlagUnten").value=einlaufblechKonischSettings.umschlag_unten;
 if(document.activeElement!==$("ebks_restSchwelle"))$("ebks_restSchwelle").value=einlaufblechKonischSettings.rest_schwelle;
 if(document.activeElement!==$("ebks_endzugabe"))$("ebks_endzugabe").value=einlaufblechKonischSettings.end_zugabe;
}
