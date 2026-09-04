// Prueft den Einbau der Einlaufblech-gerade-Aufnahme in die laufende App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht), die Kataloge werden mit den
// echten Werten der Produktivdatenbank gestellt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-einlaufblech-app-v2-74.js
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
const reg=async(page,n)=>{await page.evaluate(k=>ebaSetzeSchritt(k),n);await page.waitForTimeout(150)};

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
  einlaufblechSettings={stoss_laenge:2000,ueberlappung:70,gehrungszugabe:100,
    umschlag_oben:12,umschlag_unten:12,rest_schwelle:500,end_zugabe:10,gava_abstand:500};
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
 });

 console.log("\nA · Modul geladen, Fachdateien unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderEinlaufblechAufnahme==="function",
  zurueck:typeof ebaZuruecksetzen==="function",
  fuellen:typeof ebaFuellen==="function",
  zusatz:typeof ebaZusatzDaten==="function",
  altDiagramm:typeof einlaufblechDiagramSvg==="function",   // js/11 da
  altListe:typeof renderEbPiecesTable==="function",          // js/15 da
  altEnge:typeof ebEngeSeite==="function",
  altRest:typeof ebRestbreite==="function",
  stummel:!!document.getElementById("eb_resultBody"),
  ziel:!!document.getElementById("einlaufblechAufnahme"),
  rinneBox:!!document.getElementById("eb_rinneList")
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.zusatz,"js/29 geladen",da);
 p(da.altDiagramm&&da.altListe&&da.altEnge&&da.altRest,"js/11 und js/15 unveraendert geladen",da);
 p(da.stummel,"Stummel fuer js/15 vorhanden");
 p(da.ziel,"Container fuer die Aufnahme vorhanden");
 p(da.rinneBox,"Rinnen-Uebernahme steht fest im HTML (Handler von js/15)");

 console.log("\nB · Sechs Register, nur eines sichtbar");
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  $("measType").value="einlaufblech_gerade";
  showMeasTypeSection("einlaufblech_gerade");
 });
 await page.waitForTimeout(250);
 const reg1=await page.evaluate(()=>({
  knoepfe:document.querySelectorAll("#eba_register .ra-register-knopf").length,
  aktiv:document.querySelectorAll("#eba_register .ra-register-knopf.aktiv").length,
  ueberschriften:Array.from(document.querySelectorAll("#einlaufblechAufnahme h2")).map(h=>h.textContent.trim())
 }));
 p(reg1.knoepfe===6,"sechs Register",reg1.knoepfe);
 p(reg1.aktiv===1,"genau eines ist aktiv",reg1.aktiv);
 // Eigenschaft statt Zahl: die erste Ueberschrift traegt die eigene
 // Registernummer, keine weitere traegt eine fremde.
 const fremd=n=>page.evaluate(k=>{
  const h=Array.from(document.querySelectorAll("#einlaufblechAufnahme h2")).map(x=>x.textContent.trim());
  return {erste:h[0]||"", fremde:h.filter(t=>/^[1-6] ·/.test(t)&&!t.startsWith(k+" ·")).length};
 },n);
 let allefremd=0, ersteOk=0;
 for(let n=1;n<=6;n++){await reg(page,n); const f=await fremd(n); allefremd+=f.fremde; if(f.erste.startsWith(n+" ·"))ersteOk++;}
 p(ersteOk===6,"jedes Register zeigt seine eigene Ueberschrift",ersteOk);
 p(allefremd===0,"und keine fremde Registernummer",allefremd);

 console.log("\nC · Bruecke zu js/11 und js/15");
 await reg(page,1);
 await page.evaluate(()=>{
  ebA.material="2"; ebA.abwicklung=330; ebA.montage="rechts";
  ebA.massA=120; ebA.winkel=25;
  ebA.stuecke=[{laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0},
               {laenge:1450,stossStoss:1450,gehrungLinks:false,gehrungRechts:false,winkel:0}];
  renderEinlaufblechAufnahme();
 });
 const br=await page.evaluate(()=>{
  ebaBruecke();
  return {pieces:ebPieces.length, gleich:ebPieces===ebA.stuecke,
          massA:$("eb_massA").value, winkel:$("eb_winkel").value,
          abw:$("eb_abwicklung").value, mon:$("eb_montage").value,
          mat:$("eb_material").value,
          engeApp:ebEngeSeite(), restApp:ebRestbreite(),
          engeEigen:ebaEngeSeite(), restEigen:ebaRestbreite()};
 });
 p(br.pieces===2&&br.gleich,"ebPieces ist dasselbe Array wie ebA.stuecke",br);
 p(br.massA==="120"&&br.winkel==="25"&&br.abw==="330"&&br.mon==="rechts"&&br.mat==="2",
   "die alten Formularfelder werden gesetzt",br);
 // Montage "rechts" -> enge Seite "links"; Restbreite 330-120-12-12 = 186
 p(br.engeApp==="links"&&br.engeEigen==="links","enge Seite kommt aus js/15",br);
 p(br.restApp===186&&br.restEigen===186,"Restbreite kommt aus js/15",br);

 console.log("\nD · Geometrie rechnet und zeichnet");
 await reg(page,2);
 const geo=await page.evaluate(()=>({
  eng:$("eba_wEng").textContent, rest:$("eba_wRest").textContent,
  svg:($("eba_schnitt").innerHTML.match(/<svg/g)||[]).length,
  nan:/NaN|Infinity|undefined/.test($("einlaufblechAufnahme").innerHTML)
 }));
 p(geo.eng.replace(/\s/g,"")==="118mm","enges Mass A = Mass A − 2",geo.eng);
 p(geo.rest.replace(/[\s'\u2019]/g,"")==="186mm","Restbreite angezeigt",geo.rest);
 p(geo.svg===1,"Schnittzeichnung aus js/11",geo.svg);
 p(!geo.nan,"kein NaN im Register");

 console.log("\nE · Stuecke, Gehrung, Endzugabe");
 await reg(page,3);
 const st=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#einlaufblechAufnahme [data-eba-laenge]").length,
  laenge:$("eba_wLaenge").textContent,
  grundriss:($("eba_grundriss").innerHTML.match(/<svg/g)||[]).length
 }));
 p(st.zeilen===2,"beide Stuecke in der Tabelle",st.zeilen);
 p(st.laenge.replace(/[\s'\u2019]/g,"")==="3520mm","Gesamtlaenge aus den Stuecken",st.laenge);
 p(st.grundriss===1,"Grundriss aus js/13",st.grundriss);
 const geh=await page.evaluate(()=>{
  const vor=ebA.stuecke.map(x=>x.laenge).join();
  document.querySelector('[data-eba-gr="0"]').checked=true;
  document.querySelector('[data-eba-gr="0"]').dispatchEvent(new Event("change",{bubbles:true}));
  return {vor,nach:ebA.stuecke.map(x=>x.laenge).join(),
          winkel:ebA.stuecke[0].winkel, nachbar:!!ebA.stuecke[1].gehrungLinks};
 });
 await page.waitForTimeout(200);
 // Gehrungszugabe 100 auf beiden Seiten der Ecke, Winkel 90 - Regel aus js/15
 p(geh.nach==="2170,1550"&&geh.winkel===90&&geh.nachbar,"Gehrung setzt Zugabe und Nachbarstueck",geh);
 const ez=await page.evaluate(()=>{
  document.getElementById("eba_endEnde").click();
  return {laenge:ebA.stuecke[1].laenge, flag:ebA.stuecke[1].endzugabeEnd};
 });
 await page.waitForTimeout(150);
 p(ez.laenge===1560&&ez.flag===10,"Endzugabe auf das Reststueck",ez);

 console.log("\nF · Haltebleche GAVA");
 const g1=await page.evaluate(()=>{
  document.getElementById("eba_gavaAktiv").checked=true;
  document.getElementById("eba_gavaAktiv").dispatchEvent(new Event("change",{bubbles:true}));
  return {aktiv:ebA.gava.aktiv, abstand:ebA.gava.abstand_mm, anzahl:ebaGavaAnzahl(), L:ebaGesamtlaenge()};
 });
 await page.waitForTimeout(200);
 // 3730 mm bei 500 mm Abstand: floor(3730/500)+1 = 8
 p(g1.aktiv&&g1.abstand===500,"GAVA eingeschaltet, Abstand aus den Einstellungen",g1);
 p(g1.anzahl===Math.floor(g1.L/500)+1,"Anzahl = Laenge ÷ Abstand + 1",g1);
 const g0=await page.evaluate(()=>{
  document.getElementById("eba_gavaAktiv").checked=false;
  document.getElementById("eba_gavaAktiv").dispatchEvent(new Event("change",{bubbles:true}));
  return ebaGavaAnzahl();
 });
 await page.waitForTimeout(150);
 p(g0===null,"ohne Haken keine Haltebleche",g0);
 await page.evaluate(()=>{ebA.gava.aktiv=true;renderEinlaufblechAufnahme()});
 await page.waitForTimeout(150);

 console.log("\nG · Flaeche und Rollenblech");
 // Seit v2.80 steht der Zuschnitt in ALLEN Arten auf Register 4, die
 // Kontrolle immer zuletzt.
 await reg(page,4);
 const roll=await page.evaluate(()=>{
  const plan=ebaRollenPlan();
  return {flaeche:ebaFlaecheM2(),
          breiten:ebaRollenbreiten(),
          bestes:plan.bestes, moeglich:plan.moeglich.map(m=>[m.breite,m.jeTafel,m.rollenLaenge,Number(m.flaeche.toFixed(4))]),
          belegung:((plan.bestes||{}).verteilung||[]).map(x=>x.stuecke.map(y=>y.nr+":"+y.laenge)),
          text:$("einlaufblechAufnahme").innerText};
 });
 // 3730 mm x 330 mm = 1.2309 m2
 p(Math.abs(roll.flaeche-3730*330/1e6)<1e-9,"Blechflaeche = Gesamtlaenge x Abwicklung",roll.flaeche);
 p(roll.breiten.join()==="1000,670","ohne Hinterlegung gelten 1000 und 670 mm",roll.breiten);
 // Seit v2.88 wird JEDES Stueck auf SEINE Laenge geschnitten. Von Hand:
 // Zuschnitte 2170 und 1560, Abwicklung 330.
 //   670 ÷ 330 = 2 Streifen -> 2170 | 1560, Rollenlaenge 2170, 670x2170 = 1.4539 m2
 //  1000 ÷ 330 = 3 Streifen -> dasselbe 2170, aber 1000x2170 = 2.17 m2
 const r670=roll.moeglich.find(m=>m[0]===670), r1000=roll.moeglich.find(m=>m[0]===1000);
 p(!!r670&&r670[1]===2&&r670[2]===2170&&Math.abs(r670[3]-670*2170/1e6)<1e-6,
   "670 mm: 2 Streifen, 2'170 mm ab Rolle",r670);
 p(!!r1000&&r1000[1]===3&&r1000[2]===2170&&Math.abs(r1000[3]-1000*2170/1e6)<1e-6,
   "1000 mm: 3 Streifen, 2'170 mm ab Rolle",r1000);
 p(roll.bestes&&roll.bestes.breite===670,"die schmalere Rolle braucht hier weniger Blech",roll.bestes);
 p(roll.bestes&&roll.bestes.jeTafel===Math.floor(roll.bestes.breite/330),
   "Streifen nebeneinander = Rollenbreite ÷ Abwicklung",roll.bestes);
 p(roll.belegung.flat().map(x=>Number(x.split(":")[0])).sort().join()==="1,2",
   "jedes Stueck liegt genau einmal in einem Streifen",roll.belegung);
 // Die Nummern stehen seit v2.88 als eigene Marken in der Liste (STÜCK 1 2),
 // die Belegung im zugeklappten <details> - dort greift textContent.
 const nrText=await page.evaluate(()=>$("einlaufblechAufnahme").textContent);
 p(/St(ü|ue)ck/i.test(roll.text)&&/Streifen 1/.test(nrText),
   "jedes Blech steht mit seiner Nummer in der Streifenliste");
 const eigen=await page.evaluate(()=>{blechRollenbreiten=[500,400];return ebaRollenbreiten()});
 p(eigen.join()==="500,400","hinterlegte Rollenbreiten schlagen die Vorgabe",eigen);
 await page.evaluate(()=>{blechRollenbreiten=[]});

 console.log("\nH · Ausmass");
 await reg(page,5);
 const am=await page.evaluate(()=>{
  const z=ebaAusmassZeilen();
  return {zeilen:z, text:$("einlaufblechAufnahme").innerText};
 });
 const holen=b=>am.zeilen.find(z=>new RegExp(b,"i").test(z.bezeichnung));
 p(am.zeilen.length>=5,"Ausmass hat Positionen",am.zeilen.length);
 p(!!holen("Einlaufblech gerade"),"Laufmeter Einlaufblech");
 p(!!holen("Blechfl"),"Blechflaeche in m²");
 p(!!holen("Haltebleche"),"Haltebleche, weil GAVA aktiv");
 p(!!holen("Gehrungen"),"Gehrungen aus der Stueckliste");
 // Mit Wortgrenzen: ohne sie trifft /CHF/i mitten in "Blechflaeche".
 p(!/\bCHF\b|\bFr\.|\bArtikel-?Nr/i.test(am.text),"keine Preise, keine Artikelnummern",
   (am.text.match(/\bCHF\b|\bFr\.|\bArtikel-?Nr/i)||[])[0]);

 console.log("\nI · Kontrolle");
 await reg(page,6);
 const k1=await page.evaluate(()=>({fehler:ebaPruefungen().filter(x=>x.art==="fehler").length}));
 p(k1.fehler===0,"vollstaendige Aufnahme: kein Fehler",k1);
 const k2=await page.evaluate(()=>{
  ebA.massA=400;   // 400 + 12 + 12 > 330  -> Restbreite negativ
  renderEinlaufblechAufnahme();
  return {fehler:ebaPruefungen().filter(x=>x.art==="fehler").length,
          punkt:!!document.querySelector("#eba_register .ra-register-punkt.fehler")};
 });
 await page.waitForTimeout(150);
 p(k2.fehler>0,"negative Restbreite wird als Fehler gemeldet",k2);
 p(k2.punkt,"das Register Kontrolle bekommt einen roten Punkt");
 await page.evaluate(()=>{ebA.massA=120;renderEinlaufblechAufnahme()});
 await page.waitForTimeout(150);

 console.log("\nQ · Laengen aus einer Rinne uebernehmen");
 await reg(page,3);
 const ueb=await page.evaluate(()=>{
  const box=document.getElementById("ebaRinneBox");
  const st=box?getComputedStyle(box):null;
  const body=box?box.querySelector(".settings-section-body"):null;
  return {da:!!box, inRegister:!!(box&&box.closest("#einlaufblechAufnahme")),
   sichtbar:st?st.display!=="none":false,
   hoehe:box?Math.round(box.getBoundingClientRect().height):0,
   offen:box?box.classList.contains("open"):false,
   inhaltSichtbar:body?getComputedStyle(body).display!=="none":false,
   hint:!!document.getElementById("eb_rinneHint"),
   liste:!!document.getElementById("eb_rinneList")};
 });
 p(ueb.da&&ueb.inRegister,"Uebernahme-Block steht in Register 3",ueb);
 p(ueb.sichtbar&&ueb.hoehe>40,"und ist sichtbar",ueb);
 p(ueb.offen&&ueb.inhaltSichtbar,"und aufgeklappt - nicht zu uebersehen",ueb);
 p(ueb.hint&&ueb.liste,"Hinweis und Liste von js/15 vorhanden",ueb);
 // In den uebrigen Registern hat er nichts verloren
 await reg(page,2);
 const weg=await page.evaluate(()=>{
  const box=document.getElementById("ebaRinneBox");
  return box?getComputedStyle(box).display!=="none":false;
 });
 p(!weg,"in Register 2 ausgeblendet",weg);
 await reg(page,3);
 // Der Klick-Handler von js/15 haengt am Element selbst - es darf beim
 // Neuzeichnen NICHT ersetzt worden sein.
 const handler=await page.evaluate(()=>{
  const l=document.getElementById("eb_rinneList");
  // Fehlt er schon vorher, ist genau das der Fehlschlag - kein Absturz.
  if(!l)return {gleich:false,grund:"Element fehlt vor dem Neuzeichnen"};
  l.dataset.ebaMerker="1";
  ebaSetzeSchritt(2); ebaSetzeSchritt(3);
  const n=document.getElementById("eb_rinneList");
  return {gleich:!!n&&n.dataset.ebaMerker==="1",grund:n?"":"Element nach dem Neuzeichnen weg"};
 });
 await page.waitForTimeout(150);
 p(handler.gleich,"das Listen-Element ueberlebt das Neuzeichnen",handler);
 // Und die Uebernahme selbst rechnet mit der Funktion der App
 const rechnung=await page.evaluate(()=>{
  const segs=[{laenge:5000,winkel:-90},{laenge:3000,winkel:0}];
  const soll=baueEinlaufblechStueckeAusRinne(segs,einlaufblechSettings,
    l=>teileLaengeInStuecke(l,einlaufblechSettings),false);
  return {soll:soll.map(x=>x.laenge).join(), anzahl:soll.length,
          gehrung:soll.some(x=>x.gehrungRechts||x.gehrungLinks)};
 });
 p(rechnung.anzahl>0&&rechnung.gehrung,
   "baueEinlaufblechStueckeAusRinne aus js/13 ist erreichbar und macht Gehrungen",rechnung);
 // Und die Uebernahme muss im MODELL ankommen, nicht nur in ebPieces. Ohne
 // diese Pruefung blieb der Fehler aus v2.74/v2.75 unentdeckt: ebaBruecke()
 // hat ebPieces beim naechsten Zeichnen wieder mit dem alten Stand
 // ueberschrieben, der Speicher-Payload enthielt danach 0 Stuecke.
 const uebernahme=await page.evaluate(()=>{
  const segs=[{laenge:5000,winkel:-90},{laenge:3000,winkel:0}];
  ebRinneCache=[{id:1,title:"Rinne Nord",date:"2026-09-01",data:{segments:segs}}];
  zeigeRinneUebernahmeListe("eb_rinneHint","eb_rinneList",
    {liste:ebRinneCache,fehler:null},"pick-eb-rinne");
  const soll=baueEinlaufblechStueckeAusRinne(segs,einlaufblechSettings,
    l=>teileLaengeInStuecke(l,einlaufblechSettings),false);
  const knopf=document.querySelector("[data-pick-eb-rinne]");
  if(!knopf)return {fehlt:true};
  knopf.click();
  return {soll:soll.map(x=>x.laenge).join(), modell:ebA.stuecke.map(x=>x.laenge).join(),
          gleich:ebPieces===ebA.stuecke};
 });
 await page.waitForTimeout(250);
 p(uebernahme.modell===uebernahme.soll,
   "die uebernommenen Stuecke stehen im Modell, nicht nur in ebPieces",uebernahme);
 p(uebernahme.gleich,"und Modell und ebPieces sind wieder dasselbe Array",uebernahme);
 const bleibt=await page.evaluate(()=>{
  ebaSetzeSchritt(1); ebaSetzeSchritt(3);
  measSelectedProjectId=7; $("measTitle").value="Halle";$("measDate").value="2026-09-04";
  const pl=buildMeasurementFromForm();
  return {modell:ebA.stuecke.length, gespeichert:(pl.data.pieces||[]).length};
 });
 p(bleibt.modell>0&&bleibt.gespeichert===bleibt.modell,
   "sie ueberleben das Neuzeichnen und landen im Speicher-Payload",bleibt);
 // Danach wieder der Zwei-Stueck-Stand fuer die folgenden Abschnitte
 await page.evaluate(()=>{
  ebA.stuecke=[{laenge:2170,stossStoss:2000,gehrungLinks:false,gehrungRechts:true,winkel:90},
               {laenge:1560,stossStoss:1450,gehrungLinks:true,gehrungRechts:false,winkel:0,endzugabeEnd:10}];
  ebA.massA=120; ebA.winkel=25; ebA.gava.aktiv=true;
  renderEinlaufblechAufnahme();
 });

 console.log("\nJ · Speichern und Wiederoeffnen");
 const pay=await page.evaluate(()=>{
  measSelectedProjectId=7;
  $("measTitle").value="Halle Nord"; $("measNote").value=""; $("measDate").value="2026-09-03";
  return buildMeasurementFromForm();
 });
 const d=pay.data||{};
 p(pay.type==="einlaufblech_gerade","Typ stimmt",pay.type);
 // Die acht bisherigen Felder muessen unveraendert da sein
 ["gesamtlaenge","massA","massAEng","winkel","montage","abwicklung","engeSeite","restBreite"]
  .forEach(f=>p(d[f]!==undefined,"altes Feld "+f+" weiterhin gespeichert",d[f]));
 p(Array.isArray(d.pieces)&&d.pieces.length===2,"Stuecke gespeichert",d.pieces&&d.pieces.length);
 p(d.material==="2","Material gespeichert",d.material);
 // und die neuen dazu
 p(d.gava&&d.gava.aktiv===true&&d.gava.gerechnet>0,"GAVA gespeichert",d.gava);
 p(typeof d.flaeche_m2==="number"&&d.flaeche_m2>0,"Flaeche gespeichert",d.flaeche_m2);
 p(Array.isArray(d.ausmass)&&d.ausmass.length>0,"Ausmass gespeichert",d.ausmass&&d.ausmass.length);
 p(d.rollen&&Array.isArray(d.rollen.moeglich)&&d.rollen.moeglich.length>0,"Rollenplan gespeichert",d.rollen&&d.rollen.moeglich.length);
 p(d.rollen&&d.rollen.rollenLaenge===2170,"Rollenlaenge im Plan",d.rollen&&d.rollen.rollenLaenge);

 const wieder=await page.evaluate(pl=>{
  // Vorher auf Register 6 stellen: zeichnet ebaFuellen() nicht selbst neu,
  // bleibt das Register sichtbar auf 6 stehen. Bewusst OHNE eigenes
  // renderEinlaufblechAufnahme().
  ebaSetzeSchritt(6);
  ebaFuellen(pl.data);
  // Auch das DOM lesen: ebaFuellen() muss neu zeichnen, sonst zeigt das
  // Register den Stand von vorher.
  const feld=document.getElementById("eba_material");
  const kopf=document.getElementById("eba_kopf");
  return {massA:ebA.massA, winkel:ebA.winkel, abw:ebA.abwicklung, mon:ebA.montage,
          mat:ebA.material, stuecke:ebA.stuecke.map(x=>x.laenge).join(),
          gava:ebA.gava.aktiv, schritt:ebaSchritt,
          domFeld:feld?feld.value:null,
          // Fallunabhaengig: die App schreibt Ueberschriften per CSS gross,
          // und innerText gibt genau das zurueck.
          domRegister1:!!(kopf&&/^\s*1 ·/.test(kopf.innerText.split("\n").find(z=>/·/.test(z))||"")),
          domAktiv:(document.querySelector("#eba_register .ra-register-knopf.aktiv")||{}).textContent||""};
 },pay);
 p(wieder.massA===120&&wieder.winkel===25&&wieder.abw===330&&wieder.mon==="rechts"&&wieder.mat==="2",
   "wiedergeoeffnet stimmen die Grunddaten",wieder);
 p(wieder.stuecke==="2170,1560","und die Stuecke",wieder.stuecke);
 p(wieder.gava===true,"und die Haltebleche",wieder.gava);
 p(wieder.schritt===1,"beginnt auf Register 1",wieder.schritt);
 p(/1/.test(wieder.domAktiv)&&wieder.domFeld==="2",
   "ebaFuellen() zeichnet selbst neu - sichtbar steht wieder Register 1",wieder);

 console.log("\nK · Ein alter Datensatz (vor v2.74) bleibt lesbar");
 const alt=await page.evaluate(()=>{
  // genau das Format, das die App bis v2.73 gespeichert hat
  ebaFuellen({gesamtlaenge:5000,massA:100,massAEng:98,winkel:30,montage:"links",
    abwicklung:250,engeSeite:"rechts",restBreite:126,material:"3",
    pieces:[{laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0},
            {laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:false,winkel:0},
            {laenge:930,stossStoss:930,gehrungLinks:false,gehrungRechts:false,winkel:0}]});
  renderEinlaufblechAufnahme();
  return {massA:ebA.massA, stuecke:ebA.stuecke.length, L:ebaGesamtlaenge(),
          rest:ebaRestbreite(), gavaAktiv:ebA.gava.aktiv, gava:ebaGavaAnzahl(),
          nan:/NaN|Infinity/.test($("einlaufblechAufnahme").innerHTML)};
 });
 p(alt.massA===100&&alt.stuecke===3&&alt.L===5070,"alte Aufnahme oeffnet unveraendert",alt);
 p(alt.rest===126,"und rechnet dieselbe Restbreite",alt.rest);
 p(alt.gavaAktiv===false&&alt.gava===null,"es werden keine Haltebleche erfunden",alt);
 p(!alt.nan,"kein NaN");

 console.log("\nL · Leerer Zustand");
 const leer=await page.evaluate(()=>{
  ebaZuruecksetzen(); renderEinlaufblechAufnahme();
  ebaSetzeSchritt(4);
  const t6=$("einlaufblechAufnahme").innerText;
  ebaSetzeSchritt(5);
  const t5=$("einlaufblechAufnahme").innerText;
  return {t5,t6,plan:ebaRollenPlan().moeglich.length,zeilen:ebaAusmassZeilen().length,
          fehler:ebaPruefungen().filter(x=>x.art==="fehler").length};
 });
 p(leer.plan===0&&/Noch nichts zuzuschneiden/i.test(leer.t6),"ohne Stuecke wird nichts gerechnet",leer.plan);
 p(leer.zeilen===0&&/Noch nichts zu messen/i.test(leer.t5),"und nichts gemessen",leer.zeilen);
 p(leer.fehler>0,"die Kontrolle sagt, was fehlt",leer.fehler);

 console.log("\nM · Fertig-Knopf fuehrt zu Fotos und Speichern");
 await reg(page,6);
 const fertigText=await page.evaluate(()=>{const b=document.getElementById("eba_weiter");return b?b.textContent.trim():""});
 p(/Fertig/.test(fertigText),"letztes Register: der Knopf heisst Fertig",fertigText);
 const fertig=await klick(page,"#eba_weiter");
 p(fertig==="ok","und ist bedienbar",fertig);
 await page.waitForTimeout(300);
 const markiert=await page.evaluate(()=>{
  const z=document.getElementById("measMedienBereich");
  return {da:!!z, markiert:!!(z&&z.classList.contains("ra-ziel")), schritt:ebaSchritt};
 });
 p(markiert.da&&markiert.markiert,"er markiert den Foto-Bereich",markiert);
 p(markiert.schritt===6,"und blaettert nicht ins Leere",markiert.schritt);

 console.log("\nP · Druck zeigt die neuen Abschnitte");
 const druck=await page.evaluate(async pl=>{
  window.__pdf=[];
  window.open=()=>({document:{write(h){window.__pdf.push(h)},close(){}},focus(){},print(){},set onload(f){}});
  storageSignedUrl=async()=>null;
  companyName="Peter Künzi AG"; companyAddress=""; logoUrl=null;
  await printMeasurement({...pl,id:1,title:"Halle Nord",date:"2026-09-03",note:""},{listen:"alle"});
  return window.__pdf[0]||"";
 },pay);
 p(/Zuschnitt aus Rollenblech/.test(druck),"Rollenplan im PDF");
 p(/>Ausmass</.test(druck),"Ausmass im PDF");
 p(/Haltebleche \(GAVA\)/.test(druck),"Haltebleche im PDF");
 p(/Blechfl/.test(druck),"Blechflaeche im PDF");
 p(/2[^\d]?170\s*mm ab Rolle/.test(druck),"Rollenlaenge aus dem gespeicherten Plan, nicht neu gerechnet",(druck.match(/[^<>]*ab Rolle[^<>]*/)||[""])[0].slice(0,90));
 p(!/\bNaN\b|\bInfinity\b/.test(druck),"kein NaN im PDF");
 // Ein alter Datensatz darf keinen der neuen Abschnitte erzeugen.
 const druckAlt=await page.evaluate(async()=>{
  window.__pdf=[];
  await printMeasurement({id:2,type:"einlaufblech_gerade",title:"Alt",date:"2026-08-28",note:"",
   data:{massA:100,massAEng:98,winkel:30,montage:"links",abwicklung:250,engeSeite:"rechts",
     restBreite:126,gesamtlaenge:5070,material:"3",
     pieces:[{laenge:2070},{laenge:2070},{laenge:930}]}},{listen:"alle"});
  return window.__pdf[0]||"";
 });
 p(!/Zuschnitt aus Rollenblech/.test(druckAlt)&&!/Haltebleche/.test(druckAlt),
   "eine alte Aufnahme druckt ohne die neuen Abschnitte");
 p(/Einlaufblech gerade/.test(druckAlt)&&!/\bNaN\b/.test(druckAlt),"und sonst unveraendert");

 console.log("\nN · Tablet-Breiten: nichts laeuft seitlich hinaus");
 await page.evaluate(()=>{
  ebA.stuecke=[{laenge:2070,stossStoss:2000,gehrungLinks:false,gehrungRechts:true,winkel:90},
               {laenge:1450,stossStoss:1450,gehrungLinks:true,gehrungRechts:false,winkel:0}];
  ebA.massA=120; ebA.winkel=25; ebA.gava.aktiv=true;
  renderEinlaufblechAufnahme();
 });
 for(const w of [360,412,768,1024,1280]){
  await page.setViewportSize({width:w,height:1400});
  let schlimm=0;
  for(let n=1;n<=6;n++){
   await reg(page,n);
   const m=await page.evaluate(()=>{
    const br=document.documentElement.clientWidth, raus=[];
    document.querySelectorAll("#measTypeEinlaufblech *").forEach(el=>{
     const r=el.getBoundingClientRect();
     if(r.width>0&&r.right>br+1){
      let par=el.parentElement,scroll=false;
      while(par){const o=getComputedStyle(par).overflowX;
       if(o==="auto"||o==="scroll"){scroll=true;break}par=par.parentElement}
      if(!scroll)raus.push((el.id||el.className||el.tagName)+" right="+Math.round(r.right));}
    });
    return {raus:raus.slice(0,3),scrollt:document.documentElement.scrollWidth>br+1};
   });
   if(m.raus.length||m.scrollt)schlimm++;
  }
  p(schlimm===0,"Breite "+w+" px: alle sechs Register passen",schlimm);
 }
 await page.setViewportSize({width:412,height:1400});

 console.log("\nO · Keine JS-Fehler");
 p(fehler.length===0,"keine Seitenfehler",fehler.slice(0,3));

 await b.close();
 console.log("\npruefstand-einlaufblech-app: "+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN":"  - alle bestanden"));
 process.exit(fail?1:0);
})();
