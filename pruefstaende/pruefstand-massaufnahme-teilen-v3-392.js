// v3.392: Massaufnahmen zur Bearbeitung an andere Mitarbeiter freigeben (Migration, Rechte-Logik, Oberflaeche, Speichern, Liste).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const lies=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,600):""))}};
const INIT=()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};['select','eq','order','limit','in'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
(async()=>{
 console.log("\nA · Migration (statisch; am 17.10.2026 zusätzlich in Produktion gemessen)");
 const mig=lies("supabase/migrations/v3392_massaufnahme_bearbeiter.sql"),code=mig.replace(/^--.*$/gm,"");
 p(/add column bearbeiter uuid\[\] not null default '\{\}'/.test(code),"Neue Spalte measurements.bearbeiter (Standard leer – nichts ändert sich von selbst)");
 p(/create policy measurements_select_geteilt on public\.measurements for select\s+using \(public\.has_permission\('measurements','view'\) and \(select auth\.uid\(\)\) = any\(bearbeiter\)\)/.test(code),"Lesen: freigegebene Person – aber nur MIT Ansehen-Recht");
 p(/create policy measurements_update_geteilt[\s\S]{0,260}has_permission\('measurements','edit'\) and \(select auth\.uid\(\)\) = any\(bearbeiter\)/.test(code),"Ändern: freigegebene Person – aber nur MIT Bearbeiten-Recht");
 p(!/create policy measurements_delete|for delete/.test(code),"Löschen wird NICHT erweitert (bleibt bei Ersteller/Admin/«alle»)");
 p(!/as restrictive/.test(code)&&!/drop policy|alter policy/i.test(code),"Nur neue permissive Policies – die Firmengrenze (RESTRICTIVE) und alle bestehenden Policies bleiben unberührt");
 p(/permission_edit_scope\('measurements'\) = 'all'[\s\S]{0,120}created_by, auth\.uid\(\)\) = auth\.uid\(\)/.test(code)&&/raise exception 'Nur wer die Massaufnahme angelegt hat/.test(code),"Schutz-Trigger: nur Ersteller, Admin oder «alle bearbeiten» ändern die Freigabe");
 p(/pr\.company_id = v_firma/.test(code)&&/derselben Firma/.test(code)&&/> 25/.test(code),"Nur Mitarbeitende derselben Firma, höchstens 25, ohne Doppelte");

 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{
  $("appRoot").hidden=false;$("authScreen").hidden=true;window.appAlert=async()=>{};
  rollenVorgaben=[{resource:"measurements",role:"admin",can_view:true,can_edit:true,scope:"all",edit_scope:"all"},{resource:"measurements",role:"employee",can_view:true,can_edit:true,scope:"all",edit_scope:"all"}];
  alleOverrides=[{profile_id:"eigene",resource:"measurements",can_edit:true,edit_scope:"own"},{profile_id:"keine",resource:"measurements",can_edit:false,edit_scope:null}];
  allProfiles=[
   {id:"ich",role:"employee",first_name:"Ida",last_name:"Ich"},{id:"admin",role:"admin",first_name:"Ali",last_name:"Admin"},
   {id:"eigene",role:"employee",first_name:"Eva",last_name:"Eigene"},{id:"alle",role:"employee",first_name:"Alex",last_name:"Alle"},{id:"keine",role:"employee",first_name:"Kai",last_name:"Keine"}];
  window.profileName=id=>{const q=allProfiles.find(x=>x.id===id);return q?(q.first_name+" "+q.last_name):""};
  window.ALS=(id)=>{currentProfile=allProfiles.find(x=>x.id===id);meineRechte=rechteVon(currentProfile)};
 });
 const ev=(f,...a)=>page.evaluate(f,...a);

 console.log("\nB · Rechte-Logik (darfBearbeiten)");
 let r=await ev(()=>{ALS("eigene");return {fremd:darfBearbeiten("massaufnahme","admin"),frei:darfBearbeiten("massaufnahme","admin",["eigene"]),andere:darfBearbeiten("massaufnahme","admin",["alex"]),eigen:darfBearbeiten("massaufnahme","eigene"),neu:darfBearbeiten("massaufnahme",null)}});
 p(r.fremd===false&&r.frei===true&&r.andere===false&&r.eigen===true&&r.neu===true,"«Nur eigene»: fremde Massaufnahme gesperrt – freigegebene (und eigene/neue) erlaubt, Freigabe an andere zählt nicht",r);
 r=await ev(()=>{ALS("keine");return darfBearbeiten("massaufnahme","admin",["keine"])});
 p(r===false,"Wer gar kein Bearbeiten-Recht hat, bekommt durch die Freigabe keines");
 r=await ev(()=>{ALS("alle");return darfBearbeiten("massaufnahme","admin")});
 p(r===true,"Wer alle bearbeiten darf, darf es ohnehin");
 r=await ev(()=>{ALS("eigene");sperreFuerEintrag("massaufnahme","admin",["eigene"]);const a=document.body.classList.contains("recht-massaufnahme-ansehen");sperreFuerEintrag("massaufnahme","admin",[]);return {frei:a,fremd:document.body.classList.contains("recht-massaufnahme-ansehen")}});
 p(r.frei===false&&r.fremd===true,"Das Formular ist für freigegebene Personen nicht schreibgeschützt, sonst schon",r);

 console.log("\nC · Wer darf freigeben, wen kann man wählen");
 r=await ev(()=>{const m={id:1,created_by:"ich",bearbeiter:[]};const o={};
  ["ich","admin","eigene","alle"].forEach(w=>{ALS(w);o[w]=mtDarfTeilen(m)});ALS("eigene");o.fremd=mtDarfTeilen({id:1,created_by:"ich"});ALS("ich");o.ungespeichert=mtDarfTeilen({created_by:"ich"});return o});
 p(r.ich&&r.admin&&r.alle&&!r.eigene&&!r.fremd&&!r.ungespeichert,"Freigeben dürfen: Ersteller, Admin, «alle bearbeiten»; nicht «nur eigene» bei fremder Massaufnahme; ungespeichert gar nicht",r);
 r=await ev(()=>{ALS("ich");return mtKandidaten({id:1,created_by:"ich"}).map(k=>k.id+":"+k.stufe).join(" ")});
 p(r==="admin:admin alle:alle eigene:waehlbar keine:keine".split(" ").sort((a,b)=>a.localeCompare(b,"de")).join(" ")||r.includes("eigene:waehlbar")&&r.includes("admin:admin")&&r.includes("alle:alle")&&r.includes("keine:keine")&&!r.includes("ich:"),"Kandidaten: nur «nur eigene» ist wählbar; Admin, «alle» und «kein Recht» sind erklärt und gesperrt; man selbst fehlt",r);

 console.log("\nD · Oberfläche");
 r=await ev(()=>{ALS("ich");mtZeichnen({id:1,created_by:"ich",bearbeiter:[]});const b=$("measTeilenBereich");return {hidden:b.hidden,boxen:b.querySelectorAll("[data-mt-person]").length,gesperrt:b.querySelectorAll("input:disabled").length,t:b.innerText.replace(/\s+/g," ")}});
 p(!r.hidden&&r.boxen===1&&r.gesperrt===3&&/Zur Bearbeitung freigeben/.test(r.t)&&/Das ist nicht die Arbeitsfreigabe fürs Rüsten/.test(r.t)&&/kein Recht, Massaufnahmen zu bearbeiten/.test(r.t)&&/darf ohnehin alle bearbeiten/.test(r.t),"Ersteller sieht 1 wählbare Person + 3 erklärte gesperrte, und den Hinweis zur Abgrenzung von der Arbeitsfreigabe",r);
 r=await ev(()=>{ALS("ich");mtZeichnen(null);const b=$("measTeilenBereich");return {hidden:b.hidden,t:b.innerText.replace(/\s+/g," ")}});
 p(!r.hidden&&/Nach dem ersten Speichern/.test(r.t),"Neue, ungespeicherte Massaufnahme: Hinweis statt Auswahl");
 r=await ev(()=>{ALS("eigene");mtZeichnen({id:1,created_by:"admin",bearbeiter:["eigene"]});const b=$("measTeilenBereich");return {hidden:b.hidden,boxen:b.querySelectorAll("input").length,t:b.innerText.replace(/\s+/g," ")}});
 p(!r.hidden&&r.boxen===0&&/wurde dir von Ali Admin zur Bearbeitung freigegeben/.test(r.t)&&/Löschen und Weitergeben bleibt/.test(r.t),"Freigegebene Person sieht nur die Information – keine Auswahl",r);
 r=await ev(()=>{ALS("keine");mtZeichnen({id:1,created_by:"admin",bearbeiter:[]});return $("measTeilenBereich").hidden});
 p(r===true,"Wen die Massaufnahme nichts angeht, sieht den Bereich gar nicht");

 console.log("\nE · Speichern");
 r=await ev(async()=>{
  ALS("ich");window.__upd=null;
  const m={id:7,created_by:"ich",bearbeiter:["admin"]};allMeasurements=[{id:7,bearbeiter:["admin"]}];projectMeasurementsCache=[{id:7,bearbeiter:["admin"]}];
  sb.from=t=>({update:pl=>{window.__upd={t,pl};return {eq:(k,v)=>{window.__upd.eq=[k,v];return {select:()=>({maybeSingle:async()=>({data:{id:7,bearbeiter:pl.bearbeiter},error:null})})}}}}});
  mtZeichnen(m);document.querySelector('[data-mt-person="eigene"]').checked=true;await mtSpeichern();
  return {u:window.__upd,m:m.bearbeiter,a:allMeasurements[0].bearbeiter,c:projectMeasurementsCache[0].bearbeiter,t:$("measTeilenBereich").innerText.replace(/\s+/g," ")}});
 p(r.u.t==="measurements"&&JSON.stringify(r.u.eq)==='["id",7]'&&r.u.pl.bearbeiter.sort().join()==="admin,eigene","Speichern: ein Update auf diese Massaufnahme mit den Angehakten (Admin bleibt als nicht wählbare Person erhalten)",r.u);
 p(r.m.length===2&&r.a.length===2&&r.c.length===2&&/Gespeichert: freigegeben an/.test(r.t),"Die geladenen Listen und die Anzeige ziehen sofort nach",r);
 r=await ev(async()=>{ALS("ich");sb.from=()=>({update:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:null,error:{message:"Nur wer die Massaufnahme angelegt hat"}})})})})});
  const m={id:7,created_by:"ich",bearbeiter:[]};mtZeichnen(m);document.querySelector('[data-mt-person="eigene"]').checked=true;await mtSpeichern();return {b:m.bearbeiter,t:$("measTeilenBereich").innerText.replace(/\s+/g," ")}});
 p(r.b.length===0&&!/Gespeichert/.test(r.t),"Lehnt die Datenbank ab: nichts wird als gespeichert gezeigt, der Stand bleibt",r);
 r=await ev(async()=>{ALS("ich");sb.from=()=>({update:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:null,error:null})})})})});
  const m={id:7,created_by:"ich",bearbeiter:[]};mtZeichnen(m);document.querySelector('[data-mt-person="eigene"]').checked=true;await mtSpeichern();return {b:m.bearbeiter,t:$("measTeilenBereich").innerText.replace(/\s+/g," ")}});
 p(r.b.length===0&&/nicht gespeichert/.test(r.t),"Leere Antwort (Zeile nicht erreichbar): ehrliche Meldung statt Erfolg",r);
 r=await ev(async()=>{ALS("eigene");window.__n=0;sb.from=()=>{window.__n++;return {}};const m={id:7,created_by:"admin",bearbeiter:["eigene"]};mtZeichnen(m);await mtSpeichern();return window.__n});
 p(r===0,"Wer nicht freigeben darf, löst gar keinen Schreibaufruf aus");

 console.log("\nF · Liste und Verdrahtung");
 r=await ev(()=>{const m={id:1,created_by:"ich",bearbeiter:["eigene","alle","keine"]};const o={};
  ALS("ich");o.ersteller=mtListenText(m);ALS("eigene");o.freigegeben=mtListenText(m);ALS("keine");o.dritter=mtListenText({id:1,created_by:"ich",bearbeiter:["eigene"]});o.leer=mtListenText({id:1,created_by:"ich",bearbeiter:[]});return o});
 p(/freigegeben an Eva Eigene, Alex Alle \+1/.test(r.ersteller)&&/von Ida Ich zur Bearbeitung freigegeben/.test(r.freigegeben)&&r.dritter===""&&r.leer==="","Liste: Ersteller sieht «freigegeben an …», die freigegebene Person «von … freigegeben», Unbeteiligte nichts",r);
 const js10=lies("js/10-massaufnahme.js"),js70=lies("js/70-ansicht2.js");
 p(/sperreFuerEintrag\("massaufnahme",m&&m\.created_by,m&&m\.bearbeiter\)/.test(js10)&&(js10.match(/mtZeichnen\(/g)||[]).length===2,"Das Formular übergibt die Freigabe an die Rechteprüfung und zeichnet den Bereich beim Öffnen und bei «Neu»");
 p(/mtListenText\(m\)/.test(js70)&&lies("js/23-verlauf.js").includes('bearbeiter:"Zur Bearbeitung freigegeben"'),"Die Projektliste zeigt den Vermerk, der Verlauf kennt die Spalte");
 p(lies("index.html").includes('id="measTeilenBereich"')&&lies("index.html").includes('src="js/97-massaufnahme-teilen.js"')&&lies("sw.js").includes('"./js/97-massaufnahme-teilen.js"'),"Bereich, Skript und Service-Worker-Liste sind eingetragen");
 p(!/\.delete\(|\.insert\(/.test(lies("js/97-massaufnahme-teilen.js"))&&(lies("js/97-massaufnahme-teilen.js").match(/\.update\(/g)||[]).length===1,"Das Modul schreibt nur ein einziges Mal (Update der Freigabe), nie löschen oder anlegen");
 p(!page.__f.length,"Keine Skriptfehler",page.__f);

 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
