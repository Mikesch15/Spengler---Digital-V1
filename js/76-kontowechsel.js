"use strict";
// ===========================================================================
// Konto wechseln ohne Neuanmeldung (v3.187)
//
// GEWUENSCHT
// "dass ich von meiner firma zu eine eigens zum teste angelegte testfirma
//  hin und her wechseln kann ohne mich immer nei anzumelden"
//
// WAS HIER NICHT GEMACHT WIRD - UND WARUM
// Es waere naheliegend gewesen, EIN Konto in mehrere Firmen sehen zu
// lassen. Das haette die Zugriffskontrolle selbst angefasst: die ganze RLS
// dieser App haengt an my_company_id(), einer Firma je Anmeldung. Eine
// zweite Firma an einem Konto haette jede Policy im Projekt betroffen -
// fuer eine Bequemlichkeit beim Testen ein unverhaeltnismaessiges Risiko.
//
// STATTDESSEN: zwei getrennte Anmeldungen, beide auf diesem Geraet
// gespeichert, und der Wechsel tauscht nur aus, welche gerade gilt
// (sb.auth.setSession). An der Datenbank aendert sich NICHTS - kein
// Tabellenfeld, keine Policy, keine Migration. Serverseitig ist ein
// Wechsel nicht von einer normalen Anmeldung zu unterscheiden.
//
// DREI GEFAHREN, DIE HIER ABGEFANGEN WERDEN
// 1. Daten der einen Firma duerfen nicht in der anderen stehenbleiben.
//    Deshalb wird nach dem Wechsel die Seite NEU GELADEN. Jede globale
//    Variable, jede gezeichnete Liste, jeder Zwischenspeicher ist danach
//    frisch. Ein Wechsel "im Betrieb" - alle Globals von Hand leeren -
//    waere eine Liste, die man vergessen kann, und sie wuerde bei jedem
//    neuen Modul laenger.
// 2. Die Offline-Warteschlange gehoert EINER Firma. wsAlle() (js/43)
//    verwirft sie, sobald eine fremde Firma sie anfasst - richtig so, aber
//    das darf ein Wechsel nicht ausloesen. Wartet etwas, wird der Wechsel
//    deshalb VERWEIGERT, mit dem Angebot, zuerst zu senden.
// 3. Ohne Verbindung wird gar nicht gewechselt: die andere Firma haette
//    keine Daten, und der Zwischenspeicher der jetzigen waere weg.
//
// WAS AUF DEM GERAET LIEGT
// Die Sitzungsmerkmale (access_token, refresh_token) der gemerkten Konten,
// in localStorage - dort, wo Supabase die aktuelle Sitzung ohnehin schon
// ablegt. Es ist also keine neue Art von Geheimnis auf dem Geraet, aber
// eine zweite Sitzung: wer das Geraet in der Hand hat, kommt ohne Passwort
// in beide Konten. Fuer ein persoenliches Arbeitsgeraet ist das genau der
// Zweck; auf einem geteilten Geraet ist "Konto entfernen" der richtige
// Weg, und es steht direkt bei jedem Eintrag.
// ===========================================================================

const KW_SCHLUESSEL="sd_konten_v1";

// localStorage kann fehlen oder voll sein. Faellt es aus, gibt es eben
// keine gemerkten Konten - die App muss deswegen nicht stehenbleiben.
function kwListe(){
 try{
  const roh=localStorage.getItem(KW_SCHLUESSEL);
  const l=roh?JSON.parse(roh):[];
  return Array.isArray(l)?l.filter(k=>k&&k.id&&k.refresh_token):[];
 }catch(e){ return [] }
}
function kwSpeichern(liste){
 try{ localStorage.setItem(KW_SCHLUESSEL,JSON.stringify(liste||[])); return true }
 catch(e){ return false }
}
function kwId(){
 return (typeof currentProfile==="object"&&currentProfile&&currentProfile.id)
  ?String(currentProfile.id):"";
}
function kwAndere(){
 const ich=kwId();
 return kwListe().filter(k=>String(k.id)!==ich);
}
// Gemerkt sind mindestens zwei Konten? Erst dann ist der Wechsel ueberhaupt
// ein Thema; vorher steht nur "Weiteres Konto hinzufügen".
function kwMehrereDa(){ return kwAndere().length>0 }

// ---- Merken ---------------------------------------------------------------
// Nach jeder Anmeldung: das Konto samt frischer Sitzung in die Liste. Damit
// ist der Eintrag immer so aktuell wie die letzte Anmeldung - ein alter
// refresh_token, der nicht mehr gilt, wird dabei ersetzt.
async function kwMerken(){
 if(typeof sb==="undefined")return false;
 let s=null;
 try{ const r=await sb.auth.getSession(); s=r&&r.data?r.data.session:null; }catch(e){ s=null }
 if(!s||!s.refresh_token||!currentProfile)return false;
 const eintrag={
  id:String(currentProfile.id),
  name:[currentProfile.first_name,currentProfile.last_name].filter(Boolean).join(" ").trim()
       ||(s.user&&s.user.email)||"Konto",
  firma:(typeof companyName!=="undefined"&&companyName)?String(companyName):"",
  email:(s.user&&s.user.email)||"",
  access_token:s.access_token||"",
  refresh_token:s.refresh_token,
  zuletzt:new Date().toISOString()
 };
 const liste=kwListe().filter(k=>String(k.id)!==eintrag.id);
 liste.push(eintrag);
 return kwSpeichern(liste);
}

function kwEntfernen(id){
 const liste=kwListe().filter(k=>String(k.id)!==String(id));
 kwSpeichern(liste);
}

// ---- Wechseln -------------------------------------------------------------
// Gibt {ok, meldung} zurueck und laedt bei Erfolg die Seite neu. Jede
// Absage nennt ihren Grund - ein Wechsel, der stumm nichts tut, waere das
// Schlimmste von allem.
async function kwPruefeWechsel(){
 if(typeof navigator!=="undefined"&&navigator.onLine===false)
  return {ok:false,meldung:"Ohne Verbindung lässt sich das Konto nicht wechseln: die andere Firma hätte keine Daten, und der Zwischenspeicher dieser hier wäre weg."};
 if(typeof wsAlle==="function"){
  let warten=[];
  try{ warten=await wsAlle() }catch(e){ warten=[] }
  if(warten.length)
   return {ok:false,wartend:warten.length,
    meldung:`${warten.length} ${warten.length===1?"Eintrag wartet":"Einträge warten"} noch auf die Übertragung. `
     +"Sie gehören zu dieser Firma und würden beim Wechsel verworfen. Bitte zuerst übertragen."};
 }
 return {ok:true};
}

async function kwWechseln(id){
 const ziel=kwListe().find(k=>String(k.id)===String(id));
 if(!ziel)return {ok:false,meldung:"Dieses Konto ist auf dem Gerät nicht mehr gespeichert."};
 const pruefung=await kwPruefeWechsel();
 if(!pruefung.ok)return pruefung;

 // Die EIGENE Sitzung zuerst frisch sichern. supabase-js erneuert den
 // refresh_token im Betrieb; ohne diesen Schritt truege die Liste den
 // Stand der letzten Anmeldung, und der Rueckweg waere irgendwann zu.
 await kwMerken();

 let fehler=null;
 try{
  const r=await sb.auth.setSession({access_token:ziel.access_token||"",refresh_token:ziel.refresh_token});
  if(r&&r.error)fehler=r.error.message;
 }catch(e){ fehler=String(e&&e.message||e) }

 if(fehler){
  // Der gespeicherte Zugang gilt nicht mehr (Passwort geaendert, zu lange
  // nicht benutzt). Der Eintrag wird entfernt, statt ihn stehen zu lassen
  // und beim naechsten Versuch wieder zu scheitern.
  kwEntfernen(ziel.id);
  return {ok:false,meldung:"Dieses Konto lässt sich nicht mehr ohne Passwort öffnen – bitte einmal normal anmelden. Der gespeicherte Zugang wurde entfernt."};
 }

 // Der Zwischenspeicher gehoert der bisherigen Firma. Er wird weggeraeumt,
 // bevor die Seite neu laedt - offlineCacheLesen() wuerde ihn ohnehin
 // verwerfen, aber er hat hier nichts mehr verloren.
 if(typeof offlineCacheLeeren==="function")offlineCacheLeeren();
 kwNeuLaden();
 return {ok:true};
}

// Das Neuladen steht als eigene, benannte Funktion da, weil es der
// eigentliche Kern dieses Wechsels ist und nicht ein Detail am Ende:
// erst sie garantiert, dass keine globale Variable, keine gezeichnete
// Liste und kein Zwischenspeicher der einen Firma in der anderen
// stehenbleibt.
function kwNeuLaden(){
 if(typeof location!=="undefined"&&location.reload)location.reload();
}

// ---- Weiteres Konto hinzufuegen ------------------------------------------
// KEIN signOut: die jetzige Sitzung bleibt gueltig und in der Liste, damit
// ein Abbruch zurueckfuehrt. Erst die naechste erfolgreiche Anmeldung
// ersetzt sie.
async function kwHinzufuegen(){
 await kwMerken();
 if(typeof $!=="function")return;
 const zurueck=$("kwZurueck");
 if(zurueck)zurueck.hidden=false;
 const hin=$("kwLoginHinweis");
 if(hin)hin.hidden=false;
 if($("loginUser"))$("loginUser").value="";
 if($("loginPass"))$("loginPass").value="";
 if($("loginError"))$("loginError").textContent="";
 if($("appRoot"))$("appRoot").hidden=true;
 if($("authScreen"))$("authScreen").hidden=false;
}
// Abbruch: zurueck in die laufende Sitzung, ohne irgendetwas anzufassen.
function kwHinzufuegenAbbrechen(){
 if(typeof $!=="function")return;
 const zurueck=$("kwZurueck"); if(zurueck)zurueck.hidden=true;
 const hin=$("kwLoginHinweis"); if(hin)hin.hidden=true;
 if($("authScreen"))$("authScreen").hidden=true;
 if($("appRoot"))$("appRoot").hidden=false;
}

// ---- Anzeige --------------------------------------------------------------
function kwZeileHtml(k){
 const wo=k.firma?esc(k.firma):"Firma unbekannt";
 return `<div class="kw-zeile">
  <div class="kw-text"><b>${esc(k.name)}</b><div class="small">${wo}</div></div>
  <button type="button" class="kw-klein kw-k-blau" data-kw-zu="${esc(k.id)}">wechseln</button>
  <button type="button" class="kw-klein kw-k-grau" data-kw-weg="${esc(k.id)}">entfernen</button>
 </div>`;
}
function kwListeHtml(){
 const andere=kwAndere();
 return `${andere.length
   ? andere.map(kwZeileHtml).join("")
   : `<p class="small">Auf diesem Gerät ist nur dieses eine Konto gespeichert.</p>`}
  <div class="bar"><button type="button" class="gray" data-kw-neu="1">＋ Weiteres Konto hinzufügen</button></div>
  <div class="small kw-warnung">Ein gemerktes Konto lässt sich auf diesem Gerät <b>ohne Passwort</b> öffnen. Auf einem geteilten Gerät deshalb wieder entfernen.</div>
  <div class="small" id="kwMeldung"></div>`;
}
function kwZeichnen(){
 const box=(typeof $==="function")?$("kontenBox"):document.getElementById("kontenBox");
 if(box)box.innerHTML=kwListeHtml();
 // Der Knopf oben rechts erscheint nur, wenn es wirklich etwas zu wechseln
 // gibt - sonst waere er ein Knopf, der nichts tut.
 const knopf=(typeof $==="function")?$("kontoWechseln"):document.getElementById("kontoWechseln");
 if(knopf)knopf.hidden=!kwMehrereDa();
}
function kwMeldung(text){
 const m=(typeof $==="function")?$("kwMeldung"):document.getElementById("kwMeldung");
 if(m)m.textContent=text||"";
 else if(text&&typeof alert==="function")alert(text);
}
function kwOeffnen(){
 if(typeof $!=="function")return;
 kwZeichnen();
 const modal=$("kontenModal");
 if(modal)modal.hidden=false;
}

// ---- Klicks ---------------------------------------------------------------
document.addEventListener("click",async e=>{
 if(e.target.closest("[data-kw-oeffnen]")){ kwOeffnen(); return }
 if(e.target.closest("[data-kw-zu-abbrechen]")){ kwHinzufuegenAbbrechen(); return }
 if(e.target.closest("[data-kw-neu]")){
  const modal=$("kontenModal"); if(modal)modal.hidden=true;
  await kwHinzufuegen(); return;
 }
 const weg=e.target.closest("[data-kw-weg]");
 if(weg){
  kwEntfernen(weg.getAttribute("data-kw-weg"));
  kwZeichnen();
  kwMeldung("Der gespeicherte Zugang wurde von diesem Gerät entfernt.");
  return;
 }
 const zu=e.target.closest("[data-kw-zu]");
 if(zu){
  kwMeldung("Wird gewechselt …");
  const r=await kwWechseln(zu.getAttribute("data-kw-zu"));
  if(!r.ok){ kwZeichnen(); kwMeldung(r.meldung) }
  return;
 }
});
