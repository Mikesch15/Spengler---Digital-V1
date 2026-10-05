// Supabase Edge Function: extract-offer-positions
//
// Nimmt eine data:-URL (Bild oder PDF) entgegen und laesst die Positionen
// einer Offerte/Rechnung davon erkennen. Der API-Key bleibt serverseitig.
//
// WARUM DIESE DATEI SO AUSSIEHT: die vollstaendige Begruendung jeder Fassung
// von v11 bis v23 - gemeldeter Fehler, Befund, Entscheidung - steht in
// HISTORIE.md im selben Ordner. Sie stand bis v3.253 hier als Kommentar und
// machte rund 500 der 618 Zeilen aus. Diese Datei muss bei jeder Aenderung
// wortgetreu neu veroeffentlicht werden (siehe unten); je kuerzer sie ist,
// desto kleiner die Gefahr, dass dabei etwas verrutscht - in v19 ist genau
// so ein Unfall schon einmal passiert.
//
// WER DIESE DATEI AENDERT, MUSS SIE ERNEUT PER
// mcp__Supabase__deploy_edge_function VEROEFFENTLICHEN - eine lokale
// Aenderung allein hat keine Wirkung.
//
// Die kurze Fassung dessen, was aus HISTORIE.md im Code steht:
//   - maxOutputTokens 65536 (v13), thinkingLevel "LOW" (v15) - nicht
//     thinkingBudget, das lehnen die Gemini-3.x-Modelle ab (v14).
//   - Eigener Abbruch nach 90s (v18): ein belegter echter Erfolg brauchte
//     29,5s, die Plattformgrenze liegt bei 150s auf diesem Plan.
//   - MAX_TOKENS-Notfall (v12): lieber ehrlich sagen, dass das Dokument zu
//     viele Positionen hat, als Positionen erfinden oder still abschneiden.
//   - Der Prompt liest mehrzeilige Positionen zusammen (v16) und gibt
//     Zwischentitel als eigenes Feld "abschnitt" zurueck (v20).
//
// v24: gemeldet am 05.10.2026 beim PDF-Import einer Offerte, mit
// Bildschirmfoto. Im Dialog stand woertlich:
//   "Fehler bei der Erkennung: Server antwortete mit Status 502: Server
//    antwortete mit Status 503: {"error":{"code":503,"message":"This model
//    is currently experiencing high demand. ...","status":"UNAVAILABLE"}}"
// Also derselbe 503 wie in v22 - aber diesmal hat er ALLE drei Versuche aus
// v22 ueberdauert (500ms + 1500ms = zusammen 2 Sekunden Wartezeit). Der
// Engpass bei Google war laenger als zwei Sekunden; die Wiederholung war
// richtig gedacht, aber zu kurz bemessen.
//
// ZWEI Aenderungen, beide am gemeldeten Bild gemessen:
//
// 1. WIEDERHOLUNG LAENGER: vier Versuche mit 2s, 5s und 10s Pause, zusammen
//    rund 17 Sekunden. Das Zeitbudget traegt es: der eine belegte, echte
//    Erfolgswert liegt bei 29,5s (v18), der eigene Abbruch bei 90s - 17s
//    Warten plus 30s Erkennung sind 47s und damit weiterhin deutlich
//    darunter. Noch laenger zu warten waere der falsche Tausch: wer vor dem
//    Handy steht, soll nicht eine Minute auf eine Absage warten.
//    Unveraendert bleibt, WANN wiederholt wird: nur bei 503 (UNAVAILABLE)
//    und 429 (Rate-Limit). Ein echter, dauerhafter Fehler wird weiterhin
//    sofort gemeldet.
//
// 2. DER SATZ STATT DES ROHTEXTS: Bisher wurde die Antwort von Google
//    woertlich durchgereicht - englisches JSON mit "code", "status" und
//    "UNAVAILABLE". Daraus laesst sich nicht ablesen, was zu tun ist, und es
//    sieht aus, als sei etwas am eigenen Dokument kaputt. Jetzt steht in
//    "error" ein deutscher Satz: dass die Erkennung ueberlastet ist, dass es
//    NICHT am Dokument liegt, wie oft es versucht wurde und was zu tun ist.
//    Der Rohtext geht nicht verloren - er steht in "detail", fuer die
//    Diagnose, nicht fuer den Dialog. Dieselbe Regel gilt in dieser App seit
//    v3.137 fuer den rohen Postgres-Text beim doppelten Schluessel.
//    Der Statuscode der Antwort ist fuer diesen Fall 503 statt 502: der
//    Engpass liegt beim Anbieter, nicht an einem fehlerhaften Request.
//
// DIE ZWEITE HAELFTE DES FEHLERS LAG IM CLIENT, nicht hier: recognizePhoto()
// (js/17-ausmass.js) stellte vor JEDE Servermeldung noch den eigenen Vorsatz
// "Server antwortete mit Status N:". Daher die zweite Schachtel im
// Bildschirmfoto. Das ist in derselben Fassung (v3.254) behoben; festgehalten
// in pruefstaende/pruefstand-erkennung-ueberlastet-v3-254.js.
//
// Prompt, generationConfig, Timeout, JSON-Parsing und der MAX_TOKENS-Notfall
// aus v12 sind unveraendert.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function resolveImage(src: string): Promise<{ mimeType: string; data: string } | null> {
  if (!src) return null;
  const dataMatch = /^data:([^;]+);base64,(.+)$/s.exec(src);
  if (dataMatch) {
    return { mimeType: dataMatch[1], data: dataMatch[2] };
  }
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    if (!mimeType.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return { mimeType, data: bytesToBase64(buf) };
  }
  return null;
}

const MODEL = "gemini-3.6-flash";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Nur POST erlaubt." }, 405);
  }

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Ungueltiger Request-Body." }, 400);
  }

  const image = await resolveImage(String(body.image || ""));
  if (!image) {
    return json({ ok: false, error: "Kein gueltiges Bild/PDF uebergeben." }, 400);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json({ ok: false, error: "Serverkonfiguration unvollstaendig (kein API-Key)." }, 500);
  }

  const prompt = `Du bekommst das Foto oder PDF-Dokument (ggf. mehrseitig) einer Offerte oder Rechnung eines Spenglerbetriebs.
Lies ALLE Positionszeilen aus der Tabelle heraus und gib sie als reines JSON-Array zurück.
Kein Erklärtext, kein Markdown-Codeblock, nur das Array selbst.
Jedes Element hat genau diese Felder:
{"pos":"<Positionsnummer als Text, falls vorhanden, sonst leerer String>","description":"<Bezeichnung/Beschreibung der Position>","quantity":<Menge als Zahl, falls nicht lesbar: 0>,"unit":"<Einheit, z.B. Stk, m2, m, h, kg>","price":<Einzelpreis als Zahl, falls im Dokument lesbar, sonst 0>,"abschnitt":"<zugehöriger fett gedruckter Zwischentitel, falls vorhanden, sonst leerer String>"}

Wichtig für "description" - eine Position ist oft mehrzeilig:
- Eine einzelne Position besteht häufig aus einer ersten Zeile mit Positionsnummer/Kurztitel, gefolgt von einer oder mehreren Fliesstext-Zeilen (Material, Ausführung, Masse, Bemerkungen), bevor Menge/Einheit/Preis stehen oder die nächste Position beginnt. Nimm den GESAMTEN zusammengehörigen Text dieser Position in "description" auf, nicht nur die erste Zeile mit der Positionsnummer - verbinde alle Zeilen zu einem lesbaren, zusammenhängenden Fliesstext.

Wichtig für "abschnitt":
- Das Dokument kann fett gedruckte Zwischentitel/Abschnittsüberschriften enthalten (z.B. "Bedachung", "Spenglerarbeiten Dach Nord", "Kamineinfassungen"), die selbst keine eigene Position mit Menge/Einheit sind, sondern nur eine Gruppe nachfolgender Positionen einleiten. Gib einen solchen Zwischentitel NICHT als eigenes Array-Element aus. Trage seinen Text stattdessen bei JEDER Position, die darunter steht, unverändert in das Feld "abschnitt" ein (NICHT in "description" einfügen), damit der fachliche Zusammenhang als eigenes Feld erhalten bleibt. Wechselt der Zwischentitel im Dokument, gilt der neue Titel ab dort für die folgenden Positionen, bis der nächste Zwischentitel kommt. Steht eine Position unter keinem Zwischentitel, bleibt "abschnitt" ein leerer String.

Überschriften, Zwischentitel, Summenzeilen, MWST-Zeilen und Titelzeilen NICHT als eigene Position aufnehmen, nur echte, einzeln aufgeführte Leistungspositionen.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const geminiBody = JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: image.mimeType, data: image.data } },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 65536,
        thinkingConfig: { thinkingLevel: "LOW" },
        responseMimeType: "application/json",
      },
    });

    let res: Response | undefined;
    let errText = "";
    // v24: vier Versuche mit 2s, 5s und 10s Pause - zusammen rund 17
    // Sekunden Wartezeit statt der 2 Sekunden aus v22 (500ms + 1500ms).
    // Begruendung, nicht geraten: der gemeldete Fall hat ALLE drei Versuche
    // aus v22 ueberdauert, der Engpass bei Google war also laenger als zwei
    // Sekunden. Das Zeitbudget traegt es: der eine belegte, echte Erfolgswert
    // liegt bei 29,5s (siehe v18), der eigene Abbruch bei 90s - 17s Warten
    // plus 30s Erkennung sind zusammen 47s und damit weiterhin deutlich
    // darunter. Laenger zu warten waere der falsche Tausch: wer vor dem
    // Handy steht, soll nicht eine Minute auf eine Absage warten.
    const PAUSEN = [2000, 5000, 10000];
    const maxVersuche = PAUSEN.length + 1;
    for (let versuch = 1; versuch <= maxVersuche; versuch++) {
      res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: geminiBody,
      });
      if (res.ok) break;
      errText = await res.text().catch(() => "");
      const ueberlastet = res.status === 503 || res.status === 429;
      if (!ueberlastet || versuch === maxVersuche) break;
      await new Promise((resolve) => setTimeout(resolve, PAUSEN[versuch - 1]));
    }
    clearTimeout(timeout);

    if (!res!.ok) {
      // v24: Ein Ueberlastungsfehler wird in einem Satz gesagt, den der
      // Spengler auf dem Dach lesen kann - nicht als rohes JSON von Google.
      //
      // GEMELDET, mit Bildschirmfoto: im Dialog stand woertlich
      // 'Fehler bei der Erkennung: Server antwortete mit Status 502: Server
      // antwortete mit Status 503: {"error":{"code":503,"message":"This
      // model is currently experiencing high demand. ...","status":
      // "UNAVAILABLE"}}'. Daraus laesst sich nicht ablesen, was zu tun ist,
      // und es sieht aus, als sei etwas am eigenen Dokument kaputt - dabei
      // ist es ein voruebergehender Engpass bei Google.
      //
      // Dieselbe Regel gilt in dieser App seit v3.137 fuer den rohen
      // Postgres-Text beim doppelten Schluessel: ein Anwender bekommt die
      // Fehlersprache eines fremden Systems nicht vorgesetzt. Der Rohtext
      // geht nicht verloren, er steht in "detail" - fuer die Diagnose, nicht
      // fuer den Dialog.
      const ueberlastet = res!.status === 503 || res!.status === 429;
      if (ueberlastet) {
        const wartesumme = Math.round(PAUSEN.reduce((a, b) => a + b, 0) / 1000);
        return json({
          ok: false,
          error: res!.status === 429
            ? `Das Kontingent der Texterkennung ist im Moment ausgeschoepft. Die App hat es ${maxVersuche}-mal über rund ${wartesumme} Sekunden versucht. Bitte später nochmals auf „Erkennen“ tippen - am Dokument liegt es nicht.`
            : `Die Texterkennung ist gerade überlastet. Das ist ein vorübergehender Engpass beim Anbieter und kein Fehler an deinem Dokument - die App hat es ${maxVersuche}-mal über rund ${wartesumme} Sekunden versucht. Bitte in ein paar Minuten nochmals auf „Erkennen“ tippen. Das PDF bleibt so lange hochgeladen, es muss nicht neu gewählt werden.`,
          detail: `Status ${res!.status}: ${errText.slice(0, 300)}`,
          versuche: maxVersuche,
        }, 503);
      }
      return json({ ok: false, error: `Server antwortete mit Status ${res!.status}: ${errText.slice(0, 300)}` }, 502);
    }

    const data = await res!.json();
    const candidate = data?.candidates?.[0];
    const raw = candidate?.content?.parts?.[0]?.text ?? "";

    let positions: unknown;
    try {
      positions = JSON.parse(raw);
    } catch {
      if (candidate?.finishReason === "MAX_TOKENS") {
        return json({
          ok: false,
          error:
            "Das Dokument enthält zu viele Positionen für eine einzelne Erkennung – die Antwort der KI wurde mitten im Satz abgeschnitten. Bitte das Dokument in kleineren Abschnitten hochladen oder die Positionen für diesen Teil von Hand erfassen.",
          geminiFinishReason: candidate?.finishReason ?? null,
        }, 502);
      }
      return json({
        ok: false,
        error: "Antwort der KI konnte nicht als Liste gelesen werden.",
        raw: String(raw).slice(0, 500),
      }, 502);
    }

    if (!Array.isArray(positions)) {
      return json({ ok: false, error: "Antwort der KI war kein Array." }, 502);
    }

    return json({ ok: true, positions });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error)?.name === "AbortError") {
      return json({ ok: false, error: "Zeitüberschreitung bei der Erkennung (90s)." }, 504);
    }
    return json({ ok: false, error: `Unerwarteter Fehler: ${(err as Error)?.message ?? String(err)}` }, 500);
  }
});
