"use strict";
// ===========================================================================
// BRÜCKE zum bestehenden Modul  ·  Prototyp Einlaufblech konisch
// ===========================================================================
// Der Prototyp rechnet mit der Fachlogik der laufenden App, nicht mit einer
// nachgebauten. Übernommen werden – zeichengenau, siehe uebernommen.js –
//
//   einlaufblechDiagramSvg()          js/11-einlaufblech-gerade.js
//   teileLaengeInStuecke()            js/13-einlaufblech-konisch.js
//   splitLengthIntoPieces()           js/13-einlaufblech-konisch.js
//   generateEbkGrundriss()            js/13-einlaufblech-konisch.js
//   baueEinlaufblechStueckeAusRinne() js/13-einlaufblech-konisch.js
//   ansichtsPfeilSvg()                js/14-freies-profil.js
//   calcEbkPiece()                    js/14-freies-profil.js
//   ebkRestbreite()                   js/14-freies-profil.js
//
// Beachten: der Rechenkern des KONISCHEN Blechs (enges Mass je Seite,
// Restbreite) steht in der laufenden App nicht in js/13, sondern in
// js/14-freies-profil.js. Beide Dateien sind hier die Quelle.
//
// Diese Datei stellt nur bereit, was jene Funktionen beim Laden erwarten.
// ===========================================================================

function $(id){return document.getElementById(id)}
function esc(v){
 return String(v===null||v===undefined?"":v)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// Firmeneinstellungen des KONISCHEN Einlaufblechs – dieselben Schlüssel und
// dieselben Vorgabewerte wie EINLAUFBLECH_STANDARD in js/01-basis.js. In der
// App liegen sie im localStorage unter "sd_einlaufblechKonischSettings" und
// sind ausdrücklich unabhängig von denen des geraden Blechs. Der Prototyp
// benutzt einen eigenen Schlüssel, damit er die App nicht beeinflusst.
const EBK_STANDARD=Object.freeze({
 stoss_laenge:2000, ueberlappung:70, gehrungszugabe:100,
 umschlag_oben:12, umschlag_unten:12, rest_schwelle:500, end_zugabe:10
});
// Rollenbreiten für die Zuschnitt-Optimierung. 1000 und 670 mm sind die
// Standardrollen; die übrigen lassen sich in den Einstellungen dazuschalten.
// Gleiche Liste wie im Prototyp des geraden Blechs und wie seit v2.74 in der
// App (app_settings.blech_rollenbreiten).
const ROLLEN_VORGABE=[
 {breite:1000,aktiv:true},{breite:670,aktiv:true},
 {breite:500,aktiv:false},{breite:400,aktiv:false},{breite:330,aktiv:false},
 {breite:250,aktiv:false},{breite:200,aktiv:false}
];
const ROLLEN_SCHLUESSEL="pebk_rollenbreiten";
let rollenbreiten=(function(){
 try{
  const g=JSON.parse(localStorage.getItem(ROLLEN_SCHLUESSEL)||"null");
  if(!Array.isArray(g)||!g.length)return ROLLEN_VORGABE.map(r=>({...r}));
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
const EBK_EINSTELLUNGEN_SCHLUESSEL="pebk_einstellungen";
// Der übernommene Rechenkern aus js/14 liest einlaufblechKonischSettings –
// der Name muss deshalb genau so heissen.
let einlaufblechKonischSettings=(function(){
 try{
  const g=JSON.parse(localStorage.getItem(EBK_EINSTELLUNGEN_SCHLUESSEL)||"null");
  return g&&typeof g==="object"?{...EBK_STANDARD,...g}:{...EBK_STANDARD};
 }catch(e){return {...EBK_STANDARD}}
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
