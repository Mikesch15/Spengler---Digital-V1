// Edge Function "smart-action": legt einen Mitarbeiter (Auth-Konto + Profil) fuer die Firma des aufrufenden
// Administrators an. Laeuft mit dem service_role-Schluessel (umgeht RLS bewusst, um firmenuebergreifend eindeutige
// Benutzernamen zu pruefen) und prueft deshalb selbst: angemeldet, Rolle admin, Firma aktiv.
//
// v3.316 (Audit): (1) Das Startpasswort war fuer jedes neue Konto vorhersagbar ("Rinnen_" + Initialen). Wer den
// Benutzernamen (vorname.nachname) kannte, konnte es erraten, solange die Person es nicht geaendert hatte. Jetzt
// zufaellig ("Start-" + 8 Zeichen, wie bei register-company). Die App zeigt dem Administrator das Passwort aus der
// Antwort an - das Format ist ihr gleichgueltig. (2) Die Zugangsdaten-Mail geht wie bei den anderen Funktionen ueber
// Gmail (SMTP) mit Rueckfall auf Resend; der Resend-Testabsender erreicht sonst nur die Kontoadresse.
// Bestehende Konten werden NICHT veraendert.

type CreateEmployeeBody = {
  first_name: string;
  last_name: string;
  email?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const EMAIL_DOMAIN = "nfgryuzkpwjfmdlmevuy.supabase.co";
const VON = "Spengler-DIGITAL <onboarding@resend.dev>";
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
function clean(s: unknown) { return typeof s === "string" ? s.trim() : ""; }
function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function htmlEsc(t: string) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

// Wandelt einen einzelnen Namensteil (Vor- oder Nachname) in ein sicheres,
// rein aus a-z bestehendes Segment fuer Benutzername/E-Mail um. Deutsche
// Umlaute/ß werden bewusst lesbar transliteriert statt entfernt (Mueller
// bleibt erkennbar, anders als bei blossem Wegfiltern). Leerzeichen,
// Bindestriche, Apostrophe etc. fallen weg ("von der Heide" -> "vonderheide").
function toNamePart(s: string): string {
  let r = clean(s);
  r = r
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
  r = r.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  r = r.toLowerCase().replace(/[^a-z]/g, "");
  return r;
}
function initialsFromNames(first: string, last: string) { return `${(first[0] ?? "").toUpperCase()}${(last[0] ?? "").toUpperCase()}`; }
// Dasselbe Muster wie generiertesPasswort() in register-company und neuesStartpasswort() im Frontend.
function generiertesPasswort(): string {
  const zeichen = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  const zufall = new Uint32Array(8);
  crypto.getRandomValues(zufall);
  let p = "";
  for (let i = 0; i < 8; i++) p += zeichen[zufall[i] % zeichen.length];
  return "Start-" + p;
}

class AlreadyRegisteredError extends Error {}

async function adminCreateAuthUser(params: { email: string; password: string; user_metadata: Record<string, unknown> }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ email: params.email, password: params.password, email_confirm: true, user_metadata: params.user_metadata }),
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 422 || /already.*registered|already.*exists/i.test(text)) {
      throw new AlreadyRegisteredError("Auth user already exists");
    }
    throw new Error(`Auth user creation failed (Status ${res.status})`);
  }
  return JSON.parse(text) as { id: string };
}
async function adminDeleteAuthUser(userId: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) console.error("Failed to delete auth user during rollback, Status", res.status);
}
async function getCaller(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: auth } });
  if (!res.ok) return null;
  return await res.json() as { id: string };
}
async function getCallerProfile(userId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,company_id`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}
async function emailBereitsVergeben(email: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return false;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}
// Versand bevorzugt ueber Gmail (SMTP, Secrets GMAIL_USER + GMAIL_APP_PASSWORD), sonst/bei Fehler Resend.
// Wurde die Mail von Gmail ANGENOMMEN (send() ohne Fehler), gilt sie als verschickt - ein spaeterer Fehler beim
// Schliessen der Verbindung loest KEINEN zweiten Versand ueber Resend aus (sonst kaeme sie doppelt an).
async function zugangsdatenMailen(email: string, username: string, password: string) {
  const html = `
    <p>Für dich wurde ein Konto in Spengler-DIGITAL angelegt.</p>
    <p>Benutzername: <b>${htmlEsc(username)}</b><br>Passwort: <b>${htmlEsc(password)}</b></p>
    <p>Anmelden kannst du dich mit dem Benutzernamen ODER dieser E-Mail-Adresse.
    Bitte nach der ersten Anmeldung ein eigenes Passwort vergeben.</p>
  `;
  const betreff = "Spengler-DIGITAL: deine Zugangsdaten";
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (gmailUser && gmailPass) {
    let client: { send: (m: Record<string, unknown>) => Promise<void>; close: () => Promise<void> } | null = null;
    try {
      const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
      client = new SMTPClient({
        connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: gmailUser, password: gmailPass.replace(/\s+/g, "") } },
      });
      await client!.send({ from: `Spengler-DIGITAL <${gmailUser}>`, to: email, subject: betreff, html });
    } catch (err) {
      console.error("smart-action: Gmail-Versand fehlgeschlagen", String((err as Error)?.message ?? err).slice(0, 200));
      client = null;
    }
    if (client) {
      try { await client.close(); } catch { /* Mail ist angenommen - Fehler beim Schliessen ist egal */ }
      return true;
    }
  }
  if (!RESEND_API_KEY) { console.error("smart-action: kein Mailversand eingerichtet (weder Gmail noch Resend)"); return false; }
  const mail = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: VON, to: [email], subject: betreff, html }),
  });
  if (!mail.ok) { console.error("smart-action: Resend fehlgeschlagen, Status", mail.status); return false; }
  return true;
}
async function createProfile(params: { userId: string; firstName: string; lastName: string; initials: string; companyId: string; email: string | null }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Prefer: "return=representation" },
    body: JSON.stringify({ id: params.userId, first_name: params.firstName, last_name: params.lastName, initials: params.initials, role: "employee", company_id: params.companyId, email: params.email }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Profile creation failed (Status ${res.status})`);
  return JSON.parse(text);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const caller = await getCaller(req);
    if (!caller?.id) return jsonResponse({ error: "Nicht angemeldet." }, 401);
    const callerProfile = await getCallerProfile(caller.id);
    if (!callerProfile || callerProfile.role !== "admin") return jsonResponse({ error: "Nur Administratoren dürfen Mitarbeiter anlegen." }, 403);
    if (!callerProfile.company_id) return jsonResponse({ error: "Dem Administrator ist keine Firma zugeordnet." }, 409);
    if (!(await isCompanyAccessAllowed(callerProfile.company_id))) {
      return jsonResponse({ error: "Der Zugriff für Ihre Firma ist derzeit eingeschränkt (Testphase abgelaufen oder Firma deaktiviert). Bitte wenden Sie sich an den Support." }, 403);
    }

    let body: CreateEmployeeBody;
    try { body = await req.json() as CreateEmployeeBody; } catch { return jsonResponse({ error: "Ungültige Anfrage." }, 400); }
    const firstNameRaw = clean(body.first_name);
    const lastNameRaw = clean(body.last_name);
    if (!firstNameRaw || !lastNameRaw) return jsonResponse({ error: "Vor- und Nachname sind erforderlich." }, 400);

    // E-Mail optional (v3.103) - wird zur echten, zusaetzlichen Login-Adresse
    // (profiles.email, siehe resolve-login-email) und, falls angegeben, fuer
    // den Versand der Zugangsdaten genutzt. Die tatsaechliche Auth-E-Mail des
    // Kontos bleibt weiterhin die Pseudo-Adresse unten - kein Bruch der
    // bestehenden Benutzername-Anmeldung.
    const emailRaw = clean(body.email).toLowerCase();
    if (emailRaw) {
      if (!isValidEmail(emailRaw)) return jsonResponse({ error: "Bitte eine gültige E-Mail-Adresse eingeben, oder das Feld leer lassen." }, 400);
      if (await emailBereitsVergeben(emailRaw)) return jsonResponse({ error: "Diese E-Mail-Adresse ist bereits einem anderen Konto zugeordnet." }, 409);
    }

    const firstPart = toNamePart(firstNameRaw);
    const lastPart = toNamePart(lastNameRaw);
    if (!firstPart || !lastPart) return jsonResponse({ error: "Vor- und Nachname müssen Buchstaben enthalten." }, 400);

    const initials = initialsFromNames(firstNameRaw, lastNameRaw);
    const password = generiertesPasswort();

    // E-Mail/Benutzername sind bei mehreren Firmen dieselbe, gemeinsame
    // Pseudo-Domain (siehe EMAIL_DOMAIN) und damit ueber auth.users hinweg
    // global eindeutig, nicht nur innerhalb einer Firma. adminCreateAuthUser
    // meldet eine Kollision zuverlaessig (422/"already registered") -
    // das allein reicht als Eindeutigkeitspruefung, es gibt keine separate
    // profiles.username-Spalte.
    let createdUserId: string | null = null;
    let usedUsername = "";
    let usedEmail = "";
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const suffix = attempt === 0 ? "" : String(attempt + 1);
      const username = `${firstPart}.${lastPart}${suffix}`;
      const email = `${username}@${EMAIL_DOMAIN}`;
      try {
        const created = await adminCreateAuthUser({
          email,
          password,
          user_metadata: { username, first_name: firstNameRaw, last_name: lastNameRaw, company_id: callerProfile.company_id },
        });
        createdUserId = created.id;
        usedUsername = username;
        usedEmail = email;
        break;
      } catch (err) {
        if (err instanceof AlreadyRegisteredError) continue;
        throw err;
      }
    }

    if (!createdUserId) {
      console.error("smart-action: exhausted username attempts");
      return jsonResponse({ error: "Es konnte kein eindeutiger Benutzername gefunden werden. Bitte Support kontaktieren." }, 409);
    }

    try {
      const profileInsertResult = await createProfile({ userId: createdUserId, firstName: firstNameRaw, lastName: lastNameRaw, initials, companyId: callerProfile.company_id, email: emailRaw || null });
      const profile = Array.isArray(profileInsertResult) ? profileInsertResult[0] : profileInsertResult;
      let mailVersendet = false;
      if (emailRaw) mailVersendet = await zugangsdatenMailen(emailRaw, usedUsername, password);
      return jsonResponse({ ok: true, user: { id: createdUserId, username: usedUsername, email: usedEmail }, username: usedUsername, password, profile, mailVersendet }, 201);
    } catch (err) {
      await adminDeleteAuthUser(createdUserId);
      console.error("smart-action: profile creation failed, rolled back auth user", String((err as Error)?.message ?? err).slice(0, 200));
      return jsonResponse({ error: "Das Mitarbeiterkonto konnte nicht erstellt werden." }, 400);
    }
  } catch (err) {
    console.error("smart-action: unexpected error", String((err as Error)?.message ?? err).slice(0, 200));
    return jsonResponse({ error: "Das Mitarbeiterkonto konnte nicht erstellt werden." }, 400);
  }
});

// Version 2.27: Mitarbeiteranlage ist eine "normale" Firmenfunktion und muss
// deshalb bei abgelaufenem Trial/deaktivierter Firma gesperrt sein - diese
// Funktion laeuft komplett mit dem Service-Role-Key (umgeht RLS bewusst,
// um firmenuebergreifend eindeutige Benutzernamen zu pruefen), daher greift
// die zentrale my_company_id()-Sperre (siehe CLAUDE.md 34) hier NICHT von
// selbst - die Pruefung muss deshalb hier explizit erfolgen. Spiegelt exakt
// dieselbe Regel wie my_company_id()/is_company_access_allowed() in der
// Datenbank: aktiv, oder Trial noch nicht abgelaufen.
async function isCompanyAccessAllowed(companyId: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${encodeURIComponent(companyId)}&select=subscription_status,trial_ends_at`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return false;
  const rows = await res.json();
  const c = Array.isArray(rows) ? rows[0] : null;
  if (!c) return false;
  if (c.subscription_status === "active") return true;
  if (c.subscription_status === "trial" && c.trial_ends_at && new Date(c.trial_ends_at).getTime() > Date.now()) return true;
  return false;
}
