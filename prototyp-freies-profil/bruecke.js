"use strict";
// ===========================================================================
// BRÜCKE zum bestehenden Modul  ·  Prototyp Freies Profil
// ===========================================================================
// Der Prototyp rechnet und zeichnet mit der Fachlogik der laufenden App,
// nicht mit einer nachgebauten. Übernommen werden – zeichengenau, siehe
// uebernehmen.js – aus js/14-freies-profil.js:
//
//   abgerundeterPfad()          runde Biegungen
//   ansichtsPfeilSvg()          Ansichtsrichtung
//   generateProfilDiagramSvg()  die ganze Profilzeichnung
//   fpPruefeErkannteSchenkel()  Prüfung der Skizzen-Erkennung
//   FP_MAX_SCHENKEL, FP_ERKENNUNG_ZEITGRENZE_MS
//
// Diese Datei stellt nur bereit, was jene Funktionen erwarten.
// ===========================================================================

function $(id){return document.getElementById(id)}
function esc(v){
 return String(v===null||v===undefined?"":v)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// generateProfilDiagramSvg() liest die Ansichtsrichtung direkt aus einem
// Formularfeld mit der ID "fp_ansicht" - genau wie in der App. Damit die
// Funktion unverändert bleiben kann, gibt es dieses Feld auch hier; es liegt
// unsichtbar im Rumpf (#fp_ansicht) und wird vom Prototyp gesetzt.

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

// Adresse der Erkennung. In der App kommen beide Werte aus js/01-basis.js;
// im Prototyp stehen sie hier, damit die Testapp ohne die App läuft. Der
// Anon-Key ist derselbe öffentliche Schlüssel, den die ausgelieferte App im
// Browser trägt - kein Geheimnis, keine service_role.
const SUPABASE_URL="https://nfgryuzkpwjfmdlmevuy.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_U1YsWEdl4X9U94JO4sL5Lg_7_dU0erM";
