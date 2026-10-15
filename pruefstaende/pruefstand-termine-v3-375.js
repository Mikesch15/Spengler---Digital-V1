// v3.375: Terminplanung - Wochenansicht, Termine anlegen/aendern/loeschen, Kalender-Import (.ics) mit Vorschau, Projekt-Vorschlag, Doppelte.
// Datenbank: Speicher-Stub, der die Regeln der Tabelle "termine" nachspielt (Firma, Ende>=Beginn, eindeutige ics_uid, Recht).
// Die echten Policies/Constraints sind separat in der Datenbank geprueft (siehe Abschlussbericht).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs"),vm=require("vm");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync("js/91-ics-parser.js","utf8")+";this.icsLesen=icsLesen;this.icsProjektVorschlag=icsProjektVorschlag;",ctx);
const L=(...z)=>z.join("\r\n");
const ev=(...z)=>L("BEGIN:VEVENT",...z,"END:VEVENT");
const cal=(...e)=>L("BEGIN:VCALENDAR","VERSION:2.0",...e,"END:VCALENDAR");

console.log("\nA · Kalenderdatei lesen (rein)");
{
 const r=ctx.icsLesen(cal(
  ev("UID:a1","SUMMARY:Besichtigung Hauptstrasse 12\\, Bern","DTSTART:20261020T063000Z","DTEND:20261020T080000Z","LOCATION:Hauptstrasse 12\\, 3000 Bern","DESCRIPTION:Zeile1\\nZeile2","BEGIN:VALARM","TRIGGER:-PT15M","DESCRIPTION:Alarm","END:VALARM"),
  ev("UID:a2","SUMMARY:Ferien","DTSTART;VALUE=DATE:20261101","DTEND;VALUE=DATE:20261104"),
  ev("UID:a3","SUMMARY:NY","DTSTART;TZID=America/New_York:20261020T090000","DTEND;TZID=America/New_York:20261020T100000","RRULE:FREQ=WEEKLY"),
  ev("UID:a4","SUMMARY:Lang","DTSTART;TZID=Europe/Zurich:20261020T230000","DURATION:PT2H"),
  ev("UID:a5","STATUS:CANCELLED","SUMMARY:weg","DTSTART:20261020T100000Z"),
  ev("UID:a6","SUMMARY:Kaputt","DTSTART:morgen"),
  ev("UID:a1","SUMMARY:Doppelt","DTSTART:20261021T060000Z"),
  ev("UID:a7","SUMMARY:Gefaltet","SUMMARY:Ein sehr langer","DTSTART:20261022T080000","DTEND:20261022T070000"),
  ev("SUMMARY:Ohne UID","DTSTART;VALUE=DATE:20261105")));
 const t=Object.fromEntries(r.termine.map(x=>[x.uid,x]));
 p(t.a1&&t.a1.start_datum==="2026-10-20"&&t.a1.start_zeit==="08:30"&&t.a1.ende_zeit==="10:00","UTC-Zeit wird in Schweizer Ortszeit umgerechnet (06:30Z = 08:30 im Sommer)",t.a1);
 p(t.a1.titel==="Besichtigung Hauptstrasse 12, Bern"&&t.a1.ort==="Hauptstrasse 12, 3000 Bern"&&t.a1.notiz==="Zeile1\nZeile2","Titel, Ort und Notiz: Maskierungen (\\, \\n) aufgelöst; Alarm-Beschreibung nicht übernommen",t.a1);
 p(t.a2&&t.a2.ganztags&&t.a2.start_datum==="2026-11-01"&&t.a2.ende_datum==="2026-11-03"&&t.a2.start_zeit===null,"Ganztägig mehrtägig: das Ende (exklusiv, 4.11.) wird zum 3.11.",t.a2);
 p(t.a3&&t.a3.start_zeit==="15:00"&&t.a3.ende_zeit==="16:00","Andere Zeitzone (New York 09:00) wird auf Schweizer Zeit (15:00) umgerechnet",t.a3);
 p(t.a3.wiederkehrend&&r.hinweise.some(h=>/Wiederkehrend/.test(h)),"Wiederkehrender Termin: nur der erste, mit Hinweis",r.hinweise);
 p(t.a4&&t.a4.ende_datum==="2026-10-21"&&t.a4.ende_zeit==="01:00","DURATION über Mitternacht: Ende am Folgetag 01:00",t.a4);
 p(!t.a5&&!t.a6&&r.uebersprungen>=3,"Abgesagt, ohne lesbares Datum und doppelte UID werden ausgelassen",{n:r.termine.length,u:r.uebersprungen});
 p(t.a1.titel!=="Doppelt","Bei doppelter UID gilt der erste Termin");
 p(t.a7&&t.a7.ende_zeit===null&&t.a7.ende_datum==="2026-10-22"&&r.hinweise.some(h=>/Ende vor dem Beginn|lag das Ende vor dem Beginn/.test(h)),"Ende vor Beginn: Ende weggelassen, mit Hinweis",t.a7);
 const ohne=r.termine.find(x=>/^ohneuid-/.test(x.uid));
 p(ohne&&ohne.titel==="Ohne UID","Ohne UID: stabiler Ersatzschlüssel aus Titel und Zeit",ohne);
 const r2=ctx.icsLesen(cal(ev("SUMMARY:Ohne UID","DTSTART;VALUE=DATE:20261105")));
 p(r2.termine[0].uid===ohne.uid,"Der Ersatzschlüssel ist beim erneuten Lesen gleich (Import wiederholbar ohne Doppelte)");
 const f=ctx.icsLesen(L("BEGIN:VCALENDAR","BEGIN:VEVENT","UID:f1","SUMMARY:Ein sehr","  langer Titel","DTSTART:20261022T080000","END:VEVENT","END:VCALENDAR"));
 p(f.termine[0]&&f.termine[0].titel==="Ein sehr langer Titel"&&f.termine[0].start_zeit==="08:00","Gefaltete Zeilen werden zusammengesetzt; Zeit ohne Zone = Ortszeit",f.termine[0]);
 const sommer=ctx.icsLesen(cal(ev("UID:w1","SUMMARY:W","DTSTART:20261225T080000Z")));
 p(sommer.termine[0].start_zeit==="09:00","Winterzeit: 08:00Z = 09:00 (Umrechnung hängt am Datum, nicht an einer festen Stundenzahl)",sommer.termine[0]);
 p(ctx.icsLesen("").fehler&&ctx.icsLesen("hallo").fehler&&ctx.icsLesen(cal()).fehler,"Leere Datei, keine Kalenderdatei, Kalender ohne Termine: verständlicher Fehler");
 p(ctx.icsLesen("BEGIN:VCALENDAR\r\n"+"x".repeat(2*1024*1024+5)).fehler.indexOf("zu gross")>=0,"Zu grosse Datei wird abgelehnt");
}

console.log("\nB · Projekt-Vorschlag (rein)");
{
 const P=[{id:1,object:"Hauptstrasse 12, 3000 Bern",name:"Dach Muster",order_no:"A-1001"},{id:2,object:"Bahnhofstr. 3, 3011 Bern",name:"Fassade Beispiel",order_no:"A-2002"},
  {id:3,object:"Hauptstrasse 120, 3000 Bern",name:"Nebenan",order_no:""},{id:4,object:"Alte Gasse 5",name:"Archiv",order_no:"Z-9",archived:true}];
 const V=(t)=>ctx.icsProjektVorschlag(Object.assign({titel:"",ort:"",notiz:""},t),P);
 p((V({ort:"Hauptstrasse 12, 3000 Bern"})||{}).projectId===1,"Strasse mit Hausnummer im Ort: Vorschlag Projekt 1");
 p((V({ort:"Hauptstrasse 120"})||{}).projectId===3,"Hausnummer 120 trifft NICHT Projekt 1 (Hauptstrasse 12)");
 p((V({titel:"Besprechung A-2002"})||{}).projectId===2&&(V({titel:"Besprechung A-2002"})||{}).score===100,"Auftragsnummer im Titel: Vorschlag mit höchstem Gewicht");
 p((V({ort:"Bahnhofstrasse 3"})||{}).projectId===2,"„Bahnhofstrasse“ passt auf „Bahnhofstr.“");
 p(V({ort:"Hauptstrasse"})===null,"Strasse ohne Hausnummer: kein Vorschlag");
 p(V({titel:"Z-9 Kontrolle"})===null,"Archivierte Projekte werden nicht vorgeschlagen");
 p(V({titel:"Mittagessen"})===null&&ctx.icsProjektVorschlag({titel:"x"},null)===null,"Nichts passt: kein Vorschlag");
 p(V({titel:"Dach Muster"})&&V({titel:"Dach Muster"}).score===50,"Nur der Projektname: schwacher Vorschlag (50)");
}

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));
 await stubSchuetzen(page);
 await page.addInitScript(()=>{
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
   from:()=>{const q={};['select','eq','order','limit','in','is'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
   storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})};
 });
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[currentProfile,{id:"u2",first_name:"Hans",last_name:"Muster"}];meineRechte={admin:true};
  allProjects=[{id:1,object:"Hauptstrasse 12, 3000 Bern",name:"Dach Muster",order_no:"A-1001",archived:false},{id:2,object:"Bahnhofstr. 3, 3011 Bern",name:"Fassade",order_no:"A-2002",archived:false}];
  $("appRoot").hidden=false;$("authScreen").hidden=true;window.__alerts=[];window.__confirm=true;
  window.appAlert=async t=>{window.__alerts.push(t)};window.appConfirm=async()=>window.__confirm;
  window.__db={termine:[],seq:0,darf:true,fehler:null};
  function tab(name){
   const st={f:[],op:null,w:null,sel:false};const q={};
   q.select=()=>{st.sel=true;return q};q.order=()=>q;q.limit=()=>q;
   q.lte=(k,v)=>{st.f.push(r=>String(r[k])<=String(v));return q};q.gte=(k,v)=>{st.f.push(r=>String(r[k])>=String(v));return q};
   q.eq=(k,v)=>{st.f.push(r=>String(r[k])===String(v));return q};q.in=(k,v)=>{st.f.push(r=>v.includes(r[k]));return q};
   q.insert=w=>{st.op="insert";st.w=w;return q};q.update=w=>{st.op="update";st.w=w;return q};q.delete=()=>{st.op="delete";return q};
   q.then=(res,rej)=>Promise.resolve().then(()=>{
    const db=window.__db;if(db.fehler)return {data:null,error:{message:db.fehler}};
    let rows=db.termine;
    if(st.op==="insert"){
     if(!db.darf)return {data:[],error:null};
     const neu=[];for(const w0 of (Array.isArray(st.w)?st.w:[st.w])){
      const w=Object.assign({mitarbeiter:[],ort:null,notiz:null,project_id:null,start_zeit:null,ende_zeit:null,ics_uid:null,quelle:"app"},w0);
      if(!w.titel||w.ende_datum<w.start_datum)return {data:null,error:{message:"check constraint"}};
      if(w.ics_uid&&db.termine.some(r=>r.ics_uid===w.ics_uid))return {data:null,error:{message:"duplicate key value violates unique constraint termine_ics_uid_uk"}};
      w.id=++db.seq;w.company_id="c1";neu.push(w);}
     neu.forEach(n=>db.termine.push(n));return {data:neu.map(n=>({id:n.id})),error:null};
    }
    rows=rows.filter(r=>st.f.every(f=>f(r)));
    if(st.op==="update"){if(!db.darf)return {data:[],error:null};rows.forEach(r=>Object.assign(r,st.w));return {data:rows.map(r=>({id:r.id})),error:null}}
    if(st.op==="delete"){if(!db.darf)return {data:[],error:null};db.termine=db.termine.filter(r=>!rows.includes(r));return {data:rows.map(r=>({id:r.id})),error:null}}
    return {data:rows.map(r=>Object.assign({},r)),error:null};
   }).then(res,rej);
   return q;
  }
  sb.from=n=>{if(n!=="termine")throw new Error("unerwartete Tabelle "+n);return tab(n)};
 });
 const montag=await page.evaluate(()=>terMontag(terHeute()));
 const plus=n=>page.evaluate(([m,n])=>terPlus(m,n),[montag,n]);
 const set=(sel,v)=>page.evaluate(([s,v])=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event("change",{bubbles:true}));e.dispatchEvent(new Event("input",{bubbles:true}))},[sel,v]);
 const alerts=()=>page.evaluate(()=>{const a=window.__alerts.slice();window.__alerts.length=0;return a});

 console.log("\nC · Zugang: Mehr > Termine, Karte auf der Startseite");
 const mehr=await page.evaluate(()=>/data-a2-tu="termine"/.test(a2SeiteMehr()));
 p(mehr,"Unter „Mehr“ gibt es den Eintrag „Termine“");
 const heute0=await page.evaluate(()=>{a2Zustand.seite="heute";return /a2TermineKarte/.test(a2SeiteHeute())});
 p(heute0,"Die Startseite hat die Karte „Termine“");
 await page.evaluate(()=>{a2Zustand.seite="mehr";a2Zeichnen()});
 await page.evaluate(()=>document.querySelector('#a2Inhalt [data-a2-tu="termine"]').click());
 await page.waitForTimeout(500);
 const offen=await page.evaluate(()=>({sichtbar:!$("termineModal").hidden,woche:!!document.querySelector("#terListe .a2-ter-tag"),tage:document.querySelectorAll("#terListe .a2-ter-tag").length}));
 p(offen.sichtbar&&offen.woche&&offen.tage===7,"Antippen öffnet den Schirm mit der Wochenansicht (7 Tage)",offen);

 console.log("\nD · Termin anlegen, prüfen, ändern, löschen");
 await page.evaluate(()=>document.getElementById("terNeu").click());
 await page.evaluate(()=>document.getElementById("terSpeichern").click());await page.waitForTimeout(100);
 p((await alerts()).some(a=>/Titel/.test(a))&&(await page.evaluate(()=>__db.termine.length))===0,"Ohne Titel: Meldung, nichts gespeichert");
 const d1=await plus(1),d3=await plus(3);
 await set("#terTitel","Besichtigung <img src=x onerror=window.__xss=1>");await set("#terStartDatum",d1);await set("#terEndeDatum",d1);
 await set("#terStartZeit","09:00");await set("#terEndeZeit","08:00");
 await page.evaluate(()=>document.getElementById("terSpeichern").click());await page.waitForTimeout(100);
 p((await alerts()).some(a=>/Ende liegt vor dem Beginn/.test(a))&&(await page.evaluate(()=>__db.termine.length))===0,"Ende-Zeit vor Beginn-Zeit am selben Tag: abgelehnt");
 await set("#terEndeZeit","10:30");await set("#terProjekt","1");
 await page.evaluate(()=>{document.querySelector('[data-ter-ma="u2"]').checked=true});
 await page.evaluate(()=>document.getElementById("terSpeichern").click());await page.waitForTimeout(300);
 const s1=await page.evaluate(()=>({db:__db.termine.slice(),xss:window.__xss||0,html:document.getElementById("terListe").innerHTML}));
 p(s1.db.length===1&&s1.db[0].project_id===1&&s1.db[0].start_zeit==="09:00"&&s1.db[0].ende_zeit==="10:30"&&JSON.stringify(s1.db[0].mitarbeiter)==='["u2"]'&&s1.db[0].quelle==="app","Gespeichert mit Projekt, Zeit und Mitarbeiter",s1.db[0]);
 p(s1.xss===0&&/&lt;img/.test(s1.html)&&!/<img src=x/.test(s1.html),"Ein eingeschleuster HTML-Titel wird als Text angezeigt, nicht ausgeführt");
 const w1=await page.evaluate(()=>({text:document.querySelector("#terListe").innerText,editor:$("terEditor").hidden}));
 p(/09:00–10:30/.test(w1.text)&&/Hauptstrasse 12/.test(w1.text)&&/Hans Muster/.test(w1.text)&&w1.editor,"Wochenansicht zeigt Zeit, Projekt und Mitarbeiter; Editor ist zu",w1.text.slice(0,300));
 // mehrtägig + ganztägig
 await page.evaluate(()=>document.getElementById("terNeu").click());
 await set("#terTitel","Baustelle Ferien");await set("#terStartDatum",d1);await set("#terEndeDatum",d3);
 await page.evaluate(()=>{const g=document.getElementById("terGanztags");g.checked=true;g.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.evaluate(()=>document.getElementById("terSpeichern").click());await page.waitForTimeout(300);
 const mt=await page.evaluate(()=>({n:__db.termine.length,z:__db.termine[1]&&[__db.termine[1].start_zeit,__db.termine[1].ende_zeit],tage:[...document.querySelectorAll("#terListe .a2-ter-tag")].map(t=>/Baustelle Ferien/.test(t.innerText))}));
 p(mt.n===2&&mt.z[0]===null&&mt.z[1]===null,"Ganztägiger Termin: ohne Zeiten gespeichert",mt);
 p(mt.tage.join()==="false,true,true,true,false,false,false","Mehrtägiger Termin erscheint an jedem Tag (Di–Do)",mt.tage);
 // ändern
 await page.evaluate(()=>document.querySelector('[data-ter-edit="1"]').click());
 await set("#terTitel","Besichtigung Dach");
 await page.evaluate(()=>document.getElementById("terSpeichern").click());await page.waitForTimeout(300);
 p(await page.evaluate(()=>__db.termine.find(t=>t.id===1).titel==="Besichtigung Dach"&&__db.termine.length===2),"Ändern: gleicher Datensatz, neuer Titel");
 // Rechte
 await page.evaluate(()=>{__db.darf=false;document.querySelector('[data-ter-edit="1"]').click()});
 await set("#terTitel","Verboten");
 await page.evaluate(()=>document.getElementById("terSpeichern").click());await page.waitForTimeout(200);
 p((await alerts()).some(a=>/Berechtigung/.test(a))&&await page.evaluate(()=>__db.termine.find(t=>t.id===1).titel==="Besichtigung Dach"),"Ohne Berechtigung (Datenbank ändert 0 Zeilen): ehrliche Meldung, nichts geändert");
 await page.evaluate(()=>{document.getElementById("terLoeschen").click()});await page.waitForTimeout(200);
 p((await alerts()).some(a=>/Berechtigung/.test(a))&&await page.evaluate(()=>__db.termine.length===2),"Löschen ohne Berechtigung: Meldung, nichts gelöscht");
 await page.evaluate(()=>{__db.darf=true;document.getElementById("terEditorZu").click()});
 // Löschen
 await page.evaluate(()=>{window.__confirm=false;document.querySelector('[data-ter-edit="2"]').click()});
 await page.evaluate(()=>document.getElementById("terLoeschen").click());await page.waitForTimeout(150);
 p(await page.evaluate(()=>__db.termine.length===2),"Löschen abgebrochen: nichts passiert");
 await page.evaluate(()=>{window.__confirm=true});
 await page.evaluate(()=>document.getElementById("terLoeschen").click());await page.waitForTimeout(300);
 p(await page.evaluate(()=>__db.termine.length===1&&$("terEditor").hidden),"Löschen bestätigt: Termin weg, Editor zu");
 // Wochen
 await page.evaluate(()=>document.getElementById("terVor").click());await page.waitForTimeout(300);
 const nw=await page.evaluate(()=>({m:terWoche,leer:document.querySelectorAll("#terListe .a2-ter-leer").length}));
 p(nw.m!==montag&&nw.leer===7,"Nächste Woche: andere Woche, alle 7 Tage leer",nw);
 await page.evaluate(()=>document.getElementById("terHeuteKnopf").click());await page.waitForTimeout(300);
 p(await page.evaluate(m=>terWoche===m,montag),"„Heute“ springt zurück in die aktuelle Woche");
 await page.evaluate(()=>{__db.fehler="Netz weg";return terLaden().then(terZeichnen)});
 p(await page.evaluate(()=>/Termine konnten nicht geladen|Netz weg|nicht/.test(document.getElementById("terListe").innerText)),"Ladefehler wird angezeigt statt einer leeren Woche");
 await page.evaluate(()=>{__db.fehler=null});

 console.log("\nE · Kalender importieren");
 const heuteIso=await page.evaluate(()=>terHeute());
 const ymd=iso=>iso.replace(/-/g,"");
 const d2=await page.evaluate(()=>terPlus(terHeute(),1)),d4=await page.evaluate(()=>terPlus(terHeute(),3)),alt=await page.evaluate(()=>terPlus(terHeute(),-30));
 const ICS=cal(
  ev("UID:i1@handy","SUMMARY:Kunde Hauptstrasse 12","LOCATION:Hauptstrasse 12\\, 3000 Bern","DTSTART;TZID=Europe/Zurich:"+ymd(d2)+"T080000","DTEND;TZID=Europe/Zurich:"+ymd(d2)+"T093000"),
  ev("UID:i2@handy","SUMMARY:Privat Zahnarzt","DTSTART;TZID=Europe/Zurich:"+ymd(d4)+"T140000"),
  ev("UID:i3@handy","SUMMARY:Alter Termin","DTSTART;VALUE=DATE:"+ymd(alt)),
  ev("UID:i4@handy","SUMMARY:Kontrolle A-2002","DTSTART;VALUE=DATE:"+ymd(d4))
 );
 fs.writeFileSync("/tmp/test-termine.ics",ICS);
 await page.setInputFiles("#terDatei","/tmp/test-termine.ics");await page.waitForTimeout(500);
 const imp=await page.evaluate(()=>({sicht:!$("terImportBox").hidden,n:document.querySelectorAll("[data-ter-imp]").length,
  gew:[...document.querySelectorAll("[data-ter-imp]")].map(c=>c.checked),proj:[...document.querySelectorAll("[data-ter-imp-proj]")].map(s=>s.value),db:__db.termine.length,txt:$("terImportBox").innerText}));
 p(imp.sicht&&imp.n===4&&imp.db===1,"Vorschau zeigt 4 Termine; es wurde noch NICHTS gespeichert",imp);
 p(imp.gew.join()==="false,true,true,true","Vergangener Termin ist nicht vorgewählt",imp.gew);
 p(imp.proj.join()===",1,2,","Projekt-Vorschlag: Adresse → Projekt 1, Auftragsnummer → Projekt 2, sonst keines",imp.proj);
 p(/vorgeschlagen/.test(imp.txt),"Der Vorschlag ist als solcher gekennzeichnet");
 // zweiten Termin abwählen, dritten Projekt von Hand setzen
 await page.evaluate(()=>{const c=document.querySelector('[data-ter-imp="3"]');c.checked=false;c.dispatchEvent(new Event("change",{bubbles:true}))});
 await set('[data-ter-imp-proj="2"]',"");
 await page.evaluate(()=>document.getElementById("terImportieren").click());await page.waitForTimeout(500);
 const s2=await page.evaluate(()=>({db:__db.termine.filter(t=>t.quelle==="ics").map(t=>[t.titel,t.project_id,t.ics_uid,t.start_zeit,t.ende_zeit]),box:$("terImportBox").hidden}));
 p(s2.db.length===2&&s2.box,"Importiert wurden nur die gewählten (2); Vorschau geschlossen",s2);
 p(s2.db.some(r=>r[0]==="Kunde Hauptstrasse 12"&&r[1]===1&&r[2]==="i1@handy"&&r[3]==="08:00"&&r[4]==="09:30"),"Termin 1: Projekt 1, UID gemerkt, Zeit 08:00–09:30",s2.db);
 p(s2.db.some(r=>r[0]==="Kontrolle A-2002"&&r[1]===null),"Projekt von Hand auf „kein Projekt“ gesetzt wird respektiert (kein stilles Verknüpfen)",s2.db);
 p((await alerts()).some(a=>/2 Termine importiert/.test(a)),"Ergebnis wird gemeldet");
 // gleiche Datei nochmals
 await page.setInputFiles("#terDatei",[]);
 await page.setInputFiles("#terDatei","/tmp/test-termine.ics");await page.waitForTimeout(500);
 const imp2=await page.evaluate(()=>({n:document.querySelectorAll("[data-ter-imp]").length,dis:[...document.querySelectorAll("[data-ter-imp]")].map(c=>c.disabled),gew:[...document.querySelectorAll("[data-ter-imp]")].map(c=>c.checked)}));
 p(imp2.dis.join()==="false,true,true,false"&&imp2.gew.join()==="false,false,false,true","Gleiche Datei nochmals: die zwei importierten sind „bereits importiert“ und gesperrt; der abgewählte und der vergangene sind wählbar",imp2);
 await page.evaluate(()=>{const c=document.querySelector('[data-ter-imp="3"]');c.checked=false;c.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.evaluate(()=>document.getElementById("terImportieren").click());await page.waitForTimeout(200);
 p((await alerts()).some(a=>/kein Termin ausgewählt/.test(a))&&await page.evaluate(()=>__db.termine.length===3),"Nichts gewählt: Meldung, nichts gespeichert");
 await page.evaluate(()=>document.getElementById("terImportZu").click());
 // Fehler: keine Berechtigung beim Import
 await page.evaluate(()=>{__db.darf=false});
 await page.setInputFiles("#terDatei",[]);await page.setInputFiles("#terDatei","/tmp/test-termine.ics");await page.waitForTimeout(400);
 await page.evaluate(()=>document.getElementById("terImportieren").click());await page.waitForTimeout(300);
 p((await alerts()).some(a=>/Berechtigung/.test(a))&&await page.evaluate(()=>__db.termine.length===3),"Import ohne Berechtigung: Meldung, nichts gespeichert");
 await page.evaluate(()=>{__db.darf=true;document.getElementById("terImportZu").click()});
 fs.writeFileSync("/tmp/test-termine-kaputt.ics","das ist kein Kalender");
 await page.setInputFiles("#terDatei","/tmp/test-termine-kaputt.ics");await page.waitForTimeout(300);
 p((await alerts()).some(a=>/keine Kalenderdatei/.test(a)),"Keine Kalenderdatei: verständliche Meldung");

 console.log("\nF · Karte auf der Startseite");
 await page.evaluate(()=>{terKarte.liste=null;terKarte.stand=0;terKarte.versuch=0});
 const kh=await page.evaluate(async()=>{a2Zustand.seite="heute";const h=a2SeiteHeute();await new Promise(r=>setTimeout(r,500));return {geladen:terKarte.liste&&terKarte.liste.length,html:terKarteHtml()}});
 p(kh.geladen>=2&&/Besichtigung Dach|Kunde Hauptstrasse 12/.test(kh.html)&&!/Alter Termin/.test(kh.html),"Karte zeigt die nächsten Termine der kommenden 7 Tage (nicht den vergangenen)",kh.html.replace(/<[^>]+>/g," ").slice(0,300));
 p(/data-a2-tu="termine"/.test(kh.html),"Die Karte hat einen „Öffnen“-Knopf zum Schirm");

 console.log("\nG · Einbindung");
 const idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8"),q=fs.readFileSync("js/92-termine.js","utf8");
 p(/js\/91-ics-parser\.js/.test(idx)&&/js\/92-termine\.js/.test(idx)&&/js\/91-ics-parser\.js/.test(sw)&&/js\/92-termine\.js/.test(sw),"js/91 und js/92 in index.html UND sw.js");
 p(idx.indexOf('<script src="js/91-ics-parser.js">')<idx.indexOf('<script src="js/92-termine.js">'),"Parser vor der Oberfläche geladen");
 p(!/https?:\/\//.test(q.replace(/\/\/.*$/gm,""))&&!/geolocation|apikey/i.test(q),"Kein Aufruf eines Drittanbieters, keine Standortabfrage");
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();
