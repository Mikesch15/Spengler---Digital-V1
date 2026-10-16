// v3.378: Systemadmin (Betreiber) ist von den Firmenkonten getrennt: eigenes Konto OHNE Firmenprofil, eigener Einstieg "?betreiber",
// keine Systemadmin-Elemente in der Firmen-App. Die Datenbank-Seite (Betreiber sieht keine Firmendaten, Firmenadmin darf weder
// companies aendern noch system_admin_*-Funktionen aufrufen) wurde separat mit echten Rollen gemessen (siehe Abschlussbericht).
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
 const mk=async(url)=>{
  const page=await b.newPage({viewport:{width:412,height:1200}});
  page.__fehler=[];page.on("pageerror",e=>page.__fehler.push(String(e)));
  await stubSchuetzen(page);await page.addInitScript(INIT);
  await page.goto("file://"+path.join(process.cwd(),"index.html")+(url||""));await page.waitForTimeout(400);
  return page;
 };
 // Stub: wer ist angemeldet, hat er ein Profil, ist er Systemadmin; alle Tabellenabfragen werden mitgeschrieben
 const stub=(page,cfg)=>page.evaluate(c=>{
  window.__tabellen=[];window.__signOut=0;window.__geladen=0;
  sb.auth.getSession=async()=>({data:{session:{user:{id:"u-"+c.art}}}});
  sb.auth.signOut=async()=>{window.__signOut++;return {error:null}};
  sb.rpc=async(n)=>{
   if(n==="is_system_admin")return {data:!!c.sysadmin,error:null};
   if(n==="is_company_access_allowed")return {data:true,error:null};
   return {data:[],error:null};
  };
  sb.from=t=>{window.__tabellen.push(t);const q={};['select','eq','order','limit','in','is','lte','gte','insert','update','delete','single'].forEach(k=>q[k]=()=>q);
   q.maybeSingle=async()=>({data:t==="profiles"&&c.profil?{id:"u-"+c.art,first_name:"Max",last_name:"Muster",company_id:"c1",role:"admin",passwort_gesetzt:true}:null,error:null});
   q.then=(res,rej)=>Promise.resolve({data:[],error:null}).then(res,rej);return q};
  window.loadAllData=async()=>{window.__geladen++};
  window.checkOfferteZugriff=window.checkLagerZugriff=window.checkNachkalkulationZugriff=async()=>{};
 },cfg);

 console.log("\nA · Betreiber-Konto ohne Firmenprofil");
 let page=await mk();
 await stub(page,{art:"betreiber",sysadmin:true,profil:false});
 await page.evaluate(()=>afterLogin());await page.waitForTimeout(500);
 const a=await page.evaluate(()=>({modus:betreiberModus,app:!$("appRoot").hidden,modal:!$("systemAdminModal").hidden,a2:$("a2Screen").hidden,start:$("startScreen").hidden,
  leiste:!$("betreiberLeiste").hidden,auth:$("authScreen").hidden,geladen:window.__geladen,tab:[...new Set(window.__tabellen)]}));
 p(a.modus&&a.app&&a.modal&&a.a2&&a.start&&a.leiste&&a.auth,"Betreiber-Konto: nur die Systemadministration ist sichtbar (Firmen-App ausgeblendet)",a);
 p(a.geladen===0,"Es wird nichts aus einer Firma geladen (loadAllData wird nicht aufgerufen)",a.geladen);
 p(a.tab.length>0&&a.tab.every(t=>["profiles","companies","company_invites","feedback","system_settings"].includes(t)),"Die Betreiber-Oberfläche liest nur Verwaltungsdaten (keine Projekte, Massaufnahmen, Rapporte, Termine …)",a.tab);
 await page.evaluate(()=>{sb.auth.signOut=async()=>{sessionStorage.setItem("so","1");return {error:null}};document.getElementById("closeSystemAdmin").click()});
 await page.waitForURL(/\?betreiber/,{timeout:5000}).catch(()=>{});await page.waitForTimeout(600);
 const a2=await page.evaluate(()=>({so:sessionStorage.getItem("so"),url:location.search,titel:$("loginTitel").textContent}));
 p(a2.so==="1"&&a2.url==="?betreiber"&&a2.titel==="Betreiber-Anmeldung","„Zurück“ im Betreiber-Modus meldet ab und führt zum Betreiber-Einstieg (nicht in eine Firmen-App)",a2);
 await page.close();

 console.log("\nB · Firmenkonto – auch wenn es (noch) in system_admins steht – sieht keinen Systemadmin-Zugang");
 page=await mk();
 await stub(page,{art:"firma",sysadmin:true,profil:true});
 const bb=await page.evaluate(async()=>{
  currentProfile={id:"u-firma",first_name:"Max",last_name:"Muster",company_id:"c1",role:"admin"};
  await checkSystemAdmin();
  a2Zustand.seite="mehr";
  const mehr=a2SeiteMehr();
  return {sa:isSystemAdmin,nav:$("navSystemAdmin").hidden,mehr:/System-Administration|sysadmin/.test(mehr),modus:betreiberModus};
 });
 p(bb.sa&&bb.nav&&!bb.mehr&&!bb.modus,"Firmenkonto mit altem Systemadmin-Eintrag: kein Knopf, kein Eintrag unter „Mehr“",bb);
 await stub(page,{art:"firma2",sysadmin:false,profil:true});
 const bc=await page.evaluate(async()=>{currentProfile={id:"u-firma2",company_id:"c1",role:"employee"};await checkSystemAdmin();a2Zustand.seite="mehr";return {sa:isSystemAdmin,nav:$("navSystemAdmin").hidden,mehr:/System-Administration/.test(a2SeiteMehr())}});
 p(!bc.sa&&bc.nav&&!bc.mehr,"Normaler Mitarbeiter: kein Systemadmin-Zugang",bc);
 // Firmenkonto im normalen Login geht normal weiter
 await stub(page,{art:"firma3",sysadmin:false,profil:true});
 await page.evaluate(()=>{window.applyRechte=async()=>{};window.renderProjectSelect=()=>{};window.renderMain=()=>{};window.showStart=()=>{}});
 await page.evaluate(()=>afterLogin());await page.waitForTimeout(500);
 const bd=await page.evaluate(()=>({app:!$("appRoot").hidden,modus:betreiberModus,geladen:window.__geladen,modal:$("systemAdminModal").hidden}));
 p(bd.app&&!bd.modus&&bd.geladen===1&&bd.modal,"Normales Firmenkonto: Anmeldung läuft wie bisher (Firmendaten werden geladen, kein Betreiber-Modus)",bd);
 await page.close();

 console.log("\nC · Eigener Einstieg „?betreiber“");
 page=await mk("?betreiber");
 p(await page.evaluate(()=>$("loginTitel").textContent==="Betreiber-Anmeldung"),"Der Einstieg zeigt „Betreiber-Anmeldung“");
 await stub(page,{art:"firma",sysadmin:false,profil:true});
 await page.evaluate(()=>afterLogin());await page.waitForTimeout(400);
 const ca=await page.evaluate(()=>({so:window.__signOut,auth:!$("authScreen").hidden,app:$("appRoot").hidden,err:$("loginError").textContent,geladen:window.__geladen}));
 p(ca.so===1&&ca.auth&&ca.app&&/nur für das Betreiber-Konto/.test(ca.err)&&ca.geladen===0,"Ein Firmenkonto wird am Betreiber-Einstieg abgewiesen und abgemeldet",ca);
 await stub(page,{art:"firma",sysadmin:true,profil:true});
 await page.evaluate(()=>{$("authScreen").hidden=false;$("loginError").textContent=""});
 await page.evaluate(()=>afterLogin());await page.waitForTimeout(400);
 const cb=await page.evaluate(()=>({so:window.__signOut,modus:betreiberModus,geladen:window.__geladen}));
 p(cb.so===1&&!cb.modus&&cb.geladen===0,"Auch ein Firmenkonto MIT Systemadmin-Eintrag kommt am Betreiber-Einstieg nicht hinein (Trennung)",cb);
 await stub(page,{art:"betreiber",sysadmin:true,profil:false});
 await page.evaluate(()=>afterLogin());await page.waitForTimeout(400);
 p(await page.evaluate(()=>betreiberModus&&!$("systemAdminModal").hidden),"Das Betreiber-Konto kommt am Betreiber-Einstieg hinein");
 await page.close();
 page=await mk();
 p(await page.evaluate(()=>$("loginTitel").textContent==="Anmelden"),"Ohne „?betreiber“ bleibt der Titel „Anmelden“");
 const lk=await page.evaluate(()=>{const l=$("loginBetreiberLink"),f=$("loginFirmaLink");return {da:!!l,href:l&&l.getAttribute("href"),sicht:l&&!l.hidden,firmaVersteckt:f&&f.hidden,imApp:!!$("appRoot").querySelector("#loginBetreiberLink"),imLogin:!!$("authScreen").querySelector("#loginBetreiberLink")}});
 p(lk.da&&lk.href==="?betreiber"&&lk.sicht&&lk.firmaVersteckt&&lk.imLogin&&!lk.imApp,"Normale Anmeldung: Link „Betreiber-Anmeldung“ führt zu ?betreiber – er steht auf dem Anmeldebildschirm, nicht in der Firmen-App",lk);
 await page.close();
 const pb=await mk("?betreiber");
 const lb=await pb.evaluate(()=>({b:$("loginBetreiberLink").hidden,f:!$("loginFirmaLink").hidden,href:$("loginFirmaLink").getAttribute("href")}));
 p(lb.b&&lb.f&&/index\.html$|\/$/.test(lb.href),"Auf der Betreiber-Seite führt der Link zurück zur normalen Anmeldung (ohne ?betreiber)",lb);
 await pb.close();
 const q=fs.readFileSync("js/22-system-admin.js","utf8");
 p(!/service_role|SERVICE_ROLE/i.test(q),"Kein Service-Schlüssel im Browser-Code");
 await page.close();
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();
