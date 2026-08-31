"use strict";
// ============================================================
// Einfassung Rund · Dunstrohr-/Standrohreinfassung
//
// Nach Handskizze: seitlicher Schnitt durch die runde Einfassung.
//   x = 0   Vorderkante (auf dem Deckmaterial, mit 180°-Umschlag)
//   y = 0   Oberkante Deckmaterial/Schalung
// Nur der Querschnitt wird gezeichnet – der Umfang um das Rohr wird
// nicht als Abwicklung um das Rohr herum modelliert (Rückmeldung des
// Anwenders). "Breite der gesamten Einfassung" ist eine eigenständige,
// vom Querschnitt unabhängige Zahl aus Rohrdurchmesser + 2× Umschlag +
// 2× Mass seitlich neben Rohr.
//
// Geometrie (bestes Verständnis der Handskizze, siehe Rückmeldung an
// den Anwender nach dem Einbau):
//   vorne  180°-Umschlag (Anreiss ca. 20°, nicht eigens gezeichnet)
//   a      Vorderkante auf Deckmaterial bis Mitte Rohr
//   b      ab Mitte Rohr bis hinten, unter das Deckmaterial
//   c      90°-Aufbug (senkrecht) an der Rückseite
//   oben   135°-Umschlag am Kopf des Aufbugs
//
// Zeichnung nutzt bewusst die vorhandenen, zustandslosen Bausteine aus
// js/20-anschlussblech.js (anbSaum, anbMassWaag, anbMassSenk, anbFahne,
// anbDeckPfad, ANB_FARBE, anbEsc) – siehe NOTIZEN.md "Geteilte
// Bausteine". Deshalb muss diese Datei nach 20-anschlussblech.js laden.
// ============================================================

// ---- 1. Tabellen ---------------------------------------------------
const EINF_DECKUNGEN = Object.freeze({
  biber_einfach: { name: "Biberschwanz einfach",       art: "flach",  hoehe: 35 },
  biber_doppel:  { name: "Biberschwanz doppeldeckung", art: "flach",  hoehe: 40 },
  schiebeziegel: { name: "Schiebeziegel",              art: "pfanne", hoehe: 55 },
  muldenziegel:  { name: "Muldenziegel",               art: "pfanne", hoehe: 50 },
  eternit:       { name: "Eternit",                    art: "flach",  hoehe: 16 },
  naturschiefer: { name: "Naturschiefer",               art: "flach",  hoehe: 14 }
});

// ---- 2. Eigene Einstellungen ---------------------------------------
// "Umschlag" und "Mass seitlich neben Rohr" gelten nur für die Breite
// der gesamten Einfassung (2x gerechnet) und für die Länge des vorderen
// und oberen Umschlags in der Zeichnung/Abwicklung. Gilt firmenweit
// gedacht, technisch aber wie beim Anschlussblech pro Gerät gespeichert.
const EINFASSUNG_STANDARD = Object.freeze({
  deckung: "biber_einfach",
  umschlag: 20,        // Umschlag vorne (180°) und oben am Aufbug (135°)
  mass_seitlich: 100,  // Mass seitlich neben Rohr
  lattenabstand: 330   // für Anzahl Bleilappen
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
  return {
    deckung: deckung,
    durchmesser: 110, winkel: 0, a: 60, b: 60, c: 100,
    lattenabstand: s.lattenabstand
  };
}

// ---- 3. Profil und Zeichnung ----------------------------------------
// Rückgabe: pts (Punktfolge in mm), deckAb, deckHoehe, foldLen (Länge
// des vorderen wie des oberen Umschlags, aus den Einstellungen).
function einfProfil(e) {
  const z = v => Number(v) || 0;
  const a = z(e.a), b = z(e.b), c = z(e.c);
  const s = einfassungSettings || EINFASSUNG_STANDARD;
  const foldLen = Math.max(0, Number(s.umschlag) || 0);
  const theta = 135 * Math.PI / 180;           // 135°-Umschlag am Kopf des Aufbugs
  const dirx = -Math.sin(theta), diry = Math.cos(theta);
  const p0 = [0, 0];
  const p1 = [a, 0];
  const p2 = [a + b, 0];
  const p3 = [a + b, c];
  const p4 = [p3[0] + foldLen * dirx, p3[1] + foldLen * diry];
  return {
    pts: [p0, p1, p2, p3, p4],
    deckAb: a,
    deckHoehe: Math.max(5, (EINF_DECKUNGEN[e.deckung] || {}).hoehe || 0),
    foldLen: foldLen
  };
}

function einfZeichnung(e) {
  const p = einfProfil(e);
  const dk = EINF_DECKUNGEN[e.deckung] || EINF_DECKUNGEN.biber_einfach;
  const a = Number(e.a) || 0, b = Number(e.b) || 0, c = Number(e.c) || 0;
  const hd = p.deckHoehe, foldLen = p.foldLen;
  const zahl = v => String(Math.round(Number(v) || 0));

  let xMin = 0, xMax = 0, yMin = 0, yTeil = 0;
  p.pts.forEach(q => {
    xMin = Math.min(xMin, q[0]); xMax = Math.max(xMax, q[0]);
    yMin = Math.min(yMin, q[1]); yTeil = Math.max(yTeil, q[1]);
  });
  const deckBis = xMax + 160;
  const deckOben = c + hd;

  const schalung = 26;
  xMin -= 48;                                   // Platz für die Masskette "c" am linken Rand
  const yMass = Math.max(deckOben, yTeil) + 42;
  yMin = Math.min(yMin, -schalung) - 42;
  const yMax = yMass + 30;

  const breitePx = 680, rand = 12;
  let s = (breitePx - 2 * rand) / (deckBis - xMin);
  if (s > 1.6) s = 1.6;
  const hoehePx = Math.round((yMax - yMin) * s + 2 * rand);
  const ox = rand - xMin * s;
  const oy = rand + yMax * s;
  const X = x => Math.round((ox + x * s) * 10) / 10;
  const Y = y => Math.round((oy - y * s) * 10) / 10;

  let g = "";
  g += `<path d="M${X(xMin + 8)} ${Y(0)} L${X(deckBis)} ${Y(0)} L${X(deckBis)} ${Y(-schalung)} L${X(xMin + 8)} ${Y(-schalung)} Z"
        fill="#fff" stroke="${ANB_FARBE.bau}" stroke-width="1"/>`;
  g += anbDeckPfad(p.deckAb, deckBis, hd, dk.art, X, Y, 0);

  const dd = p.pts.map((q, i) => (i ? "L" : "M") + X(q[0]) + " " + Y(q[1])).join(" ");
  g += `<path d="${dd}" fill="none" stroke="${ANB_FARBE.blech}" stroke-width="3.4"
        stroke-linejoin="round" stroke-linecap="round"/>`;
  if (foldLen > 0) g += anbSaum(p.pts[1], p.pts[0], foldLen, X, Y);

  const waag = (x1, x2, txt) => anbMassWaag(x1, x2, yMass, txt, X, Y);
  g += waag(0, a, "a = " + zahl(a)) + waag(a, a + b, "b = " + zahl(b));
  g += anbMassSenk(0, c, xMin + 16, "c = " + zahl(c), X, Y);

  if (foldLen > 0) {
    g += anbFahne(p.pts[0][0], p.pts[0][1], -28, 22, "Umschlag 180° · Anreiss ca. 20°", X, Y);
    g += anbFahne(p.pts[4][0], p.pts[4][1], 24, -16, "Umschlag oben 135° · " + zahl(foldLen), X, Y);
  }
  g += anbFahne(deckBis - 26, 0, -26, -26, "Deckmaterial " + zahl(hd), X, Y);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breitePx} ${hoehePx}"
    width="100%" style="display:block;height:auto" font-family="Arial,Helvetica,sans-serif">
    <rect width="${breitePx}" height="${hoehePx}" fill="#fff"/>
    ${g}
    <text x="${breitePx - 8}" y="${hoehePx - 7}" text-anchor="end" font-size="11"
      fill="#8b969e">Einfassung Rund · Schnitt (Umfang nicht dargestellt)</text>
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

  let anzahlBleilappen = null;
  if (durchmesser > 0) {
    const lattenabstand = Math.max(1, Number(e.lattenabstand) || 0);
    anzahlBleilappen = Math.max(1, Math.floor((Math.PI * durchmesser) / lattenabstand));
  }

  const warnungen = [];
  if (!(Number(e.a) > 0)) warnungen.push("Mass a fehlt oder ist 0.");
  if (!(Number(e.c) > 0)) warnungen.push("Mass c (Aufbug) fehlt oder ist 0.");
  if (!(durchmesser > 0)) warnungen.push("Bitte den Rohrdurchmesser eingeben.");

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
    + (erg.anzahlBleilappen !== null ? kasten("Anzahl Bleilappen", erg.anzahlBleilappen) : "");
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
      lattenabstand: zahl("einfsLattenabstand") || 0
    };
    if (!EINF_DECKUNGEN[w.deckung]) { alert("Bitte ein Deckmaterial wählen."); return; }
    const negativ = ["umschlag", "mass_seitlich", "lattenabstand"].some(k => w[k] < 0);
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
