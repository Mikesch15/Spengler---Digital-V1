"use strict";
// ============================================================
// Einfassung Rund · Dunstrohr-/Standrohreinfassung
//
// Nach Handskizze: seitlicher Schnitt durch die runde Einfassung.
// Nur der Querschnitt wird gezeichnet, ohne Deckmaterial und ohne
// Unterkonstruktion (Wunsch des Anwenders) – und nur die Profillinie
// selbst, kein Umfang um das Rohr herum (das Rohr wird nicht als
// Abwicklung um sich selbst modelliert). "Breite der gesamten
// Einfassung" ist eine eigenständige, vom Querschnitt unabhängige
// Zahl aus Rohrdurchmesser + 2× Umschlag + 2× Mass seitlich neben Rohr.
//
// Geometrie:
//   vorne  Anreiss (fest 20° steiler als die Dachschräge, kurzes
//          festes Stück) mit anschliessendem 180°-Umschlag
//   a      Vorderkante auf Deckmaterial bis Mitte Rohr – liegt in der
//          Dachschräge (Winkel)
//   b      ab Mitte Rohr bis hinten, unter das Deckmaterial – liegt
//          ebenfalls in der Dachschräge
//   c      90°-Aufbug, immer im rechten Winkel zur Dachschräge davor
//          (wie jede andere Kantung – keine eigene Vertikale)
//   oben   135°-Umschlag am Kopf des Aufbugs, relativ zu c
//
// Nicht der Aufbug steht senkrecht, sondern das Rohr selbst: es wird
// separat, echt im Lot, an der Mitte zwischen a und b eingezeichnet
// (Querschnitt als zwei senkrechte Linien im Rohrdurchmesser
// auseinander, ohne Umfang).
//
// Zeichnung nutzt bewusst die vorhandenen, zustandslosen Bausteine aus
// js/20-anschlussblech.js (anbSaum, anbMassWaag, anbMassSenk, anbFahne,
// ANB_FARBE, anbEsc) – siehe NOTIZEN.md "Geteilte Bausteine". Deshalb
// muss diese Datei nach 20-anschlussblech.js laden.
// ============================================================

// ---- 1. Tabellen ---------------------------------------------------
// Nur der Name wird gebraucht: Deckmaterial und Unterkonstruktion
// werden in der Zeichnung nicht dargestellt (Wunsch des Anwenders).
const EINF_DECKUNGEN = Object.freeze({
  biber_einfach: { name: "Biberschwanz einfach" },
  biber_doppel:  { name: "Biberschwanz doppeldeckung" },
  schiebeziegel: { name: "Schiebeziegel" },
  muldenziegel:  { name: "Muldenziegel" },
  eternit:       { name: "Eternit" },
  naturschiefer: { name: "Naturschiefer" }
});

// Anreiss vorne: fixer Winkel und eine kleine, feste Länge – kein
// eigenes Eingabefeld, siehe Rückmeldung an den Anwender.
const EINF_ANREISS_WINKEL = 20;
const EINF_ANREISS_LAENGE = 18;

// ---- 2. Eigene Einstellungen ---------------------------------------
// "Umschlag" und "Mass seitlich neben Rohr" gelten nur für die Breite
// der gesamten Einfassung (2x gerechnet) und für die Länge des vorderen
// und oberen Umschlags in der Zeichnung/Abwicklung. Gilt firmenweit
// gedacht, technisch aber wie beim Anschlussblech pro Gerät gespeichert.
const EINFASSUNG_STANDARD = Object.freeze({
  deckung: "biber_einfach",
  umschlag: 20,        // Umschlag vorne (180°) und oben am Aufbug (135°)
  mass_seitlich: 100,  // Mass seitlich neben Rohr
  lattenabstand: 330,  // für Anzahl Bleilappen
  // Vorgabemasse einer NEUEN Einfassung (v2.99, auf Ansage des Betriebs).
  // Sie werden beim Anlegen einmal übernommen und sind danach je Einfassung
  // frei änderbar; ein gespeicherter Datensatz bleibt unverändert.
  mass_a: 250,         // a · Vorderkante auf Deckmaterial bis Mitte Rohr
  mass_b: 200,         // b · ab Mitte Rohr bis hinten, unter das Deckmaterial
  mass_c: 35           // c · 90°-Aufbug hinten
});
const EINF_EINSTELLUNGEN = "sd_einfassungRundSettings";

let einfassungSettings = einfEinstellungenLaden();

function einfEinstellungenLaden() {
  let w = null;
  try { w = JSON.parse(localStorage.getItem(EINF_EINSTELLUNGEN) || "null"); } catch (e) { w = null; }
  w = Object.assign({}, EINFASSUNG_STANDARD, w || {});
  if (!EINF_DECKUNGEN[w.deckung]) w.deckung = EINFASSUNG_STANDARD.deckung;
  return w;
}
function einfEinstellungenSichern(w) {
  einfassungSettings = w;
  try { localStorage.setItem(EINF_EINSTELLUNGEN, JSON.stringify(w)); } catch (e) { }
}

function einfVorgabe() {
  const s = einfassungSettings || EINFASSUNG_STANDARD;
  const deckung = EINF_DECKUNGEN[s.deckung] ? s.deckung : "biber_einfach";
  const zahl = (v, ersatz) => (Number.isFinite(Number(v)) ? Number(v) : ersatz);
  return {
    deckung: deckung,
    durchmesser: 110, winkel: 30,
    a: zahl(s.mass_a, EINFASSUNG_STANDARD.mass_a),
    b: zahl(s.mass_b, EINFASSUNG_STANDARD.mass_b),
    c: zahl(s.mass_c, EINFASSUNG_STANDARD.mass_c),
    lattenabstand: s.lattenabstand
  };
}

// ---- 3. Profil und Zeichnung ----------------------------------------
// Nicht der Aufbug c steht senkrecht, sondern das Rohr selbst – c ist
// wie jede andere Kantung ein fester 90°-Winkel zur Dachschräge davor.
// a und b liegen in der Dachschräge und werden um den Winkel gedreht;
// der 135°-Umschlag oben ist wiederum relativ zu c. Das Rohr (Mitte
// zwischen a und b) wird separat, echt senkrecht, eingezeichnet – nur
// als Querschnitt (zwei senkrechte Linien im Rohrdurchmesser
// auseinander), kein Umfang.
// Rückgabe: pts (Punktfolge in mm, vorne → oben), foldLen (Länge des
// vorderen wie des oberen Umschlags), aMid/bMid (Mittelpunkte von a
// und b) und rohrMitte (Punkt zwischen a und b, dort steht das Rohr).
function einfProfil(e) {
  const z = v => Number(v) || 0;
  const a = z(e.a), b = z(e.b), c = z(e.c);
  const winkel = z(e.winkel);
  const s = einfassungSettings || EINFASSUNG_STANDARD;
  const foldLen = Math.max(0, Number(s.umschlag) || 0);

  const rot = (v, grad) => {
    const r = grad * Math.PI / 180;
    return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)];
  };
  const u = rot([1, 0], winkel);                         // Dachschräge, bergwärts
  const kickDir = rot(u, EINF_ANREISS_WINKEL);            // Anreiss: steiler als die Dachschräge
  const cDir = rot(u, 90);                                // Aufbug: immer 90° zur Dachschräge

  const p0 = [0, 0];
  const p1 = [p0[0] + kickDir[0] * EINF_ANREISS_LAENGE, p0[1] + kickDir[1] * EINF_ANREISS_LAENGE];
  const p2 = [p1[0] + u[0] * a, p1[1] + u[1] * a];        // Mitte Rohr
  const p3 = [p2[0] + u[0] * b, p2[1] + u[1] * b];
  const p4 = [p3[0] + cDir[0] * c, p3[1] + cDir[1] * c];
  const foldDir = rot(cDir, 135);                         // 135°-Umschlag, relativ zu c
  const p5 = [p4[0] + foldDir[0] * foldLen, p4[1] + foldDir[1] * foldLen];

  return {
    pts: [p0, p1, p2, p3, p4, p5],
    foldLen: foldLen,
    aMid: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
    bMid: [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2],
    rohrMitte: p2
  };
}

function einfZeichnung(e) {
  const p = einfProfil(e);
  const a = Number(e.a) || 0, b = Number(e.b) || 0, c = Number(e.c) || 0;
  const durchmesser = Math.max(0, Number(e.durchmesser) || 0);
  const foldLen = p.foldLen;
  const zahl = v => String(Math.round(Number(v) || 0));

  const rM = p.rohrMitte, rHalb = durchmesser / 2;
  const rOben = Math.max(p.pts[3][1], p.pts[4][1], p.pts[5][1]) + 36;
  const rUnten = rM[1] - 36;

  let xMin = 0, xMax = 0, yMin = 0, yMax = 0;
  p.pts.forEach(q => {
    xMin = Math.min(xMin, q[0]); xMax = Math.max(xMax, q[0]);
    yMin = Math.min(yMin, q[1]); yMax = Math.max(yMax, q[1]);
  });
  if (durchmesser > 0) {
    xMin = Math.min(xMin, rM[0] - rHalb); xMax = Math.max(xMax, rM[0] + rHalb);
    yMin = Math.min(yMin, rUnten - 20); yMax = Math.max(yMax, rOben);
  }
  xMin -= 48;                                    // Platz für die Masskette "c" am linken Rand
  xMax += 40; yMin -= 34; yMax += 34;

  const breitePx = 680, rand = 12;
  let s = (breitePx - 2 * rand) / (xMax - xMin);
  if (s > 1.8) s = 1.8;
  const hoehePx = Math.round((yMax - yMin) * s + 2 * rand);
  const ox = rand - xMin * s;
  const oy = rand + yMax * s;
  const X = x => Math.round((ox + x * s) * 10) / 10;
  const Y = y => Math.round((oy - y * s) * 10) / 10;

  let g = "";
  if (durchmesser > 0) {
    g += `<rect x="${X(rM[0] - rHalb)}" y="${Y(rOben)}" width="${(X(rM[0] + rHalb) - X(rM[0] - rHalb)).toFixed(1)}"
          height="${(Y(rUnten) - Y(rOben)).toFixed(1)}" fill="#eef1f3" stroke="${ANB_FARBE.bau}"
          stroke-width="1" stroke-dasharray="4 3"/>`;
    g += anbMassWaag(rM[0] - rHalb, rM[0] + rHalb, rUnten - 20, "Ø " + zahl(durchmesser), X, Y, true);
  }

  const dd = p.pts.map((q, i) => (i ? "L" : "M") + X(q[0]) + " " + Y(q[1])).join(" ");
  g += `<path d="${dd}" fill="none" stroke="${ANB_FARBE.blech}" stroke-width="3.4"
        stroke-linejoin="round" stroke-linecap="round"/>`;
  if (foldLen > 0) g += anbSaum(p.pts[1], p.pts[0], foldLen, X, Y);

  g += anbFahne(p.aMid[0], p.aMid[1], 0, -26, "a = " + zahl(a), X, Y);
  g += anbFahne(p.bMid[0], p.bMid[1], 0, -26, "b = " + zahl(b), X, Y);
  const cMid = [(p.pts[3][0] + p.pts[4][0]) / 2, (p.pts[3][1] + p.pts[4][1]) / 2];
  g += anbFahne(cMid[0], cMid[1], 26, 0, "c = " + zahl(c) + " · 90°", X, Y);
  if (foldLen > 0) {
    g += anbFahne(p.pts[0][0], p.pts[0][1], -30, -8, "180° · Anreiss 20°", X, Y);
    g += anbFahne(p.pts[5][0], p.pts[5][1], 22, -18, "Umschlag oben 135°", X, Y);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breitePx} ${hoehePx}"
    width="100%" style="display:block;height:auto" font-family="Arial,Helvetica,sans-serif">
    <rect width="${breitePx}" height="${hoehePx}" fill="#fff"/>
    ${g}
    <text x="${breitePx - 8}" y="${hoehePx - 7}" text-anchor="end" font-size="11"
      fill="#8b969e">Einfassung Rund · Schnitt (Umfang nicht dargestellt) · Rohr senkrecht</text>
  </svg>`;
}

// ---- 4. Rechnen ------------------------------------------------------
function einfBerechnen(e) {
  const p = einfProfil(e);
  let l = 0;
  for (let i = 1; i < p.pts.length; i++) {
    l += Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]);
  }
  l += p.foldLen;                                // vorderer 180°-Umschlag, kein eigener Punkt

  const s = einfassungSettings || EINFASSUNG_STANDARD;
  const durchmesser = Math.max(0, Number(e.durchmesser) || 0);
  const umschlag = Math.max(0, Number(s.umschlag) || 0);
  const massSeitlich = Math.max(0, Number(s.mass_seitlich) || 0);
  const breiteGesamt = durchmesser > 0 ? Math.round(durchmesser + 2 * umschlag + 2 * massSeitlich) : null;

  // Anzahl Bleilappen = Umfang des Rohrs geteilt durch den Lattenabstand.
  // AUFGERUNDET, nicht abgerundet: die Lappen muessen den ganzen Umfang
  // abdecken. Abrunden liess einen Rest unbedeckt (bei einem 200er Rohr
  // ergab es 1 Lappen fuer 628 mm Umfang) - das war der gemeldete Fehler.
  // Ohne Lattenabstand ist die Zahl nicht bestimmbar; dann bleibt sie null
  // und die Anzeige zeigt "-", statt eine erfundene Zahl zu nennen.
  let anzahlBleilappen = null;
  const lattenabstand = Number(e.lattenabstand) || 0;
  if (Number.isFinite(durchmesser) && durchmesser > 0 && Number.isFinite(lattenabstand) && lattenabstand > 0) {
    anzahlBleilappen = Math.max(1, Math.ceil((Math.PI * durchmesser) / lattenabstand));
  }

  const warnungen = [];
  if (!(Number(e.a) > 0)) warnungen.push("Mass a fehlt oder ist 0.");
  if (!(Number(e.c) > 0)) warnungen.push("Mass c (Aufbug) fehlt oder ist 0.");
  if (!(durchmesser > 0)) warnungen.push("Bitte den Rohrdurchmesser eingeben.");
  if (durchmesser > 0 && !(lattenabstand > 0))
    warnungen.push("Ohne Lattenabstand kann die Anzahl Bleilappen nicht berechnet werden.");

  return {
    abwicklung: Math.round(l),
    breiteGesamt: breiteGesamt,
    anzahlBleilappen: anzahlBleilappen,
    warnungen: warnungen,
    profil: p
  };
}

// ---- 5. Oberfläche -----------------------------------------------
function einfEingabenAusFeldern() {
  const vorgabe = einfVorgabe();
  if (!$("einf_deckung")) return vorgabe;
  const zahl = id => Number(($(id) || {}).value) || 0;
  return Object.assign(vorgabe, {
    deckung: $("einf_deckung").value || vorgabe.deckung,
    durchmesser: zahl("einf_durchmesser"),
    winkel: zahl("einf_winkel"),
    a: zahl("einf_a"),
    b: zahl("einf_b"),
    c: zahl("einf_c"),
    lattenabstand: zahl("einf_lattenabstand")
  });
}

function einfFesteFelderFuellen(w) {
  $("einf_deckung").innerHTML = Object.keys(EINF_DECKUNGEN)
    .map(k => `<option value="${k}"${k === w.deckung ? " selected" : ""}>${anbEsc(EINF_DECKUNGEN[k].name)}</option>`).join("");
  $("einf_durchmesser").value = Math.round(w.durchmesser || 0);
  $("einf_winkel").value = w.winkel || 0;
  $("einf_a").value = Math.round(w.a || 0);
  $("einf_b").value = Math.round(w.b || 0);
  $("einf_c").value = Math.round(w.c || 0);
  $("einf_lattenabstand").value = Math.round(w.lattenabstand || 0);
}

function renderEinfResult() {
  if (!$("einf_zeichnung")) return;
  const e = einfEingabenAusFeldern();
  const erg = einfBerechnen(e);
  $("einf_zeichnung").innerHTML = einfZeichnung(e);

  const warn = $("einf_warnung");
  if (warn) {
    warn.innerHTML = erg.warnungen.length ? "⚠️ " + erg.warnungen.map(anbEsc).join("<br>") : "Alle Angaben vorhanden.";
    warn.style.color = erg.warnungen.length ? "var(--red)" : "var(--muted)";
  }

  const kasten = (label, wert) =>
    `<div><label>${anbEsc(label)}</label><div style="font-weight:800;padding:9px 0">${anbEsc(wert)}</div></div>`;
  $("einf_ergebnis").innerHTML =
    kasten("Zuschnittbreite (Querschnitt)", erg.abwicklung + " mm")
    + kasten("Breite der gesamten Einfassung", erg.breiteGesamt ? erg.breiteGesamt + " mm" : "–")
    // Die Zeile bleibt immer stehen - verschwindet sie, sieht der Benutzer
    // nicht, WARUM keine Zahl kommt.
    + kasten("Anzahl Bleilappen", erg.anzahlBleilappen !== null ? String(erg.anzahlBleilappen) : "–");
}

function einfFormularFuellen(d) {
  if (!$("einf_deckung")) return;
  const w = Object.assign(einfVorgabe(), d || {});
  einfFesteFelderFuellen(w);
  renderEinfResult();
}
function einfFormularZuruecksetzen() { einfFormularFuellen(null); }

// ---- 6. Einstellungsseite ------------------------------------------
function applyEinfassungSettings() {
  if (!$("einfsUmschlag")) return;
  const s = einfassungSettings;
  const sel = $("einfsDeckung");
  if (sel && document.activeElement !== sel) {
    sel.innerHTML = Object.keys(EINF_DECKUNGEN)
      .map(k => `<option value="${k}"${k === s.deckung ? " selected" : ""}>${anbEsc(EINF_DECKUNGEN[k].name)}</option>`).join("");
  }
  const setzen = (id, wert) => {
    const el = $(id);
    if (el && document.activeElement !== el) el.value = wert;
  };
  setzen("einfsUmschlag", s.umschlag);
  setzen("einfsMassSeitlich", s.mass_seitlich);
  setzen("einfsLattenabstand", s.lattenabstand);
  setzen("einfsMassA", s.mass_a);
  setzen("einfsMassB", s.mass_b);
  setzen("einfsMassC", s.mass_c);
}

// ---- 7. Bedienung ----------------------------------------------------
(function einfFormularBinden() {
  if (!$("einf_deckung")) return;
  einfFormularFuellen(null);

  $("einf_deckung").onchange = renderEinfResult;
  ["einf_durchmesser", "einf_winkel", "einf_a", "einf_b", "einf_c", "einf_lattenabstand"]
    .forEach(id => { const el = $(id); if (el) el.addEventListener("input", renderEinfResult); });

  const knopf = $("openEinfassungSettings");
  if (knopf) knopf.onclick = () => {
    if (typeof renderSettings !== "function") return;
    settingsReturnToMeasurement = true;
    $("measurementEditModal").hidden = true;
    renderSettings();
    if (typeof applyCompanyName === "function") applyCompanyName();
    applyEinfassungSettings();
    document.querySelectorAll(".settings-tab").forEach(b => b.classList.toggle("active", b.dataset.settingsTab === "measurements"));
    document.querySelectorAll(".settings-tab-panel").forEach(p => { p.hidden = (p.dataset.settingsPanel !== "measurements"); });
    const sec = document.querySelector('.settings-section[data-section="einfassung-rund"]');
    if (sec) sec.classList.add("open");
    $("settingsModal").hidden = false;
  };
})();

(function einfEinstellungenBinden() {
  if (!$("saveEinfassungSettings")) return;
  applyEinfassungSettings();

  $("saveEinfassungSettings").onclick = () => {
    const zahl = id => Number($(id).value);
    const w = {
      deckung: $("einfsDeckung").value,
      umschlag: zahl("einfsUmschlag") || 0,
      mass_seitlich: zahl("einfsMassSeitlich") || 0,
      lattenabstand: zahl("einfsLattenabstand") || 0,
      mass_a: zahl("einfsMassA") || 0,
      mass_b: zahl("einfsMassB") || 0,
      mass_c: zahl("einfsMassC") || 0
    };
    if (!EINF_DECKUNGEN[w.deckung]) { alert("Bitte ein Deckmaterial wählen."); return; }
    const negativ = ["umschlag", "mass_seitlich", "lattenabstand", "mass_a", "mass_b", "mass_c"].some(k => w[k] < 0);
    if (negativ) { alert("Diese Werte dürfen nicht negativ sein."); return; }
    einfEinstellungenSichern(w);
    applyEinfassungSettings();
    alert("Gespeichert (gilt nur für dieses Gerät).");
  };

  $("resetEinfassungSettings").onclick = () => {
    if (!confirm("Alle Werte der Einfassung Rund auf die Standardwerte zurücksetzen?")) return;
    einfEinstellungenSichern(Object.assign({}, EINFASSUNG_STANDARD));
    applyEinfassungSettings();
    alert("Auf Standardwerte zurückgesetzt.");
  };
})();
