"use strict";
// ============================================================================
// Zuschnitt-Optimierung - EINE Darstellung für alle Massaufnahme-Arten
// ============================================================================
// Rinne Halbrund, Einlaufblech gerade, Einlaufblech konisch, Freies Profil und
// Mauerabdeckung zeigen ihren Zuschnitt seit v2.80 mit derselben Funktion und
// damit im selben Aufbau:
//
//   1  Einleitungssatz (was geschnitten wird)
//   2  Kennzahlen - immer zuerst die STREIFENBREITE, also das Mass, auf das
//      der Streifen geschnitten werden muss
//   3  Fehler und Hinweise
//   4  Tabelle je Rollenbreite bzw. je Normlänge, beste Zeile hervorgehoben
//   5  Belegung: welches Stück liegt in welchem Streifen bzw. in welcher Stange
//   6  Fusszeile: woher die Breiten/Längen kommen
//
// Die Rechnung selbst bleibt in den einzelnen Modulen - hier wird nur
// dargestellt. Es gibt weiterhin nur EINE Packrechnung (ebaPackeInStreifen in
// js/29) und EINE Normlängen-Rechnung (raNormPlan in js/28).
//
// Der Plan wird von jedem Modul in dieselbe Form gebracht:
//
//   {art:"rolle"|"stange", einheit:"Stück"|"Segment",
//    einleitung, zusatz, leer, quelle,
//    streifenbreiten:[mm],            // "rolle": auf dieses Mass schneiden
//    gruppen:[{breite,rollenLaenge,streifen:[{stuecke:[{nr,laenge}],rest}]}],
//    moeglich:[{breite,jeTafel,streifen,rollenLaenge,flaeche,verschnitt,anteil}],
//    netto,                            // m² ("rolle")
//    stangen:[{laenge,stuecke:[{nr,laenge}],rest}], normen:[mm],
//    gesamt,summeStuecke,verschnitt,   // mm ("stange")
//    zuSchmal:[mm], zuLang:[{nr,laenge}], optimal}
// ============================================================================

// ---- Rolle oder Tafel (v3.33) ---------------------------------------------
// art ist seit v3.33 "rolle", "tafel" oder "stange". Rolle und Tafel sind
// geometrisch dasselbe (Streifen aus einer Flaeche) und laufen deshalb durch
// dieselbe Darstellung - nur die Woerter unterscheiden sich, und die stehen
// hier an EINER Stelle statt verstreut im Markup.
//
// Der Unterschied in der Sache: von der Rolle wird ein Abschnitt abgezogen,
// so lang wie das laengste Blech; eine Tafel hat eine feste Laenge, in die
// alles hineinpassen muss.
function zuFlach(p){return !!p&&p.art!=="stange"}
// Ein Plan traegt die Form unter ZWEI Namen: "art" (historisch, seit v2.85)
// und "form" (seit v3.33, so steht sie auch im gespeicherten Datensatz). Die
// Module setzen immer beide gleich - wer aber nur den gespeicherten Wert zur
// Hand hat (der PDF-Kopf in js/16), reicht {form:...} herein. Bis das hier
// beide las, druckte der Kopf bei Tafelmaterial "Rollenblech". Gemessen,
// nicht vermutet.
function zuIstTafel(p){return !!p&&(p.art==="tafel"||p.form==="tafel")}
// Die Woerter je Art. Ein "Abschnitt" von der Rolle ist bei der Tafel die
// Tafel selbst - deshalb heisst dieselbe Zahl einmal "3 × 2'070 mm ab Rolle"
// und einmal "3 Tafeln".
const ZU_WORT={
 rolle:{quelle:"Rolle",einheit:"Rollenbreite",abschnitt:"Abschnitt",abschnitte:"Abschnitte",
        ab:"ab Rolle",kopf:"Rollenblech",vergleich:"Rolle",str:"Str./Abschn."},
 tafel:{quelle:"Tafel",einheit:"Tafelformat",abschnitt:"Tafel",abschnitte:"Tafeln",
        ab:"aus Tafeln",kopf:"Tafel",vergleich:"Tafel",str:"Str./Tafel"}
};
function zuWort(p){return ZU_WORT[zuIstTafel(p)?"tafel":"rolle"]}
// Das Format als Text: bei der Rolle nur die Breite, bei der Tafel L × B.
function zuFormatText(x,p){
 if(!x)return "–";
 if(Array.isArray(x.mischung)&&x.mischung.length)return x.mischung.map(m=>zuMm(m.breite)).join(" + ")+" mm";   // v3.328: gemischte Rollen
 const b=zuZahl(x.breite);
 if(b<=0)return "–";
 const l=zuZahl(x.laenge);
 // Normales Leerzeichen wie in der Kopfzeile bis v3.32 - der Rollenfall soll
 // sich Zeichen fuer Zeichen gleich lesen und gleich drucken.
 return (zuIstTafel(p)&&l>0)?(zuMm(l)+" × "+zuMm(b)+" mm"):(zuMm(b)+" mm");
}

const zuZahl=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const zuMm=v=>Math.round(zuZahl(v)).toLocaleString("de-CH");
const zuMeter=v=>(zuZahl(v)/1000).toFixed(2).replace(".",",");
const zuQm=v=>zuZahl(v).toFixed(2).replace(".",",");

// Ein Zuschnittstueck wird ueberall gleich geschrieben: Laenge x Breite,
// z. B. "2'070 mm × 250 mm". Die Breite ist die Streifenbreite bzw. die
// Abwicklung - ohne bekannte Breite steht nur die Laenge, es wird keine
// erfunden.
function zuMasse(laenge,breite){
 const b=zuZahl(breite);
 return zuMm(laenge)+"\u00a0mm"+(b>0?" × "+zuMm(b)+"\u00a0mm":"");
}
// ---------------------------------------------------------------------------
// Die Geometrie eines Plans - EINE Stelle (v3.26)
// ---------------------------------------------------------------------------
// Sowohl die Materialbilanz (unten) als auch die Restermittlung (js/42) müssen
// von denselben Zahlen ausgehen, sonst geht die Bilanz nicht auf. Deshalb
// steht die Ableitung genau hier und nirgends sonst.
//
// Alles wird aus dem PLAN selbst gelesen, nicht aus der heutigen Einstellung:
// ein gespeicherter Plan wurde mit der Schnittfuge seiner Zeit gerechnet, und
// die Bilanz muss zu dem Plan passen, den sie beschreibt.
//
// Je Gruppe (= je Streifenbreite):
//   B   Rollenbreite der besten Rolle
//   A   Streifenbreite (Abwicklung)
//   L   Abschnittlänge (= längstes Stück der Gruppe)
//   n   Streifen je Abschnitt        ab  Abschnitte
//   restBreite  seitlicher Rand      fugeQuer  B − n·A − restBreite
// v3.328: Rollen gemischt - das beste "Format" besteht aus Bloecken, je Block eine Rolle und ihre Streifenbreiten (Gruppen).
// Jeder Block wird wie ein eigener, normaler Plan behandelt (Geometrie, Abschnittsnummern, Bilanz) - es gibt keine zweite
// Rechnung. Ohne mischung im Plan (alle aelteren Plaene) liefert das null und nichts aendert sich.
function zuMischBloecke(p){
 const b=p&&(p.moeglich||[])[0];
 if(!b||!Array.isArray(b.mischung)||!b.mischung.length)return null;
 const raus=[];
 for(const m of b.mischung){
  const gr=(m.gruppen||[]).map(i=>(p.gruppen||[])[i]);
  if(!gr.length||gr.some(g=>!g))return null;   // unvollstaendiger Plan: lieber gar nicht mischen
  raus.push({m,sub:Object.assign({},p,{gruppen:gr,moeglich:[m.format]})});
 }
 return raus;
}
function zuGeometrie(p){
 if(!zuFlach(p))return [];
 const bl=zuMischBloecke(p);
 if(bl){
  const raus=[];
  bl.forEach(({m,sub})=>zuGeometrie(sub).forEach(g=>{g.index=m.gruppen[g.index];raus.push(g)}));
  return raus.sort((a,c)=>a.index-c.index);
 }
 const best=(p.moeglich||[])[0];
 if(!best)return [];
 const B=zuZahl(best.breite);
 if(B<=0)return [];
 const zeilen=Array.isArray(best.zeilen)?best.zeilen:null;
 const raus=[];
 (p.gruppen||[]).forEach((g,i)=>{
  const z=zeilen?(zeilen[i]||{}):best;
  const A=zuZahl(g.breite)||zuZahl(z.breite);
  const L=zuZahl(g.abschnittLaenge)||zuZahl(z.abschnittLaenge)||zuZahl(p.abschnittLaenge);
  const n=Math.round(zuZahl(g.jeAbschnitt)||zuZahl(z.jeAbschnitt)||zuZahl(z.jeTafel)||0);
  const streifen=g.streifen||[];
  let ab=Math.round(zuZahl(g.abschnitte)||zuZahl(z.abschnitte)||0);
  const rl=zuZahl(g.rollenLaenge)||zuZahl(z.rollenLaenge);
  if(!ab&&rl>0&&L>0)ab=Math.round(rl/L);
  // v3.87: eine Gruppe, die bei der Trittbrett-Mischung komplett anderswo
  // mitfaehrt, hat absichtlich 0 Abschnitte UND 0 Rollenlaenge - das ist kein
  // aelterer, unvollstaendiger Plan. Die Schaetzung unten (Streifenzahl durch
  // jeAbschnitt) gilt deshalb nur, wenn rollenLaenge NIRGENDS angegeben ist -
  // ist sie es (und sei es als 0), zaehlt genau das.
  const rlAngegeben=(g.rollenLaenge!==undefined&&g.rollenLaenge!==null)
    ||(z.rollenLaenge!==undefined&&z.rollenLaenge!==null);
  if(!ab&&!rlAngegeben&&n>0&&streifen.length)ab=Math.ceil(streifen.length/n);
  if(A<=0)return;
  // Der seitliche Rand steht im Plan, sobald er dort gespeichert wurde - er
  // gehört zu genau diesem Plan. Fehlt er (ältere Pläne), bleibt B − n·A;
  // dann ist fugeQuer 0, was für einen ohne Fugenabzug gerechneten Plan
  // richtig ist.
  const rb=(z.restBreite!==undefined&&z.restBreite!==null)
    ?Math.max(0,zuZahl(z.restBreite)):((n>0)?Math.max(0,B-n*A):0);
  // v3.87: liegt in diesem Abschnitt ein Gast einer anderen Abwicklungsbreite
  // (Trittbrett-Mischung, js/29 ebaMischeAbschnitte), belegt der einen Teil
  // von B-n*A produktiv - das ist kein Verschnitt dieser Gruppe mehr. Die
  // Laengsschnittfuge kommt deshalb ab jetzt direkt aus dem Plan
  // (js/29 rechnet sie exakt: die eigenen (n-1) Fugen plus eine je Gast), statt
  // sie unveraendert aus B-n*A-restBreite zurueckzurechnen - das wuerde bei
  // einem Gast dessen ganze Breite faelschlich mitzaehlen (seine Flaeche
  // steht schon unter seiner EIGENEN Gruppe im Netto). Fehlt querFuge (aeltere
  // Plaene, vor v3.87), bleibt die alte Rueckrechnung unveraendert gueltig -
  // sie war fuer den ungemischten Fall immer schon richtig.
  const qf=(z.querFuge!==undefined&&z.querFuge!==null)?Math.max(0,zuZahl(z.querFuge)):null;
  // v3.26: ein Eintrag entsteht auch dann, wenn Abschnittlänge oder
  // Streifenzahl fehlen (ältere gespeicherte Pläne). Was sich daraus NICHT
  // ableiten lässt, bleibt 0 und wird über "voll" ausgewiesen - die
  // Materialbilanz stellt sich dann gar nicht erst auf, statt zu schätzen.
  // Der seitliche Rand braucht diese Angaben nicht: er steht mit restBreite
  // und Rollenlänge im Plan und darf deshalb nicht mit verschwinden.
  // Bei jeAbschnitt===1 (n===1) zieht js/29 ebaFormatPlan jeden Streifen nur
  // so lang, wie er tatsaechlich braucht - "ab*L" (alle Abschnitte auf die
  // Laenge des laengsten Stuecks der Gruppe aufgerundet) waere dort zu lang.
  // Die schon richtig aufsummierte Rollenlaenge steht in diesem Fall bereits
  // im Plan (rl) und wird direkt uebernommen, statt neu (und falsch) aus
  // ab*L hergeleitet zu werden.
  // v3.83: dieselbe Falle bei mehreren Abschnittlaengen (teile) - dort ist L
  // nur die LAENGSTE vorkommende Laenge, "ab*L" wuerde JEDEN Abschnitt auf
  // die laengste Laenge aufrunden statt seine eigene zu zaehlen.
  const mehrereLaengen=(Array.isArray(g.teile)&&g.teile.length)||(Array.isArray(z.teile)&&z.teile.length);
  const RL=(n===1||mehrereLaengen)&&rl>0?rl:((ab>0&&L>0)?ab*L:(rl>0?rl:0));
  // v3.87: eine bei der Mischung komplett anderswo mitfahrende Gruppe hat
  // absichtlich abschnitte=0 und RL=0 - das ist vollstaendig bekannt, kein
  // aelterer Plan ohne Angabe. rlAngegeben (oben) unterscheidet genau das.
  const voll=L>0&&n>=1&&(rlAngegeben||(ab>=1&&RL>0));
  raus.push({B,A,L,jeAbschnitt:n,abschnitte:ab,rollenLaenge:RL,
   restBreite:rb,
   // v3.303: die Zahl steht im Plan (js/29 ungenutzteStreifen) - bei der Mischung 0, weil die freie Breite
   // schon in restBreite steckt. Aeltere Plaene tragen sie nicht oder rechnen so wie bisher.
   frei:(z.ungenutzteStreifen!==undefined&&z.ungenutzteStreifen!==null)
     ?Math.max(0,zuZahl(z.ungenutzteStreifen))
     :((n>0&&ab>0)?Math.max(0,n*ab-streifen.length):0),
   fugeQuer:qf!==null?qf:((n>0)?Math.max(0,B-n*A-rb):0),streifen,index:i,
   voll});
 });
 return raus;
}

// Was in EINEM Streifen an Schnittfuge steckt, aus dem Streifen selbst
// abgeleitet: Abschnittlänge − Summe der Stücke − freier Rest. Bei n Stücken
// sind das die n−1 Schnitte dazwischen (js/29, ebaVerteile). Fehlt der Rest
// (sehr alte Pläne), gilt Fuge 0 und der Rest ist, was übrig bleibt.
function zuStreifenRest(st,L){
 const summe=(st.stuecke||[]).reduce((a,x)=>a+zuZahl(x.laenge),0);
 if(st.rest===undefined||st.rest===null)
  return {summe,rest:Math.max(0,L-summe),fuge:0};
 const rest=Math.max(0,zuZahl(st.rest));
 return {summe,rest,fuge:Math.max(0,L-summe-rest)};
}
// Reeller Rest je Streifen - anders als zuStreifenRest() beruecksichtigt das
// hier auch jeAbschnitt. Bei genau einem Streifen je Abschnitt (Rolle/Tafel
// so schmal wie die Abwicklung) zieht js/29 ebaFormatPlan jeden Streifen nur
// so lang, wie er tatsaechlich braucht - der Rest bis zur Abschnittlaenge der
// GRUPPE (das laengste Stueck) ist dort KEIN Verschnitt, er wurde nie von der
// Rolle abgezogen. Nur die Schnittfuge INNERHALB des Streifens (zwischen
// mehreren zusammengelegten Stuecken) bleibt echter Verlust. Ab zwei
// Streifen je Abschnitt muessen dagegen alle Streifen eines Abschnitts
// gleich lang sein - der wird als EIN Stueck quer abgezogen, die bisherige
// Regel bleibt dort unveraendert.
// v3.87: ein Streifen, der bei der Trittbrett-Mischung (js/29,
// ebaMischeAbschnitte) als Gast in einem laengeren, fremden Abschnitt mitfaehrt,
// traegt "mischungsGast" - sein rest/abschnittLaenge ist dann schon die fertige,
// echte Aufteilung (die Laenge des Abschnitts, in dem er wirklich liegt, nicht
// die seiner eigenen Gruppe). Die jeAbschnitt=1-Sonderregel unten wuerde diesen
// Rest faelschlich komplett zur Schnittfuge erklaeren (sie geht davon aus, dass
// bei jeAbschnitt=1 NIE mehr als das Stueck selbst von der Rolle abgezogen
// wird - bei einem Gast stimmt das nicht mehr, er wird ja innerhalb des
// laengeren Wirt-Abschnitts mitgeschnitten). Ein Gast braucht deshalb immer die
// normale Rechnung: rest ist bereits der echte, verwertbare Rest.
function zuStreifenRestEcht(st,L,jeAbschnitt){
 if(st&&st.mischungsGast)return zuStreifenRest(st,L);
 if(Number(jeAbschnitt)===1)
  return zuStreifenRest(Object.assign({},st,{rest:0}),Math.max(0,zuZahl(L)-zuZahl(st&&st.rest)));
 return zuStreifenRest(st,L);
}

// ---------------------------------------------------------------------------
// Materialbilanz (v3.26)
// ---------------------------------------------------------------------------
// Ausgangsmaterial → Schnittfuge → Zuschnitte → Reststück. Die Zerlegung geht
// exakt auf, weil sie dieselbe Rechnung rückwärts liest, mit der der Plan
// entstanden ist:
//
//   quer  je Abschnitt:  n·A + (n−1)·Fuge + seitlicher Rand = B
//   längs je Streifen:   Σ Stücke + (n−1)·Fuge + freier Rest = L
//
//   Brutto = Zuschnitte + Schnittfuge + Reste
//   Reste  = freier Rest je Streifen + ungenutzte Streifenplätze + Rand
//   Reste  teilen sich in verwertbar (ab Mindestlänge) und zu klein
//   effektiv verloren = Schnittfuge + zu kleine Reste
//
// Die Reste selbst zählt restAlle() (js/42) - es gibt nur EINE Ermittlung,
// sonst könnten Bilanz und Lager auseinanderlaufen.
function zuBilanz(p){
 if(!p)return null;
 const reste=(typeof restAlle==="function")?restAlle(p):[];
 const flaeche=r=>zuZahl(r.laenge_mm)*zuZahl(r.breite_mm)*Math.max(1,zuZahl(r.anzahl)||1);
 const laenge=r=>zuZahl(r.laenge_mm)*Math.max(1,zuZahl(r.anzahl)||1);
 if(p.art==="stange"){
  // Eindimensional: die Rinne wird als fertiges Profil in Normlängen bezogen.
  const brutto=zuZahl(p.gesamt), netto=zuZahl(p.summeStuecke);
  if(brutto<=0)return null;
  const gut=reste.filter(r=>!r.zuKlein).reduce((a,r)=>a+laenge(r),0);
  const klein=reste.filter(r=>r.zuKlein).reduce((a,r)=>a+laenge(r),0);
  return {einheit:"mm",art:"stange",brutto,zuschnitte:netto,fuge:0,fugeBekannt:false,
   verwertbar:gut,zuKlein:klein,verlust:klein,reste,
   aufgeht:Math.abs(brutto-netto-gut-klein)<=1};
 }
 const geo=zuGeometrie(p);
 // Eine Bilanz nur, wenn JEDE Gruppe vollstaendig beschrieben ist. Fehlt einem
 // aelteren gespeicherten Plan die Abschnittlaenge oder die Streifenzahl,
 // wird nichts geschaetzt - die Reste selbst zeigt restAlle() trotzdem.
 if(!geo.length||geo.some(g=>!g.voll))return null;
 let brutto=0,netto=0,fuge=0;
 geo.forEach(g=>{
  brutto+=g.B*g.rollenLaenge;
  fuge+=g.fugeQuer*g.rollenLaenge;
  (g.streifen||[]).forEach(st=>{
   // v3.83: bei mehreren Abschnittlaengen (ebaPackeMehrereAbschnitte, js/29)
   // traegt jeder Streifen seine EIGENE Abschnittlaenge (st.abschnittLaenge) -
   // g.L ist dort nur die laengste vorkommende Laenge der Gruppe. Wuerde hier
   // trotzdem g.L verwendet, wuerde fuer Streifen aus kuerzeren Abschnitten
   // zu viel Schnittfuge (L−Summe−Rest) errechnet, die Bilanz ginge nicht auf.
   const stL=(st.abschnittLaenge!==undefined&&st.abschnittLaenge!==null)?zuZahl(st.abschnittLaenge):g.L;
   const w=zuStreifenRestEcht(st,stL,g.jeAbschnitt);
   netto+=w.summe*g.A;
   fuge+=w.fuge*g.A;
  });
 });
 const gut=reste.filter(r=>!r.zuKlein).reduce((a,r)=>a+flaeche(r),0);
 const klein=reste.filter(r=>r.zuKlein).reduce((a,r)=>a+flaeche(r),0);
 const diff=brutto-netto-fuge-gut-klein;
 // v3.27: was aus vorhandenen Reststuecken kommt, steht NEBEN der Bilanz -
 // es ist kein neues Material und darf die Rollenbilanz nicht verfaelschen.
 // Die Rollenzahlen oben beschreiben nur, was neu von der Rolle kommt.
 const ausR=(p.ausResten||[]).reduce((a,x)=>a
   +(x.stuecke||[]).reduce((b,st)=>b+zuZahl(st.laenge),0)*zuZahl(x.breite||0),0);
 return {einheit:"m²",art:zuIstTafel(p)?"tafel":"rolle",
  brutto:brutto/1e6,zuschnitte:netto/1e6,fuge:fuge/1e6,fugeBekannt:true,
  verwertbar:gut/1e6,zuKlein:klein/1e6,verlust:(fuge+klein)/1e6,reste,
  ausResten:ausR/1e6,ausRestenAnzahl:(p.ausResten||[]).length,
  // Toleranz 1 mm² - gerechnet wird exakt, das faengt nur Gleitkommareste.
  aufgeht:Math.abs(diff)<=1};
}

// ---------------------------------------------------------------------------
// Zuschnittliste: STÜCKZAHL × LÄNGE × ABWICKLUNG
// ---------------------------------------------------------------------------
// Die Hauptdarstellung in jeder Art. Gleiche Zuschnitte werden zusammengefasst
// und mit ihrer Stückzahl gezeigt - drei identische Einzelzeilen sind auf dem
// Handy unleserlich.
//
// Zusammengefasst wird NUR, was für den tatsächlichen Zuschnitt wirklich
// gleich ist: gleiche Länge, gleiche Abwicklung UND gleiches "merkmal". Das
// merkmal liefert das Modul selbst (Gehrung, konische Masse, …) - eine
// fachlich unterschiedliche Bearbeitung darf nie in einer Zeile verschwinden.
// Reine Beschriftungen ohne Einfluss auf den Zuschnitt (z. B. "Traufstück")
// stehen als "hinweis" in den Einzelheiten, nicht im Gruppenschlüssel.
// v3.29: der Herkunftsvermerk eines Stueckes, das aus einem Rest kommt.
// Er wird an "merkmal" gehaengt - und damit steht er automatisch ueberall,
// wo merkmal ohnehin schon steht: Zuschnittliste, Ausdruck, Ruestliste und
// Werkstatt. Weil merkmal zugleich im Gruppenschluessel steckt (seit v2.85
// macht eine Gehrung denselben Zuschnitt zu einem anderen), wird ein Stueck
// aus dem Rest auch nicht mehr mit einem gleich langen von der Rolle
// zusammengefasst.
function zuRestVermerk(laenge,breite,material){
 const l=zuZahl(laenge), b=zuZahl(breite);
 if(l<=0)return "";
 return "aus Rest "+zuMm(l)+(b>0?" × "+zuMm(b):"")+" mm"+(material?" ("+material+")":"");
}
function zuMerkmalMitRest(merkmal,vermerk){
 const m=merkmal||"";
 if(!vermerk)return m;
 if(m.indexOf("aus Rest")>=0)return m;   // nicht doppelt vermerken
 return m?m+" · "+vermerk:vermerk;
}
function zuAlleStuecke(p){
 const liste=[];
 if(!p)return liste;
 if(p.art==="stange"){
  (p.stangen||[]).forEach((s,si)=>(s.stuecke||[]).forEach(x=>
   liste.push(Object.assign({},x,{breite:p.breite,platz:si+1,abschnitt:si+1,abLaenge:zuZahl(s.laenge),strKey:"s|"+si,strIdx:1}))));
 }else{
  // v3.297: woher das Stueck kommt (Abschnitt/Streifen) reist mit - die abhakbare Liste zeigt es.
  // v3.301: Abschnitt, Streifen und Abwicklung je Stueck (zuAbschnittInfo) - die Liste des
  // Ruestblatts gliedert danach: Abschnitt -> Streifen (mit Abwicklung) -> Stuecke.
  const gruppen=p.gruppen||[];
  const ab=zuAbschnittInfo(p);
  gruppen.forEach((g,gi)=>{
   (g.streifen||[]).forEach((s,si)=>(s.stuecke||[]).forEach(x=>{
    const i=ab&&ab.get(s);
    liste.push(Object.assign({},x,{breite:g.breite,platz:si+1,strKey:gi+"|"+si,
     abschnitt:i?i.nr:undefined,abLaenge:i?i.laenge:undefined,strIdx:i?i.idx:undefined},
     (i&&i.rolle)?{rolle:i.rolle}:{}));
   }));
  });
 }
 // Stuecke, die aus einem vorhandenen Rest geschnitten werden. Sie stehen
 // NICHT in den Gruppen - die Rolle wurde ohne sie gerechnet. Sie gehoeren
 // trotzdem auf die Liste: sie muessen geschnitten und abgehakt werden.
 // Ist der Rest beim Ruesten doch nicht da, wird das Stueck von der Rolle
 // geschnitten - deshalb bleibt es mit seinem Kaestchen stehen und traegt
 // nur den Vermerk, woher es kommen sollte.
 (p.ausResten||[]).forEach(r=>{
  const vermerk=zuRestVermerk(r.laenge,r.breite,r.material_name);
  (r.stuecke||[]).forEach(x=>liste.push(Object.assign({},x,{
   breite:zuZahl(r.abwicklung)||zuZahl(x.breite),
   ausRestId:r.id||null,
   merkmal:zuMerkmalMitRest(x.merkmal,vermerk)})));
 });
 // Der Weg von Hand ("Hier verwenden", js/42): dort wurde der Plan OHNE den
 // Rest gerechnet, das Stueck steht also bereits oben in den Gruppen. Es
 // bekommt nur den Vermerk. Fehlt js/42, bleibt alles wie es ist.
 if(p.erledigtFuer&&typeof restStueckVermerk==="function"){
  liste.forEach(x=>{
   const v=restStueckVermerk(p.erledigtFuer,x.nr);
   if(v)x.merkmal=zuMerkmalMitRest(x.merkmal,v);
  });
 }
 return liste;
}
function zuGruppen(p){
 const nach=new Map();
 zuAlleStuecke(p).forEach(x=>{
  const l=Math.round(zuZahl(x.laenge)), b=Math.round(zuZahl(x.breite));
  const schluessel=l+"|"+b+"|"+(x.merkmal||"");
  if(!nach.has(schluessel))nach.set(schluessel,{laenge:l,breite:b,merkmal:x.merkmal||"",stuecke:[]});
  nach.get(schluessel).stuecke.push(x);
 });
 // Längste zuerst - so steht der grösste Zuschnitt oben, wie auf dem Zettel.
 return Array.from(nach.values()).sort((a,b)=>b.laenge-a.laenge||b.breite-a.breite);
}
// Ein Eintrag der Liste: "3 × 1'850 × 250 mm" - darunter, deutlich lesbar,
// auf WELCHE Positionsnummern dieser eine Zuschnitt gehört. Genau das ist die
// Frage auf der Baustelle: welches Blech kommt wohin.
// v3.15: Zu welcher Massaufnahme gehoert dieser Plan - und darf darin
// abgehakt werden? Nur im Formular EINER Massaufnahme: in einer
// projektweiten Zusammenfassung sind die Stuecknummern neu vergeben und
// gehoeren zu verschiedenen Aufnahmen, ein Haken waere dort nicht eindeutig.
function zuErledigtFuer(p){
 if(p&&p.sammel)return null;
 // v3.22: Das Modul entscheidet IMMER - auch wenn der Aufrufer eine
 // Massaufnahme nennt. Seit die Werkstatt ihre Liste unabhaengig vom Modul
 // zeichnet (erledigtFuer ist dort immer gesetzt), waeren die Nummern sonst
 // antippbar, obwohl das Abhaken ausgeschaltet ist - vom Pruefstand gefunden.
 if(typeof zeAbhakenMoeglich==="function"&&!zeAbhakenMoeglich())return null;
 if(p&&p.erledigtFuer!==undefined)return p.erledigtFuer;
 return (typeof zeOffeneMassaufnahme==="function")?zeOffeneMassaufnahme():null;
}
// v3.297, Ansage des Anwenders: "Welches Stueck aus welchem Abschnitt sollte auch in der abhakbaren
// Liste stehen und nicht in einer separaten Liste." Nur wenn es mehr als einen Streifen bzw. eine
// Stange gibt (sonst waere es Rauschen) und nur wo der Aufrufer es verlangt (opt.herkunft).
// v3.301, Ansage des Anwenders: "Man muss auf Anhieb sehen, aus welchem Abschnitt welche Streifen mit
// welchen Abwicklungen geschnitten werden und welche Stuecke dann aus welchen Streifen gemacht werden."
// Die abhakbare Liste des Ruestblatts gliedert deshalb nach dem Schnitt selbst:
//   Abschnitt N (Laenge ab Rolle)  ->  Streifen M (Abwicklung)  ->  Stueck-Nummern mit Laenge.
// Dieselben Knoepfe/Attribute wie zuGruppenZeileHtml (data-ze-*), also dasselbe Abhaken.
function zuListeAbschnitteHtml(p){
 const mid=zuErledigtFuer(p);
 const abhakbar=!(mid===null||mid===undefined);
 const stange=p.art==="stange";
 const wort=stange?"Stange":zuWort(p).abschnitt;
 const bloecke=new Map();
 zuAlleStuecke(p).forEach(x=>{
  const k=x.abschnitt!==undefined?x.abschnitt:"rest";
  if(!bloecke.has(k))bloecke.set(k,{laenge:x.abLaenge,rolle:x.rolle,streifen:new Map()});
  const b=bloecke.get(k);
  if(!b.streifen.has(x.strKey||"rest"))b.streifen.set(x.strKey||"rest",{idx:x.strIdx,breite:x.breite,stuecke:[]});
  b.streifen.get(x.strKey||"rest").stuecke.push(x);
 });
 const knopf=(x)=>{
  const n=x.nr, l=Math.round(zuZahl(x.laenge)), bb=Math.round(zuZahl(x.breite));
  // v3.336: Projekt-Rüstblatt (gemeinsamer Plan): jedes Stück zeigt SEINE Nummer aus der eigenen Massaufnahme und deren
  // Abhak-Stand; v3.339: antippbar wie überall (derselbe Klick-Weg js/56, Nummer + Massaufnahme-Id bleiben stabil).
  const gemein=!abhakbar&&p.sammel&&x.quelleId!==undefined&&x.quelleId!==null&&x.origNr!==undefined&&x.origNr!==null;
  const erl=gemein&&typeof zeIstErledigt==="function"&&zeIstErledigt(x.quelleId,x.origNr);
  const nrEl=(gemein&&(typeof zeAbhakenMoeglich!=="function"||zeAbhakenMoeglich()))
   ?`<button type="button" class="zu-nr zu-nr-hak${erl?" ze-ok":""}" aria-pressed="${erl?"true":"false"}" data-ze-meas="${esc(x.quelleId)}" data-ze-nr="${esc(x.origNr)}"`
    +` data-ze-l="${esc(l)}" data-ze-b="${esc(bb||"")}" data-ze-m="${esc(x.merkmal||"")}"`
    +` title="Stück ${esc(x.origNr)} als zugeschnitten abhaken">${esc(x.origNr)}</button>`
   :gemein
   ?`<span class="zu-nr zu-nr-ist${erl?" ze-ok":""}" data-ze-ist="${erl?1:0}" title="Stück ${esc(x.origNr)}${erl?" ist bereits zugeschnitten":""}">${esc(x.origNr)}</span>`
   :abhakbar
   ?`<button type="button" class="zu-nr zu-nr-hak" aria-pressed="false" data-ze-meas="${esc(mid)}" data-ze-nr="${esc(n)}"`
    +` data-ze-l="${esc(l)}" data-ze-b="${esc(bb||"")}" data-ze-m="${esc(x.merkmal||"")}"`
    +` title="Stück ${esc(n)} als zugeschnitten abhaken">${esc(n)}</button>`
   :`<span class="zu-nr">${esc(n)}</span>`;
  const zus=[x.merkmal,x.hinweis].filter(Boolean).map(esc).join(" · ");
  return `<span class="zu-st">${nrEl}<span class="zu-st-mass">${esc(zuMm(l))} mm${zus?` · <span class="zu-st-zusatz">${zus}</span>`:""}</span></span>`;
 };
 const reihenfolge=Array.from(bloecke.keys()).sort((a,b)=>(a==="rest")-(b==="rest")||(a===b?0:a-b));
 return reihenfolge.map(k=>{
  const b=bloecke.get(k);
  const kopf=k==="rest"?"Aus vorhandenem Rest":(wort+" "+k+(b.laenge>0?" · "+zuMm(b.laenge)+" mm"+(stange?"":(zuIstTafel(p)?"":(b.rolle?" ab "+zuMm(b.rolle)+"er Rolle":" ab Rolle"))):""));
  const zeilen=Array.from(b.streifen.values()).sort((x,y)=>(x.idx||0)-(y.idx||0)).map(st=>{
   const nrs=st.stuecke.map(x=>x.nr).filter(n=>n!==undefined&&n!==null);
   const name=(stange||k==="rest")?"":`<span class="zu-streifen-name">Streifen ${esc(st.idx)} · Abwicklung ${esc(zuMm(st.breite))} mm</span>`;
   const stand=abhakbar?`<span class="ze-stand" data-ze-stand="1">–</span>`
     +(nrs.length>1?`<button type="button" class="ze-alle" data-ze-alle="${esc(mid)}" data-ze-nrs="${esc(nrs.join(","))}">✓ alle</button>`:""):"";
   return `<div class="zu-streifen-zeile"${abhakbar?' data-ze-zeile="1"':""}>${name}<span class="zu-streifen-stuecke">${st.stuecke.map(knopf).join("")}</span>${stand}</div>`;
  }).join("");
  return `<div class="zu-abschnitt"><div class="zu-abschnitt-kopf">${esc(kopf)}</div>${zeilen}</div>`;
 }).join("");
}
// v3.337: Schnittbild - je Abschnitt ein Rechteck (Länge der Rolle, Breite = Rollenbreite), darin die Streifen und darin die Stücke
// mit ihrer Nummer, in Schnittreihenfolge. Zeigt, wo welches Stück im Abschnitt liegt; abgehakte Stücke sind grün. Reine Anzeige aus
// zuAlleStuecke() (dieselben Angaben wie die Liste), nichts wird gerechnet oder gespeichert. Stücke aus Resten stehen nicht im Abschnitt.
function zuSchnittbildHtml(p){
 if(!p||!p.gruppen&&p.art!=="stange")return "";
 const alle=zuAlleStuecke(p).filter(x=>x.abschnitt!==undefined&&x.abschnitt!==null&&zuZahl(x.abLaenge)>0);
 if(!alle.length)return "";
 const stange=p.art==="stange";
 const best=(p.moeglich||[])[0];
 const mid=zuErledigtFuer(p);
 const hakenOk=(typeof zeAbhakenMoeglich!=="function")||zeAbhakenMoeglich();
 const erledigt=x=>{
  if(typeof zeIstErledigt!=="function")return false;
  if(p.sammel)return x.quelleId!==undefined&&x.quelleId!==null&&zeIstErledigt(x.quelleId,x.origNr);
  return mid!==null&&mid!==undefined&&zeIstErledigt(mid,x.nr);
 };
 const marke=x=>(p.sammel&&x.origNr!==undefined&&x.origNr!==null)?x.origNr:x.nr;
 const bloecke=new Map();
 alle.forEach(x=>{
  if(!bloecke.has(x.abschnitt))bloecke.set(x.abschnitt,{L:zuZahl(x.abLaenge),rolle:zuZahl(x.rolle),streifen:new Map()});
  const b=bloecke.get(x.abschnitt);
  if(!b.streifen.has(x.strKey))b.streifen.set(x.strKey,{idx:x.strIdx||0,A:zuZahl(x.breite),st:[]});
  b.streifen.get(x.strKey).st.push(x);
 });
 const reihenfolge=Array.from(bloecke.keys()).sort((a,b)=>a-b);
 const W=1000;
 const svg=reihenfolge.map(k=>{
  const b=bloecke.get(k);
  const zeilen=Array.from(b.streifen.values()).sort((x,y)=>x.idx-y.idx);
  const summe=zeilen.reduce((s,z)=>s+z.A,0);
  const B=stange?zuZahl(p.breite)||summe:(b.rolle||zuZahl(best&&best.breite)||summe);
  const Bm=Math.max(B,summe,1);
  const L=Math.max(b.L,zeilen.reduce((m,z)=>Math.max(m,z.st.reduce((s,x)=>s+zuZahl(x.laenge),0)),0),1);
  const H=Math.max(70,Math.min(240,Math.round(W*Bm/L)));
  const sx=W/L, sy=H/Bm;
  let y=0, el="";
  zeilen.forEach(z=>{
   const h=z.A*sy;
   let x0=0;
   z.st.forEach(x=>{
    const w=zuZahl(x.laenge)*sx, ok=erledigt(x), t=String(marke(x));
    // v3.339: antippbar = abhaken (dieselben data-ze-*-Attribute wie die Nummern-Knöpfe; js/56 macht den Rest).
    const hm=p.sammel?x.quelleId:mid, hn=p.sammel?x.origNr:x.nr;
    const klick=hakenOk&&hm!==undefined&&hm!==null&&hn!==undefined&&hn!==null;
    let teil=`<rect x="${x0.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(w,1).toFixed(1)}" height="${Math.max(h,1).toFixed(1)}" fill="${ok?"#9fd3a8":"#dbe7f3"}" stroke="#17202a" stroke-width="1.5"/>`;
    const fs=Math.max(12,Math.min(30,h*0.55,w/(t.length+0.6)));
    if(w>=fs*0.9&&h>=12)teil+=`<text x="${(x0+w/2).toFixed(1)}" y="${(y+h/2+fs*0.35).toFixed(1)}" font-size="${fs.toFixed(0)}" font-weight="700" text-anchor="middle" fill="#17202a">${esc(t)}</text>`;
    // Im gemeinsamen Plan tragen Stücke aus verschiedenen Massaufnahmen dieselbe Nummer: darunter steht die Herkunft.
    if(p.sammel&&x.hinweis&&w>=60&&h>=40){
     const hk=String(x.hinweis).slice(0,Math.max(4,Math.floor(w/11)));
     teil+=`<text x="${(x0+w/2).toFixed(1)}" y="${(y+h/2+fs*0.35+15).toFixed(1)}" font-size="13" text-anchor="middle" fill="#3d4850">${esc(hk)}</text>`;
    }
    el+=klick
     ?`<g class="zu-bild-st${ok?" ze-ok":""}" role="button" aria-pressed="${ok?"true":"false"}" data-ze-meas="${esc(hm)}" data-ze-nr="${esc(hn)}" data-ze-l="${esc(Math.round(zuZahl(x.laenge)))}" data-ze-b="${esc(Math.round(zuZahl(x.breite))||"")}" data-ze-m="${esc(x.merkmal||"")}"><title>Stück ${esc(hn)} abhaken</title>${teil}</g>`
     :teil;
    x0+=w;
   });
   y+=h;
  });
  const rest=Bm-summe;
  const rand=`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#17202a" stroke-width="2.5"/>`;
  const rst=(rest>0.5?`<rect x="0" y="${(summe*sy).toFixed(1)}" width="${W}" height="${(rest*sy).toFixed(1)}" fill="#f1f1f1" stroke="#9aa5ab" stroke-width="1" stroke-dasharray="6 4"/>`:"");
  const kopf=stange?("Stange "+k):(zuWort(p).abschnitt+" "+k);
  return `<figure class="zu-bild"><figcaption>${esc(kopf)} · ${esc(zuMm(Math.round(L)))} × ${esc(zuMm(Math.round(Bm)))} mm</figcaption>`
   +`<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(kopf)}: Lage der Stücke">${rst}${el}${rand}</svg></figure>`;
 }).join("");
 return svg?`<div class="zu-bilder"><div class="zu-bilder-kopf">Schnittbild – wo welches Stück liegt <span class="zu-bilder-legende">(grün = abgehakt${hakenOk&&(mid!==null&&mid!==undefined||p.sammel)?" · Stück antippen = abhaken":""})</span></div>${svg}</div>`:"";
}
// v3.343: Rollenband - die Abschnitte des Plans fortlaufend auf der Rolle (Länge von links nach rechts, Rollenbreite als Höhe), darin je
// Abschnitt die Streifen und Stücke, eingefärbt nach Herkunft (Massaufnahme). Reihen brechen bei ca. 6 m um. Reine Darstellung der
// bestehenden Packrechnung (zuAlleStuecke), keine zweite Berechnung. farbeVon(stueck) liefert die Füllfarbe.
function zuRollenbandHtml(p,farbeVon){
 if(!p||(!p.gruppen&&p.art!=="stange"))return "";
 const alle=zuAlleStuecke(p).filter(x=>x.abschnitt!==undefined&&x.abschnitt!==null&&zuZahl(x.abLaenge)>0);
 if(!alle.length)return "";
 const best=(p.moeglich||[])[0];
 const bloecke=new Map();
 alle.forEach(x=>{
  if(!bloecke.has(x.abschnitt))bloecke.set(x.abschnitt,{L:zuZahl(x.abLaenge),rolle:zuZahl(x.rolle),streifen:new Map()});
  const b=bloecke.get(x.abschnitt);
  if(!b.streifen.has(x.strKey))b.streifen.set(x.strKey,{idx:x.strIdx||0,A:zuZahl(x.breite),st:[]});
  b.streifen.get(x.strKey).st.push(x);
 });
 const abs=Array.from(bloecke.keys()).sort((a,b)=>a-b).map(k=>{
  const b=bloecke.get(k);
  const zeilen=Array.from(b.streifen.values()).sort((x,y)=>x.idx-y.idx);
  const summe=zeilen.reduce((s,z)=>s+z.A,0);
  const lang=zeilen.reduce((m,z)=>Math.max(m,z.st.reduce((s,x)=>s+zuZahl(x.laenge),0)),0);
  return {nr:k,L:Math.max(b.L,lang,1),rolle:b.rolle,zeilen,summe};
 });
 const B=Math.max(zuZahl(best&&best.breite),...abs.map(a=>Math.max(a.rolle,a.summe)),1);
 const maxZeile=Math.max(6000,...abs.map(a=>a.L));
 const reihen=[];let akt=[],sum=0;
 abs.forEach(a=>{if(akt.length&&sum+a.L>maxZeile){reihen.push(akt);akt=[];sum=0}akt.push(a);sum+=a.L});
 if(akt.length)reihen.push(akt);
 const W=1000, sx=W/maxZeile, H=Math.max(60,Math.min(150,Math.round(W*B/maxZeile)));
 const sy=H/B;
 const farbe=x=>(typeof farbeVon==="function"?farbeVon(x):null)||"#dbe7f3";
 const gesamt=abs.reduce((s,a)=>s+a.L,0);
 const svgs=reihen.map((r,ri)=>{
  let x0=0, el="";
  r.forEach(a=>{
   const w=a.L*sx;
   el+=`<rect x="${x0.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${H}" fill="#f1f1f1" stroke="#17202a" stroke-width="2"/>`;
   let y=0;
   a.zeilen.forEach(z=>{
    const h=z.A*sy;let xs=x0;
    z.st.forEach(x=>{
     const sw=zuZahl(x.laenge)*sx, t=String((p.sammel&&x.origNr!==undefined&&x.origNr!==null)?x.origNr:x.nr);
     el+=`<rect x="${xs.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(sw,1).toFixed(1)}" height="${Math.max(h,1).toFixed(1)}" fill="${farbe(x)}" stroke="#17202a" stroke-width="1"/>`;
     const fs=Math.max(10,Math.min(22,h*0.6,sw/(t.length+0.6)));
     if(sw>=fs*0.9&&h>=10)el+=`<text x="${(xs+sw/2).toFixed(1)}" y="${(y+h/2+fs*0.35).toFixed(1)}" font-size="${fs.toFixed(0)}" font-weight="700" text-anchor="middle" fill="#17202a">${esc(t)}</text>`;
     xs+=sw;
    });
    y+=h;
   });
   if(w>=70)el+=`<text x="${(x0+4).toFixed(1)}" y="${H-4}" font-size="11" fill="#3d4850">Abschn. ${esc(a.nr)} · ${esc(zuMm(Math.round(a.L)))}</text>`;
   x0+=w;
  });
  const rl=r.reduce((s,a)=>s+a.L,0);
  return `<div class="pzu-band-kopf">Reihe ${ri+1} · ${esc((rl/1000).toLocaleString("de-CH",{maximumFractionDigits:2}))} m</div><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Rollenbelegung Reihe ${ri+1}">${el}</svg>`;
 }).join("");
 return `<div class="pzu-band"><div class="pzu-band-kopf">Optimierte Anordnung auf der Rolle · Breite ${esc(zuMm(Math.round(B)))} mm · gesamt ${esc((gesamt/1000).toLocaleString("de-CH",{maximumFractionDigits:2}))} m</div>${svgs}</div>`;
}
function zuHerkunftNoetig(p){
 if(!p)return false;
 if(p.art==="stange")return (p.stangen||[]).length>=2;
 if((p.gruppen||[]).reduce((a,g)=>a+(g.streifen||[]).length,0)<2)return false;
 // v3.407: Die Aufteilung in Abschnitte und Streifen braucht nur, wer Stuecke NEBENEINANDER auf der Rolle hat (mehr als ein Streifen
 // je Abschnitt). Liegt je Abschnitt genau ein Streifen, sagt die gruppierte Liste (34 × 2'247 × 349 mm, Nummern) dasselbe viel
 // kompakter - so wie in der Massaufnahme - statt einer Zeile je Abschnitt.
 return (p.gruppen||[]).some(g=>{
  const st=g.streifen||[], je=Math.round(zuZahl(g.jeAbschnitt));
  return st.length>1&&!(je===1);     // unbekannt (alte Plaene) gilt wie nebeneinander: dann bleibt es bei der bisherigen Aufteilung
 });
}
function zuGruppenZeileHtml(g,einheit,p){
 const nummern=g.stuecke.map(x=>x.nr).filter(x=>x!==undefined&&x!==null);
 const hinweise=[];
 g.stuecke.forEach(x=>{if(x.hinweis&&hinweise.indexOf(x.hinweis)<0)hinweise.push(x.hinweis)});
 const zusatz=[];
 if(g.merkmal)zusatz.push(esc(g.merkmal));
 if(hinweise.length)zusatz.push(esc(hinweise.join(" · ")));
 const e=einheit||"Stück";
 // v3.15: Ein Tap auf die Positionsnummer hakt genau dieses Stueck ab.
 // Die Nummern standen seit v2.88 ohnehin da - sie werden jetzt bedienbar,
 // statt eine zweite Liste danebenzustellen. Der Stand wird NICHT hier
 // eingesetzt, sondern nachtraeglich von zeMarkierungAuffrischen() gemalt:
 // die Haken kommen aus der Datenbank und sind beim Zeichnen oft noch nicht
 // da (dasselbe Muster wie die signierten Vorschaubilder).
 const mid=zuErledigtFuer(p);
 const nrHtml=n=>{
  if(mid===null||mid===undefined)return `<span class="zu-nr">${esc(n)}</span>`;
  const x=g.stuecke.find(y=>y.nr===n)||{};
  return `<button type="button" class="zu-nr zu-nr-hak" aria-pressed="false"`
   +` data-ze-meas="${esc(mid)}" data-ze-nr="${esc(n)}"`
   +` data-ze-l="${esc(g.laenge)}" data-ze-b="${esc(g.breite||"")}"`
   +` data-ze-m="${esc(g.merkmal||"")}"`
   +` title="Stück ${esc(n)} als zugeschnitten abhaken">${esc(n)}</button>`;
 };
 const stand=(mid===null||mid===undefined)?"":
  `<span class="ze-stand" data-ze-stand="1">–</span>`
  +(nummern.length>1?`<button type="button" class="ze-alle" data-ze-alle="${esc(mid)}"`
    +` data-ze-nrs="${esc(nummern.join(","))}">✓ alle</button>`:"");
 return `<div class="zu-zeile"${mid!==null&&mid!==undefined?' data-ze-zeile="1"':""}>
<span class="zu-anzahl">${g.stuecke.length} ×</span>
<span class="zu-mass">${esc(zuMm(g.laenge))}${g.breite>0?" × "+esc(zuMm(g.breite)):""}<span class="zu-einheit"> mm</span></span>
${nummern.length?`<span class="zu-pos"><span class="zu-pos-marke">${esc(e)}</span>${
  nummern.map(n=>nrHtml(n)).join("")}</span>`:""}
${stand}
${zusatz.length?`<span class="zu-zusatz">${zusatz.join(" · ")}</span>`:""}
</div>`;
}
// Die Liste selbst - Kopf (welche Rolle), Zeilen, Fuss (wie viele Tafeln).
// v3.22: Warum sind die Positionsnummern hier nicht antippbar? Bis v3.21
// verschwand das Abhaken kommentarlos, sobald das Untermodul "zuschnitt" aus
// war. Der Hinweis steht jetzt genau EINMAL - hier, unter der Liste, und gilt
// damit fuer das Register, die Seite "Material & Zuschnitt" und die Werkstatt.
// Beim projektweiten Sammelplan (p.sammel) wird bewusst geschwiegen: dort ist
// das Abhaken auch mit eingeschaltetem Modul nicht vorgesehen (CLAUDE.md 120.4).
function zuAbhakenHinweis(p){
 if(p&&p.sammel)return "";
 if(typeof zeAbhakenHinweisHtml!=="function")return "";
 // Nur wo ueberhaupt abgehakt werden koennte: die Liste gehoert zu genau
 // einer Massaufnahme.
 const eine=(p&&p.erledigtFuer!==undefined&&p.erledigtFuer!==null)
   ||(typeof zeOffeneMassaufnahme==="function"&&zeOffeneMassaufnahme());
 if(!eine)return "";
 return zeAbhakenHinweisHtml();
}
function zuListeHtml(p,opt){
 const gruppen=zuGruppen(p);
 if(!gruppen.length)return "";
 const bestes=(p.moeglich||[])[0];
 let kopf="Zuschnittliste", fuss="";
 if(zuFlach(p)&&bestes){
  const w=zuWort(p);
  // Die Kopfzeile sagt ausdruecklich, WORAUS geschnitten wird - das ist die
  // erste Frage in der Werkstatt.
  kopf=w.kopf+" "+zuFormatText(bestes,p);
  const ab=zuAbschnittText(bestes,p);
  const st=bestes.mischung?0:zuStreifenZahl(bestes,p);
  fuss=(ab!=="–"?ab+(bestes.mischung?"":" "+w.ab):"")
    +(st>0?(ab!=="–"?" · ":"")+st+" Streifen je "+w.abschnitt:"");
 }else if(p.art==="stange"){
  kopf="Zuschnittliste";
  fuss=(p.stangen||[]).length+" Stange"+((p.stangen||[]).length===1?"":"n");
 }
 return `<div class="zu-liste">
<div class="zu-liste-kopf">${esc(kopf)}</div>
${(opt&&opt.herkunft)?zuSchnittbildHtml(p):""}
${(opt&&opt.herkunft&&zuHerkunftNoetig(p))?zuListeAbschnitteHtml(p):gruppen.map(g=>zuGruppenZeileHtml(g,p.einheit,p)).join("")}
${fuss?`<div class="zu-liste-fuss">${esc(fuss)}</div>`:""}
${zuAbhakenHinweis(p)}
</div>`;
}
function zuKennzahl(label,wert,klein){
 return `<div><label>${esc(label)}</label><div class="ra-wert${klein?" ra-wert-klein":""}">${wert}</div></div>`;
}
// Die Kennzahlen stehen in jeder Art an derselben Stelle und in derselben
// Reihenfolge. Die Streifenbreite kommt zuerst: sie ist das Mass, auf das der
// Streifen tatsächlich geschnitten werden muss.
function zuKennzahlenHtml(p){
 if(p.art==="stange"){
 const n=(p.normen||[]).slice().sort((a,b)=>b-a);
  return `<div class="grid zu-kennzahlen">
${zuKennzahl("Streifenbreite","entfällt",true)}
${zuKennzahl("Normlängen",n.length?esc(n.map(x=>zuMeter(x)+" m").join(" · ")):"–",n.length>2)}
${zuKennzahl("Stangen",(p.stangen||[]).length)}
${zuKennzahl("Zuschnitt netto",zuMm(p.summeStuecke)+" mm")}
</div>
<div class="small zu-hinweis">Eine Rinne wird als fertiges Profil in Normlängen
bezogen – es ist <b>kein Streifen von der Rolle</b> zu schneiden.</div>`;
 }
 const b=(p.streifenbreiten||[]).filter(x=>zuZahl(x)>0);
 const breiteText=b.length?b.map(x=>zuMm(x)+" mm").join(" · "):"–";
 const bestes=(p.moeglich||[])[0];
 const ab=zuAbschnittText(bestes,p);
 const streifen=(p.gruppen||[]).reduce((s,g)=>s+(g.streifen||[]).length,0);
 const w=zuWort(p), tafel=zuIstTafel(p);
 return `<div class="grid zu-kennzahlen">
${zuKennzahl(b.length>1?"Streifenbreiten":"Streifenbreite",breiteText)}
${zuKennzahl(tafel?"Aus Tafeln":"Ab Rolle",esc(ab),ab.length>12)}
${zuKennzahl("Streifen gesamt",streifen)}
${zuKennzahl("Blech netto",zuQm(p.netto)+" m²")}
</div>
<div class="small zu-hinweis">Auf <b>${esc(breiteText)}</b> muss der Streifen
geschnitten werden – das ist die Abwicklung des Profils. ${tafel
 ?`Geschnitten wird aus <b>Tafeln</b> (${esc(bestes?zuFormatText(bestes,p):"–")}); jedes Stück muss in die Tafellänge passen.`
 :`Von der Rolle werden <b>${esc(ab)}</b> abgezogen; jeder Abschnitt ist so lang wie das längste Blech.`}</div>`;
}

function zuMeldungenHtml(p){
 let h="";
 const zuLang=p.zuLang||[];
 if(zuLang.length){
  const br=p.art==="stange"?p.breite:((p.streifenbreiten||[])[0]);
  const namen=zuLang.map(x=>(x&&x.nr!==undefined)
    ?p.einheit+" "+x.nr+" ("+zuMasse(x.laenge,br)+")":zuMasse(x,br)).join(", ");
  const wo=p.art==="stange"?"Stange":(zuIstTafel(p)?"Tafel":"einen Abschnitt");
  h+=`<div class="ra-fehler">Zu lang für ${p.art==="stange"||zuIstTafel(p)?"eine ":""}${wo}: ${esc(namen)}.
Diese ${p.einheit==="Segment"?"Segmente sind":"Stücke sind"} im Plan <b>nicht</b> enthalten.</div>`;
 }
 // v3.33: Formate, die zwar breit genug waeren, an denen aber ein Stueck zu
 // lang ist. Nur bei der Tafel moeglich - und es gehoert gesagt, warum ein
 // Format fehlt, statt es lautlos wegzulassen.
 (p.zuKurz||[]).forEach(k=>{
  h+=`<div class="small zu-hinweis">Zu kurz: ${esc(zuFormatText(k.format,p))} –
${esc((k.stuecke||[]).map(x=>p.einheit+" "+x.nr).join(", "))} ${(k.stuecke||[]).length===1?"passt":"passen"}
nicht in ${esc(zuMm(k.laenge))} mm Länge.</div>`;
 });
 if(zuFlach(p)&&!(p.moeglich||[]).length){
  const b=(p.streifenbreiten||[]).filter(x=>zuZahl(x)>0);
  const w=zuWort(p);
  h+=`<div class="ra-warnung">${zuIstTafel(p)?"Keine hinterlegte Tafel":"Keine hinterlegte Rollenbreite"} ist so breit wie
${b.length>1?"die breiteste Abwicklung":"die Abwicklung"} (${esc(b.length?zuMm(Math.max.apply(null,b)):"–")} mm)${
zuIstTafel(p)?" oder lang genug für die Stücke":""}.
Der Zuschnitt lässt sich so <b>nicht</b> aus dem hinterlegten ${esc(zuIstTafel(p)?"Tafelmaterial":"Rollenblech")} schneiden.</div>`;
 }
 // Warum die Form so gewaehlt wurde. Steht ausdruecklich da, statt
 // stillschweigend Rollenblech anzunehmen (js/29 ebaFormate).
 if(p.formGrund&&typeof restFormGrundText==="function"){
  const t=restFormGrundText(p.formGrund);
  if(t)h+=`<div class="small zu-hinweis">${esc(t)} Gerechnet wird deshalb mit
<b>${esc(zuWort(p).quelle)}</b>.</div>`;
 }
 if((p.zuSchmal||[]).length)
  h+=`<div class="small zu-hinweis">Zu schmal für dieses Profil: ${esc(p.zuSchmal.map(x=>zuMm(x)+" mm").join(", "))}.</div>`;
 if(p.optimal===false)
  h+=`<div class="ra-warnung">Beste gefundene Verteilung – die Suche wurde abgebrochen,
sie ist nicht nachweislich die günstigste.</div>`;
 return h;
}

// Von der Rolle werden ABSCHNITTE abgezogen, jeder so lang wie das laengste
// Blech - eine einzige, sehr lange Bahn liesse sich in der Werkstatt nicht
// handhaben. Angezeigt wird deshalb "3 × 2'070 mm" und nicht "6'210 mm".
//
// Aeltere gespeicherte Plaene: bis v2.87 hiessen die Felder "tafeln" und
// "tafelLaenge" - dieselbe Sache unter anderem Namen. Ein Plan aus v2.88 hat
// nur die durchgehende "rollenLaenge"; der wird als EIN Abschnitt gezeigt,
// weil er genau so gerechnet wurde. Es wird nichts nachgerechnet.
function zuAbschnitte(x,p){
 if(!x)return {n:0,laenge:0};
 // v3.83: bei der Rolle kann EINE Zeile selbst mehrere unterschiedliche
 // Abschnittlaengen tragen (mehrere Streifen je Abschnitt, je nach Stueck
 // unterschiedlich lang - ebaPackeMehrereAbschnitte, js/29) - dieselbe
 // "teile"-Darstellung wie unten bei mehreren Streifenbreiten, nur eine
 // Ebene tiefer (eine einzige Streifenbreite, mehrere Laengen).
 if(Array.isArray(x.teile)&&x.teile.length){
  const gleich=x.teile.every(t=>t.laenge===x.teile[0].laenge);
  return gleich?{n:x.teile.reduce((a,t)=>a+t.n,0),laenge:x.teile[0].laenge}
               :{n:0,laenge:0,teile:x.teile};
 }
 const zeilen=Array.isArray(x.zeilen)?x.zeilen:null;
 if(zeilen&&zeilen.length){
  // Mehrere Streifenbreiten (Freies Profil, Lukarne): je Breite ein eigener
  // Abschnitt. Eine einzelne Breite kann selbst schon mehrere Laengen
  // mitbringen (teile, siehe oben) - die werden hier EINZELN aufgenommen,
  // nicht als eine Zeile mit n=0 stillschweigend verworfen (gefunden
  // 12.09.2026: eine Breite mit gemischten Laengen verschwand komplett aus
  // der Anzeige, weil nur nach t.n>0 gefiltert wurde).
  const alle=[];
  zeilen.forEach(z=>{
   const t=zuAbschnitte(z,p);
   if(Array.isArray(t.teile))t.teile.forEach(e=>alle.push(e));
   else if(t.n>0)alle.push({n:t.n,laenge:t.laenge});
  });
  if(!alle.length)return {n:0,laenge:0};
  const gleich=alle.every(t=>t.laenge===alle[0].laenge);
  if(gleich)return {n:alle.reduce((a,t)=>a+t.n,0),laenge:alle[0].laenge};
  // Unterschiedliche Laengen (aus einer oder mehreren Zeilen): nach Laenge
  // zusammenzaehlen, damit dieselbe Laenge aus zwei Breiten nicht doppelt
  // dasteht.
  const nach={};
  alle.forEach(t=>{nach[t.laenge]=(nach[t.laenge]||0)+t.n});
  const teile=Object.keys(nach).map(Number).sort((a,b)=>b-a).map(l=>({n:nach[l],laenge:l}));
  return {n:0,laenge:0,teile};
 }
 const laenge=zuZahl(x.abschnittLaenge)||zuZahl(x.tafelLaenge)
   ||zuZahl(p&&p.abschnittLaenge)||zuZahl(((p&&p.gruppen)||[])[0]&&(p.gruppen[0].abschnittLaenge||p.gruppen[0].tafelLaenge));
 const n=zuZahl(x.abschnitte)||zuZahl(x.tafeln);
 if(n>0&&laenge>0)return {n,laenge};
 // v2.88-Plan: eine durchgehende Bahn.
 const durch=zuZahl(x.rollenLaenge);
 return durch>0?{n:1,laenge:durch}:{n:0,laenge:0};
}
// Als Text: "3 × 2'070 mm". Bei mehreren verschiedenen Abschnittlaengen
// stehen sie einzeln da - es wird keine gemeinsame erfunden.
function zuAbschnittText(x,p){
 if(x&&Array.isArray(x.mischung)&&x.mischung.length)
  return x.mischung.map(m=>zuMm(m.breite)+"er: "+zuAbschnittText(m.format,p)).join(" · ");
 const a=zuAbschnitte(x,p);
 if(a.teile)return a.teile.map(t=>t.n+" × "+zuMm(t.laenge)+"\u00a0mm").join(" + ");
 if(!a.n||!a.laenge)return "–";
 return a.n+" × "+zuMm(a.laenge)+"\u00a0mm";
}
// Die gesamte Laenge, die von der Rolle geht - fuer den Vergleich der Rollen.
function zuRollenLaengeMm(x,p){
 if(!x)return 0;
 const direkt=zuZahl(x.rollenLaenge);
 if(direkt>0)return direkt;
 const zeilen=Array.isArray(x.zeilen)?x.zeilen:null;
 if(zeilen&&zeilen.length){
  const summe=zeilen.reduce((s,z)=>s+zuRollenLaengeMm(z,p),0);
  if(summe>0)return summe;
 }
 const a=zuAbschnitte(x,p);
 return a.n*a.laenge;
}
// Wie viele Streifen liegen NEBENEINANDER auf einem Abschnitt? Das haengt an
// der Rollenbreite und ist etwas anderes als die Gesamtzahl der Streifen.
function zuStreifenZahl(x,p){
 if(!x)return 0;
 const zeilen=Array.isArray(x.zeilen)?x.zeilen:null;
 if(zeilen&&zeilen.length)
  return zeilen.reduce((s,z)=>s+(zuZahl(z.jeAbschnitt)||zuZahl(z.jeTafel)),0);
 return zuZahl(x.jeAbschnitt)||zuZahl(x.jeTafel);
}
function zuPlanTabelleHtml(p){
 if(p.art==="stange"){
  const nach={};
  (p.stangen||[]).forEach(s=>{nach[s.laenge]=(nach[s.laenge]||0)+1});
  const zeilen=Object.keys(nach).map(Number).sort((a,b)=>b-a).map((l,i)=>{
   const anzahl=nach[l], gesamt=anzahl*l;
   return `<tr${i===0?' class="ra-dila-zeile"':""}><td>${esc(zuMeter(l))} m</td>
<td>${anzahl}</td><td>${esc(zuMm(gesamt))} mm</td></tr>`;
  }).join("");
  if(!zeilen)return "";
  const anteil=p.gesamt>0?(p.verschnitt/p.gesamt*100):0;
  return `<div class="scroll"><table class="eb-table ra-tab">
<thead><tr><th>Normlänge</th><th>Stangen</th><th>Gesamtlänge</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
<div class="ra-ok">Am wenigsten Material: <b>${esc(zuMm(p.gesamt))} mm</b> Normlänge für
${esc(zuMm(p.summeStuecke))} mm Zuschnitt – <b>${esc(zuMm(p.verschnitt))} mm</b> Verschnitt
(${anteil.toFixed(0)} %).</div>`;
 }
 if(!(p.moeglich||[]).length)return "";   // Meldung steht in zuMeldungenHtml
 const zeilen=p.moeglich.map((x,i)=>`<tr${i===0?' class="ra-dila-zeile"':""}>
<td>${esc(zuFormatText(x,p))}</td>
<td>${esc(zuStreifenZahl(x,p)||"–")}</td>
<td>${esc(zuAbschnittText(x,p))}</td>
<td><b>${esc(zuQm(x.verschnitt))} m²</b></td>
<td>${esc(zuZahl(x.anteil).toFixed(0))} %</td></tr>`).join("");
 const b0=p.moeglich[0];
 // Die Blechflaeche steht bewusst NICHT als eigene Spalte: sie ist
 // netto + Verschnitt, und netto steht als Kennzahl direkt darueber. Sechs
 // Spalten brechen auf dem Handy die Ueberschriften mitten im Wort.
 const w=zuWort(p);
 return `<div class="scroll"><table class="eb-table ra-tab zu-vergleich">
<thead><tr><th>${esc(w.vergleich)}</th><th>${esc(w.str)}</th><th>${esc(zuIstTafel(p)?"Tafeln":"Ab Rolle")}</th><th>Verschnitt</th><th>Anteil</th></tr></thead>
<tbody>${zeilen}</tbody></table></div>
<div class="ra-ok">Am wenigsten Material: <b>${esc(zuFormatText(b0,p))}</b> –
${esc(zuAbschnittText(b0,p))} ${esc(w.ab)}, ${esc(zuQm(b0.flaeche))} m² Blech,
<b>${esc(zuQm(b0.verschnitt))} m²</b> Verschnitt (${esc(zuZahl(b0.anteil).toFixed(0))} %).</div>`;
}

// Belegung: welches Stueck liegt in welchem Streifen bzw. in welcher Stange.
// Die Positionsnummer steht dabei VORNE und gross - auf der Baustelle ist das
// die eigentliche Frage: welches Blech gehoert wohin. Statt einer Zelle mit
// "Stück 1 · 2'070 mm + Stück 4 · 1'420 mm" bekommt jedes Stueck eine eigene
// Zeile mit seiner Nummer, seinem Mass und seiner Bearbeitung.
function zuPlatzStueckeHtml(stuecke,breite,einheit){
 if(!stuecke||!stuecke.length)return `<div class="zu-platz-leer">leer</div>`;
 return stuecke.map(x=>{
  // v3.80: ein zu langes Stueck wird automatisch geteilt (ebaBlecheGeteilt,
  // js/29) - "Teil 2/3 von 6'234 mm" zeigt, dass diese Zeile nicht das ganze
  // Stueck ist, ohne die Nummer selbst zu aendern (Ruestliste/Abhaken
  // kennen weiterhin nur die EINE Stuecknummer).
  const teil=x.tafelTeil?`Teil ${x.tafelTeil.teil}/${x.tafelTeil.teile} von ${zuMm(x.tafelTeil.ursprung)} mm`:"";
  const zusatz=[x.merkmal,x.hinweis,teil].filter(Boolean).join(" · ");
  return `<div class="zu-platz-stueck">
<span class="zu-nr">${esc(x.nr===undefined||x.nr===null?"?":x.nr)}</span>
<span class="zu-platz-mass">${esc(zuMasse(x.laenge,x.breite!==undefined?x.breite:breite))}</span>
${zusatz?`<span class="zu-platz-zusatz">${esc(zusatz)}</span>`:""}
</div>`;
 }).join("");
}
function zuPlatzHtml(titel,stuecke,breite,einheit,belegt,rest){
 return `<div class="zu-platz">
<div class="zu-platz-kopf"><b>${esc(titel)}</b>
<span class="zu-platz-fuell">${esc(zuMm(belegt))} mm belegt · ${esc(zuMm(rest))} mm Rest</span></div>
${zuPlatzStueckeHtml(stuecke,breite,einheit)}
</div>`;
}
// v3.295: Der Name eines Streifens - "Abschnitt 2 · Streifen 1" bzw. nur "Streifen 3" - EINMAL
// hier, damit Belegung (Material & Zuschnitt) und Ruestblatt dieselbe Zuordnung zeigen.
// Unveraendert gegenueber der Regel, die bis v3.294 in zuBelegungHtml stand.
// v3.299, Rueckmeldung des Anwenders (Handy-Screenshot): bei mehreren Streifenbreiten stand ueberall
// "Abschnitt 1", obwohl die Fusszeile zwei Abschnitte nennt. zuStreifenTitel zaehlt je Gruppe; eine
// mitfahrende Gruppe (Trittbrett-Mischung, js/29 ebaMischeAbschnitte) hat gar keinen eigenen. Hier die
// plan-weite Nummer, nur aus den GESPEICHERTEN Daten rekonstruiert - eine zusaetzlich gespeicherte
// Abschnitts-ID waere eine Aenderung von measurements.data und liesse bei jeder erteilten Freigabe die
// Freigabe verfallen (Trigger schuetze_measurement_workflow).
//   ohne Mischung: die Gruppen sind getrennte Abschnitte - fortlaufend gezaehlt.
//   mit Mischung:  je Abschnittlaenge gibt es so viele Abschnitte wie Wirt-Streifen (die nicht
//                  mischungsGast sind); die Gaeste werden so verteilt, dass jeder Abschnitt in die
//                  Rollenbreite passt (Rueckwaertssuche - jede gueltige Verteilung ist auch
//                  schneidbar). Gelingt das nicht, bleibt der Streifen ohne Nummer (Rueckfall auf
//                  die bisherige Anzeige) statt eine falsche zu behaupten.
// Rueckgabe: Map Streifen -> "Abschnitt N · L mm", oder null (eine Gruppe, Tafel, Stange).
const ZU_ABSCHNITT_CACHE=new WeakMap();
// Wie viele Abschnitte welcher Laenge der Plan EINMAL von der Rolle zieht - dieselbe Quelle wie die
// Fusszeile unter der Liste ("1 × 1'215 mm + 1 × 595 mm ab Rolle", zuAbschnitte), also die Zahl, mit der
// der Anwender vergleicht. Null, wenn der Plan sie nicht traegt.
function zuAbschnittZahlen(p){
 const best=(p.moeglich||[])[0];
 if(!best)return null;
 const a=zuAbschnitte(best,p);
 const l=Array.isArray(a.teile)?a.teile:((a.n>0&&a.laenge>0)?[{n:a.n,laenge:a.laenge}]:null);
 if(!l||!l.length)return null;
 const k=new Map();
 l.forEach(t=>k.set(Math.round(zuZahl(t.laenge)),(k.get(Math.round(zuZahl(t.laenge)))||0)+zuZahl(t.n)));
 return k;
}
// Rueckgabe: Map Streifen -> {nr, laenge, idx} (Abschnittsnummer, Abschnittlaenge ab Rolle bzw. Tafel,
// laufende Nummer des Streifens IM Abschnitt), oder null (Stange, kein Plan).
// Gespeichert ist je Streifen nur {stuecke, rest, abschnittLaenge, abschnittNr}; ob Streifen verschiedener
// Breiten in EINEM Abschnitt liegen (Trittbrett-Mischung, js/29 ebaMischeAbschnitte), steht dort nicht
// (mischungsGast wird nicht mitgespeichert). Es laesst sich aber ablesen: zieht der Plan weniger Abschnitte
// von der Rolle (Fusszeile) als die Gruppen einzeln brauchten, wurde gemischt. Dann werden alle Streifen
// nach Abschnittlaenge auf genau so viele Abschnitte verteilt, wie die Fusszeile nennt, jeder in die
// Rollenbreite passend (Rueckwaertssuche). Eine neu gespeicherte Abschnitts-ID waere eine Aenderung von
// measurements.data und liesse bei jeder erteilten Freigabe die Freigabe verfallen (Trigger
// schuetze_measurement_workflow) - deshalb wird nichts gespeichert.
function zuAbschnittInfo(p){
 if(!p||p.art==="stange")return null;
 const gruppen=p.gruppen||[];
 if(!gruppen.length)return null;
 if(ZU_ABSCHNITT_CACHE.has(p))return ZU_ABSCHNITT_CACHE.get(p);
 // v3.328: gemischte Rollen - jeder Block fuer sich, die Abschnittsnummern laufen ueber alle Rollen fortlaufend weiter.
 const bl=zuMischBloecke(p);
 if(bl){
  const ges=new Map(); let versatz=0;
  bl.forEach(({m,sub})=>{
   const t=zuAbschnittInfo(sub); if(!t)return;
   let mx=0;
   t.forEach((v,st)=>{ges.set(st,{nr:v.nr+versatz,laenge:v.laenge,idx:v.idx,rolle:m.breite});mx=Math.max(mx,v.nr)});
   versatz+=mx;
  });
  ZU_ABSCHNITT_CACHE.set(p,ges);
  return ges;
 }
 const tafel=zuIstTafel(p);
 const info=new Map();
 const zaehler=new Map();
 const setze=(st,n,L)=>{const i=(zaehler.get(n)||0)+1;zaehler.set(n,i);info.set(st,{nr:n,laenge:L,idx:i})};
 // 1) Abschnitte je Gruppe fuer sich, fortlaufend gezaehlt (ohne Mischung ist das die Wahrheit)
 let nr=0;
 const einzeln=[];
 gruppen.forEach(g=>{
  const gL=tafel?(zuZahl(g.tafelLaenge)||zuZahl(p.formLaenge)||zuZahl(p.tafelLaenge))
             :(zuZahl(g.abschnittLaenge)||zuZahl(p.abschnittLaenge));
  const je=Math.max(1,Math.round(zuZahl(g.jeAbschnitt))||1);
  const schl=new Map();
  (g.streifen||[]).forEach((st,i)=>{
   const k=(st.abschnittNr!==undefined&&st.abschnittNr!==null)?"n"+st.abschnittNr:"i"+Math.floor(i/je);
   if(!schl.has(k))schl.set(k,++nr);
   const eigen=zuZahl(st.abschnittLaenge);
   // Rolle mit einem Streifen je Abschnitt: jeder wird nur so lang gezogen wie noetig (L - Rest).
   const L=eigen>0?eigen:((!tafel&&je===1)?Math.max(0,gL-zuZahl(st.rest)):gL);
   einzeln.push({st,A:zuZahl(g.breite),La:Math.round(L),n:schl.get(k)});
  });
 });
 const K=tafel?null:zuAbschnittZahlen(p);
 const kSumme=K?Array.from(K.values()).reduce((a,b)=>a+b,0):0;
 let gemischtOk=false;
 if(K&&kSumme>0&&kSumme<nr){
  // 2) Mischung: alle Streifen nach Laenge auf die K Abschnitte verteilen
  const geo=zuGeometrie(p);
  const B=geo.length?zuZahl(geo[0].B):0;
  const fuge=(typeof ebaSchnittfuge==="function")?ebaSchnittfuge():0;
  const laengen=Array.from(K.keys()).sort((a,b)=>b-a);
  const alleLaengenDa=einzeln.every(e=>K.has(e.La));
  if(alleLaengenDa){
   const zuordnung=new Map();   // st -> {n, La}
   let nn=0, ok=true;
   laengen.forEach(La=>{
    if(!ok)return;
    const k=K.get(La);
    const units=einzeln.filter(e=>e.La===La).sort((a,b)=>b.A-a.A);
    if(!units.length){ok=false;return}
    const frei=new Array(k).fill(B>0?B:Infinity);
    const belegt=new Array(k).fill(0);
    const wohin=new Array(units.length).fill(-1);
    let schritte=0;
    const suche=i=>{
     if(i===units.length)return belegt.every(x=>x>0);
     if(++schritte>20000)return false;
     const probiert=new Set();
     for(let j=0;j<k;j++){
      const kosten=units[i].A+(belegt[j]>0?fuge:0);
      if(frei[j]+1e-9<kosten||probiert.has(frei[j]+"|"+belegt[j]))continue;
      probiert.add(frei[j]+"|"+belegt[j]);
      frei[j]-=kosten; belegt[j]++; wohin[i]=j;
      if(suche(i+1))return true;
      frei[j]+=kosten; belegt[j]--; wohin[i]=-1;
     }
     return false;
    };
    if(!suche(0)){ok=false;return}
    const nummern=[];for(let j=0;j<k;j++)nummern.push(++nn);
    units.forEach((u,i)=>zuordnung.set(u.st,{n:nummern[wohin[i]],La}));
   });
   if(ok&&zuordnung.size===einzeln.length){
    einzeln.forEach(e=>{const z=zuordnung.get(e.st);setze(e.st,z.n,z.La)});
    gemischtOk=true;
   }
  }
 }
 if(!gemischtOk)einzeln.forEach(e=>setze(e.st,e.n,e.La));
 ZU_ABSCHNITT_CACHE.set(p,info);
 return info;
}
// Titel fuer die Belegung auf der Material-Seite - nur bei mehreren Streifenbreiten (Rolle); eine Gruppe
// allein behaelt zuStreifenTitel.
function zuAbschnittTitel(p){
 if(!p||zuIstTafel(p)||(p.gruppen||[]).length<2)return null;
 const info=zuAbschnittInfo(p);
 if(!info)return null;
 const t=new Map();
 info.forEach((v,st)=>t.set(st,zuWort(p).abschnitt+" "+v.nr+(v.laenge>0?" · "+zuMm(v.laenge)+" mm":"")+" · Streifen "+v.idx));
 return t;
}
function zuStreifenTitel(g,p){
 const je=Math.max(1,Math.round(zuZahl(g.jeAbschnitt))||1);
 // v3.83: die Anzahl Abschnitte entscheidet ueber "Abschnitt N · Streifen M" vs. nur
 // "Streifen N" - direkt aus g.abschnitte, nicht aus zuAbschnitte().
 const mehrereAbschnitte=zuZahl(g.abschnitte)>1;
 let letzterAbschnitt=null, indexImAbschnitt=0;
 return (g.streifen||[]).map((s,i)=>{
  // v3.83: bei mehreren Abschnittlaengen traegt jeder Streifen seine eigene Abschnittnummer.
  if(s.abschnittNr!==undefined){
   if(s.abschnittNr!==letzterAbschnitt){letzterAbschnitt=s.abschnittNr;indexImAbschnitt=0}
   indexImAbschnitt++;
   return zuWort(p).abschnitt+" "+s.abschnittNr+" · Streifen "+indexImAbschnitt;
  }
  // Streifen 1..je gehoeren zum ersten Abschnitt, je+1..2je zum zweiten.
  return mehrereAbschnitte
   ?zuWort(p).abschnitt+" "+(Math.floor(i/je)+1)+" · Streifen "+(i%je+1)
   :"Streifen "+(i+1);
 });
}
function zuBelegungHtml(p){
 const e=p.einheit||"Stück";
 const wort=e==="Segment"?"Segmente":(e==="Schar"?"Scharen":"Stücke");
 if(p.art==="stange"){
  const st=p.stangen||[];
  if(!st.length)return "";
  // v3.80: die Normlaenge steht im Titel ("Stange 1 · 6'000 mm"), nicht nur
  // "belegt"/"Rest" - bei der Stange (anders als bei Rolle/Tafel) koennen
  // MEHRERE verschiedene Laengen im selben Plan gemischt sein (z. B. zwei
  // 5'000er und eine 6'000er Stange), das war bisher nicht zu sehen.
  return `<h2 style="margin-top:14px">So liegen die ${wort} in den Stangen</h2>
<div class="zu-belegung">${st.map((s,i)=>zuPlatzHtml("Stange "+(i+1)+" · "+zuMm(s.laenge)+" mm",s.stuecke,p.breite,e,
   zuZahl(s.laenge)-zuZahl(s.rest),s.rest)).join("")}</div>`;
 }
 const gruppen=p.gruppen||[];
 if(!gruppen.length)return "";
 const eine=gruppen.length===1;
 return `<h2 style="margin-top:14px">So liegen die ${wort} in den Streifen</h2>`
  +gruppen.map(g=>{
   const L=zuZahl(g.abschnittLaenge)||zuZahl(g.tafelLaenge)||zuZahl(g.rollenLaenge);
   const je=Math.max(1,Math.round(zuZahl(g.jeAbschnitt))||1);
   // v3.83: die Anzahl Abschnitte entscheidet ueber "Abschnitt N · Streifen M"
   // vs. nur "Streifen N" - direkt aus g.abschnitte, nicht aus zuAbschnitte():
   // bei mehreren unterschiedlichen Abschnittlaengen (teile) liefert
   // zuAbschnitte() dafuer bewusst kein einzelnes n (siehe dort).
   const titel_=zuStreifenTitel(g,p);
   return `${eine?"":`<div class="small zu-gruppe"><b>Streifenbreite ${esc(zuMm(g.breite))} mm</b>
· ${esc(zuAbschnittText(g,p))} ${esc(zuWort(p).ab)}${g.rolleBreite?esc(" ("+zuMm(g.rolleBreite)+"er Rolle)"):""}</div>`}
<div class="zu-belegung">${(g.streifen||[]).map((s,i)=>{
    const belegt=(s.stuecke||[]).reduce((a,x)=>a+zuZahl(x.laenge),0);
    const titel=((zuAbschnittTitel(p)||new Map()).get(s))||titel_[i];
    // v3.83: s.rest kann legitim 0 sein (Streifen exakt ausgenutzt) - das
    // waere mit "||" faelschlich als 0 verworfen und durch L-belegt ersetzt,
    // was bei mehreren Abschnittlaengen NICHT mehr automatisch 0 waere.
    const kapazitaet=zuZahl(s.abschnittLaenge)||L;
    const rest=(s.rest===undefined||s.rest===null)?Math.max(0,kapazitaet-belegt):zuZahl(s.rest);
    return zuPlatzHtml(titel,s.stuecke,g.breite,e,belegt,rest);
   }).join("")||'<div class="zu-platz-leer">–</div>'}</div>`;
  }).join("");
}

// Die eine Darstellung. Jede Art ruft genau diese Funktion auf.
// Die Bilanz als Block. Sie steht in der Hauptansicht, weil sie genau die
// Frage beantwortet, um die es beim Material geht: wie viel geht drauf und
// was bleibt. Die technischen Einzelheiten bleiben aufklappbar darunter.
function zuBilanzZeile(label,wert,anteil,klasse){
 return `<div class="zu-bilanz-zeile${klasse?" "+klasse:""}">
<span class="zu-bilanz-name">${esc(label)}</span>
<span class="zu-bilanz-wert">${esc(wert)}</span>
<span class="zu-bilanz-anteil">${anteil===null?"":esc(anteil)}</span>
</div>`;
}
// Der Satz zur Schnittfuge muss zwei verschiedene Dinge auseinanderhalten:
// was die Firma EINGESTELLT hat, und was in DIESEM Zuschnitt tatsaechlich
// anfaellt. Beides kann 0 sein, aus voellig verschiedenen Gruenden - ein Plan,
// bei dem jedes Stueck allein in seinem Streifen liegt und die Rollenbreite
// ohne Laengsschnitt aufgeht, hat auch bei 3 mm Fuge keine. Bis diese Stelle
// das trennte, behauptete sie dort faelschlich "0 mm hinterlegt".
function zuFugeHinweis(b){
 if(!b||!b.fugeBekannt||b.fuge>0)return "";
 const e=(typeof ebaSchnittfuge==="function")?ebaSchnittfuge():0;
 return e>0
  ? " In diesem Zuschnitt fällt rechnerisch keine Schnittfuge an."
  : " Für die Schnittfuge ist 0 mm hinterlegt – sie kostet in dieser Rechnung nichts.";
}
function zuBilanzHtml(p){
 const b=zuBilanz(p);
 if(!b)return "";
 const mm=b.einheit==="mm";
 const w=v=>mm?(zuMm(v)+" mm"):(zuQm(v)+" m²");
 const a=v=>b.brutto>0?Math.round(v/b.brutto*100)+" %":"";
 const grenze=(typeof restGrenze==="function")?restGrenze():null;
 if(!b.aufgeht)
  return `<div class="zu-bilanz"><div class="small zu-bilanz-kopf">Materialbilanz</div>
<div class="small" style="color:var(--muted)">Für diesen gespeicherten Plan lässt sich
die Materialbilanz nicht lückenlos aufstellen – es fehlen Angaben, und es wird
nichts geschätzt. Sie erscheint, sobald die Massaufnahme einmal neu gespeichert wird.</div></div>`;
 return `<div class="zu-bilanz">
<div class="small zu-bilanz-kopf">Materialbilanz <span style="color:var(--muted)">– geplant, aus diesem Zuschnitt</span></div>
${zuBilanzZeile(mm?"Normlänge gesamt":(b.ausRestenAnzahl?"Neumaterial von der Rolle":"Ausgangsmaterial"),w(b.brutto),null,"zu-bilanz-summe")}
${b.ausRestenAnzahl?zuBilanzZeile("Aus vorhandenen Reststücken",w(b.ausResten),null,"zu-bilanz-rest"):""}
${zuBilanzZeile("Zuschnitte",w(b.zuschnitte),a(b.zuschnitte))}
${b.fugeBekannt?zuBilanzZeile("Schnittfuge",w(b.fuge),a(b.fuge)):""}
${zuBilanzZeile("Reste verwertbar",w(b.verwertbar),a(b.verwertbar))}
${zuBilanzZeile("Verschnitt (zu klein)",w(b.zuKlein),a(b.zuKlein))}
<div class="small zu-bilanz-fuss">Effektiv verloren: <b>${esc(w(b.verlust))}</b>${
 b.fugeBekannt?" (Schnittfuge und zu kleine Reste)":" (zu kleine Reste)"}.${
 grenze!==null?" Aufgehoben wird ab "+esc(zuMm(grenze))+" mm Länge.":""}${
 zuFugeHinweis(b)}</div>
</div>`;
}

// ---------------------------------------------------------------------------
// Was aus vorhandenen Reststücken geschnitten wird (v3.27)
// ---------------------------------------------------------------------------
// Gerechnet hat das restVorabzug() (js/42) mit der BESTEHENDEN Packrechnung;
// hier wird es nur dargestellt. Der Plan trägt das Ergebnis als p.ausResten.
//
// Gebucht ist damit nichts: der Rest wird erst mit "Hier verwenden" als
// verbraucht vermerkt. Das steht ausdrücklich dabei.
function zuAusRestenHtml(p){
 const liste=(p&&p.ausResten)||[];
 if(!liste.length)return "";
 const zahl=liste.reduce((a,x)=>a+(x.stuecke||[]).length,0);
 // v3.29: zuAlleStuecke() enthaelt diese Stuecke jetzt selbst - sie duerfen
 // nicht ein zweites Mal dazugezaehlt werden.
 return `<div class="zu-ausreste">
<div class="small zu-ausreste-kopf"><b>Aus dem Reststücke-Lager</b> – ${zahl} von
${zuAlleStuecke(p).length} Stück lassen sich aus vorhandenen Resten schneiden.</div>
${liste.map(x=>`<div class="small zu-ausrest">
<b>${esc(zuMm(x.laenge))} × ${esc(zuMm(x.breite))} mm</b>${
 x.rest&&x.rest.material_name?" · "+esc(x.rest.material_name):""} →
${(x.stuecke||[]).map(st=>`<span class="zu-ausrest-nr">${esc(String(st.nr))}</span>`).join(" ")}
<span style="color:var(--muted)">(${esc((x.stuecke||[]).map(st=>zuMm(st.laenge)+" mm").join(" · "))})</span>
</div>`).join("")}
<div class="small" style="color:var(--muted)">Diese Stücke stehen unten in der
Liste mit dem Vermerk „aus Rest" – sie müssen geschnitten und abgehakt werden
wie alle anderen. Ist der Rest beim Rüsten doch nicht da, wird das Stück von
der Rolle geschnitten. Die Rolle selbst wird nur noch für den Rest gerechnet.
<b>Verbucht ist damit nichts</b>: der Rest gilt erst dann als verbraucht, wenn
er unten ausdrücklich verwendet wird.</div>
</div>`;
}

function zuschnittHtml(p){
 if(!p)return "";
 const leer=p.art==="stange"?!(p.stangen||[]).length&&!(p.zuLang||[]).length
                            :!(p.gruppen||[]).length;
 if(leer)return zuAusRestenHtml(p)
   +`<div class="info">${esc((p.ausResten||[]).length
      ?"Für die Rolle bleibt nichts übrig – alle Stücke lassen sich aus vorhandenen Reststücken schneiden."
      :(p.leer||"Noch nichts zuzuschneiden."))}</div>`
   +zuMeldungenHtml(p);
 // Hauptansicht: die Liste. Alles Technische steht darunter aufklappbar -
 // auf dem Handy zaehlt zuerst, WAS zugeschnitten wird.
 // Reststuecke-Lager (v3.04): passende Reste anzeigen und die Reste dieses
 // Zuschnitts einlagerbar machen. Hier EINMAL eingehaengt, damit es in jedem
 // Modul erscheint, ohne es zehnmal einzubauen. Fehlt js/42, bleibt es leer.
 const reste=(typeof restBlockHtml==="function")?restBlockHtml(p,p.material):"";
 return `${zuAusRestenHtml(p)}
${zuListeHtml(p)}
${zuMeldungenHtml(p)}
${zuBilanzHtml(p)}
${reste}
<details class="zu-details"><summary>Einzelheiten: ${esc(zuIstTafel(p)?"Tafelformate":"Rollenbreiten")} vergleichen, Belegung der Streifen</summary>
<div class="info">${p.einleitung||""}${p.zusatz?" "+p.zusatz:""}</div>
${zuKennzahlenHtml(p)}
${zuPlanTabelleHtml(p)}
${zuBelegungHtml(p)}
${p.quelle?`<div class="small zu-hinweis">${p.quelle}</div>`:""}
</details>`;
}

// Einleitungssatz, damit er nirgends abweicht.
const ZU_EINLEITUNG_ROLLE="Von der Rolle werden <b>Abschnitte</b> abgezogen und quer in "
 +"<b>Streifen der Abwicklungsbreite</b> geteilt. Ein Abschnitt ist immer so lang wie das "
 +"<b>längste Blech</b>; es werden so viele gezogen, wie es braucht. In einem Streifen dürfen "
 +"mehrere Stücke hintereinander liegen, solange sie zusammen in einen Abschnitt passen – "
 +"jedes Blech wird auf seine genaue Länge geschnitten.";
const ZU_EINLEITUNG_STANGE="Aus welchen Normlängen die Stücke geschnitten werden, so dass "
 +"möglichst wenig übrig bleibt. Mehrere Stücke dürfen aus derselben Stange kommen.";
const ZU_QUELLE_ROLLE="Blechlager aus <b>Einstellungen → Allgemein → Rollenbreiten des "
 +"Blechlagers</b> (firmenweit, gilt für alle Arten).";
const ZU_QUELLE_STANGE="Normlängen aus <b>Einstellungen → Massaufnahmen → Dachrinne</b>.";
// v3.33: dieselbe Rechnung, andere Herkunft des Materials.
const ZU_EINLEITUNG_TAFEL="Aus <b>Tafeln</b> werden quer <b>Streifen der Abwicklungsbreite</b> "
 +"geteilt. Anders als bei der Rolle hat eine Tafel eine <b>feste Länge</b>: jedes Stück muss "
 +"hineinpassen. In einem Streifen dürfen mehrere Stücke hintereinander liegen, solange sie "
 +"zusammen in eine Tafel passen – jedes Blech wird auf seine genaue Länge geschnitten.";
const ZU_QUELLE_TAFEL="Tafelformate aus <b>Material &amp; Blech</b> (Einstellungen → Blech → "
 +"Material &amp; Blech), Eintrag mit Form <b>Tafel</b> und Format.";
// Einleitung und Quelle je Art - damit kein Modul sie selbst zusammensucht.
function zuEinleitung(form){return form==="tafel"?ZU_EINLEITUNG_TAFEL:ZU_EINLEITUNG_ROLLE}
function zuQuelle(form){return form==="tafel"?ZU_QUELLE_TAFEL:ZU_QUELLE_ROLLE}
// Der Registername nennt, WORAUS geschnitten wird. Eine Stelle fuer alle elf
// Register-Module - sonst haetten elf Module elf Schreibweisen fuer dasselbe.
function zuTitel(nr,form){
 return nr+" · Zuschnitt aus "+(form==="tafel"?"Tafelmaterial":"Rollenblech");
}

// ---------------------------------------------------------------------------
// Dieselbe Zuschnittliste im Ausdruck
// ---------------------------------------------------------------------------
// Das PDF zeigt denselben Aufbau wie der Bildschirm: zuerst die Liste
// STÜCKZAHL × LÄNGE × ABWICKLUNG, danach die technischen Einzelheiten
// (Rollenbreiten-Vergleich, Belegung der Streifen).
//
// Gerechnet wird NICHTS - gedruckt wird ausschliesslich der beim Speichern
// abgelegte Plan, damit ein einmal gedrucktes Blatt gleich bleibt, auch wenn
// die Rollenbreiten der Firma später geändert werden.
//
// Die Module haben ihren Plan historisch in zwei Formen abgelegt:
//   flach    {rollenLaenge, streifen:[…]}           bzw. {verteilung:{streifen}}
//   gruppiert{gruppen:[{breite,rollenLaenge,streifen}]}  (Freies Profil, Lukarne)
// Bis v2.87 hiess das Feld "tafelLaenge" und die Rollenlaenge war
// Tafeln x Tafellaenge. zuPlanAusGespeichert() bringt alle Formen in die eine
// Planform von oben - ein aelterer Datensatz druckt weiterhin SEINE Zahlen.
function zuPlanAusGespeichert(r,breite,einheit){
 if(!r)return null;
 // v3.79: Normlaengen (Rinne halbrund) sind eindimensional (art:"stange",
 // js/29 ebaZuschnittPlan-Gegenstueck raZuschnittPlan) - keine Rolle/Tafel mit
 // gruppen/streifen. zuAlleStuecke() (oben) liest p.stangen direkt, deshalb
 // reicht es, den gespeicherten Plan unveraendert durchzureichen.
 if(r.art==="stange")
  return {art:"stange",einheit:einheit||r.einheit||"Stück",
   breite:zuZahl(breite)||zuZahl(r.breite),
   stangen:Array.isArray(r.stangen)?r.stangen:[],
   gesamt:r.gesamt,summeStuecke:r.summeStuecke,verschnitt:r.verschnitt,
   zuLang:r.zuLang||[],optimal:r.optimal!==false};
 let gruppen=[];
 if(Array.isArray(r.gruppen)&&r.gruppen.length)gruppen=r.gruppen;
 else{
  const st=Array.isArray(r.streifen)?r.streifen
          :((r.verteilung&&r.verteilung.streifen)||[]);
  const b=zuZahl(breite)||zuZahl(r.abwicklung);
  if(st.length)gruppen=[{breite:b,rollenLaenge:r.rollenLaenge,
    abschnittLaenge:r.abschnittLaenge,tafelLaenge:r.tafelLaenge,
    jeAbschnitt:r.jeAbschnitt,abschnitte:r.abschnitte,streifen:st}];
 }
 const optimal=r.optimal===false?false
   :((r.verteilung&&r.verteilung.optimal===false)?false:true);
 // v3.33: die Form steht seit v3.33 im gespeicherten Plan. Ein aelterer
 // Plan hat sie nicht - dann ist es Rollenblech, so wie er gerechnet wurde.
 // Es wird NICHTS nachgerechnet.
 const form=(r.form==="tafel")?"tafel":"rolle";
 return {art:form,form,formLaenge:r.formLaenge||null,
  formGrund:r.formGrund||"",formQuelle:r.formQuelle||"",
  einheit:einheit||"Stück",
  streifenbreiten:gruppen.map(g=>zuZahl(g.breite)).filter(x=>x>0),
  gruppen,moeglich:r.moeglich||[],netto:r.netto,
  rollenLaenge:r.rollenLaenge,abschnittLaenge:r.abschnittLaenge,
  // v3.29: die Stuecke aus vorhandenen Resten. Bis v3.28 wurde ausResten
  // hier NICHT gelesen (und von den Modulen gar nicht erst gespeichert) -
  // die Stuecke fehlten dadurch im wiederhergestellten Plan ganz.
  ausResten:r.ausResten||[],
  tafelLaenge:r.tafelLaenge,optimal};
}
// v3.328: Ein VOR v3.328 gespeicherter Rollenplan kennt die Mischung mehrerer Rollen nicht - Werkstatt, Rüstblatt und
// Rüstliste lesen immer den gespeicherten Plan. Damit sie die Mischung trotzdem zeigen, wird so ein Plan beim Lesen mit
// derselben EINEN Packrechnung (ebaFormatPlan) neu gerechnet - aus seinen eigenen Stücken und den gespeicherten
// Rollenbreiten (r.breiten, schon nach der Auswahl der Massaufnahme gefiltert). Übernommen wird NUR eine echte Mischung;
// sonst bleibt der gespeicherte Plan unverändert. Nichts wird zurückgeschrieben. Stücknummern und Längen bleiben gleich,
// das Abhaken (nach Nummer/Länge/Breite) ist davon nicht betroffen.
function zuNeuMischen(p,r){
 try{
  if(!p||p.art==="stange"||zuIstTafel(p)||typeof ebaFormatPlan!=="function")return p;
  const b0=(p.moeglich||[])[0];
  if(!b0||!(p.gruppen||[]).length)return p;
  // Welche Rollen gelten JETZT? Das Blechlager der Firma, eingeschränkt auf die Wahl dieser Massaufnahme (leer = ganzes Lager).
  // Ohne Lager (oder ohne Modul) gelten die mit dem Plan gespeicherten Rollenbreiten, eingeschränkt auf die gespeicherte Wahl.
  const wahl=((r&&r.auswahl)||[]).map(Number).filter(x=>x>0);
  const gespeichert=((r&&r.breiten)||[]).map(Number).filter(x=>x>0);
  const lager=(typeof zuLagerbreiten==="function")?zuLagerbreiten():[];
  let jetzt=lager.length?zuRollenGefiltert(wahl)
    :(wahl.length?gespeichert.filter(x=>wahl.indexOf(x)>=0):gespeichert);
  jetzt=Array.from(new Set(jetzt.map(Number).filter(x=>x>0))).sort((a,c)=>c-a);
  if(!jetzt.length)return p;
  const gleiche=gespeichert.length>0&&JSON.stringify(gespeichert.slice().sort((a,c)=>c-a))===JSON.stringify(jetzt);
  // Nichts zu tun: dieselben Rollen wie beim Speichern und schon gemischt bzw. gar nicht mischbar.
  if(gleiche&&(Array.isArray(b0.mischung)||(p.gruppen||[]).length<2))return p;
  const nachBreite=new Map();
  (p.gruppen||[]).forEach(g=>(g.streifen||[]).forEach(st=>(st.stuecke||[]).forEach(x=>{
   const A=zuZahl(x.breite)||zuZahl(g.breite);
   if(!(A>0)||!(zuZahl(x.laenge)>0))return;
   if(!nachBreite.has(A))nachBreite.set(A,[]);
   nachBreite.get(A).push({nr:x.nr,laenge:zuZahl(x.laenge),merkmal:x.merkmal,hinweis:x.hinweis});
  })));
  if(!nachBreite.size)return p;
  const gruppen=Array.from(nachBreite.keys()).sort((a,c)=>c-a).map(A=>({breite:A,bleche:nachBreite.get(A)}));
  const neu=ebaFormatPlan({gruppen,formate:jetzt.map(b=>({breite:b,laenge:null,text:b+" mm"})),form:"rolle",netto:zuZahl(p.netto)});
  if(!neu||!neu.bestes||!(neu.moeglich||[]).length)return p;   // keine der Rollen passt: der gespeicherte Plan bleibt
  // Unverändert gespeicherte Rollen und keine Mischung: der gespeicherte Plan bleibt genau so.
  if(gleiche&&!Array.isArray(neu.bestes.mischung))return p;
  return Object.assign({},p,{gruppen:neu.gruppen,moeglich:neu.moeglich,streifenbreiten:gruppen.map(g=>g.breite)});
 }catch(e){return p}
}
function zuDruckHtml(r,breite,einheit,zusatz){
 const p=zuPlanAusGespeichert(r,breite,einheit);
 if(!p||!p.gruppen.length)return "";
 const gruppen=zuGruppen(p);
 if(!gruppen.length)return "";
 const eh=p.einheit;
 // Die Positionsnummern bekommen eine EIGENE Spalte - im Ausdruck ist das die
 // Frage, die auf der Baustelle beantwortet werden muss.
 const zeilen=gruppen.map(g=>{
  const nummern=g.stuecke.map(x=>x.nr).filter(x=>x!==undefined&&x!==null);
  const hinweise=[];
  g.stuecke.forEach(x=>{if(x.hinweis&&hinweise.indexOf(x.hinweis)<0)hinweise.push(x.hinweis)});
  const bem=[];
  if(g.merkmal)bem.push(g.merkmal);
  if(hinweise.length)bem.push(hinweise.join(" · "));
  return `<tr><td><b>${g.stuecke.length} ×</b></td>
<td><b>${esc(zuMm(g.laenge))}${g.breite>0?" × "+esc(zuMm(g.breite)):""} mm</b></td>
<td><b>${esc(nummern.join(", "))||"–"}</b></td>
<td>${esc(bem.join(" · "))||"–"}</td></tr>`;
 }).join("");
 const b0=(p.moeglich||[])[0];
 const w=zuWort(p), tafel=zuIstTafel(p);
 const abText=zuAbschnittText(b0,p);
 const kopf=b0?w.kopf+" "+zuFormatText(b0,p)
   +(abText!=="–"?" · "+abText+" "+w.ab:"")
   +(zuStreifenZahl(b0,p)>0?" · "+zuStreifenZahl(b0,p)+" Streifen je "+w.abschnitt:""):"";
 const vergleich=(p.moeglich||[]).length?`<table class="eb-cutlist">
<thead><tr><th>${esc(w.einheit)}</th><th>Streifen je ${esc(w.abschnitt)}</th><th>${esc(tafel?"Tafeln":"Ab Rolle")}</th><th>Fläche (m²)</th><th>Verschnitt (m²)</th></tr></thead>
<tbody>${p.moeglich.map((x,i)=>`<tr><td>${esc(zuFormatText(x,p))}${i===0?" (beste)":""}</td>
<td>${esc(zuStreifenZahl(x,p)||"–")}</td>
<td>${esc(zuAbschnittText(x,p))}</td>
<td>${esc(zuQm(x.flaeche))}</td><td>${esc(zuQm(x.verschnitt))}</td></tr>`).join("")}</tbody>
</table>`:"";
 const belegung=p.gruppen.map(g=>{
  const st=(g.streifen||[]);
  if(!st.length)return "";
  const L=zuZahl(g.abschnittLaenge)||zuZahl(g.tafelLaenge)||zuZahl(g.rollenLaenge);
  const je=Math.max(1,Math.round(zuZahl(g.jeAbschnitt))||1);
  const ab=zuAbschnitte(g,p);
  return `<table class="eb-cutlist">
<thead><tr><th>Streifen à ${esc(zuMm(g.breite))} mm</th><th>${eh==="Segment"?"Segmente":"Stücke"} · Nr. und Zuschnitt</th><th>belegt (mm)</th><th>Rest (mm)</th></tr></thead>
<tbody>${st.map((sf,i)=>{
   const belegt=(sf.stuecke||[]).reduce((a,x)=>a+zuZahl(x.laenge),0);
   const titel=(ab.n>1)?(Math.floor(i/je)+1)+"."+(i%je+1):String(i+1);
   return `<tr><td>${esc(titel)}</td>
<td>${esc((sf.stuecke||[]).map(x=>eh+" "+x.nr+" = "+zuMm(x.laenge)+" mm").join("   ·   "))||"–"}</td>
<td>${esc(zuMm(belegt))}</td><td>${esc(zuMm(zuZahl(sf.rest)||Math.max(0,L-belegt)))}</td></tr>`;
  }).join("")}</tbody>
</table>`;
 }).join("");
 // Die Ueberschrift sagt ausdruecklich, WORAUS geschnitten wird - im
 // Ausdruck ist das die erste Angabe, die die Werkstatt braucht.
 return `<div class="eb-section-head">Zuschnitt aus ${tafel?"Tafelmaterial":"Rollenblech"}</div>
<table class="eb-cutlist">
<thead><tr><th>Anzahl</th><th>Zuschnitt L × B (mm)</th><th>${esc(eh)} Nr.</th><th>Bemerkung</th></tr></thead>
<tbody>${zeilen}</tbody>
</table>
<div class="note">${kopf?esc(kopf)+". ":""}${tafel
 ?`Aus Tafeln werden quer Streifen der Abwicklungsbreite geteilt. Eine Tafel hat eine feste
Länge; jedes Stück muss hineinpassen. In einem Streifen dürfen mehrere Stücke hintereinander
liegen. Die Streifennummer &quot;2.3&quot; heisst: Tafel 2, Streifen 3.`
 :`Von der Rolle werden Abschnitte abgezogen und quer in Streifen der Abwicklungsbreite
geteilt. Ein Abschnitt ist so lang wie das längste Blech; in einem Streifen dürfen mehrere
Stücke hintereinander liegen. Die Streifennummer &quot;2.3&quot; heisst: Abschnitt 2,
Streifen 3.`}${zusatz?" "+zusatz:""}${p.optimal===false
  ?" Beste gefundene Verteilung – nicht nachweislich die günstigste.":""}</div>
${vergleich}${belegung}`;
}


// ---------------------------------------------------------------------------
// Welche Rollen sollen fuer DIESE Massaufnahme verwendet werden?
// ---------------------------------------------------------------------------
// Das Blechlager der Firma steht in den Einstellungen (Allgemein). Hier wird
// je Massaufnahme davon eine Teilmenge angehakt - z. B. weil auf dieser
// Baustelle nur die 1000er Rolle mitkommt.
//
// Leere Auswahl = alle Rollen des Lagers. So aendert sich fuer eine bestehende
// Aufnahme nichts, solange niemand etwas abwaehlt.
function zuLagerbreiten(){
 return (typeof ebaRollenbreiten==="function")?ebaRollenbreiten():[];
}
function zuRollenGefiltert(gewaehlt){
 const lager=zuLagerbreiten();
 const w=(Array.isArray(gewaehlt)?gewaehlt:[]).map(Number).filter(x=>x>0);
 if(!w.length)return lager;
 const genommen=lager.filter(x=>w.indexOf(x)>=0);
 return genommen.length?genommen:lager;   // nie leer rechnen
}
// Der aufklappbare Kasten. "attribut" ist der data-Name, den das Modul in
// seinem Klick-Handler auswertet (z. B. "data-eba-rolle").
// Merkt sich, ob der Kasten offen war. Nach jedem Haken zeichnet das Modul
// neu - ohne das wuerde der Kasten dabei jedes Mal zuklappen.
let zuRollenAuf=false, zuRollenFuer="";
// v3.33: Bei Tafelmaterial gibt es keine Rollenbreite zu waehlen - die
// Formate kommen aus dem Materialbestand (Laenge UND Breite). Die
// Rollenauswahl waere dort irrefuehrend, deshalb entfaellt sie ganz.
function zuAuswahlHtml(gewaehlt,attribut,form){
 if(form==="tafel")return "";
 return zuRollenAuswahlHtml(gewaehlt,attribut);
}
function zuRollenAuswahlHtml(gewaehlt,attribut){
 if(attribut!==zuRollenFuer){zuRollenFuer=attribut;zuRollenAuf=false}
 const lager=zuLagerbreiten();
 if(!lager.length)return `<div class="ra-warnung">Im Blechlager ist keine Rollenbreite
hinterlegt – Einstellungen → Allgemein → Rollenbreiten des Blechlagers.</div>`;
 const genommen=zuRollenGefiltert(gewaehlt);
 const alle=genommen.length===lager.length;
 return `<details class="zu-rollen"${zuRollenAuf?" open":""}><summary>Rollen für diese Massaufnahme:
<b>${esc(genommen.map(x=>zuMm(x)+" mm").join(" · "))}</b>${alle?" (alle aus dem Lager)":""}</summary>
<div class="small">Aus dem Blechlager der Firma. Ohne Haken wird das ganze Lager
gerechnet – abgewählte Rollen kommen im Vergleich nicht mehr vor. Aus den
gewählten Rollen darf gemischt werden (je Streifenbreite eine Rolle), wenn das spürbar Blech spart.</div>
<div class="zu-rollen-liste">${lager.map(x=>`<label class="zu-rolle">
<input type="checkbox" ${attribut}="${x}"${genommen.indexOf(x)>=0?" checked":""}>
<span>${esc(zuMm(x))} mm</span></label>`).join("")}</div>
</details>`;
}

// Der Klick auf ein Kaestchen im Auswahlkasten. Das Modul ruft das in seinem
// bestehenden change-Handler mit einer Zeile auf.
// Rueckgabe: die neue Auswahl, oder null wenn das Ereignis nicht dazu gehoert.
function zuRollenKlick(target,attribut){
 if(!target||!target.hasAttribute||!target.hasAttribute(attribut))return null;
 const wurzel=target.closest(".zu-rollen")||document;
 const an=Array.from(wurzel.querySelectorAll("["+attribut+"]"))
   .filter(e=>e.checked).map(e=>Number(e.getAttribute(attribut)))
   .filter(x=>Number.isFinite(x)&&x>0);
 zuRollenAuf=true;          // nach dem Neuzeichnen offen bleiben
 // Gar nichts angehakt = wieder das ganze Lager. So bleibt der Zuschnitt
 // rechenbar, statt in eine leere Liste zu laufen.
 return an;
}
