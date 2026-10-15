"use strict";
// ===========================================================================
// v3.376  Zeitmessung (Stoppuhr) für Regiestunden
// ---------------------------------------------------------------------------
// Start / Pause / Weiter / Stopp. Die EFFEKTIVE Zeit wird in Stunden und Minuten gezeigt; übernommen wird sie auf die nächste
// Viertelstunde GERUNDET (0.25 h, passt zum Feld "Std." im Regierapport, Schritt .25). Das Runden ist reine Anzeige/Übernahme -
// gespeichert wird in der Datenbank nichts, bis die Person den Rapport speichert.
//
// Die Uhr läuft über Zeitstempel (nicht über einen Zähler): sie überlebt Neuladen, Sperrbildschirm und Offline-Betrieb. Der Stand
// liegt in localStorage dieses Geräts; ohne localStorage läuft sie bis zum Neuladen. Nichts geht an einen Server.
// Grundsatz: Es gibt nur EINE Messung zugleich. Eine fertige Messung bleibt stehen, bis sie übernommen oder verworfen wird.
// ===========================================================================
const ZM_KEY="sd_zeitmessung";
const ZM_RUNDEN_MIN=15;
// Zustand: phase "aus" | "laeuft" | "pause" | "fertig"; summeMs = bereits gelaufene Zeit; seit = Start des laufenden Abschnitts (ms)
let zmZustand={phase:"aus",summeMs:0,seit:0,notiz:"",ergebnisMs:0};
let zmTimer=null;

// ---- reine Rechnung ---------------------------------------------------------
function zmGemessenMs(z,jetzt){
 z=z||zmZustand;
 if(z.phase==="laeuft")return Math.max(0,(z.summeMs||0)+Math.max(0,(jetzt===undefined?Date.now():jetzt)-(z.seit||0)));
 if(z.phase==="fertig")return z.ergebnisMs||0;
 return z.summeMs||0;
}
// Minuten (ganz, abgeschnitten) -> "1 h 07 min" / "42 min" / "2 h"
function zmText(ms){
 const min=Math.floor(Math.max(0,ms)/60000),h=Math.floor(min/60),m=min%60;
 if(h&&m)return h+" h "+String(m).padStart(2,"0")+" min";
 if(h)return h+" h";
 return m+" min";
}
// Auf die nächste Viertelstunde (7.5 min und mehr runden auf). Liefert Minuten UND Stunden.
function zmRunden(ms){
 const min=Math.max(0,ms)/60000;
 const q=Math.round(min/ZM_RUNDEN_MIN+1e-9)*ZM_RUNDEN_MIN;
 return {minuten:q,stunden:q/60};
}
function zmStundenText(h){return (Math.round(h*100)/100).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})+" h"}
function zmUhr(ms){   // laufende Anzeige h:mm:ss
 const s=Math.floor(Math.max(0,ms)/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60,z=n=>String(n).padStart(2,"0");
 return h+":"+z(m)+":"+z(x);
}

// ---- Speicher -------------------------------------------------------------
function zmSichern(){try{localStorage.setItem(ZM_KEY,JSON.stringify(zmZustand))}catch(e){}}
function zmLaden(){
 try{
  const r=JSON.parse(localStorage.getItem(ZM_KEY)||"null");
  if(r&&["aus","laeuft","pause","fertig"].includes(r.phase)&&Number.isFinite(Number(r.summeMs))&&Number.isFinite(Number(r.seit))){
   zmZustand={phase:r.phase,summeMs:Math.max(0,Number(r.summeMs)),seit:Number(r.seit),notiz:String(r.notiz||"").slice(0,200),ergebnisMs:Math.max(0,Number(r.ergebnisMs)||0)};
   // eine Uhr, die laut Zeitstempel in der Zukunft gestartet wurde (Geraetezeit verstellt), wird nicht als negative Zeit weitergefuehrt
   if(zmZustand.phase==="laeuft"&&zmZustand.seit>Date.now()+60000)zmZustand.seit=Date.now();
  }
 }catch(e){}
}

// ---- Aktionen -----------------------------------------------------------------
function zmStart(notiz){
 if(zmZustand.phase!=="aus")return false;
 zmZustand={phase:"laeuft",summeMs:0,seit:Date.now(),notiz:String(notiz||"").trim().slice(0,200),ergebnisMs:0};
 zmSichern();zmTakt();zmZeichnen();return true;
}
function zmPause(){
 if(zmZustand.phase!=="laeuft")return false;
 zmZustand.summeMs=zmGemessenMs();zmZustand.seit=0;zmZustand.phase="pause";
 zmSichern();zmTakt();zmZeichnen();return true;
}
function zmWeiter(){
 if(zmZustand.phase!=="pause")return false;
 zmZustand.phase="laeuft";zmZustand.seit=Date.now();
 zmSichern();zmTakt();zmZeichnen();return true;
}
function zmStopp(){
 if(zmZustand.phase!=="laeuft"&&zmZustand.phase!=="pause")return false;
 const ms=zmGemessenMs();
 zmZustand={phase:"fertig",summeMs:0,seit:0,notiz:zmZustand.notiz,ergebnisMs:ms};
 zmSichern();zmTakt();zmZeichnen();return true;
}
function zmVerwerfen(){
 zmZustand={phase:"aus",summeMs:0,seit:0,notiz:"",ergebnisMs:0};
 zmSichern();zmTakt();zmZeichnen();
}
// Fertige Messung als Arbeitsposition in den offenen Regierapport übernehmen. Bei 0 h (unter 7.5 min) wird nichts übernommen.
function zmUebernehmen(mitEffektiv){
 if(zmZustand.phase!=="fertig")return {ok:false,meldung:"Es gibt keine fertige Messung."};
 const r=zmRunden(zmZustand.ergebnisMs);
 if(r.minuten<=0)return {ok:false,meldung:"Gemessen wurden weniger als 8 Minuten – gerundet wären das 0 Stunden. Bitte die Stunden von Hand eintragen oder die Messung verwerfen."};
 if(typeof works==="undefined"||typeof neueArbeitsposition!=="function"||typeof renderMain!=="function")return {ok:false,meldung:"Der Regierapport ist nicht bereit."};
 const w=neueArbeitsposition();
 w.hours=r.stunden;
 const eff=zmText(zmZustand.ergebnisMs);
 w.desc=(zmZustand.notiz||"")+(mitEffektiv?((zmZustand.notiz?" ":"")+"(gemessen "+eff+")"):"");
 works.push(w);renderMain();
 const text=eff+" gemessen → "+zmStundenText(r.stunden);
 zmVerwerfen();
 return {ok:true,meldung:text};
}

// ---- Anzeige --------------------------------------------------------------------
function zmErgebnisHtml(){
 const r=zmRunden(zmZustand.ergebnisMs);
 return `<div class="a2-zm-ergebnis"><div><span class="small">Effektiv gemessen</span> <b>${esc(zmText(zmZustand.ergebnisMs))}</b></div>
  <div><span class="small">Gerundet auf ${ZM_RUNDEN_MIN} min</span> <b>${esc(zmStundenText(r.stunden))}</b> <span class="small">(${esc(zmText(r.minuten*60000))})</span></div></div>`;
}
// ort: "heute" (Karte auf der Startseite) | "rapport" (Kasten im Regierapport)
function zmKarteHtml(ort){
 const z=zmZustand,rapport=ort==="rapport";
 let inhalt="";
 if(z.phase==="aus"){
  inhalt=`<div class="small">Stoppuhr für Regiestunden. Die Zeit wird auf die nächste Viertelstunde gerundet; die effektive Zeit bleibt sichtbar.</div>
   <input class="a2-zm-notiz" data-zm-notiz placeholder="Wofür? (optional, z. B. Rinne montiert)" maxlength="200" aria-label="Wofür wird gemessen?">
   <div class="bar"><button type="button" class="green" data-zm="start">▶ Start</button></div>`;
 }else if(z.phase==="fertig"){
  inhalt=`${z.notiz?`<div class="small">${esc(z.notiz)}</div>`:""}${zmErgebnisHtml()}
   ${rapport?`<label class="rechte-schalter"><input type="checkbox" data-zm-eff> Effektive Zeit in die Beschreibung schreiben</label>
   <div class="bar"><button type="button" class="green" data-zm="uebernehmen">➕ Als Arbeitsposition übernehmen</button><button type="button" class="gray" data-zm="verwerfen">Verwerfen</button></div>`
   :`<div class="small">Zum Übernehmen einen Regierapport öffnen – dort steht diese Messung bereit.</div>
   <div class="bar"><button type="button" class="gray" data-zm="verwerfen">Verwerfen</button></div>`}`;
 }else{
  const laeuft=z.phase==="laeuft";
  inhalt=`${z.notiz?`<div class="small">${esc(z.notiz)}</div>`:""}
   <div class="a2-zm-uhr" data-zm-uhr>${esc(zmUhr(zmGemessenMs()))}</div>
   <div class="small">${laeuft?"läuft":"angehalten"} · bisher ${esc(zmText(zmGemessenMs()))}</div>
   <div class="bar">${laeuft?'<button type="button" class="gray" data-zm="pause">⏸ Pause</button>':'<button type="button" class="green" data-zm="weiter">▶ Weiter</button>'}
   <button type="button" class="red" data-zm="stopp">⏹ Stopp</button></div>`;
 }
 return `<div class="a2-karte a2-zm${z.phase==="laeuft"?" a2-zm-an":""}" data-zm-ort="${esc(ort)}"><div class="a2-karte-titel">⏱ Zeit messen</div>${inhalt}</div>`;
}
function zmZeichnen(){
 document.querySelectorAll("[data-zm-ort]").forEach(el=>{
  const t=document.createElement("div");t.innerHTML=zmKarteHtml(el.getAttribute("data-zm-ort"));
  if(t.firstElementChild)el.replaceWith(t.firstElementChild);
 });
}
// Die Sekundenanzeige wird nur bei laufender Uhr getaktet und fasst nur die Zahl an (kein Neuzeichnen, keine Eingaben verlieren)
function zmTakt(){
 if(zmTimer){clearInterval(zmTimer);zmTimer=null}
 if(zmZustand.phase!=="laeuft")return;
 zmTimer=setInterval(()=>{
  const els=document.querySelectorAll("[data-zm-uhr]");
  if(!els.length)return;
  const t=zmUhr(zmGemessenMs());
  els.forEach(e=>{e.textContent=t});
 },1000);
}

// ---- Ereignisse --------------------------------------------------------------------
document.addEventListener("click",async e=>{
 const b=e.target&&e.target.closest?e.target.closest("[data-zm]"):null;
 if(!b)return;
 const was=b.getAttribute("data-zm");
 if(was==="start"){
  const n=b.closest("[data-zm-ort]")||document;const f=n.querySelector("[data-zm-notiz]");
  zmStart(f?f.value:"");return;
 }
 if(was==="pause"){zmPause();return}
 if(was==="weiter"){zmWeiter();return}
 if(was==="stopp"){zmStopp();return}
 if(was==="verwerfen"){
  if(zmZustand.phase==="fertig"&&typeof appConfirm==="function"&&!(await appConfirm("Die Messung verwerfen?",{ok:"Verwerfen"})))return;
  zmVerwerfen();return;
 }
 if(was==="uebernehmen"){
  const n=b.closest("[data-zm-ort]")||document,c=n.querySelector("[data-zm-eff]");
  const r=zmUebernehmen(!!(c&&c.checked));
  if(typeof appAlert==="function")await appAlert(r.ok?("Übernommen: "+r.meldung+". Bitte Beschreibung prüfen und den Rapport speichern."):r.meldung);
 }
});
zmLaden();
document.addEventListener("DOMContentLoaded",()=>{zmTakt();zmZeichnen()});
if(document.readyState!=="loading"){zmTakt();zmZeichnen()}
