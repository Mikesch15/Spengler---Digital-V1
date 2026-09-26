// Prueft v3.188: Abwicklungsrechner "Rundrohr mit schraegem Anschnitt,
// Kragen und Falz".
//
// AUFTRAG
// Aus dem hochgeladenen Auftrag: neuer Bereich "Abwicklung", Rechnung 1:1
// aus dem bestehenden Fusion-360-Script (Python) portiert, Live-Vorschau,
// Ergebnistabelle, DXF/SVG/1:1-Druck, Speichern beim Projekt.
//
// DAS ABNAHMEMASS STEHT IM AUFTRAG SELBST (Abschnitt 9):
//   Umfang neutrale Faser   343,38 mm
//   Zuschnittbreite         361,38 mm   (343,38 + 6 + 12)
//   Hoehe max (an der Naht) 371,25 mm   -> seit v3.190 370,49
//   Hoehe min               305,17 mm   -> seit v3.190 307,39
//   Kragen-Zugabe           37,13 ... 40,10 mm -> seit v3.190 ueberall 39,34
//
// DREI DIESER WERTE GELTEN NICHT MEHR. Der Anwender hat nach dem ersten
// Einsatz entschieden, dass die Zugabe ueber den ganzen Zuschnitt gleich
// sein soll ("Das ist falsch..."): ein Streifen, der um 3 mm schwankt,
// laesst sich nicht anreissen, und das Bord wird nachher geschweift. Die
// betroffenen Pruefungen sind umgestellt und mit Gegenproben gesichert,
// die das alte Verhalten ausdruecklich ausschliessen. Umfang,
// Zuschnittbreite und Biegewinkel gelten unveraendert.
//   Biegewinkel Kragen      60 ... 120 Grad
//   Streckung Kragenrand    ca. 67 %
//   "Die JS-Portierung muss diese Werte auf 0,1 mm genau treffen."
// Genau das ist Abschnitt A. Er ist der Grund, warum die Rechnung in js/77
// ohne DOM steht: so laesst sie sich ueberhaupt nachrechnen.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-abwicklung-v3-188.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs"),vm=require("vm");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
const nurCode=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")
                  .replace(/"(\\.|[^"\\])*"/g,'""').replace(/'(\\.|[^'\\])*'/g,"''")
                  .replace(/`(\\.|[^`\\])*`/g,"``");
const nah=(a,b,tol)=>Math.abs(Number(a)-Number(b))<=(tol===undefined?0.1:tol);

(async()=>{
 // ---- A  Die sieben Werte aus Abschnitt 9 --------------------------------
 // OHNE Browser: js/77 darf das DOM nicht brauchen. Waere hier ein
 // document-Zugriff drin, schluege schon das Laden fehl.
 console.log("\nA · Die Abnahmewerte des Auftrags, auf 0,1 mm");
 vm.runInThisContext(lies("js/77-abwicklung.js"));
 const r=abwRechne({});
 p(r.ok===true,"die Standardmasse rechnen durch",r.fehler);
 p(nah(r.L,343.38),"Umfang neutrale Faser 343,38",r.L);
 p(nah(r.breite,361.38),"Zuschnittbreite 361,38",r.breite);
 // v3.190: DREI Werte des Auftrags gelten nicht mehr - auf ausdruecklichen
 // Entscheid des Anwenders ("Das ist falsch"): die Zugabe ist jetzt ueber den
 // ganzen Zuschnitt gleich, statt je Punkt mit dem dortigen Biegewinkel
 // gerechnet. Die alten Erwartungen werden nicht geloescht, sondern auf die
 // neuen umgestellt UND mit einer Gegenprobe gesichert, die das alte
 // Verhalten ausdruecklich ausschliesst.
 p(nah(r.hoeheMax,370.49),"Hoehe max an der Naht 370,49 (war 371,25)",r.hoeheMax);
 p(nah(r.hoeheMin,307.39),"Hoehe min 307,39 (war 305,17)",r.hoeheMin);
 p(nah(r.zugMin,39.34)&&nah(r.zugMax,39.34),
   "Schweifbord-Zugabe 39,34 - UEBERALL DIESELBE",[r.zugMin,r.zugMax]);
 p(Math.abs(r.zugMax-r.zugMin)<0.0001,
   "der Zuschnittstreifen ist an keiner Stelle breiter oder schmaler",r.zugMax-r.zugMin);
 // Gegenprobe gegen einen Rueckfall: die alten Werte duerfen NICHT mehr
 // herauskommen.
 p(!nah(r.zugMin,37.13)&&!nah(r.zugMax,40.10),
   "die alte, je Punkt gerechnete Zugabe kommt nicht zurueck",[r.zugMin,r.zugMax]);
 // Der Preis dafuer wird ausgewiesen, nicht verschwiegen.
 p(nah(r.bFertigMin,39.24)&&nah(r.bFertigMax,42.21),
   "das fertige Bord misst 39,24 bis 42,21 statt ueberall 40",[r.bFertigMin,r.bFertigMax]);
 p(nah(r.betaMinGrad,60,0.1),"Biegewinkel min 60 Grad",r.betaMinGrad);
 p(nah(r.betaMaxGrad,120,0.1),"Biegewinkel max 120 Grad",r.betaMaxGrad);
 p(nah(r.streckung*100,68.49,0.2),"Streckung Schweifbord-Rand rund 68,5 % (war 67, die Unterkante liegt jetzt anders)",r.streckung*100);
 // Die Zuschnittbreite ist der Umfang plus die beiden Falzzugaben - der
 // Auftrag rechnet es ausdruecklich vor: 343,38 + 6 + 12.
 p(nah(r.breite-r.L,18,0.001),"die Zuschnittbreite ist der Umfang plus 1xf und 2xf",r.breite-r.L);
 // v3.189: Die Vorgabe ist 0 Lappen. Der Auftrag nannte 24; der Betrieb
 // schweift das Bord nachher auf der Maschine, Einschnitte sind bei ihm die
 // Ausnahme. Die alte Erwartung wird nicht geloescht, sondern umgedreht -
 // und darunter steht die Gegenprobe, dass Lappen weiterhin funktionieren.
 p(r.einschnitte.length===0,"Vorgabe: KEINE Lappen",r.einschnitte.length);
 p(ABW_STANDARD.lappen===0,"und das steht auch so in den Standardwerten",ABW_STANDARD.lappen);
 const mitLappen=abwRechne({lappen:24});
 p(mitLappen.einschnitte.length===24,"wer 24 eingibt, bekommt 24 Einschnitte",mitLappen.einschnitte.length);
 p(mitLappen.einschnitte[0].length===2,"jeder Einschnitt geht von der Unterkante zur Biegelinie");
 p(r.monoton===true,"die Unterkante laeuft durchgehend",r.monoton);
 // Mit 0 Lappen und 67 % Streckung sagt die App das jetzt bei den
 // Standardmassen ausdruecklich - vorher (24 Lappen) war es still. Beides
 // ist richtig, aber es ist nicht dasselbe, und der Pruefstand haelt fest,
 // welches gilt.
 p(r.warnungen.length===1&&r.warnungen[0].indexOf("gestreckt")>=0,
   "bei den Standardmassen genau ein Hinweis: der Rand wird gestreckt",r.warnungen);
 p(mitLappen.warnungen.length===0,"mit Lappen ist kein Hinweis noetig",mitLappen.warnungen);

 // ---- B  Die Rechnung ist DOM-frei ---------------------------------------
 console.log("\nB · Die Rechnung kennt kein DOM");
 const q77=nurCode(lies("js/77-abwicklung.js"));
 p(!/document\./.test(q77),"js/77 fasst document nicht an");
 p(!/window\./.test(q77),"und window auch nicht");
 p(!/getElementById|querySelector/.test(q77),"und sucht keine Elemente");
 // Sie liest auch keine Felder - alles kommt als Argument herein.
 p(/function abwRechne\(roh\)/.test(q77),"abwRechne() bekommt die Masse als Argument");

 // ---- C  Andere Masse: die Rechnung reagiert richtig ----------------------
 console.log("\nC · Andere Masse");
 const gerade=abwRechne({alpha:0});
 p(gerade.ok===true,"senkrechter Schnitt rechnet durch");
 p(nah(gerade.hoeheMax,gerade.hoeheMin,0.001),
   "bei alpha=0 ist die Hoehe rundum gleich",[gerade.hoeheMax,gerade.hoeheMin]);
 p(nah(gerade.betaMinGrad,90,0.001)&&nah(gerade.betaMaxGrad,90,0.001),
   "und der Kragen steht ueberall im rechten Winkel",[gerade.betaMinGrad,gerade.betaMaxGrad]);
// Auch beim senkrechten Schnitt wird der Kragenrand gestreckt - er ist der
 // groessere Kreis. Von Hand: (R+b)/Rn - 1 = 95/54,65 - 1 = 73,83 %. Diese
 // Erwartung war beim ersten Schreiben falsch ("keine Streckung"); die
 // Rechnung hatte recht.
 // Bei alpha=0 ist beta ueberall 90 Grad - alte und neue Rechnung liefern
 // hier dasselbe, und das Kreisverhaeltnis muss weiter exakt stimmen.
 p(nah(gerade.zugMin,39.34)&&nah(gerade.zugMax,39.34),
   "beim senkrechten Schnitt ist die Zugabe unveraendert 39,34",[gerade.zugMin,gerade.zugMax]);
 p(nah(gerade.bFertigMin,40,0.001)&&nah(gerade.bFertigMax,40,0.001),
   "und das fertige Bord wird dort exakt so breit wie eingegeben",[gerade.bFertigMin,gerade.bFertigMax]);
 p(nah(gerade.streckung,95/54.65-1,0.002),
   "beim senkrechten Schnitt ist die Streckung genau das Kreisverhaeltnis (R+b)/Rn",
   [gerade.streckung,95/54.65-1]);

 const ohneFalz=abwRechne({f:0});
 p(nah(ohneFalz.breite,ohneFalz.L,0.001),"ohne Falz ist die Zuschnittbreite der Umfang",ohneFalz.breite);
 p(ohneFalz.falzLinien.length===0,"und es gibt keine Falzlinien");

 const andereFaktoren=abwRechne({faktorA:2,faktorB:2});
 p(nah(andereFaktoren.breite-andereFaktoren.L,24,0.001),
   "andere Falzfaktoren wirken (2+2 mal 6 = 24)",andereFaktoren.breite-andereFaktoren.L);

 // Naht an der KUERZESTEN Mantellinie: dieselben Kennzahlen, nur anders
 // herum aufgeschnitten.
 const kurz=abwRechne({nahtLang:false});
 p(nah(kurz.hoeheMax,r.hoeheMax)&&nah(kurz.hoeheMin,r.hoeheMin),
   "die Naht an der kuerzesten Mantellinie aendert die Hoehen nicht",[kurz.hoeheMax,kurz.hoeheMin]);

 // Feinheit der Stuetzpunkte: mehr Punkte duerfen das Ergebnis nicht
 // verschieben, sonst waere die Rechnung von der Aufloesung abhaengig.
 const fein=abwRechne({punkte:1440});
 p(nah(fein.hoeheMax,r.hoeheMax,0.01)&&nah(fein.zugMax,r.zugMax,0.01),
   "viermal so viele Stuetzpunkte aendern nichts",[fein.hoeheMax,fein.zugMax]);

 // ---- D  Pruefungen und Warnungen -----------------------------------------
 console.log("\nD · Was die Rechnung abweist und wovor sie warnt");
 const zuSteil=abwRechne({alpha:80});
 p(zuSteil.ok===false&&zuSteil.fehler.join(" ").indexOf("75")>=0,
   "ueber 75 Grad wird abgewiesen",zuSteil.fehler);
 const zuNiedrig=abwRechne({H:20});
 p(zuNiedrig.ok===false&&zuNiedrig.fehler.length>0,"zu geringe Hoehe wird abgewiesen",zuNiedrig.fehler);
 p(zuNiedrig.fehler.join(" ").indexOf("mm")>=0,"und die Meldung nennt das Mindestmass",zuNiedrig.fehler);
 const dick=abwRechne({t:60});
 p(dick.ok===false,"Blech dicker als der halbe Durchmesser wird abgewiesen",dick.fehler);
 // Streckung ueber 10 % OHNE Lappen: das laesst sich nicht aufziehen.
 const ohneLappen=abwRechne({lappen:0});
 p(ohneLappen.ok===true,"ohne Lappen wird trotzdem gerechnet");
 // v3.189: Die Warnung schreibt nichts mehr vor. Sie nannte "bitte Lappen
 // verwenden" - im Betrieb wird stattdessen geschweift, und eine Meldung,
 // die den eigenen Arbeitsweg nicht kennt, wird ueberlesen.
 const w=ohneLappen.warnungen.join(" ");
 p(w.indexOf("schweifen")>=0&&w.indexOf("Lappen")>=0,
   "sie nennt beide Wege - schweifen oder Lappen",ohneLappen.warnungen);
 p(w.indexOf("bitte Lappen verwenden")<0,
   "und schreibt keinen davon mehr vor",ohneLappen.warnungen);
 // Ein Kragen, der fuer die Kruemmung viel zu breit ist: die Unterkante
 // laeuft zurueck. Das ist kein Rechenfehler, sondern ein Bauteil, das so
 // nicht geht - und es darf nicht stillschweigend gezeichnet werden.
 const breit=abwRechne({b:300,alpha:60});
 p(breit.ok===true&&breit.monoton===false,"eine ruecklaufende Unterkante wird erkannt",
   {monoton:breit.monoton});
 p(breit.warnungen.join(" ").indexOf("Unterkante")>=0,"und gemeldet",breit.warnungen);

 // ---- E  Oberflaeche im Browser -------------------------------------------
 console.log("\nE · Die Oberfläche");
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 // Die neue Ansicht ist seit v3.151 die Vorgabe; hier wird der Einstieg auf
 // der KLASSISCHEN Startseite geprueft, deshalb wird sie ausdruecklich
 // gewaehlt. Den Weg ueber "Mehr" der neuen Ansicht prueft Abschnitt G
 // am Quelltext.
 await page.evaluate(()=>{if(typeof a2Setzen==="function")a2Setzen(false)});
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1",first_name:"Mike",last_name:"L"};
  meineRechte={admin:true,kataloge:true,lager:true};
  allProjects=[{id:7,name:"Musterstrasse 1"}];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  if(typeof showStart==="function")showStart();
  // Kein echtes Supabase im Pruefstand - die Liste bleibt leer.
  sb.from=()=>({select:()=>({order:()=>({limit:async()=>({data:[],error:null})})}),
                insert:()=>({select:async()=>({data:[],error:null})}),
                delete:()=>({eq:()=>({select:async()=>({data:[],error:null})})})});
 });
 await page.click('[data-abw-oeffnen]');
 await page.waitForTimeout(400);
 const E=await page.evaluate(()=>({
  offen:!$("abwicklungModal").hidden,
  D:$("abw_D").value, lappen:$("abw_lappen").value,
  svg:$("abwVorschau").innerHTML.indexOf("<svg")>=0,
  tabelle:$("abwErgebnis").innerHTML,
  projekt:$("abw_projekt").innerHTML.indexOf("Musterstrasse 1")>=0
 }));
 p(E.offen===true,"der Bereich geht auf");
 p(E.D==="110"&&E.lappen==="0","die Standardmasse sind vorbelegt (seit v3.189 ohne Lappen)",[E.D,E.lappen]);
 p(E.svg===true,"die Vorschau zeichnet ein SVG");
 p(E.tabelle.indexOf("361,38")>=0,"die Tabelle nennt die Zuschnittbreite 361,38",E.tabelle.slice(0,200));
 p(E.tabelle.indexOf("370,49")>=0,"und die Hoehe an der Naht 370,49");
 p(E.tabelle.indexOf("371,25")<0,"die alte Hoehe steht nicht mehr da",E.tabelle.slice(0,300));
 p(E.tabelle.indexOf("Bord fertig")>=0&&E.tabelle.indexOf("42,21")>=0,
   "und die Tabelle weist aus, wie breit das Bord damit wirklich wird",E.tabelle.slice(0,400));
 p(E.projekt===true,"die Projektauswahl ist gefuellt");

 // Eine Eingabe aendern - die Vorschau und die Tabelle ziehen mit.
 await page.fill("#abw_alpha","0");
 await page.waitForTimeout(250);
 const E2=await page.evaluate(()=>$("abwErgebnis").innerHTML);
 p(E2.indexOf("90,0°")>=0,"bei alpha=0 steht in der Tabelle ein Biegewinkel von 90 Grad",E2.slice(0,300));
 await page.fill("#abw_alpha","30");
 await page.waitForTimeout(250);

 // Eine unmoegliche Eingabe: keine Vorschau, aber eine Begruendung.
 await page.fill("#abw_H","20");
 await page.waitForTimeout(250);
 const E3=await page.evaluate(()=>({meldung:$("abwMeldung").textContent,
                                    vorschau:$("abwVorschau").innerHTML.indexOf("<svg")>=0}));
 p(E3.meldung.indexOf("Höhe")>=0,"eine zu kleine Hoehe wird am Bildschirm begruendet",E3.meldung);
 p(E3.vorschau===false,"und es wird nichts gezeichnet, was es nicht gibt");
 await page.fill("#abw_H","300");
 await page.waitForTimeout(250);

 // ---- F  Ausgabe -----------------------------------------------------------
 console.log("\nF · DXF, SVG und Schablone");
 const F=await page.evaluate(()=>{
  const r=abwAktualisieren();
  const dxf=abwDxfText(r);
  const dxfLappen=abwDxfText(abwRechne({lappen:24}));
  const svg=abwSvg(r,{mm:true});
  const seiten=abwSeiten(r);
  return {
   dxf, laenge:dxf.length,
   layer:["ZUSCHNITT","BIEGELINIE_SCHWEIFBORD","BIEGELINIE_FALZ","EINSCHNITT"].filter(l=>dxf.indexOf(l)>=0),
   layerMitLappen:["ZUSCHNITT","BIEGELINIE_SCHWEIFBORD","BIEGELINIE_FALZ","EINSCHNITT"].filter(l=>dxfLappen.indexOf(l)>=0),
   altLayer:dxf.indexOf("BIEGELINIE_KRAGEN")>=0,
   einheit:dxf.indexOf("$INSUNITS")>=0,
   eof:dxf.trim().slice(-3),
   svgMm:/width="[\d.]+mm"/.test(svg)&&/height="[\d.]+mm"/.test(svg),
   seiten:seiten.length, ersteSeite:seiten[0],
   // v3.193: A4 ausdruecklich erzwungen - fuer den Vergleich unten.
   seitenA4:abwSeiten(r,Object.assign({},abwPapierListe()[0],
              abwPapierBedarf(r,abwPapierListe()[0]))).length,
   vorschlag:abwPapierVorschlag(r),
   druck:abwDruckHtml(r)
  };
 });
 // Ohne Lappen gibt es nichts einzuschneiden - dann steht der Layer
 // EINSCHNITT auch nicht im DXF. Ein leerer Layer waere eine Zeile, die
 // etwas ankuendigt, das nicht kommt.
 p(F.layer.length===3&&F.layer.indexOf("EINSCHNITT")<0,
   "ohne Lappen hat das DXF drei Layer, keinen leeren EINSCHNITT",F.layer);
 p(F.layerMitLappen.length===4,"mit 24 Lappen sind es alle vier",F.layerMitLappen);
 p(F.altLayer===false,"und keiner heisst mehr KRAGEN");
 p(F.einheit===true,"und sagt, dass die Einheit Millimeter ist");
 p(F.eof==="EOF","und endet sauber mit EOF",F.eof);
 p(F.laenge>20000,"die Kurven stehen als Polylinie mit vielen Stuetzpunkten drin",F.laenge);
 p(F.svgMm===true,"das SVG traegt seine Groesse in mm - sonst waere 1:1 nicht 1:1");
 // v3.193: Bis v3.192 war A4 fest verdrahtet, und dieser Zuschnitt brauchte
 // deshalb immer mehrere Blaetter. Jetzt schlaegt die App das Format vor -
 // fuers Rohr ist das A2 hoch, EIN Blatt. Die Pruefung ist umgestellt, nicht
 // gestrichen: auf A4 muss weiterhin geteilt werden, und der Vorschlag muss
 // mit weniger Blaettern auskommen als A4. Die dritte Zeile ist die
 // Gegenprobe gegen das alte Verhalten - sie faellt durch, sobald wieder
 // jemand A4 fest verdrahtet.
 p(F.seitenA4>=2,"auf A4 wird die Schablone weiterhin auf mehrere Blaetter geteilt",F.seitenA4);
 p(F.seiten<F.seitenA4,"der Vorschlag kommt mit weniger Blaettern aus als A4",
   [F.seiten,F.seitenA4]);
 p(F.vorschlag&&F.vorschlag.name==="A2 hoch"&&F.seiten===1,
   "fuer dieses Rohr ist das A2 hoch und ein einziges Blatt",F.vorschlag);
 p(/@page\{size:420mm 594mm;margin:10mm\}/.test(F.druck),
   "und die Schablone sagt dem Drucker wirklich A2 - sonst schneidet er auf A4 ab",
   (F.druck.match(/@page\{[^}]*\}/)||[""])[0]);
 p(F.druck.indexOf("Blatt 1 von "+F.seiten)>=0,"jedes Blatt ist nummeriert");
 p(F.druck.indexOf("abw-kontrollmass")>=0,"und traegt das 100-mm-Kontrollmass");
 p(F.druck.indexOf("100 %")>=0,"mit dem Hinweis, nicht an die Seite anzupassen");
 p(lies("css/01-basis.css").indexOf(".abw-kontrollmass")>=0
   &&/width:100mm/.test(lies("css/01-basis.css")),
   "das Kontrollmass ist wirklich 100 mm breit, nicht 100 px");

 // ---- G  Verdrahtung -------------------------------------------------------
 console.log("\nG · Verdrahtung");
 p(lies("sw.js").indexOf("./js/77-abwicklung.js")>=0
   &&lies("sw.js").indexOf("./js/78-abwicklung-ui.js")>=0,
   "beide Dateien stehen in der App-Shell des Service Workers");
 const html=lies("index.html");
 p(html.indexOf('id="abwicklungModal"')>=0,"der Bereich steht im HTML");
 p(html.indexOf('data-hilfe="abwicklung"')>=0,"mit Info-Knopf");
 p(html.indexOf('data-abw-oeffnen')>=0,"und einem Einstieg auf dem Startbildschirm");
 p(lies("js/41-hilfe.js").indexOf('"abwicklung"')>=0,"der Hilfetext ist da");
 const a2=lies("js/70-ansicht2.js");
 p(a2.indexOf('abwicklungModal:   {zu:"closeAbwicklung"}')>=0,
   "die neue Ansicht kennt den Bereich und weiss, wie er zugeht");
 p(a2.indexOf('id:"abwicklung"')>=0,"und hat den Eintrag unter Mehr");
 // Die Oberflaeche rechnet nicht selbst.
 const q78=nurCode(lies("js/78-abwicklung-ui.js"));
 p(!/Math\.PI/.test(q78),"js/78 rechnet keine Geometrie - das macht js/77");
 p(/abwRechne\(/.test(q78),"sondern ruft abwRechne()");

 // v3.189: Das Bauteil heisst Schweifbord. Zwei Namen fuer dasselbe Teil
 // sind genau die Art Fehlerquelle, die dieses Projekt anderswo schon
 // einmal Geld gekostet hat (siehe die R/U-Verwechslung in js/41).
 const woKragen=[];
 // js/67 ist ausgenommen: der Eintrag zu v3.189 muss das alte Wort nennen,
 // sonst versteht niemand, was umbenannt wurde. Geprueft wird dort dafuer,
 // dass es NUR noch dort vorkommt.
 ["js/77-abwicklung.js","js/78-abwicklung-ui.js","index.html","css/01-basis.css",
  "js/41-hilfe.js","js/70-ansicht2.js","anleitung/anleitung.html"].forEach(f=>{
  if(lies(f).indexOf("Kragen")>=0)woKragen.push(f);
 });
 p(woKragen.length===0,"nirgends steht mehr \"Kragen\"",woKragen);
 const win=lies("js/67-was-ist-neu.js");
 p(/"3\.189":\[[\s\S]{0,200}Schweifbord/.test(win),
   "die Versionsliste erklaert die Umbenennung");
 p(lies("index.html").indexOf("Schweifbord-Breite b (mm)")>=0,"das Eingabefeld heisst Schweifbord-Breite");
 p(lies("js/78-abwicklung-ui.js").indexOf("Streckung Schweifbord-Rand")>=0,"und die Tabelle Streckung Schweifbord-Rand");

 // ---- H  Sauberkeit --------------------------------------------------------
 console.log("\nH · Sauberkeit");
 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler);

 await b.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();
