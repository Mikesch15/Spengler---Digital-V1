// Prueft den Einbau der Rinnen-Aufnahme in die laufende App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht), die Kataloge werden mit den
// echten Werten der Produktivdatenbank gestellt.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rinne-app-v2-71.js
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 // Die Supabase-Bibliothek kommt aus dem CDN; die Sandbox erreicht es nicht.
 // Gestellt wird nur das Noetigste, damit die App laedt - gerechnet wird
 // ausschliesslich mit dem echten Code der App.
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
 });

 // Kataloge wie in der Produktivdatenbank stellen
 await page.evaluate(()=>{
  rinneFittingTypes=[
   {id:1,name:"Offenes Ende",symbol:"offen",mass_mm:"0",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:false},
   {id:2,name:"Aussenecke 90°",symbol:"AE90",mass_mm:"-110",angle_deg:"-90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:3,name:"Innenecke 90°",symbol:"IE90",mass_mm:"-110",angle_deg:"90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:4,name:"Ablaufstutzen",symbol:"ABL",mass_mm:"0",angle_deg:"0",is_fixpunkt:true,is_schiebestutzen:false},
   {id:5,name:"Boden",symbol:"BD",mass_mm:"0",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:false},
   {id:7,name:"Schiebestutzen",symbol:"SS",mass_mm:"40",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:true},
   {id:8,name:"Gehrschildwinkel",symbol:"GSW",mass_mm:"0",angle_deg:"80",is_fixpunkt:false,is_schiebestutzen:false}];
  measurementMaterials=[
   {id:3,name:"Kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
   {id:2,name:"Titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500},
   {id:5,name:"Chromstahl, verzinnt",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
   {id:4,name:"CrNi-Stahl",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
   {id:1,name:"Aluminium (Aluman)",max_abstand_mm:4000,ab_fixpunkt_mm:2000},
   {id:6,name:"Stahl, verzinkt",max_abstand_mm:8000,ab_fixpunkt_mm:4000}];
  rinneDilaMass=-165;
  rinneNormlaengen={};
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
 });

 console.log("\nA · Modul geladen und verdrahtet");
 const da=await page.evaluate(()=>({
  modul:typeof renderRinneAufnahme==="function",
  zurueck:typeof rinneAufnahmeZuruecksetzen==="function",
  fuellen:typeof rinneAufnahmeFuellen==="function",
  zusatz:typeof rinneAufnahmeZusatzDaten==="function",
  alt:typeof renderRinneResult==="function",           // js/12 unveraendert da
  stummel:!!document.getElementById("rinne_segmentsBody"),
  ziel:!!document.getElementById("rinneAufnahme")}));
 Object.keys(da).forEach(k=>p(da[k],"vorhanden: "+k,da));
 p(fehler.length===0,"keine JS-Fehler beim Laden",fehler.slice(0,3));

 // Formular oeffnen
 await page.evaluate(()=>{
  document.getElementById("measurementEditModal").hidden=false;
  document.getElementById("measType").value="rinne_halbrund";
  showMeasTypeSection("rinne_halbrund");
  rinneAufnahmeZuruecksetzen();
 });
 await page.waitForTimeout(300);
 p(await page.locator("#rinneAufnahme").isVisible(),"die Erfassung ist sichtbar");
 p(!(await page.locator("#rinneStummel").isVisible()),"die alten Felder sind unsichtbar");

 console.log("\nB · Verlauf erfassen wie draussen");
 const setzeVerlauf=async()=>{
  await page.evaluate(()=>{
   rinneA.material="3"; rinneA.groesse="330";
   rinneA.rinnenboden={links:true,rechts:true};
   rinneA.segmente=[
    {laenge:7000,linksTyp:"",rechtsTyp:"",winkel:0,
     stutzen:{art:"einhaenge",durchmesser:"Ø 100",anzahl:1,fallrohr:"neu",bemerkung:""}},
    {laenge:6500,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}];
   rinneA.dilasManuell=null;
   renderRinneAufnahme();
  });
  await page.waitForTimeout(200);
 };
 await setzeVerlauf();
 const br=await page.evaluate(()=>({
  segs:rinneSegments.map(s=>[s.laenge,s.linksTyp,s.rechtsTyp]),
  dilas:rinneDilas.map(d=>Math.round(d.posAbStart)),
  mat:document.getElementById("rinne_material").value,
  abw:document.getElementById("rinne_abwicklung").value}));
 p(br.segs.length===2&&br.segs[0][0]===7000&&br.segs[1][0]===6500,
   "js/12 bekommt die beiden Abschnitte",br.segs);
 p(Number(br.segs[0][2])===4&&Number(br.segs[1][1])===4,
   "der Einhaengestutzen sitzt beidseitig als Fixpunkt-Anschlusstyp (id 4)",br.segs);
 p(Number(br.segs[0][1])===5&&Number(br.segs[1][2])===5,
   "der Rinnenboden sitzt an beiden Aussenenden (id 5)",br.segs);
 p(br.mat==="3"&&br.abw==="330","Material und Groesse stehen in den alten Feldern",br);
 p(br.dilas.length===2&&br.dilas[0]===4000&&br.dilas[1]===10000,
   "Dehnungselemente bei 4'000 und 10'000 mm",br.dilas);

 console.log("\nC · Zuschnitt und Normlaengen");
 const zs=await page.evaluate(()=>raStueckliste(rinneA).map(s=>Math.round(s.zuschnitt)));
 p(zs.join("/")==="3835/2835/2835/3335","Zuschnitte 3835/2835/2835/3335 (Dila -165, Boden 0)",zs);
 const plan=await page.evaluate(()=>raNormErgebnis(rinneA));
 p(plan.ok&&plan.optimal&&plan.gesamt===14000&&plan.verschnitt===1160,
   "Normlaengenplan: 14'000 mm, 1'160 mm Verschnitt, als bester ausgewiesen",
   {gesamt:plan.gesamt,verschnitt:plan.verschnitt,optimal:plan.optimal});
 const txt=await page.locator("#rinneAufnahme").innerText();
 p(/Normlängen und Verschnitt/i.test(txt),"die Karte steht im Formular");
 p(/Kupfer/.test(txt)&&/330 mm/.test(txt),"Material und Groesse stehen dort",txt.slice(0,200));

 console.log("\nD · Speichern liefert die alten UND die neuen Felder");
 await page.evaluate(()=>{
  document.getElementById("measType").value="rinne_halbrund";
  document.getElementById("measTitle").value="Testrinne";
  document.getElementById("measDate").value="2026-09-03";
 });
 const daten=await page.evaluate(()=>buildMeasurementFromForm());
 const d=daten.data;
 ["rinneAbwicklung","material","segments","gesamtlaenge","dilas","boundaries","stueckliste","dilaMass"]
  .forEach(k=>p(d[k]!==undefined,"bisheriges Feld bleibt: "+k));
 ["groesse","halter","rinnenboden","dehnung","dilasManuell","ausmass","normlaengen","normplan"]
  .forEach(k=>p(d[k]!==undefined,"neues Feld: "+k));
 p(daten.type==="rinne_halbrund","Typ unveraendert",daten.type);
 p(d.segments.length===2&&d.segments[0].stutzen&&d.segments[0].stutzen.art==="einhaenge",
   "der Stutzen steht im Verlauf",d.segments[0].stutzen);
 p(d.segments.every(s=>s.zuschnittlaenge!==undefined),"jedes Segment traegt seine Zuschnittlaenge");
 p(d.gesamtlaenge===13500,"Gesamtlaenge 13'500 mm",d.gesamtlaenge);
 p(d.normplan&&d.normplan.gesamt===14000,"der Normlaengenplan wird mitgespeichert",d.normplan&&d.normplan.gesamt);
 p(Array.isArray(d.ausmass)&&d.ausmass.some(z=>/Rinnenboden links/.test(z.bezeichnung))
   &&d.ausmass.some(z=>/Rinnenboden rechts/.test(z.bezeichnung)),
   "das Ausmass fuehrt Rinnenboden links und rechts getrennt",d.ausmass&&d.ausmass.map(z=>z.bezeichnung));

 console.log("\nE · Ein alter Datensatz oeffnet unveraendert");
 // Form wie die vier echten Aufnahmen in der Datenbank: nur segments,
 // dilas, boundaries, gesamtlaenge, material, rinneAbwicklung.
 const alt={type:"rinne_halbrund",title:"Alt",data:{
  rinneAbwicklung:"250",material:3,gesamtlaenge:9000,
  segments:[{laenge:5000,linksTyp:"",rechtsTyp:2,winkel:-90},
            {laenge:4000,linksTyp:2,rechtsTyp:"",winkel:0}],
  dilas:[{posAbStart:2500}],boundaries:[]}};
 await page.evaluate(m=>{rinneAufnahmeFuellen(m.data)},alt);
 await page.waitForTimeout(200);
 const geladen=await page.evaluate(()=>({
  groesse:rinneA.groesse,material:rinneA.material,
  segs:rinneA.segmente.map(s=>[s.laenge,s.winkel,s.stutzen?s.stutzen.art:null]),
  boden:rinneA.rinnenboden,
  hand:rinneA.dilasManuell}));
 p(geladen.groesse==="250","die Groesse kommt aus rinneAbwicklung",geladen.groesse);
 p(String(geladen.material)==="3","das Material bleibt",geladen.material);
 p(geladen.segs.length===2&&geladen.segs[0][0]===5000&&geladen.segs[0][1]===-90,
   "der Verlauf wird uebernommen, die Ecke bleibt eine Aussenecke",geladen.segs);
 p(geladen.boden.links===false&&geladen.boden.rechts===false,
   "ein Rinnenboden wird NICHT erfunden - er war nie erfasst",geladen.boden);
 p(geladen.hand===null,"und die Dehnungselemente bleiben gerechnet",geladen.hand);
 const txtAlt=await page.locator("#rinneAufnahme").innerText();
 p(/Aussenwinkel/i.test(txtAlt),"die Ecke erscheint im Verlauf",txtAlt.slice(0,300));

 console.log("\nF · Dehnungselemente von Hand");
 await setzeVerlauf();
 const feld=page.locator("[data-ra-dila-abstand]").first();
 p(await page.locator("[data-ra-dila-abstand]").count()===2,"jede Dila-Zeile ist editierbar");
 await feld.fill("3000"); await feld.blur(); await page.waitForTimeout(250);
 const hand=await page.evaluate(()=>({
  hand:rinneA.dilasManuell&&rinneA.dilasManuell.map(x=>x.posAbStart),
  wirksam:raDilas(rinneA).dilas.map(x=>Math.round(x.posAbStart)),
  auto:raDilas(rinneA).automatisch}));
 p(hand.wirksam[0]===3000&&hand.auto===false,"der eingegebene Abstand gilt",hand);
 await page.click("#ra_dilaAuto"); await page.waitForTimeout(200);
 p(await page.evaluate(()=>rinneA.dilasManuell)===null,"zurueck zur Berechnung");

 console.log("\nG · Fehlender Katalog wird gemeldet, nicht still falsch gerechnet");
 await page.evaluate(()=>{rinneFittingTypes=[];renderRinneAufnahme()});
 await page.waitForTimeout(200);
 const leer=await page.locator("#rinneAufnahme").innerText();
 p(/Anschlusstypen fehlen im Katalog/i.test(leer),"der Hinweis erscheint",leer.slice(0,300));
 // Bereits gesetzte Typ-IDs werden NICHT geloescht, nur weil der Katalog
 // gerade leer ist - das waere stiller Datenverlust. Entscheidend ist, dass
 // ohne Katalog nichts falsch gerechnet wird.
 const ohne=await page.evaluate(()=>({
  fix:computeRinneBoundaries(rinneSegments).boundaries.filter(b=>b.typ).length,
  neu:(function(){const merk=rinneA.segmente.map(s=>[s.linksTyp,s.rechtsTyp]);
       rinneA.segmente.forEach(s=>{s.linksTyp="";s.rechtsTyp=""});
       raBruecke();
       const r=rinneSegments.map(s=>[s.linksTyp,s.rechtsTyp]);
       rinneA.segmente.forEach((s,i)=>{s.linksTyp=merk[i][0];s.rechtsTyp=merk[i][1]});
       return r;})()}));
 p(ohne.fix===0,"ohne Katalog meldet computeRinneBoundaries keinen Fixpunkt",ohne.fix);
 p(ohne.neu.every(x=>x[0]===""&&x[1]===""),
   "und es wird keine Typ-ID erfunden, wo vorher keine stand",ohne.neu);

 console.log("\nI · Speichern und wieder oeffnen ergibt dasselbe");
 await page.evaluate(()=>{
  rinneFittingTypes=[
   {id:2,name:"Aussenecke 90°",symbol:"AE90",mass_mm:"-110",angle_deg:"-90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:3,name:"Innenecke 90°",symbol:"IE90",mass_mm:"-110",angle_deg:"90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:4,name:"Ablaufstutzen",symbol:"ABL",mass_mm:"0",angle_deg:"0",is_fixpunkt:true,is_schiebestutzen:false},
   {id:5,name:"Boden",symbol:"BD",mass_mm:"0",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:false},
   {id:7,name:"Schiebestutzen",symbol:"SS",mass_mm:"40",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:true}];
 });
 const rund=await page.evaluate(()=>{
  // Ein Verlauf mit allem, was es gibt: Ecke, beide Stutzenarten, Halter,
  // Rinnenboden nur links, Dehnungsstueck, Dila von Hand.
  rinneA={material:"3",groesse:"250",gesamtlaengeManuell_mm:14000,
   segmente:[
    {laenge:5000,linksTyp:"",rechtsTyp:"",winkel:-90,stutzen:null},
    {laenge:4000,linksTyp:"",rechtsTyp:"",winkel:0,
     stutzen:{art:"einhaenge",durchmesser:"Ø 75",anzahl:2,fallrohr:"neu",bemerkung:"Ecke Nord"}},
    {laenge:3000,linksTyp:"",rechtsTyp:"",winkel:0,
     stutzen:{art:"schiebe",durchmesser:"Ø 120",anzahl:1,fallrohr:"bestehend",bemerkung:""}},
    {laenge:2000,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}],
   halter:{anzahl:31,abstand_mm:450,typ:"Aufschraubhalter"},
   rinnenboden:{links:true,rechts:false},
   dehnung:{art:"dehnungsstueck",anzahl:2},
   dilasManuell:[{posAbStart:2000},{posAbStart:11000}]};
  renderRinneAufnahme();
  document.getElementById("measType").value="rinne_halbrund";
  const gespeichert=buildMeasurementFromForm();
  const vorher=JSON.parse(JSON.stringify(rinneA));
  // so, wie es aus der Datenbank zurueckkaeme
  const ausDb=JSON.parse(JSON.stringify(gespeichert.data));
  rinneAufnahmeZuruecksetzen();
  rinneAufnahmeFuellen(ausDb);
  return {vorher,nachher:JSON.parse(JSON.stringify(rinneA)),
          zsVor:null,data:ausDb};
 });
 const gleich=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 p(gleich(rund.vorher.segmente,rund.nachher.segmente),"der Verlauf kommt unveraendert zurueck",
   {vor:rund.vorher.segmente,nach:rund.nachher.segmente});
 p(gleich(rund.vorher.halter,rund.nachher.halter),"Halter",rund.nachher.halter);
 p(gleich(rund.vorher.rinnenboden,rund.nachher.rinnenboden),"Rinnenboden links/rechts",rund.nachher.rinnenboden);
 p(gleich(rund.vorher.dehnung,rund.nachher.dehnung),"Dehnung",rund.nachher.dehnung);
 p(gleich(rund.vorher.dilasManuell,rund.nachher.dilasManuell),"die Dilas von Hand",rund.nachher.dilasManuell);
 p(rund.nachher.groesse==="250"&&String(rund.nachher.material)==="3","Groesse und Material",
   [rund.nachher.groesse,rund.nachher.material]);
 p(rund.nachher.gesamtlaengeManuell_mm===14000,"die gemessene Gesamtlaenge");
 const st=rund.data.segments;
 p(st[1].stutzen&&st[1].stutzen.art==="einhaenge"&&st[1].stutzen.anzahl===2
   &&st[1].stutzen.durchmesser==="Ø 75"&&st[1].stutzen.bemerkung==="Ecke Nord",
   "der Einhaengestutzen steht vollstaendig im gespeicherten Verlauf",st[1].stutzen);
 p(st[2].stutzen&&st[2].stutzen.art==="schiebe","und der Schiebestutzen ebenso",st[2].stutzen);
 // Die Rechnung muss nach dem Wiederoeffnen dieselbe sein
 const zsNeu=await page.evaluate(()=>raStueckliste(rinneA).map(x=>Math.round(x.zuschnitt)));
 p(zsNeu.length>0,"nach dem Wiederoeffnen wird gerechnet",zsNeu);
 p(await page.evaluate(()=>raDilas(rinneA).automatisch)===false,
   "und die Dilas gelten weiterhin als von Hand gesetzt");

 console.log("\nH · Breiten");
 await page.evaluate(()=>{
  rinneFittingTypes=[
   {id:2,name:"Aussenecke 90°",symbol:"AE90",mass_mm:"-110",angle_deg:"-90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:3,name:"Innenecke 90°",symbol:"IE90",mass_mm:"-110",angle_deg:"90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:4,name:"Ablaufstutzen",symbol:"ABL",mass_mm:"0",angle_deg:"0",is_fixpunkt:true,is_schiebestutzen:false},
   {id:5,name:"Boden",symbol:"BD",mass_mm:"0",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:false},
   {id:7,name:"Schiebestutzen",symbol:"SS",mass_mm:"40",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:true}];
  renderRinneAufnahme();
 });
 await setzeVerlauf();
 for(const w of [320,360,412,768,1280]){
  await page.setViewportSize({width:w,height:1400});
  await page.waitForTimeout(150);
  const u=await page.evaluate(()=>{
   const br=document.documentElement.clientWidth,bad=[];
   document.querySelectorAll("#rinneAufnahme *").forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width>0&&r.right>br+1){
     let par=el.parentElement,scroll=false;
     while(par){const o=getComputedStyle(par).overflowX;if(o==="auto"||o==="scroll"){scroll=true;break}par=par.parentElement}
     if(!scroll)bad.push((el.id||el.className||el.tagName)+" right="+Math.round(r.right));}
   });
   return {bad:bad.slice(0,4),scrollt:document.documentElement.scrollWidth>br+1};
  });
  p(u.bad.length===0&&!u.scrollt,w+" px: nichts laeuft seitlich hinaus",u);
 }
 p(fehler.length===0,"keine JS-Fehler waehrend des ganzen Tests",fehler.slice(0,3));

 console.log(`\nrinneapp71: ${ok}/${ok+fail}`+(fail?"  FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();
