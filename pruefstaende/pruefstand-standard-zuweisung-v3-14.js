// Prueft die Standard-Zuweisung aus v3.14:
// Bei der Freigabe bekommen Ruester und Monteur die Person, die die
// Massaufnahme aufgenommen hat - anpassbar bleibt es unveraendert.
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche. Also was nach der Freigabe
// angezeigt wird, was der Zuweisungsdialog vorschlaegt, und dass die
// Oberflaeche selbst KEINE zweite Zuweisung schreibt.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die Vorgabe wirklich setzt.
// Das ist serverseitig und wurde per SQL gegen das echte Produktivschema
// geprueft (5 Faelle, siehe CLAUDE.md 119).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-standard-zuweisung-v3-14.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

const STUB=`window.__ruf=[];window.__zeilen=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name,args)=>{window.__ruf.push({name,args});
   const a=window.__rpcAntwort&&window.__rpcAntwort[name];
   if(a&&a.fehler)return {data:null,error:{message:a.fehler}};
   return {data:a?a.data:null,error:null}},
 from:(t)=>{const f={_t:t,_eq:{}};
   ['select','order','limit','range','in'].forEach(k=>f[k]=()=>f);
   f.eq=(s,v)=>{f._eq[s]=v;return f};
   f.maybeSingle=async()=>({data:null,error:null});
   f.then=(r)=>Promise.resolve({data:[],error:null}).then(r);
   return f},
 storage:{from:()=>({createSignedUrl:async(pf)=>({data:{signedUrl:'https://beispiel.test/'+pf},error:null})})}
})};`;

const A="aaaa1111-1111-1111-1111-111111111111";
const B="bbbb2222-2222-2222-2222-222222222222";
const D="dddd4444-4444-4444-4444-444444444444";

const anmelden=(page,wer,rolle)=>page.evaluate(([id,r,A,B,D])=>{
 currentProfile={id,role:r,first_name:"P",last_name:id.slice(0,4)};
 allProfiles=[{id:A,first_name:"Anna",last_name:"Aufnehmer"},
              {id:B,first_name:"Bruno",last_name:"Ruester"},
              {id:D,first_name:"Dora",last_name:"Chefin"}];
 meineRechte={admin:r==="admin"};
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern"}];
 measurementMaterials=[{id:2,name:"Titanzink"}];
 $("appRoot").hidden=false;$("authScreen").hidden=true;
},[wer,rolle,A,B,D]);

const M=(o)=>Object.assign({id:1,project_id:7,type:"kamineinfassung",title:"Kamin Nord",
  date:"2026-09-01",data:{},created_by:A,created_at:"2026-09-01T08:00:00Z",
  workflow_status:"in_bearbeitung",sketch_paths:[],photo_paths:[]},o);

// Die Antwort, die measurement_freigeben() seit v3.14 liefert, wenn die
// Vorgabe greift: beide auf den Aufnehmer, Status zu_ruesten.
const ANTWORT_STANDARD={workflow_status:"zu_ruesten",freigabe_verfallen:false,
 freigegeben_von:A,freigegeben_am:"2026-09-05T10:00:00Z",
 ruester_id:A,ruester_zugewiesen_von:A,ruester_zugewiesen_am:"2026-09-05T10:00:00Z",
 monteur_id:A,monteur_zugewiesen_von:A,monteur_zugewiesen_am:"2026-09-05T10:00:00Z"};

const box=(page)=>page.evaluate(()=>{
 const e=$("measWorkflowBereich");
 const h=$("mwHinweis");
 return {text:(e.innerText||"").replace(/\s+/g," ").trim(),
         knoepfe:[...e.querySelectorAll("button")].map(b=>b.id||b.textContent.trim()),
         hinweis:h?{da:!h.hidden,text:(h.textContent||"").replace(/\s+/g," ").trim()}:null};
});
const dialogOffen=(page)=>page.evaluate(()=>!$("mwZuweisenModal").hidden);
const dialogWerte=(page)=>page.evaluate(()=>({
 r:$("mwZuweisenRuester").value,m:$("mwZuweisenMonteur").value,
 niemand:!!$("mwZuweisenRuester").querySelector('option[value=""]')}));

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1800}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await anmelden(page,A,"employee");
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // ---- A · Die Vorgabe greift ---------------------------------------------
 console.log("\nA · Freigabe ohne bestehende Zuweisung");
 await page.evaluate(z=>{openMeasurement(z)},M({}));
 await page.evaluate(a=>{window.__ruf=[];window.__rpcAntwort={measurement_freigeben:{data:a}}},ANTWORT_STANDARD);
 await page.click("#mwFreigeben"); await page.waitForTimeout(250);

 const rufe=await page.evaluate(()=>window.__ruf);
 p(rufe.length===1&&rufe[0].name==="measurement_freigeben",
   "nur die Freigabe wird gerufen - die Oberflaeche schreibt keine zweite Zuweisung",rufe);
 let s=await box(page);
 p(/Zu rüsten/.test(s.text),"der Status folgt der Antwort: Zu rüsten",s.text.slice(0,90));
 p(/Rüsten Anna Aufnehmer/i.test(s.text.replace(/\s+/g," ")),
   "Rüsten steht auf dem Aufnehmer",s.text.slice(0,300));
 p(/Montage Anna Aufnehmer/i.test(s.text.replace(/\s+/g," ")),
   "Montage steht auf dem Aufnehmer",s.text.slice(0,300));
 p(s.hinweis&&s.hinweis.da,"ein Hinweis erklaert, was gesetzt wurde",s.hinweis);
 p(s.hinweis&&/Anna Aufnehmer/.test(s.hinweis.text),"der Hinweis nennt die Person",s.hinweis);
 p(s.hinweis&&/aufgenommen/.test(s.hinweis.text),"und warum sie es ist",s.hinweis);
 p(s.hinweis&&/anpassen|ändern/.test(s.hinweis.text),"und dass es anpassbar bleibt",s.hinweis);
 p(!(await dialogOffen(page)),
   "der Zuweisungsdialog draengt sich NICHT auf - es ist ja jemand eingeteilt");
 p(s.knoepfe.includes("mwZuweisenOeffnen"),
   "der Weg zum Aendern steht trotzdem da",s.knoepfe);

 // ---- B · anpassbar -------------------------------------------------------
 console.log("\nB · anpassbar");
 await page.click("#mwZuweisenOeffnen"); await page.waitForTimeout(150);
 p(await dialogOffen(page),"der Dialog laesst sich oeffnen");
 let w=await dialogWerte(page);
 p(w.r===A&&w.m===A,"er zeigt die aktuelle Einteilung",w);
 p(w.niemand,'"– niemand –" bleibt waehlbar',w);
 await page.evaluate(([b])=>{$("mwZuweisenRuester").value=b;$("mwZuweisenMonteur").value="";
   window.__ruf=[];window.__rpcAntwort={measurement_zuweisen:{data:{workflow_status:"zu_ruesten",
     ruester_id:b,ruester_zugewiesen_von:"aaaa1111-1111-1111-1111-111111111111",
     ruester_zugewiesen_am:"2026-09-05T11:00:00Z",monteur_id:null,
     monteur_zugewiesen_von:null,monteur_zugewiesen_am:null}}}},[B]);
 await page.click("#mwZuweisenSpeichern"); await page.waitForTimeout(200);
 const r2=await page.evaluate(()=>window.__ruf);
 p(r2.length===1&&r2[0].name==="measurement_zuweisen"&&r2[0].args.p_ruester===B&&r2[0].args.p_monteur===null,
   "die Aenderung geht unveraendert an measurement_zuweisen",r2);
 s=await box(page);
 p(/Rüsten Bruno Ruester/i.test(s.text.replace(/\s+/g," ")),"die neue Einteilung steht da",s.text.slice(0,300));
 p(!(s.hinweis&&s.hinweis.da),"der Hinweis der Freigabe ist weg",s.hinweis);

 // ---- C · Dialog schlaegt den Aufnehmer vor -------------------------------
 console.log("\nC · Vorschlag im Dialog");
 await page.evaluate(z=>{openMeasurement(z)},M({workflow_status:"freigegeben",
   freigegeben_von:A,freigegeben_am:"2026-09-05T10:00:00Z"}));
 await page.click("#mwZuweisenOeffnen"); await page.waitForTimeout(150);
 w=await dialogWerte(page);
 p(w.r===A&&w.m===A,"ist niemand eingeteilt, steht der Aufnehmer als Vorschlag da",w);
 await page.evaluate(()=>{$("mwZuweisenModal").hidden=true});

 // Eine bestehende Einteilung wird NICHT durch den Vorschlag ersetzt.
 await page.evaluate(([b,z])=>{openMeasurement(Object.assign(z,{workflow_status:"zu_montieren",
   monteur_id:b,monteur_zugewiesen_am:"2026-09-05T11:00:00Z"}))},[B,M({})]);
 await page.click("#mwZuweisenOeffnen"); await page.waitForTimeout(150);
 w=await dialogWerte(page);
 p(w.m===B&&w.r==="","eine bestehende Einteilung bleibt stehen, nichts wird ueberschrieben",w);
 await page.evaluate(()=>{$("mwZuweisenModal").hidden=true});

 // ---- D · Rueckfallweg ----------------------------------------------------
 console.log("\nD · greift die Vorgabe ausnahmsweise nicht");
 await page.evaluate(z=>{openMeasurement(z)},M({}));
 await page.evaluate(a=>{window.__ruf=[];window.__rpcAntwort={measurement_freigeben:{data:a}}},
   {workflow_status:"freigegeben",freigabe_verfallen:false,freigegeben_von:A,
    freigegeben_am:"2026-09-05T10:00:00Z",ruester_id:null,monteur_id:null});
 await page.click("#mwFreigeben"); await page.waitForTimeout(250);
 s=await box(page);
 p(!(s.hinweis&&s.hinweis.da),"dann gibt es keinen Hinweis, der etwas Falsches behauptet",s.hinweis);
 p(await dialogOffen(page),"und der Zuweisungsdialog geht wie bisher auf (keine Sackgasse)");
 await page.evaluate(()=>{$("mwZuweisenModal").hidden=true});

 // ---- E · verfallene Freigabe: Einteilung bleibt --------------------------
 console.log("\nE · nach einer verfallenen Freigabe");
 await page.evaluate(([b,z])=>{openMeasurement(Object.assign(z,{workflow_status:"in_bearbeitung",
   freigabe_verfallen:true,monteur_id:b,monteur_zugewiesen_am:"2026-09-05T11:00:00Z"}))},[B,M({})]);
 await page.evaluate(([b])=>{window.__ruf=[];window.__rpcAntwort={measurement_freigeben:{data:{
   workflow_status:"zu_montieren",freigabe_verfallen:false,freigegeben_von:"aaaa1111-1111-1111-1111-111111111111",
   freigegeben_am:"2026-09-06T09:00:00Z",ruester_id:null,monteur_id:b,
   monteur_zugewiesen_am:"2026-09-05T11:00:00Z"}}}},[B]);
 await page.click("#mwFreigeben"); await page.waitForTimeout(250);
 s=await box(page);
 p(!(s.hinweis&&s.hinweis.da),"eine bestehende Einteilung loest keinen Standard-Hinweis aus",s.hinweis);
 p(/Montage Bruno Ruester/i.test(s.text.replace(/\s+/g," ")),"sie bleibt unveraendert stehen",s.text.slice(0,300));

 // ---- F · Mobil -----------------------------------------------------------
 console.log("\nF · Mobil");
 for(const br of [320,360,390,412]){
  await page.setViewportSize({width:br,height:1400});
  await page.evaluate(z=>{openMeasurement(z)},M({}));
  await page.evaluate(a=>{window.__rpcAntwort={measurement_freigeben:{data:a}}},ANTWORT_STANDARD);
  await page.click("#mwFreigeben"); await page.waitForTimeout(200);
  const m=await page.evaluate(()=>{
   const h=$("mwHinweis"); const r=h.getBoundingClientRect();
   return {sichtbar:!h.hidden,rechts:Math.round(r.right),breite:Math.round(document.documentElement.clientWidth),
           scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  p(m.sichtbar&&m.rechts<=m.breite+1&&!m.scroll,"Hinweis passt bei "+br+" px",m);
 }
 await page.setViewportSize({width:412,height:1800});

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close(); process.exit(fail?1:0);
})();
