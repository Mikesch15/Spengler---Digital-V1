// ---- Zurueck-Taste des Geraets (v3.11) ---------------------------------
// Bis v3.10 verwendete die App die Adressleiste des Browsers ueberhaupt
// nicht: jeder Schirm ist ein Element, das ein- und ausgeblendet wird.
// Fuer den Browser sah die ganze Bedienung deshalb wie EINE Seite aus -
// die Zurueck-Taste des Handys schloss die App (bzw. verliess die Seite),
// statt einen Schirm zurueckzugehen.
//
// Grundgedanke: fuer jeden offenen Schirm liegt ein Platzhalter in der
// Verlaufsliste des Browsers. Die Zurueck-Taste nimmt einen davon weg,
// und wir schliessen dafuer den obersten Schirm. Sind alle Schirme zu,
// liegt kein Platzhalter mehr da und die Taste tut wieder, was sie
// ueberall tut - die Seite verlassen.
//
// Erkannt werden die Schirme ueber einen MutationObserver auf dem
// hidden-Attribut. Das ist Absicht: die App oeffnet und schliesst Schirme
// an weit ueber hundert Stellen, und keine einzige davon muss dafuer
// angefasst werden. Geprueft wird danach die TATSAECHLICHE Sichtbarkeit
// (display/Rechtecke), nicht nur das Attribut - eine eigene
// display-Regel kann [hidden] schlagen (CLAUDE.md 59/71.5/115.9).

// Grundschirme: Anmeldung und die Sperrmeldung sind kein Rueckweg, sie
// sind der Boden. #appRoot ebenfalls nicht - das ist die App selbst.
const ZURUECK_NICHT=["authScreen","companyLockedScreen","appRoot"];

// Schirme, die keinen .modal-Rahmen haben, aber trotzdem einer sind.
const ZURUECK_EXTRA=["reportScreen"];

// Sonderwege: diese Schirme haben einen eigenen Rueckweg, der zusaetzlich
// die richtige Liste wiederherstellt. Ohne sie wuerde ein blosses
// Ausblenden den Benutzer auf einem leeren Hintergrund zuruecklassen.
const ZURUECK_WEG={
 measurementEditModal:()=>{$("measurementEditModal").hidden=true;measEditZurueck();},
 ausmassEditModal:    ()=>{$("ausmassEditModal").hidden=true;amEditZurueck();},
 reportScreen:        ()=>reportZurueck(),
 projectCockpitModal: ()=>$("cockpitBack").click(),
 // Die beiden Typ-Auswahlen ERSETZEN den Schirm, aus dem sie geoeffnet
 // wurden (das Cockpit bzw. die Uebersicht). Ihr Abbrechen-Knopf stellt
 // ihn wieder her - blosses Ausblenden liesse einen leeren Hintergrund.
 measTypeChooserModal:()=>$("cancelMeasTypeChooser").click(),
 amTypeChooserModal:  ()=>$("cancelAmTypeChooser").click()
};

let zurueckSchirme=[];   // ids in der Reihenfolge, in der sie geoeffnet wurden
let zurueckTiefe=0;      // so viele Platzhalter haben wir abgelegt
let zurueckIgnoriere=0;  // so viele popstate stammen aus unserem history.go()
let zurueckAn=true;      // faellt auf false, wenn der Browser pushState verweigert

function zurueckKandidaten(){
 const raus=new Set(ZURUECK_NICHT);
 const liste=[...document.querySelectorAll(".modal,.medien-viewer,.sketch-fullscreen")]
  .filter(el=>el.id&&!raus.has(el.id));
 ZURUECK_EXTRA.forEach(id=>{const el=$(id); if(el&&liste.indexOf(el)<0)liste.push(el);});
 return liste;
}

// Wirklich sichtbar - nicht bloss "hidden-Attribut fehlt".
function zurueckOffen(el){
 if(!el||el.hidden)return false;
 if(getComputedStyle(el).display==="none")return false;
 return el.getClientRects().length>0;
}

function zurueckSchliesse(id){
 const weg=ZURUECK_WEG[id];
 if(weg){weg();return;}
 const el=$(id); if(el)el.hidden=true;
}

// Nach jeder Aenderung: Stapel und Verlaufsliste wieder gleich lang machen.
// Ein Stapel, der laenger ist als die Tiefe, braucht Platzhalter; ein
// kuerzerer (z. B. nach goToStart, das ein Dutzend Schirme auf einmal
// schliesst) gibt sie zurueck.
function zurueckAbgleichen(){
 if(!zurueckAn)return;
 zurueckKandidaten().forEach(el=>{
  const auf=zurueckOffen(el), i=zurueckSchirme.indexOf(el.id);
  if(auf&&i<0)zurueckSchirme.push(el.id);
  else if(!auf&&i>=0)zurueckSchirme.splice(i,1);
 });
 const diff=zurueckSchirme.length-zurueckTiefe;
 if(diff>0){
  try{for(let i=0;i<diff;i++){zurueckTiefe++;history.pushState({sdZurueck:zurueckTiefe},"");}}
  catch(e){zurueckAn=false;}   // z. B. sehr alte Browser: lieber nichts tun
 }else if(diff<0){
  zurueckIgnoriere+=-diff;
  zurueckTiefe=zurueckSchirme.length;
  history.go(diff);
 }
}

window.addEventListener("popstate",()=>{
 if(!zurueckAn)return;
 if(zurueckIgnoriere>0){zurueckIgnoriere--;return;}
 if(!zurueckSchirme.length)return;   // nichts offen: die Taste darf die Seite verlassen
 zurueckTiefe=Math.max(0,zurueckTiefe-1);
 const id=zurueckSchirme[zurueckSchirme.length-1];
 // Schliesst der Schirm gleich mehrere mit (goToStart), meldet das der
 // Beobachter und zurueckAbgleichen() gibt die uebrigen Platzhalter zurueck.
 // Schliesst er sich NICHT (z. B. eine Rueckfrage wurde abgebrochen),
 // bleibt er im Stapel und bekommt seinen Platzhalter wieder.
 zurueckSchliesse(id);
 setTimeout(zurueckAbgleichen,0);
});

// Ein Beobachter je Schirm statt einer ueber dem ganzen Dokument: die Menge
// ist bekannt und fest, das bleibt guenstig.
(function zurueckStarten(){
 if(typeof MutationObserver!=="function"||typeof history.pushState!=="function"){zurueckAn=false;return;}
 const beob=new MutationObserver(()=>zurueckAbgleichen());
 zurueckKandidaten().forEach(el=>beob.observe(el,{attributes:true,attributeFilter:["hidden","class","style"]}));
 zurueckAbgleichen();
})();
