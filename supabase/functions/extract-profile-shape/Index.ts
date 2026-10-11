// Supabase Edge Function: extract-profile-shape   (Version 4, v2.70)
//
// Nimmt die Handskizze eines Blechprofil-Querschnitts entgegen, schickt sie
// an Google Gemini und gibt die erkannte Form als Folge von Schenkeln
// (Länge + Winkel) zurück.
//
// NEU IN VERSION 4 (Feedback "Profil skizzieren wird von ki nicht
// zuverlässig erkannt"):
//   * Harte serverseitige Prüfung der KI-Antwort. Vorher wurde alles,
//     was die KI schickte, ungeprüft durchgereicht - auch Text, NaN,
//     negative oder fehlende Längen. Der Client machte daraus stumm
//     Schenkel der Länge 0, also eine ungültige Geometrie.
//   * Erkennt die KI keine brauchbare Form, kommt eine ehrliche Absage
//     statt eines erfundenen Profils.
//   * Zeitgrenze für die Gemini-Anfrage, damit die App nicht endlos
//     "erkennt".
//   * Die Antwort sagt mit, wie viele Schenkel verworfen wurden.
//
// Die Längen bleiben ausdrücklich grobe, relative Schätzwerte - eine
// Handskizze hat keinen Massstab. Der Benutzer muss sie prüfen und mit
// den echten Massen überschreiben; die App übernimmt sie deshalb erst
// nach einer sichtbaren Vorschau.
//
// Der Gemini-Schlüssel wird ausschliesslich hier auf dem Server verwendet,
// niemals im Browser-Code.
//
// VERSION 5 (v3.308, 11.10.2026) - SICHERHEIT: bis v4 schickte der Client als "Bearer" den OEFFENTLICHEN
// Schluessel der App (sb_publishable_..., im Browser fuer jeden lesbar, kein Benutzer-Token). Der Gateway
// laesst diesen Schluessel auch bei verify_jwt=true durch (am 11.10.2026 an extract-offer-positions live
// gemessen), und diese Funktion pruefte selbst nichts - sie war ohne Anmeldung aufrufbar, jeder Aufruf kostete
// einen Gemini-Aufruf. Jetzt: (1) der Client schickt das Token der angemeldeten Person (js/14), (2) pruefeZugang()
// ruft public.my_company_id() mit GENAU diesem Token auf: nur eine angemeldete Person mit Profil und aktivem
// Firmenkonto kommt durch (anon -> 401, ohne aktive Firma -> 403, Pruefung nicht erreichbar -> 503, fail closed),
// (3) Fehlertexte von Google werden nicht mehr roh durchgereicht (englisch, koennte den Schluessel enthalten):
// ein deutscher Satz, der Rohtext ohne Schluessel nur in "detail". Prompt, Modell, Zeitgrenze, Pruefung der
// Schenkel und Antwortformat sind unveraendert. verify_jwt bleibt true.

const MODEL = "gemini-3.6-flash";
const ZEITGRENZE_MS = 25000;
const MAX_SCHENKEL = 24;
const MAX_BILD_ZEICHEN = 12_000_000; // base64-Text, rund 9 MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Eine einzige Stelle prüft die Geometrie - hier, serverseitig.
// Zurück kommt nur, was tatsächlich ein Profil ergeben kann.
function pruefeSchenkel(roh: unknown) {
  if (!Array.isArray(roh)) return { fehler: "Antwort war kein Array." };
  const gut: { laenge: number; winkel: number }[] = [];
  let verworfen = 0;
  for (const e of roh) {
    if (gut.length >= MAX_SCHENKEL) { verworfen++; continue; }
    if (!e || typeof e !== "object") { verworfen++; continue; }
    const l = Number((e as Record<string, unknown>).laenge);
    let w = Number((e as Record<string, unknown>).winkel);
    if (!Number.isFinite(l) || l <= 0) { verworfen++; continue; }
    if (!Number.isFinite(w)) w = 0;
    // Winkel auf einen sinnvollen Bereich begrenzen: mehr als eine halbe
    // Drehung je Kantung gibt es an einem Blech nicht.
    if (w > 180) w = 180;
    if (w < -180) w = -180;
    gut.push({ laenge: Math.round(l), winkel: gut.length === 0 ? 0 : Math.round(w) });
  }
  if (gut.length < 2) {
    return { fehler: "Keine eindeutige Form erkannt – bitte manuell erfassen." };
  }
  return { schenkel: gut, verworfen };
}

// v5: Wer ruft auf? Dieselbe Pruefung wie in extract-offer-positions (v26): das JWT der angemeldeten Person wird
// mit dem oeffentlichen Schluessel (apikey) an PostgREST gegeben und fragt public.my_company_id() ab - fuer
// "anon" nicht ausfuehrbar, fuer eine Person ohne Profil/aktive Firma null. Schlaegt die Pruefung selbst fehl,
// wird NICHT durchgelassen.
async function pruefeZugang(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") || "");
  const token = m ? m[1].trim() : "";
  if (!token) {
    return { ok: false, status: 401, error: "Nicht angemeldet. Bitte in der App anmelden und nochmals versuchen." };
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) {
    return { ok: false, status: 500, error: "Serverkonfiguration unvollstaendig (Anmeldepruefung)." };
  }
  try {
    const r = await fetch(`${url}/rest/v1/rpc/my_company_id`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(10000),
    });
    if (r.status >= 400 && r.status < 500) {
      return { ok: false, status: 401, error: "Die Anmeldung ist abgelaufen oder ungültig. Bitte die App neu laden und erneut anmelden." };
    }
    if (!r.ok) {
      return { ok: false, status: 503, error: "Die Anmeldung konnte gerade nicht geprüft werden. Bitte in einem Moment nochmals versuchen." };
    }
    const firma = await r.json().catch(() => null);
    if (!firma) {
      return { ok: false, status: 403, error: "Für dieses Konto ist kein aktives Firmenkonto hinterlegt. Die Erkennung steht nur angemeldeten Mitarbeitenden einer aktiven Firma zur Verfügung." };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 503, error: "Die Anmeldung konnte gerade nicht geprüft werden. Bitte in einem Moment nochmals versuchen." };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // v5: nur angemeldete Personen mit aktivem Firmenkonto - vor allem anderen, auch vor dem Lesen des Bodys.
  const zugang = await pruefeZugang(req);
  if (!zugang.ok) return json({ ok: false, error: zugang.error }, zugang.status);

  try {
    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return json({ ok: false, error: "Kein Bild übermittelt." }, 400);
    }
    // v3.316: Obergrenze gegen unnoetige KI-Kosten (die App verkleinert Skizzen vorher auf wenige hundert KB).
    if (image_base64.length > MAX_BILD_ZEICHEN) {
      return json({ ok: false, error: "Das Bild ist für die Erkennung zu gross. Bitte die Skizze näher fotografieren oder in geringerer Auflösung aufnehmen." }, 413);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return json(
        { ok: false, error: "GEMINI_API_KEY ist auf dem Server nicht gesetzt (siehe SETUP.md)." },
        500,
      );
    }

    // data:image/png;base64,XXXX -> mime_type + reine Base64-Nutzlast trennen
    const match = image_base64.match(/^data:([^;]+);base64,(.+)$/s);
    const mimeType = match ? match[1] : "image/png";
    const base64Data = match ? match[2] : image_base64;

    const prompt = `Du bekommst die Handskizze eines Blechprofil-Querschnitts: eine Folge von
geraden, miteinander verbundenen Linien (Schenkel), die zusammen ein gebogenes
Blechprofil darstellen.

Erkenne die Form als geordnete Folge von geraden Schenkeln, in der Reihenfolge,
wie sie gezeichnet sind (von einem Ende der Linie zum anderen). Ignoriere
Beschriftungen, Masslinien, Pfeile oder Text - erkenne nur die durchgezogene
Profilkontur selbst.

Gib AUSSCHLIESSLICH ein reines JSON-Objekt zurück, ohne Erklärtext, ohne
Markdown-Codeblock. Aufbau:
{"sicher": true|false,
 "schenkel": [{"laenge": <Zahl>, "winkel": <Zahl>}, ...]}

- "sicher" ist false, wenn die Skizze unklar, mehrdeutig, leer oder kein
  Blechprofil ist. Dann darf "schenkel" leer sein. Rate in diesem Fall NICHT.
- "laenge": geschätzte Länge dieses Schenkels relativ zu den anderen, auf
  einer Skala von etwa 10 bis 200. Immer grösser als 0.
- "winkel": Winkel in Grad, um den sich die Richtung am ANFANG dieses
  Schenkels gegenüber dem vorherigen ändert; beim ersten Schenkel immer 0.

Winkel-Konvention (Bildkoordinaten: X nach rechts, Y nach unten):
- 0° = gerade Fortsetzung, keine Ecke
- Positive Winkel drehen im Uhrzeigersinn
- Negative Winkel drehen gegen den Uhrzeigersinn
- 180° oder -180° = der Schenkel läuft exakt zurück (Umschlag/Falz)

Beispiel einer L-Form (kurz nach rechts, dann länger nach unten):
{"sicher": true, "schenkel": [{"laenge": 40, "winkel": 0}, {"laenge": 100, "winkel": 90}]}`;

    // Zeitgrenze: ohne sie bleibt die App bei einer haengenden Anfrage
    // endlos im Zustand "erkennt ...".
    const abbruch = new AbortController();
    const uhr = setTimeout(() => abbruch.abort(), ZEITGRENZE_MS);
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abbruch.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } },
              ],
            }],
            generationConfig: { temperature: 0, maxOutputTokens: 1500 },
          }),
        },
      );
    } catch (e) {
      clearTimeout(uhr);
      const abgebrochen = (e as { name?: string })?.name === "AbortError";
      return json({
        ok: false,
        error: abgebrochen
          ? "Die Erkennung hat zu lange gedauert. Bitte erneut versuchen oder das Profil von Hand erfassen."
          : "Die Erkennung ist nicht erreichbar. Bitte die Internetverbindung prüfen.",
      }, 504);
    }
    clearTimeout(uhr);

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      // v5: nicht mehr der rohe, englische Text von Google (koennte den Schluessel enthalten) - ein deutscher
      // Satz; der Rohtext steht ohne Schluessel nur in "detail".
      const roh = String(data?.error?.message || "").split(GEMINI_API_KEY).join("***").slice(0, 300);
      const ueberlastet = res.status === 503 || res.status === 429;
      return json(
        {
          ok: false,
          error: ueberlastet
            ? "Die Erkennung ist gerade überlastet. Das liegt nicht an deiner Skizze. Bitte in ein paar Minuten nochmals versuchen oder das Profil von Hand erfassen."
            : "Die Erkennung ist fehlgeschlagen. Bitte erneut versuchen oder das Profil von Hand erfassen.",
          detail: `Status ${res.status}: ${roh}`,
        },
        ueberlastet ? 503 : 502,
      );
    }

    let raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    raw = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let antwort: unknown;
    try {
      antwort = JSON.parse(raw);
    } catch {
      return json(
        { ok: false, error: "Keine eindeutige Form erkannt – bitte manuell erfassen." },
        200,
      );
    }

    // Beide Formen zulassen: das neue Objekt und ein reines Array
    // (falls das Modell doch nur die Liste liefert).
    const objekt = (antwort && typeof antwort === "object" && !Array.isArray(antwort))
      ? antwort as Record<string, unknown>
      : { sicher: true, schenkel: antwort };
    if (objekt.sicher === false) {
      return json({ ok: false, error: "Keine eindeutige Form erkannt – bitte manuell erfassen." });
    }

    const geprueft = pruefeSchenkel(objekt.schenkel);
    if ("fehler" in geprueft) {
      return json({ ok: false, error: geprueft.fehler });
    }
    return json({
      ok: true,
      schenkel: geprueft.schenkel,
      verworfen: geprueft.verworfen,
      hinweis: "Die Längen sind grobe Schätzwerte aus der Skizze und müssen geprüft werden.",
    });
  } catch (err) {
    console.error("extract-profile-shape:", err);
    return json({ ok: false, error: "Die Erkennung ist fehlgeschlagen. Bitte erneut versuchen." }, 500);
  }
});
