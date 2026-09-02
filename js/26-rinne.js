"use strict";
// ============================================================
// Rinne · Zuschnittliste mit frei definierbarem Profil
//
// Fachliche Rechenreferenz ist weiterhin die Vorlage
// "Zuschnittliste Rinnen.xlsx", Blatt "Tabelle1":
//
//   Abw. L    = Links  A + B + C + Summe der Zusatzmasse ($R$14 = 510)
//   Abw. R    = Rechts A + B + C + Summe der Zusatzmasse
//   Zuschnitt = Laenge M/M + Ansetzen L + Ansetzen R
//
// Seit v2.57 ist das Profil selbst frei definierbar (wie beim Freien
// Profil): jedes Segment hat eine Bezeichnung, einen Winkel und die Art
// "fix" (bei jedem Rinnenstueck gleich, mit eigener Laenge) oder
// "variabel" (je Rinnenstueck links/rechts eigener Wert, erscheint in
// der Stueckliste als A, B, C, ...).
//
// Damit lauten die Formeln allgemein:
//
//   Abw. L    = Summe der variablen Masse links  + Summe aller Fixmasse
//   Abw. R    = Summe der variablen Masse rechts + Summe aller Fixmasse
//   Zuschnitt = Laenge M/M + Ansetzen L + Ansetzen R
//
// Mit dem mitgelieferten Standardprofil (Fixmasse 15+150+40+40+250+15
// = 510, drei variable Masse A/B/C) ist das rechnerisch identisch mit
// der Excel - der Pruefstand "rinne56" rechnet weiterhin alle 35
// Datenzeilen der Vorlage dagegen.
// ============================================================

// ---- 1. Standardprofil (entspricht exakt der Excel-Vorlage) ---------
// Reihenfolge und Werte stammen aus Excel R8:S13; die beiden Keil-Zeilen
// (R10/R11) stehen dort genau da, wo A/B/C liegen. "winkel" ist die
// Richtungsaenderung gegenueber dem vorherigen Segment in Grad -
// dieselbe Bedeutung wie beim Freien Profil. 180° = Umschlag.
// Standardprofil nach der Vorlage des Betreibers (Handskizze, v2.57).
// Gelesen vom rechten Ende her, damit die variablen Masse in der
// Reihenfolge der Vorlage A - B - C heissen:
//
//   Umschlag - Anschl. Flachdach 150 - [A] - Keil 40 - [B] - Keil 40 -
//   [C] - Rest (max. 200) - Umschlag
//                                   Fixmasse gesamt: 460 mm
//
// "winkel" ist die Richtungsaenderung gegenueber dem vorherigen Segment
// in Grad - dieselbe Bedeutung wie beim Freien Profil. 180° = Umschlag.
// Die Winkel sind aus der Vorlage abgegriffen: A faellt mit 70° steil ab,
// die beiden Keil sind 45°-Faschen, C steht senkrecht, der Rest steigt
// mit 34° an.
//
// Hinweise zur Vorlage:
//  - Die beiden Umschlaege sind dort nicht bemasst; uebernommen sind
//    die 15 mm aus der Excel.
//  - A/B/C sind dort nicht benannt; die Bezeichnungen bleiben deshalb
//    leer und koennen frei ausgefuellt werden.
//  - "Rest (Max 200)" ist eine Obergrenze, kein rechenbarer Wert. Das
//    Segment heisst deshalb schlicht "Rest" und ist mit 200 mm
//    vorbelegt; im Formular ist es frei aenderbar.
// Alles davon ist im Formular anpassbar.
const RINNE_STANDARDPROFIL = Object.freeze([
  { name: "Umschlag",          art: "fix", laenge:  15, winkel:   0 },
  { name: "Anschl. Flachdach", art: "fix", laenge: 150, winkel: 180 },
  { name: "",                  art: "var", laenge:   0, winkel:  70 },
  { name: "Keil",              art: "fix", laenge:  40, winkel: -25 },
  { name: "",                  art: "var", laenge:   0, winkel: -45 },
  { name: "Keil",              art: "fix", laenge:  40, winkel: -45 },
  { name: "",                  art: "var", laenge:   0, winkel: -45 },
  { name: "Rest",              art: "fix", laenge: 200, winkel:  56 },
  { name: "Umschlag",          art: "fix", laenge:  15, winkel: 180 }
]);

// Fixmasse der Excel-Vorlage (R8..R13). Werden nur noch gebraucht, um
// gespeicherte v2.56-Daten zu uebernehmen, bei denen ein Wert fehlt -
// nicht mehr als Vorgabe fuer neue Massaufnahmen.
const RINNE_EXCEL_FIXMASSE = Object.freeze({
  umschlag_flachdach: 15, anschluss_flachdach: 150, keil_links: 40,
  keil_rechts: 40, anschluss_unterdach: 250, umschlag_unterdach: 15
});

// ---- 2. Ansetztypen (Excel U8:V13, Dropdown I7:I41 / K7:K41) -------
// "Nichts" hat in der Excel eine leere Zelle V13; VLOOKUP liefert dort
// nichts und IFERROR faengt das mit 0 ab - deshalb 0.
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

// ---- 3. Einstellungen (Standardprofil + Ansetztypen) ----------------
// Gleiches Muster wie Anschlussblech/Einfassung Rund: pro Geraet im
// localStorage. Eine gespeicherte Massaufnahme traegt ihr eigenes Profil
// und ihre eigenen Ansetzwerte mit sich - eine spaetere Aenderung hier
// veraendert historische Rinnenstuecke deshalb nie.
const RINNE_EINSTELLUNGEN = "sd_rinneProfilSettings";

let rinneProfilSettings = rinneProfilEinstellungenLaden();

function rinneProfilEinstellungenLaden() {
  let w = null;
  try { w = JSON.parse(localStorage.getItem(RINNE_EINSTELLUNGEN) || "null"); } catch (e) { w = null; }
  return rinneWerte(w || {});
}
function rinneProfilEinstellungenSichern(w) {
  rinneProfilSettings = rinneWerte(w);
  try { localStorage.setItem(RINNE_EINSTELLUNGEN, JSON.stringify(rinneProfilSettings)); } catch (e) { }
}

// ---- 4. Werte normalisieren -----------------------------------------
function rinneZahl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function rinneSegment(s, i) {
  const q = s || {};
  const art = q.art === "var" || q.art === "variabel" ? "var" : "fix";
  return {
    name: String(q.name === undefined || q.name === null ? "" : q.name),
    art,
    laenge: art === "fix" ? rinneZahl(q.laenge) : 0,
    winkel: rinneZahl(q.winkel)
  };
}
// Nimmt ein beliebiges gespeichertes oder eingestelltes Objekt entgegen
// und liefert immer ein vollstaendiges, gueltiges {profil, ansetz}.
// Faengt dabei auch das alte v2.56-Format mit fester Zusatzmass-Tabelle
// ab, damit bereits gespeicherte Rinnen weiterhin korrekt rechnen.
function rinneWerte(quelle) {
  const q = quelle || {};
  let profil = Array.isArray(q.profil) ? q.profil.map(rinneSegment) : null;
  if (!profil && q.zusatz && typeof q.zusatz === "object") {
    profil = rinneProfilAusAltformat(q.zusatz);
  }
  // Ein ausdruecklich leeres Profil bleibt leer - nur ein voellig
  // fehlendes faellt auf das Standardprofil zurueck. Sonst wuerde ein
  // vom Benutzer geleertes Profil heimlich wieder als Standardprofil
  // gezeichnet und gerechnet.
  if (!profil) profil = RINNE_STANDARDPROFIL.map(rinneSegment);
  const ansetz = {};
  Object.keys(RINNE_ANSETZ_STANDARD).forEach(k => {
    const v = Number((q.ansetz || {})[k]);
    ansetz[k] = Number.isFinite(v) ? v : RINNE_ANSETZ_STANDARD[k];
  });
  return { profil, ansetz };
}
// v2.56 kannte sechs feste Zusatzmasse und genau drei variable Masse in
// der Reihenfolge der Excel-Vorlage. Ein solcher Datensatz wird auf genau
// dieses Profil abgebildet - nicht auf das aktuelle Standardprofil, sonst
// wuerde sich seine Abwicklung nachtraeglich aendern.
function rinneProfilAusAltformat(zusatz) {
  const z = k => Object.prototype.hasOwnProperty.call(zusatz, k)
    ? rinneZahl(zusatz[k]) : RINNE_EXCEL_FIXMASSE[k];
  return [
    { name: "Umschlag",          art: "fix", laenge: z("umschlag_flachdach"),  winkel:   0 },
    { name: "Anschl. Flachdach", art: "fix", laenge: z("anschluss_flachdach"), winkel: 180 },
    { name: "Keil",              art: "fix", laenge: z("keil_links"),          winkel: -45 },
    { name: "",                  art: "var", laenge: 0,                        winkel: -45 },
    { name: "",                  art: "var", laenge: 0,                        winkel:  90 },
    { name: "",                  art: "var", laenge: 0,                        winkel:  90 },
    { name: "Keil",              art: "fix", laenge: z("keil_rechts"),         winkel: -45 },
    { name: "Anschl. Unterdach", art: "fix", laenge: z("anschluss_unterdach"), winkel: -45 },
    { name: "Umschlag",          art: "fix", laenge: z("umschlag_unterdach"),  winkel: 180 }
  ].map(rinneSegment);
}

// ---- 5. Profil auswerten --------------------------------------------
// Summe aller Fixmasse - das ist die Verallgemeinerung von $R$14.
function rinneFixSumme(profil) {
  return (profil || []).reduce((s, seg) => s + (seg.art === "fix" ? rinneZahl(seg.laenge) : 0), 0);
}
// Die variablen Segmente in ihrer Reihenfolge, mit Buchstabe A, B, C, ...
function rinneVariable(profil) {
  const out = [];
  (profil || []).forEach((seg, i) => {
    if (seg.art !== "var") return;
    out.push({ index: i, buchstabe: rinneBuchstabe(out.length), name: seg.name });
  });
  return out;
}
function rinneBuchstabe(n) {
  let s = "";
  n = Math.max(0, Math.floor(n));
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

// ---- 6. Rechnen (Excel M/N/O, verallgemeinert) ----------------------
// VLOOKUP(...,$U$8:$V$13,2,FALSE) mit IFERROR -> 0
function rinneAnsetzZuschlag(typ, ansetz) {
  const a = rinneWerte({ ansetz }).ansetz;
  return Object.prototype.hasOwnProperty.call(a, typ) ? a[typ] : 0;
}
function rinneSeitenSumme(werte, anzahl) {
  const liste = Array.isArray(werte) ? werte : [];
  let s = 0;
  for (let i = 0; i < anzahl; i++) s += rinneZahl(liste[i]);
  return s;
}
// Rechnet ein einzelnes Stueck gegen die zu ihm gehoerenden Werte -
// bei einem gespeicherten Stueck also dessen eigenes Profil, nicht die
// aktuellen Einstellungen.
function rinneStueckRechnen(stueck, werte) {
  const s = stueck || {};
  const w = rinneWerte(werte);
  const fix = rinneFixSumme(w.profil);
  const anzahl = rinneVariable(w.profil).length;
  const abwL = rinneSeitenSumme(s.links, anzahl) + fix;
  const abwR = rinneSeitenSumme(s.rechts, anzahl) + fix;
  const zuschnitt = rinneZahl(s.laenge)
    + rinneAnsetzZuschlag(s.ansetzL, w.ansetz)
    + rinneAnsetzZuschlag(s.ansetzR, w.ansetz);
  return { abwicklungLinks: abwL, abwicklungRechts: abwR, zuschnitt, fixSumme: fix };
}

// ---- 7. Zustand des Formulars ---------------------------------------
let rinneProfil = RINNE_STANDARDPROFIL.map(rinneSegment);
let rinneAnsetz = Object.assign({}, RINNE_ANSETZ_STANDARD);
let rinneStuecke = [];

function rinneAktiveWerte() { return { profil: rinneProfil, ansetz: rinneAnsetz }; }

// Ein Stueck auf die aktuelle Anzahl variabler Masse bringen. Vorhandene
// Werte bleiben stehen, fehlende werden leer ergaenzt, ueberzaehlige
// entfallen - so bleibt beim Umbau des Profils moeglichst viel erhalten.
function rinneStueckAnpassen(st, anzahl) {
  const hol = q => {
    const liste = Array.isArray(q) ? q.slice(0, anzahl) : [];
    while (liste.length < anzahl) liste.push("");
    return liste;
  };
  st.links = hol(st.links);
  st.rechts = hol(st.rechts);
  return st;
}
function rinneStueckeAnpassen() {
  const anzahl = rinneVariable(rinneProfil).length;
  rinneStuecke.forEach(st => rinneStueckAnpassen(st, anzahl));
}

function rinneNeuesStueck() {
  // Verkettung: rechts des letzten Stuecks wird links des neuen.
  // Nur beim Anlegen - spaetere Aenderungen wirken nie rueckwirkend.
  const anzahl = rinneVariable(rinneProfil).length;
  const letztes = rinneStuecke[rinneStuecke.length - 1];
  const vorlage = letztes && Array.isArray(letztes.rechts) ? letztes.rechts : [];
  const links = [], rechts = [];
  for (let i = 0; i < anzahl; i++) {
    links.push(vorlage[i] === undefined ? "" : vorlage[i]);
    rechts.push("");
  }
  return { links, rechts, laenge: "", ansetzL: "dila", ansetzR: "dila" };
}

// ---- 8. Skizze -------------------------------------------------------
// Beispielmasse fuer die variablen Segmente, damit das Profil auch ohne
// erfasstes Stueck sinnvoll aussieht. Wird nur gezeichnet, nie gerechnet.
const RINNE_BEISPIELMASS = 200;

function rinneProfilPunkte(profil, masse) {
  const segs = (profil || []).map(rinneSegment);
  const varListe = rinneVariable(segs);
  const wert = i => {
    const seg = segs[i];
    if (seg.art === "fix") return rinneZahl(seg.laenge);
    const pos = varListe.findIndex(v => v.index === i);
    const m = Array.isArray(masse) ? masse[pos] : undefined;
    const n = Number(m);
    return Number.isFinite(n) && n !== 0 ? n : RINNE_BEISPIELMASS;
  };
  const pts = [[0, 0]];
  const segmente = [];
  let richtung = 0, p = [0, 0];
  segs.forEach((seg, i) => {
    richtung += rinneZahl(seg.winkel);
    const l = wert(i);
    const rad = richtung * Math.PI / 180;
    const q = [p[0] + Math.cos(rad) * l, p[1] + Math.sin(rad) * l];
    const umschlag = Math.abs(((rinneZahl(seg.winkel) % 360) + 360) % 360 - 180) < 0.5;
    segmente.push({
      index: i, name: seg.name, art: seg.art, laenge: l, echteLaenge: seg.art === "fix" ? rinneZahl(seg.laenge) : null,
      buchstabe: seg.art === "var" ? (varListe.find(v => v.index === i) || {}).buchstabe : null,
      von: p, bis: q, richtung, umschlag
    });
    pts.push(q);
    p = q;
  });
  return { pts, segmente, varAnzahl: varListe.length };
}

function rinneEsc(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
}

function rinneSvg(profil, masse, titel) {
  const w = rinneWerte({ profil });
  const p = rinneProfilPunkte(w.profil, masse);
  const farbe = (typeof ANB_FARBE === "object" && ANB_FARBE)
    ? ANB_FARBE : { blech: "#d4372c", mass: "#2b3640", bau: "#5a6670" };
  const zahl = v => (Math.round(v * 10) / 10).toString().replace(".", ",");

  if (!p.segmente.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 90" width="100%"
      style="display:block;height:auto" font-family="Arial,Helvetica,sans-serif">
      <rect width="400" height="90" fill="#fff"/>
      <text x="200" y="48" text-anchor="middle" font-size="14" fill="#8b969e">Noch kein Profil definiert.</text></svg>`;
  }

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
  const ox = rand - xMin * s, oy = rand + yMax * s;
  const X = x => Math.round((ox + x * s) * 10) / 10;
  const Y = y => Math.round((oy - y * s) * 10) / 10;

  // Alle gezeichneten Bildpunkte einsammeln, damit der viewBox-Ausschnitt
  // hinterher wirklich alles umschliesst - auch die Beschriftungen.
  let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  const merken = (x0, y0, x1, y1) => {
    if (![x0, y0, x1, y1].every(Number.isFinite)) return;
    if (x0 < bx0) bx0 = x0; if (x1 > bx1) bx1 = x1;
    if (y0 < by0) by0 = y0; if (y1 > by1) by1 = y1;
  };

  // Ein Umschlag (180°) deckt sich exakt mit dem vorherigen Segment.
  // Er wird deshalb - wie beim Freien Profil - leicht parallel versetzt
  // gezeichnet, damit er sichtbar bleibt.
  const VERSATZ = 7;
  const gezeichnet = p.segmente.map(seg => {
    let a = [X(seg.von[0]), Y(seg.von[1])], b = [X(seg.bis[0]), Y(seg.bis[1])];
    if (seg.umschlag) {
      const rad = seg.richtung * Math.PI / 180;
      const nx = -Math.sin(rad) * VERSATZ, ny = -Math.cos(rad) * VERSATZ;
      a = [a[0] + nx, a[1] + ny]; b = [b[0] + nx, b[1] + ny];
    }
    merken(Math.min(a[0], b[0]) - 3, Math.min(a[1], b[1]) - 3,
           Math.max(a[0], b[0]) + 3, Math.max(a[1], b[1]) + 3);
    return { a, b, seg };
  });

  let g = "";
  gezeichnet.forEach((z, i) => {
    const vor = gezeichnet[i - 1];
    if (vor && (z.seg.umschlag || (p.segmente[i - 1] && p.segmente[i - 1].umschlag))) {
      // Verbindungsstrich zwischen versetztem und normalem Teil
      g += `<line x1="${vor.b[0].toFixed(1)}" y1="${vor.b[1].toFixed(1)}"
            x2="${z.a[0].toFixed(1)}" y2="${z.a[1].toFixed(1)}"
            stroke="${farbe.blech}" stroke-width="3.4" stroke-linecap="round"/>`;
    }
    g += `<line x1="${z.a[0].toFixed(1)}" y1="${z.a[1].toFixed(1)}"
          x2="${z.b[0].toFixed(1)}" y2="${z.b[1].toFixed(1)}"
          stroke="${farbe.blech}" stroke-width="3.4" stroke-linecap="round"/>`;
  });

  // Beschriftung je Segment, abwechselnd nach aussen versetzt, damit sich
  // benachbarte Texte nicht ueberdecken.
  gezeichnet.forEach((z, i) => {
    const seg = z.seg;
    const mx = (z.a[0] + z.b[0]) / 2, my = (z.a[1] + z.b[1]) / 2;
    const rad = seg.richtung * Math.PI / 180;
    const stufe = 34 + (i % 2) * 20;
    const nx = Math.sin(rad) * stufe, ny = -Math.cos(rad) * stufe;
    const beschriftung = seg.art === "var"
      ? (seg.buchstabe + (seg.name ? " · " + seg.name : ""))
      : ((seg.name ? seg.name + " " : "") + zahl(seg.echteLaenge));
    const tx = mx + nx, ty = my + ny;
    const breite = beschriftung.length * 7.4;
    // Der Text steht NEBEN dem Linienende, nicht mittig darauf - sonst
    // laeuft der Fuehrungsstrich mitten durch die Beschriftung.
    const waagerecht = Math.abs(nx) > Math.abs(ny) * 0.6;
    const anker = waagerecht ? (nx < 0 ? "end" : "start") : "middle";
    const ax = tx + (waagerecht ? (nx < 0 ? -5 : 5) : 0);
    const ay = ty + (waagerecht ? 4 : (ny < 0 ? -6 : 15));
    const links = anker === "end" ? ax - breite : (anker === "start" ? ax : ax - breite / 2);
    merken(mx - 3, my - 3, mx + 3, my + 3);
    merken(links, ay - 13, links + breite, ay + 4);
    g += `<line x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}"
          stroke="${farbe.mass}" stroke-width="1"/>
      <circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="2.4" fill="${farbe.mass}"/>
      <text x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" text-anchor="${anker}"
        font-size="13" font-weight="700" fill="${seg.art === "var" ? farbe.blech : farbe.mass}"
        paint-order="stroke" stroke="#fff" stroke-width="3.5"
        stroke-linejoin="round">${rinneEsc(beschriftung)}</text>`;
  });

  if (!Number.isFinite(bx0) || !(bx1 > bx0)) { bx0 = 0; bx1 = breitePx; }
  if (!Number.isFinite(by0) || !(by1 > by0)) { by0 = 0; by1 = 200; }
  const luft = 8, fussHoehe = 22;
  const vx = Math.round(bx0 - luft), vy = Math.round(by0 - luft);
  let vw = Math.round(bx1 - bx0 + 2 * luft), vh = Math.round(by1 - by0 + 2 * luft + fussHoehe);
  if (!(vw > 0)) vw = breitePx;
  if (!(vh > 0)) vh = 200;

  const fix = rinneFixSumme(w.profil);
  const varListe = rinneVariable(w.profil);
  const fuss = "Rinne · Profilschnitt · Abwicklung = "
    + (varListe.length ? varListe.map(v => v.buchstabe).join(" + ") + " + " : "")
    + zahl(fix) + " mm Fixmasse";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}"
    width="100%" style="display:block;height:auto" font-family="Arial,Helvetica,sans-serif">
    <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#fff"/>
    ${g}
    <text x="${vx + vw - 8}" y="${vy + vh - 7}" text-anchor="end" font-size="11"
      fill="#8b969e">${rinneEsc(titel || fuss)}</text>
  </svg>`;
}

// ---- 9. Darstellung im Formular --------------------------------------
function rinneAnsetzOptions(gewaehlt) {
  return RINNE_ANSETZ_REIHE.map(k =>
    `<option value="${k}"${k === gewaehlt ? " selected" : ""}>${rinneEsc(RINNE_ANSETZ_LABELS[k])}</option>`).join("");
}
function rinneMm(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return (Math.round(n * 10) / 10).toLocaleString("de-CH");
}

// Profiltabelle: Bezeichnung, Art, Laenge (nur fix), Winkel
function renderRinneProfilTabelle() {
  if (!$("rp_profilBody")) return;
  const varListe = rinneVariable(rinneProfil);
  $("rp_profilBody").innerHTML = rinneProfil.map((seg, i) => {
    const v = varListe.find(x => x.index === i);
    return `<tr>
<td>${v ? `<b class="rp-var">${v.buchstabe}</b>` : (i + 1)}</td>
<td><input type="text" data-rp-seg="name" data-rp-i="${i}" value="${rinneEsc(seg.name)}" placeholder="Bezeichnung"></td>
<td><select data-rp-seg="art" data-rp-i="${i}">
<option value="fix"${seg.art === "fix" ? " selected" : ""}>fix</option>
<option value="var"${seg.art === "var" ? " selected" : ""}>variabel</option>
</select></td>
<td>${seg.art === "fix"
      ? `<input type="number" step="1" inputmode="decimal" data-rp-seg="laenge" data-rp-i="${i}" value="${rinneEsc(seg.laenge)}">`
      : `<span class="small rp-var">je Stück</span>`}</td>
<td class="rp-winkel"><div>
<input type="number" step="1" inputmode="decimal" data-rp-seg="winkel" data-rp-i="${i}" value="${rinneEsc(seg.winkel)}">
<button type="button" class="gray" data-rp-flip="${i}" title="Winkel umkehren">🔄</button>
<button type="button" class="gray" data-rp-umschlag="${i}" title="Umschlag: Winkel auf 180° setzen">180°</button>
</div></td>
<td class="rp-segbtn">
<button type="button" class="gray" data-rp-up="${i}" title="nach oben"${i === 0 ? " disabled" : ""}>↑</button>
<button type="button" class="gray" data-rp-down="${i}" title="nach unten"${i === rinneProfil.length - 1 ? " disabled" : ""}>↓</button>
<button type="button" class="red" data-rp-segdel="${i}" title="Segment löschen">×</button>
</td>
</tr>`;
  }).join("") || `<tr><td colspan="6" class="small">Noch kein Segment. „＋ Segment hinzufügen" klicken.</td></tr>`;

  renderRinneProfilInfo();
}

// Nur die Info-Zeile. Bewusst getrennt von der Tabelle: beim Tippen darf
// die Tabelle NICHT neu gezeichnet werden, sonst verliert das gerade
// bearbeitete Eingabefeld den Fokus und den Cursor.
function renderRinneProfilInfo() {
  if (!$("rp_profilInfo")) return;
  const varListe = rinneVariable(rinneProfil);
  const fix = rinneFixSumme(rinneProfil);
  $("rp_profilInfo").innerHTML = varListe.length
    ? `<b>${varListe.length}</b> variable Masse (${varListe.map(v => rinneEsc(v.buchstabe)).join(", ")}) · `
      + `Fixmasse gesamt <b>${rinneMm(fix)} mm</b> · Abwicklung = `
      + varListe.map(v => rinneEsc(v.buchstabe)).join(" + ") + ` + ${rinneMm(fix)} mm`
    : `Keine variablen Masse · Fixmasse gesamt <b>${rinneMm(fix)} mm</b> · Abwicklung = ${rinneMm(fix)} mm`;
}

function renderRinneStueckTabelle() {
  if (!$("rp_stueckeBody")) return;
  const w = rinneAktiveWerte();
  const varListe = rinneVariable(rinneProfil);
  const n = varListe.length;

  // Kopfzeilen dynamisch: nur so viele Spalten wie variable Masse
  if ($("rp_stueckeHead")) {
    const gruppe = (titel) => n ? `<th colspan="${n}">${titel}</th>` : "";
    const spalten = () => varListe.map(v =>
      `<th title="${rinneEsc(v.name || v.buchstabe)}">${rinneEsc(v.buchstabe)}</th>`).join("");
    $("rp_stueckeHead").innerHTML =
      `<tr><th rowspan="2">Nr.</th>${gruppe("Links (mm)")}<th rowspan="2">Länge M/M (mm)</th>`
      + `${gruppe("Rechts (mm)")}<th rowspan="2">Ansetzen L</th><th rowspan="2">Ansetzen R</th>`
      + `<th rowspan="2">Abw. L (mm)</th><th rowspan="2">Abw. R (mm)</th>`
      + `<th rowspan="2">Zuschnitt (mm)</th><th rowspan="2"></th></tr>`
      + `<tr>${spalten()}${spalten()}</tr>`;
  }

  const feld = (seite, i, j, wert) =>
    `<td class="rp-varzelle"><input type="number" step="1" inputmode="decimal"`
    + ` data-rp-feld="${seite}" data-rp-i="${i}" data-rp-j="${j}"`
    + ` placeholder="${rinneEsc(varListe[j].buchstabe)}" aria-label="${rinneEsc(varListe[j].buchstabe)}"`
    + ` value="${wert === "" || wert === null || wert === undefined ? "" : rinneEsc(wert)}"></td>`;

  const spaltenZahl = 8 + 2 * n;
  $("rp_stueckeBody").innerHTML = rinneStuecke.map((st, i) => {
    const g = rinneStueckRechnen(st, w);
    return `<tr>
<td>${i + 1}</td>
${varListe.map((v, j) => feld("links", i, j, (st.links || [])[j])).join("")}
<td><input type="number" step="1" inputmode="decimal" data-rp-feld="laenge" data-rp-i="${i}" value="${st.laenge === "" || st.laenge === null || st.laenge === undefined ? "" : rinneEsc(st.laenge)}"></td>
${varListe.map((v, j) => feld("rechts", i, j, (st.rechts || [])[j])).join("")}
<td><select data-rp-feld="ansetzL" data-rp-i="${i}">${rinneAnsetzOptions(st.ansetzL)}</select></td>
<td><select data-rp-feld="ansetzR" data-rp-i="${i}">${rinneAnsetzOptions(st.ansetzR)}</select></td>
<td class="rp-erg">${rinneMm(g.abwicklungLinks)}</td>
<td class="rp-erg">${rinneMm(g.abwicklungRechts)}</td>
<td class="rp-erg rp-zuschnitt">${rinneMm(g.zuschnitt)}</td>
<td><button type="button" class="gray" data-rp-del="${i}" title="Stück löschen">×</button></td>
</tr>`;
  }).join("") || `<tr><td colspan="${spaltenZahl}" class="small">Noch kein Rinnenstück erfasst.</td></tr>`;

  if ($("rp_summary")) {
    const anzahl = rinneStuecke.length;
    const summeZuschnitt = rinneStuecke.reduce((s, st) => s + rinneStueckRechnen(st, w).zuschnitt, 0);
    const zaehler = {};
    RINNE_ANSETZ_REIHE.forEach(k => { zaehler[k] = 0; });
    rinneStuecke.forEach(st => {
      if (zaehler[st.ansetzL] !== undefined) zaehler[st.ansetzL]++;
      if (zaehler[st.ansetzR] !== undefined) zaehler[st.ansetzR]++;
    });
    $("rp_summary").innerHTML = anzahl
      ? `<b>${anzahl}</b> Stück · Zuschnitt gesamt <b>${rinneMm(summeZuschnitt)} mm</b> · `
        + RINNE_ANSETZ_REIHE.filter(k => zaehler[k] > 0)
          .map(k => `${rinneEsc(RINNE_ANSETZ_LABELS[k])} ${zaehler[k]}×`).join(" · ")
      : "";
  }
}

function renderRinneDiagramm() {
  if (!$("rp_diagram")) return;
  const erstes = rinneStuecke[0];
  $("rp_diagram").innerHTML = rinneSvg(rinneProfil, erstes ? erstes.links : null, null);
}

function renderRinneResult() {
  renderRinneProfilTabelle();
  renderRinneStueckTabelle();
  renderRinneDiagramm();
}

// ---- 10. Formular fuellen / zuruecksetzen -----------------------------
function rinneFormularFuellen(d) {
  if (!$("rp_stueckeBody")) return;
  const w = d ? rinneWerte(d) : rinneWerte(rinneProfilSettings);
  rinneProfil = w.profil;
  rinneAnsetz = w.ansetz;
  const anzahl = rinneVariable(rinneProfil).length;
  if (d && Array.isArray(d.stuecke)) {
    rinneStuecke = d.stuecke.map(st => rinneStueckAnpassen({
      // altes v2.56-Format {a,b,c} wird mit uebernommen
      links: Array.isArray(st.links) ? st.links.slice()
        : (st.links ? [st.links.a, st.links.b, st.links.c] : []),
      rechts: Array.isArray(st.rechts) ? st.rechts.slice()
        : (st.rechts ? [st.rechts.a, st.rechts.b, st.rechts.c] : []),
      laenge: st.laenge,
      ansetzL: RINNE_ANSETZ_LABELS[st.ansetzL] ? st.ansetzL : "dila",
      ansetzR: RINNE_ANSETZ_LABELS[st.ansetzR] ? st.ansetzR : "dila"
    }, anzahl));
  } else {
    rinneStuecke = [];
    rinneStuecke.push(rinneNeuesStueck());
  }
  if ($("rp_material")) $("rp_material").value = (d && d.material) || "";
  renderRinneResult();
}
function rinneFormularZuruecksetzen() { rinneFormularFuellen(null); }

// ---- 11. Einstellungsseite -------------------------------------------
function applyRinneProfilSettings() {
  if (!$("rpsDila")) return;
  const w = rinneWerte(rinneProfilSettings);
  const setzen = (id, wert) => { const el = $(id); if (el && document.activeElement !== el) el.value = wert; };
  setzen("rpsDila", w.ansetz.dila);
  setzen("rpsBoden", w.ansetz.boden);
  setzen("rpsAblauf", w.ansetz.ablauf);
  setzen("rpsGehrung", w.ansetz.gehrung);
  setzen("rpsNaht", w.ansetz.naht);
  setzen("rpsNichts", w.ansetz.nichts);
  if ($("rpsProfilInfo")) {
    const varListe = rinneVariable(w.profil);
    $("rpsProfilInfo").innerHTML = w.profil.map((seg, i) => {
      const v = varListe.find(x => x.index === i);
      return v
        ? `<b>${rinneEsc(v.buchstabe)}</b>${seg.name ? " " + rinneEsc(seg.name) : ""} (variabel)`
        : `${rinneEsc(seg.name || ("Segment " + (i + 1)))} ${rinneMm(seg.laenge)}`;
    }).join(" · ")
      + ` · Fixmasse gesamt <b>${rinneMm(rinneFixSumme(w.profil))} mm</b>`;
  }
}

// ---- 12. Bedienung ----------------------------------------------------
(function rinneFormularBinden() {
  if (!$("rp_stueckeBody")) return;
  rinneFormularFuellen(null);

  const dirty = () => { if (typeof isDirty !== "undefined") isDirty = true; };

  // --- Profiltabelle ---
  const pb = $("rp_profilBody");
  if (pb) {
    pb.addEventListener("input", e => {
      const el = e.target.closest("[data-rp-seg]");
      if (!el) return;
      const i = Number(el.dataset.rpI), seg = rinneProfil[i];
      if (!seg) return;
      const feld = el.dataset.rpSeg;
      // WICHTIG: hier wird die Profiltabelle bewusst NICHT neu gezeichnet.
      // Sonst verliert das gerade bearbeitete Feld nach dem ersten Zeichen
      // den Fokus, und beim Auswahlfeld "Art" wuerde die eben getroffene
      // Auswahl noch vor dem change-Ereignis wieder ueberschrieben.
      // "art" gehoert allein in den change-Handler darunter.
      if (feld === "art") return;
      if (feld === "name") seg.name = el.value;
      else if (feld === "laenge") { seg.laenge = el.value; renderRinneStueckTabelle(); }
      else if (feld === "winkel") seg.winkel = el.value;
      renderRinneProfilInfo();
      renderRinneDiagramm();
      dirty();
    });
    pb.addEventListener("change", e => {
      const el = e.target.closest('select[data-rp-seg="art"]');
      if (!el) return;
      const i = Number(el.dataset.rpI), seg = rinneProfil[i];
      if (!seg) return;
      seg.art = el.value === "var" ? "var" : "fix";
      if (seg.art === "fix" && !Number.isFinite(Number(seg.laenge))) seg.laenge = 0;
      rinneStueckeAnpassen();
      renderRinneResult();
      dirty();
    });
    pb.addEventListener("click", e => {
      const zahlBtn = (name) => {
        const b = e.target.closest("[data-rp-" + name + "]");
        return b ? Number(b.dataset["rp" + name.charAt(0).toUpperCase() + name.slice(1)]) : null;
      };
      const flip = zahlBtn("flip");
      if (flip !== null) { const s = rinneProfil[flip]; if (s) { s.winkel = -rinneZahl(s.winkel); renderRinneProfilTabelle(); renderRinneDiagramm(); dirty(); } return; }
      const um = zahlBtn("umschlag");
      if (um !== null) { const s = rinneProfil[um]; if (s) { s.winkel = 180; renderRinneProfilTabelle(); renderRinneDiagramm(); dirty(); } return; }
      const up = zahlBtn("up");
      if (up !== null) { if (up > 0) { const s = rinneProfil.splice(up, 1)[0]; rinneProfil.splice(up - 1, 0, s); rinneStueckeAnpassen(); renderRinneResult(); dirty(); } return; }
      const down = zahlBtn("down");
      if (down !== null) { if (down < rinneProfil.length - 1) { const s = rinneProfil.splice(down, 1)[0]; rinneProfil.splice(down + 1, 0, s); rinneStueckeAnpassen(); renderRinneResult(); dirty(); } return; }
      const del = e.target.closest("[data-rp-segdel]");
      if (del) {
        const i = Number(del.dataset.rpSegdel);
        const seg = rinneProfil[i];
        if (!seg) return;
        if (!confirm("Segment " + (i + 1) + (seg.name ? " („" + seg.name + "“)" : "") + " aus dem Profil löschen?")) return;
        rinneProfil.splice(i, 1);
        rinneStueckeAnpassen();
        renderRinneResult();
        dirty();
      }
    });
  }

  if ($("rp_addSegment")) $("rp_addSegment").onclick = () => {
    rinneProfil.push(rinneSegment({ name: "", art: "fix", laenge: 0, winkel: 0 }));
    rinneStueckeAnpassen();
    renderRinneResult();
    dirty();
  };
  if ($("rp_resetProfil")) $("rp_resetProfil").onclick = () => {
    if (!confirm("Profil auf das Standardprofil der Excel-Vorlage zurücksetzen?\n\nDie erfassten Rinnenstücke bleiben erhalten und werden auf die dann gültige Anzahl variabler Masse angepasst.")) return;
    rinneProfil = RINNE_STANDARDPROFIL.map(rinneSegment);
    rinneStueckeAnpassen();
    renderRinneResult();
    dirty();
  };
  if ($("rp_profilAlsStandard")) $("rp_profilAlsStandard").onclick = () => {
    rinneProfilEinstellungenSichern({ profil: rinneProfil, ansetz: rinneAnsetz });
    applyRinneProfilSettings();
    alert("Dieses Profil gilt jetzt als Vorgabe für neue Rinnen-Massaufnahmen (nur auf diesem Gerät).\n\nBereits gespeicherte Massaufnahmen behalten ihr eigenes Profil.");
  };

  // --- Stueckliste ---
  const body = $("rp_stueckeBody");
  body.addEventListener("input", e => {
    const el = e.target.closest("[data-rp-feld]");
    if (!el) return;
    const i = Number(el.dataset.rpI), st = rinneStuecke[i];
    if (!st) return;
    const feld = el.dataset.rpFeld;
    if (feld === "links" || feld === "rechts") {
      const j = Number(el.dataset.rpJ);
      if (!Array.isArray(st[feld])) st[feld] = [];
      st[feld][j] = el.value;
    } else {
      st[feld] = el.value;
    }
    // Nur die Ergebniszellen der betroffenen Zeile neu setzen, damit der
    // Cursor im Eingabefeld nicht verloren geht.
    const g = rinneStueckRechnen(st, rinneAktiveWerte());
    const tr = el.closest("tr");
    if (tr) {
      const zellen = tr.querySelectorAll(".rp-erg");
      if (zellen.length === 3) {
        zellen[0].textContent = rinneMm(g.abwicklungLinks);
        zellen[1].textContent = rinneMm(g.abwicklungRechts);
        zellen[2].textContent = rinneMm(g.zuschnitt);
      }
    }
    if (i === 0) renderRinneDiagramm();
    dirty();
  });
  body.addEventListener("change", e => {
    if (!e.target.closest("select[data-rp-feld]")) return;
    renderRinneStueckTabelle();
    dirty();
  });
  body.addEventListener("click", e => {
    const del = e.target.closest("[data-rp-del]");
    if (!del) return;
    const i = Number(del.dataset.rpDel);
    if (!rinneStuecke[i]) return;
    if (!confirm("Rinnenstück " + (i + 1) + " löschen?")) return;
    rinneStuecke.splice(i, 1);
    renderRinneStueckTabelle();
    renderRinneDiagramm();
    dirty();
  });

  if ($("rp_addStueck")) $("rp_addStueck").onclick = () => {
    rinneStuecke.push(rinneNeuesStueck());
    renderRinneStueckTabelle();
    dirty();
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

  $("saveRinneProfilSettings").onclick = () => {
    const zahl = id => Number($(id).value);
    const ansetz = {
      dila: zahl("rpsDila"), boden: zahl("rpsBoden"), ablauf: zahl("rpsAblauf"),
      gehrung: zahl("rpsGehrung"), naht: zahl("rpsNaht"), nichts: zahl("rpsNichts")
    };
    if (Object.keys(ansetz).some(k => !Number.isFinite(ansetz[k]))) {
      alert("Bitte in allen Feldern eine Zahl eingeben."); return;
    }
    rinneProfilEinstellungenSichern({ profil: rinneWerte(rinneProfilSettings).profil, ansetz });
    applyRinneProfilSettings();
    alert("Gespeichert (gilt nur für dieses Gerät).\n\nBereits gespeicherte Rinnen-Massaufnahmen behalten ihre bisherigen Werte.");
  };

  $("resetRinneProfilSettings").onclick = () => {
    if (!confirm("Standardprofil und Ansetztypen auf die Werte der Excel-Vorlage zurücksetzen?")) return;
    rinneProfilEinstellungenSichern({
      profil: RINNE_STANDARDPROFIL.map(rinneSegment),
      ansetz: Object.assign({}, RINNE_ANSETZ_STANDARD)
    });
    applyRinneProfilSettings();
    alert("Auf die Werte der Excel-Vorlage zurückgesetzt.");
  };
})();
