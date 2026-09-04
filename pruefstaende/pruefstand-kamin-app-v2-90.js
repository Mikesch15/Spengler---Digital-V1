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
// Von Hand: cos(25 Grad)=0.9063077870; 400/0.9063077870 = 441.3534
//  Vorderteil   900 x (20+300+441.3534) = 900 x 761
//  Hinterteil   900 x (20+60+250+80+441.3534) = 900 x 851
//  Seitenteile  500/400 x (20+100+150+400) = x 670
//  Kaminlaenge  500+400-120 = 780
//  Flaeche  (900*761 + 900*851 + 2*(500*670) + 2*(400*670)) / 1e6 = 2.6568
//  Bleilappen  ceil(500/330)=2, ceil(400/330)=2, je Seite -> 8

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
 p(z.teile[1].name==="Hinterteil"&&z.teile[1].l===900&&z.teile[1].br===851,
   "Hinterteil 900 × 851 (20 + 60 + 250 + 80 + 400/cos25) — E ist enthalten",z.teile[1]);
 p(z.teile[2].name==="Seitenteil vorne"&&z.teile[2].seite==="links"&&z.teile[2].l===500&&z.teile[2].br===670,
   "Seitenteil vorne links 500 × 670 (B als Laenge)",z.teile[2]);
 p(z.teile[3].name==="Seitenteil hinten"&&z.teile[3].l===400&&z.teile[3].br===670,
   "Seitenteil hinten links 400 × 670 (C als Laenge)",z.teile[3]);
 p(z.teile[4].seite==="rechts"&&z.teile[5].seite==="rechts","je ein Seitenteil vorne und hinten rechts",
   [z.teile[4],z.teile[5]]);
 p(Math.abs(z.flaeche-2.6568)<1e-4,"Blechflaeche 2.6568 m²",z.flaeche);
 // Der Winkel muss wirklich wirken: ohne Winkel waere die Abwicklung 720.
 const ohneW=await page.evaluate(()=>{const alt=kamA.winkelVorne;kamA.winkelVorne=0;
   const b=kamaZuschnitte()[0].breite;kamA.winkelVorne=alt;return b});
 p(ohneW===720,"ohne Winkel vorne waere die Abwicklung 720 — der Winkel wirkt",ohneW);

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
 // Gruppen nach Abwicklung: 851 (1 Stueck, L=900), 761 (1, L=900), 670 (4, L=500)
 // 670er Gruppe: 500+400 > 500, also 4 Streifen a 500.
 // Rolle 1000: je Gruppe 1 Streifen nebeneinander -> 900 + 900 + 4*500 = 3800 mm
 //   Flaeche = 1000 * 3800 / 1e6 = 3.8
 // Rolle 670 ist schmaler als 851 -> faellt weg.
 p(JSON.stringify(rp.breiten)==="[851,761,670]","drei Streifenbreiten, breiteste zuerst",rp.breiten);
 p(JSON.stringify(rp.streifen)==="[1,1,4]","die 670er Gruppe braucht 4 Streifen",rp.streifen);
 p(JSON.stringify(rp.abschnitt)==="[900,900,500]","Abschnitt = laengstes Stueck der Gruppe",rp.abschnitt);
 p(rp.best&&rp.best.breite===1000&&Math.abs(rp.best.flaeche-3.8)<1e-4,"beste Rolle 1000 mm, 3.8 m²",rp.best);
 p(rp.zuSchmal.indexOf(670)>=0,"670 mm ist zu schmal fuer die 851er Abwicklung",rp.zuSchmal);
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
