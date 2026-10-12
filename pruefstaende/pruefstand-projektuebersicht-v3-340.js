// Prueft v3.340: Projektuebersicht (Stand je Projekt in der Liste, Offertmengen-Zeile im Cockpit, "nicht erfasst" statt 0) und
// Projekt-Ruestblatt (Vorbelegung, fehlende Daten, Druck = Vorschau, Seiten je Gruppe).
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-projektuebersicht-v3-340.js
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
const q63=fs.readFileSync("js/63-angebote.js","utf8");
const va=q63.indexOf("const ANG_MAT_STAERKE_MIN"), vb=q63.indexOf("// ---- Ende Offertposition Materialdaten");
const sbx={esc:s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")};
vm.runInNewContext(q63.slice(va,vb)+";this.K=angMengenKurz;this.H=angMengenHtml;this.U=angMengenUebersicht",sbx);
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

 

console.log("\nA · Offertmengen (rein)");
const L=[{id:1,name:"Kupfer"}];
const pos=(d,x)=>Object.assign({pos:"",description:d,quantity:1,unit:"m"},x||{});
const o=(t,ps)=>({title:t,positions:ps});
p(sbx.K([o("A",[pos("R",{quantity:12,abwicklung_mm:500})])],L)==="Fläche 6.00 m² · 0 Stück","m mit bestätigter Abwicklung: Fläche");
p(sbx.K([o("A",[pos("B",{quantity:7.5,unit:"m2"})])],L)==="Fläche 7.50 m² · 0 Stück","m²: direkt");
p(sbx.K([o("A",[pos("H",{quantity:10,unit:"St"})])],L)==="Fläche 0.00 m² · 10 Stück","Stück: nur Stück, Fläche 0 (nichts offen)");
let k=sbx.K([o("A",[pos("R",{quantity:12})])],L);
p(/Fläche nicht erfasst/.test(k)&&/unvollständig/.test(k)&&!/0\.00/.test(k),"m ohne Abwicklung: „nicht erfasst“, nicht 0",k);
k=sbx.K([o("A",[pos("R",{quantity:12,description:"Rinne. Abwicklung mm 500."})])],L);
p(/nicht erfasst/.test(k),"nur im Text erkannte Abwicklung (unbestätigt): nicht erfasst",k);
k=sbx.K([o("A",[pos("x",{quantity:"abc",unit:"m2"})])],L);
p(/Fläche nicht erfasst/.test(k)&&/Stück nicht erfasst/.test(k),"ungültige Menge: nicht erfasst (weder Fläche noch Stück als 0)",k);
k=sbx.K([o("A",[pos("R",{quantity:12,abwicklung_mm:500}),pos("Trennlage. b mm 500.",{quantity:86})])],L);
p(/Fläche 6\.00 m²/.test(k),"Zusatzposition ohne Abwicklung erzeugt keine Fläche",k);
k=sbx.K([o("A",[pos("R",{quantity:12,abwicklung_mm:500})]),o("B",[pos("R",{quantity:12,abwicklung_mm:500})])],L);
p(/2 Offerten/.test(k)&&/nicht addiert/.test(k)&&!/12\.00/.test(k),"mehrere Offerten: nie addiert",k);
p(sbx.K([],L)===""&&sbx.K([o("leer",[])],L)==="","keine Offerte/Position: keine Zeile");
const h=sbx.H([o("A",[pos("R",{quantity:12})])],L);
p(/Fläche <b>nicht erfasst<\/b>/.test(h)&&!/Fläche <b>0\.00/.test(h),"Karte: unberechenbare Fläche als „nicht erfasst“",h.slice(0,200));
p(!/[Kk]omplettausmass/.test(q63.slice(va,vb))&&/Offertmengen/.test(h)&&/keine Massaufnahme-, Zuschnitt-, Ausmass- oder verrechneten Mengen/.test(h),"nie als Komplettausmass bezeichnet; Offertmengen klar abgegrenzt");

console.log("\nB · Projektliste und Cockpit");
await page.evaluate(()=>{
 currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"A"};meineRechte={admin:true};
 allProjects=[{id:7,name:"P7",order_no:"2026-1",customer:"Muster AG",object:"Musterstrasse 1, 3000 Bern",archived:false},
  {id:8,name:"P8",archived:false},{id:9,name:"",object:"",archived:false}];
 $("appRoot").hidden=false;$("authScreen").hidden=true;
 showArchivedProjects=false;projectSucheText="";projectStatusFilter="alle";projectArtFilter="alle";
 window.__alt=sb.from;
});
const stand0=await page.evaluate(()=>{
 projectMeasTypen=null;projectMeasStand=null;
 renderProjectList();
 return $("projectList").textContent.replace(/\s+/g," ");
});
p(!/Massaufnahme/.test(stand0)&&/Musterstrasse 1/.test(stand0),"vor dem Laden: kein erfundener Stand, Adresse bleibt Hauptanzeige",stand0);
const stand1=await page.evaluate(async()=>{
 const rows=[{project_id:7,type:"kehle",workflow_status:"zu_ruesten",archived:false},{project_id:7,type:"kehle",workflow_status:"abgeschlossen",archived:false},
  {project_id:7,type:"rinne",workflow_status:"freigegeben",archived:false},{project_id:8,type:"kehle",workflow_status:"abgeschlossen",archived:false}];
 sb.from=t=>t==="measurements"?{select:()=>Promise.resolve({data:rows,error:null})}:window.__alt(t);
 projectMeasTypen=null;projectMeasStand=null;
 await ladeProjectMeasTypen();
 sb.from=window.__alt;
 return [...document.querySelectorAll("#projectList .a2-pz-stand")].map(x=>x.textContent);
});
p(stand1.length===3,"jede Karte hat eine Stand-Zeile",stand1);
p(/3 Massaufnahmen · 2 offen/.test(stand1[0]),"Projekt 7: 3 Massaufnahmen, 2 offen (abgeschlossene nicht mitgezählt)",stand1[0]);
p(/zu rüsten/.test(stand1[0])===((await page.evaluate(()=>typeof mwAktiv==="function"&&mwAktiv()))),"„zu rüsten“ nur wenn der Arbeitsablauf der Firma an ist",stand1[0]);
p(/1 Massaufnahme · alle abgeschlossen/.test(stand1[1]),"Projekt 8: alle abgeschlossen",stand1[1]);
p(stand1[2]==="Noch keine Massaufnahme","Projekt ohne Massaufnahme: ausdrücklich so",stand1[2]);
const fehl=await page.evaluate(async()=>{
 sb.from=t=>t==="measurements"?{select:()=>Promise.resolve({data:null,error:{message:"x"}})}:window.__alt(t);
 projectMeasTypen=null;projectMeasStand=null;
 const e=console.error;console.error=()=>{};
 await ladeProjectMeasTypen();console.error=e;
 sb.from=window.__alt;
 renderProjectList();
 return {stand:document.querySelectorAll("#projectList .a2-pz-stand").length,liste:document.querySelectorAll("#projectList .project-row").length};
});
p(fehl.stand===0&&fehl.liste===3,"Ladefehler: Liste bleibt, es steht kein Stand da (nichts erfunden)",fehl);
await page.evaluate(async()=>{
 const rows=[{project_id:7,type:"kehle",workflow_status:"zu_ruesten",archived:false}];
 sb.from=t=>t==="measurements"?{select:()=>Promise.resolve({data:rows,error:null})}:window.__alt(t);
 projectMeasTypen=null;projectMeasStand=null;await ladeProjectMeasTypen();sb.from=window.__alt;
});
// Suche, leer, Filter
const such=await page.evaluate(()=>{
 const out={};
 projectSucheText="Muster AG";renderProjectList();out.treffer=document.querySelectorAll("#projectList .project-row").length;
 projectSucheText="gibtesnicht";renderProjectList();out.leer=$("projectList").textContent.replace(/\s+/g," ").trim();
 projectSucheText="";renderProjectList();out.alle=document.querySelectorAll("#projectList .project-row").length;
 out.ohneAdresse=[...document.querySelectorAll("#projectList .a2-zeile-text b")].map(b=>b.textContent);
 out.offnen=document.querySelectorAll("#projectList [data-open-cockpit]").length;
 return out;
});
p(such.treffer===1&&/Kein Projekt passt zur Suche/.test(such.leer)&&such.alle===3,"Suche und Leerzustand funktionieren",such);
p(such.offnen===3&&such.ohneAdresse.every(t=>t.trim().length>0),"jedes Projekt hat einen Titel (auch ohne Adresse/Bezeichnung) und die Primäraktion „öffnen“",such);
// Viewports
for(const w of [360,390,430,768]){
 await page.setViewportSize({width:w,height:900});
 const ov=await page.evaluate(()=>{
  projectMeasStand=new Map([[7,{gesamt:12,offen:11,zuRuesten:9}]]);projectMeasTypen=new Map();
  projectSucheText="";renderProjectList();
  const c=document.createElement("div");c.id="t340";c.style.cssText="position:fixed;left:0;top:0;right:0;bottom:0;overflow:auto;background:#fff;z-index:99999;padding:0 16px;box-sizing:border-box";
  c.innerHTML=$("projectList").innerHTML;document.body.appendChild(c);
  const r={sw:c.scrollWidth,iw:c.clientWidth};c.remove();return {sw:r.sw,iw:r.iw};
 });
 p(ov.sw<=ov.iw,"Projektliste ohne horizontales Scrollen bei "+w+" px",ov);
}
await page.setViewportSize({width:1100,height:1400});
await page.evaluate(()=>{window.__alt=sb.from});

console.log("\nC · Cockpit: Offertmengen-Zeile");
const cz=await page.evaluate(()=>{
 const out={};
 offerteZugriff=true;
 const ps=(d,x)=>Object.assign({pos:"",description:d,quantity:1,unit:"m"},x||{});
 angMengenZeileSetzen([{title:"A",positions:[ps("R",{quantity:12,abwicklung_mm:500})]}]);
 out.eine={hidden:$("cockpitStandMengenZeile").hidden,t:$("cockpitMengenStand").textContent};
 angMengenZeileSetzen([{title:"A",positions:[ps("R",{quantity:12})]}]);
 out.unklar=$("cockpitMengenStand").textContent;
 angMengenZeileSetzen([]);out.leer=$("cockpitStandMengenZeile").hidden;
 offerteZugriff=false;angMengenZeileSetzen([{title:"A",positions:[ps("R",{quantity:12,abwicklung_mm:500})]}]);
 out.ohneRecht=$("cockpitStandMengenZeile").hidden;
 out.titel=$("cockpitStandMengenZeile").title;
 return out;
});
p(cz.eine.hidden===false&&/Fläche 6\.00 m²/.test(cz.eine.t),"Arbeitsstand-Zeile „Offertmengen“ mit Summe der einen Offerte",cz.eine);
p(/nicht erfasst/.test(cz.unklar)&&/unvollständig/.test(cz.unklar),"unberechenbar: „nicht erfasst … unvollständig“",cz.unklar);
p(cz.leer===true&&cz.ohneRecht===true,"keine Offerte oder keine Offerten-Freigabe: Zeile verborgen");
p(/keine Massaufnahme-, Zuschnitt-, Ausmass- oder verrechneten Mengen/.test(cz.titel),"Tooltip grenzt die Quelle ab");
const lad=await page.evaluate(async()=>{
 offerteZugriff=true;
 const rows=[{id:1,title:"A",project_id:7,date:"2026-01-01",positions:[{pos:"1",description:"R",quantity:12,unit:"m",abwicklung_mm:500}]}];
 const alt=sb.from;
 sb.from=t=>t==="angebote"?{select:()=>({eq:()=>({order:async()=>({data:rows,error:null})})})}:alt(t);
 await loadProjectAngebote(7);sb.from=alt;
 return {z:$("cockpitMengenStand").textContent,karte:/Offertmengen/.test($("cockpitAngeboteBody").textContent)};
});
p(/6\.00 m²/.test(lad.z)&&lad.karte,"loadProjectAngebote setzt Zeile und Karte (eine Quelle)",lad);
const wr0=await page.evaluate(()=>window.__log);
p(wr0.length===0,"Anzeigen und Öffnen schreiben nichts",wr0);

console.log("\nD · Projekt-Rüstblatt");
const D=await page.evaluate(async()=>{
 const out={};
 const A=mk(201,"Eins",[{breite:250,stuecke:[500]}]);
 const B=mk(202,"Zwei",[{breite:250,stuecke:[700]}],{staerke:null});
 const C=mk(203,"OhneZuschnitt",[{breite:250,stuecke:[700]}]);delete C.data.rollen;
 const E=mk(204,"Kupfer",[{breite:250,stuecke:[400]}],{material:"1"});
 allProjects=[{id:7,name:"P7",archived:false,zuschnitt_ausschluss:[204]},{id:8,name:"P8",archived:false}];
 zeCache.clear();zeGeladen.clear();
 const alt=sb.from;
 sb.from=(t)=>t==="measurements"?{select:()=>({in:async()=>({data:[A,B,C,E],error:null})})}:alt(t);
 window.__alt2=alt;
 await rbProjektOeffnen([A,B,C,E],{projectId:7});
 const t=$("ruestblattBody").textContent.replace(/\s+/g," ");
 out.t=t;
 out.gew=[...rbProjektAuswahl.gewaehlt].sort();
 out.cb=[...document.querySelectorAll("#ruestblattBody [data-rbp-auswahl]")].map(c=>c.dataset.rbpAuswahl+":"+c.checked).join(",");
 out.mat=pzuMatText(B);out.mat2=pzuMatText(A);
 // Druck = Vorschau
 const vorschau=pzuProjektRuestblattHtml(rbProjektGewaehlt(),{rollen:rbProjektAuswahl.rollen}).html;
 let gedruckt=null;const altD=window.rbDruckenAufnahmen;
 window.rbDruckenAufnahmen=async(l,o)=>{gedruckt=o.gemeinsamFn(l)};
 // Haken setzen (Stück 1 von Massaufnahme 201), Vorschau noch alt
 zeCache.set(201,new Map([[1,{erledigt:true,laenge_mm:500,breite_mm:250}]]));
 document.getElementById("ruestblattDrucken").click();
 await new Promise(r=>setTimeout(r,50));
 window.rbDruckenAufnahmen=altD;
 const aufDem=pzuProjektRuestblattHtml(rbProjektGewaehlt(),{rollen:rbProjektAuswahl.rollen}).html;
 out.druckGleichBildschirm=gedruckt===aufDem;
 out.erledigtImDruck=/Bereits zugeschnitten/.test(String(gedruckt));
 out.erledigtImBild=document.querySelector("#rbpErgebnis")?/Bereits zugeschnitten/.test(document.querySelector("#rbpErgebnis").textContent):false;
 sb.from=alt;
 return out;
});
p(/Ohne gespeicherten Zuschnitt, nicht im Blatt: .*OhneZuschnitt/.test(D.t),"Massaufnahme ohne Zuschnitt wird ausdrücklich genannt (nicht stillschweigend weggelassen)",D.t.slice(0,300));
p(D.gew.join()==="201,202"&&/204:false/.test(D.cb)&&/Vorbelegt nach der Auswahl im Projekt-Zuschnitt \(1 dort abgewählt\)/.test(D.t),"Vorbelegung aus der gespeicherten Projektauswahl (204 dort abgewählt), nur gelesen",D);
p(/Stärke nicht erfasst/.test(D.mat)&&/Titanzink/.test(D.mat)&&/0,7 mm/.test(D.mat2)&&!/nicht erfasst/.test(D.mat2),"fehlende Stärke wird markiert, vorhandene nicht",D);
p(D.druckGleichBildschirm&&D.erledigtImDruck,"Druck zeigt exakt dasselbe wie die Vorschau nach dem Aktualisieren (inkl. neuem Haken)",D);
p(D.erledigtImBild,"die Vorschau wurde vor dem Druck auf den Stand gebracht");
const unb=await page.evaluate(()=>{
 const A=mk(211,"A",[{breite:250,stuecke:[500]}],{staerke:0.7}),B=mk(212,"B",[{breite:250,stuecke:[500]}],{staerke:null}),C=mk(213,"C",[{breite:250,stuecke:[500]}],{staerke:0.7,material:"1"});
 return {n:pzuSammeln([A,B,C]).materialien.length};
});
p(unb.n===3,"unbekannte Stärke und anderer Werkstoff bleiben getrennte Gruppen",unb);
const sei=await page.evaluate(async()=>{
 const A=mk(221,"A",[{breite:250,stuecke:[500]}]),B=mk(222,"B",[{breite:250,stuecke:[500]}],{material:"1"});
 const h=await rbDokumentHtml([A,B],{gemeinsam:pzuProjektRuestblattHtml([A,B]).html});
 return {seiten:(h.match(/class="rb-druck-seite"/g)||[]).length,kopf:(h.match(/class="rb-kopf"/g)||[]).length};
});
p(sei.seiten===4,"Druck: jede Rollengruppe eine eigene Seite (2 Gruppen + 2 Einzelblätter)",sei);
const wr1=await page.evaluate(()=>window.__log);
p(wr1.length===0,"Auswahl, Vorbelegung, Vorschau und Druck schreiben nichts",wr1);
p(jsFehler.length===0,"keine JS-Fehler",jsFehler);
await br.close();
console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
process.exit(fail?1:0);
})();
