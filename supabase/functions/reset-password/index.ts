// ============================================================
// Edge Function "reset-password"
//
// Setzt das Passwort eines Mitarbeiters neu. Das darf nur der Server,
// weil dafuer der geheime Service-Role-Schluessel noetig ist - im Browser
// haette der nichts verloren.
//
// Die Funktion prueft, ob der Aufrufer in profiles.role = 'admin' steht
// UND ob das Zielprofil (profile_id) zur selben Firma gehoert wie der
// Aufrufer - ein Admin darf ausschliesslich Passwoerter innerhalb der
// eigenen Firma zuruecksetzen.
//
// Sicherheitsaudit Version 2.23: vorher fehlte dieser Firmenvergleich
// komplett. Jeder Firmenadmin konnte per bekannter/erratener profile_id
// das Passwort JEDES Benutzers JEDER anderen Firma zuruecksetzen und sich
// damit deren Konto aneignen (kompletter Cross-Tenant-Account-Takeover).
//
// Version 2.27: zusaetzlich geprueft, ob die eigene Firma des Aufrufers
// ueberhaupt Zugriff hat (aktiv, oder Trial noch nicht abgelaufen) -
// Mitarbeiter-Passwort-Reset ist eine "normale" Firmenfunktion und muss
// bei abgelaufenem Trial/deaktivierter Firma gesperrt sein. Diese Funktion
// laeuft komplett mit dem Service-Role-Key (bewusst, um das Zielprofil
// firmenuebergreifend fuer den Vergleich lesen zu koennen) und umgeht
// damit RLS - die zentrale my_company_id()-Sperre (siehe CLAUDE.md 34)
// greift hier NICHT von selbst, deshalb die explizite Pruefung unten.
//
// v3.316 (Audit): "Access-Control-Allow-Headers" enthielt nur "authorization, content-type". supabase-js
// schickt aber immer auch "apikey" und "x-client-info" - der Browser-Preflight scheitert dann und die Anfrage
// geht nie los (gleicher Fehler wie bei password-reset/resolve-login-email, dort in den Logs belegt: OPTIONS
// ohne POST). Jetzt wie bei den anderen Funktionen. Die Rechtepruefung ist unveraendert.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function antwort(inhalt: unknown, status = 200) {
  return new Response(JSON.stringify(inhalt), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Spiegelt exakt dieselbe Regel wie my_company_id()/is_company_access_allowed()
// in der Datenbank: aktiv, oder Trial noch nicht abgelaufen.
function istFirmaZugriffErlaubt(status: unknown, trialEndsAt: unknown): boolean {
  if (status === "active") return true;
  if (status === "trial" && typeof trialEndsAt === "string") {
    return new Date(trialEndsAt).getTime() > Date.now();
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Wer ruft an?
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: aufrufer, error: authFehler } = await admin.auth.getUser(jwt);
  if (authFehler || !aufrufer?.user) {
    return antwort({ ok: false, error: "Nicht angemeldet." }, 401);
  }

  // 2. Ist er Administrator einer Firma?
  const { data: profil } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", aufrufer.user.id)
    .maybeSingle();
  if (!profil || profil.role !== "admin" || !profil.company_id) {
    return antwort({ ok: false, error: "Nur Administratoren duerfen Passwoerter zuruecksetzen." }, 403);
  }

  // 2b. Hat die eigene Firma des Aufrufers ueberhaupt Zugriff?
  const { data: eigeneFirma } = await admin
    .from("companies")
    .select("subscription_status, trial_ends_at")
    .eq("id", profil.company_id)
    .maybeSingle();
  if (!eigeneFirma || !istFirmaZugriffErlaubt(eigeneFirma.subscription_status, eigeneFirma.trial_ends_at)) {
    return antwort({ ok: false, error: "Der Zugriff fuer Ihre Firma ist derzeit eingeschraenkt (Testphase abgelaufen oder Firma deaktiviert). Bitte wenden Sie sich an den Support." }, 403);
  }

  // 3. Eingabe pruefen
  const { profile_id, password } = await req.json().catch(() => ({}));
  if (!profile_id || !password || String(password).length < 8) {
    return antwort({ ok: false, error: "profile_id und ein Passwort mit mindestens 8 Zeichen sind noetig." }, 400);
  }

  // 4. Gehoert das Zielprofil zur selben Firma wie der Aufrufer? Ohne diese
  // Pruefung koennte ein Admin das Passwort eines Benutzers einer fremden
  // Firma zuruecksetzen und sich damit deren Konto aneignen.
  const { data: zielProfil } = await admin
    .from("profiles")
    .select("id, company_id")
    .eq("id", profile_id)
    .maybeSingle();
  if (!zielProfil || zielProfil.company_id !== profil.company_id) {
    return antwort({ ok: false, error: "Dieser Benutzer gehoert nicht zu Ihrer Firma." }, 403);
  }

  // 5. Passwort setzen
  const { error: setzFehler } = await admin.auth.admin.updateUserById(profile_id, {
    password: String(password),
  });
  if (setzFehler) return antwort({ ok: false, error: setzFehler.message }, 400);

  // 6. Beim naechsten Anmelden muss der Mitarbeiter selbst ein Passwort waehlen
  await admin.from("profiles").update({ passwort_gesetzt: false }).eq("id", profile_id);

  return antwort({ ok: true });
});
