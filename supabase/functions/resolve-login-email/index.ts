// ============================================================
// Edge Function "resolve-login-email" (v3.103, neu gefasst v3.311)
//
// Mitarbeiter melden sich mit einem Benutzernamen ("vorname.nachname") an; ihre Auth-E-Mail ist eine interne
// Pseudo-Adresse (siehe usernameToEmail() in js/03-login.js). Seit v3.103 kann ein Mitarbeiter zusaetzlich eine ECHTE
// E-Mail hinterlegen (profiles.email), mit der er sich ebenfalls anmelden darf. Selbst registrierte Firmenadmins haben
// die echte E-Mail als Auth-E-Mail und brauchen diese Funktion NICHT (der Client versucht zuerst die direkte Anmeldung).
//
// BIS v3.310 war das ein oeffentliches NACHSCHLAGEN: Eingabe = echte E-Mail -> Antwort = interne Pseudo-Adresse, bei
// Unbekanntem die Eingabe selbst. Damit liessen sich Konten und interne Benutzernamen abfragen (der alte Kopfkommentar
// "kein Information Leakage" stimmte nicht). Entscheid des Auftraggebers: beide Anmeldewege bleiben.
//
// JETZT: die Funktion gibt NIE eine Adresse heraus. Der Client schickt {login, password}; die Funktion loest intern auf,
// prueft das Passwort bei Supabase Auth (Passwort-Anmeldung mit dem oeffentlichen Schluessel, wie der Browser es auch
// taete) und gibt bei Erfolg die Sitzung zurueck ({ok:true, access_token, refresh_token}), sonst IMMER dasselbe:
// 401 {ok:false}. Bekanntes und unbekanntes Konto, falsches Passwort und fehlende Mitarbeiter-E-Mail sehen gleich aus.
// Zeit: es laufen immer dieselben Schritte (Profil-Suche, Auth-Nachschlagen, Passwortpruefung) - bei Unbekanntem mit
// Platzhaltern.
//
// LIMIT (Tabelle login_aufloesung_versuche, nur Hashes): je IP 30 und je Eingabe 8 Versuche in 10 Minuten -> 429 fuer alle
// gleich (unabhaengig davon, ob das Konto existiert). Faellt die Limit-Pruefung aus, wird NICHT geprueft (503, fail closed).
// GRENZE: die IP stammt aus dem Header der Anfrage (cf-connecting-ip/x-forwarded-for) - hinter dem Supabase-Gateway
// zuverlaessig genug fuer ein Mengenlimit, aber keine harte Garantie; das Limit je Eingabe schuetzt ein einzelnes Konto
// auch bei wechselnden IPs. Supabase Auth hat eigene Limits zusaetzlich.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const EMAIL_DOMAIN = "nfgryuzkpwjfmdlmevuy.supabase.co";
const FENSTER_MINUTEN = 10;
const MAX_JE_IP = 30;
const MAX_JE_EINGABE = 8;
const MAX_LOGIN_LAENGE = 254;
const MAX_PASSWORT_LAENGE = 256;
const PLATZHALTER_ID = "00000000-0000-0000-0000-000000000000";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function antwort(inhalt: unknown, status = 200) {
  return new Response(JSON.stringify(inhalt), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
const ABGELEHNT = () => antwort({ ok: false }, 401);

function restHeaders() {
  return { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
}
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unbekannt";
}

// Zaehlt diesen Versuch und gibt zurueck, ob eines der beiden Limits ueberschritten ist. Wirft bei Fehlern (-> 503).
async function limitUeberschritten(ipHash: string, eingabeHash: string): Promise<boolean> {
  const schluessel = [`ip:${ipHash}`, `login:${eingabeHash}`];
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/login_aufloesung_versuche`, {
    method: "POST",
    headers: { ...restHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(schluessel.map((s) => ({ schluessel: s }))),
  });
  if (!ins.ok) throw new Error("limit-insert");
  const seit = new Date(Date.now() - FENSTER_MINUTEN * 60 * 1000).toISOString();
  const grenzen = [MAX_JE_IP, MAX_JE_EINGABE];
  for (let i = 0; i < schluessel.length; i++) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/login_aufloesung_versuche?schluessel=eq.${encodeURIComponent(schluessel[i])}&created_at=gte.${encodeURIComponent(seit)}&select=id`,
      { headers: restHeaders() },
    );
    if (!res.ok) throw new Error("limit-count");
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error("limit-count");
    if (rows.length > grenzen[i]) return true;
  }
  // Aufraeumen, best effort (alte Zeilen > 1 Tag), nur gelegentlich.
  if (Math.random() < 0.05) {
    const alt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    fetch(`${SUPABASE_URL}/rest/v1/login_aufloesung_versuche?created_at=lt.${encodeURIComponent(alt)}`, {
      method: "DELETE", headers: restHeaders(),
    }).catch(() => {});
  }
  return false;
}

async function profilIdMitEmail(email: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`, { headers: restHeaders() });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] && typeof rows[0].id === "string" ? rows[0].id : null;
}
async function authEmailVonUserId(userId: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers: restHeaders() });
  if (!res.ok) return null;
  const json = await res.json();
  return typeof json?.email === "string" ? json.email : null;
}
async function passwortAnmeldung(email: string, password: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY ?? SUPABASE_SERVICE_ROLE_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    // Nur Codes loggen, die auf einen Fehler der FUNKTION hindeuten (kein Konto-Hinweis, kein Passwort).
    if (res.status !== 400 && res.status !== 401 && res.status !== 422) console.error("resolve-login-email: Auth-Status", res.status);
    return null;
  }
  const json = await res.json();
  if (typeof json?.access_token !== "string" || typeof json?.refresh_token !== "string") return null;
  return { access_token: json.access_token, refresh_token: json.refresh_token };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return antwort({ ok: false }, 405);

  let body: { login?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return antwort({ ok: false }, 400); }
  const login = typeof body?.login === "string" ? body.login.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!login || !password || login.length > MAX_LOGIN_LAENGE || password.length > MAX_PASSWORT_LAENGE) {
    return antwort({ ok: false }, 400);
  }

  try {
    const [ipHash, eingabeHash] = await Promise.all([sha256(clientIp(req)), sha256(login)]);
    if (await limitUeberschritten(ipHash, eingabeHash)) return antwort({ ok: false }, 429);
  } catch (_err) {
    return antwort({ ok: false }, 503); // Limit nicht pruefbar: nichts durchlassen
  }

  try {
    // Immer dieselben drei Schritte, damit Bekanntes/Unbekanntes zeitlich nicht auffaellt.
    let email: string;
    if (login.includes("@")) {
      const id = await profilIdMitEmail(login);
      const auth = await authEmailVonUserId(id ?? PLATZHALTER_ID);
      email = (id && auth) ? auth : `unbekannt-${PLATZHALTER_ID}@${EMAIL_DOMAIN}`;
    } else {
      await profilIdMitEmail(`${login}@platzhalter.invalid`);
      await authEmailVonUserId(PLATZHALTER_ID);
      email = login.replace(/\s+/g, "") + "@" + EMAIL_DOMAIN;
    }
    const sitzung = await passwortAnmeldung(email, password);
    if (!sitzung) return ABGELEHNT();
    return antwort({ ok: true, ...sitzung });
  } catch (_err) {
    console.error("resolve-login-email: unerwarteter Fehler");
    return ABGELEHNT();
  }
});
