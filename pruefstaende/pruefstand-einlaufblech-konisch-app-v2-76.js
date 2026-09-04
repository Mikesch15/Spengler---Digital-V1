// Prueft den Einbau der Einlaufblech-konisch-Aufnahme in die laufende App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht), die Kataloge werden mit den
// echten Werten der Produktivdatenbank gestellt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-einlaufblech-konisch-app-v2-76.js
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
const reg=async(page,n)=>{await page.evaluate(k=>ebkaSetzeSchritt(k),n);await page.waitForTimeout(150)};

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
  measurementMaterials=[
   {id:3,name:"Kupfer"},{id:2,name:"Titanzink"},{id:6,name:"Stahl, verzinkt"}];
  blechRollenbreiten=[];
  einlaufblechKonischSettings={stoss_laenge:2000,ueberlappung:70,gehrungszugabe:100,
    umschlag_oben:12,umschlag_unten:12,rest_schwelle:500,end_zugabe:10};
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
 });

 console.log("\nA · Modul geladen, Fachdateien unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderEinlaufblechKonischAufnahme==="function",
  zurueck:typeof ebkaZuruecksetzen==="function",
  fuellen:typeof ebkaFuellen==="function",
  zusatz:typeof ebkaZusatzDaten==="function",
  // Der Rechenkern des konischen Blechs liegt in js/14, nicht in js/13.
  calc:typeof calcEbkPiece==="function",
  rest:typeof ebkRestbreite==="function",
  eng:typeof ebkEngeSeite==="function",
  liste:typeof renderEbkPiecesTable==="function",
  // gemeinsame Bausteine aus js/13
  split:typeof splitLengthIntoPieces==="function",
  grundriss:typeof generateEbkGrundriss==="function",
  rinne:typeof baueEinlaufblechStueckeAusRinne==="function",
  // Schnittzeichnung aus js/11
  diagramm:typeof einlaufblechDiagramSvg==="function",
  stummel:!!document.getElementById("ebk_piecesBody"),
  ziel:!!document.getElementById("einlaufblechKonischAufnahme"),
  rinneBox:!!document.getElementById("ebk_rinneList")
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.zusatz,"js/30 geladen",da);
 p(da.calc&&da.rest&&da.eng&&da.liste,"js/14 unveraendert geladen (Rechenkern)",da);
 p(da.split&&da.grundriss&&da.rinne,"js/13 unveraendert geladen (gemeinsame Bausteine)",da);
 p(da.diagramm,"js/11 unveraendert geladen (Schnittzeichnung)",da);
 p(da.stummel,"Stummel fuer js/14 vorhanden");
 p(da.ziel,"Container fuer die Aufnahme vorhanden");
 p(da.rinneBox,"Rinnen-Uebernahme steht fest im HTML (Handler von js/14)");
 // Zwei Rechenproben direkt gegen js/14
 const kern=await page.evaluate(()=>({
  eng:calcEbkPiece({massLinks:120,massRechts:150}),
  rest:ebkRestbreite(120,330)
 }));
 p(kern.eng.massLinksEng===118&&kern.eng.massRechtsEng===148,
   "calcEbkPiece: enges Mass = Mass − 2 je Seite",kern.eng);
 p(kern.rest===330-120-12-12,"ebkRestbreite: Abwicklung − Mass − beide Umschlaege",kern.rest);

 console.log("\nB · Sechs Register, nur eines sichtbar");
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  $("measType").value="einlaufblech_konisch";
  showMeasTypeSection("einlaufblech_konisch");
 });
 await page.waitForTimeout(250);
 const reg1=await page.evaluate(()=>({
  knoepfe:document.querySelectorAll("#ebka_register .ra-register-knopf").length,
  aktiv:document.querySelectorAll("#ebka_register .ra-register-knopf.aktiv").length
 }));
 p(reg1.knoepfe===6,"sechs Register",reg1.knoepfe);
 p(reg1.aktiv===1,"genau eines ist aktiv",reg1.aktiv);
 // Eigenschaft statt Zahl: die erste Ueberschrift traegt die eigene
 // Registernummer, keine weitere traegt eine fremde.
 const fremd=n=>page.evaluate(k=>{
  const h=Array.from(document.querySelectorAll("#einlaufblechKonischAufnahme h2")).map(x=>x.textContent.trim());
  return {erste:h[0]||"", fremde:h.filter(t=>/^[1-6] ·/.test(t)&&!t.startsWith(k+" ·")).length};
 },n);
 let allefremd=0, ersteOk=0;
 for(let n=1;n<=6;n++){await reg(page,n); const f=await fremd(n); allefremd+=f.fremde; if(f.erste.startsWith(n+" ·"))ersteOk++;}
 p(ersteOk===6,"jedes Register zeigt seine eigene Ueberschrift",ersteOk);
 p(allefremd===0,"und keine fremde Registernummer",allefremd);

 console.log("\nC · Bruecke zu js/13 und js/14");
 await reg(page,1);
 await page.evaluate(()=>{
  ebkA.material="2"; ebkA.abwicklung=330; ebkA.montage="rechts"; ebkA.dachneigung=25;
  ebkA.stuecke=[{laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:120,massRechts:150},
                {laenge:1450,stossStoss:1450,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:150,massRechts:170}];
  renderEinlaufblechKonischAufnahme();
 });
 const br=await page.evaluate(()=>{
  ebkaBruecke();
  return {pieces:ebkPieces.length, gleich:ebkPieces===ebkA.stuecke,
          neig:$("ebk_dachneigung").value, abw:$("ebk_abwicklung").value,
          mon:$("ebk_montage").value, mat:$("ebk_material").value,
          engApp:ebkEngeSeite(), engEigen:ebkaEngeSeite(),
          restApp:ebkRestbreite(120,330), restEigen:ebkaRestbreite(ebkA.stuecke[0])};
 });
 p(br.pieces===2&&br.gleich,"ebkPieces ist dasselbe Array wie ebkA.stuecke",br);
 p(br.neig==="25"&&br.abw==="330"&&br.mon==="rechts"&&br.mat==="2",
   "die alten Formularfelder werden gesetzt",br);
 // Montage "rechts" -> enge Seite "links"
 p(br.engApp==="links"&&br.engEigen==="links","enge Seite kommt aus js/14",br);
 p(br.restApp===186&&br.restEigen===186,"Restbreite kommt aus js/14",br);

 console.log("\nD · Geometrie: mittleres Mass und Zeichnung");
 await reg(page,2);
 const geo=await page.evaluate(()=>({
  rep:$("ebka_wRep").textContent, rest:$("ebka_wRest").textContent,
  // Rohwerte, damit der Pruefstand unabhaengig nachrechnet
  ml:ebkA.stuecke.map(x=>x.massLinks), mr:ebkA.stuecke.map(x=>x.massRechts),
  wert:ebkaRepMass(),
  svg:($("ebka_schnitt").innerHTML.match(/<svg/g)||[]).length,
  nan:/NaN|Infinity|undefined/.test($("einlaufblechKonischAufnahme").innerHTML)
 }));
 const mittel=a=>a.filter(v=>v>0).reduce((x,y)=>x+y,0)/a.filter(v=>v>0).length;
 // Wie renderEbkDiagram() in js/14: Mittelwert der Masse auf der ENGEN Seite.
 p(Math.abs(geo.wert-mittel(geo.ml))<1e-9,"mittleres Mass = Mittel der engen Seite",
   {wert:geo.wert,links:geo.ml});
 p(Math.abs(geo.wert-mittel(geo.mr))>1e-9,"und zwar auf der engen, nicht der breiten Seite",
   {wert:geo.wert,rechts:mittel(geo.mr)});
 p(geo.svg===1,"Schnittzeichnung aus js/11",geo.svg);
 p(!geo.nan,"kein NaN im Register");

 console.log("\nE · Stuecke: linkes und rechtes Mass, Verkettung");
 await reg(page,3);
 const st=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#einlaufblechKonischAufnahme [data-ebka-laenge]").length,
  laenge:$("ebka_wLaenge").textContent,
  grundriss:($("ebka_grundriss").innerHTML.match(/<svg/g)||[]).length,
  konus:document.querySelectorAll("#einlaufblechKonischAufnahme .ebka-konus svg").length
 }));
 p(st.zeilen===2,"beide Stuecke in der Liste",st.zeilen);
 p(st.laenge.replace(/[\s'’]/g,"")==="3520mm","Gesamtlaenge aus den Stuecken",st.laenge);
 p(st.grundriss===1,"Grundriss aus js/13",st.grundriss);
 p(st.konus===2,"je Stueck eine Skizze, wo die Masse gemessen werden",st.konus);
 // linkes Mass tippen: der Wert kommt vollstaendig an und das Feld behaelt den Fokus
 await tippe(page,'[data-ebka-ml="0"]',"140");
 const links=await page.evaluate(()=>({
  wert:ebkA.stuecke[0].massLinks,
  fokus:document.activeElement&&document.activeElement.dataset.ebkaMl==="0",
  eng:ebkaEngesMass(ebkA.stuecke[0]), rest:ebkaRestbreite(ebkA.stuecke[0]),
  kon:ebkaKonizitaet(ebkA.stuecke[0])
 }));
 p(links.wert===140,"linkes Mass vollstaendig getippt",links.wert);
 p(links.fokus,"das Feld behaelt den Fokus",links);
 p(links.eng===138,"enges Mass folgt der engen Seite (links)",links.eng);
 p(links.rest===330-140-24,"Restbreite folgt mit",links.rest);
 p(links.kon===10,"Konizitaet = rechts − links",links.kon);
 // rechtes Mass tippen: wird zum linken des naechsten Stuecks
 await tippe(page,'[data-ebka-mr="0"]',"165");
 const rechts=await page.evaluate(()=>({
  eigen:ebkA.stuecke[0].massRechts,
  naechstes:ebkA.stuecke[1]?ebkA.stuecke[1].massLinks:null,
  feld:(document.querySelector('[data-ebka-ml="1"]')||{}).value,
  fokus:document.activeElement&&document.activeElement.dataset.ebkaMr==="0"
 }));
 p(rechts.eigen===165,"rechtes Mass gesetzt",rechts.eigen);
 p(rechts.naechstes===165,"wird zum linken Mass des naechsten Stuecks",rechts);
 p(rechts.feld==="165","und steht sichtbar im Feld",rechts.feld);
 p(rechts.fokus,"ohne den Fokus zu verlieren",rechts);
 const frei=await page.evaluate(()=>{
  if(!ebkA.stuecke[1])return "kein zweites Stueck";
  ebkA.stuecke[1].massLinks=170; renderEinlaufblechKonischAufnahme();
  return ebkA.stuecke[1].massLinks;
 });
 p(frei===170,"danach ist der Wert frei ueberschreibbar",frei);

 console.log("\nF · Gehrung und Endzugabe");
 const geh=await page.evaluate(()=>{
  const vor=ebkA.stuecke.map(x=>x.laenge).join();
  const k=document.querySelector('[data-ebka-gr="0"]');
  if(!k)return {fehlt:true};
  k.checked=true; k.dispatchEvent(new Event("change",{bubbles:true}));
  return {vor,nach:ebkA.stuecke.map(x=>x.laenge).join(),
          winkel:ebkA.stuecke[0].winkel, nachbar:!!ebkA.stuecke[1].gehrungLinks};
 });
 await page.waitForTimeout(200);
 // Gehrungszugabe 100 auf die Laenge, Winkel 90 - Regel aus js/14.
 // Anders als beim geraden Blech wird das Nachbarstueck NICHT mitgesetzt.
 p(geh.nach==="2170,1450"&&geh.winkel===90,"Gehrung setzt Zugabe und Winkel",geh);
 p(geh.nachbar===false,"das Nachbarstueck bleibt unberuehrt (wie im konischen Modul)",geh);
 const ez=await page.evaluate(()=>{
  document.getElementById("ebka_endEnde").click();
  return {laenge:ebkA.stuecke[1].laenge, flag:ebkA.stuecke[1].endzugabeEnd};
 });
 await page.waitForTimeout(150);
 p(ez.laenge===1460&&ez.flag===10,"Endzugabe auf das Reststueck",ez);

 console.log("\nG · Stuecke aus Gesamtlaenge (Weg, den das alte Formular nicht hatte)");
 const auf=await page.evaluate(()=>{
  ebkA.gesamtlaenge=5000; ebkA.stuecke=[];
  renderEinlaufblechKonischAufnahme();
  document.getElementById("ebka_neuAusGesamt").click();
  return {stuecke:ebkA.stuecke.map(x=>x.laenge),
          soll:splitLengthIntoPieces(5000)};
 });
 await page.waitForTimeout(200);
 p(auf.stuecke.join()===auf.soll.join(),
   "Aufteilung kommt aus splitLengthIntoPieces() der App",auf);
 // Fuer die weiteren Abschnitte wieder der Zwei-Stueck-Stand
 await page.evaluate(()=>{
  ebkA.stuecke=[{laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:140,massRechts:165},
                {laenge:1450,stossStoss:1450,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:165,massRechts:170}];
  renderEinlaufblechKonischAufnahme();
 });

 console.log("\nH · Flaeche und Rollenblech");
 // Seit v2.80 steht der Zuschnitt in ALLEN Arten auf Register 4, die
 // Kontrolle immer zuletzt.
 await reg(page,4);
 const roll=await page.evaluate(()=>{
  const plan=ebkaRollenPlan();
  return {flaeche:ebkaFlaecheM2(),
          breiten:ebaRollenbreiten(),
          bestes:plan.bestes,
          moeglich:plan.moeglich.map(m=>[m.breite,m.jeTafel,m.rollenLaenge,Number(m.flaeche.toFixed(4))]),
          belegung:((plan.bestes||{}).verteilung||[]).map(x=>x.stuecke.map(y=>y.nr+":"+y.laenge)),
          text:$("einlaufblechKonischAufnahme").innerText,
          alles:$("einlaufblechKonischAufnahme").textContent};
 });
 p(Math.abs(roll.flaeche-3520*330/1e6)<1e-9,"Blechflaeche = Gesamtlaenge x Abwicklung",roll.flaeche);
 p(roll.breiten.join()==="1000,670","ohne Hinterlegung gelten 1000 und 670 mm",roll.breiten);
 // Seit v2.88 wird jedes Stueck auf SEINE Laenge geschnitten. Von Hand:
 // Zuschnitte 2070 und 1450, Abwicklung 330.
 //   670 ÷ 330 = 2 Streifen -> 2070 | 1450 -> Rollenlaenge 2070
 //  1000 ÷ 330 = 3 Streifen -> dasselbe 2070, aber mehr Blechbreite
 const r670=roll.moeglich.find(m=>m[0]===670), r1000=roll.moeglich.find(m=>m[0]===1000);
 p(!!r670&&r670[1]===2&&r670[2]===2070&&Math.abs(r670[3]-670*2070/1e6)<1e-6,
   "670 mm: 2 Streifen, 2'070 mm ab Rolle",r670);
 p(!!r1000&&r1000[1]===3&&r1000[2]===2070,"1000 mm: 3 Streifen, 2'070 mm ab Rolle",r1000);
 p(roll.bestes&&roll.bestes.breite===670,"die schmalere Rolle braucht hier weniger Blech",roll.bestes);
 p(roll.bestes&&roll.bestes.jeTafel===Math.floor(roll.bestes.breite/330),
   "Streifen nebeneinander = Rollenbreite ÷ Abwicklung",roll.bestes);
 p(roll.belegung.flat().map(x=>Number(x.split(":")[0])).sort().join()==="1,2",
   "jedes Stueck liegt genau einmal in einem Streifen",roll.belegung);
 p(/St(ü|ue)ck/i.test(roll.text)&&/Streifen 1/.test(roll.alles),
   "jedes Blech steht mit seiner Nummer in der Streifenliste");

 console.log("\nI · Ausmass");
 await reg(page,5);
 const am=await page.evaluate(()=>({zeilen:ebkaAusmassZeilen(),text:$("einlaufblechKonischAufnahme").innerText}));
 const holen=b=>am.zeilen.find(z=>new RegExp(b,"i").test(z.bezeichnung));
 p(am.zeilen.length>=4,"Ausmass hat Positionen",am.zeilen.length);
 p(!!holen("Einlaufblech konisch"),"Laufmeter konisches Einlaufblech");
 p(!!holen("Blechfl"),"Blechflaeche in m²");
 p(!!holen("Bleichst|Blechst"),"Blechstoesse");
 // Mit Wortgrenzen: ohne sie trifft /CHF/i mitten in "Blechflaeche".
 p(!/\bCHF\b|\bFr\.|\bArtikel-?Nr/i.test(am.text),"keine Preise, keine Artikelnummern",
   (am.text.match(/\bCHF\b|\bFr\.|\bArtikel-?Nr/i)||[])[0]);
 const folgt=await page.evaluate(()=>{
  const vor=(ebkaAusmassZeilen().find(z=>/Blechfl/i.test(z.bezeichnung))||{}).menge;
  ebkA.stuecke[0].laenge=3000; renderEinlaufblechKonischAufnahme();
  const nach=(ebkaAusmassZeilen().find(z=>/Blechfl/i.test(z.bezeichnung))||{}).menge;
  ebkA.stuecke[0].laenge=2070; renderEinlaufblechKonischAufnahme();
  return {vor,nach};
 });
 p(folgt.vor!==folgt.nach,"das Ausmass folgt einer Aenderung sofort",folgt);

 console.log("\nJ · Kontrolle");
 await reg(page,6);
 const k1=await page.evaluate(()=>ebkaPruefungen().filter(x=>x.art==="fehler").length);
 p(k1===0,"vollstaendige Aufnahme: kein Fehler",k1);
 const k2=await page.evaluate(()=>{
  ebkA.stuecke[0].massLinks=400;   // 400 + 12 + 12 > 330 -> Restbreite negativ
  renderEinlaufblechKonischAufnahme();
  return {fehler:ebkaPruefungen().filter(x=>x.art==="fehler").length,
          punkt:!!document.querySelector("#ebka_register .ra-register-punkt.fehler")};
 });
 await page.waitForTimeout(150);
 p(k2.fehler>0,"negative Restbreite wird als Fehler gemeldet",k2);
 p(k2.punkt,"das Register Kontrolle bekommt einen roten Punkt");
 const k3=await page.evaluate(()=>{
  ebkA.stuecke[0].massLinks=140; ebkA.stuecke[0].massRechts=0;
  renderEinlaufblechKonischAufnahme();
  const f=ebkaPruefungen().filter(x=>x.art==="fehler");
  ebkA.stuecke[0].massRechts=165; renderEinlaufblechKonischAufnahme();
  return f.some(x=>/Mass rechts fehlt/i.test(x.text));
 });
 p(k3,"fehlendes Mass wird gemeldet (Pflichtfeld beim Speichern)");
 const k4=await page.evaluate(()=>{
  ebkA.stuecke[1].massLinks=900;   // widerspricht dem rechten Mass von Stueck 1
  renderEinlaufblechKonischAufnahme();
  const w=ebkaPruefungen().some(x=>/derselben Stossstelle/i.test(x.text));
  ebkA.stuecke[1].massLinks=165; renderEinlaufblechKonischAufnahme();
  return w;
 });
 p(k4,"widerspruechliche Masse an einer Stossstelle werden gemeldet");

 console.log("\nK · Laengen aus einer Rinne uebernehmen");
 await reg(page,3);
 const ueb=await page.evaluate(()=>{
  const box=document.getElementById("ebkaRinneBox");
  const st=box?getComputedStyle(box):null;
  const body=box?box.querySelector(".settings-section-body"):null;
  return {da:!!box, inRegister:!!(box&&box.closest("#einlaufblechKonischAufnahme")),
   sichtbar:st?st.display!=="none":false,
   hoehe:box?Math.round(box.getBoundingClientRect().height):0,
   offen:box?box.classList.contains("open"):false,
   inhaltSichtbar:body?getComputedStyle(body).display!=="none":false,
   hint:!!document.getElementById("ebk_rinneHint"),
   liste:!!document.getElementById("ebk_rinneList")};
 });
 p(ueb.da&&ueb.inRegister,"Uebernahme-Block steht in Register 3",ueb);
 p(ueb.sichtbar&&ueb.hoehe>40,"und ist sichtbar",ueb);
 p(ueb.offen&&ueb.inhaltSichtbar,"und aufgeklappt - nicht zu uebersehen",ueb);
 p(ueb.hint&&ueb.liste,"Hinweis und Liste von js/14 vorhanden",ueb);
 await reg(page,2);
 const weg=await page.evaluate(()=>{
  const box=document.getElementById("ebkaRinneBox");
  return box?getComputedStyle(box).display!=="none":false;
 });
 p(!weg,"in Register 2 ausgeblendet",weg);
 await reg(page,3);
 // Der Klick-Handler von js/14 haengt am Element selbst - es darf beim
 // Neuzeichnen NICHT ersetzt worden sein.
 const handler=await page.evaluate(()=>{
  const l=document.getElementById("ebk_rinneList");
  if(!l)return {gleich:false,grund:"Element fehlt vor dem Neuzeichnen"};
  l.dataset.ebkaMerker="1";
  ebkaSetzeSchritt(2); ebkaSetzeSchritt(3);
  const n=document.getElementById("ebk_rinneList");
  return {gleich:!!n&&n.dataset.ebkaMerker==="1",grund:n?"":"Element nach dem Neuzeichnen weg"};
 });
 await page.waitForTimeout(150);
 p(handler.gleich,"das Listen-Element ueberlebt das Neuzeichnen",handler);
 // Und die Uebernahme selbst muss im Modell ankommen - nicht nur in ebkPieces.
 const uebernahme=await page.evaluate(()=>{
  const segs=[{laenge:5000,winkel:-90},{laenge:3000,winkel:0}];
  ebkRinneCache=[{id:1,title:"Rinne Nord",date:"2026-09-01",data:{segments:segs}}];
  zeigeRinneUebernahmeListe("ebk_rinneHint","ebk_rinneList",
    {liste:ebkRinneCache,fehler:null},"pick-ebk-rinne");
  const soll=baueEinlaufblechStueckeAusRinne(segs,einlaufblechKonischSettings,
    splitLengthIntoPieces,true);
  const knopf=document.querySelector("[data-pick-ebk-rinne]");
  if(!knopf)return {fehlt:true};
  knopf.click();
  return {soll:soll.map(x=>x.laenge).join(), sollAnzahl:soll.length,
          gehrung:soll.some(x=>x.gehrungRechts||x.gehrungLinks),
          modell:ebkA.stuecke.map(x=>x.laenge).join(),
          modellAnzahl:ebkA.stuecke.length,
          gleich:ebkPieces===ebkA.stuecke};
 });
 await page.waitForTimeout(250);
 p(uebernahme.sollAnzahl>0&&uebernahme.gehrung,
   "baueEinlaufblechStueckeAusRinne aus js/13 macht Gehrungen",uebernahme);
 p(uebernahme.modell===uebernahme.soll,
   "die uebernommenen Stuecke stehen im Modell, nicht nur in ebkPieces",uebernahme);
 p(uebernahme.gleich,"und Modell und ebkPieces sind wieder dasselbe Array",uebernahme);
 const bleibt=await page.evaluate(()=>{
  // Ein Neuzeichnen darf die Uebernahme nicht zurueckwerfen.
  ebkaSetzeSchritt(1); ebkaSetzeSchritt(3);
  measSelectedProjectId=7; $("measTitle").value="Traufe";$("measDate").value="2026-09-04";
  const pl=buildMeasurementFromForm();
  return {modell:ebkA.stuecke.length, gespeichert:(pl.data.pieces||[]).length};
 });
 p(bleibt.modell>0&&bleibt.gespeichert===bleibt.modell,
   "sie ueberleben das Neuzeichnen und landen im Speicher-Payload",bleibt);

 console.log("\nL · Speichern und Wiederoeffnen");
 await page.evaluate(()=>{
  ebkA.material="2"; ebkA.abwicklung=330; ebkA.montage="rechts"; ebkA.dachneigung=25;
  ebkA.stuecke=[{laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:140,massRechts:165},
                {laenge:1450,stossStoss:1450,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:165,massRechts:170}];
  renderEinlaufblechKonischAufnahme();
 });
 const pay=await page.evaluate(()=>{
  measSelectedProjectId=7;
  $("measTitle").value="Traufe Nord"; $("measNote").value=""; $("measDate").value="2026-09-04";
  return buildMeasurementFromForm();
 });
 const d=pay.data||{};
 p(pay.type==="einlaufblech_konisch","Typ stimmt",pay.type);
 // Die sieben bisherigen Felder muessen unveraendert da sein
 ["abwicklung","dachneigung","montage","engeSeite","pieces","gesamtlaenge","material"]
  .forEach(f=>p(d[f]!==undefined,"altes Feld "+f+" weiterhin gespeichert",d[f]));
 p(Array.isArray(d.pieces)&&d.pieces.length===2,"Stuecke gespeichert",d.pieces&&d.pieces.length);
 p(d.pieces&&d.pieces[0].massLinksEng===138&&d.pieces[0].massRechtsEng===163,
   "enge Masse aus calcEbkPiece mitgespeichert",d.pieces&&d.pieces[0]);
 // und die neuen dazu
 p(typeof d.flaeche_m2==="number"&&d.flaeche_m2>0,"Flaeche gespeichert",d.flaeche_m2);
 p(Array.isArray(d.ausmass)&&d.ausmass.length>0,"Ausmass gespeichert",d.ausmass&&d.ausmass.length);
 p(d.rollen&&Array.isArray(d.rollen.moeglich)&&d.rollen.moeglich.length>0,"Rollenplan gespeichert",d.rollen&&d.rollen.moeglich.length);
 p(d.rollen&&d.rollen.rollenLaenge===2070,"Rollenlaenge im Plan",d.rollen&&d.rollen.rollenLaenge);

 const wieder=await page.evaluate(pl=>{
  // Vorher auf Register 6 stellen: zeichnet ebkaFuellen() nicht selbst neu,
  // bleibt das Register sichtbar auf 6 stehen.
  ebkaSetzeSchritt(6);
  ebkaFuellen(pl.data);
  const feld=document.getElementById("ebka_material");
  const kopf=document.getElementById("ebka_kopf");
  return {neig:ebkA.dachneigung, abw:ebkA.abwicklung, mon:ebkA.montage, mat:ebkA.material,
          stuecke:ebkA.stuecke.map(x=>x.laenge).join(),
          masse:ebkA.stuecke.map(x=>x.massLinks+"/"+x.massRechts).join(),
          schritt:ebkaSchritt, domFeld:feld?feld.value:null,
          // Fallunabhaengig: die App schreibt Ueberschriften per CSS gross.
          domRegister1:!!(kopf&&/^\s*1 ·/.test(kopf.innerText.split("\n").find(z=>/·/.test(z))||"")),
          domAktiv:(document.querySelector("#ebka_register .ra-register-knopf.aktiv")||{}).textContent||""};
 },pay);
 p(wieder.neig===25&&wieder.abw===330&&wieder.mon==="rechts"&&wieder.mat==="2",
   "wiedergeoeffnet stimmen die Grunddaten",wieder);
 p(wieder.stuecke==="2070,1450","und die Stuecke",wieder.stuecke);
 p(wieder.masse==="140/165,165/170","und die Masse links/rechts",wieder.masse);
 p(wieder.schritt===1,"beginnt auf Register 1",wieder.schritt);
 p(/1/.test(wieder.domAktiv)&&wieder.domFeld==="2",
   "ebkaFuellen() zeichnet selbst neu - sichtbar steht wieder Register 1",wieder);

 console.log("\nM · Ein alter Datensatz (vor v2.76) bleibt lesbar");
 const alt=await page.evaluate(()=>{
  // genau das Format, das die App bis v2.75 gespeichert hat
  ebkaFuellen({abwicklung:250,dachneigung:30,montage:"links",engeSeite:"rechts",
    gesamtlaenge:5070,material:"3",
    pieces:[{laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:100,massRechts:110,massLinksEng:98,massRechtsEng:108},
            {laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:110,massRechts:120,massLinksEng:108,massRechtsEng:118},
            {laenge:930,stossStoss:930,gehrungLinks:false,gehrungRechts:false,winkel:0,massLinks:120,massRechts:130,massLinksEng:118,massRechtsEng:128}]});
  renderEinlaufblechKonischAufnahme();
  return {neig:ebkA.dachneigung, stuecke:ebkA.stuecke.length, L:ebkaGesamtlaenge(),
          eng:ebkaEngeSeite(), rest:ebkaRestbreite(ebkA.stuecke[0]),
          nan:/NaN|Infinity/.test($("einlaufblechKonischAufnahme").innerHTML)};
 });
 p(alt.neig===30&&alt.stuecke===3&&alt.L===5070,"alte Aufnahme oeffnet unveraendert",alt);
 // Montage "links" -> enge Seite "rechts"; 250 − 110 − 24 = 116
 p(alt.eng==="rechts"&&alt.rest===116,"und rechnet dieselbe Restbreite",alt);
 p(!alt.nan,"kein NaN");

 console.log("\nN · Leerer Zustand");
 const leer=await page.evaluate(()=>{
  ebkaZuruecksetzen();
  ebkaSetzeSchritt(4);
  const t6=$("einlaufblechKonischAufnahme").innerText;
  ebkaSetzeSchritt(5);
  const t5=$("einlaufblechKonischAufnahme").innerText;
  return {t5,t6,plan:ebkaRollenPlan().moeglich.length,zeilen:ebkaAusmassZeilen().length,
          fehler:ebkaPruefungen().filter(x=>x.art==="fehler").length};
 });
 p(leer.plan===0&&/Noch nichts zuzuschneiden/i.test(leer.t6),"ohne Stuecke wird nichts gerechnet",leer.plan);
 p(leer.zeilen===0&&/Noch nichts zu messen/i.test(leer.t5),"und nichts gemessen",leer.zeilen);
 p(leer.fehler>0,"die Kontrolle sagt, was fehlt",leer.fehler);

 console.log("\nO · Fotos erscheinen erst am Ende");
 await page.evaluate(()=>{
  measMedienZuruecksetzen();
  ebkaFuellen({abwicklung:330,dachneigung:25,montage:"rechts",gesamtlaenge:3520,material:"2",
   pieces:[{laenge:2070,massLinks:140,massRechts:165},{laenge:1450,massLinks:165,massRechts:170}]});
  showMeasTypeSection("einlaufblech_konisch");
 });
 await page.waitForTimeout(200);
 const vorFertig=await page.evaluate(()=>{
  const z=document.getElementById("measMedienBereich");
  return {hidden:z.hidden, display:getComputedStyle(z).display,
          hoehe:Math.round(z.getBoundingClientRect().height),
          notiz:!!document.getElementById("measNote"),
          speichern:!!document.getElementById("saveMeasurement")};
 });
 p(vorFertig.display==="none"&&vorFertig.hoehe===0,"waehrend der Register ausgeblendet",vorFertig);
 p(vorFertig.notiz&&vorFertig.speichern,"Notiz und Speichern bleiben erreichbar",vorFertig);
 await reg(page,6);
 const fertigText=await page.evaluate(()=>{const b=document.getElementById("ebka_weiter");return b?b.textContent.trim():""});
 p(/Fertig/.test(fertigText),"letztes Register: der Knopf heisst Fertig",fertigText);
 const fertig=await klick(page,"#ebka_weiter");
 p(fertig==="ok","und ist bedienbar",fertig);
 await page.waitForTimeout(300);
 const nachFertig=await page.evaluate(()=>{
  const z=document.getElementById("measMedienBereich");
  return {display:getComputedStyle(z).display, hoehe:Math.round(z.getBoundingClientRect().height),
          markiert:z.classList.contains("ra-ziel"), schritt:ebkaSchritt};
 });
 p(nachFertig.display!=="none"&&nachFertig.hoehe>0,"nach Fertig sichtbar",nachFertig);
 p(nachFertig.markiert,"und hervorgehoben",nachFertig);
 p(nachFertig.schritt===6,"blaettert nicht ins Leere",nachFertig.schritt);

 console.log("\nP · Druck zeigt die neuen Abschnitte");
 const druck=await page.evaluate(async pl=>{
  window.__pdf=[];
  window.open=()=>({document:{write(h){window.__pdf.push(h)},close(){}},focus(){},print(){},set onload(f){}});
  storageSignedUrl=async()=>null;
  companyName="Peter Künzi AG"; companyAddress=""; logoUrl=null;
  await printMeasurement({...pl,id:1,title:"Traufe Nord",date:"2026-09-04",note:""},{listen:"alle"});
  return window.__pdf[0]||"";
 },pay);
 p(/Zuschnitt aus Rollenblech/.test(druck),"Rollenplan im PDF");
 p(/>Ausmass</.test(druck),"Ausmass im PDF");
 p(/Blechfl/.test(druck),"Blechflaeche im PDF");
 p(/2[^\d]?070\s*mm ab Rolle/.test(druck),"Rollenlaenge aus dem gespeicherten Plan, nicht neu gerechnet",(druck.match(/[^<>]*ab Rolle[^<>]*/)||[""])[0].slice(0,90));
 p(/Mass links/.test(druck)&&/Mass rechts/.test(druck),"Masse links und rechts im PDF");
 p(!/\bNaN\b|\bInfinity\b/.test(druck),"kein NaN im PDF");
 // Ein alter Datensatz darf keinen der neuen Abschnitte erzeugen.
 const druckAlt=await page.evaluate(async()=>{
  window.__pdf=[];
  await printMeasurement({id:2,type:"einlaufblech_konisch",title:"Alt",date:"2026-08-28",note:"",
   data:{abwicklung:250,dachneigung:30,montage:"links",engeSeite:"rechts",gesamtlaenge:5070,material:"3",
     pieces:[{laenge:2070,massLinks:100,massRechts:110,massLinksEng:98,massRechtsEng:108}]}},{listen:"alle"});
  return window.__pdf[0]||"";
 });
 p(!/Zuschnitt aus Rollenblech/.test(druckAlt),"eine alte Aufnahme druckt ohne die neuen Abschnitte");
 p(/Einlaufblech konisch/.test(druckAlt)&&!/\bNaN\b/.test(druckAlt),"und sonst unveraendert");

 console.log("\nQ · Tablet-Breiten: nichts laeuft seitlich hinaus");
 await page.evaluate(()=>{
  ebkA.stuecke=[{laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:true,winkel:90,massLinks:140,massRechts:165},
                {laenge:1450,stossStoss:1450,gehrungLinks:true,gehrungRechts:false,winkel:0,massLinks:165,massRechts:170}];
  ebkA.dachneigung=25;
  renderEinlaufblechKonischAufnahme();
 });
 for(const w of [360,412,768,1024,1280]){
  await page.setViewportSize({width:w,height:1400});
  let schlimm=0; const wo=[];
  for(let n=1;n<=6;n++){
   await reg(page,n);
   const m=await page.evaluate(()=>{
    const br=document.documentElement.clientWidth, raus=[];
    document.querySelectorAll("#measTypeEinlaufblechKonisch *").forEach(el=>{
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
  p(schlimm===0,"Breite "+w+" px: alle sechs Register passen",wo.slice(0,4));
 }
 await page.setViewportSize({width:412,height:1400});

 console.log("\nR · Keine JS-Fehler");
 p(fehler.length===0,"keine Seitenfehler",fehler.slice(0,3));

 await b.close();
 console.log("\npruefstand-einlaufblech-konisch-app: "+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN":"  - alle bestanden"));
 process.exit(fail?1:0);
})();
