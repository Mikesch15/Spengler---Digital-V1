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
//     * Loeschen und Archivieren, Mitarbeiterverwaltung, Rechte,
//       Einstellungen, Materialkataloge, Reststuecke, System-Administration.
//     * Fotos ansehen (signierte URLs), PDF mit Fotos.
//     * Anmelden ohne bestehende Sitzung, Suche ueber die Datenbank,
//       Verlauf.
//     Dafuer ist offlineSperrtSpeichern() weiterhin die eine Stelle mit der
//     einen klaren Absage.
//
// SEIT v3.04: Erfassen geht ohne Verbindung.
//   Projekt anlegen, Massaufnahme, Ausmass, Regierapport und Feedback wandern
//   in eine Warteschlange auf dem Geraet (js/43-warteschlange.js) und werden
//   uebertragen, sobald wieder eine Verbindung besteht - mit temporaeren IDs,
//   Fotos und einer echten Konfliktpruefung. Die frueher hier dokumentierte
//   Aussage "eine Warteschlange ist bewusst nicht gebaut" gilt damit NICHT
//   mehr; sie steht in der Fassung von v2.70 und ist ueberholt.
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
 // Seit v3.04 laesst sich auch ohne Verbindung erfassen - der Hinweis darf
 // deshalb nicht laenger das Gegenteil behaupten.
 el.innerHTML="📴 <b>Keine Verbindung.</b> Angezeigt werden die zuletzt geladenen Daten"
  +(wann&&!isNaN(wann.getTime())?` (Stand ${esc(wann.toLocaleString("de-CH"))})`:"")
  +". Erfassen geht weiter: Projekte, Massaufnahmen, Ausmasse und Rapporte warten auf "
  +"diesem Gerät und werden übertragen, sobald wieder eine Verbindung besteht. "
  +"Löschen, Archivieren und die Verwaltung brauchen eine Verbindung.";
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
