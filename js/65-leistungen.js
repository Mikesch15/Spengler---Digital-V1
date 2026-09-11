/* ==========================================================================
   LEISTUNGEN — Version 3.37
   ==========================================================================
   Auftrag vom 09.09.2026: "Geplant -> Ausgefuehrt" haengt in v3.36 direkt an
   den Positionen einer Massaufnahme - das ist fachlich falsch. Eine
   Massaufnahme bleibt rein technisch (Stuecke/Zuschnitte, Blechstoesse,
   Blechflaeche ...). Diese Werte sind KEINE automatischen Offerten- oder
   Ausmasspositionen.

   Neue Struktur:
     PROJEKT -> OFFERTE -> LEISTUNGEN -> MASSAUFNAHMEN -> AUSMASS

   KEIN Feature-Schalter noetig: anders als bei Angeboten (js/63, eigene
   Tabelle "feature_access", weil zunaechst nur eine einzelne Person Zugriff
   haben sollte) verwendet "leistungen" dieselbe RLS wie jede andere
   Projekttabelle - eine restriktive tenant_boundary-Policy plus die vier
   bestehenden has_permission('projects','view'|'edit')-Policies. Jeder, der
   ein Projekt sehen/bearbeiten darf, darf auch dessen Leistungen sehen/
   bearbeiten. Kein zweites Berechtigungssystem noetig.

   Ausfuehrung liegt auf LEISTUNGSEBENE, nicht auf Massaufnahme-Ebene:
   "leistungen" traegt dafuer bereits die Spalten status/menge/einheit/
   ausgefuehrte_menge/bemerkung direkt am Datensatz - keine zusaetzliche
   Tabelle noetig. Die drei Status-Werte (nicht_ausgefuehrt/teilweise/
   vollstaendig) sind dieselben wie in js/64-ausfuehrung.js - deshalb wird
   AUSF_STATUS/ausfStatusText()/ausfBadge() aus js/64 unveraendert
   wiederverwendet, keine zweite Uebersetzungstabelle.

   js/64-ausfuehrung.js (v3.36, positionsgenaue Ausfuehrung je Massaufnahme)
   bleibt VOLLSTAENDIG UNVERAENDERT und funktioniert unabhaengig weiter -
   der Auftrag verlangt ausdruecklich "nicht blind loeschen, bestehende
   Daten nicht zerstoeren". Beide Ebenen (Leistung UND Massaufnahme-Position)
   koennen nebeneinander bestehen; es ist keine Migration der bestehenden
   Zeile in "ausfuehrungen" noetig, weil sie eine andere fachliche Frage
   beantwortet ("ist Position 3 dieser einen Massaufnahme fertig?") als die
   neue Leistungs-Ausfuehrung ("ist die Leistung 'Dachentwaesserung'
   fertig?").

   "Neue Leistung"-Knopf bewusst OHNE data-cockpit-new (wie schon bei
   Angeboten in js/63 begruendet und hier durch Lesen des tatsaechlichen
   Klick-Handlers in js/24-projekt-cockpit.js empirisch bestaetigt): der
   bestehende Handler kennt nur "rep" als Sonderfall und wuerde jeden
   anderen Wert - auch "leistung" - faelschlich in den Ausmass-Typen-
   waehler leiten. Eigener Knopf mit eigenem Handler stattdessen, exakt
   nach dem Muster von #cockpitNeueOfferte.

   Auftrag (heute): "entferne ausmass vorbereitung komplett" - die zentrale
   Ausmass-Vorbereitung (Kandidatenliste aus Leistungen/Massaufnahme-Werten
   zum Anhaken, "Uebernehmen" ins Ausmass) ist deshalb komplett aus dem
   Projekt-Cockpit entfernt (Karte, Arbeitsstand-Zeile, COCKPIT_BEREICHE-
   Eintrag, leim*-Funktionen). Ein neues Ausmass wird wieder ausschliesslich
   ueber den bestehenden, unveraenderten Weg in js/17-ausmass.js angelegt
   ("＋ Neues Ausmass"). Die Tabelle "ausmass_kandidaten" bleibt bewusst in
   der Datenbank bestehen (keine Migration/kein Drop ohne ausdruecklichen
   Auftrag, CLAUDE.md) - sie wird nur nicht mehr befuellt. Leistungen selbst
   sind davon unberuehrt und funktionieren unveraendert weiter.
   ========================================================================== */

let projectLeistungenCache=[];
let currentLeistungId=null;
let currentLeistungMeta=null;
let leiEditReturnTo="cockpitLeistungen";
let leiAusgewaehlteMassaufnahmen=[];
let leiAngebotePositionen=[]; // {angebotId,angebotTitel,pos,description,quantity,unit}

if(typeof COCKPIT_BEREICHE==="object"&&COCKPIT_BEREICHE){
 COCKPIT_BEREICHE.leistungen={
  count:"cockpitLeistungenCount",body:"cockpitLeistungenBody",card:"cockpitLeistungenCard",
  mark:"cockpitLeistungenMark",stand:"cockpitLeistungenStand",leer:"Noch keine",
  load:id=>loadProjectLeistungen(id)
 };
}

async function loadProjectLeistungen(projectId){
 const box=$("cockpitLeistungenBody");
 if(!box)return undefined;
 box.innerHTML="Lädt…";
 const {data,error}=await sb.from("leistungen").select("*").eq("project_id",projectId).order("created_at",{ascending:false});
 if(error){box.innerHTML=`<div class="error">Fehler: ${esc(error.message)}</div>`;return undefined}
 projectLeistungenCache=data||[];
 if(!projectLeistungenCache.length){box.innerHTML=`<div class="muted">Noch keine Leistungen erfasst.</div>`;return 0}
 box.innerHTML=projectLeistungenCache.map(l=>`
  <div class="report-row">
   <div class="report-row-info">
    <b>${esc(l.bezeichnung||"Ohne Bezeichnung")}</b>
    ${typeof ausfBadge==="function"?ausfBadge(l.status):""}
    <span class="muted">${l.angebot_position?`Offerte-Pos. ${esc(l.angebot_position)}`:"Zusatzleistung"}${l.menge?` · ${esc(String(l.menge))} ${esc(l.einheit||"")}`:""}</span>
   </div>
   <div class="report-row-actions">
    <button type="button" class="gray" data-open-project-leistung="${l.id}">✏️ Öffnen</button>
    <button type="button" class="red" data-del-project-leistung="${l.id}">🗑</button>
   </div>
  </div>`).join("");
 return projectLeistungenCache.length;
}

async function leiLadeAngebotePositionen(projectId){
 leiAngebotePositionen=[];
 const {data,error}=await sb.from("angebote").select("id,title,positions").eq("project_id",projectId);
 if(error||!data)return;
 for(const a of data){
  const pos=Array.isArray(a.positions)?a.positions:[];
  for(const p of pos){
   leiAngebotePositionen.push({
    angebotId:a.id,angebotTitel:a.title||"Offerte",
    pos:p.pos||"",description:p.description||"",quantity:p.quantity,unit:p.unit||""
   });
  }
 }
}

function leiRenderAngebotAuswahl(){
 const sel=$("leiAngebotPosition");
 if(!sel)return;
 const optionen=leiAngebotePositionen.map((p,i)=>
  `<option value="${i}">${esc(p.angebotTitel)} · ${esc(p.pos)} ${esc(p.description)}</option>`).join("");
 sel.innerHTML=`<option value="">– keine Offertenposition (Zusatzleistung) –</option>${optionen}`;
}

function leiRenderMassaufnahmenAuswahl(){
 const box=$("leiMassaufnahmenListe");
 if(!box)return;
 const liste=Array.isArray(projectMeasurementsCache)?projectMeasurementsCache:[];
 if(!liste.length){box.innerHTML=`<div class="muted">Noch keine Massaufnahmen in diesem Projekt.</div>`;return}
 box.innerHTML=liste.map(m=>{
  const bez=m.title||(typeof MEAS_TYPE_LABELS==="object"?MEAS_TYPE_LABELS[m.type]:m.type)||m.type;
  const checked=leiAusgewaehlteMassaufnahmen.indexOf(m.id)>=0?"checked":"";
  return `<label class="check-row"><input type="checkbox" data-lei-mess="${m.id}" ${checked}> ${esc(bez)}</label>`;
 }).join("");
}

function leiEingabenAusFeldern(){
 return{
  bezeichnung:($("leiBezeichnung")&&$("leiBezeichnung").value||"").trim(),
  menge:($("leiMenge")&&$("leiMenge").value||"").trim(),
  einheit:($("leiEinheit")&&$("leiEinheit").value||"").trim(),
  bemerkung:($("leiBemerkung")&&$("leiBemerkung").value||"").trim(),
  status:($("leiStatus")&&$("leiStatus").value)||"nicht_ausgefuehrt",
  ausgefuehrte_menge:($("leiAusgefuehrteMenge")&&$("leiAusgefuehrteMenge").value||"").trim()
 };
}

function newLeistung(){
 currentLeistungId=null;
 currentLeistungMeta=null;
 leiAusgewaehlteMassaufnahmen=[];
 if($("leiBezeichnung"))$("leiBezeichnung").value="";
 if($("leiMenge"))$("leiMenge").value="";
 if($("leiEinheit"))$("leiEinheit").value="";
 if($("leiBemerkung"))$("leiBemerkung").value="";
 if($("leiStatus"))$("leiStatus").value="nicht_ausgefuehrt";
 if($("leiAusgefuehrteMenge"))$("leiAusgefuehrteMenge").value="";
 if($("leiAngebotPosition"))$("leiAngebotPosition").value="";
 leiEditReturnTo="cockpitLeistungen";
 leiLadeAngebotePositionen(cockpitProjectId).then(leiRenderAngebotAuswahl);
 leiRenderMassaufnahmenAuswahl();
 $("leistungEditModal").hidden=false;
 $("projectCockpitModal").hidden=true;
}

async function openLeistung(l){
 currentLeistungId=l.id;
 currentLeistungMeta=l;
 if($("leiBezeichnung"))$("leiBezeichnung").value=l.bezeichnung||"";
 if($("leiMenge"))$("leiMenge").value=l.menge||"";
 if($("leiEinheit"))$("leiEinheit").value=l.einheit||"";
 if($("leiBemerkung"))$("leiBemerkung").value=l.bemerkung||"";
 if($("leiStatus"))$("leiStatus").value=l.status||"nicht_ausgefuehrt";
 if($("leiAusgefuehrteMenge"))$("leiAusgefuehrteMenge").value=l.ausgefuehrte_menge||"";
 leiEditReturnTo="cockpitLeistungen";
 await leiLadeAngebotePositionen(l.project_id);
 leiRenderAngebotAuswahl();
 if($("leiAngebotPosition")&&l.angebot_id){
  const idx=leiAngebotePositionen.findIndex(p=>p.angebotId===l.angebot_id&&p.pos===l.angebot_position);
  if(idx>=0)$("leiAngebotPosition").value=String(idx);
 }
 const {data:links}=await sb.from("leistung_massaufnahmen").select("measurement_id").eq("leistung_id",l.id);
 leiAusgewaehlteMassaufnahmen=(links||[]).map(r=>r.measurement_id);
 leiRenderMassaufnahmenAuswahl();
 $("leistungEditModal").hidden=false;
 $("projectCockpitModal").hidden=true;
}

async function leiEditZurueck(){
 $("leistungEditModal").hidden=true;
 if(leiEditReturnTo==="cockpitLeistungen"&&cockpitProjectId&&typeof zurueckInsCockpit==="function"){
  await zurueckInsCockpit("leistungen");
 }else if($("startScreen")){
  showStart();
 }
 leiEditReturnTo="cockpitLeistungen";
}

async function leiSpeichern(){
 const e=leiEingabenAusFeldern();
 if(!e.bezeichnung){alert("Bitte eine Bezeichnung eintragen.");return}
 let angebotId=null,angebotPosition=null;
 const sel=$("leiAngebotPosition");
 if(sel&&sel.value!==""){
  const p=leiAngebotePositionen[Number(sel.value)];
  if(p){angebotId=p.angebotId;angebotPosition=p.pos}
 }
 const payload={
  project_id:cockpitProjectId,
  bezeichnung:e.bezeichnung,menge:e.menge||null,einheit:e.einheit||null,
  bemerkung:e.bemerkung||null,status:e.status,ausgefuehrte_menge:e.ausgefuehrte_menge||null,
  angebot_id:angebotId,angebot_position:angebotPosition
 };
 let leistungId=currentLeistungId;
 if(currentLeistungId){
  const {data,error}=await sb.from("leistungen").update(payload).eq("id",currentLeistungId).select();
  if(error){alert("Fehler beim Speichern: "+error.message);return}
  if(!data||!data.length){alert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return}
 }else{
  const {data,error}=await sb.from("leistungen").insert(payload).select();
  if(error){alert("Fehler beim Speichern: "+error.message);return}
  if(!data||!data.length){alert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return}
  leistungId=data[0].id;
 }
 // Massaufnahme-Verknuepfungen: bestehende loeschen, ausgewaehlte neu anlegen.
 const {error:delErr}=await sb.from("leistung_massaufnahmen").delete().eq("leistung_id",leistungId);
 if(delErr){alert("Fehler beim Aktualisieren der Massaufnahme-Verknüpfungen: "+delErr.message);return}
 if(leiAusgewaehlteMassaufnahmen.length){
  const rows=leiAusgewaehlteMassaufnahmen.map(mid=>({leistung_id:leistungId,measurement_id:mid}));
  const {data:ins,error:insErr}=await sb.from("leistung_massaufnahmen").insert(rows).select();
  if(insErr){alert("Fehler beim Verknüpfen der Massaufnahmen: "+insErr.message);return}
  if(!ins||ins.length!==rows.length){alert("Nicht alle Verknüpfungen konnten gespeichert werden. Fehlt die nötige Berechtigung?");return}
 }
 await leiEditZurueck();
}

async function leiLoeschen(id){
 if(!confirm("Diese Leistung wirklich löschen?"))return;
 const {error}=await sb.from("leistungen").delete().eq("id",id);
 if(error){alert("Fehler beim Löschen: "+error.message);return}
 await cockpitBereichAktualisieren("leistungen");
}

document.addEventListener("change",e=>{
 const cb=e.target.closest?e.target.closest("[data-lei-mess]"):null;
 if(cb){
  const id=Number(cb.dataset.leiMess);
  if(cb.checked){if(leiAusgewaehlteMassaufnahmen.indexOf(id)<0)leiAusgewaehlteMassaufnahmen.push(id)}
  else{leiAusgewaehlteMassaufnahmen=leiAusgewaehlteMassaufnahmen.filter(x=>x!==id)}
 }
});

document.addEventListener("click",e=>{
 const openBtn=e.target.closest?e.target.closest("[data-open-project-leistung]"):null;
 if(openBtn){
  const l=projectLeistungenCache.find(x=>String(x.id)===openBtn.dataset.openProjectLeistung);
  if(l)openLeistung(l);
  return;
 }
 const delBtn=e.target.closest?e.target.closest("[data-del-project-leistung]"):null;
 if(delBtn){leiLoeschen(Number(delBtn.dataset.delProjectLeistung));return}
 if(e.target.closest&&e.target.closest("#cockpitNeueLeistung")){newLeistung();return}
 if(e.target.closest&&e.target.closest("#leiSpeichernBtn")){leiSpeichern();return}
 if(e.target.closest&&e.target.closest("#leiAbbrechenBtn")){leiEditZurueck();return}
});
