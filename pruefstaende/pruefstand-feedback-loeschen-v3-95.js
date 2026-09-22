// Prueft "Ich will die Feedbacks in der Systemadministration loeschen
// koennen" (v3.95): in der Betreiber-Ansicht (System-Administration ->
// Feedback aller Firmen) gab es bisher bewusst KEINEN Loeschknopf, weil ein
// direktes DELETE ueber sb.from("feedback") an der RESTRICTIVE Policy
// tenant_boundary_feedback scheitert, sobald das Feedback einer anderen
// Firma gehoert (per SQL gegen das echte Produktivschema geprueft). Die
// Loesung ist dieselbe wie beim bereits bestehenden Erledigt-Umschalten:
// eine serverseitig gegen is_system_admin() gepruefte Funktion
// (system_admin_delete_feedback), aufgerufen ueber sb.rpc() statt eines
// direkten Tabellenzugriffs.
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche - der Loeschknopf erscheint jetzt,
// ein Klick fragt nach, ruft die richtige RPC mit der richtigen ID, und die
// Liste laedt danach neu. Ein Fehler von der RPC (z. B. fehlende Rechte)
// fuehrt zu einer Meldung statt eines stillen Nichts-Passiert.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob is_system_admin() in
// system_admin_delete_feedback() serverseitig wirklich durchsetzt wird -
// das ist dieselbe, bereits etablierte Pruefung wie bei den anderen
// system_admin_*-Funktionen dieser Session (per SQL gegen das echte
// Produktivschema, siehe CHANGELOG_HISTORIE.md Abschnitt 161).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-feedback-loeschen-v3-95.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,340):""))}};

const STUB=`window.__ruf=[];window.__feedback=[];window.__rpcFehler=null;
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name,args)=>{window.__ruf.push({name,args});
   if(name==="system_admin_all_feedback")return {data:window.__feedback,error:null};
   if(name==="system_admin_delete_feedback"){
     if(window.__rpcFehler)return {data:null,error:{message:window.__rpcFehler}};
     window.__feedback=window.__feedback.filter(f=>f.id!==args.p_id);
     return {data:null,error:null}};
   return {data:null,error:null}},
 from:(t)=>{
   const f={};
   ['select','order','limit','range','in','eq'].forEach(k=>f[k]=()=>f);
   f.maybeSingle=async()=>({data:null,error:null});
   f.then=(cb)=>Promise.resolve({data:[],error:null}).then(cb);
   return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'x'},error:null})})}
})};`;

const FEEDBACK=[
 {id:101,module:"Regierapport",message:"Test-Feedback einer fremden Firma",
  created_by:"u1",created_at:"2026-09-10T08:00:00Z",resolved:false,
  company_id:"firma-fremd",company_name:"Fremde Firma AG",
  profiles:{first_name:"Anna",last_name:"Muster"}},
 {id:102,module:"Massaufnahme",message:"Zweites Test-Feedback",
  created_by:"u2",created_at:"2026-09-11T08:00:00Z",resolved:true,
  company_id:"firma-fremd",company_name:"Fremde Firma AG",
  profiles:{first_name:"Beat",last_name:"Muster"}}
];

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1800}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let letzteMeldung=""; page.on("dialog",d=>{letzteMeldung=d.message();d.accept()});
 // Der Stub unten muss die EINZIGE Quelle bleiben. Ohne die Absicherung
 // ueberschreibt ihn das echte supabase-js aus index.html Zeile 14,
 // sobald die Maschine Internet hat - Begruendung in stub-schutz.js.
 const cdnWache=await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 p(cdnWache.abgefangen>=1,
   "das echte supabase-js wurde abgefangen - der Stub ist die einzige Quelle",
   cdnWache.abgefangen);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 await page.evaluate((feedback)=>{
  window.__feedback=JSON.parse(JSON.stringify(feedback));
  // Angemeldet sein heisst: der Anmeldeschirm ist zu. Ohne diese Zeile
  // stuende er offen UND die System-Administration zugleich - ein Zustand,
  // den die App nie hat. Bis v3.155 fiel das nicht auf, weil beide
  // z-index 500 trugen; seit v3.156 liegt ein Bereich im Rahmen darunter,
  // und das ist richtig so: liegt der Anmeldeschirm oben, soll dahinter
  // nichts bedienbar sein.
  $("authScreen").hidden=true; $("appRoot").hidden=false;
  $("systemAdminModal").hidden=false;
  document.querySelector('[data-section="sysadmin-feedback"]').classList.add("open");
 },FEEDBACK);
 await page.evaluate(async()=>{await renderFeedbackBetreiberListe()});
 await page.waitForTimeout(150);

 console.log("\nA · Loeschknopf ist jetzt da");
 let z=await page.evaluate(()=>({
  darfLoeschen:FEEDBACK_ANSICHTEN.betreiber.darfLoeschen,
  knoepfe:document.querySelectorAll("[data-feedback-del]").length,
  hinweisText:document.querySelector('[data-section="sysadmin-feedback"] .info').textContent
 }));
 p(z.darfLoeschen===true,"darfLoeschen ist jetzt true fuer die Betreiber-Ansicht",z);
 p(z.knoepfe===2,"beide Zeilen haben einen Loeschknopf",z);
 p(!/bewusst nicht möglich/.test(z.hinweisText),"der veraltete Hinweistext ('bewusst nicht möglich') steht nicht mehr da",z);

 console.log("\nB · Klick loescht ueber die geschuetzte Funktion, nicht direkt");
 await page.evaluate(()=>{window.__ruf.length=0});
 await page.click('[data-feedback-del="101"]');
 await page.waitForTimeout(200);
 z=await page.evaluate(()=>({
  ruf:window.__ruf,
  uebrig:window.__feedback.map(f=>f.id),
  zeilenImDom:document.querySelectorAll("[data-feedback-del]").length
 }));
 p(/wirklich löschen/i.test(letzteMeldung),"vorher wird nachgefragt",letzteMeldung);
 p(z.ruf[0]&&z.ruf[0].name==="system_admin_delete_feedback"&&z.ruf[0].args.p_id===101,
   "die RPC system_admin_delete_feedback wird mit der richtigen ID gerufen - kein direktes sb.from(\"feedback\").delete()",z.ruf);
 p(z.uebrig.length===1&&z.uebrig[0]===102,"das geloeschte Feedback ist weg, das andere bleibt",z);
 p(z.zeilenImDom===1,"die Liste zeigt danach nur noch die verbleibende Zeile",z);

 console.log("\nC · Ein Fehler von der RPC (z. B. fehlende Rechte) wird gemeldet, nicht verschluckt");
 let alertText="";
 page.removeAllListeners("dialog");
 page.on("dialog",d=>{if(/wirklich löschen/i.test(d.message())){d.accept()}else{alertText=d.message();d.accept()}});
 await page.evaluate(()=>{window.__rpcFehler="Nur für System-Administratoren."});
 await page.evaluate(()=>{window.__ruf.length=0});
 await page.click('[data-feedback-del="102"]');
 await page.waitForTimeout(200);
 z=await page.evaluate(()=>({uebrig:window.__feedback.map(f=>f.id),
   zeilenImDom:document.querySelectorAll("[data-feedback-del]").length}));
 p(/Nur für System-Administratoren/.test(alertText),"der Fehler von der RPC wird als Meldung angezeigt",alertText);
 p(z.uebrig.length===1&&z.zeilenImDom===1,"ohne Erfolg bleibt die Zeile stehen - nichts wird stillschweigend entfernt",z);

 p(fehler.length===0,"keine JavaScript-Fehler im ganzen Lauf",fehler.slice(0,3));

 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 await b.close();
 process.exit(fail?1:0);
})();
