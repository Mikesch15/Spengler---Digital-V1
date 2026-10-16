"use strict";
// ===========================================================================
// v3.376 / v3.377  Zeitmessung (Stoppuhr) für Regiestunden
// ---------------------------------------------------------------------------
// Start / Pause / Weiter / Stopp ODER Beginn- und Endzeit von Hand. Die EFFEKTIVE Zeit wird in Stunden und Minuten gezeigt;
// übernommen wird sie auf die nächste Viertelstunde GERUNDET (0.25 h, passt zum Feld "Std." im Regierapport, Schritt .25).
// Das Runden ist reine Anzeige/Übernahme - gespeichert wird in der Datenbank nichts, bis die Person den Rapport speichert.
//
// v3.377 (Ansage des Anwenders): (1) Beginn/Ende von Hand, (2) Projekt und ggf. Massaufnahme wählbar, (3) Karte zuklappbar,
// (4) Benachrichtigung auf dem Handy, solange eine Zeit läuft.
//
// Die Uhr läuft über Zeitstempel (nicht über einen Zähler): sie überlebt Neuladen, Sperrbildschirm und Offline-Betrieb. Der Stand
// liegt in localStorage dieses Geräts. Nichts geht an einen Server.
// Grundsatz: Es läuft nur EINE Uhr zugleich. Eine fertige Messung bleibt stehen, bis sie übernommen oder verworfen wird - und sie darf stehen
// bleiben, während eine NÄCHSTE Messung gestartet oder erfasst wird (v3.380): sie wandert dann in die Liste "weitere fertige Messungen",
// jede mit eigenem Übernehmen/Verwerfen. Nichts davon wird ohne Zutun verworfen.
//
// BENACHRICHTIGUNG - was sie kann und was nicht: Eine Web-App läuft im Hintergrund nicht weiter. Die Benachrichtigung
// ("Zeit läuft seit 07:30 – Stand 08:37: 1 h 07 min") wird beim Start gezeigt und jede Minute aufgefrischt, SOLANGE die App offen
// oder noch nicht vom Handy angehalten ist. Danach bleibt sie mit "läuft seit" und "Stand" stehen - der Beginn ist immer richtig, die
// Dauer lässt sich daraus ablesen. Eine sekundengenaue Anzeige bei geschlossener App braucht einen Push-Dienst (eigener Server).
// ===========================================================================
const ZM_KEY="sd_zeitmessung";
const ZM_ZU_KEY="sd_zeitmessung_zu";
const ZM_LISTE_KEY="sd_zeitmessung_liste";
const ZM_LISTE_MAX=30;
const ZM_RUNDEN_MIN=15;
const ZM_NOTIF_TAG="zeitmessung";
const ZM_NOTIF_MS=60*1000;
// Zustand: phase "aus" | "laeuft" | "pause" | "fertig"; summeMs = bereits gelaufene Zeit; seit = Start des laufenden Abschnitts (ms)
const ZM_LEER=()=>({phase:"aus",summeMs:0,seit:0,notiz:"",ergebnisMs:0,pid:null,mid:null,projekt:"",mass:"",massTitel:"",datum:"",beginn:"",ende:"",pause:0});
let zmZustand=ZM_LEER();
// Eingaben im Formular (bleiben erhalten, wenn die Karte neu gezeichnet wird)
let zmEntwurf={notiz:"",pid:"",mid:"",beginn:"",ende:"",pause:"",datum:""};
let zmListe=[];           // weitere fertige Messungen (neueste zuletzt)
let zmZu=true;            // zugeklappt (Standard)
let zmMassCache={};       // projectId -> [{id,label}]
let zmTimer=null,zmNotifTimer=null;

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
const zmZ2=n=>String(n).padStart(2,"0");
function zmIso(d){return d.getFullYear()+"-"+zmZ2(d.getMonth()+1)+"-"+zmZ2(d.getDate())}
function zmHm(ms){const d=new Date(ms);return zmZ2(d.getHours())+":"+zmZ2(d.getMinutes())}
function zmZeitOk(s){return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s||""))}
function zmDatumOk(s){return /^\d{4}-\d{2}-\d{2}$/.test(String(s||""))&&!isNaN(new Date(s+"T00:00:00"))}
// "HH:MM" am Tag "YYYY-MM-DD" (Ortszeit) -> ms
function zmMs(datum,hm){const [y,m,d]=datum.split("-").map(Number),[h,mi]=hm.split(":").map(Number);return new Date(y,m-1,d,h,mi,0,0).getTime()}
// Handeingabe prüfen: {ok,ms,meldung}. Ende muss nach dem Beginn liegen (am selben Tag), die Pause wird abgezogen.
function zmHandDauer(datum,beginn,ende,pauseMin){
 if(!zmDatumOk(datum))return {ok:false,meldung:"Bitte ein Datum wählen."};
 if(!zmZeitOk(beginn))return {ok:false,meldung:"Bitte eine Beginn-Zeit eingeben."};
 if(!zmZeitOk(ende))return {ok:false,meldung:"Bitte eine Ende-Zeit eingeben."};
 const roh=zmMs(datum,ende)-zmMs(datum,beginn);
 if(roh<=0)return {ok:false,meldung:"Das Ende liegt nicht nach dem Beginn."};
 const p=pauseMin===""||pauseMin==null?0:Number(String(pauseMin).replace(",","."));
 if(!Number.isFinite(p)||p<0)return {ok:false,meldung:"Die Pause ist ungültig (Minuten, 0 oder mehr)."};
 const ms=roh-Math.round(p)*60000;
 if(ms<=0)return {ok:false,meldung:"Die Pause ist länger als die Zeit zwischen Beginn und Ende."};
 return {ok:true,ms,pause:Math.round(p)};
}

// ---- Speicher -------------------------------------------------------------
function zmSichern(){try{localStorage.setItem(ZM_KEY,JSON.stringify(zmZustand))}catch(e){}}
function zmLaden(){
 try{
  const r=JSON.parse(localStorage.getItem(ZM_KEY)||"null");
  if(r&&["aus","laeuft","pause","fertig"].includes(r.phase)&&Number.isFinite(Number(r.summeMs))&&Number.isFinite(Number(r.seit))){
   const s=ZM_LEER();
   s.phase=r.phase;s.summeMs=Math.max(0,Number(r.summeMs));s.seit=Number(r.seit);s.notiz=String(r.notiz||"").slice(0,200);
   s.ergebnisMs=Math.max(0,Number(r.ergebnisMs)||0);
   s.pid=Number.isFinite(Number(r.pid))&&r.pid!==null?Number(r.pid):null;s.mid=Number.isFinite(Number(r.mid))&&r.mid!==null?Number(r.mid):null;
   s.projekt=String(r.projekt||"").slice(0,200);s.mass=String(r.mass||"").slice(0,200);s.massTitel=String(r.massTitel||"").slice(0,200);
   s.datum=zmDatumOk(r.datum)?r.datum:"";s.beginn=zmZeitOk(r.beginn)?r.beginn:"";s.ende=zmZeitOk(r.ende)?r.ende:"";s.pause=Math.max(0,Number(r.pause)||0);
   zmZustand=s;
   // eine Uhr, die laut Zeitstempel in der Zukunft gestartet wurde (Geraetezeit verstellt), wird nicht als negative Zeit weitergefuehrt
   if(zmZustand.phase==="laeuft"&&zmZustand.seit>Date.now()+60000)zmZustand.seit=Date.now();
  }
 }catch(e){}
 try{const z=localStorage.getItem(ZM_ZU_KEY);if(z!==null)zmZu=z==="1"}catch(e){}
 try{
  const l=JSON.parse(localStorage.getItem(ZM_LISTE_KEY)||"[]");
  zmListe=(Array.isArray(l)?l:[]).filter(x=>x&&Number.isFinite(Number(x.ergebnisMs))&&x.id).slice(-ZM_LISTE_MAX).map(x=>({id:String(x.id),ergebnisMs:Math.max(0,Number(x.ergebnisMs)),notiz:String(x.notiz||"").slice(0,200),
   pid:Number.isFinite(Number(x.pid))&&x.pid!==null?Number(x.pid):null,mid:Number.isFinite(Number(x.mid))&&x.mid!==null?Number(x.mid):null,projekt:String(x.projekt||"").slice(0,200),
   mass:String(x.mass||"").slice(0,200),massTitel:String(x.massTitel||"").slice(0,200),datum:zmDatumOk(x.datum)?x.datum:"",beginn:zmZeitOk(x.beginn)?x.beginn:"",ende:zmZeitOk(x.ende)?x.ende:"",pause:Math.max(0,Number(x.pause)||0)}));
 }catch(e){zmListe=[]}
}
function zmListeSichern(){try{localStorage.setItem(ZM_LISTE_KEY,JSON.stringify(zmListe))}catch(e){}}
function zmZuSetzen(v){zmZu=!!v;try{localStorage.setItem(ZM_ZU_KEY,zmZu?"1":"0")}catch(e){}}

// ---- Projekt / Massaufnahme ---------------------------------------------------------
function zmProjekte(){return (typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[]}
function zmProjektText(pid){
 const p=zmProjekte().find(x=>String(x.id)===String(pid));
 if(!p)return "";
 return (typeof projektTitel==="function"?projektTitel(p):(p.name||""))+(p.order_no?" · "+p.order_no:"");
}
function zmMassText(pid,mid,titel){
 const l=zmMassCache[pid]||[];
 const m=l.find(x=>String(x.id)===String(mid));
 return m?(titel?m.titel:m.label):"";
}
async function zmMassLaden(pid){
 if(!pid)return [];
 if(zmMassCache[pid])return zmMassCache[pid];
 try{
  const {data,error}=await sb.from("measurements").select("id,title,type,archived").eq("project_id",Number(pid)).eq("archived",false).limit(200);
  if(error||!Array.isArray(data))return [];
  zmMassCache[pid]=data.map(m=>({id:m.id,titel:(String(m.title||"").trim()||"Ohne Bezeichnung"),label:(String(m.title||"").trim()||"Ohne Bezeichnung")+((typeof MEAS_TYPE_LABELS==="object"&&MEAS_TYPE_LABELS[m.type])?" · "+MEAS_TYPE_LABELS[m.type]:"")}))
   .sort((a,b)=>a.label.localeCompare(b.label,"de",{numeric:true,sensitivity:"base"}));
  return zmMassCache[pid];
 }catch(e){return []}
}
function zmMassOptionen(pid,sel){
 const l=zmMassCache[pid]||[];
 return '<option value="">– ganzes Projekt –</option>'+l.map(m=>`<option value="${esc(m.id)}"${String(m.id)===String(sel)?" selected":""}>${esc(m.label)}</option>`).join("");
}
function zmProjektOptionen(sel){
 return '<option value="">– kein Projekt –</option>'+zmProjekte().filter(p=>!p.archived||String(p.id)===String(sel)).map(p=>
  `<option value="${esc(p.id)}"${String(p.id)===String(sel)?" selected":""}>${esc(zmProjektText(p.id))}</option>`).join("");
}
async function zmMassFelderFuellen(pid){
 await zmMassLaden(pid);
 document.querySelectorAll("[data-zm-mass]").forEach(sel=>{
  if(String(zmEntwurf.pid)===String(pid))sel.innerHTML=zmMassOptionen(pid,zmEntwurf.mid);
 });
}

// ---- Benachrichtigung ---------------------------------------------------------------------
function zmNotifMoeglich(){return typeof Notification!=="undefined"&&typeof navigator!=="undefined"&&"serviceWorker" in navigator}
function zmNotifStatus(){return zmNotifMoeglich()?Notification.permission:"nicht_verfuegbar"}
async function zmNotifErlaubnis(){   // nur aus einem Tipp heraus aufrufen
 if(!zmNotifMoeglich())return "nicht_verfuegbar";
 if(Notification.permission!=="default")return Notification.permission;
 try{return await Notification.requestPermission()}catch(e){return Notification.permission}
}
async function zmNotifSenden(titel,text){
 if(zmNotifStatus()!=="granted")return false;
 try{
  const reg=await navigator.serviceWorker.getRegistration();
  const opt={body:text,tag:ZM_NOTIF_TAG,renotify:false,requireInteraction:true,silent:true,icon:"icon-192.png",badge:"icon-192.png",data:{zeitmessung:true}};
  if(reg&&reg.showNotification){await reg.showNotification(titel,opt);return true}
  new Notification(titel,opt);return true;
 }catch(e){return false}
}
async function zmNotifSchliessen(){
 try{
  const reg=await navigator.serviceWorker.getRegistration();
  if(reg&&reg.getNotifications){(await reg.getNotifications({tag:ZM_NOTIF_TAG})).forEach(n=>n.close())}
 }catch(e){}
}
// Inhalt der Benachrichtigung (rein)
function zmNotifInhalt(z,jetzt){
 z=z||zmZustand;
 const bez=[z.projekt,z.mass,z.notiz].filter(Boolean).join(" · ");
 const stand=zmHm(jetzt===undefined?Date.now():jetzt);
 if(z.phase==="laeuft"){
  const seit=z.beginn||zmHm(Date.now()-zmGemessenMs(z,jetzt));
  return {titel:"⏱ Zeit läuft seit "+seit,text:"Stand "+stand+": "+zmText(zmGemessenMs(z,jetzt))+(bez?" · "+bez:"")};
 }
 if(z.phase==="pause")return {titel:"⏸ Zeitmessung angehalten",text:"Stand "+stand+": "+zmText(zmGemessenMs(z,jetzt))+(bez?" · "+bez:"")};
 return null;
}
async function zmNotifAuffrischen(){
 const n=zmNotifInhalt();
 if(!n){await zmNotifSchliessen();return}
 await zmNotifSenden(n.titel,n.text);
}

// ---- Aktionen -----------------------------------------------------------------
// Auswahl aus dem Entwurf in die Messung übernehmen
function zmAuswahlUebernehmen(z){
 z.pid=zmEntwurf.pid?Number(zmEntwurf.pid):null;z.mid=z.pid&&zmEntwurf.mid?Number(zmEntwurf.mid):null;
 z.projekt=z.pid?zmProjektText(z.pid):"";z.mass=z.mid?zmMassText(z.pid,z.mid):"";z.massTitel=z.mid?zmMassText(z.pid,z.mid,true):"";
 z.notiz=String(zmEntwurf.notiz||"").trim().slice(0,200);
}
// Eine fertige Messung beiseitelegen, damit eine neue starten kann (nichts geht verloren)
function zmParken(){
 if(zmZustand.phase!=="fertig")return false;
 const z=zmZustand;
 zmListe.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),ergebnisMs:z.ergebnisMs,notiz:z.notiz,pid:z.pid,mid:z.mid,projekt:z.projekt,mass:z.mass,massTitel:z.massTitel,datum:z.datum,beginn:z.beginn,ende:z.ende,pause:z.pause});
 if(zmListe.length>ZM_LISTE_MAX)zmListe=zmListe.slice(-ZM_LISTE_MAX);
 zmZustand=ZM_LEER();
 zmListeSichern();
 return true;
}
function zmEintrag(id){return id?zmListe.find(x=>x.id===String(id))||null:(zmZustand.phase==="fertig"?zmZustand:null)}
function zmEintragWeg(id){zmListe=zmListe.filter(x=>x.id!==String(id));zmListeSichern();zmZeichnen()}
// beginn: "HH:MM" oder leer (= jetzt). Gibt {ok,meldung} zurück.
function zmStart(beginn){
 if(zmZustand.phase!=="aus"&&zmZustand.phase!=="fertig")return {ok:false,meldung:"Es läuft schon eine Messung."};
 const jetzt=Date.now();let seit=jetzt;
 const b=String(beginn||"").trim();
 if(b){
  if(!zmZeitOk(b))return {ok:false,meldung:"Die Beginn-Zeit ist ungültig."};
  seit=zmMs(zmIso(new Date(jetzt)),b);
  if(seit>jetzt+60000)return {ok:false,meldung:"Der Beginn liegt in der Zukunft."};
 }
 zmParken();   // eine noch stehende fertige Messung wandert in die Liste
 const z=ZM_LEER();z.phase="laeuft";z.seit=seit;z.beginn=zmHm(seit);z.datum=zmIso(new Date(seit));
 zmAuswahlUebernehmen(z);
 zmZustand=z;
 zmSichern();zmTakt();zmZeichnen();zmNotifAuffrischen();return {ok:true};
}
function zmPause(){
 if(zmZustand.phase!=="laeuft")return false;
 zmZustand.summeMs=zmGemessenMs();zmZustand.seit=0;zmZustand.phase="pause";
 zmSichern();zmTakt();zmZeichnen();zmNotifAuffrischen();return true;
}
function zmWeiter(){
 if(zmZustand.phase!=="pause")return false;
 zmZustand.phase="laeuft";zmZustand.seit=Date.now();
 zmSichern();zmTakt();zmZeichnen();zmNotifAuffrischen();return true;
}
function zmStopp(){
 if(zmZustand.phase!=="laeuft"&&zmZustand.phase!=="pause")return false;
 const ms=zmGemessenMs();
 zmZustand=Object.assign({},zmZustand,{phase:"fertig",summeMs:0,seit:0,ergebnisMs:ms,ende:zmHm(Date.now())});
 zmSichern();zmTakt();zmZeichnen();zmNotifSchliessen();return true;
}
// Beginn/Ende von Hand -> fertige Messung
function zmHandErfassen(){
 if(zmZustand.phase!=="aus"&&zmZustand.phase!=="fertig")return {ok:false,meldung:"Es läuft schon eine Messung."};
 const e=zmEntwurf,datum=e.datum||zmIso(new Date());
 const r=zmHandDauer(datum,e.beginn,e.ende,e.pause);
 if(!r.ok)return r;
 zmParken();
 const z=ZM_LEER();z.phase="fertig";z.ergebnisMs=r.ms;z.datum=datum;z.beginn=e.beginn;z.ende=e.ende;z.pause=r.pause;
 zmAuswahlUebernehmen(z);
 zmZustand=z;zmZu=false;
 zmSichern();zmTakt();zmZeichnen();zmNotifSchliessen();return {ok:true};
}
function zmVerwerfen(){
 zmZustand=ZM_LEER();
 zmEntwurf={notiz:"",pid:"",mid:"",beginn:"",ende:"",pause:"",datum:""};
 zmSichern();zmTakt();zmZeichnen();zmNotifSchliessen();
}
// Fertige Messung als Arbeitsposition in den offenen Regierapport übernehmen. Bei 0 h (unter 7.5 min) wird nichts übernommen.
function zmUebernehmen(mitEffektiv,id){
 const m=zmEintrag(id);
 if(!m)return {ok:false,meldung:"Es gibt keine fertige Messung."};
 const r=zmRunden(m.ergebnisMs);
 if(r.minuten<=0)return {ok:false,meldung:"Gemessen wurden weniger als 8 Minuten – gerundet wären das 0 Stunden. Bitte die Stunden von Hand eintragen oder die Messung verwerfen."};
 if(typeof works==="undefined"||typeof neueArbeitsposition!=="function"||typeof renderMain!=="function")return {ok:false,meldung:"Der Regierapport ist nicht bereit."};
 const w=neueArbeitsposition();
 w.hours=r.stunden;
 if(m.datum)w.date=m.datum;
 const eff=zmText(m.ergebnisMs);
 const basis=[m.notiz,m.massTitel||m.mass].filter(Boolean).join(" – ");
 w.desc=basis+(mitEffektiv?((basis?" ":"")+"(gemessen "+eff+")"):"");
 works.push(w);renderMain();
 const text=eff+" gemessen → "+zmStundenText(r.stunden);
 if(id)zmEintragWeg(id);else zmVerwerfen();
 return {ok:true,meldung:text};
}

// ---- Anzeige --------------------------------------------------------------------
function zmErgebnisHtml(z){
 const r=zmRunden(z.ergebnisMs);
 const von=z.beginn&&z.ende?`<div class="small">${esc(z.datum?z.datum.split("-").reverse().join(".")+" · ":"")}${esc(z.beginn)}–${esc(z.ende)}${z.pause?` · Pause ${esc(z.pause)} min`:""}</div>`:"";
 return `${von}<div class="a2-zm-ergebnis"><div><span class="small">Effektiv gemessen</span> <b>${esc(zmText(z.ergebnisMs))}</b></div>
  <div><span class="small">Gerundet auf ${ZM_RUNDEN_MIN} min</span> <b>${esc(zmStundenText(r.stunden))}</b> <span class="small">(${esc(zmText(r.minuten*60000))})</span></div></div>`;
}
function zmBezugHtml(z){
 return (z.projekt||z.mass)?`<div class="small">${esc([z.projekt,z.mass].filter(Boolean).join(" › "))}</div>`:"";
}
function zmFormularHtml(ort){
 const e=zmEntwurf,pid=e.pid;
 const notifSt=zmNotifStatus();
 const notifTxt=notifSt==="granted"?"🔔 Benachrichtigung ist an – solange eine Zeit läuft, erscheint sie auf dem Handy."
  :notifSt==="denied"?"🔕 Benachrichtigungen sind für diese App blockiert (Handy-Einstellungen)."
  :notifSt==="nicht_verfuegbar"?"🔕 Dieses Gerät/dieser Browser kann keine Benachrichtigungen zeigen."
  :"🔔 Beim Start fragt das Handy einmal nach der Erlaubnis für Benachrichtigungen.";
 return `<input class="a2-zm-notiz" data-zm-feld="notiz" value="${esc(e.notiz)}" placeholder="Wofür? (optional, z. B. Rinne montiert)" maxlength="200" aria-label="Wofür wird gemessen?">
  <label class="small">Projekt</label>
  <select data-zm-feld="pid" aria-label="Projekt">${zmProjektOptionen(pid)}</select>
  ${pid?`<label class="small">Massaufnahme (optional)</label><select data-zm-feld="mid" data-zm-mass aria-label="Massaufnahme">${zmMassOptionen(pid,e.mid)}</select>`:""}
  <div class="a2-zm-zeiten">
   <div><label class="small">Datum</label><input type="date" data-zm-feld="datum" value="${esc(e.datum)}" aria-label="Datum"></div>
   <div><label class="small">Beginn</label><input type="time" data-zm-feld="beginn" value="${esc(e.beginn)}" aria-label="Beginn"></div>
   <div><label class="small">Ende</label><input type="time" data-zm-feld="ende" value="${esc(e.ende)}" aria-label="Ende"></div>
   <div><label class="small">Pause (min)</label><input type="number" min="0" step="5" data-zm-feld="pause" value="${esc(e.pause)}" aria-label="Pause in Minuten"></div>
  </div>
  <div class="small">Stoppuhr: Beginn leer lassen = jetzt (oder eine frühere Zeit von heute eintragen). Von Hand: Beginn und Ende eintragen.</div>
  <div class="bar"><button type="button" class="green" data-zm="start">▶ Start</button><button type="button" class="gray" data-zm="hand">✍ Zeit erfassen</button></div>
  <div class="small a2-zm-notif">${esc(notifTxt)}</div>`;
}
// Kurzzeile im zugeklappten Zustand
function zmKurzHtml(){
 const z=zmZustand;
 if(z.phase==="pause")return `<span class="a2-zm-kurz">angehalten <b>${esc(zmText(zmGemessenMs()))}</b>${zmListe.length?` · +${zmListe.length} fertig`:""}</span>`;
 const mehr=zmListe.length?` · +${zmListe.length} fertig`:"";
 if(z.phase==="laeuft")return `<span class="a2-zm-kurz">läuft <b data-zm-uhr>${esc(zmUhr(zmGemessenMs()))}</b>${mehr}</span>`;
 if(z.phase==="fertig")return `<span class="a2-zm-kurz">fertig <b>${esc(zmText(z.ergebnisMs))}</b> – übernehmen?${mehr}</span>`;
 return `<span class="a2-zm-kurz">${zmListe.length?zmListe.length+" fertig – übernehmen?":"bereit"}</span>`;
}
// ort: "heute" (Karte auf der Startseite) | "rapport" (Kasten im Regierapport)
function zmFertigHtml(m,rapport,id){
 const ida=id?` data-zm-id="${esc(id)}"`:"";
 return `<div class="a2-zm-fertig">${zmBezugHtml(m)}${m.notiz?`<div class="small">${esc(m.notiz)}</div>`:""}${zmErgebnisHtml(m)}
  ${rapport?`<div class="bar"><button type="button" class="green" data-zm="uebernehmen"${ida}>➕ Als Arbeitsposition übernehmen</button><button type="button" class="gray" data-zm="verwerfen"${ida}>Verwerfen</button></div>`
  :`<div class="bar"><button type="button" class="gray" data-zm="verwerfen"${ida}>Verwerfen</button></div>`}</div>`;
}
// ort: "heute" (Karte auf der Startseite) | "rapport" (Kasten im Regierapport)
function zmKarteHtml(ort){
 const z=zmZustand,rapport=ort==="rapport";
 let inhalt="";
 if(!zmZu){
  if(z.phase==="aus"||z.phase==="fertig"){
   // Eine fertige Messung steht oben mit eigenen Knöpfen; darunter geht eine NÄCHSTE Messung - die fertige bleibt erhalten
   if(z.phase==="fertig")inhalt+=`<div class="small"><b>Fertige Messung</b></div>${zmFertigHtml(z,rapport,"")}${rapport?`<label class="rechte-schalter"><input type="checkbox" data-zm-eff> Effektive Zeit in die Beschreibung schreiben</label>`:`<div class="small">Zum Übernehmen einen Regierapport öffnen – dort steht diese Messung bereit.</div>`}<div class="small" style="margin-top:8px"><b>Nächste Messung</b> (die fertige bleibt stehen)</div>`;
   inhalt+=zmFormularHtml(ort);
  }else{
   const laeuft=z.phase==="laeuft";
   inhalt=`${zmBezugHtml(z)}${z.notiz?`<div class="small">${esc(z.notiz)}</div>`:""}
   <div class="a2-zm-uhr" data-zm-uhr>${esc(zmUhr(zmGemessenMs()))}</div>
   <div class="small">${laeuft?"läuft":"angehalten"}${z.beginn?" · seit "+esc(z.beginn):""} · bisher ${esc(zmText(zmGemessenMs()))}</div>
   <div class="bar">${laeuft?'<button type="button" class="gray" data-zm="pause">⏸ Pause</button>':'<button type="button" class="green" data-zm="weiter">▶ Weiter</button>'}
   <button type="button" class="red" data-zm="stopp">⏹ Stopp</button></div>`;
  }
  if(zmListe.length){
   inhalt+=`<div class="small" style="margin-top:8px"><b>Weitere fertige Messungen (${zmListe.length})</b></div>`
    +(rapport?`<label class="rechte-schalter"><input type="checkbox" data-zm-eff> Effektive Zeit in die Beschreibung schreiben</label>`:"")
    +zmListe.slice().reverse().map(m=>zmFertigHtml(m,rapport,m.id)).join("");
  }
 }
 return `<div class="a2-karte a2-zm${z.phase==="laeuft"?" a2-zm-an":""}${zmZu?" a2-zm-zu":""}" data-zm-ort="${esc(ort)}">
  <button type="button" class="a2-zm-kopf" data-zm="zu" aria-expanded="${zmZu?"false":"true"}">
   <span class="a2-karte-titel">⏱ Zeit messen</span>${zmZu?zmKurzHtml():""}<span class="a2-zm-pfeil">${zmZu?"▾":"▴"}</span></button>
  ${inhalt}</div>`;
}
function zmZeichnen(){
 document.querySelectorAll("[data-zm-ort]").forEach(el=>{
  const t=document.createElement("div");t.innerHTML=zmKarteHtml(el.getAttribute("data-zm-ort"));
  if(t.firstElementChild)el.replaceWith(t.firstElementChild);
 });
}
// Die Sekundenanzeige wird nur bei laufender Uhr getaktet und fasst nur die Zahl an (kein Neuzeichnen, keine Eingaben verlieren).
// Die Benachrichtigung wird jede Minute aufgefrischt, solange die App Code ausführen darf.
function zmTakt(){
 if(zmTimer){clearInterval(zmTimer);zmTimer=null}
 if(zmNotifTimer){clearInterval(zmNotifTimer);zmNotifTimer=null}
 if(zmZustand.phase==="laeuft"){
  zmTimer=setInterval(()=>{
   const els=document.querySelectorAll("[data-zm-uhr]");
   if(!els.length)return;
   const t=zmUhr(zmGemessenMs());
   els.forEach(e=>{e.textContent=t});
  },1000);
 }
 if(zmZustand.phase==="laeuft"||zmZustand.phase==="pause")zmNotifTimer=setInterval(()=>{zmNotifAuffrischen()},ZM_NOTIF_MS);
}

// ---- Ereignisse --------------------------------------------------------------------
async function zmMeldung(r){if(r&&!r.ok&&r.meldung&&typeof appAlert==="function")await appAlert(r.meldung)}
document.addEventListener("click",async e=>{
 const b=e.target&&e.target.closest?e.target.closest("[data-zm]"):null;
 if(!b)return;
 const was=b.getAttribute("data-zm");
 if(was==="zu"){zmZuSetzen(!zmZu);zmZeichnen();zmTakt();return}
 if(was==="start"){
  const r=zmStart(zmEntwurf.beginn);
  if(!r.ok){await zmMeldung(r);return}
  zmNotifErlaubnis().then(()=>{zmNotifAuffrischen();zmZeichnen()});
  return;
 }
 if(was==="hand"){await zmMeldung(zmHandErfassen());return}
 if(was==="pause"){zmPause();return}
 if(was==="weiter"){zmWeiter();zmNotifErlaubnis().then(()=>zmNotifAuffrischen());return}
 if(was==="stopp"){zmStopp();return}
 if(was==="verwerfen"){
  const id=b.getAttribute("data-zm-id")||"";
  if((id||zmZustand.phase==="fertig")&&typeof appConfirm==="function"&&!(await appConfirm("Die Messung verwerfen?",{ok:"Verwerfen"})))return;
  if(id)zmEintragWeg(id);else zmVerwerfen();
  return;
 }
 if(was==="uebernehmen"){
  const n=b.closest("[data-zm-ort]")||document,c=n.querySelector("[data-zm-eff]");
  const id=b.getAttribute("data-zm-id")||"",m=zmEintrag(id);
  // gehört die Messung zu einem anderen Projekt als der offene Rapport? Dann nachfragen.
  if(m&&m.pid&&typeof currentProjectId!=="undefined"&&currentProjectId&&Number(currentProjectId)!==Number(m.pid)&&typeof appConfirm==="function"){
   const ok=await appConfirm("Diese Messung gehört zu «"+m.projekt+"», der offene Rapport aber zu einem anderen Projekt. Trotzdem übernehmen?",{ok:"Übernehmen"});
   if(!ok)return;
  }
  const r=zmUebernehmen(!!(c&&c.checked),id);
  if(typeof appAlert==="function")await appAlert(r.ok?("Übernommen: "+r.meldung+". Bitte Beschreibung prüfen und den Rapport speichern."):r.meldung);
 }
});
function zmFeldAendern(e){
 const f=e.target&&e.target.getAttribute?e.target.getAttribute("data-zm-feld"):null;
 if(!f)return;
 zmEntwurf[f]=e.target.value;
 if(e.type==="change"&&f==="pid"){
  zmEntwurf.mid="";
  zmZeichnen();
  if(zmEntwurf.pid)zmMassFelderFuellen(zmEntwurf.pid);
 }
}
document.addEventListener("input",zmFeldAendern);
document.addEventListener("change",zmFeldAendern);
// Beim Zurückkehren in die App: Benachrichtigung und Anzeige sofort aktualisieren
document.addEventListener("visibilitychange",()=>{
 if(zmZustand.phase==="laeuft"||zmZustand.phase==="pause"){zmNotifAuffrischen()}
});
zmLaden();
document.addEventListener("DOMContentLoaded",()=>{zmTakt();zmZeichnen()});
if(document.readyState!=="loading"){zmTakt();zmZeichnen()}
