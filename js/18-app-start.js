"use strict";
// ---- Pflichtfelder markieren (v2.70) --------------------------
// Einmal beim Start: das Formular-Markup ist statisch. Felder, die erst
// zur Laufzeit entstehen (Ort-/Seitenbleche), rufen die Funktion selbst
// nochmals fuer ihren Bereich auf.
markierePflichtfelder();
// Info-Knoepfe fuer Tastatur und Screenreader beschriften (js/41-hilfe.js).
if(typeof hilfeKnoepfeBeschriften==="function")hilfeKnoepfeBeschriften();

// ---- Start: bestehende Sitzung prüfen -------------------------
// v3.103: ?reset=... bzw. ?einladung=... in der URL zeigen einen der
// beiden neuen, oeffentlich erreichbaren Bildschirme (siehe
// js/69-email-auth.js) statt der normalen Anmeldung/Sitzungspruefung.
(async()=>{
 if(typeof emailAuthBootWeiche==="function"&&emailAuthBootWeiche())return;
 const {data:{session}}=await sb.auth.getSession();
 if(session)await afterLogin();
})();

// ---- Service Worker registrieren (macht die App installierbar) ----
if("serviceWorker" in navigator){
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
 });
}

// ---- Warnung vor Datenverlust bei ungespeicherten Änderungen ----
document.addEventListener("input",e=>{
 if(!$("reportScreen").hidden||!$("measurementEditModal").hidden||!$("ausmassEditModal").hidden||!$("angebotEditModal").hidden)isDirty=true;
});
window.addEventListener("beforeunload",e=>{
 if(!isDirty)return;
 e.preventDefault();
 e.returnValue="";
});
