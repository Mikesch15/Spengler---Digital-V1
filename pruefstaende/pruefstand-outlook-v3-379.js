// v3.379: Outlook-Synchronisation (Kern in supabase/functions/outlook-sync/core.js) gegen NACHGEBAUTE Microsoft-Graph- und Datenbank-Adapter.
// Es wird NICHT gegen Microsoft getestet (Sandbox erreicht Microsoft nicht, es gibt keine Zugangsdaten): geprueft ist die eigene Logik -
// Zuordnung, Idempotenz, Schleifen, Konflikte, Loeschregeln, Zeitzonen, Fehlerverhalten. Das Verhalten der echten Graph-API ist unbestaetigt.
const fs=require("fs"),path=require("path"),vm=require("vm");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

(async()=>{
 const C=await import("file://"+path.join(process.cwd(),"supabase/functions/outlook-sync/core.js"));
 const JETZT=new Date("2026-10-15T10:00:00Z");   // 15.10.2026 12:00 Zürich
 const PROF="p1";

 // ---- Fakes ------------------------------------------------------------------
 function neuesGraph(events){
  const g={events:events.map(e=>({...e})),schreib:0,aufrufe:[],fehler:null,nextId:1000};
  const ck=()=>"ck"+(++g.nextId);
  g.ereignisse=async(von,bis)=>{g.aufrufe.push("lesen");if(g.fehler&&g.fehler.lesen)throw g.fehler.lesen;return g.events.filter(e=>!e.isAllDay?(e.start.dateTime<bis&&e.end.dateTime>=von):(e.start.dateTime<bis&&e.end.dateTime>=von)).map(e=>({...e}))};
  g.erstellen=async b=>{g.schreib++;if(g.fehler&&g.fehler.schreiben)throw g.fehler.schreiben;const e={id:"E"+(++g.nextId),changeKey:ck(),isCancelled:false,sensitivity:"normal",categories:[],...b,body:b.body};g.events.push(e);return {...e}};
  g.aendern=async(id,b)=>{g.schreib++;if(g.fehler&&g.fehler.schreiben)throw g.fehler.schreiben;const e=g.events.find(x=>x.id===id);if(!e)throw Object.assign(new Error("404"),{status:404});Object.assign(e,b,{changeKey:ck()});return {...e}};
  g.loeschen=async id=>{g.schreib++;g.events=g.events.filter(x=>x.id!==id)};
  g.holen=async id=>{const e=g.events.find(x=>x.id===id);return e?{...e}:null};
  return g;
 }
 function neueDb(termine,projekte){
  const d={termine:termine.map(t=>({...t})),map:[],seq:100,mseq:0,projListe:projekte||[],darf:true,schreib:0};
  d.mapAlle=async()=>d.map.map(m=>({...m}));
  d.termineImFenster=async(von,bis)=>d.termine.filter(t=>t.ende_datum>=von&&t.start_datum<=bis).map(t=>({...t}));
  d.terminHolen=async id=>{const t=d.termine.find(x=>x.id===id);return t?{...t}:null};
  d.projekte=async()=>d.projListe;
  d.terminAnlegen=async f=>{d.schreib++;const t={id:++d.seq,...f};d.termine.push(t);return {...t}};
  d.terminAendern=async(id,f)=>{d.schreib++;if(!d.darf)return null;const t=d.termine.find(x=>x.id===id);if(!t)return null;Object.assign(t,f);return {...t}};
  d.terminLoeschen=async id=>{d.schreib++;d.termine=d.termine.filter(t=>t.id!==id);d.map.forEach(m=>{if(m.termin_id===id)m.termin_id=null})};
  d.mapSpeichern=async r=>{const m={id:++d.mseq,...r};d.map.push(m);return m};
  d.mapAendern=async(id,f)=>{Object.assign(d.map.find(m=>m.id===id),f)};
  d.mapLoeschen=async id=>{d.map=d.map.filter(m=>m.id!==id)};
  return d;
 }
 const verb=(extra)=>({id:1,profile_id:PROF,company_id:"c1",import_modus:"alle",...extra});
 const lauf=(db,g,extra)=>C.syncVerbindung({db,graph:g,verb:verb(extra),jetzt:JETZT});
 const evt=(id,subject,start,ende,extra)=>({id,changeKey:"c-"+id,subject,start:{dateTime:start,timeZone:"Europe/Zurich"},end:{dateTime:ende,timeZone:"Europe/Zurich"},isAllDay:false,isCancelled:false,sensitivity:"normal",categories:[],location:{displayName:""},body:{content:"",contentType:"text"},...extra});
 const tm=(id,titel,sd,ed,extra)=>({id,titel,start_datum:sd,ende_datum:ed,start_zeit:null,ende_zeit:null,ort:null,notiz:null,mitarbeiter:[],created_by:null,project_id:null,quelle:"app",...extra});
 const PROJ=[{id:7,object:"Hauptstrasse 12, 3000 Bern",name:"Dach Muster",order_no:"A-1001",archived:false},{id:8,object:"Bahnhofstr. 3",name:"Fassade Beispiel",order_no:"A-2002",archived:false}];

 console.log("\nA · Umrechnung Termin <-> Ereignis");
 const E=C.eventZuTermin(evt("a","Besichtigung","2026-10-20T08:00:00.0000000","2026-10-20T09:30:00.0000000",{location:{displayName:"Hauptstrasse 12"},body:{content:"Zeile1\r\nZeile2"}}));
 p(E.start_datum==="2026-10-20"&&E.start_zeit==="08:00"&&E.ende_zeit==="09:30"&&E.ort==="Hauptstrasse 12"&&E.notiz==="Zeile1\nZeile2","Ereignis -> Termin (Zeit, Ort, Notiz)",E);
 const G1=C.eventZuTermin(evt("b","Ferien","2026-11-01T00:00:00.0000000","2026-11-04T00:00:00.0000000",{isAllDay:true}));
 p(G1.start_zeit===null&&G1.start_datum==="2026-11-01"&&G1.ende_datum==="2026-11-03","Ganztägig mehrtägig: Ende (exklusiv 4.11.) -> 3.11.",G1);
 const U=C.eventZuTermin({subject:"UTC",start:{dateTime:"2026-10-20T06:30:00.0000000",timeZone:"UTC"},end:{dateTime:"2026-10-20T08:00:00.0000000",timeZone:"UTC"}});
 p(U.start_zeit==="08:30"&&U.ende_zeit==="10:00","UTC wird in Zürcher Sommerzeit umgerechnet (06:30Z = 08:30)",U);
 const W=C.eventZuTermin({subject:"Winter",start:{dateTime:"2026-12-15T08:00:00.0000000",timeZone:"UTC"},end:{dateTime:"2026-12-15T09:00:00.0000000",timeZone:"UTC"}});
 p(W.start_zeit==="09:00","Winterzeit: 08:00Z = 09:00",W);
 const NY=C.eventZuTermin({subject:"NY",start:{dateTime:"2026-10-20T09:00:00.0000000",timeZone:"America/New_York"},end:{dateTime:"2026-10-20T10:00:00.0000000",timeZone:"America/New_York"}});
 p(NY.start_zeit==="15:00","Andere Zeitzone (New York 09:00 = 15:00 Zürich)",NY);
 const Z=C.eventZuTermin({subject:"x",start:{dateTime:"2026-10-20T09:00:00.0000000",timeZone:"Unbekannt/Zone"},end:{dateTime:"2026-10-20T10:00:00.0000000",timeZone:"Unbekannt/Zone"}});
 p(Z===null,"Unbekannte Zeitzone: nicht lesbar -> null (nichts erfunden)",Z);
 const B1=C.terminZuEvent(tm(1,"Mit Ende","2026-10-20","2026-10-20",{start_zeit:"08:00",ende_zeit:"09:30"}));
 p(B1.start.dateTime==="2026-10-20T08:00:00"&&B1.end.dateTime==="2026-10-20T09:30:00"&&B1.start.timeZone==="Europe/Zurich"&&!B1.isAllDay,"Termin -> Ereignis mit Zeit, Zone Europe/Zurich",B1);
 const B2=C.terminZuEvent(tm(2,"Ohne Ende","2026-10-20","2026-10-20",{start_zeit:"23:30"}));
 p(B2.end.dateTime==="2026-10-21T00:30:00","Ohne Ende: +1 h, auch über Mitternacht",B2.end);
 const B3=C.terminZuEvent(tm(3,"Ganz","2026-11-01","2026-11-03"));
 p(B3.isAllDay&&B3.start.dateTime==="2026-11-01T00:00:00"&&B3.end.dateTime==="2026-11-04T00:00:00","Ganztägig: Ende wird zum Folgetag 00:00 (exklusiv)",B3);
 const rt=C.eventZuTermin(Object.assign({id:"r",changeKey:"x"},C.terminZuEvent(tm(4,"Rundlauf","2026-11-01","2026-11-03"))));
 p(rt.start_datum==="2026-11-01"&&rt.ende_datum==="2026-11-03"&&rt.start_zeit===null,"Rundlauf ganztägig: Termin -> Ereignis -> Termin bleibt gleich",rt);
 p(C.hashTermin(tm(1,"a ","2026-10-20","2026-10-20",{ort:" "}))===C.hashTermin(tm(1,"a","2026-10-20","2026-10-20",{ort:null})),"Hash ignoriert Leerraum/leer-gegen-null (kein falscher Änderungsalarm)");
 p(C.hashTermin(tm(1,"a","2026-10-20","2026-10-20"))!==C.hashTermin(tm(1,"a","2026-10-21","2026-10-21")),"Hash erkennt eine Änderung des Datums");

 console.log("\nB · Erster Lauf: Import und Export");
 let g=neuesGraph([
  evt("E1","Kunde Hauptstrasse 12","2026-10-20T08:00:00","2026-10-20T09:00:00",{location:{displayName:"Hauptstrasse 12, 3000 Bern"}}),
  evt("E2","Zahnarzt","2026-10-21T14:00:00","2026-10-21T15:00:00",{sensitivity:"private"}),
  evt("E3","Besprechung Fassade Beispiel","2026-10-22T00:00:00","2026-10-23T00:00:00",{isAllDay:true}),
  evt("E4","Weit weg","2027-06-01T08:00:00","2027-06-01T09:00:00")
 ]);
 let db=neueDb([
  tm(1,"Dachkontrolle","2026-10-25","2026-10-25",{start_zeit:"07:00",ende_zeit:"08:00",mitarbeiter:[PROF],created_by:"x"}),
  tm(2,"Fremder Termin","2026-10-25","2026-10-25",{mitarbeiter:["p2"],created_by:"p2"}),
  tm(3,"Eigener ohne Zuteilung","2026-10-26","2026-10-26",{mitarbeiter:[],created_by:PROF}),
  tm(4,"Niemandes","2026-10-27","2026-10-27",{mitarbeiter:[],created_by:"p3"}),
  tm(5,"Zu spät im Jahr","2027-08-01","2027-08-01",{mitarbeiter:[PROF]})
 ],PROJ);
 let z=await lauf(db,g);
 const imp=db.termine.filter(t=>t.quelle==="outlook");
 p(imp.length===2&&z.neu===4&&z.uebersprungen===1,"2 Ereignisse importiert (privat übersprungen, Ereignis ausserhalb des Fensters nicht angefasst) und 2 Termine nach Outlook geschrieben",{z,imp:imp.length});
 p(db.termine.filter(t=>t.quelle==="outlook").every(t=>JSON.stringify(t.mitarbeiter)==='["p1"]'&&t.created_by===PROF),"Importierte Termine gehören dem Mitarbeiter (mitarbeiter = er, Quelle outlook)");
 const t1=imp.find(t=>t.titel==="Kunde Hauptstrasse 12"),t3=imp.find(t=>/Fassade/.test(t.titel));
 p(t1.project_id===7&&t1.projekt_pruefen===false,"Adresse mit Hausnummer: Projekt sicher zugeordnet",t1);
 p(t3.project_id===null&&t3.projekt_pruefen===true,"Nur Projektname im Titel: NICHT zugeordnet, als „Projekt prüfen“ markiert (nie raten)",t3);
 const expTitel=g.events.filter(e=>/^E1\d\d\d$/.test(e.id)).map(e=>e.subject).sort();
 p(expTitel.join("|")==="Dachkontrolle|Eigener ohne Zuteilung","Nach Outlook gehen nur Termine, die dieser Person zugeteilt sind (oder ihr gehören, wenn niemand zugeteilt ist)",expTitel);
 p(!g.events.some(e=>/Fremder|Niemandes|Zu spät/.test(e.subject)),"Fremde, niemandem gehörende und weit entfernte Termine bleiben draussen");
 p(!db.termine.some(t=>t.titel==="Zahnarzt")&&!db.termine.some(t=>t.titel==="Weit weg"),"Privater Termin und Termin ausserhalb des Fensters werden nicht übernommen");

 p(z.gefunden===3,"Der Lauf meldet, wie viele Ereignisse Outlook geliefert hat (Diagnose: 3 im Zeitraum)",z.gefunden);
 const gLeer=neuesGraph([]);const zl=await lauf(neueDb([],PROJ),gLeer);
 p(zl.gefunden===0,"Ein leerer Outlook-Kalender wird als „0 gefunden“ gemeldet (nicht als Fehler)",zl);
 console.log("\nC · Wiederholter Lauf ändert nichts (Idempotenz, keine Schleife)");
 const sg=g.schreib,sd=db.schreib,n0=db.termine.length,m0=db.map.length;
 z=await lauf(db,g);
 p(z.neu===0&&z.geaendert===0&&z.konflikte===0&&g.schreib===sg&&db.schreib===sd&&db.termine.length===n0&&db.map.length===m0,"Zweiter Lauf: nichts neu, nichts geschrieben (weder Outlook noch App)",{z,gs:g.schreib-sg,ds:db.schreib-sd});
 z=await lauf(db,g);z=await lauf(db,g);
 p(g.schreib===sg&&db.schreib===sd,"Auch nach weiteren Läufen: keine Schreibvorgänge, kein Hin-und-Her");

 console.log("\nD · Änderungen: Outlook → App und App → Outlook");
 const e1=g.events.find(e=>e.id==="E1");Object.assign(e1,{subject:"Kunde Hauptstrasse 12 (verschoben)",changeKey:"c-E1-neu",start:{dateTime:"2026-10-20T10:00:00",timeZone:"Europe/Zurich"},end:{dateTime:"2026-10-20T11:00:00",timeZone:"Europe/Zurich"}});
 const gs1=g.schreib;
 z=await lauf(db,g);
 const t1n=db.termine.find(t=>t.id===t1.id);
 p(t1n.titel==="Kunde Hauptstrasse 12 (verschoben)"&&t1n.start_zeit==="10:00"&&z.geaendert===1&&g.schreib===gs1,"Outlook-Änderung kommt in die App; es wird nichts nach Outlook zurückgeschrieben",{t1n,z});
 p(t1n.project_id===7,"Die Projektzuordnung bleibt bei einer Outlook-Änderung erhalten");
 const tA=db.termine.find(t=>t.titel==="Dachkontrolle");tA.titel="Dachkontrolle Nord";tA.start_zeit="07:30";
 const ds1=db.schreib;
 z=await lauf(db,g);
 const evA=g.events.find(e=>/Dachkontrolle/.test(e.subject));
 p(evA.subject==="Dachkontrolle Nord"&&evA.start.dateTime==="2026-10-25T07:30:00"&&z.geaendert===1&&db.schreib===ds1,"App-Änderung kommt nach Outlook; die App wird nicht nochmals geschrieben",{evA,z});
 p(db.map.find(m=>m.termin_id===tA.id).etag===evA.changeKey&&db.map.find(m=>m.termin_id===tA.id).app_hash===C.hashTermin(tA),"Nach dem Schreiben nach Outlook merkt die Zuordnung den neuen Stand beider Seiten (changeKey und Hash)");
 const gs2=g.schreib;z=await lauf(db,g);
 p(g.schreib===gs2&&z.geaendert===0,"Danach wieder ruhig (kein Echo)");

 console.log("\nE · Konflikt: beide Seiten geändert");
 const eK=g.events.find(e=>e.id==="E1");Object.assign(eK,{subject:"Outlook-Titel",changeKey:"c-E1-k1"});
 db.termine.find(t=>t.id===t1.id).titel="App-Titel";
 z=await lauf(db,g);
 const mK=db.map.find(m=>m.termin_id===t1.id);
 p(z.konflikte===1&&mK.konflikt===true&&db.termine.find(t=>t.id===t1.id).titel==="App-Titel"&&g.events.find(e=>e.id==="E1").subject==="Outlook-Titel","Konflikt erkannt: weder App noch Outlook wurde überschrieben",{z,mK});
 const gs3=g.schreib,ds3=db.schreib;
 z=await lauf(db,g);
 p(z.konflikte===1&&g.schreib===gs3&&db.schreib===ds3,"Ein offener Konflikt bleibt offen (wird nicht still entschieden) und erzeugt keine Schreibvorgänge");
 const wahlApp=await C.konfliktLoesen({db,graph:g,m:mK,wahl:"app"});
 p(wahlApp==="app"&&g.events.find(e=>e.id==="E1").subject==="App-Titel"&&!db.map.find(m=>m.id===mK.id).konflikt,"Lösung „App behalten“: Outlook erhält den App-Stand, Konflikt weg");
 z=await lauf(db,g);p(z.konflikte===0&&z.geaendert===0,"Danach ruhig");
 Object.assign(g.events.find(e=>e.id==="E1"),{subject:"Outlook-Titel 2",changeKey:"c-E1-k2"});
 db.termine.find(t=>t.id===t1.id).titel="App-Titel 2";
 await lauf(db,g);
 const wahlOut=await C.konfliktLoesen({db,graph:g,m:db.map.find(m=>m.termin_id===t1.id),wahl:"outlook"});
 p(wahlOut==="outlook"&&db.termine.find(t=>t.id===t1.id).titel==="Outlook-Titel 2","Lösung „Outlook übernehmen“: die App erhält den Outlook-Stand");
 z=await lauf(db,g);p(z.konflikte===0&&z.geaendert===0,"Danach ruhig");
 // beide Seiten gleich geändert -> kein Konflikt
 Object.assign(g.events.find(e=>e.id==="E1"),{subject:"Gleich",changeKey:"c-E1-g"});
 db.termine.find(t=>t.id===t1.id).titel="Gleich";
 z=await lauf(db,g);
 p(z.konflikte===0&&!db.map.find(m=>m.termin_id===t1.id).konflikt,"Beidseitig auf denselben Inhalt geändert: kein Konflikt");

 console.log("\nF · Löschen");
 // in Outlook gelöscht, Herkunft Outlook -> in der App weg
 g.events=g.events.filter(e=>e.id!=="E3");
 z=await lauf(db,g);
 p(!db.termine.some(t=>t.id===t3.id),"In Outlook gelöscht (Herkunft Outlook): Termin verschwindet in der App");
 // in Outlook gelöscht, Herkunft App -> bleibt in der App, nicht neu geschrieben
 const evAid=g.events.find(e=>/Dachkontrolle/.test(e.subject)).id;
 g.events=g.events.filter(e=>e.id!==evAid);
 z=await lauf(db,g);
 const gs4=g.schreib;
 await lauf(db,g);
 p(db.termine.some(t=>t.titel==="Dachkontrolle Nord")&&!g.events.some(e=>/Dachkontrolle/.test(e.subject))&&g.schreib===gs4,"In Outlook gelöscht (Herkunft App): der App-Termin bleibt und wird nicht wieder nach Outlook geschrieben");
 // in der App gelöscht, Herkunft App -> Outlook-Ereignis weg
 const tE=db.termine.find(t=>t.titel==="Eigener ohne Zuteilung");const eEid=db.map.find(m=>m.termin_id===tE.id).event_id;
 await db.terminLoeschen(tE.id);
 await lauf(db,g);
 p(!g.events.some(e=>e.id===eEid),"In der App gelöscht (Herkunft App): das zugehörige Outlook-Ereignis wird gelöscht");
 // in der App gelöscht, Herkunft Outlook -> Outlook bleibt, kein Neuimport
 await db.terminLoeschen(t1.id);
 const n1=db.termine.length;
 await lauf(db,g);await lauf(db,g);
 p(g.events.some(e=>e.id==="E1")&&db.termine.length===n1,"In der App gelöscht (Herkunft Outlook): das Outlook-Ereignis bleibt bestehen und wird nicht neu importiert");
 // in der App nach dem Abgleich geändert, in Outlook gelöscht -> App-Änderung geht nicht verloren
 g=neuesGraph([evt("X1","Wird gelöscht","2026-10-20T08:00:00","2026-10-20T09:00:00")]);db=neueDb([],PROJ);
 await lauf(db,g);const tX=db.termine[0];tX.titel="In der App bearbeitet";g.events=[];
 await lauf(db,g);
 p(db.termine.some(t=>t.titel==="In der App bearbeitet"),"In Outlook gelöscht, in der App inzwischen geändert: der Termin bleibt (keine verlorene App-Änderung)");

 console.log("\nG · Absicherungen");
 g=neuesGraph([]);db=neueDb([],PROJ);
 for(let i=0;i<10;i++)g.events.push(evt("M"+i,"Termin "+i,"2026-10-"+String(20+i).padStart(2,"0")+"T08:00:00","2026-10-"+String(20+i).padStart(2,"0")+"T09:00:00"));
 await lauf(db,g);
 g.events=[];
 z=await lauf(db,g);
 p(db.termine.length===10&&z.hinweise.some(h=>/Sicherheit/.test(h)),"Leere Outlook-Antwort bei 10 zugeordneten Terminen: es wird NICHTS gelöscht (Sicherung gegen Massenlöschung)",{n:db.termine.length,h:z.hinweise});
 g=neuesGraph([evt("Q1","Eins","2026-10-20T08:00:00","2026-10-20T09:00:00")]);db=neueDb([tm(1,"App","2026-10-22","2026-10-22",{mitarbeiter:[PROF]})],PROJ);
 g.fehler={lesen:Object.assign(new Error("x"),{status:429})};
 let err=null;try{await lauf(db,g)}catch(e){err=e}
 p(err&&err.status===429&&db.termine.length===1&&db.map.length===0&&g.schreib===0,"Microsoft antwortet 429 beim Lesen: Abbruch, nichts verändert",{err:err&&err.status});
 g.fehler={lesen:Object.assign(new Error("x"),{code:"anmeldung_abgelaufen"})};
 err=null;try{await lauf(db,g)}catch(e){err=e}
 p(err&&err.code==="anmeldung_abgelaufen"&&C.fehlerMeldung(err).indexOf("neu verbinden")>=0&&db.map.length===0,"Anmeldung abgelaufen/widerrufen: Abbruch mit verständlicher Meldung („neu verbinden“)");
 g.fehler={schreiben:Object.assign(new Error("x"),{status:503})};
 err=null;try{await lauf(db,g)}catch(e){err=e}
 p(err&&err.status===503,"Fehler 503 beim Schreiben: Abbruch statt falscher Zuordnung");
 p(!/Kalender|Termin|Titel|Subject/i.test(C.fehlerMeldung(Object.assign(new Error("Geheimer Titel"),{status:500}))),"Fehlermeldungen enthalten keine Kalenderinhalte");
 // Doppeltes Ereignis in einer Antwort
 g=neuesGraph([evt("D1","Doppelt","2026-10-20T08:00:00","2026-10-20T09:00:00"),evt("D1","Doppelt","2026-10-20T08:00:00","2026-10-20T09:00:00")]);db=neueDb([],PROJ);
 await lauf(db,g);
 p(db.termine.length===1,"Dasselbe Ereignis zweimal in einer Antwort: nur ein Termin");
 // Abgesagt
 g=neuesGraph([evt("A1","Wird abgesagt","2026-10-20T08:00:00","2026-10-20T09:00:00")]);db=neueDb([],PROJ);await lauf(db,g);
 g.events[0].isCancelled=true;await lauf(db,g);
 p(db.termine.length===0,"Abgesagtes Ereignis (isCancelled) gilt als gelöscht");
 g=neuesGraph([evt("A2","Abgesagt neu","2026-10-20T08:00:00","2026-10-20T09:00:00",{isCancelled:true})]);db=neueDb([],PROJ);await lauf(db,g);
 p(db.termine.length===0,"Ein bereits abgesagtes Ereignis wird gar nicht erst importiert");
 // Importmodus markierte
 g=neuesGraph([evt("K1","Ohne Kategorie","2026-10-20T08:00:00","2026-10-20T09:00:00"),evt("K2","Mit Kategorie","2026-10-21T08:00:00","2026-10-21T09:00:00",{categories:["Spengler-DIGITAL"]})]);db=neueDb([],PROJ);
 await lauf(db,g,{import_modus:"markierte"});
 p(db.termine.length===1&&db.termine[0].titel==="Mit Kategorie","Modus „nur markierte“: nur Ereignisse mit der Kategorie „Spengler-DIGITAL“");
 // Berechtigung verweigert beim Aendern in der App
 g=neuesGraph([evt("B1","Alt","2026-10-20T08:00:00","2026-10-20T09:00:00")]);db=neueDb([],PROJ);await lauf(db,g);
 g.events[0].subject="Neu";g.events[0].changeKey="c-B1-n";db.darf=false;
 z=await lauf(db,g);
 p(z.fehler===1&&db.termine[0].titel==="Alt"&&db.map[0].etag==="c-B1","Keine Berechtigung beim Speichern: gemeldet, Stand der Zuordnung unverändert (nächster Lauf versucht es erneut)",z);
 // Exportgrenze
 g=neuesGraph([]);db=neueDb(Array.from({length:230},(_,i)=>tm(i+1,"T"+i,"2026-10-20","2026-10-20",{mitarbeiter:[PROF]})),PROJ);
 z=await lauf(db,g);
 p(g.events.length===200&&z.hinweise.some(h=>/höchstens 200/.test(h)),"Höchstens 200 Termine pro Lauf nach Outlook; der Rest folgt");
 z=await lauf(db,g);
 p(g.events.length===230,"Der nächste Lauf schreibt den Rest, ohne Doppelte");

 console.log("\nH · Projekt-Vorschlag: gleiche Regel wie im .ics-Import");
 const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync("js/91-ics-parser.js","utf8")+";this.v=icsProjektVorschlag;",ctx);
 const proben=[{ort:"Hauptstrasse 12, 3000 Bern",titel:"",notiz:""},{ort:"Hauptstrasse 120",titel:"",notiz:""},{ort:"",titel:"A-2002 Kontrolle",notiz:""},{ort:"Bahnhofstrasse 3",titel:"",notiz:""},{ort:"",titel:"Fassade Beispiel",notiz:""},{ort:"",titel:"Mittagessen",notiz:""}];
 const gl=proben.every(t=>JSON.stringify(ctx.v(t,PROJ))===JSON.stringify(C.projektVorschlag(t,PROJ)));
 p(gl,"Server und Browser schlagen bei 6 Proben dasselbe Projekt (oder keines) vor");

 console.log("\nI · Einbindung");
 const quellen=["outlook-sync","outlook-callback"].map(n=>fs.readFileSync("supabase/functions/"+n+"/index.ts","utf8"));
 p(quellen.every(t=>!/console\.(log|error|warn)\([^)]*(access_token|refresh|secret|state|body|subject)/i.test(t)),"Keine Token/Secrets/Kalenderinhalte in Logausgaben");
 p(quellen.every(t=>!/localStorage|sessionStorage/.test(t))&&/outlook_token_speichern/.test(quellen[0])&&/outlook_token_speichern/.test(quellen[1]),"Refresh-Token gehen ausschliesslich über die Vault-Funktion (nie in eine normale Tabelle)");
 p(/DELETE/.test(quellen[1])&&/outlook_oauth_state/.test(quellen[1])&&/\[a-f0-9\]\{64\}/.test(quellen[1]),"Callback: Einmal-Kennung (64 Hex) wird geprüft und beim Abruf sofort verbraucht");
 p(/origin/.test(quellen[0])&&/protocol !== "https:"/.test(quellen[0]),"Start: Rücksprung-Adresse muss https sein und zur Herkunft der Anfrage passen (kein offener Redirect)");
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();
