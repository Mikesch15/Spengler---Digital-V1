// Supabase Edge Function: wetter-meteoschweiz (v3.374)
//
// Liefert der App die Tagesvorhersage (5+ Tage) fuer den Firmenstandort aus den OFFENEN Daten von MeteoSchweiz
// (Open Government Data, frei nutzbar auch kommerziell, Quellenangabe erforderlich). Kein Schluessel noetig.
//
// WARUM EINE FUNKTION: Die Dateien enthalten alle ~5600 Orte in einer Datei; die Tagesdateien sind rund 1,3 MB, die
// Ortsliste 0,8 MB. Das gehoert nicht auf ein Handy. Die Funktion holt sie, liest NUR den Ort der Postleitzahl heraus und
// speichert das kleine Ergebnis zwischen (Tabelle wetter_cache, nur fuer diese Funktion lesbar).
//
// SICHERHEIT (wie extract-offer-positions v26): verify_jwt ist true UND die Funktion prueft selbst, dass die Person zu einer
// Firma mit aktivem Konto gehoert (public.my_company_id() mit GENAU diesem Token). Der Client schickt KEINE Parameter:
// Postleitzahl und "Wetter eingeschaltet" liest die Funktion aus den Firmeneinstellungen der Person (RLS). Damit ist sie kein
// offener Proxy. Der Zwischenspeicher gilt je Postleitzahl (oeffentliche Wetterdaten, keine Firmendaten).
//
// WER DIESE DATEI AENDERT, MUSS SIE ERNEUT PER mcp__Supabase__deploy_edge_function VEROEFFENTLICHEN (mit parser.js).
import { holeVorhersage, plzAusAdresse } from "./parser.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const ZWISCHENSPEICHER_MS = 3 * 3600 * 1000;   // die Quelle aktualisiert stuendlich; Tageswerte aendern sich langsam

function antwort(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return antwort(405, { ok: false, error: "Nur POST." });

  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "");
  const token = m ? m[1].trim() : "";
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const dienst = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token) return antwort(401, { ok: false, error: "Nicht angemeldet. Bitte in der App anmelden und nochmals versuchen." });
  if (!url || !anon || !dienst) return antwort(500, { ok: false, error: "Serverkonfiguration unvollständig." });

  // 1. Wer ruft auf? Aktive Firma mit genau diesem Token.
  const kopf = { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  try {
    const r = await fetch(`${url}/rest/v1/rpc/my_company_id`, { method: "POST", headers: kopf, body: "{}", signal: AbortSignal.timeout(10000) });
    if (r.status >= 400 && r.status < 500) return antwort(401, { ok: false, error: "Die Anmeldung ist abgelaufen oder ungültig. Bitte die App neu laden." });
    if (!r.ok) return antwort(503, { ok: false, error: "Die Anmeldung konnte gerade nicht geprüft werden." });
    if (!(await r.json().catch(() => null))) return antwort(403, { ok: false, error: "Kein aktives Firmenkonto." });
  } catch {
    return antwort(503, { ok: false, error: "Die Anmeldung konnte gerade nicht geprüft werden." });
  }

  // 2. Firmeneinstellungen (RLS: nur die eigene Firma): eingeschaltet? Postleitzahl aus der Firmenadresse?
  let einst: { company_address?: string; wetter_aktiv?: boolean } | null = null;
  try {
    const r = await fetch(`${url}/rest/v1/app_settings?select=company_address,wetter_aktiv&limit=1`, { headers: kopf, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return antwort(503, { ok: false, error: "Die Firmeneinstellungen konnten nicht gelesen werden." });
    einst = (await r.json())[0] || null;
  } catch {
    return antwort(503, { ok: false, error: "Die Firmeneinstellungen konnten nicht gelesen werden." });
  }
  if (!einst || !einst.wetter_aktiv) return antwort(409, { ok: false, code: "aus", error: "Das Wetter ist in den Einstellungen ausgeschaltet." });
  const plz = plzAusAdresse(einst.company_address);
  if (!plz) return antwort(422, { ok: false, code: "keine_plz", error: "In der Firmenadresse steht keine vierstellige Postleitzahl. Bitte in den Einstellungen ergänzen." });

  // 3. Zwischenspeicher (nur diese Funktion darf ihn lesen/schreiben)
  const dk = { apikey: dienst, Authorization: `Bearer ${dienst}`, "Content-Type": "application/json" };
  let alt: { stand: string; daten: unknown } | null = null;
  try {
    const r = await fetch(`${url}/rest/v1/wetter_cache?select=stand,daten&plz=eq.${plz}&limit=1`, { headers: dk, signal: AbortSignal.timeout(8000) });
    if (r.ok) alt = (await r.json())[0] || null;
  } catch { /* ohne Zwischenspeicher weiter */ }
  if (alt && Date.now() - new Date(alt.stand).getTime() < ZWISCHENSPEICHER_MS) {
    return antwort(200, { ok: true, quelle: "MeteoSchweiz", plz, zwischengespeichert: true, ...(alt.daten as object) });
  }

  // 4. Frisch holen
  try {
    const v = await holeVorhersage({
      plz,
      jetzt: new Date(),
      fetchFn: (u: string, o: { method: string }) => fetch(u, { method: o.method, signal: AbortSignal.timeout(25000) }),
    });
    const daten = { ort: v.ort, lauf: v.lauf, tage: v.tage };
    try {
      await fetch(`${url}/rest/v1/wetter_cache?on_conflict=plz`, {
        method: "POST",
        headers: { ...dk, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ plz, stand: new Date().toISOString(), daten }),
        signal: AbortSignal.timeout(8000),
      });
    } catch { /* Zwischenspeichern ist Zugabe */ }
    return antwort(200, { ok: true, quelle: "MeteoSchweiz", plz, zwischengespeichert: false, ...daten });
  } catch (e) {
    // Gibt es einen aelteren Stand, ist er besser als nichts - klar als aelter gekennzeichnet
    if (alt) return antwort(200, { ok: true, quelle: "MeteoSchweiz", plz, zwischengespeichert: true, veraltet: true, ...(alt.daten as object) });
    const code = (e && (e as { code?: string }).code) || "fehler";
    return antwort(code === "kein_ort" ? 422 : 502, { ok: false, code, error: (e as Error).message || "Wetter nicht verfügbar." });
  }
});
