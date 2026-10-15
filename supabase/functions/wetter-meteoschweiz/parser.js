// Reine Funktionen fuer die Edge Function wetter-meteoschweiz (v3.374) - ohne Deno-Abhaengigkeit, damit sie mit Node
// gegen echte Beispieldateien von MeteoSchweiz getestet werden koennen (pruefstaende/pruefstand-wetter-meteoschweiz-v3-374.js).
//
// Quelle: MeteoSchweiz Open Government Data, Sammlung ch.meteoschweiz.ogd-local-forecasting (frei nutzbar, auch kommerziell,
// Quellenangabe erforderlich). Dateien: pro Lauf (stuendlich) und Messgroesse eine CSV, alle Orte in einer Datei,
// Trennzeichen ";", Zeichensatz Latin1, Kopf "point_id;point_type_id;Date;<Messgroesse>", Date = YYYYMMDDHHMM (UTC-Referenz,
// bei Tageswerten 00:00 des Tages).
export const BASIS = "https://data.geo.admin.ch/ch.meteoschweiz.ogd-local-forecasting";
export const META_PUNKTE = BASIS + "/ogd-local-forecasting_meta_point.csv";
export const TAGES_PARAMETER = Object.freeze({
  code: "jp2000d0",   // MeteoSchweiz-Piktogramm-Nummer, Tageswert (tagsueber)
  tmax: "tre200px",   // Tagesmaximum 2 m, Lokalzeit 00:00-24:00
  tmin: "tre200pn",   // Tagesminimum 2 m, Lokalzeit 00:00-24:00
  regen: "rka150p0",  // Niederschlag Tagessumme, Lokalzeit 00:00-24:00 (mm)
});
const PUNKT_TYP_PLZ = "2";

// Vierstellige Postleitzahl aus einem Adresstext. Bevorzugt eine, auf die ein Ortsname folgt ("3063 Ittigen"),
// damit eine vierstellige Hausnummer nicht gewinnt.
export function plzAusAdresse(text) {
  const t = String(text == null ? "" : text);
  const treffer = [];
  const re = /(?<![\d])([1-9]\d{3})(?![\d])/g;
  let m;
  while ((m = re.exec(t)) !== null) treffer.push({ plz: m[1], rest: t.slice(m.index + 4) });
  if (!treffer.length) return null;
  const mitOrt = treffer.find((x) => /^\s+\p{L}/u.test(x.rest));
  return (mitOrt || treffer[0]).plz;
}

function zeilen(text) {
  return String(text).split(/\r?\n/);
}
// Meta-Datei der Punkte: den Punkt zur Postleitzahl finden (Typ 2). Gibt es mehrere, gilt der mit der kleinsten Nummer.
export function punktFinden(metaText, plz) {
  const z = zeilen(metaText);
  const kopf = (z[0] || "").split(";");
  const iId = kopf.indexOf("point_id"), iTyp = kopf.indexOf("point_type_id"), iPlz = kopf.indexOf("postal_code"), iName = kopf.indexOf("point_name");
  if (iId < 0 || iTyp < 0 || iPlz < 0) return null;
  let best = null;
  for (let i = 1; i < z.length; i++) {
    if (!z[i]) continue;
    const c = z[i].split(";");
    if (c[iTyp] !== PUNKT_TYP_PLZ || c[iPlz] !== String(plz)) continue;
    const id = Number(c[iId]);
    if (!Number.isFinite(id)) continue;
    if (!best || id < best.id) best = { id, name: iName >= 0 ? c[iName] : "" };
  }
  return best;
}
// Werte eines Punktes aus einer Vorhersage-Datei: { "202610130000": 16.3, ... } (leer -> null)
export function werteFuerPunkt(text, parameter, punktId) {
  const z = zeilen(text);
  const kopf = (z[0] || "").split(";");
  if (kopf[0] !== "point_id" || kopf[1] !== "point_type_id" || kopf[2] !== "Date" || kopf[3] !== parameter) return null;
  const vorn = punktId + ";" + PUNKT_TYP_PLZ + ";";
  const out = {};
  for (let i = 1; i < z.length; i++) {
    const s = z[i];
    if (!s.startsWith(vorn)) continue;
    const c = s.split(";");
    if (!/^\d{12}$/.test(c[2])) continue;
    const v = c[3] === undefined || c[3] === "" ? null : Number(c[3]);
    out[c[2]] = (v === null || Number.isFinite(v)) ? v : null;
  }
  return out;
}
const p2 = (n) => String(n).padStart(2, "0");
export function laufKennung(d) {
  return d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + p2(d.getUTCHours()) + "00";
}
// Kandidaten fuer den neuesten Lauf: ab einer Stunde vor "jetzt", stuendlich zurueck
export function laufKandidaten(jetzt, n = 8) {
  const basis = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate(), jetzt.getUTCHours() - 1));
  return Array.from({ length: n }, (_, i) => laufKennung(new Date(basis.getTime() - i * 3600e3)));
}
export function dateiUrl(lauf, parameter) {
  return BASIS + "/" + lauf.slice(0, 8) + "-ch/vnut12.lssw." + lauf + "." + parameter + ".csv";
}
// Tage zusammenfuehren. Der Tag ist die Lokalzeit-Referenz (Date = 00:00 des Tages).
export function tageAus(maps) {
  const tage = new Map();
  const nimm = (feld, m) => {
    if (!m) return;
    for (const k of Object.keys(m)) {
      const datum = k.slice(0, 4) + "-" + k.slice(4, 6) + "-" + k.slice(6, 8);
      if (!tage.has(datum)) tage.set(datum, { datum, code: null, tmax: null, tmin: null, regen: null });
      tage.get(datum)[feld] = m[k];
    }
  };
  nimm("code", maps.code); nimm("tmax", maps.tmax); nimm("tmin", maps.tmin); nimm("regen", maps.regen);
  return [...tage.values()].sort((a, b) => a.datum.localeCompare(b.datum));
}
// Ganzer Ablauf mit eingespeister Abruffunktion (im Test eine nachgebaute, in der Funktion fetch).
// fetchFn(url, {method}) -> {ok,status,text()} ; Fehler als Error mit .code
export async function holeVorhersage({ fetchFn, plz, jetzt }) {
  const fehler = (code, text) => Object.assign(new Error(text), { code });
  const metaR = await fetchFn(META_PUNKTE, { method: "GET" });
  if (!metaR.ok) throw fehler("quelle", "Die Ortsliste von MeteoSchweiz ist nicht erreichbar (HTTP " + metaR.status + ").");
  const punkt = punktFinden(await metaR.text(), plz);
  if (!punkt) throw fehler("kein_ort", "Für die Postleitzahl " + plz + " gibt es bei MeteoSchweiz keinen Vorhersage-Ort.");
  let lauf = null;
  for (const k of laufKandidaten(jetzt)) {
    const r = await fetchFn(dateiUrl(k, TAGES_PARAMETER.code), { method: "HEAD" });
    if (r.ok) { lauf = k; break; }
  }
  if (!lauf) throw fehler("kein_lauf", "MeteoSchweiz hat gerade keine aktuelle Vorhersage bereitgestellt.");
  const maps = {};
  for (const feld of Object.keys(TAGES_PARAMETER)) {
    const r = await fetchFn(dateiUrl(lauf, TAGES_PARAMETER[feld]), { method: "GET" });
    if (!r.ok) throw fehler("quelle", "Eine Vorhersage-Datei von MeteoSchweiz ist nicht erreichbar (HTTP " + r.status + ").");
    maps[feld] = werteFuerPunkt(await r.text(), TAGES_PARAMETER[feld], punkt.id);
    if (maps[feld] === null) throw fehler("format", "Das Dateiformat von MeteoSchweiz hat sich geändert (" + TAGES_PARAMETER[feld] + ").");
  }
  const tage = tageAus(maps);
  if (!tage.length) throw fehler("leer", "Für diesen Ort enthält die Vorhersage keine Werte.");
  return { ort: punkt.name, punktId: punkt.id, lauf, tage };
}
