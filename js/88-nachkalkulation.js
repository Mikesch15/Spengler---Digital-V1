// ===========================================================================
// v3.366  Nachkalkulation: Abacus-Stunden importieren, mit Sollstunden und
//         den App-Regiestunden vergleichen
// ---------------------------------------------------------------------------
// Einstieg: Projektseite -> Register "Stunden" (nur mit Freischaltung
// "nachkalkulation" in feature_access, wie Offerte und Lager). Gelesen und
// geprüft wird in js/87-abacus-parser.js; hier stehen Oberfläche und
// Datenbankzugriff.
//
// GRENZEN (bewusst, aus dem Auftrag):
//  - Abacus ist nur Datenquelle, es gibt keine Schreibzugriffe dorthin.
//  - Importierte Stunden sind eine EIGENE Tabelle (abacus_stunden). Sie werden
//    nie als Offertposition, Regiematerial, Lager, Zuschnitt oder Leistung
//    gespeichert und ändern keinen Workflow-/Aufgabenstatus.
//  - Die Regiestunden der App (reports.work_entries) werden nur GELESEN; der
//    Abgleich verändert nichts. Ein Prüfvermerk ist ein eigener Eintrag.
//  - Firma und Projekt kommen aus der angemeldeten Sitzung / dem gewählten
//    Projekt, nie aus der Datei. Die Datenbank erzwingt das zusätzlich
//    (tenant_boundary_*, feature_boundary_*, Trigger enforce_abacus_*).
//  - Die Quelldatei wird nicht gespeichert, nur das Protokoll und die Zeilen.
// ===========================================================================

let nkZugriff=false;
let nk={projektId:null,laedt:false,fehler:"",stunden:[],importe:[],abgleich:[],reports:[],angebote:[],angeboteFehler:"",geladen:false};
let nkD=null;   // Zustand des offenen Import-Dialogs

function nkAktiv(){return !!nkZugriff}
async function checkNachkalkulationZugriff(){
 nkZugriff=false;
 if(typeof currentProfile!=="undefined"&&currentProfile&&typeof sb!=="undefined"){
  try{
   const {data,error}=await sb.from("feature_access").select("granted")
     .eq("profile_id",currentProfile.id).eq("feature","nachkalkulation").maybeSingle();
   nkZugriff=!error&&!!data&&!!data.granted;
  }catch(e){nkZugriff=false}
 }
 if(!nkZugriff){nk={...nk,projektId:null,stunden:[],importe:[],abgleich:[],geladen:false}}
 return nkZugriff;
}
function nkStd(n){return (n===null||n===undefined||!isFinite(n))?"–":Number(n).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})+" h"}
function nkDatum(d){return d?((typeof datumCH==="function")?datumCH(d):String(d)):"ohne Datum"}
function nkZeitpunkt(t){
 if(!t)return "";
 const d=new Date(t);
 return isNaN(d)?"":d.toLocaleDateString("de-CH")+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
}

// ---- Laden ------------------------------------------------------------------
async function nkLaden(projektId){
 if(!nkZugriff||!projektId)return;
 nk.laedt=true;nk.fehler="";nk.projektId=projektId;
 try{
  const pid=Number(projektId);
  const [s,i,g,r,a]=await Promise.all([
   sb.from("abacus_stunden").select("*").eq("project_id",pid).order("datum",{ascending:true}).limit(5000),
   sb.from("abacus_importe").select("*").eq("project_id",pid).order("importiert_am",{ascending:false}),
   sb.from("abacus_abgleich").select("*").eq("project_id",pid).order("geprueft_am",{ascending:false}),
   sb.from("reports").select("id,date,work_entries,updated_at").eq("project_id",pid),
   sb.from("angebote").select("id,title,positions,gilt,date").eq("project_id",pid)
  ]);
  const err=[s,i,g,r].find(x=>x.error);
  if(err)throw new Error(err.error.message);
  nk.stunden=s.data||[];nk.importe=i.data||[];nk.abgleich=g.data||[];nk.reports=r.data||[];
  nk.angebote=a.error?[]:(a.data||[]);
  nk.angeboteFehler=a.error?"Offerten nicht lesbar (kein Offerte-Zugriff?)":"";
  nk.geladen=true;
 }catch(e){
  nk.fehler=(typeof dbFehlerText==="function")?dbFehlerText(e,"Die Stunden konnten nicht geladen werden."):String(e.message||e);
  nk.geladen=false;
 }
 nk.laedt=false;
 if(typeof a2Zeichnen==="function")a2Zeichnen();
}

// ---- Register "Stunden" -----------------------------------------------------
function nkRegHtml(p){
 if(!nkZugriff)return '<div class="a2-leer">Die Nachkalkulation ist für dich nicht freigeschaltet.</div>';
 if(nk.projektId!==p.id&&!nk.laedt){nkLaden(p.id);return '<div class="a2-leer">Lädt …</div>'}
 if(nk.laedt)return '<div class="a2-leer">Lädt …</div>';
 if(nk.fehler)return `<div class="a2-hinweis a2-h-warnung"><b>Fehler</b> ${esc(nk.fehler)}</div><button type="button" class="a2-knopf a2-k-grau" data-nk="neuladen">Nochmals laden</button>`;
 const ist=abRund2(nk.stunden.reduce((s,x)=>s+Number(x.stunden||0),0));
 const soll=abSollStunden(nk.angebote);
 const app=abAppEintraege(nk.reports);
 const v=abVergleichen(nk.stunden,app);
 const letzterPruef=nk.abgleich[0]||null;
 const stand=abStandKennung(nk.stunden,app);
 let h=`<div class="a2-knopf-reihe a2-nk-kopf"><button type="button" class="a2-knopf a2-k-blau a2-k-voll" data-nk="import">📥 Abacus-Stunden importieren (PDF / Excel)</button></div>`;
 // Soll / Ist
 h+=`<div class="a2-abschnitt a2-nk-karte"><div class="a2-abschnitt-kopf"><h2>Nachkalkulation</h2></div>`;
 if(!nk.stunden.length)h+=`<div class="a2-leer">Noch keine Abacus-Stunden importiert.</div>`;
 else{
  h+=`<div class="a2-nk-zahlen">
   <div><span>Sollstunden</span><b>${soll.verfuegbar?esc(nkStd(soll.stunden)):"nicht verfügbar"}</b></div>
   <div><span>Iststunden (Abacus)</span><b>${esc(nkStd(ist))}</b></div>
   <div><span>Differenz (Ist − Soll)</span><b>${soll.verfuegbar?esc((ist-soll.stunden>0?"+":"")+nkStd(abRund2(ist-soll.stunden))):"–"}</b></div>
   <div><span>Abweichung</span><b>${soll.verfuegbar&&abAbweichungProzent(ist,soll.stunden)!==null?esc((abAbweichungProzent(ist,soll.stunden)>0?"+":"")+abAbweichungProzent(ist,soll.stunden).toLocaleString("de-CH")+" %"):"–"}</b></div>
  </div>`;
  if(!soll.verfuegbar)h+=`<div class="a2-hinweis"><b>Sollstunden nicht verfügbar</b> ${esc(soll.grund)}${nk.angeboteFehler?" "+esc(nk.angeboteFehler)+".":""}</div>`;
  else h+=`<div class="small a2-nk-quelle">Soll aus der Offerte „${esc(soll.je[0].titel)}“ (${soll.je[0].positionen} Stundenposition${soll.je[0].positionen===1?"":"en"}).</div>`;
  h+=`<div class="small a2-nk-quelle">Nur Stunden. Kosten oder Gewinn werden daraus nicht abgeleitet.</div>`;
 }
 h+=`</div>`;
 // Abgleich
 const klasse=v.status==="Übereinstimmend"?"a2-nk-ok":(v.status==="Abweichung"?"a2-nk-abw":"a2-nk-unklar");
 const letzteApp=nk.reports.map(r=>r.updated_at).filter(Boolean).sort().pop();
 const letzterImport=nk.importe[0]&&nk.importe[0].importiert_am;
 h+=`<div class="a2-abschnitt a2-nk-karte"><div class="a2-abschnitt-kopf"><h2>Abgleich Regiestunden</h2><span class="a2-nk-chip ${klasse}">${esc(v.status)}</span></div>
  <div class="a2-nk-zahlen">
   <div><span>Abacus (importiert)</span><b>${esc(nkStd(v.abacus))}</b><em>${letzterImport?"zuletzt importiert "+esc(nkZeitpunkt(letzterImport)):"kein Import"}</em></div>
   <div><span>Spengler-DIGITAL (Regierapporte)</span><b>${esc(nkStd(v.app))}</b><em>${letzteApp?"zuletzt erfasst "+esc(nkZeitpunkt(letzteApp)):"keine Rapporte"}</em></div>
   <div><span>Differenz (Abacus − App)</span><b>${esc((v.diff>0?"+":"")+nkStd(v.diff))}</b></div>
  </div>`;
 if(v.gruende.length)h+=`<div class="a2-hinweis"><b>Nicht vollständig vergleichbar</b> ${v.gruende.map(esc).join(" ")}</div>`;
 if(v.rundung)h+=`<div class="a2-hinweis">${esc(v.rundung)}</div>`;
 if(v.eingeschraenkt&&v.anzAbacus&&v.anzApp)h+=`<div class="a2-hinweis"><b>Eingeschränkter Vergleich</b> Mitarbeiter lassen sich nicht überall sicher zuordnen. Verlässlich sind die Gesamtstunden; Einzelzuordnungen mit Vorbehalt stehen getrennt als „mögliche Zuordnung“.</div>`;
 if(v.anzAbacus||v.anzApp)h+=nkAbgleichDetail(v);
 // Prüfvermerk
 if(v.anzAbacus||v.anzApp){
  if(letzterPruef){
   const aktuell=letzterPruef.stand===stand;
   h+=`<div class="small a2-nk-pruef ${aktuell?"":"a2-nk-veraltet"}">Geprüft am ${esc(nkZeitpunkt(letzterPruef.geprueft_am))}${letzterPruef.kommentar?": „"+esc(letzterPruef.kommentar)+"“":""} · Differenz damals ${esc(nkStd(Number(letzterPruef.differenz)))}.
    ${aktuell?"":"<b>Seitdem hat sich etwas geändert</b> (neuer Import oder geänderte Rapporte) – bitte erneut prüfen."}</div>`;
  }
  h+=`<div class="a2-knopf-reihe"><button type="button" class="a2-knopf a2-k-grau" data-nk="pruefen">✔ Abgleich als geprüft markieren</button></div>`;
 }
 h+=`</div>`;
 // Importe
 h+=`<div class="a2-abschnitt a2-nk-karte"><div class="a2-abschnitt-kopf"><h2>Importe (${nk.importe.length})</h2></div>`;
 h+=nk.importe.length?nk.importe.map(im=>`<div class="a2-nk-zeile"><div><b>${esc(im.dateiname)}</b>
   <span class="small">${esc(nkZeitpunkt(im.importiert_am))} · ${im.anz_neu} neu, ${im.anz_uebersprungen} übersprungen, ${im.anz_fehler} fehlerhaft</span></div>
   <button type="button" class="a2-knopf a2-k-grau" data-nk="importloeschen" data-nk-id="${im.id}" title="Import samt seinen Zeilen löschen">🗑</button></div>`).join(""):`<div class="a2-leer">Keine Importe.</div>`;
 h+=`</div>`;
 // Buchungen
 h+=`<div class="a2-abschnitt a2-nk-karte"><details><summary><b>Buchungen (${nk.stunden.length})</b></summary>${nk.stunden.length?`<div class="a2-nk-scroll"><table class="a2-nk-tab"><thead><tr><th>Datum</th><th>Mitarbeiter</th><th>Tätigkeit</th><th>Std.</th><th>Quelle</th></tr></thead><tbody>${
   nk.stunden.map(s=>`<tr><td>${esc(nkDatum(s.datum))}</td><td>${esc(s.mitarbeiter||"")}</td><td>${esc(s.taetigkeit||"")}</td><td class="r">${esc(nkStd(Number(s.stunden)))}</td><td>${esc(s.rapport_ref||"")}</td></tr>`).join("")
  }</tbody></table></div>`:""}</details></div>`;
 return h;
}
function nkAbgleichDetail(v){
 const zeileA=a=>`${esc(nkDatum(a.datum))} · ${esc(a.mitarbeiter||"–")} · ${esc(a.taetigkeit||"")} · <b>${esc(nkStd(a.stunden))}</b>`;
 const zeileB=b=>`${esc(nkDatum(b.datum))} · ${esc(b.mitarbeiter||"–")} · ${esc(b.text||b.funktion||"")} · <b>${esc(nkStd(b.stunden))}</b>`;
 const grp=(titel,liste,fn,hinweis)=>liste.length?`<details class="a2-nk-grp"><summary>${esc(titel)} (${liste.length})</summary>${hinweis?`<div class="small">${esc(hinweis)}</div>`:""}<ul>${liste.map(x=>`<li>${fn(x)}</li>`).join("")}</ul></details>`:"";
 return `<div class="a2-nk-detail">`
  +grp("Übereinstimmende Buchungen",v.sicher,x=>zeileA(x.abacus),"Datum, Mitarbeiter und Stunden gleich.")
  +grp("Mögliche Zuordnung (nicht sicher)",v.moeglich,x=>zeileA(x.abacus)+" ↔ "+zeileB(x.app)+` <span class="small">(${esc(x.grund)})</span>`,"Datum und Stunden gleich, aber nicht sicher dieselbe Buchung.")
  +grp("Nur in Abacus",v.nurAbacus,zeileA)
  +grp("Nur in Spengler-DIGITAL",v.nurApp,zeileB)
  +(v.proTag.length?`<details class="a2-nk-grp"><summary>Pro Datum (${v.proTag.length})</summary><div class="a2-nk-scroll"><table class="a2-nk-tab"><thead><tr><th>Datum</th><th>Abacus</th><th>App</th><th>Diff.</th></tr></thead><tbody>${
    v.proTag.map(t=>`<tr class="${Math.abs(t.diff)>AB_TOLERANZ?"a2-nk-diffzeile":""}"><td>${esc(nkDatum(t.datum==="ohne Datum"?null:t.datum))}</td><td class="r">${esc(nkStd(t.abacus))}</td><td class="r">${esc(nkStd(t.app))}</td><td class="r">${esc(nkStd(t.diff))}</td></tr>`).join("")
   }</tbody></table></div></details>`:"")
  +`</div>`;
}

// ---- Datei lesen -------------------------------------------------------------
function nkDateityp(datei){
 const n=String(datei.name||"").toLowerCase();
 if(n.endsWith(".pdf")||datei.type==="application/pdf")return "pdf";
 if(n.endsWith(".xlsx")||n.endsWith(".xlsm"))return "xlsx";
 if(n.endsWith(".csv")||datei.type==="text/csv")return "csv";
 return "";
}
function nkSkriptLaden(src,test){
 if(test())return Promise.resolve(true);
 return new Promise(ok=>{
  const s=document.createElement("script");
  s.src=src;s.onload=()=>ok(test());s.onerror=()=>ok(false);
  document.head.appendChild(s);
 });
}
async function nkSha256(buf){
 try{
  if(window.crypto&&crypto.subtle){
   const h=await crypto.subtle.digest("SHA-256",buf);
   return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }
 }catch(e){}
 return null;
}
async function nkPdfLesen(buf){
 const ok=await nkSkriptLaden("vendor/pdf.min.js",()=>typeof pdfjsLib!=="undefined");
 if(!ok)throw new Error("Der PDF-Leser konnte nicht geladen werden. Bitte die Verbindung prüfen und nochmals versuchen – oder den Excel-Export verwenden.");
 pdfjsLib.GlobalWorkerOptions.workerSrc="vendor/pdf.worker.min.js";
 let pdf;
 try{pdf=await pdfjsLib.getDocument({data:new Uint8Array(buf),isEvalSupported:false,disableFontFace:true}).promise}
 catch(e){throw new Error("Das PDF konnte nicht gelesen werden (beschädigt oder passwortgeschützt).")}
 if(pdf.numPages>100)throw new Error("Das PDF hat über 100 Seiten. Bitte den Excel-Export verwenden.");
 const zeilen=[];let zeichen=0;let alles="";
 for(let p=1;p<=pdf.numPages;p++){
  const page=await pdf.getPage(p);
  const tc=await page.getTextContent();
  tc.items.forEach(it=>{zeichen+=String(it.str||"").trim().length;alles+=" "+it.str});
  abPdfZeilenBilden(tc.items).forEach(z=>zeilen.push(z));
 }
 if(zeichen<20)throw new Error("Dieses PDF enthält keinen auslesbaren Text (vermutlich ein Scan). Texterkennung (OCR) gibt es bewusst nicht, damit keine Mitarbeiter- oder Projektdaten an externe Dienste gehen. Bitte den Excel-Export aus Abacus oder ein Text-PDF verwenden.");
 return {zeilen,text:alles};
}
function nkExcelBlatt(ws){
 if(!ws||!ws["!ref"])return {zeilen:[],formelnOhneWert:0};
 const rg=XLSX.utils.decode_range(ws["!ref"]);
 const zeilen=[];let ohneWert=0;
 for(let r=rg.s.r;r<=Math.min(rg.e.r,rg.s.r+AB_MAX_ZEILEN+50);r++){
  const reihe=[];
  for(let c=rg.s.c;c<=Math.min(rg.e.c,rg.s.c+60);c++){
   const z=ws[XLSX.utils.encode_cell({r,c})];
   if(!z){reihe.push("");continue}
   // Formel, deren Ergebnis die Datei nicht mitspeichert (SheetJS liefert dafür einen Stub ohne Wert)
   if(z.t==="z"&&z.f){ohneWert++;reihe.push("");continue}
   if(z.f&&(z.v===undefined||z.v===null||z.v===""))ohneWert++;
   if((z.t==="n"||z.t==="d")&&typeof z.z==="string"&&/h/i.test(z.z)&&!/[dy]/i.test(z.z.replace(/"[^"]*"/g,""))){
    // Zeitformat (z. B. [h]:mm): den angezeigten Text H:MM übernehmen, nicht den Tagesbruchteil als Dezimalzahl missdeuten
    if(typeof z.w==="string"&&/^\d{1,3}:\d{2}/.test(z.w.trim())){reihe.push(z.w.trim());continue}
    if(z.t==="n"&&z.v>=0&&z.v<10){const min=Math.round(z.v*24*60);reihe.push(Math.floor(min/60)+":"+String(min%60).padStart(2,"0"));continue}
   }
   reihe.push(z.t==="d"?z.v:(z.v===undefined?"":z.v));
  }
  zeilen.push(reihe);
 }
 return {zeilen,formelnOhneWert:ohneWert};
}

async function nkImportStarten(){
 if(!nkZugriff)return;
 const inp=document.createElement("input");
 inp.type="file";inp.accept=".pdf,.xlsx,.xlsm,.csv,application/pdf,text/csv";
 inp.style.display="none";
 inp.addEventListener("change",()=>{const f=inp.files&&inp.files[0];inp.remove();if(f)nkDateiOeffnen(f)});
 document.body.appendChild(inp);
 inp.click();
}
function nkDialogHuelle(){
 let m=document.getElementById("a2NkDialog");
 if(!m){
  m=document.createElement("div");m.id="a2NkDialog";m.className="modal";
  m.innerHTML='<div class="modalbox"><div class="card a2-nk-box" id="a2NkBox"></div></div>';
  document.body.appendChild(m);
 }
 m.hidden=false;
 return document.getElementById("a2NkBox");
}
function nkDialogSchliessen(){
 const m=document.getElementById("a2NkDialog");
 if(m)m.remove();
 nkD=null;
}
async function nkDateiOeffnen(datei){
 const box=nkDialogHuelle();
 box.innerHTML='<h2>Abacus-Stunden importieren</h2><div class="a2-leer">Datei wird gelesen …</div>';
 const typ=nkDateityp(datei);
 if(!typ){box.innerHTML=nkFehlerHtml("Dieser Dateityp wird nicht unterstützt. Bitte eine PDF-, Excel- (.xlsx) oder CSV-Datei wählen.");return}
 if(datei.size>AB_MAX_DATEI_BYTES[typ]){box.innerHTML=nkFehlerHtml("Die Datei ist zu gross ("+Math.round(datei.size/1048576)+" MB, erlaubt "+Math.round(AB_MAX_DATEI_BYTES[typ]/1048576)+" MB).");return}
 try{
  const buf=await datei.arrayBuffer();
  nkD={datei:{name:datei.name,groesse:datei.size},typ,projektId:null,sha:await nkSha256(buf),warnungen:[],roh:[],zeilen:[],tabelle:[],zuordnung:null,kopfZeile:-1,blatt:"",blaetter:[],wb:null,dok:{},meldung:"",speichert:false};
  if(typ==="pdf"){
   const r=await nkPdfLesen(buf);
   nkD.dok=abDokumentKennung(r.text);
   const t=abPdfZuTabelle(r.zeilen);
   nkD.tabelle=t.tabelle;nkD.pdfModus=t.modus;
   if(t.modus==="muster")nkD.warnungen.push("Im PDF wurde keine Kopfzeile erkannt. Zeilen wurden nur nach dem Muster „Datum … Stunden“ gelesen – bitte die Vorschau genau prüfen.");
  }else if(typ==="xlsx"){
   if(!(await xlsxLaden()))throw new Error("Der Excel-Leser konnte nicht geladen werden. Bitte die Verbindung prüfen und nochmals versuchen.");
   let wb;
   try{wb=XLSX.read(buf,{type:"array",cellDates:true,cellNF:true,sheetStubs:true})}catch(e){throw new Error("Die Excel-Datei konnte nicht gelesen werden (beschädigt oder passwortgeschützt).")}
   nkD.wb=wb;nkD.blaetter=wb.SheetNames.slice();
   nkD.blatt=nkD.blaetter[0]||"";
   nkExcelBlattWaehlen(nkD.blatt);
  }else{
   let text;
   try{text=new TextDecoder("utf-8",{fatal:true}).decode(buf)}catch(e){text=new TextDecoder("windows-1252").decode(buf)}
   nkD.tabelle=abCsvZeilen(text);
  }
  await nkAuswerten(true);
  nkDialogZeichnen();
 }catch(e){
  box.innerHTML=nkFehlerHtml(e.message||String(e));
 }
}
function nkExcelBlattWaehlen(name){
 nkD.blatt=name;
 const r=nkExcelBlatt(nkD.wb.Sheets[name]);
 nkD.tabelle=r.zeilen;
 nkD.warnungen=nkD.warnungen.filter(w=>!/Formelzellen/.test(w));
 if(r.formelnOhneWert)nkD.warnungen.push(r.formelnOhneWert+" Formelzellen ohne gespeicherten Wert: Excel hat das Ergebnis nicht mitgespeichert, Werte können fehlen. Bitte die Datei in Excel öffnen, speichern und erneut wählen.");
 nkD.zuordnung=null;nkD.kopfZeile=-1;
}
function nkFehlerHtml(text){
 return `<h2>Abacus-Stunden importieren</h2><div class="a2-hinweis a2-h-warnung"><b>Import nicht möglich</b> ${esc(text)}</div>
  <div class="a2-knopf-reihe"><button type="button" class="a2-knopf a2-k-grau" data-nk="schliessen">Schliessen</button></div>`;
}

// ---- Auswerten ---------------------------------------------------------------
function nkProjekte(){return (typeof a2Projekte==="function"?a2Projekte():[]).filter(p=>!p.archived)}
function nkProjektNr(id){const p=(typeof a2Projekt==="function")?a2Projekt(id):null;return p?p.order_no:""}
async function nkBestehende(projektId){
 if(!projektId)return {fp:new Set(),zeilen:[],importe:[]};
 const [s,i]=await Promise.all([
  sb.from("abacus_stunden").select("fingerprint,datum,mitarbeiter,stunden").eq("project_id",Number(projektId)).limit(20000),
  sb.from("abacus_importe").select("dateiname,datei_sha,importiert_am").eq("project_id",Number(projektId))
 ]);
 if(s.error||i.error)throw new Error((s.error||i.error).message);
 return {fp:new Set((s.data||[]).map(x=>x.fingerprint)),zeilen:s.data||[],importe:i.data||[]};
}
async function nkAuswerten(erst){
 const d=nkD;
 // Spalten erkennen oder die manuelle Zuordnung anwenden
 let lese;
 if(d.typ==="pdf"&&d.pdfModus==="muster"){lese=abTabelleLesen(d.tabelle,{zuordnung:{datum:0,taetigkeit:1,stunden:2},kopfZeile:0})}
 else lese=abTabelleLesen(d.tabelle,d.zuordnung?{zuordnung:d.zuordnung,kopfZeile:d.kopfZeile}:{});
 d.lese=lese;
 if(lese.ok){d.zuordnung=lese.zuordnung;d.kopfZeile=lese.kopfZeile;d.meldung=""}
 else{d.meldung=lese.fehler;d.roh=[];d.zeilen=[]}
 if(erst&&lese.ok&&d.dok.auftrag_nr==null){/* kein Dokument-Kopf */}
 if(lese.ok)d.roh=lese.roh;
 // Projekt aus Nummern bestimmen
 const nummern=new Set(d.roh.map(r=>r.auftrag_nr).filter(Boolean));
 if(d.dok.auftrag_nr)nummern.add(d.dok.auftrag_nr);
 d.nummern=[...nummern];
 const treffer=new Map();
 nkProjekte().forEach(p=>{const n=abNr(p.order_no);if(n&&nummern.has(n)){if(!treffer.has(n))treffer.set(n,[]);treffer.get(n).push(p)}});
 d.erkannt=[...treffer.values()].flat();
 if(erst){
  d.projektId=(d.nummern.length&&d.erkannt.length===1&&treffer.size===1)?d.erkannt[0].id:null;
  d.projektAuto=!!d.projektId;
 }else if(!d.projektManuell){
  // Spalten wurden geändert: ohne ausdrückliche Projektwahl die Erkennung nachziehen
  d.projektId=(d.nummern.length&&d.erkannt.length===1&&treffer.size===1)?d.erkannt[0].id:null;
  d.projektAuto=!!d.projektId;
 }
 await nkZeilenBewerten();
}
async function nkZeilenBewerten(){
 const d=nkD;
 let best={fp:new Set(),zeilen:[],importe:[]};
 if(d.projektId){
  try{best=await nkBestehende(d.projektId)}catch(e){d.meldung="Bereits importierte Zeilen konnten nicht geprüft werden: "+e.message;}
 }
 d.best=best;
 d.zeilen=d.roh.map(r=>{
  const z=abZeileBewerten(r,{projektNr:d.projektId?nkProjektNr(d.projektId):""});
  if(!z.auftrag_nr&&d.dok.auftrag_nr)z.dokAuftrag=d.dok.auftrag_nr;
  z._roh=r;return z;
 });
 abDublettenPruefen(d.zeilen,best.fp,best.zeilen);
 d.zeilen.forEach(z=>{
  const m=d.manuell&&d.manuell[z.quelle];
  z.ein=["neu","unklar","moegliche_dublette"].includes(z.status)?(m!==undefined?m:abStandardAuswahl(z)):false;
 });
}
function nkZaehlung(){
 const d=nkD,c={neu:0,vorhanden:0,unklar:0,moegliche_dublette:0,fehler:0,summe:0,ein:0,stunden:0};
 d.zeilen.forEach(z=>{c[z.status]++;if(z.ein&&["neu","unklar","moegliche_dublette"].includes(z.status)){c.ein++;c.stunden+=z.stunden||0}});
 c.stunden=abRund2(c.stunden);
 return c;
}

// ---- Vorschau -----------------------------------------------------------------
const NK_STATUS_TEXT={neu:"neu",vorhanden:"bereits vorhanden",unklar:"unklar",moegliche_dublette:"mögliche Dublette",fehler:"fehlerhaft",summe:"Summenzeile"};
function nkDialogZeichnen(){
 const box=document.getElementById("a2NkBox");
 if(!box||!nkD)return;
 const d=nkD,c=nkZaehlung();
 const spaltenLabel=(i)=>{
  const kopf=(d.kopfZeile>=0&&d.tabelle[d.kopfZeile])?abTrim(d.tabelle[d.kopfZeile][i]):"";
  return String.fromCharCode(65+(i%26))+(kopf?": "+kopf:"");
 };
 const breite=Math.max(0,...d.tabelle.slice(0,50).map(r=>r.length));
 let h=`<h2>Abacus-Stunden importieren</h2>
  <div class="small">${esc(d.datei.name)} · ${esc(d.typ.toUpperCase())}</div>`;
 d.warnungen.forEach(w=>{h+=`<div class="a2-hinweis a2-h-warnung">${esc(w)}</div>`});
 if(d.blaetter.length>1){
  h+=`<label>Tabellenblatt</label><select data-nk="blatt">${d.blaetter.map(b=>`<option value="${esc(b)}"${b===d.blatt?" selected":""}>${esc(b)}</option>`).join("")}</select>`;
 }
 // Projekt
 const projekte=nkProjekte();
 h+=`<label>Projekt</label><select data-nk="projekt"><option value="">– Projekt wählen –</option>${
   projekte.map(p=>`<option value="${esc(p.id)}"${String(p.id)===String(d.projektId)?" selected":""}>${esc((p.order_no?p.order_no+" · ":"")+(p.name||"Projekt"))}</option>`).join("")}</select>`;
 if(d.projektAuto)h+=`<div class="small a2-nk-quelle">Projekt über die Auftragsnummer ${esc(d.nummern.join(", "))} erkannt – bitte kurz bestätigen.</div>`;
 else if(!d.nummern.length)h+=`<div class="a2-hinweis">In der Datei wurde keine Auftrags-/Projektnummer erkannt. Bitte das Projekt ausdrücklich wählen.</div>`;
 else if(!d.erkannt.length)h+=`<div class="a2-hinweis">Die Auftragsnummer ${esc(d.nummern.join(", "))} gehört zu keinem Projekt. Bitte das Projekt ausdrücklich wählen.</div>`;
 else h+=`<div class="a2-hinweis">Die Datei nennt mehrere Auftragsnummern (${esc(d.nummern.join(", "))}) oder mehrdeutige Projekte. Bitte das Projekt ausdrücklich wählen.</div>`;
 // Spaltenzuordnung
 h+=`<details class="a2-nk-grp"${d.lese&&d.lese.ok?"":" open"}><summary>Spalten zuordnen</summary><div class="a2-nk-map">${
   AB_SPALTEN.map(sp=>`<label>${esc(sp.name)}<select data-nk="map" data-nk-key="${sp.k}"><option value="">– keine –</option>${
     Array.from({length:breite},(_,i)=>`<option value="${i}"${d.zuordnung&&d.zuordnung[sp.k]===i?" selected":""}>${esc(spaltenLabel(i))}</option>`).join("")}</select></label>`).join("")}
   <label>Daten beginnen in Zeile<input data-nk="start" type="number" min="1" value="${d.kopfZeile+2}"></label></div></details>`;
 if(d.meldung)h+=`<div class="a2-hinweis a2-h-warnung"><b>Hinweis</b> ${esc(d.meldung)}</div>`;
 if(d.lese&&d.lese.ok&&!d.zeilen.length)h+=`<div class="a2-hinweis a2-h-warnung"><b>Keine Stundenzeilen erkannt.</b> Bitte die Spalten zuordnen.</div>`;
 // Frühere Importe derselben Datei
 const gleiche=(d.best&&d.best.importe||[]).filter(i=>d.sha&&i.datei_sha===d.sha);
 if(gleiche.length)h+=`<div class="a2-hinweis"><b>Diese Datei wurde schon importiert</b> (${esc(nkZeitpunkt(gleiche[0].importiert_am))}). Bereits vorhandene Zeilen werden nicht doppelt gespeichert.</div>`;
 // Zusammenfassung der Vorschau
 if(d.zeilen.length){
  h+=`<div class="a2-nk-zahlen a2-nk-vorschau"><div><span>Zeilen erkannt</span><b>${d.zeilen.length}</b></div>
   <div><span>neu</span><b>${c.neu}</b></div><div><span>bereits vorhanden</span><b>${c.vorhanden}</b></div>
   <div><span>unklar / mögliche Dublette</span><b>${c.unklar+c.moegliche_dublette}</b></div>
   <div><span>fehlerhaft</span><b>${c.fehler}</b></div><div><span>Summenzeilen</span><b>${c.summe}</b></div></div>
   <div class="small">Wird übernommen: <b>${c.ein} Zeilen · ${esc(nkStd(c.stunden))}</b></div>`;
  h+=`<div class="a2-nk-scroll"><table class="a2-nk-tab"><thead><tr><th></th><th>Status</th><th>Datum</th><th>Auftrag</th><th>Mitarbeiter</th><th>Tätigkeit</th><th>Zeit</th><th>Std.</th></tr></thead><tbody>${
   d.zeilen.map((z,i)=>{
    const wählbar=["neu","unklar","moegliche_dublette"].includes(z.status);
    const ed=(feld,wert)=>`<input data-nk-feld="${feld}" data-nk-i="${i}" value="${esc(wert===null||wert===undefined?"":wert)}"${z.status==="summe"||z.status==="vorhanden"?" disabled":""}>`;
    return `<tr class="a2-nk-st-${z.status}"><td><input type="checkbox" data-nk="ein" data-nk-i="${i}"${z.ein?" checked":""}${wählbar?"":" disabled"}></td>
     <td><span class="a2-nk-chip a2-nk-s-${z.status}">${esc(NK_STATUS_TEXT[z.status])}</span>${z.fehler.concat(z.hinweise).map(t=>`<div class="small">${esc(t)}</div>`).join("")}<div class="small a2-nk-qz">${esc(z.quelle)}</div></td>
     <td>${ed("datum",abTrim(z._roh.datum_roh instanceof Date?(z.datum||""):z._roh.datum_roh))}</td><td>${ed("auftrag",z.auftrag_nr||z.dokAuftrag||"")}</td>
     <td>${ed("mitarbeiter",z.mitarbeiter)}</td><td>${ed("taetigkeit",z.taetigkeit)}</td>
     <td>${ed("zeit",abTrim(z._roh.zeit_roh))}</td><td class="r">${esc(z.stunden===null?"–":nkStd(z.stunden))}</td></tr>`;
   }).join("")}</tbody></table></div>`;
 }
 h+=`<div class="a2-knopf-reihe a2-nk-aktionen">
  <button type="button" class="a2-knopf a2-k-blau" data-nk="speichern"${(d.projektId&&c.ein>0&&!d.speichert)?"":" disabled"}>${d.speichert?"Speichert …":"✔ "+c.ein+" Zeilen übernehmen"}</button>
  <button type="button" class="a2-knopf a2-k-grau" data-nk="schliessen">Abbrechen</button></div>
  <div class="small">Es wird nichts gespeichert, bevor du übernimmst. Abbrechen verwirft die Vorschau.</div>`;
 box.innerHTML=h;
}

// ---- Speichern ------------------------------------------------------------------
async function nkSpeichern(){
 const d=nkD;
 if(!d||d.speichert||!d.projektId)return;
 d.speichert=true;nkDialogZeichnen();
 const pid=Number(d.projektId);
 let importId=null;
 try{
  // Frischer Stand der vorhandenen Zeilen: zwischen Vorschau und Bestätigen kann ein anderer Import dazugekommen sein.
  const best=await nkBestehende(pid);
  const ausgewaehlt=d.zeilen.filter(z=>z.ein&&["neu","unklar","moegliche_dublette"].includes(z.status)&&z.fingerprint);
  const neu=ausgewaehlt.filter(z=>!best.fp.has(z.fingerprint));
  const doppelt=ausgewaehlt.length-neu.length;
  const c=nkZaehlung();
  const uebersprungen=d.zeilen.length-neu.length-c.fehler;
  if(!neu.length)throw new Error("Es gibt keine neuen Zeilen zu übernehmen (alles ist bereits vorhanden).");
  const {data:imp,error:e1}=await sb.from("abacus_importe").insert({
    project_id:pid,dateiname:d.datei.name.slice(0,200),dateityp:d.typ,datei_sha:d.sha,
    anz_neu:neu.length,anz_uebersprungen:Math.max(0,uebersprungen),anz_fehler:c.fehler,
    ergebnis:"Übernommen"+(doppelt?" ("+doppelt+" inzwischen vorhanden)":"")}).select("id").single();
  if(e1)throw new Error(e1.message);
  importId=imp.id;
  for(let i=0;i<neu.length;i+=200){
   const teil=neu.slice(i,i+200).map(z=>({project_id:pid,import_id:importId,fingerprint:z.fingerprint,
     rapport_ref:z.rapport_ref||null,auftrag_nr:(z.auftrag_nr||z.dokAuftrag)||null,datum:z.datum,mitarbeiter:z.mitarbeiter||null,
     taetigkeit:z.taetigkeit||null,stunden:z.stunden,zeit_roh:abTrim(z.zeit_roh)||null,kostenstelle:z.kostenstelle||null}));
   const {error:e2}=await sb.from("abacus_stunden").insert(teil);
   if(e2)throw new Error(e2.message);
  }
  const stunden=abRund2(neu.reduce((s,z)=>s+z.stunden,0));
  nkDialogSchliessen();
  await nkLaden(pid);
  const box=nkDialogHuelle();
  box.innerHTML=`<h2>Import abgeschlossen</h2><div class="a2-nk-zahlen"><div><span>Übernommen</span><b>${neu.length} Zeilen</b></div><div><span>Stunden</span><b>${esc(nkStd(stunden))}</b></div>
   <div><span>Übersprungen</span><b>${Math.max(0,uebersprungen)}</b></div><div><span>Fehlerhaft</span><b>${c.fehler}</b></div></div>
   <div class="small">Es wurde nichts an Abacus, an Offerten, Rapporten oder am Workflow verändert.</div>
   <div class="a2-knopf-reihe"><button type="button" class="a2-knopf a2-k-blau" data-nk="schliessen">Schliessen</button></div>`;
 }catch(e){
  // Keine stille Teilübernahme: ein angefangener Import wird samt seiner Zeilen wieder entfernt.
  if(importId){try{await sb.from("abacus_importe").delete().eq("id",importId)}catch(x){}}
  if(nkD){nkD.speichert=false;nkD.meldung="Es wurde nichts gespeichert: "+((typeof dbFehlerText==="function")?dbFehlerText(e,e.message):e.message);nkDialogZeichnen()}
 }
}

// ---- Prüfvermerk / Import löschen -----------------------------------------------
async function nkPruefen(){
 const p=nk.projektId;
 if(!p)return;
 const app=abAppEintraege(nk.reports);
 const v=abVergleichen(nk.stunden,app);
 const kommentar=await appPrompt("Kommentar zum Abgleich (optional):","");
 if(kommentar===null)return;
 const {error}=await sb.from("abacus_abgleich").insert({project_id:Number(p),abacus_stunden:v.abacus,app_stunden:v.app,differenz:v.diff,
   stand:abStandKennung(nk.stunden,app),kommentar:String(kommentar||"").trim().slice(0,500)||null});
 if(error){appAlert("Der Prüfvermerk konnte nicht gespeichert werden: "+((typeof dbFehlerText==="function")?dbFehlerText(error):error.message));return}
 await nkLaden(p);
}
async function nkImportLoeschen(id){
 const im=nk.importe.find(x=>String(x.id)===String(id));
 if(!im)return;
 if(!(await appConfirm("Import „"+im.dateiname+"“ samt seinen "+im.anz_neu+" Zeilen löschen? Die Stunden zählen dann nicht mehr zu den Iststunden.")))return;
 const {error}=await sb.from("abacus_importe").delete().eq("id",im.id);
 if(error){appAlert("Löschen nicht möglich: "+((typeof dbFehlerText==="function")?dbFehlerText(error):error.message));return}
 await nkLaden(nk.projektId);
}

// ---- Ereignisse -----------------------------------------------------------------
document.addEventListener("click",async e=>{
 const b=e.target&&e.target.closest?e.target.closest("[data-nk]"):null;
 if(!b||b.tagName==="SELECT"||b.tagName==="INPUT")return;
 const was=b.getAttribute("data-nk");
 if(was==="import")nkImportStarten();
 else if(was==="neuladen")nkLaden(nk.projektId);
 else if(was==="schliessen")nkDialogSchliessen();
 else if(was==="speichern")nkSpeichern();
 else if(was==="pruefen")nkPruefen();
 else if(was==="importloeschen")nkImportLoeschen(b.getAttribute("data-nk-id"));
});
document.addEventListener("change",async e=>{
 const t=e.target;
 if(!t||!t.getAttribute)return;
 const was=t.getAttribute("data-nk");
 const feld=t.getAttribute("data-nk-feld");
 if(!nkD||(!was&&!feld))return;
 const d=nkD;
 if(was==="projekt"){d.projektId=t.value||null;d.projektAuto=false;d.projektManuell=true;await nkZeilenBewerten();nkDialogZeichnen()}
 else if(was==="blatt"){nkExcelBlattWaehlen(t.value);await nkAuswerten(true);nkDialogZeichnen()}
 else if(was==="map"){
  const z={...(d.zuordnung||{})};
  const key=t.getAttribute("data-nk-key");
  if(t.value==="")delete z[key];else z[key]=Number(t.value);
  d.zuordnung=z;
  await nkAuswerten(false);nkDialogZeichnen();
 }else if(was==="start"){
  d.kopfZeile=Math.max(-1,Number(t.value)-2);
  d.zuordnung=d.zuordnung||{};
  await nkAuswerten(false);nkDialogZeichnen();
 }else if(was==="ein"){
  const z=d.zeilen[Number(t.getAttribute("data-nk-i"))];
  if(z){z.ein=t.checked;d.manuell=d.manuell||{};d.manuell[z.quelle]=t.checked}
  nkDialogZeichnen();
 }else if(feld){
  const i=Number(t.getAttribute("data-nk-i"));
  const r=d.roh[i];
  if(!r)return;
  if(feld==="datum")r.datum_roh=t.value;
  else if(feld==="auftrag")r.auftrag_nr=abNr(t.value);
  else if(feld==="mitarbeiter")r.mitarbeiter=abTrim(t.value);
  else if(feld==="taetigkeit")r.taetigkeit=abTrim(t.value);
  else if(feld==="zeit"){r.zeit_roh=t.value;r.summe=r.summe&&abZeit(t.value).wert!==null?r.summe:""}
  r.summe=feld==="zeit"||feld==="datum"?"":r.summe;
  await nkZeilenBewerten();
  // Eine korrigierte Zeile wird bewusst eingeschlossen, sobald sie importierbar ist.
  const z=d.zeilen[i];
  if(z&&["neu","unklar","moegliche_dublette"].includes(z.status)){z.ein=true;d.manuell=d.manuell||{};d.manuell[z.quelle]=true}
  nkDialogZeichnen();
 }
});
