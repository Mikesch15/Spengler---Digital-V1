// v3.385: Oberfläche des Kalender-Abos im Schirm "Termine" (js/96-kalender-abo.js). Die Edge Function ist ein Stub (sb.functions.invoke).
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
   window.__tab={outlook_verbindungen:null,outlook_termin_map:[],termine:[],kalender_abos:null};window.__aufrufe=[];window.__antwort={};
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

 const sehe=(page,id)=>page.evaluate(i=>document.getElementById(i).innerText.replace(/\s+/g," "),id||"aboBox");
 const ABO=(x)=>Object.assign({id:1,profile_id:"u1",name:"Arbeitskalender",host:"outlook.office365.com",status:"verbunden",letzter_erfolg:"2026-10-16T10:00:00Z",letzte_meldung:null,anz_gefunden:12,anz_neu:2,anz_geaendert:1,anz_entfernt:0},x||{});

 console.log("\nA · Noch kein Abo");
 let page=await mk();
 await page.evaluate(()=>{terOeffnen()});await page.waitForTimeout(300);
 let t=await sehe(page);
 p(/Arbeitskalender per Link abonnieren/.test(t)&&/nur lesen/.test(t)&&/nichts zurückgeschrieben/.test(t)&&/alle Mitarbeiter mit Projektrecht/.test(t)&&/Private.*nie übernommen/.test(t)&&/verschlüsselt/.test(t)&&/nie wieder angezeigt/.test(t)&&/importierten Termine entfernt/.test(t),"Vorher steht offen: nur lesen, sichtbar für alle mit Projektrecht, privat nie, Link verschlüsselt und nie wieder sichtbar, Trennen entfernt Termine",t.slice(0,400));
 await page.evaluate(()=>document.getElementById("aboStart").click());await page.waitForTimeout(100);
 p((await page.evaluate(()=>window.__aufrufe.length))===0&&/Link einfügen/.test(await sehe(page)),"Ohne Link geht kein Aufruf an den Server");
 await page.evaluate(()=>{document.getElementById("aboUrl").value="webcal://outlook.office365.com/owa/calendar/GEHEIM123/x/calendar.ics";window.__antwort.start={ok:true,gefunden:12,neu:12,geaendert:0,entfernt:0,fehler:0,hinweise:[]};document.getElementById("aboStart").click()});await page.waitForTimeout(300);
 const st=await page.evaluate(()=>({a:window.__aufrufe.slice(),feld:document.getElementById("aboUrl")?document.getElementById("aboUrl").value:"(weg)"}));
 p(st.a.length===1&&st.a[0].name==="kalender-abo"&&st.a[0].body.aktion==="start"&&/GEHEIM123/.test(st.a[0].body.url)&&!("company_id" in st.a[0].body)&&!("profile_id" in st.a[0].body),"Abonnieren: ein Aufruf „start“ an kalender-abo mit dem Link – ohne Firma oder Person",st.a);
 p(st.feld===""||st.feld==="(weg)","Der Link steht nach dem Absenden nicht mehr im Eingabefeld",st.feld);
 p(!/GEHEIM123/.test(await sehe(page))&&/Abgleich fertig: 12 Termin/.test(await sehe(page)),"Ergebnis wird gezeigt, der Link taucht nirgends auf",await sehe(page));
 await page.evaluate(()=>{window.__antwort.start={ok:false,error:"Dieser Anbieter (evil.example.com) wird noch nicht unterstützt."};document.getElementById("aboUrl").value="https://evil.example.com/x.ics";document.getElementById("aboStart").click()});await page.waitForTimeout(300);
 p(/wird noch nicht unterstützt/.test(await sehe(page))&&!!(await page.evaluate(()=>document.getElementById("aboStart"))),"Abgelehnter Link: verständliche Meldung, das Formular bleibt");
 await page.close();

 console.log("\nB · Abo besteht");
 page=await mk();
 await page.evaluate(v=>{window.__tab.kalender_abos=v},ABO());
 await page.evaluate(()=>{terOeffnen()});await page.waitForTimeout(300);
 t=await sehe(page);
 p(/Kalender-Abo: Arbeitskalender/.test(t)&&/outlook\.office365\.com/.test(t)&&/nur lesen/.test(t)&&/✓ abonniert/.test(t)&&/12 im Zeitraum, 2 neu, 1 geändert, 0 entfernt/.test(t)&&/alle 15 Minuten/.test(t),"Name, Quelle, Status, Zahlen und Rhythmus sind sichtbar",t.slice(0,300));
 p(!(await page.evaluate(()=>!!document.getElementById("aboUrl"))),"Der gespeicherte Link wird nie wieder angezeigt (kein Eingabefeld)");
 await page.evaluate(()=>{window.__antwort.sync={ok:true,gefunden:13,neu:1,geaendert:0,entfernt:0,fehler:0,hinweise:[]};document.getElementById("aboSync").click()});await page.waitForTimeout(300);
 p(/Abgleich fertig: 13 Termin/.test(await sehe(page)),"„Jetzt abgleichen“ zeigt das Ergebnis");
 await page.evaluate(()=>{window.__antwort.sync={ok:false,meldung:"Der Kalender-Anbieter ist gerade nicht erreichbar. Es wird später erneut versucht."};document.getElementById("aboSync").click()});await page.waitForTimeout(300);
 p(/nicht erreichbar/.test(await sehe(page)),"Fehler des Abgleichs werden verständlich gezeigt");
 await page.evaluate(v=>{window.__tab.kalender_abos=v;aboGeladen=false;aboMeldung="";return aboLaden()},ABO({status:"fehler"}));await page.waitForTimeout(200);
 p(/Link nicht mehr gültig/.test(await sehe(page))&&!!(await page.evaluate(()=>document.getElementById("aboUrl")))&&!(await page.evaluate(()=>document.getElementById("aboSync"))),"Ungültiger Link: neuer Link kann eingegeben werden, kein „Jetzt abgleichen“");
 await page.evaluate(v=>{window.__tab.kalender_abos=v;aboGeladen=false;aboMeldung="";return aboLaden()},ABO());await page.waitForTimeout(200);
 await page.evaluate(()=>{window.__confirm=false;document.getElementById("aboTrennen").click()});await page.waitForTimeout(150);
 p((await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="trennen").length))===0,"Beenden abgebrochen: nichts passiert");
 await page.evaluate(()=>{window.__confirm=true;window.__antwort.trennen={ok:true};window.__tab.kalender_abos=null;document.getElementById("aboTrennen").click()});await page.waitForTimeout(300);
 p((await page.evaluate(()=>window.__aufrufe.filter(a=>a.body.aktion==="trennen").length))===1&&/Abo wurde beendet/.test(await sehe(page)),"Beenden bestätigt: ein Aufruf „trennen“, Meldung, Formular wieder da");
 await page.close();

 console.log("\nC · Abonnierte Termine sind schreibgeschützt");
 page=await mk();
 await page.evaluate(()=>{const h=terHeute();window.__tab.termine=[{id:5,titel:"Besprechung Büro",start_datum:h,ende_datum:h,start_zeit:"08:00:00",ende_zeit:"09:00:00",ort:"Bern",notiz:"Raum 3",quelle:"abo",mitarbeiter:["u1"],project_id:null}];terOeffnen()});await page.waitForTimeout(400);
 const liste=await page.evaluate(()=>document.body.innerText);
 p(/🔒/.test(liste)&&/Besprechung Büro/.test(liste),"In der Terminliste sind abonnierte Termine mit 🔒 markiert");
 await page.evaluate(()=>document.querySelector('[data-ter-edit="5"]').click());await page.waitForTimeout(200);
 const ed=await sehe(page,"terEditor");
 p(/kann hier nicht geändert werden/.test(ed)&&/Bern/.test(ed)&&!(await page.evaluate(()=>!!document.getElementById("terSpeichern")||!!document.getElementById("terLoeschen"))),"Antippen zeigt nur die Ansicht – kein Speichern, kein Löschen",ed.slice(0,200));
 await page.close();

 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
