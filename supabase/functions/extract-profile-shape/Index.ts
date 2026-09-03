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
//   * Die Antwort sagt mit, wie sicher die Erkennung ist und wie viele
//     Schenkel verworfen wurden.
//
// Die Längen bleiben ausdrücklich grobe, relative Schätzwerte - eine
// Handskizze hat keinen Massstab. Der Benutzer muss sie prüfen und mit
// den echten Massen überschreiben; die App übernimmt sie deshalb erst
// nach einer sichtbaren Vorschau.
//
// Der Gemini-Schlüssel wird ausschliesslich hier auf dem Server verwendet,
// niemals im Browser-Code.

const MODEL = "gemini-3.6-flash";
const ZEITGRENZE_MS = 25000;
const MAX_SCHENKEL = 24;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return json({ ok: false, error: "Kein Bild übermittelt." }, 400);
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
      return json(
        { ok: false, error: data?.error?.message || "Anfrage an Gemini fehlgeschlagen." },
        502,
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
