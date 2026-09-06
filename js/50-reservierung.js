// ---------------------------------------------------------------------------
// v3.09  Materialreservierung und Reststueckreservierung je Projekt
// ---------------------------------------------------------------------------
// Haelt fest, was fuer ein Projekt gebraucht, reserviert, zugeschnitten und
// geruestet ist - und welches physische Reststueck dafuer fest eingeplant
// wurde.
//
// KEIN RESTSTUECK WIRD STILLSCHWEIGEND EINGEPLANT (Auftrag Abschnitt 7):
// die Zuschnittliste SCHLAEGT passende Reste nur vor (js/42, unveraendert).
// Erst wer hier ausdruecklich "Fuer dieses Projekt reservieren" drueckt,
// legt eines fest. Danach ist es fuer andere Projekte nicht mehr frei.
//
// KEINE ZWEITE RECHTEVERWALTUNG: geschrieben wird ueber die gewoehnlichen
// Tabellen. Die Firmengrenze und das Recht erzwingt ausschliesslich die
// Datenbank (restriktive tenant_boundary-Policy plus die bestehenden
// has_permission('projects', ...)-Policies). Der Client schickt nirgends
// eine company_id mit.
//
// KEIN ZWEITES PROTOKOLL: jede Aenderung schreibt der bestehende
// write_audit_log()-Trigger mit alt/neu in dasselbe audit_log wie alles
// andere - sichtbar im gewohnten Projekt-Verlauf.
//
// Sichtbar nur, wenn das Untermodul eingeschaltet ist - pmAktiv("reservierung").
// ---------------------------------------------------------------------------

const RESV_STATUS=[
 {key:"benoetigt",   name:"Benötigt",      farbe:"grau"},
 {key:"verfuegbar",  name:"Verfügbar",     farbe:"blau"},
 {key:"reserviert",  name:"Reserviert",    farbe:"blau"},
 {key:"zugeschnitten",name:"Zugeschnitten",farbe:"gruen"},
 {key:"geruestet",   name:"Gerüstet",      farbe:"gruen"}
];
let resvListe=[];
let resvProjektId=null;
let resvLaeuft=0;

function resvStatusName(k){
 const s=RESV_STATUS.find(x=>x.key===k);
 return s?s.name:(k||"-");
}
function resvBadge(k){
 const s=RESV_STATUS.find(x=>x.key===k)||{name:k||"-",farbe:"grau"};
 return `<span class="mw-badge mw-${s.farbe}">${esc(s.name)}</span>`;
}
function resvMm(v){
 const z=(typeof pmatZahl==="function")?pmatZahl(v):Number(v);
 if(z===null||z===undefined||!Number.isFinite(z))return null;
 return Math.round(z);
}
function resvMasse(r){
 const l=resvMm(r.laenge_mm), b=resvMm(r.breite_mm);
 if(l===null&&b===null)return "";
 if(l!==null&&b!==null)return l+" × "+b+" mm";
 return (l!==null?l:b)+" mm";
}
// Schluessel, der zwei Bedarfszeilen als dieselbe Sache erkennt. Damit legt
// "Bedarf uebernehmen" nichts doppelt an.
function resvSchluessel(r){
 return [String(r.material_name||"").trim(),
         String(r.bezeichnung||"").trim(),
         String(r.einheit||"").trim(),
         resvMm(r.breite_mm)===null?"":resvMm(r.breite_mm),
         resvMm(r.laenge_mm)===null?"":resvMm(r.laenge_mm)].join("|");
}

// ---- Laden ----------------------------------------------------------------
async function resvLaden(projectId){
 resvProjektId=projectId;
 resvListe=[];
 if(!projectId||!pmAktiv("reservierung"))return;
 // Kein company_id-Filter: die Firmengrenze erzwingt die Datenbank.
 const {data,error}=await sb.from("material_reservierungen")
  .select("*").eq("project_id",projectId).order("id");
 if(error){resvListe=null;return}
 resvListe=data||[];
}

// ---- Anzeige --------------------------------------------------------------
function resvQuelleHtml(r){
 if(!r.measurement_id)return '<span class="small" style="color:var(--muted)">Projektbedarf</span>';
 const m=(projectMeasurementsCache||[]).find(x=>x.id===r.measurement_id);
 const name=m?((typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])||m.type)
             :("Massaufnahme "+r.measurement_id);
 return `<button type="button" class="pmat-quelle" data-resv-quelle="${r.measurement_id}">${esc(name)}</button>`;
}
function resvZeileHtml(r){
 const masse=resvMasse(r);
 const menge=(r.menge===null||r.menge===undefined)?"" :
   ((typeof pmatFormat==="function")?pmatFormat(Number(r.menge)):String(r.menge));
 const wer=r.reserviert_von&&typeof profileName==="function"?profileName(r.reserviert_von):"";
 const wann=r.reserviert_am&&typeof verlaufFormatWann==="function"?verlaufFormatWann(r.reserviert_am):"";
 return `<tr>
  <td>${esc(r.material_name||"Ohne Material")}</td>
  <td>${esc(r.bezeichnung||"")}${masse?`<br><span class="small" style="color:var(--muted)">${esc(masse)}</span>`:""}</td>
  <td class="pmat-zahl">${esc(menge)}${r.einheit?" "+esc(r.einheit):""}</td>
  <td>${resvQuelleHtml(r)}</td>
  <td>${resvBadge(r.status)}${wer?`<br><span class="small" style="color:var(--muted)">${esc(wer)}${wann?" · "+esc(wann):""}</span>`:""}</td>
  <td class="resv-akt">
   <select data-resv-status="${r.id}" style="min-width:130px">
    ${RESV_STATUS.map(s=>`<option value="${s.key}"${s.key===r.status?" selected":""}>${esc(s.name)}</option>`).join("")}
   </select>
   <button type="button" class="gray" data-resv-loeschen="${r.id}" title="Bedarfszeile entfernen">🗑</button>
  </td>
 </tr>`;
}

// Reststuecke: getrennt nach "fuer dieses Projekt reserviert", "fuer ein
// anderes Projekt reserviert" (nur zur Information, nicht anfassbar) und
// "frei". Nichts davon wird automatisch eingeplant.
function resvResteHtml(){
 const alle=(typeof reststuecke!=="undefined"&&Array.isArray(reststuecke))?reststuecke:[];
 const meine=alle.filter(r=>r.reserviert_fuer_project_id===resvProjektId&&!r.verbraucht);
 const fremd=alle.filter(r=>r.reserviert_fuer_project_id&&r.reserviert_fuer_project_id!==resvProjektId&&!r.verbraucht);
 const frei =alle.filter(r=>!r.reserviert_fuer_project_id&&!r.verbraucht);
 const zeile=r=>`${resvMm(r.laenge_mm)} × ${resvMm(r.breite_mm)} mm`
   +(r.material_name?" · "+esc(r.material_name):"")
   +(r.anzahl>1?` · ${r.anzahl} Stück`:"");
 let h='<div class="resv-reste"><div class="small"><b>Reststücke</b></div>';
 if(!alle.length){
  h+='<div class="small" style="color:var(--muted)">Das Reststücke-Lager ist leer. Reste werden im Zuschnitt einer Massaufnahme aufgenommen.</div>';
  return h+"</div>";
 }
 if(meine.length){
  h+='<div class="small" style="margin-top:4px">Für dieses Projekt reserviert:</div>'
   +meine.map(r=>`<div class="resv-rest-zeile"><span>${zeile(r)}</span>
     <span class="resv-akt"><button type="button" class="gray" data-resv-rest-frei="${r.id}">Freigeben</button>
     <button type="button" class="gray" data-resv-rest-verbraucht="${r.id}">Als verwendet buchen</button></span></div>`).join("");
 }
 if(frei.length){
  h+='<div class="small" style="margin-top:6px">Frei im Lager:</div>'
   +frei.slice(0,12).map(r=>`<div class="resv-rest-zeile"><span>${zeile(r)}</span>
     <span class="resv-akt"><button type="button" data-resv-rest-nehmen="${r.id}">Für dieses Projekt reservieren</button></span></div>`).join("")
   +(frei.length>12?`<div class="small" style="color:var(--muted)">… und ${frei.length-12} weitere</div>`:"");
 }
 if(fremd.length){
  h+=`<div class="small" style="margin-top:6px;color:var(--muted)">${fremd.length} Rest${fremd.length===1?" ist":"e sind"} für ein anderes Projekt reserviert und hier nicht verfügbar.</div>`;
 }
 if(!meine.length&&!frei.length&&!fremd.length){
  h+='<div class="small" style="color:var(--muted)">Kein freier Rest im Lager.</div>';
 }
 h+='<div class="small" style="color:var(--muted);margin-top:4px">Ein Rest wird nie automatisch eingeplant – er liegt physisch irgendwo und ist vielleicht schon weg.</div>';
 return h+"</div>";
}

function renderProjektReservierung(){
 const karte=$("cockpitReservierungCard"), box=$("cockpitReservierungBody");
 if(!karte||!box)return 0;
 if(!pmAktiv("reservierung")){karte.hidden=true;box.innerHTML="";return 0}
 karte.hidden=false;
 if(resvListe===null){
  box.innerHTML='<div class="small" style="color:var(--red)">Die Reservierungen konnten nicht geladen werden.</div>';
  if($("cockpitReservierungCount"))$("cockpitReservierungCount").textContent="?";
  if(typeof cockpitModulStand==="function")cockpitModulStand();
  return 0;
 }
 const liste=resvListe||[];
 if($("cockpitReservierungCount"))$("cockpitReservierungCount").textContent=String(liste.length);
 if(typeof cockpitModulStand==="function")cockpitModulStand();
 let h='<div class="bar"><button type="button" id="resvBedarfBtn">＋ Bedarf aus der Materialübersicht übernehmen</button></div>'
  +'<div class="small resv-hinweis" hidden></div>';
 if(!liste.length){
  h+='<div class="small" style="color:var(--muted)">Noch kein Bedarf erfasst. „Bedarf übernehmen" legt die Positionen an, '
   +'die die Massaufnahmen dieses Projekts bereits ausgerechnet haben.</div>';
 }else{
  h+='<div class="scroll"><table class="eb-table pmat-tab"><thead><tr>'
   +'<th>Material</th><th>Position</th><th>Menge</th><th>Quelle</th><th>Status</th><th>Aktion</th>'
   +'</tr></thead><tbody>'+liste.map(resvZeileHtml).join("")+'</tbody></table></div>';
 }
 box.innerHTML=h+resvResteHtml();
 return liste.length;
}

// ---- Bedarf uebernehmen ---------------------------------------------------
// Nimmt genau das, was die projektweite Materialuebersicht ohnehin schon
// zeigt (js/48) - es wird nichts zusaetzlich gerechnet.
function resvBedarfZeilen(){
 if(typeof pmatSammeln!=="function")return [];
 const raus=[];
 pmatSammeln(projectMeasurementsCache||[]).forEach(g=>{
  g.positionen.forEach(p=>{
   if(p.summe===null)return;                 // reiner Text wird nicht reserviert
   const q=p.quellen||[];
   raus.push({material_name:g.material==="Ohne Material"?null:g.material,
     bezeichnung:p.bezeichnung, menge:p.summe, einheit:p.einheit||null,
     breite_mm:null, laenge_mm:null,
     measurement_id:q.length===1?q[0].id:null});
  });
  g.zuschnitte.forEach(t=>{
   const q=[...(t.quellen||[])];
   raus.push({material_name:g.material==="Ohne Material"?null:g.material,
     bezeichnung:"Zuschnitt"+(t.merkmal?" · "+t.merkmal:""),
     menge:t.anzahl, einheit:"Stk",
     breite_mm:t.breite===null?null:t.breite, laenge_mm:t.laenge,
     measurement_id:q.length===1?q[0]:null});
  });
 });
 return raus;
}
async function resvBedarfUebernehmen(){
 if(!resvProjektId)return {fehler:"Kein Projekt geöffnet."};
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Der Bedarf"))return {offline:true};
 const vorhanden=new Set((resvListe||[]).map(resvSchluessel));
 const neu=resvBedarfZeilen().filter(z=>!vorhanden.has(resvSchluessel(z)));
 if(!neu.length)return {fehler:null,anzahl:0,uebersprungen:resvBedarfZeilen().length};
 // company_id kommt aus dem DEFAULT my_company_id(), niemals vom Client.
 const {data,error}=await sb.from("material_reservierungen")
  .insert(neu.map(z=>({...z,project_id:resvProjektId,status:"benoetigt"}))).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 resvListe=(resvListe||[]).concat(data);
 return {fehler:null,anzahl:data.length,uebersprungen:resvBedarfZeilen().length-data.length};
}

// ---- Aendern --------------------------------------------------------------
async function resvStatusSetzen(id,status){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Reservierung"))return {offline:true};
 const felder={status};
 // "reserviert" ist der Moment, in dem sich jemand festlegt - deshalb wird
 // hier festgehalten wer und wann. Beim Zuruecknehmen wird das geloescht.
 if(status==="reserviert"){
  felder.reserviert_von=(currentProfile&&currentProfile.id)||null;
  felder.reserviert_am=new Date().toISOString();
 }else if(status==="benoetigt"||status==="verfuegbar"){
  felder.reserviert_von=null; felder.reserviert_am=null;
 }
 const {data,error}=await sb.from("material_reservierungen").update(felder).eq("id",id).select();
 if(error)return {fehler:error.message};
 // Ein von RLS blockiertes UPDATE meldet keinen Fehler, es betrifft still
 // 0 Zeilen. Kein vorgetaeuschter Erfolg.
 if(!data||!data.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 resvListe=(resvListe||[]).map(r=>r.id===id?data[0]:r);
 return {fehler:null};
}
async function resvLoeschen(id){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Die Reservierung"))return {offline:true};
 const {data,error}=await sb.from("material_reservierungen").delete().eq("id",id).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts gelöscht. Fehlt die nötige Berechtigung?"};
 resvListe=(resvListe||[]).filter(r=>r.id!==id);
 return {fehler:null};
}

// ---- Reststueck -----------------------------------------------------------
// Die Bedingungen im WHERE machen das Reservieren wettlaufsicher: laeuft
// gleichzeitig ein zweiter Versuch, findet der zweite die Zeile nicht mehr
// frei und betrifft 0 Zeilen. Es gibt deshalb keine Doppelbelegung.
async function resvRestNehmen(id){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Reststück"))return {offline:true};
 if(!resvProjektId)return {fehler:"Kein Projekt geöffnet."};
 const {data,error}=await sb.from("reststuecke")
  .update({reserviert_fuer_project_id:resvProjektId,
           reserviert_von:(currentProfile&&currentProfile.id)||null,
           reserviert_am:new Date().toISOString()})
  .eq("id",id).is("reserviert_fuer_project_id",null).eq("verbraucht",false).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Dieses Reststück ist inzwischen vergeben oder verbraucht."};
 resvRestUebernehmen(data[0]);
 return {fehler:null};
}
async function resvRestFreigeben(id){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Reststück"))return {offline:true};
 const {data,error}=await sb.from("reststuecke")
  .update({reserviert_fuer_project_id:null,reserviert_von:null,reserviert_am:null})
  .eq("id",id).eq("reserviert_fuer_project_id",resvProjektId).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts geändert. Fehlt die nötige Berechtigung?"};
 resvRestUebernehmen(data[0]);
 return {fehler:null};
}
// Verbraucht: die Projektzuordnung bleibt ausdruecklich stehen, damit
// nachvollziehbar bleibt, wo der Rest hingegangen ist (Auftrag Abschnitt 7).
async function resvRestVerbraucht(id){
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Reststück"))return {offline:true};
 const {data,error}=await sb.from("reststuecke")
  .update({verbraucht:true}).eq("id",id).eq("reserviert_fuer_project_id",resvProjektId).select();
 if(error)return {fehler:error.message};
 if(!data||!data.length)return {fehler:"Es wurde nichts geändert. Fehlt die nötige Berechtigung?"};
 // Die geladene Liste fuehrt nur unverbrauchte Reste (js/05).
 if(typeof reststuecke!=="undefined")reststuecke=(reststuecke||[]).filter(r=>r.id!==id);
 return {fehler:null};
}
function resvRestUebernehmen(zeile){
 if(typeof reststuecke==="undefined"||!Array.isArray(reststuecke))return;
 reststuecke=reststuecke.map(r=>r.id===zeile.id?zeile:r);
}

// ---- Bedienung ------------------------------------------------------------
function resvHinweis(text,fehler){
 const box=$("cockpitReservierungBody");
 const el=box&&box.querySelector(".resv-hinweis");
 if(!el)return;
 el.textContent=text||"";
 el.style.color=fehler?"var(--red)":"var(--green)";
 el.hidden=!text;
}
async function resvNachAktion(erg,gutText){
 if(!erg||erg.offline)return;
 if(erg.fehler){renderProjektReservierung();resvHinweis(erg.fehler,true);return}
 renderProjektReservierung();
 if(gutText)resvHinweis(gutText,false);
}

document.addEventListener("click",async e=>{
 if(!e.target||!e.target.closest)return;

 const bedarf=e.target.closest("#resvBedarfBtn");
 if(bedarf){
  bedarf.disabled=true;
  const erg=await resvBedarfUebernehmen();
  if(erg&&!erg.offline&&!erg.fehler){
   await resvNachAktion(erg, erg.anzahl
    ? `✓ ${erg.anzahl} Position${erg.anzahl===1?"":"en"} übernommen.`
      +(erg.uebersprungen?` ${erg.uebersprungen} war${erg.uebersprungen===1?"":"en"} schon erfasst.`:"")
    : "Es gab nichts Neues zu übernehmen – alle Positionen sind bereits erfasst.");
  }else{await resvNachAktion(erg)}
  return;
 }

 const quelle=e.target.closest("[data-resv-quelle]");
 if(quelle){
  const id=Number(quelle.dataset.resvQuelle);
  const m=(projectMeasurementsCache||[]).find(x=>x.id===id);
  if(m&&typeof openMeasurement==="function"){
   if(typeof measEditReturnTo!=="undefined")measEditReturnTo="projectCockpit";
   openMeasurement(m);
  }
  return;
 }

 const del=e.target.closest("[data-resv-loeschen]");
 if(del){
  const id=Number(del.dataset.resvLoeschen);
  const r=(resvListe||[]).find(x=>x.id===id);
  if(!confirm("Bedarfszeile entfernen?\n\n"+((r&&r.bezeichnung)||"")+"\n\nDie Reservierung wird aufgehoben. Der Verlauf bleibt erhalten."))return;
  await resvNachAktion(await resvLoeschen(id),"✓ Bedarfszeile entfernt.");
  return;
 }

 const nehmen=e.target.closest("[data-resv-rest-nehmen]");
 if(nehmen){
  nehmen.disabled=true;
  await resvNachAktion(await resvRestNehmen(Number(nehmen.dataset.resvRestNehmen)),
   "✓ Reststück für dieses Projekt reserviert.");
  return;
 }
 const frei=e.target.closest("[data-resv-rest-frei]");
 if(frei){
  frei.disabled=true;
  await resvNachAktion(await resvRestFreigeben(Number(frei.dataset.resvRestFrei)),
   "✓ Reststück wieder freigegeben – es steht anderen Projekten zur Verfügung.");
  return;
 }
 const verb=e.target.closest("[data-resv-rest-verbraucht]");
 if(verb){
  if(!confirm("Reststück als verwendet buchen?\n\nEs verschwindet danach aus dem Lager. Die Projektzuordnung bleibt im Verlauf nachvollziehbar."))return;
  verb.disabled=true;
  await resvNachAktion(await resvRestVerbraucht(Number(verb.dataset.resvRestVerbraucht)),
   "✓ Reststück als verwendet gebucht.");
  return;
 }
});

document.addEventListener("change",async e=>{
 const sel=e.target&&e.target.closest?e.target.closest("[data-resv-status]"):null;
 if(!sel)return;
 const id=Number(sel.dataset.resvStatus);
 const r=(resvListe||[]).find(x=>x.id===id);
 const neu=sel.value;
 if(!r||r.status===neu)return;
 const alt=r.status;
 const erg=await resvStatusSetzen(id,neu);
 if(erg&&erg.offline){sel.value=alt;return}
 if(erg&&erg.fehler){
  // Kein vorgetaeuschter Erfolg: die Auswahl springt auf den echten Wert
  // zurueck und der Grund steht daneben.
  sel.value=alt; renderProjektReservierung(); resvHinweis(erg.fehler,true); return;
 }
 renderProjektReservierung();
 resvHinweis(`✓ Status auf „${resvStatusName(neu)}" gesetzt.`,false);
});

// Wird von pmSichtbarkeitAuffrischen (js/49) und vom Cockpit aufgerufen.
async function resvCockpitLaden(projectId){
 const lauf=++resvLaeuft;
 await resvLaden(projectId);
 if(lauf!==resvLaeuft)return;       // Projekt zwischenzeitlich gewechselt
 renderProjektReservierung();
}
