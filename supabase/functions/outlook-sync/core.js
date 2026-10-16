// Reiner Kern der Outlook-Synchronisation (v3.379) - ohne Deno-/Netz-Abhaengigkeit, damit er mit Node gegen nachgebaute Microsoft-Graph-
// und Datenbank-Adapter getestet werden kann (pruefstaende/pruefstand-outlook-v3-379.js). Die Edge Function (index.ts) liefert die echten Adapter.
//
// ABLAUF eines Laufs fuer EINE Verbindung (= ein Mitarbeiter): Fenster = 7 Tage zurueck bis 120 Tage voraus.
//  1. Outlook-Ereignisse im Fenster holen (calendarView, Wiederholungen sind dort bereits einzeln aufgelöst). Scheitert das: Abbruch, es wird NICHTS geaendert.
//  2. Outlook -> App: neue Ereignisse anlegen, geaenderte uebernehmen. App -> Outlook: in der App geaenderte Termine uebertragen.
//     Aenderung auf BEIDEN Seiten seit dem letzten Abgleich und unterschiedlicher Inhalt = KONFLIKT: nichts wird ueberschrieben, die Person entscheidet.
//  3. Loeschungen: in Outlook geloeschte Ereignisse (nur sicher erkennbar, nur im Fenster, nur mit Zuordnung), mit Sicherung gegen Massenloeschung.
//  4. In der App neue Termine dieser Person nach Outlook schreiben.
// Idempotenz: jede Zuordnung (event_id <-> termin_id) steht in outlook_termin_map mit changeKey (Outlook-Stand) und app_hash (App-Stand).
// Schleifen: nach jedem Schreiben wird der neue Stand beider Seiten in der Zuordnung gemerkt; ein unveraenderter Stand loest nichts mehr aus.
export const ZONE = "Europe/Zurich";
export const FENSTER_VOR_TAGE = 7;
export const FENSTER_NACH_TAGE = 120;
export const MAX_NEU_PRO_LAUF = 200;
export const KATEGORIE_MARKIERT = "Spengler-DIGITAL";
export const PROJEKT_SICHER = 80;

// ---- Datum ----------------------------------------------------------------
const z2 = (n) => String(n).padStart(2, "0");
export function datumText(y, m, d) { return y + "-" + z2(m) + "-" + z2(d); }
export function addTage(iso, n) {
  const [y, m, d] = iso.split("-").map(Number), dt = new Date(Date.UTC(y, m - 1, d + n));
  return datumText(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
export function heuteIso(jetzt, zone = ZONE) {
  const t = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(jetzt).forEach((p) => { t[p.type] = p.value; });
  return t.year + "-" + t.month + "-" + t.day;
}
function ortszeit(ms, zone) {
  const t = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(ms)).forEach((p) => { t[p.type] = p.value; });
  return { y: +t.year, mo: +t.month, d: +t.day, h: +t.hour % 24, mi: +t.minute };
}
function wandNachUtc(y, mo, d, h, mi, zone) {
  const roh = Date.UTC(y, mo - 1, d, h, mi, 0);
  let ms = roh;
  for (let n = 0; n < 3; n++) { const o = ortszeit(ms, zone); ms = roh - (Date.UTC(o.y, o.mo - 1, o.d, o.h, o.mi, 0) - ms); }
  return ms;
}
// "2026-10-20T08:00:00.0000000" in Zeitzone tz -> {datum:"YYYY-MM-DD",zeit:"HH:MM"} in ZONE
export function graphZeit(obj) {
  if (!obj || typeof obj.dateTime !== "string") return null;
  const m = obj.dateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5];
  const tz = String(obj.timeZone || ZONE);
  if (tz === ZONE) return { datum: datumText(y, mo, d), zeit: z2(h) + ":" + z2(mi) };
  try {
    const o = ortszeit(tz === "UTC" ? Date.UTC(y, mo - 1, d, h, mi) : wandNachUtc(y, mo, d, h, mi, tz), ZONE);
    return { datum: datumText(o.y, o.mo, o.d), zeit: z2(o.h) + ":" + z2(o.mi) };
  } catch { return null; }
}

// ---- Termin <-> Ereignis ----------------------------------------------------------
const kurz = (t) => (t == null ? "" : String(t).slice(0, 5));
export function normalisiere(t) {
  return {
    titel: String(t.titel || "").replace(/\s+/g, " ").trim(),
    start_datum: String(t.start_datum || ""), ende_datum: String(t.ende_datum || t.start_datum || ""),
    start_zeit: t.start_zeit ? kurz(t.start_zeit) : null, ende_zeit: t.ende_zeit ? kurz(t.ende_zeit) : null,
    ort: String(t.ort || "").replace(/\s+/g, " ").trim(),
    notiz: String(t.notiz || "").replace(/\r\n?/g, "\n").trim(),
  };
}
function cyrb53(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
export function hashTermin(t) { return cyrb53(JSON.stringify(normalisiere(t))); }
export function terminZuEvent(t) {
  const n = normalisiere(t);
  const body = { subject: n.titel, body: { contentType: "text", content: n.notiz }, location: { displayName: n.ort } };
  if (!n.start_zeit) {
    return { ...body, isAllDay: true, start: { dateTime: n.start_datum + "T00:00:00", timeZone: ZONE }, end: { dateTime: addTage(n.ende_datum, 1) + "T00:00:00", timeZone: ZONE } };
  }
  let endD = n.ende_datum, endZ = n.ende_zeit;
  if (!endZ) {   // Outlook braucht ein Ende: ohne Angabe eine Stunde nach Beginn
    const [h, mi] = n.start_zeit.split(":").map(Number), tot = h * 60 + mi + 60;
    if (tot >= 24 * 60) { endD = addTage(n.ende_datum, 1); endZ = z2(Math.floor((tot - 1440) / 60)) + ":" + z2((tot - 1440) % 60); }
    else endZ = z2(Math.floor(tot / 60)) + ":" + z2(tot % 60);
  }
  return { ...body, isAllDay: false, start: { dateTime: n.start_datum + "T" + n.start_zeit + ":00", timeZone: ZONE }, end: { dateTime: endD + "T" + endZ + ":00", timeZone: ZONE } };
}
// Outlook-Ereignis -> Termin-Felder (normalisiert) oder null
export function eventZuTermin(ev) {
  if (!ev) return null;
  const s = graphZeit(ev.start), e = graphZeit(ev.end);
  if (!s) return null;
  const titel = String(ev.subject || "").replace(/\s+/g, " ").trim().slice(0, 200) || "(ohne Titel)";
  const ort = String((ev.location && ev.location.displayName) || "").replace(/\s+/g, " ").trim().slice(0, 300);
  let notiz = String((ev.body && ev.body.content) || ev.bodyPreview || "").replace(/\r\n?/g, "\n").trim().slice(0, 4000);
  let t;
  if (ev.isAllDay) {
    let ende = e ? addTage(e.datum, -1) : s.datum;
    if (ende < s.datum) ende = s.datum;
    t = { titel, start_datum: s.datum, ende_datum: ende, start_zeit: null, ende_zeit: null, ort, notiz };
  } else {
    let ed = s.datum, ez = null;
    if (e && (e.datum > s.datum || (e.datum === s.datum && e.zeit >= s.zeit))) { ed = e.datum; ez = e.zeit; }
    t = { titel, start_datum: s.datum, ende_datum: ed, start_zeit: s.zeit, ende_zeit: ez, ort, notiz };
  }
  return t;
}
export function istPrivat(ev) { const s = String((ev && ev.sensitivity) || "").toLowerCase(); return s === "private" || s === "confidential"; }
export function passtImportModus(ev, modus) {
  if (modus !== "markierte") return true;
  return Array.isArray(ev.categories) && ev.categories.some((c) => String(c).toLowerCase() === KATEGORIE_MARKIERT.toLowerCase());
}
export function exportberechtigt(t, profilId) {
  const ma = Array.isArray(t.mitarbeiter) ? t.mitarbeiter : [];
  return ma.includes(profilId) || (ma.length === 0 && t.created_by === profilId);
}

// ---- Projekt-Vorschlag (gleiche Regel wie js/91-ics-parser.js) ------------------------------
function norm(s) {
  return " " + String(s == null ? "" : s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/é|è|ê/g, "e").replace(/à|â/g, "a")
    .replace(/strasse\b/g, "str").replace(/str\./g, "str").replace(/[^a-z0-9]+/g, " ") + " ";
}
export function projektVorschlag(t, projekte) {
  const text = norm([t.ort, t.titel, t.notiz].join(" "));
  const treffer = [];
  for (const p of Array.isArray(projekte) ? projekte : []) {
    if (!p || p.archived) continue;
    let score = 0;
    const nr = norm(p.order_no).trim();
    if (nr.length >= 3 && text.includes(" " + nr + " ")) score = Math.max(score, 100);
    const adr = norm(String(p.object || "").split(",")[0]).trim();
    if (adr.length >= 5 && /\d/.test(adr) && text.includes(" " + adr + " ")) score = Math.max(score, 80);
    const name = norm(p.name).trim();
    if (name.length >= 5 && text.includes(" " + name + " ")) score = Math.max(score, 50);
    if (score) treffer.push({ id: p.id, score });
  }
  if (!treffer.length) return null;
  treffer.sort((a, b) => b.score - a.score);
  if (treffer.length > 1 && treffer[1].score === treffer[0].score) return null;
  return treffer[0].score >= 50 ? { projectId: treffer[0].id, score: treffer[0].score } : null;
}

// ---- Der Lauf ---------------------------------------------------------------------------------
const istStopp = (e) => !e || e.status === undefined || e.status === 429 || e.status >= 500 || e.code === "netz" || e.code === "anmeldung_abgelaufen" || e.code === "keine_berechtigung";

export async function syncVerbindung({ db, graph, verb, jetzt = new Date() }) {
  const z = { neu: 0, geaendert: 0, uebersprungen: 0, konflikte: 0, fehler: 0, gefunden: 0, hinweise: [] };
  const hinweis = (t) => { if (!z.hinweise.includes(t)) z.hinweise.push(t); };
  const heute = heuteIso(jetzt);
  const von = addTage(heute, -FENSTER_VOR_TAGE), bis = addTage(heute, FENSTER_NACH_TAGE);

  // 1. Outlook lesen - scheitert das, bleibt alles unveraendert
  // Abfragefenster EINEN Tag breiter als das Datumsfenster und ausdruecklich in UTC: so faellt kein Ereignis am Rand durch eine Zeitzonenverschiebung
  // heraus (sonst haette es wie "in Outlook geloescht" ausgesehen).
  const events = await graph.ereignisse(addTage(von, -1) + "T00:00:00Z", addTage(bis, 1) + "T23:59:59Z");
  z.gefunden = events.length;   // Diagnose: wie viele Ereignisse hat Outlook im Zeitraum geliefert (0 = der Kalender ist dort leer oder ein anderer)
  const map = await db.mapAlle();
  const mapEvent = new Map(map.map((m) => [m.event_id, m]));
  const termineFenster = await db.termineImFenster(von, bis);
  const terminById = new Map(termineFenster.map((t) => [t.id, t]));
  const projekte = await db.projekte();
  const gesehen = new Set();

  const hole = async (id) => { if (terminById.has(id)) return terminById.get(id); const t = await db.terminHolen(id); if (t) terminById.set(id, t); return t; };

  for (const ev of events) {
    try {
      if (ev.isCancelled) continue;                       // gilt wie geloescht (siehe Schritt 3)
      gesehen.add(ev.id);
      const m = mapEvent.get(ev.id);
      if (!m) {
        if (istPrivat(ev)) { z.uebersprungen++; hinweis("Private Termine werden nie übernommen."); continue; }
        if (!passtImportModus(ev, verb.import_modus)) { z.uebersprungen++; continue; }
        const t = eventZuTermin(ev);
        if (!t) { z.uebersprungen++; hinweis("Einzelne Termine ohne lesbares Datum wurden ausgelassen."); continue; }
        const v = projektVorschlag(t, projekte), sicher = !!(v && v.score >= PROJEKT_SICHER);
        const row = await db.terminAnlegen({ ...t, ort: t.ort || null, notiz: t.notiz || null, project_id: sicher ? v.projectId : null, projekt_pruefen: !sicher,
          mitarbeiter: [verb.profile_id], created_by: verb.profile_id, quelle: verb.anbieter === "google" ? "google" : "outlook", ics_uid: null });
        await db.mapSpeichern({ verbindung_id: verb.id, termin_id: row.id, event_id: ev.id, herkunft: "outlook", etag: ev.changeKey, app_hash: hashTermin(row), konflikt: false, ignoriert: false });
        terminById.set(row.id, row);
        mapEvent.set(ev.id, { ignoriert: true });   // dasselbe Ereignis in derselben Liste nie zweimal anlegen
        z.neu++;
        continue;
      }
      if (m.ignoriert) continue;
      const termin = m.termin_id != null ? await hole(m.termin_id) : null;
      if (!termin) {                                      // in der App geloescht
        if (m.herkunft === "app") { await graph.loeschen(ev.id); await db.mapLoeschen(m.id); z.geaendert++; }
        else await db.mapAendern(m.id, { ignoriert: true, termin_id: null });
        continue;
      }
      if (m.konflikt) { z.konflikte++; continue; }        // wartet auf die Entscheidung der Person
      const outlookNeu = ev.changeKey !== m.etag, appNeu = hashTermin(termin) !== m.app_hash;
      if (!outlookNeu && !appNeu) continue;
      const evT = eventZuTermin(ev);
      if (outlookNeu && appNeu) {
        if (evT && hashTermin(evT) === hashTermin(termin)) { await db.mapAendern(m.id, { etag: ev.changeKey, app_hash: hashTermin(termin), konflikt: false }); continue; }
        await db.mapAendern(m.id, { konflikt: true });
        z.konflikte++;
        continue;
      }
      if (outlookNeu) {
        if (!evT || istPrivat(ev)) { z.uebersprungen++; continue; }
        const row = await db.terminAendern(termin.id, { ...evT, ort: evT.ort || null, notiz: evT.notiz || null });
        if (!row) { z.fehler++; hinweis("Ein Termin konnte nicht aktualisiert werden (fehlende Berechtigung?)."); continue; }
        terminById.set(row.id, row);
        await db.mapAendern(m.id, { etag: ev.changeKey, app_hash: hashTermin(row) });
        z.geaendert++;
      } else {
        const neu = await graph.aendern(ev.id, terminZuEvent(termin));
        await db.mapAendern(m.id, { etag: neu.changeKey, app_hash: hashTermin(termin) });
        z.geaendert++;
      }
    } catch (e) {
      if (istStopp(e)) throw e;
      z.fehler++; hinweis("Einzelne Termine konnten nicht abgeglichen werden.");
    }
  }

  // 3. In Outlook geloeschte Ereignisse (nur Fenster, nur mit Zuordnung, mit Sicherung)
  const imFenster = map.filter((m) => !m.ignoriert && m.termin_id != null && terminById.has(m.termin_id) && termineFenster.some((t) => t.id === m.termin_id));
  const fehlend = imFenster.filter((m) => !gesehen.has(m.event_id));
  if (fehlend.length) {
    // verdaechtig: sehr viele fehlen, ODER die Antwort ist komplett leer, obwohl mehrere Termine zugeordnet sind (z. B. falscher/leerer Kalender, Teilfehler)
    if (fehlend.length > Math.max(3, Math.ceil(imFenster.length * 0.3)) || (events.length === 0 && imFenster.length >= 2)) {
      hinweis("Auffällig viele Termine fehlen im Kalender (" + fehlend.length + ") – aus Sicherheit wurde nichts gelöscht.");
      z.uebersprungen += fehlend.length;
    } else {
      for (const m of fehlend) {
        try {
          const t = terminById.get(m.termin_id);
          // in der App nach dem letzten Abgleich geaendert: nicht loeschen (sonst gingen App-Aenderungen verloren)
          if (m.herkunft === "outlook" && t && hashTermin(t) === m.app_hash) { await db.terminLoeschen(m.termin_id); await db.mapLoeschen(m.id); }
          else await db.mapAendern(m.id, { ignoriert: true });   // Outlook-Kopie entfernt: der Termin bleibt in der App
          z.geaendert++;
        } catch (e) { if (istStopp(e)) throw e; z.fehler++; }
      }
    }
  }

  // 4. Neue Termine dieser Person nach Outlook (bereits zugeordnete werden nie nochmals angelegt)
  const frisch = await db.mapAlle();
  const hatMap = new Set(frisch.filter((m) => m.termin_id != null).map((m) => m.termin_id));
  let angelegt = 0;
  for (const t of termineFenster) {
    if (angelegt >= MAX_NEU_PRO_LAUF) { hinweis("Es werden höchstens " + MAX_NEU_PRO_LAUF + " Termine pro Lauf in den Kalender geschrieben – der Rest folgt beim nächsten Lauf."); break; }
    if (hatMap.has(t.id) || !exportberechtigt(t, verb.profile_id)) continue;
    try {
      const ev = await graph.erstellen(terminZuEvent(t));
      await db.mapSpeichern({ verbindung_id: verb.id, termin_id: t.id, event_id: ev.id, herkunft: "app", etag: ev.changeKey, app_hash: hashTermin(t), konflikt: false, ignoriert: false });
      z.neu++; angelegt++;
    } catch (e) { if (istStopp(e)) throw e; z.fehler++; }
  }
  return z;
}

// Konflikt von Hand loesen. wahl: "app" (App-Stand nach Outlook) oder "outlook" (Outlook-Stand in die App)
export async function konfliktLoesen({ db, graph, m, wahl }) {
  const termin = m.termin_id != null ? await db.terminHolen(m.termin_id) : null;
  if (!termin) throw Object.assign(new Error("Der Termin existiert nicht mehr."), { code: "weg" });
  const ev = await graph.holen(m.event_id);
  if (!ev) throw Object.assign(new Error("Das Kalender-Ereignis existiert nicht mehr."), { code: "weg" });
  if (wahl === "app") {
    const neu = await graph.aendern(m.event_id, terminZuEvent(termin));
    await db.mapAendern(m.id, { etag: neu.changeKey, app_hash: hashTermin(termin), konflikt: false });
    return "app";
  }
  const t = eventZuTermin(ev);
  if (!t) throw Object.assign(new Error("Der Kalender-Termin ist nicht lesbar."), { code: "format" });
  const row = await db.terminAendern(termin.id, { ...t, ort: t.ort || null, notiz: t.notiz || null });
  if (!row) throw Object.assign(new Error("Nicht gespeichert – fehlt die nötige Berechtigung?"), { code: "keine_berechtigung" });
  await db.mapAendern(m.id, { etag: ev.changeKey, app_hash: hashTermin(row), konflikt: false });
  return "outlook";
}

// Meldung fuer die Person (ohne Inhalte aus dem Kalender)
export function fehlerMeldung(e) {
  if (e && e.code === "anmeldung_abgelaufen") return "Die Kalender-Anmeldung ist abgelaufen oder wurde widerrufen. Bitte neu verbinden.";
  if (e && e.status === 429) return "Der Kalender-Dienst bremst gerade (zu viele Anfragen). Der nächste Lauf versucht es erneut.";
  if (e && e.status >= 500) return "Der Kalender-Dienst ist vorübergehend nicht erreichbar. Der nächste Lauf versucht es erneut.";
  if (e && e.code === "netz") return "Keine Verbindung zum Kalender-Dienst. Der nächste Lauf versucht es erneut.";
  if (e && e.code === "keine_berechtigung") return "Fehlende Berechtigung beim Speichern von Terminen.";
  return "Der Abgleich ist fehlgeschlagen. Der nächste Lauf versucht es erneut.";
}
