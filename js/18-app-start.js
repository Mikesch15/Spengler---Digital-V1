"use strict";
// ---- Pflichtfelder markieren (v2.70) --------------------------
// Einmal beim Start: das Formular-Markup ist statisch. Felder, die erst
// zur Laufzeit entstehen (Ort-/Seitenbleche), rufen die Funktion selbst
// nochmals fuer ihren Bereich auf.
markierePflichtfelder();

// ---- Start: bestehende Sitzung prüfen -------------------------
(async()=>{
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
 if(!$("reportScreen").hidden||!$("measurementEditModal").hidden||!$("ausmassEditModal").hidden)isDirty=true;
});
window.addEventListener("beforeunload",e=>{
 if(!isDirty)return;
 e.preventDefault();
 e.returnValue="";
});
