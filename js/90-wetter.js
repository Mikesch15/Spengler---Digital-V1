"use strict";
// ===========================================================================
// WETTER auf der Startseite (v3.373)
// ---------------------------------------------------------------------------
// Ein kleines Feld "Wetter" an den FIRMENSTANDORT (nicht an Projekte). Standard: AUS.
// Der Administrator schaltet es in den Einstellungen (Firma) ein und legt den Ort fest.
//
// Datenquelle: Open-Meteo.com (Vorhersage + Ortssuche), ohne Schluessel. WICHTIG: Der kostenlose Zugang gilt laut Anbieter nur
// fuer NICHT-KOMMERZIELLE Nutzung; fuer einen Betrieb ist ein bezahlter Zugang noetig. Darum ist die Funktion standardmaessig
// AUS und der Hinweis steht in den Einstellungen. Die Quelle ist in wetterUrl()/wetterOrtUrl() gekapselt (eine Stelle zum Wechseln).
//
// Abgefragt wird nur beim Oeffnen der Startseite (hoechstens alle 30 Minuten, sonst aus dem Zwischenspeicher) und beim Suchen
// eines Ortes - nie im Hintergrund, keine Standortabfrage des Geraets. Ohne Verbindung steht der zuletzt gespeicherte Stand.
// ===========================================================================
let wetterAktiv=false,wetterOrt="",wetterLat=null,wetterLon=null;
let wetterTage=null,wetterStand=0,wetterLaedt=false,wetterFehler="",wetterLetzterVersuch=0;
const WETTER_NEUVERSUCH_MS=60*1000;   // nach einem Fehlschlag fruehestens nach einer Minute wieder abfragen (kein Dauerfeuer beim Neuzeichnen)
const WETTER_CACHE_MS=30*60*1000;
const WETTER_CACHE_KEY="sd_wetter";
const WETTER_TAGE=5;

function wetterKoordOk(lat,lon){
 const a=Number(lat),o=Number(lon);
 return lat!==null&&lon!==null&&lat!==""&&lon!==""&&Number.isFinite(a)&&Number.isFinite(o)&&a>=-90&&a<=90&&o>=-180&&o<=180;
}
function wetterBereit(){return !!wetterAktiv&&wetterKoordOk(wetterLat,wetterLon)}
function wetterUrl(lat,lon){
 return "https://api.open-meteo.com/v1/forecast?latitude="+encodeURIComponent(Number(lat).toFixed(4))+"&longitude="+encodeURIComponent(Number(lon).toFixed(4))
  +"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max"
  +"&timezone=auto&forecast_days="+WETTER_TAGE;
}
function wetterOrtUrl(name){
 return "https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(String(name||"").trim())+"&count=5&language=de&format=json";
}
// Wettercode (WMO) -> Text und Symbol
function wetterCodeInfo(c){
 c=Number(c);
 if(c===0)return {text:"klar",icon:"☀️"};
 if(c===1||c===2)return {text:"teils bewölkt",icon:"🌤️"};
 if(c===3)return {text:"bedeckt",icon:"☁️"};
 if(c===45||c===48)return {text:"Nebel",icon:"🌫️"};
 if(c>=51&&c<=57)return {text:"Nieselregen",icon:"🌦️"};
 if(c>=61&&c<=67)return {text:"Regen",icon:"🌧️"};
 if(c>=71&&c<=77||c===85||c===86)return {text:"Schnee",icon:"❄️"};
 if(c>=80&&c<=82)return {text:"Schauer",icon:"🌦️"};
 if(c>=95&&c<=99)return {text:"Gewitter",icon:"⛈️"};
 return {text:"–",icon:"•"};
}
// Antwort pruefen und in eine Liste umwandeln. Alles, was nicht eindeutig lesbar ist, ergibt null - es wird nichts erfunden.
function wetterTageAus(json){
 const d=json&&json.daily;
 if(!d||!Array.isArray(d.time)||!d.time.length)return null;
 const n=d.time.length;
 const feld=k=>Array.isArray(d[k])&&d[k].length===n?d[k]:null;
 const code=feld("weather_code"),tmax=feld("temperature_2m_max"),tmin=feld("temperature_2m_min"),regen=feld("precipitation_sum"),
  prob=feld("precipitation_probability_max"),boe=feld("wind_gusts_10m_max");
 if(!code||!tmax||!tmin)return null;
 const zahl=v=>(v===null||v===undefined||v==="")?null:(Number.isFinite(Number(v))?Number(v):null);
 const tage=[];
 for(let i=0;i<n;i++){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d.time[i])))return null;
  tage.push({datum:d.time[i],code:zahl(code[i]),tmax:zahl(tmax[i]),tmin:zahl(tmin[i]),regen:regen?zahl(regen[i]):null,prob:prob?zahl(prob[i]):null,boeen:boe?zahl(boe[i]):null});
 }
 return tage;
}
// Hinweise fuer die Arbeit draussen (Schwellen sind Richtwerte, keine Sicherheitsfreigabe)
function wetterHinweise(t){
 const h=[];
 if(!t)return h;
 if(t.code!==null&&t.code>=95)h.push({art:"warn",text:"Gewitter"});
 if(t.boeen!==null&&t.boeen>=75)h.push({art:"warn",text:"Sturmböen "+Math.round(t.boeen)+" km/h"});
 else if(t.boeen!==null&&t.boeen>=50)h.push({art:"hinweis",text:"Wind bis "+Math.round(t.boeen)+" km/h"});
 if((t.regen!==null&&t.regen>=1)||(t.prob!==null&&t.prob>=60))h.push({art:"hinweis",text:"Regen"+(t.regen!==null?" "+(Math.round(t.regen*10)/10).toLocaleString("de-CH")+" mm":"")});
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
  <div class="small a2-wetter-quelle">Vorhersage von Open-Meteo.com – ein Richtwert, keine Sicherheitsfreigabe.</div></div>`;
}
function wetterZeichnen(){
 const el=document.getElementById("a2Wetter");
 if(!el)return;
 const t=document.createElement("div");t.innerHTML=wetterKarteHtml();
 const neu=t.firstElementChild;
 if(neu)el.replaceWith(neu);
}
// Zwischenspeicher: ohne Verbindung der letzte Stand statt nichts
function wetterCacheLesen(){
 try{
  const r=JSON.parse(localStorage.getItem(WETTER_CACHE_KEY)||"null");
  if(r&&Math.abs(r.lat-Number(wetterLat))<1e-6&&Math.abs(r.lon-Number(wetterLon))<1e-6&&Array.isArray(r.tage)&&r.tage.length)return r;
 }catch(e){}
 return null;
}
function wetterCacheSchreiben(tage){
 try{localStorage.setItem(WETTER_CACHE_KEY,JSON.stringify({lat:Number(wetterLat),lon:Number(wetterLon),ts:wetterStand,tage}))}catch(e){}
}
async function wetterLaden(erzwingen){
 if(!wetterBereit()||wetterLaedt)return;
 const c=wetterCacheLesen();
 if(c&&!erzwingen){
  wetterTage=c.tage;wetterStand=c.ts||0;
  if(Date.now()-wetterStand<=WETTER_CACHE_MS){wetterFehler="";wetterZeichnen();return}
 }
 wetterLaedt=true;wetterFehler="";wetterLetzterVersuch=Date.now();
 const ctl=(typeof AbortController!=="undefined")?new AbortController():null;
 const to=setTimeout(()=>{if(ctl)ctl.abort()},8000);
 try{
  const r=await fetch(wetterUrl(wetterLat,wetterLon),ctl?{signal:ctl.signal}:undefined);
  if(!r.ok)throw new Error("HTTP "+r.status);
  const tage=wetterTageAus(await r.json());
  if(!tage)throw new Error("Antwort nicht lesbar");
  wetterTage=tage;wetterStand=Date.now();wetterCacheSchreiben(tage);wetterFehler="";
 }catch(e){
  // der letzte gespeicherte Stand bleibt stehen (mit seiner Uhrzeit); sonst eine ehrliche Meldung
  if(!wetterTage||!wetterTage.length)wetterFehler="Wetter derzeit nicht verfügbar (keine Verbindung oder Dienst nicht erreichbar).";
 }
 clearTimeout(to);
 wetterLaedt=false;
 wetterZeichnen();
}
// ---- Einstellungen (Firma) -----------------------------------------------------------------
function wetterUebernehmen(s){
 s=s||{};
 wetterAktiv=!!s.wetter_aktiv;
 wetterOrt=s.wetter_ort||"";
 wetterLat=(s.wetter_lat===null||s.wetter_lat===undefined)?null:Number(s.wetter_lat);
 wetterLon=(s.wetter_lon===null||s.wetter_lon===undefined)?null:Number(s.wetter_lon);
 wetterTage=null;wetterStand=0;wetterLetzterVersuch=0;
 wetterFormFuellen();
}
function wetterFormFuellen(){
 const f=id=>document.getElementById(id);
 if(!f("wetterAktivInput"))return;
 f("wetterAktivInput").checked=!!wetterAktiv;
 f("wetterOrtInput").value=wetterOrt||"";
 f("wetterLatInput").value=wetterLat===null?"":wetterLat;
 f("wetterLonInput").value=wetterLon===null?"":wetterLon;
 wetterOrtAnzeige();
}
function wetterOrtAnzeige(){
 const a=document.getElementById("wetterOrtAnzeige");if(!a)return;
 a.textContent=wetterKoordOk(wetterLat,wetterLon)?("Standort: "+(wetterOrt||"ohne Namen")+" ("+Number(wetterLat).toFixed(3)+" / "+Number(wetterLon).toFixed(3)+")"):"Noch kein Standort festgelegt.";
}
async function wetterOrtSuchen(){
 const name=String(document.getElementById("wetterOrtInput").value||"").trim();
 const box=document.getElementById("wetterTreffer");
 if(name.length<2){box.innerHTML='<div class="small">Bitte einen Ort oder eine PLZ eingeben.</div>';return}
 box.innerHTML='<div class="small">Suche …</div>';
 try{
  const r=await fetch(wetterOrtUrl(name));
  if(!r.ok)throw new Error("HTTP "+r.status);
  const j=await r.json();
  const res=(j&&Array.isArray(j.results)?j.results:[]).filter(x=>wetterKoordOk(x.latitude,x.longitude)).slice(0,5);
  if(!res.length){box.innerHTML='<div class="small">Kein Ort gefunden. Bitte anders schreiben oder Koordinaten von Hand eintragen.</div>';return}
  box.innerHTML=res.map((x,i)=>`<button type="button" class="gray" data-wetter-treffer="${i}">${esc([x.name,x.admin1,x.country_code].filter(Boolean).join(", "))}</button>`).join("");
  box._res=res;
 }catch(e){
  box.innerHTML='<div class="small">Die Ortssuche ist gerade nicht erreichbar. Die Koordinaten lassen sich auch von Hand eintragen.</div>';
 }
}
async function wetterSpeichern(){
 const f=id=>document.getElementById(id);
 const aktiv=!!f("wetterAktivInput").checked;
 const lat=f("wetterLatInput").value===""?null:Number(String(f("wetterLatInput").value).replace(",","."));
 const lon=f("wetterLonInput").value===""?null:Number(String(f("wetterLonInput").value).replace(",","."));
 const ort=String(f("wetterOrtInput").value||"").trim().slice(0,80);
 if(aktiv&&!wetterKoordOk(lat,lon)){appAlert("Zum Einschalten braucht es einen Standort: Ort suchen und auswählen oder Koordinaten eintragen (Breite −90…90, Länge −180…180).");return}
 if((lat!==null||lon!==null)&&!wetterKoordOk(lat,lon)){appAlert("Die Koordinaten sind ungültig (Breite −90…90, Länge −180…180).");return}
 f("wetterSpeichern").disabled=true;
 try{
  const {fehler}=await speichereAppSettings({wetter_aktiv:aktiv,wetter_ort:ort||null,wetter_lat:lat,wetter_lon:lon});
  if(fehler){appAlert("Konnte nicht gespeichert werden: "+fehler);return}
  wetterAktiv=aktiv;wetterOrt=ort;wetterLat=lat;wetterLon=lon;wetterTage=null;wetterStand=0;wetterFehler="";wetterLetzterVersuch=0;
  try{localStorage.removeItem(WETTER_CACHE_KEY)}catch(e){}
  wetterOrtAnzeige();
  appAlert(aktiv?"Gespeichert. Das Wetter erscheint auf der Startseite.":"Gespeichert. Das Wetter ist ausgeschaltet.");
 }catch(e){appAlert("Fehler beim Speichern: "+(e&&e.message?e.message:e))}
 finally{f("wetterSpeichern").disabled=false}
}
document.addEventListener("click",e=>{
 const t=e.target&&e.target.closest?e.target.closest("[data-wetter-treffer],#wetterSuchen,#wetterSpeichern"):null;
 if(!t)return;
 if(t.id==="wetterSuchen"){wetterOrtSuchen();return}
 if(t.id==="wetterSpeichern"){wetterSpeichern();return}
 const box=document.getElementById("wetterTreffer");
 const x=box&&box._res&&box._res[Number(t.getAttribute("data-wetter-treffer"))];
 if(!x||!wetterKoordOk(x.latitude,x.longitude))return;
 document.getElementById("wetterOrtInput").value=[x.name,x.admin1].filter(Boolean).join(", ");
 document.getElementById("wetterLatInput").value=Number(x.latitude).toFixed(4);
 document.getElementById("wetterLonInput").value=Number(x.longitude).toFixed(4);
 box.innerHTML='<div class="small">Ort übernommen – bitte „Speichern“.</div>';
});
