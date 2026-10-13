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

 


const q85=fs.readFileSync("js/85-komplettausmass.js","utf8"), q63=fs.readFileSync("js/63-angebote.js","utf8");
const ra=q85.indexOf("const KA_EINHEITEN"), rb=q85.indexOf("// ---- Ende rein");
const va=q63.indexOf("const ANG_MAT_STAERKE_MIN"), vb=q63.indexOf("// ---- Ende Offertposition Materialdaten");
const sbx={esc:s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")};
vm.runInNewContext(q63.slice(va,vb)+";this.U=angMengenUebersicht",sbx);
vm.runInNewContext(q85.slice(ra,rb)+";this.M=kaMaterialZeilen;this.F=kaMaFlaeche",sbx);
const LST=[{id:1,name:"Kupfer"},{id:2,name:"Titanzink"}];
const ps=(d,x)=>Object.assign({pos:"",description:d,quantity:1,unit:"m2"},x||{});
const MA=(id,mat,st,zeilen,x)=>Object.assign({id,project_id:7,company_id:"A",type:"kehle",title:"T"+id,staerke_mm:st,workflow_status:"zu_ruesten",data:{material:mat,ausmass:zeilen}},x||{});
const z=(bez,menge,einheit,x)=>Object.assign({pos:1,bezeichnung:bez,menge,einheit,teil:false},x||{});
const ctx={projectId:7,companyId:"A",material:v=>({1:"Kupfer",2:"Titanzink"}[v]||"?")};

console.log("\nA · Material- und Mengenübersicht (rein)");
let U=sbx.U([ps("a",{quantity:48,material_id:1,staerke_mm:0.6}),ps("b",{quantity:32.5,material_id:2,staerke_mm:0.7}),ps("c",{quantity:10,unit:"St",material_id:1,staerke_mm:0.6})],LST);
p(U.nachMatStaerke["Kupfer|0.6"]&&U.nachMatStaerke["Kupfer|0.6"].flaeche_m2===48&&U.nachMatStaerke["Kupfer|0.6"].stueck===10,"Offerte: Summen je Werkstoff UND Stärke",U.nachMatStaerke);
U=sbx.U([ps("a",{quantity:5,material_id:1}),ps("b",{quantity:7,material_id:1,staerke_mm:0.6}),ps("c",{quantity:3})],LST);
p(Object.keys(U.nachMatStaerke).length===3&&U.nachMatStaerke["Kupfer|"].staerke===null&&U.nachMatStaerke["|"],"Offerte: Stärke nicht erfasst und ohne Werkstoff bleiben eigene Zeilen",Object.keys(U.nachMatStaerke));
let T=sbx.M([MA(1,1,0.6,[z("Blechfläche Zuschnitt","40,5","m²"),z("Bleilappen","8","Stk."),z("Bleilappen","3","Stk.",{teil:true}),z("Fläche","99","m²")]),
 MA(2,1,0.6,[z("Blechfläche Zuschnitt","6","m²"),z("Haupt","4","Stk")])],sbx.U([ps("a",{quantity:48,material_id:1,staerke_mm:0.6})],LST),ctx);
let r=T.zeilen[0];
p(T.zeilen.length===1&&r.material==="Kupfer"&&r.staerke===0.6&&r.off[0].m2===48&&Math.abs(r.masseM2-46.5)<1e-9&&r.masseStk===12,"Offerte und Massaufnahme landen in EINER Zeile; m² nur aus „Blechfläche Zuschnitt“ (99 m² „Fläche“ zählt nicht), Stk nur Hauptstücke (Teile nicht)",r);
T=sbx.M([MA(1,2,0.7,[z("Blechfläche Zuschnitt","10","m²")])],sbx.U([ps("a",{quantity:5,material_id:1,staerke_mm:0.6})],LST),ctx);
p(T.zeilen.length===2&&T.zeilen.find(x=>x.material==="Kupfer").masseM2===null&&T.zeilen.find(x=>x.material==="Titanzink").off[0].m2===null,"fehlende Quelle ist null (Anzeige „–“), nicht 0",T.zeilen);
p(T.summe.off[0].m2.wert===5&&T.summe.off[0].m2.vollstaendig===false&&T.summe.masseM2.vollstaendig===false,"Summe nur über Zeilen mit Wert und als „nicht vollständig“ gekennzeichnet",T.summe);
T=sbx.M([MA(1,1,null,[z("Blechfläche Zuschnitt","2","m²")]),MA(2,1,0.6,[z("Blechfläche Zuschnitt","3","m²")]),MA(3,"",0.6,[z("Blechfläche Zuschnitt","1","m²")])],null,ctx);
p(T.zeilen.length===3,"gleicher Werkstoff mit/ohne Stärke und Massaufnahme ohne Werkstoff: drei getrennte Zeilen",T.zeilen.map(x=>x.material+"|"+x.staerke));
T=sbx.M([MA(1,1,0.6,[z("Blechfläche Zuschnitt","2","m²")]),MA(2,1,0.6,[z("Blechfläche Zuschnitt","50","m²")],{project_id:8}),MA(3,1,0.6,[z("Blechfläche Zuschnitt","70","m²")],{company_id:"B"})],null,ctx);
p(T.zeilen.length===1&&T.zeilen[0].masseM2===2,"fremdes Projekt und fremde Firma zählen nicht",T.zeilen);
p(sbx.F(MA(1,1,0.6,[z("Blechfläche Zuschnitt","1,5","m²"),z("X","2","Stk")]))===" · 1.50 m² · 2 Stk"&&sbx.F(MA(2,1,0.6,[]))==="","Kurztext je Massaufnahme: nur Erfasstes, sonst leer");

console.log("\nB · Projektübersicht und Material-/Mengentabelle in der Ansicht");
await page.evaluate(()=>{
 currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"A"};meineRechte={admin:true};
 allProjects=[{id:7,name:"P7",archived:false,object:"Musterstrasse 12",customer:"Muster AG",order_no:"1"}];
 measurementMaterials=[{id:1,name:"Kupfer"},{id:2,name:"Titanzink"}];
 $("appRoot").hidden=false;$("authScreen").hidden=true;cockpitProjectId=7;window.__alt=sb.from;
});
const tab=async(ang,ma,pre)=>page.evaluate(([a,m,pre])=>{
 if(pre)eval(pre);
 projectAngeboteCache=a;projectMeasurementsCache=m;kaGeladen();
 const h=kaMengenKarteHtml();const d=document.createElement("div");d.innerHTML=h;
 return {zellen:[...d.querySelectorAll("tbody tr:first-child td")].map(x=>x.textContent.trim()),t:d.textContent.replace(/\s+/g," "),kopf:[...d.querySelectorAll("thead th")].map(x=>x.textContent),zeilen:d.querySelectorAll("tbody tr").length,chips:d.querySelectorAll("[data-ka-offerte]").length,h};
},[ang,ma,pre||""]);
const mas=[{id:1,project_id:7,company_id:"A",type:"kehle",title:"A",staerke_mm:0.6,workflow_status:"zu_ruesten",data:{material:"1",ausmass:[{pos:1,bezeichnung:"Blechfläche Zuschnitt",menge:"46,5",einheit:"m²",teil:false},{pos:2,bezeichnung:"Haupt",menge:"12",einheit:"Stk",teil:false}]}}];
const off=(t,q)=>({id:1,title:t,positions:[{pos:"1",description:"R",quantity:q,unit:"m2",material_id:1,staerke_mm:0.6}]});
let t1=await tab([off("Offerte A",48)],mas);
p(/Material- und Mengenübersicht/.test(t1.t)&&t1.kopf.join("|")==="Werkstoff|Stärke|m² (Offerte)|m² (Massaufn.)"&&t1.zeilen===1,"Tabelle: Werkstoff, Stärke, m² (Offerte), m² (Massaufn.)",t1.kopf);
p(t1.zellen[0]==="Kupfer"&&t1.zellen[1]==="0,6 mm"&&/^48[.,]00$/.test(t1.zellen[2])&&/^46[.,]50$/.test(t1.zellen[3]),"Zeile Kupfer 0,6 mm: Offerte 48.00 in der Offerte-Spalte, Massaufnahme 46.50 in der Massaufn.-Spalte",t1.zellen);
p(/Summe/.test(t1.t)&&/Getrennte Quellen/.test(t1.t)&&/keine Massaufnahme-, Ausmass- oder verrechneten Mengen/.test(t1.t),"Summenzeile und Hinweis, dass es zwei getrennte Quellen sind");
let t2=await page.evaluate(()=>{document.querySelector("[data-ka-ansicht='stk']")&&0;kaAnsicht="stk";const d=document.createElement("div");d.innerHTML=kaMengenKarteHtml();kaAnsicht="m2";return {kopf:[...d.querySelectorAll("thead th")].map(x=>x.textContent),t:d.textContent.replace(/\s+/g," ")}});
p(t2.kopf.join("|")==="Werkstoff|Stärke|Stück (Offerte)|Stück (Massaufn.)"&&/12/.test(t2.t),"Umschalter Stk.: Stück (Offerte) / Stück (Massaufn.)",t2.kopf);
let t3=await page.evaluate(()=>{
 const off=(t,q,g)=>({id:t==="Offerte A"?1:2,title:t,gilt:g,positions:[{pos:"1",description:"R",quantity:q,unit:"m2",material_id:1,staerke_mm:0.6}]});
 const ma=[{id:1,project_id:7,company_id:"A",type:"kehle",title:"A",staerke_mm:0.6,workflow_status:"zu_ruesten",data:{material:"1",ausmass:[{pos:1,bezeichnung:"Blechfläche Zuschnitt",menge:"46,5",einheit:"m²",teil:false}]}}];
 const hol=(a)=>{projectAngeboteCache=a;projectMeasurementsCache=ma;kaGeladen();const d=document.createElement("div");d.innerHTML=kaMengenKarteHtml();
  return {kopf:[...d.querySelectorAll("thead th")].map(x=>x.textContent),zellen:[...d.querySelectorAll("tbody tr:first-child td")].map(x=>x.textContent.trim()),t:d.textContent.replace(/\s+/g," ")}};
 return {beide:hol([off("Offerte A",48,true),off("Offerte B",30,true)]),eine:hol([off("Offerte A",48,true),off("Offerte B",30,false)]),keine:hol([off("Offerte A",48,false),off("Offerte B",30,false)]),
  standard:hol([off("Offerte A",48),off("Offerte B",30)])};
});
p(t3.beide.kopf.length===5&&/Offerte „Offerte A“/.test(t3.beide.kopf[2])&&/Offerte „Offerte B“/.test(t3.beide.kopf[3])&&/^48[.,]00$/.test(t3.beide.zellen[2])&&/^30[.,]00$/.test(t3.beide.zellen[3])&&!/78[.,]00/.test(t3.beide.t),"zwei geltende Offerten: je eine eigene Spalte (48 und 30), nie die Summe (78 kommt nicht vor)",t3.beide);
p(t3.eine.kopf.length===4&&/^48[.,]00$/.test(t3.eine.zellen[2])&&!/30[.,]00/.test(t3.eine.t),"eine Offerte abgewählt (gilt=false): sie steht nicht mehr in der Übersicht",t3.eine);
p(/Keine Offerte ist als geltend markiert/.test(t3.keine.t)&&t3.keine.kopf.length===3,"keine als geltend markiert: klarer Hinweis, nur Massaufnahme-Spalte",t3.keine.t.slice(0,200));
p(t3.standard.kopf.length===5,"Standard (gilt nicht gesetzt): alle gelten – bestehende Offerten ändern sich nicht",t3.standard.kopf);
let t4=await tab([],mas);
p(/Keine Offerte importiert/.test(t4.t)&&/46[.,]50/.test(t4.t)&&/–/.test(t4.t),"ohne Offerte: nur Massaufnahme, Offerte-Zelle „–“ (nicht 0)",t4.t.slice(0,200));
let t5=await tab([off("Offerte A",48)],[]);
p(/48[.,]00/.test(t5.t)&&/–/.test(t5.t),"ohne Massaufnahme: nur Offerte");
const ub=await page.evaluate(()=>{
 projectAngeboteCache=[];projectMeasurementsCache=[];kaGeladen();
 const h=a2RegUebersicht({id:7,name:"P7",object:"Musterstrasse 12",customer:"Muster AG",order_no:"1",archived:false});
 return {dash:/a2-dash/.test(h),kopf:/<h2>Projektübersicht<\/h2>/.test(h),mengen:/Material- und Mengenübersicht/.test(h),edit:/data-a2-tu="stammdaten"/.test(h),ablauf:/<h2>Ablauf<\/h2>/.test(h),adr:/Musterstrasse 12/.test(h)};
});
p(ub.dash&&ub.kopf&&ub.mengen&&ub.edit&&ub.ablauf&&ub.adr,"Übersicht: Projektübersicht und Mengenübersicht nebeneinander (Raster), Stammdaten-Knopf und Ablauf bleiben",ub);
for(const w of [360,390,430,768,1100]){
 await page.setViewportSize({width:w,height:900});
 const ov=await page.evaluate(()=>{
  projectAngeboteCache=[{id:1,title:"Offerte mit langem Namen",positions:[{pos:"1",description:"R",quantity:48,unit:"m2",material_id:2,staerke_mm:0.7}]}];
  projectMeasurementsCache=[{id:1,project_id:7,company_id:"A",type:"kehle",title:"A",staerke_mm:0.7,workflow_status:"zu_ruesten",data:{material:"2",ausmass:[{pos:1,bezeichnung:"Blechfläche Zuschnitt",menge:"46,5",einheit:"m²",teil:false}]}}];
  kaGeladen();
  const c=document.createElement("div");c.className="a2-karte";c.style.cssText="position:fixed;left:0;top:0;right:0;bottom:0;overflow:auto;background:#fff;z-index:99999;padding:0 16px;box-sizing:border-box";
  c.innerHTML='<div class="a2-dash">'+kaMengenKarteHtml()+'</div>';document.body.appendChild(c);
  const r={sw:c.scrollWidth,iw:c.clientWidth};c.remove();return r;
 });
 p(ov.sw<=ov.iw,"Mengenübersicht ohne horizontales Scrollen bei "+w+" px",ov);
}
await page.setViewportSize({width:1100,height:1400});

console.log("\nC · Register Rüstblatt (Projekt-Rüstblatt inline)");
const reg=await page.evaluate(()=>{
 const k=a2ProjRegister().map(r=>r.k);
 const ph=a2RegRuestblatt({id:7});
 return {k,ph:/id="a2RbProjekt"/.test(ph),modal:typeof $("ruestblattModal")};
});
p(reg.k.indexOf("ruestblatt")>=0&&reg.k.indexOf("ruestblatt")<reg.k.indexOf("ausmass")&&reg.ph,"Register „Rüstblatt“ vorhanden (vor Ausmass) mit Platzhalter",reg.k);
const inl=await page.evaluate(async()=>{
 const A=mk(301,"Süd",[{breite:400,stuecke:[500,700]}]),B=mk(302,"Nord",[{breite:250,stuecke:[500]}]),C=mk(303,"Erledigt",[{breite:250,stuecke:[500]}]);
 C.workflow_status="abgeschlossen";
 [A,B].forEach(m=>{m.data.ausmass=[{pos:1,bezeichnung:"Blechfläche Zuschnitt",menge:"1,2",einheit:"m²",teil:false},{pos:2,bezeichnung:"Haupt",menge:"1",einheit:"Stk",teil:false}]});
 zeCache.clear();zeGeladen.clear();
 allProjects=[{id:7,name:"P7",archived:false,zuschnitt_ausschluss:[]}];
 projectMeasurementsCache=[A,B,C];
 const box=document.createElement("div");box.id="a2RbProjekt";document.body.appendChild(box);
 const alt=sb.from;sb.from=t=>t==="measurements"?{select:()=>({in:async()=>({data:[A,B,C],error:null})})}:alt(t);
 const ok=await rbProjektOeffnen([A,B,C],{inline:true,projectId:7});
 sb.from=alt;
 const out={ok,modalZu:$("ruestblattModal").hidden!==false};
 out.t=box.textContent.replace(/\s+/g," ");
 out.zeilen=box.querySelectorAll("[data-rbp-auswahl]").length;
 out.pdf=!!box.querySelector("[data-rbp-pdf]");out.rollen=box.querySelectorAll("[data-rbp-rolle]").length;
 out.band=box.querySelectorAll(".pzu-band svg").length;
 out.farben=new Set([...box.querySelectorAll(".pzu-band svg rect")].map(r=>r.getAttribute("fill")).filter(f=>f&&f!=="#f1f1f1")).size;
 out.summe=[...box.querySelectorAll(".pzu-summe small")].map(x=>x.textContent);
 out.stueckeSumme=(box.querySelector(".pzu-summe b")||{}).textContent;
 out.legende=box.querySelectorAll(".pzu-legende i").length;
 out.pieces=[...box.querySelectorAll(".pzu-band svg text")].map(x=>x.textContent).filter(x=>/^\d+$/.test(x)).length;
 window.__box=box;
 return out;
});
p(inl.ok&&inl.modalZu&&inl.zeilen===2,"inline geöffnet: Fenster bleibt zu, 2 Massaufnahmen wählbar (abgeschlossene fehlt)",inl);
p(/Status|Zu rüsten|Freigegeben/.test(inl.t)&&/1[.,]20 m²/.test(inl.t)&&/1 Stk/.test(inl.t),"Auswahl zeigt Status, m² (Blechfläche Zuschnitt) und Stück je Massaufnahme",inl.t.slice(0,300));
p(inl.pdf&&inl.rollen>=2,"Rüstblatt als PDF und Rollenwahl (Breiten des Lagers) vorhanden");
p(inl.band>=1&&inl.farben===2&&inl.legende===2,"Rollenband: Belegung je Rolle, 2 Massaufnahmen = 2 Farben, Legende",inl);
p(inl.summe.join("|")==="Zuschnitte (offen)|Rollenlänge|Blechfläche|Verschnitt|Optimierung"&&inl.stueckeSumme==="3","Summenleiste: Zuschnitte (offen) = 3, Rollenlänge, Blechfläche, Verschnitt, Optimierung",inl.summe.concat(inl.stueckeSumme));
const hk=await page.evaluate(async()=>{
 const box=window.__box;
 // Haken: Stück 1 von 302 -> nach Aktualisieren nicht mehr im Plan
 zeCache.set(302,new Map([[1,{erledigt:true,laenge_mm:500,breite_mm:250}]]));
 box.querySelector("[data-rbp-erstellen]").click();
 const t=box.textContent.replace(/\s+/g," ");
 return {offen:(box.querySelector(".pzu-summe b")||{}).textContent,erl:/Bereits zugeschnitten/.test(t),aktual:/aktualisiert \d\d:\d\d/.test(t)};
});
p(hk.offen==="2"&&hk.erl&&hk.aktual,"nach Haken und „aktualisieren“: 2 offene Zuschnitte, Block „Bereits zugeschnitten“, Rückmeldung",hk);
const pdf=await page.evaluate(async()=>{
 let h=null;const alt=window.rbDruckenAufnahmen;window.rbDruckenAufnahmen=async(l,o)=>{h=o.gemeinsamFn(l)};
 window.__box.querySelector("[data-rbp-pdf]").click();
 await new Promise(r=>setTimeout(r,50));window.rbDruckenAufnahmen=alt;
 return {ok:typeof h==="string",band:/pzu-band/.test(String(h)),summe:/pzu-summe/.test(String(h))};
});
p(pdf.ok&&pdf.band&&pdf.summe,"PDF-Knopf druckt dasselbe: Rollenband und Summenleiste sind im Druck",pdf);
// Einsparung nur mit echtem Vorteil
const sp=await page.evaluate(()=>{
 const A=mk(311,"Süd",[{breite:400,stuecke:[500]}]),B=mk(312,"Nord",[{breite:250,stuecke:[500]}]);
 zeCache.clear();zeGeladen.clear();
 const zwei=pzuProjektRuestblattHtml([A,B]).html, eine=pzuProjektRuestblattHtml([A]).html;
 return {zwei:/spart [\d.,']+ m²/.test(zwei),eine:/keine Einsparung/.test(eine)&&!/spart/.test(eine)};
});
p(sp.zwei&&sp.eine,"Einsparung wird nur genannt, wenn gemeinsam wirklich weniger Blech braucht; bei einer Massaufnahme „keine Einsparung“",sp);
const wr=await page.evaluate(()=>window.__log);
p(wr.length===0,"Anzeige, Auswahl, Aktualisieren und PDF schreiben nichts",wr);
p(!/\.insert\(|\.update\(|\.upsert\(|\bsb\.from\(/.test(q85.replace(/\/\/.*$/gm,"")),"js/85 ohne Datenbankzugriff");
p(jsFehler.length===0,"keine JS-Fehler",jsFehler);
await br.close();
console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
process.exit(fail?1:0);
})();
