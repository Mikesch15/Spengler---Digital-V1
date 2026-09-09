/* ==========================================================================
   LEISTUNGEN + ZENTRALE AUSMASS-VORBEREITUNG — Version 3.37
   ==========================================================================
   Auftrag vom 09.09.2026: "Geplant -> Ausgefuehrt" haengt in v3.36 direkt an
   den Positionen einer Massaufnahme - das ist fachlich falsch. Eine
   Massaufnahme bleibt rein technisch (Stuecke/Zuschnitte, Blechstoesse,
   Blechflaeche ...). Diese Werte sind KEINE automatischen Offerten- oder
   Ausmasspositionen.

   Neue Struktur:
     PROJEKT -> OFFERTE -> LEISTUNGEN -> MASSAUFNAHMEN -> AUSMASS
   Kernprinzip:
     Leistungen / technische Massaufnahmewerte / Zusatzleistungen
       -> AUSMASS-VORBEREITUNG -> Benutzer waehlt aus -> AUSMASS

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

   "Uebernehmen"-Mechanik (Ausmass-Vorbereitung -> Ausmass):
   Es wird bewusst KEINE bestehende Ausmass-Zeile "ergaenzt" (das koennte
   fremde, bereits erfasste Positionen verfaelschen), sondern bei jedem
   Klick auf "Uebernehmen" ein NEUES ausmass-Dokument angelegt
   (type:'offerte_erfassen', title "Ausmass-Vorbereitung <Datum>"). Das
   bestehende Ausmass-Modul (js/17-ausmass.js) bleibt dadurch komplett
   unangetastet - es sieht nur ein ganz gewoehnliches, neues Dokument.

   Feldform-Abgleich (WICHTIG, spart eine Fehlerquelle):
   - Leistungen und angebote.positions[] verwenden zufaellig bereits exakt
     dieselbe Form wie ausmass.positions[] bei type='offerte_erfassen':
     {pos, description, quantity, unit} - keine Umbenennung noetig.
   - measurements.data.ausmass[] verwendet dagegen die Form
     {pos, bezeichnung, menge, einheit, herkunft, teil} - hier wird beim
     Uebernehmen ausdruecklich umbenannt:
       description = bezeichnung, quantity = menge, unit = einheit.
   Diese Umbenennung ist eine reine Kopie beim Uebernehmen, sie schreibt
   niemals in measurements zurueck - die Massaufnahme selbst bleibt
   unveraendert (Auftrag: "Die Auswahl darf die urspruengliche Massaufnahme
   NICHT veraendern").

   Kandidaten fuer die Ausmass-Vorbereitung werden bei jedem Oeffnen frisch
   berechnet (Leistungen + measurements.data.ausmass), nicht zwischen-
   gespeichert - eine bereits genommene Position (in ausmass_kandidaten
   verzeichnet) wird aus der Kandidatenliste ausgeschlossen, damit dieselbe
   Position nicht zweimal ins Ausmass wandert.

   "Neue Leistung"-Knopf bewusst OHNE data-cockpit-new (wie schon bei
   Angeboten in js/63 begruendet und hier durch Lesen des tatsaechlichen
   Klick-Handlers in js/24-projekt-cockpit.js empirisch bestaetigt): der
   bestehende Handler kennt nur "rep" als Sonderfall und wuerde jeden
   anderen Wert - auch "leistung" - faelschlich in den Ausmass-Typen-
   waehler leiten. Eigener Knopf mit eigenem Handler stattdessen, exakt
   nach dem Muster von #cockpitNeueOfferte.
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
 // Eine geloeschte Leistung darf nicht als Kandidat in einer bereits
 // offenen Ausmass-Vorbereitung stehen bleiben - deshalb hier mit
 // aktualisieren, nicht nur die Leistungsliste.
 await cockpitBereichAktualisieren("ausmassVorbereitung");
}

/* ==========================================================================
   AUSMASS-VORBEREITUNG
   Zentrale Uebersicht: alle nicht bereits uebernommenen Kandidaten aus
   Leistungen und aus measurements.data.ausmass, zum Anhaken. Wird bei jedem
   Oeffnen frisch berechnet, nichts wird zwischengespeichert ausser dem, was
   der Benutzer tatsaechlich uebernimmt (ausmass_kandidaten).
   ========================================================================== */

let leimKandidaten=[]; // {key,quelle,bezeichnung,menge,einheit,leistungId,measurementId,measurementPos}
let leimAusgewaehlt=new Set();

if(typeof COCKPIT_BEREICHE==="object"&&COCKPIT_BEREICHE){
 COCKPIT_BEREICHE.ausmassVorbereitung={
  count:"cockpitAusmassVorbCount",body:"cockpitAusmassVorbBody",card:"cockpitAusmassVorbCard",
  mark:"cockpitAusmassVorbMark",stand:"cockpitAusmassVorbStand",leer:"Keine Kandidaten",
  load:id=>leimLaden(id)
 };
}

async function leimLaden(projectId){
 const box=$("cockpitAusmassVorbBody");
 if(!box)return undefined;
 box.innerHTML="Lädt…";
 leimKandidaten=[];
 leimAusgewaehlt=new Set();

 const [{data:leistungen,error:e1},{data:messungen,error:e2},{data:bereits,error:e3}]=await Promise.all([
  sb.from("leistungen").select("id,bezeichnung,menge,einheit").eq("project_id",projectId),
  sb.from("measurements").select("id,type,title,data").eq("project_id",projectId),
  sb.from("ausmass_kandidaten").select("quelle_typ,leistung_id,measurement_id,measurement_pos").eq("project_id",projectId)
 ]);
 if(e1||e2||e3){box.innerHTML=`<div class="error">Fehler: ${esc((e1||e2||e3).message)}</div>`;return undefined}

 const genommenLeistung=new Set((bereits||[]).filter(b=>b.quelle_typ==="leistung").map(b=>b.leistung_id));
 const genommenMess=new Set((bereits||[]).filter(b=>b.quelle_typ==="massaufnahme").map(b=>`${b.measurement_id}:${b.measurement_pos}`));

 for(const l of (leistungen||[])){
  if(genommenLeistung.has(l.id))continue;
  if(!l.bezeichnung)continue;
  leimKandidaten.push({
   key:`leistung:${l.id}`,quelle:"Leistung",bezeichnung:l.bezeichnung,
   menge:l.menge||"",einheit:l.einheit||"",leistungId:l.id,measurementId:null,measurementPos:null
  });
 }
 for(const m of (messungen||[])){
  const liste=(m.data&&Array.isArray(m.data.ausmass))?m.data.ausmass:[];
  for(const p of liste){
   const posKey=`${m.id}:${p.pos}`;
   if(genommenMess.has(posKey))continue;
   if(!p.bezeichnung)continue;
   leimKandidaten.push({
    key:`mess:${posKey}`,quelle:"Massaufnahme",bezeichnung:p.bezeichnung,
    menge:p.menge!=null?String(p.menge):"",einheit:p.einheit||"",
    leistungId:null,measurementId:m.id,measurementPos:p.pos
   });
  }
 }

 leimRenderListe();
 return leimKandidaten.length;
}

function leimRenderListe(){
 const box=$("cockpitAusmassVorbBody");
 if(!box)return;
 if(!leimKandidaten.length){box.innerHTML=`<div class="muted">Keine Kandidaten für die Ausmass-Vorbereitung.</div>`;return}
 box.innerHTML=`
  <div id="leimListe">
  ${leimKandidaten.map(k=>`
   <label class="check-row">
    <input type="checkbox" data-leim-key="${esc(k.key)}" ${leimAusgewaehlt.has(k.key)?"checked":""}>
    <b>${esc(k.bezeichnung)}</b>
    <span class="muted">${esc(k.menge||"")} ${esc(k.einheit||"")} · Quelle: ${esc(k.quelle)}</span>
   </label>`).join("")}
  </div>
  <div class="bar"><button type="button" class="blue" id="leimUebernehmenBtn">✓ Ausgewählte ins Ausmass übernehmen</button></div>`;
}

async function leimUebernehmen(){
 const gewaehlt=leimKandidaten.filter(k=>leimAusgewaehlt.has(k.key));
 if(!gewaehlt.length){alert("Bitte mindestens eine Position auswählen.");return}
 const positions=gewaehlt.map((k,i)=>({
  pos:String(i+1),description:k.bezeichnung,quantity:k.menge||"",unit:k.einheit||""
 }));
 const heute=new Date().toISOString().slice(0,10);
 const {data:neu,error:ausErr}=await sb.from("ausmass").insert({
  project_id:cockpitProjectId,type:"offerte_erfassen",
  title:`Ausmass-Vorbereitung ${heute}`,positions
 }).select();
 if(ausErr){alert("Fehler beim Anlegen des Ausmasses: "+ausErr.message);return}
 if(!neu||!neu.length){alert("Es wurde nichts angelegt. Fehlt die nötige Berechtigung?");return}
 const ausmassId=neu[0].id;
 const kandidatenRows=gewaehlt.map(k=>({
  project_id:cockpitProjectId,
  quelle_typ:k.leistungId?"leistung":"massaufnahme",
  leistung_id:k.leistungId,measurement_id:k.measurementId,measurement_pos:k.measurementPos,
  bezeichnung:k.bezeichnung,menge:k.menge||null,einheit:k.einheit||null,ausmass_id:ausmassId
 }));
 const {data:ins,error:insErr}=await sb.from("ausmass_kandidaten").insert(kandidatenRows).select();
 if(insErr){alert("Das Ausmass wurde angelegt, die Zuordnung ist aber fehlgeschlagen: "+insErr.message);return}
 if(!ins||ins.length!==kandidatenRows.length){alert("Nicht alle Positionen konnten zugeordnet werden.");return}
 await Promise.all([cockpitBereichAktualisieren("am"),cockpitBereichAktualisieren("ausmassVorbereitung")]);
 alert(`✓ ${gewaehlt.length} Position(en) ins neue Ausmass "Ausmass-Vorbereitung ${heute}" übernommen.`);
}

document.addEventListener("change",e=>{
 const cb=e.target.closest?e.target.closest("[data-lei-mess]"):null;
 if(cb){
  const id=Number(cb.dataset.leiMess);
  if(cb.checked){if(leiAusgewaehlteMassaufnahmen.indexOf(id)<0)leiAusgewaehlteMassaufnahmen.push(id)}
  else{leiAusgewaehlteMassaufnahmen=leiAusgewaehlteMassaufnahmen.filter(x=>x!==id)}
  return;
 }
 const kb=e.target.closest?e.target.closest("[data-leim-key]"):null;
 if(kb){
  const key=kb.dataset.leimKey;
  if(kb.checked)leimAusgewaehlt.add(key);else leimAusgewaehlt.delete(key);
 }
});

document.addEventListener("click",e=>{
 if(e.target.closest&&e.target.closest("#leimUebernehmenBtn")){leimUebernehmen();return}
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
