"use strict";
// ===========================================================================
// PROTOTYP · Massaufnahme "Rinne Halbrund"
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, NICHT eine Parallel-Lösung.
// Die gesamte Fachrechnung kommt unverändert aus js/12-rinne-halbrund.js
// (siehe bruecke.js). Neu ist alles, was der Auftrag zusätzlich verlangt:
// Grunddaten, Verlauf mit Ecken sowie Einhänge- und Schiebestutzen (alle
// drei werden gleich eingefügt und ab dem Abschnitt davor vermasst), Halter,
// Rinnenboden, Dehnung, Fotos, Skizze, Plausibilität, Zusammenfassung,
// Ausmass, Material, PDF, Kopieren, lokales Speichern und ein Ablauf in
// sechs Schritten.
// ===========================================================================

// ---- 1. Grunddaten -------------------------------------------------------
// Genau fünf Rinnengrössen, nichts Freies (Auftrag Änderung 1 und 2).
const RG_GROESSEN=[
 {wert:"200", text:"200 mm"},
 {wert:"250", text:"250 mm"},
 {wert:"330", text:"330 mm"},
 {wert:"400", text:"400 mm"}
];
// Ablaufrohr-Durchmesser
const STUTZEN_DURCHMESSER=["Ø 60","Ø 75","Ø 100","Ø 120"];
// Was an einem Übergang zwischen zwei Abschnitten sitzen kann. Der Stutzen
// wird genau wie der Winkel eingefügt – deshalb eine einzige Auswahl.
const UEBERGAENGE=[
 {wert:"gerade",   text:"gerade weiter (nichts)"},
 {wert:"aussen",   text:"Aussenwinkel"},
 {wert:"innen",    text:"Innenwinkel"},
 {wert:"einhaenge",text:"Einhängestutzen"},
 {wert:"schiebe",  text:"Schiebestutzen"}
];
const FALLROHR_STATUS=["bestehend","neu","unbekannt"];

// Fitting-IDs aus dem bestehenden Katalog (rinne_fitting_types).
// Die Ecke ist dort bereits als Fixpunkt hinterlegt, dadurch wirkt sie
// automatisch auf die Dila-Abstände.
const ECKE_AUSSEN_ID=2, ECKE_INNEN_ID=3;
// Der Einhängestutzen ist ein Fixpunkt. Im bestehenden Katalog trägt der
// "Ablaufstutzen" (id 4) genau diese Eigenschaft (is_fixpunkt = true,
// mass_mm = 0). Der Prototyp verwendet ihn deshalb unverändert weiter,
// statt eine zweite Fixpunktlogik zu bauen.
const EINHAENGE_FITTING_ID=4;
// Der Schiebestutzen (id 7) ist KEIN Fixpunkt, wird aber wie ein
// Dehnungselement behandelt: er nimmt die Ausdehnung an dieser Stelle selbst
// auf. Im bestehenden Katalog trägt er dafür bereits is_schiebestutzen =
// true. computeRinneBoundaries() macht daraus einen Grenzpunkt vom Typ
// "schiebe": die Strecke wird dort geteilt, links und rechts gilt der
// grosszügige Abstand "mit Dehnungselement" (nicht der strenge "ab
// Fixpunkt"), und es wird an dieser Stelle KEINE zusätzliche Dila gesetzt.
// Genau das ist der Unterschied zum Einhängestutzen.
const SCHIEBE_FITTING_ID=7;
// Der Rinnenboden sitzt am äussersten Ende des Verlaufs – und das IST der
// erste bzw. letzte Grenzpunkt. Der bestehende Katalog führt dafür den
// "Boden" (id 5, kein Fixpunkt). Wird er dort als Anschlusstyp gesetzt,
// rechnet berechneRinneStueckliste() sein Mass ohne eine Zeile neuer
// Fachlogik in den Zuschnitt des ersten/letzten Stücks ein.
const BODEN_FITTING_ID=5;

// ---- 1b. Zuschnittmasse (Einstellungen) -----------------------------------
// Jedes Element kann ein Mass tragen, das dem Rinnenzuschnitt zugerechnet
// (+) oder abgezogen (−) wird. Für Winkel, Stutzen, Schiebestutzen und
// Rinnenboden ist das im bestehenden Modul bereits das Feld mass_mm des
// Anschlusstyp-Katalogs; für das Dilatationselement die Firmeneinstellung
// rinneDilaMass. Der Prototyp bearbeitet genau diese beiden Quellen – er
// führt bewusst keine dritte ein, damit der Einbau in die App nichts
// umrechnen muss.
const MASSE_SPEICHER="sd_prototyp_rinne_massen";
// Vorgaben wie in der laufenden App: der Katalog, wie er ausgeliefert wird,
// und -165 mm an der Dila (Vorgabewert aus js/01-basis.js).
const DILA_MASS_VORGABE=-165;
const MASS_VORGABE={};
rinneFittingTypes.forEach(f=>{MASS_VORGABE[f.symbol||("id"+f.id)]=Number(f.mass_mm)||0});
function masseLesen(){
 try{
  const m=JSON.parse(localStorage.getItem(MASSE_SPEICHER)||"null");
  if(!m||typeof m!=="object")return null;
  return m;
 }catch(e){return null}
}
function masseAnwenden(){
 const m=masseLesen()||{};
 const f=(m.fitting&&typeof m.fitting==="object")?m.fitting:{};
 rinneFittingTypes.forEach(t=>{
  const k=t.symbol||("id"+t.id);
  const v=(f[k]===undefined||f[k]===null||f[k]==="")?MASS_VORGABE[k]:Number(f[k]);
  t.mass_mm=Number.isFinite(v)?v:0;
 });
 const d=(m.dila===undefined||m.dila===null||m.dila==="")?DILA_MASS_VORGABE:Number(m.dila);
 rinneDilaMass=Number.isFinite(d)?d:0;
}
function masseSchreiben(fitting,dila){
 try{localStorage.setItem(MASSE_SPEICHER,JSON.stringify({fitting,dila}));}catch(e){}
 masseAnwenden();
}
function masseZuruecksetzen(){
 try{localStorage.removeItem(MASSE_SPEICHER);}catch(e){}
 masseAnwenden();
}
masseAnwenden();

function leereAufnahme(){
 return {
  id:"ra_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
  typ:"rinne_halbrund",
  erstellt:new Date().toISOString(),
  geaendert:new Date().toISOString(),
  bezeichnung:"",
  material:3,                 // Kupfer
  groesse:"330",
  gesamtlaengeManuell_mm:null,
  // Verlauf: die Struktur des bestehenden Moduls, ergänzt um "stutzen".
  // Winkel UND Stutzen sitzen am Ende ihres Abschnitts – der Stutzen wird
  // also genau wie eine Ecke in den Verlauf eingefügt und ist damit
  // automatisch ab dem letzten Rinnenabschnitt vermasst, nicht ab START.
  segmente:[{laenge:0,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}],
  halter:{anzahl:null,abstand_mm:500,typ:""},
  rinnenboden:{links:true,rechts:true},
  dehnung:{art:"keine",anzahl:0},
  // null = die Dilatationselemente werden gerechnet. Sobald jemand sie von
  // Hand anpasst, steht hier die eigene Liste und wird nicht mehr überschrieben.
  dilasManuell:null,
  fotos:[],
  skizze:null,
  bemerkung:""
 };
}

// Ältere im Browser gespeicherte Aufnahmen behutsam übernehmen. Es gab
// nacheinander: "ablaeufe", freie Rinnengrössen, "Verbinder", "ohne RG",
// Sonderteile, "endstuecke" und Stutzen als eigene Listen mit einer
// Position ab START. Nichts wird verworfen, was noch eine Entsprechung hat –
// die alten Stutzen werden an die passende Stelle im Verlauf gehängt und
// notfalls wird der Abschnitt dafür geteilt.
const RG_ALT={"RG 200":"200","RG 250":"250","RG 280":"250","RG 333":"330",
              "RG 400":"400","RG 500":"400","andere":"330","ohne":"330"};
const D_ALT={"Ø 80":"Ø 75","Ø 125":"Ø 120","Ø 150":"Ø 120"};
function stutzenInVerlauf(a,liste,art){
 (liste||[]).forEach(st=>{
  const ziel=Math.round(zahl(st.pos_mm));
  const neu={art,durchmesser:D_ALT[st.durchmesser]||st.durchmesser||STUTZEN_DURCHMESSER[2],
             anzahl:Math.max(1,Math.round(zahl(st.anzahl)||1)),
             fallrohr:st.fallrohr||FALLROHR_STATUS[0],bemerkung:st.bemerkung||""};
  let pos=0;
  for(let i=0;i<a.segmente.length;i++){
   const ende=pos+zahl(a.segmente[i].laenge);
   if(ziel>pos&&ziel<ende){          // mitten im Abschnitt: dafür teilen
    const rest=ende-ziel;
    a.segmente[i].laenge=ziel-pos;
    const alterStutzen=a.segmente[i].stutzen, alterWinkel=zahl(a.segmente[i].winkel);
    a.segmente[i].stutzen=neu; a.segmente[i].winkel=0;
    a.segmente.splice(i+1,0,{laenge:rest,linksTyp:"",rechtsTyp:"",
                             winkel:alterWinkel,stutzen:alterStutzen});
    return;
   }
   if(ziel===ende&&i<a.segmente.length-1&&!a.segmente[i].stutzen){
    a.segmente[i].stutzen=neu; return;
   }
   pos=ende;
  }
  // Ganz am Anfang oder am Ende: dort gibt es keinen Übergang. Der Stutzen
  // wird an den nächstgelegenen Übergang gehängt, statt ihn zu verlieren.
  const idx=ziel<=0?0:a.segmente.length-2;
  if(idx>=0&&a.segmente[idx]&&!a.segmente[idx].stutzen)a.segmente[idx].stutzen=neu;
 });
}
function aufnahmeUmstellen(a){
 if(!a||typeof a!=="object")return a;
 if(!Array.isArray(a.segmente)||!a.segmente.length)
  a.segmente=[{laenge:0,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}];
 a.segmente.forEach(seg=>{if(seg.stutzen===undefined)seg.stutzen=null});
 // "ablaeufe" (ganz alt) -> Einhängestutzen
 if(Array.isArray(a.ablaeufe)&&a.ablaeufe.length
    &&(!Array.isArray(a.einhaengestutzen)||!a.einhaengestutzen.length))
  a.einhaengestutzen=a.ablaeufe.map(x=>({pos_mm:x.pos_mm,durchmesser:x.durchmesser,
   anzahl:1,fallrohr:x.fallrohr,bemerkung:x.bemerkung||""}));
 stutzenInVerlauf(a,a.einhaengestutzen,"einhaenge");
 stutzenInVerlauf(a,a.schiebestutzen,"schiebe");
 // Nicht auf "rinnenboden fehlt" pruefen: aufnahmeLaden() legt es ueber
 // leereAufnahme() schon an, die Uebernahme liefe sonst ins Leere.
 if(a.endstuecke)a.rinnenboden={links:!!a.endstuecke.links,rechts:!!a.endstuecke.rechts};
 if(!a.rinnenboden)a.rinnenboden={links:true,rechts:true};
 if(a.dilasManuell!==null&&!Array.isArray(a.dilasManuell))a.dilasManuell=null;
 if(Array.isArray(a.dilasManuell))
  a.dilasManuell=a.dilasManuell.map(d=>({posAbStart:zahl(d&&d.posAbStart)}));
 ["ablaeufe","einhaengestutzen","schiebestutzen","verbinder","groesseFrei",
  "sonderteile","endstuecke"].forEach(f=>{delete a[f]});
 if(RG_ALT[a.groesse])a.groesse=RG_ALT[a.groesse];
 if(!RG_GROESSEN.some(g=>g.wert===a.groesse))a.groesse="330";
 return a;
}

let aufnahme=leereAufnahme();
let schritt=1;
const SCHRITTE=["Grunddaten","Verlauf","Komponenten","Fotos & Skizze","Kontrolle","Ausmass & Material"];

// ---- 2. Lokal speichern --------------------------------------------------
const SPEICHER="sd_prototyp_rinne_halbrund";
function alleAufnahmen(){
 try{const a=JSON.parse(localStorage.getItem(SPEICHER)||"[]");return Array.isArray(a)?a:[]}
 catch(e){return []}
}
function speichereAlle(liste){
 try{localStorage.setItem(SPEICHER,JSON.stringify(liste));return true}
 catch(e){alert("Speichern nicht möglich: "+e.message);return false}
}
function aufnahmeSpeichern(){
 aufnahme.geaendert=new Date().toISOString();
 const liste=alleAufnahmen();
 const i=liste.findIndex(a=>a.id===aufnahme.id);
 if(i>=0)liste[i]=JSON.parse(JSON.stringify(aufnahme));
 else liste.unshift(JSON.parse(JSON.stringify(aufnahme)));
 return speichereAlle(liste);
}
function aufnahmeLaden(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return false;
 aufnahme=aufnahmeUmstellen(Object.assign(leereAufnahme(),JSON.parse(JSON.stringify(a))));
 return true;
}
// Kopieren: neue, unabhängige Aufnahme mit eigener ID (Auftrag 23).
function aufnahmeKopieren(id){
 const a=alleAufnahmen().find(x=>x.id===id);
 if(!a)return null;
 const k=aufnahmeUmstellen(Object.assign(leereAufnahme(),JSON.parse(JSON.stringify(a))));
 k.id="ra_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 k.erstellt=k.geaendert=new Date().toISOString();
 k.bezeichnung=(k.bezeichnung||"Rinne")+" (Kopie)";
 const liste=alleAufnahmen();
 liste.unshift(k);
 speichereAlle(liste);
 return k;
}

// ---- 3. Ableitungen ------------------------------------------------------
const zahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
function mm(v){return Math.round(zahl(v)).toLocaleString("de-CH")}
function meter(v){return (Math.round(zahl(v))/1000).toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})}
function groesseText(a){
 const g=RG_GROESSEN.find(x=>x.wert===a.groesse);
 return g?g.text:"ohne RG";
}
// Zusatz für Bauteilbezeichnungen: bei "ohne RG" bleibt er leer, damit im
// Ausmass nicht "Rinnenhalter ohne RG" steht.
function groesseZusatz(a){
 return a.groesse==="ohne"?"":" "+groesseText(a);
}
function materialText(a){
 const m=findMeasurementMaterial(a.material);
 return m?m.name:"–";
}

// Gesamtlänge aus den Abschnitten – die einzige Quelle für alle Folgewerte.
function gesamtlaengeBerechnet(a){
 return (a.segmente||[]).reduce((s,seg)=>s+zahl(seg.laenge),0);
}

// Ecken entstehen aus dem Verlauf (Auftrag 12): der Winkel steht wie im
// bestehenden Modul am Abschnitt und meint die Richtungsänderung danach.
// Vorzeichen wie im Katalog: negativ = Aussenwinkel, positiv = Innenwinkel.
function eckenAusVerlauf(a){
 return verlaufElemente(a).filter(e=>e.art==="ecke")
  .map(e=>({nachAbschnitt:e.index,pos_mm:e.pos,winkel:e.winkel,art:e.ecke}));
}

// Was sitzt an einem Übergang? Winkel und Stutzen schliessen sich in der
// Bedienung aus – eine einzige Auswahl je Übergang, genau wie beim Winkel.
function uebergangArt(seg){
 if(!seg)return "gerade";
 if(seg.stutzen&&seg.stutzen.art)return seg.stutzen.art;
 const w=zahl(seg.winkel);
 return w===0?"gerade":(w<0?"aussen":"innen");
}

// Der Verlauf als Liste, von START bis ENDE. "abVorher" ist die Länge des
// Abschnitts unmittelbar davor – so ist jedes Element ab dem letzten
// Rinnenabschnitt vermasst und nicht ab START. "pos" wird nur intern für
// die Zeichnung und die Fachrechnung gebraucht.
function verlaufElemente(a){
 const segs=a.segmente||[];
 const liste=[];
 let pos=0;
 segs.forEach((seg,i)=>{
  const laenge=zahl(seg.laenge);
  liste.push({art:"abschnitt",nr:i+1,index:i,laenge,von:pos,pos:pos+laenge});
  pos+=laenge;
  if(i>=segs.length-1)return;                 // am Ende gibt es keinen Übergang
  const art=uebergangArt(seg);
  if(art==="gerade")return;
  if(art==="aussen"||art==="innen"){
   liste.push({art:"ecke",index:i,pos,abVorher:laenge,
               winkel:Math.abs(zahl(seg.winkel))||90,ecke:art});
  }else{
   const st=seg.stutzen||{};
   liste.push({art,index:i,pos,abVorher:laenge,
               durchmesser:st.durchmesser||STUTZEN_DURCHMESSER[2],
               anzahl:Math.round(zahl(st.anzahl)),   // roh, siehe pruefungen()
               fallrohr:st.fallrohr||"",bemerkung:st.bemerkung||""});
  }
 });
 return liste;
}
function stutzenListe(a,art){
 return verlaufElemente(a).filter(e=>e.art==="einhaenge"||e.art==="schiebe")
  .filter(e=>!art||e.art===art);
}

// Vorschlag für die Halteranzahl (Auftrag 9). Der Benutzer darf ihn
// jederzeit überschreiben – deshalb nur ein Vorschlag, keine Festlegung.
function halterVorschlag(a){
 const L=gesamtlaengeBerechnet(a);
 const d=zahl(a.halter.abstand_mm);
 if(L<=0||d<=0)return null;
 return Math.ceil(L/d)+1;
}
function halterAnzahl(a){
 return a.halter.anzahl!==null&&a.halter.anzahl!==undefined&&a.halter.anzahl!==""
  ?Math.max(0,Math.round(zahl(a.halter.anzahl)))
  :(halterVorschlag(a)||0);
}

// ---- Übergänge in die Struktur des bestehenden Moduls spiegeln ----------
// Das bestehende Modul kennt Fixpunkte und Schiebestutzen ausschliesslich als
// Anschlusstyp an einer Segmentgrenze – computeRinneBoundaries() liest
// linksTyp/rechtsTyp. Genau dort sitzen im Prototyp jetzt auch die Stutzen,
// weil sie wie ein Winkel in den Verlauf eingefügt werden. Es braucht deshalb
// keine Aufteilung von Abschnitten mehr: der Übergang IST die Segmentgrenze.
//
//   Aussen-/Innenwinkel -> Anschlusstyp 2 / 3  (Fixpunkt)
//   Einhängestutzen     -> Anschlusstyp 4      (Fixpunkt, strenger Abstand)
//   Schiebestutzen      -> Anschlusstyp 7      (kein Fixpunkt, gilt als
//                                               Dehnungselement)
//
// Damit greift die vorhandene Fachlogik unverändert – es gibt keine zweite
// Fixpunkt- oder Dila-Regel im Prototyp.
const UEBERGANG_FITTING={aussen:ECKE_AUSSEN_ID,innen:ECKE_INNEN_ID,
                         einhaenge:EINHAENGE_FITTING_ID,schiebe:SCHIEBE_FITTING_ID};
function synchronisiereUebergaenge(a){
 const segs=a.segmente||[];
 segs.forEach((seg,i)=>{
  if(seg.stutzen===undefined)seg.stutzen=null;
  if(i>=segs.length-1)return;
  const art=uebergangArt(seg);
  const id=UEBERGANG_FITTING[art]||null;
  const naechste=segs[i+1];
  if(id===null){                 // gerade weiter: alte Anschlusstypen weg
   if(bekannterUebergangsTyp(seg.rechtsTyp))seg.rechtsTyp="";
   if(bekannterUebergangsTyp(naechste.linksTyp))naechste.linksTyp="";
  }else{
   seg.rechtsTyp=id; naechste.linksTyp=id;
  }
 });
 // Am allerersten und allerletzten Ende darf kein Übergang stehen bleiben.
 // Dort sitzt stattdessen der Rinnenboden, sofern einer erfasst ist – als
 // Anschlusstyp, damit sein Zuschnittmass mitgerechnet wird.
 if(segs.length){
  const letzte=segs[segs.length-1];
  const b=a.rinnenboden||{};
  letzte.winkel=0; letzte.stutzen=null;
  if(bekannterUebergangsTyp(letzte.rechtsTyp)||Number(letzte.rechtsTyp)===BODEN_FITTING_ID)letzte.rechtsTyp="";
  if(bekannterUebergangsTyp(segs[0].linksTyp)||Number(segs[0].linksTyp)===BODEN_FITTING_ID)segs[0].linksTyp="";
  if(b.links)segs[0].linksTyp=BODEN_FITTING_ID;
  if(b.rechts)letzte.rechtsTyp=BODEN_FITTING_ID;
 }
 return a;
}
function bekannterUebergangsTyp(typId){
 const n=Number(typId);
 return Object.keys(UEBERGANG_FITTING).some(k=>UEBERGANG_FITTING[k]===n);
}

// Die Segmentliste für die Fachrechnung. Seit die Stutzen im Verlauf sitzen,
// ist das eine reine Kopie mit gespiegelten Anschlusstypen – nichts wird
// mehr geteilt oder umgerechnet.
function segmenteFuerRechnung(a){
 const kopie={rinnenboden:a.rinnenboden||{},
              segmente:(a.segmente||[]).map(x=>({laenge:zahl(x.laenge),
   linksTyp:x.linksTyp||"",rechtsTyp:x.rechtsTyp||"",winkel:zahl(x.winkel),
   stutzen:x.stutzen||null}))};
 synchronisiereUebergaenge(kopie);
 return kopie.segmente.map(x=>({laenge:x.laenge,linksTyp:x.linksTyp,
   rechtsTyp:x.rechtsTyp,winkel:x.winkel}));
}

// Dilas: unverändert die Rechnung des bestehenden Moduls.
function dilasBerechnet(a){
 const segs=segmenteFuerRechnung(a);
 if(!segs.length)return {dilas:[],tabelle:rinneMaterialTabelle(a.material),boundaries:[],segmente:segs};
 const r=calcRinneDilas(segs,a.material);
 r.segmente=segs;
 return r;
}

// Die tatsächlich gültigen Dilatationselemente: die gerechneten, solange
// niemand eingegriffen hat – sonst die von Hand angepasste Liste. Alles, was
// Dilas anzeigt (Band, Grundriss, Zuschnitt, PDF), geht durch diese eine
// Stelle, damit Bildschirm und Ausdruck nie auseinanderlaufen können.
function dilasEffektiv(a){
 const r=dilasBerechnet(a);
 r.automatisch=!Array.isArray(a.dilasManuell);
 if(!r.automatisch)
  r.dilas=a.dilasManuell.map(d=>({posAbStart:zahl(d.posAbStart)}))
                        .sort((x,y)=>x.posAbStart-y.posAbStart);
 return r;
}
// Beim ersten Eingriff wird die gerechnete Liste übernommen – ab dann bleibt
// sie stehen, auch wenn sich Länge oder Material ändern.
function dilasVonHand(a){
 if(!Array.isArray(a.dilasManuell))
  a.dilasManuell=dilasBerechnet(a).dilas.map(d=>({posAbStart:Math.round(zahl(d.posAbStart))}));
 return a.dilasManuell;
}

// ---- 4. Plausibilität (Auftrag 18) --------------------------------------
function pruefungen(a){
 const meldungen=[];
 const L=gesamtlaengeBerechnet(a);
 const segs=a.segmente||[];
 if(!segs.length||L<=0)meldungen.push({art:"fehler",text:"Es ist noch kein Rinnenabschnitt mit einer Länge erfasst."});
 segs.forEach((s,i)=>{
  if(zahl(s.laenge)<0)meldungen.push({art:"fehler",text:`Abschnitt ${i+1} hat eine negative Länge.`});
  const w=zahl(s.winkel);
  if(w<-180||w>180)meldungen.push({art:"fehler",text:`Der Winkel nach Abschnitt ${i+1} liegt ausserhalb von −180° bis 180°.`});
 });
 if(L>0&&L<300)meldungen.push({art:"warnung",text:`Die Gesamtlänge von ${mm(L)} mm ist auffällig kurz – bitte prüfen.`});
 if(L>200000)meldungen.push({art:"warnung",text:`Die Gesamtlänge von ${meter(L)} m ist auffällig lang – bitte prüfen.`});
 // Manuelle Gesamtlänge gegen die Summe der Abschnitte
 const man=a.gesamtlaengeManuell_mm;
 if(man!==null&&man!==undefined&&man!==""&&zahl(man)>0&&L>0){
  const diff=Math.round(zahl(man)-L);
  if(diff!==0){
   meldungen.push({art:"warnung",
    text:`Die Abschnitte ergeben ${mm(L)} mm, die angegebene Gesamtlänge beträgt ${mm(man)} mm. `
        +`Differenz ${diff>0?"+":""}${mm(diff)} mm.`});
  }
 }
 // Eine Stutzenposition kann nicht mehr ausserhalb der Rinne liegen und
 // auch nicht negativ sein: der Stutzen sitzt an einem Übergang zwischen
 // zwei Abschnitten. Der Fall ist strukturell ausgeschlossen, nicht nur
 // geprüft. Zu prüfen bleibt die Anzahl.
 verlaufElemente(a).filter(e=>e.art==="einhaenge"||e.art==="schiebe").forEach((e,i)=>{
  const name=e.art==="einhaenge"?"Einhängestutzen":"Schiebestutzen";
  if(zahl(e.anzahl)<1)meldungen.push({art:"fehler",
   text:`${name} ${i+1} hat keine gültige Anzahl.`});
 });
 if(zahl(a.halter.abstand_mm)<0)meldungen.push({art:"fehler",text:"Der Halterabstand darf nicht negativ sein."});
 if(a.halter.anzahl!==null&&a.halter.anzahl!==""&&zahl(a.halter.anzahl)<0)
  meldungen.push({art:"fehler",text:"Die Halteranzahl darf nicht negativ sein."});
 if(a.dehnung.art==="dehnungsstueck"&&zahl(a.dehnung.anzahl)<0)
  meldungen.push({art:"fehler",text:"Die Anzahl Dehnungsstücke darf nicht negativ sein."});
 // Von Hand gesetzte Dehnungselemente: sie werden NICHT stillschweigend
 // zurechtgerückt, sondern gemeldet – wer eingreift, soll sehen, was er tut.
 if(Array.isArray(a.dilasManuell)){
  a.dilasManuell.forEach((dl,i)=>{
   const pos=zahl(dl.posAbStart);
   if(pos<0||(L>0&&pos>L))meldungen.push({art:"fehler",
    text:`Dehnungselement ${i+1} liegt bei ${mm(pos)} mm und damit ausserhalb der Rinne (0 bis ${mm(L)} mm).`});
  });
  const auto=dilasBerechnet(a).dilas.length, hand=a.dilasManuell.length;
  if(hand<auto)meldungen.push({art:"warnung",
   text:`Von Hand sind ${hand} Dehnungselement(e) gesetzt, gerechnet wären ${auto}. `
       +`Bei ${materialText(a)} kann sich die Rinne dann an einer Stelle nicht genug ausdehnen.`});
  else if(hand>auto)meldungen.push({art:"warnung",
   text:`Von Hand sind ${hand} Dehnungselement(e) gesetzt, gerechnet wären ${auto}.`});
 }
 return meldungen;
}
function hatFehler(a){return pruefungen(a).some(m=>m.art==="fehler")}

// ---- 5. Komponenten, Ausmass, Material (Auftrag 19–21) -------------------
// EINE Ableitung – Zusammenfassung, Ausmass und Materialübersicht lesen
// alle aus derselben Liste. Nichts wird doppelt gerechnet oder von Hand
// nachgetragen.
function komponenten(a){
 // gz ist der Grössenzusatz, z. B. " 330 mm".
 const gz=groesseZusatz(a);
 const L=gesamtlaengeBerechnet(a);
 const ecken=eckenAusVerlauf(a);
 const innen=ecken.filter(e=>e.art==="innen").length;
 const aussen=ecken.filter(e=>e.art==="aussen").length;
 const liste=[];
 if(L>0)liste.push({schluessel:"rinne",bezeichnung:`Rinne halbrund${gz} ${materialText(a)}`,
                    menge:Math.round(L)/1000,einheit:"m",herkunft:"Verlauf"});
 const nHalter=halterAnzahl(a);
 if(nHalter>0)liste.push({schluessel:"halter",bezeichnung:`Rinnenhalter${gz}`+(a.halter.typ?` (${a.halter.typ})`:""),
                          menge:nHalter,einheit:"Stk.",herkunft:a.halter.anzahl?"Eingabe":"Vorschlag aus Länge/Abstand"});
 if(innen)liste.push({schluessel:"innenwinkel",bezeichnung:`Innenwinkel${gz}`,menge:innen,einheit:"Stk.",herkunft:"Verlauf"});
 if(aussen)liste.push({schluessel:"aussenwinkel",bezeichnung:`Aussenwinkel${gz}`,menge:aussen,einheit:"Stk.",herkunft:"Verlauf"});
 // Stutzen nach Durchmesser gruppieren. Beide Arten erscheinen im Ausmass –
 // dass nur der Einhängestutzen ein Fixpunkt ist, betrifft ausschliesslich
 // die Dilatationsberechnung, nicht die Stückzahl.
 const gruppiere=(art,bez,quelle,schl)=>{
  const nachD={};
  stutzenListe(a,art).forEach(e=>{
   const d=e.durchmesser||"Ø ?";
   nachD[d]=(nachD[d]||0)+Math.round(zahl(e.anzahl));
  });
  Object.keys(nachD).sort().filter(d=>nachD[d]>0).forEach(d=>{
   liste.push({schluessel:schl+"_"+d,bezeichnung:`${bez}${gz} ${d}`,
               menge:nachD[d],einheit:"Stk.",herkunft:quelle});
  });
 };
 gruppiere("einhaenge","Einhängestutzen","Einhängestutzen (Fixpunkt)","einhaenge");
 gruppiere("schiebe","Schiebestutzen","Schiebestutzen (Dehnungselement)","schiebe");
 // Rinnenboden links und rechts bleiben getrennte Positionen – sie sind
 // spiegelbildlich und werden getrennt bestellt.
 if(a.rinnenboden.links)liste.push({schluessel:"rinnenboden_l",bezeichnung:`Rinnenboden links${gz}`,
                                    menge:1,einheit:"Stk.",herkunft:"Eingabe"});
 if(a.rinnenboden.rechts)liste.push({schluessel:"rinnenboden_r",bezeichnung:`Rinnenboden rechts${gz}`,
                                     menge:1,einheit:"Stk.",herkunft:"Eingabe"});
 if(a.dehnung.art==="dehnungsstueck"){
  const nD=Math.round(zahl(a.dehnung.anzahl));
  if(nD>0)liste.push({schluessel:"dehnung",bezeichnung:`Dehnungsstück${gz}`,menge:nD,einheit:"Stk.",herkunft:"Eingabe"});
 }
 return liste;
}
function ausmassZeilen(a){
 // Das Ausmass IST die Komponentenliste – die Positionen werden nirgends
 // ein zweites Mal eingegeben (Auftrag 20).
 return komponenten(a).map((k,i)=>({
  pos:i+1,
  bezeichnung:k.bezeichnung,
  menge:k.einheit==="m"?k.menge.toFixed(2):String(k.menge),
  einheit:k.einheit,
  herkunft:k.herkunft
 }));
}
function materialUebersicht(a){
 // Bewusst OHNE Artikelnummern und Preise (Auftrag 21): die kommen später
 // aus der firmenindividuellen Materialliste.
 const mat=materialText(a);
 return komponenten(a).map(k=>({
  bezeichnung:k.bezeichnung,menge:k.einheit==="m"?k.menge.toFixed(2):String(k.menge),
  einheit:k.einheit,material:mat
 }));
}

// ---- 6. Verlaufsband ------------------------------------------------------
// Neue, ergänzende Ansicht: der ganze Verlauf von START bis ENDE als gerades
// Band. Darauf sitzen Ecken, Abläufe und Dilas an ihrer echten Position.
// Genau dafür gedacht, auf dem Tablet in einem Blick zu prüfen, ob ein
// Ablauf an der richtigen Stelle liegt. Der massstäbliche Grundriss kommt
// weiterhin unverändert aus dem bestehenden Modul.
function verlaufsBandSvg(a){
 const L=gesamtlaengeBerechnet(a);
 if(L<=0)return '<div class="p-leer">Noch kein Abschnitt erfasst.</div>';
 const W=470,H=132,l=34,r=W-34,y=66;
 const x=p=>l+(r-l)*Math.max(0,Math.min(1,zahl(p)/L));
 let s='';
 s+=`<line x1="${l}" y1="${y}" x2="${r}" y2="${y}" stroke="#17202a" stroke-width="7" stroke-linecap="round"/>`;
 s+=`<text x="${l}" y="${y+30}" font-size="11.5" text-anchor="middle" fill="#68737d" font-weight="700">START</text>`;
 s+=`<text x="${r}" y="${y+30}" font-size="11.5" text-anchor="middle" fill="#68737d" font-weight="700">ENDE</text>`;
 s+=`<text x="${r}" y="${(y-46).toFixed(1)}" font-size="13" text-anchor="end" fill="#1769aa" font-weight="700">Gesamt ${esc(mm(L))} mm</text>`;

 const elemente=verlaufElemente(a);
 // Abschnitte: die Länge steht über dem eigenen Abschnitt – sie IST das
 // Mass bis zum nächsten Element.
 elemente.filter(e=>e.art==="abschnitt").forEach((e,i,alle)=>{
  const xm=(x(e.von)+x(e.pos))/2;
  s+=`<text x="${xm.toFixed(1)}" y="${y-16}" font-size="12" text-anchor="middle" fill="#17202a" font-weight="700">${esc(mm(e.laenge))}</text>`;
  if(i<alle.length-1)
   s+=`<line x1="${x(e.pos).toFixed(1)}" y1="${y-9}" x2="${x(e.pos).toFixed(1)}" y2="${y+9}" stroke="#9bb0c1" stroke-width="2"/>`;
 });
 // Ecken
 elemente.filter(e=>e.art==="ecke").forEach(e=>{
  const px=x(e.pos);
  s+=`<polygon points="${px.toFixed(1)},${y-20} ${(px+9).toFixed(1)},${y-8} ${(px-9).toFixed(1)},${y-8}" fill="#0f766e"/>`;
  s+=`<text x="${px.toFixed(1)}" y="${y-27}" font-size="11" text-anchor="middle" fill="#0f766e" font-weight="700">${e.ecke==="innen"?"IE":"AE"} ${e.winkel}°</text>`;
 });
 // Einhängestutzen: Fixpunkt. Runde Marke MIT senkrechtem Strich durch die
 // Rinne – so ist zu sehen, dass er die Dilatationsberechnung teilt.
 let nE=0;
 elemente.filter(e=>e.art==="einhaenge").forEach(e=>{
  nE++; const px=x(e.pos), farbe="#1769aa";
  s+=`<line x1="${px.toFixed(1)}" y1="${(y-13).toFixed(1)}" x2="${px.toFixed(1)}" y2="${(y+13).toFixed(1)}" stroke="${farbe}" stroke-width="3"/>`;
  s+=`<circle cx="${px.toFixed(1)}" cy="${(y+22).toFixed(1)}" r="8.5" fill="${farbe}"/>`;
  s+=`<text x="${px.toFixed(1)}" y="${(y+25.6).toFixed(1)}" font-size="10" text-anchor="middle" fill="#fff" font-weight="700">E${nE}</text>`;
  s+=`<text x="${px.toFixed(1)}" y="${(y+40).toFixed(1)}" font-size="10" text-anchor="middle" fill="${farbe}" font-weight="700">FIX</text>`;
 });
 // Schiebestutzen: kein Fixpunkt, nimmt die Ausdehnung selbst auf. Eckige
 // Marke in anderer Farbe, kein Strich durch die Rinne, Beschriftung DEHNT.
 let nS=0;
 elemente.filter(e=>e.art==="schiebe").forEach(e=>{
  nS++; const px=x(e.pos), farbe="#6b4fa8";
  s+=`<rect x="${(px-8.5).toFixed(1)}" y="${(y+13.5).toFixed(1)}" width="17" height="17" rx="3" fill="${farbe}"/>`;
  s+=`<text x="${px.toFixed(1)}" y="${(y+25.6).toFixed(1)}" font-size="10" text-anchor="middle" fill="#fff" font-weight="700">S${nS}</text>`;
  s+=`<text x="${px.toFixed(1)}" y="${(y+40).toFixed(1)}" font-size="10" text-anchor="middle" fill="${farbe}" font-weight="700">DEHNT</text>`;
 });
 // Zusätzlich berechnete Dehnungselemente aus dem bestehenden Modul
 dilasEffektiv(a).dilas.forEach(d=>{
  const px=x(d.posAbStart), q=7;
  s+=`<polygon points="${px.toFixed(1)},${(y-q).toFixed(1)} ${(px+q).toFixed(1)},${y} ${px.toFixed(1)},${(y+q).toFixed(1)} ${(px-q).toFixed(1)},${y}" fill="#e07a1f" stroke="#8a4a0f" stroke-width="1"/>`;
 });
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ---- 7. Oberfläche --------------------------------------------------------
function setzeSchritt(n){
 schritt=Math.max(1,Math.min(SCHRITTE.length,n));
 zeichne();
 const k=$("p-inhalt"); if(k)k.scrollIntoView({block:"start"});
}
function schrittLeiste(){
 return `<div class="p-schritte">`+SCHRITTE.map((s,i)=>
  `<button type="button" class="p-schritt${i+1===schritt?" aktiv":""}" data-schritt="${i+1}">
     <span class="p-schritt-nr">${i+1}</span><span class="p-schritt-text">${esc(s)}</span></button>`).join("")+`</div>`;
}
function feld(label,inhalt,voll){
 return `<div class="p-feld${voll?" voll":""}"><label>${esc(label)}</label>${inhalt}</div>`;
}

function schritt1(){
 const a=aufnahme;
 const matOpt=measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const rgOpt=RG_GROESSEN.map(g=>`<option value="${esc(g.wert)}"${g.wert===a.groesse?" selected":""}>${esc(g.text)}</option>`).join("");
 const L=gesamtlaengeBerechnet(a);
 return `<div class="p-karte">
<h2>1 · Grunddaten</h2>
<div class="p-grid">
${feld("Bezeichnung",`<input id="p-bez" placeholder="z. B. Nordseite Haus A" value="${esc(a.bezeichnung)}">`,true)}
${feld("Material",`<select id="p-material">${matOpt}</select>`)}
${feld("Rinnengrösse",`<select id="p-groesse">${rgOpt}</select>`)}
${feld("Gesamtlänge gemessen (mm, optional)",
  `<input id="p-gesamt" type="number" inputmode="numeric" step="1" value="${a.gesamtlaengeManuell_mm??""}" placeholder="nur zur Kontrolle">`)}
${feld("Aus den Abschnitten",`<div class="p-wert">${L>0?esc(mm(L))+" mm":"–"}</div>`)}
</div>
<div class="p-hinweis">Die Gesamtlänge oben ist freiwillig. Sie dient nur der Kontrolle gegen die Summe der Abschnitte aus Schritt 2.</div>
</div>`;
}

function schritt2(){
 const a=aufnahme;
 const L=gesamtlaengeBerechnet(a);
 const dOpt=w=>STUTZEN_DURCHMESSER.map(d=>`<option value="${esc(d)}"${d===w?" selected":""}>${esc(d)}</option>`).join("");
 const fOpt=w=>FALLROHR_STATUS.map(f=>`<option value="${esc(f)}"${f===w?" selected":""}>${esc(f)}</option>`).join("");
 const zeilen=[];
 (a.segmente||[]).forEach((seg,i)=>{
  zeilen.push(`<div class="p-zeile">
<div class="p-zeile-kopf"><b>Abschnitt ${i+1}</b>
${a.segmente.length>1?`<button type="button" class="p-weg" data-seg-del="${i}">✕</button>`:""}</div>
<div class="p-grid">
${feld("Länge (mm)",`<input class="p-gross" data-seg-laenge="${i}" type="number" inputmode="numeric" step="1" value="${seg.laenge||''}" placeholder="0">`)}
</div></div>`);
  if(i>=a.segmente.length-1)return;
  // Übergang: Winkel ODER Stutzen – beides wird gleich eingefügt und ist
  // damit ab dem Abschnitt davor vermasst, nicht ab START.
  const art=uebergangArt(seg);
  const st=seg.stutzen||{};
  const istStutzen=art==="einhaenge"||art==="schiebe";
  const istEcke=art==="aussen"||art==="innen";
  const w=Math.abs(zahl(seg.winkel))||90;
  zeilen.push(`<div class="p-zeile p-ecke${art==="gerade"?" p-ecke-aus":""}${istStutzen?" p-stutzen":""}">
<div class="p-zeile-kopf"><b>Übergang ${i+1} → ${i+2}</b>
<span class="p-klein-text">${esc(mm(seg.laenge))} mm ab Abschnitt ${i+1}</span></div>
<div class="p-grid">
${feld("Was sitzt hier?",`<select data-ueb-art="${i}">`
  +UEBERGAENGE.map(u=>`<option value="${u.wert}"${u.wert===art?" selected":""}>${esc(u.text)}</option>`).join("")
  +`</select>`,true)}
${istEcke?feld("Winkel (°)",`<input class="p-gross" data-ecke-winkel="${i}" type="number" inputmode="numeric" step="1" value="${w}">`):""}
${istStutzen?feld("Ablaufrohr",`<select data-ueb-d="${i}">${dOpt(st.durchmesser)}</select>`):""}
${istStutzen?feld("Anzahl",`<input class="p-gross" data-ueb-anz="${i}" type="number" inputmode="numeric" step="1" min="1" value="${st.anzahl||1}">`):""}
${istStutzen?feld("Fallrohr",`<select data-ueb-f="${i}">${fOpt(st.fallrohr)}</select>`):""}
${istStutzen?feld("Bemerkung",`<input data-ueb-bem="${i}" value="${esc(st.bemerkung||"")}" placeholder="optional">`,true):""}
</div>
${istEcke&&w!==90?`<div class="p-hinweis">Der Katalog kennt nur den 90°-Winkel als Formteil. Zuschnitt und Fixpunkt werden deshalb mit den Werten des 90°-Winkels gerechnet.</div>`:""}
${art==="einhaenge"?`<div class="p-hinweis"><b>Fixpunkt.</b> Teilt die Dilatationsberechnung an dieser Stelle.</div>`:""}
${art==="schiebe"?`<div class="p-hinweis"><b>Kein Fixpunkt</b>, gilt aber als Dehnungselement – er nimmt die Ausdehnung hier selbst auf.</div>`:""}
</div>`);
 });
 return `<div class="p-karte">
<h2>2 · Rinnenverlauf</h2>
<div class="p-hinweis">Abschnitt für Abschnitt von START bis ENDE. Zwischen zwei Abschnitten sitzt ein
Übergang: eine Ecke, ein Einhänge- oder ein Schiebestutzen. Jedes Element ist dadurch
<b>ab dem Abschnitt davor</b> vermasst, nicht ab START.</div>
${zeilen.join("")}
<div class="p-knopfreihe">
<button type="button" class="p-blau" id="p-addSegment">＋ Rinnenabschnitt</button>
<button type="button" class="p-grau" id="p-addEcke">＋ Ecke</button>
<button type="button" class="p-grau" id="p-addEinhaenge">＋ Einhängestutzen</button>
<button type="button" class="p-grau" id="p-addSchiebe">＋ Schiebestutzen</button>
</div>
<div class="p-summe" id="p-summeL">Berechnete Gesamtlänge: <b>${L>0?esc(mm(L))+" mm":"–"}</b>${L>0?` &nbsp;(${esc(meter(L))} m)`:""}</div>
</div>
<div class="p-karte">
<h2>Verlauf im Überblick</h2>
<div id="p-band">${verlaufsBandSvg(a)}</div>
<div class="p-legende">▲ Ecke (Fixpunkt) &nbsp;·&nbsp; ● E = Einhängestutzen (Fixpunkt) &nbsp;·&nbsp; ■ S = Schiebestutzen (kein Fixpunkt, gilt als Dehnungselement) &nbsp;·&nbsp; ◆ zusätzlich berechnetes Dehnungselement<br>
Im Grundriss: ABL = Einhängestutzen &nbsp;·&nbsp; SS = Schiebestutzen &nbsp;·&nbsp; AE90/IE90 = Aussen-/Innenwinkel</div>
<h3>Massstäblicher Grundriss</h3>
<div class="p-grundriss" id="p-grundriss">${(()=>{const d=dilasEffektiv(a);return generateRinneGrundriss(d.segmente,d.dilas,d.boundaries||[])})()}</div>
</div>`;
}

function schritt3(){
 const a=aufnahme;
 const L=gesamtlaengeBerechnet(a);
 const vorschlag=halterVorschlag(a);
 const dila=dilasEffektiv(a);
 const nEin=stutzenListe(a,"einhaenge").length, nSch=stutzenListe(a,"schiebe").length;
 return `<div class="p-karte">
<h2>3 · Rinnenhalter</h2>
<div class="p-grid">
${feld("Halterabstand (mm)",`<input class="p-gross" id="p-halterAbstand" type="number" inputmode="numeric" step="10" value="${a.halter.abstand_mm||""}">`)}
${feld("Anzahl",`<input class="p-gross" id="p-halterAnzahl" type="number" inputmode="numeric" step="1" value="${a.halter.anzahl??""}" placeholder="${vorschlag??""}">`)}
${feld("Haltertyp (optional)",`<input id="p-halterTyp" value="${esc(a.halter.typ||"")}" placeholder="z. B. Aufschraubhalter">`,true)}
</div>
${vorschlag?`<div class="p-hinweis">Vorschlag aus ${esc(meter(L))} m und ${esc(mm(a.halter.abstand_mm))} mm Abstand: <b>${vorschlag} Stk.</b>
${a.halter.anzahl?"":" – wird verwendet, solange keine eigene Anzahl eingetragen ist."}
<button type="button" class="p-grau p-klein" id="p-halterUebernehmen">Vorschlag übernehmen</button></div>`:""}
</div>

<div class="p-karte">
<h2>Rinnenboden und Dehnung</h2>
<div class="p-grid">
${feld("Rinnenboden links",`<label class="p-schalter"><input type="checkbox" id="p-bodenLinks"${a.rinnenboden.links?" checked":""}> vorhanden</label>`)}
${feld("Rinnenboden rechts",`<label class="p-schalter"><input type="checkbox" id="p-bodenRechts"${a.rinnenboden.rechts?" checked":""}> vorhanden</label>`)}
${feld("Dehnung",`<select id="p-dehnungArt">
  <option value="keine"${a.dehnung.art==="keine"?" selected":""}>Keine</option>
  <option value="dehnungsstueck"${a.dehnung.art==="dehnungsstueck"?" selected":""}>Dehnungsstück</option></select>`)}
${a.dehnung.art==="dehnungsstueck"?feld("Anzahl Dehnungsstücke",
  `<input class="p-gross" id="p-dehnungAnzahl" type="number" inputmode="numeric" step="1" value="${a.dehnung.anzahl||''}" placeholder="0">`):""}
</div>
<div class="p-hinweis">Links und rechts beziehen sich auf START und ENDE des aufgenommenen Verlaufs,
nicht auf die Bildschirmdarstellung. Im Ausmass erscheinen sie als getrennte Positionen.
${dila.dilas.length?` ${dila.automatisch?"Die Berechnung aus dem bestehenden Modul ergibt":"Von Hand festgelegt sind"} <b>${dila.dilas.length}</b> zusätzliche(s) Dehnungselement(e) für ${esc(materialText(a))}.
<button type="button" class="p-grau p-klein" id="p-dehnungUebernehmen">Übernehmen</button>`:` ${dila.automatisch?`Für ${esc(materialText(a))} ist bei diesem Verlauf kein zusätzliches Dehnungselement nötig.`:"Von Hand auf kein Dehnungselement gesetzt."}`}
${dila.automatisch?"":` <b>Von Hand angepasst</b> – die Positionen stehen in Schritt 6 · Zuschnitt.`}</div>
</div>

<div class="p-karte">
<h2>Stutzen</h2>
<div class="p-hinweis">Einhänge- und Schiebestutzen werden in <b>Schritt 2 · Rinnenverlauf</b> eingefügt –
wie eine Ecke, an der Stelle, an der sie sitzen.</div>
<div class="p-zf-kopf">
<div><span>Einhängestutzen</span><b>${nEin}</b></div>
<div><span>Schiebestutzen</span><b>${nSch}</b></div>
</div>
<div class="p-knopfreihe"><button type="button" class="p-grau" data-schritt="2">↩︎ Zum Rinnenverlauf</button></div>
</div>`;
}

function schritt4(){
 const a=aufnahme;
 const fotos=(a.fotos||[]).map((f,i)=>`<div class="p-foto">
<img src="${esc(f)}" alt="Foto ${i+1}"><button type="button" class="p-weg" data-foto-del="${i}">✕</button></div>`).join("");
 return `<div class="p-karte">
<h2>4 · Fotos</h2>
<label class="p-datei">📷 Foto aufnehmen oder wählen
<input type="file" id="p-fotoInput" accept="image/*" capture="environment" multiple hidden></label>
<div class="p-fotos">${fotos||'<div class="p-leer">Noch kein Foto.</div>'}</div>
</div>
<div class="p-karte">
<h2>Skizze</h2>
${a.skizze?`<div class="p-foto gross"><img src="${esc(a.skizze)}" alt="Skizze"><button type="button" class="p-weg" id="p-skizzeDel">✕</button></div>`
 :'<div class="p-leer">Noch keine Skizze.</div>'}
<div class="p-knopfreihe"><button type="button" class="p-blau" id="p-skizzeOeffnen">✏️ ${a.skizze?"Skizze bearbeiten":"Skizze zeichnen"}</button></div>
</div>
<div class="p-karte">
<h2>Bemerkung</h2>
<textarea id="p-bemerkung" rows="4" placeholder="Bemerkung zur Massaufnahme">${esc(a.bemerkung||"")}</textarea>
</div>`;
}

function schritt5(){
 const a=aufnahme;
 const L=gesamtlaengeBerechnet(a);
 const p=pruefungen(a);
 // Der Verlauf von START bis ENDE. Jedes Element ist ab dem Abschnitt davor
 // vermasst – so, wie es aufgenommen wurde.
 const verlauf=[];
 verlaufElemente(a).forEach(e=>{
  if(e.art==="abschnitt"){verlauf.push(`<li>Abschnitt ${e.nr}: ${esc(mm(e.laenge))} mm</li>`);return}
  if(e.art==="ecke"){
   verlauf.push(`<li class="p-ecke-li">${e.ecke==="aussen"?"Aussenwinkel":"Innenwinkel"} ${e.winkel}° → <b>FIXPUNKT</b></li>`);
   return;
  }
  const name=e.art==="einhaenge"?"Einhängestutzen":"Schiebestutzen";
  verlauf.push(`<li class="${e.art==="einhaenge"?"p-fix-li":"p-losfix-li"}">`
   +`${esc(name)} ${esc(e.durchmesser)}${e.anzahl>1?` (${e.anzahl}×)`:""} → `
   +`<b>${e.art==="einhaenge"?"FIXPUNKT":"Dehnungselement"}</b>`
   +`${e.art==="einhaenge"?"":" (kein Fixpunkt)"}</li>`);
 });
 const komp=komponenten(a).map(k=>
  `<li>${k.einheit==="m"?esc(k.menge.toFixed(2))+" m":esc(k.menge)+" ×"} ${esc(k.bezeichnung)}</li>`).join("");
 return `<div class="p-karte">
<h2>5 · Kontrolle</h2>
${p.length?`<div class="p-pruefung">`+p.map(m=>
  `<div class="${m.art==="fehler"?"p-fehlerzeile":"p-warnzeile"}">${m.art==="fehler"?"⛔":"⚠️"} ${esc(m.text)}</div>`).join("")+`</div>`
 :`<div class="p-ok">✓ Keine Auffälligkeiten gefunden.</div>`}
</div>
<div class="p-karte p-zusammenfassung">
<h2>RINNE HALBRUND</h2>
<div class="p-zf-kopf">
<div><span>Material</span><b>${esc(materialText(a))}</b></div>
<div><span>Grösse</span><b>${esc(groesseText(a))}</b></div>
<div><span>Länge</span><b>${L>0?esc(mm(L))+" mm":"–"}</b></div>
</div>
<h3>Verlauf ab START</h3>
<ul class="p-liste">${verlauf.join("")||"<li>–</li>"}</ul>
<h3>Komponenten</h3>
<ul class="p-liste">${komp||"<li>–</li>"}</ul>
<h3>Dokumentation</h3>
<div class="p-zf-fuss">Fotos: <b>${(a.fotos||[]).length}</b> · Skizze: <b>${a.skizze?"vorhanden":"keine"}</b>
${a.bemerkung?`<div class="p-bem">${esc(a.bemerkung)}</div>`:""}</div>
</div>`;
}

// Die Zuschnitt-Tabelle. Dila-Zeilen sind editierbar: der Abstand zum
// Punkt davor lässt sich überschreiben, die Zeile lässt sich löschen –
// dasselbe Verhalten wie in der Dila-Liste der laufenden App.
function zuschnittTabelle(a){
 const d=dilasEffektiv(a);
 const st=berechneRinneStueckliste(d.segmente,d.dilas,d.boundaries||[],rinneDilaMass);
 const zeilen=st.map(s=>{
  const editierbar=s.dilaIndex!==null&&s.dilaIndex!==undefined;
  return `<tr${editierbar?' class="p-dila-zeile"':""}>`
   +`<td>${s.nr}</td>`
   +`<td>${esc(zuschnittName(s.von))} → ${esc(zuschnittName(s.bis))}</td>`
   +`<td class="p-num">${editierbar
     ?`<input class="p-dila-feld" type="number" inputmode="numeric" step="1" `
      +`data-dila-abstand="${s.dilaIndex}" data-dila-prev="${Math.round(s.prevPos)}" `
      +`value="${Math.round(s.abstand)}">`
     :esc(mm(s.abstand))}</td>`
   +`<td class="p-num"><b>${esc(mm(s.zuschnitt))}</b></td>`
   +`<td class="p-num">${editierbar
     ?`<button type="button" class="p-weg p-dila-weg" data-dila-del="${s.dilaIndex}" title="Dehnungselement löschen">✕</button>`
     :""}</td></tr>`;
 }).join("");
 return `<div class="p-tabelle" id="p-zuschnitt">
<table><thead><tr><th>Nr.</th><th>Von → Bis</th><th>Abstand (mm)</th><th>Zuschnitt (mm)</th><th></th></tr></thead>
<tbody>${zeilen||'<tr><td colspan="5" class="p-leer">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
</div>`;
}

function schritt6(){
 const a=aufnahme;
 const zeilen=ausmassZeilen(a);
 const mat=materialUebersicht(a);
 return `<div class="p-karte">
<h2>6 · Ausmass</h2>
<div class="p-hinweis">Automatisch aus der Massaufnahme. Nichts davon wird ein zweites Mal eingegeben – wird die Aufnahme geändert, ändert sich das Ausmass mit.</div>
<div class="p-tabelle">
<table><thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${zeilen.map(z=>`<tr><td>${z.pos}</td><td>${esc(z.bezeichnung)}</td><td class="p-num">${esc(z.menge)}</td><td>${esc(z.einheit)}</td><td class="p-quelle">${esc(z.herkunft)}</td></tr>`).join("")
 ||'<tr><td colspan="5" class="p-leer">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
</div>
</div>
<div class="p-karte">
<h2>Materialübersicht</h2>
<div class="p-tabelle">
<table><thead><tr><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Material</th></tr></thead>
<tbody>${mat.map(m=>`<tr><td>${esc(m.bezeichnung)}</td><td class="p-num">${esc(m.menge)}</td><td>${esc(m.einheit)}</td><td>${esc(m.material)}</td></tr>`).join("")
 ||'<tr><td colspan="4" class="p-leer">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
</div>
<div class="p-hinweis">Artikelnummern und Preise stehen hier bewusst nicht. Sie kommen später aus der Materialliste der jeweiligen Firma.</div>
</div>
<div class="p-karte">
<h2>Zuschnitt aus dem bestehenden Modul</h2>
<div class="p-hinweis">Diese Stückliste rechnet unverändert die Funktion der laufenden App (Dilatationselemente nach SPI/SIA, Anschlussmasse aus dem Katalog).
Die Zuschnittmasse je Element stehen in den <b>Einstellungen</b> oben rechts.</div>
${zuschnittTabelle(a)}
<div class="p-hinweis">${dilasEffektiv(a).automatisch
 ? "Die Dehnungselemente sind gerechnet. Der Abstand jeder Dila-Zeile lässt sich von Hand überschreiben, wenn es die Baustelle verlangt."
 : "<b>Von Hand angepasst.</b> Die Dehnungselemente werden nicht mehr neu gerechnet, auch nicht bei geänderter Länge oder anderem Material."}</div>
<div class="p-knopfreihe">
<button type="button" class="p-grau" id="p-dilaPlus">＋ Dehnungselement von Hand</button>
<button type="button" class="p-grau" id="p-dilaAuto"${dilasEffektiv(a).automatisch?" disabled":""}>↻ Zurück zur Berechnung</button>
</div>
</div>
<div class="p-karte">
<h2>PDF</h2>
<div class="p-hinweis">Erzeugt ein Blatt mit Verlauf, Schema, Ausmass, Materialübersicht,
Zuschnitt sowie Skizze und Fotos. Im Druckdialog als Ziel <b>„Als PDF speichern“</b> wählen.</div>
<div class="p-knopfreihe"><button type="button" class="p-blau p-gross-knopf" id="p-pdf2">🖨 Als PDF speichern</button></div>
</div>`;
}

// ---- 9. Bilder ------------------------------------------------------------
// Fotos werden verkleinert gespeichert. Der lokale Speicher des Browsers
// fasst nur wenige Megabyte – ein Originalfoto vom Handy würde ihn allein
// sprengen. Für den Prototyp ist das ausreichend; im späteren Einbau in die
// App gehen die Bilder wie gehabt in den privaten Supabase-Speicher.
const FOTO_MAXKANTE=1280, FOTO_QUALITAET=0.72;
function bildVerkleinern(datei){
 return new Promise(fertig=>{
  const leser=new FileReader();
  leser.onerror=()=>fertig(null);
  leser.onload=()=>{
   const bild=new Image();
   bild.onerror=()=>fertig(null);
   bild.onload=()=>{
    const f=Math.min(1,FOTO_MAXKANTE/Math.max(bild.width,bild.height));
    const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(bild.width*f));
    c.height=Math.max(1,Math.round(bild.height*f));
    c.getContext("2d").drawImage(bild,0,0,c.width,c.height);
    try{fertig(c.toDataURL("image/jpeg",FOTO_QUALITAET))}catch(e){fertig(null)}
   };
   bild.src=leser.result;
  };
  leser.readAsDataURL(datei);
 });
}

// Skizze: einfache Zeichenfläche mit dem Finger. Bewusst schlicht gehalten –
// der Prototyp soll zeigen, dass eine Skizze zur Aufnahme gehört, nicht ein
// Zeichenprogramm ersetzen.
let skizzeCtx=null, skizzeZeichnet=false;
function skizzeOeffnen(){
 const box=$("p-skizzeBox"), c=$("p-skizzeCanvas");
 if(!box||!c)return;
 box.hidden=false;
 const b=c.getBoundingClientRect();
 c.width=Math.max(320,Math.round(b.width));
 c.height=Math.round(c.width*0.62);
 skizzeCtx=c.getContext("2d");
 skizzeCtx.fillStyle="#fff"; skizzeCtx.fillRect(0,0,c.width,c.height);
 skizzeCtx.strokeStyle="#17202a"; skizzeCtx.lineWidth=3;
 skizzeCtx.lineCap="round"; skizzeCtx.lineJoin="round";
 if(aufnahme.skizze){
  const alt=new Image();
  alt.onload=()=>skizzeCtx.drawImage(alt,0,0,c.width,c.height);
  alt.src=aufnahme.skizze;
 }
}
function skizzePunkt(ev,c){
 const b=c.getBoundingClientRect();
 const t=(ev.touches&&ev.touches[0])||ev;
 return [(t.clientX-b.left)*(c.width/b.width),(t.clientY-b.top)*(c.height/b.height)];
}

// ---- 10. Gespeicherte Aufnahmen ------------------------------------------
function listeHtml(){
 const liste=alleAufnahmen();
 if(!liste.length)return '<div class="p-leer">Noch keine gespeicherte Massaufnahme.</div>';
 return liste.map(a=>{
  const L=gesamtlaengeBerechnet(a);
  const d=new Date(a.geaendert||a.erstellt);
  const datum=isNaN(d)?"":d.toLocaleDateString("de-CH")+" "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
  return `<div class="p-zeile">
<div class="p-zeile-kopf"><b>${esc(a.bezeichnung||"Ohne Bezeichnung")}</b>
<span class="p-klein-text">${esc(datum)}</span></div>
<div class="p-klein-text">${esc(groesseText(a))} · ${esc(materialText(a))} · ${L>0?esc(mm(L))+" mm":"–"}${a.id===aufnahme.id?" · <b>gerade offen</b>":""}</div>
<div class="p-knopfreihe">
<button type="button" class="p-blau" data-oeffnen="${esc(a.id)}">Öffnen</button>
<button type="button" class="p-grau" data-kopieren="${esc(a.id)}">Kopieren</button>
<button type="button" class="p-grau" data-loeschen="${esc(a.id)}">Löschen</button>
</div></div>`;
 }).join("");
}

// ---- 10b. Einstellungen: Zuschnittmasse je Element -------------------------
// Ein Mass je Element, das dem Rinnenzuschnitt zugerechnet (+) oder abgezogen
// (−) wird. Die Liste kommt aus dem Anschlusstyp-Katalog selbst – dadurch
// bekommt jedes künftige Element automatisch sein Feld, ohne dass hier eine
// zweite Liste gepflegt werden muss.
const MASS_ROLLE={};
MASS_ROLLE[ECKE_AUSSEN_ID]="Aussenwinkel im Verlauf";
MASS_ROLLE[ECKE_INNEN_ID]="Innenwinkel im Verlauf";
MASS_ROLLE[EINHAENGE_FITTING_ID]="Einhängestutzen (Fixpunkt)";
MASS_ROLLE[SCHIEBE_FITTING_ID]="Schiebestutzen (wirkt wie ein Dehnungselement)";
MASS_ROLLE[BODEN_FITTING_ID]="Rinnenboden links und rechts";
function masseHtml(){
 const m=masseLesen()||{};
 const zeilen=rinneFittingTypes.map(f=>{
  const k=f.symbol||("id"+f.id);
  const rolle=MASS_ROLLE[f.id]||"im Verlauf zurzeit nicht verwendet";
  return `<tr>
<td><b>${esc(f.name)}</b><div class="p-klein-text">${esc(rolle)}</div></td>
<td class="p-num"><input class="p-mass-feld" type="number" inputmode="numeric" step="1"
 data-mass-fitting="${esc(k)}" value="${Number(f.mass_mm)||0}"></td>
<td class="p-klein-text">Vorgabe ${MASS_VORGABE[k]} mm</td></tr>`;
 }).join("");
 return `<div class="p-karte">
<h2>⚙️ Zuschnittmasse je Element</h2>
<div class="p-hinweis">Jedes Element kann ein Mass tragen, das dem Rinnenzuschnitt
<b>zugerechnet (+)</b> oder <b>abgezogen (−)</b> wird. Beispiel: eine Aussenecke
mit −110 mm verkürzt das anschliessende Stück um 110 mm.
Die Werte gelten sofort für alle Aufnahmen und bleiben in diesem Browser.
In der App stehen sie als Firmeneinstellung unter
<b>Einstellungen → Massaufnahmen → Rinne</b>.</div>
<div class="p-tabelle">
<table><thead><tr><th>Element</th><th>Mass (mm)</th><th></th></tr></thead>
<tbody>${zeilen}
<tr class="p-mass-dila">
<td><b>Dilatationselement</b><div class="p-klein-text">an jedem gerechneten oder von Hand gesetzten Dehnungselement, beidseitig</div></td>
<td class="p-num"><input class="p-mass-feld" type="number" inputmode="numeric" step="1"
 id="p-massDila" value="${Number(rinneDilaMass)||0}"></td>
<td class="p-klein-text">Vorgabe ${DILA_MASS_VORGABE} mm</td></tr>
</tbody></table>
</div>
<div class="p-knopfreihe">
<button type="button" class="p-grau" id="p-masseZurueck">↻ Auf die Vorgaben zurücksetzen</button>
<button type="button" class="p-grau" id="p-masseSchliessen">Schliessen</button>
</div>
</div>`;
}

// ---- 11. Zeichnen ---------------------------------------------------------
let listeOffen=false, massenOffen=false;
function zeichne(){
 synchronisiereUebergaenge(aufnahme);
 const kopf=$("p-kopf");
 if(kopf){
  const L=gesamtlaengeBerechnet(aufnahme);
  const f=pruefungen(aufnahme).filter(m=>m.art==="fehler").length;
  kopf.innerHTML=`<div class="p-kopf-titel">${esc(aufnahme.bezeichnung||"Neue Massaufnahme")}</div>
<div class="p-kopf-zeile">${esc(groesseText(aufnahme))} · ${esc(materialText(aufnahme))} · ${L>0?esc(mm(L))+" mm":"noch keine Länge"}${f?` · <span class="p-kopf-fehler">${f} Hinweis${f>1?"e":""} in Schritt 5</span>`:""}</div>`;
 }
 const leiste=$("p-leiste"); if(leiste)leiste.innerHTML=schrittLeiste();
 const inhalt=$("p-inhalt");
 if(inhalt)inhalt.innerHTML=[schritt1,schritt2,schritt3,schritt4,schritt5,schritt6][schritt-1]();
 const zurueck=$("p-zurueck"), weiter=$("p-weiter");
 if(zurueck)zurueck.disabled=schritt<=1;
 if(weiter){weiter.disabled=schritt>=SCHRITTE.length;
  weiter.textContent=schritt>=SCHRITTE.length?"Fertig":"Weiter › "+SCHRITTE[schritt];}
 const listeBox=$("p-listeBox");
 if(listeBox){listeBox.hidden=!listeOffen; if(listeOffen)listeBox.innerHTML=listeHtml();}
 const massenBox=$("p-massenBox");
 if(massenBox){massenBox.hidden=!massenOffen; if(massenOffen)massenBox.innerHTML=masseHtml();}
}

// Nach einer Zifferneingabe wird NICHT der ganze Schritt neu gezeichnet –
// sonst verliert das Feld nach dem ersten Zeichen den Fokus (dieselbe Falle
// wie im Rinnen-Profil der laufenden App). Aktualisiert werden nur die
// abgeleiteten Anzeigen.
function aktualisiereLive(){
 const L=gesamtlaengeBerechnet(aufnahme);
 const s=$("p-summeL");
 if(s)s.innerHTML=`Berechnete Gesamtlänge: <b>${L>0?esc(mm(L))+" mm":"–"}</b>${L>0?` &nbsp;(${esc(meter(L))} m)`:""}`;
 const band=$("p-band"); if(band)band.innerHTML=verlaufsBandSvg(aufnahme);
 const gr=$("p-grundriss");
 if(gr){const d=dilasEffektiv(aufnahme);gr.innerHTML=generateRinneGrundriss(aufnahme.segmente,d.dilas,d.boundaries||[]);}
 const kopf=$("p-kopf");
 if(kopf){
  const z=kopf.querySelector(".p-kopf-zeile");
  if(z)z.innerHTML=`${esc(groesseText(aufnahme))} · ${esc(materialText(aufnahme))} · ${L>0?esc(mm(L))+" mm":"noch keine Länge"}`;
 }
}

// ---- 12. Bedienung --------------------------------------------------------
// Eine einzige Stelle für alle Ereignisse. Tippen (input) ändert nur das
// Modell und die abgeleiteten Anzeigen, Auswählen (change) und Klicken
// zeichnen den Schritt neu.
function verdrahten(){
 // Auf document.body, nicht auf #p-app: die Knöpfe der Kopfleiste
 // (Speichern, Kopieren, Neu, Gespeicherte) und die Skizzenfläche liegen
 // ausserhalb von #p-app.
 const wurzel=document.body;
 if(!wurzel)return;

 wurzel.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{};
  const a=aufnahme;
  let live=false;
  if(t.id==="p-bez")a.bezeichnung=t.value;
  else if(t.id==="p-gesamt")a.gesamtlaengeManuell_mm=t.value===""?null:zahl(t.value);
  else if(t.id==="p-halterAbstand"){a.halter.abstand_mm=zahl(t.value);}
  else if(t.id==="p-halterAnzahl")a.halter.anzahl=t.value===""?null:zahl(t.value);
  else if(t.id==="p-halterTyp")a.halter.typ=t.value;
  else if(t.id==="p-dehnungAnzahl")a.dehnung.anzahl=zahl(t.value);
  else if(t.id==="p-bemerkung")a.bemerkung=t.value;
  else if(d.segLaenge!==undefined){a.segmente[Number(d.segLaenge)].laenge=zahl(t.value);live=true;}
  else if(d.eckeWinkel!==undefined){
   const i=Number(d.eckeWinkel), alt=zahl(a.segmente[i].winkel);
   a.segmente[i].winkel=(alt<0?-1:1)*Math.abs(zahl(t.value));
   synchronisiereUebergaenge(a); live=true;
  }
  else if(d.uebAnz!==undefined){
   const i=Number(d.uebAnz);
   if(a.segmente[i]&&a.segmente[i].stutzen)a.segmente[i].stutzen.anzahl=zahl(t.value);
  }
  else if(d.uebBem!==undefined){
   const i=Number(d.uebBem);
   if(a.segmente[i]&&a.segmente[i].stutzen)a.segmente[i].stutzen.bemerkung=t.value;
  }
  else return;
  if(live)aktualisiereLive();
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{};
  const a=aufnahme;
  // Zuschnittmasse: nur das Modell und den Inhalt dahinter neu zeichnen.
  // Die Einstellungstabelle selbst bleibt stehen, sonst verliert das
  // nächste Feld beim Weitertippen den Fokus.
  if(d.massFitting!==undefined||t.id==="p-massDila"){
   const fitting={};
   document.querySelectorAll("[data-mass-fitting]").forEach(el=>{
    fitting[el.dataset.massFitting]=el.value===""?0:zahl(el.value);
   });
   const dilaFeld=$("p-massDila");
   masseSchreiben(fitting,dilaFeld&&dilaFeld.value!==""?zahl(dilaFeld.value):0);
   const inhalt=$("p-inhalt");
   if(inhalt)inhalt.innerHTML=[schritt1,schritt2,schritt3,schritt4,schritt5,schritt6][schritt-1]();
   return;
  }
  // Dila-Abstand von Hand: derselbe Weg wie in der Dila-Liste der App –
  // der eingegebene Abstand gilt ab dem Punkt davor.
  if(d.dilaAbstand!==undefined){
   const i=Number(d.dilaAbstand);
   const liste=dilasVonHand(a);
   if(liste[i]){
    liste[i].posAbStart=Math.round((Number(d.dilaPrev)||0)+zahl(t.value));
    zeichne();
   }
   return;
  }
  if(t.id==="p-material")a.material=t.value;
  else if(t.id==="p-groesse")a.groesse=t.value;
  else if(t.id==="p-bodenLinks")a.rinnenboden.links=t.checked;
  else if(t.id==="p-bodenRechts")a.rinnenboden.rechts=t.checked;
  else if(t.id==="p-dehnungArt"){a.dehnung.art=t.value;if(t.value==="keine")a.dehnung.anzahl=0;}
  else if(d.uebArt!==undefined){
   // Ein Übergang trägt entweder eine Ecke oder einen Stutzen – nie beides.
   const i=Number(d.uebArt), seg=a.segmente[i];
   if(!seg)return;
   const betrag=Math.abs(zahl(seg.winkel))||90;
   if(t.value==="aussen"||t.value==="innen"){
    seg.winkel=t.value==="aussen"?-betrag:betrag; seg.stutzen=null;
   }else if(t.value==="einhaenge"||t.value==="schiebe"){
    const alt=seg.stutzen||{};
    seg.winkel=0;
    seg.stutzen={art:t.value,
      durchmesser:alt.durchmesser||STUTZEN_DURCHMESSER[2],
      anzahl:Math.max(1,Math.round(zahl(alt.anzahl)||1)),
      fallrohr:alt.fallrohr||FALLROHR_STATUS[0],bemerkung:alt.bemerkung||""};
   }else{ seg.winkel=0; seg.stutzen=null; }
  }
  else if(d.uebD!==undefined){
   const i=Number(d.uebD);
   if(a.segmente[i]&&a.segmente[i].stutzen)a.segmente[i].stutzen.durchmesser=t.value;
  }
  else if(d.uebF!==undefined){
   const i=Number(d.uebF);
   if(a.segmente[i]&&a.segmente[i].stutzen)a.segmente[i].stutzen.fallrohr=t.value;
  }
  else if(t.id==="p-fotoInput"){fotosAufnehmen(t.files);return;}
  else return;
  zeichne();
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target.closest("button,[data-schritt],[data-oeffnen],[data-kopieren],[data-loeschen]");
  if(!t)return;
  const d=t.dataset||{}, a=aufnahme;
  if(d.schritt!==undefined){setzeSchritt(Number(d.schritt));return;}
  if(t.id==="p-zurueck"){setzeSchritt(schritt-1);return;}
  if(t.id==="p-weiter"){setzeSchritt(schritt+1);return;}

  // Abschnitt, Ecke und Stutzen werden gleich angelegt: ein neuer Abschnitt,
  // und der Übergang davor bekommt das gewünschte Element.
  const neuerAbschnitt=uebergang=>{
   const letzte=a.segmente[a.segmente.length-1];
   if(letzte&&uebergang==="ecke"){letzte.winkel=-90;letzte.stutzen=null}
   else if(letzte&&(uebergang==="einhaenge"||uebergang==="schiebe")){
    letzte.winkel=0;
    letzte.stutzen={art:uebergang,durchmesser:STUTZEN_DURCHMESSER[2],anzahl:1,
                    fallrohr:FALLROHR_STATUS[0],bemerkung:""};
   }
   a.segmente.push({laenge:0,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null});
   zeichne();
  };
  if(t.id==="p-addSegment"){neuerAbschnitt("gerade");return;}
  if(t.id==="p-addEcke"){neuerAbschnitt("ecke");return;}
  if(t.id==="p-addEinhaenge"){neuerAbschnitt("einhaenge");return;}
  if(t.id==="p-addSchiebe"){neuerAbschnitt("schiebe");return;}
  if(d.segDel!==undefined){
   if(a.segmente.length<=1)return;
   a.segmente.splice(Number(d.segDel),1);
   zeichne();return;
  }
  if(t.id==="p-halterUebernehmen"){a.halter.anzahl=halterVorschlag(a);zeichne();return;}
  if(t.id==="p-dehnungUebernehmen"){
   a.dehnung.art="dehnungsstueck";
   a.dehnung.anzahl=dilasEffektiv(a).dilas.length;
   zeichne();return;
  }

  if(d.fotoDel!==undefined){a.fotos.splice(Number(d.fotoDel),1);zeichne();return;}
  if(t.id==="p-skizzeDel"){
   if(confirm("Skizze wirklich löschen?")){a.skizze=null;zeichne();}
   return;
  }
  if(t.id==="p-skizzeOeffnen"){skizzeOeffnen();return;}
  if(t.id==="p-skizzeSpeichern"){
   const c=$("p-skizzeCanvas");
   if(c)a.skizze=c.toDataURL("image/png");
   $("p-skizzeBox").hidden=true; zeichne(); return;
  }
  if(t.id==="p-skizzeAbbrechen"){$("p-skizzeBox").hidden=true;return;}
  if(t.id==="p-skizzeLeeren"){
   const c=$("p-skizzeCanvas");
   if(c&&skizzeCtx){skizzeCtx.fillStyle="#fff";skizzeCtx.fillRect(0,0,c.width,c.height);}
   return;
  }

  if(t.id==="p-speichern"){
   if(!String(a.bezeichnung||"").trim()){
    alert("Bitte zuerst in Schritt 1 eine Bezeichnung eintragen.");
    setzeSchritt(1); return;
   }
   if(aufnahmeSpeichern()){t.textContent="✓ Gespeichert";setTimeout(()=>{t.textContent="💾 Speichern"},1600);}
   if(listeOffen)zeichne();
   return;
  }
  if(t.id==="p-neu"){
   if(!confirm("Neue Massaufnahme beginnen? Nicht gespeicherte Änderungen gehen verloren."))return;
   aufnahme=leereAufnahme(); setzeSchritt(1); return;
  }
  if(t.id==="p-kopieren"){
   const k=aufnahmeKopieren(aufnahme.id);
   if(!k){alert("Diese Massaufnahme ist noch nicht gespeichert. Bitte zuerst speichern.");return;}
   aufnahme=k; setzeSchritt(1);
   alert("Kopie angelegt: „"+k.bezeichnung+"“. Sie ist von der ursprünglichen Aufnahme unabhängig.");
   return;
  }
  if(t.id==="p-pdf"||t.id==="p-pdf2"){
   if(!String(a.bezeichnung||"").trim()){
    alert("Bitte zuerst in Schritt 1 eine Bezeichnung eintragen – sie steht als Titel im PDF.");
    setzeSchritt(1); return;
   }
   druckVorbereiten();
   window.print();
   return;
  }
  if(t.id==="p-liste"){listeOffen=!listeOffen;massenOffen=false;zeichne();return;}
  if(t.id==="p-massen"){massenOffen=!massenOffen;listeOffen=false;zeichne();return;}
  if(t.id==="p-masseSchliessen"){massenOffen=false;zeichne();return;}
  if(t.id==="p-masseZurueck"){masseZuruecksetzen();zeichne();return;}
  if(t.id==="p-dilaPlus"){
   const liste=dilasVonHand(a);
   const L=gesamtlaengeBerechnet(a);
   liste.push({posAbStart:Math.round(L/2)});
   zeichne();return;
  }
  if(t.id==="p-dilaAuto"){a.dilasManuell=null;zeichne();return;}
  if(d.dilaDel!==undefined){
   const liste=dilasVonHand(a);
   liste.splice(Number(d.dilaDel),1);
   zeichne();return;
  }
  if(d.oeffnen!==undefined){
   if(aufnahmeLaden(d.oeffnen)){listeOffen=false;setzeSchritt(1);}
   return;
  }
  if(d.kopieren!==undefined){
   const k=aufnahmeKopieren(d.kopieren);
   if(k){aufnahme=k;listeOffen=false;setzeSchritt(1);}
   return;
  }
  if(d.loeschen!==undefined){
   const liste=alleAufnahmen();
   const eintrag=liste.find(x=>x.id===d.loeschen);
   if(!eintrag)return;
   if(!confirm("„"+(eintrag.bezeichnung||"Ohne Bezeichnung")+"“ endgültig löschen?"))return;
   speichereAlle(liste.filter(x=>x.id!==d.loeschen));
   zeichne(); return;
  }
 });

 // Ein Zahlenfeld markiert beim ERSTEN Antippen seinen ganzen Inhalt. Wer
 // ein Mass korrigiert, ersetzt es – sonst tippt man versehentlich davor
 // ("7500" + "6200" ergäbe 75006200). Ein zweites Antippen setzt wie
 // gewohnt nur die Schreibmarke, damit man auch eine Ziffer ändern kann.
 // Das Markieren muss im click-Ereignis geschehen: ein früheres select()
 // würde vom Loslassen der Maus/des Fingers wieder aufgehoben.
 const istZahlfeld=t=>t&&t.tagName==="INPUT"&&t.type==="number"&&t.closest("#p-app");
 wurzel.addEventListener("focusin",e=>{if(istZahlfeld(e.target))e.target.dataset.frisch="1"});
 wurzel.addEventListener("click",e=>{
  const t=e.target;
  if(!istZahlfeld(t)||t.dataset.frisch!=="1")return;
  delete t.dataset.frisch;
  try{t.select()}catch(err){}
 });

 // Skizzenfläche
 const c=$("p-skizzeCanvas");
 if(c){
  const start=ev=>{ev.preventDefault();if(!skizzeCtx)return;skizzeZeichnet=true;
   const [x,y]=skizzePunkt(ev,c);skizzeCtx.beginPath();skizzeCtx.moveTo(x,y);};
  const zieh=ev=>{if(!skizzeZeichnet||!skizzeCtx)return;ev.preventDefault();
   const [x,y]=skizzePunkt(ev,c);skizzeCtx.lineTo(x,y);skizzeCtx.stroke();};
  const stopp=()=>{skizzeZeichnet=false};
  c.addEventListener("pointerdown",start);
  c.addEventListener("pointermove",zieh);
  window.addEventListener("pointerup",stopp);
  c.addEventListener("touchstart",start,{passive:false});
  c.addEventListener("touchmove",zieh,{passive:false});
  window.addEventListener("touchend",stopp);
 }
}

async function fotosAufnehmen(dateien){
 const liste=Array.from(dateien||[]);
 if(!liste.length)return;
 for(const datei of liste){
  if(!/^image\//.test(datei.type||"")){alert("„"+datei.name+"“ ist kein Bild und wurde übersprungen.");continue}
  const bild=await bildVerkleinern(datei);
  if(bild)aufnahme.fotos.push(bild);
  else alert("„"+datei.name+"“ konnte nicht gelesen werden.");
 }
 zeichne();
}

document.addEventListener("DOMContentLoaded",()=>{
 verdrahten();
 zeichne();
});

// Auch über Strg+P oder das Browsermenü gedruckt: das Dokument wird kurz
// vorher aus dem aktuellen Stand gebaut, damit nie ein alter Stand im PDF
// landet.
window.addEventListener("beforeprint",druckVorbereiten);

// ---- 13. PDF / Drucken ----------------------------------------------------
// Der Prototyp läuft als einzelne Datei ohne Server. Ein PDF entsteht
// deshalb über den Druckdialog des Browsers ("Ziel: Als PDF speichern") –
// derselbe Weg, den der Regierapport der laufenden App geht.
//
// Bewusst KEIN window.open(): ein neues Fenster wird auf dem Tablet
// regelmässig als Popup blockiert. Stattdessen wird das Dokument in einen
// eigenen Bereich derselben Seite gebaut, den nur der Druck sieht.
//
// Das Layout folgt den Konventionen des App-PDFs (Version 2.53/2.54):
// Firmenblock links, Dokumenttyp rechts, grosser Titel, eine dünne
// Trennlinie, dunkle Abschnittsbalken, Tabellen mit wiederholtem Kopf.
// Es ist dafür neu geschrieben – die PDF-Bausteine der App stecken in
// js/16 und liessen sich ohne das ganze Formular nicht laden.
// Die Stückliste des bestehenden Moduls benennt die Grenzpunkte mit den
// Namen aus dem Anschlusstyp-Katalog ("Ablaufstutzen", "Schiebestutzen").
// Der Einhängestutzen heisst dort noch "Ablaufstutzen" – derselbe Punkt hiesse
// im selben Dokument oben so und unten anders. Umbenannt wird deshalb NUR die
// Anzeige; die Fachfunktion und ihre Zahlen bleiben unangetastet.
const ZUSCHNITT_NAMEN={"Ablaufstutzen":"Einhängestutzen"};
function zuschnittName(t){
 const k=String(t==null?"":t);
 return ZUSCHNITT_NAMEN[k]||k;
}

// Was tatsächlich in den Zuschnitt eingeflossen ist. Gehört ins PDF, weil
// dieselbe Rinne mit anderen Einstellungen andere Zahlen ergibt – ohne diese
// Zeile liesse sich ein Ausdruck später nicht mehr nachvollziehen.
function massTextFuerDruck(){
 const teile=rinneFittingTypes
  .filter(f=>MASS_ROLLE[f.id]!==undefined&&(Number(f.mass_mm)||0)!==0)
  .map(f=>`${f.name} ${Number(f.mass_mm)>0?"+":""}${Number(f.mass_mm)} mm`);
 const dm=Number(rinneDilaMass)||0;
 if(dm!==0)teile.push(`Dilatationselement ${dm>0?"+":""}${dm} mm`);
 return teile.length?teile.join(" · "):"alle 0 mm";
}
function druckDatumZeit(){
 const d=new Date();
 return d.toLocaleDateString("de-CH")+", "+d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
}
// Die Fusszeile steht in der Randbox der Seite (@bottom-left). Ein
// position:fixed-Element wuerde sich in einem mehrseitigen Druck ueber den
// Inhalt legen, weil dafuer kein Platz reserviert ist.
function druckFussText(){
 const t="Spengler-DIGITAL · Prototyp Rinne Halbrund · "
  +(aufnahme.bezeichnung||"Ohne Bezeichnung")+" · gedruckt am "+druckDatumZeit();
 // Anfuehrungszeichen und Zeilenumbrueche wuerden die CSS-Zeichenkette brechen.
 return t.replace(/[\\"\r\n]/g," ");
}
function druckInfoZeile(label,wert){
 return wert?`<div><span>${esc(label)}</span>${wert}</div>`:"";
}
function druckDokumentHtml(){
 const a=aufnahme;
 const L=gesamtlaengeBerechnet(a);
 const d=dilasEffektiv(a);
 const st=berechneRinneStueckliste(d.segmente,d.dilas,d.boundaries||[],rinneDilaMass);
 const zeilen=ausmassZeilen(a);
 const mat=materialUebersicht(a);
 const pruef=pruefungen(a);
 const ecken=eckenAusVerlauf(a);

 // Verlauf von START bis ENDE. Vermasst wird ab dem Abschnitt davor, nicht
 // ab START – genau so, wie draussen gemessen wird.
 const verlauf=[];
 verlauf.push(`<tr class="ende"><td class="mass">–</td><td>START</td><td class="kz"></td></tr>`);
 let nE=0,nS=0;
 verlaufElemente(a).forEach(e=>{
  if(e.art==="abschnitt"){
   verlauf.push(`<tr><td class="mass">${esc(mm(e.laenge))}</td>`
    +`<td>Abschnitt ${e.nr}</td><td class="kz"></td></tr>`);
   return;
  }
  if(e.art==="ecke"){
   verlauf.push(`<tr class="fix"><td class="mass"></td>`
    +`<td>${e.ecke==="aussen"?"Aussenwinkel":"Innenwinkel"} ${e.winkel}°</td>`
    +`<td class="kz">FIXPUNKT</td></tr>`);
   return;
  }
  const fix=e.art==="einhaenge";
  const nr=fix?++nE:++nS;
  verlauf.push(`<tr class="${fix?"fix":"losfix"}"><td class="mass"></td>`
   +`<td>${fix?"Einhängestutzen":"Schiebestutzen"} ${nr} · ${esc(e.durchmesser)}`
   +`${e.anzahl>1?` (${e.anzahl}×)`:""}${e.fallrohr?` · Fallrohr ${esc(e.fallrohr)}`:""}</td>`
   +`<td class="kz">${fix?"FIXPUNKT":"DEHNUNGSELEMENT"}</td></tr>`);
 });
 verlauf.push(`<tr class="ende"><td class="mass">${esc(mm(L))}</td><td>ENDE (Gesamtlänge)</td><td class="kz"></td></tr>`);

 const fotos=(a.fotos||[]).map((f,i)=>
  `<div class="pd-bildseite"><div class="pd-balken">Foto ${i+1} von ${a.fotos.length}</div>`
  +`<img src="${esc(f)}" alt=""></div>`).join("");
 const skizze=a.skizze
  ?`<div class="pd-bildseite"><div class="pd-balken">Skizze</div><img src="${esc(a.skizze)}" alt=""></div>`:"";

 return `
<div class="pd-kopf">
 <div class="pd-firma">
  <div class="pd-marke">SPENGLER-DIGITAL</div>
  <div class="pd-klein">Prototyp · Massaufnahme<br>Die Rechnung stammt unverändert aus dem Modul „Rinne Halbrund“.</div>
 </div>
 <div class="pd-typ">
  <div class="pd-doktyp">Massaufnahme</div>
  <div class="pd-datum">${esc(druckDatumZeit())}</div>
 </div>
</div>
<div class="pd-titel">
 <h1>${esc(a.bezeichnung||"Ohne Bezeichnung")}</h1>
 <div class="pd-untertitel">Rinne halbrund · ${esc(materialText(a))} · ${esc(groesseText(a))}</div>
</div>
<div class="pd-info">
${druckInfoZeile("Gesamtlänge",L>0?esc(mm(L))+" mm ("+esc(meter(L))+" m)":"–")}
${druckInfoZeile("Abschnitte",String((a.segmente||[]).length))}
${druckInfoZeile("Ecken",ecken.length?`${ecken.filter(e=>e.art==="aussen").length} aussen, ${ecken.filter(e=>e.art==="innen").length} innen`:"keine")}
${druckInfoZeile("Einhängestutzen",String(stutzenListe(a,"einhaenge").length)+" (Fixpunkt)")}
${druckInfoZeile("Schiebestutzen",String(stutzenListe(a,"schiebe").length)+" (kein Fixpunkt, gilt als Dehnungselement)")}
${druckInfoZeile("Dehnungselemente",`${d.dilas.length} zusätzlich berechnet · ${esc(d.tabelle.label)}: max. ${esc(mm(d.tabelle.mitDehnungselement))} mm, ab Fixpunkt ${esc(mm(d.tabelle.abFixpunkten))} mm`)}
</div>
<div class="pd-trenner"></div>

${pruef.length?`<div class="pd-balken">Hinweise</div>
<div class="pd-hinweise">${pruef.map(m=>
 `<div class="${m.art==="fehler"?"f":"w"}">${m.art==="fehler"?"Fehler:":"Hinweis:"} ${esc(m.text)}</div>`).join("")}</div>`:""}

<div class="pd-balken">Verlauf ab START · jedes Mass gilt ab dem Abschnitt davor</div>
<table class="pd-tab pd-verlauf">
<thead><tr><th class="mass">Mass (mm)</th><th>Element</th><th class="kz">Wirkung</th></tr></thead>
<tbody>${verlauf.join("")}</tbody></table>

<div class="pd-balken">Schema</div>
<div class="pd-band">${verlaufsBandSvg(a)}</div>
<div class="pd-legende">Ecke (Dreieck) und Einhängestutzen (E, mit Strich durch die Rinne) sind Fixpunkte ·
Schiebestutzen (S, eckig) ist keiner, gilt aber als Dehnungselement · Raute = zusätzlich berechnetes Dehnungselement<br>
Im Grundriss darunter stehen die Kurzzeichen des Katalogs: ABL = Einhängestutzen, SS = Schiebestutzen, AE90/IE90 = Aussen-/Innenwinkel</div>
<div class="pd-grundriss">${generateRinneGrundriss(d.segmente,d.dilas,d.boundaries||[])}</div>

<div class="pd-balken">Ausmass</div>
<table class="pd-tab">
<thead><tr><th class="r">Pos.</th><th>Bezeichnung</th><th class="r">Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${zeilen.map(z=>`<tr><td class="r">${z.pos}</td><td>${esc(z.bezeichnung)}</td>`
 +`<td class="r">${esc(z.menge)}</td><td>${esc(z.einheit)}</td><td class="q">${esc(z.herkunft)}</td></tr>`).join("")
 ||'<tr><td colspan="5">Noch nichts zu berechnen.</td></tr>'}</tbody></table>

<div class="pd-balken">Materialübersicht</div>
<table class="pd-tab">
<thead><tr><th>Bezeichnung</th><th class="r">Menge</th><th>Einheit</th><th>Material</th></tr></thead>
<tbody>${mat.map(m=>`<tr><td>${esc(m.bezeichnung)}</td><td class="r">${esc(m.menge)}</td>`
 +`<td>${esc(m.einheit)}</td><td>${esc(m.material)}</td></tr>`).join("")
 ||'<tr><td colspan="4">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
<div class="pd-fussnote">Artikelnummern und Preise stehen hier bewusst nicht –
sie kommen aus der Materialliste der jeweiligen Firma.</div>

<div class="pd-balken">Zuschnitt</div>
<table class="pd-tab">
<thead><tr><th class="r">Nr.</th><th>Von → Bis</th><th class="r">Abstand (mm)</th><th class="r">Zuschnitt (mm)</th></tr></thead>
<tbody>${st.map(s=>`<tr><td class="r">${s.nr}</td><td>${esc(zuschnittName(s.von))} → ${esc(zuschnittName(s.bis))}</td>`
 +`<td class="r">${esc(mm(s.abstand))}</td><td class="r b">${esc(mm(s.zuschnitt))}</td></tr>`).join("")
 ||'<tr><td colspan="4">Noch nichts zu berechnen.</td></tr>'}</tbody></table>
<div class="pd-fussnote">Dehnungselemente, Anschlussmasse und Grundriss rechnet unverändert
das bestehende Modul der laufenden App.
${d.automatisch?"Die Dehnungselemente sind gerechnet."
 :"<b>Die Dehnungselemente sind von Hand festgelegt</b> und weichen möglicherweise von der Berechnung ab."}
Verwendete Zuschnittmasse: ${esc(massTextFuerDruck())}.</div>

${a.bemerkung?`<div class="pd-balken">Bemerkung</div><div class="pd-bemerkung">${esc(a.bemerkung)}</div>`:""}
${skizze}${fotos}
<style>@page{@bottom-left{content:"${druckFussText()}";
 font-family:Arial,Helvetica,sans-serif;font-size:6.2pt;color:#7b858c}}</style>
`;
}
// Die Grundriss-Zeichnung des bestehenden Moduls hat eine feste, quadratische
// viewBox – bei einer langgezogenen Rinne ist der grösste Teil davon leer und
// verschiebt im PDF alles Weitere auf die nächste Seite. Für den Druck wird
// die viewBox deshalb auf den tatsächlich gezeichneten Inhalt zugeschnitten.
// Die Zeichenfunktion selbst bleibt dabei unangetastet – zugeschnitten wird
// erst das fertige Ergebnis.
function grundrissZuschneiden(box){
 const svg=box.querySelector(".pd-grundriss svg");
 if(!svg||!svg.getBBox)return;
 // getBBox() misst nur an einem tatsächlich gerenderten Element. Das
 // Druckdokument ist am Bildschirm ausgeblendet, also kurz unsichtbar
 // ausserhalb des Bildes einblenden, messen und wieder verstecken.
 box.classList.add("p-druck-messen");
 try{
  const b=svg.getBBox();
  if(b.width>0&&b.height>0){
   const rand=16;   // Platz für Beschriftungen am Rand der Zeichnung
   svg.setAttribute("viewBox",
    `${(b.x-rand).toFixed(1)} ${(b.y-rand).toFixed(1)} `
    +`${(b.width+2*rand).toFixed(1)} ${(b.height+2*rand).toFixed(1)}`);
   svg.style.maxWidth="100%";   // die Zeichenfunktion setzt hier 340px
   svg.style.width="100%";
   svg.style.margin="0 auto";
  }
 }catch(e){/* ohne Messung bleibt die ursprüngliche viewBox stehen */}
 box.classList.remove("p-druck-messen");
}
function druckVorbereiten(){
 const box=$("p-druck");
 if(!box)return;
 // Sicherheitsnetz: die Ecken werden sonst erst beim Zeichnen in die
 // Struktur des bestehenden Moduls gespiegelt. Das PDF darf nicht davon
 // abhängen, dass vorher gezeichnet wurde.
 synchronisiereUebergaenge(aufnahme);
 box.innerHTML=druckDokumentHtml();
 grundrissZuschneiden(box);
}
