// ---------------------------------------------------------------------------
// v3.09  Werkstatt- und Ruestansicht
// ---------------------------------------------------------------------------
// EINE ZUSAETZLICHE SICHT auf den bestehenden Arbeitsablauf aus v3.05 bis
// v3.07 - kein zweiter Ablauf, keine zweite Statuskette, keine zweite
// Aufgabenverwaltung (Auftrag Abschnitt 8 und 21).
//
//   FREIGEGEBEN → ZU RÜSTEN → GERÜSTET → ZU MONTIEREN → MONTIERT → ABGESCHLOSSEN
//
// Bestaetigt wird ueber genau dieselbe Stelle wie auf der Startseite:
// aufgabeAusfuehren() in js/45, das seinerseits die bestehenden
// measurement_geruestet/measurement_montiert-Funktionen ruft. Hier wird
// KEIN eigener Schreibweg gebaut.
//
// Der Ruester sieht die echte Ruestgrundlage - Projekt, Massaufnahmen,
// Material, Zuschnitt, Reservierungen, Reststuecke, Status - und zwar aus
// denselben Funktionen, die auch das Projekt-Cockpit verwendet
// (pmatSammeln aus js/48, pzuSammeln/pzuPlan aus js/49, zuschnittHtml aus
// js/33). Es wird nichts zweitgerechnet.
//
// Ein VERALTETER FREIGABESTAND wird deutlich gekennzeichnet und ist nicht
// bestaetigbar (Auftrag Abschnitt 15). Das erzwingt ohnehin schon die
// Datenbank: der Verfall setzt den Status auf "in_bearbeitung" zurueck,
// und measurement_geruestet verlangt "zu_ruesten". Hier wird es sichtbar.
//
// Sichtbar nur, wenn das Untermodul eingeschaltet ist - pmAktiv("werkstatt").
// ---------------------------------------------------------------------------

const WERK_STATUS=["freigegeben","zu_ruesten","geruestet","zu_montieren"];
const WERK_LIMIT=300;
// v3.23: Der gewaehlte Filter wird je Geraet gemerkt. Wer in der Werkstatt
// immer nur die eigenen Auftraege sieht, soll ihn nicht bei jedem Oeffnen neu
// setzen muessen. Reine Ansichtssache - wie "Aufgaben auf dem Startbildschirm"
// (v3.07), kein Firmendatum.
const WERK_FILTER_SPEICHER="sd_werkFilter";
const WERK_FILTER_ERLAUBT=["alle","ruesten","montieren","meine"];
function werkFilterGemerkt(){
 try{
  const v=localStorage.getItem(WERK_FILTER_SPEICHER);
  return WERK_FILTER_ERLAUBT.indexOf(v)>=0?v:"alle";
 }catch(e){ return "alle" }
}
function werkFilterMerken(v){
 try{ localStorage.setItem(WERK_FILTER_SPEICHER,v) }catch(e){}
}
let werkZeilen=[];        // leichte Liste, ohne data
let werkReservierungen=[];
// v3.09 Auftrag Abschnitt 15: welche freigegebene Fassung liegt der Zeile
// zugrunde? Eine Abfrage fuer die ganze Liste, nicht eine je Zeile.
let werkFassungen=[];
let werkOffen=null;       // aufgeklapptes Projekt
let werkGrundlage=null;   // {projectId, aufnahmen:[...]}
let werkFilter=werkFilterGemerkt();
// v3.21: Eine fertig geschnittene Karte klappt ihre Liste zu - sonst waere
// die Werkstatt bei vielen erledigten Massaufnahmen unnoetig lang. Wer sie
// wieder aufklappt, steht hier drin; es geht nichts verloren.
const werkOffenKarte=new Set();
let werkLauf=0;
let werkFehler=null;

function werkAktiv(){return typeof pmAktiv==="function"&&pmAktiv("werkstatt")}
function werkIch(){return currentProfile?currentProfile.id:null}

// ---- Laden ----------------------------------------------------------------
// Zwei Abfragen fuer die ganze Liste, danach eine je aufgeklapptem Projekt.
// Kein company_id-Filter: die Firmengrenze erzwingt die Datenbank.
async function werkLaden(){
 werkFehler=null;
 if(!werkAktiv()){werkZeilen=[];werkReservierungen=[];werkFassungen=[];return}
 const {data,error}=await sb.from("measurements")
  // v3.21: data MUSS mit. Ohne das kann keine Zeile ihren Zuschnittstand
  // kennen (zeStand -> pmatStuecke -> data.rollen), und der Ruester saehe
  // die abhakbare Liste erst nach zwei weiteren Klicks - genau die Meldung,
  // die zu diesem Umbau gefuehrt hat. Gemessen an echten Daten: die groesste
  // offene Massaufnahme (41 Stuecke) hat rund 10 kB data. Die Abfrage ist auf
  // WERK_LIMIT=300 Zeilen begrenzt, zeigt also nur Freigegebenes/Eingeteiltes.
  .select("id,project_id,type,title,date,workflow_status,freigabe_verfallen,"
        +"ruester_id,monteur_id,geruestet_am,montiert_am,updated_at,created_by,data")
  .in("workflow_status",WERK_STATUS)
  .order("updated_at",{ascending:false})
  .limit(WERK_LIMIT);
 if(error){werkFehler=error.message||"Unbekannter Fehler";werkZeilen=[];return}
 werkZeilen=data||[];
 werkReservierungen=[]; werkFassungen=[];
 const mids=werkZeilen.map(z=>z.id);
 if(mids.length&&typeof pmAktiv==="function"&&pmAktiv("versionierung")){
  const v=await sb.from("measurement_versionen")
   .select("measurement_id,nummer,freigegeben_am").in("measurement_id",mids);
  if(!v.error)werkFassungen=v.data||[];
 }
 if(!(typeof pmAktiv==="function"&&pmAktiv("reservierung")))return;
 const ids=[...new Set(werkZeilen.map(z=>z.project_id).filter(x=>x))];
 if(!ids.length)return;
 const r=await sb.from("material_reservierungen").select("*").in("project_id",ids);
 if(!r.error)werkReservierungen=r.data||[];
}

// Hoechste Fassungsnummer einer Massaufnahme, oder null.
function werkFassung(id){
 let hoch=null;
 werkFassungen.forEach(v=>{if(v.measurement_id===id&&(hoch===null||v.nummer>hoch))hoch=v.nummer});
 return hoch;
}

// Die Ruestgrundlage eines Projekts braucht die gespeicherten Daten der
// Massaufnahmen. Deshalb erst beim Aufklappen und nur fuer dieses eine
// Projekt - kein Nachladen fuer jede Zeile der Liste.
async function werkGrundlageLaden(projectId){
 const {data,error}=await sb.from("measurements").select("*").eq("project_id",projectId);
 werkGrundlage={projectId,aufnahmen:error?null:(data||[]),fehler:error?error.message:null};
}

// ---- Gruppieren -----------------------------------------------------------
function werkPasst(z){
 if(werkFilter==="ruesten")return z.workflow_status==="zu_ruesten";
 if(werkFilter==="montieren")return z.workflow_status==="zu_montieren";
 if(werkFilter==="meine")return z.ruester_id===werkIch()||z.monteur_id===werkIch();
 return true;
}
function werkGruppen(){
 const map=new Map();
 werkZeilen.filter(werkPasst).forEach(z=>{
  const k=z.project_id||0;
  if(!map.has(k))map.set(k,{projectId:z.project_id||null,aufnahmen:[]});
  map.get(k).aufnahmen.push(z);
 });
 return [...map.values()].map(g=>{
  const p=g.projectId&&typeof allProjects!=="undefined"
    ?allProjects.find(x=>x.id===g.projectId):null;
  return {...g, projekt:p||null,
    titel:p?((typeof projektTitel==="function")?projektTitel(p):(p.name||"Projekt"))
           :"Ohne Projekt",
    unter:p?[p.name,p.order_no,p.customer].filter(Boolean).join(" · "):"",
    zuRuesten:g.aufnahmen.filter(a=>a.workflow_status==="zu_ruesten").length,
    zuMontieren:g.aufnahmen.filter(a=>a.workflow_status==="zu_montieren").length};
 }).sort((a,b)=>a.titel.localeCompare(b.titel,"de"));
}

// ---- Der rote Faden -------------------------------------------------------
// v3.12: Bis v3.11 war die Werkstatt eine flache Liste - man sah, WAS anliegt,
// aber nicht, WAS ZUERST. Die Stationen unten leiten sich ausschliesslich aus
// echten Daten ab: aus dem Status der Reservierungen (das ist genau die Kette
// benoetigt -> verfuegbar -> reserviert -> zugeschnitten aus js/50) und aus
// dem Arbeitsstatus der Massaufnahmen (v3.05). Es wird nichts erfunden und
// keine zweite Statuskette gefuehrt.
//
// Eine Station erscheint nur, wenn die dafuer noetigen Module eingeschaltet
// sind - sonst gaebe es dazu keinen ablesbaren Zustand.
const WERK_STATIONEN=[
 {k:"reservieren", text:"Reserviert",    module:["reservierung"]},
 {k:"zuschneiden", text:"Zugeschnitten", module:["reservierung","zuschnitt"]},
 {k:"ruesten",     text:"Gerüstet",      module:[]},
 {k:"montieren",   text:"Montiert",      module:[]}
];
const WERK_RES_RANG={benoetigt:0,verfuegbar:1,reserviert:2,zugeschnitten:3,geruestet:4};

function werkModulAn(k){return typeof pmAktiv==="function"&&pmAktiv(k)}
function werkStationen(){
 return WERK_STATIONEN.filter(st=>st.module.every(werkModulAn));
}

// Die Zahlen eines Projekts - eine Stelle, aus der Leiste, Streifen,
// Sortierung und Zeilenmarkierung gleichermassen lesen.
function werkZahlen(g){
 const res=werkReservierungen.filter(r=>r.project_id===g.projectId);
 const rang=r=>(WERK_RES_RANG[r.status]!==undefined?WERK_RES_RANG[r.status]:0);
 const auf=g.aufnahmen||[];
 return {
  res:res.length,
  offenRes:res.filter(r=>rang(r)<2).length,   // noch nicht reserviert
  offenZu:res.filter(r=>rang(r)<3).length,    // noch nicht zugeschnitten
  zuRuesten:auf.filter(a=>a.workflow_status==="zu_ruesten"&&!a.freigabe_verfallen).length,
  zuMontieren:auf.filter(a=>a.workflow_status==="zu_montieren"&&!a.freigabe_verfallen).length,
  wartet:auf.filter(a=>a.workflow_status==="freigegeben").length,  // niemand eingeteilt
  verfallen:auf.filter(a=>!!a.freigabe_verfallen).length
 };
}
// Je Station: fertig / jetzt / offen. Der erste nicht erledigte Schritt ist
// "jetzt" - genau der, den der Streifen nennt.
function werkStand(g){
 const z=werkZahlen(g);
 // Gibt es zu diesem Projekt UEBERHAUPT keine Reservierung, dann sagen die
 // Daten nichts darueber aus, ob das Material schon bereit ist - der Betrieb
 // hat es hier schlicht nicht ueber die App reserviert. Diese beiden
 // Stationen werden dann als uebersprungen gezeigt und nie als naechster
 // Schritt gefordert. Sonst stuende bei einem Projekt, das schon montiert
 // wird, "zuerst reservieren" - eine Behauptung ohne Grundlage.
 const ohneRes=z.res===0;
 const roh=werkStationen().map(st=>{
  if((st.k==="reservieren"||st.k==="zuschneiden")&&ohneRes)
   return {k:st.k,text:st.text,uebersprungen:true};
  let fertig=false;
  if(st.k==="reservieren")   fertig=z.offenRes===0;
  else if(st.k==="zuschneiden")fertig=z.offenZu===0;
  else if(st.k==="ruesten")  fertig=z.zuRuesten===0&&z.wartet===0;
  else                       fertig=z.zuMontieren===0&&z.zuRuesten===0&&z.wartet===0;
  return {k:st.k,text:st.text,fertig};
 });
 let jetzt=false;
 return roh.map(x=>{
  if(x.uebersprungen)return {...x,zustand:"uebersprungen"};
  if(x.fertig)return {...x,zustand:"fertig"};
  if(!jetzt){jetzt=true;return {...x,zustand:"jetzt"}}
  return {...x,zustand:"offen"};
 });
}
// v3.21: Wie viele Stuecke dieses Projekts sind geschnitten? Aus zeStandListe
// (js/56) - dieselbe Quelle wie die Karten und der Gesamtstand oben.
function werkStueckStand(g){
 const auf=(g&&g.aufnahmen)||[];
 const s=(typeof zeStandListe==="function")?zeStandListe(auf):null;
 return s||{gesamt:0,erledigt:0};
}
// Was jetzt zu tun ist. Liefert immer einen Satz - auch wenn nichts offen ist.
function werkNaechster(g){
 const z=werkZahlen(g);
 const stand=werkStand(g);
 const jetzt=stand.find(x=>x.zustand==="jetzt");
 if(z.verfallen)return {k:"verfallen",farbe:"rot",rang:0,
   satz:z.verfallen+(z.verfallen===1?" Massaufnahme wurde":" Massaufnahmen wurden")
     +" nach der Freigabe geändert. Daran darf nicht weitergearbeitet werden, bis sie erneut freigegeben "
     +(z.verfallen===1?"ist":"sind")+".",
   knopf:g.projectId?{text:"📂 Projekt öffnen",attr:'data-werk-projekt="'+g.projectId+'"'}:null};
 if(!jetzt)return {k:"fertig",farbe:"gruen",rang:9,
   satz:"Nichts offen – in der Werkstatt ist für dieses Projekt gerade nichts zu tun.",knopf:null};
 // Sammelaktion direkt im Streifen (v3.13): der Satz nennt die Zahl, der
 // Knopf erledigt genau diese Zahl. Geschrieben wird ueber resvBulkStatus
 // aus js/50 - derselbe Weg wie im Projekt, kein zweiter.
 if(jetzt.k==="reservieren")return {k:"reservieren",farbe:"orange",rang:1,
   satz:"Material reservieren – "+z.offenRes+(z.offenRes===1?" Position ist":" Positionen sind")+" noch nicht reserviert.",
   knopf:g.projectId?{text:"📦 Alle reservieren ("+z.offenRes+")",
     attr:'data-werk-bulk="reserviert" data-werk-bulk-projekt="'+g.projectId+'"'}:null,
   knopf2:g.projectId?{text:"📂 Projekt öffnen",attr:'data-werk-projekt="'+g.projectId+'"'}:null};
 if(jetzt.k==="zuschneiden"){
  // v3.21: Der Satz nennt die STUECKE - das ist die Arbeit an der
  // Abkantbank, und die Listen dafuer stehen direkt darunter. Der Knopf
  // bucht die Materialpositionen der Reservierung; das ist etwas anderes
  // und wird deshalb auch anders benannt. Ein "Zuschnitt anzeigen"-Knopf
  // waere seit dem Umbau sinnlos: die Liste ist ohnehin schon da.
  const st=werkStueckStand(g);
  return {k:"zuschneiden",farbe:"orange",rang:2,
   satz:st.gesamt
     ?("Zuschneiden – "+st.erledigt+" von "+st.gesamt+" Stück geschnitten. Die Listen stehen darunter.")
     :("Zuschneiden – "+z.offenZu+(z.offenZu===1?" Materialposition ist":" Materialpositionen sind")
       +" noch nicht als zugeschnitten gebucht."),
   knopf:g.projectId?{text:"✓ Material als zugeschnitten buchen ("+z.offenZu+")",
     attr:'data-werk-bulk="zugeschnitten" data-werk-bulk-projekt="'+g.projectId+'"'}:null};
 }
 if(jetzt.k==="ruesten"){
  if(z.zuRuesten)return {k:"ruesten",farbe:"blau",rang:3,
    satz:"Rüsten – "+z.zuRuesten+(z.zuRuesten===1?" Massaufnahme ist":" Massaufnahmen sind")
      +" bereit. Unten je Massaufnahme bestätigen.",knopf:null};
  return {k:"einteilen",farbe:"orange",rang:3,
    satz:z.wartet+(z.wartet===1?" Massaufnahme ist":" Massaufnahmen sind")
      +" freigegeben, aber noch niemandem zugeteilt. Eingeteilt wird im Projekt.",
    knopf:g.projectId?{text:"📂 Projekt öffnen",attr:'data-werk-projekt="'+g.projectId+'"'}:null};
 }
 return {k:"montieren",farbe:"blau",rang:4,
   satz:"Montieren – "+z.zuMontieren+(z.zuMontieren===1?" Massaufnahme ist":" Massaufnahmen sind")
     +" gerüstet. Unten je Massaufnahme bestätigen.",knopf:null};
}
// Leiste und Streifen verwenden dieselben Klassen wie der Arbeitsstatus der
// Massaufnahme (v3.10) - keine zweite Bildsprache.
function werkLeisteHtml(g){
 const st=werkStand(g);
 if(!st.length)return "";
 const zeichen={fertig:"✓",jetzt:"▸",offen:"○",uebersprungen:"–"};
 return '<div class="mw-leiste" role="list">'+st.map(x=>
  '<div class="mw-station mw-st-'+x.zustand+'" role="listitem"'
  +(x.zustand==="uebersprungen"
    ?' title="Für dieses Projekt ist nichts reserviert – dazu sagen die Daten nichts."':"")
  +'>'
  +'<span class="mw-st-marke" aria-hidden="true">'+zeichen[x.zustand]+'</span>'
  +'<span class="mw-st-text">'+esc(x.text)+'</span></div>').join("")+'</div>';
}
function werkStreifenHtml(g){
 const n=werkNaechster(g);
 return '<div class="mw-streifen mw-streifen-'+n.farbe+'">'
  +'<div class="mw-streifen-text"><span class="mw-streifen-label">Nächster Schritt</span>'
  +'<span class="mw-streifen-satz">'+esc(n.satz)+'</span></div>'
  +(n.knopf?'<button type="button" class="mw-streifen-knopf" '+n.knopf.attr+'>'+esc(n.knopf.text)+'</button>':"")
  +(n.knopf2?'<button type="button" class="mw-streifen-knopf gray" '+n.knopf2.attr+'>'+esc(n.knopf2.text)+'</button>':"")
  +'</div>';
}
// Gehoert diese Zeile zum jetzigen Schritt? Dann steht sie oben und wird
// markiert - sonst muesste man in einer langen Liste suchen.
function werkZeileJetzt(a,k){
 if(a.freigabe_verfallen)return k==="verfallen";
 if(k==="ruesten")return a.workflow_status==="zu_ruesten";
 if(k==="montieren")return a.workflow_status==="zu_montieren";
 if(k==="einteilen")return a.workflow_status==="freigegeben";
 return false;
}

// ---- Anzeige --------------------------------------------------------------
function werkTyp(t){
 return (typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[t])||t||"Massaufnahme";
}
// v3.21: EINE Karte je Massaufnahme - Kopf, sofort sichtbare abhakbare
// Zuschnittliste, Aktionsknoepfe. Bis v3.20 waren das zwei getrennte
// Darstellungen: eine duenne Zeile oben und, zwei Klicks weiter unten in der
// Ruestgrundlage, die eigentliche Liste. An der Abkantbank zaehlt genau das
// Umgekehrte: die Stuecke zuerst, alles andere danach.
function werkAufnahmeHtml(a,jetztK){
 const verfallen=!!a.freigabe_verfallen;
 const dran=werkZeileJetzt(a,jetztK||"");
 const ichRuester=a.ruester_id===werkIch(), ichMonteur=a.monteur_id===werkIch();
 const ruester=a.ruester_id&&typeof profileName==="function"?profileName(a.ruester_id):"";
 const monteur=a.monteur_id&&typeof profileName==="function"?profileName(a.monteur_id):"";
 let aktion="";
 if(verfallen){
  // Auftrag Abschnitt 15: hier darf nichts unbemerkt weiterlaufen.
  aktion=`<span class="mw-badge mw-rot">Freigabe verfallen</span>`;
 }else if(a.workflow_status==="zu_ruesten"&&(ichRuester||(typeof isAdmin==="function"&&isAdmin()))){
  aktion=`<button type="button" data-aufgabe="ruesten" data-aufgabe-id="${a.id}">✓ Rüsten bestätigen</button>`;
 }else if(a.workflow_status==="zu_montieren"&&(ichMonteur||(typeof isAdmin==="function"&&isAdmin()))){
  aktion=`<button type="button" data-aufgabe="montieren" data-aufgabe-id="${a.id}">✓ Montage bestätigen</button>`;
 }
 const wer=[ruester?"Rüster: "+esc(ruester):"", monteur?"Monteur: "+esc(monteur):""]
   .filter(Boolean).join(" · ");
 // v3.09 Abschnitt 15: auf welcher freigegebenen Fassung liegt die Arbeit?
 // Nur wenn die Versionierung eingeschaltet ist - sonst gibt es keine.
 const nr=werkFassung(a.id);
 const fassung=(nr===null)?"":(verfallen
   ? ` · <span style="color:var(--red)">Fassung ${nr} nicht mehr aktuell</span>`
   : ` · Fassung ${nr}`);
 // Die Zuschnittliste steht SOFORT da - kein Aufklappen, kein zweiter Klick.
 // Der Plan ist der gespeicherte dieser einen Aufnahme, deshalb duerfen die
 // Positionsnummern abgehakt werden (erledigtFuer, siehe CLAUDE.md 120.4).
 // v3.22: Die Liste haengt NICHT mehr am Untermodul "zuschnitt". Der
 // Rollenplan gehoert zur Massaufnahme selbst - er wird dort gerechnet und
 // gespeichert, lange bevor es Projektmodule gab. Wer die Werkstatt an hat,
 // soll sehen, was zu schneiden ist. Nur das ABHAKEN haengt weiter am Modul
 // (zeAbhakenMoeglich); fehlt es, steht der Grund unter der Liste statt
 // stiller Leere - genau die Falle, die im Betrieb zugeschnappt ist.
 const plan=werkZuschnittPlan(a);
 const stand=werkZuStand(a);
 return `<div class="werk-karte${dran?" werk-karte-jetzt":""}${plan&&stand.fertig?" werk-zu-fertig":""}">
  <div class="werk-karte-kopf">
   <div class="werk-karte-info">
    <b>${esc(werkTyp(a.type))}</b>${a.title?" · "+esc(a.title):""}
    ${plan&&plan.material?`<span class="small" style="color:var(--muted)"> · ${esc(plan.material)}</span>`:""}
    <div class="small" style="color:var(--muted)">${(typeof mwBadge==="function")?mwBadge(a.workflow_status):esc(a.workflow_status)}${wer?" · "+wer:""}${fassung}</div>
    ${plan?`<div class="small werk-zu-text" data-werk-zu-stand="${a.id}">${werkStandText(a)}</div>`:""}
   </div>
   <div class="werk-karte-akt">
    ${aktion}
    ${plan?`<button type="button" class="gray" data-werk-druck-mess="${a.id}" title="Rüstliste dieser Massaufnahme drucken">🖨️</button>`:""}
    <button type="button" class="gray" data-werk-mess="${a.id}"${plan?' data-werk-zu="1"':""}>${plan?"✂️ Im Formular":"Öffnen"}</button>
   </div>
  </div>
  ${verfallen?'<div class="small" style="color:var(--red)">Diese Massaufnahme wurde nach der Freigabe geändert. Sie muss erneut freigegeben werden, bevor daran weitergearbeitet wird.</div>':""}
  ${plan?(stand.fertig&&!werkOffenKarte.has(a.id)
    ? `<button type="button" class="werk-zu-auf" data-werk-karte="${a.id}">▸ Zuschnittliste zeigen (alles geschnitten)</button>`
    : (typeof zuListeHtml==="function"?zuListeHtml(plan):"")):""}
  ${werkFertigLeisteHtml(a,plan,stand,verfallen)}
 </div>`;
}

// v3.23: Alles geschnitten - und der naechste Schritt ist genau dieser eine.
// Bis v3.22 stand "Ruesten bestaetigen" klein oben in der Kopfzeile, zwischen
// zwei anderen Knoepfen. Wer gerade das letzte Stueck abgehakt hat, soll den
// Schritt dort finden, wo er hinschaut: unter der fertigen Liste.
// KEIN Automatismus - gemeldet wird nur, was jemand ausdruecklich bestaetigt,
// und geschrieben wird ueber denselben Weg wie in der Kopfzeile
// (data-aufgabe -> aufgabeAusfuehren in js/45).
function werkFertigLeisteHtml(a,plan,stand,verfallen){
 if(!plan||verfallen||!stand||!stand.fertig)return "";
 if(a.workflow_status!=="zu_ruesten")return "";
 const darf=(a.ruester_id===werkIch())||(typeof isAdmin==="function"&&isAdmin());
 const satz=`Alle ${stand.gesamt} Stück sind geschnitten.`;
 if(!darf)return `<div class="werk-fertig werk-fertig-still">✓ ${esc(satz)}
  Bestätigen kann das ${esc(a.ruester_id&&typeof profileName==="function"
    ?profileName(a.ruester_id):"der eingeteilte Rüster")}.</div>`;
 return `<div class="werk-fertig">
  <span class="werk-fertig-satz">✓ ${esc(satz)} Als nächstes: das Rüsten bestätigen.</span>
  <button type="button" class="blue werk-fertig-knopf" data-aufgabe="ruesten" data-aufgabe-id="${a.id}">✓ Rüsten bestätigen</button>
 </div>`;
}
// Hat dieses Projekt ueberhaupt etwas zu ruesten? Nur dann gibt es eine
// Ruestliste zum Drucken - ein leeres Blatt waere kein Blatt.
function werkHatZuschnitt(g){
 return ((g&&g.aufnahmen)||[]).some(a=>!!werkZuschnittPlan(a));
}

// v3.20: Der gespeicherte Zuschnittplan EINER Massaufnahme, in der Form, die
// zuschnittHtml/zuListeHtml erwarten. Gerechnet wird nichts - genommen wird,
// was beim Speichern abgelegt wurde (dieselben zwei Funktionen, die auch der
// Ausdruck in js/16 verwendet). erledigtFuer sagt js/33, dass hier abgehakt
// werden darf: es ist genau eine Aufnahme mit ihren eigenen Stuecknummern.
function werkZuschnittPlan(m){
 if(typeof pmatPlanRoh!=="function"||typeof zuPlanAusGespeichert!=="function")return null;
 const r=pmatPlanRoh(m); if(!r)return null;
 const d=(m&&m.data)||{};
 const breite=(r.abwicklung!==undefined&&r.abwicklung!==null)?r.abwicklung
             :((d.abwicklung!==undefined&&d.abwicklung!==null)?d.abwicklung:null);
 const p=zuPlanAusGespeichert(r,breite,"Stück");
 if(!p||!(p.gruppen||[]).length)return null;
 p.erledigtFuer=m.id;
 p.material=(typeof pmatMaterialName==="function")?pmatMaterialName(d.material):"";
 return p;
}
// Eine Karte je Massaufnahme: Kopf mit Fortschritt, darunter die abhakbare
// Liste. Bewusst nur zuListeHtml() - Rollenvergleich, Belegung und das
// Reststuecke-Lager gehoeren ins Projekt, nicht an die Abkantbank.
// v3.21: Was jetzt insgesamt ansteht, ganz oben - einschliesslich der
// Zuschnitte, weil das an der Abkantbank die eigentliche Zahl ist. Eine
// Stelle, aus der das Zeichnen und das spaetere Nachfuehren lesen.
function werkJetztText(){
 const gruppen=werkGruppen();
 const WERK_SCHRITT_TEXT={verfallen:"erneut freigeben",reservieren:"reservieren",
   zuschneiden:"zuschneiden",einteilen:"einteilen",ruesten:"rüsten",montieren:"montieren"};
 const zaehlung={};
 gruppen.forEach(g=>{const k=werkNaechster(g).k; if(k!=="fertig")zaehlung[k]=(zaehlung[k]||0)+1});
 const zt=Object.keys(zaehlung).map(k=>zaehlung[k]+" × "+WERK_SCHRITT_TEXT[k]).join(" · ");
 const zu=(typeof zeStandListe==="function")?zeStandListe(werkZeilen||[]):null;
 // Ohne eingeschaltetes Abhaken sind keine Haken geladen - dann wird hier
 // keine Zahl behauptet (siehe werkStandText).
 const abhaken=(typeof zeAbhakenMoeglich!=="function")||zeAbhakenMoeglich();
 const zuText=(zu&&zu.gesamt&&abhaken)
   ?'<span class="werk-jetzt-zu">✂️ '+esc(zu.erledigt)+" von "+esc(zu.gesamt)+" Stück zugeschnitten</span>"
   :((zu&&zu.gesamt)?'<span class="werk-jetzt-zu">✂️ '+esc(zu.gesamt)+" Stück zuzuschneiden</span>":"");
 return (zt?"<b>Jetzt dran:</b> "+esc(zt)
   :"<b>Nichts offen</b> – in der Werkstatt wartet gerade kein Schritt.")+zuText;
}
// Nach jedem Abhaken nur die Zahlen nachziehen, nicht die ganze Werkstatt neu
// zeichnen - sonst spraenge die Seite unter dem Finger weg. Die Knoepfe selbst
// malt zeMarkierungAuffrischen() aus js/56.
function werkZuschnittStandAuffrischen(){
 const box=$("werkstattBody"); if(!box)return;
 // v3.21: Die Karten kommen aus werkZeilen - dort steht data seit dieser
 // Fassung mit drin. Frueher stand hier werkGrundlage.aufnahmen; das war
 // die Liste des aufgeklappten Projekts und traf die Karten gar nicht.
 const liste=werkZeilen||[];
 box.querySelectorAll("[data-werk-zu-stand]").forEach(el=>{
  const m=liste.find(x=>x&&Number(x.id)===Number(el.dataset.werkZuStand));
  if(m)el.innerHTML=werkStandText(m);
 });
 box.querySelectorAll("[data-werk-jetzt]").forEach(el=>{el.innerHTML=werkJetztText()});
 // Die Haken kommen erst nach dem Zeichnen aus der Datenbank. Ist eine Karte
 // dadurch fertig geworden, klappt ihre Liste zu - aber NUR, wenn niemand
 // gerade an ihr abhakt: sonst spraenge sie unter dem Finger weg.
 const zuklappen=(werkZeilen||[]).some(m=>{
  if(!m||werkOffenKarte.has(m.id))return false;
  if(!box.querySelector('[data-ze-meas="'+m.id+'"]'))return false;   // Liste schon zu
  return werkZuStand(m).fertig;
 });
 if(zuklappen)renderWerkstatt();
}
function werkZuStand(m){
 return (typeof zeStand==="function")?zeStand(m):{gesamt:0,erledigt:0,offen:0,veraltet:0,fertig:false};
}
// Der Stand als Text - EINE Stelle, damit das Zeichnen und das spaetere
// Nachfuehren nicht auseinanderlaufen koennen.
function werkStandText(m){
 const s=werkZuStand(m);
 if(!s.gesamt)return "keine Stücke";
 // v3.22: Ist das Abhaken ausgeschaltet, sind gar keine Haken geladen. Dann
 // waere "0 von 41 zugeschnitten" eine FALSCHE Aussage - es kann sehr wohl
 // abgehakt sein, die App weiss es hier nur nicht. Also nur die Stueckzahl.
 if(typeof zeAbhakenMoeglich==="function"&&!zeAbhakenMoeglich())
  return esc(s.gesamt)+(s.gesamt===1?" Stück":" Stück");
 return (s.fertig?"✓ ":"")+esc(s.erledigt)+" von "+esc(s.gesamt)+" zugeschnitten"
  +(s.veraltet?' · <span style="color:var(--red)">'+esc(s.veraltet)+" Haken passen nicht mehr zum Plan</span>":"");
}
// Material und Reservierungen - beim Ruesten die Nebensache, deshalb seit
// v3.21 in einem zugeklappten Bereich unter den Zuschnittkarten. Der
// Zuschnitt selbst steht oben in der Karte jeder Massaufnahme.
// Es wird nichts zweitgerechnet: pmatSammeln aus js/48, resvAbgeleitet und
// resvBadge aus js/50 - dieselben Funktionen wie im Projekt-Cockpit.
function werkGrundlageHtml(g){
 if(!werkGrundlage||werkGrundlage.projectId!==g.projectId)
  return '<div class="small" style="color:var(--muted)">Wird geladen …</div>';
 if(werkGrundlage.fehler)
  return `<div class="small" style="color:var(--red)">Material und Reservierungen konnten nicht geladen werden: ${esc(werkGrundlage.fehler)}</div>`;
 const liste=werkGrundlage.aufnahmen||[];
 let h="";

 if(typeof pmAktiv==="function"&&pmAktiv("material")&&typeof pmatSammeln==="function"){
  const gruppen=pmatSammeln(liste);
  h+='<div class="werk-block" data-werk-block="material"><div class="small werk-block-titel"><b>Material</b> – was das Projekt braucht</div>';
  h+=gruppen.length?('<div class="scroll"><table class="eb-table pmat-tab"><thead><tr>'
    +'<th>Material</th><th>Position</th><th>Menge</th></tr></thead><tbody>'
    +gruppen.map(gr=>gr.positionen.map(p=>`<tr><td>${esc(gr.material)}</td><td>${esc(p.bezeichnung)}</td>`
      +`<td class="pmat-zahl">${p.summe===null?esc(p.texte.join(" · ")||"-"):esc(pmatFormat(p.summe))}`
      +`${p.einheit?" "+esc(p.einheit):""}</td></tr>`).join("")).join("")
    +'</tbody></table></div>')
   :'<div class="small" style="color:var(--muted)">Noch kein gespeichertes Ausmass.</div>';
  h+="</div>";
 }

 if(typeof pmAktiv==="function"&&pmAktiv("reservierung")){
  const alle=werkReservierungen.filter(r=>r.project_id===g.projectId);
  // v3.20: An der Abkantbank zaehlt, was man aus dem Lager holt - Blech,
  // Halbfabrikate, Zuschnitte. Abgeleitete Masse (Abwicklung, Flaeche,
  // Stueckzahl) sind Rechenergebnisse und stehen hier nicht. Sie koennen
  // aus einer Uebernahme vor v3.18 noch in der Datenbank liegen; aufgeraeumt
  // werden sie im Projekt (Material & Zuschnitt), nicht hier.
  const res=(typeof resvAbgeleitet==="function")
    ?alle.filter(r=>!resvAbgeleitet(r,liste)):alle;
  const weg=alle.length-res.length;
  h+='<div class="werk-block" data-werk-block="reservieren"><div class="small werk-block-titel"><b>Reservierungen</b> – was für das Projekt zurückgelegt ist</div>';
  h+=res.length?('<div class="scroll"><table class="eb-table pmat-tab"><thead><tr>'
    +'<th>Material</th><th>Position</th><th>Menge</th><th>Status</th></tr></thead><tbody>'
    +res.map(r=>`<tr><td>${esc(r.material_name||"Ohne Material")}</td>`
      +`<td>${esc(r.bezeichnung||"")}</td>`
      +`<td class="pmat-zahl">${esc(r.menge===null||r.menge===undefined?"":String(r.menge))}${r.einheit?" "+esc(r.einheit):""}</td>`
      +`<td>${(typeof resvBadge==="function")?resvBadge(r.status):esc(r.status)}</td></tr>`).join("")
    +'</tbody></table></div>')
   :'<div class="small" style="color:var(--muted)">Für dieses Projekt ist noch nichts reserviert.</div>';
  if(weg)h+='<div class="small" style="color:var(--muted);margin-top:4px">'+esc(weg)
    +' abgeleitete '+(weg===1?"Zeile":"Zeilen")+' (Abwicklung, Fläche, Stückzahl) '
    +(weg===1?"ist":"sind")+' hier weggelassen – daraus holt niemand etwas aus dem Lager. '
    +'Aufräumen lassen sie sich im Projekt unter „Material &amp; Zuschnitt“.</div>';
  const reste=(typeof reststuecke!=="undefined"&&Array.isArray(reststuecke))
    ?reststuecke.filter(r=>r.reserviert_fuer_project_id===g.projectId&&!r.verbraucht):[];
  h+=reste.length
    ?'<div class="small" style="margin-top:4px">Reservierte Reststücke: '
      +reste.map(r=>esc(Math.round(Number(r.laenge_mm))+" × "+Math.round(Number(r.breite_mm))+" mm"
        +(r.material_name?" ("+r.material_name+")":""))).join(" · ")+"</div>"
    :'<div class="small" style="color:var(--muted);margin-top:4px">Kein Reststück für dieses Projekt reserviert.</div>';
  h+="</div>";
 }
 return h||'<div class="small" style="color:var(--muted)">Dafür sind die Materialübersicht oder die Reservierung nötig – beide sind ausgeschaltet.</div>';
}

function renderWerkstatt(){
 const box=$("werkstattBody");
 if(!box)return 0;
 if(!werkAktiv()){box.innerHTML="";return 0}
 if(werkFehler){
  box.innerHTML=`<div class="small" style="color:var(--red)">Die Werkstattliste konnte nicht geladen werden: ${esc(werkFehler)}</div>`;
  return 0;
 }
 const gruppen=werkGruppen();
 const zaehler=$("werkstattCount");
 if(zaehler)zaehler.textContent=String(werkZeilen.filter(werkPasst).length);
 const chips=[["alle","Alle"],["ruesten","Zu rüsten"],["montieren","Zu montieren"],["meine","Nur meine"]]
  .map(([k,t])=>`<button type="button" class="status-chip${werkFilter===k?" aktiv":""}" data-werk-filter="${k}">${esc(t)}</button>`).join("");
 // v3.12: Was jetzt insgesamt ansteht - der Einstieg in den roten Faden.
 // v3.21: aus werkJetztText(), damit das Nachfuehren nach einem Haken
 // dieselbe Zeile schreibt wie das Zeichnen.
 const schritte=gruppen.map(g=>({g,n:werkNaechster(g)}));
 let h=`<div class="werk-jetzt" data-werk-jetzt="1">${werkJetztText()}</div>`
  +`<div class="status-filter">${chips}</div>`;
 if(!gruppen.length){
  h+=`<div class="small" style="color:var(--muted)">${werkFilter==="alle"
    ?"In der Werkstatt liegt gerade nichts an. Hier erscheint, was freigegeben und zum Rüsten oder Montieren eingeteilt ist."
    :"Nichts, das zu diesem Filter passt."}</div>`;
  box.innerHTML=h; return 0;
 }
 // Der roteste Faden ueberhaupt: was zuerst drankommt, steht oben.
 schritte.sort((a,b)=>(a.n.rang-b.n.rang)||a.g.titel.localeCompare(b.g.titel,"de"));
 h+=schritte.map(({g,n})=>{
  const offen=werkOffen===(g.projectId||0);
  const zahl=[g.zuRuesten?g.zuRuesten+" zu rüsten":"",g.zuMontieren?g.zuMontieren+" zu montieren":""]
    .filter(Boolean).join(" · ");
  // v3.21: Die Karten mit ihren abhakbaren Zuschnittlisten stehen SOFORT da.
  // Material und Reservierungen sind beim Ruesten die Nebensache und liegen
  // darunter in einem zugeklappten Bereich, der erst beim Oeffnen laedt.
  return `<div class="card werk-projekt">
   <div class="werk-kopf">
    <div class="werk-kopf-titel"><b>${esc(g.titel)}</b>
     ${g.unter?`<div class="small" style="color:var(--muted)">${esc(g.unter)}</div>`:""}
     ${zahl?`<div class="small">${esc(zahl)}</div>`:""}</div>
    <div class="werk-kopf-akt">
     ${werkHatZuschnitt(g)?`<button type="button" class="gray" data-werk-druck="${g.projectId||0}">🖨️ Rüstliste</button>`:""}
     ${g.projectId?`<button type="button" class="gray" data-werk-projekt="${g.projectId}">📂 Projekt</button>`:""}
    </div>
   </div>
   ${werkStreifenHtml(g)}
   ${werkLeisteHtml(g)}
   ${g.aufnahmen.slice().sort((x,y)=>(werkZeileJetzt(y,n.k)?1:0)-(werkZeileJetzt(x,n.k)?1:0))
      .map(a=>werkAufnahmeHtml(a,n.k)).join("")}
   ${(werkModulAn("material")||werkModulAn("reservierung"))?`<div class="werk-mehr">
    <button type="button" class="werk-mehr-knopf" data-werk-auf="${g.projectId||0}" aria-expanded="${offen?"true":"false"}">
     <span class="werk-mehr-pfeil">${offen?"▾":"▸"}</span> Material und Reservierungen${offen?"":" ansehen"}</button>
    ${offen?`<div class="werk-grundlage">${werkGrundlageHtml(g)}</div>`:""}
   </div>`:""}
  </div>`;
 }).join("");
 box.innerHTML=h;
 return gruppen.length;
}

async function werkstattNeuLaden(){
 if(!werkAktiv())return;
 const lauf=++werkLauf;
 await werkLaden();
 if(lauf!==werkLauf)return;
 // Ein aufgeklapptes Projekt behaelt seine Grundlage - sie wird nur dann
 // neu geholt, wenn es weiterhin in der Liste steht.
 if(werkOffen&&!werkZeilen.some(z=>(z.project_id||0)===werkOffen)){werkOffen=null;werkGrundlage=null}
 renderWerkstatt();
}
async function werkstattOeffnen(){
 if(!werkAktiv())return;
 // Bewusst NICHT ueber goToStart(): das laedt die Aufgabenzentrale neu und
 // wuerde vier zusaetzliche Abfragen ausloesen, die hier niemand braucht.
 // Gleiches Muster wie auOeffnen() in js/46.
 const m=$("werkstattModal");
 if(m)m.hidden=false;
 werkOffen=null; werkGrundlage=null; werkFilter=werkFilterGemerkt();
 // Jede neue Sitzung an der Abkantbank faengt frisch an: fertige Karten sind
 // wieder zugeklappt, bis jemand sie ausdruecklich oeffnet.
 werkOffenKarte.clear();
 const box=$("werkstattBody");
 if(box)box.innerHTML='<div class="small">Wird geladen …</div>';
 await werkstattNeuLaden();
}
function werkstattKnopfAktualisieren(){
 const k=$("navWerkstatt");
 if(k)k.hidden=!werkAktiv();
}

// Hebt den Block des jetzigen Schritts kurz hervor und scrollt ihn ins Bild.
function werkBlockAnsteuern(projectId){
 const g=werkGruppen().find(x=>(x.projectId||0)===projectId);
 if(!g)return;
 // v3.21: Der Zuschnitt steht nicht mehr in diesem Bereich, sondern oben in
 // den Karten. Angesteuert wird deshalb nur noch, was hier wirklich liegt.
 const k=werkNaechster(g).k;
 const el=document.querySelector('[data-werk-block="'+(k==="zuschneiden"?"reservieren":k)+'"]');
 if(!el)return;
 el.classList.add("werk-block-dran");
 try{el.scrollIntoView({block:"center",behavior:"smooth"})}catch(e){}
 setTimeout(()=>{try{el.classList.remove("werk-block-dran")}catch(e){}},2500);
}

// ---- Bedienung ------------------------------------------------------------
document.addEventListener("click",async e=>{
 if(!e.target||!e.target.closest)return;

 const start=e.target.closest("#navWerkstatt");
 if(start){werkstattOeffnen();return}

 const filter=e.target.closest("[data-werk-filter]");
 if(filter){werkFilter=filter.dataset.werkFilter;werkFilterMerken(werkFilter);renderWerkstatt();return}

 // Eine fertige Karte wieder aufklappen (v3.21).
 const karte=e.target.closest("[data-werk-karte]");
 if(karte){werkOffenKarte.add(Number(karte.dataset.werkKarte));renderWerkstatt();return}

 // v3.23: Ruestliste drucken - Projekt oder einzelne Massaufnahme.
 // Gedruckt wird ueber js/58, das dafuer denselben Kopf, dasselbe
 // Stylesheet und denselben Fensterweg verwendet wie jedes andere PDF.
 const druck=e.target.closest("[data-werk-druck]");
 if(druck){
  const id=Number(druck.dataset.werkDruck)||null;
  const g=werkGruppen().find(x=>(x.projectId||0)===(id||0));
  if(!g||typeof ruestlisteProjekt!=="function")return;
  druck.disabled=true;
  try{ await ruestlisteProjekt(id,g.aufnahmen) }finally{ druck.disabled=false }
  return;
 }
 const druckM=e.target.closest("[data-werk-druck-mess]");
 if(druckM){
  const id=Number(druckM.dataset.werkDruckMess);
  const m=(werkZeilen||[]).find(x=>Number(x.id)===id);
  if(!m||typeof ruestlisteMassaufnahme!=="function")return;
  druckM.disabled=true;
  try{ await ruestlisteMassaufnahme(m) }finally{ druckM.disabled=false }
  return;
 }

 const auf=e.target.closest("[data-werk-auf]");
 if(auf){
  const id=Number(auf.dataset.werkAuf);
  if(werkOffen===id){werkOffen=null;werkGrundlage=null;renderWerkstatt();return}
  werkOffen=id; werkGrundlage=null; renderWerkstatt();
  if(id){await werkGrundlageLaden(id); if(werkOffen===id)renderWerkstatt()}
  else{werkGrundlage={projectId:0,aufnahmen:[],fehler:null};renderWerkstatt()}
  // v3.12: Der Block, der zum jetzigen Schritt gehoert, wird angesteuert -
  // sonst muesste man in der Ruestgrundlage suchen, wo man gerade steht.
  werkBlockAnsteuern(id);
  return;
 }

 // Sammelaktion aus dem Streifen (v3.13). Der Schreibweg ist ausdruecklich
 // resvBulkStatus aus js/50 - dieselbe Funktion wie im Projekt. Betroffen
 // sind nur die Zeilen DIESES Projekts, die noch dahinter stehen.
 const bulk=e.target.closest("[data-werk-bulk]");
 if(bulk){
  const status=bulk.dataset.werkBulk;
  const pid=Number(bulk.dataset.werkBulkProjekt);
  if(typeof resvBulkStatus!=="function"||typeof resvRang!=="function")return;
  const ziel=resvRang(status);
  const treffer=werkReservierungen.filter(r=>r.project_id===pid&&resvRang(r.status)<ziel);
  if(!treffer.length)return;
  const name=(typeof resvStatusName==="function")?resvStatusName(status):status;
  if(!confirm(treffer.length+" Position"+(treffer.length===1?"":"en")+" dieses Projekts auf „"+name+"\" setzen?\n\n"
    +"Positionen, die schon weiter sind, bleiben unberührt."))return;
  bulk.disabled=true;
  const erg=await resvBulkStatus(treffer.map(r=>r.id),status);
  if(erg&&erg.offline)return;
  if(erg&&erg.fehler){alert(erg.fehler);bulk.disabled=false;return}
  // Die Werkstatt fuehrt eine eigene Liste - sie wird frisch geladen, statt
  // den Stand zu erraten.
  await werkstattNeuLaden();
  return;
 }

 const pro=e.target.closest("[data-werk-projekt]");
 if(pro){
  const id=Number(pro.dataset.werkProjekt);
  if(typeof openProjectCockpit==="function"){
   const m=$("werkstattModal"); if(m)m.hidden=true;
   openProjectCockpit(id);
  }
  return;
 }

 const mess=e.target.closest("[data-werk-mess]");
 if(mess){
  const id=Number(mess.dataset.werkMess);
  const {data,error}=await sb.from("measurements").select("*").eq("id",id).maybeSingle();
  if(error||!data){alert("Diese Massaufnahme ist nicht mehr verfügbar.");werkstattNeuLaden();return}
  if(typeof measEditReturnTo!=="undefined")measEditReturnTo="werkstatt";
  const m=$("werkstattModal"); if(m)m.hidden=true;
  if(typeof openMeasurement==="function")openMeasurement(data);
  // v3.20: Kommt der Klick aus dem Zuschnitt, direkt in dessen Register -
  // dieselbe Sprungtabelle wie auf der Seite "Material & Zuschnitt".
  if(mess.dataset.werkZu&&typeof mzZuschnittRegister==="function"){
   const r=mzZuschnittRegister(data.type);
   if(r){try{r.setzen(r.nr)}catch(x){console.error("Zuschnitt-Register",x)}}
   if(typeof zeNachziehen==="function")zeNachziehen();
  }
  return;
 }
});

if($("werkstattAktualisieren"))$("werkstattAktualisieren").onclick=()=>werkstattNeuLaden();
if($("closeWerkstatt"))$("closeWerkstatt").onclick=()=>{$("werkstattModal").hidden=true;$("startScreen").hidden=false};
if($("startFromWerkstatt"))$("startFromWerkstatt").onclick=()=>{if(typeof goToStart==="function")goToStart()};
