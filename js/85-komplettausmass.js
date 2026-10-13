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
// v3.347 (Wunsch): Diese Zeilen gehören NICHT ins Komplettausmass: Biegungen, Blechstösse, Umschläge, Endzugaben, Gehrungen, GAVA-Haltebleche,
// Segmente, Ecken, Scharen, Knicke und Stückzahlen von Zuschnitten („Stücke“, „Zuschnitte“). Sie stehen weiter in der Massaufnahme selbst.
const KA_AUSGEBLENDET=[/biegung/,/(^|[^a-zäöü])(blech)?st(ö|oe|o)sse?\b/,/umschl(ä|ae)g/,/endzugabe/,/^gehrung/,/gava|haltebleche?/,/^segment/,/^ecken?\b/,/^schar(en)?\b/,/^knick/,/stück|stueck|^zuschnitte?$/];
function kaAusgeblendet(l){
 const b=kaNorm(l&&l.bezeichnung), e=kaEinheit(l&&l.einheit);
 if(e==="mm")return false;
 if(!b)return false;
 // „Blechfläche Zuschnitt“ (m²) bleibt - die Stück-Muster gelten nur für Stückzahlen
 if(e!=="Stk"&&/stück|stueck|zuschnitt/.test(b)&&!KA_AUSGEBLENDET.slice(0,10).some(r=>r.test(b)))return false;
 return KA_AUSGEBLENDET.some(r=>r.test(b));
}
// Einfassungen: nur als Komplettstückzahl je Einfassungsart (Dachfenstereinfassung, Kamineinfassung, Einfassungen rund) - die Zeilen
// nach Deckart („…, Schiebeziegel“) werden zur Art zusammengefasst, die einzelnen „Einfassung 1 · Titel“ entfallen.
function kaEinfassungArt(l){
 const b=kaNorm(l&&l.bezeichnung);
 if(kaEinheit(l&&l.einheit)!=="Stk"||(l&&l.teil))return "";
 if(/^einfassung\s*\d+\s*·/.test(b))return "-";            // einzelne Rundeinfassung: nicht zählen
 if(/^dachfenstereinfassung\b/.test(b))return "Dachfenstereinfassungen";
 if(/^kamineinfassung\b/.test(b))return "Kamineinfassungen";
 if(/^einfassungen rund\b/.test(b))return "Einfassungen rund";
 return "";
}
function kaIstBlechflaeche(b){return /^blechfläche( zuschnitt)?$/.test(kaNorm(b))}
function kaNorm(t){return String(t===null||t===undefined?"":t).trim().replace(/\s+/g," ").toLowerCase()}
const KA_GRUND={leer:"Menge nicht erfasst",masspaar:"zwei Masse statt einer Menge",unlesbar:"Menge nicht berechenbar",negativ:"negative Menge"};
// liste: Massaufnahmen (Zeilen mit data); ctx: {projectId, companyId, art(typ)->Text, material(wert)->Name}
function kaSammeln(liste,ctx){
 const c=ctx||{};
 const gruppen=new Map(), pruefen=[], mas=[];
 let masse=0, ausgeblendet=0;
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
   if(kaAusgeblendet(z)){ausgeblendet++;return}
   const ea=kaEinfassungArt(z);
   if(ea==="-"){ausgeblendet++;return}
   const bez0=String(z.bezeichnung===undefined||z.bezeichnung===null?"":z.bezeichnung).trim();
   const einheit=kaEinheit(z.einheit);
   // „Blechfläche“ (Einlaufblech, Freies Profil) und „Blechfläche Zuschnitt“ (Dachfenster, Kamin, …) sind dieselbe Grösse: Netto-Fläche
   // Länge × Abwicklung ohne Verschnitt – nur je Modul anders beschriftet. Im Komplettausmass stehen sie unter einem Namen.
   const bez=ea||((einheit==="m²"&&kaIstBlechflaeche(bez0))?"Blechfläche":bez0);
   const q={id:m.id,art,titel:info.titel,status,pos:z.pos,menge:z.menge,herkunft:String(z.herkunft||""),original:bez0};
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
 return {gruppen:out,pruefen,masse,ausgeblendet,massaufnahmen:mas,nachStatus,
  ohneAusmass:mas.filter(m=>!m.zeilen).length,
  nachArt:mas.reduce((o,m)=>{o[m.art]=(o[m.art]||0)+1;return o},{}),
  nachMaterial:mas.reduce((o,m)=>{if(m.material)o[m.material]=(o[m.material]||0)+1;return o},{})};
}
// v3.343: Material- und Mengenübersicht - je Werkstoff + Stärke nebeneinander: Offerte (nur aus der Offerte) und Massaufnahme
// (Zeilen „Blechfläche Zuschnitt“ in m², Hauptstücke in Stk). Quellen bleiben getrennte Spalten; was eine Quelle nicht liefert, ist null
// (Anzeige „–“), nie 0. U = angMengenUebersicht(...) EINER Offerte oder null.
function kaMaterialZeilen(liste,Us,ctx){
 const c=ctx||{};
 const offs=Array.isArray(Us)?Us:(Us?[{titel:"",U:Us}]:[]);
 const zeilen=new Map();
 const hole=(name,st)=>{
  const k=name+"|"+(st===null||st===undefined?"":st);
  if(!zeilen.has(k))zeilen.set(k,{material:name,staerke:(st===null||st===undefined)?null:st,masseM2:null,masseStk:null,
    off:offs.map(()=>({m2:null,stk:null}))});
  return zeilen.get(k);
 };
 const add=(z,f,v)=>{z[f]=(z[f]===null?0:z[f])+v};
 (liste||[]).forEach(m=>{
  if(!m)return;
  if(c.projectId!==undefined&&c.projectId!==null&&String(m.project_id)!==String(c.projectId))return;
  if(c.companyId&&m.company_id&&String(m.company_id)!==String(c.companyId))return;
  const d=m.data||{};
  const name=(typeof c.material==="function"&&d.material!==undefined&&d.material!==null&&d.material!=="")?c.material(d.material):"";
  const st=Number(m.staerke_mm);
  const z=hole(name,Number.isFinite(st)&&st>0?st:null);
  (Array.isArray(d.ausmass)?d.ausmass:[]).forEach(l=>{
   if(!l||typeof l!=="object")return;
   const e=kaEinheit(l.einheit), zahl=kaZahl(l.menge);
   if(!zahl.ok)return;
   if(e==="m²"&&kaIstBlechflaeche(l.bezeichnung))add(z,"masseM2",zahl.wert);
   if(kaEinfassungArt(l)&&kaEinfassungArt(l)!=="-")add(z,"masseStk",zahl.wert);   // Stück = Einfassungen (Komplettstückzahl)
  });
 });
 // jede geltende Offerte bekommt ihre EIGENE Spalte - sie werden nie addiert
 offs.forEach((of,i)=>{
  const U=of.U;
  if(!U||!U.nachMatStaerke)return;
  Object.keys(U.nachMatStaerke).forEach(k=>{
   const o=U.nachMatStaerke[k];
   const z=hole(o.material||"",o.staerke);
   if(o.flaeche_m2>0)add(z.off[i],"m2",o.flaeche_m2);
   if(o.stueck>0)add(z.off[i],"stk",o.stueck);
  });
 });
 const hatWert=z=>z.masseM2!==null||z.masseStk!==null||z.off.some(o=>o.m2!==null||o.stk!==null);
 const out=[...zeilen.values()].filter(hatWert);
 out.sort((a,b)=>((a.material===""?1:0)-(b.material===""?1:0))||a.material.localeCompare(b.material,"de")||((a.staerke===null?1:0)-(b.staerke===null?1:0))||((a.staerke||0)-(b.staerke||0)));
 const sum=(vals)=>{const mit=vals.filter(v=>v!==null);return {wert:mit.length?mit.reduce((x,y)=>x+y,0):null,vollstaendig:mit.length===vals.length}};
 const summe={masseM2:sum(out.map(z=>z.masseM2)),masseStk:sum(out.map(z=>z.masseStk)),
  off:offs.map((_,i)=>({m2:sum(out.map(z=>z.off[i].m2)),stk:sum(out.map(z=>z.off[i].stk))}))};
 return {zeilen:out,summe,offerten:offs.map(o=>o.titel||"")};
}
// Kurztext je Massaufnahme für die Auswahl: m² (Blechfläche Zuschnitt) und Hauptstücke, nur was erfasst ist (sonst nichts).
function kaMaFlaeche(m){
 const d=(m&&m.data)||{};
 let m2=null, stk=null;
 (Array.isArray(d.ausmass)?d.ausmass:[]).forEach(l=>{
  if(!l||typeof l!=="object")return;
  const e=kaEinheit(l.einheit), z=kaZahl(l.menge);
  if(!z.ok)return;
  if(e==="m²"&&kaIstBlechflaeche(l.bezeichnung))m2=(m2===null?0:m2)+z.wert;
  if(kaEinfassungArt(l)&&kaEinfassungArt(l)!=="-")stk=(stk===null?0:stk)+z.wert;
 });
 return (m2!==null?" · "+m2.toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})+" m²":"")+(stk!==null?" · "+stk.toLocaleString("de-CH",{maximumFractionDigits:2})+" Stk":"");
}
// ---- Ende rein ----------------------------------------------------------------

let kaOffen=Object.create(null);     // aufgeklappte Kacheln (bleiben beim Neuzeichnen offen)
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

// Baut die Übersicht als HTML. host "card" = Karte im Projekt-Cockpit, "a2" = Register Ausmass der Projektseite (js/70).
// Rückgabe {html, n} (n = Anzahl Massaufnahmen oder "–").
function kaBauen(host){
 const pid=(typeof cockpitProjectId!=="undefined")?cockpitProjectId:null;
 if(kaProjekt!==pid){kaProjekt=pid;kaFilter="alle";kaStand=null;kaFehler=false}
 if(!pid)return {html:"",n:"–"};
 const cache=(typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))?projectMeasurementsCache:null;
 if(!cache||(!kaStand&&!kaFehler)){
  return {html:kaFehler?'<div class="small" style="color:var(--red)">Die Massaufnahmen konnten nicht geladen werden – keine Übersicht möglich.</div>':'<div class="small">Lädt…</div>',n:"–"};
 }
 const oeffnen=host==="a2"?"data-a2-meas":"data-ka-open";
 const ctx={projectId:pid,companyId:(typeof currentProfile!=="undefined"&&currentProfile)?currentProfile.company_id:null,
  art:t=>(typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[t])||t,
  material:v=>(typeof pmatMaterialName==="function")?pmatMaterialName(v):String(v)};
 const alle=kaSammeln(cache,ctx);
 const wf=(typeof mwAktiv==="function")?mwAktiv():false;
 let sicht=cache;
 if(wf&&kaFilter!=="alle")sicht=cache.filter(m=>(KA_STATUS.indexOf(m.workflow_status)>=0?m.workflow_status:"unbekannt")===kaFilter);
 const R=kaSammeln(sicht,ctx);
 const statusText=s=>s==="unbekannt"?"Status unbekannt":((typeof mwStatusText==="function")?mwStatusText(s):s);
 const kopf=`<div class="small muted">Übersicht aus den Massaufnahmen dieses Projekts – <b>keine</b> Offertmenge, kein Zuschnitt, keine Reservierung und kein bestätigtes oder verrechnetes Ausmass. Es wird nichts gespeichert.</div>
<div class="small ${kaFehler?"":"muted"}"${kaFehler?' style="color:var(--red)"':""}>${kaFehler?"Nicht frisch geladen – letzter Stand "+esc(kaZeit(kaStand)||"unbekannt")+".":"Stand: "+esc(kaZeit(kaStand)||"–")+" Uhr"}</div>`;
 if(!alle.massaufnahmen.length)return {html:kopf+'<div class="empty">Noch keine Massaufnahme in diesem Projekt.</div>',n:"0"};
 const stArr=Object.keys(alle.nachStatus);
 // v3.345: die Anzahl Bleilappen steht fest oben im Gesamtausmass (Summe aller Massaufnahmen, Einheit Stk) - sonst nur, wenn es welche gibt
 const bl=R.gruppen.filter(g=>g.einheit==="Stk"&&kaNorm(g.bezeichnung)==="bleilappen");
 const blSumme=bl.reduce((s2,g)=>s2+g.summe,0);
 const blZeile=bl.length?`<div class="ka-bleilappen" style="margin:6px 0;padding:6px 10px;border:1px solid var(--line);border-radius:10px"><b>🔩 Bleilappen: ${esc(kaMengeText(blSumme))} Stk</b> <span class="small muted">· Summe aller Massaufnahmen dieses Projekts</span></div>`:"";
 const kenn=[`<b>${alle.massaufnahmen.length}</b> Massaufnahme${alle.massaufnahmen.length===1?"":"n"}`+(alle.ohneAusmass?` (${alle.ohneAusmass} ohne Ausmasszeilen)`:""),
  `<b>${alle.gruppen.length}</b> Mengenposition${alle.gruppen.length===1?"":"en"}`,
  alle.pruefen.length?`<b style="color:var(--red)">${alle.pruefen.length}</b> zu prüfen`:"nichts zu prüfen"];
 const statusZeile=wf?stArr.sort((a,b)=>KA_STATUS.indexOf(a)-KA_STATUS.indexOf(b)).map(s=>`${alle.nachStatus[s]} × ${esc(statusText(s))}`).join(" · "):"";
 const filter=(wf&&stArr.length>1)?`<div class="bar" style="margin:6px 0">${["alle"].concat(stArr).map(s=>`<button type="button" class="gray mz-klein${kaFilter===s?" aktiv":""}" data-ka-filter="${esc(s)}">${s==="alle"?"Alle":esc(statusText(s))}</button>`).join("")}</div>`:"";
 const quelle=q=>`<div class="ka-quelle"><button type="button" class="pmat-quelle" ${oeffnen}="${esc(q.id)}">${esc(q.art)}${q.titel?" · "+esc(q.titel):""}</button>
  <span class="small"> Pos. ${esc(q.pos)} · ${esc(String(q.menge))} ${esc(q.einheit||"")}</span>
  ${wf?`<span class="small muted"> · ${esc(statusText(q.status))}</span>`:""}
  ${q.herkunft?`<div class="small muted">${esc(q.herkunft)}</div>`:""}</div>`;
 // v3.347 (Wunsch „schöner auflisten, wie die Bleilappen“): jede Mengenposition als Kachel mit Name und fetter Summe, je Einheit gruppiert.
 const ICON={"m²":"📐","m":"📏","Stk":"🔢","h":"⏱️"};
 let mengen="";
 KA_EINHEITEN.forEach(e=>{
  const gr=R.gruppen.filter(g=>g.einheit===e);
  if(!gr.length)return;
  mengen+=`<div class="pmat-unter">${esc(KA_EINHEIT_TITEL[e])}</div><div class="ka-kacheln">`+gr.map(g=>{
   const nm=new Set(g.quellen.map(q=>q.id)).size;
   // nur die Summen - die einzelnen Massaufnahmen stehen nicht darunter (v3.345). Eine mögliche Dublette bleibt als Hinweis sichtbar.
   const key=e+"|"+(g.teil?1:0)+"|"+kaNorm(g.bezeichnung);
   // Antippen klappt die Herkunft auf: je Zeile die Massaufnahme (Knopf öffnet sie), Position, Menge und der Text der Zeile.
   const nachMa=new Map();g.quellen.forEach(q=>{if(!nachMa.has(q.id))nachMa.set(q.id,{q,zeilen:[]});nachMa.get(q.id).zeilen.push(q)});
   const herkunft=[...nachMa.values()].map(({q,zeilen})=>`<div class="ka-quelle"><button type="button" class="pmat-quelle" ${oeffnen}="${esc(q.id)}">${esc(q.art)}${q.titel?" · "+esc(q.titel):""}</button>${wf?`<span class="small muted"> · ${esc(statusText(q.status))}</span>`:""}
     ${zeilen.map(r=>`<div class="small">Pos. ${esc(r.pos)} · ${esc(String(r.menge))} ${esc(e)}${r.original&&kaNorm(r.original)!==kaNorm(g.bezeichnung)?` · „${esc(r.original)}“`:""}${r.herkunft?` <span class="muted">· ${esc(r.herkunft)}</span>`:""}</div>`).join("")}</div>`).join("");
   return `<details class="ka-kachel" data-ka-key="${esc(key)}"${kaOffen[key]?" open":""}><summary><div class="ka-kachel-name">${ICON[e]||""} ${esc(g.bezeichnung)}${g.teil?' <span class="muted">(Teil)</span>':""}</div>
    <div class="ka-kachel-wert">${esc(kaMengeText(g.summe))} <span>${esc(e)}</span></div>
    <div class="small muted">aus ${nm} Massaufnahme${nm===1?"":"n"} · antippen = woher</div></summary>
    ${g.dubletten.length?`<div class="small" style="color:var(--red)">⚠️ Mögliche Dublette: gleiche Art und gleicher Titel – nicht zusammengeführt, bitte prüfen.</div>`:""}
    ${herkunft}</details>`;
  }).join("")+"</div>";
 });
 if(!mengen)mengen='<div class="small muted">Keine summierbaren Mengen in der Auswahl.</div>';
 const pruef=R.pruefen.length?`<div class="pmat-unter" style="color:var(--red)">Zu prüfen (nicht in den Summen)</div>`+R.pruefen.map(p=>`<div class="ka-quelle"><b>${esc(p.bezeichnung)}</b> <span class="small" style="color:var(--red)">– ${esc(p.grund)}</span>
  <div class="small"><button type="button" class="pmat-quelle" ${oeffnen}="${esc(p.id)}">${esc(p.art)}${p.titel?" · "+esc(p.titel):""}</button> · Pos. ${esc(p.pos)} · Menge „${esc(String(p.menge===null||p.menge===undefined?"":p.menge))}“ ${esc(p.einheit)}</div></div>`).join(""):"";
 const aus=R.ausgeblendet?`<div class="small muted" style="margin-top:6px">${R.ausgeblendet} Zeile${R.ausgeblendet===1?"":"n"} (Biegungen, Blechstösse, Umschläge, Endzugaben, Gehrungen, GAVA-Haltebleche, Segmente, Ecken, Scharen, Knicke, Stücke, einzelne Einfassungen) gehören nicht ins Komplettausmass – sie stehen in der Massaufnahme.</div>`:"";
 const masse=R.masse?`<div class="small muted" style="margin-top:6px">${R.masse} Masszeile${R.masse===1?"":"n"} in mm (z. B. Zuschnittlängen) sind Masse, keine Mengen – nicht summiert.</div>`:"";
 const art=Object.keys(R.nachArt).sort().map(k=>`${R.nachArt[k]} × ${esc(k)}`).join(" · ");
 const mat=Object.keys(R.nachMaterial).sort().map(k=>`${R.nachMaterial[k]} × ${esc(k)}`).join(" · ");
 return {n:String(alle.massaufnahmen.length),kenn:{mas:alle.massaufnahmen.length,gruppen:alle.gruppen.length,pruefen:alle.pruefen.length},
  html:kopf+`<div style="margin:6px 0">${kenn.join(" · ")}</div>`
  +(statusZeile?`<div class="small">${statusZeile} <span class="muted">(Status je Massaufnahme, nicht je Position)</span></div>`:"")
  +blZeile+filter+mengen+pruef+masse+aus
  +(art?`<div class="small muted" style="margin-top:6px">Nach Art: ${art}</div>`:"")
  +(mat?`<div class="small muted">Nach Werkstoff: ${mat}</div>`:"")};
}
// Karte im Cockpit (klassisches Fenster)
function renderKomplettausmass(){
 const box=$("cockpitKomplettBody");
 if(!box)return;
 const r=kaBauen("card");
 box.innerHTML=r.html;
 if($("cockpitKomplettCount"))$("cockpitKomplettCount").textContent=r.n;
}
// Ein Block für die Projektseite der Ansicht (js/70, Register Ausmass); ruft nur kaBauen.
function kaA2Html(){
 const r=kaBauen("a2");
 return `<div class="a2-abschnitt"><div class="a2-abschnitt-kopf"><h2>📊 Komplettausmass (Übersicht)</h2></div><div class="a2-karte a2-karte-kompakt ka-a2">${r.html}</div></div>`;
}
// Kurzzeile für die Übersicht der Projektseite (nur wenn es etwas zu zeigen gibt)
function kaA2Kurz(){
 const r=kaBauen("a2");
 if(!r.kenn)return "";
 return r.kenn.mas+" Massaufnahme"+(r.kenn.mas===1?"":"n")+" · "+r.kenn.gruppen+" Mengenposition"+(r.kenn.gruppen===1?"":"en")+(r.kenn.pruefen?" · "+r.kenn.pruefen+" zu prüfen":"");
}
// ---- Material- und Mengenübersicht (Projektübersicht der Ansicht, v3.343) -------------------------------------------------------
let kaAnsicht="m2";
function kaMengenKarteHtml(){
 const pid=(typeof cockpitProjectId!=="undefined")?cockpitProjectId:null;
 const cache=(typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))?projectMeasurementsCache:null;
 const kopf=`<div class="a2-abschnitt-kopf"><h2>Material- und Mengenübersicht</h2>
  <span class="ka-umschalter"><button type="button" class="${kaAnsicht==="m2"?"ist-auf":""}" data-ka-ansicht="m2">m²</button><button type="button" class="${kaAnsicht==="stk"?"ist-auf":""}" data-ka-ansicht="stk">Stk.</button></span></div>`;
 if(!pid||!cache||(!kaStand&&!kaFehler))return `<div class="a2-abschnitt">${kopf}<div class="a2-karte"><div class="small">Lädt…</div></div></div>`;
 const liste=(typeof angMatListe==="function")?angMatListe():[];
 const mitPos=((typeof projectAngeboteCache!=="undefined"&&Array.isArray(projectAngeboteCache))?projectAngeboteCache:[])
  .filter(a=>a&&Array.isArray(a.positions)&&a.positions.length);
 // v3.346: nur die als geltend markierten Offerten (angebote.gilt, Standard: alle); mehrere = je eine eigene Spalte, nie addiert
 const offerten=typeof angGeltende==="function"?angGeltende(mitPos):mitPos;
 const Us=offerten.map(a=>({titel:a.title||"Ohne Bezeichnung",U:typeof angMengenUebersicht==="function"?angMengenUebersicht(a.positions,liste):null}));
 const ctx={projectId:pid,companyId:(typeof currentProfile!=="undefined"&&currentProfile)?currentProfile.company_id:null,
  material:v=>(typeof pmatMaterialName==="function")?pmatMaterialName(v):String(v)};
 const T=kaMaterialZeilen(cache,Us,ctx);
 const stk=kaAnsicht==="stk";
 const fM=stk?"masseStk":"masseM2", fO=stk?"stk":"m2";
 const zahl=v=>v===null?'<span class="muted" title="nicht erfasst">–</span>':Number(v).toLocaleString("de-CH",{minimumFractionDigits:stk?0:2,maximumFractionDigits:2});
 const einh=stk?"Stück":"m²";
 let quelle;
 if(!mitPos.length)quelle='<div class="small muted">Keine Offerte importiert – nur die Spalte Massaufnahme.</div>';
 else if(!offerten.length)quelle='<div class="small" style="color:var(--red)">Keine Offerte ist als geltend markiert (Reiter Offerte) – nur die Spalte Massaufnahme.</div>';
 else quelle=`<div class="small muted">Geltende Offerte${offerten.length===1?"":"n"}: ${offerten.map(a=>"„"+esc(a.title||"Ohne Bezeichnung")+"“").join(", ")} – nur Positionen mit Werkstoff, Stärke und berechenbarer Menge.${offerten.length>1?" Mehrere gelten: je Offerte eine eigene Spalte, nie addiert.":""}</div>`;
 let tabelle;
 if(!T.zeilen.length)tabelle='<div class="small muted">Noch keine Mengen zum Vergleichen.</div>';
 else{
  const sm=s=>s.wert===null?"–":zahl(s.wert)+(s.vollstaendig?"":'<span class="small muted"> (nur Zeilen mit Wert)</span>');
  const offKopf=Us.map(o=>`<th>${einh} (Offerte${Us.length>1?" „"+esc(o.titel)+"“":""})</th>`).join("");
  tabelle=`<div class="ka-tabelle-wrap"><table class="ka-tabelle"><thead><tr><th>Werkstoff</th><th>Stärke</th>${offKopf}<th>${einh} (Massaufn.)</th></tr></thead><tbody>
  ${T.zeilen.map(z=>`<tr><td>${z.material?esc(z.material):'<span class="muted">ohne Werkstoff</span>'}</td><td>${z.staerke===null?'<span class="muted">nicht erfasst</span>':esc(String(z.staerke).replace(".",","))+" mm"}</td>${z.off.map(o=>`<td class="ka-z">${zahl(o[fO])}</td>`).join("")}<td class="ka-z">${zahl(z[fM])}</td></tr>`).join("")}
  </tbody><tfoot><tr><th colspan="2">Summe</th>${T.summe.off.map(o=>`<th class="ka-z">${sm(o[fO])}</th>`).join("")}<th class="ka-z">${sm(T.summe[fM])}</th></tr></tfoot></table></div>`;
 }
 const def=stk?"Massaufnahme: Einfassungen als Komplettstückzahl je Einfassungsart":"Massaufnahme: Blechfläche (netto, Länge × Abwicklung; je Modul „Blechfläche“ oder „Blechfläche Zuschnitt“)";
 return `<div class="a2-abschnitt">${kopf}<div class="a2-karte">${quelle}${tabelle}
  <div class="small muted" style="margin-top:6px">${def}. Getrennte Quellen – Offertmengen sind keine Massaufnahme-, Ausmass- oder verrechneten Mengen. „–“ = nicht erfasst.</div></div></div>`;
}
// Filter und Öffnen gelten für beide Orte (Karte und Projektseite)
document.addEventListener("click",e=>{
 const om=e.target.closest?e.target.closest("[data-ka-ansicht]"):null;
 if(om){
  kaAnsicht=om.dataset.kaAnsicht==="stk"?"stk":"m2";
  if(typeof a2Zeichnen==="function")a2Zeichnen();
  return;
 }
 const f=e.target.closest?e.target.closest("[data-ka-filter]"):null;
 if(f){
  kaFilter=f.dataset.kaFilter;
  renderKomplettausmass();
  if(typeof a2Zeichnen==="function"&&typeof a2Zustand!=="undefined"&&a2Zustand.reg==="ausmass"&&f.closest(".ka-a2"))a2Zeichnen();
  return;
 }
 const o=e.target.closest?e.target.closest("#cockpitKomplettBody [data-ka-open]"):null;
 if(o){
  const id=Number(o.dataset.kaOpen);
  const m=(typeof projectMeasurementsCache!=="undefined"&&Array.isArray(projectMeasurementsCache))?projectMeasurementsCache.find(x=>Number(x.id)===id):null;
  if(!m)return;
  if(typeof measEditReturnTo!=="undefined")measEditReturnTo="projectCockpit";
  if(typeof openMeasurement==="function")openMeasurement(m);
 }
});
// aufgeklappte Kacheln merken
document.addEventListener("toggle",e=>{
 const d=e.target;
 if(!d||!d.matches||!d.matches("details.ka-kachel"))return;
 const k=d.getAttribute("data-ka-key");
 if(d.open)kaOffen[k]=true; else delete kaOffen[k];
},true);
