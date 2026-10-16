// v3.387: Firmen-Modulregister + Plattform-Aktivitaetsprotokoll. Statische Pruefung der Migration/Policies, Verhalten der Anzeige-Sperre (modulErlaubt) und
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
 console.log("\nA · Migration (statisch)");
 const mig=lies("supabase/migrations/v3387_firmen_module_audit.sql");
 p(/create table public\.company_modules/.test(mig)&&/tenant_boundary_company_modules on public\.company_modules as restrictive/.test(mig),"company_modules: Firmen-Grenze ist RESTRICTIVE");
 p(/revoke insert, update, delete, truncate on public\.company_modules from authenticated/.test(mig)&&/revoke insert, update, delete, truncate on public\.platform_audit_log from authenticated/.test(mig)&&/revoke insert, update, delete, truncate on public\.module_registry from authenticated/.test(mig),"Benutzer können Register, Freigaben und Protokoll nie direkt schreiben");
 p(/platform_audit_select_sysadmin[\s\S]{0,120}public\.is_system_admin\(\)/.test(mig),"Protokoll ist nur für Systemadmins lesbar");
 p(/platform_audit_log\([\s\S]{0,300}company_id uuid,\s+-- bewusst OHNE Fremdschl/.test(mig),"Protokoll hat keinen Fremdschlüssel auf die Firma (bleibt nach dem Löschen)");
 p(/function public\.modul_aktiv[\s\S]{0,80}stable security definer set search_path to ''/.test(mig),"modul_aktiv: STABLE, SECURITY DEFINER, sicherer search_path");
 p(/standard_aktiv boolean not null default true/.test(mig)&&/'nachkalkulation'[\s\S]{0,160}'\{angebote\}'/.test(mig),"Standard aktiv (nichts ändert sich von selbst); Nachkalkulation hängt von Offerten ab");
 const tabs=["angebote","offerten","lager_varianten","lagerbestand_bewegungen","lieferanten_artikel","lieferanten_bewegungen","lieferanten_einkauf","abacus_abgleich","abacus_importe","abacus_stunden"];
 const fehlt=tabs.filter(t=>!mig.includes("('"+t+"','"));
 p(fehlt.length===0,"Alle 10 Tabellen der schaltbaren Module bekommen eine Modul-Policy",fehlt);
 p(/create policy modul_boundary_%1\$s on public\.%1\$s as restrictive for all/.test(mig),"Die Modul-Policies sind RESTRICTIVE (umgehen keine Firmen-/Feature-Grenze)");
 const setF=mig.slice(mig.indexOf("function public.system_admin_set_firma_modul"),mig.indexOf("do $$"));
 p(/is_system_admin\(\)/.test(setF)&&/platform_log\('modul_freigabe'/.test(setF)&&/braucht zuerst/.test(setF)&&/hängt von diesem Modul ab/.test(setF),"Setzen: prüft Systemadmin, Abhängigkeiten in beide Richtungen, schreibt Protokoll");
 p(/revoke all on function public\.system_admin_set_firma_modul[\s\S]{0,80}from public, anon/.test(mig)&&/revoke all on function public\.platform_log[\s\S]{0,80}from public, anon, authenticated/.test(mig),"anon und Public können die neuen Funktionen nicht aufrufen; platform_log nur intern");
 p(!/\bdelete from\b/i.test(mig)&&!/drop (table|policy|function)/i.test(mig.replace(/^--.*$/gm,"")),"Migration löscht und ersetzt keine bestehenden Daten/Policies (ausser zwei Funktionen mit zusätzlicher Protokollzeile)");
 p(/system_admin_set_status[\s\S]{0,700}platform_log\('firma_status'/.test(mig)&&/system_admin_set_trial[\s\S]{0,700}platform_log\('firma_testphase'/.test(mig),"Status- und Testphasen-Änderungen werden protokolliert");

 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const mk=async()=>{const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));await stubSchuetzen(page);await page.addInitScript(INIT);
  await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
  await page.evaluate(()=>{
   $("appRoot").hidden=false;$("authScreen").hidden=true;window.__confirm=true;window.__rpc=[];window.__antwort={};
   window.appConfirm=async()=>window.__confirm;window.appAlert=async()=>{};
   sb.rpc=async(n,a)=>{window.__rpc.push({n,a});const f=window.__antwort[n];return typeof f==="function"?f(a):(f||{data:null,error:null})};
   sb.from=n=>{const q={};['select','order','limit','eq','in'].forEach(k=>q[k]=()=>q);q.then=(r,j)=>Promise.resolve({data:(window.__tab&&window.__tab[n])||[],error:null}).then(r,j);return q};
  });return page};

 console.log("\nB · Anzeige-Sperre (modulErlaubt)");
 let page=await mk();
 const me=(ant)=>page.evaluate(async a=>{sb.rpc=async()=>{if(a==="wirft")throw new Error("x");return a};return await modulErlaubt("angebote")},ant);
 p((await me({data:false,error:null}))===false,"Ausdrückliches „false“ vom Server sperrt");
 p((await me({data:true,error:null}))===true&&(await me({data:null,error:null}))===true,"„true“ und leere Antwort lassen durch");
 p((await me({data:null,error:{message:"offline"}}))===true&&(await me("wirft"))===true,"Fehler/offline blenden nichts aus (die Datenbank sperrt ohnehin)");
 for(const [fkt,flag,name,key] of [["checkOfferteZugriff","offerteZugriff","Offerten","angebote"],["checkLagerZugriff","lagerverwaltungZugriff","Lager","lager"],["checkNachkalkulationZugriff","nkZugriff","Nachkalkulation","nachkalkulation"]]){
  const r=await page.evaluate(async([f,fl,k])=>{
   currentProfile={id:"u1"};
   sb.from=n=>{const q={};['select','eq'].forEach(x=>q[x]=()=>q);q.maybeSingle=async()=>({data:{granted:true},error:null});return q};
   const out={};
   for(const [lab,ant] of [["gesperrt",{data:false,error:null}],["frei",{data:true,error:null}]]){
    window.__geprueft=[];sb.rpc=async(n,a)=>{window.__geprueft.push(a.p_modul);return ant};
    await window[f]();out[lab]=window[fl]??eval(fl);out.key=window.__geprueft[0];
   }
   return out},[fkt,flag,key]);
  p(r.gesperrt===false&&r.frei===true&&r.key===key,name+": Person freigegeben + Firma gesperrt → kein Zugriff; Firma frei → Zugriff (Schlüssel «"+key+"»)",r);
 }
 await page.close();

 console.log("\nC · Systemadmin: Module je Firma");
 page=await mk();
 const ZEILEN=(o)=>[{company_id:"c1",modul:"angebote",aktiv:true,ausdruecklich:false,geaendert_am:null},{company_id:"c1",modul:"lager",aktiv:o&&o.lager===false?false:true,ausdruecklich:!!(o&&o.lager===false),geaendert_am:"2026-10-16T08:00:00Z"},{company_id:"c1",modul:"nachkalkulation",aktiv:true,ausdruecklich:false,geaendert_am:null},
  {company_id:"c2",modul:"angebote",aktiv:false,ausdruecklich:true,geaendert_am:"2026-10-15T08:00:00Z"}];
 await page.evaluate(z=>{
  sysAdminCompanies=[{id:"c1",name:"Firma Eins",subscription_status:"active",created_at:"2026-01-01T00:00:00Z",trial_days:30,trial_started_at:"2026-01-01T00:00:00Z",trial_ends_at:"2026-02-01T00:00:00Z"}];
  sysAdminUserCounts={};window.__tabelle=z;
  window.__antwort.system_admin_firmen_module=()=>({data:window.__tabelle,error:null});
  window.__antwort.system_admin_set_firma_modul=a=>{window.__tabelle=window.__tabelle.map(x=>x.company_id===a.p_company&&x.modul===a.p_modul?{...x,aktiv:a.p_aktiv,ausdruecklich:true,geaendert_am:"2026-10-16T09:00:00Z"}:x);return {data:a.p_aktiv,error:null}};
  openSystemAdminCompany("c1");
 },ZEILEN());
 await page.waitForTimeout(300);
 let t=await page.evaluate(()=>document.getElementById("sysAdminModuleListe").innerText.replace(/\s+/g," "));
 p(/Offerten freigeschaltet/.test(t)&&/Lieferanten-Lager freigeschaltet/.test(t)&&/Nachkalkulation \(Abacus\) freigeschaltet/.test(t)&&/Standard/.test(t),"Alle drei Module der Firma werden gezeigt, Standardzustand erkennbar",t);
 p(!/Offerten gesperrt/.test(t),"Die Zeile der FREMDEN Firma (c2: Offerten gesperrt) erscheint nicht bei Firma Eins");
 await page.evaluate(()=>{window.__confirm=false;const c=document.querySelector('[data-sys-modul="lager"]');c.checked=false;c.dispatchEvent(new Event("change",{bubbles:true}))});await page.waitForTimeout(200);
 p((await page.evaluate(()=>window.__rpc.filter(r=>r.n==="system_admin_set_firma_modul").length))===0&&await page.evaluate(()=>document.querySelector('[data-sys-modul="lager"]').checked),"Ohne Bestätigung: kein Aufruf, der Schalter springt zurück");
 await page.evaluate(()=>{window.__confirm=true;const c=document.querySelector('[data-sys-modul="lager"]');c.checked=false;c.dispatchEvent(new Event("change",{bubbles:true}))});await page.waitForTimeout(400);
 const w=await page.evaluate(()=>({r:window.__rpc.filter(r=>r.n==="system_admin_set_firma_modul"),t:document.getElementById("sysAdminModuleListe").innerText.replace(/\s+/g," "),ok:document.getElementById("sysAdminActionSuccess").innerText}));
 p(w.r.length===1&&w.r[0].a.p_company==="c1"&&w.r[0].a.p_modul==="lager"&&w.r[0].a.p_aktiv===false,"Bestätigt: genau ein Aufruf mit Firma, Modul und Zustand",w.r);
 p(/Lieferanten-Lager gesperrt/.test(w.t)&&/ausdrücklich gesetzt/.test(w.t)&&/jetzt gesperrt/.test(w.ok),"Erst nach der Serverantwort zeigt die Oberfläche «gesperrt» + Erfolgsmeldung",w);
 await page.evaluate(()=>{window.__antwort.system_admin_set_firma_modul=()=>({data:null,error:{message:"Zuerst „Nachkalkulation (Abacus)“ ausschalten – es hängt von diesem Modul ab."}});const c=document.querySelector('[data-sys-modul="angebote"]');c.checked=false;c.dispatchEvent(new Event("change",{bubbles:true}))});await page.waitForTimeout(400);
 const f=await page.evaluate(()=>({fe:document.getElementById("sysAdminActionError").innerText,t:document.getElementById("sysAdminModuleListe").innerText.replace(/\s+/g," ")}));
 p(/hängt von diesem Modul ab/.test(f.fe)&&/Offerten freigeschaltet/.test(f.t),"Abhängigkeits-Fehler vom Server: Meldung sichtbar, Zustand bleibt «freigeschaltet» (kein falscher Erfolg)",f);
 p(!(page.__f.length),"Keine Skriptfehler",page.__f);
 await page.close();

 console.log("\nD · Aktivitätsprotokoll");
 page=await mk();
 await page.evaluate(()=>{sysAdminCompanies=[{id:"c1",name:"Firma Eins"}];window.__tab={platform_audit_log:[
  {id:3,zeitpunkt:"2026-10-16T09:00:00Z",aktion:"modul_freigabe",company_id:"c1",modul:"lager",detail:{alt:true,neu:false}},
  {id:2,zeitpunkt:"2026-10-16T08:00:00Z",aktion:"firma_status",company_id:"c1",modul:null,detail:{alt:"trial",neu:"active"}},
  {id:1,zeitpunkt:"2026-10-15T08:00:00Z",aktion:"firma_loeschen",company_id:"cX",modul:null,detail:{name:"Alte AG<b>x</b>",benutzer:2,projekte:5}}]};
  return sysProtokollLaden()});await page.waitForTimeout(300);
 t=await page.evaluate(()=>document.getElementById("sysAdminProtokollListe").innerText.replace(/\s+/g," "));
 p(/Modul · Firma Eins/.test(t)&&/Lieferanten-Lager: gesperrt/.test(t)&&/Firmenstatus/.test(t)&&/Testphase → Aktiv|Testphase.*Aktiv/.test(t)&&/Firma gelöscht/.test(t)&&/2 Benutzer, 5 Projekte/.test(t),"Protokoll: Modul-, Status- und Lösch-Einträge verständlich, neueste zuerst",t);
 p(!(await page.evaluate(()=>!![...document.querySelectorAll("#sysAdminProtokollListe b")].some(e=>e.innerText==="x"))),"Inhalte aus dem Protokoll werden nie als HTML eingefügt (Name mit <b> bleibt Text)");
 await page.evaluate(()=>{window.__tab={platform_audit_log:[]};return sysProtokollLaden()});await page.waitForTimeout(200);
 p(/Noch keine Einträge/.test(await page.evaluate(()=>document.getElementById("sysAdminProtokollListe").innerText)),"Leeres Protokoll: verständlicher Leerzustand");
 await page.close();

 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
