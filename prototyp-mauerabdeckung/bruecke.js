"use strict";
// ===========================================================================
// BRÜCKE zum bestehenden Modul  ·  Prototyp Mauerabdeckung
// ===========================================================================
// Der Prototyp rechnet mit der Fachlogik der laufenden App, nicht mit einer
// nachgebauten. Übernommen werden – zeichengenau, siehe uebernommen.js –
//
//   madMaterialTabelle()      js/12b-mauerabdeckung.js
//   computeMadBoundaries()    js/12b-mauerabdeckung.js
//   calcMadSchieber()         js/12b-mauerabdeckung.js
//   berechneMadStueckliste()  js/12b-mauerabdeckung.js
//   madBiegeVorgabe()         js/12b-mauerabdeckung.js
//   madProfilMasse()          js/12b-mauerabdeckung.js
//   madNormHinweise()         js/12b-mauerabdeckung.js
//   madProfilSvgAus()         js/12b-mauerabdeckung.js
//   generateMadProfilSvg()    js/12b-mauerabdeckung.js
//   calcDilaPositionsInStretch()  js/12-rinne-halbrund.js  (Verteilung)
//   generateRinneGrundriss()      js/12-rinne-halbrund.js  (Grundriss)
//   abgerundeterPfad(), ansichtsPfeilSvg()  js/14-freies-profil.js
//   findMeasurementMaterial(), measurementMaterialOrFallback()  js/01-basis.js
//
// Diese Datei stellt nur bereit, was jene Funktionen beim Laden erwarten.
// ===========================================================================

function $(id){return document.getElementById(id)}
function esc(v){
 return String(v===null||v===undefined?"":v)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// Materialkatalog – Struktur und Werte wie die Tabelle measurement_materials
// der App (Einstellungen → Massaufnahmen → "Material"). Im Prototyp lokal,
// damit ohne Supabase getestet werden kann. Bewusst OHNE Artikelnummern und
// Preise: die kommen später aus der importierten, firmeneigenen Materialliste.
//
// max_abstand_mm / ab_fixpunkt_mm sind genau die Werte, die madMaterialTabelle()
// aus dem Katalog liest – SIA 271, Tabelle 8.4.2. Sie werden hier NICHT neu
// festgelegt, sondern aus dem bestehenden Katalog übernommen.
let measurementMaterials=[
 {id:1,name:"Aluminium (Aluman)",  legacy_key:"aluminium",          max_abstand_mm:4000,ab_fixpunkt_mm:2000},
 {id:2,name:"Titanzink",           legacy_key:"titanzink",          max_abstand_mm:5000,ab_fixpunkt_mm:2500},
 {id:3,name:"Kupfer",              legacy_key:"kupfer",             max_abstand_mm:6000,ab_fixpunkt_mm:3000},
 {id:4,name:"CrNi-Stahl",          legacy_key:"crni_stahl",         max_abstand_mm:6000,ab_fixpunkt_mm:3000},
 {id:5,name:"Chromstahl, verzinnt",legacy_key:"chromstahl_verzinnt",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
 {id:6,name:"Stahl, verzinkt",     legacy_key:"stahl_verzinkt",     max_abstand_mm:8000,ab_fixpunkt_mm:4000}
];

// generateRinneGrundriss() zeichnet die Anschlusstyp-Symbole der Rinne aus
// dieser Liste. Die Mauerabdeckung hat keine Anschlusstypen – die Liste bleibt
// leer, damit die Funktion unverändert benutzt werden kann.
let rinneFittingTypes=[];

// Rollenbreiten für den Zuschnitt aus Rollenblech. 1000 und 670 mm sind die
// Standardrollen; die übrigen lassen sich dazuschalten. In der App stehen sie
// firmenweit in app_settings.blech_rollenbreiten und gelten für alle
// Massaufnahmen, die aus Rollenblech zugeschnitten werden.
const ROLLEN_STANDARD=Object.freeze([1000,670]);
const ROLLEN_WAEHLBAR=Object.freeze([1000,670,500,400,330,250,200]);
const ROLLEN_SCHLUESSEL="pmad_rollenbreiten";
let rollenbreiten=(function(){
 try{
  const g=JSON.parse(localStorage.getItem(ROLLEN_SCHLUESSEL)||"null");
  if(!Array.isArray(g)||!g.length)return ROLLEN_WAEHLBAR.map(b=>({breite:b,aktiv:ROLLEN_STANDARD.indexOf(b)>=0}));
  // Nur bekannte Breiten übernehmen, damit ein alter Eintrag nichts kaputt macht.
  return ROLLEN_WAEHLBAR.map(b=>{
   const t=g.find(x=>Number(x&&x.breite)===b);
   return {breite:b,aktiv:t?!!t.aktiv:ROLLEN_STANDARD.indexOf(b)>=0};
  });
 }catch(e){return ROLLEN_WAEHLBAR.map(b=>({breite:b,aktiv:ROLLEN_STANDARD.indexOf(b)>=0}))}
})();
function aktiveRollenbreiten(){
 return rollenbreiten.filter(r=>r.aktiv).map(r=>Number(r.breite))
  .filter(b=>Number.isFinite(b)&&b>0).sort((a,b)=>b-a);
}
function rollenSpeichern(){
 try{localStorage.setItem(ROLLEN_SCHLUESSEL,JSON.stringify(rollenbreiten))}catch(e){}
}

// Zuschnittzugaben. In der App stehen sie firmenweit in app_settings
// (mad_boden_mass_mm / mad_schieber_mass_mm) und werden in js/05-daten-laden.js
// nach madBodenMass / madSchieberMass geladen. Im Prototyp sind sie
// gerätebezogen im localStorage, damit ohne Supabase getestet werden kann.
// Die Vorgaben sind die Werte, die in der laufenden App tatsächlich hinterlegt
// sind (Boden 0 mm, Schieber 10 mm) – keine erfundenen Zahlen.
const MAD_ZUGABE_STANDARD=Object.freeze({boden_mass:0, schieber_mass:10});
const MAD_ZUGABE_SCHLUESSEL="pmad_zugaben";
let madZugaben=(function(){
 try{
  const g=JSON.parse(localStorage.getItem(MAD_ZUGABE_SCHLUESSEL)||"null");
  return g&&typeof g==="object"?{...MAD_ZUGABE_STANDARD,...g}:{...MAD_ZUGABE_STANDARD};
 }catch(e){return {...MAD_ZUGABE_STANDARD}}
})();
// Genau die beiden Namen, die berechneMadStueckliste() in der App bekommt.
let madBodenMass=Number(madZugaben.boden_mass)||0;
let madSchieberMass=Number(madZugaben.schieber_mass)||0;
function madZugabenSpeichern(){
 madBodenMass=Number(madZugaben.boden_mass)||0;
 madSchieberMass=Number(madZugaben.schieber_mass)||0;
 try{localStorage.setItem(MAD_ZUGABE_SCHLUESSEL,JSON.stringify(madZugaben))}catch(e){}
}
