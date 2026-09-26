// Prueft v3.187: Konto wechseln ohne Neuanmeldung.
//
// GEWUENSCHT
// "Was ich auch noch moechte zum testen, dass ich von meiner firma zu eine
//  eigens zum teste angelegte testfirma hin und her wechseln kann ohne mich
//  immer nei anzumelden"
//
// WEG, DER NICHT GEGANGEN WURDE
// Ein Konto in zwei Firmen sehen zu lassen haette die Zugriffskontrolle
// selbst angefasst: die ganze RLS dieses Projekts haengt an
// my_company_id(), einer Firma je Anmeldung. Deshalb: zwei getrennte
// Anmeldungen, beide auf dem Geraet gemerkt, und der Wechsel tauscht nur
// aus, welche gilt. An der Datenbank aendert sich NICHTS - weder Tabelle
// noch Policy noch Migration.
//
// WAS DIESER PRUEFSTAND FESTHAELT
// Vor allem die drei Gefahren, an denen ein solcher Wechsel scheitert:
//  1. Daten der einen Firma bleiben in der anderen stehen
//     -> nach dem Wechsel wird die Seite NEU GELADEN.
//  2. Die Offline-Warteschlange gehoert EINER Firma; wsAlle() (js/43)
//     verwirft sie, sobald eine fremde Firma sie anfasst
//     -> wartet etwas, wird der Wechsel VERWEIGERT.
//  3. Ohne Verbindung haette die andere Firma keine Daten
//     -> ohne Verbindung wird nicht gewechselt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-kontowechsel-v3-187.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
// Kommentare und Zeichenketten weg, bevor im Code gesucht wird: sonst
// bejaht ein erklaerender Satz die Pruefung ("KEIN signOut ...").
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
 // Zwei Konten in zwei Firmen. Gegen die echte Datenbank wird hier nichts
 // gemacht - geprueft wird die Entscheidungslogik, nicht Supabase.
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1",first_name:"Mike",last_name:"Ledermann"};
  companyName="PETER KÜNZI AG";
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  window.__reloads=0;
  // Weder neu laden noch wirklich die Sitzung tauschen - nur festhalten,
  // dass es verlangt wurde.
  window.__setSessionRuf=null;
  window.__setSessionFehler=null;
  sb.auth.getSession=async()=>({data:{session:{access_token:"A-zugang",refresh_token:"A-erneuern",user:{email:"mike@example.ch"}}}});
  sb.auth.setSession=async(s)=>{window.__setSessionRuf=s;
   return window.__setSessionFehler?{error:{message:window.__setSessionFehler}}:{data:{session:s},error:null}};
  // location.reload() laesst sich nicht ersetzen - deshalb wird die
  // benannte Huelle davor getauscht (kwNeuLaden in js/76). Dass sie
  // wirklich neu laedt, prueft Abschnitt I am Quelltext.
  window.kwNeuLaden=()=>{window.__reloads++};
  localStorage.removeItem(KW_SCHLUESSEL);
 });

 // ---- A  Merken ------------------------------------------------------------
 console.log("\nA · Ein Konto wird beim Anmelden gemerkt");
 const A=await page.evaluate(async()=>{
  const erfolg=await kwMerken();
  const l=kwListe();
  return {erfolg,anzahl:l.length,eintrag:l[0],andere:kwAndere().length,mehrere:kwMehrereDa()};
 });
 p(A.erfolg===true&&A.anzahl===1,"das eigene Konto steht in der Liste",A);
 p(A.eintrag&&A.eintrag.name==="Mike Ledermann"&&A.eintrag.firma==="PETER KÜNZI AG",
   "mit Name und Firma - sonst waere die Liste nicht lesbar",A.eintrag);
 p(A.eintrag&&A.eintrag.refresh_token==="A-erneuern","und mit der Sitzung, ohne die kein Wechsel ginge");
 p(A.andere===0&&A.mehrere===false,"das eigene Konto ist kein Wechselziel",A);
 const A2=await page.evaluate(()=>{
  const knopf=$("kontoWechseln"); kwZeichnen();
  return {versteckt:knopf.hidden};
 });
 p(A2.versteckt===true,"und der Knopf oben rechts bleibt weg, solange es nichts zu wechseln gibt");

 // Ein zweites Merken derselben Person verdoppelt den Eintrag nicht, sondern
 // frischt ihn auf - sonst sammelten sich alte, laengst ungueltige Sitzungen.
 const A3=await page.evaluate(async()=>{
  sb.auth.getSession=async()=>({data:{session:{access_token:"A-neu",refresh_token:"A-erneuern-2",user:{email:"mike@example.ch"}}}});
  await kwMerken();
  const l=kwListe();
  return {anzahl:l.length,token:l[0].refresh_token};
 });
 p(A3.anzahl===1,"zweimal dasselbe Konto bleibt EIN Eintrag",A3);
 p(A3.token==="A-erneuern-2","und traegt die neuere Sitzung",A3);

 // ---- B  Das zweite Konto --------------------------------------------------
 console.log("\nB · Ein zweites Konto in einer anderen Firma");
 const B=await page.evaluate(async()=>{
  currentProfile={id:"u2",role:"admin",company_id:"c2",first_name:"Mike",last_name:"Test"};
  companyName="Testfirma";
  sb.auth.getSession=async()=>({data:{session:{access_token:"B-zugang",refresh_token:"B-erneuern",user:{email:"test@example.ch"}}}});
  await kwMerken();
  kwZeichnen();
  return {anzahl:kwListe().length,andere:kwAndere().map(k=>k.firma),
          mehrere:kwMehrereDa(),knopf:!$("kontoWechseln").hidden,
          html:$("kontenBox")?$("kontenBox").innerHTML:""};
 });
 p(B.anzahl===2,"beide Konten sind gemerkt",B.anzahl);
 p(JSON.stringify(B.andere)===JSON.stringify(["PETER KÜNZI AG"]),
   "als Wechselziel steht nur das ANDERE da, nicht das eigene",B.andere);
 p(B.knopf===true,"jetzt erscheint der Knopf oben rechts");
 p(B.html.indexOf('data-kw-zu="u1"')>=0,"die Zeile hat einen Wechsel-Knopf");
 p(B.html.indexOf('data-kw-weg="u1"')>=0,"und einen zum Entfernen");
 p(B.html.indexOf("ohne Passwort")>=0,"die Warnung steht dabei, nicht im Kleingedruckten");

 // ---- C  Der Wechsel -------------------------------------------------------
 console.log("\nC · Der Wechsel selbst");
 const C=await page.evaluate(async()=>{
  window.__reloads=0; window.__setSessionRuf=null;
  // supabase-js erneuert den refresh_token im Betrieb. Hier sieht die
  // Sitzung deshalb ANDERS aus als beim Anmelden - genau der Fall, in dem
  // ein Wechsel ohne vorheriges Sichern den Rueckweg zumauern wuerde.
  sb.auth.getSession=async()=>({data:{session:{access_token:"B-zugang-3",refresh_token:"B-erneuern-3",user:{email:"test@example.ch"}}}});
  const r=await kwWechseln("u1");
  return {r,gerufen:window.__setSessionRuf,reloads:window.__reloads};
 });
 p(C.r&&C.r.ok===true,"der Wechsel geht durch",C.r);
 p(C.gerufen&&C.gerufen.refresh_token==="A-erneuern-2",
   "mit der Sitzung des Ziels",C.gerufen);
 p(C.reloads===1,"und die Seite wird NEU GELADEN - sonst bliebe die alte Firma stehen",C.reloads);
 // Vor dem Wechsel wird die eigene Sitzung frisch gesichert, sonst waere der
 // Rueckweg irgendwann zu.
 const C2=await page.evaluate(()=>{
  const b=kwListe().find(k=>k.id==="u2");
  return {token:b?b.refresh_token:null};
 });
 p(C2.token==="B-erneuern-3","die eigene Sitzung wurde VOR dem Wechsel aufgefrischt - sonst waere der Rueckweg irgendwann zu",C2);

 // ---- D  Die Warteschlange haelt den Wechsel auf ---------------------------
 console.log("\nD · Was auf Übertragung wartet, gehört der jetzigen Firma");
 const D=await page.evaluate(async()=>{
  window.__reloads=0; window.__setSessionRuf=null;
  const echt=window.wsAlle;
  window.wsAlle=async()=>[{id:1},{id:2},{id:3}];
  const r=await kwWechseln("u1");
  window.wsAlle=echt;
  return {r,gerufen:window.__setSessionRuf,reloads:window.__reloads};
 });
 p(D.r&&D.r.ok===false,"der Wechsel wird verweigert",D.r);
 p(D.r&&D.r.wartend===3,"und nennt, wie viele warten",D.r);
 p(D.r&&D.r.meldung.indexOf("verworfen")>=0,"die Meldung sagt, WAS sonst passiert",D.r&&D.r.meldung);
 p(D.gerufen===null,"die Sitzung wird gar nicht erst getauscht");
 p(D.reloads===0,"und nichts neu geladen");

 // ---- E  Ohne Verbindung ---------------------------------------------------
 console.log("\nE · Ohne Verbindung wird nicht gewechselt");
 const E=await page.evaluate(async()=>{
  window.__reloads=0; window.__setSessionRuf=null;
  const alt=Object.getOwnPropertyDescriptor(Navigator.prototype,"onLine");
  Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>false});
  const r=await kwWechseln("u1");
  Object.defineProperty(navigator,"onLine",alt||{configurable:true,get:()=>true});
  return {r,gerufen:window.__setSessionRuf,reloads:window.__reloads};
 });
 p(E.r&&E.r.ok===false,"der Wechsel wird verweigert",E.r);
 p(E.r&&E.r.meldung.indexOf("Verbindung")>=0,"mit Begründung",E.r&&E.r.meldung);
 p(E.gerufen===null&&E.reloads===0,"und es passiert nichts");

 // ---- F  Ein Zugang, der nicht mehr gilt -----------------------------------
 console.log("\nF · Ein Zugang, der nicht mehr gilt");
 const F=await page.evaluate(async()=>{
  window.__reloads=0;
  window.__setSessionFehler="Invalid Refresh Token";
  const r=await kwWechseln("u1");
  window.__setSessionFehler=null;
  return {r,reloads:window.__reloads,nochDa:!!kwListe().find(k=>k.id==="u1")};
 });
 p(F.r&&F.r.ok===false,"der Wechsel schlaegt sauber fehl",F.r);
 p(F.r&&F.r.meldung.indexOf("normal anmelden")>=0,"und sagt, was jetzt zu tun ist",F.r&&F.r.meldung);
 p(F.nochDa===false,"der ungueltige Zugang wird entfernt, statt jedes Mal neu zu scheitern");
 p(F.reloads===0,"neu geladen wird nichts");

 // ---- G  Entfernen ---------------------------------------------------------
 console.log("\nG · Entfernen wirkt nur auf diesem Gerät");
 const G=await page.evaluate(async()=>{
  localStorage.removeItem(KW_SCHLUESSEL);
  currentProfile={id:"u1",role:"admin",company_id:"c1",first_name:"Mike",last_name:"Ledermann"};
  companyName="PETER KÜNZI AG";
  sb.auth.getSession=async()=>({data:{session:{access_token:"A",refresh_token:"A-r",user:{email:"a@x"}}}});
  await kwMerken();
  currentProfile={id:"u2",role:"admin",company_id:"c2",first_name:"Mike",last_name:"Test"};
  companyName="Testfirma";
  sb.auth.getSession=async()=>({data:{session:{access_token:"B",refresh_token:"B-r",user:{email:"b@x"}}}});
  await kwMerken();
  const vorher=kwListe().length;
  kwEntfernen("u1");
  kwZeichnen();
  return {vorher,nachher:kwListe().length,knopf:$("kontoWechseln").hidden,
          text:$("kontenBox").innerHTML.indexOf("nur dieses eine Konto")>=0};
 });
 p(G.vorher===2&&G.nachher===1,"der Eintrag ist weg",G);
 p(G.knopf===true,"der Knopf oben rechts verschwindet wieder");
 p(G.text===true,"und die Liste sagt, dass nur noch eines da ist");
 // Entfernt wird NUR der gemerkte Zugang - kein signOut, kein Loeschen.
 const quelle=lies("js/76-kontowechsel.js");
 const nurJs=nurCode(quelle);
 p(!/signOut/.test(nurJs),"js/76 meldet nirgends jemanden ab");
 p(!/\.from\(/.test(nurJs),"und fasst keine einzige Tabelle an - es gibt keine Migration dazu");

 // ---- H  Weiteres Konto hinzufuegen ---------------------------------------
 console.log("\nH · Weiteres Konto hinzufügen, mit Rückweg");
 const H=await page.evaluate(async()=>{
  await kwHinzufuegen();
  return {login:!$("authScreen").hidden,app:$("appRoot").hidden,
          zurueck:!$("kwZurueck").hidden,hinweis:!$("kwLoginHinweis").hidden,
          gemerkt:kwListe().length};
 });
 p(H.login===true&&H.app===true,"der Anmeldebildschirm kommt");
 p(H.zurueck===true,"mit einem Rückweg");
 p(H.hinweis===true,"und dem Hinweis, dass das bisherige Konto bleibt");
 p(H.gemerkt>=1,"das bisherige Konto ist dabei gemerkt worden",H.gemerkt);
 const H2=await page.evaluate(()=>{
  kwHinzufuegenAbbrechen();
  return {login:$("authScreen").hidden,app:!$("appRoot").hidden,
          zurueck:$("kwZurueck").hidden};
 });
 p(H2.login===true&&H2.app===true,"Abbrechen führt zurück in die laufende Sitzung");
 p(H2.zurueck===true,"und räumt den Rückweg wieder weg");

 // ---- I  Verdrahtung -------------------------------------------------------
 console.log("\nI · Verdrahtung");
 p(lies("sw.js").indexOf("./js/76-kontowechsel.js")>=0,"js/76 steht in der App-Shell des Service Workers");
 const html=lies("index.html");
 p(html.indexOf('<script src="js/76-kontowechsel.js">')>=0,"js/76 ist eingebunden");
 p(html.indexOf('id="kontoWechseln"')>=0,"der Knopf steht oben rechts");
 p(html.indexOf('id="kontenModal"')>=0,"der Dialog ist da");
 p(html.indexOf('data-hilfe="kontowechsel"')>=0,"mit Info-Knopf");
 p(lies("js/41-hilfe.js").indexOf('"kontowechsel"')>=0,"der Hilfetext ist da");
 p(lies("js/70-ansicht2.js").indexOf('id:"konten"')>=0,"die neue Ansicht hat den Eintrag unter Mehr");
 p(lies("js/03-login.js").indexOf("kwMerken()")>=0,"nach jeder Anmeldung wird gemerkt");
 p(lies("css/01-basis.css").indexOf(".kw-zeile")>=0,"die Gestaltung steht in der gemeinsamen CSS-Datei");
 // Der Zwischenspeicher der alten Firma darf nicht stehenbleiben.
 p(/offlineCacheLeeren\(\)/.test(quelle),"beim Wechsel wird der Zwischenspeicher geleert");
 p(/function kwNeuLaden\(\)\{[\s\S]{0,120}location\.reload\(\)/.test(quelle),
   "und die Seite neu geladen - kwNeuLaden() ruft wirklich location.reload()");

 // ---- J  Sauberkeit --------------------------------------------------------
 console.log("\nJ · Sauberkeit");
 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler);

 await b.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();
