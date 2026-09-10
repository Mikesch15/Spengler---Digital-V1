/*
 * pruefstand-absatz-zwischentitel-v3-44.js
 *
 * Prueft die in CLAUDE.md §148.9/§149 angekuendigte Folgeverbesserung der
 * Positionserkennung (Edge Function "extract-offer-positions", v15 -> v16):
 *
 *   1. Je Position wurde bisher nur die eine Zeile mit der Positionsnummer
 *      gelesen, nicht der ganze dazugehoerige, oft mehrzeilige Absatz
 *      (Material, Ausfuehrung, Masse, Bemerkungen).
 *   2. Fett gedruckte Zwischentitel/Abschnittsueberschriften im PDF wurden
 *      korrekt NICHT als eigene Position aufgenommen, aber ihr fachlicher
 *      Zusammenhang ging dabei vollstaendig verloren, statt an den
 *      darunterstehenden Positionen erhalten zu bleiben.
 *
 * Architektonische Randbedingung (am Code geprueft, nicht angenommen):
 * js/17-ausmass.js's recognizePhoto() - die einzige, von js/63-angebote.js
 * unveraendert wiederverwendete Konsumentenfunktion - liest per .map() aus
 * jeder Gemini-Antwort strikt genau die vier Felder
 * pos/description/quantity/unit heraus. Eine Loesung durfte deshalb KEIN
 * neues Feld einfuehren und musste ohne jede Aenderung an js/17-ausmass.js
 * oder js/63-angebote.js auskommen.
 *
 * Der Fix (v16) aendert AUSSCHLIESSLICH den Prompt-Text der Edge Function:
 *   - eine neue Anweisung verlangt, alle Fliesstext-Zeilen einer Position
 *     bis zur naechsten Positionsnummer bzw. bis Menge/Einheit/Preis zu
 *     einem zusammenhaengenden Text in "description" zu verbinden;
 *   - eine neue Anweisung verlangt, einen erkannten fett gedruckten
 *     Zwischentitel weiterhin NICHT als eigene Position auszugeben, seinen
 *     Text aber jeder darunterstehenden Position in "description"
 *     voranzustellen (getrennt durch " - "), bis ein neuer Zwischentitel
 *     folgt.
 * generationConfig (maxOutputTokens:65536, thinkingConfig:
 * {thinkingLevel:"LOW"}, responseMimeType:"application/json") bleibt dabei
 * unveraendert aus v15 - dieser Fix aendert ausschliesslich den
 * Prompt-Text, nicht das Anfrageformat, das Antwortformat, die
 * Fehlerbehandlung oder den MAX_TOKENS-Notfall aus v12.
 *
 * Diese Runde ist rein serverseitig (Edge Function). Kein Client-Code
 * wurde geaendert - der Pruefstand belegt das ausdruecklich ueber die
 * mussUnberuehrtSein-Liste (Abschnitt E).
 *
 * GEGENPROBE (manuell durchzufuehren, nicht Teil dieser Datei):
 *   1. Baum sichern (z.B. cp supabase/functions/extract-offer-positions/
 *      index.ts /tmp/index.ts.bak-v344).
 *   2. In index.ts die beiden neuen Anweisungssaetze (den ganzen Absatz ab
 *      "Wichtig fuer \"description\"" bis vor die bestehende
 *      "Ueberschriften, Zwischentitel, ..."-Zeile) entfernen, sodass der
 *      Prompt wieder dem Stand aus v15 entspricht.
 *   3. Pruefstand erneut ausfuehren - erwartet werden genau die
 *      strukturellen Fehlschlaege aus Abschnitt A (der Absatz- und der
 *      Zwischentitel-Block), alle anderen Pruefungen bleiben gruen.
 *   4. Datei aus der Sicherung wiederherstellen, Pruefstand erneut
 *      ausfuehren - erwartet wird wieder der vollstaendige gruene Lauf.
 */
const { chromium } = require(process.env.SP + "/node_modules/playwright-core");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const repo = path.resolve(__dirname, "..");
let ok = 0, fail = 0;
function p(bedingung, beschreibung, wert) {
  if (bedingung) { ok++; }
  else { fail++; console.log("FEHLGESCHLAGEN: " + beschreibung + (wert !== undefined ? " " + JSON.stringify(wert) : "")); }
}

(async () => {
  // ---------------------------------------------------------------------
  // Abschnitt A - Struktur: der tatsaechliche Quelltext der Edge Function
  // ---------------------------------------------------------------------
  const quelltextRoh = fs.readFileSync(
    path.join(repo, "supabase/functions/extract-offer-positions/index.ts"),
    "utf8"
  );
  // Kommentare (Zeilen mit // am Zeilenanfang, ggf. eingerueckt) entfernen,
  // damit eine Pruefung nicht durch einen erklaerenden Kommentar besteht,
  // der den tatsaechlichen Code nur beschreibt statt ihn zu enthalten.
  const quelltext = quelltextRoh.split("\n").filter(z => !/^\s*\/\//.test(z)).join("\n");

  // --- A1: die neue Absatz-Anweisung ist vorhanden ---
  p(
    quelltext.includes('Nimm den GESAMTEN zusammengehörigen Text dieser Position in "description" auf'),
    "die neue Anweisung 'GESAMTEN zusammengehoerigen Text ... in description' ist im tatsaechlichen Prompt-Text vorhanden"
  );
  p(
    quelltext.includes("nicht nur die erste Zeile mit der Positionsnummer"),
    "die Anweisung nennt ausdruecklich, dass nicht nur die erste Zeile gelesen werden darf"
  );
  p(
    quelltext.includes("verbinde alle Zeilen zu einem lesbaren, zusammenhängenden Fliesstext"),
    "die Anweisung verlangt das Verbinden aller Zeilen zu einem zusammenhaengenden Fliesstext"
  );
  p(
    quelltext.includes("oft mehrzeilig"),
    "der Prompt weist ausdruecklich darauf hin, dass eine Position oft mehrzeilig ist"
  );

  // --- A2: die neue Zwischentitel-Anweisung ist vorhanden ---
  p(
    quelltext.includes("fett gedruckte Zwischentitel"),
    "der Prompt beschreibt fett gedruckte Zwischentitel"
  );
  p(
    quelltext.includes("Gib einen solchen Zwischentitel NICHT als eigenes Array-Element aus"),
    "die Anweisung verlangt ausdruecklich, einen Zwischentitel NICHT als eigene Position auszugeben"
  );
  p(
    quelltext.includes('Stelle seinen Text stattdessen jeder Position, die darunter steht, in "description" voran'),
    "die Anweisung verlangt, den Zwischentitel-Text jeder folgenden Position voranzustellen"
  );
  p(
    quelltext.includes('getrennt durch " – "'),
    "die Anweisung nennt das Trennzeichen ' – ' zwischen Zwischentitel und Positionstext"
  );
  p(
    quelltext.includes("Wechselt der Zwischentitel im Dokument, gilt der neue Titel ab dort für die folgenden Positionen, bis der nächste Zwischentitel kommt"),
    "die Anweisung beschreibt das Rollen auf einen neuen Zwischentitel bis zum naechsten"
  );

  // --- A3: die bestehende Regel bleibt erhalten (Ueberschriften nie als eigene Position) ---
  p(
    quelltext.includes("Überschriften, Zwischentitel, Summenzeilen, MWST-Zeilen und Titelzeilen NICHT als eigene Position aufnehmen"),
    "die bestehende Abschlussregel (keine Ueberschriften/Summen/MWST als eigene Position) ist unveraendert vorhanden"
  );

  // --- A4: kein neues JSON-Feld eingefuehrt - weiterhin genau die vier Felder ---
  const feldSchemaMatch = quelltext.match(/\{"pos":"[^}]*\}/);
  p(!!feldSchemaMatch, "das Antwortschema-Beispiel im Prompt ist vorhanden");
  if (feldSchemaMatch) {
    const schema = feldSchemaMatch[0];
    p(schema.includes('"pos"') && schema.includes('"description"') && schema.includes('"quantity"') && schema.includes('"unit"'),
      "das Schema-Beispiel enthaelt weiterhin genau pos/description/quantity/unit");
    p(!/"[a-z_]+":/i.test(schema.replace(/"pos"|"description"|"quantity"|"unit"/g, "")),
      "das Schema-Beispiel enthaelt KEIN fuenftes Feld", schema);
  }

  // --- A5: generationConfig ist EXAKT unveraendert aus v15 ---
  // Anker auf die echte 10-Leerzeichen-Einrueckung der schliessenden Klammer
  // (nicht die erste "}," im Text - die steckt bereits in
  // "thinkingConfig: { thinkingLevel: \"LOW\" }," selbst, siehe Kommentar
  // in index.ts Zeile 297).
  const genConfMatch = quelltext.match(/generationConfig:\s*\{([\s\S]*?)\n {10}\},/);
  p(!!genConfMatch, "generationConfig ist im Code vorhanden");
  if (genConfMatch) {
    const genConfText = genConfMatch[1];
    p(genConfText.includes("maxOutputTokens: 65536"), "maxOutputTokens ist weiterhin 65536 (unveraendert aus v13/v15)");
    p(genConfText.includes('thinkingLevel: "LOW"'), "thinkingConfig:{thinkingLevel:\"LOW\"} ist weiterhin gesetzt (unveraendert aus v15)");
    p(!genConfText.includes("thinkingBudget"), "thinkingBudget kommt weiterhin nirgends vor (der v13-Fehler darf nicht zurueckkehren)");
    p(genConfText.includes('responseMimeType: "application/json"'), "responseMimeType ist weiterhin application/json");
    const genConfFelder = (genConfText.match(/^\s*[a-zA-Z]+:/gm) || []).map(z => z.trim().replace(":", ""));
    p(genConfFelder.length === 3 && genConfFelder.includes("maxOutputTokens") && genConfFelder.includes("thinkingConfig") && genConfFelder.includes("responseMimeType"),
      "generationConfig enthaelt GENAU maxOutputTokens, thinkingConfig und responseMimeType - kein weiterer Rest, dieser Fix aendert nur den Prompt-Text",
      genConfFelder);
  }

  // --- A6: der MAX_TOKENS-Notfall aus v12 ist unveraendert vorhanden ---
  p(
    quelltext.includes("finishReason === \"MAX_TOKENS\""),
    "der MAX_TOKENS-Sonderfall wird weiterhin geprueft"
  );
  p(
    quelltext.includes("Das Dokument enthält zu viele Positionen für eine einzelne Erkennung"),
    "die ehrliche MAX_TOKENS-Meldung aus v3.40 ist unveraendert vorhanden"
  );
  p(
    quelltext.includes("geminiFinishReason"),
    "das Diagnosefeld geminiFinishReason wird weiterhin mitgegeben"
  );

  // --- A7: der generische Fehlerpfad und der Erfolgspfad sind unveraendert ---
  p(
    quelltext.includes("Antwort der KI konnte nicht als Liste gelesen werden."),
    "die generische Fehlermeldung ist unveraendert vorhanden"
  );
  p(
    quelltext.includes("ok: true, positions") || quelltext.includes("ok: true,\n") || /ok:\s*true,\s*positions/.test(quelltext),
    "der Erfolgspfad (ok:true, positions) ist unveraendert vorhanden"
  );
  p(
    /!res\.ok/.test(quelltext) && quelltext.includes("Anfrage an Gemini fehlgeschlagen"),
    "der !res.ok-Zweig (dort, wo der v3.43-Fehler tatsaechlich entstand) ist unveraendert vorhanden"
  );

  // --- A8: resolveImage()/bytesToBase64() sind unveraendert - kein zweiter Erkennungsweg ---
  p(
    quelltext.includes("function resolveImage") || quelltext.includes("async function resolveImage") || quelltext.includes("resolveImage("),
    "resolveImage() ist weiterhin vorhanden"
  );
  p(
    quelltext.includes("bytesToBase64"),
    "bytesToBase64() ist weiterhin vorhanden"
  );

  // ---------------------------------------------------------------------
  // Abschnitt B/C/D - Verhalten: der Client verarbeitet die Antworten
  // unveraendert ueber die vier bestehenden Felder.
  // ---------------------------------------------------------------------
  const ATTRAPPE = `
window.supabase = {
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "test-user" } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
      signOut: async () => ({ error: null }),
    },
    from: (tabelle) => {
      const q = {
        select: () => q, eq: () => q, order: () => q, in: () => q, limit: () => q,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
        insert: () => q, update: () => q, upsert: () => q, delete: () => q,
        then: (resolve) => resolve({ data: [], error: null }),
      };
      return q;
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: "x" }, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: "https://beispiel.test/x.pdf" }, error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
  }),
};
`;

  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  const jsFehler = [];
  page.on("pageerror", (err) => jsFehler.push(String(err)));
  page.on("console", (msg) => { if (msg.type() === "error" && !/favicon/i.test(msg.text())) { /* nur zur Diagnose, kein Abbruch */ } });

  await page.route("**://cdn.jsdelivr.net/**", (route) => {
    route.fulfill({ status: 200, contentType: "application/javascript", body: ATTRAPPE });
  });

  let antwortModus = "erfolg_absatz_zwischentitel";
  await page.route("**/functions/v1/extract-offer-positions", (route) => {
    if (antwortModus === "erfolg_absatz_zwischentitel") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          positions: [
            {
              pos: "211.100",
              description: "Bedachung – Biberschwanzziegel liefern und verlegen, Doppeldeckung, Farbe naturrot, inkl. Firstziegel und Ortgangausbildung nach Muster des Architekten",
              quantity: 145.5,
              unit: "m2",
            },
            {
              pos: "211.200",
              description: "Bedachung – Unterdach aus diffusionsoffener Bahn, überlappend verlegt und verklebt, inkl. Konterlattung 30/50mm",
              quantity: 145.5,
              unit: "m2",
            },
            {
              pos: "312.010",
              description: "Kamineinfassungen – Kamin einfassen mit Titanzinkblech 0.7mm, blank, inkl. Wasserfalz und Dilatation",
              quantity: 1,
              unit: "Stk",
            },
          ],
        }),
      });
    } else if (antwortModus === "erfolg_lang") {
      const positions = [];
      for (let i = 1; i <= 40; i++) {
        positions.push({
          pos: String(100 + i),
          description: "Position " + i + " – langer, aus mehreren Zeilen zusammengefuehrter Beschreibungstext mit Material, Ausfuehrung und Massen",
          quantity: i,
          unit: "Stk",
        });
      }
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, positions }) });
    } else if (antwortModus === "max_tokens") {
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: "Das Dokument enthält zu viele Positionen für eine einzelne Erkennung – die Antwort der KI wurde mitten im Satz abgeschnitten. Bitte das Dokument in kleineren Abschnitten hochladen oder die Positionen für diesen Teil von Hand erfassen.",
          geminiFinishReason: "MAX_TOKENS",
        }),
      });
    } else if (antwortModus === "generisch") {
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Antwort der KI konnte nicht als Liste gelesen werden.", raw: "kaputtes json" }),
      });
    }
  });

  const dateiUrl = "file://" + path.join(repo, "index.html");
  await page.goto(dateiUrl);

  // WICHTIG: die App laedt ihre Dateien als klassische (nicht-module)
  // <script>-Tags. Ein top-level "let" in einer solchen Datei landet im
  // gemeinsamen Global Declarative Environment Record der Seite - als
  // BLOSSER Bezeichner in jedem anderen Script sichtbar, aber NICHT als
  // window.X-Eigenschaft. currentProfile/allProfiles/settings/
  // employeeIds/allProjects (js/01-basis.js), meineRechte
  // (js/05a-rechte.js), cockpitProjectId (js/24-projekt-cockpit.js) und
  // offerteZugriff/angPositions (js/63-angebote.js) sind alle so
  // deklariert - ein window.X=... waere fuer den echten App-Code
  // unsichtbar. Bestaetigtes Muster aus pruefstand-thinking-level-v3-43.js
  // Zeile 259-262: bloss zuweisen, nicht ueber window.
  await page.evaluate(() => {
    currentProfile = { id: "test-user", company_id: "firma-1", role: "admin", first_name: "Test", last_name: "Person" };
    allProfiles = [currentProfile];
    meineRechte = { projects: { can_view: true, can_edit: true } };
    allProjects = [{ id: 1, name: "Testprojekt", company_id: "firma-1", archived: false, status: "in_arbeit" }];
    settings = settings || {};
    employeeIds = employeeIds || [];
    cockpitProjectId = 1;
    if (typeof $ === "function") {
      if ($("appRoot")) $("appRoot").hidden = false;
      if ($("authScreen")) $("authScreen").hidden = true;
    }
  });

  const hatCheckOfferteZugriff = await page.evaluate(() => typeof checkOfferteZugriff === "function");
  if (hatCheckOfferteZugriff) {
    await page.evaluate(async () => { try { await checkOfferteZugriff(); } catch (e) { /* ignorieren, nur Zugriff freischalten */ } });
  }
  await page.evaluate(() => { offerteZugriff = true; });

  page.on("dialog", (d) => { (page.__dialoge = page.__dialoge || []).push(d.message()); d.accept(); });

  const hatNewAngebot = await page.evaluate(() => typeof newAngebot === "function");
  p(hatNewAngebot, "newAngebot() ist im geladenen Code vorhanden");

  async function erkennungDurchlauf(modus) {
    antwortModus = modus;
    const dialogeVorher = (page.__dialoge || []).length;
    await page.evaluate(() => { if (typeof newAngebot === "function") newAngebot(); });
    await page.waitForTimeout(50);
    const pdfInput = page.locator("#angPdfInput");
    if (await pdfInput.count()) {
      await pdfInput.setInputFiles({
        name: "offerte.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\ninhalt\n%%EOF"),
      });
    }
    const knopf = page.locator("[data-ang-pdf-erkennen]");
    if (await knopf.count()) {
      await knopf.first().click({ force: true }).catch(() => {});
    } else {
      await page.evaluate(async () => {
        if (typeof angPdfErkennen === "function") { try { await angPdfErkennen(); } catch (e) {} }
      });
    }
    await page.waitForTimeout(300);
    const positionen = await page.evaluate(() => (Array.isArray(angPositions) ? angPositions.length : 0));
    const positionenListe = await page.evaluate(() => (Array.isArray(angPositions) ? angPositions.slice() : []));
    const statusText = await page.evaluate(() => {
      const el = document.getElementById("angRecognizeStatus");
      return el ? el.textContent : "";
    });
    // Bei einem Fehlschlag leert der App-Code (js/63-angebote.js:399, exakt
    // wie im schon bestehenden Foto-Weg Zeile 232-234) angRecognizeStatus
    // bewusst und zeigt die eigentliche Meldung stattdessen per alert() -
    // dieselbe App-Konvention wie bei jedem anderen Fehler in dieser Datei
    // (Speichern, Foto laden, Upload). Der Fehlertext steht deshalb im
    // Dialogfenster, nicht im Statustext.
    const neueDialoge = (page.__dialoge || []).slice(dialogeVorher);
    return { positionen, positionenListe, statusText, dialoge: neueDialoge };
  }

  // --- B: ein Treffer mit mehrzeiliger, absatzweise zusammengefuehrter
  //        description UND mit Zwischentitel-Praefix (" – ") fliesst
  //        unveraendert durch die vier-Felder-Pipeline des Clients ---
  const ergB = await erkennungDurchlauf("erfolg_absatz_zwischentitel");
  p(ergB.positionen === 3, "drei erkannte Positionen werden vollstaendig uebernommen", ergB.positionen);
  if (ergB.positionenListe.length) {
    const erste = ergB.positionenListe[0];
    p(!!erste && typeof erste.description === "string" && erste.description.includes("Bedachung – Biberschwanzziegel"),
      "die erste Position traegt den Zwischentitel-Praefix 'Bedachung – ' in description", erste && erste.description);
    p(!!erste && erste.description.length > 60,
      "die description ist der volle, mehrzeilig zusammengefuehrte Absatz und nicht nur eine kurze erste Zeile",
      erste && erste.description && erste.description.length);
    const dritte = ergB.positionenListe[2];
    p(!!dritte && typeof dritte.description === "string" && dritte.description.startsWith("Kamineinfassungen – "),
      "eine spaetere Position traegt ihren eigenen, gewechselten Zwischentitel", dritte && dritte.description);
  }
  p(typeof ergB.statusText === "string" && /3/.test(ergB.statusText),
    "die Statuszeile nennt die Anzahl der uebernommenen Positionen", ergB.statusText);

  // --- weiterer Regressionsschutz: ein groesserer Treffer wird vollstaendig ---
  const ergBlang = await erkennungDurchlauf("erfolg_lang");
  p(ergBlang.positionen === 40, "auch 40 Positionen werden ohne clientseitige Kappung vollstaendig uebernommen", ergBlang.positionen);

  // --- C: der MAX_TOKENS-Notfall aus v3.40 bleibt unveraendert erreichbar,
  //        ohne je eine Position zu erfinden. Der App-Code (js/63-
  //        angebote.js:398-400) leert bei einem Fehler den Statustext
  //        bewusst und zeigt die Meldung stattdessen per alert() - exakt
  //        dieselbe Konvention wie beim bestehenden Foto-Weg (Zeile
  //        232-234) und wie ueberall sonst in dieser Datei (Speichern,
  //        Upload, Foto laden). Geprueft wird deshalb der Dialogtext. ---
  const ergC = await erkennungDurchlauf("max_tokens");
  p(ergC.positionen === 0, "im MAX_TOKENS-Fall wird KEINE Position erfunden", ergC.positionen);
  p(ergC.statusText === "", "der Statustext wird im Fehlerfall bewusst geleert (wie beim Foto-Weg)", ergC.statusText);
  p(ergC.dialoge.length === 1 && /zu viele Positionen|abgeschnitten/.test(ergC.dialoge[0]),
    "die MAX_TOKENS-Meldung erreicht die Person unveraendert ueber den bestehenden alert()-Weg", ergC.dialoge);

  // --- D: der alte, generische Fehlerfall bleibt unveraendert (Regressionsschutz) ---
  const ergD = await erkennungDurchlauf("generisch");
  p(ergD.positionen === 0, "im generischen Fehlerfall wird ebenfalls KEINE Position erfunden", ergD.positionen);
  p(ergD.dialoge.length === 1 && ergD.dialoge[0].length > 0,
    "auch der generische Fehlerfall zeigt eine Meldung ueber den bestehenden alert()-Weg", ergD.dialoge);

  await browser.close();

  // ---------------------------------------------------------------------
  // Abschnitt E - Struktur: keine geschuetzte Datei wurde angefasst
  // ---------------------------------------------------------------------
  const mussUnberuehrtSein = [
    "js/17-ausmass.js", "js/24-projekt-cockpit.js", "js/05a-rechte.js", "js/63-angebote.js",
    "js/06-rapport.js", "js/08-katalog-blitzschutz.js", "css/03-druck.css", "css/04-rechte.css",
    "js/09-projekte.js", "js/10-massaufnahme.js",
    "js/44-workflow.js", "js/45-aufgaben.js", "js/48-projekt-material.js",
    "js/49-projekt-zuschnitt.js", "js/50-reservierung.js", "js/51-werkstatt.js",
    "js/56-material-zuschnitt.js", "js/58-ruestliste.js", "js/60-ruestskizzen.js",
    "js/11-einlaufblech-gerade.js", "js/12-rinne-halbrund.js", "js/13-einlaufblech-konisch.js",
    "js/14-freies-profil.js", "js/19-lukarne.js", "js/20-anschlussblech.js",
    "js/21-einfassung-rund.js", "js/25-kehle.js", "js/26-rinne.js", "js/29-einlaufblech-aufnahme.js",
    "js/34-kehle-aufnahme.js", "js/37-kamin-aufnahme.js", "js/38-einfassung-aufnahme.js",
    "js/39-rinne-aufnahme.js", "js/40-anschlussblech-aufnahme.js", "js/61-materialstaerke.js",
    "js/64-ausfuehrung.js", "js/65-leistungen.js",
  ];
  let geaenderteDateien = [];
  try {
    const diff = execSync("git diff --name-only HEAD -- . && git ls-files --others --exclude-standard", { cwd: repo, encoding: "utf8" });
    geaenderteDateien = diff.split("\n").map(z => z.trim()).filter(Boolean);
  } catch (e) {
    geaenderteDateien = [];
  }
  const betroffen = mussUnberuehrtSein.filter(f => geaenderteDateien.includes(f));
  p(betroffen.length === 0, "keine geschuetzte Fachdatei wurde fuer diesen rein serverseitigen Fix angefasst", betroffen);

  const recognizeDefs = (() => {
    try {
      const ausmass = fs.readFileSync(path.join(repo, "js/17-ausmass.js"), "utf8");
      const angebote = fs.readFileSync(path.join(repo, "js/63-angebote.js"), "utf8");
      return {
        inAusmass: /function\s+recognizePhoto\s*\(/.test(ausmass) || /recognizePhoto\s*=\s*async/.test(ausmass),
        nachgebautInAngebote: /function\s+recognizePhoto\s*\(/.test(angebote),
      };
    } catch (e) { return { inAusmass: false, nachgebautInAngebote: true }; }
  })();
  p(recognizeDefs.inAusmass, "recognizePhoto() ist weiterhin (einzig) in js/17-ausmass.js definiert");
  p(!recognizeDefs.nachgebautInAngebote, "js/63-angebote.js baut recognizePhoto() nicht nach - kein zweiter Erkennungsweg");

  p(jsFehler.length === 0, "keine unbehandelten JavaScript-Fehler im gesamten Lauf", jsFehler);

  console.log("\n=== " + ok + " bestanden, " + fail + " fehlgeschlagen");
  process.exit(fail ? 1 : 0);
})();
