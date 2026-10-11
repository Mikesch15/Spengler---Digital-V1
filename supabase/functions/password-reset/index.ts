// ============================================================
// Edge Function "password-reset" (v3.103, gehaertet v3.310)
//
// Selfservice-Passwort-Reset ueber E-Mail, fuer den nicht angemeldeten
// Login-Bildschirm - deshalb oeffentlich aufrufbar (verify_jwt:false).
// Zwei Aktionen in einer Funktion statt zwei getrennten (dieselbe
// Oekonomie wie in anderen Edge Functions dieser App):
//
//   {action:"request", login}          -> E-Mail mit Reset-Link verschicken
//   {action:"confirm", token, password} -> neues Passwort setzen
//
// "request" antwortet IMMER mit {ok:true}, unabhaengig davon, ob ein
// Konto gefunden wurde - kein Information Leakage darueber, welche
// Benutzernamen/E-Mails existieren (Standard-Verhalten bei einem
// Passwort-vergessen-Formular). Ein Konto OHNE hinterlegte E-Mail
// (reine Benutzername-Konten) bekommt keine Mail - das ist auf dem
// Login-Bildschirm als fester Hinweistext erklaert, nicht ableitbar aus
// dieser Antwort.
//
// Reset-Tokens (password_reset_tokens) sind 30 Minuten gueltig und genau
// einmal einloesbar (used_at wird gesetzt, ein zweiter Versuch mit
// demselben Token schlaegt fehl).
//
// v3.310 (SICHERHEIT, Audit der oeffentlichen Funktionen):
//  1) Der Link in der Mail wurde bis v3.309 aus dem "Origin"-Header der ANFRAGE
//     gebaut. Den kann jeder Nicht-Browser-Client frei setzen: wer
//     "Origin: https://fremd.example" schickt und eine bekannte Mitarbeiter-
//     E-Mail eintraegt, loest eine ECHTE Mail der App aus, deren Link mit
//     gueltigem Token auf die fremde Domain zeigt - klickt die Person, hat der
//     Angreifer das Token und setzt das Passwort. Jetzt wird nur noch eine
//     feste Liste eigener Adressen akzeptiert; jeder andere Origin faellt auf
//     die erste Adresse der Liste zurueck (die Mail geht trotzdem raus, damit
//     die Antwort nichts verraet).
//  2) Hoechstens MAX_TOKEN_PRO_FENSTER Reset-Mails je Konto in
//     FENSTER_MINUTEN - sonst liess sich ein Postfach (und das Resend-
//     Kontingent) beliebig mit Mails fluten. Weitere Anfragen werden still
//     ignoriert und antworten wie immer {ok:true}.
//  3) CORS (v3.311): "Access-Control-Allow-Headers" enthielt nur "authorization, content-type". supabase-js schickt aber
//     immer auch "apikey" und "x-client-info" - der Browser-Preflight scheiterte daher und die POST-Anfrage ging NIE los
//     (in den Logs: OPTIONS ohne POST). Das Formular zeigte trotzdem "Falls ein Konto existiert ...". Ergebnis (aus Code
//     und Logs abgeleitet, nicht mit einem echten Versand belegt): aus dem Browser kam keine Reset-Mail. Jetzt wie bei den anderen Funktionen der App.
// Unveraendert: Antwortformat, Tokenlaufzeit, Einmaligkeit, confirm-Ablauf.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const VON = "Spengler-DIGITAL <onboarding@resend.dev>";
const TOKEN_GUELTIG_MINUTEN = 30;
const FENSTER_MINUTEN = 15;
const MAX_TOKEN_PRO_FENSTER = 3;
// Eigene Adressen der App (nur diese duerfen im Reset-Link stehen).
const ERLAUBTE_ORIGINS = ["https://mikesch15.github.io"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function antwort(inhalt: unknown, status = 200) {
  return new Response(JSON.stringify(inhalt), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function restHeaders() {
  return { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
}
function zufallsToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
function sichererOrigin(angefragt: string): string {
  return ERLAUBTE_ORIGINS.includes(angefragt) ? angefragt : ERLAUBTE_ORIGINS[0];
}

async function profilMitEmail(email: string): Promise<{ id: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`, { headers: restHeaders() });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}
// true, wenn fuer dieses Konto im Zeitfenster schon genug Tokens angelegt wurden.
// Faellt die Abfrage aus, wird NICHT gesendet (fail closed gegen Mail-Flut).
async function zuvieleAnfragen(userId: string): Promise<boolean> {
  const seit = new Date(Date.now() - FENSTER_MINUTEN * 60 * 1000).toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/password_reset_tokens?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(seit)}&select=id`,
    { headers: restHeaders() },
  );
  if (!res.ok) return true;
  const rows = await res.json();
  return !Array.isArray(rows) || rows.length >= MAX_TOKEN_PRO_FENSTER;
}

async function verarbeiteRequest(login: string, origin: string) {
  const eingabe = String(login ?? "").trim().toLowerCase();
  // Ohne "@" ist es ein reiner Benutzername ohne hinterlegte E-Mail -
  // fuer diesen Fall gibt es bewusst keinen Selfservice-Reset (siehe
  // Kopfkommentar). Trotzdem {ok:true} antworten (kein Leck).
  if (!eingabe || !eingabe.includes("@")) return;

  const profil = await profilMitEmail(eingabe);
  if (!profil) return;
  if (await zuvieleAnfragen(profil.id)) return;

  const token = zufallsToken();
  const ablauf = new Date(Date.now() + TOKEN_GUELTIG_MINUTEN * 60 * 1000).toISOString();
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/password_reset_tokens`, {
    method: "POST",
    headers: { ...restHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: profil.id, token, expires_at: ablauf }),
  });
  if (!ins.ok) { console.error("password-reset: Token konnte nicht gespeichert werden", await ins.text()); return; }

  if (!RESEND_API_KEY) { console.error("password-reset: RESEND_API_KEY fehlt - kein Versand moeglich"); return; }
  const link = `${sichererOrigin(origin)}/?reset=${token}`;
  const html = `
    <p>Für dein Spengler-DIGITAL-Konto wurde ein neues Passwort angefordert.</p>
    <p><a href="${link}">Neues Passwort setzen</a></p>
    <p>Der Link ist ${TOKEN_GUELTIG_MINUTEN} Minuten gültig und einmal verwendbar.
    Falls du das nicht warst, kannst du diese E-Mail ignorieren - es ändert
    sich nichts an deinem Konto.</p>
  `;
  const mail = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: VON, to: [eingabe], subject: "Spengler-DIGITAL: Passwort zurücksetzen", html }),
  });
  if (!mail.ok) console.error("password-reset: Resend fehlgeschlagen", await mail.text());
}

async function verarbeiteConfirm(token: string, password: string) {
  if (!token || typeof password !== "string" || password.length < 8) {
    return antwort({ ok: false, error: "Bitte ein Passwort mit mindestens 8 Zeichen eingeben." }, 400);
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/password_reset_tokens?token=eq.${encodeURIComponent(token)}&select=id,user_id,expires_at,used_at&limit=1`, { headers: restHeaders() });
  const rows = res.ok ? await res.json() : [];
  const zeile = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!zeile) return antwort({ ok: false, error: "Dieser Link ist ungültig." }, 400);
  if (zeile.used_at) return antwort({ ok: false, error: "Dieser Link wurde bereits verwendet." }, 400);
  if (new Date(zeile.expires_at).getTime() < Date.now()) return antwort({ ok: false, error: "Dieser Link ist abgelaufen. Bitte einen neuen anfordern." }, 400);

  const setzen = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(zeile.user_id)}`, {
    method: "PUT",
    headers: restHeaders(),
    body: JSON.stringify({ password }),
  });
  if (!setzen.ok) return antwort({ ok: false, error: "Passwort konnte nicht gesetzt werden." }, 400);

  await fetch(`${SUPABASE_URL}/rest/v1/password_reset_tokens?id=eq.${zeile.id}`, {
    method: "PATCH", headers: restHeaders(), body: JSON.stringify({ used_at: new Date().toISOString() }),
  });
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(zeile.user_id)}`, {
    method: "PATCH", headers: restHeaders(), body: JSON.stringify({ passwort_gesetzt: true }),
  });
  return antwort({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return antwort({ ok: false, error: "Method not allowed" }, 405);

  let body: { action?: string; login?: string; token?: string; password?: string };
  try { body = await req.json(); } catch { return antwort({ ok: false, error: "Ungültige Anfrage." }, 400); }

  try {
    if (body.action === "request") {
      const origin = req.headers.get("origin") || "";
      await verarbeiteRequest(String(body.login ?? ""), origin);
      return antwort({ ok: true });
    }
    if (body.action === "confirm") {
      return await verarbeiteConfirm(String(body.token ?? ""), String(body.password ?? ""));
    }
    return antwort({ ok: false, error: "Unbekannte Aktion." }, 400);
  } catch (err) {
    console.error("password-reset: unerwarteter Fehler", err);
    // "request" antwortet auch bei einem unerwarteten Fehler mit ok:true
    // (kein Leck ueber einen Fehlerpfad) - nur "confirm" darf einen echten
    // Fehler zeigen, das Formular braucht die Rueckmeldung.
    if (body.action === "confirm") return antwort({ ok: false, error: "Unerwarteter Fehler." }, 500);
    return antwort({ ok: true });
  }
});
