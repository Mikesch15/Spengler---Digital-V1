"use strict";
// ---------------------------------------------------------------------------
// v3.417  Teile aus dem Spengler-Digital-CAD (Fusion-Add-in)
// ---------------------------------------------------------------------------
// Das Add-in schreibt je gezeichnetem Teil eine Zeile in `cad_teile` (Auftrag,
// Teilnummer, Material, Zuschnitt, Schenkel/Winkel als `app_data`). Hier stehen
// sie im Projekt-Cockpit unter den Massaufnahmen. «Als Massaufnahme übernehmen»
// öffnet eine NEUE Massaufnahme «Freies Profil» mit diesen Werten - ueber
// measurementAlsVorlage() aus js/10, dem einen Kopierweg der App. Gerechnet,
// gespeichert, zugeschnitten und in die Werkstatt gegeben wird danach mit der
// App-eigenen Logik wie bei jeder Massaufnahme; hier wird nichts nachgebaut.
// Nach dem Speichern merkt sich cad_teile die Massaufnahme (measurement_id).
//
// Gibt es zum Projekt keine CAD-Teile, erscheint nichts (keine leere Karte).
// Die Firmengrenze erzwingt allein die RLS-Policy tenant_boundary_cad_teile.
// ---------------------------------------------------------------------------

let cadTeileCache=[];
// Teil, dessen Massaufnahme gerade offen ist. Verfaellt nach 30 Minuten, damit
// ein abgebrochener Versuch nie eine spaetere, fremde Aufnahme verknuepft.
let cadTeilOffen=null;
const CAD_TEIL_GUELTIG_MS=30*60*1000;

function cadTeilKannUebernehmen(t){
 const d=t&&t.app_data;
 return !!(d&&Array.isArray(d.schenkel)&&d.schenkel.length>=2);
}

function cadTeileZeileHtml(t){
 const mass=(t.zuschnitt_breite_mm!=null&&t.zuschnitt_laenge_mm!=null)
  ?`Zuschnitt ${Math.round(t.zuschnitt_breite_mm)} × ${Math.round(t.zuschnitt_laenge_mm)} mm`:"";
 const mat=[t.material_name,t.staerke_mm!=null?t.staerke_mm+" mm":""].filter(Boolean).join(", ");
 const info=[mass,mat,t.stueck>1?t.stueck+" Stück":"",t.vorlage_name?"Vorlage "+t.vorlage_name:""].filter(Boolean).join(" · ");
 const knopf=t.measurement_id
  ?`<button class="blue" data-open-project-measurement="${t.measurement_id}">Massaufnahme öffnen</button>`
  :(cadTeilKannUebernehmen(t)
    ?`<button class="blue" data-cad-teil-nehmen="${esc(t.id)}">Als Massaufnahme übernehmen</button>`
    :`<span class="small">ohne Biegung – nicht übernehmbar</span>`);
 return `<div class="report-row"><div class="report-row-info"><b>${esc((t.teil_label?t.teil_label+" ":"")+(t.name||"Teil"))}</b>`
  +`<span>${esc(info||"Keine weiteren Angaben")}</span>`
  +`<span class="meas-medien-hinweis">${t.measurement_id?"✔ übernommen":"neu aus dem CAD"}${t.dokument?" · "+esc(t.dokument):""}</span></div>`
  +`<div class="report-row-actions">${knopf}</div></div>`;
}

function cadTeileHtml(teile){
 if(!teile.length)return "";
 const neu=teile.filter(t=>!t.measurement_id).length;
 return `<div id="cadTeileBox" style="margin-top:14px"><h3 style="margin:8px 0">Teile aus dem CAD`
  +` <span class="small">(${teile.length}${neu?", "+neu+" neu":""})</span></h3>`+teile.map(cadTeileZeileHtml).join("")+`</div>`;
}

// Wird am Ende von loadProjectMeasurements() (js/09) aufgerufen - ohne Warten, ein Fehler hier stoert die Liste nie.
async function cadTeileNachListe(projectId){
 try{
  const box=$("cockpitMeasBody");
  if(!box||!projectId)return;
  const {data,error}=await sb.from("cad_teile").select("*").eq("project_id",projectId).order("teil_nr",{ascending:true});
  if(error||!Array.isArray(data)){cadTeileCache=[];return}
  cadTeileCache=data;
  const alt=$("cadTeileBox");
  if(alt)alt.remove();
  if(cockpitProjectId!==projectId)return;      // inzwischen ein anderes Projekt geoeffnet
  box.insertAdjacentHTML("beforeend",cadTeileHtml(data));
 }catch(e){cadTeileCache=[]}
}

function cadTeilUebernehmen(id){
 const t=cadTeileCache.find(x=>String(x.id)===String(id));
 if(!t||!cadTeilKannUebernehmen(t)||typeof measurementAlsVorlage!=="function")return false;
 const daten=JSON.parse(JSON.stringify(t.app_data));
 delete daten.cad;                                    // nur fuer die Herkunft, kein Feld der Massaufnahme
 cadTeilOffen={id:t.id,projectId:t.project_id,zeit:Date.now()};
 measurementAlsVorlage({type:"freies_profil",title:"",data:daten},t.project_id);
 if($("measType")&&$("measType").value!=="freies_profil"){cadTeilOffen=null;return false}   // Modul gesperrt
 if($("measTitle"))$("measTitle").value=((t.teil_label?t.teil_label+" ":"")+(t.name||"CAD-Teil")).trim();
 if(t.staerke_mm!=null&&typeof measStaerkeSetzen==="function")measStaerkeSetzen(Number(t.staerke_mm));
 return true;
}

// Nach erfolgreichem Speichern (js/16): die neue Massaufnahme am Teil vermerken.
async function cadTeilNachSpeichern(zeile){
 const o=cadTeilOffen;
 if(!o||!zeile||!zeile.id)return;
 cadTeilOffen=null;
 if(Date.now()-o.zeit>CAD_TEIL_GUELTIG_MS)return;
 try{
  await sb.from("cad_teile").update({measurement_id:zeile.id,status:"uebernommen"}).eq("id",o.id);
 }catch(e){}
}

document.addEventListener("click",e=>{
 const b=e.target.closest&&e.target.closest("[data-cad-teil-nehmen]");
 if(b)cadTeilUebernehmen(b.dataset.cadTeilNehmen);
});
