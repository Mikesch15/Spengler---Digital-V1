// System-Admin: vollstaendige, unwiderrufliche Firmenloeschung. Laeuft mit
// dem service_role-Key, der niemals ins Frontend darf. Prueft
// is_system_admin() serverseitig ueber die Person, die den Request stellt
// (aus dem mitgesendeten JWT via /auth/v1/user) - der Client kann
// company_id/confirm_name schicken, aber niemals eine Berechtigung
// vortaeuschen.
//
// (Kopie des deployten Standes, Plattform-Version 7, am 12.10.2026 ins Repo uebernommen - unveraendert. Die
// ausfuehrliche Fehlerhistorie "BUGFIX 1/2" steht in CHANGELOG_HISTORIE.md; hier nur die Kurzfassung:
//  - Der RPC-Aufruf darf KEIN "Prefer: params=single-object" setzen (skalarer uuid-Parameter).
//  - Die SQL-Funktionen (dryrun + echte Loeschung) pruefen is_system_admin() ueber auth.uid(); deshalb laufen
//    GENAU diese beiden Aufrufe mit dem echten, bereits verifizierten Nutzer-JWT statt mit dem Service-Role-Key.
//    Die Edge Function prueft den Aufrufer ausserdem selbst gegen system_admins - zwei unabhaengige Ebenen.)
//
// Ablauf:
//   1. System-Admin-Pruefung (service-role-Tabellenabfrage), Firma laden,
//      Bestaetigungsname EXAKT gegen den aktuellen Firmennamen pruefen
//      (niemals der company_id allein vertrauen).
//   2. Sicherheitsnetz VORAB pruefen (kein System-Admin unter den
//      Firmenmitgliedern), zusaetzlich zur Pruefung in den Funktionen
//      selbst.
//   3. Preflight-Dry-Run der kompletten DB-Loeschsequenz, aufgerufen MIT
//      dem echten Nutzer-JWT - schlaegt er fehl, wird abgebrochen, BEVOR
//      irgendein Storage-Objekt geloescht wird.
//   4. Alle zu diesem Zeitpunkt zur Firma gehoerenden Storage-Pfade aus
//      allen bekannten Spalten ermitteln (app_settings.logo_url,
//      measurements.photo_path/sketch_path/sketch_paths,
//      ausmass.photo_path/photo_paths, project_files.file_path) - inkl.
//      alter, voller URLs aus der Zeit vor der Pfad-Umstellung.
//   5. Storage-Dateien loeschen (Bucket "measurements", nur wenn es
//      ueberhaupt welche gibt). Schlaegt dieser Schritt trotzdem fehl:
//      abbrechen, KEINE Datenbankzeile wird angefasst.
//   6. Erst danach system_admin_delete_company_data(company_id) aufrufen
//      (ebenfalls mit dem echten Nutzer-JWT) - eine einzige SECURITY-
//      DEFINER-Funktion, die den kompletten Datenbank-Teil in EINER
//      impliziten Transaktion erledigt (alles oder nichts).
//   7. Erst danach die Auth-User der Firma ueber die offizielle Admin-API
//      loeschen.
//   8. Verifizieren und einen Bericht zurueckgeben.

type DeleteBody = {
  company_id: string;
  confirm_name: string;
};

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
function clean(s: unknown) { return typeof s === "string" ? s.trim() : ""; }
const svcHeaders = { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };

async function getCaller(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: auth } });
  if (!res.ok) return null;
  return await res.json() as { id: string };
}
async function isSystemAdmin(userId: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/system_admins?user_id=eq.${encodeURIComponent(userId)}&select=user_id&limit=1`, { headers: svcHeaders });
  if (!res.ok) return false;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}
async function restSelect(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svcHeaders });
  const text = await res.text();
  if (!res.ok) throw new Error(`Select failed (${path}): ${text}`);
  return JSON.parse(text);
}
// Ruft eine RPC-Funktion mit genau einem benannten Skalar-Parameter auf -
// bewusst OHNE "Prefer: params=single-object".
// authHeader bestimmt, wessen auth.uid() innerhalb der Funktion gilt -
// service_role fuer normale Datenzugriffe, das echte Nutzer-JWT fuer
// is_system_admin()-abhaengige Funktionen.
async function rpcCall(fn: string, params: Record<string, unknown>, authHeader: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY!, Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text, data: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function idList(ids: (string | number)[]): string {
  return ids.map(id => typeof id === "string" ? `"${id}"` : String(id)).join(",");
}

// Entspricht 1:1 measStoragePathFromValue() im Frontend (js/10-massaufnahme.js),
// nur dass ein data:-Wert hier null liefert (nichts im Storage zu loeschen)
// statt wie im Frontend zur Anzeige durchgereicht zu werden.
function storagePathFromValue(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  if (v.startsWith("data:")) return null;
  const marker = "/object/public/measurements/";
  let i = v.indexOf(marker);
  if (i >= 0) return decodeURIComponent(v.slice(i + marker.length));
  const marker2 = "/object/sign/measurements/";
  i = v.indexOf(marker2);
  if (i >= 0) return decodeURIComponent(v.slice(i + marker2.length).split("?")[0]);
  return v;
}
function collectPaths(target: Set<string>, ...values: unknown[]) {
  for (const v of values) {
    if (Array.isArray(v)) { for (const x of v) { const p = storagePathFromValue(x); if (p) target.add(p); } }
    else { const p = storagePathFromValue(v); if (p) target.add(p); }
  }
}

async function removeStorageObjects(paths: string[]): Promise<void> {
  for (const batch of chunk(paths, 100)) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/remove/${BUCKET}`, {
      method: "POST",
      headers: { ...svcHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: batch }),
    });
    if (!res.ok) throw new Error(`Storage-Löschung fehlgeschlagen: ${await res.text()}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const callerAuthHeader = req.headers.get("Authorization") || "";
    const caller = await getCaller(req);
    if (!caller?.id) return jsonResponse({ error: "Nicht angemeldet." }, 401);
    if (!(await isSystemAdmin(caller.id))) return jsonResponse({ error: "Nur für System-Administratoren." }, 403);

    let body: DeleteBody;
    try { body = await req.json() as DeleteBody; } catch { return jsonResponse({ error: "Ungültige Anfrage." }, 400); }
    const companyId = clean(body.company_id);
    const confirmName = clean(body.confirm_name);
    if (!companyId) return jsonResponse({ error: "Firma nicht angegeben." }, 400);
    if (!confirmName) return jsonResponse({ error: "Bitte den Firmennamen zur Bestätigung eingeben." }, 400);

    // company_id ist NIE alleine ausreichend: Firma serverseitig laden und
    // den Bestaetigungsnamen exakt gegen den aktuellen Namen pruefen.
    const companies = await restSelect(`companies?id=eq.${encodeURIComponent(companyId)}&select=id,name`);
    const company = companies[0];
    if (!company) return jsonResponse({ error: "Firma nicht gefunden." }, 404);
    if (confirmName !== company.name) {
      return jsonResponse({ error: "Der eingegebene Firmenname stimmt nicht exakt mit dem aktuellen Firmennamen überein." }, 400);
    }

    // ---- Alles ermitteln, was zur Firma gehört ---------------------------
    const profiles = await restSelect(`profiles?company_id=eq.${encodeURIComponent(companyId)}&select=id`);
    const profileIds: string[] = profiles.map((p: any) => p.id);

    // ---- Sicherheitsnetz VOR jeder Storage-Löschung prüfen ----------------
    for (const pid of profileIds) {
      if (await isSystemAdmin(pid)) {
        return jsonResponse({ error: "Abbruch: Ein Mitglied dieser Firma ist als System-Administrator eingetragen. Es wurde nichts gelöscht." }, 409);
      }
    }

    // ---- PREFLIGHT: kompletten DB-Löschvorgang testweise durchspielen -----
    // Mit dem echten Nutzer-JWT aufgerufen - sonst sieht is_system_admin()
    // innerhalb der Funktion faelschlich niemanden als eingeloggt an.
    const preflight = await rpcCall("system_admin_delete_company_data_dryrun", { p_company_id: companyId }, callerAuthHeader);
    const preflightOk = !preflight.ok && preflight.data && typeof preflight.data.message === "string" && preflight.data.message.includes("DRYRUN_OK");
    if (!preflightOk) {
      console.error("system-admin-delete-company: Preflight fehlgeschlagen, Storage wird NICHT angefasst:", preflight.text);
      const realReason = preflight.data?.message || preflight.text || "unbekannter Fehler";
      return jsonResponse({ error: "Die Firma kann nicht gelöscht werden (Prüfung vor dem Löschen fehlgeschlagen, es wurde nichts geändert): " + realReason }, 500);
    }

    const projects = await restSelect(`projects?company_id=eq.${encodeURIComponent(companyId)}&select=id`);
    const projectIds: number[] = projects.map((p: any) => p.id);

    let measurementRows: any[] = [], ausmassRows: any[] = [], fileRows: any[] = [];
    for (const idsBatch of chunk(projectIds, 300)) {
      const inFilter = `in.(${idList(idsBatch)})`;
      measurementRows.push(...await restSelect(`measurements?project_id=${inFilter}&select=photo_path,sketch_path,sketch_paths`));
      ausmassRows.push(...await restSelect(`ausmass?project_id=${inFilter}&select=photo_path,photo_paths`));
      fileRows.push(...await restSelect(`project_files?project_id=${inFilter}&select=file_path`));
    }
    const appSettingsRows = await restSelect(`app_settings?company_id=eq.${encodeURIComponent(companyId)}&select=logo_url`);

    const storagePaths = new Set<string>();
    for (const r of appSettingsRows) collectPaths(storagePaths, r.logo_url);
    for (const r of measurementRows) collectPaths(storagePaths, r.photo_path, r.sketch_path, r.sketch_paths);
    for (const r of ausmassRows) collectPaths(storagePaths, r.photo_path, r.photo_paths);
    for (const r of fileRows) collectPaths(storagePaths, r.file_path);
    const storagePathList = Array.from(storagePaths);

    // ---- Storage löschen (nur falls es überhaupt Dateien gibt) -----------
    // Eine Postgres-Transaktion kann diesen Schritt nicht zurückrollen -
    // deshalb vor der echten Datenbankänderung, aber erst NACH dem
    // bestandenen Preflight oben.
    let storageActuallyDeleted = false;
    if (storagePathList.length) {
      await removeStorageObjects(storagePathList);
      storageActuallyDeleted = true;
    }

    // ---- Datenbank: EINE atomare Funktion (alles oder nichts) -----------
    // Ebenfalls mit dem echten Nutzer-JWT.
    const rpc = await rpcCall("system_admin_delete_company_data", { p_company_id: companyId }, callerAuthHeader);
    if (!rpc.ok) {
      console.error("system-admin-delete-company: DB-Löschung fehlgeschlagen TROTZ bestandenem Preflight:", rpc.text, "storageActuallyDeleted:", storageActuallyDeleted);
      const storageNote = storageActuallyDeleted
        ? " Storage-Dateien wurden dabei bereits entfernt (nicht wiederherstellbar), die Datenbank ist unveraendert (die Löschung läuft als eine einzige Transaktion - entweder alles oder nichts)."
        : " Es gab keine Storage-Dateien zu entfernen, die Datenbank ist unverändert.";
      return jsonResponse({ error: "Die Datenbank-Löschung ist unerwartet fehlgeschlagen, obwohl die vorherige Prüfung erfolgreich war." + storageNote + " Bitte Server-Log prüfen." }, 500);
    }
    const rpcRow = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;

    // ---- Auth-User erst jetzt löschen (companies.created_by verweist mit
    //      ON DELETE NO ACTION auf auth.users - die Firma ist jetzt schon
    //      weg, das blockiert also nicht mehr) -----------------------------
    const failedAuthDeletes: string[] = [];
    for (const pid of profileIds) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(pid)}`, { method: "DELETE", headers: svcHeaders });
      if (!res.ok) {
        console.error("system-admin-delete-company: Auth-User konnte nicht gelöscht werden:", pid, await res.text());
        failedAuthDeletes.push(pid);
      }
    }

    // ---- Verifizieren ------------------------------------------------------
    const stillCompany = await restSelect(`companies?id=eq.${encodeURIComponent(companyId)}&select=id`);
    const stillProfiles = await restSelect(`profiles?company_id=eq.${encodeURIComponent(companyId)}&select=id`);
    const stillProjects = await restSelect(`projects?company_id=eq.${encodeURIComponent(companyId)}&select=id`);
    if (stillCompany.length || stillProfiles.length || stillProjects.length) {
      console.error("system-admin-delete-company: Verifikation nach dem Löschen fehlgeschlagen für", companyId);
      return jsonResponse({ error: "Die Löschung konnte nicht vollständig verifiziert werden. Bitte im Supabase-Dashboard prüfen." }, 500);
    }
    if (failedAuthDeletes.length) {
      return jsonResponse({ error: "Firmendaten wurden vollständig gelöscht, aber " + failedAuthDeletes.length + " Auth-Benutzerkonto(s) konnten nicht entfernt werden. Bitte im Supabase-Dashboard manuell prüfen.", auth_delete_failures: failedAuthDeletes }, 500);
    }

    return jsonResponse({
      ok: true,
      company: { id: company.id, name: company.name },
      deleted: {
        users: rpcRow?.deleted_profiles ?? profileIds.length,
        projects: rpcRow?.deleted_projects ?? projectIds.length,
        storage_files: storagePathList.length,
      },
    }, 200);
  } catch (err) {
    console.error("system-admin-delete-company: unexpected error", err);
    return jsonResponse({ error: "Die Firma konnte nicht vollständig gelöscht werden. Bitte Server-Log prüfen, es wurden möglicherweise Teile bereits entfernt." }, 500);
  }
});
