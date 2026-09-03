// Prüfstand für den Prototyp Rinne Halbrund.
// Aufruf (playwright-core und Chromium müssen vorhanden sein):
//   SP=<Ordner mit node_modules> node prototyp/pruefstand-proto-rinne.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const REPO="/home/user/Spengler---Digital-V1";
const SEITE="file://"+path.join(REPO,"prototyp","rinne-halbrund.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  ["+JSON.stringify(z)+"]":""))}};

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const ctx=await browser.newContext({viewport:{width:412,height:900},deviceScaleFactor:2});
 const page=await ctx.newPage();
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("console",m=>{if(m.type()==="error")fehler.push("console: "+m.text())});
 await page.goto(SEITE);
 await page.waitForFunction(()=>document.querySelector("#p-inhalt") && document.querySelector("#p-inhalt").innerHTML.length>50);

 const gehe=async n=>{await page.click(`[data-schritt="${n}"]`);await page.waitForTimeout(60)};
 const setzeLaenge=async(i,v)=>{
  const s=page.locator(`[data-seg-laenge="${i}"]`);
  await s.fill(String(v));await page.waitForTimeout(40);
 };
 const modell=()=>page.evaluate(()=>JSON.parse(JSON.stringify(aufnahme)));
 const neu=async()=>{page.once("dialog",d=>d.accept());await page.click("#p-neu");await page.waitForTimeout(80)};

 // ------------------------------------------------------------------
 console.log("\nA · Aufbau");
 p(fehler.length===0,"keine JS-Fehler beim Laden",fehler);
 p(await page.locator(".p-schritt").count()===6,"sechs Schritte");
 p((await page.locator("#p-inhalt h2").first().textContent()).includes("Grunddaten"),"startet bei Schritt 1");
 // Fachlogik der laufenden App ist wirklich geladen
 const echtDa=await page.evaluate(()=>({
  a:typeof calcRinneDilas==="function",b:typeof berechneRinneStueckliste==="function",
  c:typeof generateRinneGrundriss==="function",d:typeof calcDilaPositionsInStretch==="function"}));
 p(echtDa.a&&echtDa.b&&echtDa.c&&echtDa.d,"Fachrechnung aus js/12 geladen",echtDa);

 // ------------------------------------------------------------------
 console.log("\nTEST 1 · gerade Rinne 10 000 mm, Kupfer, RG 333");
 await gehe(1);
 await page.fill("#p-bez","Test 1 gerade");
 await page.selectOption("#p-material","3");
 await page.selectOption("#p-groesse","RG 333");
 await gehe(2);
 await setzeLaenge(0,10000);
 let m=await modell();
 p(m.segmente.length===1&&m.segmente[0].laenge===10000,"ein Abschnitt 10 000 mm",m.segmente);
 let L=await page.evaluate(()=>gesamtlaengeBerechnet(aufnahme));
 p(L===10000,"Gesamtlänge 10 000 mm",L);
 // Dila: Kupfer 6000 mit / 3000 ab Fixpunkt, offene Enden -> 6000er Regel
 const d1=await page.evaluate(()=>dilasBerechnet(aufnahme).dilas.map(x=>Math.round(x.posAbStart)));
 p(d1.length===1&&d1[0]===5000,"ein Dehnungselement in der Mitte (5 000 mm)",d1);
 // Halter
 await gehe(3);
 const h1=await page.evaluate(()=>({v:halterVorschlag(aufnahme),n:halterAnzahl(aufnahme)}));
 p(h1.v===21&&h1.n===21,"Haltervorschlag 21 Stk. bei 500 mm",h1);
 // Ausmass
 await gehe(6);
 const az1=await page.evaluate(()=>ausmassZeilen(aufnahme));
 p(az1.some(z=>z.bezeichnung.includes("Rinne halbrund RG 333 Kupfer")&&z.menge==="10.00"&&z.einheit==="m"),
   "Ausmass: 10.00 m Rinne halbrund RG 333 Kupfer",az1[0]);
 p(az1.some(z=>z.bezeichnung.includes("Rinnenhalter")&&z.menge==="21"),"Ausmass: 21 Rinnenhalter");
 const zs1=await page.evaluate(()=>{const d=dilasBerechnet(aufnahme);
  return berechneRinneStueckliste(aufnahme.segmente,d.dilas,d.boundaries||[],rinneDilaMass).map(s=>s.zuschnitt)});
 p(zs1.length===2&&zs1[0]===5000&&zs1[1]===5000,"Zuschnitt 2 × 5 000 mm",zs1);
 p(fehler.length===0,"Test 1 ohne JS-Fehler",fehler);

 // ------------------------------------------------------------------
 console.log("\nTEST 2 · 12 400 mm mit zwei Ecken (4850 / AE90 / 3200 / IE90 / 4350)");
 await neu();
 await gehe(1); await page.fill("#p-bez","Test 2 zwei Ecken");
 await gehe(2);
 await setzeLaenge(0,4850);
 await page.click("#p-addEcke"); await page.waitForTimeout(60);
 await setzeLaenge(1,3200);
 await page.click("#p-addEcke"); await page.waitForTimeout(60);
 await setzeLaenge(2,4350);
 // zweite Ecke auf Innenwinkel stellen
 await page.selectOption('[data-ecke-art="1"]',"innen"); await page.waitForTimeout(60);
 m=await modell();
 p(m.segmente.length===3,"drei Abschnitte",m.segmente.length);
 p(m.segmente.map(s=>s.laenge).join("/")==="4850/3200/4350","Längen 4850/3200/4350",m.segmente.map(s=>s.laenge));
 p(m.segmente[0].winkel===-90&&m.segmente[1].winkel===90,"Ecke 1 aussen −90°, Ecke 2 innen +90°",
   [m.segmente[0].winkel,m.segmente[1].winkel]);
 // Die Ecken müssen als Anschlusstyp des BESTEHENDEN Moduls gesetzt sein
 p(Number(m.segmente[0].rechtsTyp)===2&&Number(m.segmente[1].linksTyp)===2,
   "Aussenecke ist als AE90 (id 2) im Verlauf gesetzt",[m.segmente[0].rechtsTyp,m.segmente[1].linksTyp]);
 p(Number(m.segmente[1].rechtsTyp)===3&&Number(m.segmente[2].linksTyp)===3,
   "Innenecke ist als IE90 (id 3) im Verlauf gesetzt",[m.segmente[1].rechtsTyp,m.segmente[2].linksTyp]);
 L=await page.evaluate(()=>gesamtlaengeBerechnet(aufnahme));
 p(L===12400,"Gesamtlänge 12 400 mm",L);
 const ecken=await page.evaluate(()=>eckenAusVerlauf(aufnahme));
 p(ecken.length===2&&ecken[0].art==="aussen"&&ecken[0].pos_mm===4850
   &&ecken[1].art==="innen"&&ecken[1].pos_mm===8050,"Ecken an 4850 mm (aussen) und 8050 mm (innen)",ecken);
 // Die Ecken wirken als Fixpunkt in der bestehenden Rechnung
 const bnd=await page.evaluate(()=>computeRinneBoundaries(aufnahme.segmente).boundaries);
 p(bnd.filter(b=>b.typ==="fix").length===2,"zwei Fixpunkte aus den Ecken",bnd);
 const komp2=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung+" ="+k.menge));
 p(komp2.some(k=>k.startsWith("Aussenwinkel")&&k.endsWith("=1")),"Ausmass: 1 Aussenwinkel",komp2);
 p(komp2.some(k=>k.startsWith("Innenwinkel")&&k.endsWith("=1")),"Ausmass: 1 Innenwinkel",komp2);
 const h2=await page.evaluate(()=>halterVorschlag(aufnahme));
 p(h2===26,"Haltervorschlag 26 Stk. (12 400 / 500 + 1)",h2);
 p(fehler.length===0,"Test 2 ohne JS-Fehler",fehler);

 // ------------------------------------------------------------------
 console.log("\nTEST 3 · zwei Abläufe bei 4 800 und 9 200");
 await gehe(3);
 await page.click("#p-addAblauf"); await page.waitForTimeout(60);
 await page.locator('[data-abl-pos="0"]').fill("4800"); await page.waitForTimeout(40);
 await page.click("#p-addAblauf"); await page.waitForTimeout(60);
 await page.locator('[data-abl-pos="1"]').fill("9200"); await page.waitForTimeout(40);
 await page.selectOption('[data-abl-d="1"]',"Ø 120"); await page.waitForTimeout(60);
 m=await modell();
 p(m.ablaeufe.length===2&&m.ablaeufe[0].pos_mm===4800&&m.ablaeufe[1].pos_mm===9200,
   "zwei Abläufe an 4 800 und 9 200 mm",m.ablaeufe.map(a=>a.pos_mm));
 p(m.ablaeufe[1].durchmesser==="Ø 120","Durchmesser des zweiten Ablaufs übernommen",m.ablaeufe[1].durchmesser);
 const pr3=await page.evaluate(()=>pruefungen(aufnahme));
 p(!pr3.some(x=>x.text.includes("Ablauf")),"kein Ablauf ausserhalb der Rinne",pr3);
 const komp3=await page.evaluate(()=>komponenten(aufnahme).map(k=>k.bezeichnung+" ="+k.menge));
 p(komp3.some(k=>k.includes("Einhangstutzen")&&k.includes("Ø 100")),"Ausmass: Einhangstutzen Ø 100",komp3);
 p(komp3.some(k=>k.includes("Einhangstutzen")&&k.includes("Ø 120")),"Ausmass: Einhangstutzen Ø 120",komp3);
 // Verlaufsband zeigt beide Abläufe
 await gehe(2);
 const band=await page.locator("#p-band").innerHTML();
 p((band.match(/<circle/g)||[]).length===2,"Verlaufsband zeigt beide Abläufe");
 p(!band.includes("#b42318"),"kein Ablauf rot markiert");
 // Ablauf ausserhalb -> Warnung
 await gehe(3);
 await page.locator('[data-abl-pos="1"]').fill("15000"); await page.waitForTimeout(60);
 const pr3b=await page.evaluate(()=>pruefungen(aufnahme));
 p(pr3b.some(x=>x.art==="fehler"&&x.text.includes("ausserhalb")),"Ablauf ausserhalb wird gemeldet",pr3b);
 await page.locator('[data-abl-pos="1"]').fill("9200"); await page.waitForTimeout(60);
 p(fehler.length===0,"Test 3 ohne JS-Fehler",fehler);

 // ------------------------------------------------------------------
 console.log("\nTEST 4 · Abschnitte 4850+3200+4250 gegen Gesamtlänge 12 400");
 await gehe(2);
 await setzeLaenge(2,4250);
 await gehe(1);
 await page.fill("#p-gesamt","12400"); await page.waitForTimeout(60);
 const pr4=await page.evaluate(()=>pruefungen(aufnahme));
 const warn=pr4.filter(x=>x.art==="warnung"&&x.text.includes("Differenz"));
 p(warn.length===1,"genau eine Differenz-Warnung",pr4);
 p(warn[0]&&warn[0].text.includes("12’300")&&warn[0].text.includes("12’400"),
   "Warnung nennt beide Werte",warn[0]&&warn[0].text);
 p(warn[0]&&warn[0].text.includes("+100"),"Warnung nennt die Differenz +100 mm",warn[0]&&warn[0].text);
 // Sie muss in Schritt 5 sichtbar sein
 await gehe(5);
 const txt5=await page.locator("#p-inhalt").innerText();
 p(txt5.includes("Differenz"),"Warnung erscheint in der Kontrolle");
 p(!txt5.includes("⛔"),"es ist eine Warnung, kein Fehler");
 // Aufnahme bleibt speicherbar
 const gespeichert=await page.evaluate(()=>aufnahmeSpeichern());
 p(gespeichert===true,"trotz Warnung speicherbar");
 await gehe(2); await setzeLaenge(2,4350);
 p(fehler.length===0,"Test 4 ohne JS-Fehler",fehler);

 // ------------------------------------------------------------------
 console.log("\nTEST 5 · Massaufnahme kopieren");
 await gehe(1);
 await page.fill("#p-bez","Test 5 Original"); await page.waitForTimeout(40);
 await page.click("#p-speichern"); await page.waitForTimeout(150);
 const vorher=await modell();
 page.once("dialog",d=>d.accept());
 await page.click("#p-kopieren"); await page.waitForTimeout(200);
 const kopie=await modell();
 p(kopie.id!==vorher.id,"Kopie hat eine eigene ID",[vorher.id,kopie.id]);
 p(kopie.bezeichnung!==vorher.bezeichnung&&kopie.bezeichnung.includes(vorher.bezeichnung),
   "Kopie ist als solche erkennbar",kopie.bezeichnung);
 p(JSON.stringify(kopie.segmente)===JSON.stringify(vorher.segmente),"Verlauf vollständig übernommen");
 p(JSON.stringify(kopie.ablaeufe)===JSON.stringify(vorher.ablaeufe),"Abläufe vollständig übernommen");
 // Änderung an der Kopie darf das Original nicht anfassen
 await gehe(2);
 await setzeLaenge(0,1111);
 await page.click("#p-speichern"); await page.waitForTimeout(150);
 const orig=await page.evaluate(id=>alleAufnahmen().find(a=>a.id===id),vorher.id);
 p(orig&&orig.segmente[0].laenge===4850,"Original bleibt unverändert",orig&&orig.segmente[0].laenge);
 const kop=await page.evaluate(id=>alleAufnahmen().find(a=>a.id===id),kopie.id);
 p(kop&&kop.segmente[0].laenge===1111,"Kopie trägt die Änderung",kop&&kop.segmente[0].laenge);
 p(fehler.length===0,"Test 5 ohne JS-Fehler",fehler);

 // ------------------------------------------------------------------
 console.log("\nB · Bedienung");
 // Fokus bleibt beim Tippen erhalten (Falle aus CLAUDE.md 66)
 await neu();
 await gehe(2);
 const feld=page.locator('[data-seg-laenge="0"]');
 await feld.click();
 await page.keyboard.type("7500");
 const zustand=await page.evaluate(()=>({
  wert:document.querySelector('[data-seg-laenge="0"]').value,
  fokus:document.activeElement&&document.activeElement.dataset.segLaenge!==undefined,
  modell:aufnahme.segmente[0].laenge}));
 p(zustand.wert==="7500","ganze Zahl getippt, nichts verloren",zustand);
 const sum=await page.locator("#p-summeL").innerText();
 p(sum.includes("7’500"),"Gesamtlänge aktualisiert sich beim Tippen",sum);
 // Ein bestehendes Mass korrigieren: der alte Wert wird ersetzt, nicht ergaenzt.
 await page.click("#p-kopf");            // Fokus weg, wie beim naechsten Feld
 await feld.click(); await page.keyboard.type("6200"); await page.waitForTimeout(60);
 const ersetzt=await page.evaluate(()=>document.querySelector('[data-seg-laenge="0"]').value);
 p(ersetzt==="6200","Antippen markiert den Wert, Tippen ersetzt ihn",ersetzt);
 p(zustand.fokus===true,"Feld behält den Fokus",zustand);
 p(zustand.modell===7500,"Modell übernimmt den Wert",zustand);

 // Material wirkt auf die Dila-Rechnung des bestehenden Moduls
 await gehe(2); await setzeLaenge(0,10000);
 const dKupfer=await page.evaluate(()=>dilasBerechnet(aufnahme).dilas.length);
 await gehe(1); await page.selectOption("#p-material","1"); await page.waitForTimeout(60);
 const dAlu=await page.evaluate(()=>dilasBerechnet(aufnahme).dilas.length);
 p(dKupfer===1&&dAlu===2,"Aluminium braucht mehr Dehnungselemente als Kupfer",[dKupfer,dAlu]);

 // Ausmass folgt der Aufnahme ohne zweite Eingabe
 const vorAusmass=await page.evaluate(()=>ausmassZeilen(aufnahme).find(z=>z.einheit==="m").menge);
 await gehe(2); await setzeLaenge(0,20000);
 const nachAusmass=await page.evaluate(()=>ausmassZeilen(aufnahme).find(z=>z.einheit==="m").menge);
 p(vorAusmass==="10.00"&&nachAusmass==="20.00","Ausmass folgt der Massaufnahme automatisch",[vorAusmass,nachAusmass]);

 // ------------------------------------------------------------------
 console.log("\nC · Bildschirmbreiten");
 for(const b of [320,360,412,768,1280]){
  await page.setViewportSize({width:b,height:900});
  for(const s of [1,2,3,4,5,6]){
   await gehe(s);
   const ueber=await page.evaluate(()=>{
    // Absichtlich seitwaerts scrollende Behaelter (Schrittleiste, Ausmass-
    // Tabelle) duerfen breiter sein als der Bildschirm - sie scrollen selbst.
    // Geprueft wird deshalb: der Behaelter selbst passt, und ausserhalb
    // solcher Behaelter ragt nichts hinaus.
    const scrollt=e=>{const o=getComputedStyle(e).overflowX;return o==="auto"||o==="scroll"};
    const inScroll=e=>{let x=e.parentElement;while(x&&x.id!=="p-app"){if(scrollt(x))return true;x=x.parentElement}return false};
    return {
     doc:document.documentElement.scrollWidth-document.documentElement.clientWidth,
     raus:Array.from(document.querySelectorAll("#p-app *")).filter(e=>{
      const r=e.getBoundingClientRect();
      return r.width>0&&r.right>window.innerWidth+1&&!inScroll(e);})
      .map(e=>e.tagName+"."+String(e.className||"").split(" ")[0])};
   });
   p(ueber.doc<=1&&ueber.raus.length===0,`Breite ${b} px, Schritt ${s}: nichts läuft seitlich hinaus`,ueber);
  }
 }
 await page.setViewportSize({width:412,height:900});

 // Trefferflächen
 await gehe(2);
 const klein=await page.evaluate(()=>Array.from(document.querySelectorAll("#p-app button"))
  .filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height<34})
  .map(b=>b.textContent.trim().slice(0,20)));
 p(klein.length===0,"alle sichtbaren Knöpfe mindestens 34 px hoch",klein);

 p(fehler.length===0,"insgesamt keine JS-Fehler",fehler);

 await browser.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen ===`);
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
