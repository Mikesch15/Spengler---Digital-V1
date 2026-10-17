// v3.389: Modulinventar (Kernmodule), Modul Termine schaltbar, Anzeige-Sperre. Statische Pruefung der Migration/Policies, Verhalten der Anzeige-Sperre (modulErlaubt) und
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

 const mig=lies("supabase/migrations/v3389_module_inventar_termine.sql");
 console.log("\nA · Migration v3389 (statisch)");
 for(const k of ["projekte","massaufnahme","ausmass","regierapport","leistungen"])p(new RegExp("\\('"+k+"'[^\\n]*,true,false\\)").test(mig),"Kernmodul «"+k+"» ist registriert und nicht einzeln schaltbar");
 p(/\('termine'[^\n]*,true,true\)/.test(mig),"«termine» ist registriert und schaltbar");
 p(/set schaltbar = true where modul in \('angebote','lager','nachkalkulation'\)/.test(mig),"Die drei bisherigen Module bleiben schaltbar");
 p(/select \(not r\.schaltbar\) or \(/.test(mig),"modul_aktiv liefert für Kernmodule immer «frei»");
 p(/if not r\.schaltbar then raise exception 'Dieses Modul ist ein Kernmodul/.test(mig),"Der Schalter-RPC lehnt Kernmodule ab");
 p(["termine","outlook_verbindungen","outlook_termin_map","kalender_abos"].every(t=>mig.includes("'"+t+"'"))&&/as restrictive for all using \(\(select public\.modul_aktiv\(%2\$L\)\)\)/.test(mig),"Vier Tabellen des Moduls «termine» bekommen eine RESTRICTIVE-Sperre");
 p(/create or replace function public\.system_admin_module_uebersicht/.test(mig)&&/revoke all on function public\.system_admin_module_uebersicht\(\) from public, anon/.test(mig),"Neue Übersichtsfunktion: nur eingeloggt, anon/Public ausgeschlossen");
 p(!/\bdrop (function|table|policy)\b/i.test(mig.replace(/^--.*$/gm,""))&&!/\bdelete from\b/i.test(mig.replace(/^--.*$/gm,"")),"Die Migration löscht nichts (die alte Funktion bleibt bestehen)");
 p(/meine_module\(\)[\s\S]{0,120}security invoker/.test(mig)&&/revoke all on function public\.meine_module\(\) from public, anon/.test(mig),"meine_module: normale Rechte, nicht für anon");

 console.log("\nB · Edge Functions (Service-Rolle darf die Sperre nicht umgehen)");
 for(const f of ["supabase/functions/outlook-sync/index.ts","supabase/functions/kalender-abo/index.ts"]){
  const t=lies(f);
  p(/company_modules\?company_id=eq\.\$\{firma\}&modul=eq\.termine/.test(t)&&/termineModulAus\(/.test(t.replace(/async function termineModulAus/,"")),f.split("/")[2]+": prüft das Modul «termine» vor jedem Lauf");
  p(t.indexOf("termineModulAus(verb.company_id)")>t.indexOf("firmaAktiv(verb.company_id)")||t.indexOf("termineModulAus(abo.company_id)")>t.indexOf("firmaAktiv(abo.company_id)"),f.split("/")[2]+": erst Firmenstatus, dann Modul, dann erst Abgleich");
 }
 p(/termineModulAus\(ich\.firma\)/.test(lies("supabase/functions/kalender-abo/index.ts")),"kalender-abo: auch «Abo einrichten» wird bei gesperrtem Modul abgewiesen");

 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const mk=async()=>{const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));await stubSchuetzen(page);await page.addInitScript(INIT);
  await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
  await page.evaluate(()=>{$("appRoot").hidden=false;$("authScreen").hidden=true;window.__confirm=true;window.appConfirm=async()=>window.__confirm;window.appAlert=async()=>{};window.__rpc=[];window.__antwort={};
   sb.rpc=async(n,a)=>{window.__rpc.push({n,a});const f=window.__antwort[n];return typeof f==="function"?f(a):(f||{data:null,error:null})};
   sb.from=n=>{const q={};['select','order','limit','eq','in'].forEach(k=>q[k]=()=>q);q.then=(r,j)=>Promise.resolve({data:(window.__tab&&window.__tab[n])||[],error:null}).then(r,j);return q}});return page};

 console.log("\nC · Anzeige: Cache der Modulfreigabe");
 let page=await mk();
 p(await page.evaluate(()=>modulAn("termine")===true&&modulAn("gibtsnicht")===true),"Vor dem Laden gilt alles als frei (nichts blendet sich von selbst aus)");
 await page.evaluate(()=>{window.__antwort.meine_module={data:[{modul:"termine",aktiv:false},{modul:"lager",aktiv:true},{modul:"massaufnahme",aktiv:true}],error:null};return modulLaden()});
 p(await page.evaluate(()=>modulAn("termine")===false&&modulAn("lager")===true&&modulAn("massaufnahme")===true),"Nach dem Laden ist «termine» aus, die übrigen sind frei");
 await page.evaluate(()=>{window.__antwort.meine_module={data:null,error:{message:"offline"}};return modulLaden()});
 p(await page.evaluate(()=>modulAn("termine")===false),"Schlägt das Neuladen fehl (offline), bleibt der letzte Stand bestehen");
 await page.evaluate(()=>{window.__antwort.meine_module={data:[{modul:"termine",aktiv:true}],error:{message:"teilweise"}};return modulLaden()});
 p(await page.evaluate(()=>modulAn("termine")===false),"Auch eine Antwort MIT Fehler wird nicht übernommen (kein halber Stand)");
 p(await page.evaluate(()=>{window.__antwort.meine_module=()=>{throw new Error("x")};return modulLaden().then(()=>modulAn("termine")===false)}),"Auch eine Ausnahme beim Laden bricht nichts");
 console.log("\nD · Anzeige: Termine verschwinden bei gesperrtem Modul");
 const mehr=async an=>page.evaluate(an2=>{firmaModule={termine:an2};return a2SeiteMehr().replace(/<[^>]+>/g," ").replace(/\s+/g," ")},an);
 let t=await mehr(true);
 p(/Wochenübersicht, Kalender vom Handy importieren/.test(t),"Modul frei: «Termine» steht unter Mehr");
 t=await mehr(false);
 p(!/Wochenübersicht, Kalender vom Handy importieren/.test(t)&&/Abwicklung/.test(t),"Modul gesperrt: «Termine» fehlt unter Mehr, andere Einträge bleiben");
 p(await page.evaluate(()=>{firmaModule={termine:false};return terKarteHtml()===""}),"Modul gesperrt: die Termine-Karte auf «Heute» entfällt");
 p(await page.evaluate(()=>{firmaModule={};return typeof terKarteHtml()==="string"}),"Modul frei: die Karte wird gezeichnet");
 await page.close();

 console.log("\nE · Systemadmin-Oberfläche liest das Register");
 page=await mk();
 await page.evaluate(()=>{
  sysAdminCompanies=[{id:"c1",name:"Firma Eins",subscription_status:"active",created_at:"2026-01-01T00:00:00Z",trial_days:30,trial_started_at:"2026-01-01T00:00:00Z",trial_ends_at:"2026-02-01T00:00:00Z"}];sysAdminUserCounts={};
  window.__antwort.system_admin_module_uebersicht=()=>({data:[
   {company_id:"c1",modul:"termine",name:"Termine und Kalender",beschreibung:"Terminplanung und Kalender",schaltbar:true,aktiv:true,ausdruecklich:false},
   {company_id:"c1",modul:"lager",name:"Lieferanten-Lager",beschreibung:"",schaltbar:true,aktiv:true,ausdruecklich:false},
   {company_id:"c1",modul:"massaufnahme",name:"Massaufnahme, Zuschnitt, Werkstatt",beschreibung:"",schaltbar:false,aktiv:true,ausdruecklich:false},
   {company_id:"c1",modul:"projekte",name:"Projekte und Cockpit<i>x</i>",beschreibung:"",schaltbar:false,aktiv:true,ausdruecklich:false}],error:null});
  openSystemAdminCompany("c1")});await page.waitForTimeout(300);
 t=await page.evaluate(()=>document.getElementById("sysAdminModuleListe").innerText.replace(/\s+/g," "));
 p(/Termine und Kalender freigeschaltet/.test(t)&&/Terminplanung und Kalender/.test(t)&&/Lieferanten-Lager/.test(t),"Namen und Beschreibung kommen aus dem Register",t);
 p(await page.evaluate(()=>document.querySelectorAll('[data-sys-modul]').length)===2,"Nur die schaltbaren Module haben einen Schalter (2 von 4)");
 p(/Kernmodule \(immer dabei, nicht einzeln schaltbar\): Massaufnahme, Zuschnitt, Werkstatt · Projekte und Cockpit/.test(t),"Kernmodule stehen getrennt und ohne Schalter",t);
 p(!(await page.evaluate(()=>!!document.querySelector("#sysAdminModuleListe i"))),"Namen aus dem Register werden nie als HTML eingefügt");
 p(!(page.__f.length),"Keine Skriptfehler",page.__f);
 await page.close();

 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
