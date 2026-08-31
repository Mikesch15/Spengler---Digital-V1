/* Service Worker für Spengler-DIGITAL
   Aufgabe: die App-Hülle (HTML, CSS, JS, Icons) offline verfügbar halten.
   Die Daten selbst kommen weiterhin live von Supabase.

   WICHTIG: Bei jeder Änderung an den Dateien unten die CACHE-Version
   hochzählen (v1 → v2 → v3 …). Sonst zeigen Handys weiter die alte App. */

// Muss zur Versionsnummer auf dem Startbildschirm in index.html passen.
const CACHE = "spengler-digital-1.97";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/01-basis.css",
  "./css/02-responsive.css",
  "./css/03-druck.css",
  "./css/04-rechte.css",
  "./js/01-basis.js",
  "./js/02-feedback.js",
  "./js/03-login.js",
  "./js/04-start-suche.js",
  "./js/05-daten-laden.js",
  "./js/05a-rechte.js",
  "./js/06-rapport.js",
  "./js/07-einstellungen.js",
  "./js/08-katalog-blitzschutz.js",
  "./js/09-projekte.js",
  "./js/10-massaufnahme.js",
  "./js/11-einlaufblech-gerade.js",
  "./js/12-rinne-halbrund.js",
  "./js/12b-mauerabdeckung.js",
  "./js/13-einlaufblech-konisch.js",
  "./js/14-freies-profil.js",
  "./js/15-einlaufblech-stueckliste.js",
  "./js/16-massaufnahme-formular.js",
  "./js/17-ausmass.js",
  "./js/18-app-start.js",
  "./js/19-lukarne.js",
  "./js/20-anschlussblech.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      // einzeln ablegen: eine fehlende Datei bricht nicht die ganze Installation ab
      .then(cache => Promise.all(SHELL.map(url =>
        fetch(new Request(url, { cache: "reload" }))
          .then(res => res.ok ? cache.put(url, res) : null)
          .catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Zuerst Netz, dann Cache. So sieht man Änderungen sofort und die App
   funktioniert trotzdem, wenn das Handy gerade kein Netz hat. */
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // cache: "reload" umgeht den Zwischenspeicher des Browsers. Ohne das
  // liefert GitHub Pages bis zu zehn Minuten lang die alte Fassung einer
  // gerade hochgeladenen Datei.
  event.respondWith(
    fetch(new Request(req, { cache: "reload" }))
      .then(res => {
        const kopie = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, kopie)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(treffer => treffer || caches.match("./index.html")))
  );
});
