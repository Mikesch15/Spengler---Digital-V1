"use strict";
// ---- Änderungsverlauf (Verlauf) --------------------------------
// Liest ausschliesslich aus audit_log (siehe CLAUDE.md Abschnitt 38/40).
// Eine einzige wiederverwendbare Komponente für Projekt/Massaufnahme/
// Ausmass/Report - Aufrufstellen in js/09-projekte.js, js/10-
// massaufnahme.js, js/17-ausmass.js, js/08-katalog-blitzschutz.js,
// keine vierfach kopierte Logik. Rein lesend: kein INSERT/UPDATE/DELETE
// von hier aus, RLS filtert automatisch auf die eigene Firma - siehe
// CLAUDE.md Abschnitt 38.4/39/40.
//
// Seit v2.32 (Abschnitt 40) trägt jede Zeile zusätzlich project_id
// (serverseitig ermittelt, siehe write_audit_log()). Der Projekt-
// Verlauf nutzt das für EINE Abfrage, die Projekt+Massaufnahme+Ausmass+
// Report gemeinsam zeigt; die bestehenden direkten Einzel-Verläufe
// (entity_type+entity_id) bleiben davon unberührt und unverändert.

const VERLAUF_ACTION_LABELS={created:"Erstellt",updated:"Geändert",deleted:"Gelöscht",status_changed:"Status geändert"};
const VERLAUF_ENTITY_LABELS={project:"Projekt",measurement:"Massaufnahme",ausmass:"Ausmass",report:"Regierapport"};

// v2.33: Feld-Diffing. Bewusst nur dasselbe kleine, zuverlässige Feld-Set,
// das write_audit_log() serverseitig vergleicht (siehe CLAUDE.md
// Abschnitt 41) - reine Anzeige-/Übersetzungslogik, keine eigene
// Diff-Berechnung im Frontend (der Diff selbst kommt immer aus der DB).
const VERLAUF_FIELD_LABELS={
 project:{name:"Projektname",order_no:"Auftrags-Nr.",customer:"Auftraggeber",object:"Adresse"},
 measurement:{
  title:"Bezeichnung",date:"Datum",note:"Notiz / Masse",
  // v2.34: Detail-Diff innerhalb measurements.data (siehe CLAUDE.md
  // Abschnitt 42) - nur die dort als Klasse A eingestuften, flachen,
  // typübergreifend eindeutigen Felder. Kollisionsfreie Feldnamen über
  // alle neun Massaufnahme-Typen hinweg geprüft (a/b/c nur bei
  // Einfassung Rund, deckung/lattenabstand bei Ort-/Seitenblech UND
  // Einfassung Rund mit gleicher Bedeutung, nur pro Typ andere Katalog-
  // Werte - siehe VERLAUF_DECKUNG_NAMES).
  massA:"Mass A",winkel:"Winkel",montage:"Montage",abwicklung:"Abwicklung",material:"Material",
  dachneigung:"Dachneigung",rinneAbwicklung:"Abwicklung",
  konisch:"Konisch",ansicht:"Ansichtspfeil",
  hoehe:"Höhe",laengeOben:"Länge oben",achsabstand:"Achsabstand",hilfsrissWunsch:"Hilfsriss unter Oberkante",seite:"Seite",
  deckung:"Eindeckung / Deckmaterial",art:"Anschlussart",ausfuehrung:"Ausführung",saum:"Umschlag am Blechende",
  stossLaenge:"Stücklänge",ueberlappung:"Überlappung am Stoss",lattenabstand:"Lattenabstand",firstgehrung:"Firstgehrung",
  durchmesser:"Rohrdurchmesser",a:"Mass a",b:"Mass b",c:"Mass c"
 },
 ausmass:{title:"Bezeichnung",date:"Datum",note:"Notiz"},
 report:{date:"Datum",order_no:"Auftrags-Nr.",customer:"Auftraggeber",object:"Objekt / Gebäudeteil",vat:"MWST"}
};

// Einheiten für die v2.34-Detailfelder - nur wo eine Einheit tatsächlich
// eindeutig bekannt ist (Auftrag Abschnitt 11: "keine Einheit erfinden").
const VERLAUF_MEAS_FIELD_UNITS={
 massA:"mm",winkel:"°",abwicklung:"mm",dachneigung:"°",
 hoehe:"mm",laengeOben:"mm",achsabstand:"mm",hilfsrissWunsch:"mm",
 saum:"mm",stossLaenge:"mm",ueberlappung:"mm",lattenabstand:"mm",durchmesser:"mm",a:"mm",b:"mm",c:"mm",
 rinneAbwicklung:"mm"
};

// Werte, die als Katalog-Schlüssel gespeichert sind (nie als lesbarer Name
// im UI anzeigen, Auftrag Abschnitt 12) - über die bereits vorhandenen,
// clientseitig geladenen Kataloge aufgelöst statt neu abgefragt. deckung
// kommt sowohl bei Ort-/Seitenblech (ANB_DECKUNGEN) als auch bei
// Einfassung Rund (EINF_DECKUNGEN) vor, mit disjunkten Schlüsseln
// (geprüft: kein gemeinsamer Schlüsselname) - deshalb sicher zu einer
// einzigen Nachschlagetabelle zusammengeführt.
function verlaufDeckungNamen(){
 const namen={};
 if(typeof ANB_DECKUNGEN!=="undefined")Object.keys(ANB_DECKUNGEN).forEach(k=>namen[k]=ANB_DECKUNGEN[k].name);
 if(typeof EINF_DECKUNGEN!=="undefined")Object.keys(EINF_DECKUNGEN).forEach(k=>namen[k]=EINF_DECKUNGEN[k].name);
 return namen;
}
const VERLAUF_MEAS_VALUE_LABELS={
 montage:{links:"von links",rechts:"von rechts"},
 konisch:{ja:"Ja",nein:"Nein"},
 ansicht:{keiner:"kein Pfeil",links:"von links",oben:"von oben",rechts:"von rechts",unten:"von unten"},
 seite:{rechts:"Rechte Seite",links:"Linke Seite"},
 ausfuehrung:{seite:"Seitenblech (Wand)",ort:"Ortblech (Giebel)"}
};

function verlaufFormatWann(iso){
 if(!iso)return "–";
 const d=new Date(iso);
 const datum=d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit",year:"numeric"});
 const zeit=d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
 return `${datum} · ${zeit}`;
}

// Werte benutzerfreundlich darstellen: NULL/leer → "–", Datumsfelder im
// Schweizer Format, Kataloge (material/deckung) über bestehende, bereits
// geladene Nachschlagelisten aufgelöst statt einer neuen Abfrage
// (Auftrag Abschnitt 25), Zahlen mit Schweizer Tausendertrennzeichen +
// bekannter Einheit, Booleans als Ja/Nein, alles andere als reiner Text.
function verlaufFormatDiffValue(field,v){
 if(v===null||v===undefined||v==="")return "–";
 if(field==="date"){
  const d=new Date(v);
  return isNaN(d)?String(v):d.toLocaleDateString("de-CH");
 }
 if(field==="material"){
  const m=typeof findMeasurementMaterial==="function"?findMeasurementMaterial(v):null;
  return m?m.name:String(v);
 }
 if(field==="deckung")return verlaufDeckungNamen()[v]||String(v);
 if(VERLAUF_MEAS_VALUE_LABELS[field]&&Object.prototype.hasOwnProperty.call(VERLAUF_MEAS_VALUE_LABELS[field],v))return VERLAUF_MEAS_VALUE_LABELS[field][v];
 if(typeof v==="boolean")return v?"Ja":"Nein";
 if(typeof v==="number"){
  const einheit=VERLAUF_MEAS_FIELD_UNITS[field];
  return v.toLocaleString("de-CH")+(einheit?" "+einheit:"");
 }
 return String(v);
}

// Rendert die Feldänderungen eines UPDATE-Eintrags (leer, wenn keine
// Whitelist-Felder betroffen waren - dann bleibt nur der Aktionstext).
// archived wird bei action=status_changed nicht generisch, sondern als
// "Aktiv → Archiviert" dargestellt (Auftrag Abschnitt 18) - nie gemischt
// mit anderen Feldänderungen, da write_audit_log() bei einer echten
// Statusänderung ausschliesslich den archived-Diff schreibt.
function verlaufChangesHtml(row){
 if(!Array.isArray(row.changes)||!row.changes.length)return "";
 const labels=VERLAUF_FIELD_LABELS[row.entity_type]||{};
 const lines=row.changes.map(c=>{
  if(row.action==="status_changed"&&c.field==="archived"){
   return `${esc(c.old?"Archiviert":"Aktiv")} → ${esc(c.new?"Archiviert":"Aktiv")}`;
  }
  const label=labels[c.field]||c.field;
  return `${esc(label)}: ${esc(verlaufFormatDiffValue(c.field,c.old))} → ${esc(verlaufFormatDiffValue(c.field,c.new))}`;
 });
 return `<div class="verlauf-entry-changes">${lines.map(l=>`<div>${l}</div>`).join("")}</div>`;
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

// withEntityBadge: im kombinierten Projekt-Verlauf (mehrere Entitäts-
// typen in einer Liste) zusätzlich anzeigen, um WAS es sich handelt -
// im direkten Einzel-Verlauf (immer derselbe Typ) unnötig, deshalb dort
// weiterhin weggelassen wie in v2.31.
function verlaufEntryHtml(row,withEntityBadge){
 const wer=row.user_id?(profileName(row.user_id)||"Unbekannter Benutzer"):"Unbekannter Benutzer";
 const aktion=VERLAUF_ACTION_LABELS[row.action]||row.action;
 const entityBadge=withEntityBadge?`<span class="verlauf-entry-entity">${esc(VERLAUF_ENTITY_LABELS[row.entity_type]||row.entity_type)}</span>`:"";
 return `<div class="verlauf-entry">
<div class="verlauf-entry-top"><span class="verlauf-entry-when">${esc(verlaufFormatWann(row.created_at))}</span><span class="verlauf-entry-badges">${entityBadge}<span class="verlauf-entry-action">${esc(aktion)}</span></span></div>
<div class="verlauf-entry-who">👤 ${esc(wer)}</div>
<div class="verlauf-entry-desc">${verlaufEntryText(row)}</div>
${verlaufChangesHtml(row)}
</div>`;
}

// Zustand je Container (geladene Zeilen + aktuelle Filter), damit die
// Filter rein clientseitig umschalten - keine erneute Abfrage pro Klick.
const verlaufState=new WeakMap();

function renderVerlaufFiltered(box){
 const st=verlaufState.get(box);
 const list=box.querySelector(".verlauf-entries");
 if(!st||!list)return;
 let rows=st.rows;
 if(st.actionFilter!=="alle")rows=rows.filter(r=>r.action===st.actionFilter);
 if(st.entityFilter&&st.entityFilter!=="alle")rows=rows.filter(r=>r.entity_type===st.entityFilter);
 list.innerHTML=rows.length?rows.map(r=>verlaufEntryHtml(r,st.combined)).join(""):'<div class="empty">Keine Einträge für diesen Filter.</div>';
}

function verlaufFiltersHtml(withEntityFilter){
 const entityBar=withEntityFilter?`<div class="bar verlauf-filters" data-verlauf-filter-group="entity" style="margin-bottom:4px">
<button type="button" class="gray active" data-verlauf-entity-filter="alle">Alle</button>
<button type="button" class="gray" data-verlauf-entity-filter="project">Projekt</button>
<button type="button" class="gray" data-verlauf-entity-filter="measurement">Massaufnahme</button>
<button type="button" class="gray" data-verlauf-entity-filter="ausmass">Ausmass</button>
<button type="button" class="gray" data-verlauf-entity-filter="report">Regierapport</button>
</div>`:"";
 return `${entityBar}
<div class="bar verlauf-filters" data-verlauf-filter-group="action" style="margin-bottom:6px">
<button type="button" class="gray active" data-verlauf-filter="alle">Alle</button>
<button type="button" class="gray" data-verlauf-filter="created">Erstellt</button>
<button type="button" class="gray" data-verlauf-filter="updated">Geändert</button>
<button type="button" class="gray" data-verlauf-filter="deleted">Gelöscht</button>
<button type="button" class="gray" data-verlauf-filter="status_changed">Status geändert</button>
</div>`;
}

// Gemeinsamer Kern: führt die Abfrage aus (Query wird von den beiden
// Aufrufern loadVerlauf()/loadProjectVerlauf() zusammengestellt) und
// rendert Filterleiste(n) + Liste in box.
async function runVerlaufQuery(box,query,combined){
 box.innerHTML=`${verlaufFiltersHtml(combined)}
<div class="verlauf-entries"><div class="small">Lädt…</div></div>`;
 const {data,error}=await query;
 const list=box.querySelector(".verlauf-entries");
 if(error){
  list.innerHTML=`<div class="small" style="color:var(--red)">Verlauf konnte nicht geladen werden: ${esc(error.message)}</div>`;
  return;
 }
 verlaufState.set(box,{rows:data||[],actionFilter:"alle",entityFilter:"alle",combined});
 if(!data||!data.length){
  list.innerHTML='<div class="empty">Noch keine Aktivitäten vorhanden.</div>';
  return;
 }
 renderVerlaufFiltered(box);
}

// Direkter Verlauf genau eines Datensatzes (Massaufnahme/Ausmass/Report/
// einzelnes Projekt) - unverändert seit v2.31, RLS filtert automatisch
// auf die eigene Firma, bewusst kein company_id-Filter vom Client.
async function loadVerlauf(box,entityType,entityId){
 await runVerlaufQuery(box,
  sb.from("audit_log").select("*").eq("entity_type",entityType).eq("entity_id",entityId)
    .order("created_at",{ascending:false}).limit(50),
  false);
}

// Kombinierter Projekt-Verlauf (v2.32): eine einzige Abfrage über
// project_id zeigt Projekt + zugehörige Massaufnahmen/Ausmasse/Reports
// gemeinsam chronologisch - project_id wird serverseitig in
// write_audit_log() gesetzt, nie vom Client (siehe CLAUDE.md 40.3/40.4).
async function loadProjectVerlauf(box,projectId){
 await runVerlaufQuery(box,
  sb.from("audit_log").select("*").eq("project_id",projectId)
    .order("created_at",{ascending:false}).limit(50),
  true);
}

// Delegierte Klick-Handler für alle Filter-Leisten (egal in welchem
// Kontext) statt eigener Listener pro Aufrufstelle. Action- und
// Entitäts-Filter sind unabhängige Zustände und wirken kombiniert.
document.addEventListener("click",e=>{
 const afb=e.target.closest("[data-verlauf-filter]");
 if(afb){
  const box=afb.closest("[data-verlauf-filter-group]")?.parentElement;
  if(!box||!verlaufState.has(box))return;
  verlaufState.get(box).actionFilter=afb.dataset.verlaufFilter;
  box.querySelectorAll('[data-verlauf-filter-group="action"] [data-verlauf-filter]').forEach(b=>b.classList.toggle("active",b===afb));
  renderVerlaufFiltered(box);
  return;
 }
 const efb=e.target.closest("[data-verlauf-entity-filter]");
 if(efb){
  const box=efb.closest("[data-verlauf-filter-group]")?.parentElement;
  if(!box||!verlaufState.has(box))return;
  verlaufState.get(box).entityFilter=efb.dataset.verlaufEntityFilter;
  box.querySelectorAll('[data-verlauf-filter-group="entity"] [data-verlauf-entity-filter]').forEach(b=>b.classList.toggle("active",b===efb));
  renderVerlaufFiltered(box);
 }
});

// Auf/Zu für einen Verlauf-Container, gleiches Öffnen/Schliessen-Muster
// wie die bestehenden Massaufnahmen-/Ausmass-/Rapporte-/Dateien-Listen
// im Projekt (.report-list.open, js/09-projekte.js).
async function toggleVerlaufBox(box,btn,entityType,entityId){
 if(!entityId)return;
 const willOpen=!box.classList.contains("open");
 box.classList.toggle("open",willOpen);
 btn.textContent=willOpen?"🕒 Verlauf ausblenden":"🕒 Verlauf anzeigen";
 if(willOpen)await loadVerlauf(box,entityType,entityId);
}

// Gleiches Muster, aber für den kombinierten Projekt-Verlauf (v2.32).
async function toggleProjectVerlaufBox(box,btn,projectId){
 if(!projectId)return;
 const willOpen=!box.classList.contains("open");
 box.classList.toggle("open",willOpen);
 btn.textContent=willOpen?"🕒 Verlauf ausblenden":"🕒 Verlauf anzeigen";
 if(willOpen)await loadProjectVerlauf(box,projectId);
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
