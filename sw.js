// Spengler-Digital – Service Worker
// Zweck: macht die App "installierbar" (Add-to-Homescreen / Desktop-Installation)
// und lässt die Hülle der App auch bei kurzzeitig fehlendem Netz noch laden.
// Die eigentlichen Daten kommen weiterhin live von Supabase – dafür wird
// zwingend eine Internetverbindung benötigt, das cacht dieser Worker bewusst nicht.

const CACHE_NAME = "spengler-digital-v3";
const APP_SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Nur eigene, einfache GET-Anfragen für die App-Hülle behandeln.
  // Alle Supabase-/API-Aufrufe laufen normal übers Netz (nicht abgefangen).
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // "Netzwerk zuerst": solange Internet da ist, kommt immer die aktuelle
  // Version - der Cache dient nur als Rückfalloption, wenn kurzzeitig kein
  // Netz verfügbar ist. cache:"no-store" erzwingt zusätzlich, dass der
  // Browser nicht seinen eigenen HTTP-Cache befragt, sondern wirklich beim
  // Server nachfragt - sonst könnte eine alte Kopie ausgeliefert werden,
  // bevor der Service Worker überhaupt zum Zug kommt.
  e.respondWith(
    fetch(e.request, { cache: "no-store" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("./index.html")))
  );
});
