// Prueft den Einbau der Freies-Profil-Aufnahme in die laufende App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht), die Kataloge werden mit den
// echten Werten der Produktivdatenbank gestellt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-freies-profil-app-v2-77.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};
// Ueber evaluate mit Pruefung statt page.click: ein fehlendes oder gesperrtes
// Element soll einen sauberen Fehlschlag geben, nicht den Pruefstand in einen
// Timeout laufen lassen - ein abgebrochener Lauf sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{
  const e=document.querySelector(s);
  if(!e)return "fehlt";
  if(e.disabled)return "gesperrt";
  e.click(); return "ok";
 },sel);
 await page.waitForTimeout(150);
 return r;
}
async function tippe(page,sel,text){
 const da=await page.evaluate(s=>{const f=document.querySelector(s);
  if(!f)return false; f.focus(); f.value=""; return true;},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(80);
 return true;
}
const reg=async(page,n)=>{await page.evaluate(k=>fpaSetzeSchritt(k),n);await page.waitForTimeout(150)};
async function waehle(page,sel,wert){
 const r=await page.evaluate(([s,w])=>{
  const e=document.querySelector(s); if(!e)return "fehlt";
  e.value=w; e.dispatchEvent(new Event("change",{bubbles:true})); return "ok";
 },[sel,wert]);
 await page.waitForTimeout(150);
 return r;
}
const profil=async(page,liste)=>{
 await page.evaluate(l=>{fpA.schenkel=l.map(x=>({...x}));fpSchenkel=fpA.schenkel;renderFreiesProfilAufnahme()},liste);
 await page.waitForTimeout(120);
};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},from:()=>{const q={};['select','eq','order','limit'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;}})};"}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[];
  measurementMaterials=[{id:3,name:"Kupfer"},{id:2,name:"Titanzink"},{id:6,name:"Stahl, verzinkt"}];
  blechRollenbreiten=[];          // -> Standard 1000 / 670
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  $("measurementEditModal").hidden=false;
  $("measType").value="freies_profil"; showMeasTypeSection("freies_profil");
 });

 console.log("\nA · Modul geladen, Fachdatei unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderFreiesProfilAufnahme==="function",
  zurueck:typeof fpaZuruecksetzen==="function",
  fuellen:typeof fpaFuellen==="function",
  zusatz:typeof fpaZusatzDaten==="function",
  // Fachlogik aus js/14 - unveraendert die Quelle
  zeichnung:typeof generateProfilDiagramSvg==="function",
  rund:typeof abgerundeterPfad==="function",
  pfeil:typeof ansichtsPfeilSvg==="function",
  pruefung:typeof fpPruefeErkannteSchenkel==="function",
  segRender:typeof renderFpSegmenteList==="function",
  grenze:typeof FP_MAX_SCHENKEL==="number"?FP_MAX_SCHENKEL:null,
  // Packrechnung aus js/29 - es gibt nur eine
  packen:typeof ebaPackeInStreifen==="function",
  breiten:typeof ebaRollenbreiten==="function",
  stummel:!!document.getElementById("fp_schenkelBody"),
  skizzeBox:!!document.getElementById("fp_sketchUebernehmen"),
  ziel:!!document.getElementById("freiesProfilAufnahme")
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.zusatz,"js/31 geladen",da);
 p(da.zeichnung&&da.rund&&da.pfeil&&da.pruefung&&da.segRender,"js/14 unveraendert geladen",da);
 p(da.grenze===24,"FP_MAX_SCHENKEL aus js/14",da.grenze);
 p(da.packen&&da.breiten,"Packrechnung aus js/29 vorhanden",da);
 p(da.stummel&&da.skizzeBox&&da.ziel,"Stummel, Erkennungs-Block und Ziel im HTML",da);
 const bruecke=await page.evaluate(()=>{
  fpA.material="2"; fpA.konisch="ja"; fpA.ansicht="oben";
  fpaBruecke();
  return {schenkelGleich:fpSchenkel===fpA.schenkel,segmenteGleich:fpSegmente===fpA.segmente,
   konisch:$("fp_konisch").value,ansicht:$("fp_ansicht").value,material:$("fp_material").value};
 });
 p(bruecke.schenkelGleich&&bruecke.segmenteGleich,"fpSchenkel/fpSegmente SIND die Listen des Modells",bruecke);
 p(bruecke.konisch==="ja"&&bruecke.ansicht==="oben"&&bruecke.material==="2",
   "die Bruecke setzt die alten Felder",bruecke);
 await page.evaluate(()=>{fpaZuruecksetzen()});

 console.log("\nB · Sieben Register, nur eines sichtbar");
 const b1=await page.evaluate(()=>({
  anzahl:document.querySelectorAll("#fpa_register .ra-register-knopf").length,
  aktiv:document.querySelectorAll("#fpa_register .ra-register-knopf.aktiv").length,
  schritt:fpaSchritt
 }));
 p(b1.anzahl===7&&b1.aktiv===1&&b1.schritt===1,"sieben Register, eines aktiv",b1);
 const eigen=await page.evaluate(()=>{
  let eigenN=0,fremd=0;
  for(let n=1;n<=7;n++){
   fpaSetzeSchritt(n);
   const h=[...document.querySelectorAll("#fpa_kopf h2")].map(x=>x.textContent.trim());
   if((h[0]||"").indexOf(n+" ·")===0)eigenN++;
   fremd+=h.filter(t=>/^[1-7] ·/.test(t)&&t.indexOf(n+" ·")!==0).length;
  }
  fpaSetzeSchritt(1);
  return {eigenN,fremd};
 });
 p(eigen.eigenN===7&&eigen.fremd===0,"jedes Register zeigt nur seinen eigenen Inhalt",eigen);

 console.log("\nC · Grunddaten");
 await reg(page,1);
 await waehle(page,"#fpa_material","3");
 await waehle(page,"#fpa_konisch","nein");
 await waehle(page,"#fpa_ansicht","links");
 const c1=await page.evaluate(()=>({m:fpA.material,k:fpA.konisch,a:fpA.ansicht,
  feldM:$("fp_material").value,feldK:$("fp_konisch").value,feldA:$("fp_ansicht").value}));
 p(c1.m==="3"&&c1.k==="nein"&&c1.a==="links","Grunddaten im Modell",c1);
 p(c1.feldM==="3"&&c1.feldK==="nein"&&c1.feldA==="links","und in den alten Feldern",c1);

 console.log("\nD · Profil aufnehmen");
 await reg(page,2);
 const plus=await klick(page,"#fpa_plus");
 await klick(page,"#fpa_plus");
 p(plus==="ok","Schenkel hinzufuegen ist bedienbar",plus);
 const lage=await page.evaluate(()=>{
  const k=$("fpa_plus").getBoundingClientRect();
  const karten=[...document.querySelectorAll("[data-fpa-zeile]")].map(x=>x.getBoundingClientRect());
  return {knopf:Math.round(k.top),letzte:karten.length?Math.round(karten[karten.length-1].bottom):null};
 });
 p(lage.letzte!==null&&lage.knopf>=lage.letzte-1,
   "der Knopf steht UNTER der letzten Schenkel-Karte",lage);
 await tippe(page,'[data-fpa-laenge="0"]',"120");
 const t1=await page.evaluate(()=>({wert:fpA.schenkel[0].laenge,
  fokus:document.activeElement&&document.activeElement.dataset.fpaLaenge==="0",
  svg:/<svg/.test($("fpa_profilBild").innerHTML)}));
 p(t1.wert===120,"Laenge vollstaendig getippt",t1.wert);
 p(t1.fokus,"das Feld behaelt den Fokus",t1);
 p(t1.svg,"und die Zeichnung folgt");
 const klebt=await page.evaluate(async()=>{
  const k=$("fpa_profil"), pos=getComputedStyle(k).position;
  window.scrollTo(0,document.body.scrollHeight);
  await new Promise(r=>setTimeout(r,80));
  const r=k.getBoundingClientRect();
  window.scrollTo(0,0);
  return {pos,oben:Math.round(r.top),fenster:innerHeight};
 });
 p(klebt.pos==="sticky","die Zeichnung klebt oben am Bildschirmrand",klebt);
 p(klebt.oben>=-1&&klebt.oben<klebt.fenster-40,"und bleibt beim Scrollen im Bild",klebt);
 await tippe(page,'[data-fpa-winkel="1"]',"90");
 await klick(page,'[data-fpa-flip="1"]');
 const flip=await page.evaluate(()=>fpA.schenkel[1].winkel);
 p(flip===-90,"Richtung umkehren dreht das Vorzeichen",flip);
 await klick(page,'[data-fpa-umschlag="1"]');
 const um=await page.evaluate(()=>({w:fpA.schenkel[1].winkel,anzahl:fpaUmschlaege(),
  aktiv:!!document.querySelector('[data-fpa-umschlag="1"].ra-aktiv')}));
 p(um.w===180&&um.anzahl===1,"180 Grad setzt den Umschlag",um);
 p(um.aktiv,"der Knopf zeigt sich als gedrueckt",um);
 await klick(page,'[data-fpa-umschlag="1"]');
 p(await page.evaluate(()=>fpA.schenkel[1].winkel)===0,"nochmal druecken nimmt ihn zurueck");
 await profil(page,[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}]);
 await klick(page,'[data-fpa-hoch="1"]');
 p(await page.evaluate(()=>fpA.schenkel.map(s=>s.laenge).join())==="150,20,40","hoch verschiebt",1);
 await klick(page,'[data-fpa-runter="0"]');
 p(await page.evaluate(()=>fpA.schenkel.map(s=>s.laenge).join())==="20,150,40","runter verschiebt",1);
 await klick(page,'[data-fpa-weg="2"]');
 p(await page.evaluate(()=>fpA.schenkel.length)===2,"loeschen entfernt einen Schenkel");
 const grenze=await page.evaluate(()=>{
  fpA.schenkel=Array.from({length:24},(_,i)=>({laenge:10,winkel:i?30:0}));
  renderFreiesProfilAufnahme();
  fpaNeuerSchenkel();
  return fpA.schenkel.length;
 });
 p(grenze===24,"bei 24 Schenkeln kommt keiner mehr dazu",grenze);

 console.log("\nE · Zeichnung: der gemeldete Umschlag-Fehler ist behoben");
 // Von Hand gerechnet: Massstab 4, Rand 30. Rohpunkte (182,30) (230,30)
 // (30,30) (30,270); der Umschlag versetzt um GAP=9 nach oben, und dieser
 // Versatz gilt ab da fuer den Rest -> Endpunkt (30,261), nicht (30,270).
 const luecke=await page.evaluate(()=>{
  const svg=generateProfilDiagramSvg([{laenge:12,winkel:0},{laenge:50,winkel:180},{laenge:60,winkel:-90}]);
  const pfade=[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]);
  const punkte=d=>[...d.matchAll(/(-?\d+\.\d)\s(-?\d+\.\d)/g)].map(m=>[+m[1],+m[2]]);
  const enden=pfade.map(d=>{const q=punkte(d);return {start:q[0],ende:q[q.length-1]}});
  let groesster=0;
  for(let i=1;i<enden.length;i++){
   const a=enden[i-1].ende,c=enden[i].start;
   groesster=Math.max(groesster,Math.hypot(a[0]-c[0],a[1]-c[1]));
  }
  return {pfade:enden.length,groesster:Math.round(groesster*10)/10,
          letzt:enden[enden.length-1].ende};
 });
 p(luecke.pfade===3,"das gemeldete Profil ergibt drei Teilpfade",luecke.pfade);
 p(luecke.groesster<0.15,"kein Sprung zwischen Umschlag und Folgeschenkel",luecke);
 p(luecke.letzt&&luecke.letzt[0]===30&&Math.abs(luecke.letzt[1]-261)<0.15,
   "der letzte Schenkel endet auf der versetzten Linie (30/261)",luecke.letzt);
 // Am 04.09.2026 gemeldet: "Richtung umkehren" tat am Umschlag nichts.
 // +180 und -180 zeigen geometrisch in dieselbe Richtung - die Seite, auf die
 // der Umschlag klappt, muss deshalb aus dem VORZEICHEN kommen. Gemessen wird
 // an den gezeichneten Pfaden, nicht am Augenschein.
 const kehrt=await page.evaluate(()=>{
  const pfade=svg=>[...svg.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1]).join("|");
  const plus=generateProfilDiagramSvg([{laenge:12,winkel:0},{laenge:50,winkel:180},{laenge:60,winkel:-90}]);
  const minus=generateProfilDiagramSvg([{laenge:12,winkel:0},{laenge:50,winkel:-180},{laenge:60,winkel:-90}]);
  const letzt=d=>{const q=[...d.matchAll(/(-?\d+\.\d)\s(-?\d+\.\d)/g)].map(m=>[+m[1],+m[2]]);return q[q.length-1]};
  const pp=pfade(plus).split("|"), pm=pfade(minus).split("|");
  return {gleich:pfade(plus)===pfade(minus),
   endePlus:letzt(pp[pp.length-1]), endeMinus:letzt(pm[pm.length-1]),
   umschlagPlus:fpaIstUmschlag({winkel:180}), umschlagMinus:fpaIstUmschlag({winkel:-180})};
 });
 p(!kehrt.gleich,"Richtung umkehren aendert die Zeichnung des Umschlags sichtbar",kehrt);
 p(kehrt.endeMinus&&Math.abs(kehrt.endeMinus[1]-279)<0.15,
   "der Umschlag klappt auf die andere Seite (Ende 30/279 statt 30/261)",kehrt);
 p(kehrt.umschlagPlus&&kehrt.umschlagMinus,"und bleibt in beiden Faellen ein Umschlag",kehrt);
 const masseGleich=await page.evaluate(()=>{
  fpA.konisch="nein";
  fpA.schenkel=[{laenge:12,winkel:0},{laenge:50,winkel:180},{laenge:60,winkel:-90}];
  fpSchenkel=fpA.schenkel;
  fpA.segmente=[{laenge:1000,massen:null}]; fpSegmente=fpA.segmente;
  renderFreiesProfilAufnahme();
  const vor={abw:fpaAbwicklungSegment(fpA.segmente[0]).links,
             flaeche:Math.round(fpaFlaecheM2()*1e6)/1e6,
             umschlaege:fpaUmschlaege(),biegungen:fpaBiegungen()};
  fpA.schenkel[1].winkel=-180; renderFreiesProfilAufnahme();
  const nach={abw:fpaAbwicklungSegment(fpA.segmente[0]).links,
              flaeche:Math.round(fpaFlaecheM2()*1e6)/1e6,
              umschlaege:fpaUmschlaege(),biegungen:fpaBiegungen()};
  return {vor,nach};
 });
 p(JSON.stringify(masseGleich.vor)===JSON.stringify(masseGleich.nach),
   "die Masse und die Zaehlung aendern sich dabei NICHT",masseGleich);
 // Aufraeumen: die folgenden Abschnitte erwarten einen leeren Segmentstand.
 await page.evaluate(()=>{fpA.segmente=[];fpSegmente=fpA.segmente;renderFreiesProfilAufnahme()});
 await profil(page,[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}]);
 await reg(page,3);
 const z3=await page.evaluate(()=>({svg:/<svg/.test($("fpa_profilGross").innerHTML),
  pfeil:/b42318/.test($("fpa_profilGross").innerHTML),zeilen:document.querySelectorAll("#fpa_kopf tbody tr").length}));
 p(z3.svg&&z3.zeilen===3,"Register 3 zeigt Zeichnung und Uebersicht",z3);
 p(z3.pfeil,"der Ansichtspfeil ist gezeichnet",z3);
 await waehle(page,"#fpa_ansicht2","keiner");
 const ohnePfeil=await page.evaluate(()=>({a:fpA.ansicht,pfeil:/b42318/.test($("fpa_profilGross").innerHTML)}));
 p(ohnePfeil.a==="keiner"&&!ohnePfeil.pfeil,"Ansichtsrichtung wirkt",ohnePfeil);

 console.log("\nF · Skizze → Profil");
 const boxLage=await page.evaluate(()=>{
  fpaSetzeSchritt(3);
  const a=document.getElementById("fpaSkizzeBox");
  const inR3=a?!a.hidden:null;
  fpaSetzeSchritt(4);
  const el=document.getElementById("fpaSkizzeBox");
  // Verschwindet der Block beim Neuzeichnen, ist genau das der Fehlschlag -
  // und kein Abbruch des Pruefstands.
  if(!el)return {weg:true,inR3,inR4:false,imZiel:false,vorKopf:false};
  return {inR3,inR4:!el.hidden,
   imZiel:$("freiesProfilAufnahme").contains(el),
   vorKopf:!!$("fpa_kopf")&&!$("fpa_kopf").contains(el)};
 });
 p(boxLage.inR3===false&&boxLage.inR4===true,"der Erkennungs-Block erscheint nur in Register 4",boxLage);
 p(boxLage.imZiel&&boxLage.vorKopf,"er haengt im Ziel, aber NICHT im neu geschriebenen Kopf",boxLage);
 // Kein blindes .click(): verschwindet der Block (weil er faelschlich in
 // einen neu geschriebenen Container gehaengt wurde), soll das ein sauberer
 // Fehlschlag sein und nicht den Pruefstand abbrechen.
 const uebernahme=await page.evaluate(()=>{
  const knopf=document.getElementById("fp_sketchUebernehmen");
  const vor=document.getElementById("fp_sketchVorschau");
  if(!knopf||!vor)return {fehlt:true,sichtbar:false,modell:fpA.schenkel.length,gleich:false,erste:null};
  // Die Vorschau und die Uebernahme sind unveraendert die von js/14.
  fpVorschauZeigen(fpPruefeErkannteSchenkel(
    [{laenge:30,winkel:0},{laenge:200,winkel:90},{laenge:45,winkel:-90}]),0);
  const sichtbar=!vor.hidden;
  knopf.click();
  return {sichtbar,modell:fpA.schenkel.length,global:fpSchenkel.length,
   gleich:fpSchenkel===fpA.schenkel,
   erste:fpA.schenkel[0]&&fpA.schenkel[0].laenge};
 });
 await page.waitForTimeout(120);
 p(uebernahme.sichtbar,"die Vorschau von js/14 wird gezeigt",uebernahme);
 p(uebernahme.modell===3&&uebernahme.erste===30,
   "die erkannte Form steht danach im Modell",uebernahme);
 p(uebernahme.gleich,"und Modell und fpSchenkel sind wieder dasselbe Array",uebernahme);
 const nachZeichnen=await page.evaluate(()=>{
  fpaSetzeSchritt(2); fpaSetzeSchritt(4);
  return fpA.schenkel.length;
 });
 p(nachZeichnen===3,"die Uebernahme ueberlebt das Neuzeichnen",nachZeichnen);

 console.log("\nG · Segmente und Ausmass");
 await profil(page,[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}]);
 await reg(page,5);
 await klick(page,"#fpa_segPlus");
 await tippe(page,'[data-fpa-seg-laenge="0"]',"2000");
 const g1=await page.evaluate(()=>{
  const z=fpaAusmassZeilen();
  return {segmente:fpA.segmente.length,
   massen:fpA.segmente[0].massen.map(m=>m.mass).join(),
   abw:fpaAbwicklungSegment(fpA.segmente[0]).links,
   flaeche:Math.round(fpaFlaecheM2()*1e6)/1e6,
   zeilen:z.length,laufmeter:z[0]&&z[0].menge,
   nan:/NaN|Infinity/.test($("fpa_kopf").innerHTML)};
 });
 p(g1.segmente===1&&g1.massen==="20,150,40","die Masse kommen aus dem Profil",g1);
 p(g1.abw===210,"Abwicklung 210 mm",g1.abw);
 p(Math.abs(g1.flaeche-0.42)<1e-6,"Flaeche 2000 x 210 = 0,42 m²",g1.flaeche);
 p(g1.zeilen>=4&&g1.laufmeter==="2,00","das Ausmass entsteht aus der Aufnahme",g1);
 p(!g1.nan,"kein NaN in der Anzeige");
 // Verwaiste Masse: werden Schenkel weniger, darf die Abwicklung nicht stehenbleiben.
 const verwaist=await page.evaluate(()=>{
  const vor=fpaAbwicklungSegment(fpA.segmente[0]).links;
  fpA.schenkel=[{laenge:20,winkel:0},{laenge:150,winkel:90}];
  fpSchenkel=fpA.schenkel;
  renderFreiesProfilAufnahme();
  const nach=fpaAbwicklungSegment(fpA.segmente[0]).links;
  return {vor,nach,massen:fpA.segmente[0].massen.length};
 });
 p(verwaist.vor===210&&verwaist.nach===170&&verwaist.massen===2,
   "weniger Schenkel: verwaiste Masse fallen aus der Abwicklung",verwaist);

 console.log("\nH · Zuschnitt aus Rollenblech");
 // Von Hand gerechnet: Profil 20/150/40 = 210 mm, Segmente 2000/1500/1200.
 //   Tafellaenge 2000, drei Streifen (2000 | 1500 | 1200)
 //   Rolle 1000: 1000/210 -> 4 je Tafel -> 1 Tafel -> 2,00 m²
 //   Rolle  670:  670/210 -> 3 je Tafel -> 1 Tafel -> 1,34 m²
 //   netto 4700 x 210 = 0,987 m²
 await page.evaluate(()=>{
  fpA.schenkel=[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}];
  fpSchenkel=fpA.schenkel;
  fpA.segmente=[2000,1500,1200].map(l=>({laenge:l,massen:null}));
  fpSegmente=fpA.segmente;
  renderFreiesProfilAufnahme();
 });
 await reg(page,6);
 const h1=await page.evaluate(()=>{
  const q=fpaRollenPlan();
  return {gruppen:q.gruppen.length,breite:q.gruppen[0].breite,tafel:q.gruppen[0].tafelLaenge,
   streifen:q.gruppen[0].streifen.length,netto:Math.round(q.netto*1e6)/1e6,
   moeglich:q.moeglich.map(m=>({b:m.breite,t:m.tafeln,f:Math.round(m.flaeche*1e6)/1e6})),
   bestes:q.bestes&&q.bestes.breite,
   verschnitt:q.bestes?Math.round(q.bestes.verschnitt*1000)/1000:null};
 });
 p(h1.gruppen===1&&h1.breite===210,"eine Streifenbreite: 210 mm",h1);
 p(h1.tafel===2000&&h1.streifen===3,"Tafellaenge 2000, drei Streifen",h1);
 p(Math.abs(h1.netto-0.987)<1e-6,"netto 0,987 m² aus dem Ausmass",h1.netto);
 const r1000=h1.moeglich.find(m=>m.b===1000), r670=h1.moeglich.find(m=>m.b===670);
 p(r1000&&r1000.t===1&&Math.abs(r1000.f-2)<1e-6,"Rolle 1000: 1 Tafel, 2,00 m²",r1000);
 p(r670&&r670.t===1&&Math.abs(r670.f-1.34)<1e-6,"Rolle 670: 1 Tafel, 1,34 m²",r670);
 p(h1.bestes===670,"die schmalere Rolle ist die bessere",h1.bestes);
 p(Math.abs(h1.verschnitt-0.353)<1e-3,"Verschnitt 0,353 m²",h1.verschnitt);
 // Zwei Stuecke muessen sich einen Streifen teilen: 2000 | 900+900.
 const pack=await page.evaluate(()=>{
  const vor=JSON.parse(JSON.stringify(fpA.segmente));
  fpA.segmente=[2000,900,900].map(l=>({laenge:l,massen:null}));
  fpSegmente=fpA.segmente;
  const q=fpaRollenPlan(), g=q.gruppen[0];
  const r={streifen:g.streifen.length,
   belegung:g.streifen.map(st=>st.stuecke.map(x=>x.laenge).join("+")).sort().join(" | ")};
  fpA.segmente=vor; fpSegmente=fpA.segmente; renderFreiesProfilAufnahme();
  return r;
 });
 p(pack.streifen===2&&pack.belegung==="2000 | 900+900",
   "2000 | 900+900 kommt mit zwei Streifen aus (Packrechnung aus js/29)",pack);
 // Zwei verschiedene Breiten
 const zwei=await page.evaluate(()=>{
  fpA.segmente.push({laenge:900,massen:[{mass:100},{mass:100},{mass:100}]});
  fpSegmente=fpA.segmente;
  const q=fpaRollenPlan();
  return {gruppen:q.gruppen.map(g=>({b:g.breite,n:g.stuecke.length})),
   f670:(q.moeglich.find(m=>m.breite===670)||{}).flaeche,
   bestes:q.bestes&&q.bestes.breite};
 });
 p(zwei.gruppen.length===2&&zwei.gruppen.some(g=>g.b===300&&g.n===1),
   "zwei Streifenbreiten, jede fuer sich gepackt",zwei);
 p(Math.abs(zwei.f670-1.943)<1e-6,"Rolle 670: 1,34 + 0,603 = 1,943 m²",zwei.f670);
 // Konisch: die groessere Abwicklung zaehlt
 const kon=await page.evaluate(()=>{
  fpA.konisch="ja";
  fpA.segmente=[{laenge:1000,massen:[{links:50,rechts:70},{links:80,rechts:100},{links:30,rechts:40}]}];
  fpSegmente=fpA.segmente;
  renderFreiesProfilAufnahme();
  const ab=fpaAbwicklungSegment(fpA.segmente[0]), q=fpaRollenPlan();
  const r={links:ab.links,rechts:ab.rechts,breite:q.gruppen[0].breite,
   netto:Math.round(q.netto*1e6)/1e6};
  fpA.konisch="nein"; renderFreiesProfilAufnahme();
  return r;
 });
 p(kon.links===160&&kon.rechts===210,"konisch: 160 / 210 mm",kon);
 p(kon.breite===210,"die Streifenbreite ist die groessere (rechte) Abwicklung",kon.breite);
 p(Math.abs(kon.netto-0.185)<1e-6,"die Flaeche bleibt das Trapez (0,185 m²)",kon.netto);
 // Segment ohne Laenge wird gemeldet statt mitgerechnet
 const ohne=await page.evaluate(()=>{
  fpA.segmente=[{laenge:2000,massen:null},{laenge:0,massen:null}];
  fpSegmente=fpA.segmente; renderFreiesProfilAufnahme();
  const q=fpaRollenPlan();
  return {ohne:q.ohne.map(x=>x.nr),gruppen:q.gruppen.length,
   text:/ohne L(ä|ae)nge/.test($("fpa_kopf").innerText)};
 });
 p(ohne.ohne.join()==="2"&&ohne.gruppen===1,"Segment ohne Laenge wird nicht gerechnet",ohne);
 p(ohne.text,"sondern ausdruecklich gemeldet",ohne.text);

 console.log("\nI · Kontrolle");
 await page.evaluate(()=>{
  fpA.schenkel=[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}];
  fpSchenkel=fpA.schenkel;
  fpA.segmente=[{laenge:2000,massen:null}]; fpSegmente=fpA.segmente;
  fpA.material="3";
  renderFreiesProfilAufnahme();
 });
 await reg(page,7);
 const i0=await page.evaluate(()=>fpaPruefungen().filter(x=>x.art==="fehler").length);
 p(i0===0,"vollstaendige Aufnahme: kein Fehler",i0);
 const faelle=[
  ["negative Laenge", ()=>{fpA.schenkel[0].laenge=-5}, /negative L(ä|ae)nge/i],
  ["Laenge 0",        ()=>{fpA.schenkel[0].laenge=0},  /L(ä|ae)nge 0/i],
  ["keine Zahl",      ()=>{fpA.schenkel[0].laenge="abc"}, /keine g(ü|ue)ltige Zahl/i],
  ["Winkel zu gross", ()=>{fpA.schenkel[1].winkel=200}, /ausserhalb/i],
  ["nur ein Schenkel",()=>{fpA.schenkel=[{laenge:50,winkel:0}]}, /mindestens zwei|noch kein Profil/i],
  ["zu viele",        ()=>{fpA.schenkel=Array.from({length:26},(_,i)=>({laenge:10,winkel:i?30:0}))}, /H(ö|oe)chstens 24/i]
 ];
 for(const [name,setzen,muster] of faelle){
  const r=await page.evaluate(fn=>{
   const sicher=JSON.parse(JSON.stringify(fpA.schenkel));
   eval("("+fn+")()"); fpSchenkel=fpA.schenkel;
   renderFreiesProfilAufnahme();
   const f=fpaPruefungen().filter(x=>x.art==="fehler");
   const punkt=!!document.querySelector("#fpa_register .ra-register-punkt.fehler");
   const nan=/NaN|Infinity/.test($("fpa_kopf").innerHTML);
   fpA.schenkel=sicher; fpSchenkel=fpA.schenkel; renderFreiesProfilAufnahme();
   return {texte:f.map(x=>x.text).join(" | "),anzahl:f.length,punkt,nan};
  },setzen.toString());
  p(r.anzahl>0&&muster.test(r.texte),name+" wird gemeldet",r.texte.slice(0,80));
  p(r.punkt,name+": das Register Kontrolle bekommt einen roten Punkt");
  p(!r.nan,name+": kein NaN in der Anzeige");
 }

 console.log("\nJ · Speicher-Payload");
 await page.evaluate(()=>{
  fpA.material="2"; fpA.konisch="nein"; fpA.ansicht="links";
  fpA.schenkel=[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}];
  fpSchenkel=fpA.schenkel;
  fpA.segmente=[{laenge:2000,massen:null},{laenge:1500,massen:null}];
  fpSegmente=fpA.segmente;
  renderFreiesProfilAufnahme();
 });
 const pay=await page.evaluate(()=>{
  measSelectedProjectId=7;
  $("measTitle").value="Attika Nord"; $("measNote").value=""; $("measDate").value="2026-09-04";
  return buildMeasurementFromForm();
 });
 const d=pay.data||{};
 p(pay.type==="freies_profil","Typ stimmt",pay.type);
 ["schenkel","konisch","segmente","ansicht","material"].forEach(k=>
  p(d[k]!==undefined,"bisheriges Feld "+k+" gespeichert",d[k]));
 p((d.schenkel||[]).length===3&&(d.segmente||[]).length===2,"Schenkel und Segmente vollstaendig",
   {s:(d.schenkel||[]).length,g:(d.segmente||[]).length});
 p(d.konisch===false&&d.material==="2"&&d.ansicht==="links","Grunddaten im Payload",d);
 p(Math.abs(Number(d.flaeche_m2)-0.735)<1e-3,"Flaeche gespeichert (3500 x 210)",d.flaeche_m2);
 p(Array.isArray(d.ausmass)&&d.ausmass.length>0,"Ausmass gespeichert",(d.ausmass||[]).length);
 p(d.zuschnitt&&d.zuschnitt.bestes&&d.zuschnitt.bestes.breite===670,"Zuschnittplan gespeichert",d.zuschnitt&&d.zuschnitt.bestes);
 p(!/created_by|updated_by/.test(JSON.stringify(d)),"kein Ersteller im data-Feld");

 console.log("\nK · Wiederoeffnen und alter Datensatz");
 const wieder=await page.evaluate(pl=>{
  fpaZuruecksetzen();
  fpaFuellen(pl.data);
  return {schenkel:fpA.schenkel.length,segmente:fpA.segmente.length,
   material:fpA.material,konisch:fpA.konisch,schritt:fpaSchritt,
   flaeche:Math.round(fpaFlaecheM2()*1e3)/1e3};
 },pay);
 p(wieder.schenkel===3&&wieder.segmente===2,"alles wieder da",wieder);
 p(wieder.material==="2"&&wieder.konisch==="nein","Grunddaten wieder da",wieder);
 p(wieder.schritt===1,"und es beginnt auf Register 1",wieder.schritt);
 p(Math.abs(wieder.flaeche-0.735)<1e-3,"dieselbe Flaeche wie vorher",wieder.flaeche);
 const alt=await page.evaluate(()=>{
  // Datensatz im Format bis v2.76: ohne flaeche_m2, ausmass, zuschnitt.
  fpaFuellen({schenkel:[{laenge:15,winkel:0},{laenge:100,winkel:90}],konisch:false,
   segmente:[{laenge:1000,massen:[{mass:15},{mass:100}]}],ansicht:"oben",material:"6"});
  return {schenkel:fpA.schenkel.length,abw:fpaAbwicklungSegment(fpA.segmente[0]).links,
   material:fpA.material,ansicht:fpA.ansicht,
   nan:/NaN|Infinity/.test($("fpa_kopf").innerHTML)};
 });
 p(alt.schenkel===2&&alt.abw===115,"ein Datensatz von vor v2.77 oeffnet unveraendert",alt);
 p(alt.material==="6"&&alt.ansicht==="oben","mit seinen Grunddaten",alt);
 p(!alt.nan,"und ohne NaN");

 console.log("\nL · Fotos erst nach Fertig");
 await page.evaluate(()=>{fpaFuellen({schenkel:[{laenge:20,winkel:0},{laenge:150,winkel:90}],
   konisch:false,segmente:[{laenge:2000,massen:null}],ansicht:"links",material:"3"});
  showMeasTypeSection("freies_profil");});
 const vorFertig=await page.evaluate(()=>{
  const box=$("measMedienBereich");
  return {hidden:box.hidden,display:getComputedStyle(box).display};
 });
 p(vorFertig.hidden||vorFertig.display==="none","waehrend der Register ausgeblendet",vorFertig);
 await reg(page,7);
 await klick(page,"#fpa_weiter");
 const nachFertig=await page.evaluate(()=>{
  const box=$("measMedienBereich"), r=box.getBoundingClientRect();
  return {display:getComputedStyle(box).display,hoehe:Math.round(r.height),
   markiert:box.classList.contains("ra-ziel"),schritt:fpaSchritt};
 });
 p(nachFertig.display!=="none"&&nachFertig.hoehe>0,"nach Fertig sichtbar",nachFertig);
 p(nachFertig.markiert,"und hervorgehoben",nachFertig);
 p(nachFertig.schritt===7,"blaettert nicht ins Leere",nachFertig.schritt);

 console.log("\nM · Druck");
 const druck=await page.evaluate(async pl=>{
  window.__pdf=[];
  window.open=()=>({document:{write(h){window.__pdf.push(h)},close(){}},focus(){},print(){},set onload(f){}});
  storageSignedUrl=async()=>null;
  companyName="Peter Künzi AG"; companyAddress=""; logoUrl=null;
  await printMeasurement({...pl,id:1,title:"Attika Nord",date:"2026-09-04",note:""});
  return window.__pdf[0]||"";
 },pay);
 p(/>Profil</.test(druck)&&/<svg/.test(druck),"Profil und Zeichnung im PDF");
 p(/>Ausmass</.test(druck),"Ausmass im PDF");
 p(/Blechfl/.test(druck),"Blechflaeche im PDF");
 p(/Zuschnitt aus Rollenblech/.test(druck),"Zuschnitt im PDF");
 p(/670 mm/.test(druck),"mit der gespeicherten Rollenbreite");
 p(!/\bNaN\b|\bInfinity\b/.test(druck),"kein NaN im PDF");
 const druckAlt=await page.evaluate(async()=>{
  window.__pdf=[];
  await printMeasurement({id:2,type:"freies_profil",title:"Alt",date:"2026-08-28",note:"",
   data:{schenkel:[{laenge:15,winkel:0},{laenge:100,winkel:90}],konisch:false,
     segmente:[{laenge:1000,massen:[{mass:15},{mass:100}]}],ansicht:"oben",material:"6"}});
  return window.__pdf[0]||"";
 });
 p(/>Profil</.test(druckAlt),"ein alter Datensatz druckt weiterhin");
 p(!/Zuschnitt aus Rollenblech/.test(druckAlt)&&!/>Ausmass</.test(druckAlt),
   "ohne die neuen Abschnitte - es wird nichts nachgerechnet");

 console.log("\nN · Bildschirmbreiten");
 for(const w of [360,412,768,1280]){
  await page.setViewportSize({width:w,height:1400});
  let schlimm=0; const wo=[];
  for(let n=1;n<=7;n++){
   await reg(page,n);
   const m=await page.evaluate(br=>{
    const raus=[];
    document.querySelectorAll("#measTypeFreiesProfil *").forEach(el=>{
     if(el.hidden||el.offsetParent===null)return;
     const r=el.getBoundingClientRect();
     if(r.width>0&&r.right>br+1){
      let par=el.parentElement,scroll=false;
      while(par){const o=getComputedStyle(par).overflowX;
       if(o==="auto"||o==="scroll"){scroll=true;break}par=par.parentElement}
      if(!scroll)raus.push((el.id||el.className||el.tagName)+" right="+Math.round(r.right));}
    });
    return {raus:raus.slice(0,3),scrollt:document.documentElement.scrollWidth>br+1};
   },w);
   if(m.raus.length||m.scrollt){schlimm++;wo.push("R"+n+": "+(m.raus.join(" | ")||"scrollWidth"))}
  }
  p(schlimm===0,"Breite "+w+" px: alle sieben Register passen",wo.slice(0,3));
 }
 await page.setViewportSize({width:412,height:1400});

 console.log("\nO · Keine JS-Fehler");
 p(fehler.length===0,"keine Seitenfehler",fehler.slice(0,2));

 console.log("\npruefstand-freies-profil-app: "+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();
