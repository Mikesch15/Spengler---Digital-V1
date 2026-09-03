// Prüfstand für den Prototyp Rinne Halbrund.
// Geprüft wird die EIGENSTÄNDIGE Testapp (prototyp/rinne-halbrund-testapp.html),
// also genau die Datei, die der Benutzer öffnet. Zusätzlich wird geprüft, dass
// die Mehrdatei-Fassung dieselbe Oberfläche liefert.
//
// Aufruf (playwright-core und Chromium müssen vorhanden sein):
//   SP=<Ordner mit node_modules> node prototyp/pruefstand-proto-rinne.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const REPO=path.resolve(__dirname,"..");
const TESTAPP="file://"+path.join(REPO,"prototyp","rinne-halbrund-testapp.html");
const MEHRDATEI="file://"+path.join(REPO,"prototyp","rinne-halbrund.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  ["+JSON.stringify(z)+"]":""))}};

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const ctx=await browser.newContext({viewport:{width:412,height:900},deviceScaleFactor:2});
 const page=await ctx.newPage();
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("console",m=>{if(m.type()==="error")fehler.push("console: "+m.text())});
 await page.goto(TESTAPP);
 await page.waitForFunction(()=>document.querySelector("#p-inhalt")&&document.querySelector("#p-inhalt").innerHTML.length>50);

 const gehe=async n=>{await page.click(`[data-schritt="${n}"]`);await page.waitForTimeout(60)};
 const modell=()=>page.evaluate(()=>JSON.parse(JSON.stringify(aufnahme)));
 const neu=async()=>{page.once("dialog",d=>d.accept());await page.click("#p-neu");await page.waitForTimeout(90)};
 const setzeLaenge=async(i,v)=>{await page.locator(`[data-seg-laenge="${i}"]`).fill(String(v));await page.waitForTimeout(40)};
 // Verlauf setzen ohne 20 Klicks – geht über dasselbe Modell, das die
 // Oberfläche auch bedient, danach wird neu gezeichnet.
 const setze=async o=>{await page.evaluate(x=>{Object.assign(aufnahme,x);zeichne()},o);await page.waitForTimeout(60)};
 const dilas=()=>page.evaluate(()=>dilasBerechnet(aufnahme).dilas.map(d=>Math.round(d.posAbStart)));
 const gerade=l=>({segmente:[{laenge:l,linksTyp:"",rechtsTyp:"",winkel:0}]});

 // ==================================================================
 console.log("\nA · Aufbau der eigenständigen Testapp");
 p(fehler.length===0,"keine JS-Fehler beim Laden",fehler);
 p(await page.locator(".p-schritt").count()===6,"sechs Schritte");
 const echt=await page.evaluate(()=>({
  a:typeof calcRinneDilas==="function",b:typeof berechneRinneStueckliste==="function",
  c:typeof generateRinneGrundriss==="function",d:typeof calcDilaPositionsInStretch==="function",
  e:typeof computeRinneBoundaries==="function"}));
 p(Object.values(echt).every(Boolean),"Fachrechnung aus js/12 ist eingebettet und geladen",echt);
 p(await page.evaluate(()=>document.querySelectorAll('link[rel=stylesheet],script[src]').length)===0,
   "wirklich eigenständig: keine externe Datei nachgeladen");

 // ==================================================================
 console.log("\nTEST 1 · gerade Rinne 10'000 mm ohne Stutzen");
 await setze({bezeichnung:"Test 1",material:3,groesse:"330",
              einhaengestutzen:[],schiebestutzen:[],...gerade(10000)});
 const d1=await dilas();
 p(d1.length===1&&d1[0]===5000,"ein Dehnungselement bei 5'000 mm (wie bisher)",d1);
 const b1=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(b1.length===2&&!b1[0].typ&&!b1[1].typ,"keine Fixpunkte im Verlauf",b1);
 const zs1=await page.evaluate(()=>{const d=dilasBerechnet(aufnahme);
  return berechneRinneStueckliste(d.segmente,d.dilas,d.boundaries||[],rinneDilaMass).map(s=>s.zuschnitt)});
 p(zs1.join("/")==="5000/5000","Zuschnitt 2 × 5'000 mm",zs1);

 // ==================================================================
 console.log("\nTEST 2 · Einhängestutzen bei 5'000 mm ist ein FIXPUNKT");
 await setze({einhaengestutzen:[{pos_mm:5000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 const segs2=await page.evaluate(()=>segmenteFuerRechnung(aufnahme));
 p(segs2.length===2&&segs2[0].laenge===5000&&segs2[1].laenge===5000,
   "Rinne wird für die Rechnung an 5'000 mm geteilt",segs2.map(s=>s.laenge));
 p(segs2.length===2&&Number(segs2[0].rechtsTyp)===4&&Number(segs2[1].linksTyp)===4,
   "beidseitig der bestehende Fixpunkt-Anschlusstyp (id 4)",segs2.map(x=>[x.linksTyp,x.rechtsTyp]));
 const b2=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(b2.some(b=>Math.round(b.pos)===5000&&b.typ==="fix"),"computeRinneBoundaries meldet dort einen Fixpunkt",b2);
 const d2=await dilas();
 p(d2.length===2&&d2[0]===2500&&d2[1]===7500,
   "zwei Dehnungselemente, Bereiche entsprechend aufgeteilt (2'500 / 7'500)",d2);
 p(await page.evaluate(()=>gesamtlaengeBerechnet(aufnahme))===10000,
   "Gesamtlänge bleibt 10'000 mm (der Fixpunkt verlängert nichts)");
 const k2=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung+" ="+k.menge));
 p(k2.some(k=>k.startsWith("Einhängestutzen 330 mm Ø 100")&&k.endsWith("=1")),"im Ausmass enthalten",k2);
 await gehe(5);
 p((await page.locator("#p-inhalt").innerText()).includes("FIXPUNKT"),"in der Zusammenfassung als FIXPUNKT bezeichnet");

 // ==================================================================
 // Nachtrag des Betreibers vom 03.09.2026: "ein Schiebestutzen wird wie eine
 // Dila behandelt". Er ist damit weiterhin KEIN Fixpunkt, nimmt die
 // Ausdehnung an seiner Stelle aber selbst auf. Das weicht bewusst von der
 // urspruenglichen Formulierung in TEST 3/4 des Auftrags ab ("Berechnung
 // bleibt identisch") - die spaetere Anweisung gilt.
 console.log("\nTEST 3 · Schiebestutzen bei 5'000 mm gilt als Dehnungselement");
 await setze({einhaengestutzen:[],
              schiebestutzen:[{pos_mm:5000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 const segs3=await page.evaluate(()=>segmenteFuerRechnung(aufnahme));
 p(segs3.length===2&&Number(segs3[0].rechtsTyp)===7&&Number(segs3[1].linksTyp)===7,
   "beidseitig der Anschlusstyp Schiebestutzen (id 7), nicht der Fixpunkt (id 4)",
   segs3.map(x=>[x.laenge,x.linksTyp,x.rechtsTyp]));
 const b3=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 const g3=b3.find(x=>Math.round(x.pos)===5000);
 p(g3&&g3.typ==="schiebe","die Grenze ist vom Typ \"schiebe\" – ausdrücklich NICHT \"fix\"",b3);
 p(!b3.some(x=>x.typ==="fix"),"kein einziger Fixpunkt im Verlauf",b3);
 const d3=await dilas();
 // Von Hand nachgerechnet (Kupfer, 6'000 mm mit Dehnungselement):
 // beide Teilstrecken sind 5'000 mm lang und laufen gegen einen
 // Schiebestutzen, nicht gegen einen Fixpunkt -> 5'000 <= 6'000, also keine
 // zusaetzliche Dila. Der Schiebestutzen ersetzt die eine Dila von TEST 1.
 p(d3.length===0,"keine zusätzliche Dila – der Schiebestutzen ersetzt sie",d3);
 p(d1.length===1,"ohne ihn wäre an dieser Stelle eine Dila nötig gewesen",d1);
 // Der Unterschied zum Fixpunkt muss messbar bleiben
 const dFix=await page.evaluate(()=>{
  const merk=aufnahme.schiebestutzen;
  aufnahme.schiebestutzen=[];
  aufnahme.einhaengestutzen=[{pos_mm:5000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}];
  const r=dilasBerechnet(aufnahme).dilas.map(x=>Math.round(x.posAbStart));
  aufnahme.einhaengestutzen=[]; aufnahme.schiebestutzen=merk; return r;});
 p(dFix.length===2&&d3.length===0,
   "an derselben Stelle ergibt ein Einhängestutzen 2 Dilas, ein Schiebestutzen 0",[dFix,d3]);
 const k3=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung+" ="+k.menge));
 p(k3.some(k=>k.startsWith("Schiebestutzen 330 mm Ø 100")&&k.endsWith("=1")),"im Ausmass enthalten",k3);
 const st3=await page.evaluate(()=>{const d=dilasBerechnet(aufnahme);
  return berechneRinneStueckliste(d.segmente,d.dilas,d.boundaries||[],rinneDilaMass).map(x=>[x.von,x.bis,x.zuschnitt]);});
 p(st3.length===2&&st3[0][1]==="Schiebestutzen"&&st3[1][0]==="Schiebestutzen",
   "die Stückliste bricht am Schiebestutzen um",st3);
 await gehe(5);
 const t5=await page.locator("#p-inhalt").innerText();
 p(/Schiebestutzen[\s\S]{0,80}Dehnungselement/.test(t5),
   "in der Zusammenfassung als Dehnungselement bezeichnet",
   (t5.match(/Schiebestutzen.{0,90}/)||[])[0]);
 p(/kein Fixpunkt/.test(t5),"und ausdrücklich als kein Fixpunkt",
   (t5.match(/Schiebestutzen.{0,90}/)||[])[0]);

 // ==================================================================
 console.log("\nTEST 4 · Einhängestutzen 3'000 + Schiebestutzen 7'000");
 await setze({einhaengestutzen:[{pos_mm:3000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}],
              schiebestutzen:[{pos_mm:7000,durchmesser:"Ø 120",anzahl:1,fallrohr:"bestehend",bemerkung:""}]});
 const segs4=await page.evaluate(()=>segmenteFuerRechnung(aufnahme));
 p(segs4.length===3&&segs4.map(x=>x.laenge).join("/")==="3000/4000/3000",
   "an beiden Stellen geteilt (3'000 / 4'000 / 3'000)",segs4.map(x=>x.laenge));
 const b4=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(b4.filter(x=>x.typ==="fix").length===1&&b4.some(x=>Math.round(x.pos)===3000&&x.typ==="fix"),
   "genau EIN Fixpunkt, und zwar der Einhängestutzen bei 3'000 mm",b4);
 p(b4.some(x=>Math.round(x.pos)===7000&&x.typ==="schiebe"),
   "der Schiebestutzen ist eine Grenze vom Typ \"schiebe\", kein Fixpunkt",b4);
 const d4=await dilas();
 // Von Hand: 0..3000 gegen Fixpunkt = 3000 <= 3000 -> keine Dila.
 // 3000..7000 = 4000, links Fixpunkt (max 3000), rechts Schiebestutzen
 // (max 6000) -> zwei Stuecke a 2000 -> eine Dila bei 5000.
 // 7000..10000 = 3000 <= 6000 -> keine Dila.
 p(d4.length===1&&d4[0]===5000,"ein Dehnungselement bei 5'000 mm (von Hand nachgerechnet)",d4);
 const k4=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung));
 p(k4.some(k=>k.startsWith("Einhängestutzen"))&&k4.some(k=>k.startsWith("Schiebestutzen")),
   "beide Stutzen im Ausmass",k4);

 console.log("\nTEST 5 · Rinnengrössen");
 await gehe(1);
 const opt=await page.$$eval("#p-groesse option",o=>o.map(x=>({v:x.value,t:x.textContent.trim()})));
 p(opt.length===5,"genau fünf Optionen",opt);
 p(opt.map(o=>o.t).join(" | ")==="200 mm | 250 mm | 330 mm | 400 mm | ohne RG",
   "200 mm / 250 mm / 330 mm / 400 mm / ohne RG",opt.map(o=>o.t));
 const verboten=opt.filter(o=>/280|333|500|andere|frei/i.test(o.t));
 p(verboten.length===0,"kein RG 280, RG 333, RG 500 und nichts Freies",verboten);
 p(await page.locator("#p-groesseFrei").count()===0,"kein Feld für eine freie Grösse");
 // "ohne RG" darf keine Bauteilbezeichnung verunstalten
 await page.selectOption("#p-groesse","ohne"); await page.waitForTimeout(80);
 const kOhne=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung));
 p(!kOhne.some(k=>k.includes("ohne RG")),'bei "ohne RG" steht die Grösse nicht in den Bezeichnungen',kOhne);
 p(kOhne.some(k=>k.startsWith("Rinne halbrund ")),"Bezeichnung bleibt trotzdem verständlich",kOhne);
 await page.selectOption("#p-groesse","400"); await page.waitForTimeout(80);
 const k400=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung));
 p(k400.some(k=>k.includes("400 mm")),"gewählte Grösse steht in den Bezeichnungen",k400);
 await page.selectOption("#p-groesse","330"); await page.waitForTimeout(80);

 // ==================================================================
 console.log("\nTEST 6 · Verbinder sind vollständig entfernt");
 // Im sichtbaren Text und in der Struktur - ein Kommentar im Quelltext, der
 // die Übernahme alter Daten erklärt, ist kein Angebot an den Benutzer.
 let sichtbar="";
 for(const s6 of [1,2,3,4,5,6]){await gehe(s6);sichtbar+=" "+await page.locator("#p-app").innerText()}
 p(!/Verbinder/i.test(sichtbar),"kommt in keinem der sechs Schritte vor",
   (sichtbar.match(/.{0,40}Verbinder.{0,40}/i)||[])[0]);
 p(await page.evaluate(()=>document.querySelectorAll('[id*="erbinder" i],[class*="erbinder" i]').length)===0,
   "kein Element trägt den Namen");
 const m6=await modell();
 p(!("verbinder" in m6),"kein Feld verbinder in den Daten",Object.keys(m6));
 const k6=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung).join(" | "));
 p(!/Verbinder/i.test(k6),"keine Materialposition Verbinder",k6);
 const a6=await page.evaluate(()=>ausmassZeilen(aufnahme).map(z=>z.bezeichnung).join(" | "));
 p(!/Verbinder/i.test(a6),"keine Ausmass-Zeile Verbinder",a6);
 await gehe(5);
 p(!/Verbinder/i.test(await page.locator("#p-inhalt").innerText()),"nicht in der Zusammenfassung");
 await gehe(3);
 p(await page.locator("#p-verbinder").count()===0,"kein Eingabefeld in Schritt 3");

 // ==================================================================
 console.log("\nB · Plausibilität (Auftrag Änderung 8)");
 await setze({einhaengestutzen:[{pos_mm:-50,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}],schiebestutzen:[]});
 let pr=await page.evaluate(()=>pruefungen(aufnahme));
 p(pr.some(m=>m.art==="fehler"&&/negative Position/.test(m.text)),"negative Position wird gemeldet",pr);
 await setze({einhaengestutzen:[{pos_mm:15000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 pr=await page.evaluate(()=>pruefungen(aufnahme));
 p(pr.some(m=>m.art==="fehler"&&/ausserhalb/.test(m.text)),"Position ausserhalb der Gesamtlänge wird gemeldet",pr);
 await setze({einhaengestutzen:[],schiebestutzen:[{pos_mm:15000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 pr=await page.evaluate(()=>pruefungen(aufnahme));
 p(pr.some(m=>m.art==="fehler"&&/Schiebestutzen/.test(m.text)&&/ausserhalb/.test(m.text)),
   "gilt für den Schiebestutzen genauso",pr);
 await setze({schiebestutzen:[{pos_mm:5000,durchmesser:"Ø 100",anzahl:0,fallrohr:"neu",bemerkung:""}]});
 pr=await page.evaluate(()=>pruefungen(aufnahme));
 p(pr.some(m=>m.art==="fehler"&&/Anzahl/.test(m.text)),"Anzahl 0 wird gemeldet",pr);
 await setze({einhaengestutzen:[],schiebestutzen:[]});

 // Anzahl > 1 zählt im Ausmass mit
 await setze({einhaengestutzen:[{pos_mm:2500,durchmesser:"Ø 100",anzahl:2,fallrohr:"neu",bemerkung:""}]});
 const kA=await page.evaluate(()=>komponenten(aufnahme).find(k=>k.bezeichnung.startsWith("Einhängestutzen")));
 p(kA&&kA.menge===2,"Anzahl 2 erscheint als 2 Stück im Ausmass",kA);
 const dA=await dilas();
 // Von Hand nachgerechnet (Kupfer 6000 / 3000 ab Fixpunkt):
 // 0..2500 gegen einen Fixpunkt = 2500 <= 3000 -> keine Dila.
 // 2500..10000 = 7500: Stueck am Fixpunkt hoechstens 3000, Rest 4500 <= 6000
 // -> genau eine Dila bei 2500+3000 = 5500.
 p(dA.length===1&&dA[0]===5500,"eine Dila bei 5'500 mm (von Hand nachgerechnet)",dA);
 await page.evaluate(()=>{aufnahme.einhaengestutzen[0].anzahl=1});
 const dA1=await dilas();
 p(JSON.stringify(dA)===JSON.stringify(dA1),"Anzahl 2 zählt trotzdem nur als EIN Fixpunkt",[dA,dA1]);
 await setze({einhaengestutzen:[],schiebestutzen:[]});

 // Stutzen genau auf einer Segmentgrenze
 await setze({segmente:[{laenge:4000,linksTyp:"",rechtsTyp:"",winkel:0},
                        {laenge:6000,linksTyp:"",rechtsTyp:"",winkel:0}],
              einhaengestutzen:[{pos_mm:4000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 const bG=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(bG.some(b=>Math.round(b.pos)===4000&&b.typ==="fix"),"Stutzen genau auf einer Segmentgrenze wirkt auch",bG);
 const sG=await page.evaluate(()=>segmenteFuerRechnung(aufnahme).length);
 p(sG===2,"und erzeugt dort keinen zusätzlichen Abschnitt",sG);
 // Beide Arten auf derselben Stelle: die strengere Regel muss gewinnen.
 await setze({...gerade(10000),
  einhaengestutzen:[{pos_mm:5000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}],
  schiebestutzen:[{pos_mm:5000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 const bB=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 const gB=bB.find(x=>Math.round(x.pos)===5000);
 p(gB&&gB.typ==="fix","Einhänge- und Schiebestutzen auf derselben Stelle: der Fixpunkt gewinnt",bB);
 const dB=await dilas();
 p(dB.length===2&&dB[0]===2500&&dB[1]===7500,"und es wird nach der strengeren Regel gerechnet",dB);
 const sB=await page.evaluate(()=>segmenteFuerRechnung(aufnahme).length);
 p(sB===2,"die Stelle wird nur einmal geteilt",sB);

 // Stutzen am Anfang
 await setze({einhaengestutzen:[{pos_mm:0,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 const bS=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(bS[0]&&bS[0].typ==="fix","Stutzen am START wirkt als Fixpunkt",bS[0]);
 await setze({...gerade(10000),einhaengestutzen:[],schiebestutzen:[]});

 // ==================================================================
 console.log("\nC · Verlaufsband unterscheidet die beiden Arten");
 await setze({einhaengestutzen:[{pos_mm:2500,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}],
              schiebestutzen:[{pos_mm:5700,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 await gehe(2);
 const band=await page.locator("#p-band").innerHTML();
 p(band.includes(">E1<"),"Einhängestutzen als E1 beschriftet");
 p(band.includes(">S1<"),"Schiebestutzen als S1 beschriftet");
 p(band.includes(">FIX<"),"Fixpunkt ausdrücklich beschriftet");
 p((band.match(/<rect/g)||[]).length===1,"Schiebestutzen als eckige Marke");
 p((band.match(/<circle/g)||[]).length===1,"Einhängestutzen als runde Marke");
 p(band.includes("#6b4fa8"),"eigene Farbe für den Schiebestutzen");
 await setze({einhaengestutzen:[],schiebestutzen:[]});

 // ==================================================================
 console.log("\nD · Unverändert aus der bisherigen Fassung");
 // Ecken bleiben Fixpunkte
 await setze({segmente:[{laenge:4850,linksTyp:"",rechtsTyp:"",winkel:-90},
                        {laenge:3200,linksTyp:"",rechtsTyp:"",winkel:90},
                        {laenge:4350,linksTyp:"",rechtsTyp:"",winkel:0}]});
 const bE=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(bE.filter(b=>b.typ==="fix").length===2,"zwei Fixpunkte aus den Ecken",bE);
 p(await page.evaluate(()=>gesamtlaengeBerechnet(aufnahme))===12400,"Gesamtlänge 12'400 mm");
 p(await page.evaluate(()=>halterVorschlag(aufnahme))===26,"Haltervorschlag 26 Stk.");
 // Ecke UND Stutzen zusammen
 await setze({einhaengestutzen:[{pos_mm:4850,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 const bEZ=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(bEZ.filter(b=>b.typ==="fix").length===2,"Stutzen auf einer Ecke erzeugt keinen doppelten Fixpunkt",bEZ);
 await setze({einhaengestutzen:[]});
 // Längendifferenz
 await setze({gesamtlaengeManuell_mm:12500});
 const prD=await page.evaluate(()=>pruefungen(aufnahme).filter(m=>/Differenz/.test(m.text)));
 p(prD.length===1&&prD[0].text.includes("+100"),"Differenzwarnung unverändert",prD);
 await setze({gesamtlaengeManuell_mm:null});
 // Kopieren
 await gehe(1);
 await page.fill("#p-bez","Original"); await page.waitForTimeout(50);
 await page.click("#p-speichern"); await page.waitForTimeout(160);
 const vor=await modell();
 page.once("dialog",d=>d.accept());
 await page.click("#p-kopieren"); await page.waitForTimeout(220);
 const kop=await modell();
 p(kop.id!==vor.id&&kop.bezeichnung.includes("Kopie"),"Kopieren funktioniert weiter",[vor.id,kop.id,kop.bezeichnung]);
 p(!("verbinder" in kop)&&Array.isArray(kop.einhaengestutzen),"die Kopie hat das neue Datenmodell",Object.keys(kop));

 // Alte gespeicherte Aufnahme wird übernommen
 const alt=await page.evaluate(()=>{
  const a={id:"alt1",typ:"rinne_halbrund",bezeichnung:"Alt",material:3,groesse:"RG 333",
   groesseFrei:"",segmente:[{laenge:8000,linksTyp:"",rechtsTyp:"",winkel:0}],
   ablaeufe:[{pos_mm:4000,durchmesser:"Ø 100",fallrohr:"neu",bemerkung:"alt"}],
   halter:{anzahl:null,abstand_mm:500,typ:""},endstuecke:{links:true,rechts:true},
   verbinder:{anzahl:5,bemerkung:"weg"},dehnung:{art:"keine",anzahl:0},
   sonderteile:[],fotos:[],skizze:null,bemerkung:""};
  const liste=alleAufnahmen(); liste.unshift(a); speichereAlle(liste);
  aufnahmeLaden("alt1");
  return {groesse:aufnahme.groesse,eh:aufnahme.einhaengestutzen,
          hatVerbinder:"verbinder" in aufnahme,hatAblaeufe:"ablaeufe" in aufnahme};
 });
 p(alt.groesse==="330","alte Grösse RG 333 wird zu 330 mm",alt);
 p(alt.eh.length===1&&alt.eh[0].pos_mm===4000,"alte Abläufe werden zu Einhängestutzen",alt.eh);
 p(!alt.hatVerbinder&&!alt.hatAblaeufe,"alte Felder verschwinden",alt);

 // ==================================================================
 console.log("\nE · Bedienung");
 await neu();
 await gehe(2);
 const feld=page.locator('[data-seg-laenge="0"]');
 await feld.click(); await page.keyboard.type("7500"); await page.waitForTimeout(60);
 let z=await page.evaluate(()=>({wert:document.querySelector('[data-seg-laenge="0"]').value,
  fokus:document.activeElement&&document.activeElement.dataset.segLaenge!==undefined,
  modell:aufnahme.segmente[0].laenge}));
 p(z.wert==="7500"&&z.modell===7500,"ganze Zahl getippt, nichts verloren",z);
 p(z.fokus===true,"Feld behält den Fokus",z);
 p((await page.locator("#p-summeL").innerText()).includes("7’500"),"Gesamtlänge folgt beim Tippen");
 await page.click("#p-kopf"); await feld.click(); await page.keyboard.type("6200"); await page.waitForTimeout(60);
 p(await page.evaluate(()=>document.querySelector('[data-seg-laenge="0"]').value)==="6200",
   "Antippen markiert den Wert, Tippen ersetzt ihn");

 // Stutzen über die echte Oberfläche anlegen
 await setzeLaenge(0,10000);
 await gehe(3);
 await page.click("#p-addEinhaenge"); await page.waitForTimeout(80);
 await page.locator('[data-eh-pos="0"]').fill("2500"); await page.waitForTimeout(50);
 await page.selectOption('[data-eh-d="0"]',"Ø 120"); await page.waitForTimeout(80);
 await page.click("#p-addSchiebe"); await page.waitForTimeout(80);
 await page.locator('[data-sh-pos="0"]').fill("5700"); await page.waitForTimeout(50);
 const mE=await modell();
 p(mE.einhaengestutzen.length===1&&mE.einhaengestutzen[0].pos_mm===2500
   &&mE.einhaengestutzen[0].durchmesser==="Ø 120","Einhängestutzen über die Oberfläche erfasst",mE.einhaengestutzen);
 p(mE.schiebestutzen.length===1&&mE.schiebestutzen[0].pos_mm===5700,
   "Schiebestutzen über die Oberfläche erfasst",mE.schiebestutzen);
 const dU=await dilas();
 // Von Hand (Kupfer 6'000 / 3'000 ab Fixpunkt), Einhängestutzen bei 2'500,
 // Schiebestutzen bei 5'700:
 //   0..2'500  gegen Fixpunkt: 2'500 <= 3'000        -> keine Dila
 //   2'500..5'700 = 3'200, links Fixpunkt (max 3'000),
 //                 rechts Schiebestutzen (max 6'000) -> Dila bei 4'100
 //   5'700..10'000 = 4'300 <= 6'000                  -> keine Dila
 p(dU.length===1&&dU[0]===4100,"beide Stutzen wirken gemeinsam (Dila bei 4'100 mm)",dU);
 const dNurSchiebe=await page.evaluate(()=>{
  const merk=aufnahme.einhaengestutzen; aufnahme.einhaengestutzen=[];
  const r=dilasBerechnet(aufnahme).dilas.map(x=>Math.round(x.posAbStart));
  aufnahme.einhaengestutzen=merk; return r;});
 // Ohne den Fixpunkt nimmt der Schiebestutzen die Ausdehnung allein auf:
 // 5'700 und 4'300 liegen beide unter 6'000.
 p(dNurSchiebe.length===0,"der Schiebestutzen allein ersetzt jede Dila",dNurSchiebe);
 const dNurEH=await page.evaluate(()=>{
  const merk=aufnahme.schiebestutzen; aufnahme.schiebestutzen=[];
  const r=dilasBerechnet(aufnahme).dilas.map(x=>Math.round(x.posAbStart));
  aufnahme.schiebestutzen=merk; return r;});
 p(dNurEH.length===1&&dNurEH[0]===5500,
   "ohne den Schiebestutzen läge die Dila bei 5'500 mm",dNurEH);
 await page.click('[data-sh-del="0"]'); await page.waitForTimeout(80);
 p((await modell()).schiebestutzen.length===0,"Schiebestutzen löschbar");
 await page.click('[data-eh-del="0"]'); await page.waitForTimeout(80);
 p((await modell()).einhaengestutzen.length===0,"Einhängestutzen löschbar");
 p((await dilas()).length===1,"nach dem Löschen ist der Fixpunkt weg");

 // ==================================================================
 console.log("\nF · Bildschirmbreiten");
 for(const b of [320,360,412,768,1280]){
  await page.setViewportSize({width:b,height:900});
  for(const s of [1,2,3,4,5,6]){
   await gehe(s);
   const u=await page.evaluate(()=>{
    const scrollt=e=>{const o=getComputedStyle(e).overflowX;return o==="auto"||o==="scroll"};
    const inScroll=e=>{let x=e.parentElement;while(x&&x.id!=="p-app"){if(scrollt(x))return true;x=x.parentElement}return false};
    return {doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,
     raus:Array.from(document.querySelectorAll("#p-app *")).filter(e=>{
      const r=e.getBoundingClientRect();
      return r.width>0&&r.right>window.innerWidth+1&&!inScroll(e);})
      .map(e=>e.tagName+"."+String(e.className||"").split(" ")[0])};
   });
   p(u.doc<=1&&u.raus.length===0,`Breite ${b} px, Schritt ${s}: nichts läuft seitlich hinaus`,u);
  }
 }
 await page.setViewportSize({width:412,height:900});
 await gehe(3);
 const klein=await page.evaluate(()=>Array.from(document.querySelectorAll("#p-app button"))
  .filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height<34})
  .map(b=>b.textContent.trim().slice(0,20)));
 p(klein.length===0,"alle sichtbaren Knöpfe mindestens 34 px hoch",klein);
 p(fehler.length===0,"keine JS-Fehler in der Testapp",fehler);

 // ==================================================================
 console.log("\nG · Die Mehrdatei-Fassung zeigt dasselbe");
 const seite2=await ctx.newPage();
 const fehler2=[];
 seite2.on("pageerror",e=>fehler2.push(String(e)));
 await seite2.goto(MEHRDATEI);
 await seite2.waitForFunction(()=>document.querySelector("#p-inhalt")&&document.querySelector("#p-inhalt").innerHTML.length>50);
 p(fehler2.length===0,"lädt ohne Fehler",fehler2);
 const o2=await seite2.$$eval("#p-groesse option",o=>o.map(x=>x.textContent.trim()));
 p(o2.join(" | ")==="200 mm | 250 mm | 330 mm | 400 mm | ohne RG","dieselben fünf Rinnengrössen",o2);
 const d2b=await seite2.evaluate(()=>{
  aufnahme.segmente=[{laenge:10000,linksTyp:"",rechtsTyp:"",winkel:0}];
  aufnahme.einhaengestutzen=[{pos_mm:5000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}];
  return dilasBerechnet(aufnahme).dilas.map(x=>Math.round(x.posAbStart));
 });
 p(JSON.stringify(d2b)==="[2500,7500]","dieselbe Rechnung wie in der Testapp",d2b);

 // ==================================================================
 console.log("\nH · PDF");
 await page.setViewportSize({width:412,height:900});
 await setze({bezeichnung:"PDF-Probe Nordseite",material:3,groesse:"330",
   segmente:[{laenge:2500,linksTyp:"",rechtsTyp:"",winkel:0},
             {laenge:3200,linksTyp:"",rechtsTyp:"",winkel:-90},
             {laenge:3500,linksTyp:"",rechtsTyp:"",winkel:0}],
   einhaengestutzen:[{pos_mm:2500,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}],
   schiebestutzen:[{pos_mm:5700,durchmesser:"Ø 120",anzahl:2,fallrohr:"bestehend",bemerkung:""}],
   bemerkung:"Gerüst steht bis KW 38.",
   fotos:["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFklEQVR4nGP8z8DwnwEPYMInOfIVAAeeAQtOZfCbAAAAAElFTkSuQmCC"]});
 await gehe(6);
 p(await page.locator("#p-pdf").count()===1,"PDF-Knopf in der Kopfleiste");
 p(await page.locator("#p-pdf2").count()===1,"PDF-Knopf am Ende von Schritt 6");

 // Am Bildschirm darf vom Druckdokument nichts zu sehen sein
 await page.evaluate(()=>druckVorbereiten());
 p(await page.evaluate(()=>getComputedStyle(document.getElementById("p-druck")).display)==="none",
   "Druckdokument ist am Bildschirm unsichtbar");

 // Druckansicht
 await page.emulateMedia({media:"print"});
 // Gemessen wird die tatsaechliche Groesse, nicht nur der berechnete Stil:
 // ein Kind eines display:none-Elements meldet weiterhin display:block,
 // wird aber nicht gerendert.
 const sicht=await page.evaluate(()=>({
  druckHoehe:Math.round(document.getElementById("p-druck").getBoundingClientRect().height),
  appHoehe:Math.round(document.getElementById("p-app").getBoundingClientRect().height),
  barHoehe:Math.round(document.querySelector(".p-topbar").getBoundingClientRect().height)}));
 p(sicht.druckHoehe>500,"das Druckdokument wird wirklich gerendert",sicht);
 p(sicht.appHoehe===0&&sicht.barHoehe===0,"kein Bildschirm-UI im Druck",sicht);

 const dtxt=await page.locator("#p-druck").innerText();
 p(/MASSAUFNAHME|Massaufnahme/.test(dtxt),"Dokumenttyp im Kopf");
 p(dtxt.includes("PDF-Probe Nordseite"),"Bezeichnung als Titel");
 p(dtxt.includes("Kupfer")&&dtxt.includes("330 mm"),"Material und Grösse");
 p(dtxt.includes("9’200 mm"),"Gesamtlänge",dtxt.slice(0,400));
 p(/START/.test(dtxt)&&/ENDE/.test(dtxt),"Verlauf von START bis ENDE");
 p(/Einhängestutzen[\s\S]{0,60}FIXPUNKT/.test(dtxt),"Einhängestutzen als FIXPUNKT ausgewiesen");
 p(/Schiebestutzen[\s\S]{0,60}kein Fixpunkt/.test(dtxt),"Schiebestutzen als kein Fixpunkt ausgewiesen");
 p(dtxt.includes("Aussenwinkel")&&/Aussenwinkel[\s\S]{0,40}FIXPUNKT/.test(dtxt),"Ecke als Fixpunkt ausgewiesen");
 // Die Abschnittsbalken stehen im Druck in Grossbuchstaben (text-transform),
 // innerText liefert sie deshalb als AUSMASS usw. - ohne /i schlaegt das fehl.
 p(/Ausmass/i.test(dtxt)&&/Material(ü|Ü)bersicht/i.test(dtxt)&&/Zuschnitt/i.test(dtxt),
   "Ausmass, Materialübersicht und Zuschnitt enthalten",
   (dtxt.match(/\n[A-ZÄÖÜ ]{4,}\n/g)||[]).join("|"));
 p(dtxt.includes("Schiebestutzen 330 mm Ø 120")&&/2\b/.test(dtxt),"Anzahl 2 im Ausmass");
 p(dtxt.includes("Gerüst steht bis KW 38."),"Bemerkung enthalten");
 p(/Aussenecke 90°/.test(dtxt),"Zuschnitt benennt die Ecke, nicht nur \"Segmentgrenze\"",
   (dtxt.match(/.{0,50}Segmentgrenze.{0,20}/)||[])[0]);
 // Das PDF darf nicht davon abhaengen, dass vorher gezeichnet wurde.
 const ohneZeichnen=await page.evaluate(()=>{
  aufnahme.segmente=[{laenge:4000,linksTyp:"",rechtsTyp:"",winkel:-90},
                     {laenge:4000,linksTyp:"",rechtsTyp:"",winkel:0}];
  druckVorbereiten();                       // absichtlich ohne zeichne()
  return document.getElementById("p-druck").innerText;});
 // "Aussenwinkel 90°" steht im Verlauf auch ohne gespiegelte Ecke - es kommt
 // aus dem Winkel. Beweiskraeftig ist nur der Name aus dem Anschlusstyp,
 // den die Stueckliste des bestehenden Moduls vergibt.
 p(/Aussenecke 90°/.test(ohneZeichnen),
   "auch ohne vorheriges Zeichnen ist die Ecke im PDF ein Fixpunkt",
   (ohneZeichnen.match(/.{0,40}Segmentgrenze.{0,10}/)||[])[0]);
 await setze({bezeichnung:"PDF-Probe Nordseite",
   segmente:[{laenge:2500,linksTyp:"",rechtsTyp:"",winkel:0},
             {laenge:3200,linksTyp:"",rechtsTyp:"",winkel:-90},
             {laenge:3500,linksTyp:"",rechtsTyp:"",winkel:0}]});
 await page.evaluate(()=>druckVorbereiten());
 p(!/Verbinder/i.test(dtxt),"kein Verbinder im PDF");
 p(!/NaN|undefined|Infinity/.test(dtxt),"kein NaN, undefined oder Infinity",
   (dtxt.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/)||[])[0]);
 p(dtxt.includes("Artikelnummern und Preise"),"Hinweis auf fehlende Preise");
 p(!/Fr\.|CHF/.test(dtxt),"keine Preise im PDF");

 // Umbruchregeln als tatsaechlich berechneter Stil
 const um=await page.evaluate(()=>{
  const th=document.querySelector("#p-druck .pd-tab thead");
  const tr=document.querySelector("#p-druck .pd-tab tbody tr");
  const bal=document.querySelector("#p-druck .pd-balken");
  const bild=document.querySelector("#p-druck .pd-bildseite");
  return {kopf:th&&getComputedStyle(th).display,
          zeile:tr&&getComputedStyle(tr).breakInside,
          balken:bal&&getComputedStyle(bal).breakAfter,
          bild:bild&&getComputedStyle(bild).breakBefore};});
 p(um.kopf==="table-header-group","Tabellenkopf wiederholt sich auf Folgeseiten",um);
 p(um.zeile==="avoid","keine geteilte Tabellenzeile",um);
 p(um.balken==="avoid","kein Abschnittsbalken allein am Seitenende",um);
 p(um.bild==="page","jedes Bild auf einer eigenen Seite",um);

 // Der Grundriss wird auf seinen Inhalt zugeschnitten – sonst schiebt die
 // quadratische viewBox der Zeichenfunktion alles Weitere auf die naechste
 // Seite. Verglichen wird gegen die UNveraenderte Ausgabe der
 // Zeichenfunktion, nicht gegen eine geratene Zahl.
 const vb=await page.evaluate(()=>{
  const lies=t=>{const m=/viewBox="([^"]+)"/.exec(t||"");return m?m[1].trim().split(/\s+/).map(Number):null};
  const d=dilasBerechnet(aufnahme);
  const roh=lies(generateRinneGrundriss(d.segmente,d.dilas,d.boundaries||[]));
  const svg=document.querySelector("#p-druck .pd-grundriss svg");
  const zu=svg?svg.getAttribute("viewBox").trim().split(/\s+/).map(Number):null;
  return {roh,zu};});
 const flRoh=vb.roh?vb.roh[2]*vb.roh[3]:0, flZu=vb.zu?vb.zu[2]*vb.zu[3]:0;
 p(flZu>0&&flZu<flRoh,"Grundriss im PDF auf den Inhalt zugeschnitten",
   {roh:vb.roh,zugeschnitten:vb.zu,anteil:(flZu/flRoh).toFixed(2)});
 p(vb.roh&&Math.abs(vb.roh[2]-vb.roh[3])<1,"die Zeichenfunktion selbst liefert weiterhin quadratisch",vb.roh);

 // Bei einer geraden Rinne ist der Gewinn am groessten
 const vbGerade=await page.evaluate(()=>{
  const merk=JSON.parse(JSON.stringify(aufnahme.segmente));
  aufnahme.segmente=[{laenge:10000,linksTyp:"",rechtsTyp:"",winkel:0}];
  druckVorbereiten();
  const svg=document.querySelector("#p-druck .pd-grundriss svg");
  const zu=svg?svg.getAttribute("viewBox").trim().split(/\s+/).map(Number):null;
  aufnahme.segmente=merk; druckVorbereiten();
  return zu;});
 p(vbGerade&&vbGerade[2]/vbGerade[3]>3,
   "gerade Rinne: die Zeichnung ist danach breit statt quadratisch",vbGerade);

 // Nichts laeuft ueber die Druckbreite (A4 minus 14 mm Rand = 182 mm)
 const ueberDruck=await page.evaluate(()=>{
  const box=document.getElementById("p-druck").getBoundingClientRect();
  return Array.from(document.querySelectorAll("#p-druck *")).filter(e=>{
   const r=e.getBoundingClientRect();
   return r.width>0&&r.right>box.right+1;}).map(e=>e.tagName+"."+String(e.className||"").split(" ")[0]);});
 p(ueberDruck.length===0,"nichts läuft über die Druckbreite hinaus",ueberDruck);
 await page.emulateMedia({media:null});

 // Wirklich ein PDF erzeugen und wieder einlesen
 const pdf=await page.pdf({format:"A4",printBackground:true,
   margin:{top:"14mm",bottom:"17mm",left:"14mm",right:"14mm"}});
 p(pdf.length>3000,"PDF wird tatsächlich erzeugt ("+(pdf.length/1024).toFixed(0)+" KB)",pdf.length);
 p(pdf.slice(0,5).toString()==="%PDF-","gültige PDF-Datei",pdf.slice(0,8).toString());
 const seiten=(pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)||[]).length;
 p(seiten>=2,"mindestens zwei Seiten (Dokument + Foto)",seiten);

 // Der Druck baut das Dokument immer aus dem aktuellen Stand
 await page.evaluate(()=>{aufnahme.bezeichnung="Nach der Änderung";});
 await page.evaluate(()=>window.dispatchEvent(new Event("beforeprint")));
 p((await page.locator("#p-druck").innerText()).includes("Nach der Änderung"),
   "beforeprint baut das Dokument neu (auch bei Strg+P)");

 await browser.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen ===`);
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
