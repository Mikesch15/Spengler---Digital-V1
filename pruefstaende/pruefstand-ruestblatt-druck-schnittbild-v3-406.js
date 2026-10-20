// v3.406: Rüstblatt drucken – die grafische Rolleneinteilung (Schnittbild) lässt sich beim Drucken wählen.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const INIT=()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};['select','eq','order','limit','in'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(500);
 const ev=(f,...a)=>page.evaluate(f,...a);
 const lauf=(antwort,html)=>ev(async([a,h])=>{
  window.__fragen=[];appConfirm=async(t,o)=>{__fragen.push({t,o});return a};appAlert=async()=>{};
  rbFrischLesen=async()=>{};rbFinde=id=>({id,project_id:1,type:"kehle"});zeLaden=async()=>{};
  rbDokumentHtml=async()=>h;
  await rbDruckenAufnahmen([{id:5}]);
  const fr=document.getElementById("rbDruckRahmen");const src=fr?fr.srcdoc:null;if(fr)fr.remove();   // vor dem Laden entfernt: es wird nicht wirklich gedruckt
  return {src,fragen:__fragen};
 },[antwort,html]);
 const MIT='<!doctype html><html><head><meta charset="utf-8"><style>.x{}</style></head><body><div class="rb-druck-seite"><div class="zu-bilder"><div class="zu-bilder-kopf">Schnittbild</div></div><div class="zu-liste">Liste</div></div></body></html>';
 const OHNE='<!doctype html><html><head><meta charset="utf-8"></head><body><div class="rb-druck-seite"><div class="zu-liste">Liste</div></div></body></html>';
 let r=await lauf(true,MIT);
 p(r.fragen.length===1&&/grafische Rolleneinteilung/.test(r.fragen[0].t)&&/Schnittbild/.test(r.fragen[0].t),"Vor dem Drucken wird gefragt, ob die grafische Rolleneinteilung mitgedruckt werden soll",r.fragen);
 p(r.fragen[0].o&&r.fragen[0].o.ok==="Mit Rolleneinteilung"&&r.fragen[0].o.abbrechen==="Ohne","Die Knöpfe heissen «Mit Rolleneinteilung» und «Ohne»",r.fragen[0].o);
 p(r.src&&/class="zu-bilder"/.test(r.src)&&!/display:none !important/.test(r.src),"«Mit»: das Schnittbild bleibt im Druck, nichts wird ausgeblendet");
 r=await lauf(false,MIT);
 p(r.src&&/<style>\.zu-bilder\{display:none !important\}<\/style><\/head>/.test(r.src),"«Ohne»: das Schnittbild wird im Druckdokument ausgeblendet (Liste bleibt)",r.src&&r.src.slice(0,300));
 p(/Liste/.test(r.src),"Die Zuschnittliste bleibt in beiden Fällen");
 r=await lauf(false,OHNE);
 p(r.fragen.length===0&&r.src&&!/display:none/.test(r.src),"Ohne Schnittbild im Blatt wird nicht gefragt",r.fragen);
 const src=f=>fs.readFileSync(f,"utf8");
 p(/rbDruckenAufnahmen\(eintraege/.test(src("js/58-ruestliste.js"))&&/rbDruckenAufnahmen\(rbProjektModus/.test(src("js/80-ruestblatt.js"))&&/rbDruckenAufnahmen\(\[m\]\)/.test(src("js/80-ruestblatt.js")),"Einzel-Rüstblatt, Projekt-Rüstblatt und Rüstliste drucken über dieselbe Funktion – die Frage gilt überall");
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();
