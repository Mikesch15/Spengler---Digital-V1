// v3.376: Zeitmessung fuer Regiestunden - Start/Pause/Weiter/Stopp, effektive Zeit (h:min) sichtbar, Rundung auf 15 Minuten,
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
 await page.evaluate(()=>zmStart("Rinne montiert"));
 await min(20);
 let z=await page.evaluate(()=>({ph:zmZustand.phase,ms:zmGemessenMs()}));
 p(z.ph==="laeuft"&&z.ms===20*60000,"Läuft: nach 20 min stehen 20 min",z);
 await page.evaluate(()=>zmPause());await min(30);
 z=await page.evaluate(()=>({ph:zmZustand.phase,ms:zmGemessenMs()}));
 p(z.ph==="pause"&&z.ms===20*60000,"Pause: die 30 min Pause zählen nicht",z);
 p(!(await page.evaluate(()=>zmPause()))&&!(await page.evaluate(()=>zmStart("x"))),"Pause in der Pause und zweiter Start werden ignoriert (nur EINE Messung)");
 await page.evaluate(()=>zmWeiter());await min(25);
 await page.evaluate(()=>zmStopp());await min(120);
 z=await page.evaluate(()=>({ph:zmZustand.phase,ms:zmGemessenMs(),notiz:zmZustand.notiz}));
 p(z.ph==="fertig"&&z.ms===45*60000&&z.notiz==="Rinne montiert","Stopp: 45 min effektiv; danach läuft nichts mehr weiter (auch nach 2 h)",z);
 p(!(await page.evaluate(()=>zmWeiter()))&&!(await page.evaluate(()=>zmStopp())),"Weiter/Stopp nach dem Stopp werden ignoriert");

 console.log("\nC · Stand überlebt Neuladen");
 await page.evaluate(()=>{zmVerwerfen();zmStart("Dach");});await min(10);
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

 console.log("\nD · Anzeige: Startseite und Regierapport");
 const heute=await page.evaluate(()=>{a2Zustand.seite="heute";const h=a2SeiteHeute();return /data-zm-ort="heute"/.test(h)});
 p(heute,"Die Startseite hat die Karte „Zeit messen“");
 const rap=await page.evaluate(()=>{const e=document.querySelector('[data-zm-ort="rapport"]');return {da:!!e,np:!!e.closest(".no-print")||e.classList.contains("no-print")||!!(e.parentElement&&e.classList.contains("a2-zm"))}});
 p(rap.da,"Der Regierapport hat den Kasten „Zeit messen“",rap);
 // Bedienung im Rapport-Kasten
 await page.evaluate(()=>{document.querySelector('[data-zm-ort="rapport"] [data-zm-notiz]').value="Rinne montiert";document.querySelector('[data-zm-ort="rapport"] [data-zm="start"]').click()});
 await min(22);await page.waitForTimeout(1300);
 let ui=await page.evaluate(()=>({uhr:document.querySelector('[data-zm-ort="rapport"] [data-zm-uhr]').textContent,txt:document.querySelector('[data-zm-ort="rapport"]').innerText}));
 p(/0:22:00/.test(ui.uhr)&&/Rinne montiert/.test(ui.txt)&&/läuft/.test(ui.txt),"Läuft: Uhr und Beschriftung sichtbar",ui);
 await page.evaluate(()=>{__min(1)});await page.waitForTimeout(1300);
 ui=await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm-uhr]').textContent);
 p(/0:23:0\d/.test(ui),"Die Anzeige tickt von selbst weiter (nur die Zahl, kein Neuzeichnen)",ui);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="pause"]').click());
 p(await page.evaluate(()=>/angehalten/.test(document.querySelector('[data-zm-ort="rapport"]').innerText)&&!!document.querySelector('[data-zm="weiter"]')),"Pause: „angehalten“ und Weiter-Knopf");
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="weiter"]').click());await min(7);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="stopp"]').click());
 ui=await page.evaluate(()=>({r:document.querySelector('[data-zm-ort="rapport"]').innerText,h:document.querySelector('[data-zm-ort="heute"]')?document.querySelector('[data-zm-ort="heute"]').innerText:null}));
 p(/Effektiv gemessen\s*30 min/.test(ui.r.replace(/\s+/g," "))&&/Gerundet auf 15 min\s*0[.,]50 h/.test(ui.r.replace(/\s+/g," ")),"Ergebnis zeigt effektive Zeit (30 min) UND gerundete Stunden (0,50 h)",ui.r);
 // Übernehmen
 const vor=await page.evaluate(()=>works.length);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="uebernehmen"]').click());await page.waitForTimeout(150);
 const nach=await page.evaluate(()=>({n:works.length,w:works[works.length-1],ph:zmZustand.phase,zeile:!!document.querySelector('#workBody [data-w-hours="'+(works.length-1)+'"]')}));
 p(nach.n===vor+1&&nach.w.hours===0.5&&nach.w.desc==="Rinne montiert"&&nach.ph==="aus"&&nach.zeile,"Übernehmen: neue Arbeitsposition mit 0,5 h und Beschreibung; Messung ist danach weg",nach);
 p((await alerts()).some(a=>/Übernommen/.test(a)&&/30 min/.test(a)),"Rückmeldung nennt effektive und gerundete Zeit");
 // mit effektiver Zeit in der Beschreibung
 await page.evaluate(()=>{zmStart("Fassade");});await min(68);await page.evaluate(()=>zmStopp());
 await page.evaluate(()=>{document.querySelector('[data-zm-ort="rapport"] [data-zm-eff]').checked=true;document.querySelector('[data-zm-ort="rapport"] [data-zm="uebernehmen"]').click()});await page.waitForTimeout(150);
 const w2=await page.evaluate(()=>works[works.length-1]);
 p(w2.hours===1.25&&w2.desc==="Fassade (gemessen 1 h 08 min)","Mit Häkchen steht die effektive Zeit (1 h 08 min) in der Beschreibung; Stunden 1,25",w2);
 // unter 8 Minuten
 await alerts();
 await page.evaluate(()=>{zmStart("");});await min(5);await page.evaluate(()=>zmStopp());
 const vor2=await page.evaluate(()=>works.length);
 await page.evaluate(()=>document.querySelector('[data-zm-ort="rapport"] [data-zm="uebernehmen"]').click());await page.waitForTimeout(150);
 p((await page.evaluate(()=>works.length))===vor2&&(await alerts()).some(a=>/weniger als 8 Minuten/.test(a))&&(await page.evaluate(()=>zmZustand.phase))==="fertig","Unter 8 Minuten ergäbe 0 h: nichts übernommen, Meldung, Messung bleibt stehen");
 // Heute: kein Übernehmen
 const hh=await page.evaluate(()=>{a2Zustand.seite="heute";const d=document.createElement("div");d.innerHTML=zmKarteHtml("heute");return {u:!!d.querySelector('[data-zm="uebernehmen"]'),v:!!d.querySelector('[data-zm="verwerfen"]'),t:d.textContent}});
 p(!hh.u&&hh.v&&/Regierapport öffnen/.test(hh.t),"Auf der Startseite: kein Übernehmen (es gibt dort keinen Rapport), aber Verwerfen und ein Hinweis",hh);
 // Verwerfen
 await page.evaluate(()=>{window.__confirm=false;document.querySelector('[data-zm-ort="rapport"] [data-zm="verwerfen"]').click()});await page.waitForTimeout(100);
 p((await page.evaluate(()=>zmZustand.phase))==="fertig","Verwerfen abgebrochen: Messung bleibt");
 await page.evaluate(()=>{window.__confirm=true;document.querySelector('[data-zm-ort="rapport"] [data-zm="verwerfen"]').click()});await page.waitForTimeout(100);
 p((await page.evaluate(()=>zmZustand.phase))==="aus","Verwerfen bestätigt: Uhr aus");
 // HTML-Injection
 await page.evaluate(()=>{zmStart("<img src=x onerror=window.__xss=1>")});await page.waitForTimeout(100);
 p(await page.evaluate(()=>!window.__xss&&/&lt;img/.test(document.querySelector('[data-zm-ort="rapport"]').innerHTML)),"Eine Notiz mit HTML wird als Text angezeigt");
 await page.evaluate(()=>zmVerwerfen());

 console.log("\nE · Einbindung");
 const idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8"),q=fs.readFileSync("js/93-zeitmessung.js","utf8");
 p(/<script src="js\/93-zeitmessung\.js">/.test(idx)&&/js\/93-zeitmessung\.js/.test(sw),"js/93 in index.html UND sw.js");
 p(!/sb\.|fetch\(|https?:\/\//.test(q.replace(/\/\/.*$/gm,"")),"Die Zeitmessung spricht nie mit einem Server (nur localStorage)");
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();
