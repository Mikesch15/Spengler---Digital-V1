// v3.416: Rinne halbrund - ein Einhaengestutzen hat keine Naht: das Rinnenstueck laeuft durch.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,600):""))}};
const INIT=()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};['select','eq','order','limit','in'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{window.appAlert=async()=>{};
  rinneFittingTypes=[{id:1,symbol:"AE90",name:"Aussenwinkel",is_fixpunkt:true,is_schiebestutzen:false,angle_deg:-90,mass_mm:20},
   {id:2,symbol:"ABL",name:"Einhängestutzen",is_fixpunkt:true,is_schiebestutzen:false,angle_deg:0,mass_mm:10},
   {id:3,symbol:"SS",name:"Schiebestutzen",is_fixpunkt:false,is_schiebestutzen:true,angle_deg:0,mass_mm:5}];
  window.RS=(l1,r1,l2,w)=>[{laenge:l1,winkel:w||0,linksTyp:"",rechtsTyp:r1},{laenge:l2,winkel:0,linksTyp:"",rechtsTyp:""}];
  window.ST=(segs)=>{const d=calcRinneDilas(segs,"3");return {d,s:berechneRinneStueckliste(segs,d.dilas,d.boundaries,0)}};
 });
 const ev=(f,...a)=>page.evaluate(f,...a);
 console.log("\nA · Stückliste");
 let r=await ev(()=>{const x=ST(RS(2000,2,2500));return {n:x.s.length,z:x.s.map(q=>Math.round(q.zuschnitt)).join(),fix:x.d.boundaries[1]&&x.d.boundaries[1].typ,dl:x.d.boundaries[1]&&x.d.boundaries[1].durchlaufend}});
 p(r.n===1&&r.z==="4500"&&r.fix==="fix"&&r.dl===true,"Einhängestutzen: ein durchlaufendes Stück 2000 + 2500 = 4500, ohne Zuschlag; er bleibt Fixpunkt",r);
 r=await ev(()=>{const x=ST(RS(2000,1,2500,-90));return {n:x.s.length,dl:x.d.boundaries[1].durchlaufend}});
 p(r.n===2&&!r.dl,"Ecke (Aussenwinkel) trennt weiterhin: 2 Stücke",r);
 r=await ev(()=>{const x=ST(RS(2000,3,2500));return {n:x.s.length,dl:x.d.boundaries[1].durchlaufend}});
 p(r.n===2&&!r.dl,"Schiebestutzen trennt weiterhin: 2 Stücke",r);
 r=await ev(()=>{const s=RS(2000,2,2500);s[1].linksTyp=1;const x=ST(s);return {n:x.s.length,dl:x.d.boundaries[1].durchlaufend}});
 p(r.n===2&&!r.dl,"Einhängestutzen zusammen mit einer Ecke an derselben Grenze: Naht bleibt",r);
 r=await ev(()=>{const s=[{laenge:2000,winkel:0,linksTyp:"",rechtsTyp:2},{laenge:1500,winkel:0,linksTyp:2,rechtsTyp:2},{laenge:1500,winkel:0,linksTyp:"",rechtsTyp:""}];const x=ST(s);return {n:x.s.length,z:x.s.map(q=>Math.round(q.zuschnitt)).join()}});
 p(r.n===1&&r.z==="5000","Zwei Einhängestutzen hintereinander: ein einziges Stück 5000",r);
 r=await ev(()=>{const x=ST(RS(2000,2,2500));return {von:x.s[0].von,bis:x.s[0].bis}});
 p(r.von==="Start"&&r.bis==="Ende","Stück läuft von Start bis Ende",r);
 console.log("\nB · Grundriss und Zuschnitt");
 r=await ev(()=>{const g=segs=>{const x=ST(segs);const h=generateRinneGrundriss(segs,x.d.dilas,x.d.boundaries);return (h.match(/r="9" fill="#1769aa"/g)||[]).length};return {durch:g(RS(2000,2,2500)),ecke:g(RS(2000,1,2500,-90))}});
 p(r.durch===1&&r.ecke===2,"Grundriss nummeriert wie die Stückliste: 1 Positionsnummer bei Einhängestutzen, 2 bei Ecke",r);
 r=await ev(()=>{rinneNormlaengen={"3|330":[6000]};rinneA.material="3";rinneA.groesse="330";rinneA.normlaengenAuswahl=[];rinneHalbrundSettings={naht_ueberlappung:30};
  rinneA.segmente=[{laenge:3500,winkel:0,linksTyp:"",rechtsTyp:"",stutzen:{art:"einhaenge"}},{laenge:3500,winkel:0,linksTyp:"",rechtsTyp:"",stutzen:null}];rinneA.dilasManuell=[];rinneA.rinnenboden={links:false,rechts:false};
  const t=raTeile(rinneA);return t.map(x=>x.label+":"+x.laenge).join(" ")+"|"+raStueckliste(rinneA).length});
 p(r==="1a:3515 1b:3515|1","Das durchlaufende Stück (7000) wird wie jedes zu lange Stück geteilt – die Nahtüberlappung gilt nur dort",r);
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();
