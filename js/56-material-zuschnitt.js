// ---------------------------------------------------------------------------
// v3.15  MATERIAL & ZUSCHNITT - eine zentrale Arbeitsseite je Projekt
// ---------------------------------------------------------------------------
// Bis v3.14 hingen im Cockpit drei eigene Karten nebeneinander: Material,
// Zuschnitt und Reservierung. Die Reservierung war dabei die Hauptbedienung,
// und ihr Status-Auswahlfeld vermischte fuenf Dinge, die nichts miteinander
// zu tun haben - Materialzustand und Produktionsfortschritt.
//
// Neu beantwortet EINE Seite die Fragen, die auf der Baustelle zaehlen:
//   Welches Material braucht das Projekt?  Welche Massaufnahme liefert
//   welche Zuschnitte?  Was ist davon schon geschnitten, was ist offen?
//
// WAS HIER NICHT PASSIERT:
//  - Es wird NICHTS neu gerechnet. Die Zuschnitte kommen aus dem
//    GESPEICHERTEN Plan jeder Massaufnahme (pmatStuecke aus js/48), die
//    Darstellung aus zuschnittHtml() (js/33), gepackt wird nach wie vor
//    ausschliesslich mit ebaPackeInStreifen() (js/29).
//  - Es entsteht KEINE zweite Statuskette. Der Arbeitsablauf der
//    Massaufnahme (v3.05) und die Reservierung (v3.09) bleiben, wie sie
//    sind - sie werden nur getrennt dargestellt statt vermischt.
//  - Es gibt KEINE zweite Reservierungslogik: geschrieben wird ueber
//    js/50, das dafuer bereits alles hat.
//
// Sichtbar nur, wenn mindestens eines der drei Untermodule eingeschaltet ist
// (pmAktiv). Standard ist AUS - dann gibt es weder Karte noch Seite.
// ---------------------------------------------------------------------------

// ===========================================================================
// TEIL A - Erledigte Zuschnittstuecke (Tabelle zuschnitt_erledigt)
// ===========================================================================
// "Zugeschnitten" entsteht ausschliesslich hier: durch das echte Abhaken
// eines einzelnen Stuecks. Nicht durch eine Reservierung, nicht durch
// Verfuegbarkeit.

// measurement_id -> Map(stueck_nr -> Zeile)
let zeCache=new Map();
// Welche Massaufnahmen schon geladen sind (auch leere), damit nicht bei
// jedem Zeichnen erneut gefragt wird.
let zeGeladen=new Set();
let zeFormularId=null;

function zeAktiv(){return (typeof pmAktiv==="function")&&pmAktiv("zuschnitt")}
// Abgehakt wird nur im Formular EINER Massaufnahme.
function zeAbhakenMoeglich(){return zeAktiv()}

// v3.22: WARUM kann hier nicht abgehakt werden? Bis v3.21 verschwand die
// Moeglichkeit kommentarlos, sobald das Untermodul "zuschnitt" aus war - der
// Ruester sah eine Liste, die sich nicht anfassen liess, und nichts sagte ihm
// den Grund. Genau das ist im Betrieb passiert: der Schalter wurde beim
// Aufraeumen ausgeschaltet, und danach ging das Abhaken nirgends mehr.
// Eine Quelle fuer alle drei Anzeigestellen (Register, Werkstatt, Seite).
function zeAbhakenGrund(){
 if(zeAbhakenMoeglich())return null;
 if(typeof pmHaupt==="function"&&!pmHaupt())
  return {grund:"haupt",
   text:"Zum Abhaken der Zuschnitte muss der erweiterte Ablauf eingeschaltet sein."};
 return {grund:"zuschnitt",
  text:"Zum Abhaken der Zuschnitte muss das Modul „Zuschnitt und Abhaken\u201c eingeschaltet sein."};
}
// Darf ich den Schalter selbst umlegen? Reine Bedienfuehrung - die Grenze ist
// die Datenbank, set_projektmodule() prueft den Administrator selbst.
function zeDarfEinschalten(){return (typeof isAdmin!=="function")||isAdmin()}
// Der Hinweis als fertiges Stueck HTML, mit Schnellschalter fuer Administratoren.
function zeAbhakenHinweisHtml(){
 const g=zeAbhakenGrund();
 if(!g)return "";
 const knopf=zeDarfEinschalten()
  ?` <button type="button" class="ze-ein" data-ze-ein="${g.grund}">Jetzt einschalten</button>`
  :" Ein Administrator kann das in den Einstellungen ändern.";
 return `<div class="small ze-aus-hinweis">🔒 ${esc(g.text)}${knopf}</div>`;
}
function zeOffeneMassaufnahme(){return zeFormularId}
function zeFormularAuf(id){zeFormularId=id||null}

function zeZeilen(mid){return zeCache.get(Number(mid))||new Map()}
function zeIstErledigt(mid,nr){
 const z=zeZeilen(mid).get(Number(nr));
 return !!(z&&z.erledigt);
}

// Alles zu einer Liste von Massaufnahmen laden. EINE Abfrage, kein N+1.
// Der Client filtert NIE nach company_id - das erzwingt die restriktive
// tenant_boundary-Policy.
async function zeLaden(ids,neu){
 const liste=(ids||[]).map(Number).filter(x=>Number.isFinite(x));
 const fehlt=neu?liste:liste.filter(id=>!zeGeladen.has(id));
 if(!fehlt.length)return true;
 if(typeof sb==="undefined"||!sb)return false;
 const {data,error}=await sb.from("zuschnitt_erledigt").select("*").in("measurement_id",fehlt);
 if(error){console.error("zuschnitt_erledigt laden",error);return false}
 fehlt.forEach(id=>{zeCache.set(id,new Map());zeGeladen.add(id)});
 (data||[]).forEach(z=>{
  const m=zeCache.get(Number(z.measurement_id))||new Map();
  m.set(Number(z.stueck_nr),z);
  zeCache.set(Number(z.measurement_id),m);
 });
 return true;
}

// Der Stand einer Massaufnahme: wie viele Stuecke hat ihr gespeicherter
// Plan, wie viele davon sind abgehakt - und wie viele Haken passen nicht
// mehr zum jetzigen Plan (der Plan wurde nach dem Abhaken geaendert).
function zeStand(m){
 const stuecke=(typeof pmatStuecke==="function")?pmatStuecke(m):[];
 const zeilen=zeZeilen(m&&m.id);
 let erledigt=0, veraltet=0;
 stuecke.forEach(s=>{
  const z=zeilen.get(Number(s.nr));
  if(!z||!z.erledigt)return;
  erledigt++;
  const l=Number(z.laenge_mm), b=Number(z.breite_mm);
  const passt=(!Number.isFinite(l)||Math.round(l)===Math.round(Number(s.laenge)))
           &&(!Number.isFinite(b)||!Number.isFinite(Number(s.breite))
              ||Math.round(b)===Math.round(Number(s.breite)));
  if(!passt)veraltet++;
 });
 return {gesamt:stuecke.length,erledigt,offen:stuecke.length-erledigt,veraltet,
         fertig:stuecke.length>0&&erledigt>=stuecke.length};
}
// Derselbe Stand ueber eine ganze Liste.
function zeStandListe(liste){
 let gesamt=0,erledigt=0,mitZuschnitt=0;
 (liste||[]).forEach(m=>{
  const s=zeStand(m);
  if(!s.gesamt)return;
  mitZuschnitt++; gesamt+=s.gesamt; erledigt+=s.erledigt;
 });
 return {gesamt,erledigt,offen:gesamt-erledigt,aufnahmen:mitZuschnitt};
}

// Den Stand in eine bereits gezeichnete Zuschnittliste malen. Die Haken
// kommen aus der Datenbank und sind beim Zeichnen oft noch nicht da -
// dasselbe Muster wie die signierten Vorschaubilder (v2.50).
function zeMarkierungAuffrischen(root){
 const w=root||document;
 w.querySelectorAll("[data-ze-nr]").forEach(b=>{
  const z=zeZeilen(b.dataset.zeMeas).get(Number(b.dataset.zeNr));
  const an=!!(z&&z.erledigt);
  b.setAttribute("aria-pressed",an?"true":"false");
  b.classList.toggle("ze-ok",an);
  // v3.23: Wartet der Haken noch auf die Uebertragung? Dann sieht man das -
  // er ist gesetzt, steht aber noch nicht in der Datenbank.
  b.classList.toggle("ze-wartet",!!(z&&z.wartet));
  b.title=zeHakenTitel(b.dataset.zeNr,z);
 });
 w.querySelectorAll("[data-ze-zeile]").forEach(z=>{
  const knoepfe=[...z.querySelectorAll("[data-ze-nr]")];
  const feld=z.querySelector("[data-ze-stand]");
  if(!feld)return;
  const fertig=knoepfe.filter(b=>b.classList.contains("ze-ok")).length;
  feld.textContent=fertig+"/"+knoepfe.length+" erledigt";
  feld.classList.toggle("ze-stand-ok",knoepfe.length>0&&fertig>=knoepfe.length);
 });
}

// v3.23: WER hat abgehakt und WANN. Steht seit v3.15 in der Datenbank
// (created_by/updated_by/updated_at), war aber nirgends zu sehen - bei zwei
// Leuten in der Werkstatt ist genau das die Frage. Aufgeloest wird ueber das
// bereits geladene profileName() (js/01), keine zusaetzliche Abfrage.
function zeHakenTitel(nr,z){
 if(!z||!z.erledigt)return "Stück "+nr+" als zugeschnitten abhaken";
 if(z.wartet)return "Stück "+nr+" abgehakt – wartet noch auf die Übertragung";
 const wer=(z.updated_by||z.created_by)&&typeof profileName==="function"
   ?(profileName(z.updated_by||z.created_by)||"Unbekannter Benutzer"):"";
 const wann=zeZeitKurz(z.updated_at||z.created_at);
 const teile=[wer,wann].filter(Boolean).join(", ");
 return "Stück "+nr+" zugeschnitten"+(teile?" – "+teile:"")+" · nochmals tippen nimmt den Haken zurück";
}
function zeZeitKurz(iso){
 if(!iso)return "";
 const d=new Date(iso);
 if(isNaN(d.getTime()))return "";
 return d.toLocaleString("de-CH",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
}

// Ein Stueck abhaken oder den Haken zurueckziehen.// Ein Stueck abhaken oder den Haken zurueckziehen. Geschrieben wird als
// upsert auf (measurement_id, stueck_nr) - company_id kommt aus dem
// Default my_company_id(), created_by/updated_by aus dem Trigger.
async function zeSetzen(mid,nrListe,an,masse){
 const zeilen=(nrListe||[]).map(nr=>Object.assign({measurement_id:Number(mid),
   stueck_nr:Number(nr),erledigt:!!an},(masse&&masse[nr])||{}));
 if(!zeilen.length)return {fehler:null,anzahl:0};
 // v3.23: Ohne Verbindung wird nicht mehr abgesagt. Eine Werkstatt liegt oft
 // im Untergeschoss - genau dort wurde das Abhaken gebraucht und ging nicht.
 // Der Haken wandert in die Warteschlange (js/43) und wird uebertragen,
 // sobald wieder Netz da ist. Beim Senden prueft wsHakenPasst(), ob die
 // Positionsnummer noch dasselbe Blech meint; passt sie nicht, wird NICHTS
 // geschrieben und die Person entscheidet. Genau dafuer liegt der Beleg
 // (Laenge/Breite/Merkmal) seit v3.15 an jedem Haken.
 if(typeof wsIstOffline==="function"&&wsIstOffline()&&typeof wsEinreihen==="function"){
  const w=await zeEinreihen(mid,zeilen);
  if(w.ok)return {fehler:null,anzahl:zeilen.length,wartet:true};
  // Kein Weg in die Warteschlange (IndexedDB gesperrt, keine Firma) - dann
  // die alte, klare Absage statt eines stillen Fehlschlags.
  if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Abhaken"))return {offline:true};
 }
 const {data,error}=await sb.from("zuschnitt_erledigt")
  .upsert(zeilen,{onConflict:"measurement_id,stueck_nr"}).select();
 if(error){console.error("zuschnitt_erledigt schreiben",error);return {fehler:error.message}}
 // Ein von RLS geblocktes Schreiben meldet keinen Fehler, es betrifft still
 // 0 Zeilen (CLAUDE.md 24.1) - das gilt hier ausdruecklich nicht als Erfolg.
 if(!data||!data.length)return {fehler:"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"};
 const m=zeCache.get(Number(mid))||new Map();
 data.forEach(z=>m.set(Number(z.stueck_nr),z));
 zeCache.set(Number(mid),m);
 // v3.21: Wer gerade an dieser Karte abhakt, behaelt ihre Liste offen - auch
 // wenn das letzte Stueck sie fertig macht. Sonst spraenge sie unter dem
 // Finger weg, und ein versehentlicher Haken waere nur ueber einen
 // zusaetzlichen Klick zurueckzunehmen.
 if(typeof werkOffenKarte!=="undefined")werkOffenKarte.add(Number(mid));
 return {fehler:null,anzahl:data.length};
}

// Nach dem Uebertragen: die wartenden Haken sind echte Zeilen geworden.
// Zwischenspeicher leeren und frisch holen, statt den Stand zu erraten.
async function zeNachUebertragung(){
 zeCache=new Map(); zeGeladen=new Set();
 if(typeof zeNachziehen==="function")await zeNachziehen();
}

// Einen oder mehrere Haken in die Warteschlange legen.// Einen oder mehrere Haken in die Warteschlange legen. Ein Schluessel je
// Stueck - zweimal tippen darf keinen zweiten Eintrag ergeben, sonst stuenden
// beim Uebertragen zwei widersprechende Haken fuer dasselbe Blech.
async function zeEinreihen(mid,zeilen){
 const m=zeMassaufnahme(mid);
 const titel=zeTitel(m);
 let ok=0;
 for(const z of zeilen){
  const r=await wsEinreihen({
   tabelle:"zuschnitt_erledigt",
   art:"upsert",
   schluessel:`zuschnitt_erledigt:${z.measurement_id}:${z.stueck_nr}`,
   payload:z,
   titel:`Stück ${z.stueck_nr}${z.erledigt?"":" zurückgenommen"}${titel?" – "+titel:""}`
  });
  if(r&&r.ok)ok++;
 }
 if(!ok)return {ok:false};
 // Der Haken erscheint sofort - sonst sieht es aus, als haette der Tipp
 // nichts bewirkt. Er ist als wartend gekennzeichnet, damit niemand glaubt,
 // er stuende schon in der Datenbank.
 const karte=zeCache.get(Number(mid))||new Map();
 zeilen.forEach(z=>karte.set(Number(z.stueck_nr),Object.assign({},z,{wartet:true})));
 zeCache.set(Number(mid),karte);
 zeGeladen.add(Number(mid));
 if(typeof werkOffenKarte!=="undefined")werkOffenKarte.add(Number(mid));
 return {ok:true};
}
// Die Massaufnahme zu einer Id - aus dem, was gerade geladen ist. Nur fuer
// die Beschriftung des Warteschlangen-Eintrags, nichts Fachliches.
function zeMassaufnahme(mid){
 const suchen=l=>Array.isArray(l)?l.find(x=>x&&Number(x.id)===Number(mid)):null;
 return suchen(typeof projectMeasurementsCache!=="undefined"?projectMeasurementsCache:null)
   ||suchen(typeof werkZeilen!=="undefined"?werkZeilen:null)||null;
}
function zeTitel(m){
 if(!m)return "";
 const art=(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])||m.type||"";
 return [art,(m.title||"").trim()].filter(Boolean).join(" · ");
}

// v3.22: "Jetzt einschalten" am Hinweis.// v3.22: "Jetzt einschalten" am Hinweis. Laeuft ueber pmSchnellEin() und
// damit ueber set_projektmodule() - kein zweiter Schreibweg, und die
// Datenbank prueft den Administrator selbst. Danach frischt pmNachAenderung()
// alle Ansichten auf, die vom Schalter abhaengen.
document.addEventListener("click",async e=>{
 const t=e.target.closest?e.target.closest("[data-ze-ein]"):null;
 if(!t)return;
 e.preventDefault(); e.stopPropagation();
 if(typeof pmSchnellEin!=="function"){alert("Die Einstellung ist gerade nicht verfügbar.");return}
 t.disabled=true;
 const r=await pmSchnellEin(t.dataset.zeEin==="haupt"?"haupt":"zuschnitt");
 t.disabled=false;
 if(!r||!r.ok){alert((r&&r.text)||"Das Modul konnte nicht eingeschaltet werden.");return}
 // Die Stelle, an der der Hinweis stand, neu zeichnen - je nachdem, wo wir sind.
 if(typeof renderWerkstatt==="function"&&$("werkstattModal")&&!$("werkstattModal").hidden)renderWerkstatt();
 else if(typeof mzAuffrischen==="function"&&mzSeiteOffen())mzAuffrischen();
 else if(typeof showMeasTypeSection==="function"&&$("measType"))showMeasTypeSection($("measType").value);
},true);

// Klick auf eine Positionsnummer bzw. auf "alle" - ein Tap = erledigt.
// Delegiert am Dokument, damit es in jedem Modul und auf der zentralen
// Seite gleichermassen wirkt, ohne es elfmal einzubauen.
document.addEventListener("click",async e=>{
 const t=e.target.closest?e.target.closest("[data-ze-nr],[data-ze-alle]"):null;
 if(!t)return;
 e.preventDefault();
 if(t.dataset.zeNr!==undefined){
  const mid=t.dataset.zeMeas, nr=t.dataset.zeNr;
  const an=!zeIstErledigt(mid,nr);
  const masse={}; masse[nr]={laenge_mm:Number(t.dataset.zeL)||null,
    breite_mm:Number(t.dataset.zeB)||null,merkmal:t.dataset.zeM||null};
  const r=await zeSetzen(mid,[nr],an,masse);
  if(r&&r.fehler){alert(r.fehler);return}
  if(r&&r.offline)return;
 }else{
  const mid=t.dataset.zeAlle;
  const nrs=String(t.dataset.zeNrs||"").split(",").filter(Boolean);
  const zeile=t.closest("[data-ze-zeile]");
  const offen=nrs.filter(n=>!zeIstErledigt(mid,n));
  const an=offen.length>0;                 // alles offen -> alles abhaken
  const masse={};
  nrs.forEach(n=>{
   const b=zeile&&zeile.querySelector('[data-ze-nr="'+n+'"]');
   masse[n]={laenge_mm:b?(Number(b.dataset.zeL)||null):null,
             breite_mm:b?(Number(b.dataset.zeB)||null):null,
             merkmal:b?(b.dataset.zeM||null):null};
  });
  const r=await zeSetzen(mid,an?offen:nrs,an,masse);
  if(r&&r.fehler){alert(r.fehler);return}
  if(r&&r.offline)return;
 }
 zeMarkierungAuffrischen();
 // Die zentrale Seite nur neu zeichnen, wenn sie wirklich offen ist - sonst
 // wuerde in ein verstecktes Fenster gerendert.
 if(mzSeiteOffen()&&typeof mzAuffrischen==="function")mzAuffrischen();
 if(typeof cockpitMatZuStand==="function")cockpitMatZuStand();
});

// Nach jedem Zeichnen einer Zuschnittliste: fehlende Haken nachladen und
// den Stand malen. Beobachtet wird das Dokument, damit kein Modul dafuer
// angefasst werden muss.
let zeLaeuft=false;
async function zeNachziehen(){
 if(zeLaeuft)return; zeLaeuft=true;
 try{
  const ids=new Set();
  document.querySelectorAll("[data-ze-nr]").forEach(b=>{
   const id=Number(b.dataset.zeMeas);
   if(Number.isFinite(id)&&!zeGeladen.has(id))ids.add(id);
  });
  if(ids.size)await zeLaden([...ids]);
  zeMarkierungAuffrischen();
  // v3.20: In der Werkstatt steht der Stand als Text ("2 von 3 zugeschnitten").
  // Hier - und nur hier - wird er nachgezogen: der Beobachter laeuft nach JEDEM
  // Zeichnen einer Zuschnittliste und auch nach jedem Abhaken (das veraendert
  // den DOM). Nur die Zahlen, nicht die ganze Werkstatt - sonst spraenge die
  // Seite unter dem Finger weg.
  if(typeof werkZuschnittStandAuffrischen==="function")werkZuschnittStandAuffrischen();
 }finally{zeLaeuft=false}
}
if(typeof MutationObserver!=="undefined"){
 let warten=null;
 new MutationObserver(()=>{
  clearTimeout(warten);
  warten=setTimeout(()=>{if(document.querySelector("[data-ze-nr]"))zeNachziehen()},60);
 }).observe(document.documentElement,{childList:true,subtree:true});
}

// ===========================================================================
// TEIL B - Die zentrale Seite
// ===========================================================================

let mzProjectId=null;
function mzSeiteOffen(){const m=$("matZuModal");return !!(m&&!m.hidden)}

function mzModulAn(){
 if(typeof pmAktiv!=="function")return false;
 return pmAktiv("material")||pmAktiv("zuschnitt")||pmAktiv("reservierung");
}
function mzListe(){return Array.isArray(projectMeasurementsCache)?projectMeasurementsCache:[]}
function mzMatName(m){
 return (typeof pmatMaterialName==="function")?pmatMaterialName((m.data||{}).material):"Ohne Material";
}
function mzArt(m){
 const art=(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])||m.type||"Massaufnahme";
 const t=(m.title||"").trim();
 return t?(art+" · "+t):art;
}

// ---- Material -------------------------------------------------------------
// Zusammengefuehrt wird, was die Massaufnahmen gespeichert haben (js/48);
// der Reservierungsstand kommt aus den bereits geladenen Zeilen von js/50.
// Absichtlich NUR die drei Materialzustaende: benoetigt, verfuegbar,
// reserviert. Zugeschnitten und geruestet sind etwas anderes und stehen
// woanders.
const MZ_MAT_STATUS=["benoetigt","verfuegbar","reserviert"];
function mzReservierungen(){return (typeof resvListe!=="undefined"&&Array.isArray(resvListe))?resvListe:[]}
function mzMatGruppen(){
 const gruppen=(typeof pmatSammeln==="function")?pmatSammeln(mzListe()):[];
 const resv=mzReservierungen();
 return gruppen.map(g=>{
  const meine=resv.filter(r=>String(r.material_name||"Ohne Material")===String(g.material));
  const zaehler={};
  meine.forEach(r=>{zaehler[r.status]=(zaehler[r.status]||0)+1});
  const reserviertPlus=meine.filter(r=>MZ_MAT_STATUS.indexOf(r.status)<0).length;
  return {material:g.material,positionen:g.positionen,aufnahmen:g.aufnahmen,
          zeilen:meine,zaehler,reserviertPlus,
          offen:meine.filter(r=>r.status==="benoetigt").length};
 });
}
function mzMatKarteHtml(g){
 const n=g.positionen.length;
 const teile=[];
 teile.push(`<span class="mz-zahl">${n}</span> Position${n===1?"":"en"} aus `
  +`${g.aufnahmen.length} Massaufnahme${g.aufnahmen.length===1?"":"n"}`);
 if(g.zeilen.length){
  const st=MZ_MAT_STATUS.filter(s=>g.zaehler[s]).map(s=>
   `${g.zaehler[s]} ${(typeof resvStatusName==="function")?resvStatusName(s):s}`);
  if(g.reserviertPlus)st.push(g.reserviertPlus+" weiter fortgeschritten");
  teile.push(st.join(" · "));
 }else teile.push("Noch nichts reserviert");
 // Nur die eine Aktion, die jetzt zaehlt (Auftrag: keine Statusauswahl als
 // Hauptbedienung).
 const knopf=!g.zeilen.length
  ? `<button type="button" class="blue mz-knopf" data-mz-resv="neu">📦 Material reservieren</button>`
  : (g.offen
     ? `<button type="button" class="blue mz-knopf" data-mz-resv="offen">📦 ${g.offen} noch reservieren</button>`
     : `<button type="button" class="gray mz-knopf" data-mz-resv="aendern">Reservierung ändern</button>`);
 return `<div class="mz-karte">
  <div class="mz-karte-titel">${esc(g.material)}</div>
  <div class="mz-karte-zeile">${teile.join("<br>")}</div>
  ${knopf}
 </div>`;
}

// ---- Zuschnitt nach Massaufnahme -----------------------------------------
function mzZuschnittKarten(){
 const raus=[];
 mzListe().forEach(m=>{
  const s=zeStand(m);
  if(!s.gesamt)return;
  raus.push({m,stand:s});
 });
 // Offene und teilweise erledigte zuerst, vollstaendige darunter.
 raus.sort((a,b)=>{
  const fa=a.stand.fertig?1:0, fb=b.stand.fertig?1:0;
  if(fa!==fb)return fa-fb;
  return b.stand.offen-a.stand.offen;
 });
 return raus;
}
function mzFortschrittHtml(s){
 const p=s.gesamt?Math.round(s.erledigt/s.gesamt*100):0;
 return `<div class="mz-balken"><div class="mz-balken-innen${s.fertig?" mz-voll":""}" style="width:${p}%"></div></div>`;
}
function mzZuschnittKarteHtml(k){
 const m=k.m, s=k.stand;
 const warn=(m.freigabe_verfallen&&typeof mwAktiv==="function"&&mwAktiv())
  ? `<div class="mz-warn">⚠️ Freigabe verfallen – dieser Stand ist nicht mehr freigegeben.</div>`:"";
 const alt=s.veraltet
  ? `<div class="mz-warn">⚠️ ${s.veraltet} Haken passt nicht mehr zum jetzigen Zuschnitt.</div>`:"";
 return `<div class="mz-karte${s.fertig?" mz-karte-fertig":""}">
  <div class="mz-karte-titel">${esc(mzArt(m))}</div>
  <div class="mz-karte-zeile">${esc(mzMatName(m))} · <span class="mz-zahl">${s.gesamt}</span> Zuschnitt${s.gesamt===1?"":"e"}</div>
  <div class="mz-karte-zeile mz-stand">${s.erledigt} von ${s.gesamt} erledigt${s.fertig?" ✓":""}</div>
  ${mzFortschrittHtml(s)}
  ${warn}${alt}
  <button type="button" class="blue mz-knopf" data-mz-zuschnitt="${esc(m.id)}">✂️ Zuschnitt öffnen</button>
 </div>`;
}

// ---- Die Seite ------------------------------------------------------------
function mzKennzahlHtml(label,wert){
 return `<div class="mz-kennzahl"><label>${esc(label)}</label><div class="ra-wert">${esc(wert)}</div></div>`;
}
function mzAuffrischen(){
 const box=$("matZuBody"); if(!box)return;
 const liste=mzListe();
 const matAn=(typeof pmAktiv==="function")&&pmAktiv("material");
 const zuAn=(typeof pmAktiv==="function")&&pmAktiv("zuschnitt");
 const resvAn=(typeof pmAktiv==="function")&&pmAktiv("reservierung");
 const gruppen=matAn?mzMatGruppen():[];
 const karten=zuAn?mzZuschnittKarten():[];
 const ges=zeStandListe(liste);

 // Wenige Kennzahlen oben - genau die vier des Auftrags.
 const kz=[];
 if(matAn)kz.push(mzKennzahlHtml("Materialpositionen",String(gruppen.reduce((s,g)=>s+g.positionen.length,0))));
 if(zuAn){
  kz.push(mzKennzahlHtml("Zuschnitt offen",String(ges.offen)));
  kz.push(mzKennzahlHtml("Zuschnitt erledigt",ges.gesamt?ges.erledigt+" von "+ges.gesamt:"–"));
 }
 kz.push(mzKennzahlHtml("Massaufnahmen",String(liste.length)));
 $("matZuKennzahlen").innerHTML=kz.join("");

 // Eine Gruppe ohne Position hat nichts zu reservieren - eine Karte mit
 // einem Knopf, der nichts bewirkt, waere Laerm. In den Einzelheiten unten
 // steht weiterhin alles.
 const mitPos=gruppen.filter(g=>g.positionen.length>0);
 const teile=[];
 if(matAn){
  teile.push(`<h3 class="mz-titel">🧱 Material</h3>`);
  teile.push(!liste.length
   ? `<div class="small">Noch keine Massaufnahme in diesem Projekt – es gibt deshalb noch kein Material.</div>`
   : (mitPos.length?mitPos.map(mzMatKarteHtml).join("")
      :`<div class="small">Die Massaufnahmen dieses Projekts haben noch kein gespeichertes Ausmass.</div>`));
  // Reststuecke bewusst nur als eine Zeile - sie gehoeren nicht in die
  // Hauptansicht, und ein Rest wird nie automatisch eingeplant.
  if(resvAn){
   const lager=(typeof reststuecke!=="undefined"&&Array.isArray(reststuecke))?reststuecke:null;
   const frei=lager?lager.filter(r=>!r.reserviert_fuer_project_id&&!r.verbraucht).length:null;
   teile.push(`<div class="mz-rest">Reststücke verfügbar: <b>${frei===null?"–":esc(frei)}</b>
    <button type="button" class="gray mz-klein" data-mz-resv="reste">Reststücke anzeigen</button></div>`);
  }
 }
 if(zuAn){
  teile.push(`<h3 class="mz-titel">✂️ Zuschnitt nach Massaufnahme</h3>`);
  teile.push(karten.length?karten.map(mzZuschnittKarteHtml).join("")
   :`<div class="small">Noch nichts zuzuschneiden – keine Massaufnahme dieses Projekts hat einen gespeicherten Zuschnitt.</div>`);
 }else if(ges.gesamt>0){
  // v3.22: Der Bereich verschwand bis v3.21 kommentarlos, sobald das Modul
  // aus war - obwohl es sehr wohl etwas zuzuschneiden gibt. Statt stiller
  // Leere der Grund und, fuer Administratoren, der Schalter daneben.
  teile.push(`<h3 class="mz-titel">✂️ Zuschnitt nach Massaufnahme</h3>`);
  teile.push(`<div class="small">Dieses Projekt hat <b>${esc(ges.gesamt)}</b> Zuschnitt${ges.gesamt===1?"":"e"} aus `
   +`${esc(ges.aufnahmen)} Massaufnahme${ges.aufnahmen===1?"":"n"}.</div>`
   +zeAbhakenHinweisHtml());
 }
 box.innerHTML=teile.join("");
 mzEinzelheitenSichtbarkeit(matAn,zuAn,resvAn);
}
// Die ausfuehrlichen Ansichten aus v3.09 bleiben vollstaendig erhalten -
// sie stehen jetzt aufklappbar unter der Hauptansicht statt als eigene
// Cockpit-Karten davor.
function mzEinzelheitenSichtbarkeit(matAn,zuAn,resvAn){
 [["matZuDetailsMaterial",matAn],["matZuDetailsZuschnitt",zuAn],
  ["matZuDetailsReservierung",resvAn]].forEach(([id,an])=>{
   const e=$(id); if(e)e.hidden=!an;
  });
}

async function openMaterialZuschnitt(projectId){
 const id=projectId||(typeof cockpitProjectId!=="undefined"?cockpitProjectId:null);
 if(!id||!mzModulAn())return;
 mzProjectId=id;
 const p=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))
  ?allProjects.find(x=>String(x.id)===String(id)):null;
 if($("matZuTitel"))$("matZuTitel").textContent=p
  ?((typeof projektTitel==="function")?projektTitel(p):(p.object||p.name||"")):"";
 $("matZuModal").hidden=false;
 // Die Haken der Massaufnahmen dieses Projekts - eine Abfrage.
 await zeLaden(mzListe().map(m=>m.id),true);
 // Die ausfuehrlichen Ansichten zeichnen sich selbst (js/48, js/49, js/50).
 if(typeof renderProjektMaterial==="function")renderProjektMaterial();
 if(typeof renderProjektZuschnitt==="function")renderProjektZuschnitt();
 if(typeof resvCockpitLaden==="function")await resvCockpitLaden(id);
 mzAuffrischen();
 zeMarkierungAuffrischen();
}

// ---- Cockpit: eine einzige kompakte Karte ---------------------------------
function cockpitMatZuStand(){
 const karte=$("cockpitMatZuCard");
 const an=mzModulAn();
 if(karte)karte.hidden=!an;
 const zeile=$("cockpitStandMatZuZeile");
 if(zeile)zeile.hidden=!an;
 if(!an)return;
 const liste=mzListe();
 const matAn=(typeof pmAktiv==="function")&&pmAktiv("material");
 const zuAn=(typeof pmAktiv==="function")&&pmAktiv("zuschnitt");
 const gruppen=matAn?((typeof pmatSammeln==="function")?pmatSammeln(liste):[]):[];
 const pos=gruppen.reduce((s,g)=>s+g.positionen.length,0);
 const ges=zeStandListe(liste);
 const zeilen=[];
 if(matAn)zeilen.push("Material: "+pos+" Position"+(pos===1?"":"en"));
 if(zuAn){
  zeilen.push("Zuschnitt: "+(ges.gesamt?ges.erledigt+" von "+ges.gesamt+" erledigt":"noch keiner"));
  if(ges.offen>0)zeilen.push(ges.offen+" Zuschnitt"+(ges.offen===1?"":"e")+" offen");
 }
 if($("cockpitMatZuText"))$("cockpitMatZuText").innerHTML=zeilen.map(esc).join("<br>");
 if($("cockpitMatZuStand")){
  $("cockpitMatZuStand").textContent=zuAn&&ges.gesamt
   ?(ges.erledigt+"/"+ges.gesamt):(matAn?String(pos):"–");
 }
 if($("cockpitMatZuMark")){
  $("cockpitMatZuMark").textContent=(zuAn&&ges.gesamt)?(ges.offen>0?"▸":"✓"):(pos>0?"✓":"○");
 }
}

// ---- Bedienung ------------------------------------------------------------
if($("matZuModal")){
 $("matZuModal").addEventListener("click",e=>{
  const t=e.target.closest?e.target.closest("[data-mz-zuschnitt],[data-mz-resv]"):null;
  if(!t)return;
  if(t.dataset.mzZuschnitt!==undefined){mzZuschnittOeffnen(Number(t.dataset.mzZuschnitt));return}
  // Reservierung und Reststuecke stehen als Einzelheiten auf derselben
  // Seite - hingesprungen wird, statt eine zweite Ansicht zu bauen.
  const ziel=$("matZuDetailsReservierung");
  if(ziel){ziel.open=true;ziel.scrollIntoView({block:"start"})}
 });
}

// "Zuschnitt öffnen": die vorhandene Zuschnittansicht DIESER Massaufnahme.
// Keine zweite Darstellung, keine Neuberechnung - geoeffnet wird ueber den
// bestehenden Weg, danach wird auf das Zuschnitt-Register gestellt.
// Die Registertabellen sind mit const deklariert und haengen deshalb nicht
// an window - hier wird jede ueber eine kleine Funktion geholt, statt sie
// ueber ihren Namen aufzuloesen.
const MZ_ZUSCHNITT_REGISTER={
 einlaufblech_gerade:  {tab:()=>typeof EBA_REGISTER  !=="undefined"?EBA_REGISTER  :null, setzen:n=>ebaSetzeSchritt(n)},
 einlaufblech_konisch: {tab:()=>typeof EBKA_REGISTER !=="undefined"?EBKA_REGISTER :null, setzen:n=>ebkaSetzeSchritt(n)},
 rinne_halbrund:       {tab:()=>typeof RA_REGISTER   !=="undefined"?RA_REGISTER   :null, setzen:n=>raSetzeSchritt(n)},
 freies_profil:        {tab:()=>typeof FPA_REGISTER  !=="undefined"?FPA_REGISTER  :null, setzen:n=>fpaSetzeSchritt(n)},
 mauerabdeckung:       {tab:()=>typeof MADA_REGISTER !=="undefined"?MADA_REGISTER :null, setzen:n=>madaSetzeSchritt(n)},
 kehle:                {tab:()=>typeof KEA_REGISTER  !=="undefined"?KEA_REGISTER  :null, setzen:n=>keaSetzeSchritt(n)},
 lukarne:              {tab:()=>typeof LUKA_REGISTER !=="undefined"?LUKA_REGISTER :null, setzen:n=>lukaSetzeSchritt(n)},
 kamineinfassung:      {tab:()=>typeof KAM_REGISTER  !=="undefined"?KAM_REGISTER  :null, setzen:n=>kamaSetzeSchritt(n)},
 einfassung_rund:      {tab:()=>typeof EINFA_REGISTER!=="undefined"?EINFA_REGISTER:null, setzen:n=>einfaSetzeSchritt(n)},
 rinne:                {tab:()=>typeof RPA_REGISTER  !=="undefined"?RPA_REGISTER  :null, setzen:n=>rpaSetzeSchritt(n)},
 anschlussblech:       {tab:()=>typeof ANBA_REGISTER !=="undefined"?ANBA_REGISTER :null, setzen:n=>anbaSetzeSchritt(n)}
};
// Die Registernummer wird NICHT fest eingetragen, sondern in der Tabelle
// des Moduls gesucht - wird dort ein Register eingefuegt, stimmt sie
// weiterhin (dasselbe Vorgehen wie hilfeKarte(), v3.03).
function mzZuschnittRegister(type){
 const e=MZ_ZUSCHNITT_REGISTER[type]; if(!e)return null;
 let tab=null; try{tab=e.tab()}catch(x){tab=null}
 if(!Array.isArray(tab))return null;
 const r=tab.find(x=>String(x.kurz||x.titel||"").trim()==="Zuschnitt");
 return r?{nr:r.nr,setzen:e.setzen}:null;
}
function mzZuschnittOeffnen(id){
 const m=mzListe().find(x=>Number(x.id)===Number(id));
 if(!m)return;
 $("matZuModal").hidden=true;
 if(typeof measEditReturnTo!=="undefined")measEditReturnTo="projectCockpit";
 if(typeof openMeasurement==="function")openMeasurement(m);
 const r=mzZuschnittRegister(m.type);
 if(r){try{r.setzen(r.nr)}catch(x){console.error("Zuschnitt-Register",x)}}
 zeNachziehen();
}

if($("cockpitMatZuOeffnen"))$("cockpitMatZuOeffnen").onclick=()=>openMaterialZuschnitt();
if($("matZuZurueck"))$("matZuZurueck").onclick=()=>{$("matZuModal").hidden=true};
