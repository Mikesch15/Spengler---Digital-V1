// Supabase Edge Function: outlook-callback (v3.379)
// Rueckkehradresse der Microsoft-Anmeldung (Entra-App). Der Browser kommt hier mit ?code=...&state=... an.
// verify_jwt ist FALSE (Microsoft schickt kein Token); abgesichert ist der Vorgang ueber die EINMAL-Kennung "state" (Tabelle
// outlook_oauth_state, 10 Minuten gueltig, beim Abruf sofort geloescht): sie wurde von outlook-sync nur fuer einen angemeldeten Mitarbeiter ausgestellt
// und enthaelt Firma, Person und die Rueckkehradresse der App. Der Autorisierungscode wird serverseitig gegen Tokens getauscht; das Refresh-Token
// kommt in den Supabase Vault. Nichts davon erscheint in Logs oder in der Weiterleitung.
// WER DIESE DATEI AENDERT, MUSS SIE ERNEUT PER mcp__Supabase__deploy_edge_function VEROEFFENTLICHEN.
const URL_ = Deno.env.get("SUPABASE_URL") || "";
const DIENST = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CLIENT_ID = Deno.env.get("MS_CLIENT_ID") || "77ec4e42-844f-4fe7-9ab8-782a64d114c2";
const CLIENT_SECRET = Deno.env.get("MS_CLIENT_SECRET") || "";
const TENANT = Deno.env.get("MS_TENANT") || "common";
const SCOPE = "offline_access Calendars.ReadWrite User.Read";
const REDIRECT = `${URL_}/functions/v1/outlook-callback`;
const dk = { apikey: DIENST, Authorization: `Bearer ${DIENST}`, "Content-Type": "application/json" };

const seite = (text: string) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Outlook</title><body style="font-family:system-ui;padding:24px;max-width:480px;margin:auto"><h2>Outlook-Verbindung</h2><p>${text}</p>`, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
const zurueck = (rueck: string, ergebnis: string) => new Response(null, { status: 302, headers: { Location: rueck + "?outlook=" + ergebnis, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("Nur GET.", { status: 405 });
  const q = new URL(req.url).searchParams;
  const state = q.get("state") || "";
  if (!/^[a-f0-9]{64}$/.test(state) || !URL_ || !DIENST) return seite("Ungültiger oder abgelaufener Anmeldevorgang. Bitte in der App nochmals „Mit Outlook verbinden“ tippen.");
  // Einmal-Kennung holen UND sofort verbrauchen
  let st: { company_id: string; profile_id: string; rueck: string; expires_at: string } | null = null;
  try {
    const r = await fetch(`${URL_}/rest/v1/outlook_oauth_state?nonce=eq.${state}`, { method: "DELETE", headers: { ...dk, Prefer: "return=representation" }, signal: AbortSignal.timeout(15000) });
    st = r.ok ? ((await r.json())[0] || null) : null;
  } catch { st = null; }
  if (!st || new Date(st.expires_at).getTime() < Date.now()) return seite("Ungültiger oder abgelaufener Anmeldevorgang. Bitte in der App nochmals „Mit Outlook verbinden“ tippen.");
  if (q.get("error") || !q.get("code") || !CLIENT_SECRET) return zurueck(st.rueck, "fehler");
  try {
    const t = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(20000),
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "authorization_code", code: q.get("code")!, redirect_uri: REDIRECT, scope: SCOPE }),
    });
    const j = await t.json().catch(() => ({}));
    if (!t.ok || !j.access_token || !j.refresh_token) { console.error("outlook callback token", t.status, j.error || ""); return zurueck(st.rueck, "fehler"); }
    const gk = { Authorization: `Bearer ${j.access_token}` };
    const me = await (await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", { headers: gk, signal: AbortSignal.timeout(15000) })).json().catch(() => ({}));
    const kal = await (await fetch("https://graph.microsoft.com/v1.0/me/calendar?$select=id", { headers: gk, signal: AbortSignal.timeout(15000) })).json().catch(() => ({}));
    if (!kal.id) return zurueck(st.rueck, "fehler");
    // Token zuerst, dann Verbindung (ohne Token waere die Verbindung nutzlos)
    const rt = await fetch(`${URL_}/rest/v1/rpc/outlook_token_speichern`, { method: "POST", headers: dk, body: JSON.stringify({ p_profil: st.profile_id, p_token: j.refresh_token }), signal: AbortSignal.timeout(15000) });
    if (!rt.ok) return zurueck(st.rueck, "fehler");
    const up = await fetch(`${URL_}/rest/v1/outlook_verbindungen?on_conflict=profile_id`, {
      method: "POST", headers: { ...dk, Prefer: "resolution=merge-duplicates,return=minimal" }, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ company_id: st.company_id, profile_id: st.profile_id, ms_konto: String(me.mail || me.userPrincipalName || "").slice(0, 200) || null,
        kalender_id: kal.id, status: "verbunden", letzte_meldung: null, letzter_lauf: null }),
    });
    if (!up.ok) return zurueck(st.rueck, "fehler");
    return zurueck(st.rueck, "ok");
  } catch (e) {
    console.error("outlook callback", (e as Error).name);
    return zurueck(st.rueck, "fehler");
  }
});
