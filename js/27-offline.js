"use strict";
// ===========================================================================
// Offline-Betrieb  (v2.70, Feedback 7)
// ===========================================================================
// EHRLICHER UMFANG - was hier gebaut ist und was ausdruecklich nicht:
//
//   GEHT OFFLINE
//     * Die App startet und laesst sich bedienen (Service Worker, seit je).
//     * Bereits geladene Stammdaten bleiben sichtbar: Projekte, Material,
//       Funktionen/Ansaetze, Blitzschutz-Katalog, Massaufnahme-Materialien,
//       Firmeneinstellungen. Sie werden beim letzten Laden mit Netz auf dem
//       Geraet gesichert und beim Start ohne Netz von dort geholt.
//     * Alle Rechenmodule (alle elf Massaufnahme-Arten, Kehle, Rinne,
//       Lukarne, Einfassung, Anschlussblech) rechnen und zeichnen weiter -
//       sie brauchen kein Netz.
//     * Ein deutlicher Hinweis sagt, dass gerade keine Verbindung besteht.
//
//   GEHT OFFLINE NICHT
//     * Speichern (Projekt, Massaufnahme, Ausmass, Regierapport, Feedback).
//       Statt einer kryptischen Netzwerkmeldung kommt eine klare Absage,
//       damit niemand glaubt, seine Arbeit sei gesichert.
//     * Fotos und Skizzen hochladen, PDF mit Fotos (signierte URLs).
//     * Anmelden ohne bestehende Sitzung, Suche ueber die Datenbank,
//       Verlauf, System-Administration.
//
// Eine vollstaendige Offline-Erfassung mit Warteschlange, eigenen IDs,
// Wiederholung und Konfliktloesung ist BEWUSST NICHT gebaut. Halb umgesetzt
// waere sie gefaehrlicher als gar nicht - siehe Bericht zu v2.70.
//
// DATENSCHUTZ: Der lokale Zwischenspeicher gehoert immer genau einer Firma
// und wird beim Abmelden und bei jedem Firmenwechsel geloescht. Es liegen
// niemals Daten zweier Firmen gleichzeitig auf dem Geraet.
// ===========================================================================

const OFFLINE_SCHLUESSEL="sd_offlineDaten";
const OFFLINE_VERSION=1;

function offlineIstOffline(){
 return typeof navigator!=="undefined"&&navigator.onLine===false;
}

// Zeigt oder verbirgt den Hinweis. "stand" ist der Zeitpunkt der letzten
// erfolgreichen Ladung, falls bekannt.
function offlineHinweisZeigen(anZeigen,stand){
 const el=typeof $==="function"?$("offlineHinweis"):null;
 if(!el)return;
 if(!anZeigen){el.hidden=true;return}
 const wann=stand?new Date(stand):null;
 el.innerHTML="📴 <b>Keine Verbindung.</b> Angezeigt werden die zuletzt geladenen Daten"
  +(wann&&!isNaN(wann.getTime())?` (Stand ${esc(wann.toLocaleString("de-CH"))})`:"")
  +". Neue Einträge lassen sich erst wieder speichern, sobald eine Verbindung besteht.";
 el.hidden=false;
}

// ---- Lokaler Zwischenspeicher --------------------------------------------
function offlineCacheSchreiben(firmaId,daten){
 if(!firmaId)return false;
 try{
  localStorage.setItem(OFFLINE_SCHLUESSEL,JSON.stringify({
   v:OFFLINE_VERSION,firma:String(firmaId),stand:new Date().toISOString(),daten
  }));
  return true;
 }catch(e){return false}
}
function offlineCacheLesen(firmaId){
 if(!firmaId)return null;
 let roh=null;
 try{roh=JSON.parse(localStorage.getItem(OFFLINE_SCHLUESSEL)||"null")}catch(e){roh=null}
 if(!roh||roh.v!==OFFLINE_VERSION)return null;
 // Fremde Firma: nichts herausgeben und den Rest sofort entfernen.
 if(String(roh.firma)!==String(firmaId)){offlineCacheLeeren();return null}
 return roh;
}
function offlineCacheLeeren(){
 try{localStorage.removeItem(OFFLINE_SCHLUESSEL)}catch(e){}
}

// ---- Zentrale Sperre fuer alle Speicherwege ------------------------------
// Eine Stelle, eine Meldung. Wird vor jedem Speichern gefragt.
function offlineSperrtSpeichern(was){
 if(!offlineIstOffline())return false;
 alert("Keine Verbindung.\n\n"+(was||"Dieser Eintrag")+" kann offline nicht gespeichert werden. "
  +"Die Eingaben bleiben im Formular stehen – bitte speichern, sobald wieder eine Verbindung besteht.");
 return true;
}

// ---- Verdrahtung ----------------------------------------------------------
if(typeof window!=="undefined"){
 window.addEventListener("online",()=>offlineHinweisZeigen(false));
 window.addEventListener("offline",()=>{
  const stand=(typeof offlineStand!=="undefined")?offlineStand:null;
  offlineHinweisZeigen(true,stand);
 });
}
let offlineStand=null;   // Zeitpunkt der zuletzt erfolgreich geladenen Daten
