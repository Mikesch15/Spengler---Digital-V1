// Prueft v3.337: Schnittbild in jedem Rüstblatt (wo welches Stück im Abschnitt liegt), abgehakte Stücke nicht im gemeinsamen Plan,
// Rollen für den gemeinsamen Zuschnitt separat wählbar.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ruestblatt-schnittbild-v3-337.js
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

 
console.log("\nA · Schnittbild in jedem Rüstblatt");
const bild=await page.evaluate(async()=>{
 const m=mk(21,"Süd",[{breite:400,stuecke:[500,700]},{breite:250,stuecke:[900]}]);
 const h=rbBlattHtml(m,{kopf:false,ausfuehrung:"ruesten"});
 const d=document.createElement("div");d.innerHTML=h;
 const f=[...d.querySelectorAll(".zu-bild")];
 return {figuren:f.length,rects:d.querySelectorAll(".zu-bild rect[fill='#dbe7f3'],.zu-bild rect[fill='#9fd3a8']").length,
  texte:[...d.querySelectorAll(".zu-bild text")].map(x=>x.textContent).sort().join(","),
  kopf:/Schnittbild/.test(h),capt:f.map(x=>x.querySelector("figcaption").textContent)};
});
p(bild.figuren>=1&&bild.kopf,"Einzel-Rüstblatt enthält das Schnittbild",bild);
p(bild.rects===3&&bild.texte==="1,1,2","jedes der 3 Stücke ist als Rechteck mit seiner Nummer drin",bild);
const eins=await page.evaluate(()=>{
 const m=mk(22,"Eins",[{breite:300,stuecke:[800]}]);
 return /zu-bild/.test(rbBlattHtml(m,{kopf:false,ausfuehrung:"ruesten"}));
});
p(eins,"auch bei nur einem Streifen/Stück gibt es das Schnittbild");
const proj=await page.evaluate(()=>{
 const l=[mk(31,"A",[{breite:250,stuecke:[500,500]}]),mk(32,"B",[{breite:250,stuecke:[700]}])];
 const h=pzuProjektRuestblattHtml(l).html;
 const d=document.createElement("div");d.innerHTML=h;
 return {bilder:d.querySelectorAll(".zu-bild").length,rects:d.querySelectorAll(".zu-bild rect[fill='#dbe7f3']").length};
});
p(proj.bilder>=1&&proj.rects===3,"Projekt-Rüstblatt: Schnittbild mit allen 3 offenen Stücken",proj);
const druckCss=await page.evaluate(async()=>{const h=await rbDokumentHtml([mk(41,"A",[{breite:250,stuecke:[500]}])]);return /\.zu-bild svg\{/.test(h)&&/zu-bild/.test(h)});
p(druckCss,"Druck enthält Schnittbild und Druck-Stil");

console.log("\nB · Abgehakte Stücke nicht im Plan");
const erl=await page.evaluate(()=>{
 const l=[mk(51,"A",[{breite:250,stuecke:[500,500]}]),mk(52,"B",[{breite:250,stuecke:[700,600]}])];
 zeCache.clear();zeGeladen.clear();
 zeCache.set(51,new Map([[1,{erledigt:true,laenge_mm:500,breite_mm:250}]]));
 zeCache.set(52,new Map([[2,{erledigt:true,laenge_mm:600,breite_mm:250}]]));
 const mit=pzuSammeln(l,{ohneErledigte:true}).materialien[0];
 const ohne=pzuSammeln(l).materialien[0];
 const h=pzuProjektRuestblattHtml(l).html;
 const d=document.createElement("div");d.innerHTML=h;
 const imAbschnitt=d.querySelectorAll(".zu-abschnitt .ze-ok, .zu-abschnitt .zu-nr-ist.ze-ok").length;
 return {offen:mit.gruppen.reduce((z,g)=>z+g.stuecke.length,0),erledigt:mit.erledigt.map(x=>x.quelleId+"#"+x.origNr).sort(),
  ohneOpt:ohne.gruppen.reduce((z,g)=>z+g.stuecke.length,0),imAbschnitt,
  block:/Bereits zugeschnitten/.test(h),stand:/Bereits abgehakt: <b>2 von 4<\/b>/.test(h),
  gruen:d.querySelectorAll(".zu-bild rect[fill='#9fd3a8']").length,blau:d.querySelectorAll(".zu-bild rect[fill='#dbe7f3']").length,
  nummern:[...d.querySelectorAll(".zu-abschnitt .zu-nr-ist")].map(x=>x.textContent).length};
});
p(erl.offen===2&&JSON.stringify(erl.erledigt)==='["51#1","52#2"]',"die 2 abgehakten Stücke sind nicht im Plan (2 offen), stehen in der Erledigt-Liste",erl);
p(erl.ohneOpt===4,"Gegenprobe: ohne Option bleiben alle 4 im Plan",erl);
p(erl.imAbschnitt===0&&erl.gruen===0&&erl.blau===2,"kein Abschnitt und kein Schnittbild mischt abgehakte und offene Stücke",erl);
p(erl.block&&erl.stand,"Block „Bereits zugeschnitten“ und Stand 2 von 4 (nicht mehr im Plan)");
const alle=await page.evaluate(()=>{
 const l=[mk(61,"A",[{breite:250,stuecke:[500]}])];
 zeCache.clear();zeGeladen.clear();
 zeCache.set(61,new Map([[1,{erledigt:true,laenge_mm:500,breite_mm:250}]]));
 const r=pzuProjektRuestblattHtml(l);
 return {gruppen:r.gruppen,t:/Alle Stücke dieser Gruppe sind bereits abgehakt/.test(r.html),fehler:/passt keine hinterlegte Rolle/.test(r.html)};
});
p(alle.gruppen===1&&alle.t&&!alle.fehler,"sind alle Stücke abgehakt: klare Meldung statt Fehlermeldung",alle);
const einzel=await page.evaluate(()=>{
 const m=mk(71,"A",[{breite:250,stuecke:[500,500]}]);
 zeCache.clear();zeGeladen.clear();
 zeCache.set(71,new Map([[1,{erledigt:true,laenge_mm:500,breite_mm:250}]]));
 const d=document.createElement("div");d.innerHTML=rbBlattHtml(m,{kopf:false,ausfuehrung:"ruesten"});
 return {gruen:d.querySelectorAll(".zu-bild rect[fill='#9fd3a8']").length};
});
p(einzel.gruen===1,"Einzel-Rüstblatt: abgehaktes Stück im Schnittbild grün (Plan der Massaufnahme bleibt, wie gespeichert)",einzel);

console.log("\nC · Rollen für den gemeinsamen Zuschnitt separat wählen");
const ro=await page.evaluate(()=>{
 const A=mk(81,"A",[{breite:250,stuecke:[500]}],{auswahl:[670]}), B=mk(82,"B",[{breite:250,stuecke:[500]}],{auswahl:[1000]});
 zeCache.clear();zeGeladen.clear();
 const eigen=pzuSammeln([A,B]).materialien.length;
 const ovr=pzuSammeln([A,B],{rollen:[670,1000]}).materialien;
 const M=ovr[0];
 return {eigen,ovr:ovr.length,formate:pzuRollenPlan(M).formate.map(f=>f.breite).sort((a,b)=>a-b),name:M.material,
  nur670:pzuRollenPlan(pzuSammeln([A,B],{rollen:[670]}).materialien[0]).formate.map(f=>f.breite)};
});
p(ro.eigen===2&&ro.ovr===1,"ohne eigene Wahl zwei Gruppen (Wahl je Massaufnahme), mit gemeinsamer Wahl eine",ro);
p(JSON.stringify(ro.formate)==="[670,1000]"&&JSON.stringify(ro.nur670)==="[670]","gerechnet wird mit genau den gewählten Rollen (beide bzw. nur 670)",ro);
const ui=await page.evaluate(async()=>{
 const A=mk(91,"A",[{breite:250,stuecke:[500]}]), B=mk(92,"B",[{breite:250,stuecke:[700]}]);
 A.data.rollen.auswahl=[670,1000];B.data.rollen.auswahl=[670,1000];
 zeCache.clear();zeGeladen.clear();
 const alt=sb.from;
 sb.from=(t)=>t==="measurements"?{select:()=>({in:async()=>({data:[A,B],error:null})})}:alt(t);
 await rbProjektOeffnen([A,B],{projectId:7});
 sb.from=alt;
 const cbs=[...document.querySelectorAll("#ruestblattBody [data-rbp-rolle]")];
 const vor=cbs.map(c=>c.dataset.rbpRolle+":"+c.checked).join(",");
 const c1000=cbs.find(c=>c.dataset.rbpRolle==="1000");
 c1000.checked=false;c1000.dispatchEvent(new Event("change",{bubbles:true}));
 const nach=rbProjektModus.rollen;
 const t=document.getElementById("ruestblattBody").textContent.replace(/\s+/g," ");
 return {vor,nach,t:/eigene Wahl für dieses Blatt/.test(t),nurEine:/Rolle: 670 mm/.test(t)||/670/.test(t),zuruck:!!document.querySelector("[data-rbp-rollen-eigene]"),
  anzahl:cbs.length};
});
p(ui.anzahl>=2&&/670:true/.test(ui.vor)&&/1000:true/.test(ui.vor),"Rollen-Auswahl im Projekt-Rüstblatt: Rollen des Lagers als Checkboxen, vorbelegt mit der Wahl der Massaufnahmen",ui);
p(JSON.stringify(ui.nach)==="[670]"&&ui.t&&ui.zuruck,"Rolle abwählen: gemeinsamer Zuschnitt nur noch mit 670 mm, Knopf zurück zur Wahl der Massaufnahmen",ui);
const druckR=await page.evaluate(()=>{
 let ruf=null;const alt=window.rbDruckenAufnahmen;
 window.rbDruckenAufnahmen=async(l,o)=>{ruf=o.gemeinsamFn(l)};
 document.getElementById("ruestblattDrucken").click();
 window.rbDruckenAufnahmen=alt;
 return {ok:typeof ruf==="string"&&ruf.length>0,nur670:/Rollen 670 mm/.test(String(ruf))};
});
p(druckR.ok&&druckR.nur670,"Druck nimmt die gewählten Rollen mit",druckR);
const log=await page.evaluate(()=>window.__log);
p(log.length===0,"nichts wird geschrieben",log);
p(jsFehler.length===0,"keine JS-Fehler",jsFehler);
await br.close();
console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
process.exit(fail?1:0);
})();
