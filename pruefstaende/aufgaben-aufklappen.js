// Gemeinsamer Helfer: die Aufgaben-Gruppen der Startseite aufklappen.
//
// WARUM ES DEN GIBT (v3.258): Seit die Aufgabenliste zugeklappt startet
// (Ansage des Anwenders: "Drehe es um, so dad zugeklappt standart ist"),
// steht auf "Heute" je Projekt nur noch eine Kopfzeile. Jeder Pruefstand,
// der eine AUFGABENZEILE misst - ihre Breite, ihren Knopf, ihren Text, ihr
// Terminfeld -, muss vorher aufklappen.
//
// Das betrifft sechs Pruefstaende. Denselben Ablauf sechsmal hinzuschreiben
// waere sechsmal dieselbe Wahrheit; aendert sich das Zuklappen noch einmal,
// muesste man sechs Stellen finden. Deshalb hier, an EINER.
//
// ZWEI FALLEN, in beide beim ersten Anlauf hineingetreten:
//
// 1. Ein Schnappschuss aus querySelectorAll wird durch das Neuzeichnen nach
//    dem ersten Klick ungueltig: die uebrigen Koepfe haengen danach nicht
//    mehr im Dokument, ein Klick darauf tut nichts, und nur die erste
//    Gruppe geht auf. Deshalb wird jeder Kopf einzeln und JEDES MAL NEU
//    gesucht.
// 2. Geklickt wird ueber den ECHTEN Weg (den Kopf selbst), nicht ueber den
//    Zustand a2AufgabenAuf. Sonst pruefte der Lauf einen Zustand, den kein
//    Anwender ausloesen kann - und ein kaputter Klick-Beobachter fiele
//    niemandem auf.
//
// Rueckgabe: wie viele Gruppen aufgeklappt wurden (0 = es gab keine, etwa
// weil keine Aufgaben offen sind). Der Aufrufer kann das pruefen, muss aber
// nicht.
async function aufgabenAufklappen(page){
 return page.evaluate(async()=>{
  const ids=[...document.querySelectorAll("[data-a2-aufg-gruppe]")]
    .map(k=>k.getAttribute("data-a2-aufg-gruppe"));
  for(const id of ids){
   const k=document.querySelector(`[data-a2-aufg-gruppe="${id}"]`);
   // Schon offen? Dann nicht klicken - das wuerde zuklappen.
   if(k&&k.getAttribute("aria-expanded")!=="true"){
    k.click();
    await new Promise(r=>setTimeout(r,120));
   }
  }
  return ids.length;
 });
}
module.exports={aufgabenAufklappen};

// Dieselbe Sache, aber IN der Seite verfuegbar: window.__aufgabenAufklappen().
//
// Gebraucht von Pruefstaenden, die Aufbau und Messung in EINEM
// page.evaluate() machen (etwa aufgaben-termin-v3-185). Sie koennen den
// Helfer oben nicht dazwischenschieben, ohne ihren Ablauf zu zerlegen - und
// ein zerlegter Ablauf misst leicht etwas anderes als vorher.
//
// Der Rumpf ist DERSELBE wie oben, er wird daraus erzeugt: zwei Fassungen
// desselben Ablaufs waeren genau die zweite Wahrheit, die dieser Helfer
// vermeiden soll.
async function aufklappenEinbauen(page){
 const rumpf=aufgabenAufklappen.toString()
   .replace(/^async function aufgabenAufklappen\(page\)\{\s*return page\.evaluate\(/,"")
   .replace(/\);\s*\}$/,"");
 await page.evaluate(`window.__aufgabenAufklappen = ${rumpf};`);
}
module.exports.aufklappenEinbauen=aufklappenEinbauen;
