// Prueft v3.193: Die Schablone waehlt ihr Papierformat selbst vor - und das
// Blatt passt wieder auf das Papier.
//
// GEMELDET
// "Ergebnisse laufen aus dem bild. Kann die app automatisch das passende
//  papierformat vorauswählen?"
//
// ZWEI SACHEN STECKTEN DAHINTER
// 1. A4 war fest verdrahtet. Das Hablett (350 x 543 mm) brauchte sechs
//    Blatt, und beim Rohr trug die dritte Spalte 1,4 mm Zeichnung.
// 2. Das Blatt hatte KEINE Reserve. Gemessen 280,9 mm auf 281,0 mm
//    Druckflaeche - 0,1 mm. Der @page-Rand stand auf 8 mm, gerechnet wurde
//    mit 10, und fuer Kopf- und Fusszeile waren 12 mm angesetzt, wo 13,4
//    gebraucht werden. Sobald der Drucker auf Standardrand stand, rutschte
//    der untere Teil auf eine zusaetzliche, halbleere Seite.
//
// Abschnitt C misst deshalb nach, statt die Formel nachzurechnen: eine
// Formel, die man aus dem Code abschreibt, prueft nichts.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-abwicklung-papier-v3-193.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 // Breites Fenster: die Fusszeile soll ihre ECHTE Druckbreite bekommen,
 // sonst bricht sie kuenstlich um und die Messung luegt.
 const page=await b.newPage({viewport:{width:1200,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  if(typeof a2Setzen==="function")a2Setzen(false);
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  meineRechte={admin:true}; allProjects=[];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  if(typeof showStart==="function")showStart();
  sb.from=()=>({select:()=>({eq:()=>({order:()=>({limit:async()=>({data:[],error:null})})}),
    order:()=>({limit:async()=>({data:[],error:null})})}),
   insert:()=>({select:async()=>({data:[{id:1}],error:null})}),
   delete:()=>({eq:()=>({select:async()=>({data:[],error:null})})})});
 });
 await page.evaluate(async()=>{ await abwOeffnen() });

 // ---- A  Welche Formate es gibt -------------------------------------------
 console.log("\nA · Die Formate");
 const A=await page.evaluate(()=>({
  liste:abwPapierListe().map(f=>f.id+" "+f.breite+"x"+f.hoehe),
  namen:abwPapierListe().map(f=>f.name)
 }));
 p(A.liste.length===8,"vier Formate in je zwei Lagen",A.liste);
 p(A.liste.indexOf("a4-hoch 210x297")>=0&&A.liste.indexOf("a4-quer 297x210")>=0,
   "A4 hoch und quer mit den richtigen Massen",A.liste);
 p(A.liste.indexOf("a1-hoch 594x841")>=0,"A1 ebenso",A.liste);
 // Der Betrieb druckt bis A1. Ein Format, das niemand drucken kann, waere
 // ein Vorschlag, der in die Irre fuehrt.
 p(!A.namen.some(n=>n.indexOf("A0")>=0),"A0 wird NICHT angeboten",A.namen);

 // ---- B  Die Blattzahl, von Hand nachgerechnet ----------------------------
 console.log("\nB · Wie viele Blätter welches Format braucht");
 // A4 hoch: nutzbar 210-20-10 = 180 breit, 297-20-10-24 = 243 hoch.
 // Hablett 350 x 543  ->  ceil(350/180)=2 Spalten, ceil(543/243)=3 Zeilen = 6
 // A3 quer: 390 x 243 ->  1 Spalte,  3 Zeilen = 3
 // A2 hoch: 390 x 540 ->  1 Spalte,  2 Zeilen = 2   (543 passt um 3 mm nicht)
 // A1 hoch: 564 x 787 ->  1 Spalte,  1 Zeile  = 1
 const B=await page.evaluate(()=>{
  $("abw_bauteil").value="hablett";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  const r=abwLetztes;
  const n=id=>{
   const f=abwPapierListe().find(x=>x.id===id);
   const bd=abwPapierBedarf(r,f);
   return {seiten:bd.seiten,spalten:bd.spalten,zeilen:bd.zeilen,
           nutzB:bd.nutzB,nutzH:bd.nutzH};
  };
  return {breite:r.breite, hoehe:r.laenge,
          a4h:n("a4-hoch"), a3q:n("a3-quer"), a2h:n("a2-hoch"), a1h:n("a1-hoch")};
 });
 p(B.breite===350&&B.hoehe===543,"gerechnet wird mit dem Hablett 350 x 543 mm",B);
 p(B.a4h.nutzB===180&&B.a4h.nutzH===243,
   "A4 hoch laesst 180 x 243 mm Zeichnung je Blatt",B.a4h);
 p(B.a4h.spalten===2&&B.a4h.zeilen===3&&B.a4h.seiten===6,"A4 hoch: 2 x 3 = 6 Blatt",B.a4h);
 p(B.a3q.spalten===1&&B.a3q.zeilen===3&&B.a3q.seiten===3,"A3 quer: 1 x 3 = 3 Blatt",B.a3q);
 p(B.a2h.seiten===2,"A2 hoch: 2 Blatt - 543 passt um 3 mm nicht auf 540",B.a2h);
 p(B.a1h.seiten===1,"A1 hoch: ein einziges Blatt",B.a1h);

 // ---- C  Der Vorschlag ----------------------------------------------------
 console.log("\nC · Was die App vorschlägt");
 const C=await page.evaluate(()=>{
  const hab=abwPapierVorschlag(abwLetztes);
  $("abw_bauteil").value="rohr";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  const rohr=abwPapierVorschlag(abwLetztes);
  // Ein winziges Blech passt auf JEDES Format auf ein Blatt. Dann darf der
  // Vorschlag nicht das groesste Papier sein.
  const klein=abwPapierVorschlag(abwHablett({D:40,alpha:20,a:60,b:60,c:20,
    umschlag:10,massSeitlich:20,lochZugabe:1}));
  return {hab:{name:hab.name,seiten:hab.seiten},
          rohr:{name:rohr.name,seiten:rohr.seiten},
          klein:{name:klein.name,seiten:klein.seiten}};
 });
 p(C.hab.name==="A1 hoch"&&C.hab.seiten===1,"fürs Hablett A1 hoch, ein Blatt",C.hab);
 p(C.rohr.name==="A2 hoch"&&C.rohr.seiten===1,"fürs Rohr A2 hoch, ein Blatt",C.rohr);
 // DIE GEGENPROBE: "am wenigsten Blaetter" allein reicht nicht als Regel -
 // A1 braucht fuer alles ein Blatt. Bei gleich vielen Blaettern muss das
 // KLEINERE Papier gewinnen, sonst schickt die App jeden Zuschnitt zum
 // Plotter.
 p(C.klein.name==="A4 hoch"&&C.klein.seiten===1,
   "ein kleines Blech kommt auf A4 - bei gleicher Blattzahl gewinnt das kleinere Papier",C.klein);

 // ---- D  Das Blatt passt aufs Papier --------------------------------------
 console.log("\nD · Das Blatt passt wieder aufs Papier");
 // GEMESSEN, nicht nachgerechnet. Das Blatt bekommt dafuer die echte
 // Druckbreite des jeweiligen Formats.
 const D=await page.evaluate(()=>{
  const d=document.createElement("div"); d.style.width="100mm";
  d.style.position="absolute"; document.body.appendChild(d);
  const mm=100/d.getBoundingClientRect().width; d.remove();
  const box=$("abwDruck");
  const messe=(id)=>{
   $("abw_papier").value=id;
   const r=abwLetztes, f=abwPapierGewaehlt(r);
   box.innerHTML=abwDruckHtml(r); box.hidden=false; box.style.display="block";
   const bl=box.querySelector(".abw-blatt");
   bl.style.width=(f.breite-2*10)+"mm";
   const g=bl.getBoundingClientRect().height*mm;
   const kopf=bl.querySelector(".abw-blatt-kopf").getBoundingClientRect().height*mm;
   const fuss=bl.querySelector(".abw-blatt-fuss").getBoundingClientRect().height*mm;
   box.hidden=true; box.style.display=""; box.innerHTML="";
   const flaeche=f.hoehe-2*10;
   return {name:f.name, blatt:Math.round(g*10)/10, flaeche,
           reserve:Math.round((flaeche-g)*10)/10,
           kopf:Math.round(kopf*10)/10, fuss:Math.round(fuss*10)/10};
  };
  return ["a4-hoch","a4-quer","a3-hoch","a3-quer","a2-hoch","a1-hoch"].map(messe);
 });
 D.forEach(x=>{
  p(x.blatt<=x.flaeche,x.name+": das Blatt bleibt in der Druckfläche ("
    +x.blatt+" von "+x.flaeche+" mm)",x);
 });
 // Und nicht nur knapp. 0,1 mm war der Fehler.
 p(D.every(x=>x.reserve>=8),"und zwar mit mindestens 8 mm Reserve auf jedem Format",
   D.map(x=>x.name+" "+x.reserve));
 // Kopf und Fuss bleiben einzeilig. Der alte Fuss brach auf drei Zeilen um.
 p(D.every(x=>x.kopf<=5&&x.fuss<=5),"Kopf- und Fusszeile bleiben einzeilig",
   D.map(x=>x.name+" "+x.kopf+"/"+x.fuss));

 // ---- E  Der Drucker erfährt das Format -----------------------------------
 console.log("\nE · Die @page-Regel folgt der Wahl");
 const E=await page.evaluate(()=>{
  const regel=id=>{
   $("abw_papier").value=id;
   const t=abwDruckHtml(abwLetztes);
   return (t.match(/@page\{[^}]*\}/)||[""])[0];
  };
  return {auto:regel("auto"), a3q:regel("a3-quer"), a4h:regel("a4-hoch"),
          kopf:(()=>{ $("abw_papier").value="a3-quer";
                      const t=abwDruckHtml(abwLetztes);
                      return t.indexOf("A3 quer")>=0 })()};
 });
 p(E.auto==="@page{size:420mm 594mm;margin:10mm}",
   "automatisch: der Drucker bekommt A2 gesagt",E.auto);
 p(E.a3q==="@page{size:420mm 297mm;margin:10mm}",
   "A3 quer: 420 x 297, nicht 297 x 420 - die Lage steht wirklich drin",E.a3q);
 p(E.a4h==="@page{size:210mm 297mm;margin:10mm}","A4 hoch: 210 x 297",E.a4h);
 // GEGENPROBE: ohne diese Regel bliebe die alte A4-Vorgabe aus
 // css/03-druck.css stehen und wuerde eine A2-Schablone abschneiden.
 p(lies("css/03-druck.css").indexOf("size:A4 portrait")>=0,
   "die allgemeine Druckvorgabe bleibt unveraendert A4 - fuer Rapporte und Listen");
 p(E.kopf===true,"das gewaehlte Format steht auch lesbar im Blattkopf");

 // ---- F  Die Auswahl in der Oberfläche ------------------------------------
 console.log("\nF · Die Auswahl");
 const F=await page.evaluate(async()=>{
  $("abw_bauteil").value="hablett";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(x=>setTimeout(x,60));
  const html=$("abw_papier").innerHTML;
  const hinweisAuto=(()=>{ $("abw_papier").value="auto";
    abwPapierWahlZeichnen(abwLetztes); return $("abwPapierHinweis").textContent })();
  // Die Wahl des Anwenders muss eine Feldaenderung ueberleben.
  $("abw_papier").value="a3-quer";
  abwPapierWahlZeichnen(abwLetztes);
  const hinweisA3=$("abwPapierHinweis").textContent;
  $("abw_h_a").value="251";
  $("abw_h_a").dispatchEvent(new Event("input",{bubbles:true}));
  await new Promise(x=>setTimeout(x,60));
  return {html, nachTippen:$("abw_papier").value, hinweisAuto, hinweisA3,
          seitenNachTippen:abwSeiten(abwLetztes).length};
 });
 p(F.html.indexOf("A4 hoch · 6 Blatt")>=0&&F.html.indexOf("A3 quer · 3 Blatt")>=0,
   "bei jedem Format steht, wie viele Blätter es wären",F.html);
 p(F.html.indexOf("automatisch – A1 hoch · 1 Blatt")>=0,
   "und ganz oben der Vorschlag mit Namen",F.html);
 // Das war der naheliegende Fehler: die Liste wird bei jedem Tastendruck neu
 // aufgebaut, und die Wahl faellt dabei auf "automatisch" zurueck.
 p(F.nachTippen==="a3-quer",
   "die eigene Wahl überlebt eine Massänderung",F.nachTippen);
 p(F.seitenNachTippen===3,"und gilt auch fuer die Schablone",F.seitenNachTippen);
 p(F.hinweisAuto.indexOf("A1")>=0&&F.hinweisAuto.indexOf("statt")>=0
   &&F.hinweisAuto.indexOf("A4")>=0,
   "der Hinweis nennt die Ersparnis gegenüber A4",F.hinweisAuto);
 p(F.hinweisA3.indexOf("A3 quer")>=0&&F.hinweisA3.indexOf("3 Blatt")>=0,
   "und bei eigener Wahl das gewählte Format",F.hinweisA3);

 // Ein Bauteilwechsel rechnet die Blattzahlen neu.
 const F2=await page.evaluate(async()=>{
  $("abw_papier").value="auto";
  $("abw_bauteil").value="rohr";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(x=>setTimeout(x,60));
  return $("abw_papier").innerHTML;
 });
 p(F2.indexOf("automatisch – A2 hoch")>=0,
   "beim Wechsel aufs Rohr wird neu gerechnet - A2 statt A1",F2.slice(0,120));

 // ---- G  Verdrahtung und Sauberkeit ---------------------------------------
 console.log("\nG · Verdrahtung");
 const q78=lies("js/78-abwicklung-ui.js");
 p(lies("index.html").indexOf('id="abw_papier"')>=0,"die Auswahl steht im HTML");
 p(lies("index.html").indexOf('id="abwPapierHinweis"')>=0,"der Hinweis auch");
 // Gegenprobe gegen den alten Stand: A4 darf nicht mehr fest verdrahtet sein.
 p(q78.indexOf("ABW_A4")<0,"A4 ist nicht mehr fest verdrahtet",
   (q78.match(/ABW_A4/g)||[]).length);
 p(/kopfFuss:\s*24/.test(q78),
   "fuer Kopf und Fuss sind 24 mm reserviert, nicht mehr 12");
 p(lies("js/41-hilfe.js").indexOf("Papierformat")>=0,"die Hilfe erklaert es");
 p(lies("js/67-was-ist-neu.js").indexOf('"3.193"')>=0,'"Was ist neu" nennt v3.193');
 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler);

 await b.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();
