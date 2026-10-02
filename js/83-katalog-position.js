"use strict";
// ---------------------------------------------------------------------------
// Neue Materialposition anlegen - EDV-Nummer und Nummerngruppe (v3.251)
//
// WARUM ES DIESE DATEI GIBT:
// Diese Faehigkeit sass bis v3.250 in js/68-lagerverwaltung.js. Mit der
// Abschaffung der alten Lagerverwaltung (Ansage des Anwenders: "die alte
// lagerverwaltung wird abgeschafft") waere sie mitgegangen - und das waere
// falsch gewesen: sie gehoert dem MATERIAL-KATALOG, nicht dem Lager. Zwei
// Stellen brauchen sie, beide haben mit Lager nichts zu tun:
//   - "＋ Material hinzufuegen" im Material-Katalog (js/08)
//   - der Nummernvorschlag im Materialbestand (js/59)
// Sie ist deshalb hierher UMGEZOGEN, nicht nachgebaut: Bewertung, Schwellen
// und Nummernkreis sind unveraendert aus js/68 uebernommen. Eine zweite
// Fassung waere eine zweite Wahrheit ueber dieselbe Nummer.
//
// WARUM DIE NAMEN WEITERHIN MIT "lager" ANFANGEN:
// lagerNummernVorschlag(), lagerNaechsteFreieEdvNr() und die Bewertung
// darunter werden von js/08, js/59 und fuenf Pruefstaenden unter diesen Namen
// gerufen. Sie beim Umzug umzubenennen waere eine zweite, rein kosmetische
// Aenderung im selben Schritt - und genau dort entstehen Fehler. Die Namen
// sind historisch, die Zustaendigkeit steht hier im Kopf.
//
// WAS HIER NICHT MEHR IST (und bewusst nicht ersetzt wurde):
// Der Dialog fuehrte zwei Wege in einem: eine Katalogposition UND ein
// Lager-Produkt mit Barcode. Der zweite Weg ist mit der Lagerverwaltung
// weggefallen. Geblieben ist der erste - der, den der Material-Katalog
// braucht. Der Dialog heisst deshalb jetzt, was er tut:
// "Neue Materialposition anlegen".
//
// Geschrieben wird ueber katalogPositionAnlegen() (js/59) - dieselbe
// Funktion, die der Materialbestand benutzt. Sie zieht alle parallelen
// Listen nach (settings.materials, materialIds, materialWerkstoffe,
// materialFormate).
// ---------------------------------------------------------------------------

function katPosZahl(v){const n=Number(v);return Number.isFinite(n)?n:0}

// ---- v3.124: Produkte, die in der Regiematerialliste nicht vorkommen ----
// Statt eines zweiten Datenmodells (ein Produkt ohne Materialposition,
// material_id waere dafuer nullable zu machen) entsteht eine richtige
// KATALOGPOSITION. Vorteile: nichts weiter unten muss angepasst werden, die
// Position laesst sich danach auch im Regierapport verrechnen, und die
// Lagerverwaltung bleibt bei EINEM Modell (CLAUDE.md: keine doppelten
// Datenmodelle).
//
// Damit so eine Position nicht mit der Regieliste kollidiert, schlaegt die
// App eine Nummer aus einem eigenen Kreis vor: 999.xx. Der Katalog benutzt
// durchgehend das Format NNN.NN mit den Gruppen 100 bis 990 - 999 ist frei,
// haelt aber dasselbe Format ein (ein "1.000.00" wuerde als Text VOR
// "100.01" einsortiert und faellt aus jeder Sortierung). Die Nummer bleibt
// frei aenderbar; vorgeschlagen ist sie, nicht vorgeschrieben.
const LAGER_EIGENE_GRUPPE="999";
// Die naechste freie Nummer INNERHALB einer Nummerngruppe. Ohne Gruppe der
// eigene Lager-Kreis 999.xx.
function lagerNaechsteFreieEdvNr(gruppe){
 const g=String(gruppe||LAGER_EIGENE_GRUPPE);
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 const muster=new RegExp("^"+g.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\.(\\d+)$");
 let hoechste=0;
 liste.forEach(a=>{
  const m=muster.exec(String(a.edv_nr||"").trim());
  if(m)hoechste=Math.max(hoechste,parseInt(m[1],10));
 });
 return g+"."+String(hoechste+1).padStart(2,"0");
}

// ---- v3.126: die passende Nummerngruppe aus dem Katalog erkennen ---------
//
// Der Katalog ist fachlich nach Gruppen geordnet: 201 Dachrinnen, 202
// Rinnenhalter, 203 Rinnenzubehoer (Winkel, Boeden, Stutzen, Seiher,
// Kasten), 251 Ablaufrohre, 252 Rohrteile, 261 Lueftung, 811 Dichtstoffe,
// 826 Schrauben. Ein neues Rinnenzubehoer-Produkt gehoert deshalb nicht in
// den Lager-Kreis 999, sondern zu 203.
//
// Erkannt wird ueber die BEZEICHNUNG, mit denselben Textwerkzeugen wie die
// Positionserkennung im Regierapport (rmatWoerter/rmatStamm, js/57) - keine
// dritte Textlogik. Gemessen wurde am echten Katalog der Produktivdatenbank
// (alle unterschiedlichen Produktnamen), mit 20 von Hand gesetzten
// Erwartungen; die Zahlen unten sind daraus hervorgegangen, nicht geraten.
// Die fuenf Faelle, die dabei offen blieben, sind echte Gleichstaende
// ("Rohrbogen" steht in 252, 259 UND 261) - dort behauptet die App nichts,
// sondern legt die Kandidaten nebeneinander.
const LAGER_GRUPPE_MIN=2.5;      // darunter ist kein Treffer stark genug
const LAGER_GRUPPE_FAKTOR=1.15;  // so viel Vorsprung braucht der Erste

// Materialwoerter zaehlen nur ein Viertel: "Kupfer" steht in fast jeder
// Gruppe und darf nicht entscheiden. Ein Materialwort ist ein Wort aber nur,
// wenn es eines IST - "Kupferblech" enthaelt "Kupfer" und ist trotzdem ein
// Blech (gemessener Fehler der ersten Fassung).
const LAGER_MATERIALWOERTER=["kupfer","titanzink","zink","chromnickelstahl","stahl",
 "aluminium","alum","messing","blei","inox","crnistahl","cnstahl","tizn",
 "materialien","alle","kunststoff"];
// Deutsche Zusammensetzungen teilen ihren Stamm oft in der MITTE
// ("SpezialSCHRAUBE" / "HolzSCHRAUBEn"). Vorn/hinten allein findet das
// nicht, deshalb zusaetzlich die laengste gemeinsame Teilkette.
function lagerTeilkette(a,b){
 let best=0;
 for(let i=0;i<a.length;i++){
  for(let j=i+best+1;j<=a.length;j++){
   const t=a.slice(i,j);
   if(b.indexOf(t)>=0){ if(t.length>best)best=t.length; } else break;
  }
 }
 return best;
}
function lagerWoerter(s){
 if(typeof rmatWoerter==="function")return rmatWoerter(s);
 return String(s==null?"":s).toLowerCase()
  .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
  .split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!/^\d+$/.test(w));
}
function lagerStamm(a,b){
 return (typeof rmatStamm==="function")?rmatStamm(a,b):0;
}
// Wie gut passt EINE Katalogzeile zur Bezeichnung? Ein ganzes Wort zaehlt
// voll, ein Teilwort anteilig (sonst haette "rinnen" in
// "Rinnen-Dehnungselement" dasselbe Gewicht wie in "Rinnenhalter").
function lagerZeilePunkte(bezWoerter,name){
 const kW=lagerWoerter(name);
 let p=0;
 bezWoerter.forEach(w=>{
  let best=0;
  kW.forEach(k=>{
   if(k===w){best=Math.max(best,3);return}
   const gem=Math.min(k.length,w.length), lang=Math.max(k.length,w.length);
   if(k.indexOf(w)>=0||w.indexOf(k)>=0){best=Math.max(best,3*(gem/lang));return}
   const t=Math.max(lagerStamm(k,w),lagerTeilkette(k,w));
   if(t>=5)best=Math.max(best,2.2*(t/lang));
  });
  p+=(LAGER_MATERIALWOERTER.indexOf(w)>=0)?best*0.25:best;
 });
 return p;
}
function lagerGruppeVon(nr){
 const m=/^(\d+)\./.exec(String(nr==null?"":nr).trim());
 return m?m[1]:null;
}
// Alle Gruppen, nach Passung sortiert. Die Liste ist auch dann nuetzlich,
// wenn kein Erster klar fuehrt - dann zeigt die App die Kandidaten.
function lagerGruppenBewerten(bezeichnung){
 const bW=lagerWoerter(bezeichnung);
 if(!bW.length)return [];
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 const proGruppe=new Map();
 liste.forEach(a=>{
  const g=lagerGruppeVon(a.edv_nr);
  if(!g||g===LAGER_EIGENE_GRUPPE)return;     // der eigene Kreis ist kein Vorschlag
  const p=lagerZeilePunkte(bW,a.name);
  if(p<=0)return;
  if(!proGruppe.has(g))proGruppe.set(g,[]);
  proGruppe.get(g).push({punkte:p,artikel:a});
 });
 return [...proGruppe.entries()].map(([g,treffer])=>{
  treffer.sort((a,b)=>b.punkte-a.punkte);
  // Nur STARKE weitere Treffer zaehlen (mind. 70% des besten) - sonst
  // gewaenne die groesste Gruppe allein durch ihre Groesse.
  const stark=treffer.filter((x,i)=>i>0&&x.punkte>=treffer[0].punkte*0.7).length;
  return {gruppe:g,punkte:treffer[0].punkte+Math.min(3,stark)*0.4,
          bester:treffer[0].artikel,anzahl:treffer.length};
 }).sort((a,b)=>b.punkte-a.punkte||a.gruppe.localeCompare(b.gruppe));
}
// v3.136: Welche BESTEHENDEN Katalogpositionen passen zur Bezeichnung?
// Bis hierher wurde die Bewertung nur benutzt, um die EDV-Nummer einer NEU
// anzulegenden Position zu finden (v3.126) - und die zeigte sich erst, wenn
// man "Neue Materialposition anlegen" schon geklickt hatte. Wer ein Produkt
// einscannte, bekam davon nichts zu sehen: die Trefferliste war der
// ungeordnete Katalog, und gesucht werden musste von Hand. Gemeldet vom
// Anwender ("wird nicht mehr automatisch und intelligent eine Position
// vorgeschlagen").
//
// Dieselbe Bewertung (lagerZeilePunkte), dieselbe Schwelle
// (LAGER_GRUPPE_MIN) - kein zweites, parallel gepflegtes Mass.
function lagerPositionenVorschlag(bezeichnung){
 const bW=lagerWoerter(bezeichnung);
 if(!bW.length)return [];
 // v3.251: die Liste kommt aus lagArtikelListe() (js/59) statt aus dem
 // Zwischenspeicher des alten Produkt-Dialogs. Dieselben Zeilen, nur ohne
 // den Umweg ueber einen Zustand, den es nicht mehr gibt.
 const liste=(typeof lagArtikelListe==="function"?lagArtikelListe():[])||[];
 return liste.map(a=>({artikel:a,punkte:lagerZeilePunkte(bW,a.name)}))
  .filter(x=>x.punkte>=LAGER_GRUPPE_MIN)
  .sort((a,b)=>b.punkte-a.punkte)
  .slice(0,3);
}
// Der Vorschlag fuer die Oberflaeche. art:
//   "gruppe"  eine Gruppe fuehrt deutlich -> ihre naechste freie Nummer
//   "unklar"  mehrere passen aehnlich gut -> Lager-Kreis, Kandidaten dabei
//   "eigen"   nichts passt                -> Lager-Kreis
function lagerNummernVorschlag(bezeichnung){
 const b=lagerGruppenBewerten(bezeichnung);
 const kandidaten=b.filter(x=>x.punkte>=LAGER_GRUPPE_MIN).slice(0,3);
 if(!b.length||b[0].punkte<LAGER_GRUPPE_MIN){
  return {art:"eigen",nummer:lagerNaechsteFreieEdvNr(null),kandidaten:[]};
 }
 if(b[1]&&b[0].punkte<b[1].punkte*LAGER_GRUPPE_FAKTOR){
  return {art:"unklar",nummer:lagerNaechsteFreieEdvNr(null),kandidaten};
 }
 return {art:"gruppe",gruppe:b[0].gruppe,nummer:lagerNaechsteFreieEdvNr(b[0].gruppe),
         bester:b[0].bester,kandidaten:kandidaten.slice(1)};
}
// Darf dieser Benutzer ueberhaupt eine Katalogposition anlegen? Das
// entscheidet dasselbe Recht wie in den Einstellungen (materials-Insert
// verlangt serverseitig has_permission('materials','edit')). Steht es nicht
// zur Verfuegung, wird die Moeglichkeit gar nicht erst angeboten - besser
// als eine Fehlermeldung aus der Datenbank.
function lagerDarfPositionAnlegen(){
 return !!(typeof meineRechte!=="undefined"&&meineRechte&&meineRechte.kataloge);
}

// ---- Der Dialog ----------------------------------------------------------
//
// v3.126: Vorschlag setzen und BEGRUENDEN. Die Nummer wird nur vorbelegt,
// solange der Anwender sie nicht selbst angefasst hat (lagerNummerVonHand) -
// sonst wuerde ein weiteres Zeichen in der Bezeichnung seine Eingabe
// ueberschreiben.
let lagerNummerVonHand=false;
function lagerNummerVorschlagen(nurWennLeer){
 const feld=$("lagerNeuePositionNr"), hinweis=$("lagerNeuePositionHinweis");
 if(!feld)return;
 if(lagerNummerVonHand&&nurWennLeer!==false)return;
 if(nurWennLeer&&feld.value.trim())return;
 const bez=$("lagerNeuePositionName")?$("lagerNeuePositionName").value.trim():"";
 const v=lagerNummernVorschlag(bez);
 if(!lagerNummerVonHand)feld.value=v.nummer;
 if(!hinweis)return;
 const andere=(v.kandidaten||[]).filter(k=>k.gruppe!==v.gruppe);
 const knoepfe=andere.length
  ?`<div class="bar" style="margin-top:2px">`+andere.map(k=>
    `<button type="button" class="gray lager-gruppe-knopf" data-lager-gruppe="${esc(k.gruppe)}">${esc(k.gruppe)}.xx · ${esc(k.bester.name).slice(0,34)}</button>`).join("")
   +`<button type="button" class="gray lager-gruppe-knopf" data-lager-gruppe="${LAGER_EIGENE_GRUPPE}">${LAGER_EIGENE_GRUPPE}.xx · eigener Nummernkreis</button></div>`
  :"";
 if(v.art==="gruppe"){
  hinweis.innerHTML=`<span class="rmat-sicher">✓ Gruppe ${esc(v.gruppe)}</span> – dort steht bereits `
   +`„${esc(v.bester.name)}“.`+knoepfe;
 }else if(v.art==="unklar"){
  hinweis.innerHTML=`<span class="rmat-unsicher">Mehrere Gruppen passen ähnlich gut</span> – deshalb der eigene `
   +`Nummernkreis. Passt eine davon besser, hier wählen:`+knoepfe;
 }else{
  hinweis.innerHTML=`<span class="small" style="color:var(--muted)">Keine passende Gruppe im Katalog gefunden – `
   +`die Position bekommt eine Nummer aus dem eigenen Nummernkreis.</span>`;
 }
}
// Die Nummer folgt der Bezeichnung, solange sie nicht von Hand gesetzt wurde.
if($("lagerNeuePositionName"))$("lagerNeuePositionName").addEventListener("input",()=>{
 lagerNummerVorschlagen(false);
});
if($("lagerNeuePositionNr"))$("lagerNeuePositionNr").addEventListener("input",()=>{
 lagerNummerVonHand=true;
});
if($("lagerNeuePositionHinweis"))$("lagerNeuePositionHinweis").addEventListener("click",e=>{
 const k=e.target.closest?e.target.closest("[data-lager-gruppe]"):null;
 if(!k)return;
 // Eine bewusst gewaehlte Gruppe gilt - die Bezeichnung darf sie danach
 // nicht mehr ueberschreiben.
 lagerNummerVonHand=true;
 $("lagerNeuePositionNr").value=lagerNaechsteFreieEdvNr(k.dataset.lagerGruppe);
});

function katalogPositionOeffnen(){
 const modal=$("katalogPositionModal");
 if(!modal)return;
 const fehler=$("lagerNeuesProduktFehler");
 if(fehler)fehler.hidden=true;
 ["lagerNeuePositionNr","lagerNeuePositionName","lagerNeuePositionDim",
  "lagerNeuePositionEinheit","lagerNeuePositionPreis"].forEach(id=>{if($(id))$(id).value=""});
 if($("lagerNeuePositionEinheit"))$("lagerNeuePositionEinheit").value="Stk.";
 lagerNummerVonHand=false;
 if($("lagerNeuePositionHinweis"))$("lagerNeuePositionHinweis").innerHTML="";
 lagerNummerVorschlagen(false);
 modal.hidden=false;
 setTimeout(()=>{try{$("lagerNeuePositionName").focus()}catch(e){}},50);
}
function katalogPositionSchliessen(){
 if($("katalogPositionModal"))$("katalogPositionModal").hidden=true;
}
if($("lagerNeuesProduktAbbrechen"))$("lagerNeuesProduktAbbrechen").onclick=katalogPositionSchliessen;

// Legt die Katalogposition an und meldet ihre id zurueck (oder null bei
// einem Fehler - die Meldung steht dann bereits im Dialog).
//
// v3.251: das zweite Argument (die Bezeichnung des Lager-Produkts, auf die
// zurueckgefallen wurde, wenn das Positionsfeld leer blieb) ist weg - es gibt
// kein Produkt mehr, das einen Namen beisteuern koennte. Eine Bezeichnung,
// ein Feld, keine Rueckfallkette.
async function lagerNeuePositionAnlegen(fehler){
 const nr=$("lagerNeuePositionNr")?$("lagerNeuePositionNr").value.trim():"";
 const name=$("lagerNeuePositionName")?$("lagerNeuePositionName").value.trim():"";
 const dim=$("lagerNeuePositionDim")?$("lagerNeuePositionDim").value.trim():"";
 const einheit=($("lagerNeuePositionEinheit")?$("lagerNeuePositionEinheit").value.trim():"")||"Stk.";
 const preis=katPosZahl(($("lagerNeuePositionPreis")?$("lagerNeuePositionPreis").value:"").replace(",","."));
 if(!nr){fehler.textContent="Bitte eine EDV-Nr. für die neue Materialposition eingeben.";fehler.hidden=false;return null}
 if(!name){fehler.textContent="Bitte eine Bezeichnung für die neue Materialposition eingeben.";fehler.hidden=false;return null}
 const schon=((typeof lagArtikelListe==="function"?lagArtikelListe():[])||[])
  .find(a=>String(a.edv_nr||"").trim().toLowerCase()===nr.toLowerCase());
 if(schon){
  fehler.textContent="Die EDV-Nr. "+nr+" gibt es bereits ("+lagArtikelText(schon)
   +"). Bitte eine andere Nummer wählen.";
  fehler.hidden=false;
  return null;
 }
 // v3.179: Angelegt wird ueber katalogPositionAnlegen() (js/59) - dieselbe
 // Funktion, die auch der Materialbestand benutzt. Sie zieht ALLE parallelen
 // Listen nach; bis v3.178 wurden hier nur settings.materials und
 // materialIds gefuellt, materialWerkstoffe (v3.176) und materialFormate
 // (v3.177) blieben zurueck und gerieten dadurch aus dem Tritt.
 //
 // Was hier bleibt: das Lesen der Formularfelder und die Pruefung der
 // EDV-Nr. weiter oben - beides gehoert zu DIESEM Formular, mit seinen
 // eigenen Meldungen.
 const raus=await katalogPositionAnlegen({edv_nr:nr,name,dim,unit:einheit,price:preis});
 if(raus.id===null){
  fehler.textContent=raus.fehler
   ?("Die Materialposition konnte nicht angelegt werden: "+raus.fehler
     +(raus.rls?"\n\nDafür fehlt das Recht, den Material-Katalog zu ändern.":""))
   :"Die Materialposition wurde nicht angelegt.";
  fehler.hidden=false;
  return null;
 }
 return raus.id;
}

if($("lagerNeuesProduktSpeichern"))$("lagerNeuesProduktSpeichern").onclick=async()=>{
 const fehler=$("lagerNeuesProduktFehler");
 fehler.hidden=true;
 const knopf=$("lagerNeuesProduktSpeichern");
 knopf.disabled=true;
 try{
  // lagerNeuePositionAnlegen zieht settings.materials und materialIds
  // bereits nach - ein volles loadAllData waere hier unnoetiger Ballast.
  const neu=await lagerNeuePositionAnlegen(fehler);
  if(!neu)return;
  katalogPositionSchliessen();
  // Zurueck zu der Liste, aus der der Anwender kam: steht der
  // Material-Katalog offen, wird er neu gezeichnet und die neue Zeile
  // gleich aufgeklappt.
  const imKatalog=$("settingsModal")&&!$("settingsModal").hidden;
  if(imKatalog&&typeof renderSettings==="function"){
   if(typeof materialFilter!=="undefined")materialFilter="";
   if($("materialSettingsSearch"))$("materialSettingsSearch").value="";
   if(typeof materialExpanded!=="undefined"&&typeof settings==="object"&&settings
      &&Array.isArray(settings.materials)){
    materialExpanded.add(settings.materials.length-1);
    if(typeof materialPage!=="undefined"&&typeof MATERIAL_PAGE_SIZE!=="undefined")
     materialPage=Math.floor((settings.materials.length-1)/MATERIAL_PAGE_SIZE);
   }
   renderSettings();
  }
 }finally{ knopf.disabled=false; }
};

// ---- Eine Katalogposition loeschen: die Warnung (v3.251) -----------------
//
// HERKUNFT: Dieser Text stand in js/68 (lagerPositionAufraeumenAnbieten,
// v3.177). Dort war er aber nur auf EINEM Weg zu sehen - wenn in der
// Lagerverwaltung das letzte Produkt einer Position geloescht wurde und die
// App anbot, die Position mitzunehmen. Der Weg, den der Anwender wirklich
// benutzt, ist ein anderer: Einstellungen -> Material -> "Löschen". Der
// fragte bis v3.250 nur "Dieses Material wirklich löschen?" - ohne ein Wort
// darueber, dass das Blech-Format mitgeht.
//
// Beim Abschaffen der Lagerverwaltung waere dieser Text also verschwunden,
// ohne je am richtigen Ort gestanden zu haben. Er ist deshalb hierher
// gezogen und haengt jetzt an der Loeschung selbst.
//
// Warum das Format endgueltig ist: seit v3.177 ist es eine SPALTE auf genau
// dieser Zeile (materials.staerke_mm/ausfuehrung/form/laenge_mm/breite_mm).
// Bis v3.176 stand es in einer eigenen Tabelle, deren Fremdschluessel auf
// SET NULL steht - dort blieb der Eintrag bestehen und verlor nur seine
// Zuordnung. Das gilt nicht mehr: mit der Position verschwindet das Format,
// und der Zuschnitt rechnet danach nicht mehr mit diesem Blech.
//
// Die Reststuecke zeigen weiterhin mit artikel_id hierher, mit SET NULL: sie
// bleiben und verlieren nur die Zuordnung. Sie sind nicht im Browser geladen
// und werden deshalb benannt, nicht gezaehlt.
function katalogPositionLoeschenWarnung(materialId){
 const a=(typeof lagArtikel==="function")?lagArtikel(materialId):null;
 const name=a?((typeof lagArtikelText==="function")?lagArtikelText(a):"")
            :"diese Materialposition";
 const format=(typeof artikelFormat==="function")?artikelFormat(materialId):null;
 const formatText=(format&&a&&typeof lagArtikelFormatText==="function")
   ?lagArtikelFormatText(a):"";
 return "Materialposition „"+name+"“ aus dem MATERIAL-KATALOG entfernen?\n\n"
  +"Achtung: der Katalog wird auch vom Regierapport, von Offerten und von "
  +"Massaufnahmen benutzt. Bereits geschriebene Rapporte und Offerten ändern "
  +"sich dadurch nicht, aber die Position lässt sich danach nicht mehr "
  +"auswählen.\n\n"
  +(format?("Diese Position ist als BLECH geführt"+(formatText?(" ("+formatText+")"):"")
    +". Das Format gehört seit Version 3.177 zur Position selbst – es wird "
    +"mit ihr gelöscht, und der Zuschnitt rechnet danach nicht mehr mit "
    +"diesem Blech.\n\n"):"")
  +"Reststücke, die auf diese Position zeigen, bleiben bestehen – sie "
  +"verlieren nur ihre Zuordnung.";
}
