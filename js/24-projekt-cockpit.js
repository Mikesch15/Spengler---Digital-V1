"use strict";
// ---- Projekt-Cockpit (v2.37) ---------------------------------
// Kompakte Arbeitsübersicht zu genau EINEM geöffneten Projekt:
// Stammdaten, was bereits vorhanden ist, letzte Aktivität und direkte
// Sprünge in die bestehenden Bereiche.
//
// Bewusst KEIN zweites System: die Zählungen kommen aus den bestehenden
// Tabellen, der Verlauf aus dem bestehenden audit_log (js/23-verlauf.js),
// das Öffnen der Bereiche aus den bereits vorhandenen Listen in
// js/09-projekte.js (per Klick auf deren echte Knöpfe, damit es genau
// eine Umschalt-Logik gibt und keine Kopie davon).
//
// Sicherheit: alle Abfragen filtern nur nach project_id. Die eigentliche
// Firmengrenze erzwingt weiterhin die restriktive RLS-Policy jeder
// Tabelle (tenant_boundary_projects/_measurements/_ausmass/_reports/
// _project_files/_audit_log) - eine fremde Projekt-ID liefert deshalb
// serverseitig 0 Zeilen. Die ID aus dem Frontend ist nie für sich allein
// eine Berechtigung.

let cockpitProjectId=null;

// Gleiche Beschriftungen wie in der bestehenden Ausmass-Liste
// (loadProjectAusmass, js/09-projekte.js) - Massaufnahmen nutzen den
// bereits vorhandenen MEAS_TYPE_LABELS-Katalog aus js/01-basis.js.
const COCKPIT_AM_TYPE_LABELS={offerte_erfassen:"Offerte erfassen",blitzschutz_ausmass:"Blitzschutzausmass"};

function cockpitProject(){return allProjects.find(p=>p.id===cockpitProjectId)||null}

// Kopfzeile + Stammdatenfelder aus den bereits geladenen Projektdaten
// füllen (allProjects) - dafür ist keine zusätzliche Abfrage nötig.
function renderCockpitStammdaten(){
 const p=cockpitProject();
 if(!p)return;
 $("cockpitTitle").textContent="📁 "+p.name;
 $("cockpitSubline").textContent=[p.order_no||"–",p.object||"–",p.customer||"–"].join(" · ")+(p.archived?" · archiviert":"");
 $("cockpitName").value=p.name||"";
 $("cockpitOrderNo").value=p.order_no||"";
 $("cockpitObject").value=p.object||"";
 $("cockpitCustomer").value=p.customer||"";
 $("cockpitStammdatenMsg").hidden=true;
}

function cockpitTile(bereich,icon,label,status){
 return `<button type="button" class="cockpit-tile" data-cockpit-jump="${bereich}">`
  +`<span class="cockpit-tile-info"><b>${icon} ${esc(label)}</b><span>${esc(status)}</span></span>`
  +`<span class="cockpit-tile-arrow">›</span></button>`;
}

// "3 vorhanden" / "Noch keine …" - niemals ein erfundener Status.
function cockpitAnzahlText(n,einsText,leerText){
 if(!n)return leerText;
 return n===1?einsText:n+" vorhanden";
}

// Die ersten Titel als zusätzlicher Hinweis, damit man ohne Klick sieht,
// worum es geht. Ohne Titel wird die Fachart angezeigt, nichts erfunden.
function cockpitTitelListe(list,typeLabels){
 const namen=list.slice(0,3).map(x=>x.title||typeLabels[x.type]||x.type).filter(Boolean);
 if(!namen.length)return "";
 return namen.join(", ")+(list.length>3?" …":"");
}

function cockpitAktivitaetText(row){
 if(!row)return "Noch keine Aktivität";
 const wer=profileName(row.user_id)||"Unbekannter Benutzer";
 const ent=VERLAUF_ENTITY_LABELS[row.entity_type]||row.entity_type;
 const was=VERLAUF_ACTION_LABELS[row.action]||row.action;
 return `${ent} · ${was} · ${wer} · ${verlaufFormatWann(row.created_at)}`;
}

// Alle Bereiche in EINEM Rutsch laden (Promise.all), nicht eine Abfrage
// pro Kachel nacheinander. Für Massaufnahmen/Ausmasse werden die Zeilen
// selbst geholt (Titel werden angezeigt), für Rapporte/Dateien genügt
// die reine id-Spalte.
async function loadProjectCockpitData(){
 const id=cockpitProjectId;
 $("cockpitWork").innerHTML='<div class="small">Lädt…</div>';
 $("cockpitLastActivity").textContent="Lädt…";
 const [mRes,aRes,rRes,fRes,vRes]=await Promise.all([
  sb.from("measurements").select("id,title,type,date").eq("project_id",id).order("date",{ascending:false}),
  sb.from("ausmass").select("id,title,type,date").eq("project_id",id).order("date",{ascending:false}),
  sb.from("reports").select("id").eq("project_id",id),
  sb.from("project_files").select("id").eq("project_id",id),
  sb.from("audit_log").select("user_id,action,entity_type,created_at").eq("project_id",id).order("created_at",{ascending:false}).limit(1)
 ]);
 // Zwischenzeitlich anderes Projekt geöffnet oder Cockpit geschlossen:
 // Ergebnis verwerfen statt eine fremde Übersicht zu zeichnen.
 if(cockpitProjectId!==id||$("projectCockpitModal").hidden)return;
 const fehler=[mRes,aRes,rRes,fRes,vRes].find(x=>x.error);
 if(fehler){
  $("cockpitWork").innerHTML=`<div class="small" style="color:var(--red)">Übersicht konnte nicht geladen werden: ${esc(fehler.error.message)}</div>`;
  $("cockpitLastActivity").textContent="Verlauf konnte nicht geladen werden.";
  return;
 }
 const meas=mRes.data||[],am=aRes.data||[],rep=rRes.data||[],files=fRes.data||[];
 const measTitel=cockpitTitelListe(meas,MEAS_TYPE_LABELS);
 const amTitel=cockpitTitelListe(am,COCKPIT_AM_TYPE_LABELS);
 $("cockpitWork").innerHTML=[
  cockpitTile("measurements","📐","Massaufnahmen",cockpitAnzahlText(meas.length,"1 vorhanden","Noch keine Massaufnahme")+(measTitel?" · "+measTitel:"")),
  cockpitTile("ausmass","📏","Ausmass",cockpitAnzahlText(am.length,"1 vorhanden","Noch kein Ausmass")+(amTitel?" · "+amTitel:"")),
  cockpitTile("reports","📋","Regierapport",cockpitAnzahlText(rep.length,"1 vorhanden","Noch kein Regierapport")),
  cockpitTile("files","📎","Dateien/Fotos",cockpitAnzahlText(files.length,"1 vorhanden","Noch keine Datei"))
 ].join("");
 $("cockpitLastActivity").textContent=cockpitAktivitaetText((vRes.data||[])[0]);
}

async function openProjectCockpit(projectId){
 cockpitProjectId=Number(projectId);
 if(!cockpitProject())return;
 renderCockpitStammdaten();
 // Verlauf-Container zurücksetzen (bestehende Hilfsfunktion aus v2.31).
 updateVerlaufToggleVisibility($("cockpitVerlaufToggle"),$("cockpitVerlaufBody"),cockpitProjectId);
 $("projectsModal").hidden=true;
 $("projectCockpitModal").hidden=false;
 window.scrollTo(0,0);
 await loadProjectCockpitData();
}

// Sprung in den jeweiligen Bereich: zurück in die Projektliste und dort
// genau den bestehenden Knopf auslösen, den auch ein Benutzer anklicken
// würde. Dadurch gibt es keine zweite Auf-/Zuklapp- oder Ladelogik.
const COCKPIT_JUMP_ATTR={measurements:"data-toggle-measurements",ausmass:"data-toggle-ausmass",reports:"data-toggle-reports",files:"data-toggle-files"};

function cockpitJump(bereich){
 const attr=COCKPIT_JUMP_ATTR[bereich];
 const id=cockpitProjectId;
 if(!attr||!id)return;
 $("projectCockpitModal").hidden=true;
 $("projectsModal").hidden=false;
 // Archivierte Projekte sind in der Liste nur sichtbar, wenn die
 // Archiv-Ansicht eingeschaltet ist - sonst fände der Sprung die Karte
 // nicht.
 const p=cockpitProject();
 if(p&&p.archived&&!showArchivedProjects){
  showArchivedProjects=true;
  $("toggleArchivedProjects").textContent="📦 Nur aktive anzeigen";
 }
 renderProjectList();
 const btn=document.querySelector(`[${attr}="${id}"]`);
 if(!btn)return;
 btn.click();
 btn.scrollIntoView({block:"center"});
}

$("cockpitWork").addEventListener("click",e=>{
 const b=e.target.closest("[data-cockpit-jump]");
 if(b)cockpitJump(b.dataset.cockpitJump);
});

// Verlauf: kombinierter Projekt-Verlauf aus v2.32, unverändert
// wiederverwendet (Projekt + seine Massaufnahmen/Ausmasse/Rapporte).
$("cockpitVerlaufToggle").onclick=()=>toggleProjectVerlaufBox($("cockpitVerlaufBody"),$("cockpitVerlaufToggle"),cockpitProjectId);

$("cockpitBack").onclick=()=>{
 $("projectCockpitModal").hidden=true;
 $("projectsModal").hidden=false;
 renderProjectList();
};
$("cockpitStart").onclick=()=>goToStart();

// Stammdaten speichern: dieselben Pflichtfelder wie beim Anlegen eines
// Projekts. Die Firmenzuordnung wird nicht mitgeschickt - company_id
// bleibt unverändert und wird ohnehin serverseitig erzwungen.
$("cockpitSaveStammdaten").onclick=async()=>{
 const p=cockpitProject();
 if(!p)return;
 const name=$("cockpitName").value.trim();
 const orderNo=$("cockpitOrderNo").value.trim();
 const object=$("cockpitObject").value.trim();
 const msg=$("cockpitStammdatenMsg");
 const zeige=(text,farbe)=>{msg.textContent=text;msg.style.color=farbe;msg.hidden=false};
 if(!name){zeige("Bitte einen Projektnamen eingeben.","var(--red)");return}
 if(!orderNo){zeige("Bitte eine Auftrags-Nr. eingeben.","var(--red)");return}
 if(!object){zeige("Bitte eine Adresse eingeben.","var(--red)");return}
 const {data,error}=await sb.from("projects")
  .update({name,order_no:orderNo,object,customer:$("cockpitCustomer").value.trim()})
  .eq("id",p.id).select("*");
 if(error){zeige("Fehler: "+error.message,"var(--red)");return}
 // Von RLS blockierte UPDATEs melden keinen Fehler, sie betreffen still
 // 0 Zeilen (siehe CLAUDE.md 24.1) - deshalb das Ergebnis prüfen, statt
 // Erfolg anzunehmen.
 if(!data||!data.length){zeige("Die Änderung konnte nicht gespeichert werden. Fehlt die nötige Berechtigung?","var(--red)");return}
 const idx=allProjects.findIndex(x=>x.id===p.id);
 if(idx>=0)allProjects[idx]=data[0];
 renderCockpitStammdaten();
 renderProjectSelect();
 zeige("✓ Stammdaten gespeichert.","var(--green)");
};
