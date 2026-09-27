// Schuetzt den Supabase-Stub eines Pruefstands davor, vom ECHTEN supabase-js
// ueberschrieben zu werden.
//
// WARUM ES DAS BRAUCHT (gefunden bei der CI-Untersuchung, Sept. 2026):
// Ein Teil der Pruefstaende spielt seinen Stub ueber page.addInitScript() ein.
// Der laeuft VOR den Skripten der Seite und setzt window.supabase. Danach laedt
// index.html aber das echte supabase-js - und das setzt window.supabase ein
// zweites Mal, naemlich auf sich selbst. Der Stub ist damit weg, die App redet
// mit einer echten Datenbank, und es kommen nie Daten an.
//
// Dass das lange niemandem auffiel, lag an der Entwicklungsumgebung: aus ihr
// heraus war cdn.jsdelivr.net NICHT erreichbar. Das Skript scheiterte also,
// der Stub blieb stehen, und die Pruefstaende waren gruen - aus dem falschen
// Grund. Auf dem GitHub-Runner gibt es Internet, dort griff der Stub nicht
// mehr und neun Pruefstaende fielen deterministisch durch.
//
// SEIT v3.205 liegt supabase-js im Projekt (vendor/supabase.umd.min.js) statt
// auf einem CDN. Fuer die App ist das ein Gewinn (sie startet ohne Verbindung),
// fuer diese Absicherung aendert es nur die Adresse - gebraucht wird sie
// unveraendert, und zwar jetzt sogar UEBERALL: eine Datei aus dem eigenen Haus
// laedt immer, auch ohne Internet. Der Zufall, der die Pruefstaende hier
// bisher gerettet hat, gibt es nicht mehr. Ohne diese Absicherung waere der
// Stub also in JEDER Umgebung weg, nicht nur auf dem Runner.
//
// Nur supabase wird abgefangen. jsPDF und xlsx aus demselben Ordner bleiben
// unangetastet - die Offerten- und Excel-Pruefstaende brauchen sie wirklich.
//
// Rueckgabe: ein Zaehler. Der Pruefstand kann damit belegen, dass die Seite
// das echte supabase-js WIRKLICH laden wollte und daran gehindert wurde - sonst
// waere die Absicherung eine Behauptung ohne Nachweis.
async function stubSchuetzen(page){
 const wache={abgefangen:0};
 // Die alte CDN-Adresse bleibt mit drin: ein Pruefstand, der eine aeltere
 // Fassung der Seite laedt, soll genauso geschuetzt sein.
 await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase|\/vendor\/supabase\./,r=>{
  wache.abgefangen++;
  r.fulfill({status:200,contentType:"application/javascript",
   body:"/* Prueffeld: das echte supabase-js wird bewusst nicht geladen,\n"
       +"   damit der Stub des Pruefstands die einzige Quelle bleibt. */"});
 });
 return wache;
}
module.exports={stubSchuetzen};
