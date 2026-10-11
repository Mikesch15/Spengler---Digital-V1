// Taeglicher, automatischer Check auf verwaiste Storage-Dateien (v3.99).
//
// Wird NICHT von einem Benutzer aufgerufen (verify_jwt bewusst false - es
// gibt hier keinen angemeldeten Benutzer, dessen JWT Supabase pruefen
// koennte), sondern von einem pg_cron-Job ueber pg_net, einmal taeglich.
//
// v3.316 (SICHERHEIT): Das geteilte Geheimnis (x-cron-secret) stand bis v3.315 im Funktionscode UND im Befehl des
// Cron-Jobs. Jetzt liegt es im Supabase Vault (Name "storage_cron_secret", Wert in der Datenbank erzeugt, nirgends
// ausgegeben). Der Cron-Job liest es beim Lauf aus dem Vault; diese Funktion kennt den Wert NICHT, sondern fragt die
// Datenbank ueber public.system_cron_secret_ok(text) (nur service_role), ob das mitgeschickte Geheimnis stimmt.
// Kann die Pruefung nicht stattfinden, wird abgelehnt (fail closed). Rotation: siehe PROJECT_STATE (v3.316).
//
// Findet der Check etwas, wird eine E-Mail ueber Resend verschickt. Findet
// er nichts, passiert nichts - kein taeglicher "alles in Ordnung"-Spam.
// Geloescht wird hier NICHTS automatisch: das bleibt bewusst der manuelle
// Knopf in der Systemadministration (system-admin-storage-aufraeumen), der
// Betreiber entscheidet selbst - siehe CHANGELOG_HISTORIE.md Abschnitt 162.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const BENACHRICHTIGEN_AN = "mik.ledermann@gmail.com";
// Resends eigener Test-Absender - funktioniert ohne eigene verifizierte
// Domain, sendet aber nur an die beim Resend-Konto selbst hinterlegte
// E-Mail-Adresse. Sobald eine eigene Domain verifiziert ist, hier durch
// eine eigene Absenderadresse ersetzen.
const VON = "Spengler-DIGITAL <onboarding@resend.dev>";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
function groesseText(bytes: number): string {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " B";
}
function htmlEsc(t: string) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

// true nur, wenn die Datenbank das Geheimnis bestaetigt. Jeder Fehler -> false (fail closed).
async function geheimnisStimmt(req: Request): Promise<boolean> {
  const gegeben = req.headers.get("x-cron-secret") || "";
  if (!gegeben || gegeben.length > 200) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/system_cron_secret_ok`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_secret: gegeben }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return false;
    return (await res.json()) === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  if (!(await geheimnisStimmt(req))) {
    return jsonResponse({ error: "Nicht autorisiert." }, 401);
  }

  try {
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/system_cron_verwaiste_storage`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!rpc.ok) {
      console.error("system-admin-storage-cron: RPC fehlgeschlagen, Status", rpc.status);
      return jsonResponse({ error: "Liste konnte nicht gelesen werden." }, 500);
    }
    const zeilen = await rpc.json() as Array<{ pfad: string; groesse_bytes: number; erstellt: string; kategorie: string }>;

    if (!Array.isArray(zeilen) || zeilen.length === 0) {
      return jsonResponse({ ok: true, gefunden: 0, mailVersendet: false });
    }

    const summe = zeilen.reduce((s, z) => s + (Number(z.groesse_bytes) || 0), 0);
    const zeigen = zeilen.slice(0, 30);
    const zeilenHtml = zeigen.map(z =>
      `<li>${htmlEsc(z.pfad)} — ${groesseText(Number(z.groesse_bytes) || 0)}</li>`,
    ).join("");
    const mehrText = zeilen.length > zeigen.length
      ? `<p>… und ${zeilen.length - zeigen.length} weitere.</p>` : "";
    const html = `
      <p>Die automatische, tägliche Prüfung hat <b>${zeilen.length}</b> verwaiste
      Datei(en) im Speicher gefunden (zusammen ${groesseText(summe)}).</p>
      <p>Es wurde <b>nichts gelöscht</b> — das entscheidest du selbst in der
      Systemadministration unter „Verwaiste Dateien im Speicher“.</p>
      <ul>${zeilenHtml}</ul>
      ${mehrText}
    `;

    if (!RESEND_API_KEY) {
      console.error("system-admin-storage-cron: RESEND_API_KEY fehlt - Fund nicht per Mail gemeldet:", zeilen.length);
      return jsonResponse({ ok: true, gefunden: zeilen.length, mailVersendet: false, hinweis: "RESEND_API_KEY fehlt" });
    }

    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: VON,
        to: [BENACHRICHTIGEN_AN],
        subject: `Spengler-DIGITAL: ${zeilen.length} verwaiste Datei(en) im Speicher`,
        html,
      }),
    });
    if (!mail.ok) {
      console.error("system-admin-storage-cron: Resend fehlgeschlagen, Status", mail.status);
      return jsonResponse({ ok: true, gefunden: zeilen.length, mailVersendet: false }, 200);
    }

    return jsonResponse({ ok: true, gefunden: zeilen.length, mailVersendet: true });
  } catch (_err) {
    console.error("system-admin-storage-cron: unerwarteter Fehler");
    return jsonResponse({ error: "Unerwarteter Fehler." }, 500);
  }
});
