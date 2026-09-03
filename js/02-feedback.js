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
// Welche Feedbacks sollen heruntergeladen werden? Ausgewaehlt wird ueber
// die IDs, damit die Auswahl das Umsortieren ueberlebt (die Liste wird
// dabei neu gezeichnet). Beim Oeffnen des Bereichs ist alles ausgewaehlt -
// der Download verhaelt sich damit wie vorher, bis der Benutzer eingrenzt.
let feedbackAuswahl=new Set();

// ---------------------------------------------------------------------------
// Zwei Ansichten, EINE Umsetzung  (v2.70, Feedback 1)
// ---------------------------------------------------------------------------
// "firma"     – Einstellungen → Feedback: der Firmenadmin sieht das Feedback
//               SEINER Firma. Gelesen ueber die normale Abfrage, die
//               Firmengrenze erzwingt allein die restriktive RLS.
// "betreiber" – System-Administration: der Betreiber sieht das Feedback ALLER
//               Firmen. Gelesen ueber system_admin_all_feedback(), das
//               is_system_admin() serverseitig prueft. Ohne diese Ansicht
//               erreicht ihn Feedback aus einer Kundenfirma nie - genau das
//               war gemeldet ("Feedback funktioniert nicht mit anderer firma").
// Sortierung, Auswahl, Zaehlzeile und beide Downloads sind fuer beide
// Ansichten derselbe Code; verschieden sind nur die Element-IDs, die
// Firmenspalte und der Schreibweg.
const FEEDBACK_ANSICHTEN={
 firma:{schluessel:"firma",liste:"feedbackList",info:"feedbackCountInfo",
        bars:["feedbackSortBar","feedbackPickBar","feedbackExportBar"],
        xlsx:"feedbackExportXlsx",txt:"feedbackExportTxt",
        mitFirma:false,darfLoeschen:true},
 betreiber:{schluessel:"betreiber",liste:"sysFeedbackList",info:"sysFeedbackCountInfo",
        bars:["sysFeedbackSortBar","sysFeedbackPickBar","sysFeedbackExportBar"],
        xlsx:"sysFeedbackExportXlsx",txt:"sysFeedbackExportTxt",
        mitFirma:true,darfLoeschen:false}
};
let feedbackAnsicht=FEEDBACK_ANSICHTEN.firma;
function istBetreiberAnsicht(){return feedbackAnsicht.schluessel==="betreiber"}
function feedbackFirma(f){
 return (f&&f.company_name)?String(f.company_name):"Unbekannte Firma";
}

const FEEDBACK_SORTIERUNGEN={
 offen: {label:"Offen zuerst",   fn:(a,b)=>(a.resolved?1:0)-(b.resolved?1:0)||feedbackZeit(b)-feedbackZeit(a)},
 neu:   {label:"Neueste zuerst", fn:(a,b)=>feedbackZeit(b)-feedbackZeit(a)},
 alt:   {label:"Älteste zuerst", fn:(a,b)=>feedbackZeit(a)-feedbackZeit(b)},
 modul: {label:"Modul (A–Z)",    fn:(a,b)=>feedbackText(a.module).localeCompare(feedbackText(b.module),"de")||feedbackZeit(b)-feedbackZeit(a)},
 person:{label:"Mitarbeiter (A–Z)",fn:(a,b)=>feedbackPerson(a).localeCompare(feedbackPerson(b),"de")||feedbackZeit(b)-feedbackZeit(a)},
 // Nur in der Betreiber-Ansicht sinnvoll, dort aber die wichtigste Sortierung.
 firma: {label:"Firma (A–Z)",     fn:(a,b)=>feedbackFirma(a).localeCompare(feedbackFirma(b),"de")||feedbackZeit(b)-feedbackZeit(a)}
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

// opt.behalten=true: die bestehende Auswahl beibehalten (nach "erledigt"
// oder "geloescht" neu geladen). Ohne Angabe - also beim Oeffnen des
// Bereichs - ist wieder alles ausgewaehlt.
async function renderFeedbackList(opt){
 if(!isAdmin())return;
 feedbackAnsicht=FEEDBACK_ANSICHTEN.firma;
 if(feedbackSort==="firma")feedbackSort="offen";   // Firmenspalte gibt es hier nicht
 $(feedbackAnsicht.liste).innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.from("feedback").select("*,profiles(first_name,last_name)");
 if(error){
  feedbackCache=[];feedbackAuswahl=new Set();
  $(feedbackAnsicht.liste).innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;
  renderFeedbackKopf(true);
  return;
 }
 feedbackCache=data||[];
 const ids=new Set(feedbackCache.map(f=>f.id));
 feedbackAuswahl=(opt&&opt.behalten)
  // Nur noch vorhandene IDs behalten - ein geloeschtes Feedback faellt raus.
  ?new Set([...feedbackAuswahl].filter(id=>ids.has(id)))
  :new Set(ids);
 renderFeedbackRows();
}

// Betreiber-Ansicht: Feedback ALLER Firmen, ueber die serverseitig
// geschuetzte Funktion. Der Client filtert nichts selbst - die Pruefung
// liegt vollstaendig in system_admin_all_feedback().
async function renderFeedbackBetreiberListe(opt){
 feedbackAnsicht=FEEDBACK_ANSICHTEN.betreiber;
 const box=$(feedbackAnsicht.liste);
 if(!box)return;
 box.innerHTML='<div class="small">Lädt…</div>';
 const {data,error}=await sb.rpc("system_admin_all_feedback");
 if(error){
  feedbackCache=[];feedbackAuswahl=new Set();
  box.innerHTML=`<div class="small" style="color:var(--red)">Fehler: ${esc(error.message)}</div>`;
  renderFeedbackKopf(true);
  return;
 }
 feedbackCache=data||[];
 const ids=new Set(feedbackCache.map(f=>f.id));
 feedbackAuswahl=(opt&&opt.behalten)
  ?new Set([...feedbackAuswahl].filter(id=>ids.has(id)))
  :new Set(ids);
 renderFeedbackRows();
}

// Die ausgewaehlten Feedbacks in der gerade gewaehlten Reihenfolge.
function feedbackAusgewaehlt(){
 return feedbackSortiert().filter(f=>feedbackAuswahl.has(f.id));
}

// Zeichnet nur die Liste neu - ohne erneute Abfrage.
function renderFeedbackRows(){
 const box=$(feedbackAnsicht.liste);
 if(!box)return;
 const list=feedbackSortiert();
 renderFeedbackKopf(false);
 // Beide Sortierleisten tragen dieselben data-Attribute; sichtbar ist immer
 // nur die der gerade geoeffneten Ansicht.
 document.querySelectorAll("[data-feedback-sort]").forEach(b=>{
  b.classList.toggle("active",b.dataset.feedbackSort===feedbackSort);
 });
 box.innerHTML=list.length?list.map(f=>{
  const wer=feedbackPerson(f);
  const wann=feedbackDatum(f);
  const gewaehlt=feedbackAuswahl.has(f.id);
  // Die ganze Kopfzeile ist das Label - grosse Trefferflaeche auf dem Handy.
  return `<div class="settingrow${gewaehlt?" feedback-gewaehlt":""}" style="display:block;padding:10px${f.resolved?";opacity:.55":""}">
<label class="feedback-pick"><input type="checkbox" data-feedback-pick="${f.id}"${gewaehlt?" checked":""}>
<span class="small" style="color:var(--muted)">${feedbackAnsicht.mitFirma?`<b>🏢 ${esc(feedbackFirma(f))}</b> · `:""}<b>${esc(f.module)}</b> · ${esc(wer)} · ${esc(wann)}${f.resolved?" · ✓ erledigt":""}</span></label>
<div style="margin-top:4px;white-space:pre-wrap${f.resolved?";text-decoration:line-through":""}">${esc(f.message)}</div>
<div class="bar" style="margin-top:6px">
<button type="button" class="gray" data-feedback-toggle="${f.id}" data-resolved="${f.resolved?"1":"0"}">${f.resolved?"↩️ Als offen markieren":"✓ Als erledigt markieren"}</button>
${feedbackAnsicht.darfLoeschen?`<button type="button" class="red" data-feedback-del="${f.id}">Löschen</button>`:""}
</div>
</div>`;
 }).join(""):'<div class="empty">Noch kein Feedback vorhanden.</div>';
}

// Zaehlzeile ueber der Liste; blendet die Knoepfe aus, solange es nichts
// zum Sortieren oder Herunterladen gibt.
function renderFeedbackKopf(fehler){
 const info=$(feedbackAnsicht.info);
 const n=feedbackCache.length;
 const offen=feedbackCache.filter(f=>!f.resolved).length;
 const gewaehlt=feedbackAuswahl.size;
 if(info){
  info.textContent=fehler?"":(n
   ?`${n} Feedback${n===1?"":"s"} · ${offen} offen · ${n-offen} erledigt · `
    +(gewaehlt?`${gewaehlt} zum Herunterladen ausgewählt`:"nichts ausgewählt")
   :"");
 }
 const leer=fehler||!n;
 feedbackAnsicht.bars.forEach(id=>{
  const el=$(id);
  if(el)el.hidden=leer;
 });
 // Ohne Auswahl gibt es nichts herunterzuladen - der Knopf bleibt gesperrt,
 // die Zaehlzeile darueber sagt warum.
 [[feedbackAnsicht.xlsx,"📊 Als Excel herunterladen"],
  [feedbackAnsicht.txt,"📄 Als Textdatei herunterladen"]].forEach(([id,text])=>{
  const el=$(id);
  if(!el)return;
  el.disabled=leer||!gewaehlt;
  el.textContent=gewaehlt?`${text} (${gewaehlt})`:text;
 });
}

// Eine Zeile je Feedback, in der gewaehlten Reihenfolge - Grundlage fuer
// beide Downloads, damit Excel und Textdatei nie auseinanderlaufen.
function feedbackSpalten(){
 return feedbackAnsicht.mitFirma
  ?["Nr.","Datum","Firma","Modul","Status","Mitarbeiter","Feedback"]
  :["Nr.","Datum","Modul","Status","Mitarbeiter","Feedback"];
}
function feedbackExportZeilen(){
 return feedbackAusgewaehlt().map((f,i)=>{
  const z=[i+1,feedbackDatum(f)];
  if(feedbackAnsicht.mitFirma)z.push(feedbackFirma(f));
  z.push(feedbackText(f.module),feedbackStatusText(f),feedbackPerson(f),feedbackText(f.message));
  return z;
 });
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

// Kaestchen: auf "change" hoeren. Ein "click"-Listener wuerde hier zwar
// auch funktionieren (der Klick aufs Label kommt als Klick auf das
// Kaestchen an), aber "change" ist das Ereignis, das die Zustandsaenderung
// wirklich meldet - auch bei Bedienung ueber die Tastatur.
function feedbackPickHandler(e){
 const box=e.target.closest?e.target.closest("[data-feedback-pick]"):null;
 if(!box)return;
 const id=Number(box.dataset.feedbackPick);
 if(box.checked)feedbackAuswahl.add(id);else feedbackAuswahl.delete(id);
 // Nur Kopfzeile und Zeilenmarkierung auffrischen - die Liste NICHT neu
 // zeichnen, sonst verliert das gerade angetippte Kaestchen den Zustand.
 renderFeedbackKopf(false);
 const zeile=box.closest?box.closest(".settingrow"):null;
 if(zeile)zeile.classList.toggle("feedback-gewaehlt",box.checked);
}

function feedbackPickAllHandler(e){
 const btn=e.target.closest("[data-feedback-pickall]");
 if(!btn)return;
 const wahl=btn.dataset.feedbackPickall;
 if(wahl==="1")feedbackAuswahl=new Set(feedbackCache.map(f=>f.id));
 else if(wahl==="0")feedbackAuswahl=new Set();
 else if(wahl==="offen")feedbackAuswahl=new Set(feedbackCache.filter(f=>!f.resolved).map(f=>f.id));
 renderFeedbackRows();
}

function feedbackSortHandler(e){
 const btn=e.target.closest("[data-feedback-sort]");
 if(!btn)return;
 const wahl=btn.dataset.feedbackSort;
 if(!FEEDBACK_SORTIERUNGEN[wahl]||wahl===feedbackSort)return;
 feedbackSort=wahl;
 renderFeedbackRows();
}

function feedbackExportXlsxHandler(){
 if(!feedbackAuswahl.size){alert("Bitte mindestens ein Feedback auswählen.");return}
 // xlsx.full.min.js liegt bereits im Kopf von index.html (wird auch fuer
 // den Material-Import gebraucht). Fehlt es einmal, sagen wir das ehrlich,
 // statt eine kaputte Datei zu erzeugen.
 if(typeof XLSX==="undefined"){
  alert("Die Excel-Funktion konnte nicht geladen werden. Bitte die Seite mit bestehender Internetverbindung neu laden – oder den Textdatei-Export verwenden.");
  return;
 }
 const daten=[feedbackSpalten(),...feedbackExportZeilen()];
 const blatt=XLSX.utils.aoa_to_sheet(daten);
 blatt["!cols"]=feedbackAnsicht.mitFirma
  ?[{wch:5},{wch:18},{wch:22},{wch:26},{wch:10},{wch:22},{wch:70}]
  :[{wch:5},{wch:18},{wch:26},{wch:10},{wch:22},{wch:70}];
 const mappe=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(mappe,blatt,"Feedback");
 const roh=XLSX.write(mappe,{bookType:"xlsx",type:"array"});
 feedbackDatenSpeichern(
  new Blob([roh],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
  feedbackDateiname("xlsx"));
}

function feedbackExportTxtHandler(){
 if(!feedbackAuswahl.size){alert("Bitte mindestens ein Feedback auswählen.");return}
 const zeilen=feedbackExportZeilen();
 const gewaehlt=feedbackAusgewaehlt();
 const offen=gewaehlt.filter(f=>!f.resolved).length;
 const sortLabel=(FEEDBACK_SORTIERUNGEN[feedbackSort]||FEEDBACK_SORTIERUNGEN.offen).label;
 const kopf=[
  `${feedbackAnsicht.mitFirma?"Spengler-DIGITAL – Feedback aller Firmen":companyName+" – Feedback"}`,
  `Stand: ${new Date().toLocaleString("de-CH")}`,
  `${zeilen.length} von ${feedbackCache.length} Feedback${feedbackCache.length===1?"":"s"} ausgewählt`
   +` · ${offen} offen · ${zeilen.length-offen} erledigt`,
  `Sortierung: ${sortLabel}`,
  "=".repeat(64),
  ""
 ];
 const spalten=feedbackSpalten();
 const bloecke=zeilen.map(z=>[
  `#${z[0]}  ${z[1]}`,
  ...spalten.slice(2,-1).map((name,i)=>`${(name+":").padEnd(13)}${z[i+2]}`),
  "",
  // Mehrzeilige Meldungen bleiben eingerueckt lesbar.
  String(z[z.length-1]).split(/\r?\n/).map(t=>"  "+t).join("\n"),
  "",
  "-".repeat(64),
  ""
 ].join("\n"));
 // CRLF, damit die Datei auch im Windows-Editor sauber umbricht.
 const text=(kopf.join("\n")+bloecke.join("\n")).replace(/\n/g,"\r\n");
 feedbackDatenSpeichern(new Blob(["\ufeff"+text],{type:"text/plain;charset=utf-8"}),feedbackDateiname("txt"));
}

// Beide Ansichten haengen an denselben Handlern - eine Umsetzung, zwei Orte.
Object.values(FEEDBACK_ANSICHTEN).forEach(a=>{
 const liste=$(a.liste); if(liste){liste.addEventListener("change",feedbackPickHandler);
                                   liste.addEventListener("click",feedbackListeHandler);}
 const [sortBar,pickBar]=a.bars;
 const sb2=$(sortBar); if(sb2)sb2.addEventListener("click",feedbackSortHandler);
 const pb=$(pickBar);  if(pb)pb.addEventListener("click",feedbackPickAllHandler);
 const x=$(a.xlsx); if(x)x.onclick=feedbackExportXlsxHandler;
 const t=$(a.txt);  if(t)t.onclick=feedbackExportTxtHandler;
});

$("openFeedback").onclick=()=>{
 fuelleFeedbackModule();
 $("feedbackMessage").value="";
 $("feedbackModal").hidden=false;
};
$("cancelFeedback").onclick=()=>{$("feedbackModal").hidden=true};
// Liste neu laden - je nach Ansicht ueber die RLS-Abfrage oder die
// geschuetzte Betreiber-Funktion.
function feedbackNeuLaden(opt){
 return istBetreiberAnsicht()?renderFeedbackBetreiberListe(opt):renderFeedbackList(opt);
}

async function feedbackListeHandler(e){
 const toggle=e.target.closest("[data-feedback-toggle]");
 if(toggle){
  const id=Number(toggle.dataset.feedbackToggle);
  const neuerStatus=toggle.dataset.resolved!=="1";
  if(istBetreiberAnsicht()){
   // Fremde Firma: nur ueber die serverseitig geschuetzte Funktion.
   const {data,error}=await sb.rpc("system_admin_set_feedback_resolved",
     {p_id:id,p_resolved:neuerStatus});
   if(error){alert("Fehler: "+error.message);return}
   if(!data){alert("Es wurde nichts geändert. Fehlt die nötige Berechtigung?");return}
  }else{
   // Ein von RLS blockiertes UPDATE meldet keinen Fehler, es betrifft
   // still 0 Zeilen (siehe CLAUDE.md 24.1) - deshalb das Ergebnis pruefen.
   const {data,error}=await sb.from("feedback").update({resolved:neuerStatus}).eq("id",id).select();
   if(error){alert("Fehler: "+error.message);return}
   if(!data||!data.length){alert("Es wurde nichts geändert. Fehlt die nötige Berechtigung?");return}
  }
  feedbackNeuLaden({behalten:true});
  return;
 }
 const del=e.target.closest("[data-feedback-del]");
 if(del){
  // In der Betreiber-Ansicht gibt es bewusst keinen Loeschknopf: das
  // Feedback gehoert der jeweiligen Firma.
  if(!feedbackAnsicht.darfLoeschen)return;
  if(!confirm("Dieses Feedback wirklich löschen?"))return;
  const {data,error}=await sb.from("feedback").delete().eq("id",Number(del.dataset.feedbackDel)).select();
  if(error){alert("Fehler: "+error.message);return}
  if(!data||!data.length){alert("Es wurde nichts gelöscht. Fehlt die nötige Berechtigung?");return}
  feedbackNeuLaden({behalten:true});
 }
}
$("saveFeedback").onclick=async()=>{
 const message=$("feedbackMessage").value.trim();
 if(offlineSperrtSpeichern("Dieses Feedback"))return;
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
