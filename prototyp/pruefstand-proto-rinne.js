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
 console.log("\nTEST 3 · Schiebestutzen bei 5'000 mm ist KEIN Fixpunkt");
 await setze({einhaengestutzen:[],
              schiebestutzen:[{pos_mm:5000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}]});
 const segs3=await page.evaluate(()=>segmenteFuerRechnung(aufnahme));
 p(segs3.length===1&&segs3[0].laenge===10000,"Rinne wird für die Rechnung NICHT geteilt",segs3.map(s=>s.laenge));
 p(!segs3.some(s=>Number(s.linksTyp)===7||Number(s.rechtsTyp)===7),
   "der Schiebestutzen-Anschlusstyp (id 7) taucht in der Rechnung nirgends auf",segs3);
 const b3=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(!b3.some(b=>b.typ),"keine Grenze, weder fix noch schiebe",b3);
 const d3=await dilas();
 p(JSON.stringify(d3)===JSON.stringify(d1),
   "Dilatationsberechnung identisch zur Rinne ohne Schiebestutzen",[d1,d3]);
 const k3=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung+" ="+k.menge));
 p(k3.some(k=>k.startsWith("Schiebestutzen 330 mm Ø 100")&&k.endsWith("=1")),"trotzdem im Ausmass enthalten",k3);
 await gehe(5);
 p((await page.locator("#p-inhalt").innerText()).includes("kein Fixpunkt"),
   "in der Zusammenfassung ausdrücklich als kein Fixpunkt bezeichnet");

 // ==================================================================
 console.log("\nTEST 4 · Einhängestutzen 3'000 + Schiebestutzen 7'000");
 await setze({einhaengestutzen:[{pos_mm:3000,durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}],
              schiebestutzen:[{pos_mm:7000,durchmesser:"Ø 120",anzahl:1,fallrohr:"bestehend",bemerkung:""}]});
 const segs4=await page.evaluate(()=>segmenteFuerRechnung(aufnahme));
 p(segs4.length===2&&segs4[0].laenge===3000&&segs4[1].laenge===7000,
   "nur an 3'000 mm geteilt, nicht an 7'000 mm",segs4.map(s=>s.laenge));
 const b4=await page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 p(b4.filter(b=>b.typ).length===1&&b4.some(b=>Math.round(b.pos)===3000&&b.typ==="fix"),
   "genau ein Fixpunkt, und zwar bei 3'000 mm",b4);
 const d4=await dilas();
 p(d4.length===1&&d4[0]===6000,"ein Dehnungselement bei 6'000 mm",d4);
 // Gegenprobe: ohne den Schiebestutzen exakt dasselbe
 await page.evaluate(()=>{aufnahme.schiebestutzen=[]});
 const d4b=await dilas();
 p(JSON.stringify(d4)===JSON.stringify(d4b),"der Schiebestutzen ändert am Ergebnis nichts",[d4,d4b]);
 await page.evaluate(()=>{aufnahme.schiebestutzen=[{pos_mm:7000,durchmesser:"Ø 120",anzahl:1,fallrohr:"bestehend",bemerkung:""}];zeichne()});
 const k4=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung));
 p(k4.some(k=>k.startsWith("Einhängestutzen"))&&k4.some(k=>k.startsWith("Schiebestutzen")),
   "beide Stutzen im Ausmass",k4);

 // ==================================================================
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
 p(dU.length===1&&dU[0]===5500,"der über die Oberfläche erfasste Einhängestutzen wirkt",dU);
 const dOhne=await page.evaluate(()=>{
  const merk=aufnahme.einhaengestutzen; aufnahme.einhaengestutzen=[];
  const r=dilasBerechnet(aufnahme).dilas.map(x=>Math.round(x.posAbStart));
  aufnahme.einhaengestutzen=merk; return r;});
 p(dOhne.length===1&&dOhne[0]===5000,"ohne ihn läge die Dila bei 5'000 mm",dOhne);
 const dNurSchiebe=await page.evaluate(()=>{
  const merk=aufnahme.einhaengestutzen; aufnahme.einhaengestutzen=[];
  const r=dilasBerechnet(aufnahme).dilas.map(x=>Math.round(x.posAbStart));
  aufnahme.einhaengestutzen=merk; return r;});
 p(JSON.stringify(dNurSchiebe)==="[5000]","der Schiebestutzen allein ändert nichts",dNurSchiebe);
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

 await browser.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen ===`);
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
