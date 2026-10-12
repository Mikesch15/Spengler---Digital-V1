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

// ---- v3.319: Zuordnung Offertenposition <-> Leistung <-> Massaufnahmen ---------------------------------------
// Reine Hilfsfunktionen (ohne DOM), damit sie sich pruefen lassen.
//
// Eine Offertenposition wird durch Offerte + Positionsnummer + Anfang der Beschreibung gekennzeichnet. Die Nummer
// allein genuegt nicht: der PDF-Import liefert oft leere Nummern, mehrere Positionen koennen dieselbe haben. Frueher
// wurde nur (Offerte, Nummer) gespeichert und beim Oeffnen die ERSTE passende Position gewaehlt - bei gleicher Nummer
// die falsche - und beim naechsten Speichern (z. B. nur der Status) wurde die Zuordnung ueberschrieben oder, wenn
// keine passende Position gefunden wurde, auf "keine" gesetzt: die Verknuepfung ging still verloren.
function leiBeschrKurz(t){return String(t==null?"":t).replace(/\s+/g," ").trim().slice(0,120)}
function leiPositionFinden(liste,l){
 if(!l||!l.angebot_id)return {status:"keine"};
 const nr=String(l.angebot_position==null?"":l.angebot_position).trim();
 let kand=[];
 (liste||[]).forEach((p,i)=>{
  if(p.angebotId===l.angebot_id&&String(p.pos==null?"":p.pos).trim()===nr)kand.push(i);
 });
 const be=l.angebot_position_beschreibung?leiBeschrKurz(l.angebot_position_beschreibung):"";
 if(be&&kand.length>1){
  const eng=kand.filter(i=>leiBeschrKurz(liste[i].description)===be);
  if(eng.length)kand=eng;
 }
 if(kand.length===1)return {status:"gefunden",index:kand[0]};
 if(!kand.length)return {status:"fehlt"};
 return {status:"mehrdeutig"};
}
// Woher kommt die Leistung? Eine Leistung MIT Offerte ist nie eine "Zusatzleistung", auch wenn die Position keine
// Nummer hat (frueher: leere Nummer -> "Zusatzleistung"). Wurde die Offerte geloescht (angebot_id wird dann leer, die
// Nummer bleibt), steht das ehrlich da.
function leiHerkunftText(l){
 if(!l)return "Zusatzleistung";
 const nr=String(l.angebot_position==null?"":l.angebot_position).trim();
 if(l.angebot_id)return "Offerte-Pos. "+(nr||"ohne Nummer");
 if(nr)return "Zusatzleistung (Offerte gelöscht, früher Pos. "+nr+")";
 return "Zusatzleistung";
}
// Was muss an den Verknuepfungen geaendert werden? Nur der Unterschied - nichts wird geloescht und neu angelegt.
function leiVerknuepfungsDiff(vorhanden,gewaehlt){
 const v=new Set((vorhanden||[]).map(Number)), g=new Set((gewaehlt||[]).map(Number));
 return {neu:[...g].filter(x=>!v.has(x)),weg:[...v].filter(x=>!g.has(x))};
}
// ---- Ende Hilfsfunktionen

// v3.320: Zu den aus einer Offerte abgeleiteten Massaufnahmen je Position eine Leistung anlegen (oder die vorhandene
// verwenden) und verknuepfen. Rein ergaenzend: Preise/Mengen der Offerte bleiben unberuehrt, nichts wird geloescht, ein
// zweiter Lauf legt nichts doppelt an (vorhandene Leistung wird erkannt, Verknuepfung per upsert ohne Duplikate).
// Unklare Faelle (mehrere passende Leistungen) werden uebersprungen und gemeldet, nie geraten.
// eintraege: [{pos,description,quantity,unit,measurementId}]. Wirft nie; liefert {neu,vorhanden,verknuepft,uebersprungen,fehler}.
async function leiAusOffertePositionen(angebotId,projectId,eintraege){
 const erg={neu:0,vorhanden:0,verknuepft:0,uebersprungen:0,fehler:""};
 try{
  if(!angebotId||!projectId||!(eintraege||[]).length)return erg;
  const {data:liste,error:le}=await sb.from("leistungen").select("*").eq("angebot_id",angebotId);
  if(le){erg.fehler=dbFehlerText(le);return erg}
  const bekannt=(liste||[]).slice();
  for(const e of eintraege){
   const nr=String(e.pos==null?"":e.pos).trim();
   const be=leiBeschrKurz(e.description);
   let kand=bekannt.filter(l=>String(l.angebot_position==null?"":l.angebot_position).trim()===nr);
   if(kand.length>1&&be){const eng=kand.filter(l=>leiBeschrKurz(l.angebot_position_beschreibung)===be);if(eng.length)kand=eng}
   // Eine einzige Leistung mit anderer, ausdruecklich gespeicherter Beschreibung ist eine andere Position (doppelte Nummer).
   if(kand.length===1&&kand[0].angebot_position_beschreibung&&be&&leiBeschrKurz(kand[0].angebot_position_beschreibung)!==be)kand=[];
   let lei=null;
   if(kand.length===1){lei=kand[0];erg.vorhanden++}
   else if(kand.length>1){erg.uebersprungen++;continue}
   else{
    const menge=Number(e.quantity)||0;
    const payload={project_id:projectId,bezeichnung:be||(nr?"Position "+nr:"Ohne Bezeichnung"),
     menge:menge||null,einheit:String(e.unit||"").trim()||null,status:"nicht_ausgefuehrt",
     angebot_id:angebotId,angebot_position:nr,angebot_position_beschreibung:be||null};
    const {data,error}=await sb.from("leistungen").insert(payload).select();
    if(error||!data||!data.length){erg.fehler=error?dbFehlerText(error):"Keine Berechtigung für Leistungen.";return erg}
    lei=data[0];bekannt.push(lei);erg.neu++;
   }
   if(e.measurementId){
    const {data:v,error:ve}=await sb.from("leistung_massaufnahmen").upsert([{leistung_id:lei.id,measurement_id:e.measurementId}],{onConflict:"leistung_id,measurement_id",ignoreDuplicates:true}).select();
    if(ve){erg.fehler=dbFehlerText(ve);return erg}
    if(v&&v.length)erg.verknuepft++;
   }
  }
 }catch(err){erg.fehler=dbFehlerText(err)}
 return erg;
}

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
 if(error){box.innerHTML=`<div class="error">Fehler: ${esc(dbFehlerText(error))}</div>`;return undefined}
 projectLeistungenCache=data||[];
 if(!projectLeistungenCache.length){box.innerHTML=`<div class="muted">Noch keine Leistungen erfasst.</div>`;return 0}
 // v3.319: je Leistung die Zahl verknuepfter Massaufnahmen und ein Hinweis auf Massaufnahmen ohne Leistung. Es wird
 // nichts geraten: eine Massaufnahme ohne Leistung bleibt, was sie ist.
 const anzahl={};let offeneHinweis="";
 try{
  const ids=projectLeistungenCache.map(l=>l.id);
  const {data:links}=await sb.from("leistung_massaufnahmen").select("leistung_id,measurement_id").in("leistung_id",ids);
  const verknuepft=new Set();
  (links||[]).forEach(r=>{anzahl[r.leistung_id]=(anzahl[r.leistung_id]||0)+1;verknuepft.add(r.measurement_id)});
  // Die Massaufnahmen kommen aus dem Zwischenspeicher des Cockpits (keine zweite Abfrage auf dieselbe Tabelle). Ist er
  // fuer dieses Projekt noch nicht geladen, entfaellt der Hinweis - er ist Zugabe und wird beim naechsten Laden gezeigt.
  const ms=(typeof projectMeasurementsCache!=="undefined"&&projectMeasurementsCache?projectMeasurementsCache:[]).filter(m=>m.project_id===projectId&&!m.archived);
  const ohne=ms.filter(m=>!verknuepft.has(m.id)).length;
  if(ohne)offeneHinweis=`<div class="muted small" style="margin-top:6px">${ohne} Massaufnahme${ohne===1?" ist":"n sind"} keiner Leistung zugeordnet. Das ist in Ordnung – die App ordnet nichts von sich aus zu.</div>`;
 }catch(e){/* Zaehler und Hinweis sind Zugabe - die Liste bleibt auch ohne sie richtig */}
 box.innerHTML=projectLeistungenCache.map(l=>`
  <div class="report-row">
   <div class="report-row-info">
    <b>${esc(l.bezeichnung||"Ohne Bezeichnung")}</b>
    ${typeof ausfBadge==="function"?ausfBadge(l.status):""}
    <span class="muted">${esc(leiHerkunftText(l))}${l.menge?` · ${esc(String(l.menge))} ${esc(l.einheit||"")}`:""}${anzahl[l.id]?` · ${anzahl[l.id]} Massaufnahme${anzahl[l.id]===1?"":"n"}`:" · noch keine Massaufnahme"}</span>
   </div>
   <div class="report-row-actions">
    <button type="button" class="gray" data-open-project-leistung="${l.id}">✏️ Öffnen</button>
    <button type="button" class="red" data-del-project-leistung="${l.id}">🗑</button>
   </div>
  </div>`).join("")+offeneHinweis;
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
 // v3.319: Ist die bisherige Zuordnung in der Liste nicht EINDEUTIG wiederzufinden (Position umbenannt/entfernt, zwei
 // Positionen mit gleicher Nummer, Offerte fuer diese Person nicht lesbar), steht sie als eigene, vorgewaehlte Zeile
 // da. Speichern aendert dann nichts an der Zuordnung - sie wird nie still durch "keine" ersetzt oder geraten.
 let behalten="";
 const l=currentLeistungMeta;
 if(l&&l.angebot_id&&leiPositionFinden(leiAngebotePositionen,l).status!=="gefunden"){
  behalten=`<option value="behalten">Bisherige Zuordnung beibehalten: ${esc(leiHerkunftText(l))}${l.angebot_position_beschreibung?" – "+esc(leiBeschrKurz(l.angebot_position_beschreibung).slice(0,50)):""} (in der Offerte nicht eindeutig gefunden)</option>`;
 }
 sel.innerHTML=`<option value="">– keine Offertenposition (Zusatzleistung) –</option>${behalten}${optionen}`;
 if(behalten)sel.value="behalten";
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
  const f=leiPositionFinden(leiAngebotePositionen,l);
  if(f.status==="gefunden")$("leiAngebotPosition").value=String(f.index);
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
 if(!e.bezeichnung){appAlert("Bitte eine Bezeichnung eintragen.");return}
 let angebotId=null,angebotPosition=null,angebotBeschr=null;
 const sel=$("leiAngebotPosition");
 if(sel&&sel.value!==""){
  if(sel.value==="behalten"&&currentLeistungMeta){
   angebotId=currentLeistungMeta.angebot_id;angebotPosition=currentLeistungMeta.angebot_position;
   angebotBeschr=currentLeistungMeta.angebot_position_beschreibung||null;
  }else{
   const p=leiAngebotePositionen[Number(sel.value)];
   if(p){angebotId=p.angebotId;angebotPosition=p.pos;angebotBeschr=leiBeschrKurz(p.description)||null}
  }
 }
 const payload={
  project_id:cockpitProjectId,
  bezeichnung:e.bezeichnung,menge:e.menge||null,einheit:e.einheit||null,
  bemerkung:e.bemerkung||null,status:e.status,ausgefuehrte_menge:e.ausgefuehrte_menge||null,
  angebot_id:angebotId,angebot_position:angebotPosition,angebot_position_beschreibung:angebotBeschr
 };
 let leistungId=currentLeistungId;
 if(currentLeistungId){
  const {data,error}=await sb.from("leistungen").update(payload).eq("id",currentLeistungId).select();
  if(error){appAlert("Fehler beim Speichern: "+dbFehlerText(error));return}
  if(!data||!data.length){appAlert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return}
 }else{
  const {data,error}=await sb.from("leistungen").insert(payload).select();
  if(error){appAlert("Fehler beim Speichern: "+dbFehlerText(error));return}
  if(!data||!data.length){appAlert("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");return}
  leistungId=data[0].id;
 }
 // Massaufnahme-Verknuepfungen: nur der UNTERSCHIED wird geschrieben (v3.319). Bis v3.318 wurden erst ALLE Verknuepfungen
 // geloescht und dann neu angelegt - scheiterte das Anlegen (Verbindung, Recht), waren die bisherigen weg. Jetzt zuerst
 // anlegen, dann entfernen; ein erneutes Speichern ohne Aenderung schreibt nichts und erzeugt keine Duplikate.
 const {data:bisher,error:lesErr}=await sb.from("leistung_massaufnahmen").select("measurement_id").eq("leistung_id",leistungId);
 if(lesErr){appAlert("Die Verknüpfungen konnten nicht gelesen werden: "+dbFehlerText(lesErr));return}
 const diff=leiVerknuepfungsDiff((bisher||[]).map(r=>r.measurement_id),leiAusgewaehlteMassaufnahmen);
 if(diff.neu.length){
  const rows=diff.neu.map(mid=>({leistung_id:leistungId,measurement_id:mid}));
  const {data:ins,error:insErr}=await sb.from("leistung_massaufnahmen").upsert(rows,{onConflict:"leistung_id,measurement_id",ignoreDuplicates:true}).select();
  if(insErr){appAlert("Die Massaufnahmen konnten nicht verknüpft werden: "+dbFehlerText(insErr)+"\n\nBisherige Verknüpfungen sind unverändert.");return}
  if(!ins||ins.length!==rows.length){appAlert("Nicht alle Verknüpfungen konnten gespeichert werden. Fehlt die nötige Berechtigung?\n\nBisherige Verknüpfungen sind unverändert.");return}
 }
 if(diff.weg.length){
  const {error:delErr}=await sb.from("leistung_massaufnahmen").delete().eq("leistung_id",leistungId).in("measurement_id",diff.weg);
  if(delErr){appAlert("Einige Verknüpfungen konnten nicht entfernt werden: "+dbFehlerText(delErr));return}
 }
 await leiEditZurueck();
}

async function leiLoeschen(id){
 if(!await appConfirm("Diese Leistung wirklich löschen?"))return;
 const {error}=await sb.from("leistungen").delete().eq("id",id);
 if(error){appAlert("Fehler beim Löschen: "+dbFehlerText(error));return}
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
