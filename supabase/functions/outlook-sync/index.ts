// Supabase Edge Function: outlook-sync (v3.379)
// Outlook-Kalender (Microsoft Graph) ODER Google-Kalender (Calendar API, seit v3.384) <-> Termine, PRO MITARBEITER (eine Verbindung je Person). Aufrufe:
//   - geplant (pg_cron alle 5 Minuten): Header x-cron-secret (Vault-Geheimnis, nur Datenbank und diese Funktion kennen es)
//   - angemeldeter Mitarbeiter (Bearer-Token): aktion = start | sync | trennen | modus | konflikt
// verify_jwt ist FALSE, weil der Cron-Aufruf kein Benutzer-Token hat; die Funktion prueft jeden Aufruf SELBST (Cron-Geheimnis oder Benutzer-Token
// + aktive Firma ueber my_company_id()). Der Client schickt nie eine Firma oder Person - beides kommt aus dem Token.
// Tokens: Refresh-Token liegen im Supabase Vault (verschluesselt), nie in normalen Tabellen, nie im Browser. Das Microsoft-Client-Geheimnis
// (MS_CLIENT_SECRET) ist ein Server-Secret. Keine Kalenderinhalte oder Tokens in Logausgaben.
// WER DIESE DATEI AENDERT, MUSS SIE ERNEUT PER mcp__Supabase__deploy_edge_function VEROEFFENTLICHEN (mit core.js).
import { syncVerbindung, konfliktLoesen, fehlerMeldung } from "./core.js";
import { googleAdapter } from "./gcal.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const URL_ = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const DIENST = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CLIENT_ID = Deno.env.get("MS_CLIENT_ID") || "77ec4e42-844f-4fe7-9ab8-782a64d114c2";
const CLIENT_SECRET = Deno.env.get("MS_CLIENT_SECRET") || "";
const TENANT = Deno.env.get("MS_TENANT") || "common";
const SCOPE = "offline_access Calendars.ReadWrite User.Read";
const G_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const G_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const G_SCOPE = "openid email https://www.googleapis.com/auth/calendar.events";
const G_REDIRECT = `${URL_}/functions/v1/google-callback`;
const REDIRECT = `${URL_}/functions/v1/outlook-callback`;
const GRAPH = "https://graph.microsoft.com/v1.0";
const SELECT = "id,subject,start,end,isAllDay,isCancelled,location,body,bodyPreview,changeKey,sensitivity,categories";
const ZEITBUDGET_MS = 110000;

const antwort = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fehler = (message: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(message), extra);

// ---- Datenbank (Service-Rolle, immer mit ausdruecklicher Firma) -------------------------------
const dk = { apikey: DIENST, Authorization: `Bearer ${DIENST}`, "Content-Type": "application/json" };
async function rest(pfad: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_}/rest/v1/${pfad}`, { ...init, headers: { ...dk, ...(init.headers || {}) }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw fehler("db " + r.status, { status: r.status, code: r.status === 401 || r.status === 403 ? "keine_berechtigung" : "db" });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
async function rpc(name: string, args: Record<string, unknown>) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: "POST", headers: dk, body: JSON.stringify(args), signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw fehler("rpc " + r.status, { status: r.status });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
function dbAdapter(firma: string, verb: { id: number }) {
  const f = `company_id=eq.${firma}`;
  const rep = { Prefer: "return=representation" };
  return {
    mapAlle: () => rest(`outlook_termin_map?verbindung_id=eq.${verb.id}&select=*&limit=5000`),
    termineImFenster: (von: string, bis: string) => rest(`termine?${f}&ende_datum=gte.${von}&start_datum=lte.${bis}&select=*&limit=3000`),
    terminHolen: async (id: number) => (await rest(`termine?${f}&id=eq.${id}&select=*`))[0] || null,
    projekte: () => rest(`projects?${f}&select=id,name,order_no,object,archived&limit=3000`),
    terminAnlegen: async (felder: Record<string, unknown>) => (await rest("termine", { method: "POST", headers: rep, body: JSON.stringify({ ...felder, company_id: firma }) }))[0],
    terminAendern: async (id: number, felder: Record<string, unknown>) => (await rest(`termine?${f}&id=eq.${id}`, { method: "PATCH", headers: rep, body: JSON.stringify(felder) }))[0] || null,
    terminLoeschen: (id: number) => rest(`termine?${f}&id=eq.${id}`, { method: "DELETE" }),
    mapSpeichern: async (r: Record<string, unknown>) => (await rest("outlook_termin_map", { method: "POST", headers: rep, body: JSON.stringify({ ...r, company_id: firma, letzter_abgleich: new Date().toISOString() }) }))[0],
    mapAendern: (id: number, felder: Record<string, unknown>) => rest(`outlook_termin_map?${f}&id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ ...felder, letzter_abgleich: new Date().toISOString() }) }),
    mapLoeschen: (id: number) => rest(`outlook_termin_map?${f}&id=eq.${id}`, { method: "DELETE" }),
  };
}

// ---- Microsoft ------------------------------------------------------------------------------------
async function zugriffsToken(profil: string): Promise<string> {
  if (!CLIENT_SECRET) throw fehler("MS_CLIENT_SECRET fehlt", { code: "nicht_konfiguriert" });
  const refresh = await rpc("outlook_token_holen", { p_profil: profil });
  if (!refresh) throw fehler("kein Token", { code: "anmeldung_abgelaufen" });
  let r: Response;
  try {
    r = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(20000),
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "refresh_token", refresh_token: refresh, scope: SCOPE }),
    });
  } catch { throw fehler("netz", { code: "netz" }); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (j.error === "invalid_grant" || j.error === "interaction_required" || j.error === "unauthorized_client") throw fehler("abgelaufen", { code: "anmeldung_abgelaufen" });
    throw fehler("token " + r.status, { status: r.status });
  }
  if (j.refresh_token) await rpc("outlook_token_speichern", { p_profil: profil, p_token: j.refresh_token });
  return j.access_token;
}
async function zugriffsTokenGoogle(profil: string): Promise<string> {
  if (!G_ID || !G_SECRET) throw fehler("GOOGLE_CLIENT_* fehlt", { code: "nicht_konfiguriert" });
  const refresh = await rpc("google_token_holen", { p_profil: profil });
  if (!refresh) throw fehler("kein Token", { code: "anmeldung_abgelaufen" });
  let r: Response;
  try {
    r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(20000),
      body: new URLSearchParams({ client_id: G_ID, client_secret: G_SECRET, grant_type: "refresh_token", refresh_token: refresh }),
    });
  } catch { throw fehler("netz", { code: "netz" }); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (j.error === "invalid_grant" || j.error === "unauthorized_client" || j.error === "invalid_client") throw fehler("abgelaufen", { code: "anmeldung_abgelaufen" });
    throw fehler("token " + r.status, { status: r.status });
  }
  return j.access_token;
}
function graphAdapter(token: string, kalender: string | null) {
  const basis = kalender ? `${GRAPH}/me/calendars/${encodeURIComponent(kalender)}` : `${GRAPH}/me/calendar`;
  async function gf(url: string, init: RequestInit = {}, versuch = 0): Promise<Response> {
    let r: Response;
    try {
      r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: 'outlook.timezone="Europe/Zurich", outlook.body-content-type="text"', ...(init.headers || {}) }, signal: AbortSignal.timeout(25000) });
    } catch { throw fehler("netz", { code: "netz" }); }
    if ((r.status === 429 || r.status >= 500) && versuch < 2) {
      const warte = Math.min(5, Number(r.headers.get("Retry-After")) || 1 + versuch);
      await new Promise((ok) => setTimeout(ok, warte * 1000));
      return gf(url, init, versuch + 1);
    }
    return r;
  }
  const pruefen = (r: Response) => {
    if (r.ok) return;
    throw fehler("graph " + r.status, { status: r.status, code: r.status === 401 ? "anmeldung_abgelaufen" : r.status === 403 ? "keine_berechtigung" : undefined });
  };
  return {
    async ereignisse(von: string, bis: string) {
      let url: string | null = `${basis}/calendarView?startDateTime=${encodeURIComponent(von)}&endDateTime=${encodeURIComponent(bis)}&$top=100&$select=${SELECT}`;
      const alle: unknown[] = [];
      for (let seite = 0; url && seite < 40; seite++) {
        const r = await gf(url); pruefen(r);
        const j = await r.json();
        alle.push(...(j.value || []));
        url = j["@odata.nextLink"] || null;
      }
      if (url) throw fehler("zu viele Seiten", { status: 500 });   // lieber nichts tun als mit einer unvollstaendigen Liste Loeschungen ableiten
      return alle;
    },
    async erstellen(b: unknown) { const r = await gf(`${basis}/events`, { method: "POST", body: JSON.stringify(b) }); pruefen(r); return await r.json(); },
    async aendern(id: string, b: unknown) { const r = await gf(`${GRAPH}/me/events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(b) }); pruefen(r); return await r.json(); },
    async loeschen(id: string) { const r = await gf(`${GRAPH}/me/events/${encodeURIComponent(id)}`, { method: "DELETE" }); if (r.status !== 404) pruefen(r); },
    async holen(id: string) { const r = await gf(`${GRAPH}/me/events/${encodeURIComponent(id)}?$select=${SELECT}`); if (r.status === 404) return null; pruefen(r); return await r.json(); },
  };
}

// ---- Ein Lauf -----------------------------------------------------------------------------------------
async function firmaAktiv(firma: string): Promise<boolean> {
  const c = (await rest(`companies?id=eq.${firma}&select=subscription_status,trial_ends_at,is_active`))[0];
  if (!c || c.is_active === false) return false;
  return c.subscription_status === "active" || (c.subscription_status === "trial" && new Date(c.trial_ends_at).getTime() > Date.now());
}
async function laufFuer(verb: Record<string, any>) {
  // gleichzeitige Laeufe (Cron + Handtipp) ausschliessen: nur starten, wenn der letzte Lauf > 60 s her ist
  const grenze = new Date(Date.now() - 60000).toISOString();
  const gesperrt = await rest(`outlook_verbindungen?id=eq.${verb.id}&or=(letzter_lauf.is.null,letzter_lauf.lt.${grenze})`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ letzter_lauf: new Date().toISOString() }) });
  if (!gesperrt || !gesperrt.length) return { ok: true, uebersprungen: true, meldung: "Ein Abgleich läuft gerade oder wurde eben erst ausgeführt." };
  try {
    if (!(await firmaAktiv(verb.company_id))) throw fehler("firma gesperrt", { code: "keine_berechtigung" });
    const google = verb.anbieter === "google";
    const token = google ? await zugriffsTokenGoogle(verb.profile_id) : await zugriffsToken(verb.profile_id);
    const kal = google ? googleAdapter({ fetchFn: (u: string, i: RequestInit) => fetch(u, { ...i, signal: AbortSignal.timeout(25000) }), token }) : graphAdapter(token, verb.kalender_id);
    const z = await syncVerbindung({ db: dbAdapter(verb.company_id, verb), graph: kal, verb });
    const meldung = (z.hinweise.join(" ") || (z.gefunden === 0 ? (verb.anbieter === "google" ? "Im Google-Kalender wurden von 7 Tagen zurück bis 120 Tage voraus keine Termine gefunden (Hauptkalender des verbundenen Kontos)." : "In Outlook wurden von 7 Tagen zurück bis 120 Tage voraus keine Termine gefunden (Standardkalender des verbundenen Kontos).") : "")).slice(0, 300) || null;
    await rest(`outlook_verbindungen?id=eq.${verb.id}`, { method: "PATCH", body: JSON.stringify({
      status: "verbunden", letzter_erfolg: new Date().toISOString(), letzte_meldung: meldung,
      anz_neu: z.neu, anz_geaendert: z.geaendert, anz_uebersprungen: z.uebersprungen, anz_konflikte: z.konflikte }) });
    return { ok: true, neu: z.neu, geaendert: z.geaendert, uebersprungen: z.uebersprungen, konflikte: z.konflikte, fehler: z.fehler, gefunden: z.gefunden, hinweise: z.hinweise, meldung };
  } catch (e) {
    const code = (e as { code?: string }).code, status = (e as { status?: number }).status;
    console.error("kalender lauf", verb.id, code || status || "fehler");
    const abgelaufen = code === "anmeldung_abgelaufen";
    const meldung = code === "nicht_konfiguriert" ? "Der Kalender-Abgleich ist auf dem Server noch nicht fertig eingerichtet." : fehlerMeldung(e);
    await rest(`outlook_verbindungen?id=eq.${verb.id}`, { method: "PATCH", body: JSON.stringify({ status: abgelaufen ? "fehler" : "verbunden", letzte_meldung: meldung.slice(0, 300) }) }).catch(() => {});
    return { ok: false, meldung, abgelaufen };
  }
}

// ---- Wer ruft auf? ---------------------------------------------------------------------------------
async function benutzer(req: Request): Promise<{ id: string; firma: string } | null> {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "");
  if (!m) return null;
  const kopf = { apikey: ANON, Authorization: `Bearer ${m[1].trim()}`, "Content-Type": "application/json" };
  try {
    const u = await fetch(`${URL_}/auth/v1/user`, { headers: kopf, signal: AbortSignal.timeout(10000) });
    if (!u.ok) return null;
    const id = (await u.json()).id;
    const f = await fetch(`${URL_}/rest/v1/rpc/my_company_id`, { method: "POST", headers: kopf, body: "{}", signal: AbortSignal.timeout(10000) });
    if (!f.ok) return null;
    const firma = await f.json();
    return id && firma ? { id, firma } : null;
  } catch { return null; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return antwort(405, { ok: false, error: "Nur POST." });
  if (!URL_ || !DIENST || !ANON) return antwort(500, { ok: false, error: "Serverkonfiguration unvollständig." });
  const body = await req.json().catch(() => ({}));

  // --- Geplanter Lauf ---
  const cron = req.headers.get("x-cron-secret");
  if (cron) {
    let erlaubt = false;
    try { erlaubt = (await rpc("outlook_cron_pruefen", { p_geheimnis: cron })) === true; } catch { /* abgewiesen */ }
    if (!erlaubt) return antwort(401, { ok: false, error: "Nicht erlaubt." });
    const start = Date.now();
    const liste = await rest("outlook_verbindungen?status=eq.verbunden&select=*&order=letzter_lauf.asc.nullsfirst&limit=500");
    let n = 0, fehlerN = 0;
    for (const v of liste || []) {
      if (Date.now() - start > ZEITBUDGET_MS) break;
      const r = await laufFuer(v);
      n++; if (!r.ok) fehlerN++;
    }
    return antwort(200, { ok: true, verarbeitet: n, fehler: fehlerN });
  }

  // --- Mitarbeiter ---
  const ich = await benutzer(req);
  if (!ich) return antwort(401, { ok: false, error: "Nicht angemeldet. Bitte in der App anmelden und nochmals versuchen." });
  const verbindung = async () => (await rest(`outlook_verbindungen?profile_id=eq.${ich.id}&company_id=eq.${ich.firma}&select=*`))[0] || null;
  const aktion = String(body.aktion || "");

  if (aktion === "start") {
    const google = body.anbieter === "google";
    if (google ? (!G_ID || !G_SECRET) : !CLIENT_SECRET) return antwort(503, { ok: false, error: google ? "Der Google-Kalender ist auf dem Server noch nicht fertig eingerichtet (Google-Zugangsdaten fehlen)." : "Outlook ist auf dem Server noch nicht fertig eingerichtet (Microsoft-Geheimnis fehlt)." });
    const bestehend = await verbindung();
    if (bestehend && bestehend.anbieter !== (google ? "google" : "microsoft")) return antwort(409, { ok: false, error: "Es ist schon ein anderer Kalender verbunden (" + (bestehend.anbieter === "google" ? "Google" : "Outlook") + "). Bitte zuerst dessen Verbindung trennen." });
    let rueck = "";
    try {
      const u = new URL(String(body.rueck || ""));
      if (u.protocol !== "https:" || u.origin !== req.headers.get("origin")) throw new Error("origin");
      rueck = u.origin + u.pathname;
    } catch { return antwort(400, { ok: false, error: "Ungültige Rücksprung-Adresse." }); }
    const nonce = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await rest("outlook_oauth_state", { method: "POST", body: JSON.stringify({ nonce, company_id: ich.firma, profile_id: ich.id, rueck, anbieter: google ? "google" : "microsoft", expires_at: new Date(Date.now() + 10 * 60000).toISOString() }) });
    const url = google
      ? "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({ client_id: G_ID, redirect_uri: G_REDIRECT, response_type: "code", scope: G_SCOPE, state: nonce, access_type: "offline", prompt: "consent select_account", include_granted_scopes: "true" })
      : `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?` + new URLSearchParams({ client_id: CLIENT_ID, response_type: "code", redirect_uri: REDIRECT, response_mode: "query", scope: SCOPE, state: nonce, prompt: "select_account" });
    return antwort(200, { ok: true, url });
  }
  const v = await verbindung();
  if (aktion === "sync") {
    if (!v) return antwort(404, { ok: false, error: "Es ist kein Kalender verbunden." });
    return antwort(200, await laufFuer(v));
  }
  if (aktion === "trennen") {
    if (v) {
      await rpc(v.anbieter === "google" ? "google_token_loeschen" : "outlook_token_loeschen", { p_profil: ich.id }).catch(() => {});
      await rest(`outlook_verbindungen?id=eq.${v.id}&company_id=eq.${ich.firma}`, { method: "DELETE" });   // Zuordnungen folgen per CASCADE; Termine und Outlook-Ereignisse bleiben
    }
    return antwort(200, { ok: true });
  }
  if (aktion === "modus") {
    if (!v) return antwort(404, { ok: false, error: "Es ist kein Kalender verbunden." });
    if (v.anbieter === "google") return antwort(400, { ok: false, error: "Google-Kalender kennt keine Kategorien – diese Auswahl gibt es nur bei Outlook." });
    const modus = body.import_modus === "markierte" ? "markierte" : "alle";
    await rest(`outlook_verbindungen?id=eq.${v.id}`, { method: "PATCH", body: JSON.stringify({ import_modus: modus }) });
    return antwort(200, { ok: true, import_modus: modus });
  }
  if (aktion === "konflikt") {
    if (!v) return antwort(404, { ok: false, error: "Es ist kein Kalender verbunden." });
    const wahl = body.wahl === "outlook" ? "outlook" : body.wahl === "app" ? "app" : "";
    if (!wahl || !Number.isInteger(body.map_id)) return antwort(400, { ok: false, error: "Ungültige Angaben." });
    const m = (await rest(`outlook_termin_map?id=eq.${body.map_id}&verbindung_id=eq.${v.id}&company_id=eq.${ich.firma}&select=*`))[0];
    if (!m || !m.konflikt) return antwort(404, { ok: false, error: "Dieser Konflikt besteht nicht mehr." });
    try {
      const google = v.anbieter === "google";
      const token = google ? await zugriffsTokenGoogle(ich.id) : await zugriffsToken(ich.id);
      const kal = google ? googleAdapter({ fetchFn: (u: string, i: RequestInit) => fetch(u, { ...i, signal: AbortSignal.timeout(25000) }), token }) : graphAdapter(token, v.kalender_id);
      await konfliktLoesen({ db: dbAdapter(ich.firma, v), graph: kal, m, wahl });
      return antwort(200, { ok: true });
    } catch (e) {
      return antwort(200, { ok: false, error: (e as { code?: string }).code === "weg" || (e as { code?: string }).code === "keine_berechtigung" || (e as { code?: string }).code === "format" ? (e as Error).message : fehlerMeldung(e) });
    }
  }
  return antwort(400, { ok: false, error: "Unbekannte Aktion." });
});
