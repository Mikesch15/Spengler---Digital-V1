"use strict";
// ===========================================================================
// RINNE HALBRUND · Aufnahme (Verlauf, Komponenten, Ausmass, Normlängen)
// ===========================================================================
// Weiterentwicklung des bestehenden Moduls, keine Parallellösung:
// js/12-rinne-halbrund.js bleibt UNVERÄNDERT und rechnet weiterhin alles
// Fachliche – Zuschnitt je Abschnitt, Fixpunkte, Dehnungselemente, Stückliste
// und Grundriss. Diese Datei ist die Erfassung darüber.
//
//   erfasst wird:  Abschnitt · Übergang · Abschnitt · Übergang · …
//   ein Übergang ist entweder eine Ecke oder ein Stutzen und damit ab dem
//   Abschnitt davor vermasst, nicht ab START.
//
// Die Brücke zum bestehenden Modul sind seine eigenen Variablen:
// rinneSegments und rinneDilas werden vor jeder Rechnung aus dem erfassten
// Verlauf gesetzt. Die alten, unsichtbaren Formularelemente in
// #rinneStummel bleiben stehen, damit js/12 unverändert laden kann.
//
// Zuschnittmasse kommen aus den bestehenden Firmeneinstellungen
// (rinne_fitting_types.mass_mm je Element, app_settings.rinne_dila_mass_mm
// für das Dehnungselement) – es wird bewusst keine zweite Quelle geführt.
// ===========================================================================

const RA_GROESSEN=[
 {wert:"200",text:"200 mm"},{wert:"250",text:"250 mm"},
 {wert:"330",text:"330 mm"},{wert:"400",text:"400 mm"}
];
const RA_DURCHMESSER=["Ø 60","Ø 75","Ø 100","Ø 120"];
const RA_FALLROHR=["bestehend","neu","unbekannt"];
const RA_UEBERGAENGE=[
 {wert:"gerade",   text:"gerade weiter (nichts)"},
 {wert:"aussen",   text:"Aussenwinkel"},
 {wert:"innen",    text:"Innenwinkel"},
 {wert:"einhaenge",text:"Einhängestutzen"},
 {wert:"schiebe",  text:"Schiebestutzen"}
];

// ---- Anschlusstypen aus dem Firmenkatalog ---------------------------------
// Die IDs sind je Firma verschieden – sie dürfen deshalb NICHT fest im Code
// stehen. Gesucht wird zuerst über das Symbol, ersatzweise über die
// fachliche Eigenschaft. Fehlt ein Typ ganz (eine frisch registrierte Firma
// hat noch gar keinen Katalog), wird das gemeldet statt still falsch
// gerechnet.
function raTyp(symbol,pruef){
 const s=String(symbol).toUpperCase();
 const list=Array.isArray(rinneFittingTypes)?rinneFittingTypes:[];
 return list.find(f=>String(f.symbol||"").toUpperCase()===s)
     || list.find(pruef) || null;
}
function raTypFuer(art){
 if(art==="aussen")   return raTyp("AE90",f=>f.is_fixpunkt&&Number(f.angle_deg)<0);
 if(art==="innen")    return raTyp("IE90",f=>f.is_fixpunkt&&Number(f.angle_deg)>0);
 if(art==="einhaenge")return raTyp("ABL", f=>f.is_fixpunkt&&Number(f.angle_deg)===0);
 if(art==="schiebe")  return raTyp("SS",  f=>f.is_schiebestutzen);
 if(art==="boden")    return raTyp("BD",  f=>/boden/i.test(f.name||""));
 return null;
}
function raTypId(art){const f=raTypFuer(art);return f?f.id:null}
function raFehlendeTypen(){
 return [["aussen","Aussenwinkel"],["innen","Innenwinkel"],
         ["einhaenge","Einhängestutzen"],["schiebe","Schiebestutzen"],
         ["boden","Rinnenboden"]].filter(x=>!raTypFuer(x[0])).map(x=>x[1]);
}
// Ist diese Typ-ID einer, den die Erfassung selbst setzt?
function raEigenerTyp(id){
 if(id===null||id===undefined||id==="")return false;
 return ["aussen","innen","einhaenge","schiebe","boden"]
   .some(a=>{const t=raTypId(a);return t!==null&&Number(t)===Number(id)});
}

// ---- Normlängen ------------------------------------------------------------
// Vorgabe nach Angabe des Betreibers. Was hier NICHT steht, wird auch nicht
// geraten – dort meldet die App, dass nichts gerechnet wurde.
const RA_NORM_VORGABE={
 "6|200":[6000], "6|250":[6000], "6|330":[6000], "6|400":[6000],   // Stahl verzinkt
 "3|200":[6000], "3|250":[4000,5000,6000], "3|330":[4000,5000,6000], "3|400":[6000], // Kupfer
 "4|200":[6000], "4|250":[5000,6000], "4|330":[5000,6000], "4|400":[6000], // CrNi-Stahl
 "2|200":[6000], "2|250":[5000,6000], "2|330":[4000,5000,6000]     // Titanzink
 // Nicht angegeben: Titanzink 400, Chromstahl verzinnt, Aluminium.
};
function raNormSchluessel(a){return String(a&&a.material)+"|"+String(a&&a.groesse)}
function raNormlaengenFuer(a){
 const k=raNormSchluessel(a);
 const eigen=(rinneNormlaengen&&typeof rinneNormlaengen==="object")?rinneNormlaengen[k]:null;
 const quelle=Array.isArray(eigen)?eigen:RA_NORM_VORGABE[k];
 if(!Array.isArray(quelle))return null;
 const liste=quelle.map(v=>Math.round(raZahl(v))).filter(v=>v>0);
 return liste.length?Array.from(new Set(liste)).sort((x,y)=>x-y):[];
}

// ---- Verschnitt-Optimierung -----------------------------------------------
// Aus welchen Normlängen lassen sich alle Zuschnitte so schneiden, dass
// möglichst wenig übrig bleibt? Mehrere Stücke dürfen aus derselben Stange
// kommen. Vorgehen: zuerst eine gierige Lösung als Obergrenze, danach alle
// Stangen-Kombinationen mit kleinerer oder gleicher Gesamtlänge der Reihe
// nach; die erste, die aufgeht, hat den kleinsten Materialeinsatz und damit
// den geringsten Verschnitt – die Summe der Stücke ist ja fest.
// Reicht das Suchbudget nicht, wird die gierige Lösung zurückgegeben und
// ausdrücklich NICHT als beste ausgewiesen.
const RA_BUDGET=400000;
function raPasst(stuecke,kapazitaeten,zaehler){
 const rest=kapazitaeten.slice();
 const belegung=kapazitaeten.map(()=>[]);
 function schritt(i,summeRest){
  if(i>=stuecke.length)return true;
  if(zaehler.n++>RA_BUDGET)return false;
  let frei=0; for(let k=0;k<rest.length;k++)frei+=rest[k];
  if(summeRest>frei)return false;
  const st=stuecke[i], probiert=[];
  for(let k=0;k<rest.length;k++){
   if(rest[k]<st)continue;
   if(probiert.indexOf(rest[k])>=0)continue;   // gleicher Rest: schon probiert
   probiert.push(rest[k]);
   rest[k]-=st; belegung[k].push(st);
   if(schritt(i+1,summeRest-st))return true;
   rest[k]+=st; belegung[k].pop();
  }
  return false;
 }
 let summe=0; stuecke.forEach(x=>{summe+=x});
 if(!schritt(0,summe))return null;
 return kapazitaeten.map((kap,k)=>({laenge:kap,stuecke:belegung[k].slice(),
                                    rest:kap-belegung[k].reduce((x,y)=>x+y,0)}));
}
function raGierig(stuecke,normen){
 const offen=stuecke.slice().sort((a,b)=>b-a);
 const stangen=[];
 while(offen.length){
  let beste=null;
  normen.forEach(n=>{
   if(offen[0]>n)return;
   const genommen=[]; let rest=n;
   offen.forEach(st=>{if(st<=rest){rest-=st;genommen.push(st)}});
   if(!genommen.length)return;
   if(!beste||rest<beste.rest||(rest===beste.rest&&n<beste.laenge))
    beste={laenge:n,rest,stuecke:genommen};
  });
  if(!beste)return null;
  beste.stuecke.forEach(st=>{offen.splice(offen.indexOf(st),1)});
  stangen.push(beste);
 }
 return stangen;
}
function raNormPlan(stuecke,normen){
 const teile=(stuecke||[]).map(v=>Math.round(raZahl(v))).filter(v=>v>0).sort((a,b)=>b-a);
 if(!Array.isArray(normen)||!normen.length)
  return {ok:false,grund:"keine",stangen:[],zuLang:[],gesamt:0,verschnitt:0,
          summeStuecke:0,optimal:false};
 const maxN=Math.max.apply(null,normen);
 const zuLang=teile.filter(v=>v>maxN);
 const passend=teile.filter(v=>v<=maxN);
 const summeStuecke=passend.reduce((a,b)=>a+b,0);
 if(!passend.length)
  return {ok:zuLang.length===0,grund:zuLang.length?"zuLang":"leer",stangen:[],
          zuLang,gesamt:0,verschnitt:0,summeStuecke:0,optimal:true};
 const gierig=raGierig(passend,normen);
 if(!gierig)return {ok:false,grund:"zuLang",stangen:[],zuLang:passend,gesamt:0,
                    verschnitt:0,summeStuecke,optimal:false};
 const gierigGesamt=gierig.reduce((a,b)=>a+b.laenge,0);
 const nsort=normen.slice().sort((a,b)=>b-a);
 const kombis=[];
 const maxAnzahl=nsort.map(n=>Math.floor(gierigGesamt/n));
 (function baue(i,counts,summe){
  if(summe>gierigGesamt)return;
  if(i===nsort.length){
   if(summe>=summeStuecke)kombis.push({counts:counts.slice(),summe,
    anzahl:counts.reduce((a,b)=>a+b,0)});
   return;
  }
  for(let c=0;c<=maxAnzahl[i];c++){
   counts[i]=c;
   if(summe+c*nsort[i]>gierigGesamt)break;
   baue(i+1,counts,summe+c*nsort[i]);
  }
  counts[i]=0;
 })(0,nsort.map(()=>0),0);
 kombis.sort((a,b)=>a.summe-b.summe||a.anzahl-b.anzahl);
 const zaehler={n:0};
 for(const k of kombis){
  const kap=[];
  k.counts.forEach((c,i)=>{for(let j=0;j<c;j++)kap.push(nsort[i])});
  if(!kap.length)continue;
  const plan=raPasst(passend,kap,zaehler);
  if(plan){
   plan.sort((a,b)=>b.laenge-a.laenge||a.rest-b.rest);
   return {ok:true,grund:"",stangen:plan,zuLang,gesamt:k.summe,
           verschnitt:k.summe-summeStuecke,summeStuecke,optimal:true};
  }
  if(zaehler.n>RA_BUDGET)break;
 }
 gierig.sort((a,b)=>b.laenge-a.laenge||a.rest-b.rest);
 return {ok:true,grund:"",stangen:gierig,zuLang,gesamt:gierigGesamt,
         verschnitt:gierigGesamt-summeStuecke,summeStuecke,optimal:false};
}

// ---- Zustand ---------------------------------------------------------------
const raZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
function raMm(v){return Math.round(raZahl(v)).toLocaleString("de-CH")}
function raMeter(v){return (Math.round(raZahl(v))/1000)
  .toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})}

let rinneA=raLeer();
function raLeer(){
 return {
  material:String(measurementMaterialOrFallback(null).id||""),
  groesse:"330",
  gesamtlaengeManuell_mm:null,
  // Winkel UND Stutzen sitzen am ENDE ihres Abschnitts – der Übergang IST
  // die Segmentgrenze des bestehenden Moduls.
  segmente:[{laenge:0,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}],
  halter:{anzahl:null,abstand_mm:500,typ:""},
  rinnenboden:{links:true,rechts:true},
  dehnung:{art:"keine",anzahl:0},
  dilasManuell:null      // null = gerechnet, sonst die Liste von Hand
 };
}
// Aus einem gespeicherten Datensatz. Ältere Aufnahmen kennen nur segments,
// dilas und rinneAbwicklung – sie öffnen damit unverändert weiter.
function raAusData(d){
 const a=raLeer();
 if(!d||typeof d!=="object")return a;
 if(d.material!==undefined&&d.material!==null&&d.material!=="")
  a.material=String(measurementMaterialOrFallback(d.material).id||"");
 const g=String(d.groesse||d.rinneAbwicklung||"330");
 a.groesse=RA_GROESSEN.some(x=>x.wert===g)?g:"330";
 if(d.gesamtlaengeManuell_mm!==undefined)a.gesamtlaengeManuell_mm=d.gesamtlaengeManuell_mm;
 if(Array.isArray(d.segments)&&d.segments.length)
  a.segmente=d.segments.map(s=>({laenge:raZahl(s.laenge),
    linksTyp:s.linksTyp||"",rechtsTyp:s.rechtsTyp||"",winkel:raZahl(s.winkel),
    stutzen:(s.stutzen&&s.stutzen.art)?{art:s.stutzen.art,
      durchmesser:s.stutzen.durchmesser||RA_DURCHMESSER[2],
      anzahl:Math.max(1,Math.round(raZahl(s.stutzen.anzahl)||1)),
      fallrohr:s.stutzen.fallrohr||RA_FALLROHR[0],
      bemerkung:s.stutzen.bemerkung||""}:null}));
 if(d.halter)a.halter={anzahl:(d.halter.anzahl===null||d.halter.anzahl===undefined)?null:raZahl(d.halter.anzahl),
                       abstand_mm:raZahl(d.halter.abstand_mm)||500,typ:d.halter.typ||""};
 if(d.rinnenboden)a.rinnenboden={links:!!d.rinnenboden.links,rechts:!!d.rinnenboden.rechts};
 else if(Array.isArray(d.segments)&&d.segments.length){
  // Alte Aufnahme: ein Rinnenboden wurde nie erfasst. Nicht erfinden.
  a.rinnenboden={links:false,rechts:false};
 }
 if(d.dehnung)a.dehnung={art:d.dehnung.art==="dehnungsstueck"?"dehnungsstueck":"keine",
                         anzahl:raZahl(d.dehnung.anzahl)};
 if(Array.isArray(d.dilasManuell))
  a.dilasManuell=d.dilasManuell.map(x=>({posAbStart:raZahl(x&&x.posAbStart)}));
 else if(Array.isArray(d.dilas)&&!d.dilasManuell&&d.dilasVonHand)
  a.dilasManuell=d.dilas.map(x=>({posAbStart:raZahl(x&&x.posAbStart)}));
 return a;
}

// ---- Ableitungen (unverändert aus dem Prototyp) ----------------------------
function raGroesseText(a){const g=RA_GROESSEN.find(x=>x.wert===a.groesse);return g?g.text:"–"}
function raMaterialText(a){const m=findMeasurementMaterial(a.material);return m?m.name:"–"}
function raGesamtlaenge(a){return (a.segmente||[]).reduce((s,seg)=>s+raZahl(seg.laenge),0)}
function raUebergangArt(seg){
 if(!seg)return "gerade";
 if(seg.stutzen&&seg.stutzen.art)return seg.stutzen.art;
 const w=raZahl(seg.winkel);
 return w===0?"gerade":(w<0?"aussen":"innen");
}
// Der Verlauf von START bis ENDE. "abVorher" ist die Länge des Abschnitts
// unmittelbar davor – so ist jedes Element ab dem letzten Rinnenabschnitt
// vermasst und nicht ab START.
function raVerlauf(a){
 const segs=a.segmente||[], liste=[];
 let pos=0;
 segs.forEach((seg,i)=>{
  const laenge=raZahl(seg.laenge);
  liste.push({art:"abschnitt",nr:i+1,index:i,laenge,von:pos,pos:pos+laenge});
  pos+=laenge;
  if(i>=segs.length-1)return;
  const art=raUebergangArt(seg);
  if(art==="gerade")return;
  if(art==="aussen"||art==="innen")
   liste.push({art:"ecke",index:i,pos,abVorher:laenge,
               winkel:Math.abs(raZahl(seg.winkel))||90,ecke:art});
  else{
   const st=seg.stutzen||{};
   liste.push({art,index:i,pos,abVorher:laenge,
               durchmesser:st.durchmesser||RA_DURCHMESSER[2],
               anzahl:Math.round(raZahl(st.anzahl)),
               fallrohr:st.fallrohr||"",bemerkung:st.bemerkung||""});
  }
 });
 return liste;
}
function raStutzen(a,art){
 return raVerlauf(a).filter(e=>e.art==="einhaenge"||e.art==="schiebe")
  .filter(e=>!art||e.art===art);
}
function raHalterVorschlag(a){
 const L=raGesamtlaenge(a), ab=raZahl(a.halter.abstand_mm);
 if(L<=0||ab<=0)return null;
 return Math.floor(L/ab)+1;
}
function raHalterAnzahl(a){
 const eigen=a.halter.anzahl;
 if(eigen!==null&&eigen!==undefined&&eigen!=="")return Math.round(raZahl(eigen));
 return raHalterVorschlag(a)||0;
}
// Anschlusstypen aus dem Verlauf setzen. Der Übergang IST die Segmentgrenze
// des bestehenden Moduls – deshalb muss nichts geteilt oder umgerechnet
// werden. Am ersten und letzten Ende sitzt der Rinnenboden.
function raSynchronisiere(a){
 const segs=a.segmente||[];
 segs.forEach((seg,i)=>{
  if(seg.stutzen===undefined)seg.stutzen=null;
  if(i>=segs.length-1)return;
  const id=raTypId(raUebergangArt(seg));
  const naechste=segs[i+1];
  if(id===null){
   if(raEigenerTyp(seg.rechtsTyp))seg.rechtsTyp="";
   if(raEigenerTyp(naechste.linksTyp))naechste.linksTyp="";
  }else{seg.rechtsTyp=id; naechste.linksTyp=id;}
 });
 if(segs.length){
  const letzte=segs[segs.length-1], b=a.rinnenboden||{}, bid=raTypId("boden");
  letzte.winkel=0; letzte.stutzen=null;
  if(raEigenerTyp(letzte.rechtsTyp))letzte.rechtsTyp="";
  if(raEigenerTyp(segs[0].linksTyp))segs[0].linksTyp="";
  if(bid!==null){
   if(b.links)segs[0].linksTyp=bid;
   if(b.rechts)letzte.rechtsTyp=bid;
  }
 }
 return a;
}
function raRechenSegmente(a){
 const kopie={rinnenboden:a.rinnenboden||{},
  segmente:(a.segmente||[]).map(x=>({laenge:raZahl(x.laenge),
   linksTyp:x.linksTyp||"",rechtsTyp:x.rechtsTyp||"",winkel:raZahl(x.winkel),
   stutzen:x.stutzen||null}))};
 raSynchronisiere(kopie);
 return kopie.segmente.map(x=>({laenge:x.laenge,linksTyp:x.linksTyp,
   rechtsTyp:x.rechtsTyp,winkel:x.winkel}));
}
// Dehnungselemente: unverändert die Rechnung des bestehenden Moduls.
function raDilasGerechnet(a){
 const segs=raRechenSegmente(a);
 if(!segs.length)return {dilas:[],tabelle:rinneMaterialTabelle(a.material),
                         boundaries:[],segmente:segs};
 const r=calcRinneDilas(segs,a.material);
 r.segmente=segs;
 return r;
}
// Die tatsächlich gültigen: gerechnet, solange niemand eingegriffen hat.
function raDilas(a){
 const r=raDilasGerechnet(a);
 r.automatisch=!Array.isArray(a.dilasManuell);
 if(!r.automatisch)
  r.dilas=a.dilasManuell.map(d=>({posAbStart:raZahl(d.posAbStart)}))
                        .sort((x,y)=>x.posAbStart-y.posAbStart);
 return r;
}
function raDilasVonHand(a){
 if(!Array.isArray(a.dilasManuell))
  a.dilasManuell=raDilasGerechnet(a).dilas.map(d=>({posAbStart:Math.round(raZahl(d.posAbStart))}));
 return a.dilasManuell;
}
function raStueckliste(a){
 const d=raDilas(a);
 return berechneRinneStueckliste(d.segmente,d.dilas,d.boundaries||[],rinneDilaMass);
}
function raZuschnitte(a){
 return raStueckliste(a).map(s=>Math.round(raZahl(s.zuschnitt))).filter(v=>v>0);
}
function raNormErgebnis(a){return raNormPlan(raZuschnitte(a),raNormlaengenFuer(a))}

// ---- Plausibilität ---------------------------------------------------------
function raPruefungen(a){
 const meldungen=[];
 const L=raGesamtlaenge(a);
 const segs=a.segmente||[];
 if(!segs.length||L<=0)meldungen.push({art:"fehler",text:"Es ist noch kein Rinnenabschnitt mit einer Länge erfasst."});
 segs.forEach((s,i)=>{
  if(raZahl(s.laenge)<0)meldungen.push({art:"fehler",text:`Abschnitt ${i+1} hat eine negative Länge.`});
  const w=raZahl(s.winkel);
  if(w<-180||w>180)meldungen.push({art:"fehler",text:`Der Winkel nach Abschnitt ${i+1} liegt ausserhalb von −180° bis 180°.`});
 });
 if(L>0&&L<300)meldungen.push({art:"warnung",text:`Die Gesamtlänge von ${raMm(L)} mm ist auffällig kurz – bitte prüfen.`});
 if(L>200000)meldungen.push({art:"warnung",text:`Die Gesamtlänge von ${raMeter(L)} m ist auffällig lang – bitte prüfen.`});
 // Manuelle Gesamtlänge gegen die Summe der Abschnitte
 const man=a.gesamtlaengeManuell_mm;
 if(man!==null&&man!==undefined&&man!==""&&raZahl(man)>0&&L>0){
  const diff=Math.round(raZahl(man)-L);
  if(diff!==0){
   meldungen.push({art:"warnung",
    text:`Die Abschnitte ergeben ${raMm(L)} mm, die angegebene Gesamtlänge beträgt ${raMm(man)} mm. `
        +`Differenz ${diff>0?"+":""}${raMm(diff)} mm.`});
  }
 }
 // Eine Stutzenposition kann nicht mehr ausserhalb der Rinne liegen und
 // auch nicht negativ sein: der Stutzen sitzt an einem Übergang zwischen
 // zwei Abschnitten. Der Fall ist strukturell ausgeschlossen, nicht nur
 // geprüft. Zu prüfen bleibt die Anzahl.
 raVerlauf(a).filter(e=>e.art==="einhaenge"||e.art==="schiebe").forEach((e,i)=>{
  const name=e.art==="einhaenge"?"Einhängestutzen":"Schiebestutzen";
  if(raZahl(e.anzahl)<1)meldungen.push({art:"fehler",
   text:`${name} ${i+1} hat keine gültige Anzahl.`});
 });
 if(raZahl(a.halter.abstand_mm)<0)meldungen.push({art:"fehler",text:"Der Halterabstand darf nicht negativ sein."});
 if(a.halter.anzahl!==null&&a.halter.anzahl!==""&&raZahl(a.halter.anzahl)<0)
  meldungen.push({art:"fehler",text:"Die Halteranzahl darf nicht negativ sein."});
 if(a.dehnung.art==="dehnungsstueck"&&raZahl(a.dehnung.anzahl)<0)
  meldungen.push({art:"fehler",text:"Die Anzahl Dehnungsstücke darf nicht negativ sein."});
 // Von Hand gesetzte Dehnungselemente: sie werden NICHT stillschweigend
 // zurechtgerückt, sondern gemeldet – wer eingreift, soll sehen, was er tut.
 if(Array.isArray(a.dilasManuell)){
  a.dilasManuell.forEach((dl,i)=>{
   const pos=raZahl(dl.posAbStart);
   if(pos<0||(L>0&&pos>L))meldungen.push({art:"fehler",
    text:`Dehnungselement ${i+1} liegt bei ${raMm(pos)} mm und damit ausserhalb der Rinne (0 bis ${raMm(L)} mm).`});
  });
  const auto=raDilasGerechnet(a).dilas.length, hand=a.dilasManuell.length;
  if(hand<auto)meldungen.push({art:"warnung",
   text:`Von Hand sind ${hand} Dehnungselement(e) gesetzt, gerechnet wären ${auto}. `
       +`Bei ${raMaterialText(a)} kann sich die Rinne dann an einer Stelle nicht genug ausdehnen.`});
  else if(hand>auto)meldungen.push({art:"warnung",
   text:`Von Hand sind ${hand} Dehnungselement(e) gesetzt, gerechnet wären ${auto}.`});
 }
 return meldungen;
}
function hatFehler(a){return pruefungen(a).some(m=>m.art==="fehler")}


// ---- Komponenten, Ausmass, Materialübersicht -------------------------------
// EINE Ableitung – Zusammenfassung, Ausmass und Materialübersicht lesen
// alle aus derselben Liste. Nichts wird doppelt gerechnet oder von Hand
// nachgetragen.
function raKomponenten(a){
 // gz ist der Grössenzusatz, z. B. " 330 mm".
 const gz=" "+raGroesseText(a);
 const L=raGesamtlaenge(a);
 const ecken=raVerlauf(a).filter(e=>e.art==="ecke").map(e=>({art:e.ecke}));
 const innen=ecken.filter(e=>e.art==="innen").length;
 const aussen=ecken.filter(e=>e.art==="aussen").length;
 const liste=[];
 if(L>0)liste.push({schluessel:"rinne",bezeichnung:`Rinne halbrund${gz} ${raMaterialText(a)}`,
                    menge:Math.round(L)/1000,einheit:"m",herkunft:"Verlauf"});
 const nHalter=raHalterAnzahl(a);
 if(nHalter>0)liste.push({schluessel:"halter",bezeichnung:`Rinnenhalter${gz}`+(a.halter.typ?` (${a.halter.typ})`:""),
                          menge:nHalter,einheit:"Stk.",herkunft:a.halter.anzahl?"Eingabe":"Vorschlag aus Länge/Abstand"});
 if(innen)liste.push({schluessel:"innenwinkel",bezeichnung:`Innenwinkel${gz}`,menge:innen,einheit:"Stk.",herkunft:"Verlauf"});
 if(aussen)liste.push({schluessel:"aussenwinkel",bezeichnung:`Aussenwinkel${gz}`,menge:aussen,einheit:"Stk.",herkunft:"Verlauf"});
 // Stutzen nach Durchmesser gruppieren. Beide Arten erscheinen im Ausmass –
 // dass nur der Einhängestutzen ein Fixpunkt ist, betrifft ausschliesslich
 // die Dilatationsberechnung, nicht die Stückzahl.
 const gruppiere=(art,bez,quelle,schl)=>{
  const nachD={};
  raStutzen(a,art).forEach(e=>{
   const d=e.durchmesser||"Ø ?";
   nachD[d]=(nachD[d]||0)+Math.round(raZahl(e.anzahl));
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
  const nD=Math.round(raZahl(a.dehnung.anzahl));
  if(nD>0)liste.push({schluessel:"dehnung",bezeichnung:`Dehnungsstück${gz}`,menge:nD,einheit:"Stk.",herkunft:"Eingabe"});
 }
 return liste;
}
function raAusmassZeilen(a){
 // Das Ausmass IST die Komponentenliste – die Positionen werden nirgends
 // ein zweites Mal eingegeben .
 return raKomponenten(a).map((k,i)=>({
  pos:i+1,
  bezeichnung:k.bezeichnung,
  menge:k.einheit==="m"?k.menge.toFixed(2):String(k.menge),
  einheit:k.einheit,
  herkunft:k.herkunft
 }));
}
function raMaterialUebersicht(a){
 // Bewusst OHNE Artikelnummern und Preise : die kommen später
 // aus der firmenindividuellen Materialliste.
 const mat=raMaterialText(a);
 return raKomponenten(a).map(k=>({
  bezeichnung:k.bezeichnung,menge:k.einheit==="m"?k.menge.toFixed(2):String(k.menge),
  einheit:k.einheit,material:mat
 }));
}


// ---- Verlaufsband ----------------------------------------------------------
// Neue, ergänzende Ansicht: der ganze Verlauf von START bis ENDE als gerades
// Band. Darauf sitzen Ecken, Abläufe und Dilas an ihrer echten Position.
// Genau dafür gedacht, auf dem Tablet in einem Blick zu prüfen, ob ein
// Ablauf an der richtigen Stelle liegt. Der massstäbliche Grundriss kommt
// weiterhin unverändert aus dem bestehenden Modul.
function raBandSvg(a){
 const L=raGesamtlaenge(a);
 if(L<=0)return '<div class="small" style="color:var(--muted);text-align:center;padding:14px">Noch kein Abschnitt erfasst.</div>';
 const W=470,H=132,l=34,r=W-34,y=66;
 const x=p=>l+(r-l)*Math.max(0,Math.min(1,raZahl(p)/L));
 let s='';
 s+=`<line x1="${l}" y1="${y}" x2="${r}" y2="${y}" stroke="#17202a" stroke-width="7" stroke-linecap="round"/>`;
 s+=`<text x="${l}" y="${y+30}" font-size="11.5" text-anchor="middle" fill="#68737d" font-weight="700">START</text>`;
 s+=`<text x="${r}" y="${y+30}" font-size="11.5" text-anchor="middle" fill="#68737d" font-weight="700">ENDE</text>`;
 s+=`<text x="${r}" y="${(y-46).toFixed(1)}" font-size="13" text-anchor="end" fill="#1769aa" font-weight="700">Gesamt ${esc(raMm(L))} mm</text>`;

 const elemente=raVerlauf(a);
 // Abschnitte: die Länge steht über dem eigenen Abschnitt – sie IST das
 // Mass bis zum nächsten Element.
 elemente.filter(e=>e.art==="abschnitt").forEach((e,i,alle)=>{
  const xm=(x(e.von)+x(e.pos))/2;
  s+=`<text x="${xm.toFixed(1)}" y="${y-16}" font-size="12" text-anchor="middle" fill="#17202a" font-weight="700">${esc(raMm(e.laenge))}</text>`;
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
 raDilas(a).dilas.forEach(d=>{
  const px=x(d.posAbStart), q=7;
  s+=`<polygon points="${px.toFixed(1)},${(y-q).toFixed(1)} ${(px+q).toFixed(1)},${y} ${px.toFixed(1)},${(y+q).toFixed(1)} ${(px-q).toFixed(1)},${y}" fill="#e07a1f" stroke="#8a4a0f" stroke-width="1"/>`;
 });
 return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}


// ---- Brücke zum bestehenden Modul ------------------------------------------
// js/12-rinne-halbrund.js rechnet mit seinen eigenen Variablen und liest zwei
// seiner alten Formularfelder. Beides wird hier aus dem erfassten Verlauf
// gesetzt – dadurch bleibt js/12 unverändert, und der Speicher-Code in
// js/16 liefert weiterhin genau dieselben Felder wie bisher.
function raBruecke(){
 raSynchronisiere(rinneA);
 // Der Stutzen reist als zusätzliches Feld mit: js/12 liest ihn nicht, aber
 // js/16 speichert rinneSegments als data.segments - ohne ihn ginge beim
 // Speichern verloren, welcher Übergang ein Stutzen war.
 rinneSegments=raRechenSegmente(rinneA).map((s,i)=>{
  const q=(rinneA.segmente||[])[i];
  return (q&&q.stutzen)?{...s,stutzen:q.stutzen}:s;
 });
 rinneDilas=raDilas(rinneA).dilas.map(d=>({posAbStart:d.posAbStart}));
 const m=$("rinne_material"); if(m)m.value=String(rinneA.material||"");
 const ab=$("rinne_abwicklung"); if(ab)ab.value=String(rinneA.groesse||"330");
}

// ---- Oberfläche ------------------------------------------------------------
function raFeld(label,inhalt,voll){
 return `<div${voll?' class="wide"':""}><label>${esc(label)}</label>${inhalt}</div>`;
}
function raKarte(titel,inhalt){
 return `<div class="ra-block"><h2 style="margin-top:14px">${esc(titel)}</h2>${inhalt}</div>`;
}

function raGrunddatenHtml(){
 const a=rinneA;
 const matOpt=measurementMaterials.map(m=>
  `<option value="${m.id}"${String(m.id)===String(a.material)?" selected":""}>${esc(m.name)}</option>`).join("");
 const rgOpt=RA_GROESSEN.map(g=>
  `<option value="${esc(g.wert)}"${g.wert===a.groesse?" selected":""}>${esc(g.text)}</option>`).join("");
 const L=raGesamtlaenge(a);
 const fehlt=raFehlendeTypen();
 return `<div class="grid">
${raFeld("Material",`<select id="ra_material">${matOpt}</select>`)}
${raFeld("Rinnengrösse",`<select id="ra_groesse">${rgOpt}</select>`)}
${raFeld("Gesamtlänge gemessen (mm, optional)",
  `<input id="ra_gesamt" type="number" inputmode="numeric" step="1" value="${a.gesamtlaengeManuell_mm??""}" placeholder="nur zur Kontrolle">`)}
${raFeld("Aus den Abschnitten",`<div class="ra-wert">${L>0?esc(raMm(L))+" mm":"–"}</div>`)}
</div>
${fehlt.length?`<div class="info ra-warn"><b>Anschlusstypen fehlen im Katalog:</b> ${esc(fehlt.join(", "))}.
Ohne sie werden Fixpunkte und Zuschlagsmasse an diesen Stellen nicht mitgerechnet.
Sie lassen sich in <b>Einstellungen → Massaufnahmen → Rinne</b> anlegen.</div>`:""}`;
}

function raVerlaufHtml(){
 const a=rinneA;
 const dOpt=w=>RA_DURCHMESSER.map(d=>`<option value="${esc(d)}"${d===w?" selected":""}>${esc(d)}</option>`).join("");
 const fOpt=w=>RA_FALLROHR.map(f=>`<option value="${esc(f)}"${f===w?" selected":""}>${esc(f)}</option>`).join("");
 const zeilen=[];
 (a.segmente||[]).forEach((seg,i)=>{
  zeilen.push(`<div class="ra-zeile">
<div class="ra-zeile-kopf"><b>Abschnitt ${i+1}</b>
${a.segmente.length>1?`<button type="button" class="red ra-weg" data-ra-seg-del="${i}">✕</button>`:""}</div>
<div class="grid">
${raFeld("Länge (mm)",`<input data-ra-seg-laenge="${i}" type="number" inputmode="numeric" step="1" value="${seg.laenge||''}" placeholder="0">`)}
</div></div>`);
  if(i>=a.segmente.length-1)return;
  const art=raUebergangArt(seg), st=seg.stutzen||{};
  const istStutzen=art==="einhaenge"||art==="schiebe";
  const istEcke=art==="aussen"||art==="innen";
  const w=Math.abs(raZahl(seg.winkel))||90;
  zeilen.push(`<div class="ra-zeile ra-ueb${art==="gerade"?" ra-ueb-aus":""}${istStutzen?" ra-ueb-stutzen":""}">
<div class="ra-zeile-kopf"><b>Übergang ${i+1} → ${i+2}</b>
<span class="ra-klein">${esc(raMm(seg.laenge))} mm ab Abschnitt ${i+1}</span></div>
<div class="grid">
${raFeld("Was sitzt hier?",`<select data-ra-ueb-art="${i}">`
  +RA_UEBERGAENGE.map(u=>`<option value="${u.wert}"${u.wert===art?" selected":""}>${esc(u.text)}</option>`).join("")
  +`</select>`,true)}
${istEcke?raFeld("Winkel (°)",`<input data-ra-ueb-winkel="${i}" type="number" inputmode="numeric" step="1" value="${w}">`):""}
${istStutzen?raFeld("Ablaufrohr",`<select data-ra-ueb-d="${i}">${dOpt(st.durchmesser||RA_DURCHMESSER[2])}</select>`):""}
${istStutzen?raFeld("Anzahl",`<input data-ra-ueb-anz="${i}" type="number" inputmode="numeric" step="1" value="${st.anzahl??1}">`):""}
${istStutzen?raFeld("Fallrohr",`<select data-ra-ueb-f="${i}">${fOpt(st.fallrohr||RA_FALLROHR[0])}</select>`):""}
${istStutzen?raFeld("Bemerkung",`<input data-ra-ueb-bem="${i}" value="${esc(st.bemerkung||"")}" placeholder="optional">`,true):""}
</div>
${istEcke&&w!==90?`<div class="info">Der Katalog kennt nur den 90°-Winkel als Formteil. Zuschnitt und Fixpunkt werden deshalb mit den Werten des 90°-Winkels gerechnet.</div>`:""}
${istStutzen?`<div class="ra-klein">${art==="einhaenge"
  ?"Fixpunkt – teilt die Berechnung der Dehnungselemente."
  :"Kein Fixpunkt. Wirkt wie ein Dehnungselement: er nimmt die Ausdehnung hier selbst auf."}</div>`:""}
</div>`);
 });
 const L=raGesamtlaenge(a);
 return `<div class="info">Erfasst wird, wie abgeschritten: Abschnitt, Übergang, Abschnitt. Ein Übergang ist
entweder eine Ecke oder ein Stutzen – und damit ab dem Abschnitt davor vermasst, nicht ab START.</div>
<div id="ra_zeilen">${zeilen.join("")}</div>
<div class="bar">
<button type="button" class="gray" id="ra_addSeg">＋ Rinnenabschnitt</button>
<button type="button" class="gray" id="ra_addEcke">＋ Ecke</button>
<button type="button" class="gray" id="ra_addEin">＋ Einhängestutzen</button>
<button type="button" class="gray" id="ra_addSch">＋ Schiebestutzen</button>
</div>
<div class="small" id="ra_summeL">Berechnete Gesamtlänge: <b>${L>0?esc(raMm(L))+" mm":"–"}</b>${L>0?` &nbsp;(${esc(raMeter(L))} m)`:""}</div>
<div class="eb-diagram-box" id="ra_band">${raBandSvg(a)}</div>
<div class="ra-legende">▲ Ecke (Fixpunkt) &nbsp;·&nbsp; ● E = Einhängestutzen (Fixpunkt) &nbsp;·&nbsp;
■ S = Schiebestutzen (kein Fixpunkt, gilt als Dehnungselement) &nbsp;·&nbsp;
<b>◆ berechnetes Dehnungselement</b><br>
Im Grundriss: ABL = Einhängestutzen &nbsp;·&nbsp; SS = Schiebestutzen &nbsp;·&nbsp; AE90/IE90 = Aussen-/Innenwinkel</div>
<div class="eb-diagram-box" id="ra_grundriss">${(()=>{const d=raDilas(a);
 return generateRinneGrundriss(d.segmente,d.dilas,d.boundaries||[])})()}</div>`;
}

function raKomponentenHtml(){
 const a=rinneA, L=raGesamtlaenge(a), vorschlag=raHalterVorschlag(a);
 return `<div class="grid">
${raFeld("Halterabstand (mm)",`<input id="ra_halterAbstand" type="number" inputmode="numeric" step="10" value="${a.halter.abstand_mm||""}">`)}
${raFeld("Anzahl Halter",`<input id="ra_halterAnzahl" type="number" inputmode="numeric" step="1" value="${a.halter.anzahl??""}" placeholder="${vorschlag??""}">`)}
${raFeld("Haltertyp (optional)",`<input id="ra_halterTyp" value="${esc(a.halter.typ||"")}" placeholder="z. B. Aufschraubhalter">`,true)}
</div>
${vorschlag?`<div class="info">Vorschlag aus ${esc(raMeter(L))} m und ${esc(raMm(a.halter.abstand_mm))} mm Abstand: <b>${vorschlag} Stk.</b>${a.halter.anzahl?"":" – gilt, solange keine eigene Anzahl eingetragen ist."}
<button type="button" class="gray" id="ra_halterUebernehmen" style="margin-left:6px">Vorschlag übernehmen</button></div>`:""}`;
}

// Rinnenboden und Dehnung stehen bewusst in einem eigenen Block: die
// Dehnungselemente sollen nicht in einer Feldreihe untergehen, sondern dort
// sichtbar sein, wo sie entstehen.
function raDehnungHtml(){
 const a=rinneA, dila=raDilas(a);
 return `<div class="grid">
${raFeld("Rinnenboden links",`<label class="ra-schalter"><input type="checkbox" id="ra_bodenLinks"${a.rinnenboden.links?" checked":""}> vorhanden</label>`)}
${raFeld("Rinnenboden rechts",`<label class="ra-schalter"><input type="checkbox" id="ra_bodenRechts"${a.rinnenboden.rechts?" checked":""}> vorhanden</label>`)}
${raFeld("Dehnung",`<select id="ra_dehnungArt">
<option value="keine"${a.dehnung.art==="keine"?" selected":""}>Keine</option>
<option value="dehnungsstueck"${a.dehnung.art==="dehnungsstueck"?" selected":""}>Dehnungsstück</option></select>`)}
${a.dehnung.art==="dehnungsstueck"?raFeld("Anzahl Dehnungsstücke",
  `<input id="ra_dehnungAnzahl" type="number" inputmode="numeric" step="1" value="${a.dehnung.anzahl||''}" placeholder="0">`):""}
</div>
<div class="ra-dehnung">
${dila.dilas.length
 ?`<div class="ra-dehnung-zahl"><span>${dila.automatisch?"Berechnet":"Von Hand festgelegt"}</span><b>${dila.dilas.length}</b> Dehnungselement(e) für ${esc(raMaterialText(a))}</div>
<ul class="ra-dehnung-liste">${dila.dilas.map((d,i)=>
  `<li>Dehnungselement ${i+1} bei <b>${esc(raMm(Math.round(raZahl(d.posAbStart))))} mm</b> ab START</li>`).join("")}</ul>`
 :`<div class="ra-dehnung-zahl"><span>${dila.automatisch?"Berechnet":"Von Hand festgelegt"}</span><b>0</b> ${dila.automatisch
   ?`– für ${esc(raMaterialText(a))} ist bei diesem Verlauf kein zusätzliches Dehnungselement nötig.`
   :"– von Hand auf kein Dehnungselement gesetzt."}</div>`}
<div class="bar">
${dila.dilas.length?`<button type="button" class="gray" id="ra_dehnungUebernehmen">Als Dehnungsstücke übernehmen</button>`:""}
<button type="button" class="gray" data-ra-zu="6">Positionen anpassen (6 · Zuschnitt)</button>
</div>
<div class="ra-klein">${dila.automatisch
 ? "Gerechnet nach dem bestehenden Modul (Material, Fixpunkte, Schiebestutzen). Die Abstände lassen sich in <b>6 · Zuschnitt</b> von Hand überschreiben."
 : "<b>Von Hand angepasst</b> – es wird nicht mehr neu gerechnet, auch nicht bei geänderter Länge oder anderem Material."}</div>
</div>
<div class="ra-klein">Rinnenboden links und rechts beziehen sich auf START und ENDE des Verlaufs,
nicht auf die Bildschirmdarstellung. Im Ausmass erscheinen sie als getrennte Positionen.</div>`;
}

// Stutzen werden im Verlauf erfasst; hier steht nur, wie viele es sind.
function raStutzenHtml(){
 const a=rinneA, v=raVerlauf(a);
 const nEin=v.filter(e=>e.art==="einhaenge").length;
 const nSch=v.filter(e=>e.art==="schiebe").length;
 return `<div class="ra-klein">Einhänge- und Schiebestutzen werden in <b>2 · Rinnenverlauf</b> eingefügt –
wie eine Ecke, an der Stelle, an der sie sitzen.</div>
<div class="ra-dehnung-zahl"><span>Einhängestutzen (Fixpunkt)</span><b>${nEin}</b></div>
<div class="ra-dehnung-zahl"><span>Schiebestutzen (Dehnungselement)</span><b>${nSch}</b></div>
<div class="bar"><button type="button" class="gray" data-ra-zu="2">↩︎ Zum Rinnenverlauf</button></div>`;
}

function raKontrolleHtml(){
 const a=rinneA, p=raPruefungen(a);
 const verlauf=[];
 raVerlauf(a).forEach(e=>{
  if(e.art==="abschnitt"){verlauf.push(`<li>Abschnitt ${e.nr}: ${esc(raMm(e.laenge))} mm</li>`);return}
  if(e.art==="ecke"){
   verlauf.push(`<li>${e.ecke==="aussen"?"Aussenwinkel":"Innenwinkel"} ${e.winkel}° → <b>Fixpunkt</b></li>`);return;
  }
  const name=e.art==="einhaenge"?"Einhängestutzen":"Schiebestutzen";
  verlauf.push(`<li>${esc(name)} ${esc(e.durchmesser)}${e.anzahl>1?` (${e.anzahl}×)`:""} → `
   +`<b>${e.art==="einhaenge"?"Fixpunkt":"Dehnungselement"}</b>${e.art==="einhaenge"?"":" (kein Fixpunkt)"}</li>`);
 });
 return `${p.length?`<div class="ra-pruefung">`+p.map(m=>
   `<div class="${m.art==="fehler"?"ra-fehler":"ra-warnung"}">${m.art==="fehler"?"⛔":"⚠️"} ${esc(m.text)}</div>`).join("")+`</div>`
  :`<div class="ra-ok">✓ Keine Auffälligkeiten gefunden.</div>`}
<ul class="ra-liste">${verlauf.join("")||"<li>–</li>"}</ul>`;
}

function raAusmassHtml(){
 const a=rinneA;
 const zeilen=raAusmassZeilen(a), mat=raMaterialUebersicht(a);
 return `<div class="info">Automatisch aus der Massaufnahme. Nichts davon wird ein zweites Mal eingegeben –
wird die Aufnahme geändert, ändert sich das Ausmass mit.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Herkunft</th></tr></thead>
<tbody>${zeilen.map(z=>`<tr><td>${z.pos}</td><td>${esc(z.bezeichnung)}</td><td>${esc(z.menge)}</td><td>${esc(z.einheit)}</td><td>${esc(z.herkunft)}</td></tr>`).join("")
 ||'<tr><td colspan="5">Noch nichts zu berechnen.</td></tr>'}</tbody></table></div>
<h2 style="margin-top:14px">Materialübersicht</h2>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Bezeichnung</th><th>Menge</th><th>Einheit</th><th>Material</th></tr></thead>
<tbody>${mat.map(m=>`<tr><td>${esc(m.bezeichnung)}</td><td>${esc(m.menge)}</td><td>${esc(m.einheit)}</td><td>${esc(m.material)}</td></tr>`).join("")
 ||'<tr><td colspan="4">Noch nichts zu berechnen.</td></tr>'}</tbody></table></div>
<div class="small" style="color:var(--muted);margin-top:6px">Artikelnummern und Preise stehen hier bewusst nicht –
sie kommen aus der Materialliste der Firma.</div>`;
}

// Zuschnitt. Die Dila-Zeilen sind editierbar: der Abstand zum Punkt davor
// lässt sich überschreiben, die Zeile lässt sich löschen.
function raZuschnittHtml(){
 const a=rinneA, d=raDilas(a);
 const st=berechneRinneStueckliste(d.segmente,d.dilas,d.boundaries||[],rinneDilaMass);
 const zeilen=st.map(s=>{
  const edit=s.dilaIndex!==null&&s.dilaIndex!==undefined;
  return `<tr${edit?' class="ra-dila-zeile"':""}>`
   +`<td>${s.nr}</td><td>${esc(s.von)} → ${esc(s.bis)}</td>`
   +`<td>${edit?`<input class="ra-dila-feld" type="number" inputmode="numeric" step="1" `
       +`data-ra-dila-abstand="${s.dilaIndex}" data-ra-dila-prev="${Math.round(s.prevPos)}" `
       +`value="${Math.round(s.abstand)}">`:esc(raMm(s.abstand))}</td>`
   +`<td><b>${esc(raMm(s.zuschnitt))}</b></td>`
   +`<td>${edit?`<button type="button" class="red ra-weg" data-ra-dila-del="${s.dilaIndex}" title="Dehnungselement löschen">✕</button>`:""}</td></tr>`;
 }).join("");
 return `<div class="info">Rechnet unverändert die Funktion der laufenden App. Die Zuschnittmasse je Element stehen in
<b>Einstellungen → Massaufnahmen → Rinne</b>.</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Nr.</th><th>Von → Bis</th><th>Abstand (mm)</th><th>Zuschnitt (mm)</th><th></th></tr></thead>
<tbody>${zeilen||'<tr><td colspan="5">Noch nichts zu berechnen.</td></tr>'}</tbody></table></div>
<div class="small" style="color:var(--muted);margin-top:6px">${d.automatisch
 ? "Die Dehnungselemente sind gerechnet. Der Abstand jeder Dila-Zeile lässt sich von Hand überschreiben."
 : "<b>Von Hand angepasst.</b> Die Dehnungselemente werden nicht mehr neu gerechnet, auch nicht bei geänderter Länge oder anderem Material."}</div>
<div class="bar">
<button type="button" class="gray" id="ra_dilaPlus">＋ Dehnungselement von Hand</button>
<button type="button" class="gray" id="ra_dilaAuto"${d.automatisch?" disabled":""}>↻ Zurück zur Berechnung</button>
</div>`;
}

// Materialbedarf: welche Normlängen, wie viele, und was übrig bleibt.
function raNormHtml(){
 const a=rinneA, normen=raNormlaengenFuer(a);
 if(normen===null||!normen.length)
  return `<div class="info ra-warn">Für <b>${esc(raMaterialText(a))} ${esc(raGroesseText(a))}</b> ist keine
Normlänge hinterlegt. Der Materialbedarf wird deshalb <b>nicht</b> gerechnet – er würde sonst auf einer
geratenen Stangenlänge beruhen. Einzutragen unter <b>Einstellungen → Massaufnahmen → Rinne</b>.</div>`;
 const r=raNormErgebnis(a);
 if(!r.stangen.length&&!r.zuLang.length)
  return `<div class="info">Noch nichts zuzuschneiden.</div>`;
 const nachLaenge={};
 r.stangen.forEach(s=>{nachLaenge[s.laenge]=(nachLaenge[s.laenge]||0)+1});
 const bedarf=Object.keys(nachLaenge).map(Number).sort((x,y)=>y-x)
  .map(l=>`${nachLaenge[l]} × ${raMeter(l)} m`).join(" · ");
 const anteil=r.gesamt>0?(r.verschnitt/r.gesamt*100):0;
 return `<div class="info">Aus welchen Normlängen die Stücke geschnitten werden, so dass möglichst wenig übrig bleibt.
Mehrere Stücke dürfen aus derselben Stange kommen. Verfügbar für ${esc(raMaterialText(a))} ${esc(raGroesseText(a))}:
<b>${normen.map(n=>raMeter(n)+" m").join(" · ")}</b>.</div>
<div class="grid">
${raFeld("Bedarf",`<div class="ra-wert">${esc(bedarf)}</div>`)}
${raFeld("Verschnitt",`<div class="ra-wert">${esc(raMm(r.verschnitt))} mm (${anteil.toFixed(1).replace(".",",")} %)</div>`)}
</div>
<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Stange</th><th>Normlänge</th><th>Zuschnitte (mm)</th><th>Rest (mm)</th></tr></thead>
<tbody>${r.stangen.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(raMeter(s.laenge))} m</td>`
 +`<td>${s.stuecke.map(x=>esc(raMm(x))).join(" + ")||"–"}</td>`
 +`<td${s.rest>0?' class="ra-rest"':""}>${esc(raMm(s.rest))}</td></tr>`).join("")}</tbody></table></div>
<div class="small" style="color:var(--muted);margin-top:6px">${r.optimal
 ? `Kombination mit dem geringsten Materialeinsatz – ${esc(raMm(r.gesamt))} mm Normlänge für ${esc(raMm(r.summeStuecke))} mm Zuschnitt.`
 : "Beste gefundene Kombination. Bei dieser Stückzahl wurde nicht jede Möglichkeit durchgerechnet."}</div>
${r.zuLang.length?`<div class="info ra-warn"><b>Achtung:</b> ${r.zuLang.length} Zuschnitt(e)
(${r.zuLang.map(x=>esc(raMm(x))).join(", ")} mm) sind länger als die längste Normlänge
(${esc(raMeter(Math.max.apply(null,normen)))} m) und lassen sich nicht aus einer Stange schneiden.
Im Plan oben sind sie <b>nicht</b> enthalten.</div>`:""}`;
}

// ---- Register: durch die Massaufnahme führen ------------------------------
// Sechs Register wie in der Testapp. Immer nur eines ist sichtbar; die Daten
// liegen ausschliesslich im Modell rinneA, nicht im Formular - ein Register
// zu wechseln kann deshalb nichts verlieren.
const RA_REGISTER=[
 {nr:1,titel:"Grunddaten",     kurz:"Grunddaten"},
 {nr:2,titel:"Rinnenverlauf",  kurz:"Verlauf"},
 {nr:3,titel:"Komponenten",    kurz:"Komponenten"},
 {nr:4,titel:"Kontrolle",      kurz:"Kontrolle"},
 {nr:5,titel:"Ausmass",        kurz:"Ausmass"},
 {nr:6,titel:"Zuschnitt",      kurz:"Zuschnitt"}
];
let raSchritt=1;
// Das letzte Register ist nicht das Ende der Massaufnahme: darunter stehen
// noch Fotos/Skizzen, Notiz und der Speichern-Knopf der App. "Fertig" fuehrt
// dorthin - es speichert NICHT selbst, damit es nur einen Speicherweg gibt.
function raAbschluss(){
 const ziel=$("measMedienBereich")||$("measNote")||$("saveMeasurement");
 if(!ziel)return;
 if(ziel.scrollIntoView)ziel.scrollIntoView({block:"start",behavior:"smooth"});
 ziel.classList.add("ra-ziel");
 setTimeout(()=>ziel.classList.remove("ra-ziel"),2500);
}
function raSetzeSchritt(n){
 raSchritt=Math.max(1,Math.min(RA_REGISTER.length,Number(n)||1));
 renderRinneAufnahme();
 const kopf=$("ra_register");
 if(kopf&&kopf.scrollIntoView)kopf.scrollIntoView({block:"nearest"});
}
function raRegisterHtml(){
 // Die Kontrolle bekommt einen Punkt, sobald es dort etwas zu sehen gibt -
 // sonst müsste man das Register aufsuchen, um zu merken, dass etwas fehlt.
 const p=raPruefungen(rinneA);
 const fehler=p.filter(m=>m.art==="fehler").length;
 const warn=p.length-fehler;
 return `<div class="ra-register" id="ra_register">`+RA_REGISTER.map(r=>{
  const marke=r.nr===4&&(fehler||warn)
   ? `<span class="ra-register-punkt${fehler?" fehler":""}" title="${fehler?fehler+" Hinweis(e) zu beheben":warn+" Hinweis(e)"}"></span>`:"";
  return `<button type="button" class="ra-register-knopf${r.nr===raSchritt?" aktiv":""}" data-ra-schritt="${r.nr}">`
   +`<span class="ra-register-nr">${r.nr}</span><span class="ra-register-text">${esc(r.kurz)}</span>${marke}</button>`;
 }).join("")+`</div>`;
}
function raSchrittInhalt(){
 if(raSchritt===1)return raKarte("1 · Grunddaten",raGrunddatenHtml());
 if(raSchritt===2)return raKarte("2 · Rinnenverlauf",raVerlaufHtml());
 if(raSchritt===3)return raKarte("3 · Rinnenhalter",raKomponentenHtml())
      +raKarte("Rinnenboden und Dehnung",raDehnungHtml())
      +raKarte("Stutzen",raStutzenHtml());
 if(raSchritt===4)return raKarte("4 · Kontrolle",raKontrolleHtml());
 if(raSchritt===5)return raKarte("5 · Ausmass und Material",raAusmassHtml());
 return raKarte("6 · Zuschnitt",raZuschnittHtml())
      +raKarte("Normlängen und Verschnitt",raNormHtml());
}
function renderRinneAufnahme(){
 const ziel=$("rinneAufnahme");
 if(!ziel)return;
 // Hier verdrahten, nicht nur beim Zuruecksetzen/Fuellen: showMeasTypeSection()
 // zeichnet das Formular auch, ohne vorher eines von beiden aufzurufen -
 // ohne diese Zeile waere es dann sichtbar, aber tot. raVerdrahten() merkt
 // sich, dass es schon lief, und kostet deshalb nichts.
 raVerdrahten();
 raBruecke();
 const r=RA_REGISTER[raSchritt-1]||RA_REGISTER[0];
 ziel.innerHTML=raRegisterHtml()+raSchrittInhalt()
  +`<div class="bar ra-blaettern">
<button type="button" class="gray" id="ra_zurueck"${raSchritt<=1?" disabled":""}>‹ Zurück</button>
<button type="button" class="gray" id="ra_weiter">${
 raSchritt>=RA_REGISTER.length?"Fertig › Fotos und Speichern":"Weiter › "+esc(RA_REGISTER[raSchritt].kurz)}</button>
</div>`;
 // Die Registerleiste scrollt auf schmalen Geräten seitwärts. Das aktive
 // Register muss darin sichtbar sein - sonst weiss man nicht, wo man ist.
 const strip=$("ra_register"), aktiv=strip&&strip.querySelector(".ra-register-knopf.aktiv");
 if(strip&&aktiv){
  // Ueber die tatsaechlichen Rechtecke, nicht ueber offsetLeft: das bezieht
  // sich auf den offsetParent, und der ist nicht die Leiste.
  const sr=strip.getBoundingClientRect(), ar=aktiv.getBoundingClientRect();
  if(ar.left<sr.left)strip.scrollLeft-=(sr.left-ar.left)+12;
  else if(ar.right>sr.right)strip.scrollLeft+=(ar.right-sr.right)+12;
 }
}
// Nach einer Zifferneingabe wird NICHT alles neu gezeichnet – sonst verliert
// das Feld nach dem ersten Zeichen den Fokus. Aktualisiert werden nur die
// abgeleiteten Anzeigen.
function raLive(){
 raBruecke();
 const L=raGesamtlaenge(rinneA);
 const s=$("ra_summeL");
 if(s)s.innerHTML=`Berechnete Gesamtlänge: <b>${L>0?esc(raMm(L))+" mm":"–"}</b>${L>0?` &nbsp;(${esc(raMeter(L))} m)`:""}`;
 const band=$("ra_band"); if(band)band.innerHTML=raBandSvg(rinneA);
 const gr=$("ra_grundriss");
 if(gr){const d=raDilas(rinneA);gr.innerHTML=generateRinneGrundriss(d.segmente,d.dilas,d.boundaries||[]);}
}

// ---- Bedienung -------------------------------------------------------------
// Eine einzige Stelle für alle Ereignisse innerhalb von #measTypeRinne.
// Tippen (input) ändert nur das Modell und die abgeleiteten Anzeigen,
// Auswählen (change) und Klicken zeichnen neu.
function raNeuesSegment(){return {laenge:0,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}}
function raAnhaengen(art){
 const a=rinneA, segs=a.segmente;
 const letzte=segs[segs.length-1];
 if(art==="aussen")letzte.winkel=-90;
 else if(art==="innen")letzte.winkel=90;
 else if(art==="einhaenge"||art==="schiebe"){
  letzte.winkel=0;
  letzte.stutzen={art,durchmesser:RA_DURCHMESSER[2],anzahl:1,
                  fallrohr:RA_FALLROHR[0],bemerkung:""};
 }
 segs.push(raNeuesSegment());
 renderRinneAufnahme();
}
function raVerdrahten(){
 const wurzel=$("measTypeRinne");
 if(!wurzel||wurzel.dataset.raVerdrahtet)return;
 wurzel.dataset.raVerdrahtet="1";

 wurzel.addEventListener("input",e=>{
  const t=e.target, d=t.dataset||{}, a=rinneA;
  let live=false;
  if(t.id==="ra_gesamt")a.gesamtlaengeManuell_mm=t.value===""?null:raZahl(t.value);
  else if(t.id==="ra_halterAbstand")a.halter.abstand_mm=raZahl(t.value);
  else if(t.id==="ra_halterAnzahl")a.halter.anzahl=t.value===""?null:raZahl(t.value);
  else if(t.id==="ra_halterTyp")a.halter.typ=t.value;
  else if(t.id==="ra_dehnungAnzahl")a.dehnung.anzahl=raZahl(t.value);
  else if(d.raSegLaenge!==undefined){a.segmente[Number(d.raSegLaenge)].laenge=raZahl(t.value);live=true;}
  else if(d.raUebWinkel!==undefined){
   const i=Number(d.raUebWinkel), alt=raZahl(a.segmente[i].winkel);
   a.segmente[i].winkel=(alt<0?-1:1)*Math.abs(raZahl(t.value));
   live=true;
  }
  else if(d.raUebAnz!==undefined){
   const i=Number(d.raUebAnz);
   if(a.segmente[i]&&a.segmente[i].stutzen)a.segmente[i].stutzen.anzahl=raZahl(t.value);
  }
  else if(d.raUebBem!==undefined){
   const i=Number(d.raUebBem);
   if(a.segmente[i]&&a.segmente[i].stutzen)a.segmente[i].stutzen.bemerkung=t.value;
  }
  else return;
  if(live)raLive();
 });

 wurzel.addEventListener("change",e=>{
  const t=e.target, d=t.dataset||{}, a=rinneA;
  // Dila-Abstand von Hand: der eingegebene Abstand gilt ab dem Punkt davor.
  if(d.raDilaAbstand!==undefined){
   const i=Number(d.raDilaAbstand), liste=raDilasVonHand(a);
   if(liste[i]){
    liste[i].posAbStart=Math.round((Number(d.raDilaPrev)||0)+raZahl(t.value));
    renderRinneAufnahme();
   }
   return;
  }
  if(t.id==="ra_material")a.material=t.value;
  else if(t.id==="ra_groesse")a.groesse=t.value;
  else if(t.id==="ra_bodenLinks")a.rinnenboden.links=t.checked;
  else if(t.id==="ra_bodenRechts")a.rinnenboden.rechts=t.checked;
  else if(t.id==="ra_dehnungArt"){a.dehnung.art=t.value;if(t.value==="keine")a.dehnung.anzahl=0;}
  else if(d.raUebArt!==undefined){
   const i=Number(d.raUebArt), seg=a.segmente[i];
   const art=t.value;
   if(art==="gerade"){seg.winkel=0;seg.stutzen=null;}
   else if(art==="aussen"){seg.stutzen=null;seg.winkel=-(Math.abs(raZahl(seg.winkel))||90);}
   else if(art==="innen"){seg.stutzen=null;seg.winkel=Math.abs(raZahl(seg.winkel))||90;}
   else{
    seg.winkel=0;
    const alt=seg.stutzen||{};
    seg.stutzen={art,durchmesser:alt.durchmesser||RA_DURCHMESSER[2],
                 anzahl:alt.anzahl||1,fallrohr:alt.fallrohr||RA_FALLROHR[0],
                 bemerkung:alt.bemerkung||""};
   }
  }
  else if(d.raUebD!==undefined){
   const i=Number(d.raUebD);
   if(a.segmente[i]&&a.segmente[i].stutzen)a.segmente[i].stutzen.durchmesser=t.value;
  }
  else if(d.raUebF!==undefined){
   const i=Number(d.raUebF);
   if(a.segmente[i]&&a.segmente[i].stutzen)a.segmente[i].stutzen.fallrohr=t.value;
  }
  else return;
  renderRinneAufnahme();
 });

 wurzel.addEventListener("click",e=>{
  const t=e.target.closest("button");
  if(!t)return;
  const d=t.dataset||{}, a=rinneA;
  if(d.raSchritt!==undefined){raSetzeSchritt(d.raSchritt);return}
  if(t.id==="ra_zurueck"){raSetzeSchritt(raSchritt-1);return}
  if(t.id==="ra_weiter"){
   if(raSchritt>=RA_REGISTER.length){raAbschluss();return}
   raSetzeSchritt(raSchritt+1);return;
  }
  if(t.id==="ra_addSeg"){a.segmente.push(raNeuesSegment());renderRinneAufnahme();return}
  if(t.id==="ra_addEcke"){raAnhaengen("aussen");return}
  if(t.id==="ra_addEin"){raAnhaengen("einhaenge");return}
  if(t.id==="ra_addSch"){raAnhaengen("schiebe");return}
  if(d.raSegDel!==undefined){
   if(a.segmente.length<=1)return;
   a.segmente.splice(Number(d.raSegDel),1);
   renderRinneAufnahme();return;
  }
  if(t.id==="ra_halterUebernehmen"){a.halter.anzahl=raHalterVorschlag(a);renderRinneAufnahme();return}
  // Die berechnete Anzahl als Dehnungsstuecke uebernehmen - dieselbe Zahl,
  // nur damit sie im Ausmass als Position erscheint. Gerechnet wird nichts neu.
  if(t.id==="ra_dehnungUebernehmen"){
   a.dehnung.art="dehnungsstueck";
   a.dehnung.anzahl=raDilas(a).dilas.length;
   renderRinneAufnahme();return;
  }
  // Sprung in ein anderes Register (z. B. von der Dehnung zum Zuschnitt).
  if(d.raZu!==undefined){raSetzeSchritt(d.raZu);return}
  if(t.id==="ra_dilaPlus"){
   const liste=raDilasVonHand(a);
   liste.push({posAbStart:Math.round(raGesamtlaenge(a)/2)});
   renderRinneAufnahme();return;
  }
  if(t.id==="ra_dilaAuto"){a.dilasManuell=null;renderRinneAufnahme();return}
  if(d.raDilaDel!==undefined){
   const liste=raDilasVonHand(a);
   liste.splice(Number(d.raDilaDel),1);
   renderRinneAufnahme();return;
  }
 });
}

// ---- Schnittstelle für js/10 und js/16 -------------------------------------
function rinneAufnahmeZuruecksetzen(){
 rinneA=raLeer();
 raSchritt=1;
 raVerdrahten();
 renderRinneAufnahme();
}
function rinneAufnahmeFuellen(d){
 rinneA=raAusData(d);
 raSchritt=1;
 raVerdrahten();
 renderRinneAufnahme();
}
// Die zusätzlichen Felder für measurements.data. Die bisherigen Felder
// (segments, dilas, boundaries, stueckliste, gesamtlaenge, material,
// rinneAbwicklung, dilaMass) schreibt js/16 unverändert weiter – dadurch
// öffnen und drucken ältere Datensätze genau wie bisher.
function rinneAufnahmeZusatzDaten(){
 raBruecke();
 const a=rinneA;
 const normen=raNormlaengenFuer(a);
 const plan=normen&&normen.length?raNormErgebnis(a):null;
 return {
  groesse:a.groesse,
  gesamtlaengeManuell_mm:a.gesamtlaengeManuell_mm,
  halter:{anzahl:a.halter.anzahl,abstand_mm:a.halter.abstand_mm,typ:a.halter.typ},
  rinnenboden:{links:!!a.rinnenboden.links,rechts:!!a.rinnenboden.rechts},
  dehnung:{art:a.dehnung.art,anzahl:a.dehnung.anzahl},
  dilasManuell:Array.isArray(a.dilasManuell)
   ? a.dilasManuell.map(x=>({posAbStart:Math.round(raZahl(x.posAbStart))})):null,
  ausmass:raAusmassZeilen(a),
  normlaengen:normen,
  normplan:plan?{stangen:plan.stangen,gesamt:plan.gesamt,verschnitt:plan.verschnitt,
                 summeStuecke:plan.summeStuecke,optimal:plan.optimal,zuLang:plan.zuLang}:null
 };
}

// ---- Einstellungen: Normlängen je Material und Grösse -----------------------
// Gezeigt werden nur Kombinationen, die überhaupt einen Sinn ergeben: jedes
// Material des Katalogs mal die vier Rinnengrössen. Ein leeres Feld heisst
// "nichts hinterlegt" – dann rechnet die Massaufnahme dort bewusst nichts.
function renderRinneNormSettings(){
 const ziel=$("rinneNormSettings");
 if(!ziel)return;
 const zeilen=(measurementMaterials||[]).map(m=>{
  const felder=RA_GROESSEN.map(g=>{
   const k=String(m.id)+"|"+g.wert;
   const eigen=(rinneNormlaengen&&rinneNormlaengen[k]);
   const wert=Array.isArray(eigen)?eigen:RA_NORM_VORGABE[k];
   const txt=Array.isArray(wert)?wert.map(v=>(Math.round(v)/1000)
     .toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})).join(", "):"";
   return `<div><label>${esc(g.text)}</label>`
    +`<input data-rinne-norm="${esc(k)}" inputmode="decimal" value="${esc(txt)}" placeholder="keine">`
    +`</div>`;
  }).join("");
  return `<div class="settingrow-mat" style="padding:8px">
<div style="font-weight:800;font-size:13px;margin-bottom:6px">${esc(m.name)}</div>
<div class="grid">${felder}</div></div>`;
 }).join("");
 ziel.innerHTML=zeilen||'<div class="small">Noch keine Materialien im Katalog.</div>';
}
// "4, 5, 6" -> [4000,5000,6000]. Nur echte, positive Zahlen; alles andere
// wird verworfen statt in eine 0-Stange zu münden.
function raNormEingabe(text){
 return Array.from(new Set(String(text||"").split(/[,;\s]+/)
  .map(x=>x.replace(",","."))
  .map(x=>Math.round(Number(x)*1000))
  .filter(v=>Number.isFinite(v)&&v>0))).sort((x,y)=>x-y);
}
function raNormAusFeldern(){
 const neu={};
 document.querySelectorAll("[data-rinne-norm]").forEach(el=>{
  const liste=raNormEingabe(el.value);
  if(liste.length)neu[el.dataset.rinneNorm]=liste;
 });
 return neu;
}
