"use strict";
// ===========================================================================
// EINLAUFBLECH GERADE · Aufnahme (Geometrie, Stücke, Ausmass, Rollenblech)
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, keine Parallellösung:
// js/11-einlaufblech-gerade.js (Schnittzeichnung) und
// js/15-einlaufblech-stueckliste.js (enge Seite, Restbreite, Aufteilung,
// Gehrung, Endzugabe, Rinnen-Übernahme) bleiben UNVERÄNDERT und rechnen
// weiterhin alles Fachliche. Diese Datei ist die Erfassung darüber.
//
// Die Brücke sind die eigenen Variablen und Felder des bestehenden Moduls:
// ebaBruecke() setzt ebPieces und die alten Formularfelder aus dem erfassten
// Stand. Danach liefern ebEngeSeite() und ebRestbreite() aus js/15 direkt die
// richtigen Werte - sie werden hier NICHT nachgebaut. Die alten, unsichtbaren
// Formularelemente in #ebStummel bleiben stehen, damit js/15 unverändert
// laden kann.
//
// Neu gegenüber dem bestehenden Modul (aus dem Prototyp übernommen):
//   - Haltebleche "GAVA Blech"  (Anzahl = Länge ÷ Abstand + 1, wie der
//     Rinnenhalter-Abstand in js/28)
//   - Blechfläche in m²          (Gesamtlänge × Abwicklung)
//   - Zuschnitt aus Rollenblech  (Tafel, quer in Streifen geteilt)
//   - Ausmass und Materialübersicht ohne zweite Eingabe
// ===========================================================================

// Die Register heissen und stehen in ALLEN Massaufnahme-Arten gleich:
// die fachlichen Schritte zuerst, danach Zuschnitt, Ausmass und zuletzt die
// Kontrolle.
const EBA_REGISTER=[
 {nr:1,kurz:"Grunddaten",hilfe:"reg-grunddaten"},{nr:2,kurz:"Geometrie",hilfe:"eb-geometrie"},{nr:3,kurz:"Stücke",hilfe:"eb-stuecke"},
 {nr:4,kurz:"Zuschnitt",hilfe:"reg-zuschnitt"},{nr:5,kurz:"Ausmass",hilfe:"reg-ausmass"},{nr:6,kurz:"Kontrolle",hilfe:"reg-kontrolle"}
];
// Die Kontrolle ist immer das LETZTE Register - die Marke haengt deshalb an
// der Registerzahl, nicht an einer festen Nummer.
const EBA_KONTROLLE=EBA_REGISTER.length;
let ebaSchritt=1;
// true, solange die Registerflaeche neu gezeichnet wird. Chromium feuert auf
// einem Eingabefeld, das gerade den Fokus hat, beim Ersetzen des Inhalts noch
// ein change - und der Knoten meldet sich dabei als weiterhin im Dokument
// (gemessen, CLAUDE.md 103.4). Ohne diese Sperre schriebe der delegierte
// Handler den alten Feldwert in den GERADE FRISCH gesetzten Zustand zurueck.
// Waehrend des Zeichnens ist kein input/change eine echte Benutzereingabe.
let ebaZeichnet=false;

// Rollenbreiten: 1000 und 670 sind die Standardrollen. Die übrigen lassen
// sich in den Einstellungen dazunehmen - sie stehen firmenweit in
// app_settings.blech_rollenbreiten und sind auch für andere Massaufnahmen
// gedacht.
const EBA_ROLLEN_STANDARD=Object.freeze([1000,670]);
const EBA_ROLLEN_WAEHLBAR=Object.freeze([1000,670,500,400,330,250,200]);
function ebaRollenbreiten(){
 const eigen=Array.isArray(blechRollenbreiten)?blechRollenbreiten:null;
 const liste=(eigen&&eigen.length)?eigen:EBA_ROLLEN_STANDARD;
 return liste.map(Number).filter(x=>Number.isFinite(x)&&x>0)
   .sort((a,b)=>b-a);
}
// Die Rollen, mit denen DIESE Massaufnahme rechnet: das Lager oben,
// eingeschraenkt auf die im Register "Zuschnitt" angehakten Breiten.
function ebaRollenAktiv(){
 return (typeof zuRollenGefiltert==="function")?zuRollenGefiltert(ebA&&ebA.rollenAuswahl)
   :ebaRollenbreiten();
}

const ebaZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const ebaMm=v=>Math.round(ebaZahl(v)).toLocaleString("de-CH");
const ebaMeter=v=>(ebaZahl(v)/1000).toFixed(2).replace(".",",");

function ebaLeer(){
 return {
  material:"", abwicklung:250, montage:"links",
  massA:"", winkel:"", gesamtlaenge:"",
  stuecke:[],
  gava:{aktiv:false,abstand_mm:ebaGavaVorgabe(),anzahl:null},
  // rollenAuswahl: leer = das ganze Blechlager der Firma (nichts abgewaehlt).
  rollenAuswahl:[]
 };
}
// Der GAVA-Abstand ist ein Zuschnitt-/Montagemass wie Umschlag oder
// Endzugabe und liegt deshalb bei den übrigen Einlaufblech-Einstellungen.
function ebaGavaVorgabe(){
 const v=Number(einlaufblechSettings&&einlaufblechSettings.gava_abstand);
 return Number.isFinite(v)&&v>0?v:500;
}
let ebA=ebaLeer();

// ---- Brücke zum bestehenden Modul -----------------------------------------
// ebPieces ist danach dasselbe Array wie ebA.stuecke: es gibt nur eine
// Wahrheit, und der Speicher-Code in js/16 liefert weiterhin genau dieselben
// Felder wie bisher.
function ebaBruecke(){
 const a=ebA;
 // Eine Wahrheit: ebPieces IST das Stueck-Array des Modells. Wer es von
 // aussen ersetzt (js/15 bei der Rinnen-Uebernahme), holt es dort ab, wo es
 // passiert - siehe den Klick-Handler weiter unten.
 ebPieces=a.stuecke;
 const setz=(id,wert)=>{const f=$(id); if(f)f.value=String(wert)};
 setz("eb_massA",a.massA===""?"":a.massA);
 setz("eb_winkel",a.winkel===""?"":a.winkel);
 setz("eb_abwicklung",a.abwicklung||250);
 setz("eb_montage",a.montage||"links");
 setz("eb_material",a.material||"");
 setz("eb_gesamtlaenge",a.gesamtlaenge===""?"":a.gesamtlaenge);
}
// Ab hier gelten die Regeln des bestehenden Moduls, unverändert aufgerufen.
function ebaEngeSeite(){ebaBruecke();return ebEngeSeite()}
function ebaRestbreite(){ebaBruecke();return ebRestbreite()}
// Das enge Mass ist in js/15 und js/16 als max(0, Mass A − 2) fest
// verdrahtet - hier derselbe Ausdruck, keine zweite Regel.
function ebaMassAEng(){return Math.max(0,ebaZahl(ebA.massA)-2)}
function ebaGesamtlaenge(){return (ebA.stuecke||[]).reduce((s,p)=>s+ebaZahl(p.laenge),0)}

// ---- Haltebleche (GAVA Blech) ---------------------------------------------
// Dieselbe Rechnung wie der Rinnenhalter-Abstand in js/28:
//     Anzahl = ganzzahlig(Länge ÷ Abstand) + 1
// Sie greift nur, wenn "GAVA Blech" angekreuzt ist.
function ebaGavaVorschlag(){
 const L=ebaGesamtlaenge(), ab=ebaZahl(ebA.gava&&ebA.gava.abstand_mm);
 if(L<=0||ab<=0)return null;
 return Math.floor(L/ab)+1;
}
function ebaGavaAnzahl(){
 const g=ebA.gava;
 if(!g||!g.aktiv)return null;
 if(g.anzahl!==null&&g.anzahl!==undefined&&g.anzahl!=="")return Math.round(ebaZahl(g.anzahl));
 return ebaGavaVorschlag();
}

// ---- Fläche und Rollenblech ------------------------------------------------
// Blechfläche = Gesamtlänge × Abwicklung. Beides ist erfasst, nichts wird
// geschätzt.
function ebaFlaecheM2(){return ebaGesamtlaenge()*ebaZahl(ebA.abwicklung)/1e6}

// Zuschnitt aus Rollenblech. So wird tatsächlich gearbeitet: von der Rolle
// werden ABSCHNITTE abgezogen und quer in Streifen der Abwicklungsbreite
// geteilt. Ein Abschnitt ist immer so lang wie das LÄNGSTE Blech - alles
// darüber liesse sich in der Werkstatt nicht mehr sinnvoll handhaben. Es
// werden so viele Abschnitte gezogen, wie es braucht.
//
//   Abschnittlänge        = längstes Stück
//   Streifen je Abschnitt = ganzzahlig(Rollenbreite ÷ Abwicklung)
//   Abschnitte            = aufgerundet(Streifen ÷ Streifen je Abschnitt)
//   Rollenlänge           = Abschnitte × Abschnittlänge
//   Blechfläche           = Rollenbreite × Rollenlänge
//
// In EINEM Streifen dürfen mehrere Stücke hintereinander liegen, solange sie
// zusammen in einen Abschnitt passen - dafür ist die Packrechnung da. Jedes
// Stück wird auf seine genaue Länge geschnitten; kein Stück läuft über die
// Abschnittgrenze hinweg.
//
// ---- Die EINE Packrechnung der App ----------------------------------------
// Kern ist ein einziges rekursives Verfahren: passen alle Stücke in k Streifen
// der Länge L? ebaPackeInStreifen() sucht damit die kleinste Streifenzahl bei
// fester Abschnittlänge. Reicht das Suchbudget nicht, wird die gierige Lösung
// zurückgegeben und ausdrücklich NICHT als beste ausgewiesen.

// Sortierte Stückliste, längstes zuerst - Grundlage beider Eingänge.
function ebaStueckliste(bleche){
 return (bleche||[]).filter(x=>ebaZahl(x.laenge)>0).slice()
  .sort((a,b)=>ebaZahl(b.laenge)-ebaZahl(a.laenge));
}
// Der Kern: verteilt die (absteigend sortierten) Stücke auf k Streifen der
// Länge L. Rückgabe: die Streifen, false (passt nicht) oder null (Budget aus).
// Die Schnittbreite der Schere/Saege. Firmenweit aus app_settings, Vorgabe 0
// (dann rechnet alles exakt wie bis v3.03). Jedes Stueck kostet zusaetzlich
// EINEN Schnitt - den, der es vom Rest des Streifens trennt. Das ist das
// uebliche Modell fuer eindimensionalen Zuschnitt.
function ebaSchnittfuge(){
 const v=(typeof blechSchnittfuge!=="undefined")?Number(blechSchnittfuge):0;
 return Number.isFinite(v)&&v>0?v:0;
}
// Wie viele Streifen der Breite A nebeneinander aus einer Rolle der Breite B
// entstehen. Zwischen zwei Streifen liegt ein Laengsschnitt, der aeussere
// Rand der letzten ist die Rollenkante - also n-1 Schnitte fuer n Streifen.
// Mit Schnittfuge 0 ist das exakt das bisherige Math.floor(B/A).
function ebaStreifenJeAbschnitt(B,A){
 const b=Number(B)||0, a=Number(A)||0;
 if(a<=0||b<=0)return 0;
 const f=ebaSchnittfuge();
 return Math.floor((b+f)/(a+f));
}
// Was neben den Streifen von der Rollenbreite uebrig bleibt - der seitliche
// Rand ueber die ganze Rollenlaenge. Bis v3.25 stand die Formel elfmal im
// Code als B - jeAbschnitt*A und zog die Laengsschnitte NICHT ab; der
// gemeldete Rand war damit um (n-1) Fugen zu breit und ein Rest, den es so
// gar nicht gibt, waere ins Lager gewandert. Beispiel B=1000, A=250, f=3:
// drei Streifen brauchen 3*250 + 2*3 = 756 mm, frei sind 244 mm - gemeldet
// wurden 250 mm. Mit Fuge 0 ist es exakt die alte Zahl, deshalb aendert
// sich bei beiden Firmen (Vorgabe 0) keine bestehende Angabe.
function ebaRestBreite(B,A,jeAbschnitt){
 const b=Number(B)||0, a=Number(A)||0, n=Number(jeAbschnitt)||0;
 if(b<=0||a<=0||n<1)return 0;
 const rest=b-n*a-(n-1)*ebaSchnittfuge();
 return rest>0?rest:0;
}
function ebaVerteile(stuecke,k,L,budget){
 if(k<1)return stuecke.length?false:[];
 const fuge=ebaSchnittfuge();
 // Die Schnittfuge faellt ZWISCHEN zwei Stuecken an, nicht vor dem ersten:
 // der Abschnitt ist beim Abziehen von der Rolle bereits abgetrennt. n
 // Stuecke brauchen deshalb n-1 Fugen. Genau diese Regel verwendet
 // ebaStreifenJeAbschnitt() in der Breite auch - floor((B+f)/(a+f)).
 // Bis v3.08 rechnete diese Funktion mit n Fugen und verglich das laengste
 // Stueck PLUS Fuge gegen einen Abschnitt OHNE Fugenzugabe; damit war ab
 // jeder Schnittfuge > 0 jedes laengste Stueck "zu lang" und der ganze
 // Plan leer. Beide Firmen standen auf 0, deshalb ist das nie aufgefallen.
 if(stuecke.length&&ebaZahl(stuecke[0].laenge)>L+1e-9)return false;
 const streifen=Array.from({length:k},()=>({stuecke:[],rest:L}));
 let schritte=0; const grenze=budget||200000; let ausBudget=false;
 const setze=i=>{
  if(i>=stuecke.length)return true;
  if(++schritte>grenze){ausBudget=true;return false}
  const roh=ebaZahl(stuecke[i].laenge), gesehen=[];
  for(let j=0;j<streifen.length;j++){
   // Nur wenn schon etwas im Streifen liegt, kostet das naechste Stueck
   // zusaetzlich eine Schnittfuge.
   const len=roh+(streifen[j].stuecke.length?fuge:0);
   if(streifen[j].rest<len-1e-9)continue;
   // Zwei Streifen mit gleichem Rest sind austauschbar - der zweite bringt
   // nichts Neues und wird übersprungen.
   if(gesehen.indexOf(streifen[j].rest)>=0)continue;
   gesehen.push(streifen[j].rest);
   streifen[j].stuecke.push(stuecke[i]); streifen[j].rest-=len;
   if(setze(i+1))return true;
   streifen[j].stuecke.pop(); streifen[j].rest+=len;
   if(ausBudget)return false;
  }
  return false;
 };
 if(setze(0))return streifen;
 return ausBudget?null:false;
}
// Eingang 1: feste Streifenlänge L, kleinstmögliche Streifenzahl.
function ebaPackeInStreifen(bleche,L,budget){
 // bleche: [{nr, laenge}] - die Nummer reist mit, damit in der Liste jedes
 // Blech mit SEINER genauen Länge steht und nicht nur eine nackte Zahl.
 const stuecke=ebaStueckliste(bleche);
 if(!stuecke.length)return {streifen:[],optimal:true};
 // Die Schnittfuge faellt ZWISCHEN zwei Stuecken an (siehe ebaVerteile):
 // ein Stueck allein braucht keine, jedes weitere im selben Streifen eine.
 const fuge=ebaSchnittfuge();
 const roh=x=>ebaZahl(x.laenge);
 if(roh(stuecke[0])>L)
  return {streifen:null,optimal:true,zuLang:stuecke.filter(x=>roh(x)>L)};
 const gierig=[];
 stuecke.forEach(x=>{
  const s=gierig.find(g=>g.rest>=roh(x)+fuge-1e-9);
  if(s){s.stuecke.push(x);s.rest-=roh(x)+fuge}
  else gierig.push({stuecke:[x],rest:L-roh(x)});
 });
 // Untergrenze: das reine Material passt nicht in weniger als so viele
 // Streifen. Die Fugen kommen nur dazu, die Grenze bleibt gueltig.
 const summe=stuecke.reduce((a,b)=>a+roh(b),0);
 const untergrenze=Math.ceil(summe/L-1e-9);
 for(let k=untergrenze;k<gierig.length;k++){
  const v=ebaVerteile(stuecke,k,L,budget);
  if(v===null)return {streifen:gierig,optimal:false};
  if(v)return {streifen:v,optimal:true};
 }
 return {streifen:gierig,optimal:true};
}
// ---- Reststuecke als Eingang (v3.27) --------------------------------------
// Der EINE Einstiegspunkt fuer alle Rollen-Module. Gerechnet wird in
// restVorabzug() (js/42) mit ebaVerteile() und ebaStreifenJeAbschnitt() von
// oben - es entsteht KEINE zweite Packrechnung.
//
// Ohne js/42 oder mit ausgeschalteter Einstellung kommt die Liste unveraendert
// zurueck; die Rollenrechnung darunter verhaelt sich dann exakt wie bis v3.26.
//
// abschnittLaenge ist das laengste VERBLEIBENDE Stueck: wird das laengste aus
// einem Rest geschnitten, wird der Abschnitt von der Rolle entsprechend
// kuerzer.
function ebaVorabzug(bleche,kontext){
 const liste=(bleche||[]).slice();
 // v3.31: Die Materialstaerke steht seit v3.31 an der Massaufnahme selbst
 // und macht den Bedarf eindeutig, wo der Materialbestand mehrere Staerken
 // fuehrt. Alle zwoelf Aufrufer sind das offene Formular; der projektweite
 // Plan (js/49) rechnet ueber mehrere Massaufnahmen und setzt sie
 // ausdruecklich selbst auf null.
 const k=Object.assign({},kontext||{});
 if(k.staerke===undefined&&typeof measStaerkeGet==="function")k.staerke=measStaerkeGet();
 const v=(typeof restVorabzug==="function")?restVorabzug(liste,k)
   :{bleche:liste,ausResten:[],grund:"aus"};
 const l=(v.bleche||[]).map(x=>Number(x&&x.laenge)||0).filter(x=>x>0);
 v.abschnittLaenge=l.length?Math.max.apply(null,l):0;
 return v;
}
// v3.29: die schlanke Form von ausResten fuer den Speicher-Payload.
//
// WARUM UEBERHAUPT: bis v3.28 fiel ausResten beim Speichern weg - und
// zuPlanAusGespeichert() (js/33) las es auch nicht. Die Stuecke, die aus
// einem Rest geschnitten werden, fehlten dadurch im gespeicherten Plan
// GANZ: weder unter "aus Rest" noch bei der Rolle. Ruestliste, Werkstatt,
// Abhaken und der Stand "7 von 12" verloren sie lautlos. Aufgefallen ist
// das nur, weil der Schalter "Reste im Zuschnitt" bei beiden Firmen aus
// steht und der Weg noch nie gelaufen ist.
//
// Gespeichert wird bewusst NICHT die ganze Reststueck-Zeile - nur das,
// was der Ausdruck spaeter braucht. Der Rest selbst kann inzwischen
// verbraucht oder geloescht sein; die id bleibt als Verweis stehen.
function ebaAusRestenSpeicher(liste){
 return (liste||[]).map(x=>({
  id:x.id||null,
  laenge:Number(x.laenge)||0, breite:Number(x.breite)||0,
  abwicklung:Number(x.abwicklung)||0,
  material_name:(x.rest&&x.rest.material_name)||null,
  stuecke:(x.stuecke||[]).map(st=>({nr:st.nr,laenge:st.laenge,
    merkmal:st.merkmal||"",hinweis:st.hinweis||""}))
 })).filter(x=>x.stuecke.length);
}
// ---- Rolle oder Tafel (v3.33) ---------------------------------------------
// Bis v3.32 rechnete der Zuschnitt AUSSCHLIESSLICH mit Rollenblech: ein
// Abschnitt wird abgezogen, so lang wie das laengste Stueck, und quer in
// Streifen der Abwicklungsbreite geteilt. Eine Tafel hat dagegen eine feste
// Laenge UND eine feste Breite.
//
// Der Schluessel ist eine geometrische Beobachtung: eine Tafel ist genau ein
// Abschnitt mit fester Laenge und fester Breite - also exakt die Form, fuer
// die ebaVerteile() gebaut ist. Es entsteht deshalb KEINE zweite
// Packrechnung; es aendert sich nur, woher L und B kommen:
//
//   Rolle:  B = Rollenbreite (firmenweit)   L = laengstes Stueck
//   Tafel:  B = Tafelbreite (am Material)   L = Tafellaenge
//
// Dasselbe Argument wie bei den Reststuecken in v3.27 (CLAUDE.md 132.5).
//
// Woher die Form kommt: aus dem Materialbestand (js/59) ueber
// restBedarfForm() (js/42) - dieselbe Quelle, die schon Staerke und
// Ausfuehrung liefert. Was dort nicht eindeutig ist, wird NICHT geraten:
// dann bleibt es beim bisherigen Verhalten (Rolle), und die Anzeige sagt
// warum. Eine ausdrueckliche Wahl an der Massaufnahme (js/61) schlaegt den
// Bestand - der Zuschneider weiss besser, was auf dem Bock liegt.
function ebaFormatText(f){
 if(!f)return "";
 return f.laenge===null
  ? Math.round(f.breite).toLocaleString("de-CH")+" mm"
  : Math.round(f.laenge).toLocaleString("de-CH")+" × "+Math.round(f.breite).toLocaleString("de-CH")+" mm";
}
function ebaRollenFormate(){
 return ebaRollenAktiv().map(B=>({breite:B,laenge:null,text:ebaFormatText({breite:B,laenge:null})}));
}
function ebaFormate(kontext){
 const k=kontext||{};
 // Die ausdrueckliche Wahl an der Massaufnahme, wenn es sie gibt.
 let wahl=k.form;
 if(wahl===undefined&&typeof measZuschnittFormGet==="function")wahl=measZuschnittFormGet();
 let staerke=k.staerke;
 if(staerke===undefined&&typeof measStaerkeGet==="function")staerke=measStaerkeGet();
 const bedarf=(typeof restBedarfForm==="function")
   ? restBedarfForm(k.material,staerke)
   : {form:null,grund:"kein-lager",formate:[]};
 const form=(wahl==="rolle"||wahl==="tafel")?wahl:bedarf.form;
 if(form==="tafel"){
  const formate=(bedarf.formate||[]).map(f=>({breite:f.breite,laenge:f.laenge,text:f.text}));
  if(formate.length)
   return {form:"tafel",formate,grund:"",quelle:wahl?"wahl":"bestand",bedarf};
  // Tafel gewaehlt, aber kein Format hinterlegt: es wird keines erfunden.
  // Gerechnet wird weiter mit der Rolle, und das steht ausdruecklich da.
  return {form:"rolle",formate:ebaRollenFormate(),
          grund:wahl?"tafel-ohne-format":(bedarf.grund||"tafel-ohne-format"),
          quelle:"rueckfall",bedarf};
 }
 if(form==="rolle")
  return {form:"rolle",formate:ebaRollenFormate(),grund:"",
          quelle:wahl?"wahl":"bestand",bedarf};
 return {form:"rolle",formate:ebaRollenFormate(),grund:bedarf.grund||"ohne-form",
         quelle:"rueckfall",bedarf};
}

// Der EINE Formatplan fuer alle zehn Rollen-Module - Einzelbreite wie
// Gruppen. gruppen ist [{breite, bleche:[{nr,laenge,merkmal,hinweis}]}];
// bei genau einer Gruppe kommen die Felder zusaetzlich flach zurueck, damit
// die bestehende Darstellung (js/33) unveraendert damit arbeitet.
//
// Gepackt wird je Abschnittlaenge EINMAL und danach aus dem Zwischenspeicher
// bedient: bei der Rolle haengt L nicht vom Format ab, bei der Tafel schon.
function ebaFormatPlan(opt){
 const o=opt||{};
 const gruppen=(o.gruppen||[]).filter(g=>g&&(g.bleche||[]).length&&Number(g.breite)>0);
 const formate=(o.formate||[]).filter(f=>f&&Number(f.breite)>0);
 const netto=Number(o.netto)||0;
 const leer={moeglich:[],zuSchmal:formate.map(f=>f.breite),zuLang:[],zuKurz:[],bestes:null,
             gruppen:gruppen.map(g=>Object.assign({},g,{streifen:[],abschnittLaenge:0})),
             netto,optimal:true,form:o.form==="tafel"?"tafel":"rolle",formate};
 if(!gruppen.length||!formate.length)return leer;
 const cache={};
 const packe=(gi,L)=>{
  const k=gi+"|"+L;
  if(!cache[k])cache[k]=ebaPackeInStreifen(gruppen[gi].bleche,L);
  return cache[k];
 };
 const laengstes=g=>{
  const l=(g.bleche||[]).map(x=>Number(x.laenge)||0).filter(x=>x>0);
  return l.length?Math.max.apply(null,l):0;
 };
 // zuKurz: Formate, die an einem zu langen Stueck scheitern. Nur bei der
 // Tafel moeglich - bei der Rolle ist L das laengste Stueck.
 const moeglich=[], zuSchmal=[], zuKurz=[];
 formate.forEach(f=>{
  const zeilen=[]; let flaeche=0, schmal=false, lang=null;
  for(let gi=0;gi<gruppen.length;gi++){
   const g=gruppen[gi];
   const jeAbschnitt=ebaStreifenJeAbschnitt(f.breite,g.breite);
   if(jeAbschnitt<1){schmal=true;break}
   const L=f.laenge===null?laengstes(g):f.laenge;
   // Nur bei der Tafel moeglich: ein Stueck ist laenger als die Tafel. Es
   // wird nicht stillschweigend gekuerzt - das Format faellt weg.
   const zu=(g.bleche||[]).filter(x=>(Number(x.laenge)||0)>L+1e-6);
   if(zu.length){lang={format:f,stuecke:zu.map(x=>({nr:x.nr,laenge:x.laenge})),laenge:L};break}
   const v=packe(gi,L);
   const streifen=v.streifen||[];
   const abschnitte=Math.ceil(streifen.length/jeAbschnitt);
   const rollenLaenge=abschnitte*L;
   flaeche+=f.breite*rollenLaenge/1e6;
   zeilen.push({breite:g.breite,jeTafel:jeAbschnitt,jeAbschnitt,abschnitte,
     abschnittLaenge:L,rollenLaenge,streifen:streifen.length,
     ungenutzteStreifen:abschnitte*jeAbschnitt-streifen.length,
     restBreite:ebaRestBreite(f.breite,g.breite,jeAbschnitt)});
  }
  if(schmal){zuSchmal.push(f.breite);return}
  if(lang){zuKurz.push(lang);return}
  const e={breite:f.breite,laenge:f.laenge,text:f.text||ebaFormatText(f),
    zeilen,flaeche,verschnitt:flaeche-netto,
    anteil:flaeche>0?(flaeche-netto)/flaeche*100:0,
    rollenLaenge:zeilen.reduce((s,x)=>s+x.rollenLaenge,0)};
  if(zeilen.length===1)Object.assign(e,zeilen[0],{breite:f.breite,laenge:f.laenge});
  moeglich.push(e);
 });
 moeglich.sort((x,y)=>x.flaeche-y.flaeche||x.rollenLaenge-y.rollenLaenge||y.breite-x.breite);
 const best=moeglich[0]||null;
 // Passt gar kein Format, sagt die Liste, welche Stuecke selbst im laengsten
 // nicht unterkommen - das ist die Angabe, die die Werkstatt braucht.
 // Die gemeinsame Darstellung (js/33) erwartet dafuer [{nr,laenge}].
 let zuLang=[];
 if(!moeglich.length&&zuKurz.length){
  const l=zuKurz.slice().sort((a,b)=>b.laenge-a.laenge)[0];
  zuLang=l.stuecke||[];
 }
 // Die Packung des BESTEN Formats ist die, mit der gearbeitet wird.
 // Passt KEIN Format, wird trotzdem gepackt - mit dem laengsten Stueck als
 // Abschnittlaenge, also genau wie im Rollenmodell bis v3.32. Sonst haette
 // die Gruppe keine Streifen, und die Zuschnittliste (js/33 baut sie aus
 // gruppen[].streifen[]) verschwaende ganz: der Zuschneider saehe nur noch
 // die Warnung und nicht mehr, WAS zu schneiden ist. Vom Pruefstand gefunden.
 const gefuellt=gruppen.map((g,gi)=>{
  const z=best?best.zeilen[gi]:null;
  const L=z?z.abschnittLaenge:laengstes(g);
  const v=(L>0)?packe(gi,L):{streifen:[],optimal:true};
  return Object.assign({},g,{abschnittLaenge:L,streifen:v.streifen||[],
    optimal:v.optimal!==false,
    jeAbschnitt:z?z.jeAbschnitt:1,abschnitte:z?z.abschnitte:0,
    rollenLaenge:z?z.rollenLaenge:0,verteilung:v});
 });
 return {moeglich,zuSchmal,zuLang,zuKurz,bestes:best,gruppen:gefuellt,netto,
         optimal:gefuellt.every(g=>g.optimal!==false),
         form:o.form==="tafel"?"tafel":"rolle",formate};
}

// Der Leertext haengt an der Form: ohne Rollenbreite bzw. ohne Tafelformat
// laesst sich gar nichts planen, und mit hinterlegten Formaten passt keines.
// EINE Stelle fuer alle zehn Rollen-Module - sonst haetten zehn Module zehn
// verschiedene Saetze fuer dieselbe Lage.
function ebaLeerText(fm,ohneStuecke){
 if(ohneStuecke)return ohneStuecke;
 const tafel=!!(fm&&fm.form==="tafel");
 if(!(fm&&(fm.formate||[]).length))
  return tafel?"Es ist kein Tafelformat hinterlegt (Einstellungen → Allgemein → Materialbestand)."
             :"Es ist keine Rollenbreite hinterlegt.";
 return tafel?"Kein hinterlegtes Tafelformat passt zu diesem Zuschnitt – zu schmal oder zu kurz."
            :"Keine hinterlegte Rollenbreite ist so breit wie die Abwicklung.";
}

// ACHTUNG, historischer Name: das ist NICHT die Laenge einer Tafel, sondern
// das laengste Stueck - so hiess die Abschnittlaenge im Rollenmodell seit
// v2.87. Die echte Tafellaenge kommt seit v3.33 aus ebaFormate().
function ebaTafelLaenge(){
 const l=(ebA.stuecke||[]).map(p=>ebaZahl(p.laenge)).filter(x=>x>0);
 return l.length?Math.max.apply(null,l):0;
}
// v3.19: Eine Gehrung ist eine ECKE, kein Haken. Stossen zwei Stuecke mit
// "Gehrung rechts" und "Gehrung links" aneinander, ist das dieselbe physische
// Ecke - sie darf nur einmal zaehlen. Vorher stand dort 2 statt 1.
// Ein einzelner Haken ohne Gegenstueck (aeusseres Ende, oder der Nachbar wurde
// wieder abgehakt) ist eine Gehrung fuer sich.
// Wird auch vom konischen Modul (js/30) benutzt - eine Regel, keine zwei.
function ebaGehrungAnzahl(stuecke){
 const l=stuecke||[]; let n=0;
 for(let i=0;i<l.length;i++){
  const vor=i>0?l[i-1]:null;
  if(l[i].gehrungLinks&&!(vor&&vor.gehrungRechts))n++;
  if(l[i].gehrungRechts)n++;
 }
 return n;
}
// Kurztext der Gehrungen eines Stuecks - leer, wenn keine vorhanden ist.
function ebaGehrungText(p){
 const l=p&&p.gehrungLinks, r=p&&p.gehrungRechts;
 if(l&&r)return "Gehrung links und rechts";
 if(l)return "Gehrung links";
 if(r)return "Gehrung rechts";
 return "";
}
// Ohne Stuecke gibt es keinen Plan - die FORM steht aber trotzdem fest. Ohne
// diese Stelle haetten die Module in ihrem leeren Rueckgabepfad immer "rolle"
// gemeldet, und der Registername sowie der Leertext haetten bei Tafelmaterial
// faelschlich von der Rolle gesprochen.
function ebaFormLeer(material){
 const f=(typeof ebaFormate==="function")?ebaFormate({material}):null;
 return f?{form:f.form,formGrund:f.grund,formQuelle:f.quelle,formate:f.formate||[]}
        :{form:"rolle",formGrund:"",formQuelle:"",formate:[]};
}
function ebaRollenPlan(){
 const A=ebaZahl(ebA.abwicklung);
 // "merkmal" entscheidet in der gemeinsamen Zuschnittliste (js/33), ob zwei
 // Stuecke zusammengefasst werden duerfen. Eine Gehrung macht denselben
 // Zuschnitt zu einem anderen Zuschnitt - sie darf nicht verschwinden.
 const alleBleche=(ebA.stuecke||[]).map((p,i)=>({nr:i+1,laenge:ebaZahl(p.laenge),
   merkmal:ebaGehrungText(p)}))
  .filter(x=>x.laenge>0);
 const material=(typeof ebA!=="undefined"&&ebA)?ebA.material:null;
 const vor=ebaVorabzug(alleBleche,{material,abwicklung:A});
 const bleche=vor.bleche;
 // v3.33: Rolle oder Tafel entscheidet der Materialbestand bzw. die Wahl an
 // der Massaufnahme - gerechnet wird beides mit derselben Packrechnung.
 const fm=ebaFormate({material,abwicklung:A});
 const p=ebaFormatPlan({gruppen:[{breite:A,bleche}],formate:fm.formate,
                        form:fm.form,netto:ebaFlaecheM2()});
 const g=p.gruppen[0]||{streifen:[],abschnittLaenge:0,verteilung:{streifen:[]}};
 return {moeglich:p.moeglich,zuSchmal:p.zuSchmal,zuLang:p.zuLang,zuKurz:p.zuKurz,bestes:p.bestes,
         abschnittLaenge:g.abschnittLaenge||vor.abschnittLaenge||ebaTafelLaenge(),
         verteilung:g.verteilung,streifen:g.streifen,netto:p.netto,optimal:p.optimal,
         form:p.form,formGrund:fm.grund,formQuelle:fm.quelle,formate:p.formate,
         ausResten:vor.ausResten};
}

// ---- Ausmass ---------------------------------------------------------------
// Entsteht ausschliesslich aus der Aufnahme. Nichts wird ein zweites Mal
// eingegeben, es gibt keine Artikelnummern und keine Preise.
function ebaAusmassZeilen(){
 const a=ebA, z=[], L=ebaGesamtlaenge();
 let pos=0;
 // v3.17: teil sagt, ob die Zeile ein Teil ist, das beschafft wird (Halbfabrikat,
 // gekaufter Artikel), oder ein abgeleitetes Mass. Die Reservierung nimmt nur
 // Teile. Ohne vierten Wert gilt "abgeleitet" - eine Zahl ueber die Arbeit ist
 // nichts, was jemand aus dem Lager holt.
 const zeile=(bez,menge,einheit,herkunft,teil)=>z.push({pos:++pos,bezeichnung:bez,menge,einheit,herkunft,teil:teil===true});
 if(L>0)zeile("Einlaufblech gerade, Abwicklung "+ebaMm(a.abwicklung)+" mm",ebaMeter(L),"m","Summe der Zuschnittlängen");
 if((a.stuecke||[]).length)zeile("Stücke (Zuschnitte)",a.stuecke.length,"Stk.","Stückliste");
 const gehrungen=ebaGehrungAnzahl(a.stuecke);
 if(gehrungen)zeile("Gehrungen",gehrungen,"Stk.","je Ecke, nicht je Haken");
 const stoss=Math.max(0,(a.stuecke||[]).length-1);
 if(stoss)zeile("Blechstösse",stoss,"Stk.","je Übergang zwischen zwei Stücken");
 if(L>0)zeile("Blechfläche",ebaFlaecheM2().toFixed(2).replace(".",","),"m²","Gesamtlänge × Abwicklung");
 const nG=ebaGavaAnzahl();
 if(nG!==null)zeile("Haltebleche (GAVA Blech)",nG,"Stk.",
   (a.gava.anzahl?"Eingabe":"Länge ÷ Abstand "+ebaMm(a.gava.abstand_mm)+" mm"),true);
 const letzte=(a.stuecke||[])[a.stuecke.length-1];
 if(letzte&&ebaZahl(letzte.endzugabeStart))zeile("Endzugabe erstes Stück",ebaMm(letzte.endzugabeStart),"mm","Einstellung Endzugabe");
 if(letzte&&ebaZahl(letzte.endzugabeEnd))zeile("Endzugabe letztes Stück",ebaMm(letzte.endzugabeEnd),"mm","Einstellung Endzugabe");
 return z;
}

// ---- Kontrolle -------------------------------------------------------------
// Nur Prüfungen, die sich aus dem bestehenden Modul ableiten lassen. Es
// werden keine fachlichen Grenzwerte erfunden.
function ebaPruefungen(){
 const a=ebA, m=[], s=einlaufblechSettings;
 const uO=ebaZahl(s.umschlag_oben), uU=ebaZahl(s.umschlag_unten);
 if(!ebaZahl(a.massA))m.push({art:"fehler",text:"Mass A fehlt – Pflichtfeld beim Speichern."});
 else if(ebaZahl(a.massA)<0)m.push({art:"fehler",text:"Mass A ist negativ."});
 if(a.winkel===""||a.winkel===null||a.winkel===undefined)
  m.push({art:"fehler",text:"Dachneigung / Winkel fehlt – Pflichtfeld beim Speichern."});
 else if(ebaZahl(a.winkel)<=0||ebaZahl(a.winkel)>=180)
  m.push({art:"fehler",text:"Winkel "+ebaZahl(a.winkel)+"° lässt sich nicht zeichnen: die Schnittzeichnung rechnet mit 180° − Winkel, also nur zwischen 0° und 180°."});
 const rb=ebaRestbreite();
 if(rb<0)m.push({art:"fehler",text:"Restbreite "+ebaMm(rb)+" mm – Mass A und die Umschläge sind zusammen grösser als die Abwicklung ("+ebaMm(a.abwicklung)+" mm)."});
 else if(rb===0)m.push({art:"warnung",text:"Restbreite ist 0 mm – für die Dachschräge bleibt nichts übrig."});
 if(uO<=0||uU<=0)m.push({art:"warnung",text:"Umschlag oben oder unten ist 0 mm. Die Schnittzeichnung zeigt dafür nur einen Platzhalter."});
 if(!(a.stuecke||[]).length)
  m.push({art:"fehler",text:"Noch kein Stück erfasst – mindestens eines mit einer Länge ist zum Speichern nötig."});
 else{
  if(!a.stuecke.some(p=>ebaZahl(p.laenge)>0))
   m.push({art:"fehler",text:"Kein Stück hat eine Länge grösser als 0 mm."});
  const grenze=ebaZahl(s.stoss_laenge)+ebaZahl(s.ueberlappung);
  a.stuecke.forEach((p,i)=>{
   if(ebaZahl(p.laenge)<0)m.push({art:"fehler",text:"Stück "+(i+1)+" hat eine negative Länge."});
   if(i<a.stuecke.length-1&&ebaZahl(p.laenge)>grenze)
    m.push({art:"warnung",text:"Stück "+(i+1)+" ist "+ebaMm(p.laenge)+" mm lang. Ausser dem Reststück darf keines länger sein als Länge Stoss/Stoss + Überlappung ("+ebaMm(grenze)+" mm)."});
  });
 }
 if(!a.material)m.push({art:"warnung",text:"Kein Material gewählt – die Materialübersicht bleibt unvollständig."});
 return m;
}

// ---- Oberfläche ------------------------------------------------------------
// Wiederverwendet die Register-/Karten-Stile der Rinnen-Aufnahme (ra-*): sie
// sind generisch und bereits auf Tablet und Handy erprobt.
function ebaFeld(label,inhalt,voll){
 return `<div${voll?' class="wide"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function ebaKarte(titel,inhalt){
 // Info-Knopf nur an der Hauptkarte des Registers (js/41-hilfe.js).
 const h=(typeof hilfeKarte==="function")?hilfeKarte(titel,EBA_REGISTER):"";
 return `<div class="ra-block"><h2 style="margin-top:14px">${esc(titel)}${h}</h2>${inhalt}</div>`;
}

function ebaGrunddatenHtml(){
 const a=ebA;
 const matOpt=`<option value="">– bitte wählen –</option>`+measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const abwOpt=[200,250,330].map(w=>
  `<option value="${w}"${Number(a.abwicklung)===w?" selected":""}>${w} mm</option>`).join("");
 const monOpt=[["links","von links"],["rechts","von rechts"]].map(([w,t])=>
  `<option value="${w}"${a.montage===w?" selected":""}>${esc(t)}</option>`).join("");
 return `<div class="grid">
${ebaFeld("Material",`<select id="eba_material">${matOpt}</select>`)}
${ebaFeld("Abwicklung",`<select id="eba_abwicklung">${abwOpt}</select>`)}
${ebaFeld("Montage",`<select id="eba_montage">${monOpt}</select>`)}
${ebaFeld("Enge Seite",`<div class="ra-wert" id="eba_wSeite">${esc(ebaEngeSeite())}</div>`)}
</div>
<div class="info">Die Bleche werden leicht konisch gebogen, damit sie ineinandergesteckt werden können;
die weite Seite wird angereift. Länge Stoss/Stoss, Überlappung, Umschläge, Gehrungs- und Endzugabe
stehen in <b>Einstellungen → Allgemein → Rollenbreiten des Blechlagers</b>.
<button type="button" class="gray" id="eba_einstellungen" style="margin-left:8px;padding:3px 9px;font-size:11px">⚙️ Werte anpassen</button></div>`;
}

function ebaGeometrieHtml(){
 const a=ebA;
 const rb=ebaRestbreite();
 return `<div class="grid">
${ebaFeld("Mass A (mm)",`<input id="eba_massA" data-pflicht="1" type="number" inputmode="numeric" step="1" value="${a.massA===""?"":esc(a.massA)}">`)}
${ebaFeld("Dachneigung / Winkel (°)",`<input id="eba_winkel" data-pflicht="1" type="number" inputmode="decimal" step="0.1" value="${a.winkel===""?"":esc(a.winkel)}">`)}
${ebaFeld("Enges Mass A",`<div class="ra-wert" id="eba_wEng">${esc(ebaMm(ebaMassAEng()))} mm</div>`)}
${ebaFeld("Restbreite (Dachschräge)",`<div class="ra-wert${rb<0?" ra-rest":""}" id="eba_wRest">${esc(ebaMm(rb))} mm</div>`)}
</div>
<div class="small" id="eba_formel" style="margin:2px 0 8px;color:var(--muted)">${ebaFormelText()}</div>
<div id="eba_schnitt" class="eb-diagram-box"></div>`;
}
function ebaFormelText(){
 const a=ebA, s=einlaufblechSettings;
 return `Restbreite = Abwicklung ${esc(ebaMm(a.abwicklung))} − Mass A ${esc(ebaMm(a.massA))}`
  +` − Umschlag oben ${esc(ebaMm(s.umschlag_oben))} − Umschlag unten ${esc(ebaMm(s.umschlag_unten))} mm.`
  +` Enges Mass A = Mass A − 2 mm, es gilt bei Montage „von ${esc(a.montage)}“ auf der ${esc(ebaEngeSeite())}en Seite.`;
}

function ebaStueckeHtml(){
 const a=ebA;
 const L=ebaGesamtlaenge();
 const eng=ebaMassAEng(), seite=ebaEngeSeite();
 const letzte=(a.stuecke||[])[a.stuecke.length-1]||{};
 const zeilen=(a.stuecke||[]).map((p,i)=>`<tr>
<td>${i+1}</td>
<td><input data-eba-stoss="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.stossStoss||0)}"></td>
<td><div class="zu-lb"><input data-eba-laenge="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.laenge||0)}"><span class="zu-lb-breite">mm × ${esc(ebaMm(a.abwicklung))}&nbsp;mm</span></div></td>
<td class="p-mitte"><input data-eba-gl="${i}" type="checkbox"${p.gehrungLinks?" checked":""}></td>
<td class="p-mitte"><input data-eba-gr="${i}" type="checkbox"${p.gehrungRechts?" checked":""}></td>
<td><div style="display:flex;gap:4px;align-items:center"><input data-eba-winkel="${i}" type="number" inputmode="numeric" step="1" value="${esc(p.winkel||0)}" style="flex:1"><button type="button" class="gray ra-weg" data-eba-flip="${i}" title="Winkel umkehren">🔄</button></div></td>
<td>${esc(ebaMm(eng))}</td>
<td class="p-mitte"><button type="button" class="red ra-weg" data-eba-weg="${i}" title="Stück löschen">✕</button></td>
</tr>`).join("");
 return `<div class="grid">
${ebaFeld("Gesamtlänge (mm)",`<input id="eba_gesamt" type="number" inputmode="numeric" step="1" value="${a.gesamtlaenge===""?"":esc(a.gesamtlaenge)}" placeholder="für die Aufteilung">`)}
${ebaFeld("Aus den Stücken",`<div class="ra-wert" id="eba_wLaenge">${L>0?esc(ebaMm(L))+" mm":"–"}</div>`)}
</div>
<div class="bar">
<button type="button" class="gray" id="eba_neuAusGesamt">🔄 Stücke aus Gesamtlänge berechnen</button>
<button type="button" class="gray" id="eba_anhaengen">➕ Weitere Länge anfügen</button>
<button type="button" class="gray" id="eba_stueckPlus">＋ Stück hinzufügen</button>
</div>
<div class="small" style="margin:2px 0 8px;color:var(--muted)">„Anfügen“ ergänzt Stücke aus der Gesamtlänge ans Ende der Liste, z. B. um nach einer Gehrung in eine andere Richtung weiterzufahren.</div>
<div class="small" style="margin-bottom:4px">Mass A gilt für alle Stücke. Das enge Mass (${esc(ebaMm(eng))} mm) wird bei Montage „von ${esc(a.montage)}“ auf der ${esc(seite)}en Seite jedes Stücks berechnet.</div>
<div class="scroll">
<table class="eb-table eba-tab">
<thead><tr><th>Nr.</th><th>Länge Stoss/Stoss (mm)</th><th>Zuschnitt (Länge × Breite)</th><th>Ger. L</th><th>Ger. R</th><th>Winkel (°)</th><th>Eng ${esc(seite)} (mm)</th><th></th></tr></thead>
<tbody>${zeilen||'<tr><td colspan="8" class="small">Noch kein Stück. „Stücke aus Gesamtlänge berechnen“ oder „＋ Stück hinzufügen“.</td></tr>'}</tbody>
</table>
</div>
<div class="bar">
<button type="button" class="gray" id="eba_endStart">Endzugabe erstes Stück: ${letzte.endzugabeStart?"ein":"aus"}</button>
<button type="button" class="gray" id="eba_endEnde">Endzugabe letztes Stück: ${letzte.endzugabeEnd?"ein":"aus"}</button>
</div>
<h2 style="margin-top:14px">Grundriss</h2>
<div class="info">Winkel = Richtungsänderung nach diesem Stück (positiv/negativ möglich, 0 = keine Ecke).</div>
<div id="eba_grundriss" class="eb-diagram-box"></div>
${ebaGavaHtml()}`;
}
function ebaGavaHtml(){
 const g=ebA.gava||{}, n=ebaGavaAnzahl(), vor=ebaGavaVorschlag();
 return `<div class="ra-dehnung">
<label class="ra-schalter"><input type="checkbox" id="eba_gavaAktiv"${g.aktiv?" checked":""}> GAVA Blech (Haltebleche)</label>
${g.aktiv?`<div class="grid">
${ebaFeld("Abstand (mm)",`<input id="eba_gavaAbstand" type="number" inputmode="numeric" step="1" value="${esc(g.abstand_mm||"")}">`)}
${ebaFeld("Anzahl (leer = gerechnet)",`<input id="eba_gavaAnzahl" type="number" inputmode="numeric" step="1" value="${g.anzahl===null||g.anzahl===undefined?"":esc(g.anzahl)}">`)}
</div>
<div class="ra-dehnung-zahl"><span>Haltebleche</span><b id="eba_wGava">${n===null?"–":esc(n)+" Stk."}</b>
<span>${vor===null?"Länge und Abstand fehlen":"Länge ÷ Abstand + 1 ergibt "+esc(vor)}</span></div>
${vor!==null&&(g.anzahl!==null&&g.anzahl!==undefined&&g.anzahl!=="")?`<div class="bar"><button type="button" class="gray" id="eba_gavaZurueck">↻ Zurück zur Berechnung</button></div>`:""}`
 :`<div class="small" style="color:var(--muted)">Ohne Haken werden keine Haltebleche gerechnet und keine ins Ausmass gestellt.</div>`}
</div>`;
}

function ebaKontrolleHtml(){
 const m=ebaPruefungen();
 if(!m.length)return `<div class="ra-pruefung"><div class="ra-ok">Keine Auffälligkeit. Alles, was zum Speichern nötig ist, liegt vor.</div></div>`;
 return `<div class="ra-pruefung">`+m.map(x=>
  `<div class="ra-${x.art==="fehler"?"fehler":"warnung"}">${esc(x.text)}</div>`).join("")+`</div>`;
}

function ebaAusmassHtml(){
 const z=ebaAusmassZeilen();
 if(!z.length)return `<div class="small">Noch nichts zu messen – bitte zuerst Stücke erfassen.</div>`;
 const mat=findMeasurementMaterial(ebA.material);
 return `<div class="scroll"><table class="eb-table eba-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Woher</th></tr></thead>
<tbody>${z.map(x=>`<tr><td>${x.pos}</td><td>${esc(x.bezeichnung)}</td><td>${esc(x.menge)}</td><td>${esc(x.einheit)}</td><td class="small">${esc(x.herkunft)}</td></tr>`).join("")}</tbody>
</table></div>
<div class="small" style="margin-top:8px">Material: <b>${esc(mat?mat.name:"–")}</b> · Blechfläche <b>${esc(ebaFlaecheM2().toFixed(2).replace(".",","))} m²</b>.
Ohne Artikelnummern und ohne Preise – das Ausmass entsteht allein aus dieser Aufnahme.</div>`;
}

// Der Plan wird in die gemeinsame Form gebracht (js/33) und dort dargestellt -
// damit sieht der Zuschnitt in allen Massaufnahme-Arten gleich aus. Gerechnet
// wird weiterhin hier bzw. in ebaPackeInStreifen().
function ebaZuschnittPlan(){
 const plan=ebaRollenPlan();
 const best=plan.bestes;
 const A=ebaZahl(ebA.abwicklung);
 const fm={form:plan.form,formate:plan.formate||[]};
 return {art:plan.form, form:plan.form,
  formGrund:plan.formGrund, formQuelle:plan.formQuelle,
  einheit:"Stück",
  material:(typeof ebA!=="undefined")?(ebA.material):null,
  einleitung:zuEinleitung(plan.form),
  quelle:zuQuelle(plan.form),
  leer:ebaLeerText(fm,(ebA.stuecke||[]).length?"":"Noch nichts zuzuschneiden – bitte zuerst Stücke erfassen."),
  streifenbreiten:[A],
  gruppen:(plan.streifen||[]).length?[{breite:A,abschnittLaenge:plan.abschnittLaenge,
    jeAbschnitt:best?best.jeAbschnitt:1, abschnitte:best?best.abschnitte:0,
    rollenLaenge:best?best.rollenLaenge:0, streifen:plan.streifen}]:[],
  moeglich:plan.moeglich, netto:ebaFlaecheM2(),
  zuSchmal:plan.zuSchmal, zuLang:plan.zuLang||[], zuKurz:plan.zuKurz||[],
  ausResten:plan.ausResten||[],
  optimal:plan.optimal!==false};
}
function ebaZuschnittHtml(){
 const plan=ebaZuschnittPlan();
 return zuAuswahlHtml(ebA.rollenAuswahl,"data-eba-rolle",plan.art)+zuschnittHtml(plan);
}

// ---- Register --------------------------------------------------------------
function ebaSetzeSchritt(n){
 ebaSchritt=Math.max(1,Math.min(EBA_REGISTER.length,Number(n)||1));
 renderEinlaufblechAufnahme();
 // Der Foto-/Skizzenbereich haengt am Register: nur das letzte zeigt ihn.
 if(typeof measMedienSichtbarkeit==="function")measMedienSichtbarkeit();
 const kopf=$("eba_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function ebaRegisterHtml(){
 // Die Kontrolle bekommt einen Punkt, sobald es dort etwas zu sehen gibt –
 // sonst müsste man das Register aufsuchen, um zu merken, dass etwas fehlt.
 const p=ebaPruefungen();
 const fehler=p.filter(m=>m.art==="fehler").length;
 const warn=p.length-fehler;
 return `<div class="ra-register" id="eba_register">`+EBA_REGISTER.map(r=>{
  const marke=r.nr===EBA_KONTROLLE&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===ebaSchritt?" aktiv":""}" data-eba-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function ebaSchrittInhalt(){
 if(ebaSchritt===1)return ebaKarte("1 · Grunddaten",ebaGrunddatenHtml());
 if(ebaSchritt===2)return ebaKarte("2 · Geometrie",ebaGeometrieHtml());
 if(ebaSchritt===3)return ebaKarte("3 · Stücke",ebaStueckeHtml());
 if(ebaSchritt===4)return ebaKarte(zuTitel(4,ebaFormLeer(ebA.material).form),ebaZuschnittHtml());
 if(ebaSchritt===5)return ebaKarte("5 · Ausmass und Material",ebaAusmassHtml());
 return ebaKarte("6 · Kontrolle",ebaKontrolleHtml());
}
function renderEinlaufblechAufnahme(){
 const ziel=$("einlaufblechAufnahme");
 if(!ziel)return;
 // Hier verdrahten, nicht nur beim Zurücksetzen/Füllen: showMeasTypeSection()
 // zeichnet das Formular auch, ohne vorher eines von beiden aufzurufen –
 // ohne diese Zeile wäre es dann sichtbar, aber tot.
 ebaVerdrahten();
 ebaGeruest();
 ebaBruecke();
 ebaZeichnet=true;
 try{
 $("eba_kopf").innerHTML=ebaRegisterHtml()+ebaSchrittInhalt();
 $("eba_fuss").innerHTML=`<div class="bar ra-blaettern">
<button type="button" class="gray" id="eba_zurueck"${ebaSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="eba_weiter">${
 ebaSchritt>=EBA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(EBA_REGISTER[ebaSchritt].kurz)}</button>
</div>`;
 }finally{ebaZeichnet=false}
 ebaZeichnungen();
 ebaRinneBoxZeigen();
 // Die Pflichtfelder entstehen erst hier, nach markierePflichtfelder() beim
 // App-Start - deshalb fuer diesen Bereich noch einmal aufrufen (dasselbe
 // Vorgehen wie bei den Massfeldern der Ort-/Seitenbleche in js/20).
 if(typeof markierePflichtfelder==="function")markierePflichtfelder(ziel);
 // Die Registerleiste scrollt auf schmalen Geräten seitwärts. Das aktive
 // Register muss darin sichtbar sein – über die tatsächlichen Rechtecke,
 // nicht über offsetLeft (das bezieht sich auf den offsetParent).
 const strip=$("eba_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Der Übernahme-Block aus dem HTML gehört in Register 3, darf aber NICHT in
// einen Container, der per innerHTML neu geschrieben wird: js/15 hat seinen
// Klick-Handler beim Laden an #eb_rinneList gehängt, und ein Neuschreiben
// würde das Element samt Handler vernichten. Deshalb bekommt
// #einlaufblechAufnahme ein festes Gerüst aus drei Teilen; neu geschrieben
// werden nur Kopf und Fuss, der Block liegt unberührt dazwischen.
function ebaGeruest(){
 const ziel=$("einlaufblechAufnahme");
 if(!ziel||$("eba_kopf"))return;
 const box=$("ebaRinneBox");
 ziel.innerHTML='<div id="eba_kopf"></div><div id="eba_fuss"></div>';
 if(box)ziel.insertBefore(box,$("eba_fuss"));
}
let ebaRinneListeFuer;   // fuer welches Projekt die Liste zuletzt geladen wurde
function ebaRinneBoxZeigen(){
 const box=$("ebaRinneBox"); if(!box)return;
 const inRegister3=ebaSchritt===3;
 box.hidden=!inRegister3;
 if(!inRegister3)return;
 // Aufgeklappt zeigen: der Abschnitt ist ein Zweck dieses Registers,
 // zugeklappt würde man ihn übersehen.
 box.classList.add("open");
 // Die Liste hängt am gewählten Projekt. js/10 lädt sie bei der Projektwahl
 // und beim Öffnen einer Aufnahme; hier nur nachladen, wenn sie für dieses
 // Projekt noch nie geladen wurde - sonst liefe bei jedem Klick in Register 3
 // eine Abfrage.
 const pid=(typeof measSelectedProjectId!=="undefined")?measSelectedProjectId:null;
 if(pid!==ebaRinneListeFuer&&typeof refreshEbRinneList==="function"){
  ebaRinneListeFuer=pid;
  refreshEbRinneList();
 }
}

// Die Schnittzeichnung kommt unverändert aus js/11, der Grundriss aus js/13.
function ebaZeichnungen(){
 const a=ebA;
 const sch=$("eba_schnitt");
 if(sch)sch.innerHTML=einlaufblechDiagramSvg(a.winkel,a.massA,ebaRestbreite(),
   einlaufblechSettings.umschlag_oben,einlaufblechSettings.umschlag_unten);
 const gr=$("eba_grundriss");
 if(gr)gr.innerHTML=generateEbkGrundriss(a.stuecke||[]);
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet – sonst verliert
// das Feld nach dem ersten Zeichen den Fokus. Aktualisiert werden nur die
// abgeleiteten Anzeigen.
function ebaLive(){
 ebaBruecke();
 const rb=ebaRestbreite();
 const rest=$("eba_wRest");
 if(rest){rest.textContent=ebaMm(rb)+" mm"; rest.classList.toggle("ra-rest",rb<0)}
 const eng=$("eba_wEng"); if(eng)eng.textContent=ebaMm(ebaMassAEng())+" mm";
 const seite=$("eba_wSeite"); if(seite)seite.textContent=ebaEngeSeite();
 const formel=$("eba_formel"); if(formel)formel.innerHTML=ebaFormelText();
 const L=$("eba_wLaenge");
 if(L){const g=ebaGesamtlaenge(); L.textContent=g>0?ebaMm(g)+" mm":"–"}
 const gava=$("eba_wGava");
 if(gava){const n=ebaGavaAnzahl(); gava.textContent=n===null?"–":n+" Stk."}
 ebaZeichnungen();
}

// ---- Bedienung -------------------------------------------------------------
// Eine einzige Stelle für alle Ereignisse innerhalb von #measTypeEinlaufblech.
// Tippen (input) ändert nur das Modell und die abgeleiteten Anzeigen,
// Auswählen (change) und Klicken zeichnen neu.
function ebaNeuesStueck(){
 const stoss=ebaZahl(einlaufblechSettings.stoss_laenge)||2000;
 return {laenge:stoss+ebaZahl(einlaufblechSettings.ueberlappung),stossStoss:stoss,
         gehrungLinks:false,gehrungRechts:false,winkel:0};
}
// Aufteilung unverändert über teileLaengeInStuecke() aus js/13.
function ebaStueckeAusGesamtlaenge(L){
 const stoss=ebaZahl(einlaufblechSettings.stoss_laenge)||1;
 return teileLaengeInStuecke(L,einlaufblechSettings).map((len,i,alle)=>({
  laenge:len, stossStoss:i===alle.length-1?len:stoss,
  gehrungLinks:false, gehrungRechts:false, winkel:0
 }));
}
// Gehrung: dieselbe Regel wie in js/15 – Zugabe auf die Länge, Winkel 90,
// und die gleiche physische Ecke am Nachbarstück wird mitgesetzt.
function ebaGehrung(i,seite,an){
 const p=(ebA.stuecke||[])[i]; if(!p)return;
 const zugabe=ebaZahl(einlaufblechSettings.gehrungszugabe);
 const key=seite==="links"?"gehrungLinks":"gehrungRechts";
 const war=!!p[key];
 p[key]=!!an;
 if(an&&!war){
  p.laenge=ebaZahl(p.laenge)+zugabe; p.winkel=90;
  const nachbar=seite==="links"?ebA.stuecke[i-1]:ebA.stuecke[i+1];
  const nkey=seite==="links"?"gehrungRechts":"gehrungLinks";
  if(nachbar&&!nachbar[nkey]){
   nachbar[nkey]=true; nachbar.laenge=ebaZahl(nachbar.laenge)+zugabe; nachbar.winkel=90;
  }
 }else if(!an&&war){
  p.laenge=Math.max(0,ebaZahl(p.laenge)-zugabe);
 }
 if(!p.gehrungLinks&&!p.gehrungRechts)p.winkel=0;
}
// Endzugabe: unverändert die Regel aus js/15 – immer auf das Reststück,
// weil kein reguläres Stück länger sein darf als Stoss/Stoss + Überlappung.
function ebaEndzugabe(position){
 const liste=ebA.stuecke;
 if(!liste.length)return "Bitte zuerst Stücke erfassen.";
 const zugabe=ebaZahl(einlaufblechSettings.end_zugabe);
 if(!zugabe)return "In den Einstellungen ist keine Endzugabe (> 0 mm) hinterlegt.";
 const p=liste[liste.length-1];
 const key=position==="start"?"endzugabeStart":"endzugabeEnd";
 if(p[key]){p.laenge=Math.max(0,ebaZahl(p.laenge)-p[key]); p[key]=0;}
 else{p.laenge=ebaZahl(p.laenge)+zugabe; p[key]=zugabe;}
 return null;
}
// "Fertig" führt zum Rest des Formulars (Fotos, Notiz, Speichern) – es
// speichert NICHT selbst, damit es nur einen Speicherweg gibt.
function ebaAbschluss(){
 // Der Foto-/Skizzenbereich ist waehrend der Register ausgeblendet und
 // erscheint erst hier - deshalb zuerst aufklappen, dann hinscrollen.
 if(typeof measMedienAufklappen==="function")measMedienAufklappen();
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}

function ebaVerdrahten(){
 const wurzel=$("measTypeEinlaufblech");
 if(!wurzel||wurzel.dataset.ebaVerdrahtet)return;
 wurzel.dataset.ebaVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  if(ebaZeichnet)return;
  const t=e.target, d=t.dataset||{}, a=ebA;
  if(t.id==="eba_massA"){a.massA=t.value===""?"":ebaZahl(t.value)}
  else if(t.id==="eba_winkel"){a.winkel=t.value===""?"":ebaZahl(t.value)}
  else if(t.id==="eba_gesamt"){a.gesamtlaenge=t.value===""?"":ebaZahl(t.value);return}
  else if(t.id==="eba_gavaAbstand"){a.gava.abstand_mm=ebaZahl(t.value)}
  else if(t.id==="eba_gavaAnzahl"){a.gava.anzahl=t.value===""?null:ebaZahl(t.value)}
  else if(d.ebaLaenge!==undefined){
   const p=a.stuecke[Number(d.ebaLaenge)]; if(p)p.laenge=ebaZahl(t.value);
  }
  else if(d.ebaStoss!==undefined){
   const i=Number(d.ebaStoss), p=a.stuecke[i];
   if(!p)return;
   p.stossStoss=ebaZahl(t.value);
   p.laenge=p.stossStoss+ebaZahl(einlaufblechSettings.ueberlappung);
   // Das Längenfeld derselben Zeile mitziehen, ohne die Tabelle neu zu
   // zeichnen – sonst verliert das Feld den Fokus.
   const zeile=t.closest("tr");
   const feld=zeile&&zeile.querySelector('[data-eba-laenge="'+i+'"]');
   if(feld)feld.value=String(p.laenge);
  }
  else if(d.ebaWinkel!==undefined){
   const p=a.stuecke[Number(d.ebaWinkel)]; if(p)p.winkel=ebaZahl(t.value);
  }
  else return;
  ebaLive();
 });

 wurzel.addEventListener("change",e=>{
  if(ebaZeichnet)return;
  const t=e.target, d=t.dataset||{}, a=ebA;
  // Rollenauswahl fuer DIESE Massaufnahme (gemeinsamer Kasten, js/33)
  {const w=zuRollenKlick(e.target,"data-eba-rolle");
   if(w!==null){ebA.rollenAuswahl=w; renderEinlaufblechAufnahme(); return}}
  if(t.id==="eba_material"){a.material=t.value; renderEinlaufblechAufnahme(); return}
  if(t.id==="eba_abwicklung"){a.abwicklung=ebaZahl(t.value); renderEinlaufblechAufnahme(); return}
  if(t.id==="eba_montage"){a.montage=t.value; renderEinlaufblechAufnahme(); return}
  if(t.id==="eba_gavaAktiv"){
   a.gava.aktiv=!!t.checked;
   if(a.gava.aktiv&&!ebaZahl(a.gava.abstand_mm))a.gava.abstand_mm=ebaGavaVorgabe();
   renderEinlaufblechAufnahme(); return;
  }
  if(d.ebaGl!==undefined){ebaGehrung(Number(d.ebaGl),"links",t.checked); renderEinlaufblechAufnahme(); return}
  if(d.ebaGr!==undefined){ebaGehrung(Number(d.ebaGr),"rechts",t.checked); renderEinlaufblechAufnahme(); return}
 });

 wurzel.addEventListener("click",e=>{
  // Die Rinnen-Uebernahme von js/15 haengt am Listen-Element selbst und
  // laeuft durch das Blubbern ZUERST. Sie ersetzt ebPieces durch ein NEUES
  // Array - ohne die folgende Zeile wuerde ebaBruecke() es beim naechsten
  // Zeichnen wieder mit dem alten Stand ueberschreiben und die uebernommenen
  // Stuecke waeren lautlos weg (in v2.74/v2.75 nachgemessen: der
  // Speicher-Payload enthielt danach 0 Stuecke). Hat js/15 abgebrochen,
  // ist ebPieces unveraendert und die Bedingung greift nicht.
  if(e.target.closest("[data-pick-eb-rinne]")){
   if(Array.isArray(ebPieces)&&ebPieces!==ebA.stuecke)ebA.stuecke=ebPieces;
   renderEinlaufblechAufnahme(); return;
  }
  const t=e.target.closest("button,[data-eba-schritt]");
  if(!t)return;
  const d=t.dataset||{}, a=ebA;
  if(d.ebaSchritt!==undefined){ebaSetzeSchritt(d.ebaSchritt); return}
  if(t.id==="eba_zurueck"){if(ebaSchritt>1)ebaSetzeSchritt(ebaSchritt-1); return}
  if(t.id==="eba_weiter"){
   if(ebaSchritt>=EBA_REGISTER.length)ebaAbschluss();
   else ebaSetzeSchritt(ebaSchritt+1);
   return;
  }
  if(t.id==="eba_einstellungen"){
   settingsReturnToMeasurement=true;
   $("measurementEditModal").hidden=true;
   renderSettings();
   openSettingsTo("measurements","einlaufblech");
   return;
  }
  if(t.id==="eba_neuAusGesamt"){
   const L=ebaZahl(a.gesamtlaenge);
   if(L<=0){alert("Bitte zuerst eine gültige Gesamtlänge eingeben.");return}
   if((a.stuecke||[]).length&&!confirm("Vorhandene Stücke werden ersetzt. Fortfahren?"))return;
   a.stuecke=ebaStueckeAusGesamtlaenge(L);
   renderEinlaufblechAufnahme(); return;
  }
  if(t.id==="eba_anhaengen"){
   const L=ebaZahl(a.gesamtlaenge);
   if(L<=0){alert("Bitte eine gültige Gesamtlänge eingeben.");return}
   a.stuecke=(a.stuecke||[]).concat(ebaStueckeAusGesamtlaenge(L));
   renderEinlaufblechAufnahme(); return;
  }
  if(t.id==="eba_stueckPlus"){a.stuecke.push(ebaNeuesStueck()); renderEinlaufblechAufnahme(); return}
  if(t.id==="eba_endStart"||t.id==="eba_endEnde"){
   const fehler=ebaEndzugabe(t.id==="eba_endStart"?"start":"ende");
   if(fehler)alert(fehler); else renderEinlaufblechAufnahme();
   return;
  }
  if(t.id==="eba_gavaZurueck"){a.gava.anzahl=null; renderEinlaufblechAufnahme(); return}
  if(d.ebaWeg!==undefined){a.stuecke.splice(Number(d.ebaWeg),1); renderEinlaufblechAufnahme(); return}
  if(d.ebaFlip!==undefined){
   const p=a.stuecke[Number(d.ebaFlip)];
   if(p)p.winkel=-ebaZahl(p.winkel);
   renderEinlaufblechAufnahme(); return;
  }
 });
}

// ---- Laden und Zurücksetzen ------------------------------------------------
// Ein gespeicherter Datensatz wird gelesen, wie er ist. Fehlt ein neues Feld
// (alte Aufnahme), gilt der Standard – es wird nichts erfunden: eine alte
// Aufnahme hat keine Haltebleche erfasst, also stehen sie auf "nicht aktiv".
function ebaAusData(d){
 const a=ebaLeer();
 if(!d)return a;
 a.material=d.material??"";
 // Welche Rollen fuer diese Aufnahme gewaehlt waren. Fehlt das Feld
 // (Aufnahme vor v2.85), bleibt es leer = ganzes Lager.
 const rq=(d.rollen&&d.rollen.auswahl);
 a.rollenAuswahl=Array.isArray(rq)?rq.map(Number).filter(x=>x>0):[];
 a.abwicklung=ebaZahl(d.abwicklung)||250;
 a.montage=d.montage||"links";
 a.massA=d.massA===undefined||d.massA===null||d.massA===""?"":ebaZahl(d.massA);
 a.winkel=d.winkel===undefined||d.winkel===null||d.winkel===""?"":ebaZahl(d.winkel);
 a.gesamtlaenge=d.gesamtlaenge===undefined||d.gesamtlaenge===null||d.gesamtlaenge===""?"":ebaZahl(d.gesamtlaenge);
 a.stuecke=Array.isArray(d.pieces)?d.pieces.map(p=>({...p})):[];
 if(d.gava&&typeof d.gava==="object"){
  a.gava={aktiv:!!d.gava.aktiv,
   abstand_mm:ebaZahl(d.gava.abstand_mm)||ebaGavaVorgabe(),
   anzahl:(d.gava.anzahl===null||d.gava.anzahl===undefined||d.gava.anzahl==="")?null:ebaZahl(d.gava.anzahl)};
 }
 return a;
}
// Nach dem Setzen wird neu gezeichnet - sonst zeigt das Register noch den
// vorherigen Stand (showMeasTypeSection laeuft in openMeasurement VOR dem
// Fuellen).
function ebaZuruecksetzen(){ebA=ebaLeer(); ebaSchritt=1; ebaRinneListeFuer=undefined; ebPieces=ebA.stuecke; ebaVerdrahten(); renderEinlaufblechAufnahme()}
function ebaFuellen(d){ebA=ebaAusData(d); ebaSchritt=1; ebaRinneListeFuer=undefined; ebPieces=ebA.stuecke; ebaVerdrahten(); renderEinlaufblechAufnahme()}

// ---- Zusatzfelder für den Speicher-Payload ---------------------------------
// js/16 schreibt weiterhin genau dieselben acht Felder wie bisher und hängt
// nur diese hier an. Die Ergebnisse werden mitgespeichert, damit ein später
// gedrucktes Blatt gleich bleibt, auch wenn Einstellungen sich ändern -
// dasselbe Vorgehen wie bei Rinne, Kehle und Anschlussblech.
function ebaZusatzDaten(){
 const a=ebA;
 const plan=ebaRollenPlan();
 return {
  gava:{aktiv:!!(a.gava&&a.gava.aktiv),
        abstand_mm:ebaZahl(a.gava&&a.gava.abstand_mm),
        anzahl:(a.gava&&a.gava.anzahl!==null&&a.gava.anzahl!==undefined&&a.gava.anzahl!=="")?ebaZahl(a.gava.anzahl):null,
        gerechnet:ebaGavaAnzahl()},
  flaeche_m2:Number(ebaFlaecheM2().toFixed(3)),
  ausmass:ebaAusmassZeilen(),
  // Der Kontrollstand wird MITGESPEICHERT, damit ihn der Ausdruck zeigen
  // kann, ohne ihn neu zu rechnen - genauso wie Ausmass und Rollenplan.
  kontrolle:ebaPruefungen(),
  rollen:{auswahl:(ebA.rollenAuswahl||[]).slice(),
          // v3.33: ohne die Form kann der Ausdruck spaeter nicht sagen, ob
          // von der Rolle oder aus der Tafel geschnitten wurde.
          form:plan.form, formGrund:plan.formGrund||"", formQuelle:plan.formQuelle||"",
          formLaenge:plan.bestes?(plan.bestes.laenge||null):null,
          abschnittLaenge:plan.abschnittLaenge,
          abschnitte:plan.bestes?plan.bestes.abschnitte:0,
          jeAbschnitt:plan.bestes?plan.bestes.jeAbschnitt:1,
          rollenLaenge:plan.bestes?plan.bestes.rollenLaenge:0,
          breiten:ebaRollenAktiv(),
          bestes:plan.bestes||null,
          moeglich:plan.moeglich||[],
          streifen:(plan.streifen||[]).map(s=>({
            stuecke:s.stuecke.map(x=>({nr:x.nr,laenge:x.laenge,merkmal:x.merkmal||"",hinweis:x.hinweis||""})), rest:s.rest})),
          optimal:plan.optimal!==false,
          // v3.29: die Stuecke, die aus vorhandenen Resten geschnitten
          // werden. Ohne sie fehlen sie im gespeicherten Plan ganz.
          ausResten:ebaAusRestenSpeicher(plan.ausResten)}
 };
}
