// v3.390: Ausmass, Regierapport und Leistungen schaltbar (Migration, Oberflaeche, Sperr-Hinweise). Statische Pruefung der Migration/Policies, Verhalten der Anzeige-Sperre (modulErlaubt) und
// der Systemadmin-Oberflaeche (Module je Firma, Protokoll) gegen Stubs. Die Datenbank selbst wurde separat am 16.10.2026 gemessen (siehe Abschlussbericht).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const lies=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const INIT=()=>{
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:()=>{const q={};['select','eq','order','limit','in','is','lte','gte'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
  storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})};
};
(async()=>{


 const mig=lies("supabase/migrations/v3390_module_ausmass_rapport_leistungen.sql");
 const css=lies("css/04-rechte.css"),html=lies("index.html");
 console.log("\nA · Migration v3390 (statisch)");
 for(const k of ["ausmass","regierapport","leistungen"])p(new RegExp("set schaltbar = true,[\\s\\S]{0,160}where modul = '"+k+"'").test(mig),"«"+k+"» wird schaltbar");
 p(/abhaengig_von = '\{angebote,regierapport\}' where modul = 'nachkalkulation'/.test(mig),"Nachkalkulation hängt zusätzlich vom Regierapport ab (liest die Rapportstunden)");
 const tab={ausmass:"ausmass",ausmass_kandidaten:"ausmass",reports:"regierapport",leistungen:"leistungen",leistung_massaufnahmen:"leistungen"};
 p(Object.entries(tab).every(([t,m])=>mig.includes("('"+t+"','"+m+"')")),"Fünf Tabellen sind dem richtigen Modul zugeordnet",tab);
 p(/as restrictive for all using \(\(select public\.modul_aktiv\(%2\$L\)\)\)/.test(mig),"Die Sperren sind RESTRICTIVE");
 const code=mig.replace(/^--.*$/gm,"");
 p(!/\bdrop\b|\bdelete from\b|\btruncate\b|alter table/i.test(code),"Die Migration löscht und ändert keine Daten/Tabellen");
 p(!/'(materials|rates|blitzschutz_materials|measurements|projects|ausfuehrungen)'/.test(code),"Regiematerial, Stundensätze und Kern-Tabellen bleiben ohne Modulzaun");

 console.log("\nB · Feste Einstiege werden per CSS ausgeblendet (und existieren wirklich)");
 const regeln={regierapport:["#cockpitRepCard",'[data-cockpit-goto="rep"]','[data-cockpit-new="rep"]',"#newReport","[data-a2-rep]",'[data-a2-tu="neuerrapport"]'],
  ausmass:["#cockpitAmCard",'[data-cockpit-goto="am"]','[data-cockpit-new="am"]',"#newAusmass","[data-a2-am]",'[data-a2-tu="neuesam"]'],
  leistungen:["#cockpitLeistungenCard","#cockpitStandLeistungenZeile","#cockpitNeueLeistung","#angMeasLeistungenZeile","[data-a2-lei]",'[data-a2-tu="neuelei"]']};
 for(const [m,sel] of Object.entries(regeln)){
  const fehlt=sel.filter(s=>!css.includes("body.modul-aus-"+m+" "+s));
  p(fehlt.length===0,"CSS blendet für «"+m+"» alle "+sel.length+" Einstiege aus",fehlt);
 }
 const feste=[["#cockpitRepCard",'id="cockpitRepCard"'],['[data-cockpit-new="rep"]','data-cockpit-new="rep"'],["#newReport",'id="newReport"'],["#cockpitAmCard",'id="cockpitAmCard"'],['[data-cockpit-new="am"]','data-cockpit-new="am"'],["#newAusmass",'id="newAusmass"'],["#cockpitLeistungenCard",'id="cockpitLeistungenCard"'],["#cockpitNeueLeistung",'id="cockpitNeueLeistung"'],["#angMeasLeistungenZeile",'id="angMeasLeistungenZeile"']];
 p(feste.every(([s,n])=>html.includes(n)),"Die festen Einstiege stehen wirklich in index.html (kein toter Selektor)",feste.filter(([s,n])=>!html.includes(n)).map(x=>x[0]));
 for(const [m,a] of [["regierapport","data-a2-rep"],["regierapport","data-a2-tu=\"neuerrapport\""],["ausmass","data-a2-am"],["ausmass","data-a2-tu=\"neuesam\""],["leistungen","data-a2-lei"],["leistungen","\"neuelei\""]])
  p(lies("js/70-ansicht2.js").includes(a),"Die dynamische Stelle «"+a+"» gibt es in js/70 (kein toter Selektor)");

 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const mk=async()=>{const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));await stubSchuetzen(page);await page.addInitScript(INIT);
  await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
  await page.evaluate(()=>{$("appRoot").hidden=false;$("authScreen").hidden=true;window.__alerts=[];window.appAlert=async t=>{window.__alerts.push(t)};window.appConfirm=async()=>true;
   sb.rpc=async()=>({data:null,error:null});
   sb.from=n=>{const q={};['select','order','limit','eq','in'].forEach(k=>q[k]=()=>q);q.then=(r,j)=>Promise.resolve({data:[],error:null}).then(r,j);return q}});return page};

 console.log("\nC · Body-Klassen folgen der Freigabe");
 let page=await mk();
 await page.evaluate(()=>{sb.rpc=async()=>({data:[{modul:"ausmass",aktiv:false},{modul:"regierapport",aktiv:true},{modul:"leistungen",aktiv:false}],error:null});return modulLaden()});
 let k=await page.evaluate(()=>["ausmass","regierapport","leistungen"].map(m=>document.body.classList.contains("modul-aus-"+m)));
 p(JSON.stringify(k)==="[true,false,true]","Gesperrte Module setzen «modul-aus-…», freie nicht",k);
 await page.evaluate(()=>{sb.rpc=async()=>({data:[{modul:"ausmass",aktiv:true},{modul:"regierapport",aktiv:true},{modul:"leistungen",aktiv:true}],error:null});return modulLaden()});
 p(await page.evaluate(()=>!document.body.className.includes("modul-aus-")),"Wird ein Modul wieder freigegeben, verschwindet die Klasse");
 p(await page.evaluate(()=>{document.body.classList.add("modul-aus-ausmass");const e=document.getElementById("cockpitAmCard");const s=getComputedStyle(e).display;document.body.classList.remove("modul-aus-ausmass");return s==="none"}),"Mit der Klasse ist die Ausmass-Karte im Cockpit wirklich unsichtbar");

 console.log("\nD · Sperr-Hinweis statt halbem Bildschirm");
 await page.evaluate(()=>{firmaModule={ausmass:false,regierapport:false,leistungen:false};window.__alerts=[];window.reportReturnTo="x";isDirty=true});
 const ruf=await page.evaluate(()=>{
  const a=[];
  openReport({id:1,created_by:null});a.push(["openReport",window.__alerts.length,window.reportReturnTo]);
  $("newReport").onclick();a.push(["newReport",window.__alerts.length]);
  openAusmass({id:1,created_by:null});a.push(["openAusmass",window.__alerts.length]);
  newAusmassWithType("x");a.push(["newAusmass",window.__alerts.length]);
  newLeistung();a.push(["newLeistung",window.__alerts.length]);
  return {a,t:window.__alerts};});
 p(ruf.a.map(x=>x[1]).join(",")==="1,2,3,4,5","Alle fünf Wege (Rapport öffnen/neu, Ausmass öffnen/neu, Leistung neu) melden die Sperre und brechen ab",ruf.a);
 p(ruf.a[0][2]==="x","Der Zustand bleibt unverändert (reportReturnTo wurde nicht angefasst)");
 const soll=["Regierapport und Regieofferte","Regierapport und Regieofferte","Ausmass","Ausmass","Leistungen"];
 p(soll.every((m,i)=>(ruf.t[i]||"").includes("«"+m+"»")&&/nicht freigeschaltet/.test(ruf.t[i]||"")),"Jede Meldung nennt genau das passende Modul (Rapport, Rapport, Ausmass, Ausmass, Leistungen)",ruf.t);
 await page.evaluate(()=>{firmaModule={};window.__alerts=[]});
 p(await page.evaluate(()=>{try{newLeistung()}catch(e){}return window.__alerts.length===0}),"Freies Modul: kein Sperr-Hinweis");

 console.log("\nE · Projektseite (Ansicht 2)");
 const e1=await page.evaluate(()=>{
  const reg=()=>a2ProjRegister().map(r=>r.k).join(",");
  firmaModule={};const frei=reg();
  firmaModule={ausmass:false};const ohneAm=reg();
  firmaModule={regierapport:false};const ohneRep=reg();
  firmaModule={ausmass:false,regierapport:false};const ohneBeide=reg();
  const st=()=>a2StationenFuerFirma().map(s=>s.k).join(",");
  firmaModule={};const stFrei=st();firmaModule={ausmass:false};const stOhne=st();
  return {frei,ohneAm,ohneRep,ohneBeide,stFrei,stOhne}});
 p(/ausmass/.test(e1.frei)&&/rapport/.test(e1.frei),"Frei: Register «Ausmass» und «Rapport» sind da",e1.frei);
 p(!/ausmass/.test(e1.ohneAm)&&/rapport/.test(e1.ohneAm),"Ausmass gesperrt: nur das Register «Ausmass» fehlt",e1.ohneAm);
 p(/ausmass/.test(e1.ohneRep)&&!/rapport/.test(e1.ohneRep),"Rapport gesperrt: nur das Register «Rapport» fehlt",e1.ohneRep);
 p(!/ausmass/.test(e1.ohneBeide)&&!/rapport/.test(e1.ohneBeide)&&/uebersicht/.test(e1.ohneBeide)&&/aufmass/.test(e1.ohneBeide),"Beide gesperrt: Übersicht und Massaufnahme (Kern) bleiben",e1.ohneBeide);
 p(!/ausmass/.test(e1.stOhne)&&/ausmass/.test(e1.stFrei),"Die Ablaufleiste zeigt die Station «Ausmass» nur bei freiem Modul",{f:e1.stFrei,o:e1.stOhne});
 const e2=await page.evaluate(()=>{
  a2Zustand.projektId=7;const out={};
  firmaModule={ausmass:false,regierapport:false,leistungen:false};window.__alerts=[];
  a2NeuerEintrag("am");a2NeuerEintrag("rep");a2NeuerEintrag("lei");out.alerts=window.__alerts.length;
  return out});
 p(e2.alerts===3,"«Neues Ausmass», «Neuer Rapport», «Neue Leistung» auf der Projektseite melden die Sperre",e2);
 const e3=await page.evaluate(()=>{
  const proj={id:7};
  firmaModule={};const frei=a2RegOfferte(proj);
  firmaModule={leistungen:false};const aus=a2RegOfferte(proj);
  return {frei:frei.includes("Leistungen"),aus:aus.includes("Leistungen")}});
 p(e3.frei===true&&e3.aus===false,"Im Register «Offerte» steht der Block «Leistungen» nur bei freiem Modul",e3);
 p(!(page.__f.length),"Keine Skriptfehler",page.__f);
 await page.close();

 console.log("\nF · Offerte → Massaufnahmen ableiten legt ohne Modul keine Leistungen an");
 const w=lies("js/63-angebote.js");
 p(/const leiWunsch=\(typeof modulAn!=="function"\|\|modulAn\("leistungen"\)\)&&/.test(w),"Der Wunsch nach Leistungen verlangt zusätzlich das freie Modul");

 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
