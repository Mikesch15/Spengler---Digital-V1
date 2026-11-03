"use strict";
// ---------------------------------------------------------------------------
// v3.425  Profil aus der App an das CAD senden
// ---------------------------------------------------------------------------
// An einer Massaufnahme «Freies Profil» (Projekt-Cockpit) gibt es «An CAD senden»:
// Länge und Stückzahl abfragen, dann eine Zeile in `cad_profil_auftraege`. Das
// Fusion-Add-in «Spengler Digital CAD» zeigt die offenen Aufträge des Auftrags
// (Projekt = Auftragsnummer), baut das Blech mit Schenkeln, Winkeln und Länge und
// setzt den Status auf «gebaut». Die Schenkel werden beim Senden KOPIERT: eine
// spätere Änderung der Massaufnahme verändert einen gesendeten Auftrag nicht.
//
// Unter der Massaufnahmen-Liste steht die Box «An das CAD gesendet» (nur wenn es
// Aufträge gibt): offen = wartet auf das CAD (zurückziehbar), gebaut = im CAD
// erledigt (entfernbar). Die Firmengrenze erzwingt allein die RLS-Policy
// tenant_boundary_cad_profil_auftraege; geschrieben wird mit dem Recht «Projekte».
// ---------------------------------------------------------------------------

let cadAuftraegeCache=[];

// Nur «Freies Profil» mit mindestens zwei Schenkeln (bestehendes Blech + eine Biegung) lässt sich im CAD bauen.
function cadSendenKannProfil(m){
 const d=m&&m.data;
 return !!(m&&m.type==="freies_profil"&&d&&Array.isArray(d.schenkel)&&d.schenkel.length>=2);
}

// Streifenlänge aus der Massaufnahme (längstes Segment), sonst null.
function cadSendenLaenge(m){
 const segs=(m&&m.data&&Array.isArray(m.data.segmente))?m.data.segmente:[];
 const l=segs.map(s=>Number(s&&s.laenge)).filter(x=>Number.isFinite(x)&&x>0);
 return l.length?Math.max(...l):null;
}

// Eingabe «1500» / «1500,5» → Zahl; sonst null. Grenzen und «ganz» wie in der Tabelle.
function cadSendenZahl(text,min,max,ganz){
 const t=String(text===undefined||text===null?"":text).trim().replace(",",".");
 if(!/^\d+(\.\d+)?$/.test(t))return null;
 const n=Number(t);
 if(!Number.isFinite(n)||n<min||n>max)return null;
 if(ganz&&!Number.isInteger(n))return null;
 return n;
}

// Zeile für die Tabelle. Die Schenkel werden kopiert (nur Länge und Winkel).
function cadSendenZeile(m,projectId,laenge,stueck){
 const schenkel=m.data.schenkel.map(s=>({laenge:Number(s.laenge),winkel:Number(s.winkel)||0}));
 return {project_id:projectId,measurement_id:m.id,titel:String(m.title||"Freies Profil").slice(0,200),
  laenge_mm:laenge,stueck:stueck,staerke_mm:m.staerke_mm!=null?Number(m.staerke_mm):null,daten:{schenkel}};
}

function cadSendenKnopf(m){
 return cadSendenKannProfil(m)
  ?`<button class="gray" data-cad-senden="${esc(m.id)}" title="Profil mit Länge und Stückzahl an das Fusion-Add-in senden">🖥 An CAD senden</button>`:"";
}

async function cadSendenAusfuehren(measId){
 const m=(typeof projectMeasurementsCache!=="undefined"?projectMeasurementsCache:[]).find(x=>String(x.id)===String(measId));
 if(!m||!cadSendenKannProfil(m))return false;
 const projectId=m.project_id;
 const vorschlag=cadSendenLaenge(m);
 const lText=await appPrompt("Länge des Profils in mm?"+(vorschlag?"":" (in der Massaufnahme steht keine Länge)"),vorschlag?String(vorschlag):"");
 if(lText===null)return false;
 const laenge=cadSendenZahl(lText,1,100000,false);
 if(laenge===null){await appAlert("Die Länge muss eine Zahl zwischen 1 und 100000 mm sein.");return false}
 const sText=await appPrompt("Wie viele Stück?","1");
 if(sText===null)return false;
 const stueck=cadSendenZahl(sText,1,999,true);
 if(stueck===null){await appAlert("Die Stückzahl muss eine ganze Zahl zwischen 1 und 999 sein.");return false}
 const {error}=await sb.from("cad_profil_auftraege").insert(cadSendenZeile(m,projectId,laenge,stueck));
 if(error){await appAlert("Konnte nicht an das CAD gesendet werden: "+error.message);return false}
 await appAlert("An das CAD gesendet: "+laenge+" mm, "+stueck+" Stück. Im Add-in: «Blech aus Massaufnahme» zeigt den Auftrag.");
 await cadSendenNachListe(projectId);
 return true;
}

function cadAuftragZeileHtml(a){
 const gebaut=a.status==="gebaut";
 const info=[Math.round(a.laenge_mm*10)/10+" mm",a.stueck+" Stück",a.staerke_mm!=null?a.staerke_mm+" mm Blech":""].filter(Boolean).join(" · ");
 return `<div class="report-row"><div class="report-row-info"><b>${esc(a.titel||"Profil")}</b><span>${esc(info)}</span>`
  +`<span class="meas-medien-hinweis">${gebaut?"✔ im CAD gebaut":"⏳ wartet auf das CAD"}</span></div>`
  +`<div class="report-row-actions"><button class="gray" data-cad-senden-weg="${esc(a.id)}">${gebaut?"Entfernen":"Zurückziehen"}</button></div></div>`;
}

function cadAuftraegeHtml(liste){
 if(!liste.length)return "";
 const offen=liste.filter(a=>a.status==="offen").length;
 return `<div id="cadAuftraegeBox" style="margin-top:14px"><h3 style="margin:8px 0">An das CAD gesendet`
  +` <span class="small">(${liste.length}${offen?", "+offen+" offen":""})</span></h3>`+liste.map(cadAuftragZeileHtml).join("")+`</div>`;
}

// Wird am Ende von loadProjectMeasurements() (js/09) aufgerufen - ohne Warten, ein Fehler hier stört die Liste nie.
async function cadSendenNachListe(projectId){
 try{
  const box=$("cockpitMeasBody");
  if(!box||!projectId)return;
  const {data,error}=await sb.from("cad_profil_auftraege").select("*").eq("project_id",projectId).neq("status","storniert").order("created_at",{ascending:false});
  if(error||!Array.isArray(data)){cadAuftraegeCache=[];return}
  cadAuftraegeCache=data.filter(a=>a&&a.laenge_mm!==undefined&&a.status);
  const alt=$("cadAuftraegeBox");
  if(alt)alt.remove();
  if(cockpitProjectId!==projectId)return;
  box.insertAdjacentHTML("beforeend",cadAuftraegeHtml(cadAuftraegeCache));
 }catch(e){cadAuftraegeCache=[]}
}

// Offen: zurückziehen (storniert, bleibt als Spur in der Datenbank). Gebaut: aus der Liste entfernen (ebenfalls storniert).
async function cadSendenWeg(id){
 const a=cadAuftraegeCache.find(x=>String(x.id)===String(id));
 if(!a)return false;
 const frage=a.status==="offen"?"Diesen Auftrag zurückziehen? Das CAD zeigt ihn dann nicht mehr an.":"Diesen erledigten Auftrag aus der Liste entfernen?";
 if(!(await appConfirm(frage)))return false;
 const {error}=await sb.from("cad_profil_auftraege").update({status:"storniert"}).eq("id",a.id);
 if(error){await appAlert("Konnte nicht geändert werden: "+error.message);return false}
 await cadSendenNachListe(a.project_id);
 return true;
}

document.addEventListener("click",e=>{
 const s=e.target.closest&&e.target.closest("[data-cad-senden]");
 if(s){cadSendenAusfuehren(s.dataset.cadSenden);return}
 const w=e.target.closest&&e.target.closest("[data-cad-senden-weg]");
 if(w)cadSendenWeg(w.dataset.cadSendenWeg);
});
