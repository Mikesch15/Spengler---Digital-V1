// v3.384: Oberfläche des Google-Kalender-Abgleichs im Schirm "Termine" (js/95-google-kalender.js). Die Edge Function ist ein Stub (sb.functions.invoke).
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
   $("appRoot").hidden=false;$("authScreen").hidden=true;window.__alerts=[];window.__confirm=true;
   window.appAlert=async t=>{window.__alerts.push(t)};window.appConfirm=async()=>window.__confirm;
   window.__tab={outlook_verbindungen:null,outlook_termin_map:[],termine:[]};window.__aufrufe=[];window.__antwort={};
   sb.from=n=>{const st={n,f:[]};const q={};['select','order','limit','lte','gte'].forEach(k=>q[k]=()=>q);
    q.eq=(k,v)=>{st.f.push([k,v]);return q};q.in=(k,v)=>{st.in=v;return q};
    q.maybeSingle=async()=>({data:window.__tab[n]||null,error:null});
    q.then=(res,rej)=>Promise.resolve().then(()=>{
     let d=window.__tab[n];if(!Array.isArray(d))d=d?[d]:[];
     if(n==="outlook_termin_map")d=d.filter(x=>st.f.every(([k,v])=>x[k]===v));
     if(n==="termine"&&st.in)d=d.filter(x=>st.in.includes(x.id));
     return {data:d,error:null}}).then(res,rej);return q};
   sb.functions={invoke:async(name,opt)=>{window.__aufrufe.push({name,body:opt.body});const a=window.__antwort[opt.body.aktion];
     if(typeof a==="function")return a(opt.body);return {data:a||{ok:true},error:null}}};
   window.__weiter=null;window.gkWeiter=u=>{window.__weiter=u};window.olWeiter=u=>{window.__weiter=u};
  });
  return page;};
 const sehe=(page,id)=>page.evaluate(i=>document.getElementById(i).innerText.replace(/\s+/g," "),id||"googleBox");
 const VERB=(x)=>Object.assign({id:1,profile_id:"u1",anbieter:"google",ms_konto:"max@gmail.com",kalender_id:"primary",import_modus:"alle",status:"verbunden",letzter_erfolg:"2026-10-15T10:00:00Z",letzte_meldung:null,anz_neu:2,anz_geaendert:1,anz_uebersprungen:3,anz_konflikte:0},x||{});

 console.log("\nA · Nicht verbunden");
 let page=await mk();
 await page.evaluate(()=>{terOeffnen();document.getElementById("terKalenderDetails").open=true});await page.waitForTimeout(300);
 let t=await sehe(page);
 p(/Google-Kalender verbinden \(optional\)/.test(t)&&/Hauptkalender/.test(t)&&/nur für dich.*sichtbar/.test(t)&&/Private.*nie übernommen/.test(t)&&/nur ein Kalender möglich|nur ein.*Kalender/.test(t)&&/Projekt prüfen/.test(t),"Vor dem Verbinden steht offen: Hauptkalender, nur für dich sichtbar, privat nie, nur ein Kalender, „Projekt prüfen“",t.slice(0,400));
 p(await page.evaluate(()=>document.getElementById("gkVerbinden").disabled),"„Mit Google verbinden“ ist gesperrt, bis die Einwilligung angehakt ist");
 await page.evaluate(()=>document.getElementById("gkVerbinden").click());await page.waitForTimeout(100);
 p((await page.evaluate(()=>window.__aufrufe.length))===0,"Ohne Einwilligung geht kein Aufruf an den Server");
 await page.evaluate(()=>{const c=document.getElementById("gkEinwilligung");c.checked=true;c.dispatchEvent(new Event("change",{bubbles:true}));window.__antwort.start={ok:true,url:"https://accounts.google.com/o/oauth2/v2/auth?state=abc"}});
 await page.evaluate(()=>document.getElementById("gkVerbinden").click());await page.waitForTimeout(200);
 const st=await page.evaluate(()=>({a:window.__aufrufe.slice(),w:window.__weiter}));
 p(st.a.length===1&&st.a[0].name==="outlook-sync"&&st.a[0].body.aktion==="start"&&st.a[0].body.anbieter==="google"&&!("company_id" in st.a[0].body)&&!("profile_id" in st.a[0].body),"Verbinden: ein Aufruf „start“ mit anbieter „google“ – ohne Firma oder Person",st.a);
 p(/accounts\.google\.com/.test(st.w||""),"Danach geht es zur Google-Anmeldung (Adresse vom Server)",st.w);
 await page.evaluate(()=>{window.__antwort.start={ok:false,error:"Der Google-Kalender ist auf dem Server noch nicht fertig eingerichtet (Google-Zugangsdaten fehlen)."};window.__weiter=null;document.getElementById("gkVerbinden").click()});await page.waitForTimeout(200);
 p(/Zugangsdaten fehlen/.test(await sehe(page))&&(await page.evaluate(()=>window.__weiter))===null,"Antwortet der Server „nicht eingerichtet“: verständliche Meldung, keine Weiterleitung");
 await page.close();

 console.log("\nB · Verbunden");
 page=await mk();
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v},VERB({letzte_meldung:"Private Outlook-Termine werden nie übernommen."}));
 await page.evaluate(()=>{terOeffnen();document.getElementById("terKalenderDetails").open=true});await page.waitForTimeout(300);
 t=await sehe(page);
 p(/max@gmail\.com \(Hauptkalender\)/.test(t)&&/✓ verbunden/.test(t)&&/2 neu, 1 geändert, 3 übersprungen/.test(t)&&/etwa alle 5 Minuten/.test(t),"Konto, Status, Zahlen und der Hinweis zum Hintergrundbetrieb sind sichtbar",t.slice(0,300));
 p(!/Kategorie/.test(await sehe(page)),"Keine Kategorie-Auswahl bei Google (gibt es dort nicht)");
 await page.evaluate(()=>{window.__antwort.sync={ok:true,neu:2,geaendert:1,uebersprungen:0,konflikte:0,fehler:0,gefunden:6,hinweise:[]};document.getElementById("gkSync").click()});await page.waitForTimeout(400);
 t=await sehe(page);
 p(/Abgleich fertig: 2 neu, 1 geändert/.test(t)&&/In Google gefunden: 6 Termin/.test(t),"„Jetzt synchronisieren“: Ergebnis inkl. „In Google gefunden: 6“",t.slice(0,300));
 await page.evaluate(()=>{window.__antwort.sync={ok:false,meldung:"Die Outlook-Anmeldung ist abgelaufen oder wurde widerrufen. Bitte neu verbinden."};document.getElementById("gkSync").click()});await page.waitForTimeout(400);
 p(/neu verbinden/.test(await sehe(page)),"Fehler des Abgleichs werden verständlich gezeigt");
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;gkGeladen=false;gkMeldung="";return gkLaden()},VERB({status:"fehler"}));await page.waitForTimeout(200);
 p(/Anmeldung nötig/.test(await sehe(page))&&!!(await page.evaluate(()=>document.getElementById("gkVerbinden")))&&!(await page.evaluate(()=>document.getElementById("gkSync"))),"Abgelaufene Anmeldung: „Neu verbinden“ statt „Jetzt synchronisieren“");
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;gkGeladen=false;gkMeldung="";return gkLaden()},VERB());await page.waitForTimeout(200);
 await page.evaluate(()=>{window.__confirm=false;document.getElementById("gkTrennen").click()});await page.waitForTimeout(150);
 p((await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="trennen").length))===0,"Trennen abgebrochen: kein Aufruf");
 await page.evaluate(()=>{window.__confirm=true;window.__tab.outlook_verbindungen=null;document.getElementById("gkTrennen").click()});await page.waitForTimeout(400);
 p((await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="trennen").length))===1&&/Google-Kalender verbinden/.test(await sehe(page))&&/getrennt/.test(await sehe(page)),"Trennen bestätigt: Aufruf, Ansicht wechselt zu „verbinden“");
 await page.close();

 console.log("\nC · Konflikte (nur die eigene Verbindung)");
 page=await mk();
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;window.__tab.outlook_termin_map=[{id:11,termin_id:5,konflikt:true,verbindung_id:1},{id:13,termin_id:9,konflikt:true,verbindung_id:2}];
  window.__tab.termine=[{id:5,titel:"Besprechung <img src=x onerror=window.__xss=1>",start_datum:"2026-10-20",start_zeit:"08:00"},{id:9,titel:"Fremd",start_datum:"2026-10-21",start_zeit:"08:00"}]},VERB({anz_konflikte:1}));
 await page.evaluate(()=>{terOeffnen();document.getElementById("terKalenderDetails").open=true});await page.waitForTimeout(400);
 t=await sehe(page);
 p(/1 Konflikt/.test(t)&&!/Fremd/.test(t)&&(await page.evaluate(()=>document.querySelectorAll("#googleBox [data-gk-konflikt]").length))===2,"Nur der eigene Konflikt wird gezeigt (der einer anderen Verbindung nicht), mit zwei Entscheidungsknöpfen",t.slice(0,300));
 p(!(await page.evaluate(()=>window.__xss||0))&&/&lt;img/.test(await page.evaluate(()=>document.getElementById("googleBox").innerHTML)),"Ein Titel mit HTML wird als Text gezeigt");
 await page.evaluate(()=>{window.__antwort.konflikt={ok:true};document.querySelector('#googleBox [data-gk-konflikt="11"][data-wahl="outlook"]').click()});await page.waitForTimeout(400);
 const kf=await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="konflikt").map(a=>a.body));
 p(kf.length===1&&kf[0].map_id===11&&kf[0].wahl==="outlook",'„Google-Stand übernehmen“ schickt {map_id:11, wahl:"outlook"} (interne Bezeichnung für „Kalender-Stand“)',kf);
 await page.close();

 console.log("\nD · Rückkehr von Google");
 page=await mk("?google=ok");
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;window.__antwort.sync={ok:true,neu:3,geaendert:0,uebersprungen:0,konflikte:0,fehler:0,gefunden:3,hinweise:[]}},VERB());
 await page.evaluate(()=>gkRueckkehr());await page.waitForTimeout(700);
 const ru=await page.evaluate(()=>({url:location.search,modal:!$("termineModal").hidden,a:window.__aufrufe.map(a=>a.body.aktion),t:document.getElementById("googleBox").innerText.replace(/\s+/g," ")}));
 p(ru.url===""&&ru.modal&&ru.a.includes("sync")&&/3 neu/.test(ru.t),"Rückkehr „ok“: Adresse bereinigt, Termine offen, erster Abgleich gestartet und angezeigt",ru);
 await page.close();
 for(const [q,re] of [["fehler",/nicht zustande gekommen/],["andere",/schon ein Outlook-Kalender/],["berechtigung",/Kalender-Zugriff anhaken/]]){
  page=await mk("?google="+q);
  await page.evaluate(()=>gkRueckkehr());await page.waitForTimeout(500);
  const rf=await page.evaluate(()=>({a:window.__aufrufe.map(a=>a.body.aktion),t:document.getElementById("googleBox").innerText.replace(/\s+/g," "),url:location.search}));
  p(re.test(rf.t)&&!rf.a.includes("sync")&&rf.url==="","Rückkehr „"+q+"“: verständliche Meldung, kein Abgleich",rf);
  await page.close();
 }

 console.log("\nE · Nur ein Kalender pro Person");
 page=await mk();
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v},VERB({anbieter:"microsoft",ms_konto:"max@firma.ch"}));
 await page.evaluate(()=>{terOeffnen();document.getElementById("terKalenderDetails").open=true});await page.waitForTimeout(400);
 const g=await sehe(page,"googleBox"),o=await sehe(page,"outlookBox");
 p(/schon ein Outlook-Kalender verbunden/.test(g)&&!(await page.evaluate(()=>document.getElementById("gkVerbinden")))&&/max@firma\.ch/.test(o)&&/✓ verbunden/.test(o),"Ist Outlook verbunden: Google bietet kein Verbinden an (Hinweis „zuerst trennen“), Outlook zeigt die Verbindung",{g:g.slice(0,200)});
 await page.evaluate(v=>{window.__tab.outlook_verbindungen=v;olGeladen=false;gkGeladen=false;return Promise.all([olLaden(),gkLaden()])},VERB());await page.waitForTimeout(300);
 const g2=await sehe(page,"googleBox"),o2=await sehe(page,"outlookBox");
 p(/schon ein Google-Kalender verbunden/.test(o2)&&!(await page.evaluate(()=>document.getElementById("olVerbinden")))&&/max@gmail\.com/.test(g2),"Ist Google verbunden: Outlook bietet kein Verbinden an, Google zeigt die Verbindung (und Outlook hält sie nicht für seine)",{o:o2.slice(0,200)});
 const ic=await page.evaluate(()=>{terWoche=terMontag(terHeute());const tag=terHeute();terDaten=[{id:1,titel:"G",start_datum:tag,ende_datum:tag,start_zeit:"08:00",ende_zeit:null,mitarbeiter:[],quelle:"google"},{id:2,titel:"O",start_datum:tag,ende_datum:tag,start_zeit:"09:00",ende_zeit:null,mitarbeiter:[],quelle:"outlook"}];terZeichnen();return document.getElementById("terListe").innerText.replace(/\s+/g," ")});
 p(/📅 G/.test(ic)&&/📧 O/.test(ic),"Termine aus Google tragen 📅, aus Outlook 📧",ic.slice(0,200));
 await page.close();

 console.log("\nF · Sicherheit des Browser-Codes");
 const q=fs.readFileSync("js/95-google-kalender.js","utf8");
 p(!/refresh_token|client_secret|access_token|GOOGLE_CLIENT|googleapis|accounts\.google|oauth2/i.test(q),"Im Browser-Code stehen keine Google-Zugangsdaten, Tokens oder API-Adressen");
 p(!/localStorage|sessionStorage/.test(q),"Es wird nichts Google-Bezogenes im Browser abgelegt");
 const idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8");
 p(/<script src="js\/95-google-kalender\.js">/.test(idx)&&/js\/95-google-kalender\.js/.test(sw),"js/95 in index.html UND sw.js");
 page=await mk();
 await page.evaluate(()=>{sb.from=()=>{throw new Error("offline")}});
 const o3=await page.evaluate(async()=>{try{await terOeffnen();return "ok"}catch(e){return "fehler "+e.message}});
 p(o3==="ok"&&page.__f.length===0,"Ohne Verbindung öffnet sich der Termine-Schirm trotzdem; keine JavaScript-Fehler",{o3,f:page.__f});
 await page.close();
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();
