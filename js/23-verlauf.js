"use strict";
// ---- Änderungsverlauf (Verlauf) --------------------------------
// Liest ausschliesslich aus audit_log (siehe CLAUDE.md Abschnitt 38).
// Eine einzige wiederverwendbare Funktion für Projekt/Massaufnahme/
// Ausmass/Report - vier Aufrufstellen (js/09-projekte.js, js/10-
// massaufnahme.js, js/17-ausmass.js, js/08-katalog-blitzschutz.js),
// keine vierfach kopierte Logik. Rein lesend: kein INSERT/UPDATE/DELETE
// von hier aus, RLS filtert automatisch auf die eigene Firma - siehe
// CLAUDE.md Abschnitt 38.4/39.

const VERLAUF_ACTION_LABELS={created:"Erstellt",updated:"Geändert",deleted:"Gelöscht",status_changed:"Status geändert"};
const VERLAUF_ENTITY_LABELS={project:"Projekt",measurement:"Massaufnahme",ausmass:"Ausmass",report:"Regierapport"};

function verlaufFormatWann(iso){
 if(!iso)return "–";
 const d=new Date(iso);
 const datum=d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit",year:"numeric"});
 const zeit=d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
 return `${datum} · ${zeit}`;
}

// Beschreibung: vorhandene description anzeigen, sonst aus Entität+Aktion
// einen verständlichen Text erzeugen (nie rohe JSON-Metadaten, nie
// versuchen den evtl. gelöschten Datensatz nachzuladen).
function verlaufEntryText(row){
 if(row.description)return esc(row.description);
 const label=VERLAUF_ENTITY_LABELS[row.entity_type]||"Datensatz";
 const aktion=(VERLAUF_ACTION_LABELS[row.action]||row.action).toLowerCase();
 return esc(`${label} ${aktion}`);
}

function verlaufEntryHtml(row){
 const wer=row.user_id?(profileName(row.user_id)||"Unbekannter Benutzer"):"Unbekannter Benutzer";
 const aktion=VERLAUF_ACTION_LABELS[row.action]||row.action;
 return `<div class="verlauf-entry">
<div class="verlauf-entry-top"><span class="verlauf-entry-when">${esc(verlaufFormatWann(row.created_at))}</span><span class="verlauf-entry-action">${esc(aktion)}</span></div>
<div class="verlauf-entry-who">👤 ${esc(wer)}</div>
<div class="verlauf-entry-desc">${verlaufEntryText(row)}</div>
</div>`;
}

// Zustand je Container (geladene Zeilen + aktueller Filter), damit der
// Filter rein clientseitig umschaltet - keine erneute Abfrage pro Klick.
const verlaufState=new WeakMap();

function renderVerlaufFiltered(box){
 const st=verlaufState.get(box);
 const list=box.querySelector(".verlauf-entries");
 if(!st||!list)return;
 const rows=st.filter==="alle"?st.rows:st.rows.filter(r=>r.action===st.filter);
 list.innerHTML=rows.length?rows.map(verlaufEntryHtml).join(""):'<div class="empty">Keine Einträge für diesen Filter.</div>';
}

async function loadVerlauf(box,entityType,entityId){
 box.innerHTML=`
<div class="bar verlauf-filters" style="margin-bottom:6px">
<button type="button" class="gray active" data-verlauf-filter="alle">Alle</button>
<button type="button" class="gray" data-verlauf-filter="created">Erstellt</button>
<button type="button" class="gray" data-verlauf-filter="updated">Geändert</button>
<button type="button" class="gray" data-verlauf-filter="deleted">Gelöscht</button>
<button type="button" class="gray" data-verlauf-filter="status_changed">Status geändert</button>
</div>
<div class="verlauf-entries"><div class="small">Lädt…</div></div>`;
 // RLS (tenant_boundary_audit_log) filtert automatisch auf die eigene
 // Firma - hier bewusst KEIN company_id-Filter vom Client, damit nichts
 // fälschlich als zusätzliche "Sicherheit" missverstanden wird, die in
 // Wirklichkeit nur die Datenbank leistet (siehe CLAUDE.md Abschnitt 39).
 const {data,error}=await sb.from("audit_log").select("*")
  .eq("entity_type",entityType).eq("entity_id",entityId)
  .order("created_at",{ascending:false}).limit(50);
 const list=box.querySelector(".verlauf-entries");
 if(error){
  list.innerHTML=`<div class="small" style="color:var(--red)">Verlauf konnte nicht geladen werden: ${esc(error.message)}</div>`;
  return;
 }
 verlaufState.set(box,{rows:data||[],filter:"alle"});
 if(!data||!data.length){
  list.innerHTML='<div class="empty">Noch keine Aktivitäten vorhanden.</div>';
  return;
 }
 renderVerlaufFiltered(box);
}

// Ein einziger, delegierter Klick-Handler für alle Filter-Leisten (egal
// in welchem der vier Kontexte) statt vier eigenen Listenern.
document.addEventListener("click",e=>{
 const fb=e.target.closest("[data-verlauf-filter]");
 if(!fb)return;
 const box=fb.closest(".verlauf-filters")?.parentElement;
 if(!box||!verlaufState.has(box))return;
 verlaufState.get(box).filter=fb.dataset.verlaufFilter;
 box.querySelectorAll("[data-verlauf-filter]").forEach(b=>b.classList.toggle("active",b===fb));
 renderVerlaufFiltered(box);
});

// Auf/Zu für einen Verlauf-Container, gleiches Öffnen/Schliessen-Muster
// wie die bestehenden Massaufnahmen-/Ausmass-/Rapporte-Listen im Projekt
// (.report-list.open, js/09-projekte.js).
async function toggleVerlaufBox(box,btn,entityType,entityId){
 if(!entityId)return;
 const willOpen=!box.classList.contains("open");
 box.classList.toggle("open",willOpen);
 btn.textContent=willOpen?"🕒 Verlauf ausblenden":"🕒 Verlauf anzeigen";
 if(willOpen)await loadVerlauf(box,entityType,entityId);
}

// Beim Öffnen/Neu-Anlegen einer Massaufnahme/eines Ausmasses/Rapports:
// Verlauf-Knopf nur zeigen, wenn der Datensatz bereits gespeichert ist
// (eine neue, ungespeicherte Erfassung hat noch keine Historie), und
// einen evtl. noch offenen Verlauf des vorherigen Datensatzes schliessen.
function updateVerlaufToggleVisibility(btn,box,entityId){
 box.classList.remove("open");
 box.innerHTML="";
 btn.textContent="🕒 Verlauf anzeigen";
 btn.hidden=!entityId;
}

// Feste Knöpfe (nicht Teil einer wiederholten Liste wie project-row) -
// einmalige Bindung genügt, currentMeasurementId/currentAusmassId/
// currentReportId werden erst zum Klickzeitpunkt gelesen.
$("measVerlaufToggle").onclick=()=>toggleVerlaufBox($("measVerlaufBody"),$("measVerlaufToggle"),"measurement",currentMeasurementId);
$("amVerlaufToggle").onclick=()=>toggleVerlaufBox($("amVerlaufBody"),$("amVerlaufToggle"),"ausmass",currentAusmassId);
$("reportVerlaufToggle").onclick=()=>toggleVerlaufBox($("reportVerlaufBody"),$("reportVerlaufToggle"),"report",currentReportId);
