// Prueft "archivierte Massaufnahmen erscheinen nicht in der Suche" (v3.278).
//
// Ansage des Anwenders (9.10.2026): "Ja, auch in der Suche ausblenden" (Antwort
// auf die Frage, ob Suche, "Alle Massaufnahmen" und Ausmass-Auswahl archivierte
// ausblenden sollen - gewaehlt wurde nur die Suche; die beiden anderen bleiben).
//
// Die Datenbank ist gestubbt: sb.from wird ersetzt, protokolliert die Filter und
// beantwortet sie wie PostgREST (eq filtert, limit schneidet). Geprueft wird am
// ERGEBNIS in der Trefferliste, nicht am Quelltext, und dass der Filter VOR dem
// limit wirkt - sonst verdraengten archivierte Treffer aktive.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Andrea",last_name:"Beispiel",company_id:"c1"};
  allProfiles=[currentProfile]; meineRechte={admin:true};
  allProjects=[{id:7001,name:"Dach Nord",object:"Bahnhofstrasse 12, 3011 Bern",order_no:"1",customer:"",archived:false,status:"in_arbeit"}];
  const mk=(id,titel,arch,pid)=>({id,project_id:pid,type:"rinne_halbrund",title:titel,date:"2026-10-0"+(id%9+1),archived:arch,workflow_status:"abgeschlossen"});
  // 35 archivierte (neuere Daten) + 2 aktive: ohne Filter VOR dem limit(30)
  // blieben die zwei aktiven unter den ersten 30 nicht uebrig.
  window.__m=[];
  for(let i=0;i<35;i++)window.__m.push(mk(100+i,"Suchtest archiv "+i,true,7001));
  window.__m.push(mk(1,"Suchtest aktiv A",false,7001),mk(2,"Suchtest aktiv B",false,7001));
  window.__filter=[];
  sb.from=t=>{
   const q={t,f:[],lim:null,ilike:null,inn:null};
   const run=async()=>{
    if(t!=="measurements")return {data:[],error:null};
    window.__filter.push(q.f.map(x=>x.join("=")));
    let z=window.__m.slice();
    q.f.forEach(([c,v])=>{z=z.filter(r=>r[c]===v)});
    if(q.ilike)z=z.filter(r=>String(r.title).toLowerCase().includes(q.ilike));
    if(q.inn)z=z.filter(r=>q.inn.includes(r.project_id));
    // wie die echte Abfrage: erst filtern, dann nach Datum absteigend, dann limit
    z.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if(q.lim)z=z.slice(0,q.lim);
    return {data:z,error:null};
   };
   const chain={select:()=>chain,ilike:(c,v)=>{q.ilike=String(v).replace(/%/g,"").toLowerCase();return chain},
    or:()=>chain,in:(c,v)=>{q.inn=v;return chain},eq:(c,v)=>{q.f.push([c,v]);return chain},
    order:()=>chain,limit:n=>{q.lim=n;return chain},maybeSingle:async()=>({data:null,error:null}),
    then:(a,r)=>run().then(a,r)};
   return chain;
  };
 });
 const suche=async text=>{
  await page.evaluate(()=>{window.__filter.length=0});
  await page.evaluate(t=>{$("openGlobalSearch").click();$("globalSearchInput").value=t;
    $("globalSearchInput").dispatchEvent(new Event("input",{bubbles:true}))},text);
  await page.waitForTimeout(900);
  return page.evaluate(()=>({status:$("globalSearchStatus").textContent,
    text:$("globalSearchResults").textContent.replace(/\s+/g," "),
    filter:window.__filter.slice()}));
 };

 console.log("\nA · Archivierte stehen nicht in der Trefferliste");
 let r=await suche("Suchtest");
 p(/Suchtest aktiv A/.test(r.text)&&/Suchtest aktiv B/.test(r.text),"die zwei aktiven Massaufnahmen werden gefunden",r.status);
 p(!/Suchtest archiv/.test(r.text),"keine der 35 archivierten steht in der Liste",r.status);
 p(/2 Treffer/.test(r.status),"und die Trefferzahl zaehlt nur die aktiven",r.status);
 p(r.filter.length>=1&&r.filter.every(f=>f.indexOf("archived=false")>=0),
   "jede Abfrage auf measurements traegt den Filter archived=false (VOR dem limit, nicht danach)",r.filter);

 console.log("\nB · Auch die Suche ueber ein Projekt");
 r=await suche("Bahnhofstrasse");
 p(/Suchtest aktiv A/.test(r.text)&&!/Suchtest archiv/.test(r.text),
   "ein Treffer auf die Projektadresse zeigt dessen aktive Massaufnahmen, nicht die archivierten",r.status);
 p(r.filter.length>=1&&r.filter.every(f=>f.indexOf("archived=false")>=0),"auch diese Abfrage filtert serverseitig",r.filter);

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 await b.close(); process.exit(fail?1:0);
})();
