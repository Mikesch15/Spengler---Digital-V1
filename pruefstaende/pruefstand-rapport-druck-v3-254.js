// Prueft, dass auf dem gedruckten Regierapport NUR der Rapport steht (v3.254).
//
// GEMELDET vom Anwender, mit Bildschirmfoto des Druckdialogs:
// "Regierapport ausdruck stimmt nicht mehr". Auf Seite 1 standen ueber dem
// Rapport die Projekt-Register (Uebersicht, Offerte, Massaufnahme,
// Herstellung, Ausmass, Rapport, Dateien), darunter "+ Neuer Regierapport"
// und die Rapportliste. Der Rapport selbst war richtig.
//
// URSACHE, gemessen: css/05-ansicht2.css blendete im Druck nur #a2Kopf und
// #a2Leiste aus - den Kopf und die untere Leiste. Der Inhalt dazwischen
// (#a2Inhalt) blieb stehen, 108 px hoch bei 1100 px Fensterbreite. Solange
// die App #startScreen beim Oeffnen des Rapports versteckte, fiel das nicht
// auf. Seit v3.162 haelt a2LeisteHalten() (js/70) #startScreen aber
// ABSICHTLICH sichtbar, solange ein Formular offen ist - sonst waere die
// untere Leiste unter dem Rapport weg. Auf dem Bildschirm deckt der Rapport
// die Seite zu (position:fixed, z-index 30, in @media screen); im Druck gibt
// es kein z-index-Zudecken, und #startScreen steht im Quelltext VOR
// #reportScreen - also floss die Projektseite oben auf die Seite.
//
// WARUM ES KEIN PRUEFSTAND GEFUNDEN HAT: pruefstand-edv-im-druck-v3-133.js
// misst zwar im Druck, setzt dafuer aber $("startScreen").hidden=true von
// Hand. Damit prueft er einen Zustand, den die App seit v3.162 gar nicht
// mehr herstellt. Dieser Pruefstand geht deshalb den ECHTEN Weg: er macht
// es wie js/09 (startScreen verstecken, Rapport oeffnen) und laesst danach
// a2LeisteHalten() laufen - genau das, was im Betrieb passiert.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rapport-druck-v3-254.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

const ATTRAPPE="window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),"
 +"onAuthStateChange:()=>{}},from:()=>{const q={};['select','eq','order','limit'].forEach(k=>q[k]=()=>q);"
 +"q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;}})};";

// Die Marke steht fuer alles, was die Projektseite traegt - Register,
// "Neuer Regierapport", Rapportliste. Ein Wort, das es sonst nirgends gibt:
// so sagt ein Treffer im Drucktext eindeutig, dass die Seite mitgedruckt
// wurde, und nicht bloss ein zufaellig gleiches Wort aus dem Rapport.
const MARKE="ZZPROJEKTSEITEZZ";

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1100,height:900}});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);

 // Ein Rapport wie der gemeldete: eine Arbeitszeile, eine Materialzeile.
 await page.evaluate((marke)=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  meineRechte={admin:true}; allProjects=[];
  settings.materials=[["202.21","Rinnenhalter Chromnickelstahl","250","St",6.00]];
  settings.rates=[{name:"Polier",rate:118}];
  mats=[{date:"2026-10-05",no:"202.21",qty:11}];
  works=[{date:"2026-10-05",desc:"Rinnenhaeken montieren und Rinne messen & ruesten",
          who:"ML",role:"Polier",hours:8.5,rate:118}];
  $("authScreen").hidden=true; $("appRoot").hidden=false;
  // Die Projektseite, wie die Ansicht sie zeichnet.
  $("a2Inhalt").innerHTML='<div class="a2-abschnitt"><b>'+marke+'</b> '
    +'Uebersicht Offerte Massaufnahme Herstellung Ausmass Rapport Dateien</div>';
  $("startScreen").hidden=false;
 },MARKE);
 await page.waitForTimeout(200);

 // DER ECHTE WEG: js/09 versteckt zuerst #startScreen und oeffnet danach den
 // Rapport. a2LeisteHalten() (js/70) holt #startScreen daraufhin zurueck,
 // damit die untere Leiste nicht verschwindet.
 await page.evaluate(()=>{
  $("startScreen").hidden=true;
  $("reportScreen").hidden=false;
  renderMain();
  if(typeof a2LeisteHalten==="function")a2LeisteHalten();
 });
 await page.waitForTimeout(400);

 p(jsFehler.length===0,"die App laedt ohne JavaScript-Fehler",jsFehler.slice(0,3));
 if(jsFehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const mess=async(wie)=>{
  await page.emulateMedia({media:wie});
  await page.waitForTimeout(250);
  return page.evaluate(()=>{
   const kasten=id=>{const e=document.getElementById(id); if(!e)return null;
     const r=e.getBoundingClientRect();
     return {anzeige:getComputedStyle(e).display,h:Math.round(r.height),w:Math.round(r.width)};};
   const t=(document.body.innerText||"").replace(/\s+/g," ").trim();
   return {a2Screen:kasten("a2Screen"),a2Inhalt:kasten("a2Inhalt"),
           a2Kopf:kasten("a2Kopf"),a2Leiste:kasten("a2Leiste"),
           reportScreen:kasten("reportScreen"),
           text:t, anfang:t.slice(0,160)};
  });
 };

 console.log("\nA · Der Zustand stimmt - sonst misst der Rest nichts");
 // Das ist die Voraussetzung des ganzen Pruefstands: #startScreen ist
 // WIEDER sichtbar, obwohl js/09 es gerade versteckt hat. Faellt diese
 // Pruefung, hat sich der Mechanismus aus v3.162 geaendert und die Messung
 // unten waere nur zufaellig gruen.
 const schirm=await page.evaluate(()=>({
   startOffen:!$("startScreen").hidden,
   rapportOffen:!$("reportScreen").hidden,
   halten:typeof a2LeisteHalten==="function"}));
 p(schirm.halten,"A1 a2LeisteHalten() gibt es",schirm);
 p(schirm.startOffen&&schirm.rapportOffen,
   "A2 #startScreen steht WIEDER offen, obwohl der Rapport offen ist - so ist es im Betrieb seit v3.162",schirm);

 console.log("\nB · Auf dem Bildschirm ist der Rahmen da");
 const s=await mess("screen");
 p(s.a2Screen.anzeige!=="none"&&s.a2Leiste.h>0,
   "B1 Kopf und Leiste stehen am Bildschirm - der Druckfall darf sie nicht kosten",s);
 p(s.text.indexOf(MARKE)>=0,"B2 und die Projektseite ist am Bildschirm vorhanden",s.anfang);

 console.log("\nC · Im DRUCK steht nur der Rapport");
 const d=await mess("print");
 // DIE Pruefung zum gemeldeten Fehler.
 p(d.text.indexOf(MARKE)<0,
   "C1 die Projektseite steht NICHT auf dem Papier - genau das war gemeldet",d.anfang);
 p(d.a2Inhalt.h===0,
   "C2 #a2Inhalt hat im Druck keine Hoehe (vor v3.254: 108 px)",d.a2Inhalt);
 p(d.a2Screen.anzeige==="none",
   "C3 der ganze Rahmen ist aus, nicht nur seine zwei Raender",d.a2Screen);
 // GEGENPROBE: der Rapport selbst muss vollstaendig dastehen - eine Regel,
 // die zu weit greift, waere schlimmer als der gemeldete Fehler.
 p(d.reportScreen.h>200,"C4 GEGENPROBE: der Rapport selbst wird gedruckt",d.reportScreen);
 p(/^Peter K.nzi AG|^PETER K.NZI AG/.test(d.anfang),
   "C5 und er beginnt GANZ OBEN auf der Seite",d.anfang);
 ["Regierapport","REGIEAUFTRAG","Rinnenhalter Chromnickelstahl"].forEach(w=>{
  p(d.text.indexOf(w)>=0,"C6."+w+" steht im Ausdruck",d.text.slice(0,200));
 });
 // Die EDV-Nr. steht in einem EINGABEFELD der Tabellenzelle, nicht im Text
 // der Seite - innerText sieht sie nicht. Gelesen wird deshalb ihr Wert und
 // ihre Groesse, so wie es pruefstand-edv-im-druck-v3-133.js seit v3.133
 // tut. (Erster Anlauf dieses Pruefstands hat genau hier danebengegriffen:
 // die Pruefung war rot, die App richtig.)
 const edv=await page.evaluate(()=>[...document.querySelectorAll("#matBody tr")]
   .map(tr=>{const f=tr.querySelector("[data-mat-search]");
     if(!f)return null;
     const r=f.getBoundingClientRect();
     return {wert:f.value,h:Math.round(r.height),w:Math.round(r.width)};}));
 p(edv.length===1&&edv[0]&&edv[0].wert==="202.21"&&edv[0].h>0&&edv[0].w>0,
   "C6.EDV-Nr. steht im Ausdruck und ist sichtbar - die Zusage aus v3.133 gilt weiter",edv);

 console.log("\nD · Gegenprobe: ohne offenen Rapport wird nichts behauptet");
 // Die Regel gilt bewusst IMMER, nicht nur bei offenem Rapport. Eine
 // Navigation, die nur manchmal nicht aufs Papier gehoert, waere eine Regel
 // mit einer Ausnahme, die niemand kennt.
 await page.emulateMedia({media:"screen"});
 await page.evaluate(()=>{ $("reportScreen").hidden=true; $("startScreen").hidden=false; });
 await page.waitForTimeout(200);
 const d2=await mess("print");
 p(d2.text.indexOf(MARKE)<0,
   "D1 auch ohne offenen Rapport landet die Projektseite nicht auf dem Papier",d2.anfang);

 p(jsFehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",jsFehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();
