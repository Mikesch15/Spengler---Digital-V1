"use strict";
// ============================================================
// Anschlussbleche · Seitenblech und Ortblech
//
// Grundlage: "Dimensionierung der Anschlussbleche" [7.3.37].
// Die Zeichnung ist ein Schnitt quer zum Blech:
//   x = 0   Wandflucht (Seitenblech) bzw. Dachrand (Ortblech)
//   y = 0   Oberkante Schalung, y zeigt nach oben
// Alle Masse in Millimetern, alle Ausgaben auf ganze mm gerundet.
//
// Aufbau der Datei
//   1. Tabellen   – Deckungen, Anschlussarten, Mindestmasse
//   2. Profil     – die rote Blechlinie als Punktfolge
//   3. Zeichnung  – SVG aus dieser Punktfolge
//   4. Rechnen    – Abwicklung, Mindestmasse, Stückliste
//   5. Oberfläche – Felder lesen und anzeigen
//
// Nur Abschnitt 5 hängt am Bildschirm. 1 bis 4 rechnen für sich allein
// und lassen sich später unverändert im Massaufnahme-Formular und im
// PDF-Ausdruck verwenden.
// ============================================================

// ---- 1. Tabellen -------------------------------------------------

// Deckmaterialien. "hoehe" ist die übliche Höhe des Deckmaterials über
// der Lattung – sie wird für die Zeichnung und für den Steg gebraucht
// und ist am Bau nachzumessen.
const ANB_DECKUNGEN = Object.freeze({
  pfanne:      { name: "Pfannenziegel",              art: "pfanne", hoehe: 60 },
  falzziegel:  { name: "Flachfalzziegel",            art: "pfanne", hoehe: 45 },
  biber:       { name: "Biberschwanzziegel",         art: "flach",  hoehe: 35, bMin: 60 },
  schiefer:    { name: "Naturschiefer",              art: "flach",  hoehe: 14 },
  faserzement: { name: "Faserzement, kleinformatig", art: "flach",  hoehe: 16 },
  welle:       { name: "Gewellte, grossformatige Deckung", art: "welle", hoehe: 55, nur: ["welle"] }
});

// Anschlussarten mit den bemassten Massen und ihren Mindestwerten.
// min = null heisst: kein Mindestmass, wird nur nachgemessen.
const ANB_ARTEN = Object.freeze({
  bleilappen: {
    name: "Anschluss mit Bleilappen",
    masse: {
      a: { std: 50, min: 50, text: "Blech bis Deckmaterial" },
      b: { std: 50, min: 50, text: "Überdeckung des Bleilappens" }
    }
  },
  rinne: {
    name: "Anschluss mit Rinne",
    masse: {
      a: { std: 40, min: 40, text: "lichte Rinnenbreite" },
      b: { std: 80, min: 80, text: "Überdeckung unter dem Deckmaterial" },
      c: { std: 10, min: null, text: "Deckmaterial bis Aufkantung, ca. 10 mm" },
      d: { std: 30, min: null, text: "Ziegellattendicke = Rinnentiefe" }
    }
  },
  steg: {
    name: "Anschluss mit Steg",
    hinweisA: "bei grösserer Wassermenge grösser wählen",
    zeigtDeckhoeheAls: "c",
    masse: {
      a: { std: 50, min: 50, text: "Blech bis Steg" },
      b: { std: 70, min: 70, text: "Überdeckung unter dem Deckmaterial" }
    }
  },
  rinne_steg: {
    name: "Anschluss mit Rinne und Steg",
    masse: {
      a: { std: 50, min: 50, text: "lichte Rinnenbreite" },
      b: { std: 70, min: 70, text: "Überdeckung unter dem Deckmaterial" },
      d: { std: 30, min: null, text: "Ziegellattendicke = Rinnentiefe" }
    }
  },
  steck: {
    name: "Steckblech",
    masse: {
      a: { std: 80, min: 80, text: "Steckmass" }
    }
  },
  welle: {
    name: "Anschluss für gewellte Deckung",
    masse: {
      a: { std: 50, min: 50, text: "Blech bis Aufkantung" },
      b: { std: 30, min: 30, text: "Höhe der Aufkantung" }
    }
  }
});

// Welche Anschlussart passt zu welcher Deckung.
function anbArtenFuer(deckung) {
  const dk = ANB_DECKUNGEN[deckung] || ANB_DECKUNGEN.pfanne;
  if (dk.nur) return dk.nur.slice();
  return ["bleilappen", "rinne", "steg", "rinne_steg", "steck"];
}

// Mindestmass eines Masses, Sonderfälle der Deckung eingerechnet.
// Biberschwanzziegel: Überdeckung b beim Steg 60 statt 70 mm.
function anbMindestmass(art, schluessel, deckung) {
  const eintrag = ANB_ARTEN[art] && ANB_ARTEN[art].masse[schluessel];
  if (!eintrag) return null;
  const dk = ANB_DECKUNGEN[deckung];
  if (schluessel === "b" && art === "steg" && dk && dk.bMin) return dk.bMin;
  return eintrag.min;
}

// Standardwerte für eine Anschlussart. Bereits eingegebene Werte des
// Anwenders haben Vorrang – deshalb "vorhanden" als zweites Argument.
function anbStandardwerte(art, deckung, vorhanden) {
  const e = { art: art, deckung: deckung };
  const masse = (ANB_ARTEN[art] || ANB_ARTEN.rinne).masse;
  Object.keys(masse).forEach(k => {
    const min = anbMindestmass(art, k, deckung);
    e[k] = (vorhanden && vorhanden[k] !== undefined && vorhanden[k] !== "")
      ? Number(vorhanden[k])
      : (min !== null ? min : masse[k].std);
  });
  return e;
}

// ---- 2. Profil ---------------------------------------------------
// Liefert die rote Blechlinie als Punktfolge in Millimetern.
//   y = 0   Oberkante Schalung. Dort liegt das Blech, bei Rinne der
//           Rinnenboden. Die Fläche unter dem Deckmaterial liegt bei
//           Rinnenausführungen um die Ziegellattendicke d höher.
// Rückgabe:
//   teile[]   { name, pts:[[x,y],…], saumStart, saumEnde }
//   basis     Höhenlage des Blechs unter dem Deckmaterial (0 oder d)
//   deckAb    ab welchem x das Deckmaterial liegt
//   lattungAb ab welchem x die Ziegellattung liegt (nur wenn basis > 0)
function anbProfil(e) {
  const z = v => Number(v) || 0;
  const a = z(e.a), b = z(e.b), c = z(e.c), d = z(e.d);
  // Höhe Deckmaterial: fester Wert aus dem Deckmaterial-Katalog, kein
  // eigenes Eingabefeld mehr.
  const hd = Math.max(5, (ANB_DECKUNGEN[e.deckung] || {}).hoehe || 0);
  const art = e.art;
  const ort = e.ausfuehrung === "ort" && art !== "steck";
  const basis = (art === "rinne" || art === "rinne_steg") ? d : 0;
  const steg = 4;                                   // doppelt gekanteter Steg
  const teile = [];

  // linker Abschluss – endet immer auf Oberkante Schalung [0,0]
  const anfang = [];
  if (art !== "steck") {
    if (ort) {
      const hO = Math.max(20, z(e.ortAufkantung));
      const bO = Math.max(20, z(e.ortOben));
      const vO = Math.max(20, z(e.ortStirn));
      const nO = Math.max(0, z(e.ortNase));
      const stirnX = -bO - 10;                      // Stirnseite leicht nach aussen
      anfang.push([stirnX + nO * 0.75, hO - vO + nO * 0.75]);   // Wassernase
      anfang.push([stirnX, hO - vO]);
      anfang.push([-bO, hO]);
      anfang.push([0, hO]);
      anfang.push([0, 0]);
    } else {
      anfang.push([0, Math.max(20, z(e.wandAufkantung))]);
      anfang.push([0, 0]);
    }
  }

  let pts = anfang.slice();
  let deckAb = 0, lattungAb = 0;

  if (art === "bleilappen") {
    // Das Grundblech liegt auf der Schalung. Der Bleilappen ist ein
    // eigenes Stück und wird über das Deckmaterial gelegt.
    pts.push([a + b, 0]);
    teile.push({ name: "Grundblech", pts: pts, saumEnde: true });
    // Der Bleilappen wird gezeichnet und bemasst, zählt aber nicht zum
    // Zuschnitt: er ist aus Blei und wird nicht mit dem Blech gekantet.
    teile.push({ name: "Bleilappen", pts: [[a, 0], [a, hd], [a + b, hd], [a + b + 22, hd - 16]], ohneZuschnitt: true });
    deckAb = a + 8; lattungAb = a;
  } else if (art === "rinne") {
    pts.push([a + c, 0]);
    pts.push([a + c, basis]);
    pts.push([a + b, basis]);
    teile.push({ name: "Seitenblech", pts: pts, saumEnde: true });
    deckAb = a; lattungAb = a + c;
  } else if (art === "steg") {
    pts.push([a, 0]);
    pts.push([a, hd]);
    pts.push([a + steg, hd]);
    pts.push([a + steg, 0]);
    pts.push([a + b, 0]);
    teile.push({ name: "Seitenblech", pts: pts, saumEnde: true });
    deckAb = a + steg; lattungAb = a + steg;
  } else if (art === "rinne_steg") {
    pts.push([a, 0]);
    pts.push([a, basis + hd]);
    pts.push([a + steg, basis + hd]);
    pts.push([a + steg, basis]);
    pts.push([a + b, basis]);
    teile.push({ name: "Seitenblech", pts: pts, saumEnde: true });
    deckAb = a + steg; lattungAb = a + steg;
  } else if (art === "steck") {
    // U-förmig: oberer Schenkel, Rücken, unterer Schenkel
    pts = [[a, hd], [0, hd], [0, 0], [a, 0]];
    teile.push({ name: "Steckblech", pts: pts, saumStart: true, saumEnde: true });
    deckAb = 0; lattungAb = 0;
  } else if (art === "welle") {
    pts.push([a, 0]);
    pts.push([a, b]);
    teile.push({ name: "Seitenblech", pts: pts });   // Aufkantung ohne Saum
    deckAb = a - 28; lattungAb = a;
  }

  return { teile: teile, basis: basis, deckAb: deckAb, lattungAb: lattungAb,
           deckHoehe: hd, ort: ort };
}

// Abwicklung eines Teils: Summe aller Schenkel plus Säume.
function anbAbwicklungTeil(teil, saum) {
  let l = 0;
  for (let i = 1; i < teil.pts.length; i++) {
    l += Math.hypot(teil.pts[i][0] - teil.pts[i - 1][0], teil.pts[i][1] - teil.pts[i - 1][1]);
  }
  if (teil.saumStart) l += saum;
  if (teil.saumEnde) l += saum;
  return l;
}

// ---- 3. Zeichnung ------------------------------------------------

const ANB_FARBE = Object.freeze({
  blech: "#d4372c",      // rote Blechlinie wie in der Vorlage
  deck: "#7f7f7f",
  deckLinie: "#161616",
  latte: "#efe7d8",
  bau: "#5a6670",
  mass: "#2b3640"
});

// Überschrift einer Anschlussart, z. B. "Ortblech mit Rinne".
function anbTitel(e) {
  if (e.art === "steck") return "Steckblech";
  const rumpf = (ANB_ARTEN[e.art] || {}).name || "";
  return (e.ausfuehrung === "ort" ? "Ortblech" : "Seitenblech") + rumpf.replace(/^Anschluss/, "");
}

// Zeichnet den Schnitt. Rückgabe ist ein vollständiges <svg>.
function anbZeichnung(e) {
  const p = anbProfil(e);
  const saum = Math.max(0, Number(e.saum) || 0);
  const dk = ANB_DECKUNGEN[e.deckung] || ANB_DECKUNGEN.pfanne;
  const a = Number(e.a) || 0, b = Number(e.b) || 0, c = Number(e.c) || 0;
  const hd = p.deckHoehe, basis = p.basis;

  // Ausdehnung bestimmen. Das ganze Blech ist im Bild – auch die
  // Aufkantung, denn sie wird jetzt mit bemasst.
  let xMin = 0, xMax = 0, yMin = 0, yTeil = 0;
  p.teile.forEach(t => t.pts.forEach(q => {
    xMin = Math.min(xMin, q[0]); xMax = Math.max(xMax, q[0]);
    yMin = Math.min(yMin, q[1]); yTeil = Math.max(yTeil, q[1]);
  }));
  const deckBis = xMax + 200;                       // Deckmaterial läuft weiter
  const deckOben = e.art === "steck" ? 2 * hd + 4 : basis + hd;

  // Senkrechte Masse am linken Rand einsammeln. Jedes bekommt eine
  // eigene Spalte, damit sich zwei Massketten nie überlagern.
  const hW = Math.max(20, Number(e.wandAufkantung) || 0);
  const hO = Math.max(20, Number(e.ortAufkantung) || 0);
  const bO = Math.max(20, Number(e.ortOben) || 0);
  const vO = Math.max(20, Number(e.ortStirn) || 0);
  const nO = Math.max(0, Number(e.ortNase) || 0);
  const zahl = v => String(Math.round(Number(v) || 0));
  const senkListe = [];
  if (e.art === "rinne" || e.art === "rinne_steg") senkListe.push([0, basis, "d = " + zahl(basis)]);
  if (e.art === "steg") senkListe.push([0, hd, "c = " + zahl(hd)]);
  if (e.art === "welle") senkListe.push([0, b, "b = " + zahl(b)]);
  if (e.art !== "steck") {
    if (p.ort) {
      senkListe.push([0, hO, "Aufkantung " + zahl(hO)]);
      senkListe.push([hO - vO, hO, "Stirn " + zahl(vO)]);
    } else {
      senkListe.push([0, hW, "Aufkantung " + zahl(hW)]);
    }
  }

  const schalung = 26;
  xMin -= 18 + senkListe.length * 30;
  const yMass = Math.max(deckOben, yTeil) + 42;     // Höhe der oberen Masslinie
  yMin = Math.min(yMin, -schalung) - 42;
  const yMax = yMass + (p.ort ? 58 : 30);

  const breitePx = 680, rand = 12;
  let s = (breitePx - 2 * rand) / (deckBis - xMin);
  if (s > 1.6) s = 1.6;                             // kleine Schnitte nicht aufblasen
  const hoehePx = Math.round((yMax - yMin) * s + 2 * rand);
  const ox = rand - xMin * s;
  const oy = rand + yMax * s;
  const X = x => Math.round((ox + x * s) * 10) / 10;
  const Y = y => Math.round((oy - y * s) * 10) / 10;

  let g = "";

  // --- Schalung (beim Ortblech erst ab Dachrand) ------------------
  const schalAb = p.ort ? 0 : xMin + 8;
  g += `<path d="M${X(schalAb)} ${Y(0)} L${X(deckBis)} ${Y(0)} L${X(deckBis)} ${Y(-schalung)} L${X(schalAb)} ${Y(-schalung)} Z"
        fill="#fff" stroke="${ANB_FARBE.bau}" stroke-width="1"/>`;

  // --- Ziegellattung, wo das Blech höher liegt --------------------
  if (basis > 0) {
    g += `<path d="M${X(p.lattungAb)} ${Y(0)} L${X(deckBis)} ${Y(0)} L${X(deckBis)} ${Y(basis)} L${X(p.lattungAb)} ${Y(basis)} Z"
          fill="${ANB_FARBE.latte}" stroke="${ANB_FARBE.bau}" stroke-width="1"/>`;
  }

  // --- Deckmaterial ---------------------------------------------
  if (e.art === "steck") {
    g += anbDeckPfad(p.deckAb, deckBis, hd, "pfanne", X, Y, 0);
    g += anbDeckPfad(p.deckAb, deckBis, hd, "pfanne", X, Y, hd + 4);
  } else {
    g += anbDeckPfad(p.deckAb, deckBis, hd, dk.art, X, Y, basis);
  }

  // --- Blech ----------------------------------------------------
  const saumStellen = [];
  p.teile.forEach(t => {
    const dd = t.pts.map((q, i) => (i ? "L" : "M") + X(q[0]) + " " + Y(q[1])).join(" ");
    g += `<path d="${dd}" fill="none" stroke="${ANB_FARBE.blech}" stroke-width="3.4"
          stroke-linejoin="round" stroke-linecap="round"/>`;
    if (t.saumEnde && saum > 0) {
      g += anbSaum(t.pts[t.pts.length - 2], t.pts[t.pts.length - 1], saum, X, Y);
      saumStellen.push(t.pts[t.pts.length - 1]);
    }
    if (t.saumStart && saum > 0) {
      g += anbSaum(t.pts[1], t.pts[0], saum, X, Y);
      saumStellen.push(t.pts[0]);
    }
  });

  // --- Bemassung ------------------------------------------------
  // Buchstabe und Wert stehen zusammen, damit Zeichnung und Masstabelle
  // im PDF nicht auseinanderlaufen.
  const waag = (x1, x2, txt) => anbMassWaag(x1, x2, yMass, txt, X, Y);
  let spalte = 0;
  const senk = eintrag => anbMassSenk(eintrag[0], eintrag[1], xMin + 16 + (spalte++) * 30, eintrag[2], X, Y);

  if (e.art === "bleilappen") {
    g += waag(0, a, "a = " + zahl(a)) + waag(a, a + b, "b = " + zahl(b));
  } else if (e.art === "rinne") {
    g += waag(0, a, "a = " + zahl(a)) + waag(a, a + b, "b = " + zahl(b));
    g += anbMassWaag(a, a + c, -schalung - 16, "c = " + zahl(c), X, Y, true);
  } else if (e.art === "steg" || e.art === "rinne_steg") {
    g += waag(0, a, "a = " + zahl(a)) + waag(a, a + b, "b = " + zahl(b));
  } else if (e.art === "steck") {
    g += waag(0, a, "a = " + zahl(a));
  } else if (e.art === "welle") {
    g += waag(0, a, "a = " + zahl(a));
  }
  if (p.ort) g += anbMassWaag(-bO, 0, yMass + 26, "Übergriff " + zahl(bO), X, Y);
  senkListe.forEach(eintrag => { g += senk(eintrag); });

  // Wassernase und Umschlag als kurze Fahne – dafür lohnt keine Masskette.
  if (p.ort && nO > 0) {
    g += anbFahne(-bO - 10 + nO * 0.75, hO - vO + nO * 0.75, 34, 26, "Nase " + zahl(nO), X, Y);
  }
  if (saum > 0 && saumStellen.length) {
    const q = saumStellen[0];
    g += anbFahne(q[0], q[1], 30, -30, "Umschlag " + zahl(saum), X, Y);
  }
  if (e.art !== "steck") {
    g += anbFahne(deckBis - 30, basis + hd, -30, -28, "Deckmaterial " + zahl(hd), X, Y);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breitePx} ${hoehePx}"
    width="100%" style="display:block;height:auto" font-family="Arial,Helvetica,sans-serif">
    <rect width="${breitePx}" height="${hoehePx}" fill="#fff"/>
    ${g}
    <text x="${breitePx - 8}" y="${hoehePx - 7}" text-anchor="end" font-size="11"
      fill="#8b969e">${anbEsc(anbTitel(e))} · Schnitt</text>
  </svg>`;
}

// Deckmaterial als graues Profil. "fuss" ist die Höhenlage der Unterkante.
function anbDeckPfad(x0, x1, h, art, X, Y, fuss) {
  fuss = fuss || 0;
  let g = "";
  if (art === "welle") {
    // gewelltes Blech: dicke Linie in Wellenform
    const P = 200;
    let d = "";
    for (let x = x0; x <= x1; x += 4) {
      const y = fuss + h * 0.45 + h * 0.40 * Math.cos(Math.PI * 2 * (x - x0) / P + Math.PI);
      d += (x === x0 ? "M" : "L") + X(x) + " " + Y(y);
    }
    return `<path d="${d}" fill="none" stroke="${ANB_FARBE.deck}" stroke-width="${Math.max(7, h * 0.2)}"
      stroke-linecap="round"/>`;
  }
  if (art === "flach") {
    // kleinformatige Deckung: zwei Lagen flacher Platten
    const lage = Math.max(6, h * 0.5), fuge = 240;
    for (let n = 0; n < 2; n++) {
      const y0 = fuss + n * lage * 0.85;
      g += `<path d="M${X(x0 + n * 45)} ${Y(y0)} L${X(x1)} ${Y(y0)} L${X(x1)} ${Y(y0 + lage)} L${X(x0 + n * 45)} ${Y(y0 + lage)} Z"
            fill="${ANB_FARBE.deck}" stroke="${ANB_FARBE.deckLinie}" stroke-width="1.1"/>`;
      for (let x = x0 + fuge / 2 + n * 60; x < x1; x += fuge) {
        g += `<line x1="${X(x)}" y1="${Y(y0)}" x2="${X(x)}" y2="${Y(y0 + lage)}"
              stroke="${ANB_FARBE.deckLinie}" stroke-width="1.1"/>`;
      }
    }
    return g;
  }
  // Pfannenziegel: Wellenrücken oben, gleich dicker Körper darunter,
  // Ziegelnasen auf der Lattung.
  const P = 135;
  const oben = x => fuss + h * (0.76 + 0.24 * Math.cos(Math.PI * 2 * (x - x0) / P));
  let d = "M" + X(x0) + " " + Y(fuss);
  for (let x = x0; x <= x1; x += 4) d += "L" + X(x) + " " + Y(oben(x));
  d += "L" + X(x1) + " " + Y(fuss) + "Z";
  g += `<path d="${d}" fill="${ANB_FARBE.deck}" stroke="${ANB_FARBE.deckLinie}" stroke-width="1.2"
        stroke-linejoin="round"/>`;
  if (fuss > 0) {                                     // Ziegelnasen auf der Lattung
    const nase = Math.min(fuss, 14);
    for (let x = x0 + P * 0.35; x < x1 - 30; x += P) {
      g += `<path d="M${X(x)} ${Y(fuss)} L${X(x)} ${Y(fuss - nase)} L${X(x + 24)} ${Y(fuss - nase)} L${X(x + 24)} ${Y(fuss)}"
            fill="${ANB_FARBE.deck}" stroke="${ANB_FARBE.deckLinie}" stroke-width="1.2"/>`;
    }
  }
  return g;
}

// Saum (180°-Umschlag) am freien Blechende.
function anbSaum(pVor, pEnde, laenge, X, Y) {
  const dx = pEnde[0] - pVor[0], dy = pEnde[1] - pVor[1];
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l, uy = dy / l;
  const nx = -uy, ny = ux;                          // links der Laufrichtung
  const t = 5.5;
  const p1 = [pEnde[0] + ux * 4 + nx * 2, pEnde[1] + uy * 4 + ny * 2];
  const p2 = [pEnde[0] + nx * t, pEnde[1] + ny * t];
  const p3 = [p2[0] - ux * laenge, p2[1] - uy * laenge];
  return `<path d="M${X(pEnde[0])} ${Y(pEnde[1])} Q${X(p1[0])} ${Y(p1[1])} ${X(p2[0])} ${Y(p2[1])}
    L${X(p3[0])} ${Y(p3[1])}" fill="none" stroke="${ANB_FARBE.blech}" stroke-width="3.4"
    stroke-linecap="round"/>`;
}

// Waagerechtes Mass mit Hilfslinien und Pfeilen, wie in der Vorlage.
function anbMassWaag(x1, x2, y, text, X, Y, unten) {
  if (Math.abs(x2 - x1) < 0.5) return "";
  const yl = Y(y), r = unten ? 1 : -1, hilf = 13;
  return `<g stroke="${ANB_FARBE.mass}" stroke-width="1" fill="none">
    <line x1="${X(x1)}" y1="${yl + r * hilf}" x2="${X(x1)}" y2="${yl - r * hilf * 0.5}"/>
    <line x1="${X(x2)}" y1="${yl + r * hilf}" x2="${X(x2)}" y2="${yl - r * hilf * 0.5}"/>
    <line x1="${X(x1)}" y1="${yl}" x2="${X(x2)}" y2="${yl}"/></g>
    <path d="M${X(x1)} ${yl} l7 -3 l0 6 Z" fill="${ANB_FARBE.mass}"/>
    <path d="M${X(x2)} ${yl} l-7 -3 l0 6 Z" fill="${ANB_FARBE.mass}"/>
    <text x="${(X(x1) + X(x2)) / 2}" y="${yl + (unten ? 17 : -7)}" text-anchor="middle"
      font-size="15" font-weight="700" fill="${ANB_FARBE.mass}"
      paint-order="stroke" stroke="#fff" stroke-width="3">${text}</text>`;
}

// Senkrechtes Mass am linken Rand. Die Zahl steht hochkant auf der
// Masslinie – daneben hätte eine Beschriftung wie "Aufkantung 150"
// keinen Platz und liefe aus dem Bild.
function anbMassSenk(y1, y2, x, text, X, Y) {
  if (Math.abs(y2 - y1) < 0.5) return "";
  const px = X(x), pm = (Y(y1) + Y(y2)) / 2;
  return `<g stroke="${ANB_FARBE.mass}" stroke-width="1" fill="none">
    <line x1="${px - 7}" y1="${Y(y1)}" x2="${px + 26}" y2="${Y(y1)}"/>
    <line x1="${px - 7}" y1="${Y(y2)}" x2="${px + 26}" y2="${Y(y2)}"/>
    <line x1="${px}" y1="${Y(y1)}" x2="${px}" y2="${Y(y2)}"/></g>
    <path d="M${px} ${Y(y1)} l-3 -7 l6 0 Z" fill="${ANB_FARBE.mass}"/>
    <path d="M${px} ${Y(y2)} l-3 7 l6 0 Z" fill="${ANB_FARBE.mass}"/>
    <text x="${px}" y="${pm}" text-anchor="middle" dominant-baseline="middle"
      transform="rotate(-90 ${px} ${pm})"
      font-size="15" font-weight="700" fill="${ANB_FARBE.mass}"
      paint-order="stroke" stroke="#fff" stroke-width="3.5"
      stroke-linejoin="round">${text}</text>`;
}

// Kurze Fahne mit Beschriftung, für Masse, die keine ganze Masskette
// wert sind: Wassernase, Umschlag.
// dx und dy sind Bildpunkte, dy positiv zeigt nach unten.
function anbFahne(x, y, dx, dy, text, X, Y) {
  const x0 = X(x), y0 = Y(y), x1 = x0 + dx, y1 = y0 + dy;
  const anker = dx < 0 ? "end" : (dx > 0 ? "start" : "middle");
  const versatz = dx < 0 ? -4 : (dx > 0 ? 4 : 0);
  return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"
      stroke="${ANB_FARBE.mass}" stroke-width="1"/>
    <circle cx="${x0}" cy="${y0}" r="2.4" fill="${ANB_FARBE.mass}"/>
    <text x="${x1 + versatz}" y="${y1 + (dy > 0 ? 12 : -5)}" text-anchor="${anker}"
      font-size="13" font-weight="700" fill="${ANB_FARBE.mass}"
      paint-order="stroke" stroke="#fff" stroke-width="3.5"
      stroke-linejoin="round">${text}</text>`;
}

function anbEsc(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
}

// ---- 4. Rechnen --------------------------------------------------
// e: {ausfuehrung, deckung, art, a,b,c,d, deckHoehe, saum,
//     wandAufkantung, ortAufkantung, ortOben, ortStirn, ortNase,
//     laenge, stossLaenge, ueberlappung}
function berechneAnschlussblech(e) {
  if (!e || !ANB_ARTEN[e.art]) return null;
  const p = anbProfil(e);
  const saum = Math.max(0, Number(e.saum) || 0);

  // Nur was aus dem Blech gekantet wird, kommt in den Zuschnitt. Der
  // Bleilappen ist eigenes Material und wird deshalb übersprungen.
  const teile = p.teile.filter(t => !t.ohneZuschnitt).map(t => ({
    name: t.name,
    abwicklung: Math.round(anbAbwicklungTeil(t, saum)),
    schenkel: t.pts.length - 1
  }));
  const ohneZuschnitt = p.teile.filter(t => t.ohneZuschnitt).map(t => t.name);

  // Mindestmasse prüfen
  const warnungen = [];
  const masse = ANB_ARTEN[e.art].masse;
  Object.keys(masse).forEach(k => {
    const min = anbMindestmass(e.art, k, e.deckung);
    const wert = Number(e[k]) || 0;
    if (min !== null && wert < min) {
      warnungen.push(`${k} = ${Math.round(wert)} mm liegt unter dem Mindestmass von ${min} mm.`);
    }
  });
  if (e.art === "rinne" && (Number(e.b) || 0) <= (Number(e.c) || 0)) {
    warnungen.push("b muss grösser sein als c, sonst endet das Blech vor der Aufkantung.");
  }

  // Länge, Stösse, Stückliste – dieselbe Regel wie beim Einlaufblech:
  // volle Stücke zur eingestellten Stücklänge, am Schluss das Reststück.
  // Die Überlappung kommt beim vollen Stück auf den Zuschnitt; das
  // Reststück braucht keine, weil das Stück davor darüber greift.
  // Ein Reststück unter der Schwelle wird dem vorherigen zugeschlagen.
  const laenge = Math.max(0, Number(e.laenge) || 0);
  const stoss = Math.max(200, Number(e.stossLaenge) || 2000);
  const lap = Math.max(0, Number(e.ueberlappung) || 0);
  const schwelle = Math.max(0, Number(e.restSchwelle) || 0);
  const gehrungZugabe = Math.max(0, Number(e.gehrungszugabe) || 0);
  const mitGehrung = !!e.firstgehrung;
  const stuecke = [];
  if (laenge > 0) {
    let anzahl = Math.max(1, Math.ceil(laenge / stoss));
    let rest = laenge - (anzahl - 1) * stoss;
    if (anzahl > 1 && rest > 0 && rest < schwelle) { anzahl -= 1; rest = stoss + rest; }
    for (let i = 0; i < anzahl; i++) {
      const letztes = i === anzahl - 1;
      const grund = Math.round(letztes ? rest : stoss + lap);
      const st = { nr: i + 1, laenge: grund, gehrung: false };
      if (letztes && mitGehrung && gehrungZugabe > 0) {
        st.gehrung = true;
        st.laengeOhneGehrung = grund;
        st.laenge = grund + gehrungZugabe;
      }
      stuecke.push(st);
    }
  }
  const abwGesamt = teile.reduce((s, t) => s + t.abwicklung, 0);
  const flaeche = laenge > 0 ? (abwGesamt / 1000) * (laenge / 1000) : 0;

  // Anzahl Bleilappen: je Dachlatte entlang der Gesamtlänge einer, auf
  // ganze Latten aufgerundet.
  let anzahlBleilappen = null;
  if (e.art === "bleilappen") {
    const lattenabstand = Math.max(1, Number(e.lattenabstand) || 0);
    anzahlBleilappen = laenge > 0 ? Math.floor(laenge / lattenabstand) : 0;
  }

  return {
    teile: teile,
    ohneZuschnitt: ohneZuschnitt,
    abwicklung: abwGesamt,
    warnungen: warnungen,
    laenge: Math.round(laenge),
    stuecke: stuecke,
    flaeche: Math.round(flaeche * 100) / 100,
    anzahlBleilappen: anzahlBleilappen,
    profil: p
  };
}

// ---- 5. Eigene Einstellungen -------------------------------------
// Das Modul bringt seine eigenen Werte mit. Es benutzt bewusst nichts
// von den Einlaufblechen und von der Lukarne – wer hier etwas ändert,
// ändert nur das Anschlussblech.
//
// Die Werte hängen am Gerät (localStorage), gleich wie bei den
// Einlaufblechen. Jeder darf also seine eigenen haben. Wer das Gerät
// wechselt, fängt bei den Standardwerten unten an.

const ANSCHLUSSBLECH_STANDARD = Object.freeze({
  deckung: "pfanne",          // Vorschlag für eine neue Massaufnahme
  saum: 15,                   // Umschlag am freien Blechende
  stoss_laenge: 2000,         // volles Stück
  ueberlappung: 70,           // Überlappung am Stoss
  rest_schwelle: 300,         // kürzeres Reststück wird angehängt
  gehrungszugabe: 100,        // Zuschlag für die Firstgehrung am Endstück
  wand_aufkantung: 150,       // Seitenblech: Höhe an der Wand
  ort_aufkantung: 60,         // Ortblech: Höhe über Dach
  ort_oben: 80,               // Ortblech: Übergriff über das Ortbrett
  ort_stirn: 120,             // Ortblech: Höhe der Stirnseite
  ort_nase: 20,               // Ortblech: Wassernase
  lattenabstand: 330          // Bleilappen: Abstand der Dachlatten, für Anzahl Bleilappen
});
const ANB_EINSTELLUNGEN = "sd_anschlussblechSettings";

let anschlussblechSettings = anbEinstellungenLaden();

function anbEinstellungenLaden() {
  let w = null;
  try { w = JSON.parse(localStorage.getItem(ANB_EINSTELLUNGEN) || "null"); } catch (e) { w = null; }
  w = Object.assign({}, ANSCHLUSSBLECH_STANDARD, w || {});
  if (!ANB_DECKUNGEN[w.deckung]) w.deckung = ANSCHLUSSBLECH_STANDARD.deckung;
  return w;
}
function anbEinstellungenSichern(w) {
  anschlussblechSettings = w;
  try { localStorage.setItem(ANB_EINSTELLUNGEN, JSON.stringify(w)); } catch (e) { }
}

// Vorschlagswerte für eine neue Massaufnahme, ganz aus den eigenen
// Einstellungen und den Mindestmassen der Anschlussart.
function anbVorgabe() {
  const s = anschlussblechSettings || ANSCHLUSSBLECH_STANDARD;
  const deckung = ANB_DECKUNGEN[s.deckung] ? s.deckung : "pfanne";
  const art = anbArtenFuer(deckung)[0];
  const w = {
    ausfuehrung: "seite", deckung: deckung, art: art,
    deckHoehe: ANB_DECKUNGEN[deckung].hoehe,
    a: 50, b: 50, c: 10, d: 30,
    saum: s.saum,
    wandAufkantung: s.wand_aufkantung,
    ortAufkantung: s.ort_aufkantung, ortOben: s.ort_oben,
    ortStirn: s.ort_stirn, ortNase: s.ort_nase,
    laenge: 0, stossLaenge: s.stoss_laenge, ueberlappung: s.ueberlappung,
    restSchwelle: s.rest_schwelle, gehrungszugabe: s.gehrungszugabe,
    firstgehrung: false,
    lattenabstand: s.lattenabstand
  };
  return Object.assign(w, anbStandardwerte(art, deckung, {}));
}

// ---- 6. Oberfläche -----------------------------------------------
// Bedient den Abschnitt "measTypeAnschlussblech" im
// Massaufnahme-Formular. Dieselben Feld-Ids stehen in
// test-anschlussblech.html, damit sich das Modul auch ohne Anmeldung
// ausprobieren lässt.
//
// Die Felder sind die Quelle der Wahrheit – gleich wie bei der Lukarne.
// Die Masse a…d und die Abschlussmasse werden je nach Anschlussart
// erzeugt und tragen ein data-anb-Merkmal.

// Alle Eingaben einsammeln. Fehlende Felder bekommen die Vorgabe.
function anbEingabenAusFeldern() {
  const vorgabe = anbVorgabe();
  if (!$("anb_deckung")) return vorgabe;
  const zahl = id => Number(($(id) || {}).value) || 0;
  const deckung = $("anb_deckung").value || vorgabe.deckung;
  const e = {
    deckung: deckung,
    art: $("anb_art").value || vorgabe.art,
    ausfuehrung: $("anb_ausfuehrung").value || "seite",
    // Höhe Deckmaterial: fester Wert aus dem Deckmaterial-Katalog.
    deckHoehe: (ANB_DECKUNGEN[deckung] || {}).hoehe || 0,
    saum: zahl("anb_saum"),
    laenge: zahl("anb_laenge"),
    stossLaenge: zahl("anb_stossLaenge"),
    ueberlappung: zahl("anb_ueberlappung"),
    lattenabstand: zahl("anb_lattenabstand"),
    firstgehrung: $("anb_firstgehrung") ? !!$("anb_firstgehrung").checked : false
  };
  document.querySelectorAll("#anb_masse [data-anb],#anb_abschluss [data-anb]")
    .forEach(el => { e[el.dataset.anb] = Number(el.value) || 0; });
  return Object.assign(vorgabe, e);
}

// Die festen Felder aus einem Wertesatz füllen.
function anbFesteFelderFuellen(w) {
  $("anb_deckung").innerHTML = Object.keys(ANB_DECKUNGEN)
    .map(k => `<option value="${k}"${k === w.deckung ? " selected" : ""}>${anbEsc(ANB_DECKUNGEN[k].name)}</option>`).join("");
  const arten = anbArtenFuer(w.deckung);
  if (arten.indexOf(w.art) < 0) {
    w.art = arten[0];
    Object.assign(w, anbStandardwerte(w.art, w.deckung, {}));
  }
  $("anb_art").innerHTML = arten
    .map(k => `<option value="${k}"${k === w.art ? " selected" : ""}>${anbEsc(ANB_ARTEN[k].name)}</option>`).join("");
  $("anb_ausfuehrung").value = w.ausfuehrung === "ort" ? "ort" : "seite";
  $("anb_ausfuehrung").disabled = w.art === "steck";
  $("anb_saum").value = Math.round(w.saum);
  $("anb_laenge").value = w.laenge ? Math.round(w.laenge) : "";
  $("anb_stossLaenge").value = Math.round(w.stossLaenge);
  $("anb_ueberlappung").value = Math.round(w.ueberlappung);
  $("anb_lattenabstand").value = Math.round(w.lattenabstand || 0);
  $("anb_lattenabstandField").hidden = w.art !== "bleilappen";
  if ($("anb_firstgehrung")) $("anb_firstgehrung").checked = !!w.firstgehrung;
}

// Die Massfelder der gewählten Anschlussart und den linken Abschluss
// neu aufbauen. Alles, was hier entsteht, trägt data-anb.
function anbMassfelderZeichnen(w) {
  const art = ANB_ARTEN[w.art] || ANB_ARTEN.bleilappen;
  let h = "";
  Object.keys(art.masse).forEach(k => {
    const min = anbMindestmass(w.art, k, w.deckung);
    const zusatz = (k === "a" && art.hinweisA) ? ", " + art.hinweisA : "";
    h += `<div><label>${k} · ${anbEsc(art.masse[k].text || "")}${zusatz} (mm)</label>
<input type="number" step="1" inputmode="numeric" data-anb="${k}" value="${Math.round(Number(w[k]) || 0)}">
<div class="small">${min !== null ? "mindestens " + min + " mm" : "Mass am Bau nehmen"}</div></div>`;
  });
  $("anb_masse").innerHTML = h;

  const ort = w.ausfuehrung === "ort" && w.art !== "steck";
  const feld = (id, label, wert) => `<div><label>${label} (mm)</label>
<input type="number" step="1" inputmode="numeric" data-anb="${id}" value="${Math.round(Number(wert) || 0)}"></div>`;
  let f;
  if (w.art === "steck") {
    f = `<div class="wide small">Das Steckblech wird beidseitig gesäumt eingeschoben – es hat weder Wand- noch Ortabkantung.</div>`;
  } else if (ort) {
    f = feld("ortAufkantung", "Aufkantung über Dach", w.ortAufkantung)
      + feld("ortOben", "Übergriff Ortbrett", w.ortOben)
      + feld("ortStirn", "Stirnhöhe", w.ortStirn)
      + feld("ortNase", "Wassernase", w.ortNase);
  } else {
    f = feld("wandAufkantung", "Aufkantung an der Wand", w.wandAufkantung)
      + `<div class="small" style="align-self:end">Zählt in der Abwicklung mit, wird in der Zeichnung aber angeschnitten.</div>`;
  }
  $("anb_abschluss").innerHTML = f;

  document.querySelectorAll("#anb_masse [data-anb],#anb_abschluss [data-anb]")
    .forEach(el => { el.oninput = renderAnbResult; });
}

// Zeichnung, Ergebnis und Stückliste auffrischen.
function renderAnbResult() {
  if (!$("anb_zeichnung")) return;
  const e = anbEingabenAusFeldern();
  const erg = berechneAnschlussblech(e);
  $("anb_zeichnung").innerHTML = anbZeichnung(e);

  const warn = $("anb_warnung");
  if (warn) {
    warn.innerHTML = (erg && erg.warnungen.length)
      ? "⚠️ " + erg.warnungen.map(anbEsc).join("<br>")
      : "Die Mindestmasse sind eingehalten.";
    warn.style.color = (erg && erg.warnungen.length) ? "var(--red)" : "var(--muted)";
  }
  if (!erg) return;

  const kasten = (label, wert) =>
    `<div><label>${anbEsc(label)}</label><div style="font-weight:800;padding:9px 0">${anbEsc(wert)}</div></div>`;
  $("anb_ergebnis").innerHTML =
    kasten("Zuschnittbreite", erg.abwicklung + " mm")
    + erg.teile.map(t => kasten("Abwicklung " + t.name, t.abwicklung + " mm")).join("")
    + kasten("Anzahl Stücke", erg.stuecke.length || "–")
    + kasten("Materialfläche", erg.flaeche ? erg.flaeche.toFixed(2) + " m²" : "–")
    + (erg.anzahlBleilappen !== null ? kasten("Anzahl Bleilappen", erg.anzahlBleilappen || "–") : "");

  $("anb_stuecklisteBody").innerHTML = erg.stuecke.length
    ? erg.stuecke.map(s => `<tr><td>${s.nr}${s.gehrung ? " · First" : ""}</td><td>${s.laenge}</td><td>${erg.abwicklung}</td></tr>`).join("")
    : '<tr><td colspan="3" class="small">Keine Gesamtlänge eingegeben – ohne Länge gibt es keine Stückliste.</td></tr>';

  const zus = $("anb_summary");
  if (zus) {
    const letztes = erg.stuecke[erg.stuecke.length - 1];
    const gehrungTxt = (letztes && letztes.gehrung)
      ? ` Endstück mit Firstgehrung: ${letztes.laengeOhneGehrung} mm plus ${letztes.laenge - letztes.laengeOhneGehrung} mm Gehrungszugabe.`
      : "";
    const ohneTxt = erg.ohneZuschnitt.length
      ? ` ${erg.ohneZuschnitt.join(" und ")} nicht im Zuschnitt – eigenes Material.`
      : "";
    const bleilappenTxt = erg.anzahlBleilappen !== null ? ` ${erg.anzahlBleilappen} Bleilappen.` : "";
    zus.textContent = (erg.stuecke.length
      ? `${anbTitel(e)} · ${erg.stuecke.length} Stück, Zuschnitt ${erg.abwicklung} mm breit.${gehrungTxt}`
      : `${anbTitel(e)} · Zuschnittbreite ${erg.abwicklung} mm.`) + ohneTxt + bleilappenTxt;
  }
}

// Formular mit einem Wertesatz füllen. Ohne Werte: die eigenen
// Einstellungen.
function anbFormularFuellen(d) {
  if (!$("anb_deckung")) return;
  const w = Object.assign(anbVorgabe(), d || {});
  anbFesteFelderFuellen(w);
  anbMassfelderZeichnen(w);
  renderAnbResult();
}
// Neue Massaufnahme.
function anbFormularZuruecksetzen() { anbFormularFuellen(null); }

// ---- 7. Einstellungsseite ----------------------------------------
// Füllt die Felder im Abschnitt "Anschlussblech" der Einstellungen.
function applyAnschlussblechSettings() {
  if (!$("anbsStossLaenge")) return;
  const s = anschlussblechSettings;
  const sel = $("anbsDeckung");
  if (sel && document.activeElement !== sel) {
    sel.innerHTML = Object.keys(ANB_DECKUNGEN)
      .map(k => `<option value="${k}"${k === s.deckung ? " selected" : ""}>${anbEsc(ANB_DECKUNGEN[k].name)}</option>`).join("");
  }
  const setzen = (id, wert) => {
    const el = $(id);
    if (el && document.activeElement !== el) el.value = wert;
  };
  setzen("anbsSaum", s.saum);
  setzen("anbsStossLaenge", s.stoss_laenge);
  setzen("anbsUeberlappung", s.ueberlappung);
  setzen("anbsRestSchwelle", s.rest_schwelle);
  setzen("anbsGehrungszugabe", s.gehrungszugabe);
  setzen("anbsWandAufkantung", s.wand_aufkantung);
  setzen("anbsOrtAufkantung", s.ort_aufkantung);
  setzen("anbsOrtOben", s.ort_oben);
  setzen("anbsOrtStirn", s.ort_stirn);
  setzen("anbsOrtNase", s.ort_nase);
  setzen("anbsLattenabstand", s.lattenabstand);
}

// ---- 8. Bedienung ------------------------------------------------
// Formular. Ohne Formular im Bildschirm passiert nichts.
(function anbFormularBinden() {
  if (!$("anb_deckung")) return;
  anbFormularFuellen(null);

  $("anb_deckung").onchange = () => {
    const w = anbEingabenAusFeldern();
    Object.assign(w, anbStandardwerte(w.art, w.deckung, {}));
    anbFesteFelderFuellen(w);
    anbMassfelderZeichnen(w);
    renderAnbResult();
  };
  $("anb_art").onchange = () => {
    const w = anbEingabenAusFeldern();
    Object.assign(w, anbStandardwerte(w.art, w.deckung, {}));
    anbFesteFelderFuellen(w);
    anbMassfelderZeichnen(w);
    renderAnbResult();
  };
  $("anb_ausfuehrung").onchange = () => {
    anbMassfelderZeichnen(anbEingabenAusFeldern());
    renderAnbResult();
  };
  ["anb_saum", "anb_laenge", "anb_stossLaenge", "anb_ueberlappung", "anb_lattenabstand"]
    .forEach(id => { const el = $(id); if (el) el.addEventListener("input", renderAnbResult); });
  if ($("anb_firstgehrung")) $("anb_firstgehrung").addEventListener("change", renderAnbResult);

  // Sprung in die Einstellungen, gleich wie bei der Lukarne.
  const knopf = $("openAnschlussblechSettings");
  if (knopf) knopf.onclick = () => {
    if (typeof renderSettings !== "function") return;
    settingsReturnToMeasurement = true;
    $("measurementEditModal").hidden = true;
    renderSettings();
    if (typeof applyCompanyName === "function") applyCompanyName();
    applyAnschlussblechSettings();
    document.querySelectorAll(".settings-tab").forEach(b => b.classList.toggle("active", b.dataset.settingsTab === "measurements"));
    document.querySelectorAll(".settings-tab-panel").forEach(p => { p.hidden = (p.dataset.settingsPanel !== "measurements"); });
    const sec = document.querySelector('.settings-section[data-section="anschlussblech"]');
    if (sec) sec.classList.add("open");
    $("settingsModal").hidden = false;
  };

  // Nur in der eigenständigen Testfassung vorhanden.
  if ($("anb_drucken")) $("anb_drucken").onclick = () => window.print();
  if ($("anb_zuruecksetzen")) $("anb_zuruecksetzen").onclick = () => anbFormularZuruecksetzen();
})();

// Einstellungsseite. Ohne Einstellungsfelder im Bildschirm passiert nichts.
(function anbEinstellungenBinden() {
  if (!$("saveAnschlussblechSettings")) return;
  applyAnschlussblechSettings();

  $("saveAnschlussblechSettings").onclick = () => {
    const zahl = id => Number($(id).value);
    const w = {
      deckung: $("anbsDeckung").value,
      saum: zahl("anbsSaum") || 0,
      stoss_laenge: zahl("anbsStossLaenge"),
      ueberlappung: zahl("anbsUeberlappung") || 0,
      rest_schwelle: zahl("anbsRestSchwelle") || 0,
      gehrungszugabe: zahl("anbsGehrungszugabe") || 0,
      wand_aufkantung: zahl("anbsWandAufkantung") || 0,
      ort_aufkantung: zahl("anbsOrtAufkantung") || 0,
      ort_oben: zahl("anbsOrtOben") || 0,
      ort_stirn: zahl("anbsOrtStirn") || 0,
      ort_nase: zahl("anbsOrtNase") || 0,
      lattenabstand: zahl("anbsLattenabstand") || 0
    };
    if (!ANB_DECKUNGEN[w.deckung]) { alert("Bitte ein Deckmaterial wählen."); return; }
    if (!(w.stoss_laenge > 0)) { alert("Bitte eine gültige Stücklänge eingeben."); return; }
    if (w.ueberlappung >= w.stoss_laenge) { alert("Die Überlappung muss kleiner sein als die Stücklänge."); return; }
    const negativ = ["saum", "ueberlappung", "rest_schwelle", "gehrungszugabe", "wand_aufkantung", "ort_aufkantung", "ort_oben", "ort_stirn", "ort_nase", "lattenabstand"]
      .some(k => w[k] < 0);
    if (negativ) { alert("Diese Werte dürfen nicht negativ sein."); return; }
    anbEinstellungenSichern(w);
    applyAnschlussblechSettings();
    alert("Gespeichert (gilt nur für dieses Gerät).");
  };

  $("resetAnschlussblechSettings").onclick = () => {
    if (!confirm("Alle Werte des Anschlussblechs auf die Standardwerte zurücksetzen?")) return;
    anbEinstellungenSichern(Object.assign({}, ANSCHLUSSBLECH_STANDARD));
    applyAnschlussblechSettings();
    alert("Auf Standardwerte zurückgesetzt.");
  };
})();
