"use strict";
// ===========================================================================
// v3.392  Massaufnahme zur Bearbeitung an andere Mitarbeiter freigeben
// ---------------------------------------------------------------------------
// Wer nur "eigene" Massaufnahmen bearbeiten darf (Rechte, js/05a), kommt sonst nicht an die einer Kollegin. Die Person, die eine Massaufnahme angelegt hat
// (oder ein Administrator bzw. wer alle bearbeiten darf), kann sie hier einzelnen Personen zur Bearbeitung freigeben (Spalte measurements.bearbeiter).
// Durchgesetzt wird das in der Datenbank (Policies measurements_select_geteilt/-update_geteilt, Schutz-Trigger): die Oberflaeche zeigt es nur an.
// Die Freigabe ersetzt kein Recht - wer Massaufnahmen gar nicht bearbeiten darf, bekommt dadurch keines. Loeschen bleibt bei der ersten Person.
// Nicht zu verwechseln mit der ARBEITSFREIGABE fuer Ruesten/Montage (js/44, Workflow).
// ===========================================================================
let mtMessung=null,mtMeldung="",mtOk=true,mtBusy=false;

function mtIch(){return currentProfile?currentProfile.id:null}
function mtNamen(ids){
 return (Array.isArray(ids)?ids:[]).map(i=>(typeof profileName==="function"?profileName(i):"")||"Unbekannt").filter(Boolean);
}
// Darf diese Person die Freigabe der gezeigten Massaufnahme aendern? (Spiegelt den Schutz-Trigger der Datenbank.)
function mtDarfTeilen(m){
 if(!m||!m.id||!currentProfile)return false;
 if(currentProfile.role==="admin")return true;
 if(m.created_by&&m.created_by===currentProfile.id)return true;
 return !!(typeof meineRechte!=="undefined"&&meineRechte&&meineRechte.massaufnahme&&meineRechte.massaufnahme.bearbeiten==="alle");
}
// Wen kann man auswaehlen und warum nicht? Rueckgabe je Person: {id,name,stufe:"waehlbar"|"admin"|"alle"|"keine"}
function mtKandidaten(m){
 const ps=(typeof allProfiles!=="undefined"&&Array.isArray(allProfiles))?allProfiles:[];
 return ps.filter(p=>p&&p.id&&p.id!==mtIch()&&p.id!==(m&&m.created_by)).map(p=>{
  let stufe="waehlbar";
  if(p.role==="admin")stufe="admin";
  else if(typeof rechteVon==="function"){
   const r=rechteVon(p).massaufnahme;
   if(r&&r.bearbeiten==="alle")stufe="alle";
   else if(r&&r.bearbeiten==="keine")stufe="keine";
  }
  return {id:p.id,name:((p.first_name||"")+" "+(p.last_name||"")).trim()||"Ohne Namen",stufe};
 }).sort((a,b)=>a.name.localeCompare(b.name,"de"));
}
const MT_STUFE_TEXT={admin:"Administrator – darf ohnehin alles",alle:"darf ohnehin alle bearbeiten",keine:"hat kein Recht, Massaufnahmen zu bearbeiten (Einstellungen → Rechte)"};
// Kurzer Text fuer Listen ("an Eva, Max" bzw. "von Anna freigegeben") - leer, wenn nichts freigegeben ist oder es einen nichts angeht.
function mtListenText(m){
 const ids=m&&Array.isArray(m.bearbeiter)?m.bearbeiter:[];
 if(!ids.length)return "";
 if(ids.includes(mtIch())&&!mtDarfTeilen(m)){
  const von=m.created_by&&typeof profileName==="function"?profileName(m.created_by):"";
  return "🤝 "+(von?"von "+von+" ":"")+"zur Bearbeitung freigegeben";
 }
 if(!mtDarfTeilen(m))return "";
 const n=mtNamen(ids);
 return "🤝 freigegeben an "+n.slice(0,2).join(", ")+(n.length>2?" +"+(n.length-2):"");
}
function mtHtml(){
 const box=document.getElementById("measTeilenBereich");
 if(!box)return "";
 const m=mtMessung;
 const meld=mtMeldung?`<div class="small ${mtOk?"a2-ol-ok":"a2-ol-fehler"}">${esc(mtMeldung)}</div>`:"";
 const kopf='<h3 style="margin:0 0 4px">🤝 Zur Bearbeitung freigeben</h3>';
 if(!m||!m.id)return kopf+'<div class="small">Nach dem ersten Speichern kannst du diese Massaufnahme anderen Mitarbeitern zur Bearbeitung freigeben.</div>';
 const ids=Array.isArray(m.bearbeiter)?m.bearbeiter:[];
 if(!mtDarfTeilen(m)){
  if(!ids.length)return "";   // nichts freigegeben und nicht meine Sache: der Bereich bleibt weg
  return kopf+`<div class="small">${ids.includes(mtIch())?"Diese Massaufnahme wurde dir "+(m.created_by&&typeof profileName==="function"&&profileName(m.created_by)?"von "+esc(profileName(m.created_by))+" ":"")+"zur Bearbeitung freigegeben. Löschen und Weitergeben bleibt bei der Person, die sie angelegt hat.":"Freigegeben an: "+esc(mtNamen(ids).join(", "))}</div>`;
 }
 const kand=mtKandidaten(m);
 const zeilen=kand.map(k=>{
  const an=ids.includes(k.id);
  if(k.stufe!=="waehlbar")return `<label class="rechte-schalter" style="opacity:.65"><input type="checkbox" disabled${an?" checked":""}> ${esc(k.name)} <span class="small">– ${esc(MT_STUFE_TEXT[k.stufe])}</span></label>`;
  return `<label class="rechte-schalter"><input type="checkbox" data-mt-person="${esc(k.id)}"${an?" checked":""}${mtBusy?" disabled":""}> ${esc(k.name)}</label>`;
 }).join("");
 return kopf+`<div class="small">Wer hier angehakt ist, darf <b>diese</b> Massaufnahme ansehen und bearbeiten – auch mit dem Recht «nur eigene». Löschen und Weitergeben bleibt bei dir. Das ist nicht die Arbeitsfreigabe fürs Rüsten.</div>
 ${zeilen||'<div class="small">Keine weiteren Mitarbeiter.</div>'}
 <div class="bar"><button type="button" class="green" id="mtSpeichern"${mtBusy?" disabled":""}>💾 Freigabe speichern</button></div>${meld}`;
}
function mtZeichnen(m){
 if(m!==undefined)mtMessung=m;
 const box=document.getElementById("measTeilenBereich");
 if(!box)return;
 const h=mtHtml();
 box.innerHTML=h;box.hidden=!h;
}
function mtAngehakt(){
 return [...document.querySelectorAll("#measTeilenBereich [data-mt-person]")].filter(c=>c.checked).map(c=>c.getAttribute("data-mt-person"));
}
async function mtSpeichern(){
 const m=mtMessung;
 if(!m||!m.id||mtBusy||!mtDarfTeilen(m))return;
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Freigabe"))return;
 // Nicht waehlbare Personen (Admin, "alle", "keine") bleiben unveraendert, wie sie schon in der Liste stehen
 const bisher=Array.isArray(m.bearbeiter)?m.bearbeiter:[];
 const waehlbar=new Set(mtKandidaten(m).filter(k=>k.stufe==="waehlbar").map(k=>k.id));
 const ids=[...new Set([...bisher.filter(i=>!waehlbar.has(i)),...mtAngehakt()])];
 mtBusy=true;mtOk=true;mtMeldung="Wird gespeichert …";mtZeichnen();
 let fehler=null,antwort=null;
 try{
  const r=await sb.from("measurements").update({bearbeiter:ids}).eq("id",m.id).select("id,bearbeiter").maybeSingle();
  fehler=r.error;antwort=r.data;
 }catch(e){fehler=e}
 mtBusy=false;
 if(fehler||!antwort){
  mtOk=false;mtMeldung=fehler?(typeof dbFehlerText==="function"?dbFehlerText(fehler,"Die Freigabe konnte nicht gespeichert werden."):"Die Freigabe konnte nicht gespeichert werden."):"Die Freigabe wurde nicht gespeichert (fehlende Berechtigung?).";
  mtZeichnen();return;
 }
 const neu=Array.isArray(antwort.bearbeiter)?antwort.bearbeiter:ids;
 m.bearbeiter=neu;
 [typeof allMeasurements!=="undefined"?allMeasurements:null,typeof projectMeasurementsCache!=="undefined"?projectMeasurementsCache:null].forEach(l=>{
  if(Array.isArray(l)){const z=l.find(x=>x&&x.id===m.id);if(z)z.bearbeiter=neu}
 });
 mtOk=true;mtMeldung=neu.length?"Gespeichert: freigegeben an "+mtNamen(neu).join(", ")+".":"Gespeichert: nicht mehr freigegeben.";
 mtZeichnen();
}
document.addEventListener("click",e=>{
 const t=e.target&&e.target.closest?e.target:null;
 if(t&&t.closest("#mtSpeichern"))mtSpeichern();
});
