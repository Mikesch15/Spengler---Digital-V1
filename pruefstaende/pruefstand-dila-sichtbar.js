// Prueft, dass die Dehnungselemente sichtbar sind und nicht nur im
// Hintergrund gerechnet werden - so wie in der Testapp.
// Aufruf: SP=<Ordner mit node_modules> node pruefstaende/pruefstand-dila-sichtbar.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
// Hinweis: die App schreibt Ueberschriften und kleine Etiketten per CSS
// gross (text-transform:uppercase), und innerText gibt genau das zurueck.
// Geprueft wird deshalb der Inhalt, nicht die Schreibweise (/i).
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

async function starte(b,breite){
 const page=await b.newPage({viewport:{width:breite||412,height:1500}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(350);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"L"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"L"}];
  meineRechte={admin:true}; allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  rinneFittingTypes=[
   {id:2,name:"Aussenecke 90°",symbol:"AE90",mass_mm:"-110",angle_deg:"-90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:3,name:"Innenecke 90°",symbol:"IE90",mass_mm:"-110",angle_deg:"90",is_fixpunkt:true,is_schiebestutzen:false},
   {id:4,name:"Ablaufstutzen",symbol:"ABL",mass_mm:"0",angle_deg:"0",is_fixpunkt:true,is_schiebestutzen:false},
   {id:5,name:"Boden",symbol:"BD",mass_mm:"0",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:false},
   {id:7,name:"Schiebestutzen",symbol:"SS",mass_mm:"40",angle_deg:"0",is_fixpunkt:false,is_schiebestutzen:true}];
  measurementMaterials=[
   {id:3,name:"Kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
   {id:6,name:"Stahl, verzinkt",max_abstand_mm:8000,ab_fixpunkt_mm:4000}];
  rinneDilaMass=-165; rinneNormlaengen={};
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  document.getElementById("measurementEditModal").hidden=false;
  showMeasTypeSection("rinne_halbrund");
 });
 return {page,fehler};
}
const setze=(page,laenge,material)=>page.evaluate(([L,m])=>{
 rinneA.material=m; rinneA.groesse=330;
 rinneA.segmente=[{laenge:L,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}];
 rinneA.dilasManuell=null;
 renderRinneAufnahme();
},[laenge,material]);
const zeige=(page,n)=>page.evaluate(k=>{raSetzeSchritt(k);
 return document.getElementById("rinneAufnahme").innerText},n);

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const {page,fehler}=await starte(b);

 console.log("\nA · 14 m Kupfer: die Rechnung ergibt zwei Dehnungselemente");
 await setze(page,14000,3);
 const soll=await page.evaluate(()=>raDilasGerechnet(rinneA).dilas.map(d=>Math.round(d.posAbStart)));
 p(soll.length===2,"gerechnet: 2 Dehnungselemente",soll);
 p(soll[0]===4667&&soll[1]===9333,"Positionen 4667 / 9333",soll);

 console.log("\nB · 2 · Verlauf: die Rauten sind erklaert");
 const t2=await zeige(page,2);
 p(/Dehnungselement/.test(t2),"Legende nennt das Dehnungselement");
 p(/◆/.test(t2),"Legende zeigt das Zeichen der Raute");
 p(/Ecke \(Fixpunkt\)/.test(t2)&&/Schiebestutzen/.test(t2),"Legende erklaert auch Ecke und Stutzen");

 console.log("\nC · 3 · Dehnung steht in einem eigenen Block");
 const t3=await zeige(page,3);
 p(/Rinnenboden und Dehnung/i.test(t3),"eigener Block 'Rinnenboden und Dehnung'");
 p(/Rinnenhalter/i.test(t3),"Halter als eigener Block");
 p(/Stutzen/i.test(t3),"Stutzen als eigener Block");
 p(/Berechnet/i.test(t3)&&/\b2\b[\s\S]{0,3}Dehnungselement/.test(t3),"Anzahl steht da",t3.replace(/\n/g," | ").slice(0,240));
 p(/Dehnungselement 1 bei .*4.667 mm ab START/.test(t3),"Position 1 steht da");
 p(/Dehnungselement 2 bei .*9.333 mm ab START/.test(t3),"Position 2 steht da");
 p(/6 · Zuschnitt/.test(t3),"Verweis auf 6 · Zuschnitt");
 const knoepfe=await page.evaluate(()=>({
  ueb:!!document.getElementById("ra_dehnungUebernehmen"),
  zu6:!!document.querySelector('[data-ra-zu="4"]'),
  zu2:!!document.querySelector('[data-ra-zu="2"]')}));
 p(knoepfe.ueb,"Knopf 'Als Dehnungsstuecke uebernehmen'");
 p(knoepfe.zu6,"Knopf zur Stueckliste (dort stehen die Positionen)");
 p(knoepfe.zu2,"Knopf zurueck zum Verlauf");

 console.log("\nD · Uebernehmen traegt die Anzahl ein");
 const ueb=await page.evaluate(()=>{const b=document.getElementById("ra_dehnungUebernehmen");
  if(!b)return false; b.click(); return true;});
 p(ueb,"Uebernehmen-Knopf vorhanden und bedienbar");
 await page.waitForTimeout(120);
 const de=await page.evaluate(()=>({art:rinneA.dehnung.art,anzahl:rinneA.dehnung.anzahl,
   schritt:raSchritt,feld:!!document.getElementById("ra_dehnungAnzahl")}));
 p(de.art==="dehnungsstueck","Art auf Dehnungsstueck",de);
 p(de.anzahl===2,"Anzahl 2 uebernommen",de);
 p(de.feld,"Feld 'Anzahl Dehnungsstuecke' erscheint",de);
 p(de.schritt===3,"bleibt im Register 3",de);
 const amText=await zeige(page,6);
 p(/Dehnungsst/i.test(amText),"Dehnungsstuecke stehen jetzt im Ausmass");

 console.log("\nE · Sprung in die Stueckliste");
 await zeige(page,3);
 await page.evaluate(()=>{const b=document.querySelector('[data-ra-zu="4"]');if(b)b.click()});
 await page.waitForTimeout(150);
 const nach=await page.evaluate(()=>({schritt:raSchritt,
   felder:document.querySelectorAll("[data-ra-dila-abstand]").length,
   auto:document.getElementById("ra_dilaAuto")?document.getElementById("ra_dilaAuto").disabled:null}));
 p(nach.schritt===4,"Register 4 (Stueckliste) offen",nach);
 p(nach.felder===2,"zwei anpassbare Dila-Abstaende",nach);
 p(nach.auto===true,"'Zurueck zur Berechnung' noch gesperrt",nach);

 console.log("\nF · Von Hand angepasst und wieder zurueck");
 const getippt=await page.evaluate(()=>{const f=document.querySelector("[data-ra-dila-abstand]");
  if(!f)return false;
  f.value="3000"; f.dispatchEvent(new Event("change",{bubbles:true})); return true;});
 p(getippt,"Dila-Abstand ist ueberhaupt anpassbar");
 await page.waitForTimeout(150);
 const hand=await page.evaluate(()=>({manuell:Array.isArray(rinneA.dilasManuell),
   pos:(rinneA.dilasManuell||[]).map(d=>Math.round(d.posAbStart))}));
 p(hand.manuell,"Anpassung schaltet auf 'von Hand'",hand);
 p(hand.pos[0]===3000,"erste Position 3000",hand);
 const t3h=await zeige(page,3);
 p(/Von Hand festgelegt/i.test(t3h),"Register 3 sagt 'Von Hand festgelegt'");
 p(/Dehnungselement 1 bei .*3.000 mm ab START/.test(t3h),"Register 3 zeigt die neue Position");
 p(/Von Hand angepasst/i.test(t3h),"Hinweis, dass nicht mehr gerechnet wird");
 await zeige(page,4);
 const autoDa=await page.evaluate(()=>{const b=document.getElementById("ra_dilaAuto");
  if(!b||b.disabled)return false; b.click(); return true;});
 p(autoDa,"'Zurueck zur Berechnung' ist jetzt bedienbar");
 await page.waitForTimeout(150);
 const zurueck=await page.evaluate(()=>({manuell:rinneA.dilasManuell,
   pos:raDilas(rinneA).dilas.map(d=>Math.round(d.posAbStart))}));
 p(zurueck.manuell===null,"zurueck auf gerechnet",zurueck);
 p(zurueck.pos.join()==="4667,9333","Rechnung wieder wie vorher",zurueck);

 console.log("\nG · Ehrlich, wenn kein Dehnungselement noetig ist");
 await setze(page,3000,6);          // 3 m Stahl verzinkt
 const t3k=await zeige(page,3);
 const kein=await page.evaluate(()=>({dilas:raDilas(rinneA).dilas.length,
   ueb:!!document.getElementById("ra_dehnungUebernehmen")}));
 p(kein.dilas===0,"kein Dehnungselement noetig",kein);
 p(/kein zusätzliches Dehnungselement nötig/i.test(t3k),"wird ausdruecklich gesagt");
 p(!kein.ueb,"kein Uebernehmen-Knopf ohne Dehnungselement",kein);
 p(!/Dehnungselement 1 bei/.test(t3k),"keine erfundene Position");

 console.log("\nH · Rechnung unveraendert");
 await setze(page,14000,3);
 const gleich=await page.evaluate(()=>{
  const a=raDilasGerechnet(rinneA).dilas.map(d=>Math.round(d.posAbStart));
  raBruecke();
  return {a,brueckeDilas:rinneDilas.map(d=>Math.round(d.posAbStart)),
          segs:rinneSegments.length};
 });
 p(gleich.a.join()===gleich.brueckeDilas.join(),"Bruecke gibt dieselben Positionen an js/12",gleich);
 p(gleich.segs>=1,"Segmente stehen fuer js/12 bereit",gleich);

 console.log("\nI · Stutzen-Block zaehlt und fuehrt zurueck");
 await page.evaluate(()=>{
  rinneA.segmente=[{laenge:6000,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:{art:"einhaenge",durchmesser:"100",anzahl:1}},
                   {laenge:6000,linksTyp:"",rechtsTyp:"",winkel:0,stutzen:null}];
  renderRinneAufnahme();
 });
 const t3s=await zeige(page,3);
 p(/Einhängestutzen \(Fixpunkt\)/i.test(t3s),"Einhaengestutzen gezaehlt");
 await page.evaluate(()=>{const b=document.querySelector('[data-ra-zu="2"]');if(b)b.click()});
 await page.waitForTimeout(150);
 p(await page.evaluate(()=>raSchritt)===2,"Knopf fuehrt in den Verlauf");

 console.log("\nJ · Keine JS-Fehler");
 p(fehler.length===0,"keine Seitenfehler",fehler);
 await page.close();

 console.log("\nK · Breiten: nichts laeuft seitlich hinaus");
 for(const w of [320,360,390,412,768]){
  const s=await starte(b,w);
  await setze(s.page,14000,3);
  for(const reg of [2,3,6]){
   await zeige(s.page,reg);
   const m=await s.page.evaluate(()=>{
    const br=document.documentElement.clientWidth, schlimm=[];
    document.querySelectorAll("#rinneAufnahme *").forEach(el=>{
     const r=el.getBoundingClientRect();
     if(r.width>0&&r.right>br+1){
      // In einem seitwaerts scrollenden Behaelter (Registerleiste, .scroll)
      // ist das kein Ueberlauf, sondern die Absicht.
      let par=el.parentElement,scrollbar=false;
      while(par){const o=getComputedStyle(par).overflowX;
       if(o==="auto"||o==="scroll"){scrollbar=true;break}par=par.parentElement}
      if(!scrollbar)schlimm.push((el.id||el.className||el.tagName)+" right="+Math.round(r.right));}
    });
    return {schlimm:schlimm.slice(0,3),breite:br,
            scrollt:document.documentElement.scrollWidth>br+1};
   });
   p(m.schlimm.length===0&&!m.scrollt,"Breite "+w+" px, Register "+reg,m);
  }
  await s.page.close();
 }

 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();
