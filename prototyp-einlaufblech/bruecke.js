"use strict";
// ===========================================================================
// BRÜCKE zum bestehenden Modul  ·  Prototyp Einlaufblech gerade
// ===========================================================================
// Der Prototyp rechnet mit der Fachlogik der laufenden App, nicht mit einer
// nachgebauten. Übernommen werden – zeichengenau, siehe uebernommen.js –
//
//   einlaufblechDiagramSvg()          js/11-einlaufblech-gerade.js
//   teileLaengeInStuecke()            js/13-einlaufblech-konisch.js
//   generateEbkGrundriss()            js/13-einlaufblech-konisch.js
//   baueEinlaufblechStueckeAusRinne() js/13-einlaufblech-konisch.js
//   ansichtsPfeilSvg()                js/14-freies-profil.js
//
// Diese Datei stellt nur bereit, was jene Funktionen beim Laden erwarten.
// ===========================================================================

function $(id){return document.getElementById(id)}
function esc(v){
 return String(v===null||v===undefined?"":v)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// Firmeneinstellungen des Einlaufblechs – dieselben Schlüssel und dieselben
// Vorgabewerte wie EINLAUFBLECH_STANDARD in js/01-basis.js der laufenden App.
// In der App liegen sie im localStorage unter "sd_einlaufblechSettings";
// der Prototyp benutzt einen eigenen Schlüssel, damit er die App nicht
// beeinflusst.
const EB_STANDARD=Object.freeze({
 stoss_laenge:2000, ueberlappung:70, gehrungszugabe:100,
 umschlag_oben:12, umschlag_unten:12, rest_schwelle:500, end_zugabe:10
});
const EB_EINSTELLUNGEN_SCHLUESSEL="pebg_einstellungen";
let einlaufblechSettings=(function(){
 try{
  const g=JSON.parse(localStorage.getItem(EB_EINSTELLUNGEN_SCHLUESSEL)||"null");
  return g&&typeof g==="object"?{...EB_STANDARD,...g}:{...EB_STANDARD};
 }catch(e){return {...EB_STANDARD}}
})();

// Materialkatalog – Struktur wie die Tabelle measurement_materials der App.
// Im Prototyp lokal, damit ohne Supabase getestet werden kann. Bewusst OHNE
// Artikelnummern und Preise: die kommen später aus der importierten,
// firmeneigenen Materialliste.
const measurementMaterials=[
 {id:3,name:"Kupfer"},
 {id:2,name:"Titanzink"},
 {id:5,name:"Chromstahl, verzinnt"},
 {id:4,name:"CrNi-Stahl"},
 {id:1,name:"Aluminium (Aluman)"},
 {id:6,name:"Stahl, verzinkt"}
];
function findMeasurementMaterial(id){
 return measurementMaterials.find(x=>String(x.id)===String(id))||null;
}
