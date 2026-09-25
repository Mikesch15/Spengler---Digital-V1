// Prueft v3.183: Der gefuehrte Start fuer neue Firmen.
//
// GEWUENSCHT
// "Und ich denke es muesste wie einen gefuehrten start in die app geben
//  fuer neue firmen um all die daten und materialien zu erfassen"
//
// BEFUND (an den echten Daten erhoben)
// Es gibt im Projekt bereits eine zweite Firma ("Testfirma"). Ihr Stand
// gegenueber der eingerichteten Firma:
//     Material-Katalog     381  ->    0
//     Blitzschutz-Material 487  ->    0
//     Werkstoffe             8  ->    1
//     Stundenansaetze       11  ->    1
//     Rinne-Ansetztypen      7  ->    0
// Eine neue Firma startet also in einer App, deren Auswahlfelder leer sind,
// ohne dass irgendetwas das sagt. Gesucht wurde nach einem vorhandenen
// "Erste Schritte"/Assistenten - es gab keinen.
//
// GEWAEHLTE LOESUNG (vom Anwender entschieden)
// Eine Checkliste, die FUEHRT: sie zeigt, was fehlt und warum, und oeffnet
// dann die BESTEHENDE Karte in den Einstellungen. Kein zweiter Satz
// Eingabefelder. Der Haken wird aus den echten Daten ABGELEITET - es gibt
// keine gespeicherte Fortschrittsmarke, die behaupten koennte, etwas sei
// erledigt, waehrend die Liste leer ist.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-einrichtung-v3-183.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
// Kommentare und Zeichenketten weg, bevor im Code gesucht wird: sonst
// bejaht ein erklaerender Satz die Pruefung (genau dieser Fehler ist in
// v3.176 schon einmal passiert und hat zwei Pruefungen falsch gruen gemacht).
const nurCode=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")
                  .replace(/"(\\.|[^"\\])*"/g,'""').replace(/'(\\.|[^'\\])*'/g,"''")
                  .replace(/`(\\.|[^`\\])*`/g,"``");

// Eine FRISCHE Firma: alles leer, so wie die Testfirma heute wirklich
// dasteht. Genau das ist der Fall, um den es geht.
const LEER=()=>{
 companyName=""; companyAddress=""; logoUrl="";
 settings.rates=[]; settings.materials=[];
 materialIds=[]; materialWerkstoffe=[]; materialFormate=[];
 measurementMaterials=[]; rinneFittingTypes=[]; blitzschutzMaterials=[];
 blechRollenbreiten=[]; allProfiles=[{id:"u1",first_name:"A",last_name:"B",role:"admin"}];
};
// Eine EINGERICHTETE Firma (wie PETER KUENZI AG).
const VOLL=()=>{
 companyName="Muster AG"; companyAddress="Musterweg 1, 3000 Bern"; logoUrl="logo.png";
 settings.rates=[["Spengler",95]];
 settings.materials=[["101.01","Kupferblech 0.6mm","0.6","m²",42]];
 materialIds=[1]; materialWerkstoffe=[3];
 materialFormate=[{staerke_mm:0.6,ausfuehrung:"blank",form:"rolle",laenge_mm:null,breite_mm:null}];
 measurementMaterials=[{id:3,name:"Kupfer"}];
 rinneFittingTypes=[{id:1,name:"Offenes Ende"}];
 blitzschutzMaterials=[{id:1,name:"Draht"}];
 blechRollenbreiten=[1000,670,330,250];
 allProfiles=[{id:"u1",first_name:"A",last_name:"B",role:"admin"},
              {id:"u2",first_name:"C",last_name:"D",role:"employee"}];
};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  meineRechte={admin:true,kataloge:true,lager:true};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });
 await page.evaluate(`window.__leer=${LEER.toString()};window.__voll=${VOLL.toString()}`);

 // ---- A  Die frische Firma wird erkannt -----------------------------------
 console.log("\nA · Die frische Firma wird erkannt");
 const A=await page.evaluate(()=>{
  window.__leer();
  const stand=einrStand();
  return {
   punkte:stand.length,
   fertig:stand.filter(x=>x.fertig).length,
   offenePflicht:einrOffenePflicht().map(x=>x.schluessel),
   karteDa:einrKarteHtml().length>0,
   alleFertig:einrAlleFertig()
  };
 });
 p(A.punkte>=8,"die Liste hat mindestens acht Punkte",A.punkte);
 p(A.fertig===0,"bei einer voellig leeren Firma ist KEIN Punkt erledigt",A.fertig);
 p(A.alleFertig===false,"und die Einrichtung gilt nicht als fertig");
 p(A.karteDa,"die Karte wird gezeigt");
 // Namentlich, damit ein spaeter entfernter Punkt auffaellt statt still zu
 // verschwinden: das sind die Angaben, ohne die die App nicht rechnen kann.
 ["firma","mitarbeiter","ansaetze","katalog","werkstoffe","rollenbreiten","bleche"]
  .forEach(s=>p(A.offenePflicht.indexOf(s)>=0,"offen gemeldet: "+s,A.offenePflicht));

 // ---- B  Die eingerichtete Firma sieht nichts -----------------------------
 console.log("\nB · Die eingerichtete Firma sieht die Karte NICHT");
 const B=await page.evaluate(()=>{
  window.__voll();
  return {alleFertig:einrAlleFertig(),karte:einrKarteHtml(),offen:einrOffenePflicht().map(x=>x.schluessel)};
 });
 p(B.alleFertig,"alle Pflichtpunkte sind erledigt",B.offen);
 p(B.karte==="","und die Karte erzeugt gar kein HTML - sie steht nicht im Weg");

 // ---- C  Gegenprobe: der Haken ist ABGELEITET, nicht gespeichert ----------
 console.log("\nC · Gegenprobe: der Haken haengt an den echten Daten");
 const C=await page.evaluate(()=>{
  window.__voll();
  const vorher=einrAlleFertig();
  // Der Katalog wird geleert - mehr nicht. Eine gespeicherte
  // Fortschrittsmarke wuerde jetzt weiterhin "erledigt" behaupten.
  settings.materials=[];
  const nachher=einrAlleFertig();
  const offen=einrOffenePflicht().map(x=>x.schluessel);
  settings.materials=[["101.01","Kupferblech 0.6mm","0.6","m²",42]];
  const wieder=einrAlleFertig();
  return {vorher,nachher,offen,wieder};
 });
 p(C.vorher===true,"Ausgangslage: eingerichtet");
 p(C.nachher===false,"nach dem Leeren des Katalogs gilt die Einrichtung sofort als unvollstaendig");
 p(C.offen.indexOf("katalog")>=0,"und zwar genau am Punkt 'katalog'",C.offen);
 p(C.wieder===true,"wird der Katalog wieder gefuellt, ist der Haken von selbst zurueck");

 // ---- D  Kein zweiter Schreibweg ------------------------------------------
 console.log("\nD · Die Checkliste baut KEIN eigenes Formular");
 const modul=lies("js/73-einrichtung.js"), code=nurCode(modul);
 p(/openSettingsTo\s*\(/.test(code),
  "sie oeffnet die BESTEHENDE Karte ueber openSettingsTo() (js/07)");
 p(!/sb\s*\.\s*from\s*\(/.test(code),
  "sie schreibt selbst NICHTS in die Datenbank - kein sb.from(...) im Modul");
 p(!/<input/i.test(modul),
  "und sie zeigt kein eigenes Eingabefeld, in das man an der bestehenden Karte vorbei tippen koennte");
 // Die eigentliche Zusicherung: kein gespeicherter Fortschritt, nirgends.
 p(!/localStorage|sessionStorage/.test(code),
  "kein localStorage - der Stand wird nicht je Geraet gemerkt");
 p(!/einrichtung_erledigt|setup_done|onboarding_/.test(code),
  "und es gibt keine Fortschritts-Marke, die neben den Daten stehen koennte");

 // ---- E  Nur Administratoren ----------------------------------------------
 console.log("\nE · Nur Administratoren");
 const E=await page.evaluate(()=>{
  window.__leer();
  const alsAdmin=einrKarteHtml().length>0;
  currentProfile={id:"u2",role:"employee",company_id:"c1"};
  const alsMonteur=einrKarteHtml();
  const zustaendig=einrZustaendig();
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  return {alsAdmin,alsMonteur,zustaendig};
 });
 p(E.alsAdmin,"der Administrator sieht die Liste");
 p(E.alsMonteur==="","der Monteur nicht - er duerfte die Punkte ohnehin nicht aendern");
 p(E.zustaendig===false,"einrZustaendig() sagt dasselbe");

 // ---- F  Jeder Punkt fuehrt an eine Stelle, die es wirklich gibt ----------
 console.log("\nF · Jeder Punkt fuehrt an eine Stelle, die es wirklich gibt");
 const html=lies("index.html");
 const ziele=await page.evaluate(()=>EINR_PUNKTE.map(x=>({s:x.schluessel,tab:x.tab,ab:x.abschnitt})));
 let alleZiele=true, fehlend=[];
 ziele.forEach(z=>{
  const tabDa=html.indexOf('data-settings-tab="'+z.tab+'"')>=0;
  const abDa=html.indexOf('data-section="'+z.ab+'"')>=0;
  if(!tabDa||!abDa){alleZiele=false;fehlend.push(z.s+" -> "+z.tab+"/"+z.ab)}
 });
 p(alleZiele,"alle Register und Abschnitte, auf die die Punkte zeigen, stehen in index.html",fehlend);
 // Gegenprobe zur Pruefung darueber: ein erfundener Abschnitt wird erkannt.
 p(html.indexOf('data-section="gibtesnicht"')<0,
  "Gegenprobe: ein erfundener Abschnittsname waere hier NICHT zu finden - die Pruefung oben kann also scheitern");

 // ---- G  Eingebunden -------------------------------------------------------
 console.log("\nG · Eingebunden");
 p(html.indexOf('src="js/73-einrichtung.js"')>=0,"js/73-einrichtung.js ist in index.html eingebunden");
 p(lies("sw.js").indexOf('"./js/73-einrichtung.js"')>=0,
  "und steht im Service-Worker-Vorrat - sonst fehlte sie offline");
 // Reihenfolge: js/70 ruft einrKarteHtml() auf, muss also danach geladen werden.
 p(html.indexOf('src="js/73-einrichtung.js"')<html.indexOf('src="js/70-ansicht2.js"'),
  "js/73 wird VOR js/70 geladen - js/70 ruft einrKarteHtml() auf");
 const a2=nurCode(lies("js/70-ansicht2.js"));
 p(/einrKarteHtml/.test(a2),"die Startseite (js/70) zieht die Karte ein");
 p(/einrAnzeigen/.test(a2),"und ueber 'Mehr' laesst sie sich wieder aufrufen");
 p(lies("css/05-ansicht2.css").indexOf(".einr-karte")>=0,"die Karte hat ihre Gestaltung");
 // Diese Pruefung kam NACH dem ersten vollen Lauf dazu: dort fiel
 // pruefstand-ansicht2-v3-150 (F3), weil die 14 neuen Stilregeln ungebunden
 // waren und damit auch in der KLASSISCHEN Ansicht gefaerbt haetten. Der
 // Fehler war echt, meine eigene Pruefung hatte ihn nur nicht abgedeckt -
 // deshalb steht er ab jetzt auch hier, direkt bei der Karte, zu der er
 // gehoert. css/05 wird in beiden Ansichten geladen; gebunden wird eine
 // Regel ueber .a2-, und die Karte liegt tatsaechlich immer in einer
 // .a2-karte.
 const cssRoh=lies("css/05-ansicht2.css")
   .replace(/\/\*[\s\S]*?\*\//g,"").replace(/@media[^{]*\{/g,"");
 const ungebunden=[];
 cssRoh.split("}").forEach(bl=>{
  const i=bl.indexOf("{"); if(i<0)return;
  const sel=bl.slice(0,i).trim();
  if(!sel||sel.startsWith("@"))return;
  sel.split(",").forEach(x=>{x=x.trim();
   if(x&&x.indexOf("einr-")>=0&&!/\.a2-/.test(x)&&!/#a2/.test(x))ungebunden.push(x)});
 });
 p(ungebunden.length===0,
  "jede Stilregel der Karte haengt an .a2- und faerbt damit NICHT in die klassische Ansicht",ungebunden);

 // ---- H  Aufrufen, wenn nichts mehr offen ist ------------------------------
 console.log("\nH · Wieder aufrufen, wenn nichts mehr offen ist");
 const H=await page.evaluate(()=>{
  window.__voll();
  const vorher=einrKarteHtml();
  einrErzwungen=true;
  const erzwungen=einrKarteHtml();
  einrErzwungen=false;
  const danach=einrKarteHtml();
  return {vorher,hatText:erzwungen.length>0,
          nenntFertig:/vollständig/i.test(erzwungen),
          hatSchliessen:/data-einr-ziel="zu"/.test(erzwungen),danach};
 });
 p(H.vorher==="","von selbst erscheint sie bei einer fertigen Firma nicht");
 p(H.hatText,"ausdruecklich aufgerufen erscheint sie trotzdem");
 p(H.nenntFertig,"und sagt dann, dass die Einrichtung vollstaendig ist");
 p(H.hatSchliessen,"mit einem Weg, sie wieder zuzumachen");
 p(H.danach==="","zugemacht ist sie wieder weg");

 // ---- I  Ein stolpernder Punkt reisst nicht die Startseite mit ------------
 console.log("\nI · Ein stolpernder Punkt reisst die Startseite nicht mit");
 const I=await page.evaluate(()=>{
  window.__voll();
  // lagFormate() ist die Quelle fuer den Punkt "bleche". Faellt sie aus
  // (alter Offline-Stand, halb geladene App), darf die Startseite nicht
  // leer bleiben - der Punkt gilt dann als nicht erledigt.
  const echt=window.lagFormate;
  window.lagFormate=()=>{throw new Error("kaputt")};
  let html="",krachte=false;
  try{ html=einrKarteHtml(); }catch(e){ krachte=true; }
  window.lagFormate=echt;
  return {krachte,hatHtml:html.length>0,nenntBleche:/Blech-Formate/.test(html)};
 });
 p(I.krachte===false,"einrKarteHtml() wirft keinen Fehler, wenn eine Pruefung stolpert");
 p(I.hatHtml,"die Karte wird trotzdem gezeichnet");
 p(I.nenntBleche,"und der betroffene Punkt steht als offen darin");

 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler.slice(0,3));
 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
