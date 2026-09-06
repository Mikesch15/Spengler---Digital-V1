// ---------------------------------------------------------------------------
// v3.16  Material der Massaufnahme -> Regierapport
// ---------------------------------------------------------------------------
// Feedback 05.09.2026:
//   "Im regierapport sollte es einen button geben, um materialien aus den
//    massaufnahmen des passenden objekts direkt in den regierapport zu
//    uebernehmen. Hierzu ist evt. in den einzelnen massaufnahmen eine liste
//    noetig, um zusaetzliche materialien zu erfassen, welche nicht
//    automatisch erzeugt werden"
//
// Zwei Teile, ein Datenfeld:
//   1. In der Massaufnahme eine Liste "Material fuer den Regierapport" -
//      Zeilen mit EDV-Nr. aus dem BESTEHENDEN Katalog (settings.materials)
//      und Menge. Gespeichert in measurements.rapport_material.
//   2. Im Regierapport ein Knopf, der diese Zeilen der Massaufnahmen des
//      gewaehlten Projekts anbietet und die ausgewaehlten uebernimmt.
//
// ES ENTSTEHT KEIN ZWEITER MATERIALKATALOG: gesucht wird mit dem bestehenden
// searchMaterials() aus js/06, uebernommen wird als gewoehnliche Zeile
// {date,no,qty} - dieselbe Form, die auch der Blechverbrauch seit je in
// mats schiebt. Preis, Bezeichnung, Dim. und Einheit kommen wie bei jeder
// anderen Zeile aus dem Katalog, es wird nichts mitkopiert.
//
// WARUM KEINE PREISE IN DER MASSAUFNAHME: die Massaufnahme haelt fest, WAS
// und WIE VIEL gebraucht wird. Was es kostet, entscheidet der Katalog zum
// Zeitpunkt des Rapports - ein mitgespeicherter Preis wuerde veralten.
"use strict";

let measRapportMaterial=[];        // Zeilen der offenen Massaufnahme
let rmatZeichnet=false;            // Sperre gegen das change beim Neuzeichnen

// ---- Liste in der Massaufnahme -------------------------------------------
function rmatZahl(v){return Number(String(v==null?"":v).replace(",","."))||0}

function measRapportMaterialZuruecksetzen(){
 measRapportMaterial=[];
 renderMeasRapportMaterial();
}
// Aus einem geladenen Datensatz. Es wird NICHTS erfunden: eine Aufnahme ohne
// die Spalte (vor v3.16 gespeichert) hat eine leere Liste.
function measRapportMaterialFuellen(m){
 const roh=(m&&Array.isArray(m.rapport_material))?m.rapport_material:[];
 measRapportMaterial=roh.map(z=>({no:String(z&&z.no!=null?z.no:""),qty:z&&z.qty!=null?z.qty:0}));
 renderMeasRapportMaterial();
}
// Fuer den Speicher-Payload. Leere Zeilen (weder Nummer noch Menge) fallen
// weg - sie waeren im Rapport nicht uebernehmbar.
function measRapportMaterialAusFormular(){
 return measRapportMaterial
  .filter(z=>String(z.no||"").trim()!=="")
  .map(z=>({no:String(z.no).trim(),qty:rmatZahl(z.qty)}));
}

function renderMeasRapportMaterial(){
 const box=$("measRapportMaterialBody");
 if(!box)return;
 rmatZeichnet=true;
 box.innerHTML=measRapportMaterial.length?measRapportMaterial.map((z,i)=>{
  const x=(typeof materialFor==="function")?materialFor(z.no):null;
  const text=x?`${esc(x[1])}${x[2]?" · "+esc(x[2]):""}${x[3]?" · "+esc(x[3]):""}`
   :(String(z.no||"").trim()?'<span class="rmat-unbekannt">Diese EDV-Nr. steht nicht im Katalog.</span>':"—");
  return `<div class="rmat-zeile">
   <div class="rmat-nr"><div class="search">
    <input data-rmat-nr="${i}" value="${esc(z.no)}" placeholder="EDV-Nr." autocomplete="off">
    <div id="rmatSug${i}" class="suggest"></div></div></div>
   <div class="rmat-text">${text}</div>
   <div class="rmat-menge"><input data-rmat-qty="${i}" type="number" step=".01" min="0" value="${esc(z.qty)}" placeholder="Menge"></div>
   <button type="button" class="red" data-rmat-weg="${i}" title="Zeile entfernen">×</button>
  </div>`;
 }).join(""):'<div class="small">Noch kein Material erfasst. Was hier steht, lässt sich im Regierapport dieses Projekts mit einem Knopf übernehmen.</div>';
 rmatZeichnet=false;
}

if($("measRapportMaterialBody")){
 $("measRapportMaterialBody").addEventListener("input",e=>{
  if(rmatZeichnet)return;
  const nr=e.target.dataset.rmatNr, qty=e.target.dataset.rmatQty;
  if(nr!==undefined){
   const i=Number(nr);
   measRapportMaterial[i].no=e.target.value;
   isDirty=true;
   // Vorschlagsliste wie in der Materialzeile des Rapports - derselbe
   // Katalog, dieselbe Funktion. Die Tabelle wird dabei NICHT neu
   // gezeichnet, sonst verliert das Feld beim Tippen den Fokus
   // (CLAUDE.md 66.1).
   const sug=$("rmatSug"+i);
   if(sug&&typeof searchMaterials==="function"){
    sug.innerHTML=searchMaterials(e.target.value).map(x=>
     `<div class="item" data-rmat-pick="${i}" data-no="${esc(x[0])}"><b>${esc(x[0])} · ${esc(x[1])}</b><span>${esc(x[2])} · ${esc(x[3])}</span></div>`).join("");
    if(sug.innerHTML&&typeof positionSuggest==="function")positionSuggest(e.target,sug);
   }
   return;
  }
  if(qty!==undefined){measRapportMaterial[Number(qty)].qty=e.target.value;isDirty=true}
 });
 // Die Vorschlagsliste steht ueber der Zeile und wuerde sonst das Mengenfeld
 // verdecken: der globale "ausserhalb geklickt"-Schliesser in js/07 greift
 // nicht, weil der Klick dann die Liste selbst trifft. Im Browser gemessen.
 // Die kurze Frist laesst einen Klick auf einen Vorschlag zuerst durch.
 $("measRapportMaterialBody").addEventListener("focusout",e=>{
  if(e.target.dataset&&e.target.dataset.rmatNr!==undefined){
   const box=$("rmatSug"+e.target.dataset.rmatNr);
   if(box)setTimeout(()=>{box.innerHTML=""},150);
  }
 });
 // Erst beim Verlassen des Feldes neu zeichnen - dann steht die Bezeichnung
 // aus dem Katalog daneben.
 $("measRapportMaterialBody").addEventListener("change",e=>{
  if(rmatZeichnet)return;
  if(e.target.dataset.rmatNr!==undefined)renderMeasRapportMaterial();
 });
 $("measRapportMaterialBody").addEventListener("click",e=>{
  const pick=e.target.closest?e.target.closest("[data-rmat-pick]"):null;
  if(pick){
   measRapportMaterial[Number(pick.dataset.rmatPick)].no=pick.dataset.no;
   isDirty=true; renderMeasRapportMaterial(); return;
  }
  const weg=e.target.closest?e.target.closest("[data-rmat-weg]"):null;
  if(weg){measRapportMaterial.splice(Number(weg.dataset.rmatWeg),1);isDirty=true;renderMeasRapportMaterial()}
 });
}
if($("measRapportMaterialAdd")){
 $("measRapportMaterialAdd").onclick=()=>{
  measRapportMaterial.push({no:"",qty:""});
  isDirty=true;
  renderMeasRapportMaterial();
 };
}

// ---- Uebernahme in den Regierapport ---------------------------------------
let rmatAngebot=[];                // [{mid,titel,no,qty,schon}]
let rmatAuswahl=new Set();

function rmatArtText(m){
 const art=(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])||m.type||"Massaufnahme";
 const t=String(m.title||"").trim();
 return art+(t?" · "+t:"");
}
// Steht diese EDV-Nr. schon im offenen Rapport? Dann wird sie NICHT
// vorgewaehlt - sonst waere sie nach einem zweiten Klick doppelt drin.
function rmatSchonImRapport(no){
 const zeilen=(typeof mats!=="undefined"&&mats)?mats:[];
 return zeilen.some(m=>String(m&&m.no!=null?m.no:"").trim()===String(no).trim());
}

async function rmatOeffnen(){
 if(!currentProjectId){
  alert("Bitte zuerst ein Projekt auswählen.\n\nÜbernommen wird das Material der Massaufnahmen genau dieses Projekts.");
  return;
 }
 if(typeof wsIstOffline==="function"&&wsIstOffline()){
  alert("Keine Verbindung.\n\nDie Massaufnahmen dieses Projekts lassen sich deshalb gerade nicht laden. "
   +"Material von Hand erfassen geht weiterhin.");
  return;
 }
 $("rmatModal").hidden=false;
 $("rmatListe").innerHTML='<div class="small">Wird geladen …</div>';
 $("rmatUebernehmenBtn").disabled=true;
 // Eine Abfrage. KEIN company_id-Filter im Client - die Firmengrenze
 // erzwingt allein die restriktive tenant_boundary_measurements.
 const {data,error}=await sb.from("measurements")
  .select("id,type,title,date,rapport_material")
  .eq("project_id",currentProjectId)
  .order("date",{ascending:true});
 if(error){
  $("rmatListe").innerHTML=`<div class="small" style="color:var(--red)">Die Massaufnahmen konnten nicht geladen werden: ${esc(error.message)}</div>`;
  return;
 }
 const aufnahmen=data||[];
 rmatAngebot=[]; rmatAuswahl=new Set();
 aufnahmen.forEach(m=>{
  (Array.isArray(m.rapport_material)?m.rapport_material:[]).forEach((z,k)=>{
   const no=String(z&&z.no!=null?z.no:"").trim();
   if(!no)return;
   const id=m.id+"-"+k;
   const schon=rmatSchonImRapport(no);
   rmatAngebot.push({id,mid:m.id,datum:m.date||"",titel:rmatArtText(m),no,qty:z.qty,schon});
   if(!schon)rmatAuswahl.add(id);
  });
 });
 renderRmatListe(aufnahmen);
}

function renderRmatListe(aufnahmen){
 const box=$("rmatListe");
 if(!box)return;
 if(!aufnahmen.length){
  box.innerHTML='<div class="small">Zu diesem Projekt gibt es noch keine Massaufnahme.</div>';
  rmatKnopfStand(); return;
 }
 box.innerHTML=aufnahmen.map(m=>{
  const zeilen=rmatAngebot.filter(a=>a.mid===m.id);
  if(!zeilen.length){
   return `<div class="rmat-gruppe">
    <div class="rmat-gruppe-kopf">${esc(rmatArtText(m))}</div>
    <div class="small">Kein Material erfasst. In der Massaufnahme unter „Material für den Regierapport“ eintragen.</div>
   </div>`;
  }
  return `<div class="rmat-gruppe">
   <div class="rmat-gruppe-kopf">${esc(rmatArtText(m))}</div>
   ${zeilen.map(a=>{
    const x=(typeof materialFor==="function")?materialFor(a.no):null;
    return `<label class="rmat-wahl">
     <input type="checkbox" data-rmat-wahl="${esc(a.id)}"${rmatAuswahl.has(a.id)?" checked":""}>
     <span class="rmat-wahl-text"><b>${esc(a.no)}${x?" · "+esc(x[1]):""}</b>
      <span class="small">Menge ${esc(String(a.qty))}${x&&x[3]?" "+esc(x[3]):""}${
       a.schon?' · <span class="rmat-schon">steht bereits im Rapport</span>':""}</span></span>
    </label>`;
   }).join("")}
  </div>`;
 }).join("");
 rmatKnopfStand();
}
// Die Zahl am Knopf ist die Zahl der Zeilen, die er wirklich uebernimmt.
// Steht dort 0, ist er gesperrt - man drueckt nie ins Leere.
function rmatKnopfStand(){
 const b=$("rmatUebernehmenBtn");
 if(!b)return;
 const n=rmatAuswahl.size;
 b.textContent="✓ Ausgewählte übernehmen ("+n+")";
 b.disabled=n===0;
}

if($("rmatListe")){
 $("rmatListe").addEventListener("change",e=>{
  const k=e.target.closest?e.target.closest("[data-rmat-wahl]"):null;
  if(!k)return;
  if(k.checked)rmatAuswahl.add(k.dataset.rmatWahl); else rmatAuswahl.delete(k.dataset.rmatWahl);
  rmatKnopfStand();
 });
}
if($("rmatAlle")){
 $("rmatAlle").onclick=()=>{rmatAngebot.forEach(a=>rmatAuswahl.add(a.id));
  document.querySelectorAll("[data-rmat-wahl]").forEach(k=>k.checked=true);rmatKnopfStand()};
}
if($("rmatKeine")){
 $("rmatKeine").onclick=()=>{rmatAuswahl.clear();
  document.querySelectorAll("[data-rmat-wahl]").forEach(k=>k.checked=false);rmatKnopfStand()};
}
if($("rmatUebernehmenBtn")){
 $("rmatUebernehmenBtn").onclick=()=>{
  const gewaehlt=rmatAngebot.filter(a=>rmatAuswahl.has(a.id));
  if(!gewaehlt.length)return;
  // Datum der Zeile: das der Massaufnahme (dort wurde das Material
  // gebraucht), sonst das Rapportdatum, sonst heute. Es wird keines
  // erfunden, das es nicht gibt.
  const heute=new Date().toISOString().slice(0,10);
  const rapportDatum=($("date")&&$("date").value)||"";
  gewaehlt.forEach(a=>{
   mats.push({date:a.datum||rapportDatum||heute,no:a.no,qty:rmatZahl(a.qty)});
  });
  isDirty=true;
  renderMain();
  $("rmatModal").hidden=true;
  alert(gewaehlt.length===1
   ? "1 Materialposition übernommen."
   : gewaehlt.length+" Materialpositionen übernommen.");
 };
}
if($("rmatOeffnen"))$("rmatOeffnen").onclick=rmatOeffnen;
if($("rmatSchliessen"))$("rmatSchliessen").onclick=()=>{$("rmatModal").hidden=true};
