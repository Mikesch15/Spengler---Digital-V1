// Prueft das umgebaute Modul "Einfassung Rund" (js/38) in der laufenden App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-einfassung-app-v2-96.js
//
// Alle Erwartungen sind VON HAND nachgerechnet und stehen als Kommentar dabei -
// sie werden nicht aus dem geprueften Code abgeschrieben.
//
// Von Hand, mit den Einstellungen Umschlag 20, Mass seitlich 100, Latten 330:
//   Gesamtbreite = Durchmesser + 2*20 + 2*100
//     Oe 110 -> 350      Oe 160 -> 400
//   Bleilappen = aufgerundet(pi*Durchmesser / Lattenabstand)
//     Oe 110: pi*110 = 345.58 / 330 = 1.047 -> 2
//     Oe 160: pi*160 = 502.65 / 330 = 1.523 -> 2
//   Flaeche = Summe(Laenge*Breite)/1e6
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};
// Klick ueber evaluate mit Pruefung: ein fehlendes oder gesperrtes Element soll
// sauber fehlschlagen und nicht in einen Timeout laufen - ein abgebrochener
// Pruefstand sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(160); return r;
}
async function tippe(page,sel,text){
 const da=await page.evaluate(s=>{const f=document.querySelector(s);
  if(!f)return false; f.focus(); f.value=""; f.dispatchEvent(new Event("input",{bubbles:true})); return true},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(80);
 return true;
}
const reg=async(page,n)=>{await page.evaluate(k=>einfaSetzeSchritt(k),n);await page.waitForTimeout(180)};
const setz=async(page,o)=>{await page.evaluate(x=>{Object.assign(einfA,x);renderEinfassungAufnahme()},o);
  await page.waitForTimeout(180)};

const FALL={material:"2",deckung:"biber_einfach",lattenabstand:330,rollenAuswahl:[],aktiv:0,
 einfassungen:[{bez:"",durchmesser:110,winkel:30,a:60,b:60,c:100,anzahl:1},
               {bez:"Küche",durchmesser:160,winkel:30,a:70,b:70,c:110,anzahl:2}]};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
   args:["--no-sandbox"]});
 const page=await b.newPage();
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,
   contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
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
  $("measurementEditModal").hidden=false;
  $("measType").value="einfassung_rund"; showMeasTypeSection("einfassung_rund");
 });
 await page.waitForTimeout(400);

 console.log("\nA · Modul geladen, Fachdatei und geteilte Bausteine unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderEinfassungAufnahme==="function",
  zurueck:typeof einfaZuruecksetzen==="function",
  fuellen:typeof einfaFuellen==="function",
  daten:typeof einfaDaten==="function",
  fach:typeof einfBerechnen==="function"&&typeof einfZeichnung==="function",
  pack:typeof ebaPackeInStreifen==="function",
  zuschnitt:typeof zuschnittHtml==="function",
  druck:typeof zuDruckHtml==="function",
  ziel:!!document.getElementById("einfassungAufnahme"),
  stummel:!!document.getElementById("einf_deckung"),
  label:(typeof MEAS_TYPE_LABELS==="object")&&MEAS_TYPE_LABELS.einfassung_rund,
  einst:(typeof MEAS_TYPE_SETTINGS_SECTION==="object")&&MEAS_TYPE_SETTINGS_SECTION.einfassung_rund
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.daten,"js/38 geladen",da);
 p(da.fach,"Fachrechnung aus js/21 vorhanden");
 p(da.pack&&da.zuschnitt&&da.druck,"gemeinsame Bausteine (js/29, js/33) vorhanden",da);
 p(da.ziel,"Container fuer die Aufnahme vorhanden");
 p(da.stummel,"die alten Felder stehen als Stummel bereit (js/21 haengt daran)");
 p(da.label==="Einfassung Rund","Art im Katalog");
 p(da.einst==="einfassung-rund","Einstellungsabschnitt verdrahtet",da.einst);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 console.log("\nB · Sechs Register, nur eines sichtbar");
 const rg=await page.evaluate(()=>({
  namen:[...document.querySelectorAll("#einfa_register .ra-register-knopf")]
    .map(x=>x.innerText.replace(/\s+/g," ").trim()),
  anzahl:EINFA_REGISTER.length, kontrolle:EINFA_KONTROLLE
 }));
 p(rg.anzahl===6,"sechs Register",rg.anzahl);
 p(rg.kontrolle===rg.anzahl,"die Kontrolle ist das letzte Register",rg);
 p(/Grunddaten/.test(rg.namen[0]||""),"Register 1 sind die Grunddaten",rg.namen);
 p(/Zuschnitt/.test(rg.namen[3]||"")&&/Ausmass/.test(rg.namen[4]||"")&&/Kontrolle/.test(rg.namen[5]||""),
   "Abschluss wie ueberall: Zuschnitt, Ausmass, Kontrolle",rg.namen);
 // Jedes Register zeigt NUR seinen eigenen Inhalt: die erste Ueberschrift
 // traegt die eigene Nummer, keine weitere eine fremde.
 let nurEigenes=true, gesehen=[];
 for(let s=1;s<=6;s++){
  await reg(page,s);
  const h=await page.evaluate(()=>[...document.querySelectorAll("#einfassungAufnahme h2")]
    .map(x=>x.innerText.replace(/\s+/g," ").trim()));
  gesehen.push(h);
  if(!h.length||h[0].indexOf(String(s)+" ·")!==0)nurEigenes=false;
  h.slice(1).forEach(t=>{const m=/^(\d+) ·/.exec(t); if(m&&Number(m[1])!==s)nurEigenes=false});
 }
 p(nurEigenes,"jedes Register zeigt nur seinen eigenen Inhalt",gesehen);

 console.log("\nC · Bruecke zur Fachrechnung (kein Nachbau)");
 await setz(page,FALL);
 const br=await page.evaluate(()=>{
  const e=einfaListe()[0];
  return {gleich:JSON.stringify(einfaBerechne(e))===JSON.stringify(einfBerechnen(einfaEingabe(e))),
    erg:einfaBerechne(e)};
 });
 p(br.gleich,"einfaBerechne() liefert Zeichen fuer Zeichen dasselbe wie einfBerechnen()");
 p(br.erg.breiteGesamt===350,"Ø 110 -> Gesamtbreite 350 mm (110 + 2*20 + 2*100)",br.erg.breiteGesamt);
 p(br.erg.anzahlBleilappen===2,"Ø 110 -> 2 Bleilappen (aufgerundet, siehe v2.70)",br.erg.anzahlBleilappen);

 console.log("\nD · Mehrere Einfassungen, Masse eintippen ohne Fokusverlust");
 await reg(page,2);
 const karten=await page.evaluate(()=>document.querySelectorAll("#einfassungAufnahme .card").length);
 p(karten>=2,"zwei Einfassungen als eigene Karten",karten);
 await tippe(page,"#einfa_durchmesser_0","125");
 const fok=await page.evaluate(()=>({id:document.activeElement&&document.activeElement.id,
   wert:($("einfa_durchmesser_0")||{}).value, zustand:einfaListe()[0].durchmesser}));
 p(fok.id==="einfa_durchmesser_0"&&fok.wert==="125","Durchmesser vollstaendig getippt, Fokus bleibt",fok);
 p(String(fok.zustand)==="125","der Wert steht im Zustand",fok);
 // Nach dem Neuzeichnen muss er noch im Feld stehen (die Falle aus v2.93).
 await reg(page,4); await reg(page,2);
 const nachNeu=await page.evaluate(()=>({d:($("einfa_durchmesser_0")||{}).value,
   c:($("einfa_c_1")||{}).value, bez:($("einfa_bez_1")||{}).value}));
 p(nachNeu.d==="125"&&nachNeu.c==="110"&&nachNeu.bez==="Küche",
   "die Masse stehen nach einem Registerwechsel noch in den Feldern",nachNeu);
 await setz(page,FALL);

 console.log("\nD2 · Winkel Dach/Rohr: eingegeben wird der Innenwinkel (ueber 90 Grad)");
 // Von Hand: Dachneigung 30 -> angezeigt 30 + 90 = 120.
 await setz(page,FALL);
 await reg(page,2);
 const wf=await page.evaluate(()=>{
  const f=$("einfa_winkel_0");
  const lab=f?f.closest("div").querySelector("label"):null;
  return {wert:f?f.value:null, label:lab?lab.textContent:"",
    pflicht:f?f.getAttribute("data-pflicht"):null,
    stern:lab?!!lab.querySelector(".pflicht-stern"):false,
    intern:einfaListe()[0].winkel};
 });
 p(wf.wert==="120","Dachneigung 30 wird als 120 angezeigt (30 + 90)",wf);
 p(/Dach\/Rohr/.test(wf.label)&&!/Dachneigung/.test(wf.label),
   "das Feld heisst 'Winkel Dach/Rohr', nicht mehr 'Dachneigung'",wf.label);
 p(wf.pflicht==="1"&&wf.stern,"der Winkel ist ein Pflichtfeld mit rotem Stern",wf);
 p(wf.intern===30,"intern steht weiterhin die Dachneigung",wf);

 const ok115=await tippe(page,"#einfa_winkel_0","115");
 const t115=await page.evaluate(()=>({fokus:document.activeElement&&document.activeElement.id,
   feld:($("einfa_winkel_0")||{}).value, intern:einfaListe()[0].winkel}));
 p(ok115&&t115.fokus==="einfa_winkel_0"&&t115.feld==="115",
   "115 vollstaendig getippt, das Feld behaelt den Fokus",t115);
 p(t115.intern===25,"daraus wird intern die Dachneigung 25",t115);
 await reg(page,4); await reg(page,2);
 const w115=await page.evaluate(()=>($("einfa_winkel_0")||{}).value);
 p(w115==="115","nach einem Registerwechsel stehen weiterhin 115 im Feld",w115);

 // GEMESSEN an der wirklich gezeichneten Geometrie, und zwar ueber das
 // FELD: eingetippt wird der Innenwinkel, gemessen wird danach der Winkel
 // zwischen Dachflaeche und Rohr in der Zeichnung. Rechnet die App nicht um,
 // faellt das hier auf. (Die Abwicklung haengt beim runden Standrohr gar nicht
 // vom Winkel ab - er dreht ausschliesslich die Dachschraege in einfProfil().)
 const messeUeberFeld=async innen=>{
  await tippe(page,"#einfa_winkel_0",String(innen));
  return await page.evaluate(()=>{
   const e=einfaListe()[0];
   const pr=einfProfil({a:e.a,b:e.b,c:e.c,winkel:e.winkel});
   // Strecke a laeuft bergwaerts in der Dachschraege.
   const dx=pr.pts[2][0]-pr.pts[1][0], dy=pr.pts[2][1]-pr.pts[1][1];
   const len=Math.hypot(dx,dy);
   return {intern:e.winkel,
     dach:Math.round(Math.atan2(dy,dx)*180/Math.PI*1000)/1000,
     // Das Rohr steht im Lot. Gemessen wird auf der TALSEITE, also zwischen
     // der talwaerts zeigenden Dachrichtung und dem Rohr nach oben (0,1).
     gemessen:Math.round(Math.acos((-dy)/len)*180/Math.PI*1000)/1000};
  });
 };
 const g115=await messeUeberFeld(115);
 p(Math.abs(g115.gemessen-115)<0.01,
   "eingetippte 115 sind wirklich der Winkel zwischen Dachflaeche und Rohr",g115);
 p(Math.abs(g115.dach-25)<0.01,"das entspricht einem 25-Grad-Dach",g115);
 const g130=await messeUeberFeld(130);
 p(Math.abs(g130.gemessen-130)<0.01&&Math.abs(g130.dach-40)<0.01,"130 -> 40-Grad-Dach",g130);
 const g95=await messeUeberFeld(95);
 p(Math.abs(g95.gemessen-95)<0.01&&Math.abs(g95.dach-5)<0.01,"95 -> 5-Grad-Dach",g95);
 await setz(page,FALL);
 await reg(page,2);

 // Kontrolle: leer, zu klein, zu gross, genau 90.
 const wk=await page.evaluate(()=>{
  const e=einfaListe()[0]; const alt=e.winkel;
  const nimm=v=>{e.winkel=v;return einfaPruefungen()};
  const r={leer:nimm(""), klein:nimm(-45), gross:nimm(110), neunzig:nimm(0), gut:nimm(25)};
  e.winkel=alt;
  return {leer:r.leer.map(x=>x.art+":"+x.text), klein:r.klein.map(x=>x.art+":"+x.text),
    gross:r.gross.map(x=>x.art+":"+x.text), neunzig:r.neunzig.map(x=>x.art+":"+x.text),
    gut:r.gut.filter(x=>/Winkel/.test(x.text)).map(x=>x.art+":"+x.text)};
 });
 p(wk.leer.some(x=>/^fehler.*Winkel zwischen Dachfl/.test(x)),
   "ein leerer Winkel ist ein Fehler",wk.leer);
 p(wk.klein.some(x=>/^fehler.*Winkel zwischen Dachfl.*zwischen 90/.test(x)),
   "ein Winkel unter 90 Grad ist ein Fehler (hier 45)",wk.klein);
 p(wk.gross.some(x=>/^fehler.*180/.test(x)),
   "ein Winkel ab 180 Grad ist ein Fehler (hier 200)",wk.gross);
 p(wk.neunzig.some(x=>/^warnung.*waagerecht/.test(x)),
   "genau 90 Grad ist ein waagerechtes Dach - eine Warnung",wk.neunzig);
 p(wk.gut.length===0,"115 Grad meldet nichts",wk.gut);
 // Der Winkel darf nicht zusaetzlich als "negatives Mass" gemeldet werden.
 p(!wk.klein.some(x=>/negativ/.test(x)),
   "ein falscher Winkel meldet nicht zusaetzlich 'Ein Mass ist negativ'",wk.klein);

 // Gespeichert wird unveraendert die Dachneigung - ein Datensatz bis v2.96
 // oeffnet damit ohne jede Umrechnung und zeigt seinen Winkel als Innenwinkel.
 const wsp=await page.evaluate(()=>{
  einfaListe()[0].winkel=25;
  const d=einfaDaten();
  einfaFuellen({material:"2",deckung:"biber_einfach",lattenabstand:330,
    durchmesser:200,winkel:25,a:80,b:80,c:120});
  return {gespeichert:d.winkel, liste0:d.einfassungen[0].winkel,
    altIntern:einfaListe()[0].winkel, altFeld:null};
 });
 p(wsp.gespeichert===25&&wsp.liste0===25,
   "gespeichert wird die Dachneigung 25 (Superset unveraendert)",wsp);
 p(wsp.altIntern===25,"ein Datensatz bis v2.96 wird nicht umgerechnet",wsp);
 await reg(page,2);
 const altFeld=await page.evaluate(()=>($("einfa_winkel_0")||{}).value);
 p(altFeld==="115","und zeigt seine 25 Grad als 115 Grad im Feld",altFeld);
 await setz(page,FALL);

 console.log("\nE · Zuschnitte und Stueckliste (von Hand nachgerechnet)");
 const zu=await page.evaluate(()=>einfaZuschnitte().map(x=>({nr:x.nr,l:x.laenge,b:x.breite,h:x.hinweis})));
 p(zu.length===3,"drei Zuschnitte (1x Ø110, 2x Ø160)",zu.length);
 // Indexzugriffe abgesichert: ein abgebrochener Pruefstand sieht aus wie
 // "keine Fehler" - eine Gegenprobe muss fehlschlagen, nicht abstuerzen.
 const z0=zu[0]||{}, z1=zu[1]||{}, z2=zu[2]||{};
 p(z0.l===350,"Zuschnitt 1 ist 350 mm lang",z0);
 p(z1.l===400&&z2.l===400,"die beiden Ø160 sind je 400 mm lang",zu);
 p(z1.h==="Küche"&&z2.h==="Küche","die Bezeichnung reist als Hinweis mit",z1);
 const flaeche=await page.evaluate(()=>Number(einfaFlaecheM2().toFixed(4)));
 const soll=Number(((350*(z0.b||0)+2*(400*(z1.b||0)))/1e6).toFixed(4));
 p(Math.abs(flaeche-soll)<1e-6,"Blechflaeche = Summe(Laenge x Breite)",{flaeche,soll});
 const bl=await page.evaluate(()=>einfaBleilappenGesamt());
 p(bl===6,"Bleilappen gesamt 6 (2 + 2*2)",bl);

 console.log("\nF · Zuschnitt aus Rollenblech (gemeinsame Packrechnung)");
 await reg(page,4);
 const rp=await page.evaluate(()=>{
  const plan=einfaRollenPlan();
  return {bestes:plan.bestes?plan.bestes.breite:null,
    gruppen:plan.gruppen.map(g=>({breite:g.breite,streifen:g.streifen.length,abschnitt:g.abschnittLaenge})),
    netto:Number(plan.netto.toFixed(4)),
    moeglich:plan.moeglich.map(m=>m.breite)};
 });
 p(rp.gruppen.length===2,"zwei Streifenbreiten (zwei Abwicklungen)",rp.gruppen);
 p(rp.bestes!==null,"eine Rollenbreite passt",rp);
 // Der Plan muss WIRKLICH aus der gemeinsamen Packrechnung kommen.
 const gemeinsam=await page.evaluate(()=>{
  const alt=window.ebaPackeInStreifen; let gerufen=0;
  window.ebaPackeInStreifen=function(){gerufen++;return alt.apply(this,arguments)};
  einfaRollenPlan();
  window.ebaPackeInStreifen=alt;
  return gerufen;
 });
 p(gemeinsam>0,"ebaPackeInStreifen (js/29) wird wirklich gerufen",gemeinsam);
 const dar=await page.evaluate(()=>{
  const el=document.getElementById("einfassungAufnahme");
  return {gemeinsam:/zu-details|Einzelheiten/.test(el.innerHTML),
    eigeneTabelle:/<table[^>]*class="[^"]*eb-table[^"]*"[^>]*>[\s\S]{0,400}Rollenbreite/.test(el.innerHTML)};
 });
 p(dar.gemeinsam,"die gemeinsame Darstellung aus js/33 wird verwendet",dar);
 p(!dar.eigeneTabelle,"keine eigene Rollenblech-Tabelle",dar);

 console.log("\nG · Ausmass");
 await reg(page,5);
 const am=await page.evaluate(()=>({zeilen:einfaAusmassZeilen(),
   // NUR die Tabellenzeilen - der eigene Infotext nennt das Wort "Preise"
   // selbst (dieselbe Falle wie in CLAUDE.md 91.6).
   html:[...document.querySelectorAll("#einfassungAufnahme table tr")]
     .map(t=>t.innerText).join(" ")}));
 p(am.zeilen.length>=4,"das Ausmass entsteht aus der Aufnahme",am.zeilen.length);
 p(am.zeilen.some(z=>/Blechfläche/.test(z.bezeichnung)),"Blechflaeche im Ausmass");
 p(am.zeilen.some(z=>/Bleilappen/.test(z.bezeichnung)),"Bleilappen im Ausmass");
 p(!/Preis|Artikel|Fr\./.test(am.html),"ohne Artikelnummern und ohne Preise");

 console.log("\nH · Kontrolle");
 const k1=await page.evaluate(()=>einfaPruefungen());
 p(k1.filter(x=>x.art==="fehler").length===0,"vollstaendige Aufnahme: kein Fehler",k1);
 const k2=await page.evaluate(()=>{
  const alt=einfaListe()[0].durchmesser; einfaListe()[0].durchmesser=0;
  const m=einfaPruefungen(); einfaListe()[0].durchmesser=alt; return m;
 });
 p(k2.some(x=>x.art==="fehler"&&/Rohrdurchmesser/.test(x.text)),"fehlender Durchmesser ist ein Fehler",k2.map(x=>x.text));
 const k3=await page.evaluate(()=>{
  const alt=einfA.lattenabstand; einfA.lattenabstand=0;
  const m=einfaPruefungen(); einfA.lattenabstand=alt; return m;
 });
 p(k3.some(x=>x.art==="warnung"&&/Lattenabstand/.test(x.text)),"fehlender Lattenabstand ist eine Warnung",k3.map(x=>x.text));
 await reg(page,6);
 const marke=await page.evaluate(()=>{
  einfaListe()[0].a=0; einfaLive();
  const el=document.querySelector('#einfa_register [data-einfa-schritt="'+EINFA_KONTROLLE+'"] .ra-register-punkt');
  const rot=el?el.className.indexOf("fehler")>=0:false;
  einfaListe()[0].a=60; einfaLive();
  return {da:!!el,rot};
 });
 p(marke.da&&marke.rot,"das Kontroll-Register bekommt bei einem Fehler eine rote Marke",marke);

 console.log("\nI · Speichern und Wiederoeffnen");
 await setz(page,FALL);
 const sp=await page.evaluate(()=>{
  $("measTitle").value="Dunstrohre"; $("measDate").value="2026-09-05";
  setMeasProjectField(7);
  const m=buildMeasurementFromForm();
  return {typ:m.type,d:m.data};
 });
 p(sp.typ==="einfassung_rund","Typ im Payload",sp.typ);
 // SUPERSET: die Felder bis v2.95 bleiben erhalten (erste Einfassung).
 p(sp.d.durchmesser===110&&sp.d.a===60&&sp.d.c===100&&sp.d.abwicklung>0
   &&sp.d.breiteGesamt===350&&sp.d.anzahlBleilappen===2,
   "die Felder bis v2.95 stehen weiterhin im Payload (erste Einfassung)",sp.d);
 p(Array.isArray(sp.d.einfassungen)&&sp.d.einfassungen.length===2,"beide Einfassungen gespeichert",
   (sp.d.einfassungen||[]).length);
 p(sp.d.einfassungen[1].anzahl===2&&sp.d.einfassungen[1].bez==="Küche","Stueckzahl und Bezeichnung gespeichert",sp.d.einfassungen[1]);
 p(Array.isArray(sp.d.zuschnitte)&&sp.d.zuschnitte.length===3,"Zuschnitte gespeichert",(sp.d.zuschnitte||[]).length);
 p(sp.d.bleilappenGesamt===6&&typeof sp.d.flaeche_m2==="number","Bleilappen und Flaeche gespeichert",sp.d);
 p(Array.isArray(sp.d.ausmass)&&sp.d.ausmass.length>0,"Ausmass gespeichert");
 p(sp.d.rollen&&Array.isArray(sp.d.rollen.gruppen),"Rollenblech-Plan gespeichert");
 const wieder=await page.evaluate(d=>{
  einfaFuellen(d);
  return {n:einfaListe().length,d0:einfaListe()[0].durchmesser,bez1:einfaListe()[1].bez,
    anz1:einfaListe()[1].anzahl,schritt:einfaSchritt,
    teile:einfaZuschnitte().map(x=>x.laenge+"x"+x.breite)};
 },sp.d);
 const gesp=sp.d.zuschnitte.map(x=>x.laenge+"x"+x.breite);
 p(wieder.n===2&&wieder.d0===110&&wieder.bez1==="Küche"&&wieder.anz1===2,
   "Wiederoeffnen stellt den Stand her",wieder);
 p(JSON.stringify(wieder.teile)===JSON.stringify(gesp),"dieselben Zuschnitte nach dem Wiederoeffnen",
   {gesp,neu:wieder.teile});
 p(wieder.schritt===1,"nach dem Oeffnen beginnt es bei Register 1");

 console.log("\nJ · Ein Datensatz bis v2.95 oeffnet unveraendert");
 // Das alte Format hatte nur die flachen Felder und KEINE Liste.
 const alt=await page.evaluate(()=>{
  einfaFuellen({material:"2",deckung:"biber_einfach",lattenabstand:330,
    durchmesser:200,winkel:25,a:80,b:80,c:120,
    abwicklung:0,breiteGesamt:null,anzahlBleilappen:null});
  const e=einfaListe()[0];
  const erg=einfaBerechne(e);
  return {n:einfaListe().length,d:e.durchmesser,a:e.a,c:e.c,anzahl:e.anzahl,
    breite:erg.breiteGesamt,lappen:erg.anzahlBleilappen};
 });
 p(alt.n===1&&alt.d===200&&alt.a===80&&alt.c===120,"eine Einfassung aus den flachen Feldern",alt);
 p(alt.anzahl===1,"Stueckzahl 1 - es wird nichts erfunden",alt);
 // Von Hand: 200 + 2*20 + 2*100 = 440; pi*200/330 = 1.904 -> 2
 p(alt.breite===440,"Gesamtbreite 440 mm (200 + 2*20 + 2*100)",alt.breite);
 p(alt.lappen===2,"2 Bleilappen (pi*200/330 = 1.90, aufgerundet)",alt.lappen);

 console.log("\nK · Fotos erst nach 'Fertig'");
 await setz(page,FALL);
 await reg(page,1);
 const m1=await page.evaluate(()=>{const e=$("measMedienBereich");
   const cs=getComputedStyle(e);return {hidden:e.hidden,display:cs.display,h:e.getBoundingClientRect().height}});
 p(m1.hidden||m1.display==="none"||m1.h<2,"waehrend der Register ist der Fotobereich zu",m1);
 await reg(page,6);
 const rk=await klick(page,"#einfa_weiter");
 await page.waitForTimeout(300);
 const m2=await page.evaluate(()=>{const e=$("measMedienBereich");
   const cs=getComputedStyle(e);return {hidden:e.hidden,display:cs.display,h:e.getBoundingClientRect().height}});
 p(rk==="ok","der Fertig-Knopf ist bedienbar",rk);
 p(!m2.hidden&&m2.display!=="none"&&m2.h>2,"nach 'Fertig' ist der Fotobereich offen",m2);

 console.log("\nL · Druck");
 await setz(page,FALL);
 const dr=await page.evaluate(async()=>{
  window.__html=null;
  const alt=window.open;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){},closed:false});
  await printMeasurement({type:"einfassung_rund",title:"Dunstrohre",date:"2026-09-05",
    data:einfaDaten(),project_id:7},{listen:"alle"});
  window.open=alt;
  return window.__html||"";
 });
 p(dr.length>500,"das PDF wird erzeugt",dr.length);
 p(dr.indexOf("Bahnhofstrasse 12, 3011 Bern")>=0,"Objektadresse als Haupttitel");
 p(/Stückliste/.test(dr),"Stueckliste im PDF");
 p(/Zuschnitt aus Rollenblech/.test(dr),"Rollenblech im PDF");
 p(/Ausmass/.test(dr),"Ausmass im PDF");
 p(/<div class="eb-section-head">Schnitt<\/div>/.test(dr)&&/<svg/.test(dr),"Schnittzeichnung im PDF");
 // pdfLxB() schreibt "400 × 308"; die Einheit steht im Spaltenkopf "(mm)".
 p(/400\s*(&#215;|×)\s*308/.test(dr)&&/Zuschnitt L (&#215;|×) B \(mm\)/.test(dr),
   "Zuschnitt als L × B im PDF",(dr.match(/.{0,50}(×|&#215;) 308.{0,20}/)||[""])[0]);
 p(!/NaN|undefined/.test(dr),"kein NaN im PDF");
 // Der Winkel wird auch im PDF als Innenwinkel Dach/Rohr gezeigt (30 + 90).
 p(/Winkel Dach\/Rohr/.test(dr)&&!/Winkel \/ Dachneigung/.test(dr),
   "das PDF nennt den Winkel Dach/Rohr",(dr.match(/.{0,40}Winkel.{0,60}/)||[""])[0]);
 p(/Winkel Dach\/Rohr[\s\S]{0,120}?120\s*(&#176;|°)/.test(dr),
   "und zeigt 120 Grad (Dachneigung 30 + 90)",(dr.match(/Winkel Dach.{0,120}/)||[""])[0]);
 // Ein Datensatz bis v2.95 muss weiterhin drucken - ohne die neuen Abschnitte.
 const drAlt=await page.evaluate(async()=>{
  window.__html=null;
  const alt=window.open;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){},closed:false});
  await printMeasurement({type:"einfassung_rund",title:"Alt",date:"2026-09-05",
    data:{material:"2",deckung:"biber_einfach",lattenabstand:330,durchmesser:200,
      winkel:25,a:80,b:80,c:120,abwicklung:300,breiteGesamt:440,anzahlBleilappen:2},
    project_id:null},{listen:"alle"});
  window.open=alt;
  return window.__html||"";
 });
 p(drAlt.length>400&&!/NaN|undefined/.test(drAlt),"ein Datensatz bis v2.95 druckt unveraendert",drAlt.length);
 p(drAlt.indexOf("440")>=0,"und zeigt seine eigenen Werte",(drAlt.match(/.{0,40}440.{0,20}/)||[""])[0]);
 // Sein gespeicherter Winkel ist die Dachneigung 25 - gedruckt wird 115.
 p(/Winkel Dach\/Rohr[\s\S]{0,120}?115\s*(&#176;|°)/.test(drAlt),
   "ein alter Datensatz druckt seine 25 Grad als 115 Grad",(drAlt.match(/Winkel Dach.{0,120}/)||[""])[0]);

 console.log("\nM · Mobil: nichts laeuft seitlich hinaus");
 await setz(page,FALL);
 for(const bw of [320,360,390,412,768]){
  await page.setViewportSize({width:bw,height:1500});
  let schlimm=null;
  for(let i=1;i<=6;i++){
   await reg(page,i);
   const r=await page.evaluate(()=>{
    const w=document.documentElement.clientWidth;
    let max=0, wer="";
    // .scroll, .eb-diagram-scroll und .ra-register scrollen bewusst seitwaerts.
    document.querySelectorAll("#einfassungAufnahme *").forEach(e=>{
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
 await page.setViewportSize({width:1280,height:900});

 console.log("\nN · Eine Bezeichnung ist Benutzertext und darf nie Markup werden");
 // Die Bezeichnung reist bis in die Zuschnittliste, das Ausmass und den
 // Ausdruck. Geprueft wird nicht "es steht esc() im Code", sondern dass an
 // KEINER dieser Stellen ein echtes Element daraus entsteht.
 await setz(page,{...FALL,einfassungen:[
   {bez:'<img src=x onerror=alert(1)>',durchmesser:110,winkel:30,a:60,b:60,c:100,anzahl:1}]});
 for(const [nr,name] of [[2,"Einfassungen"],[3,"Stückliste"],[4,"Zuschnitt"],[5,"Ausmass"]]){
  await reg(page,nr);
  const r=await page.evaluate(()=>({
    img:document.querySelectorAll("#einfassungAufnahme img[src='x']").length,
    text:$("einfassungAufnahme").textContent.indexOf("onerror")>=0}));
  p(r.img===0&&r.text,name+": die Bezeichnung steht als Text, nicht als Markup",r);
 }
 const druckXss=await page.evaluate(async()=>{
  let html=""; const alt=window.open;
  window.open=()=>({document:{write:t=>{html+=t},close(){}},focus(){},print(){},close(){}});
  try{ await printMeasurement({type:"einfassung_rund",title:"x",date:"2026-09-05",
    data:einfaDaten()},{listen:"alle"}); }catch(e){}
  window.open=alt;
  const d=document.implementation.createHTMLDocument(""); d.body.innerHTML=html;
  return {img:d.querySelectorAll("img[src='x']").length,
    text:d.body.textContent.indexOf("onerror")>=0};
 });
 p(druckXss.img===0&&druckXss.text,"Ausdruck: die Bezeichnung steht als Text, nicht als Markup",druckXss);
 await setz(page,FALL);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log("\npruefstand-einfassung-app: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();
