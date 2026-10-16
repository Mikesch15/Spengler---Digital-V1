// v3.388: Termine zuteilen - Sichtbarkeit (Migration v3388, Editor, Liste, Texte). Die Edge Function ist ein Stub (sb.functions.invoke).
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


 const lies=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
 console.log("\nA · Datenbank-Regel (statisch; am 16.10.2026 zusätzlich in Produktion gemessen)");
 const mig=lies("supabase/migrations/v3388_termine_zuteilung_sichtbar.sql");
 p(/create policy termine_zuteilung_sichtbar on public\.termine as restrictive for all/.test(mig),"Die Sichtbarkeitsregel ist RESTRICTIVE (hebelt weder Firmengrenze noch Rechte aus)");
 p(/cardinality\(mitarbeiter\), 0\) = 0/.test(mig)&&/auth\.uid\(\)\) = any\(mitarbeiter\)/.test(mig)&&/created_by = \(select auth\.uid\(\)\)/.test(mig)&&/pr\.role = 'admin'/.test(mig),"Sichtbar: ohne Zuteilung für alle; mit Zuteilung zugeteilte Personen, Ersteller und Admins");
 p(!/drop |delete |alter table/i.test(mig.replace(/^--.*$/gm,"")),"Migration ändert/löscht nichts Bestehendes");

 console.log("\nB · Oberfläche");
 const page=await mk();
 await page.evaluate(()=>{
  allProfiles=[{id:"u1",first_name:"Max",last_name:"Muster"},{id:"u2",first_name:"Eva",last_name:"Beispiel"}];
  window.profileName=id=>({u1:"Max Muster",u2:"Eva Beispiel"}[id]||"");
  const h=terHeute();window.__tab.termine=[
   {id:1,titel:"Für alle",start_datum:h,ende_datum:h,start_zeit:"08:00:00",ende_zeit:null,quelle:"app",mitarbeiter:[],project_id:null},
   {id:2,titel:"Nur Eva",start_datum:h,ende_datum:h,start_zeit:"09:00:00",ende_zeit:null,quelle:"app",mitarbeiter:["u2"],project_id:null}];
  terOeffnen();
 });await page.waitForTimeout(400);
 const liste=await page.evaluate(()=>document.getElementById("terListe").innerText.replace(/\s+/g," "));
 p(/Nur Eva/.test(liste)&&/👥 Eva Beispiel/.test(liste),"In der Liste steht bei zugeteilten Terminen 👥 und der Name",liste);
 p(!/👥[^F]*Für alle/.test(liste)&&!/Für alle[^N]*👥 Eva.*Für alle/.test(liste),"Termine ohne Zuteilung tragen kein 👥");
 await page.evaluate(()=>terEditorOeffnen(0));
 const ed=await page.evaluate(()=>document.getElementById("terEditor").innerText.replace(/\s+/g," "));
 p(/Zuteilen an \(optional\)/i.test(ed)&&/Nichts gewählt = für alle sichtbar/.test(ed)&&/nur die gewählten Personen/.test(ed)&&/Ersteller und die Admins/.test(ed),"Der Editor sagt klar, wer den Termin sieht",ed.slice(0,400));
 p(await page.evaluate(()=>document.querySelectorAll("#terEditor [data-ter-ma]").length)===2,"Alle Mitarbeiter der Firma stehen zur Auswahl");
 await page.evaluate(()=>{window.__eingefuegt=null;
  sb.from=n=>{const q={};['select','order','limit','lte','gte','eq'].forEach(k=>q[k]=()=>q);q.insert=r=>{window.__eingefuegt=r;return {select:()=>({then:(f)=>Promise.resolve({data:[],error:null}).then(f)}),then:f=>Promise.resolve({data:[],error:null}).then(f)}};q.then=f=>Promise.resolve({data:[],error:null}).then(f);return q};
  document.getElementById("terTitel").value="Besichtigung";
  const c=document.querySelector('#terEditor [data-ter-ma="u2"]');c.checked=true;
  document.getElementById("terSpeichern").click()});await page.waitForTimeout(300);
 const eingefuegt=await page.evaluate(()=>window.__eingefuegt);
 const zeile=Array.isArray(eingefuegt)?eingefuegt[0]:eingefuegt;
 p(zeile&&Array.isArray(zeile.mitarbeiter)&&zeile.mitarbeiter.length===1&&zeile.mitarbeiter[0]==="u2","Speichern schickt die Zuteilung (nur Eva) an die Datenbank",eingefuegt);
 await page.close();

 console.log("\nC · Texte (die importierten Termine sind jetzt persönlich)");
 for(const [f,w] of [["js/94-outlook.js","Outlook"],["js/95-google-kalender.js","Google"],["js/96-kalender-abo.js","Abo"]]){
  const t=lies(f);p(/nur für dich<\/b> sichtbar/.test(t)&&!/alle Mitarbeiter mit Projektrecht/.test(t),w+": Hinweis lautet «nur für dich sichtbar», der alte Satz ist weg");
 }
 const h=lies("js/41-hilfe.js");
 p(/Zuteilung<\/b>/.test(h)&&/mit Zuteilung<\/b> sehen ihn nur/.test(h)&&!/Sie sind für alle Mitarbeiter mit Projektrecht sichtbar/.test(h),"Hilfe erklärt die Zuteilung und enthält den alten Satz nicht mehr");

 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();
