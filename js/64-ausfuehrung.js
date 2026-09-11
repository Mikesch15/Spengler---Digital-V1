// ---------------------------------------------------------------------------
// AUSF_STATUS  -  gemeinsames Status-Vokabular "Nicht ausgefuehrt / Teilweise /
// Vollstaendig"
// ---------------------------------------------------------------------------
// Frueher (v3.36) trug diese Datei eine eigene "Geplant -> Ausgefuehrt"-Karte
// je Ausmass-Position im Massaufnahme-Formular. Sie wurde entfernt (veraltet,
// abgeloest durch den Ausfuehrungsstatus an der Leistung, js/65). AUSF_STATUS/
// ausfStatusText()/ausfBadge() bleiben hier stehen, weil js/65-leistungen.js
// sie unveraendert weiterverwendet (Leistungen.status kennt dieselben drei
// Werte) und js/23-verlauf.js ausfStatusText() braucht, um sowohl neue
// Leistungs-Aenderungen als auch alte, bereits gespeicherte "ausfuehrung"-
// Verlaufseintraege lesbar darzustellen.
// ---------------------------------------------------------------------------

const AUSF_STATUS={
 nicht_ausgefuehrt:{text:"Nicht ausgeführt",farbe:"grau", zeichen:"○"},
 teilweise:        {text:"Teilweise",       farbe:"orange",zeichen:"◐"},
 vollstaendig:     {text:"Vollständig",     farbe:"gruen", zeichen:"✓"}
};

// Deutsche Bezeichnung eines Status-Rohwerts - fuer js/23-verlauf.js, damit
// der Aenderungsverlauf "Nicht ausgeführt -> Teilweise" zeigt statt der
// Rohwerte (gleiches Muster wie resvStatusName() in js/50).
function ausfStatusText(k){
 const i=AUSF_STATUS[k];
 return i?i.text:(k||"–");
}

function ausfBadge(status){
 const i=AUSF_STATUS[status]||AUSF_STATUS.nicht_ausgefuehrt;
 return `<span class="mw-badge mw-${i.farbe}">${i.zeichen} ${esc(i.text)}</span>`;
}
