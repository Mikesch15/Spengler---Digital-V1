// Prueft v3.346: Geltende Offerten (angebote.gilt) - auswaehlbar, mehrere werden getrennt angezeigt, nie addiert.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-offerte-gilt-v3-346.js
// Prueft v3.343: Dashboard-Stil der Projektuebersicht (Material- und Mengenuebersicht), Register Ruestblatt inline mit Rollenband, Summenleiste.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-cockpit-dashboard-v3-343.js
// Prueft v3.341: Komplettausmass (js/85) - rein lesende Uebersicht aus den Massaufnahmen eines Projekts.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-komplettausmass-v3-341.js
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,420):""))}};
// ---- Browser ----
const STUB=`window.__log=[];window.__proj=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({createSignedUrl:async(x)=>({data:{signedUrl:"https://t/"+x},error:null})})},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>{const z={t,eqs:[]};const q={};
  q.insert=d=>{z.op="insert";z.d=d;return q};q.update=d=>{z.op="update";z.d=d;return q};
  q.upsert=d=>{z.op="upsert";z.d=d;return q};q.delete=()=>{z.op="delete";return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  q.eq=(f,v)=>{z.eqs.push([f,v]);return q};
  ["order","limit","not","is","range","ilike","in"].forEach(k=>{q[k]=()=>q});
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  const lauf=()=>{
   if(z.op&&z.op!=="select"){window.__log.push({t,op:z.op,d:z.d,eqs:z.eqs});return {data:[Object.assign({id:(z.eqs.find(e=>e[0]==="id")||[])[1]||1},z.d)],error:null}}
   return {data:[],error:null}};
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g);return q}})};`;
const BROWSER_DUMMY=0;
(async()=>{
 const br=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await br.newPage({viewport:{width:1100,height:1400}});
 const jsFehler=[];page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 const dialoge=[];page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto("file://"+path.join(process.cwd(),"index.html"),{waitUntil:"load"});
 await page.waitForTimeout(500);
 // Fixtures: gespeicherte Plaene mit der echten Packrechnung erzeugen
 await page.evaluate(()=>{
  window.mk=(id,titel,gruppen,opt)=>{
   const o=opt||{};
   const rollen=[250,330,670,1000];
   const fm=(o.form==="tafel")?[{breite:1000,laenge:2000,text:"2000 × 1000 mm"}]:rollen.map(b=>({breite:b,laenge:null,text:b+" mm"}));
   const gr=gruppen.map(g=>({breite:g.breite,bleche:g.stuecke.map((l,i)=>({nr:g.nrs?g.nrs[i]:i+1,laenge:l}))}));
   const netto=gr.reduce((s,g)=>s+g.breite*g.bleche.reduce((x,y)=>x+y.laenge,0),0)/1e6;
   const pl=ebaFormatPlan({gruppen:gr,formate:fm,form:o.form||"rolle",netto});
   const roh=JSON.parse(JSON.stringify(Object.assign({},pl,{auswahl:o.auswahl||[],breiten:rollen,form:o.form||"rolle"})));
   roh.gruppen.forEach(g=>{delete g.bleche;(g.streifen||[]).forEach(st=>(st.stuecke||[]).forEach(x=>{if(!x.breite)x.breite=g.breite}))});
   return {id,project_id:7,type:o.type||"kehle",title:titel,workflow_status:"in_bearbeitung",staerke_mm:o.staerke===undefined?0.7:o.staerke,data:{material:o.material||"2",rollen:roh}};
  };
  measurementMaterials=[{id:1,name:"Kupfer"},{id:2,name:"Titanzink"}];
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"A"};meineRechte={admin:true};
  allProjects=[{id:7,name:"P7",archived:false,zuschnitt_ausschluss:[]},{id:8,name:"P8",archived:false}];
  cockpitProjectId=7;
  window.pmAktiv=()=>true;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  window.alleStuecke=sammel=>{const l=[];pzuSammeln(sammel).materialien.forEach(M=>M.gruppen.forEach(g=>g.stuecke.forEach(x=>l.push(x.quelleId+"#"+x.origNr))));return l.sort()};
 });
 const setze=(liste,ausschluss)=>page.evaluate(([l,a])=>{
  projectMeasurementsCache=l;
  allProjects[0].zuschnitt_ausschluss=a||[];
  window.__log=[];
  renderProjektZuschnitt();
 },[liste,ausschluss]);
 const ms=()=>page.evaluate(()=>[
  mk(11,"Süd",[{breite:400,stuecke:[500]}],{type:"kehle"}),
  mk(12,"Nord",[{breite:250,stuecke:[500,500]}],{type:"kamineinfassung"}),
  mk(13,"Ost",[{breite:300,stuecke:[800]}],{material:"1",type:"mauerabdeckung"})]);

 


const q63=fs.readFileSync("js/63-angebote.js","utf8");
const va=q63.indexOf("const ANG_MAT_STAERKE_MIN"), vb=q63.indexOf("// ---- Ende Offertposition Materialdaten");
const sbx={esc:s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")};
vm.runInNewContext(q63.slice(va,vb)+";this.G=angGeltende;this.K=angMengenKurz;this.H=angMengenHtml;this.A=angGiltHtml",sbx);
const L=[{id:1,name:"Kupfer"}];
const o=(id,t,q,g)=>Object.assign({id,title:t,date:"2026-01-0"+id,positions:[{pos:"1",description:"R",quantity:q,unit:"m2",material_id:1,staerke_mm:0.6}]},g===undefined?{}:{gilt:g});

console.log("\nA · Geltende Offerten (rein)");
p(sbx.G([o(1,"A",1),o(2,"B",1,false),o(3,"C",1,true)]).map(x=>x.id).join()==="1,3","angGeltende: nur ein ausdrückliches false schliesst aus (Standard: gilt)");
p(/2 geltende Offerten/.test(sbx.K([o(1,"A",5),o(2,"B",7)],L))&&/nicht addiert/.test(sbx.K([o(1,"A",5),o(2,"B",7)],L)),"zwei geltende: „je Offerte getrennt, nicht addiert“");
p(/Fläche 5\.00 m²/.test(sbx.K([o(1,"A",5),o(2,"B",7,false)],L))&&!/12\.00/.test(sbx.K([o(1,"A",5),o(2,"B",7,false)],L)),"eine geltende: nur ihre Summe, die abgewählte zählt nicht");
p(sbx.K([o(1,"A",5,false),o(2,"B",7,false)],L)==="keine Offerte als geltend markiert","keine geltend: ausdrücklicher Text, kein 0");
const h=sbx.H([o(1,"Offerte A",5),o(2,"Offerte B",7),o(3,"Offerte C",9,false)],L);
p(/Offerte A/.test(h)&&/Offerte B/.test(h)&&!/<b>Offerte C<\/b>/.test(h)&&/1 von 3 Offerten sind nicht als geltend markiert/.test(h)&&!/21\.00|12\.00/.test(h),"Karte: nur geltende, getrennt (je eigene Zeile), Hinweis auf die abgewählte, nie addiert",h.slice(0,300));
p(sbx.A([o(1,"A",1)])===""&&sbx.A([])==="","Auswahl erscheint erst ab zwei Offerten");
const ah=sbx.A([o(1,"A",1),o(2,"B",1,false)]);
p((ah.match(/data-ang-gilt/g)||[]).length===2&&/data-ang-gilt="1" checked/.test(ah)&&!/data-ang-gilt="2" checked/.test(ah),"Auswahl: Kontrollkästchen je Offerte, gesetzt nach gilt",ah.slice(0,260));

console.log("\nB · Auswahl speichern");
await page.evaluate(()=>{
 currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"A"};meineRechte={admin:true};
 allProjects=[{id:7,name:"P7",archived:false}];measurementMaterials=[{id:1,name:"Kupfer"}];
 $("appRoot").hidden=false;$("authScreen").hidden=true;cockpitProjectId=7;offerteZugriff=true;window.__alt=sb.from;
});
const w=await page.evaluate(async()=>{
 const ang=(id,t,q)=>({id,title:t,project_id:7,date:"2026-01-01",positions:[{pos:"1",description:"R",quantity:q,unit:"m2",material_id:1,staerke_mm:0.6}]});
 projectAngeboteCache=[ang(1,"Offerte A",48),ang(2,"Offerte B",30)];
 const box=document.createElement("div");box.id="cockpitAngeboteBody";document.body.appendChild(box);
 box.innerHTML=angGiltHtml(projectAngeboteCache);
 window.__log=[];
 const alt=sb.from;
 // 1) Erfolg
 const cb=box.querySelector('[data-ang-gilt="2"]');cb.checked=false;
 let ruf=[];
 sb.from=t=>t==="angebote"?{update:d=>({eq:(f,v)=>{ruf.push([d,f,v]);return {select:async()=>({data:[{id:v}],error:null})}}}),select:()=>({eq:()=>({order:async()=>({data:projectAngeboteCache,error:null})})})}:alt(t);
 cb.dispatchEvent(new Event("change",{bubbles:true}));
 await new Promise(r=>setTimeout(r,80));
 const erfolg={ruf:JSON.stringify(ruf),cache:projectAngeboteCache.map(a=>a.id+":"+a.gilt).join(),zeile:$("cockpitMengenStand")?$("cockpitMengenStand").textContent:""};
 // 2) RLS blockiert (0 Zeilen)
 const cb1=box.querySelector('[data-ang-gilt="1"]');cb1.checked=false;
 let alarm=null;const altA=window.appAlert;window.appAlert=t=>{alarm=t};
 sb.from=t=>t==="angebote"?{update:d=>({eq:()=>({select:async()=>({data:[],error:null})})})}:alt(t);
 cb1.dispatchEvent(new Event("change",{bubbles:true}));
 await new Promise(r=>setTimeout(r,80));
 const blockiert={zurueck:cb1.checked===true,alarm:!!alarm,cache:projectAngeboteCache.map(a=>a.id+":"+a.gilt).join()};
 window.appAlert=altA;sb.from=alt;
 return {erfolg,blockiert};
});
p(w.erfolg.ruf==='[[{"gilt":false},"id",2]]',"Abwählen schreibt genau {gilt:false} auf diese eine Offerte (eq id)",w.erfolg.ruf);
p(/^1:undefined,2:false$/.test(w.erfolg.cache),"Zwischenspeicher nach dem Speichern nachgeführt",w.erfolg.cache);
p(w.blockiert.zurueck&&w.blockiert.alarm&&/^1:undefined,2:false$/.test(w.blockiert.cache),"von RLS blockiert (0 Zeilen): Kästchen springt zurück, Meldung, Speicher unverändert",w.blockiert);
const wr=await page.evaluate(()=>window.__log);
p(wr.length===0,"keine weiteren Schreibzugriffe",wr);
const reg=await page.evaluate(()=>{
 const ang=(id,t,q,g)=>({id,title:t,positions:[{pos:"1",description:"R",quantity:q,unit:"m2",material_id:1,staerke_mm:0.6}],gilt:g});
 projectAngeboteCache=[ang(1,"Offerte A",48),ang(2,"Offerte B",30)];
 window.a2KnopfSichtbar=()=>true;
 const h=a2RegOfferte({id:7});
 return {auswahl:(h.match(/data-ang-gilt/g)||[]).length,mengen:/Offertmengen/.test(h)};
});
p(reg.auswahl===2&&reg.mengen,"Register Offerte der Ansicht: Auswahl der geltenden Offerten neben den Offertmengen",reg);
const q70=fs.readFileSync("js/70-ansicht2.js","utf8");
p(!/\.update\(|\.insert\(|\.upsert\(/.test(q70.replace(/\/\/.*$/gm,"")),"js/70 bleibt ohne Schreibweg (das Schreiben liegt in js/63)");
p(jsFehler.length===0,"keine JS-Fehler",jsFehler);
await br.close();
console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
process.exit(fail?1:0);
})();
