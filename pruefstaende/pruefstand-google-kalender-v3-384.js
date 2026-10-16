// v3.384: Google-Kalender-Abgleich. Der Google-Adapter (supabase/functions/outlook-sync/gcal.js) wird gegen einen NACHGEBAUTEN Google-Calendar-Server
// geprueft (Etag-Verhalten, Seiten, Fehlercodes), der Kern (core.js) gegen diesen Adapter. NICHT gegen Google selbst (Sandbox erreicht Google nicht,
// es gibt keine Zugangsdaten): das Verhalten der echten API ist unbestaetigt.
const fs=require("fs"),path=require("path");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const C=await import("file://"+path.join(process.cwd(),"supabase/functions/outlook-sync/core.js"));
 const G=await import("file://"+path.join(process.cwd(),"supabase/functions/outlook-sync/gcal.js"));
 const JETZT=new Date("2026-10-15T10:00:00Z");const PROF="p1";

 console.log("\nA · Umrechnung Google <-> Graph-Form");
 const t1=G.googleZuGraph({id:"g1",etag:'"e1"',summary:"Besichtigung",description:"Zeile",location:"Bern",start:{dateTime:"2026-10-20T08:00:00+02:00"},end:{dateTime:"2026-10-20T09:30:00+02:00"}});
 p(t1.start.dateTime==="2026-10-20T08:00:00"&&t1.end.dateTime==="2026-10-20T09:30:00"&&t1.start.timeZone==="Europe/Zurich"&&t1.changeKey==='"e1"'&&!t1.isAllDay,"Zeit mit Offset +02:00 (Sommer) wird zur Zürcher Ortszeit",t1);
 const t2=G.googleZuGraph({id:"g2",summary:"UTC",start:{dateTime:"2026-12-15T08:00:00Z"},end:{dateTime:"2026-12-15T09:00:00Z"}});
 p(t2.start.dateTime==="2026-12-15T09:00:00","UTC im Winter: 08:00Z = 09:00 Zürcher Zeit",t2);
 const t3=G.googleZuGraph({id:"g3",summary:"NY",start:{dateTime:"2026-10-20T09:00:00-04:00",timeZone:"America/New_York"},end:{dateTime:"2026-10-20T10:00:00-04:00"}});
 p(t3.start.dateTime==="2026-10-20T15:00:00","Andere Zeitzone (New York 09:00) = 15:00 Zürcher Zeit",t3);
 const t4=G.googleZuGraph({id:"g4",summary:"Ferien",start:{date:"2026-11-01"},end:{date:"2026-11-04"}});
 p(t4.isAllDay&&t4.start.dateTime==="2026-11-01T00:00:00"&&t4.end.dateTime==="2026-11-04T00:00:00","Ganztägig mehrtägig: Datum, Ende exklusiv wie bei Graph",t4);
 const tt=C.eventZuTermin(t4);
 p(tt.start_datum==="2026-11-01"&&tt.ende_datum==="2026-11-03"&&tt.start_zeit===null,"Der Kern liest das umgewandelte Ereignis richtig (Ende 3.11.)",tt);
 p(G.googleZuGraph({id:"g5",status:"cancelled",start:{date:"2026-11-01"},end:{date:"2026-11-02"}}).isCancelled===true,"status cancelled -> isCancelled");
 p(G.googleZuGraph({id:"g6",visibility:"private",start:{date:"2026-11-01"},end:{date:"2026-11-02"}}).sensitivity==="private"&&G.googleZuGraph({id:"g7",visibility:"confidential",start:{date:"2026-11-01"},end:{date:"2026-11-02"}}).sensitivity==="private"&&G.googleZuGraph({id:"g8",visibility:"default",start:{date:"2026-11-01"},end:{date:"2026-11-02"}}).sensitivity==="normal","Private/vertrauliche Google-Termine gelten als privat (werden nie importiert)");
 p(G.googleZuGraph(null)===null&&G.googleZuGraph({})===null,"Ohne Kennung: null");
 const ohneStart=G.googleZuGraph({id:"x",summary:"?"});
 p(ohneStart&&ohneStart.start===null,"Ohne Beginn: start null (wird von der Liste ausgelassen)");
 const b1=G.graphZuGoogle(C.terminZuEvent({titel:"Mit Zeit",start_datum:"2026-10-20",ende_datum:"2026-10-20",start_zeit:"08:00",ende_zeit:"09:30",ort:"Bern",notiz:"N"}));
 p(b1.summary==="Mit Zeit"&&b1.start.dateTime==="2026-10-20T08:00:00"&&b1.start.timeZone==="Europe/Zurich"&&b1.end.dateTime==="2026-10-20T09:30:00"&&b1.location==="Bern"&&b1.description==="N","Termin -> Google mit Zeit und Zone Europe/Zurich",b1);
 const b2=G.graphZuGoogle(C.terminZuEvent({titel:"Ganz",start_datum:"2026-11-01",ende_datum:"2026-11-03"}));
 p(b2.start.date==="2026-11-01"&&b2.end.date==="2026-11-04"&&!b2.start.dateTime,"Ganztägig -> Google mit date (Ende exklusiv 4.11.)",b2);

 console.log("\nB · Adapter gegen nachgebauten Google-Server");
 function server(){
  const s={events:[],log:[],seq:100,fehler:null,seiten:0};
  const et=()=>'"'+(++s.seq)+'"';
  s.fetch=async(url,init={})=>{
   const u=new URL(url),m=init.method||"GET",h=init.headers||{};
   s.log.push({m,url,auth:h.Authorization});
   if(s.fehler&&s.fehler.netz)throw new Error("netz");
   if(s.fehler&&s.fehler.status)return {ok:false,status:s.fehler.status,headers:{get:()=>"0"},json:async()=>({})};
   const R=(status,body)=>({ok:status<300,status,headers:{get:()=>null},json:async()=>body});
   const pfad=u.pathname.replace("/calendar/v3/calendars/primary","");
   if(pfad==="/events"&&m==="GET"){
    s.seiten++;
    const von=new Date(u.searchParams.get("timeMin")),bis=new Date(u.searchParams.get("timeMax"));
    const alle=s.events.filter(e=>{const a=new Date(e.start.dateTime||e.start.date+"T00:00:00Z"),b=new Date(e.end.dateTime||e.end.date+"T00:00:00Z");return a<bis&&b>=von&&e.status!=="cancelled"});
    const pt=Number(u.searchParams.get("pageToken")||0),gr=Number(s.seitengroesse||250);
    const teil=alle.slice(pt,pt+gr);
    return R(200,{items:teil,nextPageToken:pt+gr<alle.length?String(pt+gr):undefined});
   }
   if(pfad==="/events"&&m==="POST"){const b=JSON.parse(init.body);const e={id:"G"+(++s.seq),etag:et(),status:"confirmed",...b};s.events.push(e);return R(200,e)}
   const id=decodeURIComponent((pfad.match(/^\/events\/(.+)$/)||[])[1]||"");
   const e=s.events.find(x=>x.id===id);
   if(m==="GET")return e&&e.status!=="deleted"?R(200,e):R(404,{});
   if(m==="PATCH"){if(!e)return R(404,{});Object.assign(e,JSON.parse(init.body),{etag:et()});return R(200,e)}
   if(m==="DELETE"){if(!e)return R(410,{});s.events=s.events.filter(x=>x.id!==id);return {ok:true,status:204,headers:{get:()=>null},json:async()=>({})}}
   return R(400,{});
  };
  return s;
 }
 let S=server();
 S.events=[{id:"a",etag:'"1"',summary:"Eins",start:{dateTime:"2026-10-20T08:00:00+02:00"},end:{dateTime:"2026-10-20T09:00:00+02:00"}},{id:"b",etag:'"2"',summary:"Zwei",start:{date:"2026-10-22"},end:{date:"2026-10-23"}},{id:"c",etag:'"3"',summary:"Weit",start:{dateTime:"2027-08-01T08:00:00+02:00"},end:{dateTime:"2027-08-01T09:00:00+02:00"}}];
 let A=G.googleAdapter({fetchFn:S.fetch,token:"TOK"});
 let ev=await A.ereignisse("2026-10-08T00:00:00Z","2027-02-12T23:59:59Z");
 p(ev.length===2&&ev.map(e=>e.id).join()==="a,b"&&S.log.every(l=>l.auth==="Bearer TOK"),"Liest die Ereignisse im Zeitraum (mit Zugriffstoken), Ereignisse ausserhalb nicht",ev.map(e=>e.id));
 const q=new URL(S.log[0].url).searchParams;
 p(q.get("singleEvents")==="true"&&q.get("showDeleted")==="false"&&q.get("timeMin")==="2026-10-08T00:00:00Z"&&q.get("timeMax")==="2027-02-12T23:59:59Z"&&/\/calendars\/primary\/events/.test(S.log[0].url),"Anfrage: Hauptkalender, Wiederholungen aufgelöst (singleEvents), gelöschte nicht",Object.fromEntries(q));
 S=server();S.seitengroesse=2;S.events=Array.from({length:5},(_,i)=>({id:"e"+i,etag:'"'+i+'"',summary:"T"+i,start:{dateTime:"2026-10-2"+i+"T08:00:00+02:00"},end:{dateTime:"2026-10-2"+i+"T09:00:00+02:00"}}));
 A=G.googleAdapter({fetchFn:S.fetch,token:"T"});ev=await A.ereignisse("2026-10-08T00:00:00Z","2027-02-12T23:59:59Z");
 p(ev.length===5&&S.seiten===3,"Mehrere Seiten werden alle gelesen (5 Ereignisse über 3 Seiten)",{n:ev.length,s:S.seiten});
 S.fehler={status:401};let e1=null;try{await A.ereignisse("2026-10-08T00:00:00Z","2027-02-12T23:59:59Z")}catch(e){e1=e}
 p(e1&&e1.code==="anmeldung_abgelaufen"&&e1.status===401,"401: „Anmeldung abgelaufen“",e1&&e1.code);
 S.fehler={status:403};e1=null;try{await A.ereignisse("a","b")}catch(e){e1=e}
 p(e1&&e1.code==="keine_berechtigung","403: „keine Berechtigung“");
 S.fehler={netz:true};e1=null;try{await A.ereignisse("a","b")}catch(e){e1=e}
 p(e1&&e1.code==="netz","Netzfehler: Code „netz“");
 S.fehler={status:429};e1=null;const t0=Date.now();try{await A.ereignisse("a","b")}catch(e){e1=e}
 p(e1&&e1.status===429&&S.log.filter(l=>l.m==="GET").length>=3&&Date.now()-t0>=2000,"429: zweimal mit Wartezeit wiederholt, danach Fehler 429 (kein stilles Weitermachen)",e1&&e1.status);
 S.fehler=null;S.events=[];
 const neu=await A.erstellen(C.terminZuEvent({titel:"Neu",start_datum:"2026-10-25",ende_datum:"2026-10-25",start_zeit:"10:00",ende_zeit:"11:00"}));
 p(neu.id&&neu.subject==="Neu"&&neu.start.dateTime==="2026-10-25T10:00:00"&&neu.changeKey,"Erstellen: Ereignis kommt als Graph-Form mit Etag zurück",neu);
 const alt=neu.changeKey;
 const gea=await A.aendern(neu.id,C.terminZuEvent({titel:"Neu geändert",start_datum:"2026-10-25",ende_datum:"2026-10-25",start_zeit:"10:00",ende_zeit:"11:00"}));
 p(gea.subject==="Neu geändert"&&gea.changeKey!==alt,"Ändern: neuer Titel, neuer Etag",gea);
 p((await A.holen(neu.id)).subject==="Neu geändert"&&(await A.holen("gibtsnicht"))===null,"Holen: vorhanden / nicht vorhanden (404 -> null)");
 await A.loeschen(neu.id);await A.loeschen(neu.id);
 p(S.events.length===0,"Löschen; nochmaliges Löschen (410) ist kein Fehler");
 S.events=[{id:"k",etag:'"9"',status:"cancelled",summary:"x",start:{date:"2026-10-25"},end:{date:"2026-10-26"}}];
 p((await A.holen("k"))===null,"Ein abgesagtes Ereignis gilt beim Holen als nicht vorhanden");

 console.log("\nC · Kern + Google-Adapter (ganzer Abgleich)");
 function neueDb(termine,projekte){
  const d={termine:termine.map(t=>({...t})),map:[],seq:100,mseq:0,projListe:projekte||[],schreib:0};
  d.mapAlle=async()=>d.map.map(m=>({...m}));
  d.termineImFenster=async(von,bis)=>d.termine.filter(t=>t.ende_datum>=von&&t.start_datum<=bis).map(t=>({...t}));
  d.terminHolen=async id=>{const t=d.termine.find(x=>x.id===id);return t?{...t}:null};
  d.projekte=async()=>d.projListe;
  d.terminAnlegen=async f=>{d.schreib++;const t={id:++d.seq,...f};d.termine.push(t);return {...t}};
  d.terminAendern=async(id,f)=>{d.schreib++;const t=d.termine.find(x=>x.id===id);if(!t)return null;Object.assign(t,f);return {...t}};
  d.terminLoeschen=async id=>{d.schreib++;d.termine=d.termine.filter(t=>t.id!==id);d.map.forEach(m=>{if(m.termin_id===id)m.termin_id=null})};
  d.mapSpeichern=async r=>{const m={id:++d.mseq,...r};d.map.push(m);return m};
  d.mapAendern=async(id,f)=>{Object.assign(d.map.find(m=>m.id===id),f)};
  d.mapLoeschen=async id=>{d.map=d.map.filter(m=>m.id!==id)};
  return d;
 }
 const tm=(id,titel,sd,ed,extra)=>({id,titel,start_datum:sd,ende_datum:ed,start_zeit:null,ende_zeit:null,ort:null,notiz:null,mitarbeiter:[],created_by:null,project_id:null,quelle:"app",...extra});
 const verb={id:1,profile_id:PROF,company_id:"c1",import_modus:"alle",anbieter:"google"};
 S=server();
 S.events=[
  {id:"E1",etag:'"1"',summary:"Kunde Hauptstrasse 12",location:"Hauptstrasse 12, 3000 Bern",start:{dateTime:"2026-10-20T08:00:00+02:00"},end:{dateTime:"2026-10-20T09:00:00+02:00"}},
  {id:"E2",etag:'"2"',summary:"Zahnarzt",visibility:"private",start:{dateTime:"2026-10-21T14:00:00+02:00"},end:{dateTime:"2026-10-21T15:00:00+02:00"}},
  {id:"E3",etag:'"3"',summary:"Ferien",start:{date:"2026-11-01"},end:{date:"2026-11-04"}}];
 A=G.googleAdapter({fetchFn:S.fetch,token:"T"});
 const PROJ=[{id:7,object:"Hauptstrasse 12, 3000 Bern",name:"Dach Muster",order_no:"A-1001",archived:false}];
 const db=neueDb([tm(1,"Aus der App","2026-10-26","2026-10-26",{start_zeit:"09:00",ende_zeit:"10:00",mitarbeiter:[PROF]})],PROJ);
 const lauf=()=>C.syncVerbindung({db,graph:A,verb,jetzt:JETZT});
 let z=await lauf();
 const imp=db.termine.filter(t=>t.quelle==="google");
 p(imp.length===2&&z.neu===3&&z.uebersprungen===1&&z.gefunden===3,"Erster Lauf: 2 Google-Termine importiert (privater übersprungen), 1 App-Termin nach Google geschrieben",z);
 p(imp.find(t=>/Kunde/.test(t.titel)).project_id===7&&imp.find(t=>/Ferien/.test(t.titel)).ende_datum==="2026-11-03","Projekt über Adresse zugeordnet; Ganztägig-Ende richtig",imp);
 p(S.events.some(e=>e.summary==="Aus der App"&&e.start.dateTime==="2026-10-26T09:00:00"),"Der App-Termin steht in Google",S.events.map(e=>e.summary));
 const sg=S.log.length,sd=db.schreib;
 z=await lauf();z=await lauf();
 p(z.neu===0&&z.geaendert===0&&db.schreib===sd&&S.log.filter(l=>l.m!=="GET").length===1,"Weitere Läufe schreiben nichts (kein Echo, keine Doppelten) – insgesamt nur der eine Schreibvorgang des ersten Laufs",{z,w:S.log.filter(l=>l.m!=="GET").length});
 // Google-Aenderung -> App
 const eg=S.events.find(e=>e.id==="E1");eg.summary="Kunde verschoben";eg.etag='"1b"';eg.start={dateTime:"2026-10-20T10:00:00+02:00"};eg.end={dateTime:"2026-10-20T11:00:00+02:00"};
 z=await lauf();
 const tk=db.termine.find(t=>/verschoben/.test(t.titel));
 p(tk&&tk.start_zeit==="10:00"&&z.geaendert===1&&S.log.filter(l=>l.m!=="GET").length===1,"Google-Änderung kommt in die App (ohne Rückschreiben)");
 // App-Aenderung -> Google
 db.termine.find(t=>t.titel==="Aus der App").titel="App geändert";
 z=await lauf();
 p(S.events.some(e=>e.summary==="App geändert")&&z.geaendert===1,"App-Änderung kommt nach Google");
 z=await lauf();p(z.geaendert===0&&z.konflikte===0,"Danach wieder ruhig");
 // Konflikt
 const e3=S.events.find(e=>e.id==="E3");e3.summary="Ferien Google";e3.etag='"3b"';
 db.termine.find(t=>/Ferien/.test(t.titel)).titel="Ferien App";
 z=await lauf();
 const mk=db.map.find(m=>m.termin_id===db.termine.find(t=>/Ferien/.test(t.titel)).id);
 p(z.konflikte===1&&mk.konflikt&&db.termine.some(t=>t.titel==="Ferien App")&&S.events.some(e=>e.summary==="Ferien Google"),"Konflikt: nichts überschrieben",z);
 await C.konfliktLoesen({db,graph:A,m:mk,wahl:"app"});
 p(S.events.find(e=>e.id==="E3").summary==="Ferien App","Konflikt „App behalten“ schreibt den App-Stand nach Google");
 // Loeschen
 S.events=S.events.filter(e=>e.id!=="E3");
 z=await lauf();
 p(!db.termine.some(t=>/Ferien/.test(t.titel)),"In Google gelöscht (Herkunft Google): Termin verschwindet in der App");
 // Randfall Zeitzone: Termin am ersten Tag des Fensters um 00:30 Zürcher Zeit (= Vortag 22:30Z) darf nicht als gelöscht erscheinen
 const heute="2026-10-15",vor7="2026-10-08";
 S.events.push({id:"R1",etag:'"r"',summary:"Randtermin",start:{dateTime:vor7+"T00:30:00+02:00"},end:{dateTime:vor7+"T01:00:00+02:00"}});
 await lauf();
 const sr=db.termine.find(t=>t.titel==="Randtermin");
 p(!!sr,"Randtermin um 00:30 am ersten Fenstertag wird importiert (Abfragefenster ist einen Tag breiter)");
 await lauf();await lauf();
 p(db.termine.some(t=>t.titel==="Randtermin"),"…und bleibt bei weiteren Läufen bestehen (wird nicht als „in Google gelöscht“ missverstanden)");
 // Massenloeschschutz mit leerer Antwort
 S.events=[];z=await lauf();
 p(db.termine.some(t=>t.titel==="Randtermin")&&z.hinweise.some(h=>/Sicherheit/.test(h)),"Leere Google-Antwort bei mehreren zugeordneten Terminen löscht nichts (mit Hinweis)",z);

 p(db.termine.filter(t=>t.quelle==="outlook").length===0,"Aus Google importierte Termine tragen die Quelle „google“ (nicht „outlook“)");
 console.log("\nD · Einbindung");
 const idx=fs.readFileSync("supabase/functions/outlook-sync/index.ts","utf8"),cb=fs.readFileSync("supabase/functions/google-callback/index.ts","utf8");
 p(/google_token_speichern/.test(cb)&&/google_token_holen/.test(idx)&&!/console\.(log|error|warn)\([^)]*(access_token|refresh_token|secret|state|body)/i.test(idx+cb),"Refresh-Token nur über die Vault-Funktionen; keine Token/Secrets in Logs");
 p(/\[a-f0-9\]\{64\}/.test(cb)&&/anbieter !== "google"/.test(cb)&&/DELETE/.test(cb),"Callback: Einmal-Kennung (64 Hex, verbraucht), Anbieter muss „google“ sein");
 p(/best\.anbieter !== "google"/.test(cb)&&/andere/.test(cb),"Callback überschreibt nie eine bestehende Outlook-Verbindung");
 p(/anbieter: google \? "google" : "microsoft"/.test(idx)&&/access_type: "offline"/.test(idx)&&/auth\/calendar\.events/.test(idx),"Start: Anbieter wird in der Einmal-Kennung festgehalten; Offline-Zugriff, nur Kalender-Termine-Berechtigung");
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();
