// v3.371 (Stufe 1 Google Maps): "Navigation starten" auf der Projektseite - nur ein Link, keine Karte, keine API, kein Standort.
// Quelle der Adresse ist ausschliesslich projects.object.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1200}});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));
 await stubSchuetzen(page);
 await page.addInitScript(()=>{
  window.__geo=0;
  try{Object.defineProperty(navigator,"geolocation",{get(){window.__geo++;return undefined}})}catch(e){}
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
   from:()=>{const q={};['select','eq','order','limit','in','is'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
   storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})};
 });
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};allProfiles=[currentProfile];meineRechte={admin:true};
  $("appRoot").hidden=false;$("authScreen").hidden=true;
 });
 const seite=(obj)=>page.evaluate(o=>{
  allProjects=[{id:1,name:"Dach Muster",order_no:"A-1001",customer:"Muster AG",object:o,archived:false,status:"aktiv"}];
  a2Zustand.seite="projekt";a2Zustand.projektId=1;a2Zustand.reg="uebersicht";
  const d=document.createElement("div");d.innerHTML=a2SeiteProjekt();
  const a=d.querySelector("[data-a2-navi]");
  return a?{href:a.getAttribute("href"),target:a.getAttribute("target"),rel:a.getAttribute("rel"),text:a.textContent.trim(),tag:a.tagName}:null;
 },obj);

 console.log("\nA · Adresse zusammensetzen und kodieren (rein)");
 const a=await page.evaluate(()=>{
  const u=o=>a2NavigationUrl({object:o});
  return {voll:u("Teststrasse 1, 3000 Bern"),umlaut:u("Bahnhofstrasse 12/3, 8001 Zürich & Co. #4"),
   leer:[u(""),u(null),u(undefined),u("   "),u("—"),u("?"),u("12345"),u("ab"),u("..."),u(" \n ")],
   nurStrasse:u("Teststrasse 1"),nurOrt:u("Bern"),mehrfach:u("  Teststrasse   1 ,   Bern  "),
   keinObj:a2NavigationUrl(null),keinFeld:a2NavigationUrl({name:"X"}),zahlObj:a2NavigationUrl({object:12345})};
 });
 p(a.voll==="https://www.google.com/maps/dir/?api=1&destination=Teststrasse%201%2C%203000%20Bern","Vollständige Adresse: exakte Google-Maps-Dir-URL, Komma und Leerzeichen kodiert",a.voll);
 const parse=await page.evaluate(u=>{const x=new URL(u);return {host:x.host,pfad:x.pathname,api:x.searchParams.get("api"),dest:x.searchParams.get("destination"),n:[...x.searchParams.keys()].join()}},a.umlaut);
 p(parse.host==="www.google.com"&&parse.pfad==="/maps/dir/"&&parse.api==="1"&&parse.n==="api,destination"&&parse.dest==="Bahnhofstrasse 12/3, 8001 Zürich & Co. #4","Umlaute, Schrägstrich, Komma, &, # und Punkt: gültige URL, destination kommt unverändert zurück",parse);
 p(!/[ &#]/.test(a.umlaut.split("destination=")[1])&&/%C3%BC/.test(a.umlaut)&&/%2F/.test(a.umlaut)&&/%26/.test(a.umlaut)&&/%23/.test(a.umlaut),"Im destination-Teil steht kein rohes Leerzeichen, & oder #; ü, / & # sind kodiert",a.umlaut);
 p(a.leer.every(x=>x==="")&&a.keinObj===""&&a.keinFeld===""&&a.zahlObj==="","Fehlende oder unbrauchbare Adresse (leer, null, Leerzeichen, „—“, „?“, nur Ziffern, zu kurz): kein Link",a.leer);
 p(a.nurStrasse.endsWith("destination=Teststrasse%201")&&a.nurOrt.endsWith("destination=Bern"),"Nur Strasse oder nur Ort: weiterhin ein gültiger Link (kein leerer Parameter)",[a.nurStrasse,a.nurOrt]);
 p(a.mehrfach.endsWith("destination=Teststrasse%201%20%2C%20Bern"),"Mehrfache Leerzeichen werden zu einem",a.mehrfach);

 console.log("\nB · Projektseite");
 const m=await seite("Teststrasse 1, 3000 Bern");
 p(m&&m.tag==="A"&&m.text==="Navigation starten"&&m.href==="https://www.google.com/maps/dir/?api=1&destination=Teststrasse%201%2C%203000%20Bern","Projekt mit Adresse: Schaltfläche „Navigation starten“ mit dem Maps-Link",m);
 p(m&&m.target==="_blank"&&/noopener/.test(m.rel)&&/noreferrer/.test(m.rel),"Öffnet in neuem Tab, mit noopener noreferrer",m);
 for(const leer of ["","  ","—",null,"12345"]){
  const x=await seite(leer);
  p(x===null,"Projekt ohne verwertbare Adresse ("+JSON.stringify(leer)+"): keine Schaltfläche, kein kaputter Link",x);
 }
 const xss=await seite('"><img src=x onerror=window.__xss=1>');
 const xssDom=await page.evaluate(()=>{const d=document.createElement("div");d.innerHTML=a2SeiteProjekt();return {img:!!d.querySelector("img[src=x]"),a:d.querySelector("[data-a2-navi]")&&d.querySelector("[data-a2-navi]").getAttribute("href")}});
 p(!xssDom.img&&/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=%22%3E%3Cimg/.test(xssDom.a||""),"Sonderzeichen im Adressfeld brechen das HTML nicht (alles kodiert)",xssDom);

 console.log("\nC · Nur vorhandene Felder, nichts verändert, kein Standort");
 const vorher=await page.evaluate(()=>{
  allProjects=[{id:1,name:"Dach Muster",order_no:"A-1001",customer:"Strasse 99, Falschstadt",object:"Teststrasse 1, 3000 Bern",hinweis:"Hof 7, Anderswo",archived:false,status:"aktiv"}];
  const s=JSON.stringify(allProjects);
  a2Zustand.seite="projekt";a2Zustand.projektId=1;a2Zustand.reg="uebersicht";
  const d=document.createElement("div");d.innerHTML=a2SeiteProjekt();
  const href=d.querySelector("[data-a2-navi]").getAttribute("href");
  return {gleich:JSON.stringify(allProjects)===s,dest:decodeURIComponent(href.split("destination=")[1]),geo:window.__geo};
 });
 p(vorher.dest==="Teststrasse 1, 3000 Bern","Ziel stammt nur aus dem Feld „Adresse“ (object) – nicht aus Auftraggeber, Hinweis oder Name",vorher);
 p(vorher.gleich,"Projektdaten werden nicht verändert",vorher);
 const net=await page.evaluate(()=>{window.__fetch=0;const f=window.fetch;window.fetch=function(){window.__fetch++;return f.apply(this,arguments)};
  const d=document.createElement("div");d.innerHTML=a2SeiteProjekt();return {fetch:window.__fetch,geo:window.__geo}});
 p(net.fetch===0&&net.geo===0,"Das Anzeigen löst weder Netzzugriff noch Standortabfrage aus",net);
 const quelle=fs.readFileSync("js/70-ansicht2.js","utf8"),idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8");
 p(!/geolocation|maps\.googleapis|AIza|google\.maps\.|<iframe[^>]*maps/i.test(quelle),"Kein Standortzugriff, keine Maps-Platform, kein API-Schlüssel, keine Karte im Code");
 p(!/maps\.google|googleapis/.test(sw)&&!/maps\.google|googleapis/.test(idx),"index.html und sw.js bleiben ohne Google-Abhängigkeit (keine neue Datei nötig)");
 const reg=await page.evaluate(()=>{const d=document.createElement("div");d.innerHTML=a2SeiteProjekt();return {stamm:!!d.querySelector('[data-a2-tu="stammdaten"]'),adr:/Adresse/.test(d.textContent),projUebersicht:/Projektübersicht/.test(d.textContent)}});
 p(reg.stamm&&reg.adr&&reg.projUebersicht,"Bestehende Projektübersicht und „Stammdaten bearbeiten“ bleiben",reg);
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();
