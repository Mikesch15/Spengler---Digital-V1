"use strict";
// ===========================================================================
// v3.375  Terminplanung
// ---------------------------------------------------------------------------
// Eigener Schirm "Termine" (Mehr > Termine, und die Karte auf der Startseite): Wochenansicht, Termin anlegen/ändern/löschen,
// optional mit einem Projekt verknüpft, optional mit Mitarbeitern. Dazu der Import einer Kalenderdatei (.ics) vom Handy
// (Lesen: js/91-ics-parser.js). Tabelle `termine` (RLS: Firma + Recht projects/view bzw. projects/edit).
//
// Grundsätze: Nichts wird automatisch verknüpft oder gespeichert - der Import zeigt zuerst eine Vorschau, ein Projekt wird nur
// VORGESCHLAGEN und kann geändert werden. Schreibvorgänge werden geprüft (RLS meldet bei einem Verbot keinen Fehler, sondern
// betrifft still 0 Zeilen). Termine liegen neben den Aufgaben der Werkstatt; es gibt keine Verbindung zu `aufgaben_termine`.
// ===========================================================================
const TER_TAGE=["So","Mo","Di","Mi","Do","Fr","Sa"];
let terWoche="";            // Montag der angezeigten Woche (YYYY-MM-DD)
let terDaten=[];            // Termine der angezeigten Woche
let terFehler="";
let terEditId=null;         // null = kein Editor offen, 0 = neuer Termin, sonst die ID
let terImportListe=null;    // Vorschau des Imports
let terKarte={liste:null,stand:0,laedt:false,versuch:0};
const TER_KARTE_NEU_MS=60*1000;

// ---- Datum ----------------------------------------------------------------
function terIso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function terHeute(){return terIso(new Date())}
function terPlus(iso,tage){const [y,m,d]=iso.split("-").map(Number);return terIso(new Date(y,m-1,d+tage))}
function terMontag(iso){const [y,m,d]=iso.split("-").map(Number),w=new Date(y,m-1,d).getDay();return terPlus(iso,w===0?-6:1-w)}
function terTagName(iso){const [y,m,d]=iso.split("-").map(Number);return TER_TAGE[new Date(y,m-1,d).getDay()]}
function terKurz(iso){const [y,m,d]=String(iso).split("-");return d+"."+m+"."}
function terLang(iso){const [y,m,d]=String(iso).split("-");return d+"."+m+"."+y}
function terIsoOk(s){return /^\d{4}-\d{2}-\d{2}$/.test(String(s||""))&&!isNaN(new Date(s+"T00:00:00"))}
function terZeitOk(s){return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s||""))}
function terZeitKurz(t){return t?String(t).slice(0,5):""}
// Wann ein Termin sich im Text zeigt: "08:30–10:00", "ganztags", "ab 08:30", mehrtägig mit Datum
function terZeitText(t){
 const mehr=t.ende_datum!==t.start_datum;
 if(!t.start_zeit)return mehr?("ganztags bis "+terKurz(t.ende_datum)):"ganztags";
 const s=terZeitKurz(t.start_zeit),e=terZeitKurz(t.ende_zeit);
 if(mehr)return s+" – "+terKurz(t.ende_datum)+(e?" "+e:"");
 return e?(s+"–"+e):("ab "+s);
}
function terProjektName(id){
 if(id===null||id===undefined)return "";
 const p=(typeof allProjects!=="undefined"&&Array.isArray(allProjects)?allProjects:[]).find(x=>String(x.id)===String(id));
 return p?(typeof projektTitel==="function"?projektTitel(p):(p.name||"")):"";
}
function terMitarbeiterText(ids){
 if(!Array.isArray(ids)||!ids.length)return "";
 return ids.map(i=>typeof profileName==="function"?profileName(i):null).filter(Boolean).join(", ");
}
// Termine eines Tages (mehrtägige erscheinen an jedem Tag), Ganztägige zuerst, sonst nach Beginn
function terFuerTag(liste,iso){
 return liste.filter(t=>t.start_datum<=iso&&t.ende_datum>=iso)
  .sort((a,b)=>(a.start_zeit?1:0)-(b.start_zeit?1:0)||String(a.start_zeit||"").localeCompare(String(b.start_zeit||""))||String(a.titel).localeCompare(String(b.titel)));
}

// ---- Laden ----------------------------------------------------------------
async function terLaden(){
 const von=terWoche,bis=terPlus(terWoche,6);
 try{
  const {data,error}=await sb.from("termine").select("*")
   .lte("start_datum",bis).gte("ende_datum",von).order("start_datum").order("start_zeit",{nullsFirst:true}).limit(500);
  if(error){terFehler=dbFehlerText?dbFehlerText(error):"Termine konnten nicht geladen werden.";return false}
  terFehler="";terDaten=Array.isArray(data)?data:[];return true;
 }catch(e){terFehler="Termine konnten nicht geladen werden (keine Verbindung?).";return false}
}
// ---- Zeichnen -------------------------------------------------------------
function terTerminHtml(t){
 const pn=terProjektName(t.project_id),ma=terMitarbeiterText(t.mitarbeiter);
 return `<button type="button" class="a2-zeile a2-ter-zeile" data-ter-edit="${esc(t.id)}">
  <span class="a2-ter-zeit">${esc(terZeitText(t))}</span>
  <span class="a2-zeile-text"><b>${t.quelle==="outlook"?"📧 ":(t.quelle==="google"?"📅 ":(t.quelle==="abo"?"🔒 ":""))}${esc(t.titel)}</b>
   <span>${esc([pn,t.ort,ma].filter(Boolean).join(" · "))}${t.projekt_pruefen?' <span class="a2-ter-pruefen">Projekt prüfen</span>':""}</span></span>
  <span class="a2-zeile-pfeil">›</span></button>`;
}
function terWocheHtml(){
 const heute=terHeute();
 const tage=[0,1,2,3,4,5,6].map(n=>terPlus(terWoche,n));
 const kopf=`${terKurz(tage[0])}–${terLang(tage[6])}`;
 let html=`<div class="card"><div class="bar a2-ter-nav">
  <button type="button" class="gray" id="terZurueck" aria-label="Vorige Woche">‹</button>
  <b class="a2-ter-woche">${esc(kopf)}</b>
  <button type="button" class="gray" id="terVor" aria-label="Nächste Woche">›</button>
  <button type="button" class="gray" id="terHeuteKnopf">Heute</button></div></div>`;
 if(terFehler)html+=`<div class="card"><div class="small">${esc(terFehler)}</div></div>`;
 html+=tage.map(iso=>{
  const liste=terFuerTag(terDaten,iso);
  return `<div class="a2-abschnitt a2-ter-tag${iso===heute?" a2-ter-heute":""}">
   <div class="a2-abschnitt-kopf"><h2>${esc(terTagName(iso))} ${esc(terKurz(iso))}${iso===heute?" · Heute":""}</h2></div>
   ${liste.length?liste.map(terTerminHtml).join(""):'<div class="small a2-ter-leer">Kein Termin</div>'}</div>`;
 }).join("");
 return html;
}
function terZeichnen(){
 const box=$("terListe");if(!box)return;
 box.innerHTML=terWocheHtml();
}
// ---- Editor ---------------------------------------------------------------
function terProjektOptionen(sel){
 const liste=(typeof allProjects!=="undefined"&&Array.isArray(allProjects)?allProjects:[]).filter(p=>!p.archived||String(p.id)===String(sel));
 return '<option value="">– kein Projekt –</option>'+liste.map(p=>{
  const n=(typeof projektTitel==="function"?projektTitel(p):p.name)+(p.order_no?" · "+p.order_no:"");
  return `<option value="${esc(p.id)}"${String(p.id)===String(sel)?" selected":""}>${esc(n)}</option>`;
 }).join("");
}
function terMitarbeiterBoxen(sel){
 const ps=(typeof allProfiles!=="undefined"&&Array.isArray(allProfiles)?allProfiles:[]);
 if(!ps.length)return '<div class="small">Keine Mitarbeiter geladen.</div>';
 return ps.map(p=>`<label class="rechte-schalter"><input type="checkbox" data-ter-ma="${esc(p.id)}"${(sel||[]).includes(p.id)?" checked":""}> ${esc(((p.first_name||"")+" "+(p.last_name||"")).trim()||"Ohne Namen")}</label>`).join("");
}
function terEditorOeffnen(id){
 const box=$("terEditor");if(!box)return;
 let t={titel:"",start_datum:terWoche===terMontag(terHeute())?terHeute():terWoche,ende_datum:"",start_zeit:"",ende_zeit:"",ort:"",notiz:"",project_id:null,mitarbeiter:[]};
 if(id){const f=terDaten.find(x=>String(x.id)===String(id));if(!f)return;t=Object.assign({},f)}
 if(t.quelle==="abo"){   // v3.385: Kalender-Abo = nur lesen (ein Ändern würde beim nächsten Abgleich ohnehin überschrieben)
  terEditId=null;
  box.hidden=false;
  box.innerHTML=`<h3>🔒 ${esc(t.titel)}</h3>
  <div class="small">Aus deinem abonnierten Kalender – kann hier nicht geändert werden. Änderungen im Original-Kalender erscheinen nach dem nächsten Abgleich.</div>
  <div>${esc(terZeitText(t))} · ${esc(terLang(t.start_datum))}${t.ende_datum&&t.ende_datum!==t.start_datum?" – "+esc(terLang(t.ende_datum)):""}</div>
  ${t.ort?`<div class="small">📍 ${esc(t.ort)}</div>`:""}${t.notiz?`<div class="small" style="white-space:pre-wrap">${esc(t.notiz)}</div>`:""}
  <div class="bar" style="margin-top:8px"><button type="button" class="gray" id="terEditorZu">Schliessen</button></div>`;
  box.scrollIntoView({block:"nearest"});return;
 }
 terEditId=id?Number(id):0;
 const ganz=id?!t.start_zeit:false;   // ein neuer Termin beginnt mit Zeiten; ganztaegig waehlt man bewusst
 box.hidden=false;
 box.innerHTML=`<h3>${id?"Termin bearbeiten":"Neuer Termin"}</h3>
  <div class="grid">
   <div class="wide"><label>Titel</label><input id="terTitel" maxlength="200" value="${esc(t.titel)}" placeholder="z. B. Besichtigung Dach"></div>
   <div class="wide"><label>Projekt (optional)</label><select id="terProjekt">${terProjektOptionen(t.project_id)}</select></div>
   ${id&&t.project_id&&typeof a2ProjektOeffnen==="function"?'<div class="wide"><button type="button" class="gray" id="terProjektOeffnen">➜ Projekt öffnen</button></div>':""}
   ${id&&t.projekt_pruefen?'<div class="wide small">Dieser Termin kam aus Outlook ohne sichere Projektzuordnung. Beim Speichern gilt die Zuordnung (oder „kein Projekt“) als geprüft.</div>':""}
   <div><label>Beginn (Datum)</label><input id="terStartDatum" type="date" value="${esc(t.start_datum)}"></div>
   <div><label>Beginn (Zeit)</label><input id="terStartZeit" type="time" value="${esc(terZeitKurz(t.start_zeit))}"${ganz?" disabled":""}></div>
   <div><label>Ende (Datum)</label><input id="terEndeDatum" type="date" value="${esc(t.ende_datum||t.start_datum)}"></div>
   <div><label>Ende (Zeit)</label><input id="terEndeZeit" type="time" value="${esc(terZeitKurz(t.ende_zeit))}"${ganz?" disabled":""}></div>
   <div class="wide"><label class="rechte-schalter"><input type="checkbox" id="terGanztags"${ganz?" checked":""}> Ganztägig</label></div>
   <div class="wide"><label>Ort (optional)</label><input id="terOrt" maxlength="300" value="${esc(t.ort||"")}"></div>
   <div class="wide"><label>Notiz (optional)</label><textarea id="terNotiz" rows="3" maxlength="4000">${esc(t.notiz||"")}</textarea></div>
   <div class="wide"><label>Mitarbeiter (optional)</label>${terMitarbeiterBoxen(t.mitarbeiter)}</div>
  </div>
  <div class="bar" style="margin-top:8px"><button type="button" class="green" id="terSpeichern">💾 Speichern</button>
   <button type="button" class="gray" id="terEditorZu">Abbrechen</button>
   ${id?'<button type="button" class="red" id="terLoeschen">🗑 Löschen</button>':""}</div>`;
 box.scrollIntoView({block:"nearest"});
}
function terEditorLesen(){
 const v=id=>($(id)?$(id).value:"");
 const ganz=!!($("terGanztags")&&$("terGanztags").checked);
 const ma=[...document.querySelectorAll("#terEditor [data-ter-ma]")].filter(c=>c.checked).map(c=>c.getAttribute("data-ter-ma"));
 const startZ=ganz?"":v("terStartZeit"),endZ=ganz?"":v("terEndeZeit");
 return {titel:v("terTitel").replace(/\s+/g," ").trim(),project_id:v("terProjekt")?Number(v("terProjekt")):null,
  start_datum:v("terStartDatum"),ende_datum:v("terEndeDatum")||v("terStartDatum"),start_zeit:startZ||null,ende_zeit:endZ||null,
  ort:v("terOrt").trim()||null,notiz:v("terNotiz").trim()||null,mitarbeiter:ma};
}
// Prüft eine Eingabe; gibt den Fehlertext oder "" zurück
function terPruefen(t){
 if(!t.titel)return "Bitte einen Titel eingeben.";
 if(t.titel.length>200)return "Der Titel ist zu lang (höchstens 200 Zeichen).";
 if(!terIsoOk(t.start_datum))return "Bitte ein Beginn-Datum wählen.";
 if(!terIsoOk(t.ende_datum))return "Bitte ein Ende-Datum wählen.";
 if(t.ende_datum<t.start_datum)return "Das Ende liegt vor dem Beginn.";
 if(t.start_zeit&&!terZeitOk(t.start_zeit))return "Die Beginn-Zeit ist ungültig.";
 if(t.ende_zeit&&!terZeitOk(t.ende_zeit))return "Die Ende-Zeit ist ungültig.";
 if(t.ende_zeit&&!t.start_zeit)return "Eine Ende-Zeit braucht auch eine Beginn-Zeit.";
 if(t.ende_zeit&&t.ende_datum===t.start_datum&&t.ende_zeit<t.start_zeit)return "Das Ende liegt vor dem Beginn.";
 return "";
}
async function terSpeichern(){
 const t=terEditorLesen(),f=terPruefen(t);
 if(f){await appAlert(f);return}
 const knopf=$("terSpeichern");if(knopf)knopf.disabled=true;
 try{
  let res;
  if(terEditId)res=await sb.from("termine").update({...t,projekt_pruefen:false}).eq("id",terEditId).select("id");
  else res=await sb.from("termine").insert(t).select("id");
  if(res.error){await appAlert("Konnte nicht gespeichert werden: "+(dbFehlerText?dbFehlerText(res.error):res.error.message));return}
  if(!res.data||!res.data.length){await appAlert("Nicht gespeichert – fehlt die nötige Berechtigung?");return}
  terEditId=null;$("terEditor").hidden=true;
  terWoche=terMontag(t.start_datum);
  await terLaden();terZeichnen();terKarte.stand=0;
 }catch(e){await appAlert("Fehler beim Speichern: "+(e&&e.message?e.message:e))}
 finally{if(knopf)knopf.disabled=false}
}
async function terLoeschen(){
 if(!terEditId)return;
 if(!(await appConfirm("Diesen Termin löschen?",{ok:"Löschen"})))return;
 const res=await sb.from("termine").delete().eq("id",terEditId).select("id");
 if(res.error){await appAlert("Konnte nicht gelöscht werden: "+(dbFehlerText?dbFehlerText(res.error):res.error.message));return}
 if(!res.data||!res.data.length){await appAlert("Nichts gelöscht – fehlt die nötige Berechtigung?");return}
 terEditId=null;$("terEditor").hidden=true;
 await terLaden();terZeichnen();terKarte.stand=0;
}

// ---- Import (.ics) ----------------------------------------------------------
function terImportHtml(){
 const L=terImportListe;if(!L)return "";
 const projekte=(typeof allProjects!=="undefined"&&Array.isArray(allProjects)?allProjects:[]);
 const neu=L.termine.filter(t=>!t.vorhanden).length,vorh=L.termine.length-neu;
 const zeilen=L.termine.map((t,i)=>{
  const gewaehlt=t.gewaehlt?" checked":"";
  return `<div class="a2-ter-imp${t.vorhanden?" a2-ter-imp-alt":""}">
   <label class="rechte-schalter"><input type="checkbox" data-ter-imp="${i}"${gewaehlt}${t.vorhanden?" disabled":""}>
    <b>${esc(t.titel)}</b></label>
   <div class="small">${esc(terLang(t.start_datum))}${t.start_datum!==t.ende_datum?" – "+esc(terLang(t.ende_datum)):""} · ${esc(terZeitText(t))}${t.ort?" · "+esc(t.ort):""}${t.wiederkehrend?" · wiederkehrend (nur 1. Termin)":""}</div>
   ${t.vorhanden?'<div class="small">Bereits importiert – wird übersprungen.</div>'
    :`<select data-ter-imp-proj="${i}" aria-label="Projekt">${terProjektOptionen(t.projectId)}</select>${t.vorschlag?'<div class="small">Projekt vorgeschlagen (nach Adresse/Nummer) – bitte prüfen.</div>':""}`}
  </div>`;}).join("");
 return `<h3>Import: ${esc(L.name)}</h3>
  <div class="small">${neu} neu${vorh?`, ${vorh} schon vorhanden`:""}${L.uebersprungen?`, ${L.uebersprungen} ausgelassen`:""}. Es wird nichts gespeichert, bevor Sie „Importieren“ tippen.</div>
  ${L.hinweise.map(h=>`<div class="small">ℹ️ ${esc(h)}</div>`).join("")}
  <div class="a2-ter-imp-liste">${zeilen}</div>
  <div class="bar" style="margin-top:8px"><button type="button" class="green" id="terImportieren">📥 Importieren</button>
   <button type="button" class="gray" id="terImportZu">Abbrechen</button></div>`;
}
async function terDateiLesen(datei){
 const box=$("terImportBox");if(!box)return;
 if(!datei)return;
 if(datei.size>ICS_MAX_BYTES){await appAlert("Die Datei ist zu gross (höchstens 2 MB).");return}
 let text="";
 try{text=await (datei.text?datei.text():new Promise((ok,nok)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||""));r.onerror=()=>nok(r.error);r.readAsText(datei)}))}
 catch(e){await appAlert("Die Datei konnte nicht gelesen werden.");return}
 const r=icsLesen(text);
 if(r.fehler){await appAlert(r.fehler);return}
 // schon importierte Termine erkennen (gleiche UID in der Datenbank)
 const vorhanden=new Set();
 const keys=r.termine.map(t=>t.uid);
 for(let i=0;i<keys.length;i+=40){
  const {data,error}=await sb.from("termine").select("ics_uid").in("ics_uid",keys.slice(i,i+40));
  if(error){await appAlert("Der Abgleich mit bereits importierten Terminen ist fehlgeschlagen: "+(dbFehlerText?dbFehlerText(error):error.message));return}
  (data||[]).forEach(x=>vorhanden.add(x.ics_uid));
 }
 const heute=terHeute(),projekte=(typeof allProjects!=="undefined"&&Array.isArray(allProjects)?allProjects:[]);
 r.termine.forEach(t=>{
  t.vorhanden=vorhanden.has(t.uid);
  t.gewaehlt=!t.vorhanden&&t.ende_datum>=heute;   // Vergangenes wird nicht vorgewählt
  const v=icsProjektVorschlag(t,projekte);
  t.projectId=v?v.projectId:null;t.vorschlag=!!v;
 });
 terImportListe={name:datei.name||"Kalender.ics",termine:r.termine,hinweise:r.hinweise,uebersprungen:r.uebersprungen};
 box.hidden=false;box.innerHTML=terImportHtml();
 box.scrollIntoView({block:"nearest"});
}
async function terImportieren(){
 const L=terImportListe;if(!L)return;
 const wahl=L.termine.filter(t=>t.gewaehlt&&!t.vorhanden);
 if(!wahl.length){await appAlert("Es ist kein Termin ausgewählt.");return}
 const zeilen=wahl.map(t=>({titel:t.titel,start_datum:t.start_datum,ende_datum:t.ende_datum,start_zeit:t.start_zeit,ende_zeit:t.ende_zeit,
  ort:t.ort||null,notiz:t.notiz||null,project_id:t.projectId||null,mitarbeiter:[],ics_uid:t.uid,quelle:"ics"}));
 const knopf=$("terImportieren");if(knopf)knopf.disabled=true;
 let ok=0;
 try{
  for(let i=0;i<zeilen.length;i+=50){
   const teil=zeilen.slice(i,i+50);
   const {data,error}=await sb.from("termine").insert(teil).select("id");
   if(error){await appAlert("Import abgebrochen nach "+ok+" von "+zeilen.length+" Terminen: "+(dbFehlerText?dbFehlerText(error):error.message));break}
   if(!data||data.length!==teil.length){await appAlert("Nicht alles wurde gespeichert – fehlt die nötige Berechtigung? ("+ok+" von "+zeilen.length+")");break}
   ok+=data.length;
  }
 }finally{if(knopf)knopf.disabled=false}
 if(ok){
  const erster=wahl.map(t=>t.start_datum).sort()[0];
  terImportListe=null;$("terImportBox").hidden=true;
  terWoche=terMontag(erster<terHeute()?terHeute():erster);
  await terLaden();terZeichnen();terKarte.stand=0;
  if(ok===zeilen.length)await appAlert(ok+" Termin"+(ok===1?"":"e")+" importiert.");
 }
}

// ---- Öffnen / Schliessen ------------------------------------------------------
async function terOeffnen(){
 if(typeof olLaden==="function")olLaden();
 if(typeof gkLaden==="function")gkLaden();
 if(typeof aboLaden==="function")aboLaden();
 const modal=$("termineModal");if(!modal)return;
 terWoche=terMontag(terHeute());terEditId=null;terImportListe=null;
 if($("terEditor"))$("terEditor").hidden=true;
 if($("terImportBox"))$("terImportBox").hidden=true;
 modal.hidden=false;
 terZeichnen();
 await terLaden();terZeichnen();
}

// ---- Karte auf der Startseite ----------------------------------------------------
function terKarteListe(){
 const heute=terHeute(),bis=terPlus(heute,7);
 return (terKarte.liste||[]).filter(t=>t.ende_datum>=heute&&t.start_datum<=bis)
  .sort((a,b)=>(a.start_datum+(a.start_zeit||"")).localeCompare(b.start_datum+(b.start_zeit||""))).slice(0,4);
}
function terKarteHtml(){
 if(!terKarte.laedt&&Date.now()-terKarte.versuch>TER_KARTE_NEU_MS&&Date.now()-terKarte.stand>TER_KARTE_NEU_MS)terKarteLaden();
 const l=terKarteListe(),heute=terHeute();
 const zeilen=l.length?l.map(t=>`<div class="a2-ter-kz"><b>${esc(t.start_datum<=heute?"Heute":terTagName(t.start_datum)+" "+terKurz(t.start_datum))}</b> ${esc(terZeitText(t))} · ${esc(t.titel)}${terProjektName(t.project_id)?` <span class="small">(${esc(terProjektName(t.project_id))})</span>`:""}</div>`).join("")
  :`<div class="small">${terKarte.liste===null?"Termine werden geladen …":"Keine Termine in den nächsten 7 Tagen."}</div>`;
 return `<div class="a2-abschnitt a2-ter-karte" id="a2TermineKarte">
  <div class="a2-abschnitt-kopf"><h2>Termine</h2><button type="button" class="a2-knopf a2-knopf-klein a2-k-grau" data-a2-tu="termine">Öffnen</button></div>
  ${zeilen}</div>`;
}
function terKarteZeichnen(){
 const el=$("a2TermineKarte");if(!el)return;
 const t=document.createElement("div");t.innerHTML=terKarteHtml();
 if(t.firstElementChild)el.replaceWith(t.firstElementChild);
}
async function terKarteLaden(){
 if(terKarte.laedt)return;
 terKarte.laedt=true;terKarte.versuch=Date.now();
 try{
  const heute=terHeute();
  const {data,error}=await sb.from("termine").select("*").gte("ende_datum",heute).lte("start_datum",terPlus(heute,7)).order("start_datum").limit(50);
  if(!error&&Array.isArray(data)){terKarte.liste=data;terKarte.stand=Date.now()}
 }catch(e){}
 terKarte.laedt=false;
 terKarteZeichnen();
}

// ---- Ereignisse ---------------------------------------------------------------------
document.addEventListener("click",async e=>{
 const t=e.target&&e.target.closest?e.target:null;if(!t)return;
 const z=s=>t.closest(s);
 if(z("#closeTermine")){const m=$("termineModal");if(m)m.hidden=true;return}
 if(z("#terNeu")){terEditorOeffnen(0);return}
 if(z("#terImport")){const f=$("terDatei");if(f){f.value="";f.click()}return}
 if(z("#terZurueck")){terWoche=terPlus(terWoche,-7);terZeichnen();await terLaden();terZeichnen();return}
 if(z("#terVor")){terWoche=terPlus(terWoche,7);terZeichnen();await terLaden();terZeichnen();return}
 if(z("#terHeuteKnopf")){terWoche=terMontag(terHeute());terZeichnen();await terLaden();terZeichnen();return}
 const ed=z("[data-ter-edit]");if(ed){terEditorOeffnen(ed.getAttribute("data-ter-edit"));return}
 if(z("#terProjektOeffnen")){const t=terDaten.find(x=>Number(x.id)===terEditId);if(t&&t.project_id&&typeof a2ProjektOeffnen==="function"){const m=$("termineModal");await a2ProjektOeffnen(t.project_id);if(m)m.hidden=true}return}
 if(z("#terSpeichern")){await terSpeichern();return}
 if(z("#terLoeschen")){await terLoeschen();return}
 if(z("#terEditorZu")){terEditId=null;$("terEditor").hidden=true;return}
 if(z("#terImportieren")){await terImportieren();return}
 if(z("#terImportZu")){terImportListe=null;$("terImportBox").hidden=true;return}
});
document.addEventListener("change",e=>{
 const t=e.target;if(!t)return;
 if(t.id==="terDatei"){terDateiLesen(t.files&&t.files[0]);return}
 if(t.id==="terGanztags"){
  const g=t.checked;
  ["terStartZeit","terEndeZeit"].forEach(id=>{const el=$(id);if(el){el.disabled=g;if(g)el.value=""}});
  return;
 }
 if(t.id==="terStartDatum"){const ed=$("terEndeDatum");if(ed&&(!ed.value||ed.value<t.value))ed.value=t.value;return}
 if(t.hasAttribute&&t.hasAttribute("data-ter-imp")&&terImportListe){
  const x=terImportListe.termine[Number(t.getAttribute("data-ter-imp"))];if(x)x.gewaehlt=t.checked;return;
 }
 if(t.hasAttribute&&t.hasAttribute("data-ter-imp-proj")&&terImportListe){
  const x=terImportListe.termine[Number(t.getAttribute("data-ter-imp-proj"))];
  if(x){x.projectId=t.value?Number(t.value):null;x.vorschlag=false}
 }
});
