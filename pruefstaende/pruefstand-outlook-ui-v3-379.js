// v3.379: Oberfläche der Outlook-Synchronisation im Schirm "Termine" (js/94-outlook.js). Die Edge Function ist ein Stub (sb.functions.invoke);
// geprüft ist, was die Person sieht und was der Browser an den Server schickt - nicht Microsoft selbst.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const INIT=()=>{
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:()=>{const q={};['select','eq','order','limit','in','is','lte','gte'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
  storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})};
};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const mk=async(q)=>{const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));await stubSchuetzen(page);await page.addInitScript(INIT);
  await page.goto("file://"+path.join(process.cwd(),"index.html")+(q||""));await page.waitForTimeout(400);
  await page.evaluate(()=>{
   currentProfile={id:"u1",role:"employee",first_name:"Max",last_name:"Muster",company_id:"c1"};allProfiles=[currentProfile];meineRechte={};
   allProjects=[{id:1,object:"Hauptstrasse 12, 3000 Bern",name:"Dach Muster",order_no:"A-1001",archived:false}];
   $("appRoot").hidden=false;$("authScreen").hidden=true;window.__alerts=[];window.__confirm=true;
   window.appAlert=async t=>{window.__alerts.push(t)};window.appConfirm=async()=>window.__confirm;
   window.__tab={outlook_verbindungen:null,outlook_termin_map:[],termine:[]};window.__aufrufe=[];window.__antwort={};window.__upd=[];
   sb.from=n=>{const st={n,f:[]};const q={};['select','order','limit','lte','gte'].forEach(k=>q[k]=()=>q);
    q.eq=(k,v)=>{st.f.push([k,v]);return q};q.in=(k,v)=>{st.in=v;return q};
    q.update=w=>{st.upd=w;window.__upd.push([n,w]);return q};
    q.maybeSingle=async()=>({data:window.__tab[n]||null,error:null});
    q.then=(res,rej)=>Promise.resolve().then(()=>{
     let d=window.__tab[n];if(!Array.isArray(d))d=d?[d]:[];
     if(n==="outlook_termin_map")d=d.filter(x=>st.f.every(([k,v])=>x[k]===v));
     if(n==="termine"&&st.in)d=d.filter(x=>st.in.includes(x.id));
     if(st.upd)return {data:[{id:1}],error:null};
     return {data:d,error:null}}).then(res,rej);return q};
   sb.functions={invoke:async(name,opt)=>{window.__aufrufe.push({name,body:opt.body});const a=window.__antwort[opt.body.aktion];
     if(typeof a==="function")return a(opt.body);
     return {data:a||{ok:true},error:null}}};
   window.__weiter=null;window.olWeiter=u=>{window.__weiter=u};
  });
  return page;};
 const sehe=(page)=>page.evaluate(()=>document.getElementById("outlookBox").innerText.replace(/\s+/g," "));
 const laden=async(page)=>{await page.evaluate(()=>{olGeladen=false;return olLaden()});await page.waitForTimeout(150)};
 const VERB=(x)=>Object.assign({id:1,profile_id:"u1",ms_konto:"max@beispiel.ch",kalender_id:"K",import_modus:"alle",status:"verbunden",letzter_erfolg:"2026-10-15T10:00:00Z",letzte_meldung:null,anz_neu:2,anz_geaendert:1,anz_uebersprungen:3,anz_konflikte:0},x||{});

 console.log("\nA · Nicht verbunden");
 let page=await mk();
 await page.evaluate(()=>{terOeffnen();document.getElementById("terKalenderDetails").open=true});await page.waitForTimeout(300);
 let t=await sehe(page);
 p(/Outlook-Kalender verbinden \(optional\)/.test(t)&&/alle Mitarbeiter mit Projektrecht/.test(t)&&/Private Outlook-Termine werden nie übernommen/.test(t)&&/Projekt prüfen/.test(t),"Vor dem Verbinden steht offen, was passiert (Sichtbarkeit für alle mit Projektrecht, privat nie, „Projekt prüfen“)",t.slice(0,300));
 p(await page.evaluate(()=>document.getElementById("olVerbinden").disabled),"Der Knopf „Mit Outlook verbinden“ ist gesperrt, bis die Einwilligung angehakt ist");
 await page.evaluate(()=>{document.getElementById("olVerbinden").click()});await page.waitForTimeout(100);
 p((await page.evaluate(()=>window.__aufrufe.length))===0,"Ohne Einwilligung geht kein Aufruf an den Server");
 await page.evaluate(()=>{const c=document.getElementById("olEinwilligung");c.checked=true;c.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.evaluate(()=>{window.__antwort.start={ok:true,url:"https://login.microsoftonline.com/x/oauth2/v2.0/authorize?state=abc"}});
 await page.evaluate(()=>document.getElementById("olVerbinden").click());await page.waitForTimeout(200);
 const st=await page.evaluate(()=>({a:window.__aufrufe.slice(),w:window.__weiter}));
 p(st.a.length===1&&st.a[0].name==="outlook-sync"&&st.a[0].body.aktion==="start"&&/^file:|^https?:/.test(st.a[0].body.rueck)&&!("company_id" in st.a[0].body)&&!("profile_id" in st.a[0].body),"Verbinden: ein Aufruf „start“ mit der Rücksprung-Adresse – ohne Firma oder Person (die kommen aus dem Token)",st.a);
 p(/login\.microsoftonline\.com/.test(st.w||""),"Danach geht es zur Microsoft-Anmeldung (Adresse vom Server)",st.w);
 await page.evaluate(()=>{window.__antwort.start={ok:false,error:"Outlook ist auf dem Server noch nicht fertig eingerichtet (Microsoft-Geheimnis fehlt)."};window.__weiter=null;document.getElementById("olVerbinden").click()});await page.waitForTimeout(200);
 t=await sehe(page);
 p(/Geheimnis fehlt/.test(t)&&(await page.evaluate(()=>window.__weiter))===null,"Antwortet der Server „nicht eingerichtet“: verständliche Meldung, keine Weiterleitung");
 await page.close();

 console.log("\nB · Verbunden: Status, Abgleich, Fehler");
 page=await mk();
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v},VERB({letzte_meldung:"Private Outlook-Termine werden nie übernommen."}));
 await page.evaluate(()=>{terOeffnen();document.getElementById("terKalenderDetails").open=true});await page.waitForTimeout(300);
 t=await sehe(page);
 p(/max@beispiel\.ch/.test(t)&&/✓ verbunden/.test(t)&&/letzter erfolgreicher Abgleich/.test(t)&&/2 neu, 1 geändert, 3 übersprungen/.test(t)&&/Private Outlook-Termine/.test(t)&&/etwa alle 5 Minuten/.test(t),"Konto, Status, letzter Abgleich, Zahlen, Hinweis und der Satz zum Hintergrundbetrieb sind sichtbar",t.slice(0,400));
 await page.evaluate(()=>{window.__antwort.sync={ok:true,neu:2,geaendert:1,uebersprungen:0,konflikte:0,fehler:0,gefunden:5,hinweise:[]};document.getElementById("olSync").click()});await page.waitForTimeout(400);
 t=await sehe(page);
 const sy=await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="sync").length);
 p(sy===1&&/Abgleich fertig: 2 neu, 1 geändert/.test(t)&&/In Outlook gefunden: 5 Termin/.test(t),"„Jetzt synchronisieren“: ein Aufruf, Ergebnis wird angezeigt",t.slice(0,300));
 await page.evaluate(()=>{window.__antwort.sync={ok:false,meldung:"Microsoft bremst gerade (zu viele Anfragen). Der nächste Lauf versucht es erneut."};document.getElementById("olSync").click()});await page.waitForTimeout(400);
 t=await sehe(page);
 p(/Microsoft bremst/.test(t)&&/a2-ol-fehler/.test(await page.evaluate(()=>document.getElementById("outlookBox").innerHTML)),"Fehler des Abgleichs werden verständlich und als Fehler gezeigt");
 await page.evaluate(()=>{window.__antwort.sync={ok:true,uebersprungen:true,meldung:"Ein Abgleich läuft gerade oder wurde eben erst ausgeführt."};document.getElementById("olSync").click()});await page.waitForTimeout(300);
 p(/läuft gerade/.test(await sehe(page)),"Läuft schon ein Abgleich: Hinweis statt Fehler");
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;olGeladen=false;return olLaden()},VERB({status:"fehler",letzte_meldung:"Die Outlook-Anmeldung ist abgelaufen oder wurde widerrufen. Bitte neu verbinden."}));await page.waitForTimeout(200);
 t=await sehe(page);
 p(/Anmeldung nötig/.test(t)&&!!(await page.evaluate(()=>document.getElementById("olVerbinden")))&&!(await page.evaluate(()=>document.getElementById("olSync"))),"Abgelaufene Anmeldung: „Anmeldung nötig“ und „Neu verbinden“ statt „Jetzt synchronisieren“",t.slice(0,200));
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;olGeladen=false;olMeldung="";return olLaden()},VERB());await page.waitForTimeout(200);
 // Modus
 await page.evaluate(()=>{window.__antwort.modus={ok:true};const s=document.getElementById("olModusWahl");s.value="markierte";s.dispatchEvent(new Event("change",{bubbles:true}))});await page.waitForTimeout(200);
 const mo=await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="modus").map(a=>a.body));
 p(mo.length===1&&mo[0].import_modus==="markierte","Umschalten auf „nur Kategorie Spengler-DIGITAL“ geht als Aufruf „modus“ an den Server",mo);
 // Trennen
 await page.evaluate(()=>{window.__confirm=false;document.getElementById("olTrennen").click()});await page.waitForTimeout(150);
 p((await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="trennen").length))===0,"Trennen abgebrochen: kein Aufruf");
 await page.evaluate(()=>{window.__confirm=true;window.__tab.outlook_verbindungen=null;document.getElementById("olTrennen").click()});await page.waitForTimeout(400);
 t=await sehe(page);
 p((await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="trennen").length))===1&&/Outlook-Kalender verbinden/.test(t)&&/getrennt/.test(t),"Trennen bestätigt: Aufruf, Ansicht wechselt zu „verbinden“ mit Bestätigung");
 await page.close();

 console.log("\nC · Konflikte");
 page=await mk();
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;window.__tab.outlook_termin_map=[{id:11,termin_id:5,konflikt:true,verbindung_id:1},{id:12,termin_id:6,konflikt:false,verbindung_id:1},{id:13,termin_id:9,konflikt:true,verbindung_id:2}];
  window.__tab.termine=[{id:5,titel:"Besprechung <img src=x onerror=window.__xss=1>",start_datum:"2026-10-20",start_zeit:"08:00"}]},VERB({anz_konflikte:1}));
 await page.evaluate(()=>{terOeffnen();document.getElementById("terKalenderDetails").open=true});await page.waitForTimeout(400);
 t=await sehe(page);
 const html=await page.evaluate(()=>document.getElementById("outlookBox").innerHTML);
 p(/1 Konflikt/.test(t)&&/beide Seiten wurden geändert/.test(t)&&/Es wurde nichts überschrieben/.test(t)&&(await page.evaluate(()=>document.querySelectorAll("[data-ol-konflikt]").length))===2,"Ein Konflikt wird mit zwei Entscheidungsknöpfen gezeigt (der nicht konfligierende Eintrag nicht)",t.slice(0,300));
 p(!(await page.evaluate(()=>window.__xss||0))&&/&lt;img/.test(html),"Ein Titel mit HTML wird als Text gezeigt, nicht ausgeführt");
 await page.evaluate(()=>{window.__antwort.konflikt={ok:true};document.querySelector('[data-ol-konflikt="11"][data-wahl="app"]').click()});await page.waitForTimeout(400);
 const kf=await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="konflikt").map(a=>a.body));
 p(kf.length===1&&kf[0].map_id===11&&kf[0].wahl==="app",'„App-Stand behalten“ schickt {map_id:11, wahl:"app"}',kf);
 await page.evaluate(()=>{window.__antwort.konflikt={ok:false,error:"Das Outlook-Ereignis existiert nicht mehr."};window.__tab.outlook_termin_map=[{id:11,termin_id:5,konflikt:true,verbindung_id:1}];document.querySelector('[data-ol-konflikt="11"][data-wahl="outlook"]').click()});await page.waitForTimeout(400);
 p(/existiert nicht mehr/.test(await sehe(page)),"Misslingt die Lösung, steht der Grund da");
 await page.close();

 console.log("\nD · Rückkehr von Microsoft (?outlook=ok / fehler)");
 page=await mk("?outlook=ok");
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;window.__antwort.sync={ok:true,neu:3,geaendert:0,uebersprungen:0,konflikte:0,fehler:0,hinweise:[]};window.__antwort.modus={ok:true};sessionStorage.setItem("sd_ol_modus","markierte")},VERB());
 await page.evaluate(()=>olRueckkehr());await page.waitForTimeout(700);
 const ru=await page.evaluate(()=>({url:location.search,modal:!$("termineModal").hidden,a:window.__aufrufe.map(a=>a.body.aktion),t:document.getElementById("outlookBox").innerText.replace(/\s+/g," ")}));
 p(ru.url===""&&ru.modal&&ru.a.includes("sync")&&ru.a.includes("modus"),"Rückkehr „ok“: Adresse bereinigt, Termine offen, gewählter Modus gespeichert und erster Abgleich gestartet",ru);
 p(/3 neu/.test(ru.t),"Das Ergebnis des ersten Abgleichs ist sichtbar",ru.t.slice(0,200));
 await page.close();
 page=await mk("?outlook=fehler");
 await page.evaluate(()=>olRueckkehr());await page.waitForTimeout(500);
 const rf=await page.evaluate(()=>({a:window.__aufrufe.map(a=>a.body.aktion),t:document.getElementById("outlookBox").innerText.replace(/\s+/g," "),url:location.search}));
 p(/nicht zustande gekommen/.test(rf.t)&&!rf.a.includes("sync")&&rf.url==="","Rückkehr „fehler“: verständliche Meldung, kein Abgleich");
 await page.close();

 console.log("\nE · Termin-Liste und Bearbeiten");
 page=await mk();
 await page.evaluate(()=>{
  const tag=terHeute();
  terWoche=terMontag(tag);
  terDaten=[{id:7,titel:"Aus Outlook",start_datum:tag,ende_datum:tag,start_zeit:"08:00",ende_zeit:"09:00",ort:"Bern",notiz:null,project_id:null,mitarbeiter:[],quelle:"outlook",projekt_pruefen:true},
   {id:8,titel:"Mit Projekt",start_datum:tag,ende_datum:tag,start_zeit:"10:00",ende_zeit:null,ort:null,notiz:null,project_id:1,mitarbeiter:[],quelle:"app",projekt_pruefen:false}];
  $("termineModal").hidden=false;terZeichnen();});
 const li=await page.evaluate(()=>document.getElementById("terListe").innerText.replace(/\s+/g," "));
 p(/📧 Aus Outlook/.test(li)&&/Projekt prüfen/.test(li)&&!/📧 Mit Projekt/.test(li),"Termine aus Outlook tragen 📧; „Projekt prüfen“ steht nur bei unsicherer Zuordnung",li.slice(0,300));
 await page.evaluate(()=>document.querySelector('[data-ter-edit="8"]').click());
 p(!!(await page.evaluate(()=>document.getElementById("terProjektOeffnen"))),"Ein Termin mit Projekt hat „Projekt öffnen“");
 await page.evaluate(()=>{window.__geoeffnet=null;window.a2ProjektOeffnen=async id=>{window.__geoeffnet=id};document.getElementById("terProjektOeffnen").click()});await page.waitForTimeout(150);
 p((await page.evaluate(()=>window.__geoeffnet))===1,"„Projekt öffnen“ führt zum Projekt 1");
 await page.evaluate(()=>{$("termineModal").hidden=false;document.querySelector('[data-ter-edit="7"]').click()});
 p(/nicht sicher|ohne sichere Projektzuordnung/.test(await page.evaluate(()=>document.getElementById("terEditor").innerText)),"Im Editor eines „Projekt prüfen“-Termins steht der Hinweis");
 await page.evaluate(()=>{window.__upd.length=0;document.getElementById("terSpeichern").click()});await page.waitForTimeout(300);
 const up=await page.evaluate(()=>window.__upd.filter(x=>x[0]==="termine").map(x=>x[1]));
 p(up.length===1&&up[0].projekt_pruefen===false,"Speichern setzt „Projekt prüfen“ zurück (die Zuordnung gilt als geprüft)",up);
 await page.close();

 console.log("\nF · Sicherheit des Browser-Codes");
 const q=fs.readFileSync("js/94-outlook.js","utf8");
 p(!/refresh_token|client_secret|access_token|MS_CLIENT|graph\.microsoft|login\.microsoftonline/i.test(q),"Im Browser-Code stehen keine Microsoft-Zugangsdaten, Tokens oder Graph-Adressen");
 p(!/localStorage/.test(q),"Es wird nichts Outlook-Bezogenes in localStorage abgelegt (nur die Moduswahl kurz in sessionStorage)");
 const idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8");
 p(/<script src="js\/94-outlook\.js">/.test(idx)&&/js\/94-outlook\.js/.test(sw),"js/94 in index.html UND sw.js");
 page=await mk();
 await page.evaluate(()=>{sb.from=()=>{throw new Error("offline")}});
 const o=await page.evaluate(async()=>{try{await terOeffnen();return "ok"}catch(e){return "fehler "+e.message}});
 p(o==="ok","Ohne Verbindung/ohne Outlook-Tabellen öffnet sich der Termine-Schirm trotzdem (Outlook ist optional)",o);
 p(page.__f.length===0,"Keine JavaScript-Fehler",page.__f);
 await page.close();
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();
