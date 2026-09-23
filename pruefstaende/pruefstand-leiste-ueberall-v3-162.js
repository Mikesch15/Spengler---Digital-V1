// Prueft v3.162: die untere Leiste verschwindet nirgends mehr - und die
// zwei Folgen, die daran haengen.
//
// WORUM ES GEHT
// Gemeldet hat es der Anwender: "Wenn ich eine massaufnahme oeffne
// verschwinden die register unten immernoch, das darf niergends mehr so
// sein." Bis v3.161 war das Absicht: Bereiche standen im Rahmen,
// Erfassungsformulare blieben Vollbild.
//
// ZWEI VERSCHIEDENE URSACHEN, eine Loesung
//   Massaufnahme, Ausmass, Offerte, Leistung sind .modal mit z-index 500 -
//     sie LEGTEN sich ueber die Leiste (50).
//   Der Regierapport ist gar kein .modal, sondern ein eigener Schirm neben
//     #startScreen. Er verdeckte nichts: die App versteckte #startScreen,
//     und #a2Screen liegt darin. Die halbe Ansicht war weg.
//   Wer nur das erste behebt, hat den Rapport nicht behoben - Abschnitt B
//   misst ihn deshalb einzeln.
//
// WAS HIER GEPRUEFT WIRD
//   A  In jedem der fuenf Formulare liegt die Leiste frei und bedienbar.
//   B  Beim Regierapport zusaetzlich: #startScreen bleibt sichtbar.
//   C  Der Preis der neuen Freiheit: wer mitten im Formular auf die Leiste
//      tippt, verliert sonst seine Eingaben. Gefragt wird nur, wenn
//      wirklich etwas geaendert wurde - und ein "Nein" laesst das Formular
//      offen.
//   D  "Stammdaten bearbeiten" zeigt nur die Stammdaten. D3 ist die
//      Gegenprobe: der Projektstatus BLEIBT (er ist in der neuen Ansicht
//      nirgends sonst zu erreichen), und ueber "Projekte" ist das volle
//      Cockpit unveraendert da.
//   E  Die Knoepfe der Massaufnahme-Auswahl sind kleiner - aber nicht
//      kleiner als ein Finger (44px), und in der klassischen Ansicht
//      unveraendert.
//   F  DER AUSDRUCK. Die Rahmen-Regel fuer den Rapport setzt
//      position:fixed. Schluege das in den Druck durch, kaeme nur die
//      erste Seite heraus. F misst im Druckmodus.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-leiste-ueberall-v3-162.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Liegt etwas ueber der Mitte der Leiste? Dieselbe Messung wie in
// pruefstand-bereiche-v3-156 - nicht nachgebaut, sondern uebernommen,
// damit beide dasselbe meinen.
const rahmen=page=>page.evaluate(()=>{
 const leiste=$("a2Leiste");
 const r=leiste?leiste.getBoundingClientRect():null;
 let verdeckt=false,durch="";
 if(r&&r.height>0){
  const oben=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
  if(oben&&!(oben===leiste||leiste.contains(oben))){
   verdeckt=true; const m=oben.closest(".modal"); durch=m?m.id:(oben.id||oben.tagName);
  }
 }
 return {leisteDa:!!r&&r.height>0,verdeckt,durch,
         startScreenDa:$("startScreen")&&!$("startScreen").hidden};
});

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 // Die Rueckfrage in C wird gezielt beantwortet - deshalb kein pauschales
 // accept() wie sonst.
 let dialogAntwort=true, dialogTexte=[];
 page.on("dialog",d=>{dialogTexte.push(d.message()); dialogAntwort?d.accept():d.dismiss()});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  companyName="Muster Spenglerei AG";
  allProjects=window.__demo.projects.slice();
  measurementMaterials=[{id:1,name:"Titanzink",legacy_key:"titanzink"}];
  blechRollenbreiten=[1000,670,500];
  settings.rates=[["Meister",98]]; settings.employees=["Mike Ledermann"];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")
   pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,
                  werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  a2Setzen(true);
 });
 await page.waitForTimeout(400);

 let z=null;
 const aufraeumen=async()=>{
  await page.evaluate(()=>{
   document.querySelectorAll(".modal").forEach(m=>{if(m.id!=="authScreen")m.hidden=true});
   if($("reportScreen"))$("reportScreen").hidden=true;
   $("startScreen").hidden=false;
   if(typeof isDirty!=="undefined")isDirty=false;
   a2Zustand.bereich=null; a2Zustand.seite="heute"; a2Zustand.projektId=null; a2Zeichnen();
  });
  await page.waitForTimeout(200);
 };

 // ---- A  Die Leiste bleibt in jedem Formular ------------------------------
 // Geoeffnet wird ueber den ECHTEN Weg der App, nicht mit hidden=false.
 // Das ist nicht Kosmetik: die erste Fassung dieses Pruefstands setzte
 // hidden=false und war gruen, waehrend die Offerte in Wahrheit kaputt
 // war - drei Stellen der App (js/04, js/09, js/45) verstecken beim
 // Oeffnen zusaetzlich #startScreen, und #a2Screen liegt darin. Wer das
 // Formular von Hand einblendet, baut genau den Zustand, den es in der
 // App nicht gibt.
 const FORMULARE=[
  {name:"Massaufnahme", oeffnen:()=>newMeasurementWithType("einlaufblech_gerade"),
   id:"measurementEditModal"},
  {name:"Ausmass",      oeffnen:()=>{ if(typeof newAusmassWithType==="function")
     newAusmassWithType("skizze_foto"); else $("ausmassEditModal").hidden=false },
   id:"ausmassEditModal"},
  {name:"Offerte",      oeffnen:()=>{ offerteZugriff=true; newAngebot() },
   id:"angebotEditModal"},
  {name:"Leistung",     oeffnen:()=>{ if(typeof newLeistung==="function")newLeistung();
     else $("leistungEditModal").hidden=false },
   id:"leistungEditModal"}
 ];
 for(const f of FORMULARE){
  await aufraeumen();
  const auf=await page.evaluate(([quelle,id])=>{
   try{ (new Function("return ("+quelle+")"))()(); }catch(e){ return {fehler:String(e)} }
   return {offen:!$(id).hidden};
  },[f.oeffnen.toString(),f.id]);
  await page.waitForTimeout(400);
  const z=await rahmen(page);
  p(auf&&auf.offen,"A "+f.name+": laesst sich ueber den echten Weg oeffnen",auf);
  p(z.leisteDa&&!z.verdeckt,"A "+f.name+": die Leiste bleibt sichtbar und bedienbar",z);
  p(z.startScreenDa,
    "A "+f.name+": #startScreen bleibt sichtbar - sonst gaebe es die Leiste gar nicht",z);
 }

 // Der Weg, an dem es beim Bauen zerbrochen ist: ein Formular, das die App
 // oeffnet, NACHDEM sie #startScreen versteckt hat (js/45, Aufgabenliste).
 await aufraeumen();
 const aufgabenWeg=await page.evaluate(async()=>{
  $("startScreen").hidden=true;                 // genau das tut js/45
  newMeasurementWithType("einlaufblech_gerade");
  await new Promise(f=>setTimeout(f,300));
  return {startScreenDa:!$("startScreen").hidden, formularDa:!$("measurementEditModal").hidden};
 });
 await page.waitForTimeout(300);
 z=await rahmen(page);
 p(aufgabenWeg.startScreenDa&&z.leisteDa&&!z.verdeckt,
   "A5 auch wenn die App #startScreen zuerst versteckt, steht die Leiste wieder da",
   {aufgabenWeg,z});

 // ---- B  Der Regierapport, die zweite Ursache -----------------------------
 await aufraeumen();
 const B=await page.evaluate(()=>{
  const r=(window.__demo.reports||[])[0];
  if(typeof openReport==="function"&&r)openReport(r);
  else {$("startScreen").hidden=true;$("reportScreen").hidden=false}
  return {offen:!$("reportScreen").hidden};
 });
 await page.waitForTimeout(600);
 z=await rahmen(page);
 p(B.offen,"B1 der Regierapport ist offen",B);
 p(z.startScreenDa,
   "B2 #startScreen bleibt sichtbar - das war die eigentliche Ursache",z);
 p(z.leisteDa&&!z.verdeckt,"B3 und die Leiste liegt frei",z);

 // ---- C  Kein stiller Datenverlust ----------------------------------------
 // C1: nichts geaendert -> das Formular schliesst kommentarlos.
 await aufraeumen();
 dialogTexte=[];
 const C1=await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  if(typeof isDirty!=="undefined")isDirty=false;
  const weiter=a2FormularVerlassen();
  return {weiter, zu:$("measurementEditModal").hidden};
 });
 p(C1.weiter&&C1.zu&&dialogTexte.length===0,
   "C1 ohne Aenderung wird nicht gefragt - das Formular schliesst einfach",{C1,dialogTexte});

 // C2: geaendert und bestaetigt -> Formular zu.
 await aufraeumen();
 dialogTexte=[]; dialogAntwort=true;
 const C2=await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  isDirty=true;
  const weiter=a2FormularVerlassen();
  return {weiter, zu:$("measurementEditModal").hidden, dirty:isDirty};
 });
 p(C2.weiter&&C2.zu&&dialogTexte.length===1&&/ungespeicherte/i.test(dialogTexte[0]),
   "C2 mit Aenderung wird gefragt - und nach Ja ist das Formular zu",{C2,dialogTexte});

 // C3: geaendert und ABGELEHNT -> es passiert gar nichts. Das ist die
 // wichtigste Zusicherung des Abschnitts.
 await aufraeumen();
 dialogTexte=[]; dialogAntwort=false;
 const C3=await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  isDirty=true;
  const weiter=a2FormularVerlassen();
  return {weiter, offen:!$("measurementEditModal").hidden, dirty:isDirty};
 });
 p(!C3.weiter&&C3.offen&&C3.dirty,
   "C3 nach Nein bleibt das Formular offen UND die Aenderung gilt weiter",C3);
 dialogAntwort=true;

 // C4: der echte Weg - ein Tipp auf die Leiste bei offenem Formular.
 await aufraeumen();
 dialogTexte=[];
 const C4=await page.evaluate(async()=>{
  $("measurementEditModal").hidden=false;
  isDirty=false;
  const knopf=[...document.querySelectorAll("#a2Leiste [data-a2-tab]")]
   .find(x=>x.getAttribute("data-a2-tab")==="projekte");
  if(knopf)knopf.click();
  await new Promise(f=>setTimeout(f,400));
  return {zu:$("measurementEditModal").hidden, seite:a2Zustand.seite};
 });
 p(C4.zu&&C4.seite==="projekte",
   "C4 ein Tipp auf die Leiste schliesst das Formular und wechselt die Seite",C4);

 // ---- D  Stammdaten ohne das ganze Cockpit --------------------------------
 await aufraeumen();
 const D=await page.evaluate(async()=>{
  const p0=allProjects.find(x=>!x.archived);
  a2Zustand.seite="projekt"; a2Zustand.projektId=p0.id;
  if(typeof openProjectCockpitZumBearbeiten==="function")
   await openProjectCockpitZumBearbeiten(Number(p0.id));
  $("projectCockpitModal").classList.add("a2-nur-stammdaten");
  await new Promise(f=>setTimeout(f,300));
  const sicht=el=>!!el&&getComputedStyle(el).display!=="none"&&el.getBoundingClientRect().height>0;
  return {
   formular: sicht($("cockpitStammdaten")),
   stand:    sicht($("cockpitStandBox")),
   bereiche: [...document.querySelectorAll("#projectCockpitModal .card.klapp")].filter(sicht).length,
   status:   sicht($("cockpitStatus")),
   zurueck:  sicht($("cockpitBack"))
  };
 });
 p(D.formular,"D1 das Stammdaten-Formular steht da",D);
 p(!D.stand&&D.bereiche===0,
   "D2 der Arbeitsstand und alle Arbeitsbereiche sind weg",D);
 p(D.status,"D3 Gegenprobe: der Projektstatus bleibt - sonst waere er nirgends erreichbar",D);
 p(D.zurueck,"D4 und der Weg zurueck ist da",D);

 // Gegenprobe: ohne die Marke ist das volle Cockpit unveraendert da.
 const D5=await page.evaluate(()=>{
  $("projectCockpitModal").classList.remove("a2-nur-stammdaten");
  const sicht=el=>!!el&&getComputedStyle(el).display!=="none"&&el.getBoundingClientRect().height>0;
  return {stand:sicht($("cockpitStandBox")),
          bereiche:[...document.querySelectorAll("#projectCockpitModal .card.klapp")].filter(sicht).length};
 });
 p(D5.stand&&D5.bereiche>0,
   "D5 Gegenprobe: ohne die Marke ist das volle Cockpit unveraendert da",D5);

 // ---- E  Kleinere Knoepfe der Typ-Auswahl ---------------------------------
 await aufraeumen();
 const E=await page.evaluate(()=>{
  if(typeof renderMeasTypeChooser==="function")renderMeasTypeChooser();
  $("measTypeChooserModal").hidden=false;
  const k=document.querySelector("#measTypeChooserModal .start-nav-btn");
  if(!k)return null;
  const r=k.getBoundingClientRect(), st=getComputedStyle(k);
  return {hoehe:Math.round(r.height), richtung:st.flexDirection,
          schrift:st.fontSize};
 });
 p(E&&E.hoehe<=72,"E1 die Knoepfe sind deutlich niedriger als die alten Kacheln",E);
 p(E&&E.hoehe>=44,"E2 aber nicht kleiner als ein Finger (44px)",E);
 p(E&&E.richtung==="row","E3 Symbol und Text stehen nebeneinander, nicht uebereinander",E);

 const E4=await page.evaluate(()=>{
  a2Setzen(false);
  const k=document.querySelector("#measTypeChooserModal .start-nav-btn");
  const r=k?k.getBoundingClientRect():null;
  const st=k?getComputedStyle(k):null;
  const raus={hoehe:r?Math.round(r.height):0, richtung:st?st.flexDirection:""};
  a2Setzen(true);
  return raus;
 });
 p(E4.richtung==="column"&&E4.hoehe>72,
   "E4 Gegenprobe: in der klassischen Ansicht sind die Kacheln unveraendert",E4);

 // ---- F  Der Ausdruck bleibt unberuehrt -----------------------------------
 await aufraeumen();
 const F=await page.evaluate(()=>{$("reportScreen").hidden=false; return true});
 await page.emulateMedia({media:"print"});
 await page.waitForTimeout(200);
 const fDruck=await page.evaluate(()=>{
  const st=getComputedStyle($("reportScreen"));
  return {position:st.position, top:st.top, zIndex:st.zIndex};
 });
 await page.emulateMedia({media:"screen"});
 await page.waitForTimeout(200);
 const fSchirm=await page.evaluate(()=>getComputedStyle($("reportScreen")).position);
 p(fDruck.position!=="fixed",
   "F1 im DRUCK ist der Rapport nicht fixiert - sonst kaeme nur die erste Seite",fDruck);
 p(fSchirm==="fixed",
   "F2 Gegenprobe: am Bildschirm ist er es sehr wohl - sonst waere A/B nicht erklaerbar",
   {fSchirm});

 // ---- G  Was WEITERHIN ueber allem liegen muss ---------------------------
 // Beim Bauen ist aufgefallen, dass der Rahmen (z-index 30) nicht nur die
 // Leiste freilegt, sondern das Formular auch unter alles legt, was
 // zwischen 30 und 500 liegt. Fuer den Sperrbildschirm einer gesperrten
 // Firma ist das RICHTIG so - vorher lag das Formular mit z-index 500
 // darueber, und man konnte in einer gesperrten Firma weiterarbeiten.
 // Gefunden hat das der Pruefstand der Offertenerkennung; hier steht es
 // als Zusicherung, damit es nicht unbemerkt zurueckfaellt.
 await aufraeumen();
 const G=await page.evaluate(()=>{
  $("angebotEditModal").hidden=false;
  $("companyLockedScreen").hidden=false;
  const sperr=$("companyLockedScreen"), r=sperr.getBoundingClientRect();
  const o=document.elementFromPoint(Math.round(r.width/2),Math.round(r.height/2));
  const drin=!!(o&&(o===sperr||sperr.contains(o)));
  $("companyLockedScreen").hidden=true;
  return {drin, element:o?(o.id||o.className||o.tagName):"nichts"};
 });
 p(G.drin,
   "G2 der Sperrbildschirm einer gesperrten Firma liegt UEBER dem Formular - "
   +"in einer gesperrten Firma wird nicht weitergearbeitet",G);

 p(fehler.length===0,"G1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
