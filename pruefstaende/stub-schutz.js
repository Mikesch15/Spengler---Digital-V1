// Schuetzt den Supabase-Stub eines Pruefstands davor, vom ECHTEN supabase-js
// ueberschrieben zu werden.
//
// WARUM ES DAS BRAUCHT (gefunden bei der CI-Untersuchung, Sept. 2026):
// Ein Teil der Pruefstaende spielt seinen Stub ueber page.addInitScript() ein.
// Der laeuft VOR den Skripten der Seite und setzt window.supabase. Danach laedt
// index.html (Zeile 14) aber das echte supabase-js von cdn.jsdelivr.net - und
// das setzt window.supabase ein zweites Mal, naemlich auf sich selbst. Der Stub
// ist damit weg, die App redet mit einer echten, hier nicht erreichbaren
// Datenbank, und es kommen nie Daten an.
//
// Dass das lange niemandem auffiel, liegt an der Entwicklungsumgebung: aus ihr
// heraus ist cdn.jsdelivr.net NICHT erreichbar. Das Skript scheitert also, der
// Stub bleibt stehen, und die Pruefstaende waren gruen - aus dem falschen
// Grund. Auf dem GitHub-Runner gibt es Internet, dort greift der Stub nicht
// mehr und neun Pruefstaende fielen deterministisch durch.
//
// Die Abhilfe ist dieselbe, die die uebrigen Pruefstaende seit je benutzen: die
// CDN-Anfrage wird abgefangen. Statt der echten Bibliothek kommt eine leere
// Antwort zurueck - der Stub bleibt damit die einzige Quelle, auf jeder
// Maschine, mit oder ohne Internet.
//
// Nur @supabase wird abgefangen. xlsx von derselben Adresse (index.html
// Zeile 15) bleibt unangetastet - die Excel-Pruefstaende brauchen es wirklich.
//
// Rueckgabe: ein Zaehler. Der Pruefstand kann damit belegen, dass die Seite
// das echte supabase-js WIRKLICH laden wollte und daran gehindert wurde - sonst
// waere die Absicherung eine Behauptung ohne Nachweis.
async function stubSchuetzen(page){
 const wache={abgefangen:0};
 await page.route("**://cdn.jsdelivr.net/npm/@supabase/**",r=>{
  wache.abgefangen++;
  r.fulfill({status:200,contentType:"application/javascript",
   body:"/* Prueffeld: das echte supabase-js wird bewusst nicht geladen,\n"
       +"   damit der Stub des Pruefstands die einzige Quelle bleibt. */"});
 });
 return wache;
}
module.exports={stubSchuetzen};
