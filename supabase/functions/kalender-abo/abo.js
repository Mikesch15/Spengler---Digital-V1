// Kalender-Abo (v3.385): Kern-Logik ohne Netz und Datenbank (wird im Test mit Fakes geprueft). Ein veroeffentlichter ICS-Link wird gelesen
// und mit den Terminen verglichen, die DIESES Abo frueher angelegt hat (termine.abo_id). Es wird nie etwas zurueckgeschrieben, und es werden nur
// Termine veraendert/geloescht, die das Abo selbst angelegt hat.
export const ZONE = "Europe/Zurich";
export const TAGE_ZURUECK = 7, TAGE_VORAUS = 120;
export const MAX_BYTES = 5 * 1024 * 1024;
// Nur bekannte Kalender-Anbieter (Schutz davor, dass der Server beliebige/interne Adressen abruft).
export const ERLAUBTE_HOSTS = ["outlook.live.com", "outlook.office365.com", "outlook.office.com", "calendar.google.com", "p01-calendars.icloud.com", "icloud.com"];
const hostErlaubt = (h) => ERLAUBTE_HOSTS.some((e) => h === e || h.endsWith("." + e));

// Prueft/normalisiert die Adresse. webcal:// wird zu https://. Gibt {ok,url,host} oder {ok:false,fehler}.
export function urlPruefen(eingabe) {
  let t = String(eingabe == null ? "" : eingabe).trim();
  if (!t) return { ok: false, fehler: "Bitte den Kalender-Link einfügen." };
  if (t.length > 2000) return { ok: false, fehler: "Der Link ist zu lang." };
  t = t.replace(/^webcals?:\/\//i, "https://");
  let u;
  try { u = new URL(t); } catch { return { ok: false, fehler: "Das ist kein gültiger Link." }; }
  if (u.protocol !== "https:") return { ok: false, fehler: "Der Link muss mit https:// (oder webcal://) beginnen." };
  if (u.username || u.password) return { ok: false, fehler: "Links mit Benutzername/Passwort werden nicht unterstützt." };
  if (u.port && u.port !== "443") return { ok: false, fehler: "Dieser Link wird nicht unterstützt." };
  const host = u.hostname.toLowerCase();
  if (!hostErlaubt(host)) return { ok: false, fehler: "Dieser Anbieter (" + host.slice(0, 60) + ") wird noch nicht unterstützt. Erlaubt sind veröffentlichte Kalender von Outlook/Microsoft 365, Google und iCloud." };
  if (!/\.ics$/i.test(u.pathname) && !/\/(calendar|ical)\b/i.test(u.pathname) && !/\.ics/i.test(u.search)) {
    // viele Anbieter haben ".ics" im Pfad; sonst trotzdem zulassen, der Inhalt wird ohnehin geprueft
  }
  u.hash = "";
  return { ok: true, url: u.toString(), host };
}

// Laedt den Feed. fetchFn(url, init) -> Response. Weiterleitungen werden einzeln geprueft (maximal 3, nur zu erlaubten Hosts).
export async function feedLaden(fetchFn, url) {
  let aktuell = url;
  for (let n = 0; n <= 3; n++) {
    let r;
    try { r = await fetchFn(aktuell, { redirect: "manual", headers: { Accept: "text/calendar, text/plain;q=0.8, */*;q=0.5", "User-Agent": "Spengler-DIGITAL/3.385" } }); }
    catch { throw Object.assign(new Error("netz"), { code: "netz" }); }
    if (r.status >= 300 && r.status < 400) {
      const ziel = r.headers.get("location");
      const p = urlPruefen(ziel ? new URL(ziel, aktuell).toString() : "");
      if (!p.ok) throw Object.assign(new Error("weiterleitung"), { code: "weiterleitung" });
      aktuell = p.url; continue;
    }
    if (r.status === 401 || r.status === 403 || r.status === 404 || r.status === 410) throw Object.assign(new Error("link " + r.status), { code: "link_ungueltig", status: r.status });
    if (!r.ok) throw Object.assign(new Error("http " + r.status), { code: "http", status: r.status });
    const len = Number(r.headers.get("content-length"));
    if (Number.isFinite(len) && len > MAX_BYTES) throw Object.assign(new Error("gross"), { code: "zu_gross" });
    const leser = r.body && r.body.getReader ? r.body.getReader() : null;
    if (!leser) { const t = await r.text(); if (t.length > MAX_BYTES) throw Object.assign(new Error("gross"), { code: "zu_gross" }); return t; }
    const teile = []; let summe = 0;
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      summe += value.byteLength;
      if (summe > MAX_BYTES) { try { await leser.cancel(); } catch { /* egal */ } throw Object.assign(new Error("gross"), { code: "zu_gross" }); }
      teile.push(value);
    }
    const alle = new Uint8Array(summe); let o = 0;
    for (const t of teile) { alle.set(t, o); o += t.byteLength; }
    return new TextDecoder("utf-8").decode(alle);
  }
  throw Object.assign(new Error("weiterleitungen"), { code: "weiterleitung" });
}

export function fehlerText(e) {
  const c = e && e.code;
  if (c === "link_ungueltig") return "Der Kalender-Link funktioniert nicht mehr (abgelaufen oder zurückgezogen). Bitte den Kalender in Outlook neu veröffentlichen und den neuen Link einfügen.";
  if (c === "zu_gross") return "Der Kalender ist zu gross (höchstens 5 MB).";
  if (c === "weiterleitung") return "Der Link führt auf eine nicht erlaubte Adresse.";
  if (c === "netz") return "Der Kalender-Anbieter ist gerade nicht erreichbar. Es wird später erneut versucht.";
  return "Der Kalender konnte nicht gelesen werden. Es wird später erneut versucht.";
}

// Fenster in Zuercher Tagen
const z2 = (n) => String(n).padStart(2, "0");
export function heuteZuerich(jetzt = new Date()) {
  const t = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(jetzt).forEach((p) => { t[p.type] = p.value; });
  return t.year + "-" + t.month + "-" + t.day;
}
export function tagPlus(iso, tage) {
  const [y, m, d] = iso.split("-").map(Number), dt = new Date(Date.UTC(y, m - 1, d + tage));
  return dt.getUTCFullYear() + "-" + z2(dt.getUTCMonth() + 1) + "-" + z2(dt.getUTCDate());
}
export function fensterFuer(jetzt = new Date()) { const h = heuteZuerich(jetzt); return { von: tagPlus(h, -TAGE_ZURUECK), bis: tagPlus(h, TAGE_VORAUS) }; }

export const aboUid = (aboId, uid) => ("abo" + aboId + ":" + uid).slice(0, 500);
const FELDER = ["titel", "start_datum", "ende_datum", "start_zeit", "ende_zeit", "ort", "notiz"];
const norm = (t) => ({
  titel: t.titel || "", start_datum: t.start_datum, ende_datum: t.ende_datum,
  start_zeit: t.start_zeit ? String(t.start_zeit).slice(0, 5) : null, ende_zeit: t.ende_zeit ? String(t.ende_zeit).slice(0, 5) : null,
  ort: t.ort || null, notiz: t.notiz || null,
});
const gleich = (a, b) => { const x = norm(a), y = norm(b); return FELDER.every((f) => x[f] === y[f]); };

// events: Ergebnis von icsLesen(...).termine (schon im Fenster). vorhanden: Termine dieses Abos aus der DB (alle mit abo_id).
// Gibt zurueck, was zu tun ist; fuehrt nichts aus.
export function plan({ aboId, profilId, events, vorhanden, fenster }) {
  const neu = [], aendern = [], loeschen = [], hinweise = [];
  const nachUid = new Map();
  for (const t of vorhanden) if (t.ics_uid) nachUid.set(t.ics_uid, t);
  const gesehen = new Set();
  for (const e of events) {
    const uid = aboUid(aboId, e.uid);
    if (gesehen.has(uid)) continue;
    gesehen.add(uid);
    const feld = norm(e);
    const alt = nachUid.get(uid);
    if (!alt) neu.push({ ...feld, ics_uid: uid, quelle: "abo", abo_id: aboId, mitarbeiter: [profilId], created_by: profilId, project_id: null });
    else if (!gleich(alt, feld)) aendern.push({ id: alt.id, felder: feld });
  }
  // Loeschkandidaten: Termine dieses Abos IM Fenster, die im Feed nicht mehr vorkommen
  const imFenster = vorhanden.filter((t) => t.ende_datum >= fenster.von && t.start_datum <= fenster.bis);
  const weg = imFenster.filter((t) => !gesehen.has(t.ics_uid));
  const grenze = Math.max(3, Math.ceil(imFenster.length * 0.3));
  if (weg.length && events.length === 0 && imFenster.length >= 2) hinweise.push("Der Kalender lieferte keine Termine – es wurde sicherheitshalber nichts gelöscht.");
  else if (weg.length > grenze) hinweise.push(weg.length + " Termine wären verschwunden – das sieht nach einem Fehler aus, es wurde sicherheitshalber nichts gelöscht.");
  else for (const t of weg) loeschen.push(t.id);
  return { neu, aendern, loeschen, hinweise };
}

// Fuehrt einen Lauf aus. db: {abo:{...}, vorhanden(), anlegen(arr), aendern(id,felder), loeschen(ids)}; text = Inhalt des Feeds; lesen = icsLesen.
export async function lauf({ db, aboId, profilId, text, lesen, jetzt = new Date() }) {
  const fenster = fensterFuer(jetzt);
  const g = lesen(text, { zone: ZONE, fenster, privatAus: true });
  if (g.fehler && !g.termine.length && !/kein lesbarer Termin/.test(g.fehler)) { const e = new Error(g.fehler); e.code = "format"; throw e; }
  const events = g.termine.filter((t) => t.ende_datum >= fenster.von && t.start_datum <= fenster.bis);
  const vorhanden = await db.vorhanden();
  const p = plan({ aboId, profilId, events, vorhanden, fenster });
  let neu = 0, geaendert = 0, entfernt = 0, fehler = 0;
  for (let i = 0; i < p.neu.length; i += 100) {
    const teil = p.neu.slice(i, i + 100);
    try { await db.anlegen(teil); neu += teil.length; } catch { fehler += teil.length; }
  }
  for (const a of p.aendern) { try { await db.aendern(a.id, a.felder); geaendert++; } catch { fehler++; } }
  if (p.loeschen.length) { try { await db.loeschen(p.loeschen); entfernt = p.loeschen.length; } catch { fehler += p.loeschen.length; } }
  return { gefunden: events.length, neu, geaendert, entfernt, fehler, hinweise: [...g.hinweise.slice(0, 3), ...p.hinweise] };
}
