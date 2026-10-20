// v3.407: Rüstblatt/Rüstliste – bei einem Streifen je Abschnitt steht die kompakte, gruppierte Liste (wie in der Massaufnahme).
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
 const liste=(plan,opt)=>ev(([pl,o])=>{const p=zuPlanAusGespeichert(pl.r,pl.breite,"Segment");const d=document.createElement("div");d.innerHTML=zuListeHtml(p,o);
  const norm=t=>t.replace(/[’  ]/g,"'").replace(/\s+/g," ").trim();
  return {abschnitte:d.querySelectorAll(".zu-abschnitt").length,zeilen:d.querySelectorAll(".zu-zeile").length,text:norm(d.textContent),nr:d.querySelectorAll(".zu-nr").length,kopf:norm((d.querySelector(".zu-liste-kopf")||{}).textContent||""),fuss:norm((d.querySelector(".zu-liste-fuss")||{}).textContent||"")}},[plan,opt]);
 const stuecke=[];let nr=0;
 const streifen=[];
 for(let i=0;i<12;i++){nr++;streifen.push({rest:0,stuecke:[{nr,laenge:2351,breite:349}],abschnittNr:nr,abschnittLaenge:2351})}
 for(let i=0;i<34;i++){nr++;streifen.push({rest:0,stuecke:[{nr,laenge:2247,breite:349}],abschnittNr:nr,abschnittLaenge:i===0?2247:2247})}
 const PLAN1={breite:349,r:{abwicklung:349,abschnitte:46,moeglich:[{breite:400,laenge:null,teile:[{n:12,laenge:2351},{n:34,laenge:2247}]}],gruppen:[{breite:349,abschnitte:46,abschnittLaenge:2351,jeAbschnitt:1,streifen}]}};
 let r=await liste(PLAN1,{herkunft:true});
 p(r.abschnitte===0&&r.zeilen===2&&r.nr===46,"Ein Streifen je Abschnitt (wie im Beispiel 12 × 2'351 und 34 × 2'247 × 349): gruppierte Liste mit 2 Zeilen und den 46 Nummern, keine 46 Abschnitte",r);
 p(/12 × 2'351 × 349 mm/.test(r.text)&&/34 × 2'247 × 349 mm/.test(r.text),"Die Zeilen lauten «12 × 2'351 × 349 mm» und «34 × 2'247 × 349 mm» wie in der Massaufnahme",r.text.slice(0,200));
 p(/Segment/.test(r.text),"Die Nummern stehen unter der Einheit (Segment/Stück) wie in der Massaufnahme",r.text.slice(0,100));
 const PLAN2={breite:300,r:{abwicklung:300,abschnitte:1,moeglich:[{breite:1000,laenge:null,teile:[{n:1,laenge:2000}]}],gruppen:[{breite:300,abschnitte:1,abschnittLaenge:2000,jeAbschnitt:2,streifen:[{rest:0,abschnittNr:1,abschnittLaenge:2000,stuecke:[{nr:1,laenge:2000}]},{rest:0,abschnittNr:1,abschnittLaenge:2000,stuecke:[{nr:2,laenge:2000}]}]}]}};
 r=await liste(PLAN2,{herkunft:true});
 p(r.abschnitte>=1,"Liegen Stücke nebeneinander auf der Rolle (mehrere Streifen je Abschnitt), bleibt die Aufteilung nach Abschnitt und Streifen",r);
 const PLAN3={breite:300,r:{abwicklung:300,abschnitte:1,moeglich:[{breite:1000,laenge:null,teile:[{n:1,laenge:2000}]}],gruppen:[{breite:300,abschnitte:1,abschnittLaenge:2000,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]},{rest:0,stuecke:[{nr:2,laenge:2000}]}]}]}};
 r=await liste(PLAN3,{herkunft:true});
 p(r.abschnitte>=1,"Ältere Pläne ohne Angabe «je Abschnitt» behalten die bisherige Aufteilung (sicherer Rückfall)",r);
 r=await liste(PLAN1,undefined);
 p(r.abschnitte===0&&r.zeilen===2,"Ohne Herkunftsansicht (Material-Seite, Werkstatt) unverändert gruppiert",r);
 r=await ev(()=>{const p=zuPlanAusGespeichert({abwicklung:349,abschnitte:3,moeglich:[{breite:400,laenge:null,teile:[{n:3,laenge:1000}]}],gruppen:[{breite:349,abschnitte:3,abschnittLaenge:1000,jeAbschnitt:1,streifen:[1,2,3].map(n=>({rest:0,stuecke:[{nr:n,laenge:1000,breite:349}],abschnittNr:n,abschnittLaenge:1000}))}]},349,"Stück");
  const m={id:5,type:"einfassung_rund",title:"T",data:{rollen:null}};return {nötig:zuHerkunftNoetig(p)}});
 p(r["nötig"]===false,"zuHerkunftNoetig: ein Streifen je Abschnitt → nicht nötig",r);
 const src=f=>fs.readFileSync(f,"utf8");
 p(/zuListeHtml\(plan,\{herkunft:true\}\)/.test(src("js/80-ruestblatt.js")),"Das Rüstblatt (und damit die Rüstliste) nutzt zuListeHtml mit Herkunftsansicht");
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();
