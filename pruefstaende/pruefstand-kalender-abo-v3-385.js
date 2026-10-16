// v3.385: Kalender-Abo (ICS-Link, nur lesen). Prueft Serien-Aufloesung (js/91), Link-/Feed-Schutz, Abgleich-Plan, Sicherungen und statische Eigenschaften
// (Migration, Edge Function, Export-Sperre). Reine Node-Tests mit Fakes - ohne Netz und Datenbank.
const fs = require("fs"), path = require("path");
const wurzel = path.join(__dirname, "..");
const lies = (f) => fs.readFileSync(path.join(wurzel, f), "utf8");
let ok = 0, fail = 0;
const p = (b, t, z) => { if (b) { ok++; console.log("  ok  " + t); } else { fail++; console.log("  FEHLGESCHLAGEN: " + t + (z !== undefined ? "  " + JSON.stringify(z).slice(0, 500) : "")); } };
const icsLesen = new Function(lies("js/91-ics-parser.js") + ";return icsLesen;")();
const F = { von: "2026-10-01", bis: "2026-11-15" };
const kurz = (r) => r.termine.map((t) => [t.titel, t.start_datum, t.start_zeit, t.ende_datum, t.ende_zeit].join("|"));
const kal = (...ev) => "BEGIN:VCALENDAR\r\n" + ev.join("\r\n") + "\r\nEND:VCALENDAR";
const VE = (zeilen) => "BEGIN:VEVENT\r\n" + zeilen.join("\r\n") + "\r\nEND:VEVENT";

(async () => {
  const abo = await import(path.join(wurzel, "supabase/functions/kalender-abo/abo.js"));

  console.log("\nA · Serien (js/91 mit Fenster)");
  let r = icsLesen(kal(VE(["UID:w1", "SUMMARY:Montag", "DTSTART;TZID=W. Europe Standard Time:20260105T080000", "DTEND;TZID=W. Europe Standard Time:20260105T090000", "RRULE:FREQ=WEEKLY;BYDAY=MO", "EXDATE;TZID=W. Europe Standard Time:20261019T080000"]),
    VE(["UID:w1", "RECURRENCE-ID;TZID=W. Europe Standard Time:20261026T080000", "SUMMARY:Montag verschoben", "DTSTART;TZID=W. Europe Standard Time:20261026T100000", "DTEND;TZID=W. Europe Standard Time:20261026T110000"])), { fenster: F });
  const k = kurz(r);
  p(k.includes("Montag|2026-10-05|08:00|2026-10-05|09:00") && k.includes("Montag|2026-10-12|08:00|2026-10-12|09:00") && k.includes("Montag|2026-11-02|08:00|2026-11-02|09:00"), "Wöchentliche Serie wird im Fenster aufgelöst", k);
  p(!k.some((x) => x.includes("2026-10-19")), "EXDATE nimmt einen Termin aus der Serie");
  p(k.includes("Montag verschoben|2026-10-26|10:00|2026-10-26|11:00") && !k.includes("Montag|2026-10-26|08:00|2026-10-26|09:00"), "Verschobener Einzeltermin ersetzt den Serientermin (kein Doppel)");
  p(!k.some((x) => x.startsWith("Montag|2026-01") || x.startsWith("Montag|2026-12")), "Nur Termine im Fenster werden erzeugt");
  r = icsLesen(kal(VE(["UID:w1", "SUMMARY:S", "DTSTART:20261005T060000Z", "DTEND:20261005T070000Z", "RRULE:FREQ=WEEKLY;COUNT=3"]),
    VE(["UID:w1", "RECURRENCE-ID:20261012T060000Z", "STATUS:CANCELLED", "SUMMARY:S", "DTSTART:20261012T060000Z"])), { fenster: F });
  p(kurz(r).length === 2 && !kurz(r).some((x) => x.includes("10-12")), "COUNT=3 und abgesagter Einzeltermin → 2 Termine, der 12.10. fehlt", kurz(r));
  r = icsLesen(kal(VE(["UID:u", "SUMMARY:Sommer", "DTSTART:20260322T060000Z", "RRULE:FREQ=WEEKLY;COUNT=40"])), { fenster: { von: "2026-03-20", bis: "2026-11-30" } });
  const zeiten = r.termine.filter((t) => ["2026-03-22", "2026-06-07", "2026-10-25"].includes(t.start_datum)).map((t) => t.start_datum + " " + t.start_zeit).join(",");
  p(zeiten === "2026-03-22 07:00,2026-06-07 08:00,2026-10-25 07:00", "UTC-Serie wechselt mit der Sommerzeit mit (Winter 07:00, Sommer 08:00, wieder Winter 07:00)", zeiten);
  r = icsLesen(kal(VE(["UID:m", "SUMMARY:Monatsende", "DTSTART;VALUE=DATE:20260831", "DTEND;VALUE=DATE:20260901", "RRULE:FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=6"])), { fenster: F });
  p(kurz(r).join(",") === "Monatsende|2026-10-31||2026-10-31|", "Monatlich, letzter Tag (BYMONTHDAY=-1), ganztägig", kurz(r));
  r = icsLesen(kal(VE(["UID:n", "SUMMARY:Erster Mittwoch", "DTSTART;TZID=Europe/Zurich:20260107T150000", "DTEND;TZID=Europe/Zurich:20260107T160000", "RRULE:FREQ=MONTHLY;BYDAY=1WE"])), { fenster: F });
  p(kurz(r).join(",") === "Erster Mittwoch|2026-10-07|15:00|2026-10-07|16:00,Erster Mittwoch|2026-11-04|15:00|2026-11-04|16:00", "Monatlich, erster Mittwoch (BYDAY=1WE)", kurz(r));
  r = icsLesen(kal(VE(["UID:t", "SUMMARY:Alle 2 Wochen", "DTSTART;TZID=Europe/Zurich:20261001T070000", "DTEND;TZID=Europe/Zurich:20261001T080000", "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TH;UNTIL=20261028T000000Z"])), { fenster: F });
  p(kurz(r).length === 2 && kurz(r)[1].includes("2026-10-15"), "INTERVAL=2 und UNTIL werden beachtet (1.10., 15.10., danach nichts)", kurz(r));
  r = icsLesen(kal(VE(["UID:x", "SUMMARY:Exotisch", "DTSTART;TZID=Europe/Zurich:20261001T070000", "DTEND;TZID=Europe/Zurich:20261001T080000", "RRULE:FREQ=MONTHLY;BYDAY=MO,TU;BYSETPOS=-1"])), { fenster: F });
  p(r.termine.length === 1 && r.termine[0].start_datum === "2026-10-01" && r.hinweise.some((h) => /nicht unterstützt/.test(h)), "Nicht unterstützte Regel: nur erster Termin + Hinweis (nichts geraten)", { t: kurz(r), h: r.hinweise });
  r = icsLesen(kal(VE(["UID:q", "SUMMARY:Privat", "CLASS:PRIVATE", "DTSTART:20261007T060000Z"]), VE(["UID:o", "SUMMARY:Offen", "DTSTART:20261008T060000Z"])), { fenster: F, privatAus: true });
  p(kurz(r).length === 1 && kurz(r)[0].startsWith("Offen"), "Private Termine werden mit privatAus nie übernommen", kurz(r));
  r = icsLesen(kal(VE(["UID:q", "SUMMARY:Privat", "CLASS:PRIVATE", "DTSTART:20261007T060000Z"])), {});
  p(r.termine.length === 1, "Ohne privatAus (manueller Import) bleibt alles wie vorher");
  r = icsLesen(kal(VE(["UID:z", "SUMMARY:Serie", "DTSTART:20261007T060000Z", "RRULE:FREQ=DAILY;COUNT=5"])), {});
  p(r.termine.length === 1 && r.hinweise.some((h) => /nur der erste Termin/.test(h)), "Ohne Fenster (manueller Import) bleibt es beim ersten Termin wie bisher");
  r = icsLesen(kal(VE(["UID:d", "SUMMARY:Täglich", "DTSTART;TZID=Europe/Zurich:20200101T070000", "DTEND;TZID=Europe/Zurich:20200101T080000", "RRULE:FREQ=DAILY"])), { fenster: F });
  p(r.termine.length === 46, "Seit Jahren laufende tägliche Serie liefert nur das Fenster", r.termine.length);

  console.log("\nB · Link-Schutz");
  const u = (x) => abo.urlPruefen(x);
  p(u("webcal://outlook.office365.com/owa/calendar/abc/def/calendar.ics").ok && u("webcal://outlook.office365.com/owa/calendar/abc/def/calendar.ics").url.startsWith("https://"), "webcal:// wird zu https://");
  p(u("https://outlook.live.com/owa/calendar/x/y/reachcalendar.ics").ok, "outlook.live.com ist erlaubt");
  p(!u("http://outlook.live.com/x.ics").ok, "http (unverschlüsselt) wird abgelehnt");
  p(!u("https://evil.example.com/x.ics").ok && /nicht unterstützt/.test(u("https://evil.example.com/x.ics").fehler), "Fremde Anbieter werden abgelehnt");
  p(!u("https://127.0.0.1/x.ics").ok && !u("https://localhost/x.ics").ok && !u("https://169.254.169.254/latest").ok && !u("https://10.0.0.1/x.ics").ok, "Interne/lokale Adressen werden abgelehnt (SSRF)");
  p(!u("https://outlook.live.com.evil.com/x.ics").ok && !u("https://eviloutlook.live.com.attacker.io/x").ok, "Trick-Hosts (outlook.live.com.evil.com) werden abgelehnt");
  p(!u("https://user:pw@outlook.live.com/x.ics").ok && !u("https://outlook.live.com:8443/x.ics").ok, "Zugangsdaten in der Adresse und fremde Ports werden abgelehnt");
  p(!u("").ok && !u("kein link").ok && !u("javascript:alert(1)").ok && !u("file:///etc/passwd").ok, "Leer, Unsinn, javascript:, file: werden abgelehnt");

  console.log("\nC · Feed laden (Weiterleitungen, Grösse, Fehler)");
  const antw = (status, body, kopf) => ({ status, ok: status >= 200 && status < 300, headers: { get: (k) => (kopf || {})[k.toLowerCase()] || null }, text: async () => body, body: null });
  let t = await abo.feedLaden(async () => antw(200, "BEGIN:VCALENDAR"), "https://outlook.live.com/a.ics");
  p(t === "BEGIN:VCALENDAR", "Normaler Feed wird gelesen");
  let optGesehen = null;
  await abo.feedLaden(async (u2, init) => { optGesehen = init; return antw(200, "BEGIN:VCALENDAR"); }, "https://outlook.live.com/a.ics");
  p(optGesehen && optGesehen.redirect === "manual", "Weiterleitungen werden nie automatisch verfolgt (redirect: manual)", optGesehen);
  let fehler = null; const aufrufe = [];
  try { await abo.feedLaden(async (url) => { aufrufe.push(url); return antw(302, "", { location: "http://127.0.0.1/geheim" }); }, "https://outlook.live.com/a.ics"); } catch (e) { fehler = e; }
  p(fehler && fehler.code === "weiterleitung" && aufrufe.length === 1, "Weiterleitung auf eine interne Adresse wird NICHT verfolgt", { fehler: fehler && fehler.code, aufrufe });
  let n = 0; fehler = null;
  try { await abo.feedLaden(async () => { n++; return antw(302, "", { location: "https://outlook.live.com/b.ics" }); }, "https://outlook.live.com/a.ics"); } catch (e) { fehler = e; }
  p(fehler && fehler.code === "weiterleitung" && n === 4, "Endlose Weiterleitungen brechen nach 3 Sprüngen ab", { n, c: fehler && fehler.code });
  t = await abo.feedLaden(async (url) => (url.includes("/a.ics") ? antw(301, "", { location: "https://outlook.office365.com/b.ics" }) : antw(200, "OK")), "https://outlook.live.com/a.ics");
  p(t === "OK", "Weiterleitung zu einem erlaubten Anbieter wird verfolgt");
  for (const s of [401, 403, 404, 410]) { fehler = null; try { await abo.feedLaden(async () => antw(s, ""), "https://outlook.live.com/a.ics"); } catch (e) { fehler = e; } if (!(fehler && fehler.code === "link_ungueltig")) p(false, "HTTP " + s + " → link_ungueltig", fehler && fehler.code); }
  p(true, "HTTP 401/403/404/410 → „Link nicht mehr gültig“");
  fehler = null; try { await abo.feedLaden(async () => antw(200, "x", { "content-length": String(6 * 1024 * 1024) }), "https://outlook.live.com/a.ics"); } catch (e) { fehler = e; }
  p(fehler && fehler.code === "zu_gross", "Zu grosse Dateien (Content-Length) werden abgelehnt");
  fehler = null;
  try { await abo.feedLaden(async () => ({ status: 200, ok: true, headers: { get: () => null }, body: { getReader: () => { let i = 0; return { read: async () => (i++ < 7 ? { done: false, value: new Uint8Array(1024 * 1024) } : { done: true }), cancel: async () => {} }; } } }), "https://outlook.live.com/a.ics"); } catch (e) { fehler = e; }
  p(fehler && fehler.code === "zu_gross", "Zu grosse Dateien ohne Content-Length werden beim Lesen abgebrochen (5 MB)");
  fehler = null; try { await abo.feedLaden(async () => { throw new Error("dns"); }, "https://outlook.live.com/a.ics"); } catch (e) { fehler = e; }
  p(fehler && fehler.code === "netz" && !/outlook/.test(abo.fehlerText(fehler)), "Netzfehler: verständliche Meldung ohne Link-Inhalt");

  console.log("\nD · Abgleich (Plan und Lauf)");
  const feste = new Date("2026-10-16T09:00:00Z");
  const feed = (...ev) => kal(...ev);
  const E1 = VE(["UID:e1", "SUMMARY:Besprechung", "DTSTART;TZID=Europe/Zurich:20261020T080000", "DTEND;TZID=Europe/Zurich:20261020T090000"]);
  const E2 = VE(["UID:e2", "SUMMARY:Baustelle", "LOCATION:Bahnhofstr. 5", "DTSTART;VALUE=DATE:20261021", "DTEND;VALUE=DATE:20261022"]);
  const mkDb = (vorh) => { const d = { vorh, angelegt: [], geaendert: [], geloescht: [] };
    d.vorhanden = async () => d.vorh; d.anlegen = async (a) => { d.angelegt.push(...a); }; d.aendern = async (id, f) => { d.geaendert.push([id, f]); }; d.loeschen = async (ids) => { d.geloescht.push(...ids); }; return d; };
  let db = mkDb([]);
  let z = await abo.lauf({ db, aboId: 7, profilId: "u1", text: feed(E1, E2), lesen: icsLesen, jetzt: feste });
  p(z.neu === 2 && z.gefunden === 2 && db.angelegt.length === 2, "Erster Lauf legt beide Termine an", z);
  const a1 = db.angelegt.find((x) => x.titel === "Besprechung");
  p(a1.quelle === "abo" && a1.abo_id === 7 && a1.ics_uid === "abo7:e1" && JSON.stringify(a1.mitarbeiter) === '["u1"]' && a1.created_by === "u1" && a1.project_id === null && a1.start_zeit === "08:00", "Angelegte Termine: Quelle abo, abo_id, eigene UID, nur diese Person, kein Projekt", a1);
  db = mkDb(db.angelegt.map((x, i) => ({ ...x, id: i + 1 })));
  z = await abo.lauf({ db, aboId: 7, profilId: "u1", text: feed(E1, E2), lesen: icsLesen, jetzt: feste });
  p(z.neu === 0 && z.geaendert === 0 && z.entfernt === 0 && db.angelegt.length === 0, "Zweiter Lauf ohne Änderung: nichts doppelt, nichts geändert (idempotent)", z);
  const E1neu = VE(["UID:e1", "SUMMARY:Besprechung (neu)", "DTSTART;TZID=Europe/Zurich:20261020T090000", "DTEND;TZID=Europe/Zurich:20261020T100000"]);
  z = await abo.lauf({ db, aboId: 7, profilId: "u1", text: feed(E1neu, E2), lesen: icsLesen, jetzt: feste });
  p(z.geaendert === 1 && db.geaendert[0][0] === 1 && db.geaendert[0][1].titel === "Besprechung (neu)" && db.geaendert[0][1].start_zeit === "09:00", "Geänderter Termin im Kalender wird in der App nachgeführt", db.geaendert);
  db = mkDb(db.vorh);
  const viele = []; const vorh = [];
  for (let i = 1; i <= 10; i++) { viele.push(VE(["UID:v" + i, "SUMMARY:V" + i, "DTSTART;VALUE=DATE:202610" + String(10 + i), "DTEND;VALUE=DATE:202610" + String(11 + i)])); }
  db = mkDb([]); await abo.lauf({ db, aboId: 7, profilId: "u1", text: feed(...viele), lesen: icsLesen, jetzt: feste });
  const vorhV = db.angelegt.map((x, i) => ({ ...x, id: 100 + i }));
  db = mkDb(vorhV);
  z = await abo.lauf({ db, aboId: 7, profilId: "u1", text: feed(...viele.slice(0, 9)), lesen: icsLesen, jetzt: feste });
  p(z.entfernt === 1 && db.geloescht.length === 1, "Ein aus dem Kalender gelöschter Termin verschwindet auch in der App", z);
  db = mkDb(vorhV);
  z = await abo.lauf({ db, aboId: 7, profilId: "u1", text: feed(...viele.slice(0, 4)), lesen: icsLesen, jetzt: feste });
  p(z.entfernt === 0 && db.geloescht.length === 0 && z.hinweise.some((h) => /nichts gelöscht/.test(h)), "Massenhaftes Verschwinden (6 von 10) → nichts gelöscht + Hinweis", z);
  db = mkDb(vorhV);
  z = await abo.lauf({ db, aboId: 7, profilId: "u1", text: feed(), lesen: icsLesen, jetzt: feste });
  p(z.entfernt === 0 && db.geloescht.length === 0, "Leerer Kalender löscht nichts", z);
  let fe = null; db = mkDb(vorhV);
  try { await abo.lauf({ db, aboId: 7, profilId: "u1", text: "<html>Login</html>", lesen: icsLesen, jetzt: feste }); } catch (e) { fe = e; }
  p(fe && fe.code === "format" && db.geloescht.length === 0, "Eine Webseite statt Kalender: Fehler, nichts verändert");
  db = mkDb([{ id: 500, ics_uid: "abo7:alt", titel: "Alt", start_datum: "2026-01-02", ende_datum: "2026-01-02", start_zeit: null, ende_zeit: null }, ...vorhV]);
  z = await abo.lauf({ db, aboId: 7, profilId: "u1", text: feed(...viele), lesen: icsLesen, jetzt: feste });
  p(!db.geloescht.includes(500), "Termine ausserhalb des Fensters (Vergangenheit) bleiben stehen");
  db = mkDb([{ id: 900, ics_uid: "abo7:e1", titel: "Besprechung", start_datum: "2026-10-20", ende_datum: "2026-10-20", start_zeit: "08:00", ende_zeit: "09:00" }]);
  const pl = abo.plan({ aboId: 8, profilId: "u2", events: [], vorhanden: [], fenster: abo.fensterFuer(feste) });
  p(pl.neu.length === 0 && pl.loeschen.length === 0, "Leerer Plan bleibt leer");
  const E1b = VE(["UID:e1", "SUMMARY:Besprechung", "DTSTART;TZID=Europe/Zurich:20261020T080000", "DTEND;TZID=Europe/Zurich:20261020T090000"]);
  z = await abo.lauf({ db, aboId: 8, profilId: "u2", text: feed(E1b), lesen: icsLesen, jetzt: feste });
  p(z.neu === 1 && db.angelegt[0].ics_uid === "abo8:e1", "Dieselbe UID bei einem anderen Abo kollidiert nicht (UID trägt die Abo-Nummer)");
  const fen = abo.fensterFuer(feste);
  p(fen.von === "2026-10-09" && fen.bis === "2027-02-13", "Fenster: 7 Tage zurück bis 120 Tage voraus (Zürcher Tage)", fen);

  console.log("\nE · Statische Eigenschaften");
  const mig = lies("supabase/migrations/v3385_kalender_abo.sql"), fn = lies("supabase/functions/kalender-abo/index.ts"), ui = lies("js/96-kalender-abo.js"), core = lies("supabase/functions/outlook-sync/core.js");
  p(/enable row level security/.test(mig) && /tenant_boundary_kalender_abos[\s\S]*as restrictive/.test(mig), "Migration: RLS an, Firmen-Grenze RESTRICTIVE");
  p(/revoke insert, update, delete, truncate on public\.kalender_abos from anon, authenticated/.test(mig), "Migration: Benutzer können das Abo nicht direkt schreiben");
  p(/termine_abo_schreibschutz_upd[\s\S]*abo_id is null/.test(mig) && /termine_abo_schreibschutz_del/.test(mig) && /termine_abo_schreibschutz_ins/.test(mig), "Migration: abonnierte Termine sind für Benutzer schreibgeschützt (Update/Delete/Insert)");
  p(/vault\.create_secret/.test(mig) && /grant execute[\s\S]*to service_role/.test(mig) && /revoke all on function[\s\S]*from public, anon, authenticated/.test(mig), "Link liegt im Vault, Funktionen nur für service_role");
  p(!/url\s+text/i.test(mig.replace(/p_url text/g, "")), "Keine Spalte mit dem Link in einer lesbaren Tabelle");
  p(/on delete cascade/.test(mig.split("add column abo_id")[1] || ""), "Termine hängen per CASCADE am Abo (Abo beenden entfernt sie)");
  p(!/console\.(log|info|debug)/.test(fn) && !/console\.error\([^)]*\burl\b/.test(fn), "Edge Function loggt nie den Link oder Inhalte");
  p(/outlook_cron_pruefen/.test(fn) && /x-cron-secret/.test(fn) && /my_company_id/.test(fn), "Edge Function prüft Cron-Geheimnis bzw. Benutzer + aktive Firma selbst");
  p(!/body\.(company_id|profile_id|firma)/.test(fn), "Edge Function nimmt nie Firma oder Person vom Client");
  p(/urlPruefen\(body\.url\)/.test(fn) && fn.indexOf("feedLaden(holen, p.url)") < fn.indexOf("kalender_abo_url_speichern"), "Link wird zuerst geprüft und gelesen, DANN gespeichert");
  p(!/(client_secret|service_role_key)\s*[:=]\s*["'][A-Za-z0-9]/i.test(fn + lies("supabase/functions/kalender-abo/abo.js")), "Keine Geheimnisse im Code");
  p(/quelle === "abo"\) return false/.test(core), "Export-Sperre: abonnierte Termine werden nie nach Outlook/Google zurückgeschrieben");
  p(!/\.insert\(|\.update\(|\.delete\(|\.from\("termine"\)/.test(ui) && /kalender_abos/.test(ui), "Browser schreibt nie selbst Termine/Abo (nur lesen; Schreiben macht der Server)");
  p(!/localStorage|sessionStorage/.test(ui) && /feld\.value=""/.test(ui), "Der Link wird nicht im Browser gespeichert und nach dem Absenden aus dem Feld geleert");
  const werk = require("child_process").spawnSync("node", ["werkzeug-abo-ics.js", "--pruefen"], { cwd: wurzel });
  p(werk.status === 0, "ics.js auf dem Server ist aus js/91 abgeleitet und aktuell (kein Doppelcode)", String(werk.stdout));
  p(lies("sw.js").includes('"./js/96-kalender-abo.js"') && lies("index.html").includes('src="js/96-kalender-abo.js"'), "js/96 steht in App-Shell (sw.js) und index.html");

  console.log("\n" + ok + " ok, " + fail + " fehlgeschlagen");
  process.exit(fail ? 1 : 0);
})();
