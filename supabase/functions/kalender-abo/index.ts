// Supabase Edge Function: kalender-abo (v3.385)
// Liest einen veroeffentlichten Kalender-Link (ICS, z. B. Outlook "Kalender veroeffentlichen") und legt die Termine in der App an - NUR LESEN, nie zurueckschreiben.
// Aufrufe: geplant (pg_cron alle 15 Minuten, Header x-cron-secret wie bei outlook-sync) oder angemeldeter Mitarbeiter (Bearer-Token): aktion = start | sync | trennen.
// verify_jwt ist FALSE (der Cron-Aufruf hat kein Benutzer-Token); die Funktion prueft jeden Aufruf SELBST. Der Client schickt nie Firma oder Person.
// Der Kalender-Link liegt im Supabase Vault, nicht in einer lesbaren Tabelle, und kommt nie in Logs oder Antworten vor.
// WER DIESE DATEI AENDERT, MUSS SIE ERNEUT PER mcp__Supabase__deploy_edge_function VEROEFFENTLICHEN (mit abo.js und ics.js; ics.js entsteht aus js/91 via werkzeug-abo-ics.js).
import { urlPruefen, feedLaden, fehlerText, lauf, fensterFuer } from "./abo.js";
import { icsLesen } from "./ics.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const URL_ = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const DIENST = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ZEITBUDGET_MS = 110000;
const antwort = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const dk = { apikey: DIENST, Authorization: `Bearer ${DIENST}`, "Content-Type": "application/json" };
async function rest(pfad: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_}/rest/v1/${pfad}`, { ...init, headers: { ...dk, ...(init.headers || {}) }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw Object.assign(new Error("db " + r.status), { status: r.status });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
async function rpc(name: string, args: Record<string, unknown>) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: "POST", headers: dk, body: JSON.stringify(args), signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Object.assign(new Error("rpc " + r.status), { status: r.status });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const holen = (u: string, i: RequestInit) => fetch(u, { ...i, signal: AbortSignal.timeout(25000) });

async function firmaAktiv(firma: string): Promise<boolean> {
  const c = (await rest(`companies?id=eq.${firma}&select=subscription_status,trial_ends_at,is_active`))[0];
  if (!c || c.is_active === false) return false;
  return c.subscription_status === "active" || (c.subscription_status === "trial" && new Date(c.trial_ends_at).getTime() > Date.now());
}
// v3.389: Modul "termine" der Firma ausgeschaltet? Dann kein Abgleich (die Service-Rolle wuerde sonst an der Datenbanksperre vorbeischreiben).
async function termineModulAus(firma: string): Promise<boolean> {
  const m = (await rest(`company_modules?company_id=eq.${firma}&modul=eq.termine&select=aktiv`))[0];
  return !!m && m.aktiv === false;
}
function dbFuer(abo: { id: number; company_id: string }) {
  const f = `company_id=eq.${abo.company_id}&abo_id=eq.${abo.id}`;
  return {
    vorhanden: () => rest(`termine?${f}&select=id,titel,start_datum,ende_datum,start_zeit,ende_zeit,ort,notiz,ics_uid&limit=5000`),
    anlegen: (arr: Record<string, unknown>[]) => rest("termine", { method: "POST", body: JSON.stringify(arr.map((t) => ({ ...t, company_id: abo.company_id }))) }),
    aendern: (id: number, felder: Record<string, unknown>) => rest(`termine?${f}&id=eq.${id}`, { method: "PATCH", body: JSON.stringify(felder) }),
    loeschen: (ids: number[]) => rest(`termine?${f}&id=in.(${ids.map((x) => Number(x)).join(",")})`, { method: "DELETE" }),
  };
}

async function laufFuer(abo: Record<string, any>) {
  // gleichzeitige Laeufe (Cron + Handtipp) ausschliessen
  const grenze = new Date(Date.now() - 30000).toISOString();
  const frei = await rest(`kalender_abos?id=eq.${abo.id}&or=(letzter_lauf.is.null,letzter_lauf.lt.${grenze})`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ letzter_lauf: new Date().toISOString() }) });
  if (!frei || !frei.length) return { ok: true, uebersprungen: true, meldung: "Ein Abgleich läuft gerade oder wurde eben erst ausgeführt." };
  try {
    if (!(await firmaAktiv(abo.company_id))) throw Object.assign(new Error("firma"), { code: "firma" });
    if (await termineModulAus(abo.company_id)) throw Object.assign(new Error("modul"), { code: "modul_aus" });
    const url = await rpc("kalender_abo_url_holen", { p_abo: abo.id });
    if (!url) throw Object.assign(new Error("kein link"), { code: "link_ungueltig" });
    const p = urlPruefen(url);
    if (!p.ok) throw Object.assign(new Error("link"), { code: "link_ungueltig" });
    const text = await feedLaden(holen, p.url);
    const z = await lauf({ db: dbFuer(abo as { id: number; company_id: string }), aboId: abo.id, profilId: abo.profile_id, text, lesen: icsLesen });
    const meldung = (z.hinweise.join(" ") || (z.gefunden === 0 ? "Im Kalender wurden von 7 Tagen zurück bis 120 Tage voraus keine Termine gefunden." : "")).slice(0, 300) || null;
    await rest(`kalender_abos?id=eq.${abo.id}`, { method: "PATCH", body: JSON.stringify({
      status: "verbunden", letzter_erfolg: new Date().toISOString(), letzte_meldung: meldung,
      anz_gefunden: z.gefunden, anz_neu: z.neu, anz_geaendert: z.geaendert, anz_entfernt: z.entfernt }) });
    return { ok: true, gefunden: z.gefunden, neu: z.neu, geaendert: z.geaendert, entfernt: z.entfernt, fehler: z.fehler, hinweise: z.hinweise, meldung };
  } catch (e) {
    const code = (e as { code?: string }).code;
    console.error("kalender-abo lauf", abo.id, code || (e as { status?: number }).status || "fehler");
    const meldung = code === "format" ? "Unter diesem Link liegt keine lesbare Kalenderdatei." : code === "firma" ? "Die Firma ist nicht aktiv." : code === "modul_aus" ? "Das Modul «Termine und Kalender» ist für diese Firma nicht freigeschaltet." : fehlerText(e);
    const hart = code === "link_ungueltig" || code === "format";
    await rest(`kalender_abos?id=eq.${abo.id}`, { method: "PATCH", body: JSON.stringify({ status: hart ? "fehler" : "verbunden", letzte_meldung: meldung.slice(0, 300) }) }).catch(() => {});
    return { ok: false, meldung, abgelaufen: hart };
  }
}

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

  const cron = req.headers.get("x-cron-secret");
  if (cron) {
    let erlaubt = false;
    try { erlaubt = (await rpc("outlook_cron_pruefen", { p_geheimnis: cron })) === true; } catch { /* abgewiesen */ }
    if (!erlaubt) return antwort(401, { ok: false, error: "Nicht erlaubt." });
    const start = Date.now();
    const liste = await rest("kalender_abos?select=*&order=letzter_lauf.asc.nullsfirst&limit=500");
    let n = 0, fehlerN = 0;
    for (const a of liste || []) {
      if (Date.now() - start > ZEITBUDGET_MS) break;
      const r = await laufFuer(a);
      n++; if (!r.ok) fehlerN++;
    }
    return antwort(200, { ok: true, verarbeitet: n, fehler: fehlerN });
  }

  const ich = await benutzer(req);
  if (!ich) return antwort(401, { ok: false, error: "Nicht angemeldet. Bitte in der App anmelden und nochmals versuchen." });
  const aktion = String(body.aktion || "");
  const bestehend = async () => (await rest(`kalender_abos?profile_id=eq.${ich.id}&company_id=eq.${ich.firma}&select=*`))[0] || null;

  if (aktion === "start") {
    const p = urlPruefen(body.url);
    if (!p.ok) return antwort(200, { ok: false, error: p.fehler });
    // erst pruefen, DANN speichern: ein kaputter Link wird nie abgelegt
    try {
      const text = await feedLaden(holen, p.url);
      const g = icsLesen(text, { zone: "Europe/Zurich", fenster: fensterFuer(), privatAus: true });
      if (g.fehler && !/kein lesbarer Termin/.test(g.fehler)) return antwort(200, { ok: false, error: "Unter diesem Link liegt keine lesbare Kalenderdatei. Bitte den Link aus «Kalender veröffentlichen» (ICS) verwenden." });
    } catch (e) { return antwort(200, { ok: false, error: fehlerText(e) }); }
    if (!(await firmaAktiv(ich.firma))) return antwort(200, { ok: false, error: "Die Firma ist nicht aktiv." });
    if (await termineModulAus(ich.firma)) return antwort(200, { ok: false, error: "Das Modul «Termine und Kalender» ist für diese Firma nicht freigeschaltet." });
    let abo = await bestehend();
    const name = String(body.name || "").trim().slice(0, 60) || "Arbeitskalender";
    if (abo) abo = (await rest(`kalender_abos?id=eq.${abo.id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name, host: p.host, status: "verbunden", letzter_lauf: null, letzte_meldung: null }) }))[0];
    else abo = (await rest("kalender_abos", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ company_id: ich.firma, profile_id: ich.id, name, host: p.host }) }))[0];
    await rpc("kalender_abo_url_speichern", { p_abo: abo.id, p_url: p.url });
    return antwort(200, await laufFuer(abo));
  }
  const abo = await bestehend();
  if (aktion === "sync") {
    if (!abo) return antwort(404, { ok: false, error: "Es ist kein Kalender-Abo eingerichtet." });
    return antwort(200, await laufFuer(abo));
  }
  if (aktion === "trennen") {
    if (abo) {
      await rpc("kalender_abo_url_loeschen", { p_abo: abo.id }).catch(() => {});
      await rest(`kalender_abos?id=eq.${abo.id}&company_id=eq.${ich.firma}`, { method: "DELETE" });   // die importierten Termine folgen per CASCADE
    }
    return antwort(200, { ok: true });
  }
  return antwort(400, { ok: false, error: "Unbekannte Aktion." });
});
