// Google-Kalender-Adapter (v3.384). Spricht die Google Calendar API (v3) und liefert/erwartet dieselbe Ereignis-Form wie der Microsoft-Graph-Adapter
// (subject, start{dateTime,timeZone}, end, isAllDay, changeKey, sensitivity, isCancelled, location{displayName}, body{content}), damit der Kern (core.js)
// unveraendert fuer beide Anbieter gilt. Rein: der Netzaufruf wird als fetchFn eingespeist (im Test nachgebaut, in der Funktion das echte fetch).
// Grenzen: nur der Hauptkalender ("primary"); Google kennt keine Kategorien (Import-Modus "nur markierte" gibt es hier nicht); Wiederholungen werden von
// Google selbst in einzelne Termine aufgeloest (singleEvents=true).
import { ZONE } from "./core.js";

const API = "https://www.googleapis.com/calendar/v3/calendars/primary";
const z2 = (n) => String(n).padStart(2, "0");
function inZone(dateTimeIso) {
  const d = new Date(dateTimeIso);
  if (isNaN(d)) return null;
  const t = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(d).forEach((p) => { t[p.type] = p.value; });
  return t.year + "-" + t.month + "-" + t.day + "T" + z2(+t.hour % 24) + ":" + t.minute + ":" + t.second;
}
// Google-Ereignis -> Graph-aehnliche Form
export function googleZuGraph(g) {
  if (!g || !g.id) return null;
  const ganz = !!(g.start && g.start.date);
  // Google liefert dateTime mit Offset (z. B. +02:00) -> Zuercher Ortszeit. Ohne Offset ("2026-10-25T10:00:00" + timeZone) ist es die Wanduhrzeit dieser Zone.
  const zeit = (o) => {
    if (o && o.date) return { dateTime: o.date + "T00:00:00", timeZone: ZONE };
    if (!o || !o.dateTime) return null;
    if (!/([zZ]|[+-]\d\d:\d\d)$/.test(o.dateTime)) return { dateTime: o.dateTime.slice(0, 19), timeZone: o.timeZone || ZONE };
    const z = inZone(o.dateTime);
    return z ? { dateTime: z, timeZone: ZONE } : null;
  };
  return {
    id: g.id, changeKey: g.etag || g.updated || "", subject: g.summary || "",
    body: { content: g.description || "", contentType: "text" }, location: { displayName: g.location || "" },
    isAllDay: ganz, isCancelled: g.status === "cancelled",
    sensitivity: (g.visibility === "private" || g.visibility === "confidential") ? "private" : "normal",
    categories: [], start: zeit(g.start), end: zeit(g.end),
  };
}
// Graph-aehnlicher Body (aus core.terminZuEvent) -> Google-Ereignis
export function graphZuGoogle(b) {
  const o = { summary: b.subject || "", description: (b.body && b.body.content) || "", location: (b.location && b.location.displayName) || "" };
  if (b.isAllDay) {
    o.start = { date: b.start.dateTime.slice(0, 10) };
    o.end = { date: b.end.dateTime.slice(0, 10) };
  } else {
    o.start = { dateTime: b.start.dateTime, timeZone: ZONE };
    o.end = { dateTime: b.end.dateTime, timeZone: ZONE };
  }
  return o;
}

// fetchFn(url, init) -> Response; token = Zugriffstoken. Fehler als Error mit .status / .code (wie beim Graph-Adapter)
export function googleAdapter({ fetchFn, token }) {
  const fehler = (m, extra) => Object.assign(new Error(m), extra);
  async function gf(url, init = {}, versuch = 0) {
    let r;
    try {
      r = await fetchFn(url, { ...init, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(init.headers || {}) } });
    } catch { throw fehler("netz", { code: "netz" }); }
    if ((r.status === 429 || r.status >= 500) && versuch < 2) {
      const warte = Math.min(5, Number(r.headers && r.headers.get && r.headers.get("Retry-After")) || 1 + versuch);
      await new Promise((ok) => setTimeout(ok, warte * 1000));
      return gf(url, init, versuch + 1);
    }
    return r;
  }
  const pruefen = (r) => {
    if (r.ok) return;
    throw fehler("google " + r.status, { status: r.status, code: r.status === 401 ? "anmeldung_abgelaufen" : r.status === 403 ? "keine_berechtigung" : undefined });
  };
  return {
    async ereignisse(von, bis) {
      // von/bis sind UTC-Zeitpunkte (ISO mit Z); Google verlangt Zeitzone
      let seite = null;
      const alle = [];
      for (let n = 0; n < 40; n++) {
        const q = new URLSearchParams({ timeMin: von, timeMax: bis, singleEvents: "true", showDeleted: "false", maxResults: "250", orderBy: "startTime" });
        if (seite) q.set("pageToken", seite);
        const r = await gf(API + "/events?" + q.toString()); pruefen(r);
        const j = await r.json();
        for (const g of j.items || []) { const e = googleZuGraph(g); if (e && e.start) alle.push(e); }
        seite = j.nextPageToken || null;
        if (!seite) return alle;
      }
      throw fehler("zu viele Seiten", { status: 500 });   // lieber nichts tun als mit unvollstaendiger Liste Loeschungen ableiten
    },
    async erstellen(b) { const r = await gf(API + "/events", { method: "POST", body: JSON.stringify(graphZuGoogle(b)) }); pruefen(r); return googleZuGraph(await r.json()); },
    async aendern(id, b) { const r = await gf(API + "/events/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(graphZuGoogle(b)) }); pruefen(r); return googleZuGraph(await r.json()); },
    async loeschen(id) { const r = await gf(API + "/events/" + encodeURIComponent(id), { method: "DELETE" }); if (r.status !== 404 && r.status !== 410) pruefen(r); },
    async holen(id) { const r = await gf(API + "/events/" + encodeURIComponent(id)); if (r.status === 404 || r.status === 410) return null; pruefen(r); const e = googleZuGraph(await r.json()); return e && !e.isCancelled ? e : null; },
  };
}
