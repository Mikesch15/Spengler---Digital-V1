// Firmenregistrierung: legt einen neuen Auth-User, eine neue Firma (30 Tage
// Trial) und dessen Admin-Profil an. Laeuft mit dem service_role-Key, der
// niemals ins Frontend darf - deshalb als Edge Function statt direktem
// Client-Insert. Erzeugt bei einem Fehler in einem spaeteren Schritt keine
// Karteileichen: alles bereits Angelegte wird wieder geloescht (Rollback,
// in umgekehrter Reihenfolge).
//
// ZWEI WEGE ZUM AUFRUF (v3.103, vorher nur der erste):
//  1) Ein eingeloggter System-Administrator legt die Firma direkt an
//     (System-Administration -> "Neue Firma registrieren"). Das Passwort
//     wird HIER automatisch erzeugt (wie bei einem neuen Mitarbeiter) und
//     per E-Mail an die angegebene Adresse verschickt - der System-Admin
//     tippt kein Passwort mehr.
//  2) Ein gueltiger, gezielt verschickter Einladungslink (company_invites,
//     System-Administration -> "Einladungslink erzeugen") wird eingeloest.
//     Hier waehlt die Person ihr Passwort selbst im Formular (Selfservice,
//     wie eine gewoehnliche Registrierung) - keine automatische E-Mail
//     noetig, die Person hat ihr Passwort ja gerade selbst gesehen.
// Faellt beides weg (kein System-Admin, kein gueltiger Token), wird
// abgelehnt - dieselbe Absicherung wie zuvor, nur um den Einladungsweg
// erweitert statt der alten "nur System-Admin"-Regel weichen zu lassen.
//
// v3.184: Die neue Firma bekommt jetzt STARTWERTE mit (Schritt 4b). Bis
// v3.183 landete sie in einer fertigen App, in der nichts stand - kein
// Material, keine Werkstoffe, keine Rollenbreiten, keine Rinne-Ansetztypen.
// Die Auswahlfelder waren da, sie hatten nur nichts zur Auswahl.

import { WERKSTOFFE, RINNE_TYPEN, BEISPIEL_KATALOG, ROLLENBREITEN, MWST } from "./_startwerte.ts";

type RegisterBody = {
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  invite_token?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const TRIAL_DAYS = 30;
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
function initialsFromNames(first: string, last: string) { return `${(first[0] ?? "").toUpperCase()}${(last[0] ?? "").toUpperCase()}`; }
function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function slugify(name: string) {
  const base = name
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "firma";
}
// Dasselbe Muster wie neuesStartpasswort() im Frontend (js/07-einstellungen.js) -
// hier serverseitig, weil der System-Admin ab v3.103 kein Passwort mehr tippt.
function generiertesPasswort(): string {
  const zeichen = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  const zufall = new Uint32Array(8);
  crypto.getRandomValues(zufall);
  let p = "";
  for (let i = 0; i < 8; i++) p += zeichen[zufall[i] % zeichen.length];
  return "Start-" + p;
}

async function getCaller(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: auth } });
  if (!res.ok) return null;
  return await res.json() as { id: string };
}
async function isSystemAdmin(userId: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/system_admins?user_id=eq.${encodeURIComponent(userId)}&select=user_id&limit=1`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return false;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}
type EinladungsZeile = { id: number; token: string; expires_at: string; used_at: string | null };
async function gueltigeEinladung(token: string): Promise<EinladungsZeile | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/company_invites?token=eq.${encodeURIComponent(token)}&select=id,token,expires_at,used_at&limit=1`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const zeile = Array.isArray(rows) && rows[0] ? rows[0] as EinladungsZeile : null;
  if (!zeile) return null;
  if (zeile.used_at) return null;
  if (new Date(zeile.expires_at).getTime() < Date.now()) return null;
  return zeile;
}
async function einladungEingeloest(id: number, companyId: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/company_invites?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ used_at: new Date().toISOString(), used_by_company_id: companyId }),
  });
}
async function zugangsdatenMailen(email: string, companyName: string, password: string) {
  if (!RESEND_API_KEY) { console.error("register-company: RESEND_API_KEY fehlt - keine Zugangsdaten-Mail moeglich"); return false; }
  const html = `
    <p>Die Firma <b>${companyName}</b> wurde in Spengler-DIGITAL angelegt.</p>
    <p>Login-E-Mail: <b>${email}</b><br>Passwort: <b>${password}</b></p>
    <p>Bitte nach der ersten Anmeldung ein eigenes Passwort vergeben.</p>
  `;
  const mail = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: VON, to: [email], subject: "Spengler-DIGITAL: Zugangsdaten für " + companyName, html }),
  });
  if (!mail.ok) { console.error("register-company: Resend fehlgeschlagen", await mail.text()); return false; }
  return true;
}

async function adminCreateAuthUser(params: { email: string; password: string; user_metadata: Record<string, unknown> }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ email: params.email, password: params.password, email_confirm: true, user_metadata: params.user_metadata }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { const j = JSON.parse(text); msg = j.msg || j.message || j.error_description || text; } catch { /* ignore */ }
    if (/already.*registered|already.*exists|email_exists/i.test(msg)) {
      throw new Error("Diese E-Mail-Adresse ist bereits registriert.");
    }
    throw new Error(`Auth user creation failed: ${msg}`);
  }
  return JSON.parse(text) as { id: string };
}
async function adminDeleteAuthUser(userId: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) console.error("Failed to delete auth user during rollback:", await res.text());
}
// v3.184: nimmt jetzt auch eine LISTE. PostgREST legt dann mehrere Zeilen in
// einem Aufruf an - fuer die Startwerte drei Aufrufe statt einundzwanzig.
// Der Einzelfall bleibt wortgleich wie bisher.
async function restInsert(table: string, body: Record<string, unknown> | Record<string, unknown>[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, data: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}
// v3.184: Gegenstueck zu restInsert - aendert eine bestehende Zeile. Wird
// fuer die Startwerte gebraucht, die NACH der Registrierung dazukommen.
async function restPatch(table: string, column: string, value: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, data: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}
async function restDelete(table: string, column: string, value: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) console.error(`Failed to delete from ${table} during rollback:`, await res.text());
}
function isUniqueViolation(text: string) {
  return /duplicate key|already exists|unique constraint/i.test(text);
}

// ---- v3.184: Startwerte fuer die frische Firma ---------------------------
// WIRFT NIE. Ein Fehlschlag hier darf die Registrierung nicht zurueckrollen:
// eine Firma ohne Startwerte ist genau das, was es bis v3.183 gab - unschoen,
// aber voll funktionsfaehig. Eine Firma, die wegen eines Beispiel-Blechs gar
// nicht erst entsteht, waere der schlechtere Tausch. Deshalb steht der Aufruf
// AUSSERHALB des try/catch mit dem Rollback und faengt selbst ab.
//
// company_id wird ueberall AUSDRUECKLICH mitgegeben. Der Spalten-Vorgabewert
// ist my_company_id(), und der stuetzt sich auf auth.uid() - beim
// service_role-Schluessel gibt es aber keinen angemeldeten Benutzer. Ohne die
// ausdrueckliche Angabe liefe der Vorgabewert ins Leere.
async function startwerteSaeen(companyId: string) {
  const ergebnis = { werkstoffe: 0, rinne: 0, katalog: 0, einstellungen: false, fehler: [] as string[] };
  try {
    // 0. Rollenbreiten und MwSt. Als UPDATE auf die bereits angelegte
    //    app_settings-Zeile, NICHT als Teil ihres Inserts: jener steht unter
    //    dem Rollback, dieser hier nicht mehr. Ohne eine einzige Rollenbreite
    //    kann der Zuschnitt nicht rechnen - aber daran darf die Entstehung
    //    der Firma nicht haengen.
    const sUp = await restPatch("app_settings", "company_id", companyId,
      { blech_rollenbreiten: ROLLENBREITEN, default_vat: MWST });
    if (sUp.ok) ergebnis.einstellungen = true;
    else ergebnis.fehler.push("Rollenbreiten/MwSt: " + sUp.text);

    // 1. Werkstoffe zuerst - ihre Ids werden gleich fuer die Beispiel-Bleche
    //    gebraucht.
    const wIns = await restInsert("measurement_materials",
      WERKSTOFFE.map((w) => ({ ...w, company_id: companyId })));
    const nachSchluessel: Record<string, number> = {};
    if (wIns.ok && Array.isArray(wIns.data)) {
      ergebnis.werkstoffe = wIns.data.length;
      for (const z of wIns.data) {
        if (z && z.legacy_key) nachSchluessel[String(z.legacy_key)] = Number(z.id);
      }
    } else ergebnis.fehler.push("Werkstoffe: " + wIns.text);

    // 2. Rinne-Ansetztypen. Unabhaengig von 1.
    const rIns = await restInsert("rinne_fitting_types",
      RINNE_TYPEN.map((r) => ({ ...r, company_id: companyId })));
    if (rIns.ok && Array.isArray(rIns.data)) ergebnis.rinne = rIns.data.length;
    else ergebnis.fehler.push("Rinne-Ansetztypen: " + rIns.text);

    // 3. Beispiel-Katalog. demo:true ist das Entscheidende - daran erkennt die
    //    App, dass diese Zeilen sich aufloesen duerfen, sobald die Firma ihre
    //    erste eigene Position anlegt oder importiert. Ist Schritt 1
    //    gescheitert, entsteht die Position OHNE Werkstoff; es wird keiner
    //    erfunden, und die Einrichtungs-Checkliste meldet dann genau das.
    const katalog = BEISPIEL_KATALOG.map((bsp) => ({
      edv_nr: bsp.edv_nr,
      name: bsp.name,
      dim: bsp.dim,
      unit: bsp.unit,
      price: 0,
      demo: true,
      company_id: companyId,
      werkstoff_id: bsp.werkstoff ? (nachSchluessel[bsp.werkstoff] ?? null) : null,
      staerke_mm: bsp.staerke_mm,
      ausfuehrung: bsp.ausfuehrung,
      form: bsp.form,
    }));
    const kIns = await restInsert("materials", katalog);
    if (kIns.ok && Array.isArray(kIns.data)) ergebnis.katalog = kIns.data.length;
    else ergebnis.fehler.push("Beispiel-Katalog: " + kIns.text);
  } catch (err) {
    ergebnis.fehler.push(err instanceof Error ? err.message : String(err));
  }
  if (ergebnis.fehler.length) console.error("register-company: Startwerte unvollstaendig", ergebnis.fehler);
  return ergebnis;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: RegisterBody;
  try { body = await req.json() as RegisterBody; } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }

  // Zugangsweg klaeren: entweder eingeloggter System-Admin ODER ein
  // gueltiger, noch nicht verwendeter Einladungstoken (v3.103).
  const caller = await getCaller(req);
  const alsSystemAdmin = !!(caller?.id && await isSystemAdmin(caller.id));
  let einladung: EinladungsZeile | null = null;
  if (!alsSystemAdmin) {
    const token = clean(body.invite_token);
    if (!token) return jsonResponse({ error: caller?.id ? "Nur für System-Administratoren." : "Nicht angemeldet." }, 403);
    einladung = await gueltigeEinladung(token);
    if (!einladung) return jsonResponse({ error: "Dieser Einladungslink ist ungültig oder abgelaufen." }, 400);
  }

  const companyName = clean(body.company_name);
  const firstName = clean(body.first_name);
  const lastName = clean(body.last_name);
  const email = clean(body.email).toLowerCase();
  // System-Admin-Weg: Passwort wird automatisch erzeugt (siehe Kopfkommentar).
  // Einladungs-Weg: die Person waehlt ihr eigenes Passwort im Formular.
  const password = alsSystemAdmin ? generiertesPasswort() : (typeof body.password === "string" ? body.password : "");

  if (!companyName) return jsonResponse({ error: "Bitte einen Firmennamen eingeben." }, 400);
  if (!firstName || !lastName) return jsonResponse({ error: "Bitte Vor- und Nachname eingeben." }, 400);
  if (!isValidEmail(email)) return jsonResponse({ error: "Bitte eine gültige E-Mail-Adresse eingeben." }, 400);
  if (password.length < 8) return jsonResponse({ error: "Das Passwort muss mindestens 8 Zeichen haben." }, 400);

  let createdUserId: string | null = null;
  let createdCompanyId: string | null = null;
  let profileCreated = false;
  let settingsCreated = false;
  try {
    // 1. Auth-User – Basis für alles Weitere (company.created_by, profiles.id).
    const created = await adminCreateAuthUser({
      email, password,
      user_metadata: { first_name: firstName, last_name: lastName, company_name: companyName },
    });
    createdUserId = created.id;

    // 2. Firma anlegen. Der Slug muss eindeutig sein; bei einem Namenskonflikt
    //    (z. B. zwei "Muster AG") wird ein Zähler angehängt statt abzubrechen.
    const baseSlug = slugify(companyName);
    const now = new Date();
    const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    let companyRow: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const trySlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const ins = await restInsert("companies", {
        name: companyName,
        slug: trySlug,
        created_by: createdUserId,
        subscription_status: "trial",
        trial_days: TRIAL_DAYS,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      });
      if (ins.ok) { companyRow = Array.isArray(ins.data) ? ins.data[0] : ins.data; break; }
      if (ins.status === 409 || isUniqueViolation(ins.text)) continue; // Slug-Kollision: nächster Versuch
      throw new Error(`Company creation failed: ${ins.text}`);
    }
    if (!companyRow) throw new Error("Konnte keinen eindeutigen Firmen-Slug erzeugen.");
    createdCompanyId = companyRow.id as string;

    // 3. Admin-Profil – company_id kommt ausschliesslich von hier (Server),
    //    nie vom Client. passwort_gesetzt: beim Einladungs-Weg hat die Person
    //    ihr Passwort gerade selbst gewaehlt (true); beim System-Admin-Weg
    //    ist es ein generiertes Startpasswort, das beim ersten Login ersetzt
    //    werden sollte (false) - dieselbe Regel wie bei einem neu angelegten
    //    Mitarbeiter. profiles.email = die echte Auth-E-Mail (v3.103) - fuer
    //    resolve-login-email/password-reset dieselbe Quelle wie bei einem
    //    Mitarbeiter mit hinterlegter E-Mail.
    const profileIns = await restInsert("profiles", {
      id: createdUserId, first_name: firstName, last_name: lastName,
      initials: initialsFromNames(firstName, lastName),
      role: "admin", company_id: createdCompanyId, email,
      passwort_gesetzt: !alsSystemAdmin,
    });
    if (!profileIns.ok) throw new Error(`Profile creation failed: ${profileIns.text}`);
    profileCreated = true;

    // 4. Eigene app_settings-Zeile, direkt mit dem Firmennamen vorbefüllt –
    //    sonst sähe die neue Firma bis zur ersten manuellen Änderung den
    //    Namen/Standardwerte irgendeiner anderen Firma nicht, sondern gar
    //    nichts (RLS zeigt ohnehin nur die eigene Zeile).
    //    v3.184: Rollenbreiten und MwSt kommen BEWUSST NICHT hier dazu,
    //    sondern erst in Schritt 7. Dieser Insert steht unter dem Rollback:
    //    schlaegt er fehl, entsteht die Firma gar nicht. Ein zusaetzliches
    //    Feld hier waere ein neues Risiko fuer die Registrierung selbst -
    //    und das fuer einen blossen Komfortwert.
    const settingsIns = await restInsert("app_settings", {
      company_id: createdCompanyId,
      company_name: companyName,
    });
    if (!settingsIns.ok) throw new Error(`Company settings creation failed: ${settingsIns.text}`);
    settingsCreated = true;

    // 5. Einladung als eingeloest markieren (best effort - ein Fehlschlag
    //    hier reisst die bereits erfolgreiche Registrierung nicht wieder ein).
    if (einladung) await einladungEingeloest(einladung.id, createdCompanyId);

    // 6. Zugangsdaten-Mail nur beim System-Admin-Weg (siehe Kopfkommentar) -
    //    best effort, ein Mail-Fehlschlag laesst die Registrierung stehen.
    let mailVersendet = false;
    if (alsSystemAdmin) mailVersendet = await zugangsdatenMailen(email, companyName, password);

    // 7. Startwerte (v3.184). BEWUSST als letzter Schritt und bewusst
    //    ausserhalb jeder Abbruchbedingung: ab hier ist die Firma fertig und
    //    anmeldbar. Was hier noch dazukommt, ist Komfort - es darf das
    //    Ergebnis nicht mehr gefaehrden.
    // Doppelt abgesichert: startwerteSaeen() faengt bereits alles selbst ab,
    // aber der AUFRUF steht hier innerhalb des try mit dem Rollback. Wuerde
    // er wider Erwarten doch werfen, wuerde die fertige Firma wieder
    // geloescht - wegen eines Beispiel-Blechs. Das darf nicht passieren, und
    // es soll hier sichtbar stehen statt vom Innenleben einer anderen
    // Funktion abzuhaengen.
    let startwerte: Awaited<ReturnType<typeof startwerteSaeen>> = {
      werkstoffe: 0, rinne: 0, katalog: 0, einstellungen: false,
      fehler: ["Startwerte nicht ausgefuehrt"],
    };
    try {
      startwerte = await startwerteSaeen(createdCompanyId);
    } catch (startFehler) {
      console.error("register-company: Startwerte uebersprungen", startFehler);
    }

    return jsonResponse({
      ok: true,
      company: { id: createdCompanyId, name: companyName, slug: companyRow.slug },
      user: { id: createdUserId, email },
      mailVersendet,
      startwerte,
      passwort: alsSystemAdmin ? password : undefined,
    }, 201);
  } catch (err) {
    // Rollback: erst Zeilen, die auf companies.id verweisen, dann die
    // Firma selbst, zuletzt den Auth-User (best effort).
    if (settingsCreated && createdCompanyId) await restDelete("app_settings", "company_id", createdCompanyId);
    if (profileCreated && createdUserId) await restDelete("profiles", "id", createdUserId);
    if (createdCompanyId) await restDelete("companies", "id", createdCompanyId);
    if (createdUserId) await adminDeleteAuthUser(createdUserId);
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 400);
  }
});
