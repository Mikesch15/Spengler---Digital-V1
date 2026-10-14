// v3.359: Einheitliches Erscheinungsbild für alle Seiten (nur Darstellung): ruhiger Grund, flache Karten,
// lesbare Beschriftungen, grosse Eingabefelder, ruhige Knöpfe; Tabellenfelder bleiben kompakt; kein Überlaufen.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:844},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  allProfiles=[currentProfile];meineRechte={admin:true};companyName="Muster AG";
  allProjects=window.__demo.projects.slice();
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  if(typeof pmUebernehmen==="function")pmUebernehmen({haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true,vorlagen:true,serien:true,versionierung:true});
  a2Zeichnen();
 });
 await page.waitForTimeout(500);

 console.log("\nA · Grund, Karten, Beschriftungen, Felder, Knöpfe");
 const a=await page.evaluate(()=>{
  const t=document.createElement("div");t.id="dsTest";t.className="modal";t.hidden=false;t.style.position="static";
  t.innerHTML='<div class="card"><h2>Titel</h2><label>Beschriftung</label><input id="dsIn"><select id="dsSel"><option>a</option></select><textarea id="dsTa"></textarea>'+
   '<div class="bar"><button class="blue" id="dsB">Blau</button><button class="gray" id="dsG">Grau</button><button class="red" id="dsR">Rot</button></div>'+
   '<table><tbody><tr><td><input id="dsTdIn"></td></tr></tbody></table></div>';
  document.body.appendChild(t);
  const cs=(id,pr)=>getComputedStyle(document.getElementById(id))[pr];
  const q=s=>getComputedStyle(t.querySelector(s));
  const r={bodyBild:getComputedStyle(document.body).backgroundImage,bodyFarbe:getComputedStyle(document.body).backgroundColor,
   modalBild:getComputedStyle(t).backgroundImage,
   kartenRadius:parseFloat(q(".card").borderRadius),kartenSchatten:q(".card").boxShadow,
   labelCase:q("label").textTransform,labelGroesse:parseFloat(q("label").fontSize),
   inH:parseFloat(cs("dsIn","minHeight")),inR:parseFloat(cs("dsIn","borderRadius")),inF:parseFloat(cs("dsIn","fontSize")),
   selH:parseFloat(cs("dsSel","minHeight")),taH:parseFloat(cs("dsTa","minHeight")),
   tdH:parseFloat(cs("dsTdIn","minHeight")),
   grauRand:cs("dsG","borderTopWidth"),grauRadius:parseFloat(cs("dsG","borderRadius")),blauSchatten:cs("dsB","boxShadow"),roteRadius:parseFloat(cs("dsR","borderRadius"))};
  t.remove();
  return r;
 });
 p(a.bodyBild==="none"&&a.modalBild==="none","ruhiger flacher Grund (kein Blaugrau-Verlauf) auf Seite und Fenstern",[a.bodyBild.slice(0,40),a.modalBild.slice(0,40)]);
 p(a.kartenRadius<=12&&(a.kartenSchatten==="none"||a.kartenSchatten===""),"Karten flach (Rundung ≤ 12px, kein Schatten)",[a.kartenRadius,a.kartenSchatten]);
 p(a.inH===40&&a.inF===14&&a.tdH<=36,"Feldgrössen der Formulare bleiben unberührt (früherer Entscheid), Tabellenfelder kompakt",[a.inH,a.inF,a.tdH]);
 p(a.grauRand==="1px"&&a.blauSchatten==="none"&&a.grauRadius>=10&&a.roteRadius>=10,"Knöpfe ruhig (grau mit Rand, blau ohne Schatten, Rundung ≥ 10px)",a);

 console.log("\nB · Seiten ohne Überlaufen (390/768/1280 px)");
 for(const w of [390,768,1280]){
  await page.setViewportSize({width:w,height:900});
  const o=await page.evaluate(async()=>{
   const r={};
   const messe=(n)=>{r[n]=document.documentElement.scrollWidth<=document.documentElement.clientWidth+1};
   a2Zustand.seite="heute";a2Zeichnen();messe("heute");
   a2Zustand.seite="projekte";a2Zeichnen();messe("projekte");
   a2Zustand.seite="mehr";a2Zeichnen();messe("mehr");
   const pr=allProjects[0];
   for(const reg of ["uebersicht","offerte","aufmass","herstellung","ausmass","rapport","dateien"]){
    a2Zustand.seite="projekt";a2Zustand.projektId=pr.id;a2Zustand.reg=reg;cockpitProjectId=pr.id;a2Zeichnen();messe("reg_"+reg);
   }
   a2Zustand.seite="heute";a2Zeichnen();
   return r;
  });
  p(Object.values(o).every(x=>x),"Breite "+w+": alle Seiten ohne horizontales Überlaufen",Object.keys(o).filter(k=>!o[k]));
 }

 console.log("\nC · Dunkelmodus");
 const d=await page.evaluate(()=>{
  document.documentElement.classList.add("dark");
  const r={bg:getComputedStyle(document.body).backgroundColor,karte:""};
  const t=document.createElement("div");t.className="card";document.body.appendChild(t);
  r.karte=getComputedStyle(t).backgroundColor;t.remove();
  document.documentElement.classList.remove("dark");
  return r;
 });
 const hell=s=>{const m=/rgba?\((\d+), (\d+), (\d+)/.exec(s);return m?(+m[1]+ +m[2]+ +m[3])/3:255};
 p(hell(d.bg)<80&&hell(d.karte)<90,"Dunkelmodus: Grund und Karten bleiben dunkel",d);
 p(fehler.length===0,"keine JS-Fehler",fehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();
