// Prüfstand für den Prototyp Rinne Halbrund.
// Geprüft wird die EIGENSTÄNDIGE Testapp (prototyp/rinne-halbrund-testapp.html),
// also genau die Datei, die der Benutzer öffnet. Zusätzlich wird geprüft, dass
// die Mehrdatei-Fassung dasselbe liefert.
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
 const setze=async o=>{await page.evaluate(x=>{Object.assign(aufnahme,x);zeichne()},o);await page.waitForTimeout(60)};
 const dilas=()=>page.evaluate(()=>dilasBerechnet(aufnahme).dilas.map(d=>Math.round(d.posAbStart)));
 const grenzen=()=>page.evaluate(()=>computeRinneBoundaries(segmenteFuerRechnung(aufnahme)).boundaries);
 const rechenSegmente=()=>page.evaluate(()=>segmenteFuerRechnung(aufnahme));
 const komp=()=>page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung+" ="+k.menge));
 // Zuschnitt so lesen, wie ihn Bildschirm und PDF verwenden.
 const zuschnitt=()=>page.evaluate(()=>{const d=dilasEffektiv(aufnahme);
  return berechneRinneStueckliste(d.segmente,d.dilas,d.boundaries||[],rinneDilaMass).map(s=>s.zuschnitt)});
 // Zuschnittmasse setzen - ueber dieselbe Funktion, die auch die Oberflaeche
 // benutzt, damit hier nichts an der Einstellung vorbei geschrieben wird.
 const setzeMasse=async(fitting,dila)=>{
  await page.evaluate(([f,dm])=>{masseSchreiben(f||{},dm);zeichne()},[fitting,dila]);
  await page.waitForTimeout(40);
 };
 const masseZurueck=async()=>{await page.evaluate(()=>{masseZuruecksetzen();zeichne()});await page.waitForTimeout(40)};
 // Alle Elemente ausdruecklich auf 0 - ein leeres Objekt hiesse "Vorgaben
 // gelten weiter" und wuerde die Wirkung eines einzelnen Masses verdecken.
 const alleMasseNull=async(zusatz,dila)=>{
  const f=await page.evaluate(()=>{const o={};rinneFittingTypes.forEach(t=>{o[t.symbol||("id"+t.id)]=0});return o});
  await setzeMasse(Object.assign(f,zusatz||{}),dila===undefined?0:dila);
 };

 // Verlauf bauen: abwechselnd Laenge und Uebergang - genau so, wie er in der
 // Oberflaeche erfasst wird. Beispiel: verlauf(5000,"einhaenge",5000)
 const verlauf=(...teile)=>{
  const segmente=[]; let cur=null;
  teile.forEach(t=>{
   if(typeof t==="number"){cur={laenge:t,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null};segmente.push(cur);return}
   if(!cur)return;
   if(t==="aussen"||t==="innen"){cur.winkel=t==="aussen"?-90:90;cur.stutzen=null;return}
   const art=typeof t==="string"?t:t.art;
   cur.winkel=0;
   cur.stutzen={art,durchmesser:(t&&t.d)||"Ø 100",anzahl:(t&&t.anzahl!==undefined)?t.anzahl:1,
                fallrohr:"neu",bemerkung:""};
  });
  return {segmente};
 };

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
 await setze({bezeichnung:"Test 1",material:3,groesse:"330",...verlauf(10000)});
 const d1=await dilas();
 p(d1.length===1&&d1[0]===5000,"ein Dehnungselement bei 5'000 mm (wie bisher)",d1);
 const b1=await grenzen();
 p(b1.length===2&&!b1[0].typ&&!b1[1].typ,"keine Fixpunkte im Verlauf",b1);
 // Der Zuschnitt haengt an den Einstellungen. Geprueft wird deshalb die
 // REGEL "Zuschnitt = Abstand + Zugabe links + Zugabe rechts", nicht eine
 // Zahl, die zufaellig zur aktuellen Vorgabe passt.
 await alleMasseNull();                       // alle Masse neutral
 const zs1=await zuschnitt();
 p(zs1.join("/")==="5000/5000","ohne Zuschnittmasse: 2 × 5'000 mm",zs1);
 await alleMasseNull({},-165);                // nur die Dila auf -165
 const zs1b=await zuschnitt();
 p(zs1b.join("/")==="4835/4835","Dila -165 mm: beide Stuecke 165 mm kuerzer",zs1b);
 await alleMasseNull({},200);
 const zs1c=await zuschnitt();
 p(zs1c.join("/")==="5200/5200","Dila +200 mm: beide Stuecke 200 mm laenger",zs1c);
 await masseZurueck();

 // ==================================================================
 console.log("\nTEST 2 · Einhängestutzen im Verlauf ist ein FIXPUNKT");
 await setze(verlauf(5000,"einhaenge",5000));
 const segs2=await rechenSegmente();
 p(segs2.length===2&&segs2[0].laenge===5000&&segs2[1].laenge===5000,
   "zwei Abschnitte à 5'000 mm – nichts wird nachträglich geteilt",segs2.map(s=>s.laenge));
 p(segs2.length===2&&Number(segs2[0].rechtsTyp)===4&&Number(segs2[1].linksTyp)===4,
   "beidseitig der bestehende Fixpunkt-Anschlusstyp (id 4)",segs2.map(x=>[x.linksTyp,x.rechtsTyp]));
 const b2=await grenzen();
 p(b2.some(b=>Math.round(b.pos)===5000&&b.typ==="fix"),"computeRinneBoundaries meldet dort einen Fixpunkt",b2);
 const d2=await dilas();
 p(d2.length===2&&d2[0]===2500&&d2[1]===7500,
   "zwei Dehnungselemente, Bereiche entsprechend aufgeteilt (2'500 / 7'500)",d2);
 p(await page.evaluate(()=>gesamtlaengeBerechnet(aufnahme))===10000,"Gesamtlänge 10'000 mm");
 p((await komp()).some(k=>k.startsWith("Einhängestutzen 330 mm Ø 100")&&k.endsWith("=1")),"im Ausmass enthalten");
 await gehe(5);
 p((await page.locator("#p-inhalt").innerText()).includes("FIXPUNKT"),"in der Zusammenfassung als FIXPUNKT bezeichnet");

 // ==================================================================
 console.log("\nTEST 3 · Schiebestutzen gilt als Dehnungselement");
 await setze(verlauf(5000,"schiebe",5000));
 const segs3=await rechenSegmente();
 p(segs3.length===2&&Number(segs3[0].rechtsTyp)===7&&Number(segs3[1].linksTyp)===7,
   "beidseitig der Anschlusstyp Schiebestutzen (id 7), nicht der Fixpunkt (id 4)",
   segs3.map(x=>[x.laenge,x.linksTyp,x.rechtsTyp]));
 const b3=await grenzen();
 p((b3.find(x=>Math.round(x.pos)===5000)||{}).typ==="schiebe",
   'die Grenze ist vom Typ "schiebe" – ausdrücklich NICHT "fix"',b3);
 p(!b3.some(x=>x.typ==="fix"),"kein einziger Fixpunkt im Verlauf",b3);
 const d3=await dilas();
 // Von Hand (Kupfer, 6'000 mit Dehnungselement): beide Teilstrecken sind
 // 5'000 mm und laufen gegen einen Schiebestutzen, nicht gegen einen
 // Fixpunkt -> 5'000 <= 6'000, also keine zusaetzliche Dila.
 p(d3.length===0,"keine zusätzliche Dila – der Schiebestutzen ersetzt sie",d3);
 p(d1.length===1,"ohne ihn wäre an dieser Stelle eine Dila nötig gewesen",d1);
 p((await komp()).some(k=>k.startsWith("Schiebestutzen 330 mm Ø 100")&&k.endsWith("=1")),"im Ausmass enthalten");
 const st3=await page.evaluate(()=>{const d=dilasBerechnet(aufnahme);
  return berechneRinneStueckliste(d.segmente,d.dilas,d.boundaries||[],rinneDilaMass).map(x=>[x.von,x.bis]);});
 p(st3.length===2&&st3[0][1]==="Schiebestutzen"&&st3[1][0]==="Schiebestutzen",
   "die Stückliste bricht am Schiebestutzen um",st3);
 await gehe(5);
 const t5=await page.locator("#p-inhalt").innerText();
 p(/Schiebestutzen[\s\S]{0,90}Dehnungselement/.test(t5),"in der Zusammenfassung als Dehnungselement bezeichnet",
   (t5.match(/Schiebestutzen.{0,90}/)||[])[0]);
 p(/kein Fixpunkt/.test(t5),"und ausdrücklich als kein Fixpunkt");

 // ==================================================================
 console.log("\nTEST 4 · Einhängestutzen und Schiebestutzen gemeinsam");
 await setze(verlauf(3000,"einhaenge",4000,"schiebe",3000));
 const segs4=await rechenSegmente();
 p(segs4.map(x=>x.laenge).join("/")==="3000/4000/3000","drei Abschnitte",segs4.map(x=>x.laenge));
 const b4=await grenzen();
 p(b4.filter(x=>x.typ==="fix").length===1&&b4.some(x=>Math.round(x.pos)===3000&&x.typ==="fix"),
   "genau EIN Fixpunkt, und zwar der Einhängestutzen bei 3'000 mm",b4);
 p(b4.some(x=>Math.round(x.pos)===7000&&x.typ==="schiebe"),
   'der Schiebestutzen ist eine Grenze vom Typ "schiebe"',b4);
 const d4=await dilas();
 // Von Hand: 0..3000 gegen Fixpunkt = 3000 <= 3000 -> keine.
 // 3000..7000 = 4000, links Fixpunkt (max 3000), rechts Schiebestutzen
 // (max 6000) -> zwei Stuecke a 2000 -> eine Dila bei 5000.
 // 7000..10000 = 3000 <= 6000 -> keine.
 p(d4.length===1&&d4[0]===5000,"ein Dehnungselement bei 5'000 mm (von Hand nachgerechnet)",d4);
 const k4=await komp();
 p(k4.some(k=>k.startsWith("Einhängestutzen"))&&k4.some(k=>k.startsWith("Schiebestutzen")),
   "beide Stutzen im Ausmass",k4);

 // ==================================================================
 console.log("\nTEST 5 · Rinnengrössen");
 await gehe(1);
 const opt=await page.$$eval("#p-groesse option",o=>o.map(x=>({v:x.value,t:x.textContent.trim()})));
 p(opt.length===4,"genau vier Optionen",opt);
 p(opt.map(o=>o.t).join(" | ")==="200 mm | 250 mm | 330 mm | 400 mm",
   "200 mm / 250 mm / 330 mm / 400 mm",opt.map(o=>o.t));
 p(!opt.some(o=>/280|333|500|andere|frei|ohne/i.test(o.t)),
   "kein RG 280/333/500, nichts Freies und kein \"ohne RG\"",opt.map(o=>o.t));
 p(await page.locator("#p-groesseFrei").count()===0,"kein Feld für eine freie Grösse");
 await page.selectOption("#p-groesse","400"); await page.waitForTimeout(80);
 p((await komp()).some(k=>k.includes("400 mm")),"gewählte Grösse steht in den Bezeichnungen");
 await page.selectOption("#p-groesse","330"); await page.waitForTimeout(80);

 // ==================================================================
 console.log("\nTEST 6 · Verbinder und Sonderformen sind entfernt");
 let sichtbar="";
 for(const s6 of [1,2,3,4,5,6]){await gehe(s6);sichtbar+=" "+await page.locator("#p-app").innerText()}
 p(!/Verbinder/i.test(sichtbar),"Verbinder kommt in keinem der sechs Schritte vor",
   (sichtbar.match(/.{0,40}Verbinder.{0,40}/i)||[])[0]);
 p(!/Sonderteil|Sonderform/i.test(sichtbar),"Sonderteile/Sonderformen kommen nicht mehr vor",
   (sichtbar.match(/.{0,40}Sonder.{0,40}/i)||[])[0]);
 const m6=await modell();
 p(!("verbinder" in m6)&&!("sonderteile" in m6),"beide Felder auch nicht in den Daten",Object.keys(m6));
 const k6=(await komp()).join(" | ");
 p(!/Verbinder|Sonderteil/i.test(k6),"keine Materialposition dafür",k6);
 p(await page.locator("#p-addSonder").count()===0,"kein Knopf für Sonderteile");

 // ==================================================================
 console.log("\nTEST 7 · Stutzen werden im Verlauf eingefügt, wie ein Winkel");
 await neu();
 await gehe(1); await page.fill("#p-bez","Verlaufsprobe");
 await gehe(2);
 await page.locator('[data-seg-laenge="0"]').fill("2500"); await page.waitForTimeout(50);
 p(await page.locator("#p-addEinhaenge").count()===1,"Knopf ＋ Einhängestutzen steht im Verlauf");
 p(await page.locator("#p-addSchiebe").count()===1,"Knopf ＋ Schiebestutzen steht im Verlauf");
 await page.click("#p-addEinhaenge"); await page.waitForTimeout(90);
 let m7=await modell();
 p(m7.segmente.length===2&&m7.segmente[0].stutzen&&m7.segmente[0].stutzen.art==="einhaenge",
   "＋ Einhängestutzen legt Abschnitt und Übergang an – wie ＋ Ecke",
   m7.segmente.map(x=>[x.laenge,x.winkel,x.stutzen&&x.stutzen.art]));
 await page.locator('[data-seg-laenge="1"]').fill("3200"); await page.waitForTimeout(50);
 await page.click("#p-addSchiebe"); await page.waitForTimeout(90);
 await page.locator('[data-seg-laenge="2"]').fill("3500"); await page.waitForTimeout(50);
 m7=await modell();
 p(m7.segmente.map(x=>x.laenge).join("/")==="2500/3200/3500","Verlauf 2'500 / 3'200 / 3'500",m7.segmente.map(x=>x.laenge));
 p(m7.segmente[1].stutzen&&m7.segmente[1].stutzen.art==="schiebe","zweiter Übergang ist der Schiebestutzen");
 // Der Uebergang bietet Winkel und Stutzen in EINER Auswahl an
 const uOpt=await page.$$eval('[data-ueb-art="0"] option',o=>o.map(x=>x.value));
 p(uOpt.join(",")==="gerade,aussen,innen,einhaenge,schiebe",
   "ein Übergang bietet gerade / Aussen / Innen / Einhänge / Schiebe",uOpt);
 // Umschalten Ecke <-> Stutzen
 await page.selectOption('[data-ueb-art="0"]',"aussen"); await page.waitForTimeout(90);
 m7=await modell();
 p(m7.segmente[0].winkel===-90&&!m7.segmente[0].stutzen,"Umschalten auf Ecke entfernt den Stutzen",
   [m7.segmente[0].winkel,m7.segmente[0].stutzen]);
 await page.selectOption('[data-ueb-art="0"]',"einhaenge"); await page.waitForTimeout(90);
 m7=await modell();
 p(m7.segmente[0].winkel===0&&m7.segmente[0].stutzen.art==="einhaenge","und zurück",
   [m7.segmente[0].winkel,m7.segmente[0].stutzen]);
 // Keine Stutzen-Karte mehr in Schritt 3
 await gehe(3);
 p(await page.locator('[data-eh-pos="0"],[data-sh-pos="0"]').count()===0,
   "in Schritt 3 gibt es keine Stutzen-Eingabe mehr");
 p(!("einhaengestutzen" in m7)&&!("schiebestutzen" in m7),
   "keine getrennten Stutzenlisten mehr in den Daten",Object.keys(m7));

 // ==================================================================
 console.log("\nTEST 8 · Vermassung ab dem letzten Abschnitt, nicht ab START");
 await gehe(2);
 const uebergangText=await page.locator(".p-ecke .p-zeile-kopf").first().innerText();
 p(/2['’]500 mm ab Abschnitt 1/.test(uebergangText),
   "der Übergang nennt sein Mass ab dem Abschnitt davor",uebergangText);
 const el=await page.evaluate(()=>verlaufElemente(aufnahme)
   .map(e=>({art:e.art,laenge:e.laenge,abVorher:e.abVorher})));
 p(el.filter(e=>e.art==="einhaenge"||e.art==="schiebe").every(e=>e.abVorher>0),
   "jedes Stutzen-Element kennt sein Mass ab dem Abschnitt davor",el);
 const eh=el.find(e=>e.art==="einhaenge"), sh=el.find(e=>e.art==="schiebe");
 p(eh&&eh.abVorher===2500,"Einhängestutzen: 2'500 mm ab Abschnitt 1",eh);
 p(sh&&sh.abVorher===3200,"Schiebestutzen: 3'200 mm ab Abschnitt 2 (nicht 5'700 ab START)",sh);
 // Kein absolutes Mass mehr im Band unter den Marken
 const band=await page.locator("#p-band").innerHTML();
 p(!/>5['’]700</.test(band),"das Verlaufsband beschriftet die Stutzen nicht mit der Position ab START",
   (band.match(/>[0-9’']{3,}</g)||[]).join(","));
 p(/>2['’]500</.test(band)&&/>3['’]200</.test(band)&&/>3['’]500</.test(band),
   "es zeigt stattdessen die Abschnittslängen");
 await gehe(5);
 const z5=await page.locator("#p-inhalt").innerText();
 p(!/5['’]700/.test(z5),"auch die Zusammenfassung vermasst nicht ab START",
   (z5.match(/.{0,30}5['’]700.{0,20}/)||[])[0]);
 p(/Abschnitt 1: 2['’]500 mm/.test(z5),"sie zeigt die Abschnitte einzeln",
   (z5.match(/Abschnitt 1.{0,30}/)||[])[0]);

 // ==================================================================
 console.log("\nTEST 9 · Ablaufrohr-Durchmesser");
 await gehe(2);
 const dOpt=await page.$$eval('[data-ueb-d="0"] option',o=>o.map(x=>x.textContent.trim()));
 p(dOpt.join(" | ")==="Ø 60 | Ø 75 | Ø 100 | Ø 120","genau Ø 60 / 75 / 100 / 120 mm",dOpt);
 p(!dOpt.some(x=>/80|125|150/.test(x)),"kein Ø 80, 125 oder 150 mehr",dOpt);
 await page.selectOption('[data-ueb-d="0"]',"Ø 60"); await page.waitForTimeout(90);
 p((await komp()).some(k=>k.includes("Ø 60")),"gewählter Durchmesser landet im Ausmass",await komp());

 // ==================================================================
 console.log("\nTEST 10 · Rinnenboden statt Endstück, links und rechts getrennt");
 await gehe(3);
 const t3=await page.locator("#p-inhalt").innerText();
 p(/Rinnenboden links/.test(t3)&&/Rinnenboden rechts/.test(t3),"beide Schalter heissen Rinnenboden",t3.slice(0,400));
 p(!/Endstück/i.test(t3),"das Wort Endstück kommt nicht mehr vor",
   (t3.match(/.{0,30}Endstück.{0,30}/i)||[])[0]);
 const k10=await komp();
 p(k10.some(k=>k.startsWith("Rinnenboden links")&&k.endsWith("=1")),"Ausmass: Rinnenboden links",k10);
 p(k10.some(k=>k.startsWith("Rinnenboden rechts")&&k.endsWith("=1")),"Ausmass: Rinnenboden rechts",k10);
 p(!k10.some(k=>/Endstück/i.test(k)),"kein Endstück mehr im Ausmass",k10);
 await page.uncheck("#p-bodenLinks"); await page.waitForTimeout(90);
 const k10b=await komp();
 p(!k10b.some(k=>k.startsWith("Rinnenboden links"))&&k10b.some(k=>k.startsWith("Rinnenboden rechts")),
   "links abwählbar, rechts bleibt – sie sind wirklich getrennt",k10b);
 await page.check("#p-bodenLinks"); await page.waitForTimeout(90);

 // ==================================================================
 console.log("\nTEST 11 · Zuschnittmasse je Element (Einstellungen)");
 await masseZurueck();
 await page.click("#p-massen"); await page.waitForTimeout(120);
 const mt=await page.locator("#p-massenBox").innerText();
 p(await page.locator("#p-massenBox").isVisible(),"die Einstellungen lassen sich oeffnen");
 // Jedes Element aus dem Katalog bekommt ein Feld - nicht nur eine feste Auswahl.
 const felder=await page.$$eval("[data-mass-fitting]",els=>els.map(e=>e.dataset.massFitting));
 const katalog=await page.evaluate(()=>rinneFittingTypes.map(f=>f.symbol||("id"+f.id)));
 p(felder.length===katalog.length&&katalog.every(k=>felder.includes(k)),
   "je ein Massfeld fuer JEDEN Anschlusstyp des Katalogs",{felder,katalog});
 p(await page.locator("#p-massDila").count()===1,"und ein Feld fuer das Dilatationselement");
 for(const t of ["Aussenecke","Innenecke","Ablaufstutzen","Schiebestutzen","Boden"])
  p(mt.includes(t),"Element in der Liste: "+t);
 p(/abgezogen|zugerechnet/i.test(mt),"erklaert + und - im Zuschnitt");

 // Wirkung: Aussenecke von -110 auf -300, das anschliessende Stueck wird kuerzer
 await setze({...verlauf(4000,"aussen",4000)});
 await alleMasseNull();
 const zsA=await zuschnitt();
 await alleMasseNull({AE90:-300});
 const zsB=await zuschnitt();
 p(zsA.length===zsB.length&&zsA.length>0,"gleiche Stueckzahl vor und nach der Aenderung",{zsA,zsB});
 p(zsA.reduce((x,y)=>x+y,0)-zsB.reduce((x,y)=>x+y,0)===600,
   "Aussenecke -300 statt 0: 2 x 300 mm weniger Zuschnitt",{zsA,zsB});
 await alleMasseNull({AE90:250});
 const zsC=await zuschnitt();
 p(zsC.reduce((x,y)=>x+y,0)-zsA.reduce((x,y)=>x+y,0)===500,
   "Aussenecke +250: 2 x 250 mm mehr Zuschnitt - das Vorzeichen wirkt",{zsA,zsC});

 // Der Rinnenboden ist ein Element wie jedes andere und wirkt an den Enden
 await setze({...verlauf(6000),rinnenboden:{links:true,rechts:true}});
 await alleMasseNull();
 const zsD=await zuschnitt();
 await alleMasseNull({BD:60});
 const zsE=await zuschnitt();
 p(zsE[0]-zsD[0]===120,"Rinnenboden +60 mm wirkt an beiden Enden desselben Stuecks",{zsD,zsE});
 await setze({...verlauf(6000),rinnenboden:{links:true,rechts:false}});
 const zsF=await zuschnitt();
 p(zsF[0]-zsD[0]===60,"nur links vorhanden: nur einmal +60 mm",{zsD,zsF});
 await setze({...verlauf(6000),rinnenboden:{links:false,rechts:false}});
 const zsG=await zuschnitt();
 p(zsG[0]===zsD[0],"kein Rinnenboden: kein Zuschlag",{zsD,zsG});

 // Die Masse aendern die Dila-Rechnung NICHT - sie sind reine Zuschlaege
 await setze({...verlauf(10000),rinnenboden:{links:true,rechts:true}});
 await alleMasseNull();
 const dMassVor=await dilas();
 await alleMasseNull({AE90:-900,IE90:-900,ABL:-900,SS:-900,BD:-900},-900);
 const dMassNach=await dilas();
 p(JSON.stringify(dMassVor)===JSON.stringify(dMassNach),
   "geaenderte Zuschnittmasse verschieben kein Dehnungselement",{dMassVor,dMassNach});

 // Zuruecksetzen bringt genau die Vorgaben zurueck
 await masseZurueck();
 const vorgaben=await page.evaluate(()=>({
  fitting:rinneFittingTypes.map(f=>[f.symbol||("id"+f.id),f.mass_mm]),
  soll:Object.entries(MASS_VORGABE),dila:rinneDilaMass,dilaSoll:DILA_MASS_VORGABE}));
 p(JSON.stringify(vorgaben.fitting.sort())===JSON.stringify(vorgaben.soll.sort()),
   "Zuruecksetzen stellt die Katalog-Vorgaben wieder her",vorgaben);
 p(vorgaben.dila===vorgaben.dilaSoll,"und das Vorgabemass der Dila",vorgaben);
 // Die Vorgabe ist die der laufenden App
 p(vorgaben.dilaSoll===-165,"Dila-Vorgabe wie in der App (js/01-basis.js): -165 mm",vorgaben.dilaSoll);
 await page.click("#p-masseSchliessen"); await page.waitForTimeout(100);
 p(!(await page.locator("#p-massenBox").isVisible()),"Einstellungen lassen sich schliessen");

 // ==================================================================
 console.log("\nTEST 12 · Dehnungselemente von Hand anpassen");
 await masseZurueck();
 await setze({...verlauf(15000),rinnenboden:{links:false,rechts:false},dilasManuell:null});
 await gehe(6);
 const autoD=await dilas();
 // Kupfer: hoechstens 6 m zwischen zwei Dehnungselementen -> bei 15 m zwei.
 p(autoD.length===2&&autoD[0]===5000&&autoD[1]===10000,
   "gerechnet: zwei Dehnungselemente bei 5'000 und 10'000 mm",autoD);
 p(await page.locator("[data-dila-abstand]").count()===2,
   "jede Dila-Zeile im Zuschnitt hat ein Eingabefeld",await page.locator("[data-dila-abstand]").count());
 p(await page.locator("#p-dilaAuto").isDisabled(),
   "solange gerechnet wird, ist 'Zurueck zur Berechnung' ausgegraut");

 // Abstand von Hand ueberschreiben
 const dilaFeld=page.locator("[data-dila-abstand]").first();
 await dilaFeld.fill("3000"); await dilaFeld.blur(); await page.waitForTimeout(140);
 const handD=await page.evaluate(()=>dilasEffektiv(aufnahme).dilas.map(d=>Math.round(d.posAbStart)));
 p(handD[0]===3000,"der eingegebene Abstand gilt ab dem Punkt davor",handD);
 p(await page.evaluate(()=>dilasEffektiv(aufnahme).automatisch)===false,
   "ab jetzt gilt die Handeingabe, nicht mehr die Rechnung");
 const zsH=await zuschnitt();
 p(Math.round(zsH[0])===3000+(await page.evaluate(()=>Number(rinneDilaMass)||0)),
   "der Zuschnitt des ersten Stuecks folgt dem neuen Abstand",zsH);

 // Aendert sich die Laenge, bleibt die Handeingabe stehen
 await page.evaluate(()=>{aufnahme.segmente[0].laenge=19000;zeichne()});
 await page.waitForTimeout(120);
 const handD2=await page.evaluate(()=>dilasEffektiv(aufnahme).dilas.map(d=>Math.round(d.posAbStart)));
 p(handD2[0]===3000,"eine geaenderte Laenge ueberschreibt die Handeingabe nicht",handD2);
 await page.evaluate(()=>{aufnahme.segmente[0].laenge=15000;zeichne()});
 await page.waitForTimeout(120);

 // Hinzufuegen und Loeschen
 const vorher=await page.evaluate(()=>dilasEffektiv(aufnahme).dilas.length);
 await page.click("#p-dilaPlus"); await page.waitForTimeout(140);
 p(await page.evaluate(()=>dilasEffektiv(aufnahme).dilas.length)===vorher+1,
   "'+ Dehnungselement von Hand' fuegt eines hinzu");
 await page.locator("[data-dila-del]").first().click(); await page.waitForTimeout(140);
 p(await page.evaluate(()=>dilasEffektiv(aufnahme).dilas.length)===vorher,
   "die Zeile laesst sich wieder loeschen");

 // Zurueck zur Berechnung
 await page.click("#p-dilaAuto"); await page.waitForTimeout(140);
 p(await page.evaluate(()=>aufnahme.dilasManuell)===null,"'Zurueck zur Berechnung' loescht die Handliste");
 const autoD2=await dilas();
 p(JSON.stringify(autoD2)===JSON.stringify(autoD),"und liefert wieder die gerechneten Positionen",autoD2);

 // Warnung, wenn von Hand zu wenige gesetzt sind
 await page.evaluate(()=>{aufnahme.dilasManuell=[];zeichne()});
 await gehe(5); await page.waitForTimeout(120);
 const w5=await page.locator("#p-inhalt").innerText();
 p(/Von Hand/i.test(w5)&&/gerechnet/i.test(w5),"zu wenige von Hand: die Kontrolle sagt es",w5.slice(0,500));
 // Und eine Position ausserhalb der Rinne ist ein Fehler, kein stiller Zurechtruecker
 await page.evaluate(()=>{aufnahme.dilasManuell=[{posAbStart:99000}];zeichne()});
 await page.waitForTimeout(120);
 const w5b=await page.locator("#p-inhalt").innerText();
 p(/ausserhalb der Rinne/i.test(w5b),"Dila ausserhalb der Rinne wird als Fehler gemeldet",w5b.slice(0,500));
 await page.evaluate(()=>{aufnahme.dilasManuell=null;zeichne()});

 // Von Hand gesetzte Dilas landen auch im gespeicherten Datensatz
 await page.evaluate(()=>{aufnahme.dilasManuell=[{posAbStart:4321}];aufnahmeSpeichern()});
 const gespeichert=await page.evaluate(id=>{
  const l=JSON.parse(localStorage.getItem("sd_prototyp_rinne_halbrund")||"[]");
  const t=l.find(x=>x.id===id); return t?t.dilasManuell:null;},await page.evaluate(()=>aufnahme.id));
 p(Array.isArray(gespeichert)&&gespeichert.length===1&&gespeichert[0].posAbStart===4321,
   "die Handanpassung wird mitgespeichert",gespeichert);
 await page.evaluate(()=>{aufnahme.dilasManuell=null;aufnahmeSpeichern();zeichne()});

 // ==================================================================
 console.log("\nTEST 13 · Normlängen und Verschnitt");
 await masseZurueck();
 await page.evaluate(()=>{localStorage.removeItem("sd_prototyp_rinne_normlaengen")});
 // Kupfer 330 (4/5/6 m): 2 x 2500 mm Zuschnitt gehen in EINE 5-m-Stange
 await alleMasseNull();
 await setze({material:3,groesse:"330",rinnenboden:{links:false,rechts:false},
              dilasManuell:[{posAbStart:2500}],...verlauf(5000)});
 await gehe(6); await page.waitForTimeout(150);
 const nt=await page.locator("#p-inhalt").innerText();
 p(/Normlängen und Verschnitt/i.test(nt),"die Karte erscheint in Schritt 6");
 const plan=await page.evaluate(()=>normlaengenErgebnis(aufnahme));
 p(plan.ok&&plan.stangen.length===1&&plan.stangen[0].laenge===5000,
   "2 x 2'500 mm: eine einzige 5-m-Stange",plan.stangen);
 p(plan.verschnitt===0,"kein Verschnitt",plan);
 p(plan.optimal===true,"und als geringster Materialeinsatz ausgewiesen",plan.optimal);
 // Nur den Text DER KARTE prüfen - sonst würde ein "5.00 m" aus dem Ausmass
 // die Prüfung bestehen lassen, ohne dass die Karte etwas zeigt.
 const karte=nt.slice(nt.search(/Normlängen und Verschnitt/i));
 p(/5\.00 m/.test(karte),"die Normlänge 5,00 m steht in der Karte",karte.slice(0,400));
 p(/Verschnitt/i.test(karte)&&/0 mm|0,0 %/.test(karte),"und der Verschnitt",karte.slice(0,400));

 // Mehrere Stücke aus einer Stange - genau die geforderte Eigenschaft
 const inEiner=plan.stangen[0].stuecke.length;
 p(inEiner===2,"beide Zuschnitte kommen aus derselben Stange",plan.stangen[0]);

 // 6 m wäre schlechter: die Optimierung nimmt wirklich die kleinere Stange
 const nurSechs=await page.evaluate(()=>normlaengenPlan([2500,2500],[6000]));
 p(nurSechs.gesamt===6000&&nurSechs.verschnitt===1000,
   "nur 6-m-Stangen verfügbar: 1'000 mm Verschnitt",nurSechs);
 p(plan.gesamt<nurSechs.gesamt,"mit 4/5/6 m wird weniger Material gebraucht",
   {mit:plan.gesamt,ohne:nurSechs.gesamt});

 // Die hinterlegten Normlängen entsprechen der Vorgabe des Betreibers
 const soll={"6|200":[6000],"6|250":[6000],"6|330":[6000],"6|400":[6000],
  "3|200":[6000],"3|250":[4000,5000,6000],"3|330":[4000,5000,6000],"3|400":[6000],
  "4|200":[6000],"4|250":[5000,6000],"4|330":[5000,6000],"4|400":[6000],
  "2|200":[6000],"2|250":[5000,6000],"2|330":[4000,5000,6000]};
 const ist=await page.evaluate(()=>NORMLAENGEN_VORGABE);
 p(JSON.stringify(ist)===JSON.stringify(soll),"die Normlängen-Tabelle stimmt mit der Vorgabe überein",ist);
 // Was nicht angegeben wurde, wird auch nicht erfunden
 for(const [k,txt] of [["2|400","Titanzink 400"],["5|330","Chromstahl verzinnt"],["1|330","Aluminium"]])
  p(ist[k]===undefined,"nicht geraten: "+txt);
 const ohne=await page.evaluate(()=>normlaengenFuer({material:2,groesse:"400"}));
 p(ohne===null,"ohne Hinterlegung liefert normlaengenFuer() null",ohne);
 await setze({material:2,groesse:"400"});
 await gehe(6); await page.waitForTimeout(150);
 const nt2=await page.locator("#p-inhalt").innerText();
 p(/keine Normlänge hinterlegt/i.test(nt2),"und die Karte sagt es, statt zu rechnen",nt2.slice(0,400));
 p(!/Stange\s*Normlänge/i.test(nt2),"es wird dann auch keine Stangentabelle gezeigt");

 // Normlängen lassen sich eintragen
 await page.click("#p-massen"); await page.waitForTimeout(150);
 p(await page.locator("#p-normlaengen").count()===1,"Normlängen stehen in den Einstellungen");
 const nf=page.locator("#p-normlaengen");
 await nf.fill("3, 4.5"); await nf.blur(); await page.waitForTimeout(150);
 const eigen=await page.evaluate(()=>normlaengenFuer(aufnahme));
 p(JSON.stringify(eigen)==="[3000,4500]","eingetragene Normlängen gelten (3 m / 4,5 m)",eigen);
 await nf.fill("6, abc, -2, 0"); await nf.blur(); await page.waitForTimeout(150);
 const eigen2=await page.evaluate(()=>normlaengenFuer(aufnahme));
 p(JSON.stringify(eigen2)==="[6000]","Unsinn wird verworfen, nicht als 0-Stange übernommen",eigen2);
 await page.click("#p-normZurueck"); await page.waitForTimeout(150);
 p(await page.evaluate(()=>normlaengenFuer(aufnahme))===null,
   "Zurücksetzen stellt den Ausgangszustand her (hier: nichts hinterlegt)");
 // Eine eigene Angabe gilt nur für diese Material/Grösse-Kombination
 await page.evaluate(()=>{normlaengenSchreiben({material:2,groesse:"400"},[3000]);});
 const andere=await page.evaluate(()=>normlaengenFuer({material:3,groesse:"330"}));
 p(JSON.stringify(andere)==="[4000,5000,6000]","eine eigene Angabe färbt nicht auf andere ab",andere);
 await page.evaluate(()=>{localStorage.removeItem("sd_prototyp_rinne_normlaengen")});

 // Zu langes Stück wird gemeldet
 await setze({material:3,groesse:"330",rinnenboden:{links:false,rechts:false},
              dilasManuell:[],...verlauf(9000)});
 await gehe(6); await page.waitForTimeout(150);
 const nt3=await page.locator("#p-inhalt").innerText();
 p(/länger als die längste Normlänge/i.test(nt3),
   "ein 9'000-mm-Zuschnitt wird als zu lang gemeldet",nt3.slice(0,900));
 await page.evaluate(()=>{aufnahme.dilasManuell=null;zeichne()});

 // ==================================================================
 console.log("\nB · Plausibilität");
 // Eine Position ausserhalb der Rinne ist strukturell nicht mehr moeglich
 const posFelder=await page.evaluate(()=>document.querySelectorAll("[data-eh-pos],[data-sh-pos]").length);
 p(posFelder===0,"es gibt kein Feld mehr für eine Position ab START – der Fehler kann nicht mehr entstehen");
 await setze(verlauf(5000,{art:"schiebe",anzahl:0},5000));
 let pr=await page.evaluate(()=>pruefungen(aufnahme));
 p(pr.some(m=>m.art==="fehler"&&/Anzahl/.test(m.text)),"Anzahl 0 wird gemeldet",pr);
 await setze(verlauf(5000,"schiebe",5000));
 pr=await page.evaluate(()=>pruefungen(aufnahme));
 p(!pr.some(m=>m.art==="fehler"),"gültiger Verlauf ohne Fehler",pr);

 // Anzahl > 1 zaehlt im Ausmass mit, bleibt aber EIN Uebergang
 await setze(verlauf(2500,{art:"einhaenge",anzahl:2},7500));
 const kA=await page.evaluate(()=>komponenten(aufnahme).find(k=>k.bezeichnung.startsWith("Einhängestutzen")));
 p(kA&&kA.menge===2,"Anzahl 2 erscheint als 2 Stück im Ausmass",kA);
 const dA=await dilas();
 // Von Hand: 0..2500 gegen Fixpunkt = 2500 <= 3000 -> keine.
 // 2500..10000 = 7500: Stueck am Fixpunkt hoechstens 3000, Rest 4500 <= 6000
 // -> eine Dila bei 5500.
 p(dA.length===1&&dA[0]===5500,"eine Dila bei 5'500 mm (von Hand nachgerechnet)",dA);
 await page.evaluate(()=>{aufnahme.segmente[0].stutzen.anzahl=1});
 p(JSON.stringify(await dilas())===JSON.stringify(dA),"Anzahl 2 zählt trotzdem nur als EIN Fixpunkt");

 // ==================================================================
 console.log("\nC · Verlaufsband unterscheidet die beiden Arten");
 await setze(verlauf(2500,"einhaenge",3200,"schiebe",3500));
 await gehe(2);
 const band2=await page.locator("#p-band").innerHTML();
 p(band2.includes(">E1<"),"Einhängestutzen als E1 beschriftet");
 p(band2.includes(">S1<"),"Schiebestutzen als S1 beschriftet");
 p(band2.includes(">FIX<"),"Fixpunkt ausdrücklich beschriftet");
 p(band2.includes(">DEHNT<"),"Schiebestutzen ausdrücklich als Dehnungselement beschriftet");
 p((band2.match(/<rect/g)||[]).length===1,"Schiebestutzen als eckige Marke");
 p((band2.match(/<circle/g)||[]).length===1,"Einhängestutzen als runde Marke");

 // ==================================================================
 console.log("\nD · Unverändert aus der bisherigen Fassung");
 await setze(verlauf(4850,"aussen",3200,"innen",4350));
 const bE=await grenzen();
 p(bE.filter(b=>b.typ==="fix").length===2,"zwei Fixpunkte aus den Ecken",bE);
 p(await page.evaluate(()=>gesamtlaengeBerechnet(aufnahme))===12400,"Gesamtlänge 12'400 mm");
 p(await page.evaluate(()=>halterVorschlag(aufnahme))===26,"Haltervorschlag 26 Stk.");
 await setze({gesamtlaengeManuell_mm:12500});
 const prD=await page.evaluate(()=>pruefungen(aufnahme).filter(m=>/Differenz/.test(m.text)));
 p(prD.length===1&&prD[0].text.includes("+100"),"Differenzwarnung unverändert",prD);
 await setze({gesamtlaengeManuell_mm:null});
 await gehe(1);
 await page.fill("#p-bez","Original"); await page.waitForTimeout(50);
 await page.click("#p-speichern"); await page.waitForTimeout(160);
 const vor=await modell();
 page.once("dialog",d=>d.accept());
 await page.click("#p-kopieren"); await page.waitForTimeout(220);
 const kop=await modell();
 p(kop.id!==vor.id&&kop.bezeichnung.includes("Kopie"),"Kopieren funktioniert weiter",[vor.id,kop.id]);

 // Alte gespeicherte Aufnahme wird uebernommen
 const alt=await page.evaluate(()=>{
  const a={id:"alt2",typ:"rinne_halbrund",bezeichnung:"Alt",material:3,groesse:"ohne",
   segmente:[{laenge:8000,linksTyp:"",rechtsTyp:"",winkel:0}],
   einhaengestutzen:[{pos_mm:3000,durchmesser:"Ø 80",anzahl:1,fallrohr:"neu",bemerkung:"alt"}],
   schiebestutzen:[{pos_mm:6000,durchmesser:"Ø 150",anzahl:1,fallrohr:"neu",bemerkung:""}],
   halter:{anzahl:null,abstand_mm:500,typ:""},endstuecke:{links:true,rechts:false},
   verbinder:{anzahl:5,bemerkung:"weg"},dehnung:{art:"keine",anzahl:0},
   sonderteile:[{bezeichnung:"Kesselblech",anzahl:1,bemerkung:""}],
   fotos:[],skizze:null,bemerkung:""};
  const liste=alleAufnahmen(); liste.unshift(a); speichereAlle(liste);
  aufnahmeLaden("alt2");
  return {groesse:aufnahme.groesse,
          laengen:aufnahme.segmente.map(x=>x.laenge),
          uebergaenge:aufnahme.segmente.map(x=>uebergangArt(x)),
          durchmesser:aufnahme.segmente.map(x=>x.stutzen&&x.stutzen.durchmesser),
          boden:aufnahme.rinnenboden,
          reste:["verbinder","sonderteile","endstuecke","einhaengestutzen","schiebestutzen"]
                 .filter(f=>f in aufnahme)};
 });
 p(alt.groesse==="330",'alte Grösse "ohne RG" wird 330 mm',alt);
 p(alt.laengen.join("/")==="3000/3000/2000","alte Stutzen teilen den Abschnitt an ihrer Position",alt);
 p(alt.uebergaenge.slice(0,2).join(",")==="einhaenge,schiebe","und werden zu Übergängen im Verlauf",alt);
 p(alt.durchmesser[0]==="Ø 75"&&alt.durchmesser[1]==="Ø 120",
   "abgeschaffte Durchmesser werden auf die neuen abgebildet",alt.durchmesser);
 p(alt.boden&&alt.boden.links===true&&alt.boden.rechts===false,"Endstücke werden zu Rinnenboden",alt.boden);
 p(alt.reste.length===0,"alte Felder verschwinden",alt.reste);

 // ==================================================================
 console.log("\nE · Bedienung");
 await neu();
 await gehe(2);
 const feld=page.locator('[data-seg-laenge="0"]');
 await feld.click(); await page.keyboard.type("7500"); await page.waitForTimeout(60);
 const z=await page.evaluate(()=>({wert:document.querySelector('[data-seg-laenge="0"]').value,
  fokus:document.activeElement&&document.activeElement.dataset.segLaenge!==undefined,
  modell:aufnahme.segmente[0].laenge}));
 p(z.wert==="7500"&&z.modell===7500,"ganze Zahl getippt, nichts verloren",z);
 p(z.fokus===true,"Feld behält den Fokus",z);
 p((await page.locator("#p-summeL").innerText()).includes("7’500"),"Gesamtlänge folgt beim Tippen");
 await page.click("#p-kopf"); await feld.click(); await page.keyboard.type("6200"); await page.waitForTimeout(60);
 p(await page.evaluate(()=>document.querySelector('[data-seg-laenge="0"]').value)==="6200",
   "Antippen markiert den Wert, Tippen ersetzt ihn");

 // ==================================================================
 console.log("\nF · Bildschirmbreiten");
 await setze(verlauf(2500,"einhaenge",3200,"schiebe",3500));
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
 await gehe(2);
 const klein=await page.evaluate(()=>Array.from(document.querySelectorAll("#p-app button"))
  .filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height<34})
  .map(b=>b.textContent.trim().slice(0,20)));
 p(klein.length===0,"alle sichtbaren Knöpfe mindestens 34 px hoch",klein);

 // ==================================================================
 console.log("\nG · PDF");
 await setze({bezeichnung:"PDF-Probe Nordseite",material:3,groesse:"330",
   bemerkung:"Gerüst steht bis KW 38.",
   fotos:["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFklEQVR4nGP8z8DwnwEPYMInOfIVAAeeAQtOZfCbAAAAAElFTkSuQmCC"],
   ...verlauf(2500,"einhaenge",3200,"aussen",3500)});
 await gehe(6);
 p(await page.locator("#p-pdf").count()===1,"PDF-Knopf in der Kopfleiste");
 p(await page.locator("#p-pdf2").count()===1,"PDF-Knopf am Ende von Schritt 6");
 await page.evaluate(()=>druckVorbereiten());
 p(await page.evaluate(()=>getComputedStyle(document.getElementById("p-druck")).display)==="none",
   "Druckdokument ist am Bildschirm unsichtbar");
 await page.emulateMedia({media:"print"});
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
 p(dtxt.includes("9’200 mm"),"Gesamtlänge");
 p(/START/.test(dtxt)&&/ENDE/.test(dtxt),"Verlauf von START bis ENDE");
 p(/Einhängestutzen[\s\S]{0,80}FIXPUNKT/.test(dtxt),"Einhängestutzen als FIXPUNKT ausgewiesen");
 p(/Aussenwinkel[\s\S]{0,40}FIXPUNKT/.test(dtxt),"Ecke als Fixpunkt ausgewiesen");
 p(/Mass \(mm\)/i.test(dtxt),"die Verlaufstabelle vermasst abschnittsweise",
   (dtxt.match(/.{0,40}ab START.{0,20}/)||[])[0]);
 p(/Abschnitt 1[\s\S]{0,10}|2['’]500/.test(dtxt),"mit den Abschnittslängen");
 p(/Ausmass/i.test(dtxt)&&/Material(ü|Ü)bersicht/i.test(dtxt)&&/Zuschnitt/i.test(dtxt),
   "Ausmass, Materialübersicht und Zuschnitt enthalten");
 p(/Rinnenboden links/.test(dtxt)&&/Rinnenboden rechts/.test(dtxt),"Rinnenboden links und rechts getrennt");
 p(dtxt.includes("Gerüst steht bis KW 38."),"Bemerkung enthalten");
 p(/Aussenecke 90°/.test(dtxt),'Zuschnitt benennt die Ecke, nicht nur "Segmentgrenze"');
 p(!/Ablaufstutzen/.test(dtxt),
   'die Zuschnittliste nennt den Einhängestutzen auch so, nicht "Ablaufstutzen"',
   (dtxt.match(/.{0,40}Ablaufstutzen.{0,20}/)||[])[0]);
 p(/ABL = Einhängestutzen/.test(dtxt),"die Legende erklärt die Kurzzeichen des Grundrisses");
 p(!/Verbinder|Sonderteil|Endstück/i.test(dtxt),"kein Verbinder, Sonderteil oder Endstück im PDF");
 p(!/NaN|undefined|Infinity/.test(dtxt),"kein NaN, undefined oder Infinity",
   (dtxt.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/)||[])[0]);
 p(dtxt.includes("Artikelnummern und Preise"),"Hinweis auf fehlende Preise");
 p(!/Fr\.|CHF/.test(dtxt),"keine Preise im PDF");
 const um=await page.evaluate(()=>{
  const th=document.querySelector("#p-druck .pd-tab thead");
  const tr=document.querySelector("#p-druck .pd-tab tbody tr");
  const bal=document.querySelector("#p-druck .pd-balken");
  const bild=document.querySelector("#p-druck .pd-bildseite");
  return {kopf:th&&getComputedStyle(th).display,zeile:tr&&getComputedStyle(tr).breakInside,
          balken:bal&&getComputedStyle(bal).breakAfter,bild:bild&&getComputedStyle(bild).breakBefore};});
 p(um.kopf==="table-header-group","Tabellenkopf wiederholt sich auf Folgeseiten",um);
 p(um.zeile==="avoid","keine geteilte Tabellenzeile",um);
 p(um.balken==="avoid","kein Abschnittsbalken allein am Seitenende",um);
 p(um.bild==="page","jedes Bild auf einer eigenen Seite",um);
 const vb=await page.evaluate(()=>{
  const lies=t=>{const m=/viewBox="([^"]+)"/.exec(t||"");return m?m[1].trim().split(/\s+/).map(Number):null};
  const d=dilasBerechnet(aufnahme);
  const roh=lies(generateRinneGrundriss(d.segmente,d.dilas,d.boundaries||[]));
  const svg=document.querySelector("#p-druck .pd-grundriss svg");
  return {roh,zu:svg?svg.getAttribute("viewBox").trim().split(/\s+/).map(Number):null};});
 const flRoh=vb.roh?vb.roh[2]*vb.roh[3]:0, flZu=vb.zu?vb.zu[2]*vb.zu[3]:0;
 p(flZu>0&&flZu<flRoh,"Grundriss im PDF auf den Inhalt zugeschnitten",
   {roh:vb.roh,zu:vb.zu,anteil:(flZu/flRoh).toFixed(2)});
 p(vb.roh&&Math.abs(vb.roh[2]-vb.roh[3])<1,"die Zeichenfunktion selbst liefert weiterhin quadratisch",vb.roh);
 const ueberDruck=await page.evaluate(()=>{
  const box=document.getElementById("p-druck").getBoundingClientRect();
  return Array.from(document.querySelectorAll("#p-druck *")).filter(e=>{
   const r=e.getBoundingClientRect();
   return r.width>0&&r.right>box.right+1;}).map(e=>e.tagName+"."+String(e.className||"").split(" ")[0]);});
 p(ueberDruck.length===0,"nichts läuft über die Druckbreite hinaus",ueberDruck);
 await page.emulateMedia({media:null});
 const pdf=await page.pdf({format:"A4",printBackground:true,
   margin:{top:"14mm",bottom:"17mm",left:"14mm",right:"14mm"}});
 p(pdf.length>3000,"PDF wird tatsächlich erzeugt ("+(pdf.length/1024).toFixed(0)+" KB)",pdf.length);
 p(pdf.slice(0,5).toString()==="%PDF-","gültige PDF-Datei");
 p((pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)||[]).length>=2,"mindestens zwei Seiten");
 // Das PDF darf nicht davon abhaengen, dass vorher gezeichnet wurde
 const ohneZeichnen=await page.evaluate(()=>{
  aufnahme.segmente=[{laenge:4000,linksTyp:"",rechtsTyp:"",winkel:-90,stutzen:null},
                     {laenge:4000,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}];
  druckVorbereiten();
  return document.getElementById("p-druck").innerText;});
 p(/Aussenecke 90°/.test(ohneZeichnen),"auch ohne vorheriges Zeichnen ist die Ecke im PDF ein Fixpunkt",
   (ohneZeichnen.match(/.{0,40}Segmentgrenze.{0,10}/)||[])[0]);
 await page.evaluate(()=>{aufnahme.bezeichnung="Nach der Änderung";
  window.dispatchEvent(new Event("beforeprint"))});
 p((await page.locator("#p-druck").innerText()).includes("Nach der Änderung"),
   "beforeprint baut das Dokument neu (auch bei Strg+P)");
 p(fehler.length===0,"keine JS-Fehler in der Testapp",fehler);

 // ==================================================================
 console.log("\nH · Die Mehrdatei-Fassung zeigt dasselbe");
 const seite2=await ctx.newPage();
 const fehler2=[];
 seite2.on("pageerror",e=>fehler2.push(String(e)));
 await seite2.goto(MEHRDATEI);
 await seite2.waitForFunction(()=>document.querySelector("#p-inhalt")&&document.querySelector("#p-inhalt").innerHTML.length>50);
 p(fehler2.length===0,"lädt ohne Fehler",fehler2);
 const o2=await seite2.$$eval("#p-groesse option",o=>o.map(x=>x.textContent.trim()));
 p(o2.join(" | ")==="200 mm | 250 mm | 330 mm | 400 mm","dieselben vier Rinnengrössen",o2);
 const d2b=await seite2.evaluate(()=>{
  aufnahme.segmente=[{laenge:5000,linksTyp:"",rechtsTyp:"",winkel:0,
    stutzen:{art:"einhaenge",durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}},
   {laenge:5000,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}];
  return dilasBerechnet(aufnahme).dilas.map(x=>Math.round(x.posAbStart));
 });
 p(JSON.stringify(d2b)==="[2500,7500]","dieselbe Rechnung wie in der Testapp",d2b);

 await browser.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen ===`);
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
