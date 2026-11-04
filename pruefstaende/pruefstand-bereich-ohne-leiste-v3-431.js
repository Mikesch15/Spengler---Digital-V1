// v3.431: Gemeldet (Foto): "Archiv und Filter" steht mit leerem Streifen links und wird rechts abgeschnitten.
// Ursache: ab 1000 px Breite rueckt css/05 die Bereiche um die Seitenleiste (226 px) nach rechts - auch wenn die Leiste
// gar nicht da ist. Jetzt nur noch, wenn sie da ist (Klasse a2-leiste-da). Geprueft: breit mit/ohne Leiste, schmal.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const IDS=["werkstattModal","settingsModal","globalSearchModal","feedbackModal","adminMeasModal","systemAdminModal","matZuModal","projectCockpitModal","projectsModal"];
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 for(const W of [412,1100]){
  const page=await b.newPage({viewport:{width:W,height:900},locale:"de-CH"});
  const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));
  await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
  await page.goto("file://"+path.join(process.cwd(),"index.html"),{waitUntil:"load"});await page.waitForTimeout(600);
  await page.evaluate(()=>{currentProfile={id:"u1",role:"admin",first_name:"A",last_name:"B",company_id:"c1"};allProfiles=[currentProfile];meineRechte={admin:true};allProjects=window.__demo.projects.slice();
   $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;a2Zeichnen()});
  const links=async(leiste)=>page.evaluate(([ids,leiste])=>{
   document.documentElement.classList.add("a2-an");document.documentElement.classList.toggle("a2-leiste-da",leiste);
   const o={};ids.forEach(id=>{document.querySelectorAll(".modal").forEach(m=>m.hidden=true);const m=document.getElementById(id);m.hidden=false;o[id]=Math.round(m.getBoundingClientRect().left)});
   document.querySelectorAll(".modal").forEach(m=>m.hidden=true);return o},[IDS,leiste]);
  const mit=await links(true), ohne=await links(false);
  if(W>=1000){
   p(IDS.every(i=>mit[i]===226),"Breit, Leiste da: alle neun Bereiche beginnen rechts neben der Leiste (226)",mit);
   p(IDS.every(i=>ohne[i]===0),"Breit, Leiste NICHT da: alle neun Bereiche beginnen ganz links (kein leerer Streifen)",ohne);
  }else{
   p(IDS.every(i=>mit[i]===0&&ohne[i]===0),"Schmal (Handy): alle neun Bereiche beginnen ganz links",{mit,ohne});
  }
  p(fehler.length===0,"Keine Seitenfehler (W="+W+")",fehler);
  await page.close();
 }
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);if(fail)console.log("FEHLGESCHLAGEN: insgesamt "+fail);process.exit(fail?1:0);
})();
