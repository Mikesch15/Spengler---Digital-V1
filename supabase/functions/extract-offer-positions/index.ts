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
// Diesen Quelltext gibt es seit v12 auch im Repo (dieselbe Uebung wie bei
// extract-profile-shape) - vorher war er nur ueber
// mcp__Supabase__get_edge_function abrufbar (CLAUDE.md §31.6/§144.3
// dokumentiert das ausdruecklich als bekannte Luecke). Wer diese Datei
// aendert, MUSS sie erneut per mcp__Supabase__deploy_edge_function
// veroeffentlichen - eine lokale Aenderung allein hat keine Wirkung.

const MODEL = "gemini-3.6-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function resolveImage(input: string): Promise<{ mimeType: string; base64Data: string }> {
  const dataUrlMatch = input.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUrlMatch) {
    return { mimeType: dataUrlMatch[1], base64Data: dataUrlMatch[2] };
  }

  if (/^https?:\/\//i.test(input)) {
    const imageRes = await fetch(input);
    if (!imageRes.ok) {
      throw new Error(`Bild konnte nicht geladen werden (HTTP ${imageRes.status}).`);
    }
    const contentType = imageRes.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Die Bild-URL lieferte keinen Bildinhalt (${contentType}).`);
    }
    const bytes = new Uint8Array(await imageRes.arrayBuffer());
    if (!bytes.length) throw new Error("Das Bild ist leer.");
    return { mimeType: contentType, base64Data: bytesToBase64(bytes) };
  }

  throw new Error("Ungültiges Bildformat: erwartet eine data:-URL oder HTTP(S)-Bild-URL.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return json({ ok: false, error: "Kein Bild übermittelt." }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return json({ ok: false, error: "GEMINI_API_KEY ist auf dem Server nicht gesetzt." }, 500);
    }

    const { mimeType, base64Data } = await resolveImage(image_base64);

    const prompt = `Du bekommst das Foto oder PDF-Dokument (ggf. mehrseitig) einer Offerte oder Rechnung eines Spenglerbetriebs.
Lies ALLE Positionszeilen aus der Tabelle heraus und gib sie als reines JSON-Array zurück.
Kein Erklärtext, kein Markdown-Codeblock, nur das Array selbst.
Jedes Element hat genau diese Felder:
{"pos":"<Positionsnummer als Text, falls vorhanden, sonst leerer String>","description":"<Bezeichnung/Beschreibung der Position>","quantity":<Menge als Zahl, falls nicht lesbar: 0>,"unit":"<Einheit, z.B. Stk, m2, m, h, kg>"}
Überschriften, Summenzeilen, MWST-Zeilen und Titelzeilen NICHT als Position aufnehmen, nur echte, einzeln aufgeführte Leistungspositionen.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 65536,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const data = await res.json();
    if (!res.ok) {
      return json({
        ok: false,
        error: data?.error?.message || "Anfrage an Gemini fehlgeschlagen.",
        geminiStatus: res.status,
      }, 502);
    }

    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;

    let raw = candidate?.content?.parts?.[0]?.text || "[]";
    raw = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let positions: unknown;
    try {
      positions = JSON.parse(raw);
      if (!Array.isArray(positions)) throw new Error("Antwort war kein Array.");
    } catch {
      if (finishReason === "MAX_TOKENS") {
        return json({
          ok: false,
          error: "Das Dokument enthält zu viele Positionen für eine einzelne Erkennung – die Antwort der KI wurde mitten im Satz abgeschnitten. Bitte das Dokument in kleineren Abschnitten hochladen oder die Positionen für diesen Teil von Hand erfassen.",
          geminiFinishReason: finishReason,
        }, 502);
      }
      return json({ ok: false, error: "Antwort der KI konnte nicht als Liste gelesen werden.", raw }, 502);
    }

    return json({ ok: true, positions });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
