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
//   Zuschnittbreite         361,38 mm   (343,38 + 6 + 12, also mit f = 6;
//                                        Vorgabe ist seit v3.196 f = 5 -> 358,38)
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
 // v3.195: Die Abnahmewerte des Auftrags gelten fuer SEINE Eingaben, und dazu
 // gehoerte b = 40. Die Vorgabe des Betriebs ist seit v3.195 12 mm. Die
 // Erwartungen werden deshalb nicht abgeschwaecht, sondern praezisiert: b
 // steht jetzt ausdruecklich dabei. Das ist SCHAERFER als vorher, weil der
 // Vergleich mit dem Fusion-360-Script damit unabhaengig von der Vorgabe
 // bestehen bleibt - und Abschnitt A2 prueft zusaetzlich, was die neue
 // Vorgabe liefert.
 // v3.196: auch die Falzbreite gehoert dazu - der Auftrag nannte 6, die
 // Vorgabe des Betriebs ist 5. Die Zuschnittbreite haengt daran.
 const r=abwRechne({b:40,f:6});
 p(r.ok===true,"die Masse des Auftrags rechnen durch",r.fehler);
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

 // ---- A2  Was die VORGABE des Betriebs liefert (v3.195) -------------------
 console.log("\nA2 · Die Vorgabe des Betriebs: Schweifbord 12 mm");
 const v=abwRechne({});
 p(ABW_STANDARD.b===12,"die Vorgabe ist 12 mm, nicht mehr 40",ABW_STANDARD.b);
 // Umfang, Zuschnittbreite und Biegewinkel haengen nicht von der Bordbreite
 // ab - sie muessen unveraendert bleiben. Wuerde die Umstellung sie
 // verschieben, waere irgendwo b eingeflossen, wo es nichts zu suchen hat.
 // Der Umfang haengt weder an b noch an f - er muss unveraendert bleiben.
 // Die Zuschnittbreite haengt an der Falzbreite: 343,38 + 1x5 + 2x5 = 358,38.
 p(nah(v.L,343.38),"der Umfang bleibt 343,38 - er haengt weder an b noch an f",v.L);
 p(nah(v.breite,358.38),"die Zuschnittbreite ist 358,38 (Falz 5 statt 6)",v.breite);
 p(ABW_STANDARD.f===5,"die Vorgabe fuer die Falzbreite ist 5 mm",ABW_STANDARD.f);
 p(nah(v.breite-v.L,15,0.001),"also Umfang plus 1xf und 2xf mit f = 5",v.breite-v.L);
 p(nah(v.betaMinGrad,60,0.1)&&nah(v.betaMaxGrad,120,0.1),
   "und die Biegewinkel bleiben 60 bis 120 Grad",[v.betaMinGrad,v.betaMaxGrad]);
 // Von Hand: Z = (12 + 0,35) - 2 x 2,35 x tan45 + 2,35 x pi/2 = 11,34.
 p(nah(v.zugMin,11.34,0.005)&&nah(v.zugMax,11.34,0.005),
   "die Zugabe ist 11,34 mm - ueberall dieselbe",[v.zugMin,v.zugMax]);
 p(nah(v.hoeheMax,342.49)&&nah(v.hoeheMin,279.39),
   "Hoehe 342,49 bis 279,39",[v.hoeheMax,v.hoeheMin]);
 p(nah(v.bFertigMin,11.24,0.005)&&nah(v.bFertigMax,14.21,0.005),
   "das fertige Bord misst 11,24 bis 14,21 statt ueberall 12",[v.bFertigMin,v.bFertigMax]);
 // Der eigentliche Gewinn: das schmale Bord wird viel weniger gestreckt.
 p(nah(v.streckung*100,21.0,0.2),
   "die Streckung faellt von 68,5 auf 21,0 %",v.streckung*100);
 // GEGENPROBE gegen einen Rueckfall auf 40: die alten Zahlen duerfen mit der
 // Vorgabe NICHT mehr herauskommen.
 p(!nah(v.zugMin,39.34)&&!nah(v.hoeheMax,370.49),
   "die Zahlen der alten Vorgabe kommen nicht zurueck",[v.zugMin,v.hoeheMax]);
 // Und die Differenz der beiden Hoehen ist dieselbe wie bei b = 40: die
 // Bordbreite verschiebt den Zuschnitt, sie verformt ihn nicht.
 p(nah(r.hoeheMax-r.hoeheMin,v.hoeheMax-v.hoeheMin,0.01),
   "die Spanne zwischen hoechster und tiefster Stelle bleibt gleich",
   [r.hoeheMax-r.hoeheMin,v.hoeheMax-v.hoeheMin]);
 // Die Zuschnittbreite ist der Umfang plus die beiden Falzzugaben - der
 // Auftrag rechnet es ausdruecklich vor: 343,38 + 6 + 12.
 p(nah(r.breite-r.L,18,0.001),"mit f = 6 ist die Zuschnittbreite der Umfang plus 1xf und 2xf",r.breite-r.L);
 p(r.monoton===true,"die Unterkante laeuft durchgehend",r.monoton);

 // ---- A3  Die Lappen sind weg (v3.196) ------------------------------------
 // Der Auftrag sah Einschnitte im Schweifbord vor, v3.189 stellte die Vorgabe
 // auf 0, und seit v3.196 gibt es sie gar nicht mehr: "entspricht so nicht
 // dem aktuellen Stand der Technik" (Ansage des Betriebs). Die alten
 // Erwartungen werden nicht geloescht, sondern umgedreht - sie pruefen jetzt,
 // dass die Moeglichkeit WEG ist und nicht still zurueckkommt.
 console.log("\nA3 · Keine Lappeneinschnitte mehr");
 p(ABW_STANDARD.lappen===undefined,"'lappen' steht nicht mehr in den Standardwerten",ABW_STANDARD.lappen);
 p(r.einschnitte===undefined,"die Rechnung liefert keine Einschnitte mehr",r.einschnitte);
 // Die schaerfste Probe: wer die alte Eingabe doch noch mitgibt, bekommt
 // trotzdem keine Einschnitte - und vor allem keinen Absturz. Ein
 // gespeicherter Datensatz von vor v3.196 traegt sie naemlich noch.
 const altLappen=abwRechne({lappen:24});
 p(altLappen.ok===true,"ein alter Datensatz mit lappen:24 rechnet weiterhin durch",altLappen.fehler);
 p(altLappen.einschnitte===undefined&&altLappen.eingaben.lappen===undefined,
   "und die Angabe wird stillschweigend ignoriert, nicht wieder aktiv",
   [altLappen.einschnitte,altLappen.eingaben.lappen]);
 // Verglichen wird mit der VORGABE, nicht mit den Massen des Auftrags -
 // altLappen rechnet ja auch mit der Vorgabe.
 p(Math.abs(altLappen.breite-abwRechne({}).breite)<1e-9,
   "sie aendert am Zuschnitt nichts",[altLappen.breite,abwRechne({}).breite]);
 // Und der Hinweis, der frueher bei 0 Lappen kam, kommt nicht mehr - die
 // Vorgabemasse erzeugen jetzt GAR keine Warnung.
 p(r.warnungen.length===0,
   "bei den Massen des Auftrags kommt kein Hinweis mehr - der Lappen-Hinweis ist weg",r.warnungen);

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
 const gerade=abwRechne({alpha:0,b:40});   // b wie im Auftrag, s. Abschnitt A
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
 // Dasselbe mit der Vorgabe 12: (R+b)/Rn - 1 = 67/54,65 - 1 = 22,60 %.
 // Diese Probe ist die schaerfste im ganzen Pruefstand, weil sie EINE exakte
 // Zahl verlangt und nicht nur eine Groessenordnung.
 const gerade12=abwRechne({alpha:0});      // b aus der Vorgabe
 p(nah(gerade12.streckung,67/54.65-1,0.002),
   "mit der Vorgabe 12 ebenso: 67/54,65 - 1 = 22,60 %",
   [gerade12.streckung,67/54.65-1]);

 const ohneFalz=abwRechne({f:0});
 p(nah(ohneFalz.breite,ohneFalz.L,0.001),"ohne Falz ist die Zuschnittbreite der Umfang",ohneFalz.breite);
 p(ohneFalz.falzLinien.length===0,"und es gibt keine Falzlinien");

 const andereFaktoren=abwRechne({faktorA:2,faktorB:2});
 p(nah(andereFaktoren.breite-andereFaktoren.L,20,0.001),
   "andere Falzfaktoren wirken (2+2 mal 5 = 20)",andereFaktoren.breite-andereFaktoren.L);

 // Naht an der KUERZESTEN Mantellinie: dieselben Kennzahlen, nur anders
 // herum aufgeschnitten.
 const kurz=abwRechne({nahtLang:false,b:40});
 p(nah(kurz.hoeheMax,r.hoeheMax)&&nah(kurz.hoeheMin,r.hoeheMin),
   "die Naht an der kuerzesten Mantellinie aendert die Hoehen nicht",[kurz.hoeheMax,kurz.hoeheMin]);

 // Feinheit der Stuetzpunkte: mehr Punkte duerfen das Ergebnis nicht
 // verschieben, sonst waere die Rechnung von der Aufloesung abhaengig.
 const fein=abwRechne({punkte:1440,b:40});
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
 // v3.196: Der Hinweis auf die Streckung ist weg. Er sagte "entweder
 // schweifen oder Lappen einschneiden" - Lappen gibt es nicht mehr, und
 // geschweift wird ohnehin immer. Damit kam er bei jeder Rechnung und sagte
 // nichts, was der Betrieb nicht schon taete. Die Erwartung ist umgedreht:
 // die ZAHL muss bleiben, die WARNUNG muss weg sein.
 const stark=abwRechne({b:40});
 p(stark.ok===true,"ein breites Bord wird trotzdem gerechnet");
 p(stark.streckung>0.6,"die Streckung wird weiterhin gerechnet",stark.streckung);
 p(stark.warnungen.join(" ").indexOf("gestreckt")<0,
   "aber nicht mehr als Warnung serviert",stark.warnungen);
 p(stark.warnungen.join(" ").indexOf("Lappen")<0,
   "und von Lappen ist nirgends mehr die Rede",stark.warnungen);
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
  D:$("abw_D").value, lappenFeld:!!$("abw_lappen"), alphaFeld:!!$("abw_alpha"),
  tabAlphaFeld:!!$("abw_tab_alpha"), tabDFeld:!!$("abw_tab_D"),
  svg:$("abwVorschau").innerHTML.indexOf("<svg")>=0,
  tabelle:$("abwErgebnis").innerHTML,
  projekt:$("abw_projekt").innerHTML.indexOf("Musterstrasse 1")>=0
 }));
 p(E.offen===true,"der Bereich geht auf");
 p(E.D==="110","die Standardmasse sind vorbelegt",E.D);
 p(E.lappenFeld===false,"das Lappen-Feld gibt es nicht mehr im Formular");
 // v3.196/v3.197: EIN Winkelfeld und EIN Durchmesserfeld fuer beide Bauteile.
 p(E.alphaFeld===true&&E.tabAlphaFeld===false,
   "den Dachwinkel gibt es genau einmal, nicht je Bauteil",[E.alphaFeld,E.tabAlphaFeld]);
 p(E.tabDFeld===false,"und den Rohrdurchmesser ebenso",E.tabDFeld);
 p(E.svg===true,"die Vorschau zeichnet ein SVG");
 p(E.tabelle.indexOf("358,38")>=0,"die Tabelle nennt die Zuschnittbreite 358,38",E.tabelle.slice(0,200));
 // v3.195: im Formular steht die VORGABE (b = 12), nicht die Eingabe des
 // Auftrags - die Tabelle nennt deshalb 342,49 statt 370,49.
 p(E.tabelle.indexOf("342,49")>=0,"und die Hoehe an der Naht 342,49",E.tabelle.slice(0,300));
 p(E.tabelle.indexOf("371,25")<0&&E.tabelle.indexOf("370,49")<0,
   "weder die Hoehe vor v3.190 noch die vor v3.195 steht noch da",E.tabelle.slice(0,300));
 p(E.tabelle.indexOf("Bord fertig")>=0&&E.tabelle.indexOf("14,21")>=0,
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
  const dxfAlt=abwDxfText(abwRechne({lappen:24}));   // alter Datensatz
  const svg=abwSvg(r,{mm:true});
  const seiten=abwSeiten(r);
  return {
   dxf, laenge:dxf.length,
   layer:["ZUSCHNITT","BIEGELINIE_SCHWEIFBORD","BIEGELINIE_FALZ","EINSCHNITT"].filter(l=>dxf.indexOf(l)>=0),
   layerAlt:["ZUSCHNITT","BIEGELINIE_SCHWEIFBORD","BIEGELINIE_FALZ","EINSCHNITT"].filter(l=>dxfAlt.indexOf(l)>=0),
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
 // v3.196: Den Layer EINSCHNITT gibt es nicht mehr - auch nicht, wenn ein
 // alter Datensatz die Angabe noch mitbringt.
 p(F.layer.length===3&&F.layer.indexOf("EINSCHNITT")<0,
   "das DXF hat drei Layer, keinen EINSCHNITT",F.layer);
 p(F.layerAlt.length===3&&F.layerAlt.indexOf("EINSCHNITT")<0,
   "und auch mit lappen:24 aus einem alten Datensatz nicht",F.layerAlt);
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
