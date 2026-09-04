"use strict";
// ===========================================================================
// Prüfstand · Prototyp Freies Profil
// Läuft in echtem Chromium gegen die eigenständige Testapp – also gegen genau
// die Datei, die auf dem Tablet geöffnet wird.
//
// Aufruf:  SP=<Ordner mit node_modules> node prototyp-freies-profil/pruefstand.js
// ===========================================================================
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"prototyp-freies-profil","freies-profil-testapp.html");
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
const reg=async(page,n)=>{await page.evaluate(k=>setzeSchritt(k),n);await page.waitForTimeout(150)};
const text=page=>page.evaluate(()=>document.getElementById("p-inhalt").innerText);
// Antwort der Erkennung stellen, ohne das Netz zu brauchen.
const antwortStellen=(page,antwort,status)=>page.evaluate(([a,s])=>{
 window.fetch=()=>Promise.resolve({ok:s===undefined?true:s<400,status:s||200,
   text:()=>Promise.resolve(typeof a==="string"?a:JSON.stringify(a))});
},[antwort,status]);
const profilSetzen=(page,schenkel)=>page.evaluate(s=>{aufnahme.schenkel=s;zeichne()},schenkel);

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
  zeichnung:typeof generateProfilDiagramSvg,
  pfad:typeof abgerundeterPfad,
  pfeil:typeof ansichtsPfeilSvg,
  pruefung:typeof fpPruefeErkannteSchenkel,
  max:typeof FP_MAX_SCHENKEL==="number"?FP_MAX_SCHENKEL:null,
  zeit:typeof FP_ERKENNUNG_ZEITGRENZE_MS==="number"?FP_ERKENNUNG_ZEITGRENZE_MS:null,
  feld:!!document.getElementById("fp_ansicht")
 }));
 p(fn.zeichnung==="function","übernommen: generateProfilDiagramSvg",fn.zeichnung);
 p(fn.pfad==="function","übernommen: abgerundeterPfad",fn.pfad);
 p(fn.pfeil==="function","übernommen: ansichtsPfeilSvg",fn.pfeil);
 p(fn.pruefung==="function","übernommen: fpPruefeErkannteSchenkel",fn.pruefung);
 p(fn.max===24,"FP_MAX_SCHENKEL = 24 wie in der App",fn.max);
 p(fn.zeit===30000,"Zeitgrenze der Erkennung wie in der App",fn.zeit);
 p(fn.feld,"Aufhänger #fp_ansicht für die Zeichnung der App vorhanden");
 // Zwei Rechenproben direkt gegen die uebernommene Pruefung
 const pr=await page.evaluate(()=>({
  gut:fpPruefeErkannteSchenkel([{laenge:30,winkel:0},{laenge:80,winkel:90}]),
  einer:fpPruefeErkannteSchenkel([{laenge:30,winkel:0}]),
  viele:fpPruefeErkannteSchenkel(Array.from({length:40},(_,i)=>({laenge:10+i,winkel:i?45:0}))).length,
  muell:fpPruefeErkannteSchenkel([{laenge:0,winkel:0},{laenge:-5,winkel:10},{laenge:"x",winkel:1}])
 }));
 p(pr.gut.length===2&&pr.gut[0].winkel===0,"gültige Schenkel kommen durch (erster Winkel 0)",pr.gut);
 p(pr.einer.length===0,"ein einzelner Schenkel ist kein Profil",pr.einer);
 p(pr.viele===24,"mehr als 24 werden auf 24 gekürzt",pr.viele);
 p(pr.muell.length===0,"Länge 0, negativ und Text werden verworfen",pr.muell);

 console.log("\n1 · Leeres Profil");
 const leer=await page.evaluate(()=>({
  register:document.querySelectorAll("#p-register .p-register-knopf").length,
  aktiv:document.querySelectorAll("#p-register .p-register-knopf.aktiv").length,
  schenkel:aufnahme.schenkel.length,
  segmente:aufnahme.segmente.length,
  ausmass:ausmassZeilen().length,
  fehler:pruefungen().filter(x=>x.art==="fehler").length,
  svg:profilSvg([])
 }));
 p(leer.register===7,"sieben Register",leer.register);
 p(leer.aktiv===1,"genau eines ist aktiv",leer.aktiv);
 p(leer.schenkel===0&&leer.segmente===0,"noch kein Schenkel, kein Segment",leer);
 p(leer.ausmass===0,"ohne Schenkel wird nichts gemessen",leer.ausmass);
 p(leer.fehler>0,"die Kontrolle sagt, was fehlt",leer.fehler);
 p(!/NaN|Infinity/.test(leer.svg),"die Zeichnung kommt ohne NaN aus",leer.svg.slice(0,60));
 await reg(page,5);
 p(/Noch nichts zu messen/i.test(await text(page)),"und das steht auch so da");

 console.log("\n2 · Zwei Schenkel");
 await reg(page,1);
 await tippe(page,"#p-bezeichnung","Attika Nord");
 await waehle(page,"#p-material","2");
 await reg(page,2);
 const plus1=await klick(page,"#p-schenkelPlus");
 await klick(page,"#p-schenkelPlus");
 p(plus1==="ok","Schenkel hinzufügen ist bedienbar",plus1);
 const zwei=await page.evaluate(()=>({
  anzahl:aufnahme.schenkel.length,
  felder:document.querySelectorAll("[data-schenkel-laenge]").length,
  svg:($("p-profilBild").innerHTML.match(/<svg/g)||[]).length
 }));
 p(zwei.anzahl===2&&zwei.felder===2,"zwei Schenkel in der Liste",zwei);
 await tippe(page,'[data-schenkel-laenge="0"]',"120");
 const nach=await page.evaluate(()=>({
  wert:aufnahme.schenkel[0].laenge,
  fokus:document.activeElement&&document.activeElement.dataset.schenkelLaenge==="0",
  svg:$("p-profilBild").innerHTML
 }));
 p(nach.wert===120,"Länge vollständig getippt",nach.wert);
 p(nach.fokus,"das Feld behält den Fokus",nach);
 p(/<svg/.test(nach.svg),"und die Zeichnung ist da");
 // Gemessen, nicht angenommen: auf dem Handy steht die Zeichnung beim Tippen
 // sonst weit unterhalb der Schenkel-Karten und ist nie zu sehen.
 const klebt=await page.evaluate(async()=>{
  const k=$("p-profil");
  const pos=getComputedStyle(k).position;
  document.querySelectorAll("[data-schenkel-laenge]").length;
  window.scrollTo(0,document.body.scrollHeight);
  await new Promise(r=>setTimeout(r,80));
  const r=k.getBoundingClientRect();
  return {pos,oben:Math.round(r.top),hoehe:Math.round(r.height),fenster:innerHeight};
 });
 p(klebt.pos==="sticky","die Zeichnung klebt oben am Bildschirmrand",klebt);
 p(klebt.oben>=-1&&klebt.oben<klebt.fenster-40,
   "und bleibt beim Scrollen im Bild",klebt);
 await page.evaluate(()=>window.scrollTo(0,0));
 await tippe(page,'[data-schenkel-laenge="1"]',"80");
 await tippe(page,'[data-schenkel-winkel="1"]',"90");
 const g2=await page.evaluate(()=>({
  s:aufnahme.schenkel.map(x=>x.laenge+"/"+x.winkel).join(),
  fehler:pruefungen().filter(x=>x.art==="fehler").length
 }));
 p(g2.s==="120/0,80/90","zwei Schenkel mit Länge und Winkel",g2.s);
 p(g2.fehler===0,"ein gültiges Profil hat keinen Fehler",g2.fehler);

 console.log("\n3 · Drei und mehr Schenkel, mehrere Winkel");
 await profilSetzen(page,[{laenge:20,winkel:0},{laenge:150,winkel:90},
                          {laenge:40,winkel:-90},{laenge:25,winkel:45}]);
 const g4=await page.evaluate(()=>{
  const svg=$("p-profilBild").innerHTML;
  return {anzahl:aufnahme.schenkel.length,
   pfade:(svg.match(/<path /g)||[]).length,
   nummern:(svg.match(/<circle /g)||[]).length,
   biegungen:anzahlBiegungen(), nan:/NaN|Infinity/.test(svg)};
 });
 p(g4.anzahl===4,"vier Schenkel",g4.anzahl);
 p(g4.nummern===4,"jede Schenkelnummer ist gezeichnet",g4.nummern);
 p(g4.biegungen===3,"drei Biegungen (Winkel ≠ 0 ab Schenkel 2)",g4.biegungen);
 p(!g4.nan,"kein NaN in der Zeichnung");

 console.log("\n4 · Winkel ändern und umkehren");
 await reg(page,2);
 const svgVor=await page.evaluate(()=>$("p-profilBild").innerHTML);
 await tippe(page,'[data-schenkel-winkel="1"]',"60");
 const w1=await page.evaluate(()=>({
  wert:aufnahme.schenkel[1].winkel,
  fokus:document.activeElement&&document.activeElement.dataset.schenkelWinkel==="1",
  svg:$("p-profilBild").innerHTML
 }));
 p(w1.wert===60,"Winkel vollständig getippt",w1.wert);
 p(w1.fokus,"das Feld behält den Fokus");
 p(w1.svg!==svgVor,"die Zeichnung folgt sofort",w1.svg.length);
 const flip=await klick(page,'[data-schenkel-flip="1"]');
 const w2=await page.evaluate(()=>({wert:aufnahme.schenkel[1].winkel,svg:$("p-profilBild").innerHTML}));
 p(flip==="ok"&&w2.wert===-60,"Richtung umkehren dreht das Vorzeichen",w2.wert);
 p(w2.svg!==w1.svg,"und die Zeichnung ändert sich sichtbar");
 await klick(page,'[data-schenkel-flip="1"]');
 const w3=await page.evaluate(()=>aufnahme.schenkel[1].winkel);
 p(w3===60,"nochmal umkehren führt zurück",w3);

 console.log("\n5 · 180°-Umschlag");
 const um=await klick(page,'[data-schenkel-umschlag="1"]');
 const u1=await page.evaluate(()=>{
  const svg=$("p-profilBild").innerHTML;
  return {wert:aufnahme.schenkel[1].winkel,
   umschlag:istUmschlagSchenkel(aufnahme.schenkel[1]),
   anzahl:anzahlUmschlaege(),
   // Ein Umschlag wird als eigene, versetzte Linie mit einer Kehre gezeichnet.
   bogen:(svg.match(/ A /g)||[]).length,
   pfade:(svg.match(/<path /g)||[]).length};
 });
 p(um==="ok"&&u1.wert===180,"180° setzt den Umschlag",u1.wert);
 p(u1.umschlag&&u1.anzahl===1,"er wird als Umschlag erkannt und gezählt",u1);
 p(u1.pfade>=2,"und als eigene Linie gezeichnet",u1);
 p(u1.bogen>0,"mit einer Kehre (Bogen im Pfad)",u1.bogen);
 // Zurueck auf einen normalen Winkel fuer die weiteren Abschnitte
 await page.evaluate(()=>{aufnahme.schenkel[1].winkel=90;zeichne()});

 console.log("\n6 · Hinzufügen, löschen, verschieben");
 await reg(page,2);
 const vorher=await page.evaluate(()=>aufnahme.schenkel.length);
 await klick(page,"#p-schenkelPlus");
 const dazu=await page.evaluate(()=>({n:aufnahme.schenkel.length,letzter:aufnahme.schenkel[aufnahme.schenkel.length-1]}));
 p(dazu.n===vorher+1,"hinzufügen",dazu.n);
 p(dazu.letzter.laenge===0&&dazu.letzter.winkel===0,"ein neuer Schenkel startet bei 0/0",dazu.letzter);
 const weg=await klick(page,'[data-schenkel-weg="'+vorher+'"]');
 const nachWeg=await page.evaluate(()=>aufnahme.schenkel.length);
 p(weg==="ok"&&nachWeg===vorher,"löschen",nachWeg);
 const vorTausch=await page.evaluate(()=>aufnahme.schenkel.map(x=>x.laenge).join());
 await klick(page,'[data-schenkel-runter="0"]');
 const nachTausch=await page.evaluate(()=>aufnahme.schenkel.map(x=>x.laenge).join());
 p(nachTausch!==vorTausch,"verschieben ordnet die Schenkel um",{vorTausch,nachTausch});
 await klick(page,'[data-schenkel-hoch="1"]');
 const zurueck=await page.evaluate(()=>aufnahme.schenkel.map(x=>x.laenge).join());
 p(zurueck===vorTausch,"und zurück ergibt wieder dieselbe Reihenfolge",zurueck);
 // Obergrenze: mehr als 24 laesst die App nicht zu
 const grenze=await page.evaluate(()=>{
  aufnahme.schenkel=Array.from({length:FP_MAX_SCHENKEL},(_,i)=>({laenge:10+i,winkel:i?45:0}));
  zeichne();
  document.getElementById("p-schenkelPlus").click();
  return aufnahme.schenkel.length;
 });
 p(grenze===24,"bei 24 Schenkeln kommt keiner mehr dazu",grenze);
 await profilSetzen(page,[{laenge:20,winkel:0},{laenge:150,winkel:90},
                          {laenge:40,winkel:-90},{laenge:25,winkel:45}]);

 console.log("\n7 · Profilzeichnung und Ansichtsrichtung");
 await reg(page,3);
 const z1=await page.evaluate(()=>({
  svg:$("p-profilGross").innerHTML,
  feld:!!document.getElementById("p-ansicht")
 }));
 p(z1.feld,"die Ansichtsrichtung lässt sich wählen");
 p(!/<polygon/.test(z1.svg),"ohne Ansicht kein Pfeil");
 await waehle(page,"#p-ansicht","links");
 const z2=await page.evaluate(()=>({
  wert:aufnahme.ansicht,
  brueckenfeld:document.getElementById("fp_ansicht").value,
  svg:$("p-profilGross").innerHTML
 }));
 p(z2.wert==="links"&&z2.brueckenfeld==="links","die Richtung erreicht die Zeichnung der App",z2.wert);
 p(/<polygon/.test(z2.svg)&&/b42318/.test(z2.svg),"der rote Ansichtspfeil ist gezeichnet");
 await waehle(page,"#p-ansicht","rechts");
 const z3=await page.evaluate(()=>$("p-profilGross").innerHTML);
 p(z3!==z2.svg,"eine andere Richtung zeichnet den Pfeil anders");
 const masse=await page.evaluate(()=>{
  const svg=$("p-profilGross").innerHTML;
  return aufnahme.schenkel.every(s=>svg.indexOf(">"+s.laenge+"<")>=0);
 });
 p(masse,"jedes Mass steht an seinem Schenkel");
 await waehle(page,"#p-ansicht","keiner");

 console.log("\n8 · Skizze → Profil: erfolgreiche Erkennung");
 await reg(page,7);
 // Eine Skizze anlegen, ohne zu malen: der Prototyp braucht ein Bild als Vorlage.
 await page.evaluate(()=>{
  const c=document.createElement("canvas"); c.width=40; c.height=30;
  const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,40,30);
  aufnahme.skizze=c.toDataURL("image/png"); zeichne();
 });
 await reg(page,4);
 await antwortStellen(page,{ok:true,schenkel:[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:35,winkel:-90}],verworfen:1});
 const start=await klick(page,"#p-erkennen");
 await page.waitForTimeout(400);
 const e1=await page.evaluate(()=>({
  vorschau:erkanntesProfil?erkanntesProfil.length:0,
  verworfen:erkanntVerworfen,
  imProfil:aufnahme.schenkel.length,
  knopf:!!document.getElementById("p-erkanntUebernehmen"),
  txt:$("p-inhalt").innerText
 }));
 p(start==="ok","erkennen ist bedienbar",start);
 p(e1.vorschau===3,"drei Schenkel erkannt",e1.vorschau);
 p(e1.imProfil===4,"das Profil ist noch UNVERÄNDERT – nur Vorschau",e1.imProfil);
 p(e1.knopf,"Übernehmen und Verwerfen stehen bereit");
 p(/Sch(ä|ae)tzwerte/i.test(e1.txt),"der Hinweis auf Schätzwerte steht da");
 p(/1 unklare Angabe/i.test(e1.txt),"verworfene Angaben werden genannt");
 const ueb=await klick(page,"#p-erkanntUebernehmen");
 const e2=await page.evaluate(()=>({
  imProfil:aufnahme.schenkel.map(x=>x.laenge+"/"+x.winkel).join(),
  vorschau:erkanntesProfil,
  txt:$("p-inhalt").innerText
 }));
 p(ueb==="ok"&&e2.imProfil==="20/0,150/90,35/-90","erst nach Bestätigung übernommen",e2.imProfil);
 p(e2.vorschau===null,"die Vorschau ist danach zu");
 p(/übernommen/i.test(e2.txt),"und es steht da, dass übernommen wurde");

 console.log("\n9 · Skizze → Profil: verwerfen und ungültige Antworten");
 await antwortStellen(page,{ok:true,schenkel:[{laenge:11,winkel:0},{laenge:22,winkel:30}],verworfen:0});
 await klick(page,"#p-erkennen"); await page.waitForTimeout(300);
 const v1=await klick(page,"#p-erkanntVerwerfen");
 const v2=await page.evaluate(()=>({
  imProfil:aufnahme.schenkel.map(x=>x.laenge).join(),
  vorschau:erkanntesProfil, txt:$("p-inhalt").innerText
 }));
 p(v1==="ok"&&v2.imProfil==="20,150,35","Verwerfen lässt das Profil unverändert",v2.imProfil);
 p(v2.vorschau===null&&/verworfen/i.test(v2.txt),"und sagt das auch");
 // Neun schlechte Antworten - keine darf etwas uebernehmen
 const schlecht=[
  {name:"leere Liste",       antwort:{ok:true,schenkel:[]}},
  {name:"nur ein Schenkel",  antwort:{ok:true,schenkel:[{laenge:50,winkel:0}]}},
  {name:"Länge 0",           antwort:{ok:true,schenkel:[{laenge:0,winkel:0},{laenge:0,winkel:90}]}},
  {name:"negative Länge",    antwort:{ok:true,schenkel:[{laenge:-30,winkel:0},{laenge:-40,winkel:90}]}},
  {name:"Text statt Zahl",   antwort:{ok:true,schenkel:[{laenge:"viel",winkel:"quer"}]}},
  {name:"null",              antwort:{ok:true,schenkel:null}},
  {name:"kein Array",        antwort:{ok:true,schenkel:{laenge:30}}},
  {name:"Serverfehler",      antwort:{ok:false,error:"Keine eindeutige Form erkannt – bitte manuell erfassen."}},
  {name:"unlesbare Antwort", antwort:"<html>kaputt"}
 ];
 for(const s of schlecht){
  await antwortStellen(page,s.antwort,s.name==="Serverfehler"?500:200);
  await klick(page,"#p-erkennen"); await page.waitForTimeout(300);
  const r=await page.evaluate(()=>({
   imProfil:aufnahme.schenkel.map(x=>x.laenge).join(),
   vorschau:erkanntesProfil?erkanntesProfil.length:0,
   status:erkennungStatus}));
  p(r.imProfil==="20,150,35"&&r.vorschau===0,
    s.name+": nichts übernommen, Profil unverändert",r);
  p(/⚠️|nicht|fehlgeschlagen|erkannt/i.test(r.status),s.name+": und eine verständliche Meldung",r.status);
 }
 // Mehr als 24 erkannte Schenkel werden von der App-Pruefung gekuerzt
 await antwortStellen(page,{ok:true,schenkel:Array.from({length:40},(_,i)=>({laenge:10+i,winkel:i?30:0}))});
 await klick(page,"#p-erkennen"); await page.waitForTimeout(300);
 const viele=await page.evaluate(()=>erkanntesProfil?erkanntesProfil.length:0);
 p(viele===24,"40 erkannte Schenkel werden auf 24 gekürzt",viele);
 await klick(page,"#p-erkanntVerwerfen");
 // Netzwerkfehler
 await page.evaluate(()=>{window.fetch=()=>Promise.reject(new Error("offline"))});
 await klick(page,"#p-erkennen"); await page.waitForTimeout(300);
 const netz=await page.evaluate(()=>({status:erkennungStatus,imProfil:aufnahme.schenkel.length}));
 p(/Verbindung/i.test(netz.status)&&netz.imProfil===3,"ohne Verbindung: klare Meldung, nichts übernommen",netz);

 console.log("\n10 · Segmente und Ausmass");
 await profilSetzen(page,[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}]);
 await reg(page,5);
 const seg0=await klick(page,"#p-segmentPlus");
 const s1=await page.evaluate(()=>({
  anzahl:aufnahme.segmente.length,
  massen:segmentMassen(aufnahme.segmente[0]).map(m=>m.mass).join(),
  felder:document.querySelectorAll("[data-seg-mass]").length
 }));
 p(seg0==="ok"&&s1.anzahl===1,"Segment hinzufügen",s1.anzahl);
 p(s1.massen==="20,150,40","die Masse sind mit den Profillängen vorbelegt",s1.massen);
 p(s1.felder===3,"je Schenkel ein Feld",s1.felder);
 await tippe(page,'[data-seg-laenge="0"]',"3000");
 const s2=await page.evaluate(()=>({
  laenge:aufnahme.segmente[0].laenge,
  fokus:document.activeElement&&document.activeElement.dataset.segLaenge==="0",
  ab:abwicklungSegment(aufnahme.segmente[0]),
  flaeche:flaecheSegmentM2(aufnahme.segmente[0])
 }));
 p(s2.laenge===3000&&s2.fokus,"Segmentlänge getippt, Fokus bleibt",s2);
 p(s2.ab.links===210,"Abwicklung = Summe der Masse (20+150+40)",s2.ab);
 p(Math.abs(s2.flaeche-3000*210/1e6)<1e-9,"Fläche = Länge × Abwicklung",s2.flaeche);
 const am=await page.evaluate(()=>({z:ausmassZeilen(),txt:$("p-inhalt").innerText}));
 const holen=b=>am.z.find(x=>new RegExp(b,"i").test(x.bezeichnung));
 p(am.z.length>=4,"das Ausmass hat Positionen",am.z.length);
 p(!!holen("Freies Profil"),"Laufmeter freies Profil");
 p(!!holen("Abwicklung Segment 1"),"Abwicklung je Segment");
 p(!!holen("Biegungen"),"Biegungen gezählt");
 p(!!holen("Blechfl"),"Blechfläche in m²");
 p(!/\bCHF\b|\bFr\.|\bArtikel-?Nr/i.test(am.txt),"keine Preise, keine Artikelnummern",
   (am.txt.match(/\bCHF\b|\bFr\.|\bArtikel-?Nr/i)||[])[0]);
 const folgt=await page.evaluate(()=>{
  const vor=(ausmassZeilen().find(z=>/Blechfl/i.test(z.bezeichnung))||{}).menge;
  aufnahme.segmente[0].laenge=6000; zeichne();
  const nach=(ausmassZeilen().find(z=>/Blechfl/i.test(z.bezeichnung))||{}).menge;
  aufnahme.segmente[0].laenge=3000; zeichne();
  return {vor,nach};
 });
 p(folgt.vor!==folgt.nach,"das Ausmass folgt einer Änderung sofort",folgt);
 // Masse aus dem Profil erneut uebernehmen
 await page.evaluate(()=>{aufnahme.segmente[0].massen[0].mass=999;zeichne()});
 await klick(page,'[data-seg-uebernehmen="0"]');
 const uebn=await page.evaluate(()=>segmentMassen(aufnahme.segmente[0]).map(m=>m.mass).join());
 p(uebn==="20,150,40","„Masse aus Profil übernehmen“ stellt sie wieder her",uebn);
 // Werden Schenkel weniger, duerfen keine Masse zu Schenkeln stehen bleiben,
 // die es nicht mehr gibt - sie waeren unsichtbar, wuerden aber in die
 // Abwicklung mitgezaehlt.
 const verwaist=await page.evaluate(()=>{
  aufnahme.schenkel=[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90},
                     {laenge:60,winkel:90},{laenge:30,winkel:90}];
  aufnahme.segmente=[{laenge:3000,massen:[]}];
  zeichne();
  const vor=abwicklungSegment(aufnahme.segmente[0]).links;
  // wie eine erkannte Skizze: das ganze Profil wird ersetzt
  erkanntesProfil=[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}];
  erkanntesUebernehmen(); zeichne();
  return {vor,nach:abwicklungSegment(aufnahme.segmente[0]).links,
          masse:aufnahme.segmente[0].massen.length,
          schenkel:aufnahme.schenkel.length};
 });
 p(verwaist.vor===300,"fünf Schenkel ergeben 300 mm Abwicklung",verwaist.vor);
 p(verwaist.masse===3&&verwaist.nach===210,
   "nach dem Ersetzen durch drei Schenkel zählt kein verwaistes Mass mehr mit",verwaist);
 // Fuer die folgenden Abschnitte wieder der Drei-Schenkel-Stand mit Segment
 await page.evaluate(()=>{
  aufnahme.segmente=[{laenge:3000,massen:[]}]; segmentMassen(aufnahme.segmente[0]); zeichne();
 });

 console.log("\n11 · Konisches Profil");
 await reg(page,1);
 await waehle(page,"#p-konisch","ja");
 await reg(page,5);
 const k1=await page.evaluate(()=>({
  linksFelder:document.querySelectorAll("[data-seg-links]").length,
  rechtsFelder:document.querySelectorAll("[data-seg-rechts]").length,
  ab:abwicklungSegment(aufnahme.segmente[0])
 }));
 p(k1.linksFelder===3&&k1.rechtsFelder===3,"links und rechts getrennt erfassbar",k1);
 p(k1.ab.links===210&&k1.ab.rechts===0,"links vorbelegt, rechts noch leer",k1.ab);
 await klick(page,'[data-seg-alle-rechts="0"]');
 const k2=await page.evaluate(()=>({
  ab:abwicklungSegment(aufnahme.segmente[0]),
  flaeche:flaecheSegmentM2(aufnahme.segmente[0])
 }));
 p(k2.ab.rechts===210,"„Alle nach rechts“ übernimmt die Masse",k2.ab);
 await tippe(page,'[data-seg-rechts="0_1"]',"100");
 const k3=await page.evaluate(()=>({
  ab:abwicklungSegment(aufnahme.segmente[0]),
  flaeche:flaecheSegmentM2(aufnahme.segmente[0]),
  z:ausmassZeilen().find(x=>/Abwicklung Segment 1/.test(x.bezeichnung))
 }));
 p(k3.ab.rechts===160,"ein einzelnes Mass rechts ändert die Abwicklung",k3.ab);
 // Trapez: Laenge x (links+rechts)/2
 p(Math.abs(k3.flaeche-3000*(210+160)/2/1e6)<1e-9,"Fläche als Trapez gerechnet",k3.flaeche);
 p(/210/.test(k3.z.menge)&&/160/.test(k3.z.menge),"das Ausmass nennt beide Abwicklungen",k3.z);
 await reg(page,1); await waehle(page,"#p-konisch","nein");

 console.log("\n12 · Kontrolle");
 await reg(page,6);
 const c0=await page.evaluate(()=>pruefungen().filter(x=>x.art==="fehler").length);
 p(c0===0,"vollständige Aufnahme: kein Fehler",c0);
 const faelle=[
  ["negative Länge",   ()=>{aufnahme.schenkel[0].laenge=-5},/negative L(ä|ae)nge/i],
  ["Länge 0",          ()=>{aufnahme.schenkel[0].laenge=0},/L(ä|ae)nge 0/i],
  ["Länge keine Zahl", ()=>{aufnahme.schenkel[0].laenge="abc"},/keine g(ü|ue)ltige Zahl/i],
  ["Winkel zu gross",  ()=>{aufnahme.schenkel[1].winkel=200},/ausserhalb/i],
  ["nur ein Schenkel", ()=>{aufnahme.schenkel=[{laenge:50,winkel:0}]},/mindestens zwei|noch kein Profil/i],
  ["zu viele Schenkel",()=>{aufnahme.schenkel=Array.from({length:26},(_,i)=>({laenge:10,winkel:i?30:0}))},/h(ö|oe)chstens 24/i]
 ];
 for(const [name,setzen,muster] of faelle){
  const r=await page.evaluate(fn=>{
   const sicher=JSON.parse(JSON.stringify(aufnahme.schenkel));
   eval("("+fn+")()");
   zeichne();
   const f=pruefungen().filter(x=>x.art==="fehler");
   const punkt=!!document.querySelector("#p-register .p-register-punkt.fehler");
   const nan=/NaN|Infinity/.test($("p-inhalt").innerHTML);
   aufnahme.schenkel=sicher; zeichne();
   return {texte:f.map(x=>x.text).join(" | "),anzahl:f.length,punkt,nan};
  },setzen.toString());
  p(r.anzahl>0&&muster.test(r.texte),name+" wird gemeldet",r.texte.slice(0,90));
  p(r.punkt,name+": das Register Kontrolle bekommt einen roten Punkt");
  p(!r.nan,name+": kein NaN in der Anzeige");
 }

 console.log("\n13 · Fotos, Skizze, Notiz");
 await reg(page,7);
 const f1=await page.evaluate(()=>({
  fotoFeld:!!document.getElementById("p-fotoInput"),
  skizzeKnopf:!!document.getElementById("p-skizzeOeffnen"),
  notiz:!!document.getElementById("p-bemerkung"),
  speichern:!!document.getElementById("p-speichern2")
 }));
 p(f1.fotoFeld&&f1.skizzeKnopf,"Foto-Feld und Skizzen-Knopf im letzten Register",f1);
 p(f1.notiz&&f1.speichern,"Bemerkung und Speichern ebenfalls",f1);
 await tippe(page,"#p-bemerkung","Vor Ort geprüft, Mass 150 nachgemessen.");
 const notiz=await page.evaluate(()=>aufnahme.bemerkung);
 p(/nachgemessen/.test(notiz),"die Notiz kommt vollständig an",notiz);
 const sk=await klick(page,"#p-skizzeOeffnen");
 const skOffen=await page.evaluate(()=>{const b=$("p-skizzeBox");return b?!b.hidden:false});
 p(sk==="ok"&&skOffen,"Skizze öffnen ist bedienbar",skOffen);
 const skGesetzt=await page.evaluate(()=>{
  const c=$("p-skizzeCanvas"), g=c.getContext("2d");
  g.beginPath(); g.moveTo(10,10); g.lineTo(120,80); g.stroke();
  document.getElementById("p-skizzeSpeichern").click();
  return {laenge:(aufnahme.skizze||"").length,zu:$("p-skizzeBox").hidden};
 });
 await page.waitForTimeout(150);
 p(skGesetzt.laenge>100&&skGesetzt.zu,"eine gezeichnete Skizze wird übernommen",skGesetzt.laenge);
 const fotoWeg=await page.evaluate(()=>{
  aufnahme.fotos=["data:image/png;base64,iVBORw0KGgo="]; zeichne();
  const vor=aufnahme.fotos.length;
  document.querySelector('[data-foto-weg="0"]').click();
  return {vor,nach:aufnahme.fotos.length};
 });
 p(fotoWeg.vor===1&&fotoWeg.nach===0,"ein Foto lässt sich wieder entfernen",fotoWeg);

 console.log("\n14 · Speichern und Laden");
 await page.evaluate(()=>{aufnahme.fotos=["data:image/png;base64,iVBORw0KGgo="];zeichne()});
 const sp=await klick(page,"#p-speichern");
 const gesp=await page.evaluate(()=>{
  const l=JSON.parse(localStorage.getItem("pfp_aufnahmen")||"[]");
  return {anzahl:l.length,a:l[0]};
 });
 p(sp==="ok"&&gesp.anzahl===1,"Speichern legt eine Aufnahme ab",gesp.anzahl);
 p((gesp.a.schenkel||[]).length===3,"mit allen Schenkeln",gesp.a.schenkel&&gesp.a.schenkel.length);
 p((gesp.a.segmente||[]).length===1,"und den Segmenten",gesp.a.segmente&&gesp.a.segmente.length);
 p(gesp.a.bezeichnung==="Attika Nord"&&gesp.a.material==="2","Bezeichnung und Material",gesp.a);
 p(!!gesp.a.skizze&&(gesp.a.fotos||[]).length===1,"Skizze und Foto",{skizze:!!gesp.a.skizze,fotos:(gesp.a.fotos||[]).length});
 p(/nachgemessen/.test(gesp.a.bemerkung||""),"und die Notiz",gesp.a.bemerkung);
 const wieder=await page.evaluate(id=>{
  setzeSchritt(5);
  aufnahme=leereAufnahme(); zeichne();
  oeffnen(id);
  return {schenkel:aufnahme.schenkel.map(x=>x.laenge+"/"+x.winkel).join(),
          segmente:aufnahme.segmente.length,
          massen:segmentMassen(aufnahme.segmente[0]).map(m=>m.mass).join(),
          bez:aufnahme.bezeichnung, mat:aufnahme.material,
          fotos:(aufnahme.fotos||[]).length, skizze:!!aufnahme.skizze,
          notiz:aufnahme.bemerkung, schritt:schritt};
 },gesp.a.id);
 p(wieder.schenkel==="20/0,150/90,40/-90","wieder geöffnet stimmen die Schenkel",wieder.schenkel);
 p(wieder.segmente===1&&wieder.massen==="20,150,40","und die Segmente mit ihren Massen",wieder);
 p(wieder.bez==="Attika Nord"&&wieder.mat==="2","Bezeichnung und Material",wieder);
 p(wieder.fotos===1&&wieder.skizze,"Fotos und Skizze bleiben erhalten",wieder);
 p(/nachgemessen/.test(wieder.notiz),"die Notiz ebenfalls",wieder.notiz);
 p(wieder.schritt===1,"und es beginnt auf Register 1",wieder.schritt);

 console.log("\n15 · Kopieren erzeugt einen unabhängigen Datensatz");
 const kop=await page.evaluate(()=>{
  const vorId=aufnahme.id;
  const neu=kopieren(vorId);
  const liste=JSON.parse(localStorage.getItem("pfp_aufnahmen")||"[]");
  return {vorId,neu,anzahl:liste.length,offen:aufnahme.id,bez:aufnahme.bezeichnung};
 });
 p(kop.anzahl===2,"zwei Aufnahmen liegen vor",kop.anzahl);
 p(kop.neu&&kop.neu!==kop.vorId,"die Kopie hat eine eigene Kennung",kop);
 p(/\(Kopie\)$/.test(kop.bez),"und ist als Kopie erkennbar",kop.bez);
 const unab=await page.evaluate(([alt])=>{
  aufnahme.schenkel[0].laenge=777;
  speichern();
  const liste=JSON.parse(localStorage.getItem("pfp_aufnahmen")||"[]");
  const original=liste.find(x=>x.id===alt);
  const kopie=liste.find(x=>x.id===aufnahme.id);
  return {original:original.schenkel[0].laenge,kopie:kopie.schenkel[0].laenge};
 },[kop.vorId]);
 p(unab.original===20,"das Original bleibt unverändert",unab.original);
 p(unab.kopie===777,"die Änderung wirkt nur in der Kopie",unab.kopie);

 console.log("\n16 · Register: durchblättern verliert nichts");
 const blaettern=await page.evaluate(()=>{
  const vor=JSON.stringify({s:aufnahme.schenkel,g:aufnahme.segmente,b:aufnahme.bezeichnung});
  for(let n=1;n<=7;n++)setzeSchritt(n);
  const nach=JSON.stringify({s:aufnahme.schenkel,g:aufnahme.segmente,b:aufnahme.bezeichnung});
  const sichtbar=document.querySelectorAll("#p-inhalt .p-karte h2").length;
  return {gleich:vor===nach,schritt,sichtbar};
 });
 p(blaettern.gleich,"durch alle sieben Register blättern ändert nichts am Modell");
 p(blaettern.schritt===7,"und endet auf Register 7",blaettern.schritt);
 const nurEins=await page.evaluate(()=>{
  let fremd=0, eigen=0;
  for(let n=1;n<=7;n++){
   setzeSchritt(n);
   const h=Array.from(document.querySelectorAll("#p-inhalt h2")).map(x=>x.textContent.trim());
   if((h[0]||"").indexOf(n+" ·")===0)eigen++;
   fremd+=h.filter(t=>/^[1-7] ·/.test(t)&&t.indexOf(n+" ·")!==0).length;
  }
  return {eigen,fremd};
 });
 p(nurEins.eigen===7,"jedes Register zeigt seine eigene Überschrift",nurEins.eigen);
 p(nurEins.fremd===0,"und keine fremde Registernummer",nurEins.fremd);

 console.log("\n17 · Tablet-Breiten: nichts läuft seitlich hinaus");
 await page.evaluate(()=>{
  aufnahme.schenkel=[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90},
                     {laenge:15,winkel:180},{laenge:25,winkel:45}];
  aufnahme.konisch="ja";
  aufnahme.segmente=[{laenge:3000,massen:[]},{laenge:1500,massen:[]}];
  zeichne();
 });
 for(const w of [360,412,600,768,1024,1280]){
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
 console.log("\npruefstand-freies-profil: "+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN":"  - alle bestanden"));
 process.exit(fail?1:0);
})();
