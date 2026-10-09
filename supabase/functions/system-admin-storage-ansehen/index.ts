// System-Admin: eine verwaiste Storage-Datei ANSEHEN (nur lesen).
//
// Warum es diese Funktion braucht: die Storage-Policy "tenant read own storage
// files" laesst nur Dateien einer EIGENEN Firma lesen (storage_object_is_own_
// company). Eine verwaiste Datei - auf die keine Datenbankzeile mehr zeigt -
// kann deshalb vom Client aus niemand ansehen, auch kein System-Administrator.
// Diese Funktion stellt einen kurzlebigen Link aus (5 Minuten).
//
// Bewusst eine EIGENE Funktion neben system-admin-storage-aufraeumen: sie kann
// ausschliesslich lesen. Das Loeschen bleibt, wo es war.
//
// Sicherheit, dieselben zwei Ebenen wie dort:
//   1. Der echte Aufrufer (JWT -> /auth/v1/user) muss in system_admins stehen.
//   2. Der Pfad kommt zwar vom Client, wird aber gegen
//      system_admin_verwaiste_storage() geprueft, aufgerufen MIT dem Nutzer-JWT
//      (sonst waere auth.uid() NULL). Eine Datei, die die Datenbank nicht als
//      verwaist meldet - also jede, die irgendeine Firma noch braucht - bekommt
//      keinen Link, egal was der Client schickt.

type Body = { pfad?: unknown };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const BUCKET = "measurements";
const GUELTIG_SEKUNDEN = 300;
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
    try { body = await req.json() as Body; } catch { /* leer */ }
    const pfad = typeof body.pfad === "string" ? body.pfad : "";
    if (!pfad) return jsonResponse({ error: "Kein Pfad angegeben." }, 400);

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
      console.error("system-admin-storage-ansehen: RPC fehlgeschlagen:", rpcText);
      return jsonResponse({ error: "Die Liste der verwaisten Dateien konnte nicht gelesen werden." }, 500);
    }
    let verwaist: string[] = [];
    try {
      const rows = JSON.parse(rpcText);
      if (Array.isArray(rows)) verwaist = rows.map((r: { pfad?: string }) => r.pfad || "").filter(Boolean);
    } catch {
      return jsonResponse({ error: "Die Liste der verwaisten Dateien war unlesbar." }, 500);
    }
    if (verwaist.indexOf(pfad) < 0) {
      return jsonResponse({ error: "Diese Datei ist nicht (mehr) als verwaist bekannt." }, 404);
    }

    const kodiert = pfad.split("/").map(encodeURIComponent).join("/");
    const sig = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${kodiert}`, {
      method: "POST",
      headers: { ...svcHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: GUELTIG_SEKUNDEN }),
    });
    const sigText = await sig.text();
    if (!sig.ok) {
      console.error("system-admin-storage-ansehen: Link fehlgeschlagen:", sigText);
      return jsonResponse({ error: "Für diese Datei konnte kein Link erstellt werden." }, 500);
    }
    let rel = "";
    try { rel = (JSON.parse(sigText) as { signedURL?: string }).signedURL || ""; } catch { /* leer */ }
    if (!rel) return jsonResponse({ error: "Für diese Datei konnte kein Link erstellt werden." }, 500);

    // signedURL kommt relativ zu /storage/v1 ("/object/sign/...?token=...").
    return jsonResponse({ ok: true, url: `${SUPABASE_URL}/storage/v1${rel}`, pfad, gueltigSekunden: GUELTIG_SEKUNDEN });
  } catch (err) {
    console.error("system-admin-storage-ansehen: unerwarteter Fehler", err);
    return jsonResponse({ error: "Beim Ansehen ist ein unerwarteter Fehler aufgetreten." }, 500);
  }
});
