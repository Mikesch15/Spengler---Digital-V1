// v3.08 Firmenadmin-Uebersicht ueber ALLE Massaufnahmen der eigenen Firma
// ---------------------------------------------------------------------------
// Der Firmenadministrator sieht hier jede Massaufnahme seiner Firma mit ihrer
// Zuordnung (Projekt/Adresse, Ersteller, Rüster, Monteur) und ihrem Status.
//
// Was hier NICHT passiert:
//  - kein zweites Aufgaben-, Mitarbeiter- oder Rollensystem: die Namen kommen
//    aus dem bereits geladenen, RLS-gefilterten allProfiles (profileName),
//    die Status-Beschriftung aus js/44-workflow.js (mwBadge/MW_STATUS), die
//    Adresse aus der zentralen eintragAdresse()/projektTitel()-Logik.
//  - kein Statuswechsel: der laeuft weiterhin ausschliesslich ueber die
//    SECURITY DEFINER-Funktionen aus v3.05, erreichbar in der Massaufnahme.
//  - keine eigene Firmenpruefung im Client: die Liste kommt aus
//    admin_alle_massaufnahmen(), die serverseitig prueft (role='admin' UND
//    company_id = my_company_id(), also auch die Trial-/Statussperre).
//
// Besonderheit "ohne Projekt": tenant_boundary_measurements verlangt ein
// Projekt. Eine Massaufnahme ohne project_id ist deshalb ueber die normale
// Abfrage fuer niemanden sichtbar und laesst sich auch nicht mehr aendern
// (die Policy prueft beim UPDATE auch die alte Zeile). Genau solche
// Datensaetze existieren im Betrieb. Sie erscheinen hier - ihre Firma ist
// ueber den Ersteller bestimmt - und lassen sich mit
// admin_massaufnahme_projekt_zuweisen() einem Projekt zuordnen; danach sind
// sie ganz normale Massaufnahmen.

const AU_LIMIT=1000;                 // Obergrenze der Serverfunktion
let auZeilen=[];                     // zuletzt geladener Stand
let auLauf=0;
let auFilter={suche:"",status:"",projekt:"",typ:"",person:""};
let auZuweisenId=null;

// Sichtbar nur fuer einen Firmenadministrator. Reine Fuehrung - die Funktion
// weist einen Nicht-Admin ohnehin ab.
function auDarf(){return typeof isAdmin==="function"&&isAdmin()}

function auStatusText(s){
 return (typeof mwStatusText==="function")?mwStatusText(s):(s||"");
}
function auBadge(z){
 if(z.freigabe_verfallen)return `<span class="mw-badge mw-rot">⚠️ Freigabe verfallen</span>`;
 return (typeof mwBadge==="function")?mwBadge(z.workflow_status):esc(z.workflow_status||"");
}
function auPerson(id){
 if(!id)return "";
 const n=(typeof profileName==="function")?profileName(id):"";
 return n||"Unbekannter Benutzer";
}
function auWann(iso){
 if(!iso)return "";
 return (typeof formatDatumZeit==="function")?formatDatumZeit(iso):String(iso);
}
// Ein reines Datumsfeld im Schweizer Format. formatDatumZeit() waere hier
// falsch (es haengt eine Uhrzeit an, die measurements.date gar nicht hat).
function auDatum(d){
 if(!d)return "";
 const t=String(d).slice(0,10).split("-");
 if(t.length!==3)return String(d);
 return `${Number(t[2])}.${Number(t[1])}.${t[0]}`;
}
function auTyp(t){
 return (typeof MEAS_TYPE_LABELS!=="undefined"&&MEAS_TYPE_LABELS[t])||t||"";
}
// Die Zeile traegt ihre Projektangaben selbst mit (die Serverfunktion joint
// projects) - allProjects wird dafuer nicht gebraucht und waere fuer eine
// projektlose Aufnahme ohnehin leer.
function auAdresse(z){
 const a=String(z.projekt_adresse||"").trim();
 const n=String(z.projekt_name||"").trim();
 return a||n||"Ohne Adresse";
}

// --- Laden ------------------------------------------------------------------

async function auLaden(){
 const {data,error}=await sb.rpc("admin_alle_massaufnahmen",{p_limit:AU_LIMIT});
 if(error){console.error("admin_alle_massaufnahmen",error);return {fehler:error.message||"Unbekannter Fehler"}}
 return {zeilen:Array.isArray(data)?data:[]};
}

// --- Filter -----------------------------------------------------------------

function auPasst(z){
 const f=auFilter;
 if(f.status){
  if(f.status==="verfallen"){ if(!z.freigabe_verfallen)return false }
  else if(f.status==="ohne_projekt"){ if(z.project_id)return false }
  else if((z.workflow_status||"")!==f.status)return false;
 }
 if(f.projekt){
  if(f.projekt==="ohne"){ if(z.project_id)return false }
  else if(String(z.project_id||"")!==f.projekt)return false;
 }
 if(f.typ&&(z.type||"")!==f.typ)return false;
 if(f.person){
  const p=f.person;
  if(z.created_by!==p&&z.ruester_id!==p&&z.monteur_id!==p)return false;
 }
 const q=String(f.suche||"").trim().toLowerCase();
 if(q){
  const heu=[z.projekt_adresse,z.projekt_name,z.title,auTyp(z.type),
             auPerson(z.created_by),auPerson(z.ruester_id),auPerson(z.monteur_id)]
   .map(x=>String(x||"").toLowerCase()).join(" ");
  if(heu.indexOf(q)<0)return false;
 }
 return true;
}

function auGefiltert(){return auZeilen.filter(auPasst)}

// --- Anzeige ----------------------------------------------------------------

function auZaehlText(gezeigt){
 const n=auZeilen.length;
 const ohne=auZeilen.filter(z=>!z.project_id).length;
 const teile=[`${n} ${n===1?"Massaufnahme":"Massaufnahmen"}`];
 if(ohne)teile.push(`<span class="au-warn">${ohne} ohne Projekt</span>`);
 if(gezeigt!==n)teile.push(`${gezeigt} angezeigt`);
 return teile.join(" · ");
}

function auFilterFelderFuellen(){
 // Projekte und Personen NUR aus dem geladenen Stand - kein zweiter Katalog.
 const projekte=[];
 const gesehen={};
 auZeilen.forEach(z=>{
  if(!z.project_id||gesehen[z.project_id])return;
  gesehen[z.project_id]=1;
  projekte.push({id:z.project_id,text:auAdresse(z)});
 });
 projekte.sort((a,b)=>String(a.text).localeCompare(String(b.text),"de"));
 const ohne=auZeilen.some(z=>!z.project_id);
 const pSel=$("auFilterProjekt");
 if(pSel){
  const alt=pSel.value;
  pSel.innerHTML=`<option value="">Alle Projekte</option>`
   +(ohne?`<option value="ohne">– ohne Projekt –</option>`:"")
   +projekte.map(p=>`<option value="${esc(p.id)}">${esc(p.text)}</option>`).join("");
  pSel.value=alt; if(pSel.value!==alt)pSel.value="";
 }
 const typen=[];const tg={};
 auZeilen.forEach(z=>{if(z.type&&!tg[z.type]){tg[z.type]=1;typen.push(z.type)}});
 typen.sort((a,b)=>String(auTyp(a)).localeCompare(String(auTyp(b)),"de"));
 const tSel=$("auFilterTyp");
 if(tSel){
  const alt=tSel.value;
  tSel.innerHTML=`<option value="">Alle Arten</option>`
   +typen.map(t=>`<option value="${esc(t)}">${esc(auTyp(t))}</option>`).join("");
  tSel.value=alt; if(tSel.value!==alt)tSel.value="";
 }
 const personen=[];const pg={};
 auZeilen.forEach(z=>[z.created_by,z.ruester_id,z.monteur_id].forEach(id=>{
  if(id&&!pg[id]){pg[id]=1;personen.push(id)}
 }));
 personen.sort((a,b)=>String(auPerson(a)).localeCompare(String(auPerson(b)),"de"));
 const perSel=$("auFilterPerson");
 if(perSel){
  const alt=perSel.value;
  perSel.innerHTML=`<option value="">Alle Personen</option>`
   +personen.map(id=>`<option value="${esc(id)}">${esc(auPerson(id))}</option>`).join("");
  perSel.value=alt; if(perSel.value!==alt)perSel.value="";
 }
}

function auStatusChips(){
 const box=$("auStatusFilter"); if(!box)return;
 const vorhanden=[];const g={};
 auZeilen.forEach(z=>{const s=z.workflow_status||"in_bearbeitung";if(!g[s]){g[s]=1;vorhanden.push(s)}});
 const reihen=(typeof MW_REIHENFOLGE!=="undefined")?MW_REIHENFOLGE:[];
 vorhanden.sort((a,b)=>reihen.indexOf(a)-reihen.indexOf(b));
 const verfallen=auZeilen.some(z=>z.freigabe_verfallen);
 const knoepfe=[`<button type="button" data-au-status="" class="${auFilter.status===""?"aktiv":""}">Alle</button>`];
 if(verfallen)knoepfe.push(`<button type="button" data-au-status="verfallen" class="${auFilter.status==="verfallen"?"aktiv":""}">⚠️ Freigabe verfallen</button>`);
 vorhanden.forEach(s=>knoepfe.push(
  `<button type="button" data-au-status="${esc(s)}" class="${auFilter.status===s?"aktiv":""}">${esc(auStatusText(s))}</button>`));
 box.innerHTML=knoepfe.join("");
 box.hidden=vorhanden.length<2&&!verfallen;
}

function auRender(){
 const liste=$("auListe"); if(!liste)return;
 const gezeigt=auGefiltert();
 const z=$("auZaehler"); if(z)z.innerHTML=auZaehlText(gezeigt.length);
 auStatusChips();
 if(!auZeilen.length){
  liste.innerHTML='<div class="empty">Noch keine Massaufnahmen in dieser Firma.</div>';
  return;
 }
 if(!gezeigt.length){
  liste.innerHTML='<div class="empty">Keine Massaufnahme passt zu Suche und Filter.</div>';
  return;
 }
 liste.innerHTML=gezeigt.map(r=>{
  const ohneProjekt=!r.project_id;
  const zusatz=[auTyp(r.type),String(r.title||"").trim(),
    auDatum(r.datum)]
   .filter(Boolean).join(" · ");
  const rollen=[
   `Aufgenommen: ${auPerson(r.created_by)||"–"}`,
   r.ruester_id?`Rüsten: ${auPerson(r.ruester_id)}`:"",
   r.monteur_id?`Montage: ${auPerson(r.monteur_id)}`:""
  ].filter(Boolean).join(" · ");
  const geaendert=r.updated_at?`Zuletzt geändert ${auWann(r.updated_at)}`:"";
  return `<div class="au-zeile${ohneProjekt?" au-ohne-projekt":""}">
   <div class="au-kopf">
    ${ohneProjekt?`<span class="mw-badge mw-rot">⚠️ Ohne Projekt</span>`:auBadge(r)}
    ${(!ohneProjekt&&r.projekt_archiviert)?`<span class="mw-badge mw-grau">🗄 Archiviert</span>`:""}
   </div>
   <div class="au-titel">${esc(ohneProjekt?(String(r.title||"").trim()||auTyp(r.type)):auAdresse(r))}</div>
   ${zusatz?`<div class="au-zusatz">${esc(zusatz)}</div>`:""}
   ${(!ohneProjekt&&r.projekt_name)?`<div class="au-zusatz">Projekt: ${esc(r.projekt_name)}</div>`:""}
   <div class="au-zusatz">${esc(rollen)}</div>
   ${geaendert?`<div class="au-zusatz au-zeit">${esc(geaendert)}</div>`:""}
   <div class="au-knoepfe">
    ${ohneProjekt
      ? `<button type="button" class="blue" data-au-zuweisen="${esc(r.id)}">📁 Projekt zuordnen</button>`
      : `<button type="button" class="blue" data-au-oeffnen="${esc(r.id)}">Massaufnahme öffnen</button>`}
   </div>
  </div>`;
 }).join("");
}

// --- Oeffnen / Aktualisieren ------------------------------------------------

async function auNeuLaden(){
 const liste=$("auListe"); if(!liste)return;
 if(typeof offlineIstOffline==="function"&&offlineIstOffline()){
  liste.innerHTML='<div class="empty">Ohne Internetverbindung kann diese Übersicht nicht geladen werden.</div>';
  return;
 }
 const lauf=++auLauf;
 liste.innerHTML='<div class="empty">Wird geladen …</div>';
 const erg=await auLaden();
 if(lauf!==auLauf)return;
 if(erg.fehler){
  liste.innerHTML=`<div class="empty">Die Übersicht konnte nicht geladen werden: ${esc(erg.fehler)}</div>`;
  return;
 }
 auZeilen=erg.zeilen;
 auFilterFelderFuellen();
 auRender();
 const hinweis=$("auGrenze");
 if(hinweis)hinweis.hidden=auZeilen.length<AU_LIMIT;
}

async function auOeffnen(){
 if(!auDarf())return;
 auFilter={suche:"",status:"",projekt:"",typ:"",person:""};
 if($("auSuche"))$("auSuche").value="";
 ["auFilterProjekt","auFilterTyp","auFilterPerson"].forEach(id=>{if($(id))$(id).value=""});
 $("adminMeasModal").hidden=false;
 await auNeuLaden();
}

// Eine Massaufnahme MIT Projekt wird ganz normal geladen - RLS entscheidet,
// ob sie herausgegeben wird.
async function auOeffneMassaufnahme(id){
 const {data,error}=await sb.from("measurements").select("*").eq("id",Number(id)).maybeSingle();
 if(error||!data){alert("Diese Massaufnahme ist nicht mehr verfügbar.");auNeuLaden();return}
 measEditReturnTo="adminMeasModal";
 $("adminMeasModal").hidden=true;
 openMeasurement(data);
}

// --- Projekt zuordnen -------------------------------------------------------

function auZuweisenOeffnen(id){
 const r=auZeilen.find(x=>String(x.id)===String(id));
 if(!r)return;
 auZuweisenId=r.id;
 const aktiv=(Array.isArray(allProjects)?allProjects:[]).filter(p=>!p.archived);
 const sel=$("auZuweisenProjekt");
 sel.innerHTML=aktiv.length
  ? `<option value="">– Projekt wählen –</option>`+aktiv
      .slice().sort((a,b)=>String(projektTitel(a)).localeCompare(String(projektTitel(b)),"de"))
      .map(p=>`<option value="${esc(p.id)}">${esc(projektTitel(p))}</option>`).join("")
  : `<option value="">Kein aktives Projekt vorhanden</option>`;
 $("auZuweisenTitel").textContent=String(r.title||"").trim()||auTyp(r.type)||"Massaufnahme";
 $("auZuweisenFehler").hidden=true;
 $("adminMeasZuweisenModal").hidden=false;
}

async function auZuweisenSpeichern(){
 if(!auZuweisenId)return;
 const pid=$("auZuweisenProjekt").value;
 const f=$("auZuweisenFehler");
 if(!pid){f.textContent="Bitte ein Projekt wählen.";f.hidden=false;return}
 if(typeof offlineSperrtSpeichern==="function"&&offlineSperrtSpeichern("Das Zuordnen"))return;
 const {error}=await sb.rpc("admin_massaufnahme_projekt_zuweisen",
   {p_id:Number(auZuweisenId),p_project_id:Number(pid)});
 if(error){
  console.error("admin_massaufnahme_projekt_zuweisen",error);
  f.textContent=error.message||"Die Zuordnung konnte nicht gespeichert werden.";
  f.hidden=false;
  return;
 }
 $("adminMeasZuweisenModal").hidden=true;
 auZuweisenId=null;
 await auNeuLaden();
}

// --- Bedienung --------------------------------------------------------------

document.addEventListener("click",e=>{
 const t=e.target; if(!t||!t.closest)return;
 const s=t.closest("[data-au-status]");
 if(s){auFilter.status=s.dataset.auStatus||"";auRender();return}
 const o=t.closest("[data-au-oeffnen]");
 if(o){auOeffneMassaufnahme(o.dataset.auOeffnen);return}
 const z=t.closest("[data-au-zuweisen]");
 if(z){auZuweisenOeffnen(z.dataset.auZuweisen);return}
});

if($("auSuche")){
 // Nur filtern, nicht neu laden - die Liste liegt bereits im Speicher.
 $("auSuche").addEventListener("input",()=>{auFilter.suche=$("auSuche").value;auRender()});
}
["Projekt","Typ","Person"].forEach(k=>{
 const el=$("auFilter"+k);
 if(el)el.addEventListener("change",()=>{auFilter[k.toLowerCase()]=el.value;auRender()});
});
if($("auAktualisieren"))$("auAktualisieren").onclick=auNeuLaden;
if($("auZuweisenSpeichern"))$("auZuweisenSpeichern").onclick=auZuweisenSpeichern;
if($("auZuweisenAbbrechen"))$("auZuweisenAbbrechen").onclick=()=>{$("adminMeasZuweisenModal").hidden=true;auZuweisenId=null};
if($("navAdminMeas"))$("navAdminMeas").onclick=auOeffnen;
if($("closeAdminMeas"))$("closeAdminMeas").onclick=()=>{$("adminMeasModal").hidden=true};
if($("startFromAdminMeas"))$("startFromAdminMeas").onclick=()=>{goToStart()};

// Sichtbarkeit des Startknopfes. Wird nach dem Anmelden und beim Betreten der
// Startseite aufgefrischt (js/03-login.js).
function auKnopfAktualisieren(){
 const b=$("navAdminMeas"); if(!b)return;
 b.hidden=!auDarf();
}
