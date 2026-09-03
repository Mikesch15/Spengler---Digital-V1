"use strict";
// ===========================================================================
// BRÜCKE zum bestehenden Modul  ·  Prototyp Rinne Halbrund
// ===========================================================================
// Der Prototyp lädt js/12-rinne-halbrund.js UNVERÄNDERT aus der laufenden
// App. Diese Datei stellt nur das Wenige bereit, was jene Datei beim Laden
// erwartet: die Hilfsfunktionen $ und esc, die beiden Katalogtabellen und
// das Dila-Mass. Dadurch rechnet der Prototyp nachweislich mit DERSELBEN
// Fachlogik wie die produktive App – es ist nichts nachgebaut.
//
// Übernommen werden dadurch unverändert:
//   calcRinneSegment()            Zuschnitt je Segment inkl. Anschlussmasse
//   computeRinneBoundaries()      Fixpunkte und Schiebestutzen im Verlauf
//   calcDilaPositionsInStretch()  Dila-Verteilung nach SPI/SIA
//   calcRinneDilas()              Dilas über den ganzen Verlauf
//   berechneRinneStueckliste()    Stückliste zwischen allen Grenzpunkten
//   generateRinneGrundriss()      Grundriss-Zeichnung des Verlaufs
//   rinneMaterialTabelle()        Ausdehnungswerte je Material
// ===========================================================================

function $(id){return document.getElementById(id)}
function esc(v){
 return String(v===null||v===undefined?"":v)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// Anschlusstypen – 1:1 der Katalog der produktiven App (Tabelle
// rinne_fitting_types). Im Prototyp lokal, damit ohne Supabase getestet
// werden kann; die Struktur ist identisch.
const rinneFittingTypes=[
 {id:1,name:"Offenes Ende",     symbol:"offen",mass_mm:0,   angle_deg:0,  is_fixpunkt:false,is_schiebestutzen:false},
 {id:2,name:"Aussenecke 90°",   symbol:"AE90", mass_mm:-110,angle_deg:-90,is_fixpunkt:true, is_schiebestutzen:false},
 {id:3,name:"Innenecke 90°",    symbol:"IE90", mass_mm:-110,angle_deg:90, is_fixpunkt:true, is_schiebestutzen:false},
 {id:4,name:"Ablaufstutzen",    symbol:"ABL",  mass_mm:0,   angle_deg:0,  is_fixpunkt:true, is_schiebestutzen:false},
 {id:5,name:"Boden",            symbol:"BD",   mass_mm:0,   angle_deg:0,  is_fixpunkt:false,is_schiebestutzen:false},
 {id:7,name:"Schiebestutzen",   symbol:"SS",   mass_mm:40,  angle_deg:0,  is_fixpunkt:false,is_schiebestutzen:true},
 {id:8,name:"Gehrschildwinkel", symbol:"GSW",  mass_mm:0,   angle_deg:80, is_fixpunkt:false,is_schiebestutzen:false}
];

// Materialien mit den Ausdehnungswerten der produktiven App
// (Tabelle measurement_materials). Die im Auftrag genannten Materialien
// sind darin bereits enthalten.
const measurementMaterials=[
 {id:3,name:"Kupfer",              max_abstand_mm:6000,ab_fixpunkt_mm:3000},
 {id:2,name:"Titanzink",           max_abstand_mm:5000,ab_fixpunkt_mm:2500},
 {id:5,name:"Chromstahl, verzinnt",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
 {id:4,name:"CrNi-Stahl",          max_abstand_mm:6000,ab_fixpunkt_mm:3000},
 {id:1,name:"Aluminium (Aluman)",  max_abstand_mm:4000,ab_fixpunkt_mm:2000},
 {id:6,name:"Stahl, verzinkt",     max_abstand_mm:8000,ab_fixpunkt_mm:4000}
];
function measurementMaterialOrFallback(id){
 const m=measurementMaterials.find(x=>String(x.id)===String(id));
 return m||measurementMaterials[0];
}
function findMeasurementMaterial(id){
 return measurementMaterials.find(x=>String(x.id)===String(id))||null;
}

// Zuschlagsmass an einer Dila – in der App eine Firmeneinstellung.
let rinneDilaMass=0;
