"use strict";
// ===========================================================================
// Prüfstand · Prototyp Einlaufblech konisch
// Läuft in echtem Chromium gegen die eigenständige Testapp – also gegen genau
// die Datei, die auf dem Tablet geöffnet wird.
//
// Aufruf:  SP=<Ordner mit node_modules> node prototyp-einlaufblech-konisch/pruefstand.js
// ===========================================================================
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"prototyp-einlaufblech-konisch","einlaufblech-konisch-testapp.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

async function tippe(page,sel,text){
 const da=await page.evaluate(s=>{const f=document.querySelector(s);
  if(!f)return false; f.focus(); f.value=""; return true;},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(70);
 return true;
}
// Ueber evaluate mit Pruefung statt page.click: ein fehlendes oder gesperrtes
// Element soll sauber fehlschlagen, nicht in einen Timeout laufen - ein
// abgebrochener Pruefstand sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(180);
 return r;
}
async function waehle(page,sel,wert){
 const r=await page.evaluate(([s,v])=>{const f=document.querySelector(s);
  if(!f)return false; f.value=String(v); f.dispatchEvent(new Event("change",{bubbles:true})); return true;},[sel,wert]);
 await page.waitForTimeout(160);
 return r;
}
const reg=async(page,n)=>{await page.evaluate(k=>setzeSchritt(k),n);await page.waitForTimeout(140)};
const text=page=>page.evaluate(()=>document.getElementById("p-inhalt").innerText);

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:800,height:1300}});   // Tablet hochkant
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(300);
 await page.evaluate(()=>{try{localStorage.clear()}catch(e){}});

 console.log("\n0 · Fachlogik der App ist geladen");
 const fn=await page.evaluate(()=>({
  diagramm:typeof einlaufblechDiagramSvg,
  teile:typeof teileLaengeInStuecke,
  split:typeof splitLengthIntoPieces,
  grundriss:typeof generateEbkGrundriss,
  rinne:typeof baueEinlaufblechStueckeAusRinne,
  pfeil:typeof ansichtsPfeilSvg,
  calc:typeof calcEbkPiece,
  rest:typeof ebkRestbreite
 }));
 Object.keys(fn).forEach(k=>p(fn[k]==="function","übernommen: "+k,fn[k]));
 // Der Rechenkern des konischen Blechs kommt aus js/14, nicht aus js/13.
 const kern=await page.evaluate(()=>({
  eng:calcEbkPiece({massLinks:120,massRechts:150}),
  rest:ebkRestbreite(120,330)
 }));
 p(kern.eng.massLinksEng===118&&kern.eng.massRechtsEng===148,
   "calcEbkPiece: enges Mass = Mass − 2 je Seite",kern.eng);
 p(kern.rest===330-120-12-12,"ebkRestbreite: Abwicklung − Mass − beide Umschläge",kern.rest);

 console.log("\n1 · Leerer Zustand");
 const leer=await page.evaluate(()=>({
  register:document.querySelectorAll("#p-register .p-register-knopf").length,
  aktiv:document.querySelectorAll("#p-register .p-register-knopf.aktiv").length,
  stuecke:aufnahme.stuecke.length,
  L:gesamtlaengeStuecke(aufnahme),
  ausmass:ausmassZeilen(aufnahme).length,
  plan:rollenPlan(aufnahme).moeglich.length,
  fehler:pruefungen(aufnahme).filter(x=>x.art==="fehler").length
 }));
 p(leer.register===7,"sieben Register",leer.register);
 p(leer.aktiv===1,"genau eines ist aktiv",leer.aktiv);
 p(leer.stuecke===0&&leer.L===0,"noch kein Stück",leer);
 p(leer.ausmass===0&&leer.plan===0,"ohne Stücke wird nichts gerechnet",leer);
 p(leer.fehler>0,"die Kontrolle sagt, was fehlt",leer.fehler);
 await reg(page,5); p(/Noch nichts zu messen/i.test(await text(page)),"und das steht auch so da");

 console.log("\n2 · Gültige Standardaufnahme");
 await reg(page,1);
 await tippe(page,"#p-bezeichnung","Traufe Nordseite");
 await waehle(page,"#p-material","2");
 await waehle(page,"#p-abwicklung","330");
 await waehle(page,"#p-montage","rechts");
 await reg(page,2);
 await tippe(page,"#p-dachneigung","25");
 await reg(page,3);
 await tippe(page,"#p-gesamt","5000");
 const neu=await klick(page,"#p-stueckeNeu");
 p(neu==="ok","Stücke aus Gesamtlänge berechnen ist bedienbar",neu);
 const std=await page.evaluate(()=>({
  stuecke:aufnahme.stuecke.map(x=>x.laenge),
  soll:splitLengthIntoPieces(5000),
  eng:engeSeite(aufnahme),
  L:gesamtlaengeStuecke(aufnahme)
 }));
 p(std.stuecke.join()===std.soll.join(),
   "Aufteilung kommt aus splitLengthIntoPieces() der App",std);
 p(std.eng==="links","Montage von rechts → enge Seite links",std.eng);

 console.log("\n3 · Linkes Mass ändern");
 await page.evaluate(()=>{aufnahme.stuecke.forEach(p=>{p.massLinks=120;p.massRechts=150});zeichne()});
 await reg(page,3);
 await tippe(page,'[data-p-ml="0"]',"140");
 const links=await page.evaluate(()=>({
  wert:aufnahme.stuecke[0].massLinks,
  fokus:document.activeElement&&document.activeElement.dataset.pMl==="0",
  kon:konizitaet(aufnahme.stuecke[0]),
  eng:engesMass(aufnahme,aufnahme.stuecke[0]),
  rest:restbreite(aufnahme,aufnahme.stuecke[0])
 }));
 p(links.wert===140,"linkes Mass vollständig getippt",links.wert);
 p(links.fokus,"das Feld behält den Fokus",links);
 p(links.kon===10,"Konizität = rechts − links",links.kon);
 // enge Seite ist links -> enges Mass und Restbreite folgen dem linken Mass
 p(links.eng===138,"enges Mass folgt der engen Seite",links.eng);
 p(links.rest===330-140-24,"Restbreite folgt mit",links.rest);

 console.log("\n4 · Rechtes Mass ändern und Verkettung");
 await tippe(page,'[data-p-mr="0"]',"165");
 const rechts=await page.evaluate(()=>({
  eigen:aufnahme.stuecke[0].massRechts,
  naechstes:aufnahme.stuecke[1]?aufnahme.stuecke[1].massLinks:null,
  feld:(document.querySelector('[data-p-ml="1"]')||{}).value,
  fokus:document.activeElement&&document.activeElement.dataset.pMr==="0"
 }));
 p(rechts.eigen===165,"rechtes Mass gesetzt",rechts.eigen);
 p(rechts.naechstes===165,"wird zum linken Mass des nächsten Stücks",rechts);
 p(rechts.feld==="165","und steht sichtbar im Feld",rechts.feld);
 p(rechts.fokus,"ohne den Fokus zu verlieren",rechts);
 // Ohne Absicherung wirft ein fehlendes zweites Stueck hier eine Ausnahme und
 // der Pruefstand bricht ab - ein abgebrochener Pruefstand sieht aus wie
 // "keine Fehler". Fehlt das Stueck, muss die Pruefung sauber fehlschlagen.
 const frei=await page.evaluate(()=>{
  if(!aufnahme.stuecke[1])return "kein zweites Stück";
  aufnahme.stuecke[1].massLinks=170; zeichne();
  return aufnahme.stuecke[1].massLinks;
 });
 p(frei===170,"danach ist der Wert frei überschreibbar",frei);
 await page.evaluate(()=>{if(aufnahme.stuecke[1]){aufnahme.stuecke[1].massLinks=165;zeichne()}});

 console.log("\n5 · Geometrie / Winkel ändern");
 await reg(page,2);
 const svgVor=await page.evaluate(()=>$("p-schnitt").innerHTML);
 await tippe(page,"#p-dachneigung","40");
 const geo=await page.evaluate(()=>({
  wert:aufnahme.dachneigung,
  fokus:document.activeElement&&document.activeElement.id==="p-dachneigung",
  svg:$("p-schnitt").innerHTML,
  rep:repMass(aufnahme), rest:repRestbreite(aufnahme),
  // Rohwerte aus dem Modell, damit der Pruefstand unabhaengig nachrechnet
  // statt die geprueften Funktionen nur zu wiederholen.
  ml:aufnahme.stuecke.map(x=>Number(x.massLinks)||0),
  mr:aufnahme.stuecke.map(x=>Number(x.massRechts)||0),
  nan:/NaN|Infinity/.test($("p-inhalt").innerHTML)
 }));
 const mittel=a=>a.filter(v=>v>0).reduce((x,y)=>x+y,0)/a.filter(v=>v>0).length;
 p(geo.wert===40,"Winkel vollständig getippt",geo.wert);
 p(geo.fokus,"das Feld behält den Fokus");
 p(geo.svg!==svgVor,"die Schnittzeichnung folgt live",geo.svg.length);
 // Wie renderEbkDiagram() in js/14: Mittelwert der Masse auf der ENGEN Seite
 // (hier links). Unabhaengig aus den Rohwerten nachgerechnet, und die enge
 // Seite muss wirklich zaehlen - der Mittelwert der rechten Masse ist ein
 // anderer Wert.
 p(Math.abs(geo.rep-mittel(geo.ml))<1e-9,"mittleres Mass wie im bestehenden Modul",
   {rep:geo.rep,links:geo.ml,rechts:geo.mr});
 p(Math.abs(geo.rep-mittel(geo.mr))>1e-9,"und zwar auf der engen, nicht der breiten Seite",
   {rep:geo.rep,rechts:mittel(geo.mr)});
 p(geo.rest===330-geo.rep-24,"Restbreite dazu",geo.rest);
 p(!geo.nan,"kein NaN");

 console.log("\n6 · Mehrere Stücke");
 const mehr=await page.evaluate(()=>{
  const vor=aufnahme.stuecke.length;
  document.getElementById("p-stueckPlus")||setzeSchritt(3);
  return vor;
 });
 await reg(page,3);
 await klick(page,"#p-stueckPlus");
 const nachPlus=await page.evaluate(()=>({
  anzahl:aufnahme.stuecke.length,
  letzterLinks:aufnahme.stuecke[aufnahme.stuecke.length-1].massLinks,
  vorletzterRechts:aufnahme.stuecke[aufnahme.stuecke.length-2].massRechts,
  bloecke:document.querySelectorAll('[data-p-ml]').length
 }));
 p(nachPlus.anzahl===mehr+1,"Stück hinzugefügt",nachPlus);
 p(nachPlus.letzterLinks===nachPlus.vorletzterRechts,
   "das neue Stück übernimmt das rechte Mass des vorherigen",nachPlus);
 p(nachPlus.bloecke===nachPlus.anzahl,"jedes Stück hat einen eigenen Block",nachPlus);
 const inhalt=await text(page);
 p(/Stück 1/.test(inhalt)&&/Stück 2/.test(inhalt),"mit Stücknummer");
 p(/Konizität/i.test(inhalt),"und Konizität je Stück");

 console.log("\n7 · Gehrung");
 const gehr=await page.evaluate(()=>{
  const vor=aufnahme.stuecke[0].laenge;
  const c=document.querySelector('[data-p-gr="0"]');
  c.checked=true; c.dispatchEvent(new Event("change",{bubbles:true}));
  return {vor,nach:aufnahme.stuecke[0].laenge,winkel:aufnahme.stuecke[0].winkel,
          zugabe:Number(einlaufblechKonischSettings.gehrungszugabe)};
 });
 await page.waitForTimeout(180);
 p(gehr.nach===gehr.vor+gehr.zugabe,"Gehrung addiert die Gehrungszugabe",gehr);
 p(gehr.winkel===90,"und setzt den Winkel auf 90°",gehr.winkel);
 const gehrAus=await page.evaluate(()=>{
  const c=document.querySelector('[data-p-gr="0"]');
  c.checked=false; c.dispatchEvent(new Event("change",{bubbles:true}));
  return {laenge:aufnahme.stuecke[0].laenge,winkel:aufnahme.stuecke[0].winkel};
 });
 await page.waitForTimeout(180);
 p(gehrAus.laenge===gehr.vor&&gehrAus.winkel===0,"Abwählen nimmt sie wieder weg",gehrAus);

 console.log("\n8 · Endzugabe");
 const ez=await page.evaluate(()=>{
  const i=aufnahme.stuecke.length-1;
  return {vor:aufnahme.stuecke[i].laenge,zugabe:Number(einlaufblechKonischSettings.end_zugabe),i};
 });
 await klick(page,"#p-endEnde");
 const ezNach=await page.evaluate(()=>{
  const i=aufnahme.stuecke.length-1;
  return {laenge:aufnahme.stuecke[i].laenge,flag:aufnahme.stuecke[i].endzugabeEnd};
 });
 p(ezNach.laenge===ez.vor+ez.zugabe&&ezNach.flag===ez.zugabe,
   "Endzugabe wird auf das Reststück gerechnet",ezNach);
 await klick(page,"#p-endEnde");
 const ezAus=await page.evaluate(()=>aufnahme.stuecke[aufnahme.stuecke.length-1].laenge);
 p(ezAus===ez.vor,"und lässt sich wieder abschalten",ezAus);

 console.log("\n9 · Rinne übernehmen");
 await page.evaluate(()=>{
  localStorage.setItem("sd_prototyp_rinne_halbrund",JSON.stringify([
   {id:"ra_1",typ:"rinne_halbrund",bezeichnung:"Rinne Nordseite",
    erstellt:"2026-09-01T08:00:00.000Z",geaendert:"2026-09-02T08:00:00.000Z",
    segmente:[{laenge:5000,winkel:-90},{laenge:3000,winkel:0}]},
   {id:"ra_2",bezeichnung:"Rinne ohne Masse",segmente:[{laenge:0,winkel:0}]}
  ]));
  setzeSchritt(3);
 });
 await page.waitForTimeout(200);
 const rl=await page.evaluate(()=>({
  knoepfe:document.querySelectorAll("[data-rinne]").length,
  gesperrt:document.querySelectorAll("[data-rinne][disabled]").length,
  text:$("p-inhalt").innerText
 }));
 p(rl.knoepfe===2,"beide Rinnen in der Liste",rl.knoepfe);
 p(rl.gesperrt===1,"die Rinne ohne Masse ist gesperrt",rl.gesperrt);
 p(/Rinne Nordseite/.test(rl.text)&&/2 Segment/.test(rl.text),"mit Name und Segmentzahl");
 const uebernahme=await page.evaluate(()=>{
  const segs=[{laenge:5000,winkel:-90},{laenge:3000,winkel:0}];
  const soll=baueEinlaufblechStueckeAusRinne(segs,einlaufblechKonischSettings,splitLengthIntoPieces,true);
  document.querySelector('[data-rinne="0"]').click();
  return {soll:soll.map(x=>({l:x.laenge,gl:!!x.gehrungLinks,gr:!!x.gehrungRechts,ml:x.massLinks,mr:x.massRechts})),
          ist:aufnahme.stuecke.map(x=>({l:x.laenge,gl:!!x.gehrungLinks,gr:!!x.gehrungRechts,ml:x.massLinks,mr:x.massRechts}))};
 });
 await page.waitForTimeout(250);
 p(JSON.stringify(uebernahme.ist)===JSON.stringify(uebernahme.soll),
   "die Stücke sind exakt die der App-Funktion (mitMassen=true)",uebernahme);
 p(uebernahme.ist.some(x=>x.gr||x.gl),"eine Ecke wird zur Gehrung");
 p(uebernahme.ist.every(x=>x.ml!==undefined&&x.mr!==undefined),
   "mit massLinks/massRechts je Stück");
 // App-Format als Text
 const ausText=await page.evaluate(()=>{
  aufnahme.stuecke=[]; setzeSchritt(3);
  document.getElementById("p-rinneEinfuegen").click();
  document.getElementById("p-rinneText").value=JSON.stringify({id:7,title:"Aus der App",
    type:"rinne_halbrund",data:{segments:[{laenge:4000,winkel:0}]}});
  document.getElementById("p-rinneTextUebernehmen").click();
  return {ist:aufnahme.stuecke.map(x=>x.laenge),soll:splitLengthIntoPieces(4000)};
 });
 await page.waitForTimeout(220);
 p(ausText.ist.join()===ausText.soll.join(),"eine Massaufnahme im App-Format lässt sich einfügen",ausText);
 const mist=await page.evaluate(()=>{
  const vor=aufnahme.stuecke.map(x=>x.laenge).join();
  document.getElementById("p-rinneEinfuegen").click();
  document.getElementById("p-rinneText").value="kein json";
  document.getElementById("p-rinneTextUebernehmen").click();
  return {vor,nach:aufnahme.stuecke.map(x=>x.laenge).join()};
 });
 await page.waitForTimeout(200);
 p(mist.vor===mist.nach,"unlesbarer Text ändert nichts",mist);

 console.log("\n10 · Grundriss");
 await page.evaluate(()=>{
  aufnahme.stuecke=[
   {laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:true,winkel:90,massLinks:120,massRechts:150},
   {laenge:1450,stossStoss:1450,gehrungLinks:true,gehrungRechts:false,winkel:0,massLinks:150,massRechts:160}];
  zeichne(); setzeSchritt(3);
 });
 await page.waitForTimeout(200);
 const gr=await page.evaluate(()=>{
  const h=$("p-grundriss").innerHTML;
  return {svg:(h.match(/<svg/g)||[]).length,
          linien:(h.match(/<line/g)||[]).length,
          nummern:(h.match(/<circle/g)||[]).length,
          pfeilWeg:h.indexOf(ansichtsPfeilSvg("links",368,368))<0,
          nan:/NaN|Infinity/.test(h)};
 });
 p(gr.svg===1,"Grundriss aus generateEbkGrundriss()",gr.svg);
 p(gr.nummern===2,"eine Nummer je Stück",gr.nummern);
 p(gr.pfeilWeg,"der Blickrichtungspfeil am Rand ist entfernt");
 p(!gr.nan,"kein NaN im Grundriss");
 // Synchron mit der Stückaufteilung
 const grSync=await page.evaluate(()=>{
  aufnahme.stuecke.push({laenge:900,stossStoss:900,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:160,massRechts:170});
  zeichne();
  return ($("p-grundriss").innerHTML.match(/<circle/g)||[]).length;
 });
 await page.waitForTimeout(150);
 p(grSync===3,"und wächst mit der Stückliste mit",grSync);
 await page.evaluate(()=>{aufnahme.stuecke.pop();zeichne()});

 console.log("\n11 · Ausmass");
 await reg(page,5);
 const am=await page.evaluate(()=>({zeilen:ausmassZeilen(aufnahme),text:$("p-inhalt").innerText,
   mat:materialUebersicht(aufnahme)}));
 const holen=b=>am.zeilen.find(z=>new RegExp(b,"i").test(z.bezeichnung));
 p(am.zeilen.length>=4,"Ausmass hat Positionen",am.zeilen.length);
 p(!!holen("Einlaufblech konisch"),"Laufmeter konisches Einlaufblech");
 p(!!holen("Blechfl"),"Blechfläche in m²");
 p(!!holen("Gehrungen"),"Gehrungen aus der Stückliste");
 p(am.mat.length===1&&/Titanzink/.test(am.mat[0].material),"Material aus der Aufnahme",am.mat);
 // Mit Wortgrenzen: ohne sie trifft /CHF/i mitten in "Blechflaeche".
 p(!/\bCHF\b|\bFr\.|\bArtikel-?Nr/i.test(am.text),"keine Preise, keine Artikelnummern",
   (am.text.match(/\bCHF\b|\bFr\.|\bArtikel-?Nr/i)||[])[0]);
 // Ausmass folgt einer Änderung automatisch
 const amNach=await page.evaluate(()=>{
  aufnahme.stuecke[0].laenge=3000; setzeSchritt(5);
  const z=ausmassZeilen(aufnahme);
  return z.find(x=>/Einlaufblech konisch/.test(x.bezeichnung)).menge;
 });
 await page.waitForTimeout(150);
 p(amNach==="4,45","das Ausmass folgt einer Änderung sofort",amNach);
 await page.evaluate(()=>{aufnahme.stuecke[0].laenge=2070;zeichne()});

 console.log("\n12 · Zuschnitt");
 await reg(page,6);
 const zu=await page.evaluate(()=>{
  const plan=rollenPlan(aufnahme);
  return {tafel:plan.tafelLaenge,breiten:aktiveRollenbreiten(),
   bestes:plan.bestes,moeglich:plan.moeglich.length,
   streifen:(plan.verteilung.streifen||[]).length,
   flaeche:flaecheM2(aufnahme),text:$("p-inhalt").innerText};
 });
 p(zu.breiten.join()==="1000,670","Standardrollen 1000 und 670 mm aktiv",zu.breiten);
 p(zu.tafel===2070,"Tafellänge = längstes Stück",zu.tafel);
 p(zu.streifen===2,"zwei Streifen nötig (2070 + 1450 > 2070)",zu.streifen);
 p(zu.bestes&&zu.bestes.jeTafel===Math.floor(zu.bestes.breite/330),
   "Streifen je Tafel = Rollenbreite ÷ Abwicklung",zu.bestes);
 p(zu.bestes&&zu.bestes.tafeln===Math.ceil(zu.streifen/zu.bestes.jeTafel),
   "Tafeln aufgerundet",zu.bestes);
 p(Math.abs(zu.flaeche-(2070+1450)*330/1e6)<1e-9,"Blechfläche = Länge × Abwicklung",zu.flaeche);
 p(/Stück 1/.test(zu.text)&&/Stück 2/.test(zu.text),"jedes Blech mit seiner Nummer im Streifen");
 p(/Verschnitt/i.test(zu.text)&&/Tafel/i.test(zu.text),"Tafeln, Tafellänge und Verschnitt stehen da");

 console.log("\n13 · Speichern und Laden");
 await page.evaluate(()=>{aufnahme.bezeichnung="Traufe Nordseite";zeichne()});
 const sp=await klick(page,"#p-speichern");
 p(sp==="ok","Speichern ist bedienbar",sp);
 const gespeichert=await page.evaluate(()=>{
  const l=alleAufnahmen();
  return {anzahl:l.length,id:l[0].id,stuecke:l[0].stuecke.length,
          ml:l[0].stuecke[0].massLinks,dach:l[0].dachneigung,abw:l[0].abwicklung,
          mat:l[0].material,mon:l[0].montage};
 });
 p(gespeichert.anzahl===1,"eine Aufnahme abgelegt",gespeichert);
 p(gespeichert.stuecke===2&&gespeichert.ml===120,"mit allen Stücken und Massen",gespeichert);
 p(gespeichert.dach===40&&gespeichert.abw===330&&gespeichert.mat==="2"&&gespeichert.mon==="rechts",
   "und allen Grunddaten",gespeichert);
 const geladen=await page.evaluate(id=>{
  aufnahme=leereAufnahme(); zeichne();
  const ok=oeffnen(id);
  return {ok,bez:aufnahme.bezeichnung,stuecke:aufnahme.stuecke.length,
          ml:aufnahme.stuecke[0].massLinks,dach:aufnahme.dachneigung,schritt};
 },gespeichert.id);
 p(geladen.ok&&geladen.bez==="Traufe Nordseite"&&geladen.stuecke===2&&geladen.ml===120&&geladen.dach===40,
   "wieder geöffnet stimmt alles",geladen);
 p(geladen.schritt===1,"und beginnt auf Register 1",geladen.schritt);

 console.log("\n14 · Kopieren erzeugt einen unabhängigen Datensatz");
 const kop=await page.evaluate(id=>{
  const neueId=kopieren(id);
  aufnahme.stuecke[0].massLinks=999;
  aufnahme.bezeichnung="Kopie geändert";
  speichern();
  const liste=alleAufnahmen();
  const orig=liste.find(x=>x.id===id), k=liste.find(x=>x.id===neueId);
  return {neueId,gleich:neueId===id,getrennt:!!orig&&!!k,anzahl:liste.length,
          origMl:orig?orig.stuecke[0].massLinks:null,
          kopieMl:k?k.stuecke[0].massLinks:null,
          bez:k?k.bezeichnung:""};
 },gespeichert.id);
 await page.waitForTimeout(200);
 p(kop.anzahl===2,"zwei Aufnahmen liegen vor",kop);
 p(!kop.gleich,"die Kopie hat eine eigene Kennung",kop);
 p(kop.getrennt&&kop.origMl===120,"das Original bleibt unverändert",kop);
 p(kop.getrennt&&kop.kopieMl===999,"die Änderung wirkt nur in der Kopie",kop);
 p(/Kopie/.test(kop.bez),"und sie ist als Kopie erkennbar",kop.bez);

 console.log("\n15 · Foto und Skizze");
 await reg(page,7);
 const fs=await page.evaluate(()=>({
  fotoFeld:!!document.getElementById("p-fotoInput"),
  skizzeKnopf:!!document.getElementById("p-skizzeOeffnen"),
  bemerkung:!!document.getElementById("p-bemerkung"),
  speichern:!!document.getElementById("p-speichern2")
 }));
 p(fs.fotoFeld&&fs.skizzeKnopf,"Foto-Feld und Skizzen-Knopf im letzten Register",fs);
 p(fs.bemerkung&&fs.speichern,"Bemerkung und Speichern ebenfalls",fs);
 const skizze=await klick(page,"#p-skizzeOeffnen");
 p(skizze==="ok","Skizze öffnen ist bedienbar",skizze);
 const gemalt=await page.evaluate(()=>{
  const c=document.getElementById("p-skizzeCanvas");
  if(!c||c.hidden)return {da:false};
  // Zwei Striche zeichnen und uebernehmen
  const r=c.getBoundingClientRect();
  const ev=(typ,x,y)=>c.dispatchEvent(new MouseEvent(typ,{clientX:r.left+x,clientY:r.top+y,bubbles:true}));
  ev("mousedown",20,20); ev("mousemove",120,90); ev("mouseup",120,90);
  document.getElementById("p-skizzeSpeichern").click();
  return {da:true,skizze:typeof aufnahme.skizze,laenge:(aufnahme.skizze||"").length};
 });
 await page.waitForTimeout(250);
 p(gemalt.da&&gemalt.skizze==="string"&&gemalt.laenge>500,"eine gezeichnete Skizze wird übernommen",gemalt);
 const skizzeGespeichert=await page.evaluate(()=>{
  speichern();
  const l=alleAufnahmen().find(x=>x.id===aufnahme.id);
  return {da:!!(l&&l.skizze),laenge:(l&&l.skizze||"").length};
 });
 p(skizzeGespeichert.da&&skizzeGespeichert.laenge>500,"und mit der Massaufnahme gespeichert",skizzeGespeichert);
 const fotoWeg=await page.evaluate(()=>{
  aufnahme.fotos=["data:image/png;base64,AAA"]; zeichne();
  const vor=aufnahme.fotos.length;
  const knopf=document.querySelector("[data-foto-weg]");
  if(knopf)knopf.click();
  return {vor,nach:aufnahme.fotos.length,knopf:!!knopf};
 });
 await page.waitForTimeout(180);
 p(fotoWeg.knopf&&fotoWeg.nach===0,"ein Foto lässt sich wieder entfernen",fotoWeg);

 console.log("\n16 · Kontrolle meldet, was nicht stimmt");
 const kon=await page.evaluate(()=>{
  aufnahme.stuecke[0].massLinks=0;
  const ohneMass=pruefungen(aufnahme).filter(x=>x.art==="fehler").length;
  aufnahme.stuecke[0].massLinks=400;   // 400+12+12 > 330 -> Restbreite negativ
  const negativ=pruefungen(aufnahme).some(x=>/Restbreite/.test(x.text)&&x.art==="fehler");
  aufnahme.stuecke[0].massLinks=120;
  aufnahme.stuecke[0].massRechts=150; aufnahme.stuecke[1].massLinks=999;
  const widerspruch=pruefungen(aufnahme).some(x=>/verschieden/.test(x.text));
  aufnahme.stuecke[1].massLinks=150;
  aufnahme.dachneigung=200;
  const winkel=pruefungen(aufnahme).some(x=>/lässt sich nicht zeichnen/.test(x.text));
  aufnahme.dachneigung=25;
  setzeSchritt(4);
  return {ohneMass,negativ,widerspruch,winkel,
          punkt:!!document.querySelector(".p-punkt"),
          text:$("p-inhalt").innerText};
 });
 await page.waitForTimeout(200);
 p(kon.ohneMass>0,"fehlendes Mass wird gemeldet",kon.ohneMass);
 p(kon.negativ,"negative Restbreite wird gemeldet");
 p(kon.widerspruch,"widersprüchliche Masse an einer Stossstelle werden gemeldet");
 p(kon.winkel,"ein unmöglicher Winkel wird gemeldet");
 const sauber=await page.evaluate(()=>{
  aufnahme.bezeichnung="Traufe Nordseite";
  aufnahme.material="2";
  return pruefungen(aufnahme).filter(x=>x.art==="fehler").length;
 });
 p(sauber===0,"eine vollständige Aufnahme hat keinen Fehler",sauber);

 console.log("\n17 · Tablet-Breiten: nichts läuft seitlich hinaus");
 for(const w of [600,768,800,1024,1280]){
  await page.setViewportSize({width:w,height:1300});
  let schlimm=0; const wo=[];
  for(let n=1;n<=7;n++){
   await reg(page,n);
   const m=await page.evaluate(()=>{
    const br=document.documentElement.clientWidth, raus=[];
    document.querySelectorAll("#p-app *").forEach(el=>{
     const r=el.getBoundingClientRect();
     if(r.width>0&&r.right>br+1){
      let par=el.parentElement,scroll=false;
      while(par){const o=getComputedStyle(par).overflowX;
       if(o==="auto"||o==="scroll"){scroll=true;break}par=par.parentElement}
      if(!scroll)raus.push((el.id||el.className||el.tagName)+" right="+Math.round(r.right));}
    });
    return {raus:raus.slice(0,3),scrollt:document.documentElement.scrollWidth>br+1};
   });
   if(m.raus.length||m.scrollt){schlimm++;wo.push("R"+n+": "+(m.raus.join(" | ")||"scrollWidth"))}
  }
  p(schlimm===0,"Breite "+w+" px: alle sieben Register passen",wo.slice(0,4));
 }
 await page.setViewportSize({width:800,height:1300});

 console.log("\n18 · Keine JS-Fehler");
 p(fehler.length===0,"keine Seitenfehler",fehler.slice(0,3));

 await b.close();
 console.log("\npruefstand-einlaufblech-konisch: "+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN":"  - alle bestanden"));
 process.exit(fail?1:0);
})();
