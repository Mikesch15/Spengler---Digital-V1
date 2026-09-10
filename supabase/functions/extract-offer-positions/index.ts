// Supabase Edge Function: extract-offer-positions
// Accepts a data: URL or a public HTTP(S) image URL and sends the image to Gemini.
// Gemini API key stays server-side in Supabase Secrets.
//
// v11: prompt text generalized to also cover PDF documents (possibly
// multi-page) - the client can now send a "data:application/pdf;base64,..."
// URL for a quote's PDF file (v3.39, js/63-angebote.js), not just a photo.
// resolveImage() itself needed NO change: it already passes any data:-URL
// through unmodified (only https?:// URLs are restricted to image/*), and
// Gemini's inline_data accepts application/pdf the same way it accepts
// image/*. The request/response contract is unchanged.
//
// v12: fixes a real production bug reported against a genuine, dense
// Swiss NPK-format Offerte PDF (~90+ line-item positions across 13 pages).
// Root cause, confirmed via edge logs (a real 502 at 2026-09-10T05:16:46Z)
// plus direct inspection of the attached PDF: maxOutputTokens:3000 was far
// too low for a document this size. At roughly 30-35 output tokens per
// JSON position object, ~90 positions land almost exactly on that 3000
// ceiling - Gemini's response gets cut off mid-array, JSON.parse() fails,
// and the (unhelpful, misleading) generic "Antwort der KI konnte nicht als
// Liste gelesen werden" error was shown, with no indication that the real
// cause was simply "too many positions for the token budget".
// Fix, in order of the project's usual layered-defense style (raise the
// realistic ceiling first, then be honest if it's STILL not enough - never
// silently guess/fabricate positions, see CLAUDE.md §78.5):
//   1. maxOutputTokens raised from 3000 to 8192 (comfortably covers this
//      real document's ~90 positions many times over: ~8192/33 ≈ 248
//      positions of headroom).
//   2. Gemini's finishReason is now read from the candidate. If parsing
//      still fails AND finishReason==="MAX_TOKENS", the client gets an
//      honest, specific, actionable message instead of the generic one -
//      naming the real cause (too many positions, response cut off) and
//      suggesting the document be split into smaller sections, rather than
//      inventing or silently truncating a partial position list.
// The success path (ok:true) and the request/response contract for a
// normal-sized document are otherwise completely unchanged.
//
// v13: the user asked "koennen wir das verbessern?" after confirming the
// v12 fallback message works - i.e. can LARGE documents actually succeed
// instead of merely failing cleanly. Researched (web search against
// Google's own Gemini API docs/forum, since this sandbox cannot make a
// live call to confirm empirically) rather than guessed:
//   1. MODEL is a Gemini 3.x-generation flash model. Google's own forum
//      explicitly documents: "Gemini 3 Flash and Flash-Lite also do not
//      support full thinking-off" - i.e. on THIS model generation, some
//      amount of invisible "thinking" token spend can eat into the very
//      same maxOutputTokens budget that JSON.parse() needs, even though
//      this extraction task is a mechanical table-read that needs no
//      extended reasoning at all. That was an unaccounted-for token sink
//      in v12: part of the "8192 tokens of headroom" may never have been
//      available to the actual JSON array. Fix (AT THE TIME, later found
//      wrong - see v14 below): thinkingConfig with thinkingBudget:0 was
//      set explicitly, to minimize this as far as the model allows (even
//      though the model may not honour a full 0).
//   2. maxOutputTokens raised again, from 8192 to 65536 - not an arbitrary
//      re-guess, but the documented ceiling for this Gemini generation
//      (Google's docs: Gemini 2.5 Pro supports up to 65535/65536 output
//      tokens; flash-tier models of the same generation share that
//      ceiling). At ~33 tokens/position this gives roughly 1985 positions
//      of headroom even before accounting for thinkingBudget:0 freeing up
//      further room - i.e. comfortably beyond any realistic real-world
//      Swiss Offerte, not just the one that was reported. This part of
//      v13 was correct and stays unchanged in v14.
// The MAX_TOKENS honest-fallback message from v12 stays in place
// UNCHANGED as the safety net for the genuinely pathological case (see
// CLAUDE.md §78.5: never silently truncate or fabricate positions) - it
// should now just be extremely unlikely to ever trigger in practice.
// Deliberately NOT built: PDF page-splitting/chunking across multiple
// Gemini calls. That would be a materially larger, riskier piece of
// infrastructure (a PDF-splitting library inside the Deno edge runtime,
// multiple sequential calls, merge/dedupe logic, partial-failure
// handling) for a problem that the single-call ceiling above already
// covers with very wide margin for the actual domain (Swiss NPK Offerten
// rarely exceed a few hundred positions) - see CLAUDE.md's own house
// rule against building for a need that isn't concretely demonstrated.
//
// v14: within minutes of the v13 deploy, real production use (a live
// mobile session against the deployed app) surfaced a NEW, different
// error: "Request contains an invalid argument" (a 502, from the
// !res.ok branch below, i.e. Gemini's OWN API rejected the request
// outright - this is not the MAX_TOKENS case, and this sandbox still
// cannot make a live Gemini call to reproduce it directly). Researched
// before touching the code again (never guess twice in a row):
// Google's own developer forum and multiple independent, on-topic
// GitHub issues (cline, kilocode, big-AGI) confirm, for the Gemini 3.x
// model family that MODEL belongs to: (1) thinkingBudget:0 is REJECTED
// outright by Gemini 3.x models with an explicit, matching error -
// "Budget 0 is invalid. This model only works in thinking mode" -
// because Gemini 3.x models cannot fully disable thinking; (2) Gemini
// 3.x models generally expect the newer thinkingLevel field instead of
// the older (Gemini-2.5-era) thinkingBudget field for controlling
// reasoning effort - sending thinkingBudget to a Gemini 3 model is
// itself the wrong field, independent of the value chosen. In short:
// v13's thinkingConfig fix was itself the cause of the new error - the
// v13 code comment above even flagged this exact uncertainty ("the
// model may not honour a full 0") without yet knowing it would be
// rejected outright rather than merely ignored.
// Fix: thinkingConfig is removed entirely rather than replaced with an
// unverified thinkingLevel value - CLAUDE.md's own house rule is to fix
// only what is concretely broken and not introduce a second unverified
// field on top of the first. maxOutputTokens:65536 (confirmed correct
// above, and unaffected by this defect) is kept unchanged; Gemini 3.x's
// default thinking behaviour now applies, drawing from the same 65536
// budget as before v13 attempted to shrink it - the very large margin
// already established in v12/v13 (headroom of well over a thousand
// positions even before accounting for any thinking-token spend) more
// than covers a real-world Swiss Offerte either way.
//
// v15: real production use of v14 (the same real, dense 13-page/90+-
// position Offerte PDF, on the actual live mobile device) surfaced a
// THIRD, again different failure: the raw browser error "Failed to
// fetch" - a client/network-layer TypeError thrown by fetch() itself,
// BEFORE any HTTP response is received (unlike v11/v12's 502s, which
// did complete a round-trip and got logged server-side). Diagnosed via
// Supabase's own function_edge_logs/edge_logs (not guessed): for both
// production attempts under v14, a CORS OPTIONS preflight to this
// function succeeded (200), but NO corresponding POST ever appears in
// function_edge_logs at any status - the actual POST request never
// reached this function at all. The immediately preceding step (the
// client fetching the PDF's bytes from a Supabase Storage signed URL)
// is independently confirmed to have succeeded first, so the failure is
// specifically in the client's fetch() call to THIS function, not in
// loading the PDF.
// Researched rather than guessed (the direct, hard-learned lesson from
// getting v13's thinkingConfig wrong twice in a row): "Failed to fetch"
// is a well-documented symptom of the network connection failing or
// being dropped before a response arrives - and mobile cellular
// connections are documented to be materially less tolerant of a POST
// left open for a long time than desktop connections. v14's default
// (MEDIUM) thinking behaviour on this dense document is very likely
// running considerably LONGER than the 14-33s execution times that were
// actually logged under v11/v12 (which used thinkingBudget:0, however
// ineffectively) - and that extra duration is the most plausible
// explanation for why THIS specific real mobile session's connection
// died with zero server-side trace, exactly matching every piece of log
// evidence gathered.
// Also researched (not assumed) rather than reusing v13's mistake:
// Google's OWN current docs for gemini-3.6-flash confirm the model DOES
// support the newer thinkingLevel field (LOW/MEDIUM/HIGH; MEDIUM is the
// default), and explicitly recommend LOW for exactly this kind of task
// - "fast transcript-focused searches or basic metadata extraction" -
// which is precisely what reading a table of positions/quantities/units
// out of a PDF is: a mechanical table-read, not multi-step reasoning.
// (The docs also confirm thinkingLevel and thinkingBudget must never be
// combined in one Gemini-3 request - not a concern here, since
// thinkingBudget is not sent at all.)
// Fix: thinkingLevel:"LOW" is added to generationConfig, to reduce
// Gemini's actual processing time for this task (and so reduce how long
// the client's fetch() has to stay open on an unreliable mobile
// connection) - a verified, model-documented setting for this exact use
// case, not a repeat of v13's unverified thinkingBudget:0 guess.
// maxOutputTokens:65536 is unchanged; the MAX_TOKENS honest-fallback
// message from v12 is unchanged.
//
// v16: Folgeverbesserung, die der Betrieb schon waehrend der v11-v15-
// Fehlerbehebung gemeldet hatte und die bewusst zurueckgestellt wurde,
// bis die Erkennung ueberhaupt zuverlaessig durchlief (CLAUDE.md §147.9/
// §148.9): die tatsaechlich ERKANNTEN Positionen waren fachlich
// unvollstaendig, auch wenn kein technischer Fehler mehr auftrat. Zwei
// konkrete, vom Betrieb genannte Symptome an echten NPK-Offerten:
//   1. Je Position wurde nur die eine Zeile mit der Positionsnummer
//      gelesen, nicht der ganze dazugehoerige Absatz. Eine reale
//      Offerte-Position besteht oft aus mehreren Zeilen (Kurztitel,
//      danach Fliesstext mit Material/Ausfuehrung/Massen), bevor
//      Menge/Einheit/Preis stehen - die Folgezeilen wurden bisher
//      stillschweigend nicht mit in "description" aufgenommen.
//   2. Fett gedruckte Zwischentitel/Abschnittsueberschriften im PDF
//      (z.B. "Bedachung", "Spenglerarbeiten Dach Nord") wurden von der
//      bestehenden Anweisung "Ueberschriften ... NICHT als Position
//      aufnehmen" ueberhaupt erfasst - das war beabsichtigt, sie sollen
//      nicht als eigene Zeile erscheinen -, aber ihr fachlicher Kontext
//      ging dabei vollstaendig verloren, statt an den darunterstehenden
//      Positionen erhalten zu bleiben.
// Architektonische Randbedingung (direkt am Code geprueft, nicht
// angenommen): js/17-ausmass.js's recognizePhoto() - die EINE, von
// js/63-angebote.js unveraendert wiederverwendete Konsumentenfunktion -
// liest per .map() aus jeder Gemini-Antwort strikt genau die vier
// Felder pos/description/quantity/unit heraus; jedes zusaetzliche
// JSON-Feld wuerde dort stillschweigend verworfen. Eine Loesung durfte
// deshalb kein neues Feld einfuehren und musste ohne jede Aenderung an
// js/17-ausmass.js oder js/63-angebote.js auskommen (beide bleiben
// unveraendert - CLAUDE.md's Grundsatz, geschuetzte Dateien nicht
// anzufassen, wenn es nicht zwingend noetig ist).
// Fix, ausschliesslich im Gemini-Prompt-Text: zwei neue, explizite
// Anweisungen fuer das Feld "description", beide falten die fehlende
// Information in dieses EINE bestehende Feld:
//   1. Es wird jetzt ausdruecklich verlangt, alle zu einer Position
//      gehoerenden Fliesstext-Zeilen bis zur naechsten Positionsnummer
//      bzw. bis Menge/Einheit/Preis zu einem zusammenhaengenden Text zu
//      verbinden, statt nur die erste Zeile zu lesen.
//   2. Ein erkannter fett gedruckter Zwischentitel wird weiterhin NICHT
//      als eigene Position ausgegeben (unveraendertes Verhalten), aber
//      sein Text wird jetzt jeder darunterstehenden Position in
//      "description" vorangestellt (getrennt durch " – "), bis ein
//      neuer Zwischentitel folgt - der fachliche Zusammenhang bleibt
//      dadurch erhalten, ohne ein neues Feld zu brauchen.
// generationConfig (maxOutputTokens:65536, thinkingConfig:
// {thinkingLevel:"LOW"}) ist unveraendert aus v15 uebernommen - dieser
// Fix aendert ausschliesslich den Prompt-Text, nicht das Anfrageformat,
// das Antwortformat, die Fehlerbehandlung oder den MAX_TOKENS-Notfall
// aus v12.
//
// Diesen Quelltext gibt es seit v12 auch im Repo (dieselbe Uebung wie bei
// extract-profile-shape) - vorher war er nur ueber
// mcp__Supabase__get_edge_function abrufbar (CLAUDE.md §31.6/§144.3
// dokumentiert das ausdruecklich als bekannte Luecke). Wer diese Datei
// aendert, MUSS sie erneut per mcp__Supabase__deploy_edge_function
// veroeffentlichen - eine lokale Aenderung allein hat keine Wirkung.

// v17: ein produktiver 400er ("Kein gueltiges Bild/PDF uebergeben.") wurde
// gemeldet, obwohl der zugrundeliegende Client-Fehler laengst behoben war -
// js/17-ausmass.js's recognizePhoto() sendet seit einer lokalen, bisher
// unveroeffentlichten Korrektur bereits body:{image:src}. Direkter
// Abgleich per mcp__Supabase__get_edge_function ergab: die HIER im Repo
// eingecheckte Datei war seit v12 strukturell veraltet und wich an mehreren
// Stellen vom tatsaechlich live deployten Code ab - insbesondere las der
// Server-Handler weiterhin body.image_base64 statt body.image. Nur der
// Kommentar oben (dieser Changelog) war zutreffend und deckungsgleich mit
// dem Live-Stand; der Code darunter war es nicht. Root Cause des vom
// Nutzer gemeldeten Fehlers war deshalb ein reiner Feldnamen-Mismatch
// zwischen dem (noch nicht committeten) Client-Fix und DIESER veralteten
// Repo-Kopie - nicht dem tatsaechlich live laufenden Server, der bereits
// body.image erwartete.
//
// Ehrlich dokumentiert, weil es in dieser Sitzung selbst passiert ist:
// der ERSTE Versuch, diese Datei mit dem Live-Stand in Deckung zu bringen,
// war selbst unvollstaendig und hat die Datei kurzzeitig in einen
// nicht lauffaehigen Zustand gebracht (ein bearbeiteter Kopfteil traf auf
// unveraendert stehen gebliebenen alten Code darunter, der auf inzwischen
// entfernte Bezeichner wie GEMINI_API_KEY/mimeType/base64Data verwies, dazu
// eine offene geschweifte Klammer ohne zugehoeriges try). Das wurde beim
// erneuten, vollstaendigen Gegenlesen dieser Datei noch in derselben
// Sitzung gefunden, bevor irgendetwas deployt oder committet wurde - siehe
// CLAUDE.md's Grundsatz, jede Aenderung tatsaechlich zu verifizieren statt
// nur den eigenen vorherigen Schritt anzunehmen. Der folgende Code ist das
// Ergebnis eines zweiten, vollstaendigen Abgleichs per
// mcp__Supabase__get_edge_function gegen den bestaetigten Live-Stand v16 -
// Zeile fuer Zeile, nicht nur der Kopfteil:
//   - json() als benannte Funktion statt Arrow-Function (rein stilistisch,
//     funktional identisch).
//   - corsHeaders um "Access-Control-Allow-Methods": "POST, OPTIONS"
//     ergaenzt.
//   - resolveImage() gibt bei jedem Fehlschlag still null zurueck statt zu
//     werfen (kein try/catch-Unterschied mehr zwischen Bild-Ladefehlern und
//     echten Serverfehlern); Rueckgabeform {mimeType,data}|null statt
//     {mimeType,base64Data}.
//   - Deno.serve prueft die Methode jetzt explizit (405 "Nur POST
//     erlaubt." fuer alles ausser POST/OPTIONS).
//   - Das kritische Feld: body.image statt body.image_base64.
//   - Fehlermeldung bei fehlendem Bild: "Kein gueltiges Bild/PDF
//     uebergeben." statt "Kein Bild übermittelt." (entspricht exakt dem
//     gemeldeten Fehlertext).
//   - Der Gemini-Aufruf ist jetzt in einen AbortController mit 25s-Timeout
//     gefasst; ein Abbruch liefert 504 "Zeitüberschreitung bei der
//     Erkennung (25s)." statt eines haengenden Requests.
//   - Der !res.ok-Zweig liest die Antwort jetzt als Rohtext (res.text(),
//     auf 300 Zeichen gekuerzt) statt sie zwingend als JSON zu parsen -
//     eine Nicht-JSON-Fehlerantwort von Gemini fuehrte vorher zu einem
//     zusaetzlichen, verschleiernden Parse-Fehler.
//   - Der Markdown-Codeblock-Trim vor JSON.parse(raw) ist entfallen (im
//     Live-Code nie vorhanden - responseMimeType:"application/json"
//     erzwingt bereits reines JSON ohne Codeblock-Huelle).
//   - Der catch-Block unterscheidet jetzt AbortError (504) von jedem
//     anderen Fehler (weiterhin 500).
// generationConfig und der komplette Prompt-Text (inkl. der v16-Absatz-/
// Zwischentitel-Logik) waren bereits identisch zum Live-Stand und bleiben
// unveraendert.

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
{"pos":"<Positionsnummer als Text, falls vorhanden, sonst leerer String>","description":"<Bezeichnung/Beschreibung der Position>","quantity":<Menge als Zahl, falls nicht lesbar: 0>,"unit":"<Einheit, z.B. Stk, m2, m, h, kg>"}

Wichtig für "description" - eine Position ist oft mehrzeilig:
- Eine einzelne Position besteht häufig aus einer ersten Zeile mit Positionsnummer/Kurztitel, gefolgt von einer oder mehreren Fliesstext-Zeilen (Material, Ausführung, Masse, Bemerkungen), bevor Menge/Einheit/Preis stehen oder die nächste Position beginnt. Nimm den GESAMTEN zusammengehörigen Text dieser Position in "description" auf, nicht nur die erste Zeile mit der Positionsnummer - verbinde alle Zeilen zu einem lesbaren, zusammenhängenden Fliesstext.
- Das Dokument kann fett gedruckte Zwischentitel/Abschnittsüberschriften enthalten (z.B. "Bedachung", "Spenglerarbeiten Dach Nord", "Kamineinfassungen"), die selbst keine eigene Position mit Menge/Einheit sind, sondern nur eine Gruppe nachfolgender Positionen einleiten. Gib einen solchen Zwischentitel NICHT als eigenes Array-Element aus. Stelle seinen Text stattdessen jeder Position, die darunter steht, in "description" voran, getrennt durch " – " (z.B. "Bedachung – Biberschwanzziegel liefern und verlegen ..."), damit der fachliche Zusammenhang erhalten bleibt. Wechselt der Zwischentitel im Dokument, gilt der neue Titel ab dort für die folgenden Positionen, bis der nächste Zwischentitel kommt.

Überschriften, Zwischentitel, Summenzeilen, MWST-Zeilen und Titelzeilen NICHT als eigene Position aufnehmen, nur echte, einzeln aufgeführte Leistungspositionen.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
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
        }),
      },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return json({ ok: false, error: `Server antwortete mit Status ${res.status}: ${errText.slice(0, 300)}` }, 502);
    }

    const data = await res.json();
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
      return json({ ok: false, error: "Zeitüberschreitung bei der Erkennung (25s)." }, 504);
    }
    return json({ ok: false, error: `Unerwarteter Fehler: ${(err as Error)?.message ?? String(err)}` }, 500);
  }
});
