// Prueft v3.191: Die Einfassung rund reicht ihre Masse an den
// Abwicklungsrechner weiter.
//
// GEWUENSCHT
// "jetzt müsste das ganze mit der massaufnahme einfassung rund verknüpft
//  werden können, so dass die masse von dort in die abwicklung fliessen"
//
// WARUM DAS FACHLICH ZUSAMMENGEHOERT
// Die Einfassung rund modelliert den QUERSCHNITT (a, b, c) und sagt im
// Kopfkommentar von js/21 ausdruecklich: "das Rohr wird nicht als
// Abwicklung um sich selbst modelliert". Genau dieses Rohr rechnet der
// Abwicklungsrechner - die beiden ergaenzen sich, sie ueberschneiden sich
// nicht.
//
// WAS FLIESST
//   D       <- Oe Standrohr dieser Einfassung
//   alpha   <- die DACHNEIGUNG. Achtung: angezeigt wird der Winkel
//              Dach/Rohr (Dachneigung + 90), gespeichert die Dachneigung.
//              Genau die ist der Schnittwinkel - es darf NICHT noch einmal
//              umgerechnet werden. Diese Verwechslung ist der teuerste
//              Fehler, den diese Bruecke machen koennte, und Abschnitt A
//              rechnet sie deshalb von Hand nach.
//   t       <- Materialstaerke der Massaufnahme (js/61)
//   H, b    <- Richtwerte aus den Einstellungen der Einfassung rund.
//              0 heisst dort "nicht gesetzt" und wird NICHT uebernommen.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-abwicklung-einfassung-v3-191.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
const nurCode=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")
                  .replace(/"(\\.|[^"\\])*"/g,'""').replace(/'(\\.|[^'\\])*'/g,"''")
                  .replace(/`(\\.|[^`\\])*`/g,"``");

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{if(typeof a2Setzen==="function")a2Setzen(false)});
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1",first_name:"Mike",last_name:"L"};
  meineRechte={admin:true,kataloge:true,lager:true};
  allProjects=[{id:7,name:"Musterstrasse 1"}];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  if(typeof showStart==="function")showStart();
  sb.from=()=>({select:()=>({order:()=>({limit:async()=>({data:[],error:null})})}),
                insert:(satz)=>{window.__insert=satz;
                  return {select:async()=>({data:[Object.assign({id:1},satz)],error:null})}},
                delete:()=>({eq:()=>({select:async()=>({data:[],error:null})})})});
  // Eine offene Massaufnahme "Einfassung rund" mit einem Rohr.
  measSelectedProjectId=7;
  currentMeasurementId=4242;
  if(typeof measStaerkeSetzen==="function")measStaerkeSetzen(0.6);
  einfA={material:"",deckung:"biber_einfach",lattenabstand:330,aktiv:0,rollenAuswahl:[],
         einfassungen:[{bez:"Dunstrohr Nord",durchmesser:110,winkel:25,a:250,b:200,c:35,anzahl:1}]};
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD,{rohrhoehe:0,schweifbord:0});
 });

 // ---- A  Was die Bruecke herausrechnet ------------------------------------
 console.log("\nA · Welche Masse die Bruecke herausrechnet");
 const A=await page.evaluate(()=>einfaAbwicklungVorgabe(0));
 p(A&&A.werte.D===110,"Ø Standrohr 110 wird Durchmesser D",A&&A.werte);
 // Der Winkel ist die Falle: angezeigt 115 (Dach/Rohr), gespeichert 25
 // (Dachneigung). Der Schnittwinkel ist die DACHNEIGUNG.
 p(A&&A.werte.alpha===25,"die DACHNEIGUNG 25 wird Schnittwinkel alpha - nicht die angezeigten 115",A&&A.werte);
 p(A&&A.werte.alpha!==115&&A.werte.alpha!==-65,
   "weder der angezeigte Winkel noch eine doppelte Umrechnung",A&&A.werte);
 p(A&&A.werte.t===0.6,"die Materialstärke der Massaufnahme wird t",A&&A.werte);
 p(A&&A.werte.H===undefined&&A.werte.b===undefined,
   "Richtwert 0 heisst NICHT GESETZT und wird nicht uebernommen",A&&A.werte);
 p(A&&A.measurementId===4242&&A.projectId===7,"Massaufnahme und Projekt haengen dran",A);
 p(A&&A.bezeichnung.indexOf("Dunstrohr Nord")>=0&&A.bezeichnung.indexOf("110")>=0,
   "die Bezeichnung nennt Rohr und Durchmesser",A&&A.bezeichnung);

 // Gesetzte Richtwerte fliessen mit.
 const A2=await page.evaluate(()=>{
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD,{rohrhoehe:150,schweifbord:30});
  return einfaAbwicklungVorgabe(0);
 });
 p(A2.werte.H===150&&A2.werte.b===30,"gesetzte Richtwerte fliessen mit",A2.werte);
 p(A2.uebernommen.length===5,"und werden als uebernommen gemeldet",A2.uebernommen);

 // Ein Flachdach: 0 Grad ist ein GUELTIGER Winkel und darf nicht als
 // "nicht gesetzt" durchfallen.
 const A3=await page.evaluate(()=>{
  einfaListe()[0].winkel=0;
  const v=einfaAbwicklungVorgabe(0);
  einfaListe()[0].winkel=25;
  return v;
 });
 p(A3.werte.alpha===0,"Winkel 0 (Flachdach) wird uebernommen, nicht verworfen",A3.werte);

 // ---- B  Die Uebernahme setzt nur, was da ist -----------------------------
 console.log("\nB · Die Übernahme in die Abwicklung");
 const B=await page.evaluate(async()=>{
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD,{rohrhoehe:0,schweifbord:0});
  abwFelderSetzen(ABW_STANDARD);
  const vorherH=$("abw_H").value, vorherB=$("abw_b").value;
  await abwAusMassaufnahme(einfaAbwicklungVorgabe(0));
  return {offen:!$("abwicklungModal").hidden,
          D:$("abw_D").value, alpha:$("abw_alpha").value, t:$("abw_t").value,
          H:$("abw_H").value, b:$("abw_b").value, vorherH, vorherB,
          bez:$("abw_bezeichnung").value, projekt:$("abw_projekt").value,
          herkunft:$("abwHerkunft").innerHTML};
 });
 p(B.offen===true,"der Abwicklungsrechner geht auf");
 p(B.D==="110"&&B.alpha==="25"&&B.t==="0.6","Ø, Winkel und Stärke stehen im Formular",B);
 p(B.H===B.vorherH&&B.b===B.vorherB,
   "Rohrhöhe und Schweifbord-Breite bleiben unangetastet, wenn kein Richtwert gesetzt ist",
   [B.H,B.vorherH,B.b,B.vorherB]);
 p(B.projekt==="7","das Projekt ist gewaehlt",B.projekt);
 p(B.bez.indexOf("Dunstrohr Nord")>=0,"die Bezeichnung ist vorgeschlagen",B.bez);

 // ---- C  Die Herkunft nennt BEIDES ----------------------------------------
 console.log("\nC · Der Hinweis nennt auch, was NICHT übernommen wurde");
 p(B.herkunft.indexOf("Einfassung rund")>=0,"woher die Masse kommen",B.herkunft.slice(0,200));
 p(B.herkunft.indexOf("Ø Standrohr")>=0&&B.herkunft.indexOf("Materialstärke")>=0,
   "was uebernommen wurde",B.herkunft.slice(0,300));
 p(B.herkunft.indexOf("nicht übernommen")>=0&&B.herkunft.indexOf("Rohrhöhe")>=0,
   "UND was nicht - sonst raet der Anwender, welche Zahl er noch pruefen muss",B.herkunft.slice(0,400));
 const C2=await page.evaluate(async()=>{
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD,{rohrhoehe:150,schweifbord:30});
  await abwAusMassaufnahme(einfaAbwicklungVorgabe(0));
  return {herkunft:$("abwHerkunft").innerHTML,H:$("abw_H").value,b:$("abw_b").value};
 });
 p(C2.H==="150"&&C2.b==="30","mit Richtwerten stehen auch H und b im Formular",C2);
 p(C2.herkunft.indexOf("nicht übernommen")<0,"dann faellt der Hinweis auf Fehlendes weg");

 // ---- D  Speichern haengt die Massaufnahme an -----------------------------
 console.log("\nD · Speichern");
 const D=await page.evaluate(async()=>{
  window.__insert=null;
  const r=await abwSpeichern();
  return {r,satz:window.__insert};
 });
 p(D.r&&D.r.ok===true,"gespeichert",D.r);
 p(D.satz&&D.satz.measurement_id===4242,"die Abwicklung haengt an DIESER Massaufnahme",D.satz);
 p(D.satz&&D.satz.project_id===7,"und am Projekt",D.satz);
 p(D.satz&&Number(D.satz.parameter.D)===110&&Number(D.satz.parameter.alpha)===25,
   "mit den uebernommenen Massen",D.satz&&D.satz.parameter);

 // ---- E  Die Verbindung laesst sich loesen --------------------------------
 console.log("\nE · Die Verbindung lösen");
 const E=await page.evaluate(async()=>{
  document.querySelector("#abwZuruecksetzen").click();
  await new Promise(r=>setTimeout(r,80));
  window.__insert=null;
  await abwSpeichern();
  return {herkunft:$("abwHerkunft").innerHTML,satz:window.__insert,
          alpha:$("abw_alpha").value,H:$("abw_H").value};
 });
 // alpha taugt als Probe, D nicht: der Standard-Durchmesser ist zufaellig
 // auch 110 und wuerde nichts beweisen.
 p(E.alpha==="30"&&E.H==="300","die Standardmasse sind wieder gesetzt (alpha 30 statt 25)",E);
 p(E.herkunft==="","der Herkunfts-Hinweis ist weg - die Zahlen kommen nicht mehr von dort",E.herkunft);
 p(E.satz&&E.satz.measurement_id===null,
   "und die Abwicklung haengt nicht mehr an der Massaufnahme",E.satz);

 // ---- F  Verdrahtung ------------------------------------------------------
 console.log("\nF · Verdrahtung");
 const q38=lies("js/38-einfassung-aufnahme.js");
 p(q38.indexOf("data-einfa-abwicklung")>=0,"der Knopf steht bei jeder Einfassung");
 p(q38.indexOf("abwAusMassaufnahme")>=0,"und ruft die Bruecke");
 // Die Bruecke rechnet NICHT selbst - sie reicht nur weiter.
 const n38=nurCode(q38);
 p(!/einfaAbwicklungVorgabe[\s\S]{0,1200}Math\.(PI|tan|cos)/.test(n38),
   "die Bruecke rechnet keine Geometrie - das macht js/77");
 p(lies("js/21-einfassung-rund.js").indexOf("rohrhoehe")>=0
   &&lies("js/21-einfassung-rund.js").indexOf("schweifbord")>=0,
   "die beiden Richtwerte stehen in den Einstellungen der Einfassung rund");
 p(lies("index.html").indexOf('id="einfsRohrhoehe"')>=0
   &&lies("index.html").indexOf('id="einfsSchweifbord"')>=0,"mit eigenen Feldern");
 p(lies("index.html").indexOf('id="abwHerkunft"')>=0,"der Hinweis hat seinen Platz im HTML");
 p(lies("css/01-basis.css").indexOf(".abw-herkunft")>=0,"und seine Gestaltung");
 p(lies("js/78-abwicklung-ui.js").indexOf("measurement_id:abwHerkunft")>=0,
   "beim Speichern wird die Massaufnahme mitgeschrieben");

 // Die Einstellungen speichern die beiden Werte wirklich.
 console.log("\nF2 · Die Richtwerte lassen sich speichern");
 const F2=await page.evaluate(()=>{
  $("einfsRohrhoehe").value="150"; $("einfsSchweifbord").value="30";
  $("saveEinfassungSettings").click();
  const s=einfEinstellungenLaden();
  return {rohrhoehe:s.rohrhoehe,schweifbord:s.schweifbord};
 });
 p(F2.rohrhoehe===150&&F2.schweifbord===30,"gespeichert und wieder gelesen",F2);

 // ---- G  Sauberkeit --------------------------------------------------------
 console.log("\nG · Sauberkeit");
 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler);

 await b.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();
