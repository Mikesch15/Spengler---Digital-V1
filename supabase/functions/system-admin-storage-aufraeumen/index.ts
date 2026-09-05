// System-Admin: verwaiste Storage-Objekte aufraeumen.
//
// Warum es diese Funktion ueberhaupt braucht: storage.objects traegt einen
// Schutz-Trigger (storage.protect_delete), der JEDES direkte SQL-DELETE
// kategorisch verweigert - Loeschungen muessen zwingend ueber die Storage-API
// laufen. Eine SECURITY-DEFINER-Funktion in der Datenbank kann das also nicht
// erledigen, auch nicht mit BYPASSRLS.
//
// Sicherheit, zwei unabhaengige Ebenen (gleiches Muster wie
// system-admin-delete-company):
//   1. Diese Funktion prueft den echten Aufrufer (aus dem mitgesendeten JWT
//      via /auth/v1/user) direkt gegen system_admins - service-role-Abfrage
//      mit expliziter user_id, unabhaengig von auth.uid().
//   2. Die Liste der verwaisten Pfade kommt NICHT vom Client, sondern aus
//      system_admin_verwaiste_storage(), aufgerufen MIT dem echten Nutzer-JWT
//      (sonst waere auth.uid() innerhalb der Funktion NULL und
//      is_system_admin() faelschlich false - der in CLAUDE.md 30.1
//      dokumentierte Fehler).
//
// Der Client darf hoechstens sagen, WELCHE der ohnehin verwaisten Pfade weg
// sollen. Ein Pfad, den die Datenbank nicht als verwaist meldet, wird
// ignoriert - eine referenzierte Datei kann darueber also nicht geloescht
// werden, egal was der Client schickt.

type Body = { pfade?: unknown };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const BUCKET = "measurements";
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
const svcHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY!,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

async function getCaller(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: auth },
  });
  if (!res.ok) return null;
  return await res.json() as { id: string };
}
async function isSystemAdmin(userId: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/system_admins?user_id=eq.${encodeURIComponent(userId)}&select=user_id&limit=1`,
    { headers: svcHeaders },
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const callerAuthHeader = req.headers.get("Authorization") || "";
    const caller = await getCaller(req);
    if (!caller?.id) return jsonResponse({ error: "Nicht angemeldet." }, 401);
    if (!(await isSystemAdmin(caller.id))) {
      return jsonResponse({ error: "Nur für System-Administratoren." }, 403);
    }

    let body: Body = {};
    try { body = await req.json() as Body; } catch { /* leerer Rumpf = alle */ }
    const gewuenscht = Array.isArray(body.pfade)
      ? body.pfade.filter((x): x is string => typeof x === "string" && !!x)
      : null;

    // Die massgebliche Liste kommt aus der Datenbank, nicht vom Client.
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/system_admin_verwaiste_storage`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: callerAuthHeader,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const rpcText = await rpc.text();
    if (!rpc.ok) {
      console.error("system-admin-storage-aufraeumen: RPC fehlgeschlagen:", rpcText);
      return jsonResponse({ error: "Die Liste der verwaisten Dateien konnte nicht gelesen werden." }, 500);
    }
    let verwaist: string[] = [];
    try {
      const rows = JSON.parse(rpcText);
      if (Array.isArray(rows)) verwaist = rows.map((r: any) => r.pfad).filter(Boolean);
    } catch {
      return jsonResponse({ error: "Die Liste der verwaisten Dateien war unlesbar." }, 500);
    }

    // Nur loeschen, was die Datenbank selbst als verwaist meldet.
    const zuLoeschen = gewuenscht ? verwaist.filter(p => gewuenscht.indexOf(p) >= 0) : verwaist;
    const uebergangen = gewuenscht ? gewuenscht.filter(p => verwaist.indexOf(p) < 0) : [];

    if (!zuLoeschen.length) {
      return jsonResponse({ ok: true, geloescht: 0, uebergangen, hinweis: "Es gab nichts zu löschen." });
    }

    for (const batch of chunk(zuLoeschen, 100)) {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/remove/${BUCKET}`, {
        method: "POST",
        headers: { ...svcHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: batch }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("system-admin-storage-aufraeumen: Storage-Löschung fehlgeschlagen:", t);
        return jsonResponse({ error: "Die Dateien konnten nicht vollständig entfernt werden." }, 500);
      }
    }

    return jsonResponse({ ok: true, geloescht: zuLoeschen.length, pfade: zuLoeschen, uebergangen });
  } catch (err) {
    console.error("system-admin-storage-aufraeumen: unerwarteter Fehler", err);
    return jsonResponse({ error: "Beim Aufräumen ist ein unerwarteter Fehler aufgetreten." }, 500);
  }
});
