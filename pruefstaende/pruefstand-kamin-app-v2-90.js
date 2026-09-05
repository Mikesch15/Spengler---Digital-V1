// Prueft das neue Modul "Kamineinfassung" (js/37) in der laufenden App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-kamin-app-v2-90.js
//
// Alle Erwartungen sind VON HAND nachgerechnet und stehen als Kommentar dabei -
// sie werden nicht aus dem geprueften Code abgeschrieben.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,260):""))}};
// Klick ueber evaluate mit Pruefung: ein fehlendes oder gesperrtes Element
// soll sauber fehlschlagen und nicht in einen Timeout laufen - ein
// abgebrochener Pruefstand sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(150); return r;
}
async function tippe(page,sel,text){
 const da=await page.evaluate(s=>{const f=document.querySelector(s);
  if(!f)return false; f.focus(); f.value=""; f.dispatchEvent(new Event("input",{bubbles:true})); return true;},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(90);
 return true;
}
const reg=async(page,n)=>{await page.evaluate(k=>kamaSetzeSchritt(k),n);await page.waitForTimeout(180)};
const setz=async(page,o)=>{await page.evaluate(x=>{Object.assign(kamA,x);renderKaminAufnahme()},o);await page.waitForTimeout(180)};

// Der Standardfall, mit dem fast alles geprueft wird.
const FALL={
 material:"2", deckung:"biber_einfach", lattenabstand:330,
 getrennt:false,
 a:300, d:250, e:60, keil:80,
 winkelVorne:25, winkelHinten:25,
 breiteVorne:900, breiteHinten:900,
 umschlagVorne:20, umschlagHinten:20, umschlagSeite:20, ueberlappung:120,
 b:{l:500,r:500}, c:{l:400,r:400}, f:{l:150,r:150}, g:{l:100,r:100},
 hoehe:{l:400,r:400}, rollenAuswahl:[]
};
// Von Hand (v2.91): cos(25 Grad)=0.9063077870
//  Vorderteil   400/cos25 = 441.3512 -> 900 x (20+300+441.3512) = 900 x 761
//  Keil-Abbug   (90+25)/2 = 57.5 Grad   (Winkelhalbierende, siehe kamaKeilAbbug)
//  Keilhoehe    80*sin(57.5) = 67.4713
//  Wand hinten  (400-67.4713)/cos25 = 332.5287/0.9063078 = 366.9048
//  Hinterteil   900 x (20+60+250+80+366.9048) = 900 x 777
//               Bis v2.90 stand hier 851 - der Keil wurde zur VOLLEN Hoehe
//               addiert, statt ihren unteren Teil zu ersetzen.
//  Seitenteile  500/400 x (20+100+150+400) = x 670
//  Kaminlaenge  500+400-120 = 780
//  Flaeche  (900*761 + 900*777 + 2*(500*670) + 2*(400*670)) / 1e6 = 2.5902
//  Bleilappen  ceil(500/330)=2, ceil(400/330)=2, je Seite -> 8
//
// Gegen die Vorlage Schnitt_Kamineinfassung.dxf, aufs Dach projiziert:
//  Keil        Kopf (589.67, 28.76) -> Fuss (607.99, 0), Laenge 34.10
//  Hinterkant  (589.67, 28.76) -> (632.21, 120.00), Laenge 100.67
//  Bei Winkel hinten 25 Grad: Abbug 57.5, 34.10*sin(57.5) = 28.760 (= DXF),
//  Wand (120-28.760)/cos25 = 100.673 (= DXF), Keillaenge+Wand = 134.77.

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1500}});
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
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12, 3011 Bern",
                order_no:"2026-123",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670];
  companyName="Peter Künzi AG"; companyAddress="Industriestrasse 8"; logoUrl=null;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
 });

 console.log("\nA · Modul geladen, geteilte Bausteine unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderKaminAufnahme==="function",
  zurueck:typeof kamaZuruecksetzen==="function",
  fuellen:typeof kamaFuellen==="function",
  daten:typeof kamaDaten==="function",
  skizze:typeof kamaSkizze==="function",
  pack:typeof ebaPackeInStreifen==="function",
  zuschnitt:typeof zuschnittHtml==="function",
  druck:typeof zuDruckHtml==="function",
  deck:typeof EINF_DECKUNGEN==="object"&&!!EINF_DECKUNGEN.biber_einfach,
  ziel:!!document.getElementById("kaminAufnahme"),
  label:(typeof MEAS_TYPE_LABELS==="object")&&MEAS_TYPE_LABELS.kamineinfassung,
  einst:(typeof MEAS_TYPE_SETTINGS_SECTION==="object")&&MEAS_TYPE_SETTINGS_SECTION.kamineinfassung,
  abschnitt:!!document.querySelector('.settings-section[data-section="kamineinfassung"]')
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.daten&&da.skizze,"js/37 geladen",da);
 p(da.pack&&da.zuschnitt&&da.druck,"gemeinsame Bausteine (js/29, js/33) vorhanden",da);
 p(da.deck,"Deckungsarten aus js/21 wiederverwendet");
 p(da.ziel,"Container fuer die Aufnahme vorhanden");
 p(da.label==="Kamineinfassung","Art im Katalog eingetragen",da.label);
 p(da.einst==="kamineinfassung"&&da.abschnitt,"Einstellungsabschnitt verdrahtet",da);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 console.log("\nB · Sieben Register, nur eines sichtbar");
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  $("measType").value="kamineinfassung"; showMeasTypeSection("kamineinfassung");
 });
 await page.waitForTimeout(300);
 const r1=await page.evaluate(()=>({
  knoepfe:Array.from(document.querySelectorAll("#kam_register .ra-register-knopf"))
    .map(e=>(e.querySelector(".ra-register-text")||{}).textContent),
  aktiv:document.querySelectorAll("#kam_register .ra-register-knopf.aktiv").length,
  h2:Array.from(document.querySelectorAll("#kaminAufnahme .card h2")).map(e=>e.textContent.trim())
 }));
 p(r1.knoepfe.length===7,"sieben Register",r1.knoepfe);
 p(String(r1.knoepfe[0]).indexOf("Grunddaten")>=0,"Register 1 ist Grunddaten",r1.knoepfe[0]);
 p(String(r1.knoepfe[4]).indexOf("Zuschnitt")>=0&&String(r1.knoepfe[5]).indexOf("Ausmass")>=0
   &&String(r1.knoepfe[6]).indexOf("Kontrolle")>=0,"Ende: Zuschnitt, Ausmass, Kontrolle",r1.knoepfe);
 p(r1.aktiv===1,"genau ein Register aktiv");
 // Nur der eigene Inhalt: die erste Ueberschrift traegt die eigene Nummer,
 // keine weitere eine fremde.
 const eigen=await page.evaluate(()=>{
  const raus=[];
  for(let i=1;i<=7;i++){
   kamaSetzeSchritt(i);
   const h=Array.from(document.querySelectorAll("#kaminAufnahme .card h2")).map(e=>e.textContent.trim());
   raus.push({i,erste:h[0]||"",fremd:h.slice(1).filter(t=>/^[1-7]\s·/.test(t)&&t.indexOf(i+" ·")!==0)});
  }
  kamaSetzeSchritt(1);
  return raus;
 });
 p(eigen.every(x=>x.erste.indexOf(x.i+" ·")===0),"jedes Register beginnt mit seiner Nummer",eigen.map(x=>x.erste));
 p(eigen.every(x=>x.fremd.length===0),"kein Register zeigt fremden Inhalt",eigen);

 console.log("\nC · Grunddaten und Schalter links/rechts");
 await reg(page,1);
 const g1=await page.evaluate(()=>({
  material:!!document.getElementById("kam_material"),
  deckung:!!document.getElementById("kam_deckung"),
  latten:!!document.getElementById("kam_lattenabstand"),
  schalter:!!document.getElementById("kam_getrennt"),
  deckOpt:Array.from(document.querySelectorAll("#kam_deckung option")).length,
  stern:!!document.querySelector("#kaminAufnahme label .pflicht-stern")
 }));
 p(g1.material&&g1.deckung&&g1.latten&&g1.schalter,"Grunddaten vollstaendig",g1);
 p(g1.deckOpt===6,"sechs Deckungsarten aus js/21",g1.deckOpt);
 await setz(page,FALL);
 await reg(page,2);
 const einfach=await page.evaluate(()=>({
  b:!!document.getElementById("kam_b_l"),
  br:!!document.getElementById("kam_b_r")
 }));
 p(einfach.b&&!einfach.br,"ohne Schalter genau EIN Feld je seitlichem Mass",einfach);
 await page.evaluate(()=>{kamA.getrennt=true;renderKaminAufnahme()});
 await page.waitForTimeout(180);
 const doppelt=await page.evaluate(()=>({
  b:!!document.getElementById("kam_b_l"),br:!!document.getElementById("kam_b_r"),
  c:!!document.getElementById("kam_c_l"),cr:!!document.getElementById("kam_c_r"),
  f:!!document.getElementById("kam_f_l"),fr:!!document.getElementById("kam_f_r"),
  g:!!document.getElementById("kam_g_l"),gr:!!document.getElementById("kam_g_r"),
  h:!!document.getElementById("kam_hoehe_l"),hr:!!document.getElementById("kam_hoehe_r")
 }));
 p(Object.keys(doppelt).every(k=>doppelt[k]),"mit Schalter je zwei Felder (B, C, F, G, Höhe)",doppelt);
 await page.evaluate(()=>{kamA.getrennt=false;renderKaminAufnahme()});
 await page.waitForTimeout(150);

 console.log("\nD · Masse eintippen, ohne Fokus zu verlieren");
 await reg(page,2);
 await tippe(page,"#kam_a","300");
 const fok1=await page.evaluate(()=>({id:document.activeElement&&document.activeElement.id,
   wert:($("kam_a")||{}).value, zustand:kamA.a}));
 p(fok1.id==="kam_a"&&fok1.wert==="300","A vollstaendig getippt, Fokus bleibt",fok1);
 await tippe(page,"#kam_hoehe_l","400");
 const fok2=await page.evaluate(()=>({id:document.activeElement&&document.activeElement.id,
   wert:($("kam_hoehe_l")||{}).value, links:kamA.hoehe.l, rechts:kamA.hoehe.r}));
 p(fok2.id==="kam_hoehe_l"&&fok2.wert==="400","seitliche Höhe getippt, Fokus bleibt",fok2);
 p(String(fok2.rechts)==="400","ohne Schalter gilt der Wert fuer beide Seiten",fok2);

 // Der Fehler bis v2.92: die seitlichen Felder wurden mit ihrer FELD-ID im
 // Zustand gesucht (kamA["kam_b"] statt kamA.b) und waren deshalb nach JEDEM
 // Neuzeichnen leer - gespeichert war alles, nur nie zu sehen. Direkt nach dem
 // Tippen faellt das nicht auf, das Feld traegt ja noch den getippten Text.
 for(const [id,v] of [["#kam_b_l","500"],["#kam_c_l","400"],["#kam_f_l","150"],["#kam_g_l","100"]])
  await tippe(page,id,v);
 await reg(page,5); await reg(page,3); await reg(page,2);
 const nachNeu=await page.evaluate(()=>["kam_b_l","kam_c_l","kam_f_l","kam_g_l","kam_hoehe_l"]
   .map(i=>{const e=document.getElementById(i);return e?e.value:"FEHLT"}));
 p(JSON.stringify(nachNeu)===JSON.stringify(["500","400","150","100","400"]),
   "die seitlichen Masse stehen nach einem Registerwechsel noch in den Feldern",nachNeu);

 console.log("\nE · Kaminlaenge und Zuschnitte (von Hand nachgerechnet)");
 await setz(page,FALL);
 const z=await page.evaluate(()=>({
  laenge:kamaKaminLaenge("l"),
  hoehe:kamaHoeheDurchgehend(),
  teile:kamaZuschnitte().map(x=>({nr:x.nr,name:x.name,seite:x.seite,l:x.laenge,br:x.breite})),
  flaeche:Number(kamaFlaecheM2().toFixed(4))
 }));
 p(z.laenge===780,"Kaminlaenge = B + C − Ueberlappung = 780",z.laenge);
 p(z.teile.length===6,"sechs Zuschnitte",z.teile.length);
 p(z.teile[0].name==="Vorderteil"&&z.teile[0].l===900&&z.teile[0].br===761,
   "Vorderteil 900 × 761 (20 + 300 + 400/cos25)",z.teile[0]);
 p(z.teile[1].name==="Hinterteil"&&z.teile[1].l===900&&z.teile[1].br===777,
   "Hinterteil 900 × 777 (20 + 60 + 250 + 80 + Wand ÜBER dem Keil) — E ist enthalten",z.teile[1]);
 p(z.teile[2].name==="Seitenteil vorne"&&z.teile[2].seite==="links"&&z.teile[2].l===500&&z.teile[2].br===670,
   "Seitenteil vorne links 500 × 670 (B als Laenge)",z.teile[2]);
 p(z.teile[3].name==="Seitenteil hinten"&&z.teile[3].l===400&&z.teile[3].br===670,
   "Seitenteil hinten links 400 × 670 (C als Laenge)",z.teile[3]);
 p(z.teile[4].seite==="rechts"&&z.teile[5].seite==="rechts","je ein Seitenteil vorne und hinten rechts",
   [z.teile[4],z.teile[5]]);
 p(Math.abs(z.flaeche-2.5902)<1e-4,"Blechflaeche 2.5902 m²",z.flaeche);
 // Der Winkel muss wirklich wirken: ohne Winkel waere die Abwicklung 720.
 const ohneW=await page.evaluate(()=>{const alt=kamA.winkelVorne;kamA.winkelVorne=0;
   const b=kamaZuschnitte()[0].breite;kamA.winkelVorne=alt;return b});
 p(ohneW===720,"ohne Winkel vorne waere die Abwicklung 720 — der Winkel wirkt",ohneW);

 console.log("\nE2 · Keil und Winkel — die v2.91-Korrektur");
 await setz(page,FALL);
 // Der Keilwinkel ist die Winkelhalbierende des Knicks zwischen Dachblech und
 // Wand: beide an den Keil grenzenden Abbuege bekommen denselben Winkel.
 const kw=await page.evaluate(()=>({
  ab25:kamaKeilAbbug(25), ab0:kamaKeilAbbug(0), ab40:kamaKeilAbbug(40),
  // Die drei Werte der Vorlage, nachgerechnet: Keil 34.10 bei 25 Grad
  dxfHoehe:kamaKeilHoehe(34.10,25),
  dxfWand:(120-kamaKeilHoehe(34.10,25))/Math.cos(25*Math.PI/180),
  h80:kamaKeilHoehe(80,25), h0:kamaKeilHoehe(0,25)
 }));
 p(Math.abs(kw.ab25-57.5)<1e-9,"Abbug bei 25° = (90+25)/2 = 57,5°",kw.ab25);
 p(Math.abs(kw.ab0-45)<1e-9,"senkrechte Wand (0°) ergibt 45° Keil",kw.ab0);
 p(Math.abs(kw.ab40-65)<1e-9,"Abbug bei 40° = 65°",kw.ab40);
 p(Math.abs(kw.dxfHoehe-28.760)<0.005,"DXF: 34,10 mm Keil ueberwinden 28,76 mm Hoehe",kw.dxfHoehe);
 p(Math.abs(kw.dxfWand-100.673)<0.01,"DXF: Wand ueber dem Keil = 100,67 mm",kw.dxfWand);
 p(Math.abs(34.10+kw.dxfWand-134.77)<0.01,"DXF: Keillaenge + Wand = 134,77 mm (die Abwicklung hinten)",34.10+kw.dxfWand);
 p(Math.abs(kw.h80-67.4713)<1e-3,"Testfall: 80 mm Keil ueberwinden 67,47 mm Hoehe",kw.h80);
 p(kw.h0===0,"ohne Keil keine Keilhoehe",kw.h0);

 // Der Keil ERSETZT den unteren Teil der Hoehe, er wird nicht dazugezaehlt.
 const kz=await page.evaluate(()=>{
  const merk=kamA.keil, r={};
  const bein=()=>{const t=kamaZuschnitte()[1].teile;
    return t[t.length-1];};
  kamA.keil=0;   r.ohne=kamaZuschnitte()[1].breite; r.beinOhne=bein().wert;
  kamA.keil=80;  r.k80=kamaZuschnitte()[1].breite;  r.name=bein().name;
  kamA.keil=160; r.k160=kamaZuschnitte()[1].breite;
  kamA.keil=merk; return r;
 });
 // ohne Keil: 20+60+250+0+400/cos25 = 771.35 -> 771
 p(kz.ohne===771&&Math.abs(kz.beinOhne-441.3512)<1e-3,
   "ohne Keil rechnet die Wand mit der vollen Hoehe (771)",kz);
 p(kz.k80===777,"mit 80 mm Keil: 777 — der Keil ersetzt 67,47 mm Hoehe",kz.k80);
 // Der doppelte Keil verlaengert nur um 5 mm (die Hypotenuse ist laenger als
 // das Wandstueck, das sie ersetzt). Bis v2.90 waren es volle +80.
 p(kz.k160===782,"doppelter Keil bringt nur +5 mm, nicht +80",kz.k160);
 p(/Wand über dem Keil/.test(kz.name),"das Bein heisst 'Wand ueber dem Keil'",kz.name);

 // Ein Keil, der die ganze Hoehe ueberwindet, ist ein Fehler.
 await setz(page,Object.assign({},FALL,{keil:600}));
 const kzF=await page.evaluate(()=>kamaPruefungen().filter(x=>x.art==="fehler").map(x=>x.text));
 p(kzF.some(x=>/Keil überwindet/.test(x)),"Keil groesser als die Hoehe wird gemeldet",kzF);

 // Der Winkel ist ab v2.91 ein Pflichtfeld: leer waere 0 Grad und damit eine
 // Wand senkrecht auf dem Dach - genau der Fehler aus v2.90.
 await setz(page,Object.assign({},FALL,{winkelHinten:""}));
 const kwLeer=await page.evaluate(()=>kamaPruefungen());
 p(kwLeer.some(x=>x.art==="fehler"&&/Winkel hinten fehlt/.test(x.text)),
   "leerer Winkel ist ein Fehler, kein stilles 0°",kwLeer.map(x=>x.text));
 await setz(page,Object.assign({},FALL,{winkelVorne:0}));
 const kwNull=await page.evaluate(()=>kamaPruefungen());
 p(kwNull.some(x=>x.art==="warnung"&&/Winkel vorne/.test(x.text)),
   "0° wird als Warnung genannt (Wand senkrecht auf dem Dach)",kwNull.map(x=>x.text));
 await reg(page,2);
 const wPflicht=await page.evaluate(()=>["kam_winkelVorne","kam_winkelHinten"].map(id=>{
  const e=document.getElementById(id);
  return e?{req:e.required,aria:e.getAttribute("aria-required")}:null;
 }));
 p(wPflicht.every(x=>x&&x.req&&x.aria==="true"),"beide Winkel sind echte Pflichtfelder",wPflicht);

 console.log("\nF · Links und rechts getrennt");
 await setz(page,Object.assign({},FALL,{getrennt:true,
   b:{l:500,r:600},c:{l:400,r:350},hoehe:{l:400,r:450}}));
 const gt=await page.evaluate(()=>({
  ll:kamaKaminLaenge("l"), lr:kamaKaminLaenge("r"),
  hoehe:kamaHoeheDurchgehend(),
  teile:kamaZuschnitte().map(x=>({name:x.name,seite:x.seite,l:x.laenge,br:x.breite}))
 }));
 // links 500+400-120=780, rechts 600+350-120=830, Hoehe durchgehend = 450
 // Vorderteil 20+300+450/cos25 = 20+300+496.52 = 816.52 -> 817
 // Seitenteil rechts 20+100+150+450 = 720
 p(gt.ll===780&&gt.lr===830,"zwei Kaminlaengen (780 / 830)",gt);
 p(gt.hoehe===450,"Vorder-/Hinterteil rechnen mit der groesseren Hoehe",gt.hoehe);
 p(gt.teile[0].br===817,"Vorderteil folgt der groesseren Hoehe (817)",gt.teile[0]);
 p(gt.teile[2].l===500&&gt.teile[2].br===670,"Seitenteil vorne links 500 × 670",gt.teile[2]);
 p(gt.teile[4].l===600&&gt.teile[4].br===720,"Seitenteil vorne rechts 600 × 720",gt.teile[4]);

 console.log("\nG · Bleilappen");
 await setz(page,FALL);
 const bl=await page.evaluate(()=>kamaBleilappen());
 p(bl.gesamt===8,"8 Bleilappen (je Seitenteil aufgerundet)",bl.gesamt);
 p(bl.zeilen.length===4&&bl.zeilen[0].anzahl===2,"vier Seitenteile, 500/330 aufgerundet = 2",bl.zeilen);
 const blOhne=await page.evaluate(()=>{const alt=kamA.lattenabstand;kamA.lattenabstand="";
   const r=kamaBleilappen();kamA.lattenabstand=alt;return r});
 p(blOhne.gesamt===null,"ohne Lattenabstand wird keine Zahl erfunden",blOhne.gesamt);

 console.log("\nH · Zuschnitt aus Rollenblech (gemeinsame Packrechnung)");
 await reg(page,5);
 const rp=await page.evaluate(()=>{
  const r=kamaRollenPlan();
  return {breiten:r.gruppen.map(g=>g.breite),
    streifen:r.gruppen.map(g=>g.streifen.length),
    abschnitt:r.gruppen.map(g=>g.abschnittLaenge),
    best:r.bestes?{breite:r.bestes.breite,flaeche:Number(r.bestes.flaeche.toFixed(4))}:null,
    zuSchmal:r.zuSchmal, netto:Number(r.netto.toFixed(4))};
 });
 // Gruppen nach Abwicklung: 777 (1 Stueck, L=900), 761 (1, L=900), 670 (4, L=500)
 // 670er Gruppe: 500+400 > 500, also 4 Streifen a 500.
 // Rolle 1000: je Gruppe 1 Streifen nebeneinander -> 900 + 900 + 4*500 = 3800 mm
 //   Flaeche = 1000 * 3800 / 1e6 = 3.8
 // Rolle 670 ist schmaler als 777 -> faellt weg.
 p(JSON.stringify(rp.breiten)==="[777,761,670]","drei Streifenbreiten, breiteste zuerst",rp.breiten);
 p(JSON.stringify(rp.streifen)==="[1,1,4]","die 670er Gruppe braucht 4 Streifen",rp.streifen);
 p(JSON.stringify(rp.abschnitt)==="[900,900,500]","Abschnitt = laengstes Stueck der Gruppe",rp.abschnitt);
 p(rp.best&&rp.best.breite===1000&&Math.abs(rp.best.flaeche-3.8)<1e-4,"beste Rolle 1000 mm, 3.8 m²",rp.best);
 p(rp.zuSchmal.indexOf(670)>=0,"670 mm ist zu schmal fuer die 777er Abwicklung",rp.zuSchmal);
 // Es darf keine zweite Packrechnung geben.
 const nurEine=await page.evaluate(()=>{
  const alt=window.ebaPackeInStreifen; let gerufen=0;
  window.ebaPackeInStreifen=function(){gerufen++;return alt.apply(null,arguments)};
  kamaRollenPlan();
  window.ebaPackeInStreifen=alt; return gerufen;
 });
 p(nurEine===3,"gepackt wird mit ebaPackeInStreifen (js/29), je Gruppe einmal",nurEine);
 // Zwei kurze Seitenteile muessen in DENSELBEN Streifen passen: bei B=1000
 // und C=400 sind es 1000 | 1000 | 400+400 = 3 Streifen, nicht 4.
 const zusammen=await page.evaluate(()=>{
  const alt=JSON.parse(JSON.stringify({b:kamA.b,c:kamA.c}));
  kamA.b={l:1000,r:1000}; kamA.c={l:400,r:400};
  const gr=kamaRollenPlan().gruppen.filter(g=>g.breite===670)[0];
  const n=gr?gr.streifen.length:-1;
  const paare=gr?gr.streifen.filter(x=>x.stuecke.length>1).length:0;
  kamA.b=alt.b; kamA.c=alt.c;
  return {n,paare};
 });
 p(zusammen.n===3&&zusammen.paare===1,"zwei kurze Teile liegen im selben Streifen (3 statt 4)",zusammen);
 const zh=await page.evaluate(()=>{
  const el=document.getElementById("kaminAufnahme");
  const det=el.querySelectorAll("details"); det.forEach(d=>d.open=true);
  return {text:el.textContent, liste:!!el.querySelector(".zu-liste"),
    eigene:el.querySelectorAll("table").length};
 });
 p(zh.liste,"die gemeinsame Zuschnittliste (js/33) wird verwendet");
 p(/Streifenbreite/i.test(zh.text),"die Streifenbreite steht in den Kennzahlen");
 p(!/NaN|undefined/.test(zh.text),"kein NaN im Zuschnitt");

 console.log("\nI · Ausmass");
 await reg(page,6);
 const am=await page.evaluate(()=>{
  const z=kamaAusmassZeilen();
  return {n:z.length, erste:z[0], text:document.getElementById("kaminAufnahme").textContent};
 });
 p(am.n>=8,"Ausmass entsteht aus der Aufnahme",am.n);
 p(/Bleilappen/.test(am.text)&&/Blechfläche/.test(am.text),"Bleilappen und Blechflaeche im Ausmass");
 const amZeilen=await page.evaluate(()=>Array.from(
   document.querySelectorAll("#kaminAufnahme .ra-tab tbody tr")).map(t=>t.textContent).join(" | "));
 p(!/Artikel|Preis|Fr\./.test(amZeilen),"keine Artikelnummern und keine Preise in den Zeilen",amZeilen.slice(0,160));

 console.log("\nJ · Kontrolle");
 await setz(page,FALL);
 const k1=await page.evaluate(()=>kamaPruefungen());
 p(k1.length===0,"vollstaendige Aufnahme: keine Meldung",k1);
 const k2=await page.evaluate(()=>{kamA=kamaLeer();return kamaPruefungen()});
 p(k2.filter(x=>x.art==="fehler").length>=5,"leere Aufnahme: mehrere Fehler",k2.length);
 p(k2.some(x=>/Mass A/.test(x.text))&&k2.some(x=>/seitliche Höhe/.test(x.text)),
   "Fehler nennen die fehlenden Masse",k2.map(x=>x.text).slice(0,4));
 await setz(page,Object.assign({},FALL,{b:{l:100,r:100}}));
 const k3=await page.evaluate(()=>kamaPruefungen());
 p(k3.some(x=>/Überlappung/.test(x.text)),"B kleiner als die Ueberlappung wird gemeldet",k3.map(x=>x.text));
 await setz(page,Object.assign({},FALL,{winkelVorne:90}));
 const k4=await page.evaluate(()=>kamaPruefungen());
 p(k4.some(x=>x.art==="fehler"&&/Winkel vorne/.test(x.text)),"Winkel 90° wird als Fehler gemeldet",k4.map(x=>x.text));

 console.log("\nK · Schnittskizze nach der DXF");
 await setz(page,FALL);
 await reg(page,2);
 const sk=await page.evaluate(()=>{
  const el=document.getElementById("kam_skizze");
  return {svg:el.innerHTML.trim().indexOf("<svg")===0, html:el.innerHTML};
 });
 p(sk.svg,"die Skizze ist eine SVG");
 const hat=t=>sk.html.indexOf(t)>=0;
 p(hat("A = 300")&&hat("D = 250"),"A und D bemasst");
 p(hat("B = 500")&&hat("C = 400"),"B und C bemasst");
 p(hat("Höhe = 400"),"seitliche Höhe bemasst");
 p(hat("Keil = 80"),"Keil bemasst");
 p(hat("E = 60"),"E · 90°-Aufbug bemasst");
 p(hat("Winkel vorne 25°")&&hat("Winkel hinten 25°"),"beide Winkel beschriftet");
 p(hat("Knick 120"),"Knick als Masskette zwischen den beiden Kanten");
 p(/stroke-dasharray="7 5"/.test(sk.html),"Hinterkant Knick gestrichelt (verdeckte Kante)");
 p(!/NaN|Infinity/.test(sk.html),"kein NaN in der Skizze");
 const skLeer=await page.evaluate(()=>{const alt=kamA;kamA=kamaLeer();
   const h=kamaSkizze();kamA=alt;return h});
 p(skLeer.indexOf("<svg")<0&&/fehlen/.test(skLeer),"ohne Masse ein Hinweis statt einer erfundenen Zeichnung");
 // Der gezeichnete Keil muss der Winkelhalbierenden folgen, nicht einem fest
 // gewaehlten Winkel. Die Skizze skaliert x und y gleich, der Winkel bleibt
 // also erhalten (y ist im Bild nur nach unten gespiegelt).
 const keilWinkel=(html)=>{
  const alle=[...String(html).matchAll(/<line x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"\s+stroke="[^"]*" stroke-width="3\.4"/g)]
   .map(m=>m.slice(1,5).map(Number)).filter(q=>Math.abs(q[0]-q[2])>0.5);
  if(!alle.length)return null;
  const q=alle[0];
  return Math.atan2(q[3]-q[1],q[2]-q[0])*180/Math.PI;
 };
 const wKeil=keilWinkel(sk.html);
 p(wKeil!==null&&Math.abs(wKeil-57.5)<0.4,"der gezeichnete Keil steht unter 57,5° (Winkelhalbierende)",wKeil);
 const sk40=await page.evaluate(()=>{const alt=kamA.winkelHinten;kamA.winkelHinten=40;
   const h=kamaSkizze();kamA.winkelHinten=alt;return h});
 const wKeil40=keilWinkel(sk40);
 p(wKeil40!==null&&Math.abs(wKeil40-65)<0.4,"bei 40° Wandwinkel steht der Keil unter 65°",wKeil40);


 console.log("\nK2 · Wandrichtungen gegen die DXF (v2.92)");
 // Gegen die Vorlage Schnitt_Kamineinfassung.dxf, aufs Dach projiziert:
 //   Vorderkant  t 199.33 h   0.00 -> t 255.29 h 120.00  -> +25.00 Grad
 //   Hinterkant  t 589.67 h  28.76 -> t 632.21 h 120.00  -> +25.00 Grad
 //   Schnittkante oben                632.21 - 255.29 = 376.92
 //   Hinterkant bis h=0 verlaengert:  589.67 - 28.76*tan25 = 576.26
 //   Oeffnung am Dach:                576.26 - 199.33 = 376.93  = oben
 // Beide Waende neigen sich also GLEICHSINNIG bergwaerts, der Kamin ist im
 // Schnitt ein Parallelogramm (lotrechter Kamin auf geneigtem Dach). Bis
 // v2.91 zeichnete die App die Vorderwand gegenlaeufig - der Kamin ging nach
 // oben auf, bei H=400 und 25 Grad um 2*400*tan25 = 373 mm.
 await setz(page,FALL);
 const waende=(wv,wh,keil)=>page.evaluate(([a,b,k])=>{
  const alt={v:kamA.winkelVorne,h:kamA.winkelHinten,k:kamA.keil};
  kamA.winkelVorne=a; kamA.winkelHinten=b; kamA.keil=k;
  const svg=kamaSkizze();
  Object.assign(kamA,{winkelVorne:alt.v,winkelHinten:alt.h,keil:alt.k});
  const L=[...svg.matchAll(/<line x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)"\s+stroke="([^"]*)" stroke-width="3"/g)]
   .map(m=>({x1:+m[1],y1:+m[2],x2:+m[3],y2:+m[4],f:m[5]}));
  // Die Dachlinie ist ebenfalls waagerecht und 3 breit, hat aber eine eigene
  // Farbe - ohne diese Trennung misst man die falsche Linie.
  const dach=L.filter(l=>l.f!=="#5a6670");
  const bau=L.filter(l=>l.f==="#5a6670");
  const waag=bau.filter(l=>Math.abs(l.y1-l.y2)<=2);
  const senk=bau.filter(l=>Math.abs(l.y1-l.y2)>2)
    .sort((p,q)=>Math.min(p.x1,p.x2)-Math.min(q.x1,q.x2));
  if(dach.length!==1||waag.length!==1||senk.length!==2)
   return {fehler:{dach:dach.length,waag:waag.length,senk:senk.length}};
  const yDach=dach[0].y1;
  const teile=l=>({f:l.y1>l.y2?[l.x1,l.y1]:[l.x2,l.y2],
                   o:l.y1>l.y2?[l.x2,l.y2]:[l.x1,l.y1]});
  const grad=l=>{const t=teile(l);return Math.atan2(t.o[0]-t.f[0],t.f[1]-t.o[1])*180/Math.PI};
  // Die Hinterwand beginnt am Keilkopf - fuer die Oeffnung am Dach wird sie
  // entlang ihrer eigenen Richtung bis auf Dachhoehe verlaengert.
  const fussAmDach=l=>{const t=teile(l), dy=t.f[1]-t.o[1];
   return dy<1?t.f[0]:t.f[0]+(t.f[0]-t.o[0])/dy*(yDach-t.f[1])};
  return {vorne:+grad(senk[0]).toFixed(2), hinten:+grad(senk[1]).toFixed(2),
          oben:+Math.abs(waag[0].x2-waag[0].x1).toFixed(1),
          dach:+Math.abs(fussAmDach(senk[1])-fussAmDach(senk[0])).toFixed(1)};
 },[wv,wh,keil]);
 const w25=await waende(25,25,80);
 p(!w25.fehler,"die beiden Kaminwaende sind in der Skizze messbar",w25.fehler);
 p(!w25.fehler&&Math.abs(w25.vorne-25)<0.3,"Vorderwand steht bei +25° (bergwaerts) wie in der DXF",w25.vorne);
 p(!w25.fehler&&Math.abs(w25.hinten-25)<0.3,"Hinterwand steht bei +25° wie in der DXF",w25.hinten);
 p(!w25.fehler&&Math.abs(w25.vorne-w25.hinten)<0.3,"bei gleichen Winkeln neigen sich beide Waende GLEICHSINNIG",
   w25&&[w25.vorne,w25.hinten]);
 p(!w25.fehler&&Math.abs(w25.dach-w25.oben)<1.5,
   "Oeffnung am Dach = Schnittkante oben -> Parallelogramm wie in der DXF",w25&&[w25.dach,w25.oben]);
 const w40=await waende(40,40,80);
 p(!w40.fehler&&Math.abs(w40.dach-w40.oben)<1.5,"auch bei 40° ein Parallelogramm",w40&&[w40.dach,w40.oben]);
 const wNeg=await waende(-25,-25,0);
 p(!wNeg.fehler&&Math.abs(wNeg.vorne+25)<0.3&&Math.abs(wNeg.hinten+25)<0.3,
   "negative Winkel neigen beide Waende talwaerts",wNeg&&[wNeg.vorne,wNeg.hinten]);
 p(!wNeg.fehler&&Math.abs(wNeg.dach-wNeg.oben)<1.5,"auch talwaerts ein Parallelogramm",wNeg&&[wNeg.dach,wNeg.oben]);
 // Gegenprobe der Messung selbst: bei UNTERSCHIEDLICHEN Winkeln darf sie nicht
 // parallel melden - sonst wuerde sie jeden Fehler durchwinken.
 const wSchief=await waende(25,10,80);
 p(!wSchief.fehler&&Math.abs(wSchief.dach-wSchief.oben)>20,
   "bei unterschiedlichen Winkeln meldet die Messung KEIN Parallelogramm",wSchief&&[wSchief.dach,wSchief.oben]);
 // Der Kamin kann sich mit den Winkeln rechnerisch selbst aufheben.
 const unmoeglich=await page.evaluate(()=>{
  const alt=JSON.parse(JSON.stringify(kamA));
  Object.assign(kamA,{winkelVorne:60,winkelHinten:0,hoehe:{l:1000,r:1000},
    b:{l:200,r:200},c:{l:120,r:120},ueberlappung:120});
  const t=kamaPruefungen().map(x=>x.art+": "+x.text);
  Object.assign(kamA,alt);
  return t;
 });
 p(unmoeglich.some(t=>/^fehler: /.test(t)&&/träfen sich/.test(t)),
   "ein Kamin, der oben verschwindet, wird als Fehler gemeldet",unmoeglich);
 await setz(page,FALL);

 console.log("\nL · Speichern und Wiederoeffnen");
 await setz(page,Object.assign({},FALL,{getrennt:true,b:{l:500,r:600},hoehe:{l:400,r:450}}));
 const sp=await page.evaluate(()=>{
  $("measTitle").value="Kamin Nord"; $("measDate").value="2026-09-04";
  setMeasProjectField(7);
  const m=buildMeasurementFromForm();
  return {typ:m.type,titel:m.title,d:m.data};
 });
 p(sp.typ==="kamineinfassung","Typ im Payload",sp.typ);
 p(sp.d.a===300&&sp.d.d===250&&sp.d.e===60&&sp.d.keil===80,"Masse gespeichert",sp.d);
 p(sp.d.getrennt===true&&sp.d.b.l===500&&sp.d.b.r===600,"links und rechts getrennt gespeichert",sp.d.b);
 p(Array.isArray(sp.d.zuschnitte)&&sp.d.zuschnitte.length===6,"sechs Zuschnitte gespeichert",
   (sp.d.zuschnitte||[]).length);
 p(sp.d.bleilappen&&sp.d.bleilappen.gesamt!==undefined,"Bleilappen gespeichert",sp.d.bleilappen);
 p(Array.isArray(sp.d.ausmass)&&sp.d.ausmass.length>0,"Ausmass gespeichert");
 p(sp.d.rollen&&Array.isArray(sp.d.rollen.gruppen),"Rollenblech-Plan gespeichert");
 p(typeof sp.d.flaeche_m2==="number","Blechflaeche gespeichert",sp.d.flaeche_m2);
 const wieder=await page.evaluate(d=>{
  kamaFuellen(d);
  return {a:kamA.a,getrennt:kamA.getrennt,bl:kamA.b.l,br:kamA.b.r,
    teile:kamaZuschnitte().map(x=>x.laenge+"x"+x.breite),schritt:kamSchritt};
 },sp.d);
 p(String(wieder.a)==="300"&&wieder.getrennt===true&&String(wieder.br)==="600",
   "Wiederoeffnen stellt den Stand her",wieder);
 const gesp=Array.isArray(sp.d.zuschnitte)?sp.d.zuschnitte.map(x=>x.laenge+"x"+x.breite):null;
 p(gesp!==null&&JSON.stringify(wieder.teile)===JSON.stringify(gesp),
   "dieselben Zuschnitte nach dem Wiederoeffnen",{gesp,neu:wieder.teile});
 p(wieder.schritt===1,"nach dem Oeffnen beginnt es bei Register 1");

 // Der Anwenderfall: eine gespeicherte Massaufnahme oeffnen. Bis v2.92 standen
 // die Werte im Zustand, die Felder waren aber leer - fuer den Anwender nicht
 // von "wird nicht gespeichert" zu unterscheiden. Deshalb hier die FELDER
 // pruefen, nicht nur den Zustand.
 await page.evaluate(()=>{renderKaminAufnahme(); kamaSetzeSchritt(2)});
 await page.waitForTimeout(200);
 const felderAuf=await page.evaluate(()=>{
  const w=i=>{const e=document.getElementById(i);return e?e.value:"FEHLT"};
  return {getrennt:!!kamA.getrennt,
    bl:w("kam_b_l"),br:w("kam_b_r"),cl:w("kam_c_l"),
    fl:w("kam_f_l"),gl:w("kam_g_l"),hl:w("kam_hoehe_l"),hr:w("kam_hoehe_r")};
 });
 p(felderAuf.bl==="500"&&felderAuf.br==="600",
   "nach dem Oeffnen zeigen die B-Felder links 500 und rechts 600",felderAuf);
 p(felderAuf.hl==="400"&&felderAuf.hr==="450",
   "nach dem Oeffnen zeigen die Hoehen-Felder 400 und 450",felderAuf);
 p(felderAuf.cl==="400"&&felderAuf.fl==="150"&&felderAuf.gl==="100",
   "C, F und G stehen ebenfalls in ihren Feldern",felderAuf);
 const leerD=await page.evaluate(()=>{kamaFuellen({});return {a:kamA.a,teile:kamaZuschnitte().length,
   pruef:kamaPruefungen().filter(x=>x.art==="fehler").length>0}});
 p(leerD.a===""&&leerD.pruef,"ein Datensatz ohne Masse oeffnet ohne etwas zu erfinden",leerD);

 console.log("\nM · Fotos erst nach 'Fertig'");
 await setz(page,FALL);
 await reg(page,1);
 const m1=await page.evaluate(()=>{
  const e=document.getElementById("measMedienBereich");
  const s=getComputedStyle(e);
  return {sicht:!e.hidden&&s.display!=="none"&&e.getBoundingClientRect().height>10};
 });
 p(!m1.sicht,"waehrend der Register ist der Fotobereich zu",m1);
 await reg(page,7);
 const w=await page.evaluate(()=>{const e=document.getElementById("kam_weiter");
   return {text:e?e.textContent.trim():"", gesperrt:e?!!e.disabled:true}});
 p(/Fertig/.test(w.text)&&!w.gesperrt,"letztes Register: 'Fertig' und bedienbar",w);
 await klick(page,"#kam_weiter");
 await page.waitForTimeout(300);
 const m2=await page.evaluate(()=>{
  const e=document.getElementById("measMedienBereich");
  const s=getComputedStyle(e);
  return {sicht:!e.hidden&&s.display!=="none"&&e.getBoundingClientRect().height>10,
    speichern:!!document.getElementById("saveMeasurement")};
 });
 p(m2.sicht&&m2.speichern,"'Fertig' fuehrt zu Fotos und Speichern",m2);

 console.log("\nN · Druck");
 await setz(page,FALL);
 const dr=await page.evaluate(async()=>{
  window.__html=null;
  const alt=window.open;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){},closed:false});
  const m={type:"kamineinfassung",title:"Kamin Nord",date:"2026-09-04",
    data:kamaDaten(),project_id:7};
  await printMeasurement(m,{listen:"alle"});
  window.open=alt;
  return window.__html||"";
 });
 p(dr.length>500,"das PDF wird erzeugt",dr.length);
 p(/Kamineinfassung/.test(dr),"Art im Kopf",dr.slice(0,400));
 p(dr.indexOf("Bahnhofstrasse 12, 3011 Bern")>=0,"Objektadresse als Haupttitel");
 p(/900\s*&#215;\s*761|900 × 761/.test(dr.replace(/&nbsp;/g," ")),"Stueckliste mit L × B",
   (dr.match(/.{0,40}× 761.{0,20}/)||[""])[0]);
 p(/Bleilappen/.test(dr),"Bleilappen im PDF");
 p(/Zuschnitt aus Rollenblech/.test(dr),"Rollenblech im PDF");
 p(/Ausmass/.test(dr),"Ausmass im PDF");
 p(/<div class="eb-section-head">Schnitt<\/div>/.test(dr)&&/<svg/.test(dr),"Schnittskizze im PDF");
 p(!/NaN|undefined/.test(dr),"kein NaN im PDF");
 const drAlt=await page.evaluate(async()=>{
  window.__html=null;
  const alt=window.open;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){},closed:false});
  await printMeasurement({type:"kamineinfassung",title:"Leer",date:"2026-09-04",
    data:{},project_id:null},{listen:"alle"});
  window.open=alt;
  return window.__html||"";
 });
 p(drAlt.length>200&&!/NaN|undefined/.test(drAlt),"ein Datensatz ohne Masse druckt ohne NaN",drAlt.length);

 console.log("\nO · Mobil: nichts laeuft seitlich hinaus");
 await setz(page,FALL);
 const breiten=[320,360,390,412,768];
 for(const bw of breiten){
  await page.setViewportSize({width:bw,height:1500});
  let schlimm=null;
  for(let i=1;i<=7;i++){
   await reg(page,i);
   const r=await page.evaluate(()=>{
    const w=document.documentElement.clientWidth;
    let max=0, wer="";
    document.querySelectorAll("#kaminAufnahme *").forEach(e=>{
     if(e.closest(".scroll,.eb-diagram-scroll,.ra-register"))return;
     const b=e.getBoundingClientRect();
     if(b.width===0&&b.height===0)return;
     if(b.right>max){max=b.right;wer=(e.id||e.className||e.tagName)}
    });
    return {w,max:Math.round(max),wer,scroll:document.documentElement.scrollWidth>w+1};
   });
   if(r.max>r.w+2||r.scroll){schlimm={i,...r};break}
  }
  p(!schlimm,"Breite "+bw+" px: kein seitlicher Ueberlauf",schlimm);
 }
 await page.setViewportSize({width:412,height:1500});

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log("\npruefstand-kamin-app: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();
