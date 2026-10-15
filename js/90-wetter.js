"use strict";
// ===========================================================================
// WETTER auf der Startseite (v3.373, ab v3.374 mit Daten von MeteoSchweiz)
// ---------------------------------------------------------------------------
// Ein kleines Feld "Wetter" an den FIRMENSTANDORT (nicht an Projekte). Standard: AUS. Der Administrator schaltet es in den
// Einstellungen (Firma) ein. Der Ort ergibt sich aus der Postleitzahl der Firmenadresse (Einstellungen) - es gibt keine
// eigene Ortseingabe und keine Standortabfrage des Geraets.
//
// Datenquelle: MeteoSchweiz Open Government Data (lokale Vorhersage), kostenlos auch fuer Betriebe, Quellenangabe Pflicht.
// Der Abruf laeuft ueber die Edge Function "wetter-meteoschweiz" (liest die Postleitzahl selbst aus der Firmenadresse,
// Zwischenspeicher 3 h). Hier im Browser: kein Schluessel, kein Drittanbieter-Aufruf.
// Abgefragt wird nur beim Oeffnen der Startseite (hoechstens alle 30 Minuten, sonst aus dem Zwischenspeicher), nie im
// Hintergrund. Ohne Verbindung steht der zuletzt gespeicherte Stand.
// ===========================================================================
let wetterAktiv=false,wetterOrt="";
let wetterTage=null,wetterStand=0,wetterLaedt=false,wetterFehler="",wetterLetzterVersuch=0;
const WETTER_NEUVERSUCH_MS=60*1000;   // nach einem Fehlschlag fruehestens nach einer Minute wieder abfragen (kein Dauerfeuer beim Neuzeichnen)
const WETTER_CACHE_MS=30*60*1000;
const WETTER_CACHE_KEY="sd_wetter_ms";
const WETTER_TAGE=5;

// Vierstellige Postleitzahl aus der Firmenadresse (gleiche Regel wie in der Edge Function): bevorzugt "3063 Ittigen".
function wetterPlzAus(text){
 const t=String(text==null?"":text),treffer=[],re=/(?<![\d])([1-9]\d{3})(?![\d])/g;
 let m;
 while((m=re.exec(t))!==null)treffer.push({plz:m[1],rest:t.slice(m.index+4)});
 if(!treffer.length)return null;
 const mitOrt=treffer.find(x=>/^\s+\p{L}/u.test(x.rest));
 return (mitOrt||treffer[0]).plz;
}
function wetterFirmenPlz(){return wetterPlzAus(typeof companyAddress==="string"?companyAddress:"")}
function wetterBereit(){return !!wetterAktiv&&!!wetterFirmenPlz()}
// MeteoSchweiz-Piktogramm (Tageswert 1-42) -> Text und eigenes Symbol. Die Grafiken von MeteoSchweiz sind nicht frei, darum Emoji.
// Nur gesicherte Gruppen sind benannt; alles andere bekommt den neutralen Text "wechselhaft" statt einer erfundenen Aussage.
function wetterCodeInfo(c){
 c=Math.abs(Number(c));
 if(!Number.isFinite(c)||c<1)return {text:"–",icon:"•"};
 if(c===1)return {text:"sonnig",icon:"☀️"};
 if(c===2)return {text:"ziemlich sonnig",icon:"🌤️"};
 if(c===3)return {text:"teilweise sonnig",icon:"⛅"};
 if(c===4)return {text:"wechselnd bewölkt",icon:"⛅"};
 if(c===5)return {text:"bedeckt",icon:"☁️"};
 if(c===24||c===25)return {text:"gewitterhaft",icon:"⛈️"};
 if(c===26)return {text:"hohe Bewölkung",icon:"🌥️"};
 if(c===27)return {text:"Hochnebel",icon:"🌫️"};
 if(c===28)return {text:"Nebel",icon:"🌫️"};
 if(c>=22&&c<=23)return {text:"Schnee",icon:"❄️"};
 if(c>=17&&c<=21)return {text:c===20?"anhaltender Regen":"Regen",icon:"🌧️"};
 if(c>=6&&c<=16)return {text:"Schauer",icon:"🌦️"};
 return {text:"wechselhaft",icon:"🌥️"};
}
// Antwort der Edge Function pruefen. Was nicht eindeutig lesbar ist, ergibt null - es wird nichts erfunden.
function wetterTageAus(json){
 const t=json&&json.ok===true&&Array.isArray(json.tage)?json.tage:null;
 if(!t||!t.length)return null;
 const zahl=v=>(v===null||v===undefined||v==="")?null:(Number.isFinite(Number(v))?Number(v):null);
 const tage=[];
 for(const x of t){
  if(!x||!/^\d{4}-\d{2}-\d{2}$/.test(String(x.datum)))return null;
  tage.push({datum:x.datum,code:zahl(x.code),tmax:zahl(x.tmax),tmin:zahl(x.tmin),regen:zahl(x.regen)});
 }
 return tage;
}
// Hinweise fuer die Arbeit draussen (Richtwerte, keine Sicherheitsfreigabe). Wind liefert die Tagesdatei von MeteoSchweiz nicht.
function wetterHinweise(t){
 const h=[];
 if(!t)return h;
 if(t.code!==null&&(Math.abs(t.code)===24||Math.abs(t.code)===25))h.push({art:"warn",text:"Gewitter"});
 if(t.regen!==null&&t.regen>=1)h.push({art:"hinweis",text:"Regen "+(Math.round(t.regen*10)/10).toLocaleString("de-CH")+" mm"});
 if(t.tmin!==null&&t.tmin<=0)h.push({art:"hinweis",text:"Frost"});
 if(t.tmax!==null&&t.tmax>=30)h.push({art:"hinweis",text:"Hitze"});
 return h;
}
function wetterTagName(iso,i){
 if(i===0)return "Heute";
 if(i===1)return "Morgen";
 const [y,m,d]=iso.split("-").map(Number);
 return new Date(y,m-1,d).toLocaleDateString("de-CH",{weekday:"short"});
}
function wetterZelle(t,i){
 const info=wetterCodeInfo(t.code),h=wetterHinweise(t);
 const grad=v=>v===null?"–":Math.round(v)+"°";
 return `<div class="a2-wetter-tag${h.some(x=>x.art==="warn")?" a2-wetter-warn":""}">
  <div class="a2-wetter-name">${esc(wetterTagName(t.datum,i))}</div>
  <div class="a2-wetter-icon" title="${esc(info.text)}" aria-label="${esc(info.text)}">${info.icon}</div>
  <div class="a2-wetter-temp"><b>${esc(grad(t.tmax))}</b> <span>${esc(grad(t.tmin))}</span></div>
  ${h.map(x=>`<div class="a2-wetter-chip a2-wetter-${esc(x.art)}">${esc(x.text)}</div>`).join("")}
 </div>`;
}
function wetterStandText(){
 if(!wetterStand)return "";
 const d=new Date(wetterStand);
 return isNaN(d)?"":d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
}
function wetterKarteHtml(){
 if(!wetterBereit())return "";
 if(!wetterLaedt&&Date.now()-wetterLetzterVersuch>WETTER_NEUVERSUCH_MS){
  if(!wetterTage)wetterLaden();
  else if(Date.now()-wetterStand>WETTER_CACHE_MS)wetterLaden(true);
 }
 let inhalt;
 if(wetterTage&&wetterTage.length){
  inhalt=`<div class="a2-wetter-reihe">${wetterTage.slice(0,WETTER_TAGE).map(wetterZelle).join("")}</div>`;
 }else if(wetterLaedt)inhalt='<div class="small">Wetter wird geladen …</div>';
 else inhalt=`<div class="small">${esc(wetterFehler||"Wetter derzeit nicht verfügbar.")}</div>`;
 return `<div class="a2-abschnitt a2-wetter" id="a2Wetter">
  <div class="a2-abschnitt-kopf"><h2>Wetter${wetterOrt?" · "+esc(wetterOrt):""}</h2>${wetterStand?`<span class="small">Stand ${esc(wetterStandText())}</span>`:""}</div>
  ${inhalt}
  <div class="small a2-wetter-quelle">Quelle: MeteoSchweiz – ein Richtwert, keine Sicherheitsfreigabe.</div></div>`;
}
function wetterZeichnen(){
 const el=document.getElementById("a2Wetter");
 if(!el)return;
 const t=document.createElement("div");t.innerHTML=wetterKarteHtml();
 const neu=t.firstElementChild;
 if(neu)el.replaceWith(neu);
}
// Zwischenspeicher: ohne Verbindung der letzte Stand statt nichts (gilt nur fuer dieselbe Postleitzahl)
function wetterCacheLesen(){
 try{
  const r=JSON.parse(localStorage.getItem(WETTER_CACHE_KEY)||"null");
  if(r&&r.plz===wetterFirmenPlz()&&Array.isArray(r.tage)&&r.tage.length)return r;
 }catch(e){}
 return null;
}
function wetterCacheSchreiben(tage){
 try{localStorage.setItem(WETTER_CACHE_KEY,JSON.stringify({plz:wetterFirmenPlz(),ort:wetterOrt,ts:wetterStand,tage}))}catch(e){}
}
async function wetterLaden(erzwingen){
 if(!wetterBereit()||wetterLaedt)return;
 const c=wetterCacheLesen();
 if(c&&!erzwingen){
  wetterTage=c.tage;wetterStand=c.ts||0;wetterOrt=c.ort||wetterOrt;
  if(Date.now()-wetterStand<=WETTER_CACHE_MS){wetterFehler="";wetterZeichnen();return}
 }
 wetterLaedt=true;wetterFehler="";wetterLetzterVersuch=Date.now();
 try{
  const {data,error}=await sb.functions.invoke("wetter-meteoschweiz",{body:{}});
  let antwort=data;
  if(error&&error.context&&typeof error.context.json==="function"){try{antwort=await error.context.json()}catch(e){}}
  const tage=wetterTageAus(antwort);
  if(!tage){
   const msg=antwort&&antwort.error?String(antwort.error):"";
   throw new Error(msg||"Antwort nicht lesbar");
  }
  wetterTage=tage;wetterStand=Date.now();wetterOrt=antwort.ort||wetterOrt;wetterCacheSchreiben(tage);wetterFehler="";
 }catch(e){
  // der letzte gespeicherte Stand bleibt stehen (mit seiner Uhrzeit); sonst eine ehrliche Meldung
  if(!wetterTage||!wetterTage.length)wetterFehler=(e&&e.message&&!/^(Failed|FunctionsFetch|FunctionsHttp|Antwort nicht)/.test(e.message)&&e.message.length<200)?e.message:"Wetter derzeit nicht verfügbar (keine Verbindung oder Dienst nicht erreichbar).";
 }
 wetterLaedt=false;
 wetterZeichnen();
}
// ---- Einstellungen (Firma) -----------------------------------------------------------------
function wetterUebernehmen(s){
 s=s||{};
 wetterAktiv=!!s.wetter_aktiv;
 wetterOrt="";
 wetterTage=null;wetterStand=0;wetterLetzterVersuch=0;
 wetterFormFuellen();
}
function wetterFormFuellen(){
 const f=id=>document.getElementById(id);
 if(!f("wetterAktivInput"))return;
 f("wetterAktivInput").checked=!!wetterAktiv;
 wetterOrtAnzeige();
}
function wetterOrtAnzeige(){
 const a=document.getElementById("wetterOrtAnzeige");if(!a)return;
 const plz=wetterFirmenPlz();
 a.textContent=plz?("Ort: Postleitzahl "+plz+" aus der Firmenadresse."):"In der Firmenadresse steht keine vierstellige Postleitzahl – bitte oben ergänzen und speichern.";
}
async function wetterSpeichern(){
 const f=id=>document.getElementById(id);
 const aktiv=!!f("wetterAktivInput").checked;
 const feld=document.getElementById("companyAddressInput");
 const plz=wetterPlzAus(feld?feld.value:(typeof companyAddress==="string"?companyAddress:""));
 if(aktiv&&!plz){appAlert("Zum Einschalten braucht die Firmenadresse (oben) eine vierstellige Postleitzahl, z. B. „3063 Ittigen“. Die Firmenadresse zuerst ergänzen und speichern.");return}
 if(aktiv&&!wetterPlzAus(typeof companyAddress==="string"?companyAddress:"")){appAlert("Die Firmenadresse mit Postleitzahl ist noch nicht gespeichert. Bitte oben auf „Speichern“ tippen und danach das Wetter speichern.");return}
 f("wetterSpeichern").disabled=true;
 try{
  const {fehler}=await speichereAppSettings({wetter_aktiv:aktiv});
  if(fehler){appAlert("Konnte nicht gespeichert werden: "+fehler);return}
  wetterAktiv=aktiv;wetterOrt="";wetterTage=null;wetterStand=0;wetterFehler="";wetterLetzterVersuch=0;
  try{localStorage.removeItem(WETTER_CACHE_KEY)}catch(e){}
  wetterOrtAnzeige();
  appAlert(aktiv?"Gespeichert. Das Wetter erscheint auf der Startseite.":"Gespeichert. Das Wetter ist ausgeschaltet.");
 }catch(e){appAlert("Fehler beim Speichern: "+(e&&e.message?e.message:e))}
 finally{f("wetterSpeichern").disabled=false}
}
document.addEventListener("click",e=>{
 const t=e.target&&e.target.closest?e.target.closest("#wetterSpeichern"):null;
 if(t)wetterSpeichern();
});
