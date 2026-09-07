"use strict";
// ---- Daten laden ---------------------------------------------
async function loadAllData(){
 const [ratesRes,materialsRes,profilesRes,projectsRes,appSettingsRes,bzRes,rinneRes,measMaterialsRes,sysRes,restRes,lagerRes,verwendetRes]=await Promise.all([
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
  // Das Restsuecke-Lager (v3.04). RLS grenzt auf die eigene Firma ein,
  // der Client filtert bewusst nicht selbst nach company_id.
  sb.from("reststuecke").select("*").eq("verbraucht",false).order("laenge_mm",{ascending:false}),
  // Der Lagerbestand (v3.27): welche Materialien die Firma grundsaetzlich
  // fuehrt. Ausdruecklich KEINE Lagerverwaltung - die Menge wird beim
  // Zuschnitt nicht abgebucht. Der Eintrag traegt Staerke und Ausfuehrung
  // und macht dadurch erst das exakte Matching der Reste moeglich.
  sb.from("lagerbestand").select("*").order("bezeichnung"),
  // v3.29: die bereits VERWENDETEN Reste, aber nur die mit einem Bezug.
  // Ohne sie waere nirgends zu sehen, wofuer ein Rest gebraucht wurde - er
  // verschwand bis v3.28 spurlos aus dem Lager. Bewusst begrenzt und nur mit
  // Bezug: die Liste ist eine Nachschau, kein zweites Lager.
  sb.from("reststuecke").select("*").eq("verbraucht",true)
    .not("verbraucht_fuer_measurement_id","is",null)
    .order("updated_at",{ascending:false}).limit(200),
 ]);
 // Offline (v2.70): schlaegt das Laden fehl, wird NICHT stillschweigend
 // eine leere App gezeigt - dann kaeme jede Liste als "nichts vorhanden"
 // daher. Stattdessen die zuletzt gesicherten Daten dieser Firma und ein
 // deutlicher Hinweis.
 const geladen={rates:ratesRes.data,materials:materialsRes.data,profiles:profilesRes.data,
  projects:projectsRes.data,appSettings:appSettingsRes.data,bz:bzRes.data,
  rinne:rinneRes.data,measMaterials:measMaterialsRes.data,rest:restRes?restRes.data:[],
  lager:lagerRes?lagerRes.data:[],
  restVerwendet:verwendetRes?verwendetRes.data:[]};
 const fehlgeschlagen=[ratesRes,materialsRes,profilesRes,projectsRes,bzRes,rinneRes,measMaterialsRes]
   .some(r=>r&&r.error);
 const firmaId=currentProfile?currentProfile.company_id:null;
 if(fehlgeschlagen||offlineIstOffline()){
  const gesichert=offlineCacheLesen(firmaId);
  if(gesichert&&gesichert.daten){
   Object.keys(geladen).forEach(k=>{
    if(geladen[k]===null||geladen[k]===undefined)geladen[k]=gesichert.daten[k];
   });
   offlineStand=gesichert.stand;
  }
  offlineHinweisZeigen(true,offlineStand);
 }else{
  offlineHinweisZeigen(false);
  offlineStand=new Date().toISOString();
  offlineCacheSchreiben(firmaId,geladen);
 }
 const rates=geladen.rates||[];
 const materials=geladen.materials||[];
 const profiles=geladen.profiles||[];
 settings.rates=rates.map(r=>[r.name,r.value]);
 rateIds=rates.map(r=>r.id);
 settings.materials=materials.map(m=>[m.edv_nr,m.name,m.dim,m.unit,m.price]);
 materialIds=materials.map(m=>m.id);
 settings.employees=profiles.map(p=>`${p.first_name} ${p.last_name}`);
 employeeIds=profiles.map(p=>p.id);
 allProfiles=profiles;
 allProjects=geladen.projects||[];
 if(geladen.appSettings&&geladen.appSettings.company_name)companyName=geladen.appSettings.company_name;
 if(geladen.appSettings){
  companyAddress=geladen.appSettings.company_address||"";
  logoUrl=geladen.appSettings.logo_url||"";
  defaultVat=geladen.appSettings.default_vat||"8.1 %";
  if(geladen.appSettings.rinne_dila_mass_mm!==null&&geladen.appSettings.rinne_dila_mass_mm!==undefined)rinneDilaMass=Number(geladen.appSettings.rinne_dila_mass_mm)||0;
  rinneNormlaengen=(geladen.appSettings.rinne_normlaengen&&typeof geladen.appSettings.rinne_normlaengen==="object")?geladen.appSettings.rinne_normlaengen:{};
  blechRollenbreiten=Array.isArray(geladen.appSettings.blech_rollenbreiten)?geladen.appSettings.blech_rollenbreiten.map(Number).filter(x=>Number.isFinite(x)&&x>0):[];
  workflowAktiv=(geladen.appSettings.workflow_aktiv!==false);   // v3.07, Vorgabe ein
  // v3.09 erweiterter Projekt-/Material-/Werkstattworkflow. Fehlt die
  // Spalte oder ist sie leer, ist alles aus - das ist der Standard.
  if(typeof pmUebernehmen==="function")pmUebernehmen(geladen.appSettings.projektmodule);
  blechSchnittfuge=Number(geladen.appSettings.schnittfuge_mm)||0;
  restMindestlaenge=(geladen.appSettings.rest_mindestlaenge_mm===null||geladen.appSettings.rest_mindestlaenge_mm===undefined)
   ?1000:(Number(geladen.appSettings.rest_mindestlaenge_mm)||0);
  // v3.27: die Mindestbreite kommt NEU dazu, die Mindestlaenge darueber
  // bleibt unveraendert und wird nicht dupliziert.
  restMindestbreite=(geladen.appSettings.rest_mindestbreite_mm===null||geladen.appSettings.rest_mindestbreite_mm===undefined)
   ?100:(Number(geladen.appSettings.rest_mindestbreite_mm)||0);
  // Duerfen vorhandene Reste in die Zuschnittplanung einfliessen? Vorgabe
  // AUS - dann rechnet der Zuschnitt exakt wie bis v3.26.
  resteImZuschnitt=(geladen.appSettings.reste_im_zuschnitt===true);
  if(geladen.appSettings.mad_boden_mass_mm!==null&&geladen.appSettings.mad_boden_mass_mm!==undefined)madBodenMass=Number(geladen.appSettings.mad_boden_mass_mm)||0;
  if(geladen.appSettings.mad_schieber_mass_mm!==null&&geladen.appSettings.mad_schieber_mass_mm!==undefined)madSchieberMass=Number(geladen.appSettings.mad_schieber_mass_mm)||0;
  if(geladen.appSettings.luk_achsabstand_mm!==null&&geladen.appSettings.luk_achsabstand_mm!==undefined)lukAchsabstand=Number(geladen.appSettings.luk_achsabstand_mm)||500;
  if(geladen.appSettings.luk_hilfsriss_mm!==null&&geladen.appSettings.luk_hilfsriss_mm!==undefined)lukHilfsriss=Number(geladen.appSettings.luk_hilfsriss_mm)||0;
  if(geladen.appSettings.luk_zugabe_breite_mm!==null&&geladen.appSettings.luk_zugabe_breite_mm!==undefined)lukZugabeBreite=Number(geladen.appSettings.luk_zugabe_breite_mm)||0;
  if(geladen.appSettings.luk_zugabe_laenge_mm!==null&&geladen.appSettings.luk_zugabe_laenge_mm!==undefined)lukZugabeLaenge=Number(geladen.appSettings.luk_zugabe_laenge_mm)||0;
 }
 // Die ID der eigenen app_settings-Zeile wird zum Speichern gebraucht:
 // PostgREST lehnt ein UPDATE ohne WHERE-Bedingung ab.
 appSettingsId=(geladen.appSettings&&geladen.appSettings.id!=null)?geladen.appSettings.id:null;
 moduleImTest=(sysRes&&sysRes.data&&sysRes.data.module_test)||{};
 blitzschutzMaterials=geladen.bz||[];
 rinneFittingTypes=geladen.rinne||[];
 measurementMaterials=geladen.measMaterials||[];
 reststuecke=geladen.rest||[];
 lagerbestand=geladen.lager||[];
 restVerwendet=geladen.restVerwendet||[];
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
 if(document.activeElement!==$("eb_gavaAbstand"))$("eb_gavaAbstand").value=einlaufblechSettings.gava_abstand??500;
 if(typeof renderBlechRollenbreiten==="function")renderBlechRollenbreiten();
 if(document.activeElement!==$("ebks_stossLaenge"))$("ebks_stossLaenge").value=einlaufblechKonischSettings.stoss_laenge;
 if(document.activeElement!==$("ebks_ueberlappung"))$("ebks_ueberlappung").value=einlaufblechKonischSettings.ueberlappung;
 if(document.activeElement!==$("ebks_gehrungszugabe"))$("ebks_gehrungszugabe").value=einlaufblechKonischSettings.gehrungszugabe;
 if(document.activeElement!==$("ebks_umschlagOben"))$("ebks_umschlagOben").value=einlaufblechKonischSettings.umschlag_oben;
 if(document.activeElement!==$("ebks_umschlagUnten"))$("ebks_umschlagUnten").value=einlaufblechKonischSettings.umschlag_unten;
 if(document.activeElement!==$("ebks_restSchwelle"))$("ebks_restSchwelle").value=einlaufblechKonischSettings.rest_schwelle;
 if(document.activeElement!==$("ebks_endzugabe"))$("ebks_endzugabe").value=einlaufblechKonischSettings.end_zugabe;
 if(document.activeElement!==$("keas_stossLaenge"))$("keas_stossLaenge").value=kehleSettings.stoss_laenge;
 if(document.activeElement!==$("keas_ueberlappung"))$("keas_ueberlappung").value=kehleSettings.ueberlappung;
 if(document.activeElement!==$("keas_restSchwelle"))$("keas_restSchwelle").value=kehleSettings.rest_schwelle;
}
