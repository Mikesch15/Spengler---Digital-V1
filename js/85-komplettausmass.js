"use strict";
// ===========================================================================
// Komplettausmass (v3.341) - Übersicht aus den Massaufnahmen eines Projekts
// ===========================================================================
// WAS DAS IST: eine rein lesende Zusammenstellung der Ausmasszeilen (data.ausmass), die jede Massaufnahme beim Speichern selbst
// mitbringt (pos, bezeichnung, menge, einheit, teil, herkunft). Nichts wird gespeichert, gebucht, reserviert oder abgehakt.
// WAS DAS NICHT IST: keine Offertmenge, kein Zuschnitt-/Rollenplan, keine Materialreservierung, kein Regierapport, keine verrechnete
// Leistung, keine Rechnung, kein vom Kunden bestätigtes Ausmass (die Tabelle "ausmass" bleibt unberührt).
// REGELN: Summen nur je Bezeichnung UND Einheit (m², m, Stk, h). Mm-Zeilen sind Masse (Zuschnittlängen u. ä.), keine Mengen - sie werden
// nicht summiert. Fehlende/ungültige Mengen werden nie als 0 gezählt, sondern als "zu prüfen" gelistet und stehen nicht in Summen.
// Gleich benannte Positionen aus mehreren Massaufnahmen bleiben einzeln rückverfolgbar; gleicher Typ + gleicher Titel gilt als
// "mögliche Dublette" und wird markiert, aber weder gelöscht noch stillschweigend zusammengeführt.
// STATUS: nur workflow_status der Massaufnahme (js/44). Ein abgehaktes Zuschnittstück ist kein Montagestand.
// Kein Prozentwert "Projekt fertig": dafür gibt es keine belastbare Definition.

// ---- rein (testbar) --------------------------------------------------------
const KA_EINHEITEN=["m²","m","Stk","h"];
const KA_EINHEIT_TITEL={"m²":"Fläche (m²)","m":"Länge (m)","Stk":"Stück (Stk)","h":"Stunden (h)"};
const KA_STATUS=["in_bearbeitung","freigegeben","zu_ruesten","geruestet","zu_montieren","montiert","abgeschlossen"];
function kaEinheit(e){
 const s=String(e===null||e===undefined?"":e).trim();
 if(!s)return "";
 const l=s.toLowerCase().replace(/\.$/,"");
 if(l==="m²"||l==="m2")return "m²";
 if(l==="m")return "m";
 if(l==="stk"||l==="st"||l==="stück"||l==="stueck")return "Stk";
 if(l==="h"||l==="std")return "h";
 if(l==="mm")return "mm";
 return s;
}
// {ok:true,wert} oder {ok:false,art:"leer"|"masspaar"|"unlesbar"|"negativ"}
function kaZahl(v){
 if(v===null||v===undefined)return {ok:false,art:"leer"};
 if(typeof v==="number")return Number.isFinite(v)?(v<0?{ok:false,art:"negativ"}:{ok:true,wert:v}):{ok:false,art:"unlesbar"};
 let s=String(v).trim();
 if(!s)return {ok:false,art:"leer"};
 if(/\d\s*[×x]\s*\d/i.test(s))return {ok:false,art:"masspaar"};
 s=s.replace(/['’\s]/g,"");
 if(s.indexOf(".")>=0&&s.indexOf(",")>=0)s=s.replace(/\./g,"").replace(",",".");
 else s=s.replace(",",".");
 if(!/^-?\d+(\.\d+)?$/.test(s))return {ok:false,art:"unlesbar"};
 const n=Number(s);
 return n<0?{ok:false,art:"negativ"}:{ok:true,wert:n};
}
function kaNorm(t){return String(t===null||t===undefined?"":t).trim().replace(/\s+/g," ").toLowerCase()}
const KA_GRUND={leer:"Menge nicht erfasst",masspaar:"zwei Masse statt einer Menge",unlesbar:"Menge nicht berechenbar",negativ:"negative Menge"};
// liste: Massaufnahmen (Zeilen mit data); ctx: {projectId, companyId, art(typ)->Text, material(wert)->Name}
function kaSammeln(liste,ctx){
 const c=ctx||{};
 const gruppen=new Map(), pruefen=[], mas=[];
 let masse=0;
 (liste||[]).forEach(m=>{
  if(!m)return;
  // Fremdes Projekt/andere Firma gehört nie in die Übersicht (zusätzlich zur RLS).
  if(c.projectId!==undefined&&c.projectId!==null&&String(m.project_id)!==String(c.projectId))return;
  if(c.companyId&&m.company_id&&String(m.company_id)!==String(c.companyId))return;
  const d=m.data||{};
  const zeilen=Array.isArray(d.ausmass)?d.ausmass.filter(z=>z&&typeof z==="object"):[];
  const status=KA_STATUS.indexOf(m.workflow_status)>=0?m.workflow_status:"unbekannt";
  const art=(typeof c.art==="function"?c.art(m.type):m.type)||"Massaufnahme";
  const info={id:m.id,art,titel:String(m.title||"").trim(),typ:m.type,status,archiviert:m.archived===true,
   material:(typeof c.material==="function"&&d.material!==undefined&&d.material!==null&&d.material!=="")?c.material(d.material):"",
   zeilen:zeilen.length,masse:0,pruefen:0};
  mas.push(info);
  zeilen.forEach(z=>{
   const bez=String(z.bezeichnung===undefined||z.bezeichnung===null?"":z.bezeichnung).trim();
   const einheit=kaEinheit(z.einheit);
   const q={id:m.id,art,titel:info.titel,status,pos:z.pos,menge:z.menge,herkunft:String(z.herkunft||"")};
   const meld=grund=>{pruefen.push(Object.assign({},q,{bezeichnung:bez||"(ohne Bezeichnung)",einheit:String(z.einheit||""),grund}));info.pruefen++};
   if(einheit==="mm"){masse++;info.masse++;return}                      // Masse, keine Mengen
   if(!bez){meld("Bezeichnung fehlt");return}
   const zahl=kaZahl(z.menge);
   if(!zahl.ok){meld(KA_GRUND[zahl.art]);return}
   if(!einheit){meld("Einheit fehlt");return}
   if(KA_EINHEITEN.indexOf(einheit)<0){meld("Einheit „"+einheit+"“ wird nicht summiert");return}
   const key=einheit+"|"+(z.teil?1:0)+"|"+kaNorm(bez);
   if(!gruppen.has(key))gruppen.set(key,{bezeichnung:bez,einheit,teil:!!z.teil,summe:0,quellen:[],dubletten:[]});
   const g=gruppen.get(key);
   g.summe+=zahl.wert;
   g.quellen.push(Object.assign({},q,{wert:zahl.wert}));
  });
 });
 const out=[...gruppen.values()];
 out.forEach(g=>{
  const nach=new Map();
  g.quellen.forEach(q=>{
   const t=kaNorm(q.titel); if(!t)return;
   const k=(mas.find(x=>x.id===q.id)||{}).typ+"|"+t;
   if(!nach.has(k))nach.set(k,new Set());
   nach.get(k).add(q.id);
  });
  nach.forEach(ids=>{if(ids.size>1)g.dubletten.push([...ids])});
 });
 out.sort((a,b)=>(KA_EINHEITEN.indexOf(a.einheit)-KA_EINHEITEN.indexOf(b.einheit))||a.bezeichnung.localeCompare(b.bezeichnung,"de",{numeric:true,sensitivity:"base"}));
 const nachStatus={};
 mas.forEach(m=>{nachStatus[m.status]=(nachStatus[m.status]||0)+1});
 return {gruppen:out,pruefen,masse,massaufnahmen:mas,nachStatus,
  ohneAusmass:mas.filter(m=>!m.zeilen).length,
  nachArt:mas.reduce((o,m)=>{o[m.art]=(o[m.art]||0)+1;return o},{}),
  nachMaterial:mas.reduce((o,m)=>{if(m.material)o[m.material]=(o[m.material]||0)+1;return o},{})};
}
// ---- Ende rein ----------------------------------------------------------------

let kaStand=null;          // Zeitpunkt der letzten erfolgreichen Ladung der Massaufnahmen dieses Projekts
let kaFehler=false;        // letzter Ladeversuch fehlgeschlagen
let kaFilter="alle";       // Statusfilter (nur Anzeige)
let kaProjekt=null;
function kaGeladen(){
 const pid=(typeof cockpitProjectId!=="undefined")?cockpitProjectId:null;
 if(kaProjekt!==pid){kaProjekt=pid;kaFilter="alle"}
 kaStand=new Date();kaFehler=false;renderKomplettausmass();
}
function kaLadeFehler(){kaFehler=true;renderKomplettausmass()}
function kaZeit(d){return d?d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"}):""}
function kaMengeText(n){return Number(n).toLocaleString("de-CH",{maximumFractionDigits:2})}

function renderKomplettausmass(){
 const box=$("cockpitKomplettBody");
 if(!box)return;
 const pid=(typeof cockpitProjectId!=="undefined")?cockpitProjectId:null;
 if(kaProjekt!==pid){kaProjekt=pid;kaFilter="alle";kaStand=null;kaFehler=false}
 const zahlEl=$("cockpitKomplettCount");
 if(!pid){box.innerHTML="";return}
 const cache=(typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))?projectMeasurementsCache:null;
 if(!cache||(!kaStand&&!kaFehler)){
  box.innerHTML=kaFehler?'<div class="small" style="color:var(--red)">Die Massaufnahmen konnten nicht geladen werden – keine Übersicht möglich.</div>':'<div class="small">Lädt…</div>';
  if(zahlEl)zahlEl.textContent="–";
  return;
 }
 const ctx={projectId:pid,companyId:(typeof currentProfile!=="undefined"&&currentProfile)?currentProfile.company_id:null,
  art:t=>(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[t])||t,
  material:v=>(typeof pmatMaterialName==="function")?pmatMaterialName(v):String(v)};
 const alle=kaSammeln(cache,ctx);
 const wf=(typeof mwAktiv==="function")?mwAktiv():false;
 let sicht=cache;
 if(wf&&kaFilter!=="alle")sicht=cache.filter(m=>(KA_STATUS.indexOf(m.workflow_status)>=0?m.workflow_status:"unbekannt")===kaFilter);
 const R=kaSammeln(sicht,ctx);
 if(zahlEl)zahlEl.textContent=String(alle.massaufnahmen.length);
 const statusText=s=>s==="unbekannt"?"Status unbekannt":((typeof mwStatusText==="function")?mwStatusText(s):s);
 const kopf=`<div class="small muted">Übersicht aus den Massaufnahmen dieses Projekts – <b>keine</b> Offertmenge, kein Zuschnitt, keine Reservierung und kein bestätigtes oder verrechnetes Ausmass. Es wird nichts gespeichert.</div>
<div class="small ${kaFehler?"":"muted"}"${kaFehler?' style="color:var(--red)"':""}>${kaFehler?"Nicht frisch geladen – letzter Stand "+esc(kaZeit(kaStand)||"unbekannt")+".":"Stand: "+esc(kaZeit(kaStand)||"–")+" Uhr"}</div>`;
 if(!alle.massaufnahmen.length){box.innerHTML=kopf+'<div class="empty">Noch keine Massaufnahme in diesem Projekt.</div>';return}
 const stArr=Object.keys(alle.nachStatus);
 const kenn=[`<b>${alle.massaufnahmen.length}</b> Massaufnahme${alle.massaufnahmen.length===1?"":"n"}`+(alle.ohneAusmass?` (${alle.ohneAusmass} ohne Ausmasszeilen)`:""),
  `<b>${alle.gruppen.length}</b> Mengenposition${alle.gruppen.length===1?"":"en"}`,
  alle.pruefen.length?`<b style="color:var(--red)">${alle.pruefen.length}</b> zu prüfen`:"nichts zu prüfen"];
 const statusZeile=wf?stArr.sort((a,b)=>KA_STATUS.indexOf(a)-KA_STATUS.indexOf(b)).map(s=>`${alle.nachStatus[s]} × ${esc(statusText(s))}`).join(" · "):"";
 const filter=(wf&&stArr.length>1)?`<div class="bar" style="margin:6px 0">${["alle"].concat(stArr).map(s=>`<button type="button" class="gray mz-klein${kaFilter===s?" aktiv":""}" data-ka-filter="${esc(s)}">${s==="alle"?"Alle":esc(statusText(s))}</button>`).join("")}</div>`:"";
 const quelle=q=>`<div class="ka-quelle"><button type="button" class="pmat-quelle" data-ka-open="${esc(q.id)}">${esc(q.art)}${q.titel?" · "+esc(q.titel):""}</button>
  <span class="small"> Pos. ${esc(q.pos)} · ${esc(String(q.menge))} ${esc(q.einheit||"")}</span>
  ${wf?`<span class="small muted"> · ${esc(statusText(q.status))}</span>`:""}
  ${q.herkunft?`<div class="small muted">${esc(q.herkunft)}</div>`:""}</div>`;
 let mengen="";
 KA_EINHEITEN.forEach(e=>{
  const gr=R.gruppen.filter(g=>g.einheit===e);
  if(!gr.length)return;
  mengen+=`<div class="pmat-unter">${esc(KA_EINHEIT_TITEL[e])}</div>`+gr.map(g=>`<details class="ka-gruppe" style="margin:4px 0">
   <summary><b>${esc(g.bezeichnung)}</b>${g.teil?' <span class="small muted">(Teil)</span>':""}: <b>${esc(kaMengeText(g.summe))} ${esc(e)}</b>
    <span class="small muted">· aus ${g.quellen.length} Zeile${g.quellen.length===1?"":"n"} / ${new Set(g.quellen.map(q=>q.id)).size} Massaufnahme${new Set(g.quellen.map(q=>q.id)).size===1?"":"n"} · Summe der Zeilen mit dieser Bezeichnung und Einheit</span></summary>
   ${g.dubletten.length?`<div class="small" style="color:var(--red)">⚠️ Mögliche Dublette: gleiche Art und gleicher Titel in mehreren Massaufnahmen – nicht zusammengeführt oder gelöscht, bitte prüfen.</div>`:""}
   ${g.quellen.map(quelle).join("")}</details>`).join("");
 });
 if(!mengen)mengen='<div class="small muted">Keine summierbaren Mengen in der Auswahl.</div>';
 const pruef=R.pruefen.length?`<div class="pmat-unter" style="color:var(--red)">Zu prüfen (nicht in den Summen)</div>`+R.pruefen.map(p=>`<div class="ka-quelle"><b>${esc(p.bezeichnung)}</b> <span class="small" style="color:var(--red)">– ${esc(p.grund)}</span>
  <div class="small"><button type="button" class="pmat-quelle" data-ka-open="${esc(p.id)}">${esc(p.art)}${p.titel?" · "+esc(p.titel):""}</button> · Pos. ${esc(p.pos)} · Menge „${esc(String(p.menge===null||p.menge===undefined?"":p.menge))}“ ${esc(p.einheit)}</div></div>`).join(""):"";
 const masse=R.masse?`<div class="small muted" style="margin-top:6px">${R.masse} Masszeile${R.masse===1?"":"n"} in mm (z. B. Zuschnittlängen) sind Masse, keine Mengen – nicht summiert.</div>`:"";
 const zeAn=(typeof zeStand==="function"&&typeof zeGeladen!=="undefined");
 const liste=R.massaufnahmen.map(m=>{
  const mm=cache.find(x=>x.id===m.id);
  let zs="";
  if(zeAn&&zeGeladen.has(Number(m.id))&&typeof pmatStuecke==="function"){
   const s=zeStand(mm);
   if(s.gesamt)zs=` · Zuschnitt: ${s.erledigt} von ${s.gesamt} Stück abgehakt (kein Montagestand)`;
  }
  return `<div class="ka-quelle"><button type="button" class="pmat-quelle" data-ka-open="${esc(m.id)}">${esc(m.art)}${m.titel?" · "+esc(m.titel):""}</button>
   <span class="small muted">${wf?" · Status der Massaufnahme: "+esc(statusText(m.status)):""}${m.archiviert?" · archiviert":""} · ${m.zeilen?m.zeilen+" Ausmasszeile"+(m.zeilen===1?"":"n"):"keine Ausmasszeilen"}${esc(zs)}</span></div>`;
 }).join("");
 const art=Object.keys(R.nachArt).sort().map(k=>`${R.nachArt[k]} × ${esc(k)}`).join(" · ");
 const mat=Object.keys(R.nachMaterial).sort().map(k=>`${R.nachMaterial[k]} × ${esc(k)}`).join(" · ");
 box.innerHTML=kopf+`<div style="margin:6px 0">${kenn.join(" · ")}</div>`
  +(statusZeile?`<div class="small">${statusZeile} <span class="muted">(Status je Massaufnahme, nicht je Position)</span></div>`:"")
  +filter+mengen+pruef+masse
  +`<div class="pmat-unter" style="margin-top:10px">Massaufnahmen in dieser Übersicht</div>`+liste
  +(art?`<div class="small muted" style="margin-top:6px">Nach Art: ${art}</div>`:"")
  +(mat?`<div class="small muted">Nach Werkstoff: ${mat}</div>`:"");
}
if($("cockpitKomplettBody")){
 $("cockpitKomplettBody").addEventListener("click",e=>{
  const f=e.target.closest?e.target.closest("[data-ka-filter]"):null;
  if(f){kaFilter=f.dataset.kaFilter;renderKomplettausmass();return}
  const o=e.target.closest?e.target.closest("[data-ka-open]"):null;
  if(o){
   const id=Number(o.dataset.kaOpen);
   const m=(typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))?projectMeasurementsCache.find(x=>Number(x.id)===id):null;
   if(!m)return;
   if(typeof measEditReturnTo!=="undefined")measEditReturnTo="projectCockpit";
   if(typeof openMeasurement==="function")openMeasurement(m);
  }
 });
}
