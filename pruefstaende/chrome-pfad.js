"use strict";
// Wo liegt Chromium?
//
// Das war bis v3.136 in jedem einzelnen Pruefstand fest verdrahtet, auf
// /opt/pw-browsers/chromium-1194/chrome-linux/chrome - einen Pfad, den es NUR
// in der Entwicklungsumgebung gibt. Auf dem GitHub-Runner existiert er nicht;
// dort legt "npx playwright-core install" den Browser in sein eigenes
// Verzeichnis unter ~/.cache/ms-playwright. Die CI war deshalb seit ihrer
// Einfuehrung rot - nicht wegen eines Fehlers in der App, sondern weil kein
// einziger Pruefstand den Browser starten konnte.
//
// Drei Stufen, in dieser Reihenfolge:
//   1. CHROME=... von Hand gesetzt - hat immer Vorrang.
//   2. der Pfad der Entwicklungsumgebung, WENN es ihn wirklich gibt.
//   3. sonst undefined - dann sucht playwright-core seinen eigenen Browser.
//
// Stufe 2 bleibt bewusst bestehen: die Chromium-Revision im Sandkasten ist
// nicht zwingend die, die das dort installierte playwright-core erwartet.
// Ohne sie wuerde die Entwicklungsumgebung brechen, um die CI zu reparieren -
// und der Zweck der Uebung ist, dass BEIDE laufen.
const fs = require("fs");

const ENTWICKLUNG = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

function chromePfad() {
 if (process.env.CHROME) return process.env.CHROME;
 try { if (fs.existsSync(ENTWICKLUNG)) return ENTWICKLUNG; } catch (e) { /* kein Zugriff -> Stufe 3 */ }
 return undefined;
}

module.exports = { chromePfad, ENTWICKLUNG };
