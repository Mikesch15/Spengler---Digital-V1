"use strict";
// ============================================================
// Kehle · Winkelberechnung für Kehlen an Lukarnen
//
// Fachliche Referenz ist ausschliesslich die mitgelieferte Vorlage
// "Winkel zu Kehlen Lukarne MA.xltx", Blatt "Winkelberechnung
// Kehle  Grat", Spalte C (Kehle; Spalte D/E ist die Grat-Variante und
// wird hier NICHT verwendet). Jede Formel unten trägt ihre Excel-Zelle
// als Kommentar. Es wurde nichts vereinfacht, umgestellt oder durch
// eigene Geometrie ersetzt.
//
// WICHTIG – vier Stellen weichen bewusst vom Fliesstext des Auftrags
// ab, weil dort Zellbezüge falsch übertragen wurden. Massgeblich ist
// die Excel-Datei selbst (so ausdrücklich im Auftrag festgelegt):
//   C18  Y  = A / COS(b)      – nicht COS(m)
//   C20  AA = A * TAN(b)      – nicht TAN(m)
//   C22  AC = Q / COS(e)      – nicht COS(n/2)
//   C31  f  = l + 90          – nicht o + 90
// Mit den Excel-Formeln ergibt das Beispiel NH=42.5 / NL=23.5 / GL=100
// exakt die im Auftrag geforderten b=66.48°, c=122.77°, d=47.46°;
// mit den Formeln aus dem Fliesstext käme d=104.68° heraus.
//
// Reihenfolge der Auswertung (Excel rechnet zellweise, hier muss sie
// zirkelfrei aufgebaut sein):
//   Q,R,S,T -> U,V -> W -> A -> e -> l,m -> n,o,p -> b,c
//   -> X,Y,Z,AA -> AB -> AC -> AD,AE -> h,i,k -> d -> f,g
// ============================================================

const KEHLE_RAD = g => g / 180 * Math.PI;   // Excel: x/180*PI()
const KEHLE_DEG = r => r * 180 / Math.PI;   // Excel: x*180/PI()

// Beschriftungen wörtlich aus Spalte A der Excel (bzw. aus dem Auftrag,
// wo die Excel für die Kehle keine eigene Zeilenbeschriftung führt).
const KEHLE_LABELS = Object.freeze({
  b:  "Winkel First zu Kehle an Lukarne in Dachfläche",
  c:  "Winkel Winkelhalbierende zu Kehle an Hauptdach in Dachfläche",
  d:  "Biegewinkel Kehlblech",
  A:  "Länge der Kehle (scharf)",
  e:  "Neigung der Kehle",
  f:  "Winkel Traufe zu Kehle an Hauptdach in Dachfläche",
  g:  "Winkel Traufe zu Kehle an Lukarne in Dachfläche",
  h:  "Winkel Dachfläche Hauptdach zu senkrechter Ebene Kehle",
  i:  "Winkel Dachfläche Lukarne zu senkrechter Ebene Kehle",
  k:  "Total Winkel Dachfläche Lukarne zu Dachfläche Hauptdach in Ebene senkrecht zu Kehllinie",
  l:  "Winkel Gefällslinie zu Kehle an Hauptdach in Dachfläche",
  m:  "Winkel Gefällslinie zu Kehle an Lukarne in Dachfläche",
  n:  "2 × Winkel Gefällslinie zu Kehle an Lukarne in Dachfläche",
  o:  "Winkel Waagrechte in Hauptdach zu Kehle an Hauptdach in Dachfläche",
  p:  "Winkel Waagrechte in Hauptdach zu Kehle an Hauptdach in Dachfläche (Gegenwinkel, 180° − o)",
  Q:  "Gefällshöhe",
  R:  "Gefällslänge auf Hauptdach",
  S:  "Ausladung Hauptdach im Grundriss",
  T:  "Ausladung Lukarne im Grundriss",
  tanU: "tangens Ausl. Lukarne / Ausl. Hauptdach (für Winkel Grundriss Hauptdach)",
  tanV: "tangens Ausl. Hauptdach / Ausl. Lukarne (für Winkel Grundriss Lukarne)",
  U:  "Winkel Gefällslinie zu Kehle an Hauptdach im Grundriss",
  V:  "Winkel Gefällslinie zu Kehle an Lukarne im Grundriss",
  U90: "Winkel Traufe zu Kehle an Hauptdach im Grundriss",
  V90: "Winkel Traufe zu Kehle an Lukarne im Grundriss",
  W:  "Länge der Kehle im Grundriss",
  X:  "waagrechte Länge von Kehle bis wahre Länge Hauptdach",
  Y:  "waagrechte Länge (Firstlänge) von Kehle bis wahre Länge Lukarne",
  Z:  "wahre Länge Hauptdach",
  AA: "wahre Länge Lukarne",
  AB: "Gesamtlänge der Teilstrecken",
  AC: "schiefe Höhe Traufpunkt Kehle senkrecht zu Teilstrecken",
  AD: "Teilstrecke Hauptdach",
  AE: "Teilstrecke Lukarne",
  mitte: "Innenwinkel zu Mittelrippe (k / 2)"
});

// Kurzform fuer den Bildschirm: die Excel-Bezeichnungen sind fuer eine
// Tabelle auf dem Handy zu lang. Der volle Wortlaut aus KEHLE_LABELS
// bleibt als Tooltip an der Zeile und steht unveraendert im PDF - hier
// wird nur gekuerzt, nichts umbenannt oder erfunden.
const KEHLE_HAUPT_KURZ = Object.freeze({
  b: "First \u2013 Kehle an Lukarne",
  c: "Winkelhalbierende \u2013 Kehle an Hauptdach",
  d: "Biegewinkel Kehlblech"
});
const KEHLE_KURZ = Object.freeze({
  A:  "L\u00e4nge Kehle (scharf)",
  e:  "Neigung Kehle",
  f:  "Traufe\u2013Kehle Hauptdach",
  g:  "Traufe\u2013Kehle Lukarne",
  h:  "Hauptdach zu senkr. Ebene",
  i:  "Lukarne zu senkr. Ebene",
  k:  "Total Lukarne\u2013Hauptdach",
  l:  "Gef\u00e4llslinie\u2013Kehle Hauptdach",
  m:  "Gef\u00e4llslinie\u2013Kehle Lukarne",
  n:  "2 \u00d7 Gef\u00e4llsl.\u2013Kehle Lukarne",
  o:  "Waagrechte\u2013Kehle Hauptdach",
  p:  "Waagrechte\u2013Kehle (Gegenwinkel)",
  Q:  "Gef\u00e4llsh\u00f6he",
  R:  "Gef\u00e4llsl\u00e4nge Hauptdach",
  S:  "Ausladung Hauptdach",
  T:  "Ausladung Lukarne",
  tanU: "tan Ausl. Lukarne / Hauptdach",
  tanV: "tan Ausl. Hauptdach / Lukarne",
  U:  "Gef\u00e4llsl.\u2013Kehle Hauptdach, Grundr.",
  V:  "Gef\u00e4llsl.\u2013Kehle Lukarne, Grundr.",
  U90: "Traufe\u2013Kehle Hauptdach, Grundr.",
  V90: "Traufe\u2013Kehle Lukarne, Grundr.",
  W:  "L\u00e4nge Kehle, Grundriss",
  X:  "waagr. L\u00e4nge bis wahre L. Hauptdach",
  Y:  "waagr. L\u00e4nge bis wahre L. Lukarne",
  Z:  "wahre L\u00e4nge Hauptdach",
  AA: "wahre L\u00e4nge Lukarne",
  AB: "Gesamtl\u00e4nge Teilstrecken",
  AC: "schiefe H\u00f6he Traufpunkt",
  AD: "Teilstrecke Hauptdach",
  AE: "Teilstrecke Lukarne",
  mitte: "Innenwinkel Mittelrippe (k/2)"
});

// Welche Werte sind Winkel (°) und welche Längen (mm)? Reine
// Verhältniszahlen (tanU/tanV) stehen in keiner der beiden Listen.
const KEHLE_WINKEL = Object.freeze(["b","c","d","e","f","g","h","i","k","l","m","n","o","p","U","V","U90","V90","mitte"]);
const KEHLE_LAENGEN = Object.freeze(["A","Q","R","S","T","W","X","Y","Z","AA","AB","AC","AD","AE"]);

// ---- Berechnung ----------------------------------------------------
// Liefert bei ungültiger Eingabe { ok:false, fehler:[...] } und rechnet
// gar nicht erst, statt NaN/Infinity zu erzeugen.
function kehleBerechnen(e) {
  const eingabe = e || {};
  const zahl = v => {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const NH = zahl(eingabe.nh), NL = zahl(eingabe.nl), GL = zahl(eingabe.gl);
  const fehler = [];
  if (NH === null) fehler.push("Neigung Hauptdach (NH) fehlt oder ist keine Zahl.");
  else if (!(NH > 0)) fehler.push("Neigung Hauptdach (NH) muss grösser als 0° sein.");
  else if (!(NH < 90)) fehler.push("Neigung Hauptdach (NH) muss kleiner als 90° sein.");
  if (NL === null) fehler.push("Neigung Lukarne (NL) fehlt oder ist keine Zahl.");
  else if (!(NL > 0)) fehler.push("Neigung Lukarne (NL) muss grösser als 0° sein.");
  else if (!(NL < 90)) fehler.push("Neigung Lukarne (NL) muss kleiner als 90° sein.");
  if (GL === null) fehler.push("Gefällslänge Lukarne (GL) fehlt oder ist keine Zahl.");
  else if (!(GL > 0)) fehler.push("Gefällslänge Lukarne (GL) muss grösser als 0 mm sein.");
  if (fehler.length) return { ok: false, fehler };

  const r = KEHLE_RAD, d = KEHLE_DEG;
  const w = { nh: NH, nl: NL, gl: GL };

  w.Q  = Math.sin(r(NL)) * GL;                 // C6  = SIN(C4/180*PI())*C5
  w.R  = w.Q / Math.sin(r(NH));                // C7  = C6/SIN(C3/180*PI())
  w.S  = w.Q / Math.tan(r(NH));                // C8  = C6/(TAN(C3/180*PI()))
  w.T  = Math.cos(r(NL)) * GL;                 // C9  = COS(C4/180*PI())*C5
  w.tanU = w.T / w.S;                          // C10 = C9/C8
  w.tanV = w.S / w.T;                          // C11 = C8/C9
  w.U  = d(Math.atan(w.tanU));                 // C12 = ATAN(C10)*180/PI()
  w.V  = d(Math.atan(w.tanV));                 // C13 = ATAN(C11)*180/PI()
  w.U90 = w.U + 90;                            // C14 = C12+90
  w.V90 = w.V + 90;                            // C15 = C13+90
  w.W  = Math.sqrt(w.S ** 2 + w.T ** 2);       // C16 = SQRT(C8^2+C9^2)
  w.A  = Math.sqrt(w.W ** 2 + w.Q ** 2);       // C26 = SQRT(C16^2+C6^2)
  w.e  = d(Math.atan(w.Q / w.W));              // C30 = ATAN(C6/C16)*180/PI()
  w.l  = d(Math.atan(w.T / w.R));              // C36 = ATAN(C9/C7)*180/PI()
  w.m  = d(Math.atan(w.S / GL));               // C37 = ATAN(C8/C5)*180/PI()
  w.n  = 2 * w.m;                              // C38 = 2*C37
  w.o  = 90 - w.l;                             // C39 = 90-C36
  w.p  = 180 - w.o;                            // C40 = 180-C39
  w.b  = 90 - w.m;                             // C27 = 90-C37
  w.c  = 90 - w.l + 90;                        // C28 = 90-C36+90
  w.X  = w.A / Math.cos(r(w.o));               // C17 = C26/COS(C39/180*PI())
  w.Y  = w.A / Math.cos(r(w.b));               // C18 = C26/(COS(C27/180*PI()))  -> C27 = b
  w.Z  = w.A * Math.tan(r(w.o));               // C19 = C26*TAN(C39/180*PI())
  w.AA = w.A * Math.tan(r(w.b));               // C20 = C26*TAN(C27/180*PI())    -> C27 = b
  w.AB = Math.sqrt(w.X ** 2 + w.Y ** 2);       // C21 = SQRT(C17^2+C18^2)
  w.AC = w.Q / Math.cos(r(w.e));               // C22 = C6/COS(C30/180*PI())     -> C30 = e
  const radAD = w.Z ** 2 - w.AC ** 2;          // C23 = SQRT(C19^2-C22^2)
  const radAE = w.AA ** 2 - w.AC ** 2;         // C24 = SQRT(C20^2-C22^2)
  // Im gesamten gültigen Eingabebereich (0<NH<90, 0<NL<90) sind beide
  // Radikanden positiv; die Prüfung verhindert trotzdem jedes NaN.
  if (!(radAD >= 0) || !(radAE >= 0)) {
    return { ok: false, fehler: ["Mit diesen Neigungen ergibt sich keine gültige Kehle (negativer Wurzelwert)."] };
  }
  w.AD = Math.sqrt(radAD);
  w.AE = Math.sqrt(radAE);
  w.h  = d(Math.atan(w.AD / w.AC));            // C33 = ATAN(C23/C22)*180/PI()
  w.i  = d(Math.atan(w.AE / w.AC));            // C34 = ATAN(C24/C22)*180/PI()
  w.k  = w.h + w.i;                            // C35 = C33+C34
  w.mitte = (w.h + w.i) / 2;                   // F34 = (C33+C34)/2
  w.d  = 180 - w.k;                            // C29 = 180-C35
  w.f  = w.l + 90;                             // C31 = C36+90            -> C36 = l
  w.g  = w.m + 90;                             // C32 = C37+90            -> C37 = m

  // Letzte Sicherung: kein einziger Wert darf NaN/Infinity sein.
  for (const key of Object.keys(w)) {
    if (!Number.isFinite(w[key])) {
      return { ok: false, fehler: ["Die Berechnung ergibt mit diesen Eingaben keinen gültigen Wert."] };
    }
  }
  w.ok = true;
  w.fehler = [];
  return w;
}

// ---- Anzeige -------------------------------------------------------
// Intern wird immer mit voller JS-Genauigkeit gerechnet; erst hier wird
// auf zwei Nachkommastellen formatiert.
function kehleWert(schluessel, wert) {
  if (!Number.isFinite(wert)) return "–";
  const zahl = wert.toFixed(2);
  if (KEHLE_WINKEL.includes(schluessel)) return zahl + "°";
  if (KEHLE_LAENGEN.includes(schluessel)) return zahl + " mm";
  return zahl;
}

function kehleEingabenAusFeldern() {
  if (!$("kehle_nh")) return { nh: "", nl: "", gl: "" };
  return {
    nh: $("kehle_nh").value,
    nl: $("kehle_nl").value,
    gl: $("kehle_gl").value
  };
}

function kehleZeile(schluessel, wert) {
  const voll = KEHLE_LABELS[schluessel] || schluessel;
  const kurz = KEHLE_KURZ[schluessel] || voll;
  return `<tr title="${anbEsc(voll)}"><th>${anbEsc(schluessel)}</th>`
    + `<td>${anbEsc(kurz)}</td>`
    + `<td class="kehle-zahl">${anbEsc(kehleWert(schluessel, wert))}</td></tr>`;
}

function renderKehleResult() {
  if (!$("kehle_haupt")) return;
  const erg = kehleBerechnen(kehleEingabenAusFeldern());
  const hinweis = $("kehle_hinweis");

  if (!erg.ok) {
    $("kehle_haupt").innerHTML =
      `<div class="kehle-haupt-titel">Hauptresultate Kehle</div>`
      + ["b", "c", "d"].map(s =>
        `<div class="kehle-haupt-zeile"><span class="kehle-haupt-buchstabe">${s}</span>`
        + `<span class="kehle-haupt-wert">–</span></div>`).join("");
    $("kehle_weitere").innerHTML = "";
    $("kehle_zwischen").innerHTML = "";
    if (hinweis) {
      hinweis.innerHTML = "⚠️ " + erg.fehler.map(anbEsc).join("<br>");
      hinweis.style.color = "var(--red)";
    }
    return;
  }

  if (hinweis) {
    hinweis.textContent = "Alle Angaben vorhanden.";
    hinweis.style.color = "var(--muted)";
  }

  $("kehle_haupt").innerHTML =
    `<div class="kehle-haupt-titel">Hauptresultate Kehle</div>`
    + ["b", "c", "d"].map(s =>
      `<div class="kehle-haupt-zeile">`
      + `<span class="kehle-haupt-buchstabe">${s}</span>`
      + `<span class="kehle-haupt-wert">${anbEsc(kehleWert(s, erg[s]))}</span>`
      + `<span class="kehle-haupt-text" title="${anbEsc(KEHLE_LABELS[s])}">${anbEsc(KEHLE_HAUPT_KURZ[s])}</span>`
      + `</div>`).join("");

  $("kehle_weitere").innerHTML =
    `<table class="kehle-tabelle"><tbody>`
    + ["A", "e", "f", "g", "h", "i", "k", "l", "m", "n", "o", "p"]
      .map(s => kehleZeile(s, erg[s])).join("")
    + `</tbody></table>`;

  $("kehle_zwischen").innerHTML =
    `<details class="kehle-zwischen"><summary>Zwischenergebnisse der Excel-Berechnung anzeigen</summary>`
    + `<table class="kehle-tabelle"><tbody>`
    + ["Q", "R", "S", "T", "tanU", "tanV", "U", "V", "U90", "V90", "W",
       "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "mitte"]
      .map(s => kehleZeile(s, erg[s])).join("")
    + `</tbody></table></details>`;
}

function kehleFormularFuellen(d) {
  if (!$("kehle_nh")) return;
  const w = d || {};
  $("kehle_nh").value = (w.nh === 0 || w.nh) ? w.nh : "";
  $("kehle_nl").value = (w.nl === 0 || w.nl) ? w.nl : "";
  $("kehle_gl").value = (w.gl === 0 || w.gl) ? w.gl : "";
  renderKehleResult();
}
function kehleFormularZuruecksetzen() { kehleFormularFuellen(null); }

// ---- Bedienung -----------------------------------------------------
(function kehleFormularBinden() {
  if (!$("kehle_nh")) return;
  kehleFormularFuellen(null);
  ["kehle_nh", "kehle_nl", "kehle_gl"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", renderKehleResult);
  });
})();
