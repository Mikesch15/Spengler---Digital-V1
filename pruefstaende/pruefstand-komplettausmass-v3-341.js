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

 


const q85=fs.readFileSync("js/85-komplettausmass.js","utf8");
const ra=q85.indexOf("const KA_EINHEITEN"), rb=q85.indexOf("// ---- Ende rein");
const sbx={};
vm.runInNewContext(q85.slice(ra,rb)+";this.S=kaSammeln;this.Z=kaZahl;this.E=kaEinheit",sbx);
const art=t=>({kehle:"Kehle",rinne_halbrund:"Rinne halbrund",dachfenstereinfassung:"Dachfenstereinfassung"}[t]||t);
const ctx={projectId:7,companyId:"A",art,material:v=>"Mat"+v};
const z=(pos,bez,menge,einheit,x)=>Object.assign({pos,bezeichnung:bez,menge,einheit,teil:false,herkunft:"Test"},x||{});
const M=(id,titel,zeilen,x)=>Object.assign({id,project_id:7,company_id:"A",type:"kehle",title:titel,workflow_status:"in_bearbeitung",data:{ausmass:zeilen,material:"1"}},x||{});
const S=(l,c)=>sbx.S(l,c||ctx);

console.log("\nA · Zusammenführung (rein)");
let r=S([]);
p(r.gruppen.length===0&&r.massaufnahmen.length===0&&r.pruefen.length===0,"1 · keine Massaufnahmen: leer, kein Absturz");
r=S([M(1,"A",[z(1,"Blechfläche Zuschnitt","1,34","m²")])]);
p(r.gruppen.length===1&&Math.abs(r.gruppen[0].summe-1.34)<1e-9&&r.gruppen[0].einheit==="m²","2 · eine Massaufnahme mit gültiger Menge (Komma-Dezimal)",r.gruppen);
r=S([M(1,"A",[z(1,"Blechfläche Zuschnitt","1,34","m²")]),M(2,"B",[z(1,"Blechfläche Zuschnitt","0.92","m²")]),M(3,"C",[z(1,"Blechfläche Zuschnitt",2,"m²")])]);
p(r.gruppen.length===1&&Math.abs(r.gruppen[0].summe-4.26)<1e-9&&r.gruppen[0].quellen.length===3,"3 · mehrere Massaufnahmen, gleiche Bezeichnung und Einheit: summiert, 3 Quellen",r.gruppen[0]);
r=S([M(1,"A",[z(1,"Dachrinne","12","m"),z(2,"Dachrinne","3","Stk."),z(3,"Dachrinne","2,5","m²")])]);
p(r.gruppen.length===3&&new Set(r.gruppen.map(g=>g.einheit)).size===3,"4 · gleiche Bezeichnung, verschiedene Einheiten: getrennte Gruppen (m, Stk, m² nie addiert)",r.gruppen.map(g=>g.einheit));
r=S([M(1,"A",[z(1,"Teil","1","Stk.",{teil:true}),z(2,"Teil","1","Stk.",{teil:false})])]);
p(r.gruppen.length===2,"4b · Teil/Zubehör und Hauptposition gleicher Bezeichnung bleiben getrennt");
r=S([M(1,"A",[z(1,"Fläche",null,"m²"),z(2,"Fläche","","m²"),z(3,"Länge",undefined,"m")])]);
p(r.gruppen.length===0&&r.pruefen.length===3&&r.pruefen.every(x=>/nicht erfasst/.test(x.grund)),"5 · fehlende Menge wird nicht als 0 gezählt, sondern zu prüfen („nicht erfasst“)",r.pruefen.map(x=>x.grund));
r=S([M(1,"A",[z(1,"X","abc","m²"),z(2,"Y","560 × 170","Stk"),z(3,"Z","-3","m"),z(4,"Q","5",""),z(5,"R","5","kg"),z(6,"","5","m"),z(7,"G","7","Stk")])]);
const gr=r.pruefen.map(x=>x.grund).join("|");
p(r.pruefen.length===6&&r.gruppen.length===1&&r.gruppen[0].summe===7,"6 · ungültig/unvollständig: 6 Positionen zu prüfen und NICHT in Summen, die gültige zählt",gr);
p(/nicht berechenbar/.test(gr)&&/zwei Masse/.test(gr)&&/negative/.test(gr)&&/Einheit fehlt/.test(gr)&&/nicht summiert/.test(gr)&&/Bezeichnung fehlt/.test(gr),"6b · jeder Grund wird benannt",gr);
r=S([M(1,"A",[z(1,"Abwicklung","250","mm"),z(2,"Vorderteil","560 × 170","mm")])]);
p(r.masse===2&&r.gruppen.length===0&&r.pruefen.length===0,"6c · Masse in mm werden nicht summiert und nicht als Fehler gemeldet",r);
r=S([M(1,"A",[z(1,"Bleilappen","6","Stk.")],{title:"Nord"}),M(2,"B",[z(4,"Bleilappen","8","Stk")],{title:"Süd"})]);
const g0=r.gruppen[0];
p(r.gruppen.length===1&&g0.summe===14&&g0.quellen.length===2&&g0.quellen[0].id===1&&g0.quellen[1].id===2&&g0.quellen[0].pos===1&&g0.quellen[1].pos===4&&g0.dubletten.length===0,"7 · gleiche Bezeichnung aus zwei Massaufnahmen: summiert, Herkunft (Id, Position, Titel) bleibt, keine Dublette",g0);
r=S([M(1,"A",[z(1,"Bleilappen","6","Stk.")],{title:"Test"}),M(2,"B",[z(1,"Bleilappen","6","Stk.")],{title:" test "})]);
p(r.gruppen[0].summe===12&&r.gruppen[0].quellen.length===2&&r.gruppen[0].dubletten.length===1,"8 · gleicher Typ und Titel: als mögliche Dublette MARKIERT, nichts gelöscht, nichts stillschweigend zusammengeführt",r.gruppen[0]);
r=S([M(1,"A",[z(1,"B","1","Stk")],{title:"Test",type:"kehle"}),M(2,"B",[z(1,"B","1","Stk")],{title:"Test",type:"rinne_halbrund"})]);
p(r.gruppen[0].dubletten.length===0,"8b · gleicher Titel, andere Art: keine Dublette");
r=S([M(1,"A",[z(1,"B","1","Stk")]),M(2,"Fremd",[z(1,"B","99","Stk")],{project_id:8}),M(3,"Firma",[z(1,"B","50","Stk")],{company_id:"B"})]);
p(r.massaufnahmen.length===1&&r.gruppen[0].summe===1,"10 · fremdes Projekt und fremde Firma sind ausgeschlossen",r);
r=S([M(1,"Neu",[z(1,"B","1","Stk")],{workflow_status:"zu_ruesten"}),M(2,"X",[z(1,"B","1","Stk")],{workflow_status:"erfunden"}),M(3,"Ohne",[])]);
p(r.nachStatus.zu_ruesten===1&&r.nachStatus.unbekannt===1&&r.ohneAusmass===1,"11 · Status nur aus workflow_status; unbekannter Wert als „unbekannt“, Massaufnahme ohne Ausmasszeilen gezählt",r.nachStatus);
// ---- v3.347: was NICHT ins Komplettausmass gehört; Einfassungen nur als Komplettstückzahl je Art ----
const nicht=["Biegungen","Blechstösse","Stösse","davon Umschläge (180°)","Endzugabe erstes Stück","Endzugabe letztes Stück","Gehrungen","Haltebleche (GAVA Blech)","Segmente","Stücke (Zuschnitte)","Zuschnittstücke","Zuschnitte","Kehlblech, Stücke","Umschläge","Ecken","Scharen","Knicke im Verlauf"];
r=S([M(1,"A",nicht.map((b,i)=>z(i+1,b,"3","Stk.")).concat([z(90,"Blechfläche Zuschnitt","1,5","m²"),z(91,"Bleilappen","4","Stk.",{teil:true}),z(92,"Dachrinne halbrund 250 mm","12","m")]))]);
p(r.gruppen.map(g=>g.bezeichnung).sort().join("|")==="Blechfläche|Bleilappen|Dachrinne halbrund 250 mm"&&r.pruefen.length===0&&r.ausgeblendet===nicht.length,"ausgeblendet: Biegungen, Blechstösse, Umschläge, Endzugaben, Gehrungen, GAVA-Haltebleche, Segmente, Ecken, Scharen, Knicke, Stücke – und NUR diese (Fläche, Bleilappen, Rinne bleiben)",r.gruppen.map(g=>g.bezeichnung).concat([r.ausgeblendet]));
r=S([M(1,"A",[z(1,"Biegungen","abc","Stk."),z(2,"Gehrungen",null,"Stk.")])]);
p(r.pruefen.length===0&&r.ausgeblendet===2,"auch ungültige Mengen ausgeblendeter Zeilen tauchen nicht unter „Zu prüfen“ auf");
r=S([M(1,"A",[z(1,"Dachfenstereinfassung, Schiebeziegel","1","Stk.")],{type:"dachfenstereinfassung"}),M(2,"B",[z(1,"Dachfenstereinfassung, Muldenziegel","1","Stk."),z(1,"Bleilappen","6","Stk.",{teil:true})],{type:"dachfenstereinfassung"}),
 M(3,"C",[z(1,"Dachfenstereinfassung, Biberschwanz einfach","2","Stk.")],{type:"dachfenstereinfassung"}),M(4,"D",[z(1,"Kamineinfassung, Schiebeziegel","1","Stk."),z(1,"Kamineinfassung, Biberschwanz einfach","1","Stk.")],{type:"kamineinfassung"}),
 M(5,"E",[z(1,"Einfassungen rund","2","Stk"),z(1,"Einfassung 1 · Nord Nr.1","1","Stk"),z(1,"Einfassung 2 · Nord Nr.2","1","Stk")],{type:"einfassung_rund"})]);
const gg=Object.fromEntries(r.gruppen.map(g=>[g.bezeichnung,g.summe]));
p(gg["Dachfenstereinfassungen"]===4&&gg["Kamineinfassungen"]===2&&gg["Einfassungen rund"]===2&&gg["Bleilappen"]===6&&!Object.keys(gg).some(k=>/Schiebeziegel|Muldenziegel|Biberschwanz|^Einfassung \d/.test(k)),"Einfassungen: nur als Komplettstückzahl je Einfassungsart (Dachfenster 4, Kamin 2, rund 2); Deckart und Einzel-Einfassungen entfallen",gg);
p(r.gruppen.find(g=>g.bezeichnung==="Dachfenstereinfassungen").quellen.length===3,"Einfassungen: jede Quelle bleibt in der Gruppe erhalten (3 Massaufnahmen)");
p(sbx.Z("3'080").wert===3080&&sbx.Z("1.234,5").wert===1234.5&&sbx.Z("0,93").wert===0.93&&!sbx.Z("").ok&&sbx.E("Stk.")==="Stk"&&sbx.E("M2")==="m²"&&sbx.E("lfm")==="lfm","Zahlen/Einheiten: Schweizer Schreibweisen, lfm bleibt eigene Einheit (nicht blind m)");

console.log("\nB · Ansicht im Cockpit");
await page.evaluate(()=>{
 currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"A"};meineRechte={admin:true};
 allProjects=[{id:7,name:"P7",archived:false},{id:8,name:"P8",archived:false}];
 $("appRoot").hidden=false;$("authScreen").hidden=true;
 cockpitProjectId=7;
});
const uiMas=(id,titel,zeilen,x)=>({id,project_id:7,company_id:"A",type:"kehle",title:titel,workflow_status:"in_bearbeitung",data:{ausmass:zeilen,material:"2",rollen:null},...(x||{})});
const U=await page.evaluate(()=>({}));
const ui=async(liste,vorher)=>page.evaluate(async([l,v])=>{
 if(v)v();
 projectMeasurementsCache=l;kaGeladen();
 return {t:$("cockpitKomplettBody").textContent.replace(/\s+/g," "),n:$("cockpitKomplettCount").textContent,
  open:[...document.querySelectorAll("#cockpitKomplettBody [data-ka-open]")].map(b=>b.dataset.kaOpen)};
},[liste,null]);
let u=await ui([]);
p(/Noch keine Massaufnahme in diesem Projekt/.test(u.t)&&u.n==="0","1 · Ansicht ohne Massaufnahmen: verständlicher Leerzustand",u.t);
u=await page.evaluate(()=>{kaProjekt=null;kaStand=null;projectMeasurementsCache=null;renderKomplettausmass();return $("cockpitKomplettBody").textContent});
p(/Lädt/.test(u),"Ladezustand ohne Daten: „Lädt…“ statt leerer Übersicht",u);
u=await page.evaluate(()=>{kaFehler=true;kaStand=null;renderKomplettausmass();return $("cockpitKomplettBody").textContent});
p(/nicht geladen werden/.test(u),"Ladefehler ohne Daten: Fehler wird erklärt",u);
const L1=[uiMas(1,"Süd",[z(1,"Blechfläche Zuschnitt","1,34","m²"),z(2,"Bleilappen","8","Stk."),z(3,"Abwicklung","250","mm"),z(4,"Fläche",null,"m²")],{workflow_status:"zu_ruesten"}),
 uiMas(2,"Nord",[z(1,"Blechfläche Zuschnitt","0,92","m²"),z(2,"Bleilappen","6","Stk.")],{workflow_status:"zu_montieren"}),
 uiMas(3,"Alt",[z(1,"Blechfläche Zuschnitt","1","m²")],{workflow_status:"abgeschlossen",archived:true})];
u=await ui(L1);
p(u.n==="3"&&/Blechfläche\s*3[.,]26 m²/.test(u.t)&&/Bleilappen[^:]*\(Teil\)|Bleilappen/.test(u.t)&&/14 Stk/.test(u.t),"2/3 · Summen je Bezeichnung und Einheit (3.26 m², 14 Stk)",u.t.slice(0,400));
p(/1 zu prüfen|<b/.test(u.t)||/zu prüfen/.test(u.t),"6 · „zu prüfen“ sichtbar");
p(/Fläche – Menge nicht erfasst/.test(u.t)&&!/Fläche: 0/.test(u.t),"5 · fehlende Menge als „nicht erfasst“, nicht als 0",u.t);
p(/Masszeile in mm/.test(u.t),"Masszeilen werden erklärt, nicht summiert");
p(u.open.includes("1")&&!/Massaufnahmen in dieser Übersicht/.test(u.t),"7 · „Zu prüfen“ führt in die Massaufnahme; die Liste der einzelnen Massaufnahmen ist entfernt (v3.345)",u.open);
p(/1 × Zu rüsten/.test(u.t)&&/1 × Zu montieren/.test(u.t),"11 · Workflowstatus der Massaufnahmen als Anzahl je Status (nur aus workflow_status)",u.t.slice(0,300));
p(/Status je Massaufnahme, nicht je Position/.test(u.t),"Grenze des Status wird gesagt");
p(!/%/.test(u.t),"kein Prozentwert „Projekt fertig“");
p(/keine<\/b> Offertmenge|keine Offertmenge/.test(u.t),"12 · Abgrenzung: keine Offertmenge, kein bestätigtes/verrechnetes Ausmass",u.t.slice(0,250));
const klick=await page.evaluate(()=>{
 let ruf=null;const alt=window.openMeasurement;window.openMeasurement=m=>{ruf=m.id};
 document.querySelector("#cockpitKomplettBody [data-ka-open='1']").click();
 window.openMeasurement=alt;
 return {ruf,rueck:measEditReturnTo};
});
p(klick.ruf===1&&klick.rueck==="projectCockpit","Antippen öffnet die Massaufnahme über den bestehenden Weg (mit Rückkehr ins Cockpit)",klick);
const fl=await page.evaluate(()=>{
 document.querySelector("#cockpitKomplettBody [data-ka-filter='zu_ruesten']").click();
 const t=$("cockpitKomplettBody").textContent.replace(/\s+/g," ");
 return {t,n:$("cockpitKomplettCount").textContent};
});
p(/Blechfläche\s*1[.,]34 m²/.test(fl.t)&&fl.n==="3","Statusfilter: nur zu rüsten (1.34 m²), Gesamtzahl bleibt 3",fl.t.slice(0,200));
// Aktualisierung
u=await page.evaluate(()=>{
 kaFilter="alle";
 const l=projectMeasurementsCache.slice();
 l[0]=Object.assign({},l[0],{data:Object.assign({},l[0].data,{ausmass:[{pos:1,bezeichnung:"Blechfläche Zuschnitt",menge:"2,00",einheit:"m²",teil:false}]})});
 projectMeasurementsCache=l;kaGeladen();
 const a=$("cockpitKomplettBody").textContent.replace(/\s+/g," ");
 projectMeasurementsCache=l.filter(m=>m.id!==2);kaGeladen();
 const b=$("cockpitKomplettBody").textContent.replace(/\s+/g," ");
 return {a:a.slice(a.indexOf("Mengen")>=0?0:0),b};
});
p(/Blechfläche\s*3[.,]92 m²/.test(u.a)&&/Blechfläche\s*3 m²/.test(u.b),"9 · Änderung und Entfernung einer Massaufnahme aktualisieren die Übersicht",{a:u.a.slice(0,160),b:u.b.slice(0,160)});
// Aktualitaet
u=await page.evaluate(()=>{kaFehler=false;kaStand=new Date();renderKomplettausmass();const a=$("cockpitKomplettBody").textContent;kaLadeFehler();return {a,b:$("cockpitKomplettBody").textContent}});
p(/Stand: \d\d:\d\d Uhr/.test(u.a)&&/Nicht frisch geladen – letzter Stand \d\d:\d\d/.test(u.b),"Aktualitätsstand wird gezeigt; bei Ladefehler „Nicht frisch geladen“",u);
// Zuschnitt abgehakt != Montage
u=await page.evaluate(()=>{
 const l=[{id:21,project_id:7,company_id:"A",type:"kehle",title:"Z",workflow_status:"zu_ruesten",data:{ausmass:[{pos:1,bezeichnung:"B",menge:"1",einheit:"Stk",teil:false}],rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:500}]}],abwicklung:250}}}];
 zeCache.clear();zeGeladen.clear();zeCache.set(21,new Map([[1,{erledigt:true,laenge_mm:500,breite_mm:250}]]));zeGeladen.add(21);
 projectMeasurementsCache=l;kaFilter="alle";kaGeladen();
 return $("cockpitKomplettBody").textContent.replace(/\s+/g," ");
});
p(/1 × Zu rüsten/.test(u)&&!/Montiert|Gerüstet|montiert/.test(u),"11 · abgehaktes Zuschnittstück ändert den Status nicht (bleibt „Zu rüsten“)",u.slice(0,400));
// ---- v3.342: die sichtbare Ansicht (Ansicht2, Projektseite) ----
const a2=await page.evaluate(async()=>{
 const out={};
 cockpitProjectId=7;
 projectMeasurementsCache=[{id:1,project_id:7,company_id:"A",type:"kehle",title:"Süd",workflow_status:"zu_ruesten",data:{ausmass:[{pos:1,bezeichnung:"Blechfläche Zuschnitt",menge:"1,34",einheit:"m²",teil:false},{pos:2,bezeichnung:"Fläche",menge:null,einheit:"m²",teil:false}]}}];
 kaGeladen();
 const h=a2RegAusmass({id:7});
 const d=document.createElement("div");d.innerHTML=h;
 out.ausmass={kopf:/Komplettausmass \(Übersicht\)/.test(h),summe:/Blechfläche\s*1[.,]34 m²/.test(d.textContent.replace(/\s+/g," ")),
  pruefen:/Zu prüfen/.test(d.textContent),oeffnen:d.querySelectorAll("[data-a2-meas='1']").length,neu:/Neues Ausmass/.test(h)};
 projectAngeboteCache=[{id:1,title:"A",positions:[{pos:"1",description:"R",quantity:12,unit:"m",abwicklung_mm:500}]}];
 const z=a2MengenZeilen();
 out.zeilen={offerte:/Offertmengen:<\/b> [^<]*6[.,]00 m²/.test(z)&&/nur aus der Offerte/.test(z),kompl:/Komplettausmass \(Übersicht\):<\/b> [^<]*1 Massaufnahme[^<]*1 Mengenposition[^<]*1 zu prüfen/.test(z),
  knopf:/data-a2-station="ausmass"/.test(z),getrennt:z.indexOf("Offertmengen")<z.indexOf("Komplettausmass")};
 projectAngeboteCache=[];
 out.ohneOffertZeile=!/Offertmengen/.test(a2MengenZeilen());
 projectAngeboteCache=[];
 out.uebersicht=/Komplettausmass \(Übersicht\)/.test(a2RegUebersicht({id:7,name:"P7",object:"M",archived:false}));
 projectMeasStand=new Map([[7,{gesamt:3,offen:2,zuRuesten:1}]]);
 out.zeile=a2ProjektZeileHtml({id:7,name:"P7",object:"Musterstrasse 1",order_no:"1",archived:false});
 projectMeasStand=null;
 out.zeileLeer=a2ProjektZeileHtml({id:7,name:"P7",object:"Musterstrasse 1",order_no:"1",archived:false});
 return out;
});
p(a2.ausmass.kopf&&a2.ausmass.summe&&a2.ausmass.pruefen&&a2.ausmass.oeffnen>=1&&a2.ausmass.neu,"Projektseite (Register Ausmass): Komplettausmass zuoberst, Summe, Zu prüfen, Öffnen über den Ansicht-Weg (data-a2-meas); „Neues Ausmass“ bleibt",a2.ausmass);
p(a2.zeilen.offerte&&a2.uebersicht,"Projektübersicht: Offertmengen-Zeile UND das Komplettausmass steht offen auf der Übersicht (nicht nur im Register Ausmass)",a2);
p(a2.ohneOffertZeile,"ohne Offerte keine Offertmengen-Zeile");
p(/a2-pz-stand/.test(a2.zeile)&&/3 Massaufnahmen · 2 offen/.test(a2.zeile)&&!/a2-pz-stand/.test(a2.zeileLeer),"Projektliste der Ansicht: Stand-Zeile, vor dem Laden nichts",a2.zeile.slice(0,200));
// ---- v3.345: Bleilappen fest oben, einzelne Massaufnahmen entfernt ----
const bl=await page.evaluate(()=>{
 const mk2=(id,n,t)=>({id,project_id:7,company_id:"A",type:"kehle",title:"X"+id,workflow_status:"zu_ruesten",data:{ausmass:[{pos:1,bezeichnung:"Bleilappen",menge:String(n),einheit:"Stk.",teil:true}]}});
 projectMeasurementsCache=[mk2(1,6),mk2(2,8)];kaFilter="alle";kaGeladen();
 const d=document.createElement("div");d.innerHTML=kaBauen("card").html;
 const out={zeile:(d.querySelector(".ka-bleilappen")||{}).textContent||"",details:d.querySelectorAll("details.ka-kachel").length,zu:[...d.querySelectorAll("details.ka-kachel")].map(x=>x.hasAttribute("open")?"open":"zu").join(),liste:/Massaufnahmen in dieser Übersicht/.test(d.textContent),
  gruppe:/Bleilappen.*14 Stk/.test(d.textContent.replace(/\s+/g," "))};
 projectMeasurementsCache=[{id:3,project_id:7,company_id:"A",type:"kehle",title:"Y",workflow_status:"zu_ruesten",data:{ausmass:[{pos:1,bezeichnung:"Blechfläche Zuschnitt",menge:"1",einheit:"m²",teil:false}]}}];
 kaGeladen();
 out.ohne=!document.querySelector(".ka-bleilappen")&&!/Bleilappen/.test($("cockpitKomplettBody").textContent);
 projectMeasurementsCache=[mk2(1,6),{...mk2(2,8),project_id:9}];kaGeladen();
 out.fremd=((document.querySelector(".ka-bleilappen")||{}).textContent||"").indexOf("6 Stk")>=0&&((document.querySelector(".ka-bleilappen")||{}).textContent||"").indexOf("14")<0;
 return out;
});
p(/Bleilappen: 14 Stk/.test(bl.zeile)&&/Summe aller Massaufnahmen/.test(bl.zeile),"Bleilappen: feste Zeile oben mit der Summe aller Massaufnahmen (6 + 8 = 14 Stk)",bl.zeile);
p(bl.gruppe,"Bleilappen bleibt zusätzlich als Mengenposition (Stück) in den Summen");
p(bl.details>=1&&!bl.liste&&!/open/.test(bl.zu),"Kacheln sind zugeklappt (antippen = woher); keine Liste „Massaufnahmen in dieser Übersicht“",bl);
p(bl.ohne,"ohne Bleilappen: keine Zeile, kein 0-Wert");
p(bl.fremd,"Bleilappen einer Massaufnahme eines anderen Projekts zählen nicht (nur 6 Stk)",bl);
const ui2=await page.evaluate(()=>{
 const mk=(id,zeilen)=>({id,project_id:7,company_id:"A",type:"kehle",title:"K"+id,workflow_status:"zu_ruesten",data:{ausmass:zeilen}});
 projectMeasurementsCache=[mk(1,[{pos:1,bezeichnung:"Biegungen",menge:"3",einheit:"Stk.",teil:false},{pos:2,bezeichnung:"Dachfenstereinfassung, Schiebeziegel",menge:"1",einheit:"Stk.",teil:false},{pos:3,bezeichnung:"Bleilappen",menge:"6",einheit:"Stk.",teil:true},{pos:4,bezeichnung:"Blechfläche Zuschnitt",menge:"1,2",einheit:"m²",teil:false}])];
 kaFilter="alle";kaGeladen();
 const d=document.createElement("div");d.innerHTML=kaBauen("card").html;
 const kach=[...d.querySelectorAll(".ka-kachel")].map(k=>k.textContent.replace(/\s+/g," ").trim());
 const uebers=a2RegUebersicht({id:7,name:"P7",object:"M",archived:false});
 return {kach,txt:d.textContent.replace(/\s+/g," "),pos:uebers.indexOf("Komplettausmass (Übersicht)"),ablauf:uebers.indexOf("<h2>Ablauf</h2>"),dash:uebers.indexOf("a2-dash")};
});
p(ui2.kach.length===3&&ui2.kach.some(k=>/Dachfenstereinfassungen\s*1\s*Stk/.test(k))&&!ui2.kach.some(k=>/Biegungen/.test(k)),"Anzeige: jede Menge als Kachel (Name + Summe), Biegungen fehlen, Einfassung als Art",ui2.kach);
p(/1 Zeile \(Biegungen, Blechstösse/.test(ui2.txt)&&/gehören nicht ins Komplettausmass/.test(ui2.txt),"die Anzeige sagt, dass ausgeblendete Zeilen nicht ins Komplettausmass gehören (stehen in der Massaufnahme)",ui2.txt.slice(-300));
p(ui2.pos>ui2.dash&&ui2.pos<ui2.ablauf&&ui2.ablauf>0,"Platzierung: das Komplettausmass steht offen auf der Projektübersicht, direkt unter Projekt-/Mengenübersicht und vor dem Ablauf",ui2);
// ---- v3.349: Positionen antippen -> woher; Blechfläche = Blechfläche Zuschnitt ----
r=S([M(1,"Einlauf",[z(1,"Blechfläche","2,0","m²")],{type:"einlaufblech_gerade"}),M(2,"Dach",[z(1,"Blechfläche Zuschnitt","1,5","m²")],{type:"dachfenstereinfassung"}),M(3,"Materialfläche",[z(1,"Materialfläche verlegt","9","m²")],{type:"anschlussblech"})]);
const bf=r.gruppen.filter(g=>g.bezeichnung==="Blechfläche");
p(bf.length===1&&bf[0].summe===3.5&&bf[0].quellen.length===2&&r.gruppen.length===2,"„Blechfläche“ und „Blechfläche Zuschnitt“ sind dieselbe Grösse (netto Länge × Abwicklung): EINE Position (3,5 m²); „Materialfläche verlegt“ bleibt eine andere",r.gruppen.map(g=>g.bezeichnung+":"+g.summe));
p(bf[0].quellen.map(q=>q.original).sort().join("|")==="Blechfläche|Blechfläche Zuschnitt","die Herkunft behält den Originaltext der Zeile (Blechfläche bzw. Blechfläche Zuschnitt)");
const kl=await page.evaluate(async()=>{
 const mk=(id,t,zeilen,type)=>({id,project_id:7,company_id:"A",type:type||"kehle",title:t,workflow_status:"zu_ruesten",data:{ausmass:zeilen}});
 projectMeasurementsCache=[mk(11,"Nord",[{pos:3,bezeichnung:"Dachfenstereinfassung, Schiebeziegel",menge:"1",einheit:"Stk.",teil:false,herkunft:"Deckmaterial aus den Grunddaten"}],"dachfenstereinfassung"),
  mk(12,"Süd",[{pos:2,bezeichnung:"Dachfenstereinfassung, Muldenziegel",menge:"1",einheit:"Stk.",teil:false}],"dachfenstereinfassung")];
 kaFilter="alle";kaOffen=Object.create(null);kaGeladen();
 const box=$("cockpitKomplettBody");
 const d0=box.querySelector("details.ka-kachel");
 const out={zu:!d0.open,key:d0.getAttribute("data-ka-key")};
 d0.open=true;await new Promise(r=>setTimeout(r,60));
 renderKomplettausmass();
 const d1=box.querySelector("details.ka-kachel");
 out.bleibtOffen=d1.open;
 out.knoepfe=[...d1.querySelectorAll("[data-ka-open]")].map(b=>b.dataset.kaOpen).sort().join();
 out.text=d1.textContent.replace(/\s+/g," ");
 let ruf=null;const alt=window.openMeasurement;window.openMeasurement=m=>{ruf=m.id};
 d1.querySelector("[data-ka-open='12']").click();window.openMeasurement=alt;
 out.ruf=ruf;
 // Ansicht-Variante: eigener Öffnen-Weg
 out.a2=(()=>{const h=kaBauen("a2").html;return (h.match(/data-a2-meas="1[12]"/g)||[]).length})();
 return out;
});
p(kl.zu&&kl.bleibtOffen,"Kachel ist zu, klappt auf und bleibt nach dem Neuzeichnen offen",kl);
p(kl.knoepfe==="11,12"&&/Pos\. 3/.test(kl.text)&&/Pos\. 2/.test(kl.text)&&/Dachfenstereinfassung, Schiebeziegel/.test(kl.text)&&/Deckmaterial aus den Grunddaten/.test(kl.text),"aufgeklappt: jede Quelle mit Massaufnahme-Knopf, Position, Menge, Originaltext und Herkunftstext",kl.text);
p(kl.ruf===12,"Knopf öffnet genau diese Massaufnahme (bestehender Weg)",kl);
p(kl.a2>=2,"in der Projektansicht führen dieselben Knöpfe über den Ansicht-Weg (data-a2-meas)",kl);
// Offerte vs Komplettausmass
const ang=fs.readFileSync("js/63-angebote.js","utf8");
p(!/Komplettausmass/.test(ang)&&/Offertmengen/.test(ang),"12 · Offertmengen werden nirgends als Komplettausmass bezeichnet");
p(!/angebote|projectAngeboteCache|angMengen/.test(q85.slice(0,q85.indexOf("let kaAnsicht")).replace(/\/\/.*$/gm,"")),"12 · das Komplettausmass (Summen, Zu prüfen, Ansicht) liest keine Offertdaten – nur die getrennte Mengenübersicht darunter");
// Mobile
for(const w of [360,390,430,768]){
 await page.setViewportSize({width:w,height:900});
 const ov=await page.evaluate(()=>{
  projectMeasurementsCache=[{id:1,project_id:7,company_id:'A',type:'kehle',title:'Sehr langer Titel einer Massaufnahme mit vielen Zeichen',workflow_status:'zu_ruesten',data:{ausmass:[{pos:1,bezeichnung:'Dachrinne halbrund 250 mm Titanzink mit langer Bezeichnung',menge:'12,5',einheit:'m',teil:false,herkunft:'Aus der Rinnenlänge'}]}}];kaGeladen();
  const c=document.createElement("div");c.style.cssText="position:fixed;left:0;top:0;right:0;bottom:0;overflow:auto;background:#fff;z-index:99999;padding:0 16px;box-sizing:border-box";
  c.innerHTML=$("cockpitKomplettBody").innerHTML;document.body.appendChild(c);
  const r={sw:c.scrollWidth,iw:c.clientWidth,knoepfe:[...c.querySelectorAll("[data-ka-open]")].every(b=>b.getBoundingClientRect().width>0&&b.getBoundingClientRect().right<=c.clientWidth+1)};c.remove();return r;
 });
 p(ov.sw<=ov.iw&&ov.knoepfe,"14 · Ansicht bei "+w+" px: kein horizontales Scrollen, Öffnen-Knöpfe sichtbar",ov);
}
await page.setViewportSize({width:1100,height:1400});
// Schreiben
const wr=await page.evaluate(()=>window.__log);
p(wr.length===0,"13 · Anzeige, Aktualisieren, Filter und Öffnen schreiben nichts",wr);
const q09=fs.readFileSync("js/09-projekte.js","utf8");
p(!/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(|\bfetch\(|\bsb\./.test(q85),"13 · js/85 enthält keinen Datenbank- oder Netzwerkzugriff");
p(!/lieferanten|settings\.materials|from\("materials"\)|lager_varianten|material_reservierungen/.test(q85),"drei Materiallisten/Lager nicht berührt");
p(jsFehler.length===0,"keine JS-Fehler",jsFehler);
await br.close();
console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
process.exit(fail?1:0);
})();
