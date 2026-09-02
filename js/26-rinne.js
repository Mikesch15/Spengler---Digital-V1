"use strict";
// ============================================================
// Rinne · Zuschnittliste
//
// Fachliche Referenz ist ausschliesslich die Vorlage
// "Zuschnittliste Rinnen.xlsx", Blatt "Tabelle1". Die Excel wurde vor
// der Umsetzung vollstaendig ausgelesen und jede der 35 Datenzeilen
// (Zeilen 7-41) gegen die hier umgesetzten Formeln nachgerechnet -
// 105 Werte, keine Abweichung. Die Formeln lauten in der Excel:
//
//   N7 (Abw. L)         = B7 + C7 + D7 + $R$14
//   O7 (Abw. R)         = E7 + F7 + G7 + $R$14
//   M7 (Zuschnittlaenge)= L7 + IFERROR(VLOOKUP(I7,$U$8:$V$13,2,FALSE),0)
//                            + IFERROR(VLOOKUP(K7,$U$8:$V$13,2,FALSE),0)
//   R14                 = SUM(R8:R13) = 510
//   Verkettung          : B8=E7, C8=F7, D8=G7
//
// Es wird nichts gerundet: alle Werte der Excel sind ganzzahlige
// Millimeter, die Summe einer Summe bleibt exakt.
// ============================================================

// ---- 1. Zusatzmasse (Excel R8:S13, Summe R14 = 510) -----------------
// Die Reihenfolge R8..R13 ist zugleich die Reihenfolge im Profil: die
// beiden Keil-Zeilen (R10/R11) stehen genau dort, wo A/B/C liegen.
// Deshalb ist der Profilverlauf
//   Umschlag - Anschl. Flachdach - Keil - A - B - C - Keil -
//   Anschl. Unterdach - Umschlag
// Die Summe der sechs Werte fliesst als Konstante in beide
// Abwicklungen ein; die Reihenfolge selbst aendert an der Rechnung
// nichts (reine Addition) und dient nur der Skizze.
const RINNE_ZUSATZ_STANDARD = Object.freeze({
  umschlag_flachdach:  15,   // Excel R8  "Umschlag"
  anschluss_flachdach: 150,  // Excel R9  "Anschl. Flachdach"  (150-mm-Dachanschluss)
  keil_links:          40,   // Excel R10 "Keil"               (40-mm-Kante links)
  keil_rechts:         40,   // Excel R11 "Keil"               (40-mm-Kante rechts)
  anschluss_unterdach: 250,  // Excel R12 "Anschl. Unterdach"
  umschlag_unterdach:  15    // Excel R13 "Umschlag"
});

// Anzeigetexte exakt aus Spalte S der Excel.
const RINNE_ZUSATZ_LABELS = Object.freeze({
  umschlag_flachdach:  "Umschlag (Flachdachseite)",
  anschluss_flachdach: "Anschl. Flachdach",
  keil_links:          "Keil links",
  keil_rechts:         "Keil rechts",
  anschluss_unterdach: "Anschl. Unterdach",
  umschlag_unterdach:  "Umschlag (Unterdachseite)"
});

// Die drei im Auftrag als FIX benannten Masse. "Rest" ist alles
// Uebrige aus derselben Tabelle (15 + 250 + 15 = 280) - der Wert wird
// nirgends zusaetzlich hart codiert, sondern immer aus dieser Liste
// gebildet.
const RINNE_REST_TEILE = Object.freeze(
  ["umschlag_flachdach", "anschluss_unterdach", "umschlag_unterdach"]);

// ---- 2. Ansetztypen (Excel U8:V13, Dropdown I7:I41 / K7:K41) -------
// "Nichts" hat in der Excel eine leere Zelle V13; VLOOKUP liefert dort
// nichts Zaehlbares und IFERROR faengt das mit 0 ab - deshalb 0.
const RINNE_ANSETZ_STANDARD = Object.freeze({
  dila:    -165,  // Excel V8  · "1/2 Dila inkl. Naht"
  boden:      0,  // Excel V9
  ablauf:  -230,  // Excel V10 · "Zugabe/Abzug bei Ablauf"
  gehrung:  250,  // Excel V11 · "Zugabe bei Gehrung"
  naht:      15,  // Excel V12 · "Nahtzugabe"
  nichts:     0   // Excel V13 leer -> IFERROR = 0
});
const RINNE_ANSETZ_LABELS = Object.freeze({
  dila: "Dila", boden: "Boden", ablauf: "Ablauf",
  gehrung: "Gehrung", naht: "Naht", nichts: "Nichts"
});
const RINNE_ANSETZ_BESCHREIBUNG = Object.freeze({
  dila: "1/2 Dila inkl. Naht", boden: "", ablauf: "Zugabe/Abzug bei Ablauf",
  gehrung: "Zugabe bei Gehrung", naht: "Nahtzugabe", nichts: ""
});
// Reihenfolge wie im Excel-Dropdown $U$8:$U$13.
const RINNE_ANSETZ_REIHE = Object.freeze(
  ["dila", "boden", "ablauf", "gehrung", "naht", "nichts"]);

// ---- 3. Profilverlauf fuer die Skizze -------------------------------
// "winkel" ist die Richtungsaenderung gegenueber dem vorherigen
// Segment in Grad (positiv = nach links/oben). Startrichtung 0° zeigt
// nach rechts. Die Skizze stellt nur dar - sie rechnet nichts.
// "seite" bestimmt nur, auf welcher Seite des Segments die Beschriftung
// steht (+1 = im Sinne der Normalen, -1 = gegenueber). Das Rinnenprofil
// ist eine nach oben offene Wanne; ohne diese Angabe wuerde die
// Beschriftung des Bodens B in die Wanne hinein statt nach aussen zeigen.
const RINNE_PROFIL = Object.freeze([
  { key: "anschluss_flachdach", art: "fix", winkel:   0, seite:  1 },
  { key: "keil_links",          art: "fix", winkel: -45, seite:  1 },
  { key: "a",                   art: "dyn", winkel: -45, seite:  1 },
  { key: "b",                   art: "dyn", winkel:  90, seite: -1 },
  { key: "c",                   art: "dyn", winkel:  90, seite:  1 },
  { key: "keil_rechts",         art: "fix", winkel: -45, seite:  1 },
  { key: "anschluss_unterdach", art: "fix", winkel: -45, seite:  1 }
]);

// ---- 4. Einstellungen ------------------------------------------------
// Gleiches Muster wie Anschlussblech/Einfassung Rund: pro Geraet im
// localStorage. Gespeicherte Rinnenstuecke behalten ihre eigene Kopie
// der Werte (siehe rinneStueckRechnen/buildMeasurementFromForm), eine
// spaetere Aenderung hier veraendert historische Stuecke deshalb nicht.
const RINNE_EINSTELLUNGEN = "sd_rinneProfilSettings";

let rinneProfilSettings = rinneProfilEinstellungenLaden();

function rinneProfilEinstellungenLaden() {
  let w = null;
  try { w = JSON.parse(localStorage.getItem(RINNE_EINSTELLUNGEN) || "null"); } catch (e) { w = null; }
  w = w || {};
  const zusatz = Object.assign({}, RINNE_ZUSATZ_STANDARD, w.zusatz || {});
  const ansetz = Object.assign({}, RINNE_ANSETZ_STANDARD, w.ansetz || {});
  Object.keys(zusatz).forEach(k => { if (!Number.isFinite(Number(zusatz[k]))) zusatz[k] = RINNE_ZUSATZ_STANDARD[k]; });
  Object.keys(ansetz).forEach(k => { if (!Number.isFinite(Number(ansetz[k]))) ansetz[k] = RINNE_ANSETZ_STANDARD[k]; });
  return { zusatz, ansetz };
}
function rinneProfilEinstellungenSichern(w) {
  rinneProfilSettings = w;
  try { localStorage.setItem(RINNE_EINSTELLUNGEN, JSON.stringify(w)); } catch (e) { }
}

// Vollstaendige, gueltige Werte - egal ob aus den Einstellungen oder
// aus einem gespeicherten Stueck. Ein einziger Ort fuer die Vorgaben.
function rinneWerte(quelle) {
  const q = quelle || {};
  const zusatz = {}, ansetz = {};
  Object.keys(RINNE_ZUSATZ_STANDARD).forEach(k => {
    const v = Number((q.zusatz || {})[k]);
    zusatz[k] = Number.isFinite(v) ? v : RINNE_ZUSATZ_STANDARD[k];
  });
  Object.keys(RINNE_ANSETZ_STANDARD).forEach(k => {
    const v = Number((q.ansetz || {})[k]);
    ansetz[k] = Number.isFinite(v) ? v : RINNE_ANSETZ_STANDARD[k];
  });
  return { zusatz, ansetz };
}

// Excel R14 = SUM(R8:R13)
function rinneZusatzSumme(zusatz) {
  const z = rinneWerte({ zusatz }).zusatz;
  return Object.keys(RINNE_ZUSATZ_STANDARD).reduce((s, k) => s + z[k], 0);
}
// "Rest" = Zusatzmasse ohne die drei im Auftrag benannten Fixmasse.
function rinneRest(zusatz) {
  const z = rinneWerte({ zusatz }).zusatz;
  return RINNE_REST_TEILE.reduce((s, k) => s + z[k], 0);
}

// ---- 5. Rechnen (Excel M/N/O) ---------------------------------------
function rinneZahl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
// VLOOKUP(...,$U$8:$V$13,2,FALSE) mit IFERROR -> 0
function rinneAnsetzZuschlag(typ, ansetz) {
  const a = rinneWerte({ ansetz }).ansetz;
  return Object.prototype.hasOwnProperty.call(a, typ) ? a[typ] : 0;
}

// Rechnet ein einzelnes Stueck. "werte" sind die zum Stueck gehoerenden
// Zusatzmasse/Ansetztypen - bei einem gespeicherten Stueck also dessen
// eigene Kopie, nicht die aktuellen Einstellungen.
function rinneStueckRechnen(stueck, werte) {
  const s = stueck || {};
  const w = rinneWerte(werte);
  const summe = rinneZusatzSumme(w.zusatz);
  const l = s.links || {}, r = s.rechts || {};
  const abwL = rinneZahl(l.a) + rinneZahl(l.b) + rinneZahl(l.c) + summe;
  const abwR = rinneZahl(r.a) + rinneZahl(r.b) + rinneZahl(r.c) + summe;
  const zuschnitt = rinneZahl(s.laenge)
    + rinneAnsetzZuschlag(s.ansetzL, w.ansetz)
    + rinneAnsetzZuschlag(s.ansetzR, w.ansetz);
  return { abwicklungLinks: abwL, abwicklungRechts: abwR, zuschnitt, zusatzSumme: summe };
}

// ---- 6. Zustand des Formulars ---------------------------------------
let rinneStuecke = [];
// Werte, die zum aktuell geoeffneten Datensatz gehoeren. Bei einer
// neuen Massaufnahme die aktuellen Einstellungen, bei einer geoeffneten
// die mitgespeicherten - damit sich historische Stuecke nicht
// rueckwirkend aendern.
let rinneAktiveWerte = rinneWerte(rinneProfilSettings);

function rinneNeuesStueck() {
  // Verkettung: rechts des letzten Stuecks wird links des neuen.
  // Nur beim Anlegen - spaetere Aenderungen wirken nie rueckwirkend.
  const letztes = rinneStuecke[rinneStuecke.length - 1];
  const v = letztes ? letztes.rechts : { a: "", b: "", c: "" };
  return {
    links: { a: v.a, b: v.b, c: v.c },
    rechts: { a: "", b: "", c: "" },
    laenge: "", ansetzL: "dila", ansetzR: "dila"
  };
}

// ---- 7. Skizze -------------------------------------------------------
function rinneProfilPunkte(masse, werte) {
  const w = rinneWerte(werte);
  const m = masse || {};
  const laenge = eintrag => eintrag.art === "dyn"
    ? rinneZahl(m[eintrag.key])
    : w.zusatz[eintrag.key];
  const pts = [[0, 0]];
  const segmente = [];
  let richtung = 0;
  let p = [0, 0];
  RINNE_PROFIL.forEach(eintrag => {
    richtung += eintrag.winkel;
    const l = laenge(eintrag);
    const rad = richtung * Math.PI / 180;
    const q = [p[0] + Math.cos(rad) * l, p[1] + Math.sin(rad) * l];
    segmente.push({
      key: eintrag.key, art: eintrag.art, laenge: l, von: p, bis: q,
      richtung, seite: eintrag.seite === -1 ? -1 : 1
    });
    pts.push(q);
    p = q;
  });
  return { pts, segmente, richtungEnde: richtung };
}

function rinneSvg(masse, werte, titel) {
  const w = rinneWerte(werte);
  const p = rinneProfilPunkte(masse, w);
  const esc = typeof anbEsc === "function"
    ? anbEsc
    : (t => String(t == null ? "" : t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z])));
  const farbe = (typeof ANB_FARBE === "object" && ANB_FARBE)
    ? ANB_FARBE : { blech: "#d4372c", mass: "#2b3640", bau: "#5a6670" };

  const xs = p.pts.map(q => q[0]), ys = p.pts.map(q => q[1]);
  let xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
  let yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
  if (!(xMax - xMin > 1)) { xMin -= 50; xMax += 50; }
  if (!(yMax - yMin > 1)) { yMin -= 50; yMax += 50; }

  // Massstab aus der reinen Geometrie, in x und y gleich -> keine Verzerrung.
  const breitePx = 680, rand = 70;
  let s = (breitePx - 2 * rand) / (xMax - xMin);
  if (!Number.isFinite(s) || s <= 0) s = 1;
  if (s > 1.8) s = 1.8;
  const ox = rand - xMin * s;
  const oy = rand + yMax * s;
  const X = x => Math.round((ox + x * s) * 10) / 10;
  const Y = y => Math.round((oy - y * s) * 10) / 10;

  // Alle gezeichneten Bildpunkte einsammeln, damit der viewBox-Ausschnitt
  // hinterher wirklich alles umschliesst - auch die Beschriftungen. Ohne
  // das liefen die beiden Umschlag-Fahnen an den Enden aus dem Bild.
  let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  const merken = (x0, y0, x1, y1) => {
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) return;
    if (x0 < bx0) bx0 = x0; if (x1 > bx1) bx1 = x1;
    if (y0 < by0) by0 = y0; if (y1 > by1) by1 = y1;
  };
  p.pts.forEach(q => merken(X(q[0]) - 3, Y(q[1]) - 3, X(q[0]) + 3, Y(q[1]) + 3));

  // Fahne zeichnen und ihren Platzbedarf gleich mit vermerken.
  // Textbreite geschaetzt (fett 13px Arial ~ 7.4px je Zeichen) - lieber
  // etwas zu grosszuegig als eine abgeschnittene Beschriftung.
  const fahne = (x, y, dx, dy, text) => {
    const x0 = X(x), y0 = Y(y), x1 = x0 + dx, y1 = y0 + dy;
    const breite = String(text).length * 7.4;
    const tx = x1 + (dx < 0 ? -4 : (dx > 0 ? 4 : 0));
    const ty = y1 + (dy > 0 ? 12 : -5);
    const links = dx < 0 ? tx - breite : (dx > 0 ? tx : tx - breite / 2);
    merken(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1));
    merken(links, ty - 13, links + breite, ty + 4);
    return typeof anbFahne === "function"
      ? anbFahne(x, y, dx, dy, esc(text), X, Y)
      : `<text x="${tx}" y="${ty}" font-size="13" font-weight="700" fill="${farbe.mass}">${esc(text)}</text>`;
  };

  let g = "";
  const d = p.pts.map((q, i) => (i ? "L" : "M") + X(q[0]) + " " + Y(q[1])).join(" ");
  g += `<path d="${d}" fill="none" stroke="${farbe.blech}" stroke-width="3.4"
        stroke-linejoin="round" stroke-linecap="round"/>`;

  // Umschlaege als kurzer Rueckschlag an beiden Enden.
  const saum = (pVor, pEnde, laenge) => {
    if (!(laenge > 0) || typeof anbSaum !== "function") return "";
    merken(X(pEnde[0]) - 12, Y(pEnde[1]) - 12, X(pEnde[0]) + 12, Y(pEnde[1]) + 12);
    return anbSaum(pVor, pEnde, laenge, X, Y);
  };
  const letzterPunkt = p.pts[p.pts.length - 1];
  g += saum(p.pts[1], p.pts[0], w.zusatz.umschlag_flachdach);
  g += saum(p.pts[p.pts.length - 2], letzterPunkt, w.zusatz.umschlag_unterdach);

  // Beschriftung jedes Segments an seiner Mitte, senkrecht nach aussen.
  const zahl = v => (Math.round(v * 10) / 10).toString().replace(".", ",");
  const text = {
    anschluss_flachdach: "Dachanschluss ", keil_links: "Keil ", keil_rechts: "Keil ",
    anschluss_unterdach: "Anschl. Unterdach ", a: "A = ", b: "B = ", c: "C = "
  };
  p.segmente.forEach(seg => {
    if (!(Math.abs(seg.laenge) > 0.01)) return;
    const mx = (seg.von[0] + seg.bis[0]) / 2, my = (seg.von[1] + seg.bis[1]) / 2;
    const rad = seg.richtung * Math.PI / 180;
    const nx = Math.round(Math.sin(rad) * 34 * seg.seite),
          ny = Math.round(-Math.cos(rad) * 34 * seg.seite);
    g += fahne(mx, my, nx, ny,
      (text[seg.key] || (RINNE_ZUSATZ_LABELS[seg.key] || seg.key) + " ") + zahl(seg.laenge));
  });

  // Umschlaege beschriften. Die Fahnen zeigen nach unten aussen: die
  // beiden Nachbarsegmente (Dachanschluss / Anschl. Unterdach) sind nach
  // oben beschriftet, sonst wuerden sich die Texte ueberdecken.
  if (w.zusatz.umschlag_flachdach > 0) {
    g += fahne(p.pts[0][0], p.pts[0][1], -22, 34, "Umschlag " + zahl(w.zusatz.umschlag_flachdach));
  }
  if (w.zusatz.umschlag_unterdach > 0) {
    g += fahne(letzterPunkt[0], letzterPunkt[1], 22, 34, "Umschlag " + zahl(w.zusatz.umschlag_unterdach));
  }

  // viewBox exakt um alles Gezeichnete legen.
  if (!Number.isFinite(bx0) || !(bx1 > bx0)) { bx0 = 0; bx1 = breitePx; }
  if (!Number.isFinite(by0) || !(by1 > by0)) { by0 = 0; by1 = 200; }
  const luft = 8, fussHoehe = 22;
  const vx = Math.round(bx0 - luft), vy = Math.round(by0 - luft);
  let vw = Math.round(bx1 - bx0 + 2 * luft), vh = Math.round(by1 - by0 + 2 * luft + fussHoehe);
  if (!(vw > 0)) vw = breitePx;
  if (!(vh > 0)) vh = 200;

  const fuss = "Rinne · Profilschnitt · Rest " + zahl(rinneRest(w.zusatz))
    + " mm · Abwicklung = A + B + C + " + zahl(rinneZusatzSumme(w.zusatz)) + " mm";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}"
    width="100%" style="display:block;height:auto" font-family="Arial,Helvetica,sans-serif">
    <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#fff"/>
    ${g}
    <text x="${vx + vw - 8}" y="${vy + vh - 7}" text-anchor="end" font-size="11"
      fill="#8b969e">${esc(titel || fuss)}</text>
  </svg>`;
}

// ---- 8. Darstellung im Formular --------------------------------------
function rinneEsc(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
}
function rinneAnsetzOptions(gewaehlt) {
  return RINNE_ANSETZ_REIHE.map(k =>
    `<option value="${k}"${k === gewaehlt ? " selected" : ""}>${rinneEsc(RINNE_ANSETZ_LABELS[k])}</option>`).join("");
}
function rinneMm(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return (Math.round(n * 10) / 10).toLocaleString("de-CH");
}

function renderRinneResult() {
  if (!$("rp_stueckeBody")) return;
  const w = rinneAktiveWerte;
  const zahlIn = (feld, i, wert, platzhalter) =>
    `<input type="number" step="1" inputmode="decimal" data-rp-feld="${feld}" data-rp-i="${i}"`
    + (platzhalter ? ` placeholder="${platzhalter}" title="${platzhalter}" aria-label="${platzhalter}"` : "")
    + ` value="${wert === "" || wert === null || wert === undefined ? "" : rinneEsc(wert)}">`;

  $("rp_stueckeBody").innerHTML = rinneStuecke.map((st, i) => {
    const g = rinneStueckRechnen(st, w);
    return `<tr>
<td>${i + 1}</td>
<td class="rp-abc">${zahlIn("links.a", i, (st.links || {}).a, "A")}${zahlIn("links.b", i, (st.links || {}).b, "B")}${zahlIn("links.c", i, (st.links || {}).c, "C")}</td>
<td>${zahlIn("laenge", i, st.laenge)}</td>
<td class="rp-abc">${zahlIn("rechts.a", i, (st.rechts || {}).a, "A")}${zahlIn("rechts.b", i, (st.rechts || {}).b, "B")}${zahlIn("rechts.c", i, (st.rechts || {}).c, "C")}</td>
<td><select data-rp-feld="ansetzL" data-rp-i="${i}">${rinneAnsetzOptions(st.ansetzL)}</select></td>
<td><select data-rp-feld="ansetzR" data-rp-i="${i}">${rinneAnsetzOptions(st.ansetzR)}</select></td>
<td class="rp-erg">${rinneMm(g.abwicklungLinks)}</td>
<td class="rp-erg">${rinneMm(g.abwicklungRechts)}</td>
<td class="rp-erg rp-zuschnitt">${rinneMm(g.zuschnitt)}</td>
<td><button class="gray" data-rp-del="${i}" title="Stück löschen">×</button></td>
</tr>`;
  }).join("") || `<tr><td colspan="10" class="small">Noch kein Rinnenstück erfasst.</td></tr>`;

  // Zusammenfassung
  const anzahl = rinneStuecke.length;
  const summeZuschnitt = rinneStuecke.reduce((s, st) => s + rinneStueckRechnen(st, w).zuschnitt, 0);
  const zaehler = {};
  RINNE_ANSETZ_REIHE.forEach(k => { zaehler[k] = 0; });
  rinneStuecke.forEach(st => {
    if (zaehler[st.ansetzL] !== undefined) zaehler[st.ansetzL]++;
    if (zaehler[st.ansetzR] !== undefined) zaehler[st.ansetzR]++;
  });
  if ($("rp_summary")) {
    $("rp_summary").innerHTML = anzahl
      ? `<b>${anzahl}</b> Stück · Zuschnitt gesamt <b>${rinneMm(summeZuschnitt)} mm</b> · `
        + RINNE_ANSETZ_REIHE.filter(k => zaehler[k] > 0)
          .map(k => `${rinneEsc(RINNE_ANSETZ_LABELS[k])} ${zaehler[k]}×`).join(" · ")
      : "";
  }

  // Skizze: Masse des ersten Stuecks links, sonst leer
  if ($("rp_diagram")) {
    const erstes = rinneStuecke[0];
    const masse = erstes ? erstes.links : { a: "", b: "", c: "" };
    $("rp_diagram").innerHTML = rinneSvg(masse, w, null);
  }
  if ($("rp_zusatzHint")) {
    const z = w.zusatz;
    $("rp_zusatzHint").innerHTML =
      "Zusatzmasse (Summe <b>" + rinneMm(rinneZusatzSumme(z)) + " mm</b>): "
      + Object.keys(RINNE_ZUSATZ_STANDARD)
        .map(k => rinneEsc(RINNE_ZUSATZ_LABELS[k]) + " " + rinneMm(z[k])).join(" · ")
      + " · Rest <b>" + rinneMm(rinneRest(z)) + " mm</b>";
  }
}

// ---- 9. Formular fuellen / zuruecksetzen ------------------------------
function rinneFormularFuellen(d) {
  if (!$("rp_stueckeBody")) return;
  if (d) {
    // Werte des gespeicherten Datensatzes verwenden, damit historische
    // Stuecke von spaeteren Einstellungsaenderungen unberuehrt bleiben.
    rinneAktiveWerte = rinneWerte({ zusatz: d.zusatz, ansetz: d.ansetz });
    rinneStuecke = Array.isArray(d.stuecke) ? d.stuecke.map(st => ({
      links: { a: (st.links || {}).a, b: (st.links || {}).b, c: (st.links || {}).c },
      rechts: { a: (st.rechts || {}).a, b: (st.rechts || {}).b, c: (st.rechts || {}).c },
      laenge: st.laenge,
      ansetzL: RINNE_ANSETZ_LABELS[st.ansetzL] ? st.ansetzL : "dila",
      ansetzR: RINNE_ANSETZ_LABELS[st.ansetzR] ? st.ansetzR : "dila"
    })) : [];
    if ($("rp_material") && d.material !== undefined) $("rp_material").value = d.material || "";
  } else {
    rinneAktiveWerte = rinneWerte(rinneProfilSettings);
    rinneStuecke = [rinneNeuesStueck()];
    if ($("rp_material")) $("rp_material").value = "";
  }
  renderRinneResult();
}
function rinneFormularZuruecksetzen() { rinneFormularFuellen(null); }

// ---- 10. Einstellungsseite -------------------------------------------
function applyRinneProfilSettings() {
  if (!$("rpsUmschlagFlachdach")) return;
  const w = rinneWerte(rinneProfilSettings);
  const setzen = (id, wert) => { const el = $(id); if (el && document.activeElement !== el) el.value = wert; };
  setzen("rpsUmschlagFlachdach", w.zusatz.umschlag_flachdach);
  setzen("rpsAnschlussFlachdach", w.zusatz.anschluss_flachdach);
  setzen("rpsKeilLinks", w.zusatz.keil_links);
  setzen("rpsKeilRechts", w.zusatz.keil_rechts);
  setzen("rpsAnschlussUnterdach", w.zusatz.anschluss_unterdach);
  setzen("rpsUmschlagUnterdach", w.zusatz.umschlag_unterdach);
  setzen("rpsDila", w.ansetz.dila);
  setzen("rpsBoden", w.ansetz.boden);
  setzen("rpsAblauf", w.ansetz.ablauf);
  setzen("rpsGehrung", w.ansetz.gehrung);
  setzen("rpsNaht", w.ansetz.naht);
  setzen("rpsNichts", w.ansetz.nichts);
  if ($("rpsSumme")) $("rpsSumme").textContent = rinneMm(rinneZusatzSumme(w.zusatz)) + " mm";
}

// ---- 11. Bedienung ----------------------------------------------------
(function rinneFormularBinden() {
  if (!$("rp_stueckeBody")) return;
  rinneFormularFuellen(null);

  const body = $("rp_stueckeBody");
  body.addEventListener("input", e => {
    const el = e.target.closest("[data-rp-feld]");
    if (!el) return;
    const i = Number(el.dataset.rpI);
    const st = rinneStuecke[i];
    if (!st) return;
    const feld = el.dataset.rpFeld;
    const wert = el.value;
    if (feld.indexOf(".") > 0) {
      const [seite, teil] = feld.split(".");
      st[seite] = st[seite] || {};
      st[seite][teil] = wert;
    } else {
      st[feld] = wert;
    }
    // Nur die Ergebniszellen der betroffenen Zeile neu setzen, damit
    // der Cursor im Eingabefeld nicht verloren geht.
    const g = rinneStueckRechnen(st, rinneAktiveWerte);
    const tr = el.closest("tr");
    if (tr) {
      const zellen = tr.querySelectorAll(".rp-erg");
      if (zellen.length === 3) {
        zellen[0].textContent = rinneMm(g.abwicklungLinks);
        zellen[1].textContent = rinneMm(g.abwicklungRechts);
        zellen[2].textContent = rinneMm(g.zuschnitt);
      }
    }
    if (i === 0 && $("rp_diagram")) $("rp_diagram").innerHTML = rinneSvg(st.links, rinneAktiveWerte, null);
    if (typeof isDirty !== "undefined") isDirty = true;
  });
  body.addEventListener("change", e => {
    if (!e.target.closest("select[data-rp-feld]")) return;
    renderRinneResult();
    if (typeof isDirty !== "undefined") isDirty = true;
  });
  body.addEventListener("click", e => {
    const del = e.target.closest("[data-rp-del]");
    if (!del) return;
    const i = Number(del.dataset.rpDel);
    if (!rinneStuecke[i]) return;
    if (!confirm("Rinnenstück " + (i + 1) + " löschen?")) return;
    rinneStuecke.splice(i, 1);
    renderRinneResult();
    if (typeof isDirty !== "undefined") isDirty = true;
  });

  if ($("rp_addStueck")) $("rp_addStueck").onclick = () => {
    rinneStuecke.push(rinneNeuesStueck());
    renderRinneResult();
    if (typeof isDirty !== "undefined") isDirty = true;
  };

  const knopf = $("openRinneProfilSettings");
  if (knopf) knopf.onclick = () => {
    if (typeof renderSettings !== "function") return;
    settingsReturnToMeasurement = true;
    $("measurementEditModal").hidden = true;
    renderSettings();
    if (typeof applyCompanyName === "function") applyCompanyName();
    applyRinneProfilSettings();
    document.querySelectorAll(".settings-tab").forEach(b => b.classList.toggle("active", b.dataset.settingsTab === "measurements"));
    document.querySelectorAll(".settings-tab-panel").forEach(p => { p.hidden = (p.dataset.settingsPanel !== "measurements"); });
    const sec = document.querySelector('.settings-section[data-section="rinne-profil"]');
    if (sec) sec.classList.add("open");
    $("settingsModal").hidden = false;
  };
})();

(function rinneProfilEinstellungenBinden() {
  if (!$("saveRinneProfilSettings")) return;
  applyRinneProfilSettings();
  ["rpsUmschlagFlachdach", "rpsAnschlussFlachdach", "rpsKeilLinks", "rpsKeilRechts",
    "rpsAnschlussUnterdach", "rpsUmschlagUnterdach"].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener("input", () => {
        const zahl = k => Number($(k).value) || 0;
        const summe = zahl("rpsUmschlagFlachdach") + zahl("rpsAnschlussFlachdach")
          + zahl("rpsKeilLinks") + zahl("rpsKeilRechts")
          + zahl("rpsAnschlussUnterdach") + zahl("rpsUmschlagUnterdach");
        if ($("rpsSumme")) $("rpsSumme").textContent = rinneMm(summe) + " mm";
      });
    });

  $("saveRinneProfilSettings").onclick = () => {
    const zahl = id => Number($(id).value);
    const w = {
      zusatz: {
        umschlag_flachdach: zahl("rpsUmschlagFlachdach"),
        anschluss_flachdach: zahl("rpsAnschlussFlachdach"),
        keil_links: zahl("rpsKeilLinks"),
        keil_rechts: zahl("rpsKeilRechts"),
        anschluss_unterdach: zahl("rpsAnschlussUnterdach"),
        umschlag_unterdach: zahl("rpsUmschlagUnterdach")
      },
      ansetz: {
        dila: zahl("rpsDila"), boden: zahl("rpsBoden"), ablauf: zahl("rpsAblauf"),
        gehrung: zahl("rpsGehrung"), naht: zahl("rpsNaht"), nichts: zahl("rpsNichts")
      }
    };
    const ungueltig = Object.keys(w.zusatz).some(k => !Number.isFinite(w.zusatz[k]))
      || Object.keys(w.ansetz).some(k => !Number.isFinite(w.ansetz[k]));
    if (ungueltig) { alert("Bitte in allen Feldern eine Zahl eingeben."); return; }
    if (Object.keys(w.zusatz).some(k => w.zusatz[k] < 0)) {
      alert("Die Zusatzmasse dürfen nicht negativ sein."); return;
    }
    rinneProfilEinstellungenSichern(w);
    applyRinneProfilSettings();
    alert("Gespeichert (gilt nur für dieses Gerät).\n\nBereits gespeicherte Rinnen-Massaufnahmen behalten ihre bisherigen Werte.");
  };

  $("resetRinneProfilSettings").onclick = () => {
    if (!confirm("Alle Rinnen-Zusatzmasse und Ansetztypen auf die Werte der Excel-Vorlage zurücksetzen?")) return;
    rinneProfilEinstellungenSichern({
      zusatz: Object.assign({}, RINNE_ZUSATZ_STANDARD),
      ansetz: Object.assign({}, RINNE_ANSETZ_STANDARD)
    });
    applyRinneProfilSettings();
    alert("Auf die Werte der Excel-Vorlage zurückgesetzt.");
  };
})();
