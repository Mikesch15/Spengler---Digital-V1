"use strict";
// Die Modul-Auswahl im Feedback-Formular wird aus der App selbst
// zusammengestellt. Neue Massaufnahme- oder Ausmass-Arten tauchen dadurch
// automatisch auf – es genügt, den Knopf im Auswahlfenster anzulegen.
const FEEDBACK_MODULE_FEST=["Allgemein","Regierapport","Projekte","Einstellungen","Sonstiges"];

function feedbackModulListe(){
 const liste=["Allgemein","Regierapport"];
 const auslesen=(auswahl,praefix)=>{
  document.querySelectorAll(auswahl).forEach(btn=>{
   const spans=btn.querySelectorAll("span");
   const text=(spans.length?spans[spans.length-1].textContent:btn.textContent).trim();
   if(text)liste.push(praefix+" – "+text);
  });
 };
 auslesen("[data-choose-meas-type]","Massaufnahme");
 auslesen("[data-choose-am-type]","Ausmass");
 liste.push("Projekte","Einstellungen","Rechte / Mitarbeiter","Sonstiges");
 // Falls die Auswahlfenster einmal fehlen sollten, bleibt wenigstens das Feste übrig.
 return [...new Set(liste.length>2?liste:FEEDBACK_MODULE_FEST)];
}

function fuelleFeedbackModule(){
 const sel=$("feedbackModul");
 if(!sel)return;
 sel.innerHTML=feedbackModulListe().map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join("");
 sel.value="Allgemein";
}

// ---------------------------------------------------------------------------
// Feedback-Liste: laden, sortieren, herunterladen  (v2.63)
// ---------------------------------------------------------------------------
// Die Liste wird einmal geladen und gemerkt. Sortieren und Herunterladen
// arbeiten ausschliesslich auf diesen bereits geladenen Zeilen - keine
// zusaetzliche Abfrage je Klick. Die Firmengrenze erzwingt weiterhin
// ausschliesslich die restriktive RLS auf "feedback"; der Client filtert
// nirgends selbst nach company_id.
let feedbackCache=[];
let feedbackSort="offen";

const FEEDBACK_SORTIERUNGEN={
 offen: {label:"Offen zuerst",   fn:(a,b)=>(a.resolved?1:0)-(b.resolved?1:0)||feedbackZeit(b)-feedbackZeit(a)},
 neu:   {label:"Neueste zuerst", fn:(a,b)=>feedbackZeit(b)-feedbackZeit(a)},
 alt:   {label:"Älteste zuerst", fn:(a,b)=>feedbackZeit(a)-feedbackZeit(b)},
 modul: {label:"Modul (A–Z)",    fn:(a,b)=>feedbackText(a.module).localeCompare(feedbackText(b.module),"de")||feedbackZeit(b)-feedbackZeit(a)},
 person:{label:"Mitarbeiter (A–Z)",fn:(a,b)=>feedbackPerson(a).localeCompare(feedbackPerson(b),"de")||feedbackZeit(b)-feedbackZeit(a)}
};

function feedbackZeit(f){
 const t=f&&f.created_at?Date.parse(f.created_at):NaN;
 return Number.isFinite(t)?t:0;
}
function feedbackText(v){return v===null||v===undefined?"":String(v)}
function feedbackPerson(f){
 // Wie ueberall sonst: geloeschter Mitarbeiter -> "Unbekannter Benutzer".
 if(!f)return "Unbekannter Benutzer";
 if(f.profiles&&(f.profiles.first_name||f.profiles.last_name))
  return `${feedbackText(f.profiles.first_name)} ${feedbackText(f.profiles.last_name)}`.trim();
 return "Unbekannter Benutzer";
}
function feedbackDatum(f){
 return f&&f.created_at?new Date(f.created_at).toLocaleString("de-CH"):"–";
}
function feedbackStatusText(f){return f&&f.resolved?"Erledigt":"Offen"}

// Liefert die gemerkten Zeilen in der gerade gewaehlten Reihenfolge.
// Genau diese Reihenfolge wird angezeigt UND heruntergeladen.
function feedbackSortiert(){
 const s=FEEDBACK_SORTIERUNGEN[feedbackSort]||FEEDBACK_SORTIERUNGEN.offen;
 return feedbackCache.slice().sort(s.fn);
}

async function renderFeedbackList(){
 if(!isAdmin())return;
 $("feedbackList").innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("feedback").select("*,profiles(first_name,last_name)");
 if(error){
  feedbackCache=[];
  $("feedbackList").innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;
  renderFeedbackKopf(true);
  return;
 }
 feedbackCache=data||[];
 renderFeedbackRows();
}

// Zeichnet nur die Liste neu - ohne erneute Abfrage.
function renderFeedbackRows(){
 const box=$("feedbackList");
 if(!box)return;
 const list=feedbackSortiert();
 renderFeedbackKopf(false);
 document.querySelectorAll("[data-feedback-sort]").forEach(b=>{
  b.classList.toggle("active",b.dataset.feedbackSort===feedbackSort);
 });
 box.innerHTML=list.length?list.map(f=>{
  const wer=feedbackPerson(f);
  const wann=feedbackDatum(f);
  return `<div class="settingrow" style="display:block;padding:10px${f.resolved?";opacity:.55":""}">
<div class="small" style="color:var(--muted)"><b>${esc(f.module)}</b> · ${esc(wer)} · ${esc(wann)}${f.resolved?" · ✓ erledigt":""}</div>
<div style="margin-top:4px;white-space:pre-wrap${f.resolved?";text-decoration:line-through":""}">${esc(f.message)}</div>
<div class="bar" style="margin-top:6px">
<button type="button" class="gray" data-feedback-toggle="${f.id}" data-resolved="${f.resolved?"1":"0"}">${f.resolved?"↩️ Als offen markieren":"✓ Als erledigt markieren"}</button>
<button type="button" class="red" data-feedback-del="${f.id}">Löschen</button>
</div>
</div>`;
 }).join(""):'<div class="empty">Noch kein Feedback vorhanden.</div>';
}

// Zaehlzeile ueber der Liste; blendet die Knoepfe aus, solange es nichts
// zum Sortieren oder Herunterladen gibt.
function renderFeedbackKopf(fehler){
 const info=$("feedbackCountInfo");
 const n=feedbackCache.length;
 const offen=feedbackCache.filter(f=>!f.resolved).length;
 if(info)info.textContent=fehler?"":(n?`${n} Feedback${n===1?"":"s"} · ${offen} offen · ${n-offen} erledigt`:"");
 const leer=fehler||!n;
 ["feedbackSortBar","feedbackExportBar"].forEach(id=>{
  const el=$(id);
  if(el)el.hidden=leer;
 });
}

// Eine Zeile je Feedback, in der gewaehlten Reihenfolge - Grundlage fuer
// beide Downloads, damit Excel und Textdatei nie auseinanderlaufen.
const FEEDBACK_SPALTEN=["Nr.","Datum","Modul","Status","Mitarbeiter","Feedback"];
function feedbackExportZeilen(){
 return feedbackSortiert().map((f,i)=>[
  i+1,
  feedbackDatum(f),
  feedbackText(f.module),
  feedbackStatusText(f),
  feedbackPerson(f),
  feedbackText(f.message)
 ]);
}
function feedbackDateiname(endung){
 return `Feedback_${new Date().toISOString().slice(0,10)}.${endung}`;
}
function feedbackDatenSpeichern(blob,dateiname){
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download=dateiname;
 document.body.appendChild(a);a.click();document.body.removeChild(a);
 URL.revokeObjectURL(url);
}

$("feedbackSortBar").addEventListener("click",e=>{
 const btn=e.target.closest("[data-feedback-sort]");
 if(!btn)return;
 const wahl=btn.dataset.feedbackSort;
 if(!FEEDBACK_SORTIERUNGEN[wahl]||wahl===feedbackSort)return;
 feedbackSort=wahl;
 renderFeedbackRows();
});

$("feedbackExportXlsx").onclick=()=>{
 if(!feedbackCache.length){alert("Kein Feedback zum Herunterladen vorhanden.");return}
 // xlsx.full.min.js liegt bereits im Kopf von index.html (wird auch fuer
 // den Material-Import gebraucht). Fehlt es einmal, sagen wir das ehrlich,
 // statt eine kaputte Datei zu erzeugen.
 if(typeof XLSX==="undefined"){
  alert("Die Excel-Funktion konnte nicht geladen werden. Bitte die Seite mit bestehender Internetverbindung neu laden – oder den Textdatei-Export verwenden.");
  return;
 }
 const daten=[FEEDBACK_SPALTEN,...feedbackExportZeilen()];
 const blatt=XLSX.utils.aoa_to_sheet(daten);
 blatt["!cols"]=[{wch:5},{wch:18},{wch:26},{wch:10},{wch:22},{wch:70}];
 const mappe=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(mappe,blatt,"Feedback");
 const roh=XLSX.write(mappe,{bookType:"xlsx",type:"array"});
 feedbackDatenSpeichern(
  new Blob([roh],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
  feedbackDateiname("xlsx"));
};

$("feedbackExportTxt").onclick=()=>{
 if(!feedbackCache.length){alert("Kein Feedback zum Herunterladen vorhanden.");return}
 const zeilen=feedbackExportZeilen();
 const offen=feedbackCache.filter(f=>!f.resolved).length;
 const sortLabel=(FEEDBACK_SORTIERUNGEN[feedbackSort]||FEEDBACK_SORTIERUNGEN.offen).label;
 const kopf=[
  `${companyName} – Feedback`,
  `Stand: ${new Date().toLocaleString("de-CH")}`,
  `${zeilen.length} Feedback${zeilen.length===1?"":"s"} · ${offen} offen · ${zeilen.length-offen} erledigt`,
  `Sortierung: ${sortLabel}`,
  "=".repeat(64),
  ""
 ];
 const bloecke=zeilen.map(z=>[
  `#${z[0]}  ${z[1]}`,
  `Modul:       ${z[2]}`,
  `Status:      ${z[3]}`,
  `Mitarbeiter: ${z[4]}`,
  "",
  // Mehrzeilige Meldungen bleiben eingerueckt lesbar.
  String(z[5]).split(/\r?\n/).map(t=>"  "+t).join("\n"),
  "",
  "-".repeat(64),
  ""
 ].join("\n"));
 // CRLF, damit die Datei auch im Windows-Editor sauber umbricht.
 const text=(kopf.join("\n")+bloecke.join("\n")).replace(/\n/g,"\r\n");
 feedbackDatenSpeichern(new Blob(["\ufeff"+text],{type:"text/plain;charset=utf-8"}),feedbackDateiname("txt"));
};

$("openFeedback").onclick=()=>{
 fuelleFeedbackModule();
 $("feedbackMessage").value="";
 $("feedbackModal").hidden=false;
};
$("cancelFeedback").onclick=()=>{$("feedbackModal").hidden=true};
$("feedbackList").addEventListener("click",async e=>{
 const toggle=e.target.closest("[data-feedback-toggle]");
 if(toggle){
  const id=Number(toggle.dataset.feedbackToggle);
  const neuerStatus=toggle.dataset.resolved!=="1";
  const {error}=await sb.from("feedback").update({resolved:neuerStatus}).eq("id",id);
  if(error){alert("Fehler: "+error.message);return}
  renderFeedbackList();
  return;
 }
 const del=e.target.closest("[data-feedback-del]");
 if(del){
  if(!confirm("Dieses Feedback wirklich löschen?"))return;
  const {error}=await sb.from("feedback").delete().eq("id",Number(del.dataset.feedbackDel));
  if(error){alert("Fehler: "+error.message);return}
  renderFeedbackList();
 }
});
$("saveFeedback").onclick=async()=>{
 const message=$("feedbackMessage").value.trim();
 if(!message){alert("Bitte ein Feedback eingeben.");return}
 $("saveFeedback").disabled=true;
 const {error}=await sb.from("feedback").insert({
  module:$("feedbackModul").value,
  message,
  created_by:currentProfile?currentProfile.id:null
 });
 $("saveFeedback").disabled=false;
 if(error){alert("Fehler beim Senden: "+error.message);return}
 $("feedbackModal").hidden=true;
 alert("Danke für dein Feedback!");
};
