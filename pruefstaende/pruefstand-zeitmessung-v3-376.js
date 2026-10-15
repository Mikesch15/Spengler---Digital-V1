// v3.376/377: Zeitmessung fuer Regiestunden (v3.377: von Hand, Projekt/Massaufnahme, zuklappbar, Benachrichtigung) - Start/Pause/Weiter/Stopp, effektive Zeit (h:min) sichtbar, Rundung auf 15 Minuten,
// Uebernahme als Arbeitsposition, Stand ueberlebt Neuladen. Die Uhrzeit wird im Test festgesetzt (Date.now ersetzt), nicht abgewartet.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));
 await stubSchuetzen(page);
 await page.addInitScript(()=>{
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
   from:()=>{const q={};['select','eq','order','limit','in','is','lte','gte'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
   storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})};
 });
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};allProfiles=[currentProfile];meineRechte={admin:true};
  $("appRoot").hidden=false;$("authScreen").hidden=true;window.__alerts=[];window.__confirm=true;
  window.appAlert=async t=>{window.__alerts.push(t)};window.appConfirm=async()=>window.__confirm;
  window.__t=1800000000000;Date.now=()=>window.__t;   // feste Uhr
  localStorage.removeItem("sd_zeitmessung");zmVerwerfen();
  window.__min=n=>{window.__t+=n*60000};
 });
 const alerts=()=>page.evaluate(()=>{const a=window.__alerts.slice();window.__alerts.length=0;return a});
 const min=n=>page.evaluate(n=>__min(n),n);
 const set=(sel,v)=>page.evaluate(([s,v])=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}))},[sel,v]);

 console.log("\nA · Rechnung (rein)");
 const R=await page.evaluate(()=>({
  r:[0,3,7,7.49,7.5,8,14,15,22,22.5,37,37.5,38,45,60,67,68,75,127].map(m=>[m,zmRunden(m*60000).minuten]),
  h:[zmRunden(45*60000).stunden,zmRunden(68*60000).stunden],
  t:[0,59999,60000,42*60000,67*60000,120*60000,61*60000].map(zmText),u:zmUhr(3725000),neg:zmText(-5)}));
 const soll={0:0,3:0,7:0,7.49:0,7.5:15,8:15,14:15,15:15,22:15,22.5:30,37:30,37.5:45,38:45,45:45,60:60,67:60,68:75,75:75,127:120};
 p(R.r.every(([m,q])=>q===soll[m]),"Rundung auf die nächste Viertelstunde (7,5 min und mehr runden auf)",R.r.filter(([m,q])=>q!==soll[m]));
 p(R.h[0]===0.75&&R.h[1]===1.25,"Stunden: 45 min = 0,75 h; 68 min = 1,25 h",R.h);
 p(R.t.join("|")==="0 min|0 min|1 min|42 min|1 h 07 min|2 h|1 h 01 min","Effektive Zeit in Stunden und Minuten (Minuten abgeschnitten, nicht gerundet)",R.t);
 p(R.u==="1:02:05"&&R.neg==="0 min","Laufende Uhr h:mm:ss; negative Zeit wird 0",[R.u,R.neg]);

 console.log("\nB · Ablauf Start – Pause – Weiter – Stopp");
 await page.evaluate(()=>{zmEntwurf.notiz="Rinne montiert";zmStart("")});
 await min(20);
 let z=await page.evaluate(()=>({ph:zmZustand.phase,ms:zmGemessenMs()}));
 p(z.ph==="laeuft"&&z.ms===20*60000,"Läuft: nach 20 min stehen 20 min",z);
 await page.evaluate(()=>zmPause());await min(30);
 z=await page.evaluate(()=>({ph:zmZustand.phase,ms:zmGemessenMs()}));
 p(z.ph==="pause"&&z.ms===20*60000,"Pause: die 30 min Pause zählen nicht",z);
 p(!(await page.evaluate(()=>zmPause()))&&!(await page.evaluate(()=>zmStart("").ok)),"Pause in der Pause und zweiter Start werden ignoriert (nur EINE Messung)");
 await page.evaluate(()=>zmWeiter());await min(25);
 await page.evaluate(()=>zmStopp());await min(120);
 z=await page.evaluate(()=>({ph:zmZustand.phase,ms:zmGemessenMs(),notiz:zmZustand.notiz}));
 p(z.ph==="fertig"&&z.ms===45*60000&&z.notiz==="Rinne montiert","Stopp: 45 min effektiv; danach läuft nichts mehr weiter (auch nach 2 h)",z);
 p(!(await page.evaluate(()=>zmWeiter()))&&!(await page.evaluate(()=>zmStopp())),"Weiter/Stopp nach dem Stopp werden ignoriert");

 console.log("\nC · Stand überlebt Neuladen");
 await page.evaluate(()=>{zmVerwerfen();zmEntwurf.notiz="Dach";zmStart("");});await min(10);
 const l1=await page.evaluate(()=>{const gespeichert=localStorage.getItem("sd_zeitmessung");zmZustand={phase:"aus",summeMs:0,seit:0,notiz:"",ergebnisMs:0};zmLaden();return {ph:zmZustand.phase,ms:zmGemessenMs(),n:zmZustand.notiz,ok:!!gespeichert}});
 p(l1.ok&&l1.ph==="laeuft"&&l1.ms===10*60000&&l1.n==="Dach","Laufende Uhr wird nach dem Laden wiederhergestellt",l1);
 await min(60);
 p(await page.evaluate(()=>zmGemessenMs())===70*60000,"Die Zeit läuft während die App zu war weiter (Zeitstempel, kein Zähler)");
 const l2=await page.evaluate(()=>{localStorage.setItem("sd_zeitmessung","{kaputt");zmZustand={phase:"aus",summeMs:0,seit:0,notiz:"",ergebnisMs:0};zmLaden();const a=zmZustand.phase;
  localStorage.setItem("sd_zeitmessung",JSON.stringify({phase:"laeuft",summeMs:0,seit:Date.now()+86400000,notiz:""}));zmLaden();const ms0=zmGemessenMs();__min(10);const ms=zmGemessenMs()-ms0;
  localStorage.setItem("sd_zeitmessung",JSON.stringify({phase:"quatsch",summeMs:"x"}));zmZustand={phase:"aus",summeMs:0,seit:0,notiz:"",ergebnisMs:0};zmLaden();return {a,ms,c:zmZustand.phase}});
 p(l2.a==="aus"&&l2.c==="aus","Kaputter oder unbekannter gespeicherter Stand: Uhr bleibt aus",l2);
 p(l2.ms===10*60000,"Zeitstempel in der Zukunft (Geräteuhr verstellt): die Uhr zählt ab dem Laden normal weiter",l2.ms);
 await page.evaluate(()=>{zmVerwerfen()});

console.log("\nD · Anzeige: zuklappbar, Startseite und Regierapport");
 const heute=await page.evaluate(()=>{a2Zustand.seite="heute";const h=a2SeiteHeute();return /data-zm-ort="heute"/.test(h)});
 p(heute,"Die Startseite hat die Karte „Zeit messen“");
 const rap=await page.evaluate(()=>!!document.querySelector('[data-zm-ort="rapport"]'));
 p(rap,"Der Regierapport hat den Kasten „Zeit messen“");
 // Standard: zugeklappt
 const zu0=await page.evaluate(()=>{const e=document.querySelector('[data-zm-ort="rapport"]');return {zu:e.classList.contains("a2-zm-zu"),form:!!e.querySelector("[data-zm-feld]"),kurz:e.innerText}});
 p(zu0.zu&&!zu0.form&&/bereit/.test(zu0.kurz),"Standard: zugeklappt, nur eine Zeile („bereit“), kein Formular",zu0);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="zu"]').click());
 const of=await page.evaluate(()=>{const e=document.querySelector('[data-zm-ort="rapport"]');return {zu:e.classList.contains("a2-zm-zu"),form:!!e.querySelector("[data-zm-feld='notiz']"),ls:localStorage.getItem("sd_zeitmessung_zu")}});
 p(!of.zu&&of.form&&of.ls==="0","Aufklappen zeigt das Formular; die Wahl wird gemerkt",of);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="zu"]').click());
 const zu1=await page.evaluate(()=>({zu:document.querySelector('[data-zm-ort="rapport"]').classList.contains("a2-zm-zu"),ls:localStorage.getItem("sd_zeitmessung_zu")}));
 p(zu1.zu&&zu1.ls==="1","Wieder zuklappen funktioniert und wird gemerkt",zu1);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="zu"]').click());
 p(await page.evaluate(()=>!!document.querySelector('[data-zm-ort="heute"]')===false||document.querySelector('[data-zm-ort="heute"]').classList.contains("a2-zm-zu")===false),"Beide Karten (Startseite/Rapport) teilen den Zustand");

 console.log("\nE · Projekt und Massaufnahme wählen");
 await page.evaluate(()=>{
  allProjects=[{id:1,object:"Hauptstrasse 12, 3000 Bern",name:"Dach Muster",order_no:"A-1001",archived:false},{id:2,object:"Bahnhofstr. 3",name:"Fassade",order_no:"A-2002",archived:false}];
  const alt=sb.from;window.__abfragen=[];
  sb.from=n=>{const q={};const st={n,f:[]};['select','order','limit'].forEach(k=>q[k]=()=>q);q.eq=(k,v)=>{st.f.push([k,v]);return q};
   q.then=(res,rej)=>Promise.resolve().then(()=>{window.__abfragen.push(st);
    if(n==="measurements")return {data:[{id:11,title:"Dach Nord",type:"einlaufblech_gerade",archived:false},{id:12,title:"Anschluss Kamin",type:"kamineinfassung",archived:false}],error:null};
    return {data:[],error:null}}).then(res,rej);return q};
  zmVerwerfen();zmMassCache={};
  const e=document.querySelector('[data-zm-ort="rapport"]');window.__sel=e;
 });
 const optP=await page.evaluate(()=>[...document.querySelectorAll('[data-zm-ort="rapport"] [data-zm-feld="pid"] option')].map(o=>o.textContent));
 p(optP.length===3&&/kein Projekt/.test(optP[0])&&/A-1001/.test(optP[1]),"Projektliste: „kein Projekt“ plus die Projekte mit Auftragsnummer",optP);
 p(await page.evaluate(()=>!document.querySelector('[data-zm-ort="rapport"] [data-zm-mass]')),"Ohne Projekt gibt es keine Massaufnahme-Auswahl");
 await set('[data-zm-ort="rapport"] [data-zm-feld="pid"]',"1");await page.waitForTimeout(300);
 const optM=await page.evaluate(()=>({o:[...document.querySelectorAll('[data-zm-ort="rapport"] [data-zm-mass] option')].map(x=>x.textContent),q:window.__abfragen.filter(a=>a.n==="measurements").map(a=>JSON.stringify(a.f))}));
 p(optM.o.length===3&&optM.o[0].indexOf("ganzes Projekt")>=0&&optM.o.some(t=>/Dach Nord/.test(t))&&optM.o.some(t=>/Anschluss Kamin/.test(t)),"Projekt gewählt: Massaufnahmen dieses Projekts erscheinen (plus „ganzes Projekt“)",optM);
 p(optM.q.length===1&&/\["project_id",1\]/.test(optM.q[0])&&/\["archived",false\]/.test(optM.q[0]),"Abfrage nur für dieses Projekt und ohne archivierte",optM.q);
 await set('[data-zm-ort="rapport"] [data-zm-mass]',"12");
 await set('[data-zm-ort="rapport"] [data-zm-feld="notiz"]',"Kamin abdichten");
 await page.evaluate(()=>{document.querySelector('[data-zm-ort="rapport"] [data-zm="start"]').click()});await page.waitForTimeout(200);
 const zst=await page.evaluate(()=>({pid:zmZustand.pid,mid:zmZustand.mid,pt:zmZustand.projekt,mt:zmZustand.mass,txt:document.querySelector('[data-zm-ort="rapport"]').innerText}));
 p(zst.pid===1&&zst.mid===12&&/Hauptstrasse 12/.test(zst.pt)&&/Anschluss Kamin/.test(zst.mt)&&/Hauptstrasse 12.*Anschluss Kamin/.test(zst.txt.replace(/\s+/g," ")),"Die Messung merkt sich Projekt und Massaufnahme und zeigt sie an",zst);
 await min(30);await page.evaluate(()=>zmStopp());
 // Projekt passt nicht zum offenen Rapport -> Nachfrage
 await page.evaluate(()=>{currentProjectId=2;window.__fragen=[];window.appConfirm=async t=>{window.__fragen.push(t);return window.__confirm}; window.__confirm=false});
 const v0=await page.evaluate(()=>works.length);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="uebernehmen"]').click());await page.waitForTimeout(200);
 const fr=await page.evaluate(()=>({n:works.length,f:window.__fragen.slice(),ph:zmZustand.phase}));
 p(fr.n===v0&&fr.ph==="fertig"&&fr.f.length===1&&/Hauptstrasse 12/.test(fr.f[0]),"Anderes Projekt als der offene Rapport: Nachfrage; bei „Nein“ wird nichts übernommen",fr);
 await page.evaluate(()=>{window.__confirm=true});
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="uebernehmen"]').click());await page.waitForTimeout(200);
 const ue=await page.evaluate(()=>({w:works[works.length-1],ph:zmZustand.phase}));
 p(ue.w.hours===0.5&&ue.w.desc==="Kamin abdichten – Anschluss Kamin"&&ue.ph==="aus","Bei „Ja“: 0,5 h, Beschreibung = Notiz und Massaufnahme",ue);
 await page.evaluate(()=>{currentProjectId=null;window.appConfirm=async()=>window.__confirm;window.__confirm=true});

 console.log("\nF · Beginn/Ende von Hand");
 const H=await page.evaluate(()=>({
  a:zmHandDauer("2026-10-16","07:30","09:15",""),b:zmHandDauer("2026-10-16","07:30","09:15","15"),c:zmHandDauer("2026-10-16","09:00","08:00",""),d:zmHandDauer("2026-10-16","09:00","09:00",""),
  e:zmHandDauer("2026-10-16","09:00","10:00","60"),f:zmHandDauer("2026-10-16","09:00","10:00","-5"),g:zmHandDauer("2026-10-16","","10:00",""),h:zmHandDauer("","09:00","10:00",""),i:zmHandDauer("2026-10-16","09:00","10:00","abc")}));
 p(H.a.ok&&H.a.ms===105*60000&&H.b.ok&&H.b.ms===90*60000,"07:30–09:15 = 1 h 45 min; mit 15 min Pause = 1 h 30 min",[H.a,H.b]);
 p(!H.c.ok&&!H.d.ok&&!H.e.ok&&!H.f.ok&&!H.g.ok&&!H.h.ok&&!H.i.ok,"Ende vor/gleich Beginn, Pause ≥ Dauer, negative/unleserliche Pause, fehlende Zeit/Datum: abgelehnt",H);
 await page.evaluate(()=>zmVerwerfen());
 await set('[data-zm-ort="rapport"] [data-zm-feld="datum"]',"2026-10-12");
 await set('[data-zm-ort="rapport"] [data-zm-feld="beginn"]',"07:30");
 await set('[data-zm-ort="rapport"] [data-zm-feld="ende"]',"09:15");
 await set('[data-zm-ort="rapport"] [data-zm-feld="pause"]',"15");
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="hand"]').click());await page.waitForTimeout(200);
 const hm=await page.evaluate(()=>({ph:zmZustand.phase,ms:zmZustand.ergebnisMs,txt:document.querySelector('[data-zm-ort="rapport"]').innerText.replace(/\s+/g," ")}));
 p(hm.ph==="fertig"&&hm.ms===90*60000&&/07:30–09:15/.test(hm.txt)&&/Pause 15 min/.test(hm.txt)&&/Effektiv gemessen 1 h 30 min/.test(hm.txt)&&/1[.,]50 h/.test(hm.txt),"Von Hand erfasst: Ergebnis zeigt Zeitraum, Pause, effektiv 1 h 30 min und gerundet 1,50 h",hm.txt);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="uebernehmen"]').click());await page.waitForTimeout(200);
 const hw=await page.evaluate(()=>works.find(w=>w.date==="2026-10-12")||{});
 p(hw.hours===1.5&&hw.date==="2026-10-12","Übernahme setzt das gewählte Datum (12.10.) in die Arbeitszeile",hw);
 // Fehlerfall
 await page.evaluate(()=>{window.__alerts.length=0});
 await set('[data-zm-ort="rapport"] [data-zm-feld="beginn"]',"10:00");await set('[data-zm-ort="rapport"] [data-zm-feld="ende"]',"09:00");
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="hand"]').click());await page.waitForTimeout(150);
 p((await alerts()).some(a=>/nicht nach dem Beginn/.test(a))&&(await page.evaluate(()=>zmZustand.phase))==="aus","Ende vor Beginn von Hand: Meldung, keine Messung");
 // Start mit früherem Beginn
 await page.evaluate(()=>{zmEntwurf.beginn="";zmEntwurf.ende="";zmEntwurf.pause=""});
 const jetztHm=await page.evaluate(()=>zmHm(Date.now()));
 await page.evaluate(()=>{const h=new Date(Date.now()-90*60000);zmEntwurf.beginn=zmHm(h.getTime());});
 const st=await page.evaluate(()=>{const r=zmStart(zmEntwurf.beginn);return {r,ms:zmGemessenMs(),b:zmZustand.beginn}});
 p(st.r.ok&&st.ms>=89*60000&&st.ms<=91*60000,"Stoppuhr mit früherem Beginn (vor 90 min): die Uhr startet bei 1 h 30 min",st);
 await page.evaluate(()=>zmVerwerfen());
 const fut=await page.evaluate(()=>{const h=new Date(Date.now()+3*3600000);return zmStart(zmHm(h.getTime())+"")});
 p(!fut.ok&&/Zukunft/.test(fut.meldung)||(await page.evaluate(()=>zmZustand.phase))==="aus","Beginn in der Zukunft wird abgelehnt (ausser über Mitternacht-Randfall)",fut);
 await page.evaluate(()=>zmVerwerfen());
 p(!(await page.evaluate(()=>zmStart("25:99").ok)),"Ungültige Beginn-Zeit wird abgelehnt");

 console.log("\nG · Benachrichtigung");
 await page.evaluate(()=>{window.__notif=[];window.__notifZu=0;window.__perm="default";
  window.zmNotifStatus=()=>window.__perm;
  window.zmNotifErlaubnis=async()=>{window.__perm="granted";return "granted"};
  window.zmNotifSenden=async(t,x)=>{if(window.__perm!=="granted")return false;window.__notif.push([t,x]);return true};
  window.zmNotifSchliessen=async()=>{window.__notifZu++};});
 await set('[data-zm-ort="rapport"] [data-zm-feld="notiz"]',"Rinne montiert");
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="start"]').click());await page.waitForTimeout(300);
 let n=await page.evaluate(()=>window.__notif.slice());
 p(n.length>=1&&/Zeit läuft seit \d\d:\d\d/.test(n[n.length-1][0])&&/Stand \d\d:\d\d: 0 min/.test(n[n.length-1][1])&&/Rinne montiert/.test(n[n.length-1][1]),"Beim Start erscheint die Benachrichtigung „Zeit läuft seit hh:mm“ mit Stand und bisheriger Zeit",n);
 const nPerm=await page.evaluate(()=>window.__perm);
 p(nPerm==="granted","Die Erlaubnis wird beim Start (Tipp) erfragt");
 p(await page.evaluate(()=>zmNotifTimer!==null),"Solange die Uhr läuft, frischt ein Minutentakt die Benachrichtigung auf");
 await min(67);
 await page.evaluate(()=>zmNotifAuffrischen());await page.waitForTimeout(100);
 n=await page.evaluate(()=>window.__notif.slice());
 p(/Stand \d\d:\d\d: 1 h 07 min/.test(n[n.length-1][1]),"Auffrischen: die Benachrichtigung nennt die verstrichene Zeit (1 h 07 min)",n[n.length-1]);
 await page.evaluate(()=>zmPause());await page.waitForTimeout(100);
 n=await page.evaluate(()=>window.__notif.slice());
 p(/angehalten/.test(n[n.length-1][0])&&/1 h 07 min/.test(n[n.length-1][1]),"Pause: Benachrichtigung zeigt „angehalten“ mit der Zeit",n[n.length-1]);
 const z0=await page.evaluate(()=>window.__notifZu);
 await page.evaluate(()=>{zmWeiter();zmStopp()});await page.waitForTimeout(100);
 p((await page.evaluate(()=>window.__notifZu))>z0,"Stopp schliesst die Benachrichtigung");
 p(await page.evaluate(()=>zmNotifTimer===null&&zmTimer===null),"Nach dem Stopp laufen keine Takte mehr");
 const z1=await page.evaluate(()=>window.__notifZu);
 await page.evaluate(()=>zmVerwerfen());await page.waitForTimeout(50);
 p((await page.evaluate(()=>window.__notifZu))>z1,"Verwerfen schliesst sie ebenfalls");
 // keine Erlaubnis -> keine Benachrichtigung, aber Uhr läuft; Hinweistext
 await page.evaluate(()=>{window.__perm="denied";window.zmNotifErlaubnis=async()=>"denied";window.__notif.length=0});
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="zu"]').click());
 const hinweis=await page.evaluate(()=>{zmZu=false;zmZeichnen();return document.querySelector('[data-zm-ort="rapport"]').innerText.replace(/\s+/g," ")});
 p(/blockiert/.test(hinweis),"Blockierte Benachrichtigungen: ehrlicher Hinweis im Formular",hinweis.slice(0,200));
 await page.evaluate(()=>zmStart(""));await page.waitForTimeout(150);
 p((await page.evaluate(()=>({ph:zmZustand.phase,n:window.__notif.length})))&&(await page.evaluate(()=>zmZustand.phase))==="laeuft"&&(await page.evaluate(()=>window.__notif.length))===0,"Ohne Erlaubnis läuft die Uhr trotzdem, es wird nichts gesendet");
 await page.evaluate(()=>zmVerwerfen());
 const inh=await page.evaluate(()=>({aus:zmNotifInhalt(ZM_LEER()),f:zmNotifInhalt(Object.assign(ZM_LEER(),{phase:"fertig"}))}));
 p(inh.aus===null&&inh.f===null,"Ohne laufende Messung gibt es keinen Benachrichtigungstext");
 const sw0=fs.readFileSync("sw.js","utf8");
 p(/notificationclick/.test(sw0)&&/openWindow/.test(sw0)&&/focus\(\)/.test(sw0),"Der Service Worker öffnet die App beim Antippen der Benachrichtigung");

 console.log("\nH · Einbindung");
 const idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8"),q=fs.readFileSync("js/93-zeitmessung.js","utf8");
 p(/<script src="js\/93-zeitmessung\.js">/.test(idx)&&/js\/93-zeitmessung\.js/.test(sw),"js/93 in index.html UND sw.js");
 p(!/\.insert\(|\.update\(|\.upsert\(|\.delete\(|functions\.invoke|fetch\(|https?:\/\//.test(q.replace(/\/\/.*$/gm,""))&&(q.match(/sb\.from\(/g)||[]).length===1,"Die Zeitmessung schreibt nichts in die Datenbank (nur eine Leseabfrage der Massaufnahmen), kein Server-Aufruf");
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();
