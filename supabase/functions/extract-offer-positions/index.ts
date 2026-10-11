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
// v26 (11.10.2026): SICHERHEIT. Bis v25 stand verify_jwt auf false und der Client schickte als "Bearer" den
// OEFFENTLICHEN Schluessel der App (sb_publishable_..., im Browser fuer jeden lesbar, kein Benutzer-Token):
// jeder Kenner der Adresse konnte die Erkennung - und damit den serverseitigen Gemini-Schluessel samt Kosten -
// ohne Anmeldung aufrufen. Jetzt: (1) der Client schickt das JWT der angemeldeten Person (js/17 recognizePhoto),
// (2) verify_jwt ist true (der Gateway weist fehlende/ungueltige/abgelaufene Tokens ab), (3) die Funktion prueft
// SELBST, dass die Person angemeldet ist UND zu einer Firma mit aktivem Konto gehoert: ein Aufruf von
// public.my_company_id() mit GENAU diesem Token (Anon darf die Funktion nicht ausfuehren, ein Benutzer ohne
// Profil/aktive Firma bekommt null). Ein oeffentlicher Schluessel ist keine Anmeldung; CORS "*" ist keine
// Zugriffskontrolle. Alles andere (Modell, Prompt, Wiederholung 503/429, 90s, MAX_TOKENS, Antwortformat) bleibt.
// Grenze: jede Person mit aktivem Firmenkonto darf die Erkennung nutzen (ein Limit je Benutzer gibt es nicht).
//
// v25 (11.10.2026): gemeldet "beim Import aus einem Foto trat eine Fehlermeldung auf, nach einem erneuten
// Versuch ging es" und die Frage, ob das Original-PDF zuverlaessiger sei. Befund: PDF und Foto laufen
// DURCH DIESELBE STRECKE (data:-URL -> inline_data mit dem MIME-Typ aus der URL, PDF also als
// application/pdf); ein digitales PDF mit Text ist genauer als ein Foto, ein gescanntes PDF nicht. Die
// Ursache des gemeldeten Fehlers ist NICHT belegt (die Funktions-Logs reichen nicht bis zum Vorfall) - deshalb
// bleibt die Wiederholungsregel (nur 503/429, v3.254 D4) unveraendert. Neu ist nur, was sicher fehlte:
// (1) Typ-Pruefung VOR dem Aufruf, (2) jede uebrige Fehlerart von Google bekommt einen deutschen Satz mit der
// naechsten Handlung statt rohem Englisch, der Rohtext steht nur in "detail" und ohne API-Key, (3) eine
// leere/unlesbare Antwort (ausser MAX_TOKENS) wird einmal automatisch nochmals gefragt - genau das, was der
// Anwender sonst von Hand tut -, eine abgelehnte (SAFETY u. a.) bekommt einen eigenen Satz, (4) nur echte
// Objekte zaehlen als Position. Modell, Prompt, generationConfig, Timeout und der allgemeine Satz "Antwort der
// KI konnte nicht als Liste gelesen werden." bleiben unveraendert.
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

// v26: Wer ruft auf? Das JWT der angemeldeten Person (Authorization: Bearer ...) wird mit dem oeffentlichen
// Schluessel (apikey) an PostgREST gegeben und fragt public.my_company_id() ab - dieselbe Funktion, auf der die
// Mandantentrennung der Datenbank beruht: sie liefert die Firma NUR fuer eine angemeldete Person mit Profil und
// aktivem/Test-Abo, fuer "anon" ist sie nicht ausfuehrbar. Ungueltiges oder abgelaufenes Token -> 401 von
// PostgREST. Schlaegt die Pruefung selbst fehl (Netz, Konfiguration), wird NICHT durchgelassen.
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Nur POST erlaubt." }, 405);
  }

  // v26: nur angemeldete Personen mit aktivem Firmenkonto. Vor allem anderen - auch vor dem Lesen des Bodys.
  const zugang = await pruefeZugang(req);
  if (!zugang.ok) {
    return json({ ok: false, error: zugang.error }, zugang.status);
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

  // v25: nur Typen, die die Erkennung wirklich liest. Alles andere wuerde bei Google als 400 mit
  // englischem Rohtext zurueckkommen - hier wird es vorher und auf Deutsch abgelehnt.
  const ERLAUBT = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const typ = String(image.mimeType || "").toLowerCase().trim();
  if (!ERLAUBT.includes(typ)) {
    return json({
      ok: false,
      error: `Dieser Dateityp (${typ || "unbekannt"}) kann nicht gelesen werden. Erlaubt sind Fotos (JPG, PNG, WebP, HEIC) und PDF. Bitte ein Foto aufnehmen oder das Original-PDF verwenden.`,
    }, 400);
  }
  image.mimeType = typ;

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
    if (!res!.ok) clearTimeout(timeout);

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
      const roh = errText.split(apiKey).join("***").slice(0, 300);
      const ueberlastet = res!.status === 503 || res!.status === 429;
      if (ueberlastet) {
        const wartesumme = Math.round(PAUSEN.reduce((a, b) => a + b, 0) / 1000);
        return json({
          ok: false,
          error: res!.status === 429
            ? `Das Kontingent der Texterkennung ist im Moment ausgeschoepft. Die App hat es ${maxVersuche}-mal über rund ${wartesumme} Sekunden versucht. Bitte später nochmals auf „Erkennen“ tippen - am Dokument liegt es nicht.`
            : `Die Texterkennung ist gerade überlastet. Das ist ein vorübergehender Engpass beim Anbieter und kein Fehler an deinem Dokument - die App hat es ${maxVersuche}-mal über rund ${wartesumme} Sekunden versucht. Bitte in ein paar Minuten nochmals auf „Erkennen“ tippen. Das PDF bleibt so lange hochgeladen, es muss nicht neu gewählt werden.`,
          detail: `Status ${res!.status}: ${roh}`,
          versuche: maxVersuche,
        }, 503);
      }
      // v25: jede uebrige Fehlerart in einem deutschen Satz mit der naechsten Handlung. Der Rohtext von Google
      // steht nur in "detail" - und ohne den API-Key, falls Google ihn in einer Meldung wiederholt.
      const st = res!.status;
      if (st === 500 || st === 502 || st === 504) {
        return json({
          ok: false,
          error: `Die Texterkennung hat einen Fehler gemeldet. Das liegt meist nicht am Dokument. Bitte in einer Minute nochmals auf „Erkennen“ tippen. Das Dokument bleibt hochgeladen, es muss nicht neu gewählt werden.`,
          detail: `Status ${st}: ${roh}`,
        }, 502);
      }
      if (st === 400 || st === 413) {
        return json({
          ok: false,
          error: `Die Texterkennung konnte dieses Dokument nicht lesen. Mögliche Gründe: die Datei ist beschädigt oder passwortgeschützt, zu gross oder leer. Bitte ein anderes Foto aufnehmen oder das Original-PDF verwenden.`,
          detail: `Status ${st}: ${roh}`,
        }, 400);
      }
      if (st === 401 || st === 403 || st === 404) {
        return json({
          ok: false,
          error: `Die Texterkennung ist im Moment nicht eingerichtet oder nicht erreichbar. Das liegt nicht am Dokument. Bitte den Administrator informieren.`,
          detail: `Status ${st}: ${roh}`,
        }, 502);
      }
      return json({ ok: false, error: `Server antwortete mit Status ${res!.status}: ${roh}` }, 502);
    }

    let data = await res!.json();
    let candidate = data?.candidates?.[0];
    let raw = candidate?.content?.parts?.[0]?.text ?? "";

    let positions: unknown;
    const lesen = (): boolean => {
      try { positions = JSON.parse(raw); return true; } catch { return false; }
    };
    let gelesen = lesen();
    // v25: eine leere oder unlesbare Antwort ohne MAX_TOKENS ist erfahrungsgemaess ein Ausrutscher des
    // Modells - einmal nochmals fragen (dasselbe Zeitbudget), statt dem Anwender den Fehler zu zeigen.
    if (!gelesen && candidate?.finishReason !== "MAX_TOKENS" && !controller.signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const res2 = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: geminiBody,
      });
      if (res2.ok) {
        data = await res2.json();
        candidate = data?.candidates?.[0];
        raw = candidate?.content?.parts?.[0]?.text ?? "";
        gelesen = lesen();
      }
    }
    clearTimeout(timeout);

    if (!gelesen) {
      if (candidate?.finishReason === "MAX_TOKENS") {
        return json({
          ok: false,
          error:
            "Das Dokument enthält zu viele Positionen für eine einzelne Erkennung – die Antwort der KI wurde mitten im Satz abgeschnitten. Bitte das Dokument in kleineren Abschnitten hochladen oder die Positionen für diesen Teil von Hand erfassen.",
          geminiFinishReason: candidate?.finishReason ?? null,
        }, 502);
      }
      const grund = String(candidate?.finishReason ?? data?.promptFeedback?.blockReason ?? "");
      const blockiert = /SAFETY|PROHIBITED|BLOCKLIST|RECITATION|SPII|IMAGE_SAFETY/i.test(grund);
      if (blockiert) {
        return json({
          ok: false,
          error: "Die Erkennung hat dieses Dokument nicht verarbeitet (von der KI abgelehnt). Bitte ein anderes Foto oder das Original-PDF verwenden.",
          detail: `Grund: ${grund}`,
        }, 502);
      }
      return json({
        ok: false,
        error: "Antwort der KI konnte nicht als Liste gelesen werden.",
        hinweis: "Bitte nochmals auf „Erkennen“ tippen.",
        raw: String(raw).slice(0, 500),
      }, 502);
    }

    if (!Array.isArray(positions)) {
      return json({ ok: false, error: "Die Antwort der KI hatte nicht das erwartete Format (keine Liste). Bitte nochmals versuchen." }, 502);
    }
    // v25: nur echte Objekte sind Positionen - ein Text oder eine Zahl in der Liste wird nicht als leere
    // Position weitergereicht.
    positions = (positions as unknown[]).filter((p) => p && typeof p === "object" && !Array.isArray(p));

    return json({ ok: true, positions });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error)?.name === "AbortError") {
      return json({ ok: false, error: "Zeitüberschreitung bei der Erkennung (90s)." }, 504);
    }
    return json({ ok: false, error: `Unerwarteter Fehler: ${(err as Error)?.message ?? String(err)}` }, 500);
  }
});
