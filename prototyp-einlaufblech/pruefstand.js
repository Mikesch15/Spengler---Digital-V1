"use strict";
// ===========================================================================
// Prüfstand · Prototyp Einlaufblech gerade
// Läuft in echtem Chromium gegen die eigenständige Testapp – also gegen genau
// die Datei, die auf dem Tablet geöffnet wird.
//
// Aufruf:  SP=<Ordner mit node_modules> node prototyp-einlaufblech/pruefstand.js
// ===========================================================================
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"prototyp-einlaufblech","einlaufblech-gerade-testapp.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

// Wert eines Feldes zeichenweise eintippen - so, wie ein Mensch es tut.
async function tippe(page,id,text){
 await page.evaluate(i=>{const f=document.getElementById(i);f.focus();f.value=""},id);
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(60);
}
const reg=async(page,n)=>{await page.evaluate(k=>setzeSchritt(k),n);await page.waitForTimeout(120)};
// Auswahlfeld setzen. Ueber evaluate statt selectOption: ein fehlendes Feld
// wuerde selectOption in einen Timeout laufen lassen, und ein abgebrochener
// Pruefstand sieht aus wie "keine Fehler".
async function waehle(page,id,wert){
 const da=await page.evaluate(([i,v])=>{
  const f=document.getElementById(i);
  if(!f)return false;
  f.value=String(v); f.dispatchEvent(new Event("change",{bubbles:true})); return true;
 },[id,wert]);
 await page.waitForTimeout(140);
 return da;
}
const text=page=>page.evaluate(()=>document.getElementById("p-inhalt").innerText);

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:800,height:1200}});   // Tablet, hochkant
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(300);
 await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});

 console.log("\n0 · Fachlogik der App ist geladen");
 const geladen=await page.evaluate(()=>({
  diagram:typeof einlaufblechDiagramSvg==="function",
  teile:typeof teileLaengeInStuecke==="function",
  grundriss:typeof generateEbkGrundriss==="function",
  ausRinne:typeof baueEinlaufblechStueckeAusRinne==="function",
  pfeil:typeof ansichtsPfeilSvg==="function",
  einst:JSON.stringify(einlaufblechSettings)
 }));
 p(geladen.diagram,"einlaufblechDiagramSvg aus js/11");
 p(geladen.teile,"teileLaengeInStuecke aus js/13");
 p(geladen.grundriss,"generateEbkGrundriss aus js/13");
 p(geladen.ausRinne,"baueEinlaufblechStueckeAusRinne aus js/13");
 p(geladen.pfeil,"ansichtsPfeilSvg aus js/14");
 p(/"stoss_laenge":2000/.test(geladen.einst)&&/"umschlag_oben":12/.test(geladen.einst),
   "Einstellungen wie EINLAUFBLECH_STANDARD der App",geladen.einst);

 // ---- TEST 1 · Gültige Standardaufnahme ----------------------------------
 console.log("\n1 · Gültige Standardaufnahme");
 await reg(page,1);
 await tippe(page,"p-bezeichnung","Einlauf Nordseite");
 p(await waehle(page,"p-material","3"),"Material waehlbar");
 p(await waehle(page,"p-abwicklung","250"),"Abwicklung waehlbar");
 p(await waehle(page,"p-montage","links"),"Montage waehlbar");
 await reg(page,2);
 await tippe(page,"p-massA","120");
 await tippe(page,"p-winkel","30");
 const st=await page.evaluate(()=>({
  restbreite:restbreite(aufnahme), eng:massAEng(aufnahme), seite:engeSeite(aufnahme),
  svg:document.querySelector("#p-schnitt svg")?document.querySelector("#p-schnitt svg").outerHTML.length:0,
  winkelText:/30°/.test(document.getElementById("p-schnitt").innerHTML)
 }));
 p(st.restbreite===106,"Restbreite 250−120−12−12 = 106 mm",st);
 p(st.eng===118,"enges Mass 120−2 = 118 mm",st);
 p(st.seite==="rechts",'Montage "links" -> enge Seite "rechts"',st);
 p(st.svg>500,"Schnittzeichnung ist gezeichnet",st);
 p(st.winkelText,"der Winkel steht in der Zeichnung",st);
 await reg(page,3);
 await tippe(page,"p-gesamtlaenge","5000");
 await page.click("#p-stueckeNeu"); await page.waitForTimeout(150);
 const stk=await page.evaluate(()=>({
  anzahl:aufnahme.stuecke.length,
  laengen:aufnahme.stuecke.map(x=>x.laenge),
  soll:teileLaengeInStuecke(5000,einlaufblechSettings),
  gesamt:gesamtlaengeStuecke(aufnahme),
  grundriss:document.querySelector("#p-grundriss svg")?1:0
 }));
 p(stk.laengen.join()===stk.soll.join(),"Aufteilung identisch zu teileLaengeInStuecke()",stk);
 p(stk.anzahl===3&&stk.laengen.join()==="2070,2070,1000","5000 mm -> 2070 + 2070 + 1000",stk);
 p(stk.gesamt===5140,"Gesamtlänge der Zuschnitte 5140 mm",stk);
 p(stk.grundriss===1,"Grundriss ist gezeichnet",stk);

 console.log("\n1b · Gehrung und Endzugabe (Regeln aus js/15)");
 // Ueber das echte Kaestchen, nicht am Modell vorbei.
 const vorG=await page.evaluate(()=>JSON.parse(JSON.stringify(aufnahme.stuecke)));
 const geklickt=await page.evaluate(()=>{
  const k=document.querySelector('[data-gr="0"]');
  if(!k)return false;
  k.checked=true; k.dispatchEvent(new Event("change",{bubbles:true})); return true;
 });
 await page.waitForTimeout(150);
 p(geklickt,"Gehrung-Kästchen vorhanden");
 const nachG=await page.evaluate(()=>({
  st:JSON.parse(JSON.stringify(aufnahme.stuecke)),
  zugabe:zahl(einlaufblechSettings.gehrungszugabe)
 }));
 p(nachG.st[0].laenge===vorG[0].laenge+nachG.zugabe,
   "Gehrung legt die Gehrungszugabe zu",{vor:vorG[0].laenge,nach:nachG.st[0].laenge,zugabe:nachG.zugabe});
 p(nachG.st[0].winkel===90,"und setzt den Winkel auf 90°",nachG.st[0]);
 p(nachG.st[1].gehrungLinks===true&&nachG.st[1].laenge===vorG[1].laenge+nachG.zugabe,
   "das Nachbarstück derselben Ecke wird mitgesetzt",nachG.st[1]);
 // wieder aus
 await page.evaluate(()=>{
  const k=document.querySelector('[data-gr="0"]');
  k.checked=false; k.dispatchEvent(new Event("change",{bubbles:true}));
  const k2=document.querySelector('[data-gl="1"]');
  k2.checked=false; k2.dispatchEvent(new Event("change",{bubbles:true}));
 });
 await page.waitForTimeout(150);
 const wiederAus=await page.evaluate(()=>aufnahme.stuecke.map(x=>x.laenge));
 p(wiederAus.join()===vorG.map(x=>x.laenge).join(),"Gehrung wieder aus -> alte Längen",wiederAus);
 // Endzugabe immer auf dem Reststueck
 const endz=await page.evaluate(()=>{
  const vor=aufnahme.stuecke.map(x=>x.laenge);
  document.getElementById("p-endStart").click();
  const nach=aufnahme.stuecke.map(x=>x.laenge);
  const letzte=aufnahme.stuecke[aufnahme.stuecke.length-1];
  return {vor,nach,zugabe:zahl(einlaufblechSettings.end_zugabe),flag:letzte.endzugabeStart};
 });
 await page.waitForTimeout(120);
 p(endz.nach[endz.nach.length-1]===endz.vor[endz.vor.length-1]+endz.zugabe,
   "Endzugabe landet auf dem Reststück",endz);
 p(endz.nach.slice(0,-1).join()===endz.vor.slice(0,-1).join(),
   "die übrigen Stücke bleiben unverändert",endz);
 await page.evaluate(()=>{document.getElementById("p-endStart").click()});
 await page.waitForTimeout(120);
 p((await page.evaluate(()=>aufnahme.stuecke.map(x=>x.laenge))).join()===endz.vor.join(),
   "nochmals drücken nimmt sie wieder weg");

 // ---- TEST 2 · Winkel ändern ---------------------------------------------
 console.log("\n2 · Winkel ändern");
 await reg(page,2);
 const vorW=await page.evaluate(()=>document.getElementById("p-schnitt").innerHTML);
 await tippe(page,"p-winkel","45");
 const nachW=await page.evaluate(()=>({
  html:document.getElementById("p-schnitt").innerHTML,
  wert:aufnahme.winkel, fokus:document.activeElement&&document.activeElement.id
 }));
 p(nachW.wert===45,"Winkel im Modell 45",nachW);
 p(nachW.html!==vorW,"Zeichnung hat sich geändert");
 p(/45°/.test(nachW.html),"Zeichnung zeigt 45°");
 p(nachW.fokus==="p-winkel","Feld behält den Fokus beim Tippen",nachW);
 await reg(page,5);
 p(/45°/.test(await text(page)),"Zusammenfassung zeigt 45°");

 // ---- TEST 3 · Mass A ändern ---------------------------------------------
 console.log("\n3 · Mass A ändern");
 await reg(page,2);
 const vorA=await page.evaluate(()=>document.getElementById("p-schnitt").innerHTML);
 await tippe(page,"p-massA","150");
 const nachA=await page.evaluate(()=>({
  html:document.getElementById("p-schnitt").innerHTML,
  rb:restbreite(aufnahme), eng:massAEng(aufnahme),
  fokus:document.activeElement&&document.activeElement.id
 }));
 p(nachA.rb===76,"Restbreite folgt: 250−150−12−12 = 76 mm",nachA);
 p(nachA.eng===148,"enges Mass folgt: 148 mm",nachA);
 p(nachA.html!==vorA,"Zeichnung hat sich geändert");
 p(nachA.fokus==="p-massA","Feld behält den Fokus",nachA);
 await reg(page,2);
 const anzeige=await text(page);
 p(/76/.test(anzeige)&&/148/.test(anzeige),"Register 2 zeigt beide Folgewerte");

 // ---- TEST 4 · Restbreite ändern (über die Abwicklung) -------------------
 console.log("\n4 · Restbreite ändern");
 // Die Restbreite ist ein Ergebnis, kein Eingabefeld - genau wie in der App.
 // Geändert wird sie über die Abwicklung.
 const vorR=await page.evaluate(()=>document.getElementById("p-schnitt").innerHTML);
 // Die Abwicklung steht in Register 1 - erst dorthin.
 await reg(page,1);
 p(await waehle(page,"p-abwicklung","330"),"Abwicklung auf 330 mm gesetzt");
 await reg(page,2);
 const nachR=await page.evaluate(()=>({
  rb:restbreite(aufnahme), abw:aufnahme.abwicklung,
  html:document.getElementById("p-schnitt").innerHTML
 }));
 p(nachR.abw===330,"Abwicklung 330 mm übernommen",nachR);
 p(nachR.rb===156,"Restbreite 330−150−12−12 = 156 mm",nachR);
 p(nachR.html!==vorR,"Zeichnung hat sich geändert");
 await reg(page,6);
 p(/330 mm/.test(await text(page)),"Ausmass nennt die neue Abwicklung");
 await reg(page,1); await waehle(page,"p-abwicklung","250");

 // ---- TEST 5 · Umschlag oben/unten ändern --------------------------------
 console.log("\n5 · Umschlag oben/unten ändern");
 await page.evaluate(()=>{einstellungenOffen=true;zeichne()});
 await page.waitForTimeout(120);
 const vorU=await page.evaluate(()=>{setzeSchritt(2);return document.getElementById("p-schnitt").innerHTML});
 await page.evaluate(()=>{einstellungenOffen=true;zeichne()});
 await page.waitForTimeout(100);
 await page.evaluate(()=>{
  const f=document.querySelector('[data-einst="umschlag_oben"]');
  f.value="30"; f.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await page.waitForTimeout(120);
 const nachU=await page.evaluate(()=>{
  setzeSchritt(2);
  return {uO:einlaufblechSettings.umschlag_oben, rb:restbreite(aufnahme),
          html:document.getElementById("p-schnitt").innerHTML};
 });
 p(nachU.uO===30,"Umschlag oben 30 mm gespeichert",nachU);
 p(nachU.rb===58,"Restbreite folgt: 250−150−30−12 = 58 mm",nachU);
 p(nachU.html!==vorU,"Zeichnung hat sich geändert");
 // zurück auf die Vorgabe
 await page.evaluate(()=>{einlaufblechSettings.umschlag_oben=12;einstellungenSpeichern();setzeSchritt(2)});
 await page.waitForTimeout(100);
 p(await page.evaluate(()=>restbreite(aufnahme))===76,"zurück auf 12 mm -> Restbreite wieder 76 mm");

 // ---- TEST 6 · Fehlende/ungültige Eingabe --------------------------------
 console.log("\n6 · Fehlende und ungültige Eingaben");
 const faelle=[
  {name:"Mass A fehlt", setzen:a=>{a.massA=0}, muster:/Mass A fehlt/},
  {name:"Mass A negativ", setzen:a=>{a.massA=-5}, muster:/negativ/},
  {name:"Winkel fehlt", setzen:a=>{a.winkel=""}, muster:/Winkel fehlt/},
  {name:"Winkel 0°", setzen:a=>{a.winkel=0}, muster:/Winkel fehlt|lässt sich nicht zeichnen/},
  {name:"Winkel 200°", setzen:a=>{a.winkel=200}, muster:/lässt sich nicht zeichnen/},
  {name:"Restbreite negativ", setzen:a=>{a.massA=400}, muster:/Restbreite/},
  {name:"kein Stück", setzen:a=>{a.stuecke=[]}, muster:/Noch kein Stück/}
 ];
 for(const f of faelle){
  const res=await page.evaluate(f2=>{
   const merk=JSON.parse(JSON.stringify(aufnahme));
   // eslint-disable-next-line no-new-func
   (new Function("a",f2.setzen))(aufnahme);
   setzeSchritt(5);
   const t=document.getElementById("p-inhalt").innerText;
   const punkt=!!document.querySelector(".p-punkt-rot,.p-punkt-orange");
   aufnahme=merk; setzeSchritt(5);
   return {t,punkt};
  },{setzen:f.setzen.toString().replace(/^[^{]*\{/,"").replace(/\}$/,"")});
  p(f.muster.test(res.t),"Meldung: "+f.name,res.t.slice(0,160));
  p(res.punkt,"Register 5 ist markiert bei: "+f.name);
 }
 const gueltig=await page.evaluate(()=>{
  aufnahme.massA=150;aufnahme.winkel=45;
  setzeSchritt(5);return document.getElementById("p-inhalt").innerText;
 });
 p(/Keine Auffälligkeiten/.test(gueltig)||!/⛔/.test(gueltig),
   "gültige Aufnahme meldet keinen Fehler",gueltig.slice(0,120));

 // ---- TEST 7 · Speichern -> Laden ----------------------------------------
 console.log("\n7 · Speichern und wieder laden");
 const gespeichert=await page.evaluate(()=>{
  aufnahme.bezeichnung="Prüffall 7";
  aufnahme.objekt="Musterstrasse 1";
  aufnahme.bemerkung="Notiz zum Prüffall";
  aufnahme.material="2"; aufnahme.montage="rechts";
  aufnahme.massA=140; aufnahme.winkel=38; aufnahme.abwicklung=330;
  aufnahme.gesamtlaenge=4200;
  aufnahme.stuecke=stueckeAusGesamtlaenge(4200);
  aufnahme.stuecke[0].gehrungLinks=true;
  speichern();
  return JSON.parse(JSON.stringify(aufnahme));
 });
 const geladen2=await page.evaluate(id=>{
  aufnahme=leereAufnahme();          // erst alles vergessen
  const erfolg=oeffnen(id);
  return {erfolg,a:JSON.parse(JSON.stringify(aufnahme))};
 },gespeichert.id);
 p(geladen2.erfolg,"gespeicherte Aufnahme wird gefunden");
 const felder=["bezeichnung","objekt","bemerkung","material","montage","massA","winkel","abwicklung","gesamtlaenge"];
 const abweichend=felder.filter(k=>String(geladen2.a[k])!==String(gespeichert[k]));
 p(abweichend.length===0,"alle Kopffelder erhalten",abweichend);
 p(JSON.stringify(geladen2.a.stuecke)===JSON.stringify(gespeichert.stuecke),
   "Stückliste vollständig erhalten",{geladen:geladen2.a.stuecke.length});
 const nachLaden=await page.evaluate(()=>({rb:restbreite(aufnahme),eng:massAEng(aufnahme),seite:engeSeite(aufnahme)}));
 p(nachLaden.rb===330-140-12-12,"Restbreite nach dem Laden richtig gerechnet",nachLaden);
 p(nachLaden.seite==="links",'Montage "rechts" -> enge Seite "links"',nachLaden);

 // ---- TEST 8 · Kopieren ---------------------------------------------------
 console.log("\n8 · Kopieren erzeugt eine unabhängige Aufnahme");
 const kopie=await page.evaluate(id=>{
  const neueId=kopieren(id);
  aufnahme.massA=999;                      // die Kopie verändern
  aufnahme.stuecke[0].laenge=111;
  speichern();
  const original=alleAufnahmen().find(x=>x.id===id);
  const k=alleAufnahmen().find(x=>x.id===neueId);
  return {neueId,gleicheId:neueId===id,
          originalMassA:original.massA, originalErstesStueck:original.stuecke[0].laenge,
          kopieMassA:k.massA, kopieErstesStueck:k.stuecke[0].laenge,
          bezeichnung:k.bezeichnung, anzahl:alleAufnahmen().length};
 },gespeichert.id);
 p(!kopie.gleicheId,"die Kopie hat eine eigene Kennung",kopie);
 p(/Kopie/.test(kopie.bezeichnung),"die Bezeichnung ist als Kopie erkennbar",kopie);
 p(kopie.originalMassA===140,"das Original bleibt bei Mass A 140",kopie);
 p(kopie.originalErstesStueck!==111,"das erste Stück des Originals ist unverändert",kopie);
 p(kopie.kopieMassA===999,"die Kopie trägt den neuen Wert",kopie);
 p(kopie.anzahl===2,"beide Aufnahmen liegen gespeichert vor",kopie);

 // ---- TEST 9 · Ausmass ----------------------------------------------------
 console.log("\n9 · Ausmass entsteht aus der Aufnahme");
 const am=await page.evaluate(()=>{
  aufnahme=leereAufnahme();
  aufnahme.material="3"; aufnahme.abwicklung=250; aufnahme.massA=120; aufnahme.winkel=30;
  aufnahme.stuecke=stueckeAusGesamtlaenge(5000);
  aufnahme.stuecke[1].gehrungRechts=true; aufnahme.stuecke[2].gehrungLinks=true;
  setzeSchritt(6);
  const zellen=Array.from(document.querySelectorAll("#p-inhalt table")).map(t=>t.innerText).join(" | ");
  return {zeilen:ausmassZeilen(aufnahme), tabelle:zellen,
          hinweis:document.getElementById("p-inhalt").innerText,
          L:gesamtlaengeStuecke(aufnahme)};
 });
 const holen=b=>am.zeilen.find(z=>new RegExp(b,"i").test(z.bezeichnung));
 p(am.zeilen.length>=4,"Ausmass hat Positionen",am.zeilen.length);
 p(holen("Einlaufblech gerade")&&holen("Einlaufblech gerade").menge==="5,14",
   "Länge 5140 mm erscheint als 5,14 m",holen("Einlaufblech gerade"));
 p(holen("Stücke")&&holen("Stücke").menge===3,"3 Stücke",holen("Stücke"));
 p(holen("Gehrungen")&&holen("Gehrungen").menge===2,"2 Gehrungen",holen("Gehrungen"));
 p(holen("Blechstösse")&&holen("Blechstösse").menge===2,"2 Blechstösse",holen("Blechstösse"));
 p(!/Fr\.|CHF|Preis|Art\.-?Nr|\d+\.\d{2}\s*(Fr|CHF)/i.test(am.tabelle),
   "keine Preise und keine Artikelnummern in den Ausmass-Tabellen",am.tabelle.slice(0,200));
 p(/Artikelnummern und Preise stehen hier bewusst nicht/.test(am.hinweis),
   "und es steht ausdruecklich da, dass sie fehlen");
 const amNachAenderung=await page.evaluate(()=>{
  aufnahme.stuecke.push({laenge:1500,stossStoss:1500,gehrungLinks:false,gehrungRechts:false,winkel:0});
  setzeSchritt(6);
  const z=ausmassZeilen(aufnahme);
  return {L:gesamtlaengeStuecke(aufnahme), menge:z[0].menge, stk:z[1].menge};
 });
 p(amNachAenderung.L===6640&&amNachAenderung.menge==="6,64"&&amNachAenderung.stk===4,
   "Ausmass folgt einer Änderung automatisch",amNachAenderung);

 // ---- TEST 10 · Materialübersicht ----------------------------------------
 console.log("\n10 · Materialübersicht entspricht der Aufnahme");
 const mat=await page.evaluate(()=>{
  aufnahme=leereAufnahme();
  aufnahme.material="2"; aufnahme.abwicklung=330;
  aufnahme.stuecke=stueckeAusGesamtlaenge(3000);
  setzeSchritt(6);
  const zellen=Array.from(document.querySelectorAll("#p-inhalt table")).map(t=>t.innerText).join(" | ");
  return {liste:materialUebersicht(aufnahme), text:zellen,
          L:gesamtlaengeStuecke(aufnahme)};
 });
 p(mat.liste.length===1,"eine Materialzeile",mat.liste);
 p(mat.liste[0].material==="Titanzink","das gewählte Material steht drin",mat.liste[0]);
 p(/330/.test(mat.liste[0].bezeichnung),"die Abwicklung steht in der Bezeichnung",mat.liste[0]);
 p(mat.liste[0].menge===(mat.L/1000).toFixed(2).replace(".",","),
   "die Menge ist die Summe der Zuschnitte",{menge:mat.liste[0].menge,L:mat.L});
 p(!/Fr\.|CHF|Preis|Art\.-?Nr/i.test(mat.text),
   "keine Preise und keine Artikelnummern in der Materialübersicht",mat.text.slice(0,200));
 const ohneMaterial=await page.evaluate(()=>{
  aufnahme.material="";
  setzeSchritt(6);
  return {mat:materialUebersicht(aufnahme)[0], pruef:(function(){setzeSchritt(5);return document.getElementById("p-inhalt").innerText})()};
 });
 p(ohneMaterial.mat.material==="–","ohne Materialwahl steht dort ein Strich",ohneMaterial.mat);
 p(/Kein Material gewählt/.test(ohneMaterial.pruef),"und die Kontrolle weist darauf hin");

 // ---- Übernahme aus einer Rinne (Fachlogik der App) ----------------------
 console.log("\n11 · Stücke aus Rinnensegmenten (Funktion der App)");
 const ausRinne=await page.evaluate(()=>{
  const segs=[{laenge:5000,winkel:90},{laenge:3000,winkel:0}];
  const st=baueEinlaufblechStueckeAusRinne(segs,einlaufblechSettings,
    l=>teileLaengeInStuecke(l,einlaufblechSettings),false);
  return {anzahl:st.length, laengen:st.map(x=>x.laenge), gehrungen:st.map(x=>[x.gehrungLinks,x.gehrungRechts])};
 });
 p(ausRinne.anzahl>=3,"aus zwei Segmenten entstehen mehrere Stücke",ausRinne);
 p(ausRinne.gehrungen.some(g=>g[1]===true),"die Ecke wird als Gehrung übernommen",ausRinne);

 console.log("\n11b · Beschriftungen der Zeichnung überdecken einander nicht");
 // Gemessen an den echten Textrahmen im Browser, nicht nach Augenmass.
 for(const [w,mA] of [[10,120],[30,120],[45,150],[60,90],[80,200],[120,120],[170,120]]){
  const r=await page.evaluate(([wi,ma])=>{
   aufnahme.winkel=wi; aufnahme.massA=ma; aufnahme.abwicklung=330;
   setzeSchritt(2);
   const svg=document.querySelector("#p-schnitt svg");
   if(!svg)return {fehlt:true};
   const texte=Array.from(svg.querySelectorAll("text"));
   const kaesten=texte.map(t=>{const b=t.getBBox();return {t:t.textContent,x:b.x,y:b.y,w:b.width,h:b.height}});
   let ueberlappt=null;
   for(let i=0;i<kaesten.length&&!ueberlappt;i++)
    for(let j=i+1;j<kaesten.length;j++){
     const a=kaesten[i],c=kaesten[j];
     if(a.x<c.x+c.w&&c.x<a.x+a.w&&a.y<c.y+c.h&&c.y<a.y+a.h){ueberlappt=[a.t,c.t];break}
    }
   // Läuft eine Beschriftung aus der viewBox heraus?
   const vb=svg.getAttribute("viewBox").split(/\s+/).map(Number);
   const raus=kaesten.filter(k=>k.x<vb[0]-0.5||k.x+k.w>vb[0]+vb[2]+0.5
                                ||k.y<vb[1]-0.5||k.y+k.h>vb[1]+vb[3]+0.5).map(k=>k.t);
   return {anzahl:texte.length,namen:texte.map(t=>t.textContent),ueberlappt,raus};
  },[w,mA]);
  p(!r.fehlt&&r.anzahl>=5,"Winkel "+w+"°: alle fünf Beschriftungen da",r.namen);
  p(!r.ueberlappt,"Winkel "+w+"°: keine Überdeckung",r.ueberlappt);
  p(r.raus&&r.raus.length===0,"Winkel "+w+"°: nichts läuft aus dem Bild",r.raus);
 }
 await page.evaluate(()=>{aufnahme=leereAufnahme();aufnahme.massA=120;aufnahme.winkel=30;setzeSchritt(1)});

 console.log("\n12 · Keine JS-Fehler");
 p(fehler.length===0,"keine Seitenfehler",fehler.slice(0,3));

 console.log("\n13 · Tablet-Breiten: nichts läuft seitlich hinaus");
 for(const w of [600,768,800,1024,1280]){
  await page.setViewportSize({width:w,height:1200});
  for(let n=1;n<=6;n++){
   await reg(page,n);
   const m=await page.evaluate(()=>{
    const br=document.documentElement.clientWidth, schlimm=[];
    document.querySelectorAll("#p-app *").forEach(el=>{
     const r=el.getBoundingClientRect();
     if(r.width>0&&r.right>br+1){
      let par=el.parentElement,scrollbar=false;
      while(par){const o=getComputedStyle(par).overflowX;
       if(o==="auto"||o==="scroll"){scrollbar=true;break}par=par.parentElement}
      if(!scrollbar)schlimm.push((el.id||el.className||el.tagName)+" right="+Math.round(r.right));}
    });
    return {schlimm:schlimm.slice(0,3),scrollt:document.documentElement.scrollWidth>br+1};
   });
   p(m.schlimm.length===0&&!m.scrollt,"Breite "+w+" px, Register "+n,m);
  }
 }

 await b.close();
 console.log("\npruefstand-einlaufblech: "+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN":"  – alle bestanden"));
 process.exit(fail?1:0);
})();
