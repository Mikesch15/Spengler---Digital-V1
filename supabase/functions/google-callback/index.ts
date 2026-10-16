// Supabase Edge Function: google-callback (v3.384)
// Rueckkehradresse der Google-Anmeldung (Google Cloud OAuth-Client "Webanwendung"). Der Browser kommt hier mit ?code=...&state=... an.
// Aufbau und Absicherung wie outlook-callback: verify_jwt FALSE (Google schickt kein Token), abgesichert ueber die EINMAL-Kennung "state"
// (outlook_oauth_state, 10 Minuten, beim Abruf sofort geloescht, Anbieter muss "google" sein). Code-Tausch serverseitig; das Refresh-Token kommt in den
// Supabase Vault (google_token_speichern). Nichts davon erscheint in Logs oder in der Weiterleitung.
// WER DIESE DATEI AENDERT, MUSS SIE ERNEUT PER mcp__Supabase__deploy_edge_function VEROEFFENTLICHEN.
const URL_ = Deno.env.get("SUPABASE_URL") || "";
const DIENST = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const G_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const G_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const REDIRECT = `${URL_}/functions/v1/google-callback`;
const dk = { apikey: DIENST, Authorization: `Bearer ${DIENST}`, "Content-Type": "application/json" };

const seite = (text: string) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google-Kalender</title><body style="font-family:system-ui;padding:24px;max-width:480px;margin:auto"><h2>Google-Kalender</h2><p>${text}</p>`, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
const zurueck = (rueck: string, ergebnis: string) => new Response(null, { status: 302, headers: { Location: rueck + "?google=" + ergebnis, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("Nur GET.", { status: 405 });
  const q = new URL(req.url).searchParams;
  const state = q.get("state") || "";
  if (!/^[a-f0-9]{64}$/.test(state) || !URL_ || !DIENST) return seite("Ungültiger oder abgelaufener Anmeldevorgang. Bitte in der App nochmals „Mit Google verbinden“ tippen.");
  let st: { company_id: string; profile_id: string; rueck: string; expires_at: string; anbieter: string } | null = null;
  try {
    const r = await fetch(`${URL_}/rest/v1/outlook_oauth_state?nonce=eq.${state}`, { method: "DELETE", headers: { ...dk, Prefer: "return=representation" }, signal: AbortSignal.timeout(15000) });
    st = r.ok ? ((await r.json())[0] || null) : null;
  } catch { st = null; }
  if (!st || st.anbieter !== "google" || new Date(st.expires_at).getTime() < Date.now()) return seite("Ungültiger oder abgelaufener Anmeldevorgang. Bitte in der App nochmals „Mit Google verbinden“ tippen.");
  if (q.get("error") || !q.get("code") || !G_ID || !G_SECRET) return zurueck(st.rueck, "fehler");
  try {
    // Es darf nur EINE Kalenderverbindung je Person geben: eine bestehende Outlook-Verbindung wird nie ueberschrieben
    const bst = await fetch(`${URL_}/rest/v1/outlook_verbindungen?profile_id=eq.${st.profile_id}&select=anbieter`, { headers: dk, signal: AbortSignal.timeout(15000) });
    const best = bst.ok ? ((await bst.json())[0] || null) : null;
    if (best && best.anbieter !== "google") return zurueck(st.rueck, "andere");
    const t = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(20000),
      body: new URLSearchParams({ client_id: G_ID, client_secret: G_SECRET, grant_type: "authorization_code", code: q.get("code")!, redirect_uri: REDIRECT }),
    });
    const j = await t.json().catch(() => ({}));
    if (!t.ok || !j.access_token) { console.error("google callback token", t.status, j.error || ""); return zurueck(st.rueck, "fehler"); }
    if (!j.refresh_token) { console.error("google callback ohne Erneuerungs-Token"); return zurueck(st.rueck, "fehler"); }
    // der Kalenderzugriff muss tatsaechlich erteilt sein (Google erlaubt, einzelne Berechtigungen abzuwaehlen)
    if (!String(j.scope || "").includes("auth/calendar.events")) return zurueck(st.rueck, "berechtigung");
    const gk = { Authorization: `Bearer ${j.access_token}` };
    const info = await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: gk, signal: AbortSignal.timeout(15000) })).json().catch(() => ({}));
    const rt = await fetch(`${URL_}/rest/v1/rpc/google_token_speichern`, { method: "POST", headers: dk, body: JSON.stringify({ p_profil: st.profile_id, p_token: j.refresh_token }), signal: AbortSignal.timeout(15000) });
    if (!rt.ok) return zurueck(st.rueck, "fehler");
    const up = await fetch(`${URL_}/rest/v1/outlook_verbindungen?on_conflict=profile_id`, {
      method: "POST", headers: { ...dk, Prefer: "resolution=merge-duplicates,return=minimal" }, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ company_id: st.company_id, profile_id: st.profile_id, anbieter: "google", ms_konto: String(info.email || "").slice(0, 200) || null,
        kalender_id: "primary", import_modus: "alle", status: "verbunden", letzte_meldung: null, letzter_lauf: null }),
    });
    if (!up.ok) return zurueck(st.rueck, "fehler");
    return zurueck(st.rueck, "ok");
  } catch (e) {
    console.error("google callback", (e as Error).name);
    return zurueck(st.rueck, "fehler");
  }
});
