// Prueft v3.185: Eine Aufgabe auf ein Datum terminieren.
//
// GEWUENSCHT
// "Meine aufgaben auf der startseite sollen die moeglichkeit erhalten auf ein
//  bestimmtes datum terminiert zu werden, zb wenn man in den ferien ist oder
//  das montieren erst 1 monat spaeter stattfinden soll."
// Verhalten nach Rueckfrage entschieden: "Verschwindet bis zum Datum, Zaehler
// bleibt".
//
// GRUNDSATZ
// Die Aufgaben bleiben ABGELEITET (js/45 aus den Massaufnahmen). In
// aufgaben_termine steht nur "erst ab dem ...". Der Schluessel ist
// (profil_id, measurement_id, schritt) - ohne den Schritt wuerde ein Termin
// fuers Ruesten auch das spaetere Montieren verschlucken.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-aufgaben-termin-v3-185.js
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
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  meineRechte={admin:true};
  workflowAktiv=true;
  const tag=v=>{const d=new Date(Date.now()+v*86400000);const z=n=>String(n).padStart(2,"0");
    return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())};
  window.__tag=tag;
  // Drei Aufgaben an ZWEI Massaufnahmen - 41 hat zwei Schritte nacheinander
  // im Blick, das ist der Fall, der den Schritt im Schluessel noetig macht.
  window.__setze=function(termine){
   aufgabenListe=[
    {art:"ruesten",   m:{id:41,project_id:1,title:"Bern",  type:"kehle"}},
    {art:"montieren", m:{id:41,project_id:1,title:"Bern",  type:"kehle"}},
    {art:"freigeben", m:{id:42,project_id:1,title:"Thun",  type:"kehle"}}
   ];
   aufgabenTermine=Object.create(null);
   (termine||[]).forEach(t=>{
    aufgabenTermine[aufgabenTerminSchluessel(t.id,t.schritt)]={id:1,faellig_am:t.am};
   });
   aufgabenTerminierteZeigen=false;
   aufgabenTerminFormular="";
  };
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 // ---- A  Der Schluessel enthaelt den Schritt ------------------------------
 console.log("\nA · Der Termin gilt fuer EINEN Schritt, nicht die ganze Aufnahme");
 const A=await page.evaluate(()=>{
  window.__setze([{id:41,schritt:"ruesten",am:window.__tag(30)}]);
  return {
   sichtbar:aufgabenSichtbareListe().map(a=>a.art+"#"+a.m.id),
   terminiert:aufgabenTerminierteListe().map(a=>a.art+"#"+a.m.id),
   schluesselUnterschiedlich:
     aufgabenTerminSchluessel(41,"ruesten")!==aufgabenTerminSchluessel(41,"montieren")
  };
 });
 p(A.terminiert.join()==="ruesten#41","nur das Ruesten ist terminiert",A.terminiert);
 p(A.sichtbar.indexOf("montieren#41")>=0,
   "das Montieren DERSELBEN Massaufnahme bleibt sichtbar - zwei Arbeiten, oft zwei Leute",A.sichtbar);
 p(A.sichtbar.indexOf("freigeben#42")>=0,"die andere Massaufnahme ist unberuehrt",A.sichtbar);
 p(A.schluesselUnterschiedlich,"die Schluessel der beiden Schritte sind verschieden");

 // ---- B  Abgelaufen heisst wieder sichtbar --------------------------------
 console.log("\nB · Ein erreichter Termin holt die Aufgabe von selbst zurueck");
 const B=await page.evaluate(()=>{
  const erg={};
  window.__setze([{id:41,schritt:"ruesten",am:window.__tag(30)}]);
  erg.zukunft=aufgabenSichtbareListe().length;
  window.__setze([{id:41,schritt:"ruesten",am:window.__tag(0)}]);   // heute
  erg.heute=aufgabenSichtbareListe().length;
  window.__setze([{id:41,schritt:"ruesten",am:window.__tag(-1)}]);  // gestern
  erg.gestern=aufgabenSichtbareListe().length;
  return erg;
 });
 p(B.zukunft===2,"in 30 Tagen faellig: zwei von drei Aufgaben sichtbar",B.zukunft);
 p(B.heute===3,"auf HEUTE terminiert: wieder alle drei - heute ist nicht 'spaeter'",B.heute);
 p(B.gestern===3,"gestern faellig: ebenfalls wieder da, ganz ohne Aufraeumlauf",B.gestern);

 // ---- C  Der Zaehler bleibt ----------------------------------------------
 console.log("\nC · Der Zaehler bleibt, nichts verschwindet lautlos");
 const C=await page.evaluate(()=>{
  window.__setze([{id:41,schritt:"ruesten",am:window.__tag(30)}]);
  const zeile=aufgabenTerminZeileHtml();
  aufgabenTerminierteZeigen=true;
  const offen=aufgabenSichtbareListe().length;
  const zeileOffen=aufgabenTerminZeileHtml();
  aufgabenTerminierteZeigen=false;
  window.__setze([]);
  return {zeile,offen,zeileOffen,ohneTermin:aufgabenTerminZeileHtml()};
 });
 p(/1 terminiert/.test(C.zeile),"die Zeile nennt die Zahl",C.zeile);
 p(/anzeigen/.test(C.zeile),"und bietet an, sie einzublenden");
 p(C.offen===3,"eingeblendet sind wieder alle drei da",C.offen);
 p(/ausblenden/.test(C.zeileOffen),"und die Zeile bietet dann das Gegenteil an");
 p(C.ohneTermin==="","ohne Termin gibt es die Zeile gar nicht - kein '0 terminiert'",C.ohneTermin);

 // ---- D  Beide Ansichten zeigen dasselbe ----------------------------------
 console.log("\nD · Klassische Ansicht und Ansicht 2.0 zeigen dieselbe Liste");
 const D=await page.evaluate(()=>{
  window.__setze([{id:41,schritt:"ruesten",am:window.__tag(30)}]);
  return {
   klassisch:aufgabenSichtbareListe().map(a=>a.art+"#"+a.m.id),
   neu:a2Aufgaben().map(a=>a.art+"#"+a.m.id),
   kopf:aufgabenKopfText()
  };
 });
 p(D.klassisch.join()===D.neu.join(),
   "a2Aufgaben() liefert genau die gefilterte Liste aus js/45",{k:D.klassisch,n:D.neu});
 p(/2 offene/.test(D.kopf),"der Kopftext zaehlt die SICHTBAREN, nicht alle",D.kopf);

 // ---- E  Gegenprobe: ohne Filter waeren es drei ---------------------------
 console.log("\nE · Gegenprobe");
 const E=await page.evaluate(()=>{
  window.__setze([{id:41,schritt:"ruesten",am:window.__tag(30)}]);
  return {alle:aufgabenListe.length,sichtbar:aufgabenSichtbareListe().length};
 });
 p(E.alle===3&&E.sichtbar===2,
   "aufgabenListe bleibt vollstaendig (3) - gefiltert wird erst beim Anzeigen (2)",E);

 // ---- F  Das Datum wird geprueft ------------------------------------------
 console.log("\nF · Ein wirkungsloses Datum wird abgewiesen");
 const F=await page.evaluate(async()=>{
  window.__setze([]);
  let abgeschickt=0;
  sb.from=()=>{const q={};["select","eq","upsert","delete"].forEach(k=>q[k]=()=>q);
    q.then=(f,g)=>{abgeschickt++;return Promise.resolve({data:[{id:9,faellig_am:"2099-01-01"}],error:null}).then(f,g)};
    return q};
  const leer   =await aufgabenTerminSetzen(41,"ruesten","");
  const gestern=await aufgabenTerminSetzen(41,"ruesten",window.__tag(-1));
  const heute  =await aufgabenTerminSetzen(41,"ruesten",window.__tag(0));
  const kaputt =await aufgabenTerminSetzen(41,"ruesten","01.11.2026");
  const gut    =await aufgabenTerminSetzen(41,"ruesten",window.__tag(30));
  return {leer,gestern,heute,kaputt,gut,abgeschickt};
 });
 p(F.leer.ok===false,"ohne Datum: abgewiesen",F.leer);
 p(F.kaputt.ok===false,"falsches Format: abgewiesen",F.kaputt);
 p(F.gestern.ok===false&&/Zukunft/.test(F.gestern.meldung),"gestern: abgewiesen, mit Begruendung",F.gestern);
 p(F.heute.ok===false,"heute: ebenfalls abgewiesen - es wuerde nichts aendern",F.heute);
 p(F.gut.ok===true,"ein Datum in der Zukunft geht durch",F.gut);
 p(F.abgeschickt===1,"und NUR dieses eine wurde ueberhaupt zur Datenbank geschickt",F.abgeschickt);

 // ---- G  0 Zeilen gilt nicht als Erfolg -----------------------------------
 console.log("\nG · Ein von RLS geblockter Schreibvorgang gilt nicht als Erfolg");
 const G=await page.evaluate(async()=>{
  sb.from=()=>{const q={};["select","eq","upsert","delete"].forEach(k=>q[k]=()=>q);
    q.then=(f,g)=>Promise.resolve({data:[],error:null}).then(f,g);return q};
  const setzen=await aufgabenTerminSetzen(41,"ruesten",window.__tag(30));
  const weg=await aufgabenTerminWeg(41,"ruesten");
  return {setzen,weg};
 });
 p(G.setzen.ok===false&&/Berechtigung/.test(G.setzen.meldung),
   "0 betroffene Zeilen beim Setzen: kein Erfolg, sondern ein Hinweis",G.setzen);
 p(G.weg.ok===false&&/Berechtigung/.test(G.weg.meldung),
   "dasselbe beim Aufheben",G.weg);

 // ---- I  Ein abgelaufener Termin blockiert das neue Terminieren nicht -----
 // v3.207, gemeldet vom Anwender: "Terminieren von heutigen aufgaben klappt
 // nicht mehr" - beim Speichern kam "Das Datum muss in der Zukunft liegen".
 // URSACHE: Ein Termin bleibt nach Ablauf stehen (Abschnitt B: genau so
 // kommt die Aufgabe zurueck). Das Feld wurde mit diesem VERGANGENEN Datum
 // vorbelegt; wer nur auf Speichern tippte, bekam die Abweisung aus
 // Abschnitt F. Das Feld bot damit genau die Eingabe an, die das Speichern
 // sofort wieder zurueckweist.
 console.log("\nI · Das Datumsfeld bietet nur an, was sich auch speichern laesst");
 const I=await page.evaluate(async()=>{
  const heute=window.__tag(0), morgen=window.__tag(1);
  const wertVon=h=>{const m=h.match(/data-termin-datum="[^"]*"[^>]*value="([^"]*)"/);return m?m[1]:null};
  const minVon =h=>{const m=h.match(/data-termin-datum="[^"]*"[^>]*min="([^"]*)"/);return m?m[1]:null};
  const feld=am=>{
   window.__setze(am===null?[]:[{id:41,schritt:"ruesten",am}]);
   aufgabenTerminFormular=aufgabenTerminSchluessel(41,"ruesten");
   const a=aufgabenListe.find(x=>x.art==="ruesten");
   const h=aufgabeTerminHtml(a);
   return {wert:wertVon(h),min:minVon(h)};
  };
  const gestern=feld(window.__tag(-1));
  const amHeute=feld(heute);
  const zukunft=feld(window.__tag(30));
  const ohne   =feld(null);
  // Und der ganze Weg: was im Feld steht, muss durch aufgabenTerminSetzen
  // durchgehen. Sonst ist es dieselbe Falle mit anderem Datum.
  sb.from=()=>{const q={};["select","eq","upsert","delete"].forEach(k=>q[k]=()=>q);
    q.then=(f,g)=>Promise.resolve({data:[{id:9,faellig_am:"2099-01-01"}],error:null}).then(f,g);
    return q};
  const gespeichert=await aufgabenTerminSetzen(41,"ruesten",amHeute.wert);
  return {heute,morgen,gestern,amHeute,zukunft,ohne,gespeichert,
          tag30:window.__tag(30)};
 });
 p(I.gestern.min===I.morgen&&I.amHeute.min===I.morgen,
   "das Feld laesst fruehestens morgen zu",[I.gestern.min,I.amHeute.min,I.morgen]);
 p(I.amHeute.wert===I.morgen,
   "ein auf HEUTE abgelaufener Termin belegt das Feld mit morgen, nicht mit heute",I.amHeute);
 p(I.gestern.wert===I.morgen,
   "ein gestern abgelaufener ebenso",I.gestern);
 p(I.ohne.wert===I.morgen,
   "ohne Termin steht wie bisher morgen drin",I.ohne);
 p(I.gespeichert.ok===true,
   "und genau dieser Vorschlag laesst sich speichern - ohne 'muss in der Zukunft liegen'",I.gespeichert);
 // GEGENPROBE: das Feld wird NICHT einfach immer auf morgen gestellt. Ein
 // noch laufender Termin bleibt stehen, sonst waere jedes Verschieben ein
 // Zuruecksetzen auf morgen.
 p(I.zukunft.wert===I.tag30,
   "ein noch laufender Termin bleibt im Feld stehen",[I.zukunft.wert,I.tag30]);

 // v3.214: Ein erreichter Termin darf nicht aussehen wie gar kein Termin.
 // URSACHE: Der Anwender hatte fuenf Aufgaben auf denselben Tag gesetzt; an
 // diesem Tag standen sie wieder in der Liste - richtig so, aber von aussen
 // nicht zu unterscheiden von "das Terminieren ist verloren gegangen".
 // Gemeldet hat er es als "schon wieder nicht mehr terminiert".
 console.log("\nJ · Ein erreichter Termin sagt, warum die Aufgabe wieder da ist");
 const J=await page.evaluate(()=>{
  const txt=am=>{
   window.__setze(am===null?[]:[{id:41,schritt:"ruesten",am}]);
   aufgabenTerminFormular=""; aufgabenTerminWahl="";
   const a=aufgabenListe.find(x=>x.art==="ruesten");
   const d=document.createElement("div"); d.innerHTML=aufgabeTerminHtml(a);
   return d.textContent.replace(/\s+/g," ").trim();
  };
  return {heute:txt(window.__tag(0)),gestern:txt(window.__tag(-3)),
          zukunft:txt(window.__tag(30)),ohne:txt(null)};
 });
 p(/heute terminiert/.test(J.heute),"auf heute faellig: die Aufgabe sagt es",J.heute);
 p(/War auf/.test(J.gestern)&&/terminiert/.test(J.gestern),
   "ein frueher faelliger Termin steht mit seinem Datum da",J.gestern);
 // GEGENPROBE 1: eine noch laufende Aufgabe sagt weiterhin das Gegenteil.
 p(/Terminiert auf/.test(J.zukunft)&&!/War auf/.test(J.zukunft),
   "GEGENPROBE: ein laufender Termin heisst weiterhin 'Terminiert auf'",J.zukunft);
 // GEGENPROBE 2: ohne Termin steht gar nichts - kein erfundener Hinweis.
 p(J.ohne==="","GEGENPROBE: ohne Termin steht nichts da",J.ohne);

 // v3.214: Die Schnellwahl. Das Feld oeffnet auf MORGEN; wer nur speichert,
 // hat die Aufgabe am naechsten Tag wieder - genau das ist passiert. Der
 // Wunsch von v3.185 waren aber "ferien" und "1 monat spaeter".
 console.log("\nK · Schnellwahl: eine Woche, zwei Wochen, ein Monat");
 const K=await page.evaluate(async()=>{
  window.__setze([]);
  aufgabenTerminFormular=aufgabenTerminSchluessel(41,"ruesten");
  aufgabenTerminWahl="";
  const a=()=>aufgabenListe.find(x=>x.art==="ruesten");
  const wertVon=h=>{const m=h.match(/data-termin-datum="[^"]*"[^>]*value="([^"]*)"/);return m?m[1]:null};
  const vorher=aufgabeTerminHtml(a());
  const knoepfe=(vorher.match(/data-aufgabe="termin-plus"/g)||[]).length;
  // Ein Tipp auf "In einem Monat" - ueber den echten Zuhoerer, nicht ueber
  // einen nachgebauten Aufruf.
  let geschrieben=0;
  const echtesFrom=sb.from;
  sb.from=(...x)=>{geschrieben++;return echtesFrom.apply(sb,x)};
  const box=document.createElement("div"); box.innerHTML=vorher;
  document.body.appendChild(box);
  box.querySelector('[data-aufgabe="termin-plus"][data-aufgabe-tage="30"]').click();
  await new Promise(r=>setTimeout(r,60));
  const nachher=aufgabeTerminHtml(a());
  box.remove(); sb.from=echtesFrom;
  return {knoepfe,vorherWert:wertVon(vorher),nachherWert:wertVon(nachher),
          morgen:window.__tag(1),tag30:window.__tag(30),geschrieben,
          aktiv:(nachher.match(/status-chip aktiv/g)||[]).length};
 });
 p(K.knoepfe===3,"drei Abstaende stehen zur Wahl",K);
 p(K.vorherWert===K.morgen,"das Feld oeffnet weiterhin auf morgen",K);
 p(K.nachherWert===K.tag30,"ein Tipp auf „In einem Monat“ setzt das Feld auf heute + 30 Tage",K);
 p(K.aktiv===1,"und der gewaehlte Abstand ist als gewaehlt zu sehen",K);
 // GEGENPROBE: die Schnellwahl SCHREIBT nicht. Erst Speichern schreibt -
 // sonst waere ein Fehlgriff sofort in der Datenbank.
 p(K.geschrieben===0,"GEGENPROBE: die Schnellwahl allein ruft die Datenbank nicht auf",K);

 // ---- H  Struktur ---------------------------------------------------------
 console.log("\nH · Struktur");
 const code=nurCode(lies("js/45-aufgaben.js"));
 p(/aufgaben_termine/.test(lies("js/45-aufgaben.js")),"js/45 spricht mit aufgaben_termine");
 p(!/workflow_status\s*:/.test(code.split("aufgabenTerminSetzen")[1]||""),
   "das Terminieren aendert KEINEN workflow_status - im Projekt bleibt alles sichtbar");
 const a2=nurCode(lies("js/70-ansicht2.js"));
 p(/aufgabenSichtbareListe/.test(a2),"js/70 nutzt die gemeinsame gefilterte Liste");
 p(/aufgabeTerminHtml/.test(a2)&&/aufgabeTerminKnopfHtml/.test(a2),
   "und baut Datumsfeld und Knopf NICHT nach, sondern holt sie aus js/45");
 p(lies("css/01-basis.css").indexOf(".aufgaben-terminzeile")>=0,"die Zeile hat ihre Gestaltung");

 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler.slice(0,3));
 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
