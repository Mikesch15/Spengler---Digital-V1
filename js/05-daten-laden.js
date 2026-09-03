"use strict";
// ---- Daten laden ---------------------------------------------
async function loadAllData(){
 const [ratesRes,materialsRes,profilesRes,projectsRes,appSettingsRes,bzRes,rinneRes,measMaterialsRes,sysRes]=await Promise.all([
  sb.from("rates").select("*").order("id"),
  sb.from("materials").select("*").order("edv_nr"),
  sb.from("profiles").select("*").order("first_name"),
  sb.from("projects").select("*").order("name"),
  sb.from("app_settings").select("*").maybeSingle(), // eine Zeile je Firma, RLS grenzt automatisch ein
  sb.from("blitzschutz_materials").select("*").order("bezeichnung"),
  sb.from("rinne_fitting_types").select("*").order("name"),
  sb.from("measurement_materials").select("*").order("name"),
  // "Module in Entwicklung" ist seit v2.67 eine Betreiber-Einstellung
  // (eine Zeile fuer das ganze System), nicht mehr eine je Firma.
  sb.from("system_settings").select("module_test").maybeSingle(),
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
  if(appSettingsRes.data.mad_boden_mass_mm!==null&&appSettingsRes.data.mad_boden_mass_mm!==undefined)madBodenMass=Number(appSettingsRes.data.mad_boden_mass_mm)||0;
  if(appSettingsRes.data.mad_schieber_mass_mm!==null&&appSettingsRes.data.mad_schieber_mass_mm!==undefined)madSchieberMass=Number(appSettingsRes.data.mad_schieber_mass_mm)||0;
  if(appSettingsRes.data.luk_achsabstand_mm!==null&&appSettingsRes.data.luk_achsabstand_mm!==undefined)lukAchsabstand=Number(appSettingsRes.data.luk_achsabstand_mm)||500;
  if(appSettingsRes.data.luk_hilfsriss_mm!==null&&appSettingsRes.data.luk_hilfsriss_mm!==undefined)lukHilfsriss=Number(appSettingsRes.data.luk_hilfsriss_mm)||0;
  if(appSettingsRes.data.luk_zugabe_breite_mm!==null&&appSettingsRes.data.luk_zugabe_breite_mm!==undefined)lukZugabeBreite=Number(appSettingsRes.data.luk_zugabe_breite_mm)||0;
  if(appSettingsRes.data.luk_zugabe_laenge_mm!==null&&appSettingsRes.data.luk_zugabe_laenge_mm!==undefined)lukZugabeLaenge=Number(appSettingsRes.data.luk_zugabe_laenge_mm)||0;
 }
 // Die ID der eigenen app_settings-Zeile wird zum Speichern gebraucht:
 // PostgREST lehnt ein UPDATE ohne WHERE-Bedingung ab.
 appSettingsId=(appSettingsRes.data&&appSettingsRes.data.id!=null)?appSettingsRes.data.id:null;
 moduleImTest=(sysRes&&sysRes.data&&sysRes.data.module_test)||{};
 blitzschutzMaterials=bzRes.data||[];
 rinneFittingTypes=rinneRes.data||[];
 measurementMaterials=measMaterialsRes.data||[];
 applyCompanyName();
 applyEinlaufblechSettings();
 renderMeasMaterialOptions();
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
 const logoPrev=$("logoPreview");
 const startLogo=$("startLogo");
 if(!logoUrl){
  if(logoEl)logoEl.innerHTML=esc(companyName);
  if(logoPrev&&!logoDataUrl){logoPrev.hidden=true;logoPrev.src="";if($("logoRemove"))$("logoRemove").hidden=true;}
  if(startLogo){startLogo.hidden=true;startLogo.src="";}
 }else{
  // Bucket ist privat: der gespeicherte Pfad/die alte URL muss erst zu
  // einer signierten URL aufgelöst werden, bevor sie als <img> lädt.
  storageSignedUrl(logoUrl).then(url=>{
   if(!url)return;
   if(logoEl)logoEl.innerHTML=`<img src="${esc(url)}" style="max-height:60px;max-width:280px;display:block">`;
   if(logoPrev&&!logoDataUrl){logoPrev.src=url;logoPrev.hidden=false;if($("logoRemove"))$("logoRemove").hidden=false;}
   if(startLogo){startLogo.src=url;startLogo.hidden=false;}
  });
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
