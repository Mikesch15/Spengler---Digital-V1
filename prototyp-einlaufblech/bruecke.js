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
 umschlag_oben:12, umschlag_unten:12, rest_schwelle:500, end_zugabe:10,
 // Neu im Prototyp, in der App noch nicht vorhanden:
 // Abstand der Haltebleche ("GAVA Blech"). 500 mm ist der Vorgabewert des
 // Halterabstands bei Rinne Halbrund - fachlich NICHT bestätigt, siehe
 // Bericht, offener Punkt.
 gava_abstand:500
});
// Rollenbreiten für die Zuschnitt-Optimierung. 1000 und 670 mm sind die
// Standardrollen; die übrigen liegen bereit und lassen sich in den
// Einstellungen dazuschalten (auch für andere Massaufnahmen brauchbar).
const ROLLEN_VORGABE=[
 {breite:1000,aktiv:true},{breite:670,aktiv:true},
 {breite:500,aktiv:false},{breite:400,aktiv:false},{breite:330,aktiv:false},
 {breite:250,aktiv:false},{breite:200,aktiv:false}
];
const ROLLEN_SCHLUESSEL="pebg_rollenbreiten";
let rollenbreiten=(function(){
 try{
  const g=JSON.parse(localStorage.getItem(ROLLEN_SCHLUESSEL)||"null");
  if(!Array.isArray(g)||!g.length)return ROLLEN_VORGABE.map(r=>({...r}));
  // Nur bekannte Breiten übernehmen, damit ein alter Eintrag nichts kaputt macht.
  return ROLLEN_VORGABE.map(r=>{
   const t=g.find(x=>Number(x&&x.breite)===r.breite);
   return {breite:r.breite,aktiv:t?!!t.aktiv:r.aktiv};
  });
 }catch(e){return ROLLEN_VORGABE.map(r=>({...r}))}
})();
function aktiveRollenbreiten(){
 return rollenbreiten.filter(r=>r.aktiv).map(r=>Number(r.breite))
  .filter(b=>Number.isFinite(b)&&b>0).sort((a,b)=>b-a);
}
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
